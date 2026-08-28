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
  Menu,
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
  Mic,
  Repeat,
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
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
import { getBrowserTimezone } from "@/lib/memberTime";
import {
  AUTH_RESOLUTION_TIMEOUT_MS,
  AUTH_SIGNOUT_ATTEMPT_TIMEOUT_MS,
  shouldShowAuthStartupRecovery,
} from "@/lib/authStartupRecovery";
import { CommandPaletteTrigger } from "./CommandPalette";
import WrenPlayer from "./WrenPlayer";
import StreakMilestoneCelebration from "./StreakMilestoneCelebration";

const LAYOUT_STORAGE_KEY = "continuary-layout-mode";

// ── Brand logo ───────────────────────────────────────────────────────────────
const BRAND_LOGO_SIGNIN = "/logo-navy.svg";

// ── All nav items ────────────────────────────────────────────────────────────
const ALL_NAV_ITEMS = [
  { href: "/",                label: "Today",             icon: Brain,         group: "today" },
  { href: "/capture",         label: "Capture",           icon: Mic,           group: "today" },
  { href: "/study",           label: "Single Focus Mode", icon: ClipboardList, group: "today" },
  { href: "/focus",           label: "Focus Sessions",    icon: Users,         group: "today" },
  { href: "/projects",        label: "Projects",          icon: Archive,       group: "work" },
  { href: "/loops",           label: "Open Loops",        icon: Repeat,        group: "work" },
  { href: "/ideas",           label: "Ideas",             icon: Sparkles,      group: "work" },
  { href: "/thread-locks",    label: "Thread Locks",      icon: Anchor,        group: "work" },
  { href: "/clarity",         label: "Clarity Engine",    icon: Zap,           group: "reflect" },
  { href: "/compass",         label: "Weekly Compass",    icon: Compass,       group: "reflect" },
  { href: "/emotional-cycle", label: "Emotional Cycle",   icon: BarChart2,     group: "reflect" },
  { href: "/evidence",        label: "Evidence Log",      icon: ScrollText,    group: "reflect" },
  { href: "/reading-bridge",  label: "Reading Bridge",    icon: BookOpen,      group: "reflect" },
  { href: "/vault",           label: "Knowledge Vault",   icon: BookOpen,      group: "vault" },
  { href: "/scratch",         label: "Scratch Pad",       icon: PenLine,       group: "vault" },
  { href: "/weekly",          label: "Weekly Review",     icon: Archive,       group: "more" },
  { href: "/intelligence",    label: "Intelligence",      icon: Lightbulb,     group: "more" },
  { href: "/settings",        label: "You & Wren",        icon: Settings,      group: "more" },
  { href: "/welcome",         label: "About",             icon: Home,          group: "more" },
  { href: "/tour",            label: "Take the Tour",     icon: GraduationCap, group: "more" },
  { href: "/pro",             label: "Pricing",           icon: Ticket,        group: "more" },
  { href: "/founding-member", label: "Founding Member",   icon: Star,          group: "more" },
] as const;

const NAV_GROUPS = [
  { key: "today", label: "Today" },
  { key: "work", label: "Work" },
  { key: "reflect", label: "Reflect" },
  { key: "vault", label: "Vault" },
  { key: "more", label: "More" },
] as const;

const INTERNAL_PAGE_TITLES: Record<string, string> = {
  "/": "Today",
  "/capture": "Capture",
  "/projects": "Projects",
  "/loops": "Open Loops",
  "/ideas": "Ideas",
  "/thread-locks": "Thread Locks",
  "/study": "Single Focus Mode",
  "/focus": "Focus Sessions",
  "/clarity": "Clarity Engine",
  "/compass": "Weekly Compass",
  "/weekly": "Weekly Review",
  "/emotional-cycle": "Emotional Cycle",
  "/evidence": "Evidence Log",
  "/reading-bridge": "Reading Bridge",
  "/vault": "Knowledge Vault",
  "/scratch": "Scratch Pad",
  "/intelligence": "Intelligence",
  "/settings": "Settings",
  "/pro": "Membership",
};

