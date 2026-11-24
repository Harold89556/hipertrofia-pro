/* Hipertrofia Pro service worker: offline shell, network-first with a time limit so a bad connection never leaves the app stuck on the splash screen. */
const CACHE = 'hp-shell-v61';
const VCACHE = 'hp-voice-v1';
const SHELL = ['./', './index.html', './manifest.json', './vendor/supabase-2.119.2.js', './pro.js', './data/prices.json', './pro2.js', './cues.js', './superset.js', './features.js', './anim.js', './guide.js', './ux.js', './img/guide/arnold.webp', './img/guide/anatomy.webp', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  ...['open','classic','mens_physique','ganar_masa','wellness','bikini','mujer_gluteos','mujer_tonificar','figure','womens_physique'].map((k) => './img/cat/' + k + '.webp')];

self.addEventListener('install', (e) => {
  // Cada archivo por separado: si uno falla, el resto se guarda igual y la instalación no se traba.
  // Los clips de voz NO van acá: se guardan solos (hp-voice) cuando suenan.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((u) => fetch(new Request(u, { cache: 'reload' })).then((r) => (r && r.ok ? c.put(u, r) : null)).catch(() => null))))
      .catch(() => null)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && !k.startsWith('hp-voice')).map((k) => caches.delete(k))))
      .catch(() => null)
      .then(() => self.clients.claim())
  );
});

// Red con límite de tiempo: si no responde a tiempo se usa lo guardado (y la respuesta de red, si llega, actualiza la caché)
function fromCache(req) {
  return caches.match(req).then((h) => h || caches.match(req, { ignoreSearch: true }))
    .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html').then((h) => h || caches.match('./')) : undefined))
    .catch(() => undefined);
}
function netFirst(req, ms) {
  const net = (req.mode === 'navigate' ? fetch(req, { cache: 'no-cache' }) : fetch(req)).then((res) => {
    if (res && res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
    }
    return res;
  });
  return new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done && r) { done = true; resolve(r); } };
    const timer = setTimeout(() => { fromCache(req).then((hit) => finish(hit)); }, ms);
    net.then((res) => { clearTimeout(timer); finish(res); })
      .catch(() => { clearTimeout(timer); fromCache(req).then((hit) => finish(hit || new Response('', { status: 504, statusText: 'Offline' }))); });
    // sin caché y sin red a tiempo: se espera a la red (no hay otra opción)
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle our own files; Supabase, Gemini, fonts and CDNs go straight to the network.
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/hipertrofia-pro/')) return;
  // Clips de voz: nombre = hash del texto, así que cache-first en una caché propia que sobrevive a cada versión.
  if (/\/voice\/(es|en|pt)\/[0-9a-f]{8}\.mp3$/.test(url.pathname)) {
    e.respondWith(caches.open(VCACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res && res.ok) c.put(req, res.clone()).catch(() => {}); return res; }))).catch(() => fetch(req)));
    return;
  }
  // Precios de los súper: red primero con límite corto; si no llega, lo guardado (la app tiene una tabla de respaldo igual)
  if (url.pathname.endsWith('/data/prices.json')) { e.respondWith(netFirst(req, 2500)); return; }
  // Páginas: revalidar con el servidor (ignora la caché HTTP de 10 min de GitHub Pages), pero sin esperar más de 3 s
  if (req.mode === 'navigate') { e.respondWith(netFirst(req, 3000)); return; }
  // Scripts e imágenes: lo guardado al instante (los scripts llevan ?v= en la URL, así que una versión nueva es otra URL)
  // y se actualiza en segundo plano; si no está guardado, red con límite de tiempo.
  e.respondWith(caches.match(req).then((hit) => {
    if (hit) {
      e.waitUntil(fetch(req).then((res) => { if (res && res.ok && res.type === 'basic') return caches.open(CACHE).then((c) => c.put(req, res)); }).catch(() => {}));
      return hit;
    }
    return netFirst(req, 4000);
  }).catch(() => netFirst(req, 4000)));
});

// Cola de tomas de agua marcadas desde la notificación (la app la aplica al abrirse)
function idb() {
  return new Promise((ok, ko) => {
    const r = indexedDB.open('hp-sw', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('water', { keyPath: 'id' }); };
    r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
  });
}
async function queueWater(w) {
  const db = await idb();
  await new Promise((ok, ko) => { const tx = db.transaction('water', 'readwrite'); tx.objectStore('water').put(w); tx.oncomplete = ok; tx.onerror = () => ko(tx.error); });
  db.close();
}
const W_OK = { es: (ml) => `💧 Registrado: ${ml} ml`, en: (ml) => `💧 Logged: ${ml} ml`, pt: (ml) => `💧 Registrado: ${ml} ml` };

self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) {}
  const title = data.title || 'Hipertrofia Pro';
  const body = data.body || '';
  const url = data.url || './?go=coachh';
  const extra = data.data && typeof data.data === 'object' ? data.data : {};
  e.waitUntil(self.registration.showNotification(title, {
    body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    lang: data.lang || 'es',
    tag: data.tag || 'coach-msg',
    renotify: true,
    vibrate: data.alarm ? [400, 200, 400, 200, 600] : undefined,
    requireInteraction: !!data.alarm,
    actions: Array.isArray(data.actions) ? data.actions.slice(0, 2) : undefined,
    data: Object.assign({}, extra, { url, go: data.go || 'coachh', lang: data.lang || 'es' })
  }));
});

async function openApp(url, go) {
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of all) {
    if (c.url.includes('/hipertrofia-pro') && 'focus' in c) {
      c.postMessage({ type: 'hp-notif-click', go, url });
      return c.focus();
    }
  }
  return self.clients.openWindow(url);
}

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const d = e.notification.data || {};
  const url = d.url || './';
  const go = d.go;
  if (e.action === 'drank' && d.kind === 'water') {
    // "Ya tomé": se registra sin abrir la app
    e.waitUntil((async () => {
      const ml = Math.max(0, Math.round(Number(d.ml) || 0));
      const w = { id: (d.date || '') + '|' + (d.slot || ('x' + Date.now())), date: d.date || '', slot: d.slot || '', ml, uid: d.uid || '', at: Date.now() };
      try { await queueWater(w); } catch (err) {}
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      all.forEach((c) => { try { c.postMessage({ type: 'hp-water', w }); } catch (err) {} });
      const L = W_OK[d.lang] ? d.lang : 'es';
      await self.registration.showNotification(W_OK[L](ml), { tag: 'water', icon: './icons/icon-192.png', badge: './icons/icon-192.png', silent: true, renotify: false, data: { url, go: 'diet' } });
      await new Promise((r) => setTimeout(r, 4000));
      const ns = await self.registration.getNotifications({ tag: 'water' });
      ns.forEach((n) => { if (n.title === W_OK[L](ml)) n.close(); });
    })());
    return;
  }
  e.waitUntil(openApp(url, go));
});
