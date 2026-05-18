import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Link } from "wouter";
import { CheckCircle2, ArrowLeft } from "lucide-react";

/**
 * Public /apply page — no auth required.
 * Founding member application form that submits to applications.submit tRPC procedure.
 * Serves as the canonical apply destination for the marketing site.
 */
export default function ApplyPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = trpc.applications.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !relationship.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    submit.mutate({ name: name.trim(), email: email.trim(), relationship: relationship.trim() });
  }

  if (submitted) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
        style={{ background: "oklch(0.09 0.015 240)", color: "oklch(0.97 0.01 80)" }}
      >
        <div className="max-w-md w-full text-center space-y-6">
          <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: "oklch(0.78 0.18 65)" }} />
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.97 0.01 80)" }}
          >
            Application received.
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "oklch(0.75 0.01 240)" }}>
            Thank you for applying to Continuary's founding cohort. We'll review your application and reach out within a few days with your invite code.
          </p>
          <p className="text-sm" style={{ color: "oklch(0.60 0.01 240)" }}>
            Check your inbox — a confirmation has been sent to <strong style={{ color: "oklch(0.78 0.18 65)" }}>{email}</strong>.
          </p>
          <div className="pt-4 space-y-4">
            <Link href="/landing">
              <a
                className="inline-flex items-center gap-2 text-sm transition-colors"
                style={{ color: "oklch(0.78 0.18 65 / 0.8)" }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Continuary
              </a>
            </Link>
            <div
              className="border-t pt-4"
              style={{ borderColor: "oklch(0.25 0.015 240)" }}
            >
              <p className="text-sm" style={{ color: "oklch(0.60 0.01 240)" }}>
                Already have a referral code from a founding member?{" "}
                <Link href="/redeem-referral">
                  <a
                    className="underline underline-offset-4 transition-colors"
                    style={{ color: "oklch(0.78 0.18 65)" }}
                  >
                    Skip the queue →
                  </a>
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: "oklch(0.09 0.015 240)", color: "oklch(0.97 0.01 80)" }}
    >
      <div className="max-w-md w-full space-y-8">
        {/* Back link */}
        <Link href="/landing">
          <a
            className="inline-flex items-center gap-2 text-sm transition-colors"
            style={{ color: "oklch(0.78 0.18 65 / 0.7)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </a>
        </Link>

        {/* Header */}
        <div className="space-y-3">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "oklch(0.78 0.18 65)" }}
          >
            Founding Member Application
          </p>
          <h1
            className="text-4xl font-bold leading-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "oklch(0.97 0.01 80)" }}
          >
            Apply for founding access.
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "oklch(0.70 0.01 240)" }}>
            Continuary is invite-only. Founding members get lifetime access at a locked rate, early feature input, and a direct line to the team. We review every application personally.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="text-sm font-medium"
              style={{ color: "oklch(0.85 0.01 80)" }}
            >
              Your name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="First and last name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-400/60 focus:ring-amber-400/20"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium"
              style={{ color: "oklch(0.85 0.01 80)" }}
            >
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-400/60 focus:ring-amber-400/20"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="relationship"
              className="text-sm font-medium"
              style={{ color: "oklch(0.85 0.01 80)" }}
            >
              What's your relationship with consistency?
            </label>
            <Textarea
              id="relationship"
              placeholder="Tell us a bit about how you work, where you get stuck, or what you're trying to build..."
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              maxLength={1000}
              rows={4}
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-400/60 focus:ring-amber-400/20 resize-none"
            />
            <p className="text-xs" style={{ color: "oklch(0.55 0.01 240)" }}>
              {relationship.length}/1000
            </p>
          </div>

          <Button
            type="submit"
            disabled={submit.isPending}
            className="w-full h-12 text-base font-semibold"
            style={{
              background: "oklch(0.78 0.18 65)",
              color: "oklch(0.12 0.02 240)",
              border: "none",
            }}
          >
            {submit.isPending ? "Submitting…" : "Submit application"}
          </Button>
        </form>

        {/* Entry points for users who already have a code */}
        <div className="text-center space-y-2">
          <p className="text-sm" style={{ color: "oklch(0.55 0.01 240)" }}>
            Already approved?{" "}
            <Link href="/invite-gate">
              <a
                className="underline underline-offset-2 transition-colors"
                style={{ color: "oklch(0.78 0.18 65 / 0.8)" }}
              >
                Redeem your invite code →
              </a>
            </Link>
          </p>
          <p className="text-sm" style={{ color: "oklch(0.55 0.01 240)" }}>
            Have a referral code from a founding member?{" "}
            <Link href="/redeem-referral">
              <a
                className="underline underline-offset-2 transition-colors"
                style={{ color: "oklch(0.78 0.18 65 / 0.8)" }}
              >
                Skip the queue →
              </a>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
