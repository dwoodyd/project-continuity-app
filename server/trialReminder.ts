/**
 * trialReminder.ts — Day-80 trial expiry reminder
 *
 * Runs hourly. Finds founding members whose trialEndsAt is within 10 days
 * (i.e. 80 days into their 90-day trial) and sends a single branded email
 * reminding them to choose a plan at their locked founding rate.
 *
 * Idempotent: trialReminderSentAt is set on first send; subsequent cron
 * ticks skip users who already received the email.
 */

import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { and, eq, isNull, isNotNull, lte, gte } from "drizzle-orm";
import { sendEmail } from "./_core/email";

// ── Email template ────────────────────────────────────────────────────────────

export function buildTrialReminderEmail(opts: {
  recipientName: string;
  recipientEmail: string;
  daysLeft: number;
  trialEndDate: string; // e.g. "June 15, 2026"
  appUrl: string;
}): { subject: string; html: string } {
  const { recipientName, daysLeft, trialEndDate, appUrl } = opts;
  const proUrl = `${appUrl}/pro`;
  const subject = `${daysLeft} days left on your founding trial — your rate is waiting`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#080a0f;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080a0f;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Wordmark -->
          <tr>
            <td style="padding-bottom:40px;">
              <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(245,166,35,0.7);font-family:'Arial',sans-serif;">SILICON WREN · CONTINUARY</p>
            </td>
          </tr>
          <!-- Headline -->
          <tr>
            <td style="padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <h1 style="margin:0 0 20px;font-size:30px;font-weight:400;line-height:1.25;color:#f0ede6;">
                ${daysLeft} days left.<br/>Your founding rate is waiting.
              </h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:rgba(240,237,230,0.75);font-family:'Arial',sans-serif;">
                Hi ${recipientName},
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:rgba(240,237,230,0.75);font-family:'Arial',sans-serif;">
                Your 90-day founding trial ends on <strong style="color:#f0ede6;">${trialEndDate}</strong>. After that, Continuary will ask you to choose a plan — and your founding rate is still locked, exactly where you left it.
              </p>
              <p style="margin:0;font-size:15px;line-height:1.8;color:rgba(240,237,230,0.75);font-family:'Arial',sans-serif;">
                No automatic charge happens on that date. We'll ask. You choose. If you're not ready, we'll give you a grace window. But if you know you want to keep going, locking in now takes 60 seconds.
              </p>
            </td>
          </tr>
          <!-- Rates reminder -->
          <tr>
            <td style="padding:28px 0 28px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(245,166,35,0.6);font-family:'Arial',sans-serif;">Your locked founding rates</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding-right:8px;">
                    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;">
                      <p style="margin:0 0 4px;font-size:13px;color:rgba(240,237,230,0.5);font-family:'Arial',sans-serif;">Pro</p>
                      <p style="margin:0;font-size:22px;font-weight:400;color:#f0ede6;">$4.99<span style="font-size:13px;color:rgba(240,237,230,0.5);font-family:'Arial',sans-serif;">/mo</span></p>
                      <p style="margin:4px 0 0;font-size:11px;color:rgba(240,237,230,0.4);font-family:'Arial',sans-serif;">or $39.99/yr · retail $7.99/mo</p>
                    </div>
                  </td>
                  <td width="50%" style="padding-left:8px;">
                    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;">
                      <p style="margin:0 0 4px;font-size:13px;color:rgba(240,237,230,0.5);font-family:'Arial',sans-serif;">Keeper</p>
                      <p style="margin:0;font-size:22px;font-weight:400;color:#f0ede6;">$9.99<span style="font-size:13px;color:rgba(240,237,230,0.5);font-family:'Arial',sans-serif;">/mo</span></p>
                      <p style="margin:4px 0 0;font-size:11px;color:rgba(240,237,230,0.4);font-family:'Arial',sans-serif;">or $79.99/yr · retail $14.99/mo</p>
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0;font-size:12px;color:rgba(240,237,230,0.35);font-family:'Arial',sans-serif;">
                These rates are locked permanently. They will never increase at renewal, not in five years, not ever.
              </p>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:36px 0 24px;text-align:center;">
              <a href="${proUrl}"
                 style="display:inline-block;background:#f5a623;color:#080a0f;text-decoration:none;font-family:'Arial',sans-serif;font-size:16px;font-weight:700;padding:18px 40px;border-radius:100px;letter-spacing:0.02em;">
                Choose my plan →
              </a>
              <p style="margin:16px 0 0;font-size:13px;color:rgba(240,237,230,0.4);font-family:'Arial',sans-serif;">
                Not ready yet? No problem — we'll send one more note before your trial ends.
              </p>
            </td>
          </tr>
          <!-- Sign-off -->
          <tr>
            <td style="padding-bottom:32px;border-top:1px solid rgba(255,255,255,0.08);padding-top:28px;">
              <p style="margin:0;font-size:15px;line-height:1.8;color:rgba(240,237,230,0.65);font-family:'Arial',sans-serif;">
                Thanks for being here from the beginning.<br/>
                <em style="color:#f0ede6;">— DeWayne &amp; Wren</em>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;">
              <p style="margin:0;font-size:11px;color:rgba(240,237,230,0.25);font-family:'Arial',sans-serif;line-height:1.6;">
                You're receiving this because you're a Continuary Founding Member.<br/>
                Silicon Wren · <a href="https://continuary.app" style="color:rgba(245,166,35,0.4);">continuary.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}

