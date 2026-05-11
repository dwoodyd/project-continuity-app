import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { projectsRouter } from "./routers/projects";
import { vaultRouter } from "./routers/vault";
import { checkInsRouter } from "./routers/checkIns";
import { aiRouter } from "./routers/ai";
import { settingsRouter } from "./routers/settings";
import { dailyPlanRouter } from "./routers/dailyPlan";
import { focusSessionsRouter } from "./routers/focusSessions";
import { intelligenceRouter } from "./routers/intelligence";
import { notificationsRouter } from "./routers/notifications";
import { frictionRouter } from "./routers/friction";
import { intelligenceInsightsRouter } from "./routers/intelligenceInsights";
import { clarityRouter } from "./routers/clarity";
import { invitesRouter } from "./routers/invites";
import { thresholdRouter } from "./routers/threshold";
import { evidenceRouter } from "./routers/evidence";
import { studyRouter } from "./routers/study";
import { feedbackRouter } from "./routers/feedback";
import { gamificationRouter } from "./routers/gamification";
import { paypalRouter } from "./routers/paypal";
import { betaRouter } from "./routers/beta";
import { scratchPadRouter } from "./routers/scratchPad";
import { waitlistRouter } from "./routers/waitlist";
import { voiceRouter } from "./routers/voice";
import { calendarRouter } from "./routers/calendar";
import { workspaceRouter } from "./routers/workspace";
import { moodLogsRouter } from "./routers/moodLogs";
import { applicationsRouter } from "./routers/applications";
import { revokeSession, getMemberCount } from "./db";
import { protectedProcedure } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      const u = opts.ctx.user;
      if (!u) return null;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        // Expose only a boolean — the raw code value is never needed by the frontend
        hasRedeemedInvite: u.inviteCode !== null,
        isPro: u.isPro ?? false,
        proSince: u.proSince ?? null,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastSignedIn: u.lastSignedIn,
        // Founding member fields
        isFoundingMember: u.isFoundingMember ?? false,
        foundingMemberCohort: u.foundingMemberCohort ?? null,
        foundingMemberJoinedAt: u.foundingMemberJoinedAt ?? null,
        trialEndsAt: u.trialEndsAt ?? null,
        foundingRateLocked: u.foundingRateLocked ?? false,
        referralCode: u.referralCode ?? null,
      };
    }),
    memberCount: publicProcedure.query(async () => {
      return { count: await getMemberCount() };
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      // Server-side session revocation: add jti to the blacklist so the JWT
      // cannot be replayed even if the cookie is somehow retained.
      if (ctx.user && ctx.sessionJti && ctx.sessionExp) {
        await revokeSession(
          ctx.sessionJti,
          ctx.user.id,
          new Date(ctx.sessionExp * 1000)
        ).catch(() => {
          // Non-fatal: cookie is already cleared; revocation is defence-in-depth
        });
      }
      return { success: true } as const;
    }),
  }),
  projects: projectsRouter,
  vault: vaultRouter,
  checkIns: checkInsRouter,
  ai: aiRouter,
  settings: settingsRouter,
  dailyPlan: dailyPlanRouter,
  focusSessions: focusSessionsRouter,
  intelligence: intelligenceRouter,
  notifications: notificationsRouter,
  friction: frictionRouter,
  insights: intelligenceInsightsRouter,
  clarity: clarityRouter,
  invites: invitesRouter,
  threshold: thresholdRouter,
  evidence: evidenceRouter,
  study: studyRouter,
  feedback: feedbackRouter,
  gamification: gamificationRouter,
  paypal: paypalRouter,
  beta: betaRouter,
  scratchPad: scratchPadRouter,
  waitlist: waitlistRouter,
  voice: voiceRouter,
  calendar: calendarRouter,
  workspace: workspaceRouter,
  moodLogs: moodLogsRouter,
  applications: applicationsRouter,
});

export type AppRouter = typeof appRouter;
