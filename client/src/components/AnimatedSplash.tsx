import { useEffect, useState } from "react";

// CDN URL of the actual Continuary icon (512px clean cropped version)
const ICON_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663270045694/VnvNaoJZPVnHWmB8F3cwwo/icon-512_badc923d.png";

/**
 * AnimatedSplash — uses the actual Continuary bird logo.
 * Animation: clip-path reveal from bottom (ink rising), then wordmark fades in.
 * Tap anywhere to skip. Soft 528Hz chime on reveal. Shows once per session.
 */
export function AnimatedSplash({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    // Soft chime at ~1s (when reveal completes)
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
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.4);
      } catch { /* silent fallback */ }
    }, 900);
    const t1 = setTimeout(() => setPhase("hold"), 200);
    const t2 = setTimeout(() => setPhase("out"), 2400);
    const t3 = setTimeout(() => onComplete(), 2850);
    return () => { clearTimeout(tChime); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  function skip() {
    if (skipped) return;
    setSkipped(true);
    setPhase("out");
    setTimeout(() => onComplete(), 380);
  }

  // clipPath reveal: starts at inset(100% 0 0 0) → inset(0% 0 0 0) = bottom-up wipe
  const clipReveal = phase === "in"
    ? "inset(100% 0 0 0)"
    : "inset(0% 0 0 0)";

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
      {/* Ambient glow — blooms in during hold */}
      <div style={{
        position: "absolute",
        width: 280,
        height: 280,
        borderRadius: "50%",
        background: "radial-gradient(circle, oklch(0.45 0.16 270 / 0.16) 0%, transparent 70%)",
        opacity: phase === "hold" ? 1 : 0,
        transform: phase === "hold" ? "scale(1)" : "scale(0.5)",
        transition: "opacity 1.4s ease-out 0.1s, transform 1.6s ease-out 0.1s",
        pointerEvents: "none",
      }} />

      {/* Icon container with clip-path reveal */}
      <div style={{
        width: 96,
        height: 96,
        borderRadius: 24,
        background: "oklch(0.17 0.04 270)",
        boxShadow: "0 0 0 1px oklch(0.75 0.15 270 / 0.12), 0 12px 40px oklch(0 0 0 / 0.55)",
        overflow: "hidden",
        clipPath: clipReveal,
        transition: "clip-path 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.15s",
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
          onError={(e) => {
            // Fallback: show a simple arch if CDN fails
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Wordmark */}
      <div style={{
        marginTop: 22,
        opacity: phase === "in" ? 0 : 1,
        transform: phase === "in" ? "translateY(8px)" : "translateY(0)",
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
        opacity: phase === "in" ? 0 : 1,
        transition: "opacity 0.6s ease-out 1.65s",
        fontSize: 11,
        letterSpacing: "0.17em",
        textTransform: "uppercase",
        color: "oklch(0.55 0.01 270)",
        fontFamily: "Inter, sans-serif",
      }}>
        Your thread continues
      </div>
    </div>
  );
}
