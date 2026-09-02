import { Anchor, ArrowRight, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function CollapseModeGate({ onGround }: { onGround: () => void }) {
  const { data } = trpc.revisionNine.collapse.get.useQuery(undefined, { staleTime: 30_000 });
  const setEnabled = trpc.revisionNine.collapse.setEnabled.useMutation();
  if (!data?.enabled) return null;
  return <section className="fixed inset-0 z-[80] flex min-h-[100dvh] items-center justify-center px-5" style={{ background: "oklch(0.12 0.015 245 / 0.98)" }} data-testid="collapse-mode-gate">
    <div className="w-full max-w-sm text-center"><Anchor className="mx-auto h-5 w-5 text-primary" /><p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Collapse mode</p><h2 className="mt-3 text-2xl font-semibold text-foreground">Only three things are available.</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">You do not need to catch up or explain anything.</p>
      {data.active && <div className="mt-6 rounded-xl border border-border bg-card p-3 text-left"><p className="text-sm font-medium text-foreground">{data.active.situation}</p><p className="mt-1 text-sm text-muted-foreground">One move: {data.active.oneMove}</p></div>}
      <div className="mt-8 grid gap-3"><button type="button" onClick={onGround} className="min-h-12 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Ground for a moment</button><a href="/read" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground">Choose one action <ArrowRight className="h-4 w-4" /></a><button type="button" onClick={() => setEnabled.mutate({ enabled: false })} className="min-h-12 rounded-xl px-4 text-sm text-muted-foreground underline underline-offset-4">Leave it for today</button></div>
      <button type="button" onClick={() => setEnabled.mutate({ enabled: false })} aria-label="Exit collapse mode" className="mt-7 text-xs text-muted-foreground/70"><X className="mr-1 inline h-3.5 w-3.5" />Return when you want to</button>
    </div>
  </section>;
}
