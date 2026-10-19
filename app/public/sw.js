/**
 * Service worker — Farmacias de guardia de Mairena del Alcor.
 *
 * Estrategia (§14 del SDD):
 *  - Cache first para recursos estáticos versionados por Next.js
 *    (_next/static, iconos).
 *  - Network first con conservación de la última respuesta válida para la
 *    interfaz (navegación) y para los datos públicos (/api/v1/*), de forma
 *    que, sin conexión, se muestre la última versión conocida.
 *  - Nunca se cachean rutas /admin ni /api/admin (datos administrativos y
 *    tokens de sesión).
 *
 * CACHE_VERSION debe incrementarse en cada despliegue que cambie los
 * recursos precargados, para invalidar cachés antiguas de los clientes.
 */

const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `farmacias-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `farmacias-runtime-${CACHE_VERSION}`;
const DATA_CACHE = `farmacias-data-${CACHE_VERSION}`;

const APP_SHELL_URLS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const ADMIN_PATH_PREFIXES = ["/admin", "/api/admin"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                ![APP_SHELL_CACHE, RUNTIME_CACHE, DATA_CACHE].includes(key)
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isAdminPath(url) {
  return ADMIN_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

async function networkFirst(request, cacheName, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw new Error("network-first: sin red y sin caché disponible");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isAdminPath(url)) return; // nunca cachear administración
  if (url.pathname === "/widget") return; // incrustado en OpenCms: siempre en vivo

  // Navegaciones (documentos HTML): network-first con último shell como
  // respaldo y offline.html como última red de seguridad.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, APP_SHELL_CACHE, "/offline.html"));
    return;
  }

  // Datos públicos versionados: network-first, conservando la última copia.
  if (url.pathname.startsWith("/api/v1/")) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // Recursos estáticos de Next.js e iconos: cache-first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/escudo-mairena.webp"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }
});
