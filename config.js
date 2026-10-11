/* =====================================================
   ملف الإعدادات: هذا هو الملف الذي تعدّله عند إضافة محاضرات أو مواد.
   يقرأه الموقع (script.js) وخدمة العمل أوفلاين (sw.js) معاً،
   فلا حاجة لتعديل أي شيء آخر.
   ===================================================== */

const APP_VERSION = 'v14';
const PDF_VERSION = '1';

/* أسماء ملفات المحاضرات: pdfs/subject1/ ثم subject2/ ... بالاسم L01.pdf ...
   الاسم حساس لحالة الأحرف (L كبيرة، و .pdf صغيرة). */
function LECTS(count, parts) {
  parts = parts || {};
  const out = [];
  for (let n = 1; n <= count; n++) {
    const base = 'L' + String(n).padStart(2, '0');
    if (parts[n]) { for (const ch of String(parts[n])) out.push(base + ch); }
    else out.push(base);
  }
  return out;
}

function lectureNames(subject) {
  return Array.isArray(subject.lectures) ? subject.lectures : LECTS(Number(subject.lectures) || 0);
}

function pdfPath(subject, name) {
  return `pdfs/subject${subject}/${name}.pdf`;
}

function lectureLabel(name) {
  const m = /^L0*(\d+)(.*)$/i.exec(name);
  return m ? 'المحاضرة ' + m[1] + (m[2] ? ' (' + m[2] + ')' : '') : name;
}

/* ---------- المواد ---------- */
const SUBJECTS = [
  { name: 'تشريح الجهاز العصبي', lectures: ['L02a', 'L02b', 'L03a', 'L03b', 'L04', 'L05a', 'L05b', 'L06', 'L07', 'L08'], color: '#FF6F61', icon: 'i-brain' },
  { name: 'الفيزيولوجيا 2',      lectures: LECTS(12), color: '#14B8A6', icon: 'i-pulse' },
  { name: 'الكيمياء السريرية 2', lectures: LECTS(12), color: '#4C9AFF', icon: 'i-pill'  },
  { name: 'أخلاقيات الطب',       lectures: LECTS(12), color: '#F5B93B', icon: 'i-book'  },
  { name: 'الوبائيات',           lectures: LECTS(12), color: '#8B7CF6', icon: 'i-stats' },
  { name: 'المهارات السريرية',   lectures: [...LECTS(7), 'L07b', ...LECTS(23).slice(7), 'L24a', 'L24b', 'L25a', 'L25b'], color: '#EC5F9A', icon: 'i-steth' },
  { name: 'الأحياء الدقيقة',     lectures: LECTS(12), color: '#12284C', icon: 'i-germ'  }
];