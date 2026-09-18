import { describe, expect, it } from "vitest";

const EXPECTED_PLANS = [
  ["PAYPAL_PLAN_PRO_FOUNDING_MONTHLY", "P-17X979154C838531MNKD3YZQ", "Continuary Pro Founding Monthly", "4.99", "MONTH"],
  ["PAYPAL_PLAN_PRO_FOUNDING_ANNUAL", "P-1BV3705982079911PNKD3YZY", "Continuary Pro Founding Annual", "39.99", "YEAR"],
  ["PAYPAL_PLAN_KEEPER_FOUNDING_MONTHLY", "P-9J644701NN723522WNKD35PA", "Continuary Keeper Founding Monthly", "9.99", "MONTH"],
  ["PAYPAL_PLAN_KEEPER_FOUNDING_ANNUAL", "P-21Y67382UY894390DNKD3Y2I", "Continuary Keeper Founding Annual", "79.99", "YEAR"],
  ["PAYPAL_PLAN_PRO_RETAIL_MONTHLY", "P-9Y458565X59243505NKD3Y2Q", "Continuary Pro Retail Monthly", "7.99", "MONTH"],
  ["PAYPAL_PLAN_PRO_RETAIL_ANNUAL", "P-4M71294444591302HNKD3Y2Y", "Continuary Pro Retail Annual", "79.99", "YEAR"],
  ["PAYPAL_PLAN_KEEPER_RETAIL_MONTHLY", "P-33M75201CW9485743NKD3Y3A", "Continuary Keeper Retail Monthly", "14.99", "MONTH"],
  ["PAYPAL_PLAN_KEEPER_RETAIL_ANNUAL", "P-7JP42458G4655482DNKD3Y3I", "Continuary Keeper Retail Annual", "149.99", "YEAR"],
] as const;

type PayPalPlan = {
  id: string;
  name: string;
  status: string;
  billing_cycles?: Array<{
    tenure_type?: string;
    frequency?: { interval_unit?: string };
    pricing_scheme?: { fixed_price?: { value?: string; currency_code?: string } };
  }>;
};

describe("live PayPal plan mappings", () => {
  it("pins every production checkout variable to its approved active PayPal plan", async () => {
    expect(process.env.PAYPAL_ENV).toBe("live");
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    expect(clientId, "PAYPAL_CLIENT_ID must be configured").toBeTruthy();
    expect(clientSecret, "PAYPAL_CLIENT_SECRET must be configured").toBeTruthy();

    const tokenResponse = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    expect(tokenResponse.ok, `PayPal token request returned ${tokenResponse.status}`).toBe(true);
    const { access_token: token } = await tokenResponse.json() as { access_token?: string };
    expect(token, "PayPal token response must contain an access token").toBeTruthy();

    for (const [environmentKey, expectedId, expectedName, expectedPrice, expectedInterval] of EXPECTED_PLANS) {
      expect(process.env[environmentKey], `${environmentKey} must match the approved plan ID`).toBe(expectedId);
      const planResponse = await fetch(`https://api-m.paypal.com/v1/billing/plans/${expectedId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      expect(planResponse.ok, `${environmentKey} plan lookup returned ${planResponse.status}`).toBe(true);
      const plan = await planResponse.json() as PayPalPlan;
      expect(plan.id).toBe(expectedId);
      expect(plan.name).toBe(expectedName);
      expect(plan.status).toBe("ACTIVE");
      const regularCycle = plan.billing_cycles?.find((cycle) => cycle.tenure_type === "REGULAR");
      expect(regularCycle?.frequency?.interval_unit).toBe(expectedInterval);
      expect(regularCycle?.pricing_scheme?.fixed_price?.value).toBe(expectedPrice);
      expect(regularCycle?.pricing_scheme?.fixed_price?.currency_code).toBe("USD");
    }
  }, 60_000);
});
