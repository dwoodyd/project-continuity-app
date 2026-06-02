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
import { coworkingRouter } from "./routers/coworking";
import { groundModeRouter } from "./routers/groundMode";
import { getMemberCount } from "./db";
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
        // Tier fields — use these for feature gating instead of isPro boolean
        tier: u.tier ?? null,
        planKey: u.planKey ?? null,
        rateType: u.rateType ?? null,
        isKeeper: u.tier === "keeper",
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
      // Clerk handles session revocation via its own SDK.
      // Clear the legacy app_session_id cookie for any users who still have it.
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
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
  coworking: coworkingRouter,
  groundMode: groundModeRouter,
});

export type AppRouter = typeof appRouter;
