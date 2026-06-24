/**
 * OnboardingPage v6 — Full-screen video-as-page redesign
 *
 * Every screen IS the video. Copy floats over it as overlays.
 * Input screens use a semi-transparent frosted panel so text is readable.
 * All videos use mix-blend-mode: screen (black bg removed automatically).
 *
 * Flow:
 *   -1  Invite gate
 *    0  Wren intro (cinematic monologue — dropsAndHovers)
 *    1  Name + work style (peeking)
 *    2  Tone interstitial (winksRipple)
 *    3  Tone selection (closesEyes)
 *    4  Focus hours (hoversThread)
 *    5  First project (perchedDoc)
 *    6  Done / celebration (fliesHug)
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ArrowRight, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import notify from "@/lib/notify";
import { WREN_CLIPS, WREN_STILLS } from "@/lib/wrenClips";


// ─── Types ────────────────────────────────────────────────────────────────────
type WorkStyle =
  | "writing_creative"
  | "business_product"
  | "ministry_coaching"
  | "consulting_client"
  | "multiple"
  | "";

type TonePref = "gentle" | "direct" | "firm";
type FocusHour = "morning" | "midday" | "afternoon" | "evening" | "varies";

// ─── Constants ────────────────────────────────────────────────────────────────
const WORK_STYLES: { value: WorkStyle; label: string; sub: string }[] = [
  { value: "writing_creative",  label: "Writing or creative work",      sub: "Books, content, music, art" },
  { value: "business_product",  label: "Building a business or product", sub: "Startups, SaaS, side projects" },
  { value: "ministry_coaching", label: "Ministry, coaching, or speaking", sub: "Leading, teaching, guiding others" },
  { value: "consulting_client", label: "Consulting or client work",      sub: "Services, freelance, agency" },
  { value: "multiple",          label: "Multiple things at once",        sub: "You're juggling more than one" },
];

const TONE_OPTIONS: { value: TonePref; label: string; description: string }[] = [
  { value: "gentle", label: "Gentle",  description: "Calm, patient, no pressure language" },
  { value: "direct", label: "Direct",  description: "Clear and honest, no softening" },
  { value: "firm",   label: "Firm",    description: "Straight accountability, no filler" },
];

const FOCUS_HOURS: { value: FocusHour; label: string; time: string }[] = [
  { value: "morning",   label: "Morning",   time: "6am – 12pm" },
  { value: "midday",    label: "Midday",    time: "11am – 2pm" },
  { value: "afternoon", label: "Afternoon", time: "1pm – 6pm" },
  { value: "evening",   label: "Evening",   time: "5pm – 10pm" },
  { value: "varies",    label: "It varies", time: "No fixed window" },
];

const focusStartMap: Record<FocusHour, string> = {
  morning: "08:00", midday: "11:00", afternoon: "13:00", evening: "17:00", varies: "09:00",
};
const focusEndMap: Record<FocusHour, string> = {
  morning: "12:00", midday: "14:00", afternoon: "17:00", evening: "21:00", varies: "17:00",
};

// ─── Seamless native loop video ───────────────────────────────────────────────
// Uses the browser's native loop attribute for instant, frame-perfect restart.
// Copy animations are driven by independent state and never re-trigger on loop.
function SmoothLoopVideo({ src, style }: {
  src: string;
  style?: React.CSSProperties;
  crossfadeDuration?: number; // kept for API compatibility, unused
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  }, [src]);
  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: "cover", objectPosition: "center",
        mixBlendMode: "screen",
        ...style,
      }}
    />
  );
}

// ─── Single-play video (plays once, holds last frame) ─────────────────────────
function OnceVideo({ src, style, onEnded }: {
  src: string;
  style?: React.CSSProperties;
  onEnded?: () => void;
}) {
  return (
    <video
      src={src}
      autoPlay
      muted
      playsInline
      preload="auto"
      onEnded={onEnded}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: "cover", objectPosition: "center",
        mixBlendMode: "screen",
        ...style,
      }}
    />
  );
}

// ─── Full-screen video stage ──────────────────────────────────────────────────
// The video fills the screen; children float over it.
function VideoStage({ children, bgColor = "#000" }: {
  children: React.ReactNode;
  bgColor?: string;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10,
      background: bgColor,
      overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

// ─── Standard gradient overlays ───────────────────────────────────────────────
function GradientOverlays({ top = true, bottom = true }: { top?: boolean; bottom?: boolean }) {
  return (
    <>
      {top && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 30%)",
        }} />
      )}
      {bottom && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 45%)",
        }} />
      )}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(to right, rgba(0,0,0,0.2) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.2) 100%)",
      }} />
    </>
  );
}

// ─── Frosted input panel (for data-entry screens) ────────────────────────────
function FrostedPanel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(0,0,0,0.72)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderRadius: "1.5rem 1.5rem 0 0",
      border: "1px solid rgba(255,255,255,0.08)",
      borderBottom: "none",
      padding: "2rem 1.75rem max(calc(env(safe-area-inset-bottom, 0px) + 1.5rem), 2rem)",
      width: "100%",
      maxWidth: "28rem",
      margin: "0 auto",
    }}>
      {children}
    </div>
  );
}

// ─── Lower-third overlay (for cinematic screens) ──────────────────────────────
function LowerThird({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: "0 2rem max(calc(env(safe-area-inset-bottom, 0px) + 2rem), 2.5rem)",
      maxWidth: "28rem",
      margin: "0 auto",
      zIndex: 20,
    }}>
      {children}
    </div>
  );
}

// ─── Word-by-word reveal ──────────────────────────────────────────────────────
function WordReveal({ text, active, delay = 0 }: { text: string; active: boolean; delay?: number }) {
  const words = text.split(" ");
  const [vis, setVis] = useState<boolean[]>(Array(words.length).fill(false));
  useEffect(() => {
    if (!active) { setVis(Array(words.length).fill(false)); return; }
    const ts = words.map((_, i) =>
      setTimeout(() => setVis(p => { const n = [...p]; n[i] = true; return n; }), delay + i * 80)
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
          transform: vis[i] ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)",
          marginRight: "0.28em",
        }}>{w}</span>
      ))}
    </span>
  );
}

// ─── Staggered entrance ───────────────────────────────────────────────────────
function Fade({ visible, delay = 0, children, style }: {
  visible: boolean; delay?: number; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(16px)",
      // Always allow pointer events — removing the none guard so buttons are
      // never blocked by the entrance animation regardless of timing.
      transition: visible
        ? `opacity 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms`
        : "none",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Pill selection button ────────────────────────────────────────────────────
function PillOption({ selected, onClick, children, sub }: {
  selected: boolean; onClick: () => void; children: React.ReactNode; sub?: string;
}) {
  return (
    <button onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-xl transition-all duration-200 active:scale-[0.98]"
      style={{
        background: selected ? "oklch(0.80 0.17 65 / 0.15)" : "rgba(255,255,255,0.05)",
        border: selected ? "1.5px solid oklch(0.80 0.17 65 / 0.7)" : "1.5px solid rgba(255,255,255,0.1)",
      }}
    >
      <div className="text-sm font-medium" style={{ color: selected ? "oklch(0.92 0.10 65)" : "rgba(255,255,255,0.85)" }}>
        {children}
      </div>
      {sub && <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>{sub}</div>}
    </button>
  );
}

// ─── CTA button ───────────────────────────────────────────────────────────────
function CTAButton({ onClick, disabled, loading, children, secondary }: {
  onClick: () => void; disabled?: boolean; loading?: boolean;
  children: React.ReactNode; secondary?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
      style={secondary ? {
        background: "rgba(255,255,255,0.07)",
        color: "rgba(255,255,255,0.5)",
        border: "1.5px solid rgba(255,255,255,0.1)",
      } : {
        background: disabled || loading
          ? "rgba(255,255,255,0.08)"
          : "linear-gradient(135deg, oklch(0.65 0.14 72), oklch(0.80 0.14 72))",
        color: disabled || loading ? "rgba(255,255,255,0.3)" : "oklch(0.12 0.02 65)",
        boxShadow: disabled || loading ? "none" : "0 4px 20px oklch(0.74 0.14 72 / 0.35)",
        cursor: disabled || loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="fixed top-0 inset-x-0 z-50 h-0.5" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div className="h-full transition-all duration-700 ease-out" style={{
        width: `${value}%`,
        background: "linear-gradient(90deg, oklch(0.65 0.14 72), oklch(0.80 0.14 72))",
        boxShadow: "0 0 8px oklch(0.65 0.18 65 / 0.7)",
      }} />
    </div>
  );
}

// ─── Fade-to-black transition wrapper ────────────────────────────────────────
function FadeToBlackTransition({ stepKey, children }: { stepKey: number; children: React.ReactNode }) {
  const [displayed, setDisplayed] = useState(children);
  const [overlay, setOverlay] = useState(0); // 0=transparent, 1=black, fading back to 0
  const prevKey = useRef(stepKey);

  useEffect(() => {
    if (stepKey === prevKey.current) return;
    prevKey.current = stepKey;
    setOverlay(1);
    const t1 = setTimeout(() => { setDisplayed(children); setOverlay(0); }, 280);
    return () => clearTimeout(t1);
  }, [stepKey, children]);

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
      {displayed}
      <div style={{
        position: "fixed", inset: 0, zIndex: 99, pointerEvents: "none",
        background: "#000",
        opacity: overlay,
        transition: overlay === 1 ? "opacity 0.25s ease" : "opacity 0.5s ease",
      }} />
    </div>
  );
}

// ─── Ambient audio hook ───────────────────────────────────────────────────────
function useAmbientAudio(isCinematic: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!audioRef.current) {
      const a = new Audio("https://d36hbw14aib5lz.cloudfront.net/manus-storage/ambient-onboarding_3f8dcae8.mp3");
      a.loop = true;
      a.volume = 0;
      audioRef.current = a;
    }
    const audio = audioRef.current;
    if (isCinematic) {
      audio.play().catch(() => {});
      let v = audio.volume;
      const up = setInterval(() => { v = Math.min(0.08, v + 0.005); audio.volume = v; if (v >= 0.08) clearInterval(up); }, 80);
      return () => clearInterval(up);
    } else {
      let v = audio.volume;
      const dn = setInterval(() => { v = Math.max(0, v - 0.008); audio.volume = v; if (v <= 0) { audio.pause(); clearInterval(dn); } }, 80);
      return () => clearInterval(dn);
    }
  }, [isCinematic]);
}

// ─── SCREEN: Invite Gate ──────────────────────────────────────────────────────
function InviteGateScreen({ onSuccess }: { onSuccess: () => void }) {
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [betaCode, setBetaCode] = useState("");
  const [betaError, setBetaError] = useState<string | null>(null);
  const [betaChecking, setBetaChecking] = useState(false);
  const [showBeta, setShowBeta] = useState(false);
  const [visible, setVisible] = useState(false);

  const validateInvite = trpc.invites.redeem.useMutation();
  const validateBeta = trpc.beta.redeemCode.useMutation();

  useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t); }, []);

  const checkInvite = async () => {
    if (!inviteCode.trim()) return;
    setChecking(true); setInviteError(null);
    try {
      await validateInvite.mutateAsync({ code: inviteCode.trim() });
      onSuccess();
    } catch (e: any) { setInviteError(e?.message || "That code doesn't look right. Try again."); }
    finally { setChecking(false); }
  };

  const checkBeta = async () => {
    if (!betaCode.trim()) return;
    setBetaChecking(true); setBetaError(null);
    try {
      await validateBeta.mutateAsync({ code: betaCode.trim() });
      onSuccess();
    } catch (e: any) { setBetaError(e?.message || "Invalid beta code."); }
    finally { setBetaChecking(false); }
  };

  return (
    <VideoStage>
      {/* Wren peeking as background */}
      <SmoothLoopVideo src={WREN_CLIPS.peeking} />
      <GradientOverlays />

      <LowerThird>
        <Fade visible={visible} delay={0}>
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "oklch(0.80 0.17 65 / 0.85)" }}>
            Early Access
          </p>
        </Fade>
        <Fade visible={visible} delay={80} style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 5vw, 2.2rem)", fontWeight: 400, color: "rgba(255,255,255,0.95)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            You need an invite to get in.
          </h2>
        </Fade>
        <Fade visible={visible} delay={160} style={{ marginBottom: "1.5rem" }}>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            Continuary is invite-only right now. Enter your code below.
          </p>
        </Fade>
        <Fade visible={visible} delay={240} style={{ marginBottom: "1rem" }}>
          <input
            value={inviteCode}
            onChange={e => { setInviteCode(e.target.value.toUpperCase()); setInviteError(null); }}
            onKeyDown={e => e.key === "Enter" && checkInvite()}
            placeholder="INVITE CODE"
            autoFocus
            className="w-full px-5 py-4 rounded-2xl text-sm font-log tracking-widest outline-none"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: inviteError ? "1.5px solid oklch(0.65 0.22 25)" : "1.5px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.9)",
            }}
          />
          {inviteError && <p className="text-xs mt-2 px-1" style={{ color: "oklch(0.72 0.18 25)" }}>{inviteError}</p>}
        </Fade>
        <Fade visible={visible} delay={320} style={{ marginBottom: "0.75rem" }}>
          <CTAButton onClick={checkInvite} disabled={!inviteCode.trim()} loading={checking}>
            Continue <ArrowRight className="w-4 h-4" />
          </CTAButton>
        </Fade>
        <Fade visible={visible} delay={400}>
          {!showBeta ? (
            <button onClick={() => setShowBeta(true)} className="text-xs w-full text-center"
              style={{ color: "oklch(0.80 0.17 65 / 0.5)" }}>
              ✦ Have a beta tester code?
            </button>
          ) : (
            <div className="space-y-2">
              <input
                value={betaCode}
                onChange={e => { setBetaCode(e.target.value.toUpperCase()); setBetaError(null); }}
                onKeyDown={e => e.key === "Enter" && checkBeta()}
                placeholder="BETA CODE"
                autoFocus
                className="w-full px-5 py-4 rounded-2xl text-sm font-log tracking-widest outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: betaError ? "1.5px solid oklch(0.65 0.22 25)" : "1.5px solid oklch(0.80 0.17 65 / 0.3)",
                  color: "rgba(255,255,255,0.9)",
                }}
              />
              {betaError && <p className="text-xs px-1" style={{ color: "oklch(0.72 0.18 25)" }}>{betaError}</p>}
              <button onClick={checkBeta} disabled={!betaCode.trim() || betaChecking}
                className="w-full py-3 rounded-2xl text-sm font-semibold"
                style={{ background: "oklch(0.80 0.17 65 / 0.12)", border: "1.5px solid oklch(0.80 0.17 65 / 0.3)", color: "oklch(0.80 0.14 72)" }}>
                {betaChecking ? "Checking…" : "Activate beta access"}
              </button>
            </div>
          )}
        </Fade>
      </LowerThird>
    </VideoStage>
  );
}

