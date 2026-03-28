import { z } from "zod";
import { getUserProfile, updateUserProfile, upsertUserProfile } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const settingsRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return getUserProfile(ctx.user.id);
  }),

  completeOnboarding: protectedProcedure
    .input(z.object({
      workTypes: z.array(z.string()),
      distractionPatterns: z.array(z.string()),
      focusHoursStart: z.string(),
      focusHoursEnd: z.string(),
      tonePreference: z.enum(["gentle", "direct", "firm"]),
      timezone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getUserProfile(ctx.user.id);
      if (existing) {
        await updateUserProfile(ctx.user.id, {
          workTypes: JSON.stringify(input.workTypes),
          distractionPatterns: JSON.stringify(input.distractionPatterns),
          focusHoursStart: input.focusHoursStart,
          focusHoursEnd: input.focusHoursEnd,
          tonePreference: input.tonePreference,
          timezone: input.timezone ?? "America/New_York",
          onboardingCompleted: true,
        });
      } else {
        await upsertUserProfile({
          userId: ctx.user.id,
          workTypes: JSON.stringify(input.workTypes),
          distractionPatterns: JSON.stringify(input.distractionPatterns),
          focusHoursStart: input.focusHoursStart,
          focusHoursEnd: input.focusHoursEnd,
          tonePreference: input.tonePreference,
          timezone: input.timezone ?? "America/New_York",
          onboardingCompleted: true,
        });
      }
      return { success: true };
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
      timezone: z.string().optional(),
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
