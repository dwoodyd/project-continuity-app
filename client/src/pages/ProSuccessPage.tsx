import { useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import notify from "@/lib/notify";

export default function ProSuccessPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const subscriptionId = params.get("subscription_id");
  const confirm = trpc.paypal.confirmSubscription.useMutation();
  const utils = trpc.useUtils();
  const ran = useRef(false);

  useEffect(() => {
    if (!subscriptionId || ran.current) return;
    ran.current = true;
    // planKey is used only for the local welcome message; the server derives the
    // real entitlement from PayPal's verified custom_id, not from this value.
    const planKey = sessionStorage.getItem("pendingPlanKey") ?? undefined;
    sessionStorage.removeItem("pendingPlanKey");
    confirm.mutateAsync({ subscriptionId }).then(async () => {
      await utils.paypal.status.invalidate();
      const isKeeper = planKey?.startsWith("keeper");
      notify.info(isKeeper ? "Welcome to Keeper! ✦" : "Welcome to Pro! ✦", {
        description: "Your thread is fully supported.",
      });
      navigate("/pro");
    }).catch(() => {
      notify.error("Could not confirm subscription. Please contact support.");
      navigate("/pro");
    });
  }, [subscriptionId]);

  if (!subscriptionId) {
    return (
      <main className="min-h-screen bg-[#080F26] px-6 py-16 text-[#FDF9F0] flex items-center justify-center">
        <section className="w-full max-w-md text-center space-y-5" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F6BE53]">Payment return</p>
          <h1 className="font-brand text-4xl leading-tight">We couldn&apos;t find a PayPal confirmation.</h1>
          <p className="text-sm leading-6 text-[#DDE3F0]">
            Your access will update automatically when PayPal confirms your subscription. If you completed payment and this page does not update shortly, contact us and we&apos;ll help.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/pro")}
              className="min-h-11 rounded-full bg-[#EFA201] px-5 text-sm font-semibold text-[#080F26] transition-transform active:scale-[0.98]"
            >
              Back to pricing
            </button>
            <a
              href="mailto:hello@continuary.app?subject=PayPal%20subscription%20return"
              className="inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold text-[#F6BE53] underline underline-offset-4"
            >
              Contact support
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin mx-auto" />
        <p className="text-white/50 text-sm">Activating your access…</p>
      </div>
    </div>
  );
}
