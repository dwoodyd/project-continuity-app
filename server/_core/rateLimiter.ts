/**
 * Per-user in-memory rate limiter for LLM-backed procedures.
 *
 * Two-layer protection:
 *
 * Layer 1 — Burst limiter (per-minute sliding window)
 *   Prevents runaway loops and rapid-fire abuse.
 *   Default: 10 LLM calls per 60-second window per user.
 *
 * Layer 2 — Daily cap (calendar-day counter)
 *   Hard ceiling on total AI calls per user per UTC day.
 *   Default: 100 calls/day per user.
 *   At 50% (50 calls) the owner receives a notification.
 *   At 100% the user is blocked for the rest of the day.
 *
 * Both layers use in-memory state. This is correct for a single-instance
 * deployment. For horizontal scaling, replace with a shared Redis store.
 */

import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./notification";

// ─── Layer 1: Burst limiter ───────────────────────────────────────────────────

interface WindowEntry {
  timestamps: number[];
}

const burstStore = new Map<string, WindowEntry>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_BURST  = 10;    // per window per user

// ─── Layer 2: Daily cap ───────────────────────────────────────────────────────

interface DailyEntry {
  date: string;   // UTC date string "YYYY-MM-DD"
  count: number;
  alertSent: boolean;
}

const dailyStore = new Map<string, DailyEntry>();

const DAILY_CAP   = 100; // hard ceiling per user per UTC day
const ALERT_AT    = 50;  // send owner notification at this threshold

function utcDateStr(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * Increment the daily counter for a user and enforce the hard cap.
 * Sends a one-time owner notification when the user crosses 50% of the cap.
 * Throws TOO_MANY_REQUESTS when the hard cap is reached.
 */
async function checkDailyCap(userId: string | number): Promise<void> {
  const key = String(userId);
  const today = utcDateStr();
  const entry = dailyStore.get(key);

  // Reset counter on new UTC day
  const current: DailyEntry =
    entry && entry.date === today
      ? entry
      : { date: today, count: 0, alertSent: false };

  current.count += 1;
  dailyStore.set(key, current);

  // Hard cap — block the request
  if (current.count > DAILY_CAP) {
    // Fire-and-forget owner alert on first over-cap hit
    if (current.count === DAILY_CAP + 1) {
      notifyOwner({
        title: "🚨 AI Daily Cap Hit",
        content: `User **${key}** has exceeded the daily AI cap of **${DAILY_CAP} calls** on ${today}. All further AI requests are blocked until midnight UTC.`,
      }).catch(() => {/* non-blocking */});
    }
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `You've reached the daily AI limit (${DAILY_CAP} requests). The limit resets at midnight UTC.`,
    });
  }

  // 50% alert — notify owner once per user per day
  if (current.count === ALERT_AT && !current.alertSent) {
    current.alertSent = true;
    notifyOwner({
      title: "⚠️ AI Usage Alert — 50% Daily Cap",
      content: `User **${key}** has made **${ALERT_AT}** AI calls today (${today}). Hard cap is ${DAILY_CAP}. No action needed yet — just a heads-up.`,
    }).catch(() => {/* non-blocking */});
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call this at the top of any LLM-backed mutation.
 * Enforces both the per-minute burst limit and the daily hard cap.
 * Throws TRPC TOO_MANY_REQUESTS if either limit is exceeded.
 *
 * NOTE: This function is synchronous for the burst check but async for the
 * daily cap (which fires a notification). Always await it.
 */
export async function checkLLMRateLimit(userId: string | number): Promise<void> {
  // Layer 1: burst check (synchronous)
  const key = String(userId);
  const now = Date.now();
  const entry = burstStore.get(key) ?? { timestamps: [] };

  entry.timestamps = entry.timestamps.filter((t: number) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_BURST) {
    burstStore.set(key, entry);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `You've made ${MAX_BURST} AI requests in the last minute. Please wait a moment before trying again.`,
    });
  }

  entry.timestamps.push(now);
  burstStore.set(key, entry);

  // Layer 2: daily cap (async — may send notification)
  await checkDailyCap(userId);
}

/**
 * Rate-limited wrapper around invokeLLM.
 * Use this for all user-triggered LLM calls so the rate limit is structurally enforced.
 * Background/cron paths that legitimately bypass the limit should import invokeLLM directly.
 */
export async function invokeLLMForUser(
  userId: string | number,
  params: Parameters<typeof import("./llm").invokeLLM>[0]
): Promise<ReturnType<typeof import("./llm").invokeLLM>> {
  await checkLLMRateLimit(userId);
  const { invokeLLM } = await import("./llm");
  return invokeLLM(params);
}

/**
 * Periodically clean up both stores to prevent unbounded memory growth.
 * Runs every 5 minutes.
 */
setInterval(() => {
  const now = Date.now();
  const today = utcDateStr();

  // Burst store: evict users with no recent calls
  for (const [userId, entry] of Array.from(burstStore.entries())) {
    const recent = entry.timestamps.filter((t: number) => now - t < WINDOW_MS);
    if (recent.length === 0) {
      burstStore.delete(userId);
    } else {
      burstStore.set(userId, { timestamps: recent });
    }
  }

  // Daily store: evict stale days
  for (const [userId, entry] of Array.from(dailyStore.entries())) {
    if (entry.date !== today) {
      dailyStore.delete(userId);
    }
  }
}, 5 * 60_000);
