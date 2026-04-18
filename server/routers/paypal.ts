import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createSubscriptionLink, activateSubscription, cancelSubscription, PRO_PLAN_PRICE_USD, PRO_PLAN_NAME } from "../paypal";

export const paypalRouter = router({
  // Get Pro status + plan info
  status: protectedProcedure.query(({ ctx }) => ({
    isPro: ctx.user.isPro ?? false,
    proSince: ctx.user.proSince ?? null,
    subscriptionId: ctx.user.paypalSubscriptionId ?? null,
    planName: PRO_PLAN_NAME,
    priceUsd: PRO_PLAN_PRICE_USD,
  })),

  // Create a PayPal subscription and return the approval URL
  createSubscription: protectedProcedure
    .input(z.object({ origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const returnUrl = `${input.origin}/pro/success`;
      const cancelUrl = `${input.origin}/pro/cancel`;
      const approvalUrl = await createSubscriptionLink(ctx.user.id, returnUrl, cancelUrl);
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
