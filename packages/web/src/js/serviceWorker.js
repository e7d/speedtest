var cacheName = `SpeedTest-${VERSION}`;
var filesToCache = [
  "/app.css",
  "/app.js",
  "/favicon.ico",
  "/icons.eot",
  "/icons.svg",
  "/icons.ttf",
  "/icons.woff",
  "/icons.woff2",
  "/worker.js"
];

self.addEventListener("install", event =>
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(filesToCache)))
);

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keyList => Promise.all(keyList.map(key => key !== cacheName && caches.delete(key))))
  );
  return self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (filesToCache.some(file => event.request.url.includes(file))) {
    event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
  }
});
