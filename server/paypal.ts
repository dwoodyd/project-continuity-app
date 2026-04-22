import express from "express";
import { getDb } from "./db";
import { users, paypalEvents } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// Set PAYPAL_ENV=live in production secrets to switch to live mode
const PAYPAL_BASE = process.env.PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";
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
  const event = req.body as {
    event_type: string;
    resource: { id: string; custom_id: string; status: string };
  };
  try {
    // Idempotency: skip duplicate webhook deliveries
    const eventId = (req.body as { id?: string }).id;
    if (eventId) {
      const db = await getDb();
      if (db) {
        try {
          await db.insert(paypalEvents).values({
            eventId,
            eventType: event.event_type,
            processedAt: Date.now(),
          });
        } catch {
          // Unique constraint violation — already processed, safe to ignore
          return res.json({ ok: true, duplicate: true });
        }
      }
    }
    const userId = parseInt(event.resource?.custom_id ?? "");

    if (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
      if (!isNaN(userId)) await activateSubscription(event.resource.id, userId);

    } else if (
      event.event_type === "BILLING.SUBSCRIPTION.CANCELLED" ||
      event.event_type === "BILLING.SUBSCRIPTION.EXPIRED"
    ) {
      const dbInst = await getDb();
      if (!isNaN(userId) && dbInst)
        await dbInst.update(users).set({ isPro: false }).where(eq(users.id, userId));

    } else if (event.event_type === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {
      // Notify the owner so they can follow up; user retains Pro access until subscription expires
      const subscriptionId = event.resource?.id ?? "unknown";
      console.warn(`[PayPal] Payment failed for subscription ${subscriptionId}, userId ${userId}`);
      await notifyOwner({
        title: "⚠️ PayPal Payment Failed",
        content: `Subscription **${subscriptionId}** payment failed.\nUser ID: ${isNaN(userId) ? "unknown" : userId}\n\nPlease follow up — the user may need to update their payment method.`,
      }).catch(() => {/* non-blocking */});
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("[PayPal webhook]", e instanceof Error ? e.message : String(e));
    res.status(500).json({ error: "webhook error" });
  }
});
