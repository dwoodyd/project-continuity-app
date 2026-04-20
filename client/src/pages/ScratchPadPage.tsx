import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, PenLine, Check, X, Pin, PinOff, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type Note = {
  id: number;
  userId: number;
  content: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ── Single editable note card ─────────────────────────────────────────────────
function NoteCard({
  note,
  onSave,
  onDelete,
  onTogglePin,
  onSendToVault,
}: {
  note: Note;
  onSave: (id: number, content: string) => void;
  onDelete: (id: number) => void;
  onTogglePin: (id: number, pinned: boolean) => void;
  onSendToVault: (id: number, content: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  function handleCancel() {
    setDraft(note.content);
    setEditing(false);
  }

  return (
    <div className={cn(
      "group relative rounded-xl border bg-card transition-all",
      note.pinned ? "border-primary/40" : "border-border hover:border-border/80",
      editing && "border-primary/30 shadow-sm shadow-primary/10"
    )}>
      {note.pinned && !editing && (
        <div className="absolute top-2 left-2 text-primary/60">
          <Pin className="w-3 h-3 fill-current" />
        </div>
      )}

      {editing ? (
        <div className="p-3 space-y-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") handleCancel();
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSave();
            }}
            className="text-sm resize-none min-h-[80px] border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
            placeholder="Write anything..."
            rows={4}
          />
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 px-2 text-xs text-muted-foreground">
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-white">
              <Check className="w-3.5 h-3.5 mr-1" /> Save
            </Button>
          </div>
        </div>
      ) : (
        <button className="w-full text-left p-3 pl-6 pr-24" onClick={() => setEditing(true)} aria-label="Edit note">
          <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
            {note.content || <span className="text-muted-foreground italic">Empty note</span>}
          </p>
          <p className="text-[10px] text-muted-foreground/50 mt-2">
            {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
          </p>
        </button>
      )}

      {/* Action buttons — visible on hover when not editing */}
      {!editing && (
        <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin(note.id, !note.pinned); }}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              note.pinned
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground/40 hover:text-primary hover:bg-primary/10"
            )}
            aria-label={note.pinned ? "Unpin note" : "Pin note"}
            title={note.pinned ? "Unpin" : "Pin to top"}
          >
            {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSendToVault(note.id, note.content); }}
            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-amber-500 hover:bg-amber-500/10 transition-all"
            aria-label="Send to Vault"
            title="Send to Knowledge Vault"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
            aria-label="Delete note"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── New note input ─────────────────────────────────────────────────────────────
function NewNoteInput({ onCreate }: { onCreate: (content: string) => void }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus();
  }, [open]);

  function handleCreate() {
    if (!content.trim()) { setOpen(false); return; }
    onCreate(content.trim());
    setContent("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-primary/[0.03] text-muted-foreground hover:text-foreground transition-all text-sm"
      >
        <Plus className="w-4 h-4 shrink-0" />
        <span>New note</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-card shadow-sm shadow-primary/10 p-3 space-y-2">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); setContent(""); }
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleCreate();
        }}
        placeholder="Write anything..."
        className="text-sm resize-none min-h-[80px] border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
        rows={4}
      />
      <div className="flex items-center gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setContent(""); }} className="h-7 px-2 text-xs text-muted-foreground">
          <X className="w-3.5 h-3.5 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={handleCreate} className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-white">
          <Check className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ScratchPadPage() {
  const utils = trpc.useUtils();
  const { data: notes = [], isLoading } = trpc.scratchPad.list.useQuery();

  const create = trpc.scratchPad.create.useMutation({
    onMutate: async (input) => {
      await utils.scratchPad.list.cancel();
      const prev = utils.scratchPad.list.getData();
      utils.scratchPad.list.setData(undefined, (old = []) => [
        { id: -Date.now(), userId: 0, content: input.content ?? "", pinned: false, createdAt: new Date(), updatedAt: new Date() },
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
      utils.scratchPad.list.setData(undefined, (old = []) =>
        old.map((n) => n.id === input.id ? { ...n, content: input.content, updatedAt: new Date() } : n)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) utils.scratchPad.list.setData(undefined, ctx.prev); toast.error("Could not save note."); },
    onSettled: () => utils.scratchPad.list.invalidate(),
  });

  const remove = trpc.scratchPad.delete.useMutation({
    onMutate: async (input) => {
      await utils.scratchPad.list.cancel();
      const prev = utils.scratchPad.list.getData();
      utils.scratchPad.list.setData(undefined, (old = []) => old.filter((n) => n.id !== input.id));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) utils.scratchPad.list.setData(undefined, ctx.prev); toast.error("Could not delete note."); },
    onSettled: () => utils.scratchPad.list.invalidate(),
  });

  const togglePin = trpc.scratchPad.togglePin.useMutation({
    onMutate: async (input) => {
      await utils.scratchPad.list.cancel();
      const prev = utils.scratchPad.list.getData();
      utils.scratchPad.list.setData(undefined, (old = []) =>
        old.map((n) => n.id === input.id ? { ...n, pinned: input.pinned } : n)
          .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) utils.scratchPad.list.setData(undefined, ctx.prev); },
    onSettled: () => utils.scratchPad.list.invalidate(),
  });

  const sendToVault = trpc.scratchPad.sendToVault.useMutation({
    onMutate: async (input) => {
      await utils.scratchPad.list.cancel();
      const prev = utils.scratchPad.list.getData();
      utils.scratchPad.list.setData(undefined, (old = []) => old.filter((n) => n.id !== input.id));
      return { prev };
    },
    onSuccess: () => toast.success("Sent to Knowledge Vault", { description: "Find it in Vault → Inbox." }),
    onError: (_e, _v, ctx) => { if (ctx?.prev) utils.scratchPad.list.setData(undefined, ctx.prev); toast.error("Could not send to Vault."); },
    onSettled: () => utils.scratchPad.list.invalidate(),
  });

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-primary/10">
          <PenLine className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground leading-tight">Scratch Pad</h1>
          <p className="text-xs text-muted-foreground">Quick notes, lists, anything. Not linked to projects.</p>
        </div>
        {notes.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground/60">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      <NewNoteInput onCreate={(content) => create.mutate({ content })} />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground/50">
          <PenLine className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nothing here yet.</p>
          <p className="text-xs mt-1">Add a note above — no labels, no projects, just words.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onSave={(id, content) => update.mutate({ id, content })}
              onDelete={(id) => remove.mutate({ id })}
              onTogglePin={(id, pinned) => togglePin.mutate({ id, pinned })}
              onSendToVault={(id, content) => sendToVault.mutate({ id, content })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
