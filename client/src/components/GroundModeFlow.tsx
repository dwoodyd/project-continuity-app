import { useEffect, useState } from "react";
import { Anchor, ArrowRight, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

const PACED_STEPS = [
  { title: "Look around", detail: "Name three things you can see." },
  { title: "Feel the ground", detail: "Notice where your body is supported." },
  { title: "Choose one point", detail: "Let your eyes rest on one steady object." },
  { title: "One next contact", detail: "Choose one tiny thing you can touch or place." },
] as const;

export function GroundModeFlow({ onExit }: { onExit: () => void }) {
  const { data } = trpc.revisionNine.regulation.get.useQuery(undefined, { staleTime: 60_000 });
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setStep((current) => (current + 1) % PACED_STEPS.length), 5200);
    return () => window.clearInterval(timer);
  }, [paused]);

  const current = PACED_STEPS[step];
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="ground-mode-title"
      className="fixed inset-0 z-[90] flex min-h-[100dvh] items-center justify-center px-5"
      style={{ background: "oklch(0.11 0.015 245 / 0.98)" }}
    >
      <div className="w-full max-w-md text-center" data-testid="ground-mode-flow">
        <div className="mx-auto mb-7 flex h-12 w-12 items-center justify-center rounded-full border" style={{ borderColor: "oklch(0.52 0.05 242 / 0.5)", color: "oklch(0.76 0.05 242)" }}>
          <Anchor className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "oklch(0.66 0.04 242)" }}>Ground Mode</p>
        <h2 id="ground-mode-title" className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{current.title}</h2>
        <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-muted-foreground">{current.detail}</p>

        <div className="mx-auto mt-9 flex w-full max-w-[250px] gap-2" aria-label={`Grounding step ${step + 1} of ${PACED_STEPS.length}`}>
          {PACED_STEPS.map((_, index) => <span key={index} className="h-1 flex-1 rounded-full" style={{ background: index === step ? "oklch(0.72 0.11 78)" : "oklch(0.32 0.02 242)" }} />)}
        </div>

        {data?.calmStateReference && (
          <blockquote className="mx-auto mt-10 max-w-sm border-t pt-5 text-left text-sm leading-relaxed text-foreground/85" style={{ borderColor: "oklch(0.35 0.025 242)" }}>
            {data.calmStateReference}
          </blockquote>
        )}

        <div className="mt-10 flex items-center justify-center gap-3">
          <button type="button" onClick={() => setPaused((value) => !value)} className="min-h-11 px-4 text-sm text-muted-foreground underline underline-offset-4">
            {paused ? "Continue" : "Hold here"}
          </button>
          <button type="button" onClick={onExit} className="min-h-11 rounded-lg px-4 text-sm font-medium text-foreground" style={{ border: "1px solid oklch(0.42 0.03 242)" }}>
            I have what I need <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        <button type="button" onClick={onExit} className="mt-6 inline-flex min-h-11 items-center gap-1.5 px-3 text-xs text-muted-foreground/75">
          <X className="h-3.5 w-3.5" aria-hidden="true" /> Exit quietly
        </button>
      </div>
    </section>
  );
}
