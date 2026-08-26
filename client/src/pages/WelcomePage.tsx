/**
 * WelcomePage — public-facing product page
 * Narrative-first redesign: leads with Evidence Log + Threshold Diagnosis
 * as the signature differentiators from the book "Permission to Start".
 */
import { Link } from "wouter";
import { PageMeta } from "@/components/PageMeta";
import WrenPlayer from "@/components/WrenPlayer";
import {
  ArrowRight,
  Brain,
  BookOpen,
  Zap,
  Compass,
  Lightbulb,
  BarChart3,
  CheckCircle2,
  Sun,
  Clock,
  Moon,
  Shield,
  Sparkles,
  ChevronRight,
  ScrollText,
  DoorOpen,
  HeartHandshake,
  Target,
  Layers,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useEffect, useRef, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { subscribePush } from "@/lib/pushSubscribe";

// ── Brand logo ────────────────────────────────────────────────────────────────
const BRAND_LOGO_DARK = "/logo-navy.svg";

// ── Intersection-observer fade-in hook ────────────────────────────────────────
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function FadeSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useFadeIn();
  return (
    <div ref={ref} className={`welcome-fade ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ── Full feature list ─────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Brain,
    title: "Today",
    desc: "Your daily operating surface. Every morning it shows you what to focus on and surfaces the most important next step across all your projects.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Zap,
    title: "Clarity Engine",
    desc: "When you're stuck or foggy, run a structured thinking session. Brain dump, identify the real blocker, and convert insights into concrete next steps.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: BookOpen,
    title: "Knowledge Vault",
    desc: "Where your raw material lives. Capture notes, links, and ideas. AI maps them to projects and surfaces relevant context when you need it.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Compass,
    title: "Weekly Compass",
    desc: "Set your primary and secondary focus for the week. Every day starts with clear intent instead of decision fatigue.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    icon: BarChart3,
    title: "Intelligence",
    desc: "Weekly pattern recognition across your work. See your top distraction category and the time of day it peaks — then do something about it.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Lightbulb,
    title: "Scratch Pad",
    desc: "A quick-capture button that's always one tap away. Ideas land safely without interrupting your current work session.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    icon: DoorOpen,
    title: "Re-Entry Card",
    desc: "Every project remembers exactly where you left off. The Re-Entry Card surfaces your last context, open loops, and the next right step the moment you return.",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
  },
  {
    icon: Target,
    title: "Single Focus Mode",
    desc: "You name one topic and commit to it for an extended period. Wren holds the continuity language — opening every day with a line that connects today to yesterday's thread.",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
  {
    icon: Clock,
    title: "Focus Sessions",
    desc: "Dedicated 10, 30, 60, or 90-minute blocks where you and Wren work side-by-side. She checks in at the halfway point and helps you close out with a clear next step.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    icon: Layers,
    title: "Projects",
    desc: "Every project carries its own timeline of sessions, decisions, and breakthroughs. Nothing gets lost between sittings.",
    color: "text-teal-400",
    bg: "bg-teal-400/10",
  },
];

const STEPS = [
  {
    icon: Sun,
    step: "01",
    title: "Morning check-in",
    desc: "Set your intention. Declare your capacity, choose your primary project, and let Wren generate a structured plan shaped to your energy level.",
    color: "text-amber-500",
    accentColor: "oklch(0.72 0.14 72)",
  },
  {
    icon: Clock,
    step: "02",
    title: "Midday pulse",
    desc: "Two-minute alignment check. On plan? Any blockers? The midday pulse recalibrates without derailing your momentum.",
    color: "text-primary",
    accentColor: "oklch(0.74 0.14 72 / 0.7)",
  },
  {
    icon: Moon,
    step: "03",
    title: "Evening close",
    desc: "Close the loop. Acknowledge what moved. Capture carryovers. Wren writes tomorrow's brief so you start the next day with context, not confusion.",
    color: "text-amber-400",
    accentColor: "oklch(0.74 0.14 72)",
  },
  {
    icon: ScrollText,
    step: "04",
    title: "Weekly Compass",
    desc: "One clear direction for the week. Set your north-star intention every Sunday and let Continuary keep your daily tasks aligned with the bigger picture.",
    color: "text-emerald-400",
    accentColor: "oklch(0.65 0.18 155)",
  },
];

// ── Phone mockup ──────────────────────────────────────────────────────────────
function PhoneMockup() {
  return (
    <div className="relative mx-auto" style={{ width: 220, height: 440 }}>
      <div
        className="absolute inset-0 rounded-[36px] border-[6px] shadow-2xl overflow-hidden"
        style={{
          borderColor: "var(--border)",
          background: "var(--card)",
          boxShadow: "0 40px 80px oklch(0 0 0 / 0.3), 0 0 0 1px var(--border)",
        }}
      >
        <div className="h-8 flex items-center justify-between px-5 pt-1">
          <span className="text-[8px] font-semibold text-white/60">9:41</span>
          <div className="w-16 h-3 rounded-full bg-black/60 mx-auto absolute left-1/2 -translate-x-1/2 top-1" />
          <div className="flex gap-1 items-center">
            <div className="w-3 h-2 rounded-sm border border-white/40 relative">
              <div className="absolute inset-[1px] right-[1px] bg-white/60 rounded-[1px]" />
            </div>
          </div>
        </div>
        <div className="px-3 pt-2 pb-4 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 w-20 rounded-full bg-white/20" />
            <div className="w-5 h-5 rounded-full bg-amber-400/80" />
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--muted)" }}>
            <div className="h-2 w-16 rounded-full mb-2" style={{ background: "oklch(0.72 0.14 72 / 0.6)" }} />
            <div className="h-3 w-full rounded-full bg-white/20 mb-1.5" />
            <div className="h-3 w-3/4 rounded-full bg-white/15" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg p-2.5 flex items-center gap-2" style={{ background: "var(--secondary)" }}>
              <div className="w-6 h-6 rounded-lg shrink-0" style={{ background: `oklch(${0.45 + i * 0.1} 0.15 ${220 + i * 30})` }} />
              <div className="flex-1 space-y-1">
                <div className="h-2 rounded-full bg-white/25" style={{ width: `${60 + i * 10}%` }} />
                <div className="h-1.5 rounded-full bg-white/12" style={{ width: `${40 + i * 8}%` }} />
              </div>
              <div className="w-4 h-4 rounded-full shrink-0" style={{ background: `oklch(${0.6 + i * 0.05} 0.12 ${140 + i * 20} / 0.4)` }} />
            </div>
          ))}
          <div className="px-2 pt-1 pb-2 space-y-1.5">
            {["Today", "Knowledge Vault", "Projects", "Clarity Engine", "Evidence Log"].map((label, i) => (
              <div key={label} className="flex items-center gap-2 px-2 py-1 rounded-lg" style={{ background: i === 0 ? "oklch(0.74 0.14 72 / 0.15)" : "transparent" }}>
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: i === 0 ? "oklch(0.74 0.14 72 / 0.8)" : "oklch(0.45 0.04 240 / 0.5)" }} />
                <div className="h-1.5 rounded-full" style={{ width: `${55 + i * 8}%`, background: i === 0 ? "oklch(0.74 0.14 72 / 0.6)" : "oklch(0.45 0.04 240 / 0.35)" }} />
              </div>
            ))}
          </div>
          <div className="rounded-lg p-2.5 flex items-center justify-around" style={{ background: "var(--secondary)" }}>
            {["☀️", "🕐", "🌙"].map((emoji, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-sm">{emoji}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-amber-400" : "bg-white/20"}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute -inset-8 -z-10 rounded-full blur-3xl opacity-30" style={{ background: "oklch(0.74 0.14 72 / 0.5)" }} />
    </div>
  );
}

// ── Evidence Log mockup card ───────────────────────────────────────────────────
function EvidenceCard() {
  const currentMonth = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date());

  return (
    <div
      className="rounded-2xl p-6 shadow-2xl max-w-sm mx-auto"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "0 32px 64px oklch(0 0 0 / 0.3)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "oklch(0.72 0.14 72)" }}>Evidence Log</p>
          <p className="text-xs text-muted-foreground mt-0.5">{currentMonth}</p>
        </div>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.72 0.14 72 / 0.15)" }}>
          <ScrollText className="w-4 h-4" style={{ color: "oklch(0.72 0.14 72)" }} />
        </div>
      </div>

      {/* Identity sentence */}
      <div className="mb-5 p-4 rounded-xl" style={{ background: "var(--muted)" }}>
        <p className="text-xs text-muted-foreground mb-2 font-medium">This month's identity sentence</p>
        <p className="text-sm font-medium leading-relaxed italic" style={{ color: "oklch(0.88 0.06 65)", fontFamily: "'DM Mono', monospace" }}>
          "Someone who shows up for their work even when the conditions aren't perfect."
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Sessions started", value: "23" },
          { label: "Returns after gap", value: "7" },
          { label: "Hard-day sessions", value: "4" },
          { label: "Genuine permissions", value: "11" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg p-2.5 text-center" style={{ background: "var(--secondary)" }}>
            <p className="text-lg font-bold text-foreground">{value}</p>
            <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Threshold Diagnosis mockup ────────────────────────────────────────────────
function ThresholdCard() {
  return (
    <div
      className="rounded-2xl p-6 shadow-2xl max-w-sm mx-auto"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "0 32px 64px oklch(0 0 0 / 0.3)",
      }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.72 0.14 72 / 0.15)" }}>
          <DoorOpen className="w-4 h-4" style={{ color: "oklch(0.72 0.14 72)" }} />
        </div>
        <div>
          <p className="text-xs font-bold text-foreground">Threshold Diagnosis</p>
          <p className="text-xs text-muted-foreground">What's at the door?</p>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { q: "What task are you avoiding?", a: "Writing the intro chapter" },
          { q: "What's actually in the way?", a: "Fear it won't be good enough" },
          { q: "What's the smallest true step?", a: "Write one honest sentence" },
        ].map(({ q, a }, i) => (
          <div key={i} className="rounded-xl p-3" style={{ background: "var(--muted)" }}>
            <p className="text-[9px] text-muted-foreground mb-1">{q}</p>
            <p className="text-xs font-medium text-foreground/85">{a}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl p-3 flex items-center gap-2" style={{ background: "oklch(0.72 0.14 72 / 0.12)", border: "1px solid oklch(0.72 0.14 72 / 0.25)" }}>
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(0.72 0.14 72)" }} />
        <p className="text-xs font-medium" style={{ color: "oklch(0.74 0.14 72)" }}>
          Named. Now you can begin.
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WelcomePage() {
  const { isAuthenticated } = useAuth();

  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );
  const [notifLoading, setNotifLoading] = useState(false);

  const registerPush = trpc.notifications.registerPush.useMutation();
  const handleNotifOptIn = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setNotifLoading(true);
    try {
      const result = await subscribePush(registerPush);
      if (result === "granted") setNotifPermission("granted");
      else if (result === "denied") setNotifPermission("denied");
    } finally {
      setNotifLoading(false);
    }
  }, [registerPush]);

  const ctaButton = isAuthenticated ? (
    <Link href="/">
      <Button size="lg" className="gap-2 px-8 font-semibold shadow-lg text-sm" style={{ background: "oklch(0.72 0.14 72)", color: "oklch(0.12 0.03 264)" }}>
        Open Today <ArrowRight className="w-4 h-4" />
      </Button>
    </Link>
  ) : (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <a href={getLoginUrl()}>
        <Button size="lg" className="gap-2 px-8 font-semibold shadow-lg text-sm" style={{ background: "oklch(0.72 0.14 72)", color: "oklch(0.12 0.03 264)" }}>
          Get Started Free <ArrowRight className="w-4 h-4" />
        </Button>
      </a>
      <a href={getLoginUrl()}>
        <Button size="lg" variant="outline" className="gap-2 px-8 text-sm border-white/20 text-white hover:bg-white/10">
          Sign In
        </Button>
      </a>
    </div>
  );

  return (
    <main id="main-content" className="public-theme-surface min-h-screen bg-background text-foreground overflow-x-hidden">
      <PageMeta
        title="Continuary — Built for Minds That Work Differently"
        description="A structured daily workspace for ADHD, focus struggles, and non-linear thinkers. Collect evidence of your identity as someone who keeps going."
        path="/welcome"
      />
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden bg-background"
      >
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: "oklch(0.74 0.14 72 / 0.4)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: "oklch(0.72 0.14 72)", transform: "translate(-30%, 30%)" }} />

        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-24">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="order-1 flex flex-col items-center text-center animate-fade-slide-up">
              <WrenPlayer clip="popsHead" size="hero" stage={false} feather fallbackStill="siliconeWatching" wrapperClassName="shrink-0" />
              <p className="mt-3 text-xs font-medium" style={{ color: "oklch(0.72 0.10 65 / 0.8)" }}>Wren — your Continuary companion</p>
              <p className="mt-2 max-w-sm text-xs leading-relaxed" style={{ color: "oklch(0.72 0.04 240)" }}>
                She remembers your thread and returns without rebuke. A companion, not a clinician.
              </p>
            </div>

            <div className="order-2 text-center lg:text-left animate-fade-slide-up animate-delay-100">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border"
                style={{ background: "oklch(0.72 0.14 72 / 0.15)", borderColor: "oklch(0.72 0.14 72 / 0.3)", color: "oklch(0.74 0.14 72)" }}
              >
                <Sparkles className="w-3 h-3" />
                Companion app to "Permission to Start"
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1] mb-6">
                You don't need more productivity.
                <br />
                <span style={{ color: "oklch(0.74 0.14 72)" }}>You need proof you're already moving.</span>
              </h1>

              <p className="text-base text-white/65 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
                Continuary is a structured daily workspace that collects evidence of your identity as someone who keeps going — even when starting feels impossible.
              </p>

            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3">
              {ctaButton}
              <a
                href="/pricing"
                className="text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: "oklch(0.72 0.14 72 / 0.8)" }}
              >
                See pricing →
              </a>
            </div>

              <div className="flex items-center gap-4 mt-8 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {["oklch(0.6 0.15 265)", "oklch(0.55 0.18 30)", "oklch(0.5 0.15 140)", "oklch(0.58 0.2 300)"].map((c, i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-white/20" style={{ background: c }} />
                  ))}
                </div>
                <p className="text-xs text-white/50">Built for multi-project professionals</p>
              </div>
            </div>

          </div>
          <div className="mt-12 flex justify-center animate-fade-slide-up animate-delay-200">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ── Signature Feature 1: Evidence Log ───────────────────────────────── */}
      <section
        className="py-24 px-6 relative overflow-hidden bg-muted/50"
      >
        <div className="absolute top-0 left-0 w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: "oklch(0.65 0.18 155)", transform: "translate(-30%, -30%)" }} />
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left">
              <FadeSection>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border"
                  style={{ background: "oklch(0.65 0.18 155 / 0.15)", borderColor: "oklch(0.65 0.18 155 / 0.3)", color: "oklch(0.78 0.14 155)" }}
                >
                  <ScrollText className="w-3 h-3" />
                  Signature feature
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-snug mb-5">
                  The Evidence Log
                </h2>
                <p className="text-base text-white/60 leading-relaxed mb-6 max-w-lg mx-auto lg:mx-0">
                  Every month, Continuary looks at your actual behaviour — sessions started, returns after gaps, hard-day work, genuine rest — and generates a single identity sentence. Not a streak counter. Not a score. A sentence that tells you who you are becoming, in your own evidence.
                </p>
                <div className="space-y-3 max-w-lg mx-auto lg:mx-0">
                  {[
                    "Tracks 4 identity-evidence metrics automatically",
                    "AI generates one sentence from your real data",
                    "6-month history so you can see the arc, not just the day",
                    "One-tap share card for your community",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "oklch(0.72 0.14 72)" }} />
                      <p className="text-sm text-white/70">{item}</p>
                    </div>
                  ))}
                </div>
              </FadeSection>
            </div>
            <FadeSection delay={150} className="shrink-0 w-full lg:w-auto">
              <EvidenceCard />
            </FadeSection>
          </div>
        </div>
      </section>

      {/* ── Signature Feature 2: Threshold Diagnosis ────────────────────────── */}
      <section className="py-24 px-6 bg-background relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: "oklch(0.72 0.14 72)", transform: "translate(20%, 20%)" }} />
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="flex-1 text-center lg:text-left">
              <FadeSection>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border"
                  style={{ background: "oklch(0.72 0.14 72 / 0.12)", borderColor: "oklch(0.72 0.14 72 / 0.3)", color: "oklch(0.82 0.12 65)" }}
                >
                  <DoorOpen className="w-3 h-3" />
                  Signature feature
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-snug mb-5">
                  Threshold Diagnosis
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed mb-6 max-w-lg mx-auto lg:mx-0">
                  Most productivity tools help you plan. Continuary helps you start. The Threshold Diagnosis is a three-question flow that names what's actually in the doorway — the real blocker underneath the task you're avoiding — and converts it into the smallest true step you can take right now.
                </p>
                <div className="space-y-3 max-w-lg mx-auto lg:mx-0">
                  {[
                    "Surfaces from the Clarity Engine result screen",
                    "Three questions that name the real blocker",
                    "Converts the diagnosis into a concrete next step",
                    "Based on the Permission to Start framework",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                      <p className="text-sm text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </FadeSection>
            </div>
            <FadeSection delay={150} className="shrink-0 w-full lg:w-auto">
              <ThresholdCard />
            </FadeSection>
          </div>
        </div>
      </section>

      {/* ── Amnesty Protocol callout ─────────────────────────────────────────── */}
      <section
        className="py-16 px-6"
        style={{ background: "oklch(0.97 0.01 252)" }}
      >
        <div className="max-w-3xl mx-auto">
          <FadeSection>
            <div
              className="rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-start gap-6"
              style={{
                background: "var(--card)",
                border: "1px solid oklch(0.30 0.07 252)",
              }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "oklch(0.72 0.14 72 / 0.15)" }}>
                <HeartHandshake className="w-6 h-6" style={{ color: "oklch(0.72 0.14 72)" }} />
              </div>
              <div>
                <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "oklch(0.72 0.14 72)" }}>
                  Amnesty Protocol
                </p>
                <h3 className="text-xl font-bold text-white mb-3 leading-snug">
                  You came back. That's the whole thing.
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  When you return after a gap — a day, a week, a month — Continuary doesn't show you how far behind you are. It shows you the Re-Entry Card: your last context, your open loops, and one gentle next step. No shame spiral. No productivity debt. Just the door, open.
                </p>
              </div>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── Daily rhythm ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <FadeSection className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">Daily rhythm</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Three check-ins. One complete day. One month of evidence.
            </h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto leading-relaxed">
              Each check-in takes two to three minutes. The fourth step happens automatically — your evidence accumulates while you work.
            </p>
          </FadeSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
            {STEPS.map(({ icon: Icon, step, title, desc, color, accentColor }, i) => (
              <FadeSection key={step} delay={i * 80}>
                <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-all h-full">
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center relative z-10"
                      style={{ background: `${accentColor}20`, border: `2px solid ${accentColor}50` }}
                    >
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <span className="text-xs font-bold tracking-widest text-muted-foreground">{step}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 leading-snug">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Full feature grid ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: "oklch(0.97 0.01 252)" }}>
        <div className="max-w-4xl mx-auto">
          <FadeSection className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">Everything you need</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Ten spaces. One continuous thread.
            </h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto leading-relaxed">
              Each space does one thing well. Together they create a system that holds your work without holding you back.
            </p>
          </FadeSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }, i) => (
              <FadeSection key={title} delay={i * 50}>
                <div className="h-full p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300 group">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <FadeSection className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">Who it's for</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Built for minds that keep going.
            </h2>
          </FadeSection>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                label: "The multi-project mind",
                desc: "You work across several things at once. Projects and the Re-Entry Card hold the context for all of them so you don't have to.",
              },
              {
                icon: TrendingUp,
                label: "The identity builder",
                desc: "You're not just trying to finish tasks. You're trying to become someone. The Evidence Log gives you monthly proof that you already are.",
              },
              {
                icon: Shield,
                label: "The deep worker",
                desc: "You need long uninterrupted blocks. Focus Sessions and Single Focus Mode structure the edges so the middle stays clear.",
              },
            ].map(({ icon: Icon, label, desc }, i) => (
              <FadeSection key={label} delay={i * 80}>
                <div className="p-6 rounded-2xl border border-border bg-card text-center hover:border-primary/30 hover:shadow-md transition-all h-full">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">{label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-6 relative overflow-hidden"
        style={{ background: "var(--card)" }}
      >
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: "oklch(0.72 0.14 72)", transform: "translate(20%, -20%)" }} />

        <FadeSection className="max-w-2xl mx-auto text-center relative">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg" style={{ background: "oklch(0.72 0.14 72)" }}>
            <ScrollText className="w-7 h-7" style={{ color: "oklch(0.18 0.05 252)" }} />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-5 leading-snug">
            Start building your evidence.
          </h2>
          <p className="text-base text-white/65 leading-relaxed mb-10 max-w-lg mx-auto">
            Every session you complete, every return after a gap, every hard day you showed up — it all becomes data. At the end of the month, Continuary turns that data into a sentence that tells you who you are. Not who you're trying to be. Who you already are.
          </p>

          {isAuthenticated ? (
            <Link href="/">
              <Button size="lg" className="gap-2 px-10 font-semibold shadow-xl text-base" style={{ background: "oklch(0.72 0.14 72)", color: "oklch(0.12 0.03 264)" }}>
                Open Today <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href={getLoginUrl()}>
                <Button size="lg" className="gap-2 px-10 font-semibold shadow-xl text-base" style={{ background: "oklch(0.72 0.14 72)", color: "oklch(0.12 0.03 264)" }}>
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </Button>
              </a>
              <p className="text-xs text-white/40">Invite required during beta</p>
            </div>
          )}
        </FadeSection>
      </section>

      {/* ── Push notification opt-in ─────────────────────────────────────────── */}
      {!isAuthenticated && notifPermission === "default" && (
        <FadeSection className="py-10 px-6">
          <div className="max-w-xl mx-auto flex flex-col sm:flex-row items-center gap-4 p-5 rounded-2xl border border-border/60 bg-card/60">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Get notified when we open to the public</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                One notification when Continuary opens beyond beta. No marketing, no drip campaigns.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleNotifOptIn}
              disabled={notifLoading}
              className="shrink-0 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/60 gap-1.5"
            >
              {notifLoading ? (
                <span className="w-3.5 h-3.5 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin inline-block" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              )}
              Notify me
            </Button>
          </div>
        </FadeSection>
      )}
      {!isAuthenticated && notifPermission === "granted" && (
        <FadeSection className="py-6 px-6">
          <div className="max-w-xl mx-auto flex items-center gap-3 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-300">
              You're on the list. We'll send one notification when Continuary opens publicly.
            </p>
          </div>
        </FadeSection>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="py-10 px-6 border-t border-border bg-background">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <img src={BRAND_LOGO_DARK} alt="Continuary" className="h-12 w-12 object-contain rounded-xl opacity-70" />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {isAuthenticated ? (
              <>
                {[
                  { href: "/", label: "Today" },
                  { href: "/vault", label: "Knowledge Vault" },
                  { href: "/projects", label: "Projects" },
                  { href: "/clarity", label: "Clarity Engine" },
                  { href: "/evidence", label: "Evidence Log" },
                  { href: "/settings", label: "Settings" },
                ].map(({ href, label }) => (
                  <Link key={href} href={href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {label}
                  </Link>
                ))}
              </>
            ) : (
              <a href={getLoginUrl()} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Sign in <ChevronRight className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs text-muted-foreground/50">Built for non-linear minds.</p>
            <div className="flex items-center justify-end gap-3">
              <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <Link href="/changelog" className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                Changelog
                {new Date() <= new Date(new Date("2026-07-07").getTime() + 3 * 24 * 60 * 60 * 1000) && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "oklch(0.74 0.14 72)" }} />
                )}
              </Link>
              <a href="https://www.soulengineer.online" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Soul Engineer ecosystem</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
