/**
 * Invites router — beta invite code management
 *
 * Admin procedures:
 *   invites.generate      — create a new single-use invite code
 *   invites.bulkGenerate  — create N codes at once (max 50)
 *   invites.list          — list all codes created by the current admin
 *
 * Protected procedures:
 *   invites.validate  — check whether a code is valid and unused (used during onboarding)
 *   invites.redeem    — mark a code as used by the current user (called at onboarding completion)
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createInviteCode,
  getInviteCodes,
  validateInviteCode,
  markInviteUsed,
  setUserInviteCode,
} from "../db";

export const invitesRouter = router({
  // ── Admin: generate a single new code ────────────────────────────────────
  generate: protectedProcedure
    .input(z.object({
      label: z.string().max(255).optional(),
      expiresInDays: z.number().int().min(1).max(365).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can generate invite codes." });
      }
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;
      const invite = await createInviteCode(ctx.user.id, input.label, expiresAt);
      return invite;
    }),

  // ── Admin: bulk generate N codes at once (max 50) ────────────────────────
  bulkGenerate: protectedProcedure
    .input(z.object({
      count: z.number().int().min(1).max(50),
      labelPrefix: z.string().max(100).optional(),
      expiresInDays: z.number().int().min(1).max(365).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can generate invite codes." });
      }
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;
      const codes = [];
      for (let i = 0; i < input.count; i++) {
        const label = input.labelPrefix ? `${input.labelPrefix} ${i + 1}` : undefined;
        const invite = await createInviteCode(ctx.user.id, label, expiresAt);
        codes.push(invite);
      }
      return { codes, count: codes.length };
    }),

  // ── Admin: list all codes created by this admin ───────────────────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can view invite codes." });
    }
    return getInviteCodes(ctx.user.id);
  }),

  // ── Protected: validate a code (does not consume it) ─────────────────────
  // Returns { valid: true } or throws BAD_REQUEST.
  // Called from the onboarding UI to give instant feedback before submission.
  validate: protectedProcedure
    .input(z.object({ code: z.string().min(1).max(32) }))
    .query(async ({ input }) => {
      const invite = await validateInviteCode(input.code);
      if (!invite) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite code is invalid or has already been used.",
        });
      }
      return { valid: true, label: invite.label };
    }),

  // ── Protected: redeem a code (consumes it, ties it to the current user) ──
  // Called once at the end of onboarding after the user's profile is saved.
  redeem: protectedProcedure
    .input(z.object({ code: z.string().min(1).max(32) }))
    .mutation(async ({ ctx, input }) => {
      // First validate
      const invite = await validateInviteCode(input.code);
      if (!invite) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invite code is invalid or has already been used.",
        });
      }
      // Atomically mark as used
      const ok = await markInviteUsed(input.code, ctx.user.id);
      if (!ok) {
        // Race condition: another request used it between validate and markInviteUsed
        throw new TRPCError({
          code: "CONFLICT",
          message: "This invite code was just used by another account. Please request a new code.",
        });
      }
      // Record which code this user redeemed (for audit trail)
      await setUserInviteCode(ctx.user.id, input.code.toUpperCase().trim());
      return { redeemed: true };
    }),
});
