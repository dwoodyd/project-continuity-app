import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  getRetryAfterMs,
  getTrpcRetryDelay,
  isRateLimitedTrpcError,
  shouldRetryTrpcMutation,
  shouldRetryTrpcQuery,
} from "../client/src/lib/trpcRetry";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

const responseWith = (status: number, retryAfter?: string) => ({
  meta: {
    response: {
      status,
      headers: { get: (name: string) => name === "Retry-After" ? retryAfter ?? null : null },
    },
  },
});

describe("timezone capture and 429 recovery", () => {
  it("reads Retry-After delta-seconds and HTTP dates while bounding malformed values", () => {
    expect(getRetryAfterMs(responseWith(429, "60"), 0)).toBe(60_000);
    expect(getRetryAfterMs(responseWith(429, "Thu, 01 Jan 1970 00:01:30 GMT"), 0)).toBe(90_000);
    expect(getRetryAfterMs(responseWith(429, "not-a-delay"), 0)).toBeUndefined();
    expect(getRetryAfterMs(responseWith(429, "9999999"), 0)).toBeUndefined();
  });

  it("backs off every throttled request and caps retries without immediately reissuing mutations", () => {
    const throttled = responseWith(429, "60");
    expect(isRateLimitedTrpcError(throttled)).toBe(true);
    expect(getTrpcRetryDelay(0, throttled)).toBe(60_000);
    expect(shouldRetryTrpcQuery(0, throttled)).toBe(true);
    expect(shouldRetryTrpcQuery(3, throttled)).toBe(false);
    expect(shouldRetryTrpcMutation(0, throttled)).toBe(true);
    expect(shouldRetryTrpcMutation(2, throttled)).toBe(false);
  });

  it("limits timezone capture to one attempt per user in a browser session", () => {
    const layout = read("client/src/components/AppLayout.tsx");
    expect(layout).toContain("const timezoneCaptureAttemptsRef = useRef(new Set<string>());");
    expect(layout).toContain("timezoneCaptureAttemptsRef.current.has(attemptKey)");
    expect(layout).toContain("markTimezoneCaptureAttempted(userId);");
    expect(layout).toContain("retry: false");
    expect(layout).toContain("profile.timezone === deviceTimezone");
  });

  it("persists a genuine device-zone change and exempts only timezone capture from shared quota", () => {
    const settings = read("server/routers/settings.ts");
    const server = read("server/_core/index.ts");
    expect(settings).toContain("if (existing?.timezone === input.timezone) return { timezone: existing.timezone, captured: false };");
    expect(settings).toContain("const data = { timezone: input.timezone, timezoneDetectedAt: new Date() };");
    expect(server).toContain('req.path === "/version" || req.path === "/settings.captureTimezone"');
  });

  it("applies bounded retry policy globally to both tRPC queries and mutations", () => {
    const main = read("client/src/main.tsx");
    expect(main).toContain("retry: shouldRetryTrpcQuery");
    expect(main).toContain("retryDelay: getTrpcRetryDelay");
    expect(main).toContain("retry: shouldRetryTrpcMutation");
  });

  it("keeps low-priority timezone capture out of user-data batches", () => {
    const main = read("client/src/main.tsx");
    expect(main).toContain("splitLink({");
    expect(main).toContain('operation.path === "settings.captureTimezone"');
    expect(main).toContain("true: httpLink({");
    expect(main).toContain('headers: { "x-continuary-priority": "background" }');
    expect(main).toContain("false: httpBatchLink({");
  });
});
