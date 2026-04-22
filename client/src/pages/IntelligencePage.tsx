import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Brain,
  RefreshCw,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Info,
  CheckCircle2,
  Zap,
  Heart,
  ShieldAlert,
} from "lucide-react";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";

// ── Types ──────────────────────────────────────────────────────────────────────
type Momentum = "rising" | "steady" | "fading" | "stalled";
type RiskLevel = "low" | "medium" | "high";
type Severity = "info" | "warning" | "critical";
type EmotionalState = "focused" | "energized" | "foggy" | "anxious" | "drained";

// ── Helpers ────────────────────────────────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 45) return "text-amber-400";
  return "text-red-400";
}

function scoreBarColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 45) return "bg-amber-500";
  return "bg-red-500";
}

function MomentumIcon({ momentum }: { momentum: Momentum }) {
  if (momentum === "rising") return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (momentum === "fading") return <TrendingDown className="w-4 h-4 text-amber-400" />;
  if (momentum === "stalled") return <Minus className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

function SeverityIcon({ severity }: { severity: Severity }) {
  if (severity === "critical") return <AlertTriangle className="w-4 h-4 text-red-400" />;
  if (severity === "warning") return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  return <Info className="w-4 h-4 text-indigo-400" />;
}

function severityBadgeVariant(severity: Severity): "destructive" | "secondary" | "outline" {
  if (severity === "critical") return "destructive";
  if (severity === "warning") return "secondary";
  return "outline";
}

function riskBadge(risk: RiskLevel) {
  const map: Record<RiskLevel, string> = {
    low: "text-emerald-400 border-emerald-800 bg-emerald-950/40",
    medium: "text-amber-400 border-amber-800 bg-amber-950/40",
    high: "text-red-400 border-red-800 bg-red-950/40",
  };
  return map[risk];
}

function insightTypeLabel(type: string): string {
  const map: Record<string, string> = {
    distraction_pattern: "Distraction",
    stall_pattern: "Stall",
    decision_debt: "Decision Debt",
    capacity_mismatch: "Capacity",
    momentum_drop: "Momentum",
    cross_project_conflict: "Conflict",
    positive_pattern: "Positive",
  };
  return map[type] ?? type;
}

// ── Emotional State Sparkline ──────────────────────────────────────────────────
const EMOTIONAL_ORDER: EmotionalState[] = ["energized", "focused", "foggy", "anxious", "drained"];
const EMOTIONAL_COLORS: Record<EmotionalState, string> = {
  energized: "#34d399",  // emerald-400
  focused: "#818cf8",    // indigo-400
  foggy: "#94a3b8",      // slate-400
  anxious: "#fb923c",    // orange-400
  drained: "#f87171",    // red-400
};
const EMOTIONAL_LABELS: Record<EmotionalState, string> = {
  energized: "Energized",
  focused: "Focused",
  foggy: "Foggy",
  anxious: "Anxious",
  drained: "Drained",
};

function emotionalY(state: EmotionalState): number {
  // Higher = more positive (inverted for SVG: lower y = higher on screen)
  const idx = EMOTIONAL_ORDER.indexOf(state);
  return idx === -1 ? 2 : idx; // 0 = energized (top), 4 = drained (bottom)
}

function EmotionalSparkline({ data }: { data: Array<{ date: string; emotionalState: string | null }> }) {
  if (data.length === 0) return null;
  const W = 280;
  const H = 64;
  const PAD = 12;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const n = data.length;

  const points = data.map((d, i) => {
    const state = (d.emotionalState ?? "foggy") as EmotionalState;
    const x = PAD + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = PAD + (emotionalY(state) / 4) * innerH;
    return { x, y, state, date: d.date };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const lastState = points[points.length - 1]?.state ?? "foggy";
  const lastColor = EMOTIONAL_COLORS[lastState];

  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        {/* Y-axis labels */}
        <text x={0} y={PAD + 4} fontSize="8" fill="#94a3b8" textAnchor="start">Energized</text>
        <text x={0} y={H - PAD + 4} fontSize="8" fill="#94a3b8" textAnchor="start">Drained</text>
        {/* Line */}
        <path d={pathD} fill="none" stroke={lastColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={EMOTIONAL_COLORS[p.state]} />
        ))}
      </svg>
      {/* Legend row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {EMOTIONAL_ORDER.map(s => (
          <div key={s} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: EMOTIONAL_COLORS[s] }} />
            <span className="text-xs text-muted-foreground">{EMOTIONAL_LABELS[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function IntelligencePage() {
  const utils = trpc.useUtils();

  const healthQuery = trpc.insights.getHealthScores.useQuery();
  const insightsQuery = trpc.insights.getPatternInsights.useQuery();
  const projectsQuery = trpc.projects.list.useQuery();
  const emotionalTrendQuery = trpc.insights.getEmotionalTrend.useQuery();
  const distractionQuery = trpc.insights.getDistractionPatterns.useQuery();

  const [scoringLoading, setScoringLoading] = useState(false);
  const [patternsLoading, setPatternsLoading] = useState(false);

  const scoreAllMutation = trpc.insights.scoreAllProjects.useMutation({
    onSuccess: () => {
      utils.insights.getHealthScores.invalidate();
      toast.success("Health scores updated — all projects scored.");
      setScoringLoading(false);
    },
    onError: () => {
      toast.error("Scoring failed. Please try again.");
      setScoringLoading(false);
    },
  });

  const detectMutation = trpc.insights.detectPatterns.useMutation({
    onSuccess: (data) => {
      utils.insights.getPatternInsights.invalidate();
      toast.success(`${data.count} pattern${data.count !== 1 ? "s" : ""} detected — insights refreshed.`);
      setPatternsLoading(false);
    },
    onError: () => {
      toast.error("Pattern detection failed. Please try again.");
      setPatternsLoading(false);
    },
  });

  const dismissMutation = trpc.insights.dismissInsight.useMutation({
    onSuccess: () => utils.insights.getPatternInsights.invalidate(),
  });

  const healthScores = healthQuery.data ?? [];
  const insights = insightsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const emotionalTrend = emotionalTrendQuery.data ?? [];

  // Build a projectId → title map
  const projectMap = new Map(projects.map((p: any) => [p.id, p.title]));

  const hasScores = healthScores.length > 0;
  const hasInsights = insights.length > 0;
  const hasTrend = emotionalTrend.length > 0;
  const distractionData = distractionQuery.data;
  const hasDistractionData = distractionData?.hasData ?? false;

  // Compute most common emotional state in the last 14 days
  const stateCounts: Record<string, number> = {};
  for (const d of emotionalTrend) {
    if (d.emotionalState) stateCounts[d.emotionalState] = (stateCounts[d.emotionalState] ?? 0) + 1;
  }
  const dominantState = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as EmotionalState | undefined;

  return (
    <div className="px-5 py-7 space-y-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-semibold text-foreground">Intelligence</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Cross-project patterns and health scores. Run on demand — each analysis uses one AI call.
          </p>
        </div>
      </div>

      {/* ── Activity Heatmap ────────────────────────────────────────────── */}
      <div
        className="p-4 rounded-xl border"
        style={{ background: "oklch(0.14 0.02 270 / 0.5)", borderColor: "oklch(0.80 0.18 270 / 0.12)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "oklch(0.72 0.17 65 / 0.70)" }}>
          Activity — past year
        </p>
        <ActivityHeatmap />
      </div>

      {/* ── Emotional Trend ───────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-400" />
          <h2 className="text-base font-medium text-foreground">Emotional Trend</h2>
          <span className="text-xs text-muted-foreground ml-1">Last 14 days</span>
        </div>

        {emotionalTrendQuery.isLoading ? (
          <div className="h-20 rounded-xl bg-muted/30 animate-pulse" />
        ) : !hasTrend ? (
          <Card className="border-dashed border-border/50 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <Heart className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No emotional data yet. Complete a morning check-in to start tracking.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/60 border-border/50">
            <CardContent className="pt-4 pb-4">
              {dominantState && (
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: EMOTIONAL_COLORS[dominantState] }}
                  />
                  <span className="text-xs text-muted-foreground">
                    Most common: <span className="text-foreground font-medium">{EMOTIONAL_LABELS[dominantState]}</span>
                    {" "}({stateCounts[dominantState]}×)
                  </span>
                </div>
              )}
              <EmotionalSparkline data={emotionalTrend} />
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Distraction Patterns ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-orange-400" />
          <h2 className="text-base font-medium text-foreground">Distraction Patterns</h2>
          <span className="text-xs text-muted-foreground ml-1">Last 7 days</span>
        </div>

        {distractionQuery.isLoading ? (
          <div className="h-28 rounded-xl bg-muted/30 animate-pulse" />
        ) : !hasDistractionData ? (
          <Card className="border-dashed border-border/50 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <ShieldAlert className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No distraction data yet. Midday and evening check-ins capture distraction patterns automatically.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/60 border-border/50">
            <CardContent className="pt-4 pb-4 space-y-4">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground tabular-nums">{distractionData!.totalEvents}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Total events</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-orange-400 capitalize">
                    {distractionData!.topCategory?.replace(/_/g, " ") ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Top category</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-amber-400 capitalize">
                    {distractionData!.topTimeOfDay ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Peak time</div>
                </div>
              </div>

              {/* Category breakdown bar chart */}
              {distractionData!.categories.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">By category</p>
                  {distractionData!.categories.map((cat: { name: string; count: number }) => {
                    const maxCount = distractionData!.categories[0]?.count ?? 1;
                    const pct = Math.round((cat.count / maxCount) * 100);
                    return (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-foreground capitalize">{cat.name.replace(/_/g, " ")}</span>
                          <span className="text-muted-foreground tabular-nums">{cat.count}×</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-orange-500/70 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Most-interrupted project */}
              {distractionData!.topProjectId && (
                <div className="pt-1 border-t border-border/30">
                  <p className="text-xs text-muted-foreground">
                    Most interrupted project:{" "}
                    <span className="text-foreground font-medium">
                      {projectMap.get(distractionData!.topProjectId) ?? `Project ${distractionData!.topProjectId}`}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Pattern Insights ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-foreground">Pattern Insights</h2>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-xs"
            disabled={patternsLoading}
            onClick={() => {
              setPatternsLoading(true);
              detectMutation.mutate();
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${patternsLoading ? "animate-spin" : ""}`} />
            {patternsLoading ? "Detecting…" : "Detect Patterns"}
          </Button>
        </div>

        {insightsQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : !hasInsights ? (
          <Card className="border-dashed border-border/50 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-950/50 flex items-center justify-center">
                <Zap className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-foreground">No patterns detected yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Run pattern detection to surface cross-project trends, recurring distractions, and decision debt.
              </p>
              <Button
                size="sm"
                className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={patternsLoading}
                onClick={() => {
                  setPatternsLoading(true);
                  detectMutation.mutate();
                }}
              >
                {patternsLoading ? "Detecting…" : "Run Detection"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {insights.map((ins: any) => (
              <Card key={ins.id} className="bg-card/60 border-border/50 relative group">
                <CardContent className="pt-4 pb-4 pr-10">
                  <div className="flex items-start gap-3">
                    <SeverityIcon severity={ins.severity} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-foreground">{ins.title}</span>
                        <Badge variant={severityBadgeVariant(ins.severity)} className="text-xs px-1.5 py-0">
                          {insightTypeLabel(ins.type)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{ins.body}</p>
                      {ins.affectedProjectIds?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {ins.affectedProjectIds.map((pid: number) => (
                            <span key={pid} className="text-xs px-1.5 py-0.5 rounded bg-indigo-950/50 text-indigo-300 border border-indigo-800/40">
                              {projectMap.get(pid) ?? `Project ${pid}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <button
                  onClick={() => dismissMutation.mutate({ id: ins.id })}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted/50"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Project Health Scores ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-foreground">Project Health</h2>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-xs"
            disabled={scoringLoading}
            onClick={() => {
              setScoringLoading(true);
              scoreAllMutation.mutate();
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scoringLoading ? "animate-spin" : ""}`} />
            {scoringLoading ? "Scoring…" : "Refresh Scores"}
          </Button>
        </div>

        {healthQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : !hasScores ? (
          <Card className="border-dashed border-border/50 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-950/50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-foreground">No health scores yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Score your active projects to see momentum, risk level, and a one-sentence narrative for each.
              </p>
              <Button
                size="sm"
                className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={scoringLoading}
                onClick={() => {
                  setScoringLoading(true);
                  scoreAllMutation.mutate();
                }}
              >
                {scoringLoading ? "Scoring…" : "Score Projects"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {healthScores.map((hs: any) => {
              const title = projectMap.get(hs.projectId) ?? `Project ${hs.projectId}`;
              return (
                <Card key={hs.id} className="bg-card/60 border-border/50">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <MomentumIcon momentum={hs.momentum} />
                          <span className="text-sm font-medium text-foreground truncate">{title}</span>
                        </div>
                        {hs.narrative && (
                          <p className="text-xs text-muted-foreground">{hs.narrative}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-2xl font-bold tabular-nums ${scoreColor(hs.score)}`}>
                          {hs.score}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${riskBadge(hs.riskLevel)}`}>
                          {hs.riskLevel} risk
                        </span>
                      </div>
                    </div>
                    {/* Score bar */}
                    <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(hs.score)}`}
                        style={{ width: `${hs.score}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {hs.stalledDays > 0 && (
                        <span>{hs.stalledDays}d since last activity</span>
                      )}
                      {hs.completionRate > 0 && (
                        <span>{hs.completionRate}% sessions completed</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
