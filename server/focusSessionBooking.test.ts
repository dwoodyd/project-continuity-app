import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (...parts: string[]) => readFileSync(resolve(process.cwd(), ...parts), "utf8");

describe("one-off booked Focus Sessions", () => {
  it("persists a durable, indexed, non-recurring booking record", () => {
    const schema = projectFile("drizzle", "schema.ts");
    expect(schema).toContain('mysqlTable("booked_focus_sessions"');
    expect(schema).toContain('scheduledFor: timestamp("scheduledFor").notNull()');
    expect(schema).toContain('status: mysqlEnum("status", ["scheduled", "cancelled", "started"])');
    expect(schema).toContain('index("booked_focus_sessions_due_idx")');
    expect(schema).not.toContain("recurrenceRule");
    expect(schema).not.toContain("seriesId");
  });

  it("keeps booking creation and launch Pro-gated, owned, and time-bounded", () => {
    const router = projectFile("server", "routers", "focusSessions.ts");
    expect(router).toContain("requireProFocusBookingAccess(ctx.user)");
    expect(router).toContain("createBooking: protectedProcedure");
    expect(router).toContain("cancelBooking: protectedProcedure");
    expect(router).toContain("getBookingForLaunch: protectedProcedure");
    expect(router).toContain("Choose a time at least one minute from now.");
    expect(router).toContain("This Focus Session is not ready to begin yet.");
    expect(router).toContain("eq(bookedFocusSessions.userId, ctx.user.id)");
    expect(router).toContain("bookingId: z.number().int().positive().optional()");
  });

  it("claims a due reminder once before sending a Wren push with a prefilled-session deep link", () => {
    const push = projectFile("server", "pushNotifications.ts");
    const bookedReminderStart = push.indexOf("async function sendDueBookedFocusSessionReminders");
    const reminderClaim = push.indexOf("claimBookedFocusSessionReminder(booking.id, userId)", bookedReminderStart);
    const bookedReminderSend = push.indexOf("webpush.sendNotification", reminderClaim);
    expect(push).toContain("getDueBookedFocusSessions(userId)");
    expect(push).toContain("claimBookedFocusSessionReminder(booking.id, userId)");
    expect(reminderClaim).toBeGreaterThan(bookedReminderStart);
    expect(reminderClaim).toBeLessThan(bookedReminderSend);
    expect(push).toContain("url: `/focus?bookingId=${booking.id}`");
    expect(push).toContain("Your Focus Session is ready.");
  });

  it("gives Pro members a one-off book-ahead control and leaves recurrence out of the product copy", () => {
    const page = projectFile("client", "src", "pages", "FocusSessionsPage.tsx");
    const pricing = projectFile("client", "src", "pages", "ProPage.tsx");
    expect(page).toContain("Book a session");
    expect(page).toContain("Book this Focus Session");
    expect(page).toContain("bookingId");
    expect(page).toContain("Book ahead when the moment is right.");
    expect(page).not.toContain("Repeat weekly");
    expect(page).not.toContain("recurring");
    expect(pricing).toContain("Focus Sessions — book ahead");
    expect(pricing).not.toContain("recurring sessions");
  });

  it("moves durable notification delivery to a cron-authenticated scheduled endpoint", () => {
    const entrypoint = projectFile("server", "_core", "index.ts");
    const sdk = projectFile("server", "_core", "sdk.ts");
    expect(entrypoint).toContain('app.post("/api/scheduled/notification-tick"');
    expect(entrypoint).toContain("await runNotificationCronTick()");
    expect(entrypoint).not.toContain("startNotificationCron();");
    expect(entrypoint).toContain('if (req.path.startsWith("/api/scheduled/")) return next()');
    expect(sdk).toContain('const CRON_OPEN_ID_PREFIX = "cron_"');
    expect(sdk).toContain('if (req.path.startsWith("/api/scheduled/"))');
    expect(sdk).toContain("const userInfo = await this.getUserInfoWithJwt(sessionCookie)");
    expect(sdk).toContain("Invalid cron session cookie");
    expect(sdk).toContain("if (!userInfo.taskUid) throw ForbiddenError");
  });
});
