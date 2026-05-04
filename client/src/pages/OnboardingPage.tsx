/**
 * OnboardingPage v5 — Premium full-screen redesign
 *
 * Design principles (from reference video analysis):
 * - Full-screen dark canvas — no card/border boxes
 * - Staggered text entrance: eyebrow → headline → body, each with delay
 * - Emotional interstitials with Wren speaking directly to the user
 * - Mixed-weight typography: key phrase bolded inline
 * - Full-width pill buttons, solid accent color, heavily rounded
 * - Instant selection feedback: accent border + tinted background on tap
 * - Personalization: user's name used in every subsequent screen
 * - Spring-physics slide transitions (CSS cubic-bezier bounce)
 * - Wren as active speaker, not decoration
 *
 * Flow:
 *   -1  Invite gate (skipped if user already has access)
 *    0  Wren intro sequence (auto-advancing, 5 lines)
 *    1  Name + work style
 *    2  Tone interstitial (Wren reacts to name)
 *    3  Tone selection
 *    4  Focus hours
 *    5  First project
 *    6  Done / celebration
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ArrowRight, ChevronRight, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import WrenPlayer from "@/components/WrenPlayer";

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
  { value: "writing_creative", label: "Writing or creative work", sub: "Books, content, music, art" },
  { value: "business_product", label: "Building a business or product", sub: "Startups, SaaS, side projects" },
  { value: "ministry_coaching", label: "Ministry, coaching, or speaking", sub: "Leading, teaching, guiding others" },
  { value: "consulting_client", label: "Consulting or client work", sub: "Services, freelance, agency" },
  { value: "multiple", label: "Multiple things at once", sub: "You're juggling more than one" },
];

const TONE_OPTIONS: { value: TonePref; label: string; description: string; emoji: string }[] = [
  { value: "gentle", label: "Gentle", description: "Calm, patient, no pressure language", emoji: "🌿" },
  { value: "direct", label: "Direct", description: "Clear and honest, no softening", emoji: "⚡" },
  { value: "firm", label: "Firm", description: "Straight accountability, no filler", emoji: "🔩" },
];

const FOCUS_HOURS: { value: FocusHour; label: string; time: string }[] = [
  { value: "morning", label: "Morning", time: "6am – 12pm" },
  { value: "midday", label: "Midday", time: "11am – 2pm" },
  { value: "afternoon", label: "Afternoon", time: "1pm – 6pm" },
  { value: "evening", label: "Evening", time: "5pm – 10pm" },
  { value: "varies", label: "It varies", time: "No fixed window" },
];

const focusStartMap: Record<FocusHour, string> = {
  morning: "08:00", midday: "11:00", afternoon: "13:00", evening: "17:00", varies: "09:00",
};
const focusEndMap: Record<FocusHour, string> = {
  morning: "12:00", midday: "14:00", afternoon: "17:00", evening: "21:00", varies: "17:00",
};

// ─── Staggered entrance hook ─────────────────────────────────────────────────
function useEntrance(active: boolean, count: number, baseDelay = 0, step = 120) {
  const [visible, setVisible] = useState<boolean[]>(Array(count).fill(false));
  useEffect(() => {
    if (!active) {
      setVisible(Array(count).fill(false));
      return;
    }
    const timers = Array.from({ length: count }, (_, i) =>
      setTimeout(() => setVisible(prev => { const next = [...prev]; next[i] = true; return next; }), baseDelay + i * step)
    );
    return () => timers.forEach(clearTimeout);
  }, [active, count, baseDelay, step]);
  return visible;
}

// ─── Animated entrance element ───────────────────────────────────────────────
function Entrance({
  visible,
  delay = 0,
  children,
  className,
  style,
}: {
  visible: boolean;
  delay?: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
        transition: visible
          ? `opacity 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms`
          : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="fixed top-0 inset-x-0 z-50 h-0.5" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div
        className="h-full transition-all duration-700 ease-out"
        style={{
          width: `${value}%`,
          background: "linear-gradient(90deg, oklch(0.68 0.20 270), oklch(0.80 0.18 270))",
          boxShadow: "0 0 8px oklch(0.68 0.20 270 / 0.6)",
        }}
      />
    </div>
  );
}

// ─── Pill selection button ────────────────────────────────────────────────────
function PillOption({
  selected,
  onClick,
  children,
  sub,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-5 py-4 rounded-2xl transition-all duration-200 active:scale-[0.98]"
      style={{
        background: selected ? "oklch(0.68 0.20 270 / 0.14)" : "rgba(255,255,255,0.04)",
        border: selected ? "1.5px solid oklch(0.68 0.20 270 / 0.7)" : "1.5px solid rgba(255,255,255,0.08)",
        boxShadow: selected ? "0 0 0 1px oklch(0.68 0.20 270 / 0.2) inset" : "none",
      }}
    >
      <div
        className="text-sm font-medium"
        style={{ color: selected ? "oklch(0.88 0.12 270)" : "rgba(255,255,255,0.82)" }}
      >
        {children}
      </div>
      {sub && (
        <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
          {sub}
        </div>
      )}
    </button>
  );
}

// ─── Primary CTA button ───────────────────────────────────────────────────────
function CTAButton({
  onClick,
  disabled,
  loading,
  children,
  secondary,
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
      style={
        secondary
          ? {
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.5)",
              border: "1.5px solid rgba(255,255,255,0.08)",
            }
          : {
              background:
                disabled || loading
                  ? "rgba(255,255,255,0.08)"
                  : "linear-gradient(135deg, oklch(0.52 0.22 270), oklch(0.62 0.22 270))",
              color: disabled || loading ? "rgba(255,255,255,0.3)" : "white",
              boxShadow:
                disabled || loading
                  ? "none"
                  : "0 4px 20px oklch(0.52 0.22 270 / 0.4), 0 1px 0 rgba(255,255,255,0.1) inset",
              cursor: disabled || loading ? "not-allowed" : "pointer",
            }
      }
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
}

// ─── Eyebrow label ────────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-bold tracking-[0.18em] uppercase"
      style={{ color: "oklch(0.80 0.18 270 / 0.7)" }}
    >
      {children}
    </p>
  );
}

// ─── Headline with mixed weight ───────────────────────────────────────────────
function Headline({ children, size = "lg" }: { children: React.ReactNode; size?: "lg" | "xl" }) {
  return (
    <h2
      className={cn("leading-tight tracking-tight", size === "xl" ? "text-4xl" : "text-3xl")}
      style={{ color: "rgba(255,255,255,0.95)", fontWeight: 400 }}
    >
      {children}
    </h2>
  );
}

// ─── Wren speech bubble (auto-advancing) ─────────────────────────────────────
const WREN_INTRO_LINES = [
  "hey there.",
  "you just did something most people skip.",
  "you decided to actually track what matters.",
  "from here, it's noticing, building, and repeating.",
  "let's set this up for the way you actually work.",
];

function WrenIntroSequence({ active, onDone }: { active: boolean; onDone: () => void }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [lineVisible, setLineVisible] = useState(false);
  const [wrenVisible, setWrenVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setLineIndex(0);
      setLineVisible(false);
      setWrenVisible(false);
      return;
    }
    // Wren appears first
    const t0 = setTimeout(() => setWrenVisible(true), 200);
    // First line
    const t1 = setTimeout(() => setLineVisible(true), 600);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [active]);

  useEffect(() => {
    if (!lineVisible || !active) return;
    if (lineIndex >= WREN_INTRO_LINES.length - 1) return;
    // Auto-advance each line
    const duration = lineIndex === 0 ? 1800 : 2000;
    const t = setTimeout(() => {
      setLineVisible(false);
      setTimeout(() => {
        setLineIndex(i => i + 1);
        setLineVisible(true);
      }, 350);
    }, duration);
    return () => clearTimeout(t);
  }, [lineIndex, lineVisible, active]);

  const isLast = lineIndex === WREN_INTRO_LINES.length - 1;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center">
      {/* Wren */}
      <div
        style={{
          opacity: wrenVisible ? 1 : 0,
          transform: wrenVisible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.9)",
          transition: "opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)",
          marginBottom: "2rem",
        }}
      >
        <WrenPlayer clip="greeting" size="lg" autoPlay loop />
      </div>

      {/* Line */}
      <div style={{ minHeight: "3.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p
          style={{
            fontSize: lineIndex === 0 ? "2rem" : "1.5rem",
            fontWeight: lineIndex === 0 ? 600 : 400,
            color: "rgba(255,255,255,0.92)",
            lineHeight: 1.3,
            opacity: lineVisible ? 1 : 0,
            transform: lineVisible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.45s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1)",
            maxWidth: "28rem",
          }}
        >
          {WREN_INTRO_LINES[lineIndex]}
        </p>
      </div>

      {/* Skip / Continue */}
      <div
        style={{
          marginTop: "3rem",
          opacity: lineVisible ? 1 : 0,
          transition: "opacity 0.4s ease 0.3s",
        }}
      >
        {isLast ? (
          <button
            onClick={onDone}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, oklch(0.52 0.22 270), oklch(0.62 0.22 270))",
              color: "white",
              boxShadow: "0 4px 20px oklch(0.52 0.22 270 / 0.4)",
            }}
          >
            Let's go <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onDone}
            className="text-xs transition-colors"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            Skip intro →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Invite gate screen ───────────────────────────────────────────────────────
