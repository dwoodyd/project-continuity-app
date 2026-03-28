import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Brain,
  ChevronRight,
  FileText,
  Filter,
  Loader2,
  Plus,
  Sparkles,
  Tag,
  Upload,
  X,
} from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  idea: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  draft: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  research: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  outline: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  decision: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  tasks: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  archive: "bg-muted text-muted-foreground",
};

// ─── Add Item Modal ───────────────────────────────────────────────────────────
function AddItemModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
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

  const handleSubmit = async () => {
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
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-base font-semibold">Add to Knowledge Vault</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            {[{ v: "paste", label: "Paste / Text" }, { v: "file", label: "Upload File" }].map(({ v, label }) => (
              <button
                key={v}
                onClick={() => setMode(v as any)}
                className={cn(
                  "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                  mode === v ? "border-foreground/30 bg-foreground/5 text-foreground" : "border-border text-muted-foreground hover:border-foreground/20"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title <span className="font-normal">(optional)</span></label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give it a name..." className="text-sm" />
          </div>

          {mode === "paste" ? (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Source type</label>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["paste", "text", "markdown", "chatgpt_export", "claude_export", "notion", "transcript", "url", "other"].map((t) => (
                      <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Content</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste your content here — notes, exports, transcripts, links..."
                  className="min-h-[160px] resize-none text-sm"
                  autoFocus
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
            {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Adding...</> : "Add to vault"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Source Item Card ─────────────────────────────────────────────────────────
function SourceItemCard({ item, onUpdate, onProcess }: {
  item: any;
  onUpdate: () => void;
  onProcess: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const updateState = trpc.vault.updateState.useMutation({ onSuccess: onUpdate });

  const tags: string[] = item.tags ? JSON.parse(item.tags) : [];
  const projectCandidates: string[] = item.projectCandidates ? JSON.parse(item.projectCandidates) : [];
  const stateCfg = stateConfig[item.state as SourceState] ?? stateConfig.inbox;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-foreground/20 transition-colors">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
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
}

// ─── Main Vault Page ──────────────────────────────────────────────────────────
export default function VaultPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [filterState, setFilterState] = useState<SourceState | "all">("all");

  const { data: items, refetch } = trpc.vault.list.useQuery();
  const aiProcess = trpc.vault.aiProcess.useMutation({
    onSuccess: () => { toast.success("AI processed — tags and summary added."); refetch(); },
    onError: () => toast.error("AI processing failed."),
  });

  const filtered = items?.filter((item) =>
    filterState === "all" ? item.state !== "archived" : item.state === filterState
  ) ?? [];

  const inboxCount = items?.filter((i) => i.state === "inbox").length ?? 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Knowledge Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items?.length ?? 0} items · {inboxCount} in inbox
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" />
          Add source
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {(["all", "inbox", "mapped", "active", "today", "parked", "done"] as const).map((state) => (
          <button
            key={state}
            onClick={() => setFilterState(state)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filterState === state
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {state === "all" ? "All" : stateConfig[state].label}
            {state === "inbox" && inboxCount > 0 && (
              <span className="ml-1.5 bg-foreground/20 text-current rounded-full px-1.5 py-0.5 text-[10px]">
                {inboxCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Items */}
      {filtered.length === 0 ? (
        <div className="p-10 rounded-xl border border-dashed border-border text-center">
          <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            {filterState === "all" ? "Vault is empty." : `No ${filterState} items.`}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Import notes, exports, transcripts, or files to start building your knowledge base.
          </p>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add first source
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <SourceItemCard
              key={item.id}
              item={item}
              onUpdate={refetch}
              onProcess={(id) => aiProcess.mutate({ id })}
            />
          ))}
        </div>
      )}

      {addOpen && <AddItemModal onClose={() => setAddOpen(false)} onAdded={refetch} />}
    </div>
  );
}
