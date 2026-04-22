import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, X, Sparkles, ArrowLeft } from "lucide-react";

interface PricingRow {
  feature: string;
  free: string | boolean;
  pro: string | boolean;
}

const PRICING_TABLE: PricingRow[] = [
  { feature: "Daily check-ins (Morning, Midday, Evening)", free: true, pro: true },
  { feature: "Today Command Center", free: true, pro: true },
  { feature: "Projects (active)", free: "3 projects", pro: "Unlimited" },
  { feature: "Knowledge Vault entries", free: "50 entries", pro: "Unlimited" },
  { feature: "Scratch Pad notes", free: "25 notes", pro: "Unlimited" },
  { feature: "Clarity Engine sessions / month", free: "5 sessions", pro: "Unlimited" },
  { feature: "Evidence Log entries", free: "30 entries", pro: "Unlimited" },
  { feature: "Weekly Compass & Review", free: true, pro: true },
  { feature: "Intelligence dashboard", free: "7-day view", pro: "Full history" },
  { feature: "Thread Strength tracking", free: true, pro: true },
  { feature: "Idea Sanctuary (quick capture)", free: true, pro: true },
  { feature: "Voice dictation (Whisper AI)", free: "10 min / month", pro: "Unlimited" },
  { feature: "AI-generated daily plans", free: "3 / month", pro: "Unlimited" },
  { feature: "Deep Intelligence reports", free: false, pro: true },
  { feature: "Smart push nudges & cold-project alerts", free: false, pro: true },
  { feature: "Priority support (direct founder access)", free: false, pro: true },
  { feature: "Markdown / Obsidian export", free: true, pro: true },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-4 h-4 text-amber-400 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-white/20 mx-auto" />;
  return <span className="text-xs text-white/70">{value as string}</span>;
}

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

  const isPro = status?.isPro ?? false;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white px-4 py-10 flex flex-col items-center">
      {/* Back */}
      <button
        onClick={() => navigate("/")}
        className="self-start text-white/40 hover:text-white/70 text-sm mb-8 flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="text-center mb-10 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/20 text-amber-400 text-xs font-semibold tracking-wide mb-4">
          <Sparkles className="w-3 h-3" /> Continuary Pro
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          {isPro ? "You're on Pro — thank you." : "Simple, honest pricing"}
        </h1>
        <p className="text-white/50 text-base leading-relaxed">
          {isPro
            ? "Your thread is fully supported. All limits are lifted."
            : "Start free. Upgrade when you're ready. No dark patterns, no surprise charges."}
        </p>
      </div>

      {/* Tier cards */}
      <div className="w-full max-w-2xl grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">Free</p>
            <p className="text-3xl font-bold">$0</p>
            <p className="text-white/40 text-xs mt-1">Forever free · No credit card</p>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">Everything you need to start building continuity. Generous limits for solo use.</p>
        </div>
        <div
          className="rounded-2xl border p-6 relative overflow-hidden"
          style={{ borderColor: "oklch(0.80 0.17 65 / 0.35)", background: "oklch(0.80 0.17 65 / 0.06)" }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 80% 20%, oklch(0.80 0.17 65 / 0.08) 0%, transparent 60%)" }} />
          <div className="mb-4 relative">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1">Pro</p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-bold">${status?.priceUsd ?? "4.99"}</p>
              <p className="text-white/40 text-sm">/month</p>
            </div>
            <p className="text-white/40 text-xs mt-1">Cancel anytime · Secure via PayPal</p>
          </div>
          <p className="text-white/60 text-sm leading-relaxed relative">Unlimited everything. Deep Intelligence. Smart nudges. Built for serious continuity.</p>
        </div>
      </div>

      {/* Comparison table */}
      <div className="w-full max-w-2xl mb-10 rounded-2xl border border-white/8 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] bg-white/[0.03]">
          <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/30">Feature</div>
          <div className="px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white/30 text-center w-24">Free</div>
          <div className="px-6 py-3 text-xs font-semibold uppercase tracking-widest text-amber-400 text-center w-24">Pro</div>
        </div>
        {PRICING_TABLE.map((row, i) => (
          <div
            key={row.feature}
            className="grid grid-cols-[1fr_auto_auto] border-t border-white/[0.06]"
            style={{ background: i % 2 === 0 ? "transparent" : "oklch(1 0 0 / 0.015)" }}
          >
            <div className="px-4 py-3 text-sm text-white/70">{row.feature}</div>
            <div className="px-6 py-3 text-center w-24 flex items-center justify-center"><Cell value={row.free} /></div>
            <div className="px-6 py-3 text-center w-24 flex items-center justify-center"><Cell value={row.pro} /></div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {isPro ? (
        <div className="text-center space-y-4">
          <div className="text-amber-400 text-sm font-medium">
            Pro since {status?.proSince ? new Date(status.proSince).toLocaleDateString() : "—"}
          </div>
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}
            className="text-white/40 border-white/20 hover:text-red-400 hover:border-red-400/40 bg-transparent">
            {cancelling ? "Cancelling…" : "Cancel subscription"}
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-3">
          <Button size="lg" onClick={handleUpgrade} disabled={createSub.isPending}
            className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-10 py-6 text-base rounded-2xl">
            {createSub.isPending ? "Opening PayPal…" : `Upgrade to Pro — $${status?.priceUsd ?? "4.99"}/month`}
          </Button>
          <p className="text-white/30 text-xs">Secure checkout via PayPal · Cancel anytime · No hidden fees</p>
        </div>
      )}

      <p className="mt-12 text-white/20 text-xs text-center max-w-sm">
        Continuary is built by one person, for people who work differently. Your subscription directly funds continued development.
      </p>
    </div>
  );
}
