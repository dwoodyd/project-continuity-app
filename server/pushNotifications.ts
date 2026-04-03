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
  getPushSubscriptionsForUser,
  deletePushSubscription,
  logNotificationSent,
  getRecentNotificationLog,
  getUserProfile,
  getCheckIns,
} from "./db";

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

// ── Time helpers ──────────────────────────────────────────────────────────────
function getNowInTimezone(tz: string): { hour: number; minute: number; dateStr: string } {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour12: false,
    }).formatToParts(now);

    const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? "0");
    const hour = get("hour") % 24;
    const minute = get("minute");
    const year = get("year");
    const month = get("month");
    const day = get("day");
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { hour, minute, dateStr };
  } catch {
    // Fallback to UTC
    const now = new Date();
    return {
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
      dateStr: now.toISOString().slice(0, 10),
    };
  }
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
  const hasMorning = todayCheckIns.some((c: { type: string }) => c.type === "morning");
  const hasMidday = todayCheckIns.some((c: { type: string }) => c.type === "midday");
  const hasEvening = todayCheckIns.some((c: { type: string }) => c.type === "evening");

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

  for (const entry of types) {
    if (!entry.enabled) continue;
    if (entry.alreadyDone) continue;
    if (entry.time.hour !== hour || entry.time.minute !== minute) continue;

    // Check suppression: don't send if already sent in last 23h
    const recent = await getRecentNotificationLog(userId, entry.type, SUPPRESSION_WINDOW_MS);
    if (recent.length > 0) continue;

    await sendPushToUser(userId, entry.type, entry.rot);
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
