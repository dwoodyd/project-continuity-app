import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

const SHARE_CARD = "https://d2xsxph8kpxj0f.cloudfront.net/310519663270045694/VnvNaoJZPVnHWmB8F3cwwo/continuary-share-card-FauhVHKYVXhAVX4JSVfZAJ.png";

const PAIN_POINTS = [
  { icon: "🌀", text: "You open a project and can't remember where you left off." },
  { icon: "🔥", text: "You start strong, then lose the thread mid-week." },
  { icon: "😶", text: "You have 12 open tabs and zero clarity on what to do next." },
  { icon: "🧠", text: "Your brain works in bursts — and every system punishes that." },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Morning check-in", desc: "Set direction before the day sets itself. 2 minutes." },
  { step: "02", title: "Midday pulse", desc: "Catch drift before it becomes a lost day." },
  { step: "03", title: "Evening close", desc: "Capture the day. Re-entry is ready for tomorrow." },
  { step: "04", title: "Weekly Compass", desc: "One ritual to close the week and open the next with intention." },
];



export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-lg">✦</span>
          <span className="font-bold tracking-tight text-sm">Continuary</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-white/40 hover:text-white text-sm transition-colors">Sign in</button>
          <a href={getLoginUrl()} className="bg-amber-400 hover:bg-amber-300 text-black text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            Get started free
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-1.5 text-amber-400 text-xs font-medium mb-8">
          ✦ Built for ADHD, focus struggles, and non-linear thinkers
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
          Your brain isn't broken.<br />
          <span className="text-amber-400">Your system was.</span>
        </h1>
        <p className="text-white/50 text-xl leading-relaxed mb-10 max-w-xl mx-auto">
          Continuary keeps your thread. Three check-ins a day. Every project stays warm. You always know where you are.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href={getLoginUrl()} className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-8 py-4 rounded-2xl text-base transition-colors w-full sm:w-auto text-center">
            Start your thread — free
          </a>
          <button onClick={() => navigate("/")} className="text-white/40 hover:text-white text-sm transition-colors">
            Already have an account →
          </button>
        </div>
      </section>

      {/* Share card image */}
      <section className="px-6 max-w-2xl mx-auto mb-24">
        <img src={SHARE_CARD} alt="Continuary — Your brain isn't broken" className="w-full rounded-3xl border border-white/10 shadow-2xl" />
      </section>

      {/* Pain points */}
      <section className="px-6 max-w-2xl mx-auto mb-24">
        <h2 className="text-2xl font-bold mb-8 text-center">Sound familiar?</h2>
        <div className="space-y-4">
          {PAIN_POINTS.map((p) => (
            <div key={p.text} className="flex items-start gap-4 bg-white/5 rounded-2xl p-5 border border-white/10">
              <span className="text-2xl flex-shrink-0">{p.icon}</span>
              <p className="text-white/70 leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-white/40 text-sm mt-8">
          You don't need more discipline. You need a system that works with your brain, not against it.
        </p>
      </section>

      {/* How it works */}
      <section className="px-6 max-w-2xl mx-auto mb-24">
        <h2 className="text-2xl font-bold mb-2 text-center">How it works</h2>
        <p className="text-white/40 text-center text-sm mb-10">Four touchpoints. Zero shame. Total continuity.</p>
        <div className="space-y-6">
          {HOW_IT_WORKS.map((h) => (
            <div key={h.step} className="flex items-start gap-5">
              <div className="text-amber-400 font-mono text-sm font-bold flex-shrink-0 mt-1">{h.step}</div>
              <div>
                <div className="font-semibold mb-1">{h.title}</div>
                <div className="text-white/50 text-sm">{h.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Early tester CTA */}
      <section className="px-6 max-w-2xl mx-auto mb-24">
        <div className="bg-white/5 rounded-3xl p-8 border border-white/10 text-center">
          <div className="text-3xl mb-4">🧵</div>
          <h2 className="text-xl font-bold mb-2">Be an early voice</h2>
          <p className="text-white/50 text-sm leading-relaxed mb-6 max-w-sm mx-auto">
            Continuary is new. If you try it and it helps — or doesn't — I want to hear from you directly.
            Early feedback shapes everything.
          </p>
          <a
            href="mailto:hello@soulengineer.online?subject=Continuary Early Feedback"
            className="inline-block bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors"
          >
            Send early feedback →
          </a>
        </div>
      </section>

      {/* Pro CTA */}
      <section className="px-6 max-w-xl mx-auto mb-24 text-center">
        <div className="bg-gradient-to-b from-amber-400/10 to-transparent border border-amber-400/20 rounded-3xl p-10">
          <div className="text-amber-400 text-3xl mb-4">✦</div>
          <h2 className="text-3xl font-bold mb-3">Ready to keep your thread?</h2>
          <p className="text-white/50 mb-8 leading-relaxed">
            Free to start. Pro for $4.99/month — unlimited Clarity Engine, full thread history, and smart nudges.
          </p>
          <a href={getLoginUrl()} className="inline-block bg-amber-400 hover:bg-amber-300 text-black font-bold px-8 py-4 rounded-2xl text-base transition-colors">
            Start free today
          </a>
          <p className="text-white/20 text-xs mt-4">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 text-center text-white/20 text-xs">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-amber-400">✦</span>
          <span className="font-bold text-white/40">Continuary</span>
        </div>
        <div className="flex items-center justify-center gap-6">
          <button onClick={() => navigate("/privacy")} className="hover:text-white/50 transition-colors">Privacy</button>
          <button onClick={() => navigate("/terms")} className="hover:text-white/50 transition-colors">Terms</button>
          <button onClick={() => navigate("/")} className="hover:text-white/50 transition-colors">App</button>
        </div>
      </footer>
    </div>
  );
}
