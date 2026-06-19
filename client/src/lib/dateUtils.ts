/**
 * Client-side date utilities for Continuary.
 *
 * RULE: Never use `new Date().toISOString().slice(0,10)` on the client.
 * That returns a UTC date, which is already "tomorrow" for users west of UTC
 * after their local 5pm (e.g. Pacific time after 17:00 PDT).
 *
 * Always use `getLocalDateStr()` to get the user's current calendar day.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Returns today's date as YYYY-MM-DD in the **user's local timezone**.
 * This is the value to pass as `localDate` to all server procedures.
 */
export function getLocalDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Returns yesterday's date as YYYY-MM-DD in the user's local timezone.
 */
export function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateStr(d);
}

/**
 * Returns tomorrow's date as YYYY-MM-DD in the user's local timezone.
 */
export function getTomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return getLocalDateStr(d);
}