function InviteGateScreen({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [betaCode, setBetaCode] = useState("");
  const [betaError, setBetaError] = useState<string | null>(null);
  const [betaChecking, setBetaChecking] = useState(false);
  const [showBeta, setShowBeta] = useState(false);
  const [active, setActive] = useState(false);
  const visible = useEntrance(active, 4, 0, 130);

  const utils = trpc.useUtils();
  const redeemInvite = trpc.invites.redeem.useMutation();
  const redeemBeta = trpc.beta.redeemCode.useMutation();

  useEffect(() => { const t = setTimeout(() => setActive(true), 80); return () => clearTimeout(t); }, []);

  const checkInvite = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;
    setChecking(true);
    setInviteError(null);
    try {
      await utils.invites.validate.fetch({ code });
      onSuccess();
    } catch {
      setInviteError("Invalid or already used. Check and try again.");
    } finally {
      setChecking(false);
    }
  };

  const checkBeta = async () => {
    const code = betaCode.trim().toUpperCase();
    if (!code) return;
    setBetaChecking(true);
    setBetaError(null);
    try {
      await redeemBeta.mutateAsync({ code });
      toast.success("Beta access activated!");
      onSuccess();
    } catch (e: any) {
      setBetaError(e.message?.includes("already") ? "Already used." : "Invalid beta code.");
    } finally {
      setBetaChecking(false);
    }
  };

  return (
    <div className="flex flex-col justify-center min-h-screen px-8 max-w-md mx-auto">
      <Entrance visible={visible[0]} className="mb-2">
        <Eyebrow>Private Beta</Eyebrow>
      </Entrance>
      <Entrance visible={visible[1]} className="mb-3">
        <Headline>
          You need an <strong style={{ fontWeight: 700 }}>invite code</strong> to continue.
        </Headline>
      </Entrance>
      <Entrance visible={visible[2]} className="mb-8">
        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
          Continuary is in private beta. Enter your code below to get access.
        </p>
      </Entrance>

      <Entrance visible={visible[3]} className="space-y-4">
        <div>
          <input
            value={inviteCode}
            onChange={e => { setInviteCode(e.target.value.toUpperCase()); setInviteError(null); }}
            onKeyDown={e => e.key === "Enter" && checkInvite()}
            placeholder="INVITE CODE"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="w-full px-5 py-4 rounded-2xl text-sm font-mono tracking-[0.12em] outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: inviteError ? "1.5px solid oklch(0.65 0.22 25)" : "1.5px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.9)",
            }}
          />
          {inviteError && (
            <p className="text-xs mt-2 px-1" style={{ color: "oklch(0.72 0.18 25)" }}>{inviteError}</p>
          )}
        </div>

        <CTAButton onClick={checkInvite} disabled={!inviteCode.trim()} loading={checking}>
          Continue <ArrowRight className="w-4 h-4" />
        </CTAButton>

        <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          Don't have a code? Reach out to the Continuary team.
        </p>

        <div className="pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {!showBeta ? (
            <button
              onClick={() => setShowBeta(true)}
              className="text-xs w-full text-center transition-colors"
              style={{ color: "oklch(0.80 0.17 65 / 0.5)" }}
            >
              ✦ Have a beta tester code?
            </button>
          ) : (
            <div className="space-y-3">
              <input
                value={betaCode}
                onChange={e => { setBetaCode(e.target.value.toUpperCase()); setBetaError(null); }}
                onKeyDown={e => e.key === "Enter" && checkBeta()}
                placeholder="BETA CODE"
                autoFocus
                className="w-full px-5 py-4 rounded-2xl text-sm font-mono tracking-[0.12em] outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: betaError ? "1.5px solid oklch(0.65 0.22 25)" : "1.5px solid oklch(0.80 0.17 65 / 0.3)",
                  color: "rgba(255,255,255,0.9)",
                }}
              />
              {betaError && <p className="text-xs px-1" style={{ color: "oklch(0.72 0.18 25)" }}>{betaError}</p>}
              <button
                onClick={checkBeta}
                disabled={!betaCode.trim() || betaChecking}
                className="w-full py-3 rounded-2xl text-sm font-semibold transition-all"
                style={{
                  background: "oklch(0.80 0.17 65 / 0.12)",
                  border: "1.5px solid oklch(0.80 0.17 65 / 0.3)",
                  color: "oklch(0.80 0.17 65)",
                }}
              >
                {betaChecking ? "Checking…" : "Activate beta access"}
              </button>
            </div>
          )}
        </div>
      </Entrance>
    </div>
  );
}

