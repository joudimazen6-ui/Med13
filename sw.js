/* ===== إعدادات (تأتي من config.js) ===== */
importScripts('config.js'); // يعرّف APP_VERSION و PDF_VERSION و SUBJECTS

const APP_CACHE = 'student-site-' + APP_VERSION;   // ملفات الموقع (يتجدد مع كل نسخة)
const PDF_CACHE = 'student-pdfs-' + PDF_VERSION;   // ملفات PDF (لا يُعاد تحميلها إلا عند رفع PDF_VERSION)

const CORE = [
  './',
  'index.html',
  'style.css',
  'config.js',
  'script.js',
  'gamification.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// خط Tajawal: نخزّن ملف التنسيق وملفات الخط التي بداخله ليعمل الخط أوفلاين
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap';

// pdfs/subject1/L01.pdf ... pdfs/subject7/LNN.pdf (الاسم يُبنى في config.js)
const PDFS = SUBJECTS.flatMap((s, i) => lectureNames(s).map(name => pdfPath(i + 1, name)));

// طلب يتجاوز كاش المتصفح ليجلب أحدث نسخة من الشبكة
const fresh = url => new Request(url, { cache: 'reload' });

async function precacheFonts(cache) {
  try {
    const res = await fetch(FONT_CSS);
    if (!res.ok) return;
    await cache.put(FONT_CSS, res.clone());
    const css = await res.text();
    const urls = [...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]);
    await Promise.all(urls.map(u => cache.add(fresh(u)).catch(() => {})));
  } catch (e) { /* لا إنترنت الآن: سيُخزَّن الخط عند أول فتح أونلاين */ }
}

/* ===== التثبيت: تخزين مسبق لكل شيء ===== */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const app = await caches.open(APP_CACHE);
    // كل ملف على حدة: غياب ملف لا يُفشل التثبيت كله
    await Promise.all(CORE.map(u => app.add(fresh(u)).catch(() => {})));
    await precacheFonts(app);

    // ملفات PDF: نتحقق من كل ملف مع السيرفر (no-cache)،
    // فلا يُنزَّل إلا الملف الجديد أو المعدَّل، وغير المتغير لا يُعاد تحميله
    const pdf = await caches.open(PDF_CACHE);
    await Promise.all(PDFS.map(async u => {
      try {
        const res = await fetch(u, { cache: 'no-cache' });
        if (res.ok) await pdf.put(u, res);
      } catch (e) { /* بدون إنترنت: نُبقي النسخة المحفوظة */ }
    }));

    await self.skipWaiting();
  })());
});

/* ===== التفعيل: حذف النسخ القديمة من الموقع ومن ملفات PDF ===== */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => (k.startsWith('student-site-') && k !== APP_CACHE) || (k.startsWith('student-pdfs') && k !== PDF_CACHE)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* ===== الجلب: من التخزين فوراً + تحديث في الخلفية عند وجود إنترنت ===== */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (!/^https?:$/.test(new URL(req.url).protocol)) return;

  // طلبات Range (يستخدمها عارض PDF): نخدمها من التخزين إن وُجد
  if (req.headers.has('range')) {
    event.respondWith(caches.match(req.url, { ignoreVary: true }).then(r => r || fetch(req)));
    return;
  }
  event.respondWith(staleWhileRevalidate(event));
});

async function staleWhileRevalidate(event) {
  const req = event.request;
  const url = new URL(req.url);
  const cache = await caches.open(url.pathname.includes('/pdfs/') ? PDF_CACHE : APP_CACHE);
  const cached = await cache.match(req, { ignoreSearch: true, ignoreVary: true });

  // ملفات الموقع نفسه: تجاوز كاش المتصفح لنحصل على أحدث نسخة
  const sameOrigin = url.origin === self.location.origin;
  const update = (sameOrigin ? fetch(url.href, { cache: 'no-cache' }) : fetch(req))
    .then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(update); // التحديث يكمل في الخلفية
    return cached;
  }
  const res = await update;
  if (res) return res;
  if (req.mode === 'navigate') {
    const fallback = await caches.match('index.html');
    if (fallback) return fallback;
  }
  return Response.error();
}
