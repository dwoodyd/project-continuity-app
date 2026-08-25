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
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Settings → Secrets.");
  }
  const res = await paypalFetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json() as { access_token?: string; error?: string; error_description?: string };
  if (!data.access_token) {
    const errMsg = data.error_description ?? data.error ?? `HTTP ${res.status}`;
    console.error(`[PayPal] getAccessToken failed: ${errMsg}`);
    throw new Error(`PayPal authentication failed: ${errMsg}. Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Settings → Secrets, and ensure the sandbox is claimed at dashboard.paypal.com.`);
  }
  return data.access_token;
}

// ─── Get plan ID for a given key ─────────────────────────────────────────────
const planIdCache: Partial<Record<PlanKey, string>> = {};

export async function getPlanId(key: PlanKey): Promise<string> {
  if (planIdCache[key]) return planIdCache[key]!;
  const envKey = `PAYPAL_PLAN_${key.toUpperCase()}`;
  if (process.env[envKey]) { planIdCache[key] = process.env[envKey]!; return planIdCache[key]!; }
  // Do not fall back to retired single-plan variables. A stale sandbox or deleted
  // plan ID in either one would otherwise override live plan provisioning and
  // make checkout fail with PayPal's INVALID_RESOURCE_ID response.
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
      custom_id: `${userId}:${planKey}`,
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
  const subBody = await res.json() as { links?: { rel: string; href: string }[]; name?: string; message?: string; details?: unknown };
  if (!res.ok || !Array.isArray(subBody.links)) {
    const errMsg = subBody.message ?? subBody.name ?? `HTTP ${res.status}`;
    const details = subBody.details ? ` Details: ${JSON.stringify(subBody.details)}` : "";
    console.error(`[PayPal] createSubscription failed (${res.status}): ${errMsg}${details}`);
    throw new Error(`PayPal subscription creation failed: ${errMsg}${details}`);
  }
  const approvalLink = subBody.links.find((l) => l.rel === "approve");
  if (!approvalLink) throw new Error("No approval link in PayPal response");
  return approvalLink.href;
}

// ─── Verify a subscription with PayPal, then activate (server-trusted path) ────
// SECURITY: never trust a client-supplied subscriptionId/planKey. Fetch the
// subscription from PayPal, confirm it is ACTIVE/APPROVED, and confirm its
// custom_id (`${userId}:${planKey}`, set at creation time) matches THIS user.
// The planKey is derived from PayPal's custom_id, not from client input.
export async function verifyAndActivateSubscription(subscriptionId: string, userId: number) {
  const token = await getAccessToken();
  const res = await paypalFetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`PayPal subscription lookup failed (${res.status})`);
  }
  const sub = await res.json() as { status?: string; custom_id?: string };
  const status = sub.status ?? "";
  if (status !== "ACTIVE" && status !== "APPROVED") {
    throw new Error(`Subscription not active (status: ${status || "unknown"})`);
  }
  const [customUserIdStr, customPlanKeyStr] = (sub.custom_id ?? "").split(":");
  if (parseInt(customUserIdStr ?? "") !== userId) {
    throw new Error("Subscription does not belong to this user");
  }
  const planKey = (customPlanKeyStr && customPlanKeyStr in PLAN_CATALOG)
    ? customPlanKeyStr as PlanKey
    : undefined;
  await activateSubscription(subscriptionId, userId, planKey);
  return { planKey };
}

