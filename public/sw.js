const CACHE_NAME = "vibequest-pwa-v1";
const CORE_ASSETS = [
  "/manifest.webmanifest",
  "/icons/vibequest-icon-192.png",
  "/icons/vibequest-icon-512.png",
  "/icons/vibequest-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/images/vibequest/protocol-network.png",
  "/images/vibequest/workbench-lab.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            `<!doctype html>
<title>VibeQuest offline</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<body style="margin:0;background:#030d0b;color:#fff;font-family:system-ui,sans-serif;display:grid;min-height:100vh;place-items:center;text-align:center;padding:24px">
  <main>
    <h1>VibeQuest is offline</h1>
    <p style="color:rgba(255,255,255,.68)">Reconnect to continue generated lessons, tutor sessions, and workbench quests.</p>
  </main>
</body>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          )
      )
    );
    return;
  }


  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/images/vibequest/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
  }
});
