const CACHE_NAME = "radio-map-v3";

const CORE_ASSETS = [
  "/",
  "/sw.js",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/offline.html",
  "/Comments.html",
  "/sitemap.xml",
  "/heure-meteo.js",
  "/icons/default-cover-512.png",
  "/icons/wifi.png",
  "/icons/icon-256.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  if (
    url.hostname.includes("arcgisonline.com") ||
    url.hostname.includes("tile.openstreetmap") ||
    url.hostname.includes("flagcdn.com") ||
    url.hostname.includes("open-meteo.com") ||
    url.pathname.includes("/stream")
  ) {
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      return (
        cached ||
        fetch(req).catch(() => {
          if (req.mode === "navigate") {
            return caches.match("/offline.html");
          }
        })
      );
    })
  );
});

