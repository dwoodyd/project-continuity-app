import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type Momentum = "rising" | "steady" | "fading" | "stalled";
type RiskLevel = "low" | "medium" | "high";
type Severity = "info" | "warning" | "critical";

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

// ── Component ──────────────────────────────────────────────────────────────────
export default function IntelligencePage() {
  const utils = trpc.useUtils();

  const healthQuery = trpc.insights.getHealthScores.useQuery();
  const insightsQuery = trpc.insights.getPatternInsights.useQuery();
  const projectsQuery = trpc.projects.list.useQuery();

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

  // Build a projectId → title map
  const projectMap = new Map(projects.map((p: any) => [p.id, p.title]));

  const hasScores = healthScores.length > 0;
  const hasInsights = insights.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
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
            {scoringLoading ? "Scoring…" : "Score Projects"}
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
