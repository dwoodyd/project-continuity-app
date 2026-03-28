import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  ArrowRight,
  Battery,
  Brain,
  CheckCircle2,
  ChevronRight,
  Command,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const STEPS = [
  { id: "welcome", title: "Welcome to Continuity" },
  { id: "context", title: "Your context" },
  { id: "challenges", title: "Your ADHD profile" },
  { id: "projects", title: "First project" },
  { id: "done", title: "You're set up" },
];

export default function OnboardingPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);

  // Form state
  const [primaryRole, setPrimaryRole] = useState("");
  const [biggestChallenge, setBiggestChallenge] = useState("");
  const [primaryDistraction, setPrimaryDistraction] = useState("");
  const [bestFocusTime, setBestFocusTime] = useState<"morning" | "afternoon" | "evening" | "variable">("morning");
  const [tonePreference, setTonePreference] = useState<"gentle" | "direct" | "firm">("gentle");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectWhy, setProjectWhy] = useState("");
  const [projectNext, setProjectNext] = useState("");

  const completeOnboarding = trpc.settings.completeOnboarding.useMutation({
    onSuccess: () => navigate("/"),
    onError: () => toast.error("Something went wrong. Try again."),
  });

  const createProject = trpc.projects.create.useMutation();

  const handleFinish = async () => {
    if (projectTitle.trim()) {
      await createProject.mutateAsync({
        title: projectTitle,
        whyItMatters: projectWhy,
        nextStep: projectNext,
        status: "active",
        priorityLevel: "high",
      });
    }
    completeOnboarding.mutate({
      workTypes: primaryRole ? [primaryRole] : [],
      distractionPatterns: primaryDistraction ? [primaryDistraction] : [],
      focusHoursStart: bestFocusTime === "morning" ? "09:00" : bestFocusTime === "afternoon" ? "13:00" : bestFocusTime === "evening" ? "18:00" : "09:00",
      focusHoursEnd: bestFocusTime === "morning" ? "12:00" : bestFocusTime === "afternoon" ? "17:00" : bestFocusTime === "evening" ? "21:00" : "17:00",
      tonePreference,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <Command className="w-10 h-10 text-foreground/40 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">Sign in to continue</h1>
          <a href={getLoginUrl()} className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors">
            Sign in <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  const currentStep = STEPS[step]!;
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-foreground transition-all duration-500"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Step indicator */}
          <p className="text-xs text-muted-foreground text-center mb-8">
            Step {step + 1} of {STEPS.length}
          </p>

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-foreground flex items-center justify-center mx-auto">
                <Command className="w-7 h-7 text-background" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Welcome, {firstName}.</h1>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  Continuity is your command center for execution. It's built for the way ADHD brains actually work — not how productivity gurus think they should.
                </p>
              </div>
              <div className="space-y-3 text-left">
                {[
                  { icon: Brain, text: "Daily rhythm with morning, midday, and evening check-ins" },
                  { icon: Sparkles, text: "AI that adapts your plan to your actual capacity" },
                  { icon: Battery, text: "Re-Entry Cards so interruptions don't derail you" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                    <Icon className="w-4 h-4 text-foreground/60 shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">{text}</p>
                  </div>
                ))}
              </div>
              <Button onClick={() => setStep(1)} className="w-full gap-2" size="lg">
                Let's set it up <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 1: Context */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">What do you do?</h2>
                <p className="text-sm text-muted-foreground mt-1">This helps personalize your daily plans.</p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Your primary role or work</label>
                <Input
                  value={primaryRole}
                  onChange={(e) => setPrimaryRole(e.target.value)}
                  placeholder="e.g. Freelance designer, startup founder, student..."
                  className="text-sm"
                  autoFocus
                />
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">When is your best focus time?</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["morning", "afternoon", "evening", "variable"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setBestFocusTime(t)}
                      className={cn(
                        "py-2.5 rounded-lg border text-sm font-medium transition-colors capitalize",
                        bestFocusTime === t
                          ? "border-foreground/30 bg-foreground/5 text-foreground"
                          : "border-border text-muted-foreground hover:border-foreground/20"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(2)} className="flex-1 gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: ADHD Profile */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Your ADHD profile</h2>
                <p className="text-sm text-muted-foreground mt-1">No judgment. This makes the AI actually useful.</p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">What's your biggest challenge?</label>
                <Textarea
                  value={biggestChallenge}
                  onChange={(e) => setBiggestChallenge(e.target.value)}
                  placeholder="e.g. Starting tasks, staying on one thing, losing context after interruptions..."
                  className="text-sm min-h-[80px] resize-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">What most often derails you?</label>
                <Input
                  value={primaryDistraction}
                  onChange={(e) => setPrimaryDistraction(e.target.value)}
                  placeholder="e.g. Phone notifications, context switching, rabbit holes..."
                  className="text-sm"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(3)} className="flex-1 gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: First Project */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Your first project</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  What's the one thing that most needs your attention right now?
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Project name *</label>
                <Input
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="What is this project called?"
                  className="text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Why does it matter?</label>
                <Textarea
                  value={projectWhy}
                  onChange={(e) => setProjectWhy(e.target.value)}
                  placeholder="What changes if this gets done?"
                  className="text-sm min-h-[70px] resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Next physical action</label>
                <Input
                  value={projectNext}
                  onChange={(e) => setProjectNext(e.target.value)}
                  placeholder="The single most specific first step..."
                  className="text-sm"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button
                  onClick={handleFinish}
                  disabled={!projectTitle.trim() || completeOnboarding.isPending || createProject.isPending}
                  className="flex-1 gap-2"
                >
                  {completeOnboarding.isPending || createProject.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Setting up...</>
                    : <>Finish setup <ArrowRight className="w-4 h-4" /></>
                  }
                </Button>
              </div>

              <button
                onClick={() => completeOnboarding.mutate({ workTypes: primaryRole ? [primaryRole] : [], distractionPatterns: primaryDistraction ? [primaryDistraction] : [], focusHoursStart: "09:00", focusHoursEnd: "17:00", tonePreference })}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip — I'll add projects later
              </button>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center space-y-6">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
              <div>
                <h2 className="text-2xl font-semibold text-foreground">You're all set.</h2>
                <p className="text-muted-foreground mt-2 leading-relaxed">
                  Your command center is ready. Start with the morning check-in to set your capacity and focus for today.
                </p>
              </div>
              <Button onClick={() => navigate("/")} className="w-full gap-2" size="lg">
                Open Command Center <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
