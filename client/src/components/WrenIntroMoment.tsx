/**
 * WrenIntroMoment — Priority 8.8
 *
 * Full-screen first-run Wren introduction overlay shown the first time a user
 * lands on Today after completing onboarding. Shown once, persisted via
 * the user_profiles.hasSeenWrenIntro database column (survives device changes).
 *
 * Lines (from cleanup brief):
 *   "Hi. I'm Wren."
 *   "I'll hold the thread of your work — even when life pulls you away."
 *   "When you come back, I'll meet you where you left off."
 *   "Let's start with one small thing."
 *   "— Wren"
 */
import { useState, useEffect, useRef } from "react";
import { WREN_CLIPS, WREN_STILLS } from "@/lib/wrenClips";
import { ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

// Word-by-word reveal (same pattern as OnboardingPage)
function WordReveal({ text, active, delay = 0 }: { text: string; active: boolean; delay?: number }) {
  const words = text.split(" ");
  const [vis, setVis] = useState<boolean[]>(Array(words.length).fill(false));
  useEffect(() => {
    if (!active) { setVis(Array(words.length).fill(false)); return; }
    const ts = words.map((_, i) =>
      setTimeout(() => setVis(p => { const n = [...p]; n[i] = true; return n; }), delay + i * 85)
    );
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, text, delay]);
  return (
    <span>
      {words.map((w, i) => (
        <span key={i} style={{
          display: "inline-block",
          opacity: vis[i] ? 1 : 0,
          transform: vis[i] ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)",
          marginRight: "0.28em",
        }}>{w}</span>
      ))}
    </span>
  );
}

function Fade({ visible, delay = 0, children, style }: {
  visible: boolean; delay?: number; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(14px)",
      transition: visible
        ? `opacity 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms`
        : "none",
      pointerEvents: visible ? "auto" : "none",
      ...style,
    }}>
      {children}
    </div>
  );
}

// Derive time-of-day context once at module evaluation time
function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

const TIME_OF_DAY = getTimeOfDay();

const CLOSING_LINE: Record<typeof TIME_OF_DAY, string> = {
  morning: "Let's start with one small thing.",
  afternoon: "Let's pick up where you left off.",
  evening: "Let's close the day with intention.",
  night: "Let's wind down and hold the thread for tomorrow.",
};

const CTA_LABEL: Record<typeof TIME_OF_DAY, string> = {
  morning: "Start with a morning check-in",
  afternoon: "Start with a midday check-in",
  evening: "Start with an evening close",
  night: "Start with an evening close",
};

const LINES = [
  { text: "Hi. I'm Wren.", size: "clamp(2rem, 7vw, 3rem)", weight: 300 },
  { text: "I'll hold the thread of your work — even when life pulls you away.", size: "clamp(1.1rem, 3.5vw, 1.5rem)", weight: 300 },
  { text: "When you come back, I'll meet you where you left off.", size: "clamp(1.1rem, 3.5vw, 1.5rem)", weight: 300 },
  { text: CLOSING_LINE[TIME_OF_DAY], size: "clamp(1.1rem, 3.5vw, 1.5rem)", weight: 400 },
];

interface WrenIntroMomentProps {
  onDone: () => void;
}

