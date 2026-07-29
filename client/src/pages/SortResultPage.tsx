/**
 * Sort result screen (9.2)
 * Shows sorted atoms grouped by kind, allows reclassify + route to Unstick / Open Loops.
 * Feelings are shown ephemerally — never persisted, never shown again after leaving.
 */
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  Loader2,
  AlertCircle,
  ChevronDown,
  RotateCcw,
  Zap,
  Repeat,
  CheckCircle2,
  Heart,
  Lightbulb,
  HelpCircle,
  ListTodo,
  Link2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import UnstickModal from "@/components/UnstickModal";
import type { AtomKind } from "@soul/capture";

// ── Atom kind metadata ───────────────────────────────────────────────────────
const KIND_META: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  feeling:    { label: "Feelings",   color: "oklch(0.74 0.14 72)",   bg: "oklch(0.74 0.14 72 / 0.10)",  icon: Heart },
  fact:       { label: "Facts",      color: "oklch(0.68 0.17 155)",  bg: "oklch(0.68 0.17 155 / 0.10)", icon: FileText },
  task:       { label: "Tasks",      color: "oklch(0.72 0.17 250)",  bg: "oklch(0.72 0.17 250 / 0.10)", icon: ListTodo },
  open_loop:  { label: "Open Loops", color: "oklch(0.75 0.18 310)",  bg: "oklch(0.75 0.18 310 / 0.10)", icon: Repeat },
  question:   { label: "Questions",  color: "oklch(0.78 0.16 55)",   bg: "oklch(0.78 0.16 55 / 0.10)",  icon: HelpCircle },
  insight:    { label: "Insights",   color: "oklch(0.72 0.17 190)",  bg: "oklch(0.72 0.17 190 / 0.10)", icon: Lightbulb },
};

const RECLASSIFY_KINDS: Array<"fact" | "task" | "open_loop" | "question" | "insight"> = ["fact", "task", "open_loop", "question", "insight"];

interface StoredAtom {
  id: number;
  kind: string;
  text: string;
  salience: number;
  routedTo: string | null;
  userCorrected: number;
}

interface FeelingAtom {
  text: string;
  kind: "feeling";
  salience: number;
}

