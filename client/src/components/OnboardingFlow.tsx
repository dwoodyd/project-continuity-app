/**
 * OnboardingFlow v2 — Emotional arc: recognized → forgiven → guided → unburdened → kept
 *
 * 6 slides:
 *   1. The thesis line      — EKG gold line with gap + "You don't need more productivity."
 *   2. Amnesty Protocol     — Re-Entry Card fades in with porch-light glow
 *   3. Threshold Diagnosis  — Arched door opens with amber light spilling out
 *   4. Clarity Engine       — 6 emotional tiles cascade in with stagger
 *   5. Evidence Log         — Identity sentence types itself letter by letter
 *   6. The close            — "You're not behind. You just lost the thread."
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { getLoginUrl } from "@/const";

// ─── Ambient starfield ────────────────────────────────────────────────────────
function Stars() {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        opacity: 0.45,
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
          radial-gradient(1px 1px at 93% 45%, rgba(255,255,255,0.32), transparent 50%)
        `,
      }}
    />
  );
}

// ─── Ambient glow ─────────────────────────────────────────────────────────────
function Glow() {
  return (
    <div
      className="fixed pointer-events-none"
      style={{
        left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        width: 1100, height: 1100,
        background:
          "radial-gradient(circle, rgba(139,155,255,0.06), rgba(246,200,120,0.02) 35%, transparent 65%)",
        filter: "blur(20px)",
      }}
    />
  );
}

// ─── A/B headline test ──────────────────────────────────────────────────────
const AB_VARIANT: "A" | "B" =
  typeof Date !== "undefined" && new Date().getMinutes() % 2 === 1 ? "B" : "A";
if (typeof localStorage !== "undefined")
  localStorage.setItem("onboarding_ab_variant", AB_VARIANT);

// ─── Slide 1: EKG gold line ───────────────────────────────────────────────────
function EkgLine({ active }: { active: boolean }) {
  return (
    <div
      style={{
        position: "relative", width: "100%", maxWidth: 560,
        margin: "0 auto 2rem", height: 140,
      }}
    >
      <svg
        viewBox="0 0 560 140"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
      >
        {/* Segment 1: left to gap */}
        <path
          d="M 10 80 C 60 60, 110 100, 160 70 S 230 40, 280 80 L 320 80"
          fill="none"
          stroke="#f6c878"
          strokeWidth={1.5}
          strokeLinecap="round"
          style={{
            filter: "drop-shadow(0 0 6px rgba(246,200,120,0.35))",
            strokeDasharray: 500,
            strokeDashoffset: active ? 0 : 500,
            transition: active ? "stroke-dashoffset 2.2s ease-out" : "none",
          }}
        />
        {/* Gap dot — the break */}
        <circle
          cx={320} cy={80} r={4}
          fill="#f6c878"
          style={{
            filter: "drop-shadow(0 0 8px rgba(246,200,120,0.7))",
            opacity: active ? 1 : 0,
            transition: active ? "opacity 0.45s ease-out 1.6s" : "none",
          }}
        />
        {/* Segment 2: return to end */}
        <path
          d="M 360 80 C 400 65, 440 95, 490 70 C 520 55, 545 75, 555 65"
          fill="none"
          stroke="#f6c878"
          strokeWidth={1.5}
          strokeLinecap="round"
          style={{
            filter: "drop-shadow(0 0 6px rgba(246,200,120,0.35))",
            strokeDasharray: 300,
            strokeDashoffset: active ? 0 : 300,
            transition: active ? "stroke-dashoffset 1.4s ease-out 2.2s" : "none",
          }}
        />
        {/* Return dot */}
        <circle
          cx={360} cy={80} r={4}
          fill="#f6c878"
          style={{
            filter: "drop-shadow(0 0 8px rgba(246,200,120,0.7))",
            opacity: active ? 1 : 0,
            transition: active ? "opacity 0.45s ease-out 2.2s" : "none",
          }}
        />
        {/* End dot */}
        <circle
          cx={555} cy={65} r={5}
          fill="#f6c878"
          style={{
            filter: "drop-shadow(0 0 10px rgba(246,200,120,0.8))",
            opacity: active ? 1 : 0,
            transition: active ? "opacity 0.45s ease-out 3.4s" : "none",
          }}
        />
      </svg>
    </div>
  );
}

