import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

const WREN_NEUTRAL = "/manus-storage/wren_neutral_94a3d434.png";
const WREN_STATES  = "/manus-storage/wren_states_924967a2.png";
const WREN_STATES2 = "/manus-storage/wren_states_2_7e1484a1.png";

type Step = "intro" | "problem" | "thread" | "morning" | "evening" | "vault" | "strength" | "invite";

const STEPS: Step[] = ["intro","problem","thread","morning","evening","vault","strength","invite"];

const STEP_META: Record<Step, { label: string; wren: string }> = {
  intro:    { label: "Welcome",         wren: WREN_NEUTRAL },
  problem:  { label: "The Problem",     wren: WREN_STATES2 },
  thread:   { label: "Your Thread",     wren: WREN_STATES  },
  morning:  { label: "Morning",         wren: WREN_STATES  },
  evening:  { label: "Evening",         wren: WREN_STATES2 },
  vault:    { label: "The Vault",       wren: WREN_NEUTRAL },
  strength: { label: "Thread Strength", wren: WREN_STATES  },
  invite:   { label: "Request Access",  wren: WREN_NEUTRAL },
};

const MORNING_DEMO =
  `Good morning. You've named three things worth protecting today — that's already more intentional than most days begin.\n\nYour primary focus is clear. The secondary work can wait until after lunch. One task is enough to call this day a success.\n\nThe thread continues.`;

const EVENING_DEMO =
  `You showed up. That matters more than the list.\n\nTwo of three tasks completed is not a failure — it's data. The third one tells you something about your energy pattern on days like this.\n\nTomorrow, Wren will carry that thread forward. Rest now.`;

