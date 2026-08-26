const CACHE_NAME = "timbertimer-v79";
const CACHE_PREFIX = "timbertimer-";
// Every entry must resolve: cache.addAll() rejects the whole install if any
// single request 404s, which would silently disable the worker.
const APP_ASSETS = [
  "./",
  "./index.html",
  "./404.html",
  "./manifest.webmanifest",
  "./src/styles.css",
  "./src/app.js",
  "./src/supabase-config.js",
  "./assets/canopy-logo.svg",
  "./assets/canopy-logo-192.png",
  "./assets/canopy-logo-512.png",
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

/**
 * Tapping the rest alarm.
 *
 * The notification is posted through this worker rather than by the page so it
 * survives the page being discarded — which is exactly the case it exists for.
 * That means the tap arrives here, and the app may not be running at all, so
 * this either focuses the tab that is already open or opens one.
 *
 * The notification is closed either way. It is the app's job to decide whether
 * the alarm is over, and the app is what the user is now looking at.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const scope = new URL(self.registration.scope);
        const existing = clients.find((client) => {
          return new URL(client.url).origin === scope.origin;
        });

        if (existing) {
          // Tell the page before focusing it, so the sheet is already up when
          // it comes forward rather than appearing a moment later.
          existing.postMessage({ type: "rest-alarm-click" });
          return existing.focus();
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(scope.href);
        }

        return undefined;
      })
      .catch(() => undefined)
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);

  // For our own HTML/CSS/JS, revalidate with the server so a deploy is picked
  // up immediately instead of being shadowed by a stale HTTP cache entry.
  const sameOrigin = requestUrl.origin === self.location.origin;
  const isCoreAsset =
    sameOrigin && /\.(html|css|js|webmanifest)$|\/$/.test(requestUrl.pathname);
  const fetchRequest = isCoreAsset
    ? new Request(event.request, { cache: "no-cache" })
    : event.request;

  event.respondWith(
    fetch(fetchRequest)
      .then((response) => {
        const copy = response.clone();
        if (requestUrl.origin === self.location.origin) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === "navigate") return caches.match("./index.html");
          return Response.error();
        });
      })
  );
});