// ─── SCREEN 0: Wren cinematic intro ──────────────────────────────────────────
const INTRO_LINES = [
  "hey there.",
  "you just did something most people skip.",
  "you decided to actually track what matters.",
  "from here — it's noticing, building, repeating.",
  "let's set this up for the way you actually work.",
];

function WrenIntroSequence({ active, onDone }: { active: boolean; onDone: () => void }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [lineActive, setLineActive] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (!active) { setVideoVisible(false); setFadingOut(false); return; }
    const t = setTimeout(() => setVideoVisible(true), 150);
    return () => clearTimeout(t);
  }, [active]);

  useEffect(() => {
    if (!active) { setLineIdx(0); setLineActive(false); return; }
    const t = setTimeout(() => setLineActive(true), 900);
    return () => clearTimeout(t);
  }, [active]);

  useEffect(() => {
    if (!lineActive || !active) return;
    if (lineIdx >= INTRO_LINES.length - 1) return;
    const dur = lineIdx === 0 ? 3000 : 3400;
    const t = setTimeout(() => {
      setLineActive(false);
      setTimeout(() => { setLineIdx(i => i + 1); setLineActive(true); }, 380);
    }, dur);
    return () => clearTimeout(t);
  }, [lineIdx, lineActive, active]);

  const isLast = lineIdx === INTRO_LINES.length - 1;

  const handleDone = () => {
    setFadingOut(true);
    setTimeout(onDone, 650);
  };

  return (
    <VideoStage>
      {/* Full-bleed Wren video */}
      <div style={{ position: "absolute", inset: 0, opacity: videoVisible ? 1 : 0, transition: "opacity 1.6s ease" }}>
        <SmoothLoopVideo src={WREN_CLIPS.dropsAndHovers} crossfadeDuration={1.0} />
      </div>
      <GradientOverlays />

      {/* Fade-out overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "#000", opacity: fadingOut ? 1 : 0,
        transition: fadingOut ? "opacity 0.65s ease" : "none",
        zIndex: 30,
      }} />

      {/* Skip button */}
      <button
        onClick={handleDone}
        style={{
          position: "absolute",
          top: `max(calc(env(safe-area-inset-top, 0px) + 1rem), 1.5rem)`,
          right: "1.5rem",
          zIndex: 40,
          color: "rgba(255,255,255,0.35)",
          fontSize: "0.75rem",
          letterSpacing: "0.1em",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0.5rem",
        }}
      >
        SKIP
      </button>

      {/* Lower-third text */}
      <LowerThird>
        <div style={{ marginBottom: "1.5rem", minHeight: "5rem" }}>
          <p style={{
            fontSize: lineIdx === 0 ? "clamp(1.8rem, 6vw, 2.8rem)" : "clamp(1.2rem, 4vw, 1.75rem)",
            fontWeight: lineIdx === 0 ? 300 : 300,
            color: "rgba(255,255,255,0.95)",
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
          }}>
            <WordReveal text={INTRO_LINES[lineIdx]} active={lineActive} />
          </p>
        </div>

        {isLast && lineActive && (
          <Fade visible={true} delay={INTRO_LINES[lineIdx].split(" ").length * 80 + 400}>
            <CTAButton onClick={handleDone}>
              Let's go <ArrowRight className="w-4 h-4" />
            </CTAButton>
          </Fade>
        )}
      </LowerThird>
    </VideoStage>
  );
}

