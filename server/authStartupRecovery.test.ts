import { describe, expect, it } from "vitest";
import {
  AUTH_RESOLUTION_TIMEOUT_MS,
  shouldShowAuthStartupRecovery,
} from "../client/src/lib/authStartupRecovery";

describe("auth startup recovery", () => {
  it("uses a short, bounded auth-resolution window", () => {
    expect(AUTH_RESOLUTION_TIMEOUT_MS).toBe(8_000);
  });

  it("only replaces the skeleton when resolution is still pending after timeout", () => {
    expect(shouldShowAuthStartupRecovery(true, true)).toBe(true);
    expect(shouldShowAuthStartupRecovery(true, false)).toBe(false);
    expect(shouldShowAuthStartupRecovery(false, true)).toBe(false);
  });
});
