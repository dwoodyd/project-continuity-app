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
import UnstickModal from "@/components/UnstickModal";
import { SurfaceCard, type SurfaceTrigger } from "@/components/SurfaceCard";

// ── CDN video URLs ────────────────────────────────────────────────────────────
const WREN_VIDEOS = {
  weaving:   "/manus-storage/wren-weaving_b532984b.mp4",
  reading:   "/manus-storage/wren-reading_bd6af9a6.mp4",
  writing:   "/manus-storage/wren-writing_8697130a.mov",
  lookingup: "/manus-storage/wren-lookingup_f1735040.mp4",
} as const;

type WrenActivity = keyof typeof WREN_VIDEOS;

// ── Ambient sound — procedural noise via Web Audio API ───────────────────────
// Ambient sound CDN URLs (real recordings, royalty-free)
const AMBIENT_URLS = {
  rain: "/manus-storage/rain-loop_bce93e52.mp3",
  cafe: "/manus-storage/cafe-loop_b75ecfbe.mp3",
};

function useAmbientSound(sound: "silence" | "rain" | "cafe", volume: number, playing: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearFade = () => {
    if (fadeTimerRef.current) { clearInterval(fadeTimerRef.current); fadeTimerRef.current = null; }
  };

  const fadeIn = (audio: HTMLAudioElement, targetVol: number) => {
    clearFade();
    audio.volume = 0;
    const step = targetVol / 30;
    fadeTimerRef.current = setInterval(() => {
      if (audio.volume + step >= targetVol) {
        audio.volume = targetVol;
        clearFade();
      } else {
        audio.volume = Math.min(1, audio.volume + step);
      }
    }, 50);
  };

  const fadeOut = (audio: HTMLAudioElement, onDone?: () => void) => {
    clearFade();
    const step = audio.volume / 20;
    fadeTimerRef.current = setInterval(() => {
      if (audio.volume - step <= 0) {
        audio.volume = 0;
        audio.pause();
        clearFade();
        onDone?.();
      } else {
        audio.volume = Math.max(0, audio.volume - step);
      }
    }, 50);
  };

  useEffect(() => {
    // Stop and clean up previous audio
    if (audioRef.current) {
      const prev = audioRef.current;
      fadeOut(prev, () => { prev.src = ""; });
      audioRef.current = null;
    }

    if (!playing || sound === "silence") return;

    const audio = new Audio(AMBIENT_URLS[sound]);
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;

    const targetVol = Math.min(1, (volume / 100) * 0.8);
    audio.play().then(() => fadeIn(audio, targetVol)).catch(() => {});

    return () => {
      clearFade();
      audio.pause();
      audio.src = "";
    };
  }, [playing, sound]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update volume without restarting
  useEffect(() => {
    if (!audioRef.current || !playing || sound === "silence") return;
    const targetVol = Math.min(1, (volume / 100) * 0.8);
    clearFade();
    audioRef.current.volume = targetVol;
  }, [volume, playing, sound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearFade();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
  const { data: calibrationData } = trpc.focusSessions.getCalibration.useQuery();
  const startMutation = trpc.focusSessions.start.useMutation();
  const completeMutation = trpc.focusSessions.complete.useMutation();
  const wrenChatMutation = trpc.focusSessions.wrenChat.useMutation();
  const logSurfaceEventMutation = trpc.focusSessions.logSurfaceEvent.useMutation();

  // ── Session state ─────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [intention, setIntention] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<25 | 50 | 90>(25);
  const [hardStop, setHardStop] = useState<string>(""); // "HH:MM" local time
  const [showUnstickModal, setShowUnstickModal] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  // ── Surface state ──────────────────────────────────────────────────────────────────
  const [surfaceVisible, setSurfaceVisible] = useState(false);
  const [surfaceTrigger, setSurfaceTrigger] = useState<SurfaceTrigger>("interval");
  const hardStopMsRef = useRef<number | null>(null); // UTC ms of hard stop
  const lastSurfaceElapsedRef = useRef<number>(0); // elapsed seconds at last surface show
  const hardStopWarnedRef = useRef(false); // prevent double-fire for approaching_hard_stop
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [whatMoved, setWhatMoved] = useState<"progress" | "thinking" | "stuck" | null>(null);
  const [closingNote, setClosingNote] = useState("");
  const [midSessionShown, setMidSessionShown] = useState(false);
  const [midSessionVisible, setMidSessionVisible] = useState(false);
  const [wrenMessage, setWrenMessage] = useState<string | null>(null);
  // ── Chat state ────────────────────────────────────────────────────────────
  type ChatMsg = { role: "user" | "assistant"; content: string; ts: number };
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkInTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Auto-collapse chat after 5 min of inactivity
  const resetChatInactivity = useCallback(() => {
    if (chatInactivityRef.current) clearTimeout(chatInactivityRef.current);
    setChatCollapsed(false);
    chatInactivityRef.current = setTimeout(() => setChatCollapsed(true), 5 * 60 * 1000);
  }, []);
  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (!chatCollapsed) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatCollapsed]);
  // Schedule Wren-initiated check-ins
  const scheduleCheckIns = useCallback((durationMin: number) => {
    checkInTimersRef.current.forEach(clearTimeout);
    checkInTimersRef.current = [];
    const CHECKIN_LINES = [
      "still here. thread's holding.",
      "how's it going?",
      "need anything?",
      "halfway. you good?",
      "this is a good rhythm.",
    ];
    const addCheckIn = (delayMs: number) => {
      const t = setTimeout(() => {
        const line = CHECKIN_LINES[Math.floor(Math.random() * CHECKIN_LINES.length)];
        setChatMessages((prev) => [...prev, { role: "assistant", content: line, ts: Date.now() }]);
        setChatCollapsed(false);
      }, delayMs);
      checkInTimersRef.current.push(t);
    };
    if (durationMin === 50) addCheckIn(27 * 60 * 1000);
    if (durationMin === 90) { addCheckIn(30 * 60 * 1000); addCheckIn(70 * 60 * 1000); }
  }, []);
  // ── Divergence detection — show Surface card if user seems off-task ─────────
  const DIVERGENCE_KEYWORDS = [
    "different task", "other project", "something else", "switched to", "working on",
    "distracted", "went off", "off track", "rabbit hole", "tangent", "got sidetracked",
    "forgot what", "lost the thread", "not sure what", "doing something",
  ];
  const checkDivergence = useCallback((msg: string) => {
    if (!intention.trim()) return;
    const lower = msg.toLowerCase();
    const isDivergent = DIVERGENCE_KEYWORDS.some((kw) => lower.includes(kw));
    if (isDivergent && !surfaceVisible) {
      setSurfaceTrigger("divergence");
      setSurfaceVisible(true);
    }
  }, [intention, surfaceVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Send chat message to Wren
  const handleSendChat = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput("");
    setChatLoading(true);
    resetChatInactivity();
    checkDivergence(msg);
    const userMsg: ChatMsg = { role: "user", content: msg, ts: Date.now() };
    setChatMessages((prev) => [...prev, userMsg]);
    try {
      const elapsedMinutes = Math.floor((durationMinutes * 60 - secondsLeft) / 60);
      const history = [...chatMessages, userMsg].slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 400) }));
      const { reply } = await wrenChatMutation.mutateAsync({
        message: msg,
        intention: intention.trim() || undefined,
        durationMinutes,
        elapsedMinutes,
        clientHour: new Date().getHours(),
        chatHistory: history,
      });
      setChatMessages((prev) => [...prev, { role: "assistant", content: String(reply ?? "still here."), ts: Date.now() }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "still here.", ts: Date.now() }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, chatMessages, durationMinutes, secondsLeft, intention, wrenChatMutation, resetChatInactivity]);

  // ── Wren activity ─────────────────────────────────────────────────────────
  const [wrenActivity, setWrenActivity] = useState<WrenActivity>("lookingup");
  const wrenVideoRef = useRef<HTMLVideoElement>(null);
  const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Ambient sound — persisted in localStorage ───────────────────────────────
  const [ambientSound, setAmbientSound] = useState<"silence" | "rain" | "cafe">(() => {
    try { const s = localStorage.getItem("continuary-ambient-sound"); return (s === "rain" || s === "cafe") ? s : "silence"; } catch { return "silence"; }
  });
  const [ambientVolume, setAmbientVolume] = useState(() => {
    try { const v = Number(localStorage.getItem("continuary-ambient-vol")); return isNaN(v) ? 30 : v; } catch { return 30; }
  });
  const handleSetAmbient = useCallback((s: "silence" | "rain" | "cafe") => {
    setAmbientSound(s);
    try { localStorage.setItem("continuary-ambient-sound", s); } catch {}
  }, []);
  const handleSetVolume = useCallback((v: number) => {
    setAmbientVolume(v);
    try { localStorage.setItem("continuary-ambient-vol", String(v)); } catch {}
  }, []);
  useAmbientSound(ambientSound, ambientVolume / 100, phase === "active");

  // ── Timer ─────────────────────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

    // ── Wren status line rotation (every 6–10 min) ──────────────────────────
  const STATUS_LINES: Record<WrenActivity, string[]> = {
    reading:   ["Wren is reading", "Wren is in her notes", "Wren is thinking"],
    writing:   ["Wren is writing", "Wren is working", "Wren is making something"],
    weaving:   ["Wren is weaving", "Wren is in the work", "Wren is with you"],
    lookingup: ["Wren is checking in", "Wren is here"],
  };
  const [wrenStatusLine, setWrenStatusLine] = useState("Wren is here");
  const statusRotationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleNextStatus = useCallback((activity: WrenActivity) => {
    if (statusRotationRef.current) clearTimeout(statusRotationRef.current);
    const delay = (6 + Math.random() * 4) * 60 * 1000; // 6-10 min
    statusRotationRef.current = setTimeout(() => {
      const lines = STATUS_LINES[activity];
      setWrenStatusLine(lines[Math.floor(Math.random() * lines.length)]);
      scheduleNextStatus(activity);
    }, delay);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wren activity rotation ────────────────────────────────────────────
  const scheduleNextActivity = useCallback((currentActivity: WrenActivity, isLast5: boolean) => {
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    const activities: WrenActivity[] = isLast5
      ? ["weaving", "weaving", "weaving"]
      : ["reading", "writing", "weaving"];
    const next = activities.filter((a) => a !== currentActivity)[Math.floor(Math.random() * 2)];
    const delay = (4 + Math.random() * 4) * 60 * 1000; // 4-8 min
    activityTimerRef.current = setTimeout(() => {
      setWrenActivity(next);
      setWrenStatusLine(STATUS_LINES[next][0]);
      scheduleNextStatus(next);
      scheduleNextActivity(next, isLast5);
    }, delay);
  }, [scheduleNextStatus]); // eslint-disable-line react-hooks/exhaustive-deps);

  // Switch Wren video when activity changes
  useEffect(() => {
    const video = wrenVideoRef.current;
    if (!video) return;
    video.src = WREN_VIDEOS[wrenActivity];
    video.load();
    video.play().catch(() => {});
  }, [wrenActivity]);

  // ── Esc key — always provides an exit ────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (phase === "active") {
        // Esc during active session triggers end-early (goes to closure)
        stopTimer();
        if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
        setPhase("closure");
        setWrenActivity("lookingup");
      } else if (phase === "idle" || phase === "reveal") {
        navigate("/");
      } else {
        // intake / duration / closure — go back to idle
        setPhase("idle");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, navigate, stopTimer]);

  // ── Start session ─────────────────────────────────────────────────────────
  const handleStartSession = useCallback(async () => {
    if (!limitData?.canStart && !limitData?.isPro) {
      toast.error("You've used your free session this week. Upgrade to Pro for unlimited sessions.");
      return;
    }
    try {
      // Compute hard stop UTC ms from local HH:MM
      let hardStopMs: number | undefined;
      if (hardStop) {
        const [hh, mm] = hardStop.split(":").map(Number);
        const hs = new Date();
        hs.setHours(hh, mm, 0, 0);
        if (hs.getTime() > Date.now()) hardStopMs = hs.getTime();
      }
      const result = await startMutation.mutateAsync({
        intention: intention.trim() || undefined,
        durationMinutes,
        hardStop: hardStopMs,
      });
      setSessionId(result.id);
      setSecondsLeft(durationMinutes * 60);
      setMidSessionShown(false);
      setChatMessages([]);
      setChatCollapsed(false);
      // Reset Surface tracking
      setSurfaceVisible(false);
      hardStopMsRef.current = hardStopMs ?? null;
      lastSurfaceElapsedRef.current = 0;
      hardStopWarnedRef.current = false;
      setPhase("active");
      setWrenActivity("reading");
      scheduleNextActivity("reading", false);
      scheduleCheckIns(durationMinutes);

      // Show Wren's opening message — time-of-day vibe shift
      const hour = new Date().getHours();
      const openingLine =
        hour >= 5  && hour < 8  ? "You're early. Good. Let's start soft." :
        hour >= 8  && hour < 12 ? "I'm here. Let's work." :
        hour >= 12 && hour < 15 ? "Right after lunch. Good time to focus. I'm with you." :
        hour >= 15 && hour < 18 ? "The afternoon stretch. I've got you." :
        hour >= 18 && hour < 22 ? "Evening session. I'll keep it quiet." :
        hour >= 22 || hour < 1  ? "Late one. Okay. I'll be quiet." :
        "You're here at this hour. I'll sit with you.";
      setWrenMessage(openingLine);
      setTimeout(() => setWrenMessage(null), 5000);
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
        const elapsed = total - next;

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

        // ── Surface triggers ────────────────────────────────────────────────
        // 1. Every 25 minutes of elapsed time
        const SURFACE_INTERVAL_SECS = 25 * 60;
        if (
          elapsed > 0 &&
          elapsed % SURFACE_INTERVAL_SECS === 0 &&
          elapsed !== lastSurfaceElapsedRef.current
        ) {
          lastSurfaceElapsedRef.current = elapsed;
          setSurfaceTrigger("interval");
          setSurfaceVisible(true);
        }

        // 2. Approaching hard stop — 5 min before
        if (hardStopMsRef.current && !hardStopWarnedRef.current) {
          const msUntilHardStop = hardStopMsRef.current - Date.now();
          if (msUntilHardStop > 0 && msUntilHardStop <= 5 * 60 * 1000) {
            hardStopWarnedRef.current = true;
            setSurfaceTrigger("approaching_hard_stop");
            setSurfaceVisible(true);
          }
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

  // ── Surface card handlers ────────────────────────────────────────────────
  const handleSurfaceDismiss = useCallback(() => {
    const elapsed = durationMinutes * 60 - secondsLeft;
    logSurfaceEventMutation.mutate({
      sessionId: sessionId ?? undefined,
      elapsedSeconds: elapsed,
      trigger: surfaceTrigger,
      userResponse: "dismissed",
    });
    setSurfaceVisible(false);
  }, [durationMinutes, secondsLeft, sessionId, surfaceTrigger, logSurfaceEventMutation]);

  const handleSurfaceTakeBreak = useCallback(() => {
    const elapsed = durationMinutes * 60 - secondsLeft;
    logSurfaceEventMutation.mutate({
      sessionId: sessionId ?? undefined,
      elapsedSeconds: elapsed,
      trigger: surfaceTrigger,
      userResponse: "took_break",
    });
    setSurfaceVisible(false);
    stopTimer();
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    setPhase("closure");
    setWrenActivity("lookingup");
  }, [durationMinutes, secondsLeft, sessionId, surfaceTrigger, logSurfaceEventMutation, stopTimer]);

  const handleSurfaceEndSession = useCallback(() => {
    const elapsed = durationMinutes * 60 - secondsLeft;
    logSurfaceEventMutation.mutate({
      sessionId: sessionId ?? undefined,
      elapsedSeconds: elapsed,
      trigger: surfaceTrigger,
      userResponse: "ended_session",
    });
    setSurfaceVisible(false);
    stopTimer();
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    setPhase("closure");
    setWrenActivity("lookingup");
  }, [durationMinutes, secondsLeft, sessionId, surfaceTrigger, logSurfaceEventMutation, stopTimer]);

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
      {/* Persistent exit bar — always visible during any non-idle phase so users are never trapped */}
      {phase !== "idle" && phase !== "reveal" && (
        <div
          className="flex items-center justify-between px-4 py-2 border-b"
          style={{ borderColor: "oklch(0.16 0.03 240)", background: "oklch(0.08 0.015 240)" }}
        >
          <span className="text-xs" style={{ color: "oklch(0.42 0.04 240)" }}>
            {phase === "active" ? `${formatTime(secondsLeft)} remaining` : phase === "intake" ? "Setting intention" : phase === "duration" ? "Choose duration" : "Closing"}
          </span>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ color: "oklch(0.68 0.06 60)", background: "oklch(0.13 0.03 240)", border: "1px solid oklch(0.22 0.04 240)" }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Exit session
          </button>
        </div>
      )}
      {/* Header — dims during active session */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b transition-opacity duration-700"
        style={{
          borderColor: "oklch(0.20 0.03 240)",
          opacity: phase === "active" ? 0.3 : 1,
        }}
      >
        <div className="flex items-center gap-3">
          {/* Back button — always visible in idle/reveal so users are never trapped */}
          {(phase === "idle" || phase === "reveal") && (
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1 text-xs rounded-lg px-2 py-1.5"
              style={{ color: "oklch(0.55 0.04 240)", background: "oklch(0.13 0.03 240)", border: "1px solid oklch(0.20 0.04 240)" }}
              aria-label="Back to Today"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Today
            </button>
          )}
          <div>
            <h1 className="text-lg font-semibold tracking-tight" style={{ color: "oklch(0.92 0.08 65)" }}>
              Focus Sessions
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.04 240)" }}>
              with Wren
            </p>
          </div>
        </div>
              {artifactData && artifactData.sessions.length > 0 && (
          <div className="flex items-center gap-2">
            <WovenArtifact sessions={artifactData.sessions} totalSegments={artifactData.totalSegments} size="thumb" />
            <div className="text-right">
              <p className="text-xs font-medium" style={{ color: "oklch(0.80 0.08 65)" }}>
                {artifactData.totalSegments} {artifactData.totalSegments === 1 ? "session" : "sessions"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main layout — stacked on mobile, side-by-side on desktop */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden" style={{ minHeight: 0 }}>

        {/* ── Wren's panel — top strip on mobile (fixed height), left 45% on desktop ── */}
        <style>{`
          .wren-panel {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            overflow: hidden;
            flex-shrink: 0;
            background: oklch(0.07 0.02 240);
            height: min(42vw, 300px);
            width: 100%;
          }
          @media (min-width: 768px) {
            .wren-panel {
              height: 100%;
              width: 45%;
            }
          }
        `}</style>
        <div className="wren-panel">
          {/* Full-bleed Wren video — fills the entire left panel */}
          <video
            ref={wrenVideoRef}
            src={WREN_VIDEOS[wrenActivity]}
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              mixBlendMode: "screen",
              filter: "brightness(1.15) saturate(1.3)",
            }}
          />

          {/* Wren message bubble — floats over video */}
          {wrenMessage && (
            <div
              className="absolute top-8 left-1/2 -translate-x-1/2 z-10 px-5 py-3 rounded-2xl text-sm text-center max-w-[260px]"
              style={{
                background: "oklch(0.12 0.04 240 / 0.85)",
                border: "1px solid oklch(0.35 0.08 65 / 0.6)",
                color: "oklch(0.92 0.08 65)",
                backdropFilter: "blur(8px)",
                animation: "fadeIn 0.4s ease",
              }}
            >
              {wrenMessage}
            </div>
          )}

          {/* Activity label — bottom of Wren panel */}
          {phase === "active" && (
            <p
              className="relative z-10 mb-6 text-[11px] tracking-widest uppercase"
              style={{ color: "oklch(0.45 0.04 240)" }}
            >
              {wrenStatusLine}
            </p>
          )}

          {/* Subtle gradient at bottom to ground Wren */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            style={{ background: "linear-gradient(to top, oklch(0.07 0.02 240), transparent)" }}
          />
        </div>

        {/* ── User workspace — right 50% ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 gap-8 overflow-y-auto">

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

              {/* Session history — fills the lower screen in idle phase */}
              {artifactData && artifactData.sessions.length > 0 && (
                <div className="w-full max-w-sm mt-8">
                  <p className="text-xs uppercase tracking-widest mb-3 text-left" style={{ color: "oklch(0.40 0.04 240)" }}>
                    Your focus record
                  </p>
                  <div className="flex gap-4 items-start">
                    <WovenArtifact sessions={artifactData.sessions} totalSegments={artifactData.totalSegments} size="full" />
                    <div className="flex-1 flex flex-col gap-2">
                      {artifactData.sessions.slice(-5).reverse().map((s) => (
                        <div
                          key={s.id}
                          className="rounded-lg px-3 py-2"
                          style={{ background: "oklch(0.13 0.02 240)", border: "1px solid oklch(0.20 0.04 240)" }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: WHAT_MOVED_COLORS[s.whatMoved ?? "thinking"] }}
                            />
                            <span className="text-xs font-medium" style={{ color: "oklch(0.78 0.06 65)" }}>
                              {s.durationMinutes ?? 25} min
                            </span>
                            {s.completedAt && (
                              <span className="text-[10px] ml-auto" style={{ color: "oklch(0.38 0.03 240)" }}>
                                {new Date(s.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] mt-0.5 capitalize" style={{ color: "oklch(0.48 0.04 240)" }}>
                            {s.whatMoved === "progress" ? "Made progress" : s.whatMoved === "thinking" ? "Mostly thinking" : s.whatMoved === "stuck" ? "Stuck or scattered" : "Session"}
                          </p>
                        </div>
                      ))}
                      {artifactData.sessions.length > 5 && (
                        <p className="text-[10px]" style={{ color: "oklch(0.35 0.03 240)" }}>
                          +{artifactData.sessions.length - 5} earlier sessions
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state hint when no sessions yet */}
              {(!artifactData || artifactData.sessions.length === 0) && (
                <div className="mt-8 text-center max-w-xs">
                  <p className="text-xs" style={{ color: "oklch(0.32 0.03 240)" }}>
                    Each session weaves a row into your focus record. Start your first one above.
                  </p>
                </div>
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
              {/* Hard stop pre-set */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <label className="text-xs" style={{ color: "oklch(0.50 0.04 240)" }}>Hard stop at</label>
                <input
                  type="time"
                  value={hardStop}
                  onChange={(e) => setHardStop(e.target.value)}
                  className="text-xs rounded px-2 py-1"
                  style={{
                    background: "oklch(0.14 0.03 240)",
                    border: "1px solid oklch(0.25 0.05 240)",
                    color: hardStop ? "oklch(0.88 0.08 65)" : "oklch(0.40 0.03 240)",
                    colorScheme: "dark",
                  }}
                />
                {hardStop && (
                  <button
                    onClick={() => setHardStop("")}
                    className="text-xs opacity-50 hover:opacity-80"
                    style={{ color: "oklch(0.60 0.04 240)" }}
                  >
                    clear
                  </button>
                )}
              </div>
              <Button
                onClick={handleStartSession}
                disabled={startMutation.isPending}
                className="px-10 py-3 text-base"
                style={{ background: "oklch(0.72 0.16 65)", color: "oklch(0.10 0.02 240)" }}
              >
                {startMutation.isPending ? "Starting…" : "Begin →"}
              </Button>
              <p className="text-xs mt-4 opacity-40" style={{ color: "oklch(0.70 0.04 240)" }}>
                Not ready yet?{" "}
                <button
                  onClick={() => {
                    setWrenActivity("lookingup");
                    setWrenMessage("Take a breath. I'll be here.");
                    setTimeout(() => setWrenMessage(null), 4000);
                  }}
                  className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                  Take a breath first
                </button>
              </p>
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

              {/* Hard stop countdown */}
              {hardStopMsRef.current && (() => {
                const msLeft = hardStopMsRef.current! - Date.now();
                if (msLeft <= 0) return null;
                const minLeft = Math.ceil(msLeft / 60000);
                return (
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4 text-xs"
                    style={{
                      background: minLeft <= 5 ? "oklch(0.22 0.08 30 / 0.5)" : "oklch(0.16 0.04 240)",
                      border: `1px solid ${minLeft <= 5 ? "oklch(0.50 0.12 30 / 0.5)" : "oklch(0.28 0.05 240)"}`,
                      color: minLeft <= 5 ? "oklch(0.80 0.10 30)" : "oklch(0.60 0.04 240)",
                    }}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Hard stop in {minLeft} min
                  </div>
                );
              })()}

              {/* Ambient sound */}
              <div className="flex items-center justify-center gap-3 mb-8">
                {(["silence", "rain", "cafe"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSetAmbient(s)}
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
                    onChange={(e) => handleSetVolume(Number(e.target.value))}
                    className="w-20 accent-amber-400"
                  />
                )}
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setShowUnstickModal(true)}
                  className="text-xs opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1.5"
                  style={{ color: "oklch(0.72 0.16 65)" }}
                >
                  <span>⚡</span> I’m stuck
                </button>
                <span className="text-xs opacity-20" style={{ color: "oklch(0.60 0.04 240)" }}>·</span>
                <button
                  onClick={handleEndEarly}
                  className="text-xs opacity-40 hover:opacity-70 transition-opacity"
                  style={{ color: "oklch(0.60 0.04 240)" }}
                >
                  End session early
                </button>
              </div>

              {/* Wren chat panel */}
              <div
                className="w-full max-w-sm mt-6 rounded-xl overflow-hidden"
                style={{ background: "oklch(0.12 0.02 240)", border: "1px solid oklch(0.22 0.04 240)" }}
              >
                {/* Chat header */}
                <button
                  onClick={() => setChatCollapsed((c) => !c)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left"
                  style={{ borderBottom: chatCollapsed ? "none" : "1px solid oklch(0.18 0.03 240)" }}
                >
                  <span className="text-xs font-medium" style={{ color: "oklch(0.65 0.06 65)" }}>
                    {chatLoading ? "Wren is thinking…" : "Talk to Wren"}
                  </span>
                  <span className="text-xs" style={{ color: "oklch(0.40 0.03 240)" }}>
                    {chatCollapsed ? "▾" : "▴"}
                  </span>
                </button>

                {!chatCollapsed && (
                  <>
                    {/* Messages */}
                    <div
                      className="flex flex-col gap-2 px-3 py-3 overflow-y-auto"
                      style={{ maxHeight: 200 }}
                    >
                      {chatMessages.length === 0 && (
                        <p className="text-xs text-center py-2" style={{ color: "oklch(0.38 0.03 240)" }}>
                          Wren is here. Say something if you need to.
                        </p>
                      )}
                      {chatMessages.map((m) => (
                        <div
                          key={m.ts}
                          className={cn(
                            "text-xs rounded-lg px-3 py-2 max-w-[85%]",
                            m.role === "user" ? "self-end" : "self-start"
                          )}
                          style={{
                            background: m.role === "user" ? "oklch(0.20 0.05 240)" : "oklch(0.16 0.03 240)",
                            color: m.role === "user" ? "oklch(0.88 0.04 60)" : "oklch(0.75 0.06 65)",
                          }}
                        >
                          {m.content}
                        </div>
                      ))}
                      {chatLoading && (
                        <div
                          className="self-start text-xs rounded-lg px-3 py-2"
                          style={{ background: "oklch(0.16 0.03 240)", color: "oklch(0.45 0.03 240)" }}
                        >
                          …
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div
                      className="flex gap-2 px-3 pb-3"
                      style={{ borderTop: "1px solid oklch(0.18 0.03 240)", paddingTop: 8 }}
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                        placeholder="Type something…"
                        maxLength={300}
                        className="flex-1 text-xs rounded-lg px-3 py-2 outline-none"
                        style={{
                          background: "oklch(0.16 0.03 240)",
                          border: "1px solid oklch(0.24 0.04 240)",
                          color: "oklch(0.88 0.04 60)",
                        }}
                      />
                      <button
                        onClick={handleSendChat}
                        disabled={chatLoading || !chatInput.trim()}
                        className="text-xs px-3 py-2 rounded-lg disabled:opacity-30 transition-opacity"
                        style={{ background: "oklch(0.72 0.16 65)", color: "oklch(0.10 0.02 240)" }}
                      >
                        ↵
                      </button>
                    </div>
                  </>
                )}
              </div>
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
                Session logged.
              </p>
              <p className="text-sm mb-8" style={{ color: "oklch(0.55 0.04 240)" }}>
                Each session adds a row to your focus record below.
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
              <div className="mb-6 text-center">
                <p className="text-xs" style={{ color: "oklch(0.50 0.04 240)" }}>
                  {artifactData?.totalSegments ?? 0} sessions completed
                </p>
                <p className="text-[10px] mt-1" style={{ color: "oklch(0.38 0.03 240)" }}>
                  Gold = progress &middot; Cream = thinking &middot; Navy = stuck
                </p>
              </div>

              {/* Time Sense calibration widget */}
              {calibrationData && calibrationData.sampleCount >= 2 && (
                <div
                  className="mx-auto mb-6 rounded-xl px-5 py-4 text-left max-w-xs"
                  style={{ background: "oklch(0.13 0.03 240)", border: "1px solid oklch(0.22 0.05 240)" }}
                >
                  <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.72 0.12 65)" }}>
                    Your time sense
                  </p>
                  <p className="text-xs mb-1" style={{ color: "oklch(0.65 0.04 240)" }}>
                    Across {calibrationData.sampleCount} sessions, you typically take{" "}
                    <span style={{ color: "oklch(0.85 0.10 65)" }}>
                      {calibrationData.avgMultiplier !== null
                        ? calibrationData.avgMultiplier < 0.9
                          ? "less time than you estimate"
                          : calibrationData.avgMultiplier > 1.2
                          ? `${Math.round(calibrationData.avgMultiplier * 100 - 100)}% longer than you estimate`
                          : "about as long as you estimate"
                        : "—"}
                    </span>.
                  </p>
                  {calibrationData.recentMultiplier !== null && (
                    <p className="text-[10px]" style={{ color: "oklch(0.42 0.04 240)" }}>
                      Recent trend: {calibrationData.recentMultiplier.toFixed(1)}× your estimate
                    </p>
                  )}
                </div>
              )}
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

      </div>

      {/* Surface card — ambient check-in during active session */}
      {surfaceVisible && phase === "active" && (
        <SurfaceCard
          trigger={surfaceTrigger}
          minutesUntilHardStop={
            hardStopMsRef.current
              ? Math.max(0, Math.ceil((hardStopMsRef.current - Date.now()) / 60000))
              : undefined
          }
          onDismiss={handleSurfaceDismiss}
          onTakeBreak={handleSurfaceTakeBreak}
          onEndSession={handleSurfaceEndSession}
        />
      )}

      {/* Unstick modal — triggered from active session */}
      {showUnstickModal && (
        <UnstickModal
          task={{
            id: sessionId ? String(sessionId) : "session",
            title: intention.trim() || "this task",
            projectId: null,
          }}
          onClose={() => setShowUnstickModal(false)}
          entryMethod="manual"
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
