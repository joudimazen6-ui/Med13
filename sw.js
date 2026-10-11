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

// pdfs/subject1/L01.pdf ... (الأسماء تُبنى في config.js)
const PDFS = SUBJECTS.flatMap((s, i) => lectureNames(s).map(name => pdfPath(i + 1, name)));

// طلب يتجاوز كاش المتصفح ليجلب أحدث نسخة من الشبكة
const fresh = url => new Request(url, { cache: 'reload' });
const wait = ms => new Promise(r => setTimeout(r, ms));

async function precacheFonts(cache) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000); // لا ننتظر خط جوجل أكثر من 8 ثوانٍ
    const res = await fetch(FONT_CSS, { signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return;
    await cache.put(FONT_CSS, res.clone());
    const css = await res.text();
    const urls = [...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]);
    await Promise.race([Promise.all(urls.map(u => cache.add(fresh(u)).catch(() => {}))), wait(10000)]);
  } catch (e) { /* لا إنترنت الآن: سيُخزَّن الخط عند أول فتح أونلاين */ }
}

/* ===== التثبيت: ملفات الموقع فقط (سريع). ملفات PDF تُحمَّل من الصفحة مع عرض التقدم ===== */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const app = await caches.open(APP_CACHE);
    await Promise.all(CORE.map(u => app.add(fresh(u)).catch(() => {})));
    await precacheFonts(app);
    await self.skipWaiting();
  })());
});

/* ===== التفعيل: حذف النسخ القديمة ===== */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => (k.startsWith('student-site-') && k !== APP_CACHE) || (k.startsWith('student-pdfs') && k !== PDF_CACHE)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* ===== الجلب ===== */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!/^https?:$/.test(url.protocol)) return;

  // طلبات Range (يستخدمها عارض PDF): من التخزين إن وُجد
  if (req.headers.has('range')) {
    event.respondWith(caches.match(req.url, { ignoreVary: true }).then(r => r || fetch(req)));
    return;
  }
  // ملفات PDF: من التخزين فوراً بدون إعادة تحميلها في الخلفية (تُحدَّث برفع PDF_VERSION)
  if (url.origin === self.location.origin && url.pathname.includes('/pdfs/')) {
    event.respondWith(pdfFetch(req));
    return;
  }
  event.respondWith(staleWhileRevalidate(event));
});

async function pdfFetch(req) {
  const cache = await caches.open(PDF_CACHE);
  const cached = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok && res.status === 200) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return Response.error();
  }
}

// ملفات الموقع: من التخزين فوراً + تحديث في الخلفية عند وجود إنترنت
async function staleWhileRevalidate(event) {
  const req = event.request;
  const url = new URL(req.url);
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(req, { ignoreSearch: true, ignoreVary: true });

  const sameOrigin = url.origin === self.location.origin;
  const update = (sameOrigin ? fetch(url.href, { cache: 'no-cache' }) : fetch(req))
    .then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(update);
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