// ─── Slide 2: Re-Entry Card ───────────────────────────────────────────────────
function ReEntryCard({ active }: { active: boolean }) {
  return (
    <div style={{ position: "relative", margin: "1.5rem auto 0", maxWidth: 480 }}>
      {/* Porch-light glow */}
      <div
        style={{
          position: "absolute",
          bottom: -20, left: "10%", right: "10%", height: 60,
          background: "radial-gradient(ellipse, rgba(246,200,120,0.22), transparent 70%)",
          filter: "blur(12px)",
          opacity: active ? 1 : 0,
          transition: active ? "opacity 0.9s ease-out 0.7s" : "none",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 18,
          padding: "1.5rem 1.75rem",
          textAlign: "left",
          backdropFilter: "blur(10px)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(18px)",
          transition: active
            ? "opacity 0.6s ease-out 0.3s, transform 0.6s ease-out 0.3s"
            : "none",
        }}
      >
        <div
          style={{
            color: "#f4b860", fontSize: "0.7rem",
            letterSpacing: "0.18em", textTransform: "uppercase",
            marginBottom: "0.75rem",
          }}
        >
          Re-entry card · 6 days away
        </div>
        <div
          style={{
            fontFamily: '"Iowan Old Style", "Georgia", serif',
            fontSize: "1.15rem", color: "white",
            fontStyle: "italic", lineHeight: 1.45,
          }}
        >
          "I want this shipped before the end of the quarter so I can show it at the conference."
        </div>
        <div
          style={{
            color: "#8a8a96", fontSize: "0.88rem",
            marginTop: "1rem", lineHeight: 1.5,
          }}
        >
          You left off inside{" "}
          <strong style={{ color: "white" }}>Chapter 3 — Market Positioning</strong> — a
          draft paragraph mid-sentence, two research tabs saved, and a note to yourself
          about the pricing section.
        </div>
        <div
          style={{
            marginTop: "1.25rem",
            padding: "0.75rem 0.85rem",
            background: "rgba(139,155,255,0.07)",
            border: "1px solid rgba(139,155,255,0.18)",
            borderRadius: 10,
            color: "#ededf2",
            fontSize: "0.92rem",
          }}
        >
          <span
            style={{
              display: "block", color: "#8b9bff",
              fontSize: "0.65rem", letterSpacing: "0.18em",
              textTransform: "uppercase", marginBottom: "0.3rem",
            }}
          >
            One gentle next step
          </span>
          Re-read the last paragraph you wrote. Just read — don't edit. That's the whole ask.
        </div>
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
    <div
      style={{ position: "relative", width: 220, height: 280, margin: "0 auto 1.75rem" }}
    >
      {/* Arch frame */}
      <div
        style={{
          position: "absolute", inset: 0,
          border: "1px solid rgba(246,200,120,0.35)",
          borderRadius: "110px 110px 0 0",
          boxShadow:
            "0 0 60px rgba(246,200,120,0.12), inset 0 0 30px rgba(246,200,120,0.05)",
        }}
      />
      {/* Amber glow */}
      <div
        style={{
          position: "absolute", left: "50%", bottom: 0,
          transform: `translateX(-50%) scaleY(${open ? 1 : 0})`,
          width: "90%", height: "90%",
          background:
            "radial-gradient(ellipse at bottom, rgba(246,200,120,0.5), transparent 70%)",
          borderRadius: "50%",
          transition: "transform 1600ms ease",
          transformOrigin: "bottom center",
        }}
      />
      {/* Door panel */}
      <div
        style={{
          position: "absolute", inset: 6,
          background:
            "linear-gradient(180deg, rgba(20,20,30,0.6), rgba(0,0,0,0.85))",
          borderRadius: "105px 105px 0 0",
          transformOrigin: "left center",
          transform: open
            ? "perspective(800px) rotateY(-72deg)"
            : "perspective(800px) rotateY(0deg)",
          transition: "transform 1600ms cubic-bezier(0.22, 0.95, 0.4, 1)",
        }}
      />
    </div>
  );
}

// ─── Slide 4: Clarity tiles ───────────────────────────────────────────────────
const FEELINGS = [
  { icon: "🧠", label: "Overwhelm",            glow: "rgba(246,200,120,0.25)" },
  { icon: "⚡", label: "Decision loop",         glow: "rgba(139,92,246,0.25)" },
  { icon: "💡", label: "Creative block",        glow: "rgba(236,72,153,0.2)" },
  { icon: "🌬️", label: "Identity drift",       glow: "rgba(96,165,250,0.2)" },
  { icon: "👥", label: "Relationship tension",  glow: "rgba(52,211,153,0.2)" },
  { icon: "🧭", label: "Purpose fog",           glow: "rgba(186,230,253,0.2)" },
];

