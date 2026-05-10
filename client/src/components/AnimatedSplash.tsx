import { useEffect, useState } from "react";

/**
 * AnimatedSplash — brand wordmark splash screen.
 * Phases: "in" (fade up) → "hold" (glow pulse) → "out" (fade).
 * No Wren — clean brand moment before entering the app.
 * Tap anywhere to skip.
 */
export function AnimatedSplash({ onComplete, isFirstSession = false }: { onComplete: () => void; isFirstSession?: boolean }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    // Soft 528Hz chime at ~0.9s
    const tChime = setTimeout(() => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(528, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.6);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.6);
      } catch { /* silent */ }
    }, 900);

    const t1 = setTimeout(() => setPhase("hold"), 180);
    const t2 = setTimeout(() => setPhase("out"), 3800);
    const t3 = setTimeout(() => onComplete(), 4220);
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
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden"
      style={{
        background: "oklch(0.09 0.015 240)",
        opacity: phase === "out" ? 0 : 1,
        transition: phase === "out" ? "opacity 0.42s ease-in" : "opacity 0.25s ease-out",
      }}
    >
      {/* Deep amber radial glow — expands on hold */}
      <div style={{
        position: "absolute",
        width: 480,
        height: 480,
        borderRadius: "50%",
        background: "radial-gradient(circle, oklch(0.78 0.18 65 / 0.14) 0%, transparent 70%)",
        opacity: revealed ? 1 : 0,
        transform: revealed ? "scale(1)" : "scale(0.4)",
        transition: "opacity 2s ease-out 0.2s, transform 2.2s cubic-bezier(0.22, 1, 0.36, 1) 0.1s",
        pointerEvents: "none",
      }} />

      {/* Thin amber horizontal rule — fades in above wordmark */}
      <div style={{
        width: revealed ? 48 : 0,
        height: 1,
        background: "oklch(0.78 0.18 65 / 0.45)",
        marginBottom: 20,
        transition: "width 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.5s",
      }} />

      {/* Wordmark */}
      <div style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.8s ease-out 0.2s, transform 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.15s",
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: 38,
        fontWeight: 700,
        letterSpacing: "0.01em",
        color: "oklch(0.97 0.01 80)",
        lineHeight: 1,
      }}>
        Continuary
      </div>

      {/* Tagline */}
      <div style={{
        marginTop: 10,
        opacity: revealed ? 1 : 0,
        transition: "opacity 0.7s ease-out 1.2s",
        fontSize: 10,
        letterSpacing: "0.20em",
        textTransform: "uppercase",
        color: "oklch(0.78 0.18 65 / 0.65)",
        fontFamily: "Inter, sans-serif",
      }}>
        {isFirstSession ? "Your thread starts here" : "Your thread continues"}
      </div>

      {/* Thin amber horizontal rule — fades in below wordmark */}
      <div style={{
        width: revealed ? 48 : 0,
        height: 1,
        background: "oklch(0.78 0.18 65 / 0.45)",
        marginTop: 20,
        transition: "width 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.7s",
      }} />

      {/* Skip hint — very subtle, appears late */}
      <div style={{
        position: "absolute",
        bottom: 32,
        opacity: revealed ? 0.25 : 0,
        transition: "opacity 0.6s ease-out 2.5s",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "oklch(0.97 0.01 80)",
        fontFamily: "Inter, sans-serif",
      }}>
        Tap to continue
      </div>
    </div>
  );
}
