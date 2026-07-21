const cacheName = 'malaeb-net-v1.89'; // تحديث النسخة لضمان تنشيط التعديلات
const assets = [
  './',
  './index.html',
  './register.html',
  './booking.html',
  './style.css',
  './script.js',
  './logo_no_background.png'
];

// ... (أكواد install و activate تبقى كما هي) ...

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

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
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});
