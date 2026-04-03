// Continuary — Service Worker
// Handles: push notifications, offline capture queuing, background sync, app-shell caching

const CACHE_VERSION = "continuity-v3";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const OFFLINE_QUEUE_KEY = "offline-idea-queue";

// App-shell assets to pre-cache on install
// (Vite hashes JS/CSS filenames, so we cache the root HTML and let the browser
//  handle versioned assets via normal HTTP cache. This gives offline launch.)
const SHELL_URLS = [
  "/",
  "/manifest.json",
];

// ─── Install — pre-cache app shell ───────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

// ─── Activate — clean up old caches ──────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("continuity-") && k !== SHELL_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch — network-first with shell fallback ────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept same-origin GET requests; skip API/tRPC calls
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/__manus__/")
  ) {
    return;
  }

  // For navigation requests (HTML pages): network-first, fall back to cached "/"
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Update the shell cache with the fresh response
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put("/", clone));
          return response;
        })
        .catch(() =>
          caches.match("/").then((cached) => cached || new Response("Offline", { status: 503 }))
        )
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts): cache-first
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|png|jpg|jpeg|svg|ico|webp)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
});

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "Continuary", body: "Your day is ready.", tag: "checkin" };
  try {
    if (event.data) data = event.data.json();
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag ?? "continuity",
      icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663270045694/VnvNaoJZPVnHWmB8F3cwwo/icon-192_8a0141d4.png",
      badge: "https://d2xsxph8kpxj0f.cloudfront.net/310519663270045694/VnvNaoJZPVnHWmB8F3cwwo/icon-96_e5c53296.png",
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
});
