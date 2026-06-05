import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Zap, ChevronDown, Timer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface UnstickModalProps {
  task: { id: string; title: string; projectId?: number | null };
  onClose: () => void;
  entryMethod?: "manual" | "resolver_offer";
}

type Phase = "idle" | "loading" | "result";

interface UnstickResult {
  microSteps: { step: number; action: string; duration: string; canDecomposeFurther: boolean }[];
  firstAction: string;
  timeboxOffer: string;
  encouragement: string;
  depth: number;
}

export default function UnstickModal({ task, onClose, entryMethod = "manual" }: UnstickModalProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<UnstickResult | null>(null);
  const [depth, setDepth] = useState(0);
  const [timeboxActive, setTimeboxActive] = useState(false);
  const [timeboxSeconds, setTimeboxSeconds] = useState(300);
  const [timeboxInterval, setTimeboxInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const unstick = trpc.ai.unstickTask.useMutation({
    onSuccess: (data) => {
      setResult(data as UnstickResult);
      setPhase("result");
    },
    onError: () => setPhase("idle"),
  });

  const handleUnstick = (currentDepth = 0, taskTitle = task.title) => {
    setPhase("loading");
    setDepth(currentDepth);
    unstick.mutate({
      taskTitle,
      projectId: task.projectId ?? undefined,
      context: context || undefined,
      depth: currentDepth,
      entryMethod,
    });
  };

  const handleStillTooBig = (stepAction: string) => {
    const newDepth = depth + 1;
    if (newDepth > 3) return;
    handleUnstick(newDepth, stepAction);
  };

  const handleTimebox = () => {
    if (timeboxActive) {
      if (timeboxInterval) clearInterval(timeboxInterval);
      setTimeboxInterval(null);
      setTimeboxActive(false);
      setTimeboxSeconds(300);
      return;
    }
    setTimeboxActive(true);
    setTimeboxSeconds(300);
    const interval = setInterval(() => {
      setTimeboxSeconds((s) => {
        if (s <= 1) { clearInterval(interval); setTimeboxActive(false); return 300; }
        return s - 1;
      });
    }, 1000);
    setTimeboxInterval(interval);
  };

  // Clear the timebox countdown if the modal unmounts without an explicit close,
  // so it doesn't keep ticking setState on an unmounted component.
  useEffect(() => {
    return () => { if (timeboxInterval) clearInterval(timeboxInterval); };
  }, [timeboxInterval]);

  const handleClose = () => {
    if (timeboxInterval) clearInterval(timeboxInterval);
    onClose();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="px-5 pt-5 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Zap className="w-4 h-4 text-amber-500" />
            Unstick Protocol
            {depth > 0 && (
              <span className="text-xs font-normal text-muted-foreground ml-1">
                (going smaller — pass {depth})
              </span>
            )}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 font-normal truncate">
            "{task.title}"
          </p>
        </DialogHeader>

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
          {phase === "idle" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Stuck is information. Let’s remove every decision from the next action.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  What’s making it hard? <span className="font-normal">(optional)</span>
                </label>
                <Textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g. I don’t know where to start, it feels too big, I’m not sure what done looks like…"
                  className="text-sm resize-none h-20"
                  maxLength={500}
                />
              </div>
              <Button onClick={() => handleUnstick(0)} className="w-full gap-2">
                <Zap className="w-4 h-4" />
                Find the smallest step
              </Button>
            </div>
          )}

          {phase === "loading" && (
            <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{depth > 0 ? "Going even smaller…" : "Removing all decisions…"}</span>
            </div>
          )}

          {phase === "result" && result && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5 uppercase tracking-wide">
                  Start here — right now
                </p>
                <p className="text-sm font-medium text-foreground leading-snug">{result.firstAction}</p>
              </div>

              <div className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-colors",
                timeboxActive ? "bg-amber-500/10 border-amber-500/40" : "bg-muted/30 border-border"
              )}>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Timer className={cn("w-4 h-4 shrink-0", timeboxActive ? "text-amber-500" : "text-muted-foreground")} />
                  <span className="text-sm truncate">
                    {timeboxActive
                      ? <span className="font-mono font-medium text-amber-600 dark:text-amber-400">{formatTime(timeboxSeconds)} remaining</span>
                      : <span className="text-muted-foreground">{result.timeboxOffer}</span>
                    }
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("text-xs h-7 px-2.5 shrink-0", timeboxActive && "text-amber-600 dark:text-amber-400")}
                  onClick={handleTimebox}
                >
                  {timeboxActive ? "Stop" : "Start 5 min"}
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Full breakdown</p>
                {result.microSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 group">
                    <span className="w-5 h-5 rounded-full bg-foreground/10 text-xs font-medium flex items-center justify-center shrink-0 mt-0.5">
                      {step.step}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{step.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.duration}</p>
                    </div>
                    {step.canDecomposeFurther && depth < 3 && (
                      <button
                        onClick={() => handleStillTooBig(step.action)}
                        className="shrink-0 text-xs text-muted-foreground hover:text-amber-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Still too big? Break this step down further"
                      >
                        <ChevronDown className="w-3 h-3" />
                        <span>Smaller</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {result.encouragement && (
                <p className="text-xs text-muted-foreground italic border-t border-border pt-3">
                  {result.encouragement}
                </p>
              )}

              <button
                onClick={() => { setPhase("idle"); setResult(null); setDepth(0); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Try a different approach
              </button>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex justify-end border-t border-border pt-3 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