function ClarityTiles({ active }: { active: boolean }) {
  const [visible, setVisible] = useState<boolean[]>(new Array(6).fill(false));
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    if (!active) { setVisible(new Array(6).fill(false)); return; }
    const timers = FEELINGS.map((_, i) =>
      setTimeout(
        () => setVisible((prev) => { const n = [...prev]; n[i] = true; return n; }),
        200 + i * 80,
      )
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "0.7rem",
        margin: "1.5rem auto 0",
        maxWidth: 520,
      }}
    >
      {FEELINGS.map((f, i) => (
        <div
          key={f.label}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          style={{
            padding: "0.85rem 0.6rem",
            border: `1px solid ${
              hovered === i ? "rgba(139,155,255,0.3)" : "rgba(255,255,255,0.08)"
            }`,
            borderRadius: 12,
            background: hovered === i ? f.glow : "rgba(255,255,255,0.02)",
            color: "#ededf2",
            fontSize: "0.85rem",
            textAlign: "center",
            cursor: "default",
            opacity: visible[i] ? 1 : 0,
            transform: visible[i] ? "translateY(0)" : "translateY(8px)",
            transition:
              "opacity 0.4s ease, transform 0.4s ease, background 250ms ease, border-color 250ms ease",
            boxShadow: hovered === i ? `0 8px 30px ${f.glow}` : "none",
          }}
        >
          <span style={{ display: "block", fontSize: "1rem", marginBottom: "0.3rem" }}>
            {f.icon}
          </span>
          {f.label}
        </div>
      ))}
    </div>
  );
}

// ─── Slide 5: Typewriter identity sentence ────────────────────────────────────
const IDENTITY_TEXT =
  "Someone who shows up for their work even when the conditions aren't perfect.";

function IdentityCard({ active }: { active: boolean }) {
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const typedRef = useRef(false);

  useEffect(() => {
    if (!active || typedRef.current) return;
    typedRef.current = true;
    setDisplayed("");
    setShowCursor(true);
    setShowStats(false);

    let i = 0;
    function step() {
      if (i <= IDENTITY_TEXT.length) {
        setDisplayed(IDENTITY_TEXT.slice(0, i));
        i++;
        setTimeout(step, 35 + Math.random() * 25);
      } else {
        setTimeout(() => { setShowCursor(false); setShowStats(true); }, 1200);
      }
    }
    setTimeout(step, 400);
  }, [active]);

  useEffect(() => {
    if (!active) {
      typedRef.current = false;
      setDisplayed("");
      setShowCursor(false);
      setShowStats(false);
    }
  }, [active]);

  const stats = [
    { num: "23", lbl: "Sessions" },
    { num: "7",  lbl: "Returns after gap" },
    { num: "4",  lbl: "Hard-day sessions" },
    { num: "11", lbl: "Genuine rest" },
  ];

  return (
    <div
      style={{
        margin: "1.5rem auto 0", maxWidth: 540,
        padding: "2.25rem 2rem",
        background:
          "linear-gradient(180deg, rgba(246,200,120,0.07), rgba(255,255,255,0.02))",
        border: "1px solid rgba(246,200,120,0.18)",
        borderRadius: 18,
        boxShadow:
          "0 40px 100px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        style={{
          color: "#f4b860", fontSize: "0.7rem",
          letterSpacing: "0.18em", textTransform: "uppercase",
          marginBottom: "1rem",
        }}
      >
        This month's identity sentence
      </div>
      <div
        style={{
          fontFamily: '"Iowan Old Style", "Georgia", serif',
          fontSize: "clamp(1.25rem, 2.2vw, 1.55rem)",
          lineHeight: 1.4, color: "white", fontStyle: "italic",
          minHeight: "2.6em",
        }}
      >
        {displayed}
        {showCursor && (
          <span
            style={{
              display: "inline-block", width: 2, height: "1em",
              background: "#f6c878", marginLeft: 2,
              verticalAlign: "-0.1em",
              animation: "cursorBlink 1s steps(2) infinite",
            }}
          />
        )}
      </div>

      {showStats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: "0.5rem",
            marginTop: "1.5rem",
          }}
        >
          {stats.map((s, i) => (
            <div
              key={s.lbl}
              style={{
                padding: "0.6rem 0.4rem",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10,
                background: "rgba(255,255,255,0.01)",
                textAlign: "center",
                opacity: 0,
                animation: `fadeUp 0.4s ease forwards ${i * 100}ms`,
              }}
            >
              <div
                style={{
                  color: "white", fontSize: "1.35rem",
                  fontWeight: 600, lineHeight: 1,
                }}
              >
                {s.num}
              </div>
              <div
                style={{
                  color: "#8a8a96", fontSize: "0.62rem",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  marginTop: "0.2rem",
                }}
              >
                {s.lbl}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div
      style={{
        position: "fixed", bottom: "2rem", left: "50%",
        transform: "translateX(-50%)",
        display: "flex", gap: "0.4rem", zIndex: 10,
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 6,
            width: i + 1 === current ? 22 : 6,
            borderRadius: i + 1 === current ? 4 : "50%",
            background:
              i + 1 === current ? "#f6c878" : "rgba(255,255,255,0.13)",
            transition: "width 400ms ease, background 400ms ease",
          }}
        />
      ))}
    </div>
  );
}

