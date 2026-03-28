import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  Archive,
  BookOpen,
  Brain,
  ChevronRight,
  Command,
  Compass,
  Lightbulb,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "../contexts/ThemeContext";
import AmnestyScreen from "./AmnestyScreen";
import IdeaSanctuaryModal from "./IdeaSanctuaryModal";
import { trpc } from "@/lib/trpc";

const navItems = [
  { href: "/", label: "Command Center", icon: Command, description: "Today's focus" },
  { href: "/vault", label: "Knowledge Vault", icon: BookOpen, description: "Imported sources" },
  { href: "/projects", label: "Projects", icon: Brain, description: "All projects" },
  { href: "/weekly", label: "Weekly Review", icon: Archive, description: "Patterns & progress" },
  { href: "/compass", label: "Weekly Compass", icon: Compass, description: "This week's direction" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Preferences" },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [amnestyDismissed, setAmnestyDismissed] = useState(false);

  // Check amnesty only when authenticated
  const { data: amnestyData } = trpc.ai.checkAmnesty.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const showAmnesty = isAuthenticated && !amnestyDismissed && amnestyData?.needsAmnesty === true;

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-foreground/5 border border-border flex items-center justify-center mx-auto mb-6">
            <Command className="w-6 h-6 text-foreground/60" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Project Continuity</h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            A command center for execution. Turn scattered notes into structured daily focus.
          </p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            Sign in to continue
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  const navLinkClass = (href: string) => cn(
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group",
    location === href || (href !== "/" && location.startsWith(href))
      ? "bg-foreground/8 text-foreground font-medium"
      : "text-muted-foreground hover:text-foreground hover:bg-foreground/4"
  );

  const mobileNavLinkClass = (href: string) => cn(
    "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors min-w-0",
    location === href || (href !== "/" && location.startsWith(href))
      ? "text-foreground"
      : "text-muted-foreground"
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-sidebar h-screen sticky top-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center shrink-0">
              <Command className="w-4 h-4 text-background" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">Continuity</p>
              <p className="text-xs text-muted-foreground mt-0.5">Command Center</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkClass(item.href)}
              >
                <Icon className={cn(
                  "w-4 h-4 shrink-0",
                  location === item.href || (item.href !== "/" && location.startsWith(item.href))
                    ? "text-foreground"
                    : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-border space-y-1">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/4 transition-colors w-full"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/4 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ───────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-border flex flex-col transition-transform duration-200 lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-5 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
              <Command className="w-4 h-4 text-background" />
            </div>
            <p className="text-sm font-semibold text-foreground">Continuity</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors",
                  location === item.href || (item.href !== "/" && location.startsWith(item.href))
                    ? "bg-foreground/8 text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/4"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div>
                  <p>{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-border space-y-1">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/4 transition-colors w-full"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/4 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground p-1">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
              <Command className="w-3 h-3 text-background" />
            </div>
            <span className="text-sm font-semibold text-foreground">Continuity</span>
          </div>
          <button onClick={toggleTheme} className="text-muted-foreground hover:text-foreground p-1">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {/* ── Quick Capture FAB ─────────────────────────────────────────────── */}
      <button
        onClick={() => setIdeaOpen(true)}
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 w-12 h-12 rounded-full bg-foreground text-background shadow-lg hover:bg-foreground/90 active:scale-95 transition-all flex items-center justify-center"
        title="Quick Capture (Idea Sanctuary)"
        aria-label="Capture an idea"
      >
        <Lightbulb className="w-5 h-5" />
      </button>

      {/* ── Mobile Bottom Nav ─────────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={mobileNavLinkClass(item.href)}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium truncate">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
          <Link href="/settings" className={mobileNavLinkClass("/settings")}>
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </Link>
        </div>
      </nav>

      {/* ── Idea Sanctuary Modal ──────────────────────────────────────────── */}
      <IdeaSanctuaryModal open={ideaOpen} onClose={() => setIdeaOpen(false)} />

      {/* ── Amnesty Protocol ─────────────────────────────────────────────── */}
      {showAmnesty && amnestyData && (
        <AmnestyScreen
          gapHours={amnestyData.hoursSince ?? 48}
          onComplete={() => setAmnestyDismissed(true)}
        />
      )}
    </div>
  );
}
