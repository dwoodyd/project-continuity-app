/**
 * AppLayout — mobile-first shell
 *
 * Layout philosophy:
 * - Primary target: phone (375–430px wide)
 * - Desktop: centered max-w-md column, same bottom-tab nav, no sidebar
 * - The app feels like a native phone app on every screen size
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
  Moon,
  MoreHorizontal,
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

// ── Brand CDN URLs ───────────────────────────────────────────────────────────
const BRAND_ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663270045694/VnvNaoJZPVnHWmB8F3cwwo/icon-96_71cad82a.png";
const BRAND_LOGO_DARK = "https://d2xsxph8kpxj0f.cloudfront.net/310519663270045694/VnvNaoJZPVnHWmB8F3cwwo/logo-horizontal-dark-web_9b727cb8.png";

// ── Primary bottom-tab items (5 visible) ────────────────────────────────────
const PRIMARY_TABS = [
  { href: "/",          label: "Today",    icon: Brain },
  { href: "/projects",  label: "Projects", icon: Archive },
  { href: "/clarity",   label: "Clarity",  icon: Zap },
  { href: "/vault",     label: "Vault",    icon: BookOpen },
  { href: "/more",      label: "More",     icon: MoreHorizontal },
] as const;

// ── Secondary items shown in the "More" sheet ────────────────────────────────
const MORE_ITEMS = [
  { href: "/compass",      label: "Weekly Compass",  icon: Compass },
  { href: "/weekly",       label: "Weekly Review",   icon: Archive },
  { href: "/intelligence", label: "Intelligence",    icon: Lightbulb },
  { href: "/welcome",      label: "About Continuary",icon: Home },
  { href: "/settings",     label: "Settings",        icon: Settings },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [, navigate] = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
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
            <div className="flex flex-col items-center gap-3">
              <img src={BRAND_ICON} alt="Continuary" className="w-28 h-28 object-contain" />
              <div className="text-center">
                <h1 className="text-3xl font-medium text-foreground" style={{ fontFamily: "'Lora', Georgia, serif" }}>Continuary</h1>
                <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">Command Center</p>
              </div>
            </div>
            <div className="w-full bg-card border border-border rounded-2xl p-6 shadow-lg">
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
          <p className="text-center text-xs text-muted-foreground/50 mt-6">Built for minds that move fast.</p>
        </div>
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  // "More" tab is active when on any secondary page
  const isMoreActive = MORE_ITEMS.some((item) => isActive(item.href));

  return (
    /**
     * Outer shell: full viewport, dark sidebar background.
     * On desktop this creates a "phone bezel" effect — the centered column
     * sits on a dark background just like holding a phone.
     */
    <div
      className="h-screen w-full flex flex-col items-center overflow-hidden"
      style={{ background: "var(--sidebar)" }}
    >
      {/* ── Phone column ─────────────────────────────────────────────────────── */}
      {/*
        max-w-md (448px) on all screen sizes — matches a large phone width.
        On desktop this is a centered column with the dark sidebar bg visible on sides.
      */}
      <div className="w-full max-w-md h-full flex flex-col bg-background relative overflow-hidden shadow-2xl">

        {/* ── Top header bar ─────────────────────────────────────────────────── */}
        <header
          className="flex items-center justify-between px-4 shrink-0 z-30 border-b border-white/10"
          style={{
            background: "var(--sidebar)",
            paddingTop: "max(env(safe-area-inset-top, 0px), 12px)",
            paddingBottom: "12px",
          }}
        >
          {/* Brand logo */}
          <Link href="/" className="flex items-center">
            <img src={BRAND_LOGO_DARK} alt="Continuary" className="h-7 w-auto object-contain" />
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
            <button
              onClick={() => logout()}
              className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ── Page content ───────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto overscroll-contain pb-4">
          {children}
        </main>

        {/* ── Bottom tab bar ─────────────────────────────────────────────────── */}
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

      {/* ── "More" slide-up sheet ─────────────────────────────────────────────── */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          {/* Sheet — anchored to the bottom of the phone column */}
          <div
            className="fixed bottom-0 z-50 w-full max-w-md bg-card border border-border rounded-t-2xl shadow-2xl"
            style={{ left: "50%", transform: "translateX(-50%)" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">More</p>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav items */}
            <div className="px-3 py-3 space-y-0.5">
              {MORE_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className={cn("w-4.5 h-4.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Bottom padding for safe area */}
            <div style={{ height: "max(env(safe-area-inset-bottom, 0px), 12px)" }} />
          </div>
        </>
      )}

      {/* ── Quick Capture FAB ────────────────────────────────────────────────── */}
      {/*
        Positioned above the bottom tab bar, anchored to the right edge of
        the phone column. On desktop the column is centered, so we use
        a fixed position with a right offset that tracks the column edge.
      */}
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

      {/* ── Idea Sanctuary Modal ─────────────────────────────────────────────── */}
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
