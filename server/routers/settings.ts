import { z } from "zod";
import {
  getUserProfile, updateUserProfile, upsertUserProfile, deleteAllUserData,
  getProjects, getSourceItems, getRecentCheckIns, getRecentDailyPlans,
  getIdeaCaptures, getRecentFocusSessions, updateUserName,
  getRecentDecisions, getMoodHistory, deleteDecision,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

export const settingsRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const existing = await getUserProfile(ctx.user.id);
    if (existing) return existing;
    await upsertUserProfile({ userId: ctx.user.id });
    return (await getUserProfile(ctx.user.id)) ?? {
      id: 0,
      userId: ctx.user.id,
      timezone: "America/New_York",
      timezoneDetectedAt: null,
      tonePreference: "direct" as const,
      focusHoursStart: "09:00",
      focusHoursEnd: "17:00",
      morningCheckInTime: "08:00",
      middayCheckInTime: "12:00",
      eveningCheckInTime: "17:00",
      coldProjectThresholdDays: 5,
      weeklyReviewDay: "sunday" as const,
      fontSizePreference: "medium" as const,
      dashboardLayout: null,
      reducedVisualNoise: false,
      notificationsEnabled: true,
      morningNotifEnabled: true,
      middayNotifEnabled: true,
      eveningNotifEnabled: true,
      coldProjectNotifEnabled: true,
      sanctuaryNotifEnabled: true,
      notifMessageRotation: null,
      focusModeEnabled: true,
      driftDetectionEnabled: true,
      onboardingCompleted: false,
      firstEngagementInviteSeen: false,
      planningMode: false,
      seenAbout: false,
      aiConsentGiven: false,
      workStyle: null,
      preferredFocusHours: "morning" as const,
      workTypes: null,
      distractionPatterns: null,
      primaryDistraction: null,
      onboardingAbVariant: null,
      hasSeenWrenIntro: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }),

  completeOnboarding: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100).optional(),
      workTypes: z.array(z.string().max(100)),
      distractionPatterns: z.array(z.string().max(200)),
      focusHoursStart: z.string().max(10),
      focusHoursEnd: z.string().max(10),
      wrenGentleDirect: z.number().int().min(0).max(100),
      wrenBriefThorough: z.number().int().min(0).max(100),
      wrenCalmEnergizing: z.number().int().min(0).max(100),
      wrenFollowsChallenges: z.number().int().min(0).max(100),
      wrenDefaultMode: z.enum(["doing", "reflecting", "grounding"]),
      timezone: z.string().max(50).optional(),
      workStyle: z.string().max(500).optional(),
      preferredFocusHours: z.enum(["morning", "midday", "afternoon", "evening", "varies"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.name?.trim()) {
        await updateUserName(ctx.user.id, input.name.trim());
      }
      const profileData: Record<string, unknown> = {
        workTypes: JSON.stringify(input.workTypes),
        distractionPatterns: JSON.stringify(input.distractionPatterns),
        focusHoursStart: input.focusHoursStart,
        focusHoursEnd: input.focusHoursEnd,
        wrenGentleDirect: input.wrenGentleDirect,
        wrenBriefThorough: input.wrenBriefThorough,
        wrenCalmEnergizing: input.wrenCalmEnergizing,
        wrenFollowsChallenges: input.wrenFollowsChallenges,
        wrenDefaultMode: input.wrenDefaultMode,
        timezone: input.timezone ?? "America/New_York",
        onboardingCompleted: true,
      };
      if (input.workStyle) profileData.workStyle = input.workStyle;
      if (input.preferredFocusHours) profileData.preferredFocusHours = input.preferredFocusHours;
      const existing = await getUserProfile(ctx.user.id);
      if (existing) {
        await updateUserProfile(ctx.user.id, profileData as any);
      } else {
        await upsertUserProfile({ userId: ctx.user.id, ...profileData } as any);
      }
      return { success: true };
    }),

  deleteAccount: protectedProcedure
    .input(z.object({ confirmation: z.literal("DELETE") }))
    .mutation(async ({ ctx }) => {
      try {
        await deleteAllUserData(ctx.user.id);
        return { success: true };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Account deletion failed. Please try again or contact support.",
          cause: err,
        });
      }
    }),

  updateSettings: protectedProcedure
    .input(z.object({
      focusHoursStart: z.string().max(10).optional(),
      focusHoursEnd: z.string().max(10).optional(),
      morningCheckInTime: z.string().max(10).optional(),
      middayCheckInTime: z.string().max(10).optional(),
      eveningCheckInTime: z.string().max(10).optional(),
      coldProjectThresholdDays: z.number().min(1).max(30).optional(),
      weeklyReviewDay: z.enum(["sunday", "saturday", "monday"]).optional(),
      fontSizePreference: z.enum(["small", "medium", "large"]).optional(),
      reducedVisualNoise: z.boolean().optional(),
      notificationsEnabled: z.boolean().optional(),
      morningNotifEnabled: z.boolean().optional(),
      middayNotifEnabled: z.boolean().optional(),
      eveningNotifEnabled: z.boolean().optional(),
      focusModeEnabled: z.boolean().optional(),
      driftDetectionEnabled: z.boolean().optional(),
      planningMode: z.boolean().optional(),
      timezone: z.string().max(50).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getUserProfile(ctx.user.id);
      if (existing) {
        await updateUserProfile(ctx.user.id, input as any);
      } else {
        await upsertUserProfile({ userId: ctx.user.id, ...input } as any);
      }
      return { success: true };
    }),

  captureTimezone: protectedProcedure
    .input(z.object({ timezone: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      try {
        Intl.DateTimeFormat("en-US", { timeZone: input.timezone }).format();
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid timezone." });
      }
      const existing = await getUserProfile(ctx.user.id);
      // Settings changes remain authoritative once we have recorded initial detection.
      if (existing?.timezoneDetectedAt) return { timezone: existing.timezone, captured: false };
      const data = { timezone: input.timezone, timezoneDetectedAt: new Date() };
      if (existing) await updateUserProfile(ctx.user.id, data as any);
      else await upsertUserProfile({ userId: ctx.user.id, ...data } as any);
      return { timezone: input.timezone, captured: true };
    }),

  dismissFirstEngagementInvite: protectedProcedure
    .mutation(async ({ ctx }) => {
      const existing = await getUserProfile(ctx.user.id);
      if (existing) await updateUserProfile(ctx.user.id, { firstEngagementInviteSeen: true } as any);
      else await upsertUserProfile({ userId: ctx.user.id, firstEngagementInviteSeen: true } as any);
      return { success: true };
    }),

  // ── Dashboard presentation ──────────────────────────────────────────────────
  getDashboardLayout: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserProfile(ctx.user.id);
    if (!profile?.dashboardLayout) return null;
    try {
      const parsed = JSON.parse(profile.dashboardLayout);
      return {
        hidden: Array.isArray(parsed.hidden) ? parsed.hidden.filter((key: unknown) => typeof key === "string") : [],
        order: Array.isArray(parsed.order) ? parsed.order.filter((key: unknown) => typeof key === "string") : [],
      };
    } catch {
      return null;
    }
  }),

  updateDashboardLayout: protectedProcedure
    .input(z.object({
      hidden: z.array(z.string().min(1).max(80)).max(24),
      order: z.array(z.string().min(1).max(80)).max(24),
    }))
    .mutation(async ({ ctx, input }) => {
      const dashboardLayout = JSON.stringify({ hidden: input.hidden, order: input.order });
      const existing = await getUserProfile(ctx.user.id);
      if (existing) {
        await updateUserProfile(ctx.user.id, { dashboardLayout } as any);
      } else {
        await upsertUserProfile({ userId: ctx.user.id, dashboardLayout } as any);
      }
      return { success: true };
    }),

  setOnboardingAbVariant: protectedProcedure
    .input(z.object({ variant: z.enum(["A", "B"]) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getUserProfile(ctx.user.id);
      if (existing) {
        await updateUserProfile(ctx.user.id, { onboardingAbVariant: input.variant } as any);
      } else {
        await upsertUserProfile({ userId: ctx.user.id, onboardingAbVariant: input.variant } as any);
      }
      return { success: true };
    }),

  markWrenIntroSeen: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getUserProfile(ctx.user.id);
    if (existing) {
      await updateUserProfile(ctx.user.id, { hasSeenWrenIntro: true } as any);
    } else {
      await upsertUserProfile({ userId: ctx.user.id, hasSeenWrenIntro: true } as any);
    }
    return { success: true };
  }),

  markAboutSeen: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getUserProfile(ctx.user.id);
    if (existing) {
      await updateUserProfile(ctx.user.id, { seenAbout: true });
    } else {
      await upsertUserProfile({ userId: ctx.user.id, seenAbout: true });
    }
    return { success: true };
  }),

  // ── App Store 5.1.2(i): AI data transparency consent ─────────────────────────
  giveAiConsent: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getUserProfile(ctx.user.id);
    if (existing) {
      await updateUserProfile(ctx.user.id, { aiConsentGiven: true });
    } else {
      await upsertUserProfile({ userId: ctx.user.id, aiConsentGiven: true });
    }
    return { success: true };
  }),

  revokeAiConsent: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getUserProfile(ctx.user.id);
    if (existing) {
      await updateUserProfile(ctx.user.id, { aiConsentGiven: false });
    } else {
      await upsertUserProfile({ userId: ctx.user.id, aiConsentGiven: false });
    }
    return { success: true };
  }),

  // ── What Wren Remembers ───────────────────────────────────────────────────────
  getMemorySnapshot: protectedProcedure.query(async ({ ctx }) => {
    const uid = ctx.user.id;
    const [profile, checkIns, decisions, moodLogs] = await Promise.all([
      getUserProfile(uid),
      getRecentCheckIns(uid, 5),
      getRecentDecisions(uid, 10),
      getMoodHistory(uid, 7),
    ]);
    return {
      workStyle: profile?.workStyle ?? null,
      workTypes: profile?.workTypes ? JSON.parse(profile.workTypes) as string[] : [],
      distractionPatterns: profile?.distractionPatterns ? JSON.parse(profile.distractionPatterns) as string[] : [],
      focusHoursStart: profile?.focusHoursStart ?? null,
      focusHoursEnd: profile?.focusHoursEnd ?? null,
      preferredFocusHours: profile?.preferredFocusHours ?? null,
      readingBridgeChapter: profile?.readingBridgeChapter ?? null,
      recentCheckInNotes: checkIns
        .filter(c => !!c.userInput)
        .slice(0, 5)
        .map(c => ({ date: c.date, note: c.userInput ?? "" })),
      recentDecisions: decisions.slice(0, 10).map(d => ({ id: d.id, content: d.content, date: d.date?.toISOString().slice(0, 10) ?? "" })),
      recentMoodLogs: moodLogs.slice(0, 7).map(m => ({ date: m.date, score: m.score, note: m.note ?? null })),
    };
  }),

  forgetMemoryItem: protectedProcedure
    .input(z.object({
      type: z.enum(["decision"]),
      id: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.type === "decision") {
        await deleteDecision(input.id, ctx.user.id);
      }
      return { success: true };
    }),

  // ── Wren Tone Dials ───────────────────────────────────────────────────────────
  getWrenTone: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserProfile(ctx.user.id);
    return {
      wrenGentleDirect: profile?.wrenGentleDirect ?? 50,
      wrenBriefThorough: profile?.wrenBriefThorough ?? 50,
      wrenCalmEnergizing: profile?.wrenCalmEnergizing ?? 50,
      wrenFollowsChallenges: profile?.wrenFollowsChallenges ?? 50,
      wrenDefaultMode: (profile?.wrenDefaultMode ?? "reflecting") as "doing" | "reflecting" | "grounding",
    };
  }),

  updateWrenTone: protectedProcedure
    .input(
      z.object({
        wrenGentleDirect: z.number().int().min(0).max(100),
        wrenBriefThorough: z.number().int().min(0).max(100),
        wrenCalmEnergizing: z.number().int().min(0).max(100),
        wrenFollowsChallenges: z.number().int().min(0).max(100),
        wrenDefaultMode: z.enum(["doing", "reflecting", "grounding"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await getUserProfile(ctx.user.id);
      if (existing) {
        await updateUserProfile(ctx.user.id, input as any);
      } else {
        await upsertUserProfile({ userId: ctx.user.id, ...input } as any);
      }
      return { success: true };
    }),

  // ── Wren Memory Pause ─────────────────────────────────────────────────────────
  getWrenMemoryPaused: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserProfile(ctx.user.id);
    return { paused: profile?.wrenMemoryPaused ?? false };
  }),

  setWrenMemoryPaused: protectedProcedure
    .input(z.object({ paused: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getUserProfile(ctx.user.id);
      if (existing) {
        await updateUserProfile(ctx.user.id, { wrenMemoryPaused: input.paused } as any);
      } else {
        await upsertUserProfile({ userId: ctx.user.id, wrenMemoryPaused: input.paused } as any);
      }
      return { success: true };
    }),

  // ── Data export (GDPR Art. 20 portability) ────────────────────────────────────
  exportData: protectedProcedure.query(async ({ ctx }) => {
    const uid = ctx.user.id;
    const [profile, projects, vaultItems, checkIns, dailyPlans, ideas, focusSessions] =
      await Promise.all([
        getUserProfile(uid),
        getProjects(uid),
        getSourceItems(uid),
        getRecentCheckIns(uid, 500),
        getRecentDailyPlans(uid, 365),
        getIdeaCaptures(uid),
        getRecentFocusSessions(uid, 500),
      ]);
    return {
      exportedAt: new Date().toISOString(),
      profile,
      projects,
      vaultItems,
      checkIns,
      dailyPlans,
      ideas,
      focusSessions,
    };
  }),
});
