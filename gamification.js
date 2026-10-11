
/* ==========================================
   Med13 — نظام النجوم
   يتكامل مع levels-backup.js لحساب مكافآت المهام
   وجلسات التركيز والمستويات.
   ========================================== */

const SESSIONS_PER_STAR = 8;
const MAX_STARS_SHOWN = 30;
let lastStars = null;

function localDayKey() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function updateStars() {
  try {
    if (typeof S === 'undefined' || !S || !S.sessions) return;
    if (!S.starsByDay) S.starsByDay = {};

    // الحفاظ على النجوم التاريخية وعدم إنقاصها.
    let changed = false;
    for (const day in S.sessions) {
      const earned = Math.floor(
        (Number(S.sessions[day]) || 0) / SESSIONS_PER_STAR
      );
      if (earned > (Number(S.starsByDay[day]) || 0)) {
        S.starsByDay[day] = earned;
        changed = true;
      }
    }
    if (changed && typeof save === 'function') save();

    let totalStars = 0;
    for (const day in S.starsByDay) {
      totalStars += Math.max(0, Number(S.starsByDay[day]) || 0);
    }

    // إضافة مكافآت المهام وجلسات التركيز من سجل المكافآت.
    if (
      window.Med13Rewards &&
      typeof window.Med13Rewards.bonusTotal === 'function'
    ) {
      totalStars += Math.max(
        0,
        Number(window.Med13Rewards.bonusTotal()) || 0
      );
    }

    renderStars(totalStars);

    if (
      window.Med13Rewards &&
      typeof window.Med13Rewards.render === 'function'
    ) {
      window.Med13Rewards.render();
    }
  } catch (e) {
    console.error('Med13 stars error:', e);
  }
}

function renderStars(total) {
  const row = document.getElementById('starsRow');
  if (!row) return;

  const shown = Math.min(total, MAX_STARS_SHOWN);
  const slots = Math.max(5, shown);
  const isNew = lastStars !== null && total > lastStars;
  let html = '';

  for (let i = 0; i < slots; i++) {
    const on = i < shown;
    const pop = on && isNew && i === shown - 1 ? ' pop' : '';
    html += `<svg class="star-ic${on ? '' : ' off'}${pop}">
      <use href="#i-star"></use>
    </svg>`;
  }

  if (total > MAX_STARS_SHOWN) {
    html += `<span class="star-more">+${total - MAX_STARS_SHOWN}</span>`;
  }

  row.innerHTML = html;
  row.setAttribute('aria-label', `لديك ${total} نجمة`);
  lastStars = total;

  const todayN = Number(S.sessions[localDayKey()]) || 0;
  const cycle = todayN % SESSIONS_PER_STAR;
  const full = todayN > 0 && cycle === 0;

  const countEl = document.getElementById('starsCount');
  const barEl = document.getElementById('starBar');
  const noteEl = document.getElementById('starNote');

  if (countEl) countEl.textContent = total + ' نجمة';
  if (barEl) {
    barEl.style.width =
      (full ? 100 : (cycle / SESSIONS_PER_STAR) * 100) + '%';
  }

  if (noteEl) {
    if (todayN === 0) {
      noteEl.textContent =
        'ابدأ جلسات التركيز اليوم وتابع تقدمك نحو المكافأة!';
    } else if (full) {
      noteEl.textContent =
        `أكملت ${todayN} جلسة عمل اليوم. تابع التقدم نحو المكافأة التالية.`;
    } else {
      noteEl.textContent =
        `أكملت ${cycle} من ${SESSIONS_PER_STAR} جلسات في الدورة الحالية.`;
    }
  }

  const log = document.getElementById('starLog');
  if (log) {
    log.innerHTML = '';
    const days = Object.keys(S.starsByDay)
      .filter(d => Number(S.starsByDay[d]) > 0)
      .sort()
      .reverse()
      .slice(0, 7);

    if (days.length) {
      const label = document.createElement('small');
      label.textContent = 'سجل النجوم:';
      log.appendChild(label);

      days.forEach(d => {
        const chip = document.createElement('span');
        chip.textContent =
          d.slice(5).replace('-', '/') + '  ⭐ ' + S.starsByDay[d];
        log.appendChild(chip);
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', updateStars);
document.addEventListener('planner:task-completed', updateStars);
document.addEventListener('planner:task-uncompleted', updateStars);
document.addEventListener('planner:task-deleted', updateStars);
document.addEventListener('med13:pomo-work-completed', updateStars);
