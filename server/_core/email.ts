/**
 * Email sending helper using Resend.
 *
 * All outbound emails for Continuary go through this module.
 * The FROM address is hello@continuary.app.
 *
 * Usage:
 *   import { sendEmail } from "./_core/email";
 *   await sendEmail({ to: "user@example.com", subject: "...", html: "..." });
 */
import { Resend } from "resend";

const FROM_ADDRESS = "Continuary <hello@continuary.app>";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not configured");
    _resend = new Resend(key);
  }
  return _resend;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Send a transactional email via Resend.
 * Returns true on success, false on failure (logs the error).
 */
export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
    });
    if (error) {
      console.error("[Email] Resend error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Email] Failed to send email:", err);
    return false;
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

/**
 * Invite code email sent to approved founding members.
 * Includes a pre-filled redeem link so they go straight to /landing?code=XXX.
 */
export function buildInviteCodeEmail(opts: {
  recipientName: string;
  inviteCode: string;
  appUrl: string;
}): { subject: string; html: string } {
  const redeemUrl = `${opts.appUrl}/landing?code=${encodeURIComponent(opts.inviteCode)}`;
  const subject = "Your Continuary founding member access is ready";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#080a0f;font-family:'Georgia',serif;color:#f0ede6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080a0f;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(245,166,35,0.7);">SILICON WREN · CONTINUARY</p>
            </td>
          </tr>
          <!-- Headline -->
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <h1 style="margin:0 0 8px;font-size:32px;font-weight:400;line-height:1.2;color:#f0ede6;">
                Your thread is<br/><em style="color:#f5a623;">ready, ${opts.recipientName}.</em>
              </h1>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:rgba(240,237,230,0.65);font-family:'Arial',sans-serif;">
                You've been approved as a founding member of Continuary. Your invite code is below — use it to activate your access and begin building your continuity practice.
              </p>
            </td>
          </tr>
          <!-- Code block -->
          <tr>
            <td style="padding:32px 0;">
              <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(245,166,35,0.7);font-family:'Arial',sans-serif;">Your invite code</p>
              <div style="background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.25);border-radius:8px;padding:20px 24px;display:inline-block;">
                <span style="font-family:'Courier New',monospace;font-size:22px;font-weight:700;letter-spacing:0.12em;color:#f5a623;">${opts.inviteCode}</span>
              </div>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding-bottom:32px;">
              <a href="${redeemUrl}" style="display:inline-block;background:#f5a623;color:#080a0f;text-decoration:none;font-family:'Arial',sans-serif;font-size:15px;font-weight:700;padding:16px 32px;border-radius:100px;letter-spacing:0.02em;">
                Activate your access →
              </a>
              <p style="margin:16px 0 0;font-size:12px;color:rgba(240,237,230,0.35);font-family:'Arial',sans-serif;">
                Or copy this link: <a href="${redeemUrl}" style="color:rgba(245,166,35,0.6);word-break:break-all;">${redeemUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid rgba(255,255,255,0.08);padding-top:24px;">
              <p style="margin:0;font-size:12px;color:rgba(240,237,230,0.3);font-family:'Arial',sans-serif;line-height:1.6;">
                This code is single-use and tied to your account. If you have any trouble, reply to this email and we'll sort it out.<br/><br/>
                — The Continuary team
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

/**
 * Application confirmation email sent immediately after someone applies.
 * Lets them know we received it and will be in touch within 48 hours.
 */
export function buildApplicationConfirmationEmail(opts: {
  recipientName: string;
}): { subject: string; html: string } {
  const subject = "We received your Continuary application";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#080a0f;font-family:'Georgia',serif;color:#f0ede6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080a0f;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(245,166,35,0.7);">SILICON WREN · CONTINUARY</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <h1 style="margin:0 0 8px;font-size:28px;font-weight:400;line-height:1.2;color:#f0ede6;">
                Got it, <em style="color:#f5a623;">${opts.recipientName}.</em>
              </h1>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:rgba(240,237,230,0.65);font-family:'Arial',sans-serif;">
                We read every application personally. You'll hear from us within 48 hours — if you're approved, your invite code and access link will be in your inbox.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 0 0;">
              <p style="margin:0;font-size:12px;color:rgba(240,237,230,0.3);font-family:'Arial',sans-serif;line-height:1.6;">
                Questions? Reply to this email.<br/><br/>
                — The Continuary team
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