// ─── SCREEN 1: Name + Work Style ─────────────────────────────────────────────
function StepName({ name, setName, workStyle, setWorkStyle, onNext }: {
  name: string; setName: (v: string) => void;
  workStyle: WorkStyle; setWorkStyle: (v: WorkStyle) => void;
  onNext: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

  return (
    <VideoStage>
       {/* Wren peeking — she's watching you type */}
      <SmoothLoopVideo src={WREN_CLIPS.peeking} />
      <GradientOverlays top={false} />
      {/* Frosted input panel — right side on desktop, full-width on mobile */}
      <div style={{
        position: "absolute", bottom: 0, right: 0,
        width: "min(100%, 480px)",
        maxHeight: "92dvh", overflowY: "auto", overscrollBehavior: "contain",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}>
        <FrostedPanel>
          <Fade visible={visible} delay={0} style={{ marginBottom: "0.25rem" }}>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "oklch(0.80 0.17 65 / 0.85)" }}>
              Step 1 of 3
            </p>
          </Fade>
          <Fade visible={visible} delay={80} style={{ marginBottom: "0.5rem" }}>
            <h2 style={{ fontSize: "clamp(1.4rem, 4.5vw, 2rem)", fontWeight: 400, color: "rgba(255,255,255,0.95)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              What should <strong style={{ fontWeight: 700 }}>Continuary</strong> call you?
            </h2>
          </Fade>
          <Fade visible={visible} delay={160} style={{ marginBottom: "1.25rem" }}>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              We'll use your name throughout the app.
            </p>
          </Fade>

          <Fade visible={visible} delay={240} style={{ marginBottom: "1rem" }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your first name"
              autoFocus
              className="w-full px-5 py-4 rounded-2xl text-base outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1.5px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.9)",
              }}
              onFocus={e => (e.target.style.borderColor = "oklch(0.74 0.14 72 / 0.6)")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
          </Fade>

          <Fade visible={visible} delay={320} style={{ marginBottom: "1.25rem" }}>
            <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>
              What best describes your work right now?
            </p>
            <div className="space-y-2">
              {WORK_STYLES.map(ws => (
                <PillOption key={ws.value} selected={workStyle === ws.value}
                  onClick={() => setWorkStyle(ws.value)} sub={ws.sub}>
                  {ws.label}
                </PillOption>
              ))}
            </div>
          </Fade>

          <Fade visible={visible} delay={400}>
            <CTAButton onClick={onNext} disabled={!name.trim() || !workStyle}>
              Continue <ArrowRight className="w-4 h-4" />
            </CTAButton>
          </Fade>
        </FrostedPanel>
      </div>
    </VideoStage>
  );
}

// ─── SCREEN 2: Tone interstitial ──────────────────────────────────────────────
function StepToneInterstitial({ name, onNext }: { name: string; onNext: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 300); return () => clearTimeout(t); }, []);

  return (
    <VideoStage>
      <SmoothLoopVideo src={WREN_CLIPS.winksRipple} />
      <GradientOverlays />

      <LowerThird>
        <Fade visible={visible} delay={0} style={{ marginBottom: "0.75rem" }}>
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "oklch(0.80 0.17 65 / 0.85)" }}>
            Nice to meet you
          </p>
        </Fade>
        <Fade visible={visible} delay={120} style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 5.5vw, 2.6rem)", fontWeight: 300, color: "rgba(255,255,255,0.95)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            Good to meet you, <span style={{ color: "oklch(0.74 0.14 72)", fontWeight: 600 }}>{name || "friend"}</span>.
          </h2>
        </Fade>
        <Fade visible={visible} delay={280} style={{ marginBottom: "2rem" }}>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            One more thing — how do you want me to talk to you? Some people want gentle nudges. Others want me to be direct. You pick.
          </p>
        </Fade>
        <Fade visible={visible} delay={440}>
          <CTAButton onClick={onNext}>
            Choose my tone <ArrowRight className="w-4 h-4" />
          </CTAButton>
        </Fade>
      </LowerThird>
    </VideoStage>
  );
}

