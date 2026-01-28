
// Questo file permette all'app di essere installata e funzionare offline
const CACHE_NAME = 'nutriai-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aperta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercettazione richieste (necessario per PWA)
self.addEventListener('fetch', (event) => {
  // 1. Ignora le richieste che non sono GET (es. POST alla Gemini API)
  if (event.request.method !== 'GET') return;

  // 2. Ignora le richieste ad API esterne
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Restituisce la cache se c'è, altrimenti fa la richiesta di rete
        return response || fetch(event.request);
      })
  );
});

// Aggiornamento cache
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

