import { and, eq, gte, like, sql } from "drizzle-orm";
import { getDb } from "../db";
import { checkIns, continuityEvents, focusSessions, users } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";

const TRIAL_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;

/**
 * A conversion invitation is earned only after a member has experienced at
 * least one meaningful Continuary outcome. This deliberately does not change
 * the entitlement of any free or return surface.
 */
export const conversionRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const now = new Date();
    if (!db) return { hasActivated: false, isEligibleForUpgrade: false, trialEndsAt: null, trialClosing: false };

    const [[checkInCount], [completedFocusCount], [returnCount], [membership]] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(checkIns).where(eq(checkIns.userId, ctx.user.id)),
      db.select({ count: sql<number>`count(*)` }).from(focusSessions).where(and(eq(focusSessions.userId, ctx.user.id), eq(focusSessions.wasCompleted, 1))),
      db.select({ count: sql<number>`count(*)` }).from(continuityEvents).where(and(eq(continuityEvents.userId, ctx.user.id), like(continuityEvents.eventType, "return_%"))),
      db.select({ trialEndsAt: users.trialEndsAt }).from(users).where(eq(users.id, ctx.user.id)).limit(1),
    ]);

    const hasActivated = Number(checkInCount?.count ?? 0) >= 3 || Number(completedFocusCount?.count ?? 0) >= 1 || Number(returnCount?.count ?? 0) >= 1;
    const trialEndsAt = membership?.trialEndsAt ?? null;
    const trialClosing = Boolean(trialEndsAt && trialEndsAt.getTime() > now.getTime() && trialEndsAt.getTime() - now.getTime() <= TRIAL_WINDOW_MS);
    const hasPaidAccess = ctx.user.isPro || ctx.user.role === "admin";

    return { hasActivated, isEligibleForUpgrade: hasActivated && !hasPaidAccess, trialEndsAt, trialClosing };
  }),
});
