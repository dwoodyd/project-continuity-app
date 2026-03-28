import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
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
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <RefreshCw className="w-4 h-4 text-blue-500" />
            Re-Entry Card
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-3 flex gap-2">
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

        <div className="px-5 py-4 space-y-4">
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
                onClick={() => captureContext.mutate({ id: projectId, breadcrumb: whereLeft + (nextAction ? ' | Next: ' + nextAction : '') + (contextNote ? ' | Note: ' + contextNote : '') })}
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
                    {generateReturn.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate catch-up</>}

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

// ─── Main Project Detail Page ─────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const projectId = parseInt(params.id ?? "0");

  const [reEntryOpen, setReEntryOpen] = useState(false);
  const [unstickTask, setUnstickTask] = useState<{ id: string; title: string; projectId?: number | null } | null>(null);
  const [editingNext, setEditingNext] = useState(false);
  const [nextStepDraft, setNextStepDraft] = useState("");

  const { data: project, refetch } = trpc.projects.getById.useQuery({ id: projectId });
  const { data: sources } = trpc.vault.listByState.useQuery({ state: "active" });

  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => { toast.success("Updated."); refetch(); setEditingNext(false); },
    onError: () => toast.error("Update failed."),
  });

  if (!project) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 page-enter">
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
            <h1 className="text-2xl font-semibold text-foreground">{project.title}</h1>
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

      {/* Linked sources */}
      {sources && sources.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Linked sources ({sources.length})
          </p>
          <div className="space-y-2">
            {sources.map((source) => (
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

      {/* Modals */}
      {reEntryOpen && <ReEntryModal projectId={projectId} onClose={() => setReEntryOpen(false)} />}
      {unstickTask && <UnstickModal task={unstickTask} onClose={() => setUnstickTask(null)} />}
    </div>
  );
}
