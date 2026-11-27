/**
 * Service Worker for BNS Mapper PWA (Round 1 Upgrade)
 * Caches static shell, styles, scripts, chapters index, and chapter datasets for offline study.
 */

const CACHE_NAME = 'bns-mapper-v9';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/favicon.svg',
  './css/main.css',
  './css/print.css',
  './js/app.js',
  './js/router.js',
  './js/search.js',
  './js/storage.js',
  './js/ui.js',
  './js/quiz.js',
  './data/chapters.json',
  './data/chapters/chI.json',
  './data/chapters/chII.json',
  './data/chapters/chIII.json',
  './data/chapters/chIV.json',
  './data/chapters/chV.json',
  './data/chapters/chVI.json',
  './data/chapters/chVII.json',
  './data/chapters/chVIII.json',
  './data/chapters/chIX.json',
  './data/chapters/chX.json',
  './data/chapters/chXI.json',
  './data/chapters/chXII.json',
  './data/chapters/chXIII.json',
  './data/chapters/chXIV.json',
  './data/chapters/chXV.json',
  './data/chapters/chXVI.json',
  './data/chapters/chXVII.json',
  './data/sections.json',
  './data/bnss_sections.json',
  './data/bsa_sections.json',
  './data/quiz_scenarios.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
