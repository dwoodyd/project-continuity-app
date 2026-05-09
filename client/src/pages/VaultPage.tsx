import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { VaultGraph } from "@/components/VaultGraph";
import WrenPlayer from "@/components/WrenPlayer";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Download,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";

type SourceState = "inbox" | "mapped" | "parked" | "active" | "today" | "done" | "archived";

const stateConfig: Record<SourceState, { label: string; className: string }> = {
  inbox: { label: "Inbox", className: "badge-inbox" },
  mapped: { label: "Mapped", className: "badge-mapped" },
  parked: { label: "Parked", className: "badge-parked" },
  active: { label: "Active", className: "badge-active" },
  today: { label: "Today", className: "badge-today" },
  done: { label: "Done", className: "badge-done" },
  archived: { label: "Archived", className: "badge-archived" },
};

const contentClassConfig: Record<string, string> = {
  idea: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  draft: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  research: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  outline: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  decision: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  tasks: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  archive: "bg-muted text-muted-foreground",
};

const confidenceConfig: Record<string, { label: string; className: string; Icon: React.ElementType }> = {
  likely: {
    label: "Likely match",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
    Icon: CheckCircle2,
  },
  possible: {
    label: "Possible match",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
    Icon: AlertTriangle,
  },
  needs_review: {
    label: "Needs review",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
    Icon: AlertTriangle,
  },
};