// ─── Step 1: Name + Work Style ────────────────────────────────────────────────
function StepName({
  name,
  setName,
  workStyle,
  setWorkStyle,
  onNext,
}: {
  name: string;
  setName: (v: string) => void;
  workStyle: WorkStyle;
  setWorkStyle: (v: WorkStyle) => void;
  onNext: () => void;
}) {
  const [active, setActive] = useState(false);
  const visible = useEntrance(active, 5, 0, 110);
  useEffect(() => { const t = setTimeout(() => setActive(true), 60); return () => clearTimeout(t); }, []);

  return (
    <div className="flex flex-col justify-center min-h-screen px-8 max-w-md mx-auto pb-8 pt-20">
      <Entrance visible={visible[0]} className="mb-2">
        <Eyebrow>Step 1 of 3 — About you</Eyebrow>
      </Entrance>
      <Entrance visible={visible[1]} className="mb-2">
        <Headline>
          What should <strong style={{ fontWeight: 700 }}>Continuary</strong> call you?
        </Headline>
      </Entrance>
      <Entrance visible={visible[2]} className="mb-8">
        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
          We'll use your name throughout the app to keep things personal.
        </p>
      </Entrance>

      <Entrance visible={visible[3]} className="mb-6 space-y-4">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your first name"
          autoFocus
          className="w-full px-5 py-4 rounded-2xl text-base outline-none transition-all"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1.5px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.9)",
          }}
          onFocus={e => (e.target.style.borderColor = "oklch(0.68 0.20 270 / 0.6)")}
          onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
        />

        <div>
          <p className="text-xs font-semibold tracking-[0.14em] uppercase mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
            What best describes your work right now?
          </p>
          <div className="space-y-2">
            {WORK_STYLES.map(ws => (
              <PillOption
                key={ws.value}
                selected={workStyle === ws.value}
                onClick={() => setWorkStyle(ws.value)}
                sub={ws.sub}
              >
                {ws.label}
              </PillOption>
            ))}
          </div>
        </div>
      </Entrance>

      <Entrance visible={visible[4]}>
        <CTAButton onClick={onNext} disabled={!name.trim()}>
          Continue <ArrowRight className="w-4 h-4" />
        </CTAButton>
      </Entrance>
    </div>
  );
}

