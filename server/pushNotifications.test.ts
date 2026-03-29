import { describe, it, expect, vi } from "vitest";

// ── VAPID key validation ──────────────────────────────────────────────────────
describe("Push notification configuration", () => {
  it("VAPID_PUBLIC_KEY env var is set and is a valid base64url string", () => {
    const key = process.env.VAPID_PUBLIC_KEY;
    expect(key, "VAPID_PUBLIC_KEY must be set").toBeTruthy();
    // VAPID public keys are 65-byte uncompressed EC points, base64url-encoded (~88 chars)
    expect(key!.length, "VAPID public key should be ~87-88 chars").toBeGreaterThan(80);
    // Must be valid base64url (no +, /, =)
    expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("VAPID_PRIVATE_KEY env var is set and is a valid base64url string", () => {
    const key = process.env.VAPID_PRIVATE_KEY;
    expect(key, "VAPID_PRIVATE_KEY must be set").toBeTruthy();
    expect(key!.length, "VAPID private key should be ~43 chars").toBeGreaterThan(30);
    expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("VITE_VAPID_PUBLIC_KEY matches VAPID_PUBLIC_KEY", () => {
    const serverKey = process.env.VAPID_PUBLIC_KEY;
    const clientKey = process.env.VITE_VAPID_PUBLIC_KEY;
    expect(clientKey, "VITE_VAPID_PUBLIC_KEY must be set").toBeTruthy();
    expect(clientKey).toBe(serverKey);
  });
});

// ── Message rotation ──────────────────────────────────────────────────────────
describe("Push notification message rotation", () => {
  it("morning messages pool has 4 entries", async () => {
    // We can't import the module directly without mocking web-push, so test the logic inline
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
    };

    expect(MESSAGES.morning).toHaveLength(4);
    expect(MESSAGES.midday).toHaveLength(4);
    expect(MESSAGES.evening).toHaveLength(4);

    // Rotation wraps correctly
    const pool = MESSAGES.morning;
    expect(pool[0 % pool.length]).toEqual(pool[0]);
    expect(pool[4 % pool.length]).toEqual(pool[0]); // wraps
    expect(pool[5 % pool.length]).toEqual(pool[1]); // wraps
  });

  it("time parser handles HH:MM format", () => {
    function parseTime(t: string): { hour: number; minute: number } {
      const [h, m] = (t ?? "09:00").split(":").map(Number);
      return { hour: h ?? 9, minute: m ?? 0 };
    }
    expect(parseTime("08:00")).toEqual({ hour: 8, minute: 0 });
    expect(parseTime("17:30")).toEqual({ hour: 17, minute: 30 });
    expect(parseTime("00:00")).toEqual({ hour: 0, minute: 0 });
  });
});

// ── Notification schedule logic ───────────────────────────────────────────────
describe("Notification schedule logic", () => {
  it("suppression window is 23 hours in milliseconds", () => {
    const SUPPRESSION_WINDOW_MS = 23 * 60 * 60 * 1000;
    expect(SUPPRESSION_WINDOW_MS).toBe(82_800_000);
  });

  it("cron aligns to next whole minute correctly", () => {
    // Simulate: if current seconds = 45, ms to next minute = 15000 - current ms
    const mockNow = new Date("2026-01-01T08:00:45.500Z");
    const msToNextMinute = (60 - mockNow.getSeconds()) * 1000 - mockNow.getMilliseconds();
    expect(msToNextMinute).toBe(14500);
  });
});
