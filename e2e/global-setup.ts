/**
 * Playwright global setup — runs once before all test files.
 *
 * Responsibilities:
 *  1. Seed a deterministic E2E test user into the database.
 *  2. Mint a signed JWT session cookie for that user.
 *  3. Write the cookie value to a shared fixture file so individual
 *     tests can inject it without repeating auth logic.
 *
 * The test user uses a stable openId so repeated runs are idempotent
 * (upsertUser is a no-op when the user already exists).
 */

import { SignJWT } from "jose";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const E2E_OPEN_ID = "e2e-test-user-checkin-smoke";
export const E2E_NAME    = "E2E Test User";
export const COOKIE_NAME = "app_session_id";
export const FIXTURE_PATH = path.join(__dirname, ".auth-state.json");

async function getJwtSecret(): Promise<Uint8Array> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET env var is required for E2E setup");
  return new TextEncoder().encode(secret);
}

async function mintSessionCookie(): Promise<string> {
  const secretKey = await getJwtSecret();
  const appId     = process.env.VITE_APP_ID ?? "";
  const jti       = randomUUID();
  const exp       = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour

  return new SignJWT({ openId: E2E_OPEN_ID, appId, name: E2E_NAME })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(exp)
    .setJti(jti)
    .sign(secretKey);
}

async function seedTestUser(): Promise<void> {
  // Dynamically import server-side DB helpers so we share the real connection pool.
  const { getDb, upsertUser, upsertUserProfile } = await import("../server/db.js");
  const { users } = await import("../drizzle/schema.js");
  const { eq } = await import("drizzle-orm");

  // Upsert the base user record
  await upsertUser({
    openId:      E2E_OPEN_ID,
    name:        E2E_NAME,
    lastSignedIn: new Date(),
  });

  // Promote to admin + set inviteCode so the invite gate is bypassed.
  // Admin role skips the invite-gate redirect in AppLayout.
  const db = await getDb();
  if (db) {
    await db
      .update(users)
      .set({ role: "admin", inviteCode: "e2e-bypass" })
      .where(eq(users.openId, E2E_OPEN_ID));

    // Fetch the numeric id for profile upsert
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.openId, E2E_OPEN_ID))
      .limit(1);

    if (rows[0]) {
      // Seed a minimal profile so AppLayout doesn't redirect to /about-app or /onboarding
      // and doesn't show the AI consent modal.
      await upsertUserProfile({
        userId:             rows[0].id,
        onboardingCompleted: true,
        seenAbout:          true,
        aiConsentGiven:     true,
      });
    }
  }
}

export default async function globalSetup() {
  await seedTestUser();

  const cookieValue = await mintSessionCookie();

  // Persist the Playwright storageState-compatible auth fixture so tests can
  // call `use: { storageState: FIXTURE_PATH }` without re-authenticating.
  const authState = {
    cookies: [
      {
        name:     COOKIE_NAME,
        value:    cookieValue,
        domain:   "localhost",
        path:     "/",
        httpOnly: true,
        secure:   false,
        sameSite: "Lax" as const,
        expires:  Math.floor(Date.now() / 1000) + 3600,
      },
    ],
    origins: [],
  };

  await fs.writeFile(FIXTURE_PATH, JSON.stringify(authState, null, 2));
  console.log("[E2E Setup] Test user seeded and auth state written to", FIXTURE_PATH);
}
