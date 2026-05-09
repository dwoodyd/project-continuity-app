import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
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
import { FirstMovableStepModal } from "./FirstMovableStepModal";

interface ThresholdDiagnosisFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The task that has been avoided */
  taskDescription: string;
  projectId?: number;
  onStartSession?: () => void;
}

type DiagnosisResult = {
  id: number;
  pattern: string;
  patternLabel: string;
  protectionSentence: string;
  firstMove: string;
  whereItEnds: string;
  permissionLine: string;
};

const QUESTIONS = [
  {
    id: "q1",
    label: "What does starting this feel like?",
    placeholder: "When I think about starting, I feel…",
  },
  {
    id: "q2",
    label: "What are you afraid will happen?",
    placeholder: "I am afraid that if I start…",
  },
  {
    id: "q3",
    label: "What would make this feel lighter?",
    placeholder: "It would feel easier if…",
  },
] as const;

const PATTERN_COLORS: Record<string, string> = {
  perfectionism: "border-purple-400/30 bg-purple-950/20",
  ambiguity: "border-blue-400/30 bg-blue-950/20",
  emotional_weight: "border-rose-400/30 bg-rose-950/20",
  executive_function: "border-amber-400/30 bg-amber-950/20",
  shame_spiral: "border-orange-400/30 bg-orange-950/20",
  permission_deficit: "border-emerald-400/30 bg-emerald-950/20",
};

export function ThresholdDiagnosisFlow({
  open,
  onOpenChange,
  taskDescription,
  projectId,
  onStartSession,
}: ThresholdDiagnosisFlowProps) {
  const [step, setStep] = useState(0); // 0 = q1, 1 = q2, 2 = q3, 3 = result
  const [answers, setAnswers] = useState({ q1: "", q2: "", q3: "" });
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [fmsOpen, setFmsOpen] = useState(false);

  const diagnose = trpc.threshold.diagnose.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setStep(3);
    },
    onError: (err) => toast.error(err.message || "Could not complete the diagnosis"),
  });

  function handleNext() {
    const currentQ = QUESTIONS[step];
    if (!currentQ) return;
    const val = answers[currentQ.id as keyof typeof answers];
    if (!val.trim()) {
      toast.error("Please answer this question before continuing");
      return;
    }
    if (step < 2) {
      setStep((s) => s + 1);
    } else {
      // Submit
      diagnose.mutate({
        taskDescription,
        q1Response: answers.q1,
        q2Response: answers.q2,
        q3Response: answers.q3,
        projectId,
      });
    }
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(() => {
      setStep(0);
      setAnswers({ q1: "", q2: "", q3: "" });
      setResult(null);
    }, 300);
  }

  const currentQuestion = QUESTIONS[step];
  const patternColor = result
    ? PATTERN_COLORS[result.pattern] ?? "border-amber-500/30 bg-amber-900/10"
    : "";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <SheetTitle className="text-base">What's at the threshold?</SheetTitle>
            </div>
            <SheetDescription className="text-sm text-muted-foreground">
              Three questions. 90 seconds. We will name what is actually in the way.
            </SheetDescription>
          </SheetHeader>

          {/* Task reminder */}
          <div className="mb-4 rounded-lg bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">Task you cannot start:</p>
            <p className="text-sm font-medium text-foreground line-clamp-2">{taskDescription}</p>
          </div>

          {step < 3 && currentQuestion && (
            <div className="space-y-4">
              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {QUESTIONS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i <= step ? "w-6 bg-amber-400" : "w-3 bg-muted"
                    }`}
                  />
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {currentQuestion.label}
                </label>
                <Textarea
                  value={answers[currentQuestion.id as keyof typeof answers]}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.id]: e.target.value,
                    }))
                  }
                  placeholder={currentQuestion.placeholder}
                  className="min-h-[80px] resize-none"
                  maxLength={500}
                  autoFocus
                />
              </div>

              <Button
                onClick={handleNext}
                disabled={
                  diagnose.isPending ||
                  !answers[currentQuestion.id as keyof typeof answers].trim()
                }
                className="w-full gap-2 bg-amber-500 hover:bg-amber-400 text-amber-950"
              >
                {diagnose.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Diagnosing…
                  </>
                ) : step < 2 ? (
                  "Next"
                ) : (
                  "Show me what's at the door"
                )}
              </Button>

              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  Back
                </button>
              )}
            </div>
          )}

          {step === 3 && result && (
            <div className={`rounded-xl border p-5 space-y-4 ${patternColor}`}>
              {/* Pattern label */}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-widest text-amber-400/80">
                  Threshold Pattern
                </p>
                <p className="text-lg font-semibold text-foreground">{result.patternLabel}</p>
              </div>

              {/* Protection sentence */}
              <p className="text-sm text-muted-foreground italic">
                {result.protectionSentence}
              </p>

              {/* Divider */}
              <div className="border-t border-white/10" />

              {/* First move */}
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-widest text-amber-400/80">
                  Your First Move
                </p>
                <p className="text-base font-medium text-foreground">{result.firstMove}</p>
                <p className="text-sm text-muted-foreground">{result.whereItEnds}</p>
              </div>

              {/* Permission line */}
              <p className="text-sm font-medium text-amber-300/90 italic text-center pt-1">
                {result.permissionLine}
              </p>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  onClick={() => {
                    onStartSession?.();
                    handleClose();
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950"
                >
                  Start with this move
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setFmsOpen(true);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  Generate a full First Movable Step instead
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Escape hatch: open FMS generator from within diagnosis result */}
      <FirstMovableStepModal
        open={fmsOpen}
        onOpenChange={setFmsOpen}
        initialTask={taskDescription}
        projectId={projectId}
        onStartSession={() => {
          setFmsOpen(false);
          onStartSession?.();
          handleClose();
        }}
      />
    </>
  );
}
