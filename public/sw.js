const CACHE = "better-together-v3";
const APP_SHELL = ["/", "/manifest.webmanifest", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("better-together-") && key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Leave live APIs and external services to their own network/error handling.
  if (url.origin !== self.location.origin || url.pathname === "/api" || url.pathname.startsWith("/api/")) return;
  // Private pages and auth flows must never be saved as the public app shell.
  if (url.pathname === "/moderation" || url.pathname.startsWith("/moderation/")
    || ["/signin-with-chatgpt", "/signout-with-chatgpt", "/callback"].includes(url.pathname)) return;
  const navigation = event.request.mode === "navigate";
  const asset = APP_SHELL.includes(url.pathname) || url.pathname.startsWith("/assets/") || url.pathname.startsWith("/_next/static/");
  if (!navigation && !asset) return;
  const cacheKey = navigation ? "/" : event.request;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && !response.redirected && !/no-store|private/i.test(response.headers.get("Cache-Control") || "")) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(cacheKey, copy)).catch(() => undefined));
        }
        return response;
      })
      .catch(async () => (await caches.match(cacheKey)) || Response.error())
  );
});
