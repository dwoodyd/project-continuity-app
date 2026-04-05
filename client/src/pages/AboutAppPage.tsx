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
} from "lucide-react";

const BRAND_LOGO =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663270045694/VnvNaoJZPVnHWmB8F3cwwo/logo-dark-bg-stacked_3630c4d9.png";

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
    color: "text-violet-400",
    bg: "bg-violet-400/10",
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
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
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
  "You are not behind. You are starting from here.",
  "One task completed is better than ten tasks planned.",
  "Continuity is the skill. Continuary is the container.",
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
    <div
      className="min-h-screen text-white overflow-y-auto"
      style={{ background: "oklch(0.12 0.03 264)" }}
    >
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/5"
        style={{ background: "oklch(0.12 0.03 264 / 0.95)", backdropFilter: "blur(12px)" }}
      >
        <img src={BRAND_LOGO} alt="Continuary" className="h-8 w-auto object-contain" />
        <button
          onClick={handleEnter}
          disabled={markSeen.isPending}
          className="text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          Skip intro →
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-24 pt-12">
        {/* ── Hero ── */}
        <div className="text-center mb-14">
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
        <div
          className="rounded-2xl border border-white/8 p-6 mb-10"
          style={{ background: "oklch(0.16 0.04 264)" }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-4">
            Three things to know
          </p>
          <div className="space-y-3">
            {PRINCIPLES.map((p) => (
              <div key={p} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-sm text-white/80 leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Spaces grid ── */}
        <div className="mb-12">
          <p className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-5">
            Eight spaces, one continuous thread
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {SPACES.map(({ icon: Icon, name, desc, color, bg, border }) => (
              <div
                key={name}
                className={`rounded-xl border ${border} p-4 flex gap-3`}
                style={{ background: "oklch(0.15 0.035 264)" }}
              >
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white leading-snug mb-0.5">{name}</p>
                  <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── How to start ── */}
        <div
          className="rounded-2xl border border-white/8 p-6 mb-10"
          style={{ background: "oklch(0.16 0.04 264)" }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-4">
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
                <p className="text-sm text-white/70 leading-relaxed">{step}</p>
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
          <p className="text-xs text-white/30 mt-3">
            You won't see this screen again.
          </p>
        </div>
      </div>
    </div>
  );
}
