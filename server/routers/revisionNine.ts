import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  collapseCanaries,
  courtEntries,
  hyperfocusExits,
  ifThenPlans,
  readDays,
  readItems,
  thresholdPlans,
  taskEstimates,
  waitingRegisterItems,
} from "../../drizzle/schema";
import { getDb, getUserProfile, updateUserProfile, upsertUserProfile } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const now = () => Date.now();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const textSchema = z.string().trim().min(1).max(2000);

async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

/**
 * Revision 9 intentionally stores a member's own operational language. None of
 * these procedures derive a score, a streak, or a judgement from the records.
 */
export const revisionNineRouter = router({
  regulation: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getUserProfile(ctx.user.id);
      return {
        calmStateReference: profile?.calmStateReference ?? "",
        collapseModeEnabled: profile?.collapseModeEnabled ?? false,
      };
    }),
    saveCalmState: protectedProcedure.input(z.object({ reference: z.string().trim().max(4000) })).mutation(async ({ ctx, input }) => {
      await upsertUserProfile({ userId: ctx.user.id });
      await updateUserProfile(ctx.user.id, { calmStateReference: input.reference || null });
      return { success: true };
    }),
  }),

  read: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      const [days, items] = await Promise.all([
        db.select().from(readDays).where(eq(readDays.userId, ctx.user.id)).orderBy(desc(readDays.date)).limit(42),
        db.select().from(readItems).where(and(eq(readItems.userId, ctx.user.id), eq(readItems.status, "open"))).orderBy(desc(readItems.updatedAt)),
      ]);
      return { days, items };
    }),
    setDay: protectedProcedure.input(z.object({ date: dateSchema, color: z.enum(["gray", "orange", "green"]) })).mutation(async ({ ctx, input }) => {
      const db = await database();
      const existing = await db.select().from(readDays).where(and(eq(readDays.userId, ctx.user.id), eq(readDays.date, input.date))).limit(1);
      if (existing[0]) {
        await db.update(readDays).set({ color: input.color, source: "manual", updatedAt: now() }).where(eq(readDays.id, existing[0].id));
      } else {
        await db.insert(readDays).values({ userId: ctx.user.id, date: input.date, color: input.color, source: "manual", createdAt: now(), updatedAt: now() });
      }
      return { success: true };
    }),
    addItem: protectedProcedure.input(z.object({ list: z.enum(["now", "waiting", "later"]), title: textSchema, boundary: z.string().trim().max(1000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.insert(readItems).values({ userId: ctx.user.id, list: input.list, title: input.title, boundary: input.boundary || null, createdAt: now(), updatedAt: now() });
      return { success: true };
    }),
    moveItem: protectedProcedure.input(z.object({ id: z.number().int().positive(), list: z.enum(["now", "waiting", "later"]) })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.update(readItems).set({ list: input.list, updatedAt: now() }).where(and(eq(readItems.id, input.id), eq(readItems.userId, ctx.user.id)));
      return { success: true };
    }),
    completeItem: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.update(readItems).set({ status: "complete", updatedAt: now() }).where(and(eq(readItems.id, input.id), eq(readItems.userId, ctx.user.id)));
      return { success: true };
    }),
  }),

  ifThen: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      return db.select().from(ifThenPlans).where(eq(ifThenPlans.userId, ctx.user.id)).orderBy(desc(ifThenPlans.updatedAt));
    }),
    add: protectedProcedure.input(z.object({ ifSituation: textSchema, thenAction: textSchema })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.insert(ifThenPlans).values({ userId: ctx.user.id, ifSituation: input.ifSituation, thenAction: input.thenAction, createdAt: now(), updatedAt: now() });
      return { success: true };
    }),
  }),

  waiting: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      return db.select().from(waitingRegisterItems).where(and(eq(waitingRegisterItems.userId, ctx.user.id), eq(waitingRegisterItems.status, "waiting"))).orderBy(desc(waitingRegisterItems.updatedAt));
    }),
    add: protectedProcedure.input(z.object({ title: textSchema, waitingOn: z.string().trim().max(1000).optional(), boundary: z.string().trim().max(1000).optional(), followUpDate: dateSchema.optional() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.insert(waitingRegisterItems).values({ userId: ctx.user.id, title: input.title, waitingOn: input.waitingOn || null, boundary: input.boundary || null, followUpDate: input.followUpDate || null, createdAt: now(), updatedAt: now() });
      return { success: true };
    }),
    resolve: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["resolved", "released"]) })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.update(waitingRegisterItems).set({ status: input.status, updatedAt: now() }).where(and(eq(waitingRegisterItems.id, input.id), eq(waitingRegisterItems.userId, ctx.user.id)));
      return { success: true };
    }),
  }),

  thresholdPlans: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      return db.select().from(thresholdPlans).where(eq(thresholdPlans.userId, ctx.user.id)).orderBy(desc(thresholdPlans.createdAt)).limit(12);
    }),
    add: protectedProcedure.input(z.object({ task: textSchema, fork: z.enum(["fear", "activation", "physical_floor", "unclear"]), protection: z.string().trim().max(1000).optional(), smallestStart: textSchema })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.insert(thresholdPlans).values({ userId: ctx.user.id, ...input, protection: input.protection || null, createdAt: now() });
      return { success: true };
    }),
  }),

  court: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      return db.select().from(courtEntries).where(eq(courtEntries.userId, ctx.user.id)).orderBy(desc(courtEntries.createdAt)).limit(12);
    }),
    add: protectedProcedure.input(z.object({ situation: textSchema, evidenceFor: z.string().trim().max(2000).optional(), evidenceAgainst: z.string().trim().max(2000).optional(), fairRead: textSchema, nextAction: z.string().trim().max(1000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.insert(courtEntries).values({ userId: ctx.user.id, ...input, evidenceFor: input.evidenceFor || null, evidenceAgainst: input.evidenceAgainst || null, nextAction: input.nextAction || null, createdAt: now() });
      return { success: true };
    }),
  }),

  collapse: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      const [profile, active] = await Promise.all([
        getUserProfile(ctx.user.id),
        db.select().from(collapseCanaries).where(and(eq(collapseCanaries.userId, ctx.user.id), eq(collapseCanaries.status, "active"))).orderBy(desc(collapseCanaries.createdAt)).limit(1),
      ]);
      return { enabled: profile?.collapseModeEnabled ?? false, active: active[0] ?? null };
    }),
    setEnabled: protectedProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
      await upsertUserProfile({ userId: ctx.user.id });
      await updateUserProfile(ctx.user.id, { collapseModeEnabled: input.enabled, collapseModeUpdatedAt: now() });
      return { success: true };
    }),
    setCanary: protectedProcedure.input(z.object({ situation: textSchema, oneMove: textSchema })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.insert(collapseCanaries).values({ userId: ctx.user.id, situation: input.situation, oneMove: input.oneMove, createdAt: now() });
      return { success: true };
    }),
    resolveCanary: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.update(collapseCanaries).set({ status: "complete", resolvedAt: now() }).where(and(eq(collapseCanaries.id, input.id), eq(collapseCanaries.userId, ctx.user.id)));
      return { success: true };
    }),
  }),

  hyperfocus: router({
    record: protectedProcedure.input(z.object({ focusSessionId: z.number().int().positive().optional(), stage: z.enum(["notice", "body", "next", "close"]), note: z.string().trim().max(1000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.insert(hyperfocusExits).values({ userId: ctx.user.id, focusSessionId: input.focusSessionId ?? null, stage: input.stage, note: input.note || null, createdAt: now() });
      return { success: true };
    }),
  }),

  timeSense: router({
    recent: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      return db.select({ taskTitle: taskEstimates.taskTitle, estimateMinutes: taskEstimates.estimateMinutes, actualMinutes: taskEstimates.actualMinutes, completedAt: taskEstimates.completedAt })
        .from(taskEstimates)
        .where(eq(taskEstimates.userId, ctx.user.id))
        .orderBy(desc(taskEstimates.createdAt))
        .limit(12);
    }),
  }),
});
