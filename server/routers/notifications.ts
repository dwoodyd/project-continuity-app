import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  upsertPushSubscription,
  deletePushSubscription,
  getPushSubscriptionsForUser,
  getUserProfile,
  updateUserProfile,
} from "../db";

/**
 * Allowlist of known Web Push service domains.
 * Endpoints from outside this list are rejected to prevent abuse.
 * Sources: Chrome (FCM), Firefox (Mozilla), Safari (Apple), Edge (Windows).
 */
export const ALLOWED_PUSH_ENDPOINT_HOSTS = new Set([
  "fcm.googleapis.com",          // Chrome / Android (Google FCM)
  "updates.push.services.mozilla.com", // Firefox
  "push.services.mozilla.com",   // Firefox (alternate)
  "notify.windows.com",          // Edge / Windows
  "web.push.apple.com",          // Safari (macOS / iOS)
  "api.push.apple.com",          // Safari (alternate)
]);

function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && ALLOWED_PUSH_ENDPOINT_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export const notificationsRouter = router({
  /**
   * Register a Web Push subscription for the current user.
   * Called from the client after Notification.requestPermission() succeeds.
   */
  registerPush: protectedProcedure
    .input(z.object({
      endpoint: z.string().url(),
      p256dh: z.string(),
      auth: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate that the push endpoint comes from a known push service.
      // This prevents abuse where an attacker registers an arbitrary URL
      // as a "push endpoint" and receives notification payloads.
      if (!isAllowedPushEndpoint(input.endpoint)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Push endpoint domain is not from a recognised push service.",
        });
      }
      await upsertPushSubscription({
        userId: ctx.user.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      });
      return { success: true };
    }),

  /**
   * Unregister a specific push subscription (e.g. on logout or settings toggle).
   */
  unregisterPush: protectedProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deletePushSubscription(ctx.user.id, input.endpoint);
      return { success: true };
    }),

  /**
   * Check whether the current user has any active push subscriptions.
   */
  getPushStatus: protectedProcedure.query(async ({ ctx }) => {
    const subs = await getPushSubscriptionsForUser(ctx.user.id);
    return { registered: subs.length > 0, count: subs.length };
  }),

  /**
   * Get the current user's notification schedule settings.
   */
  getSchedule: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserProfile(ctx.user.id);
    return {
      notificationsEnabled: profile?.notificationsEnabled ?? true,
      morningEnabled: profile?.morningNotifEnabled ?? true,
      morningTime: profile?.morningCheckInTime ?? "08:00",
      middayEnabled: profile?.middayNotifEnabled ?? true,
      middayTime: profile?.middayCheckInTime ?? "12:00",
      eveningEnabled: profile?.eveningNotifEnabled ?? true,
      eveningTime: profile?.eveningCheckInTime ?? "17:00",
      timezone: profile?.timezone ?? "America/New_York",
    };
  }),

  /**
   * Update the notification schedule for the current user.
   */
  updateSchedule: protectedProcedure
    .input(z.object({
      notificationsEnabled: z.boolean().optional(),
      morningEnabled: z.boolean().optional(),
      morningTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      middayEnabled: z.boolean().optional(),
      middayTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      eveningEnabled: z.boolean().optional(),
      eveningTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      timezone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {};
      if (input.notificationsEnabled !== undefined) updates.notificationsEnabled = input.notificationsEnabled;
      if (input.morningEnabled !== undefined) updates.morningNotifEnabled = input.morningEnabled;
      if (input.morningTime !== undefined) updates.morningCheckInTime = input.morningTime;
      if (input.middayEnabled !== undefined) updates.middayNotifEnabled = input.middayEnabled;
      if (input.middayTime !== undefined) updates.middayCheckInTime = input.middayTime;
      if (input.eveningEnabled !== undefined) updates.eveningNotifEnabled = input.eveningEnabled;
      if (input.eveningTime !== undefined) updates.eveningCheckInTime = input.eveningTime;
      if (input.timezone !== undefined) updates.timezone = input.timezone;
      await updateUserProfile(ctx.user.id, updates as any);
      return { success: true };
    }),
});
