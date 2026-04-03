/**
 * AppLayout — responsive shell
 *
 * Layout modes:
 * - Mobile / Compact: centered max-w-md phone column, bottom tab bar (default on small screens)
 * - Desktop: full-width left sidebar + content area (auto on lg+, user-toggleable)
 *
 * Preference is stored in localStorage under "continuary-layout-mode".
 * On screens >= 1024px the default is "desktop"; below that it is always "compact".
 */
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
  Monitor,
  Moon,
  MoreHorizontal,
  PanelLeft,
  Settings,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "../contexts/ThemeContext";
import AmnestyScreen from "./AmnestyScreen";
import IdeaSanctuaryModal from "./IdeaSanctuaryModal";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const LAYOUT_STORAGE_KEY = "continuary-layout-mode";

// ── Brand CDN URLs ───────────────────────────────────────────────────────────
// Official monochrome icon: white bird on navy rounded square (for header + favicon)
const BRAND_ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663270045694/VnvNaoJZPVnHWmB8F3cwwo/icon-monochrome-dark_502b7aa6.png";
// Sign-in screen: dark-background stacked lockup (navy arch + white bird + wordmark)
const BRAND_LOGO_SIGNIN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663270045694/VnvNaoJZPVnHWmB8F3cwwo/logo-dark-bg-stacked_3630c4d9.png";

// ── All nav items ────────────────────────────────────────────────────────────
const ALL_NAV_ITEMS = [
  { href: "/",             label: "Today",           icon: Brain,         section: "primary" },
  { href: "/projects",     label: "Projects",        icon: Archive,       section: "primary" },
  { href: "/clarity",      label: "Clarity Engine",  icon: Zap,           section: "primary" },
  { href: "/vault",        label: "Knowledge Vault", icon: BookOpen,      section: "primary" },
  { href: "/compass",      label: "Weekly Compass",  icon: Compass,       section: "secondary" },
  { href: "/weekly",       label: "Weekly Review",   icon: Archive,       section: "secondary" },
  { href: "/intelligence", label: "Intelligence",    icon: Lightbulb,     section: "secondary" },
  { href: "/settings",     label: "Settings",        icon: Settings,      section: "secondary" },
  { href: "/welcome",      label: "About",           icon: Home,          section: "secondary" },
] as const;

// ── Mobile bottom-tab items (5 visible) ──────────────────────────────────────
const PRIMARY_TABS = [
  { href: "/",      label: "Today",    icon: Brain },
  { href: "/projects", label: "Projects", icon: Archive },
  { href: "/clarity",  label: "Clarity",  icon: Zap },
  { href: "/vault",    label: "Vault",    icon: BookOpen },
  { href: "/more",     label: "More",     icon: MoreHorizontal },
] as const;

