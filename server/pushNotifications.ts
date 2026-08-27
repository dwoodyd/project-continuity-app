/**
 * Server-side push notification scheduling for Continuary.
 *
 * Architecture:
 * - VAPID keys are generated once and stored as env vars.
 * - A cron runs every minute, checks which users have a check-in due
 *   in the current minute (in their local timezone), and fires a push
 *   if they haven't already received one in the last 23 hours and
 *   haven't completed that check-in today.
 * - Message copy rotates through calm, grounded variants.
 */

import webpush from "web-push";
import {
  getAllUsersWithPushSubscriptions,
  getDueBookedFocusSessions,
  getPushSubscriptionsForUser,
  claimBookedFocusSessionReminder,
  deletePushSubscription,
  logNotificationSent,
  getRecentNotificationLog,
  getUserProfile,
  getCheckIns,
  getColdProjects,
  getWeeklyThreadData,
  getDb,
} from "./db";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getNowInTimezone } from "./utils/dateUtils";

// ── VAPID configuration ───────────────────────────────────────────────────────
function initVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:hello@continuary.app";

  if (!publicKey || !privateKey) {
    console.warn("[Push] VAPID keys not configured — push notifications disabled.");
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

// ── Message rotation pools ────────────────────────────────────────────────────
const MESSAGES = {
  morning: [
    { title: "Good morning.", body: "Your day is ready. Morning check-in is open." },
    { title: "A new day.", body: "Take a moment to set your direction before it sets itself." },
    { title: "Morning check-in.", body: "Three minutes now saves hours of drift later." },
    { title: "Before the noise starts.", body: "Your morning check-in is waiting." },
  ],
  midday: [
    { title: "Midday check-in.", body: "Still on track? A quick pause helps." },
    { title: "Halfway through.", body: "Check in and recalibrate if needed." },
    { title: "Midday.", body: "How's the day going? Your check-in is open." },
    { title: "A brief pause.", body: "Midday check-in is ready when you are." },
  ],
  evening: [
    { title: "Close the day.", body: "While the work is still near." },
    { title: "Evening check-in.", body: "A few minutes to close the loop." },
    { title: "End of day.", body: "Capture what happened before it fades." },
    { title: "Before you step away.", body: "Your evening check-in is open." },
  ],
} as const;

function pickMessage(
  type: "morning" | "midday" | "evening",
  rotation: number
): { title: string; body: string } {
  const pool = MESSAGES[type];
  return pool[rotation % pool.length];
}

function parseTime(t: string): { hour: number; minute: number } {
  const [h, m] = (t ?? "09:00").split(":").map(Number);
  return { hour: h ?? 9, minute: m ?? 0 };
}

// ── Core send function ────────────────────────────────────────────────────────
async function sendPushToUser(
  userId: number,
  type: "morning" | "midday" | "evening",
  rotation: number
): Promise<void> {
  const subs = await getPushSubscriptionsForUser(userId);
  if (!subs.length) return;

  const { title, body } = pickMessage(type, rotation);
  const payload = JSON.stringify({
    title,
    body,
    tag: `${type}-checkin`,
    url: "/",
    type,
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  // Remove expired/invalid subscriptions (410 Gone)
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      const err = result.reason as { statusCode?: number };
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await deletePushSubscription(userId, subs[i].endpoint);
      }
    }
  }

  // Log the send
  await logNotificationSent({ userId, type });
}

