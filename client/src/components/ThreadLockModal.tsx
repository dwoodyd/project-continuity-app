/**
 * ThreadLockModal — "Hold That Thread"
 *
 * A two-prompt capture sheet that freezes the user's current context so they
 * can return to exactly where they left off after an interruption.
 *
 * Prompts:
 *   1. "What are you in the middle of?"
 *   2. "What were you about to do next?"
 *
 * Optional: project picker, clipboard paste, next calendar event auto-shown.
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Anchor, ChevronDown, Loader2, Clipboard, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";

interface ThreadLockModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ThreadLockModal({ open, onClose }: ThreadLockModalProps) {
  const [location] = useLocation();
  const [whatDoing, setWhatDoing] = useState("");
  const [whatNext, setWhatNext] = useState("");
  const [projectId, setProjectId] = useState<number | undefined>(undefined);
  const [clipboardSnippet, setClipboardSnippet] = useState("");
  const [showClipboard, setShowClipboard] = useState(false);
  const [saved, setSaved] = useState(false);
  const doingRef = useRef<HTMLTextAreaElement>(null);

  // Load active projects for picker
  const { data: activeProjects = [] } = trpc.projects.listActive.useQuery(undefined, {
    staleTime: 60_000,
    enabled: open,
  });

  // Load next calendar event if calendar is connected
  const { data: calendarData } = trpc.calendar.getWeekEvents.useQuery(undefined, {
    staleTime: 5 * 60_000,
    enabled: open,
  });
  const nextEvent = (() => {
    if (!calendarData?.events?.length) return null;
    const now = Date.now();
    const upcoming = calendarData.events
      .filter((e: { start: string | number }) => new Date(e.start).getTime() > now)
      .sort((a: { start: string | number }, b: { start: string | number }) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const next = upcoming[0];
    if (!next) return null;
    const diffMs = new Date(next.start).getTime() - now;
    const diffMin = Math.round(diffMs / 60_000);
    if (diffMin > 120) return null; // only show if within 2 hours
    return `${next.summary ?? "Meeting"} in ${diffMin}m`;
  })();

  const utils = trpc.useUtils();

  const captureMutation = trpc.threadLock.capture.useMutation({
    onSuccess: () => {
      setSaved(true);
      utils.threadLock.getActive.invalidate();
      setTimeout(() => {
        setSaved(false);
        handleClose();
      }, 1200);
    },
    onError: () => toast.error("Couldn't lock the thread — try again."),
  });

  function handleClose() {
    setWhatDoing("");
    setWhatNext("");
    setProjectId(undefined);
    setClipboardSnippet("");
    setShowClipboard(false);
    setSaved(false);
    onClose();
  }

  // Auto-focus first field when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => doingRef.current?.focus(), 80);
    }
  }, [open]);

  // Cmd/Ctrl+Enter to submit
  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  }

  async function handlePasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setClipboardSnippet(text.slice(0, 2000));
        setShowClipboard(true);
      } else {
        toast.info("Nothing in the clipboard.");
      }
    } catch {
      setShowClipboard(true); // let user type it manually
    }
  }

  function handleSave() {
    const doing = whatDoing.trim();
    const next = whatNext.trim();
    if (!doing || !next) {
      toast.error("Two things needed.", { description: "What are you doing, and what's next?" });
      return;
    }
    captureMutation.mutate({
      whatDoing: doing,
      whatNext: next,
      projectId,
      clipboardSnippet: clipboardSnippet.trim() || undefined,
      nextCalendarEvent: nextEvent ?? undefined,
      pagePath: location,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-md w-full rounded-2xl border-0 p-0 overflow-hidden"
        style={{ background: "oklch(0.10 0.02 240)", color: "oklch(0.92 0.03 60)" }}
      >
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-2 mb-1">
            <Anchor className="w-4 h-4" style={{ color: "oklch(0.74 0.14 72)" }} />
            <DialogTitle className="text-sm font-semibold tracking-wide" style={{ color: "oklch(0.74 0.14 72)" }}>
              Hold That Thread
            </DialogTitle>
          </div>
          <p className="text-[11px]" style={{ color: "oklch(0.45 0.04 240)" }}>
            Capture your context now. Pick it back up when you're ready.
          </p>
        </DialogHeader>

        <div className="px-6 py-5 flex flex-col gap-4" onKeyDown={handleKeyDown}>
          {/* Field 1 — What are you in the middle of? */}
          <div>
            <label className="text-[11px] uppercase tracking-widest mb-1.5 block" style={{ color: "oklch(0.50 0.04 240)" }}>
              What are you in the middle of?
            </label>
            <Textarea
              ref={doingRef}
              value={whatDoing}
              onChange={(e) => setWhatDoing(e.target.value)}
              placeholder="Writing the intro section of the proposal…"
              rows={2}
              maxLength={1000}
              className="resize-none text-sm border-0 rounded-xl"
              style={{ background: "oklch(0.14 0.03 240)", color: "oklch(0.88 0.03 60)" }}
            />
          </div>

          {/* Field 2 — What were you about to do next? */}
          <div>
            <label className="text-[11px] uppercase tracking-widest mb-1.5 block" style={{ color: "oklch(0.50 0.04 240)" }}>
              What were you about to do next?
            </label>
            <Textarea
              value={whatNext}
              onChange={(e) => setWhatNext(e.target.value)}
              placeholder="Find the Q3 numbers and paste them into section 2…"
              rows={2}
              maxLength={1000}
              className="resize-none text-sm border-0 rounded-xl"
              style={{ background: "oklch(0.14 0.03 240)", color: "oklch(0.88 0.03 60)" }}
            />
          </div>

          {/* Optional: project picker */}
          {activeProjects.length > 0 && (
            <div>
              <label className="text-[11px] uppercase tracking-widest mb-1.5 block" style={{ color: "oklch(0.50 0.04 240)" }}>
                Project (optional)
              </label>
              <div className="relative">
                <select
                  value={projectId ?? ""}
                  onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full text-sm rounded-xl px-3 py-2.5 pr-8 appearance-none border-0 outline-none"
                  style={{ background: "oklch(0.14 0.03 240)", color: "oklch(0.88 0.03 60)" }}
                >
                  <option value="">No project</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "oklch(0.45 0.04 240)" }} />
              </div>
            </div>
          )}

          {/* Optional: next calendar event */}
          {nextEvent && (
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs"
              style={{ background: "oklch(0.13 0.04 72 / 0.3)", border: "1px solid oklch(0.35 0.10 72 / 0.3)", color: "oklch(0.72 0.12 72)" }}
            >
              <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Coming up: <strong>{nextEvent}</strong> — will be attached</span>
            </div>
          )}

          {/* Optional: clipboard snippet */}
          {!showClipboard ? (
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="flex items-center gap-1.5 text-xs self-start"
              style={{ color: "oklch(0.45 0.04 240)" }}
            >
              <Clipboard className="w-3 h-3" />
              Attach clipboard text
            </button>
          ) : (
            <div>
              <label className="text-[11px] uppercase tracking-widest mb-1.5 block" style={{ color: "oklch(0.50 0.04 240)" }}>
                Clipboard / context snippet (optional)
              </label>
              <Textarea
                value={clipboardSnippet}
                onChange={(e) => setClipboardSnippet(e.target.value)}
                placeholder="Paste any relevant text, URL, or notes…"
                rows={2}
                maxLength={2000}
                className="resize-none text-xs border-0 rounded-xl"
                style={{ background: "oklch(0.14 0.03 240)", color: "oklch(0.88 0.03 60)" }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="flex-1 text-xs"
              style={{ color: "oklch(0.50 0.04 240)" }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={captureMutation.isPending || saved || !whatDoing.trim() || !whatNext.trim()}
              className="flex-1 text-xs font-semibold"
              style={{ background: "oklch(0.74 0.14 72)", color: "oklch(0.10 0.02 240)" }}
            >
              {captureMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saved ? (
                "Thread locked ✓"
              ) : (
                "Lock thread"
              )}
            </Button>
          </div>
          <p className="text-[10px] text-center" style={{ color: "oklch(0.35 0.03 240)" }}>
            ⌘⇧L from anywhere · ⌘↩ to save
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
