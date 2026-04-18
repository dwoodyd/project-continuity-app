import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PRO_FEATURES = [
  { icon: "🧠", title: "Clarity Engine — Unlimited", desc: "Unlimited AI-guided thinking sessions, no daily cap." },
  { icon: "🧵", title: "Full Thread History", desc: "Unlimited check-in history and pattern analysis." },
  { icon: "📊", title: "Deep Intelligence Reports", desc: "Weekly momentum reports and project health trends." },
  { icon: "🔔", title: "Smart Push Nudges", desc: "Cold project alerts, thread-thinning warnings, and more." },
  { icon: "🗂️", title: "Knowledge Vault — Unlimited", desc: "No cap on source items, uploads, or AI mappings." },
  { icon: "🎯", title: "Priority Support", desc: "Direct access to the founder for feedback and help." },
];

export default function ProPage() {
  const [, navigate] = useLocation();
  const { data: status, isLoading } = trpc.paypal.status.useQuery();
  const createSub = trpc.paypal.createSubscription.useMutation();
  const cancelSub = trpc.paypal.cancelSubscription.useMutation();
  const utils = trpc.useUtils();
  const [cancelling, setCancelling] = useState(false);

  const handleUpgrade = async () => {
    try {
      toast("Redirecting to PayPal…", { description: "Opening secure checkout." });
      const { approvalUrl } = await createSub.mutateAsync({ origin: window.location.origin });
      window.open(approvalUrl, "_blank");
    } catch {
      toast.error("Could not start checkout. Please try again.");
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your Pro subscription? You'll keep access until the end of the billing period.")) return;
    setCancelling(true);
    try {
      await cancelSub.mutateAsync();
      await utils.paypal.status.invalidate();
      toast("Subscription cancelled", { description: "Your Pro access will remain until the period ends." });
    } catch {
      toast.error("Could not cancel. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white px-4 py-12 flex flex-col items-center">
      {/* Back */}
      <button onClick={() => navigate("/")} className="self-start text-white/40 hover:text-white/70 text-sm mb-10 flex items-center gap-1">
        ← Back
      </button>

      {/* Header */}
      <div className="text-center mb-12 max-w-lg">
        <div className="text-amber-400 text-4xl mb-4">✦</div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          {status?.isPro ? "You're on Pro" : "Continuary Pro"}
        </h1>
        <p className="text-white/50 text-lg leading-relaxed">
          {status?.isPro
            ? "Your thread is fully supported. Thank you for being here."
            : "Built for minds that work in bursts, lose the thread, and need a system that doesn't judge — just holds."}
        </p>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mb-12">
        {PRO_FEATURES.map((f) => (
          <div key={f.title} className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="font-semibold text-sm mb-1">{f.title}</div>
            <div className="text-white/50 text-xs leading-relaxed">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {status?.isPro ? (
        <div className="text-center space-y-4">
          <div className="text-amber-400 text-sm font-medium">
            Pro since {status.proSince ? new Date(status.proSince).toLocaleDateString() : "—"}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={cancelling}
            className="text-white/40 border-white/20 hover:text-red-400 hover:border-red-400/40 bg-transparent"
          >
            {cancelling ? "Cancelling…" : "Cancel subscription"}
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-3">
          <Button
            size="lg"
            onClick={handleUpgrade}
            disabled={createSub.isPending}
            className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-10 py-6 text-base rounded-2xl"
          >
            {createSub.isPending ? "Opening PayPal…" : `Upgrade for $${status?.priceUsd ?? "4.99"}/month`}
          </Button>
          <p className="text-white/30 text-xs">Secure checkout via PayPal · Cancel anytime</p>
        </div>
      )}
    </div>
  );
}
