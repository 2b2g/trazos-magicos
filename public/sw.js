/* Garabati — service worker (app shell, cache-first).
   La tipografía entra en el precache: el juego se ve igual sin red.
   Los audios de la voz se guardan al usarlos (no se precargan 3 MB).

   v4: los MP3 se regeneraron con otra voz (Paulina) conservando los
   nombres, así que la caché v3 guardaba audio viejo con 200 OK. Subir
   la versión purga las cachés anteriores en `activate`. */
var CACHE = "garabati-v4";
var CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./fonts/fredoka-one-latin-400.woff2",
  "./fonts/fredoka-one-latin-400.woff"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(CORE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) {
            return k !== CACHE;
          })
          .map(function (k) {
            return caches.delete(k);
          })
      );
    })
  );
  self.clientsClaim();
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Voice clips and fonts: cache-first, they never change once generated.
  if (url.pathname.indexOf("/voice/") === 0 || url.pathname.indexOf("/fonts/") === 0) {
    event.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          if (res && res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) {
              c.put(req, copy);
            });
          }
          return res;
        });
      })
    );
    return;
  }

  // Hashed build assets: cache-first, they are immutable.
  if (url.pathname.indexOf("/assets/") === 0) {
    event.respondWith(
      caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
          if (res && res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) {
              c.put(req, copy);
            });
          }
          return res;
        });
      })
    );
    return;
  }

  // Navigation: network-first with cache fallback (keeps updates flowing).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) {
            c.put("./index.html", copy);
          });
          return res;
        })
        .catch(function () {
          return caches.match("./index.html");
        })
    );
  }
});
