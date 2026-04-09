/**
 * GamificationLayer — renders all gentle reinforcement UI on the Today view.
 *
 * Features included:
 *  1. Return Markers          — calm message after 24h/3d/7d absence
 *  2. Daily Rhythm Completion — three segment progress for Morning/Midday/Evening
 *  3. Continuity Signals      — quiet ring showing return frequency
 *  4. Thread Strength         — private soft metric with 5 descriptive states
 *  5. Evidence of Movement    — minimal feed of recent meaningful actions
 *  6. Milestone Cards         — elegant acknowledgment for key thresholds
 *
 * Re-Entry Path Shortcut (feature 9) is rendered separately on the Today screen.
 * Idea Sanctuary Processing Reward (feature 4) is in IdeaSanctuaryModal.
 * Weekly Reflection Reward (feature 8) is in the Weekly pages.
 * Continuity Archive (feature 10) is on /continuity-archive route.
 */
import { useState, useEffect } from "react";
import { X, Flame, Zap, BookOpen, CheckCircle2, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

// ─── Return Marker ────────────────────────────────────────────────────────────
export function ReturnMarker({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      className="relative flex items-start gap-3 px-4 py-3 rounded-2xl border"
      style={{
        background: "oklch(0.18 0.02 270 / 0.6)",
        borderColor: "oklch(0.80 0.18 270 / 0.18)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
        style={{ background: "oklch(0.80 0.18 270 / 0.7)" }}
      />
      <p className="text-sm leading-relaxed flex-1" style={{ color: "oklch(0.88 0.06 270)" }}>
        {message}
      </p>
      <button
        onClick={onDismiss}
        className="shrink-0 p-0.5 rounded-lg opacity-40 hover:opacity-80 transition-opacity"
        style={{ color: "oklch(0.80 0.18 270)" }}
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Daily Rhythm Segments ────────────────────────────────────────────────────
export function RhythmSegments({
  morning, midday, evening,
}: { morning: boolean; midday: boolean; evening: boolean }) {
  const segments = [
    { label: "Morning", done: morning },
    { label: "Midday", done: midday },
    { label: "Evening", done: evening },
  ];
  const count = [morning, midday, evening].filter(Boolean).length;

  return (
    <div className="flex items-center gap-2">
      {segments.map(({ label, done }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div
            className="h-1 rounded-full transition-all duration-700"
            style={{
              width: 28,
              background: done
                ? "oklch(0.80 0.18 270 / 0.85)"
                : "oklch(1 0 0 / 0.10)",
            }}
          />
          <span
            className="text-[10px] font-medium transition-colors duration-500"
            style={{ color: done ? "oklch(0.80 0.18 270 / 0.7)" : "oklch(1 0 0 / 0.22)" }}
          >
            {label}
          </span>
        </div>
      ))}
      {count === 3 && (
        <span className="text-[10px] ml-1" style={{ color: "oklch(0.80 0.18 270 / 0.55)" }}>
          · Full day held
        </span>
      )}
    </div>
  );
}

// ─── Continuity Ring ─────────────────────────────────────────────────────────
export function ContinuityRing({ score, state }: { score: number; state: string }) {
  const pct = Math.min(100, (score / 90) * 100);
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex items-center gap-2.5">
      <svg width={44} height={44} viewBox="0 0 44 44" className="-rotate-90">
        <circle cx={22} cy={22} r={r} fill="none" strokeWidth={3}
          stroke="oklch(1 0 0 / 0.07)" />
        <circle cx={22} cy={22} r={r} fill="none" strokeWidth={3}
          stroke="oklch(0.80 0.18 270 / 0.65)"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s ease" }}
        />
      </svg>
      <div>
        <p className="text-xs font-semibold" style={{ color: "oklch(0.88 0.06 270)" }}>{state}</p>
        <p className="text-[10px]" style={{ color: "oklch(1 0 0 / 0.30)" }}>Thread Strength</p>
      </div>
    </div>
  );
}

// ─── Evidence of Movement Feed ────────────────────────────────────────────────
const EVENT_ICONS: Record<string, React.ElementType> = {
  rhythm_morning: Zap,
  rhythm_midday: Zap,
  rhythm_evening: Zap,
  idea_processed: BookOpen,
  task_completed: CheckCircle2,
  project_step: Flame,
  weekly_review: RotateCcw,
  weekly_compass: RotateCcw,
  reentry_flow: RotateCcw,
  return_24h: RotateCcw,
  return_3d: RotateCcw,
  return_7d: RotateCcw,
};

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function MovementFeed({ events }: { events: Array<{ id: number; label: string | null; eventType: string; createdAt: Date }> }) {
  if (events.length === 0) return null;
  const shown = events.slice(0, 5);

  return (
    <div className="space-y-1">
      {shown.map(ev => {
        const Icon = EVENT_ICONS[ev.eventType] ?? Zap;
        return (
          <div key={ev.id} className="flex items-center gap-2.5 py-1">
            <Icon className="w-3 h-3 shrink-0" style={{ color: "oklch(0.80 0.18 270 / 0.45)" }} />
            <span className="text-xs flex-1 truncate" style={{ color: "oklch(1 0 0 / 0.50)" }}>
              {ev.label ?? ev.eventType.replace(/_/g, " ")}
            </span>
            <span className="text-[10px] shrink-0" style={{ color: "oklch(1 0 0 / 0.22)" }}>
              {timeAgo(ev.createdAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Milestone Card ───────────────────────────────────────────────────────────
export function MilestoneCard({
  id, title, body, onDismiss,
}: { id: number; title: string; body: string; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(true);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(id), 400);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border px-5 py-4 transition-all duration-400",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      )}
      style={{
        background: "linear-gradient(135deg, oklch(0.20 0.04 270 / 0.8), oklch(0.16 0.02 270 / 0.9))",
        borderColor: "oklch(0.80 0.18 270 / 0.22)",
      }}
    >
      {/* Subtle glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 20% 50%, oklch(0.80 0.18 270 / 0.06) 0%, transparent 70%)",
        }}
      />
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-lg opacity-30 hover:opacity-70 transition-opacity"
        style={{ color: "oklch(0.80 0.18 270)" }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <p className="text-sm font-semibold mb-1 pr-6" style={{ color: "oklch(0.92 0.08 270)" }}>
        {title}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: "oklch(1 0 0 / 0.45)" }}>
        {body}
      </p>
    </div>
  );
}

// ─── Main GamificationStatus hook ────────────────────────────────────────────
// Used by Today view to get all gamification data in one query
export function useGamificationStatus() {
  return trpc.gamification.getStatus.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: false,
  });
}

export function useRecordEvent() {
  const utils = trpc.useUtils();
  return trpc.gamification.recordEvent.useMutation({
    onSuccess: () => {
      utils.gamification.getStatus.invalidate();
    },
  });
}
