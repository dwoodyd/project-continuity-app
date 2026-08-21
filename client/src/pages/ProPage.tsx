import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import notify from "@/lib/notify";
import { Check, X, ArrowLeft, Sparkles, Star, Crown, ChevronDown, ChevronUp } from "lucide-react";
import { PageMeta } from "@/components/PageMeta";

type PlanKey =
  | "pro_founding_monthly" | "pro_founding_annual"
  | "keeper_founding_monthly" | "keeper_founding_annual"
  | "pro_retail_monthly" | "pro_retail_annual"
  | "keeper_retail_monthly" | "keeper_retail_annual";

const PRICING = {
  pro: {
    foundingMonthly: "4.99", foundingAnnual: "39.99", foundingAnnualEquiv: "3.33",
    retailMonthly: "7.99", retailAnnual: "79.99",
    planKeys: {
      foundingMonthly: "pro_founding_monthly" as PlanKey, foundingAnnual: "pro_founding_annual" as PlanKey,
      retailMonthly: "pro_retail_monthly" as PlanKey, retailAnnual: "pro_retail_annual" as PlanKey,
    },
  },
  keeper: {
    foundingMonthly: "9.99", foundingAnnual: "79.99", foundingAnnualEquiv: "6.67",
    retailMonthly: "14.99", retailAnnual: "149.99",
    planKeys: {
      foundingMonthly: "keeper_founding_monthly" as PlanKey, foundingAnnual: "keeper_founding_annual" as PlanKey,
      retailMonthly: "keeper_retail_monthly" as PlanKey, retailAnnual: "keeper_retail_annual" as PlanKey,
    },
  },
};

