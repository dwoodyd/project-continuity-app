import { useEffect, useState } from "react";

const ICON_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663270045694/VnvNaoJZPVnHWmB8F3cwwo/icon_fixed_512_286881db.png";

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

      {/* Icon — clip-path reveal + scale-up */}
      <div style={{
        position: "relative",
        width: 96,
        height: 96,
        borderRadius: 24,
        background: "oklch(0.17 0.04 270)",
        boxShadow: "0 0 0 1px oklch(0.75 0.15 270 / 0.12), 0 12px 40px oklch(0 0 0 / 0.55)",
        clipPath: revealed ? "inset(0% 0 0 0)" : "inset(100% 0 0 0)",
        transform: revealed ? "scale(1)" : "scale(0.88)",
        transition: "clip-path 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.15s, transform 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.1s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <img
          src={ICON_URL}
          alt="Continuary"
          width={96}
          height={96}
          style={{ display: "block", width: 96, height: 96, objectFit: "contain" }}
        />
        {/* Golden dot — inside icon container, overlays bird's eye at 62% x, 38% y */}
        <div style={{
          position: "absolute",
          width: dotPulse ? 10 : 0,
          height: dotPulse ? 10 : 0,
          borderRadius: "50%",
          background: "oklch(0.82 0.18 80)",
          boxShadow: "0 0 14px 6px oklch(0.82 0.18 80 / 0.7)",
          top: 31,
          left: 57,
          opacity: dotPulse ? 1 : 0,
          transform: dotPulse ? "scale(1)" : "scale(0)",
          transition: "opacity 0.5s ease-out 1.2s, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s, width 0s 1.2s, height 0s 1.2s",
          animation: dotPulse ? "dotPulse 1.2s ease-out 1.7s 1 forwards" : "none",
          pointerEvents: "none",
          zIndex: 2,
        }} />
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
