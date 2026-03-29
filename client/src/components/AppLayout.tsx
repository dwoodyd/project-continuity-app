import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  Archive,
  BookOpen,
  Brain,
  ChevronRight,
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

// ── Continuary logo mark (open infinity loop) ─────────────────────────────────
function ContinuaryMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Left full circle */}
      <circle cx="12" cy="12" r="9" strokeWidth="4" stroke="currentColor" fill="none" />
      {/* Right open arc — gap at top-right ~40deg */}
      <path
        d="M21 12 A9 9 0 1 1 28.36 5.64"
        strokeWidth="4"
        stroke="currentColor"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Wordmark lockup ───────────────────────────────────────────────────────────
function ContinuaryLogo({ size = "default" }: { size?: "default" | "sm" | "lg" }) {
  const markSize = size === "sm" ? "w-5 h-3" : size === "lg" ? "w-10 h-6" : "w-7 h-4.5";
  const textSize = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-[15px]";
  return (
    <div className="flex items-center gap-2.5">
      <ContinuaryMark className={cn(markSize, "text-foreground")} />
      <span className={cn(textSize, "font-semibold tracking-[-0.02em] text-foreground leading-none")}>
        Continuary
      </span>
    </div>
  );
}

const navItems = [
  { href: "/", label: "Command Center", icon: Brain, description: "Today's focus" },
  { href: "/vault", label: "Knowledge Vault", icon: BookOpen, description: "Imported sources" },
  { href: "/projects", label: "Projects", icon: Archive, description: "All projects" },
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

  const { data: amnestyData } = trpc.ai.checkAmnesty.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 60,
  });

  const showAmnesty = isAuthenticated && !amnestyDismissed && amnestyData?.needsAmnesty === true;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  // ── Unauthenticated landing ─────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-foreground flex items-center justify-center shadow-md">
                  <ContinuaryMark className="w-8 h-5 text-background" />
                </div>
                <div className="text-center">
                  <h1 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Continuary</h1>
                  <p className="text-xs text-muted-foreground mt-0.5 tracking-wide uppercase">Command Center</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border mb-6" />

            <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
              A structured command center for execution. Turn scattered notes into daily focus.
            </p>

            <a
              href={getLoginUrl()}
              className="flex items-center justify-center gap-2 w-full bg-foreground text-background px-5 py-3 rounded-xl text-sm font-medium hover:bg-foreground/90 active:scale-[0.98] transition-all"
            >
              Sign in to continue
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <p className="text-center text-xs text-muted-foreground/50 mt-4">
            Built for minds that move fast.
          </p>
        </div>
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const navLinkClass = (href: string) => cn(
    "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group",
    isActive(href)
      ? "bg-foreground/[0.07] text-foreground font-medium"
      : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
  );

  const mobileNavLinkClass = (href: string) => cn(
    "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors min-w-0",
    isActive(href) ? "text-foreground" : "text-muted-foreground"
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-sidebar h-screen sticky top-0">
        {/* Logo lockup */}
        <div className="px-5 py-5 border-b border-border">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
              <ContinuaryMark className="w-5 h-3 text-background" />
            </div>
            <div>
              <p className="text-[14px] font-semibold tracking-[-0.02em] text-foreground leading-none">Continuary</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wide uppercase">Command Center</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkClass(item.href)}
              >
                {/* Active indicator */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[oklch(0.72_0.14_65)]" />
                )}
                <Icon className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-border space-y-0.5">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors w-full"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ───────────────────────────────────────────── */}
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
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center shadow-sm">
              <ContinuaryMark className="w-5 h-3 text-background" />
            </div>
            <div>
              <p className="text-[14px] font-semibold tracking-[-0.02em] text-foreground leading-none">Continuary</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wide uppercase">Command Center</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-foreground/[0.04] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-foreground/[0.07] text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[oklch(0.72_0.14_65)]" />
                )}
                <Icon className="w-4 h-4 shrink-0" />
                <div>
                  <p>{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-border space-y-0.5">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors w-full"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar/95 backdrop-blur-sm sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-foreground/[0.04] transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center shadow-sm">
              <ContinuaryMark className="w-4 h-2.5 text-background" />
            </div>
            <span className="text-[14px] font-semibold tracking-[-0.02em] text-foreground">Continuary</span>
          </div>
          <button onClick={toggleTheme} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-foreground/[0.04] transition-colors">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {/* ── Quick Capture FAB ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setIdeaOpen(true)}
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 w-12 h-12 rounded-full bg-foreground text-background shadow-lg hover:bg-foreground/90 active:scale-95 transition-all flex items-center justify-center ring-2 ring-background"
        title="Quick Capture (Idea Sanctuary)"
        aria-label="Capture an idea"
      >
        <Lightbulb className="w-5 h-5" />
      </button>

      {/* ── Mobile Bottom Nav ─────────────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar/95 backdrop-blur-sm border-t border-border">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={mobileNavLinkClass(item.href)}
              >
                <Icon className={cn("w-5 h-5", active && "text-foreground")} />
                <span className={cn("text-[10px] font-medium truncate", active && "text-foreground")}>{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
          <Link href="/settings" className={mobileNavLinkClass("/settings")}>
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </Link>
        </div>
      </nav>

      {/* ── Idea Sanctuary Modal ──────────────────────────────────────────────── */}
      <IdeaSanctuaryModal open={ideaOpen} onClose={() => setIdeaOpen(false)} />

      {/* ── Amnesty Protocol ─────────────────────────────────────────────────── */}
      {showAmnesty && amnestyData && (
        <AmnestyScreen
          gapHours={amnestyData.hoursSince ?? 48}
          onComplete={() => setAmnestyDismissed(true)}
        />
      )}
    </div>
  );
}
