// Cache versioning - use build timestamp or version number
// In production, this should be replaced with actual build version
const CACHE_VERSION = 'pwd-guru-v2.0';
const STATIC_CACHE = CACHE_VERSION + '-static';
const DYNAMIC_CACHE = CACHE_VERSION + '-dynamic';

// Static assets that can be cached long-term
const staticAssets = [
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
  '/manifest.json'
];

// Dynamic assets that need frequent updates
const dynamicAssets = [
  '/',
  '/index.html'
];

// Install event - cache static resources
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(staticAssets);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle requests from the same origin
  if (url.origin !== location.origin) {
    return;
  }
  
  // Check if this is an HTML request (dynamic content)
  if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
    // Network-first strategy for HTML
    event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
  } else {
    // Cache-first strategy for static assets
    event.respondWith(cacheFirstWithNetworkFallback(request, STATIC_CACHE));
  }
});

// Network-first strategy: Try network first, fallback to cache
async function networkFirstWithCache(request, cacheName) {
  try {
    // Try to fetch from network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // If successful, update cache and return response
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    // Network failed, try cache
    console.log('Network fetch failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cache and network failed, return a basic offline page
    if (request.url.includes('.html') || request.headers.get('accept')?.includes('text/html')) {
      return new Response(
        '<html><body><h1>Offline</h1><p>You are offline and this page is not cached.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
    throw error;
  }
}

// Cache-first strategy: Try cache first, fallback to network
async function cacheFirstWithNetworkFallback(request, cacheName) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Background update: fetch from network to update cache
    fetch(request).then(networkResponse => {
      if (networkResponse.ok) {
        caches.open(cacheName).then(cache => {
          cache.put(request, networkResponse);
        });
      }
    }).catch(() => {
      // Ignore background update errors
    });
    
    return cachedResponse;
  }
  
  // No cache hit, try network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response for future use
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network and cache miss for:', request.url);
    throw error;
  }
}

// Activate event - clean up old caches and take control
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete any cache that doesn't match our current cache names
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName.startsWith('pwd-guru-v')) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients that a new service worker has taken control
      return self.clients.matchAll();
    }).then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_UPDATED',
          message: 'Service Worker updated and active'
        });
      });
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});