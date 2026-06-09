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
  HelpCircle,
  Shuffle,
  PenLine,
  Anchor,
  ChevronRight,
} from "lucide-react";
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ReturnMarker,
  RhythmSegments,
  ContinuityRing,
  MovementFeed,
  MilestoneCard,
  useGamificationStatus,
  useRecordEvent,
} from "@/components/GamificationLayer";
import { ReEntryFlow } from "@/components/ReEntryFlow";
import { ThreadView } from "@/components/ThreadView";
import WrenPlayer from "@/components/WrenPlayer";
import { TomorrowPlanSection, type TomorrowTask } from "@/components/TomorrowPlanSection";
import { GlossaryTerm } from "@/components/TermTooltip";
import { WrenIntroMoment } from "@/components/WrenIntroMoment";
import { useTransitionSound } from "@/hooks/useTransitionSound";

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
const TaskItem = React.memo(function TaskItem({
  task,
  onComplete,
  onUnstick,
  isCarryover = false,
  pendingUndo = false,
}: {
  task: any;
  onComplete: (id: string) => void;
  onUnstick: (t: { id: string; title: string; projectId?: number | null }) => void;
  isCarryover?: boolean;
  pendingUndo?: boolean;
}) {
  // Long-press state
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressing, setPressing] = React.useState(false);
  const [pressProgress, setPressProgress] = React.useState(0);
  const pressInterval = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const startPress = () => {
    if (task.done) return;
    setPressing(true);
    setPressProgress(0);
    let elapsed = 0;
    pressInterval.current = setInterval(() => {
      elapsed += 50;
      setPressProgress(Math.min(elapsed / 500, 1));
    }, 50);
    longPressTimer.current = setTimeout(() => {
      clearInterval(pressInterval.current!);
      setPressing(false);
      setPressProgress(0);
      onComplete(task.id);
    }, 500);
  };

  const cancelPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (pressInterval.current) clearInterval(pressInterval.current);
    setPressing(false);
    setPressProgress(0);
  };

  // Swipe-right state
  const swipeStart = React.useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = React.useState(0);
  const SWIPE_THRESHOLD = 72;

  const onTouchStart = (e: React.TouchEvent) => {
    if (task.done) return;
    swipeStart.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (swipeStart.current === null || task.done) return;
    const dx = e.touches[0].clientX - swipeStart.current;
    if (dx > 0) setSwipeOffset(Math.min(dx, SWIPE_THRESHOLD + 20));
  };
  const onTouchEnd = () => {
    if (swipeOffset >= SWIPE_THRESHOLD) onComplete(task.id);
    setSwipeOffset(0);
    swipeStart.current = null;
  };

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-150 group card-interactive overflow-hidden",
        task.done
          ? pendingUndo
            ? "bg-amber-50/30 dark:bg-amber-900/10 border-amber-300/40 dark:border-amber-700/40 opacity-70"
            : "bg-foreground/[0.02] border-border opacity-50"
          : isCarryover
            ? "bg-amber-50/40 dark:bg-amber-900/10 border-amber-200/80 dark:border-amber-800/40 shadow-sm"
            : "bg-card border-border hover:border-foreground/20 card-shadow"
      )}
      style={swipeOffset > 0 ? { transform: `translateX(${swipeOffset}px)` } : undefined}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Swipe-right reveal indicator */}
      {swipeOffset > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 flex items-center justify-center bg-emerald-500/20 rounded-l-xl"
          style={{ width: swipeOffset }}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
      )}
      {/* Long-press progress ring on the circle button */}
      <button
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        className={cn(
          "mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 transition-all duration-150 flex items-center justify-center relative",
          task.done
            ? pendingUndo
              ? "bg-amber-400/20 border-amber-400/60"
              : "bg-emerald-500/20 border-emerald-500/40"
            : pressing
              ? "border-primary bg-primary/10"
              : "border-foreground/25 hover:border-foreground/50 hover:bg-foreground/5"
        )}
        style={pressing && pressProgress > 0 ? {
          background: `conic-gradient(oklch(0.51 0.24 264) ${pressProgress * 360}deg, transparent 0deg)`,
          borderColor: "oklch(0.51 0.24 264)"
        } : undefined}
        aria-label={task.done ? "Completed" : "Hold to complete"}
        title={task.done ? "Completed" : "Hold to complete"}
      >
        {task.done && !pendingUndo && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
        {task.done && pendingUndo && <RotateCcw className="w-2.5 h-2.5 text-amber-500" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-base leading-snug tracking-[-0.005em]",
          task.done && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {isCarryover && !task.done && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">carried over</span>
          )}
          {task.energyTag && !task.done && (
            <span className={cn(
              "text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full border",
              task.energyTag === "high" ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" :
              task.energyTag === "low" ? "text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" :
              "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
            )}>
              {task.energyTag === "high" ? "⚡ high" : task.energyTag === "low" ? "🌙 low" : "📊 medium"}
            </span>
          )}
        </div>
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
});

// ─── Check-In Card ────────────────────────────────────────────────────────────
function CheckInCard({
  type,
  icon: Icon,
  label,
  timeHint,
  completed,
  active,
  open,
  onOpen,
  onClose,
}: {
  type: CheckInStep;
  icon: React.ElementType;
  label: string;
  timeHint: string;
  completed: boolean;
  active: boolean;
  open?: boolean;
  onOpen: () => void;
  onClose?: () => void;
}) {
  const highlighted = open || active;
  const handleClick = () => {
    if (completed) return;
    if (open && onClose) {
      onClose();
    } else {
      onOpen();
    }
  };
  return (
    <button
      onClick={handleClick}
      disabled={completed}
      className="flex-1 min-w-0 flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all duration-150 overflow-hidden"
      style={completed
        ? { background: "oklch(0.14 0.02 264 / 0.40)", borderColor: "oklch(1 0 0 / 0.07)", opacity: 0.6 }
        : highlighted
          ? { background: "oklch(0.74 0.14 72 / 0.14)", borderColor: "oklch(0.74 0.14 72 / 0.40)", boxShadow: "0 0 0 1px oklch(0.74 0.14 72 / 0.20), 0 4px 16px oklch(0.74 0.14 72 / 0.12)" }
          : { background: "var(--card)", borderColor: "var(--border)" }
      }
    >
      <div className="flex items-center gap-1.5 w-full">
        <Icon
          className="w-3.5 h-3.5 shrink-0"
          style={{ color: completed ? "oklch(0.55 0.01 270)" : highlighted ? "oklch(0.74 0.14 72)" : "oklch(0.55 0.01 270)" }}
        />
        <span
          className="text-xs font-medium tracking-[-0.01em] truncate"
          style={{ color: completed ? "oklch(0.55 0.01 270)" : highlighted ? "oklch(0.92 0.10 65)" : "oklch(0.65 0.01 270)" }}
        >
          {label}
        </span>
        {completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
        {open && !completed && (
          <ChevronUp className="ml-auto w-3.5 h-3.5 shrink-0" style={{ color: "oklch(0.88 0.16 65 / 0.70)" }} />
        )}
        {!open && active && !completed && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "oklch(0.74 0.14 72)" }} />
        )}
      </div>
      <p
        className="text-xs leading-tight pl-0.5 truncate w-full"
        style={{ color: highlighted ? "oklch(0.78 0.10 65 / 0.75)" : "oklch(0.55 0.01 270 / 0.70)" }}
      >{timeHint}</p>
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

type WorkLocation = "home" | "coffee_shop" | "library" | "office" | "other";
const workLocationConfig: Record<WorkLocation, { label: string; emoji: string }> = {
  home:        { label: "Home",         emoji: "🏠" },
  coffee_shop: { label: "Coffee shop",  emoji: "☕" },
  library:     { label: "Library",      emoji: "📚" },
  office:      { label: "Office",       emoji: "🏢" },
  other:       { label: "Other",        emoji: "📍" },
};

