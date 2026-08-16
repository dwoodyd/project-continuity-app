import { useEffect, useState } from "react";

/**
 * AnimatedSplash — brand wordmark splash screen.
 * A deliberately brief brand acknowledgement for the home gate only.
 * It never creates audio before a user gesture and can be dismissed by
 * pointer or keyboard input immediately.
 */
export function AnimatedSplash({ onComplete, isFirstSession = false }: { onComplete: () => void; isFirstSession?: boolean }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    const complete = () => {
      setSkipped(true);
      setPhase("out");
      window.setTimeout(onComplete, 160);
    };
    const t1 = window.setTimeout(() => setPhase("hold"), 80);
    const t2 = window.setTimeout(() => setPhase("out"), 820);
    const t3 = window.setTimeout(onComplete, 980);
    window.addEventListener("pointerdown", complete, { once: true });
    window.addEventListener("keydown", complete, { once: true });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("pointerdown", complete);
      window.removeEventListener("keydown", complete);
    };
  }, [onComplete]);

  function skip() {
    if (skipped) return;
    setSkipped(true);
    setPhase("out");
    setTimeout(() => onComplete(), 160);
  }

  const revealed = phase !== "in";

  return (
    <div
      onClick={skip}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden"
      style={{
        background: "oklch(0.09 0.015 240)",
        opacity: phase === "out" ? 0 : 1,
        transition: phase === "out" ? "opacity 0.16s ease-in" : "opacity 0.12s ease-out",
      }}
    >
      {/* Deep amber radial glow — expands on hold */}
      <div style={{
        position: "absolute",
        width: 480,
        height: 480,
        borderRadius: "50%",
        background: "radial-gradient(circle, oklch(0.74 0.14 72 / 0.14) 0%, transparent 70%)",
        opacity: revealed ? 1 : 0,
        transform: revealed ? "scale(1)" : "scale(0.4)",
        transition: "opacity 0.28s ease-out, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
        pointerEvents: "none",
      }} />

      {/* Thin amber horizontal rule — fades in above wordmark */}
      <div style={{
        width: revealed ? 48 : 0,
        height: 1,
        background: "oklch(0.74 0.14 72 / 0.45)",
        marginBottom: 20,
        transition: "width 0.24s cubic-bezier(0.22, 1, 0.36, 1)",
      }} />

      {/* Wordmark */}
      <div style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.26s ease-out, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
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
        transition: "opacity 0.22s ease-out 0.08s",
        fontSize: 10,
        letterSpacing: "0.20em",
        textTransform: "uppercase",
        color: "oklch(0.74 0.14 72 / 0.65)",
        fontFamily: "Inter, sans-serif",
      }}>
        {isFirstSession ? "Your thread starts here" : "Your thread continues"}
      </div>

      {/* Thin amber horizontal rule — fades in below wordmark */}
      <div style={{
        width: revealed ? 48 : 0,
        height: 1,
        background: "oklch(0.74 0.14 72 / 0.45)",
        marginTop: 20,
        transition: "width 0.24s cubic-bezier(0.22, 1, 0.36, 1) 0.08s",
      }} />

      {/* Skip hint — very subtle, appears late */}
      <div style={{
        position: "absolute",
        bottom: 32,
        opacity: revealed ? 0.4 : 0,
        transition: "opacity 0.2s ease-out 0.18s",
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
