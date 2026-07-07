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
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  Anchor,
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
  ScrollText,
  Settings,
  Sun,
  Ticket,
  X,
  Zap,
  GraduationCap,
  MessageSquare,
  BarChart2,
  PenLine,
  Star,
  ClipboardList,
  Users,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "../contexts/ThemeContext";
import { IntroContext } from "../contexts/IntroContext";
import AmnestyScreen from "./AmnestyScreen";
import { FeedbackPanel } from "./FeedbackPanel";
import AiConsentModal from "./AiConsentModal";
import IdeaSanctuaryModal from "./IdeaSanctuaryModal";
import ThreadLockModal from "./ThreadLockModal";
import { trpc } from "@/lib/trpc";
import notify from "@/lib/notify";
import { CommandPaletteTrigger } from "./CommandPalette";
import WrenPlayer from "./WrenPlayer";
import StreakMilestoneCelebration from "./StreakMilestoneCelebration";

const LAYOUT_STORAGE_KEY = "continuary-layout-mode";

// ── Brand logo ───────────────────────────────────────────────────────────────
const BRAND_LOGO_SIGNIN = "/logo-navy.svg";

// ── All nav items ────────────────────────────────────────────────────────────
const ALL_NAV_ITEMS = [
  { href: "/",             label: "Today",           icon: Brain,         section: "primary" },
  { href: "/projects",     label: "Projects",        icon: Archive,       section: "primary" },
  { href: "/clarity",      label: "Clarity Engine",  icon: Zap,           section: "primary" },
  { href: "/vault",        label: "Knowledge Vault", icon: BookOpen,      section: "primary" },
  { href: "/scratch",      label: "Scratch Pad",     icon: PenLine,       section: "primary" },
  { href: "/ideas",        label: "Ideas",           icon: Sparkles,      section: "primary" },
  { href: "/study",        label: "Single Focus Mode", icon: ClipboardList, section: "primary" },
  { href: "/focus",       label: "Focus Sessions",   icon: Users,         section: "primary" },
  { href: "/thread-locks",   label: "Thread Locks",   icon: Anchor,        section: "secondary" },
  { href: "/reading-bridge", label: "Reading Bridge", icon: BookOpen,      section: "secondary" },
  { href: "/emotional-cycle", label: "Emotional Cycle", icon: BarChart2,    section: "secondary" },
  { href: "/evidence",     label: "Evidence Log",   icon: ScrollText,    section: "secondary" },
  { href: "/compass",      label: "Weekly Compass",  icon: Compass,       section: "secondary" },
  { href: "/weekly",       label: "Weekly Review",   icon: Archive,       section: "secondary" },
  { href: "/intelligence", label: "Intelligence",    icon: Lightbulb,     section: "secondary" },
  { href: "/settings",     label: "You & Wren",      icon: Settings,      section: "secondary" },
  { href: "/welcome",      label: "About",           icon: Home,          section: "secondary" },
  { href: "/tour",         label: "Take the Tour",   icon: GraduationCap, section: "secondary" },
  { href: "/pro",          label: "Pricing",         icon: Ticket,        section: "secondary" },
  { href: "/founding-member", label: "Founding Member", icon: Star,          section: "secondary" },
] as const;

// ── Mobile bottom-tab items (5 visible + Hub) ────────────────────────────────
const PRIMARY_TABS = [
  { href: "/",        label: "Today",    icon: Brain },
  { href: "/projects",label: "Projects", icon: Archive },
  { href: "/clarity", label: "Clarity",  icon: Zap },
  { href: "/compass", label: "Compass",  icon: Compass },
  { href: "/vault",   label: "Vault",    icon: BookOpen },
  { href: "/hub",     label: "Hub",      icon: MoreHorizontal },
] as const;

// MORE_ITEMS removed — replaced by Hub tab (/hub page)

