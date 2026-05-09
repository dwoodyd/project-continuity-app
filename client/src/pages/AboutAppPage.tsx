/**
 * AboutAppPage
 *
 * Shown exactly once to every new user immediately after onboarding.
 * Explains what Continuary is, how the spaces work, and what to expect.
 * A single CTA marks the flag and navigates to the main app.
 */
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import WrenPlayer from "@/components/WrenPlayer";
import {
  Brain,
  Zap,
  BookOpen,
  Compass,
  BarChart3,
  Lightbulb,
  DoorOpen,
  Shield,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Heart,
  Star,
  Flame,
  Eye,
  MessageCircle,
  Trophy,
  Moon,
} from "lucide-react";

const BRAND_LOGO = "/logo-navy.svg";

const SPACES = [
  {
    icon: Brain,
    name: "Command Center",
    desc: "Your daily operating surface. Morning check-in, today's tasks, and the Next Best Step — all in one place.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  {
    icon: BookOpen,
    name: "Knowledge Vault",
    desc: "Capture notes, links, and ideas. AI maps them to your projects and surfaces the right context when you need it.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  {
    icon: DoorOpen,
    name: "Projects",
    desc: "Every project has a Re-Entry Card that remembers exactly where you left off — open loops, context, and next step.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-violet-400/20",
  },
  {
    icon: Zap,
    name: "Clarity Engine",
    desc: "When you're stuck or foggy, run a structured thinking session to identify the real blocker and convert it into action.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  {
    icon: Compass,
    name: "Weekly Compass",
    desc: "Set your primary and secondary focus for the week so every day starts with clear intent instead of decision fatigue.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-indigo-400/20",
  },
  {
    icon: BarChart3,
    name: "Intelligence",
    desc: "Weekly pattern recognition. See your top distraction category and the time of day it peaks — then do something about it.",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    border: "border-rose-400/20",
  },
  {
    icon: Lightbulb,
    name: "Idea Sanctuary",
    desc: "A quick-capture button always one tap away. Ideas land safely without interrupting your current work session.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
  },
  {
    icon: Shield,
    name: "Evidence Log",
    desc: "A private record of every time you kept going. Proof — for the days when starting feels impossible.",
    color: "text-teal-400",
    bg: "bg-teal-400/10",
    border: "border-teal-400/20",
  },
];

const PRINCIPLES = [
  "You don't need more time. You need a clearer next step.",
  "Progress is not measured in streaks — it is measured in returns.",
  "The work is never lost. It is waiting for you to come back.",
];

// Wren personality trait cards
const WREN_TRAITS = [
  {
    icon: Heart,
    title: "She never judges a gap",
    desc: "Whether you've been away for a day or a month, Wren greets you the same way — with warmth, not guilt. She holds your thread while you're gone.",
    clip: "greeting" as const,
    accent: "text-rose-400",
    accentBg: "bg-rose-400/10",
    accentBorder: "border-rose-400/20",
  },
  {
    icon: Flame,
    title: "She celebrates your returns",
    desc: "Every check-in is a win. When you hit a streak milestone — 3, 7, or 30 days — Wren shows up with a full celebration. You earned it.",
    clip: "celebration2" as const,
    accent: "text-amber-400",
    accentBg: "bg-amber-400/10",
    accentBorder: "border-amber-400/20",
  },
  {
    icon: Eye,
    title: "She watches over your work",
    desc: "Wren lives in your sidebar, quietly present on every page. She's not a chatbot — she's a companion. A reminder that someone is keeping watch.",
    clip: "homeVideo" as const,
    accent: "text-amber-400",
    accentBg: "bg-amber-400/10",
    accentBorder: "border-violet-400/20",
  },
  {
    icon: MessageCircle,
    title: "She speaks to you directly",
    desc: "During onboarding and key moments, Wren delivers lines to you personally — not instructions, but presence. She knows your name.",
    clip: "withLetters" as const,
    accent: "text-blue-400",
    accentBg: "bg-blue-400/10",
    accentBorder: "border-blue-400/20",
  },
  {
    icon: Moon,
    title: "She rests when you do",
    desc: "When you're not active, Wren settles into a quiet loop — eyes soft, golden particles drifting. She's not waiting impatiently. She's just there.",
    clip: "sleeping" as const,
    accent: "text-amber-400",
    accentBg: "bg-amber-400/10",
    accentBorder: "border-indigo-400/20",
  },
  {
    icon: Star,
    title: "She marks your milestones",
    desc: "Wren tracks what matters. First check-in, first project, first streak — she acknowledges every threshold with intention, not just a badge.",
    clip: "pathOfProgress" as const,
    accent: "text-emerald-400",
    accentBg: "bg-emerald-400/10",
    accentBorder: "border-emerald-400/20",
  },
];