interface PricingRow { feature: string; free: string | boolean; pro: string | boolean; keeper: string | boolean; }
const PRICING_TABLE: PricingRow[] = [
  // Core daily tools
  { feature: "Daily check-ins (Morning, Midday, Evening)", free: true, pro: true, keeper: true },
  { feature: "Today dashboard", free: true, pro: true, keeper: true },
  { feature: "Projects", free: true, pro: true, keeper: true },
  { feature: "Clarity Engine", free: "Basic", pro: "Full", keeper: "Full" },
  { feature: "Knowledge Vault", free: true, pro: true, keeper: true },
  { feature: "Scratch Pad", free: true, pro: true, keeper: true },
  { feature: "Evidence Log", free: true, pro: true, keeper: true },
  { feature: "Emotional Cycle", free: true, pro: true, keeper: true },
  { feature: "Weekly Review", free: "Basic", pro: "Full", keeper: "Full" },
  { feature: "Intelligence", free: "Basic", pro: "Full", keeper: "Full" },
  { feature: "Weekly Compass", free: true, pro: true, keeper: true },
  { feature: "Weekly Compass deep-dive", free: false, pro: false, keeper: true },
  { feature: "Thread Strength tracking", free: true, pro: true, keeper: true },
  { feature: "Threshold Diagnosis", free: true, pro: true, keeper: true },
  { feature: "Markdown / Obsidian export", free: true, pro: true, keeper: true },
  // Focus Sessions
  { feature: "Focus Sessions — on-demand", free: "1 / week", pro: "Unlimited", keeper: "Unlimited" },
  { feature: "Focus Sessions — ambient soundscapes", free: true, pro: true, keeper: true },
  { feature: "Focus Sessions — chat with Wren", free: true, pro: true, keeper: true },
  { feature: "Focus Sessions — Wren check-ins", free: true, pro: true, keeper: true },
  { feature: "Focus Sessions — book ahead", free: false, pro: true, keeper: true },
  { feature: "Focus Sessions — recurring sessions", free: false, pro: true, keeper: true },
  { feature: "Focus Sessions — pop-out window", free: false, pro: true, keeper: true },
  { feature: "Focus Sessions — picture-in-picture (PIP)", free: false, pro: true, keeper: true },
  { feature: "Focus Sessions — export weave", free: false, pro: true, keeper: true },
  { feature: "Focus Sessions — chat history", free: "Current session", pro: "Last 7 days", keeper: "Full history" },
  // Single Focus Mode
  { feature: "Single Focus Mode — active focuses", free: "1 (up to 60 days)", pro: "Up to 2 (365 days)", keeper: "Unlimited" },
  { feature: "Single Focus Mode — Wren daily prompts", free: false, pro: true, keeper: true },
  { feature: "Single Focus Mode — past focuses history", free: "Last 3", pro: "Unlimited", keeper: "Unlimited" },
  { feature: "Single Focus Mode — export focus log", free: false, pro: true, keeper: true },
  // Studios (Phase 2)
  { feature: "Studios — Wren-hosted group focus sessions", free: false, pro: true, keeper: "Priority" },
  // Keeper-only
  { feature: "Deep Intelligence reports", free: false, pro: true, keeper: true },
  { feature: "Priority support — direct founder access", free: false, pro: true, keeper: true },
  { feature: "Monthly office hours with founder", free: false, pro: false, keeper: true },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-4 h-4 text-[#C8452B] mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-[#6B6F68] mx-auto" />;
  return <span className="text-xs text-[#6B6F68] text-center block">{value as string}</span>;
}

export default function ProPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: status, isLoading } = trpc.paypal.status.useQuery(undefined, { enabled: !!user });
  const { data: slots, error: slotsError } = trpc.founding.slots.useQuery(undefined, {
    staleTime: 40_000,
    retry: false,
  });
  const createSub = trpc.paypal.createSubscription.useMutation();
  const cancelSub = trpc.paypal.cancelSubscription.useMutation();
  const utils = trpc.useUtils();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [cancelling, setCancelling] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const isFoundingMember = status?.isFoundingMember ?? user?.isFoundingMember ?? false;
  const billingStatus = status?.billingStatus ?? "trialing_no_card";
  const foundingTier = status?.foundingTier ?? null;
  const isPro = status?.isPro ?? false;
  const isActive = billingStatus === "active";

  const handleUpgrade = async (planKey: PlanKey, tierLabel: string) => {
    if (!user) { window.open("https://continuary.app/#apply", "_blank"); return; }
    try {
      notify.info(`Redirecting to PayPal…`, { description: `Opening secure checkout for ${tierLabel}.` });
      const { approvalUrl } = await createSub.mutateAsync({ origin: window.location.origin, planKey });
      sessionStorage.setItem("pendingPlanKey", planKey);
      // The approval URL arrives after an async mutation, so a new-tab call here
      // is treated as a popup by Safari and many privacy-focused browsers. Navigate
      // the current tab instead; PayPal returns to the configured success/cancel URL.
      window.location.assign(approvalUrl);
    } catch {
      notify.error("Could not start checkout. Please try again.");
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your subscription? You'll keep access until the end of the billing period.")) return;
    setCancelling(true);
    try {
      await cancelSub.mutateAsync();
      await utils.paypal.status.invalidate();
      notify.info("Subscription cancelled", { description: "Your access will remain until the period ends." });
    } catch {
      notify.error("Could not cancel. Please try again.");
    } finally { setCancelling(false); }
  };

  const getPlanKey = (tier: "pro" | "keeper"): PlanKey => {
    const p = PRICING[tier];
    if (isFoundingMember) return billing === "annual" ? p.planKeys.foundingAnnual : p.planKeys.foundingMonthly;
    return billing === "annual" ? p.planKeys.retailAnnual : p.planKeys.retailMonthly;
  };

  // Pattern C CTA: "Reserve X at this rate" for founding members not yet active
  const getCtaLabel = (tier: "pro" | "keeper"): { label: string; sublabel?: string; disabled: boolean; variant: "current" | "upgrade" | "downgrade" | "lock" | "apply" } => {
    if (!user) return { label: "Apply for access", disabled: false, variant: "apply" };
    if (!isActive) {
      const tierName = tier === "pro" ? "Pro" : "Keeper";
      if (isFoundingMember) {
        return {
          label: `Reserve ${tierName} at this rate`,
          sublabel: "No card now — beta access stays free. Your founding rate is locked for life when you upgrade.",
          disabled: false, variant: "lock",
        };
      }
      return { label: `Lock in ${tierName}`, disabled: false, variant: "lock" };
    }
    const currentTier = foundingTier ?? (isPro ? "pro" : null);
    if (currentTier === tier) return { label: "Your active plan", disabled: true, variant: "current" };
    if (tier === "keeper" && currentTier === "pro") return { label: "Upgrade to Keeper", disabled: false, variant: "upgrade" };
    if (tier === "pro" && currentTier === "keeper") return { label: "Switch to Pro", disabled: false, variant: "downgrade" };
    return { label: `Lock in ${tier === "pro" ? "Pro" : "Keeper"}`, disabled: false, variant: "lock" };
  };

  if (isLoading && user) return (
    <div className="min-h-screen bg-[#F4F5F2] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#C9CCC5] border-t-[#C8452B] rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <PageMeta
        title="Continuary Pricing — Free, Pro & Keeper Plans"
        description="Founding rates locked for life: Pro $4.99/mo, Keeper $9.99/mo. Free tier always available. 100 founding slots — reviewed personally."
        path="/pricing"
      />
    <main id="main-content" className="public-theme-surface min-h-screen bg-[#F4F5F2] text-[#2A2D28]" style={{ paddingBottom: "max(env(safe-area-inset-bottom,0px),2rem)" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#F4F5F2] border-b border-[#D3D6D0] px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="min-h-11 min-w-11 p-1.5 hover:bg-[#E6E8E3] transition-colors" aria-label="Back to Continuary home">
          <ArrowLeft size={18} className="text-[#6B6F68]" aria-hidden="true" />
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#2A2D28]">Pricing</p>
          <p className="text-xs text-[#6B6F68]">Simple, honest. No dark patterns.</p>
        </div>
        {isFoundingMember && (
          <div className="flex items-center gap-1.5 px-2 py-1 border border-[#C8452B]/30 bg-[#F8E5DF]">
            <Crown size={12} className="text-[#C8452B]" />
            <span className="text-xs text-[#C8452B] font-semibold tracking-wide">FOUNDING MEMBER</span>
          </div>
        )}
        {!isFoundingMember && isPro && (
          <div className="flex items-center gap-1.5">
            <Star size={14} className="text-[#C8452B]" />
            <span className="text-xs text-[#C8452B] font-medium">Pro active</span>
          </div>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-8">
        {/* Non-founding member banner */}
        {!isFoundingMember && (
          <div className="mb-6 px-4 py-3 rounded-xl border border-[#C8452B]/30 bg-[#F8E5DF] flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#6B6F68]">
              {slots?.remaining === 0
                ? "Founding seats are full. Join the waitlist and we'll reach out when one opens."
                : "Continuary is currently invite-only. No account needed to see pricing."}
            </p>
            {slots?.remaining === 0 ? (
              <a href="/waitlist"
                className="inline-flex min-h-11 items-center text-xs text-[#C8452B] font-semibold hover:text-[#C8452B] transition-colors">
                Join the waitlist →
              </a>
            ) : (
              <a href="https://continuary.app/#apply" target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-xs text-[#C8452B] font-semibold hover:text-[#C8452B] transition-colors">
                Apply for a slot →
              </a>
            )}
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-8">
          {isFoundingMember ? (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C8452B]/30 text-[#C8452B] text-xs font-semibold tracking-wide mb-4">
                <Crown className="w-3 h-3" /> Your founding rate is locked for life
              </div>
              <h1 className="font-brand text-3xl text-[#2A2D28] mb-3">
                {isActive ? "Your thread is fully supported." : "Lock in your founding rate whenever you're ready."}
              </h1>
              <p className="text-[#6B6F68] text-sm leading-relaxed max-w-sm mx-auto">
                {isActive
                  ? "Founding rate. Locked for life. Thank you for being here."
                  : "No card required during beta. Your founding rate is reserved — it never increases even as retail pricing rises."}
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C8452B]/30 text-[#C8452B] text-xs font-semibold tracking-wide mb-4">
                <Sparkles className="w-3 h-3" /> Founding rates available now
              </div>
              <h1 className="font-brand text-3xl text-[#2A2D28] mb-3">Start free. Go deeper when you're ready.</h1>
              <p className="text-[#6B6F68] text-sm leading-relaxed max-w-sm mx-auto">
                Founding rates are locked for life.{" "}
                {slotsError || slots === undefined ? (
                  <span>100 slots total — reviewed personally.</span>
                ) : slots.remaining === 0 ? (
                  <span className="text-[#C8452B] font-semibold">Founding seats are full — join the waitlist.</span>
                ) : slots.remaining <= 5 ? (
                  <span className="text-[#C8452B] font-semibold">Only {slots.remaining} founding {slots.remaining === 1 ? "seat" : "seats"} left.</span>
                ) : (
                  <span>{slots.remaining} of 100 founding seats left.</span>
                )}
              </p>
            </>
          )}
        </div>

        <aside className="mb-8 border-y border-[#D3D6D0] py-4 text-center" aria-label="Your data and exports">
          <p className="text-sm leading-6 text-[#6B6F68]">
            Your words remain yours. <span className="font-semibold text-[#2A2D28]">Export as Markdown any time—on every plan, including Free.</span>
          </p>
        </aside>

        {/* Billing toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#E6E8E3] border border-[#D3D6D0]">
            <button onClick={() => setBilling("monthly")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${billing === "monthly" ? "bg-[#E6E8E3] text-[#2A2D28]" : "text-[#6B6F68] hover:text-[#6B6F68]"}`}>
              Monthly
            </button>
            <button onClick={() => setBilling("annual")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${billing === "annual" ? "bg-[#E6E8E3] text-[#2A2D28]" : "text-[#6B6F68] hover:text-[#6B6F68]"}`}>
              Annual
              <span className="text-[#2A2D28] text-xs font-bold bg-[#DDE0DA] border border-[#C9CCC5] px-1.5 py-0.5 rounded-full">SAVE ~33%</span>
            </button>
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-3">
          {/* Free */}
          <div className="rounded-2xl border border-[#D3D6D0] bg-[#E6E8E3] p-5 flex flex-col gap-3">
            <div>
              <span className="font-semibold text-[#2A2D28] text-sm">Free</span>
              <p className="text-xs text-[#6B6F68] mt-0.5">Start building continuity.</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#2A2D28]">$0</span>
              <span className="text-sm text-[#6B6F68]">forever</span>
            </div>
            <ul className="space-y-1.5 flex-1">
              {[
                "All daily check-ins",
                "Today dashboard & projects",
                "Knowledge Vault & Scratch Pad",
                "Evidence Log & Emotional Cycle",
                "Weekly Compass & Review",
                "Markdown export — always free",
                "Clarity Engine (basic)",
                "Single Focus Mode (1 active, 60 days)",
                "Focus Sessions (1 / week, chat with Wren)",
                "Thread Strength & Threshold Diagnosis",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-[#6B6F68]">
                  <Check size={11} className="text-[#6B6F68] mt-0.5 shrink-0" />{f}
                </li>
              ))}
            </ul>
            {user ? (
              <Button variant="outline" size="sm" className="w-full bg-transparent border-[#D3D6D0] text-[#6B6F68]" onClick={() => navigate("/")}>
                Continue free
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="w-full bg-transparent border-[#D3D6D0] text-[#6B6F68]"
                onClick={() => window.open("https://continuary.app", "_blank")}>
                Start free
              </Button>
            )}
          </div>

        {/* Pro */}
        {(() => {
          const p = PRICING.pro;
          // Always lead with founding price — it's the active offer during beta
          const monthly = p.foundingMonthly;
          const annual = p.foundingAnnual;
          const annualEquiv = p.foundingAnnualEquiv;
          const displayPrice = billing === "annual" ? annual : monthly;
          const retailStrike = billing === "annual" ? p.retailAnnual : p.retailMonthly; // always shown
          const cta = getCtaLabel("pro");
          return (
            <div className="relative rounded-2xl border border-[#C8452B]/30 bg-[#F8E5DF] p-5 flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[#2A2D28] text-sm">Pro</span>
                  <Badge variant="outline" className="text-xs bg-[#F8E5DF] text-[#C8452B] border-[#C8452B]/30">Founding Rate</Badge>
                </div>
                <p className="text-xs text-[#6B6F68]">Your daily thread, always on.</p>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[#2A2D28]">${displayPrice}</span>
                  <span className="text-sm text-[#6B6F68]">/ {billing === "annual" ? "yr" : "mo"}</span>
                  <span className="text-xs text-[#6B6F68] line-through ml-1">${retailStrike}</span>
                  <span className="text-xs text-[#6B6F68] ml-0.5">at launch</span>
                </div>
                {billing === "annual" && (
                  <p className="text-xs text-emerald-400 font-semibold mt-0.5">≈ ${annualEquiv} / mo · <span className="text-emerald-300">save ~33%</span></p>
                )}
                <p className="text-xs text-[#C8452B]/60 mt-0.5">Founding rate — locked for life</p>
              </div>
                <ul className="space-y-1.5 flex-1">
                  {[
                    "Everything in Free — unlimited",
                    "Unlimited Focus Sessions",
                    "Focus Sessions: book ahead, recurring, pop-out, PIP, export weave",
                    "Single Focus Mode: 2 focuses, Wren prompts, 365-day max",
                    "Deep Intelligence reports",
                    "Priority support — direct founder access",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-[#6B6F68]">
                      <Check size={11} className="text-[#C8452B] mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <div className="space-y-1.5">
                  <Button
                    size="sm"
                    className={`w-full font-semibold ${cta.disabled ? "bg-[#E6E8E3] text-[#6B6F68] cursor-default" : "bg-[#C8452B] hover:bg-[#AB3823] text-white"}`}
                    onClick={() => !cta.disabled && handleUpgrade(getPlanKey("pro"), "Pro")}
                    disabled={cta.disabled || createSub.isPending}
                  >
                    {createSub.isPending ? "Opening PayPal…" : cta.label}
                  </Button>
                  {cta.sublabel && (
                    <p className="text-xs text-[#6B6F68] text-center leading-relaxed">{cta.sublabel}</p>
                  )}
                </div>
              </div>
            );
          })()}

        {/* Keeper */}
        {(() => {
          const k = PRICING.keeper;
          // Always lead with founding price — it's the active offer during beta
          const monthly = k.foundingMonthly;
          const annual = k.foundingAnnual;
          const annualEquiv = k.foundingAnnualEquiv;
          const displayPrice = billing === "annual" ? annual : monthly;
          const retailStrike = billing === "annual" ? k.retailAnnual : k.retailMonthly; // always shown
          const cta = getCtaLabel("keeper");
          return (
            <div className="relative rounded-2xl border border-[#C8452B]/30 bg-[#F8E5DF] p-5 flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[#2A2D28] text-sm">Keeper</span>
                  <Badge variant="outline" className="text-xs bg-[#F8E5DF] text-[#C8452B] border-[#C8452B]/30">Founding Rate</Badge>
                </div>
                <p className="text-xs text-[#6B6F68]">For those who go deeper.</p>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[#2A2D28]">${displayPrice}</span>
                  <span className="text-sm text-[#6B6F68]">/ {billing === "annual" ? "yr" : "mo"}</span>
                  <span className="text-xs text-[#6B6F68] line-through ml-1">${retailStrike}</span>
                  <span className="text-xs text-[#6B6F68] ml-0.5">at launch</span>
                </div>
                {billing === "annual" && (
                  <p className="text-xs text-emerald-400 font-semibold mt-0.5">≈ ${annualEquiv} / mo · <span className="text-emerald-300">save ~33%</span></p>
                )}
                <p className="text-xs text-[#C8452B]/60 mt-0.5">Founding rate — locked for life</p>
              </div>
                <ul className="space-y-1.5 flex-1">
                  {[
                    "Everything in Pro",
                    "Unlimited Single Focus Mode — no duration cap",
                    "Weekly Compass deep-dive",
                    "Studios — priority access (Phase 2)",
                    "Monthly office hours with founder",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-[#6B6F68]">
                      <Check size={11} className="text-[#C8452B] mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <div className="space-y-1.5">
                  <Button
                    size="sm"
                    className={`w-full font-semibold ${cta.disabled ? "bg-[#E6E8E3] text-[#6B6F68] cursor-default" : "bg-[#C8452B] hover:bg-[#AB3823] text-white"}`}
                    onClick={() => !cta.disabled && handleUpgrade(getPlanKey("keeper"), "Keeper")}
                    disabled={cta.disabled || createSub.isPending}
                  >
                    {createSub.isPending ? "Opening PayPal…" : cta.label}
                  </Button>
                  {cta.sublabel && (
                    <p className="text-xs text-[#6B6F68] text-center leading-relaxed">{cta.sublabel}</p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Cancel option */}
        {isActive && (
          <div className="text-center mb-8 space-y-2">
            <p className="text-xs text-[#6B6F68]">
              Active since {status?.proSince ? new Date(status.proSince).toLocaleDateString() : "—"}
            </p>
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}
              className="text-[#6B6F68] border-[#D3D6D0] hover:text-red-400 hover:border-red-400/40 bg-transparent">
              {cancelling ? "Cancelling…" : "Cancel subscription"}
            </Button>
          </div>
        )}

        {/* Feature comparison table */}
        <div className="mb-8">
          <button
            onClick={() => setShowTable(!showTable)}
            className="w-full text-center text-xs text-[#6B6F68] hover:text-[#6B6F68] transition-colors py-3 border border-[#D3D6D0] rounded-xl flex items-center justify-center gap-1.5"
          >
            {showTable ? "Hide full feature comparison" : "Show full feature comparison"}
            {showTable ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
          {showTable && (
            <div className="mt-4 rounded-2xl border border-[#D3D6D0] overflow-x-auto">
              <div className="min-w-[420px]">
                <div className="grid grid-cols-[1fr_auto_auto_auto] bg-[#E6E8E3]">
                  <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#6B6F68]">Feature</div>
                  <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#6B6F68] text-center w-20">Free</div>
                  <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#C8452B] text-center w-20">Pro</div>
                  <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#C8452B] text-center w-20">Keeper</div>
                </div>
                {PRICING_TABLE.map((row, i) => (
                  <div key={row.feature} className="grid grid-cols-[1fr_auto_auto_auto] border-t border-[#D3D6D0]"
                    style={{ background: i % 2 === 0 ? "transparent" : "oklch(1 0 0 / 0.012)" }}>
                    <div className="px-4 py-2.5 text-xs text-[#6B6F68]">{row.feature}</div>
                    <div className="px-4 py-2.5 text-center w-20 flex items-center justify-center"><Cell value={row.free} /></div>
                    <div className="px-4 py-2.5 text-center w-20 flex items-center justify-center"><Cell value={row.pro} /></div>
                    <div className="px-4 py-2.5 text-center w-20 flex items-center justify-center"><Cell value={row.keeper} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>


        {/* Footer */}
        <div className="border-t border-[#D3D6D0] pt-8 pb-8 space-y-4 text-center">
          <p className="text-[#6B6F68] text-xs max-w-sm mx-auto leading-relaxed">
            Continuary is built by one person, for people who work differently. Your subscription directly funds continued development.
            <br /><br />
          Secure checkout via PayPal · Cancel anytime · No hidden fees
        </p>
        {/* FAQ section */}
        <div className="max-w-2xl mx-auto w-full text-left space-y-2 pt-4 pb-2">
          <h2 className="text-base font-semibold text-[#6B6F68] mb-4 text-center">Common questions</h2>
          {[
            {
              q: "What happens after the founding slots fill?",
              a: "Once all 100 founding slots are claimed, pricing moves to retail rates ($7.99/mo Pro, $14.99/mo Keeper). Founding members keep their rate locked for as long as they stay subscribed — it never increases.",
            },
            {
              q: "Can I cancel anytime?",
              a: "Yes. Cancel from Settings at any time — no penalty, no questions. You keep access until the end of your current billing period.",
            },
            {
              q: "Is there a free tier?",
              a: "Yes. Core daily tools — check-ins, Today dashboard, projects, Scratch Pad, Evidence Log, and Emotional Cycle — are always free. Pro and Keeper unlock Wren AI, voice capture, vault storage, and advanced features.",
            },
            {
              q: "What's the difference between Pro and Keeper?",
              a: "Pro gives you Wren AI, voice dictation, the full Clarity Engine, and weekly review letters. Keeper adds the file vault, advanced co-working tools, and the Weekly Compass deep-dive. Both tiers include everything in Free.",
            },
            {
              q: "Is Continuary a therapy app?",
              a: "No. Wren is a productivity companion, not a clinician. Continuary helps you build structure and continuity — it's not a substitute for therapy, medication, or professional mental health support.",
            },
            {
              q: "Does it work on mobile?",
              a: "Yes. Continuary is a progressive web app (PWA) — install it from your browser on iOS or Android for a native-feeling experience with offline support and push notifications.",
            },
          ].map(({ q, a }) => (
            <details
              key={q}
              className="group border-b border-[#D3D6D0] py-3"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-medium text-[#6B6F68] hover:text-[#2A2D28] transition-colors">
                {q}
                <ChevronDown className="w-4 h-4 text-[#6B6F68] group-open:rotate-180 transition-transform flex-shrink-0 ml-3" />
              </summary>
              <p className="mt-2 text-sm text-[#6B6F68] leading-relaxed">{a}</p>
            </details>
          ))}
        </div>

        <p className="text-[#6B6F68] text-xs">
          Continuary works alongside{" "}
            <a href="https://www.soulengineer.online/books" target="_blank" rel="noopener noreferrer"
              className="text-[#6B6F68] hover:text-[#C8452B] transition-colors underline underline-offset-2">
              Permission to Start
            </a>
            {" "}— the companion book, now available in{" "}
            <a href="https://www.soulengineer.online/books" target="_blank" rel="noopener noreferrer"
              className="text-[#6B6F68] hover:text-[#C8452B] transition-colors underline underline-offset-2">
              digital
            </a>
            {" "}and{" "}
            <a href="https://a.co/d/0bvqj6jD" target="_blank" rel="noopener noreferrer"
              className="text-[#6B6F68] hover:text-[#C8452B] transition-colors underline underline-offset-2">
              paperback
            </a>
            .
          </p>
          <div className="flex items-center justify-center gap-6">
            <a href="https://www.soulengineer.online" target="_blank" rel="noopener noreferrer"
              className="text-xs text-[#6B6F68] hover:text-[#6B6F68] transition-colors">
              An app from Soul Engineer →
            </a>
            <a href="https://continuary.app/#apply" target="_blank" rel="noopener noreferrer"
              className="text-xs text-[#6B6F68] hover:text-[#C8452B] transition-colors">
              Apply for founding member access →
            </a>
          </div>
        </div>
      </div>
      </main>
    </>
  );
}
