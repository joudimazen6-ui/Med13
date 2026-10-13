/* ==========================================
   نظام النجوم (gamification.js)
   عرض النجوم التاريخية والمكافآت الجديدة من Med13Rewards.
   ========================================== */

const SESSIONS_PER_STAR = 8;
const STARS_PER_SESSION_MILESTONE = 3;
const MAX_STARS_SHOWN = 30;

let lastStars = null;

function localDayKey() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');

    return d.getFullYear() + '-' +
        p(d.getMonth() + 1) + '-' +
        p(d.getDate());
}

function updateStars() {
    try {
        if (typeof S === 'undefined' || !S || !S.sessions) return;

        if (!S.starsByDay) S.starsByDay = {};

        let totalStars = Object.values(S.starsByDay).reduce(
            (sum, value) => sum + Math.max(0, Number(value) || 0),
            0
        );

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
        console.error('Gamification Error:', e);
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

        html += `<svg class="star-ic${on ? '' : ' off'}${pop}"><use href="#i-star"/></svg>`;
    }

    if (total > MAX_STARS_SHOWN) {
        html += `<span class="star-more">+${total - MAX_STARS_SHOWN}</span>`;
    }

    row.innerHTML = html;
    row.setAttribute('aria-label', `لديك ${total} نجمة`);

    lastStars = total;

    // تقدم جلسات اليوم فقط.
    const todayN = Number(S.sessions[localDayKey()]) || 0;
    const cycle = todayN % SESSIONS_PER_STAR;
    const full = todayN > 0 && cycle === 0;

    const countEl = document.getElementById('starsCount');
    const barEl = document.getElementById('starBar');
    const noteEl = document.getElementById('starNote');

    if (countEl) {
        countEl.textContent = total + ' نجمة';
    }

    if (barEl) {
        barEl.style.width =
            (full ? 100 : cycle / SESSIONS_PER_STAR * 100) + '%';
    }

    if (noteEl) {
        if (todayN === 0) {
            noteEl.textContent =
                'أكمل 8 جلسات تركيز اليوم لتحصل على 3 نجوم!';
        } else if (full) {
            const earned =
                Math.floor(todayN / SESSIONS_PER_STAR) *
                STARS_PER_SESSION_MILESTONE;

            noteEl.textContent =
                `ممتاز! أنجزت ${todayN} جلسة اليوم، ومكافآتها ${earned} نجوم. أكمل 8 جلسات أخرى لتحصل على 3 نجوم إضافية.`;
        } else {
            noteEl.textContent =
                `أنجزت اليوم ${cycle} من ${SESSIONS_PER_STAR} جلسات، وباقي ${SESSIONS_PER_STAR - cycle} جلسات للحصول على 3 نجوم.`;
        }
    }

    // سجل النجوم اليومية القديمة، دون حذفها.
    const log = document.getElementById('starLog');

    if (log) {
        log.innerHTML = '';

        const days = Object.keys(S.starsByDay)
            .filter(d => S.starsByDay[d] > 0)
            .sort()
            .reverse()
            .slice(0, 7);

        if (days.length) {
            const lab = document.createElement('small');
            lab.textContent = 'سجل النجوم:';
            log.appendChild(lab);

            days.forEach(d => {
                const chip = document.createElement('span');

                chip.textContent =
                    d.slice(5).replace('-', '/') +
                    '  ⭐ ' +
                    S.starsByDay[d];

                log.appendChild(chip);
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateStars();
});