// ─── SCREEN 3: Tone selection ─────────────────────────────────────────────────
function StepTone({ tone, setTone, onNext, onBack }: {
  tone: TonePref | ""; setTone: (v: TonePref) => void;
  onNext: () => void; onBack: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

  return (
    <VideoStage>
      <SmoothLoopVideo src={WREN_CLIPS.closesEyes} />
      <GradientOverlays top={false} />

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        maxHeight: "80dvh", overflowY: "auto", overscrollBehavior: "contain",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}>
        <FrostedPanel>
          <div className="flex items-center gap-3 mb-3">
            <button onClick={onBack} style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Fade visible={visible} delay={0}>
              <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "oklch(0.80 0.17 65 / 0.85)" }}>
                Step 2 of 3
              </p>
            </Fade>
          </div>

          <Fade visible={visible} delay={80} style={{ marginBottom: "0.5rem" }}>
            <h2 style={{ fontSize: "clamp(1.4rem, 4.5vw, 2rem)", fontWeight: 400, color: "rgba(255,255,255,0.95)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              How should I talk to you?
            </h2>
          </Fade>
          <Fade visible={visible} delay={160} style={{ marginBottom: "1.25rem" }}>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              This shapes how Wren speaks to you every day.
            </p>
          </Fade>

          <Fade visible={visible} delay={240} style={{ marginBottom: "1.25rem" }}>
            <div className="space-y-2">
              {TONE_OPTIONS.map(t => (
                <PillOption key={t.value} selected={tone === t.value}
                  onClick={() => setTone(t.value)} sub={t.description}>
                  {t.label}
                </PillOption>
              ))}
            </div>
          </Fade>

          <Fade visible={visible} delay={360}>
            <CTAButton onClick={onNext} disabled={!tone}>
              Continue <ArrowRight className="w-4 h-4" />
            </CTAButton>
          </Fade>
        </FrostedPanel>
      </div>
    </VideoStage>
  );
}

