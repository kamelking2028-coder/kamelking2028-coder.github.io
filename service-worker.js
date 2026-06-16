const CACHE_NAME = "radio-map-v3";

// Fichiers essentiels à mettre en cache
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/offline.html",
  "/Comments.html",
  "/sitemap.xml",
  "/heure-meteo.js",

  // ✅ Ajout des icônes nécessaires hors‑ligne
  "/icons/default-cover-512.png",
  "/icons/wifi.png",
  "/icons/icon-256.png"
];

// Installation
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activation
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Stratégie intelligente
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Ne JAMAIS bloquer les tuiles Leaflet ou les API
  if (
    url.hostname.includes("arcgisonline.com") ||
    url.hostname.includes("tile.openstreetmap") ||
    url.hostname.includes("flagcdn.com") ||
    url.hostname.includes("open-meteo.com") ||
    url.pathname.includes("/stream")
  ) {
    return;
  }

  // 2. Pour les fichiers locaux → cache‑first
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
