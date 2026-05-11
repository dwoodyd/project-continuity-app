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
 * Founding member approval email — sent when admin approves an application.
 *
 * Deep-link CTA: continuary.app/invite/<CODE>
 * The code is also shown as plain text fallback.
 * Expires in 30 days.
 */
export function buildInviteCodeEmail(opts: {
  recipientName: string;
  inviteCode: string;
  appUrl: string;
}): { subject: string; html: string } {
  // Always use the canonical domain, not whatever window.location.origin returns
  const canonicalBase = "https://continuary.app";
  const deepLink = `${canonicalBase}/invite/${encodeURIComponent(opts.inviteCode)}`;
  const fallbackSignin = `${canonicalBase}/signin`;
  const subject = "Your seat is ready — welcome to Continuary";

  const html = `
<!DOCTYPE html>
<html lang="en">
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

          <!-- Eyebrow -->
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(245,166,35,0.7);font-family:'Arial',sans-serif;">SILICON WREN · CONTINUARY</p>
            </td>
          </tr>

          <!-- Headline + body -->
          <tr>
            <td style="padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <h1 style="margin:0 0 20px;font-size:32px;font-weight:400;line-height:1.2;color:#f0ede6;">
                We're glad you're here.
              </h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:rgba(240,237,230,0.75);font-family:'Arial',sans-serif;">
                Hi ${opts.recipientName},
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:rgba(240,237,230,0.75);font-family:'Arial',sans-serif;">
                We read your application. You're in.
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:rgba(240,237,230,0.75);font-family:'Arial',sans-serif;">
                You're one of the first hundred — which means a few things. You have full access to Continuary during the beta, free for the first 90 days. After that, your founding rate is locked for life: <strong style="color:#f0ede6;">$4.99/mo Pro</strong> or <strong style="color:#f0ede6;">$9.99/mo Keeper</strong> (or $39.99&nbsp;/&nbsp;$79.99 yearly). Founding members never pay retail. Not at renewal, not in five years, not ever.
              </p>
              <p style="margin:0;font-size:15px;line-height:1.8;color:rgba(240,237,230,0.75);font-family:'Arial',sans-serif;">
                One click below opens Continuary. The first time you visit, Wren will introduce herself and walk you to your first check-in. There's no password to remember — every sign-in uses Manus OAuth tied to this email.
              </p>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td style="padding:36px 0 24px;text-align:center;">
              <a href="${deepLink}"
                 style="display:inline-block;background:#f5a623;color:#080a0f;text-decoration:none;font-family:'Arial',sans-serif;font-size:16px;font-weight:700;padding:18px 40px;border-radius:100px;letter-spacing:0.02em;">
                Open Continuary →
              </a>
              <p style="margin:16px 0 0;font-size:12px;color:rgba(240,237,230,0.35);font-family:'Arial',sans-serif;">
                If the button doesn't work, your code is
                <span style="font-family:'Courier New',monospace;color:rgba(245,166,35,0.8);letter-spacing:0.08em;">${opts.inviteCode}</span>
                — enter it at <a href="${fallbackSignin}" style="color:rgba(245,166,35,0.6);">${fallbackSignin}</a>.
              </p>
            </td>
          </tr>

          <!-- Notes section -->
          <tr>
            <td style="padding-bottom:32px;border-top:1px solid rgba(255,255,255,0.08);padding-top:28px;">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(245,166,35,0.6);font-family:'Arial',sans-serif;">A few things worth knowing</p>
              <ul style="margin:12px 0 0;padding:0 0 0 20px;font-size:14px;line-height:1.9;color:rgba(240,237,230,0.6);font-family:'Arial',sans-serif;">
                <li>Continuary is a Progressive Web App. After your first session, install it to your home screen (iOS, Android, or desktop) and it runs like a native app.</li>
                <li>We'll send a short founding-member welcome note in a few days with the community invite and the office-hours schedule. You can ignore it or join — both are fine.</li>
                <li>If something breaks, looks off, or could be better, just reply to this email. It's a real inbox.</li>
              </ul>
            </td>
          </tr>

          <!-- Sign-off -->
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0;font-size:15px;line-height:1.8;color:rgba(240,237,230,0.65);font-family:'Arial',sans-serif;">
                Thanks for trusting us with your thread.<br/>
                <em style="color:#f0ede6;">— DeWayne &amp; Wren</em>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;">
              <p style="margin:0;font-size:11px;color:rgba(240,237,230,0.25);font-family:'Arial',sans-serif;line-height:1.6;">
                This invite is unique to you. It expires in 30 days. If you didn't apply, you can ignore this.<br/>
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

/**
 * Application confirmation email — sent immediately after someone applies.
 * Uses the exact copy from the approved template.
 */
export function buildApplicationConfirmationEmail(opts: {
  recipientName: string;
}): { subject: string; html: string } {
  const subject = "You're in the queue — Continuary Founding Member";
  const html = `
<!DOCTYPE html>
<html lang="en">
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

          <!-- Eyebrow -->
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(245,166,35,0.7);font-family:'Arial',sans-serif;">SILICON WREN · CONTINUARY</p>
            </td>
          </tr>

          <!-- Headline + body -->
          <tr>
            <td style="padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <h1 style="margin:0 0 20px;font-size:32px;font-weight:400;line-height:1.2;color:#f0ede6;">
                Your story is already worth keeping.
              </h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:rgba(240,237,230,0.75);font-family:'Arial',sans-serif;">
                Hi ${opts.recipientName},
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:rgba(240,237,230,0.75);font-family:'Arial',sans-serif;">
                Something just landed in our inbox that we're genuinely glad to read.
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:rgba(240,237,230,0.75);font-family:'Arial',sans-serif;">
                You applied for a founding member seat — and that means you're one of the first 100 people who will shape what Continuary becomes. Not just as a user, but as someone whose patterns, frustrations, and small wins will directly influence what we build next.
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:rgba(240,237,230,0.75);font-family:'Arial',sans-serif;">
                We read every application personally. We're not filtering for credentials or productivity credentials — we're looking for people who know what it feels like to lose the thread, and who want something that helps them find it again.
              </p>
            </td>
          </tr>

          <!-- What happens next -->
          <tr>
            <td style="padding:28px 0 32px;">
              <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(245,166,35,0.6);font-family:'Arial',sans-serif;">WHAT HAPPENS NEXT</p>
              <p style="margin:0;font-size:15px;line-height:1.8;color:rgba(240,237,230,0.65);font-family:'Arial',sans-serif;">
                We'll review your application and reach out to this address within a few days. When we do, we'll share your founding member access details, your locked-in rate, and what the first few weeks of beta look like.
              </p>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.8;color:rgba(240,237,230,0.65);font-family:'Arial',sans-serif;">
                In the meantime, if anything comes to mind — questions, second thoughts, or something you forgot to mention — just reply here. This goes to a real inbox.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;">
              <p style="margin:0;font-size:11px;color:rgba(240,237,230,0.25);font-family:'Arial',sans-serif;line-height:1.6;">
                You're receiving this because you applied for a founding member seat at Continuary.<br/>
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
