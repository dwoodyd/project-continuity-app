import express from "express";
import { getDb } from "./db";
import { users, paypalEvents } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// ─── Timeout-aware fetch for all PayPal API calls ────────────────────────────
async function paypalFetch(url: string, options: RequestInit, timeoutMs = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`PayPal request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Set PAYPAL_ENV=live in production secrets to switch to live mode
const PAYPAL_BASE = process.env.PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;

// ─── Eight-plan registry ──────────────────────────────────────────────────────
export type PlanKey =
  | "pro_founding_monthly"
  | "pro_founding_annual"
  | "keeper_founding_monthly"
  | "keeper_founding_annual"
  | "pro_retail_monthly"
  | "pro_retail_annual"
  | "keeper_retail_monthly"
  | "keeper_retail_annual";

export const PLAN_CATALOG: Record<PlanKey, {
  name: string;
  tier: "pro" | "keeper";
  rateType: "founding" | "retail";
  billing: "monthly" | "annual";
  priceUsd: string;
  intervalUnit: "MONTH" | "YEAR";
}> = {
  pro_founding_monthly:    { name: "Continuary Pro Founding Monthly",   tier: "pro",    rateType: "founding", billing: "monthly", priceUsd: "4.99",   intervalUnit: "MONTH" },
  pro_founding_annual:     { name: "Continuary Pro Founding Annual",     tier: "pro",    rateType: "founding", billing: "annual",  priceUsd: "39.99",  intervalUnit: "YEAR"  },
  keeper_founding_monthly: { name: "Continuary Keeper Founding Monthly", tier: "keeper", rateType: "founding", billing: "monthly", priceUsd: "9.99",   intervalUnit: "MONTH" },
  keeper_founding_annual:  { name: "Continuary Keeper Founding Annual",  tier: "keeper", rateType: "founding", billing: "annual",  priceUsd: "79.99",  intervalUnit: "YEAR"  },
  pro_retail_monthly:      { name: "Continuary Pro Retail Monthly",      tier: "pro",    rateType: "retail",   billing: "monthly", priceUsd: "7.99",   intervalUnit: "MONTH" },
  pro_retail_annual:       { name: "Continuary Pro Retail Annual",       tier: "pro",    rateType: "retail",   billing: "annual",  priceUsd: "79.99",  intervalUnit: "YEAR"  },
  keeper_retail_monthly:   { name: "Continuary Keeper Retail Monthly",   tier: "keeper", rateType: "retail",   billing: "monthly", priceUsd: "14.99",  intervalUnit: "MONTH" },
  keeper_retail_annual:    { name: "Continuary Keeper Retail Annual",    tier: "keeper", rateType: "retail",   billing: "annual",  priceUsd: "149.99", intervalUnit: "YEAR"  },
};

// Legacy exports kept for backward compat
export const PRO_PLAN_PRICE_USD = PLAN_CATALOG.pro_founding_monthly.priceUsd;
export const PRO_PLAN_NAME = "Continuary Pro";

// ─── Get OAuth token ──────────────────────────────────────────────────────────
async function getAccessToken(): Promise<string> {
  const res = await paypalFetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
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

// ─── Get plan ID for a given key ─────────────────────────────────────────────
const planIdCache: Partial<Record<PlanKey, string>> = {};

export async function getPlanId(key: PlanKey): Promise<string> {
  if (planIdCache[key]) return planIdCache[key]!;
  const envKey = `PAYPAL_PLAN_${key.toUpperCase()}`;
  if (process.env[envKey]) { planIdCache[key] = process.env[envKey]!; return planIdCache[key]!; }
  // Legacy single-plan env var (backward compat)
  if (key === "pro_founding_monthly" && process.env.PAYPAL_PLAN_ID) {
    planIdCache[key] = process.env.PAYPAL_PLAN_ID; return planIdCache[key]!;
  }
  const plan = PLAN_CATALOG[key];
  const token = await getAccessToken();
  const productRes = await paypalFetch(`${PAYPAL_BASE}/v1/catalogs/products`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: plan.name, type: "SERVICE", category: "SOFTWARE" }),
  });
  const product = await productRes.json() as { id: string };
  const planRes = await paypalFetch(`${PAYPAL_BASE}/v1/billing/plans`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: product.id, name: plan.name, status: "ACTIVE",
      billing_cycles: [{
        frequency: { interval_unit: plan.intervalUnit, interval_count: 1 },
        tenure_type: "REGULAR", sequence: 1, total_cycles: 0,
        pricing_scheme: { fixed_price: { value: plan.priceUsd, currency_code: "USD" } },
      }],
      payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: "CONTINUE", payment_failure_threshold: 3 },
    }),
  });
  const createdPlan = await planRes.json() as { id: string };
  planIdCache[key] = createdPlan.id;
  console.log(`[PayPal] Created plan "${plan.name}" → ${createdPlan.id}. Set ${envKey}=${createdPlan.id} to persist.`);
  return planIdCache[key]!;
}

// Legacy helper kept for backward compat
export async function getOrCreatePlan(): Promise<string> {
  return getPlanId("pro_founding_monthly");
}

// ─── Create subscription link ─────────────────────────────────────────────────
export async function createSubscriptionLink(
  userId: number,
  planKeyOrReturnUrl: PlanKey | string,
  returnUrlOrCancelUrl: string,
  cancelUrlArg?: string,
): Promise<string> {
  // Support both old signature (userId, returnUrl, cancelUrl) and new (userId, planKey, returnUrl, cancelUrl)
  let planKey: PlanKey = "pro_founding_monthly";
  let returnUrl: string;
  let cancelUrl: string;
  if (cancelUrlArg !== undefined) {
    planKey = planKeyOrReturnUrl as PlanKey;
    returnUrl = returnUrlOrCancelUrl;
    cancelUrl = cancelUrlArg;
  } else {
    returnUrl = planKeyOrReturnUrl;
    cancelUrl = returnUrlOrCancelUrl;
  }
  const token = await getAccessToken();
  const planId = await getPlanId(planKey);

  const res = await paypalFetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
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

// ─── FIX #2: Verify subscription with PayPal and resolve its plan key ────────
/**
 * Fetches the subscription from PayPal, confirms it is ACTIVE, verifies the
 * custom_id matches the expected userId, and returns the resolved PlanKey.
 * Throws if any check fails — callers must not grant access on error.
 */
export async function verifyAndGetSubscriptionPlanKey(
  subscriptionId: string,
  expectedUserId: number,
): Promise<PlanKey> {
  const token = await getAccessToken();
  const res = await paypalFetch(
    `${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`PayPal subscription lookup failed: HTTP ${res.status}`);
  }
  const sub = await res.json() as {
    status: string;
    custom_id?: string;
    plan_id?: string;
  };

  if (sub.status !== "ACTIVE") {
    throw new Error(`Subscription ${subscriptionId} is not ACTIVE (status: ${sub.status})`);
  }

  const customId = parseInt(sub.custom_id ?? "");
  if (isNaN(customId) || customId !== expectedUserId) {
    throw new Error(
      `Subscription ${subscriptionId} custom_id mismatch: expected ${expectedUserId}, got ${sub.custom_id}`,
    );
  }

  // Resolve plan key from plan_id
  const planId = sub.plan_id;
  if (planId) {
    // Check env vars first (fastest)
    for (const key of Object.keys(PLAN_CATALOG) as PlanKey[]) {
      const envKey = `PAYPAL_PLAN_${key.toUpperCase()}`;
      if (process.env[envKey] === planId) return key;
      if (key === "pro_founding_monthly" && process.env.PAYPAL_PLAN_ID === planId) return key;
      if (planIdCache[key] === planId) return key;
    }
  }
  // If we can't resolve the plan key, default to pro (safe — don't block activation)
  console.warn(`[PayPal] Could not resolve planKey for plan_id=${planId}; defaulting to pro_founding_monthly`);
  return "pro_founding_monthly";
}