// ── Wren sidebar presence with meet-Wren tooltip ────────────────────────────
const WREN_TOOLTIP_KEY = "continuary-wren-tooltip-seen";
function WrenSidebarPresence() {
  const [showTooltip, setShowTooltip] = useState(() => {
    try { return !localStorage.getItem(WREN_TOOLTIP_KEY); } catch { return false; }
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!showTooltip) return;
    const t1 = setTimeout(() => setVisible(true), 1200);
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setShowTooltip(false);
        try { localStorage.setItem(WREN_TOOLTIP_KEY, "1"); } catch { /* ignore */ }
      }, 400);
    }, 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [showTooltip]);

  return (
    <div className="relative flex items-center gap-2 px-3 py-1.5">
      <div style={{ WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)", maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)" }}>
        <WrenPlayer clip="mainCornerWave" size="xs" loop autoPlay />
      </div>
      <span className="text-[10px] tracking-wide" style={{ color: "oklch(1 0 0 / 0.22)" }}>Wren is here with you</span>
      {showTooltip && (
        <div
          className="absolute bottom-full left-2 mb-2 z-50"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 0.35s ease, transform 0.35s ease",
            pointerEvents: "none",
          }}
        >
          <div className="rounded-xl px-3 py-2 text-xs shadow-xl max-w-[180px]" style={{ background: "oklch(0.22 0.04 65)", border: "1px solid oklch(0.80 0.17 65 / 0.35)", color: "oklch(0.95 0.05 65)" }}>
            <p className="font-semibold mb-0.5">Hi, I'm Wren ✨</p>
            <p className="leading-snug" style={{ color: "oklch(0.85 0.04 65)" }}>I'll be here with you every step of the way.</p>
            <div className="absolute -bottom-1.5 left-4 w-3 h-3 rotate-45" style={{ background: "oklch(0.22 0.04 65)", borderRight: "1px solid oklch(0.80 0.17 65 / 0.35)", borderBottom: "1px solid oklch(0.80 0.17 65 / 0.35)" }} />
          </div>
        </div>
      )}
    </div>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  onPreviewIntro?: () => void;
}

