/**
 * OAuth routes — replaced by Clerk session-cookie auth.
 * Clerk's hosted sign-in page sets the __session cookie directly;
 * no callback route is needed. This file is kept as a stub so imports
 * in server/_core/index.ts continue to compile without changes.
 */
import type { Express } from "express";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function registerOAuthRoutes(_app: Express): void {
  // No-op: Clerk handles authentication; no /api/oauth/callback route needed.
}