// ── Mobile "More" sheet items ─────────────────────────────────────────────────
const MORE_ITEMS = [
  { href: "/compass",      label: "Weekly Compass",   icon: Compass },
  { href: "/weekly",       label: "Weekly Review",    icon: Archive },
  { href: "/intelligence", label: "Intelligence",     icon: Lightbulb },
  { href: "/welcome",      label: "About Continuary", icon: Home },
  { href: "/settings",     label: "Settings",         icon: Settings },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [, navigate] = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [amnestyDismissed, setAmnestyDismissed] = useState(false);

  // ── Desktop layout state ──────────────────────────────────────────────────
  const [isLargeScreen, setIsLargeScreen] = useState(() => window.innerWidth >= 1024);
  const [userLayoutPref, setUserLayoutPref] = useState<"desktop" | "compact" | null>(() => {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return (stored === "desktop" || stored === "compact") ? stored : null;
  });

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsLargeScreen(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Effective layout: user preference wins on large screens; small screens always compact
  const isDesktopMode = isLargeScreen && (userLayoutPref !== "compact");

  const toggleLayoutMode = () => {
    const next = isDesktopMode ? "compact" : "desktop";
    setUserLayoutPref(next);
    localStorage.setItem(LAYOUT_STORAGE_KEY, next);
  };

  const { data: amnestyData } = trpc.ai.checkAmnesty.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 60,
  });
  const { data: profile } = trpc.settings.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  const showAmnesty = isAuthenticated && !amnestyDismissed && amnestyData?.needsAmnesty === true;

  // Close more sheet on navigation
  useEffect(() => {
    setMoreOpen(false);
  }, [location]);

  // Onboarding gate
  useEffect(() => {
    if (isAuthenticated && profile && profile.onboardingCompleted === false && location !== "/onboarding") {
      navigate("/onboarding");
    }
  }, [isAuthenticated, profile, navigate, location]);

  // Auth error toast
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) {
      toast.error(authError, { duration: 6000 });
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
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-3 animate-fade-slide-up">
              <img src={BRAND_LOGO_SIGNIN} alt="Continuary" className="w-48 object-contain" />
              <p className="text-xs text-muted-foreground tracking-widest uppercase">Command Center</p>
            </div>
            <div className="w-full bg-card border border-border rounded-2xl p-6 shadow-lg animate-fade-slide-up animate-delay-200">
              <p className="text-sm text-muted-foreground text-center mb-5 leading-relaxed">
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
          </div>
          <p className="text-center text-xs text-muted-foreground/50 mt-6 animate-fade-slide-up animate-delay-400">Built for minds that move fast.</p>
        </div>
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);
  const isMoreActive = MORE_ITEMS.some((item) => isActive(item.href));

  // ── DESKTOP LAYOUT ──────────────────────────────────────────────────────────
  if (isDesktopMode) {
    return (
      <div className="h-screen w-full flex overflow-hidden bg-background">
        {/* Left Sidebar */}
        <aside
          className="w-60 shrink-0 flex flex-col h-full border-r border-white/10 overflow-y-auto"
          style={{ background: "var(--sidebar)" }}
        >
          {/* Brand header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
            <Link href="/" className="flex items-center gap-3 min-w-0">
              <img src={BRAND_ICON} alt="Continuary" className="h-8 w-8 object-contain rounded-lg shrink-0" />
              <span className="text-sm font-semibold text-white/90 truncate tracking-wide">Continuary</span>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-3 space-y-0.5">
            <p className="px-3 py-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-widest">Command</p>
            {ALL_NAV_ITEMS.filter(i => i.section === "primary").map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group",
                    active ? "bg-amber-400/15 text-amber-400 font-medium" : "text-white/55 hover:text-white/90 hover:bg-white/[0.07]"
                  )}
                >
                  <Icon className={cn("w-4 h-4 shrink-0", active ? "text-amber-400" : "text-white/40 group-hover:text-white/70")} />
                  <span>{label}</span>
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </Link>
              );
            })}

            <p className="px-3 py-1.5 mt-3 text-[10px] font-semibold text-white/30 uppercase tracking-widest">Review</p>
            {ALL_NAV_ITEMS.filter(i => i.section === "secondary").map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group",
                    active ? "bg-amber-400/15 text-amber-400 font-medium" : "text-white/55 hover:text-white/90 hover:bg-white/[0.07]"
                  )}
                >
                  <Icon className={cn("w-4 h-4 shrink-0", active ? "text-amber-400" : "text-white/40 group-hover:text-white/70")} />
                  <span>{label}</span>
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="px-2 pb-3 pt-2 border-t border-white/10 space-y-1">
            {user && (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-amber-400">{(user.name ?? "U").charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white/80 truncate">{user.name ?? "User"}</p>
                  {user.role === "admin" && <p className="text-[10px] text-amber-400/70 font-medium">Admin</p>}
                </div>
              </div>
            )}
            <div className="flex items-center gap-1 px-1">
              <button onClick={toggleTheme} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-colors text-xs" title="Toggle theme">
                {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{theme === "dark" ? "Light" : "Dark"}</span>
              </button>
              <button onClick={toggleLayoutMode} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-colors text-xs" title="Switch to compact view">
                <PanelLeft className="w-3.5 h-3.5" />
                <span>Compact</span>
              </button>
              <button onClick={() => logout()} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-colors text-xs" title="Sign out">
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto overscroll-contain bg-background">
          {children}
        </main>

        {/* FAB */}
        <button
          onClick={() => setIdeaOpen(true)}
          className="fixed z-40 bottom-6 right-6 w-12 h-12 rounded-full bg-amber-400 text-amber-950 shadow-lg hover:bg-amber-300 active:scale-95 transition-all flex items-center justify-center ring-2 ring-background shadow-amber-400/30"
          title="Quick Capture (Idea Sanctuary)"
          aria-label="Capture an idea"
        >
          <Lightbulb className="w-5 h-5" />
        </button>

        <IdeaSanctuaryModal open={ideaOpen} onClose={() => setIdeaOpen(false)} />
        {showAmnesty && amnestyData && (
          <AmnestyScreen gapHours={amnestyData.hoursSince ?? 48} onComplete={() => setAmnestyDismissed(true)} />
        )}
      </div>
    );
  }

  // ── COMPACT / MOBILE LAYOUT ─────────────────────────────────────────────────
  return (
    <div
      className="h-screen w-full flex flex-col items-center overflow-hidden"
      style={{ background: "var(--sidebar)" }}
    >
      {/* Phone column */}
      <div className="w-full max-w-md h-full flex flex-col bg-background relative overflow-hidden shadow-2xl">
        {/* Top header */}
        <header
          className="flex items-center justify-between px-4 shrink-0 z-30 border-b border-white/10"
          style={{
            background: "var(--sidebar)",
            paddingTop: "max(env(safe-area-inset-top, 0px), 12px)",
            paddingBottom: "12px",
          }}
        >
          <Link href="/" className="flex items-center">
            <img src={BRAND_ICON} alt="Continuary" className="h-8 w-8 object-contain rounded-lg" />
          </Link>
          <div className="flex items-center gap-1">
            {isLargeScreen && (
              <button
                onClick={toggleLayoutMode}
                className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
                title="Switch to desktop view"
                aria-label="Switch to desktop view"
              >
                <Monitor className="w-4 h-4" />
              </button>
            )}
            <button onClick={toggleTheme} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors" aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
            <button onClick={() => logout()} className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors" aria-label="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overscroll-contain pb-4">
          {children}
        </main>

        {/* Bottom tab bar */}
        <nav
          className="shrink-0 border-t border-white/10 z-30"
          style={{
            background: "var(--sidebar)",
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
          }}
        >
          <div className="flex items-stretch justify-around px-1">
            {PRIMARY_TABS.map(({ href, label, icon: Icon }) => {
              const active = href === "/more" ? isMoreActive : isActive(href);
              return (
                <button
                  key={href}
                  onClick={() => {
                    if (href === "/more") {
                      setMoreOpen((o) => !o);
                    } else {
                      setMoreOpen(false);
                      if (active) window.scrollTo({ top: 0, behavior: "smooth" });
                      else navigate(href);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 flex-1 pt-2.5 pb-1 transition-all duration-150 relative min-h-[52px]",
                    active ? "text-amber-400" : "text-white/40 hover:text-white/70"
                  )}
                >
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-amber-400" />
                  )}
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium tracking-wide">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* "More" slide-up sheet */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div
            className="fixed bottom-0 z-50 w-full max-w-md bg-card border border-border rounded-t-2xl shadow-2xl"
            style={{ left: "50%", transform: "translateX(-50%)" }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">More</p>
              <button onClick={() => setMoreOpen(false)} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-3 py-3 space-y-0.5">
              {MORE_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors",
                      active ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className={cn("w-4.5 h-4.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
            <div style={{ height: "max(env(safe-area-inset-bottom, 0px), 12px)" }} />
          </div>
        </>
      )}

      {/* FAB */}
      <button
        onClick={() => setIdeaOpen(true)}
        className="fixed z-40 w-12 h-12 rounded-full bg-amber-400 text-amber-950 shadow-lg hover:bg-amber-300 active:scale-95 transition-all flex items-center justify-center ring-2 ring-background shadow-amber-400/30"
        style={{
          bottom: "calc(max(env(safe-area-inset-bottom, 0px), 8px) + 52px + 12px)",
          right: "max(calc(50vw - 224px + 12px), 12px)",
        }}
        title="Quick Capture (Idea Sanctuary)"
        aria-label="Capture an idea"
      >
        <Lightbulb className="w-5 h-5" />
      </button>

      <IdeaSanctuaryModal open={ideaOpen} onClose={() => setIdeaOpen(false)} />
      {showAmnesty && amnestyData && (
        <AmnestyScreen gapHours={amnestyData.hoursSince ?? 48} onComplete={() => setAmnestyDismissed(true)} />
      )}
    </div>
  );
}
