import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Brain,
  Zap,
  Lightbulb,
  Wind,
  Users,
  Compass,
  ChevronRight,
  Clock,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  BarChart2,
  TrendingUp,
  Folder,
  ChevronDown,
} from "lucide-react";


type Mode =
  | "overwhelm"
  | "decision"
  | "creative_block"
  | "identity_drift"
  | "relationship_tension"
  | "purpose_fog";

type ConvertTo =
  | "next_step"
  | "todays_focus"
  | "project_note"
  | "compass_item"
  | "journal_reflection";

const MODES: {
  id: Mode;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    id: "overwhelm",
    label: "Overwhelm",
    description: "Too much, too loud, unclear where to start",
    icon: Brain,
    color: "text-red-400",
  },
  {
    id: "decision",
    label: "Decision",
    description: "Stuck in a loop, can't move forward",
    icon: Zap,
    color: "text-amber-400",
  },
  {
    id: "creative_block",
    label: "Creative Block",
    description: "The work won't come, the page is blank",
    icon: Lightbulb,
    color: "text-yellow-400",
  },
  {
    id: "identity_drift",
    label: "Identity Drift",
    description: "Disconnected from who you are or what you're building",
    icon: Wind,
    color: "text-blue-400",
  },
  {
    id: "relationship_tension",
    label: "Relationship Tension",
    description: "Carrying weight from a person or dynamic",
    icon: Users,
    color: "text-purple-400",
  },
  {
    id: "purpose_fog",
    label: "Purpose Fog",
    description: "Questioning direction, unsure what matters",
    icon: Compass,
    color: "text-teal-400",
  },
];

const PROGRESS_MARKERS: { id: string; label: string; emoji: string }[] = [
  { id: "clearer", label: "Clearer", emoji: "✓" },
  { id: "still_unsure", label: "Still unsure", emoji: "~" },
  { id: "ready_to_act", label: "Ready to act", emoji: "→" },
  { id: "need_to_revisit", label: "Need to revisit", emoji: "↩" },
];

const CONVERT_OPTIONS: { id: ConvertTo; label: string }[] = [
  { id: "next_step", label: "Next step" },
  { id: "todays_focus", label: "Today's focus" },
  { id: "project_note", label: "Project note" },
  { id: "compass_item", label: "Compass item" },
  { id: "journal_reflection", label: "Journal reflection" },
];

const MODE_LABEL: Record<Mode, string> = {
  overwhelm: "Overwhelm",
  decision: "Decision",
  creative_block: "Creative Block",
  identity_drift: "Identity Drift",
  relationship_tension: "Relationship Tension",
  purpose_fog: "Purpose Fog",
};

