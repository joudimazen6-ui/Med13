/* ==========================================
   نظام النجوم (gamification.js)
   عرض النجوم التاريخية والمكافآت الجديدة من نظام Med13Rewards.
   لا تُحتسب جلسات بومودورو هنا حتى لا تتكرر المكافآت.
   ========================================== */

const SESSIONS_PER_STAR = 8;
const STARS_PER_SESSION_MILESTONE = 3;
const MAX_STARS_SHOWN = 30;

let lastStars = null; // لتحريك النجمة الجديدة فقط

function localDayKey() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');

    return d.getFullYear() + '-' +
        p(d.getMonth() + 1) + '-' +
        p(d.getDate());
}

// نجوم الجلسات الجديدة تُدار حصراً عبر Med13Rewards لتجنّب تكرار المكافآت.
// نحتفظ بـ S.starsByDay كما هي لأنها تمثل النجوم التاريخية المحفوظة سابقاً.
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

    // صف النجوم
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

    // تقدم جلسات الدراسة في اليوم الحالي فقط
    const todayN = Math.max(
        0,
        Number(S.sessions[localDayKey()]) || 0
    );

    const cycle = todayN % SESSIONS_PER_STAR;
    const milestonesToday = Math.floor(
        todayN / SESSIONS_PER_STAR
    );

    const countEl = document.getElementById('starsCount');
    const barEl = document.getElementById('starBar');
    const noteEl = document.getElementById('starNote');

    if (countEl) {
        countEl.textContent = total + ' نجمة';
    }

    if (barEl) {
        barEl.style.width = (
            todayN > 0 && cycle === 0
                ? 100
                : cycle / SESSIONS_PER_STAR * 100
        ) + '%';
    }

    if (noteEl) {
        if (todayN === 0) {
            noteEl.textContent =
                'أكمل 8 جلسات تركيز اليوم لتحصل على 3 نجمات!';
        } else if (cycle === 0) {
            noteEl.textContent =
                `ممتاز! أنجزت ${todayN} جلسة اليوم، ` +
                `ومكافآتها ${milestonesToday * STARS_PER_SESSION_MILESTONE} نجمات. ` +
                'أكمل 8 جلسات أخرى لتحصل على 3 نجمات إضافية.';
        } else {
            noteEl.textContent =
                `أنجزت اليوم ${todayN} جلسة. ` +
                `تقدّمك نحو المكافأة التالية ${cycle} من ${SESSIONS_PER_STAR} جلسات، ` +
                `وباقي ${SESSIONS_PER_STAR - cycle} جلسات للحصول على 3 نجمات إضافية.`;
        }
    }

    // سجل النجوم اليومي (آخر 7 أيام فيها نجوم)
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
                    '  ⭐ ' + S.starsByDay[d];

                log.appendChild(chip);
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateStars();
});
