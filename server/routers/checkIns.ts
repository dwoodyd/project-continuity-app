import { z } from "zod";
import {
  createCheckIn,
  getDailyPlan,
  getCheckIns,
  getRecentCheckIns,
  getWeeklyCheckInPresence,
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
} from "../db";
import { computeStats, generateIdentitySentence } from "./evidence";
import { protectedProcedure, router } from "../_core/trpc";
import { checkLLMRateLimit } from "../_core/rateLimiter";
import { invokeLLM } from "../_core/llm";

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]!;
}

export const checkInsRouter = router({
  getToday: protectedProcedure.query(async ({ ctx }) => {
    const date = getTodayDate();
    return getCheckIns(ctx.user.id, date);
  }),

  getRecent: protectedProcedure.query(async ({ ctx }) => {
    return getRecentCheckIns(ctx.user.id, 14);
  }),

  submitMorning: protectedProcedure
    .input(z.object({
      capacityLevel: z.enum(["full", "partial", "low"]),
      primaryProjectId: z.number().optional(),
      secondaryProjectId: z.number().optional(),
      userNotes: z.string().max(2000).optional(),
      emotionalState: z.enum(["focused", "anxious", "foggy", "energized", "drained"]).optional(),
      mentalLoad: z.enum(["light", "moderate", "heavy"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      checkLLMRateLimit(ctx.user.id);
      const date = getTodayDate();
      const [profile, activeProjects, weeklyCompass, recentDecisions, recentPlans] = await Promise.all([
        getUserProfile(ctx.user.id),
        getActiveProjects(ctx.user.id),
        getLatestWeeklyCompass(ctx.user.id),
        getRecentDecisions(ctx.user.id, 5),
        getRecentDailyPlans(ctx.user.id, 3),
      ]);

      const toneMap = {
        gentle: "warm and supportive, but never chirpy",
        direct: "calm and direct",
        firm: "concise and firm",
      };
      const tone = toneMap[profile?.tonePreference ?? "direct"];

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
      if (recentPlans.length > 0) {
        const yesterday = recentPlans[0];
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

      const planPrompt = `You are a thoughtful productivity assistant for someone with ADHD. 
Tone: ${tone}. Never use exclamation points, gamification, or motivational poster language.
The user's capacity today is: ${input.capacityLevel}.
Capacity rules: ${capacityRules[input.capacityLevel]}
${compassContext}
Active projects: ${activeProjects.slice(0, 5).map(p => `"${p.title}" (next step: ${p.nextStep ?? "not set"})`).join(", ") || "none yet"}.
User notes: ${input.userNotes ?? "none"}.${carryoverContext}${decisionsContext}
${divergenceNote}

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

      // Assign project IDs from input if provided; preserve carryoverCount
      const tasksWithIds = parsed.criticalTasks.map((t: any, i: number) => ({
        ...t,
        id: `task-${Date.now()}-${i}`,
        done: false,
        projectId: t.projectId ?? input.primaryProjectId ?? null,
        carryoverCount: t.carryoverCount ?? 0,
      }));

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
        userInput: JSON.stringify({ capacityLevel: input.capacityLevel, notes: input.userNotes }),
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
    }))
    .mutation(async ({ ctx, input }) => {
      checkLLMRateLimit(ctx.user.id);
      const date = getTodayDate();
      const plan = await getDailyPlan(ctx.user.id, date);
      const profile = await getUserProfile(ctx.user.id);
      const toneMap = { gentle: "warm but honest", direct: "calm and direct", firm: "concise and firm" };
      const tone = toneMap[profile?.tonePreference ?? "direct"];

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
    }))
    .mutation(async ({ ctx, input }) => {
      checkLLMRateLimit(ctx.user.id);
      const date = getTodayDate();
      const plan = await getDailyPlan(ctx.user.id, date);
      const profile = await getUserProfile(ctx.user.id);
      const toneMap = { gentle: "warm and grounded", direct: "calm and direct", firm: "concise and firm" };
      const tone = toneMap[profile?.tonePreference ?? "direct"];

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
          const month = new Date().toISOString().slice(0, 7);
          const stats = await computeStats(evidenceUserId, month);
          const summaryLine = stats.sessionsStarted > 0
            ? await generateIdentitySentence(month, stats)
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
      taskId: z.string(),
      date: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = input.date ?? getTodayDate();
      const plan = await getDailyPlan(ctx.user.id, date);
      if (!plan) return { success: false };

      const tasks = JSON.parse(plan.criticalTasks ?? "[]");
      const updated = tasks.map((t: any) =>
        t.id === input.taskId ? { ...t, done: true } : t
      );
      await updateDailyPlan(plan.id, ctx.user.id, { criticalTasks: JSON.stringify(updated) });

      const allDone = updated.every((t: any) => t.done);
      return { success: true, allTasksDone: allDone };
    }),

  weeklyPresence: protectedProcedure.query(async ({ ctx }) => {
    return getWeeklyCheckInPresence(ctx.user.id);
  }),
});
