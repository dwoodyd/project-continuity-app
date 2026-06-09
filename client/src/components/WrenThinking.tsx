/**
 * WrenThinking — Priority 8.9
 *
 * A Wren-presence loading animation to replace generic spinners in AI-driven
 * operations (LLM calls, weekly review generation, clarity engine, etc.).
 *
 * Usage:
 *   <WrenThinking />                      — default, inline, "Wren is thinking…"
 *   <WrenThinking label="Reading your week…" />
 *   <WrenThinking size="lg" fullscreen />  — full-screen overlay for long ops
 */
import { useEffect, useState } from "react";
import { WREN_CLIPS } from "@/lib/wrenClips";

interface WrenThinkingProps {
  /** Custom label. Defaults to cycling through ambient phrases. */
  label?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Full-screen overlay mode */
  fullscreen?: boolean;
  /** Extra wrapper class */
  className?: string;
}

const AMBIENT_PHRASES = [
  "Wren is thinking…",
  "Gathering the thread…",
  "Holding the context…",
  "Reading your pattern…",
  "Weaving it together…",
  "Almost there…",
];

const SIZE_MAP = {
  sm: { video: 48, label: "0.7rem" },
  md: { video: 80, label: "0.8rem" },
  lg: { video: 120, label: "0.9rem" },
};

export function WrenThinking({
  label,
  size = "md",
  fullscreen = false,
  className = "",
}: WrenThinkingProps) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  // Cycle through ambient phrases every 2.8s if no custom label
  useEffect(() => {
    if (label) return;
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % AMBIENT_PHRASES.length);
        setVisible(true);
      }, 300);
    }, 2800);
    return () => clearInterval(t);
  }, [label]);

  const { video: videoSize, label: labelSize } = SIZE_MAP[size];
  const displayLabel = label ?? AMBIENT_PHRASES[phraseIdx];

  const inner = (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
      }}
    >
      {/* Wren video — screen blend over dark bg */}
      <div style={{
        position: "relative",
        width: videoSize,
        height: videoSize,
        borderRadius: "50%",
        overflow: "hidden",
        background: "oklch(0.09 0.022 240)",
        flexShrink: 0,
      }}>
        {/* Amber radial glow */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
          background: "radial-gradient(circle at 50% 60%, oklch(0.74 0.14 72 / 0.18) 0%, transparent 70%)",
        }} />
        <video
          src={WREN_CLIPS.inflates}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            mixBlendMode: "screen",
            zIndex: 2,
          }}
        />
      </div>

      {/* Label */}
      <p style={{
        fontSize: labelSize,
        color: "oklch(0.74 0.14 72 / 0.70)",
        letterSpacing: "0.04em",
        fontStyle: "italic",
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(4px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        textAlign: "center",
        maxWidth: "12rem",
      }}>
        {displayLabel}
      </p>
    </div>
  );

  if (fullscreen) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 150,
        background: "oklch(0.07 0.022 240 / 0.88)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {inner}
      </div>
    );
  }

  return inner;
}

export default WrenThinking;