// ─── SCREEN 4: Focus hours ────────────────────────────────────────────────────
function StepFocus({ focusHour, setFocusHour, onNext, onBack }: {
  focusHour: FocusHour | ""; setFocusHour: (v: FocusHour) => void;
  onNext: () => void; onBack: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

  return (
    <VideoStage>
      <SmoothLoopVideo src={WREN_CLIPS.bouncingFun} />
      <GradientOverlays top={false} />

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        maxHeight: "80dvh", overflowY: "auto", overscrollBehavior: "contain",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}>
        <FrostedPanel>
          <div className="flex items-center gap-3 mb-3">
            <button onClick={onBack} style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Fade visible={visible} delay={0}>
              <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "oklch(0.80 0.17 65 / 0.85)" }}>
                Step 3 of 3
              </p>
            </Fade>
          </div>

          <Fade visible={visible} delay={80} style={{ marginBottom: "0.5rem" }}>
            <h2 style={{ fontSize: "clamp(1.4rem, 4.5vw, 2rem)", fontWeight: 400, color: "rgba(255,255,255,0.95)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              When do you do your best work?
            </h2>
          </Fade>
          <Fade visible={visible} delay={160} style={{ marginBottom: "1.25rem" }}>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              Continuary will schedule your focus time around this window.
            </p>
          </Fade>

          <Fade visible={visible} delay={240} style={{ marginBottom: "1.25rem" }}>
            <div className="space-y-2">
              {FOCUS_HOURS.map(fh => (
                <PillOption key={fh.value} selected={focusHour === fh.value}
                  onClick={() => setFocusHour(fh.value)} sub={fh.time}>
                  {fh.label}
                </PillOption>
              ))}
            </div>
          </Fade>

          <Fade visible={visible} delay={360}>
            <CTAButton onClick={onNext} disabled={!focusHour}>
              Continue <ArrowRight className="w-4 h-4" />
            </CTAButton>
          </Fade>
        </FrostedPanel>
      </div>
    </VideoStage>
  );
}

