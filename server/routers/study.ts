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
        logDate: z.string().optional(),
        capacity: z.string().optional(),
        firstMove: z.string().optional(),
        whatLearned: z.string().optional(),
        whatBuilt: z.string().optional(),
        stayedOnLesson: z.string().optional(),
        driftedWhere: z.string().optional(),
        returnStep: z.string().optional(),
        whatMoved: z.string().optional(),
        stillFuzzy: z.string().optional(),
        summary: z.string().optional(),
        carryForward: z.string().optional(),
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
        logDate: z.string().max(10),
        startTime: z.string().optional(),
        duration: z.string().optional(),
        capacity: z.string().optional(),
        lesson: z.string().optional(),
        tinyProject: z.string().optional(),
        intention: z.string().optional(),
        actualWork: z.string().optional(),
        drifted: z.string().optional(),
        driftedWhere: z.string().optional(),
        returnPoint: z.string().optional(),
        whatMoved: z.string().optional(),
        nextStep: z.string().optional(),
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
        meaningfulMovement: z.string().optional(),
        lessonsCompleted: z.string().optional(),
        buildsCompleted: z.string().optional(),
        stillFuzzy: z.string().optional(),
        driftedMost: z.string().optional(),
        whatHelped: z.string().optional(),
        newUnderstanding: z.string().optional(),
        openLoop: z.string().optional(),
        startHereNext: z.string().optional(),
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
