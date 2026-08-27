/**
 * dateUtils — single source of truth for "today" in Continuary.
 *
 * RULE: Never compute a calendar-day key with `new Date().toISOString().slice(0,10)`.
 * That returns a UTC date, which is already "tomorrow" for users west of UTC after
 * their local 5pm (e.g. Pacific time after 17:00 PDT / 00:00 UTC+1).
 *
 * Always prefer the client-supplied `localDate` (YYYY-MM-DD in the user's timezone).
 * Fall back to `getServerLocalDate()` only when no client date is available — it uses
 * local wall-clock methods (getFullYear/getMonth/getDate) which respect the server's
 * TZ env var, but the client-supplied date is always more accurate.
 */

const pad = (n: number) => String(n).padStart(2, "0");

export type TimezoneNow = { hour: number; minute: number; dateStr: string };

/** Resolves the real current clock and calendar day in a member's IANA timezone. */
export function getNowInTimezone(timezone: string, now: Date = new Date()): TimezoneNow {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "0";
    return {
      hour: Number(value("hour")),
      minute: Number(value("minute")),
      dateStr: `${value("year")}-${value("month")}-${value("day")}`,
    };
  } catch {
    return {
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
      dateStr: now.toISOString().slice(0, 10),
    };
  }
}

/**
 * Returns today's date as YYYY-MM-DD using the **server's local timezone**.
 * This is a safe fallback — set TZ=America/Los_Angeles (or the user's zone) in env
 * if you want the server to agree with the user's clock.
 *
 * Prefer passing `localDate` from the client wherever possible.
 */
export function getServerLocalDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Returns `localDate` if provided and valid, otherwise falls back to
 * `getServerLocalDate()`. Use this as the single resolver in every procedure.
 */
export function resolveDate(localDate?: string | null): string {
  if (localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate)) return localDate;
  return getServerLocalDate();
}

/**
 * Compute yesterday's YYYY-MM-DD from a known local date string.
 * Avoids UTC arithmetic — uses local Date constructor.
 */
export function subtractDay(dateStr: string, days = 1): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d! - days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/**
 * Compute tomorrow's YYYY-MM-DD from a known local date string.
 */
export function addDay(dateStr: string, days = 1): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d! + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}
