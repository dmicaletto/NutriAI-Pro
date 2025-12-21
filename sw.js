// Questo file permette all'app di essere installata e funzionare offline
const CACHE_NAME = 'nutriai-v1';

// IMPORTANTE: Aggiungiamo le icone alla cache. 
// Se il browser non trova le icone offline, l'installazione fallisce.
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aperta: caching file fondamentali');
        return cache.addAll(urlsToCache);
      })
  );
  // Forza l'attivazione immediata
  self.skipWaiting();
});

// Intercettazione richieste (necessario per PWA)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 1. Se è in cache, restituiscilo
      if (response) {
        return response;
      }

      // 2. Altrimenti prova a scaricarlo dalla rete
      return fetch(event.request).catch(() => {
        // 3. FALLBACK OFFLINE PER SPA (Single Page Application)
        // Se la rete fallisce e la richiesta è per una pagina web (mode: navigate),
        // restituisci sempre index.html. Questo è CRUCIALE per l'installazione su Android.
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Aggiornamento cache e presa di controllo immediata
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Prende il controllo della pagina immediatamente senza ricaricare
      self.clients.claim() 
    ])
  );
});
