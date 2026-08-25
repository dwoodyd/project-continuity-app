/**
 * Open Loops screen (9.3)
 * Lists all open loops, allows closing, snoozing, and adding new ones directly.
 */
import { useState } from "react";
import {
  Loader2,
  Repeat,
  CheckCircle2,
  Plus,
  Clock,
  ChevronDown,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { PageMeta } from "@/components/PageMeta";

type SnoozeOption = { label: string; ms: number };
const SNOOZE_OPTIONS: SnoozeOption[] = [
  { label: "1 hour",    ms: 60 * 60 * 1000 },
  { label: "Tomorrow",  ms: 24 * 60 * 60 * 1000 },
  { label: "3 days",    ms: 3 * 24 * 60 * 60 * 1000 },
  { label: "1 week",    ms: 7 * 24 * 60 * 60 * 1000 },
];

interface Loop {
  id: number;
  text: string;
  status: string;
  openedAt: number;
  closedAt: number | null;
  resurfaceAt: number | null;
  atomId: number | null;
}

export default function OpenLoopsPage() {
  const [showClosed, setShowClosed] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newText, setNewText] = useState("");
  const [snoozeOpenId, setSnoozeOpenId] = useState<number | null>(null);

  const { data, isLoading, refetch } = trpc.loops.list.useQuery({
    status: showClosed ? "all" : "open",
    limit: 100,
  });
  const closeLoop = trpc.loops.close.useMutation({ onSuccess: () => refetch() });
  const snoozeLoop = trpc.loops.snooze.useMutation({ onSuccess: () => { refetch(); setSnoozeOpenId(null); } });
  const createLoop = trpc.loops.create.useMutation({
    onSuccess: () => {
      setNewText("");
      setAddingNew(false);
      refetch();
    },
  });

  const loops = (data?.loops ?? []) as Loop[];
  const openLoops = loops.filter((l) => l.status === "open");
  const closedLoops = loops.filter((l) => l.status === "closed");

  const handleSnooze = (id: number, ms: number) => {
    snoozeLoop.mutate({ id, resurfaceAt: Date.now() + ms });
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] max-w-lg mx-auto px-4 py-8 gap-6">
      <PageMeta title="Open Loops — Continuary" description="Track and close recurring thoughts." />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Repeat className="w-5 h-5" style={{ color: "oklch(0.75 0.18 310)" }} />
            Open Loops
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Thoughts that keep coming back. Close them when they're done.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setAddingNew((v) => !v)}
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      {/* Add new loop inline */}
      {addingNew && (
        <div className="flex flex-col gap-2 rounded-xl p-4"
          style={{ background: "oklch(0.135 0.030 245)", border: "1px solid oklch(0.215 0.030 245)" }}>
          <Textarea
            autoFocus
            placeholder="What's looping in your head?"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="min-h-[80px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                if (newText.trim()) createLoop.mutate({ text: newText.trim() });
              }
            }}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!newText.trim() || createLoop.isPending}
              onClick={() => { if (newText.trim()) createLoop.mutate({ text: newText.trim() }); }}
              style={{ background: "oklch(0.75 0.18 310)", color: "oklch(0.10 0.02 310)" }}
            >
              {createLoop.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save loop"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setAddingNew(false); setNewText(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "oklch(0.75 0.18 310)" }} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && openLoops.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Inbox className="w-10 h-10 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No open loops right now.</p>
          <p className="text-xs text-muted-foreground opacity-60">
            Loops appear here when you capture an open loop thought and route it.
          </p>
          <a href="/capture" className="text-xs font-medium text-primary underline underline-offset-4 hover:text-primary/80">
            Nothing to hold right now? Capture a thought with Wren →
          </a>
        </div>
      )}

      {/* Open loops list */}
      {openLoops.length > 0 && (
        <div className="flex flex-col gap-2">
          {openLoops.map((loop) => (
            <LoopCard
              key={loop.id}
              loop={loop}
              snoozeOpenId={snoozeOpenId}
              setSnoozeOpenId={setSnoozeOpenId}
              onClose={() => closeLoop.mutate({ id: loop.id })}
              onSnooze={(ms) => handleSnooze(loop.id, ms)}
              closing={closeLoop.isPending && closeLoop.variables?.id === loop.id}
            />
          ))}
        </div>
      )}

      {/* Closed loops toggle */}
      {closedLoops.length > 0 && (
        <button
          onClick={() => setShowClosed((v) => !v)}
          className="flex items-center gap-2 text-xs text-muted-foreground self-start"
        >
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showClosed && "rotate-180")} />
          {showClosed ? "Hide" : `Show ${closedLoops.length} closed`}
        </button>
      )}
      {showClosed && closedLoops.map((loop) => (
        <div key={loop.id}
          className="rounded-xl p-4 opacity-50"
          style={{ background: "oklch(0.135 0.030 245)", border: "1px solid oklch(0.215 0.030 245)" }}>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "oklch(0.68 0.17 155)" }} />
            <p className="text-sm text-muted-foreground line-through">{loop.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Loop card ─────────────────────────────────────────────────────────────────
function LoopCard({
  loop,
  snoozeOpenId,
  setSnoozeOpenId,
  onClose,
  onSnooze,
  closing,
}: {
  loop: Loop;
  snoozeOpenId: number | null;
  setSnoozeOpenId: (id: number | null) => void;
  onClose: () => void;
  onSnooze: (ms: number) => void;
  closing: boolean;
}) {
  const isSnoozed = loop.resurfaceAt !== null && loop.resurfaceAt > Date.now();
  return (
    <div
      className={cn("rounded-xl p-4 flex flex-col gap-3 transition-opacity", closing && "opacity-40")}
      style={{ background: "oklch(0.75 0.18 310 / 0.07)", border: "1px solid oklch(0.75 0.18 310 / 0.2)" }}
    >
      <p className="text-sm text-foreground leading-relaxed">{loop.text}</p>

      {isSnoozed && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          Snoozed until {new Date(loop.resurfaceAt!).toLocaleString()}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {/* Close */}
        <button
          onClick={onClose}
          disabled={closing}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95"
          style={{ background: "oklch(0.68 0.17 155 / 0.12)", color: "oklch(0.68 0.17 155)", border: "1px solid oklch(0.68 0.17 155 / 0.25)" }}
        >
          <CheckCircle2 className="w-3 h-3" />
          Close loop
        </button>

        {/* Snooze */}
        <div className="relative">
          <button
            onClick={() => setSnoozeOpenId(snoozeOpenId === loop.id ? null : loop.id)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95"
            style={{ background: "oklch(0.175 0.030 245)", color: "oklch(0.54 0.016 240)", border: "1px solid oklch(0.215 0.030 245)" }}
          >
            <Clock className="w-3 h-3" />
            Snooze
            <ChevronDown className={cn("w-3 h-3 transition-transform", snoozeOpenId === loop.id && "rotate-180")} />
          </button>
          {snoozeOpenId === loop.id && (
            <div className="absolute left-0 top-full mt-1 z-20 rounded-xl overflow-hidden shadow-xl"
              style={{ background: "oklch(0.155 0.032 245)", border: "1px solid oklch(0.215 0.030 245)", minWidth: "120px" }}>
              {SNOOZE_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => onSnooze(opt.ms)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-white/5 transition-colors text-muted-foreground"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
