import { COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import type { Request } from "express";
import { createClerkClient, getAuth } from "@clerk/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";

// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

// Clerk client — reads CLERK_SECRET_KEY from env automatically
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// ─── Legacy types kept for backward compatibility ──────────────────────────
// These are no longer used internally but may be referenced by tests or
// external code that imports from sdk.ts.
export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

export type VerifiedSession = {
  openId: string;
  appId: string;
  name: string;
  jti: string;
  exp: number;
};

class SDKServer {
  /**
   * Authenticates the request using Clerk's session cookie.
   * Reads the Clerk __session cookie via getAuth(req), fetches the user profile
   * from Clerk, upserts a local users row, and returns the local User.
   *
   * Throws ForbiddenError if the request is unauthenticated.
   */
  async authenticateRequest(
    req: Request
  ): Promise<User & { _sessionJti: string; _sessionExp: number }> {
    // getAuth reads Clerk's __session cookie from the request
    const auth = getAuth(req);

    if (!auth.userId) {
      throw ForbiddenError("Not authenticated");
    }

    const clerkUserId = auth.userId;

    // Fetch profile from Clerk (name, email)
    let clerkUser: { firstName?: string | null; lastName?: string | null; emailAddresses?: Array<{ emailAddress: string }> } | null = null;
    try {
      clerkUser = await clerkClient.users.getUser(clerkUserId);
    } catch (err) {
      console.warn("[Auth] Failed to fetch Clerk user profile:", err);
    }

    const name = clerkUser
      ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null
      : null;
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? null;

    // Upsert local users row — openId is the Clerk userId
    const signedInAt = new Date();
    await db.upsertUser({
      openId: clerkUserId,
      name,
      email,
      loginMethod: "clerk",
      lastSignedIn: signedInAt,
    });

    const user = await db.getUserByOpenId(clerkUserId);
    if (!user) {
      throw ForbiddenError("User not found after upsert");
    }

    // Clerk handles session revocation — no jti needed.
    // We attach sentinel values so the TrpcContext shape stays compatible.
    return Object.assign(user, {
      _sessionJti: `clerk:${clerkUserId}`,
      _sessionExp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    });
  }
}

export const sdk = new SDKServer();
