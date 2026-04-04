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
  BarChart2,
  Bell,
  X,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import IdeaSanctuaryModal from "@/components/IdeaSanctuaryModal";
import UnstickModal from "@/components/UnstickModal";
import { VoiceDictationButton } from "@/components/VoiceDictationButton";
import { FirstMovableStepModal } from "@/components/FirstMovableStepModal";
import { ThresholdDiagnosisFlow } from "@/components/ThresholdDiagnosisFlow";

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
          ? "bg-muted/40 border-border opacity-60 cursor-default"
          : active
            ? "bg-primary border-primary hover:bg-primary/90 shadow-md shadow-primary/20 cursor-pointer"
            : "bg-card border-border hover:bg-accent/50 hover:border-primary/20 cursor-pointer"
      )}
    >
      <div className="flex items-center gap-1.5 w-full">
        <Icon className={cn(
          "w-3.5 h-3.5 shrink-0",
          completed ? "text-muted-foreground" : active ? "text-white" : "text-muted-foreground"
        )} />
        <span className={cn(
          "text-xs font-medium tracking-[-0.01em]",
          completed ? "text-muted-foreground" : active ? "text-white" : "text-muted-foreground"
        )}>
          {label}
        </span>
        {completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
        {active && !completed && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse bg-amber-300" />
        )}
      </div>
      <p className={cn(
        "text-[10px] leading-tight pl-0.5",
        active ? "text-white/70" : "text-muted-foreground/55"
      )}>{timeHint}</p>
    </button>
  );
}

// ─── Morning Check-In Form ────────────────────────────────────────────────────
type EmotionalState = "focused" | "anxious" | "foggy" | "energized" | "drained";
type MentalLoad = "light" | "moderate" | "heavy";

const emotionalStateConfig: Record<EmotionalState, { label: string; emoji: string; color: string; clarityHint?: string }> = {
  focused:   { label: "Focused",   emoji: "🎯", color: "text-emerald-500" },
  energized: { label: "Energized", emoji: "⚡", color: "text-amber-500" },
  foggy:     { label: "Foggy",     emoji: "🌫", color: "text-slate-400",  clarityHint: "Purpose Fog mode may help" },
  anxious:   { label: "Anxious",   emoji: "😰", color: "text-orange-500", clarityHint: "Overwhelm mode may help" },
  drained:   { label: "Drained",   emoji: "🪫", color: "text-red-400",    clarityHint: "Overwhelm mode may help" },
};

