import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import {
  upsertEvidenceSummary,
  getEvidenceSummaries,
  getEvidenceSummaryForMonth,
  getEvidenceStreakData,
  getDb,
} from "../db";
import { and, eq, gte, lte } from "drizzle-orm";
import { focusSessions, checkIns } from "../../drizzle/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns "YYYY-MM" for the current UTC month */
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Returns the start and end Date for a given "YYYY-MM" month string */
function monthBounds(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1)); // exclusive upper bound
  return { start, end };
}

/**
 * Compute evidence stats for a given user + month.
 * - sessionsStarted: total focus sessions in the month
 * - returnsAfterGap: sessions that started 48h+ after the previous session
 * - hardDaySessions: sessions on days where the morning check-in capacity was low (1-2)
 * - genuinePermissions: sessions where the user stopped at or before the timer (durationMinutes <= targetMinutes)
 */
export async function computeStats(userId: number, month: string) {
  const db = await getDb();
  if (!db) return { sessionsStarted: 0, returnsAfterGap: 0, hardDaySessions: 0, genuinePermissions: 0 };

  const { start, end } = monthBounds(month);

  // All focus sessions in the month, ordered by start time
  const sessions = await db
    .select()
    .from(focusSessions)
    .where(
      and(
        eq(focusSessions.userId, userId),
        gte(focusSessions.startedAt, start),
        lte(focusSessions.startedAt, end)
      )
    )
    .orderBy(focusSessions.startedAt);

  const sessionsStarted = sessions.length;

  // Returns after gap: session that starts 48h+ after the previous one
  let returnsAfterGap = 0;
  for (let i = 1; i < sessions.length; i++) {
    const gap = sessions[i].startedAt.getTime() - sessions[i - 1].startedAt.getTime();
    if (gap >= 48 * 60 * 60 * 1000) returnsAfterGap++;
  }

  // Hard-day sessions: sessions on days where morning check-in energyLevel <= 2
  const morningCheckIns = await db
    .select()
    .from(checkIns)
    .where(
      and(
        eq(checkIns.userId, userId),
        eq(checkIns.type, "morning"),
        gte(checkIns.createdAt, start),
        lte(checkIns.createdAt, end)
      )
    );

  // Hard days: check-ins where userInput JSON contains energyLevel <= 2
  const hardDays = new Set<string>();
  for (const ci of morningCheckIns) {
    try {
      const parsed = ci.userInput ? JSON.parse(ci.userInput) : {};
      const energy = parsed.energyLevel ?? parsed.capacity ?? 10;
      if (Number(energy) <= 2) hardDays.add(ci.date);
    } catch {
      // ignore malformed JSON
    }
  }
  let hardDaySessions = 0;
  for (const s of sessions) {
    const sessionDate = s.startedAt.toISOString().slice(0, 10);
    if (hardDays.has(sessionDate)) hardDaySessions++;
  }

  // Genuine permissions: sessions where durationSeconds <= 25 min * 60 (stopped at or near timer)
  let genuinePermissions = 0;
  for (const s of sessions) {
    const targetSeconds = 25 * 60; // default 25-min session
    const actual = s.durationSeconds ?? 0;
    if (actual > 0 && actual <= targetSeconds + 120) genuinePermissions++; // +2 min grace
  }

  return { sessionsStarted, returnsAfterGap, hardDaySessions, genuinePermissions };
}

/**
 * Ask the LLM to produce a single identity sentence from the stats.
 * The sentence should be factual, warm, and reframe the data as evidence
 * of who the user is — not what they produced.
 */
export async function generateIdentitySentence(
  month: string,
  stats: { sessionsStarted: number; returnsAfterGap: number; hardDaySessions: number; genuinePermissions: number }
): Promise<string> {
  const [y, m] = month.split("-").map(Number);
  const monthName = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  const prompt = `You are writing a single sentence for a person who struggles to start creative or meaningful work. The sentence should:
- Be factual, specific, and grounded in the numbers
- Reframe the data as identity evidence — not productivity metrics
- Be warm but not sentimental, honest but not clinical
- End with a period
- Be 20–35 words maximum
- NOT use the word "productivity", "output", "achievement", or "accomplished"
- NOT be motivational or inspirational in tone — just true

Month: ${monthName}
Sessions started: ${stats.sessionsStarted}
Returns after a gap of 48h or more: ${stats.returnsAfterGap}
Sessions on hard/low-energy days: ${stats.hardDaySessions}
Genuine permissions (stopped at the timer): ${stats.genuinePermissions}

Write only the single sentence. No preamble, no explanation.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You write precise, honest, identity-affirming sentences. You never over-promise or use inspirational language." },
      { role: "user", content: prompt },
    ],
  });

  const content = response?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    // Fallback sentence if LLM fails
    return `In ${monthName} you started ${stats.sessionsStarted} session${stats.sessionsStarted !== 1 ? "s" : ""} — that is who you are.`;
  }
  return (content as string).trim();
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const evidenceRouter = router({
  /** Get the last 6 months of evidence summaries for the current user */
  getMonthly: protectedProcedure.query(async ({ ctx }) => {
    return getEvidenceSummaries(ctx.user.id, 6);
  }),

  /** Get the current month's summary (may be null if not yet generated) */
  getCurrentMonth: protectedProcedure.query(async ({ ctx }) => {
    return getEvidenceSummaryForMonth(ctx.user.id, currentMonth());
  }),

  /** Compute stats + generate identity sentence for a given month, upsert result */
  generateSummary: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }))
    .mutation(async ({ ctx, input }) => {
      const month = input.month ?? currentMonth();
      const stats = await computeStats(ctx.user.id, month);

      if (stats.sessionsStarted === 0) {
        // No sessions — return a minimal summary without calling LLM
        return upsertEvidenceSummary({
          userId: ctx.user.id,
          month,
          ...stats,
          summaryLine: null,
        });
      }

      const summaryLine = await generateIdentitySentence(month, stats);
      return upsertEvidenceSummary({
        userId: ctx.user.id,
        month,
        ...stats,
        summaryLine,
      });
    }),

  /** Get 30-day session presence data for the heatmap */
  getStreakData: protectedProcedure.query(async ({ ctx }) => {
    return getEvidenceStreakData(ctx.user.id);
  }),
});