async function sendDueBookedFocusSessionReminders(userId: number): Promise<void> {
  const dueBookings = await getDueBookedFocusSessions(userId);
  if (!dueBookings.length) return;

  const subscriptions = await getPushSubscriptionsForUser(userId);
  if (!subscriptions.length) return;

  for (const booking of dueBookings) {
    // Marking the reminder first is the idempotency gate: parallel cron handlers
    // cannot send the same booked-session push twice.
    const claimed = await claimBookedFocusSessionReminder(booking.id, userId);
    if (!claimed) continue;

    const payload = JSON.stringify({
      title: "Your Focus Session is ready.",
      body: booking.intention
        ? `Wren is here to sit with you while you ${booking.intention}.`
        : "Wren is here when you are ready to begin.",
      tag: `booked-focus-session-${booking.id}`,
      url: `/focus?bookingId=${booking.id}`,
      type: "booked_focus_session",
    });

    const results = await Promise.allSettled(
      subscriptions.map((subscription) =>
        webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          payload,
        ),
      ),
    );

    for (let index = 0; index < results.length; index++) {
      const result = results[index];
      if (result.status !== "rejected") continue;
      const error = result.reason as { statusCode?: number };
      if (error?.statusCode === 410 || error?.statusCode === 404) {
        await deletePushSubscription(userId, subscriptions[index].endpoint);
      }
    }
  }
}

// ── Backoff state for DB failures ────────────────────────────────────────────
let _consecutiveDbFailures = 0;
const MAX_BACKOFF_TICKS = 5; // skip up to 5 consecutive ticks (~5 min) after DB failure

// ── Main cron tick ────────────────────────────────────────────────────────────
export async function runNotificationCronTick(): Promise<void> {
  const vapidReady = initVapid();
  if (!vapidReady) return;

  // If DB has been failing repeatedly, back off to avoid log spam
  if (_consecutiveDbFailures > 0 && _consecutiveDbFailures <= MAX_BACKOFF_TICKS) {
    _consecutiveDbFailures++;
    if (_consecutiveDbFailures > MAX_BACKOFF_TICKS) _consecutiveDbFailures = 0;
    return;
  }

  let userIds: number[];
  try {
    userIds = await getAllUsersWithPushSubscriptions();
  } catch (err) {
    _consecutiveDbFailures++;
    // Only log once per backoff window to avoid console spam
    if (_consecutiveDbFailures === 1) {
      console.warn("[Push] DB unavailable — backing off push cron:", (err as Error).message);
    }
    return;
  }

  // DB is healthy — reset failure counter
  _consecutiveDbFailures = 0;

  if (!userIds.length) return;

  await Promise.allSettled(userIds.map((userId) => processUserNotifications(userId)));
}