export default function ClarityEnginePage() {
  const [view, setView] = useState<"new" | "result" | "history" | "patterns" | "weekly">("new");
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [brainDump, setBrainDump] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  const { data: projects } = trpc.projects.listActive.useQuery();
  const { data: patterns, isLoading: patternsLoading } = trpc.clarity.analyzePatterns.useQuery(
    undefined,
    { enabled: view === "patterns" }
  );
  const { data: weeklySummary } = trpc.clarity.getWeeklySummary.useQuery(
    undefined,
    { enabled: view === "weekly" }
  );

  const utils = trpc.useUtils();

  const { data: sessions, isLoading: sessionsLoading } =
    trpc.clarity.getSessions.useQuery({ limit: 30 });

  const { data: activeSession } = trpc.clarity.getSession.useQuery(
    { id: activeSessionId! },
    { enabled: !!activeSessionId }
  );

  const runSession = trpc.clarity.runSession.useMutation({
    onSuccess: (session) => {
      setActiveSessionId(session.id);
      setView("result");
      utils.clarity.getSessions.invalidate();
      setBrainDump("");
      setSelectedMode(null);
    },
    onError: (err) => {
      toast.error("Something went wrong. Please try again.");
      console.error(err);
    },
  });

  const setProgressMarker = trpc.clarity.setProgressMarker.useMutation({
    onSuccess: () => utils.clarity.getSession.invalidate({ id: activeSessionId! }),
  });

  const convertToAction = trpc.clarity.convertToAction.useMutation({
    onSuccess: (result) => {
      if (result.projectUpdated && result.projectTitle) {
        // Feature 7: project was updated — richer confirmation
        toast.success(`Next step saved to “${result.projectTitle}”`, {
          description: "It will appear on your Command Center immediately.",
          duration: 5000,
        });
      } else {
        toast.success(
          `Added to ${CONVERT_OPTIONS.find((o) => o.id === result.convertedTo)?.label ?? "your plan"}`
        );
      }
      utils.clarity.getSession.invalidate({ id: activeSessionId! });
      // Also refresh projects so Command Center picks up the new nextStep
      utils.projects.listActive.invalidate();
    },
  });

  const handleRun = () => {
    if (!selectedMode) {
      toast.error("Please select a clarity mode first");
      return;
    }
    if (brainDump.trim().length < 10) {
      toast.error("Please share a bit more before we begin");
      return;
    }
    runSession.mutate({ mode: selectedMode, brainDump: brainDump.trim(), projectId: selectedProjectId });
  };

  // ── New session form ──────────────────────────────────────────────────────
  const NewSessionView = () => (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-brand font-medium text-foreground mb-2">
          Clarity Engine
        </h1>
        <p className="text-muted-foreground">
          Unload what's in your head. The engine will help you find what's
          actually happening, what you feel, what you need, and your next right
          step.
        </p>
      </div>

      {/* Mode selector */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          What kind of clarity do you need?
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-border bg-card hover:border-muted-foreground/40"
                }`}
              >
                <Icon
                  className={`w-5 h-5 mb-2 ${isSelected ? "text-amber-400" : mode.color}`}
                />
                <p className="text-sm font-semibold text-foreground">
                  {mode.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  {mode.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Brain dump textarea */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Brain dump — say everything
        </p>
        <Textarea
          value={brainDump}
          onChange={(e) => setBrainDump(e.target.value)}
          placeholder="Just start typing. Don't edit. Don't filter. Let it out..."
          className="min-h-[180px] text-base resize-none bg-card border-border focus:border-amber-500/60"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          {brainDump.length} characters — more context gives better clarity
        </p>
      </div>

      {/* Project attachment */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Link to a project <span className="font-normal normal-case tracking-normal text-muted-foreground/60">(optional)</span>
        </p>
        <button
          onClick={() => setShowProjectPicker(!showProjectPicker)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:border-muted-foreground/40 transition-all"
        >
          <Folder className="w-4 h-4" />
          {selectedProjectId && projects
            ? (projects.find((p) => p.id === selectedProjectId)?.title ?? "Select project")
            : "Select project"}
          <ChevronDown className="w-3.5 h-3.5 ml-1" />
        </button>
        {showProjectPicker && projects && projects.length > 0 && (
          <div className="mt-2 bg-card border border-border rounded-xl overflow-hidden shadow-lg">
            <button
              onClick={() => { setSelectedProjectId(undefined); setShowProjectPicker(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
            >
              No project
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedProjectId(p.id); setShowProjectPicker(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  selectedProjectId === p.id
                    ? "bg-amber-500/10 text-amber-300"
                    : "text-foreground hover:bg-muted/40"
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={handleRun}
          disabled={runSession.isPending || !selectedMode || brainDump.length < 10}
          className="bg-amber-500 hover:bg-amber-600 text-white px-8"
        >
          {runSession.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              Run Clarity Engine
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
        {sessions && sessions.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => setView("history")}
            className="text-muted-foreground"
          >
            <Clock className="w-4 h-4 mr-2" />
            Past sessions
          </Button>
        )}
        {sessions && sessions.length >= 3 && (
          <Button
            variant="ghost"
            onClick={() => setView("patterns")}
            className="text-muted-foreground"
          >
            <BarChart2 className="w-4 h-4 mr-2" />
            Patterns
          </Button>
        )}
        {sessions && sessions.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => setView("weekly")}
            className="text-muted-foreground"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            This week
          </Button>
        )}
      </div>
    </div>
  );

  // ── Session result ────────────────────────────────────────────────────────
  const ResultView = () => {
    const session = activeSession;
    if (!session) return null;

    const modeInfo = MODES.find((m) => m.id === session.mode);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-brand font-medium text-foreground">
              Your Clarity Map
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {modeInfo && (
                <span className="inline-flex items-center gap-1.5">
                  <modeInfo.icon className={`w-3.5 h-3.5 ${modeInfo.color}`} />
                  {modeInfo.label}
                </span>
              )}
              {" · "}
              {format(new Date(session.createdAt), "MMM d, h:mm a")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setView("new");
              setActiveSessionId(null);
            }}
          >
            New session
          </Button>
        </div>

        {/* Signal Line */}
        {session.signalLine && (
          <div className="bg-gradient-to-r from-indigo-900/40 to-indigo-800/20 border border-indigo-500/30 rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2">
              Signal Line
            </p>
            <p className="text-lg font-brand font-medium text-foreground italic leading-relaxed">
              "{session.signalLine}"
            </p>
          </div>
        )}

        {/* 4-Part Clarity Map */}
        <div className="space-y-4">
          {[
            {
              label: "What's actually happening",
              content: session.whatIsHappening,
              color: "border-l-blue-400",
            },
            {
              label: "What you actually feel",
              content: session.whatYouFeel,
              color: "border-l-purple-400",
            },
            {
              label: "What you actually need",
              content: session.whatYouNeed,
              color: "border-l-teal-400",
            },
            {
              label: "Your next right step",
              content: session.nextRightStep,
              color: "border-l-amber-400",
            },
          ].map((part) => (
            <div
              key={part.label}
              className={`bg-card border border-border border-l-4 ${part.color} rounded-xl p-4`}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                {part.label}
              </p>
              <p className="text-foreground leading-relaxed">{part.content}</p>
            </div>
          ))}
        </div>

        {/* Progress marker */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            How do you feel after this session?
          </p>
          <div className="flex flex-wrap gap-2">
            {PROGRESS_MARKERS.map((marker) => {
              const isSelected = session.progressMarker === marker.id;
              return (
                <button
                  key={marker.id}
                  onClick={() =>
                    setProgressMarker.mutate({
                      sessionId: session.id,
                      marker: marker.id as "clearer" | "still_unsure" | "ready_to_act" | "need_to_revisit",
                    })
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    isSelected
                      ? "bg-amber-500/20 border-amber-500 text-amber-300"
                      : "bg-card border-border text-muted-foreground hover:border-muted-foreground/40"
                  }`}
                >
                  <span className="mr-1.5">{marker.emoji}</span>
                  {marker.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clarity-to-Action handoff */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Convert your next right step into
          </p>
          {session.convertedTo ? (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Added to{" "}
              <span className="font-medium">
                {CONVERT_OPTIONS.find((o) => o.id === session.convertedTo)?.label}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {CONVERT_OPTIONS.map((opt) => {
                // Feature 7: for next_step and project_note, show project name if linked
                const linkedProject = session.projectId && projects
                  ? projects.find((p) => p.id === session.projectId)
                  : null;
                const showProjectHint =
                  linkedProject &&
                  (opt.id === "next_step" || opt.id === "project_note");
                return (
                  <button
                    key={opt.id}
                    onClick={() =>
                      convertToAction.mutate({
                        sessionId: session.id,
                        convertTo: opt.id,
                      })
                    }
                    disabled={convertToAction.isPending}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      showProjectHint
                        ? "border-amber-500/40 bg-amber-500/5 text-amber-300 hover:border-amber-500/60"
                        : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                    }`}
                    title={showProjectHint ? `Saves next step to "${linkedProject!.title}" and updates Command Center` : undefined}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    {showProjectHint ? `${opt.label} → ${linkedProject!.title}` : opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* View history link */}
        {sessions && sessions.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("history")}
            className="text-muted-foreground"
          >
            <Clock className="w-4 h-4 mr-2" />
            View all sessions
          </Button>
        )}
      </div>
    );
  };

  // ── History view ──────────────────────────────────────────────────────────
  const HistoryView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-brand font-medium text-foreground">
          Clarity History
        </h1>
        <Button
          onClick={() => setView("new")}
          className="bg-amber-500 hover:bg-amber-600 text-white"
          size="sm"
        >
          New session
        </Button>
      </div>

      {sessionsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sessions && sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((s) => {
            const modeInfo = MODES.find((m) => m.id === s.mode);
            const Icon = modeInfo?.icon ?? Brain;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSessionId(s.id);
                  setView("result");
                }}
                className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-muted-foreground/40 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${modeInfo?.color ?? "text-muted-foreground"}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {MODE_LABEL[s.mode as Mode] ?? s.mode}
                      </p>
                      {s.signalLine && (
                        <p className="text-xs text-muted-foreground truncate italic mt-0.5">
                          "{s.signalLine}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(s.createdAt), "MMM d")}
                    </p>
                    {s.progressMarker && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {PROGRESS_MARKERS.find((m) => m.id === s.progressMarker)
                          ?.label ?? s.progressMarker}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No clarity sessions yet.</p>
          <Button
            variant="ghost"
            onClick={() => setView("new")}
            className="mt-2"
          >
            Start your first session
          </Button>
        </div>
      )}
    </div>
  );

  // ── Pattern Analysis view ─────────────────────────────────────────────────
  const PatternsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-brand font-medium text-foreground">Clarity Patterns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">What keeps coming up across your sessions</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setView("new")}>New session</Button>
      </div>

      {patternsLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : !patterns ? (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Not enough sessions yet</p>
          <p className="text-sm mt-1">Complete at least 3 clarity sessions to see patterns.</p>
          <Button variant="ghost" onClick={() => setView("new")} className="mt-4">Start a session</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Most used mode */}
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Most used mode</p>
            <div className="flex items-center gap-2">
              {(() => { const m = MODES.find(x => x.id === patterns.mostUsedMode); return m ? <m.icon className={`w-5 h-5 ${m.color}`} /> : null; })()}
              <span className="text-lg font-medium text-foreground">{MODE_LABEL[patterns.mostUsedMode as Mode] ?? patterns.mostUsedMode}</span>
              <Badge variant="outline" className="ml-auto">{patterns.sessionCount} sessions</Badge>
            </div>
          </div>

          {/* Recurring themes */}
          {patterns.recurringThemes && patterns.recurringThemes.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Recurring themes</p>
              <div className="flex flex-wrap gap-2">
                {patterns.recurringThemes.map((theme: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-sm">{theme}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Progress signals */}
          {patterns.progressSignals && patterns.progressSignals.length > 0 && (
            <div className="bg-card border border-border border-l-4 border-l-emerald-400 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Progress signals</p>
              <ul className="space-y-2">
                {patterns.progressSignals.map((signal: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Honest observation */}
          <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2">Honest observation</p>
            <p className="text-foreground leading-relaxed">{patterns.honestObservation}</p>
          </div>

          {/* Encouraging pattern */}
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-2">Encouraging pattern</p>
            <p className="text-foreground leading-relaxed">{patterns.encouragingPattern}</p>
          </div>
        </div>
      )}
    </div>
  );

  // ── Weekly Summary view ────────────────────────────────────────────────────
  const WeeklyView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-brand font-medium text-foreground">This Week in Clarity</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Last 7 days of clarity sessions</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setView("new")}>New session</Button>
      </div>

      {!weeklySummary ? (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No sessions this week</p>
          <p className="text-sm mt-1">Complete a clarity session to start your weekly summary.</p>
          <Button variant="ghost" onClick={() => setView("new")} className="mt-4">Start a session</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{weeklySummary.sessionCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Sessions</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{weeklySummary.convertedCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Converted</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-foreground mt-1">{MODE_LABEL[weeklySummary.topMode as Mode] ?? weeklySummary.topMode}</p>
              <p className="text-xs text-muted-foreground mt-1">Top mode</p>
            </div>
          </div>

          {/* Mode breakdown */}
          {weeklySummary.modeCounts && Object.keys(weeklySummary.modeCounts).length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Mode breakdown</p>
              <div className="space-y-2">
                {Object.entries(weeklySummary.modeCounts as Record<string,number>)
                  .sort((a,b) => b[1]-a[1])
                  .map(([mode, count]) => {
                    const modeInfo = MODES.find(m => m.id === mode);
                    const Icon = modeInfo?.icon ?? Brain;
                    const pct = Math.round((count / weeklySummary.sessionCount) * 100);
                    return (
                      <div key={mode} className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 ${modeInfo?.color ?? "text-muted-foreground"}`} />
                        <span className="text-sm text-foreground w-36 truncate">{MODE_LABEL[mode as Mode] ?? mode}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Signal lines */}
          {weeklySummary.signalLines && weeklySummary.signalLines.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Signal lines this week</p>
              <div className="space-y-2">
                {weeklySummary.signalLines.map((line: string, i: number) => (
                  <p key={i} className="text-sm text-foreground italic border-l-2 border-indigo-500/50 pl-3">"{line}"</p>
                ))}
              </div>
            </div>
          )}

          {/* Progress marker breakdown */}
          {weeklySummary.markerCounts && Object.keys(weeklySummary.markerCounts).length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">How sessions ended</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(weeklySummary.markerCounts as Record<string,number>).map(([marker, count]) => {
                  const m = PROGRESS_MARKERS.find(x => x.id === marker);
                  return (
                    <div key={marker} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/40 rounded-lg text-sm">
                      <span>{m?.emoji}</span>
                      <span className="text-foreground">{m?.label ?? marker}</span>
                      <Badge variant="outline" className="ml-1 text-xs">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 md:p-8 min-h-screen">
      {view === "new" && <NewSessionView />}
      {view === "result" && activeSession && <ResultView />}
      {view === "history" && <HistoryView />}
      {view === "patterns" && <PatternsView />}
      {view === "weekly" && <WeeklyView />}
    </div>
  );
}
