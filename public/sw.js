// Break Hub Arcade Offline Service Worker
const CACHE_NAME = 'breakhub-offline-v1';
const OFFLINE_FALLBACK = '/offline';

const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.webmanifest',
  '/neo-icon.svg?v=5',
  '/neo-icon.png?v=5',
  '/neo-favicon.ico?v=5',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for navigation and static assets
  if (event.request.method !== 'GET') return;

  // Handle page navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedOffline = await cache.match(OFFLINE_FALLBACK);
        return cachedOffline || cache.match('/') || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // Network-first with cache fallback for static assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Optionally cache successful asset responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        return cached || new Response('', { status: 408 });
      })
  );
});