async function processUserNotifications(userId: number): Promise<void> {
  let profile;
  try {
    profile = await getUserProfile(userId);
  } catch (err) {
    console.warn(`[Push] Failed to load profile for user ${userId}:`, (err as Error).message);
    return;
  }
  if (!profile) return;
  if (!profile.notificationsEnabled) return;

  try {
    await sendDueBookedFocusSessionReminders(userId);
  } catch (error) {
    console.warn(`[Push] Booked Focus Session reminder check failed for user ${userId}:`, (error as Error).message);
  }

  const tz = profile.timezone ?? "America/New_York";
  const { hour, minute, dateStr } = getNowInTimezone(tz);

  // Parse rotation state
  let rotation: { morning: number; midday: number; evening: number } = {
    morning: 0, midday: 0, evening: 0,
  };
  try {
    if (profile.notifMessageRotation) {
      rotation = JSON.parse(profile.notifMessageRotation);
    }
  } catch {}

  // Get today's check-ins to suppress if already done
  const todayCheckIns = await getCheckIns(userId, dateStr);
  const hasMorning = todayCheckIns.some((c: { type: string; completedAt?: Date | null }) => c.type === "morning" && c.completedAt != null);
  const hasMidday = todayCheckIns.some((c: { type: string; completedAt?: Date | null }) => c.type === "midday" && c.completedAt != null);
  const hasEvening = todayCheckIns.some((c: { type: string; completedAt?: Date | null }) => c.type === "evening" && c.completedAt != null);

  const SUPPRESSION_WINDOW_MS = 23 * 60 * 60 * 1000; // 23 hours

  const types = [
    {
      type: "morning" as const,
      enabled: profile.morningNotifEnabled !== false,
      time: parseTime(profile.morningCheckInTime ?? "08:00"),
      alreadyDone: hasMorning,
      rot: rotation.morning,
    },
    {
      type: "midday" as const,
      enabled: profile.middayNotifEnabled !== false,
      time: parseTime(profile.middayCheckInTime ?? "12:00"),
      alreadyDone: hasMidday,
      rot: rotation.midday,
    },
    {
      type: "evening" as const,
      enabled: profile.eveningNotifEnabled !== false,
      time: parseTime(profile.eveningCheckInTime ?? "17:00"),
      alreadyDone: hasEvening,
      rot: rotation.evening,
    },
  ];

  // Convert current local time to total minutes-since-midnight for window comparison
  const nowTotalMinutes = hour * 60 + minute;

  for (const entry of types) {
    if (!entry.enabled) continue;
    if (entry.alreadyDone) continue;
    // Fire if the cron tick lands within a ±2-minute window of the scheduled time.
    // This tolerates event-loop jitter, GC pauses, and backoff ticks without
    // requiring exact-minute equality.
    const scheduledTotal = entry.time.hour * 60 + entry.time.minute;
    const drift = Math.abs(nowTotalMinutes - scheduledTotal);
    if (drift > 2) continue;

    // Check suppression: don't send if already sent in last 23h
    const recent = await getRecentNotificationLog(userId, entry.type, SUPPRESSION_WINDOW_MS);
    if (recent.length > 0) continue;

    await sendPushToUser(userId, entry.type, entry.rot);
  }

  // ── Thread thinning nudge — fires at morning if avg strength < 33% ──────────
  try {
    const threadData = await getWeeklyThreadData(userId);
    const activeDays = threadData.filter((d) => d.morning || d.midday || d.evening);
    if (activeDays.length >= 3) {
      const avg = activeDays.reduce((s, d) => s + d.strength, 0) / activeDays.length;
      if (avg < 33) {
        const recentThin = await getRecentNotificationLog(userId, "thread_thinning", 23 * 60 * 60 * 1000);
        if (recentThin.length === 0) {
          const subs = await getPushSubscriptionsForUser(userId);
          if (subs.length > 0) {
            const payload = JSON.stringify({
              title: "Your thread is thinning.",
              body: "A midday or evening check-in takes 30 seconds. Keep the thread warm.",
              tag: "thread-thinning",
              url: "/",
            });
            await Promise.allSettled(
              subs.map((sub) =>
                webpush.sendNotification(
                  { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                  payload
                )
              )
            );
            await logNotificationSent({ userId, type: "thread_thinning" });
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[Push] Thread thinning check failed for user ${userId}:`, (err as Error).message);
  }

  // ── Cold project nudge — fires once per day at morning check-in time ────────
  const morningTime = parseTime(profile.morningCheckInTime ?? "08:00");
  if (hour === morningTime.hour && minute === morningTime.minute) {
    try {
      const coldThreshold = profile.coldProjectThresholdDays ?? 5;
      const coldProjects = await getColdProjects(userId, coldThreshold);
      if (coldProjects.length > 0) {
        const recentCold = await getRecentNotificationLog(userId, "cold_project", 23 * 60 * 60 * 1000);
        if (recentCold.length === 0) {
          const project = coldProjects[0];
          const subs = await getPushSubscriptionsForUser(userId);
          if (subs.length > 0) {
            const payload = JSON.stringify({
              title: "A project is going cold.",
              body: `"${project.title}" hasn't moved in ${coldThreshold}+ days. Worth a look?`,
              tag: "cold-project",
              url: "/projects",
            });
            await Promise.allSettled(
              subs.map((sub) =>
                webpush.sendNotification(
                  { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                  payload
                )
              )
            );
            await logNotificationSent({ userId, type: "cold_project" });
          }
        }
      }
    } catch (err) {
      console.warn(`[Push] Cold project check failed for user ${userId}:`, (err as Error).message);
    }
  }

  // ── Founding Member push ladder — 5 touchpoints over the 90-day trial ────────
  // Day 1 (activation), Day 30 (milestone), Day 83 (7 days left),
  // Day 87 (3 days left), Day 90 (final CTA)
  if (hour === morningTime.hour && minute === morningTime.minute) {
    try {
      const db = await getDb();
      if (db) {
        const [userRow] = await db.select({
          isBeta: users.isBeta,
          betaExpiresAt: users.betaExpiresAt,
          isFoundingMember: users.isFoundingMember,
          foundingMemberJoinedAt: users.foundingMemberJoinedAt,
          trialEndsAt: users.trialEndsAt,
        }).from(users).where(eq(users.id, userId)).limit(1);

        const effectiveExpiry = userRow?.trialEndsAt ?? userRow?.betaExpiresAt;
        const joinedAt = userRow?.foundingMemberJoinedAt;
        const isActive = (userRow?.isFoundingMember || userRow?.isBeta) && effectiveExpiry;

        if (isActive && effectiveExpiry && joinedAt) {
          const daysLeft = Math.ceil((effectiveExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          const daysSinceJoined = Math.floor((Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24));

          type PushMsg = { title: string; body: string; tag: string };
          // Day-since-joined triggers
          const dayTriggers: Record<number, PushMsg> = {
            1: {
              title: "Wren is waiting.",
              body: "Three minutes for your first ritual. Your thread starts today.",
              tag: "founding-day1",
            },
            30: {
              title: "One month in.",
              body: "You’re building something real. Your founding rate is still waiting for you.",
              tag: "founding-day30",
            },
          };
          // Days-left triggers
          const daysLeftTriggers: Record<number, PushMsg> = {
            7: {
              title: "7 days left. Lock in your founding rate.",
              body: "Your 90-day founding window closes soon. Secure your rate for life.",
              tag: "founding-7days",
            },
            3: {
              title: "3 days. We’ve loved building this with you.",
              body: "Lock in your founding rate before your trial ends.",
              tag: "founding-3days",
            },
            0: {
              title: "Today’s the day. Keep going.",
              body: "Your founding member trial ends today. Convert now to keep your thread.",
              tag: "founding-day90",
            },
          };

          const msg = dayTriggers[daysSinceJoined] ?? daysLeftTriggers[daysLeft];
          if (msg) {
            const recentBeta = await getRecentNotificationLog(userId, "beta_expiry", 23 * 60 * 60 * 1000);
            if (recentBeta.length === 0) {
              const subs = await getPushSubscriptionsForUser(userId);
              if (subs.length > 0) {
                const payload = JSON.stringify({
                  title: msg.title,
                  body: msg.body,
                  tag: msg.tag,
                  url: "/founding-member",
                });
                await Promise.allSettled(
                  subs.map((sub) =>
                    webpush.sendNotification(
                      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                      payload
                    )
                  )
                );
                await logNotificationSent({ userId, type: "beta_expiry" });
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[Push] Founding member push check failed for user ${userId}:`, (err as Error).message);
    }
  }
}
// ── Scheduler ────────────────────────────────────────────────────────────────
let cronHandle: ReturnType<typeof setInterval> | null = null;

export function startNotificationCron(): void {
  if (cronHandle) return; // already running
  console.log("[Push] Notification cron started — checking every 60s");
  // Align to the next whole minute, then tick every 60s
  const now = new Date();
  const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
  setTimeout(() => {
    runNotificationCronTick().catch(console.error);
    cronHandle = setInterval(() => {
      runNotificationCronTick().catch(console.error);
    }, 60_000);
  }, msToNextMinute);
}

export function stopNotificationCron(): void {
  if (cronHandle) {
    clearInterval(cronHandle);
    cronHandle = null;
  }
}
