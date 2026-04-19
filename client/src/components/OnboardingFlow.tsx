/**
 * OnboardingFlow v3 — Rork Max quality
 *
 * Upgrades over v2:
 *   • Word-by-word clip-mask reveal on every headline (staggered 60ms per word)
 *   • Per-slide ambient radial glow that shifts color with the slide
 *   • Touch / swipe gesture navigation (left/right, threshold 48px)
 *   • Thin progress line at bottom instead of dots (cleaner, more cinematic)
 *   • CTA fades in 800ms after slide settles (delayed reveal)
 *   • Slide transition: directional translateX + opacity (same as before, tightened)
 *   • True black (#000) background for maximum contrast
 *
 * Emotional arc: recognized → forgiven → guided → unburdened → kept
 *
 * 6 slides:
 *   1. The thesis line      — EKG gold line + word-reveal headline
 *   2. Amnesty Protocol     — Re-Entry Card with porch-light glow
 *   3. Threshold Diagnosis  — Arched door opens with amber light
 *   4. Clarity Engine       — 6 emotional tiles cascade in
 *   5. Evidence Log         — Identity sentence types itself
 *   6. The close            — "You're not behind. You just lost the thread."
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── A/B headline test ──────────────────────────────────────────────────────
const AB_VARIANT: "A" | "B" =
  typeof Date !== "undefined" && new Date().getMinutes() % 2 === 1 ? "B" : "A";
if (typeof localStorage !== "undefined")
  localStorage.setItem("onboarding_ab_variant", AB_VARIANT);

// ─── Ambient starfield ────────────────────────────────────────────────────────
function Stars() {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        opacity: 0.5,
        background: `
          radial-gradient(1.2px 1.2px at 12% 18%, rgba(255,255,255,0.55), transparent 50%),
          radial-gradient(1px 1px at 78% 82%, rgba(255,255,255,0.45), transparent 50%),
          radial-gradient(1px 1px at 42% 64%, rgba(255,255,255,0.40), transparent 50%),
          radial-gradient(1.4px 1.4px at 88% 22%, rgba(255,255,255,0.55), transparent 50%),
          radial-gradient(1px 1px at 8% 78%, rgba(255,255,255,0.30), transparent 50%),
          radial-gradient(1px 1px at 58% 28%, rgba(255,255,255,0.40), transparent 50%),
          radial-gradient(1px 1px at 32% 90%, rgba(255,255,255,0.25), transparent 50%),
          radial-gradient(1px 1px at 65% 12%, rgba(255,255,255,0.35), transparent 50%),
          radial-gradient(1px 1px at 22% 55%, rgba(255,255,255,0.28), transparent 50%),
          radial-gradient(1px 1px at 93% 45%, rgba(255,255,255,0.32), transparent 50%),
          radial-gradient(1px 1px at 50% 50%, rgba(255,255,255,0.18), transparent 50%),
          radial-gradient(1px 1px at 15% 40%, rgba(255,255,255,0.22), transparent 50%),
          radial-gradient(1px 1px at 72% 60%, rgba(255,255,255,0.20), transparent 50%)
        `,
      }}
    />
  );
}

// ─── Per-slide ambient glow (color shifts with slide) ─────────────────────────
const GLOW_COLORS: Record<number, string> = {
  1: "rgba(246,200,120,0.07), rgba(246,200,120,0.02) 40%, transparent 70%",
  2: "rgba(246,200,120,0.05), rgba(180,160,255,0.03) 40%, transparent 70%",
  3: "rgba(246,180,80,0.08), rgba(246,180,80,0.02) 40%, transparent 70%",
  4: "rgba(120,180,255,0.06), rgba(180,140,255,0.03) 40%, transparent 70%",
  5: "rgba(160,220,180,0.05), rgba(246,200,120,0.03) 40%, transparent 70%",
  6: "rgba(246,200,120,0.09), rgba(246,200,120,0.03) 40%, transparent 70%",
};

function AmbientGlow({ slide }: { slide: number }) {
  return (
    <div
      className="fixed pointer-events-none"
      style={{
        left: "50%", top: "40%",
        transform: "translate(-50%, -50%)",
        width: 1200, height: 1200,
        background: `radial-gradient(circle, ${GLOW_COLORS[slide] ?? GLOW_COLORS[1]})`,
        filter: "blur(24px)",
        transition: "background 1.2s ease",
      }}
    />
  );
}

// ─── Word-by-word clip-mask reveal ────────────────────────────────────────────
/**
 * Splits text into words and reveals each with a clip-mask slide-up animation,
 * staggered by `delayPerWord` ms. Re-triggers when `active` flips to true.
 */
