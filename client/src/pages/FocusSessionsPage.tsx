/**
 * FocusSessionsPage — "Focus Sessions with Wren"
 *
 * The full body-doubling experience per spec:
 *   1. Room loads with Wren idle (looking & blinking)
 *   2. Intention input → duration pick → session starts
 *   3. Timer counts down; Wren rotates through reading/writing/weaving
 *   4. Mid-session moment: Wren looks up, "We're halfway."
 *   5. Closure chime → what-moved pick → optional note
 *   6. Artifact reveal: woven segment added, "See you next time."
 *
 * Wren videos (CDN):
 *   - wren-weaving   → /manus-storage/wren-weaving_b830451a.mp4
 *   - wren-reading   → /manus-storage/wren-reading_7cf10dd2.mp4
 *   - wren-writing   → /manus-storage/wren-writing_aa78eeb3.mov
 *   - wren-lookingup → /manus-storage/wren-lookingup_666664c5.mp4
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── CDN video URLs ────────────────────────────────────────────────────────────
const WREN_VIDEOS = {
  weaving:   "/manus-storage/wren-weaving_b532984b.mp4",
  reading:   "/manus-storage/wren-reading_bd6af9a6.mp4",
  writing:   "/manus-storage/wren-writing_8697130a.mov",
  lookingup: "/manus-storage/wren-lookingup_f1735040.mp4",
} as const;

type WrenActivity = keyof typeof WREN_VIDEOS;

// ── Ambient sound (royalty-free loops via Web Audio API oscillator fallback) ──
// We use a simple Web Audio API tone as a placeholder until real audio files are
// uploaded. The UI shows silence/rain/café but all resolve to the same tone for now.
function useAmbientSound(sound: "silence" | "rain" | "cafe", volume: number, playing: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (!playing || sound === "silence") {
      gainRef.current?.gain.setTargetAtTime(0, ctxRef.current?.currentTime ?? 0, 0.1);
      return;
    }
    // Create context on first use (must be triggered by user gesture)
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.connect(ctxRef.current.destination);
    }
    gainRef.current!.gain.setTargetAtTime(volume * 0.3, ctxRef.current.currentTime, 0.5);
  }, [playing, sound, volume]);

  useEffect(() => {
    return () => {
      gainRef.current?.gain.setTargetAtTime(0, ctxRef.current?.currentTime ?? 0, 0.1);
    };
  }, []);
}

// ── Closure chime via Web Audio API ──────────────────────────────────────────
function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(528, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(396, ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (_) { /* ignore if audio blocked */ }
}

// ── Procedural woven artifact (canvas) ───────────────────────────────────────
type ArtifactSession = {
  id: number;
  durationMinutes: number | null;
  whatMoved: "progress" | "thinking" | "stuck" | null;
  completedAt: Date | null;
  threadAddedUnits: number | null;
};

const WHAT_MOVED_COLORS: Record<string, string> = {
  progress: "#D4A853",  // gold
  thinking: "#E8DCC8",  // cream
  stuck:    "#2A3F6B",  // navy
};

