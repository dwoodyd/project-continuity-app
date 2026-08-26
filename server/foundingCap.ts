/**
 * Shared public founding-seat capacity.
 *
 * This is deliberately separate from manual-code/referral grants. The public
 * counter controls frictionless auto-admission, while personal invitations keep
 * working after the public founding allocation is full.
 */
import crypto from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { foundingSeatCapacity, users } from "../drizzle/schema";
import { getDb } from "./db";

const parsedCap = Number.parseInt(process.env.FOUNDING_CAP ?? "100", 10);
export const FOUNDING_CAP = Number.isSafeInteger(parsedCap) && parsedCap > 0 ? parsedCap : 100;
export const FOUNDING_TRIAL_DAYS = 90;

function makeReferralCode(userId: number) {
  return `FOUND-REF-${userId}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function affectedRows(result: unknown): number {
  const packet = Array.isArray(result) ? result[0] as { affectedRows?: number } : result as { affectedRows?: number };
  return packet?.affectedRows ?? 0;
}

/**
 * Atomically reserves one public founding seat and grants that user a 90-day
 * trial. The counter update is conditional, so concurrent first sign-ins cannot
 * claim more than FOUNDING_CAP public seats.
 */
export async function claimPublicFoundingSeat(userId: number): Promise<{ granted: boolean; full?: boolean; alreadyClaimed?: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async (tx) => {
    const current = await tx
      .select({ isFoundingMember: users.isFoundingMember, inviteCode: users.inviteCode })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (current[0]?.isFoundingMember || current[0]?.inviteCode) {
      return { granted: true, alreadyClaimed: true };
    }

    // Seed exactly once from the existing founding population. ON DUPLICATE KEY
    // leaves an already-reserved count untouched, avoiding a concurrent reset.
    await tx.execute(sql`
      INSERT INTO founding_seat_capacity (id, claimed)
      VALUES (1, LEAST((SELECT COUNT(*) FROM users WHERE isFoundingMember = true), ${FOUNDING_CAP}))
      ON DUPLICATE KEY UPDATE id = id
    `);

    const reservation = await tx.execute(sql`
      UPDATE founding_seat_capacity
      SET claimed = claimed + 1
      WHERE id = 1 AND claimed < ${FOUNDING_CAP}
    `);

    if (affectedRows(reservation) !== 1) {
      return { granted: false, full: true };
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + FOUNDING_TRIAL_DAYS * 24 * 60 * 60 * 1000);
    await tx.update(users).set({
      isBeta: true,
      betaExpiresAt: trialEndsAt,
      isPro: true,
      proSince: now,
      isFoundingMember: true,
      foundingMemberCohort: 1,
      foundingMemberJoinedAt: now,
      trialEndsAt,
      inviteCode: "AUTO-FOUNDING",
      referralCode: makeReferralCode(userId),
    }).where(and(eq(users.id, userId), eq(users.isFoundingMember, false)));

    return { granted: true };
  });
}
