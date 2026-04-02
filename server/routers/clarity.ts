/**
 * Clarity Engine router
 * Features: Brain Dump → 4-Part Clarity Map + Signal Line, session history,
 * progress marker, Clarity-to-Action handoff
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
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
        brainDump: z.string().min(10, "Please share at least a few sentences"),
        projectId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

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
      let map: {
        whatIsHappening: string;
        whatYouFeel: string;
        whatYouNeed: string;
        nextRightStep: string;
        signalLine: string;
      };
      try {
        map = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
      } catch {
        map = {
          whatIsHappening: "Something is weighing on you right now.",
          whatYouFeel: "There is more here than words can easily capture.",
          whatYouNeed: "Space, clarity, and one honest next step.",
          nextRightStep: "Take a breath and name the one thing that matters most today.",
          signalLine: "You already know more than you think.",
        };
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
      if (!db) throw new Error("Database unavailable");
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
      if (!db) throw new Error("Database unavailable");

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

      // Fetch the session to get the nextRightStep
      const [session] = await db
        .select()
        .from(claritySessions)
        .where(eq(claritySessions.id, input.sessionId))
        .limit(1);

      if (!session) throw new Error("Session not found");

      return {
        success: true,
        convertedTo: input.convertTo,
        content: session.nextRightStep ?? "",
      };
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
});
