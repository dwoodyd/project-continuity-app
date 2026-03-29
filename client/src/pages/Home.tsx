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
  RotateCcw,
  Lightbulb,
  BookOpen,
} from "lucide-react";
import { useState, useMemo } from "react";
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
  full: {
    label: "Full capacity",
    icon: Battery,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    taskCount: "Up to 3 tasks",
    description: "You have full bandwidth today. Primary and secondary projects are both in play.",
  },
  partial: {
    label: "Partial capacity",
    icon: BatteryMedium,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    taskCount: "1–2 tasks",
    description: "One project, one or two tasks. Secondary work waits.",
  },
  low: {
    label: "Low capacity",
    icon: BatteryLow,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    taskCount: "1 task only",
    description: "One thing. That's the whole plan. Showing up is enough.",
  },
};

// ─── Task Item ────────────────────────────────────────────────────────────────
function TaskItem({
  task,
  onComplete,
  onUnstick,
  isCarryover = false,
}: {
  task: any;
  onComplete: (id: string) => void;
  onUnstick: (t: { id: string; title: string; projectId?: number | null }) => void;
  isCarryover?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-150 group",
      task.done
        ? "bg-foreground/[0.02] border-border opacity-50"
        : isCarryover
          ? "bg-amber-50/40 dark:bg-amber-900/10 border-amber-200/80 dark:border-amber-800/40 shadow-sm"
          : "bg-card border-border hover:border-foreground/20 hover:shadow-sm shadow-[0_1px_2px_oklch(0_0_0/0.04)]"
    )}>
      <button
        onClick={() => !task.done && onComplete(task.id)}
        className={cn(
          "mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 transition-all duration-150 flex items-center justify-center",
          task.done
            ? "bg-emerald-500/20 border-emerald-500/40"
            : "border-foreground/25 hover:border-foreground/50 hover:bg-foreground/5"
        )}
        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
      >
        {task.done && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm leading-snug tracking-[-0.005em]",
          task.done && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>
        {isCarryover && !task.done && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5 block">carried over</span>
        )}
      </div>
      {!task.done && (
        <button
          onClick={() => onUnstick({ id: task.id, title: task.title, projectId: task.projectId })}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-foreground/5 shrink-0"
          title="Get unstuck"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
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
  icon: React.ElementType;
  label: string;
  timeHint: string;
  completed: boolean;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={!completed ? onOpen : undefined}
      disabled={completed}
      className={cn(
        "flex-1 flex flex-col items-start gap-1.5 p-3.5 rounded-xl border text-left transition-all duration-150",
        completed
          ? "bg-foreground/[0.02] border-border opacity-55 cursor-default"
          : active
            ? "bg-card border-foreground/25 hover:border-foreground/40 shadow-sm cursor-pointer ring-1 ring-foreground/5"
            : "bg-foreground/[0.02] border-border hover:bg-foreground/[0.04] hover:border-foreground/15 cursor-pointer"
      )}
    >
      <div className="flex items-center gap-1.5 w-full">
        <Icon className={cn(
          "w-3.5 h-3.5 shrink-0",
          completed ? "text-muted-foreground" : active ? "text-foreground" : "text-muted-foreground"
        )} />
        <span className={cn(
          "text-xs font-medium tracking-[-0.01em]",
          completed ? "text-muted-foreground" : active ? "text-foreground" : "text-muted-foreground"
        )}>
          {label}
        </span>
        {completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
        {active && !completed && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse" style={{background: 'oklch(0.72 0.14 65)'}} />
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/55 leading-tight pl-0.5">{timeHint}</p>
    </button>
  );
}

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
        <p className="text-xs font-medium text-muted-foreground mb-3">How's your capacity today?</p>
        <div className="grid grid-cols-3 gap-2">
          {(["full", "partial", "low"] as CapacityLevel[]).map((level) => {
            const cfg = capacityConfig[level];
            const Icon = cfg.icon;
            return (
              <button
                key={level}
                onClick={() => setCapacity(level)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
                  capacity === level
                    ? cn("border-foreground/30 bg-foreground/5", cfg.color)
                    : "border-border hover:border-foreground/20"
                )}
              >
                <Icon className={cn("w-5 h-5", capacity === level ? cfg.color : "text-muted-foreground")} />
                <span className="text-xs font-medium">{cfg.label}</span>
                <span className="text-[9px] text-muted-foreground leading-tight">{cfg.taskCount}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground/70 mt-2 leading-relaxed">
          {capacityConfig[capacity].description}
        </p>
      </div>
      {projects && projects.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Primary focus today</p>
          <div className="space-y-1.5">
            {projects.slice(0, 4).map((p) => (
              <button
                key={p.id}
                onClick={() => setPrimaryId(p.id === primaryId ? undefined : p.id)}
                className={cn(
                  "w-full flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-all",
                  primaryId === p.id
                    ? "border-foreground/30 bg-foreground/5 text-foreground"
                    : "border-border hover:border-foreground/20 text-muted-foreground"
                )}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", primaryId === p.id ? "bg-foreground" : "bg-muted-foreground/30")} />
                <span className="truncate">{p.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Anything to note? <span className="font-normal opacity-60">(optional)</span></p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Appointments, constraints, what's on your mind..."
          className="text-sm resize-none"
          rows={2}
        />
      </div>
      <Button
        onClick={() => submit.mutate({ capacityLevel: capacity, primaryProjectId: primaryId, userNotes: notes || undefined })}
        disabled={submit.isPending}
        className="w-full"
        size="sm"
      >
        {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Set today's plan
      </Button>
    </div>
  );
}

// ─── Midday Check-In Form ─────────────────────────────────────────────────────
function MiddayCheckIn({ onComplete }: { onComplete: () => void }) {
  const [workedOn, setWorkedOn] = useState("");
  const [wasOnPlan, setWasOnPlan] = useState<boolean | null>(null);
  const [interruptions, setInterruptions] = useState("");
  const [nextMove, setNextMove] = useState("");
  const classifyDistraction = trpc.intelligence.classifyAndSaveDistraction.useMutation();
  const submit = trpc.checkIns.submitMidday.useMutation({
    onSuccess: (data) => {
      toast.success(data.response ?? "Midday check-in complete.");
      onComplete();
    },
    onError: () => toast.error("Something went wrong. Try again."),
  });
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">What did you work on this morning?</p>
        <Textarea
          value={workedOn}
          onChange={(e) => setWorkedOn(e.target.value)}
          placeholder="What actually happened..."
          className="text-sm resize-none"
          rows={2}
        />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Was it on plan?</p>
        <div className="flex gap-2">
          {[{ v: true, l: "Yes" }, { v: false, l: "Not really" }].map(({ v, l }) => (
            <button
              key={String(v)}
              onClick={() => setWasOnPlan(v)}
              className={cn(
                "flex-1 py-2 rounded-lg border text-sm transition-all",
                wasOnPlan === v ? "border-foreground/30 bg-foreground/5 text-foreground font-medium" : "border-border text-muted-foreground hover:border-foreground/20"
              )}
            >{l}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Any interruptions? <span className="font-normal opacity-60">(optional)</span></p>
        <Textarea
          value={interruptions}
          onChange={(e) => setInterruptions(e.target.value)}
          placeholder="Meetings, messages, unexpected tasks..."
          className="text-sm resize-none"
          rows={1}
        />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">What's the next move? <span className="font-normal opacity-60">(optional)</span></p>
        <Textarea
          value={nextMove}
          onChange={(e) => setNextMove(e.target.value)}
          placeholder="What happens right after this check-in..."
          className="text-sm resize-none"
          rows={1}
        />
      </div>
      <Button
        onClick={() => {
          if (!workedOn.trim() || wasOnPlan === null) {
            toast.error("Fill in what you worked on and whether it was on plan.");
            return;
          }
          // Fire-and-forget distraction classification if interruptions were noted
          if (interruptions.trim()) {
            classifyDistraction.mutate({ rawInput: interruptions, checkInType: "midday" });
          }
          submit.mutate({ workedOn, wasOnPlan, interruptions: interruptions || undefined, nextMove: nextMove || undefined });
        }}
        disabled={submit.isPending}
        className="w-full"
        size="sm"
      >
        {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Submit midday check-in
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
  const [decision, setDecision] = useState("");
  const [showDecision, setShowDecision] = useState(false);
  const submit = trpc.checkIns.submitEvening.useMutation({
    onSuccess: () => {
      toast.success("Day closed. Tomorrow's brief is ready.");
      onComplete();
    },
    onError: () => toast.error("Something went wrong. Try again."),
  });
  const saveDecision = trpc.intelligence.saveDecision.useMutation();
  const extractDecisions = trpc.intelligence.extractDecisionsFromNotes.useMutation();
  const classifyDistraction = trpc.intelligence.classifyAndSaveDistraction.useMutation();
  const handleSubmit = async () => {
    if (!whatMoved.trim() || !tomorrowFirst.trim()) {
      toast.error("Fill in what moved and what goes first tomorrow.");
      return;
    }
    // Save explicit decision if captured
    if (decision.trim()) {
      await saveDecision.mutateAsync({
        content: decision,
        source: "manual",
      }).catch(() => {});
    }
    // Auto-extract decisions from "what did you learn or decide" field
    if (whatLearned.trim() && whatLearned.length > 20) {
      extractDecisions.mutate({ notes: whatLearned });
    }
    // Classify any interruptions noted in whatRemains as potential distractions
    if (whatRemains.trim() && whatRemains.length > 10) {
      classifyDistraction.mutate({ rawInput: whatRemains, checkInType: "evening" });
    }
    submit.mutate({ whatMoved, whatRemains, whatLearned, tomorrowFirst });
  };
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">What moved today?</p>
        <Textarea value={whatMoved} onChange={(e) => setWhatMoved(e.target.value)} placeholder="What actually got done..." className="text-sm resize-none" rows={2} />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">What remains? <span className="font-normal opacity-60">(optional)</span></p>
        <Textarea value={whatRemains} onChange={(e) => setWhatRemains(e.target.value)} placeholder="What's carrying over..." className="text-sm resize-none" rows={1} />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">What did you learn or decide? <span className="font-normal opacity-60">(optional)</span></p>
        <Textarea value={whatLearned} onChange={(e) => setWhatLearned(e.target.value)} placeholder="Insights, decisions, realizations..." className="text-sm resize-none" rows={1} />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">What goes first tomorrow?</p>
        <Textarea value={tomorrowFirst} onChange={(e) => setTomorrowFirst(e.target.value)} placeholder="The first concrete action tomorrow..." className="text-sm resize-none" rows={1} />
      </div>
      {/* Decision capture */}
      <div>
        <button
          onClick={() => setShowDecision(!showDecision)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          {showDecision ? "Hide" : "Log a decision made today"} <span className="opacity-50">(optional)</span>
        </button>
        {showDecision && (
          <div className="mt-2">
            <Textarea
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              placeholder="What did you decide? e.g. 'Decided to drop feature X and ship MVP first'"
              className="text-sm resize-none"
              rows={2}
            />
            <p className="text-[10px] text-muted-foreground/60 mt-1">Decisions are saved to your project log for future reference.</p>
          </div>
        )}
      </div>
      <Button onClick={handleSubmit} disabled={submit.isPending || saveDecision.isPending} className="w-full" size="sm">
        {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Close the day
      </Button>
    </div>
  );
}

// ─── Re-Entry Card Component ──────────────────────────────────────────────────
function ReEntryCard({ projectId, projectTitle, onDismiss }: { projectId: number; projectTitle: string; onDismiss: () => void }) {
  const generate = trpc.intelligence.generateReEntryCard.useMutation();
  const acknowledge = trpc.intelligence.acknowledgeReEntryCard.useMutation();
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generate.mutateAsync({ projectId });
      setCard(result);
    } catch {
      toast.error("Couldn't generate re-entry card.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (card?.cardId) {
      await acknowledge.mutateAsync({ cardId: card.cardId }).catch(() => {});
    }
    onDismiss();
    navigate("/focus");
  };

  if (!card) {
    return (
      <div className="p-4 rounded-xl bg-card border border-border space-y-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-muted-foreground" />
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Re-entry card</p>
        </div>
        <p className="text-sm text-foreground">Returning to <span className="font-medium">{projectTitle}</span>?</p>
        <p className="text-xs text-muted-foreground">Get a quick summary of where you left off before entering Focus Mode.</p>
        <Button size="sm" variant="outline" onClick={handleGenerate} disabled={loading} className="w-full">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
          Show re-entry card
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-card border border-foreground/10 space-y-3">
      <div className="flex items-center gap-2">
        <RotateCcw className="w-4 h-4 text-muted-foreground" />
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Re-entry — {projectTitle}</p>
      </div>
      {card.isFirstSession ? (
        <div className="space-y-2">
          <p className="text-sm text-foreground">This is your first session on this project.</p>
          <p className="text-xs text-muted-foreground">No history yet — the next step below is your starting point.</p>
        </div>
      ) : (
        <>
          {card.stoppingPoint && (
            <div className="border-l-2 border-border pl-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Last stopping point</p>
              <p className="text-sm text-foreground">{card.stoppingPoint}</p>
            </div>
          )}
          {card.unresolvedDecision && (
            <div className="border-l-2 border-amber-300 dark:border-amber-700 pl-3">
              <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5">Open thread</p>
              <p className="text-sm text-foreground">{card.unresolvedDecision}</p>
            </div>
          )}
          {card.whatWasRuledOut && (
            <div className="border-l-2 border-emerald-300 dark:border-emerald-700 pl-3">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-0.5">Already handled</p>
              <p className="text-sm text-muted-foreground line-through">{card.whatWasRuledOut}</p>
            </div>
          )}
        </>
      )}
      {card.nextPhysicalAction && (
        <div className="p-3 rounded-lg bg-foreground/[0.04] border border-foreground/10">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Next physical action</p>
          <p className="text-sm font-medium text-foreground">{card.nextPhysicalAction}</p>
          {card.needsClarification && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">⚠ This step may need clarification before starting</p>
          )}
        </div>
      )}
      {card.whyItMatters && (
        <div className="pt-1 border-t border-border">
          <p className="text-xs text-muted-foreground/70 italic leading-relaxed">Why this matters: {card.whyItMatters}</p>
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onDismiss} className="flex-1 text-xs">
          I know where I am
        </Button>
        <Button size="sm" onClick={handleAcknowledge} className="flex-1">
          Ready. Begin.
        </Button>
      </div>
    </div>
  );
}

// ─── Command Center ───────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeCheckIn, setActiveCheckIn] = useState<CheckInStep | null>(null);
  const [unstickTask, setUnstickTask] = useState<{ id: string; title: string; projectId?: number | null } | null>(null);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [completedCheckIns, setCompletedCheckIns] = useState<Set<CheckInStep>>(new Set());
  const [reEntryProjectId, setReEntryProjectId] = useState<number | null>(null);

  const now = new Date();
  const hour = now.getHours();
  const activePeriod: CheckInStep = hour < 12 ? "morning" : hour < 17 ? "midday" : "evening";

  const { data: todayPlan, refetch: refetchPlan } = trpc.dailyPlan.getToday.useQuery();
  const { data: todayCheckIns, refetch: refetchCheckIns } = trpc.checkIns.getToday.useQuery();
  const { data: tomorrowBrief } = trpc.dailyPlan.getTomorrowBrief.useQuery();
  const { data: activeProjects } = trpc.projects.listActive.useQuery();
  const { data: weeklyPresence } = trpc.checkIns.weeklyPresence.useQuery();
  const { data: pendingIdeas } = trpc.ai.listIdeas.useQuery();
  const { data: recentDecisions } = trpc.intelligence.getRecentDecisions.useQuery();

  const completeTask = trpc.checkIns.completeTask.useMutation({
    onSuccess: () => refetchPlan(),
  });

  const tasks: any[] = useMemo(() => {
    if (!todayPlan?.criticalTasks) return [];
    try { return JSON.parse(todayPlan.criticalTasks); } catch { return []; }
  }, [todayPlan?.criticalTasks]);

  // carryover tasks: stored in likelyDistractions field as a workaround until schema is extended
  const carryoverTasks: string[] = useMemo(() => {
    if (!todayPlan?.likelyDistractions) return [];
    try {
      const parsed = JSON.parse(todayPlan.likelyDistractions);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') return parsed;
      return [];
    } catch { return []; }
  }, [todayPlan?.likelyDistractions]);

  // Carryover count per task — tasks carried over 2+ times get a warning
  const getCarryoverCount = (task: any): number => task.carryoverCount ?? 0;
  const completedTasks = tasks.filter((t: any) => t.done).length;
  const allTasksDone = tasks.length > 0 && completedTasks === tasks.length;

  const morningDone = todayCheckIns?.some((c) => c.type === "morning") ?? completedCheckIns.has("morning");
  const middayDone = todayCheckIns?.some((c) => c.type === "midday") ?? completedCheckIns.has("midday");
  const eveningDone = todayCheckIns?.some((c) => c.type === "evening") ?? completedCheckIns.has("evening");

  const handleCheckInComplete = (type: CheckInStep) => {
    setCompletedCheckIns((prev) => { const s = new Set(prev); s.add(type); return s; });
    setActiveCheckIn(null);
    refetchCheckIns();
    refetchPlan();
    // After midday or evening check-in, gently surface unprocessed ideas
    if ((type === "midday" || type === "evening") && pendingIdeaCount > 0) {
      setTimeout(() => {
        toast(
          `${pendingIdeaCount} idea${pendingIdeaCount > 1 ? "s" : ""} waiting in your Sanctuary.`,
          {
            description: "Good moment to process them while you have a clear head.",
            action: {
              label: "Process now",
              onClick: () => navigate("/settings?tab=ideas"),
            },
            duration: 6000,
          }
        );
      }, 1500);
    }
  };

  const capacityLevel: CapacityLevel = (todayPlan?.capacityLevel as CapacityLevel) ?? "partial";
  // Capacity-based task limits: full=3, partial=2, low=1
  const taskLimit = capacityLevel === "full" ? 3 : capacityLevel === "partial" ? 2 : 1;
  const visibleTasks = tasks.slice(0, taskLimit);
  const hiddenTaskCount = tasks.length - visibleTasks.length;
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "there";

  // Unprocessed ideas badge count
  const pendingIdeaCount = pendingIdeas?.filter((i) => !i.resolvedStatus && i.parkedStatus).length ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 page-enter">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[1.6rem] font-semibold tracking-[-0.02em] text-foreground leading-tight">
            {greeting}, {firstName}.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(now, "EEEE, MMMM d")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingIdeaCount > 0 && (
            <button
              onClick={() => navigate("/settings?tab=ideas")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              title="Ideas waiting to be processed"
            >
              <Lightbulb className="w-3 h-3" />
              {pendingIdeaCount}
            </button>
          )}
          {todayPlan && (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border",
              capacityConfig[capacityLevel].bg,
              capacityConfig[capacityLevel].color
            )}>
              {(() => {
                const cfg = capacityConfig[capacityLevel];
                const Icon = cfg.icon;
                return <Icon className="w-3.5 h-3.5" />;
              })()}
              {capacityConfig[capacityLevel].label}
            </div>
          )}
        </div>
      </div>

       {/* ── Tomorrow Brief (shown in morning before check-in) ──────────────── */}
      {tomorrowBrief && !morningDone && (
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Yesterday's brief for today</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{tomorrowBrief}</p>
        </div>
      )}
      {/* ── AI Guidance ────────────────────────────────────────────────────── */}
      {todayPlan?.generatedGuidance && (
        <div className="relative p-4 rounded-xl overflow-hidden" style={{background: 'linear-gradient(135deg, oklch(0.18 0.04 252 / 0.05) 0%, oklch(0.72 0.14 65 / 0.04) 100%)', border: '1px solid oklch(0.875 0.007 252)'}}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Today's guidance</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{todayPlan.generatedGuidance}</p>
        </div>
      )}

      {/* ── Capacity-Adaptive Layout Banner ────────────────────────────────── */}
      {todayPlan && capacityLevel === "low" && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-1">
            <BatteryLow className="w-4 h-4 text-red-500" />
            <p className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">Low capacity day</p>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
            This is today's one thing. Everything else is on hold. Showing up is enough.
          </p>
        </div>
      )}
      {todayPlan && capacityLevel === "partial" && (
        <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/40">
          <div className="flex items-center gap-2">
            <BatteryMedium className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-xs text-amber-700 dark:text-amber-300">One clear focus today. Secondary work waits.</p>
          </div>
        </div>
      )}

      {/* ── Daily Rhythm Check-Ins ──────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Daily Rhythm</p>
        <div className="flex gap-2">
          <CheckInCard
            type="morning"
            icon={Sun}
            label="Morning plan"
            timeHint="Set capacity + focus"
            completed={morningDone}
            active={activePeriod === "morning" && !morningDone}
            onOpen={() => setActiveCheckIn("morning")}
          />
          <CheckInCard
            type="midday"
            icon={Zap}
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

      {/* ── Weekly Presence Dots ────────────────────────────────────────────── */}
      {weeklyPresence && weeklyPresence.length > 0 && (
        <div className="flex items-center gap-2">
          {weeklyPresence.map((day) => {
            const label = new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
            return (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    day.hasCheckIn ? "bg-foreground/70" : "bg-foreground/10 border border-foreground/20"
                  }`}
                  title={`${label}: ${day.hasCheckIn ? "checked in" : "no check-in"}`}
                />
                <span className="text-[9px] text-muted-foreground/50 font-medium">{label.slice(0, 1)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Active Check-In Form ────────────────────────────────────────────── */}
      {activeCheckIn && (
        <div className="p-5 rounded-xl bg-card border border-foreground/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground capitalize">
              {activeCheckIn} check-in
            </h3>
            <button onClick={() => setActiveCheckIn(null)} className="text-muted-foreground hover:text-foreground p-1">
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          {activeCheckIn === "morning" && <MorningCheckIn onComplete={() => handleCheckInComplete("morning")} />}
          {activeCheckIn === "midday" && <MiddayCheckIn onComplete={() => handleCheckInComplete("midday")} />}
          {activeCheckIn === "evening" && <EveningCheckIn onComplete={() => handleCheckInComplete("evening")} />}
        </div>
      )}

      {/* ── Carryover Tasks ─────────────────────────────────────────────────── */}
      {carryoverTasks.length > 0 && !allTasksDone && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Carried over from yesterday
            </p>
          </div>
          <div className="space-y-2">
            {carryoverTasks.map((taskTitle: string, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10">
                <Circle className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-sm text-foreground">{taskTitle}</p>
                <Badge variant="outline" className="ml-auto text-[10px] text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 shrink-0">
                  carryover
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Today's Tasks ───────────────────────────────────────────────────── */}
      {tasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Today's tasks
            </p>
            <span className="text-xs text-muted-foreground">{completedTasks}/{visibleTasks.length}</span>
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
              {visibleTasks.map((task: any) => (
                <div key={task.id} className="relative">
                  <TaskItem
                    task={task}
                    onComplete={(id) => completeTask.mutate({ taskId: id })}
                    onUnstick={(t) => setUnstickTask(t)}
                  />
                  {getCarryoverCount(task) >= 2 && (
                    <div className="absolute -top-1 -right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700">
                      <RotateCcw className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-[9px] font-medium text-amber-700 dark:text-amber-300">{getCarryoverCount(task)}×</span>
                    </div>
                  )}
                </div>
              ))}
              {hiddenTaskCount > 0 && (
                <p className="text-xs text-muted-foreground/50 text-center py-1.5">
                  {hiddenTaskCount} more task{hiddenTaskCount > 1 ? "s" : ""} held back — {capacityLevel === "low" ? "one thing today" : "focus on these first"}
                </p>
              )}
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
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Start here</p>
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
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setReEntryProjectId(reEntryProjectId === topProject.id ? null : topProject.id)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {reEntryProjectId === topProject.id ? "Hide re-entry card" : "Show re-entry card"}
              </button>
              <span className="text-muted-foreground/30">·</span>
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

      {/* ── Re-Entry Card ───────────────────────────────────────────────────── */}
      {reEntryProjectId && activeProjects && (() => {
        const p = activeProjects.find((p) => p.id === reEntryProjectId);
        if (!p) return null;
        return (
          <ReEntryCard
            projectId={reEntryProjectId}
            projectTitle={p.title}
            onDismiss={() => setReEntryProjectId(null)}
          />
        );
      })()}

      {/* ── Active Projects Quick Access ────────────────────────────────────── */}
      {activeProjects && activeProjects.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Active projects</p>
          <div className="space-y-2">
            {activeProjects.slice(0, capacityLevel === "low" ? 1 : capacityLevel === "partial" ? 2 : 3).map((project) => (
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
            {capacityLevel === "low" && activeProjects.length > 1 && (
              <p className="text-xs text-muted-foreground/60 text-center py-1">
                {activeProjects.length - 1} other project{activeProjects.length - 1 > 1 ? "s" : ""} paused for today
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Recent Decisions ────────────────────────────────────────────────── */}
      {recentDecisions && recentDecisions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Recent decisions</p>
          <div className="space-y-2">
            {recentDecisions.slice(0, 2).map((d: any) => (
              <div key={d.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground leading-snug">{d.content}</p>
                  {d.context && <p className="text-xs text-muted-foreground/60 mt-0.5">{d.context}</p>}
                </div>
              </div>
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
        <UnstickModal task={unstickTask} onClose={() => setUnstickTask(null)} />
      )}
    </div>
  );
}
