/**
 * OnboardingFlow — Premium pre-login onboarding for Continuary.
 *
 * 5 screens:
 *   0. The Premise       — animated thread + "Your brain isn't broken."
 *   1. The Problem       — 3 scenes neurodivergent users deeply recognize
 *   2. The Solution      — what Continuary actually does (fixed dot layout)
 *   3. Thread View       — desire screen: a full week visualized
 *   4. The Ask           — work style picker + sign in CTA
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { getLoginUrl } from "@/const";

// ─── Canvas thread animation ──────────────────────────────────────────────────
function ThreadCanvas({ active, color = "oklch(0.55 0.14 270)" }: { active: boolean; color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    const nodes = [
      { x: W * 0.08, y: H * 0.75 },
      { x: W * 0.22, y: H * 0.45 },
      { x: W * 0.40, y: H * 0.60 },
      { x: W * 0.58, y: H * 0.30 },
      { x: W * 0.75, y: H * 0.50 },
      { x: W * 0.92, y: H * 0.25 },
    ];

    function getPoint(t: number) {
      const seg = nodes.length - 1;
      const s = Math.min(Math.floor(t * seg), seg - 1);
      const st = (t * seg) - s;
      const ease = st * st * (3 - 2 * st);
      return {
        x: nodes[s].x + (nodes[s + 1].x - nodes[s].x) * ease,
        y: nodes[s].y + (nodes[s + 1].y - nodes[s].y) * ease,
      };
    }

    let start: number | null = null;
    const DURATION = 2600;

    function draw(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / DURATION, 1);
      ctx.clearRect(0, 0, W, H);

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = 0.7;
      const steps = Math.floor(p * 120);
      if (steps > 0) {
        const first = getPoint(0);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i <= steps; i++) {
          const pt = getPoint(i / 120);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      nodes.forEach((node, i) => {
        const nodeT = i / (nodes.length - 1);
        if (nodeT > p) return;
        const alpha = Math.min((p - nodeT) * 8, 1);
        ctx.globalAlpha = alpha * 0.9;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowBlur = 12;
        ctx.fill();
      });

      if (p < 1) {
        const tip = getPoint(p);
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "oklch(0.85 0.18 80)";
        ctx.shadowColor = "oklch(0.85 0.18 80)";
        ctx.shadowBlur = 18;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      if (p < 1) animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [active, color]);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }} />
  );
}

// ─── Particle field ───────────────────────────────────────────────────────────
function ParticleField({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const W = canvas.width, H = canvas.height;

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      alpha: Math.random() * 0.4 + 0.05,
    }));

    function draw() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `oklch(0.65 0.12 270 / ${p.alpha})`;
        ctx.fill();
      });
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  return (
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none", opacity: 0.6 }} />
  );
}

// ─── Screen 0: The Premise ────────────────────────────────────────────────────
// A/B test: odd-minute visitors see variant B headline
const AB_VARIANT = typeof Date !== "undefined" && new Date().getMinutes() % 2 === 1 ? "B" : "A";
const PREMISE_HEADLINE = AB_VARIANT === "B"
  ? "You haven't found the right system yet."
  : "Your brain isn't broken.";
const PREMISE_SUB = AB_VARIANT === "B"
  ? "Most productivity tools weren't designed for how you actually think."
  : "It just needs a system that works with how you actually think.";
// Store variant so we can read it later for analytics
if (typeof localStorage !== "undefined") localStorage.setItem("onboarding_ab_variant", AB_VARIANT);

function ScreenPremise({ visible, onNext }: { visible: boolean; onNext: () => void }) {
  const [textIn, setTextIn] = useState(false);
  const [subIn, setSubIn] = useState(false);
  const [sub2In, setSub2In] = useState(false);
  const [btnIn, setBtnIn] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setTextIn(true), 600);
    const t2 = setTimeout(() => setSubIn(true), 1400);
    const t3 = setTimeout(() => setSub2In(true), 2100);
    const t4 = setTimeout(() => setBtnIn(true), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [visible]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
      <ParticleField active={visible} />
      <div className="relative w-full" style={{ height: 160 }}>
        <ThreadCanvas active={visible} />
      </div>

      <div style={{ opacity: textIn ? 1 : 0, transform: textIn ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.9s ease-out, transform 0.9s ease-out" }}>
        <h1 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "clamp(28px, 7vw, 38px)", fontWeight: 600, color: "oklch(0.96 0.005 270)", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
          {PREMISE_HEADLINE}
        </h1>
      </div>

      <div style={{ marginTop: 16, opacity: subIn ? 1 : 0, transform: subIn ? "translateY(0)" : "translateY(12px)", transition: "opacity 0.8s ease-out, transform 0.8s ease-out", maxWidth: 300 }}>
        <p style={{ fontSize: 17, color: "oklch(0.65 0.01 270)", lineHeight: 1.65, fontFamily: "Inter, sans-serif", fontWeight: 400 }}>
          {PREMISE_SUB}
        </p>
      </div>

      <div style={{ marginTop: 10, opacity: sub2In ? 1 : 0, transform: sub2In ? "translateY(0)" : "translateY(10px)", transition: "opacity 0.7s ease-out, transform 0.7s ease-out", maxWidth: 280 }}>
        <p style={{ fontSize: 14, color: "oklch(0.42 0.01 270)", lineHeight: 1.6, fontFamily: "Inter, sans-serif" }}>
          Not another to-do list. A thread that never drops.
        </p>
      </div>

      <div style={{ marginTop: 44, opacity: btnIn ? 1 : 0, transform: btnIn ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.6s ease-out, transform 0.6s ease-out" }}>
        <button
          onClick={onNext}
          style={{ padding: "14px 40px", borderRadius: 100, background: "oklch(0.96 0.005 270)", color: "oklch(0.09 0.01 270)", fontSize: 15, fontWeight: 600, fontFamily: "Inter, sans-serif", border: "none", cursor: "pointer", letterSpacing: "0.01em" }}
        >
          Show me →
        </button>
      </div>
    </div>
  );
}

// ─── Screen 1: The Problem ────────────────────────────────────────────────────
// Tap-anywhere to advance is handled by wrapping the screen in a clickable div
const PROBLEMS = [
  {
    icon: "◌",
    line: "You open a project you haven't touched in 3 days.",
    sub: "Your brain goes blank. You spend 20 minutes just trying to remember where you were.",
  },
  {
    icon: "◎",
    line: "You meant to finish it. You really did.",
    sub: "But something interrupted you, and the thread snapped. Now it feels like starting over.",
  },
  {
    icon: "○",
    line: "You have six projects. You're only really inside one.",
    sub: "The others are quietly going cold — and the guilt is louder than the work.",
  },
];

function ScreenProblem({ visible, onNext }: { visible: boolean; onNext: () => void }) {
  const [shown, setShown] = useState<number[]>([]);
  const [btnIn, setBtnIn] = useState(false);

  useEffect(() => {
    if (!visible) { setShown([]); setBtnIn(false); return; }
    const timers = PROBLEMS.map((_, i) =>
      setTimeout(() => setShown((s) => [...s, i]), 300 + i * 1000)
    );
    const t = setTimeout(() => setBtnIn(true), 300 + PROBLEMS.length * 1000 + 300);
    return () => { timers.forEach(clearTimeout); clearTimeout(t); };
  }, [visible]);

  return (
    <div className="absolute inset-0 flex flex-col justify-center px-8" style={{ paddingTop: 64 }} onClick={onNext}>
      <div style={{ marginBottom: 32, opacity: visible ? 1 : 0, transition: "opacity 0.6s ease-out", fontFamily: "Inter, sans-serif", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "oklch(0.50 0.12 30)" }}>
        If any of this sounds familiar →
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {PROBLEMS.map((p, i) => (
          <div
            key={i}
            style={{
              opacity: shown.includes(i) ? 1 : 0,
              transform: shown.includes(i) ? "translateX(0)" : "translateX(-20px)",
              transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            <div style={{ fontSize: 20, color: "oklch(0.55 0.14 270)", marginTop: 3, flexShrink: 0, width: 24, textAlign: "center" }}>
              {p.icon}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "oklch(0.90 0.005 270)", lineHeight: 1.4, fontFamily: "'Lora', Georgia, serif" }}>
                {p.line}
              </div>
              <div style={{ fontSize: 13, color: "oklch(0.50 0.01 270)", marginTop: 5, fontFamily: "Inter, sans-serif", lineHeight: 1.55 }}>
                {p.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 44, opacity: btnIn ? 1 : 0, transform: btnIn ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.6s ease-out, transform 0.6s ease-out" }}>
        <button
          onClick={onNext}
          style={{ width: "100%", padding: "14px 0", borderRadius: 100, background: "oklch(0.18 0.04 270)", border: "1px solid oklch(0.35 0.06 270 / 0.5)", color: "oklch(0.88 0.005 270)", fontSize: 15, fontWeight: 500, fontFamily: "Inter, sans-serif", cursor: "pointer" }}
        >
          There's a better way →
        </button>
      </div>
    </div>
  );
}

// ─── Screen 2: The Solution ───────────────────────────────────────────────────
const DEMO_ITEMS = [
  {
    label: "Morning anchor",
    detail: "30 seconds. One intention. Your brain knows where to go.",
    delay: 300,
    color: "oklch(0.62 0.14 270)",
  },
  {
    label: "Midday pulse",
    detail: "Still on track? Drifted? Continuary catches it before the day is gone.",
    delay: 1000,
    color: "oklch(0.72 0.15 150)",
  },
  {
    label: "Context saved",
    detail: "Every stopping point recorded. Re-entry is instant, not exhausting.",
    delay: 1700,
    color: "oklch(0.82 0.18 80)",
  },
  {
    label: "Evening close",
    detail: "You did more than you think. Now you'll remember it.",
    delay: 2400,
    color: "oklch(0.65 0.14 30)",
  },
];

function ScreenSolution({ visible, onNext }: { visible: boolean; onNext: () => void }) {
  const [shown, setShown] = useState<number[]>([]);
  const [btnIn, setBtnIn] = useState(false);
  const [headIn, setHeadIn] = useState(false);

  useEffect(() => {
    if (!visible) { setShown([]); setBtnIn(false); setHeadIn(false); return; }
    const t0 = setTimeout(() => setHeadIn(true), 200);
    const timers = DEMO_ITEMS.map((item, i) =>
      setTimeout(() => setShown((s) => [...s, i]), item.delay)
    );
    const t = setTimeout(() => setBtnIn(true), 3200);
    return () => { clearTimeout(t0); timers.forEach(clearTimeout); clearTimeout(t); };
  }, [visible]);

  return (
    <div className="absolute inset-0 flex flex-col justify-center px-8" style={{ paddingTop: 40 }}>
      <div style={{ opacity: headIn ? 1 : 0, transform: headIn ? "translateY(0)" : "translateY(12px)", transition: "opacity 0.7s ease-out, transform 0.7s ease-out", marginBottom: 32 }}>
        <h2 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 600, color: "oklch(0.96 0.005 270)", lineHeight: 1.3 }}>
          Continuary keeps<br />the thread.
        </h2>
        <p style={{ marginTop: 10, fontSize: 14, color: "oklch(0.52 0.01 270)", fontFamily: "Inter, sans-serif", lineHeight: 1.6 }}>
          Four lightweight touchpoints. Every project stays warm. You always know where you are.
        </p>
      </div>

      {/* Fixed timeline — dots are inline, not absolute */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {/* Vertical connector line */}
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 9, top: 14, bottom: 0, width: 1.5, background: "linear-gradient(to bottom, oklch(0.35 0.08 270), oklch(0.18 0.03 270 / 0))", zIndex: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {DEMO_ITEMS.map((item, i) => (
              <div
                key={i}
                style={{
                  opacity: shown.includes(i) ? 1 : 0,
                  transform: shown.includes(i) ? "translateX(0)" : "translateX(-12px)",
                  transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {/* Inline dot — no absolute positioning */}
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: item.color,
                  boxShadow: `0 0 10px 3px ${item.color}55`,
                  flexShrink: 0,
                  marginTop: 2,
                }} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "oklch(0.90 0.005 270)", fontFamily: "Inter, sans-serif", lineHeight: 1.3 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 13, color: "oklch(0.50 0.01 270)", marginTop: 3, fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>
                    {item.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 36, opacity: btnIn ? 1 : 0, transform: btnIn ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.6s ease-out, transform 0.6s ease-out" }}>
        <button
          onClick={onNext}
          style={{ width: "100%", padding: "14px 0", borderRadius: 100, background: "oklch(0.18 0.04 270)", border: "1px solid oklch(0.35 0.06 270 / 0.5)", color: "oklch(0.88 0.005 270)", fontSize: 15, fontWeight: 500, fontFamily: "Inter, sans-serif", cursor: "pointer" }}
        >
          See what a full week looks like →
        </button>
      </div>
    </div>
  );
}

// ─── Screen 3: Thread View (Desire) ──────────────────────────────────────────
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEK_DATA = [
  { morning: true,  midday: true,  evening: true,  strength: 95 },
  { morning: true,  midday: false, evening: true,  strength: 72 },
  { morning: true,  midday: true,  evening: true,  strength: 88 },
  { morning: false, midday: false, evening: false, strength: 0  },
  { morning: true,  midday: true,  evening: false, strength: 65 },
  { morning: true,  midday: false, evening: true,  strength: 80 },
  { morning: true,  midday: true,  evening: true,  strength: 92 },
];

function ScreenThreadView({ visible, onNext }: { visible: boolean; onNext: () => void }) {
  const [headIn, setHeadIn] = useState(false);
  const [gridIn, setGridIn] = useState(false);
  const [labelIn, setLabelIn] = useState(false);
  const [btnIn, setBtnIn] = useState(false);

  useEffect(() => {
    if (!visible) { setHeadIn(false); setGridIn(false); setLabelIn(false); setBtnIn(false); return; }
    const t1 = setTimeout(() => setHeadIn(true), 200);
    const t2 = setTimeout(() => setGridIn(true), 700);
    const t3 = setTimeout(() => setLabelIn(true), 1500);
    const t4 = setTimeout(() => setBtnIn(true), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [visible]);

  return (
    <div className="absolute inset-0 flex flex-col justify-center px-6" style={{ paddingTop: 40 }}>
      <div style={{ opacity: headIn ? 1 : 0, transform: headIn ? "translateY(0)" : "translateY(12px)", transition: "opacity 0.7s ease-out, transform 0.7s ease-out", marginBottom: 20, textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "oklch(0.50 0.12 30)", fontFamily: "Inter, sans-serif", marginBottom: 8 }}>
          This is what your week looks like
        </div>
        <h2 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "clamp(20px, 5vw, 26px)", fontWeight: 600, color: "oklch(0.96 0.005 270)", lineHeight: 1.3 }}>
          Every day. Every project.<br />Nothing dropped.
        </h2>
      </div>

      {/* Week grid */}
      <div style={{ opacity: gridIn ? 1 : 0, transform: gridIn ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.8s ease-out, transform 0.8s ease-out", background: "oklch(0.12 0.02 270)", borderRadius: 16, padding: "16px 12px", border: "1px solid oklch(0.22 0.04 270)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 10 }}>
          {WEEK_DAYS.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, color: "oklch(0.42 0.01 270)", fontFamily: "Inter, sans-serif", letterSpacing: "0.08em" }}>{d}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
          {WEEK_DATA.map((day, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
              {(["morning", "midday", "evening"] as const).map((t) => (
                <div key={t} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: day[t]
                    ? t === "morning" ? "oklch(0.62 0.14 270)"
                    : t === "midday" ? "oklch(0.72 0.15 150)"
                    : "oklch(0.65 0.14 30)"
                    : "oklch(0.22 0.02 270)",
                  boxShadow: day[t] ? `0 0 6px 2px ${t === "morning" ? "oklch(0.62 0.14 270 / 0.5)" : t === "midday" ? "oklch(0.72 0.15 150 / 0.4)" : "oklch(0.65 0.14 30 / 0.4)"}` : "none",
                }} />
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {WEEK_DATA.map((day, i) => (
            <div key={i} style={{ height: 32, borderRadius: 4, background: "oklch(0.16 0.03 270)", overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${day.strength}%`, background: day.strength > 80 ? "linear-gradient(to top, oklch(0.62 0.14 270), oklch(0.72 0.16 270))" : day.strength > 40 ? "linear-gradient(to top, oklch(0.45 0.10 270), oklch(0.55 0.12 270))" : "oklch(0.22 0.02 270)", borderRadius: 4, transition: "height 1s ease-out" }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, opacity: labelIn ? 1 : 0, transition: "opacity 0.6s ease-out", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "oklch(0.14 0.03 270 / 0.9)", border: "1px solid oklch(0.30 0.06 270 / 0.6)", borderRadius: 100, padding: "6px 14px" }}>
          <span style={{ fontSize: 12 }}>✦</span>
          <span style={{ fontSize: 11, color: "oklch(0.75 0.14 270)", fontFamily: "Inter, sans-serif", letterSpacing: "0.08em" }}>
            Yours builds from day one
          </span>
        </div>
      </div>

      <div style={{ marginTop: 20, opacity: btnIn ? 1 : 0, transform: btnIn ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.6s ease-out, transform 0.6s ease-out" }}>
        <p style={{ fontSize: 13, color: "oklch(0.45 0.01 270)", fontFamily: "Inter, sans-serif", marginBottom: 14, lineHeight: 1.5, textAlign: "center" }}>
          No streak pressure. No shame for off days.<br />Just your thread, always waiting.
        </p>
        <button
          onClick={onNext}
          style={{ width: "100%", padding: "14px 0", borderRadius: 100, background: "oklch(0.96 0.005 270)", color: "oklch(0.09 0.01 270)", fontSize: 15, fontWeight: 600, fontFamily: "Inter, sans-serif", border: "none", cursor: "pointer" }}
        >
          I want this →
        </button>
      </div>
    </div>
  );
}

// ─── Screen 4: The Ask ────────────────────────────────────────────────────────
const WORK_STYLES = [
  { key: "writing_creative",   label: "Writing & Creative",       emoji: "✍️" },
  { key: "business_product",   label: "Business & Product",       emoji: "📊" },
  { key: "ministry_coaching",  label: "Ministry & Coaching",      emoji: "🌿" },
  { key: "consulting_client",  label: "Consulting & Client Work", emoji: "🤝" },
  { key: "multiple",           label: "Multiple types",           emoji: "⚡" },
];

function ScreenAsk({ visible }: { visible: boolean }) {
  const [headIn, setHeadIn]   = useState(false);
  const [subIn, setSubIn]     = useState(false);
  const [pickerIn, setPickerIn] = useState(false);
  const [btnIn, setBtnIn]     = useState(false);
  const [freeIn, setFreeIn]   = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem("onboarding_work_style") : null
  );

  const handleStyleSelect = (key: string) => {
    setSelectedStyle(key);
    localStorage.setItem("onboarding_work_style", key);
  };

  useEffect(() => {
    if (!visible) { setHeadIn(false); setSubIn(false); setPickerIn(false); setBtnIn(false); setFreeIn(false); return; }
    const t1 = setTimeout(() => setHeadIn(true), 300);
    const t2 = setTimeout(() => setSubIn(true), 900);
    const t3 = setTimeout(() => setPickerIn(true), 1400);
    const t4 = setTimeout(() => setBtnIn(true), 1900);
    const t5 = setTimeout(() => setFreeIn(true), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [visible]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
      <ParticleField active={visible} />

      <div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, oklch(0.45 0.16 270 / 0.12) 0%, transparent 70%)", pointerEvents: "none", opacity: visible ? 1 : 0, transition: "opacity 1.5s ease-out 0.5s" }} />

      <div style={{ opacity: headIn ? 1 : 0, transform: headIn ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.9s ease-out, transform 0.9s ease-out", position: "relative" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "oklch(0.45 0.01 270)", fontFamily: "Inter, sans-serif", marginBottom: 14 }}>
          Continuary
        </div>
        <h1 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "clamp(26px, 6vw, 34px)", fontWeight: 600, color: "oklch(0.96 0.005 270)", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
          Your thread<br />starts here.
        </h1>
      </div>

      <div style={{ marginTop: 14, opacity: subIn ? 1 : 0, transform: subIn ? "translateY(0)" : "translateY(10px)", transition: "opacity 0.8s ease-out, transform 0.8s ease-out", maxWidth: 290, position: "relative" }}>
        <p style={{ fontSize: 15, color: "oklch(0.55 0.01 270)", lineHeight: 1.65, fontFamily: "Inter, sans-serif" }}>
          Built for minds that work in bursts, lose the thread, and need a system that doesn't judge — just holds.
        </p>
      </div>

      <div style={{ marginTop: 24, width: "100%", maxWidth: 320, opacity: pickerIn ? 1 : 0, transform: pickerIn ? "translateY(0)" : "translateY(10px)", transition: "opacity 0.7s ease-out, transform 0.7s ease-out", position: "relative" }}>
        <p style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "oklch(0.42 0.01 270)", fontFamily: "Inter, sans-serif", marginBottom: 10 }}>What kind of work do you do?</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {WORK_STYLES.map((ws) => (
            <button
              key={ws.key}
              onClick={() => handleStyleSelect(ws.key)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, border: selectedStyle === ws.key ? "1px solid oklch(0.65 0.14 270)" : "1px solid oklch(0.22 0.04 270)", background: selectedStyle === ws.key ? "oklch(0.18 0.06 270)" : "oklch(0.12 0.02 270)", cursor: "pointer", transition: "border-color 0.2s, background 0.2s", textAlign: "left", width: "100%" }}
            >
              <span style={{ fontSize: 16 }}>{ws.emoji}</span>
              <span style={{ fontSize: 13, color: selectedStyle === ws.key ? "oklch(0.88 0.06 270)" : "oklch(0.60 0.01 270)", fontFamily: "Inter, sans-serif", fontWeight: selectedStyle === ws.key ? 600 : 400, transition: "color 0.2s" }}>{ws.label}</span>
              {selectedStyle === ws.key && <span style={{ marginLeft: "auto", fontSize: 14, color: "oklch(0.65 0.14 270)" }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20, width: "100%", maxWidth: 320, opacity: btnIn ? 1 : 0, transform: btnIn ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.6s ease-out, transform 0.6s ease-out", position: "relative" }}>
        <a
          href={getLoginUrl()}
          style={{ display: "block", width: "100%", padding: "16px 0", borderRadius: 100, background: "oklch(0.96 0.005 270)", color: "oklch(0.09 0.01 270)", fontSize: 16, fontWeight: 700, fontFamily: "Inter, sans-serif", textDecoration: "none", textAlign: "center", letterSpacing: "0.01em", boxShadow: "0 4px 24px oklch(0.65 0.12 270 / 0.25)" }}
        >
          Begin your thread
        </a>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={() => navigator.share({ title: "Continuary", text: "Built for minds that work in bursts. Your brain isn't broken — it just needs the right system.", url: window.location.origin })}
            style={{ marginTop: 12, width: "100%", padding: "12px 0", borderRadius: 100, background: "transparent", border: "1px solid oklch(0.28 0.04 270)", color: "oklch(0.55 0.01 270)", fontSize: 14, fontFamily: "Inter, sans-serif", cursor: "pointer", letterSpacing: "0.02em" }}
          >
            ↗ Share with someone who needs this
          </button>
        )}
      </div>

      <div style={{ marginTop: 12, opacity: freeIn ? 1 : 0, transition: "opacity 0.6s ease-out", position: "relative" }}>
        <p style={{ fontSize: 12, color: "oklch(0.38 0.01 270)", fontFamily: "Inter, sans-serif", letterSpacing: "0.04em" }}>
          Free to start · No credit card required
        </p>
      </div>
    </div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ position: "absolute", bottom: 32, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8, zIndex: 10 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ width: i === current ? 20 : 6, height: 6, borderRadius: 100, background: i === current ? "oklch(0.75 0.12 270)" : "oklch(0.28 0.04 270)", transition: "width 0.4s ease-out, background 0.4s ease-out" }} />
      ))}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function OnboardingFlow({ onSkip }: { onSkip: () => void }) {
  const [screen, setScreen] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const TOTAL = 5;
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (dx > 50 && screen < 4) goNext();
    else if (dx < -50 && screen > 0 && !transitioning) {
      if (navigator.vibrate) navigator.vibrate(20);
      setTransitioning(true);
      setTimeout(() => { setScreen((s) => s - 1); setTransitioning(false); }, 200);
    }
  }, [screen, transitioning]);

  const goNext = useCallback(() => {
    if (transitioning) return;
    if (navigator.vibrate) navigator.vibrate(30);
    setTransitioning(true);
    setTimeout(() => {
      setScreen((s) => s + 1);
      setTransitioning(false);
    }, 200);
  }, [transitioning]);

  const screens = [
    <ScreenPremise    key={0} visible={screen === 0 && !transitioning} onNext={goNext} />,
    <ScreenProblem    key={1} visible={screen === 1 && !transitioning} onNext={goNext} />,
    <ScreenSolution   key={2} visible={screen === 2 && !transitioning} onNext={goNext} />,
    <ScreenThreadView key={3} visible={screen === 3 && !transitioning} onNext={goNext} />,
    <ScreenAsk        key={4} visible={screen === 4 && !transitioning} />,
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "oklch(0.09 0.01 270)", overflow: "hidden" }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {screen < 4 && (
        <button
          onClick={onSkip}
          style={{ position: "absolute", top: 20, right: 20, zIndex: 20, padding: "6px 14px", borderRadius: 100, background: "transparent", border: "1px solid oklch(0.28 0.04 270)", color: "oklch(0.45 0.01 270)", fontSize: 12, fontFamily: "Inter, sans-serif", cursor: "pointer", letterSpacing: "0.06em" }}
        >
          Skip
        </button>
      )}

      <div style={{ position: "absolute", inset: 0, maxWidth: 480, margin: "0 auto", opacity: transitioning ? 0 : 1, transition: "opacity 0.2s ease-out" }}>
        {screens[screen]}
      </div>

      <ProgressDots current={screen} total={TOTAL} />
    </div>
  );
}
