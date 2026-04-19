/**
 * Playwright global teardown — runs once after all test files.
 *
 * Cleans up:
 *  - The .auth-state.json fixture file (contains a short-lived JWT, but tidy is good).
 *  - All check-in rows created by the E2E test user today, so re-runs start clean.
 *    (The user row itself is left in place — upsertUser on next run is idempotent.)
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURE_PATH = path.join(__dirname, ".auth-state.json");

export default async function globalTeardown() {
  // Remove today's check-ins for the E2E user so the next run starts fresh.
  try {
    const { getDb } = await import("../server/db.js");
    const { checkIns, users } = await import("../drizzle/schema.js");
      const { eq, and } = await import("drizzle-orm");

    const db = await getDb();
    if (db) {
      // Find the numeric user id for our test openId
      const { E2E_OPEN_ID } = await import("./global-setup.js");
      const userRows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.openId, E2E_OPEN_ID))
        .limit(1);

      if (userRows[0]) {
        const today = new Date().toISOString().split("T")[0]!;
        await db
          .delete(checkIns)
          .where(
            and(
              eq(checkIns.userId, userRows[0].id),
              eq(checkIns.date, today)
            )
          );
        console.log("[E2E Teardown] Today's check-ins deleted for test user.");
      }
    }
  } catch (err) {
    // Non-fatal — log but don't fail the suite
    console.warn("[E2E Teardown] Could not clean check-ins:", err);
  }

  // Remove the auth fixture
  try {
    await fs.unlink(FIXTURE_PATH);
  } catch {
    // Already gone — fine
  }

  console.log("[E2E Teardown] Complete.");
}
