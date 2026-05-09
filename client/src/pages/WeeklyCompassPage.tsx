import { trpc } from "@/lib/trpc";
import WrenPlayer from "@/components/WrenPlayer";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Loader2,
  Pause,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, formatDistanceToNow } from "date-fns";
import { GlossaryTerm } from "@/components/TermTooltip";

// ─── Calendar Event Strip ──────────────────────────────────────────────
function CalendarEventStrip() {
  const { data, isLoading } = trpc.calendar.getWeekEvents.useQuery();

  if (isLoading) return null;
  if (!data?.connected) {
    return (
      <div className="flex items-center gap-2 px-1 py-2">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
        <span className="text-xs text-muted-foreground/50">
          Connect Google Calendar in{" "}
          <a href="/settings" className="underline underline-offset-2 hover:text-muted-foreground transition-colors">Settings</a>{" "}
          to include your schedule in AI recommendations.
        </span>
      </div>
    );
  }

  if (!data.events.length) {
    return (
      <div className="flex items-center gap-2 px-1 py-2">
        <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span className="text-xs text-muted-foreground">No calendar events this week — open schedule.</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span className="text-xs font-medium text-foreground">This week's calendar</span>
        <span className="text-xs text-muted-foreground">({data.events.length} event{data.events.length !== 1 ? 's' : ''})</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {data.events.slice(0, 8).map((event) => {
          const startLabel = event.allDay
            ? event.start
            : new Date(event.start).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
          return (
            <div
              key={event.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-muted/30 text-xs text-muted-foreground max-w-[200px]"
              title={`${event.summary} — ${startLabel}`}
            >
              <span className="truncate">{event.summary}</span>
              <span className="shrink-0 opacity-60">{event.allDay ? "all day" : new Date(event.start).toLocaleString("en-US", { weekday: "short" })}</span>
            </div>
          );
        })}
        {data.events.length > 8 && (
          <span className="text-xs text-muted-foreground self-center">+{data.events.length - 8} more</span>
        )}
      </div>
    </div>
  );
}

export default function WeeklyCompassPage() {
  const [, navigate] = useLocation();
  const [confirming, setConfirming] = useState(false);
  const [showReward, setShowReward] = useState(false);

  const { data: compass, refetch, isLoading } = trpc.intelligence.getWeeklyCompass.useQuery();
  const { data: allProjects } = trpc.projects.list.useQuery();
  const { data: todayPlan } = trpc.dailyPlan.getToday.useQuery();

  const generate = trpc.intelligence.generateWeeklyCompass.useMutation({
    onSuccess: () => {
      toast.success("Weekly Compass generated.");
      refetch();
    },
    onError: () => toast.error("Failed to generate compass. Try again."),
  });

  const confirm = trpc.intelligence.confirmWeeklyCompass.useMutation({
    onSuccess: () => {
      setConfirming(false);
      setShowReward(true);
      refetch();
    },
    onError: () => toast.error("Failed to confirm compass."),
  });

  const [editPrimary, setEditPrimary] = useState<number | null | undefined>(undefined);
  const [editSecondary, setEditSecondary] = useState<number | null | undefined>(undefined);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const getProject = (id: number | null | undefined) =>
    allProjects?.find((p) => p.id === id);

  const primaryProject = getProject(compass?.primaryProjectId);
  const secondaryProject = getProject(compass?.secondaryProjectId);

  const mustMove: string[] = (() => {
    try { return JSON.parse((compass as any)?.mustMove ?? "[]"); } catch { return []; }
  })();
  const canWait: string[] = (() => {
    try { return JSON.parse((compass as any)?.canWait ?? "[]"); } catch { return []; }
  })();
  const shouldPark: string[] = (() => {
    try { return JSON.parse((compass as any)?.shouldPark ?? "[]"); } catch { return []; }
  })();

  if (showReward && compass) {
    const primaryProject = allProjects?.find((p) => p.id === (compass.primaryProjectId ?? undefined));
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div
          className="max-w-sm w-full text-center space-y-6"
          style={{
            animation: "rewardCardIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          <style>{`
            @keyframes rewardCardIn {
              from { opacity: 0; transform: translateY(24px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div className="text-5xl">🧭</div>
          <div>
            <h2 className="text-xl font-normal text-foreground mb-1 font-brand">Week <span className="font-brand-italic" style={{ color: "oklch(0.78 0.18 65)" }}>gathered.</span></h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your compass is set. The thread is clear.
            </p>
          </div>
          {primaryProject && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Primary focus this week</p>
              <p className="font-semibold text-foreground">{primaryProject.title}</p>
            </div>
          )}
          {compass.mustMove && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
              <p className="text-xs uppercase tracking-widest text-amber-500/70 mb-1">Must move</p>
              <p className="text-foreground">{compass.mustMove}</p>
            </div>
          )}
          <div className="space-y-2 pt-2">
            <Button className="w-full" onClick={() => { setShowReward(false); navigate("/"); }}>
              Back to home
            </Button>
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowReward(false)}
            >
              View full compass
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-7 space-y-7 page-enter max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Week of {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
            </span>
          </div>
          <h1 className="text-[1.9rem] font-normal tracking-[-0.01em] text-foreground leading-tight font-brand"><GlossaryTerm name="weeklyCompass" /></h1>
          <p className="text-sm text-muted-foreground mt-1">
            One clear direction for the week. Not a schedule — a compass.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="gap-1.5 shrink-0"
        >
          {generate.isPending
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating...</>
            : <><Sparkles className="w-3.5 h-3.5" />{compass ? "Regenerate" : "Generate"}</>}
        </Button>
      </div>
      {/* Calendar event strip */}
      <CalendarEventStrip />
      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !compass && (
        <div className="relative overflow-hidden p-10 rounded-2xl text-center" style={{background: 'linear-gradient(135deg, oklch(0.51 0.24 264) 0%, oklch(0.45 0.22 280) 100%)'}}>
          <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 80% 20%, oklch(0.99 0 0) 0%, transparent 50%)'}} />
          <div className="relative">
            <div className="flex justify-center mb-2" style={{ WebkitMaskImage: "radial-gradient(ellipse 85% 85% at 50% 50%, black 40%, transparent 100%)", maskImage: "radial-gradient(ellipse 85% 85% at 50% 50%, black 40%, transparent 100%)" }}>
              <WrenPlayer clip="memoryOrb" size="xl" loop autoPlay />
            </div>
            <p className="text-base font-semibold text-white mb-2">No compass set for this week.</p>
            <p className="text-sm text-white/70 mb-6 max-w-xs mx-auto">
              Generate your weekly compass to get AI-powered recommendations on where to focus your energy.
            </p>
            <Button onClick={() => generate.mutate()} disabled={generate.isPending} className="gap-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-semibold border-0 shadow-lg shadow-black/20">
              {generate.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
                : <><Sparkles className="w-4 h-4" />Generate this week's compass</>}
            </Button>
          </div>
        </div>
      )}

      {/* Compass content */}
      {!isLoading && compass && (
        <>
          {/* Confirmation status */}
          {compass.userConfirmedAt ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-900/15 border border-emerald-200/60 dark:border-emerald-800/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Confirmed {formatDistanceToNow(new Date(compass.userConfirmedAt), { addSuffix: true })}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-900/15 border border-amber-200/60 dark:border-amber-800/40">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300 flex-1">
                Not yet confirmed. Review and confirm to commit to this week's direction.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-3 border-amber-300 dark:border-amber-700"
                onClick={() => setConfirming(true)}
              >
                Confirm
              </Button>
            </div>
          )}

          {/* AI Guidance */}
          {compass.generatedGuidance && (
            <div className="p-5 rounded-2xl border border-primary/30" style={{background: 'linear-gradient(135deg, oklch(0.51 0.24 264 / 0.10) 0%, oklch(0.72 0.17 65 / 0.06) 100%)'}}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">Weekly guidance</p>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{compass.generatedGuidance}</p>
            </div>
          )}

          {/* Primary + Secondary projects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Primary */}
            <div className="p-4 rounded-xl border border-primary/25 bg-card space-y-2" style={{background: 'linear-gradient(135deg, oklch(0.51 0.24 264 / 0.06) 0%, transparent 100%)'}}>
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">Primary focus</p>
              </div>
              {primaryProject ? (
                <div>
                  <p className="text-sm font-semibold text-foreground">{primaryProject.title}</p>
                  {primaryProject.nextStep && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                      <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
                      {primaryProject.nextStep}
                    </p>
                  )}
                  {primaryProject.lastTouchedAt && (
                    <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                      Last worked {formatDistanceToNow(new Date(primaryProject.lastTouchedAt), { addSuffix: true })}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full text-xs h-7 gap-1"
                    onClick={() => navigate(`/projects/${primaryProject.id}`)}
                  >
                    Open project <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No primary project set</p>
              )}
            </div>

            {/* Secondary */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-foreground/60" />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Secondary focus</p>
              </div>
              {secondaryProject ? (
                <div>
                  <p className="text-sm font-semibold text-foreground">{secondaryProject.title}</p>
                  {secondaryProject.nextStep && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                      <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
                      {secondaryProject.nextStep}
                    </p>
                  )}
                  {secondaryProject.lastTouchedAt && (
                    <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                      Last worked {formatDistanceToNow(new Date(secondaryProject.lastTouchedAt), { addSuffix: true })}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full text-xs h-7 gap-1"
                    onClick={() => navigate(`/projects/${secondaryProject.id}`)}
                  >
                    Open project <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">If bandwidth allows</p>
              )}
            </div>
          </div>

          {/* Admin lane */}
          {compass.adminLane && (
            <div className="p-4 rounded-xl border border-border/60 bg-muted/20">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Admin lane</p>
              <p className="text-sm text-foreground">{compass.adminLane}</p>
            </div>
          )}

          {/* Three lanes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Must move */}
            <div className="p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-900/10 space-y-2">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Must move</p>
              {mustMove.length > 0 ? (
                <ul className="space-y-1.5">
                  {mustMove.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-xs text-foreground leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">Nothing critical this week</p>
              )}
            </div>

            {/* Can wait */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Can wait</p>
              {canWait.length > 0 ? (
                <ul className="space-y-1.5">
                  {canWait.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Clock className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="text-xs text-foreground leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">Nothing deferred</p>
              )}
            </div>

            {/* Should park */}
            <div className="p-4 rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-900/10 space-y-2">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Park it</p>
              {shouldPark.length > 0 ? (
                <ul className="space-y-1.5">
                  {shouldPark.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Pause className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                      <span className="text-xs text-foreground leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic">Nothing to park</p>
              )}
            </div>
          </div>

          {/* Divergence note: surface when today's plan differs from weekly intent */}
          {todayPlan && compass && (() => {
            const todayPrimaryId = todayPlan.primaryProjectId;
            const weeklyPrimaryId = compass.primaryProjectId;
            const todaySecondaryId = todayPlan.secondaryProjectId;
            const weeklySecondaryId = compass.secondaryProjectId;
            const primaryDiverges = weeklyPrimaryId && todayPrimaryId && todayPrimaryId !== weeklyPrimaryId;
            const secondaryDiverges = weeklySecondaryId && todaySecondaryId && todaySecondaryId !== weeklySecondaryId;
            if (!primaryDiverges && !secondaryDiverges) return null;
            const todayPrimaryProject = allProjects?.find((p) => p.id === todayPrimaryId);
            const todaySecondaryProject = allProjects?.find((p) => p.id === todaySecondaryId);
            return (
              <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/40">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Today diverges from weekly intent</p>
                </div>
                <div className="space-y-1.5">
                  {primaryDiverges && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Today's primary: <strong>{todayPrimaryProject?.title ?? "Unknown"}</strong> — weekly primary: <strong>{primaryProject?.title ?? "Unknown"}</strong>
                    </p>
                  )}
                  {secondaryDiverges && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Today's secondary: <strong>{todaySecondaryProject?.title ?? "Unknown"}</strong> — weekly secondary: <strong>{secondaryProject?.title ?? "Unknown"}</strong>
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-2">This is fine — just worth noticing.</p>
              </div>
            );
          })()}

          {/* Weekly → Daily relationship strip */}
          {todayPlan && compass && (
            <div className="p-4 rounded-xl border border-border bg-card">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">This week → today</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Weekly primary</p>
                  <p className="text-sm font-medium text-foreground">{primaryProject?.title ?? <span className="italic text-muted-foreground">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Today's primary</p>
                  <p className="text-sm font-medium text-foreground">
                    {allProjects?.find((p) => p.id === todayPlan.primaryProjectId)?.title ?? <span className="italic text-muted-foreground">No plan yet</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Weekly secondary</p>
                  <p className="text-sm font-medium text-foreground">{secondaryProject?.title ?? <span className="italic text-muted-foreground">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Today's secondary</p>
                  <p className="text-sm font-medium text-foreground">
                    {allProjects?.find((p) => p.id === todayPlan.secondaryProjectId)?.title ?? <span className="italic text-muted-foreground">—</span>}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Confirm dialog */}
          {confirming && (
            <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Confirm this week's compass</p>
                <p className="text-xs text-muted-foreground">
                  You can adjust the primary and secondary project before confirming.
                </p>
              </div>

              {/* Primary selector */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Primary project</label>
                <select
                  value={editPrimary === undefined ? (compass.primaryProjectId ?? "") : (editPrimary ?? "")}
                  onChange={(e) => setEditPrimary(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                >
                  <option value="">None</option>
                  {allProjects?.filter((p) => p.status === "active").map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              {/* Secondary selector */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Secondary project (optional)</label>
                <select
                  value={editSecondary === undefined ? (compass.secondaryProjectId ?? "") : (editSecondary ?? "")}
                  onChange={(e) => setEditSecondary(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                >
                  <option value="">None</option>
                  {allProjects?.filter((p) => p.status === "active").map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => confirm.mutate({
                    primaryProjectId: editPrimary !== undefined ? editPrimary : (compass.primaryProjectId ?? null),
                    secondaryProjectId: editSecondary !== undefined ? editSecondary : (compass.secondaryProjectId ?? null),
                    adminLane: compass.adminLane ?? undefined,
                  })}
                  disabled={confirm.isPending}
                >
                  {confirm.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Confirming...</> : "Confirm compass"}
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
