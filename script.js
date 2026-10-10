/* المواد معرّفة في config.js */

/* ========= التخزين المحلي ========= */
const KEY = 'student-site-v1';
const DEFAULTS = { name: '', tasks: [], work: 25, rest: 5, sessions: {}, starsByDay: {}, lect: {}, subject: 0, section: 'home', pomo: null, a2hsAsked: false };
let S = load();
const MIN_WORK = 25; // الحد الأدنى لجلسة التركيز بالدقائق
if (S.work < MIN_WORK) { S.work = MIN_WORK; save(); }
function load() {
  try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY)) || {}); }
  catch (e) { return Object.assign({}, DEFAULTS); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
// تاريخ اليوم بالتوقيت المحلي (YYYY-MM-DD)
const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const pad = n => String(n).padStart(2, '0');

/* ========= التنقل ========= */
function go(id) {
  $$('.panel').forEach(p => p.classList.toggle('active', p.id === id));
  $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.go === id));
  window.scrollTo({ top: 0 });
  S.section = id; save();
}
$$('#nav button').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));

/* ========= الترحيب والاسم ========= */
function showWelcome(edit) {
  $('#welcomeTitle').textContent = edit ? 'تعديل الاسم' : 'أهلاً بك! ما اسمك؟';
  $('#nameCancel').hidden = !S.name;
  $('#nameInput').value = S.name;
  $('#welcome').hidden = false;
  setTimeout(() => $('#nameInput').focus(), 50);
}
$('#nameForm').addEventListener('submit', e => {
  e.preventDefault();
  const v = $('#nameInput').value.trim();
  if (!v) return;
  S.name = v; save(); $('#welcome').hidden = true; renderGreeting();
  setTimeout(maybeAskA2hs, 600);
});
$('#nameCancel').addEventListener('click', () => { $('#welcome').hidden = true; });
$('#editName').addEventListener('click', () => showWelcome(true));

function renderGreeting() {
  const h = new Date().getHours();
  $('#greetTime').textContent = h < 12 ? 'صباح الخير' : h < 18 ? 'مساء النور' : 'مساء الخير';
  $('#greetName').textContent = 'أهلاً ' + (S.name || '');
  $('#chipName').textContent = S.name || 'الاسم';
}

/* ========= الخطة الدراسية ========= */
function renderTasks() {
  const list = $('#taskList');
  list.innerHTML = '';
  if (!S.tasks.length) {
    const li = document.createElement('li');
    li.className = 'empty'; li.style.border = '0';
    li.textContent = 'لا توجد مهام بعد. أضف أول محاضرة تريد دراستها.';
    list.appendChild(li);
  }
  S.tasks.forEach(t => {
    const li = document.createElement('li');
    if (t.done) li.className = 'done';
    const txt = document.createElement('span'); txt.className = 't'; txt.textContent = t.text;
    const chip = document.createElement('button'); chip.className = 'chip';
    chip.textContent = t.done ? 'تمت' : 'قيد الدراسة';
    chip.title = 'تبديل الحالة';
    chip.onclick = () => { t.done = !t.done; save(); renderTasks(); };
    const del = document.createElement('button'); del.className = 'x'; del.textContent = '×'; del.title = 'حذف';
    del.setAttribute('aria-label', 'حذف المهمة');
    del.onclick = () => { S.tasks = S.tasks.filter(x => x.id !== t.id); save(); renderTasks(); };
    li.append(txt, chip, del);
    list.appendChild(li);
  });
  const done = S.tasks.filter(t => t.done).length, total = S.tasks.length;
  const pct = total ? Math.round(done / total * 100) : 0;
  $('#barFill').style.width = pct + '%';
  $('#pctText').textContent = `${pct}% (${done} من ${total})`;
  $('#stPct').textContent = pct + '%';
}
function addTask() {
  const v = $('#taskInput').value.trim();
  if (!v) return;
  S.tasks.push({ id: Date.now(), text: v, done: false });
  $('#taskInput').value = ''; save(); renderTasks();
}
$('#taskAdd').addEventListener('click', addTask);
$('#taskInput').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

/* ========= العد التنازلي لبداية الامتحانات (الصفحة الرئيسية فقط) ========= */
// لتغيير الموعد عدّل هذا السطر فقط (الصيغة: سنة-شهر-يوم)
const EXAM_START = new Date('2027-01-17T00:00:00');

