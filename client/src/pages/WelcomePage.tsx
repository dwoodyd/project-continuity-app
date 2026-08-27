/**
 * Member-facing orientation guide. Marketing, pricing, and acquisition live on
 * continuary.app and /pricing; this page helps an existing member find their way.
 */
import { Link } from "wouter";
import { PageMeta } from "@/components/PageMeta";
import WrenPlayer from "@/components/WrenPlayer";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Compass,
  DoorOpen,
  HeartHandshake,
  Layers,
  Lightbulb,
  Moon,
  ScrollText,
  Sparkles,
  Sun,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

const BRAND_LOGO_DARK = "/logo-navy.svg";

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function FadeSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useFadeIn();
  return <div ref={ref} className={`welcome-fade ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

const DAILY_RHYTHM = [
  { icon: Sun, title: "Morning check-in", desc: "Set an intention and choose what deserves your attention first.", href: "/", action: "Open Today" },
  { icon: Clock, title: "Midday pulse", desc: "Recalibrate when the day changes shape instead of forcing the old plan.", href: "/", action: "Check in" },
  { icon: Moon, title: "Evening close", desc: "Capture what moved and leave tomorrow a clear thread to pick up.", href: "/", action: "Close your day" },
  { icon: Compass, title: "Weekly Compass", desc: "Choose a direction for the week so daily choices have somewhere to point.", href: "/compass", action: "Set your compass" },
];

const SPACES = [
  { icon: Brain, title: "Today", desc: "Reach for this when you need one clear next move.", href: "/" },
  { icon: Zap, title: "Clarity Engine", desc: "Use this when a task feels foggy, stuck, or harder than it should.", href: "/clarity" },
  { icon: BookOpen, title: "Knowledge Vault", desc: "Put raw notes, links, and useful context somewhere your future self can find.", href: "/vault" },
  { icon: Compass, title: "Weekly Compass", desc: "Return here when your week needs a direction, not a longer list.", href: "/compass" },
  { icon: BarChart3, title: "Intelligence", desc: "Look here when you want to notice patterns in how your work actually moves.", href: "/intelligence" },
  { icon: Lightbulb, title: "Scratch Pad", desc: "Open this when an idea needs a safe place without interrupting your current work.", href: "/scratch" },
  { icon: DoorOpen, title: "Re-Entry", desc: "Use Today after a gap to find your last context and a gentle way back in.", href: "/" },
  { icon: Target, title: "Single Focus", desc: "Choose this when one topic needs protected attention over several days.", href: "/study" },
  { icon: Clock, title: "Focus Sessions", desc: "Start one when you want a contained work block with Wren alongside you.", href: "/focus" },
  { icon: Layers, title: "Projects", desc: "Find decisions, context, and the next step here. Paused work rests in Quietly Waiting until you return.", href: "/projects" },
];

function EvidenceCard() {
  const currentMonth = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date());
  const stats = [
    { label: "Sessions started", value: "23" },
    { label: "Returns after gap", value: "7" },
    { label: "Hard-day sessions", value: "4" },
    { label: "Genuine permissions", value: "11" },
  ];

  return (
    <div className="rounded-2xl p-6 shadow-2xl max-w-sm mx-auto" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 32px 64px oklch(0 0 0 / 0.3)" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "oklch(0.72 0.14 72)" }}>Evidence Log</p>
          <p className="text-xs text-muted-foreground mt-0.5">{currentMonth}</p>
        </div>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.72 0.14 72 / 0.15)" }}>
          <ScrollText className="w-4 h-4" style={{ color: "oklch(0.72 0.14 72)" }} />
        </div>
      </div>
      <div className="mb-5 p-4 rounded-xl" style={{ background: "var(--muted)" }}>
        <p className="text-xs text-muted-foreground mb-2 font-medium">This month&apos;s identity sentence</p>
        <p className="text-sm font-medium leading-relaxed italic" style={{ color: "oklch(0.88 0.06 65)", fontFamily: "'DM Mono', monospace" }}>
          &quot;Someone who shows up for their work even when the conditions aren&apos;t perfect.&quot;
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-lg p-2.5 text-center" style={{ background: "var(--secondary)" }}>
            <p className="text-lg font-bold text-foreground">{value}</p>
            <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThresholdCard() {
  const prompts = [
    { question: "What task are you avoiding?", answer: "Writing the intro chapter" },
    { question: "What is actually in the way?", answer: "Fear it will not be good enough" },
    { question: "What is the smallest true step?", answer: "Write one honest sentence" },
  ];
  return (
    <div className="rounded-2xl p-6 shadow-2xl max-w-sm mx-auto" style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 32px 64px oklch(0 0 0 / 0.3)" }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.72 0.14 72 / 0.15)" }}>
          <DoorOpen className="w-4 h-4" style={{ color: "oklch(0.72 0.14 72)" }} />
        </div>
        <div>
          <p className="text-xs font-bold text-foreground">Threshold Diagnosis</p>
          <p className="text-xs text-muted-foreground">What&apos;s at the door?</p>
        </div>
      </div>
      <div className="space-y-3">
        {prompts.map(({ question, answer }) => (
          <div key={question} className="rounded-xl p-3" style={{ background: "var(--muted)" }}>
            <p className="text-[9px] text-muted-foreground mb-1">{question}</p>
            <p className="text-xs font-medium text-foreground/85">{answer}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl p-3 flex items-center gap-2" style={{ background: "oklch(0.72 0.14 72 / 0.12)", border: "1px solid oklch(0.72 0.14 72 / 0.25)" }}>
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(0.72 0.14 72)" }} />
        <p className="text-xs font-medium" style={{ color: "oklch(0.74 0.14 72)" }}>Named. Now you can begin.</p>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <main id="main-content" className="public-theme-surface min-h-screen bg-background text-foreground overflow-x-hidden">
      <PageMeta title="Welcome to Continuary" description="A member guide to returning without rebuilding context, finding one next step, and keeping your thread intact." path="/welcome" />

      <section className="relative overflow-hidden bg-background">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: "oklch(0.74 0.14 72 / 0.4)", transform: "translate(30%, -30%)" }} />
        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-24">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="order-1 flex flex-col items-center text-center animate-fade-slide-up">
              <WrenPlayer clip="popsHead" size="hero" stage={false} feather fallbackStill="siliconeWatching" wrapperClassName="shrink-0" />
              <p className="mt-3 text-xs font-medium" style={{ color: "oklch(0.72 0.10 65 / 0.8)" }}>Wren — your Continuary companion</p>
              <p className="mt-2 max-w-sm text-xs leading-relaxed" style={{ color: "oklch(0.72 0.04 240)" }}>She remembers your thread and returns without rebuke. A companion, not a clinician.</p>
            </div>
            <div className="order-2 text-center lg:text-left animate-fade-slide-up animate-delay-100">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 border" style={{ background: "oklch(0.72 0.14 72 / 0.15)", borderColor: "oklch(0.72 0.14 72 / 0.3)", color: "oklch(0.74 0.14 72)" }}>
                <Sparkles className="w-3 h-3" /> Continuity across absence
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1] mb-6">
                The place that remembers<br /><span style={{ color: "oklch(0.74 0.14 72)" }}>where you were.</span>
              </h1>
              <p className="text-base text-white/65 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">Coming back does not require rebuilding context. Your thread, notes, and next step are still here when you are ready. Start with the part of your space that meets this moment.</p>
              <Link href="/"><Button size="lg" className="gap-2 px-8 font-semibold shadow-lg text-sm" style={{ background: "oklch(0.72 0.14 72)", color: "oklch(0.12 0.03 264)" }}>Open Today <ArrowRight className="w-4 h-4" /></Button></Link>
              <p className="mt-5 text-xs text-white/45">Return here anytime you need to re-find your footing.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 relative overflow-hidden bg-muted/50">
        <div className="max-w-5xl mx-auto grid gap-14 lg:grid-cols-2 lg:items-center">
          <FadeSection><EvidenceCard /></FadeSection>
          <FadeSection delay={100} className="text-center lg:text-left">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">Notice what is already moving</p>
            <h2 className="text-3xl font-bold tracking-tight text-white mb-4">Your Evidence Log</h2>
            <p className="text-base text-white/60 leading-relaxed mb-6">Once a month, this is where your sessions, returns, and hard-day effort become one honest sentence about the person you are practicing being.</p>
            <Link href="/evidence" className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "oklch(0.74 0.14 72)" }}>Open your Evidence Log <ArrowRight className="w-4 h-4" /></Link>
          </FadeSection>
        </div>
      </section>

      <section className="py-20 px-6 bg-background">
        <div className="max-w-5xl mx-auto grid gap-14 lg:grid-cols-2 lg:items-center">
          <FadeSection className="order-2 lg:order-1 text-center lg:text-left">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">When starting feels complicated</p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">Run a Clarity session</h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-6">Use the Threshold Diagnosis when the task is not the whole story. It helps name what is really in the doorway, then turns it into a smaller true step.</p>
            <Link href="/clarity" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">Run a Clarity session <ArrowRight className="w-4 h-4" /></Link>
          </FadeSection>
          <FadeSection delay={100} className="order-1 lg:order-2"><ThresholdCard /></FadeSection>
        </div>
      </section>

      <section className="py-16 px-6" style={{ background: "oklch(0.97 0.01 252)" }}>
        <div className="max-w-3xl mx-auto"><FadeSection>
          <div className="rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-start gap-6" style={{ background: "var(--card)", border: "1px solid oklch(0.30 0.07 252)" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "oklch(0.72 0.14 72 / 0.15)" }}><HeartHandshake className="w-6 h-6" style={{ color: "oklch(0.72 0.14 72)" }} /></div>
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "oklch(0.72 0.14 72)" }}>After a gap</p>
              <h2 className="text-xl font-bold text-white mb-3 leading-snug">You came back. That&apos;s the whole thing.</h2>
              <p className="text-sm text-white/60 leading-relaxed mb-4">Today holds your last context, open loops, and one gentle next step so you never have to reconstruct everything before you begin.</p>
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "oklch(0.74 0.14 72)" }}>Find your way back in <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </FadeSection></div>
      </section>

      <section className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <FadeSection className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">Your day in four beats</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Start, notice, close, and choose again.</h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto leading-relaxed">Use the rhythm that is useful today. Missing one does not break the day, and pausing a project simply moves it to Quietly Waiting.</p>
          </FadeSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DAILY_RHYTHM.map(({ icon: Icon, title, desc, href, action }, index) => (
              <FadeSection key={title} delay={index * 80}>
                <Link href={href} className="block h-full rounded-2xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all">
                  <Icon className="w-5 h-5 text-primary mb-5" />
                  <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">{desc}</p>
                  <span className="text-xs font-semibold text-primary inline-flex items-center gap-1">{action} <ArrowRight className="w-3 h-3" /></span>
                </Link>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6" style={{ background: "oklch(0.97 0.01 252)" }}>
        <div className="max-w-4xl mx-auto">
          <FadeSection className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">Your app map</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Ten spaces. One continuous thread.</h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-lg mx-auto leading-relaxed">Choose the space that helps you preserve context, find your next step, or let work wait quietly until it is time.</p>
          </FadeSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SPACES.map(({ icon: Icon, title, desc, href }, index) => (
              <FadeSection key={title} delay={index * 45}>
                <Link href={href} className="group block h-full rounded-2xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-lg transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Icon className="w-5 h-5 text-primary" /></div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">{desc}</p>
                  <span className="text-xs font-semibold text-primary inline-flex items-center gap-1">Open {title} <ArrowRight className="w-3 h-3" /></span>
                </Link>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 relative overflow-hidden" style={{ background: "var(--card)" }}>
        <FadeSection className="max-w-2xl mx-auto text-center relative">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg" style={{ background: "oklch(0.72 0.14 72)" }}><ScrollText className="w-7 h-7" style={{ color: "oklch(0.18 0.05 252)" }} /></div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-5 leading-snug">You only need the next true step.</h2>
          <p className="text-base text-white/65 leading-relaxed mb-10 max-w-lg mx-auto">Open Today to rejoin your thread, or begin a Focus Session when you are ready for a little protected space.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/"><Button size="lg" className="gap-2 px-8 font-semibold" style={{ background: "oklch(0.72 0.14 72)", color: "oklch(0.12 0.03 264)" }}>Open Today <ArrowRight className="w-4 h-4" /></Button></Link>
            <Link href="/focus"><Button size="lg" variant="outline" className="gap-2 px-8 border-white/20 text-white hover:bg-white/10">Start a Focus Session <Clock className="w-4 h-4" /></Button></Link>
          </div>
          <a href="https://continuary.app" target="_blank" rel="noopener noreferrer" className="inline-block mt-7 text-xs text-white/40 hover:text-white/70 transition-colors">Read the full Continuary story on continuary.app</a>
        </FadeSection>
      </section>

      <footer className="py-10 px-6 border-t border-border bg-background">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <img src={BRAND_LOGO_DARK} alt="Continuary" className="h-12 w-12 object-contain rounded-xl opacity-70" />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[{ href: "/", label: "Today" }, { href: "/vault", label: "Knowledge Vault" }, { href: "/projects", label: "Projects" }, { href: "/clarity", label: "Clarity Engine" }, { href: "/evidence", label: "Evidence Log" }, { href: "/settings", label: "Settings" }].map(({ href, label }) => (
              <Link key={href} href={href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{label}</Link>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link><Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link></div>
        </div>
      </footer>
    </main>
  );
}
