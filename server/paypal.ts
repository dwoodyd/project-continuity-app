import express from "express";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const PAYPAL_BASE = "https://api-m.sandbox.paypal.com"; // switch to api-m.paypal.com for live
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;

// ─── Pro plan price (monthly) ─────────────────────────────────────────────────
export const PRO_PLAN_PRICE_USD = "4.99";
export const PRO_PLAN_NAME = "Continuary Pro";

// ─── Get OAuth token ──────────────────────────────────────────────────────────
async function getAccessToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ─── Create or retrieve a billing plan ───────────────────────────────────────
let cachedPlanId: string | null = null;

export async function getOrCreatePlan(): Promise<string> {
  if (cachedPlanId) return cachedPlanId;
  // Use pre-created plan ID from env if available (preferred)
  if (process.env.PAYPAL_PLAN_ID) {
    cachedPlanId = process.env.PAYPAL_PLAN_ID;
    return cachedPlanId;
  }
  const token = await getAccessToken();

  // Create product
  const productRes = await fetch(`${PAYPAL_BASE}/v1/catalogs/products`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: PRO_PLAN_NAME, type: "SERVICE", category: "SOFTWARE" }),
  });
  const product = await productRes.json() as { id: string };

  // Create plan
  const planRes = await fetch(`${PAYPAL_BASE}/v1/billing/plans`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: product.id,
      name: `${PRO_PLAN_NAME} Monthly`,
      status: "ACTIVE",
      billing_cycles: [{
        frequency: { interval_unit: "MONTH", interval_count: 1 },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: PRO_PLAN_PRICE_USD, currency_code: "USD" } },
      }],
      payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 3 },
    }),
  });
  const plan = await planRes.json() as { id: string };
  cachedPlanId = plan.id;
  return plan.id;
}

// ─── Create subscription link ─────────────────────────────────────────────────
export async function createSubscriptionLink(userId: number, returnUrl: string, cancelUrl: string): Promise<string> {
  const token = await getAccessToken();
  const planId = await getOrCreatePlan();

  const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      plan_id: planId,
      custom_id: String(userId),
      application_context: {
        brand_name: "Continuary",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });
  const sub = await res.json() as { links: { rel: string; href: string }[] };
  const approvalLink = sub.links.find((l) => l.rel === "approve");
  if (!approvalLink) throw new Error("No approval link in PayPal response");
  return approvalLink.href;
}

// ─── Activate subscription after user returns ─────────────────────────────────
export async function activateSubscription(subscriptionId: string, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    paypalSubscriptionId: subscriptionId,
    isPro: true,
    proSince: new Date(),
  }).where(eq(users.id, userId));
}

// ─── Cancel subscription ──────────────────────────────────────────────────────
export async function cancelSubscription(subscriptionId: string, userId: number) {
  const token = await getAccessToken();
  await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "User requested cancellation" }),
  });
  const db2 = await getDb();
  if (!db2) return;
  await db2.update(users).set({ isPro: false, paypalSubscriptionId: null }).where(eq(users.id, userId));
}

// ─── Webhook router (mounted at /api/paypal) ──────────────────────────────────
export const paypalRouter = express.Router();

paypalRouter.post("/webhook", express.json(), async (req, res) => {
  const event = req.body as { event_type: string; resource: { id: string; custom_id: string; status: string } };
  try {
    if (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
      const userId = parseInt(event.resource.custom_id);
      if (!isNaN(userId)) await activateSubscription(event.resource.id, userId);
    } else if (event.event_type === "BILLING.SUBSCRIPTION.CANCELLED" || event.event_type === "BILLING.SUBSCRIPTION.EXPIRED") {
      const userId = parseInt(event.resource.custom_id);
      const dbInst = await getDb();
      if (!isNaN(userId) && dbInst) await dbInst.update(users).set({ isPro: false }).where(eq(users.id, userId));
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("[PayPal webhook]", e);
    res.status(500).json({ error: "webhook error" });
  }
});
