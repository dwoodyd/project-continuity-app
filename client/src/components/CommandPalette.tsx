import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

interface CommandPaletteProps {
  /** Called when the user triggers a quick action (e.g. open morning check-in) */
  onAction?: (action: string) => void;
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Command Center", path: "/", group: "Navigate", shortcut: "G H" },
  { icon: Archive, label: "Vault", path: "/vault", group: "Navigate", shortcut: "G V" },
  { icon: FolderOpen, label: "Projects", path: "/projects", group: "Navigate", shortcut: "G P" },
  { icon: Calendar, label: "Weekly Review", path: "/weekly", group: "Navigate", shortcut: "G W" },
  { icon: Compass, label: "Weekly Compass", path: "/compass", group: "Navigate", shortcut: "G C" },
  { icon: Brain, label: "Clarity Engine", path: "/clarity", group: "Navigate", shortcut: "G L" },
  { icon: BookOpen, label: "Evidence Log", path: "/evidence", group: "Navigate", shortcut: "G E" },
  { icon: BarChart2, label: "Intelligence", path: "/intelligence", group: "Navigate", shortcut: "G I" },
  { icon: Settings, label: "Settings", path: "/settings", group: "Navigate" },
  { icon: Star, label: "Continuary Pro", path: "/pro", group: "Navigate" },
];

const QUICK_ACTIONS = [
  { icon: Sun, label: "Morning Check-in", action: "morning-checkin", group: "Quick Actions" },
  { icon: Moon, label: "Evening Closure", action: "evening-checkin", group: "Quick Actions" },
  { icon: Sparkles, label: "Brain Dump (Clarity Engine)", action: "brain-dump", group: "Quick Actions" },
  { icon: Zap, label: "Idea Sanctuary", action: "idea-sanctuary", group: "Quick Actions" },
  { icon: Search, label: "Threshold Diagnosis", action: "threshold-diagnosis", group: "Quick Actions" },
];

export function CommandPalette({ onAction }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const handleOpen = useCallback(() => setOpen(true), []);

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

  const handleNav = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleAction = (action: string) => {
    setOpen(false);
    onAction?.(action);
    // Fallback: navigate to the relevant page if no handler provided
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

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, actions, projects…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

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
    </>
  );
}

/** Small trigger button that opens the command palette on click */
export function CommandPaletteTrigger({ onAction }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();

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

  const handleNav = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleAction = (action: string) => {
    setOpen(false);
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card/60 text-muted-foreground text-sm hover:bg-accent/60 hover:text-foreground transition-all duration-150 group"
        title="Open command palette (⌘K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="text-xs">Search…</span>
        <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border text-muted-foreground group-hover:border-foreground/20">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, actions, projects…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

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
    </>
  );
}
