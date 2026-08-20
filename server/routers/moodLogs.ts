import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { upsertMoodLog, getMoodHistory, getTodayMoodLog } from "../db";
import { resolveDate } from "../utils/dateUtils";

// ─── Cycle analysis helpers ───────────────────────────────────────────────────
// Finds local maxima (peaks) and minima (troughs) in a score series.
// A peak is a point higher than its two neighbours; a trough is lower.
function findPeaksAndTroughs(scores: { date: string; score: number }[]) {
  const peaks: { date: string; score: number; index: number }[] = [];
  const troughs: { date: string; score: number; index: number }[] = [];
  for (let i = 1; i < scores.length - 1; i++) {
    const prev = scores[i - 1]!.score;
    const curr = scores[i]!.score;
    const next = scores[i + 1]!.score;
    if (curr > prev && curr > next) peaks.push({ ...scores[i]!, index: i });
    if (curr < prev && curr < next) troughs.push({ ...scores[i]!, index: i });
  }
  return { peaks, troughs };
}

// Average days between consecutive peaks (or troughs) — the cycle length.
function avgCycleLength(points: { date: string }[]): number | null {
  if (points.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = new Date(points[i - 1]!.date).getTime();
    const b = new Date(points[i]!.date).getTime();
    gaps.push((b - a) / (1000 * 60 * 60 * 24));
  }
  return Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
}

// Given cycle length and last peak date, advance to the next future occurrence.
function predictNext(lastDate: string, cycleDays: number): string {
  const d = new Date(`${lastDate}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  do {
    d.setDate(d.getDate() + cycleDays);
  } while (d < today);
  return d.toISOString().split("T")[0]!;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const moodLogsRouter = router({
  /** Upsert today's mood score (1–10) with an optional note */
  logToday: protectedProcedure
    .input(z.object({
      score: z.number().int().min(1).max(10),
      note: z.string().max(500).optional(),
      // Client passes its local YYYY-MM-DD to avoid UTC/local midnight mismatch
      localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const today = resolveDate(input.localDate);
      return upsertMoodLog(ctx.user.id, today, input.score, input.note);
    }),

  /** Get today's log (null if not yet logged) */
  getToday: protectedProcedure
    .input(z.object({
      localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return getTodayMoodLog(ctx.user.id, resolveDate(input?.localDate));
    }),

  /** Get last N days of mood history */
  getHistory: protectedProcedure
    .input(z.object({ days: z.number().int().min(7).max(365).default(90) }))
    .query(async ({ ctx, input }) => {
      return getMoodHistory(ctx.user.id, input.days);
    }),

  /** Analyse cycle length, detect current phase, predict next high/low */
  getCycleAnalysis: protectedProcedure.query(async ({ ctx }) => {
    const history = await getMoodHistory(ctx.user.id, 120);
    if (history.length < 7) {
      return { hasEnoughData: false, cycleDays: null, currentPhase: null, nextHighDate: null, nextLowDate: null, message: "Keep logging — after about 2 weeks you'll start to see your rhythm." };
    }

    const scores = history.map(h => ({ date: h.date, score: h.score }));
    const { peaks, troughs } = findPeaksAndTroughs(scores);

    const cycleDays = peaks.length >= 2 ? avgCycleLength(peaks) : troughs.length >= 2 ? avgCycleLength(troughs) : 35; // Hersey default

    // Current phase: last 3-day average vs overall average
    const recent = scores.slice(-3).map(s => s.score);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const overallAvg = scores.reduce((a, s) => a + s.score, 0) / scores.length;
    const currentPhase: "high" | "neutral" | "low" =
      recentAvg >= overallAvg + 1.5 ? "high" :
      recentAvg <= overallAvg - 1.5 ? "low" : "neutral";

    // Predict next high and low
    const lastPeak = peaks.at(-1);
    const lastTrough = troughs.at(-1);
    const nextHighDate = lastPeak && cycleDays ? predictNext(lastPeak.date, cycleDays) : null;
    const nextLowDate = lastTrough && cycleDays ? predictNext(lastTrough.date, cycleDays) : null;

    // Wren commentary
    const message =
      currentPhase === "high"
        ? "You're in a high period. Great for deep work — but think twice before making big promises or commitments."
        : currentPhase === "low"
        ? "You're in a low period. This will pass — it always does. Keep showing up in small ways."
        : "You're in a neutral phase, moving between a high and a low. Steady, consistent work is your superpower right now.";

    return { hasEnoughData: true, cycleDays, currentPhase, nextHighDate, nextLowDate, message, peakCount: peaks.length, troughCount: troughs.length };
  }),
});
