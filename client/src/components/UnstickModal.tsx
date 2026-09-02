import { useState } from "react";
import { ArrowRight, Footprints, HeartHandshake, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface UnstickModalProps {
  task: { id: string; title: string; projectId?: number | null };
  onClose: () => void;
  entryMethod?: "manual" | "resolver_offer";
}

type Fork = "fear" | "activation" | "physical_floor" | "unclear";
type Stage = "fork" | "name" | "move";

const FORKS: Array<{ key: Fork; title: string; detail: string; icon: typeof Zap }> = [
  { key: "fear", title: "There is something at stake", detail: "Starting feels exposing, consequential, or hard to get right.", icon: HeartHandshake },
  { key: "activation", title: "I cannot get traction", detail: "The task may be clear enough, but your system will not engage.", icon: Zap },
  { key: "physical_floor", title: "My body is not available", detail: "Energy, hunger, sleep, pain, or overload needs attention first.", icon: Footprints },
  { key: "unclear", title: "I cannot tell yet", detail: "You only need a first contact, not a full explanation.", icon: Sparkles },
];

const promptFor = (fork: Fork) => ({
  fear: "What does beginning seem to risk? One short line is enough.",
  activation: "What is the smallest physical contact with this work?",
  physical_floor: "What would make your body 2% more available?",
  unclear: "What is the nearest visible part of this task?",
}[fork]);

const fallbackFor = (fork: Fork, task: string) => ({
  fear: `Open “${task}” and name one imperfect first mark.`,
  activation: `Put the materials for “${task}” in front of you.`,
  physical_floor: "Take one body-supporting action, then return to the work without deciding anything else.",
  unclear: `Open “${task}” and point to one visible place to begin.`,
}[fork]);

export default function UnstickModal({ task, onClose }: UnstickModalProps) {
  const [stage, setStage] = useState<Stage>("fork");
  const [fork, setFork] = useState<Fork | null>(null);
  const [note, setNote] = useState("");
  const [smaller, setSmaller] = useState(false);
  const savePlan = trpc.revisionNine.thresholdPlans.add.useMutation();

  const chooseFork = (choice: Fork) => {
    setFork(choice);
    setStage("name");
  };
  const makeMove = () => {
    if (!fork) return;
    const smallestStart = note.trim() || fallbackFor(fork, task.title);
    savePlan.mutate({ task: task.title, fork, protection: fork === "fear" ? note.trim() || undefined : undefined, smallestStart });
    setStage("move");
  };
  const currentMove = fork ? (note.trim() || fallbackFor(fork, task.title)) : "";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md p-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="px-5 pt-5 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold"><Zap className="w-4 h-4 text-amber-500" />Unstick</DialogTitle>
          <p className="mt-1 truncate text-xs font-normal text-muted-foreground">{task.title}</p>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {stage === "fork" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Before making a plan, what is closest to true right now?</p>
              {FORKS.map(({ key, title, detail, icon: Icon }) => (
                <button key={key} type="button" onClick={() => chooseFork(key)} className="w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/45 hover:bg-primary/[0.04]">
                  <span className="flex items-start gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><span className="block text-sm font-medium text-foreground">{title}</span><span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{detail}</span></span><ArrowRight className="ml-auto mt-1 h-3.5 w-3.5 text-muted-foreground" /></span>
                </button>
              ))}
            </div>
          )}
          {stage === "name" && fork && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{promptFor(fork)}</p>
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="A few words is enough." className="min-h-24 resize-none text-sm" maxLength={1000} autoFocus />
              <Button className="w-full" onClick={makeMove}>Find the next contact <ArrowRight className="ml-1 h-4 w-4" /></Button>
              <button type="button" className="w-full text-xs text-muted-foreground underline underline-offset-4" onClick={() => setStage("fork")}>Choose a different fit</button>
            </div>
          )}
          {stage === "move" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">One next contact</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">{smaller ? "Touch one item you need for this. That is enough for now." : currentMove}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <a href="/focus" className="min-h-11 rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-foreground">Start with Wren</a>
                <button type="button" onClick={() => setSmaller(true)} className={cn("min-h-11 rounded-lg border px-3 text-sm", smaller ? "border-primary text-primary" : "border-border text-muted-foreground")}>Still too much</button>
              </div>
              <p className="text-center text-xs text-muted-foreground">You do not need to finish the task. You only need this contact.</p>
            </div>
          )}
        </div>
        <div className="flex justify-end border-t border-border px-5 pb-5 pt-3"><Button variant="ghost" size="sm" onClick={onClose}>Close</Button></div>
      </DialogContent>
    </Dialog>
  );
}
