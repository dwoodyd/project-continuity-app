/**
 * One-off script: cancel the test_pro_monthly subscription for user ID 1
 * Run: node scripts/cancel-test-sub.mjs
 * Delete after use.
 */
import { createConnection } from "mysql2/promise";

const PAYPAL_BASE = process.env.PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

async function getToken() {
  const creds = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Token fetch failed: " + JSON.stringify(data));
  return data.access_token;
}

async function main() {
  console.log("PAYPAL_ENV:", process.env.PAYPAL_ENV);

  // Get subscription ID from DB
  const conn = await createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute(
    "SELECT id, name, isPro, billingStatus, paypalSubscriptionId, planKey FROM users WHERE id = 1"
  );
  await conn.end();

  const user = rows[0];
  console.log("User:", JSON.stringify(user));

  if (!user?.paypalSubscriptionId) {
    console.log("No subscription ID found for user 1.");
    return;
  }

  const subId = user.paypalSubscriptionId;
  console.log("Subscription ID:", subId);

  const token = await getToken();

  // Check subscription status first
  const statusRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const status = await statusRes.json();
  console.log("Subscription status:", status.status, "| Plan:", status.plan_id);

  if (status.status === "CANCELLED") {
    console.log("Already cancelled.");
    return;
  }

  // Cancel it
  const cancelRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "Test subscription — cancelled by admin" }),
  });

  if (cancelRes.status === 204) {
    console.log("✅ Subscription cancelled successfully.");
  } else {
    const err = await cancelRes.json();
    console.error("❌ Cancel failed:", JSON.stringify(err));
  }
}

main().catch(console.error);
