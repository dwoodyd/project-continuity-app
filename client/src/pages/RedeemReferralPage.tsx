import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ArrowLeft, Gift, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/**
 * /redeem-referral — lets a new user enter a referral code from an existing
 * founding member to skip the application queue and get immediate access.
 *
 * Requires authentication. Calls beta.redeemReferral on submit.
 * On success, redirects to /founding-member.
 */
export default function RedeemReferralPage() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [code, setCode] = useState("");
  const [success, setSuccess] = useState(false);
  const [bonusDays, setBonusDays] = useState(30);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      // Store intent so we can come back after OAuth
      sessionStorage.setItem("postLoginRedirect", "/redeem-referral");
      window.location.href = getLoginUrl();
    }
  }, [user, authLoading]);

  // Already a founding member — send to status page
  useEffect(() => {
    if (user?.isFoundingMember) {
      navigate("/founding-member");
    }
  }, [user, navigate]);

  const redeemMutation = trpc.beta.redeemReferral.useMutation({
    onSuccess: (data) => {
      setBonusDays(data.bonusDays ?? 30);
      setSuccess(true);
      // Give the user a moment to read the success state, then navigate
      setTimeout(() => navigate("/founding-member"), 2800);
    },
    onError: (err) => {
      toast.error(err.message || "Invalid referral code. Please check and try again.", {
        duration: 6000,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    redeemMutation.mutate({ referralCode: trimmed });
  };

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "oklch(0.09 0.015 240)" }}
      >
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "oklch(0.78 0.18 65)" }} />
      </div>
    );
  }

  if (!user) return null; // redirecting to login

  const accent = "oklch(0.78 0.18 65)";
  const bg = "oklch(0.09 0.015 240)";
  const text = "oklch(0.97 0.01 80)";
  const muted = "oklch(0.60 0.01 240)";

  if (success) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
        style={{ background: bg, color: text }}
      >
        <div className="max-w-md w-full text-center space-y-6">
          <CheckCircle2 className="w-14 h-14 mx-auto" style={{ color: accent }} />
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            You're in.
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "oklch(0.75 0.01 240)" }}>
            Your founding member trial has started — {bonusDays} bonus days included. Your rate is locked for life.
          </p>
          <p className="text-sm" style={{ color: muted }}>
            Taking you to your founding member page…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: bg, color: text }}
    >
      <div className="max-w-md w-full space-y-8">
        {/* Back link */}
        <Link href="/apply">
          <a
            className="inline-flex items-center gap-2 text-sm transition-colors"
            style={{ color: `${accent}b3` }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to apply
          </a>
        </Link>

        {/* Header */}
        <div className="space-y-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: `${accent}1a`, border: `1px solid ${accent}40` }}
          >
            <Gift className="w-6 h-6" style={{ color: accent }} />
          </div>
          <h1
            className="text-3xl font-bold leading-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Enter your referral code.
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "oklch(0.75 0.01 240)" }}>
            A founding member shared their code with you. Enter it below to skip the queue and join the founding cohort — your rate will be locked for life.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="referral-code"
              className="text-sm font-medium"
              style={{ color: "oklch(0.80 0.01 240)" }}
            >
              Referral code
            </label>
            <Input
              id="referral-code"
              type="text"
              placeholder="e.g. WREN-A1B2C3"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono text-base tracking-wider h-12"
              style={{
                background: "oklch(0.13 0.015 240)",
                border: `1px solid oklch(0.25 0.015 240)`,
                color: text,
              }}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            style={{ background: accent, color: "#080a0f" }}
            disabled={!code.trim() || redeemMutation.isPending}
          >
            {redeemMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying…
              </span>
            ) : (
              "Redeem code"
            )}
          </Button>
        </form>

        {/* Divider + apply link */}
        <div className="pt-2 text-center">
          <p className="text-sm" style={{ color: muted }}>
            Don't have a referral code?{" "}
            <Link href="/apply">
              <a
                className="underline underline-offset-4 transition-colors"
                style={{ color: `${accent}cc` }}
              >
                Apply for the founding cohort
              </a>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
