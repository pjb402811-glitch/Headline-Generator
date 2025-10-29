const CACHE_NAME = 'gyeongpyeong-performance-report-headline-generator-v7';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/apple-touch-icon.svg',
  '/icon-192x192.svg',
  '/icon-512x512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(error => {
        console.error('Failed to cache app shell.', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // For navigation requests (e.g., loading the page), use a network-first strategy.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If the network fails, serve the cached index.html as a fallback.
          return caches.match('/');
        })
    );
    return;
  }

  // For other requests (assets like scripts, styles), use a cache-first strategy.
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // If the request is in the cache, return it.
        // Otherwise, fetch from the network.
        return response || fetch(event.request);
      })
  );
});