export default function TourPage() {
  const [step, setStep] = useState<Step>("intro");
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [morning, setMorning] = useState({ focus: "", tasks: "", energy: "" });
  const [evening, setEvening] = useState({ wins: "", incomplete: "", tomorrow: "" });
  const [form, setForm] = useState({ name: "", email: "", reason: "" });
  const [submitted, setSubmitted] = useState(false);

  const joinWaitlist = trpc.waitlist.join.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => toast.error("Something went wrong", { description: e.message }),
  });

  const idx = STEPS.indexOf(step);
  const progress = ((idx + 1) / STEPS.length) * 100;
  const next = () => { const n = STEPS[idx + 1]; if (n) setStep(n); };
  const prev = () => { const p = STEPS[idx - 1]; if (p) setStep(p); };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white font-sans overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a0c10]/90 backdrop-blur border-b border-white/5">
        <div className="flex items-center gap-2">
          <img src={WREN_NEUTRAL} alt="Continuary" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-semibold tracking-wide text-white/90">Continuary</span>
        </div>
        <a href={getLoginUrl()} className="text-sm text-white/40 hover:text-white/70 transition-colors">Sign in</a>
      </nav>

      {/* Progress */}
      <div className="fixed top-[57px] inset-x-0 z-40 h-0.5 bg-white/5">
        <div className="h-full bg-amber-400/70 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Step dots */}
      <div className="fixed top-[65px] inset-x-0 z-40 flex justify-center gap-2 py-2">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(s)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i === idx ? "bg-amber-400 scale-125" : i < idx ? "bg-amber-400/40" : "bg-white/15"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <main className="pt-28 pb-24 px-4 max-w-3xl mx-auto">

        {step === "intro" && (
          <Fade>
            <div className="flex flex-col items-center text-center gap-8">
              <img src={WREN_NEUTRAL} alt="Wren" className="w-40 h-40 rounded-2xl object-cover shadow-2xl shadow-amber-900/30" />
              <div className="space-y-4">
                <p className="text-amber-400/80 text-sm tracking-widest uppercase">Welcome</p>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight">Your thread<br />continues here.</h1>
                <p className="text-white/60 text-lg max-w-xl mx-auto leading-relaxed">
                  Continuary is a personal operating system for people who do deep, meaningful work — and who know how hard it is to pick that work back up after life interrupts.
                </p>
              </div>
              <div className="flex items-center gap-3 text-white/35 text-sm">
                <span>Meet Wren</span><span>·</span><span>Your continuity companion</span>
              </div>
              <Btn onClick={next} label="Begin the tour" />
            </div>
          </Fade>
        )}

        {step === "problem" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="The Problem" title="The gap between sessions is where work goes to die." wren={WREN_STATES2} />
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { icon: "⏸", title: "You step away", body: "Life happens. A meeting runs long. A family emergency. A bad week. You leave your work mid-thought." },
                  { icon: "🌫", title: "Context evaporates", body: "When you return, the thread is gone. You spend 40 minutes reconstructing what you were doing instead of doing it." },
                  { icon: "🔁", title: "The restart tax", body: "Every interruption costs more than the time lost. The cognitive overhead of re-entry compounds across weeks and months." },
                  { icon: "📉", title: "Momentum breaks", body: "Projects stall. Ideas go cold. The gap between who you are and what you're building quietly widens." },
                ].map(c => (
                  <div key={c.title} className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-5 space-y-2">
                    <div className="text-2xl">{c.icon}</div>
                    <h3 className="font-semibold text-white/90">{c.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{c.body}</p>
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
              <Header eyebrow="The Thread" title="Continuity isn't a habit. It's a practice of returning." wren={WREN_STATES} />
              <p className="text-white/60 leading-relaxed text-lg">
                Continuary doesn't ask you to be consistent. It asks you to <em className="text-amber-300/80 not-italic">return</em>. Every time you come back — even after days away — the thread picks up exactly where you left it.
              </p>
              <div className="space-y-3">
                {[
                  { label: "Morning check-in", desc: "Set your intention, protect your focus, and prime the day." },
                  { label: "Evening check-in", desc: "Close the loop, acknowledge what moved, and prepare tomorrow." },
                  { label: "The Vault", desc: "A living knowledge base that grows with every thought you capture." },
                  { label: "Thread Strength", desc: "A real-time measure of your continuity — not productivity, continuity." },
                  { label: "Re-entry support", desc: "When you've been away, Wren meets you where you are and walks you back in." },
                ].map(f => (
                  <div key={f.label} className="flex items-start gap-3 py-3 border-b border-white/[0.06]">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                    <div>
                      <span className="text-white/90 font-medium">{f.label}</span>
                      <span className="text-white/45 text-sm"> — {f.desc}</span>
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
              <Header eyebrow="Morning Check-In" title="What does today need to protect?" wren={WREN_STATES} />
              {!morningDone ? (
                <>
                  <p className="text-white/45 text-sm">This is a simulation — fill in anything to experience the flow.</p>
                  <div className="space-y-4">
                    <Field label="What is your primary focus today?" placeholder="e.g. Finish the first draft of chapter 3" value={morning.focus} onChange={v => setMorning(p => ({ ...p, focus: v }))} />
                    <Field label="What are your three critical tasks?" placeholder="e.g. Write 1,000 words · Review client proposal · 30-min walk" value={morning.tasks} onChange={v => setMorning(p => ({ ...p, tasks: v }))} multiline />
                    <div className="space-y-2">
                      <label className="text-white/55 text-sm">Energy level this morning</label>
                      <div className="flex gap-2">
                        {["Low","Moderate","High"].map(e => (
                          <button key={e} onClick={() => setMorning(p => ({ ...p, energy: e }))}
                            className={`px-4 py-2 rounded-lg text-sm border transition-all ${morning.energy === e ? "bg-amber-400/20 border-amber-400/60 text-amber-300" : "border-white/10 text-white/40 hover:border-white/20"}`}>
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setMorningDone(true)} disabled={!morning.focus}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-black font-semibold transition-colors">
                    Submit morning check-in
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-6 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400/70 text-sm">
                      <img src={WREN_NEUTRAL} alt="" className="w-5 h-5 rounded object-cover" />
                      <span>Wren responds</span>
                    </div>
                    <p className="text-white/80 leading-relaxed whitespace-pre-line">{MORNING_DEMO}</p>
                  </div>
                  <p className="text-white/35 text-sm text-center">Your actual response is personalised to your projects, history, and energy.</p>
                </div>
              )}
              <Nav onPrev={prev} onNext={next} nextLabel="Try the evening check-in" />
            </div>
          </Fade>
        )}

        {step === "evening" && (
          <Fade>
            <div className="space-y-6">
              <Header eyebrow="Evening Check-In" title="Close the loop before you rest." wren={WREN_STATES2} />
              {!eveningDone ? (
                <>
                  <p className="text-white/45 text-sm">Simulate closing your day.</p>
                  <div className="space-y-4">
                    <Field label="What moved today?" placeholder="e.g. Finished the draft. Had a good conversation with a client." value={evening.wins} onChange={v => setEvening(p => ({ ...p, wins: v }))} multiline />
                    <Field label="What didn't happen, and why?" placeholder="e.g. Skipped the walk — ran out of time after the afternoon call." value={evening.incomplete} onChange={v => setEvening(p => ({ ...p, incomplete: v }))} multiline />
                    <Field label="What goes first tomorrow?" placeholder="e.g. The client proposal — it's due by noon." value={evening.tomorrow} onChange={v => setEvening(p => ({ ...p, tomorrow: v }))} />
                  </div>
                  <button onClick={() => setEveningDone(true)} disabled={!evening.wins}
                    className="w-full py-3 rounded-xl bg-indigo-500/80 hover:bg-indigo-400/80 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold transition-colors">
                    Close the day
                  </button>
                </>
              ) : (
                <div className="bg-indigo-400/5 border border-indigo-400/20 rounded-xl p-6 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-300/70 text-sm">
                    <img src={WREN_NEUTRAL} alt="" className="w-5 h-5 rounded object-cover" />
                    <span>Wren responds</span>
                  </div>
                  <p className="text-white/80 leading-relaxed whitespace-pre-line">{EVENING_DEMO}</p>
                </div>
              )}
              <Nav onPrev={prev} onNext={next} nextLabel="See the Vault" />
            </div>
          </Fade>
        )}

        {step === "vault" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="The Vault" title="Every thought you've ever had about your work, in one place." wren={WREN_NEUTRAL} />
              <p className="text-white/60 leading-relaxed text-lg">
                The Vault is your knowledge base — not a note-taking app, but a living intelligence layer that connects your ideas, drafts, research, and decisions to your active projects.
              </p>
              <div className="space-y-3">
                {[
                  { type: "Idea",     preview: "What if the second chapter opened with the scene from 2019 instead of the prologue?",          tag: "Writing"   },
                  { type: "Research", preview: "Knowledge workers lose 28% of their week to context-switching. (McKinsey)",                     tag: "Reference" },
                  { type: "Decision", preview: "Decided to cut the third service offering and focus entirely on the core product.",             tag: "Strategy"  },
                  { type: "Draft",    preview: "Opening paragraph for the investor update — needs tightening before Thursday.",                 tag: "Writing"   },
                ].map(item => (
                  <div key={item.preview} className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                    <span className="text-xs bg-white/10 text-white/50 px-2 py-0.5 rounded-full mt-0.5 shrink-0">{item.type}</span>
                    <p className="text-white/70 text-sm leading-relaxed flex-1">{item.preview}</p>
                    <span className="text-xs text-amber-400/50 shrink-0">{item.tag}</span>
                  </div>
                ))}
              </div>
              <p className="text-white/35 text-sm">Items are automatically tagged, linked to projects, and surfaced when they're relevant.</p>
              <Nav onPrev={prev} onNext={next} nextLabel="See Thread Strength" />
            </div>
          </Fade>
        )}

        {step === "strength" && (
          <Fade>
            <div className="space-y-8">
              <Header eyebrow="Thread Strength" title="A living measure of your continuity." wren={WREN_STATES} />
              <p className="text-white/60 leading-relaxed text-lg">
                Thread Strength doesn't measure how much you did. It measures how consistently you've stayed connected to your work — and how well you've returned after gaps.
              </p>
              <div className="space-y-4">
                <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">Your Thread Strength</span>
                    <span className="text-amber-400 font-bold text-2xl">74</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-gradient-to-r from-amber-500 to-amber-300 h-2 rounded-full" style={{ width: "74%" }} />
                  </div>
                  <p className="text-amber-300/70 text-sm font-medium">Weaving — strong momentum, consistent returns</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Gathering", range: "0–25",   desc: "Just starting or returning after a long gap" },
                    { label: "Weaving",   range: "26–75",  desc: "Building rhythm, consistent check-ins" },
                    { label: "Holding",   range: "76–100", desc: "Deep continuity, strong thread" },
                  ].map(s => (
                    <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-1">
                      <p className="text-white/80 text-sm font-medium">{s.label}</p>
                      <p className="text-amber-400/60 text-xs">{s.range}</p>
                      <p className="text-white/35 text-xs leading-snug">{s.desc}</p>
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
              <img src={WREN_NEUTRAL} alt="Wren" className="w-32 h-32 rounded-2xl object-cover shadow-2xl shadow-amber-900/30" />
              {!submitted ? (
                <>
                  <div className="space-y-3">
                    <p className="text-amber-400/80 text-sm tracking-widest uppercase">Invite Only</p>
                    <h2 className="text-3xl md:text-4xl font-bold">Request access</h2>
                    <p className="text-white/55 max-w-md mx-auto leading-relaxed">
                      Continuary is currently invite-only. Tell us a little about your work and we'll be in touch.
                    </p>
                  </div>
                  <form className="w-full max-w-md space-y-4 text-left"
                    onSubmit={e => { e.preventDefault(); joinWaitlist.mutate(form); }}>
                    <Field label="Your name" placeholder="Alex" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} />
                    <Field label="Email address" placeholder="alex@example.com" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} />
                    <Field label="What kind of work do you do? (optional)" placeholder="e.g. I'm a writer working on a long-form project and I lose context constantly between sessions." value={form.reason} onChange={v => setForm(p => ({ ...p, reason: v }))} multiline />
                    <button type="submit" disabled={!form.email || joinWaitlist.isPending}
                      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-black font-semibold transition-colors">
                      {joinWaitlist.isPending ? "Sending…" : "Request access"}
                    </button>
                  </form>
                  <button onClick={prev} className="text-white/30 text-sm hover:text-white/50 transition-colors">← Back</button>
                </>
              ) : (
                <div className="space-y-6 max-w-md">
                  <div className="text-5xl">🪶</div>
                  <h2 className="text-3xl font-bold">You're on the list.</h2>
                  <p className="text-white/55 leading-relaxed">
                    We'll reach out personally when your access is ready. In the meantime, the thread is waiting.
                  </p>
                  <a href={getLoginUrl()} className="inline-block px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 text-sm transition-colors">
                    Already have access? Sign in →
                  </a>
                </div>
              )}
            </div>
          </Fade>
        )}
      </main>

      {step !== "invite" && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center pointer-events-none">
          <div className="text-white/20 text-xs">{idx + 1} / {STEPS.length} — {STEP_META[step].label}</div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Fade({ children }: { children: React.ReactNode }) {
  return <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">{children}</div>;
}

function Header({ eyebrow, title, wren }: { eyebrow: string; title: string; wren: string }) {
  return (
    <div className="flex items-start gap-5">
      <img src={wren} alt="" className="w-16 h-16 rounded-xl object-cover shadow-lg shrink-0 mt-1" />
      <div className="space-y-1">
        <p className="text-amber-400/70 text-xs tracking-widest uppercase">{eyebrow}</p>
        <h2 className="text-2xl md:text-3xl font-bold leading-snug">{title}</h2>
      </div>
    </div>
  );
}

function Field({ label, placeholder, value, onChange, multiline = false, type = "text" }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; multiline?: boolean; type?: string;
}) {
  const base = "w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white/80 placeholder-white/25 text-sm focus:outline-none focus:border-amber-400/40 transition-colors resize-none";
  return (
    <div className="space-y-1.5">
      <label className="text-white/55 text-sm">{label}</label>
      {multiline
        ? <textarea className={`${base} min-h-[80px]`} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
        : <input type={type} className={base} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />}
    </div>
  );
}

function Btn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors">
      {label} →
    </button>
  );
}

function Nav({ onPrev, onNext, nextLabel = "Continue" }: { onPrev: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <div className="flex items-center justify-between pt-2">
      <button onClick={onPrev} className="text-white/30 text-sm hover:text-white/50 transition-colors">← Back</button>
      <button onClick={onNext} className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors">
        {nextLabel} →
      </button>
    </div>
  );
}
