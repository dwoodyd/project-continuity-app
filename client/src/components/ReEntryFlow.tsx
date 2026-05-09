/**
 * ReEntryFlow — "Pick Up the Thread" guided comeback flow.
 * Three quick questions, under 60 seconds, ends with a soft reinforcement moment.
 * Triggered from the Today view after inactivity or when user taps the shortcut.
 */
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface ReEntryFlowProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    id: "present",
    question: "What feels most present right now?",
    hint: "A worry, a project, a feeling — whatever is loudest.",
    placeholder: "What's taking up space in your mind…",
  },
  {
    id: "matters",
    question: "What matters most today?",
    hint: "Not everything. Just the one thing that would make today count.",
    placeholder: "The one thing that matters…",
  },
  {
    id: "step",
    question: "What is one next step you can take?",
    hint: "Small is fine. Specific is better.",
    placeholder: "One concrete step…",
  },
];

export function ReEntryFlow({ open, onClose }: ReEntryFlowProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const recordEvent = trpc.gamification.recordEvent.useMutation();

  const current = STEPS[step];
  const answer = answers[current?.id ?? ""] ?? "";

  const handleNext = () => {
    if (!answer.trim()) return;
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      // Complete
      if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
      recordEvent.mutate({
        eventType: "reentry_flow",
        label: "Picked up the thread",
        metadata: JSON.stringify(answers),
      });
      setDone(true);
    }
  };

  const handleClose = () => {
    setStep(0);
    setAnswers({});
    setDone(false);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && handleClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl pb-10 overflow-hidden"
        style={{ background: "oklch(0.14 0.02 270)", border: "none" }}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-4 pb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width: i === step && !done ? 20 : 6,
                height: 6,
                background: i <= step || done
                  ? "oklch(0.78 0.18 65 / 0.8)"
                  : "oklch(1 0 0 / 0.12)",
              }}
            />
          ))}
        </div>

        {done ? (
          // Completion state
          <div className="flex flex-col items-center text-center px-6 py-4 gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "oklch(0.78 0.18 65 / 0.15)" }}
            >
              <Check className="w-7 h-7" style={{ color: "oklch(0.78 0.18 65)" }} />
            </div>
            <div>
              <p className="text-lg font-semibold mb-2" style={{ color: "oklch(0.93 0.06 65)" }}>
                Thread picked up.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "oklch(1 0 0 / 0.42)" }}>
                You know what matters. You know the next step.{"\n"}
                That's enough to begin.
              </p>
            </div>
            <Button
              onClick={handleClose}
              className="mt-2 w-full"
              style={{ background: "oklch(0.78 0.18 65 / 0.18)", color: "oklch(0.90 0.12 65)", border: "none" }}
            >
              Continue
            </Button>
          </div>
        ) : (
          // Question steps
          <div className="px-5 pb-2">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3"
              style={{ color: "oklch(0.78 0.18 65 / 0.45)" }}>
              Re-entry · {step + 1} of {STEPS.length}
            </p>
            <h3 className="text-xl font-semibold mb-2 leading-snug"
              style={{ color: "oklch(0.93 0.06 65)" }}>
              {current.question}
            </h3>
            <p className="text-sm mb-5" style={{ color: "oklch(1 0 0 / 0.35)" }}>
              {current.hint}
            </p>
            <Textarea
              autoFocus
              placeholder={current.placeholder}
              value={answer}
              onChange={e => setAnswers(prev => ({ ...prev, [current.id]: e.target.value }))}
              rows={3}
              className="resize-none mb-4 text-sm"
              style={{
                background: "oklch(1 0 0 / 0.05)",
                border: "1px solid oklch(1 0 0 / 0.10)",
                color: "oklch(0.92 0.04 270)",
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleNext();
              }}
            />
            <Button
              onClick={handleNext}
              disabled={!answer.trim()}
              className="w-full gap-2"
              style={{
                background: answer.trim() ? "oklch(0.78 0.18 65 / 0.22)" : "oklch(1 0 0 / 0.05)",
                color: answer.trim() ? "oklch(0.90 0.12 65)" : "oklch(1 0 0 / 0.25)",
                border: "none",
              }}
            >
              {step < STEPS.length - 1 ? (
                <>Continue <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Pick up the thread <Check className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
