/**
 * OnboardingFlow — Premium pre-login onboarding experience for Continuary.
 *
 * 5 screens:
 *   0. The Premise       — animated thread tracing + "Your work has a shape."
 *   1. The Problem       — 3 micro-scenes the user recognizes
 *   2. The Solution      — brief animated demo of what Continuary does
 *   3. Thread View       — desire screen: glimpse of a full week (locked/blurred)
 *   4. The Ask           — sign in CTA, "Your thread starts here."
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { getLoginUrl } from "@/const";

// ─── Canvas thread animation ──────────────────────────────────────────────────
function ThreadCanvas({ active, color = "oklch(0.55 0.14 270)" }: { active: boolean; color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const progressRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    // Define thread path: a gentle S-curve with nodes
    const nodes = [
      { x: W * 0.12, y: H * 0.72 },
      { x: W * 0.28, y: H * 0.42 },
      { x: W * 0.45, y: H * 0.58 },
      { x: W * 0.62, y: H * 0.32 },
      { x: W * 0.78, y: H * 0.48 },
      { x: W * 0.90, y: H * 0.28 },
    ];

    // Build a smooth path via bezier
    function getPointOnPath(t: number): { x: number; y: number } {
      const totalSegments = nodes.length - 1;
      const segment = Math.min(Math.floor(t * totalSegments), totalSegments - 1);
      const segT = (t * totalSegments) - segment;
      const p0 = nodes[segment];
      const p1 = nodes[segment + 1];
      // Cubic ease
      const st = segT * segT * (3 - 2 * segT);
      return { x: p0.x + (p1.x - p0.x) * st, y: p0.y + (p1.y - p0.y) * st };
    }

    let start: number | null = null;
    const DURATION = 2400;

    function draw(ts: number) {
      if (!start) start = ts;
      const elapsed = ts - start;
      progressRef.current = Math.min(elapsed / DURATION, 1);
      const p = progressRef.current;

      ctx.clearRect(0, 0, W, H);

      // Draw completed thread
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = 0.7;

      const steps = Math.floor(p * 120);
      if (steps > 0) {
        const first = getPointOnPath(0);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i <= steps; i++) {
          const pt = getPointOnPath(i / 120);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      // Draw nodes that have been passed
      nodes.forEach((node, i) => {
        const nodeT = i / (nodes.length - 1);
        if (nodeT > p) return;
        const nodeAlpha = Math.min((p - nodeT) * 8, 1);
        ctx.globalAlpha = nodeAlpha * 0.9;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowBlur = 12;
        ctx.fill();
      });

      // Draw glowing tip
      if (p < 1) {
        const tip = getPointOnPath(p);
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

      if (p < 1) {
        animRef.current = requestAnimationFrame(draw);
      }
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [active, color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
}

// ─── Particle field (ambient background) ─────────────────────────────────────
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
    const W = canvas.width;
    const H = canvas.height;

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      alpha: Math.random() * 0.4 + 0.05,
    }));

    function draw() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
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
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none", opacity: 0.6 }}
    />
  );
}

// ─── Screen 0: The Premise ────────────────────────────────────────────────────
function ScreenPremise({ visible, onNext }: { visible: boolean; onNext: () => void }) {
  const [textIn, setTextIn] = useState(false);
  const [subIn, setSubIn] = useState(false);
  const [btnIn, setBtnIn] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setTextIn(true), 600);
    const t2 = setTimeout(() => setSubIn(true), 1400);
    const t3 = setTimeout(() => setBtnIn(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [visible]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
      <ParticleField active={visible} />
      <div className="relative w-full" style={{ height: 180 }}>
        <ThreadCanvas active={visible} />
      </div>

      <div
        style={{
          opacity: textIn ? 1 : 0,
          transform: textIn ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.9s ease-out, transform 0.9s ease-out",
        }}
      >
        <h1
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "clamp(26px, 6vw, 36px)",
            fontWeight: 600,
            color: "oklch(0.96 0.005 270)",
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
          }}
        >
          Your work has a shape.
        </h1>
      </div>

      <div
        style={{
          marginTop: 14,
          opacity: subIn ? 1 : 0,
          transform: subIn ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
          maxWidth: 300,
        }}
      >
        <p style={{
          fontSize: 16,
          color: "oklch(0.58 0.01 270)",
          lineHeight: 1.6,
          fontFamily: "Inter, sans-serif",
        }}>
          Most tools ignore it. Continuary keeps the thread.
        </p>
      </div>

      <div
        style={{
          marginTop: 40,
          opacity: btnIn ? 1 : 0,
          transform: btnIn ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
        }}
      >
        <button
          onClick={onNext}
          style={{
            padding: "14px 36px",
            borderRadius: 100,
            background: "oklch(0.96 0.005 270)",
            color: "oklch(0.09 0.01 270)",
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            border: "none",
            cursor: "pointer",
            letterSpacing: "0.01em",
          }}
        >
          Show me
        </button>
      </div>
    </div>
  );
}

// ─── Screen 1: The Problem ────────────────────────────────────────────────────
const PROBLEMS = [
  {
    icon: "◌",
    line: "You open a project you haven't touched in 4 days.",
    sub: "You don't know where you left off.",
  },
  {
    icon: "◎",
    line: "You finish a week and can't name what actually moved.",
    sub: "The effort was real. The record isn't.",
  },
  {
    icon: "○",
    line: "You have six active projects.",
    sub: "You're only really inside one.",
  },
];

function ScreenProblem({ visible, onNext }: { visible: boolean; onNext: () => void }) {
  const [shown, setShown] = useState<number[]>([]);
  const [btnIn, setBtnIn] = useState(false);

  useEffect(() => {
    if (!visible) { setShown([]); setBtnIn(false); return; }
    const timers = PROBLEMS.map((_, i) =>
      setTimeout(() => setShown((s) => [...s, i]), 400 + i * 900)
    );
    const t = setTimeout(() => setBtnIn(true), 400 + PROBLEMS.length * 900 + 200);
    return () => { timers.forEach(clearTimeout); clearTimeout(t); };
  }, [visible]);

  return (
    <div className="absolute inset-0 flex flex-col justify-center px-8" style={{ paddingTop: 60 }}>
      <div
        style={{
          marginBottom: 36,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.6s ease-out",
          fontFamily: "Inter, sans-serif",
          fontSize: 12,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "oklch(0.45 0.01 270)",
        }}
      >
        Sound familiar?
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
              gap: 18,
              alignItems: "flex-start",
            }}
          >
            <div style={{
              fontSize: 22,
              color: "oklch(0.5 0.12 270)",
              marginTop: 2,
              flexShrink: 0,
              width: 28,
              textAlign: "center",
            }}>
              {p.icon}
            </div>
            <div>
              <div style={{
                fontSize: 16,
                fontWeight: 500,
                color: "oklch(0.88 0.005 270)",
                lineHeight: 1.4,
                fontFamily: "'Lora', Georgia, serif",
              }}>
                {p.line}
              </div>
              <div style={{
                fontSize: 14,
                color: "oklch(0.50 0.01 270)",
                marginTop: 4,
                fontFamily: "Inter, sans-serif",
                lineHeight: 1.5,
              }}>
                {p.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 44,
        opacity: btnIn ? 1 : 0,
        transform: btnIn ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
      }}>
        <button
          onClick={onNext}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 100,
            background: "oklch(0.18 0.04 270)",
            border: "1px solid oklch(0.35 0.06 270 / 0.5)",
            color: "oklch(0.88 0.005 270)",
            fontSize: 15,
            fontWeight: 500,
            fontFamily: "Inter, sans-serif",
            cursor: "pointer",
            letterSpacing: "0.01em",
          }}
        >
          There's a better way →
        </button>
      </div>
    </div>
  );
}

// ─── Screen 2: The Solution ───────────────────────────────────────────────────
const DEMO_ITEMS = [
  { label: "Morning check-in", detail: "Set direction before the day sets itself.", delay: 300, color: "oklch(0.62 0.14 270)" },
  { label: "Project touched", detail: "Clarity Engine — 3 min session", delay: 900, color: "oklch(0.72 0.15 150)" },
  { label: "Thread updated", detail: "Context saved. Re-entry ready.", delay: 1500, color: "oklch(0.82 0.18 80)" },
  { label: "Evening close", detail: "Day captured. Thread intact.", delay: 2100, color: "oklch(0.62 0.14 270)" },
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
    const t = setTimeout(() => setBtnIn(true), 2700);
    return () => { clearTimeout(t0); timers.forEach(clearTimeout); clearTimeout(t); };
  }, [visible]);

  return (
    <div className="absolute inset-0 flex flex-col justify-center px-8" style={{ paddingTop: 40 }}>
      <div style={{
        opacity: headIn ? 1 : 0,
        transform: headIn ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
        marginBottom: 32,
      }}>
        <h2 style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: "clamp(22px, 5vw, 28px)",
          fontWeight: 600,
          color: "oklch(0.96 0.005 270)",
          lineHeight: 1.3,
        }}>
          Continuary keeps<br />the thread.
        </h2>
        <p style={{
          marginTop: 10,
          fontSize: 14,
          color: "oklch(0.52 0.01 270)",
          fontFamily: "Inter, sans-serif",
          lineHeight: 1.6,
        }}>
          Three check-ins a day. Every project stays warm. You always know where you are.
        </p>
      </div>

      {/* Animated timeline */}
      <div style={{ position: "relative", paddingLeft: 24 }}>
        {/* Vertical line */}
        <div style={{
          position: "absolute",
          left: 7,
          top: 8,
          bottom: 8,
          width: 1.5,
          background: "linear-gradient(to bottom, oklch(0.35 0.08 270), oklch(0.25 0.04 270 / 0))",
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {DEMO_ITEMS.map((item, i) => (
            <div
              key={i}
              style={{
                opacity: shown.includes(i) ? 1 : 0,
                transform: shown.includes(i) ? "translateX(0)" : "translateX(-12px)",
                transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
              }}
            >
              {/* Node dot */}
              <div style={{
                position: "absolute",
                left: 2,
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: item.color,
                boxShadow: `0 0 10px 3px ${item.color}`,
                marginTop: 4,
                flexShrink: 0,
              }} />
              <div style={{ paddingLeft: 4 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "oklch(0.88 0.005 270)",
                  fontFamily: "Inter, sans-serif",
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: 12,
                  color: "oklch(0.50 0.01 270)",
                  marginTop: 2,
                  fontFamily: "Inter, sans-serif",
                }}>
                  {item.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: 40,
        opacity: btnIn ? 1 : 0,
        transform: btnIn ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
      }}>
        <button
          onClick={onNext}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 100,
            background: "oklch(0.18 0.04 270)",
            border: "1px solid oklch(0.35 0.06 270 / 0.5)",
            color: "oklch(0.88 0.005 270)",
            fontSize: 15,
            fontWeight: 500,
            fontFamily: "Inter, sans-serif",
            cursor: "pointer",
          }}
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
  { morning: true, midday: true, evening: true, project: "Clarity Engine", strength: 95 },
  { morning: true, midday: false, evening: true, project: "Client Proposal", strength: 72 },
  { morning: true, midday: true, evening: true, project: "Clarity Engine", strength: 88 },
  { morning: false, midday: false, evening: false, project: null, strength: 0 },
  { morning: true, midday: true, evening: false, project: "Weekly Compass", strength: 65 },
  { morning: true, midday: false, evening: true, project: "Deep Work", strength: 80 },
  { morning: true, midday: true, evening: true, project: "Reflection", strength: 92 },
];

function ScreenThreadView({ visible, onNext }: { visible: boolean; onNext: () => void }) {
  const [headIn, setHeadIn] = useState(false);
  const [gridIn, setGridIn] = useState(false);
  const [lockIn, setLockIn] = useState(false);
  const [btnIn, setBtnIn] = useState(false);

  useEffect(() => {
    if (!visible) { setHeadIn(false); setGridIn(false); setLockIn(false); setBtnIn(false); return; }
    const t1 = setTimeout(() => setHeadIn(true), 200);
    const t2 = setTimeout(() => setGridIn(true), 700);
    const t3 = setTimeout(() => setLockIn(true), 1400);
    const t4 = setTimeout(() => setBtnIn(true), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [visible]);

  return (
    <div className="absolute inset-0 flex flex-col justify-center px-6" style={{ paddingTop: 40 }}>
      <div style={{
        opacity: headIn ? 1 : 0,
        transform: headIn ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
        marginBottom: 24,
        textAlign: "center",
      }}>
        <div style={{
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "oklch(0.45 0.01 270)",
          fontFamily: "Inter, sans-serif",
          marginBottom: 8,
        }}>
          This is what continuity looks like
        </div>
        <h2 style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: "clamp(20px, 5vw, 26px)",
          fontWeight: 600,
          color: "oklch(0.96 0.005 270)",
          lineHeight: 1.3,
        }}>
          Your thread, visualized.
        </h2>
      </div>

      {/* Week grid */}
      <div style={{
        opacity: gridIn ? 1 : 0,
        transform: gridIn ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
        background: "oklch(0.12 0.02 270)",
        borderRadius: 16,
        padding: "16px 12px",
        border: "1px solid oklch(0.22 0.04 270)",
        position: "relative",
        overflow: "hidden",
      }}>


        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 10 }}>
          {WEEK_DAYS.map((d) => (
            <div key={d} style={{
              textAlign: "center",
              fontSize: 10,
              color: "oklch(0.42 0.01 270)",
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.08em",
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Check-in dots row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
          {WEEK_DATA.map((day, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
              {["morning", "midday", "evening"].map((t) => (
                <div key={t} style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: (day as any)[t]
                    ? t === "morning" ? "oklch(0.62 0.14 270)"
                    : t === "midday" ? "oklch(0.72 0.15 150)"
                    : "oklch(0.55 0.12 30)"
                    : "oklch(0.22 0.02 270)",
                  boxShadow: (day as any)[t] ? `0 0 6px 2px ${t === "morning" ? "oklch(0.62 0.14 270 / 0.5)" : t === "midday" ? "oklch(0.72 0.15 150 / 0.4)" : "oklch(0.55 0.12 30 / 0.4)"}` : "none",
                }} />
              ))}
            </div>
          ))}
        </div>

        {/* Strength bars */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {WEEK_DATA.map((day, i) => (
            <div key={i} style={{
              height: 32,
              borderRadius: 4,
              background: "oklch(0.16 0.03 270)",
              overflow: "hidden",
              position: "relative",
            }}>
              <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: `${day.strength}%`,
                background: day.strength > 80
                  ? "linear-gradient(to top, oklch(0.62 0.14 270), oklch(0.72 0.16 270))"
                  : day.strength > 40
                  ? "linear-gradient(to top, oklch(0.45 0.10 270), oklch(0.55 0.12 270))"
                  : "oklch(0.22 0.02 270)",
                borderRadius: 4,
                transition: "height 1s ease-out",
              }} />
            </div>
          ))}
        </div>

        {/* Unlock label */}
        <div style={{
          position: "absolute",
          bottom: 10,
          left: 0,
          right: 0,
          zIndex: 3,
          textAlign: "center",
          opacity: lockIn ? 1 : 0,
          transition: "opacity 0.6s ease-out 0.2s",
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "oklch(0.14 0.03 270 / 0.9)",
            border: "1px solid oklch(0.30 0.06 270 / 0.6)",
            borderRadius: 100,
            padding: "6px 14px",
            backdropFilter: "blur(8px)",
          }}>
            <span style={{ fontSize: 12 }}>✦</span>
            <span style={{
              fontSize: 11,
              color: "oklch(0.75 0.14 270)",
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.08em",
            }}>
              Yours builds from day one
            </span>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 20,
        opacity: btnIn ? 1 : 0,
        transform: btnIn ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
        textAlign: "center",
      }}>
        <p style={{
          fontSize: 13,
          color: "oklch(0.48 0.01 270)",
          fontFamily: "Inter, sans-serif",
          marginBottom: 16,
          lineHeight: 1.5,
        }}>
          Every check-in builds the record.<br />Every project stays warm.
        </p>
        <button
          onClick={onNext}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 100,
            background: "oklch(0.96 0.005 270)",
            color: "oklch(0.09 0.01 270)",
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
            border: "none",
            cursor: "pointer",
          }}
        >
          I want this →
        </button>
      </div>
    </div>
  );
}