// ─── Activate subscription (internal — sets tier/planKey/rateType) ────────────
/**
 * Writes the subscription grant to the database.
 * planKey is resolved from PayPal's subscription object (not trusted from client).
 */
export async function activateSubscription(
  subscriptionId: string,
  userId: number,
  planKey: PlanKey = "pro_founding_monthly",
) {
  const db = await getDb();
  if (!db) return;
  const plan = PLAN_CATALOG[planKey];
  await db.update(users).set({
    paypalSubscriptionId: subscriptionId,
    isPro: true,
    proSince: new Date(),
    billingStatus: "active",
    tier: plan.tier,
    planKey,
    rateType: plan.rateType,
    // Lock founding rate on first activation
    foundingRateLocked: plan.rateType === "founding",
    foundingTier: plan.tier,
  }).where(eq(users.id, userId));
}

// ─── Cancel subscription ──────────────────────────────────────────────────────
export async function cancelSubscription(subscriptionId: string, userId: number) {
  const token = await getAccessToken();
  await paypalFetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "User requested cancellation" }),
  });
  const db2 = await getDb();
  if (!db2) return;
  await db2.update(users).set({
    isPro: false,
    tier: null,
    planKey: null,
    rateType: null,
    paypalSubscriptionId: null,
    billingStatus: "free_tier_founding_rate_waiting",
  }).where(eq(users.id, userId));
}