const daysEl = document.getElementById('days');
const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');
const countdownStatus = document.getElementById('countdown-status');

const dateLabel = document.getElementById('exam-date-label');
if (dateLabel) dateLabel.textContent = EXAM_START.toLocaleDateString('ar-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });

function tickCountdown() {
  const diff = EXAM_START.getTime() - Date.now();

  if (diff <= 0) {
    daysEl.textContent = hoursEl.textContent = minutesEl.textContent = secondsEl.textContent = '0';
    countdownStatus.textContent = '🎉 بدأت الامتحانات، بالتوفيق!';
    return;
  }
  const days = Math.floor(diff / 86400000);
  daysEl.textContent = days;
  hoursEl.textContent = Math.floor(diff % 86400000 / 3600000);
  minutesEl.textContent = Math.floor(diff % 3600000 / 60000);
  secondsEl.textContent = Math.floor(diff % 60000 / 1000);
  countdownStatus.textContent = 'المتبقي على بداية الامتحانات';
}
tickCountdown();
setInterval(tickCountdown, 1000);

/* ========= بومودورو ========= */
const CIRC = 565.5;
let mode = 'work', total = S.work * 60, left = total, endAt = 0, timer = null;

$('#workMin').value = S.work;
$('#restMin').value = S.rest;
function clampMin(v, min, max) { v = parseInt(v, 10); return isNaN(v) ? min : Math.min(Math.max(v, min), max); }
$('#workMin').addEventListener('change', e => { S.work = clampMin(e.target.value, MIN_WORK, 180); e.target.value = S.work; save(); if (!timer && mode === 'work') resetPomo(); });
$('#restMin').addEventListener('change', e => { S.rest = clampMin(e.target.value, 1, 60); e.target.value = S.rest; save(); if (!timer && mode === 'rest') resetPomo(); });

function drawPomo() {
  $('#pomoTime').textContent = pad(Math.floor(left / 60)) + ':' + pad(left % 60);
  $('#pomoMode').textContent = mode === 'work' ? 'وقت العمل' : 'وقت الاستراحة';
  $('#ringFg').style.strokeDashoffset = CIRC * (1 - left / total);
  $('#pomo').classList.toggle('rest', mode === 'rest');
  document.title = timer ? `${$('#pomoTime').textContent} • med13` : 'med13';
}
function savePomo() { S.pomo = { mode, left, running: !!timer, endAt: timer ? endAt : 0 }; save(); }
// استرجاع المؤقت بعد إغلاق الموقع: يكمل إن كان شغالاً، أو يرجع متوقفاً مؤقتاً كما تركه
function restorePomo(p) {
  if (!p) return;
  mode = p.mode === 'rest' ? 'rest' : 'work';
  total = (mode === 'work' ? S.work : S.rest) * 60;
  left = total;
  if (p.running && p.endAt > Date.now()) {
    left = Math.min(total, Math.max(1, Math.round((p.endAt - Date.now()) / 1000)));
    startPause();
  } else if (!p.running && p.left > 0 && p.left < total) {
    left = p.left; $('#pomoStart').textContent = 'متابعة';
  }
  drawPomo(); savePomo();
}
function resetPomo() {
  clearInterval(timer); timer = null;
  total = (mode === 'work' ? S.work : S.rest) * 60; left = total;
  $('#pomoStart').textContent = 'ابدأ'; drawPomo(); savePomo();
}
function startPause() {
  if (timer) { clearInterval(timer); timer = null; $('#pomoStart').textContent = 'متابعة'; drawPomo(); savePomo(); return; }
  endAt = Date.now() + left * 1000;
  $('#pomoStart').textContent = 'إيقاف مؤقت';
  timer = setInterval(() => {
    left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    drawPomo();
    if (left === 0) finishPhase();
  }, 250);
  savePomo();
}
function finishPhase() {
  if (mode === 'work') {
    const k = today(); S.sessions[k] = (S.sessions[k] || 0) + 1; save(); renderSessions();
  }
  beep();
  mode = mode === 'work' ? 'rest' : 'work';
  resetPomo();
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach(t => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.15, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
  } catch (e) {}
}
function renderSessions() {
  const n = S.sessions[today()] || 0;
  $('#pomoCount').textContent = n;
  // تحديث النجوم (gamification.js)
  if (typeof updateStars === 'function') updateStars();
}
$('#pomoStart').addEventListener('click', startPause);
$('#pomoReset').addEventListener('click', resetPomo);
$('#pomoSkip').addEventListener('click', () => { mode = mode === 'work' ? 'rest' : 'work'; resetPomo(); });

/* ========= المحاضرات ========= */
function renderTabs() {
  const box = $('#subjectTabs');
  box.innerHTML = '';
  SUBJECTS.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'tab' + (i === S.subject ? ' active' : '');
    b.style.setProperty('--c', s.color);
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', i === S.subject);
    b.innerHTML = `<svg><use href="#${s.icon}"/></svg>`;
    b.append(s.name);
    b.onclick = () => { S.subject = i; save(); renderTabs(); renderLectures(); };
    box.appendChild(b);
  });
}
function renderLectures() {
  const i = S.subject, s = SUBJECTS[i], list = $('#lectList');
  list.innerHTML = '';

  lectureNames(s).forEach(file => {
    const li = document.createElement('li');
    li.innerHTML = '<svg><use href="#i-pdf"/></svg>';

    const name = document.createElement('span');
    name.className = 'n';
    name.textContent = lectureLabel(file);

    const a = document.createElement('a');
    a.href = pdfPath(i + 1, file);
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'فتح PDF';

    li.append(name, a);
    list.appendChild(li);
  });

  $('#subjName').textContent = s.name;
  $('#subjCount').textContent = '';
}

