/**
 * WelcomePage — public-facing product page
 * Accessible without authentication. App Store preview quality.
 */
import { Link } from "wouter";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useEffect, useRef } from "react";

// ── Brand CDN URLs ────────────────────────────────────────────────────────────
const BRAND_LOGO_DARK =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663270045694/VnvNaoJZPVnHWmB8F3cwwo/ContinuaryStackedFullLogo_54351425.png";

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
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

// ── Animated section wrapper ──────────────────────────────────────────────────
function FadeSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useFadeIn();
  return (
    <div
      ref={ref}
      className={`welcome-fade ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ── Feature data ──────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Brain,
    title: "Command Center",
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
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
  },
  {
    icon: BarChart3,
    title: "Intelligence",
    desc: "Pattern recognition across your work. See your emotional trends, distraction patterns, and project health scores — all in one place.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Lightbulb,
    title: "Idea Sanctuary",
    desc: "A quick-capture FAB that's always one tap away. Ideas land safely without interrupting your current work session.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
];

const STEPS = [
  {
    icon: Sun,
    step: "01",
    title: "Morning — Set your intent",
    desc: "Declare your capacity, choose your primary project, and let the AI generate a structured plan shaped to your energy level.",
    color: "text-amber-500",
    accent: "bg-amber-500",
  },
  {
    icon: Clock,
    step: "02",
    title: "Midday — Alignment pulse",
    desc: "A two-minute check. On plan? Any blockers? The midday pulse recalibrates without derailing your momentum.",
    color: "text-primary",
    accent: "bg-primary",
  },
  {
    icon: Moon,
    step: "03",
    title: "Evening — Close the loop",
    desc: "Reflect on what moved. Capture carryovers. The evening closure writes tomorrow's brief so you start the next day with context, not confusion.",
    color: "text-indigo-400",
    accent: "bg-indigo-400",
  },
];

// ── Phone mockup component ────────────────────────────────────────────────────
function PhoneMockup() {
  return (
    <div
      className="relative mx-auto"
      style={{ width: 220, height: 440 }}
    >
      {/* Phone frame */}
      <div
        className="absolute inset-0 rounded-[36px] border-[6px] shadow-2xl overflow-hidden"
        style={{
          borderColor: "oklch(0.18 0.04 252)",
          background: "oklch(0.14 0.04 252)",
          boxShadow: "0 40px 80px oklch(0.1 0.08 252 / 0.6), 0 0 0 1px oklch(0.3 0.06 252 / 0.4)",
        }}
      >
        {/* Status bar */}
        <div className="h-8 flex items-center justify-between px-5 pt-1">
          <span className="text-[8px] font-semibold text-white/60">9:41</span>
          <div className="w-16 h-3 rounded-full bg-black/60 mx-auto absolute left-1/2 -translate-x-1/2 top-1" />
          <div className="flex gap-1 items-center">
            <div className="w-3 h-2 rounded-sm border border-white/40 relative">
              <div className="absolute inset-[1px] right-[1px] bg-white/60 rounded-[1px]" />
            </div>
          </div>
        </div>

        {/* Screen content */}
        <div className="px-3 pt-2 pb-4 space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 w-20 rounded-full bg-white/20" />
            <div className="w-5 h-5 rounded-full bg-amber-400/80" />
          </div>

          {/* Start Here card */}
          <div className="rounded-xl p-3" style={{ background: "oklch(0.22 0.06 252)" }}>
            <div className="h-2 w-16 rounded-full mb-2" style={{ background: "oklch(0.72 0.14 65 / 0.6)" }} />
            <div className="h-3 w-full rounded-full bg-white/20 mb-1.5" />
            <div className="h-3 w-3/4 rounded-full bg-white/15" />
          </div>

          {/* Project cards */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg p-2.5 flex items-center gap-2" style={{ background: "oklch(0.19 0.04 252)" }}>
              <div className="w-6 h-6 rounded-lg shrink-0" style={{ background: `oklch(${0.45 + i * 0.1} 0.15 ${220 + i * 30})` }} />
              <div className="flex-1 space-y-1">
                <div className="h-2 rounded-full bg-white/25" style={{ width: `${60 + i * 10}%` }} />
                <div className="h-1.5 rounded-full bg-white/12" style={{ width: `${40 + i * 8}%` }} />
              </div>
              <div className="w-4 h-4 rounded-full shrink-0" style={{ background: `oklch(${0.6 + i * 0.05} 0.12 ${140 + i * 20} / 0.4)` }} />
            </div>
          ))}

          {/* Check-in bar */}
          <div className="rounded-lg p-2.5 flex items-center justify-around" style={{ background: "oklch(0.19 0.04 252)" }}>
            {["☀️", "🕐", "🌙"].map((emoji, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-sm">{emoji}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-amber-400" : "bg-white/20"}`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Glow */}
      <div
        className="absolute -inset-8 -z-10 rounded-full blur-3xl opacity-30"
        style={{ background: "oklch(0.55 0.2 252)" }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WelcomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Global animation styles ─────────────────────────────────────────── */}
      <style>{`
        .welcome-fade {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .welcome-fade.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, oklch(0.18 0.06 252) 0%, oklch(0.22 0.08 265) 50%, oklch(0.20 0.05 252) 100%)",
        }}
      >
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: "oklch(0.6 0.2 265)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: "oklch(0.72 0.14 65)", transform: "translate(-30%, 30%)" }} />

        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-20">
          {/* Logo */}
          <div className="flex justify-center mb-12 animate-fade-slide-up">
            <img src={BRAND_LOGO_DARK} alt="Continuary" className="h-20 w-auto object-contain" />
          </div>

          {/* Hero content + phone mockup */}
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left: copy */}
            <div className="flex-1 text-center lg:text-left animate-fade-slide-up animate-delay-100">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border"
                style={{ background: "oklch(0.72 0.14 65 / 0.15)", borderColor: "oklch(0.72 0.14 65 / 0.3)", color: "oklch(0.85 0.12 65)" }}
              >
                <Sparkles className="w-3 h-3" />
                Built for deep work
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1] mb-6">
                Your work has a thread.
                <br />
                <span style={{ color: "oklch(0.82 0.14 65)" }}>Continuary keeps it.</span>
              </h1>

              <p className="text-base text-white/65 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
                A calm, structured workspace for people who do deep work across multiple projects — and need to pick up exactly where they left off, every single day.
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3">
                {isAuthenticated ? (
                  <>
                    <Link href="/">
                      <Button
                        size="lg"
                        className="gap-2 px-8 font-semibold shadow-lg text-sm"
                        style={{ background: "oklch(0.72 0.14 65)", color: "oklch(0.18 0.05 252)" }}
                      >
                        Open Command Center <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <a href={getLoginUrl()}>
                      <Button
                        size="lg"
                        className="gap-2 px-8 font-semibold shadow-lg text-sm"
                        style={{ background: "oklch(0.72 0.14 65)", color: "oklch(0.18 0.05 252)" }}
                      >
                        Get Started Free <ArrowRight className="w-4 h-4" />
                      </Button>
                    </a>
                    <a href={getLoginUrl()}>
                      <Button
                        size="lg"
                        variant="outline"
                        className="gap-2 px-8 text-sm border-white/20 text-white hover:bg-white/10"
                      >
                        Sign In
                      </Button>
                    </a>
                  </>
                )}
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-4 mt-8 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {["oklch(0.6 0.15 265)", "oklch(0.55 0.18 30)", "oklch(0.5 0.15 140)", "oklch(0.58 0.2 300)"].map((c, i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-white/20" style={{ background: c }} />
                  ))}
                </div>
                <p className="text-xs text-white/50">Trusted by multi-project professionals</p>
              </div>
            </div>

            {/* Right: phone mockup */}
            <div className="shrink-0 animate-fade-slide-up animate-delay-200">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature grid ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <FadeSection className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">Everything you need</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Six spaces. One continuous thread.
            </h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto leading-relaxed">
              Each space does one thing well. Together they create a system that holds your work without holding you back.
            </p>
          </FadeSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }, i) => (
              <FadeSection key={title} delay={i * 60}>
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

      {/* ── Daily rhythm ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: "oklch(0.97 0.01 252)" }}>
        <div className="max-w-4xl mx-auto">
          <FadeSection className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">Daily rhythm</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Three check-ins. One complete day.
            </h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto leading-relaxed">
              Each check-in takes two to three minutes. Together they create a structure that holds your work without holding you back.
            </p>
          </FadeSection>

          <div className="relative">
            {/* Connector line */}
            <div className="absolute top-8 left-8 right-8 h-px bg-border hidden sm:block" />

            <div className="grid sm:grid-cols-3 gap-6 relative">
              {STEPS.map(({ icon: Icon, step, title, desc, color, accent }, i) => (
                <FadeSection key={step} delay={i * 100}>
                  <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-10 h-10 rounded-xl bg-card border-2 flex items-center justify-center relative z-10`} style={{ borderColor: `var(--${accent.replace("bg-", "")})` }}>
                        <Icon className={`w-5 h-5 ${color}`} />
                      </div>
                      <span className="text-[10px] font-bold tracking-widest text-muted-foreground">{step}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-2 leading-snug">{title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </FadeSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Who it's for ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <FadeSection className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">Who it's for</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Built for minds that move fast.
            </h2>
          </FadeSection>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                label: "The multi-project mind",
                desc: "You work across several things at once. Continuary holds the context for all of them so you don't have to.",
              },
              {
                icon: CheckCircle2,
                label: "The returner",
                desc: "You step away and come back. The Re-Entry Card and Tomorrow Brief make re-entry effortless every time.",
              },
              {
                icon: Shield,
                label: "The deep worker",
                desc: "You need long uninterrupted blocks. Continuary structures the edges so the middle stays clear.",
              },
            ].map(({ icon: Icon, label, desc }, i) => (
              <FadeSection key={label} delay={i * 80}>
                <div className="p-6 rounded-2xl border border-border bg-card text-center hover:border-primary/30 hover:shadow-md transition-all">
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

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, oklch(0.20 0.06 252) 0%, oklch(0.25 0.08 270) 100%)",
        }}
      >
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: "oklch(0.72 0.14 65)", transform: "translate(20%, -20%)" }} />

        <FadeSection className="max-w-2xl mx-auto text-center relative">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg" style={{ background: "oklch(0.72 0.14 65)" }}>
            <Zap className="w-7 h-7" style={{ color: "oklch(0.18 0.05 252)" }} />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-5 leading-snug">
            Ready to keep the thread?
          </h2>
          <p className="text-base text-white/65 leading-relaxed mb-10 max-w-lg mx-auto">
            Most productivity tools are good at capturing. Continuary is built for the harder problem: returning. Getting back into a project after two days away. Knowing which of your five active projects deserves today.
          </p>

          {isAuthenticated ? (
            <Link href="/">
              <Button
                size="lg"
                className="gap-2 px-10 font-semibold shadow-xl text-base"
                style={{ background: "oklch(0.72 0.14 65)", color: "oklch(0.18 0.05 252)" }}
              >
                Open Command Center <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href={getLoginUrl()}>
                <Button
                  size="lg"
                  className="gap-2 px-10 font-semibold shadow-xl text-base"
                  style={{ background: "oklch(0.72 0.14 65)", color: "oklch(0.18 0.05 252)" }}
                >
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </Button>
              </a>
              <p className="text-xs text-white/40">No credit card required</p>
            </div>
          )}
        </FadeSection>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-10 px-6 border-t border-border bg-background">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <img src={BRAND_LOGO_DARK} alt="Continuary" className="h-12 w-auto object-contain opacity-70" />

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {isAuthenticated ? (
              <>
                {[
                  { href: "/", label: "Command Center" },
                  { href: "/vault", label: "Vault" },
                  { href: "/projects", label: "Projects" },
                  { href: "/clarity", label: "Clarity" },
                  { href: "/intelligence", label: "Intelligence" },
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

          <p className="text-xs text-muted-foreground/50">Built for minds that move fast.</p>
        </div>
      </footer>
    </div>
  );
}