function MorningCheckIn({ onComplete }: { onComplete: () => void }) {
  const [capacity, setCapacity] = useState<CapacityLevel>("partial");
  const [notes, setNotes] = useState("");
  const [primaryId, setPrimaryId] = useState<number | undefined>();
  const [emotionalState, setEmotionalState] = useState<EmotionalState | undefined>();
  const [mentalLoad, setMentalLoad] = useState<MentalLoad | undefined>();
  const [, navigate] = useLocation();
  const { data: projects } = trpc.projects.listActive.useQuery();
  const submit = trpc.checkIns.submitMorning.useMutation({
    onSuccess: (data) => {
      toast.success("Morning plan set.");
      // If clarity mode was suggested and state is anxious/foggy/drained, offer nudge
      if (data.clarityModeSuggestion) {
        setTimeout(() => {
          toast(
            emotionalStateConfig[emotionalState!]?.clarityHint ?? "Clarity Engine is available.",
            {
              description: "A quick clarity session might help before you dive in.",
              action: { label: "Open", onClick: () => navigate("/clarity") },
              duration: 7000,
            }
          );
        }, 1200);
      }
      onComplete();
    },
    onError: () => toast.error("Something went wrong. Try again."),
  });
  return (
    <div className="space-y-5">
      {/* Emotional State */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">How are you feeling right now? <span className="font-normal opacity-60">(optional)</span></p>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(emotionalStateConfig) as [EmotionalState, typeof emotionalStateConfig[EmotionalState]][]).map(([state, cfg]) => (
            <button
              key={state}
              onClick={() => setEmotionalState(emotionalState === state ? undefined : state)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                emotionalState === state
                  ? "border-primary/40 bg-primary/[0.08] text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/20"
              )}
            >
              <span>{cfg.emoji}</span>
              <span>{cfg.label}</span>
            </button>
          ))}
        </div>
        {emotionalState && emotionalStateConfig[emotionalState]?.clarityHint && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
            <span>💡</span> {emotionalStateConfig[emotionalState].clarityHint}
          </p>
        )}
      </div>
      {/* Mental Load */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Mental load today? <span className="font-normal opacity-60">(optional)</span></p>
        <div className="flex gap-2">
          {(["light", "moderate", "heavy"] as MentalLoad[]).map((load) => (
            <button
              key={load}
              onClick={() => setMentalLoad(mentalLoad === load ? undefined : load)}
              className={cn(
                "flex-1 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all",
                mentalLoad === load
                  ? "border-primary/40 bg-primary/[0.08] text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/20"
              )}
            >{load}</button>
          ))}
        </div>
      </div>
      {/* Capacity */}
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
                    ? cn("border-primary/40 bg-primary/[0.06] shadow-sm", cfg.color)
                    : "border-border hover:border-primary/20 hover:bg-primary/[0.02]"
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
                    ? "border-primary/40 bg-primary/[0.06] text-foreground"
                    : "border-border hover:border-primary/20 text-muted-foreground"
                )}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", primaryId === p.id ? "bg-primary" : "bg-muted-foreground/30")} />
                <span className="truncate">{p.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">Anything to note? <span className="font-normal opacity-60">(optional)</span></p>
          <VoiceDictationButton
            onTranscript={(text) => setNotes((prev) => (prev ? `${prev} ${text}` : text))}
            disabled={submit.isPending}
          />
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Appointments, constraints, what's on your mind..."
          className="text-sm resize-none"
          rows={2}
        />
      </div>
      <Button
        onClick={() => submit.mutate({ capacityLevel: capacity, primaryProjectId: primaryId, userNotes: notes || undefined, emotionalState, mentalLoad })}
        disabled={submit.isPending}
        className="w-full bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25"
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
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">What moved today?</p>
          <VoiceDictationButton
            onTranscript={(text) => setWhatMoved((prev) => (prev ? `${prev} ${text}` : text))}
            disabled={submit.isPending}
          />
        </div>
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
      ) : !card.isReturning ? (
        // Recent session (< 24h) — show brief context only
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            You were here recently ({card.hoursSinceLastSession}h ago). Picking up where you left off.
          </p>
        </div>
      ) : (
        // Returning after 24h+ — show full context
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
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [fmsOpen, setFmsOpen] = useState(false);
  const [fmsTask, setFmsTask] = useState("");
  const [fmsProjectId, setFmsProjectId] = useState<number | undefined>();
  const [thresholdOpen, setThresholdOpen] = useState(false);
  const [thresholdTask, setThresholdTask] = useState("");
  const [thresholdProjectId, setThresholdProjectId] = useState<number | undefined>();

  const handleNotifPromptAccept = async () => {
    setShowNotifPrompt(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Reminders enabled. We\'ll check in at the right moments.');
      }
    } catch {
      // browser may not support
    }
  };

  const handleNotifPromptDefer = () => {
    setShowNotifPrompt(false);
    localStorage.setItem('continuary_notif_defer', Date.now().toString());
  };

  const now = new Date();
  const hour = now.getHours();
  const activePeriod: CheckInStep = hour < 12 ? "morning" : hour < 17 ? "midday" : "evening";

  const { data: todayPlan, refetch: refetchPlan } = trpc.dailyPlan.getToday.useQuery();
  const { data: todayCheckIns, refetch: refetchCheckIns } = trpc.checkIns.getToday.useQuery();
  const { data: tomorrowBrief } = trpc.dailyPlan.getTomorrowBrief.useQuery();
  const { data: activeProjects } = trpc.projects.listActive.useQuery();
  const { data: weeklyPresence } = trpc.checkIns.weeklyPresence.useQuery();
  const { data: evidenceMonth } = trpc.evidence.getCurrentMonth.useQuery();
  const { data: pendingIdeas } = trpc.ai.listIdeas.useQuery();
  const { data: recentDecisions } = trpc.intelligence.getRecentDecisions.useQuery();
  const { data: healthScores } = trpc.insights.getHealthScores.useQuery();

  // Map projectId → momentum for quick lookup
  const momentumByProject = useMemo(() => {
    const map: Record<number, string> = {};
    if (healthScores) for (const s of healthScores) if (s.projectId) map[s.projectId] = s.momentum ?? "steady";
    return map;
  }, [healthScores]);

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

  // Show notification permission prompt 2s after first morning check-in completes
  // 48h defer window stored in localStorage
  useEffect(() => {
    if (!morningDone) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    const deferred = localStorage.getItem('continuary_notif_defer');
    if (deferred && Date.now() - parseInt(deferred, 10) < 48 * 60 * 60 * 1000) return;
    const timer = setTimeout(() => setShowNotifPrompt(true), 2000);
    return () => clearTimeout(timer);
  }, [morningDone]);

  const handleCheckInComplete = (type: CheckInStep) => {
    setCompletedCheckIns((prev) => { const s = new Set(prev); s.add(type); return s; });
    setActiveCheckIn(null);
    refetchCheckIns();
    refetchPlan();
    // After morning or evening check-in, gently surface unprocessed ideas when count > 3
    if ((type === "morning" || type === "evening") && pendingIdeaCount > 3) {
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

  // ── Alert-priority resolver ────────────────────────────────────────────────
  // Priority order: Amnesty (handled before this page) → due check-in → capacity banner → blocker → review reminder → tomorrow brief → sanctuary nudge
  // Only one primary alert is shown at a time; lower-priority items are de-emphasized
  const hasBlockedProject = activeProjects?.some((p) => p.status === "active" && p.nextStep?.toLowerCase().includes("blocked"));
  const weeklyReviewDue = (() => {
    // Prompt weekly review on Sundays or if last review was >7 days ago
    const dayOfWeek = now.getDay(); // 0 = Sunday
    return dayOfWeek === 0;
  })();
  type AlertType = "check_in_due" | "capacity_low" | "capacity_partial" | "blocker" | "weekly_review" | "tomorrow_brief" | "sanctuary_nudge" | null;
  const topAlert: AlertType = (() => {
    if (!morningDone && activePeriod === "morning") return "check_in_due";
    if (todayPlan && capacityLevel === "low") return "capacity_low";
    if (todayPlan && capacityLevel === "partial") return "capacity_partial";
    if (hasBlockedProject) return "blocker";
    if (weeklyReviewDue && morningDone) return "weekly_review";
    if (tomorrowBrief && !morningDone) return "tomorrow_brief";
    if (pendingIdeaCount > 3) return "sanctuary_nudge";
    return null;
  })();

  return (
    <div className="px-4 py-6 page-enter max-w-4xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[1.6rem] font-medium tracking-[-0.01em] text-foreground leading-tight" style={{ fontFamily: "'Lora', Georgia, serif" }}>
            {greeting}, <span className="text-primary">{firstName}</span>.
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

      {/* ── Primary Alert (single, priority-resolved) ────────────────────── */}
      {topAlert === "check_in_due" && (
        <div className="p-4 rounded-xl border border-primary/40" style={{background: 'linear-gradient(135deg, oklch(0.51 0.24 264 / 0.10) 0%, oklch(0.51 0.24 264 / 0.04) 100%)'}}>
          <div className="flex items-center gap-2 mb-1">
            <Sun className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">Morning plan ready</p>
          </div>
          <p className="text-sm text-foreground">Set your capacity and focus for today.</p>
        </div>
      )}
      {topAlert === "capacity_low" && (
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
      {topAlert === "capacity_partial" && (
        <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/40">
          <div className="flex items-center gap-2">
            <BatteryMedium className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-xs text-amber-700 dark:text-amber-300">One clear focus today. Secondary work waits.</p>
          </div>
        </div>
      )}
      {topAlert === "blocker" && (() => {
        const blockedProject = activeProjects?.find((p) => p.status === "active" && p.nextStep?.toLowerCase().includes("blocked"));
        if (!blockedProject) return null;
        return (
          <div className="p-4 rounded-xl bg-red-50/60 dark:bg-red-900/10 border border-red-200/60 dark:border-red-800/40">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <p className="text-[10px] font-semibold text-red-700 dark:text-red-300 uppercase tracking-widest">Blocker detected</p>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300">{blockedProject.title} — {blockedProject.nextStep}</p>
          </div>
        );
      })()}
      {topAlert === "weekly_review" && (
        <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-900/10 border border-purple-200/60 dark:border-purple-800/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5 text-purple-500" />
              <p className="text-xs text-purple-700 dark:text-purple-300">Weekly review is ready for this week.</p>
            </div>
            <button
              onClick={() => navigate("/weekly-review")}
              className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-medium"
            >Open</button>
          </div>
        </div>
      )}
      {topAlert === "tomorrow_brief" && tomorrowBrief && (
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Yesterday's brief for today</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{tomorrowBrief}</p>
        </div>
      )}
      {topAlert === "sanctuary_nudge" && (
        <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <p className="text-xs text-amber-700 dark:text-amber-300">{pendingIdeaCount} ideas waiting in your Sanctuary.</p>
            </div>
            <button
              onClick={() => navigate("/settings?tab=ideas")}
              className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-medium"
            >Process now</button>
          </div>
        </div>
      )}
      {/* ── AI Guidance (always shown when plan exists) ─────────────────────── */}
      {todayPlan?.generatedGuidance && (
        <div className="relative p-4 rounded-xl overflow-hidden border border-primary/30" style={{background: 'linear-gradient(135deg, oklch(0.51 0.24 264 / 0.12) 0%, oklch(0.72 0.17 65 / 0.08) 100%)'}}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">Today's guidance</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{todayPlan.generatedGuidance}</p>
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

      {/* ──────────────────────────────────────────────────────────────────────────────
           Two-column grid on desktop: left = primary, right = supporting
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-6 lg:items-start space-y-6 lg:space-y-0">

        {/* ════ LEFT COLUMN ════ */}
        <div className="space-y-6">

      {/* ── Active Check-In Form─────────────────────────────────────── */}
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

      {/* ── Stuck-State Intervention (auto-trigger Threshold Diagnosis) ───────── */}
      {(() => {
        const stuckTasks = tasks.filter((t: any) => !t.done && getCarryoverCount(t) >= 2);
        if (stuckTasks.length === 0) return null;
        const mostStuck = stuckTasks.reduce((a: any, b: any) =>
          getCarryoverCount(a) >= getCarryoverCount(b) ? a : b
        );
        return (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-300/40 dark:border-amber-700/40 bg-amber-50/60 dark:bg-amber-900/10">
            <span className="text-lg shrink-0 mt-0.5">🚪</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground leading-snug">
                Something is at the door.
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                &ldquo;{mostStuck.title}&rdquo; has been carried {getCarryoverCount(mostStuck)} time{getCarryoverCount(mostStuck) !== 1 ? 's' : ''}. That's not a discipline problem — it's a threshold pattern. Let's find out what's actually in the way.
              </p>
              <div className="mt-2.5 flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => {
                    setThresholdTask(mostStuck.title);
                    setThresholdProjectId(mostStuck.projectId ?? undefined);
                    setThresholdOpen(true);
                  }}
                  className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-600 dark:hover:text-amber-200 transition-colors flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-300/60 dark:border-amber-700/60"
                >
                  What's at the door? <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    setFmsTask(mostStuck.title);
                    setFmsProjectId(mostStuck.projectId ?? undefined);
                    setFmsOpen(true);
                  }}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Just give me a first move
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
          className="w-full flex items-center justify-between p-4 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors group shadow-md shadow-primary/20"
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
          <div className="p-4 rounded-xl border border-primary/30 space-y-3" style={{background: 'linear-gradient(135deg, oklch(0.51 0.24 264 / 0.10) 0%, oklch(0.51 0.24 264 / 0.04) 100%)'}}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center shadow-sm">
                <ArrowRight className="w-3 h-3 text-white" />
              </div>
              <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">Start here</p>
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
            {/* Inject most recent decision for this project into Start Here */}
            {recentDecisions && (() => {
              const projectDecision = recentDecisions.find((d: any) => d.projectId === topProject.id);
              if (!projectDecision) return null;
              return (
                <div className="border-l-2 border-amber-300 dark:border-amber-700 pl-3">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5">Last decision</p>
                  <p className="text-xs text-foreground/80 leading-snug">{projectDecision.content}</p>
                </div>
              );
            })()}
            <div className="flex items-center gap-2 justify-end flex-wrap">
              <button
                onClick={() => setReEntryProjectId(reEntryProjectId === topProject.id ? null : topProject.id)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {reEntryProjectId === topProject.id ? "Hide re-entry card" : "Show re-entry card"}
              </button>
              <span className="text-muted-foreground/30">·</span>
              <button
                onClick={() => {
                  setFmsTask(topProject.nextStep ?? "");
                  setFmsProjectId(topProject.id);
                  setFmsOpen(true);
                }}
                className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-400 transition-colors font-medium"
              >
                🪶 First movable step
              </button>
              <span className="text-muted-foreground/30">·</span>
              <button
                onClick={() => {
                  setThresholdTask(topProject.nextStep ?? "");
                  setThresholdProjectId(topProject.id);
                  setThresholdOpen(true);
                }}
                className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-500 transition-colors font-medium"
              >
                🚪 What's blocking me?
              </button>
              <span className="text-muted-foreground/30">·</span>
              <button
                onClick={() => navigate("/focus")}
                className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
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

        </div>

        {/* ════ RIGHT COLUMN ════ */}
        <div className="space-y-4">

      {/* ── Weekly Presence Dots ────────────────────────────────────────────────────────── */}
      {weeklyPresence && weeklyPresence.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">This week</p>
          <div className="flex items-center gap-2">
            {weeklyPresence.map((day) => {
              const label = new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
              return (
                <div key={day.date} className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={`w-3 h-3 rounded-full transition-colors ${
                      day.hasCheckIn ? "bg-primary" : "bg-foreground/10 border border-foreground/20"
                    }`}
                    title={`${label}: ${day.hasCheckIn ? "checked in" : "no check-in"}`}
                  />
                  <span className="text-[9px] text-muted-foreground/50 font-medium">{label.slice(0, 1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* ── Evidence Log monthly sentence ─────────────────────────────────────────────────────────────────── */}
      {evidenceMonth?.summaryLine && (
        <div className="px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <p className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-widest mb-1">Your evidence</p>
          <p className="text-xs text-foreground/70 italic leading-relaxed">{evidenceMonth.summaryLine}</p>
        </div>
      )}
      {/* ── Active Projects Quick Access (right col) ────────────────────────────────────────────────────────── */}
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{project.title}</p>
                    {momentumByProject[project.id] && (
                      <span className={`text-[9px] font-semibold uppercase tracking-wide shrink-0 ${
                        momentumByProject[project.id] === 'rising' ? 'text-emerald-500' :
                        momentumByProject[project.id] === 'fading' ? 'text-amber-500' :
                        momentumByProject[project.id] === 'stalled' ? 'text-red-400' :
                        'text-muted-foreground'
                      }`}>
                        {momentumByProject[project.id] === 'rising' ? '↑' :
                         momentumByProject[project.id] === 'fading' ? '↓' :
                         momentumByProject[project.id] === 'stalled' ? '⚠' : '→'}
                        {' '}{momentumByProject[project.id]}
                      </span>
                    )}
                  </div>
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

      {/* ── Recent Decisions (right col) ────────────────────────────────────────────────────────── */}
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

        </div>
      </div>

      {/* ── Empty state — no plan yet (full width below grid) ───────────────────────────────────────── */}
      {!todayPlan && !activeCheckIn && (
        <div className="relative overflow-hidden p-8 rounded-2xl text-center" style={{background: 'linear-gradient(135deg, oklch(0.51 0.24 264) 0%, oklch(0.45 0.22 280) 100%)'}}>
          <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, oklch(0.72 0.17 65) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.99 0 0) 0%, transparent 40%)'}} />
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Sun className="w-6 h-6 text-white" />
            </div>
            <p className="text-base font-semibold text-white mb-1">No plan for today yet.</p>
            <p className="text-sm text-white/70 mb-5">Start with the morning check-in to set your capacity and focus.</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button size="sm" onClick={() => setActiveCheckIn("morning")} className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-semibold shadow-lg shadow-black/20 border-0">
                Start morning check-in
              </Button>
              <button
                onClick={() => navigate("/clarity")}
                className="text-sm text-white/70 hover:text-white transition-colors underline underline-offset-2"
              >
                ⚡ Feeling scattered? Open Clarity Engine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notification Permission Prompt ─────────────────────────────────── */}
      {showNotifPrompt && (
        <div className="relative p-5 rounded-2xl border border-primary/20 shadow-lg overflow-hidden" style={{background: 'linear-gradient(135deg, oklch(0.51 0.24 264 / 0.10) 0%, oklch(0.51 0.24 264 / 0.04) 100%)'}}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground mb-1">Stay in rhythm with reminders</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Continuary can nudge you at morning, midday, and evening — so you never lose the thread of your day.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <Button
                  size="sm"
                  onClick={handleNotifPromptAccept}
                  className="bg-primary text-white hover:bg-primary/90 text-xs h-8 px-4 font-medium"
                >
                  Enable reminders
                </Button>
                <button
                  onClick={handleNotifPromptDefer}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={handleNotifPromptDefer}
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1 shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────────────────────────────────────── */}
      <IdeaSanctuaryModal open={ideaOpen} onClose={() => setIdeaOpen(false)} capturedDuringTask={true} />
      {unstickTask && (
        <UnstickModal task={unstickTask} onClose={() => setUnstickTask(null)} />
      )}
      <FirstMovableStepModal
        open={fmsOpen}
        onOpenChange={setFmsOpen}
        initialTask={fmsTask}
        projectId={fmsProjectId}
        onStartSession={() => navigate("/focus")}
      />
      {thresholdOpen && thresholdTask && (
        <ThresholdDiagnosisFlow
          open={thresholdOpen}
          onOpenChange={setThresholdOpen}
          taskDescription={thresholdTask}
          projectId={thresholdProjectId}
          onStartSession={() => navigate("/focus")}
        />
      )}
    </div>
  );
}