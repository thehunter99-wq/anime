// Service Worker for MovAnime
// Provides offline support, caching, and performance optimization

const CACHE_NAME = 'movanime-v1';
const STATIC_CACHE = 'movanime-static-v1';
const DYNAMIC_CACHE = 'movanime-dynamic-v1';
const IMAGE_CACHE = 'movanime-images-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/?tab=anime',
  '/?tab=movies',
  '/?tab=tv',
  '/?tab=manga',
  '/manifest.json',
  '/robots.txt',
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Static assets - cache first
  static: 'cache-first',
  // HTML pages - network first with offline fallback
  html: 'network-first',
  // Images - cache first with network fallback
  images: 'cache-first',
  // API calls - network only (don't cache)
  api: 'network-only',
  // Fonts - cache first
  fonts: 'cache-first',
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== IMAGE_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except for allowed domains)
  if (url.origin !== location.origin) {
    // Allow caching for specific external domains
    const allowedOrigins = [
      'https://image.tmdb.org',
      'https://s4.anilist.co',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
    ];
    
    if (!allowedOrigins.some(origin => url.origin === origin)) {
      return;
    }
  }

  // Determine cache strategy based on request
  let strategy = CACHE_STRATEGIES.static;
  
  if (url.pathname.startsWith('/api/')) {
    strategy = CACHE_STRATEGIES.api;
  } else if (request.headers.get('accept')?.includes('text/html')) {
    strategy = CACHE_STRATEGIES.html;
  } else if (request.destination === 'image') {
    strategy = CACHE_STRATEGIES.images;
  } else if (request.destination === 'font') {
    strategy = CACHE_STRATEGIES.fonts;
  }

  // Apply strategy
  switch (strategy) {
    case 'cache-first':
      event.respondWith(cacheFirst(request));
      break;
    case 'network-first':
      event.respondWith(networkFirst(request));
      break;
    case 'network-only':
      event.respondWith(networkOnly(request));
      break;
    default:
      event.respondWith(networkFirst(request));
  }
});

// Cache-first strategy (for static assets, images, fonts)
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(
        request.destination === 'image' ? IMAGE_CACHE : STATIC_CACHE
      );
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return offline fallback for HTML
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/') || new Response('Offline', { status: 503 });
    }
    throw new Error('Network error');
  }
}

// Network-first strategy (for HTML pages)
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Offline fallback
    return caches.match('/') || new Response('Offline', { status: 503 });
  }
}

// Network-only strategy (for API calls)
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Background sync for IndexNow pings (when online)
self.addEventListener('sync', (event) => {
  if (event.tag === 'indexnow-sync') {
    event.waitUntil(syncIndexNowQueue());
  }
});

// Queue IndexNow pings for background sync
async function syncIndexNowQueue() {
  // Implementation would read from IndexedDB and send pings
  console.log('[SW] Syncing IndexNow queue');
}

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});