// ─── Step 2: Tone interstitial (Wren reacts to name) ─────────────────────────
function StepToneInterstitial({ name, onNext }: { name: string; onNext: () => void }) {
  const [active, setActive] = useState(false);
  const visible = useEntrance(active, 4, 0, 150);
  useEffect(() => { const t = setTimeout(() => setActive(true), 60); return () => clearTimeout(t); }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center max-w-md mx-auto">
      <Entrance visible={visible[0]} className="mb-6">
        <WrenPlayer clip="thinking" size="md" autoPlay loop />
      </Entrance>
      <Entrance visible={visible[1]} className="mb-3">
        <Headline>
          Good to meet you, <strong style={{ fontWeight: 700 }}>{name || "you"}</strong>.
        </Headline>
      </Entrance>
      <Entrance visible={visible[2]} className="mb-10">
        <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
          One quick thing — how direct should I be with you? This shapes how Continuary talks to you every day.
        </p>
      </Entrance>
      <Entrance visible={visible[3]} className="w-full">
        <CTAButton onClick={onNext}>
          Choose my style <ArrowRight className="w-4 h-4" />
        </CTAButton>
      </Entrance>
    </div>
  );
}

// ─── Step 3: Tone selection ───────────────────────────────────────────────────
function StepTone({
  tone,
  setTone,
  onNext,
  onBack,
}: {
  tone: TonePref;
  setTone: (v: TonePref) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [active, setActive] = useState(false);
  const visible = useEntrance(active, 4, 0, 110);
  useEffect(() => { const t = setTimeout(() => setActive(true), 60); return () => clearTimeout(t); }, []);

  return (
    <div className="flex flex-col justify-center min-h-screen px-8 max-w-md mx-auto pb-8 pt-20">
      <Entrance visible={visible[0]} className="mb-2">
        <Eyebrow>Step 2 of 3 — Your style</Eyebrow>
      </Entrance>
      <Entrance visible={visible[1]} className="mb-2">
        <Headline>
          How should Continuary <strong style={{ fontWeight: 700 }}>talk to you?</strong>
        </Headline>
      </Entrance>
      <Entrance visible={visible[2]} className="mb-8 space-y-3">
        {TONE_OPTIONS.map(t => (
          <PillOption
            key={t.value}
            selected={tone === t.value}
            onClick={() => setTone(t.value)}
            sub={t.description}
          >
            <span className="mr-2">{t.emoji}</span>{t.label}
          </PillOption>
        ))}

        <div className="pt-4">
          <p className="text-xs font-semibold tracking-[0.14em] uppercase mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
            When do you do your best focused work?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FOCUS_HOURS.map(fh => (
              <button
                key={fh.value}
                onClick={() => {}}
                className="px-4 py-3 rounded-2xl text-left transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1.5px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "0.8rem",
                }}
              >
                <div style={{ fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>{fh.label}</div>
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>{fh.time}</div>
              </button>
            ))}
          </div>
        </div>
      </Entrance>

      <Entrance visible={visible[3]} className="space-y-3">
        <CTAButton onClick={onNext}>
          Continue <ArrowRight className="w-4 h-4" />
        </CTAButton>
        <CTAButton onClick={onBack} secondary>
          ← Back
        </CTAButton>
      </Entrance>
    </div>
  );
}

