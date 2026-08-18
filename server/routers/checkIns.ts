import { z } from "zod";
import { getDb } from "../db";
import { continuityEvents } from "../../drizzle/schema";
import {
  createCheckIn,
  getDailyPlan,
  getCheckIns,
  getRecentCheckIns,
  getWeeklyCheckInPresence,
  getWeeklyThreadData,
  updateCheckIn,
  updateDailyPlan,
  upsertDailyPlan,
  getActiveProjects,
  getUserProfile,
  getLatestWeeklyCompass,
  getRecentDecisions,
  createProjectMemoryEvent,
  getRecentDailyPlans,
  getProjectById,
  getHealthScoreForProject,
  upsertHealthScore,
  getFocusSessionsByProject,
  getDecisionsByProject,
  getProjectMemoryEvents,
  upsertEvidenceSummary,
  getDistractionWeeklyAggregates,
  getDistractionEventsByUser,
  getStreak,
  getHeatmapData,
} from "../db";
import { computeStats, generateIdentitySentence } from "./evidence";
import { protectedProcedure, router } from "../_core/trpc";
import { checkLLMRateLimit } from "../_core/rateLimiter";
import { invokeLLM } from "../_core/llm";
import { resolveDate, addDay, getServerLocalDate } from "../utils/dateUtils";
import { getWrenToneBucket } from "../wrenTone";

// getTodayDate replaced by resolveDate from dateUtils

