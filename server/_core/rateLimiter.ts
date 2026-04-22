/**
 * Per-user in-memory rate limiter for LLM-backed procedures.
 *
 * Strategy: sliding window — track timestamps of recent calls per user.
 * Evict entries older than the window on each check.
 *
 * Defaults: 10 LLM calls per 60-second window per user.
 * This is generous enough for normal use but blocks runaway loops.
 */

import { TRPCError } from "@trpc/server";

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_CALLS = 10;     // per window per user

/**
 * Call this at the top of any LLM-backed mutation.
 * Throws TRPC TOO_MANY_REQUESTS if the user has exceeded the limit.
 */
export function checkLLMRateLimit(userId: string | number): void {
  const key = String(userId);
  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [] };

  // Evict timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t: number) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_CALLS) {
    store.set(key, entry);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `You've made ${MAX_CALLS} AI requests in the last minute. Please wait a moment before trying again.`,
    });
  }

  entry.timestamps.push(now);
  store.set(key, entry);
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
  checkLLMRateLimit(userId);
  const { invokeLLM } = await import("./llm");
  return invokeLLM(params);
}

/**
 * Periodically clean up the store to prevent unbounded memory growth.
 * Runs every 5 minutes and removes entries with no recent calls.
 */
setInterval(() => {
  const now = Date.now();
  for (const [userId, entry] of Array.from(store.entries())) {
    const recent = entry.timestamps.filter((t: number) => now - t < WINDOW_MS);
    if (recent.length === 0) {
      store.delete(userId);
    } else {
      store.set(userId, { timestamps: recent });
    }
  }
}, 5 * 60_000);
