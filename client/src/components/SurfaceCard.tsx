/**
 * SurfaceCard — ambient check-in card that slides up from the bottom during
 * a focus session. Three triggers:
 *   • interval          — every 25 minutes of elapsed time
 *   • approaching_hard_stop — 5 minutes before the hard stop
 *   • divergence        — Wren detects the user may be off-task
 *
 * Non-intrusive: it does NOT block the session UI.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Coffee, LogOut, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

export type SurfaceTrigger = "interval" | "approaching_hard_stop" | "divergence";
export type SurfaceResponse = "dismissed" | "took_break" | "ended_session";

interface SurfaceCardProps {
  trigger: SurfaceTrigger;
  minutesUntilHardStop?: number;
  onDismiss: () => void;
  onTakeBreak: () => void;
  onEndSession: () => void;
}

const COPY: Record<
  SurfaceTrigger,
  { icon: React.ReactNode; headline: string; body: string }
> = {
  interval: {
    icon: <CheckCircle2 className="w-5 h-5 text-amber-400" />,
    headline: "25-minute check-in",
    body: "Still on the right thread? A quick breath won't break your flow.",
  },
  approaching_hard_stop: {
    icon: <Clock className="w-5 h-5 text-amber-400" />,
    headline: "Hard stop approaching",
    body: "Your committed time is almost up. Wrap to a clean pause or keep going?",
  },
  divergence: {
    icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    headline: "Are you still on task?",
    body: "It looks like you may have drifted. That's okay — just checking in.",
  },
};

export function SurfaceCard({
  trigger,
  minutesUntilHardStop,
  onDismiss,
  onTakeBreak,
  onEndSession,
}: SurfaceCardProps) {
  const [leaving, setLeaving] = useState(false);
  const copy = COPY[trigger];

  function handleDismiss() {
    setLeaving(true);
    setTimeout(onDismiss, 250);
  }
  function handleTakeBreak() {
    setLeaving(true);
    setTimeout(onTakeBreak, 250);
  }
  function handleEndSession() {
    setLeaving(true);
    setTimeout(onEndSession, 250);
  }

  return (
    <div
      className={`
        fixed bottom-20 left-1/2 -translate-x-1/2 z-50
        w-[min(92vw,420px)]
        bg-[#1c1c1e] border border-amber-500/30 rounded-2xl shadow-2xl
        transition-all duration-250
        ${leaving ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}
      `}
      role="dialog"
      aria-label="Surface check-in"
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-3">
        <div className="mt-0.5 shrink-0">{copy.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-100 leading-snug">
            {copy.headline}
            {trigger === "approaching_hard_stop" && minutesUntilHardStop !== undefined && (
              <span className="ml-2 text-amber-400 font-normal">
                ({minutesUntilHardStop} min)
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-neutral-400 leading-relaxed">{copy.body}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-neutral-500 hover:text-neutral-300 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-5 pb-5 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
          onClick={handleDismiss}
        >
          Still on it
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs border-amber-700/50 text-amber-300 hover:bg-amber-900/30 hover:text-amber-200 gap-1.5"
          onClick={handleTakeBreak}
        >
          <Coffee className="w-3.5 h-3.5" />
          Take a break
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs border-red-900/50 text-red-400 hover:bg-red-950/30 hover:text-red-300 gap-1.5"
          onClick={handleEndSession}
        >
          <LogOut className="w-3.5 h-3.5" />
          End session
        </Button>
      </div>
    </div>
  );
}
