const CACHE_NAME = 'gaga-chat-v2';
const OFFLINE_URL = '/offline.html';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.jpg',
  '/logo.png',
  '/favicon.ico',
  OFFLINE_URL,
];

// Install event - caching core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event - cleaning up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Stale-While-Revalidate strategy with offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' ||
      event.request.url.includes('supabase.co') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => null);

        if (cachedResponse) {
          return cachedResponse;
        }

        return fetchPromise.then((response) => {
          if (response) {
            return response;
          }
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return caches.match(OFFLINE_URL);
        });
      });
    })
  );
});
