// network-first: always try fresh lessons, fall back to cache offline

const CACHE = "jc-v44";

self.addEventListener("install", e => self.skipWaiting());

self.addEventListener("activate", e =>
  e.waitUntil(self.clients.claim())
);

self.addEventListener("fetch", e => {

  if (
    e.request.method !== "GET" ||
    new URL(e.request.url).origin !== location.origin
  ) return;

  e.respondWith(
    fetch(e.request).then(r => {

      const copy = r.clone();

      caches
        .open(CACHE)
        .then(c => c.put(e.request, copy));

      return r;

    }).catch(() =>
      caches.match(e.request)
    )
  );

});