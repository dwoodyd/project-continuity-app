/**
 * Intelligence router — handles all the "memory and continuity" features:
 * - Distraction event extraction + AI classification
 * - Decision capture (manual + AI-extracted from evening notes)
 * - Project Memory Timeline
 * - Weekly Compass (generation + confirmation)
 * - Re-Entry Card with real session data
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { checkLLMRateLimit } from "../_core/rateLimiter";
import { invokeLLM } from "../_core/llm";
import { getWrenToneBucket } from "../wrenTone";
import {
  createDistractionEvent,
  getDistractionWeeklyAggregates,
  createProjectMemoryEvent,
  batchCreateProjectMemoryEvents,
  getProjectMemoryEvents,
  getLastDecisionForProject,
  getWeeklyCompass,
  getLatestWeeklyCompass,
  upsertWeeklyCompass,
  createDecision,
  getDecisionsByProject,
  getRecentDecisions,
  getFocusSessionsByProject,
  getRecentFocusSessions,
  getActiveProjects,
  getProjectById,
  assertProjectOwnedBy,
  getRecentCheckIns,
  getRecentDailyPlans,
  createReEntryCard,
  getLatestReEntryCard,
  acknowledgeReEntryCard,
  getUserProfile,
  updateProject,
} from "../db";
import { getWeekEvents, formatEventsForPrompt } from "../googleCalendar";

// ── Distraction Classification ─────────────────────────────────────────────────
export const intelligenceRouter = router({

  classifyAndSaveDistraction: protectedProcedure
    .input(z.object({
      rawInput: z.string().max(2000, "Input must be under 2,000 characters"),
      checkInType: z.enum(["midday", "evening"]),
      projectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkLLMRateLimit(ctx.user.id);
      const hour = new Date().getHours();
      const timeOfDay: "morning" | "afternoon" | "evening" =
        hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

      // AI classification — low confidence → unknown
      let category: "social_media" | "research_rabbit_hole" | "unplanned_task" | "communication" | "context_switch" | "unknown" = "unknown";
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You classify work interruptions into one of these categories:
social_media, research_rabbit_hole, unplanned_task, communication, context_switch, unknown.
Only assign a specific category if you are confident. If unsure, return unknown.
Return JSON only: { category: string, confidence: "high"|"medium"|"low" }`,
            },
            { role: "user", content: `Interruption description: "${input.rawInput}"` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "distraction_classification",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  confidence: { type: "string" },
                },
                required: ["category", "confidence"],
                additionalProperties: false,
              },
            },
          },
        });
        const raw = JSON.parse((response.choices[0]?.message?.content as string) ?? "{}");
        const validCategories = ["social_media", "research_rabbit_hole", "unplanned_task", "communication", "context_switch"];
        if (raw.confidence !== "low" && validCategories.includes(raw.category)) {
          category = raw.category;
        }
      } catch {
        // classification failed — store as unknown
      }

      await createDistractionEvent({
        userId: ctx.user.id,
        projectId: input.projectId ?? null,
        checkInType: input.checkInType,
        rawInput: input.rawInput,
        category,
        timeOfDay,
      });

      return { category, timeOfDay };
    }),

  getDistractionAggregates: protectedProcedure.query(async ({ ctx }) => {
    return getDistractionWeeklyAggregates(ctx.user.id);
  }),

  // ── Decision Capture ──────────────────────────────────────────────────────────
  saveDecision: protectedProcedure
    .input(z.object({
      content: z.string().min(1).max(5000, "Decision must be under 5,000 characters"),
      projectId: z.number().optional(),
      source: z.enum(["manual", "extracted"]).default("manual"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.projectId) await assertProjectOwnedBy(input.projectId, ctx.user.id);
      const id = await createDecision({
        userId: ctx.user.id,
        projectId: input.projectId ?? null,
        content: input.content,
        source: input.source,
      });
      // Also log to project memory timeline if project is specified
      if (input.projectId) {
        await createProjectMemoryEvent({
          userId: ctx.user.id,
          projectId: input.projectId,
          eventType: "decision",
          content: input.content,
        });
      }
      return { id };
    }),

  extractDecisionsFromNotes: protectedProcedure
    .input(z.object({
      notes: z.string().max(10000, "Notes must be under 10,000 characters"),
      projectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkLLMRateLimit(ctx.user.id);
      if (!input.notes.trim()) return { decisions: [] };
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Extract explicit decisions from the user's notes. 
A decision is a statement where something was chosen, ruled out, changed, or committed to.
Examples: "decided to pause video launch", "chapter 3 now belongs before chapter 2", "tone should stay restrained"
Only extract clear decisions — do not infer or paraphrase loosely.
Return JSON: { decisions: string[] }`,
            },
            { role: "user", content: input.notes },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "decision_extraction",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  decisions: { type: "array", items: { type: "string" } },
                },
                required: ["decisions"],
                additionalProperties: false,
              },
            },
          },
        });
        const raw = JSON.parse((response.choices[0]?.message?.content as string) ?? "{}");
        return { decisions: (raw.decisions ?? []) as string[] };
      } catch {
        return { decisions: [] };
      }
    }),

  getDecisionsForProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getDecisionsByProject(ctx.user.id, input.projectId);
    }),

  getRecentDecisions: protectedProcedure.query(async ({ ctx }) => {
    return getRecentDecisions(ctx.user.id, 10);
  }),

  // ── Project Memory Timeline ───────────────────────────────────────────────────
  logMemoryEvent: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      eventType: z.enum(["created", "vault_import", "check_in", "focus_session", "milestone", "blocker", "next_step_change", "decision", "status_change"]),
      content: z.string().max(5000),
      metadata: z.string().max(2000).optional(),
      occurredAt: z.number().optional(), // unix ms
    }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwnedBy(input.projectId, ctx.user.id);
      const id = await createProjectMemoryEvent({
        userId: ctx.user.id,
        projectId: input.projectId,
        eventType: input.eventType,
        content: input.content,
        metadata: input.metadata ?? null,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      });
      return { id };
    }),

  getProjectTimeline: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      filterType: z.enum(["all", "created", "vault_import", "check_in", "focus_session", "milestone", "blocker", "next_step_change", "decision", "status_change"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const events = await getProjectMemoryEvents(ctx.user.id, input.projectId);
      const filtered = input.filterType && input.filterType !== "all"
        ? events.filter((e) => e.eventType === input.filterType)
        : events;

      // Derive surface-level insights
      const lastMovement = events.find((e) => ["focus_session", "milestone", "next_step_change"].includes(e.eventType));
      const lastDecision = events.find((e) => e.eventType === "decision");
      const openLoops = events.filter((e) => e.eventType === "blocker").slice(0, 3);

      return {
        events: filtered,
        insights: {
          lastMovement: lastMovement ?? null,
          lastDecision: lastDecision ?? null,
          openLoops,
        },
      };
    }),

  buildProjectTimeline: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Backfill timeline from existing data sources
      const [project, sessions, checkIns] = await Promise.all([
        getProjectById(input.projectId, ctx.user.id),
        getFocusSessionsByProject(ctx.user.id, input.projectId, 20),
        getRecentCheckIns(ctx.user.id, 30),
      ]);

      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or does not belong to you." });
      let synced = 0;

      // Log project creation if no events exist
      const existing = await getProjectMemoryEvents(ctx.user.id, input.projectId);
      if (existing.length === 0) {
        await createProjectMemoryEvent({
          userId: ctx.user.id,
          projectId: input.projectId,
          eventType: "created",
          content: `Project "${project.title}" created.`,
          occurredAt: project.createdAt,
        });
        synced++;
      }

      // Log focus sessions not yet in timeline — batch insert to avoid N+1
      const existingSessionIds = new Set(
        existing.filter((e) => e.eventType === "focus_session").map((e) => {
          try { return JSON.parse(e.metadata ?? "{}").sessionId; } catch { return null; }
        })
      );
      const newSessionEvents = sessions
        .filter((session) => !existingSessionIds.has(session.id))
        .map((session) => ({
          userId: ctx.user.id,
          projectId: input.projectId,
          eventType: "focus_session" as const,
          content: `Focus session: "${session.intention}" — ${Math.round(session.durationSeconds / 60)} min${session.wasCompleted ? " (completed)" : " (stepped away)"}`,
          metadata: JSON.stringify({ sessionId: session.id, durationSeconds: session.durationSeconds, wasCompleted: session.wasCompleted }),
          occurredAt: session.startedAt,
        }));
      await batchCreateProjectMemoryEvents(newSessionEvents);
      synced += newSessionEvents.length;

      return { synced };
    }),

  // ── Weekly Compass ────────────────────────────────────────────────────────────
  getWeeklyCompass: protectedProcedure.query(async ({ ctx }) => {
    return (await getLatestWeeklyCompass(ctx.user.id)) ?? null;
  }),

  generateWeeklyCompass: protectedProcedure.mutation(async ({ ctx }) => {
    await checkLLMRateLimit(ctx.user.id);
    const [activeProjects, recentSessions, recentPlans, calendarEvents, toneBucket] = await Promise.all([
      getActiveProjects(ctx.user.id),
      getRecentFocusSessions(ctx.user.id, 20),
      getRecentDailyPlans(ctx.user.id, 7),
      getWeekEvents(ctx.user.id).catch(() => null),
      getWrenToneBucket(ctx.user.id),
    ]);

    const toneMap = { gentle: "warm and grounded", direct: "calm and direct", firm: "concise and firm" };
    const tone = toneMap[toneBucket];

    // Build context for AI
    const projectSummaries = activeProjects.slice(0, 8).map((p) => {
      const sessionCount = recentSessions.filter((s) => s.projectId === p.id).length;
      return `"${p.title}" (status: ${p.status}, next: ${p.nextStep ?? "not set"}, sessions this week: ${sessionCount})`;
    }).join("\n");

    const calendarSection = calendarEvents
      ? `\n\nCalendar events this week:\n${formatEventsForPrompt(calendarEvents)}`
      : "";

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are Wren, Continuary's grounded weekly companion. Tone: ${tone}.
Speak directly to the user with calm, human warmth. Be clear rather than corporate: never use management jargon such as “subsequent prioritization,” “task allocation,” or “resource optimization.”
Help the user choose a gentle, realistic direction across their active projects.
When calendar events are provided, factor in busy blocks and scheduled commitments when recommending what to prioritize and what to defer.
Return JSON only.`,
        },
        {
          role: "user",
          content: `Active projects this week:\n${projectSummaries || "No active projects yet."}${calendarSection}

Generate a weekly compass:
1. Recommend primary project (most important to move this week)
2. Recommend secondary project (if bandwidth allows)
3. Suggest admin/maintenance lane (1 sentence)
4. List what must move (1-3 items)
5. List what can wait (1-3 items)  
6. List what should be parked (0-2 items)
7. Write 2-3 sentences of weekly guidance

Return JSON: {
  recommendedPrimaryId: number|null,
  recommendedSecondaryId: number|null,
  adminLane: string,
  mustMove: string[],
  canWait: string[],
  shouldPark: string[],
  guidance: string
}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "weekly_compass",
          strict: true,
          schema: {
            type: "object",
            properties: {
              recommendedPrimaryId: { type: ["number", "null"] },
              recommendedSecondaryId: { type: ["number", "null"] },
              adminLane: { type: "string" },
              mustMove: { type: "array", items: { type: "string" } },
              canWait: { type: "array", items: { type: "string" } },
              shouldPark: { type: "array", items: { type: "string" } },
              guidance: { type: "string" },
            },
            required: ["recommendedPrimaryId", "recommendedSecondaryId", "adminLane", "mustMove", "canWait", "shouldPark", "guidance"],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = JSON.parse((response.choices[0]?.message?.content as string) ?? "{}");

    // Get Monday of current week
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);

    const id = await upsertWeeklyCompass({
      userId: ctx.user.id,
      weekStart: monday,
      primaryProjectId: raw.recommendedPrimaryId ?? null,
      secondaryProjectId: raw.recommendedSecondaryId ?? null,
      adminLane: raw.adminLane,
      mustMove: JSON.stringify(raw.mustMove),
      canWait: JSON.stringify(raw.canWait),
      shouldPark: JSON.stringify(raw.shouldPark),
      generatedGuidance: raw.guidance,
    });

    return { id, ...raw };
  }),

  confirmWeeklyCompass: protectedProcedure
    .input(z.object({
      primaryProjectId: z.number().nullable(),
      secondaryProjectId: z.number().nullable(),
      adminLane: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getLatestWeeklyCompass(ctx.user.id);
      if (!existing) return { success: false };
      await upsertWeeklyCompass({
        ...existing,
        primaryProjectId: input.primaryProjectId,
        secondaryProjectId: input.secondaryProjectId,
        adminLane: input.adminLane ?? existing.adminLane ?? "",
        userConfirmedAt: new Date(),
      });
      return { success: true };
    }),

  // ── Re-Entry Card with Real Data ──────────────────────────────────────────────
  generateReEntryCard: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await checkLLMRateLimit(ctx.user.id);
      const [project, sessions, checkIns] = await Promise.all([
        getProjectById(input.projectId, ctx.user.id),
        getFocusSessionsByProject(ctx.user.id, input.projectId, 5),
        getRecentCheckIns(ctx.user.id, 10),
      ]);

      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });

      const isFirstSession = sessions.length === 0;
      const lastSession = sessions[0];

      // 24h session gate: only show full re-entry context if last session was 24h+ ago
      const hoursSinceLastSession = lastSession
        ? (Date.now() - new Date(lastSession.startedAt).getTime()) / (1000 * 60 * 60)
        : Infinity;
      const isReturning = isFirstSession || hoursSinceLastSession >= 24;

      // Handled tasks from last 2 sessions: completed intentions
      const lastTwoSessions = sessions.slice(0, 2);
      const handledItems = lastTwoSessions
        .filter((s) => s.wasCompleted && s.intention)
        .map((s) => s.intention)
        .slice(0, 3);

      const projectCheckIns = checkIns.filter((c) => {
        try {
          const inp = JSON.parse(c.userInput ?? "{}");
          return inp.primaryProjectId === project.id;
        } catch { return false; }
      });
      const lastCheckInNote = projectCheckIns[0]?.userInput
        ? (() => { try { return JSON.parse(projectCheckIns[0]!.userInput!).userNotes; } catch { return null; } })()
        : null;

      // Build the card content
      let stoppingPoint: string | null = null;
      let unresolvedDecision: string | null = null;
      let whatWasRuledOut: string | null = null;
      let nextPhysicalAction: string | null = null;
      let needsClarification = false;

      if (isFirstSession) {
        nextPhysicalAction = project.nextStep ?? null;
      } else {
        // Last stopping point from context breadcrumb or last session notes
        stoppingPoint = project.contextBreadcrumb ?? lastSession?.notes ?? null;
        unresolvedDecision = lastCheckInNote ?? null;

        // What was ruled out — completed intentions from last 2 sessions
        whatWasRuledOut = handledItems.length > 0 ? handledItems.join("; ") : null;

        // Check if next step is vague
        const vaguePhrases = ["work on", "look at", "think about", "deal with", "handle", "do the"];
        const nextStep = project.nextStep ?? "";
        needsClarification = vaguePhrases.some((p) => nextStep.toLowerCase().startsWith(p));
        nextPhysicalAction = needsClarification ? null : nextStep;
      }

      // AI-enhance the card
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You generate a re-entry card for someone returning to a project. 
Be concrete and specific. Use the user's own words where possible.
Never be motivational. Never add tasks that weren't mentioned.
Return JSON only.`,
            },
            {
              role: "user",
              content: `Project: "${project.title}"
Why it matters: "${project.whyItMatters ?? "not specified"}"
Current next step: "${project.nextStep ?? "not set"}"
Last stopping point: "${stoppingPoint ?? "none"}"
Last check-in note: "${unresolvedDecision ?? "none"}"
Last session intention: "${lastSession?.intention ?? "none"}"
Last session notes: "${lastSession?.notes ?? "none"}"
Is first session: ${isFirstSession}

Generate:
1. A concrete next physical action (verb-first, specific)
2. What was already handled (1-2 items, or null)
3. The open thread (what the user was working through, in their own words if possible)
4. Whether the next step needs clarification (true/false)

Return JSON: { nextPhysicalAction: string, whatWasRuledOut: string|null, openThread: string|null, needsClarification: boolean }`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "reentry_card",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  nextPhysicalAction: { type: "string" },
                  whatWasRuledOut: { type: ["string", "null"] },
                  openThread: { type: ["string", "null"] },
                  needsClarification: { type: "boolean" },
                },
                required: ["nextPhysicalAction", "whatWasRuledOut", "openThread", "needsClarification"],
                additionalProperties: false,
              },
            },
          },
        });
        const aiCard = JSON.parse((response.choices[0]?.message?.content as string) ?? "{}");
        nextPhysicalAction = aiCard.nextPhysicalAction ?? nextPhysicalAction;
        whatWasRuledOut = aiCard.whatWasRuledOut ?? whatWasRuledOut;
        unresolvedDecision = aiCard.openThread ?? unresolvedDecision;
        needsClarification = aiCard.needsClarification ?? needsClarification;
      } catch {
        // AI failed — use raw data
      }

      const cardId = await createReEntryCard({
        userId: ctx.user.id,
        projectId: input.projectId,
        stoppingPoint,
        unresolvedDecision,
        whatWasRuledOut,
        nextPhysicalAction,
        whyItMattersQuote: project.whyItMatters ?? null,
      });

      return {
        cardId,
        isFirstSession,
        isReturning,
        hoursSinceLastSession: Math.round(hoursSinceLastSession),
        stoppingPoint,
        unresolvedDecision,
        whatWasRuledOut,
        nextPhysicalAction,
        whyItMatters: project.whyItMatters,
        needsClarification,
        projectTitle: project.title,
      };
    }),

  acknowledgeReEntryCard: protectedProcedure
    .input(z.object({ cardId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await acknowledgeReEntryCard(input.cardId, ctx.user.id);
      return { success: true };
    }),

  // ── Onboarding: generate first concrete next step ────────────────────────
  generateOnboardingStartHere: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      projectTitle: z.string().max(500, "Project title must be under 500 characters"),
      whyItMatters: z.string().max(2000).optional(),
      userNextStep: z.string().max(2000).optional(),
      workStyle: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await checkLLMRateLimit(ctx.user.id);
      const { projectId, projectTitle, whyItMatters, userNextStep, workStyle } = input;
      // If the user already gave a concrete next step (>10 chars), use it directly
      if (userNextStep && userNextStep.trim().length > 10) {
        return { nextStep: userNextStep.trim() };
      }
      const toneMap: Record<string, string> = {
        gentle: "warm and supportive",
        direct: "calm and factual",
        firm: "concise and direct",
      };
      const tone = toneMap[await getWrenToneBucket(ctx.user.id)] ?? "calm and clear";
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a calm, structured productivity assistant. Your tone is ${tone}. Generate a single concrete first action for a new project. Requirements:
- Specific and physical (not "think about" or "plan")
- Completable in 20-60 minutes
- The absolute smallest useful first move
- Written as an imperative sentence
- Maximum 12 words
Return only the action text, no explanation, no quotes, no punctuation at end.`,
            },
            {
              role: "user",
              content: `Project: ${projectTitle}${whyItMatters ? `\nWhy it matters: ${whyItMatters}` : ""}${workStyle ? `\nWork style: ${workStyle}` : ""}`,
            },
          ],
        });
        const rawContent = response.choices?.[0]?.message?.content;
        const nextStep = (typeof rawContent === "string" ? rawContent.trim() : null)
          ?? `Open a blank document and write the first sentence for ${projectTitle}`;
        // Persist to the project record
        await updateProject(projectId, ctx.user.id, { nextStep });
        // Log to project memory timeline
        await createProjectMemoryEvent({
          userId: ctx.user.id,
          projectId,
          eventType: "next_step_change",
          content: `First action generated on onboarding: ${nextStep}`,
        });
        return { nextStep };
      } catch {
        return { nextStep: `Open a blank document and write the first line for ${projectTitle}` };
      }
    }),
});