function WordReveal({
  children,
  active,
  delayOffset = 0,
  delayPerWord = 65,
  style,
}: {
  children: string;
  active: boolean;
  delayOffset?: number;
  delayPerWord?: number;
  style?: React.CSSProperties;
}) {
  const words = children.split(" ");
  return (
    <span style={{ display: "inline", ...style }}>
      {words.map((word, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            overflow: "hidden",
            verticalAlign: "bottom",
            marginRight: "0.28em",
          }}
        >
          <span
            style={{
              display: "inline-block",
              transform: active ? "translateY(0)" : "translateY(105%)",
              opacity: active ? 1 : 0,
              transition: active
                ? `transform 0.55s cubic-bezier(0.16,1,0.3,1) ${delayOffset + i * delayPerWord}ms,
                   opacity 0.35s ease ${delayOffset + i * delayPerWord}ms`
                : "none",
            }}
          >
            {word}
          </span>
        </span>
      ))}
    </span>
  );
}

// ─── Delayed CTA wrapper ──────────────────────────────────────────────────────
function DelayedCTA({ active, delay = 900, children }: { active: boolean; delay?: number; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!active) { setVisible(false); return; }
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [active, delay]);
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}
    >
      {children}
    </div>
  );
}

// ─── Slide 1: EKG gold line ───────────────────────────────────────────────────
function EkgLine({ active }: { active: boolean }) {
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 560, margin: "0 auto 2rem", height: 140 }}>
      <svg viewBox="0 0 560 140" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}>
        <path
          d="M 10 80 C 60 60, 110 100, 160 70 S 230 40, 280 80 L 320 80"
          fill="none" stroke="#f6c878" strokeWidth={1.5} strokeLinecap="round"
          style={{
            filter: "drop-shadow(0 0 8px rgba(246,200,120,0.5))",
            strokeDasharray: 500,
            strokeDashoffset: active ? 0 : 500,
            transition: active ? "stroke-dashoffset 2.2s ease-out" : "none",
          }}
        />
        <circle cx={320} cy={80} r={4} fill="#f6c878"
          style={{
            filter: "drop-shadow(0 0 10px rgba(246,200,120,0.9))",
            opacity: active ? 1 : 0,
            transition: active ? "opacity 0.45s ease-out 1.6s" : "none",
          }}
        />
        <path
          d="M 320 80 L 340 80 L 350 30 L 360 130 L 370 80 L 550 80"
          fill="none" stroke="#f6c878" strokeWidth={1.5} strokeLinecap="round"
          style={{
            filter: "drop-shadow(0 0 8px rgba(246,200,120,0.5))",
            strokeDasharray: 500,
            strokeDashoffset: active ? 0 : 500,
            transition: active ? "stroke-dashoffset 1.4s ease-out 1.8s" : "none",
          }}
        />
      </svg>
    </div>
  );
}

