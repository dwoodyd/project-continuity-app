import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, ArrowLeft, Sparkles, Star } from "lucide-react";

// ── Tier definitions ──────────────────────────────────────────────────────────
const TIERS = [
  {
    id: "free",
    name: "Free",
    tagline: "Start building continuity.",
    price: "$0",
    period: "",
    annualEquiv: null,
    foundingPrice: null,
    retailPrice: null,
    highlight: false,
    color: "neutral",
    features: [
      "3 active projects",
      "50 Knowledge Vault entries",
      "25 Scratch Pad notes",
      "5 Clarity Engine sessions / month",
      "30 Evidence Log entries",
      "10 min voice dictation / month",
      "3 AI daily plans / month",
      "Weekly Compass & Review",
      "Thread Strength tracking",
      "Idea Sanctuary",
    ],
  },
  {
    id: "pro-monthly",
    name: "Pro",
    tagline: "Your daily thread, always on.",
    price: "$7.99",
    period: "/ month",
    annualEquiv: null,
    foundingPrice: "$4.99",
    retailPrice: null,
    highlight: false,
    color: "amber",
    features: [
      "Unlimited projects, Vault & Scratch Pad",
      "Unlimited Clarity Engine sessions",
      "Unlimited Evidence Log entries",
      "Unlimited voice dictation",
      "Unlimited AI daily plans",
      "Deep Intelligence reports",
      "Smart push nudges & cold-project alerts",
      "Priority support — direct founder access",
      "Markdown / Obsidian export",
    ],
  },
  {
    id: "pro-annual",
    name: "Pro Annual",
    tagline: "Two months free. Thread secured.",
    price: "$79.99",
    period: "/ year",
    annualEquiv: "$6.67 / mo",
    foundingPrice: "$39.99",
    retailPrice: null,
    highlight: true,
    color: "amber",
    features: [
      "Everything in Pro",
      "Save $16 / year vs monthly",
      "Priority feature access",
    ],
  },
  {
    id: "keeper-monthly",
    name: "Keeper",
    tagline: "For those who go deeper.",
    price: "$14.99",
    period: "/ month",
    annualEquiv: null,
    foundingPrice: "$9.99",
    retailPrice: null,
    highlight: false,
    color: "violet",
    features: [
      "Everything in Pro",
      "Wren voice check-ins",
      "Weekly Compass deep-dive",
      "Threshold Diagnosis tool",
      "Single Focus Mode",
      "Monthly office hours with founder",
    ],
  },
  {
    id: "keeper-annual",
    name: "Keeper Annual",
    tagline: "The full Continuary experience.",
    price: "$149.99",
    period: "/ year",
    annualEquiv: "$12.50 / mo",
    foundingPrice: "$79.99",
    retailPrice: null,
    highlight: false,
    color: "violet",
    features: [
      "Everything in Keeper",
      "Save $30 / year vs monthly",
      "Early access to all new features",
    ],
  },
];

// ── Comparison table rows ─────────────────────────────────────────────────────
interface PricingRow {
  feature: string;
  free: string | boolean;
  pro: string | boolean;
  keeper: string | boolean;
}

const PRICING_TABLE: PricingRow[] = [
  { feature: "Daily check-ins (Morning, Midday, Evening)", free: true, pro: true, keeper: true },
  { feature: "Today dashboard", free: true, pro: true, keeper: true },
  { feature: "Active projects", free: "3", pro: "Unlimited", keeper: "Unlimited" },
  { feature: "Knowledge Vault entries", free: "50", pro: "Unlimited", keeper: "Unlimited" },
  { feature: "Scratch Pad notes", free: "25", pro: "Unlimited", keeper: "Unlimited" },
  { feature: "Clarity Engine sessions / month", free: "5", pro: "Unlimited", keeper: "Unlimited" },
  { feature: "Evidence Log entries", free: "30", pro: "Unlimited", keeper: "Unlimited" },
  { feature: "Voice dictation", free: "10 min / mo", pro: "Unlimited", keeper: "Unlimited" },
  { feature: "AI daily plans", free: "3 / mo", pro: "Unlimited", keeper: "Unlimited" },
  { feature: "Weekly Compass & Review", free: true, pro: true, keeper: true },
  { feature: "Thread Strength tracking", free: true, pro: true, keeper: true },
  { feature: "Idea Sanctuary", free: true, pro: true, keeper: true },
  { feature: "Deep Intelligence reports", free: false, pro: true, keeper: true },
  { feature: "Smart push nudges", free: false, pro: true, keeper: true },
  { feature: "Markdown / Obsidian export", free: true, pro: true, keeper: true },
  { feature: "Wren voice check-ins", free: false, pro: false, keeper: true },
  { feature: "Threshold Diagnosis", free: false, pro: false, keeper: true },
  { feature: "Single Focus Mode", free: false, pro: false, keeper: true },
  { feature: "Monthly office hours", free: false, pro: false, keeper: true },
  { feature: "Priority support", free: false, pro: true, keeper: true },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-4 h-4 text-amber-400 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-white/15 mx-auto" />;
  return <span className="text-xs text-white/60 text-center block">{value as string}</span>;
}

