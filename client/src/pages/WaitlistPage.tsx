import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import notify from "@/lib/notify";
import { Link } from "wouter";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { PageMeta } from "@/components/PageMeta";

/**
 * Public /waitlist page — no auth required.
 * Shown when founding slots are full. Uses the existing waitlist.join procedure.
 */
export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const join = trpc.waitlist.join.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err) => notify.error(err.message || "Something went wrong. Please try again."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      notify.error("Please enter your email address.");
      return;
    }
    join.mutate({ email: email.trim(), name: name.trim() || undefined, reason: reason.trim() || undefined });
  }

  if (submitted) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
        style={{ background: "oklch(0.09 0.015 240)", color: "oklch(0.97 0.01 80)" }}
      >
        <PageMeta
          title="Join the Waitlist"
          description="Founding seats are limited to 100. Join the Continuary waitlist and we'll reach out when a seat opens."
          path="/waitlist"
        />
        <div className="max-w-md w-full text-center space-y-6">
          <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: "oklch(0.74 0.14 72)" }} />
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", color: "oklch(0.97 0.01 80)" }}
          >
            You're on the list. ✦
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "oklch(0.75 0.01 240)" }}>
            We'll reach out when a founding seat opens. Thank you for your patience.
          </p>
          <p className="text-sm" style={{ color: "oklch(0.60 0.01 240)" }}>
            A confirmation has been sent to{" "}
            <strong style={{ color: "oklch(0.74 0.14 72)" }}>{email}</strong>.
          </p>
          <div className="pt-4">
            <Link href="/">
              <Button variant="outline" className="gap-2" style={{ borderColor: "oklch(0.74 0.14 72 / 0.3)", color: "oklch(0.74 0.14 72)" }}>
                <ArrowLeft size={16} /> Back to Continuary
              </Button>
            </Link>
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
      <PageMeta
        title="Join the Waitlist"
        description="Founding seats are limited to 100. Join the Continuary waitlist and we'll reach out when a seat opens."
        path="/waitlist"
      />
      <div className="max-w-md w-full space-y-8">
        {/* Back link */}
        <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm" style={{ color: "oklch(0.60 0.01 240)" }}>
          <ArrowLeft size={14} /> Back to pricing
        </Link>

        {/* Header */}
        <div className="space-y-3">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide"
            style={{ border: "1px solid oklch(0.74 0.14 72 / 0.25)", color: "oklch(0.74 0.14 72)", background: "oklch(0.74 0.14 72 / 0.06)" }}
          >
            Founding seats are full
          </div>
          <h1
            className="text-3xl font-bold leading-tight"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", color: "oklch(0.97 0.01 80)" }}
          >
            Join the waitlist.
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "oklch(0.65 0.01 240)" }}>
            We'll reach out personally when a seat opens. No spam — just one message when it's your turn.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "oklch(0.70 0.01 240)" }}>
              Email <span style={{ color: "oklch(0.74 0.14 72)" }}>*</span>
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/25"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "oklch(0.70 0.01 240)" }}>
              Name <span style={{ color: "oklch(0.50 0.01 240)" }}>(optional)</span>
            </label>
            <Input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/25"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: "oklch(0.70 0.01 240)" }}>
              What draws you to Continuary? <span style={{ color: "oklch(0.50 0.01 240)" }}>(optional)</span>
            </label>
            <Textarea
              placeholder="A sentence or two is plenty."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={join.isPending || !email.trim()}
            className="w-full font-semibold"
            style={{ background: "oklch(0.74 0.14 72)", color: "oklch(0.09 0.015 240)" }}
          >
            {join.isPending ? "Joining…" : "Join the waitlist"}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-xs text-center" style={{ color: "oklch(0.45 0.01 240)" }}>
          Already have an invite code?{" "}
          <Link href="/" className="underline" style={{ color: "oklch(0.74 0.14 72)" }}>Sign in here</Link>.
        </p>
      </div>
    </div>
  );
}
