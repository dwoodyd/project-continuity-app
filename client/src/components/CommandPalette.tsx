import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Archive,
  FolderOpen,
  Calendar,
  Compass,
  Brain,
  BookOpen,
  BarChart2,
  Settings,
  Sparkles,
  Zap,
  Moon,
  Sun,
  Search,
  Star,
  Shield,
  ClipboardList,
  FileText,
  FolderKanban,
  PenLine,
  ScrollText,
  Mic,
  Repeat,
  Anchor,
  Heart,
  Users,
  Lightbulb,
  GraduationCap,
  Ticket,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

interface CommandPaletteProps {
  /** Called when the user triggers a quick action (e.g. open morning check-in) */
  onAction?: (action: string) => void;
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Today", path: "/", group: "Navigate", shortcut: "G H" },
  { icon: Mic, label: "Capture", path: "/capture", group: "Navigate" },
  { icon: ClipboardList, label: "Single Focus Mode", path: "/study", group: "Navigate" },
  { icon: Users, label: "Focus Sessions", path: "/focus", group: "Navigate" },
  { icon: FolderOpen, label: "Projects", path: "/projects", group: "Navigate", shortcut: "G P" },
  { icon: Repeat, label: "Open Loops", path: "/loops", group: "Navigate" },
  { icon: Sparkles, label: "Ideas", path: "/ideas", group: "Navigate" },
  { icon: Anchor, label: "Thread Locks", path: "/thread-locks", group: "Navigate" },
  { icon: Brain, label: "Clarity Engine", path: "/clarity", group: "Navigate", shortcut: "G L" },
  { icon: Compass, label: "Weekly Compass", path: "/compass", group: "Navigate", shortcut: "G C" },
  { icon: Heart, label: "Emotional Cycle", path: "/emotional-cycle", group: "Navigate" },
  { icon: ScrollText, label: "Evidence Log", path: "/evidence", group: "Navigate", shortcut: "G E" },
  { icon: BookOpen, label: "Reading Bridge", path: "/reading-bridge", group: "Navigate" },
  { icon: Archive, label: "Knowledge Vault", path: "/vault", group: "Navigate", shortcut: "G V" },
  { icon: PenLine, label: "Scratch Pad", path: "/scratch", group: "Navigate" },
  { icon: Calendar, label: "Weekly Review", path: "/weekly", group: "Navigate", shortcut: "G W" },
  { icon: Lightbulb, label: "Intelligence", path: "/intelligence", group: "Navigate", shortcut: "G I" },
  { icon: Settings, label: "Settings", path: "/settings", group: "Navigate" },
  { icon: GraduationCap, label: "Take the Tour", path: "/tour", group: "Navigate" },
  { icon: Ticket, label: "Pricing", path: "/pro", group: "Navigate" },
  { icon: Star, label: "Founding Member", path: "/founding-member", group: "Navigate" },
];

const QUICK_ACTIONS = [
  { icon: Sun, label: "Morning Check-in", action: "morning-checkin", group: "Quick Actions" },
  { icon: Moon, label: "Evening close", action: "evening-checkin", group: "Quick Actions" },
  { icon: Sparkles, label: "Brain Dump (Clarity Engine)", action: "brain-dump", group: "Quick Actions" },
  { icon: Zap, label: "Idea Sanctuary", action: "idea-sanctuary", group: "Quick Actions" },
  { icon: Search, label: "Threshold Diagnosis", action: "threshold-diagnosis", group: "Quick Actions" },
];

