import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import notify from "@/lib/notify";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { PageMeta } from "@/components/PageMeta";
import { getLoginUrl } from "@/const";

/**
 * Public /apply page — the canonical founding-access destination for the
 * marketing site. Seat availability determines whether it offers instant
 * sign-in admission or a waitlist form; applications are not part of either
 * public admission path.
 */
export default function ApplyPage() {
  const { data: slots, isLoading: isLoadingSlots } = trpc.founding.slots.useQuery(undefined, {
    staleTime: 40_000,
    retry: false,
  });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);

  const joinWaitlist = trpc.waitlist.join.useMutation({
    onSuccess: () => setJoinedWaitlist(true),
    onError: (err) => notify.error(err.message || "Something went wrong. Please try again."),
  });

  const seatsAreFull = slots?.remaining === 0;
  const seatCountKnown = typeof slots?.remaining === "number";

  function handleWaitlistSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      notify.error("Please enter your email address.");
      return;
    }
    joinWaitlist.mutate({
      email: email.trim(),
      name: name.trim() || undefined,
      reason: reason.trim() || undefined,
    });
  }

  if (joinedWaitlist) {
    return (
      <>
        <PageMeta
          title="Join the Waitlist"
          description="Founding seats are currently full. Join the Continuary waitlist and we’ll let you know when an opening is available."
          path="/apply"
        />
        <div
          className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
          style={{ background: "oklch(0.09 0.015 240)", color: "oklch(0.97 0.01 80)" }}
        >
          <div className="max-w-md w-full text-center space-y-6">
            <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: "oklch(0.74 0.14 72)" }} />
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", color: "oklch(0.97 0.01 80)" }}
            >
              You&apos;re on the list.
            </h1>
            <p className="text-base leading-relaxed" style={{ color: "oklch(0.75 0.01 240)" }}>
              We&apos;ll email you when a founding seat opens.
            </p>
            <p className="text-sm" style={{ color: "oklch(0.60 0.01 240)" }}>
              A confirmation has been sent to <strong style={{ color: "oklch(0.74 0.14 72)" }}>{email}</strong>.
            </p>
            <Link href="/landing" className="inline-flex items-center gap-2 text-sm" style={{ color: "oklch(0.74 0.14 72)" }}>
              <ArrowLeft className="w-4 h-4" /> Back to Continuary
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={seatsAreFull ? "Join the Founding Waitlist" : "Claim Founding Access"}
        description="Sign in to claim a Continuary founding seat while they remain, or join the waitlist when the public allocation is full."
        path="/apply"
      />
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
        style={{ background: "oklch(0.09 0.015 240)", color: "oklch(0.97 0.01 80)" }}
      >
        <div className="max-w-md w-full space-y-8">
          <Link href="/landing" className="inline-flex items-center gap-2 text-sm" style={{ color: "oklch(0.74 0.14 72 / 0.7)" }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>

          {isLoadingSlots ? (
            <section className="space-y-3" aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.74 0.14 72)" }}>
                Founding access
              </p>
              <h1
                className="text-4xl font-bold leading-tight"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", color: "oklch(0.97 0.01 80)" }}
              >
                Checking availability…
              </h1>
              <p className="text-base leading-relaxed" style={{ color: "oklch(0.70 0.01 240)" }}>
                We&apos;re confirming the current founding-seat availability.
              </p>
            </section>
          ) : seatsAreFull ? (
            <>
              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.74 0.14 72)" }}>
                  Founding access
                </p>
                <h1
                  className="text-4xl font-bold leading-tight"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", color: "oklch(0.97 0.01 80)" }}
                >
                  Founding seats are full.
                </h1>
                <p className="text-base leading-relaxed" style={{ color: "oklch(0.70 0.01 240)" }}>
                  Join the waitlist and we&apos;ll email you when a seat opens.
                </p>
              </section>

              <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="waitlist-email" className="text-sm font-medium" style={{ color: "oklch(0.85 0.01 80)" }}>
                    Email address <span style={{ color: "oklch(0.74 0.14 72)" }}>*</span>
                  </label>
                  <Input
                    id="waitlist-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    maxLength={254}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-400/60 focus:ring-amber-400/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="waitlist-name" className="text-sm font-medium" style={{ color: "oklch(0.85 0.01 80)" }}>
                    Name <span style={{ color: "oklch(0.55 0.01 240)" }}>(optional)</span>
                  </label>
                  <Input
                    id="waitlist-name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={120}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-400/60 focus:ring-amber-400/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="waitlist-reason" className="text-sm font-medium" style={{ color: "oklch(0.85 0.01 80)" }}>
                    What draws you to Continuary? <span style={{ color: "oklch(0.55 0.01 240)" }}>(optional)</span>
                  </label>
                  <Textarea
                    id="waitlist-reason"
                    placeholder="A sentence or two is plenty."
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-400/60 focus:ring-amber-400/20 resize-none"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={joinWaitlist.isPending || !email.trim()}
                  className="w-full h-12 text-base font-semibold"
                  style={{ background: "oklch(0.74 0.14 72)", color: "oklch(0.12 0.02 240)", border: "none" }}
                >
                  {joinWaitlist.isPending ? "Joining…" : "Join the waitlist"}
                </Button>
              </form>
            </>
          ) : (
            <section className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.74 0.14 72)" }}>
                  Founding access
                </p>
                <h1
                  className="text-4xl font-bold leading-tight"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", color: "oklch(0.97 0.01 80)" }}
                >
                  Claim your founding seat.
                </h1>
                <p className="text-base leading-relaxed" style={{ color: "oklch(0.70 0.01 240)" }}>
                  {seatCountKnown
                    ? "While founding seats remain, signing in claims one instantly at your locked rate."
                    : "Sign in to check current founding-seat availability and continue into Continuary."}
                </p>
              </div>
              <a
                href={getLoginUrl()}
                className="inline-flex h-12 w-full items-center justify-center rounded-md text-base font-semibold"
                style={{ background: "oklch(0.74 0.14 72)", color: "oklch(0.12 0.02 240)" }}
              >
                Sign in to claim your seat →
              </a>
              <p className="text-sm leading-relaxed" style={{ color: "oklch(0.55 0.01 240)" }}>
                Signing in is the admission step. No review form is required while a public founding seat is available.
              </p>
            </section>
          )}

          {!isLoadingSlots && (
            <div className="border-t pt-5 text-center space-y-2" style={{ borderColor: "oklch(0.25 0.015 240)" }}>
              <p className="text-sm" style={{ color: "oklch(0.55 0.01 240)" }}>
                Already have a personal invite?{" "}
                <Link href="/invite-gate" className="underline underline-offset-2" style={{ color: "oklch(0.74 0.14 72 / 0.9)" }}>
                  Redeem your invite code →
                </Link>
              </p>
              <p className="text-sm" style={{ color: "oklch(0.55 0.01 240)" }}>
                Have a referral code from a founding member?{" "}
                <Link href="/redeem-referral" className="underline underline-offset-2" style={{ color: "oklch(0.74 0.14 72 / 0.9)" }}>
                  Continue with your referral →
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
