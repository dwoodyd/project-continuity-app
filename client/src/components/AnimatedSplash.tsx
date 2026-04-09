import { useEffect, useState } from "react";

/**
 * AnimatedSplash
 * Plays a 2.8s logo animation on first app load, then calls onComplete.
 * - 0.0s: background fades in
 * - 0.3s: icon container scales in + arch SVG strokes draw on (1.2s)
 * - 1.6s: wordmark "Continuary" fades + slides up
 * - 2.1s: tagline fades in
 * - 2.5s: whole screen fades out
 * - 2.8s: onComplete fires
 */
export function AnimatedSplash({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 300);
    const t2 = setTimeout(() => setPhase("out"), 2400);
    const t3 = setTimeout(() => onComplete(), 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: "oklch(0.09 0.01 270)",
        opacity: phase === "out" ? 0 : 1,
        transition: phase === "out" ? "opacity 0.5s ease-in" : "opacity 0.4s ease-out",
        pointerEvents: "all",
      }}
    >
      {/* Icon container */}
      <div
        style={{
          opacity: phase === "in" ? 0 : 1,
          transform: phase === "in" ? "scale(0.82)" : "scale(1)",
          transition: "opacity 0.5s ease-out, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Rounded square background */}
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
          {/* Animated SVG arch / bird mark */}
          <svg
            width="52"
            height="52"
            viewBox="0 0 52 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer arch */}
            <path
              d="M10 42 C10 22 18 10 26 10 C34 10 42 22 42 42"
              stroke="white"
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
              style={{
                strokeDasharray: 70,
                strokeDashoffset: phase === "in" ? 70 : 0,
                transition: "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1) 0.2s",
              }}
            />
            {/* Inner arch */}
            <path
              d="M17 42 C17 28 21 18 26 18 C31 18 35 28 35 42"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
              style={{
                strokeDasharray: 46,
                strokeDashoffset: phase === "in" ? 46 : 0,
                transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1) 0.45s",
              }}
            />
            {/* Horizontal base line */}
            <path
              d="M8 42 L44 42"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
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