// ── Cron runner ───────────────────────────────────────────────────────────────

const DAYS_BEFORE_EXPIRY = 10; // send at day 80 of a 90-day trial
const APP_URL = "https://continuary.app";

let reminderCronHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Find founding members whose trial ends in ≤ DAYS_BEFORE_EXPIRY days
 * and who haven't received the reminder yet, then send the email.
 */
export async function sendPendingTrialReminders(): Promise<void> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + DAYS_BEFORE_EXPIRY * 24 * 60 * 60 * 1000);
  const db = await getDb();
  if (!db) return;

  // Find users: isFoundingMember=true, trialEndsAt ≤ windowEnd, trialReminderSentAt IS NULL
  const candidates = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      trialEndsAt: users.trialEndsAt,
    })
    .from(users)
    .where(
      and(
        eq(users.isFoundingMember, true),
        isNotNull(users.trialEndsAt),
        isNull(users.trialReminderSentAt),
        lte(users.trialEndsAt, windowEnd),
        gte(users.trialEndsAt, now) // don't send to already-expired trials
      )
    );

  if (candidates.length === 0) return;

  console.log(`[TrialReminder] Found ${candidates.length} candidate(s) to remind.`);

  for (const user of candidates) {
    if (!user.email || !user.trialEndsAt) continue;

    const trialEnd = new Date(user.trialEndsAt);
    const daysLeft = Math.max(1, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const trialEndDate = trialEnd.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const { subject, html } = buildTrialReminderEmail({
      recipientName: user.name ?? "there",
      recipientEmail: user.email,
      daysLeft,
      trialEndDate,
      appUrl: APP_URL,
    });

    const sent = await sendEmail({
      to: user.email,
      subject,
      html,
    });

    if (sent) {
      // Mark as sent so we don't re-send
      await db
        .update(users)
        .set({ trialReminderSentAt: now })
        .where(eq(users.id, user.id));
      console.log(`[TrialReminder] Sent reminder to user ${user.id} (${user.email}), ${daysLeft} days left.`);
    } else {
      console.error(`[TrialReminder] Failed to send reminder to user ${user.id} (${user.email}).`);
    }
  }
}

export function startTrialReminderCron(): void {
  if (reminderCronHandle) return;
  console.log("[TrialReminder] Cron started — checks every hour for expiring trials.");

  // Check immediately on startup, then every hour
  sendPendingTrialReminders().catch(console.error);

  reminderCronHandle = setInterval(() => {
    sendPendingTrialReminders().catch(console.error);
  }, 60 * 60 * 1000);
}

export function stopTrialReminderCron(): void {
  if (reminderCronHandle) {
    clearInterval(reminderCronHandle);
    reminderCronHandle = null;
  }
}
