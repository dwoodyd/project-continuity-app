/**
 * Google Calendar OAuth + API helpers for Continuary.
 *
 * Flow:
 *  1. getAuthUrl(userId, origin) → redirect user to Google consent screen
 *  2. handleCallback(code, state) → exchange code for tokens, store in DB
 *  3. getWeekEvents(userId) → fetch this week's events (auto-refreshes token)
 *  4. disconnectCalendar(userId) → delete stored tokens
 */

import { getDb } from "./db";
import { googleCalendarTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

// Timeout-aware fetch for all Google API calls
async function googleFetch(url: string, options: RequestInit, timeoutMs = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Google API request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function getClientId() {
  return process.env.GOOGLE_CLIENT_ID ?? "";
}
function getClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET ?? "";
}

// ── State encoding ────────────────────────────────────────────────────────────
// We encode userId + origin in the OAuth state param so the callback can
// identify the user without a session lookup.
export function encodeState(userId: number, origin: string): string {
  return Buffer.from(JSON.stringify({ userId, origin })).toString("base64url");
}
export function decodeState(state: string): { userId: number; origin: string } {
  return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
}

// ── OAuth URL builder ─────────────────────────────────────────────────────────
export function getAuthUrl(userId: number, origin: string): string {
  const redirectUri = `${origin}/api/calendar/callback`;
  const state = encodeState(userId, origin);
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

// ── Token exchange ────────────────────────────────────────────────────────────
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const res = await googleFetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }
  return res.json() as Promise<TokenResponse>;
}

// ── Token refresh ─────────────────────────────────────────────────────────────
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await googleFetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

// ── DB helpers ────────────────────────────────────────────────────────────────
export async function saveCalendarTokens(
  userId: number,
  tokens: TokenResponse
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = Date.now();
  const expiresAt = now + tokens.expires_in * 1000;
  const existing = await db
    .select()
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(googleCalendarTokens)
      .set({
        accessToken: tokens.access_token,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiresAt,
        scope: tokens.scope,
        updatedAt: now,
      })
      .where(eq(googleCalendarTokens.userId, userId));
  } else {
    await db.insert(googleCalendarTokens).values({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? "",
      expiresAt,
      scope: tokens.scope,
      calendarId: "primary",
      connectedAt: now,
      updatedAt: now,
    });
  }
}

export async function getCalendarTokens(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function disconnectCalendar(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(googleCalendarTokens).where(eq(googleCalendarTokens.userId, userId));
}

// ── Get a valid access token (auto-refresh if needed) ─────────────────────────
async function getValidAccessToken(userId: number): Promise<string | null> {
  const row = await getCalendarTokens(userId);
  if (!row) return null;

  // Refresh if token expires within 5 minutes
  if (row.expiresAt - Date.now() < 5 * 60 * 1000) {
    const db = await getDb();
    if (!db) return row.accessToken;
    const refreshed = await refreshAccessToken(row.refreshToken);
    const now = Date.now();
    await db
      .update(googleCalendarTokens)
      .set({
        accessToken: refreshed.access_token,
        expiresAt: now + refreshed.expires_in * 1000,
        updatedAt: now,
      })
      .where(eq(googleCalendarTokens.userId, userId));
    return refreshed.access_token;
  }
  return row.accessToken;
}

// ── Calendar event shape ──────────────────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  summary: string;
  start: string; // ISO datetime or date
  end: string;
  allDay: boolean;
  description?: string;
}

// ── Fetch this week's events ──────────────────────────────────────────────────
export async function getWeekEvents(userId: number): Promise<CalendarEvent[] | null> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return null;

  const row = await getCalendarTokens(userId);
  const calendarId = encodeURIComponent(row?.calendarId ?? "primary");

  // Monday 00:00 → Sunday 23:59:59 of the current week
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const params = new URLSearchParams({
    timeMin: monday.toISOString(),
    timeMax: sunday.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });

  const res = await googleFetch(
    `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    console.error("[GoogleCalendar] Failed to fetch events:", await res.text());
    return null;
  }

  const data = await res.json() as { items?: Array<{
    id: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    description?: string;
  }> };

  return (data.items ?? []).map((item) => ({
    id: item.id,
    summary: item.summary ?? "(No title)",
    start: item.start?.dateTime ?? item.start?.date ?? "",
    end: item.end?.dateTime ?? item.end?.date ?? "",
    allDay: !item.start?.dateTime,
    description: item.description,
  }));
}

// ── Format events for AI prompt ───────────────────────────────────────────────
export function formatEventsForPrompt(events: CalendarEvent[]): string {
  if (events.length === 0) return "No calendar events this week.";
  return events
    .slice(0, 20) // cap at 20 to keep prompt lean
    .map((e) => {
      const start = e.allDay
        ? e.start
        : new Date(e.start).toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
      return `- ${e.summary} (${start}${e.allDay ? ", all-day" : ""})`;
    })
    .join("\n");
}
