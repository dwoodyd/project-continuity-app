import { useState } from "react";
import { Loader2, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { FirstMovableStepCard } from "./FirstMovableStepCard";

interface FirstMovableStepModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill the avoided task field (e.g. from a project's next step) */
  initialTask?: string;
  /** Optional project to link the step to */
  projectId?: number;
  /** Called when the user taps "Start 10-min session" */
  onStartSession?: () => void;
}

type GeneratedStep = {
  id: number;
  theMove: string;
  whereItEnds: string;
  minimumViableContact: string;
};

export function FirstMovableStepModal({
  open,
  onOpenChange,
  initialTask = "",
  projectId,
  onStartSession,
}: FirstMovableStepModalProps) {
  const [avoidedTask, setAvoidedTask] = useState(initialTask);
  const [result, setResult] = useState<GeneratedStep | null>(null);

  const generate = trpc.threshold.generateFirstMovableStep.useMutation({
    onSuccess: (data) => setResult(data),
    onError: (err) => toast.error(err.message || "Could not generate a First Movable Step"),
  });

  function handleGenerate() {
    if (!avoidedTask.trim()) {
      toast.error("Describe the task you are avoiding first");
      return;
    }
    setResult(null);
    generate.mutate({ avoidedTask: avoidedTask.trim(), projectId });
  }

  function handleClose() {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setAvoidedTask(initialTask);
      setResult(null);
    }, 300);
  }

  function handleStartSession() {
    onStartSession?.();
    handleClose();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-2">
            <Footprints className="h-4 w-4 text-amber-400" />
            <SheetTitle className="text-base">First Movable Step</SheetTitle>
          </div>
          <SheetDescription className="text-sm text-muted-foreground">
            Describe the task you are avoiding. We will find the smallest possible way in.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {!result ? (
            <>
              <Textarea
                value={avoidedTask}
                onChange={(e) => setAvoidedTask(e.target.value)}
                placeholder="The task I cannot start is…"
                className="min-h-[80px] resize-none"
                maxLength={1000}
              />
              <Button
                onClick={handleGenerate}
                disabled={generate.isPending || !avoidedTask.trim()}
                className="w-full gap-2 bg-amber-500 hover:bg-amber-400 text-amber-950"
              >
                {generate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Finding your first move…
                  </>
                ) : (
                  "Find my first move"
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <FirstMovableStepCard
                id={result.id}
                theMove={result.theMove}
                whereItEnds={result.whereItEnds}
                minimumViableContact={result.minimumViableContact}
                onStartSession={handleStartSession}
                onDismiss={handleClose}
              />
              <button
                type="button"
                onClick={() => setResult(null)}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
              >
                Try a different description
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
