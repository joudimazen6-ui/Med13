/* ==========================================
   نظام النجوم (gamification.js)
   نجمة لكل 8 جلسات بومودورو مكتملة في اليوم الواحد.
   إذا أنهى الطالب أقل من 8 جلسات في اليوم فلا نجمة لذلك اليوم.
   النجوم تُحفظ لكل يوم (S.starsByDay) وتتراكم مع الأيام التالية.
   ========================================== */

const SESSIONS_PER_STAR = 8;
const MAX_STARS_SHOWN = 30;
let lastStars = null; // لتحريك النجمة الجديدة فقط

function localDayKey() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// حساب نجوم كل يوم، حفظها، ثم جمعها كلها
function updateStars() {
    try {
        if (typeof S === 'undefined' || !S || !S.sessions) return;
        if (!S.starsByDay) S.starsByDay = {};

        // نجوم اليوم = floor(جلسات ذلك اليوم / 8)، ولا تنقص أبداً
        let changed = false;
        for (const day in S.sessions) {
            const earned = Math.floor((Number(S.sessions[day]) || 0) / SESSIONS_PER_STAR);
            if (earned > (S.starsByDay[day] || 0)) {
                S.starsByDay[day] = earned;
                changed = true;
            }
        }
        if (changed && typeof save === 'function') save();

        let totalStars = 0;
        for (const day in S.starsByDay) totalStars += Number(S.starsByDay[day]) || 0;
        renderStars(totalStars);
    } catch (e) {
        console.log("Gamification Error:", e);
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
    if (total > MAX_STARS_SHOWN) html += `<span class="star-more">+${total - MAX_STARS_SHOWN}</span>`;
    row.innerHTML = html;
    row.setAttribute('aria-label', `لديك ${total} نجمة`);
    lastStars = total;

    // تقدم اليوم
    const todayN = Number(S.sessions[localDayKey()]) || 0;
    const cycle = todayN % SESSIONS_PER_STAR;
    const full = todayN > 0 && cycle === 0;

    const countEl = document.getElementById('starsCount');
    const barEl = document.getElementById('starBar');
    const noteEl = document.getElementById('starNote');
    if (countEl) countEl.textContent = total + ' نجمة';
    if (barEl) barEl.style.width = (full ? 100 : cycle / SESSIONS_PER_STAR * 100) + '%';
    if (noteEl) {
        if (todayN === 0) {
            noteEl.textContent = 'أكمل 8 جلسات تركيز اليوم لتحصل على نجمة جديدة!';
        } else if (full) {
            noteEl.textContent = `ممتاز! حصلت اليوم على ${todayN / SESSIONS_PER_STAR} نجمة. أكمل 8 جلسات أخرى لنجمة إضافية.`;
        } else {
            noteEl.textContent = `أنجزت اليوم ${cycle} من ${SESSIONS_PER_STAR} جلسات، وباقي ${SESSIONS_PER_STAR - cycle} للنجمة.`;
        }
    }

    // سجل النجوم اليومي (آخر 7 أيام فيها نجوم)
    const log = document.getElementById('starLog');
    if (log) {
        log.innerHTML = '';
        const days = Object.keys(S.starsByDay).filter(d => S.starsByDay[d] > 0).sort().reverse().slice(0, 7);
        if (days.length) {
            const lab = document.createElement('small');
            lab.textContent = 'سجل النجوم:';
            log.appendChild(lab);
            days.forEach(d => {
                const chip = document.createElement('span');
                chip.textContent = d.slice(5).replace('-', '/') + '  ⭐ ' + S.starsByDay[d];
                log.appendChild(chip);
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateStars();
});
