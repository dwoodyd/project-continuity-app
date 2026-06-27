import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { BookOpen, Check, ChevronRight } from "lucide-react";
import { useState } from "react";
import { notify } from "@/lib/notify";

// ── Types ─────────────────────────────────────────────────────────────────────
type Chapter = {
  key: string;
  part: string;
  title: string;
};

// ── Part header ───────────────────────────────────────────────────────────────
function PartHeader({ label }: { label: string }) {
  return (
    <div className="pt-5 pb-1 px-1">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </p>
    </div>
  );
}

// ── Chapter row ───────────────────────────────────────────────────────────────
function ChapterRow({
  chapter,
  selected,
  onSelect,
}: {
  chapter: Chapter;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
        selected
          ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
          : "hover:bg-white/5 text-foreground/80 hover:text-foreground border border-transparent"
      )}
    >
      <span
        className={cn(
          "flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all",
          selected
            ? "border-amber-500 bg-amber-500"
            : "border-muted-foreground/30"
        )}
      >
        {selected && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
      </span>
      <span className="text-sm leading-snug">{chapter.title}</span>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReadingBridgePage() {
  const { data, isLoading, refetch } = trpc.readingBridge.get.useQuery();
  const setChapter = trpc.readingBridge.set.useMutation({
    onSuccess: () => refetch(),
  });

  const [pending, setPending] = useState<string | null>(null);

  const handleSelect = async (key: string | null, finished = false) => {
    setPending(key ?? (finished ? "__finished__" : "__dismiss__"));
    await setChapter.mutateAsync({
      chapter: finished ? null : key,
      finished,
      dismissed: false,
    });
    setPending(null);
    if (finished) {
      notify.saved("Got it.", { description: "Wren can reference any part of the book now." });
    } else if (key) {
      notify.saved("Got it. I'll keep that in mind.", { description: "Wren will reference this when it's relevant." });
    }
  };

  const handleDismiss = async () => {
    setPending("__dismiss__");
    await setChapter.mutateAsync({ dismissed: true });
    setPending(null);
    notify.info("Reading Bridge hidden.", { description: "You can re-enable it from Settings if you change your mind." });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-5 h-5 rounded-full border-2 border-amber-500/40 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  const chapters: Chapter[] = (data?.chapters as unknown as Chapter[]) ?? [];
  const currentChapter = data?.chapter ?? null;
  const isFinished = data?.finished ?? false;

  // Group chapters by part
  const parts: { label: string; items: Chapter[] }[] = [];
  for (const ch of chapters) {
    const last = parts[parts.length - 1];
    if (!last || last.label !== ch.part) {
      parts.push({ label: ch.part, items: [ch] });
    } else {
      last.items.push(ch);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <BookOpen className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Reading Bridge</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tell Wren where you are in{" "}
            <span className="italic text-foreground/70">Permission to Start</span>.
            She'll reference it when it's relevant — not constantly.
          </p>
        </div>
      </div>

      {/* Current state summary */}
      {(currentChapter || isFinished) && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-amber-500/8 border border-amber-500/20 text-sm text-amber-300/90">
          {isFinished
            ? "You've finished the book. Wren can reference any chapter freely."
            : `Currently reading: ${chapters.find(c => c.key === currentChapter)?.title ?? currentChapter}`}
        </div>
      )}

      {/* Chapter list */}
      <div className="space-y-0.5">
        {parts.map((part) => (
          <div key={part.label}>
            <PartHeader label={part.label} />
            <div className="space-y-0.5">
              {part.items.map((ch) => (
                <ChapterRow
                  key={ch.key}
                  chapter={ch}
                  selected={!isFinished && currentChapter === ch.key}
                  onSelect={() => handleSelect(ch.key)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Finished the book */}
        <div className="pt-4">
          <button
            onClick={() => handleSelect(null, true)}
            disabled={setChapter.isPending}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all border",
              isFinished
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "border-dashed border-muted-foreground/20 text-muted-foreground hover:text-foreground hover:border-amber-500/30 hover:bg-amber-500/5"
            )}
          >
            <span
              className={cn(
                "flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center",
                isFinished ? "border-amber-500 bg-amber-500" : "border-muted-foreground/30"
              )}
            >
              {isFinished && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
            </span>
            <span className="text-sm">Finished the book ✓</span>
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="my-6 border-t border-border/40" />

      {/* Not reading it */}
      <button
        onClick={handleDismiss}
        disabled={setChapter.isPending || pending === "__dismiss__"}
        className="w-full text-center text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors py-2"
      >
        Not reading it — hide this
      </button>

      <p className="text-center text-xs text-muted-foreground/30 mt-3">
        You can always return here from the sidebar.
      </p>
    </div>
  );
}
