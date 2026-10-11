
/* Med13 — عرض النجوم التاريخية والمكافآت الجديدة دون تكرار */
(function () {
  'use strict';

  const SESSIONS_PER_REWARD = 8;
  const MAX_STARS_SHOWN = 30;
  let lastStars = null;

  function localDayKey() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function updateStars() {
    try {
      if (typeof S === 'undefined' || !S) return;
      if (!S.starsByDay) S.starsByDay = {};
      if (!S.sessions) S.sessions = {};

      // لا نضيف نجومًا من الجلسات هنا؛ مكافآت الجلسات يحسبها levels-backup.js.
      const oldStars = Object.values(S.starsByDay)
        .reduce((sum, n) => sum + Math.max(0, Number(n) || 0), 0);

      const bonusStars = window.Med13Rewards
        ? Math.max(0, Number(window.Med13Rewards.bonusTotal()) || 0)
        : 0;

      renderStars(oldStars + bonusStars);

      if (window.Med13Rewards &&
          typeof window.Med13Rewards.render === 'function') {
        window.Med13Rewards.render();
      }
    } catch (error) {
      console.error('Med13 stars error:', error);
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
      const active = i < shown;
      const pop = active && isNew && i === shown - 1 ? ' pop' : '';
      html += `<svg class="star-ic${active ? '' : ' off'}${pop}" aria-hidden="true"><use href="#i-star"></use></svg>`;
    }

    if (total > MAX_STARS_SHOWN) {
      html += `<span class="star-more">+${total - MAX_STARS_SHOWN}</span>`;
    }

    row.innerHTML = html;
    row.setAttribute('aria-label', `لديك ${total} نجمة`);
    lastStars = total;

    const countEl = document.getElementById('starsCount');
    if (countEl) countEl.textContent = `${total} نجمة`;

    const todaySessions = Number(S.sessions[localDayKey()]) || 0;
    const progress = todaySessions % SESSIONS_PER_REWARD;
    const bar = document.getElementById('starBar');
    const note = document.getElementById('starNote');

    if (bar) {
      bar.style.width = (progress / SESSIONS_PER_REWARD * 100) + '%';
    }

    if (note) {
      note.textContent =
        `جلسات التركيز المكتملة اليوم: ${todaySessions}. ` +
        'مكافأة التركيز تُحتسب لكل 8 جلسات عمل مكتملة حديثًا.';
    }

    const log = document.getElementById('starLog');
    if (log) {
      log.innerHTML = '';
      const days = Object.keys(S.starsByDay)
        .filter(day => Number(S.starsByDay[day]) > 0)
        .sort()
        .reverse()
        .slice(0, 7);

      if (days.length) {
        const label = document.createElement('small');
        label.textContent = 'سجل النجوم التاريخي:';
        log.appendChild(label);

        days.forEach(day => {
          const chip = document.createElement('span');
          chip.textContent =
            day.slice(5).replace('-', '/') + '  ⭐ ' + S.starsByDay[day];
          log.appendChild(chip);
        });
      }
    }
  }

  // إتاحة الدالة لبقية ملفات الموقع.
  window.updateStars = updateStars;

  document.addEventListener('DOMContentLoaded', updateStars);
  document.addEventListener('planner:task-completed', updateStars);
  document.addEventListener('med13:pomo-work-completed', updateStars);

  if (document.readyState !== 'loading') updateStars();
})();