// ─── SCREEN 5: First project ──────────────────────────────────────────────────
function StepProject({ name, projectTitle, setProjectTitle, projectWhy, setProjectWhy,
  projectNext, setProjectNext, onFinish, onSkip, loading }: {
  name: string;
  projectTitle: string; setProjectTitle: (v: string) => void;
  projectWhy: string; setProjectWhy: (v: string) => void;
  projectNext: string; setProjectNext: (v: string) => void;
  onFinish: () => void; onSkip: () => void;
  loading: boolean;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

  return (
    <VideoStage>
      <SmoothLoopVideo src={WREN_CLIPS.perchedDoc} />
      <GradientOverlays top={false} />

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        maxHeight: "90dvh", overflowY: "auto", overscrollBehavior: "contain",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}>
        <FrostedPanel>
          <Fade visible={visible} delay={0} style={{ marginBottom: "0.25rem" }}>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "oklch(0.80 0.17 65 / 0.85)" }}>
              First project
            </p>
          </Fade>
          <Fade visible={visible} delay={80} style={{ marginBottom: "0.5rem" }}>
            <h2 style={{ fontSize: "clamp(1.4rem, 4.5vw, 2rem)", fontWeight: 400, color: "rgba(255,255,255,0.95)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              What's the one thing you're building right now, {name}?
            </h2>
          </Fade>
          <Fade visible={visible} delay={160} style={{ marginBottom: "1.25rem" }}>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              This becomes your first active project. You can add more later.
            </p>
          </Fade>

          <Fade visible={visible} delay={240} style={{ marginBottom: "0.75rem" }}>
            <input
              value={projectTitle}
              onChange={e => setProjectTitle(e.target.value)}
              placeholder="Project name"
              className="w-full px-5 py-4 rounded-2xl text-base outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1.5px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.9)",
              }}
              onFocus={e => (e.target.style.borderColor = "oklch(0.74 0.14 72 / 0.6)")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
          </Fade>

          <Fade visible={visible} delay={320} style={{ marginBottom: "0.75rem" }}>
            <textarea
              value={projectWhy}
              onChange={e => setProjectWhy(e.target.value)}
              placeholder="Why does this matter to you? (optional)"
              rows={2}
              className="w-full px-5 py-3 rounded-2xl text-sm outline-none transition-all resize-none"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1.5px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.9)",
              }}
              onFocus={e => (e.target.style.borderColor = "oklch(0.74 0.14 72 / 0.6)")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
          </Fade>

          <Fade visible={visible} delay={400} style={{ marginBottom: "1.25rem" }}>
            <input
              value={projectNext}
              onChange={e => setProjectNext(e.target.value)}
              placeholder="What's the very next action? (optional)"
              className="w-full px-5 py-4 rounded-2xl text-sm outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1.5px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.9)",
              }}
              onFocus={e => (e.target.style.borderColor = "oklch(0.74 0.14 72 / 0.6)")}
              onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
          </Fade>

          <Fade visible={visible} delay={480} style={{ marginBottom: "0.75rem" }}>
            <CTAButton onClick={onFinish} disabled={!projectTitle.trim()} loading={loading}>
              Set up my space <ArrowRight className="w-4 h-4" />
            </CTAButton>
          </Fade>
          <Fade visible={visible} delay={560}>
            <CTAButton onClick={onSkip} secondary loading={loading}>
              Skip for now
            </CTAButton>
          </Fade>
        </FrostedPanel>
      </div>
    </VideoStage>
  );
}

