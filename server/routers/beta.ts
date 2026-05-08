/**
 * Founding Member router — handles code redemption, cohort batching,
 * referral mechanic, and founding member status queries.
 *
 * Trial duration: FOUNDING_TRIAL_DAYS = 90
 * Cohorts: 25 members each; next cohort opens when previous hits day 14.
 * Referral: each founding member gets one referral code; both parties +30 days.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { betaCodes, users } from "../../drizzle/schema";
import { eq, and, isNull, lte, count } from "drizzle-orm";
import crypto from "crypto";

// ── Constants ─────────────────────────────────────────────────────────────────
export const FOUNDING_TRIAL_DAYS = 90;
const COHORT_SIZE = 25;
const COHORT_UNLOCK_DAYS = 14; // previous cohort must be this old before next opens
const REFERRAL_BONUS_DAYS = 30;
const MAX_COHORTS = 4;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Determine which cohort a new founding member should join (1–4), or null if waitlisted. */
async function assignCohort(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<number | null> {
  for (let cohort = 1; cohort <= MAX_COHORTS; cohort++) {
    // Count members already in this cohort
    const [{ value: cohortCount }] = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.foundingMemberCohort, cohort));

    if (cohortCount < COHORT_SIZE) {
      // Cohort has space — but is it open yet?
      if (cohort === 1) return 1; // Cohort 1 always open

      // Check if previous cohort has hit day 14
      const prevCohortRows = await db
        .select({ foundingMemberJoinedAt: users.foundingMemberJoinedAt })
        .from(users)
        .where(eq(users.foundingMemberCohort, cohort - 1))
        .limit(1);

      const prevJoined = prevCohortRows[0]?.foundingMemberJoinedAt;
      if (!prevJoined) return null; // Previous cohort not started yet

      const daysSincePrevCohort = (Date.now() - prevJoined.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePrevCohort >= COHORT_UNLOCK_DAYS) return cohort;

      return null; // Previous cohort hasn't hit day 14 yet — waitlist
    }
  }
  return null; // All cohorts full
}

/** Generate a unique referral code for a founding member. */
function generateReferralCode(userId: number): string {
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `FOUND-REF-${userId}-${rand}`;
}

