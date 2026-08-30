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
import notify from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import UnstickModal from "@/components/UnstickModal";
import { SurfaceCard, type SurfaceTrigger } from "@/components/SurfaceCard";
import WrenPopout from "@/components/WrenPopout";
import WrenPlayer, { type WrenClip } from "@/components/WrenPlayer";
import { UpgradeNudge } from "@/components/UpgradeNudge";
import { WREN_SURFACE_MEDIA } from "@/lib/wrenClips";

// ── Focus activity clips ─────────────────────────────────────────────────────────────────────────────────
type WrenActivity = "weaving" | "reading" | "writing" | "lookingup";
// Activity → WrenClip mapping (writing maps to reading since .mov was removed)
const ACTIVITY_CLIP: Record<WrenActivity, WrenClip> = {
  weaving:   "weaving",
  reading:   "reading",
  writing:   "reading",   // .mov removed — reading has the same calm energy
  lookingup: "lookingup",
};

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

/** Soft two-note chime played when Wren sends a chat reply */
function playWrenReplyChime() {
  try {
    const ctx = new AudioContext();
    // First note — gentle high tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.45);
    // Second note — slightly lower, delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(660, ctx.currentTime + 0.18);
    gain2.gain.setValueAtTime(0.0, ctx.currentTime + 0.18);
    gain2.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc2.start(ctx.currentTime + 0.18);
    osc2.stop(ctx.currentTime + 0.65);
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
  size?: "full" | "thumb" | "compact";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const w = size === "thumb" ? 80 : size === "compact" ? 200 : 280;
  const h = size === "thumb" ? 80 : size === "compact" ? 230 : 320;

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

function toLocalDateInput(date: Date): string {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

function defaultBookingTime(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return date.toTimeString().slice(0, 5);
}

function getBookingIdFromQuery(): number | null {
  const value = Number(new URLSearchParams(window.location.search).get("bookingId"));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

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
  const [bookingId, setBookingId] = useState(getBookingIdFromQuery);
  const bookingAccessEnabled = Boolean(limitData?.isPro);
  const { data: upcomingBookings, refetch: refetchUpcomingBookings } = trpc.focusSessions.listBookings.useQuery(undefined, {
    enabled: bookingAccessEnabled,
    staleTime: 30_000,
  });
  const { data: bookedSessionForLaunch, error: bookedSessionLaunchError } = trpc.focusSessions.getBookingForLaunch.useQuery(
    { bookingId: bookingId ?? 1 },
    { enabled: bookingId !== null && bookingAccessEnabled, retry: false },
  );
  const createBookingMutation = trpc.focusSessions.createBooking.useMutation({
    onSuccess: async () => {
      await refetchUpcomingBookings();
      notify.saved("Focus Session booked.");
    },
    onError: (error) => notify.error(error.message || "Couldn’t book that session — try again."),
  });
  const cancelBookingMutation = trpc.focusSessions.cancelBooking.useMutation({
    onSuccess: async () => {
      await refetchUpcomingBookings();
      notify.saved("Booked session cancelled.");
    },
    onError: (error) => notify.error(error.message || "Couldn’t cancel that session — try again."),
  });

  // ── Session state ─────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [intention, setIntention] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<10 | 30 | 60 | 90>(10);
  const [hardStop, setHardStop] = useState<string>(""); // "HH:MM" local time
  const [bookingPanelOpen, setBookingPanelOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState(() => toLocalDateInput(new Date()));
  const [bookingTime, setBookingTime] = useState(defaultBookingTime);
  const [bookingIntention, setBookingIntention] = useState("");
  const [bookingDurationMinutes, setBookingDurationMinutes] = useState<10 | 30 | 60 | 90>(30);
  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);
  const [showUnstickModal, setShowUnstickModal] = useState(false);
  const [showPopoutUpgrade, setShowPopoutUpgrade] = useState(false);
  const [pipOpen, setPipOpen] = useState(false);
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
  const appliedBookingRef = useRef<number | null>(null);

  useEffect(() => {
    const syncBookingId = () => setBookingId(getBookingIdFromQuery());
    window.addEventListener("popstate", syncBookingId);
    return () => window.removeEventListener("popstate", syncBookingId);
  }, []);

  useEffect(() => {
    if (!bookedSessionForLaunch || appliedBookingRef.current === bookedSessionForLaunch.id) return;
    appliedBookingRef.current = bookedSessionForLaunch.id;
    setIntention(bookedSessionForLaunch.intention ?? "");
    setDurationMinutes(bookedSessionForLaunch.durationMinutes as 10 | 30 | 60 | 90);
    setActiveBookingId(bookedSessionForLaunch.id);
    setPhase("duration");
    notify.saved("Your booked Focus Session is ready.");
    window.history.replaceState({}, "", window.location.pathname);
  }, [bookedSessionForLaunch]);

  useEffect(() => {
    if (!bookedSessionLaunchError || bookingId === null) return;
    notify.error(bookedSessionLaunchError.message || "That booked session is not ready yet.");
    window.history.replaceState({}, "", window.location.pathname);
  }, [bookedSessionLaunchError, bookingId]);
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
    if (durationMin === 30) addCheckIn(15 * 60 * 1000);
    if (durationMin === 60) addCheckIn(30 * 60 * 1000);
    if (durationMin === 90) { addCheckIn(30 * 60 * 1000); addCheckIn(60 * 60 * 1000); }
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
      playWrenReplyChime();
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "still here.", ts: Date.now() }]);
      playWrenReplyChime();
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, chatMessages, durationMinutes, secondsLeft, intention, wrenChatMutation, resetChatInactivity]);

  // ── Companion window chat relay ────────────────────────────────────────────
  // WrenPopout dispatches "wren-companion-chat" when the companion window sends a
  // SEND_CHAT message. We handle it here so the full chat pipeline (divergence
  // detection, LLM call, state update) runs in the main tab.
  useEffect(() => {
    const handleCompanionChat = async (e: Event) => {
      const { message } = (e as CustomEvent<{ message: string }>).detail;
      if (!message || chatLoading) return;
      setChatLoading(true);
      resetChatInactivity();
      checkDivergence(message);
      const userMsg: ChatMsg = { role: "user", content: message, ts: Date.now() };
      setChatMessages((prev) => [...prev, userMsg]);
      try {
        const elapsedMinutes = Math.floor((durationMinutes * 60 - secondsLeft) / 60);
        const history = [...chatMessages, userMsg].slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 400) }));
        const { reply } = await wrenChatMutation.mutateAsync({
          message,
          intention: intention.trim() || undefined,
          durationMinutes,
          elapsedMinutes,
          clientHour: new Date().getHours(),
          chatHistory: history,
        });
        setChatMessages((prev) => [...prev, { role: "assistant", content: String(reply ?? "still here."), ts: Date.now() }]);
        playWrenReplyChime();
      } catch {
        setChatMessages((prev) => [...prev, { role: "assistant", content: "still here.", ts: Date.now() }]);
        playWrenReplyChime();
      } finally {
        setChatLoading(false);
      }
    };
    window.addEventListener("wren-companion-chat", handleCompanionChat);
    return () => window.removeEventListener("wren-companion-chat", handleCompanionChat);
  }, [chatLoading, chatMessages, durationMinutes, secondsLeft, intention, wrenChatMutation, resetChatInactivity, checkDivergence]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wren activity ─────────────────────────────────────────────────────────
  const [wrenActivity, setWrenActivity] = useState<WrenActivity>("lookingup");
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
      notify.error("Free session used for this week.", { description: "Upgrade to Pro for unlimited sessions." });
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
        bookingId: activeBookingId ?? undefined,
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
      notify.error("Couldn't start the session — try again.");
    }
  }, [limitData, intention, durationMinutes, hardStop, startMutation, scheduleNextActivity, activeBookingId]);

  const handleLaunchBookedSession = useCallback((booking: { id: number; intention: string | null; durationMinutes: number }) => {
    setIntention(booking.intention ?? "");
    setDurationMinutes(booking.durationMinutes as 10 | 30 | 60 | 90);
    setActiveBookingId(booking.id);
    setPhase("duration");
  }, []);

  const handleBookSession = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    const [year, month, day] = bookingDate.split("-").map(Number);
    const [hour, minute] = bookingTime.split(":").map(Number);
    const scheduledFor = new Date(year, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0, 0, 0);
    if (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now() + 60_000) {
      notify.error("Choose a time at least one minute from now.");
      return;
    }
    try {
      await createBookingMutation.mutateAsync({
        scheduledFor,
        durationMinutes: bookingDurationMinutes,
        intention: bookingIntention.trim() || undefined,
      });
      setBookingPanelOpen(false);
      setBookingIntention("");
    } catch {
      // The mutation displays the actionable server error.
    }
  }, [bookingDate, bookingTime, bookingDurationMinutes, bookingIntention, createBookingMutation]);

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
      notify.error("Session couldn't be saved — try again.");
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
  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >

      {/* ── NON-ACTIVE header: shown for all non-active phases ─────────────── */}
      {phase !== "active" && (
        <>
          {/* Exit bar — visible during intake/duration/closure */}
          {phase !== "idle" && phase !== "reveal" && (
            <div
              className="flex items-center justify-between px-4 py-2 border-b"
              style={{ borderColor: "oklch(0.16 0.03 240)", background: "oklch(0.08 0.015 240)" }}
            >
              <span className="text-xs" style={{ color: "oklch(0.42 0.04 240)" }}>
                {phase === "intake" ? "Setting intention" : phase === "duration" ? "Choose duration" : "Closing"}
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
          {/* Page header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: "oklch(0.20 0.03 240)" }}
          >
            <div className="flex items-center gap-3">
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
                <h1 className="text-lg font-semibold tracking-tight" style={{ color: "oklch(0.74 0.14 72)" }}>
                  Focus Sessions
                </h1>
                <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.04 240)" }}>
                  with Wren
                </p>
              </div>
            </div>
            {artifactData && artifactData.sessions.length > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <WovenArtifact sessions={artifactData.sessions} totalSegments={artifactData.totalSegments} size="thumb" />
                <div className="text-right">
                  <p className="text-xs font-medium" style={{ color: "oklch(0.74 0.14 72)" }}>
                    {artifactData.totalSegments} {artifactData.totalSegments === 1 ? "session" : "sessions"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── ACTIVE phase: full-bleed 50/50 grid ──────────────────────────────── */}
      {phase === "active" && (
        <div
          className="flex flex-1 flex-col overflow-x-hidden md:grid"
          style={{
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr",
          }}
        >
          {/* Floating utility bar */}
          <div
            className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-4 py-2 md:absolute md:top-0 md:left-0 md:right-0"
            style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--background) 92%, transparent), transparent)" }}
          >
            <span className="text-xs font-mono" style={{ color: "oklch(0.50 0.04 240)" }}>
              {formatTime(secondsLeft)} remaining
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (limitData?.isPro) setPipOpen(true);
                  else setShowPopoutUpgrade(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ color: "oklch(0.72 0.14 72)", background: "oklch(0.10 0.03 72 / 0.6)", border: "1px solid oklch(0.30 0.10 72 / 0.4)" }}
                title="Float Wren in a small window so you can work in other apps"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="7" width="14" height="10" rx="1.5" />
                  <path d="M16 11l4-4m0 0h-4m4 0v4" />
                </svg>
                Pop out Wren
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ color: "oklch(0.68 0.06 60)", background: "oklch(0.10 0.02 240 / 0.7)", border: "1px solid oklch(0.22 0.04 240 / 0.5)" }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Exit session
              </button>
            </div>
          </div>
          {showPopoutUpgrade && (
            <UpgradeNudge
              moment="wren-popout"
              friction
              className="absolute right-4 top-12 z-20 w-[min(22rem,calc(100%-2rem))]"
              title="Take Wren with you when you switch windows."
              body="Pro adds Pop-out Wren, so your companion can stay nearby while you work elsewhere."
            />
          )}

          {/* LEFT — Wren's full companion scene stays present throughout the session. */}
          <div className="relative min-h-[18rem] min-w-0 overflow-hidden md:min-h-0" style={{ background: "var(--background)" }}>
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 52% 46%, oklch(0.42 0.12 65 / 0.24), transparent 58%), radial-gradient(circle at 72% 22%, oklch(0.55 0.14 65 / 0.12), transparent 36%)" }} />
            <div className="absolute inset-x-6 top-12 bottom-9 z-[1] md:top-16">
              <WrenPlayer
                clip={ACTIVITY_CLIP[wrenActivity]}
                size="full"
                stage={false}
                fallbackStill="siliconeNeutral"
                wrapperClassName="h-full w-full"
                className="drop-shadow-[0_18px_50px_rgba(212,168,83,0.18)]"
              />
            </div>
            <p className="absolute left-6 top-4 z-[2] max-w-[15rem] text-sm leading-6 md:top-7" style={{ color: "oklch(0.78 0.06 65 / 0.82)" }}>
              Wren is working alongside you.
            </p>
            {/* Soft right-edge gradient scrim */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent 55%, color-mix(in srgb, var(--background) 95%, transparent))" }}
            />
            {/* Bottom gradient */}
            <div
              className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
              style={{ background: "linear-gradient(to top, color-mix(in srgb, var(--background) 70%, transparent), transparent)" }}
            />
            {/* Wren message bubble */}
            {wrenMessage && (
              <div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 px-4 py-2.5 rounded-2xl text-sm text-center max-w-[220px]"
                style={{
                  background: "var(--card)",
                  border: "1px solid color-mix(in srgb, var(--primary) 45%, var(--border))",
                  color: "var(--accent-tint-text)",
                  backdropFilter: "blur(8px)",
                  animation: "fadeIn 0.4s ease",
                }}
              >
                {wrenMessage}
              </div>
            )}
            {/* Activity label */}
            <p
              className="absolute bottom-2 left-0 right-0 text-center z-10 text-[10px] tracking-widest uppercase"
              style={{ color: "oklch(0.35 0.04 240)" }}
            >
              {wrenStatusLine}
            </p>
          </div>

          {/* RIGHT — timer + controls, vertically centered */}
          <div
            className="flex flex-col items-center justify-center px-5 py-7 overflow-y-auto md:px-6 md:py-0"
            style={{ paddingTop: 0 }}
          >
            <div className="w-full max-w-xs text-center">

              {/* Progress ring */}
              <div className="relative mx-auto mb-3" style={{ width: 140, height: 140 }}>
                <svg width="140" height="140" className="absolute inset-0 -rotate-90">
                  <circle cx="70" cy="70" r="60" fill="none" stroke="oklch(0.15 0.03 240)" strokeWidth="5" />
                  <circle
                    cx="70" cy="70" r="60"
                    fill="none"
                    stroke="oklch(0.72 0.14 72)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 60}`}
                    strokeDashoffset={`${2 * Math.PI * 60 * (1 - progressPct / 100)}`}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-log font-bold tracking-tight" style={{ color: "oklch(0.74 0.14 72)" }}>
                    {formatTime(secondsLeft)}
                  </span>
                  <span className="text-[10px] mt-0.5" style={{ color: "oklch(0.42 0.04 240)" }}>
                    {durationMinutes} min
                  </span>
                </div>
              </div>

              {intention.trim() && (
                <p className="text-[11px] italic mb-3 leading-relaxed" style={{ color: "oklch(0.50 0.04 240)" }}>
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3 text-[10px]"
                    style={{
                      background: minLeft <= 5 ? "oklch(0.20 0.08 30 / 0.5)" : "oklch(0.14 0.03 240)",
                      border: `1px solid ${minLeft <= 5 ? "oklch(0.45 0.12 30 / 0.5)" : "oklch(0.22 0.04 240)"}`,
                      color: minLeft <= 5 ? "oklch(0.78 0.10 30)" : "oklch(0.50 0.04 240)",
                    }}
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Hard stop in {minLeft} min
                  </div>
                );
              })()}

              {/* Ambient sound */}
              <div className="flex items-center justify-center gap-1.5 mb-4">
                {(["silence", "rain", "cafe"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSetAmbient(s)}
                    className="text-[10px] px-2.5 py-1 rounded-full transition-all active:scale-[0.97]"
                    style={{
                      background: ambientSound === s ? "oklch(0.18 0.04 240)" : "transparent",
                      border: `1px solid ${ambientSound === s ? "oklch(0.30 0.06 240)" : "oklch(0.20 0.03 240)"}`,
                      color: ambientSound === s ? "oklch(0.78 0.06 65)" : "oklch(0.42 0.03 240)",
                      fontWeight: ambientSound === s ? 600 : 400,
                    }}
                  >
                    {s === "silence" ? "Silence" : s === "rain" ? "Rain" : "Café"}
                  </button>
                ))}
                {ambientSound !== "silence" && (
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={ambientVolume}
                    onChange={(e) => handleSetVolume(Number(e.target.value))}
                    className="w-14 accent-amber-400"
                  />
                )}
              </div>

              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={() => setShowUnstickModal(true)}
                  className="text-[11px] transition-opacity hover:opacity-100 opacity-70 flex items-center gap-1"
                  style={{ color: "oklch(0.72 0.14 72)" }}
                >
                  <span>⚡</span> Stuck
                </button>
                <span className="text-[10px] opacity-15" style={{ color: "oklch(0.60 0.04 240)" }}>·</span>
                <button
                  onClick={handleEndEarly}
                  className="text-[11px] opacity-30 hover:opacity-60 transition-opacity"
                  style={{ color: "oklch(0.60 0.04 240)" }}
                >
                  End early
                </button>
              </div>

              {/* Wren chat */}
              <div
                className="w-full rounded-2xl overflow-hidden"
                style={{ background: "oklch(0.11 0.02 240)", border: "1px solid oklch(0.18 0.03 240)" }}
              >
                <button
                  onClick={() => setChatCollapsed((c) => !c)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left"
                  style={{ borderBottom: chatCollapsed ? "none" : "1px solid oklch(0.16 0.03 240)" }}
                >
                  <span className="text-[11px] font-medium" style={{ color: "oklch(0.60 0.08 72)" }}>
                    {chatLoading ? "Wren is thinking…" : "Talk to Wren"}
                  </span>
                  <svg
                    className="w-3.5 h-3.5 transition-transform"
                    style={{
                      color: "oklch(0.35 0.03 240)",
                      transform: chatCollapsed ? "rotate(0deg)" : "rotate(180deg)"
                    }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {!chatCollapsed && (
                  <>
                    <div
                      className="flex flex-col gap-2 px-3 py-3 overflow-y-auto"
                      style={{ maxHeight: 160 }}
                    >
                      {chatMessages.length === 0 && (
                        <p className="text-[10px] text-center py-2 leading-relaxed" style={{ color: "oklch(0.32 0.03 240)" }}>
                          Wren is here. Say something if you need to.
                        </p>
                      )}
                      {chatMessages.map((m) => (
                        <div
                          key={m.ts}
                          className={cn(
                            "text-[11px] rounded-xl px-3 py-2 max-w-[88%] leading-relaxed",
                            m.role === "user" ? "self-end" : "self-start"
                          )}
                          style={{
                            background: m.role === "user" ? "oklch(0.18 0.04 240)" : "oklch(0.14 0.03 240)",
                            color: m.role === "user" ? "oklch(0.85 0.04 60)" : "oklch(0.60 0.08 72)",
                          }}
                        >
                          {m.content}
                        </div>
                      ))}
                      {chatLoading && (
                        <div
                          className="self-start text-[11px] rounded-xl px-3 py-2"
                          style={{ background: "oklch(0.14 0.03 240)", color: "oklch(0.38 0.03 240)" }}
                        >
                          …
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    <div
                      className="flex gap-2 px-3 pb-3"
                      style={{ borderTop: "1px solid oklch(0.15 0.02 240)", paddingTop: 8 }}
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                        placeholder="Say something…"
                        maxLength={300}
                        className="flex-1 text-[11px] rounded-xl px-3 py-2 outline-none"
                        style={{
                          background: "oklch(0.14 0.02 240)",
                          border: "1px solid oklch(0.20 0.04 240)",
                          color: "oklch(0.88 0.04 60)",
                          caretColor: "oklch(0.72 0.14 72)",
                        }}
                      />
                      <button
                        onClick={handleSendChat}
                        disabled={chatLoading || !chatInput.trim()}
                        className="text-[11px] px-3 py-2 rounded-xl disabled:opacity-30 transition-opacity active:scale-[0.97]"
                        style={{ background: "oklch(0.72 0.14 72)", color: "oklch(0.10 0.02 240)" }}
                      >
                        →
                      </button>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── NON-ACTIVE content: Wren panel + phase blocks ────────────────────── */}
      {phase !== "active" && (
        <div className="flex flex-1 flex-col overflow-x-hidden md:flex-row">

          {/* LEFT — Wren video panel (hidden on reveal) */}
          {phase !== "reveal" && (
            <div
              className="relative h-64 w-full shrink-0 overflow-hidden md:h-auto md:w-1/2"
              style={{ background: "var(--background)" }}
            >
              <WrenPlayer
                key={wrenActivity}
                clip={phase === "idle" ? WREN_SURFACE_MEDIA.focusLanding.clip : ACTIVITY_CLIP[wrenActivity]}
                size="full"
                objectFit="cover"
                fallbackStill={phase === "idle" ? WREN_SURFACE_MEDIA.focusLanding.fallbackStill : "siliconeNeutral"}
                wrapperClassName="absolute inset-0"
                className="brightness-[1.15] saturate-[1.3]"
              />
              {wrenMessage && (
                <div
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2.5 rounded-2xl text-sm text-center max-w-[220px]"
                  style={{
                    background: "var(--card)",
                    border: "1px solid color-mix(in srgb, var(--primary) 45%, var(--border))",
                    color: "var(--accent-tint-text)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {wrenMessage}
                </div>
              )}
              <div
                className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                style={{ background: "linear-gradient(to top, color-mix(in srgb, var(--background) 70%, transparent), transparent)" }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(90deg, transparent 55%, color-mix(in srgb, var(--background) 95%, transparent))" }}
              />
            </div>
          )}

          {/* RIGHT — phase controls */}
          <div
            className={cn(
              "relative z-10 mt-3 flex w-full flex-col items-center justify-center border-t bg-background px-5 py-7 overflow-y-auto md:mt-0 md:border-t-0 md:bg-transparent md:px-6 md:py-0",
              phase === "reveal" ? "md:w-full" : "md:w-1/2"
            )}
            style={{ borderColor: "color-mix(in srgb, var(--border) 72%, transparent)" }}
          >
            <div className="w-full max-w-xs">

              {/* IDLE */}
              {phase === "idle" && (
                <div className="text-center w-full">
                  <p
                    className="font-light leading-snug mb-2"
                    style={{ fontSize: "clamp(1.1rem, 3.5vw, 1.35rem)", color: "oklch(0.74 0.14 72)" }}
                  >
                    Ready when you are.
                  </p>
                  <p className="text-xs mb-6 leading-relaxed" style={{ color: "oklch(0.48 0.04 240)" }}>
                    Wren sits with you while you work.
                  </p>
                  {showPaywall ? (
                    <UpgradeNudge
                      moment="focus-weekly-limit"
                      friction
                      className="mb-4 text-left"
                      title="You have used this week’s Focus Session."
                      body="Pro makes Focus Sessions unlimited, so you can keep going when another supported work block would help."
                    />
                  ) : (
                    <button
                      onClick={() => setPhase("intake")}
                      className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-all hover:opacity-90 active:scale-[0.97] mb-4"
                      style={{ background: "oklch(0.72 0.14 72)", color: "oklch(0.10 0.02 240)" }}
                    >
                      Begin session
                    </button>
                  )}

                  {limitData?.isPro ? (
                    <section className="mt-3 rounded-xl border p-3 text-left" style={{ borderColor: "oklch(0.22 0.05 240)", background: "oklch(0.11 0.02 240)" }}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold" style={{ color: "oklch(0.78 0.10 65)" }}>Book ahead</p>
                          <p className="mt-0.5 text-[10px] leading-relaxed" style={{ color: "oklch(0.48 0.04 240)" }}>Choose a future time and Wren will send a reminder when it&apos;s ready.</p>
                        </div>
                        <button
                          onClick={() => setBookingPanelOpen((open) => !open)}
                          className="shrink-0 rounded-lg px-3 py-2 text-[11px] font-semibold"
                          style={{ background: "oklch(0.16 0.04 240)", color: "oklch(0.78 0.10 65)", border: "1px solid oklch(0.30 0.08 72)" }}
                        >
                          {bookingPanelOpen ? "Close" : "Book a session"}
                        </button>
                      </div>

                      {bookingPanelOpen && (
                        <form onSubmit={handleBookSession} className="mt-4 space-y-3 border-t pt-3" style={{ borderColor: "oklch(0.20 0.04 240)" }}>
                          <label className="block text-[11px]" style={{ color: "oklch(0.65 0.04 240)" }}>
                            When
                            <span className="mt-1.5 grid grid-cols-2 gap-2">
                              <input
                                type="date"
                                value={bookingDate}
                                min={toLocalDateInput(new Date())}
                                onChange={(event) => setBookingDate(event.target.value)}
                                required
                                className="w-full rounded-lg px-2 py-2 text-[11px] outline-none"
                                style={{ background: "oklch(0.12 0.02 240)", border: "1px solid oklch(0.22 0.04 240)", color: "oklch(0.85 0.04 60)", colorScheme: "dark" }}
                              />
                              <input
                                type="time"
                                value={bookingTime}
                                onChange={(event) => setBookingTime(event.target.value)}
                                required
                                className="w-full rounded-lg px-2 py-2 text-[11px] outline-none"
                                style={{ background: "oklch(0.12 0.02 240)", border: "1px solid oklch(0.22 0.04 240)", color: "oklch(0.85 0.04 60)", colorScheme: "dark" }}
                              />
                            </span>
                          </label>
                          <label className="block text-[11px]" style={{ color: "oklch(0.65 0.04 240)" }}>
                            Session length
                            <select
                              value={bookingDurationMinutes}
                              onChange={(event) => setBookingDurationMinutes(Number(event.target.value) as 10 | 30 | 60 | 90)}
                              className="mt-1.5 w-full rounded-lg px-2 py-2 text-[11px] outline-none"
                              style={{ background: "oklch(0.12 0.02 240)", border: "1px solid oklch(0.22 0.04 240)", color: "oklch(0.85 0.04 60)" }}
                            >
                              <option value={10}>10 minutes</option>
                              <option value={30}>30 minutes</option>
                              <option value={60}>60 minutes</option>
                              <option value={90}>90 minutes</option>
                            </select>
                          </label>
                          <label className="block text-[11px]" style={{ color: "oklch(0.65 0.04 240)" }}>
                            Intention <span style={{ color: "oklch(0.42 0.04 240)" }}>(optional)</span>
                            <textarea
                              value={bookingIntention}
                              onChange={(event) => setBookingIntention(event.target.value)}
                              maxLength={500}
                              rows={2}
                              placeholder="What will you return to?"
                              className="mt-1.5 w-full resize-none rounded-lg px-2 py-2 text-[11px] outline-none"
                              style={{ background: "oklch(0.12 0.02 240)", border: "1px solid oklch(0.22 0.04 240)", color: "oklch(0.85 0.04 60)", caretColor: "oklch(0.72 0.14 72)" }}
                            />
                          </label>
                          <button
                            type="submit"
                            disabled={createBookingMutation.isPending}
                            className="w-full rounded-lg py-2.5 text-[11px] font-semibold disabled:opacity-50"
                            style={{ background: "oklch(0.72 0.14 72)", color: "oklch(0.10 0.02 240)" }}
                          >
                            {createBookingMutation.isPending ? "Booking…" : "Book this Focus Session"}
                          </button>
                        </form>
                      )}

                      {upcomingBookings && upcomingBookings.length > 0 && (
                        <div className="mt-4 border-t pt-3" style={{ borderColor: "oklch(0.20 0.04 240)" }}>
                          <p className="text-[10px] uppercase tracking-widest" style={{ color: "oklch(0.42 0.04 240)" }}>Booked sessions</p>
                          <div className="mt-2 space-y-2">
                            {upcomingBookings.map((booking) => (
                              <div key={booking.id} className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: "oklch(0.09 0.015 240)" }}>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[11px] font-medium" style={{ color: "oklch(0.78 0.10 65)" }}>
                                    {booking.intention || "Focus Session"}
                                  </p>
                                  <p className="mt-0.5 text-[10px]" style={{ color: "oklch(0.45 0.04 240)" }}>
                                    {new Date(booking.scheduledFor).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {booking.durationMinutes} min
                                  </p>
                                </div>
                                {new Date(booking.scheduledFor).getTime() <= Date.now() + 5 * 60 * 1000 ? (
                                  <button
                                    onClick={() => handleLaunchBookedSession(booking)}
                                    className="shrink-0 text-[10px] font-semibold underline underline-offset-2"
                                    style={{ color: "oklch(0.78 0.10 65)" }}
                                  >
                                    Start
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => cancelBookingMutation.mutate({ bookingId: booking.id })}
                                    disabled={cancelBookingMutation.isPending}
                                    className="shrink-0 text-[10px] underline underline-offset-2 disabled:opacity-50"
                                    style={{ color: "oklch(0.58 0.05 35)" }}
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                  ) : (
                    <UpgradeNudge
                      moment="book-ahead"
                      friction
                      className="mt-3 text-left"
                      title="Book ahead when the moment is right."
                      body="A planned return can be easier to keep. Pro adds book-ahead Focus Sessions and a gentle Wren reminder."
                    />
                  )}

                  {artifactData && artifactData.sessions.length > 0 && (
                    <div className="w-full mt-5">
                      <p className="text-[10px] uppercase tracking-widest mb-2 text-left" style={{ color: "oklch(0.35 0.04 240)" }}>
                        Recent sessions
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {artifactData.sessions.slice(-4).reverse().map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center gap-2 rounded-lg px-3 py-2"
                            style={{ background: "oklch(0.11 0.02 240)", border: "1px solid oklch(0.17 0.03 240)" }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: WHAT_MOVED_COLORS[s.whatMoved ?? "thinking"] }}
                            />
                            <span className="text-[11px] font-medium" style={{ color: "oklch(0.60 0.08 72)" }}>
                              {s.durationMinutes ?? 25} min
                            </span>
                            <span className="text-[10px] flex-1" style={{ color: "oklch(0.45 0.04 240)" }}>
                              {s.whatMoved === "progress" ? "progress" : s.whatMoved === "thinking" ? "thinking" : s.whatMoved === "stuck" ? "scattered" : "—"}
                            </span>
                            {s.completedAt && (
                              <span className="text-[10px]" style={{ color: "oklch(0.32 0.03 240)" }}>
                                {new Date(s.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        ))}
                        {artifactData.sessions.length > 4 && (
                          <p className="text-[10px] text-center mt-0.5" style={{ color: "oklch(0.30 0.03 240)" }}>
                            +{artifactData.sessions.length - 4} earlier
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {(!artifactData || artifactData.sessions.length === 0) && (
                    <div className="mt-8 text-center max-w-xs">
                      <p className="text-xs" style={{ color: "oklch(0.32 0.03 240)" }}>
                        Each session weaves a row into your focus record. Start your first one above.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* INTAKE */}
              {phase === "intake" && (
                <div className="w-full">
                  <p
                    className="font-light leading-snug mb-1 text-center"
                    style={{ fontSize: "clamp(1rem, 3vw, 1.2rem)", color: "oklch(0.74 0.14 72)" }}
                  >
                    What are we working on?
                  </p>
                  <p className="text-[11px] text-center mb-5" style={{ color: "oklch(0.42 0.04 240)" }}>
                    Anything. Even "I don't know yet."
                  </p>
                  <textarea
                    value={intention}
                    onChange={(e) => setIntention(e.target.value)}
                    placeholder="Type your intention…"
                    rows={3}
                    maxLength={500}
                    className="w-full resize-none text-sm rounded-xl px-4 py-3 outline-none mb-4 leading-relaxed"
                    style={{
                      background: "oklch(0.12 0.02 240)",
                      border: "1px solid oklch(0.22 0.04 240)",
                      color: "oklch(0.88 0.04 60)",
                      caretColor: "oklch(0.72 0.14 72)",
                    }}
                  />
                  <button
                    onClick={() => setPhase("duration")}
                    className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-all hover:opacity-90 active:scale-[0.97]"
                    style={{ background: "oklch(0.72 0.14 72)", color: "oklch(0.10 0.02 240)" }}
                  >
                    {intention.trim() ? "Set intention →" : "Skip →"}
                  </button>
                </div>
              )}

              {/* DURATION */}
              {phase === "duration" && (
                <div className="w-full text-center">
                  <p
                    className="font-light leading-snug mb-1"
                    style={{ fontSize: "clamp(1rem, 3vw, 1.2rem)", color: "oklch(0.74 0.14 72)" }}
                  >
                    How long?
                  </p>
                  {intention.trim() && (
                    <p className="text-[11px] mb-4 italic leading-relaxed" style={{ color: "oklch(0.45 0.04 240)" }}>
                      "{intention.trim()}"
                    </p>
                  )}
                  {!intention.trim() && <div className="mb-4" />}
                  <div className="flex gap-2 justify-center mb-5">
                    {([10, 30, 60, 90] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDurationMinutes(d)}
                        className="flex-1 rounded-xl py-3 text-center transition-all active:scale-[0.97]"
                        style={{
                          background: durationMinutes === d ? "oklch(0.16 0.04 240)" : "oklch(0.11 0.02 240)",
                          border: `1px solid ${durationMinutes === d ? "oklch(0.72 0.14 72)" : "oklch(0.20 0.04 240)"}`,
                          opacity: durationMinutes === d ? 1 : 0.65,
                        }}
                      >
                        <p className="text-xl font-bold leading-none" style={{ color: "oklch(0.74 0.14 72)" }}>{d}</p>
                        <p className="text-[10px] mt-1" style={{ color: "oklch(0.48 0.04 240)" }}>
                          {d === 10 ? "quick" : d === 30 ? "sprint" : d === 60 ? "full" : "deep"}
                        </p>
                      </button>
                    ))}
                  </div>
                  {/* Hard stop */}
                  <div className="flex items-center justify-center gap-2 mb-5">
                    <span className="text-[11px]" style={{ color: "oklch(0.42 0.04 240)" }}>Hard stop at</span>
                    <input
                      type="time"
                      value={hardStop}
                      onChange={(e) => setHardStop(e.target.value)}
                      className="text-[11px] rounded-lg px-2 py-1 outline-none"
                      style={{
                        background: "oklch(0.12 0.02 240)",
                        border: "1px solid oklch(0.22 0.04 240)",
                        color: hardStop ? "oklch(0.85 0.08 65)" : "oklch(0.38 0.03 240)",
                        colorScheme: "dark",
                      }}
                    />
                    {hardStop && (
                      <button
                        onClick={() => setHardStop("")}
                        className="text-[10px] opacity-40 hover:opacity-70"
                        style={{ color: "oklch(0.60 0.04 240)" }}
                      >
                        clear
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleStartSession}
                    disabled={startMutation.isPending}
                    className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                    style={{ background: "oklch(0.72 0.14 72)", color: "oklch(0.10 0.02 240)" }}
                  >
                    {startMutation.isPending ? "Starting…" : "Begin →"}
                  </button>
                  <button
                    onClick={() => {
                      setWrenActivity("lookingup");
                      setWrenMessage("Take a breath. I'll be here.");
                      setTimeout(() => setWrenMessage(null), 4000);
                    }}
                    className="text-[11px] mt-3 opacity-30 hover:opacity-60 transition-opacity underline underline-offset-2"
                    style={{ color: "oklch(0.70 0.04 240)" }}
                  >
                    Take a breath first
                  </button>
                </div>
              )}

              {/* CLOSURE */}
              {phase === "closure" && (
                <div className="w-full text-center">
                  <p
                    className="font-light leading-snug mb-5"
                    style={{ fontSize: "clamp(1rem, 3vw, 1.2rem)", color: "oklch(0.74 0.14 72)" }}
                  >
                    What moved?
                  </p>
                  <div className="flex flex-col gap-2 mb-4">
                    {([
                      { value: "progress", label: "Made progress", sub: "Productive session" },
                      { value: "thinking", label: "Mostly thinking", sub: "Cognitive — equally valid" },
                      { value: "stuck",    label: "Stuck or scattered", sub: "Showing up is the point" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setWhatMoved(opt.value)}
                        className="rounded-xl px-4 py-3 text-left transition-all active:scale-[0.98]"
                        style={{
                          background: whatMoved === opt.value ? "oklch(0.15 0.04 240)" : "oklch(0.10 0.02 240)",
                          border: `1px solid ${whatMoved === opt.value ? "oklch(0.72 0.14 72)" : "oklch(0.18 0.03 240)"}`,
                          opacity: whatMoved && whatMoved !== opt.value ? 0.55 : 1,
                        }}
                      >
                        <p className="text-xs font-semibold" style={{ color: "oklch(0.88 0.06 65)" }}>{opt.label}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.45 0.04 240)" }}>{opt.sub}</p>
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={closingNote}
                    onChange={(e) => setClosingNote(e.target.value)}
                    placeholder="What I did / didn't do / want to come back to (saves to Vault)"
                    rows={2}
                    maxLength={1000}
                    className="w-full resize-none text-[11px] rounded-xl px-4 py-3 outline-none mb-4 leading-relaxed"
                    style={{
                      background: "oklch(0.11 0.02 240)",
                      border: "1px solid oklch(0.20 0.04 240)",
                      color: "oklch(0.85 0.04 60)",
                      caretColor: "oklch(0.72 0.14 72)",
                    }}
                  />

                  <button
                    onClick={handleComplete}
                    disabled={!whatMoved || completeMutation.isPending}
                    className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-30"
                    style={{ background: "oklch(0.72 0.14 72)", color: "oklch(0.10 0.02 240)" }}
                  >
                    {completeMutation.isPending ? "Saving…" : "Finish session →"}
                  </button>
                </div>
              )}

              {/* REVEAL */}
              {phase === "reveal" && (
                <div className="w-full text-center">
                  <p
                    className="font-light leading-snug mb-1"
                    style={{ fontSize: "clamp(1rem, 3vw, 1.2rem)", color: "oklch(0.74 0.14 72)" }}
                  >
                    Session logged.
                  </p>
                  <p className="text-[11px] mb-5" style={{ color: "oklch(0.42 0.04 240)" }}>
                    Each session adds a row to your focus record.
                  </p>
                  {artifactData && (
                    <div className="flex justify-center mb-4">
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

                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        setPhase("intake");
                        setWhatMoved(null);
                        setClosingNote("");
                        setIntention("");
                        setSessionId(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all hover:opacity-80 active:scale-[0.97]"
                      style={{
                        background: "oklch(0.13 0.03 240)",
                        border: "1px solid oklch(0.25 0.05 240)",
                        color: "oklch(0.60 0.08 72)",
                      }}
                    >
                      Another round →
                    </button>
                    <button
                      onClick={() => navigate("/")}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all hover:opacity-90 active:scale-[0.97]"
                      style={{ background: "oklch(0.72 0.14 72)", color: "oklch(0.10 0.02 240)" }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Surface card */}
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

      {/* Unstick modal */}
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

      {/* Wren Focus Popout */}
      <WrenPopout
        open={pipOpen}
        onClose={() => setPipOpen(false)}
        secondsLeft={secondsLeft}
        durationMinutes={durationMinutes}
        intention={intention}
        wrenActivity={wrenActivity}
        ambientSound={ambientSound}
        ambientVolume={ambientVolume}
        onSetAmbient={handleSetAmbient}
        onSetVolume={handleSetVolume}
        chatMessages={chatMessages}
        chatInput={chatInput}
        chatLoading={chatLoading}
        onChatInputChange={setChatInput}
        onSendChat={handleSendChat}
        onStuck={() => setShowUnstickModal(true)}
        onEndEarly={handleEndEarly}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
