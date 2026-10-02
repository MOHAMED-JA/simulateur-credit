/* Service worker du simulateur de crédit : application installable et
   utilisable hors connexion. Changer VERSION à chaque mise en ligne pour
   que les utilisateurs reçoivent la nouvelle version. */
var VERSION = '2026-10-02-3';
var CACHE_APP = 'simulateur-app-' + VERSION;
var CACHE_EXT = 'simulateur-externe-v1';

var FICHIERS_APP = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];
/* Bibliothèques chargées depuis les CDN (exports, graphique, QR code) */
var BIBLIOTHEQUES = [
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(CACHE_APP).then(function (c) { return c.addAll(FICHIERS_APP); }).then(function () {
      return caches.open(CACHE_EXT).then(function (c) {
        return Promise.all(BIBLIOTHEQUES.map(function (url) {
          return fetch(url, { mode: 'cors' }).then(function (r) { if (r.ok) return c.put(url, r); }).catch(function () {});
        }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (cles) {
      return Promise.all(cles.filter(function (k) { return k.indexOf('simulateur-app-') === 0 && k !== CACHE_APP; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (ev) {
  var req = ev.request;
  var url0 = new URL(req.url);

  /* Fichier partagé vers l'application (menu Partager du téléphone) :
     mis de côté puis ouvert dans l'audit du tableau d'amortissement */
  if (req.method === 'POST' && url0.origin === self.location.origin && /\/partage-cible$/.test(url0.pathname)) {
    ev.respondWith(req.formData().then(function (fd) {
      var fichiers = fd.getAll('fichiers').filter(function (f) { return f && f.size; });
      return caches.open('simulateur-partage').then(function (c) {
        return Promise.all(fichiers.map(function (f, i) {
          return c.put('./partage/' + i + '-' + encodeURIComponent(f.name || 'tableau.pdf'), new Response(f, { headers: { 'Content-Type': f.type || 'application/octet-stream' } }));
        }));
      });
    }).then(function () { return Response.redirect('./?partage=1', 303); }, function () { return Response.redirect('./', 303); }));
    return;
  }
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  /* Page : réseau d'abord (dernière version), cache si hors connexion */
  if (req.mode === 'navigate') {
    ev.respondWith(
      fetch(req).then(function (r) {
        var copie = r.clone();
        if (r.ok) caches.open(CACHE_APP).then(function (c) { c.put('./index.html', copie); });
        return r;
      }).catch(function () {
        return caches.match('./index.html', { ignoreSearch: true }).then(function (r) { return r || caches.match('./'); });
      })
    );
    return;
  }

  /* Fichiers de l'application : cache d'abord */
  if (url.origin === self.location.origin) {
    ev.respondWith(caches.match(req, { ignoreSearch: true }).then(function (r) { return r || fetch(req); }));
    return;
  }

  /* Bibliothèques et polices : cache immédiat, mise à jour en arrière-plan */
  if (/^(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname)) {
    ev.respondWith(caches.open(CACHE_EXT).then(function (c) {
      return c.match(req).then(function (enCache) {
        var reseau = fetch(req).then(function (r) { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; });
        if (enCache) { reseau.catch(function () {}); return enCache; }
        return reseau;
      });
    }));
  }
});
