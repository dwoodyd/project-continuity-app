/**
 * WrenCompanion — Continuary's animated bird mascot.
 *
 * States mapped to real artwork:
 *   neutral    → wren_neutral.svg  (bird in arch, holding thread, calm)
 *   guiding    → wren_states.webp  left panel  — Onboarding / Guiding pose
 *   celebrating→ wren_states.webp  right panel — Celebration / Milestone pose
 *   resting    → wren_states_2.webp left panel  — Evening / Wind-down pose
 *   nudging    → wren_states_2.webp right panel — Nudge / Prompt pose
 *
 * Assets (CDN):
 *   neutral SVG  → /manus-storage/wren_neutral_f320ed04.svg
 *   states webp  → /manus-storage/wren_states_58a50e1a.webp   (3 panels: L=guiding, M=returning, R=celebrating)
 *   states2 webp → /manus-storage/wren_states_2_849b6ba6.webp (2 panels: L=resting, R=nudging)
 *
 * Sprite sheet approach: for multi-panel webp files we use background-image with
 * background-size/position to crop to the correct panel, avoiding showing the full sheet.
 */

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ── CDN asset paths ──────────────────────────────────────────────────────────
const WREN_NEUTRAL_SVG = "/api/media/wren_neutral_f320ed04.svg";
const WREN_STATES_WEBP = "/api/media/wren_states_58a50e1a.webp";
const WREN_STATES2_WEBP = "/api/media/wren_states_2_849b6ba6.webp";

// ── Types ────────────────────────────────────────────────────────────────────
export type WrenState = "neutral" | "guiding" | "celebrating" | "resting" | "nudging";

export interface WrenCompanionProps {
  /** Visual/emotional state of Wren */
  state?: WrenState;
  /** Size in pixels (width = height) */
  size?: number;
  /** Optional speech bubble message */
  message?: string;
  /** Extra Tailwind classes on the outer wrapper */
  className?: string;
  /** Called when the user clicks Wren */
  onClick?: () => void;
  /** If true, show a pulsing glow ring */
  glow?: boolean;
}

// ── Animation config per state ───────────────────────────────────────────────
const STATE_CONFIG: Record<
  WrenState,
  {
    bobDuration: string;
    bobAmount: string;
    breathDuration: string;
    breathAmount: string;
    wiggle: boolean;
    bounce: boolean;
    leanForward: boolean;
    /** CDN URL of the image asset */
    asset: string;
    /**
     * If set, render as background-image crop instead of <img>.
     * backgroundSize: CSS background-size (e.g. "300% 100%" for 3-panel sheet)
     * backgroundPosition: CSS background-position (e.g. "0% center" for left panel)
     */
    bgCrop?: { backgroundSize: string; backgroundPosition: string };
  }
> = {
  neutral: {
    bobDuration: "2.4s",
    bobAmount: "5px",
    breathDuration: "3.2s",
    breathAmount: "1.03",
    wiggle: false,
    bounce: false,
    leanForward: false,
    asset: WREN_NEUTRAL_SVG,
    // SVG — no crop needed, use <img> directly
  },
  guiding: {
    // wren_states.webp — left panel (Onboarding / Guiding)
    bobDuration: "1.8s",
    bobAmount: "6px",
    breathDuration: "2.6s",
    breathAmount: "1.04",
    wiggle: false,
    bounce: false,
    leanForward: true,
    asset: WREN_STATES_WEBP,
    bgCrop: { backgroundSize: "300% 100%", backgroundPosition: "0% center" },
  },
  celebrating: {
    // wren_states.webp — right panel (Celebration / Milestone)
    bobDuration: "0.7s",
    bobAmount: "10px",
    breathDuration: "1.2s",
    breathAmount: "1.06",
    wiggle: false,
    bounce: true,
    leanForward: false,
    asset: WREN_STATES_WEBP,
    bgCrop: { backgroundSize: "300% 100%", backgroundPosition: "100% center" },
  },
  resting: {
    // wren_states_2.webp — left panel (Evening / Wind-down)
    bobDuration: "4.0s",
    bobAmount: "3px",
    breathDuration: "5.0s",
    breathAmount: "1.02",
    wiggle: false,
    bounce: false,
    leanForward: false,
    asset: WREN_STATES2_WEBP,
    bgCrop: { backgroundSize: "200% 100%", backgroundPosition: "0% center" },
  },
  nudging: {
    // wren_states_2.webp — right panel (Nudge / Prompt)
    bobDuration: "2.0s",
    bobAmount: "5px",
    breathDuration: "3.0s",
    breathAmount: "1.03",
    wiggle: true,
    bounce: false,
    leanForward: false,
    asset: WREN_STATES2_WEBP,
    bgCrop: { backgroundSize: "200% 100%", backgroundPosition: "100% center" },
  },
};

