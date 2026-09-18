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

  it("uses a same-tab PayPal handoff so browsers do not block checkout as an asynchronous popup", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/ProPage.tsx"), "utf8");
    expect(source).toContain("window.location.assign(approvalUrl)");
    expect(source).not.toContain('window.open(approvalUrl, "_blank")');
  });

  it("does not promise card-free beta access before a live PayPal subscription checkout", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/ProPage.tsx"), "utf8");
    expect(source).not.toContain("No card required during beta");
    expect(source).not.toContain("No card now — beta access stays free");
    expect(source).toContain("Secure checkout through PayPal");
    expect(source).toContain("Choose ${tierName} at this rate");
  });

  it("sends checkout returns to the confirmation route and public pricing fallback", () => {
    const source = readFileSync(resolve(process.cwd(), "server/routers/paypal.ts"), "utf8");
    expect(source).toContain('const returnUrl = `${input.origin}/pro/success`;');
    expect(source).toContain('const cancelUrl = `${input.origin}/pricing`;');
  });

  it("gives a safe recovery state when PayPal returns without subscription_id", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/ProSuccessPage.tsx"), "utf8");
    expect(source).toContain("if (!subscriptionId)");
    expect(source).toContain("We couldn&apos;t find a PayPal confirmation.");
    expect(source).toContain('navigate("/pro")');
    expect(source).toContain("mailto:hello@continuary.app?subject=PayPal%20subscription%20return");
  });

  it("keeps entitlement aligned with cancellation, expiry, suspension, and reactivation events", () => {
    const source = readFileSync(resolve(process.cwd(), "server/paypal.ts"), "utf8");
    expect(source).toContain('event.event_type === "BILLING.SUBSCRIPTION.RE-ACTIVATED"');
    expect(source).toContain('event.event_type === "BILLING.SUBSCRIPTION.SUSPENDED"');
    expect(source).toContain('event.event_type === "BILLING.SUBSCRIPTION.CANCELLED"');
    expect(source).toContain('event.event_type === "BILLING.SUBSCRIPTION.EXPIRED"');
  });
});
