import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  Sparkles,
  Timer,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, subDays, startOfWeek } from "date-fns";
import DistractionInsightsCard from "@/components/DistractionInsightsCard";
import WrenPlayer from "@/components/WrenPlayer";
import { WrenThinking } from "@/components/WrenThinking";

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return "0m";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export default function WeeklyReviewPage() {
  const [generating, setGenerating] = useState(false);
  const [review, setReview] = useState<string | null>(null);
  const [weekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }).getTime());

  const generateReview = trpc.ai.generateWeeklyReview.useMutation({
    onSuccess: (data) => {
      setReview(data.review);
      setGenerating(false);
    },
    onError: () => {
      toast.error("Failed to generate review.");
      setGenerating(false);
    },
  });

  const { data: recentCheckIns } = trpc.checkIns.getRecent.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: focusStats } = trpc.focusSessions.getWeekStats.useQuery();
  const { data: focusSessions } = trpc.focusSessions.getWeekSessions.useQuery({ weekStart });

  const activeProjects = projects?.filter((p) => p.status === "active") ?? [];
  const completedProjects = projects?.filter((p) => p.status === "completed") ?? [];
  const checkInDays = recentCheckIns?.length ?? 0;

  return (
    <div className="px-5 py-7 space-y-7 page-enter max-w-4xl mx-auto">
      {/* Header with Wren */}
      <div className="flex items-center gap-4">
        <WrenPlayer clip="wrenLetter" size="md" />
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-foreground leading-tight">Weekly Review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(subDays(new Date(), 7), "MMM d")} – {format(new Date(), "MMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Check-ins", value: checkInDays, icon: Calendar, sub: "this week" },
          { label: "Active projects", value: activeProjects.length, icon: Brain, sub: "in progress" },
          {
            label: "Focus sessions",
            value: focusStats?.sessionCount ?? 0,
            icon: Timer,
            sub: `${focusStats?.completedCount ?? 0} completed`,
          },
          {
            label: "Focus time",
            value: formatDuration(focusStats?.totalSeconds ?? 0),
            icon: Clock,
            sub: "this week",
          },
        ].map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="p-4 rounded-xl bg-card border border-border text-center hover:border-primary/20 transition-colors">
            <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xs text-muted-foreground/60">{sub}</p>
          </div>
        ))}
      </div>

      {/* Generate AI Review */}
      {generating && (
        <div className="flex flex-col items-center justify-center py-12">
          <WrenThinking label="Reading your week…" size="lg" />
        </div>
      )}
      {!review && !generating && (
        <div className="relative overflow-hidden p-8 rounded-2xl text-center" style={{ background: "oklch(0.13 0.03 60)", border: "1px solid oklch(0.74 0.14 72 / 0.18)" }}>
          <div className="relative">
            <div className="flex justify-center mb-4">
              <WrenPlayer clip="wrenLetter" size="lg" />
            </div>
            <p className="text-base font-semibold mb-1" style={{ color: "oklch(0.74 0.14 72)" }}>Ask Wren to read your week</p>
            <p className="text-sm mb-5" style={{ color: "oklch(0.60 0.05 240)" }}>
              Wren will read your past 7 days — check-ins, projects, patterns — and write you back.
            </p>
            <Button
              onClick={() => { setGenerating(true); generateReview.mutate(); }}
              disabled={generating}
              className="gap-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-semibold border-0 shadow-lg shadow-black/20"
            >
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</>
                : <><Sparkles className="w-4 h-4" />Ask Wren to read your week</>}
            </Button>
          </div>
        </div>
      )}
      {review && (
        <div className="p-5 rounded-xl space-y-4" style={{ background: "oklch(0.74 0.14 72 / 0.06)", border: "1px solid oklch(0.74 0.14 72 / 0.18)" }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-primary uppercase tracking-wide">AI Weekly Review</p>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{review}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setReview(null); setGenerating(true); generateReview.mutate(); }}
            className="gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Regenerate
          </Button>
        </div>
      )}

      {/* Distraction Insights */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Distraction Insights</p>
        <DistractionInsightsCard />
      </div>

      {/* Focus Blocks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Focus Blocks</p>
          {focusSessions && focusSessions.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {focusSessions.length} session{focusSessions.length !== 1 ? "s" : ""} this week
            </p>
          )}
        </div>

        {!focusSessions || focusSessions.length === 0 ? (
          <div className="relative overflow-hidden p-8 rounded-2xl text-center" style={{ background: "oklch(0.13 0.03 240)", border: "1px solid oklch(0.22 0.04 240)" }}>
            <div className="relative">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "oklch(0.20 0.04 240)" }}>
                <Timer className="w-5 h-5" style={{ color: "oklch(0.72 0.10 65)" }} />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: "oklch(0.88 0.06 65)" }}>No focus sessions this week yet.</p>
              <p className="text-xs" style={{ color: "oklch(0.55 0.04 240)" }}>Use Focus Sessions to log your work blocks.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {focusSessions.map((session) => {
              const project = projects?.find((p) => p.id === session.projectId);
              return (
                <div
                  key={session.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                    session.wasCompleted ? "bg-emerald-400" : "bg-amber-400"
                  )} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-foreground leading-snug">{session.intention}</p>
                      <span className="text-xs text-muted-foreground shrink-0 font-log tabular-nums">
                        {formatDuration(session.durationSeconds)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(session.startedAt), "EEE, MMM d · h:mm a")}
                      </p>
                      {project && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                          <Layers className="w-3 h-3" />
                          {project.title}
                        </span>
                      )}
                      {session.wasCompleted ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 dark:text-amber-400">Early end</span>
                      )}
                    </div>
                    {session.notes && (
                      <p className="text-xs text-muted-foreground/70 mt-1.5 italic line-clamp-2 border-l-2 border-border pl-2">
                        {session.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent check-ins */}
      {recentCheckIns && recentCheckIns.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Recent check-ins</p>
          <div className="space-y-3">
            {recentCheckIns.slice(0, 10).map((checkIn) => {
              // Parse structured JSON payloads stored per check-in type
              type CheckInFields = { label: string; value: string }[];
              let fields: CheckInFields = [];
              let isPlainText = false;
              try {
                const raw = checkIn.userInput ?? "";
                if (!raw.startsWith("{")) throw new Error("plain");
                const p = JSON.parse(raw);
                if (checkIn.type === "morning") {
                  if (p.notes) fields.push({ label: "Notes", value: p.notes });
                  if (p.capacityLevel) fields.push({ label: "Capacity", value: p.capacityLevel });
                  if (p.primaryFocus) fields.push({ label: "Primary focus", value: p.primaryFocus });
                  if (p.energyLevel) fields.push({ label: "Energy", value: p.energyLevel });
                } else if (checkIn.type === "midday") {
                  if (p.workedOn) fields.push({ label: "Worked on", value: p.workedOn });
                  if (p.wasOnPlan !== undefined) fields.push({ label: "On plan", value: p.wasOnPlan ? "Yes" : "No" });
                  if (p.interruptions) fields.push({ label: "Interruptions", value: p.interruptions });
                  if (p.nextMove) fields.push({ label: "Next move", value: p.nextMove });
                } else if (checkIn.type === "evening") {
                  if (p.whatMoved) fields.push({ label: "What moved", value: p.whatMoved });
                  if (p.whatRemains) fields.push({ label: "What remains", value: p.whatRemains });
                  if (p.whatLearned) fields.push({ label: "What I learned", value: p.whatLearned });
                  if (p.tomorrowFirst) fields.push({ label: "Tomorrow first", value: p.tomorrowFirst });
                }
              } catch {
                isPlainText = true;
              }
              const typeLabel = checkIn.type === "morning" ? "Morning check-in" : checkIn.type === "midday" ? "Midday pulse" : "Evening close";
              const accentColor = checkIn.type === "morning" ? "bg-amber-400" : checkIn.type === "midday" ? "bg-amber-300" : "bg-amber-200";
              const plainSummary = isPlainText && checkIn.userInput ? checkIn.userInput : null;
              return (
                <div key={checkIn.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", accentColor)} />
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {typeLabel} · {format(new Date(checkIn.createdAt), "MMM d")}
                    </p>
                  </div>
                  {/* Structured fields */}
                  {fields.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {fields.map(f => (
                        <div key={f.label} className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                          <span className="text-muted-foreground/60 font-medium shrink-0">{f.label}:</span>
                          <span className="text-foreground/80 leading-relaxed">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Plain-text fallback */}
                  {plainSummary && (
                    <p className="text-xs text-muted-foreground leading-relaxed pt-1">{plainSummary}</p>
                  )}
                  {/* Empty state */}
                  {fields.length === 0 && !plainSummary && (
                    <p className="text-xs text-muted-foreground/40 italic">No details recorded.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
