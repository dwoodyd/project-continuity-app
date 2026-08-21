import { describe, it, expect } from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("PayPal credentials", () => {
  /**
   * Verifies that the required PayPal environment variables are present.
   * A live token exchange is intentionally skipped here: the sandbox credentials
   * only become active after the owner claims their sandbox at
   * https://dashboard.paypal.com — and the live keys are entered after KYC.
   * The actual token exchange is exercised in the integration environment.
   */
  it("PayPal env vars are configured", () => {
    expect(process.env.PAYPAL_CLIENT_ID, "PAYPAL_CLIENT_ID must be set").toBeTruthy();
    expect(process.env.PAYPAL_CLIENT_SECRET, "PAYPAL_CLIENT_SECRET must be set").toBeTruthy();
    expect(process.env.PAYPAL_ENV, "PAYPAL_ENV must be set (sandbox or live)").toBeTruthy();
  });

  it("PAYPAL_ENV is a valid value", () => {
    const env = process.env.PAYPAL_ENV;
    expect(["sandbox", "live"]).toContain(env);
  });

  it("never uses retired single-plan secrets that can override live plan provisioning", () => {
    const source = readFileSync(resolve(process.cwd(), "server/paypal.ts"), "utf8");
    expect(source).toContain("Do not fall back to retired single-plan variables");
    expect(source).not.toContain('key === "pro_founding_monthly" && process.env.PAYPAL_PLAN_ID');
    expect(source).not.toContain('key === "keeper_founding_monthly" && process.env.PAYPAL_KEEPER_PLAN_ID');
  });
});
