import { useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import notify from "@/lib/notify";

interface FirstMovableStepCardProps {
  id: number;
  theMove: string;
  whereItEnds: string;
  minimumViableContact: string;
  onStartSession?: () => void;
  onDismiss?: () => void;
}

export function FirstMovableStepCard({
  id,
  theMove,
  whereItEnds,
  minimumViableContact,
  onStartSession,
  onDismiss,
}: FirstMovableStepCardProps) {
  const [showLighter, setShowLighter] = useState(false);
  const markUsed = trpc.threshold.markUsed.useMutation({
    onError: () => {
      notify.error("Could not record session start");
    },
  });

  function handleStart() {
    markUsed.mutate({ id });
    onStartSession?.();
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-900/10 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-widest text-amber-400/80">
          First Movable Step
        </span>
      </div>

      {/* The Move */}
      <div className="space-y-1">
        <p className="text-lg font-semibold text-foreground leading-snug">{theMove}</p>
        <p className="text-sm text-muted-foreground">{whereItEnds}</p>
      </div>

      {/* Too heavy toggle */}
      <button
        type="button"
        onClick={() => setShowLighter((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showLighter ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
        {showLighter ? "Hide lighter version" : "Too heavy? Show a lighter version"}
      </button>

      {/* Minimum Viable Contact */}
      {showLighter && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-950/20 p-3 space-y-1">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-400/70">
            Minimum Viable Contact
          </p>
          <p className="text-sm text-foreground/90">{minimumViableContact}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          size="sm"
          onClick={handleStart}
          disabled={markUsed.isPending}
          className="gap-1.5" style={{ background: 'oklch(0.74 0.14 72)', color: 'oklch(0.12 0.02 65)' }}
        >
          {markUsed.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowRight className="h-3.5 w-3.5" />
          )}
          Start 10-min session
        </Button>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
