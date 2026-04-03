import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  GitBranch,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  Zap,
  AlertTriangle,
  Target,
  Activity,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import UnstickModal from "@/components/UnstickModal";

// ─── Re-Entry Card Modal ──────────────────────────────────────────────────────
function ReEntryModal({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const [mode, setMode] = useState<"capture" | "return">("capture");
  const [contextNote, setContextNote] = useState("");
  const [whereLeft, setWhereLeft] = useState("");
  const [nextAction, setNextAction] = useState("");

  const captureContext = trpc.projects.updateContextBreadcrumb.useMutation({
    onSuccess: () => {
      toast.success("Context captured. Safe to step away.");
      onClose();
    },
    onError: () => toast.error("Failed to capture context."),
  });

  const generateReturn = trpc.ai.generateReEntryCard.useMutation();

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="px-5 pt-5 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <RefreshCw className="w-4 h-4 text-blue-500" />
            Re-Entry Card
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-3 flex gap-2 shrink-0">
          {[{ v: "capture", label: "Capture context" }, { v: "return", label: "Return to project" }].map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setMode(v as any)}
              className={cn(
                "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                mode === v ? "border-foreground/30 bg-foreground/5 text-foreground" : "border-border text-muted-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {mode === "capture" ? (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Where exactly are you right now?</label>
                <Textarea
                  value={whereLeft}
                  onChange={(e) => setWhereLeft(e.target.value)}
                  placeholder="What file, section, decision, or thought are you in the middle of?"
                  className="text-sm min-h-[80px] resize-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">What is the next physical action?</label>
                <Input
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  placeholder="The single most specific next step when you return..."
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Anything else to remember? <span className="font-normal">(optional)</span></label>
                <Textarea
                  value={contextNote}
                  onChange={(e) => setContextNote(e.target.value)}
                  placeholder="Open questions, decisions pending, context that will be lost..."
                  className="text-sm min-h-[70px] resize-none"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => captureContext.mutate({
                  id: projectId,
                  breadcrumb: whereLeft + (nextAction ? " | Next: " + nextAction : "") + (contextNote ? " | Note: " + contextNote : ""),
                })}
                disabled={!whereLeft.trim() || !nextAction.trim() || captureContext.isPending}
              >
                {captureContext.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : "Capture & step away"}
              </Button>
            </>
          ) : (
            <>
              {!generateReturn.data ? (
                <div className="text-center py-6">
                  <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate an AI-powered catch-up summary to get back into context fast.
                  </p>
                  <Button onClick={() => generateReturn.mutate({ projectId })} className="gap-2">
                    {generateReturn.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
                      : <><Sparkles className="w-4 h-4" />Generate catch-up</>}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">Where you left off:</p>
                    <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">{generateReturn.data.summary}</p>
                  </div>
                  {generateReturn.data.nextAction && (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">First action:</p>
                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{generateReturn.data.nextAction}</p>
                    </div>
                  )}
                  <Button className="w-full" onClick={onClose}>
                    I'm back in context — let's go
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Timeline Event Icon ──────────────────────────────────────────────────────
function TimelineEventIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ReactNode; color: string }> = {
    created: { icon: <Sparkles className="w-3 h-3" />, color: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" },
    focus_session: { icon: <Target className="w-3 h-3" />, color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400" },
    milestone: { icon: <CheckCircle2 className="w-3 h-3" />, color: "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400" },
    blocker: { icon: <AlertTriangle className="w-3 h-3" />, color: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" },
    decision: { icon: <GitBranch className="w-3 h-3" />, color: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400" },
    next_step_change: { icon: <ChevronRight className="w-3 h-3" />, color: "bg-foreground/10 text-foreground/60" },
    vault_import: { icon: <BookOpen className="w-3 h-3" />, color: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400" },
    check_in: { icon: <Activity className="w-3 h-3" />, color: "bg-foreground/10 text-foreground/60" },
    status_change: { icon: <Layers className="w-3 h-3" />, color: "bg-foreground/10 text-foreground/60" },
  };
  const entry = map[type] ?? { icon: <Clock className="w-3 h-3" />, color: "bg-foreground/10 text-foreground/60" };
  return (
    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0", entry.color)}>
      {entry.icon}
    </div>
  );
}

// ─── Main Project Detail Page ─────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const projectId = parseInt(params.id ?? "0");

  const [reEntryOpen, setReEntryOpen] = useState(false);
  const [unstickTask, setUnstickTask] = useState<{ id: string; title: string; projectId?: number | null } | null>(null);
  const [editingNext, setEditingNext] = useState(false);
  const [nextStepDraft, setNextStepDraft] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "clarity">("overview");
  const [timelineFilter, setTimelineFilter] = useState<"all" | "focus_session" | "decision" | "milestone" | "blocker">("all");

  const { data: project, refetch } = trpc.projects.getById.useQuery({ id: projectId });
  const { data: sources } = trpc.vault.listByState.useQuery({ state: "active" });
  const { data: timeline, refetch: refetchTimeline } = trpc.intelligence.getProjectTimeline.useQuery(
    { projectId, filterType: timelineFilter === "all" ? undefined : timelineFilter },
    { enabled: !!projectId && activeTab === "timeline" }
  );
  const { data: projectDecisions } = trpc.intelligence.getDecisionsForProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );
  const { data: claritySessions } = trpc.clarity.getByProject.useQuery(
    { projectId },
    { enabled: !!projectId && activeTab === "clarity" }
  );
  const buildTimeline = trpc.intelligence.buildProjectTimeline.useMutation({
    onSuccess: (data) => {
      toast.success(`Timeline synced — ${data.synced} events added.`);
      refetchTimeline();
    },
    onError: () => toast.error("Failed to sync timeline."),
  });

  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => { toast.success("Updated."); refetch(); setEditingNext(false); },
    onError: () => toast.error("Update failed."),
  });

  if (!project) {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: "text-emerald-600 dark:text-emerald-400",
    paused: "text-amber-600 dark:text-amber-400",
    idea: "text-muted-foreground",
    mapped: "text-blue-600 dark:text-blue-400",
    completed: "text-slate-500",
    archived: "text-muted-foreground/50",
  };

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "focus_session", label: "Focus" },
    { value: "decision", label: "Decisions" },
    { value: "milestone", label: "Milestones" },
    { value: "blocker", label: "Blockers" },
  ];

  return (
    <div className="px-4 py-6 space-y-6 page-enter">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Projects
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-xs font-medium capitalize", statusColors[project.status] ?? "text-muted-foreground")}>
                {project.status}
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-xs text-muted-foreground capitalize">{project.priorityLevel} priority</span>
            </div>
            <h1 className="text-[1.6rem] font-semibold tracking-[-0.02em] text-foreground leading-tight">{project.title}</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReEntryOpen(true)}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-Entry
            </Button>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {[
          { id: "overview" as const, label: "Overview" },
          { id: "timeline" as const, label: "Timeline" },
          { id: "clarity" as const, label: "Clarity" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <>
          {/* Why it matters */}
          {project.whyItMatters && (
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Why this matters</p>
              <p className="text-sm text-foreground leading-relaxed italic">"{project.whyItMatters}"</p>
            </div>
          )}

          {/* Next step */}
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Next physical action</p>
              <button
                onClick={() => { setEditingNext(true); setNextStepDraft(project.nextStep ?? ""); }}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
            {editingNext ? (
              <div className="space-y-2">
                <Input
                  value={nextStepDraft}
                  onChange={(e) => setNextStepDraft(e.target.value)}
                  className="text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") updateProject.mutate({ id: projectId, nextStep: nextStepDraft });
                    if (e.key === "Escape") setEditingNext(false);
                  }}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateProject.mutate({ id: projectId, nextStep: nextStepDraft })} disabled={updateProject.isPending}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingNext(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-foreground/40 mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">
                  {project.nextStep ?? <span className="text-muted-foreground italic">No next step defined</span>}
                </p>
                {project.nextStep && (
                  <button
                    onClick={() => setUnstickTask({ id: String(project.id), title: project.nextStep!, projectId: project.id })}
                    className="ml-auto text-muted-foreground hover:text-foreground p-1 transition-colors shrink-0"
                    title="Get unstuck on this step"
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Context breadcrumb */}
          {project.contextBreadcrumb && (
            <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/40">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1.5">Last stopping point</p>
              <p className="text-sm text-foreground leading-relaxed">{project.contextBreadcrumb}</p>
            </div>
          )}

          {/* Good enough threshold */}
          {project.goodEnoughThreshold && (
            <div className="p-4 rounded-xl bg-muted/30 border border-border/60">
              <p className="text-xs font-medium text-muted-foreground mb-1">Definition of "good enough"</p>
              <p className="text-sm text-foreground">{project.goodEnoughThreshold}</p>
            </div>
          )}

          {/* Status controls */}
          <div className="flex gap-2 flex-wrap">
            {(["idea", "mapped", "active", "paused", "completed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => updateProject.mutate({ id: projectId, status: s })}
                disabled={project.status === s}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  project.status === s
                    ? "border-foreground/30 bg-foreground/5 text-foreground cursor-default"
                    : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                )}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Decisions list */}
          {projectDecisions && projectDecisions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Decisions ({projectDecisions.length})
              </p>
              <div className="space-y-2">
                {projectDecisions.slice(0, 5).map((d: any) => (
                  <div key={d.id} className="flex items-start gap-3 p-3 rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-900/10">
                    <GitBranch className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground leading-snug">{d.content}</p>
                      {d.context && <p className="text-xs text-muted-foreground mt-0.5">{d.context}</p>}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Linked sources */}
          {sources && sources.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Linked sources ({sources.length})
              </p>
              <div className="space-y-2">
                {sources.slice(0, 5).map((source) => (
                  <div key={source.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                    <BookOpen className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {source.title ?? "Untitled source"}
                      </p>
                      {source.summary && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{source.summary}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Memory Timeline Tab ───────────────────────────────────────────────── */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          {/* Timeline header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Project Memory</p>
              <p className="text-xs text-muted-foreground mt-0.5">Every meaningful event in this project's history</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => buildTimeline.mutate({ projectId })}
              disabled={buildTimeline.isPending}
            >
              {buildTimeline.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Sync
            </Button>
          </div>

          {/* Insights strip */}
          {timeline?.insights && (
            <div className="grid grid-cols-3 gap-2">
              {timeline.insights.lastMovement && (
                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/60 dark:border-emerald-800/40">
                  <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 mb-1">Last movement</p>
                  <p className="text-xs text-foreground line-clamp-2">{timeline.insights.lastMovement.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(timeline.insights.lastMovement.occurredAt ?? timeline.insights.lastMovement.createdAt), { addSuffix: true })}
                  </p>
                </div>
              )}
              {timeline.insights.lastDecision && (
                <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/40">
                  <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 mb-1">Last decision</p>
                  <p className="text-xs text-foreground line-clamp-2">{timeline.insights.lastDecision.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(timeline.insights.lastDecision.occurredAt ?? timeline.insights.lastDecision.createdAt), { addSuffix: true })}
                  </p>
                </div>
              )}
              {timeline.insights.openLoops.length > 0 && (
                <div className="p-3 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-200/60 dark:border-red-800/40">
                  <p className="text-[10px] font-medium text-red-700 dark:text-red-400 mb-1">Open blocker</p>
                  <p className="text-xs text-foreground line-clamp-2">{timeline.insights.openLoops[0].content}</p>
                </div>
              )}
            </div>
          )}

          {/* Filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {filterOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTimelineFilter(value as any)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                  timelineFilter === value
                    ? "border-foreground/30 bg-foreground/5 text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/20"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Timeline events */}
          {!timeline && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {timeline && timeline.events.length === 0 && (
            <div className="p-8 rounded-xl border border-dashed border-border text-center">
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No events yet.</p>
              <p className="text-xs text-muted-foreground mb-4">
                Click "Sync" to backfill this project's history from your focus sessions and check-ins.
              </p>
              <Button size="sm" variant="outline" onClick={() => buildTimeline.mutate({ projectId })} disabled={buildTimeline.isPending}>
                {buildTimeline.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />Syncing...</> : "Build timeline"}
              </Button>
            </div>
          )}

          {timeline && timeline.events.length > 0 && (
            <div className="space-y-0">
              {timeline.events.map((event, idx) => (
                <div key={event.id} className="flex gap-3">
                  {/* Connector line */}
                  <div className="flex flex-col items-center">
                    <TimelineEventIcon type={event.eventType} />
                    {idx < timeline.events.length - 1 && (
                      <div className="w-px flex-1 bg-border/50 mt-1 mb-1 min-h-[16px]" />
                    )}
                  </div>
                  {/* Content */}
                  <div className={cn("pb-4 min-w-0 flex-1", idx === timeline.events.length - 1 && "pb-0")}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-foreground leading-relaxed">{event.content}</p>
                      <p className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">
                        {format(new Date(event.occurredAt ?? event.createdAt), "MMM d")}
                      </p>
                    </div>
                    {event.metadata && (() => {
                      try {
                        const meta = JSON.parse(event.metadata);
                        if (meta.durationSeconds) {
                          return (
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                              {Math.round(meta.durationSeconds / 60)} min · {meta.wasCompleted ? "completed" : "stepped away"}
                            </p>
                          );
                        }
                      } catch {}
                      return null;
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Clarity Sessions Tab ───────────────────────────────────────────────── */}
      {activeTab === "clarity" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-indigo-400" />
            <p className="text-sm font-medium text-foreground">Clarity Sessions</p>
            <span className="text-xs text-muted-foreground ml-1">linked to this project</span>
          </div>
          {!claritySessions ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : claritySessions.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-border text-center">
              <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No clarity sessions linked</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                When you run a Clarity Engine session and attach this project, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {claritySessions.map((session: any) => {
                const modeLabels: Record<string, string> = {
                  overwhelm: "Overwhelm",
                  decision: "Decision",
                  creative_block: "Creative Block",
                  identity_drift: "Identity Drift",
                  relationship_tension: "Relationship",
                  purpose_fog: "Purpose Fog",
                };
                const markerColors: Record<string, string> = {
                  clearer: "text-emerald-400",
                  ready_to_act: "text-indigo-400",
                  still_unsure: "text-amber-400",
                  need_to_revisit: "text-rose-400",
                };
                return (
                  <div key={session.id} className="p-4 rounded-xl bg-card border border-border/60 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-indigo-400 capitalize">
                        {modeLabels[session.mode] ?? session.mode}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {session.signalLine && (
                      <p className="text-sm text-foreground italic leading-snug">“{session.signalLine}”</p>
                    )}
                    {session.nextRightStep && (
                      <div className="pt-1">
                        <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Next right step</p>
                        <p className="text-xs text-foreground">{session.nextRightStep}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 pt-1">
                      {session.progressMarker && (
                        <span className={cn("text-[10px] font-medium capitalize", markerColors[session.progressMarker] ?? "text-muted-foreground")}>
                          {session.progressMarker.replace(/_/g, " ")}
                        </span>
                      )}
                      {session.convertedTo && (
                        <span className="text-[10px] text-muted-foreground">
                          Converted → {session.convertedTo.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {reEntryOpen && <ReEntryModal projectId={projectId} onClose={() => setReEntryOpen(false)} />}
      {unstickTask && <UnstickModal task={unstickTask} onClose={() => setUnstickTask(null)} />}
    </div>
  );
}