const WORK_STYLES = [
  { key: "writing_creative", label: "Writing & Creative", emoji: "✍️" },
  { key: "business_product", label: "Business & Product", emoji: "📊" },
  { key: "ministry_coaching", label: "Ministry & Coaching", emoji: "🌿" },
  { key: "consulting_client", label: "Consulting & Client Work", emoji: "🤝" },
  { key: "multiple", label: "Multiple types", emoji: "⚡" },
];

// ─── Screen 4: The Ask ────────────────────────────────────────────────────────
function ScreenAsk({ visible }: { visible: boolean }) {
  const [headIn, setHeadIn] = useState(false);
  const [subIn, setSubIn] = useState(false);
  const [pickerIn, setPickerIn] = useState(false);
  const [btnIn, setBtnIn] = useState(false);
  const [freeIn, setFreeIn] = useState(false);
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
    const t3 = setTimeout(() => setPickerIn(true), 1300);
    const t4 = setTimeout(() => setBtnIn(true), 1800);
    const t5 = setTimeout(() => setFreeIn(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [visible]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
      <ParticleField active={visible} />

      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        width: 280,
        height: 280,
        borderRadius: "50%",
        background: "radial-gradient(circle, oklch(0.45 0.16 270 / 0.12) 0%, transparent 70%)",
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 1.5s ease-out 0.5s",
      }} />

      <div style={{
        opacity: headIn ? 1 : 0,
        transform: headIn ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.9s ease-out, transform 0.9s ease-out",
        position: "relative",
      }}>
        <div style={{
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "oklch(0.45 0.01 270)",
          fontFamily: "Inter, sans-serif",
          marginBottom: 16,
        }}>
          Continuary
        </div>
        <h1 style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: "clamp(28px, 7vw, 38px)",
          fontWeight: 600,
          color: "oklch(0.96 0.005 270)",
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
        }}>
          Your thread<br />starts here.
        </h1>
      </div>

      <div style={{
        marginTop: 16,
        opacity: subIn ? 1 : 0,
        transform: subIn ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
        maxWidth: 280,
        position: "relative",
      }}>
        <p style={{
          fontSize: 15,
          color: "oklch(0.55 0.01 270)",
          lineHeight: 1.6,
          fontFamily: "Inter, sans-serif",
        }}>
          Keep your momentum. Know where you are. Never lose the thread again.
        </p>
      </div>

      {/* Work style picker */}
      <div style={{
        marginTop: 28,
        width: "100%",
        maxWidth: 320,
        opacity: pickerIn ? 1 : 0,
        transform: pickerIn ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
        position: "relative",
      }}>
        <p style={{
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "oklch(0.42 0.01 270)",
          fontFamily: "Inter, sans-serif",
          marginBottom: 10,
        }}>What kind of work do you do?</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {WORK_STYLES.map((ws) => (
            <button
              key={ws.key}
              onClick={() => handleStyleSelect(ws.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 12,
                border: selectedStyle === ws.key
                  ? "1px solid oklch(0.65 0.14 270)"
                  : "1px solid oklch(0.22 0.04 270)",
                background: selectedStyle === ws.key
                  ? "oklch(0.18 0.06 270)"
                  : "oklch(0.12 0.02 270)",
                cursor: "pointer",
                transition: "border-color 0.2s, background 0.2s",
                textAlign: "left",
                width: "100%",
              }}
            >
              <span style={{ fontSize: 16 }}>{ws.emoji}</span>
              <span style={{
                fontSize: 13,
                color: selectedStyle === ws.key ? "oklch(0.88 0.06 270)" : "oklch(0.60 0.01 270)",
                fontFamily: "Inter, sans-serif",
                fontWeight: selectedStyle === ws.key ? 600 : 400,
                transition: "color 0.2s",
              }}>{ws.label}</span>
              {selectedStyle === ws.key && (
                <span style={{ marginLeft: "auto", fontSize: 14, color: "oklch(0.65 0.14 270)" }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: 20,
        width: "100%",
        maxWidth: 320,
        opacity: btnIn ? 1 : 0,
        transform: btnIn ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
        position: "relative",
      }}>
        <a
          href={getLoginUrl()}
          style={{
            display: "block",
            width: "100%",
            padding: "16px 0",
            borderRadius: 100,
            background: "oklch(0.96 0.005 270)",
            color: "oklch(0.09 0.01 270)",
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "Inter, sans-serif",
            textDecoration: "none",
            textAlign: "center",
            letterSpacing: "0.01em",
            boxShadow: "0 4px 24px oklch(0.65 0.12 270 / 0.25)",
          }}
        >
          Begin your thread
        </a>
      </div>

      <div style={{
        marginTop: 14,
        opacity: freeIn ? 1 : 0,
        transition: "opacity 0.6s ease-out",
        position: "relative",
      }}>
        <p style={{
          fontSize: 12,
          color: "oklch(0.38 0.01 270)",
          fontFamily: "Inter, sans-serif",
          letterSpacing: "0.04em",
        }}>
          Free to start · No credit card required
        </p>
      </div>
    </div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{
      position: "absolute",
      bottom: 32,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      gap: 8,
      zIndex: 10,
    }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 6,
          height: 6,
          borderRadius: 100,
          background: i === current ? "oklch(0.75 0.12 270)" : "oklch(0.28 0.04 270)",
          transition: "width 0.4s ease-out, background 0.4s ease-out",
        }} />
      ))}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function OnboardingFlow({ onSkip }: { onSkip: () => void }) {
  const [screen, setScreen] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const TOTAL = 5;

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
    <ScreenPremise key={0} visible={screen === 0 && !transitioning} onNext={goNext} />,
    <ScreenProblem key={1} visible={screen === 1 && !transitioning} onNext={goNext} />,
    <ScreenSolution key={2} visible={screen === 2 && !transitioning} onNext={goNext} />,
    <ScreenThreadView key={3} visible={screen === 3 && !transitioning} onNext={goNext} />,
    <ScreenAsk key={4} visible={screen === 4 && !transitioning} />,
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "oklch(0.09 0.01 270)",
        overflow: "hidden",
      }}
    >
      {/* Skip button (screens 0-3 only) */}
      {screen < 4 && (
        <button
          onClick={onSkip}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            zIndex: 20,
            padding: "6px 14px",
            borderRadius: 100,
            background: "transparent",
            border: "1px solid oklch(0.28 0.04 270)",
            color: "oklch(0.45 0.01 270)",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
            cursor: "pointer",
            letterSpacing: "0.06em",
          }}
        >
          Skip
        </button>
      )}

      {/* Screen container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          maxWidth: 480,
          margin: "0 auto",
          opacity: transitioning ? 0 : 1,
          transition: "opacity 0.2s ease-out",
        }}
      >
        {screens[screen]}
      </div>

      <ProgressDots current={screen} total={TOTAL} />
    </div>
  );
}
