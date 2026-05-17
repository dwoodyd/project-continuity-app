import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  studyDayLogs,
  studyFocusBlocks,
  studyWeeklyReviews,
  userFocusConfigs,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

const err = () =>
  new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service temporarily unavailable." });

// ── Wren continuity line generator ────────────────────────────────────────────
function wrenContinuityLine(
  entriesCount: number,
  currentStreak: number,
  lastEntryDate: string | null,
  focusTopic: string
): string {
  if (entriesCount === 0) return "Day 1. Beginning is its own thing. — Wren";

  const today = new Date().toISOString().slice(0, 10);
  const gapDays = lastEntryDate
    ? Math.floor((Date.now() - new Date(lastEntryDate).getTime()) / 86400000)
    : 0;

  if (gapDays >= 14) return "You came back. That's the thread. — Wren";
  if (gapDays >= 3) return "You're back. The thread didn't break — it was just resting. — Wren";
  if (currentStreak >= 4) return `${currentStreak} days in a row. You're finding the rhythm. — Wren`;
  if (entriesCount >= 8) return `${entriesCount} times in. Not every day. Often enough. — Wren`;
  return `Day ${entriesCount + 1}. Still here. — Wren`;
}

export const studyRouter = router({
  // ─── Focus Config (Single Focus Mode generalization) ────────────────────────

  getActiveConfig: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const [config] = await db
      .select()
      .from(userFocusConfigs)
      .where(and(eq(userFocusConfigs.userId, ctx.user.id), eq(userFocusConfigs.status, "active")))
      .orderBy(desc(userFocusConfigs.createdAt))
      .limit(1);
    if (!config) return null;
    return {
      ...config,
      wrenLine: wrenContinuityLine(
        config.entriesCount,
        config.currentStreak,
        config.lastEntryDate,
        config.focusTopic
      ),
    };
  }),

  getPastConfigs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(userFocusConfigs)
      .where(
        and(
          eq(userFocusConfigs.userId, ctx.user.id),
          // not active
        )
      )
      .orderBy(desc(userFocusConfigs.createdAt))
      .limit(10);
  }),

  createConfig: protectedProcedure
    .input(
      z.object({
        focusTopic: z.string().min(1).max(500),
        durationDays: z.number().int().min(1).max(3650),
        cadence: z.enum(["daily", "weekday", "rhythm"]).default("daily"),
        wrenPrompts: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw err();
      // End any currently active focus
      await db
        .update(userFocusConfigs)
        .set({ status: "ended", endedAt: new Date() })
        .where(and(eq(userFocusConfigs.userId, ctx.user.id), eq(userFocusConfigs.status, "active")));
      const [result] = await db.insert(userFocusConfigs).values({
        userId: ctx.user.id,
        ...input,
      });
      return { id: (result as any).insertId };
    }),

  updateConfig: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        focusTopic: z.string().min(1).max(500).optional(),
        durationDays: z.number().int().min(1).max(3650).optional(),
        status: z.enum(["active", "paused", "ended", "completed"]).optional(),
        pausedUntil: z.date().optional().nullable(),
        endedAt: z.date().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw err();
      const { id, ...updates } = input;
      await db
        .update(userFocusConfigs)
        .set(updates as any)
        .where(and(eq(userFocusConfigs.id, id), eq(userFocusConfigs.userId, ctx.user.id)));
      return { ok: true };
    }),

  // ─── Day Logs ───────────────────────────────────────────────────────────────

  getDayLogs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(studyDayLogs).where(eq(studyDayLogs.userId, ctx.user.id));
  }),

  saveDayLog: protectedProcedure
    .input(
      z.object({
        dayNum: z.number().int().min(1).max(3650),
        logDate: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
        capacity: z.string().max(50).optional(),
        firstMove: z.string().max(500).optional(),
        whatLearned: z.string().max(2000).optional(),
        whatBuilt: z.string().max(2000).optional(),
        stayedOnLesson: z.string().max(500).optional(),
        driftedWhere: z.string().max(500).optional(),
        returnStep: z.string().max(500).optional(),
        whatMoved: z.string().max(1000).optional(),
        stillFuzzy: z.string().max(1000).optional(),
        summary: z.string().max(2000).optional(),
        carryForward: z.string().max(500).optional(),
        completedAt: z.date().optional(),
        focusConfigId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw err();
      const existing = await db
        .select()
        .from(studyDayLogs)
        .where(and(eq(studyDayLogs.userId, ctx.user.id), eq(studyDayLogs.dayNum, input.dayNum)))
        .limit(1);
      if (existing.length > 0) {
        await db.update(studyDayLogs).set({ ...input }).where(eq(studyDayLogs.id, existing[0].id));
        return { id: existing[0].id };
      }
      const [result] = await db.insert(studyDayLogs).values({ userId: ctx.user.id, ...input });
      // Bump entriesCount + streak on the active config
      if (input.focusConfigId) {
        const [cfg] = await db
          .select()
          .from(userFocusConfigs)
          .where(eq(userFocusConfigs.id, input.focusConfigId))
          .limit(1);
        if (cfg) {
          const today = new Date().toISOString().slice(0, 10);
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          const newStreak =
            cfg.lastEntryDate === yesterday || cfg.lastEntryDate === today
              ? cfg.currentStreak + 1
              : 1;
          await db
            .update(userFocusConfigs)
            .set({
              entriesCount: cfg.entriesCount + 1,
              currentStreak: newStreak,
              longestStreak: Math.max(cfg.longestStreak, newStreak),
              lastEntryDate: today,
            })
            .where(eq(userFocusConfigs.id, cfg.id));
        }
      }
      return { id: (result as any).insertId };
    }),

  // ─── Focus Blocks ────────────────────────────────────────────────────────────

  getFocusBlocks: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(studyFocusBlocks).where(eq(studyFocusBlocks.userId, ctx.user.id));
  }),

  addFocusBlock: protectedProcedure
    .input(
      z.object({
        logDate: z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
        startTime: z.string().max(20).optional(),
        duration: z.string().max(20).optional(),
        capacity: z.string().max(50).optional(),
        lesson: z.string().max(1000).optional(),
        tinyProject: z.string().max(500).optional(),
        intention: z.string().max(500).optional(),
        actualWork: z.string().max(2000).optional(),
        drifted: z.string().max(500).optional(),
        driftedWhere: z.string().max(500).optional(),
        returnPoint: z.string().max(500).optional(),
        whatMoved: z.string().max(1000).optional(),
        nextStep: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw err();
      const [result] = await db.insert(studyFocusBlocks).values({ userId: ctx.user.id, ...input });
      return { id: (result as any).insertId };
    }),

  deleteFocusBlock: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw err();
      await db
        .delete(studyFocusBlocks)
        .where(and(eq(studyFocusBlocks.id, input.id), eq(studyFocusBlocks.userId, ctx.user.id)));
      return { ok: true };
    }),

  // ─── Weekly Reviews ──────────────────────────────────────────────────────────

  getWeeklyReviews: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(studyWeeklyReviews)
      .where(eq(studyWeeklyReviews.userId, ctx.user.id));
  }),

  saveWeeklyReview: protectedProcedure
    .input(
      z.object({
        weekNum: z.number().int().min(1).max(52),
        meaningfulMovement: z.string().max(2000).optional(),
        lessonsCompleted: z.string().max(1000).optional(),
        buildsCompleted: z.string().max(1000).optional(),
        stillFuzzy: z.string().max(1000).optional(),
        driftedMost: z.string().max(500).optional(),
        whatHelped: z.string().max(1000).optional(),
        newUnderstanding: z.string().max(2000).optional(),
        openLoop: z.string().max(500).optional(),
        startHereNext: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw err();
      const existing = await db
        .select()
        .from(studyWeeklyReviews)
        .where(
          and(eq(studyWeeklyReviews.userId, ctx.user.id), eq(studyWeeklyReviews.weekNum, input.weekNum))
        )
        .limit(1);
      if (existing.length > 0) {
        await db
          .update(studyWeeklyReviews)
          .set({ ...input })
          .where(eq(studyWeeklyReviews.id, existing[0].id));
        return { id: existing[0].id };
      }
      const [result] = await db.insert(studyWeeklyReviews).values({ userId: ctx.user.id, ...input });
      return { id: (result as any).insertId };
    }),

  // ─── Wren-generated daily prompt (Pro+) ─────────────────────────────────────

  generateDayPrompt: protectedProcedure
    .input(
      z.object({
        focusTopic: z.string(),
        dayNum: z.number().int().min(1),
        durationDays: z.number().int().min(1),
        previousEntries: z.array(z.string()).max(5).optional(),
        capacity: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Pro+ gate
      const user = ctx.user as any;
      if (!user.isPro && !user.isFoundingMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Wren-generated prompts require Pro." });
      }
      const { invokeLLM } = await import("../_core/llm");
      const prevContext =
        input.previousEntries && input.previousEntries.length > 0
          ? `Previous entries:\n${input.previousEntries.join("\n")}`
          : "No previous entries yet.";
      const resp = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are Wren, a quiet and precise companion. Generate a daily focus prompt for someone working on: "${input.focusTopic}". This is day ${input.dayNum} of ${input.durationDays}. Be specific and small. Never preachy. Plain English. No jargon unless the topic demands it. Always invitational ("today: loops") not declarative ("today you will learn"). Return JSON only.`,
          },
          {
            role: "user",
            content: `${prevContext}\nCapacity today: ${input.capacity || "unknown"}\nGenerate: focusFraming (1 sentence), firstMove (1 sentence), tinyProject (1 sentence).`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "day_prompt",
            strict: true,
            schema: {
              type: "object",
              properties: {
                focusFraming: { type: "string" },
                firstMove: { type: "string" },
                tinyProject: { type: "string" },
              },
              required: ["focusFraming", "firstMove", "tinyProject"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = resp.choices[0].message.content;
      return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
    }),
});
