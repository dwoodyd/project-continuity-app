import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  Archive,
  BookOpen,
  Brain,
  ChevronRight,
  Compass,
  Home,
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
import { toast } from "sonner";

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

const navItems = [
  { href: "/", label: "Command Center", icon: Brain, description: "Today's focus" },
  { href: "/vault", label: "Knowledge Vault", icon: BookOpen, description: "Imported sources" },
  { href: "/projects", label: "Projects", icon: Archive, description: "All projects" },
  { href: "/weekly", label: "Weekly Review", icon: Archive, description: "Patterns & progress" },
  { href: "/compass", label: "Weekly Compass", icon: Compass, description: "This week's direction" },
  { href: "/welcome", label: "About Continuary", icon: Home, description: "Orientation & overview" },
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
  const { data: profile } = trpc.settings.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  const showAmnesty = isAuthenticated && !amnestyDismissed && amnestyData?.needsAmnesty === true;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  // Onboarding gate: redirect first-time users before rendering the main app
  const [, navigate] = useLocation();
  useEffect(() => {
    if (isAuthenticated && profile && profile.onboardingCompleted === false) {
      navigate("/onboarding");
    }
  }, [isAuthenticated, profile, navigate]);

  // Show auth error toast if redirected back with ?auth_error=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) {
      toast.error(authError, { duration: 6000 });
      // Remove the param from the URL without a reload
      const url = new URL(window.location.href);
      url.searchParams.delete("auth_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // ── Unauthenticated landing ─────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
            <div className="flex justify-center mb-8">
              <div className="flex flex-col items-center gap-4">
                {/* Indigo icon badge */}
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                  <ContinuaryMark className="w-9 h-6 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Continuary</h1>
                  <p className="text-xs text-muted-foreground mt-0.5 tracking-widest uppercase">Command Center</p>
                </div>
              </div>
            </div>

            <div className="border-t border-border mb-6" />

            <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
              A structured command center for execution. Turn scattered notes into daily focus.
            </p>

            <a
              href={getLoginUrl()}
              className="flex items-center justify-center gap-2 w-full bg-primary text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/25"
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

  // Sidebar nav link — uses sidebar-scoped tokens so colors are correct on dark sidebar
  const SidebarNavLink = ({ item }: { item: typeof navItems[0] }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        className={cn(
          "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group",
          active
            ? "bg-white/10 text-white font-medium"
            : "text-white/60 hover:text-white hover:bg-white/[0.06]"
        )}
      >
        {/* Amber active indicator bar */}
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-amber-400" />
        )}
        <Icon className={cn(
          "w-4 h-4 shrink-0 transition-colors",
          active ? "text-amber-400" : "text-white/50 group-hover:text-white/80"
        )} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Desktop Sidebar — dark indigo ───────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0"
        style={{ background: "var(--sidebar)" }}>
        {/* Logo lockup */}
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center shrink-0 shadow-md group-hover:bg-amber-300 transition-colors">
              <ContinuaryMark className="w-5 h-3 text-amber-950" />
            </div>
            <div>
              <p className="text-[14px] font-semibold tracking-[-0.02em] text-white leading-none">Continuary</p>
              <p className="text-[10px] text-white/40 mt-0.5 tracking-widest uppercase">Command Center</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarNavLink key={item.href} item={item} />
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors w-full"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ───────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-200 lg:hidden border-r border-white/10",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "var(--sidebar)" }}
      >
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center shadow-md">
              <ContinuaryMark className="w-5 h-3 text-amber-950" />
            </div>
            <div>
              <p className="text-[14px] font-semibold tracking-[-0.02em] text-white leading-none">Continuary</p>
              <p className="text-[10px] text-white/40 mt-0.5 tracking-widest uppercase">Command Center</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors">
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
                    ? "bg-white/10 text-white font-medium"
                    : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-amber-400" />
                )}
                <Icon className={cn("w-4 h-4 shrink-0", active ? "text-amber-400" : "text-white/50")} />
                <div>
                  <p>{item.label}</p>
                  <p className="text-xs text-white/40">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors w-full"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header — dark indigo strip */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 sticky top-0 z-30"
          style={{ background: "var(--sidebar)" }}>
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-amber-400 flex items-center justify-center shadow-sm">
              <ContinuaryMark className="w-4 h-2.5 text-amber-950" />
            </div>
            <span className="text-[14px] font-semibold tracking-[-0.02em] text-white">Continuary</span>
          </div>
          <button onClick={toggleTheme} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors">
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {/* ── Quick Capture FAB — amber ─────────────────────────────────────────── */}
      <button
        onClick={() => setIdeaOpen(true)}
        className="fixed bottom-[72px] right-4 lg:bottom-6 lg:right-6 z-40 w-12 h-12 rounded-full bg-amber-400 text-amber-950 shadow-lg hover:bg-amber-300 active:scale-95 transition-all flex items-center justify-center ring-2 ring-background shadow-amber-400/30"
        title="Quick Capture (Idea Sanctuary)"
        aria-label="Capture an idea"
      >
        <Lightbulb className="w-5 h-5" />
      </button>

      {/* ── Mobile Bottom Nav — 4 core tabs ─────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/10"
        style={{ background: "var(--sidebar)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch justify-around px-1">
          {([
            { href: "/", label: "Today", icon: Brain },
            { href: "/projects", label: "Projects", icon: Archive },
            { href: "/vault", label: "Vault", icon: BookOpen },
            { href: "/compass", label: "Compass", icon: Compass },
          ] as const).map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  if (active) window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cn(
                  "flex flex-col items-center gap-1 flex-1 py-2.5 transition-all duration-150 relative",
                  active ? "text-amber-400" : "text-white/40 hover:text-white/70"
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-amber-400" />
                )}
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
              </Link>
            );
          })}
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
