/**
 * Applications router — founding member application management
 *
 * Public procedures:
 *   applications.submit   — submit a founding member application (from marketing site)
 *
 * Admin procedures:
 *   applications.list     — list all applications (optionally filtered by status)
 *   applications.approve  — approve an application: generates invite code + sends email
 *   applications.reject   — reject an application
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  createFoundingApplication,
  getFoundingApplications,
  approveFoundingApplication,
  rejectFoundingApplication,
  createInviteCode,
  markInviteAsFoundingMember,
  type FoundingApplicationWithFM,
} from "../db";
// FoundingApplicationWithFM is the enriched type returned by getFoundingApplications
// It adds hasRedeemed and trialDaysLeft fields to each application row
void (0 as unknown as FoundingApplicationWithFM); // ensure type is used (prevents unused-import lint)
import { notifyOwner } from "../_core/notification";
import { sendEmail, buildInviteCodeEmail, buildApplicationConfirmationEmail } from "../_core/email";
import { sendTrialReminderToEmail } from "../trialReminder";

export const applicationsRouter = router({
  // ── Public: submit a founding member application ──────────────────────────
  submit: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(320),
        relationship: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createFoundingApplication(input);

      // Send confirmation email to the applicant
      const { subject, html } = buildApplicationConfirmationEmail({
        recipientName: input.name.split(" ")[0] ?? input.name,
      });
      await sendEmail({ to: input.email, subject, html, replyTo: "dwoodyd@gmail.com" });

      // Notify the owner
      await notifyOwner({
        title: "New Founding Member Application",
        content: `${input.name} (${input.email}) has applied for founding member access.\n\nRelationship to the work:\n${input.relationship ?? "Not provided"}\n\nReview and approve at /admin/applications`,
      });

      return { success: true };
    }),

  // ── Admin: list applications ──────────────────────────────────────────────
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
      }
      return getFoundingApplications(input?.status);
    }),

  // ── Admin: approve an application ────────────────────────────────────────
  approve: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        applicantName: z.string(),
        applicantEmail: z.string().email(),
        /** The base URL of the app (e.g. https://continuary.app) — passed from the frontend */
        appUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
      }

      // Generate a fresh invite code and mark it as a founding-member code
      const invite = await createInviteCode(ctx.user.id, `Founding: ${input.applicantName}`);
      const code = invite.code;
      await markInviteAsFoundingMember(code);

      // Mark application as approved
      await approveFoundingApplication(input.id, code);

      // Send the invite code email — always use canonical domain
      const firstName = input.applicantName.split(" ")[0] ?? input.applicantName;
      const { subject, html } = buildInviteCodeEmail({
        recipientName: firstName,
        inviteCode: code,
        appUrl: "https://continuary.app",
      });
      const emailSent = await sendEmail({
        to: input.applicantEmail,
        subject,
        html,
        replyTo: "dwoodyd@gmail.com",
      });

      return { success: true, code, emailSent };
    }),

  // ── Admin: reject an application ─────────────────────────────────────────
  reject: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
      }
      await rejectFoundingApplication(input.id);
      return { success: true };
    }),

  // ── Admin: manually re-send trial reminder email ──────────────────────────
  resendTrialReminder: protectedProcedure
    .input(
      z.object({
        /** The applicant's email address (used to look up the user account) */
        applicantEmail: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
      }
      const result = await sendTrialReminderToEmail(input.applicantEmail);
      if (!result.sent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.reason ?? "Failed to send reminder.",
        });
      }
      return { success: true };
    }),
});
