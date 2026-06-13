/**
 * useAppVersion — proactive update detection for Continuary.
 *
 * Two complementary mechanisms:
 *
 * 1. Service-Worker update flow (primary)
 *    The SW already handles SKIP_WAITING messages. We listen for
 *    `updatefound` on the registration and surface a prompt when a new
 *    worker reaches the `installed` state (i.e. it's waiting to activate).
 *    The user can then choose when to apply the update.
 *
 * 2. Version polling (belt-and-suspenders)
 *    Polls /api/version every 3 minutes and on visibilitychange/focus.
 *    If the server version differs from the compiled VITE_BUILD_HASH, we
 *    surface the same prompt. This catches cases where the SW is bypassed
 *    (incognito, HTTPS cache, first load before SW is registered).
 *
 * In local dev both mechanisms are effectively disabled:
 *   - SW is not registered in dev
 *   - VITE_BUILD_HASH defaults to "dev", server returns "dev" → no mismatch
 */

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
const LOADED_HASH = import.meta.env.VITE_BUILD_HASH as string ?? "dev";

export type UpdateReadyCallback = (applyUpdate: () => void) => void;

export function useAppVersion(onUpdateReady: UpdateReadyCallback) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const shownVersionRef = useRef<string | null>(null);
  const onUpdateReadyRef = useRef(onUpdateReady);
  onUpdateReadyRef.current = onUpdateReady;

  const applyUpdate = useCallback(() => {
    if (waitingWorkerRef.current) {
      // Tell the waiting SW to skip waiting and take over immediately.
      waitingWorkerRef.current.postMessage({ type: "SKIP_WAITING" });
      // The `controllerchange` event will fire when the new SW activates;
      // reload then to pick up the new bundle.
      navigator.serviceWorker?.addEventListener("controllerchange", () => {
        window.location.reload();
      }, { once: true });
    } else {
      window.location.reload();
    }
  }, []);

  // ── Service Worker update detection ────────────────────────────────────────
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleRegistration = (reg: ServiceWorkerRegistration) => {
      // If there's already a waiting worker (e.g. page was backgrounded), surface immediately.
      if (reg.waiting) {
        waitingWorkerRef.current = reg.waiting;
        setUpdateAvailable(true);
        onUpdateReadyRef.current(applyUpdate);
        return;
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New SW installed and waiting — there's an active SW being replaced.
            waitingWorkerRef.current = newWorker;
            setUpdateAvailable(true);
            onUpdateReadyRef.current(applyUpdate);
          }
        });
      });
    };

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) handleRegistration(reg);
    });
  }, [applyUpdate]);

  // ── Version polling ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (LOADED_HASH === "dev") return; // Don't poll in local dev

    const checkVersion = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { version } = await res.json() as { version: string };
        if (version && version !== "dev" && version !== LOADED_HASH && version !== shownVersionRef.current) {
          shownVersionRef.current = version;
          setUpdateAvailable(true);
          onUpdateReadyRef.current(applyUpdate);
        }
      } catch {
        // Network error — ignore, will retry on next poll
      }
    };

    // Check immediately on mount, then on interval
    checkVersion();
    const interval = setInterval(checkVersion, POLL_INTERVAL_MS);

    // Also check when the user returns to the tab
    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkVersion();
    };
    const handleFocus = () => checkVersion();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [applyUpdate]);

  return { updateAvailable };
}
