/* Hipertrofia Pro service worker: offline shell, always network-first so updates show immediately. */
const CACHE = 'hp-shell-v38';
const SHELL = ['./', './index.html', './manifest.json', './pro.js', './pro2.js', './cues.js', './superset.js', './features.js', './anim.js', './guide.js', './img/guide/arnold.webp', './img/guide/anatomy.webp', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  ...['open','classic','mens_physique','ganar_masa','wellness','bikini','mujer_gluteos','mujer_tonificar','figure','womens_physique'].map((k) => './img/cat/' + k + '.webp')];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && !k.startsWith('hp-voice')).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only handle our own files; Supabase, Gemini, fonts and CDNs go straight to the network.
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/hipertrofia-pro/')) return;
  // Páginas: revalidar siempre con el servidor (ignora la caché HTTP de 10 min de GitHub Pages)
  const net = req.mode === 'navigate' ? fetch(req, { cache: 'no-cache' }) : fetch(req);
  e.respondWith(
    net
      .then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: req.mode === 'navigate' })
          .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
          .then((hit) => hit || new Response('', { status: 504, statusText: 'Offline' }))
      )
  );
});

self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) {}
  const title = data.title || 'Hipertrofia Pro';
  const body = data.body || '';
  const url = data.url || './?go=coachh';
  e.waitUntil(self.registration.showNotification(title, {
    body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    lang: data.lang || 'es',
    tag: data.tag || 'coach-msg',
    renotify: true,
    data: { url, go: data.go || 'coachh' }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  const go = e.notification.data && e.notification.data.go;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.includes('/hipertrofia-pro') && 'focus' in c) {
        c.postMessage({ type: 'hp-notif-click', go, url });
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
