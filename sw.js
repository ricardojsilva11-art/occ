// OCC Diário — funciona sem rede
const V = "occ-v26";
const SHELL = [
  "./", "index.html", "manifest.webmanifest",
  "icon-180.png", "icon-192.png", "icon-512.png",
  "vendor/xlsx.full.min.js", "vendor/pdf.min.js", "vendor/pdf.worker.min.js", "vendor/jspdf.umd.min.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("workers.dev")) return; // sincronização: sempre rede

  // Página: rede primeiro (para receber atualizações), cache se offline
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req, { cache: "no-store" })
        .then((r) => { const c = r.clone(); caches.open(V).then((x) => x.put("index.html", c)); return r; })
        .catch(() => caches.match("index.html"))
    );
    return;
  }

  // Resto (bibliotecas, ícones, tipos de letra): cache primeiro
  e.respondWith(
    caches.match(req).then((m) =>
      m || fetch(req).then((r) => {
        if (r.ok || r.type === "opaque") { const c = r.clone(); caches.open(V).then((x) => x.put(req, c)); }
        return r;
      })
    )
  );
});
