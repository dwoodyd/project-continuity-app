// Project Continuity — Service Worker
// Handles: push notifications, offline capture queuing, background sync

const CACHE_VERSION = "continuity-v1";
const OFFLINE_QUEUE_KEY = "offline-idea-queue";

// ─── Install & Activate ───────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "Project Continuity", body: "Your day is ready.", tag: "checkin" };
  try {
    if (event.data) data = event.data.json();
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag ?? "continuity",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      silent: false,
      requireInteraction: false,
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// ─── Background Sync — Offline Idea Queue ─────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-ideas") {
    event.waitUntil(syncOfflineIdeas());
  }
});

async function syncOfflineIdeas() {
  // Read queued ideas from the client via message channel
  // The actual IndexedDB read happens in the client; we just trigger it
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "SYNC_OFFLINE_IDEAS" });
  }
}

// ─── Message Handling ─────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "SCHEDULE_NOTIFICATIONS") {
    // Handled by the client — SW just receives push events
  }
});
