import { z } from "zod";
import { getUserProfile, updateUserProfile, upsertUserProfile, deleteAllUserData } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

export const settingsRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const existing = await getUserProfile(ctx.user.id);
    if (existing) return existing;
    // Auto-create a default profile so tRPC never returns undefined
    await upsertUserProfile({ userId: ctx.user.id });
    return (await getUserProfile(ctx.user.id)) ?? {
      id: 0,
      userId: ctx.user.id,
      timezone: "America/New_York",
      tonePreference: "direct" as const,
      focusHoursStart: "09:00",
      focusHoursEnd: "17:00",
      morningCheckInTime: "08:00",
      middayCheckInTime: "12:00",
      eveningCheckInTime: "17:00",
      coldProjectThresholdDays: 5,
      weeklyReviewDay: "sunday" as const,
      fontSizePreference: "medium" as const,
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
      planningMode: false,
      workStyle: null,
      preferredFocusHours: "morning" as const,
      workTypes: null,
      distractionPatterns: null,
      primaryDistraction: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }),

  completeOnboarding: protectedProcedure
    .input(z.object({
      workTypes: z.array(z.string()),
      distractionPatterns: z.array(z.string()),
      focusHoursStart: z.string(),
      focusHoursEnd: z.string(),
      tonePreference: z.enum(["gentle", "direct", "firm"]),
      timezone: z.string().optional(),
      workStyle: z.enum(["writing_creative", "business_product", "ministry_coaching", "consulting_client", "multiple"]).optional(),
      preferredFocusHours: z.enum(["morning", "midday", "afternoon", "evening", "varies"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profileData: Record<string, unknown> = {
        workTypes: JSON.stringify(input.workTypes),
        distractionPatterns: JSON.stringify(input.distractionPatterns),
        focusHoursStart: input.focusHoursStart,
        focusHoursEnd: input.focusHoursEnd,
        tonePreference: input.tonePreference,
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
    .input(z.object({
      // Require the user to type "DELETE" as a confirmation safeguard
      confirmation: z.literal("DELETE"),
    }))
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
      tonePreference: z.enum(["gentle", "direct", "firm"]).optional(),
      focusHoursStart: z.string().optional(),
      focusHoursEnd: z.string().optional(),
      morningCheckInTime: z.string().optional(),
      middayCheckInTime: z.string().optional(),
      eveningCheckInTime: z.string().optional(),
      coldProjectThresholdDays: z.number().min(1).max(30).optional(),
      weeklyReviewDay: z.enum(["sunday", "saturday", "monday"]).optional(),
      fontSizePreference: z.enum(["small", "medium", "large"]).optional(),
      notificationsEnabled: z.boolean().optional(),
      morningNotifEnabled: z.boolean().optional(),
      middayNotifEnabled: z.boolean().optional(),
      eveningNotifEnabled: z.boolean().optional(),
      focusModeEnabled: z.boolean().optional(),
      driftDetectionEnabled: z.boolean().optional(),
      timezone: z.string().optional(),
      planningMode: z.boolean().optional(),
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
});