/** Shared inner dialog content — used by both CommandPalette and CommandPaletteTrigger */
function CommandPaletteContent({
  open,
  setOpen,
  onAction,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onAction?: (action: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Fetch vault entries, scratch pad notes, and projects when the palette is open
  const { data: vaultEntries } = trpc.vault.list.useQuery(undefined, {
    enabled: open && !!user,
    staleTime: 30_000,
  });
  const { data: scratchNotes } = trpc.scratchPad.list.useQuery(undefined, {
    enabled: open && !!user,
    staleTime: 30_000,
  });
  const { data: projects } = trpc.projects.list.useQuery(undefined, {
    enabled: open && !!user,
    staleTime: 30_000,
  });

  // Filter vault entries by query (title + contentClass)
  const filteredVault = useMemo(() => {
    if (!vaultEntries || !query.trim()) return [];
    const q = query.toLowerCase();
    return vaultEntries
      .filter((e: any) =>
        e.title?.toLowerCase().includes(q) ||
        e.contentClass?.toLowerCase().includes(q) ||
        e.summary?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [vaultEntries, query]);

  // Filter scratch notes by content
  const filteredScratch = useMemo(() => {
    if (!scratchNotes || !query.trim()) return [];
    const q = query.toLowerCase();
    return (scratchNotes as any[])
      .filter((n: any) => n.content?.toLowerCase().includes(q))
      .slice(0, 4);
  }, [scratchNotes, query]);

  // Filter projects by title, description, and tags
  const filteredProjects = useMemo(() => {
    if (!projects || !query.trim()) return [];
    const q = query.toLowerCase();
    return (projects as any[])
      .filter((p: any) =>
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some((t: string) => t.toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [projects, query]);

  const handleNav = (path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  const handleAction = (action: string) => {
    setOpen(false);
    setQuery("");
    onAction?.(action);
    if (!onAction) {
      const fallbackMap: Record<string, string> = {
        "brain-dump": "/clarity",
        "threshold-diagnosis": "/clarity",
        "morning-checkin": "/",
        "evening-checkin": "/",
        "idea-sanctuary": "/vault",
      };
      if (fallbackMap[action]) navigate(fallbackMap[action]);
    }
  };

  const showContentResults = query.trim().length > 0 && (filteredVault.length > 0 || filteredScratch.length > 0 || filteredProjects.length > 0);

  return (
    <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
      <CommandInput
        placeholder="Search pages, vault entries, notes…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* ── Content search results (only when query is non-empty) ── */}
        {showContentResults && (
          <>
            {filteredProjects.length > 0 && (
              <CommandGroup heading="Projects">
                {filteredProjects.map((project: any) => (
                  <CommandItem
                    key={`project-${project.id}`}
                    value={`project-${project.id}-${project.title}`}
                    onSelect={() => handleNav(`/projects/${project.id}`)}
                    className="gap-2 cursor-pointer"
                  >
                    <FolderKanban className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="block truncate">{project.title || "Untitled"}</span>
                      {project.status && (
                        <span className="text-xs text-muted-foreground capitalize">{project.status}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {filteredVault.length > 0 && (
              <CommandGroup heading="Knowledge Vault">
                {filteredVault.map((entry: any) => (
                  <CommandItem
                    key={`vault-${entry.id}`}
                    value={`vault-${entry.id}-${entry.title}`}
                    onSelect={() => handleNav(`/vault?entry=${entry.id}`)}
                    className="gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="block truncate">{entry.title || "Untitled"}</span>
                      {entry.contentClass && (
                        <span className="text-xs text-muted-foreground capitalize">{entry.contentClass}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {filteredScratch.length > 0 && (
              <CommandGroup heading="Scratch Pad">
                {filteredScratch.map((note: any) => (
                  <CommandItem
                    key={`scratch-${note.id}`}
                    value={`scratch-${note.id}-${note.content}`}
                    onSelect={() => handleNav("/scratch")}
                    className="gap-2 cursor-pointer"
                  >
                    <PenLine className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate text-sm">{note.content?.slice(0, 60) || "Empty note"}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigate">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.path}
              value={item.label}
              onSelect={() => handleNav(item.path)}
              className="gap-2 cursor-pointer"
            >
              <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>{item.label}</span>
              {item.shortcut && (
                <CommandShortcut>{item.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          {QUICK_ACTIONS.map((item) => (
            <CommandItem
              key={item.action}
              value={item.label}
              onSelect={() => handleAction(item.action)}
              className="gap-2 cursor-pointer"
            >
              <item.icon className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {user?.role === "admin" && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Admin">
              <CommandItem value="Admin: Applications" onSelect={() => handleNav("/admin/applications")} className="gap-2 cursor-pointer">
                <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>Applications</span>
              </CommandItem>
              <CommandItem value="Admin: Invite Codes" onSelect={() => handleNav("/admin/invites")} className="gap-2 cursor-pointer">
                <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>Invite Codes</span>
              </CommandItem>
              <CommandItem value="Admin: Feedback" onSelect={() => handleNav("/admin/feedback")} className="gap-2 cursor-pointer">
                <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>Feedback</span>
              </CommandItem>
              <CommandItem value="Admin: Beta Codes" onSelect={() => handleNav("/admin/beta")} className="gap-2 cursor-pointer">
                <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>Beta Codes</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function CommandPalette({ onAction }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "F1") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return <CommandPaletteContent open={open} setOpen={setOpen} onAction={onAction} />;
}

/** Small trigger button that opens the command palette on click */
export function CommandPaletteTrigger({ onAction }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "F1") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card/60 text-muted-foreground text-sm hover:bg-accent/60 hover:text-foreground transition-all duration-150 group"
        title="Open command palette (⌘K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="text-xs">Search…</span>
        <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-log bg-muted rounded border border-border text-muted-foreground group-hover:border-foreground/20">
          ⌘K
        </kbd>
      </button>

      <CommandPaletteContent open={open} setOpen={setOpen} onAction={onAction} />
    </>
  );
}
