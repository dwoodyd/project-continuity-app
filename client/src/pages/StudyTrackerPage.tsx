/**
 * Single Focus Mode — generalized per spec
 * Replaces the hardcoded Python/Electronics/Edge AI tracker.
 *
 * Flow:
 *   1. No active config → empty state + "Set up your focus" button
 *   2. Setup screen → focusTopic, duration, cadence, wrenPrompts (Pro+)
 *   3. Working surface → header with user's focus, Wren continuity line,
 *      5 tabs (Daily · Compass · Focus Log · Weekly Review · Re-Entry),
 *      settings panel (change/extend/end/pause)
 */

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import AppLayout from "@/components/AppLayout";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysSince(d: Date | string | null | undefined): number {
  if (!d) return 0;
  const date = typeof d === "string" ? new Date(d) : d;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

const PLACEHOLDER_TOPICS = [
  "Learning Python",
  "Training for a marathon",
  "Writing my first novel",
  "Watercolor",
  "Bar exam prep",
  "Building my first iOS app",
  "Learning Spanish",
];

// ── Setup Screen ──────────────────────────────────────────────────────────────
function SetupScreen({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [cadence, setCadence] = useState<"daily" | "weekday" | "rhythm">("daily");
  const [wrenPrompts, setWrenPrompts] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const isPro = (user as any)?.isPro || (user as any)?.isFoundingMember;

  const createMutation = trpc.study.createConfig.useMutation({
    onSuccess: () => {
      setConfirmed(true);
      setTimeout(onDone, 2500);
    },
    onError: () => toast.error("Couldn't save your focus. Please try again."),
  });

  const placeholderIdx = Math.floor(Date.now() / 5000) % PLACEHOLDER_TOPICS.length;

  const handleSubmit = () => {
    if (!topic.trim()) { toast.error("Tell Wren what you're focusing on."); return; }
    const finalDuration = showCustom ? (parseInt(customDuration) || 30) : duration;
    createMutation.mutate({ focusTopic: topic.trim(), durationDays: finalDuration, cadence, wrenPrompts });
  };

  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <p className="text-lg font-medium mb-2" style={{ color: "oklch(0.85 0.06 65)" }}>
          Set.
        </p>
        <p className="text-sm opacity-60 max-w-sm">
          We'll work on <strong>{topic}</strong> for the next {showCustom ? customDuration : duration} days.
          I'll be here when you open this. — Wren
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold mb-2" style={{ color: "oklch(0.85 0.06 65)" }}>
        Single Focus Mode
      </h1>
      <p className="text-sm mb-8 opacity-60">
        One focus. For a defined stretch. The dashboard locks to it so you don't scatter.
      </p>

      <div className="space-y-6">
        {/* Topic */}
        <div>
          <label className="text-xs uppercase tracking-widest opacity-50 mb-2 block">
            What are you focusing on?
          </label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={PLACEHOLDER_TOPICS[placeholderIdx]}
            className="bg-transparent border-white/10 focus:border-white/30"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs uppercase tracking-widest opacity-50 mb-2 block">
            For how long?
          </label>
          <div className="flex flex-wrap gap-2">
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => { setDuration(d); setShowCustom(false); }}
                className={cn(
                  "px-4 py-2 rounded-full text-sm border transition-all",
                  !showCustom && duration === d
                    ? "border-amber-400 text-amber-400"
                    : "border-white/10 opacity-50 hover:opacity-80"
                )}
              >
                {d} days
              </button>
            ))}
            <button
              onClick={() => setShowCustom(true)}
              className={cn(
                "px-4 py-2 rounded-full text-sm border transition-all",
                showCustom
                  ? "border-amber-400 text-amber-400"
                  : "border-white/10 opacity-50 hover:opacity-80"
              )}
            >
              Custom…
            </button>
          </div>
          {showCustom && (
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={3650}
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                placeholder="e.g. 45"
                className="w-24 bg-transparent border-white/10"
              />
              <span className="text-sm opacity-50">days</span>
            </div>
          )}
        </div>

        {/* Cadence */}
        <div>
          <label className="text-xs uppercase tracking-widest opacity-50 mb-2 block">
            Cadence?
          </label>
          <div className="flex flex-wrap gap-2">
            {(["daily", "weekday", "rhythm"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCadence(c)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm border transition-all",
                  cadence === c
                    ? "border-amber-400 text-amber-400"
                    : "border-white/10 opacity-50 hover:opacity-80"
                )}
              >
                {c === "daily" ? "Daily" : c === "weekday" ? "Weekday only" : "Your own rhythm"}
              </button>
            ))}
          </div>
        </div>

        {/* Wren prompts */}
        <div>
          <label className="text-xs uppercase tracking-widest opacity-50 mb-2 block">
            Want Wren to weave a daily prompt for you?
          </label>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => isPro && setWrenPrompts(true)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all",
                wrenPrompts && isPro
                  ? "border-amber-400"
                  : "border-white/10",
                !isPro && "opacity-40 cursor-not-allowed"
              )}
            >
              <span className="text-sm">Yes — Wren suggests today's focus</span>
              {!isPro && <span className="text-xs ml-auto opacity-50">Pro</span>}
            </button>
            <button
              onClick={() => setWrenPrompts(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all",
                !wrenPrompts ? "border-amber-400" : "border-white/10"
              )}
            >
              <span className="text-sm">No — I'll write my own</span>
            </button>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="w-full py-3"
          style={{ background: "oklch(0.72 0.16 65)", color: "oklch(0.10 0.02 240)" }}
        >
          {createMutation.isPending ? "Setting up…" : "Begin →"}
        </Button>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold mb-3" style={{ color: "oklch(0.85 0.06 65)" }}>
        Single Focus Mode
      </h1>
      <p className="text-sm mb-2 opacity-70">One focus. For a defined stretch.</p>
      <p className="text-sm mb-6 opacity-50 leading-relaxed">
        The rest of Continuary lets you hold many threads at once. This is the opposite — one thing,
        locked in, for as long as you commit to it.
      </p>
      <p className="text-xs opacity-40 mb-6 leading-relaxed">
        Common uses: Learning something new · Training for an event · Writing a draft ·
        Studying for an exam · A creative project with a deadline
      </p>
      <Button
        onClick={onSetup}
        style={{ background: "oklch(0.72 0.16 65)", color: "oklch(0.10 0.02 240)" }}
      >
        Set up your focus →
      </Button>
    </div>
  );
}