// ─── Step 4: Focus hours (dedicated) ─────────────────────────────────────────
function StepFocus({
  focusHour,
  setFocusHour,
  onNext,
  onBack,
}: {
  focusHour: FocusHour;
  setFocusHour: (v: FocusHour) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [active, setActive] = useState(false);
  const visible = useEntrance(active, 4, 0, 110);
  useEffect(() => { const t = setTimeout(() => setActive(true), 60); return () => clearTimeout(t); }, []);

  return (
    <div className="flex flex-col justify-center min-h-screen px-8 max-w-md mx-auto pb-8 pt-20">
      <Entrance visible={visible[0]} className="mb-2">
        <Eyebrow>Step 2 of 3 — Your rhythm</Eyebrow>
      </Entrance>
      <Entrance visible={visible[1]} className="mb-2">
        <Headline>
          When do you do your <strong style={{ fontWeight: 700 }}>best focused work?</strong>
        </Headline>
      </Entrance>
      <Entrance visible={visible[2]} className="mb-8">
        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
          Continuary will schedule your most important work during this window.
        </p>
      </Entrance>

      <Entrance visible={visible[2]} className="mb-8 grid grid-cols-2 gap-3">
        {FOCUS_HOURS.map(fh => (
          <button
            key={fh.value}
            onClick={() => setFocusHour(fh.value)}
            className="px-4 py-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.97]"
            style={{
              background: focusHour === fh.value ? "oklch(0.68 0.20 270 / 0.14)" : "rgba(255,255,255,0.04)",
              border: focusHour === fh.value ? "1.5px solid oklch(0.68 0.20 270 / 0.7)" : "1.5px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="text-sm font-medium" style={{ color: focusHour === fh.value ? "oklch(0.88 0.12 270)" : "rgba(255,255,255,0.82)" }}>
              {fh.label}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{fh.time}</div>
          </button>
        ))}
      </Entrance>

      <Entrance visible={visible[3]} className="space-y-3">
        <CTAButton onClick={onNext}>
          Continue <ArrowRight className="w-4 h-4" />
        </CTAButton>
        <CTAButton onClick={onBack} secondary>
          ← Back
        </CTAButton>
      </Entrance>
    </div>
  );
}

// ─── Step 5: First Project ────────────────────────────────────────────────────
function StepProject({
  name,
  projectTitle,
  setProjectTitle,
  projectWhy,
  setProjectWhy,
  projectNext,
  setProjectNext,
  onFinish,
  onSkip,
  loading,
}: {
  name: string;
  projectTitle: string;
  setProjectTitle: (v: string) => void;
  projectWhy: string;
  setProjectWhy: (v: string) => void;
  projectNext: string;
  setProjectNext: (v: string) => void;
  onFinish: () => void;
  onSkip: () => void;
  loading: boolean;
}) {
  const [active, setActive] = useState(false);
  const visible = useEntrance(active, 4, 0, 120);
  useEffect(() => { const t = setTimeout(() => setActive(true), 60); return () => clearTimeout(t); }, []);

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1.5px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.9)",
    borderRadius: "1rem",
    padding: "1rem 1.25rem",
    width: "100%",
    fontSize: "0.9rem",
    outline: "none",
    transition: "border-color 0.2s",
    resize: "none" as const,
  };

  return (
    <div className="flex flex-col justify-center min-h-screen px-8 max-w-md mx-auto pb-8 pt-20">
      <Entrance visible={visible[0]} className="mb-2">
        <Eyebrow>Step 3 of 3 — Your work</Eyebrow>
      </Entrance>
      <Entrance visible={visible[1]} className="mb-2">
        <Headline>
          {name ? `${name}, what's one thing` : "What's one thing"} you're <strong style={{ fontWeight: 700 }}>actively working on?</strong>
        </Headline>
      </Entrance>
      <Entrance visible={visible[2]} className="mb-8">
        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
          This becomes your first project. You can add more later.
        </p>
      </Entrance>

      <Entrance visible={visible[3]} className="mb-8 space-y-4">
        <div>
          <label className="text-xs font-semibold tracking-[0.14em] uppercase mb-2 block" style={{ color: "rgba(255,255,255,0.3)" }}>
            Project name
          </label>
          <input
            value={projectTitle}
            onChange={e => setProjectTitle(e.target.value)}
            placeholder="What is this project called?"
            autoFocus
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "oklch(0.68 0.20 270 / 0.6)")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
          />
        </div>
        <div>
          <label className="text-xs font-semibold tracking-[0.14em] uppercase mb-2 block" style={{ color: "rgba(255,255,255,0.3)" }}>
            Why does it matter?
          </label>
          <textarea
            value={projectWhy}
            onChange={e => setProjectWhy(e.target.value)}
            placeholder="What would change if this got finished?"
            rows={3}
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "oklch(0.68 0.20 270 / 0.6)")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
          />
        </div>
        <div>
          <label className="text-xs font-semibold tracking-[0.14em] uppercase mb-2 block" style={{ color: "rgba(255,255,255,0.3)" }}>
            What's the next step? <span className="normal-case font-normal opacity-60">(optional)</span>
          </label>
          <input
            value={projectNext}
            onChange={e => setProjectNext(e.target.value)}
            placeholder="Can be added later"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = "oklch(0.68 0.20 270 / 0.6)")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
          />
        </div>

        {/* AI transparency */}
        <p className="text-[11px] leading-relaxed px-4 py-3 rounded-xl" style={{ color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          Continuary uses <strong style={{ color: "rgba(255,255,255,0.5)" }}>Google Gemini 2.5 Flash</strong> via the{" "}
          <strong style={{ color: "rgba(255,255,255,0.5)" }}>Manus AI platform</strong> to generate personalised insights. Your data is not used to train AI models.
        </p>
      </Entrance>

      <Entrance visible={visible[3]} className="space-y-3">
        <CTAButton onClick={onFinish} loading={loading}>
          {loading ? "Setting up your workspace…" : <>Finish setup <ArrowRight className="w-4 h-4" /></>}
        </CTAButton>
        <button
          onClick={onSkip}
          disabled={loading}
          className="w-full text-center text-xs py-2 transition-colors"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          Skip for now — I'll add projects later
        </button>
      </Entrance>
    </div>
  );
}