// ── Keyframe CSS (injected once via <style> tag) ─────────────────────────────
const KEYFRAME_CSS = `
@keyframes wren-bob {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(var(--wren-bob, -5px)); }
}
@keyframes wren-breathe {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(var(--wren-breath, 1.03)); }
}
@keyframes wren-bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  30%       { transform: translateY(var(--wren-bob, -10px)) scale(1.06); }
  60%       { transform: translateY(calc(var(--wren-bob, -10px) * 0.4)) scale(1.02); }
}
@keyframes wren-wiggle {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  20%       { transform: translateX(-3px) rotate(-3deg); }
  40%       { transform: translateX(3px) rotate(3deg); }
  60%       { transform: translateX(-2px) rotate(-2deg); }
  80%       { transform: translateX(2px) rotate(2deg); }
}
@keyframes wren-lean {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  50%       { transform: translateX(3px) rotate(4deg); }
}
@keyframes wren-glow-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%       { opacity: 0.7; transform: scale(1.12); }
}
@keyframes wren-bubble-in {
  0%   { opacity: 0; transform: translateY(4px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
`;

// ── Inject keyframes once ────────────────────────────────────────────────────
let _keyframesInjected = false;
function ensureKeyframes() {
  if (_keyframesInjected) return;
  _keyframesInjected = true;
  const style = document.createElement("style");
  style.id = "wren-keyframes";
  style.textContent = KEYFRAME_CSS;
  document.head.appendChild(style);
}

// ── Component ────────────────────────────────────────────────────────────────
export function WrenCompanion({
  state = "neutral",
  size = 56,
  message,
  className,
  onClick,
  glow = false,
}: WrenCompanionProps) {
  const cfg = STATE_CONFIG[state];
  const [showBubble, setShowBubble] = useState(false);
  const bubbleTimer = useRef<number | undefined>(undefined);

  // Inject keyframes on first render
  useEffect(() => {
    ensureKeyframes();
  }, []);

  // Show speech bubble when message changes
  useEffect(() => {
    if (message) {
      setShowBubble(true);
      clearTimeout(bubbleTimer.current);
      bubbleTimer.current = window.setTimeout(() => setShowBubble(false), 5000);
    } else {
      setShowBubble(false);
    }
    return () => { if (bubbleTimer.current) clearTimeout(bubbleTimer.current); };
  }, [message]);

  // ── Determine animation ──────────────────────────────────────────────────
  const bobAnim = cfg.bounce
    ? `wren-bounce ${cfg.bobDuration} ease-in-out infinite`
    : `wren-bob ${cfg.bobDuration} ease-in-out infinite`;

  const breathAnim = cfg.bounce
    ? "none"
    : `wren-breathe ${cfg.breathDuration} ease-in-out infinite`;

  const extraAnim = cfg.wiggle
    ? `wren-wiggle 2.2s ease-in-out infinite`
    : cfg.leanForward
    ? `wren-lean 2.0s ease-in-out infinite`
    : "none";

  // Combined animation string
  const animationValue = extraAnim !== "none"
    ? `${bobAnim}, ${breathAnim}, ${extraAnim}`
    : `${bobAnim}, ${breathAnim}`;

  // ── Base element style ───────────────────────────────────────────────────
  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    display: "block",
    ["--wren-bob" as string]: `-${cfg.bobAmount}`,
    ["--wren-breath" as string]: cfg.breathAmount,
    animation: animationValue,
    cursor: onClick ? "pointer" : "default",
    userSelect: "none",
    WebkitUserSelect: "none",
    flexShrink: 0,
  };

  // ── Render: background-image crop for sprite sheets, <img> for SVG ───────
  const birdElement = cfg.bgCrop ? (
    <div
      style={{
        ...baseStyle,
        backgroundImage: `url(${cfg.asset})`,
        backgroundSize: cfg.bgCrop.backgroundSize,
        backgroundPosition: cfg.bgCrop.backgroundPosition,
        backgroundRepeat: "no-repeat",
        borderRadius: 4,
      }}
      role="img"
      aria-label="Wren"
      onClick={onClick}
    />
  ) : (
    <img
      src={cfg.asset}
      alt="Wren"
      draggable={false}
      style={{ ...baseStyle, objectFit: "contain" }}
      onClick={onClick}
    />
  );

  return (
    <div
      className={cn("relative inline-flex items-end justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Glow ring */}
      {glow && (
        <div
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, oklch(0.74 0.16 58 / 0.35) 0%, transparent 70%)",
            animation: "wren-glow-pulse 2.4s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Main bird */}
      {birdElement}

      {/* Speech bubble */}
      {showBubble && message && (
        <div
          style={{
            position: "absolute",
            bottom: size + 8,
            left: "50%",
            transform: "translateX(-50%)",
            background: "oklch(0.18 0.02 270 / 0.95)",
            border: "1px solid oklch(1 0 0 / 0.10)",
            borderRadius: 10,
            padding: "6px 10px",
            fontSize: 11,
            lineHeight: 1.4,
            color: "oklch(0.88 0.01 270)",
            whiteSpace: "nowrap",
            maxWidth: 200,
            overflow: "hidden",
            boxShadow: "0 4px 16px oklch(0 0 0 / 0.4)",
            animation: "wren-bubble-in 0.25s ease-out both",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {message}
          {/* Tail */}
          <div
            style={{
              position: "absolute",
              bottom: -6,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid oklch(0.18 0.02 270 / 0.95)",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default WrenCompanion;