function WovenArtifact({
  sessions,
  totalSegments,
  size = "full",
}: {
  sessions: ArtifactSession[];
  totalSegments: number;
  size?: "full" | "thumb";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const w = size === "thumb" ? 80 : 280;
  const h = size === "thumb" ? 80 : 320;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    // Background — dark navy loom
    ctx.fillStyle = "#0d1526";
    ctx.fillRect(0, 0, w, h);

    // Warp threads (vertical, subtle)
    const warpCount = Math.floor(w / 12);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i < warpCount; i++) {
      const x = (i / (warpCount - 1)) * (w - 4) + 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    if (sessions.length === 0) {
      // Empty state — show placeholder weave pattern
      ctx.strokeStyle = "rgba(212,168,83,0.15)";
      ctx.lineWidth = 2;
      for (let y = h - 10; y > h - 30; y -= 8) {
        ctx.beginPath();
        ctx.moveTo(8, y);
        ctx.bezierCurveTo(w * 0.3, y - 4, w * 0.7, y + 4, w - 8, y);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(212,168,83,0.3)";
      ctx.font = `${size === "thumb" ? 8 : 11}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("Your weave starts here", w / 2, h / 2);
      return;
    }

    // Each session = one weft row, bottom to top
    const rowHeight = Math.min(h / Math.max(sessions.length, 1), size === "thumb" ? 12 : 18);
    sessions.forEach((s, i) => {
      const color = WHAT_MOVED_COLORS[s.whatMoved ?? "thinking"] ?? "#E8DCC8";
      const units = s.threadAddedUnits ?? 1;
      const segWidth = Math.min((units / 3) * (w - 16) + 16, w - 8);
      const y = h - (i + 1) * rowHeight;
      const amplitude = 2 + (i % 3);
      const freq = 0.08 + (i % 5) * 0.01;

      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(rowHeight * 0.55, 2);
      ctx.globalAlpha = 0.75 + (i / sessions.length) * 0.25;
      ctx.beginPath();
      ctx.moveTo(4, y + rowHeight / 2);
      for (let x = 4; x <= segWidth; x += 2) {
        const wy = y + rowHeight / 2 + Math.sin(x * freq + i) * amplitude;
        ctx.lineTo(x, wy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Top border — gold thread
    ctx.strokeStyle = "rgba(212,168,83,0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.stroke();
  }, [sessions, totalSegments, w, h]);

  return (
    <canvas
      ref={canvasRef}
      width={w}
      height={h}
      className={cn("rounded", size === "thumb" ? "rounded-sm" : "rounded-lg")}
      style={{ imageRendering: "pixelated" }}
    />
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type SessionPhase =
  | "idle"          // Room loads, Wren idle
  | "intake"        // Intention input
  | "duration"      // Duration pick
  | "active"        // Timer running
  | "closure"       // What-moved pick
  | "reveal";       // Artifact reveal

export default function FocusSessionsPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // ── tRPC ──────────────────────────────────────────────────────────────────
  const { data: limitData } = trpc.focusSessions.checkWeeklyLimit.useQuery();
  const { data: artifactData, refetch: refetchArtifact } = trpc.focusSessions.getArtifact.useQuery();
  const startMutation = trpc.focusSessions.start.useMutation();
  const completeMutation = trpc.focusSessions.complete.useMutation();

  // ── Session state ─────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [intention, setIntention] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<25 | 50 | 90>(25);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [whatMoved, setWhatMoved] = useState<"progress" | "thinking" | "stuck" | null>(null);
  const [closingNote, setClosingNote] = useState("");
  const [midSessionShown, setMidSessionShown] = useState(false);
  const [midSessionVisible, setMidSessionVisible] = useState(false);
  const [wrenMessage, setWrenMessage] = useState<string | null>(null);

  // ── Wren activity ─────────────────────────────────────────────────────────
  const [wrenActivity, setWrenActivity] = useState<WrenActivity>("lookingup");
  const wrenVideoRef = useRef<HTMLVideoElement>(null);
  const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Ambient sound ─────────────────────────────────────────────────────────
  const [ambientSound, setAmbientSound] = useState<"silence" | "rain" | "cafe">("silence");
  const [ambientVolume, setAmbientVolume] = useState(30);
  useAmbientSound(ambientSound, ambientVolume / 100, phase === "active");

  // ── Timer ─────────────────────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // ── Wren activity rotation ────────────────────────────────────────────────
  const scheduleNextActivity = useCallback((currentActivity: WrenActivity, isLast5: boolean) => {
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    const activities: WrenActivity[] = isLast5
      ? ["weaving", "weaving", "weaving"]
      : ["reading", "writing", "weaving"];
    const next = activities.filter((a) => a !== currentActivity)[Math.floor(Math.random() * 2)];
    const delay = (4 + Math.random() * 4) * 60 * 1000; // 4-8 min
    activityTimerRef.current = setTimeout(() => {
      setWrenActivity(next);
      scheduleNextActivity(next, isLast5);
    }, delay);
  }, []);

  // Switch Wren video when activity changes
  useEffect(() => {
    const video = wrenVideoRef.current;
    if (!video) return;
    video.src = WREN_VIDEOS[wrenActivity];
    video.load();
    video.play().catch(() => {});
  }, [wrenActivity]);

  // ── Start session ─────────────────────────────────────────────────────────
  const handleStartSession = useCallback(async () => {
    if (!limitData?.canStart && !limitData?.isPro) {
      toast.error("You've used your free session this week. Upgrade to Pro for unlimited sessions.");
      return;
    }
    try {
      const result = await startMutation.mutateAsync({
        intention: intention.trim() || undefined,
        durationMinutes,
      });
      setSessionId(result.id);
      setSecondsLeft(durationMinutes * 60);
      setMidSessionShown(false);
      setPhase("active");
      setWrenActivity("reading");
      scheduleNextActivity("reading", false);

      // Show Wren's opening message
      setWrenMessage("I'm here. Let's work.");
      setTimeout(() => setWrenMessage(null), 4000);
    } catch (e) {
      toast.error("Couldn't start session. Please try again.");
    }
  }, [limitData, intention, durationMinutes, startMutation, scheduleNextActivity]);

  // ── Timer tick ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "active") { stopTimer(); return; }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        const total = durationMinutes * 60;
        const midpoint = Math.floor(total / 2);

        // Mid-session moment
        if (next === midpoint && !midSessionShown) {
          setMidSessionShown(true);
          setWrenActivity("lookingup");
          setMidSessionVisible(true);
          setWrenMessage("We're halfway.");
          setTimeout(() => {
            setMidSessionVisible(false);
            setWrenMessage(null);
            setWrenActivity("weaving");
            scheduleNextActivity("weaving", false);
          }, 4000);
        }

        // Last 5 minutes — weight toward weaving
        if (next === 5 * 60) {
          setWrenActivity("weaving");
          scheduleNextActivity("weaving", true);
        }

        // Done
        if (next <= 0) {
          stopTimer();
          playChime();
          setWrenActivity("lookingup");
          setWrenMessage("What moved?");
          setTimeout(() => {
            setWrenMessage(null);
            setPhase("closure");
          }, 2000);
          return 0;
        }
        return next;
      });
    }, 1000);

    return stopTimer;
  }, [phase, durationMinutes, midSessionShown, stopTimer, scheduleNextActivity]);

  // ── Complete session ──────────────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    if (!sessionId || !whatMoved) return;
    try {
      await completeMutation.mutateAsync({
        sessionId,
        whatMoved,
        closingNote: closingNote.trim() || undefined,
      });
      await refetchArtifact();
      setWrenActivity("weaving");
      setPhase("reveal");
    } catch (e) {
      toast.error("Couldn't save session. Please try again.");
    }
  }, [sessionId, whatMoved, closingNote, completeMutation, refetchArtifact]);

  // ── End early ─────────────────────────────────────────────────────────────
  const handleEndEarly = useCallback(() => {
    stopTimer();
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    setPhase("closure");
    setWrenActivity("lookingup");
  }, [stopTimer]);

  // ── Format timer ─────────────────────────────────────────────────────────
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const progressPct = phase === "active"
    ? ((durationMinutes * 60 - secondsLeft) / (durationMinutes * 60)) * 100
    : 0;

  // ── Free tier paywall ─────────────────────────────────────────────────────
  const showPaywall = limitData && !limitData.canStart && !limitData.isPro;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "oklch(0.10 0.02 240)", color: "oklch(0.92 0.03 60)" }}
    >
      {/* Header — dims during active session */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b transition-opacity duration-700"
        style={{
          borderColor: "oklch(0.20 0.03 240)",
          opacity: phase === "active" ? 0.3 : 1,
        }}
      >
        <div>
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: "oklch(0.92 0.08 65)" }}>
            Focus Sessions
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.04 240)" }}>
            with Wren
          </p>
        </div>
        {artifactData && artifactData.sessions.length > 0 && (
          <div className="flex items-center gap-2">
            <WovenArtifact sessions={artifactData.sessions} totalSegments={artifactData.totalSegments} size="thumb" />
            <div className="text-right">
              <p className="text-xs font-medium" style={{ color: "oklch(0.80 0.08 65)" }}>
                {artifactData.totalSegments} sessions woven
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main two-column layout */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">

        {/* ── User workspace (left / center) ─────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-8">

          {/* IDLE — welcome */}
          {phase === "idle" && (
            <div className="text-center max-w-sm">
              <p className="text-2xl font-light mb-2" style={{ color: "oklch(0.88 0.06 65)" }}>
                Ready when you are.
              </p>
              <p className="text-sm mb-8" style={{ color: "oklch(0.55 0.04 240)" }}>
                Wren will sit with you — reading, writing, weaving — while you work.
              </p>
              {showPaywall ? (
                <div
                  className="rounded-xl p-6 text-center"
                  style={{ background: "oklch(0.14 0.03 240)", border: "1px solid oklch(0.25 0.05 240)" }}
                >
                  <p className="text-sm font-medium mb-1" style={{ color: "oklch(0.80 0.08 65)" }}>
                    You've used your free session this week
                  </p>
                  <p className="text-xs mb-4" style={{ color: "oklch(0.55 0.04 240)" }}>
                    Pro unlocks unlimited Focus Sessions — $4.99/mo founding rate.
                  </p>
                  <Button
                    onClick={() => navigate("/pro")}
                    style={{ background: "oklch(0.72 0.16 65)", color: "oklch(0.10 0.02 240)" }}
                  >
                    Unlock unlimited sessions →
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setPhase("intake")}
                  className="px-8 py-3 text-base"
                  style={{ background: "oklch(0.72 0.16 65)", color: "oklch(0.10 0.02 240)" }}
                >
                  Start a session
                </Button>
              )}
            </div>
          )}

          {/* INTAKE — intention */}
          {phase === "intake" && (
            <div className="w-full max-w-md">
              <p className="text-xl font-light mb-6 text-center" style={{ color: "oklch(0.88 0.06 65)" }}>
                What are we working on this session?
              </p>
              <Textarea
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                placeholder="Anything. Even 'I don't know yet.'"
                className="resize-none text-sm mb-4"
                rows={3}
                style={{
                  background: "oklch(0.14 0.03 240)",
                  border: "1px solid oklch(0.25 0.05 240)",
                  color: "oklch(0.88 0.04 60)",
                }}
                maxLength={500}
              />
              <div className="flex gap-3">
                <Button
                  onClick={() => setPhase("duration")}
                  className="flex-1"
                  style={{ background: "oklch(0.72 0.16 65)", color: "oklch(0.10 0.02 240)" }}
                >
                  {intention.trim() ? "Set intention →" : "Skip →"}
                </Button>
              </div>
            </div>
          )}

          {/* DURATION — pick */}
          {phase === "duration" && (
            <div className="w-full max-w-md text-center">
              <p className="text-xl font-light mb-2" style={{ color: "oklch(0.88 0.06 65)" }}>
                How long?
              </p>
              {intention.trim() && (
                <p className="text-xs mb-6 italic" style={{ color: "oklch(0.55 0.04 240)" }}>
                  "{intention.trim()}"
                </p>
              )}
              <div className="flex gap-4 justify-center mb-8">
                {([25, 50, 90] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDurationMinutes(d)}
                    className={cn(
                      "rounded-xl px-6 py-4 text-center transition-all",
                      durationMinutes === d
                        ? "ring-2"
                        : "opacity-60 hover:opacity-90"
                    )}
                    style={{
                      background: durationMinutes === d ? "oklch(0.18 0.04 240)" : "oklch(0.14 0.03 240)",
                      border: "1px solid oklch(0.25 0.05 240)",
                      outline: durationMinutes === d ? "2px solid oklch(0.72 0.16 65)" : "none",
                    }}
                  >
                    <p className="text-2xl font-bold" style={{ color: "oklch(0.88 0.08 65)" }}>{d}</p>
                    <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.04 240)" }}>
                      {d === 25 ? "Quick burst" : d === 50 ? "Full session" : "Deep work"}
                    </p>
                  </button>
                ))}
              </div>
              <Button
                onClick={handleStartSession}
                disabled={startMutation.isPending}
                className="px-10 py-3 text-base"
                style={{ background: "oklch(0.72 0.16 65)", color: "oklch(0.10 0.02 240)" }}
              >
                {startMutation.isPending ? "Starting…" : "Begin →"}
              </Button>
            </div>
          )}

          {/* ACTIVE — timer */}
          {phase === "active" && (
            <div className="text-center w-full max-w-sm">
              {/* Progress ring */}
              <div className="relative mx-auto mb-6" style={{ width: 180, height: 180 }}>
                <svg width="180" height="180" className="absolute inset-0 -rotate-90">
                  <circle cx="90" cy="90" r="80" fill="none" stroke="oklch(0.18 0.03 240)" strokeWidth="6" />
                  <circle
                    cx="90" cy="90" r="80"
                    fill="none"
                    stroke="oklch(0.72 0.16 65)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={`${2 * Math.PI * 80 * (1 - progressPct / 100)}`}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-mono font-bold" style={{ color: "oklch(0.92 0.08 65)" }}>
                    {formatTime(secondsLeft)}
                  </span>
                  <span className="text-xs mt-1" style={{ color: "oklch(0.50 0.04 240)" }}>
                    {durationMinutes} min session
                  </span>
                </div>
              </div>

              {intention.trim() && (
                <p className="text-sm italic mb-6" style={{ color: "oklch(0.60 0.04 240)" }}>
                  "{intention.trim()}"
                </p>
              )}

              {/* Ambient sound */}
              <div className="flex items-center justify-center gap-3 mb-8">
                {(["silence", "rain", "cafe"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setAmbientSound(s)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full transition-all",
                      ambientSound === s ? "font-medium" : "opacity-50"
                    )}
                    style={{
                      background: ambientSound === s ? "oklch(0.20 0.04 240)" : "transparent",
                      border: "1px solid oklch(0.25 0.05 240)",
                      color: "oklch(0.75 0.04 60)",
                    }}
                  >
                    {s === "silence" ? "🔇 Silence" : s === "rain" ? "🌧 Rain" : "☕ Café"}
                  </button>
                ))}
                {ambientSound !== "silence" && (
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={ambientVolume}
                    onChange={(e) => setAmbientVolume(Number(e.target.value))}
                    className="w-20 accent-amber-400"
                  />
                )}
              </div>

              <button
                onClick={handleEndEarly}
                className="text-xs opacity-40 hover:opacity-70 transition-opacity"
                style={{ color: "oklch(0.60 0.04 240)" }}
              >
                End session early
              </button>
            </div>
          )}

          {/* CLOSURE — what moved */}
          {phase === "closure" && (
            <div className="w-full max-w-md text-center">
              <p className="text-2xl font-light mb-8" style={{ color: "oklch(0.88 0.06 65)" }}>
                What moved?
              </p>
              <div className="flex flex-col gap-3 mb-8">
                {([
                  { value: "progress", label: "Made progress", sub: "Productive session" },
                  { value: "thinking", label: "Mostly thinking", sub: "Cognitive session — equally valid" },
                  { value: "stuck",    label: "Stuck or scattered", sub: "The showing up is the point" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setWhatMoved(opt.value)}
                    className={cn(
                      "rounded-xl px-5 py-4 text-left transition-all",
                      whatMoved === opt.value ? "" : "opacity-60 hover:opacity-90"
                    )}
                    style={{
                      background: whatMoved === opt.value ? "oklch(0.18 0.04 240)" : "oklch(0.13 0.02 240)",
                      border: `1px solid ${whatMoved === opt.value ? "oklch(0.72 0.16 65)" : "oklch(0.22 0.04 240)"}`,
                    }}
                  >
                    <p className="font-medium text-sm" style={{ color: "oklch(0.88 0.06 65)" }}>{opt.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.04 240)" }}>{opt.sub}</p>
                  </button>
                ))}
              </div>

              <Textarea
                value={closingNote}
                onChange={(e) => setClosingNote(e.target.value)}
                placeholder="What I did / didn't do / want to come back to (optional — saves to Vault)"
                className="resize-none text-sm mb-4"
                rows={2}
                style={{
                  background: "oklch(0.14 0.03 240)",
                  border: "1px solid oklch(0.25 0.05 240)",
                  color: "oklch(0.88 0.04 60)",
                }}
                maxLength={1000}
              />

              <Button
                onClick={handleComplete}
                disabled={!whatMoved || completeMutation.isPending}
                className="w-full py-3"
                style={{ background: "oklch(0.72 0.16 65)", color: "oklch(0.10 0.02 240)" }}
              >
                {completeMutation.isPending ? "Saving…" : "Finish session →"}
              </Button>
            </div>
          )}

          {/* REVEAL — artifact grows */}
          {phase === "reveal" && (
            <div className="w-full max-w-md text-center">
              <p className="text-xl font-light mb-2" style={{ color: "oklch(0.88 0.06 65)" }}>
                Added to your weave.
              </p>
              <p className="text-sm mb-8" style={{ color: "oklch(0.55 0.04 240)" }}>
                See you next time.
              </p>
              {artifactData && (
                <div className="flex justify-center mb-8">
                  <WovenArtifact
                    sessions={artifactData.sessions}
                    totalSegments={artifactData.totalSegments}
                    size="full"
                  />
                </div>
              )}
              <p className="text-xs mb-6" style={{ color: "oklch(0.50 0.04 240)" }}>
                {artifactData?.totalSegments ?? 0} sessions woven into your practice
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => {
                    setPhase("intake");
                    setWhatMoved(null);
                    setClosingNote("");
                    setIntention("");
                    setSessionId(null);
                  }}
                  variant="outline"
                  style={{ borderColor: "oklch(0.30 0.05 240)", color: "oklch(0.75 0.04 60)" }}
                >
                  Another round →
                </Button>
                <Button
                  onClick={() => navigate("/")}
                  style={{ background: "oklch(0.72 0.16 65)", color: "oklch(0.10 0.02 240)" }}
                >
                  Close the session
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Wren's workspace (right) ────────────────────────────────────── */}
        <div
          className="lg:w-72 flex flex-col items-center justify-end pb-8 pt-4 px-4 relative"
          style={{ background: "oklch(0.08 0.02 240)" }}
        >
          {/* Wren message bubble */}
          {wrenMessage && (
            <div
              className="absolute top-6 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-xl text-sm text-center max-w-[200px]"
              style={{
                background: "oklch(0.16 0.04 240)",
                border: "1px solid oklch(0.28 0.06 65)",
                color: "oklch(0.88 0.06 65)",
                animation: "fadeIn 0.4s ease",
              }}
            >
              {wrenMessage}
            </div>
          )}

          {/* Wren video */}
          <div className="relative w-full flex justify-center">
            <video
              ref={wrenVideoRef}
              src={WREN_VIDEOS[wrenActivity]}
              autoPlay
              loop
              muted
              playsInline
              className="w-full max-w-[240px] lg:max-w-full"
              style={{
                mixBlendMode: "screen",
                filter: "brightness(1.1) saturate(1.2)",
              }}
            />
          </div>

          {/* Wren's persistent artifact */}
          {artifactData && artifactData.sessions.length > 0 && (
            <div className="mt-4 flex flex-col items-center gap-1">
              <WovenArtifact
                sessions={artifactData.sessions}
                totalSegments={artifactData.totalSegments}
                size="full"
              />
              <p className="text-[10px] mt-1" style={{ color: "oklch(0.40 0.03 240)" }}>
                your weave
              </p>
            </div>
          )}

          {/* Activity label */}
          {phase === "active" && (
            <p className="text-[10px] mt-3 tracking-wide uppercase" style={{ color: "oklch(0.35 0.03 240)" }}>
              Wren is {wrenActivity === "lookingup" ? "checking in" : wrenActivity}
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
