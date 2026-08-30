const CACHE = "saidera-pwa-v8";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => {
      if (event.request.mode === "navigate") {
        return new Response(
          "<!DOCTYPE html><html lang='pt-BR'><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/><title>Saideira</title><body style='margin:0;min-height:100vh;display:grid;place-items:center;background:#0e0e0e;color:#f5f0e6;font-family:sans-serif;text-align:center;padding:24px'><div><p>Sem conexão. Abra de novo com internet.</p></div></body></html>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
      return new Response("", { status: 504, statusText: "offline" });
    })
  );
});