// Where Wren shows up across the app
const WREN_APPEARANCES = [
  { location: "Onboarding", desc: "She opens the experience and closes it — bookending your first day.", clip: "darkOpener" as const },
  { location: "Sidebar", desc: "A quiet ambient loop in the footer. Always present, never intrusive.", clip: "homeVideo" as const },
  { location: "Check-in complete", desc: "A small celebration every time you close out your day.", clip: "celebrate" as const },
  { location: "Streak milestones", desc: "Full-screen celebration at 3, 7, and 30 consecutive days.", clip: "celebration2" as const },
  { location: "Knowledge Vault", desc: "She greets you at the empty state — an invitation, not a void.", clip: "journal" as const },
  { location: "Clarity Engine", desc: "She's focused and ready when you need to clear the noise.", clip: "tablet" as const },
];

export default function AboutAppPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const markSeen = trpc.settings.markAboutSeen.useMutation({
    onSuccess: () => {
      utils.settings.getProfile.invalidate();
      navigate("/");
    },
  });

  const handleEnter = () => {
    markSeen.mutate();
  };

  return (
    <div className="min-h-screen text-foreground overflow-y-auto bg-background">
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/5"
        style={{ background: "var(--background)", backdropFilter: "blur(12px)", borderColor: "var(--border)" }}
      >
        <img src={BRAND_LOGO} alt="Continuary" className="h-8 w-8 object-contain rounded-lg" />
        <button
          onClick={handleEnter}
          disabled={markSeen.isPending}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip intro →
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-24 pt-12">
        {/* ── Hero ── */}
        <div className="text-center mb-14">
          <div className="flex flex-col items-center mb-4">
            <WrenPlayer clip="popsHead" size="xl" />
            <p className="text-xs font-medium mt-1" style={{ color: "oklch(0.72 0.10 65 / 0.7)" }}>
              Wren — your Continuary companion
            </p>
          </div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border"
            style={{
              background: "oklch(0.72 0.14 65 / 0.12)",
              borderColor: "oklch(0.72 0.14 65 / 0.3)",
              color: "oklch(0.85 0.12 65)",
            }}
          >
            Welcome to Continuary
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.15] mb-5">
            You don't need more productivity.
            <br />
            <span style={{ color: "oklch(0.82 0.14 65)" }}>
              You need proof you're already moving.
            </span>
          </h1>
          <p className="text-base text-white/60 leading-relaxed max-w-lg mx-auto">
            Continuary is a structured daily workspace built around one idea: continuity is the skill.
            It collects evidence of your identity as someone who keeps going — even when starting feels impossible.
          </p>
        </div>

        {/* ── Core principles ── */}
        <div className="rounded-2xl border p-6 mb-10 bg-card">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">
            Three things to know
          </p>
          <div className="space-y-3">
            {PRINCIPLES.map((p) => (
              <div key={p} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/80 leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Spaces grid ── */}
        <div className="mb-12">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-5">
            Eight spaces, one continuous thread
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {SPACES.map(({ icon: Icon, name, desc, color, bg, border }) => (
              <div
                key={name}
                className={`rounded-xl border ${border} p-4 flex gap-3`}
                style={{ background: "var(--muted)" }}
              >
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug mb-0.5">{name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            MEET WREN — Full Profile
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="mb-12">
          {/* Section header */}
          <div className="text-center mb-8">
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-2"
              style={{ color: "oklch(0.82 0.14 65)" }}
            >
              Meet Wren
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Your continuity companion
            </h2>
            <p className="text-sm text-white/60 leading-relaxed max-w-md mx-auto">
              Wren is the bird who carries your thread. She's not an AI assistant, not a productivity bot —
              she's a presence. A witness to your work. She shows up when it matters and stays quiet when you need space.
            </p>
          </div>

          {/* Hero Wren card — full-width cinematic intro */}
          <div
            className="rounded-2xl overflow-hidden mb-6 relative"
            style={{
              background: "oklch(0.12 0.04 264)",
              border: "1px solid oklch(0.72 0.14 65 / 0.2)",
              boxShadow: "0 0 60px oklch(0.72 0.14 65 / 0.08)",
            }}
          >
            {/* Ambient glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.72 0.14 65 / 0.12) 0%, transparent 70%)",
              }}
            />
            <div className="flex flex-col sm:flex-row items-center gap-0 sm:gap-6 p-6 sm:p-8 relative z-10">
              {/* Video */}
              <div
                className="shrink-0 mb-4 sm:mb-0"
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: "1.25rem",
                  overflow: "hidden",
                  boxShadow: "0 8px 40px oklch(0.72 0.14 65 / 0.25)",
                  border: "1px solid oklch(0.72 0.14 65 / 0.2)",
                }}
              >
                <WrenPlayer clip="luminousFloats" size="full" loop autoPlay feather featherDirection="radial" />
              </div>
              {/* Bio */}
              <div className="flex-1 text-center sm:text-left">
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3"
                  style={{ background: "oklch(0.72 0.14 65 / 0.15)", color: "oklch(0.85 0.12 65)" }}
                >
                  <Sparkles className="w-3 h-3" />
                  Continuary's mascot
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Wren</h3>
                <p className="text-sm text-white/70 leading-relaxed mb-3">
                  A small bird with a golden thread. She appeared the moment the first user opened Continuary
                  and has been carrying threads ever since. She doesn't speak in notifications or push you toward
                  productivity — she simply holds the space between your sessions.
                </p>
                <p className="text-xs text-white/40 italic">
                  "She doesn't judge gaps. She just helps you find your way back."
                </p>
              </div>
            </div>
          </div>

          {/* Personality trait cards — 2 column grid */}
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">
              Who she is
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {WREN_TRAITS.map(({ icon: Icon, title, desc, clip, accent, accentBg, accentBorder }) => (
                <div
                  key={title}
                  className={`rounded-xl border ${accentBorder} p-4 flex gap-3`}
                  style={{ background: "oklch(0.14 0.03 264 / 0.8)" }}
                >
                  {/* Small video thumbnail */}
                  <div
                    className="shrink-0"
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "0.75rem",
                      overflow: "hidden",
                      border: "1px solid oklch(0.72 0.14 65 / 0.15)",
                    }}
                  >
                    <WrenPlayer clip={clip} size="full" loop autoPlay />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${accent} shrink-0`} />
                      <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Where Wren shows up */}
          <div
            className="rounded-2xl border p-6"
            style={{
              background: "oklch(0.14 0.03 264 / 0.6)",
              borderColor: "oklch(0.72 0.14 65 / 0.15)",
            }}
          >
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-5">
              Where you'll find her
            </p>
            <div className="space-y-4">
              {WREN_APPEARANCES.map(({ location, desc, clip }) => (
                <div key={location} className="flex items-center gap-4">
                  {/* Tiny video */}
                  <div
                    className="shrink-0"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "0.625rem",
                      overflow: "hidden",
                      border: "1px solid oklch(0.72 0.14 65 / 0.15)",
                    }}
                  >
                    <WrenPlayer clip={clip} size="full" loop autoPlay />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground mb-0.5">{location}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── How to start ── */}
        <div className="rounded-2xl border p-6 mb-10 bg-card">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">
            Where to start
          </p>
          <ol className="space-y-3">
            {[
              "Complete your morning check-in on the Command Center — it takes 2 minutes.",
              "Add your active projects so the app can surface the right context.",
              "Capture anything on your mind into the Knowledge Vault — don't filter it.",
              "Come back tomorrow. That's the whole practice.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                  style={{ background: "oklch(0.72 0.14 65 / 0.2)", color: "oklch(0.85 0.12 65)" }}
                >
                  {i + 1}
                </span>
                <p className="text-sm text-foreground/70 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* ── CTA ── */}
        <div className="text-center">
          <Button
            onClick={handleEnter}
            disabled={markSeen.isPending}
            size="lg"
            className="w-full sm:w-auto px-10 py-4 text-base font-semibold rounded-2xl gap-2 shadow-lg"
            style={{
              background: "oklch(0.72 0.14 65)",
              color: "oklch(0.15 0.03 264)",
            }}
          >
            {markSeen.isPending ? "Opening your app…" : "Enter Continuary"}
            <ArrowRight className="w-5 h-5" />
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            You won't see this screen again — but you can replay it from Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
