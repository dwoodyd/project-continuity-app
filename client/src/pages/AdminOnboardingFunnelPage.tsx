import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const SLIDES = ["slide_1","slide_2","slide_3","slide_4","slide_5","slide_6"];
const SLIDE_LABELS: Record<string,string> = {
  slide_1: "1 · Thesis",
  slide_2: "2 · Amnesty",
  slide_3: "3 · Threshold",
  slide_4: "4 · Clarity",
  slide_5: "5 · Evidence",
  slide_6: "6 · Close",
};

export default function AdminOnboardingFunnelPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data = [], isLoading } = trpc.gamification.getOnboardingFunnel.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  // Build lookup: { [label]: { A: count, B: count } }
  const counts: Record<string, { A: number; B: number }> = {};
  for (const row of data) {
    const label = row.label ?? "unknown";
    if (!counts[label]) counts[label] = { A: 0, B: 0 };
    let variant: "A" | "B" = "A";
    try {
      const meta = JSON.parse(row.metadata ?? "{}");
      if (meta.ab === "B") variant = "B";
    } catch { /* ignore */ }
    counts[label][variant] += Number(row.count);
  }

  const maxCount = Math.max(1, ...SLIDES.flatMap(s => [counts[s]?.A ?? 0, counts[s]?.B ?? 0]));

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/feedback")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Onboarding Funnel</h1>
          <p className="text-xs text-muted-foreground">Slide views by A/B variant — authenticated users only</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet. Events are logged once users view the onboarding after signing in.</p>
      ) : (
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex gap-4 text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Variant A</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-500 inline-block" /> Variant B</span>
          </div>

          {SLIDES.map(slide => {
            const a = counts[slide]?.A ?? 0;
            const b = counts[slide]?.B ?? 0;
            const pctA = Math.round((a / maxCount) * 100);
            const pctB = Math.round((b / maxCount) * 100);
            return (
              <div key={slide} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{SLIDE_LABELS[slide]}</span>
                  <span className="text-muted-foreground">A: {a} · B: {b}</span>
                </div>
                <div className="space-y-1">
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pctA}%` }} />
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pctB}%` }} />
                  </div>
                </div>
              </div>
            );
          })}

          <p className="text-[10px] text-muted-foreground pt-4">
            Drop-off = slides with fewer views than slide 1. Bar width is relative to the highest single count.
          </p>
        </div>
      )}
    </div>
  );
}
