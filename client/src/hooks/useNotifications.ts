import { useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  tag: string;
  scheduledHour: number;
  scheduledMinute: number;
  url?: string;
}

interface OfflineIdea {
  id: string;
  content: string;
  capturedAt: number;
  synced: boolean;
}

// ─── IndexedDB helpers ────────────────────────────────────────────────────────
const DB_NAME = "continuity-offline";
const DB_VERSION = 1;
const STORE_IDEAS = "offline-ideas";
const STORE_NOTIF = "scheduled-notifications";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_IDEAS)) {
        db.createObjectStore(STORE_IDEAS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_NOTIF)) {
        db.createObjectStore(STORE_NOTIF, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(storeName: string, value: unknown) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(storeName: string, key: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useNotifications() {
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const isSupported = typeof window !== "undefined" && "Notification" in window;

  const getPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return "denied";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    return Notification.requestPermission();
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const perm = await getPermission();
    return perm === "granted";
  }, [getPermission]);

  // Register service worker
  const registerSW = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      return reg;
    } catch (e) {
      console.warn("[SW] Registration failed:", e);
      return null;
    }
  }, []);

  // Schedule a local notification using setTimeout (no server push required)
  const scheduleLocalNotification = useCallback((notif: ScheduledNotification) => {
    if (!isSupported || Notification.permission !== "granted") return;

    const now = new Date();
    const target = new Date();
    target.setHours(notif.scheduledHour, notif.scheduledMinute, 0, 0);

    // If time already passed today, schedule for tomorrow
    if (target <= now) target.setDate(target.getDate() + 1);

    const delay = target.getTime() - now.getTime();

    // Clear existing timer for this id
    const existing = timersRef.current.get(notif.id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      if (Notification.permission === "granted") {
        const n = new Notification(notif.title, {
          body: notif.body,
          tag: notif.tag,
          icon: "/favicon.ico",
        });
        n.onclick = () => {
          window.focus();
          if (notif.url) window.location.href = notif.url;
          n.close();
        };
      }
      // Reschedule for next day
      scheduleLocalNotification(notif);
    }, delay);

    timersRef.current.set(notif.id, timer);
  }, [isSupported]);

  // Schedule all check-in notifications based on settings
  const scheduleCheckInNotifications = useCallback((settings: {
    morningEnabled: boolean;
    morningTime: string; // "HH:MM"
    middayEnabled: boolean;
    middayTime: string;
    eveningEnabled: boolean;
    eveningTime: string;
  }) => {
    if (!isSupported || Notification.permission !== "granted") return;

    const parseTime = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return { hour: h ?? 9, minute: m ?? 0 };
    };

    if (settings.morningEnabled) {
      const { hour, minute } = parseTime(settings.morningTime);
      scheduleLocalNotification({
        id: "morning-checkin",
        title: "Continuary",
        body: "Your day is ready. Morning check-in is open.",
        tag: "morning-checkin",
        scheduledHour: hour,
        scheduledMinute: minute,
        url: "/",
      });
    }

    if (settings.middayEnabled) {
      const { hour, minute } = parseTime(settings.middayTime);
      scheduleLocalNotification({
        id: "midday-checkin",
        title: "Continuary",
        body: "Midday check-in is open. Still on track?",
        tag: "midday-checkin",
        scheduledHour: hour,
        scheduledMinute: minute,
        url: "/",
      });
    }

    if (settings.eveningEnabled) {
      const { hour, minute } = parseTime(settings.eveningTime);
      scheduleLocalNotification({
        id: "evening-checkin",
        title: "Continuary",
        body: "Close the day while the work is still near.",
        tag: "evening-checkin",
        scheduledHour: hour,
        scheduledMinute: minute,
        url: "/",
      });
    }
  }, [isSupported, scheduleLocalNotification]);

  // Clear all scheduled notifications
  const clearAllNotifications = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  // ─── Offline Idea Queue ──────────────────────────────────────────────────────
  const queueOfflineIdea = useCallback(async (content: string): Promise<string> => {
    const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const idea: OfflineIdea = { id, content, capturedAt: Date.now(), synced: false };
    await idbPut(STORE_IDEAS, idea);

    // Request background sync if supported
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register("sync-ideas");
      } catch {}
    }

    return id;
  }, []);

  const getOfflineQueue = useCallback(async (): Promise<OfflineIdea[]> => {
    return idbGetAll<OfflineIdea>(STORE_IDEAS);
  }, []);

  const removeFromOfflineQueue = useCallback(async (id: string) => {
    await idbDelete(STORE_IDEAS, id);
  }, []);

  // Listen for sync messages from SW
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_OFFLINE_IDEAS") {
        // Trigger sync — handled by the component that uses this hook
        window.dispatchEvent(new CustomEvent("continuity:sync-ideas"));
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return {
    isSupported,
    permission: isSupported ? Notification.permission : ("denied" as NotificationPermission),
    requestPermission,
    registerSW,
    scheduleCheckInNotifications,
    clearAllNotifications,
    queueOfflineIdea,
    getOfflineQueue,
    removeFromOfflineQueue,
  };
}
