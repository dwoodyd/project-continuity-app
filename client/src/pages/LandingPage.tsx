import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { WREN_CLIPS } from "@/lib/wrenClips";

const PAIN_POINTS = [
  { label: "The restart tax", text: "You open a project and spend 20 minutes just remembering where you left off." },
  { label: "The burst penalty", text: "You work in focused sprints — but every system was built for linear thinkers." },
  { label: "The open tab spiral", text: "12 tabs. 3 half-finished docs. Zero clarity on what matters right now." },
  { label: "The lost week", text: "You start strong on Monday. By Thursday, the thread is gone." },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Morning check-in", italic: "Set direction.", desc: "Two minutes before the day sets itself. Your projects stay warm." },
  { step: "02", title: "Midday pulse", italic: "Catch the drift.", desc: "A quiet moment to re-orient before the afternoon takes over." },
  { step: "03", title: "Evening close", italic: "Capture the day.", desc: "Re-entry is ready for tomorrow. Nothing lost in the gap." },
  { step: "04", title: "Weekly Compass", italic: "Close the loop.", desc: "One ritual to close the week and open the next with intention." },
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [inviteCode, setInviteCode] = useState("");
  const [heroLoaded, setHeroLoaded] = useState(false);
  const inviteSectionRef = useRef<HTMLElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  // Pre-fill invite code from URL param: /landing?code=XXXX
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");
    if (codeParam) {
      const normalized = codeParam.trim().toUpperCase();
      setInviteCode(normalized);
      sessionStorage.setItem("pendingInviteCode", normalized);
      setTimeout(() => {
        inviteSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
  }, []);

  const handleInviteSignIn = () => {
    if (inviteCode.trim()) {
      sessionStorage.setItem("pendingInviteCode", inviteCode.trim().toUpperCase());
    }
    window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen text-white font-sans" style={{ background: "oklch(0.09 0.015 240)" }}>

      {/* ── Fixed Nav ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: "oklch(0.09 0.015 240 / 0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid oklch(1 0 0 / 0.06)" }}>
        <div className="flex items-center gap-2.5">
          <img src="/logo-navy.svg" alt="Continuary" className="w-9 h-9 rounded-xl" />
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 17, color: "oklch(0.97 0.01 80)", letterSpacing: "0.01em" }}>
            Continuary
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a href={getLoginUrl()} style={{ color: "oklch(0.97 0.01 80 / 0.4)", fontSize: 14 }} className="hover:opacity-80 transition-opacity">
            Sign in
          </a>
          <a href="/apply"
            style={{ background: "oklch(0.78 0.18 65)", color: "#0a0a0f", fontSize: 13, fontWeight: 700, padding: "8px 18px", borderRadius: 12 }}
            className="hover:opacity-90 transition-opacity">
            Apply for access
          </a>
        </div>
      </nav>

      {/* ── Hero — Full Bleed Video ─────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden" style={{ minHeight: "100svh" }}>
        {/* Background video */}
        <video
          ref={heroVideoRef}
          src={WREN_CLIPS.hoveringArchway}
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={() => setHeroLoaded(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: heroLoaded ? 1 : 0,
            transition: "opacity 1.2s ease-out",
            mixBlendMode: "screen",
            filter: "brightness(0.7) saturate(1.1)",
          }}
        />

        {/* Deep navy overlay — keeps text readable */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, oklch(0.09 0.015 240 / 0.55) 0%, oklch(0.09 0.015 240 / 0.3) 40%, oklch(0.09 0.015 240 / 0.7) 100%)" }} />

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto" style={{ paddingTop: 96 }}>
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 mb-10"
            style={{ background: "oklch(0.78 0.18 65 / 0.12)", border: "1px solid oklch(0.78 0.18 65 / 0.25)", borderRadius: 999, padding: "6px 16px" }}>
            <span style={{ color: "oklch(0.78 0.18 65)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Built for non-linear thinkers
            </span>
          </div>

          {/* Headline — marketing site roman/italic pattern */}
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, lineHeight: 1.12, marginBottom: 24 }}>
            <span style={{ display: "block", fontSize: "clamp(42px, 7vw, 72px)", color: "oklch(0.97 0.01 80)" }}>
              Your brain isn't broken.
            </span>
            <span style={{ display: "block", fontSize: "clamp(42px, 7vw, 72px)", color: "oklch(0.78 0.18 65)", fontStyle: "italic" }}>
              Your system was.
            </span>
          </h1>

          <p style={{ color: "oklch(0.97 0.01 80 / 0.55)", fontSize: "clamp(16px, 2.2vw, 20px)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 40px" }}>
            Continuary keeps your thread. Three check-ins a day. Every project stays warm. You always know where you are.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/apply"
              style={{ background: "oklch(0.78 0.18 65)", color: "#0a0a0f", fontWeight: 700, fontSize: 15, padding: "16px 36px", borderRadius: 16 }}
              className="hover:opacity-90 transition-opacity w-full sm:w-auto text-center">
              Apply for founding access
            </a>
            <a href={getLoginUrl()}
              style={{ color: "oklch(0.97 0.01 80 / 0.45)", fontSize: 14 }}
              className="hover:opacity-80 transition-opacity">
              Already have an account →
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
          style={{ opacity: heroLoaded ? 0.4 : 0, transition: "opacity 1s ease-out 2s" }}>
          <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, oklch(0.78 0.18 65), transparent)" }} />
          <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "oklch(0.97 0.01 80 / 0.5)" }}>scroll</span>
        </div>
      </section>

      {/* ── Pain Points ────────────────────────────────────────────────────── */}
      <section className="px-6 py-28 max-w-3xl mx-auto">
        {/* Section label */}
        <div className="flex items-center gap-4 mb-14">
          <div style={{ width: 32, height: 1, background: "oklch(0.78 0.18 65 / 0.5)" }} />
          <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "oklch(0.78 0.18 65)", fontWeight: 600 }}>
            Sound familiar
          </span>
        </div>

        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, marginBottom: 48 }}>
          <span style={{ display: "block", fontSize: "clamp(28px, 4vw, 42px)", color: "oklch(0.97 0.01 80)" }}>The patterns that</span>
          <span style={{ display: "block", fontSize: "clamp(28px, 4vw, 42px)", color: "oklch(0.78 0.18 65)", fontStyle: "italic" }}>keep breaking your flow.</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PAIN_POINTS.map((p) => (
            <div key={p.label} style={{ padding: "28px 28px", borderRadius: 16, border: "1px solid oklch(1 0 0 / 0.08)", background: "oklch(1 0 0 / 0.03)" }}>
              <div style={{ color: "oklch(0.78 0.18 65)", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
                {p.label}
              </div>
              <p style={{ color: "oklch(0.97 0.01 80 / 0.6)", lineHeight: 1.65, fontSize: 15 }}>{p.text}</p>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", color: "oklch(0.97 0.01 80 / 0.3)", fontSize: 14, marginTop: 40, fontStyle: "italic" }}>
          You don't need more discipline. You need a system that works with your brain.
        </p>
      </section>

      {/* ── Wren Feature Interlude ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: 480 }}>
        <video
          src={WREN_CLIPS.holdingOrb}
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ mixBlendMode: "screen", opacity: 0.55, filter: "brightness(0.8)" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, oklch(0.09 0.015 240 / 0.92) 0%, oklch(0.09 0.015 240 / 0.6) 50%, oklch(0.09 0.015 240 / 0.85) 100%)" }} />
        <div className="relative z-10 flex flex-col justify-center h-full px-8 max-w-2xl mx-auto text-center py-24">
          <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(22px, 3.5vw, 36px)", color: "oklch(0.97 0.01 80)", lineHeight: 1.4, marginBottom: 12 }}>
            "The thread breaks
          </p>
          <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(22px, 3.5vw, 36px)", color: "oklch(0.78 0.18 65)", fontStyle: "italic", lineHeight: 1.4 }}>
            quietly."
          </p>
          <p style={{ color: "oklch(0.97 0.01 80 / 0.4)", fontSize: 13, marginTop: 20, letterSpacing: "0.06em" }}>
            Continuary catches it before you lose the day.
          </p>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <section className="px-6 py-28 max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-14">
          <div style={{ width: 32, height: 1, background: "oklch(0.78 0.18 65 / 0.5)" }} />
          <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "oklch(0.78 0.18 65)", fontWeight: 600 }}>
            The ritual
          </span>
        </div>

        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, marginBottom: 56 }}>
          <span style={{ display: "block", fontSize: "clamp(28px, 4vw, 42px)", color: "oklch(0.97 0.01 80)" }}>Four touchpoints.</span>
          <span style={{ display: "block", fontSize: "clamp(28px, 4vw, 42px)", color: "oklch(0.78 0.18 65)", fontStyle: "italic" }}>Zero shame.</span>
        </h2>

        <div className="space-y-0">
          {HOW_IT_WORKS.map((h, i) => (
            <div key={h.step} className="flex items-start gap-8 py-8"
              style={{ borderTop: i === 0 ? "1px solid oklch(1 0 0 / 0.08)" : "none", borderBottom: "1px solid oklch(1 0 0 / 0.08)" }}>
              <div style={{ color: "oklch(0.78 0.18 65 / 0.5)", fontFamily: "monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", minWidth: 28, paddingTop: 3 }}>
                {h.step}
              </div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 20, color: "oklch(0.97 0.01 80)", marginBottom: 6 }}>
                  {h.title} — <em style={{ color: "oklch(0.78 0.18 65)" }}>{h.italic}</em>
                </div>
                <div style={{ color: "oklch(0.97 0.01 80 / 0.45)", fontSize: 14, lineHeight: 1.65 }}>{h.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Invite Code Section ─────────────────────────────────────────────── */}
      <section ref={inviteSectionRef} className="px-6 py-16 max-w-xl mx-auto">
        <div style={{ background: "oklch(1 0 0 / 0.03)", border: "1px solid oklch(0.78 0.18 65 / 0.25)", borderRadius: 24, padding: "40px 36px", textAlign: "center" }}>
          <div style={{ width: 36, height: 1, background: "oklch(0.78 0.18 65 / 0.5)", margin: "0 auto 24px" }} />
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 22, color: "oklch(0.97 0.01 80)", marginBottom: 10 }}>
            Have an invite code?
          </h2>
          <p style={{ color: "oklch(0.97 0.01 80 / 0.4)", fontSize: 14, lineHeight: 1.65, marginBottom: 28, maxWidth: 300, margin: "0 auto 28px" }}>
            Enter your code below — it'll be applied automatically when you sign in.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleInviteSignIn()}
              placeholder="ENTER CODE"
              maxLength={32}
              style={{ flex: 1, background: "oklch(1 0 0 / 0.06)", border: "1px solid oklch(1 0 0 / 0.15)", borderRadius: 12, padding: "12px 16px", color: "oklch(0.97 0.01 80)", fontSize: 13, fontFamily: "monospace", letterSpacing: "0.12em", outline: "none" }}
            />
            <button
              onClick={handleInviteSignIn}
              style={{ background: "oklch(0.78 0.18 65)", color: "#0a0a0f", fontWeight: 700, fontSize: 13, padding: "12px 22px", borderRadius: 12, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
              className="hover:opacity-90 transition-opacity"
            >
              Sign in →
            </button>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="px-6 py-24 max-w-2xl mx-auto text-center">
        <div style={{ width: 48, height: 1, background: "oklch(0.78 0.18 65 / 0.4)", margin: "0 auto 32px" }} />
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, marginBottom: 16 }}>
          <span style={{ display: "block", fontSize: "clamp(28px, 4vw, 44px)", color: "oklch(0.97 0.01 80)" }}>Ready to keep</span>
          <span style={{ display: "block", fontSize: "clamp(28px, 4vw, 44px)", color: "oklch(0.78 0.18 65)", fontStyle: "italic" }}>your thread?</span>
        </h2>
        <p style={{ color: "oklch(0.97 0.01 80 / 0.4)", fontSize: 15, lineHeight: 1.7, marginBottom: 36, maxWidth: 400, margin: "0 auto 36px" }}>
          Founding member access is limited. Apply now and be part of the first cohort.
        </p>
        <a href="/apply"
          style={{ display: "inline-block", background: "oklch(0.78 0.18 65)", color: "#0a0a0f", fontWeight: 700, fontSize: 15, padding: "16px 40px", borderRadius: 16 }}
          className="hover:opacity-90 transition-opacity">
          Apply for founding access
        </a>
        <p style={{ color: "oklch(0.97 0.01 80 / 0.2)", fontSize: 11, marginTop: 16 }}>
          No credit card required · Founding rate locked for life
        </p>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid oklch(1 0 0 / 0.06)", padding: "32px 24px", textAlign: "center" }}>
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <img src="/logo-navy.svg" alt="Continuary" className="w-7 h-7 rounded-lg" />
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 15, color: "oklch(0.97 0.01 80 / 0.5)" }}>
            Continuary
          </span>
        </div>
        <div className="flex items-center justify-center gap-6 mb-4" style={{ fontSize: 12, color: "oklch(0.97 0.01 80 / 0.25)" }}>
          <button onClick={() => navigate("/privacy")} className="hover:opacity-60 transition-opacity">Privacy</button>
          <button onClick={() => navigate("/terms")} className="hover:opacity-60 transition-opacity">Terms</button>
          <a href={getLoginUrl()} className="hover:opacity-60 transition-opacity">Sign in</a>
        </div>
        <button
          onClick={() => {
            inviteSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            setTimeout(() => inviteSectionRef.current?.querySelector("input")?.focus(), 600);
          }}
          style={{ color: "oklch(0.78 0.18 65 / 0.55)", fontSize: 12, fontWeight: 500, letterSpacing: "0.04em", background: "none", border: "none", cursor: "pointer" }}
          className="hover:opacity-80 transition-opacity"
        >
          Already approved? Redeem your invite code →
        </button>
      </footer>
    </div>
  );
}
