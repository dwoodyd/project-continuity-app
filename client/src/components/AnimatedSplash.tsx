import { useEffect, useState } from "react";
import WrenPlayer from "@/components/WrenPlayer";

/**
 * AnimatedSplash — actual Continuary bird logo.
 * Phases: "in" (clip+scale reveal) → "hold" (glow + golden dot pulse) → "out" (fade).
 * Tap anywhere to skip. 528Hz chime on reveal. Once per session.
 */
export function AnimatedSplash({ onComplete, isFirstSession = false }: { onComplete: () => void; isFirstSession?: boolean }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [dotPulse, setDotPulse] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    // Chime at ~1s
    const tChime = setTimeout(() => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(528, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.4);
      } catch { /* silent */ }
    }, 900);
    const t1 = setTimeout(() => { setPhase("hold"); setDotPulse(true); }, 200);
    const t2 = setTimeout(() => setPhase("out"), 4000);
    const t3 = setTimeout(() => onComplete(), 4420);
    return () => { clearTimeout(tChime); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  function skip() {
    if (skipped) return;
    setSkipped(true);
    setPhase("out");
    setTimeout(() => onComplete(), 380);
  }

  const revealed = phase !== "in";

  return (
    <div
      onClick={skip}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-pointer"
      style={{
        background: "oklch(0.09 0.01 270)",
        opacity: phase === "out" ? 0 : 1,
        transition: phase === "out" ? "opacity 0.42s ease-in" : "opacity 0.3s ease-out",
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: "50%",
        background: "radial-gradient(circle, oklch(0.45 0.16 270 / 0.15) 0%, transparent 70%)",
        opacity: phase === "hold" ? 1 : 0,
        transform: phase === "hold" ? "scale(1)" : "scale(0.5)",
        transition: "opacity 1.5s ease-out 0.1s, transform 1.7s ease-out 0.1s",
        pointerEvents: "none",
      }} />

      {/* Wren mascot — welcome animation, clip-path reveal */}
      <div style={{
        position: "relative",
        clipPath: revealed ? "inset(0% 0 0 0)" : "inset(100% 0 0 0)",
        transform: revealed ? "scale(1)" : "scale(0.88)",
        transition: "clip-path 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.15s, transform 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.1s",
      }}>
        <WrenPlayer clip="welcome" size="xl" />
      </div>

      {/* Wordmark */}
      <div style={{
        marginTop: 22,
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.65s ease-out 1.1s, transform 0.65s ease-out 1.1s",
        fontFamily: "'Lora', Georgia, serif",
        fontSize: 27,
        fontWeight: 600,
        letterSpacing: "0.01em",
        color: "oklch(0.96 0.005 270)",
      }}>
        Continuary
      </div>

      {/* Tagline */}
      <div style={{
        marginTop: 7,
        opacity: revealed ? 1 : 0,
        transition: "opacity 0.6s ease-out 1.65s",
        fontSize: 11,
        letterSpacing: "0.17em",
        textTransform: "uppercase",
        color: "oklch(0.55 0.01 270)",
        fontFamily: "Inter, sans-serif",
      }}>
        {isFirstSession ? "Your thread starts here" : "Your thread continues"}
      </div>

      <style>{`
        @keyframes dotPulse {
          0% { transform: scale(1); opacity: 1; }
          60% { transform: scale(2.2); opacity: 0.3; }
          100% { transform: scale(0.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
