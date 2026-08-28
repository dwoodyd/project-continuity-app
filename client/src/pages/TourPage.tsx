import { useState, useEffect } from "react";
import { Link } from "wouter";
import WrenPlayer, { type WrenClip } from "@/components/WrenPlayer";
import { PageMeta } from "@/components/PageMeta";

type Step =
  | "intro"
  | "problem"
  | "thread"
  | "morning"
  | "evening"
  | "vault"
  | "graph"
  | "strength"
  | "evidence"
  | "threshold"
  | "reentry"
  | "focus_sessions"
  | "single_focus"
  | "invite";

const STEPS: Step[] = [
  "intro","problem","thread","morning","evening",
  "vault","graph","strength","evidence","threshold",
  "reentry","focus_sessions","single_focus","invite",
];

const STEP_META: Record<Step, { label: string; wren: WrenClip }> = {
  intro:          { label: "Welcome",             wren: "luminousFloats"   },
  problem:        { label: "The Problem",         wren: "closesEyes"       },
  thread:         { label: "Your Thread",         wren: "carryingThread"   },
  morning:        { label: "Morning",             wren: "popsHead"         },
  evening:        { label: "Evening",             wren: "kissingScreen"    },
  vault:          { label: "Knowledge Vault",     wren: "perchedDoc"       },
  graph:          { label: "Knowledge Graph",     wren: "holdingOrb"       },
  strength:       { label: "Thread Strength",     wren: "bouncingFunClean" },
  evidence:       { label: "Evidence Log",        wren: "perchedDoc"       },
  threshold:      { label: "Threshold Diagnosis", wren: "closesEyes"       },
  reentry:        { label: "Re-Entry",            wren: "carryingThread"   },
  focus_sessions: { label: "Focus Sessions",      wren: "homeVideo"        },
  single_focus:   { label: "Single Focus Mode",   wren: "perchedDoc"       },
  invite:         { label: "Begin",               wren: "hoveringArchway"  },
};

const MORNING_DEMO =
  `Good morning. You've named three things worth protecting today — that's already more intentional than most days begin.\n\nYour primary focus is clear. The secondary work can wait until after lunch. One task is enough to call this day a success.\n\nThe thread continues.`;

const EVENING_DEMO =
  `You showed up. That matters more than the list.\n\nTwo of three tasks completed is not a failure — it's data. The third one tells you something about your energy pattern on days like this.\n\nTomorrow, Wren will carry that thread forward. Rest now.`;

