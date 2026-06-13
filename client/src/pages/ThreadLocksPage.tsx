/**
 * ThreadLocksPage — history of all captured Thread Locks
 *
 * Shows every interrupted thread in reverse-chronological order.
 * Each row shows: timestamp, what-doing snippet, what-next, project (if any),
 * and a status badge (active / recalled / dismissed / expired).
 */
import { trpc } from "@/lib/trpc";
import { Anchor, ChevronLeft, Clock, CheckCircle2, X, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow, format } from "date-fns";

function StatusBadge({ lock }: { lock: { recalledAt: number | null; dismissedAt: number | null; createdAt: number } }) {
  const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
  if (lock.recalledAt) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
        style={{ background: "oklch(0.20 0.06 150 / 0.4)", color: "oklch(0.70 0.12 150)", border: "1px solid oklch(0.40 0.10 150 / 0.3)" }}>
        <CheckCircle2 className="w-2.5 h-2.5" /> Recalled
      </span>
    );
  }
  if (lock.dismissedAt) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
        style={{ background: "oklch(0.18 0.02 240 / 0.4)", color: "oklch(0.55 0.03 240)", border: "1px solid oklch(0.35 0.03 240 / 0.3)" }}>
        <X className="w-2.5 h-2.5" /> Dismissed
      </span>
    );
  }
  if (lock.createdAt < fourHoursAgo) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
        style={{ background: "oklch(0.18 0.02 240 / 0.4)", color: "oklch(0.50 0.03 240)", border: "1px solid oklch(0.32 0.03 240 / 0.3)" }}>
        <Clock className="w-2.5 h-2.5" /> Expired
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: "oklch(0.12 0.04 72 / 0.5)", color: "oklch(0.74 0.14 72)", border: "1px solid oklch(0.74 0.14 72 / 0.30)" }}>
      <AlertCircle className="w-2.5 h-2.5" /> Active
    </span>
  );
}

export default function ThreadLocksPage() {
  const [, navigate] = useLocation();

  const { data: locks = [], isLoading } = trpc.threadLock.getHistory.useQuery(
    { limit: 50 },
    { staleTime: 60_000 }
  );

  const utils = trpc.useUtils();
  const recallMutation = trpc.threadLock.recall.useMutation({
    onSuccess: () => utils.threadLock.getHistory.invalidate(),
  });
  const dismissMutation = trpc.threadLock.dismiss.useMutation({
    onSuccess: () => utils.threadLock.getHistory.invalidate(),
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-xs"
          style={{ color: "oklch(0.50 0.04 240)" }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Today
        </button>
        <div className="flex items-center gap-2 ml-1">
          <Anchor className="w-4 h-4" style={{ color: "oklch(0.74 0.14 72)" }} />
          <h1 className="text-base font-semibold" style={{ color: "oklch(0.88 0.03 60)" }}>
            Thread Locks
          </h1>
        </div>
        <span className="ml-auto text-[11px]" style={{ color: "oklch(0.45 0.04 240)" }}>
          {locks.length} total
        </span>
      </div>

      {/* Explainer */}
      <p className="text-xs leading-relaxed mb-6" style={{ color: "oklch(0.50 0.04 240)" }}>
        Every time you pressed "Hold That Thread," a lock was saved here. Active locks (created within the last 4 hours) surface on your Command Center until recalled or dismissed.
      </p>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "oklch(0.14 0.02 240)" }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && locks.length === 0 && (
        <div className="text-center py-16">
          <Anchor className="w-8 h-8 mx-auto mb-3" style={{ color: "oklch(0.30 0.03 240)" }} />
          <p className="text-sm" style={{ color: "oklch(0.50 0.04 240)" }}>No threads locked yet.</p>
          <p className="text-xs mt-1" style={{ color: "oklch(0.38 0.03 240)" }}>
            Use ⌘⇧H or the capture button to save your context before an interruption.
          </p>
        </div>
      )}

      {/* Lock list */}
      {!isLoading && locks.length > 0 && (
        <div className="space-y-3">
          {locks.map((lock) => {
            const isActive = !lock.recalledAt && !lock.dismissedAt && lock.createdAt >= Date.now() - 4 * 60 * 60 * 1000;
            return (
              <div
                key={lock.id}
                className="rounded-xl border overflow-hidden"
                style={{
                  background: isActive ? "oklch(0.12 0.04 72 / 0.3)" : "oklch(0.12 0.02 240 / 0.5)",
                  borderColor: isActive ? "oklch(0.74 0.14 72 / 0.25)" : "oklch(0.22 0.02 240)",
                }}
              >
                {/* Top row */}
                <div className="flex items-start gap-3 px-4 pt-3.5 pb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug truncate" style={{ color: "oklch(0.88 0.03 60)" }}>
                      {lock.whatDoing}
                    </p>
                    <p className="text-xs mt-0.5 leading-snug" style={{ color: "oklch(0.55 0.04 240)" }}>
                      Next: {lock.whatNext}
                    </p>
                  </div>
                  <StatusBadge lock={lock} />
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 px-4 pb-3">
                  <span className="text-[10px]" style={{ color: "oklch(0.40 0.03 240)" }}>
                    {formatDistanceToNow(new Date(lock.createdAt), { addSuffix: true })} · {format(new Date(lock.createdAt), "MMM d, h:mm a")}
                  </span>
                  {lock.nextCalendarEvent && (
                    <span className="text-[10px]" style={{ color: "oklch(0.55 0.08 72)" }}>
                      📅 {lock.nextCalendarEvent}
                    </span>
                  )}
                </div>

                {/* Actions — only for active locks */}
                {isActive && (
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 border-t"
                    style={{ borderColor: "oklch(0.74 0.14 72 / 0.12)" }}
                  >
                    <button
                      onClick={() => recallMutation.mutate({ id: lock.id })}
                      disabled={recallMutation.isPending}
                      className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all active:scale-95"
                      style={{ background: "oklch(0.74 0.14 72)", color: "oklch(0.10 0.02 240)" }}
                    >
                      Pick it up →
                    </button>
                    <button
                      onClick={() => dismissMutation.mutate({ id: lock.id })}
                      className="text-xs px-3 py-1.5"
                      style={{ color: "oklch(0.45 0.04 240)" }}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
