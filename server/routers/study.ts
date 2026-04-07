import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  studyDayLogs,
  studyFocusBlocks,
  studyWeeklyReviews,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

const err = () =>
  new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service temporarily unavailable." });

export const studyRouter = router({
  // ─── Day Logs ───────────────────────────────────────────────────────────────

  getDayLogs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(studyDayLogs).where(eq(studyDayLogs.userId, ctx.user.id));
  }),

  saveDayLog: protectedProcedure
    .input(
      z.object({
        dayNum: z.number().int().min(1).max(30),
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
        weekNum: z.number().int().min(1).max(4),
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
});
