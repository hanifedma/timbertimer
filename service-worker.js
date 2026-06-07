const CACHE_NAME = "canopy-focus-v14";
const CACHE_PREFIX = "canopy-focus-";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./src/styles.css",
  "./src/app.js",
  "./src/supabase-config.js",
  "./assets/canopy-logo.svg",
  "./assets/canopy-logo-192.png",
  "./assets/canopy-logo-512.png",
  "./assets/jungle-focus-bg.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      const hadPreviousCache = keys.some((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME);
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();

      if (!hadPreviousCache) return;

      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });

      await Promise.all(
        clients.map((client) => {
          const url = new URL(client.url);
          if (url.origin !== self.location.origin) return Promise.resolve();
          return client.navigate(client.url).catch(() => undefined);
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          const copy = response.clone();
          if (new URL(event.request.url).origin === self.location.origin) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
      );
    })
  );
});
