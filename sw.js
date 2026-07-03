/* Mi Día — service worker (PWA offline support, introduced with v48)
 *
 * Strategy: network-first with cache fallback.
 *   - Online: always fetch fresh (so a new deploy is picked up), and refresh the cache.
 *   - Offline: serve the last cached response; for navigations, fall back to the app shell ("/").
 *
 * Bump CACHE on each new build so old caches are cleared on activate.
 */
const CACHE = "mi-dia-v168";
const APP_SHELL = "/";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([APP_SHELL]))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Refresh the cache with a clone of the fresh response (only for OK same-origin GETs).
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          // For navigations with no cached match, fall back to the app shell.
          if (req.mode === "navigate") return caches.match(APP_SHELL);
          return Response.error();
        })
      )
  );
});