export default function AppLayout({ children, onPreviewIntro }: AppLayoutProps) {
  const [location] = useLocation();
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [threadLockOpen, setThreadLockOpen] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  // Persist amnesty-dismissed flag in sessionStorage so a page refresh within the same
  // browser session doesn't force the user through the re-entry screen again.
  const [amnestyDismissed, setAmnestyDismissed] = useState<boolean>(() => {
    try { return sessionStorage.getItem("continuary-amnesty-dismissed") === "1"; } catch { return false; }
  });
  const dismissAmnesty = () => {
    try { sessionStorage.setItem("continuary-amnesty-dismissed", "1"); } catch { /* ignore */ }
    setAmnestyDismissed(true);
  };

  // ── Online / sync indicator state ─────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "done">("idle");
  const triggerSyncPulse = useCallback(() => {
    setSyncState("syncing");
    const t = setTimeout(() => {
      setSyncState("done");
      const t2 = setTimeout(() => setSyncState("idle"), 2000);
      return () => clearTimeout(t2);
    }, 1200);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const onOnline = () => { setIsOnline(true); triggerSyncPulse(); };
    const onOffline = () => { setIsOnline(false); setSyncState("idle"); };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [triggerSyncPulse]);

  // ── Focus-mode sidebar auto-hide ─────────────────────────────────────────
  // When the user is on /focus, the sidebar recedes so Wren gets the full left half.
  // Moving the cursor to the left 8px edge reveals the sidebar as a floating overlay.
  const isFocusRoute = location === "/focus" || location.startsWith("/focus?");
  const [sidebarPeeking, setSidebarPeeking] = useState(false);

  // ── Desktop layout state ──────────────────────────────────────────────────
  const [isLargeScreen, setIsLargeScreen] = useState(() => window.innerWidth >= 768);
  const [userLayoutPref, setUserLayoutPref] = useState<"desktop" | "compact" | null>(() => {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return (stored === "desktop" || stored === "compact") ? stored : null;
  });

  useEffect(() => {
    // 768px = md breakpoint — iPad landscape triggers desktop sidebar layout
    const mql = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsLargeScreen(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Effective layout: user preference wins on large screens; small screens always compact
  const isDesktopMode = isLargeScreen && (userLayoutPref !== "compact");

  // First-run tooltip: show a brief toast when user enters compact mode for the first time
  const COMPACT_ONBOARDED_KEY = "continuary-compact-onboarded";
  const toggleLayoutMode = () => {
    const next = isDesktopMode ? "compact" : "desktop";
    setUserLayoutPref(next);
    localStorage.setItem(LAYOUT_STORAGE_KEY, next);
    // Show first-run orientation tip when switching TO compact mode for the first time
    if (next === "compact") {
      try {
        if (!localStorage.getItem(COMPACT_ONBOARDED_KEY)) {
          localStorage.setItem(COMPACT_ONBOARDED_KEY, "1");
          setTimeout(() => {
            notify.info("Compact mode active", {
              description: "All features are still here. Tap the ⋯ More tab to access Evidence, Compass, Intelligence, and Settings.",
              duration: 7000,
            });
          }, 400);
        }
      } catch { /* ignore */ }
    }
  };

  const { data: memberCountData } = trpc.auth.memberCount.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const { data: amnestyData } = trpc.ai.checkAmnesty.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 60,
  });
  const { data: profile } = trpc.settings.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
  const { data: streakData } = trpc.checkIns.getStreak.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 10,
  });
  const streak = streakData?.streak ?? 0;
  const { data: scratchNotes } = trpc.scratchPad.list.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  const scratchCount = scratchNotes?.length ?? 0;

  const showAmnesty = isAuthenticated && !amnestyDismissed && amnestyData?.needsAmnesty === true;
  // AI consent: show once after onboarding + about-app, before any AI feature is used
  // Global keyboard shortcut: ⌘⇧L / Ctrl+Shift+L → Thread Lock
  // (⌘⇧H is reserved in Safari as the "Home" shortcut, so we use L instead)
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "L") {
        e.preventDefault();
        setThreadLockOpen(true);
        setFabMenuOpen(false);
      }
    }
    document.addEventListener("keydown", handleGlobalKey);
    return () => document.removeEventListener("keydown", handleGlobalKey);
  }, []);

  const [aiConsentDismissed, setAiConsentDismissed] = useState(false);
  const showAiConsent =
    isAuthenticated &&
    !aiConsentDismissed &&
    profile?.onboardingCompleted === true &&
    profile?.aiConsentGiven === false;

  // Onboarding gate — admin users bypass entirely (they may not have a profile yet)
  useEffect(() => {
    if (
      isAuthenticated &&
      user &&
      user.role === "admin"
    ) return; // admins skip onboarding
    if (isAuthenticated && profile && profile.onboardingCompleted === false && location !== "/onboarding") {
      navigate("/onboarding");
    }
  }, [isAuthenticated, user, profile, navigate, location]);

  // Invite-only gate: block non-admin users who have not redeemed an invite code
  // /about-app is no longer a forced gate — it is revisitable from the sidebar
  useEffect(() => {
    if (
      isAuthenticated &&
      user &&
      user.role !== "admin" &&
      !user.hasRedeemedInvite &&
      location !== "/invite-gate" &&
      location !== "/onboarding"
    ) {
      navigate("/invite-gate");
    }
  }, [isAuthenticated, user, navigate, location]);

  // Auth error toast
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) {
      notify.error(authError, { duration: 6000 });
      const url = new URL(window.location.href);
      url.searchParams.delete("auth_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Return-path redirect: after OAuth completes, navigate to the stored path (e.g. /onboarding)
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const returnPath = localStorage.getItem("continuary_return_path");
      if (returnPath && returnPath !== "/" && returnPath !== "/landing") {
        localStorage.removeItem("continuary_return_path");
        navigate(returnPath);
      }
    }
  }, [isAuthenticated, authLoading, navigate]);

  // ── Unified loading state (P2-D) ─────────────────────────────────────────────
  // Wait for auth.me AND profile to resolve before deciding which gate to show.
  // This prevents the sequential flicker: authLoading → onboarding → invite-gate.
  // profileLoading is only relevant once we know the user is authenticated.
  const profileLoading = isAuthenticated && profile === undefined;
  const authGateResolving = authLoading || profileLoading;

  if (authGateResolving) {
    return <DashboardLayoutSkeleton />;
  }

  // ── Unauthenticated landing ─────────────────────────────────────────────────
  // Show sign-in card for any unauthenticated route — wait for auth to resolve first
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',padding:'1rem'}}>
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center gap-6" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'1.5rem'}}>
            <div className="flex flex-col items-center gap-3 animate-fade-slide-up" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.75rem'}}>
              <img src="/logo-navy.svg" alt="Continuary" className="w-20 h-20 object-contain rounded-2xl" />
              <div className="flex flex-col items-center gap-1" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.25rem'}}>
                <span className="text-2xl font-semibold tracking-wide" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", color: "oklch(0.93 0.008 264)" }}>Continuary</span>
                <p className="text-sm text-muted-foreground tracking-widest uppercase">Your Memory Companion</p>
              </div>
            </div>
            <div className="w-full bg-card border border-border rounded-2xl p-6 shadow-lg animate-fade-slide-up animate-delay-200">
              <p className="text-sm text-muted-foreground text-center mb-5 leading-relaxed">
                Continuary keeps your thread. Pick up exactly where you left off.
              </p>
              {/* Social proof — avatar stack + member count */}
              <div className="flex items-center justify-center gap-3 mb-5" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'0.75rem',marginBottom:'1.25rem'}}>
                <div style={{display:'flex',marginLeft:'0'}}>
                  {["JK","AM","TR","SL","OB"].map((initials, i) => (
                    <div
                      key={initials}
                      style={{
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center',
                        width:28,
                        height:28,
                        borderRadius:'50%',
                        border:'2px solid var(--card)',
                        background:["#4F6BED","#7C5CBF","#2D9CDB","#27AE60","#E2704A"][i],
                        fontSize:9,
                        fontWeight:700,
                        color:'#fff',
                        marginLeft: i === 0 ? 0 : -8,
                        zIndex: 5 - i,
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{memberCountData?.count ?? 47} builders</span> in early access
                </p>
              </div>
              <a
                href={getLoginUrl()}
                onClick={() => {
                  if (location && location !== "/" && location !== "/landing") {
                    localStorage.setItem("continuary_return_path", location);
                  }
                }}
                className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground px-5 py-3 rounded-xl text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/25"
              >
                Sign in to continue
                <ChevronRight className="w-4 h-4" />
              </a>
              <a href="/landing" className="block text-center text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors mt-2">← See what's inside</a>
            </div>
          </div>
          {onPreviewIntro && (
            <div className="flex justify-center mt-5 animate-fade-slide-up animate-delay-400">
              <button
                onClick={onPreviewIntro}
                className="text-sm text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors underline underline-offset-4 tracking-wide"
              >
                ✦ Take the tour
              </button>
            </div>
          )}
          <p className="text-center text-sm text-muted-foreground/50 mt-4 animate-fade-slide-up animate-delay-400">Built for minds that keep going.</p>
          <p className="text-center text-sm text-muted-foreground/30 mt-3 animate-fade-slide-up animate-delay-400">
            <a href="/privacy" className="hover:text-muted-foreground/60 underline underline-offset-2 transition-colors">Privacy</a>
            {" · "}
            <a href="/terms" className="hover:text-muted-foreground/60 underline underline-offset-2 transition-colors">Terms</a>
            {" · "}
            <a href="/changelog" className="hover:text-muted-foreground/60 underline underline-offset-2 transition-colors inline-flex items-center gap-1.5">
              Changelog
              {/* Amber dot: visible for 3 days after the latest entry date */}
              {new Date() <= new Date(new Date("2026-07-07").getTime() + 3 * 24 * 60 * 60 * 1000) && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                  style={{ background: "oklch(0.74 0.14 72)" }}
                  title="What's new"
                />
              )}
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (showAiConsent) {
    return (
      <AiConsentModal
        onAccept={() => setAiConsentDismissed(true)}
        onDecline={() => setAiConsentDismissed(true)}
      />
    );
  }

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);
  // ── DESKTOP LAYOUT ──────────────────────────────────────────────────────────
  if (isDesktopMode) {
    return (
      <IntroContext.Provider value={{ replayIntro: onPreviewIntro ?? (() => {}) }}>
      <div className="h-screen w-full flex overflow-hidden bg-background">
        {/* Focus-mode left-edge hover zone — only rendered on /focus */}
        {isFocusRoute && (
          <div
            className="fixed left-0 top-0 h-full z-50"
            style={{ width: "8px" }}
            onMouseEnter={() => setSidebarPeeking(true)}
          />
        )}

        {/* Left Sidebar — auto-hides on /focus, reveals on left-edge hover */}
        <aside
          className="shrink-0 flex flex-col h-full overflow-y-auto w-14 lg:w-60"
          style={{
            background: "var(--sidebar)",
            borderRight: "1px solid oklch(1 0 0 / 0.06)",
            ...(isFocusRoute && !sidebarPeeking ? {
              position: "fixed",
              left: 0,
              top: 0,
              transform: "translateX(-100%)",
              transition: "transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
              zIndex: 49,
              height: "100%",
              boxShadow: "none",
            } : isFocusRoute && sidebarPeeking ? {
              position: "fixed",
              left: 0,
              top: 0,
              transform: "translateX(0)",
              transition: "transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
              zIndex: 49,
              height: "100%",
              boxShadow: "4px 0 32px oklch(0 0 0 / 0.5)",
            } : {}),
          }}
          onMouseLeave={() => isFocusRoute && setSidebarPeeking(false)}
        >
          {/* Brand header */}
          <div className="flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-4 py-4" style={{ borderBottom: "1px solid oklch(1 0 0 / 0.06)" }}>
            <Link href="/" className="flex items-center gap-3 min-w-0">
              <img src="/logo-navy.svg" alt="Continuary" className="h-8 w-8 object-contain rounded-lg shrink-0" />
              <span className="hidden lg:block text-sm font-semibold truncate tracking-wide" style={{ color: "oklch(0.93 0.008 264)" }}>Continuary</span>
            </Link>
            {streak > 0 && (
              <span className="hidden lg:flex ml-auto shrink-0 items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "oklch(0.80 0.17 65 / 0.15)", color: "oklch(0.80 0.14 72)" }} title={`${streak}-day streak`}>
                🔥 {streak}d
              </span>
            )}
          </div>

          {/* ⌘K Command palette trigger — hidden in icon-only mode */}
          <div className="hidden lg:block px-2 pt-2 pb-1">
            <CommandPaletteTrigger />
          </div>
          {/* Nav */}
          <nav className="flex-1 px-1 lg:px-2 py-3 space-y-0.5">
            <p className="hidden lg:block px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "oklch(1 0 0 / 0.22)" }}>Daily</p>
            {ALL_NAV_ITEMS.filter(i => i.section === "primary").map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className="flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group"
                  style={active
                    ? { background: "oklch(0.74 0.14 72 / 0.14)", color: "oklch(0.74 0.14 72)", fontWeight: 500 }
                    : { color: "oklch(1 0 0 / 0.48)" }
                  }
                >
                   <Icon className="w-4 h-4 shrink-0" style={{ color: active ? "oklch(0.74 0.14 72)" : "oklch(1 0 0 / 0.32)" }} />
                  <span className="hidden lg:block">{label}</span>
                  {href === "/scratch" && scratchCount > 0 && !active && (
                    <span className="hidden lg:block ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.74 0.14 72 / 0.18)", color: "oklch(0.74 0.14 72)" }}>{scratchCount}</span>
                  )}
                  {active && <span className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "oklch(0.74 0.14 72)" }} />}
                </Link>
              );
            })}
            <p className="hidden lg:block px-3 py-1.5 mt-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "oklch(1 0 0 / 0.22)" }}>Review</p>
            {ALL_NAV_ITEMS.filter(i => i.section === "secondary").map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className="flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group"
                  style={active
                    ? { background: "oklch(0.74 0.14 72 / 0.14)", color: "oklch(0.74 0.14 72)", fontWeight: 500 }
                    : { color: "oklch(1 0 0 / 0.48)" }
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: active ? "oklch(0.74 0.14 72)" : "oklch(1 0 0 / 0.32)" }} />
                  <span className="hidden lg:block">{label}</span>
                  {active && <span className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "oklch(0.74 0.14 72)" }} />}
                </Link>
              );
            })}

            {/* Feedback */}
            <button
              onClick={() => setFeedbackOpen(true)}
              title="Send Feedback"
              className="flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2.5 rounded-xl text-sm transition-all duration-150 w-full text-left"
              style={{ color: "oklch(1 0 0 / 0.48)" }}
            >
              <MessageSquare className="w-4 h-4 shrink-0" style={{ color: "oklch(1 0 0 / 0.32)" }} />
              <span className="hidden lg:block">Send Feedback</span>
            </button>

            {/* Admin-only section */}
            {user?.role === "admin" && (
              <>
                <p className="px-3 py-1.5 mt-3 text-[10px] font-semibold text-amber-400/40 uppercase tracking-widest">Admin</p>
                <Link
                  href="/admin/invites"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group",
                    isActive("/admin/invites") ? "bg-amber-400/15 text-amber-400 font-medium" : "text-white/55 hover:text-white/90 hover:bg-white/[0.07]"
                  )}
                >
                  <Ticket className={cn("w-4 h-4 shrink-0", isActive("/admin/invites") ? "text-amber-400" : "text-white/40 group-hover:text-white/70")} />
                  <span>Invite Codes</span>
                  {isActive("/admin/invites") && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </Link>
                <Link
                  href="/admin/feedback"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group",
                    isActive("/admin/feedback") ? "bg-amber-400/15 text-amber-400 font-medium" : "text-white/55 hover:text-white/90 hover:bg-white/[0.07]"
                  )}
                >
                  <MessageSquare className={cn("w-4 h-4 shrink-0", isActive("/admin/feedback") ? "text-amber-400" : "text-white/40 group-hover:text-white/70")} />
                  <span>Feedback Inbox</span>
                  {isActive("/admin/feedback") && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </Link>
                <Link
                  href="/admin/onboarding"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group",
                    isActive("/admin/onboarding") ? "bg-amber-400/15 text-amber-400 font-medium" : "text-white/55 hover:text-white/90 hover:bg-white/[0.07]"
                  )}
                >
                  <BarChart2 className={cn("w-4 h-4 shrink-0", isActive("/admin/onboarding") ? "text-amber-400" : "text-white/40 group-hover:text-white/70")} />
                  <span>Onboarding Funnel</span>
                  {isActive("/admin/onboarding") && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </Link>
                <Link
                  href="/admin/study"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group",
                    isActive("/admin/study") ? "bg-amber-400/15 text-amber-400 font-medium" : "text-white/55 hover:text-white/90 hover:bg-white/[0.07]"
                  )}
                >
                  <GraduationCap className={cn("w-4 h-4 shrink-0", isActive("/admin/study") ? "text-amber-400" : "text-white/40 group-hover:text-white/70")} />
                  <span>Study Tracker</span>
                  {isActive("/admin/study") && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </Link>
                <Link
                  href="/admin/applications"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group",
                    isActive("/admin/applications") ? "bg-amber-400/15 text-amber-400 font-medium" : "text-white/55 hover:text-white/90 hover:bg-white/[0.07]"
                  )}
                >
                  <ClipboardList className={cn("w-4 h-4 shrink-0", isActive("/admin/applications") ? "text-amber-400" : "text-white/40 group-hover:text-white/70")} />
                  <span>Applications</span>
                  {isActive("/admin/applications") && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </Link>
              </>
            )}
          </nav>

          {/* Sidebar footer */}
          <div className="px-1 lg:px-2 pb-3 pt-2 space-y-1" style={{ borderTop: "1px solid oklch(1 0 0 / 0.06)" }}>
            {/* Wren resting — hidden in icon-only mode */}
            <div className="hidden lg:block">
              <WrenSidebarPresence />
            </div>
            {user && (
              <div className="flex items-center justify-center lg:justify-start gap-2.5 px-1 lg:px-3 py-2 rounded-xl">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "oklch(0.74 0.14 72 / 0.18)" }}>
                  <span className="text-xs font-semibold" style={{ color: "oklch(0.74 0.14 72)" }}>{(user.name ?? "U").charAt(0).toUpperCase()}</span>
                </div>
                <div className="hidden lg:block min-w-0 flex-1">
                  <p className="text-xs font-medium truncate" style={{ color: "oklch(1 0 0 / 0.72)" }}>{user.name ?? "User"}</p>
                  {user.role === "admin" && <p className="text-[10px] font-medium" style={{ color: "oklch(0.80 0.17 65 / 0.65)" }}>Admin</p>}
                </div>
              </div>
            )}
            {/* Footer action buttons — icon-only at md, icon+label at lg */}
            <div className="flex flex-col lg:flex-row items-center gap-1 px-0.5 lg:px-1">
              <button onClick={toggleTheme} className="w-full flex items-center justify-center lg:justify-start gap-1.5 py-2 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-colors text-xs" title={theme === "dark" ? "Switch to light" : "Switch to dark"}>
                {theme === "dark" ? <Sun className="w-3.5 h-3.5 shrink-0" /> : <Moon className="w-3.5 h-3.5 shrink-0" />}
                <span className="hidden lg:block">{theme === "dark" ? "Light" : "Dark"}</span>
              </button>
              <button onClick={toggleLayoutMode} className="w-full flex items-center justify-center lg:justify-start gap-1.5 py-2 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-colors text-xs" title="Switch to compact view">
                <PanelLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:block">Compact</span>
              </button>
              <button onClick={() => logout()} className="w-full flex items-center justify-center lg:justify-start gap-1.5 py-2 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-colors text-xs" title="Sign out">
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:block">Sign out</span>
              </button>
            </div>
            {/* Changelog micro-link with "What's new" dot */}
            <a
              href="/changelog"
              className="hidden lg:flex items-center gap-1.5 px-1 py-1 text-[10px] transition-colors"
              style={{ color: "oklch(1 0 0 / 0.22)" }}
            >
              Changelog
              {new Date() <= new Date(new Date("2026-07-07").getTime() + 3 * 24 * 60 * 60 * 1000) && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                  style={{ background: "oklch(0.74 0.14 72)" }}
                  title="What's new"
                />
              )}
            </a>
          </div>
        </aside>

        {/* Main content — takes full width on /focus since sidebar is hidden */}
        <main
          className="bg-background"
          style={{
            flex: 1,
            width: isFocusRoute ? "100%" : undefined,
            overflowY: isFocusRoute ? "hidden" : "auto",
            overscrollBehavior: "contain",
            // On focus route the page itself manages its own h-[100svh] overflow-hidden
            height: isFocusRoute ? "100%" : undefined,
          }}
        >
          {children}
        </main>

        {/* FAB — speed-dial with two capture options */}
        <div className="fixed z-40 bottom-6 right-6 flex flex-col items-end gap-2">
          {/* Speed-dial options */}
          {fabMenuOpen && (
            <>
              <button
                onClick={() => { setFabMenuOpen(false); setThreadLockOpen(true); }}
                className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold shadow-lg active:scale-95 transition-all"
                style={{ background: "oklch(0.16 0.04 240)", color: "oklch(0.88 0.03 60)", border: "1px solid oklch(0.28 0.04 240)", boxShadow: "0 4px 16px oklch(0 0 0 / 0.4)" }}
                title="Hold That Thread (⌘⇧L)"
              >
                <Anchor className="w-3.5 h-3.5" style={{ color: "oklch(0.74 0.14 72)" }} />
                Hold That Thread
              </button>
              <button
                onClick={() => { setFabMenuOpen(false); setIdeaOpen(true); }}
                className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold shadow-lg active:scale-95 transition-all"
                style={{ background: "oklch(0.16 0.04 240)", color: "oklch(0.88 0.03 60)", border: "1px solid oklch(0.28 0.04 240)", boxShadow: "0 4px 16px oklch(0 0 0 / 0.4)" }}
                title="Capture an idea"
              >
                <Lightbulb className="w-3.5 h-3.5" style={{ color: "oklch(0.74 0.14 72)" }} />
                Capture Idea
              </button>
            </>
          )}
          {/* Main FAB button */}
          <button
            onClick={() => setFabMenuOpen((v) => !v)}
            className="w-12 h-12 rounded-full text-white active:scale-95 transition-all flex items-center justify-center"
            style={{ background: "oklch(0.74 0.14 72)", boxShadow: "0 4px 20px oklch(0.74 0.14 72 / 0.45), 0 0 0 2px var(--background)" }}
            title="Quick Capture"
            aria-label="Quick Capture"
          >
            {fabMenuOpen ? <X className="w-5 h-5" /> : <Lightbulb className="w-5 h-5" />}
          </button>
        </div>
        {/* Close speed-dial on outside click */}
        {fabMenuOpen && (
          <div className="fixed inset-0 z-30" onClick={() => setFabMenuOpen(false)} aria-hidden />
        )}

        <IdeaSanctuaryModal open={ideaOpen} onClose={() => setIdeaOpen(false)} />
        <ThreadLockModal open={threadLockOpen} onClose={() => setThreadLockOpen(false)} />
        <FeedbackPanel open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
        {showAmnesty && amnestyData && (
          <AmnestyScreen gapHours={amnestyData.hoursSince ?? 48} onComplete={dismissAmnesty} />
        )}
      </div>
      </IntroContext.Provider>
    );
  }

  // ── COMPACT / MOBILE LAYOUT ─────────────────────────────────────────────────
  return (
    <IntroContext.Provider value={{ replayIntro: onPreviewIntro ?? (() => {}) }}>
    <div
      className="h-screen w-full flex flex-col items-center overflow-hidden"
      style={{ background: "var(--sidebar)" }}
    >
      {/* Phone column */}
      <div className="w-full max-w-md h-full flex flex-col bg-background relative overflow-hidden shadow-2xl">
        {/* Top header — hidden during active focus sessions */}
        {!isFocusRoute && (
        <header
          className="flex items-center justify-between px-4 shrink-0 z-30 border-b border-white/10 nav-glass"
          style={{
            paddingTop: "max(env(safe-area-inset-top, 0px), 12px)",
            paddingBottom: "12px",
          }}
        >
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-navy.svg" alt="Continuary" className="h-8 w-8 object-contain rounded-lg" />
            {streak > 0 && (
              <span className="flex items-center gap-0.5 bg-amber-400/15 text-amber-400 text-[10px] font-semibold px-2 py-0.5 rounded-full" title={`${streak}-day streak`}>
                🔥 {streak}d
              </span>
            )}
          </Link>
          <div className="flex items-center gap-1">
            {/* Sync / offline indicator */}
            {!isOnline && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-medium" title="Offline">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Offline
              </span>
            )}
            {isOnline && syncState === "syncing" && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-medium animate-pulse" title="Syncing">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Syncing
              </span>
            )}
            {isOnline && syncState === "done" && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-medium" title="Synced">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Synced
              </span>
            )}
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
        )}

        {/* Page content */}
        <main className={isFocusRoute ? "flex-1 overflow-hidden h-full" : "flex-1 overflow-y-auto overscroll-contain pb-20"} style={isFocusRoute ? undefined : { scrollbarGutter: "stable" }}>
          {children}
        </main>

        {/* Bottom tab bar — hidden during focus sessions */}
        {!isFocusRoute && (
        <nav
          className="shrink-0 z-30 nav-glass"
          style={{
            borderTop: "1px solid oklch(1 0 0 / 0.08)",
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 10px)",
          }}
        >
          <div className="flex items-stretch justify-around px-0.5 pt-1">
            {PRIMARY_TABS.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <button
                  key={href}
                  onClick={() => {
                    if (active) window.scrollTo({ top: 0, behavior: "smooth" });
                    else navigate(href);
                  }}
                  className="flex flex-col items-center gap-0.5 flex-1 py-1.5 transition-all duration-150 relative min-h-[52px]"
                  style={{ color: active ? "oklch(0.74 0.14 72)" : "oklch(1 0 0 / 0.35)" }}
                >
                  {/* Active pill background */}
                  {active && (
                    <span
                      className="absolute inset-x-1 top-0.5 bottom-0.5 rounded-xl"
                      style={{ background: "oklch(0.74 0.14 72 / 0.14)" }}
                    />
                  )}
                  {/* Top accent line */}
                  {active && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-b-full"
                      style={{ background: "oklch(0.74 0.14 72)" }}
                    />
                  )}
                  <Icon className="w-[18px] h-[18px] relative z-10" />
                  <span
                    className="text-[9px] font-semibold tracking-wide relative z-10"
                    style={{ letterSpacing: "0.04em" }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
        )}
      </div>

      {/* More drawer removed — replaced by Hub tab (/hub) */}

      {/* FAB — speed-dial with two capture options */}
      {/* bottom: nav-bar-height(52px) + safe-area + 16px gap so FAB never overlaps the nav */}
      <div
        className="fixed z-40 flex flex-col items-end gap-2"
        style={{
          bottom: "calc(max(env(safe-area-inset-bottom, 0px), 8px) + 52px + 16px)",
          right: "max(calc(50vw - 224px + 16px), 16px)",
        }}
      >
        {fabMenuOpen && (
          <>
            <button
              onClick={() => { setFabMenuOpen(false); setThreadLockOpen(true); }}
              className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold shadow-lg active:scale-95 transition-all"
              style={{ background: "oklch(0.16 0.04 240)", color: "oklch(0.88 0.03 60)", border: "1px solid oklch(0.28 0.04 240)", boxShadow: "0 4px 16px oklch(0 0 0 / 0.4)" }}
            >
              <Anchor className="w-3.5 h-3.5" style={{ color: "oklch(0.74 0.14 72)" }} />
              Hold That Thread
            </button>
            <button
              onClick={() => { setFabMenuOpen(false); setIdeaOpen(true); }}
              className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold shadow-lg active:scale-95 transition-all"
              style={{ background: "oklch(0.16 0.04 240)", color: "oklch(0.88 0.03 60)", border: "1px solid oklch(0.28 0.04 240)", boxShadow: "0 4px 16px oklch(0 0 0 / 0.4)" }}
            >
              <Lightbulb className="w-3.5 h-3.5" style={{ color: "oklch(0.74 0.14 72)" }} />
              Capture Idea
            </button>
          </>
        )}
        <button
          onClick={() => setFabMenuOpen((v) => !v)}
          className="w-12 h-12 rounded-full bg-amber-400 text-amber-950 shadow-lg active:scale-95 transition-all flex items-center justify-center ring-2 ring-background shadow-amber-400/30"
        >
          {fabMenuOpen ? <X className="w-5 h-5" /> : <Lightbulb className="w-5 h-5" />}
        </button>
      </div>
      {fabMenuOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setFabMenuOpen(false)} aria-hidden />
      )}

      <IdeaSanctuaryModal open={ideaOpen} onClose={() => setIdeaOpen(false)} />
      <ThreadLockModal open={threadLockOpen} onClose={() => setThreadLockOpen(false)} />
      <FeedbackPanel open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      {showAmnesty && amnestyData && (
        <AmnestyScreen gapHours={amnestyData.hoursSince ?? 48} onComplete={dismissAmnesty} />
      )}
      <StreakMilestoneCelebration streak={streak} />
    </div>
    </IntroContext.Provider>
  );
}