/* ========= اقتراح إضافة الموقع إلى الشاشة الرئيسية (مرة واحدة فقط) ========= */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
window.addEventListener('appinstalled', () => { deferredPrompt = null; closeA2hs(); });

const isStandalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isMobile = () => isIOS() || /android/i.test(navigator.userAgent);

function closeA2hs() { $('#a2hs').hidden = true; S.a2hsAsked = true; save(); }

function maybeAskA2hs() {
  // فقط على الجوال، وبعد إدخال الاسم، ومرة واحدة، وليس إذا فُتح الموقع من الشاشة الرئيسية أصلاً
  if (S.a2hsAsked || !S.name || !$('#welcome').hidden || isStandalone() || !isMobile()) return;
  $('#a2hs').hidden = false;
}

$('#a2hsYes').addEventListener('click', async () => {
  if (deferredPrompt) {                       // أندرويد/كروم: نافذة الإضافة الجاهزة
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (e) {}
    deferredPrompt = null;
    closeA2hs();
    return;
  }
  // iPhone وبقية المتصفحات: خطوات يدوية قصيرة
  $('#a2hsTitle').textContent = 'خطوات سريعة';
  $('#a2hsText').textContent = isIOS()
    ? 'اضغط زر المشاركة (المربع مع السهم للأعلى) في Safari، ثم اختر «إضافة إلى الشاشة الرئيسية».'
    : 'اضغط على قائمة المتصفح (⋮)، ثم اختر «إضافة إلى الشاشة الرئيسية».';
  $('#a2hsYes').hidden = true;
  $('#a2hsNo').textContent = 'حسناً';
  S.a2hsAsked = true; save();
});
$('#a2hsNo').addEventListener('click', closeA2hs);

/* ========= التشغيل ========= */
const savedPomo = S.pomo; // نقرأ الحالة المحفوظة قبل أن يعيد resetPomo كتابتها
renderGreeting(); renderTasks(); renderSessions(); renderTabs(); renderLectures(); resetPomo();
restorePomo(savedPomo);
go(S.section && document.getElementById(S.section) ? S.section : 'home');
if (!S.name) showWelcome(false); else setTimeout(maybeAskA2hs, 1500);

/* ========= PWA: تسجيل خدمة العمل أوفلاين ========= */
if ('serviceWorker' in navigator) {
  // إذا كان هناك service worker سابق وتم تحديثه، أعد تحميل الصفحة مرة واحدة لتظهر النسخة الجديدة
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
      // تحقق من وجود تحديث كلما عاد الطالب للتطبيق أو عاد الإنترنت
      const check = () => reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      window.addEventListener('online', check);
    }).catch(() => {});
  });
}

/* ========= طلب تخزين دائم: يمنع المتصفح من حذف بيانات الطالب عند امتلاء المساحة ========= */
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
