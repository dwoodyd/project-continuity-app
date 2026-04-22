/**
 * Express routes for Google Calendar OAuth.
 *
 * GET  /api/calendar/connect   → redirects user to Google consent screen
 * GET  /api/calendar/callback  → exchanges code for tokens, stores in DB, redirects to app
 * POST /api/calendar/disconnect → deletes stored tokens (called via tRPC instead)
 */

import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import {
  getAuthUrl,
  decodeState,
  exchangeCodeForTokens,
  saveCalendarTokens,
} from "./googleCalendar";

export function registerCalendarRoutes(app: Express): void {
  // ── Connect: redirect to Google OAuth ──────────────────────────────────────
  app.get("/api/calendar/connect", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const origin = (req.headers["x-forwarded-proto"] ?? "https") + "://" + (req.headers["x-forwarded-host"] ?? req.headers.host);
      const url = getAuthUrl(user.id, origin);
      return res.redirect(url);
    } catch (err) {
      console.error("[Calendar] connect error:", err);
      return res.status(500).json({ error: "Failed to initiate calendar connection" });
    }
  });

  // ── Callback: exchange code, save tokens, redirect to app ──────────────────
  app.get("/api/calendar/callback", async (req: Request, res: Response) => {
    const { code, state, error } = req.query as Record<string, string>;

    if (error) {
      console.warn("[Calendar] OAuth error from Google:", error);
      return res.redirect("/?calendar_error=" + encodeURIComponent(error));
    }

    if (!code || !state) {
      return res.status(400).send("Missing code or state");
    }

    try {
      const { userId, origin } = decodeState(state);
      const redirectUri = `${origin}/api/calendar/callback`;
      const tokens = await exchangeCodeForTokens(code, redirectUri);
      await saveCalendarTokens(userId, tokens);
      console.log(`[Calendar] Connected calendar for user ${userId}`);
      return res.redirect("/settings?calendar_connected=1");
    } catch (err) {
      console.error("[Calendar] callback error:", err);
      return res.redirect("/settings?calendar_error=1");
    }
  });
}
