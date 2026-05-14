import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createSubscriptionLink, activateSubscription, cancelSubscription, PRO_PLAN_PRICE_USD, PRO_PLAN_NAME, PLAN_CATALOG, type PlanKey } from "../paypal";

export const paypalRouter = router({
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
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await activateSubscription(input.subscriptionId, ctx.user.id);
      return { success: true };
    }),

  // Cancel subscription
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user.paypalSubscriptionId) throw new Error("No active subscription");
    await cancelSubscription(ctx.user.paypalSubscriptionId, ctx.user.id);
    return { success: true };
  }),
});
