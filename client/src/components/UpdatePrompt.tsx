/**
 * UpdatePrompt — gentle update notification in Continuary's voice.
 *
 * Shown once per new version. Never forced mid-session.
 * The user chooses when to refresh.
 */

import { useCallback, useState } from "react";
import { useAppVersion } from "@/hooks/useAppVersion";
import { Sparkles, X } from "lucide-react";

export function UpdatePrompt() {
  const [visible, setVisible] = useState(false);
  const [applyFn, setApplyFn] = useState<(() => void) | null>(null);

  const handleUpdateReady = useCallback((apply: () => void) => {
    setApplyFn(() => apply);
    setVisible(true);
  }, []);

  useAppVersion(handleUpdateReady);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border border-amber-500/30 bg-[#0C1322]/95 backdrop-blur-md text-sm text-amber-100 max-w-sm w-[calc(100vw-2rem)]"
      style={{ fontFamily: "'DM Mono', 'DM Sans', monospace" }}
    >
      <Sparkles className="shrink-0 text-amber-400" size={16} />
      <span className="flex-1 leading-snug">
        A fresh version is ready.{" "}
        <button
          onClick={() => applyFn?.()}
          className="underline underline-offset-2 decoration-amber-400/60 text-amber-300 hover:text-amber-200 transition-colors font-medium"
        >
          Refresh when you're ready.
        </button>
      </span>
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss update prompt"
        className="shrink-0 text-amber-500/60 hover:text-amber-300 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