// ─── Slide 2: Re-Entry Card ───────────────────────────────────────────────────
function ReEntryCard({ active }: { active: boolean }) {
  return (
    <div
      style={{
        margin: "2rem auto 0",
        maxWidth: 480,
        background: "rgba(246,200,120,0.04)",
        border: "1px solid rgba(246,200,120,0.18)",
        borderRadius: 16,
        padding: "1.5rem 2rem",
        textAlign: "left",
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
        transition: active ? "opacity 0.8s ease 0.4s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s" : "none",
        boxShadow: active ? "0 0 40px rgba(246,200,120,0.08), 0 0 80px rgba(246,200,120,0.04)" : "none",
      }}
    >
      <div style={{ fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#f6c878", marginBottom: "0.85rem", opacity: 0.7 }}>
        Re-Entry Card
      </div>
      <p style={{ color: "rgba(255,255,255,0.82)", fontSize: "0.95rem", lineHeight: 1.65, margin: 0, fontStyle: "italic" }}>
        "I want this shipped before the end of the quarter. I keep opening the file and closing it. I don't know where I left off."
      </p>
      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {["Chapter 3 — Market Positioning", "Last opened 6 days ago", "3 open threads"].map(tag => (
          <span key={tag} style={{ fontSize: "0.72rem", padding: "0.25rem 0.65rem", borderRadius: 999, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Slide 3: Threshold Door ──────────────────────────────────────────────────
function ThresholdDoor({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!active) { setOpen(false); return; }
    const t = setTimeout(() => setOpen(true), 350);
    return () => clearTimeout(t);
  }, [active]);
  return (
    <div style={{ position: "relative", width: 180, height: 240, margin: "0 auto 2rem", perspective: 900 }}>
      {/* Door frame */}
      <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(246,180,80,0.35)", borderRadius: "90px 90px 0 0", overflow: "hidden" }}>
        {/* Amber light spill */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 110%, rgba(246,180,80,0.22) 0%, transparent 70%)",
          opacity: open ? 1 : 0,
          transition: "opacity 0.9s ease 0.3s",
        }} />
      </div>
      {/* Door panel */}
      <div style={{
        position: "absolute", inset: "2px", borderRadius: "88px 88px 0 0",
        background: "linear-gradient(180deg, #1a1408 0%, #0d0d0d 100%)",
        transformOrigin: "left center",
        transform: open ? "perspective(900px) rotateY(-52deg)" : "perspective(900px) rotateY(0deg)",
        transition: "transform 1.1s cubic-bezier(0.16,1,0.3,1) 0.35s",
        boxShadow: open ? "-8px 0 32px rgba(246,180,80,0.15)" : "none",
      }}>
        {/* Door knob */}
        <div style={{
          position: "absolute", right: 22, top: "50%",
          width: 8, height: 8, borderRadius: "50%",
          background: "#f6c878",
          boxShadow: "0 0 8px rgba(246,200,120,0.6)",
          opacity: open ? 0 : 0.7,
          transition: "opacity 0.3s ease",
        }} />
      </div>
      {/* Threshold glow on floor */}
      <div style={{
        position: "absolute", bottom: -12, left: "50%", transform: "translateX(-50%)",
        width: 120, height: 20,
        background: "radial-gradient(ellipse, rgba(246,180,80,0.25), transparent 70%)",
        filter: "blur(6px)",
        opacity: open ? 1 : 0,
        transition: "opacity 0.8s ease 0.8s",
      }} />
    </div>
  );
}

// ─── Slide 4: Clarity Tiles ───────────────────────────────────────────────────
const FEELINGS = [
  { label: "Overwhelmed", color: "rgba(246,120,120,0.12)", border: "rgba(246,120,120,0.25)" },
  { label: "Foggy", color: "rgba(180,180,255,0.10)", border: "rgba(180,180,255,0.22)" },
  { label: "Stuck", color: "rgba(246,200,120,0.10)", border: "rgba(246,200,120,0.22)" },
  { label: "Drifting", color: "rgba(120,200,246,0.10)", border: "rgba(120,200,246,0.22)" },
  { label: "Afraid", color: "rgba(200,120,246,0.10)", border: "rgba(200,120,246,0.22)" },
  { label: "Tired", color: "rgba(120,246,180,0.10)", border: "rgba(120,246,180,0.22)" },
];

function ClarityTiles({ active }: { active: boolean }) {
  const [shown, setShown] = useState<boolean[]>(Array(FEELINGS.length).fill(false));
  useEffect(() => {
    if (!active) { setShown(Array(FEELINGS.length).fill(false)); return; }
    const timers = FEELINGS.map((_, i) =>
      setTimeout(() => setShown(prev => { const n = [...prev]; n[i] = true; return n; }), 200 + i * 110)
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", justifyContent: "center", margin: "1.75rem auto 0", maxWidth: 480 }}>
      {FEELINGS.map(({ label, color, border }, i) => (
        <div key={label} style={{
          padding: "0.5rem 1.1rem",
          borderRadius: 999,
          background: color,
          border: `1px solid ${border}`,
          color: "rgba(255,255,255,0.75)",
          fontSize: "0.85rem",
          letterSpacing: "0.03em",
          opacity: shown[i] ? 1 : 0,
          transform: shown[i] ? "translateY(0) scale(1)" : "translateY(12px) scale(0.92)",
          transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1)",
        }}>
          {label}
        </div>
      ))}
    </div>
  );
}

// ─── Slide 5: Identity Card (typewriter) ─────────────────────────────────────
const IDENTITY_SENTENCE =
  "You are someone who keeps returning to the work — even when it's hard, even after gaps, even when you can't see the whole path.";

function IdentityCard({ active }: { active: boolean }) {
  const [text, setText] = useState("");
  const [showStats, setShowStats] = useState(false);
  const idxRef = useRef(0);
  useEffect(() => {
    if (!active) { setText(""); idxRef.current = 0; setShowStats(false); return; }
    const interval = setInterval(() => {
      if (idxRef.current < IDENTITY_SENTENCE.length) {
        idxRef.current++;
        setText(IDENTITY_SENTENCE.slice(0, idxRef.current));
      } else {
        clearInterval(interval);
        setTimeout(() => setShowStats(true), 400);
      }
    }, 28);
    return () => clearInterval(interval);
  }, [active]);
  return (
    <div style={{
      margin: "2rem auto 0", maxWidth: 520,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, padding: "1.75rem 2rem",
      textAlign: "left",
    }}>
      <div style={{ fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a8a96", marginBottom: "1rem" }}>
        Monthly Identity Statement
      </div>
      <p style={{ color: "rgba(255,255,255,0.88)", fontSize: "1rem", lineHeight: 1.7, margin: 0, minHeight: "4.5rem" }}>
        {text}
        <span style={{ animation: "cursorBlink 1s step-end infinite", color: "#f6c878", opacity: text.length < IDENTITY_SENTENCE.length ? 1 : 0 }}>|</span>
      </p>
      {showStats && (
        <div style={{ marginTop: "1.25rem", display: "flex", gap: "1.5rem", opacity: showStats ? 1 : 0, transition: "opacity 0.6s ease" }}>
          {[["24", "sessions"], ["7", "returns"], ["3", "hard days"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 600, color: "#f6c878", lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: "0.7rem", color: "#51515c", letterSpacing: "0.08em", marginTop: "0.2rem" }}>{l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Thin progress line ───────────────────────────────────────────────────────
function ProgressLine({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10, padding: "0 0 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>
          {current} of {total}
        </span>
      </div>
      <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.06)" }}>
        <div style={{
          height: "100%",
          width: `${(current / total) * 100}%`,
          background: "linear-gradient(90deg, rgba(246,200,120,0.4), rgba(246,200,120,0.8))",
          transition: "width 600ms cubic-bezier(0.16,1,0.3,1)",
          boxShadow: "0 0 8px rgba(246,200,120,0.4)",
        }} />
      </div>
    </div>
  );
}

// ─── Shared style helpers ─────────────────────────────────────────────────────
const eyebrowStyle = (warm = false): React.CSSProperties => ({
  fontSize: "0.68rem", letterSpacing: "0.24em", textTransform: "uppercase",
  color: warm ? "#f4b860" : "rgba(255,255,255,0.28)", marginBottom: "1.4rem",
});

const headlineStyle: React.CSSProperties = {
  fontFamily: '"Iowan Old Style", "Apple Garamond", "Georgia", serif',
  fontWeight: 600,
  fontSize: "clamp(2rem, 4.6vw, 3.2rem)",
  lineHeight: 1.08,
  letterSpacing: "-0.015em",
  color: "white",
  marginBottom: "1.5rem",
};

const accentStyle: React.CSSProperties = {
  color: "#f6c878", fontStyle: "italic", fontWeight: 500,
};

const ledeStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.72)",
  fontSize: "clamp(1rem, 1.7vw, 1.15rem)",
  lineHeight: 1.65, maxWidth: 520, margin: "0 auto",
};

const quietStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.52)", fontSize: "0.95rem", lineHeight: 1.65,
  maxWidth: 460, margin: "0 auto",
};

const whisperStyle: React.CSSProperties = {
  color: "#3a3a46", fontSize: "0.82rem",
  letterSpacing: "0.04em", marginTop: "1rem",
};

const ctaWarmStyle: React.CSSProperties = {
  background: "#f6c878", color: "#0d0d0d", border: "none",
  padding: "0.95rem 2.4rem", borderRadius: 999,
  fontSize: "1rem", fontWeight: 600, cursor: "pointer",
  fontFamily: "inherit", letterSpacing: "-0.01em",
};

const ghostBtnStyle: React.CSSProperties = {
  background: "transparent", color: "rgba(255,255,255,0.28)", border: "none",
  cursor: "pointer", fontSize: "0.85rem", fontFamily: "inherit",
  fontStyle: "italic",
};

// ─── Main export ──────────────────────────────────────────────────────────────
interface Props {
  onSkip: () => void;
}

export function OnboardingFlow({ onSkip }: Props) {
  const [slide, setSlide] = useState(1);
  const [finished, setFinished] = useState(false);
  const TOTAL = 6;
  const { user } = useAuth();
  const recordEvent = trpc.gamification.recordEvent.useMutation();
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback((n: number) => {
    setSlide(n);
    window.scrollTo({ top: 0, behavior: "instant" });
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
  }, []);

  function handleFinish() {
    setFinished(true);
    setTimeout(onSkip, 2200);
  }

  // Auto-advance slide 1 after EKG animation
  useEffect(() => {
    if (slide !== 1) return;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const t = setTimeout(() => goTo(2), isMobile ? 7000 : 5000);
    return () => clearTimeout(t);
  }, [slide, goTo]);

  // Slide drop-off analytics
  useEffect(() => {
    if (!user) return;
    recordEvent.mutate({
      eventType: "onboarding_slide",
      label: `slide_${slide}`,
      metadata: JSON.stringify({ ab: AB_VARIANT }),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide, user?.id]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" && slide < TOTAL) goTo(slide + 1);
      if (e.key === "ArrowLeft" && slide > 1) goTo(slide - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slide, goTo]);

  // Touch / swipe navigation
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -48 && slide < TOTAL) goTo(slide + 1);
    if (dx > 48 && slide > 1) goTo(slide - 1);
  }

  const isActive = (n: number) => slide === n;

  const slideStyle = (n: number): React.CSSProperties => ({
    position: "absolute", inset: 0,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "4rem 2rem 5rem",
    opacity: isActive(n) ? 1 : 0,
    transform: isActive(n)
      ? "translateX(0)"
      : n < slide ? "translateX(-40px)" : "translateX(40px)",
    transition: "opacity 650ms cubic-bezier(0.16,1,0.3,1), transform 650ms cubic-bezier(0.16,1,0.3,1)",
    pointerEvents: isActive(n) ? "auto" : "none",
  });

  const innerStyle: React.CSSProperties = {
    width: "100%", maxWidth: 720, textAlign: "center",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: "0.85rem", marginTop: "2.25rem",
  };

  return (
    <>
      <style>{`
        @keyframes cursorBlink { 50% { opacity: 0; } }
      `}</style>

      <div
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "#000",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif",
          WebkitFontSmoothing: "antialiased",
          overflowX: "hidden", overflowY: "auto",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Stars />
        <AmbientGlow slide={slide} />

        {/* Skip */}
        <button
          onClick={onSkip}
          style={{
            position: "fixed", top: "1.25rem", right: "1.25rem", zIndex: 20,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.25)",
            fontSize: "0.65rem", letterSpacing: "0.14em",
            padding: "0.38rem 0.9rem", borderRadius: 999,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          SKIP
        </button>

        {/* Stage */}
        <div
          style={{
            position: "relative", minHeight: "100vh",
            display: "flex", alignItems: "center",
            justifyContent: "center",
          }}
        >

          {/* ── Slide 1: The thesis line ── */}
          <section style={slideStyle(1)}>
            <div style={innerStyle}>
              <EkgLine active={isActive(1)} />
              <div style={eyebrowStyle(true)}>For minds that work in bursts</div>
              <h1 style={headlineStyle}>
                {AB_VARIANT === "B" ? (
                  <>
                    <WordReveal active={isActive(1)} delayOffset={200}>You haven't found the right system yet.</WordReveal>
                    <br />
                    <span style={accentStyle}>
                      <WordReveal active={isActive(1)} delayOffset={900}>Because it wasn't built for how you think.</WordReveal>
                    </span>
                  </>
                ) : (
                  <>
                    <WordReveal active={isActive(1)} delayOffset={200}>You don't need more productivity.</WordReveal>
                    <br />
                    <span style={accentStyle}>
                      <WordReveal active={isActive(1)} delayOffset={900}>You need proof you're already moving.</WordReveal>
                    </span>
                  </>
                )}
              </h1>
              <DelayedCTA active={isActive(1)} delay={2800}>
                <p style={ledeStyle}>
                  Continuary is the workspace that holds your thread when you can't — and
                  shows you, in your own evidence, who you're becoming.
                </p>
                <div style={rowStyle}>
                  <button style={ctaWarmStyle} onClick={() => goTo(2)}>Show me how →</button>
                  <button style={ghostBtnStyle} onClick={() => goTo(2)}>I'm tired of starting over</button>
                </div>
              </DelayedCTA>
            </div>
          </section>

          {/* ── Slide 2: Amnesty Protocol ── */}
          <section style={slideStyle(2)}>
            <div style={innerStyle}>
              <div style={eyebrowStyle()}>Amnesty Protocol</div>
              <h1 style={headlineStyle}>
                <WordReveal active={isActive(2)} delayOffset={100}>Come back after a gap.</WordReveal>
                <br />
                <WordReveal active={isActive(2)} delayOffset={600}>{"Find the door, "}</WordReveal>
                <span style={accentStyle}><WordReveal active={isActive(2)} delayOffset={900}>open.</WordReveal></span>
              </h1>
              <p style={quietStyle}>
                No tabs to reopen. No catch-up to do. Continuary holds your last context
                so returning isn't a punishment.
              </p>
              <ReEntryCard active={isActive(2)} />
              <DelayedCTA active={isActive(2)} delay={1200}>
                <div style={{ ...rowStyle, marginTop: "2rem" }}>
                  <button style={ctaWarmStyle} onClick={() => goTo(3)}>What about when I can't even start? →</button>
                </div>
              </DelayedCTA>
            </div>
          </section>

          {/* ── Slide 3: Threshold Diagnosis ── */}
          <section style={slideStyle(3)}>
            <div style={innerStyle}>
              <div style={eyebrowStyle()}>Threshold Diagnosis</div>
              <ThresholdDoor active={isActive(3)} />
              <h1 style={headlineStyle}>
                <WordReveal active={isActive(3)} delayOffset={600}>Most tools help you plan.</WordReveal>
                <br />
                <WordReveal active={isActive(3)} delayOffset={1100}>{"Continuary helps you "}</WordReveal>
                <span style={accentStyle}><WordReveal active={isActive(3)} delayOffset={1500}>start.</WordReveal></span>
              </h1>
              <p style={quietStyle}>
                Tell it the project you've been avoiding. It diagnoses what's actually at
                the door — overwhelm, fog, identity drift, fear — and gives you the
                smallest possible first move.
              </p>
              <DelayedCTA active={isActive(3)} delay={1800}>
                <div style={rowStyle}>
                  <button style={ctaWarmStyle} onClick={() => goTo(4)}>And when my head is too loud? →</button>
                </div>
              </DelayedCTA>
            </div>
          </section>

          {/* ── Slide 4: Clarity Engine ── */}
          <section style={slideStyle(4)}>
            <div style={innerStyle}>
              <div style={eyebrowStyle()}>Clarity Engine</div>
              <h1 style={headlineStyle}>
                <WordReveal active={isActive(4)} delayOffset={100}>Unload what's in your head.</WordReveal>
                <br />
                <span style={accentStyle}>
                  <WordReveal active={isActive(4)} delayOffset={700}>Find what's actually happening.</WordReveal>
                </span>
              </h1>
              <p style={quietStyle}>
                Six entry points for what neurodivergent minds actually carry. Brain-dump
                unfiltered. The engine sorts it into what you feel, what you need, and
                your next right step.
              </p>
              <ClarityTiles active={isActive(4)} />
              <p style={whisperStyle}>Just start typing. Don't edit. Don't filter. Let it out.</p>
              <DelayedCTA active={isActive(4)} delay={1400}>
                <div style={{ ...rowStyle, marginTop: "2rem" }}>
                  <button style={ctaWarmStyle} onClick={() => goTo(5)}>What does it give me back? →</button>
                </div>
              </DelayedCTA>
            </div>
          </section>

          {/* ── Slide 5: Evidence Log ── */}
          <section style={slideStyle(5)}>
            <div style={innerStyle}>
              <div style={eyebrowStyle()}>Evidence Log</div>
              <h1 style={headlineStyle}>
                <WordReveal active={isActive(5)} delayOffset={100}>Every month, one sentence —</WordReveal>
                <br />
                <span style={accentStyle}>
                  <WordReveal active={isActive(5)} delayOffset={700}>in your own evidence.</WordReveal>
                </span>
              </h1>
              <p style={quietStyle}>
                Not a streak counter. Not a score. A sentence that names who you are
                becoming, drawn from sessions started, returns after gaps, hard-day work,
                and genuine rest.
              </p>
              <IdentityCard active={isActive(5)} />
              <DelayedCTA active={isActive(5)} delay={4500}>
                <div style={{ ...rowStyle, marginTop: "2rem" }}>
                  <button style={ctaWarmStyle} onClick={() => goTo(6)}>Build my evidence →</button>
                </div>
              </DelayedCTA>
            </div>
          </section>

          {/* ── Slide 6: The close ── */}
          <section style={slideStyle(6)}>
            <div style={innerStyle}>
              {finished ? (
                <>
                  <div style={eyebrowStyle(true)}>Kept</div>
                  <h1 style={headlineStyle}>
                    The door is <span style={accentStyle}>open</span>.
                  </h1>
                  <p style={ledeStyle}>Your thread is waiting. We'll be here when you are.</p>
                </>
              ) : (
                <>
                  <div style={eyebrowStyle()}>One last thing</div>
                  <h1 style={headlineStyle}>
                    <WordReveal active={isActive(6)} delayOffset={100}>You're not behind.</WordReveal>
                    <br />
                    <span style={accentStyle}>
                      <WordReveal active={isActive(6)} delayOffset={600}>You just lost the thread.</WordReveal>
                    </span>
                  </h1>
                  <p style={ledeStyle}>
                    Continuary will hold it, name it, and hand it back to you every time
                    you return. You don't have to remember. You just have to come back.
                  </p>
                  <p style={whisperStyle}>You came back. That's the whole thing.</p>
                  <DelayedCTA active={isActive(6)} delay={1200}>
                    <div style={rowStyle}>
                      <a
                        href={getLoginUrl()}
                        style={{ ...ctaWarmStyle, textDecoration: "none", display: "inline-block" }}
                        onClick={handleFinish}
                      >
                        Keep my thread
                      </a>
                      <button style={ghostBtnStyle} onClick={() => goTo(1)}>
                        Watch the demo again
                      </button>
                    </div>
                  </DelayedCTA>
                </>
              )}
            </div>
          </section>

        </div>

        <ProgressLine current={slide} total={TOTAL} />
      </div>
    </>
  );
}
