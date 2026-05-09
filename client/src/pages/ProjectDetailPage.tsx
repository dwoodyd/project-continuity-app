import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
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
  Paperclip,
  StickyNote,
  MessageSquare,
  Upload,
  Trash2,
  Send,
  Plus,
  FileText,
  Image,
  File,
  Pin,
  Bot,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
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
import WrenPlayer from "@/components/WrenPlayer";
import { FirstMovableStepModal } from "@/components/FirstMovableStepModal";
import { ThresholdDiagnosisFlow } from "@/components/ThresholdDiagnosisFlow";

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
    vault_import: { icon: <BookOpen className="w-3 h-3" />, color: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400" },
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
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "clarity" | "files" | "notes" | "chat">("overview");
  const [timelineFilter, setTimelineFilter] = useState<"all" | "focus_session" | "decision" | "milestone" | "blocker">("all");
  const [fmsOpen, setFmsOpen] = useState(false);
  const [thresholdOpen, setThresholdOpen] = useState(false);

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
      <div className="px-5 py-7">
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
    <div className="px-5 py-7 space-y-7 page-enter max-w-4xl mx-auto">
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
            <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-foreground leading-tight">{project.title}</h1>
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
      <div className="flex gap-1 bg-muted rounded-xl p-1 overflow-x-auto">
        {[
          { id: "overview" as const, label: "Overview" },
          { id: "files" as const, label: "Files" },
          { id: "notes" as const, label: "Notes" },
          { id: "chat" as const, label: "AI Chat" },
          { id: "timeline" as const, label: "Timeline" },
          { id: "clarity" as const, label: "Clarity" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
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
                  <div className="ml-auto flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => setFmsOpen(true)}
                      className="text-amber-500 dark:text-amber-400 hover:text-amber-400 p-1 transition-colors"
                      title="Find my first movable step"
                    >
                      <span className="text-xs">🪶</span>
                    </button>
                    <button
                      onClick={() => setThresholdOpen(true)}
                      className="text-amber-500 hover:text-amber-400 p-1 transition-colors"
                      title="What's blocking me?"
                    >
                      <span className="text-xs">🚪</span>
                    </button>
                    <button
                      onClick={() => setUnstickTask({ id: String(project.id), title: project.nextStep!, projectId: project.id })}
                      className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                      title="Get unstuck on this step"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
            <Brain className="w-4 h-4 text-amber-400" />
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
                  ready_to_act: "text-amber-400",
                  still_unsure: "text-amber-400",
                  need_to_revisit: "text-rose-400",
                };
                return (
                  <div key={session.id} className="p-4 rounded-xl bg-card border border-border/60 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-amber-400 capitalize">
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

      {/* ── Files Tab ──────────────────────────────────────────────────────── */}
      {activeTab === "files" && (
        <WorkspaceFilesTab projectId={projectId} />
      )}

      {/* ── Notes Tab ──────────────────────────────────────────────────────── */}
      {activeTab === "notes" && (
        <WorkspaceNotesTab projectId={projectId} />
      )}

      {/* ── AI Chat Tab ────────────────────────────────────────────────────── */}
      {activeTab === "chat" && (
        <WorkspaceChatTab projectId={projectId} projectTitle={project.title} />
      )}

      {/* Modals */}
      {reEntryOpen && <ReEntryModal projectId={projectId} onClose={() => setReEntryOpen(false)} />}
      {unstickTask && <UnstickModal task={unstickTask} onClose={() => setUnstickTask(null)} />}
      <FirstMovableStepModal
        open={fmsOpen}
        onOpenChange={setFmsOpen}
        initialTask={project.nextStep ?? ""}
        projectId={projectId}
        onStartSession={() => navigate("/focus")}
      />
      {project.nextStep && thresholdOpen && (
        <ThresholdDiagnosisFlow
          open={thresholdOpen}
          onOpenChange={setThresholdOpen}
          taskDescription={project.nextStep}
          projectId={projectId}
          onStartSession={() => navigate("/focus")}
        />
      )}
    </div>
  );
}

// ─── Workspace: Files Tab ─────────────────────────────────────────────────────
function WorkspaceFilesTab({ projectId }: { projectId: number }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: files, refetch } = trpc.workspace.listFiles.useQuery({ projectId });

  const uploadFile = trpc.workspace.uploadFile.useMutation({
    onSuccess: () => { toast.success("File uploaded."); refetch(); },
    onError: (e) => toast.error(e.message ?? "Upload failed."),
  });

  const deleteFile = trpc.workspace.deleteFile.useMutation({
    onSuccess: () => { toast.success("File deleted."); refetch(); },
    onError: () => toast.error("Delete failed."),
  });

  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("File must be under 16 MB."); return; }
    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const base64 = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
      await uploadFile.mutateAsync({
        projectId,
        fileName: file.name,
        fileDataBase64: base64,
        mimeType: file.type || "application/octet-stream",
      });
    } catch { /* handled by onError */ }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }

  function fileIcon(mime: string) {
    if (mime.startsWith("image/")) return <Image className="w-4 h-4 text-blue-500" />;
    if (mime === "application/pdf") return <FileText className="w-4 h-4 text-red-500" />;
    return <File className="w-4 h-4 text-muted-foreground" />;
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{files?.length ?? 0} file{files?.length !== 1 ? "s" : ""}</p>
        <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
          Upload file
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.jpg,.jpeg,.png,.gif,.webp" />
      </div>

      {!files || files.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <Paperclip className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No files yet. Upload documents, images, or references for this project.</p>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload your first file
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors group">
              <div className="shrink-0">{fileIcon(file.mimeType)}</div>
              <div className="flex-1 min-w-0">
                <a href={file.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground hover:underline truncate block">{file.name}</a>
                <p className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes ?? 0)} · {format(new Date(file.createdAt), "MMM d, yyyy")}</p>
              </div>
              <button
                onClick={() => deleteFile.mutate({ fileId: file.id })}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Workspace: Notes Tab ─────────────────────────────────────────────────────
function WorkspaceNotesTab({ projectId }: { projectId: number }) {
  const { data: notes, refetch } = trpc.workspace.listNotes.useQuery({ projectId });
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");

  const createNote = trpc.workspace.createNote.useMutation({
    onSuccess: () => { toast.success("Note saved."); refetch(); setEditingId(null); },
    onError: () => toast.error("Failed to save note."),
  });

  const updateNote = trpc.workspace.updateNote.useMutation({
    onSuccess: () => { toast.success("Note updated."); refetch(); setEditingId(null); },
    onError: () => toast.error("Failed to update note."),
  });

  const deleteNote = trpc.workspace.deleteNote.useMutation({
    onSuccess: () => { toast.success("Note deleted."); refetch(); },
    onError: () => toast.error("Delete failed."),
  });

  const pinNote = trpc.workspace.updateNote.useMutation({
    onSuccess: () => refetch(),
  });

  function startNew() {
    setDraftTitle("");
    setDraftContent("");
    setEditingId("new");
  }

  function startEdit(note: { id: number; title: string | null; content: string }) {
    setDraftTitle(note.title ?? "");
    setDraftContent(note.content);
    setEditingId(note.id);
  }

  function saveNote() {
    if (!draftContent.trim()) { toast.error("Note content is required."); return; }
    if (editingId === "new") {
      createNote.mutate({ projectId, title: draftTitle || "Untitled note", content: draftContent });
    } else if (typeof editingId === "number") {
      updateNote.mutate({ noteId: editingId, title: draftTitle || "Untitled note", content: draftContent });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{notes?.length ?? 0} note{notes?.length !== 1 ? "s" : ""}</p>
        <Button size="sm" variant="outline" onClick={startNew}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> New note
        </Button>
      </div>

      {/* Editor */}
      {editingId !== null && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <Input
            placeholder="Note title (optional)"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            className="text-sm font-medium border-0 border-b rounded-none px-0 focus-visible:ring-0 bg-transparent"
          />
          <Textarea
            placeholder="Write your note here..."
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            className="min-h-[140px] text-sm resize-none border-0 px-0 focus-visible:ring-0 bg-transparent"
            autoFocus
          />
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={saveNote} disabled={createNote.isPending || updateNote.isPending}>
              {createNote.isPending || updateNote.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {!notes || notes.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <StickyNote className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No notes yet. Capture ideas, decisions, or context for this project.</p>
          <Button size="sm" variant="outline" onClick={startNew}><Plus className="w-3.5 h-3.5 mr-1.5" /> Add first note</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="p-4 rounded-xl border border-border bg-card group">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-sm font-medium text-foreground">{note.title ?? "Untitled note"}</p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => pinNote.mutate({ noteId: note.id, isPinned: !note.isPinned })}
                    className={cn("p-1 transition-colors", note.isPinned ? "text-amber-500" : "text-muted-foreground hover:text-foreground")}>
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => startEdit(note)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteNote.mutate({ noteId: note.id })} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{note.content}</p>
              <p className="text-[10px] text-muted-foreground/50 mt-2">{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Workspace: AI Chat Tab ───────────────────────────────────────────────────
function WorkspaceChatTab({ projectId, projectTitle }: { projectId: number; projectTitle: string }) {
  const { data: messages, refetch } = trpc.workspace.listMessages.useQuery({ projectId });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  // Show Wren intro once ever per project (localStorage flag)
  const wrenKey = `wren_chat_intro_${projectId}`;
  const [showWrenIntro, setShowWrenIntro] = useState(() => !localStorage.getItem(wrenKey));
  const dismissWrenIntro = () => {
    localStorage.setItem(wrenKey, "1");
    setShowWrenIntro(false);
  };

  const sendMessage = trpc.workspace.sendMessage.useMutation({
    onSuccess: () => { refetch(); setInput(""); },
    onError: (e) => toast.error(e.message ?? "Failed to send."),
  });

  const clearChat = trpc.workspace.clearChat.useMutation({
    onSuccess: () => { toast.success("Chat cleared."); refetch(); },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text || sendMessage.isPending) return;
    sendMessage.mutate({ projectId, message: text });
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "420px" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">AI Project Assistant</span>
        </div>
        {messages && messages.length > 0 && (
          <button onClick={() => clearChat.mutate({ projectId })}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto pb-4" style={{ maxHeight: "380px" }}>
        {/* Wren intro — shown once ever per project */}
        {showWrenIntro && (
          <div className="flex gap-2.5 justify-start">
            <div className="shrink-0 mt-0.5">
              <WrenPlayer clip="popsHead" size="sm" />
            </div>
            <div
              className="max-w-[80%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm leading-relaxed bg-muted text-foreground cursor-pointer"
              onClick={dismissWrenIntro}
            >
              <p className="whitespace-pre-wrap">
                Hi {firstName} — I'm Wren. I'm holding the thread for <strong>{projectTitle}</strong>. Ask me anything about it — context, next steps, blockers, or what you were thinking last time.
              </p>
              <p className="text-xs text-muted-foreground/50 mt-0.5 italic">Wren — your Continuary companion</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Tap to dismiss</p>
            </div>
          </div>
        )}
        {!messages || messages.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Ask anything about <strong>{projectTitle}</strong>.</p>
            <p className="text-xs text-muted-foreground/70">The assistant knows your project context, notes, and next steps.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              )}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        {sendMessage.isPending && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t border-border">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${projectTitle}...`}
          className="flex-1 text-sm"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={sendMessage.isPending}
        />
        <Button size="sm" onClick={handleSend} disabled={!input.trim() || sendMessage.isPending} className="shrink-0">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
