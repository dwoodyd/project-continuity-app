import { useState, useEffect } from "react";
import { Link } from "wouter";
import WrenPlayer, { type WrenClip } from "@/components/WrenPlayer";

type Step = "intro" | "problem" | "thread" | "morning" | "evening" | "vault" | "graph" | "strength" | "invite";

const STEPS: Step[] = ["intro","problem","thread","morning","evening","vault","graph","strength","invite"];

const STEP_META: Record<Step, { label: string; wren: WrenClip }> = {
  intro:    { label: "Welcome",         wren: "luminousFloats"  },
  problem:  { label: "The Problem",     wren: "closesEyes"      },
  thread:   { label: "Your Thread",     wren: "carryingThread"  },
  morning:  { label: "Morning",         wren: "popsHead"        },
  evening:  { label: "Evening",         wren: "kissingScreen"   },
  vault:    { label: "The Vault",       wren: "perchedDoc"      },
  graph:    { label: "Knowledge Graph", wren: "holdingOrb"      },
  strength: { label: "Thread Strength", wren: "bouncingFunClean"},
  invite:   { label: "Request Access",  wren: "hoveringArchway" },
};

const MORNING_DEMO =
  `Good morning. You've named three things worth protecting today — that's already more intentional than most days begin.\n\nYour primary focus is clear. The secondary work can wait until after lunch. One task is enough to call this day a success.\n\nThe thread continues.`;

const EVENING_DEMO =
  `You showed up. That matters more than the list.\n\nTwo of three tasks completed is not a failure — it's data. The third one tells you something about your energy pattern on days like this.\n\nTomorrow, Wren will carry that thread forward. Rest now.`;

// ─── Knowledge Graph Demo ────────────────────────────────────────────────────
const GRAPH_NODES = [
  { id: "n1", x: 50,  y: 30,  label: "Investor update draft",       tag: "Writing",   primary: true },
  { id: "n2", x: 20,  y: 60,  label: "McKinsey context-switching",   tag: "Research",  primary: false },
  { id: "n3", x: 80,  y: 60,  label: "Cut third service offering",   tag: "Decision",  primary: false },
  { id: "n4", x: 35,  y: 80,  label: "Focus block — Tue morning",    tag: "Session",   primary: false },
  { id: "n5", x: 65,  y: 80,  label: "Positioning note — Feb 2024",  tag: "Idea",      primary: false },
  { id: "n6", x: 50,  y: 55,  label: "Chapter 2 opening scene",      tag: "Writing",   primary: false },
];
const GRAPH_EDGES = [
  { from: "n1", to: "n2", suggested: false },
  { from: "n1", to: "n3", suggested: false },
  { from: "n1", to: "n6", suggested: true  },
  { from: "n2", to: "n4", suggested: false },
  { from: "n3", to: "n5", suggested: true  },
  { from: "n4", to: "n6", suggested: false },
];
const TAG_COLOURS: Record<string, string> = {
  Writing:  "#f59e0b",
  Research: "#60a5fa",
  Decision: "#a78bfa",
  Session:  "#34d399",
  Idea:     "#f87171",
};

