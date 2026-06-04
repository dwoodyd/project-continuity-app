import { useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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
    // Retrieve the planKey stored before PayPal redirect so tier/rateType are set correctly
    const planKey = sessionStorage.getItem("pendingPlanKey") ?? undefined;
    sessionStorage.removeItem("pendingPlanKey");
    confirm.mutateAsync({ subscriptionId, planKey }).then(async () => {
      await utils.paypal.status.invalidate();
      const isKeeper = planKey?.startsWith("keeper");
      toast(isKeeper ? "Welcome to Keeper! ✦" : "Welcome to Pro! ✦", {
        description: "Your thread is fully supported.",
      });
      navigate("/pro");
    }).catch(() => {
      toast.error("Could not confirm subscription. Please contact support.");
      navigate("/pro");
    });
  }, [subscriptionId]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin mx-auto" />
        <p className="text-white/50 text-sm">Activating your access…</p>
      </div>
    </div>
  );
}
