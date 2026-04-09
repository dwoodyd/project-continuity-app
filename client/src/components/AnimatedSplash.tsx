import { useEffect, useState } from "react";

/**
 * AnimatedSplash — plays only when running as installed PWA.
 * - Tap/click anywhere to skip immediately.
 * - Ambient glow pulses once during the hold phase.
 * - Total runtime: 2.9s (or instant on tap).
 */
export function AnimatedSplash({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 300);
    // Soft chime when outer arch finishes drawing (~1.1s after mount)
    const tChime = setTimeout(() => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(528, ctx.currentTime); // 528 Hz — calm, resonant
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.2);
      } catch { /* audio blocked — silent fallback */ }
    }, 1100);
    const t2 = setTimeout(() => setPhase("out"), 2400);
    const t3 = setTimeout(() => onComplete(), 2900);
    return () => { clearTimeout(t1); clearTimeout(tChime); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  function skip() {
    if (skipped) return;
    setSkipped(true);
    setPhase("out");
    setTimeout(() => onComplete(), 400);
  }

  return (
    <div
      onClick={skip}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-pointer"
      style={{
        background: "oklch(0.09 0.01 270)",
        opacity: phase === "out" ? 0 : 1,
        transition: phase === "out" ? "opacity 0.4s ease-in" : "opacity 0.4s ease-out",
        pointerEvents: "all",
      }}
    >
      {/* Ambient glow — pulses once during hold phase */}
      <div
        style={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: "radial-gradient(circle, oklch(0.50 0.18 270 / 0.18) 0%, transparent 70%)",
          opacity: phase === "hold" ? 1 : 0,
          transform: phase === "hold" ? "scale(1)" : "scale(0.6)",
          transition: "opacity 1.2s ease-out 0.2s, transform 1.4s ease-out 0.2s",
          pointerEvents: "none",
        }}
      />

      {/* Icon container */}
      <div
        style={{
          position: "relative",
          opacity: phase === "in" ? 0 : 1,
          transform: phase === "in" ? "scale(0.82)" : "scale(1)",
          transition: "opacity 0.5s ease-out, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 22,
            background: "oklch(0.18 0.04 270)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 1px oklch(0.80 0.18 270 / 0.15), 0 8px 32px oklch(0 0 0 / 0.5)",
          }}
        >
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <path
              d="M10 42 C10 22 18 10 26 10 C34 10 42 22 42 42"
              stroke="white" strokeWidth="2.8" strokeLinecap="round" fill="none"
              style={{
                strokeDasharray: 70,
                strokeDashoffset: phase === "in" ? 70 : 0,
                transition: "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1) 0.2s",
              }}
            />
            <path
              d="M17 42 C17 28 21 18 26 18 C31 18 35 28 35 42"
              stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"
              style={{
                strokeDasharray: 46,
                strokeDashoffset: phase === "in" ? 46 : 0,
                transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1) 0.45s",
              }}
            />
            <path
              d="M8 42 L44 42"
              stroke="white" strokeWidth="2" strokeLinecap="round"
              style={{
                strokeDasharray: 36,
                strokeDashoffset: phase === "in" ? 36 : 0,
                transition: "stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1) 0.9s",
              }}
            />
          </svg>
        </div>
      </div>

      {/* Wordmark */}
      <div
        style={{
          marginTop: 20,
          opacity: phase === "in" ? 0 : 1,
          transform: phase === "in" ? "translateY(10px)" : "translateY(0)",
          transition: "opacity 0.6s ease-out 1.2s, transform 0.6s ease-out 1.2s",
          fontFamily: "'Lora', Georgia, serif",
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: "0.01em",
          color: "oklch(0.96 0.005 270)",
        }}
      >
        Continuary
      </div>

      {/* Tagline */}
      <div
        style={{
          marginTop: 6,
          opacity: phase === "in" ? 0 : 1,
          transition: "opacity 0.6s ease-out 1.7s",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "oklch(0.60 0.01 270)",
          fontFamily: "Inter, sans-serif",
        }}
      >
        Your thread continues
      </div>
    </div>
  );
}
