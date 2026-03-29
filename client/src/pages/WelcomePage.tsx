import { Link } from "wouter";
import {
  Brain,
  BookOpen,
  Archive,
  Sun,
  Clock,
  Moon,
  ArrowRight,
  Compass,
  Zap,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function WelcomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.22 0.06 252) 0%, oklch(0.28 0.08 270) 50%, oklch(0.24 0.05 252) 100%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
          {/* Logo mark */}
          <div className="inline-flex items-center gap-3 mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg"
              style={{ background: "oklch(0.72 0.14 65)", color: "oklch(0.22 0.06 252)" }}
            >
              C
            </div>
            <span className="text-2xl font-semibold tracking-tight text-white">Continuary</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight mb-5">
            Your work has a thread.
            <br />
            <span style={{ color: "oklch(0.82 0.14 65)" }}>Continuary keeps it.</span>
          </h1>

          <p className="text-lg text-white/70 max-w-xl mx-auto leading-relaxed mb-10">
            A calm, structured workspace for people who do deep work across multiple projects — and need to pick up exactly where they left off, every single day.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isAuthenticated ? (
              <>
                <Link href="/">
                  <Button
                    size="lg"
                    className="gap-2 px-8 font-semibold shadow-lg"
                    style={{ background: "oklch(0.72 0.14 65)", color: "oklch(0.18 0.05 252)" }}
                  >
                    Open Command Center <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/projects">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 px-8 border-white/20 text-white hover:bg-white/10"
                  >
                    View Projects
                  </Button>
                </Link>
              </>
            ) : (
              <a href={getLoginUrl()}>
                <Button
                  size="lg"
                  className="gap-2 px-8 font-semibold shadow-lg"
                  style={{ background: "oklch(0.72 0.14 65)", color: "oklch(0.18 0.05 252)" }}
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 text-center">
            How it works
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-center mb-14">
            Four steps. One continuous thread.
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                icon: Archive,
                title: "Gather your projects and notes",
                desc: "Import sources, define active projects, and capture what matters into the Knowledge Vault.",
              },
              {
                step: "02",
                icon: Compass,
                title: "Choose what matters now",
                desc: "Set a weekly compass — your primary and secondary focus — so every day starts with clear intent.",
              },
              {
                step: "03",
                icon: CheckCircle2,
                title: "Check in through the day",
                desc: "Three brief check-ins (morning, midday, evening) keep you aligned without interrupting deep work.",
              },
              {
                step: "04",
                icon: Layers,
                title: "Carry today forward",
                desc: "The evening closure builds tomorrow's brief. You never lose the thread between sessions.",
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div
                key={step}
                className="relative p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="text-[10px] font-bold tracking-widest text-primary/50 mb-4">{step}</div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-2 leading-snug">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Spaces ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: "oklch(0.97 0.01 252)" }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 text-center">
            Core spaces
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-center mb-14">
            Two places. Everything in its place.
          </h2>

          <div className="grid sm:grid-cols-2 gap-8">
            {/* Command Center */}
            <div className="p-8 rounded-2xl border border-primary/20 bg-white shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-5">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">Command Center</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Your daily operating surface. Every morning it shows you what to focus on, surfaces the most important next step across all your projects, and tracks your check-in rhythm through the day.
              </p>
              <ul className="space-y-2">
                {[
                  "Morning plan — capacity + focus",
                  "Start Here card — one concrete next action",
                  "Daily rhythm — morning, midday, evening",
                  "Tomorrow Brief — built during evening closure",
                  "Re-Entry Card — pick up after a break",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {isAuthenticated && (
                <Link href="/">
                  <Button size="sm" className="mt-6 gap-1.5">
                    Open Command Center <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Knowledge Vault */}
            <div className="p-8 rounded-2xl border border-amber-200 bg-white shadow-sm">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: "oklch(0.72 0.14 65)" }}
              >
                <BookOpen className="w-6 h-6" style={{ color: "oklch(0.22 0.06 252)" }} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-3">Knowledge Vault</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Where your raw material lives. Import notes, articles, voice memos, and ideas. The Vault processes them, suggests project links, and surfaces relevant context when you need it — without cluttering your working space.
              </p>
              <ul className="space-y-2">
                {[
                  "Quick Capture — amber FAB, always accessible",
                  "AI-assisted project mapping",
                  "Idea Sanctuary — unreviewed ideas queue",
                  "Source types: text, link, note, voice",
                  "Linked to project timelines",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "oklch(0.72 0.14 65)" }} />
                    {item}
                  </li>
                ))}
              </ul>
              {isAuthenticated && (
                <Link href="/vault">
                  <Button
                    size="sm"
                    className="mt-6 gap-1.5"
                    style={{ background: "oklch(0.72 0.14 65)", color: "oklch(0.18 0.05 252)" }}
                  >
                    Explore Knowledge Vault <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Daily Rhythm ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 text-center">
            Daily rhythm
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-center mb-4">
            Three check-ins. One complete day.
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-lg mx-auto mb-14">
            Each check-in takes two to three minutes. Together they create a structure that holds your work without holding you back.
          </p>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: Sun,
                time: "Morning",
                label: "Set capacity + focus",
                color: "text-amber-500",
                bg: "bg-amber-50 border-amber-100",
                iconBg: "bg-amber-100",
                desc: "Declare your capacity for the day (full, partial, or low). Choose your primary project. The AI generates a structured plan shaped to your energy.",
                items: ["Capacity selector", "Primary project focus", "AI-generated task plan", "Weekly Compass alignment"],
              },
              {
                icon: Clock,
                time: "Midday",
                label: "Alignment pulse",
                color: "text-primary",
                bg: "bg-primary/5 border-primary/10",
                iconBg: "bg-primary/10",
                desc: "A brief mid-session check. Are you on plan? Any blockers? The midday pulse recalibrates without derailing your momentum.",
                items: ["On-plan confirmation", "Blocker surfacing", "Distraction log", "Gentle course correction"],
              },
              {
                icon: Moon,
                time: "Evening",
                label: "Close the day",
                color: "text-indigo-400",
                bg: "bg-indigo-50 border-indigo-100",
                iconBg: "bg-indigo-100",
                desc: "Reflect on what moved. Capture what carries forward. The evening closure writes tomorrow's brief so you start the next day with context, not confusion.",
                items: ["Wins + carryovers", "Tomorrow brief", "Idea Sanctuary prompt", "Decision logging"],
              },
            ].map(({ icon: Icon, time, label, color, bg, iconBg, desc, items }) => (
              <div key={time} className={`p-6 rounded-2xl border ${bg}`}>
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className={`text-xs font-bold tracking-widest uppercase ${color} mb-1`}>{time}</p>
                <h3 className="text-sm font-semibold text-foreground mb-3">{label}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">{desc}</p>
                <ul className="space-y-1.5">
                  {items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className={`w-1 h-1 rounded-full ${color.replace("text-", "bg-")}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Soft Guidance ─────────────────────────────────────────────────────── */}
      <section
        className="py-20 px-6"
        style={{
          background: "linear-gradient(135deg, oklch(0.22 0.06 252) 0%, oklch(0.26 0.07 265) 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <Zap className="w-8 h-8 mx-auto mb-6" style={{ color: "oklch(0.82 0.14 65)" }} />
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-5 leading-snug">
            This app is here to help you{" "}
            <span style={{ color: "oklch(0.82 0.14 65)" }}>continue</span> work,<br />
            not just collect it.
          </h2>
          <p className="text-base text-white/65 leading-relaxed mb-10 max-w-lg mx-auto">
            Most productivity tools are good at capturing. Continuary is built for the harder problem: returning. Getting back into a project after two days away. Knowing which of your five active projects deserves today. Carrying the thread from yesterday into now.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {[
              { label: "For the multi-project mind", desc: "You work across several things at once. Continuary holds the context for all of them." },
              { label: "For the returner", desc: "You step away and come back. The Re-Entry Card and Tomorrow Brief make re-entry effortless." },
              { label: "For the deep worker", desc: "You need long uninterrupted blocks. Continuary structures the edges so the middle stays clear." },
            ].map(({ label, desc }) => (
              <div key={label} className="p-5 rounded-xl bg-white/5 border border-white/10 text-left">
                <p className="text-sm font-semibold text-white mb-2">{label}</p>
                <p className="text-xs text-white/55 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {isAuthenticated ? (
            <Link href="/">
              <Button
                size="lg"
                className="gap-2 px-8 font-semibold shadow-lg"
                style={{ background: "oklch(0.72 0.14 65)", color: "oklch(0.18 0.05 252)" }}
              >
                Open Command Center <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <a href={getLoginUrl()}>
              <Button
                size="lg"
                className="gap-2 px-8 font-semibold shadow-lg"
                style={{ background: "oklch(0.72 0.14 65)", color: "oklch(0.18 0.05 252)" }}
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          )}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: "oklch(0.72 0.14 65)", color: "oklch(0.22 0.06 252)" }}
            >
              C
            </div>
            <span className="text-sm font-medium text-foreground">Continuary</span>
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-6">
              {[
                { href: "/", label: "Command Center" },
                { href: "/vault", label: "Knowledge Vault" },
                { href: "/projects", label: "Projects" },
                { href: "/compass", label: "Weekly Compass" },
                { href: "/settings", label: "Settings" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
