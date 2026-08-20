import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { CrisisSupportCard } from "@/components/CrisisSupportCard";
import { useCrisisCheck } from "@/hooks/useCrisisCheck";
import notify from "@/lib/notify";
import { ArrowLeft, Info } from "lucide-react";
import { useLocation } from "wouter";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function phaseColor(score: number): string {
  if (score >= 7) return "oklch(0.75 0.18 145)";   // green-ish — elation
  if (score >= 4) return "oklch(0.74 0.14 72)";    // amber — neutral
  return "oklch(0.65 0.18 30)";                     // red-ish — worry
}

function phaseLabel(score: number): string {
  if (score >= 8) return "Elation";
  if (score >= 6) return "High";
  if (score >= 4) return "Neutral";
  if (score >= 2) return "Low";
  return "Worry";
}

// ─── Dot-connect SVG chart ────────────────────────────────────────────────────
function CycleChart({ data }: { data: { date: string; score: number }[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; score: number } | null>(null);

  const W = 700, H = 220, PAD_X = 16, PAD_Y = 20;
  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y * 2;

  const points = useMemo(() => {
    if (data.length === 0) return [];
    return data.map((d, i) => ({
      x: PAD_X + (i / Math.max(data.length - 1, 1)) * chartW,
      y: PAD_Y + (1 - (d.score - 1) / 9) * chartH,
      ...d,
    }));
  }, [data]);

  const pathD = points.length < 2 ? "" : points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1]!;
    const cpx = (prev.x + p.x) / 2;
    return acc + ` C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`;
  }, "");

  // Horizontal guide lines at 1, 3.5 (mid-low), 5.5 (mid-neutral), 7, 10
  const guides = [
    { score: 1, label: "Worry" },
    { score: 5.5, label: "Neutral" },
    { score: 10, label: "Elation" },
  ];

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: "rgba(255,255,255,0.3)" }}>
        <span className="text-sm">No data yet — log your first mood below.</span>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: Math.max(data.length * 18, 300), height: H }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Guide lines */}
        {guides.map(g => {
          const gy = PAD_Y + (1 - (g.score - 1) / 9) * chartH;
          return (
            <g key={g.score}>
              <line x1={PAD_X} y1={gy} x2={W - PAD_X} y2={gy} stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="4 4" />
              <text x={PAD_X + 2} y={gy - 4} fontSize={9} fill="rgba(255,255,255,0.2)">{g.label}</text>
            </g>
          );
        })}

        {/* Gradient fill under curve */}
        <defs>
          <linearGradient id="cycleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.74 0.14 72)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="oklch(0.74 0.14 72)" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        {pathD && (
          <path
            d={pathD + ` L ${points.at(-1)!.x} ${PAD_Y + chartH} L ${points[0]!.x} ${PAD_Y + chartH} Z`}
            fill="url(#cycleGrad)"
          />
        )}

        {/* Main curve */}
        {pathD && (
          <path d={pathD} fill="none" stroke="oklch(0.74 0.14 72)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Dots */}
        {points.map((p, i) => (
          <g key={i} style={{ cursor: "pointer" }}
            onMouseEnter={() => setTooltip({ x: p.x, y: p.y, date: p.date, score: p.score })}
          >
            <circle cx={p.x} cy={p.y} r={5} fill={phaseColor(p.score)} stroke="rgba(0,0,0,0.5)" strokeWidth={1.5} />
            {/* Score label for every 7th point to avoid clutter */}
            {(i === 0 || i === points.length - 1 || i % 7 === 0) && (
              <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.45)">{p.score}</text>
            )}
          </g>
        ))}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={Math.min(tooltip.x - 36, W - 90)}
              y={tooltip.y - 46}
              width={80}
              height={36}
              rx={6}
              fill="rgba(10,10,20,0.92)"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={1}
            />
            <text x={Math.min(tooltip.x - 36, W - 90) + 40} y={tooltip.y - 30} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.6)">{formatDate(tooltip.date)}</text>
            <text x={Math.min(tooltip.x - 36, W - 90) + 40} y={tooltip.y - 16} textAnchor="middle" fontSize={12} fontWeight="600" fill={phaseColor(tooltip.score)}>{tooltip.score} — {phaseLabel(tooltip.score)}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Score picker ─────────────────────────────────────────────────────────────
function ScorePicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1 flex-wrap justify-center">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{
            width: "2.6rem", height: "2.6rem",
            borderRadius: "0.6rem",
            fontSize: "0.9rem",
            fontWeight: value === n ? 700 : 400,
            border: value === n ? `2px solid ${phaseColor(n)}` : "1px solid rgba(255,255,255,0.1)",
            background: value === n ? `${phaseColor(n)}22` : "rgba(255,255,255,0.04)",
            color: value === n ? phaseColor(n) : "rgba(255,255,255,0.55)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ─── Phase badge ──────────────────────────────────────────────────────────────
function PhaseBadge({ phase }: { phase: "high" | "neutral" | "low" | null }) {
  if (!phase) return null;
  const colors: Record<string, string> = { high: "oklch(0.75 0.18 145)", neutral: "oklch(0.74 0.14 72)", low: "oklch(0.65 0.18 30)" };
  const labels: Record<string, string> = { high: "High Period", neutral: "Neutral Phase", low: "Low Period" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.2rem 0.7rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: `${colors[phase]}22`, color: colors[phase], border: `1px solid ${colors[phase]}44` }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors[phase], display: "inline-block" }} />
      {labels[phase]}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EmotionalCyclePage() {
  const [, navigate] = useLocation();
  const [score, setScore] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  const localDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const todayQuery = trpc.moodLogs.getToday.useQuery({ localDate: localDateStr });
  const historyQuery = trpc.moodLogs.getHistory.useQuery({ days: 90 });
  const cycleQuery = trpc.moodLogs.getCycleAnalysis.useQuery();
  const logMutation = trpc.moodLogs.logToday.useMutation({
    onSuccess: () => {
      notify.saved("Mood logged.");
      todayQuery.refetch();
      historyQuery.refetch();
      cycleQuery.refetch();
    },
    onError: () => notify.error("Couldn't save — try again."),
  });

  // Pre-fill from today's existing log
  useEffect(() => {
    if (todayQuery.data) {
      setScore(todayQuery.data.score);
      setNote(todayQuery.data.note ?? "");
    }
  }, [todayQuery.data]);

  // Scroll to top on mount
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const history = historyQuery.data ?? [];
  const cycle = cycleQuery.data;
  const alreadyLogged = !!todayQuery.data;

  const { crisisLevel, checkAndMaybeFlag, dismissCrisis } = useCrisisCheck("mood_log");

  const handleLog = () => {
    if (!score) return notify.error("Pick a score first.");
    logMutation.mutate({ score, note: note.trim() || undefined }, {
      onSuccess: () => {
        if (note.trim()) void checkAndMaybeFlag(note);
      },
    });
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-border" style={{ background: "var(--background)" }}>
        <button onClick={() => navigate("/")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-foreground">Emotional Cycle</h1>
          <p className="text-xs text-muted-foreground">Based on Hersey's 5-week cycle research</p>
        </div>
        <button onClick={() => setShowInfo(v => !v)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <Info className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Info panel */}
        {showInfo && (
          <div className="rounded-xl p-4 text-sm leading-relaxed space-y-2 bg-card border border-border text-muted-foreground">
            <p><strong className="text-foreground">What is this?</strong> Research by Professor Rex Hersey (University of Pennsylvania) found that human emotional cycles average about 5 weeks — from a peak of elation down to a trough of worry and back up again.</p>
            <p>By logging your mood daily, you'll start to see your personal rhythm. After a few months you can predict your next high and low with surprising accuracy — and plan your work accordingly.</p>
            <p><strong className="text-foreground">Scale:</strong> 1 = deep worry / 10 = peak elation. 4–6 is neutral territory.</p>
          </div>
        )}

        {/* Cycle analysis */}
        <div className="rounded-2xl p-4 bg-card border border-border">
          <div className="min-w-0 space-y-2">
            {cycle?.hasEnoughData ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <PhaseBadge phase={cycle.currentPhase} />
                  {cycle.cycleDays && (
                    <span className="text-xs text-muted-foreground">~{cycle.cycleDays}-day cycle</span>
                  )}
                </div>
                <p className="text-sm text-foreground/90">{cycle.message}</p>
                {(cycle.nextHighDate || cycle.nextLowDate) && (
                  <div className="flex gap-4 pt-1 flex-wrap">
                    {cycle.nextHighDate && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Next high est. </span>
                        <span style={{ color: "oklch(0.75 0.18 145)", fontWeight: 600 }}>{formatDate(cycle.nextHighDate)}</span>
                      </div>
                    )}
                    {cycle.nextLowDate && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Next low est. </span>
                        <span style={{ color: "oklch(0.65 0.18 30)", fontWeight: 600 }}>{formatDate(cycle.nextLowDate)}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                {cycle?.message ?? "Log your mood each evening to reveal your emotional rhythm."}
              </p>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-2xl p-4 space-y-3 bg-card border border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Your Cycle — Last 90 Days</h2>
            <span className="text-xs text-muted-foreground">{history.length} entries</span>
          </div>
          <CycleChart data={history} />
        </div>

        {/* Today's log */}
        <div className="rounded-2xl p-4 space-y-4 bg-card border border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {alreadyLogged ? "Update today's mood" : "Log today's mood"}
            </h2>
            {alreadyLogged && score && (
              <span className="text-xs" style={{ color: phaseColor(score) }}>{score} — {phaseLabel(score)}</span>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground text-center">1 = deep worry &nbsp;·&nbsp; 5–6 = neutral &nbsp;·&nbsp; 10 = peak elation</p>
            <ScorePicker value={score} onChange={setScore} />
          </div>

          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Optional note — what's shaping today's mood? (private)"
            rows={2}
            className="w-full rounded-xl px-3 py-2.5 text-sm resize-none bg-transparent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />

          <button
            onClick={handleLog}
            disabled={!score || logMutation.isPending}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: score ? "linear-gradient(135deg, oklch(0.65 0.14 72), oklch(0.80 0.14 72))" : "rgba(255,255,255,0.06)",
              color: score ? "white" : "rgba(255,255,255,0.3)",
              cursor: score ? "pointer" : "not-allowed",
              boxShadow: score ? "0 4px 20px oklch(0.74 0.14 72 / 0.35)" : "none",
            }}
          >
            {logMutation.isPending ? "Saving…" : alreadyLogged ? "Update log" : "Log this moment"}
          </button>
          {crisisLevel && (
            <CrisisSupportCard level={crisisLevel} onDismiss={dismissCrisis} className="mt-2" />
          )}
        </div>

        {/* History list — last 14 entries */}
        {history.length > 0 && (
          <div className="rounded-2xl p-4 space-y-3 bg-card border border-border">
            <h2 className="text-sm font-semibold text-foreground">Recent Entries</h2>
            <div className="space-y-2">
              {[...history].reverse().slice(0, 14).map(entry => (
                <div key={entry.id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">{formatDate(entry.date)}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 10, height: 10, borderRadius: 2,
                          background: i < entry.score ? phaseColor(entry.score) : "rgba(255,255,255,0.07)",
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: phaseColor(entry.score) }}>{entry.score}</span>
                  <span className="text-xs text-muted-foreground">{phaseLabel(entry.score)}</span>
                  {entry.note && <span className="text-xs text-muted-foreground truncate flex-1">— {entry.note}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hersey attribution */}
        <p className="text-center text-xs pb-6" style={{ color: "rgba(255,255,255,0.2)" }}>
          Based on emotional cycle research by Prof. Rex Hersey, University of Pennsylvania, and Prof. Edward R. Dewey, Foundation for the Study of Cycles.
        </p>
      </div>
    </div>
  );
}
