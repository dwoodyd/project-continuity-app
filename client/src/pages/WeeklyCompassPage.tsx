import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
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

export default function WeeklyCompassPage() {
  const [, navigate] = useLocation();
  const [confirming, setConfirming] = useState(false);

  const { data: compass, refetch, isLoading } = trpc.intelligence.getWeeklyCompass.useQuery();
  const { data: allProjects } = trpc.projects.list.useQuery();

  const generate = trpc.intelligence.generateWeeklyCompass.useMutation({
    onSuccess: () => {
      toast.success("Weekly Compass generated.");
      refetch();
    },
    onError: () => toast.error("Failed to generate compass. Try again."),
  });

  const confirm = trpc.intelligence.confirmWeeklyCompass.useMutation({
    onSuccess: () => {
      toast.success("Weekly Compass confirmed. You know where you're headed.");
      setConfirming(false);
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Week of {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
            </span>
          </div>
          <h1 className="text-[1.6rem] font-semibold tracking-[-0.02em] text-foreground leading-tight">Weekly Compass</h1>
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

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !compass && (
        <div className="p-10 rounded-2xl border border-dashed border-border text-center">
          <Compass className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm font-medium text-foreground mb-2">No compass set for this week.</p>
          <p className="text-xs text-muted-foreground mb-6 max-w-xs mx-auto">
            Generate your weekly compass to get AI-powered recommendations on where to focus your energy.
          </p>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending} className="gap-2">
            {generate.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
              : <><Sparkles className="w-4 h-4" />Generate this week's compass</>}
          </Button>
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
            <div className="p-5 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Weekly guidance</p>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{compass.generatedGuidance}</p>
            </div>
          )}

          {/* Primary + Secondary projects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Primary */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-foreground/60" />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Primary focus</p>
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