// ─── Activate subscription after user returns ─────────────────────────────────
export async function activateSubscription(subscriptionId: string, userId: number, planKey?: PlanKey) {
  const db = await getDb();
  if (!db) return;
  const plan = planKey ? PLAN_CATALOG[planKey] : null;
  await db.update(users).set({
    paypalSubscriptionId: subscriptionId,
    isPro: true,
    proSince: new Date(),
    billingStatus: "active",
    ...(plan ? {
      tier: plan.tier,
      planKey,
      rateType: plan.rateType as "founding" | "retail",
      isFoundingMember: plan.rateType === "founding" ? true : undefined,
      foundingRateLocked: plan.rateType === "founding" ? true : undefined,
    } : {}),
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
  await db2.update(users).set({ isPro: false, paypalSubscriptionId: null, billingStatus: "free_tier_founding_rate_waiting" }).where(eq(users.id, userId));
}

// ─── PayPal webhook signature verification ───────────────────────────────────
// Uses PayPal's postback method: sends the event + headers back to PayPal's
// verify-webhook-signature endpoint to confirm authenticity.
async function verifyPayPalWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  rawBody: string,
  webhookId: string,
): Promise<boolean> {
  const transmissionId = headers["paypal-transmission-id"];
  const transmissionTime = headers["paypal-transmission-time"];
  const certUrl = headers["paypal-cert-url"];
  const authAlgo = headers["paypal-auth-algo"];
  const transmissionSig = headers["paypal-transmission-sig"];

  console.log("[PayPal webhook] Verifying — PAYPAL_ENV:", process.env.PAYPAL_ENV, "| PAYPAL_BASE:", PAYPAL_BASE);
  console.log("[PayPal webhook] Headers present:", { transmissionId: !!transmissionId, transmissionTime: !!transmissionTime, certUrl: !!certUrl, authAlgo: !!authAlgo, transmissionSig: !!transmissionSig });
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.warn("[PayPal webhook] Missing required signature headers");
    return false;
  }

  // Validate cert URL is from PayPal to prevent SSRF
  const certUrlStr = Array.isArray(certUrl) ? certUrl[0] : certUrl;
  console.log("[PayPal webhook] Cert URL:", certUrlStr);
  if (!certUrlStr || (!certUrlStr.startsWith("https://api.paypal.com/") && !certUrlStr.startsWith("https://api.sandbox.paypal.com/"))) {
    console.warn("[PayPal webhook] Suspicious cert URL rejected:", certUrlStr);
    return false;
  }

  try {
    const token = await getAccessToken();
    const verifyPayload = {
      transmission_id: Array.isArray(transmissionId) ? transmissionId[0] : transmissionId,
      transmission_time: Array.isArray(transmissionTime) ? transmissionTime[0] : transmissionTime,
      cert_url: certUrlStr,
      auth_algo: Array.isArray(authAlgo) ? authAlgo[0] : authAlgo,
      transmission_sig: Array.isArray(transmissionSig) ? transmissionSig[0] : transmissionSig,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    };

    const response = await paypalFetch(
      `${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(verifyPayload),
      },
      8_000,
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn("[PayPal webhook] Verification API returned", response.status, errText);
      return false;
    }

    const result = await response.json() as { verification_status?: string };
    console.log("[PayPal webhook] Verification result:", result.verification_status);
    return result.verification_status === "SUCCESS";
  } catch (err) {
    console.error("[PayPal webhook] Signature verification error:", err instanceof Error ? err.message : String(err));
    return false;
  }
}

// ─── Webhook router (mounted at /api/paypal) ──────────────────────────────────
export const paypalRouter = express.Router();

paypalRouter.post("/webhook", express.text({ type: "application/json" }), async (req, res) => {
  const rawBody = req.body as string;
  let event: { event_type: string; resource: { id: string; custom_id: string; status: string }; id?: string };
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.warn("[PayPal webhook] Invalid JSON body");
    return res.status(400).json({ error: "Invalid JSON" });
  }

  // ── Signature verification ────────────────────────────────────────────────
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    // PAYPAL_WEBHOOK_ID not configured — log and reject to avoid silent bypass
    console.error("[PayPal webhook] PAYPAL_WEBHOOK_ID env var not set — rejecting webhook");
    return res.status(500).json({ error: "Webhook not configured" });
  }

  const isValid = await verifyPayPalWebhookSignature(
    req.headers as Record<string, string | string[] | undefined>,
    rawBody,
    webhookId,
  );

  if (!isValid) {
    console.warn("[PayPal webhook] Signature verification FAILED — rejecting event");
    return res.status(401).json({ error: "Invalid webhook signature" });
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
    const customId = event.resource?.custom_id ?? "";
    const [userIdStr, planKeyStr] = customId.split(":");
    const userId = parseInt(userIdStr ?? "");
    const planKey = (planKeyStr && planKeyStr in PLAN_CATALOG) ? planKeyStr as PlanKey : undefined;

    if (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
      if (!isNaN(userId)) await activateSubscription(event.resource.id, userId, planKey);

    } else if (
      event.event_type === "BILLING.SUBSCRIPTION.CANCELLED" ||
      event.event_type === "BILLING.SUBSCRIPTION.EXPIRED"
    ) {
      const dbInst = await getDb();
      if (!isNaN(userId) && dbInst)
        await dbInst.update(users).set({ isPro: false, billingStatus: "free_tier_founding_rate_waiting" }).where(eq(users.id, userId));

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