// ─── Done screen ──────────────────────────────────────────────────────────────
function DoneScreen({ name, onDone }: { name: string; onDone?: () => void }) {
  const [active, setActive] = useState(false);
  const visible = useEntrance(active, 4, 0, 180);
  const [, navigate] = useLocation();
  useEffect(() => { const t = setTimeout(() => setActive(true), 100); return () => clearTimeout(t); }, []);
  const handleContinue = () => onDone ? onDone() : navigate("/");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center max-w-md mx-auto">
      <Entrance visible={visible[0]} className="mb-6">
        <WrenPlayer clip="celebrate" size="lg" autoPlay loop />
      </Entrance>
      <Entrance visible={visible[1]} className="mb-3">
        <Headline size="xl">
          {name ? `You're all set, ${name}.` : "You're all set."}
        </Headline>
      </Entrance>
      <Entrance visible={visible[2]} className="mb-10">
        <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
          Your command center is ready. Wren will be with you every step of the way.
        </p>
      </Entrance>
      <Entrance visible={visible[3]} className="w-full">
        <button
          onClick={handleContinue}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, oklch(0.52 0.22 270), oklch(0.62 0.22 270))",
            color: "white",
            boxShadow: "0 4px 20px oklch(0.52 0.22 270 / 0.4)",
          }}
        >
          Open Continuary <ArrowRight className="w-4 h-4" />
        </button>
      </Entrance>
    </div>
  );
}

