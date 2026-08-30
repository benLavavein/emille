const CACHE_NAME = "emille-v2";
const PRECACHE_URLS = ["/manifest.json", "/otter.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Authentication is determined by the server-rendered document and the
  // cookies. Never cache documents or API responses, otherwise an older
  // signed-out response can be shown when the user returns to the app.
  const cacheableDestinations = new Set([
    "font",
    "image",
    "manifest",
    "script",
    "style",
  ]);
  if (!cacheableDestinations.has(event.request.destination)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