export default function SortResultPage() {
  const { id } = useParams<{ id: string }>();
  const captureId = parseInt(id ?? "0", 10);
  const [, navigate] = useLocation();

  const [sortDone, setSortDone] = useState(false);
  const [atoms, setAtoms] = useState<StoredAtom[]>([]);
  const [feelingAtoms, setFeelingAtoms] = useState<FeelingAtom[]>([]);
  const [sortError, setSortError] = useState<string | null>(null);
  const [reclassifyOpen, setReclassifyOpen] = useState<number | null>(null);
  const [unstickAtom, setUnstickAtom] = useState<StoredAtom | null>(null);
  const [groundModeOffer, setGroundModeOffer] = useState(false);
  const [routedIds, setRoutedIds] = useState<Set<number>>(new Set());

  const sort = trpc.capture.sort.useMutation();
  const reclassify = trpc.capture.reclassify.useMutation();
  const route = trpc.capture.route.useMutation();
  const checkGround = trpc.capture.checkGroundModeOffer.useQuery(
    { captureId },
    { enabled: sortDone }
  );
  const utils = trpc.useUtils();

  // Run sort on mount
  useEffect(() => {
    if (!captureId || sortDone) return;
    sort.mutate(
      { captureId },
      {
        onSuccess: (data) => {
          setAtoms(data.atoms as StoredAtom[]);
          setFeelingAtoms(data.feelingAtoms as FeelingAtom[]);
          setSortDone(true);
        },
        onError: (err) => {
          setSortError(err.message ?? "Sorting failed. Your capture is saved.");
          setSortDone(true);
        },
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureId]);

  useEffect(() => {
    if (checkGround.data?.offer) setGroundModeOffer(true);
  }, [checkGround.data]);

  // ── Reclassify ──────────────────────────────────────────────────────────────
  const handleReclassify = (atomId: number, kind: "fact" | "task" | "open_loop" | "question" | "insight") => {
    reclassify.mutate(
      { atomId, kind },
      {
        onSuccess: () => {
          setAtoms((prev) =>
            prev.map((a) => (a.id === atomId ? { ...a, kind, userCorrected: 1 } : a))
          );
          setReclassifyOpen(null);
        },
      }
    );
  };

  // ── Route ───────────────────────────────────────────────────────────────────
  const handleRoute = (atom: StoredAtom, to: "unstick" | "loops") => {
    if (to === "unstick") {
      setUnstickAtom(atom);
      return;
    }
    route.mutate(
      { atomId: atom.id, to },
      {
        onSuccess: () => {
          setRoutedIds((prev) => new Set(Array.from(prev).concat(atom.id)));
          utils.loops.list.invalidate();
        },
      }
    );
  };

  // TODO: wire Time Sense duration when focusSessions exposes a capture-aware hook
  //   e.g. trpc.focusSessions.logCaptureTime.mutate({ captureId, durationMs })
  // TODO: wire Surface tagging when surface exposes a capture-atom tag API
  //   e.g. trpc.surface.tagAtom.mutate({ atomId, kind })

  // ── Grouped atoms ───────────────────────────────────────────────────────────
  const kindOrder: string[] = ["task", "open_loop", "question", "insight", "fact"];
  const grouped = kindOrder
    .map((k) => ({ kind: k, items: atoms.filter((a) => a.kind === k) }))
    .filter((g) => g.items.length > 0);

  const isLoading = sort.isPending;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] max-w-lg mx-auto px-4 py-8 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sort result</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Wren sorted your capture. Route or dismiss each thought.
          </p>
        </div>
        <button
          onClick={() => navigate("/capture")}
          className="text-xs text-muted-foreground underline underline-offset-2"
        >
          New capture
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "oklch(0.74 0.14 72)" }} />
          <p className="text-sm text-muted-foreground">Sorting your thoughts…</p>
        </div>
      )}

      {/* Sort error */}
      {sortError && (
        <div className="flex items-start gap-2 rounded-lg p-3 text-sm"
          style={{ background: "oklch(0.18 0.06 22)", border: "1px solid oklch(0.35 0.12 22)", color: "oklch(0.88 0.03 60)" }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
          <span>{sortError}</span>
        </div>
      )}

      {/* Ground mode offer */}
      {groundModeOffer && (
        <div className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: "oklch(0.68 0.17 155 / 0.10)", border: "1px solid oklch(0.68 0.17 155 / 0.25)" }}>
          <Zap className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "oklch(0.68 0.17 155)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Ground Mode available</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You've captured the same open loop 3+ times. Ground Mode can help you close it.
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            style={{ background: "oklch(0.68 0.17 155)", color: "oklch(0.10 0.02 155)" }}
            onClick={() => navigate("/focus")}
          >
            Enter
          </Button>
        </div>
      )}

      {/* Feelings section — ephemeral, no persist */}
      {sortDone && feelingAtoms.length > 0 && (
        <div className="rounded-xl p-4"
          style={{ background: "oklch(0.74 0.14 72 / 0.07)", border: "1px solid oklch(0.74 0.14 72 / 0.2)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4" style={{ color: "oklch(0.74 0.14 72)" }} />
            <span className="text-sm font-semibold" style={{ color: "oklch(0.74 0.14 72)" }}>
              Feelings — acknowledged, not stored
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {feelingAtoms.map((f, i) => (
              <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                {f.text}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-3 opacity-60">
            These are seen only by you, right now. They won't appear in history.
          </p>
        </div>
      )}

      {/* Sorted atoms by kind */}
      {sortDone && grouped.map(({ kind, items }) => {
        const meta = KIND_META[kind] ?? KIND_META.fact;
        const Icon = meta.icon;
        return (
          <div key={kind} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
                {meta.label}
              </span>
            </div>
            {items.map((atom) => {
              const routed = routedIds.has(atom.id) || !!atom.routedTo;
              return (
                <div key={atom.id}
                  className={cn("rounded-xl p-4 flex flex-col gap-3 transition-opacity", routed && "opacity-50")}
                  style={{ background: meta.bg, border: `1px solid ${meta.color}33` }}>
                  <p className="text-sm text-foreground leading-relaxed">{atom.text}</p>

                  {/* Routed badge */}
                  {routed && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {atom.routedTo === "loops" || routedIds.has(atom.id)
                        ? "Added to Open Loops"
                        : "Sent to Unstick"}
                    </div>
                  )}

                  {/* Actions */}
                  {!routed && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Route to Unstick (tasks only) */}
                      {kind === "task" && (
                        <button
                          onClick={() => handleRoute(atom, "unstick")}
                          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95"
                          style={{ background: "oklch(0.72 0.17 250 / 0.15)", color: "oklch(0.72 0.17 250)", border: "1px solid oklch(0.72 0.17 250 / 0.3)" }}
                        >
                          <Zap className="w-3 h-3" />
                          Unstick
                        </button>
                      )}
                      {/* Route to Open Loops (open_loop atoms) */}
                      {kind === "open_loop" && (
                        <button
                          onClick={() => handleRoute(atom, "loops")}
                          disabled={route.isPending}
                          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95"
                          style={{ background: "oklch(0.75 0.18 310 / 0.15)", color: "oklch(0.75 0.18 310)", border: "1px solid oklch(0.75 0.18 310 / 0.3)" }}
                        >
                          <Link2 className="w-3 h-3" />
                          Add to Loops
                        </button>
                      )}
                      {/* Reclassify */}
                      <div className="relative">
                        <button
                          onClick={() => setReclassifyOpen(reclassifyOpen === atom.id ? null : atom.id)}
                          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95"
                          style={{ background: "oklch(0.175 0.030 245)", color: "oklch(0.54 0.016 240)", border: "1px solid oklch(0.215 0.030 245)" }}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reclassify
                          <ChevronDown className={cn("w-3 h-3 transition-transform", reclassifyOpen === atom.id && "rotate-180")} />
                        </button>
                        {reclassifyOpen === atom.id && (
                          <div className="absolute left-0 top-full mt-1 z-20 rounded-xl overflow-hidden shadow-xl"
                            style={{ background: "oklch(0.155 0.032 245)", border: "1px solid oklch(0.215 0.030 245)", minWidth: "140px" }}>
                            {RECLASSIFY_KINDS.filter((k) => k !== kind).map((k) => {
                              const km = KIND_META[k];
                              const KIcon = km.icon;
                              return (
                                <button
                                  key={k}
                                  onClick={() => handleReclassify(atom.id, k)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-white/5 transition-colors"
                                >
                                  <KIcon className="w-3.5 h-3.5" style={{ color: km.color }} />
                                  <span style={{ color: km.color }}>{km.label.replace(/s$/, "")}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Done CTA */}
      {sortDone && atoms.length > 0 && (
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => navigate("/")}
            className="flex-1"
            style={{ background: "oklch(0.74 0.14 72)", color: "oklch(0.10 0.03 72)" }}
          >
            Done
          </Button>
          <Button variant="outline" onClick={() => navigate("/capture")}>
            Capture more
          </Button>
        </div>
      )}

      {/* Empty sort */}
      {sortDone && atoms.length === 0 && !sortError && feelingAtoms.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <CheckCircle2 className="w-10 h-10" style={{ color: "oklch(0.68 0.17 155)" }} />
          <p className="text-sm text-muted-foreground">Nothing to sort — capture was empty or unclear.</p>
          <Button onClick={() => navigate("/capture")} variant="outline">
            Try again
          </Button>
        </div>
      )}

      {/* Unstick modal */}
      {unstickAtom && (
        <UnstickModal
          task={{ id: `capture-${unstickAtom.id}`, title: unstickAtom.text }}
          onClose={() => {
            setUnstickAtom(null);
            setRoutedIds((prev) => new Set(Array.from(prev).concat(unstickAtom.id)));
            route.mutate({ atomId: unstickAtom.id, to: "unstick" });
          }}
        />
      )}
    </div>
  );
}
