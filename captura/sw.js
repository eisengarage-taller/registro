/* EG Captura (1.12) — service worker: pantalla sin señal y "Compartir" desde otras apps. */
'use strict';
var CACHE = 'eg-captura-1.12';
var BASE = ['./', 'index.html', 'manifest.webmanifest', 'icono-192.png', 'icono-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(BASE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});

function db() {
  return new Promise(function (ok, mal) {
    var r = indexedDB.open('eg-captura', 1);
    r.onupgradeneeded = function () { var d = r.result; d.createObjectStore('cola', { keyPath: 'id' }); d.createObjectStore('hechas', { keyPath: 'id' }); d.createObjectStore('compartido', { keyPath: 'id' }); };
    r.onsuccess = function () { ok(r.result); }; r.onerror = function () { mal(r.error); };
  });
}

/** Compartir (POST multipart): se guarda en el celular y se abre la pantalla para revisar y guardar. */
function compartir(req) {
  return req.formData().then(function (fd) {
    var archivos = fd.getAll('archivos').filter(function (f) { return f && f.size; }).map(function (f) { return { nombre: f.name || 'archivo', mime: f.type || 'application/octet-stream', blob: f }; });
    var x = { id: String(Date.now()) + Math.random().toString(16).slice(2), titulo: fd.get('title') || '', texto: fd.get('text') || '', url: fd.get('url') || '', archivos: archivos };
    return db().then(function (d) { return new Promise(function (ok, mal) { var t = d.transaction('compartido', 'readwrite'); t.objectStore('compartido').put(x); t.oncomplete = ok; t.onerror = function () { mal(t.error); }; }); });
  }).then(function () { return Response.redirect('./?compartido=1', 303); })
    .catch(function () { return Response.redirect('./?compartido=0', 303); });
}

self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (u.origin !== location.origin) return; // API y Drive: siempre por la red
  if (e.request.method === 'POST' && /\/compartir$/.test(u.pathname)) { e.respondWith(compartir(e.request)); return; }
  if (e.request.method !== 'GET') return;
  // Red primero (para tomar versiones nuevas); sin señal, lo guardado.
  e.respondWith(fetch(e.request).then(function (r) {
    if (r.ok) { var c = r.clone(); caches.open(CACHE).then(function (k) { k.put(e.request, c); }); }
    return r;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || caches.match('./'); }); }));
});
