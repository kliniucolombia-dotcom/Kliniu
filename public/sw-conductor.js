// Service worker de la página del conductor: permite reabrirla sin señal. Alcance: /conductor/.
// Nunca cachea POST ni /posicion ni /entrega: eso lo maneja la cola local de la página.
const VERSION = "v1";
const STATIC = `conductor-static-${VERSION}`;
const PAGES = `conductor-pages-${VERSION}`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("conductor-") && k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Red primero con tope de espera; si falla, lo último guardado.
function networkFirst(request, cacheName, timeoutMs) {
  return caches.open(cacheName).then((cache) => {
    const network = fetch(request).then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    });
    network.catch(() => {}); // si ya respondió el caché, el fallo posterior de la red no importa
    const timed = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs));
    return Promise.race([network, timed]).catch(() => cache.match(request).then((hit) => hit || network));
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Código de la app: archivos con hash, inmutables.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC).then((cache) =>
        cache.match(request).then((hit) => hit || fetch(request).then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })),
      ),
    );
    return;
  }

  // La página y los datos de la ruta (solo lectura).
  const isPage = request.mode === "navigate" && url.pathname.startsWith("/conductor/");
  const isInfo = /^\/api\/conductor\/[^/]+$/.test(url.pathname);
  if (isPage || isInfo) event.respondWith(networkFirst(request, PAGES, isPage ? 3000 : 4000));
});
