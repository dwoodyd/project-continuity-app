import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { createSubscriptionLink, verifyAndActivateSubscription, cancelSubscription, PRO_PLAN_PRICE_USD, PRO_PLAN_NAME, PLAN_CATALOG, type PlanKey } from "../paypal";

export const paypalRouter = router({
  // Admin-only diagnostics — returns only boolean presence checks, never actual key values
  diagnostics: adminProcedure.query(() => ({
    hasClientId: !!process.env.PAYPAL_CLIENT_ID,
    hasClientSecret: !!process.env.PAYPAL_CLIENT_SECRET,
    hasPlanId: !!process.env.PAYPAL_PLAN_ID,
    hasKeeperPlanId: !!process.env.PAYPAL_KEEPER_PLAN_ID,
    paypalEnv: process.env.PAYPAL_ENV ?? "sandbox",
  })),
  // Get billing status + plan info
  status: protectedProcedure.query(({ ctx }) => ({
    isPro: ctx.user.isPro ?? false,
    proSince: ctx.user.proSince ?? null,
    subscriptionId: ctx.user.paypalSubscriptionId ?? null,
    planName: PRO_PLAN_NAME,
    priceUsd: PRO_PLAN_PRICE_USD,
    // Pattern C billing fields
    isFoundingMember: ctx.user.isFoundingMember ?? false,
    foundingRateLocked: ctx.user.foundingRateLocked ?? false,
    foundingTier: ctx.user.foundingTier ?? null,
    billingStatus: ctx.user.billingStatus ?? "trialing_no_card",
    tier: ctx.user.tier ?? null,
    planKey: ctx.user.planKey ?? null,
    rateType: ctx.user.rateType ?? null,
    betaStartDate: ctx.user.foundingMemberJoinedAt ?? null,
    betaEndDate: ctx.user.trialEndsAt ?? null,
    daysRemaining: ctx.user.trialEndsAt
      ? Math.max(0, Math.ceil((ctx.user.trialEndsAt.getTime() - Date.now()) / 86_400_000))
      : null,
  })),

  // Get plan catalog (public — used by pricing page)
  planCatalog: protectedProcedure.query(() => PLAN_CATALOG),

  // Create a PayPal subscription and return the approval URL
  createSubscription: protectedProcedure
    .input(z.object({
      origin: z.string(),
      planKey: z.enum([
        "pro_founding_monthly", "pro_founding_annual",
        "keeper_founding_monthly", "keeper_founding_annual",
        "pro_retail_monthly", "pro_retail_annual",
        "keeper_retail_monthly", "keeper_retail_annual",
      ] as const).default("pro_founding_monthly"),
    }))
    .mutation(async ({ ctx, input }) => {
      const returnUrl = `${input.origin}/pro/success`;
      const cancelUrl = `${input.origin}/pro/cancel`;
      const approvalUrl = await createSubscriptionLink(ctx.user.id, input.planKey as PlanKey, returnUrl, cancelUrl);
      return { approvalUrl };
    }),

  // Called after PayPal redirects back with subscription_id
  confirmSubscription: protectedProcedure
    // NOTE: planKey is intentionally IGNORED — it is derived server-side from the
    // subscription's PayPal custom_id. Entitlement is only granted after PayPal
    // confirms the subscription is ACTIVE and belongs to this user.
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await verifyAndActivateSubscription(input.subscriptionId, ctx.user.id);
      } catch (err) {
        // Do NOT leak PayPal internals to the client.
        console.error("[paypal.confirmSubscription] verification failed:", err);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "We couldn't verify that subscription. If you were charged, it will activate automatically within a minute.",
        });
      }
      return { success: true };
    }),

  // Cancel subscription
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user.paypalSubscriptionId) throw new Error("No active subscription");
    await cancelSubscription(ctx.user.paypalSubscriptionId, ctx.user.id);
    return { success: true };
  }),
});
