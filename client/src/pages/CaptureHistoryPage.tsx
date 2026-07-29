/**
 * Capture History screen (9.4)
 * Lists recent captures with their atom counts and processing state.
 * Allows deleting captures (which also removes their atoms).
 */
import { useState } from "react";
import { useLocation } from "wouter";
import {
  Loader2,
  Mic,
  Type,
  Trash2,
  ChevronRight,
  Inbox,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { PageMeta } from "@/components/PageMeta";

interface CaptureRow {
  id: number;
  mode: string;
  processingState: string;
  transcript: string;
  durationS: number | null;
  createdAt: number;
  atomCount?: number;
}

export default function CaptureHistoryPage() {
  const [, navigate] = useLocation();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const { data, isLoading, refetch } = trpc.capture.recent.useQuery({ limit: 50 });
  const deleteCapture = trpc.capture.delete.useMutation({
    onSuccess: () => {
      setDeletingId(null);
      setConfirmDeleteId(null);
      refetch();
    },
    onError: () => setDeletingId(null),
  });

  const captures = (data?.captures ?? []) as CaptureRow[];

  const handleDelete = (id: number) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setDeletingId(id);
    deleteCapture.mutate({ id });
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] max-w-lg mx-auto px-4 py-8 gap-6">
      <PageMeta title="Capture History — Continuary" description="Your recent voice and text captures." />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Capture History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your recent captures. Tap to re-sort or review.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate("/capture")}
          className="gap-1.5"
        >
          New capture
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "oklch(0.74 0.14 72)" }} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && captures.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Inbox className="w-10 h-10 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No captures yet.</p>
          <Button onClick={() => navigate("/capture")} variant="outline" size="sm">
            Make your first capture
          </Button>
        </div>
      )}

      {/* Captures list */}
      {captures.map((capture) => {
        const isDeleting = deletingId === capture.id;
        const isConfirming = confirmDeleteId === capture.id;
        const isPending = capture.processingState === "pending";
        const isSorted = capture.processingState === "sorted";

        return (
          <div
            key={capture.id}
            className={cn(
              "rounded-xl p-4 flex flex-col gap-3 transition-opacity",
              isDeleting && "opacity-40"
            )}
            style={{
              background: "oklch(0.135 0.030 245)",
              border: "1px solid oklch(0.215 0.030 245)",
            }}
          >
            {/* Top row */}
            <div className="flex items-start gap-3">
              {/* Mode icon */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background:
                    capture.mode === "voice"
                      ? "oklch(0.74 0.14 72 / 0.12)"
                      : "oklch(0.68 0.17 155 / 0.12)",
                }}
              >
                {capture.mode === "voice" ? (
                  <Mic className="w-3.5 h-3.5" style={{ color: "oklch(0.74 0.14 72)" }} />
                ) : (
                  <Type className="w-3.5 h-3.5" style={{ color: "oklch(0.68 0.17 155)" }} />
                )}
              </div>

              {/* Transcript preview */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                  {capture.transcript === "__pending__"
                    ? "Processing…"
                    : capture.transcript}
                </p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(capture.createdAt).toLocaleString()}
                  </span>
                  {capture.durationS && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(capture.durationS / 60)}m {capture.durationS % 60}s
                    </span>
                  )}
                  {capture.atomCount !== undefined && capture.atomCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {capture.atomCount} thought{capture.atomCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* State badge */}
              <div className="shrink-0">
                {isPending && (
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "oklch(0.74 0.14 72 / 0.12)", color: "oklch(0.74 0.14 72)" }}>
                    Unsorted
                  </span>
                )}
                {isSorted && (
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "oklch(0.68 0.17 155 / 0.12)", color: "oklch(0.68 0.17 155)" }}>
                    Sorted
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Re-sort / view sort */}
              <button
                onClick={() => navigate(`/capture/${capture.id}/sort`)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95"
                style={{
                  background: "oklch(0.175 0.030 245)",
                  color: "oklch(0.78 0.010 240)",
                  border: "1px solid oklch(0.215 0.030 245)",
                }}
              >
                {isPending ? "Sort now" : "Re-sort"}
                <ChevronRight className="w-3 h-3" />
              </button>

              {/* Delete */}
              <button
                onClick={() => handleDelete(capture.id)}
                disabled={isDeleting}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all active:scale-95",
                  isConfirming && "animate-pulse"
                )}
                style={{
                  background: isConfirming
                    ? "oklch(0.60 0.22 22 / 0.15)"
                    : "oklch(0.175 0.030 245)",
                  color: isConfirming ? "oklch(0.60 0.22 22)" : "oklch(0.54 0.016 240)",
                  border: isConfirming
                    ? "1px solid oklch(0.60 0.22 22 / 0.3)"
                    : "1px solid oklch(0.215 0.030 245)",
                }}
              >
                {isDeleting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                {isConfirming ? "Confirm delete" : "Delete"}
              </button>

              {isConfirming && (
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-xs text-muted-foreground underline underline-offset-2"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
