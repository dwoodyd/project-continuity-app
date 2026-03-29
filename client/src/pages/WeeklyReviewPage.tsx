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
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-[1.6rem] font-semibold tracking-[-0.02em] text-foreground leading-tight">Weekly Review</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(subDays(new Date(), 7), "MMM d")} – {format(new Date(), "MMM d, yyyy")}
        </p>
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
      {!review ? (
        <div className="relative overflow-hidden p-8 rounded-2xl text-center" style={{background: 'linear-gradient(135deg, oklch(0.51 0.24 264) 0%, oklch(0.45 0.22 280) 100%)'}}>
          <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 80% 20%, oklch(0.99 0 0) 0%, transparent 50%)'}} />
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <p className="text-base font-semibold text-white mb-1">Generate your weekly review</p>
            <p className="text-sm text-white/70 mb-5">
              AI will analyze your check-ins, projects, and patterns from the past 7 days.
            </p>
            <Button
              onClick={() => { setGenerating(true); generateReview.mutate(); }}
              disabled={generating}
              className="gap-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-semibold border-0 shadow-lg shadow-black/20"
            >
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</>
                : <><Sparkles className="w-4 h-4" />Generate review</>}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-primary/30 space-y-4" style={{background: 'linear-gradient(135deg, oklch(0.51 0.24 264 / 0.10) 0%, oklch(0.72 0.17 65 / 0.06) 100%)'}}>
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
          <div className="relative overflow-hidden p-8 rounded-2xl text-center" style={{background: 'linear-gradient(135deg, oklch(0.51 0.24 264) 0%, oklch(0.45 0.22 280) 100%)'}}>
            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 80% 20%, oklch(0.99 0 0) 0%, transparent 50%)'}} />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                <Timer className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">No focus sessions this week yet.</p>
              <p className="text-xs text-white/70">Use Single Focus Mode to log your work blocks.</p>
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
                      <span className="text-xs text-muted-foreground shrink-0 font-mono tabular-nums">
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
          <div className="space-y-2">
            {recentCheckIns.slice(0, 10).map((checkIn) => (
              <div key={checkIn.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-1.5 shrink-0",
                  checkIn.type === "morning" ? "bg-amber-400" : checkIn.type === "midday" ? "bg-blue-400" : "bg-violet-400"
                )} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-foreground capitalize">{checkIn.type}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(checkIn.createdAt), "MMM d")}</p>
                  </div>
                  {checkIn.userInput && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{checkIn.userInput}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