// ── Mobile bottom-tab items (core destinations + grouped navigation drawer) ──
const PRIMARY_TABS = [
  { href: "/",         label: "Today",   icon: Brain },
  { href: "/capture",  label: "Capture", icon: Mic },
  { href: "/focus",    label: "Focus",   icon: Users },
  { href: "__more__",  label: "More",    icon: MoreHorizontal },
] as const;

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
      <a
        href="/settings?tab=preferences#wren-tone"
        className="text-[10px] tracking-wide hover:opacity-90 transition-opacity"
        style={{ color: "oklch(1 0 0 / 0.40)" }}
        aria-label="Tune how Wren talks"
      >
        Wren is here with you <span style={{ color: "var(--accent-tint-text)" }}>· Tune her voice →</span>
      </a>
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
  const utils = trpc.useUtils();
  const claimFoundingSeat = trpc.beta.claimFoundingSeat.useMutation();
  const [admissionState, setAdmissionState] = useState<"idle" | "claiming" | "full" | "granted">("idle");
  const admissionAttemptedRef = useRef(false);
  const { theme, toggleTheme } = useTheme();
  useEffect(() => {
    const exact = INTERNAL_PAGE_TITLES[location];
    const matchingPath = Object.keys(INTERNAL_PAGE_TITLES)
      .filter((path) => path !== "/" && location.startsWith(path))
      .sort((a, b) => b.length - a.length)[0];
    const title = exact ?? (matchingPath ? INTERNAL_PAGE_TITLES[matchingPath] : "Continuary");
    document.title = title.includes("Continuary") ? title : `${title} · Continuary`;
  }, [location]);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [threadLockOpen, setThreadLockOpen] = useState(false);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location]);
  const [navExpanded, setNavExpanded] = useState<Record<string, boolean>>({
    today: true,
    work: true,
    reflect: true,
    vault: true,
    more: false,
  });
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
  const captureTimezone = trpc.settings.captureTimezone.useMutation({
    onSuccess: () => utils.settings.getProfile.invalidate(),
  });

  useEffect(() => {
    if (!isAuthenticated || !profile || profile.timezoneDetectedAt || captureTimezone.isPending) return;
    captureTimezone.mutate({ timezone: getBrowserTimezone() });
  }, [isAuthenticated, profile, captureTimezone]);

  // Keep persisted accessibility preferences active across every authenticated route.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.fontSize = profile?.fontSizePreference ?? "medium";
    root.dataset.reducedVisualNoise = profile?.reducedVisualNoise ? "true" : "false";
  }, [profile?.fontSizePreference, profile?.reducedVisualNoise]);
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
  const { data: loopsCountData } = trpc.loops.count.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  const loopsCount = loopsCountData?.count ?? 0;

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

  const pendingManualInvite = typeof window !== "undefined" && !!sessionStorage.getItem("pendingInviteCode");
  const needsAutomaticAdmission = !!(
    isAuthenticated &&
    user &&
    user.role !== "admin" &&
    !user.hasRedeemedInvite &&
    !pendingManualInvite &&
    location !== "/invite-gate" &&
    !location.startsWith("/redeem-referral")
  );

  // Frictionless founding admission. This is intentionally before the onboarding
  // gate: a new person either gets a seat and proceeds to onboarding, or sees the
  // cap-full waitlist—not a temporary code wall.
  useEffect(() => {
    if (!needsAutomaticAdmission || admissionAttemptedRef.current) return;
    admissionAttemptedRef.current = true;
    setAdmissionState("claiming");

    claimFoundingSeat.mutateAsync()
      .then(async (result) => {
        if (result.granted) {
          setAdmissionState("granted");
          await utils.auth.me.invalidate();
          await utils.settings.getProfile.invalidate();
          return;
        }
        setAdmissionState("full");
        navigate("/invite-gate");
      })
      .catch(() => {
        // Preserve a usable manual-code path if the admission request cannot run.
        setAdmissionState("full");
        navigate("/invite-gate");
      });
  }, [needsAutomaticAdmission, claimFoundingSeat, utils.auth.me, utils.settings.getProfile, navigate]);

  // Onboarding gate — admin users bypass entirely (they may not have a profile yet)
  useEffect(() => {
    if (
      isAuthenticated &&
      user &&
      user.role === "admin"
    ) return; // admins skip onboarding
    if (!needsAutomaticAdmission && isAuthenticated && profile && profile.onboardingCompleted === false && location !== "/onboarding") {
      navigate("/onboarding");
    }
  }, [needsAutomaticAdmission, isAuthenticated, user, profile, navigate, location]);

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
  const autoAdmissionResolving = needsAutomaticAdmission && admissionState !== "full" && admissionState !== "granted";
  const authGateResolving = authLoading || profileLoading || autoAdmissionResolving;
  const [authResolutionTimedOut, setAuthResolutionTimedOut] = useState(false);
  const [authRecoverySigningIn, setAuthRecoverySigningIn] = useState(false);

  useEffect(() => {
    if (!authGateResolving) {
      setAuthResolutionTimedOut(false);
      return;
    }

    const timeout = window.setTimeout(
      () => setAuthResolutionTimedOut(true),
      AUTH_RESOLUTION_TIMEOUT_MS,
    );

    return () => window.clearTimeout(timeout);
  }, [authGateResolving]);

  const restartSignIn = async () => {
    if (authRecoverySigningIn) return;
    setAuthRecoverySigningIn(true);
    if (location && location !== "/" && location !== "/landing") {
      localStorage.setItem("continuary_return_path", location);
    }

    // Clear the httpOnly session cookie through the server before starting OAuth.
    // A short timeout guarantees an unresponsive stale session cannot trap someone
    // on this recovery screen; the OAuth callback will issue a fresh cookie.
    await Promise.race([
      logout().catch(() => undefined),
      new Promise<void>((resolve) => window.setTimeout(resolve, AUTH_SIGNOUT_ATTEMPT_TIMEOUT_MS)),
    ]);
    window.location.assign(getLoginUrl());
  };

  if (authGateResolving && !authResolutionTimedOut) {
    return <DashboardLayoutSkeleton />;
  }

  if (shouldShowAuthStartupRecovery(authGateResolving, authResolutionTimedOut)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1rem", background: "#F4F5F2", color: "#2A2D28" }}
      >
        <div className="w-full max-w-sm rounded-2xl p-6 text-center shadow-lg" style={{ background: "#E6E8E3", border: "1px solid #D3D6D0" }}>
          <img src={BRAND_LOGO_SIGNIN} alt="Continuary" className="w-14 h-14 object-contain rounded-2xl mx-auto mb-4" />
          <h1 className="text-xl font-semibold" style={{ fontFamily: "'Archivo', system-ui, sans-serif" }}>Let’s restore your session</h1>
          <p className="text-sm leading-relaxed mt-3" style={{ color: "#6B6F68" }}>
            Continuary could not finish loading your account. Your work is safe — please sign in again to continue.
          </p>
          <button
            type="button"
            onClick={restartSignIn}
            disabled={authRecoverySigningIn}
            className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl text-sm font-semibold mt-6 hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
            style={{ background: "#C8452B", color: "#FFFFFF", boxShadow: "0 4px 12px rgb(200 69 43 / 0.20)" }}
          >
            {authRecoverySigningIn ? "Resetting session…" : "Sign in again"}
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs underline underline-offset-4 mt-4 hover:opacity-75"
            style={{ color: "#4B4F48" }}
          >
            Try reloading first
          </button>
        </div>
      </div>
    );
  }

  // ── Unauthenticated landing ─────────────────────────────────────────────────
  // Show sign-in card for any unauthenticated route — wait for auth to resolve first
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100dvh',padding:'1rem',background:'#F4F5F2',color:'#2A2D28'}}>
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center gap-6" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'1.5rem'}}>
            <div className="flex flex-col items-center gap-3 animate-fade-slide-up" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.75rem'}}>
              <img src="/logo-navy.svg" alt="Continuary" className="w-20 h-20 object-contain rounded-2xl" />
              <div className="flex flex-col items-center gap-1" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.25rem'}}>
                <span className="text-2xl font-semibold tracking-wide" style={{ fontFamily: "'Archivo', system-ui, sans-serif", color:'#2A2D28' }}>Continuary</span>
                <p className="text-sm tracking-widest uppercase" style={{ color:'#6B6F68' }}>Your Memory Companion</p>
              </div>
            </div>
            <div className="w-full rounded-2xl p-6 shadow-lg animate-fade-slide-up animate-delay-200" style={{ background:'#E6E8E3', border:'1px solid #D3D6D0' }}>
              <p className="text-sm text-center mb-5 leading-relaxed" style={{ color:'#6B6F68' }}>
                Continuary keeps your thread. Pick up exactly where you left off.
              </p>
              <a
                href="/apply"
                className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
                style={{ background:'#C8452B', color:'#FFFFFF', boxShadow:'0 4px 12px rgb(200 69 43 / 0.20)' }}
              >
                Claim your founding seat
                <ChevronRight className="w-4 h-4" />
              </a>
              <a
                href={getLoginUrl()}
                onClick={() => {
                  if (location && location !== "/" && location !== "/landing") {
                    localStorage.setItem("continuary_return_path", location);
                  }
                }}
                className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl text-sm font-semibold border hover:opacity-90 active:scale-[0.98] transition-all mt-2"
                style={{ background:'#E6E8E3', color:'#2A2D28', borderColor:'#D3D6D0' }}
              >
                Sign in to continue
                <ChevronRight className="w-4 h-4" />
              </a>
            <a href="/tour" className="block text-center text-xs transition-colors mt-3 hover:opacity-75" style={{ color:'#4B4F48' }}>← See what's inside</a>
            <a href="/pricing" className="block text-center text-xs transition-colors mt-1 hover:opacity-75" style={{ color:'#4B4F48' }}>See pricing →</a>
            </div>
          </div>
          <div className="flex justify-center mt-5 animate-fade-slide-up animate-delay-400">
            <a href="/tour" className="text-sm transition-colors underline underline-offset-4 tracking-wide hover:opacity-75" style={{ color:'#4B4F48' }}>
              Take the tour
            </a>
          </div>
          <p className="text-center text-sm mt-4 animate-fade-slide-up animate-delay-400" style={{ color:'#6B6F68' }}>Built for minds that keep going.</p>
          <p className="text-center text-sm mt-3 animate-fade-slide-up animate-delay-400" style={{ color:'#6B6F68' }}>
            <a href="/privacy" className="hover:opacity-75 underline underline-offset-2 transition-colors">Privacy</a>
            {" · "}
            <a href="/terms" className="hover:opacity-75 underline underline-offset-2 transition-colors">Terms</a>
            {" · "}
            <a href="/changelog" className="hover:opacity-75 underline underline-offset-2 transition-colors inline-flex items-center gap-1.5">
              Changelog
              {/* Last updated date — always visible */}
              <span className="text-[9px]" style={{ color: "oklch(0.48 0.016 240)" }}>Jul 7</span>
              {/* Amber dot: visible for 3 days after the latest entry date */}
              {new Date() <= new Date(new Date("2026-07-07").getTime() + 3 * 24 * 60 * 60 * 1000) && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                  style={{ background: "#C8452B" }}
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
  const isPrimaryMobileRoute = PRIMARY_TABS.some((tab) => tab.href !== "__more__" && isActive(tab.href));
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
          <div className="flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-4 py-4" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
            <Link href="/" className="flex items-center gap-3 min-w-0">
              <img src="/logo-navy.svg" alt="Continuary" className="h-8 w-8 object-contain rounded-lg shrink-0" />
              <span className="hidden lg:block text-sm font-semibold truncate tracking-wide text-sidebar-foreground">Continuary</span>
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
          {/* Grouped navigation keeps the first scan calm; ⌘K still reaches every destination. */}
          <nav className="flex-1 px-1 lg:px-2 py-3 space-y-2" aria-label="Primary navigation">
            {NAV_GROUPS.map((group) => {
              const items = ALL_NAV_ITEMS.filter((item) => item.group === group.key);
              const hasActiveItem = items.some((item) => isActive(item.href));
              const expanded = navExpanded[group.key] || hasActiveItem;
              return (
                <section key={group.key} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => setNavExpanded((current) => ({ ...current, [group.key]: !expanded }))}
                    className="hidden lg:flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-left transition-colors"
                    style={{ color: "var(--muted-foreground)" }}
                    aria-expanded={expanded}
                    aria-controls={`nav-group-${group.key}`}
                  >
                    {group.label}
                    <ChevronRight className={cn("w-3 h-3 transition-transform", expanded && "rotate-90")} aria-hidden="true" />
                  </button>
                  <div id={`nav-group-${group.key}`} className={cn(!expanded && "hidden lg:hidden")}>
                    {items.map(({ href, label, icon: Icon }) => {
                      const active = isActive(href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          title={label}
                          className="flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group"
                          style={active
                            ? { background: "var(--brand-muted)", color: "var(--accent-tint-text)", fontWeight: 600 }
                            : { color: "var(--sidebar-foreground)" }
                          }
                        >
                          <Icon className="w-4 h-4 shrink-0" aria-hidden="true" style={{ color: active ? "var(--accent-tint-text)" : "var(--muted-foreground)" }} />
                          <span className="hidden lg:block">{label}</span>
                          {href === "/scratch" && scratchCount > 0 && !active && (
                            <span className="hidden lg:block ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--brand-muted)", color: "var(--accent-tint-text)" }}>{scratchCount}</span>
                          )}
                          {href === "/loops" && loopsCount > 0 && !active && (
                            <span className="hidden lg:block ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.75 0.18 310 / 0.18)", color: "oklch(0.75 0.18 310)" }}>{loopsCount}</span>
                          )}
                          {active && <span className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full" aria-hidden="true" style={{ background: "var(--accent-tint-text)" }} />}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {/* Feedback */}
            <button
              onClick={() => setFeedbackOpen(true)}
              title="Send Feedback"
              className="flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-2.5 rounded-xl text-sm transition-all duration-150 w-full text-left"
              style={{ color: "var(--sidebar-foreground)" }}
            >
              <MessageSquare className="w-4 h-4 shrink-0" style={{ color: "var(--muted-foreground)" }} />
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
          <div className="px-1 lg:px-2 pb-3 pt-2 space-y-1" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
            {/* Wren resting — hidden in icon-only mode */}
            {location === "/focus" && (
              <div className="hidden lg:block">
                <WrenSidebarPresence />
              </div>
            )}
            {user && (
              <div className="flex items-center justify-center lg:justify-start gap-2.5 px-1 lg:px-3 py-2 rounded-xl">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "oklch(0.56 0.18 28 / 0.18)" }}>
                  <span className="text-xs font-semibold" style={{ color: "var(--accent-tint-text)" }}>{(user.name ?? "U").charAt(0).toUpperCase()}</span>
                </div>
                <div className="hidden lg:block min-w-0 flex-1">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--sidebar-foreground)" }}>{user.name ?? "User"}</p>
                  {user.role === "admin" && <p className="text-[10px] font-medium" style={{ color: "oklch(0.80 0.17 65 / 0.65)" }}>Admin</p>}
                </div>
              </div>
            )}
            {/* Footer action buttons — icon-only at md, icon+label at lg */}
            <div className="flex flex-col lg:flex-row items-center gap-1 px-0.5 lg:px-1">
              <button onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} className="w-full flex items-center justify-center lg:justify-start gap-1.5 py-2 rounded-xl transition-colors text-xs" style={{ color: "var(--muted-foreground)" }} title={theme === "dark" ? "Switch to light" : "Switch to dark"}>
                {theme === "dark" ? <Sun className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> : <Moon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                <span className="hidden lg:block">{theme === "dark" ? "Light" : "Dark"}</span>
              </button>
              <button onClick={toggleLayoutMode} aria-label="Switch to compact view" className="w-full flex items-center justify-center lg:justify-start gap-1.5 py-2 rounded-xl transition-colors text-xs" style={{ color: "var(--muted-foreground)" }} title="Switch to compact view">
                <PanelLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden lg:block">Compact</span>
              </button>
              <button onClick={() => logout()} aria-label="Sign out" className="w-full flex items-center justify-center lg:justify-start gap-1.5 py-2 rounded-xl transition-colors text-xs" style={{ color: "var(--muted-foreground)" }} title="Sign out">
                <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden lg:block">Sign out</span>
              </button>
            </div>
            {/* Changelog micro-link with last-updated date + "What's new" dot */}
            <a
              href="/changelog"
              className="hidden lg:flex items-center gap-1.5 px-1 py-1 text-[10px] transition-colors"
              style={{ color: "var(--muted-foreground)" }}
            >
              Changelog
              {/* Last updated date — always visible */}
              <span style={{ color: "var(--muted-foreground)" }}>· Jul 7</span>
              {/* Amber dot: visible for 3 days after the latest entry date */}
              {new Date() <= new Date(new Date("2026-07-07").getTime() + 3 * 24 * 60 * 60 * 1000) && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                  style={{ background: "#C8452B" }}
                  title="What's new"
                />
              )}
            </a>
          </div>
        </aside>

        {/* Main content — takes full width on /focus since sidebar is hidden */}
        <main
          id="main-content"
          className={isFocusRoute ? "bg-background" : "bg-background pb-28 sm:pb-8"}
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
        <div className="fixed z-40 bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col items-end gap-2">
          {/* Speed-dial options */}
          {fabMenuOpen && (
            <>
              <button
                onClick={() => { setFabMenuOpen(false); setThreadLockOpen(true); }}
                className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold shadow-lg active:scale-95 transition-all"
                style={{ background: "oklch(0.16 0.04 240)", color: "oklch(0.88 0.03 60)", border: "1px solid oklch(0.28 0.04 240)", boxShadow: "0 4px 16px oklch(0 0 0 / 0.4)" }}
                title="Hold That Thread (⌘⇧L)"
              >
                <Anchor className="w-3.5 h-3.5" style={{ color: "#C8452B" }} />
                Hold That Thread
              </button>
              <button
                onClick={() => { setFabMenuOpen(false); navigate("/capture"); }}
                className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold shadow-lg active:scale-95 transition-all"
                style={{ background: "oklch(0.16 0.04 240)", color: "oklch(0.88 0.03 60)", border: "1px solid oklch(0.28 0.04 240)", boxShadow: "0 4px 16px oklch(0 0 0 / 0.4)" }}
                title="Voice or text capture"
              >
                <Mic className="w-3.5 h-3.5" style={{ color: "#C8452B" }} />
                Capture
              </button>
              <button
                onClick={() => { setFabMenuOpen(false); setIdeaOpen(true); }}
                className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold shadow-lg active:scale-95 transition-all"
                style={{ background: "oklch(0.16 0.04 240)", color: "oklch(0.88 0.03 60)", border: "1px solid oklch(0.28 0.04 240)", boxShadow: "0 4px 16px oklch(0 0 0 / 0.4)" }}
                title="Capture an idea"
              >
                <Lightbulb className="w-3.5 h-3.5" style={{ color: "#C8452B" }} />
                Capture Idea
              </button>
            </>
          )}
          {/* Main FAB button */}
          <button
            onClick={() => setFabMenuOpen((v) => !v)}
            className="w-12 h-12 rounded-full text-white active:scale-95 transition-all flex items-center justify-center"
            style={{ background: "#C8452B", boxShadow: "0 4px 20px oklch(0.56 0.18 28 / 0.45), 0 0 0 2px var(--background)" }}
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
          className="flex items-center justify-between px-4 shrink-0 z-30"
          style={{
            background: "var(--sidebar)",
            color: "var(--sidebar-foreground)",
            borderBottom: "1px solid var(--sidebar-border)",
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
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="p-2 rounded-xl transition-colors"
              style={{ color: "var(--sidebar-foreground)" }}
              aria-label="Open navigation"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-navigation-drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
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
            <button onClick={toggleTheme} className="p-2 rounded-xl transition-colors" style={{ color: "var(--sidebar-foreground)" }} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
            <button onClick={() => logout()} className="p-2 rounded-xl transition-colors" style={{ color: "var(--sidebar-foreground)" }} aria-label="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
        )}

        {/* Page content */}
        <main id="main-content" className={isFocusRoute ? "flex-1 overflow-hidden h-full" : "flex-1 overflow-y-auto overscroll-contain pb-24 pr-16"} style={isFocusRoute ? undefined : { scrollbarGutter: "stable" }}>
          {children}
        </main>

        {/* Bottom tab bar — hidden during focus sessions */}
        {!isFocusRoute && (
        <nav
          className="shrink-0 z-30"
          style={{
            background: "var(--sidebar)",
            borderTop: "1px solid var(--sidebar-border)",
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 10px)",
          }}
        >
          <div className="flex items-stretch justify-around px-0.5 pt-1">
            {PRIMARY_TABS.map(({ href, label, icon: Icon }) => {
              const opensDrawer = href === "__more__";
              const active = opensDrawer ? !isPrimaryMobileRoute : isActive(href);
              return (
                <button
                  key={href}
                  onClick={() => {
                    if (opensDrawer) setMobileNavOpen(true);
                    else if (active) window.scrollTo({ top: 0, behavior: "smooth" });
                    else navigate(href);
                  }}
                  className="flex flex-col items-center gap-0.5 flex-1 py-1.5 transition-all duration-150 relative min-h-[52px]"
                  style={{ color: active ? "var(--accent-tint-text)" : "var(--sidebar-foreground)" }}
                  aria-label={opensDrawer ? "Open more navigation" : label}
                  aria-current={active && !opensDrawer ? "page" : undefined}
                >
                  {/* Active pill background */}
                  {active && (
                    <span
                      className="absolute inset-x-1 top-0.5 bottom-0.5 rounded-xl"
                      style={{ background: "color-mix(in srgb, var(--primary) 14%, transparent)" }}
                    />
                  )}
                  {/* Top accent line */}
                  {active && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-b-full"
                      style={{ background: "var(--accent-tint-text)" }}
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

      {/* Grouped desktop sidebar, adapted as a dismissible mobile drawer. */}
      {mobileNavOpen && !isFocusRoute && (
        <div className="fixed inset-0 z-50 lg:hidden" aria-modal="true" role="dialog" aria-label="Navigation menu">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            id="mobile-navigation-drawer"
            className="relative h-full w-[min(86vw,340px)] flex flex-col overflow-y-auto"
            style={{
              background: "var(--sidebar)",
              color: "var(--sidebar-foreground)",
              paddingTop: "max(env(safe-area-inset-top, 0px), 12px)",
              paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
            }}
          >
            <div className="flex items-center justify-between px-4 pb-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
              <Link href="/" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2 font-semibold">
                <img src="/logo-navy.svg" alt="Continuary" className="h-8 w-8 object-contain rounded-lg" />
                Continuary
              </Link>
              <button type="button" onClick={() => setMobileNavOpen(false)} className="p-2 rounded-xl" style={{ color: "var(--sidebar-foreground)" }} aria-label="Close navigation">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-5" aria-label="All navigation">
              {NAV_GROUPS.map((group) => {
                const items = ALL_NAV_ITEMS.filter((item) => item.group === group.key);
                return (
                  <section key={group.key}>
                    <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>{group.label}</p>
                    <div className="space-y-0.5">
                      {items.map(({ href, label, icon: Icon }) => {
                        const active = isActive(href);
                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setMobileNavOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm"
                            style={active ? { background: "var(--brand-muted)", color: "var(--accent-tint-text)", fontWeight: 600 } : { color: "var(--sidebar-foreground)" }}
                            aria-current={active ? "page" : undefined}
                          >
                            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>{label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

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
              <Anchor className="w-3.5 h-3.5" style={{ color: "#C8452B" }} />
              Hold That Thread
            </button>
            <button
              onClick={() => { setFabMenuOpen(false); navigate("/capture"); }}
              className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold shadow-lg active:scale-95 transition-all"
              style={{ background: "oklch(0.16 0.04 240)", color: "oklch(0.88 0.03 60)", border: "1px solid oklch(0.28 0.04 240)", boxShadow: "0 4px 16px oklch(0 0 0 / 0.4)" }}
            >
              <Mic className="w-3.5 h-3.5" style={{ color: "#C8452B" }} />
              Capture
            </button>
            <button
              onClick={() => { setFabMenuOpen(false); setIdeaOpen(true); }}
              className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold shadow-lg active:scale-95 transition-all"
              style={{ background: "oklch(0.16 0.04 240)", color: "oklch(0.88 0.03 60)", border: "1px solid oklch(0.28 0.04 240)", boxShadow: "0 4px 16px oklch(0 0 0 / 0.4)" }}
            >
              <Lightbulb className="w-3.5 h-3.5" style={{ color: "#C8452B" }} />
              Capture Idea
            </button>
          </>
        )}
        <button
          onClick={() => setFabMenuOpen((v) => !v)}
          className="w-12 h-12 rounded-md bg-primary text-primary-foreground shadow-sm active:translate-y-px transition-all flex items-center justify-center ring-2 ring-background"
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
