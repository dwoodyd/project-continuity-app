/**
 * tRPC router for Google Calendar integration.
 *
 * Procedures:
 *  calendar.getConnectUrl  → returns the Google OAuth URL for the current user
 *  calendar.getStatus      → returns whether calendar is connected + event preview
 *  calendar.disconnect     → removes stored tokens
 *  calendar.getWeekEvents  → returns this week's events for the UI preview strip
 */

import { protectedProcedure, router } from "../_core/trpc";
import {
  getAuthUrl,
  getCalendarTokens,
  disconnectCalendar,
  getWeekEvents,
} from "../googleCalendar";
import { z } from "zod";

export const calendarRouter = router({
  // Returns the Google OAuth URL; frontend opens it in the same tab
  getConnectUrl: protectedProcedure
    .input(z.object({ origin: z.string() }))
    .query(async ({ ctx, input }) => {
      const url = getAuthUrl(ctx.user.id, input.origin);
      return { url };
    }),

  // Returns whether the user has a connected calendar
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const tokens = await getCalendarTokens(ctx.user.id);
    return {
      connected: !!tokens,
      connectedAt: tokens?.connectedAt ?? null,
    };
  }),

  // Removes stored tokens
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await disconnectCalendar(ctx.user.id);
    return { success: true };
  }),

  // Returns this week's events for the UI preview strip
  getWeekEvents: protectedProcedure.query(async ({ ctx }) => {
    const events = await getWeekEvents(ctx.user.id);
    return { events: events ?? [], connected: events !== null };
  }),
});
