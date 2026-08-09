import { publicProcedure, router } from "../_core/trpc";
import { countFoundingSeatsClaimed } from "../db";

const TOTAL_SEATS = 100;
const TTL_MS = 45_000;

let cache: { remaining: number; claimed: number; at: number } | null = null;

export const foundingRouter = router({
  slots: publicProcedure.query(async () => {
    if (cache && Date.now() - cache.at < TTL_MS) {
      return { total: TOTAL_SEATS, claimed: cache.claimed, remaining: cache.remaining };
    }
    const claimed = Math.min(await countFoundingSeatsClaimed(), TOTAL_SEATS);
    const remaining = Math.max(0, TOTAL_SEATS - claimed);
    cache = { claimed, remaining, at: Date.now() };
    return { total: TOTAL_SEATS, claimed, remaining };
  }),
});

