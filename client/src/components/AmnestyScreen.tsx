import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ArrowRight, Layers } from "lucide-react";

interface AmnestyScreenProps {
  gapHours: number;
  onComplete: () => void;
}

export default function AmnestyScreen({ gapHours, onComplete }: AmnestyScreenProps) {
  const [step, setStep] = useState<"entry" | "question" | "start-here">("entry");
  const [oneThingInput, setOneThingInput] = useState("");
  const [startHereCard, setStartHereCard] = useState<{
    projectTitle: string;
    nextMove: string;
    estimatedTime: string;
    reference: string | null;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const gapDays = Math.floor(gapHours / 24);
  const gapLabel = gapDays === 1 ? "a day" : gapDays < 7 ? `${gapDays} days` : "a while";

  // Queries
  const { data: activeProjects } = trpc.projects.listActive.useQuery();
  const submitMorning = trpc.checkIns.submitMorning.useMutation();
  const utils = trpc.useUtils();

  const handleProceed = () => setStep("question");

  const handleGeneratePlan = async () => {
    if (!oneThingInput.trim()) return;
    setIsGenerating(true);

    try {
      // Generate a minimal restart plan focused on the one thing
      await submitMorning.mutateAsync({
        capacityLevel: "partial",
        userNotes: oneThingInput.trim(),
      });

      // Build the Start Here card from the first active project + the one thing
      const firstProject = activeProjects?.[0];
      setStartHereCard({
        projectTitle: firstProject?.title ?? "Your work",
        nextMove: oneThingInput.trim(),
        estimatedTime: "25–45 min",
        reference: firstProject?.contextBreadcrumb ?? null,
      });

      await utils.dailyPlan.getToday.invalidate();
      setStep("start-here");
    } catch {
      // Even if AI fails, move forward — don't block re-entry
      setStartHereCard({
        projectTitle: activeProjects?.[0]?.title ?? "Your work",
        nextMove: oneThingInput.trim(),
        estimatedTime: "25–45 min",
        reference: activeProjects?.[0]?.contextBreadcrumb ?? null,
      });
      setStep("start-here");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* ── Step 1: Entry ──────────────────────────────────────────────── */}
        {step === "entry" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                You have been away for {gapLabel}.
              </p>
              <h1 className="text-2xl font-semibold text-foreground leading-snug">
                Nothing is broken.
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We are not reopening every tab.<br />
                We are not reviewing what was missed.<br />
                We are starting here.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleProceed}
                className="w-full flex items-center justify-between px-5 py-4 bg-foreground text-background rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors group"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={onComplete}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                I know where I am — take me in
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: One Question ───────────────────────────────────────── */}
        {step === "question" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                One question
              </p>
              <h1 className="text-xl font-semibold text-foreground leading-snug">
                What is the one thing that matters today?
              </h1>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Not a list. Not a plan. One thing.
              </p>
            </div>

            <div className="space-y-4">
              <textarea
                value={oneThingInput}
                onChange={(e) => setOneThingInput(e.target.value)}
                placeholder="The one thing that matters today is..."
                rows={3}
                className={cn(
                  "w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground",
                  "placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20",
                  "transition-colors"
                )}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && oneThingInput.trim()) {
                    handleGeneratePlan();
                  }
                }}
              />

              {/* Active projects as quick-select */}
              {activeProjects && activeProjects.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Quick select from active projects:</p>
                  <div className="flex flex-wrap gap-2">
                    {activeProjects.slice(0, 4).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setOneThingInput(
                          p.nextStep
                            ? `${p.title}: ${p.nextStep}`
                            : `Continue work on ${p.title}`
                        )}
                        className="text-xs px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border"
                      >
                        {p.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleGeneratePlan}
                  disabled={!oneThingInput.trim() || isGenerating}
                  className={cn(
                    "w-full flex items-center justify-between px-5 py-4 rounded-xl text-sm font-medium transition-colors group",
                    oneThingInput.trim() && !isGenerating
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <span>{isGenerating ? "Setting up your day..." : "Start from here"}</span>
                  {!isGenerating && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
                  {isGenerating && (
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  )}
                </button>
                <button
                  onClick={onComplete}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Skip — take me to the Command Center
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Start Here Card ────────────────────────────────────── */}
        {step === "start-here" && startHereCard && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                Start here
              </p>
              <h1 className="text-xl font-semibold text-foreground">
                Your day is set.
              </h1>
            </div>

            {/* The card */}
            <div className="border border-border rounded-2xl p-5 space-y-4 bg-muted/20">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-foreground/8 flex items-center justify-center shrink-0 mt-0.5">
                  <Layers className="w-4 h-4 text-foreground/60" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {startHereCard.projectTitle}
                  </p>
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {startHereCard.nextMove}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Time needed</p>
                  <p className="text-sm text-foreground font-medium">{startHereCard.estimatedTime}</p>
                </div>
                {startHereCard.reference && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Last stopping point</p>
                    <p className="text-sm text-foreground font-medium line-clamp-2">{startHereCard.reference}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={onComplete}
                className="w-full flex items-center justify-between px-5 py-4 bg-foreground text-background rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors group"
              >
                <span>Open Command Center</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