// ─── Add Item Modal ───────────────────────────────────────────────────────────
function AddItemModal({
  onClose,
  onAdded,
  initialContent,
}: {
  onClose: () => void;
  onAdded: () => void;
  initialContent?: string;
}) {
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(initialContent ?? "");
  const [sourceType, setSourceType] = useState("paste");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addPaste = trpc.vault.addPaste.useMutation({
    onSuccess: () => { toast.success("Added to vault."); onAdded(); onClose(); },
    onError: () => toast.error("Failed to add item."),
  });

  const addFile = trpc.vault.addFile.useMutation({
    onSuccess: () => { toast.success("File uploaded to vault."); onAdded(); onClose(); },
    onError: () => toast.error("Failed to upload file."),
  });

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setContent(text);
        setMode("paste");
        toast.success("Clipboard content loaded.");
      } else {
        toast.info("Clipboard is empty.");
      }
    } catch {
      toast.error("Could not read clipboard. Please paste manually.");
    }
  };

  const handleSubmit = () => {
    if (mode === "paste") {
      if (!content.trim()) return;
      addPaste.mutate({ title: title || undefined, content, sourceType: sourceType as any });
    } else if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1]!;
        addFile.mutate({
          title: title || file.name,
          fileDataBase64: base64,
          mimeType: file.type,
          fileName: file.name,
          sourceType: "other",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const isPending = addPaste.isPending || addFile.isPending;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[85vh]">
        <DialogHeader className="px-5 pt-5 pb-0 shrink-0">
          <DialogTitle className="text-base font-semibold">Add to Knowledge Vault</DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Mode toggle */}
          <div className="flex gap-2">
            {[{ v: "paste", label: "Paste / Text" }, { v: "file", label: "Upload File" }].map(({ v, label }) => (
              <button
                key={v}
                onClick={() => setMode(v as any)}
                className={cn(
                  "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                  mode === v
                    ? "border-foreground/30 bg-foreground/5 text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/20"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Title <span className="font-normal">(optional)</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give it a name..."
              className="text-sm"
            />
          </div>
          {mode === "paste" ? (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Source type</label>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["paste", "text", "markdown", "chatgpt_export", "claude_export", "notion", "transcript", "url", "other"].map((t) => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Content</label>
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Clipboard className="w-3 h-3" />
                    Paste from clipboard
                  </button>
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste your content here — notes, exports, transcripts, links..."
                  className="min-h-[160px] resize-none text-sm"
                  autoFocus={!initialContent}
                />
              </div>
            </>
          ) : (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-foreground/20 hover:bg-muted/30 transition-colors"
              >
                {file ? (
                  <div>
                    <FileText className="w-8 h-8 text-foreground/40 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload PDF, DOCX, or text file</p>
                  </div>
                )}
              </button>
            </div>
          )}
        </div>
        <div className="px-5 pb-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || (mode === "paste" ? !content.trim() : !file)}
          >
            {isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Adding...</>
              : "Add to vault"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Source Item Card ────────────────────────────────────────────────────────────────
const SourceItemCard = React.memo(function SourceItemCard({
  item,
  onUpdate,
  onProcess,
  onMarkReviewed,
}: {
  item: any;
  onUpdate: () => void;
  onProcess: (id: number) => void;
  onMarkReviewed?: (id: number, projectId: number | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const updateState = trpc.vault.updateState.useMutation({
    onSuccess: onUpdate,
    onError: () => toast.error("Failed to update."),
  });

  const tags: string[] = (() => { try { return JSON.parse(item.tags ?? "[]"); } catch { return []; } })();
  const projectCandidates: string[] = (() => { try { return JSON.parse(item.projectCandidates ?? "[]"); } catch { return []; } })();
  const stateCfg = stateConfig[item.state as SourceState] ?? stateConfig.inbox;
  const confidenceCfg = item.mappingConfidence ? confidenceConfig[item.mappingConfidence] : null;

  return (
    <div className={cn(
      "bg-card border rounded-xl overflow-hidden hover:border-foreground/20 transition-colors",
      item.mappingConfidence === "needs_review"
        ? "border-amber-200/80 dark:border-amber-800/50"
        : "border-border"
    )}>
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", stateCfg.className)}>
                {stateCfg.label}
              </span>
              {item.contentClass && (
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", contentClassConfig[item.contentClass] ?? "bg-muted text-muted-foreground")}>
                  {item.contentClass}
                </span>
              )}
              {confidenceCfg && (
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border flex items-center gap-1", confidenceCfg.className)}>
                  <confidenceCfg.Icon className="w-2.5 h-2.5" />
                  {confidenceCfg.label}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{item.sourceType}</span>
            </div>
            <p className="text-sm font-medium text-foreground truncate">
              {item.title ?? `Untitled — ${format(new Date(item.createdAt), "MMM d")}`}
            </p>
            {item.summary && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
            )}
          </div>
          <ChevronRight className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform mt-0.5", expanded && "rotate-90")} />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/20">
          {item.rawContent && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Content preview</p>
              <p className="text-xs text-foreground/70 leading-relaxed line-clamp-6 font-mono bg-background rounded-lg p-3 border border-border/60">
                {item.rawContent.substring(0, 600)}{item.rawContent.length > 600 ? "..." : ""}
              </p>
            </div>
          )}
          {projectCandidates.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Suggested projects</p>
              <div className="flex flex-wrap gap-1.5">
                {projectCandidates.map((p) => (
                  <span key={p} className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Confidence review action */}
          {item.mappingConfidence === "needs_review" && onMarkReviewed && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/40">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300 flex-1">
                AI couldn't confidently map this to a project.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 border-amber-300 dark:border-amber-700"
                onClick={() => onMarkReviewed(item.id, item.projectId ?? null)}
              >
                Mark reviewed
              </Button>
            </div>
          )}
          {/* State actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {item.state === "inbox" && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 gap-1.5"
                onClick={() => onProcess(item.id)}
              >
                <Sparkles className="w-3 h-3" />
                AI Process
              </Button>
            )}
            {(["inbox", "parked"] as SourceState[]).includes(item.state) && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => updateState.mutate({ id: item.id, state: "active" })}
              >
                Set Active
              </Button>
            )}
            {item.state === "active" && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => updateState.mutate({ id: item.id, state: "done" })}
              >
                Mark Done
              </Button>
            )}
            {item.state !== "parked" && item.state !== "archived" && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7 text-muted-foreground"
                onClick={() => updateState.mutate({ id: item.id, state: "parked" })}
              >
                Park
              </Button>
            )}
            {item.state !== "archived" && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7 text-muted-foreground"
                onClick={() => updateState.mutate({ id: item.id, state: "archived" })}
              >
                Archive
              </Button>
            )}
          </div>
        </div>
      )}
     </div>
  );
});
// ─── Main Vault Page ──────────────────────────────────────────────────────────
export default function VaultPage() {
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);
  const [clipboardContent, setClipboardContent] = useState<string | undefined>(undefined);
  const [filterState, setFilterState] = useState<SourceState | "all" | "review" | "graph">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGraphItem, setSelectedGraphItem] = useState<any | null>(null);
  const { data: graphData } = trpc.vault.getGraphData.useQuery(undefined, { enabled: filterState === "graph" });
  const graphItemUpdateState = trpc.vault.updateState.useMutation({
    onSuccess: () => { refetch(); },
    onError: () => toast.error("Failed to update."),
  });
  const { data: allProjects } = trpc.projects.list.useQuery();
  const graphItemUpdateItem = trpc.vault.updateItem.useMutation({
    onSuccess: () => { refetch(); },
    onError: () => toast.error("Failed to link project."),
  });

  const { data: items, refetch } = trpc.vault.list.useQuery();
  const { data: reviewQueue, refetch: refetchReview } = trpc.vault.reviewQueue.useQuery();
  const { data: duplicateData } = trpc.vault.detectDuplicates.useQuery();

  const aiProcess = trpc.vault.aiProcess.useMutation({
    onSuccess: () => { toast.success("AI processed — tags and summary added."); refetch(); },
    onError: () => toast.error("AI processing failed."),
  });

  const markReviewed = trpc.vault.markReviewed.useMutation({
    onSuccess: () => { toast.success("Marked as reviewed."); refetch(); refetchReview(); },
    onError: () => toast.error("Failed to mark reviewed."),
  });

  const [bankruptcyOpen, setBankruptcyOpen] = useState(false);
  const inboxBankruptcy = trpc.vault.archiveBankruptcy.useMutation({
    onSuccess: (data: { archivedCount: number }) => {
      toast.success(`Inbox cleared. ${data.archivedCount} items archived.`);
      setBankruptcyOpen(false);
      refetch();
    },
    onError: () => toast.error("Inbox bankruptcy failed."),
  });

  // One-tap clipboard capture — saves directly to Vault inbox without opening modal
  const captureClipboard = trpc.vault.captureClipboard.useMutation({
    onSuccess: () => { toast.success("Saved to Vault inbox."); refetch(); },
    onError: () => toast.error("Failed to save clipboard content."),
  });

  const handleClipboardCapture = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        // One-tap: save directly to inbox, no modal needed
        captureClipboard.mutate({ text });
      } else {
        toast.info("Clipboard is empty.");
      }
    } catch {
      // Fallback: open modal without pre-filled content
      setClipboardContent(undefined);
      setAddOpen(true);
      toast.info("Open the modal and paste your content manually.");
    }
  };

  const duplicateGroups = duplicateData?.groups ?? [];
  const disconnectedIds = duplicateData?.disconnected ?? [];

  const baseFiltered = filterState === "review"
    ? (reviewQueue ?? [])
    : (items?.filter((item) =>
        filterState === "all" ? item.state !== "archived" : item.state === filterState
      ) ?? []);
  const filtered = searchQuery.trim()
    ? baseFiltered.filter((item) => {
        const q = searchQuery.toLowerCase();
        const tags: string[] = (() => { try { return JSON.parse(item.tags ?? "[]"); } catch { return []; } })();
        return (
          (item.title ?? "").toLowerCase().includes(q) ||
          (item.summary ?? "").toLowerCase().includes(q) ||
          (item.contentClass ?? "").toLowerCase().includes(q) ||
          tags.some((t) => t.toLowerCase().includes(q))
        );
      })
    : baseFiltered;

  const inboxCount = items?.filter((i) => i.state === "inbox").length ?? 0;
  const reviewCount = reviewQueue?.length ?? 0;
  const totalItems = items?.length ?? 0;
  const [graphNudgeDismissed, setGraphNudgeDismissed] = useState(() =>
    typeof window !== "undefined" ? !!localStorage.getItem("vault-graph-nudge-dismissed") : false
  );
  const showGraphNudge = totalItems >= 10 && !graphNudgeDismissed && filterState !== "graph";
  return (
    <div className="px-5 py-7 space-y-7 page-enter max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-foreground leading-tight">Knowledge Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items?.length ?? 0} items · {inboxCount} in inbox
            {reviewCount > 0 && ` · ${reviewCount} need review`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground border-border/40 hover:text-foreground shrink-0"
            title="Export as Markdown"
            onClick={async () => {
              try {
                const result = await utils.vault.exportMarkdown.fetch();
                const blob = new Blob([result.markdown], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `continuary-vault-${new Date().toISOString().slice(0,10)}.md`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Vault exported");
              } catch { toast.error("Export failed"); }
            }}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={handleClipboardCapture}
            title="Capture from clipboard"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clipboard</span>
          </Button>
          {inboxCount > 5 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0 text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/20"
              onClick={() => setBankruptcyOpen(true)}
              title="Declare inbox bankruptcy"
            >
              <span className="text-xs">🗑️</span>
              <span className="hidden sm:inline">Inbox bankruptcy</span>
            </Button>
          )}
          <Button onClick={() => { setClipboardContent(undefined); setAddOpen(true); }} size="sm" className="gap-1.5 shrink-0">
            <Plus className="w-4 h-4" />
            Add source
          </Button>
        </div>
      </div>

      {/* Graph onboarding nudge */}
      {showGraphNudge && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm" style={{ borderColor: "oklch(0.78 0.18 65 / 0.20)", background: "oklch(0.78 0.18 65 / 0.06)" }}>
          <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="2" /><circle cx="2" cy="4" r="1.5" /><circle cx="14" cy="3" r="1.5" />
            <circle cx="13" cy="13" r="1.5" /><circle cx="3" cy="13" r="1.5" />
            <line x1="8" y1="6" x2="3" y2="4.5" /><line x1="8" y1="6" x2="13" y2="4" />
            <line x1="8" y1="10" x2="12.5" y2="12" /><line x1="8" y1="10" x2="3.5" y2="12" />
          </svg>
          <p className="flex-1 text-foreground">
            <strong>Your vault is connected.</strong> You have {totalItems} items — see how they relate.
          </p>
          <button
            className="text-xs text-primary font-medium hover:underline shrink-0"
            onClick={() => setFilterState("graph")}
          >
            Open Graph →
          </button>
          <button
            className="text-xs text-muted-foreground hover:text-foreground shrink-0 ml-1"
            onClick={() => { setGraphNudgeDismissed(true); localStorage.setItem("vault-graph-nudge-dismissed", "1"); }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="4" /><line x1="10" y1="10" x2="14" y2="14" /></svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search titles, tags, summaries…"
          className="w-full pl-8 pr-8 py-2 text-sm rounded-xl bg-muted/60 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="2" y1="2" x2="14" y2="14" /><line x1="14" y1="2" x2="2" y2="14" /></svg>
          </button>
        )}
      </div>
      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {(["all", "inbox", "review", "mapped", "active", "today", "parked", "done"] as const).map((state) => (
          <button
            key={state}
            onClick={() => setFilterState(state)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filterState === state
                ? "bg-primary text-white shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {state === "all" ? "All"
              : state === "review" ? "Needs Review"
              : stateConfig[state as SourceState]?.label ?? state}
            {state === "inbox" && inboxCount > 0 && (
              <span className="ml-1.5 bg-foreground/20 text-current rounded-full px-1.5 py-0.5 text-[10px]">
                {inboxCount}
              </span>
            )}
            {state === "review" && reviewCount > 0 && (
              <span className="ml-1.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full px-1.5 py-0.5 text-[10px]">
                {reviewCount}
              </span>
            )}
          </button>
        ))}
        {/* Graph tab */}
        <button
          onClick={() => setFilterState("graph")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
            filterState === "graph"
              ? "bg-primary text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="2" />
            <circle cx="2" cy="4" r="1.5" />
            <circle cx="14" cy="3" r="1.5" />
            <circle cx="13" cy="13" r="1.5" />
            <circle cx="3" cy="13" r="1.5" />
            <line x1="8" y1="6" x2="3" y2="4.5" />
            <line x1="8" y1="6" x2="13" y2="4" />
            <line x1="8" y1="10" x2="12.5" y2="12" />
            <line x1="8" y1="10" x2="3.5" y2="12" />
          </svg>
          Graph
        </button>
      </div>

      {/* Graph view */}
      {filterState === "graph" && (
        <VaultGraph
          nodes={graphData?.nodes ?? []}
          edges={graphData?.edges ?? []}
          onNodeClick={(id, type) => {
            if (type === "item") {
              const numId = parseInt(id.replace("item-", ""), 10);
              const item = items?.find((i) => i.id === numId);
              if (item) setSelectedGraphItem(item);
            }
          }}
        />
      )}

      {/* Review queue banner (when not already on review tab) */}
      {filterState !== "review" && reviewCount > 0 && (
        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/15 border border-amber-200/60 dark:border-amber-800/40 text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          onClick={() => setFilterState("review")}
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300 flex-1">
            <strong>{reviewCount} item{reviewCount !== 1 ? "s" : ""}</strong> couldn't be confidently mapped to a project. Review them to keep your vault clean.
          </p>
          <ChevronRight className="w-4 h-4 text-amber-500 shrink-0" />
        </button>
      )}

      {/* Related notes / duplicate groups panel */}
      {duplicateGroups.length > 0 && filterState === "all" && (
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Possible related notes</p>
          <p className="text-xs text-muted-foreground">These items may belong to the same body of work. Consider linking them to a project.</p>
          <div className="space-y-1.5 mt-2">
            {duplicateGroups.slice(0, 3).map((group) => (
              <div key={group.candidate} className="flex items-center gap-2 text-xs text-foreground/80">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="font-medium">{group.candidate}</span>
                <span className="text-muted-foreground">— {group.itemIds.length} items</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disconnected notes panel */}
      {disconnectedIds.length > 0 && filterState === "all" && (
        <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-foreground">{disconnectedIds.length} note{disconnectedIds.length !== 1 ? "s" : ""} not connected to any project</p>
            <p className="text-xs text-muted-foreground mt-0.5">These items were AI-processed but no project match was found. They may represent a new project or can be archived.</p>
          </div>
        </div>
      )}

      {/* Items list */}
      {filtered.length === 0 ? (
        filterState === "all" ? (
          <div className="relative overflow-hidden rounded-2xl text-center" style={{background: 'oklch(0.08 0.02 264)', border: '1px solid rgba(255,255,255,0.06)'}}>
            {/* Amber ambient glow */}
            <div className="absolute inset-0 pointer-events-none" style={{background: 'radial-gradient(ellipse at 50% 55%, oklch(0.80 0.17 65 / 0.07) 0%, transparent 65%)'}} />
            <div className="relative flex flex-col items-center pt-8 pb-8 px-8">
              <div className="mb-5" style={{width: 'min(180px, 55vw)', aspectRatio: '9/16', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'}}>
                <WrenPlayer clip="hoversJournal" size="full" loop autoPlay />
              </div>
              <p className="text-base font-semibold text-white mb-1">Your Vault is empty.</p>
              <p className="text-sm mb-5" style={{color: 'rgba(255,255,255,0.5)'}}>Drop your first insight — notes, transcripts, or files.</p>
              <Button size="sm" onClick={() => setAddOpen(true)} className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-semibold shadow-lg shadow-black/20 border-0 gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add first source
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-xl border border-dashed border-border text-center">
            <BookOpen className="w-7 h-7 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {filterState === "review" ? "Nothing needs review." : `No ${filterState} items.`}
            </p>
            {filterState === "review" && (
              <p className="text-xs text-muted-foreground/60 mt-1">All items have been reviewed and mapped.</p>
            )}
          </div>
        )
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <SourceItemCard
              key={item.id}
              item={item}
              onUpdate={() => { refetch(); refetchReview(); }}
              onProcess={(id) => aiProcess.mutate({ id })}
              onMarkReviewed={(id, projectId) => markReviewed.mutate({ id, confirmedProjectId: projectId ?? undefined })}
            />
          ))}
        </div>
      )}

      {addOpen && (
        <AddItemModal
          onClose={() => { setAddOpen(false); setClipboardContent(undefined); }}
          onAdded={() => { refetch(); refetchReview(); }}
          initialContent={clipboardContent}
        />
      )}

      {/* Inbox Bankruptcy Confirmation Dialog */}
      {bankruptcyOpen && (
        <Dialog open onOpenChange={(v) => !v && setBankruptcyOpen(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">🗑️ Declare Inbox Bankruptcy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Archive all inbox items older than 30 days. They won’t be deleted — you can still find them in the Archived view.
              </p>
              <p className="text-sm text-foreground font-medium">
                {inboxCount} item{inboxCount !== 1 ? "s" : ""} currently in inbox.
              </p>
              <p className="text-xs text-muted-foreground/70 italic">
                This is a fresh start, not a deletion. Use it when the backlog feels overwhelming.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setBankruptcyOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                variant="outline"
                className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800"
                onClick={() => inboxBankruptcy.mutate({ olderThanDays: 30 })}
                disabled={inboxBankruptcy.isPending}
              >
                {inboxBankruptcy.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Archiving...</> : "Archive old inbox items"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Graph item detail drawer */}
      <Sheet open={!!selectedGraphItem} onOpenChange={(open) => { if (!open) setSelectedGraphItem(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selectedGraphItem && (() => {
            const item = selectedGraphItem;
            const tags: string[] = (() => { try { return JSON.parse(item.tags ?? "[]"); } catch { return []; } })();
            const projectCandidates: string[] = (() => { try { return JSON.parse(item.projectCandidates ?? "[]"); } catch { return []; } })();
            const stateCfg = stateConfig[item.state as SourceState] ?? stateConfig.inbox;
            const updateState = graphItemUpdateState;
            return (
              <div className="space-y-4 pt-2">
                <SheetHeader>
                  <SheetTitle className="text-left leading-snug">
                    {item.title ?? `Untitled — ${format(new Date(item.createdAt), "MMM d")}`}
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-wrap gap-1.5">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", stateCfg.className)}>{stateCfg.label}</span>
                  {item.contentClass && (
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", contentClassConfig[item.contentClass] ?? "bg-muted text-muted-foreground")}>{item.contentClass}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{item.sourceType}</span>
                </div>
                {item.summary && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
                )}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag: string) => (
                      <span key={tag} className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">#{tag}</span>
                    ))}
                  </div>
                )}
                {item.rawContent && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Content preview</p>
                    <p className="text-xs text-foreground/70 leading-relaxed font-mono bg-muted/40 rounded-lg p-3 border border-border/60 whitespace-pre-wrap">
                      {item.rawContent.substring(0, 800)}{item.rawContent.length > 800 ? "..." : ""}
                    </p>
                  </div>
                )}
                {projectCandidates.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Suggested projects</p>
                    <div className="flex flex-wrap gap-1.5">
                      {projectCandidates.map((p: string) => (
                        <span key={p} className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Multi-project link selector */}
                {item.type !== "project" && (() => {
                  const linkedIds: number[] = (() => { try { return JSON.parse(item.linkedProjectIds ?? "[]"); } catch { return []; } })();
                  const activeProjects = (allProjects ?? []).filter((p: any) => p.status !== "archived" && p.status !== "completed");
                  if (activeProjects.length === 0) return null;
                  return (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Link to projects</p>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {activeProjects.map((p: any) => {
                          const checked = linkedIds.includes(p.id);
                          return (
                            <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const newIds = checked
                                    ? linkedIds.filter((id) => id !== p.id)
                                    : [...linkedIds, p.id];
                                  graphItemUpdateItem.mutate({ id: item.id, linkedProjectIds: newIds });
                                  setSelectedGraphItem((prev: any) => prev ? { ...prev, linkedProjectIds: JSON.stringify(newIds) } : null);
                                }}
                                className="w-3.5 h-3.5 rounded accent-primary"
                              />
                              <span className="text-xs text-foreground group-hover:text-primary transition-colors truncate">{p.title}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {item.state === "inbox" && (
                    <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5"
                      onClick={() => { aiProcess.mutate({ id: item.id }); setSelectedGraphItem(null); }}>
                      <Sparkles className="w-3 h-3" />AI Process
                    </Button>
                  )}
                  {(["inbox", "parked"] as SourceState[]).includes(item.state) && (
                    <Button size="sm" variant="outline" className="text-xs h-7"
                      onClick={() => updateState.mutate({ id: item.id, state: "active" })}>
                      Set Active
                    </Button>
                  )}
                  {item.state === "active" && (
                    <Button size="sm" variant="outline" className="text-xs h-7"
                      onClick={() => updateState.mutate({ id: item.id, state: "done" })}>
                      Mark Done
                    </Button>
                  )}
                  {item.state !== "archived" && (
                    <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground"
                      onClick={() => { updateState.mutate({ id: item.id, state: "archived" }); setSelectedGraphItem(null); }}>
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
