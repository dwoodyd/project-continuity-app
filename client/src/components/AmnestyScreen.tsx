import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowRight, Layers, Archive, Check } from "lucide-react";

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
  const [parkedIds, setParkedIds] = useState<Set<number>>(new Set());

  // Auto-dissolve: linger 3.5 s on the entry screen, then slowly fade out into the dashboard
  const [autoFading, setAutoFading] = useState(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (step !== "entry") return;
    autoTimer.current = setTimeout(() => {
      setAutoFading(true);
      fadeTimer.current = setTimeout(() => onComplete(), 1400);
    }, 3500);
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [step, onComplete]);

  // Cancel auto-dissolve if the user interacts
  const cancelAuto = () => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    setAutoFading(false);
  };

  const gapDays = Math.floor(gapHours / 24);
  const gapLabel = gapDays === 1 ? "a day" : gapDays < 7 ? `${gapDays} days` : "a while";

  // Queries & mutations
  const { data: activeProjects } = trpc.projects.listActive.useQuery();
  const submitMorning = trpc.checkIns.submitMorning.useMutation();
  const addToVault = trpc.vault.addPaste.useMutation();
  const utils = trpc.useUtils();

  const handleProceed = () => { cancelAuto(); setStep("question"); };

  const handleParkProject = async (project: {
    id: number;
    title: string;
    nextStep?: string | null;
    contextBreadcrumb?: string | null;
  }) => {
    if (parkedIds.has(project.id)) return;
    try {
      const lines = [
        `Project: ${project.title}`,
        project.nextStep ? `Next step: ${project.nextStep}` : null,
        project.contextBreadcrumb ? `Last stopping point: ${project.contextBreadcrumb}` : null,
        `Parked during re-entry on ${new Date().toLocaleDateString()}.`,
      ].filter(Boolean);
      await addToVault.mutateAsync({
        title: `Parked: ${project.title}`,
        content: lines.join("\n"),
        sourceType: "paste",
        contentClass: "idea",
      });
      setParkedIds((prev) => { const next = new Set(prev); next.add(project.id); return next; });
      toast.success(`"${project.title}" parked to your Vault inbox.`);
    } catch {
      toast.error("Could not park to Vault. Try again.");
    }
  };

  const handleGeneratePlan = async () => {
    if (!oneThingInput.trim()) return;
    setIsGenerating(true);
    try {
      await submitMorning.mutateAsync({
        capacityLevel: "partial",
        userNotes: oneThingInput.trim(),
      });
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
    <div
      className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6"
      style={{
        transition: "opacity 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: autoFading ? 0 : 1,
      }}
    >
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
                className="w-full flex items-center justify-between px-5 py-4 bg-primary text-white rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors group"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => { cancelAuto(); onComplete(); }}
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

              {/* Active projects: quick-select + park-for-later */}
              {activeProjects && activeProjects.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Active projects</p>
                    <p className="text-[10px] text-muted-foreground/50">
                      <Archive className="w-2.5 h-2.5 inline mr-0.5" />
                      park for later
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {activeProjects.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <button
                          onClick={() => setOneThingInput(
                            p.nextStep
                              ? `${p.title}: ${p.nextStep}`
                              : `Continue work on ${p.title}`
                          )}
                          className="flex-1 text-left text-xs px-3 py-2 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border truncate"
                        >
                          {p.title}
                          {p.nextStep && (
                            <span className="ml-1 opacity-50">— {p.nextStep.slice(0, 30)}{p.nextStep.length > 30 ? "…" : ""}</span>
                          )}
                        </button>
                        <button
                          onClick={() => handleParkProject(p)}
                          disabled={parkedIds.has(p.id) || addToVault.isPending}
                          title={parkedIds.has(p.id) ? "Parked to Vault" : "Park for later in Vault inbox"}
                          className={cn(
                            "shrink-0 p-2 rounded-lg border transition-colors",
                            parkedIds.has(p.id)
                              ? "bg-muted text-muted-foreground/40 border-border cursor-default"
                              : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border"
                          )}
                        >
                          {parkedIds.has(p.id)
                            ? <Check className="w-3 h-3" />
                            : <Archive className="w-3 h-3" />
                          }
                        </button>
                      </div>
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
                      ? "bg-primary text-white hover:bg-primary/90"
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
            {parkedIds.size > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                {parkedIds.size} project{parkedIds.size > 1 ? "s" : ""} parked to your Vault inbox for later.
              </p>
            )}
            <div className="space-y-2">
              <button
                onClick={onComplete}
                className="w-full flex items-center justify-between px-5 py-4 bg-primary text-white rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors group"
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
