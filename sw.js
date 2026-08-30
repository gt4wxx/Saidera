const CACHE = "saidera-pwa-v9";
const PRECACHE = [
  "./index.php",
  "./entrar.php",
  "./manifest.webmanifest",
  "./assets/css/app.css",
  "./assets/css/client.css",
  "./assets/brand/icon-192.png",
  "./assets/brand/icon-512.png",
  "./assets/brand/icon-maskable-512.png",
  "./assets/brand/apple-touch.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.all(PRECACHE.map((u) => cache.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.includes("/api.php") || url.pathname.includes("/api/")) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(event.request);
        if (hit) return hit;
        if (event.request.mode === "navigate") {
          return (
            (await caches.match("./index.php")) ||
            new Response(
              "<!DOCTYPE html><html lang='pt-BR'><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/><title>Saideira</title><body style='margin:0;min-height:100vh;display:grid;place-items:center;background:#0e0e0e;color:#f5f0e6;font-family:sans-serif;text-align:center;padding:24px'><div><p>Sem conexão. Abra de novo com internet.</p></div></body></html>",
              { headers: { "Content-Type": "text/html; charset=utf-8" } }
            )
          );
        }
        return new Response("", { status: 504, statusText: "offline" });
      })
  );
});
