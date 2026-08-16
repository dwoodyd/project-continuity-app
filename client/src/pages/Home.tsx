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
  Plus,
  MessageCircle,
  FolderPlus,
  Pause,
  Heart,
  ToggleLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
  CalendarClock,
  Mic,
  Eye,
  EyeOff,
  GripVertical,
  SlidersHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import notify from "@/lib/notify";
import IdeaSanctuaryModal from "@/components/IdeaSanctuaryModal";
import UnstickModal from "@/components/UnstickModal";
import { VoiceDictationButton } from "@/components/VoiceDictationButton";
import { FirstMovableStepModal } from "@/components/FirstMovableStepModal";
import { ThresholdDiagnosisFlow } from "@/components/ThresholdDiagnosisFlow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { CrisisSupportCard } from "@/components/CrisisSupportCard";
import { useCrisisCheck } from "@/hooks/useCrisisCheck";
import { BentoCard } from "@/components/BentoCard";
import { useTransitionSound } from "@/hooks/useTransitionSound";
import { PageMeta } from "@/components/PageMeta";
import {
  DASHBOARD_MODULES,
  normalizeDashboardLayout,
  presentationOrder,
  type DashboardModuleKey,
} from "@/lib/dashboardModules";

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
  onUncomplete,
  onUnstick,
  onEdit,
  onRemove,
  onPushToTomorrow,
  isCarryover = false,
  pendingUndo = false,
}: {
  task: any;
  onComplete: (id: string, title: string) => void;
  onUncomplete: (id: string) => void;
  onUnstick: (t: { id: string; title: string; projectId?: number | null }) => void;
  onEdit: (id: string, currentTitle: string) => void;
  onRemove: (id: string) => void;
  onPushToTomorrow: (id: string) => void;
  isCarryover?: boolean;
  pendingUndo?: boolean;
}) {
  // Swipe-right state (kept as secondary affordance)
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
    if (swipeOffset >= SWIPE_THRESHOLD) onComplete(task.id, task.title);
    setSwipeOffset(0);
    swipeStart.current = null;
  };

  const handleCircleClick = () => {
    if (task.done) {
      onUncomplete(task.id);
    } else {
      onComplete(task.id, task.title);
    }
  };

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 group overflow-hidden",
        task.done
          ? pendingUndo
            ? "bg-amber-50/30 dark:bg-amber-900/10 border-amber-300/40 dark:border-amber-700/40 opacity-60"
            : "bg-foreground/[0.02] border-border/40 opacity-50"
          : isCarryover
            ? "bg-amber-50/40 dark:bg-amber-900/10 border-amber-200/80 dark:border-amber-800/40"
            : "bg-card border-border hover:border-foreground/20"
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
      {/* Tap-to-complete circle — primary affordance */}
      <button
        onClick={handleCircleClick}
        className={cn(
          "shrink-0 w-5 h-5 rounded-full border-2 transition-all duration-150 flex items-center justify-center",
          task.done
            ? pendingUndo
              ? "bg-amber-400/20 border-amber-400/60"
              : "bg-emerald-500 border-emerald-500"
            : "border-foreground/30 hover:border-emerald-500 hover:bg-emerald-500/10 active:scale-90"
        )}
        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
        title={task.done ? "Tap to un-complete" : "Tap to complete"}
      >
        {task.done && !pendingUndo && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
        {task.done && pendingUndo && <RotateCcw className="w-2.5 h-2.5 text-amber-500" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm leading-snug tracking-[-0.005em]",
          task.done && "line-through text-muted-foreground/60"
        )}>
          {task.title}
        </p>
        {(isCarryover || task.carryoverCount > 0) && !task.done && (
          <span className="text-xs text-amber-600 dark:text-amber-400/70">still waiting</span>
        )}
      </div>
      {/* Context menu — edit / push to tomorrow / remove */}
      {!task.done && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-foreground/5 shrink-0"
              aria-label="Task options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onEdit(task.id, task.title)}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUnstick({ id: task.id, title: task.title, projectId: task.projectId })}>
              <AlertTriangle className="w-3.5 h-3.5 mr-2" /> Get unstuck
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onPushToTomorrow(task.id)}>
              <CalendarClock className="w-3.5 h-3.5 mr-2" /> Push to tomorrow
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onRemove(task.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {task.done && pendingUndo && (
        <button
          onClick={() => onUncomplete(task.id)}
          className="text-xs text-amber-500 hover:text-amber-400 shrink-0"
          title="Undo"
        >
          undo
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

function MorningCheckIn({ onComplete, localDate: localDateProp }: { onComplete: () => void; localDate?: string }) {
  const [capacity, setCapacity] = useState<CapacityLevel>("partial");
  const [notes, setNotes] = useState("");
  const [primaryId, setPrimaryId] = useState<number | undefined>();
  const [emotionalState, setEmotionalState] = useState<EmotionalState | undefined>();
  const [mentalLoad, setMentalLoad] = useState<MentalLoad | undefined>();
  const [workLocation, setWorkLocation] = useState<WorkLocation | undefined>();
  const [, navigate] = useLocation();
  const { crisisLevel: morningCrisisLevel, checkAndMaybeFlag: checkMorningCrisis, dismissCrisis: dismissMorningCrisis } = useCrisisCheck("check_in_morning");
  const { data: projects } = trpc.projects.listActive.useQuery();
  const submit = trpc.checkIns.submitMorning.useMutation({
    onSuccess: (data) => {
      notify.saved("Your day is set.", { description: "Wren's watching your back." });
      if (notes.trim()) void checkMorningCrisis(notes);
      // If clarity mode was suggested and state is anxious/foggy/drained, offer nudge
      if (data.clarityModeSuggestion) {
        setTimeout(() => {
          notify.info(
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
    onError: () => notify.error("Didn't save — try once more."),
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
        onClick={() => {
          const d = new Date();
          const computedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const localDate = localDateProp ?? computedDate;
          submit.mutate({ capacityLevel: capacity, primaryProjectId: primaryId, userNotes: notes || undefined, emotionalState, mentalLoad, workLocation, localDate });
        }}
        disabled={submit.isPending}
        className="w-full bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25"
        size="sm"
      >
        {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
      Set today's plan
    </Button>
    {morningCrisisLevel && (
      <CrisisSupportCard level={morningCrisisLevel} onDismiss={dismissMorningCrisis} className="mt-2" />
    )}
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
      notify.saved(data.response ?? "Midday check-in noted.");
      onComplete();
    },
    onError: () => notify.error("Didn't save — try once more."),
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
            notify.error("Two things needed — what moved, and was it on plan.");
            return;
          }
          // Fire-and-forget distraction classification if interruptions were noted
          if (interruptions.trim()) {
            classifyDistraction.mutate({ rawInput: interruptions, checkInType: "midday" });
          }
          const d2 = new Date();
          const localDate2 = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`;
          submit.mutate({ workedOn, wasOnPlan, interruptions: interruptions || undefined, nextMove: nextMove || undefined, energyLevel, hungerLevel, localDate: localDate2 });
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

// ─── Wren Handoff Card ────────────────────────────────────────────────────────
// Shows the user's verbatim evening plan as an invitation, not a command.
// Tasks are checkable (local optimistic state) and display energy/time metadata.
// Also allows adding new tasks that go straight into tomorrow's plan.
function WrenHandoffCard({ tasks: initialTasks, localDate }: { tasks: Array<{ id?: string; title: string; energyLevel?: string; estimatedMinutes?: number; notes?: string }>; localDate?: string }) {
  const [checkedIds, setCheckedIds] = React.useState<Set<string>>(new Set());
  const [localTasks, setLocalTasks] = React.useState(initialTasks);
  const [addingTask, setAddingTask] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState("");
  const editTomorrowTask = trpc.dailyPlan.editTomorrowTask.useMutation({
    onSuccess: () => notify.saved("Updated."),
    onError: () => notify.error("Couldn't save — try again."),
  });
  const handleEditStart = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
  };
  const handleEditSave = (id: string) => {
    const title = editingTitle.trim();
    if (title && id) {
      editTomorrowTask.mutate({ taskId: id, title, ...(localDate ? { localDate } : {}) });
      setLocalTasks(prev => prev.map((t, i) => (t.id ?? `handoff-${i}`) === id ? { ...t, title } : t));
    }
    setEditingId(null);
    setEditingTitle("");
  };
  const addTomorrowTask = trpc.dailyPlan.addTomorrowTask.useMutation({
    onSuccess: (data) => {
      if (data.success && data.task) {
        setLocalTasks(prev => [...prev, data.task as { id?: string; title: string }]);
        notify.saved("Added for tomorrow.", { description: "It'll be waiting in your handoff." });
      }
    },
    onError: () => notify.error("Couldn't add — try again."),
  });
  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title) { setAddingTask(false); return; }
    addTomorrowTask.mutate({ title, ...(localDate ? { localDate } : {}) });
    setNewTitle("");
    setAddingTask(false);
  };
  const toggle = (id: string) => setCheckedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allDone = localTasks.length > 0 && checkedIds.size >= localTasks.length;
  return (
    <div className="p-4 rounded-xl border break-inside-avoid mb-3" style={{ background: "var(--card)", borderColor: "oklch(0.74 0.14 72 / 0.20)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Moon className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(0.74 0.14 72 / 0.70)" }} />
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.74 0.14 72 / 0.70)" }}>Here's what you set up last night</p>
        <button
          onClick={() => setAddingTask(true)}
          className="ml-auto flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-foreground/70 transition-colors"
          title="Add to tomorrow"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>
      <ul className="space-y-2">
        {localTasks.map((task, i) => {
          const id = task.id ?? `handoff-${i}`;
          const done = checkedIds.has(id);
          return (
            <li key={id} className="flex items-start gap-2.5 group/htask">
              {editingId !== id && (
                <button
                  onClick={() => toggle(id)}
                  className="mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                  style={done
                    ? { background: "oklch(0.74 0.14 72 / 0.25)", borderColor: "oklch(0.74 0.14 72 / 0.60)" }
                    : { borderColor: "oklch(1 0 0 / 0.22)" }
                  }
                  aria-label={done ? "Mark incomplete" : "Mark complete"}
                >
                  {done && <CheckCircle2 className="w-3 h-3" style={{ color: "oklch(0.74 0.14 72)" }} />}
                </button>
              )}
              {editingId === id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEditSave(id);
                      if (e.key === "Escape") { setEditingId(null); setEditingTitle(""); }
                    }}
                    onBlur={() => handleEditSave(id)}
                    className="flex-1 min-w-0 bg-transparent text-sm outline-none text-foreground border-b border-foreground/20 pb-0.5"
                    maxLength={300}
                  />
                  <button onClick={() => handleEditSave(id)} className="text-xs font-medium text-primary shrink-0">Save</button>
                  <button onClick={() => { setEditingId(null); setEditingTitle(""); }} className="text-xs text-muted-foreground/50 shrink-0">Cancel</button>
                </div>
              ) : (
                <div className="flex-1 min-w-0 flex items-start gap-1">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug transition-opacity ${done ? "line-through opacity-40" : "text-foreground"}`}>{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {task.energyLevel && task.energyLevel !== 'any' && (
                        <span className={`text-xs font-medium ${
                          task.energyLevel === 'high' ? 'text-amber-500' : 'text-amber-400/70'
                        }`}>
                          {task.energyLevel === 'high' ? '⚡ high energy' : '🌙 low energy'}
                        </span>
                      )}
                      {task.estimatedMinutes && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground/50">
                          <Clock className="w-2.5 h-2.5" />{task.estimatedMinutes}m
                        </span>
                      )}
                      {task.notes && (
                        <span className="text-xs text-muted-foreground/50 italic truncate max-w-[160px]">{task.notes}</span>
                      )}
                    </div>
                  </div>
                  {!done && (
                    <button
                      onClick={() => handleEditStart(id, task.title)}
                      className="opacity-0 group-hover/htask:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground/40 hover:text-foreground/60 shrink-0 mt-0.5"
                      aria-label="Edit task"
                      title="Edit"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {/* Inline add input */}
      {addingTask && (
        <div className="mt-3 flex items-center gap-2">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setAddingTask(false); setNewTitle(""); }
            }}
            placeholder="Add to tomorrow…"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground/40 border-b border-foreground/15 pb-0.5"
            maxLength={300}
          />
          <button
            onClick={handleAdd}
            disabled={addTomorrowTask.isPending}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
          >
            Add →
          </button>
          <button
            onClick={() => { setAddingTask(false); setNewTitle(""); }}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors shrink-0"
          >
            Cancel
          </button>
        </div>
      )}
      {/* Empty state */}
      {localTasks.length === 0 && !addingTask && (
        <button
          onClick={() => setAddingTask(true)}
          className="w-full mt-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed text-muted-foreground/40 hover:text-muted-foreground/70 hover:border-foreground/20 transition-colors text-sm"
          style={{ borderColor: "oklch(0.74 0.14 72 / 0.15)" }}
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>Add something for tomorrow</span>
        </button>
      )}
      {allDone && (
        <p className="text-xs mt-3 text-center" style={{ color: "oklch(0.74 0.14 72 / 0.60)" }}>All noted. Start your morning check-in when ready.</p>
      )}
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
  const { crisisLevel: eveningCrisisLevel, checkAndMaybeFlag: checkEveningCrisis, dismissCrisis: dismissEveningCrisis } = useCrisisCheck("check_in_evening");
  const saveTomorrowPlan = trpc.dailyPlan.saveTomorrowPlan.useMutation();
  const submit = trpc.checkIns.submitEvening.useMutation({
    onSuccess: () => {
      notify.saved("Day closed.", { description: "Tomorrow's brief is ready when you are." });
      const combined = [whatMoved, whatRemains, whatLearned].filter(Boolean).join(" ");
      if (combined.trim()) void checkEveningCrisis(combined);
      onComplete();
    },
    onError: () => notify.error("Didn't save — try once more."),
  });
  const saveDecision = trpc.intelligence.saveDecision.useMutation();
  const extractDecisions = trpc.intelligence.extractDecisionsFromNotes.useMutation();
  const classifyDistraction = trpc.intelligence.classifyAndSaveDistraction.useMutation();
  const handleSubmit = async () => {
    if (!whatMoved.trim() || !tomorrowFirst.trim()) {
      notify.error("Two things needed — what moved, and what goes first tomorrow.");
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
    // Persist tomorrow's task list alongside the evening closure.
    // Always include tomorrowFirst as the priority (first) task — verbatim, no AI rewriting.
    // If the user also filled in TomorrowPlanSection tasks, merge them after.
    const firstTask = {
      id: `tomorrow-first-${Date.now()}`,
      title: tomorrowFirst.trim(),
      energyLevel: "any" as const,
      estimatedMinutes: undefined,
      notes: undefined,
      projectId: undefined,
    };
    const allTomorrowTasks = [
      firstTask,
      ...tomorrowTasks.filter((t) => t.title.trim().toLowerCase() !== tomorrowFirst.trim().toLowerCase()),
    ];
    const dEve = new Date();
    const localDateEve = `${dEve.getFullYear()}-${String(dEve.getMonth() + 1).padStart(2, '0')}-${String(dEve.getDate()).padStart(2, '0')}`;
    saveTomorrowPlan.mutate({ tasks: allTomorrowTasks, localDate: localDateEve });
    submit.mutate({ whatMoved, whatRemains, whatLearned, tomorrowFirst, localDate: localDateEve });
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
    {eveningCrisisLevel && (
      <CrisisSupportCard level={eveningCrisisLevel} onDismiss={dismissEveningCrisis} className="mt-2" />
    )}
  </div>
  );
}

// ─── Mood Widget ────────────────────────────────────────────────────────────
function MoodWidget() {
  const localDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const todayQuery = trpc.moodLogs.getToday.useQuery({ localDate: localDateStr });
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
        {/* Grid repeat(10,1fr) so squares always fill the card width — no fixed px */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4, width: "100%" }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onMouseEnter={() => setHoverScore(n)}
              onMouseLeave={() => setHoverScore(null)}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); logMutation.mutate({ score: n }); }}
              style={{
                height: 24, borderRadius: 4,
                background: (hoverScore !== null ? n <= hoverScore : today && n <= today.score)
                  ? phaseColor(hoverScore ?? today?.score ?? n)
                  : "rgba(255,255,255,0.07)",
                border: "none", cursor: "pointer", transition: "background 0.1s",
                minWidth: 0,
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
      notify.error("Couldn't build your re-entry card — try again.");
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
  const _phd = new Date(); const _todayStr = `${_phd.getFullYear()}-${String(_phd.getMonth()+1).padStart(2,"0")}-${String(_phd.getDate()).padStart(2,"0")}`; const showPhBanner = !phBannerDismissed && !!phLaunchDate && _todayStr === phLaunchDate;
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
  // Evening Close review modal
  const [showEveningReview, setShowEveningReview] = useState(false);
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
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [optInExpanded, setOptInExpanded] = useState(false);
  const [draggedModule, setDraggedModule] = useState<DashboardModuleKey | null>(null);
  const [justOneThingOpen, setJustOneThingOpen] = useState(false);
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
        notify.saved("Reminders on.", { description: "Wren will check in at the right moments." });
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
  // Pass the client's local YYYY-MM-DD so the server uses the user's actual calendar day,
  // not UTC (which can differ by up to ±14h from the user's local midnight).
  const localDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const { data: todayPlan, isLoading: planLoading, refetch: refetchPlan } = trpc.dailyPlan.getToday.useQuery(
    { localDate: localDateStr },
    { enabled: authed }
  );
  const { data: todayCheckIns, refetch: refetchCheckIns } = trpc.checkIns.getToday.useQuery(
    { localDate: localDateStr },
    { enabled: authed }
  );
  const { data: activeProjects } = trpc.projects.listActive.useQuery(undefined, { enabled: authed });
  const { data: pausedProjects } = trpc.projects.listPaused.useQuery(undefined, { enabled: authed });
  const { data: streakData } = trpc.checkIns.getStreak.useQuery(undefined, {
    enabled: authed,
    staleTime: 5 * 60 * 1000,
  });
  const utils = trpc.useUtils();
  const { data: profile } = trpc.settings.getProfile.useQuery(undefined, { enabled: authed });
  const { data: dashboardLayoutData } = trpc.settings.getDashboardLayout.useQuery(undefined, {
    enabled: authed,
    staleTime: 5 * 60 * 1000,
  });
  const dashboardLayout = useMemo(() => normalizeDashboardLayout(dashboardLayoutData), [dashboardLayoutData]);
  const updateDashboardLayout = trpc.settings.updateDashboardLayout.useMutation({
    onSuccess: () => utils.settings.getDashboardLayout.invalidate(),
    onError: () => notify.error("Dashboard preferences could not be saved. Please try again."),
  });
  const isModuleVisible = useCallback(
    (key: DashboardModuleKey) => !dashboardLayout.hidden.includes(key),
    [dashboardLayout.hidden],
  );
  const persistDashboardLayout = useCallback(
    (next: { hidden: DashboardModuleKey[]; order: DashboardModuleKey[] }) => {
      updateDashboardLayout.mutate(next);
    },
    [updateDashboardLayout],
  );
  const toggleDashboardModule = useCallback(
    (key: DashboardModuleKey) => {
      const hidden = dashboardLayout.hidden.includes(key)
        ? dashboardLayout.hidden.filter((item) => item !== key)
        : [...dashboardLayout.hidden, key];
      persistDashboardLayout({ hidden, order: dashboardLayout.order });
    },
    [dashboardLayout, persistDashboardLayout],
  );
  const reorderDashboardModule = useCallback(
    (from: DashboardModuleKey, to: DashboardModuleKey) => {
      const order = [...dashboardLayout.order];
      const fromIndex = order.indexOf(from);
      const toIndex = order.indexOf(to);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
      order.splice(fromIndex, 1);
      order.splice(toIndex, 0, from);
      persistDashboardLayout({ hidden: dashboardLayout.hidden, order });
    },
    [dashboardLayout, persistDashboardLayout],
  );

  // ── Deferred queries (fire only after critical path resolves) ─────────────────
  // These are secondary data that don't block the initial render.
  const criticalReady = authed && !planLoading;
  const [optionalModulesReady, setOptionalModulesReady] = useState(false);
  useEffect(() => {
    if (!criticalReady) { setOptionalModulesReady(false); return; }
    const timer = window.setTimeout(() => setOptionalModulesReady(true), 500);
    return () => window.clearTimeout(timer);
  }, [criticalReady]);
  const deferredReady = criticalReady && optionalModulesReady;
  const { data: tomorrowBrief } = trpc.dailyPlan.getTomorrowBrief.useQuery({ localDate: localDateStr }, { enabled: deferredReady });
  const { data: tomorrowPlanTasks } = trpc.dailyPlan.getTomorrowPlan.useQuery({ localDate: localDateStr }, { enabled: deferredReady });
  const { data: lastEveningClose } = trpc.checkIns.getLastEveningClose.useQuery(undefined, { enabled: deferredReady, staleTime: 60_000 });
  const { data: weeklyPresence } = trpc.checkIns.weeklyPresence.useQuery(undefined, { enabled: deferredReady });
  const { data: evidenceMonth } = trpc.evidence.getCurrentMonth.useQuery(undefined, { enabled: deferredReady });
  const { data: pendingIdeas } = trpc.ai.listIdeas.useQuery(undefined, { enabled: deferredReady });
  const { data: activeThreadLock } = trpc.threadLock.getActive.useQuery(undefined, {
    enabled: authed,
    staleTime: 60_000,
    refetchOnWindowFocus: true, // re-check when user returns to the tab
  });
  const { data: recentDecisions } = trpc.intelligence.getRecentDecisions.useQuery(undefined, { enabled: deferredReady });
  const { data: scratchNotes } = trpc.scratchPad.list.useQuery(undefined, { enabled: deferredReady, staleTime: 60_000 });
  const { data: focusArtifact } = trpc.focusSessions.getArtifact.useQuery(undefined, { enabled: deferredReady, staleTime: 5 * 60 * 1000 });
  const { data: focusTodayStats } = trpc.focusSessions.getTodayStats.useQuery(undefined, { enabled: deferredReady, staleTime: 5 * 60 * 1000 });
  const { data: healthScores } = trpc.insights.getHealthScores.useQuery(undefined, { enabled: deferredReady });
  const { data: clarityRec } = trpc.clarity.getModeRecommendation.useQuery(undefined, {
    enabled: deferredReady,
    staleTime: 30 * 60 * 1000,
  });
  // Reading Bridge first-time prompt
  const { data: rbData } = trpc.readingBridge.get.useQuery(undefined, { enabled: deferredReady, staleTime: 10 * 60 * 1000 });
  const setRbChapter = trpc.readingBridge.set.useMutation();
  const [rbPromptDismissed, setRbPromptDismissed] = useState(() => localStorage.getItem("rb_prompt_dismissed") === "1");
  const showRbPrompt = !rbPromptDismissed &&
    !!rbData &&
    !rbData.chapter &&
    !rbData.finished &&
    !rbData.dismissed &&
    (focusTodayStats?.lifetimeSessions ?? 0) >= 3;
  const dismissRbPrompt = (notReading = false) => {
    setRbPromptDismissed(true);
    localStorage.setItem("rb_prompt_dismissed", "1");
    if (notReading) {
      setRbChapter.mutate({ dismissed: true });
    }
  };

  // Thread Lock — recall and dismiss mutations
  const recallThreadLock = trpc.threadLock.recall.useMutation({
    onSuccess: (_, vars) => {
      utils.threadLock.getActive.invalidate();
      // Navigate to the project if one was attached
      if (activeThreadLock?.projectId) navigate(`/projects/${activeThreadLock.projectId}`);
    },
  });
  const dismissThreadLock = trpc.threadLock.dismiss.useMutation({
    onSuccess: () => utils.threadLock.getActive.invalidate(),
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
  // Optimistic done overrides — applied immediately on click, cleared when server data arrives
  const [optimisticDone, setOptimisticDone] = useState<Record<string, boolean>>({}); 

  const completeTaskMutation = trpc.checkIns.completeTask.useMutation({
    onSuccess: (_data, variables) => {
      // Server data is now authoritative — clear the optimistic override for this task
      setOptimisticDone((prev) => { const n = { ...prev }; delete n[variables.taskId]; return n; });
      refetchPlan(); refetchGam();
    },
  });
  const uncompleteTaskMutation = trpc.checkIns.uncompleteTask.useMutation({
    onSuccess: (_data, variables) => {
      setOptimisticDone((prev) => { const n = { ...prev }; delete n[variables.taskId]; return n; });
      refetchPlan();
    },
  });
  const addTaskMutation = trpc.checkIns.addTask.useMutation({
    onSuccess: () => refetchPlan(),
  });
  const editTaskMutation = trpc.checkIns.editTask.useMutation({
    onSuccess: () => refetchPlan(),
  });
  const removeTaskMutation = trpc.checkIns.removeTask.useMutation({
    onSuccess: () => refetchPlan(),
  });
  const pushToTomorrowMutation = trpc.checkIns.pushTaskToTomorrow.useMutation({
    onSuccess: () => { refetchPlan(); notify.saved("Moved to tomorrow.", { description: "It'll be there when you're ready." }); },
  });

  // Inline edit state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  // On mobile, autoFocus is blocked by browser policy unless triggered by a direct
  // user gesture. Use a ref + rAF to programmatically focus after the element mounts.
  useEffect(() => {
    if (addingTask) {
      const raf = requestAnimationFrame(() => { newTaskInputRef.current?.focus(); });
      return () => cancelAnimationFrame(raf);
    }
  }, [addingTask]);

  // Wrap completeTask with a 5-second undo window
  const completeTask = useCallback((taskId: string, taskTitle: string) => {
    haptic(60); // tactile confirmation
    dismissHoldHint(); // hide first-use hint after first completion
    // Optimistically flip the circle immediately — no waiting for server
    setOptimisticDone((prev) => ({ ...prev, [taskId]: true }));
    completeTaskMutation.mutate({ taskId, taskTitle, date: localDateStr });
    // Mark as pending-undo
    setPendingUndoTaskIds((prev) => new Set(Array.from(prev).concat(taskId)));
    // Show undo toast
    notify.info("Done ✓", {
      description: taskTitle.length > 50 ? taskTitle.slice(0, 50) + "…" : taskTitle,
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(undoTimers.current[taskId]);
          delete undoTimers.current[taskId];
          setPendingUndoTaskIds((prev) => { const s = new Set(prev); s.delete(taskId); return s; });
          uncompleteTaskMutation.mutate({ taskId, date: localDateStr });
        },
      },
    });
    // Auto-clear pending-undo state after 5.5s (slightly after toast expires)
    undoTimers.current[taskId] = setTimeout(() => {
      setPendingUndoTaskIds((prev) => { const s = new Set(prev); s.delete(taskId); return s; });
      delete undoTimers.current[taskId];
    }, 5500);
  }, [completeTaskMutation, uncompleteTaskMutation, localDateStr]);

  const uncompleteTask = useCallback((taskId: string) => {
    clearTimeout(undoTimers.current[taskId]);
    delete undoTimers.current[taskId];
    setPendingUndoTaskIds((prev) => { const s = new Set(prev); s.delete(taskId); return s; });
    // Optimistically flip back immediately
    setOptimisticDone((prev) => { const n = { ...prev }; delete n[taskId]; return n; });
    uncompleteTaskMutation.mutate({ taskId, date: localDateStr });
  }, [uncompleteTaskMutation, localDateStr]);

  const handleAddTask = useCallback(() => {
    const title = newTaskTitle.trim();
    if (!title) { setAddingTask(false); return; }
    addTaskMutation.mutate({ title, localDate: localDateStr });
    setNewTaskTitle("");
    setAddingTask(false);
  }, [addTaskMutation, newTaskTitle, localDateStr]);

  const handleEditTask = useCallback((id: string, currentTitle: string) => {
    setEditingTaskId(id);
    setEditingTaskTitle(currentTitle);
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editingTaskId) return;
    const title = editingTaskTitle.trim();
    if (title) editTaskMutation.mutate({ taskId: editingTaskId, title, localDate: localDateStr });
    setEditingTaskId(null);
    setEditingTaskTitle("");
  }, [editTaskMutation, editingTaskId, editingTaskTitle, localDateStr]);

  const handleRemoveTask = useCallback((id: string) => {
    removeTaskMutation.mutate({ taskId: id, localDate: localDateStr });
  }, [removeTaskMutation, localDateStr]);

  const handlePushToTomorrow = useCallback((id: string) => {
    pushToTomorrowMutation.mutate({ taskId: id, localDate: localDateStr });
  }, [pushToTomorrowMutation, localDateStr]);

  const tasks: any[] = useMemo(() => {
    if (!todayPlan?.criticalTasks) return [];
    try {
      const parsed: any[] = JSON.parse(todayPlan.criticalTasks);
      // Apply optimistic done overrides so the circle flips on first click
      return parsed.map((t) =>
        t.id in optimisticDone ? { ...t, done: optimisticDone[t.id] } : t
      );
    } catch { return []; }
  }, [todayPlan?.criticalTasks, optimisticDone]);

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

  // Derive completion state from server data (today's local date check-ins).
  // completedCheckIns is only used as an optimistic fallback WHILE the refetch is in-flight
  // (i.e., todayCheckIns is still undefined/stale). Once the server responds, server data wins.
  // This prevents yesterday's in-memory state from persisting into a new day.
  // Gate on completedAt != null, NOT row existence — a row with completedAt=null is a draft/reset
  const morningDone = todayCheckIns != null
    ? todayCheckIns.some((c) => c.type === "morning" && c.completedAt != null)
    : completedCheckIns.has("morning");
  const middayDone = todayCheckIns != null
    ? todayCheckIns.some((c) => c.type === "midday" && c.completedAt != null)
    : completedCheckIns.has("midday");
  const eveningDone = todayCheckIns != null
    ? todayCheckIns.some((c) => c.type === "evening" && c.completedAt != null)
    : completedCheckIns.has("evening");

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
        notify.info(
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
  // Capacity-based task limits apply only to AI-generated tasks.
  // User-added tasks (isUserAdded: true) are always visible regardless of capacity.
  const taskLimit = capacityLevel === "full" ? 3 : capacityLevel === "partial" ? 2 : 1;
  const visibleTasks = useMemo(() => {
    const userAdded = tasks.filter((t: any) => t.isUserAdded);
    const aiGenerated = tasks.filter((t: any) => !t.isUserAdded);
    const visibleAi = aiGenerated.slice(0, Math.max(0, taskLimit - userAdded.length));
    // Preserve original order: interleave by original index
    return tasks.filter((t: any) => t.isUserAdded || visibleAi.some((a: any) => a.id === t.id));
  }, [tasks, taskLimit]);
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

  type AlertType = "thread_lock" | "check_in_due" | "capacity_low" | "capacity_partial" | "blocker" | "spiral_offer" | "weekly_review" | "tomorrow_brief" | "sanctuary_nudge" | null;
  const topAlert: AlertType = (() => {
    if (activeThreadLock) return "thread_lock";
    if (!morningDone) return "check_in_due";
    if (todayPlan && capacityLevel === "low") return "capacity_low";
    if (todayPlan && capacityLevel === "partial") return "capacity_partial";
    if (hasBlockedProject) return "blocker";
    if (spiralCheck?.offer && !groundModeActive && !groundModeCrisisBreak) return "spiral_offer";
    if (weeklyReviewDue && morningDone) return "weekly_review";
    if (tomorrowBrief && !morningDone) return "tomorrow_brief";
    if (pendingIdeaCount > 3) return "sanctuary_nudge";
    return null;
  })();

  const justOneThing = (() => {
    if (activeThreadLock) {
      return {
        label: "Pick up your thread",
        detail: activeThreadLock.whatNext || activeThreadLock.whatDoing,
        run: () => recallThreadLock.mutate({ id: activeThreadLock.id }),
      };
    }
    const nextTask = visibleTasks.find((task: any) => !task.done);
    if (nextTask) {
      return {
        label: nextTask.title,
        detail: "One step is enough. Everything else can wait.",
        run: () => completeTask(nextTask.id, nextTask.title),
      };
    }
    const nextCheckIn: CheckInStep | null = !morningDone ? "morning" : !middayDone ? "midday" : !eveningDone ? "evening" : null;
    if (nextCheckIn) {
      const label = nextCheckIn === "morning" ? "Start your morning check-in" : nextCheckIn === "midday" ? "Take a midday pulse" : "Close the day gently";
      return {
        label,
        detail: "You only need to answer the next question.",
        run: () => setActiveCheckIn(nextCheckIn),
      };
    }
    return {
      label: "Capture what is on your mind",
      detail: "No sorting needed yet. Just put it somewhere safe.",
      run: () => navigate("/capture"),
    };
  })();

  const enterJustOneThing = () => {
    if (isPlanningMode) updateSettings.mutate({ planningMode: false });
    if (topAlert === "spiral_offer" && !groundModeActive) enterGroundMode("contextual_offer");
    setJustOneThingOpen(true);
  };

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

  if (justOneThingOpen) {
    return (
      <main className="min-h-[70vh] px-4 py-10 sm:px-6 flex items-center justify-center">
        <section className="w-full max-w-lg rounded-2xl border border-primary/25 bg-card p-6 sm:p-8 text-center card-shadow" aria-labelledby="just-one-title">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Just one thing</p>
          <h1 id="just-one-title" className="mt-3 font-brand text-2xl font-semibold text-foreground">One step. Nothing else right now.</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{justOneThing.detail}</p>
          <button
            onClick={justOneThing.run}
            className="mt-7 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {justOneThing.label}
          </button>
          {groundModeActive && (
            <p className="mt-4 text-xs text-muted-foreground">Ground Mode is active: facts, one action, no extra framing.</p>
          )}
          <button
            onClick={() => setJustOneThingOpen(false)}
            className="mt-5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Back to the full dashboard
          </button>
        </section>
      </main>
    );
  }

  return (
    <>
    <PageMeta title="Today · Continuary" description="Your calm daily rhythm, next action, and project continuity space." path="/" />
    {showWrenIntro && (
      <WrenIntroMoment onDone={() => {
        setShowWrenIntro(false);
        if (sessionStorage.getItem("startWithOneThing") === "1") {
          sessionStorage.removeItem("startWithOneThing");
          setJustOneThingOpen(true);
        }
      }} />
    )}
    <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customize your dashboard</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Keep the parts that help. Hide what feels like too much. Drag modules into the order that makes sense for you.
        </p>
        <div className="space-y-2 pt-2" aria-label="Dashboard module preferences">
          {dashboardLayout.order.map((key) => {
            const module = DASHBOARD_MODULES.find((item) => item.key === key);
            if (!module) return null;
            const visible = isModuleVisible(key);
            return (
              <div
                key={key}
                draggable
                onDragStart={() => setDraggedModule(key)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedModule) reorderDashboardModule(draggedModule, key);
                  setDraggedModule(null);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5",
                  draggedModule === key && "opacity-50",
                )}
              >
                <GripVertical className="w-4 h-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                <span className="flex-1 text-sm text-foreground">{module.label}</span>
                <button
                  type="button"
                  onClick={() => toggleDashboardModule(key)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  role="switch"
                  aria-checked={visible}
                  aria-label={`${visible ? "Hide" : "Show"} ${module.label} on dashboard`}
                >
                  {visible ? <Eye className="w-3.5 h-3.5" aria-hidden="true" /> : <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />}
                  {visible ? "Shown" : "Hidden"}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Changes save automatically to your account.</p>
      </DialogContent>
    </Dialog>
    <div className="px-4 sm:px-5 py-7 page-enter max-w-4xl mx-auto flex flex-col gap-7 overflow-x-hidden">
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
      <div className="flex items-start justify-between" style={{ order: -10 }}>
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
        {/* Header right cluster — flex-wrap so chips never overflow on narrow screens */}
        <div className="flex items-center gap-2 flex-wrap justify-end min-w-0">
          {/* Manual Ground Mode entry */}
          {!groundModeActive && (
            <button
              onClick={() => enterGroundMode("manual")}
              title="Enter Ground Mode — facts only, no warmth"
              aria-label="Enter Ground Mode — facts only, no warmth"
              className="p-1.5 rounded-lg transition-colors shrink-0"
              style={{ color: "oklch(0.45 0.04 240 / 0.70)", border: "1px solid oklch(0.35 0.04 240 / 0.30)" }}
            >
              <Anchor className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            onClick={() => setCustomizeOpen(true)}
            className="p-1.5 rounded-lg transition-colors shrink-0 text-muted-foreground hover:text-foreground hover:bg-foreground/5"
            aria-label="Customize dashboard modules"
            title="Customize dashboard"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          {pendingIdeaCount > 0 && (
            <button
              onClick={() => navigate("/settings?tab=ideas")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors shrink-0"
              title="Ideas waiting to be processed"
            >
              <Lightbulb className="w-3 h-3" />
              {pendingIdeaCount}
            </button>
          )}
          {todayPlan && (
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border shrink-0 min-w-0",
              capacityConfig[capacityLevel].bg,
              capacityConfig[capacityLevel].color
            )}>
              {(() => {
                const cfg = capacityConfig[capacityLevel];
                const Icon = cfg.icon;
                return <Icon className="w-3.5 h-3.5 shrink-0" />;
              })()}
              {/* Collapse label to icon-only below 380px */}
              <span className="hidden xs:inline truncate max-w-[80px]">{capacityConfig[capacityLevel].label}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Primary Action: one context-aware next move ───────────────────── */}
      <div className="flex items-center gap-2" style={{ order: -9 }}>
        <button
          onClick={() => {
            if (topAlert === "thread_lock" && activeThreadLock) {
              recallThreadLock.mutate({ id: activeThreadLock.id });
              return;
            }
            const target = !morningDone ? "morning" : !middayDone ? "midday" : "evening";
            openCheckIn(target);
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: "oklch(0.74 0.14 72 / 0.12)", color: "oklch(0.74 0.14 72)", border: "1px solid oklch(0.74 0.14 72 / 0.22)" }}
        >
          {topAlert === "thread_lock" ? <Anchor className="w-3.5 h-3.5" aria-hidden="true" /> : <Sun className="w-3.5 h-3.5" aria-hidden="true" />}
          {topAlert === "thread_lock" ? "Pick up your thread" : !morningDone ? "Start morning check-in" : !middayDone ? "Start midday pulse" : "Start evening close"}
        </button>
        <button
          onClick={enterJustOneThing}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          Need just one thing?
        </button>
      </div>

      {/* ── Primary Alert (single, priority-resolved) ────────────────────── */}
      {topAlert === "thread_lock" && activeThreadLock && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: "oklch(0.12 0.04 72 / 0.5)", borderColor: "oklch(0.74 0.14 72 / 0.30)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-3.5 pb-2">
            <Anchor className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.74 0.14 72)" }} />
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.74 0.14 72)" }}>You left a thread</p>
            <span className="ml-auto text-[10px]" style={{ color: "oklch(0.45 0.04 240)" }}>
              {(() => {
                const diffMin = Math.round((Date.now() - activeThreadLock.createdAt) / 60_000);
                return diffMin < 60 ? `${diffMin}m ago` : `${Math.round(diffMin / 60)}h ago`;
              })()}
            </span>
          </div>
          {/* Body */}
          <div className="px-4 pb-3 space-y-1.5">
            <p className="text-sm leading-snug" style={{ color: "oklch(0.88 0.03 60)" }}>
              {activeThreadLock.whatDoing}
            </p>
            <p className="text-xs leading-snug" style={{ color: "oklch(0.60 0.04 240)" }}>
              Next: {activeThreadLock.whatNext}
            </p>
          </div>
          {/* Actions */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-t"
            style={{ borderColor: "oklch(0.74 0.14 72 / 0.15)" }}
          >
            <button
              onClick={() => recallThreadLock.mutate({ id: activeThreadLock.id })}
              disabled={recallThreadLock.isPending}
              className="flex-1 text-xs font-semibold py-2 rounded-lg transition-all active:scale-95"
              style={{ background: "oklch(0.74 0.14 72)", color: "oklch(0.10 0.02 240)" }}
            >
              Pick it up →
            </button>
            <button
              onClick={() => dismissThreadLock.mutate({ id: activeThreadLock.id })}
              className="text-xs px-3 py-2"
              style={{ color: "oklch(0.45 0.04 240)" }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {topAlert === "check_in_due" && (
        <button
          onClick={() => openCheckIn(activePeriod)}
          className="w-full text-left p-4 rounded-xl border transition-all duration-150 active:scale-[0.99] hover:brightness-110"
          style={{ borderColor: "oklch(0.74 0.14 72 / 0.28)", background: "linear-gradient(135deg, oklch(0.74 0.14 72 / 0.08) 0%, oklch(0.74 0.14 72 / 0.03) 100%)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.74 0.14 72)" }}>
                {activePeriod === "morning" ? "Morning check-in ready" : activePeriod === "midday" ? "Midday check-in ready" : "Evening close ready"}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "oklch(0.74 0.14 72 / 0.6)" }} />
          </div>
          <p className="text-sm text-foreground">
            {activePeriod === "morning" ? "Set your capacity and focus for today." : activePeriod === "midday" ? "Check in on your energy and adjust your plan." : "Reflect on the day and set tomorrow's thread."}
          </p>
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

      {/* ── Reading Bridge first-time prompt ─────────────────────────────── */}
      {showRbPrompt && (
        <div
          className="flex items-start justify-between gap-4 px-4 py-3.5 rounded-xl"
          style={{
            background: "oklch(0.74 0.14 72 / 0.06)",
            border: "1px solid oklch(0.74 0.14 72 / 0.18)",
          }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "oklch(0.74 0.14 72)" }} />
            <div className="min-w-0">
              <p className="text-sm text-foreground/90 leading-snug">
                Reading <span className="italic">Permission to Start</span>? Tell Wren where you are and she'll keep it in mind.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => { dismissRbPrompt(false); navigate("/reading-bridge"); }}
                  className="text-xs font-medium px-3 py-1 rounded-md"
                  style={{ background: "oklch(0.74 0.14 72 / 0.18)", color: "oklch(0.74 0.14 72)" }}
                >
                  Set my chapter
                </button>
                <button
                  onClick={() => dismissRbPrompt(true)}
                  className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  Not reading it
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => dismissRbPrompt(false)}
            className="flex-shrink-0 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
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

      {/* ── Onboarding Banner (new users only, compact dismissible) ──────────── */}
      {(() => {
        const hasProject = activeProjects && activeProjects.length > 0;
        const dismissed = (() => { try { return !!localStorage.getItem('continuary_onboarding_done'); } catch { return false; } })();
        if (dismissed || hasProject) return null;
        const steps = [
          { done: morningDone || middayDone || eveningDone, label: "First check-in" },
          { done: !!hasProject, label: "Add a project" },
          { done: !!(pendingIdeas && pendingIdeas.length > 0), label: "Capture an idea" },
        ];
        const doneCount = steps.filter(s => s.done).length;
        return (
          <div
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl"
            style={{ background: "oklch(0.74 0.14 72 / 0.06)", border: "1px solid oklch(0.74 0.14 72 / 0.14)" }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex gap-1">
                {steps.map((s, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: s.done ? "oklch(0.74 0.14 72)" : "oklch(0.74 0.14 72 / 0.25)" }} />
                ))}
              </div>
              <p className="text-xs" style={{ color: "oklch(0.74 0.14 72 / 0.75)" }}>
                Getting started · {doneCount}/{steps.length}
                {doneCount < steps.length && (
                  <span style={{ color: "oklch(0.74 0.14 72 / 0.50)" }}> · next: {steps.find(s => !s.done)?.label}</span>
                )}
              </p>
            </div>
            <button
              onClick={() => { try { localStorage.setItem('continuary_onboarding_done', '1'); } catch {} window.location.reload(); }}
              className="shrink-0 transition-opacity"
              style={{ color: "oklch(0.74 0.14 72 / 0.35)" }}
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })()}

      {/* Bento grid — 3-col desktop → 2-col tablet → 1-col mobile */}
      {/* Daily Rhythm — full-width above masonry so check-in cells never truncate */}
      <BentoCard
        className="w-full mb-3 order-[-8]"
        icon={<Sun className="w-3.5 h-3.5" />}
        title="Daily Rhythm"
        headerRight={gamStatus?.rhythmToday && (
          <RhythmSegments
            morning={gamStatus.rhythmToday.morning}
            midday={gamStatus.rhythmToday.midday}
            evening={gamStatus.rhythmToday.evening}
          />
        )}
      >
        {/* Segmented tabs: equal flex:1 + min-w-0 so they share card width on any screen */}
        <div className="flex gap-2 w-full min-w-0">
          <CheckInCard
            type="morning"
            icon={Sun}
            label="Morning check-in"
            timeHint="Set capacity + focus"
            completed={morningDone}
            active={!morningDone}
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
            active={morningDone && !middayDone}
            open={activeCheckIn === "midday"}
            onOpen={() => openCheckIn("midday")}
            onClose={() => setActiveCheckIn(null)}
          />
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <CheckInCard
              type="evening"
              icon={Sunset}
              label="Evening close"
              timeHint="Close the loop. Acknowledge what moved."
              completed={eveningDone}
              active={!eveningDone}
              open={activeCheckIn === "evening"}
              onOpen={() => openCheckIn("evening")}
              onClose={() => setActiveCheckIn(null)}
            />
            {eveningDone && lastEveningClose && (
              <button
                onClick={() => setShowEveningReview(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left pl-1 underline underline-offset-2"
              >
                Review last close
              </button>
            )}
          </div>
        </div>
      </BentoCard>

      {/* Ordered dashboard tiers: secondary context first, optional context by request. */}
      <div className="flex flex-col gap-3">

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
          {activeCheckIn === "morning" && <MorningCheckIn onComplete={() => handleCheckInComplete("morning")} localDate={localDateStr} />}
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
      {isModuleVisible("tasks") && (tasks.length > 0 || true) && (
        <div className="break-inside-avoid mb-3" style={{ order: presentationOrder("tasks", dashboardLayout) }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.74 0.14 72 / 0.60)" }}>
              Today's tasks
            </p>
            <div className="flex items-center gap-2">
              {tasks.length > 0 && (
                <span className="text-xs text-muted-foreground/60">
                  {completedTasks > 0 ? `${completedTasks}/${tasks.length}` : `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
                </span>
              )}
              <button
                onClick={() => setAddingTask(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-foreground/80 transition-colors"
                title="Add a task"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
          {allTasksDone && (
            <div className="space-y-2">
              <div className="p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-900/10">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      {completedTasks === 1 ? "One thing moved today." :
                       completedTasks === 2 ? "Two things moved today." :
                       `${completedTasks} things moved today.`}
                    </p>
                    <p className="text-xs text-emerald-600/60 dark:text-emerald-400/50 mt-0.5">
                      That's the work. The rest is bonus.
                    </p>
                  </div>
                </div>
              </div>
              {/* Allow adding more tasks even when all are done */}
              {addingTask ? (
                <div className="rounded-xl border border-primary/40 bg-card overflow-hidden">
                  <div className="flex items-center gap-3 px-3 pt-2.5 pb-1">
                    <div className="shrink-0 w-5 h-5 rounded-full border-2 border-foreground/20" />
                    <input
                      ref={newTaskInputRef}
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { handleAddTask(); }
                        if (e.key === "Escape") { setAddingTask(false); setNewTaskTitle(""); }
                      }}
                      placeholder="What needs to happen today?"
                      className="flex-1 min-w-0 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground/40"
                      maxLength={300}
                    />
                  </div>
                  <div className="flex items-center justify-between px-3 pb-2.5">
                    <span className="text-xs text-muted-foreground/35 select-none hidden sm:inline">↵ to add · esc to cancel</span>
                    <span className="text-xs text-muted-foreground/35 select-none sm:hidden">Tap Add when done</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setAddingTask(false); setNewTaskTitle(""); }}
                        className="text-sm py-1 px-2 text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
                      >Cancel</button>
                      <button
                        onClick={handleAddTask}
                        className="text-sm py-1 px-3 font-medium text-primary hover:text-primary/80 transition-colors"
                      >Add →</button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
          {!allTasksDone && tasks.length > 0 && (
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
                  {editingTaskId === task.id ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/40 bg-card">
                      <input
                        autoFocus
                        value={editingTaskTitle}
                        onChange={(e) => setEditingTaskTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") { setEditingTaskId(null); setEditingTaskTitle(""); } }}
                        onBlur={handleEditSave}
                        className="flex-1 bg-transparent text-sm outline-none text-foreground"
                        maxLength={300}
                      />
                      <button onClick={handleEditSave} className="text-xs text-primary shrink-0">Save</button>
                    </div>
                  ) : (
                  <TaskItem
                    task={task}
                    onComplete={completeTask}
                    onUncomplete={uncompleteTask}
                    onUnstick={(t) => setUnstickTask(t)}
                    onEdit={handleEditTask}
                    onRemove={handleRemoveTask}
                    onPushToTomorrow={handlePushToTomorrow}
                    pendingUndo={pendingUndoTaskIds.has(task.id)}
                  />
                  )}
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
              {/* Add task input — full-width two-line layout */}
              {addingTask && (
                <div className="rounded-xl border border-primary/40 bg-card overflow-hidden">
                  {/* Row 1: circle + full-width input */}
                  <div className="flex items-center gap-3 px-3 pt-2.5 pb-1">
                    <div className="shrink-0 w-5 h-5 rounded-full border-2 border-foreground/20" />
                    <input
                      ref={newTaskInputRef}
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { handleAddTask(); }
                        if (e.key === "Escape") { setAddingTask(false); setNewTaskTitle(""); }
                      }}
                      placeholder="What needs to happen today?"
                      className="flex-1 min-w-0 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground/40"
                      maxLength={300}
                    />
                  </div>
                  {/* Row 2: hint left, actions right */}
                  <div className="flex items-center justify-between px-3 pb-2.5">
                    <span className="text-xs text-muted-foreground/35 select-none hidden sm:inline">↵ to add · esc to cancel</span>
                    <span className="text-xs text-muted-foreground/35 select-none sm:hidden">Tap Add when done</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setAddingTask(false); setNewTaskTitle(""); }}
                        className="text-sm py-1 px-2 text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
                      >Cancel</button>
                      <button
                        onClick={handleAddTask}
                        className="text-sm py-1 px-3 font-medium text-primary hover:text-primary/80 transition-colors"
                      >Add →</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Empty state — no tasks yet */}
          {!allTasksDone && tasks.length === 0 && (
            <div className="space-y-2">
              {addingTask ? (
                <div className="rounded-xl border border-primary/40 bg-card overflow-hidden">
                  <div className="flex items-center gap-3 px-3 pt-2.5 pb-1">
                    <div className="shrink-0 w-5 h-5 rounded-full border-2 border-foreground/20" />
                    <input
                      ref={newTaskInputRef}
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { handleAddTask(); }
                        if (e.key === "Escape") { setAddingTask(false); setNewTaskTitle(""); }
                      }}
                      placeholder="What needs to happen today?"
                      className="flex-1 min-w-0 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground/40"
                      maxLength={300}
                    />
                  </div>
                  <div className="flex items-center justify-between px-3 pb-2.5">
                    <span className="text-xs text-muted-foreground/35 select-none hidden sm:inline">↵ to add · esc to cancel</span>
                    <span className="text-xs text-muted-foreground/35 select-none sm:hidden">Tap Add when done</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setAddingTask(false); setNewTaskTitle(""); }}
                        className="text-sm py-1 px-2 text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
                      >Cancel</button>
                      <button
                        onClick={handleAddTask}
                        className="text-sm py-1 px-3 font-medium text-primary hover:text-primary/80 transition-colors"
                      >Add →</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => setAddingTask(true)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-dashed border-foreground/15 text-muted-foreground/50 hover:text-muted-foreground/80 hover:border-foreground/25 transition-colors"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span className="text-sm">Add a task for today</span>
                  </button>
                  <button
                    onClick={() => navigate("/capture")}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed border-foreground/10 text-muted-foreground/35 hover:text-muted-foreground/60 hover:border-foreground/20 transition-colors"
                  >
                    <Mic className="w-4 h-4 shrink-0" />
                    <span className="text-sm">Nothing blocking you? Capture a thought</span>
                  </button>
                </div>
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
          style={{ order: 25 }}
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
      {isModuleVisible("first_step") && activeProjects && activeProjects.length > 0 && (() => {
        const primaryProjectId = todayPlan?.primaryProjectId;
        const topProject = primaryProjectId
          ? activeProjects.find((p) => p.id === primaryProjectId) ?? activeProjects[0]
          : activeProjects[0];
        if (!topProject?.nextStep) return null;
        return (
          <div className="p-4 rounded-xl border space-y-3" style={{ order: presentationOrder("first_step", dashboardLayout), borderColor: "oklch(0.74 0.14 72 / 0.25)", background: "linear-gradient(135deg, oklch(0.74 0.14 72 / 0.08) 0%, oklch(0.74 0.14 72 / 0.03) 100%)" }}>
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
                      notify.info("Next step updated");
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
                        notify.info("Next step updated");
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
                        notify.info("Next step updated");
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



      {/* ── Wren Ambient Presence (time-of-day) ─────────────────────────── */}
      {optInExpanded && (() => {
        const wrenClip = hour < 12 ? "popsHead" : hour < 17 ? "holdingOrb" : "closesEyes";
        const wrenTagline = hour < 12 ? "Morning. The thread is ready." : hour < 17 ? "Your thread is holding." : "Wren is keeping this warm.";
        return (
          <BentoCard noPadding className="wren-ambient-card break-inside-avoid mb-3" style={{ order: 100, height: 220, position: "relative", overflow: "hidden" }}>
            {/* Subtle warm glow behind Wren */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 80%, oklch(0.74 0.14 72 / 0.12) 0%, transparent 65%)" }}
            />
            {/* Wren fills the card — mix-blend-mode:screen removes the dark bg */}
            <WrenPlayer
              clip={wrenClip}
              size="full"
              loop
              autoPlay
              muted
              feather
              featherDirection="bottom"
              wrapperClassName="absolute inset-0"
            />
            {/* Tagline pinned to bottom */}
            <div className="absolute bottom-0 left-0 right-0 pb-3 text-center px-4 z-10"
              style={{ background: "linear-gradient(to top, oklch(0.10 0.022 240 / 0.85) 0%, transparent 100%)" }}
            >
              <p className="text-xs font-log" style={{ color: "oklch(0.92 0.02 65 / 0.80)" }}>{wrenTagline}</p>
            </div>
          </BentoCard>
        );
      })()}

      {/* ── Emotional Cycle Widget ─────────────────────────────────────────── */}
      {optInExpanded && isModuleVisible("emotional_cycle") && <BentoCard icon={<Heart className="w-3.5 h-3.5" />} title="Emotional Cycle" noPadding className="break-inside-avoid mb-3" style={{ order: presentationOrder("emotional_cycle", dashboardLayout) }}>
        <MoodWidget />
      </BentoCard>}

      {/* ── Tomorrow's Plan Card (from last night's evening check-in) ─────── */}
      {/* Show after evening close — even if empty, so user can always add to tomorrow */}
      {eveningDone && (
        <WrenHandoffCard tasks={tomorrowPlanTasks ?? []} localDate={localDateStr} />
      )}

      {/* ── Scratch Pad Widget ────────────────────────────────────────────────────────────────── */}
      {optInExpanded && isModuleVisible("scratch_pad") && scratchNotes && scratchNotes.length > 0 && (() => {
        const pinned = (scratchNotes as any[]).filter(n => n.pinned);
        const preview = pinned.length > 0 ? pinned.slice(0, 2) : (scratchNotes as any[]).slice(0, 2);
        return (
          <a href="/scratch" className="block p-4 rounded-xl border transition-all group break-inside-avoid mb-3" style={{ order: presentationOrder("scratch_pad", dashboardLayout), background: "oklch(0.12 0.022 240 / 0.60)", borderColor: "oklch(0.74 0.14 72 / 0.10)" }}>
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
      {optInExpanded && isModuleVisible("knowledge_graph") && <a href="/vault" className="block no-underline break-inside-avoid mb-3" style={{ order: presentationOrder("knowledge_graph", dashboardLayout) }}>
        <BentoCard icon={<span style={{ fontSize: "1rem", lineHeight: 1 }} aria-hidden="true">◎</span>} title="Knowledge Graph" className="hover:border-primary/20 hover:bg-primary/[0.02] transition-all cursor-pointer break-inside-avoid mb-3">
          <p className="text-sm text-foreground/60">View your vault connections →</p>
        </BentoCard>
      </a>}

      {/* ── Thread Strength — gentle arc + named-state dot meter (#5) ────────── */}
      {isModuleVisible("thread_strength") && gamStatus?.threadStrength && (() => {
        const STATES = ["gathering", "weaving", "holding"];
        // Map legacy backend states to the 3 honored states
        const rawState = gamStatus.threadStrength.state.toLowerCase();
        const mappedState = rawState === "fraying" || rawState === "thin" ? "gathering"
          : rawState === "strong" || rawState === "woven" ? "holding"
          : rawState;
        const currentIdx = Math.max(0, STATES.indexOf(mappedState));
        const pct = Math.min(100, (gamStatus.threadStrength.score / 90) * 100);
        const r = 22; const circ = 2 * Math.PI * r;
        const dash = (pct / 100) * circ;
        return (
          <BentoCard
          className="break-inside-avoid mb-3"
            style={{ order: presentationOrder("thread_strength", dashboardLayout) }}
            icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" /></svg>}
            title="Thread Strength"
          >
            <div className="flex items-center gap-4 pt-1">
              {/* Arc */}
              <svg width={52} height={52} viewBox="0 0 52 52" className="-rotate-90 shrink-0">
                <circle cx={26} cy={26} r={r} fill="none" strokeWidth={3.5} stroke="oklch(1 0 0 / 0.07)" />
                <circle cx={26} cy={26} r={r} fill="none" strokeWidth={3.5}
                  stroke="oklch(0.74 0.14 72 / 0.70)"
                  strokeDasharray={`${dash} ${circ}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dasharray 1.2s ease" }}
                />
              </svg>
              {/* State label + dot meter */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold capitalize" style={{ color: "oklch(0.74 0.14 72)" }}>
                  {mappedState.charAt(0).toUpperCase() + mappedState.slice(1)}
                </p>
                <div className="flex items-center gap-1 mt-1.5">
                  {STATES.map((s, i) => (
                    <div
                      key={s}
                      className="rounded-full transition-all"
                      style={{
                        width: i === currentIdx ? 8 : 5,
                        height: i === currentIdx ? 8 : 5,
                        background: i <= currentIdx
                          ? "oklch(0.74 0.14 72)"
                          : "oklch(0.74 0.14 72 / 0.18)",
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs mt-1.5" style={{ color: "oklch(1 0 0 / 0.30)" }}>
                  <GlossaryTerm name="threadStrength" />
                </p>
              </div>
            </div>
            <button
              onClick={() => setReEntryOpen(true)}
              className="mt-3 w-full text-left text-xs py-2 px-3 rounded-lg transition-colors"
              style={{ background: "oklch(0.74 0.14 72 / 0.08)", color: "oklch(0.74 0.14 72 / 0.65)" }}
            >
              ↺ Pick up the thread
            </button>
          </BentoCard>
        );
      })()}

      {/* ── Focus Sessions Today Widget ─────────────────────────────────────── */}
      {focusTodayStats && focusTodayStats.todaySessions > 0 && (
        <a
          href="/focus"
          className="block p-4 rounded-xl border no-underline transition-opacity hover:opacity-90 break-inside-avoid mb-3"
          style={{ background: "oklch(0.12 0.022 240 / 0.60)", borderColor: "oklch(0.74 0.14 72 / 0.12)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "oklch(0.74 0.14 72 / 0.55)" }}>Focus sessions today</p>
          <p className="text-sm" style={{ color: "oklch(0.88 0.06 65)" }}>
            {focusTodayStats.todaySessions} session{focusTodayStats.todaySessions !== 1 ? "s" : ""} · {focusTodayStats.todayMinutes} min
            {focusArtifact && focusArtifact.totalSegments > 0 && ` · ${focusArtifact.totalSegments} woven total`}
          </p>
        </a>
      )}

      {/* ── Evidence of Movement — promoted first-class bento card (#4) ────── */}
      {gamStatus?.recentEvents && gamStatus.recentEvents.length > 0 && (
        <BentoCard
          className="break-inside-avoid mb-3"
          icon={<Zap className="w-3.5 h-3.5" />}
          title="Evidence of Movement"
        >
          <MovementFeed events={gamStatus.recentEvents as any} />
        </BentoCard>
      )}

      {/* ── Quietly Waiting — paused / holding threads (#6) ──────────────────── */}
      {isModuleVisible("quietly_waiting") && pausedProjects && pausedProjects.length > 0 && (() => {
        const waiting = pausedProjects;
        return (
          <BentoCard
            className="break-inside-avoid mb-3"
            icon={<Pause className="w-3.5 h-3.5" />}
            title="Quietly Waiting"
            style={{ order: presentationOrder("quietly_waiting", dashboardLayout) }}
          >
            <div className="space-y-2 pt-1">
              {waiting.slice(0, 3).map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="w-full flex items-start gap-2.5 text-left group"
                >
                  <div className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "oklch(0.74 0.14 72 / 0.35)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground/80 truncate group-hover:text-foreground transition-colors">{p.title}</p>
                    {p.nextStep && (
                      <p className="text-xs text-muted-foreground/50 truncate mt-0.5">re-entry: {p.nextStep}</p>
                    )}
                  </div>
                  <span className="text-xs shrink-0" style={{ color: "oklch(0.74 0.14 72 / 0.35)" }}>
                    paused
                  </span>
                </button>
              ))}
              {waiting.length > 3 && (
                <p className="text-xs text-muted-foreground/40 pt-1">
                  +{waiting.length - 3} more
                </p>
              )}
            </div>
          </BentoCard>
        );
      })()}

      {/* ── Weekly Presence Dots ────────────────────────────────────────────────────── */}
      <div className="break-inside-avoid mb-3"><ThreadView /></div>
      {/* ── Evidence Log monthly sentence ─────────────────────────────────────────────────────────────────── */}
      {evidenceMonth?.summaryLine && (
        <div className="px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 break-inside-avoid mb-3">
          <p className="text-xs font-semibold text-amber-400/70 uppercase tracking-widest mb-1">Your evidence</p>
          <p className="text-sm text-foreground/70 italic leading-relaxed">{evidenceMonth.summaryLine}</p>
        </div>
      )}
      {/* ── Active Projects — momentum state bars ──────────────────────────── */}
      {isModuleVisible("projects") && activeProjects && activeProjects.length > 0 && (() => {
        const stateLabel = (m: string) =>
          m === 'rising' ? 'weaving' :
          m === 'fading' ? 'holding' :
          m === 'stalled' ? 'holding' : 'gathering';
        const stateColor = (m: string): string =>
          m === 'rising' ? 'oklch(0.65 0.12 150)' :
          m === 'fading' || m === 'stalled' ? 'oklch(0.74 0.14 72 / 0.70)' :
          'oklch(0.74 0.14 72 / 0.40)';
        const stateFill = (m: string): number =>
          m === 'rising' ? 0.75 : m === 'fading' ? 0.45 : m === 'stalled' ? 0.25 : 0.55;
        return (
          <BentoCard icon={<FolderPlus className="w-3.5 h-3.5" />} title="Projects" style={{ order: presentationOrder("projects", dashboardLayout) }}>
            <div className="space-y-3">
              {activeProjects.slice(0, capacityLevel === "low" ? 1 : capacityLevel === "partial" ? 2 : 3).map((project) => {
                const m = momentumByProject[project.id] ?? 'steady';
                return (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-foreground truncate flex-1">{project.title}</p>
                      <span className="text-xs ml-2 shrink-0 font-log" style={{ color: stateColor(m) }}>
                        {stateLabel(m)}
                      </span>
                    </div>
                    {/* Soft momentum fill bar — state-labeled, no % */}
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.07)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${stateFill(m) * 100}%`,
                          background: stateColor(m),
                          opacity: 0.8,
                        }}
                      />
                    </div>
                    {project.nextStep && (
                      <p className="text-xs text-muted-foreground/50 truncate mt-1">next: {project.nextStep}</p>
                    )}
                  </button>
                );
              })}
              {capacityLevel === "low" && activeProjects.length > 1 && (
                <p className="text-xs text-muted-foreground/40 text-center pt-1">
                  {activeProjects.length - 1} other project{activeProjects.length - 1 > 1 ? "s" : ""} resting today
                </p>
              )}
            </div>
          </BentoCard>
        );
      })()}

      <button
        onClick={() => setOptInExpanded((expanded) => !expanded)}
        className="w-full flex items-center justify-between rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/35 transition-colors"
        style={{ order: 90 }}
        aria-expanded={optInExpanded}
      >
        <span>{optInExpanded ? "Show less" : "Show more"}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", optInExpanded && "rotate-180")} aria-hidden="true" />
      </button>

      {/* ── Clarity Engine Nudge (right col) ───────────────────────────────────────────── */}
      {optInExpanded && isModuleVisible("pattern_detected") && clarityRec && !clarityNudgeDismissed && (
        <BentoCard
          className="break-inside-avoid mb-3"
          icon={<Sparkles className="w-3.5 h-3.5" />}
          title="Pattern Detected"
          style={{ order: presentationOrder("pattern_detected", dashboardLayout) }}
          headerRight={
            <button
              onClick={dismissClarityNudge}
              className="p-1 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-foreground/5 transition-colors"
              aria-label="Dismiss for 24 hours"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          }
        >
          <p className="text-sm font-medium text-foreground mb-1">{clarityRec.modeLabel}</p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">{clarityRec.nudge}</p>
          {clarityRec.context && (
            <p className="text-xs text-muted-foreground/50 italic mb-3">{clarityRec.context}</p>
          )}
          <button
            onClick={() => navigate(`/clarity?mode=${clarityRec.mode}`)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Start a session <ArrowRight className="w-3 h-3" />
          </button>
        </BentoCard>
      )}

      {/* ── Recent Decisions (right col) ────────────────────────────────────────────────────────── */}
      {optInExpanded && isModuleVisible("recent_decisions") && recentDecisions && recentDecisions.length > 0 && (
        <div style={{ order: presentationOrder("recent_decisions", dashboardLayout) }}>
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
      {optInExpanded && isModuleVisible("mode") && <BentoCard icon={<ToggleLeft className="w-3.5 h-3.5" />} title="Mode" className="break-inside-avoid mb-3" style={{ order: presentationOrder("mode", dashboardLayout) }}>
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
      </BentoCard>}
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

      {/* ── Evening Close Review Modal ─────────────────────────────────────── */}
      {lastEveningClose && (
        <Dialog open={showEveningReview} onOpenChange={setShowEveningReview}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Evening Close · {lastEveningClose.date}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              {lastEveningClose.whatMoved && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">What moved</p>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{lastEveningClose.whatMoved}</p>
                </div>
              )}
              {lastEveningClose.whatRemains && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">What remains</p>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{lastEveningClose.whatRemains}</p>
                </div>
              )}
              {lastEveningClose.whatLearned && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">What I learned</p>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{lastEveningClose.whatLearned}</p>
                </div>
              )}
              {lastEveningClose.tomorrowFirst && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">First thing tomorrow</p>
                  <p className="text-foreground leading-relaxed font-medium">{lastEveningClose.tomorrowFirst}</p>
                </div>
              )}
              {lastEveningClose.tomorrowActivities && lastEveningClose.tomorrowActivities.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Planned for tomorrow</p>
                  <ul className="space-y-1">
                    {lastEveningClose.tomorrowActivities.map((t: { id: string; title: string }, i: number) => (
                      <li key={t.id ?? i} className="flex items-start gap-2">
                        <span className="text-muted-foreground mt-0.5">·</span>
                        <span className="text-foreground">{t.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {lastEveningClose.carryoverTasks && lastEveningClose.carryoverTasks.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Carrying over</p>
                  <ul className="space-y-1">
                    {lastEveningClose.carryoverTasks.map((t, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground mt-0.5">·</span>
                        <span className="text-foreground">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {lastEveningClose.wrenSummary && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Wren's reflection</p>
                  <p className="text-muted-foreground leading-relaxed italic">{lastEveningClose.wrenSummary}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
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
