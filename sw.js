/* EG Registro (1.17.2) — service worker solo para poder instalarla como app.
   No guarda nada: todo va siempre por la red, así cada versión nueva llega al tiro.
   La carpeta captura/ tiene su propio service worker y aquí no se toca. */
'use strict';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== 'GET' || e.request.mode !== 'navigate') return;
  if (u.pathname.indexOf('/captura/') >= 0) return;
  e.respondWith(fetch(e.request));
});
