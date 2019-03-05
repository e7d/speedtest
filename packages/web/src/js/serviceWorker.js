var cacheName = "SpeedTestPWA-0.1.0";
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

self.addEventListener("install", event => {
  console.log("[Service Worker] Install");
  event.waitUntil(
    caches.open(cacheName).then(cache => {
      console.log("[Service Worker] Caching app shell");
      return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener("activate", event => {
  console.log("[Service Worker] Activate");
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== cacheName) {
            console.log("[Service Worker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  return self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (/\/(ip|ping|download|upload)/.test(event.request.url)) {
    console.log("[Service Worker] Do not cache online API", event.request.url);
    // event.respondWith(fetch(event.request));
    // event.respondWith();
    return;
  }

  console.log("[Service Worker] Fetch cache then network", event.request.url);
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
