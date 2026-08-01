const cacheName = 'malaeb-net-v24-local-libraries-root';
const assets = [
  './',
  './index.html',
  './register.html',
  './booking.html',
  './style.css',
  './script.js',
  './logo_no_background.png'
];

const ASSETS = assets.map(path => new URL(path, self.registration.scope).href);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== cacheName).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // لا نعالج POST أو أي طلب يغير البيانات داخل Service Worker.
  if (e.request.method !== 'GET') return;

  // 1. استثناء بيانات جوجل والروابط الخارجية (دائماً من الشبكة)
  if (url.origin !== location.origin || url.href.includes('script.google.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // 2. معالجة طلبات التنقل (Navigate) - أهم جزء لحل مشكلتك
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => {
        // إذا انقطع الاتصال، نختار الصفحة المناسبة بناءً على الرابط
        if (url.searchParams.has('id')) {
          return caches.match('./booking.html');
        } else if (url.pathname.includes('register.html')) {
          return caches.match('./register.html');
        }
        return caches.match('./index.html');
      })
    );
    return;
  }

  // 3. استراتيجية الملفات الثابتة (Cache First, then Network)
  e.respondWith(
    caches.match(e.request).then(async response => {
      if (response) return response;
      const networkResponse = await fetch(e.request);
      if (networkResponse.ok && e.request.url.startsWith(location.origin)) {
        const cache = await caches.open(cacheName);
        await cache.put(e.request, networkResponse.clone());
      }
      return networkResponse;
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('./');
    })
  );
});