// ── Router ────────────────────────────────────────────────────────────────────
export const betaRouter = {
  /** Redeem a founding member code. Assigns cohort, sets 90-day trial, generates referral code. */
  redeemCode: protectedProcedure
    .input(z.object({ code: z.string().min(1).max(64).toUpperCase() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Check if user already has a founding member trial
      if (ctx.user.isFoundingMember) {
        throw new TRPCError({ code: "CONFLICT", message: "You already have a founding member trial active." });
      }

      // Validate the code
      const rows = await db!.select().from(betaCodes).where(eq(betaCodes.code, input.code)).limit(1);
      const codeRow = rows[0];
      if (!codeRow) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid founding member code." });
      if (codeRow.usedBy) throw new TRPCError({ code: "CONFLICT", message: "This code has already been used." });

      // Assign cohort
      const cohort = await assignCohort(db!);
      if (cohort === null) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "All founding member cohorts are currently full or not yet open. You've been added to the waitlist.",
        });
      }

      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + FOUNDING_TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const referralCode = generateReferralCode(ctx.user.id);

      await db!.transaction(async (tx) => {
        await tx.update(betaCodes)
          .set({ usedBy: ctx.user.id, usedAt: now })
          .where(eq(betaCodes.id, codeRow.id));

        await tx.update(users).set({
          isBeta: true,
          betaExpiresAt: trialEndsAt,
          isPro: true,
          proSince: now,
          isFoundingMember: true,
          foundingMemberCohort: cohort,
          foundingMemberJoinedAt: now,
          trialEndsAt,
          referralCode,
        }).where(eq(users.id, ctx.user.id));
      });

      return { success: true, trialEndsAt, cohort, referralCode };
    }),

  /** Redeem a referral code from an existing founding member. Both parties get +30 days. */
  redeemReferral: protectedProcedure
    .input(z.object({ referralCode: z.string().min(1).max(64).toUpperCase() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      if (ctx.user.isFoundingMember) {
        throw new TRPCError({ code: "CONFLICT", message: "You already have a founding member trial." });
      }

      // Find the referrer
      const referrerRows = await db!
        .select()
        .from(users)
        .where(eq(users.referralCode, input.referralCode))
        .limit(1);
      const referrer = referrerRows[0];

      if (!referrer) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid referral code." });
      if (referrer.id === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot use your own referral code." });

      // Check referrer hasn't already referred someone (cap at 1)
      const referredCount = await db!
        .select({ value: count() })
        .from(users)
        .where(eq(users.referredBy, referrer.id));
      if (referredCount[0].value >= 1) {
        throw new TRPCError({ code: "CONFLICT", message: "This referral code has already been used." });
      }

      // Assign cohort for new member (same as referrer's cohort, or next available)
      const cohort = referrer.foundingMemberCohort ?? await assignCohort(db!);
      if (cohort === null) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No cohort slots available." });
      }

      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + (FOUNDING_TRIAL_DAYS + REFERRAL_BONUS_DAYS) * 24 * 60 * 60 * 1000);
      const newReferralCode = generateReferralCode(ctx.user.id);

      await db!.transaction(async (tx) => {
        // Set up new member
        await tx.update(users).set({
          isBeta: true,
          betaExpiresAt: trialEndsAt,
          isPro: true,
          proSince: now,
          isFoundingMember: true,
          foundingMemberCohort: cohort,
          foundingMemberJoinedAt: now,
          trialEndsAt,
          referredBy: referrer.id,
          referralBonusDays: REFERRAL_BONUS_DAYS,
          referralCode: newReferralCode,
        }).where(eq(users.id, ctx.user.id));

        // Extend referrer's trial by 30 days
        const referrerNewEndsAt = new Date(
          (referrer.trialEndsAt ?? referrer.betaExpiresAt ?? now).getTime() +
          REFERRAL_BONUS_DAYS * 24 * 60 * 60 * 1000
        );
        await tx.update(users).set({
          referralBonusDays: (referrer.referralBonusDays ?? 0) + REFERRAL_BONUS_DAYS,
          trialEndsAt: referrerNewEndsAt,
          betaExpiresAt: referrerNewEndsAt,
        }).where(eq(users.id, referrer.id));
      });

      return { success: true, trialEndsAt, bonusDays: REFERRAL_BONUS_DAYS };
    }),

  /** Get founding member status for the current user. */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const u = ctx.user;
    const now = new Date();
    const effectiveExpiry = u.trialEndsAt ?? u.betaExpiresAt;
    const isActiveTrial = !!(u.isFoundingMember && effectiveExpiry && effectiveExpiry > now);
    const isActiveBeta = !!(u.isBeta && effectiveExpiry && effectiveExpiry > now); // legacy compat

    const daysRemaining = isActiveTrial
      ? Math.ceil((effectiveExpiry!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const daysSinceJoined = u.foundingMemberJoinedAt
      ? Math.floor((now.getTime() - u.foundingMemberJoinedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      isBeta: u.isBeta ?? false,
      betaExpiresAt: effectiveExpiry ?? null,
      isActiveBeta,
      isFoundingMember: u.isFoundingMember ?? false,
      isActiveTrial,
      trialEndsAt: effectiveExpiry ?? null,
      daysRemaining,
      daysSinceJoined,
      cohort: u.foundingMemberCohort ?? null,
      referralCode: u.referralCode ?? null,
      referralBonusDays: u.referralBonusDays ?? 0,
      foundingRateLocked: u.foundingRateLocked ?? false,
      foundingTier: u.foundingTier ?? null,
    };
  }),

  listCodes: adminProcedure.query(async () => {
    const db = await getDb();
    return db!.select().from(betaCodes).orderBy(betaCodes.id);
  }),

  generateCodes: adminProcedure
    .input(z.object({ count: z.number().min(1).max(100), prefix: z.string().default("THREAD-BETA") }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const allCodes = await db!.select({ id: betaCodes.id }).from(betaCodes).orderBy(betaCodes.id);
      const start = (allCodes[allCodes.length - 1]?.id ?? 0) + 1;
      const newCodes = Array.from({ length: input.count }, (_, i) =>
        `${input.prefix}-${String(start + i).padStart(3, "0")}`
      );
      for (const code of newCodes) {
        await db!.insert(betaCodes).ignore().values({ code });
      }
      return { generated: newCodes.length, codes: newCodes };
    }),

  /** Admin: get cohort stats */
  getCohortStats: adminProcedure.query(async () => {
    const db = await getDb();
    const stats = [];
    for (let cohort = 1; cohort <= MAX_COHORTS; cohort++) {
      const [{ value: memberCount }] = await db!
        .select({ value: count() })
        .from(users)
        .where(eq(users.foundingMemberCohort, cohort));

      const firstMember = await db!
        .select({ foundingMemberJoinedAt: users.foundingMemberJoinedAt })
        .from(users)
        .where(eq(users.foundingMemberCohort, cohort))
        .limit(1);

      const joinedAt = firstMember[0]?.foundingMemberJoinedAt ?? null;
      const daysSinceOpen = joinedAt
        ? Math.floor((Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      stats.push({
        cohort,
        memberCount,
        capacity: COHORT_SIZE,
        spotsLeft: COHORT_SIZE - memberCount,
        firstJoinedAt: joinedAt,
        daysSinceOpen,
        isOpen: cohort === 1 || (daysSinceOpen !== null && daysSinceOpen >= COHORT_UNLOCK_DAYS),
      });
    }
    return stats;
  }),

  /** Admin: migrate existing beta users to founding member cohort 1 with 45-day extension */
  migrateBetaToFounding: adminProcedure.mutation(async () => {
    const db = await getDb();
    const now = new Date();

    // Find all beta users who are NOT yet founding members
    const legacyBetaUsers = await db!
      .select()
      .from(users)
      .where(and(eq(users.isBeta, true), eq(users.isFoundingMember, false)));

    let migrated = 0;
    for (const user of legacyBetaUsers) {
      const currentExpiry = user.betaExpiresAt ?? now;
      // Extend by 45 days (45 → 90 total from original join)
      const newExpiry = new Date(currentExpiry.getTime() + 45 * 24 * 60 * 60 * 1000);
      const joinedAt = user.proSince ?? user.createdAt ?? now;
      const referralCode = generateReferralCode(user.id);

      await db!.update(users).set({
        isFoundingMember: true,
        foundingMemberCohort: 1,
        foundingMemberJoinedAt: joinedAt,
        trialEndsAt: newExpiry,
        betaExpiresAt: newExpiry,
        referralCode,
      }).where(eq(users.id, user.id));

      migrated++;
    }

    return { migrated, message: `Migrated ${migrated} beta users to founding member cohort 1 with 45-day extension.` };
  }),
};