// ─── FIX #1: Webhook signature verification ──────────────────────────────────
/**
 * Verifies a PayPal webhook delivery against PayPal's verification endpoint.
 * Requires PAYPAL_WEBHOOK_ID env var (set after registering the webhook in the
 * PayPal dashboard). Returns true only when PayPal responds with "SUCCESS".
 *
 * If PAYPAL_WEBHOOK_ID is not configured, logs a warning and returns false
 * (fail-closed: unverified webhooks are rejected).
 */
async function verifyWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  rawBody: Buffer,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("[PayPal webhook] PAYPAL_WEBHOOK_ID is not set — rejecting all webhook deliveries. Register a webhook in the PayPal dashboard and set PAYPAL_WEBHOOK_ID.");
    return false;
  }

  const transmissionId  = headers["paypal-transmission-id"] as string | undefined;
  const transmissionTime = headers["paypal-transmission-time"] as string | undefined;
  const certUrl         = headers["paypal-cert-url"] as string | undefined;
  const authAlgo        = headers["paypal-auth-algo"] as string | undefined;
  const transmissionSig = headers["paypal-transmission-sig"] as string | undefined;

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.warn("[PayPal webhook] Missing required signature headers — rejecting.");
    return false;
  }

  try {
    const token = await getAccessToken();
    const verifyRes = await paypalFetch(
      `${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          transmission_id:   transmissionId,
          transmission_time: transmissionTime,
          cert_url:          certUrl,
          auth_algo:         authAlgo,
          transmission_sig:  transmissionSig,
          webhook_id:        webhookId,
          webhook_event:     JSON.parse(rawBody.toString()),
        }),
      },
    );
    const result = await verifyRes.json() as { verification_status?: string };
    if (result.verification_status !== "SUCCESS") {
      console.warn(`[PayPal webhook] Signature verification failed: ${result.verification_status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[PayPal webhook] Signature verification error:", err instanceof Error ? err.message : String(err));
    return false;
  }
}

// ─── Webhook router (mounted at /api/paypal) ──────────────────────────────────
export const paypalRouter = express.Router();

// IMPORTANT: use express.raw() so we can pass the raw buffer to the signature verifier.
// express.json() is NOT used here — we parse manually after verification.
paypalRouter.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const rawBody = req.body as Buffer;

  // ── FIX #1: Verify PayPal signature before processing ──────────────────────
  const verified = await verifyWebhookSignature(
    req.headers as Record<string, string | string[] | undefined>,
    rawBody,
  );
  if (!verified) {
    console.warn("[PayPal webhook] Rejected: signature verification failed.");
    return res.status(401).json({ error: "webhook signature verification failed" });
  }

  let event: {
    id?: string;
    event_type: string;
    resource: { id: string; custom_id: string; status: string };
  };
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: "invalid JSON body" });
  }

  try {
    // Idempotency: skip duplicate webhook deliveries
    const eventId = event.id;
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
      if (!isNaN(userId)) {
        // Resolve the plan key from PayPal (authoritative source)
        let planKey: PlanKey = "pro_founding_monthly";
        try {
          planKey = await verifyAndGetSubscriptionPlanKey(event.resource.id, userId);
        } catch (err) {
          console.warn(`[PayPal webhook] Could not verify subscription plan key: ${err instanceof Error ? err.message : String(err)}. Defaulting to pro_founding_monthly.`);
        }
        await activateSubscription(event.resource.id, userId, planKey);
      }
    } else if (
      event.event_type === "BILLING.SUBSCRIPTION.CANCELLED" ||
      event.event_type === "BILLING.SUBSCRIPTION.EXPIRED"
    ) {
      const dbInst = await getDb();
      if (!isNaN(userId) && dbInst) {
        await dbInst.update(users).set({
          isPro: false,
          tier: null,
          planKey: null,
          rateType: null,
          billingStatus: "free_tier_founding_rate_waiting",
        }).where(eq(users.id, userId));
      }
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