export default function ProPage() {
  const [, navigate] = useLocation();
  const { data: status, isLoading } = trpc.paypal.status.useQuery();
  const createSub = trpc.paypal.createSubscription.useMutation();
  const cancelSub = trpc.paypal.cancelSubscription.useMutation();
  const utils = trpc.useUtils();
  const [cancelling, setCancelling] = useState(false);
  const [showTable, setShowTable] = useState(false);

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
    <div className="min-h-screen bg-[#0a0a0f] text-white" style={{ paddingBottom: "max(env(safe-area-inset-bottom,0px),2rem)" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0f]/90 backdrop-blur-sm border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <ArrowLeft size={18} className="text-white/60" />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-white">Pricing</h1>
          <p className="text-xs text-white/40">Simple, honest. No dark patterns.</p>
        </div>
        {isPro && (
          <div className="flex items-center gap-1.5">
            <Star size={14} className="text-amber-400" />
            <span className="text-xs text-amber-400 font-medium">Pro active</span>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/20 text-amber-400 text-xs font-semibold tracking-wide mb-4">
            <Sparkles className="w-3 h-3" /> Founding rates available now
          </div>
          <h1 className="font-brand text-3xl text-white mb-3">
            {isPro ? "Your thread is fully supported." : "Start free. Go deeper when you're ready."}
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
            {isPro
              ? "All limits lifted. Thank you for being here."
              : "Founding rates are locked for life — they never increase even as retail pricing rises."}
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-3">
          {TIERS.map((tier) => {
            const isAmber = tier.color === "amber";
            const isViolet = tier.color === "violet";
            const borderClass = isAmber
              ? "border-amber-500/40 bg-amber-500/5"
              : isViolet
              ? "border-violet-500/30 bg-violet-500/5"
              : "border-white/10 bg-white/[0.02]";
            const btnClass = isAmber
              ? "bg-amber-500 hover:bg-amber-400 text-black"
              : isViolet
              ? "bg-violet-500 hover:bg-violet-400 text-white"
              : "bg-white/10 hover:bg-white/20 text-white";

            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl border p-5 flex flex-col gap-3 ${borderClass} ${tier.highlight ? "ring-1 ring-amber-500/40" : ""}`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-500 text-black text-xs font-bold px-3 py-0.5 rounded-full">BEST VALUE</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white text-sm">{tier.name}</span>
                    {tier.foundingPrice && (
                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-300 border-amber-500/25">
                        Founding Rate
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-white/45">{tier.tagline}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  {tier.foundingPrice ? (
                    <>
                      <span className="text-2xl font-bold text-white">{tier.foundingPrice}</span>
                      <span className="text-sm text-white/35">{tier.period}</span>
                      <span className="text-xs text-white/25 line-through ml-1">{tier.price}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-white">{tier.price}</span>
                      {tier.period && <span className="text-sm text-white/35">{tier.period}</span>}
                    </>
                  )}
                </div>

                {tier.annualEquiv && (
                  <p className="text-xs text-emerald-400 -mt-2">≈ {tier.annualEquiv} with founding rate</p>
                )}

                <ul className="space-y-1.5 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-white/65">
                      <Check size={11} className="text-emerald-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {tier.id === "free" ? (
                  isPro ? (
                    <Button variant="outline" size="sm" className="w-full bg-transparent border-white/15 text-white/40 cursor-default" disabled>
                      Current plan
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full bg-transparent border-white/15 text-white/50" onClick={() => navigate("/")}>
                      Continue free
                    </Button>
                  )
                ) : isPro && (tier.id === "pro-monthly" || tier.id === "pro-annual") ? (
                  <Button variant="outline" size="sm" className="w-full bg-transparent border-white/15 text-white/40 cursor-default" disabled>
                    Active
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className={`w-full font-semibold ${btnClass}`}
                    onClick={handleUpgrade}
                    disabled={createSub.isPending}
                  >
                    {createSub.isPending ? "Opening PayPal…" : tier.id === "free" ? "Start free" : `Lock in ${tier.name}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Cancel option for active Pro */}
        {isPro && (
          <div className="text-center mb-8 space-y-2">
            <p className="text-xs text-white/30">
              Pro since {status?.proSince ? new Date(status.proSince).toLocaleDateString() : "—"}
            </p>
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}
              className="text-white/40 border-white/15 hover:text-red-400 hover:border-red-400/40 bg-transparent">
              {cancelling ? "Cancelling…" : "Cancel subscription"}
            </Button>
          </div>
        )}

        {/* Comparison table toggle */}
        <div className="mb-8">
          <button
            onClick={() => setShowTable(!showTable)}
            className="w-full text-center text-xs text-white/35 hover:text-white/60 transition-colors py-3 border border-white/8 rounded-xl"
          >
            {showTable ? "Hide" : "Show"} full feature comparison ↓
          </button>

          {showTable && (
            <div className="mt-4 rounded-2xl border border-white/8 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] bg-white/[0.03]">
                <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/25">Feature</div>
                <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/25 text-center w-16">Free</div>
                <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-amber-400 text-center w-16">Pro</div>
                <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-violet-400 text-center w-16">Keeper</div>
              </div>
              {PRICING_TABLE.map((row, i) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-[1fr_auto_auto_auto] border-t border-white/[0.05]"
                  style={{ background: i % 2 === 0 ? "transparent" : "oklch(1 0 0 / 0.012)" }}
                >
                  <div className="px-4 py-2.5 text-xs text-white/60">{row.feature}</div>
                  <div className="px-4 py-2.5 text-center w-16 flex items-center justify-center"><Cell value={row.free} /></div>
                  <div className="px-4 py-2.5 text-center w-16 flex items-center justify-center"><Cell value={row.pro} /></div>
                  <div className="px-4 py-2.5 text-center w-16 flex items-center justify-center"><Cell value={row.keeper} /></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-white/18 text-xs text-center max-w-sm mx-auto pb-8">
          Continuary is built by one person, for people who work differently. Your subscription directly funds continued development.
          <br /><br />
          Secure checkout via PayPal · Cancel anytime · No hidden fees
        </p>
      </div>
    </div>
  );
}
