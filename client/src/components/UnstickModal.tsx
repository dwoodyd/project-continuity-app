import { trpc } from "@/lib/trpc";
import { Loader2, Zap, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
}

export default function UnstickModal({ task, onClose }: UnstickModalProps) {
  const unstick = trpc.ai.unstickTask.useMutation();

  const handleUnstick = () => {
    unstick.mutate({
      taskTitle: task.title,
      projectId: task.projectId ?? undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md p-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="px-5 pt-5 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Zap className="w-4 h-4 text-amber-500" />
            Unstick Protocol
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 font-normal">
            Breaking "{task.title}" into undeniable first steps.
          </p>
        </DialogHeader>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {!unstick.data && !unstick.isPending && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Stuck? That's normal. Let's find the smallest possible first action.
              </p>
              <Button onClick={handleUnstick} className="gap-2">
                <Zap className="w-4 h-4" />
                Break it down
              </Button>
            </div>
          )}

          {unstick.isPending && (
            <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Finding the smallest step...</span>
            </div>
          )}

          {unstick.data && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">Start here — right now:</p>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{unstick.data.firstAction}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Full breakdown</p>
                {unstick.data.microSteps.map((step: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                    <span className="w-5 h-5 rounded-full bg-foreground/10 text-xs font-medium flex items-center justify-center shrink-0 mt-0.5">
                      {step.step}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{step.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.duration}</p>
                    </div>
                  </div>
                ))}
              </div>

              {unstick.data.encouragement && (
                <p className="text-xs text-muted-foreground italic border-t border-border pt-3">
                  {unstick.data.encouragement}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
