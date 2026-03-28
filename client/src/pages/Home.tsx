import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  Battery,
  BatteryLow,
  BatteryMedium,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Loader2,
  Moon,
  Sparkles,
  Sun,
  Sunset,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import IdeaSanctuaryModal from "@/components/IdeaSanctuaryModal";
import UnstickModal from "@/components/UnstickModal";

// ─── Types ────────────────────────────────────────────────────────────────────
type CapacityLevel = "full" | "partial" | "low";
type CheckInStep = "morning" | "midday" | "evening";

const capacityConfig = {
  full: { label: "Full capacity", icon: Battery, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" },
  partial: { label: "Partial capacity", icon: BatteryMedium, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" },
  low: { label: "Low capacity", icon: BatteryLow, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" },
};

// ─── Morning Check-In Form ────────────────────────────────────────────────────
function MorningCheckIn({ onComplete }: { onComplete: () => void }) {
  const [capacity, setCapacity] = useState<CapacityLevel>("partial");
  const [notes, setNotes] = useState("");
  const [primaryId, setPrimaryId] = useState<number | undefined>();
  const { data: projects } = trpc.projects.listActive.useQuery();

  const submit = trpc.checkIns.submitMorning.useMutation({
    onSuccess: () => {
      toast.success("Morning plan set. Let's go.");
      onComplete();
    },
    onError: () => toast.error("Something went wrong. Try again."),
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-foreground mb-3">How is your capacity today?</p>
        <div className="grid grid-cols-3 gap-2">
          {(["full", "partial", "low"] as CapacityLevel[]).map((level) => {
            const cfg = capacityConfig[level];
            const Icon = cfg.icon;
            return (
              <button
                key={level}
                onClick={() => setCapacity(level)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                  capacity === level ? `${cfg.bg} ${cfg.color} border-current` : "border-border text-muted-foreground hover:border-foreground/20"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs leading-tight text-center">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {projects && projects.length > 0 && (
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Primary project today?</p>
          <div className="space-y-1.5">
            {projects.slice(0, 5).map((p) => (
              <button
                key={p.id}
                onClick={() => setPrimaryId(primaryId === p.id ? undefined : p.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors",
                  primaryId === p.id
                    ? "border-foreground/30 bg-foreground/5 text-foreground font-medium"
                    : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                )}
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-foreground mb-2">Anything to flag? <span className="font-normal text-muted-foreground">(optional)</span></p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Appointments, known interruptions, energy notes..."
          className="text-sm min-h-[80px] resize-none"
        />
      </div>

      <Button
        onClick={() => submit.mutate({ capacityLevel: capacity, primaryProjectId: primaryId, userNotes: notes })}
        disabled={submit.isPending}
        className="w-full"
      >
        {submit.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating plan...</> : "Set today's plan"}
      </Button>
    </div>
  );
}

// ─── Midday Check-In Form ─────────────────────────────────────────────────────
function MiddayCheckIn({ onComplete }: { onComplete: () => void }) {
  const [workedOn, setWorkedOn] = useState("");
  const [wasOnPlan, setWasOnPlan] = useState<boolean | null>(null);
  const [interruptions, setInterruptions] = useState("");

  const submit = trpc.checkIns.submitMidday.useMutation({
    onSuccess: (data) => {
      toast.success("Midday check-in complete.");
      onComplete();
    },
    onError: () => toast.error("Something went wrong."),
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground mb-2">What have you worked on this morning?</p>
        <Textarea
          value={workedOn}
          onChange={(e) => setWorkedOn(e.target.value)}
          placeholder="Be specific — what did you actually touch?"
          className="text-sm min-h-[80px] resize-none"
          autoFocus
        />
      </div>

      <div>
        <p className="text-sm font-medium text-foreground mb-2">Was it on plan?</p>
        <div className="flex gap-2">
          {[{ v: true, label: "Yes, on plan" }, { v: false, label: "No, went sideways" }].map(({ v, label }) => (
            <button
              key={String(v)}
              onClick={() => setWasOnPlan(v)}
              className={cn(
                "flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors",
                wasOnPlan === v
                  ? "border-foreground/30 bg-foreground/5 text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/20"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground mb-2">Any interruptions? <span className="font-normal text-muted-foreground">(optional)</span></p>
        <Textarea
          value={interruptions}
          onChange={(e) => setInterruptions(e.target.value)}
          placeholder="What pulled you away?"
          className="text-sm min-h-[60px] resize-none"
        />
      </div>

      <Button
        onClick={() => submit.mutate({ workedOn, wasOnPlan: wasOnPlan ?? false, interruptions })}
        disabled={!workedOn.trim() || wasOnPlan === null || submit.isPending}
        className="w-full"
      >
        {submit.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</> : "Submit midday check-in"}
      </Button>
    </div>
  );
}

// ─── Evening Check-In Form ────────────────────────────────────────────────────
function EveningCheckIn({ onComplete }: { onComplete: () => void }) {
  const [whatMoved, setWhatMoved] = useState("");
  const [whatRemains, setWhatRemains] = useState("");
  const [whatLearned, setWhatLearned] = useState("");
  const [tomorrowFirst, setTomorrowFirst] = useState("");

  const submit = trpc.checkIns.submitEvening.useMutation({
    onSuccess: () => {
      toast.success("Day closed. Tomorrow's brief is ready.");
      onComplete();
    },
    onError: () => toast.error("Something went wrong."),
  });

  const fields = [
    { key: "whatMoved", label: "What moved today?", val: whatMoved, set: setWhatMoved, placeholder: "What actually got done or decided?" },
    { key: "whatRemains", label: "What remains open?", val: whatRemains, set: setWhatRemains, placeholder: "What's still in progress or unresolved?" },
    { key: "whatLearned", label: "What did you learn or decide?", val: whatLearned, set: setWhatLearned, placeholder: "Any insights, decisions, or course corrections?" },
    { key: "tomorrowFirst", label: "What goes first tomorrow?", val: tomorrowFirst, set: setTomorrowFirst, placeholder: "The single most important thing to start with" },
  ];

  return (
    <div className="space-y-4">
      {fields.map(({ key, label, val, set, placeholder }) => (
        <div key={key}>
          <p className="text-sm font-medium text-foreground mb-1.5">{label}</p>
          <Textarea
            value={val}
            onChange={(e) => set(e.target.value)}
            placeholder={placeholder}
            className="text-sm min-h-[70px] resize-none"
          />
        </div>
      ))}

      <Button
        onClick={() => submit.mutate({ whatMoved, whatRemains, whatLearned, tomorrowFirst })}
        disabled={!whatMoved.trim() || !tomorrowFirst.trim() || submit.isPending}
        className="w-full"
      >
        {submit.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Closing the day...</> : "Close the day"}
      </Button>
    </div>
  );
}

// ─── Task Item ────────────────────────────────────────────────────────────────
function TaskItem({ task, onComplete, onUnstick }: {
  task: { id: string; title: string; done: boolean; projectId?: number | null };
  onComplete: (id: string) => void;
  onUnstick: (task: { id: string; title: string; projectId?: number | null }) => void;
}) {
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border transition-all group",
      task.done ? "border-border/40 bg-muted/20 opacity-60" : "border-border bg-card hover:border-foreground/20"
    )}>
      <button
        onClick={() => !task.done && onComplete(task.id)}
        className="mt-0.5 shrink-0"
        disabled={task.done}
      >
        {task.done
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          : <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
        }
      </button>
      <p className={cn("flex-1 text-sm leading-relaxed", task.done && "line-through text-muted-foreground")}>
        {task.title}
      </p>
      {!task.done && (
        <button
          onClick={() => onUnstick(task)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded"
          title="Get unstuck"
        >
          <Zap className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Check-In Card ────────────────────────────────────────────────────────────
function CheckInCard({
  type,
  icon: Icon,
  label,
  timeHint,
  completed,
  active,
  onOpen,
}: {
  type: CheckInStep;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  timeHint: string;
  completed: boolean;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      disabled={completed}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border text-left transition-all w-full",
        completed
          ? "border-border/40 bg-muted/20 opacity-50 cursor-default"
          : active
          ? "border-foreground/20 bg-card hover:bg-accent shadow-sm"
          : "border-border bg-card/50 text-muted-foreground hover:bg-card"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
        completed ? "bg-emerald-100 dark:bg-emerald-900/30" : active ? "bg-foreground/8" : "bg-muted"
      )}>
        {completed
          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          : <Icon className={cn("w-4 h-4", active ? "text-foreground" : "text-muted-foreground")} />
        }
      </div>
      <div className="min-w-0">
        <p className={cn("text-sm font-medium", completed && "line-through")}>{label}</p>
        <p className="text-xs text-muted-foreground">{timeHint}</p>
      </div>
      {active && !completed && (
        <Badge variant="secondary" className="ml-auto text-xs shrink-0">Now</Badge>
      )}
    </button>
  );
}

// ─── Main Command Center ──────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeCheckIn, setActiveCheckIn] = useState<CheckInStep | null>(null);
  const [unstickTask, setUnstickTask] = useState<{ id: string; title: string; projectId?: number | null } | null>(null);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [completedCheckIns, setCompletedCheckIns] = useState<Set<CheckInStep>>(new Set());

  const now = new Date();
  const hour = now.getHours();
  const todayStr = now.toISOString().split("T")[0]!;

  // Determine active check-in period
  const activePeriod: CheckInStep = hour < 12 ? "morning" : hour < 17 ? "midday" : "evening";

  const { data: todayPlan, refetch: refetchPlan } = trpc.dailyPlan.getToday.useQuery();
  const { data: todayCheckIns, refetch: refetchCheckIns } = trpc.checkIns.getToday.useQuery();
  const { data: tomorrowBrief } = trpc.dailyPlan.getTomorrowBrief.useQuery();
  const { data: amnestyCheck } = trpc.ai.checkAmnesty.useQuery();
  const { data: activeProjects } = trpc.projects.listActive.useQuery();

  const completeTask = trpc.checkIns.completeTask.useMutation({
    onSuccess: () => refetchPlan(),
  });

  const tasks = todayPlan?.criticalTasks ? JSON.parse(todayPlan.criticalTasks) : [];
  const completedTasks = tasks.filter((t: any) => t.done).length;
  const allTasksDone = tasks.length > 0 && completedTasks === tasks.length;

  // Determine which check-ins are done
  const morningDone = todayCheckIns?.some((c) => c.type === "morning") ?? completedCheckIns.has("morning");
  const middayDone = todayCheckIns?.some((c) => c.type === "midday") ?? completedCheckIns.has("midday");
  const eveningDone = todayCheckIns?.some((c) => c.type === "evening") ?? completedCheckIns.has("evening");

  const handleCheckInComplete = (type: CheckInStep) => {
    setCompletedCheckIns((prev) => { const s = new Set(prev); s.add(type); return s; });
    setActiveCheckIn(null);
    refetchCheckIns();
    refetchPlan();
  };

  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 page-enter">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {greeting}, {firstName}.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(now, "EEEE, MMMM d")}
          </p>
        </div>
        {todayPlan && (
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border",
            capacityConfig[todayPlan.capacityLevel ?? "partial"].bg,
            capacityConfig[todayPlan.capacityLevel ?? "partial"].color
          )}>
            {(() => {
              const cfg = capacityConfig[todayPlan.capacityLevel ?? "partial"];
              const Icon = cfg.icon;
              return <Icon className="w-3.5 h-3.5" />;
            })()}
            {capacityConfig[todayPlan.capacityLevel ?? "partial"].label}
          </div>
        )}
      </div>

      {/* ── Amnesty Notice ─────────────────────────────────────────────────── */}
      {amnestyCheck?.needsAmnesty && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
            {amnestyCheck.message}
          </p>
        </div>
      )}

      {/* ── Tomorrow Brief (shown in morning) ──────────────────────────────── */}
      {tomorrowBrief && !morningDone && (
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Yesterday's brief for today</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{tomorrowBrief}</p>
        </div>
      )}

      {/* ── AI Guidance ────────────────────────────────────────────────────── */}
      {todayPlan?.generatedGuidance && (
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today's guidance</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{todayPlan.generatedGuidance}</p>
        </div>
      )}

      {/* ── Check-In Cards ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Daily rhythm</p>
        <div className="space-y-2">
          <CheckInCard
            type="morning"
            icon={Sun}
            label="Morning check-in"
            timeHint="Set capacity & primary focus"
            completed={morningDone}
            active={activePeriod === "morning" && !morningDone}
            onOpen={() => setActiveCheckIn("morning")}
          />
          <CheckInCard
            type="midday"
            icon={Clock}
            label="Midday check-in"
            timeHint="Alignment pulse — on plan?"
            completed={middayDone}
            active={activePeriod === "midday" && morningDone && !middayDone}
            onOpen={() => setActiveCheckIn("midday")}
          />
          <CheckInCard
            type="evening"
            icon={Sunset}
            label="Evening closure"
            timeHint="Close the day, set tomorrow"
            completed={eveningDone}
            active={activePeriod === "evening" && !eveningDone}
            onOpen={() => setActiveCheckIn("evening")}
          />
        </div>
      </div>

      {/* ── Active Check-In Form ────────────────────────────────────────────── */}
      {activeCheckIn && (
        <div className="p-5 rounded-xl bg-card border border-foreground/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground capitalize">
              {activeCheckIn} check-in
            </h3>
            <button
              onClick={() => setActiveCheckIn(null)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          {activeCheckIn === "morning" && <MorningCheckIn onComplete={() => handleCheckInComplete("morning")} />}
          {activeCheckIn === "midday" && <MiddayCheckIn onComplete={() => handleCheckInComplete("midday")} />}
          {activeCheckIn === "evening" && <EveningCheckIn onComplete={() => handleCheckInComplete("evening")} />}
        </div>
      )}

      {/* ── Today's Tasks ───────────────────────────────────────────────────── */}
      {tasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Today's tasks
            </p>
            <span className="text-xs text-muted-foreground">{completedTasks}/{tasks.length}</span>
          </div>

          {allTasksDone ? (
            <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">All tasks complete.</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                That's the work. The rest is bonus.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task: any) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={(id) => completeTask.mutate({ taskId: id })}
                  onUnstick={(t) => setUnstickTask(t)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Single Focus Mode CTA ───────────────────────────────────────────── */}
      {tasks.length > 0 && !allTasksDone && (
        <button
          onClick={() => navigate("/focus")}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-foreground text-background hover:bg-foreground/90 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5" />
            <div className="text-left">
              <p className="text-sm font-semibold">Enter Single Focus Mode</p>
              <p className="text-xs opacity-70">Distraction-free, one task at a time</p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 rotate-[-90deg] opacity-60 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* ── First Step Card ─────────────────────────────────────────────────── */}
      {activeProjects && activeProjects.length > 0 && (() => {
        const primaryProjectId = todayPlan?.primaryProjectId;
        const topProject = primaryProjectId
          ? activeProjects.find((p) => p.id === primaryProjectId) ?? activeProjects[0]
          : activeProjects[0];
        if (!topProject?.nextStep) return null;
        return (
          <div className="p-4 rounded-xl bg-foreground/[0.03] border border-foreground/10 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-foreground/10 flex items-center justify-center">
                <ArrowRight className="w-3 h-3 text-foreground/60" />
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start here</p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground leading-snug">{topProject.nextStep}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{topProject.title}</p>
            </div>
            {topProject.contextBreadcrumb && (
              <div className="border-l-2 border-border pl-3">
                <p className="text-xs text-muted-foreground/70 italic leading-relaxed">
                  Last stopping point: {topProject.contextBreadcrumb}
                </p>
              </div>
            )}
            <div className="flex items-center justify-end">
              <button
                onClick={() => navigate("/focus")}
                className="text-xs text-foreground/60 hover:text-foreground transition-colors underline underline-offset-2"
              >
                Open in Focus Mode
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Active Projects Quick Access ────────────────────────────────────── */}
      {activeProjects && activeProjects.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Active projects</p>
          <div className="space-y-2">
            {activeProjects.slice(0, 3).map((project) => (
              <button
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:border-foreground/20 hover:bg-accent transition-colors text-left group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{project.title}</p>
                  {project.nextStep && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">Next: {project.nextStep}</p>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground rotate-[-90deg] shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state — no plan yet ───────────────────────────────────────── */}
      {!todayPlan && !activeCheckIn && (
        <div className="p-6 rounded-xl border border-dashed border-border text-center">
          <Sun className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">No plan for today yet.</p>
          <p className="text-xs text-muted-foreground mb-4">Start with the morning check-in to set your capacity and focus.</p>
          <Button size="sm" onClick={() => setActiveCheckIn("morning")}>
            Start morning check-in
          </Button>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <IdeaSanctuaryModal open={ideaOpen} onClose={() => setIdeaOpen(false)} capturedDuringTask={true} />
      {unstickTask && (
        <UnstickModal
          task={unstickTask}
          onClose={() => setUnstickTask(null)}
        />
      )}
    </div>
  );
}
