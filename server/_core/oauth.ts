import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { notifyOwner } from "./notification";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Check if this is a brand-new user (no row yet)
      const existingUser = await db.getUserByOpenId(userInfo.openId);
      const isNewUser = !existingUser;

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // Fire a one-time welcome notification to the owner when a new user signs up
      if (isNewUser) {
        const freshUser = await db.getUserByOpenId(userInfo.openId);
        if (freshUser && !freshUser.welcomeNotified) {
          try {
            await notifyOwner({
              title: "New Continuary user joined",
              content: `${userInfo.name || "Someone"} (${userInfo.email || userInfo.openId}) just signed in for the first time via ${userInfo.loginMethod ?? userInfo.platform ?? "OAuth"}.`,
            });
            await db.markWelcomeNotified(freshUser.id);
          } catch (notifErr) {
            // Non-fatal: log but don't block the login
            console.warn("[OAuth] Welcome notification failed:", notifErr);
          }
        }
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error: any) {
      const detail = error?.response?.data ?? error?.message ?? String(error);
      console.error("[OAuth] Callback failed", JSON.stringify(detail));
      // Redirect to a user-friendly error page instead of showing raw JSON
      res.redirect(302, `/?auth_error=${encodeURIComponent("Sign-in failed. Please try again.")}`);
    }
  });
}
