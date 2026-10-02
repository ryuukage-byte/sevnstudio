// Minimal service worker: keeps the app shell and visited pages available offline.
// Data writes are NOT handled here; checklist changes queue in the page (see lib/sync) and sync when online.
const STATIC = "sevn-static-v1";
const PAGES = "sevn-pages-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Offline</title><body style='font-family:sans-serif;padding:2rem'><h1>Offline</h1><p>Halaman ini belum pernah dibuka saat online. Sambungkan internet lalu muat ulang.</p>", {
      status: 503,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch Supabase or other origins
  if (url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate" || url.searchParams.has("_rsc")) {
    event.respondWith(networkFirst(request));
  }
});
