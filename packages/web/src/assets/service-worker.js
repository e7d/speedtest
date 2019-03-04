var cacheName = "SpeedTest";
var filesToCache = [
  "/",
  "/app.css",
  "/app.js",
  "/favicon.ico",
  "/icons.eot",
  "/icons.svg",
  "/icons.ttf",
  "/icons.woff",
  "/icons.woff2",
  "/index.html",
  "/worker.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== cacheName) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (
    ["/ip", "/ping", "/download", "/upload"].some(url => {
      if (e.request.url.indexOf(url) > -1) {
        e.respondWith(fetch(e.request));
        return true;
      }
    })
  ) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cacheResponse => {
      return cacheResponse || fetch(e.request);
    })
  );
});