// ─── Slide transition wrapper ─────────────────────────────────────────────────
function SlideTransition({
  stepKey,
  direction,
  children,
}: {
  stepKey: string | number;
  direction: "forward" | "back";
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      key={stepKey}
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateX(0)" : direction === "forward" ? "translateX(40px)" : "translateX(-40px)",
        transition: "opacity 0.45s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {children}
    </div>
  );
}

// ─── Main OnboardingPage ──────────────────────────────────────────────────────
export function OnboardingPageWithCallback({ onDone }: { onDone?: () => void }) {
  return <OnboardingPageInner onDone={onDone} />;
}

export default function OnboardingPage() {
  return <OnboardingPageInner />;
}

function OnboardingPageInner({ onDone }: { onDone?: () => void } = {}) {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // step -1 = invite gate, 0 = wren intro, 1 = name/work, 2 = tone interstitial,
  // 3 = tone select, 4 = focus, 5 = project, 6 = done
  const [step, setStep] = useState(-1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  // Skip invite gate if user already has access
  useEffect(() => {
    if (!user) return;
    const hasAccess = !!(user.hasRedeemedInvite || user.role === "admin" || user.isPro);
    if (hasAccess && step === -1) setStep(0);
  }, [user]);

  // Form state
  const [name, setName] = useState(user?.name?.split(" ")[0] ?? "");
  const [workStyle, setWorkStyle] = useState<WorkStyle>("");
  const [tone, setTone] = useState<TonePref>("direct");
  const [focusHour, setFocusHour] = useState<FocusHour>("morning");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectWhy, setProjectWhy] = useState("");
  const [projectNext, setProjectNext] = useState("");

  const completeOnboarding = trpc.settings.completeOnboarding.useMutation({
    onError: () => toast.error("Something went wrong. Please try again."),
  });
  const createProject = trpc.projects.create.useMutation();
  const generateStartHere = trpc.intelligence.generateOnboardingStartHere.useMutation();
  const submitMorning = trpc.checkIns.submitMorning.useMutation();

  const goForward = (n: number) => { setDirection("forward"); setStep(n); };
  const goBack = (n: number) => { setDirection("back"); setStep(n); };

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
        focusHoursStart: focusStartMap[focusHour],
        focusHoursEnd: focusEndMap[focusHour],
        tonePreference: tone,
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
            tonePreference: tone,
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

  // Progress: -1=0%, 0=8%, 1=25%, 2=40%, 3=55%, 4=70%, 5=85%, 6=100%
  const progressMap: Record<number, number> = { [-1]: 0, 0: 8, 1: 25, 2: 40, 3: 55, 4: 70, 5: 85, 6: 100 };
  const progress = progressMap[step] ?? 0;

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-8"
        style={{ background: "#080a0f" }}
      >
        <div className="w-full max-w-sm text-center space-y-6">
          <img src="/logo-navy.svg" alt="Continuary" className="w-14 h-14 rounded-2xl object-contain mx-auto" />
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>Continuary</h1>
            <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>Sign in to get started.</p>
          </div>
          <a
            href={getLoginUrl()}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg, oklch(0.52 0.22 270), oklch(0.62 0.22 270))",
              color: "white",
              boxShadow: "0 4px 20px oklch(0.52 0.22 270 / 0.4)",
            }}
          >
            Sign in <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "#080a0f" }}
    >
      {/* Ambient glow */}
      <div
        className="fixed pointer-events-none"
        style={{
          left: "50%", top: "35%",
          transform: "translate(-50%, -50%)",
          width: 900, height: 900,
          background: "radial-gradient(circle, oklch(0.52 0.22 270 / 0.07) 0%, transparent 65%)",
          filter: "blur(40px)",
          transition: "opacity 1s ease",
        }}
      />

      {/* Progress bar */}
      <ProgressBar value={progress} />

      {/* Screens */}
      <SlideTransition stepKey={step} direction={direction}>
        {step === -1 && (
          <InviteGateScreen onSuccess={() => goForward(0)} />
        )}
        {step === 0 && (
          <WrenIntroSequence active={step === 0} onDone={() => goForward(1)} />
        )}
        {step === 1 && (
          <StepName
            name={name}
            setName={setName}
            workStyle={workStyle}
            setWorkStyle={setWorkStyle}
            onNext={() => goForward(2)}
          />
        )}
        {step === 2 && (
          <StepToneInterstitial name={name} onNext={() => goForward(3)} />
        )}
        {step === 3 && (
          <StepTone
            tone={tone}
            setTone={setTone}
            onNext={() => goForward(4)}
            onBack={() => goBack(1)}
          />
        )}
        {step === 4 && (
          <StepFocus
            focusHour={focusHour}
            setFocusHour={setFocusHour}
            onNext={() => goForward(5)}
            onBack={() => goBack(3)}
          />
        )}
        {step === 5 && (
          <StepProject
            name={name}
            projectTitle={projectTitle}
            setProjectTitle={setProjectTitle}
            projectWhy={projectWhy}
            setProjectWhy={setProjectWhy}
            projectNext={projectNext}
            setProjectNext={setProjectNext}
            onFinish={() => finishOnboarding(false)}
            onSkip={() => finishOnboarding(true)}
            loading={isPending}
          />
        )}
        {step === 6 && <DoneScreen name={name} onDone={onDone} />}
      </SlideTransition>
    </div>
  );
}