// ─── Knowledge Graph Demo ────────────────────────────────────────────────────
const GRAPH_NODES = [
  { id: "n1", x: 50,  y: 30,  label: "Investor update draft",       tag: "Writing",   primary: true },
  { id: "n2", x: 20,  y: 60,  label: "Research: context-switching", tag: "Research",  primary: false },
  { id: "n3", x: 80,  y: 60,  label: "Cut third service offering",  tag: "Decision",  primary: false },
  { id: "n4", x: 35,  y: 80,  label: "Focus block — Tue morning",   tag: "Session",   primary: false },
  { id: "n5", x: 65,  y: 80,  label: "Positioning note — Feb 2024", tag: "Idea",      primary: false },
  { id: "n6", x: 50,  y: 55,  label: "Chapter 2 opening scene",     tag: "Writing",   primary: false },
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
      <div className="relative rounded-2xl overflow-hidden" style={{ paddingBottom: "56%", background: "oklch(0.12 0.02 240 / 0.6)", border: "1px solid oklch(0.74 0.14 72 / 0.12)" }}>
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
              <div key={e.i} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: "oklch(0.74 0.14 72 / 0.06)", border: "1px solid oklch(0.74 0.14 72 / 0.2)" }}>
                <div className="text-xs text-white/70 leading-snug flex-1">
                  <span className="font-medium" style={{ color: "oklch(0.74 0.14 72)" }}>Suggested link</span>
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
        <p className="text-center text-xs" style={{ color: "oklch(0.60 0.08 72)" }}>Tap a node to explore its connections</p>
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
  const next = () => { const n = STEPS[idx + 1]; if (n) setStep(n); };
  const prev = () => { const p = STEPS[idx - 1]; if (p) setStep(p); };

  return (
    <>
      <PageMeta
        title="Take the Tour"
        description="See how Continuary works — daily check-ins, Focus Sessions with Wren, Single Focus Mode, Knowledge Vault, and the thread that holds it all together."
        path="/tour"
      />
    <div className="min-h-screen text-white font-sans overflow-x-hidden" style={{ background: "oklch(0.09 0.015 240)" }}>
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4 backdrop-blur" style={{ background: "oklch(0.09 0.015 240 / 0.98)", borderBottom: "1px solid oklch(0.74 0.14 72 / 0.08)" }}>
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <WrenPlayer clip="evidenceClean" size="xs" wrapperClassName="hidden sm:block" />
          <span className="truncate font-brand text-base tracking-tight sm:text-lg" style={{ color: "oklch(0.74 0.14 72)" }}>Continuary</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <Link href="/landing" className="text-xs transition-colors sm:text-sm" style={{ color: "oklch(0.65 0.06 65)" }}>← Back</Link>
          <Link href="/apply" className="rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm" style={{ background: "oklch(0.74 0.14 72 / 0.15)", color: "oklch(0.74 0.14 72)", border: "1px solid oklch(0.74 0.14 72 / 0.3)" }}>
            <span className="sm:hidden">Apply</span><span className="hidden sm:inline">Apply for access</span>
          </Link>
        </div>
      </nav>

      {/* Progress bar */}
      <div className="fixed top-[53px] inset-x-0 z-40 h-0.5 sm:top-[57px]" style={{ background: "oklch(0.74 0.14 72 / 0.08)" }}>
        <div className="h-full transition-all duration-500" style={{ width: `${((idx + 1) / STEPS.length) * 100}%`, background: "oklch(0.74 0.14 72 / 0.7)" }} />
      </div>

      {/* Step dots */}
      <div className="fixed top-[61px] inset-x-0 z-40 flex justify-center gap-2 py-2 sm:top-[65px]">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(s)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === idx ? 20 : 6,
              height: 6,
              background: i === idx ? "oklch(0.74 0.14 72)" : i < idx ? "oklch(0.74 0.14 72 / 0.4)" : "oklch(0.74 0.14 72 / 0.15)",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 pt-28 pb-36">

        {/* ── 1. Welcome ── */}
        {step === "intro" && (
          <Fade>
            <div className="flex flex-col items-center text-center gap-8">
              <WrenPlayer clip="luminousFloats" size="xl" stage={false} feather featherDirection="radial" />
              <div className="space-y-4">
                <p className="text-xs tracking-widest uppercase" style={{ color: "oklch(0.74 0.14 72 / 0.7)" }}>Welcome to Continuary</p>
                <h1 className="text-4xl md:text-5xl leading-tight font-brand">
                  Your thread<br /><em className="font-brand font-semibold" style={{ color: "oklch(0.74 0.14 72)" }}>continues here.</em>
                </h1>
                <p className="text-lg max-w-xl mx-auto leading-relaxed" style={{ color: "oklch(0.75 0.04 240)" }}>
                  A personal operating system for people who do deep, meaningful work — and who know how hard it is to pick that work back up after life interrupts.
                </p>
              </div>
              {/* Wren voice doctrine */}
              <div className="rounded-2xl px-8 py-6 max-w-md w-full text-left space-y-1" style={{ background: "oklch(0.74 0.14 72 / 0.05)", border: "1px solid oklch(0.74 0.14 72 / 0.15)" }}>
                <p className="text-xs tracking-widest uppercase mb-3" style={{ color: "oklch(0.74 0.14 72 / 0.6)" }}>Meet Wren · Your continuity companion</p>
                <p className="text-sm italic leading-relaxed" style={{ color: "oklch(0.75 0.04 240)" }}>
                  Wren notices, doesn't judge.<br />
                  She remembers, doesn't measure.<br />
                  She returns, doesn't rebuke.<br />
                  And when you're ready to work, she's there —<br />
                  <span style={{ color: "oklch(0.74 0.14 72)" }}>reading, writing, weaving — while you do.</span>
                </p>
              </div>
              <Btn onClick={next} label="Begin the tour" />
            </div>
          </Fade>
        )}

        {/* ── 2. The Problem ── */}
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
                  <div key={c.title} className="rounded-xl p-5 space-y-2" style={{ background: "oklch(0.12 0.02 240 / 0.6)", border: "1px solid oklch(0.74 0.14 72 / 0.08)" }}>
                    <div className="text-2xl">{c.icon}</div>
                    <h3 className="font-semibold" style={{ color: "oklch(0.74 0.14 72)" }}>{c.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "oklch(0.65 0.04 240)" }}>{c.body}</p>
                  </div>
                ))}
              </div>
              <Nav onPrev={prev} onNext={next} nextLabel="See the solution" />
            </div>
          </Fade>
        )}

        {/* ── 3. Your Thread ── */}
        {step === "thread" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="The Thread" title="Continuity isn't a habit. It's a practice of returning." wren="carryingThread" />
              <p className="leading-relaxed text-lg" style={{ color: "oklch(0.72 0.04 240)" }}>
                Continuary doesn't ask you to be consistent. It asks you to <em className="not-italic font-medium" style={{ color: "oklch(0.74 0.14 72)" }}>return</em>. Every time you come back — even after days away — the thread picks up exactly where you left it.
              </p>
              <div className="space-y-3">
                {[
                  { label: "Morning check-in",      desc: "Set your intention, protect your focus, and prime the day." },
                  { label: "Midday pulse",           desc: "Two-minute alignment check. On plan?" },
                  { label: "Evening close",          desc: "Close the loop. Acknowledge what moved." },
                  { label: "Weekly Compass",         desc: "One clear direction for the week." },
                  { label: "Knowledge Vault",        desc: "A living knowledge base that grows with every thought you capture." },
                  { label: "Focus Sessions",         desc: "Work side-by-side with Wren for 25, 50, or 90 minutes." },
                  { label: "Single Focus Mode",      desc: "One topic. One thread. Wren holds the continuity language every day." },
                  { label: "Thread Strength",        desc: "A qualitative read on how connected you've been to your work." },
                  { label: "Re-entry support",       desc: "When you've been away, Wren meets you where you are and walks you back in." },
                ].map(f => (
                  <div key={f.label} className="flex items-start gap-3 py-3" style={{ borderBottom: "1px solid oklch(0.74 0.14 72 / 0.08)" }}>
                    <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "oklch(0.74 0.14 72)" }} />
                    <div>
                      <span className="font-medium" style={{ color: "oklch(0.74 0.14 72)" }}>{f.label}</span>
                      <span className="text-sm" style={{ color: "oklch(0.55 0.04 240)" }}> — {f.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Nav onPrev={prev} onNext={next} nextLabel="Try a morning check-in" />
            </div>
          </Fade>
        )}

        {/* ── 4. Morning ── */}
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
                              ? { background: "oklch(0.74 0.14 72 / 0.2)", border: "1px solid oklch(0.74 0.14 72 / 0.6)", color: "oklch(0.74 0.14 72)" }
                              : { background: "transparent", border: "1px solid oklch(0.74 0.14 72 / 0.12)", color: "oklch(0.55 0.04 240)" }}>
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setMorningDone(true)} disabled={!morning.focus}
                    className="w-full py-3 rounded-xl font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: "oklch(0.74 0.14 72)", color: "oklch(0.15 0.02 240)" }}>
                    Submit morning check-in
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl p-6 space-y-3" style={{ background: "oklch(0.74 0.14 72 / 0.05)", border: "1px solid oklch(0.74 0.14 72 / 0.2)" }}>
                    <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.74 0.14 72 / 0.7)" }}>
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

        {/* ── 5. Evening ── */}
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
                    style={{ background: "oklch(0.74 0.14 72)", color: "oklch(0.15 0.02 240)" }}>
                    Close the day
                  </button>
                </>
              ) : (
                <div className="rounded-xl p-6 space-y-3" style={{ background: "oklch(0.74 0.14 72 / 0.05)", border: "1px solid oklch(0.74 0.14 72 / 0.2)" }}>
                  <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.74 0.14 72 / 0.7)" }}>
                    <WrenPlayer clip="closesEyes" size="xs" />
                    <span>Wren responds</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-line" style={{ color: "oklch(0.85 0.04 240)" }}>{EVENING_DEMO}</p>
                </div>
              )}
              <Nav onPrev={prev} onNext={next} nextLabel="See the Knowledge Vault" />
            </div>
          </Fade>
        )}

        {/* ── 6. Knowledge Vault ── */}
        {step === "vault" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="Knowledge Vault" title="Every thought you've ever had about your work, in one place." wren="perchedDoc" />
              <p className="leading-relaxed text-lg" style={{ color: "oklch(0.72 0.04 240)" }}>
                The Knowledge Vault is your intelligence layer — not a note-taking app, but a living base that connects your ideas, drafts, research, and decisions to your active projects.
              </p>
              <div className="space-y-3">
                {[
                  { type: "Idea",     preview: "What if the second chapter opened with the scene from 2019 instead of the prologue?",          tag: "Writing"   },
                  { type: "Research", preview: "Our team's deep-work blocks are happening before 10am 4× more often than after lunch.",                  tag: "Reference" },
                  { type: "Decision", preview: "Decided to cut the third service offering and focus entirely on the core product.",             tag: "Strategy"  },
                  { type: "Draft",    preview: "Opening paragraph for the investor update — needs tightening before Thursday.",                 tag: "Writing"   },
                ].map(item => (
                  <div key={item.preview} className="flex items-start gap-3 rounded-xl p-4" style={{ background: "oklch(0.12 0.02 240 / 0.6)", border: "1px solid oklch(0.74 0.14 72 / 0.08)" }}>
                    <span className="text-xs rounded-full mt-0.5 shrink-0 px-2 py-0.5" style={{ background: "oklch(0.74 0.14 72 / 0.12)", color: "oklch(0.60 0.08 72)" }}>{item.type}</span>
                    <p className="text-sm leading-relaxed flex-1" style={{ color: "oklch(0.75 0.04 240)" }}>{item.preview}</p>
                    <span className="text-xs shrink-0" style={{ color: "oklch(0.74 0.14 72 / 0.5)" }}>{item.tag}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm" style={{ color: "oklch(0.45 0.04 240)" }}>Items are automatically tagged, linked to projects, and surfaced when they're relevant.</p>
              <Nav onPrev={prev} onNext={next} nextLabel="See the Knowledge Graph" />
            </div>
          </Fade>
        )}

        {/* ── 7. Knowledge Graph ── */}
        {step === "graph" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="Knowledge Graph" title="Your ideas don't exist in isolation. Neither should your notes." wren="holdingOrb" />
              <p className="leading-relaxed text-lg" style={{ color: "oklch(0.72 0.04 240)" }}>
                As your Knowledge Vault grows, Continuary maps the connections between your entries — surfacing hidden links between ideas, decisions, and research you captured months apart.
              </p>
              <KnowledgeGraphDemo />
              <p className="text-sm" style={{ color: "oklch(0.45 0.04 240)" }}>
                Tap any node to see its connections. Suggested links appear automatically — you confirm, reject, or explore them.
              </p>
              <Nav onPrev={prev} onNext={next} nextLabel="See Thread Strength" />
            </div>
          </Fade>
        )}

        {/* ── 8. Thread Strength ── */}
        {step === "strength" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="Thread Strength" title="Not a score. A read." wren="bouncingFunClean" />
              <p className="leading-relaxed text-lg" style={{ color: "oklch(0.72 0.04 240)" }}>
                Thread Strength doesn't measure how much you did. It's a qualitative read on how connected you've stayed to your work — and how well you've returned after gaps.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "oklch(0.55 0.04 240)" }}>
                Wren remembers, doesn't measure. There are no points, no streaks, no percentages. Just three honest states — and Wren's read on where you are.
              </p>
              <div className="space-y-3">
                {[
                  {
                    label: "Gathering",
                    desc: "Just starting, or returning after a long gap. The thread is thin but present. Wren meets you here without comment.",
                    accent: "oklch(0.65 0.12 65 / 0.8)",
                    bg: "oklch(0.65 0.12 65 / 0.06)",
                    border: "oklch(0.65 0.12 65 / 0.15)",
                  },
                  {
                    label: "Weaving",
                    desc: "Building rhythm. You're showing up, the check-ins are landing, and the thread is getting stronger with each return.",
                    accent: "oklch(0.74 0.14 72 / 0.9)",
                    bg: "oklch(0.74 0.14 72 / 0.06)",
                    border: "oklch(0.74 0.14 72 / 0.2)",
                  },
                  {
                    label: "Holding",
                    desc: "Deep continuity. The thread is strong. You know where you left off. Wren carries it forward without you having to ask.",
                    accent: "oklch(0.74 0.14 72)",
                    bg: "oklch(0.88 0.14 65 / 0.06)",
                    border: "oklch(0.88 0.14 65 / 0.2)",
                  },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-5 space-y-2" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <p className="font-semibold text-base" style={{ color: s.accent }}>{s.label}</p>
                    <p className="text-sm leading-relaxed" style={{ color: "oklch(0.65 0.04 240)" }}>{s.desc}</p>
                  </div>
                ))}
              </div>
              <Nav onPrev={prev} onNext={next} nextLabel="See the Evidence Log" />
            </div>
          </Fade>
        )}

        {/* ── 9. Evidence Log ── */}
        {step === "evidence" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="Evidence Log" title="Proof that you showed up." wren="perchedDoc" />
              <p className="leading-relaxed text-lg" style={{ color: "oklch(0.72 0.04 240)" }}>
                Every check-in, every session, every note you capture — Wren logs it as evidence. Not metrics. Evidence. The difference matters.
              </p>
              <div className="rounded-2xl p-6 space-y-4" style={{ background: "oklch(0.12 0.02 240 / 0.6)", border: "1px solid oklch(0.74 0.14 72 / 0.12)" }}>
                <p className="text-sm font-semibold" style={{ color: "oklch(0.74 0.14 72)" }}>What gets logged</p>
                <div className="space-y-3">
                  {[
                    { icon: "🌅", label: "Morning check-ins",    desc: "Your intention, energy, and what you named as worth protecting." },
                    { icon: "🌙", label: "Evening closes",        desc: "What moved, what didn't, and what goes first tomorrow." },
                    { icon: "🧵", label: "Focus Sessions",        desc: "Your intention, duration, what moved, and Wren's suggested next step." },
                    { icon: "💡", label: "Knowledge Vault saves", desc: "Every idea, draft, decision, and research note you capture." },
                    { icon: "📍", label: "Re-entry moments",      desc: "Every time you came back after a gap — logged as a return, not a failure." },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3">
                      <span className="text-lg shrink-0">{item.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-white/90">{item.label}</p>
                        <p className="text-xs text-white/50 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl px-5 py-4" style={{ background: "oklch(0.74 0.14 72 / 0.05)", border: "1px solid oklch(0.74 0.14 72 / 0.15)" }}>
                <p className="text-sm italic leading-relaxed" style={{ color: "oklch(0.72 0.04 240)" }}>
                  "On the days you feel like you did nothing — the Evidence Log is the thing that shows you otherwise. You showed up. It's here."
                </p>
                <p className="text-xs mt-2" style={{ color: "oklch(0.55 0.08 65)" }}>— Wren</p>
              </div>
              <Nav onPrev={prev} onNext={next} nextLabel="See Threshold Diagnosis" />
            </div>
          </Fade>
        )}

        {/* ── 10. Threshold Diagnosis ── */}
        {step === "threshold" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="Threshold Diagnosis" title="Wren knows the difference between tired and stuck." wren="closesEyes" />
              <p className="leading-relaxed text-lg" style={{ color: "oklch(0.72 0.04 240)" }}>
                When you open Continuary and something feels off, Wren doesn't push you to be productive. She reads the signals — your check-in language, your energy, your pattern — and names what she sees.
              </p>
              <div className="space-y-3">
                {[
                  {
                    state: "Tired",
                    wren: "You've been running hard. This isn't resistance — it's your body asking for something. Rest is part of the work.",
                    colour: "oklch(0.60 0.10 240 / 0.8)",
                    bg: "oklch(0.60 0.10 240 / 0.06)",
                    border: "oklch(0.60 0.10 240 / 0.2)",
                  },
                  {
                    state: "Stuck",
                    wren: "Something specific is in the way. Let's name it before we try to move it. What's the actual block?",
                    colour: "oklch(0.75 0.14 50 / 0.9)",
                    bg: "oklch(0.75 0.14 50 / 0.06)",
                    border: "oklch(0.75 0.14 50 / 0.2)",
                  },
                  {
                    state: "Overwhelmed",
                    wren: "Everything feels urgent and nothing feels possible. That's not a productivity problem — that's a threshold problem. One thing. Just one.",
                    colour: "oklch(0.70 0.16 30 / 0.9)",
                    bg: "oklch(0.70 0.16 30 / 0.06)",
                    border: "oklch(0.70 0.16 30 / 0.2)",
                  },
                  {
                    state: "Ready",
                    wren: "The thread is here. You're here. Let's go.",
                    colour: "oklch(0.74 0.14 72 / 0.9)",
                    bg: "oklch(0.74 0.14 72 / 0.06)",
                    border: "oklch(0.74 0.14 72 / 0.2)",
                  },
                ].map(s => (
                  <div key={s.state} className="rounded-xl p-5 space-y-2" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <p className="font-semibold text-sm uppercase tracking-wide" style={{ color: s.colour }}>{s.state}</p>
                    <p className="text-sm italic leading-relaxed" style={{ color: "oklch(0.72 0.04 240)" }}>"{s.wren}"</p>
                    <p className="text-xs" style={{ color: "oklch(0.45 0.04 240)" }}>— Wren</p>
                  </div>
                ))}
              </div>
              <Nav onPrev={prev} onNext={next} nextLabel="See Re-Entry" />
            </div>
          </Fade>
        )}

        {/* ── 11. Re-Entry / Amnesty Protocol ── */}
        {step === "reentry" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="Re-Entry" title="You're allowed to come back." wren="carryingThread" />
              <p className="leading-relaxed text-lg" style={{ color: "oklch(0.72 0.04 240)" }}>
                Most productivity systems punish you for disappearing. Continuary doesn't. When you've been away — a week, a month, longer — Wren doesn't ask where you've been. She asks where you want to go next.
              </p>
              <div className="rounded-2xl p-6 space-y-5" style={{ background: "oklch(0.74 0.14 72 / 0.05)", border: "1px solid oklch(0.74 0.14 72 / 0.2)" }}>
                <p className="text-sm font-semibold" style={{ color: "oklch(0.74 0.14 72)" }}>The Amnesty Protocol</p>
                <p className="text-sm leading-relaxed" style={{ color: "oklch(0.72 0.04 240)" }}>
                  When you return after a gap, Wren surfaces your last continuity note — the thread you left — and offers three options:
                </p>
                <div className="space-y-3">
                  {[
                    { label: "Pick up the thread",  desc: "Resume exactly where you left off. Wren reads back your last note and your next step." },
                    { label: "Start fresh",          desc: "The old thread is archived, not deleted. You begin a new one. No guilt attached." },
                    { label: "Just check in",        desc: "Not ready to commit to either. Wren meets you here and asks one question: what do you need today?" },
                  ].map(opt => (
                    <div key={opt.label} className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: "oklch(0.12 0.02 240 / 0.5)", border: "1px solid oklch(0.74 0.14 72 / 0.1)" }}>
                      <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: "oklch(0.74 0.14 72)" }} />
                      <div>
                        <p className="text-sm font-medium text-white/90">{opt.label}</p>
                        <p className="text-xs text-white/50 leading-relaxed">{opt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm italic" style={{ color: "oklch(0.65 0.06 65)" }}>
                  "The thread doesn't break when you leave. It waits." — Wren
                </p>
              </div>
              <Nav onPrev={prev} onNext={next} nextLabel="Focus Sessions" />
            </div>
          </Fade>
        )}

        {/* ── 12. Focus Sessions ── */}
        {step === "focus_sessions" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="Focus Sessions" title="Work side-by-side with Wren." wren="homeVideo" />
              <p className="leading-relaxed text-lg" style={{ color: "oklch(0.72 0.04 240)" }}>
                A Focus Session is a dedicated block of time where you and Wren work together. You set your intention,
                choose 25, 50, or 90 minutes, and Wren stays present the whole time — weaving quietly on the right side of your screen,
                checking in at the halfway point, and helping you close out with a clear next step.
              </p>
              <div className="rounded-2xl p-6 space-y-4" style={{ background: "oklch(0.12 0.02 240 / 0.6)", border: "1px solid oklch(0.74 0.14 72 / 0.12)" }}>
                <p className="text-sm font-semibold" style={{ color: "oklch(0.74 0.14 72)" }}>How a session works</p>
                <div className="space-y-3">
                  {[
                    { n: "1", label: "Name your intention",  desc: "One sentence: what are you working on this session?" },
                    { n: "2", label: "Choose your duration", desc: "25, 50, or 90 minutes. Wren adjusts her check-in timing." },
                    { n: "3", label: "Work together",        desc: "Wren is present on the right side of your screen. Chat with her if you need to — she's a companion, not a task manager." },
                    { n: "4", label: "Close out",            desc: "Wren weaves a small artifact of what moved. You always pick what’s next — she just notes what happened. Logged to your Evidence Log." },
                  ].map(s => (
                    <div key={s.n} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background: "oklch(0.74 0.14 72 / 0.15)", color: "oklch(0.74 0.14 72)" }}>{s.n}</span>
                      <div>
                        <p className="text-sm font-medium text-white/90">{s.label}</p>
                        <p className="text-xs text-white/50 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm" style={{ color: "oklch(0.55 0.04 240)" }}>
                <span>🎧</span>
                <span>Pick from Silence · Rain · Café — whatever helps you settle.</span>
              </div>
              <Nav onPrev={prev} onNext={next} nextLabel="Single Focus Mode" />
            </div>
          </Fade>
        )}

        {/* ── 13. Single Focus Mode ── */}
        {step === "single_focus" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="Single Focus Mode" title="One topic. One thread. Every day." wren="perchedDoc" />
              <p className="leading-relaxed text-lg" style={{ color: "oklch(0.72 0.04 240)" }}>
                Single Focus Mode is for people who need to go deep on one thing for an extended period.
                You define your focus topic, set a daily cadence, and Wren holds the continuity language
                — reminding you where you left off and what the thread is.
              </p>
              <div className="rounded-2xl p-6 space-y-4" style={{ background: "oklch(0.12 0.02 240 / 0.6)", border: "1px solid oklch(0.74 0.14 72 / 0.12)" }}>
                <p className="text-sm font-semibold" style={{ color: "oklch(0.74 0.14 72)" }}>What makes it different</p>
                <div className="space-y-3">
                  {[
                    { label: "One focus, not a list",     desc: "You name a single topic and commit to it. The app holds that commitment." },
                    { label: "Wren's continuity line",    desc: "Every day, Wren opens with a line that connects today to yesterday's thread." },
                    { label: "Daily check-in form",       desc: "A lightweight log: what you did, what moved, what's next. Takes 90 seconds." },
                    { label: "Settings panel",            desc: "Change your focus, extend your timeline, pause, or end — all in one place." },
                  ].map(s => (
                    <div key={s.label} className="flex items-start gap-3">
                      <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: "oklch(0.74 0.14 72 / 0.7)" }} />
                      <div>
                        <p className="text-sm font-medium text-white/90">{s.label}</p>
                        <p className="text-xs text-white/50 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Sample Wren continuity line */}
              <div className="rounded-xl px-5 py-4" style={{ background: "oklch(0.74 0.14 72 / 0.05)", border: "1px solid oklch(0.74 0.14 72 / 0.15)" }}>
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "oklch(0.74 0.14 72 / 0.6)" }}>Wren's continuity line — Day 8</p>
                <p className="text-sm italic leading-relaxed" style={{ color: "oklch(0.75 0.04 240)" }}>
                  "Day 8 of Learning Python. You're back. Yesterday you stalled on for-loops — that's where the thread picks up."
                </p>
                <p className="text-xs mt-2" style={{ color: "oklch(0.55 0.08 65)" }}>— Wren</p>
              </div>
              <Nav onPrev={prev} onNext={next} nextLabel="Ready to begin" />
            </div>
          </Fade>
        )}

        {/* ── 14. Invite / Begin ── */}
        {step === "invite" && (
          <Fade>
            <div className="flex flex-col items-center text-center gap-8">
              <WrenPlayer clip="hoveringArchway" size="xl" stage={false} feather featherDirection="bottom" />
              <div className="space-y-3">
                <p className="text-xs tracking-widest uppercase" style={{ color: "oklch(0.74 0.14 72 / 0.7)" }}>Founding Member Access</p>
                <h2 className="text-3xl md:text-4xl font-brand leading-tight">
                  Ready to <em className="font-brand font-semibold" style={{ color: "oklch(0.74 0.14 72)" }}>begin?</em>
                </h2>
                <p className="max-w-md mx-auto leading-relaxed" style={{ color: "oklch(0.65 0.04 240)" }}>
                  Continuary is currently invite-only. Founding members get lifetime access at the price they join — and they help shape what gets built next.
                </p>
              </div>
              {/* Pricing */}
              <div className="grid sm:grid-cols-2 gap-4 w-full max-w-md">
                <div className="rounded-2xl p-5 space-y-2 text-left" style={{ background: "oklch(0.12 0.02 240 / 0.6)", border: "1px solid oklch(0.74 0.14 72 / 0.15)" }}>
                  <p className="text-xs uppercase tracking-widest" style={{ color: "oklch(0.74 0.14 72 / 0.6)" }}>Pro</p>
                  <p className="text-2xl font-bold" style={{ color: "oklch(0.74 0.14 72)" }}>$4.99<span className="text-sm font-normal text-white/40">/mo</span></p>
                  <p className="text-xs leading-relaxed" style={{ color: "oklch(0.55 0.04 240)" }}>Full access to all features. Locked in for life at founding rate.</p>
                </div>
                <div className="rounded-2xl p-5 space-y-2 text-left" style={{ background: "oklch(0.74 0.14 72 / 0.08)", border: "1px solid oklch(0.74 0.14 72 / 0.35)" }}>
                  <p className="text-xs uppercase tracking-widest" style={{ color: "oklch(0.74 0.14 72 / 0.8)" }}>Keeper</p>
                  <p className="text-2xl font-bold" style={{ color: "oklch(0.74 0.14 72)" }}>$9.99<span className="text-sm font-normal text-white/40">/mo</span></p>
                  <p className="text-xs leading-relaxed" style={{ color: "oklch(0.65 0.06 65)" }}>Everything in Pro + priority access to new features and direct input on the roadmap.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link href="/apply"
                  className="px-8 py-3 rounded-xl font-semibold transition-colors"
                  style={{ background: "oklch(0.74 0.14 72)", color: "oklch(0.12 0.02 240)" }}>
                  Apply for access →
                </Link>
                <Link href="/pricing"
                  className="px-6 py-3 rounded-xl text-sm transition-colors"
                  style={{ background: "oklch(0.74 0.14 72 / 0.08)", color: "oklch(0.60 0.08 72)", border: "1px solid oklch(0.74 0.14 72 / 0.2)" }}>
                  See full pricing
                </Link>
              </div>
              <button onClick={prev} className="text-sm transition-colors" style={{ color: "oklch(0.45 0.04 240)" }}>
                ← Back to {STEP_META[STEPS[STEPS.length - 2]].label}
              </button>
            </div>
          </Fade>
        )}
      </main>

      {step !== "invite" && (
        <div className="fixed bottom-0 inset-x-0 z-40 flex justify-center px-4 py-3 pointer-events-none" style={{ background: "oklch(0.09 0.015 240 / 0.98)" }}>
          <div className="text-center text-xs" style={{ color: "oklch(0.45 0.04 240)" }}>{idx + 1} / {STEPS.length} — {STEP_META[step].label}</div>
        </div>
      )}
    </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Fade({ children }: { children: React.ReactNode }) {
  return <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">{children}</div>;
}