// ── Settings Panel ────────────────────────────────────────────────────────────
type ActiveConfig = {
  id: number;
  focusTopic: string;
  durationDays: number;
  cadence: "daily" | "weekday" | "rhythm";
  wrenPrompts: boolean;
  startedAt: Date | string;
  status: "active" | "paused" | "ended" | "completed";
  entriesCount: number;
  wrenLine: string;
};

function SettingsPanel({
  config,
  onClose,
  onRefetch,
}: {
  config: ActiveConfig;
  onClose: () => void;
  onRefetch: () => void;
}) {
  const [newTopic, setNewTopic] = useState(config.focusTopic);
  const [extendDays, setExtendDays] = useState("");
  const utils = trpc.useUtils();

  const updateMutation = trpc.study.updateConfig.useMutation({
    onSuccess: () => { utils.study.getActiveConfig.invalidate(); onRefetch(); onClose(); },
    onError: () => toast.error("Couldn't update. Please try again."),
  });

  const daysSinceStart = daysSince(config.startedAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-xl p-6 space-y-4"
        style={{ background: "oklch(0.14 0.02 240)", border: "1px solid oklch(0.22 0.03 240)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold" style={{ color: "oklch(0.85 0.06 65)" }}>
          Single Focus Settings
        </h2>
        <p className="text-xs opacity-50">
          Currently focused on: {config.focusTopic} (Day {daysSinceStart + 1} of {config.durationDays})
        </p>

        <div>
          <label className="text-xs opacity-50 mb-1 block">Change focus topic</label>
          <div className="flex gap-2">
            <Input
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              className="bg-transparent border-white/10 text-sm flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateMutation.mutate({ id: config.id, focusTopic: newTopic })}
              disabled={updateMutation.isPending || newTopic === config.focusTopic}
            >
              Save
            </Button>
          </div>
        </div>

        <div>
          <label className="text-xs opacity-50 mb-1 block">Extend duration (add days)</label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              value={extendDays}
              onChange={(e) => setExtendDays(e.target.value)}
              placeholder="e.g. 14"
              className="bg-transparent border-white/10 text-sm w-24"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const add = parseInt(extendDays);
                if (!add || add < 1) return;
                updateMutation.mutate({ id: config.id, durationDays: config.durationDays + add });
              }}
              disabled={updateMutation.isPending}
            >
              Extend
            </Button>
          </div>
        </div>

        <button
          onClick={() => {
            const until = new Date(Date.now() + 7 * 86400000);
            updateMutation.mutate({ id: config.id, status: "paused", pausedUntil: until });
          }}
          className="w-full text-left text-sm py-2 opacity-60 hover:opacity-90 transition-opacity"
        >
          Pause for a few days →
        </button>

        <button
          onClick={() => {
            if (!confirm(`End "${config.focusTopic}" after ${daysSinceStart + 1} days? That's okay. The thread still counts.`)) return;
            updateMutation.mutate({ id: config.id, status: "ended", endedAt: new Date() });
          }}
          className="w-full text-left text-sm py-2 opacity-40 hover:opacity-70 transition-opacity"
          style={{ color: "oklch(0.65 0.12 25)" }}
        >
          End this focus →
        </button>

        <Button variant="ghost" size="sm" onClick={onClose} className="w-full opacity-40">
          Close
        </Button>
      </div>
    </div>
  );
}