// ─── SCREEN 6: Focus Sessions intro ─────────────────────────────────────────
function StepFocusSessions({ onNext }: { onNext: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 300); return () => clearTimeout(t); }, []);
  return (
    <VideoStage>
      <SmoothLoopVideo src={WREN_CLIPS.dropsAndHovers} />
      <GradientOverlays />
      <LowerThird>
        <Fade visible={visible} delay={0} style={{ marginBottom: "0.5rem" }}>
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "oklch(0.80 0.17 65 / 0.85)" }}>
            One last thing
          </p>
        </Fade>
        <Fade visible={visible} delay={100} style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 5.5vw, 2.4rem)", fontWeight: 300, color: "rgba(255,255,255,0.95)", lineHeight: 1.25, letterSpacing: "-0.02em" }}>
            Focus Sessions — where you work{" "}
            <span style={{ color: "oklch(0.74 0.14 72)", fontWeight: 600 }}>with Wren</span>.
          </h2>
        </Fade>
        <Fade visible={visible} delay={240} style={{ marginBottom: "1.75rem" }}>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            Set your intention. Choose 25, 50, or 90 minutes. Wren stays present the whole time —
            weaving quietly, checking in at the halfway point, and helping you close out with a next step.
            Your first session is always free.
          </p>
        </Fade>
        <Fade visible={visible} delay={380} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <CTAButton onClick={onNext}>
            Let's begin <ArrowRight className="w-4 h-4" />
          </CTAButton>
          <button
            onClick={onNext}
            className="text-xs text-center"
            style={{ color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer" }}
          >
            Maybe later
          </button>
        </Fade>
      </LowerThird>
    </VideoStage>
  );
}

// ─── SCREEN 7: Done / celebration ────────────────────────────────────────────
function DoneScreen({ name, onDone }: { name: string; onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 400); return () => clearTimeout(t); }, []);

  return (
    <VideoStage>
      {/* Wren flies at camera for a hug — plays once, then loops a calm clip */}
      {!videoEnded ? (
        <OnceVideo src={WREN_CLIPS.fliesHug} onEnded={() => setVideoEnded(true)} />
      ) : (
        <SmoothLoopVideo src={WREN_CLIPS.mainCornerWave} />
      )}
      <GradientOverlays />

      <LowerThird>
        <Fade visible={visible} delay={0} style={{ marginBottom: "0.75rem" }}>
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "oklch(0.80 0.17 65 / 0.85)" }}>
            You're in.
          </p>
        </Fade>
        <Fade visible={visible} delay={120} style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "clamp(1.8rem, 6vw, 2.8rem)", fontWeight: 300, color: "rgba(255,255,255,0.95)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            Welcome to Continuary, <span style={{ color: "oklch(0.74 0.14 72)", fontWeight: 600 }}>{name || "friend"}</span>.
          </h2>
        </Fade>
        <Fade visible={visible} delay={280} style={{ marginBottom: "2rem" }}>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            Your space is ready. Wren will be with you every step of the way — tracking what matters, noticing your patterns, and keeping you moving.
          </p>
        </Fade>
        <Fade visible={visible} delay={440}>
          <CTAButton onClick={onDone}>
            Let's begin <ArrowRight className="w-4 h-4" />
          </CTAButton>
        </Fade>
        <Fade visible={visible} delay={580}>
          <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.30)", marginTop: "0.75rem" }}>
            By continuing, you agree to our{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.50)", textDecoration: "underline", textUnderlineOffset: "2px" }}>
              Terms of Service
            </a>
            {" "}&amp;{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.50)", textDecoration: "underline", textUnderlineOffset: "2px" }}>
              Privacy Policy
            </a>.
          </p>
        </Fade>
      </LowerThird>
    </VideoStage>
  );
}

