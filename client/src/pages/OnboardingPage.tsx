import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ArrowRight, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function ContinuaryMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" strokeWidth="4" stroke="currentColor" fill="none" />
      <path d="M21 12 A9 9 0 1 1 28.36 5.64" strokeWidth="4" stroke="currentColor" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const WORK_STYLES = [
  { value: "writing_creative", label: "Writing or creative work" },
  { value: "business_product", label: "Building a business or product" },
  { value: "ministry_coaching", label: "Ministry, coaching, or speaking" },
  { value: "consulting_client", label: "Consulting or client work" },
  { value: "multiple", label: "Multiple things at once" },
] as const;

const TONE_OPTIONS = [
  { value: "gentle", label: "Gentle", description: "Calm, patient, no pressure language" },
  { value: "direct", label: "Direct", description: "Clear and honest, no softening" },
  { value: "firm", label: "Firm", description: "Straightforward accountability, no filler" },
] as const;

const FOCUS_HOURS = [
  { value: "morning", label: "Morning" },
  { value: "midday", label: "Midday" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "varies", label: "It varies" },
] as const;

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all duration-300",
            i === current
              ? "w-5 h-1.5 bg-amber-500"
              : i < current
              ? "w-1.5 h-1.5 bg-primary/40"
              : "w-1.5 h-1.5 bg-border"
          )}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  // step -1 = invite gate (shown first), 0-2 = profile setup, 3 = done
  const [step, setStep] = useState(-1);

  // Invite gate state
  const [inviteCode, setInviteCode] = useState("");
  const [inviteValidated, setInviteValidated] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteChecking, setInviteChecking] = useState(false);

  const [name, setName] = useState(user?.name?.split(" ")[0] ?? "");
  const [workStyle, setWorkStyle] = useState<string>(
    () => (typeof localStorage !== "undefined" ? localStorage.getItem("onboarding_work_style") ?? "" : "")
  );
  const [tonePreference, setTonePreference] = useState<"gentle" | "direct" | "firm">("direct");
  const [preferredFocusHours, setPreferredFocusHours] = useState<string>("morning");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectWhy, setProjectWhy] = useState("");
  const [projectNext, setProjectNext] = useState("");

  const [generatedNextStep, setGeneratedNextStep] = useState<string | null>(null);
  const completeOnboarding = trpc.settings.completeOnboarding.useMutation({
    onError: () => toast.error("Something went wrong. Please try again."),
  });
  const redeemInvite = trpc.invites.redeem.useMutation();
  const redeemBetaCode = trpc.beta.redeemCode.useMutation();
  const [betaCode, setBetaCode] = useState("");
  const [betaCodeError, setBetaCodeError] = useState<string | null>(null);
  const [betaCodeChecking, setBetaCodeChecking] = useState(false);
  const [showBetaInput, setShowBetaInput] = useState(false);

  const checkBetaCode = async () => {
    const code = betaCode.trim().toUpperCase();
    if (!code) return;
    setBetaCodeChecking(true);
    setBetaCodeError(null);
    try {
      await redeemBetaCode.mutateAsync({ code });
      toast.success("Beta access activated! 45 days of full Pro access.");
      setStep(0);
    } catch (e: any) {
      setBetaCodeError(e.message?.includes("already") ? "This code has already been used." : "Invalid beta code.");
    } finally {
      setBetaCodeChecking(false);
    }
  };
  const createProject = trpc.projects.create.useMutation();
  const generateStartHere = trpc.intelligence.generateOnboardingStartHere.useMutation();

  const checkInviteCode = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;
    setInviteChecking(true);
    setInviteError(null);
    try {
      await utils.invites.validate.fetch({ code });
      setInviteValidated(true);
      setStep(0);
    } catch {
      setInviteError("This code is invalid or has already been used. Please check and try again.");
    } finally {
      setInviteChecking(false);
    }
  };

  const focusStartMap: Record<string, string> = {
    morning: "08:00", midday: "11:00", afternoon: "13:00", evening: "17:00", varies: "09:00",
  };
  const focusEndMap: Record<string, string> = {
    morning: "12:00", midday: "14:00", afternoon: "17:00", evening: "21:00", varies: "17:00",
  };

  const finishOnboarding = async (skipProject = false) => {
    try {
      let createdProjectId: number | null = null;
      if (!skipProject && projectTitle.trim()) {
        const result = await createProject.mutateAsync({
          title: projectTitle,
          whyItMatters: projectWhy,
          nextStep: projectNext || undefined,
          status: "active",
          priorityLevel: "high",
        });
        createdProjectId = result?.id ?? null;
      }
      await completeOnboarding.mutateAsync({
        workTypes: workStyle ? [workStyle] : [],
        distractionPatterns: [],
        focusHoursStart: focusStartMap[preferredFocusHours] ?? "09:00",
        focusHoursEnd: focusEndMap[preferredFocusHours] ?? "17:00",
        tonePreference,
      });
      // Redeem the invite code now that onboarding is complete
      if (inviteValidated && inviteCode.trim()) {
        await redeemInvite.mutateAsync({ code: inviteCode.trim().toUpperCase() }).catch(() => {
          // Non-fatal: onboarding is already complete; log but don't block
        });
      }
      // Invalidate the profile cache so AppLayout reads the updated onboardingCompleted=true
      // before navigating, preventing the redirect loop
      await utils.settings.getProfile.invalidate();
      // Generate AI first action if a project was created
      if (createdProjectId) {
        try {
          const result = await generateStartHere.mutateAsync({
            projectId: createdProjectId,
            projectTitle,
            whyItMatters: projectWhy || undefined,
            userNextStep: projectNext || undefined,
            tonePreference,
            workStyle: workStyle || undefined,
          });
          setGeneratedNextStep(result.nextStep);
        } catch {
          // non-fatal — proceed without generated step
        }
      }
      setStep(4); // done screen (was 3, shifted by invite gate step)
    } catch {
      // error already toasted
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg mx-auto mb-5">
            <ContinuaryMark className="w-8 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-foreground mb-2">Continuary</h1>
          <p className="text-sm text-muted-foreground mb-6">Sign in to get started.</p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 shadow-md shadow-primary/25 transition-all"
          >
            Sign in <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  const isPending = completeOnboarding.isPending || createProject.isPending;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <ContinuaryMark className="w-6 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-[-0.02em] text-foreground">Continuary</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="h-0.5 bg-border">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: step >= 4 ? "100%" : step < 0 ? "0%" : `${((step + 1) / 3) * 100}%` }}
            />
          </div>

          <div className="p-8">
            {step >= 0 && step < 4 && (
              <div className="flex justify-between items-center mb-8">
                <StepDots current={step} total={3} />
                <span className="text-xs text-muted-foreground tracking-widest uppercase">
                  Step {step + 1} of 3
                </span>
              </div>
            )}

            {/* Invite Gate */}
            {step === -1 && (
              <div className="space-y-7">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground leading-tight">
                    Welcome to Continuary.
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    This is a private beta. Enter your invite code to continue.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
                    Invite code
                  </label>
                  <Input
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value.toUpperCase());
                      setInviteError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && checkInviteCode()}
                    placeholder="e.g. A1B2C3D4E5F6"
                    className={cn("text-base font-mono tracking-widest", inviteError && "border-destructive")}
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {inviteError && (
                    <p className="text-xs text-destructive">{inviteError}</p>
                  )}
                </div>
                <Button
                  onClick={checkInviteCode}
                  disabled={!inviteCode.trim() || inviteChecking}
                  className="w-full gap-2"
                  size="lg"
                >
                  {inviteChecking ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Checking&hellip;</>
                  ) : (
                    <>Continue <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground/50">
                  Don&rsquo;t have a code? Reach out to the Continuary team.
                </p>
                <div className="pt-2 border-t border-border">
                  {!showBetaInput ? (
                    <button
                      onClick={() => setShowBetaInput(true)}
                      className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors w-full text-center"
                    >
                      ✦ Have a beta tester code?
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-amber-400/80 tracking-widest uppercase">Beta code</label>
                      <Input
                        value={betaCode}
                        onChange={(e) => { setBetaCode(e.target.value.toUpperCase()); setBetaCodeError(null); }}
                        onKeyDown={(e) => e.key === "Enter" && checkBetaCode()}
                        placeholder="e.g. THREAD-BETA-001"
                        className={cn("text-base font-mono tracking-widest border-amber-500/30", betaCodeError && "border-destructive")}
                        autoFocus
                      />
                      {betaCodeError && <p className="text-xs text-destructive">{betaCodeError}</p>}
                      <Button onClick={checkBetaCode} disabled={!betaCode.trim() || betaCodeChecking} variant="outline" size="sm" className="w-full border-amber-500/30 text-amber-400">
                        {betaCodeChecking ? <><Loader2 className="w-3 h-3 animate-spin" /> Checking&hellip;</> : "Activate beta access"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: Who You Are */}
            {step === 0 && (
              <div className="space-y-7">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground leading-tight">
                    Welcome to Continuary.
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Let's set this up for the way you actually work.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
                    What's your name?
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="First name is fine"
                    className="text-base"
                    autoFocus
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
                    What best describes your work right now?
                  </label>
                  <div className="space-y-2">
                    {WORK_STYLES.map((ws) => (
                      <button
                        key={ws.value}
                        onClick={() => setWorkStyle(ws.value)}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all",
                          workStyle === ws.value
                            ? "border-primary bg-primary/8 text-foreground font-medium"
                            : "border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {ws.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={() => setStep(1)} disabled={!name.trim()} className="w-full gap-2" size="lg">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Tone + Focus Hours */}
            {step === 1 && (
              <div className="space-y-7">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground leading-tight">
                    How direct should Continuary be with you?
                  </h2>
                </div>
                <div className="space-y-2">
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      key={tone.value}
                      onClick={() => setTonePreference(tone.value)}
                      className={cn(
                        "w-full text-left px-4 py-3.5 rounded-xl border transition-all",
                        tonePreference === tone.value
                          ? "border-primary bg-primary/8"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <div className={cn("text-sm font-medium", tonePreference === tone.value ? "text-foreground" : "text-foreground/80")}>
                        {tone.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{tone.description}</div>
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
                    When do you do your best focused work?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {FOCUS_HOURS.map((fh) => (
                      <button
                        key={fh.value}
                        onClick={() => setPreferredFocusHours(fh.value)}
                        className={cn(
                          "px-3 py-2.5 rounded-xl border text-sm transition-all",
                          preferredFocusHours === fh.value
                            ? "border-primary bg-primary/8 text-foreground font-medium"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {fh.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* AI provider transparency — App Store 5.1.2(i) + GDPR Art. 13 */}
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed border border-border/40 rounded-xl px-4 py-3">
                  Continuary uses <strong className="text-muted-foreground/80">Google Gemini 2.5 Flash</strong> (via the{" "}
                  <strong className="text-muted-foreground/80">Manus AI platform</strong>) to generate personalised
                  insights and focus suggestions. Your notes and check-in data are sent for processing and are not used
                  to train AI models. You can revoke this in Settings at any time.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Back</Button>
                  <Button onClick={() => setStep(2)} className="flex-[2] gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: First Project */}
            {step === 2 && (
              <div className="space-y-7">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground leading-tight">
                    What's one thing you're actively working on right now?
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
                      Project name
                    </label>
                    <Input
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      placeholder="What is this project called?"
                      className="text-base"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
                      Why does it matter?
                    </label>
                    <Textarea
                      value={projectWhy}
                      onChange={(e) => setProjectWhy(e.target.value)}
                      placeholder="What would change if this got finished?"
                      className="text-sm min-h-[80px] resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
                      What's the next step?{" "}
                      <span className="normal-case font-normal text-muted-foreground/60">(optional)</span>
                    </label>
                    <Input
                      value={projectNext}
                      onChange={(e) => setProjectNext(e.target.value)}
                      placeholder="Can be added later"
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button
                    onClick={() => finishOnboarding(false)}
                    disabled={!projectTitle.trim() || isPending}
                    className="flex-[2] gap-2"
                  >
                    {isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Setting up&hellip;</>
                    ) : (
                      <>Finish setup <ArrowRight className="w-4 h-4" /></>
                    )}
                  </Button>
                </div>
                <button
                  onClick={() => finishOnboarding(true)}
                  disabled={isPending}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  Skip for now &mdash; I'll add projects later
                </button>
              </div>
            )}

            {/* Done */}
            {step === 4 && (
              <div className="text-center space-y-8 py-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <ContinuaryMark className="w-8 h-5 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg text-foreground font-medium tracking-[-0.01em]">
                    Continuary is ready.
                  </p>
                  {(generatedNextStep || projectTitle.trim()) && (
                    <p className="text-sm text-muted-foreground">
                      {generatedNextStep
                        ? `Your first action: ${generatedNextStep}`
                        : "Your first project is waiting in the Command Center."}
                    </p>
                  )}
                </div>
                {generateStartHere.isPending && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Preparing your first action…
                  </div>
                )}
                <Button onClick={() => navigate("/")} className="w-full gap-2" size="lg" disabled={generateStartHere.isPending}>
                  Open Command Center <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {step < 4 && (
          <p className="text-center text-xs text-muted-foreground/40 mt-5">
            Built for minds that move fast.
          </p>
        )}
      </div>
    </div>
  );
}