// ── Day Navigator ─────────────────────────────────────────────────────────────
function DayNavigator({
  durationDays,
  cadence,
  selectedDay,
  onSelect,
  completedDays,
  startedAt,
}: {
  durationDays: number;
  cadence: string;
  selectedDay: number;
  onSelect: (d: number) => void;
  completedDays: Set<number>;
  startedAt: Date | string;
}) {
  const currentDay = Math.min(daysSince(startedAt) + 1, durationDays);

  if (cadence === "rhythm") {
    const days = Array.from({ length: Math.min(currentDay, durationDays) }, (_, i) => i + 1);
    return (
      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
        {[...days].reverse().map((d) => (
          <button
            key={d}
            onClick={() => onSelect(d)}
            className={cn(
              "text-left text-xs px-3 py-2 rounded transition-all",
              selectedDay === d ? "opacity-100 font-medium" : "opacity-40 hover:opacity-70"
            )}
            style={selectedDay === d ? { color: "oklch(0.80 0.10 65)" } : {}}
          >
            Day {d} {completedDays.has(d) ? "·" : ""}
          </button>
        ))}
      </div>
    );
  }

  const cols = durationDays <= 30 ? 6 : 10;
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: durationDays }, (_, i) => i + 1).map((d) => (
        <button
          key={d}
          onClick={() => d <= currentDay && onSelect(d)}
          title={`Day ${d}`}
          className={cn(
            "aspect-square rounded text-[10px] transition-all flex items-center justify-center",
            selectedDay === d ? "font-bold" : d <= currentDay ? "opacity-60 hover:opacity-90" : "opacity-20 cursor-default"
          )}
          style={{
            background:
              selectedDay === d
                ? "oklch(0.72 0.16 65)"
                : completedDays.has(d)
                ? "oklch(0.22 0.04 65)"
                : "oklch(0.16 0.02 240)",
            color: selectedDay === d ? "oklch(0.10 0.02 240)" : undefined,
          }}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

// ── Day Card ──────────────────────────────────────────────────────────────────
function DayCard({
  dayNum,
  config,
  existingLog,
  onSaved,
}: {
  dayNum: number;
  config: ActiveConfig;
  existingLog: any;
  onSaved: () => void;
}) {
  const [capacity, setCapacity] = useState<string>(existingLog?.capacity || "");
  const [firstMove, setFirstMove] = useState(existingLog?.firstMove || "");
  const [lesson, setLesson] = useState(existingLog?.whatLearned || "");
  const [built, setBuilt] = useState(existingLog?.whatBuilt || "");
  const [stayed, setStayed] = useState<string>(existingLog?.stayedOnLesson || "");
  const [drifted, setDrifted] = useState(existingLog?.driftedWhere || "");
  const [saving, setSaving] = useState(false);

  const saveMutation = trpc.study.saveDayLog.useMutation({
    onSuccess: () => { setSaving(false); onSaved(); toast.success("Saved."); },
    onError: () => { setSaving(false); toast.error("Couldn't save. Try again."); },
  });

  const handleSave = () => {
    setSaving(true);
    saveMutation.mutate({
      dayNum,
      logDate: new Date().toISOString().slice(0, 10),
      capacity,
      firstMove,
      whatLearned: lesson,
      whatBuilt: built,
      stayedOnLesson: stayed,
      driftedWhere: drifted,
      focusConfigId: config.id,
    });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-baseline gap-3">
        <h3 className="text-base font-medium" style={{ color: "oklch(0.85 0.06 65)" }}>
          {config.focusTopic} / Day {dayNum}
        </h3>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest opacity-40 mb-2">Capacity Today</p>
        <div className="flex gap-2">
          {["Full", "Partial", "Low"].map((c) => (
            <button
              key={c}
              onClick={() => setCapacity(c.toLowerCase())}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs border transition-all",
                capacity === c.toLowerCase()
                  ? "border-amber-400 text-amber-400"
                  : "border-white/10 opacity-40 hover:opacity-70"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest opacity-40 mb-1">First Move</p>
        <Textarea
          value={firstMove}
          onChange={(e) => setFirstMove(e.target.value)}
          placeholder="The single next action to start today's session…"
          className="bg-transparent border-white/10 text-sm min-h-[60px]"
        />
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest opacity-40 mb-1">What I Learned</p>
        <Textarea
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
          placeholder="In your own words…"
          className="bg-transparent border-white/10 text-sm min-h-[80px]"
        />
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest opacity-40 mb-1">What I Built or Practiced</p>
        <Textarea
          value={built}
          onChange={(e) => setBuilt(e.target.value)}
          placeholder=""
          className="bg-transparent border-white/10 text-sm min-h-[80px]"
        />
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest opacity-40 mb-1">Stayed with today's focus?</p>
        <p className="text-[11px] opacity-30 mb-2">
          Am I still working on what I committed to, or have I jumped ahead / sideways?
        </p>
        <div className="flex gap-2">
          {["yes", "mostly", "no"].map((v) => (
            <button
              key={v}
              onClick={() => setStayed(v)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs border transition-all capitalize",
                stayed === v
                  ? "border-amber-400 text-amber-400"
                  : "border-white/10 opacity-40 hover:opacity-70"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {(stayed === "mostly" || stayed === "no") && (
        <div>
          <p className="text-xs uppercase tracking-widest opacity-40 mb-1">If I Drifted, Where?</p>
          <Textarea
            value={drifted}
            onChange={(e) => setDrifted(e.target.value)}
            placeholder="Where did attention go?"
            className="bg-transparent border-white/10 text-sm min-h-[60px]"
          />
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={saving}
        style={{ background: "oklch(0.72 0.16 65)", color: "oklch(0.10 0.02 240)" }}
      >
        {saving ? "Saving…" : "Save Day →"}
      </Button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudyTrackerPage() {
  const { user, loading: authLoading } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"daily" | "compass" | "log" | "weekly" | "reentry">("daily");
  const [selectedDay, setSelectedDay] = useState(1);

  const configQuery = trpc.study.getActiveConfig.useQuery();
  const config = configQuery.data as ActiveConfig | null | undefined;

  const dayLogsQuery = trpc.study.getDayLogs.useQuery(undefined, { enabled: !!config });
  const dayLogs = dayLogsQuery.data ?? [];

  const completedDays = new Set(
    dayLogs.filter((l) => l.completedAt || l.whatLearned).map((l) => l.dayNum)
  );
  const existingLog = dayLogs.find((l) => l.dayNum === selectedDay);
  const daysSinceStart = config ? daysSince(config.startedAt) : 0;
  const currentDay = config ? Math.min(daysSinceStart + 1, config.durationDays) : 1;

  const handleRefetch = useCallback(() => {
    configQuery.refetch();
    dayLogsQuery.refetch();
  }, [configQuery, dayLogsQuery]);

  if (authLoading || configQuery.isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-sm opacity-40">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-sm opacity-40">Please sign in to use Single Focus Mode.</p>
        </div>
      </AppLayout>
    );
  }

  if (showSetup || !config) {
    return (
      <AppLayout>
        <div
          className="min-h-screen"
          style={{ background: "oklch(0.10 0.02 240)", color: "oklch(0.92 0.03 60)" }}
        >
          {!showSetup && !config ? (
            <EmptyState onSetup={() => setShowSetup(true)} />
          ) : (
            <SetupScreen
              onDone={() => {
                setShowSetup(false);
                configQuery.refetch();
              }}
            />
          )}
        </div>
      </AppLayout>
    );
  }

  const durationLabel = `${config.durationDays} days · Started ${formatDate(config.startedAt)}`;

  return (
    <AppLayout>
      <div
        className="min-h-screen"
        style={{ background: "oklch(0.10 0.02 240)", color: "oklch(0.92 0.03 60)" }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-5 border-b"
          style={{ borderColor: "oklch(0.18 0.02 240)" }}
        >
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "oklch(0.85 0.06 65)" }}>
              🎯 {config.focusTopic}
            </h1>
            <p className="text-xs mt-0.5 opacity-50">{durationLabel}</p>
            <p className="text-xs mt-2 italic opacity-60">{config.wrenLine}</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => setShowSettings(true)}
              className="text-xs px-3 py-1.5 rounded border opacity-40 hover:opacity-70 transition-opacity"
              style={{ borderColor: "oklch(0.22 0.03 240)" }}
            >
              ⚙ Settings
            </button>
            <button
              className="text-xs px-3 py-1.5 rounded border opacity-20 cursor-not-allowed"
              style={{ borderColor: "oklch(0.22 0.03 240)" }}
              title="Export — Pro feature"
            >
              Export (Pro)
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-0 border-b overflow-x-auto"
          style={{ borderColor: "oklch(0.18 0.02 240)" }}
        >
          {(["daily", "compass", "log", "weekly", "reentry"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-3 text-xs uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab ? "opacity-100 border-b-2" : "opacity-30 hover:opacity-60"
              )}
              style={
                activeTab === tab
                  ? { borderColor: "oklch(0.72 0.16 65)", color: "oklch(0.80 0.10 65)" }
                  : {}
              }
            >
              {tab === "daily" ? "Daily" : tab === "compass" ? "Compass" : tab === "log" ? "Focus Log" : tab === "weekly" ? "Weekly Review" : "Re-Entry"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex gap-0 min-h-[calc(100vh-160px)]">
          {activeTab === "daily" && (
            <div
              className="w-56 shrink-0 border-r p-4 overflow-y-auto"
              style={{ borderColor: "oklch(0.18 0.02 240)" }}
            >
              <p className="text-[10px] uppercase tracking-widest opacity-30 mb-3">
                {config.durationDays} days
              </p>
              <DayNavigator
                durationDays={config.durationDays}
                cadence={config.cadence}
                selectedDay={selectedDay}
                onSelect={setSelectedDay}
                completedDays={completedDays}
                startedAt={config.startedAt}
              />
            </div>
          )}

          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === "daily" && (
              <DayCard
                key={selectedDay}
                dayNum={selectedDay}
                config={config}
                existingLog={existingLog}
                onSaved={handleRefetch}
              />
            )}

            {activeTab === "compass" && (
              <div className="max-w-2xl space-y-4">
                <h2 className="text-base font-medium opacity-70">Compass</h2>
                <p className="text-sm opacity-40">
                  The compass tab helps you stay oriented to your original intention.
                  What did you commit to when you started this focus? What's still true?
                </p>
                <div className="p-4 rounded-lg" style={{ background: "oklch(0.14 0.02 240)" }}>
                  <p className="text-xs opacity-50 mb-1">Your focus</p>
                  <p className="text-sm">{config.focusTopic}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: "oklch(0.14 0.02 240)" }}>
                  <p className="text-xs opacity-50 mb-1">Days in</p>
                  <p className="text-sm">{daysSinceStart + 1} of {config.durationDays}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: "oklch(0.14 0.02 240)" }}>
                  <p className="text-xs opacity-50 mb-1">Sessions logged</p>
                  <p className="text-sm">{config.entriesCount}</p>
                </div>
              </div>
            )}

            {activeTab === "log" && (
              <div className="max-w-2xl space-y-3">
                <h2 className="text-base font-medium opacity-70">Focus Log</h2>
                {dayLogs.length === 0 ? (
                  <p className="text-sm opacity-30">No sessions logged yet.</p>
                ) : (
                  [...dayLogs]
                    .sort((a, b) => b.dayNum - a.dayNum)
                    .map((log) => (
                      <div
                        key={log.id}
                        className="p-4 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ background: "oklch(0.14 0.02 240)" }}
                        onClick={() => { setSelectedDay(log.dayNum); setActiveTab("daily"); }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium opacity-70">Day {log.dayNum}</p>
                          {log.logDate && <p className="text-[10px] opacity-30">{log.logDate}</p>}
                        </div>
                        {log.whatLearned && (
                          <p className="text-xs opacity-50 line-clamp-2">{log.whatLearned}</p>
                        )}
                      </div>
                    ))
                )}
              </div>
            )}

            {activeTab === "weekly" && (
              <div className="max-w-2xl">
                <h2 className="text-base font-medium opacity-70 mb-4">Weekly Review</h2>
                <p className="text-sm opacity-40">
                  Weekly review tab — coming soon. Use the Daily tab to log each session for now.
                </p>
              </div>
            )}

            {activeTab === "reentry" && (
              <div className="max-w-2xl space-y-4">
                <h2 className="text-base font-medium opacity-70">Re-Entry</h2>
                <p className="text-sm opacity-40 leading-relaxed">
                  Coming back after a gap? This tab helps you re-orient without guilt.
                </p>
                <div className="p-4 rounded-lg" style={{ background: "oklch(0.14 0.02 240)" }}>
                  <p className="text-xs opacity-50 mb-2">Wren says</p>
                  <p className="text-sm italic opacity-70">{config.wrenLine}</p>
                </div>
                <p className="text-xs opacity-30">
                  Open Day {currentDay} and write one thing you remember from where you left off.
                  That's the re-entry.
                </p>
              </div>
            )}
          </div>
        </div>

        {showSettings && (
          <SettingsPanel
            config={config}
            onClose={() => setShowSettings(false)}
            onRefetch={handleRefetch}
          />
        )}
      </div>
    </AppLayout>
  );
}
