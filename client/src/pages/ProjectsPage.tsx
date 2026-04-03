import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Archive,
  Brain,
  CheckCircle2,
  ChevronRight,
  Circle,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
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
import { formatDistanceToNow } from "date-fns";

type ProjectStatus = "idea" | "mapped" | "active" | "paused" | "completed" | "archived";

const statusConfig: Record<ProjectStatus, { label: string; color: string; dot: string }> = {
  idea: { label: "Idea", color: "text-muted-foreground", dot: "bg-muted-foreground/40" },
  mapped: { label: "Mapped", color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-400" },
  active: { label: "Active", color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-400" },
  paused: { label: "Paused", color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-400" },
  completed: { label: "Completed", color: "text-slate-500", dot: "bg-slate-400" },
  archived: { label: "Archived", color: "text-muted-foreground/50", dot: "bg-muted-foreground/20" },
};

const priorityConfig = {
  low: "text-muted-foreground",
  medium: "text-amber-600 dark:text-amber-400",
  high: "text-red-600 dark:text-red-400",
};

// ─── Create Project Modal ─────────────────────────────────────────────────────
function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [whyItMatters, setWhyItMatters] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [goodEnough, setGoodEnough] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("idea");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const create = trpc.projects.create.useMutation({
    onSuccess: () => { toast.success("Project created."); onCreated(); onClose(); },
    onError: () => toast.error("Failed to create project."),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="px-5 pt-5 pb-0 shrink-0">
          <DialogTitle className="text-base font-semibold">New Project</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 font-normal">
            Define the project before you start. The "why" is the anchor.
          </p>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Project title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is this project called?"
              className="text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Why does this matter?</label>
            <Textarea
              value={whyItMatters}
              onChange={(e) => setWhyItMatters(e.target.value)}
              placeholder="What changes if this gets done? Who benefits? Why now?"
              className="text-sm min-h-[80px] resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">What is "good enough"?</label>
            <Input
              value={goodEnough}
              onChange={(e) => setGoodEnough(e.target.value)}
              placeholder="Define the minimum viable completion..."
              className="text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Next physical action</label>
            <Input
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              placeholder="The single most specific next step..."
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["idea", "mapped", "active", "paused"] as ProjectStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Priority</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => create.mutate({ title, whyItMatters, nextStep, goodEnoughThreshold: goodEnough, status, priorityLevel: priority })}
            disabled={!title.trim() || create.isPending}
          >
            {create.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Creating...</> : "Create project"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Health Score Dot ────────────────────────────────────────────────────────
function HealthDot({ score }: { score?: number }) {
  if (score === undefined) return null;
  const color = score >= 70 ? "bg-emerald-400" : score >= 45 ? "bg-amber-400" : "bg-red-400";
  return (
    <span
      title={`Health score: ${score}`}
      className={cn("w-2 h-2 rounded-full shrink-0 ring-1 ring-white/20", color)}
    />
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick, healthScore }: { project: any; onClick: () => void; healthScore?: number }) {
  const cfg = statusConfig[project.status as ProjectStatus] ?? statusConfig.idea;
  const priorityCfg = priorityConfig[project.priorityLevel as keyof typeof priorityConfig] ?? priorityConfig.medium;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 shadow-[0_1px_2px_oklch(0_0_0/0.04)] transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
            <span className={cn("text-xs font-medium", cfg.color)}>{cfg.label}</span>
            {healthScore !== undefined && (
              <span className="flex items-center gap-1 ml-1">
                <HealthDot score={healthScore} />
                <span className="text-xs text-muted-foreground/60">{healthScore}</span>
              </span>
            )}
            <span className={cn("text-xs font-medium ml-auto", priorityCfg)}>{project.priorityLevel}</span>
          </div>
          <p className="text-sm font-semibold text-foreground">{project.title}</p>
          {project.nextStep && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Next: {project.nextStep}
            </p>
          )}
          {project.whyItMatters && (
            <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1 italic">
              "{project.whyItMatters.substring(0, 80)}"
            </p>
          )}
          {project.lastTouchedAt && (
            <p className="text-xs text-muted-foreground/40 mt-1.5">
              Last touched {formatDistanceToNow(new Date(project.lastTouchedAt), { addSuffix: true })}
            </p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}

// ─── Main Projects Page ───────────────────────────────────────────────────────
export default function ProjectsPage() {
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");

  const { data: projects, refetch } = trpc.projects.list.useQuery();
  const { data: healthScores } = trpc.insights.getHealthScores.useQuery();

  // Build projectId → score map
  const scoreMap = new Map<number, number>(
    (healthScores ?? []).map((hs: any) => [hs.projectId, hs.score])
  );

  const filtered = projects?.filter((p) =>
    filter === "all" ? p.status !== "archived" : p.status === filter
  ) ?? [];

  const statusCounts = projects?.reduce((acc, p) => {
    acc[p.status as ProjectStatus] = (acc[p.status as ProjectStatus] ?? 0) + 1;
    return acc;
  }, {} as Partial<Record<ProjectStatus, number>>) ?? {};

  return (
    <div className="px-4 py-6 space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[1.6rem] font-semibold tracking-[-0.02em] text-foreground leading-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projects?.filter((p) => p.status === "active").length ?? 0} active · {projects?.length ?? 0} total
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" />
          New project
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {(["all", "active", "mapped", "idea", "paused", "completed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filter === s
                ? "bg-primary text-white shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent hover:border-primary/20"
            )}
          >
            {s === "all" ? "All" : statusConfig[s].label}
            {s !== "all" && statusCounts[s] ? (
              <span className="ml-1.5 opacity-60">{statusCounts[s]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Projects list */}
      {filtered.length === 0 ? (
        filter === "all" ? (
          <div className="relative overflow-hidden p-10 rounded-2xl text-center" style={{background: 'linear-gradient(135deg, oklch(0.51 0.24 264) 0%, oklch(0.45 0.22 280) 100%)'}}>
            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, oklch(0.72 0.17 65) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.99 0 0) 0%, transparent 40%)'}} />
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <p className="text-base font-semibold text-white mb-1">No projects yet.</p>
              <p className="text-sm text-white/70 mb-5">Projects are the containers for your work. Start by defining one.</p>
              <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-semibold shadow-lg shadow-black/20 border-0 gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Create first project
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-xl border border-dashed border-border text-center">
            <Brain className="w-7 h-7 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No {filter} projects.</p>
          </div>
        )
      ) : (
        <div className="space-y-2.5">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              healthScore={scoreMap.get(project.id)}
              onClick={() => navigate(`/projects/${project.id}`)}
            />
          ))}
        </div>
      )}

      {createOpen && <CreateProjectModal onClose={() => setCreateOpen(false)} onCreated={refetch} />}
    </div>
  );
}
