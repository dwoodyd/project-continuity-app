/**
 * PWAInstallBanner
 *
 * Shows a bottom banner when the browser fires `beforeinstallprompt` (Android/Chrome/Edge).
 * On iOS, shows a manual "Add to Home Screen" instruction instead (iOS doesn't support
 * the install prompt API).
 *
 * Dismissed state is persisted in localStorage for 30 days.
 */
import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const VISIT_COUNT_KEY = "pwa-install-visit-count";
const SCROLL_THRESHOLD = 0.5;

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Date.now() - ts < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as any).standalone === true)
  );
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [visible, setVisible] = useState(false);
  const [visitCount, setVisitCount] = useState(0);
  const [hasEngaged, setHasEngaged] = useState(false);
  const pathname = typeof window === "undefined" ? "" : window.location.pathname;
  const eligible = pathname !== "/pricing" && visitCount >= 2 && hasEngaged && !isDismissed() && !isInStandaloneMode();

  useEffect(() => {
    try {
      const nextCount = Number(localStorage.getItem(VISIT_COUNT_KEY) ?? "0") + 1;
      localStorage.setItem(VISIT_COUNT_KEY, String(nextCount));
      setVisitCount(nextCount);
    } catch {
      setVisitCount(1);
    }

    const handleScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 0 && window.scrollY / scrollable >= SCROLL_THRESHOLD) {
        setHasEngaged(true);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isInStandaloneMode() || isDismissed() || pathname === "/pricing") return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [pathname]);

  useEffect(() => {
    if (!eligible) return;
    if (isIOS()) {
      setShowIOS(true);
      setVisible(true);
      return;
    }
    if (deferredPrompt) setVisible(true);
  }, [deferredPrompt, eligible]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    dismiss();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      style={{ background: "linear-gradient(to top, oklch(0.16 0.04 264) 80%, transparent)" }}
    >
      <div className="max-w-lg mx-auto rounded-2xl border border-white/10 bg-[oklch(0.20_0.06_264)] shadow-2xl shadow-black/40 p-4 flex items-start gap-3 animate-spring-pop">
        <img
          src="/icon-96.png"
          alt="Continuary"
          className="w-12 h-12 rounded-xl shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">
            Add Continuary to your home screen
          </p>
          {showIOS ? (
            <p className="text-xs text-white/60 mt-0.5 leading-relaxed">
              Tap the <Share className="inline w-3.5 h-3.5 mb-0.5" aria-hidden="true" /> Share button in Safari, then
              choose <strong className="text-white/80">Add to Home Screen</strong>.
            </p>
          ) : (
            <p className="text-xs text-white/60 mt-0.5">
              Install for faster access and offline support.
            </p>
          )}
          {!showIOS && (
            <Button
              size="sm"
              onClick={handleInstall}
              className="mt-2 h-7 text-xs bg-amber-400 hover:bg-amber-300 text-amber-950 font-semibold border-0 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Install app
            </Button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-white/40 hover:text-white/70 transition-colors mt-0.5"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
