import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
  if (value === true) return <Check className="w-4 h-4 text-amber-400 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-white/15 mx-auto" />;
  return <span className="text-xs text-white/60 text-center block">{value as string}</span>;
}

export default function ProPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: status, isLoading } = trpc.paypal.status.useQuery(undefined, { enabled: !!user });
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
      toast(`Redirecting to PayPal…`, { description: `Opening secure checkout for ${tierLabel}.` });
      const { approvalUrl } = await createSub.mutateAsync({ origin: window.location.origin, planKey });
      sessionStorage.setItem("pendingPlanKey", planKey);
      window.open(approvalUrl, "_blank");
    } catch {
      toast.error("Could not start checkout. Please try again.");
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your subscription? You'll keep access until the end of the billing period.")) return;
    setCancelling(true);
    try {
      await cancelSub.mutateAsync();
      await utils.paypal.status.invalidate();
      toast("Subscription cancelled", { description: "Your access will remain until the period ends." });
    } catch {
      toast.error("Could not cancel. Please try again.");
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
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <PageMeta
        title="Pricing"
        description="Continuary starts free. Founding member rates are locked for life — $4.99/mo for Pro, $9.99/mo for Keeper. 100 slots total."
        path="/pricing"
      />
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
        {isFoundingMember && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Crown size={12} className="text-amber-400" />
            <span className="text-xs text-amber-400 font-semibold tracking-wide">FOUNDING MEMBER</span>
          </div>
        )}
        {!isFoundingMember && isPro && (
          <div className="flex items-center gap-1.5">
            <Star size={14} className="text-amber-400" />
            <span className="text-xs text-amber-400 font-medium">Pro active</span>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-8">
        {/* Non-founding member banner */}
        {!isFoundingMember && (
          <div className="mb-6 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between gap-3">
            <p className="text-xs text-white/60">Continuary is currently invite-only.</p>
            <a href="https://continuary.app/#apply" target="_blank" rel="noopener noreferrer"
              className="text-xs text-amber-400 font-semibold whitespace-nowrap hover:text-amber-300 transition-colors">
              Apply for a slot →
            </a>
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-8">
          {isFoundingMember ? (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/20 text-amber-400 text-xs font-semibold tracking-wide mb-4">
                <Crown className="w-3 h-3" /> Your founding rate is locked for life
              </div>
              <h1 className="font-brand text-3xl text-white mb-3">
                {isActive ? "Your thread is fully supported." : "Lock in your founding rate whenever you're ready."}
              </h1>
              <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
                {isActive
                  ? "Founding rate. Locked for life. Thank you for being here."
                  : "No card required during beta. Your founding rate is reserved — it never increases even as retail pricing rises."}
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/20 text-amber-400 text-xs font-semibold tracking-wide mb-4">
                <Sparkles className="w-3 h-3" /> Founding rates available now
              </div>
              <h1 className="font-brand text-3xl text-white mb-3">Start free. Go deeper when you're ready.</h1>
              <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
                Founding rates are locked for life. 100 slots total — reviewed personally.
              </p>
            </>
          )}
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/8">
            <button onClick={() => setBilling("monthly")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${billing === "monthly" ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60"}`}>
              Monthly
            </button>
            <button onClick={() => setBilling("annual")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${billing === "annual" ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60"}`}>
              Annual
              <span className="text-emerald-400 text-[10px] font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded-full">SAVE ~33%</span>
            </button>
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-3">
          {/* Free */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex flex-col gap-3">
            <div>
              <span className="font-semibold text-white text-sm">Free</span>
              <p className="text-xs text-white/45 mt-0.5">Start building continuity.</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">$0</span>
              <span className="text-sm text-white/35">forever</span>
            </div>
            <ul className="space-y-1.5 flex-1">
              {[
                "All daily check-ins",
                "Today dashboard & projects",
                "Knowledge Vault & Scratch Pad",
                "Evidence Log & Emotional Cycle",
                "Weekly Compass & Review",
                "Clarity Engine (basic)",
                "Single Focus Mode (1 active, 60 days)",
                "Focus Sessions (1 / week, chat with Wren)",
                "Thread Strength & Threshold Diagnosis",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-white/60">
                  <Check size={11} className="text-white/30 mt-0.5 shrink-0" />{f}
                </li>
              ))}
            </ul>
            {user ? (
              <Button variant="outline" size="sm" className="w-full bg-transparent border-white/15 text-white/50" onClick={() => navigate("/")}>
                Continue free
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="w-full bg-transparent border-white/15 text-white/50"
                onClick={() => window.open("https://continuary.app", "_blank")}>
                Start free
              </Button>
            )}
          </div>

          {/* Pro */}
          {(() => {
            const p = PRICING.pro;
            const monthly = isFoundingMember ? p.foundingMonthly : p.retailMonthly;
            const annual = isFoundingMember ? p.foundingAnnual : p.retailAnnual;
            const annualEquiv = isFoundingMember ? p.foundingAnnualEquiv : "6.67";
            const displayPrice = billing === "annual" ? annual : monthly;
            const retailStrike = billing === "annual" ? p.retailAnnual : p.retailMonthly;
            const cta = getCtaLabel("pro");
            return (
              <div className="relative rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 flex flex-col gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white text-sm">Pro</span>
                    {isFoundingMember && (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/25">Founding Rate</Badge>
                    )}
                  </div>
                  <p className="text-xs text-white/45">Your daily thread, always on.</p>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">${displayPrice}</span>
                    <span className="text-sm text-white/35">/ {billing === "annual" ? "yr" : "mo"}</span>
                    {isFoundingMember && <span className="text-xs text-white/25 line-through ml-1">${retailStrike}</span>}
                  </div>
                  {billing === "annual" && (
                    <p className="text-xs text-emerald-400 font-semibold mt-0.5">≈ ${annualEquiv} / mo · <span className="text-emerald-300">save ~33%</span></p>
                  )}
                  {isFoundingMember && (
                    <p className="text-[10px] text-amber-400/70 mt-0.5">Retail: ${p.retailMonthly}/mo · ${p.retailAnnual}/yr</p>
                  )}
                </div>
                <ul className="space-y-1.5 flex-1">
                  {[
                    "Everything in Free — unlimited",
                    "Unlimited Focus Sessions",
                    "Focus Sessions: book ahead, recurring, pop-out, PIP, export weave",
                    "Single Focus Mode: 2 focuses, Wren prompts, 365-day max",
                    "Deep Intelligence reports",
                    "Priority support — direct founder access",
                    "Markdown / Obsidian export",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-white/65">
                      <Check size={11} className="text-amber-400 mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <div className="space-y-1.5">
                  <Button
                    size="sm"
                    className={`w-full font-semibold ${cta.disabled ? "bg-white/10 text-white/40 cursor-default" : "bg-amber-500 hover:bg-amber-400 text-black"}`}
                    onClick={() => !cta.disabled && handleUpgrade(getPlanKey("pro"), "Pro")}
                    disabled={cta.disabled || createSub.isPending}
                  >
                    {createSub.isPending ? "Opening PayPal…" : cta.label}
                  </Button>
                  {cta.sublabel && (
                    <p className="text-[10px] text-white/35 text-center leading-relaxed">{cta.sublabel}</p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Keeper */}
          {(() => {
            const k = PRICING.keeper;
            const monthly = isFoundingMember ? k.foundingMonthly : k.retailMonthly;
            const annual = isFoundingMember ? k.foundingAnnual : k.retailAnnual;
            const annualEquiv = isFoundingMember ? k.foundingAnnualEquiv : "12.50";
            const displayPrice = billing === "annual" ? annual : monthly;
            const retailStrike = billing === "annual" ? k.retailAnnual : k.retailMonthly;
            const cta = getCtaLabel("keeper");
            return (
              <div className="relative rounded-2xl border border-violet-500/40 bg-violet-500/5 p-5 flex flex-col gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white text-sm">Keeper</span>
                    {isFoundingMember && (
                      <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-300 border-violet-500/25">Founding Rate</Badge>
                    )}
                  </div>
                  <p className="text-xs text-white/45">For those who go deeper.</p>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">${displayPrice}</span>
                    <span className="text-sm text-white/35">/ {billing === "annual" ? "yr" : "mo"}</span>
                    {isFoundingMember && <span className="text-xs text-white/25 line-through ml-1">${retailStrike}</span>}
                  </div>
                  {billing === "annual" && (
                    <p className="text-xs text-emerald-400 font-semibold mt-0.5">≈ ${annualEquiv} / mo · <span className="text-emerald-300">save ~33%</span></p>
                  )}
                  {isFoundingMember && (
                    <p className="text-[10px] text-violet-400/70 mt-0.5">Retail: ${k.retailMonthly}/mo · ${k.retailAnnual}/yr</p>
                  )}
                </div>
                <ul className="space-y-1.5 flex-1">
                  {[
                    "Everything in Pro",
                    "Unlimited Single Focus Mode — no duration cap",
                    "Weekly Compass deep-dive",
                    "Studios — priority access (Phase 2)",
                    "Monthly office hours with founder",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-white/65">
                      <Check size={11} className="text-violet-400 mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <div className="space-y-1.5">
                  <Button
                    size="sm"
                    className={`w-full font-semibold ${cta.disabled ? "bg-white/10 text-white/40 cursor-default" : "bg-violet-500 hover:bg-violet-400 text-white"}`}
                    onClick={() => !cta.disabled && handleUpgrade(getPlanKey("keeper"), "Keeper")}
                    disabled={cta.disabled || createSub.isPending}
                  >
                    {createSub.isPending ? "Opening PayPal…" : cta.label}
                  </Button>
                  {cta.sublabel && (
                    <p className="text-[10px] text-white/35 text-center leading-relaxed">{cta.sublabel}</p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Cancel option */}
        {isActive && (
          <div className="text-center mb-8 space-y-2">
            <p className="text-xs text-white/30">
              Active since {status?.proSince ? new Date(status.proSince).toLocaleDateString() : "—"}
            </p>
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}
              className="text-white/40 border-white/15 hover:text-red-400 hover:border-red-400/40 bg-transparent">
              {cancelling ? "Cancelling…" : "Cancel subscription"}
            </Button>
          </div>
        )}

        {/* Feature comparison table */}
        <div className="mb-8">
          <button
            onClick={() => setShowTable(!showTable)}
            className="w-full text-center text-xs text-white/35 hover:text-white/60 transition-colors py-3 border border-white/8 rounded-xl flex items-center justify-center gap-1.5"
          >
            {showTable ? "Hide full feature comparison" : "Show full feature comparison"}
            {showTable ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
          {showTable && (
            <div className="mt-4 rounded-2xl border border-white/8 overflow-x-auto">
              <div className="min-w-[420px]">
                <div className="grid grid-cols-[1fr_auto_auto_auto] bg-white/[0.03]">
                  <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/25">Feature</div>
                  <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/25 text-center w-20">Free</div>
                  <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-amber-400 text-center w-20">Pro</div>
                  <div className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-violet-400 text-center w-20">Keeper</div>
                </div>
                {PRICING_TABLE.map((row, i) => (
                  <div key={row.feature} className="grid grid-cols-[1fr_auto_auto_auto] border-t border-white/[0.05]"
                    style={{ background: i % 2 === 0 ? "transparent" : "oklch(1 0 0 / 0.012)" }}>
                    <div className="px-4 py-2.5 text-xs text-white/60">{row.feature}</div>
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
        <div className="border-t border-white/8 pt-8 pb-8 space-y-4 text-center">
          <p className="text-white/18 text-xs max-w-sm mx-auto leading-relaxed">
            Continuary is built by one person, for people who work differently. Your subscription directly funds continued development.
            <br /><br />
            Secure checkout via PayPal · Cancel anytime · No hidden fees
          </p>
          <p className="text-white/20 text-xs">
            Continuary works alongside{" "}
            <a href="https://www.soulengineer.online/books" target="_blank" rel="noopener noreferrer"
              className="text-white/40 hover:text-amber-400 transition-colors underline underline-offset-2">
              Permission to Start
            </a>
            , the Companion Book.
          </p>
          <div className="flex items-center justify-center gap-6">
            <a href="https://www.soulengineer.online" target="_blank" rel="noopener noreferrer"
              className="text-xs text-white/25 hover:text-white/50 transition-colors">
              An app from Soul Engineer →
            </a>
            <a href="https://continuary.app/#apply" target="_blank" rel="noopener noreferrer"
              className="text-xs text-white/25 hover:text-amber-400 transition-colors">
              Apply for founding member access →
            </a>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