// ─── Main onboarding inner ───────────────────────────────────────────────────
function OnboardingPageInner({ onDone }: { onDone?: () => void } = {}) {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [step, setStep] = useState<number>(-1);
  const [name, setName] = useState("");
  const [workStyle, setWorkStyle] = useState<WorkStyle>("");
  const [tone, setTone] = useState<TonePref | "">("");
  const [focusHour, setFocusHour] = useState<FocusHour | "">("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectWhy, setProjectWhy] = useState("");
  const [projectNext, setProjectNext] = useState("");

  const completeOnboarding = trpc.settings.completeOnboarding.useMutation({
    onError: () => notify.error("Something went wrong. Please try again."),
  });
  const createProject = trpc.projects.create.useMutation();
  const generateStartHere = trpc.intelligence.generateOnboardingStartHere.useMutation();
  const submitMorning = trpc.checkIns.submitMorning.useMutation();

  // Skip invite gate if user already has access
  useEffect(() => {
    if (!user) return;
    const hasAccess = !!(user.hasRedeemedInvite || user.role === "admin" || user.isPro);
    if (hasAccess && step === -1) setStep(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Pre-fill name from auth
  useEffect(() => {
    if (user?.name && !name) setName(user.name.split(" ")[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name]);

  const goForward = (to: number) => setStep(to);
  const goBack = (to: number) => setStep(to);

  const finishOnboarding = async (skipProject = false) => {
    try {
      let createdProjectId: number | null = null;
      if (!skipProject && projectTitle.trim()) {
        const result = await createProject.mutateAsync({
          title: projectTitle,
          whyItMatters: projectWhy,
          nextStep: projectNext || undefined,
          status: "active",
          priorityLevel: "high",
        });
        createdProjectId = result?.id ?? null;
      }
      await completeOnboarding.mutateAsync({
        name: name.trim() || undefined,
        workTypes: workStyle ? [workStyle] : [],
        distractionPatterns: [],
        focusHoursStart: focusStartMap[(focusHour || "morning") as FocusHour],
        focusHoursEnd: focusEndMap[(focusHour || "morning") as FocusHour],
        tonePreference: (tone || "gentle") as TonePref,
      });
      await utils.auth.me.invalidate();
      await utils.settings.getProfile.invalidate();
      if (createdProjectId) {
        try {
          const result = await generateStartHere.mutateAsync({
            projectId: createdProjectId,
            projectTitle,
            whyItMatters: projectWhy || undefined,
            userNextStep: projectNext || undefined,
            tonePreference: (tone || "gentle") as TonePref,
            workStyle: workStyle || undefined,
          });
          const seedNotes = projectNext?.trim() || result.nextStep?.trim()
            || (projectTitle.trim() ? `Starting project: ${projectTitle}` : undefined);
          await submitMorning.mutateAsync({
            capacityLevel: "partial",
            primaryProjectId: createdProjectId,
            userNotes: seedNotes ?? undefined,
          });
          await utils.dailyPlan.getToday.invalidate();
        } catch { /* non-fatal */ }
      }
      goForward(6);
    } catch { /* error already toasted */ }
  };

  const isPending = completeOnboarding.isPending || createProject.isPending;

  // Ambient audio: play on cinematic screens (0, 2, 6)
  const isCinematic = step === 0 || step === 2 || step === 6 || step === 7;
  useAmbientAudio(isCinematic);

  // Progress
  const progressMap: Record<number, number> = { [-1]: 0, 0: 8, 1: 22, 2: 36, 3: 50, 4: 64, 5: 78, 6: 90, 7: 100 };
  const progress = progressMap[step] ?? 0;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#000" }}>
        <div className="w-full max-w-sm text-center space-y-6">
          <img src={WREN_STILLS.luminousFront} alt="Wren" className="w-20 h-20 rounded-full object-contain mx-auto" style={{ mixBlendMode: "screen" }} />
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>Continuary</h1>
            <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>Sign in to get started.</p>
          </div>
          <a href={getLoginUrl()}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg, oklch(0.65 0.14 72), oklch(0.80 0.14 72))",
              color: "oklch(0.12 0.02 65)",
              boxShadow: "0 4px 20px oklch(0.74 0.14 72 / 0.35)",
            }}>
            Sign in <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  if (step === -1 && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#000" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
      </div>
    );
  }

  return (
    <div style={{ background: "#000", height: "100%", minHeight: "100dvh" }}>
      <ProgressBar value={progress} />
      <FadeToBlackTransition stepKey={step}>
        {step === -1 && <InviteGateScreen onSuccess={() => goForward(0)} />}
        {step === 0 && <WrenIntroSequence active={step === 0} onDone={() => goForward(1)} />}
        {step === 1 && (
          <StepName name={name} setName={setName} workStyle={workStyle}
            setWorkStyle={setWorkStyle} onNext={() => goForward(2)} />
        )}
        {step === 2 && <StepToneInterstitial name={name} onNext={() => goForward(3)} />}
        {step === 3 && (
          <StepTone tone={tone} setTone={setTone}
            onNext={() => goForward(4)} onBack={() => goBack(1)} />
        )}
        {step === 4 && (
          <StepFocus focusHour={focusHour} setFocusHour={setFocusHour}
            onNext={() => goForward(5)} onBack={() => goBack(3)} />
        )}
        {step === 5 && (
          <StepProject
            name={name}
            projectTitle={projectTitle} setProjectTitle={setProjectTitle}
            projectWhy={projectWhy} setProjectWhy={setProjectWhy}
            projectNext={projectNext} setProjectNext={setProjectNext}
            onFinish={() => finishOnboarding(false)}
            onSkip={() => finishOnboarding(true)}
            loading={isPending}
          />
        )}
        {step === 6 && <StepFocusSessions onNext={() => goForward(7)} />}
        {step === 7 && <DoneScreen name={name} onDone={onDone ?? (() => {})} />}
      </FadeToBlackTransition>
    </div>
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────
export function OnboardingPageWithCallback({ onDone }: { onDone?: () => void }) {
  return <OnboardingPageInner onDone={onDone} />;
}

export default function OnboardingPage() {
  return <OnboardingPageInner />;
}
