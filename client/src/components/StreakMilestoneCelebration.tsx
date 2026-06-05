/**
 * StreakMilestoneCelebration
 *
 * Full-screen Wren celebrate overlay shown once per milestone (3 / 7 / 30 days).
 * Persisted via localStorage so it only shows once per milestone per device.
 * Auto-dismisses after 6 seconds or on tap.
 */
import { useEffect, useState } from "react";
import WrenPlayer from "@/components/WrenPlayer";

const MILESTONES = [3, 7, 30] as const;
type Milestone = (typeof MILESTONES)[number];

const MILESTONE_COPY: Record<Milestone, { headline: string; sub: string }> = {
  3:  { headline: "3 days in a row.", sub: "You came back. That's the whole practice." },
  7:  { headline: "A full week.", sub: "Seven days of showing up. The thread is real." },
  30: { headline: "Thirty days.", sub: "A month of evidence. You are not behind — you are building." },
};

function getStorageKey(streak: Milestone) {
  return `continuary_streak_celebrated_${streak}`;
}

function shouldShow(streak: number): Milestone | null {
  // Surface the HIGHEST milestone the user has reached but not yet celebrated.
  // Iterating ascending would show "3 days" to someone who arrives already at a
  // 7- or 30-day streak (e.g. a new device with cleared storage).
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    const m = MILESTONES[i];
    if (streak >= m) {
      try {
        if (!localStorage.getItem(getStorageKey(m))) return m;
      } catch {
        return null;
      }
    }
  }
  return null;
}

function markShown(m: Milestone) {
  try { localStorage.setItem(getStorageKey(m), "1"); } catch {}
}

interface Props {
  streak: number;
}

export default function StreakMilestoneCelebration({ streak }: Props) {
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (streak <= 0) return;
    const m = shouldShow(streak);
    if (!m) return;
    // Small delay so the app settles before showing
    const t = setTimeout(() => {
      setMilestone(m);
      setVisible(true);
      markShown(m);
    }, 1200);
    return () => clearTimeout(t);
  }, [streak]);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => dismiss(), 6000);
    return () => clearTimeout(t);
  }, [visible]);

  function dismiss() {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      setMilestone(null);
    }, 500);
  }

  if (!visible || !milestone) return null;

  const copy = MILESTONE_COPY[milestone];

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "oklch(0.06 0.02 264 / 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        cursor: "pointer",
        opacity: exiting ? 0 : 1,
        transition: "opacity 0.5s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "40%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          background: "radial-gradient(circle, oklch(0.80 0.17 65 / 0.12) 0%, transparent 65%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      {/* Wren */}
      <div
        style={{
          opacity: exiting ? 0 : 1,
          transform: exiting ? "translateY(-20px) scale(0.9)" : "translateY(0) scale(1)",
          transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1)",
          marginBottom: "1.5rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        <WrenPlayer clip="happySplit" size="2xl" autoPlay loop />
      </div>

      {/* Milestone badge */}
      <div
        style={{
          fontSize: "0.65rem",
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "oklch(0.80 0.17 65)",
          marginBottom: "0.75rem",
          position: "relative",
          zIndex: 1,
          opacity: exiting ? 0 : 1,
          transition: "opacity 0.4s ease 0.05s",
        }}
      >
        {milestone}-day streak
      </div>

      {/* Headline */}
      <h2
        style={{
          fontSize: "2rem",
          fontWeight: 600,
          color: "rgba(255,255,255,0.95)",
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: "22rem",
          marginBottom: "0.75rem",
          position: "relative",
          zIndex: 1,
          opacity: exiting ? 0 : 1,
          transform: exiting ? "translateY(8px)" : "translateY(0)",
          transition: "opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s",
        }}
      >
        {copy.headline}
      </h2>

      {/* Sub */}
      <p
        style={{
          fontSize: "1rem",
          color: "rgba(255,255,255,0.5)",
          textAlign: "center",
          maxWidth: "20rem",
          lineHeight: 1.5,
          position: "relative",
          zIndex: 1,
          opacity: exiting ? 0 : 1,
          transform: exiting ? "translateY(8px)" : "translateY(0)",
          transition: "opacity 0.4s ease 0.15s, transform 0.4s ease 0.15s",
        }}
      >
        {copy.sub}
      </p>

      {/* Tap to dismiss hint */}
      <p
        style={{
          marginTop: "2.5rem",
          fontSize: "0.7rem",
          color: "rgba(255,255,255,0.18)",
          letterSpacing: "0.08em",
          position: "relative",
          zIndex: 1,
        }}
      >
        Tap anywhere to continue
      </p>
    </div>
  );
}