export const checkInsRouter = router({
  getToday: protectedProcedure
    .input(z.object({
      // Client passes its local YYYY-MM-DD so the server uses the user's actual calendar day,
      // not the UTC date (which can differ by up to ±14 hours from the user's local midnight).
      localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const date = resolveDate(input?.localDate);
      return getCheckIns(ctx.user.id, date);
    }),

  getRecent: protectedProcedure.query(async ({ ctx }) => {
    return getRecentCheckIns(ctx.user.id, 14);
  }),

  // Returns check-ins from the past 7 days — same window used by the Wren letter generator
  getWeek: protectedProcedure.query(async ({ ctx }) => {
    const all = await getRecentCheckIns(ctx.user.id, 50);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return all.filter(c => new Date(c.createdAt).getTime() >= weekAgo);
  }),

  submitMorning: protectedProcedure
    .input(z.object({
      capacityLevel: z.enum(["full", "partial", "low"]),
      primaryProjectId: z.number().optional(),
      secondaryProjectId: z.number().optional(),
      userNotes: z.string().max(2000).optional(),
      emotionalState: z.enum(["focused", "anxious", "foggy", "energized", "drained"]).optional(),
      mentalLoad: z.enum(["light", "moderate", "heavy"]).optional(),
      workLocation: z.enum(["home", "coffee_shop", "library", "office", "other"]).optional(),
      // Client passes its local YYYY-MM-DD to avoid UTC/local midnight mismatch
      localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkLLMRateLimit(ctx.user.id);
      const date = resolveDate(input.localDate);
      const [profile, activeProjects, weeklyCompass, recentDecisions, recentPlans, toneBucket] = await Promise.all([
        getUserProfile(ctx.user.id),
        getActiveProjects(ctx.user.id),
        getLatestWeeklyCompass(ctx.user.id),
        getRecentDecisions(ctx.user.id, 5),
        getRecentDailyPlans(ctx.user.id, 3),
        getWrenToneBucket(ctx.user.id),
      ]);

      const toneMap = {
        gentle: "warm and supportive, but never chirpy",
        direct: "calm and direct",
        firm: "concise and firm",
      };
      const tone = toneMap[toneBucket];

      // ── Weekly Compass context ─────────────────────────────────────────────
      let compassContext = "";
      let compassPrimaryId: number | undefined;
      let compassSecondaryId: number | undefined;
      if (weeklyCompass) {
        compassPrimaryId = weeklyCompass.primaryProjectId ?? undefined;
        compassSecondaryId = weeklyCompass.secondaryProjectId ?? undefined;
        const primaryProj = compassPrimaryId
          ? activeProjects.find((p) => p.id === compassPrimaryId)
          : null;
        const secondaryProj = compassSecondaryId
          ? activeProjects.find((p) => p.id === compassSecondaryId)
          : null;
        compassContext = `
Weekly Compass (this week's direction):
- Primary project this week: ${primaryProj ? `"${primaryProj.title}"` : "not set"}
- Secondary project this week: ${secondaryProj ? `"${secondaryProj.title}"` : "not set"}
- Maintenance lane: ${weeklyCompass.adminLane ?? "none"}
- Must move: ${weeklyCompass.mustMove ?? "none"}
- Can wait: ${weeklyCompass.canWait ?? "none"}
IMPORTANT: The weekly primary project MUST appear in today's tasks unless capacity is "low" and it's not feasible. The secondary project may appear as a support task. The maintenance lane should not exceed 1 task.`;
      }

      // ── Carryover context from previous days ──────────────────────────────
      let carryoverContext = "";
      let tomorrowTasksFromYesterday: Array<{ id: string; title: string; projectId?: number | null; energyLevel?: string; estimatedMinutes?: number; notes?: string }> = [];
      if (recentPlans.length > 0) {
        // Skip today's plan (it has no tomorrowTasks yet) — find the most recent prior-day plan.
        // recentPlans is ordered by date DESC, so recentPlans[0] may be today's plan if the user
        // already had a morning check-in today (which creates today's plan before this mutation runs).
        const yesterday = recentPlans.find((p) => p.date !== date) ?? recentPlans[0];
        if (yesterday) {
          const yesterdayTasks: any[] = (() => {
            try { return JSON.parse(yesterday.criticalTasks ?? "[]"); } catch { return []; }
          })();
          const unfinished = yesterdayTasks.filter((t) => !t.done);
          if (unfinished.length > 0) {
            carryoverContext = `\nCarryover from yesterday (unfinished): ${unfinished.map((t) => `"${t.title}" (carried ${(t.carryoverCount ?? 0) + 1}x)`).join(", ")}.`;
            // Bias: if a task has been carried 2+ times, suggest splitting or parking
            const repeatedCarryovers = unfinished.filter((t) => (t.carryoverCount ?? 0) >= 2);
            if (repeatedCarryovers.length > 0) {
              carryoverContext += ` Note: "${repeatedCarryovers.map((t) => t.title).join('", "')}" have been carried 2+ times — consider splitting, rewriting, or parking them.`;
            }
          }
          // ── Tomorrow's planned tasks (from last night's evening check-in) ────
          if (yesterday.tomorrowTasks) {
            try {
              const parsed = JSON.parse(yesterday.tomorrowTasks);
              if (Array.isArray(parsed) && parsed.length > 0) {
                tomorrowTasksFromYesterday = parsed;
                carryoverContext += `\nUser pre-planned these activities for today last night: ${parsed.map((t: any) => `"${t.title}"${t.energyLevel && t.energyLevel !== 'any' ? ` (${t.energyLevel} energy)` : ''}${t.estimatedMinutes ? ` ~${t.estimatedMinutes}min` : ''}`).join(", ")}. Incorporate these into today's tasks where capacity allows — they represent the user's own intentions for the day.`;
              }
            } catch { /* ignore malformed JSON */ }
          }
        }
      }

      // ── Recent decisions context ───────────────────────────────────────────
      const decisionsContext = recentDecisions.length > 0
        ? `\nRecent decisions affecting next steps: ${recentDecisions.slice(0, 3).map((d) => `"${d.content}"`).join("; ")}.`
        : "";

      // ── Capacity-specific task rules ──────────────────────────────────────
      const capacityRules = {
        full: "Up to 3 tasks. Include primary + secondary project. Focus blocks up to 90 min. Flex buffer: 30 min.",
        partial: "1-2 tasks maximum. Primary project only. Focus blocks 45-60 min. Include a rest permission statement. Flex buffer: 45 min.",
        low: "1 task only — the single most concrete, smallest-scope task available. Prefer tasks that can be completed in under 30 min. No secondary project. Include a rest permission statement. Flex buffer: 60 min.",
      };

      // ── Divergence detection ──────────────────────────────────────────────
      const userPrimaryId = input.primaryProjectId;
      const divergenceNote = compassPrimaryId && userPrimaryId && compassPrimaryId !== userPrimaryId
        ? `Note: The user selected a different primary project than the weekly compass primary. Acknowledge this briefly in the guidance (1 sentence) — don't judge, just note the shift.`
        : "";

      // ── When the user pre-planned tasks last night, use them verbatim — no AI task generation ──
      // The AI only writes guidance text and time blocks. Tasks come from the user's own words.
      // NOTE: hasPrePlannedTasks is used only for the prompt. The actual task list uses
      // hasPrePlannedTasksMerged (computed below after the LLM call) which includes post-close additions.
      const hasPrePlannedTasks = tomorrowTasksFromYesterday.length > 0;

      // Prompt varies: if pre-planned tasks exist, ask AI for guidance + time blocks only (no criticalTasks).
      // If no pre-planned tasks, AI generates the full plan as before.
      const planPromptBase = `You are a thoughtful productivity assistant for someone with ADHD. 
Tone: ${tone}. Never use exclamation points, gamification, or motivational poster language.
The user's capacity today is: ${input.capacityLevel}.
Capacity rules: ${capacityRules[input.capacityLevel]}
${compassContext}
Active projects: ${activeProjects.slice(0, 5).map(p => `"${p.title}" (next step: ${p.nextStep ?? "not set"})`).join(", ") || "none yet"}.
User notes: ${input.userNotes ?? "none"}.${carryoverContext}${decisionsContext}
${divergenceNote}`;

      const planPrompt = hasPrePlannedTasks
        ? `${planPromptBase}

The user already set their tasks for today last night. Do NOT generate or suggest any tasks.
Write a 2-3 sentence morning guidance message that hands back their own plan — start with "Here's what you set up last night." or similar warm invitation.
Also suggest time blocks based on their pre-planned tasks and capacity.

Return JSON: { guidance: string, divergenceNote: string|null, criticalTasks: [], timeBlocks: [{label: string, duration: string}] }`
        : `${planPromptBase}

Generate a morning guidance message (2-3 sentences) and suggest tasks based on capacity rules above.
For each task, include a carryoverCount field (0 for new tasks, or the count from carryover context if applicable).

Return JSON: { guidance: string, divergenceNote: string|null, criticalTasks: [{title: string, projectId: number|null, carryoverCount: number}], timeBlocks: [{label: string, duration: string}] }`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a calm, grounded productivity assistant. Return valid JSON only." },
          { role: "user", content: planPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "morning_plan",
            strict: true,
            schema: {
              type: "object",
              properties: {
                guidance: { type: "string" },
                divergenceNote: { type: ["string", "null"] },
                criticalTasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      projectId: { type: ["number", "null"] },
                      carryoverCount: { type: "number" },
                    },
                    required: ["title", "projectId", "carryoverCount"],
                    additionalProperties: false,
                  },
                },
                timeBlocks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      duration: { type: "string" },
                    },
                    required: ["label", "duration"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["guidance", "divergenceNote", "criticalTasks", "timeBlocks"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = (response.choices[0]?.message?.content as string) ?? "{}";
      const parsed = JSON.parse(raw);

      // ── Build the task list (ADDITIVE-ONLY — the running list is sacred) ────
      //
      // Priority order:
      //   1. Today's existing criticalTasks (already on screen — NEVER overwrite)
      //   2. Yesterday's tomorrowTasks (pre-planned last night) — merge in any new ones
      //   3. Yesterday's unfinished criticalTasks (post-close additions) — merge in any new ones
      //   4. AI suggestions — ONLY if the user has zero tasks at all (first-time morning)
      //      and even then they are tagged isAiSuggested=true so the user can dismiss them.
      //
      // De-dupe by title (case-insensitive) throughout.

      // Step 1: read today's existing plan (may already have tasks from a prior morning run or manual adds)
      const todayPlan = recentPlans.find((p) => p.date === date);
      const existingTodayTasks: any[] = (() => {
        try { return JSON.parse(todayPlan?.criticalTasks ?? "[]"); } catch { return []; }
      })();

      // Step 2 & 3: build the carry-in set from yesterday
      const yesterday = recentPlans.find((p) => p.date !== date) ?? recentPlans[0];
      let carryInTasks: Array<{ id?: string; title: string; projectId?: number | null; energyLevel?: string; estimatedMinutes?: number; notes?: string }> = [...tomorrowTasksFromYesterday];
      if (yesterday) {
        const yesterdayTasks: any[] = (() => {
          try { return JSON.parse(yesterday.criticalTasks ?? "[]"); } catch { return []; }
        })();
        // Carry ALL unfinished tasks — not just isUserAdded ones.
        // isUserAdded is a display hint only; filtering on it here caused tasks
        // restored via SQL (or AI-seeded tasks the user kept) to silently vanish.
        const unfinishedYesterday = yesterdayTasks.filter((t: any) => !t.done);
        const carryInTitles = new Set(carryInTasks.map((t) => t.title.trim().toLowerCase()));
        for (const t of unfinishedYesterday) {
          if (!carryInTitles.has(t.title.trim().toLowerCase())) {
            carryInTasks.push({ id: t.id, title: t.title, energyLevel: t.energyLevel, estimatedMinutes: t.estimatedMinutes, notes: t.notes });
            carryInTitles.add(t.title.trim().toLowerCase());
          }
        }
      }

      // Step 4: merge carry-in into existing today tasks (additive, no replacements)
      const existingTitles = new Set(existingTodayTasks.map((t: any) => t.title.trim().toLowerCase()));
      const newCarryIns = carryInTasks
        .filter((t) => !existingTitles.has(t.title.trim().toLowerCase()))
        .map((pt, i) => ({
          id: (pt as any).id ?? `task-${Date.now()}-carry-${i}`,
          title: pt.title,
          done: false,
          projectId: (pt as any).projectId ?? input.primaryProjectId ?? null,
          carryoverCount: 0,
          energyLevel: pt.energyLevel,
          estimatedMinutes: pt.estimatedMinutes,
          notes: pt.notes,
          isUserAdded: true,
        }));

      let tasksWithIds: any[];
      if (existingTodayTasks.length > 0 || newCarryIns.length > 0) {
        // User already has tasks today (or we're carrying in from yesterday) — preserve everything, append new carry-ins
        tasksWithIds = [...existingTodayTasks, ...newCarryIns];
      } else {
        // Truly empty slate (first morning check-in, no prior tasks anywhere) —
        // use AI suggestions but tag them so the user can dismiss them.
        // criticalTasks is still a permanent running list — these are just the seed.
        tasksWithIds = parsed.criticalTasks.map((t: any, i: number) => ({
          ...t,
          id: `task-${Date.now()}-${i}`,
          done: false,
          projectId: t.projectId ?? input.primaryProjectId ?? null,
          carryoverCount: t.carryoverCount ?? 0,
          isAiSuggested: true,
        }));
      }

      // Combine guidance with divergence note if present
      const fullGuidance = parsed.divergenceNote
        ? `${parsed.guidance} ${parsed.divergenceNote}`
        : parsed.guidance;

      // Determine secondary project: use compass secondary if user didn't specify one
      const secondaryProjectId = input.capacityLevel === "full"
        ? (input.secondaryProjectId ?? compassSecondaryId)
        : undefined;

      // Suggest clarity mode based on emotional state
      const clarityModeMap: Record<string, string> = {
        anxious: "overwhelm",
        foggy: "purpose_fog",
        drained: "overwhelm",
        focused: "",
        energized: "",
      };
      const clarityModeSuggestion = input.emotionalState ? (clarityModeMap[input.emotionalState] || "") : "";

      const planId = await upsertDailyPlan({
        userId: ctx.user.id,
        date,
        capacityLevel: input.capacityLevel,
        primaryProjectId: input.primaryProjectId ?? compassPrimaryId,
        secondaryProjectId,
        criticalTasks: JSON.stringify(tasksWithIds),
        timeBlocks: JSON.stringify(parsed.timeBlocks),
        generatedGuidance: fullGuidance,
        emotionalState: input.emotionalState,
        mentalLoad: input.mentalLoad,
        clarityModeSuggestion: clarityModeSuggestion || undefined,
      });

      const checkInId = await createCheckIn({
        userId: ctx.user.id,
        dailyPlanId: planId,
        date,
        type: "morning",
        userInput: JSON.stringify({ capacityLevel: input.capacityLevel, notes: input.userNotes, workLocation: input.workLocation }),
        generatedResponse: fullGuidance,
        completedAt: new Date(),
      });

      return { checkInId, planId, guidance: fullGuidance, criticalTasks: tasksWithIds, timeBlocks: parsed.timeBlocks, clarityModeSuggestion: clarityModeSuggestion || null };
    }),

  submitMidday: protectedProcedure
    .input(z.object({
      workedOn: z.string().max(2000),
      wasOnPlan: z.boolean(),
      interruptions: z.string().max(2000).optional(),
      nextMove: z.string().max(1000).optional(),
      energyLevel: z.enum(["high", "medium", "low"]).optional(),
      hungerLevel: z.enum(["full", "slightly_hungry", "hungry"]).optional(),
      localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkLLMRateLimit(ctx.user.id);
      const date = resolveDate(input.localDate);
      const [plan, toneBucket] = await Promise.all([
        getDailyPlan(ctx.user.id, date),
        getWrenToneBucket(ctx.user.id),
      ]);
      const toneMap = { gentle: "warm but honest", direct: "calm and direct", firm: "concise and firm" };
      const tone = toneMap[toneBucket];

      const planContext = plan ? `Today's plan had tasks: ${plan.criticalTasks}` : "No morning plan was set.";

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a calm productivity assistant. Tone: ${tone}. 
Never shame the user. Never use urgency language. Keep responses to 2-3 sentences.
Return JSON only.`,
          },
          {
            role: "user",
            content: `Midday check-in. ${planContext}
User worked on: "${input.workedOn}"
Was it on plan: ${input.wasOnPlan}
Interruptions: "${input.interruptions ?? "none"}"
Next move: "${input.nextMove ?? "not specified"}"

Determine alignment status (aligned/recovering/redirect) and write a 2-3 sentence response.
Return JSON: { alignmentStatus: "aligned"|"recovering"|"redirect", response: string, afternoonSuggestion: string }`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "midday_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                alignmentStatus: { type: "string" },
                response: { type: "string" },
                afternoonSuggestion: { type: "string" },
              },
              required: ["alignmentStatus", "response", "afternoonSuggestion"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = (response.choices[0]?.message?.content as string) ?? "{}";
      const parsed = JSON.parse(raw);

      const checkInId = await createCheckIn({
        userId: ctx.user.id,
        dailyPlanId: plan?.id,
        date,
        type: "midday",
        userInput: JSON.stringify(input),
        alignmentStatus: parsed.alignmentStatus as any,
        generatedResponse: parsed.response,
        interruptionsNoted: input.interruptions,
        completedAt: new Date(),
      });

      // Record project memory event if midday check-in mentions a specific project
      if (plan?.primaryProjectId) {
        await createProjectMemoryEvent({
          userId: ctx.user.id,
          projectId: plan.primaryProjectId,
          eventType: "check_in",
          content: `Midday check-in: worked on "${input.workedOn}". Status: ${parsed.alignmentStatus}.`,
          metadata: JSON.stringify({ checkInId, alignmentStatus: parsed.alignmentStatus }),
        });
      }

      return { checkInId, ...parsed };
    }),

  submitEvening: protectedProcedure
    .input(z.object({
      whatMoved: z.string().max(2000),
      whatRemains: z.string().max(2000),
      whatLearned: z.string().max(2000),
      tomorrowFirst: z.string().max(1000),
      localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkLLMRateLimit(ctx.user.id);
      const date = resolveDate(input.localDate);
      const [plan, toneBucket] = await Promise.all([
        getDailyPlan(ctx.user.id, date),
        getWrenToneBucket(ctx.user.id),
      ]);
      const toneMap = { gentle: "warm and grounded", direct: "calm and direct", firm: "concise and firm" };
      const tone = toneMap[toneBucket];

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a calm productivity assistant. Tone: ${tone}. 
Generate an evening closure summary and tomorrow brief. Never use motivational language or exclamation points.
Return JSON only.`,
          },
          {
            role: "user",
            content: `Evening closure.
What moved today: "${input.whatMoved}"
What remains: "${input.whatRemains}"
What was learned or decided: "${input.whatLearned}"
What goes first tomorrow: "${input.tomorrowFirst}"

Generate:
1. A 2-sentence progress summary
2. The tomorrow brief (2-3 sentences that will greet the user tomorrow morning)
3. 1-3 specific carryover tasks (verb-first, concrete)
4. Any patterns or insights worth noting
5. Any decisions detected in the "what was learned or decided" field (explicit choices, rulings, commitments)

Return JSON: { summary: string, tomorrowBrief: string, carryoverTasks: string[], insights: string, detectedDecisions: string[] }`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "evening_closure",
            strict: true,
            schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                tomorrowBrief: { type: "string" },
                carryoverTasks: { type: "array", items: { type: "string" } },
                insights: { type: "string" },
                detectedDecisions: { type: "array", items: { type: "string" } },
              },
              required: ["summary", "tomorrowBrief", "carryoverTasks", "insights", "detectedDecisions"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = (response.choices[0]?.message?.content as string) ?? "{}";
      const parsed = JSON.parse(raw);

      const checkInId = await createCheckIn({
        userId: ctx.user.id,
        dailyPlanId: plan?.id,
        date,
        type: "evening",
        userInput: JSON.stringify(input),
        generatedResponse: parsed.summary,
        extractedNextSteps: JSON.stringify(parsed.carryoverTasks),
        completedAt: new Date(),
      });

      // Store tomorrow brief in daily plan
      if (plan) {
        await updateDailyPlan(plan.id, ctx.user.id, {
          tomorrowBrief: parsed.tomorrowBrief,
          tomorrowBriefGeneratedAt: new Date(),
        });
      }

      // Record project memory event for primary project
      if (plan?.primaryProjectId) {
        await createProjectMemoryEvent({
          userId: ctx.user.id,
          projectId: plan.primaryProjectId,
          eventType: "check_in",
          content: `Evening closure: "${input.whatMoved}" moved. Remaining: "${input.whatRemains}".`,
          metadata: JSON.stringify({ checkInId, insights: parsed.insights }),
        });
      }

      // Auto-refresh health scores in background (fire-and-forget, non-blocking)
      const userId = ctx.user.id;
      void (async () => {
        try {
          const allProjects = await getActiveProjects(userId);
          const now = new Date();
          for (const p of allProjects) {
            const sessions = await getFocusSessionsByProject(userId, p.id, 10);
            const stalledDays = p.lastTouchedAt
              ? Math.floor((Date.now() - new Date(p.lastTouchedAt).getTime()) / 86400000)
              : 999;
            const completionRate = sessions.length > 0
              ? Math.min(100, sessions.filter(s => s.wasCompleted).length * 20)
              : 0;
            const recentSessionCount = sessions.filter(
              s => Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 86400000) <= 14
            ).length;
            let score = 70;
            if (stalledDays > 14) score -= 30;
            else if (stalledDays > 7) score -= 15;
            if (recentSessionCount === 0) score -= 10;
            if (completionRate > 60) score += 10;
            if (!p.nextStep) score -= 10;
            score = Math.max(0, Math.min(100, score));
            const momentum = stalledDays > 14 ? "stalled" : stalledDays > 7 ? "fading" : recentSessionCount > 2 ? "rising" : "steady";
            const riskLevel = stalledDays > 14 || !p.nextStep ? "high" : stalledDays > 7 ? "medium" : "low";
            await upsertHealthScore({
              userId,
              projectId: p.id,
              score,
              momentum,
              riskLevel,
              narrative: "Auto-refreshed after evening closure.",
              completionRate,
              stalledDays,
              lastActivityAt: stalledDays < 999 ? new Date(Date.now() - stalledDays * 86400000) : null,
              generatedAt: now,
            });
          }
        } catch {
          // Silently ignore — this is a background refresh, not critical
        }
      })();

      // Auto-generate Evidence Log summary for current month (fire-and-forget)
      const evidenceUserId = ctx.user.id;
      void (async () => {
        try {
          const month = getServerLocalDate().slice(0, 7);
          const stats = await computeStats(evidenceUserId, month);
          const summaryLine = stats.sessionsStarted > 0
            ? await generateIdentitySentence(month, stats, evidenceUserId)
            : null;
          await upsertEvidenceSummary({
            userId: evidenceUserId,
            month,
            ...stats,
            summaryLine,
          });
        } catch {
          // Silently ignore — evidence log is non-critical
        }
      })();

      return {
        checkInId,
        ...parsed,
        // Return detected decisions so the frontend can prompt the user to confirm them
        detectedDecisions: (parsed.detectedDecisions ?? []) as string[],
      };
    }),

  completeTask: protectedProcedure
    .input(z.object({
      taskId: z.string().max(100),
      taskTitle: z.string().max(300).optional(),
      date: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = resolveDate(input.date);
      const plan = await getDailyPlan(ctx.user.id, date);
      if (!plan) return { success: false };

      const tasks = JSON.parse(plan.criticalTasks ?? "[]");
      const task = tasks.find((t: any) => t.id === input.taskId);
      const updated = tasks.map((t: any) =>
        t.id === input.taskId ? { ...t, done: true } : t
      );
      await updateDailyPlan(plan.id, ctx.user.id, { criticalTasks: JSON.stringify(updated) });

      // Log to Evidence of Movement
      const label = input.taskTitle ?? task?.title ?? "Task";
      const db = await getDb();
      if (db) {
        await db.insert(continuityEvents).values({
          userId: ctx.user.id,
          eventType: "task_completed",
          label: `✓ ${label}`,
          metadata: JSON.stringify({ taskId: input.taskId, date }),
        });
      }

      const allDone = updated.every((t: any) => t.done);
      const completedCount = updated.filter((t: any) => t.done).length;
      return { success: true, allTasksDone: allDone, completedCount, totalCount: updated.length };
    }),

  addTask: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(300),
      localDate: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = resolveDate(input.localDate);

      // ── Routing: if the day is already closed, write to tomorrowTasks ────────
      // The morning rollover reads tomorrowTasks (+ unfinished criticalTasks) to
      // seed the next day. Writing post-close additions to criticalTasks means
      // they land in a bucket the next morning never reads.
      const todayCheckIns = await getCheckIns(ctx.user.id, date);
      // A day is only truly closed when the evening check-in row has completedAt set.
      // An evening row with completedAt = null is a draft/reset — treat as open.
      const dayIsClosed = todayCheckIns.some((c) => c.type === "evening" && c.completedAt != null);

      // Upsert plan so it always exists
      let plan = await getDailyPlan(ctx.user.id, date);
      if (!plan) {
        await upsertDailyPlan({ userId: ctx.user.id, date, criticalTasks: "[]" });
        plan = await getDailyPlan(ctx.user.id, date);
      }
      if (!plan) return { success: false };

      if (dayIsClosed) {
        // After evening close → append to tomorrowTasks so it crosses the date boundary
        const existing: Array<{ id: string; title: string }> =
          plan.tomorrowTasks ? JSON.parse(plan.tomorrowTasks) : [];
        const newTask = {
          id: `user-tmrw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: input.title.trim(),
        };
        const updated = [...existing, newTask];
        await updateDailyPlan(plan.id, ctx.user.id, { tomorrowTasks: JSON.stringify(updated) });
        return { success: true, task: { ...newTask, done: false, isUserAdded: true, routedTo: "tomorrow" as const } };
      }

      // During the day → append to criticalTasks as before
      const tasks = JSON.parse(plan.criticalTasks ?? "[]");
      const newTask = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: input.title.trim(),
        done: false,
        energyLevel: "medium" as const,
        estimatedMinutes: null,
        isUserAdded: true,
      };
      tasks.push(newTask);
      await updateDailyPlan(plan.id, ctx.user.id, { criticalTasks: JSON.stringify(tasks) });
      return { success: true, task: newTask };
    }),

  editTask: protectedProcedure
    .input(z.object({
      taskId: z.string().max(100),
      title: z.string().min(1).max(300),
      localDate: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = resolveDate(input.localDate);
      const plan = await getDailyPlan(ctx.user.id, date);
      if (!plan) return { success: false };

      const tasks = JSON.parse(plan.criticalTasks ?? "[]");
      const updated = tasks.map((t: any) =>
        t.id === input.taskId ? { ...t, title: input.title.trim() } : t
      );
      await updateDailyPlan(plan.id, ctx.user.id, { criticalTasks: JSON.stringify(updated) });
      return { success: true };
    }),

  removeTask: protectedProcedure
    .input(z.object({
      taskId: z.string().max(100),
      localDate: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = resolveDate(input.localDate);
      const plan = await getDailyPlan(ctx.user.id, date);
      if (!plan) return { success: false };

      const tasks = JSON.parse(plan.criticalTasks ?? "[]");
      const filtered = tasks.filter((t: any) => t.id !== input.taskId);
      await updateDailyPlan(plan.id, ctx.user.id, { criticalTasks: JSON.stringify(filtered) });
      return { success: true };
    }),

  pushTaskToTomorrow: protectedProcedure
    .input(z.object({
      taskId: z.string().max(100),
      localDate: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = resolveDate(input.localDate);
      const plan = await getDailyPlan(ctx.user.id, date);
      if (!plan) return { success: false };

      const tasks = JSON.parse(plan.criticalTasks ?? "[]");
      const task = tasks.find((t: any) => t.id === input.taskId);
      if (!task) return { success: false };

      // Remove from today
      const todayFiltered = tasks.filter((t: any) => t.id !== input.taskId);
      await updateDailyPlan(plan.id, ctx.user.id, { criticalTasks: JSON.stringify(todayFiltered) });

      // Compute tomorrow's date
      
      
      const tomorrowStr = addDay(date, 1);

      // Upsert tomorrow's plan and append task
      let tomorrowPlan = await getDailyPlan(ctx.user.id, tomorrowStr);
      if (!tomorrowPlan) {
        await upsertDailyPlan({ userId: ctx.user.id, date: tomorrowStr, criticalTasks: "[]" });
        tomorrowPlan = await getDailyPlan(ctx.user.id, tomorrowStr);
      }
      if (tomorrowPlan) {
        const tomorrowTasks = JSON.parse(tomorrowPlan.criticalTasks ?? "[]");
        tomorrowTasks.push({ ...task, done: false, carryoverCount: (task.carryoverCount ?? 0) + 1 });
        await updateDailyPlan(tomorrowPlan.id, ctx.user.id, { criticalTasks: JSON.stringify(tomorrowTasks) });
      }

      return { success: true };
    }),

  uncompleteTask: protectedProcedure
    .input(z.object({
      taskId: z.string().max(100),
      date: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = resolveDate(input.date);
      const plan = await getDailyPlan(ctx.user.id, date);
      if (!plan) return { success: false };

      const tasks = JSON.parse(plan.criticalTasks ?? "[]");
      const updated = tasks.map((t: any) =>
        t.id === input.taskId ? { ...t, done: false } : t
      );
      await updateDailyPlan(plan.id, ctx.user.id, { criticalTasks: JSON.stringify(updated) });
      return { success: true };
    }),

  weeklyPresence: protectedProcedure.query(async ({ ctx }) => {
    return getWeeklyCheckInPresence(ctx.user.id);
  }),
  weeklyThreadData: protectedProcedure.query(async ({ ctx }) => {
    const daysBack = ctx.user.isPro ? 30 : 7;
    return getWeeklyThreadData(ctx.user.id, daysBack);
  }),

  /**
   * Returns distraction insights for the past 7 days:
   * top category, time-of-day breakdown, full category breakdown, and an insight sentence.
   */
  getWeeklyDistractionInsights: protectedProcedure.query(async ({ ctx }) => {
    const aggregates = await getDistractionWeeklyAggregates(ctx.user.id);
    if (aggregates.totalEvents === 0) {
      return {
        hasData: false as const,
        topCategory: null,
        topCategoryLabel: null,
        topCategoryCount: 0,
        totalEvents: 0,
        timeOfDayCounts: { morning: 0, afternoon: 0, evening: 0 },
        topTimeOfDay: null,
        categoryBreakdown: [] as Array<{ category: string; label: string; count: number; pct: number }>,
        insightSentence: null,
      };
    }

    // Fetch raw events for the last 7 days to build the full breakdown
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const allEvents = await getDistractionEventsByUser(ctx.user.id, 200);
    const weekEvents = allEvents.filter(e => new Date(e.date) >= sevenDaysAgo);

    const catCount: Record<string, number> = {};
    const todCount: Record<string, number> = { morning: 0, afternoon: 0, evening: 0 };
    for (const e of weekEvents) {
      catCount[e.category] = (catCount[e.category] ?? 0) + 1;
      if (e.timeOfDay in todCount) todCount[e.timeOfDay]++;
    }

    const categoryLabels: Record<string, string> = {
      social_media: "Social media",
      research_rabbit_hole: "Research rabbit hole",
      unplanned_task: "Unplanned task",
      communication: "Communication",
      context_switch: "Context switching",
      unknown: "Other",
    };

    const categoryBreakdown = Object.entries(catCount)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({
        category: cat,
        label: categoryLabels[cat] ?? cat,
        count,
        pct: Math.round((count / weekEvents.length) * 100),
      }));

    const topCat = categoryBreakdown[0];
    const topTod = Object.entries(todCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const todLabels: Record<string, string> = {
      morning: "mornings",
      afternoon: "afternoons",
      evening: "evenings",
    };

    const insightSentence = topCat
      ? `This week, ${topCat.label.toLowerCase()} accounted for ${topCat.pct}% of your distractions${
          topTod ? `, most often in the ${todLabels[topTod] ?? topTod}` : ""
        }.`
      : null;

    return {
      hasData: true as const,
      topCategory: topCat?.category ?? null,
      topCategoryLabel: topCat?.label ?? null,
      topCategoryCount: topCat?.count ?? 0,
      totalEvents: weekEvents.length,
      timeOfDayCounts: {
        morning: todCount.morning ?? 0,
        afternoon: todCount.afternoon ?? 0,
        evening: todCount.evening ?? 0,
      },
      topTimeOfDay: topTod,
      categoryBreakdown,
      insightSentence,
    };
  }),

  getStreak: protectedProcedure.query(async ({ ctx }) => {
    return getStreak(ctx.user.id);
  }),
  getHeatmapData: protectedProcedure.query(async ({ ctx }) => {
    return getHeatmapData(ctx.user.id);
  }),

  /**
   * Returns the user's most recent evening check-in with full raw content.
   * Used by the Evening Close review screen so users can read back what they wrote.
   */
  getLastEveningClose: protectedProcedure.query(async ({ ctx }) => {
    const recent = await getRecentCheckIns(ctx.user.id, 30);
    const lastEvening = recent.find((c) => c.type === "evening");
    if (!lastEvening) return null;
    let userInput: { whatMoved?: string; whatRemains?: string; whatLearned?: string; tomorrowFirst?: string } = {};
    try { userInput = JSON.parse(lastEvening.userInput ?? "{}"); } catch { /* ignore */ }
    let carryoverTasks: string[] = [];
    try { carryoverTasks = JSON.parse(lastEvening.extractedNextSteps ?? "[]"); } catch { /* ignore */ }
    // Also fetch tomorrowTasks from the daily plan for that date — these are the user's own planned activities
    const plan = await getDailyPlan(ctx.user.id, lastEvening.date);
    let tomorrowActivities: Array<{ id: string; title: string }> = [];
    if (plan?.tomorrowTasks) {
      try {
        const parsed = JSON.parse(plan.tomorrowTasks);
        if (Array.isArray(parsed)) tomorrowActivities = parsed;
      } catch { /* ignore */ }
    }
    return {
      id: lastEvening.id,
      date: lastEvening.date,
      completedAt: lastEvening.completedAt,
      whatMoved: userInput.whatMoved ?? "",
      whatRemains: userInput.whatRemains ?? "",
      whatLearned: userInput.whatLearned ?? "",
      tomorrowFirst: userInput.tomorrowFirst ?? "",
      wrenSummary: lastEvening.generatedResponse ?? "",
      carryoverTasks,
      tomorrowActivities,
    };
  }),
});