function KnowledgeGraphDemo() {
  const [active, setActive] = useState<string | null>(null);
  const [confirmedEdges, setConfirmedEdges] = useState<Set<string>>(new Set());
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());
  const [visibleEdges, setVisibleEdges] = useState<Set<number>>(new Set());

  useEffect(() => {
    const nodeTimers = GRAPH_NODES.map((n, i) =>
      setTimeout(() => setVisibleNodes(prev => new Set([...Array.from(prev), n.id])), i * 120)
    );
    const edgeTimers = GRAPH_EDGES.map((_, i) =>
      setTimeout(() => setVisibleEdges(prev => new Set([...Array.from(prev), i])), GRAPH_NODES.length * 120 + i * 100)
    );
    return () => { [...nodeTimers, ...edgeTimers].forEach(clearTimeout); };
  }, []);

  const edgeKey = (i: number) => `e${i}`;
  const activeEdges = active
    ? GRAPH_EDGES.map((e, i) => ({ ...e, i })).filter(e => e.from === active || e.to === active)
    : GRAPH_EDGES.map((e, i) => ({ ...e, i }));
  const connectedIds = active ? new Set(activeEdges.flatMap(e => [e.from, e.to])) : null;

  const handleConfirm = (i: number) => {
    setConfirmedEdges(prev => new Set([...Array.from(prev), edgeKey(i)]));
  };

  const suggestedEdgesWithActive = active
    ? GRAPH_EDGES.map((e, idx) => ({ ...e, i: idx })).filter(e => e.suggested && !confirmedEdges.has(edgeKey(e.i)) && (e.from === active || e.to === active))
    : [];

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden" style={{ paddingBottom: "56%", background: "oklch(0.12 0.02 240 / 0.6)", border: "1px solid oklch(0.78 0.18 65 / 0.12)" }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          {GRAPH_EDGES.map((e, i) => {
            const from = GRAPH_NODES.find(n => n.id === e.from)!;
            const to   = GRAPH_NODES.find(n => n.id === e.to)!;
            const isVisible = visibleEdges.has(i);
            const isConfirmed = confirmedEdges.has(edgeKey(i));
            const highlighted = active ? (e.from === active || e.to === active) : true;
            const isSuggested = e.suggested && !isConfirmed;
            return (
              <line key={i}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={isConfirmed ? "#34d399" : isSuggested ? "#f59e0b" : "#ffffff"}
                strokeOpacity={isVisible ? (highlighted ? (isSuggested ? 0.55 : isConfirmed ? 0.7 : 0.18) : 0.04) : 0}
                strokeWidth={isSuggested ? 0.4 : isConfirmed ? 0.5 : 0.25}
                strokeDasharray={isSuggested ? "1 0.8" : undefined}
                style={{ transition: "stroke-opacity 0.4s ease, stroke 0.3s ease" }}
              />
            );
          })}
          {GRAPH_NODES.map((n, ni) => {
            const colour = TAG_COLOURS[n.tag] ?? "#ffffff";
            const isActive = active === n.id;
            const faded = connectedIds ? !connectedIds.has(n.id) : false;
            const isVisible = visibleNodes.has(n.id);
            return (
              <g key={n.id} style={{ cursor: "pointer" }} onClick={() => setActive(isActive ? null : n.id)}>
                <circle
                  cx={n.x} cy={n.y}
                  r={n.primary ? 3.5 : 2.5}
                  fill={colour}
                  fillOpacity={isVisible ? (faded ? 0.1 : isActive ? 1 : 0.7) : 0}
                  stroke={isActive ? "#ffffff" : colour}
                  strokeWidth={isActive ? 0.6 : 0}
                  style={{ transition: `fill-opacity 0.35s ease ${ni * 0.12}s` }}
                />
                {(isActive || n.primary) && isVisible && (
                  <text x={n.x} y={n.y - 4} textAnchor="middle" fontSize="3"
                    fill="#ffffff" fillOpacity={faded ? 0.2 : 0.85}
                    style={{ pointerEvents: "none", userSelect: "none" }}>
                    {n.label.length > 22 ? n.label.slice(0, 22) + "…" : n.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-3 left-4 flex flex-wrap gap-3">
          {Object.entries(TAG_COLOURS).map(([tag, col]) => (
            <span key={tag} className="flex items-center gap-1 text-[10px] text-white/40">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: col, opacity: 0.7 }} />
              {tag}
            </span>
          ))}
        </div>
        {active && (
          <div className="absolute top-3 left-4 right-4 bg-black/70 backdrop-blur rounded-lg px-3 py-2 text-xs text-white/70">
            <span className="font-medium text-white/90">{GRAPH_NODES.find(n => n.id === active)?.label}</span>
            {" "}— {activeEdges.length} {activeEdges.length === 1 ? "connection" : "connections"}
          </div>
        )}
      </div>
      {suggestedEdgesWithActive.length > 0 && (
        <div className="space-y-2">
          {suggestedEdgesWithActive.map(e => {
            const fromNode = GRAPH_NODES.find(n => n.id === e.from)!;
            const toNode   = GRAPH_NODES.find(n => n.id === e.to)!;
            return (
              <div key={e.i} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: "oklch(0.78 0.18 65 / 0.06)", border: "1px solid oklch(0.78 0.18 65 / 0.2)" }}>
                <div className="text-xs text-white/70 leading-snug flex-1">
                  <span className="font-medium" style={{ color: "oklch(0.85 0.15 65)" }}>Suggested link</span>
                  {" — "}
                  <span className="text-white/50">{fromNode.label}</span>
                  {" ↔ "}
                  <span className="text-white/50">{toNode.label}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleConfirm(e.i)}
                    className="text-[11px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg px-3 py-1 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmedEdges(prev => { const s = new Set(Array.from(prev)); s.add(`reject-${e.i}`); return s; })}
                    className="text-[11px] bg-white/5 hover:bg-white/10 text-white/40 border border-white/10 rounded-lg px-3 py-1 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!active && (
        <p className="text-center text-xs" style={{ color: "oklch(0.65 0.08 65)" }}>Tap a node to explore its connections</p>
      )}
    </div>
  );
}

export default function TourPage() {
  const [step, setStep] = useState<Step>("intro");
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [morning, setMorning] = useState({ focus: "", tasks: "", energy: "" });
  const [evening, setEvening] = useState({ wins: "", incomplete: "", tomorrow: "" });

  const idx = STEPS.indexOf(step);
  const progress = ((idx + 1) / STEPS.length) * 100;
  const next = () => { const n = STEPS[idx + 1]; if (n) setStep(n); };
  const prev = () => { const p = STEPS[idx - 1]; if (p) setStep(p); };

  return (
    <div className="min-h-screen text-white font-sans overflow-x-hidden" style={{ background: "oklch(0.09 0.015 240)" }}>
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur" style={{ background: "oklch(0.09 0.015 240 / 0.92)", borderBottom: "1px solid oklch(0.78 0.18 65 / 0.08)" }}>
        <div className="flex items-center gap-2.5">
          <WrenPlayer clip="popsHead" size="xs" />
          <span className="font-brand text-lg tracking-tight" style={{ color: "oklch(0.92 0.06 65)" }}>Continuary</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/landing" className="text-sm transition-colors" style={{ color: "oklch(0.65 0.06 65)" }}>← Back</Link>
          <Link href="/apply" className="text-sm px-4 py-1.5 rounded-full font-medium transition-colors" style={{ background: "oklch(0.78 0.18 65 / 0.15)", color: "oklch(0.85 0.15 65)", border: "1px solid oklch(0.78 0.18 65 / 0.3)" }}>
            Apply for access
          </Link>
        </div>
      </nav>

      {/* Progress bar */}
      <div className="fixed top-[57px] inset-x-0 z-40 h-0.5" style={{ background: "oklch(0.78 0.18 65 / 0.08)" }}>
        <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: "oklch(0.78 0.18 65 / 0.7)" }} />
      </div>

      {/* Step dots */}
      <div className="fixed top-[65px] inset-x-0 z-40 flex justify-center gap-2 py-2">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(s)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === idx ? 20 : 6,
              height: 6,
              background: i === idx ? "oklch(0.78 0.18 65)" : i < idx ? "oklch(0.78 0.18 65 / 0.4)" : "oklch(0.78 0.18 65 / 0.15)",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <main className="pt-28 pb-24 px-4 max-w-3xl mx-auto">

        {step === "intro" && (
          <Fade>
            <div className="flex flex-col items-center text-center gap-8">
              <WrenPlayer clip="luminousFloats" size="xl" feather featherDirection="radial" />
              <div className="space-y-4">
                <p className="text-xs tracking-widest uppercase" style={{ color: "oklch(0.78 0.18 65 / 0.7)" }}>Welcome to Continuary</p>
                <h1 className="text-4xl md:text-5xl leading-tight font-brand">
                  Your thread<br /><em className="font-brand-italic" style={{ color: "oklch(0.78 0.18 65)" }}>continues here.</em>
                </h1>
                <p className="text-lg max-w-xl mx-auto leading-relaxed" style={{ color: "oklch(0.75 0.04 240)" }}>
                  A personal operating system for people who do deep, meaningful work — and who know how hard it is to pick that work back up after life interrupts.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: "oklch(0.55 0.04 240)" }}>
                <span>Meet Wren</span><span>·</span><span>Your continuity companion</span>
              </div>
              <Btn onClick={next} label="Begin the tour" />
            </div>
          </Fade>
        )}

        {step === "problem" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="Sound Familiar" title="The patterns that keep breaking your flow." wren="closesEyes" />
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { icon: "⏸", title: "The Restart Tax", body: "You open a project and spend 20 minutes just remembering where you left off." },
                  { icon: "⚡", title: "The Burst Penalty", body: "You work in focused sprints — but every system was built for linear thinkers." },
                  { icon: "🗂", title: "The Open Tab Spiral", body: "12 tabs. 3 half-finished docs. Zero clarity on what matters right now." },
                  { icon: "📉", title: "The Lost Week", body: "You start strong on Monday. By Thursday, the thread is gone." },
                ].map(c => (
                  <div key={c.title} className="rounded-xl p-5 space-y-2" style={{ background: "oklch(0.12 0.02 240 / 0.6)", border: "1px solid oklch(0.78 0.18 65 / 0.08)" }}>
                    <div className="text-2xl">{c.icon}</div>
                    <h3 className="font-semibold" style={{ color: "oklch(0.92 0.06 65)" }}>{c.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "oklch(0.65 0.04 240)" }}>{c.body}</p>
                  </div>
                ))}
              </div>
              <Nav onPrev={prev} onNext={next} nextLabel="See the solution" />
            </div>
          </Fade>
        )}

        {step === "thread" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="The Thread" title="Continuity isn't a habit. It's a practice of returning." wren="carryingThread" />
              <p className="leading-relaxed text-lg" style={{ color: "oklch(0.72 0.04 240)" }}>
                Continuary doesn't ask you to be consistent. It asks you to <em className="not-italic font-medium" style={{ color: "oklch(0.85 0.15 65)" }}>return</em>. Every time you come back — even after days away — the thread picks up exactly where you left it.
              </p>
              <div className="space-y-3">
                {[
                  { label: "Morning check-in", desc: "Set your intention, protect your focus, and prime the day." },
                  { label: "Midday pulse", desc: "Two-minute alignment check. On plan?" },
                  { label: "Evening close", desc: "Close the loop. Acknowledge what moved." },
                  { label: "Weekly Compass", desc: "One clear direction for the week." },
                  { label: "The Vault", desc: "A living knowledge base that grows with every thought you capture." },
                  { label: "Thread Strength", desc: "A real-time measure of your continuity — not productivity, continuity." },
                  { label: "Re-entry support", desc: "When you've been away, Wren meets you where you are and walks you back in." },
                ].map(f => (
                  <div key={f.label} className="flex items-start gap-3 py-3" style={{ borderBottom: "1px solid oklch(0.78 0.18 65 / 0.08)" }}>
                    <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "oklch(0.78 0.18 65)" }} />
                    <div>
                      <span className="font-medium" style={{ color: "oklch(0.92 0.06 65)" }}>{f.label}</span>
                      <span className="text-sm" style={{ color: "oklch(0.55 0.04 240)" }}> — {f.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Nav onPrev={prev} onNext={next} nextLabel="Try a morning check-in" />
            </div>
          </Fade>
        )}

        {step === "morning" && (
          <Fade>
            <div className="space-y-6">
              <Header eyebrow="Morning Check-In" title="What does today need to protect?" wren="popsHead" />
              {!morningDone ? (
                <>
                  <p className="text-sm" style={{ color: "oklch(0.55 0.04 240)" }}>This is a simulation — fill in anything to experience the flow.</p>
                  <div className="space-y-4">
                    <Field label="What is your primary focus today?" placeholder="e.g. Finish the first draft of chapter 3" value={morning.focus} onChange={v => setMorning(p => ({ ...p, focus: v }))} />
                    <Field label="What are your three critical tasks?" placeholder="e.g. Write 1,000 words · Review client proposal · 30-min walk" value={morning.tasks} onChange={v => setMorning(p => ({ ...p, tasks: v }))} multiline />
                    <div className="space-y-2">
                      <label className="text-sm" style={{ color: "oklch(0.65 0.04 240)" }}>Energy level this morning</label>
                      <div className="flex gap-2">
                        {["Low","Moderate","High"].map(e => (
                          <button key={e} onClick={() => setMorning(p => ({ ...p, energy: e }))}
                            className="px-4 py-2 rounded-lg text-sm transition-all"
                            style={morning.energy === e
                              ? { background: "oklch(0.78 0.18 65 / 0.2)", border: "1px solid oklch(0.78 0.18 65 / 0.6)", color: "oklch(0.85 0.15 65)" }
                              : { background: "transparent", border: "1px solid oklch(0.78 0.18 65 / 0.12)", color: "oklch(0.55 0.04 240)" }}>
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setMorningDone(true)} disabled={!morning.focus}
                    className="w-full py-3 rounded-xl font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: "oklch(0.78 0.18 65)", color: "oklch(0.15 0.02 240)" }}>
                    Submit morning check-in
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl p-6 space-y-3" style={{ background: "oklch(0.78 0.18 65 / 0.05)", border: "1px solid oklch(0.78 0.18 65 / 0.2)" }}>
                    <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.78 0.18 65 / 0.7)" }}>
                      <WrenPlayer clip="closesEyes" size="xs" />
                      <span>Wren responds</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-line" style={{ color: "oklch(0.85 0.04 240)" }}>{MORNING_DEMO}</p>
                  </div>
                  <p className="text-sm text-center" style={{ color: "oklch(0.45 0.04 240)" }}>Your actual response is personalised to your projects, history, and energy.</p>
                </div>
              )}
              <Nav onPrev={prev} onNext={next} nextLabel="Try the evening check-in" />
            </div>
          </Fade>
        )}

        {step === "evening" && (
          <Fade>
            <div className="space-y-6">
              <Header eyebrow="Evening Check-In" title="Close the loop before you rest." wren="kissingScreen" />
              {!eveningDone ? (
                <>
                  <p className="text-sm" style={{ color: "oklch(0.55 0.04 240)" }}>Simulate closing your day.</p>
                  <div className="space-y-4">
                    <Field label="What moved today?" placeholder="e.g. Finished the draft. Had a good conversation with a client." value={evening.wins} onChange={v => setEvening(p => ({ ...p, wins: v }))} multiline />
                    <Field label="What didn't happen, and why?" placeholder="e.g. Skipped the walk — ran out of time after the afternoon call." value={evening.incomplete} onChange={v => setEvening(p => ({ ...p, incomplete: v }))} multiline />
                    <Field label="What goes first tomorrow?" placeholder="e.g. The client proposal — it's due by noon." value={evening.tomorrow} onChange={v => setEvening(p => ({ ...p, tomorrow: v }))} />
                  </div>
                  <button onClick={() => setEveningDone(true)} disabled={!evening.wins}
                    className="w-full py-3 rounded-xl font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: "oklch(0.78 0.18 65)", color: "oklch(0.15 0.02 240)" }}>
                    Close the day
                  </button>
                </>
              ) : (
                <div className="rounded-xl p-6 space-y-3" style={{ background: "oklch(0.78 0.18 65 / 0.05)", border: "1px solid oklch(0.78 0.18 65 / 0.2)" }}>
                  <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.78 0.18 65 / 0.7)" }}>
                    <WrenPlayer clip="closesEyes" size="xs" />
                    <span>Wren responds</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-line" style={{ color: "oklch(0.85 0.04 240)" }}>{EVENING_DEMO}</p>
                </div>
              )}
              <Nav onPrev={prev} onNext={next} nextLabel="See the Vault" />
            </div>
          </Fade>
        )}

        {step === "vault" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="The Vault" title="Every thought you've ever had about your work, in one place." wren="perchedDoc" />
              <p className="leading-relaxed text-lg" style={{ color: "oklch(0.72 0.04 240)" }}>
                The Vault is your knowledge base — not a note-taking app, but a living intelligence layer that connects your ideas, drafts, research, and decisions to your active projects.
              </p>
              <div className="space-y-3">
                {[
                  { type: "Idea",     preview: "What if the second chapter opened with the scene from 2019 instead of the prologue?",          tag: "Writing"   },
                  { type: "Research", preview: "Knowledge workers lose 28% of their week to context-switching. (McKinsey)",                     tag: "Reference" },
                  { type: "Decision", preview: "Decided to cut the third service offering and focus entirely on the core product.",             tag: "Strategy"  },
                  { type: "Draft",    preview: "Opening paragraph for the investor update — needs tightening before Thursday.",                 tag: "Writing"   },
                ].map(item => (
                  <div key={item.preview} className="flex items-start gap-3 rounded-xl p-4" style={{ background: "oklch(0.12 0.02 240 / 0.6)", border: "1px solid oklch(0.78 0.18 65 / 0.08)" }}>
                    <span className="text-xs rounded-full mt-0.5 shrink-0 px-2 py-0.5" style={{ background: "oklch(0.78 0.18 65 / 0.12)", color: "oklch(0.65 0.08 65)" }}>{item.type}</span>
                    <p className="text-sm leading-relaxed flex-1" style={{ color: "oklch(0.75 0.04 240)" }}>{item.preview}</p>
                    <span className="text-xs shrink-0" style={{ color: "oklch(0.78 0.18 65 / 0.5)" }}>{item.tag}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm" style={{ color: "oklch(0.45 0.04 240)" }}>Items are automatically tagged, linked to projects, and surfaced when they're relevant.</p>
              <Nav onPrev={prev} onNext={next} nextLabel="See the Knowledge Graph" />
            </div>
          </Fade>
        )}

        {step === "graph" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="Knowledge Graph" title="Your ideas don't exist in isolation. Neither should your notes." wren="holdingOrb" />
              <p className="leading-relaxed text-lg" style={{ color: "oklch(0.72 0.04 240)" }}>
                As your Vault grows, Continuary maps the connections between your entries — surfacing hidden links between ideas, decisions, and research you captured months apart.
              </p>
              <KnowledgeGraphDemo />
              <p className="text-sm" style={{ color: "oklch(0.45 0.04 240)" }}>
                Tap any node to see its connections. Suggested links appear automatically — you confirm, reject, or explore them.
              </p>
              <Nav onPrev={prev} onNext={next} nextLabel="See Thread Strength" />
            </div>
          </Fade>
        )}

        {step === "strength" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="Thread Strength" title="A living measure of your continuity." wren="bouncingFunClean" />
              <p className="leading-relaxed text-lg" style={{ color: "oklch(0.72 0.04 240)" }}>
                Thread Strength doesn't measure how much you did. It measures how consistently you've stayed connected to your work — and how well you've returned after gaps.
              </p>
              <div className="space-y-4">
                <div className="rounded-2xl p-6 space-y-4" style={{ background: "oklch(0.12 0.02 240 / 0.6)", border: "1px solid oklch(0.78 0.18 65 / 0.12)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "oklch(0.65 0.04 240)" }}>Your Thread Strength</span>
                    <span className="font-bold text-2xl" style={{ color: "oklch(0.78 0.18 65)" }}>74</span>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ background: "oklch(0.78 0.18 65 / 0.12)" }}>
                    <div className="h-2 rounded-full" style={{ width: "74%", background: "linear-gradient(to right, oklch(0.65 0.18 65), oklch(0.85 0.18 65))" }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "oklch(0.78 0.18 65 / 0.8)" }}>Weaving — strong momentum, consistent returns</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Gathering", range: "0–25",   desc: "Just starting or returning after a long gap" },
                    { label: "Weaving",   range: "26–75",  desc: "Building rhythm, consistent check-ins" },
                    { label: "Holding",   range: "76–100", desc: "Deep continuity, strong thread" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 space-y-1" style={{ background: "oklch(0.12 0.02 240 / 0.6)", border: "1px solid oklch(0.78 0.18 65 / 0.08)" }}>
                      <p className="text-sm font-medium" style={{ color: "oklch(0.88 0.06 65)" }}>{s.label}</p>
                      <p className="text-xs" style={{ color: "oklch(0.78 0.18 65 / 0.6)" }}>{s.range}</p>
                      <p className="text-xs leading-snug" style={{ color: "oklch(0.45 0.04 240)" }}>{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <Nav onPrev={prev} onNext={next} nextLabel="Request access" />
            </div>
          </Fade>
        )}

        {step === "invite" && (
          <Fade>
            <div className="flex flex-col items-center text-center gap-8">
              <WrenPlayer clip="hoveringArchway" size="xl" feather featherDirection="bottom" />
              <div className="space-y-3">
                <p className="text-xs tracking-widest uppercase" style={{ color: "oklch(0.78 0.18 65 / 0.7)" }}>Invite Only</p>
                <h2 className="text-3xl md:text-4xl font-brand leading-tight">
                  Ready to <em className="font-brand-italic" style={{ color: "oklch(0.78 0.18 65)" }}>begin?</em>
                </h2>
                <p className="max-w-md mx-auto leading-relaxed" style={{ color: "oklch(0.65 0.04 240)" }}>
                  Continuary is currently invite-only. Apply for founding member access and we'll review your application personally.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link href="/apply"
                  className="px-8 py-3 rounded-xl font-semibold transition-colors"
                  style={{ background: "oklch(0.78 0.18 65)", color: "oklch(0.12 0.02 240)" }}>
                  Apply for access →
                </Link>
                <Link href="/landing"
                  className="px-6 py-3 rounded-xl text-sm transition-colors"
                  style={{ background: "oklch(0.78 0.18 65 / 0.08)", color: "oklch(0.65 0.08 65)", border: "1px solid oklch(0.78 0.18 65 / 0.2)" }}>
                  Back to home
                </Link>
              </div>
              <button onClick={prev} className="text-sm transition-colors" style={{ color: "oklch(0.45 0.04 240)" }}>← Back to Thread Strength</button>
            </div>
          </Fade>
        )}
      </main>

      {step !== "invite" && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center pointer-events-none">
          <div className="text-xs" style={{ color: "oklch(0.45 0.04 240)" }}>{idx + 1} / {STEPS.length} — {STEP_META[step].label}</div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Fade({ children }: { children: React.ReactNode }) {
  return <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">{children}</div>;
}

function Header({ eyebrow, title, wren }: { eyebrow: string; title: string; wren: WrenClip }) {
  return (
    <div className="flex items-start gap-5">
      <WrenPlayer clip={wren} size="sm" />
      <div className="space-y-1">
        <p className="text-xs tracking-widest uppercase" style={{ color: "oklch(0.78 0.18 65 / 0.7)" }}>{eyebrow}</p>
        <h2 className="text-2xl md:text-3xl font-brand leading-snug" style={{ color: "oklch(0.92 0.06 65)" }}>{title}</h2>
      </div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange, multiline = false, type = "text" }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; multiline?: boolean; type?: string;
}) {
  const base: React.CSSProperties = {
    width: "100%",
    background: "oklch(0.12 0.02 240 / 0.6)",
    border: "1px solid oklch(0.78 0.18 65 / 0.12)",
    borderRadius: "0.75rem",
    padding: "0.75rem 1rem",
    color: "oklch(0.85 0.04 240)",
    fontSize: "0.875rem",
    outline: "none",
    resize: "none" as const,
  };
  return (
    <div className="space-y-1.5">
      <label className="text-sm" style={{ color: "oklch(0.65 0.04 240)" }}>{label}</label>
      {multiline
        ? <textarea style={{ ...base, minHeight: 80 }} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
        : <input type={type} style={base} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />}
    </div>
  );
}

function Btn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="px-8 py-3 rounded-xl font-semibold transition-colors"
      style={{ background: "oklch(0.78 0.18 65)", color: "oklch(0.12 0.02 240)" }}>
      {label} →
    </button>
  );
}

function Nav({ onPrev, onNext, nextLabel = "Continue" }: { onPrev: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <div className="flex items-center justify-between pt-2">
      <button onClick={onPrev} className="text-sm transition-colors" style={{ color: "oklch(0.45 0.04 240)" }}>← Back</button>
      <button onClick={onNext} className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
        style={{ background: "oklch(0.78 0.18 65)", color: "oklch(0.12 0.02 240)" }}>
        {nextLabel} →
      </button>
    </div>
  );
}
