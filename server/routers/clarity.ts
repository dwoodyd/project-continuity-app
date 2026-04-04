/**
 * Clarity Engine router
 * Features: Brain Dump → 4-Part Clarity Map + Signal Line, session history,
 * progress marker, Clarity-to-Action handoff
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import { checkLLMRateLimit } from "../_core/rateLimiter";
import { getDb, updateProject, createProjectMemoryEvent, getProjectById } from "../db";
import { claritySessions } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

const MODES = [
  "overwhelm",
  "decision",
  "creative_block",
  "identity_drift",
  "relationship_tension",
  "purpose_fog",
] as const;

const MODE_CONTEXT: Record<string, string> = {
  overwhelm:
    "The user is feeling overwhelmed — too many things, too much noise, unclear where to start. Help them find the one real thing beneath the pile.",
  decision:
    "The user is stuck in a decision loop. Help them name what they actually know, what they fear, and what the honest next step is.",
  creative_block:
    "The user is blocked creatively. Help them identify whether the block is fear, depletion, unclear direction, or external pressure.",
  identity_drift:
    "The user feels disconnected from who they are or what they're building. Help them reconnect to their core intention.",
  relationship_tension:
    "The user is carrying tension from a relationship or interpersonal dynamic. Help them name what's real and what they need.",
  purpose_fog:
    "The user is questioning their direction or purpose. Help them find clarity without forcing a false answer.",
};

export const clarityRouter = router({
  // ── Run a full Clarity Engine session ──────────────────────────────────────
  runSession: protectedProcedure
    .input(
      z.object({
        mode: z.enum(MODES),
        brainDump: z.string().min(10, "Please share at least a few sentences").max(8000, "Brain dump must be under 8,000 characters"),
        projectId: z.number().optional(),
      })
    )
     .mutation(async ({ ctx, input }) => {
      checkLLMRateLimit(ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service temporarily unavailable." });
      const modeContext = MODE_CONTEXT[input.mode];

      const systemPrompt = `You are the Clarity Engine inside Continuary — a calm, perceptive guide that helps people move from inner noise to clear action.

${modeContext}

Your job is to generate a structured 4-Part Clarity Map plus a Signal Line.

Respond ONLY with valid JSON in this exact shape:
{
  "whatIsHappening": "2-3 sentences naming what is actually happening beneath the surface",
  "whatYouFeel": "1-2 sentences naming the real emotional experience, without judgment",
  "whatYouNeed": "1-2 sentences naming what is actually needed right now",
  "nextRightStep": "One concrete, small, honest next action — not a plan, just the next right step",
  "signalLine": "One short sentence (under 20 words) that names the deepest truth beneath all the noise"
}

Tone: warm, direct, non-clinical. No bullet points. No headers. No preamble. JSON only.`;

      // Default fallback map used when LLM is unavailable or returns bad JSON
      const FALLBACK_MAP = {
        whatIsHappening: "Something is weighing on you right now.",
        whatYouFeel: "There is more here than words can easily capture.",
        whatYouNeed: "Space, clarity, and one honest next step.",
        nextRightStep: "Take a breath and name the one thing that matters most today.",
        signalLine: "You already know more than you think.",
      };

      let map: {
        whatIsHappening: string;
        whatYouFeel: string;
        whatYouNeed: string;
        nextRightStep: string;
        signalLine: string;
      } = FALLBACK_MAP;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Mode: ${input.mode}\n\nBrain dump:\n${input.brainDump}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "clarity_map",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  whatIsHappening: { type: "string" },
                  whatYouFeel: { type: "string" },
                  whatYouNeed: { type: "string" },
                  nextRightStep: { type: "string" },
                  signalLine: { type: "string" },
                },
                required: [
                  "whatIsHappening",
                  "whatYouFeel",
                  "whatYouNeed",
                  "nextRightStep",
                  "signalLine",
                ],
                additionalProperties: false,
              },
            },
          },
        });
        const raw = response?.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
        if (parsed.whatIsHappening) map = parsed;
      } catch {
        // LLM unavailable or returned malformed JSON — use fallback map
      }

      const [result] = await db
        .insert(claritySessions)
        .values({
          userId: ctx.user.id,
          projectId: input.projectId ?? null,
          mode: input.mode,
          brainDump: input.brainDump,
          whatIsHappening: map.whatIsHappening,
          whatYouFeel: map.whatYouFeel,
          whatYouNeed: map.whatYouNeed,
          nextRightStep: map.nextRightStep,
          signalLine: map.signalLine,
        })
        .$returningId();

      const [session] = await db
        .select()
        .from(claritySessions)
        .where(eq(claritySessions.id, result.id))
        .limit(1);

      return session;
    }),

  // ── Get session history ────────────────────────────────────────────────────
  getSessions: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(claritySessions)
        .where(eq(claritySessions.userId, ctx.user.id))
        .orderBy(desc(claritySessions.createdAt))
        .limit(input.limit);
    }),

  // ── Get single session ─────────────────────────────────────────────────────
  getSession: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const [session] = await db
        .select()
        .from(claritySessions)
        .where(
          and(
            eq(claritySessions.id, input.id),
            eq(claritySessions.userId, ctx.user.id)
          )
        )
        .limit(1);
      return session ?? null;
    }),

  // ── Set progress marker ────────────────────────────────────────────────────
  setProgressMarker: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        marker: z.enum(["clearer", "still_unsure", "ready_to_act", "need_to_revisit"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service temporarily unavailable." });
      await db
        .update(claritySessions)
        .set({ progressMarker: input.marker })
        .where(
          and(
            eq(claritySessions.id, input.sessionId),
            eq(claritySessions.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  // ── Convert session output to an action ───────────────────────────────────
  convertToAction: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        convertTo: z.enum([
          "next_step",
          "todays_focus",
          "project_note",
          "compass_item",
          "journal_reflection",
        ]),
        projectId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service temporarily unavailable." });

      // Mark the session as converted
      await db
        .update(claritySessions)
        .set({ convertedTo: input.convertTo })
        .where(
          and(
            eq(claritySessions.id, input.sessionId),
            eq(claritySessions.userId, ctx.user.id)
          )
        );

      // Fetch the session to get the nextRightStep — include userId to prevent IDOR
      const [session] = await db
        .select()
        .from(claritySessions)
        .where(
          and(
            eq(claritySessions.id, input.sessionId),
            eq(claritySessions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });

      const nextStep = session.nextRightStep ?? "";
      const resolvedProjectId = input.projectId ?? session.projectId ?? null;

      // ── Feature 7: Clarity-to-Project deep link ──────────────────────────
      // When converting to 'next_step' or 'project_note' and a project is
      // linked, write the nextRightStep into the project's nextStep field and
      // log a memory event so it surfaces on the Command Center immediately.
      let projectTitle: string | null = null;
      if (
        resolvedProjectId &&
        (input.convertTo === "next_step" || input.convertTo === "project_note")
      ) {
        const project = await getProjectById(resolvedProjectId, ctx.user.id);
        if (project) {
          projectTitle = project.title;
          // Update project nextStep
          await updateProject(resolvedProjectId, ctx.user.id, {
            nextStep,
          });
          // Log a memory event
          await createProjectMemoryEvent({
            userId: ctx.user.id,
            projectId: resolvedProjectId,
            eventType: "next_step_change",
            content: `Clarity Engine → ${nextStep}`,
            metadata: JSON.stringify({
              source: "clarity_engine",
              sessionId: session.id,
              mode: session.mode,
              signalLine: session.signalLine ?? "",
            }),
          });
        }
      }

      return {
        success: true,
        convertedTo: input.convertTo,
        content: nextStep,
        projectTitle,
        projectUpdated: !!projectTitle,
      };
    }),

  // ── Query: sessions linked to a specific project ───────────────────────────
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(claritySessions)
        .where(
          and(
            eq(claritySessions.userId, ctx.user.id),
            eq(claritySessions.projectId, input.projectId)
          )
        )
        .orderBy(desc(claritySessions.createdAt))
        .limit(30);
    }),

  // ── Analyze patterns across clarity sessions ──────────────────────────────
  analyzePatterns: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const sessions = await db
        .select()
        .from(claritySessions)
        .where(eq(claritySessions.userId, ctx.user.id))
        .orderBy(desc(claritySessions.createdAt))
        .limit(50);
      if (sessions.length < 3) return null;

      // Build a compact summary for the LLM
      const sessionSummaries = sessions.map((s) => ({
        mode: s.mode,
        signalLine: s.signalLine ?? "",
        whatIsHappening: (s.whatIsHappening ?? "").slice(0, 120),
        whatYouNeed: (s.whatYouNeed ?? "").slice(0, 80),
        progressMarker: s.progressMarker ?? "unknown",
        date: s.createdAt.toISOString().split("T")[0],
      }));

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a thoughtful analyst reviewing someone's Clarity Engine sessions. Your job is to identify recurring patterns, themes, and growth signals — without judgment or diagnosis. Be warm, honest, and specific. Return valid JSON only.`,
          },
          {
            role: "user",
            content: `Here are ${sessions.length} clarity sessions (most recent first):\n${JSON.stringify(sessionSummaries, null, 2)}\n\nIdentify:\n1. The most frequently used clarity mode\n2. Recurring themes or phrases across sessions\n3. Progress signals (modes shifting, markers improving)\n4. One honest observation about what keeps coming up\n5. One encouraging pattern you notice`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "clarity_patterns",
            strict: true,
            schema: {
              type: "object",
              properties: {
                mostUsedMode: { type: "string" },
                recurringThemes: { type: "array", items: { type: "string" } },
                progressSignals: { type: "array", items: { type: "string" } },
                honestObservation: { type: "string" },
                encouragingPattern: { type: "string" },
                sessionCount: { type: "number" },
              },
              required: ["mostUsedMode", "recurringThemes", "progressSignals", "honestObservation", "encouragingPattern", "sessionCount"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = response?.choices?.[0]?.message?.content ?? "{}";
      try {
        const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
        return { ...result, sessionCount: sessions.length };
      } catch {
        return null;
      }
    }),

  // ── Weekly Clarity Summary ─────────────────────────────────────────────────
  getWeeklySummary: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const sessions = await db
        .select()
        .from(claritySessions)
        .where(
          and(
            eq(claritySessions.userId, ctx.user.id),
          )
        )
        .orderBy(desc(claritySessions.createdAt))
        .limit(20);

      const weekSessions = sessions.filter(
        (s) => new Date(s.createdAt) >= sevenDaysAgo
      );

      if (weekSessions.length === 0) return null;

      // Count modes
      const modeCounts: Record<string, number> = {};
      for (const s of weekSessions) {
        modeCounts[s.mode] = (modeCounts[s.mode] ?? 0) + 1;
      }
      const topMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

      // Count progress markers
      const markerCounts: Record<string, number> = {};
      for (const s of weekSessions) {
        if (s.progressMarker) {
          markerCounts[s.progressMarker] = (markerCounts[s.progressMarker] ?? 0) + 1;
        }
      }

      // Collect signal lines
      const signalLines = weekSessions
        .filter((s) => s.signalLine)
        .map((s) => s.signalLine!);

      return {
        sessionCount: weekSessions.length,
        topMode,
        modeCounts,
        markerCounts,
        signalLines,
        convertedCount: weekSessions.filter((s) => s.convertedTo).length,
      };
    }),

  // ── Mode recommendation: day-of-week + recency pattern analysis ─────────
  getModeRecommendation: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const sessions = await db
      .select({ mode: claritySessions.mode, createdAt: claritySessions.createdAt })
      .from(claritySessions)
      .where(eq(claritySessions.userId, ctx.user.id))
      .orderBy(desc(claritySessions.createdAt))
      .limit(20);

    if (sessions.length < 5) return null;

    const today = new Date();
    const todayDow = today.getDay();

    const dowCounts: Record<string, number> = {};
    const overallCounts: Record<string, number> = {};

    for (const s of sessions) {
      const dow = new Date(s.createdAt).getDay();
      overallCounts[s.mode] = (overallCounts[s.mode] ?? 0) + 1;
      if (dow === todayDow) {
        dowCounts[s.mode] = (dowCounts[s.mode] ?? 0) + 1;
      }
    }

    const dowEntries = Object.entries(dowCounts).filter(([, c]) => c >= 2);
    const overallEntries = Object.entries(overallCounts);

    let recommendedMode: string | null = null;
    let confidence: "day_pattern" | "overall_pattern" | null = null;

    if (dowEntries.length > 0) {
      recommendedMode = dowEntries.sort(([, a], [, b]) => b - a)[0][0];
      confidence = "day_pattern";
    } else {
      const top = overallEntries.sort(([, a], [, b]) => b - a)[0];
      if (top && top[1] / sessions.length >= 0.35) {
        recommendedMode = top[0];
        confidence = "overall_pattern";
      }
    }

    if (!recommendedMode || !confidence) return null;

    const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const MODE_LABELS: Record<string, string> = {
      overwhelm: "Overwhelm",
      decision: "Decision Loop",
      creative_block: "Creative Block",
      identity_drift: "Identity Drift",
      relationship_tension: "Relationship Tension",
      purpose_fog: "Purpose Fog",
    };
    const MODE_NUDGES: Record<string, string> = {
      overwhelm: "You often carry a lot on this day. A quick clarity pass might help you find the one real thing.",
      decision: "Decisions tend to pile up for you around now. A session could help you cut through the noise.",
      creative_block: "Your creative energy sometimes needs a reset at this point in the week. Worth checking in.",
      identity_drift: "You've used the engine to reconnect with your direction before. Might be worth a moment today.",
      relationship_tension: "Interpersonal weight has come up for you on days like this. A clarity pass can help you name it.",
      purpose_fog: "Purpose questions tend to surface for you around this time. A session could bring some ground.",
    };

    return {
      mode: recommendedMode,
      modeLabel: MODE_LABELS[recommendedMode] ?? recommendedMode,
      nudge: MODE_NUDGES[recommendedMode] ?? "A clarity session might help right now.",
      confidence,
      context: confidence === "day_pattern"
        ? `You've run ${dowCounts[recommendedMode]} sessions on ${DOW_NAMES[todayDow]}s in ${MODE_LABELS[recommendedMode] ?? recommendedMode} mode.`
        : `${MODE_LABELS[recommendedMode] ?? recommendedMode} is your most-used mode across recent sessions.`,
    };
  }),
});