// ─── Shared style helpers ─────────────────────────────────────────────────────
const eyebrowStyle = (warm = false): React.CSSProperties => ({
  fontSize: "0.72rem", letterSpacing: "0.22em", textTransform: "uppercase",
  color: warm ? "#f4b860" : "#8a8a96", marginBottom: "1.6rem",
});

const headlineStyle: React.CSSProperties = {
  fontFamily: '"Iowan Old Style", "Apple Garamond", "Georgia", serif',
  fontWeight: 600,
  fontSize: "clamp(2rem, 4.6vw, 3.1rem)",
  lineHeight: 1.1,
  letterSpacing: "-0.012em",
  color: "white",
  marginBottom: "1.5rem",
};

const accentStyle: React.CSSProperties = {
  color: "#f6c878", fontStyle: "italic", fontWeight: 500,
};

const ledeStyle: React.CSSProperties = {
  color: "#ededf2", opacity: 0.85,
  fontSize: "clamp(1rem, 1.7vw, 1.15rem)",
  lineHeight: 1.6, maxWidth: 520, margin: "0 auto",
};

const quietStyle: React.CSSProperties = {
  color: "#8a8a96", fontSize: "0.95rem", lineHeight: 1.6,
  maxWidth: 460, margin: "1.25rem auto 0",
};

const whisperStyle: React.CSSProperties = {
  color: "#51515c", fontSize: "0.82rem",
  letterSpacing: "0.04em", marginTop: "1rem",
};

const ctaWarmStyle: React.CSSProperties = {
  background: "#f6c878", color: "#14141a", border: "none",
  padding: "0.95rem 2.4rem", borderRadius: 999,
  fontSize: "1rem", fontWeight: 500, cursor: "pointer",
  fontFamily: "inherit",
};