function MorningCheckIn({ onComplete }: { onComplete: () => void }) {
  const [capacity, setCapacity] = useState<CapacityLevel>("partial");
  const [notes, setNotes] = useState("");
  const [primaryId, setPrimaryId] = useState<number | undefined>();
  const [emotionalState, setEmotionalState] = useState<EmotionalState | undefined>();
  const [mentalLoad, setMentalLoad] = useState<MentalLoad | undefined>();
  const [workLocation, setWorkLocation] = useState<WorkLocation | undefined>();
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
        <p className="text-sm font-medium text-muted-foreground mb-2">How are you feeling right now? <span className="font-normal opacity-60">(optional)</span></p>
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
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
            <span>💡</span> {emotionalStateConfig[emotionalState].clarityHint}
          </p>
        )}
      </div>
      {/* Mental Load */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Mental load today? <span className="font-normal opacity-60">(optional)</span></p>
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
        <p className="text-sm font-medium text-muted-foreground mb-3">How's your capacity today?</p>
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
                <span className="text-sm text-muted-foreground leading-tight">{cfg.taskCount}</span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground/70 mt-2 leading-relaxed">
          {capacityConfig[capacity].description}
        </p>
      </div>
      {projects && projects.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Primary focus today</p>
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
          <p className="text-sm font-medium text-muted-foreground">Anything to note? <span className="font-normal opacity-60">(optional)</span></p>
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
      {/* Work Location — Hack #8: change environment, not willpower */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Where are you working today? <span className="font-normal opacity-60">(optional)</span></p>
        <p className="text-xs text-muted-foreground/60 mb-2">Different spaces = different focus windows. Wren tracks which environments work best for you.</p>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(workLocationConfig) as [WorkLocation, typeof workLocationConfig[WorkLocation]][]).map(([loc, cfg]) => (
            <button
              key={loc}
              onClick={() => setWorkLocation(workLocation === loc ? undefined : loc)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                workLocation === loc
                  ? "border-primary/40 bg-primary/[0.08] text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/20"
              )}
            >
              <span>{cfg.emoji}</span>
              <span>{cfg.label}</span>
            </button>
          ))}
        </div>
      </div>
      <Button
        onClick={() => submit.mutate({ capacityLevel: capacity, primaryProjectId: primaryId, userNotes: notes || undefined, emotionalState, mentalLoad, workLocation })}
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
  const [energyLevel, setEnergyLevel] = useState<"high" | "medium" | "low" | undefined>();
  const [hungerLevel, setHungerLevel] = useState<"full" | "slightly_hungry" | "hungry" | undefined>();
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
        <p className="text-sm font-medium text-muted-foreground mb-2">What did you work on this morning?</p>
        <Textarea
          value={workedOn}
          onChange={(e) => setWorkedOn(e.target.value)}
          placeholder="What actually happened..."
          className="text-sm resize-none"
          rows={2}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Was it on plan?</p>
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
        <p className="text-sm font-medium text-muted-foreground mb-2">Any interruptions? <span className="font-normal opacity-60">(optional)</span></p>
        <Textarea
          value={interruptions}
          onChange={(e) => setInterruptions(e.target.value)}
          placeholder="Meetings, messages, unexpected tasks..."
          className="text-sm resize-none"
          rows={1}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">What's the next move? <span className="font-normal opacity-60">(optional)</span></p>
        <Textarea
          value={nextMove}
          onChange={(e) => setNextMove(e.target.value)}
          placeholder="What happens right after this check-in..."
          className="text-sm resize-none"
          rows={1}
        />
      </div>
      {/* Energy + Hunger — Hack #7: use hunger as a focus window */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Energy right now <span className="opacity-60">(optional)</span></p>
          <div className="flex gap-1.5">
            {(["high", "medium", "low"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setEnergyLevel(energyLevel === lvl ? undefined : lvl)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all",
                  energyLevel === lvl
                    ? "border-primary/40 bg-primary/[0.08] text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/20"
                )}
              >{lvl === "high" ? "⚡ High" : lvl === "medium" ? "🟡 Mid" : "🌙 Low"}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Hunger level <span className="opacity-60">(optional)</span></p>
          <div className="flex gap-1.5">
            {(["full", "slightly_hungry", "hungry"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setHungerLevel(hungerLevel === lvl ? undefined : lvl)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all",
                  hungerLevel === lvl
                    ? "border-primary/40 bg-primary/[0.08] text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/20"
                )}
              >{lvl === "full" ? "👌 Full" : lvl === "slightly_hungry" ? "🍎 Peckish" : "👁️ Hungry"}</button>
            ))}
          </div>
          {hungerLevel === "slightly_hungry" && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">💡 Slight hunger can sharpen focus — ride the window.</p>
          )}
        </div>
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
          submit.mutate({ workedOn, wasOnPlan, interruptions: interruptions || undefined, nextMove: nextMove || undefined, energyLevel, hungerLevel });
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
  const [tomorrowTasks, setTomorrowTasks] = useState<TomorrowTask[]>([]);
  const [decision, setDecision] = useState("");
  const [showDecision, setShowDecision] = useState(false);
  const saveTomorrowPlan = trpc.dailyPlan.saveTomorrowPlan.useMutation();
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
    // Persist tomorrow's task list alongside the evening closure
    if (tomorrowTasks.length > 0) {
      saveTomorrowPlan.mutate({ tasks: tomorrowTasks });
    }
    submit.mutate({ whatMoved, whatRemains, whatLearned, tomorrowFirst });
  };
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">What moved today?</p>
          <VoiceDictationButton
            onTranscript={(text) => setWhatMoved((prev) => (prev ? `${prev} ${text}` : text))}
            disabled={submit.isPending}
          />
        </div>
        <Textarea value={whatMoved} onChange={(e) => setWhatMoved(e.target.value)} placeholder="What actually got done..." className="text-sm resize-none" rows={2} />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">What remains? <span className="font-normal opacity-60">(optional)</span></p>
        <Textarea value={whatRemains} onChange={(e) => setWhatRemains(e.target.value)} placeholder="What's carrying over..." className="text-sm resize-none" rows={1} />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">What did you learn or decide? <span className="font-normal opacity-60">(optional)</span></p>
        <Textarea value={whatLearned} onChange={(e) => setWhatLearned(e.target.value)} placeholder="Insights, decisions, realizations..." className="text-sm resize-none" rows={1} />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">What goes first tomorrow?</p>
        <Textarea value={tomorrowFirst} onChange={(e) => setTomorrowFirst(e.target.value)} placeholder="The first concrete action tomorrow..." className="text-sm resize-none" rows={1} />
      </div>
      {/* Tomorrow's plan */}
      <div className="border-t border-border/30 pt-3">
        <TomorrowPlanSection
          onChange={setTomorrowTasks}
          initialTasks={tomorrowTasks}
        />
      </div>
      {/* Decision capture */}
      <div>
        <button
          onClick={() => setShowDecision(!showDecision)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
            <p className="text-sm text-muted-foreground/60 mt-1">Decisions are saved to your project log for future reference.</p>
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

// ─── Mood Widget ────────────────────────────────────────────────────────────
function MoodWidget() {
  const todayQuery = trpc.moodLogs.getToday.useQuery();
  const cycleQuery = trpc.moodLogs.getCycleAnalysis.useQuery();
  const logMutation = trpc.moodLogs.logToday.useMutation({
    onSuccess: () => { todayQuery.refetch(); cycleQuery.refetch(); },
  });
  const [hoverScore, setHoverScore] = useState<number | null>(null);

  const today = todayQuery.data;
  const cycle = cycleQuery.data;

  function phaseColor(score: number) {
    if (score >= 7) return "oklch(0.75 0.18 145)";
    if (score >= 4) return "oklch(0.74 0.14 72)";
    return "oklch(0.65 0.18 30)";
  }

  return (
    <a
      href="/emotional-cycle"
      className="block p-4 rounded-xl border border-border bg-card hover:border-primary/20 hover:bg-primary/[0.02] transition-all group"
      onClick={(e) => { if ((e.target as HTMLElement).closest('button')) e.preventDefault(); }}
    >
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Emotional Cycle</p>
        <span className="ml-auto text-xs text-muted-foreground/50 group-hover:text-primary/60 transition-colors">View chart →</span>
      </div>
      {cycle?.hasEnoughData && cycle.currentPhase && (
        <div className="flex items-center gap-2 mb-3">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: phaseColor(cycle.currentPhase === "high" ? 8 : cycle.currentPhase === "low" ? 2 : 5), display: "inline-block", flexShrink: 0 }} />
          <span className="text-xs" style={{ color: phaseColor(cycle.currentPhase === "high" ? 8 : cycle.currentPhase === "low" ? 2 : 5) }}>
            {cycle.currentPhase === "high" ? "High period" : cycle.currentPhase === "low" ? "Low period" : "Neutral phase"}
          </span>
          {cycle.cycleDays && <span className="text-xs text-muted-foreground/50">· ~{cycle.cycleDays}d cycle</span>}
        </div>
      )}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{today ? `Today: ${today.score}/10` : "Log today's mood"}</p>
        <div className="flex gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onMouseEnter={() => setHoverScore(n)}
              onMouseLeave={() => setHoverScore(null)}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); logMutation.mutate({ score: n }); }}
              style={{
                flex: 1, height: 24, borderRadius: 4,
                background: (hoverScore !== null ? n <= hoverScore : today && n <= today.score)
                  ? phaseColor(hoverScore ?? today?.score ?? n)
                  : "rgba(255,255,255,0.07)",
                border: "none", cursor: "pointer", transition: "background 0.1s",
              }}
              title={`Score ${n}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          <span>Worry</span><span>Neutral</span><span>Elation</span>
        </div>
      </div>
    </a>
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Re-entry card</p>
        </div>
        <p className="text-sm text-foreground">Returning to <span className="font-medium">{projectTitle}</span>?</p>
        <p className="text-sm text-muted-foreground">Get a quick summary of where you left off before entering Focus Mode.</p>
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
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Re-entry — {projectTitle}</p>
      </div>
      {card.isFirstSession ? (
        <div className="space-y-2">
          <p className="text-sm text-foreground">This is your first session on this project.</p>
          <p className="text-sm text-muted-foreground">No history yet — the next step below is your starting point.</p>
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
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-0.5">Last stopping point</p>
              <p className="text-sm text-foreground">{card.stoppingPoint}</p>
            </div>
          )}
          {card.unresolvedDecision && (
            <div className="border-l-2 border-amber-300 dark:border-amber-700 pl-3">
              <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5">Open thread</p>
              <p className="text-sm text-foreground">{card.unresolvedDecision}</p>
            </div>
          )}
          {card.whatWasRuledOut && (
            <div className="border-l-2 border-emerald-300 dark:border-emerald-700 pl-3">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-0.5">Already handled</p>
              <p className="text-sm text-muted-foreground line-through">{card.whatWasRuledOut}</p>
            </div>
          )}
        </>
      )}
      {card.nextPhysicalAction && (
        <div className="p-3 rounded-lg bg-foreground/[0.04] border border-foreground/10">
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">Next physical action</p>
          <p className="text-sm font-medium text-foreground">{card.nextPhysicalAction}</p>
          {card.needsClarification && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚠ This step may need clarification before starting</p>
          )}
        </div>
      )}
      {card.whyItMatters && (
        <div className="pt-1 border-t border-border">
          <p className="text-sm text-muted-foreground/70 italic leading-relaxed">Why this matters: {card.whyItMatters}</p>
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
  // Product Hunt launch banner — shown only on VITE_PH_LAUNCH_DATE env var date
  const phLaunchDate = import.meta.env.VITE_PH_LAUNCH_DATE as string | undefined;
  const [phBannerDismissed, setPhBannerDismissed] = useState(() => localStorage.getItem("ph_banner_dismissed") === "1");
  const showPhBanner = !phBannerDismissed && !!phLaunchDate && new Date().toISOString().slice(0, 10) === phLaunchDate;
  // Beta / trial banner — dismissable per session
  const { data: billingStatus } = trpc.paypal.status.useQuery();
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(() => sessionStorage.getItem("trial_banner_dismissed") === "1");
  const showTrialBanner = !trialBannerDismissed && !!billingStatus && !billingStatus.isPro &&
    (billingStatus.billingStatus === "trialing_no_card" || billingStatus.billingStatus === null || billingStatus.billingStatus === undefined);
  const [completedCheckIns, setCompletedCheckIns] = useState<Set<CheckInStep>>(new Set());
  const [wrenCelebration, setWrenCelebration] = useState<{ type: CheckInStep; message: string } | null>(null);
  const [reEntryProjectId, setReEntryProjectId] = useState<number | null>(null);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [fmsOpen, setFmsOpen] = useState(false);
  const [fmsTask, setFmsTask] = useState("");
  const [fmsProjectId, setFmsProjectId] = useState<number | undefined>();
  const [thresholdOpen, setThresholdOpen] = useState(false);
  const [thresholdTask, setThresholdTask] = useState("");
  const [thresholdProjectId, setThresholdProjectId] = useState<number | undefined>();
  // Priority 8.8 — first-run Wren introduction moment
  // Wren intro: show if profile is loaded and hasSeenWrenIntro is false
  const [showWrenIntro, setShowWrenIntro] = useState(false);
  // Gamification state
  const { data: gamStatus, refetch: refetchGam } = useGamificationStatus();
  const recordEvent = useRecordEvent();
  const [returnMarkerDismissed, setReturnMarkerDismissed] = useState(false);
  const [reEntryOpen, setReEntryOpen] = useState(false);
  const [dismissedMilestones, setDismissedMilestones] = useState<Set<number>>(new Set());
  const dismissMilestone = trpc.gamification.dismissMilestone.useMutation({
    onSuccess: () => refetchGam(),
  });

  // "Pick different step" state for the Start Here card
  const [pickingStep, setPickingStep] = useState(false);
  const [customStep, setCustomStep] = useState("");
  // Ref to scroll the check-in form into view when opened from the bottom CTA
  const checkInRef = useRef<HTMLDivElement>(null);
  const openCheckIn = useCallback((type: CheckInStep) => {
    setActiveCheckIn(type);
    // Scroll to form after React renders it
    setTimeout(() => {
      checkInRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, []);

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

  // Guard all queries behind auth — prevents TRPCClientError 10001 noise before session resolves
  const authed = !!user;

  // ── Critical-path queries (fire immediately on auth) ─────────────────────────
  const { data: todayPlan, isLoading: planLoading, refetch: refetchPlan } = trpc.dailyPlan.getToday.useQuery(undefined, { enabled: authed });
  const { data: todayCheckIns, refetch: refetchCheckIns } = trpc.checkIns.getToday.useQuery(undefined, { enabled: authed });
  const { data: activeProjects } = trpc.projects.listActive.useQuery(undefined, { enabled: authed });
  const { data: streakData } = trpc.checkIns.getStreak.useQuery(undefined, {
    enabled: authed,
    staleTime: 5 * 60 * 1000,
  });
  const utils = trpc.useUtils();
  const { data: profile } = trpc.settings.getProfile.useQuery(undefined, { enabled: authed });

  // ── Deferred queries (fire only after critical path resolves) ─────────────────
  // These are secondary data that don't block the initial render.
  const criticalReady = authed && !planLoading;
  const { data: tomorrowBrief } = trpc.dailyPlan.getTomorrowBrief.useQuery(undefined, { enabled: criticalReady });
  const { data: tomorrowPlanTasks } = trpc.dailyPlan.getTomorrowPlan.useQuery(undefined, { enabled: criticalReady });
  const { data: weeklyPresence } = trpc.checkIns.weeklyPresence.useQuery(undefined, { enabled: criticalReady });
  const { data: evidenceMonth } = trpc.evidence.getCurrentMonth.useQuery(undefined, { enabled: criticalReady });
  const { data: pendingIdeas } = trpc.ai.listIdeas.useQuery(undefined, { enabled: criticalReady });
  const { data: recentDecisions } = trpc.intelligence.getRecentDecisions.useQuery(undefined, { enabled: criticalReady });
  const { data: scratchNotes } = trpc.scratchPad.list.useQuery(undefined, { enabled: criticalReady, staleTime: 60_000 });
  const { data: focusArtifact } = trpc.focusSessions.getArtifact.useQuery(undefined, { enabled: criticalReady, staleTime: 5 * 60 * 1000 });
  const { data: focusTodayStats } = trpc.focusSessions.getTodayStats.useQuery(undefined, { enabled: criticalReady, staleTime: 5 * 60 * 1000 });
  const { data: healthScores } = trpc.insights.getHealthScores.useQuery(undefined, { enabled: criticalReady });
  const { data: clarityRec } = trpc.clarity.getModeRecommendation.useQuery(undefined, {
    enabled: criticalReady,
    staleTime: 30 * 60 * 1000,
  });
  // Auto-mark seenAbout when user lands on Home — /about-app is now optional/revisitable
  const markAboutSeen = trpc.settings.markAboutSeen.useMutation({
    onSuccess: () => utils.settings.getProfile.invalidate(),
  });
  useEffect(() => {
    if (profile && profile.seenAbout === false) {
      markAboutSeen.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.seenAbout]);

  // Show Wren intro via two independent triggers:
  // 1. sessionStorage flag set by App.tsx immediately after onboarding completes
  //    (fires on the same device, same session — handles the post-onboarding case)
  // 2. Server-side profile.hasSeenWrenIntro flag
  //    (fires on any device/browser — handles returning users who haven't seen it)
  useEffect(() => {
    // Trigger 1: just completed onboarding in this session
    const justDone = sessionStorage.getItem("justCompletedOnboarding") === "1";
    if (justDone) {
      sessionStorage.removeItem("justCompletedOnboarding");
      setShowWrenIntro(true);
      return;
    }
    // Trigger 2: server flag — profile loaded, onboarding done, intro not yet seen
    if (profile && profile.hasSeenWrenIntro === false && profile.onboardingCompleted) {
      setShowWrenIntro(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.hasSeenWrenIntro, profile?.onboardingCompleted]);
  const updateSettings = trpc.settings.updateSettings.useMutation({
    onSuccess: () => utils.settings.getProfile.invalidate(),
  });
  const isPlanningMode = profile?.planningMode ?? false;
  const { playChime: playModeChime } = useTransitionSound();
  const togglePlanningMode = () => {
    playModeChime("mode_toggle");
    updateSettings.mutate({ planningMode: !isPlanningMode });
  };
  const { data: nextBestStep } = trpc.dailyPlan.getNextBestStep.useQuery(
    { currentEnergyLevel: hour < 12 ? "high" : "low" },
    { enabled: !!todayPlan, staleTime: 5 * 60 * 1000 }
  );
  const [clarityNudgeDismissed, setClarityNudgeDismissed] = useState<boolean>(() => {
    try {
      const ts = localStorage.getItem("continuary-nudge-dismissed");
      if (!ts) return false;
      return Date.now() - Number(ts) < 24 * 60 * 60 * 1000;
    } catch { return false; }
  });
  const dismissClarityNudge = () => {
    try { localStorage.setItem("continuary-nudge-dismissed", String(Date.now())); } catch { /* ignore */ }
    setClarityNudgeDismissed(true);
  };

  // Map projectId → momentum for quick lookup
  const momentumByProject = useMemo(() => {
    const map: Record<number, string> = {};
    if (healthScores) for (const s of healthScores) if (s.projectId) map[s.projectId] = s.momentum ?? "steady";
    return map;
  }, [healthScores]);

  // Inline next-step update mutation
  const updateProjectNextStep = trpc.projects.update.useMutation({
    onSuccess: () => utils.projects.listActive.invalidate(),
  });
  const [savingStep, setSavingStep] = useState(false);

  // Haptic feedback helper
  const haptic = (ms = 50) => { try { navigator.vibrate?.(ms); } catch { /* ignore */ } };

  // First-use "Hold to complete" hint — shown once, dismissed after first completion
  const [showHoldHint, setShowHoldHint] = useState<boolean>(() => {
    try { return !localStorage.getItem('continuary_hold_hint_seen'); } catch { return true; }
  });
  const dismissHoldHint = () => {
    setShowHoldHint(false);
    try { localStorage.setItem('continuary_hold_hint_seen', '1'); } catch { /* ignore */ }
  };

  // Drag-to-reorder state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const updateTasks = trpc.dailyPlan.updateTasks.useMutation({ onSuccess: () => refetchPlan() });

  // Touch reorder state
  const touchDragIndex = useRef<number | null>(null);
  const touchDragOverIndex = useRef<number | null>(null);
  const [touchDragActive, setTouchDragActive] = useState<number | null>(null);
  const [touchDragOver, setTouchDragOver] = useState<number | null>(null);

  function handleTouchStart(idx: number) {
    touchDragIndex.current = idx;
    touchDragOverIndex.current = idx;
    setTouchDragActive(idx);
  }

  function handleTouchMove(e: React.TouchEvent, containerRef: React.RefObject<HTMLDivElement | null>) {
    if (touchDragIndex.current === null) return;
    e.preventDefault();
    const touch = e.touches[0];
    const container = containerRef.current;
    if (!container) return;
    const items = Array.from(container.children) as HTMLElement[];
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        touchDragOverIndex.current = i;
        setTouchDragOver(i);
        break;
      }
    }
  }

  function handleTouchEnd(tasks: any[]) {
    const from = touchDragIndex.current;
    const to = touchDragOverIndex.current;
    if (from !== null && to !== null && from !== to) {
      const reordered = [...tasks];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      updateTasks.mutate({ criticalTasks: reordered });
    }
    touchDragIndex.current = null;
    touchDragOverIndex.current = null;
    setTouchDragActive(null);
    setTouchDragOver(null);
  }

  const taskListRef = useRef<HTMLDivElement | null>(null);

  // Undo state: tracks task IDs that were just completed but can still be undone
  const [pendingUndoTaskIds, setPendingUndoTaskIds] = useState<Set<string>>(new Set());
  const undoTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});  

  const completeTaskMutation = trpc.checkIns.completeTask.useMutation({
    onSuccess: () => refetchPlan(),
  });
  const uncompleteTask = trpc.checkIns.uncompleteTask.useMutation({
    onSuccess: () => refetchPlan(),
  });

  // Wrap completeTask with a 5-second undo window
  const completeTask = useCallback((taskId: string) => {
    haptic(60); // tactile confirmation
    dismissHoldHint(); // hide first-use hint after first completion
    // Optimistically mark done in the UI immediately
    completeTaskMutation.mutate({ taskId });
    // Record gamification event
    recordEvent.mutate({ eventType: "task_completed", label: "Task completed" });
    // Mark as pending-undo
    setPendingUndoTaskIds((prev) => new Set(Array.from(prev).concat(taskId)));
    // Show undo toast
    toast("Task marked complete", {
      description: "Tap Undo if that was a mistake.",
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(undoTimers.current[taskId]);
          delete undoTimers.current[taskId];
          setPendingUndoTaskIds((prev) => { const s = new Set(prev); s.delete(taskId); return s; });
          uncompleteTask.mutate({ taskId });
        },
      },
    });
    // Auto-clear pending-undo state after 5.5s (slightly after toast expires)
    undoTimers.current[taskId] = setTimeout(() => {
      setPendingUndoTaskIds((prev) => { const s = new Set(prev); s.delete(taskId); return s; });
      delete undoTimers.current[taskId];
    }, 5500);
  }, [completeTaskMutation, uncompleteTask]);

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
    // Show Wren celebration overlay
    const celebrationMessages: Record<CheckInStep, string> = {
      morning: "Thread secured. Today has direction.",
      midday: "You checked in. The thread holds.",
      evening: "Day closed. Wren will keep this warm until tomorrow.",
    };
    setWrenCelebration({ type, message: celebrationMessages[type] });
    setTimeout(() => setWrenCelebration(null), 3500);
    // Record gamification event for rhythm completion
    const rhythmLabels: Record<CheckInStep, string> = {
      morning: "Morning check-in complete",
      midday: "Midday pulse done",
      evening: "Evening close complete",
    };
    recordEvent.mutate({ eventType: `rhythm_${type}`, label: rhythmLabels[type] });
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
  // Spiral offer: check server-side detection (fires after blocker, before sanctuary nudge)
  const { data: spiralCheck } = trpc.groundMode.checkSpiralOffer.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // recheck every 5 min
  });
  const [groundModeActive, setGroundModeActive] = useState(false);
  const [groundModeEnteredAt, setGroundModeEnteredAt] = useState<number | null>(null);
  const [groundModeEntryMethod, setGroundModeEntryMethod] = useState<"manual" | "contextual_offer">("manual");
  const [groundModeCrisisBreak, setGroundModeCrisisBreak] = useState(false);
  const logGroundSession = trpc.groundMode.logSession.useMutation();

  const enterGroundMode = (method: "manual" | "contextual_offer") => {
    setGroundModeActive(true);
    setGroundModeEnteredAt(Date.now());
    setGroundModeEntryMethod(method);
    setGroundModeCrisisBreak(false);
  };

  const exitGroundMode = (method: "manual" | "soft_expire" | "crisis_break" | "session_end") => {
    if (!groundModeEnteredAt) return;
    logGroundSession.mutate({
      enteredAt: groundModeEnteredAt,
      entryMethod: groundModeEntryMethod,
      exitedAt: Date.now(),
      exitMethod: method,
    });
    setGroundModeActive(false);
    setGroundModeEnteredAt(null);
    if (method === "crisis_break") setGroundModeCrisisBreak(true);
  };

  // Soft-expiry: auto-exit after 15 minutes
  useEffect(() => {
    if (!groundModeActive || !groundModeEnteredAt) return;
    const remaining = 15 * 60 * 1000 - (Date.now() - groundModeEnteredAt);
    if (remaining <= 0) { exitGroundMode("soft_expire"); return; }
    const timer = setTimeout(() => exitGroundMode("soft_expire"), remaining);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groundModeActive, groundModeEnteredAt]);

  type AlertType = "check_in_due" | "capacity_low" | "capacity_partial" | "blocker" | "spiral_offer" | "weekly_review" | "tomorrow_brief" | "sanctuary_nudge" | null;
  const topAlert: AlertType = (() => {
    if (!morningDone && activePeriod === "morning") return "check_in_due";
    if (todayPlan && capacityLevel === "low") return "capacity_low";
    if (todayPlan && capacityLevel === "partial") return "capacity_partial";
    if (hasBlockedProject) return "blocker";
    if (spiralCheck?.offer && !groundModeActive && !groundModeCrisisBreak) return "spiral_offer";
    if (weeklyReviewDue && morningDone) return "weekly_review";
    if (tomorrowBrief && !morningDone) return "tomorrow_brief";
    if (pendingIdeaCount > 3) return "sanctuary_nudge";
    return null;
  })();

  // ── Today dashboard skeleton (P2-E) ───────────────────────────────────────
  // Show a lightweight skeleton while the critical-path data loads.
  if (authed && planLoading) {
    return (
      <div className="px-5 py-7 max-w-4xl mx-auto space-y-7 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
            <div className="space-y-2">
              <div className="h-8 w-48 rounded-lg bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
            </div>
          </div>
          <div className="h-7 w-24 rounded-full bg-muted" />
        </div>
        {/* Alert card skeleton */}
        <div className="h-16 w-full rounded-xl bg-muted" />
        {/* Task list skeleton */}
        <div className="space-y-3">
          <div className="h-5 w-28 rounded bg-muted" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-full rounded-xl bg-muted" />
          ))}
        </div>
        {/* Projects skeleton */}
        <div className="space-y-3">
          <div className="h-5 w-24 rounded bg-muted" />
          {[1, 2].map((i) => (
            <div key={i} className="h-20 w-full rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
    {showWrenIntro && (
      <WrenIntroMoment onDone={() => setShowWrenIntro(false)} />
    )}
    <div className="px-5 py-7 page-enter max-w-4xl mx-auto space-y-7">
      {/* ── Beta / trial banner ──────────────────────────────────────────── */}
      {showTrialBanner && (
        <div
          className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl"
          style={{
            background: "linear-gradient(135deg, rgba(160,120,50,0.07) 0%, rgba(100,75,25,0.04) 100%)",
            border: "1px solid rgba(160,120,50,0.16)",
          }}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <span
              className="shrink-0 w-0.5 h-7 rounded-full"
              style={{ background: "linear-gradient(180deg, rgba(160,120,50,0.65) 0%, rgba(160,120,50,0.1) 100%)" }}
            />
            <p className="text-sm leading-relaxed" style={{ color: "rgba(190,155,80,0.80)", letterSpacing: "0.015em", fontWeight: 400 }}>
              {billingStatus?.isFoundingMember
                ? <>✨ You’re in beta — full access, no card required.{" "}
                    <a href="/pro" style={{ color: "rgba(200,165,90,0.95)", textDecoration: "underline", textUnderlineOffset: "3px", textDecorationColor: "rgba(160,120,50,0.35)", fontWeight: 500 }}>Lock in your founding rate</a> whenever you’re ready.
                  </>
                : <>✨ You’re in beta — full access, no card required.{" "}
                    <a href="/pro" style={{ color: "rgba(200,165,90,0.95)", textDecoration: "underline", textUnderlineOffset: "3px", textDecorationColor: "rgba(160,120,50,0.35)", fontWeight: 500 }}>View plans</a>.
                  </>
              }
            </p>
          </div>
          <button
            onClick={() => { setTrialBannerDismissed(true); sessionStorage.setItem("trial_banner_dismissed", "1"); }}
            className="shrink-0 transition-opacity"
            style={{ color: "rgba(160,120,50,0.35)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(160,120,50,0.65)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(160,120,50,0.35)")}
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* ── Product Hunt launch banner ────────────────────────────────────── */}
      {showPhBanner && (
        <div
          className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl"
          style={{
            background: "linear-gradient(135deg, rgba(160,120,50,0.07) 0%, rgba(100,75,25,0.04) 100%)",
            border: "1px solid rgba(160,120,50,0.16)",
          }}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <span
              className="shrink-0 w-0.5 h-7 rounded-full"
              style={{ background: "linear-gradient(180deg, rgba(160,120,50,0.65) 0%, rgba(160,120,50,0.1) 100%)" }}
            />
            <p className="text-sm leading-relaxed" style={{ color: "rgba(190,155,80,0.80)", letterSpacing: "0.015em", fontWeight: 400 }}>
              Continuary is live on{" "}
              <a
                href="https://www.producthunt.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "rgba(200,165,90,0.95)", textDecoration: "underline", textUnderlineOffset: "3px", textDecorationColor: "rgba(160,120,50,0.35)", fontWeight: 500 }}
              >
                Product Hunt
              </a>
              {" "}— an upvote means a great deal.
            </p>
          </div>
          <button
            onClick={() => { setPhBannerDismissed(true); localStorage.setItem("ph_banner_dismissed", "1"); }}
            className="shrink-0 transition-opacity"
            style={{ color: "rgba(160,120,50,0.35)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(160,120,50,0.65)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(160,120,50,0.35)")}
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* ── Ground Mode Banner ─────────────────────────────────────────────── */}
      {groundModeActive && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl"
          style={{ background: "oklch(0.18 0.02 240 / 0.80)", border: "1px solid oklch(0.35 0.04 240 / 0.50)" }}
        >
          <div className="flex items-center gap-2">
            <Anchor className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(0.65 0.05 240)" }} />
            <span className="text-xs font-medium" style={{ color: "oklch(0.80 0.04 240)" }}>Ground Mode: facts only</span>
            {groundModeEnteredAt && (
              <span className="text-xs" style={{ color: "oklch(0.50 0.03 240)" }}>
                · {Math.max(0, Math.round((15 * 60 * 1000 - (Date.now() - groundModeEnteredAt)) / 60000))}m left
              </span>
            )}
          </div>
          <button
            onClick={() => exitGroundMode("manual")}
            className="text-xs px-2.5 py-1 rounded-lg transition-colors"
            style={{ color: "oklch(0.60 0.03 240)", border: "1px solid oklch(0.35 0.04 240 / 0.40)" }}
          >
            Exit
          </button>
        </div>
      )}
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <WrenPlayer clip="popsHead" size="sm" wrapperClassName="shrink-0 -mt-1" fallbackStill="luminousIdle" />
          <div>
          <h1 className="text-[1.9rem] font-semibold tracking-[-0.02em] text-foreground leading-tight font-brand">
            {greeting}, <span style={{ color: "oklch(0.74 0.14 72)" }}>{firstName}</span>.
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">
              {format(now, "EEEE, MMMM d")}
            </p>
            {streakData && streakData.streak >= 2 && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: "oklch(0.74 0.16 58 / 0.15)", color: "oklch(0.74 0.14 72)", border: "1px solid oklch(0.74 0.16 58 / 0.3)" }}
                title={`${streakData.streak}-day streak — longest: ${streakData.longestStreak} days`}
              >
                🔥 {streakData.streak}d
              </span>
            )}
          </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Manual Ground Mode entry */}
          {!groundModeActive && (
            <button
              onClick={() => enterGroundMode("manual")}
              title="Enter Ground Mode — facts only, no warmth"
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "oklch(0.45 0.04 240 / 0.70)", border: "1px solid oklch(0.35 0.04 240 / 0.30)" }}
            >
              <Anchor className="w-3.5 h-3.5" />
            </button>
          )}
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
        <button
          onClick={() => openCheckIn("morning")}
          className="w-full text-left p-4 rounded-xl border transition-all duration-150 active:scale-[0.99] hover:brightness-110"
          style={{ borderColor: "oklch(0.74 0.14 72 / 0.28)", background: "linear-gradient(135deg, oklch(0.74 0.14 72 / 0.08) 0%, oklch(0.74 0.14 72 / 0.03) 100%)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.74 0.14 72)" }}>Morning check-in ready</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "oklch(0.74 0.14 72 / 0.6)" }} />
          </div>
          <p className="text-sm text-foreground">Set your capacity and focus for today.</p>
        </button>
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
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-widest">Blocker detected</p>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300">{blockedProject.title} — {blockedProject.nextStep}</p>
          </div>
        );
      })()}
      {topAlert === "spiral_offer" && (
        <div
          className="p-4 rounded-xl border"
          style={{ background: "oklch(0.22 0.02 240 / 0.60)", borderColor: "oklch(0.45 0.04 240 / 0.50)" }}
        >
          <div className="flex items-start gap-3">
            <Anchor className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "oklch(0.72 0.06 240)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-0.5" style={{ color: "oklch(0.88 0.04 240)" }}>Ground Mode available</p>
              <p className="text-xs leading-relaxed" style={{ color: "oklch(0.65 0.03 240)" }}>
                Your recent notes have some spiral signals. Ground Mode strips the AI back to facts only — no warmth, no framing, just what's observable and one next action.
              </p>
              <div className="flex items-center gap-3 mt-2.5">
                <button
                  onClick={() => enterGroundMode("contextual_offer")}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: "oklch(0.35 0.04 240 / 0.70)", color: "oklch(0.90 0.04 240)", border: "1px solid oklch(0.50 0.04 240 / 0.40)" }}
                >
                  Enter Ground Mode
                </button>
                <button
                  onClick={() => setGroundModeCrisisBreak(true)}
                  className="text-xs" style={{ color: "oklch(0.55 0.03 240)" }}
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {topAlert === "weekly_review" && (
        <div className="p-3 rounded-xl border" style={{ background: "oklch(0.74 0.14 72 / 0.06)", borderColor: "oklch(0.74 0.14 72 / 0.20)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5" style={{ color: "oklch(0.74 0.14 72)" }} />
              <p className="text-xs" style={{ color: "oklch(0.74 0.14 72)" }}>Weekly review is ready for this week.</p>
            </div>
            <button
              onClick={() => navigate("/weekly-review")}
              className="text-xs font-medium hover:underline" style={{ color: "oklch(0.74 0.14 72)" }}
            >Open</button>
          </div>
        </div>
      )}
      {topAlert === "tomorrow_brief" && tomorrowBrief && (
        <div className="p-4 rounded-xl bg-card border border-border card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Yesterday's brief for today</p>
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
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
            >Process now</button>
          </div>
        </div>
      )}
      {/* ── AI Guidance (always shown when plan exists) ─────────────────────── */}
      {todayPlan?.generatedGuidance && (
        <div className="relative p-4 rounded-xl overflow-hidden" style={{ background: "oklch(0.74 0.14 72 / 0.06)", border: "1px solid oklch(0.74 0.14 72 / 0.18)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "oklch(0.74 0.14 72)" }} />
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.74 0.14 72)" }}>Today's guidance</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{todayPlan.generatedGuidance}</p>
        </div>
      )}

      {/* ── Return Marker ────────────────────────────────────────────────────── */}
      {gamStatus?.returnMarker && !returnMarkerDismissed && (
        <ReturnMarker
          message={gamStatus.returnMarker.message}
          onDismiss={() => {
            setReturnMarkerDismissed(true);
            recordEvent.mutate({
              eventType: `return_${gamStatus.returnMarker!.window}`,
              label: "Returned to Continuary",
            });
          }}
        />
      )}

      {/* ── Pending Milestone Cards ──────────────────────────────────────────── */}
      {gamStatus?.pendingMilestones
        .filter(m => !dismissedMilestones.has(m.id))
        .slice(0, 2)
        .map(m => (
          <MilestoneCard
            key={m.id}
            id={m.id}
            title={m.title}
            body={m.body}
            onDismiss={(id) => {
              setDismissedMilestones(prev => new Set(Array.from(prev).concat(id)));
              dismissMilestone.mutate({ milestoneId: id });
            }}
          />
        ))
      }

      {/* ── Onboarding Checklist (new users only) ──────────────────────────── */}
      {(() => {
        const hasCheckin = morningDone || middayDone || eveningDone;
        const hasProject = activeProjects && activeProjects.length > 0;
        const hasIdea = pendingIdeas && pendingIdeas.length > 0;
        const allDone = hasCheckin && hasProject && hasIdea;
        // Only show if at least one step is incomplete and user hasn't dismissed
        const dismissed = (() => { try { return !!localStorage.getItem('continuary_onboarding_done'); } catch { return false; } })();
        // Hide for returning users who already have projects (prevents "Add your first project"
        // showing with 3 projects already in the system — biggest trust-breaker for new users).
        // Use project count alone as source of truth — do NOT require onboardingCompleted flag.
        const isReturningUser = hasProject;
        if (dismissed || allDone || isReturningUser) return null;
        return (
          <div className="p-4 rounded-xl border bg-card" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest">Getting started</p>
              <button
                onClick={() => { try { localStorage.setItem('continuary_onboarding_done', '1'); } catch {} }}
                className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
              >Dismiss</button>
            </div>
            <div className="space-y-2">
              {[{
                done: hasCheckin,
                label: "Complete your first check-in",
                hint: "Tap Morning, Midday, or Evening above",
              }, {
                done: !!hasProject,
                label: "Add your first project",
                hint: "Go to Projects in the sidebar",
              }, {
                done: !!hasIdea,
                label: "Capture an idea in the Vault",
                hint: "Go to Vault in the sidebar",
              }].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={cn(
                    "mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                    step.done ? "bg-emerald-500/20 border-emerald-500/50" : "border-foreground/20"
                  )}>
                    {step.done && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />}
                  </div>
                  <div>
                    <p className={cn("text-xs font-medium", step.done && "line-through text-muted-foreground")}>{step.label}</p>
                    {!step.done && <p className="text-sm text-muted-foreground mt-0.5">{step.hint}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Daily Rhythm Check-Ins ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.74 0.14 72 / 0.60)" }}>Daily Rhythm</p>
          {gamStatus?.rhythmToday && (
            <RhythmSegments
              morning={gamStatus.rhythmToday.morning}
              midday={gamStatus.rhythmToday.midday}
              evening={gamStatus.rhythmToday.evening}
            />
          )}
        </div>
        <div className="flex gap-2">
          <CheckInCard
            type="morning"
            icon={Sun}
            label="Morning check-in"
            timeHint="Set capacity + focus"
            completed={morningDone}
            active={activePeriod === "morning" && !morningDone}
            open={activeCheckIn === "morning"}
            onOpen={() => openCheckIn("morning")}
            onClose={() => setActiveCheckIn(null)}
          />
          <CheckInCard
            type="midday"
            icon={Zap}
            label="Midday pulse"
            timeHint="Alignment pulse — on plan?"
            completed={middayDone}
            active={activePeriod === "midday" && morningDone && !middayDone}
            open={activeCheckIn === "midday"}
            onOpen={() => openCheckIn("midday")}
            onClose={() => setActiveCheckIn(null)}
          />
          <CheckInCard
            type="evening"
            icon={Sunset}
            label="Evening close"
            timeHint="Close the loop. Acknowledge what moved."
            completed={eveningDone}
            active={activePeriod === "evening" && !eveningDone}
            open={activeCheckIn === "evening"}
            onOpen={() => openCheckIn("evening")}
            onClose={() => setActiveCheckIn(null)}
          />
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────────
           Two-column grid on desktop: left = primary, right = supporting
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-6 lg:items-start space-y-6 lg:space-y-0">

        {/* ════ LEFT COLUMN ════ */}
        <div className="space-y-6">

          {/* ── Wren Celebration Overlay ─────────────────────────────────────── */}
          {wrenCelebration && (
            <div
              className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
              style={{ background: "oklch(0.08 0.02 264 / 0.85)", backdropFilter: "blur(8px)" }}
            >
              <WrenPlayer clip="cartwheels" size="2xl" />
              <p
                className="mt-4 text-lg font-semibold text-center px-8"
                style={{ color: "oklch(0.74 0.14 72)" }}
              >
                {wrenCelebration.message}
              </p>
            </div>
          )}

          {/* ── Active Check-In Form ─────────────────────────────────────────── */}
          {activeCheckIn && (
        <div ref={checkInRef} className="p-5 rounded-xl bg-card border border-foreground/10 shadow-sm">
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Carried over from yesterday
            </p>
          </div>
          <div className="space-y-2">
            {carryoverTasks.map((taskTitle: string, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10">
                <Circle className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-sm text-foreground">{taskTitle}</p>
                <Badge variant="outline" className="ml-auto text-xs text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 shrink-0">
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
              <p className="text-sm text-muted-foreground mt-0.5">
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
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.74 0.14 72 / 0.60)" }}>
              Today's tasks
            </p>
            <span className="text-sm text-muted-foreground">{completedTasks}/{visibleTasks.length}</span>
          </div>
          {/* First-use hold hint */}
          {showHoldHint && visibleTasks.some((t: any) => !t.done) && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15 mb-1">
              <p className="text-sm text-muted-foreground">Hold the circle to complete · Swipe right to complete</p>
              <button onClick={dismissHoldHint} className="text-sm text-muted-foreground/50 hover:text-muted-foreground shrink-0">Got it</button>
            </div>
          )}
          {allTasksDone ? (
            <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">All tasks complete.</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                That's the work. The rest is bonus.
              </p>
            </div>
          ) : (
            <div className="space-y-2" ref={taskListRef}
              onTouchMove={(e) => handleTouchMove(e, taskListRef)}
              onTouchEnd={() => handleTouchEnd(tasks)}
            >
              {visibleTasks.map((task: any, idx: number) => (
                <div
                  key={task.id}
                  className={cn("relative transition-opacity",
                    (dragIndex === idx || touchDragActive === idx) ? "opacity-40" :
                    (dragOverIndex === idx || touchDragOver === idx) ? "ring-1 ring-primary/40 rounded-xl" : "")}
                  draggable={!task.done}
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx); }}
                  onDragEnd={() => {
                    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
                      const reordered = [...tasks];
                      const [moved] = reordered.splice(dragIndex, 1);
                      reordered.splice(dragOverIndex, 0, moved);
                      updateTasks.mutate({ criticalTasks: reordered });
                    }
                    setDragIndex(null);
                    setDragOverIndex(null);
                  }}
                >
                  {/* Grip handle — visible on mobile for touch reorder */}
                  {!task.done && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-7 flex items-center justify-center z-10 touch-none cursor-grab active:cursor-grabbing md:hidden"
                      onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(idx); }}
                      style={{ color: "oklch(0.55 0.01 270)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                        <rect x="2" y="2" width="10" height="2" rx="1"/>
                        <rect x="2" y="6" width="10" height="2" rx="1"/>
                        <rect x="2" y="10" width="10" height="2" rx="1"/>
                      </svg>
                    </div>
                  )}
                  <div className={cn(!task.done ? "pl-7 md:pl-0" : "")}>
                  <TaskItem
                    task={task}
                    onComplete={(id) => completeTask(id)}
                    onUnstick={(t) => setUnstickTask(t)}
                    pendingUndo={pendingUndoTaskIds.has(task.id)}
                  />
                  </div>
                  {getCarryoverCount(task) >= 2 && (
                    <div className="absolute -top-1 -right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700">
                      <RotateCcw className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{getCarryoverCount(task)}×</span>
                    </div>
                  )}
                </div>
              ))}
              {hiddenTaskCount > 0 && (
                <p className="text-sm text-muted-foreground/50 text-center py-1.5">
                  {hiddenTaskCount} more task{hiddenTaskCount > 1 ? "s" : ""} held back — {capacityLevel === "low" ? "one thing today" : "focus on these first"}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Next Best Step Engine ──────────────────────────────────────────── */}
      {nextBestStep && tasks.length > 0 && !allTasksDone && (
        <div className="p-4 rounded-xl border space-y-2" style={{ borderColor: "oklch(0.68 0.17 155 / 0.25)", background: "oklch(0.68 0.17 155 / 0.05)" }}>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-emerald-500" />
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.68 0.17 155 / 0.80)" }}>Next best step</p>
            {nextBestStep.isStale && (
              <span className="ml-auto text-xs text-amber-500/70 font-medium">waiting a while</span>
            )}
          </div>
          <p className="text-sm font-medium text-foreground leading-snug">{nextBestStep.title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{nextBestStep.reason}</p>
          {nextBestStep.estimatedMinutes && (
            <p className="text-sm text-muted-foreground/60 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />{nextBestStep.estimatedMinutes} min
            </p>
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
          <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: "oklch(0.74 0.14 72 / 0.25)", background: "linear-gradient(135deg, oklch(0.74 0.14 72 / 0.08) 0%, oklch(0.74 0.14 72 / 0.03) 100%)" }}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center shadow-sm">
                <ArrowRight className="w-3 h-3 text-primary-foreground" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.74 0.14 72)" }}>Start here</p>
              <button
                onClick={() => { setPickingStep(!pickingStep); setCustomStep(""); }}
                className="ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                title="Pick a different next step"
              >
                <Shuffle className="w-3 h-3" />
                <span>{pickingStep ? "Cancel" : "Different step"}</span>
              </button>
            </div>

            {/* Pick different step panel */}
            {pickingStep && (
              <div className="space-y-2 pt-1 border-t border-border/50">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Choose a starting point</p>
                {activeProjects.filter((p) => p.nextStep).map((p) => (
                  <button
                    key={p.id}
                    onClick={async () => {
                      if (p.id === topProject.id) { setPickingStep(false); return; }
                      setSavingStep(true);
                      await updateProjectNextStep.mutateAsync({ id: topProject.id, nextStep: p.nextStep ?? "" });
                      setSavingStep(false);
                      setPickingStep(false);
                      toast("Next step updated");
                    }}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg border text-xs transition-all",
                      p.id === topProject.id
                        ? "border-primary/40 bg-primary/[0.06] text-foreground"
                        : "border-border hover:border-primary/20 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="font-medium block truncate">{p.nextStep}</span>
                    <span className="text-xs opacity-60">{p.title}</span>
                  </button>
                ))}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={customStep}
                    onChange={(e) => setCustomStep(e.target.value)}
                    placeholder="Type a custom next step..."
                    className="flex-1 text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && customStep.trim()) {
                        setSavingStep(true);
                        await updateProjectNextStep.mutateAsync({ id: topProject.id, nextStep: customStep.trim() });
                        setSavingStep(false);
                        setCustomStep("");
                        setPickingStep(false);
                        toast("Next step updated");
                      }
                    }}
                  />
                  {customStep.trim() && (
                    <button
                      disabled={savingStep}
                      onClick={async () => {
                        setSavingStep(true);
                        await updateProjectNextStep.mutateAsync({ id: topProject.id, nextStep: customStep.trim() });
                        setSavingStep(false);
                        setCustomStep("");
                        setPickingStep(false);
                        toast("Next step updated");
                      }}
                      className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50"
                    >
                      {savingStep ? "Saving..." : "Save"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {!pickingStep && (
              <>
                <div>
                  <p className="text-sm font-medium text-foreground leading-snug">{topProject.nextStep}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{topProject.title}</p>
                </div>
                {topProject.contextBreadcrumb && (
                  <div className="border-l-2 border-border pl-3">
                    <p className="text-sm text-muted-foreground/70 italic leading-relaxed">
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
                      <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5">Last decision</p>
                      <p className="text-sm text-foreground/80 leading-snug">{projectDecision.content}</p>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-2 justify-end flex-wrap">
                  <button
                    onClick={() => setReEntryProjectId(reEntryProjectId === topProject.id ? null : topProject.id)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
                    className="text-xs text-amber-500 dark:text-amber-400 hover:text-amber-400 transition-colors font-medium"
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
              </>
            )}
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

      {/* ── Wren Ambient Presence (time-of-day) ─────────────────────────── */}
      {(() => {
        // Morning 5–11: popsHead (alert, ready) | Midday 12–16: holdingOrb (focused, grounded) | Evening 17+: closesEyes (reflective, winding down)
        const wrenClip = hour < 12 ? "popsHead" : hour < 17 ? "holdingOrb" : "closesEyes";
        const wrenTagline = hour < 12 ? "Morning. The thread is ready." : hour < 17 ? "Your thread is holding." : "Wren is keeping this warm.";
        return (
          <div
            className="relative overflow-hidden rounded-2xl hidden lg:flex items-end justify-center"
            style={{
              height: 220,
              background: "linear-gradient(to top, oklch(0.10 0.022 240) 0%, oklch(0.13 0.028 240 / 0.6) 60%, transparent 100%)",
            }}
          >
            {/* Subtle amber radial glow behind Wren */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 50% 80%, oklch(0.74 0.14 72 / 0.10) 0%, transparent 65%)",
              }}
            />
            <WrenPlayer
              clip={wrenClip}
              size="2xl"
              loop
              autoPlay
              muted
              feather
              featherDirection="bottom"
              wrapperClassName="absolute inset-0 flex items-center justify-center"
            />
            {/* Tagline overlay */}
            <div className="relative z-10 pb-4 text-center px-4">
              <p className="text-xs font-log" style={{ color: "oklch(0.92 0.02 65 / 0.80)" }}>
                {wrenTagline}
              </p>
            </div>
          </div>
        );
      })()}

      {/* ── Emotional Cycle Widget ─────────────────────────────────────────── */}
      <MoodWidget />

      {/* ── Tomorrow's Plan Card (from last night's evening check-in) ─────── */}
      {tomorrowPlanTasks && tomorrowPlanTasks.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-center gap-2">
            <Moon className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Planned for today</p>
            <span className="ml-auto text-sm text-muted-foreground/50">from last night</span>
          </div>
          <ul className="space-y-1.5">
            {tomorrowPlanTasks.map((task: any, i: number) => (
              <li key={task.id ?? i} className="flex items-start gap-2.5">
                <Circle className="w-3 h-3 text-muted-foreground/40 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {task.energyLevel && task.energyLevel !== 'any' && (
                      <span className={`text-xs font-medium ${
                        task.energyLevel === 'high' ? 'text-amber-500' : 'text-amber-400/70'
                      }`}>
                        {task.energyLevel === 'high' ? '⚡ high energy' : '🌙 low energy'}
                      </span>
                    )}
                    {task.estimatedMinutes && (
                      <span className="flex items-center gap-0.5 text-sm text-muted-foreground/50">
                        <Clock className="w-2.5 h-2.5" />{task.estimatedMinutes}m
                      </span>
                    )}
                    {task.notes && (
                      <span className="text-sm text-muted-foreground/50 italic truncate max-w-[160px]">{task.notes}</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Scratch Pad Widget ────────────────────────────────────────────────────────────────── */}
      {scratchNotes && scratchNotes.length > 0 && (() => {
        const pinned = (scratchNotes as any[]).filter(n => n.pinned);
        const preview = pinned.length > 0 ? pinned.slice(0, 2) : (scratchNotes as any[]).slice(0, 2);
        return (
          <a href="/scratch" className="block p-4 rounded-xl border transition-all group" style={{ background: "oklch(0.12 0.022 240 / 0.60)", borderColor: "oklch(0.74 0.14 72 / 0.10)" }}>
            <div className="flex items-center gap-2 mb-2">
              <PenLine className="w-3.5 h-3.5" style={{ color: "oklch(0.74 0.14 72 / 0.55)" }} />
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.74 0.14 72 / 0.55)" }}>Scratch Pad</p>
              <span className="ml-auto text-sm text-muted-foreground/50 group-hover:text-primary/60 transition-colors">{scratchNotes.length} note{scratchNotes.length !== 1 ? 's' : ''} →</span>
            </div>
            <div className="space-y-1.5">
              {preview.map((note: any) => (
                <p key={note.id} className="text-sm text-foreground/70 leading-snug line-clamp-2 whitespace-pre-wrap">{note.content}</p>
              ))}
            </div>
          </a>
        );
      })()}

      {/* ── Knowledge Graph Shortcut ─────────────────────────────────────── */}
      <a href="/vault" className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/20 hover:bg-primary/[0.02] transition-all group">
        <span style={{ fontSize: "1rem", lineHeight: 1 }}>◎</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Knowledge Graph</p>
          <p className="text-sm text-foreground/60 mt-0.5">View your vault connections</p>
        </div>
        <span className="text-sm text-muted-foreground/40 group-hover:text-primary/60 transition-colors">→</span>
      </a>

      {/* ── Thread Strength + Re-Entry Shortcut */}
      {gamStatus?.threadStrength && (       <div
          className="p-4 rounded-xl border"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <ContinuityRing
            score={gamStatus.threadStrength.score}
            state={gamStatus.threadStrength.state}
          />
          <button
            onClick={() => setReEntryOpen(true)}
            className="mt-3 w-full text-left text-xs py-2 px-3 rounded-lg transition-colors"
            style={{
              background: "oklch(0.74 0.14 72 / 0.08)",
              color: "oklch(0.74 0.14 72 / 0.65)",
            }}
          >
            ↺ Pick up the thread
          </button>
        </div>
      )}

      {/* ── Focus Sessions Today Widget ─────────────────────────────────────── */}
      {focusTodayStats && focusTodayStats.todaySessions > 0 && (
        <a
          href="/focus"
          className="block p-4 rounded-xl border no-underline transition-opacity hover:opacity-90"
          style={{ background: "oklch(0.12 0.022 240 / 0.60)", borderColor: "oklch(0.74 0.14 72 / 0.12)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "oklch(0.74 0.14 72 / 0.55)" }}>Focus sessions today</p>
          <p className="text-sm" style={{ color: "oklch(0.88 0.06 65)" }}>
            {focusTodayStats.todaySessions} session{focusTodayStats.todaySessions !== 1 ? "s" : ""} · {focusTodayStats.todayMinutes} min
            {focusArtifact && focusArtifact.totalSegments > 0 && ` · ${focusArtifact.totalSegments} woven total`}
          </p>
        </a>
      )}

      {/* ── Evidence of Movement Feed ────────────────────────────────────────── */}
      {gamStatus?.recentEvents && gamStatus.recentEvents.length > 0 && (
        <div
          className="p-4 rounded-xl border"
          style={{ background: "oklch(0.12 0.022 240 / 0.60)", borderColor: "oklch(0.74 0.14 72 / 0.12)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "oklch(0.74 0.14 72 / 0.55)" }}>Evidence of movement</p>
          <MovementFeed events={gamStatus.recentEvents as any} />
        </div>
      )}

      {/* ── Weekly Presence Dots ────────────────────────────────────────────────────── */}
      <ThreadView />
      {/* ── Evidence Log monthly sentence ─────────────────────────────────────────────────────────────────── */}
      {evidenceMonth?.summaryLine && (
        <div className="px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <p className="text-xs font-semibold text-amber-400/70 uppercase tracking-widest mb-1">Your evidence</p>
          <p className="text-sm text-foreground/70 italic leading-relaxed">{evidenceMonth.summaryLine}</p>
        </div>
      )}
      {/* ── Active Projects Quick Access (right col) ────────────────────────────────────────────────────────── */}
      {activeProjects && activeProjects.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Active projects</p>
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
                      <span className={`text-xs font-semibold uppercase tracking-wide shrink-0 ${
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
                    <p className="text-sm text-muted-foreground truncate mt-0.5">Next: {project.nextStep}</p>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground rotate-[-90deg] shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
            {capacityLevel === "low" && activeProjects.length > 1 && (
              <p className="text-sm text-muted-foreground/60 text-center py-1">
                {activeProjects.length - 1} other project{activeProjects.length - 1 > 1 ? "s" : ""} paused for today
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Clarity Engine Nudge (right col) ───────────────────────────────────────────── */}
      {clarityRec && !clarityNudgeDismissed && (
        <div className="relative overflow-hidden p-4 rounded-xl border border-primary/20 bg-primary/5">
          <button
            onClick={dismissClarityNudge}
            className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-foreground/5 transition-colors"
            aria-label="Dismiss for 24 hours"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-xs font-semibold text-primary/70 uppercase tracking-widest mb-1">Pattern detected</p>
              <p className="text-sm font-medium text-foreground mb-1">{clarityRec.modeLabel}</p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">{clarityRec.nudge}</p>
              <p className="text-sm text-muted-foreground/50 italic mb-3">{clarityRec.context}</p>
              <button
                onClick={() => navigate(`/clarity?mode=${clarityRec.mode}`)}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Start a session <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Recent Decisions (right col) ────────────────────────────────────────────────────────── */}
      {recentDecisions && recentDecisions.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Recent decisions</p>
          <div className="space-y-2">
            {recentDecisions.slice(0, 2).map((d: any) => (
              <div key={d.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground leading-snug">{d.content}</p>
                  {d.context && <p className="text-sm text-muted-foreground/60 mt-0.5">{d.context}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

       {/* ── Planning / Doing Mode Toggle ─────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-foreground">
                {isPlanningMode ? (
                  <span>🌿 Being Mode</span>
                ) : (
                  <span>🎯 <GlossaryTerm name="doingMode" /></span>
                )}
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground/40 hover:text-muted-foreground transition-colors" aria-label="What is this?">
                      <HelpCircle className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed space-y-2 p-3">
                    <p><strong>🎯 Doing Mode</strong> — Make and move. Use this when you know exactly what to do and just need to get it done.</p>
                    <p><strong>🌿 Being Mode</strong> — Rest and notice. Use this when you need to step back, restore, or simply be present without a task agenda.</p>
                    <p className="text-muted-foreground/60">Toggle this to match your mental state right now. Focus Mode (the ⚡ button in the sidebar) is a separate distraction-free timer session.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isPlanningMode ? "Rest and notice" : "Make and move"}
            </p>
          </div>
          <button
            onClick={togglePlanningMode}
            disabled={updateSettings.isPending}
            className={cn(
              "relative w-10 h-5.5 rounded-full transition-colors border shrink-0 ml-3",
              isPlanningMode
                ? "bg-primary border-primary/60"
                : "bg-foreground/10 border-border"
            )}
            aria-label="Toggle planning mode"
          >
            <span className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
              isPlanningMode ? "translate-x-5" : "translate-x-0.5"
            )} />
          </button>
        </div>
      </div>     </div>
      </div>
      {/* Empty state banner removed — the top-alert check_in_due card and Daily Rhythm tiles already surface the morning check-in. A third CTA was redundant and used an off-palette purple gradient. */}

      {/* ── Notification Permission Prompt ─────────────────────────────────── */}
      {showNotifPrompt && (
        <div className="relative p-5 rounded-2xl overflow-hidden" style={{ background: "oklch(0.74 0.14 72 / 0.05)", border: "1px solid oklch(0.74 0.14 72 / 0.18)" }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground mb-1">Stay in rhythm with reminders</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
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
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
    </>
  );
}