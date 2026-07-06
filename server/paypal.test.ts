import { describe, it, expect } from "vitest";

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
});