function Header({ eyebrow, title, wren: _wren }: { eyebrow: string; title: string; wren: WrenClip }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-5 sm:text-left">
      <WrenPlayer clip="evidenceClean" size="sm" stage={false} feather />
      <div className="space-y-1">
        <p className="text-xs tracking-widest uppercase" style={{ color: "oklch(0.74 0.14 72 / 0.7)" }}>{eyebrow}</p>
        <h2 className="text-2xl md:text-3xl font-brand leading-snug" style={{ color: "oklch(0.74 0.14 72)" }}>{title}</h2>
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
    border: "1px solid oklch(0.74 0.14 72 / 0.12)",
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
      style={{ background: "oklch(0.74 0.14 72)", color: "oklch(0.12 0.02 240)" }}>
      {label} →
    </button>
  );
}

function Nav({ onPrev, onNext, nextLabel = "Continue" }: { onPrev: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <div className="flex items-center justify-between pt-2">
      <button onClick={onPrev} className="text-sm transition-colors" style={{ color: "oklch(0.45 0.04 240)" }}>← Back</button>
      <button onClick={onNext} className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
        style={{ background: "oklch(0.74 0.14 72)", color: "oklch(0.12 0.02 240)" }}>
        {nextLabel} →
      </button>
    </div>
  );
}