export function WrenIntroMoment({ onDone }: WrenIntroMomentProps) {
  const [lineIdx, setLineIdx] = useState(0);
  const [lineActive, setLineActive] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [exiting, setExiting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const markSeen = trpc.settings.markWrenIntroSeen.useMutation();

  // Fade in video
  useEffect(() => {
    const t = setTimeout(() => setVideoVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Start first line
  useEffect(() => {
    const t = setTimeout(() => setLineActive(true), 1000);
    return () => clearTimeout(t);
  }, []);

  // Auto-advance lines
  useEffect(() => {
    if (!lineActive) return;
    if (lineIdx >= LINES.length - 1) {
      // Last line — show CTA after words finish
      const wordCount = LINES[lineIdx].text.split(" ").length;
      const t = setTimeout(() => setShowCTA(true), wordCount * 85 + 600);
      return () => clearTimeout(t);
    }
    const wordCount = LINES[lineIdx].text.split(" ").length;
    const dur = wordCount * 85 + 2800;
    const t = setTimeout(() => {
      setLineActive(false);
      setTimeout(() => { setLineIdx(i => i + 1); setLineActive(true); }, 350);
    }, dur);
    return () => clearTimeout(t);
  }, [lineIdx, lineActive]);

  const handleDone = () => {
    // Persist to DB (fire-and-forget — don't block UX on network)
    markSeen.mutate();
    setExiting(true);
    setTimeout(onDone, 700);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#161815",
      overflow: "hidden",
    }}>
      {/* Wren video — full bleed, screen blend */}
      <div style={{
        position: "absolute", inset: 0,
        opacity: videoVisible ? 1 : 0,
        transition: "opacity 1.8s ease",
      }}>
        {videoFailed ? (
          !posterFailed && (
            <img
              src={WREN_STILLS.evidenceCleanPoster}
              alt=""
              aria-hidden="true"
              onError={() => setPosterFailed(true)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", mixBlendMode: "screen" }}
            />
          )
        ) : (
          <video
            ref={videoRef}
            poster={WREN_STILLS.evidenceCleanPoster}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onError={() => setVideoFailed(true)}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "center",
              mixBlendMode: "screen",
            }}
          >
            <source src={WREN_CLIPS.blobFlyingFun} type="video/mp4" />
          </video>
        )}
      </div>

      {/* Gradient overlays */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 30%)",
      }} />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(to top, rgba(0,0,0,0.90) 0%, transparent 50%)",
      }} />

      {/* Amber radial glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 50% 60%, oklch(0.74 0.14 72 / 0.08) 0%, transparent 60%)",
      }} />

      {/* Exit fade-to-black */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 50, pointerEvents: "none",
        background: "#000",
        opacity: exiting ? 1 : 0,
        transition: exiting ? "opacity 0.65s ease" : "none",
      }} />

      {/* Skip */}
      <button
        onClick={handleDone}
        style={{
          position: "absolute",
          top: "max(calc(env(safe-area-inset-top, 0px) + 1rem), 1.5rem)",
          right: "1.5rem",
          zIndex: 60,
          color: "rgba(255,255,255,0.28)",
          fontSize: "0.7rem",
          letterSpacing: "0.12em",
          background: "none", border: "none", cursor: "pointer",
          padding: "0.5rem",
          fontFamily: "inherit",
        }}
      >
        SKIP
      </button>

      {/* Lower-third text */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "0 2rem max(calc(env(safe-area-inset-bottom, 0px) + 2.5rem), 3rem)",
        maxWidth: "30rem",
        margin: "0 auto",
        zIndex: 40,
      }}>
        {/* Line display */}
        <div style={{ marginBottom: "2rem", minHeight: "6rem" }}>
          <p style={{
            fontSize: LINES[lineIdx].size,
            fontWeight: LINES[lineIdx].weight,
            color: "rgba(255,255,255,0.95)",
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
          }}>
            <WordReveal text={LINES[lineIdx].text} active={lineActive} />
          </p>
        </div>

        {/* Attribution */}
        {showCTA && (
          <Fade visible={showCTA} delay={0} style={{ marginBottom: "1.25rem" }}>
            <p style={{
              fontSize: "0.9rem",
              color: "oklch(0.74 0.14 72 / 0.65)",
              fontStyle: "italic",
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              letterSpacing: "0.01em",
            }}>
              — Wren
            </p>
          </Fade>
        )}

        {/* CTA */}
        {showCTA && (
          <Fade visible={showCTA} delay={300}>
            <button
              onClick={handleDone}
              style={{
                width: "100%",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                padding: "1rem 1.5rem",
                borderRadius: "1rem",
                background: "linear-gradient(135deg, oklch(0.65 0.14 72), oklch(0.80 0.14 72))",
                color: "oklch(0.12 0.02 65)",
                fontSize: "0.9rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 20px oklch(0.74 0.14 72 / 0.35)",
                fontFamily: "inherit",
              }}
            >
              {CTA_LABEL[TIME_OF_DAY]} <ArrowRight style={{ width: "1rem", height: "1rem" }} />
            </button>
          </Fade>
        )}
      </div>
    </div>
  );
}
