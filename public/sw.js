// Wakey Wakey - Production Service Worker for PWABuilder & Offline PWA support
const CACHE_NAME = 'wakey-wakey-cache-v1';

// Essential assets to cache on install for immediate offline shell availability
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-192x192-maskable.png',
  '/icon-512x512-maskable.png',
  '/screenshot-mobile.png',
  '/screenshot-wide.png',
  '/icon.svg'
];

// Install Event - Pre-caches critical app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      // Force the waiting service worker to become the active service worker
      return self.skipWaiting();
    })
  );
});

// Activate Event - Clean up previous cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Take control of all pages under this service worker's scope immediately
      return self.clients.claim();
    })
  );
});

// Fetch Event - Stale-while-revalidate for assets, Network-first for navigation & Firestore APIs
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignore non-GET requests (e.g., POST/PUT or Firebase sync)
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Exclude Firebase, Google Maps/OpenStreetMap tiles, and browser extensions from aggressive caching
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.protocol.startsWith('chrome-extension')
  ) {
    return;
  }

  // Network-First with Cache Fallback for navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match(request);
        })
    );
    return;
  }

  // Stale-While-Revalidate Strategy for all other static assets (JS, CSS, SVGs, Fonts)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and not in cache, fallback gracefully
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