const ghostBtnStyle: React.CSSProperties = {
  background: "transparent", color: "#51515c", border: "none",
  cursor: "pointer", fontSize: "0.88rem", fontFamily: "inherit",
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

  const goTo = useCallback((n: number) => {
    setSlide(n);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  function handleFinish() {
    setFinished(true);
    setTimeout(onSkip, 2200);
  }

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" && slide < TOTAL) goTo(slide + 1);
      if (e.key === "ArrowLeft" && slide > 1) goTo(slide - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slide, goTo]);

  const isActive = (n: number) => slide === n;

  const slideStyle = (n: number): React.CSSProperties => ({
    position: "absolute", inset: 0,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "4rem 2rem",
    opacity: isActive(n) ? 1 : 0,
    transform: isActive(n)
      ? "translateX(0)"
      : n < slide
        ? "translateX(-36px)"
        : "translateX(36px)",
    transition: "opacity 700ms ease, transform 700ms ease",
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
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "#07070b",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif",
          WebkitFontSmoothing: "antialiased",
          overflowX: "hidden", overflowY: "auto",
        }}
      >
        <Stars />
        <Glow />

        {/* Skip */}
        <button
          onClick={onSkip}
          style={{
            position: "fixed", top: "1.25rem", right: "1.25rem", zIndex: 20,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.3)",
            fontSize: "0.7rem", letterSpacing: "0.12em",
            padding: "0.4rem 0.95rem", borderRadius: 999,
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
            justifyContent: "center", padding: "4rem 2rem",
          }}
        >

          {/* ── Slide 1: The thesis line ── */}
          <section style={slideStyle(1)}>
            <div style={innerStyle}>
              <EkgLine active={isActive(1)} />
              <div style={eyebrowStyle(true)}>For minds that work in bursts</div>
              <h1 style={headlineStyle}>
                {AB_VARIANT === "B" ? (
                  <>You haven't found the right system yet.<br /><span style={accentStyle}>Because it wasn't built for how you think.</span></>
                ) : (
                  <>You don't need more productivity.<br /><span style={accentStyle}>You need proof you're already moving.</span></>
                )}
              </h1>
              <p style={ledeStyle}>
                Continuary is the workspace that holds your thread when you can't — and
                shows you, in your own evidence, who you're becoming.
              </p>
              <div style={rowStyle}>
                <button style={ctaWarmStyle} onClick={() => goTo(2)}>
                  Show me how →
                </button>
                <button style={ghostBtnStyle} onClick={() => goTo(2)}>
                  I'm tired of starting over
                </button>
              </div>
            </div>
          </section>

          {/* ── Slide 2: Amnesty Protocol ── */}
          <section style={slideStyle(2)}>
            <div style={innerStyle}>
              <div style={eyebrowStyle()}>Amnesty Protocol</div>
              <h1 style={headlineStyle}>
                Come back after a gap.<br />
                Find the door, <span style={accentStyle}>open</span>.
              </h1>
              <p style={quietStyle}>
                No tabs to reopen. No catch-up to do. Continuary holds your last context
                so returning isn't a punishment.
              </p>
              <ReEntryCard active={isActive(2)} />
              <div style={{ ...rowStyle, marginTop: "2rem" }}>
                <button style={ctaWarmStyle} onClick={() => goTo(3)}>
                  What about when I can't even start? →
                </button>
              </div>
            </div>
          </section>

          {/* ── Slide 3: Threshold Diagnosis ── */}
          <section style={slideStyle(3)}>
            <div style={innerStyle}>
              <div style={eyebrowStyle()}>Threshold Diagnosis</div>
              <ThresholdDoor active={isActive(3)} />
              <h1 style={headlineStyle}>
                Most tools help you plan.<br />
                Continuary helps you <span style={accentStyle}>start.</span>
              </h1>
              <p style={quietStyle}>
                Tell it the project you've been avoiding. It diagnoses what's actually at
                the door — overwhelm, fog, identity drift, fear — and gives you the
                smallest possible first move.
              </p>
              <div style={rowStyle}>
                <button style={ctaWarmStyle} onClick={() => goTo(4)}>
                  And when my head is too loud? →
                </button>
              </div>
            </div>
          </section>

          {/* ── Slide 4: Clarity Engine ── */}
          <section style={slideStyle(4)}>
            <div style={innerStyle}>
              <div style={eyebrowStyle()}>Clarity Engine</div>
              <h1 style={headlineStyle}>
                Unload what's in your head.<br />
                <span style={accentStyle}>Find what's actually happening.</span>
              </h1>
              <p style={quietStyle}>
                Six entry points for what neurodivergent minds actually carry. Brain-dump
                unfiltered. The engine sorts it into what you feel, what you need, and
                your next right step.
              </p>
              <ClarityTiles active={isActive(4)} />
              <p style={whisperStyle}>
                Just start typing. Don't edit. Don't filter. Let it out.
              </p>
              <div style={{ ...rowStyle, marginTop: "2rem" }}>
                <button style={ctaWarmStyle} onClick={() => goTo(5)}>
                  What does it give me back? →
                </button>
              </div>
            </div>
          </section>

          {/* ── Slide 5: Evidence Log ── */}
          <section style={slideStyle(5)}>
            <div style={innerStyle}>
              <div style={eyebrowStyle()}>Evidence Log</div>
              <h1 style={headlineStyle}>
                Every month, one sentence —<br />
                <span style={accentStyle}>in your own evidence.</span>
              </h1>
              <p style={quietStyle}>
                Not a streak counter. Not a score. A sentence that names who you are
                becoming, drawn from sessions started, returns after gaps, hard-day work,
                and genuine rest.
              </p>
              <IdentityCard active={isActive(5)} />
              <div style={{ ...rowStyle, marginTop: "2rem" }}>
                <button style={ctaWarmStyle} onClick={() => goTo(6)}>
                  Build my evidence →
                </button>
              </div>
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
                  <p style={ledeStyle}>
                    Your thread is waiting. We'll be here when you are.
                  </p>
                </>
              ) : (
                <>
                  <div style={eyebrowStyle()}>One last thing</div>
                  <h1 style={headlineStyle}>
                    You're not behind.<br />
                    <span style={accentStyle}>You just lost the thread.</span>
                  </h1>
                  <p style={ledeStyle}>
                    Continuary will hold it, name it, and hand it back to you every time
                    you return. You don't have to remember. You just have to come back.
                  </p>
                  <p style={whisperStyle}>You came back. That's the whole thing.</p>
                  <div style={rowStyle}>
                    <a
                      href={getLoginUrl()}
                      style={{
                        ...ctaWarmStyle,
                        textDecoration: "none",
                        display: "inline-block",
                      }}
                      onClick={handleFinish}
                    >
                      Keep my thread
                    </a>
                    <button style={ghostBtnStyle} onClick={() => goTo(1)}>
                      Watch the demo again
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

        </div>

        <ProgressDots current={slide} total={TOTAL} />
      </div>
    </>
  );
}
