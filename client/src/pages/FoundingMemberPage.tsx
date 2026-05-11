/**
 * /founding-member — Founding Member Status Page
 *
 * Shown to users who have redeemed a founding-member invite code.
 * Confirms their locked-for-life rate, trial status, and what comes next.
 * This is NOT a checkout page — payment happens when the trial ends.
 *
 * If the user is NOT a founding member, they are redirected to /apply.
 */
import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Star, Clock, ArrowRight, Copy, Check } from "lucide-react";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysLeft(trialEndsAt: Date | null | undefined): number | null {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FoundingMemberPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);

  const { data: me } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/apply");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!me) return;
    if (!me.isFoundingMember) {
      navigate("/apply");
    }
  }, [me, navigate]);

  if (loading || !me) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!me.isFoundingMember) return null;

  const days = daysLeft(me.trialEndsAt);
  const trialEndDate = formatDate(me.trialEndsAt);
  const referralCode = me.referralCode ?? null;

  function copyReferral() {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      toast.success("Referral code copied");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-12 space-y-10">

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          Back to Continuary
        </Link>

        {/* Hero */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-xs tracking-widest uppercase"
            >
              Founding Member
            </Badge>
            {me.foundingMemberCohort && (
              <span className="text-xs text-muted-foreground">
                Cohort {me.foundingMemberCohort}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-light text-foreground leading-snug">
            Your seat is confirmed.
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            You're one of the first hundred. Your founding rate is locked for
            life — it will never increase at renewal, not in five years, not
            ever.
          </p>
        </div>

        {/* Trial status card */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Free trial</p>
              <p className="text-xs text-muted-foreground">
                Full access, no card required
              </p>
            </div>
          </div>

          {days !== null ? (
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <span className="text-4xl font-light text-foreground tabular-nums">
                  {days}
                </span>
                <span className="text-sm text-muted-foreground pb-1">
                  days remaining · ends {trialEndDate}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.max(2, (days / 90) * 100))}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Trial period active — check back for exact end date.
            </p>
          )}

          <p className="text-xs text-muted-foreground leading-relaxed">
            When your trial ends, you'll choose a plan at your founding rate.
            No automatic charge — we'll send a reminder before anything happens.
          </p>
        </div>

        {/* Locked rates */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
            Your locked rates
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "Pro", monthly: "$4.99/mo", annual: "$39.99/yr", retail: "$7.99/mo" },
              { name: "Keeper", monthly: "$9.99/mo", annual: "$79.99/yr", retail: "$14.99/mo" },
            ].map((plan) => (
              <div
                key={plan.name}
                className="rounded-xl border border-border bg-card p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{plan.name}</span>
                  <Shield className="w-3.5 h-3.5 text-amber-500/70" />
                </div>
                <p className="text-xl font-light text-foreground">{plan.monthly}</p>
                <p className="text-xs text-muted-foreground">
                  or {plan.annual} · retail {plan.retail}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Founding rates are locked permanently. No price increases, ever.
          </p>
        </div>

        {/* What's included */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
            What you have access to
          </h2>
          <ul className="space-y-2.5">
            {[
              "Free during beta — full access, no card required for 90 days",
              "Founding rate locked for life — $4.99 Pro · $9.99 Keeper, never increases",
              "Direct line to the founder — your feedback shapes what gets built",
              "First access to Lifewoven and Operator House when they launch",
              "Founding Member badge — permanent recognition in your profile",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <Star className="w-3.5 h-3.5 text-amber-500/60 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Referral code */}
        {referralCode && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Your referral code</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Share this with someone who'd benefit. When they join, you both
                get 30 extra trial days.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm font-mono text-foreground tracking-widest">
                {referralCode}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={copyReferral}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="pt-2">
          <Button asChild className="w-full" size="lg">
            <Link href="/">
              Open Continuary
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Questions? Reply to your welcome email — it's a real inbox.
          </p>
        </div>

      </div>
    </div>
  );
}
