var CACHE = 'aura-v5';
var PRECACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/privacy-policy/',
  '/img/icon.png',
  '/img/logo.jpeg',
  '/img/tiktok qr.jpeg',
  '/img/instgram qr.jpeg',
  '/src/firebase-compat.js',
  '/src/auth-compat.js',
  '/src/questions-compat.js',
  '/src/themes-compat.js',
  '/src/story-compat.js',
  '/src/ui-compat.js',
  '/src/security-compat.js',
  '/src/errors-compat.js',
  '/src/router-compat.js',
  '/src/app-compat.js'
];

var OFFLINE_FALLBACK = '/';

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  if (!(event.request.url.startsWith('http://') || event.request.url.startsWith('https://'))) return;

  var url = new URL(event.request.url);

  // Network-only for Firebase and Google APIs
  if (url.hostname.indexOf('firebaseio.com') !== -1 || url.hostname.indexOf('googleapis.com') !== -1) {
    event.respondWith(
      fetch(event.request).catch(function () {
        return new Response('', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  // Fonts: cache-first with long expiration
  if (url.hostname.indexOf('fonts.googleapis.com') !== -1 || url.hostname.indexOf('fonts.gstatic.com') !== -1) {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        return cached || fetch(event.request).then(function (response) {
          if (response && response.status === 200) {
            var copy = response.clone();
            caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
          }
          return response;
        });
      })
    );
    return;
  }

  // AdSense: network-only, don't cache
  if (url.hostname.indexOf('googlesyndication.com') !== -1 || url.hostname.indexOf('adsbygoogle') !== -1) {
    event.respondWith(fetch(event.request).catch(function () { return new Response(''); }));
    return;
  }

  // Everything else: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var fetched = fetch(event.request).then(function (response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      }).catch(function () {
        if (!cached) return caches.match(OFFLINE_FALLBACK);
        return cached;
      });
      return cached || fetched;
    })
  );
});
