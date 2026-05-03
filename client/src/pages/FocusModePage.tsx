import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Layers,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import IdeaSanctuaryModal from "@/components/IdeaSanctuaryModal";
import WrenPlayer from "@/components/WrenPlayer";

type FocusPhase = "setup" | "active" | "break" | "complete";

const FOCUS_MINUTES = 25;
const BREAK_MINUTES = 5;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export default function FocusModePage() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<FocusPhase>("setup");
  const [intention, setIntention] = useState("");
  const [timeLeft, setTimeLeft] = useState(FOCUS_MINUTES * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [driftWarning, setDriftWarning] = useState(false);
  const [driftCount, setDriftCount] = useState(0);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const [sessionNotes, setSessionNotes] = useState("");
  const [sessionSaved, setSessionSaved] = useState(false);
  const [actualDuration, setActualDuration] = useState(0);
  const [steppingAway, setSteppingAway] = useState(false);
  const [stoppingPointInput, setStoppingPointInput] = useState("");
  const [savingStoppingPoint, setSavingStoppingPoint] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const { data: todayPlan } = trpc.dailyPlan.getToday.useQuery();
  const { data: activeProjects } = trpc.projects.listActive.useQuery();
  const saveSession = trpc.focusSessions.save.useMutation();
  const updateBreadcrumb = trpc.projects.updateContextBreadcrumb.useMutation();

  const tasks = todayPlan?.criticalTasks ? JSON.parse(todayPlan.criticalTasks) : [];
  const pendingTasks = tasks.filter((t: { done?: boolean }) => !t.done);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (phase === "active") {
              persistSession(true);
              setPhase("break");
              setTimeLeft(BREAK_MINUTES * 60);
              toast.success("Focus session complete! Take a break.");
            } else if (phase === "break") {
              setPhase("complete");
              toast.success("Break over. Ready for another round?");
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drift detection
  useEffect(() => {
    if (phase !== "active" || !isRunning) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setDriftCount((prev) => prev + 1);
        setDriftWarning(true);
        setTimeout(() => setDriftWarning(false), 5000);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [phase, isRunning]);

  const persistSession = async (wasCompleted: boolean) => {
    if (!sessionStart || sessionSaved) return;
    const durationSeconds = Math.round((Date.now() - sessionStart.getTime()) / 1000);
    setActualDuration(durationSeconds);
    try {
      await saveSession.mutateAsync({
        intention: intention.trim(),
        projectId: selectedProjectId,
        startedAt: sessionStart.getTime(),
        durationSeconds,
        wasCompleted,
        notes: sessionNotes.trim() || undefined,
      });
      setSessionSaved(true);
    } catch {
      // Non-blocking — don't interrupt user's flow
    }
  };

  const startFocus = () => {
    if (!intention.trim()) {
      toast.error("Set your intention first.");
      return;
    }
    setPhase("active");
    setTimeLeft(FOCUS_MINUTES * 60);
    setIsRunning(true);
    setSessionStart(new Date());
    setSessionSaved(false);
    setActualDuration(0);
    lastActivityRef.current = Date.now();
  };

  const togglePause = () => setIsRunning((prev) => !prev);

  const reset = () => {
    setIsRunning(false);
    setPhase("setup");
    setTimeLeft(FOCUS_MINUTES * 60);
    setDriftWarning(false);
    setDriftCount(0);
    setSessionStart(null);
    setSessionNotes("");
    setSessionSaved(false);
    setActualDuration(0);
    setSteppingAway(false);
    setStoppingPointInput("");
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const startBreak = async () => {
    await persistSession(true);
    setPhase("break");
    setTimeLeft(BREAK_MINUTES * 60);
    setIsRunning(true);
  };

  const progress = phase === "active"
    ? 1 - timeLeft / (FOCUS_MINUTES * 60)
    : phase === "break"
    ? 1 - timeLeft / (BREAK_MINUTES * 60)
    : 0;

  const circumference = 2 * Math.PI * 90;

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-500",
      phase === "active" ? "bg-zinc-950" : phase === "break" ? "bg-emerald-950" : "bg-background"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-6 py-4",
        phase === "active" || phase === "break" ? "text-white/60" : "text-foreground"
      )}>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          {phase === "setup" ? "Back" : "Exit focus"}
        </button>
        {phase === "active" && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIdeaOpen(true)}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              <Lightbulb className="w-4 h-4" />
              Capture idea
            </button>
            {driftCount > 0 && (
              <span className="text-xs text-amber-400/70">{driftCount} drift{driftCount !== 1 ? "s" : ""}</span>
            )}
          </div>
        )}
      </div>

      {/* Drift Warning Banner */}
      {driftWarning && (
        <div className="mx-6 mb-2 p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-200">You left the page. Return to your intention:</p>
          <p className="text-sm font-semibold text-amber-100 truncate">{intention}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">

        {/* Setup Phase */}
        {phase === "setup" && (
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-foreground/8 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-6 h-6 text-foreground/60" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Single Focus Mode</h1>
              <p className="text-sm text-muted-foreground mt-2">
                One task. One intention. {FOCUS_MINUTES} minutes.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                What is your single focus for this session?
              </label>
              <Textarea
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                placeholder="Be specific. Not 'work on project' — 'write the intro paragraph for section 2'..."
                className="min-h-[100px] resize-none text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) startFocus();
                }}
              />
              <p className="text-xs text-muted-foreground mt-1.5">⌘ + Enter to start</p>
            </div>

            {/* Project selection */}
            {activeProjects && activeProjects.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">
                  Link to project (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedProjectId(undefined)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-lg border transition-colors",
                      selectedProjectId === undefined
                        ? "border-foreground/30 bg-foreground/5 text-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/20"
                    )}
                  >
                    No project
                  </button>
                  {activeProjects.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        if (!intention.trim() && p.nextStep) {
                          setIntention(p.nextStep);
                        }
                      }}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-lg border transition-colors",
                        selectedProjectId === p.id
                          ? "border-foreground/30 bg-foreground/5 text-foreground font-medium"
                          : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                      )}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {pendingTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Or pick from today's tasks:</p>
                <div className="space-y-1.5">
                  {pendingTasks.slice(0, 4).map((task: { id: string; title: string }) => (
                    <button
                      key={task.id}
                      onClick={() => setIntention(task.title)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors",
                        intention === task.title
                          ? "border-foreground/30 bg-foreground/5 text-foreground font-medium"
                          : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                      )}
                    >
                      {task.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={startFocus} className="w-full gap-2" size="lg">
              <Play className="w-4 h-4" />
              Start {FOCUS_MINUTES}-minute session
            </Button>
          </div>
        )}

        {/* Active / Break Phase */}
        {(phase === "active" || phase === "break") && (
          <div className="text-center space-y-8">
            {/* Circular timer */}
            <div className="relative w-52 h-52 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                <circle
                  cx="100" cy="100" r="90"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="8"
                />
                <circle
                  cx="100" cy="100" r="90"
                  fill="none"
                  stroke={phase === "active" ? "rgba(255,255,255,0.8)" : "rgba(52,211,153,0.8)"}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn(
                  "text-5xl font-mono font-light tabular-nums",
                  phase === "active" ? "text-white" : "text-emerald-300"
                )}>
                  {formatTime(timeLeft)}
                </span>
                <span className={cn(
                  "text-xs mt-1 uppercase tracking-widest",
                  phase === "active" ? "text-white/40" : "text-emerald-400/60"
                )}>
                  {phase === "active" ? "focus" : "break"}
                </span>
              </div>
            </div>

            {/* Intention reminder */}
            {phase === "active" && (
              <div className="max-w-sm mx-auto">
                <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Your intention</p>
                <p className="text-white/80 text-base leading-relaxed">{intention}</p>
                {selectedProjectId && activeProjects && (
                  <p className="text-xs text-white/25 mt-1 flex items-center justify-center gap-1">
                    <Layers className="w-3 h-3" />
                    {activeProjects.find((p) => p.id === selectedProjectId)?.title}
                  </p>
                )}
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-4 justify-center">
              <button
                onClick={reset}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={togglePause}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                  phase === "active"
                    ? "bg-white text-zinc-900 hover:bg-white/90"
                    : "bg-emerald-400 text-emerald-900 hover:bg-emerald-300"
                )}
              >
                {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
              <button
                onClick={() => setIdeaOpen(true)}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center transition-colors"
              >
                <Lightbulb className="w-5 h-5" />
              </button>
            </div>

            {phase === "active" && !steppingAway && (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => { setIsRunning(false); setSteppingAway(true); }}
                  className="text-xs text-white/50 hover:text-white/80 transition-colors border border-white/10 hover:border-white/30 px-4 py-2 rounded-lg"
                >
                  Stepping away
                </button>
                <button
                  onClick={startBreak}
                  className="text-xs text-white/20 hover:text-white/50 transition-colors"
                >
                  End session early → take a break
                </button>
              </div>
            )}
            {phase === "active" && steppingAway && (
              <div className="w-full max-w-sm mx-auto space-y-3 animate-in fade-in duration-300">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <p className="text-xs text-white/60 uppercase tracking-widest">Stepping away</p>
                  <p className="text-sm text-white/80">Where are you leaving off?</p>
                  <textarea
                    value={stoppingPointInput}
                    onChange={(e) => setStoppingPointInput(e.target.value)}
                    placeholder="e.g. Finished the intro section, next is the data model diagram..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:ring-1 focus:ring-white/20"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setSavingStoppingPoint(true);
                        try {
                          if (stoppingPointInput.trim() && selectedProjectId) {
                            await updateBreadcrumb.mutateAsync({
                              id: selectedProjectId,
                              breadcrumb: stoppingPointInput.trim(),
                            });
                          }
                          await persistSession(false);
                          toast.success("Stopping point saved. Pick up right where you left off.");
                          navigate("/");
                        } catch {
                          toast.error("Could not save. Try again.");
                        } finally {
                          setSavingStoppingPoint(false);
                        }
                      }}
                      disabled={savingStoppingPoint}
                      className="flex-1 bg-white text-zinc-900 hover:bg-white/90 text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {savingStoppingPoint ? "Saving..." : "Save & leave"}
                    </button>
                    <button
                      onClick={async () => {
                        await persistSession(false);
                        navigate("/");
                      }}
                      className="flex-1 text-white/40 hover:text-white/70 text-xs py-2 rounded-lg transition-colors border border-white/10"
                    >
                      Leave without saving
                    </button>
                  </div>
                  <button
                    onClick={() => { setSteppingAway(false); setIsRunning(true); }}
                    className="w-full text-xs text-white/25 hover:text-white/50 transition-colors"
                  >
                    Actually, keep going
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Complete Phase */}
        {phase === "complete" && (
          <div className="text-center space-y-6 max-w-sm w-full">
            <div className="flex justify-center">
              <WrenPlayer clip="celebrate" size="xl" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-foreground">You showed up. That's the whole thing.</h2>
              <p className="text-muted-foreground mt-2">
                You focused on: <span className="text-foreground font-medium">"{intention}"</span>
              </p>
              {actualDuration > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Duration: <span className="text-foreground">{formatDuration(actualDuration)}</span>
                </p>
              )}
              {driftCount > 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                  {driftCount} drift{driftCount !== 1 ? "s" : ""} detected — awareness is the first step.
                </p>
              )}
            </div>

            {/* Optional notes */}
            <div className="text-left">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Notes from this session (optional)
              </label>
              <Textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="What did you accomplish? What's the next step?"
                className="min-h-[80px] resize-none text-sm bg-muted/30"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={async () => {
                  if (!sessionSaved && sessionStart) await persistSession(true);
                  reset();
                  setIntention("");
                }}
                className="w-full gap-2"
              >
                <Play className="w-4 h-4" />
                Start another session
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!sessionSaved && sessionStart) await persistSession(true);
                  navigate("/");
                }}
                className="w-full"
              >
                Back to Command Center
              </Button>
            </div>
          </div>
        )}
      </div>

      <IdeaSanctuaryModal open={ideaOpen} onClose={() => setIdeaOpen(false)} capturedDuringTask={true} />
    </div>
  );
}
