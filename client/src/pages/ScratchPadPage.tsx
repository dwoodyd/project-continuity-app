import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus, Trash2, PenLine, Check, X, Pin, PinOff,
  BookOpen, Share2, CalendarPlus, Search, CheckSquare, Square,
  ArrowUpDown, LayoutTemplate,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type Note = {
  id: number;
  userId: number;
  content: string;
  pinned: boolean;
  colour: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ── Colour palette ─────────────────────────────────────────────────────────────
const COLOURS = [
  { id: "red",    dot: "#ef4444" },
  { id: "amber",  dot: "#f59e0b" },
  { id: "green",  dot: "#10b981" },
  { id: "blue",   dot: "#3b82f6" },
  { id: "purple", dot: "#8b5cf6" },
];

function colourDot(colour: string | null) {
  return COLOURS.find((c) => c.id === colour) ?? null;
}

// ── Colour picker popover ──────────────────────────────────────────────────────
function ColourPicker({ current, onChange }: { current: string | null; onChange: (c: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const dot = colourDot(current);
  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-3.5 h-3.5 rounded-full border border-border/60 transition-all hover:scale-110"
        style={{ background: dot ? dot.dot : "transparent" }} title="Set colour" aria-label="Set colour" />
      {open && (
        <div className="absolute right-0 top-5 z-50 flex items-center gap-1.5 bg-popover border border-border rounded-lg p-1.5 shadow-lg">
          {COLOURS.map(c => (
            <button key={c.id} onClick={(e) => { e.stopPropagation(); onChange(current === c.id ? null : c.id); setOpen(false); }}
              className={cn("w-4 h-4 rounded-full transition-all hover:scale-110", current === c.id && "ring-2 ring-offset-1")}
              style={{ background: c.dot }} title={c.id} />
          ))}
          {current && (
            <button onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false); }}
              className="w-4 h-4 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground" title="Clear">
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Single editable note card ─────────────────────────────────────────────────
function NoteCard({
  note, selected, selectMode,
  onSave, onDelete, onTogglePin, onSendToVault, onShareToVault, onAddToTomorrow, onSetColour, onToggleSelect,
}: {
  note: Note; selected: boolean; selectMode: boolean;
  onSave: (id: number, content: string) => void;
  onDelete: (id: number) => void;
  onTogglePin: (id: number, pinned: boolean) => void;
  onSendToVault: (id: number, content: string) => void;
  onShareToVault: (id: number, content: string) => void;
  onAddToTomorrow: (content: string) => void;
  onSetColour: (id: number, colour: string | null) => void;
  onToggleSelect: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dot = colourDot(note.colour);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  function handleSave() {
    if (draft.trim() === "") { onDelete(note.id); return; }
    onSave(note.id, draft);
    setEditing(false);
  }

  function handleCancel() { setDraft(note.content); setEditing(false); }

  function handleCardClick() {
    if (selectMode) { onToggleSelect(note.id); return; }
    setEditing(true);
  }

  return (
    <div className={cn(
      "group relative rounded-xl border bg-card transition-all",
      dot ? "border-l-[3px]" : "border-border hover:border-border/80",
      note.pinned && !dot && "border-primary/40",
      editing && "border-primary/30 shadow-sm shadow-primary/10",
      selected && "ring-2 ring-primary/50",
    )} style={dot ? { borderLeftColor: dot.dot } : undefined}>

      {/* Select checkbox */}
      {selectMode && (
        <button onClick={() => onToggleSelect(note.id)}
          className="absolute top-2 left-2 z-10 text-primary/70 hover:text-primary">
          {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-muted-foreground/40" />}
        </button>
      )}

      {note.pinned && !editing && !selectMode && (
        <div className="absolute top-2 left-2 text-primary/60"><Pin className="w-3 h-3 fill-current" /></div>
      )}

      {editing ? (
        <div className="p-3 space-y-2">
          <Textarea ref={textareaRef} value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Escape") handleCancel(); if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSave(); }}
            className="text-sm resize-none min-h-[80px] border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none" rows={4} placeholder="Write anything..." />
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 px-2 text-xs text-muted-foreground"><X className="w-3.5 h-3.5 mr-1" />Cancel</Button>
            <Button size="sm" onClick={handleSave} className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-white"><Check className="w-3.5 h-3.5 mr-1" />Save</Button>
          </div>
        </div>
      ) : (
        <button className={cn("w-full text-left p-3 pr-28", selectMode ? "pl-8" : "pl-6")} onClick={handleCardClick} aria-label="Edit note">
          <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
            {note.content || <span className="text-muted-foreground italic">Empty note</span>}
          </p>
          <p className="text-[10px] text-muted-foreground/50 mt-2">{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</p>
        </button>
      )}

      {!editing && !selectMode && (
        <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
          <ColourPicker current={note.colour} onChange={c => onSetColour(note.id, c)} />
          <button onClick={e => { e.stopPropagation(); onTogglePin(note.id, !note.pinned); }}
            className={cn("p-1.5 rounded-lg transition-all", note.pinned ? "text-primary hover:bg-primary/10" : "text-muted-foreground/40 hover:text-primary hover:bg-primary/10")}
            title={note.pinned ? "Unpin" : "Pin"}>
            {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <button onClick={e => { e.stopPropagation(); onAddToTomorrow(note.content); }}
            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all" title="Add to Tomorrow's Plan">
            <CalendarPlus className="w-3.5 h-3.5" />
          </button>
          <button onClick={e => { e.stopPropagation(); onShareToVault(note.id, note.content); }}
            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-sky-500 hover:bg-sky-500/10 transition-all" title="Share to Vault (keeps note)">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={e => { e.stopPropagation(); onSendToVault(note.id, note.content); }}
            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-amber-500 hover:bg-amber-500/10 transition-all" title="Send to Vault (removes note)">
            <BookOpen className="w-3.5 h-3.5" />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(note.id); }}
            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Note templates ────────────────────────────────────────────────────────────
const TEMPLATES = [
  { label: "Quick list",    content: "□ \n□ \n□ " },
  { label: "Brain dump",   content: "What's on my mind:\n\nActions I can take:\n\nLet go of:" },
  { label: "Meeting notes",content: "Meeting: \nDate: \nAttendees: \n\nKey points:\n- \n\nActions:\n- " },
];

// ── New note input ─────────────────────────────────────────────────────────────
function NewNoteInput({ onCreate }: { onCreate: (content: string) => void }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (open && textareaRef.current) textareaRef.current.focus(); }, [open]);
  function handleCreate() {
    if (!content.trim()) { setOpen(false); return; }
    onCreate(content.trim()); setContent(""); setOpen(false);
  }
  if (!open) return (
    <div className="flex items-center gap-2">
      <button onClick={() => setOpen(true)}
        className="flex-1 flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-primary/[0.03] text-muted-foreground hover:text-foreground transition-all text-sm">
        <Plus className="w-4 h-4 shrink-0" /><span>New note</span>
      </button>
      <div className="relative group">
        <button className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-primary/[0.03] text-muted-foreground hover:text-foreground transition-all text-xs">
          <LayoutTemplate className="w-3.5 h-3.5" /><span>Template</span>
        </button>
        <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:flex group-focus-within:flex flex-col bg-popover border border-border rounded-xl shadow-lg overflow-hidden min-w-[140px]">
          {TEMPLATES.map(t => (
            <button key={t.label} onClick={() => { onCreate(t.content); }}
              className="px-3 py-2 text-xs text-left hover:bg-muted/60 text-foreground transition-all">{t.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
  return (
    <div className="rounded-xl border border-primary/30 bg-card shadow-sm shadow-primary/10 p-3 space-y-2">
      <Textarea ref={textareaRef} value={content} onChange={e => setContent(e.target.value)}
        onKeyDown={e => { if (e.key === "Escape") { setOpen(false); setContent(""); } if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleCreate(); }}
        placeholder="Write anything..." className="text-sm resize-none min-h-[80px] border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none" rows={4} />
      <div className="flex items-center gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setContent(""); }} className="h-7 px-2 text-xs text-muted-foreground"><X className="w-3.5 h-3.5 mr-1" />Cancel</Button>
        <Button size="sm" onClick={handleCreate} className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-white"><Check className="w-3.5 h-3.5 mr-1" />Add</Button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ScratchPadPage() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [colourFilter, setColourFilter] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const { data: notes = [], isLoading } = trpc.scratchPad.list.useQuery();

  // ── Filtering + sorting ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = (notes as Note[]).slice();
    if (colourFilter) result = result.filter(n => n.colour === colourFilter);
    if (search.trim()) { const q = search.toLowerCase(); result = result.filter(n => n.content.toLowerCase().includes(q)); }
    // pinned always first, then sort by date
    result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? tb - ta : ta - tb;
    });
    return result;
  }, [notes, search, colourFilter, sortOrder]);

  // Colours actually used (for filter row)
  const usedColours = useMemo(() => {
    const used = new Set(notes.map(n => n.colour).filter(Boolean) as string[]);
    return COLOURS.filter(c => used.has(c.id));
  }, [notes]);

  // ── Select helpers ─────────────────────────────────────────────────────────
  function toggleSelect(id: number) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function exitSelectMode() { setSelectMode(false); setSelected(new Set()); }
  const allFilteredSelected = filtered.length > 0 && filtered.every(n => selected.has(n.id));
  function toggleSelectAll() {
    if (allFilteredSelected) setSelected(prev => { const next = new Set(prev); filtered.forEach(n => next.delete(n.id)); return next; });
    else setSelected(prev => { const next = new Set(prev); filtered.forEach(n => next.add(n.id)); return next; });
  }

  // ── Mutations ──────────────────────────────────────────────────────────────
  const create = trpc.scratchPad.create.useMutation({
    onMutate: async (input) => {
      await utils.scratchPad.list.cancel();
      const prev = utils.scratchPad.list.getData();
      utils.scratchPad.list.setData(undefined, (old = []) => [
        { id: -Date.now(), userId: 0, content: input.content ?? "", pinned: false, colour: null, createdAt: new Date(), updatedAt: new Date() },
        ...old,
      ]);
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) utils.scratchPad.list.setData(undefined, ctx.prev); toast.error("Could not add note."); },
    onSettled: () => utils.scratchPad.list.invalidate(),
  });

  const update = trpc.scratchPad.update.useMutation({
    onMutate: async (input) => {
      await utils.scratchPad.list.cancel();
      const prev = utils.scratchPad.list.getData();
      utils.scratchPad.list.setData(undefined, (old = []) => old.map(n => n.id === input.id ? { ...n, content: input.content, updatedAt: new Date() } : n));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) utils.scratchPad.list.setData(undefined, ctx.prev); toast.error("Could not save."); },
    onSettled: () => utils.scratchPad.list.invalidate(),
  });

  const remove = trpc.scratchPad.delete.useMutation({
    onMutate: async (input) => {
      await utils.scratchPad.list.cancel();
      const prev = utils.scratchPad.list.getData();
      utils.scratchPad.list.setData(undefined, (old = []) => old.filter(n => n.id !== input.id));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) utils.scratchPad.list.setData(undefined, ctx.prev); toast.error("Could not delete."); },
    onSettled: () => utils.scratchPad.list.invalidate(),
  });

  const togglePin = trpc.scratchPad.togglePin.useMutation({
    onMutate: async (input) => {
      await utils.scratchPad.list.cancel();
      const prev = utils.scratchPad.list.getData();
      utils.scratchPad.list.setData(undefined, (old = []) =>
        old.map(n => n.id === input.id ? { ...n, pinned: input.pinned } : n).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) utils.scratchPad.list.setData(undefined, ctx.prev); },
    onSettled: () => utils.scratchPad.list.invalidate(),
  });

  const setColour = trpc.scratchPad.setColour.useMutation({
    onMutate: async (input) => {
      await utils.scratchPad.list.cancel();
      const prev = utils.scratchPad.list.getData();
      utils.scratchPad.list.setData(undefined, (old = []) => old.map(n => n.id === input.id ? { ...n, colour: input.colour } : n));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) utils.scratchPad.list.setData(undefined, ctx.prev); },
    onSettled: () => utils.scratchPad.list.invalidate(),
  });

  const sendToVault = trpc.scratchPad.sendToVault.useMutation({
    onMutate: async (input) => {
      await utils.scratchPad.list.cancel();
      const prev = utils.scratchPad.list.getData();
      utils.scratchPad.list.setData(undefined, (old = []) => old.filter(n => n.id !== input.id));
      return { prev };
    },
    onSuccess: () => toast.success("Sent to Vault", { description: "Note removed from pad. Find it in Vault → Inbox." }),
    onError: (_e, _v, ctx) => { if (ctx?.prev) utils.scratchPad.list.setData(undefined, ctx.prev); toast.error("Could not send to Vault."); },
    onSettled: () => utils.scratchPad.list.invalidate(),
  });

  const shareToVault = trpc.scratchPad.shareToVault.useMutation({
    onSuccess: () => toast.success("Shared to Vault", { description: "A copy was added to Vault → Inbox. Note stays in pad." }),
    onError: () => toast.error("Could not share to Vault."),
  });

  const addToTomorrow = trpc.scratchPad.addToTomorrowPlan.useMutation({
    onSuccess: (data) => toast.success("Added to Tomorrow's Plan", { description: `${data.taskCount} task${data.taskCount !== 1 ? "s" : ""} planned.` }),
    onError: () => toast.error("Could not add to Tomorrow's Plan."),
  });

  // ── Bulk actions ───────────────────────────────────────────────────────────
  async function bulkDelete() {
    const ids = Array.from(selected);
    ids.forEach(id => remove.mutate({ id }));
    toast.success(`${ids.length} note${ids.length !== 1 ? "s" : ""} deleted.`);
    exitSelectMode();
  }

  async function bulkSendToVault() {
    const toSend = (notes as Note[]).filter(n => selected.has(n.id));
    toSend.forEach(n => sendToVault.mutate({ id: n.id, content: n.content }));
    toast.success(`${toSend.length} note${toSend.length !== 1 ? "s" : ""} sent to Vault.`);
    exitSelectMode();
  }

  function bulkSetColour(colour: string | null) {
    const ids = Array.from(selected);
    ids.forEach(id => setColour.mutate({ id, colour }));
    exitSelectMode();
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-primary/10"><PenLine className="w-4 h-4 text-primary" /></div>
        <div>
          <h1 className="text-base font-semibold text-foreground leading-tight">Scratch Pad</h1>
          <p className="text-xs text-muted-foreground">Quick notes, lists, anything. Not linked to projects.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {notes.length > 0 && <span className="text-xs text-muted-foreground/60">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>}
          {notes.length > 1 && (
            <button onClick={() => setSortOrder(v => v === "newest" ? "oldest" : "newest")}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-all" title={sortOrder === "newest" ? "Showing newest first" : "Showing oldest first"}>
              <ArrowUpDown className="w-3 h-3" />{sortOrder === "newest" ? "Newest" : "Oldest"}
            </button>
          )}
          {notes.length > 1 && (
            <button onClick={() => { setSelectMode(v => !v); if (selectMode) exitSelectMode(); }}
              className={cn("text-xs px-2 py-1 rounded-lg border transition-all", selectMode ? "border-primary/40 text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground")}>
              {selectMode ? "Cancel" : "Select"}
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectMode && selected.size > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border/50">
          <span className="text-xs text-muted-foreground mr-1">{selected.size} selected</span>
          <button onClick={toggleSelectAll} className="text-xs text-primary hover:underline">{allFilteredSelected ? "Deselect all" : "Select all"}</button>
          <div className="flex-1" />
          {/* Bulk colour */}
          {COLOURS.map(c => (
            <button key={c.id} onClick={() => bulkSetColour(c.id)}
              className="w-4 h-4 rounded-full hover:scale-110 transition-all" style={{ background: c.dot }} title={`Tag ${c.id}`} />
          ))}
          <button onClick={() => bulkSetColour(null)} className="text-xs text-muted-foreground hover:text-foreground px-1" title="Clear colour">✕</button>
          <button onClick={bulkSendToVault} className="text-xs text-amber-500 hover:text-amber-400 px-1.5 py-1 rounded-lg hover:bg-amber-500/10 transition-all">→ Vault</button>
          <button onClick={bulkDelete} className="text-xs text-destructive hover:text-destructive/80 px-1.5 py-1 rounded-lg hover:bg-destructive/10 transition-all">Delete</button>
        </div>
      )}

      {/* Search */}
      {notes.length >= 4 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…"
            className="pl-8 h-8 text-sm bg-muted/30 border-border/50 focus-visible:ring-0" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Colour filter row */}
      {usedColours.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Filter</span>
          {usedColours.map(c => (
            <button key={c.id} onClick={() => setColourFilter(colourFilter === c.id ? null : c.id)}
              className={cn("w-4 h-4 rounded-full transition-all hover:scale-110", colourFilter === c.id && "ring-2 ring-offset-1 ring-offset-background scale-110")}
              style={{ background: c.dot, outlineColor: c.dot }} title={`Filter by ${c.id}`} />
          ))}
          {colourFilter && (
            <button onClick={() => setColourFilter(null)} className="text-[10px] text-muted-foreground/50 hover:text-foreground ml-1">Clear</button>
          )}
        </div>
      )}

      <NewNoteInput onCreate={content => create.mutate({ content })} />

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />)}</div>
      ) : filtered.length === 0 && (search || colourFilter) ? (
        <div className="text-center py-8 text-muted-foreground/50">
          <Search className="w-6 h-6 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No notes match your filter</p>
          <button onClick={() => { setSearch(""); setColourFilter(null); }} className="text-xs text-primary mt-2 hover:underline">Clear filters</button>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground/50">
          <PenLine className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nothing here yet.</p>
          <p className="text-xs mt-1">Add a note above — no labels, no projects, just words.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(note => (
            <NoteCard key={note.id} note={note} selected={selected.has(note.id)} selectMode={selectMode}
              onSave={(id, content) => update.mutate({ id, content })}
              onDelete={id => remove.mutate({ id })}
              onTogglePin={(id, pinned) => togglePin.mutate({ id, pinned })}
              onSendToVault={(id, content) => sendToVault.mutate({ id, content })}
              onShareToVault={(id, content) => shareToVault.mutate({ id, content })}
              onAddToTomorrow={content => addToTomorrow.mutate({ content })}
              onSetColour={(id, colour) => setColour.mutate({ id, colour })}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {notes.length > 0 && !selectMode && (
        <p className="text-[10px] text-muted-foreground/40 text-center pt-2">
          Hover a note: colour · pin · add to tomorrow · share to vault · send to vault · delete
        </p>
      )}
    </div>
  );
}
