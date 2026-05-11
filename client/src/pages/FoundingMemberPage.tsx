/**
 * /founding-member — Founding Member conversion page.
 *
 * Shows the user's 90-day trial status, personal data summary (projects, check-ins,
 * evidence entries, days logged), and four SKUs:
 *   1. Pro Monthly  — $4.99/mo  (founding rate, locked for life)
 *   2. Pro Annual   — $39.99/yr (founding rate, locked for life)
 *   3. Keeper Monthly — $9.99/mo (founding rate, locked for life)
 *   4. Keeper Annual  — $79.99/yr (founding rate, locked for life)
 *
 * Also shows referral code and graceful free exit option.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "wouter";
import { Copy, Check, Star, Shield, Zap, Clock, ArrowLeft } from "lucide-react";
import WrenPlayer from "@/components/WrenPlayer";

// ── SKU definitions ───────────────────────────────────────────────────────────
const SKUS = [
  {
    id: "pro-monthly",
    tier: "pro" as const,
    billing: "monthly" as const,
    name: "Pro",
    tagline: "Your daily thread, always on.",
    price: "$4.99",
    period: "/ month",
    retailPrice: "$7.99",
    annualEquiv: null,
    features: [
      "Unlimited check-ins & projects",
      "Wren AI guidance every day",
      "Emotional Cycle Tracker",
      "Evidence Log & Knowledge Vault",
      "Morning check-in, Midday pulse & Evening close",
      "Founding rate — locked for life",
    ],
    highlight: false,
    color: "amber",
  },
  {
    id: "pro-annual",
    tier: "pro" as const,
    billing: "annual" as const,
    name: "Pro Annual",
    tagline: "Two months free. Founding rate forever.",
    price: "$39.99",
    period: "/ year",
    retailPrice: "$79.99",
    annualEquiv: "$3.33/mo",
    features: [
      "Everything in Pro Monthly",
      "Save $20/year vs monthly",
      "Priority feature access",
      "Founding rate — locked for life",
    ],
    highlight: true,
    color: "amber",
  },
  {
    id: "keeper-monthly",
    tier: "keeper" as const,
    billing: "monthly" as const,
    name: "Keeper",
    tagline: "For those who want to go deeper.",
    price: "$9.99",
    period: "/ month",
    retailPrice: "$14.99",
    annualEquiv: null,
    features: [
      "Everything in Pro",
      "Wren voice check-ins",
      "Weekly Compass deep-dive",
      "Threshold Diagnosis tool",
      "Study Mode & Focus Blocks",
      "Founding rate — locked for life",
    ],
    highlight: false,
    color: "violet",
  },
  {
    id: "keeper-annual",
    tier: "keeper" as const,
    billing: "annual" as const,
    name: "Keeper Annual",
    tagline: "The full Continuary experience, forever yours.",
    price: "$79.99",
    period: "/ year",
    retailPrice: "$149.99",
    annualEquiv: "$6.67/mo",
    features: [
      "Everything in Keeper Monthly",
      "Save $40/year vs monthly",
      "Early access to all new features",
      "Founding rate — locked for life",
    ],
    highlight: false,
    color: "violet",
  },
];

// ── Countdown display ─────────────────────────────────────────────────────────
function TrialCountdown({ daysRemaining, trialEndsAt }: { daysRemaining: number; trialEndsAt: Date | null }) {
  const urgency = daysRemaining <= 3 ? "text-red-400" : daysRemaining <= 7 ? "text-amber-400" : "text-emerald-400";
  const label = daysRemaining <= 0 ? "Trial ended" : daysRemaining === 1 ? "1 day left" : `${daysRemaining} days left`;

  return (
    <div className="flex items-center gap-2">
      <Clock size={14} className={urgency} />
      <span className={`text-sm font-medium ${urgency}`}>{label}</span>
      {trialEndsAt && daysRemaining > 0 && (
        <span className="text-xs text-white/40">
          · ends {new Date(trialEndsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
      )}
    </div>
  );
}

// ── Personal data summary ─────────────────────────────────────────────────────
function DataSummary() {
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: checkIns } = trpc.checkIns.getRecent.useQuery();
  const { data: evidenceData } = trpc.evidence.getCurrentMonth.useQuery();

  const projectCount = projects?.length ?? 0;
  const checkInCount = Array.isArray(checkIns) ? checkIns.length : 0;

  const stats = [
    { label: "Projects tracked", value: projectCount },
    { label: "Check-ins completed", value: checkInCount },
    { label: "Days in the app", value: Math.max(1, checkInCount > 0 ? Math.ceil(checkInCount / 2) : 1) },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">{s.value}</div>
          <div className="text-xs text-white/50 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── SKU card ──────────────────────────────────────────────────────────────────
function SkuCard({
  sku,
  onSelect,
  loading,
}: {
  sku: typeof SKUS[0];
  onSelect: (sku: typeof SKUS[0]) => void;
  loading: boolean;
}) {
  const accentColor = sku.color === "amber" ? "border-amber-500/60 bg-amber-500/5" : "border-amber-500/40 bg-amber-500/5";
  const btnColor = sku.color === "amber"
    ? "bg-amber-500 hover:bg-amber-400 text-black"
    : "bg-violet-500 hover:bg-violet-400 text-white";
  const badgeColor = sku.color === "amber" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30";

  return (
    <div
      className={`relative rounded-2xl border p-5 flex flex-col gap-3 ${sku.highlight ? accentColor + " ring-1 ring-amber-500/40" : "border-white/10 bg-white/3"}`}
    >
      {sku.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-amber-500 text-black text-xs font-bold px-3 py-0.5 rounded-full">BEST VALUE</span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-white">{sku.name}</span>
          <Badge variant="outline" className={`text-xs ${badgeColor}`}>Founding Rate</Badge>
        </div>
        <p className="text-xs text-white/50">{sku.tagline}</p>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white">{sku.price}</span>
        <span className="text-sm text-white/40">{sku.period}</span>
        {sku.annualEquiv && (
          <span className="text-xs text-emerald-400 ml-1">({sku.annualEquiv})</span>
        )}
      </div>

      {sku.retailPrice && (
        <p className="text-xs text-white/30 -mt-2">
          Retail price: <span className="line-through">{sku.retailPrice}</span>
        </p>
      )}

      <ul className="space-y-1.5 flex-1">
        {sku.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-white/70">
            <Check size={12} className="text-emerald-400 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <Button
        className={`w-full mt-2 font-semibold ${btnColor}`}
        onClick={() => onSelect(sku)}
        disabled={loading}
      >
        {loading ? "Redirecting…" : `Lock in ${sku.name}`}
      </Button>
    </div>
  );
}

// ── Referral code widget ──────────────────────────────────────────────────────
function ReferralWidget({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Star size={14} className="text-amber-400" />
        <span className="text-sm font-medium text-white">Your referral code</span>
      </div>
      <p className="text-xs text-white/50 mb-3">
        Share this with someone who needs Continuary. You both get +30 days added to your trial.
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 font-mono text-sm text-amber-300 tracking-widest">
          {code}
        </div>
        <Button size="sm" variant="outline" onClick={copy} className="shrink-0 border-white/20">
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </Button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FoundingMemberPage() {
  const { user } = useAuth();

  const [loadingSkuId, setLoadingSkuId] = useState<string | null>(null);

  const { data: betaStatus } = trpc.beta.getStatus.useQuery();
  const createSubscription = trpc.paypal.createSubscription.useMutation();

  const daysRemaining = betaStatus?.daysRemaining ?? 0;
  const trialEndsAt = betaStatus?.trialEndsAt ? new Date(betaStatus.trialEndsAt) : null;
  const referralCode = betaStatus?.referralCode ?? null;
  const isExpired = daysRemaining <= 0;

  const handleSelect = async (sku: typeof SKUS[0]) => {
    setLoadingSkuId(sku.id);
    try {
      const returnUrl = `${window.location.origin}/founding-member?success=1&tier=${sku.tier}&billing=${sku.billing}`;
      const cancelUrl = `${window.location.origin}/founding-member?cancelled=1`;

      const { approvalUrl } = await createSubscription.mutateAsync({ origin: window.location.origin });
      window.open(approvalUrl, "_blank");
      toast("Redirecting to PayPal…", { description: "Complete your payment to lock in your founding rate." });
    } catch (err) {
      toast.error("Something went wrong", { description: "Please try again or contact support." });
    } finally {
      setLoadingSkuId(null);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-white"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2rem)" }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-sm border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <ArrowLeft size={18} className="text-white/60" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-white">Founding Member</h1>
          {betaStatus?.isActiveTrial && (
            <TrialCountdown daysRemaining={daysRemaining} trialEndsAt={trialEndsAt} />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Shield size={14} className="text-amber-400" />
          <span className="text-xs text-amber-400 font-medium">Rate locked forever</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* Wren + hero copy */}
        <div className="relative rounded-2xl overflow-hidden mb-6 bg-black" style={{ height: 220 }}>
          <WrenPlayer
            clip="luminousFloats"
            autoPlay
            loop
            muted
            className="w-full h-full" wrapperClassName="w-full h-full"
          />
          <div
            className="absolute inset-0 flex flex-col justify-end p-5"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)" }}
          >
            {isExpired ? (
              <>
                <h2 className="text-xl font-normal text-white mb-1 font-brand">Your trial has <span className="font-brand-italic" style={{ color: "oklch(0.78 0.18 65)" }}>ended.</span></h2>
                <p className="text-sm text-white/60">Thank you for shaping Continuary. Keep your thread going.</p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-normal text-white mb-1 font-brand">
                  You helped <span className="font-brand-italic" style={{ color: "oklch(0.78 0.18 65)" }}>build this.</span>
                </h2>
                <p className="text-sm text-white/60">
                  Lock in your founding rate and keep everything you've built.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Data summary */}
        <DataSummary />

        {/* Referral code */}
        {referralCode && <ReferralWidget code={referralCode} />}

        {/* Urgency banner */}
        {daysRemaining > 0 && daysRemaining <= 7 && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 mb-5 flex items-center gap-2">
            <Zap size={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-300">
              <strong>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left.</strong> After your trial ends, you'll lose access to all Pro features. Your data is safe.
            </p>
          </div>
        )}

        {/* What founding members get — Priority 7 value props */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Star size={14} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-white tracking-wide">What founding members get</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-amber-400 mt-0.5 shrink-0">✦</span>
              <div>
                <p className="text-sm text-white font-medium">Free during beta</p>
                <p className="text-xs text-white/50 mt-0.5">90 days of full Pro access — no card required to start.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-400 mt-0.5 shrink-0">✦</span>
              <div>
                <p className="text-sm text-white font-medium">Your rate, locked for life</p>
                <p className="text-xs text-white/50 mt-0.5">Founding pricing never increases — even as Continuary grows and retail rates rise.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-400 mt-0.5 shrink-0">✦</span>
              <div>
                <p className="text-sm text-white font-medium">Direct line to the founder</p>
                <p className="text-xs text-white/50 mt-0.5">DM access to DeWayne. Keeper members get monthly office hours.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-400 mt-0.5 shrink-0">✦</span>
              <div>
                <p className="text-sm text-white font-medium">First access to Lifewoven &amp; Operator House</p>
                <p className="text-xs text-white/50 mt-0.5">When the next tools launch, founding members get in first — at founding rates.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-amber-400 mt-0.5 shrink-0">✦</span>
              <div>
                <p className="text-sm text-white font-medium">Founding Member badge</p>
                <p className="text-xs text-white/50 mt-0.5">Visible in your app — a permanent mark of the people who were here first.</p>
              </div>
            </li>
          </ul>
        </div>

        {/* SKU grid */}
        <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2">
          {SKUS.map((sku) => (
            <SkuCard
              key={sku.id}
              sku={sku}
              onSelect={handleSelect}
              loading={loadingSkuId === sku.id}
            />
          ))}
        </div>

        {/* Graceful free exit */}
        <div className="text-center pb-8 space-y-3">
          <p className="text-xs text-white/30">
            Not ready yet? Your data stays safe. You can upgrade anytime.
          </p>
          <Link href="/">
            <button className="text-xs text-white/40 hover:text-white/60 transition-colors underline underline-offset-2">
              Continue with free access
            </button>
          </Link>
          <div className="flex items-center justify-center gap-3 pt-1">
            <Link href="/terms">
              <button className="text-xs text-white/25 hover:text-white/50 transition-colors underline underline-offset-2">
                Terms of Service
              </button>
            </Link>
            <span className="text-white/15 text-xs">·</span>
            <Link href="/privacy">
              <button className="text-xs text-white/25 hover:text-white/50 transition-colors underline underline-offset-2">
                Privacy Policy
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
