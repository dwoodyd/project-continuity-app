/**
 * Single source of truth for founding slot counts.
 * Both the tRPC procedure (founding.slots) and the public REST endpoint
 * (/api/public/founding-slots) share this cache and query.
 */
import { countFoundingSeatsClaimed } from "./db";
import { FOUNDING_CAP } from "./foundingCap";

export const TOTAL_SEATS = FOUNDING_CAP;
const TTL_MS = 45_000;

let cache: { claimed: number; remaining: number; at: number } | null = null;

export async function getFoundingSlots(): Promise<{ total: number; claimed: number; remaining: number }> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return { total: TOTAL_SEATS, claimed: cache.claimed, remaining: cache.remaining };
  }
  const claimed = Math.min(await countFoundingSeatsClaimed(), TOTAL_SEATS);
  const remaining = Math.max(0, TOTAL_SEATS - claimed);
  cache = { claimed, remaining, at: Date.now() };
  return { total: TOTAL_SEATS, claimed, remaining };
}

/** Clears the short-lived public count after a successful auto-admission. */
export function invalidateFoundingSlots() {
  cache = null;
}
