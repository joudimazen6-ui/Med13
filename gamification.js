/* ==========================================
   نظام نقاط الخبرة XP (gamification.js)
   عرض نقاط الخبرة والمكافآت المحفوظة من نظام Med13Rewards.
   لا تُحتسب جلسات بومودورو هنا حتى لا تتكرر المكافآت.
   ========================================== */

const SESSIONS_PER_MILESTONE = 8;
const XP_PER_SESSION_MILESTONE = 3;
let lastXP = null;

function localDayKey() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// نجوم الجلسات الجديدة تُدار حصراً عبر Med13Rewards لتجنّب تكرار المكافآت.
// نحتفظ بـ S.starsByDay كما هي لأنها تمثل النجوم التاريخية المحفوظة سابقاً.
function updateXP() {
    try {
        if (typeof S === 'undefined' || !S || !S.sessions) return;
        if (!S.starsByDay) S.starsByDay = {};
        let totalXP = Object.values(S.starsByDay).reduce(
            (sum, value) => sum + Math.max(0, Number(value) || 0), 0
        );
        if (window.Med13Rewards && typeof window.Med13Rewards.bonusTotal === 'function') {
            totalXP += Math.max(0, Number(window.Med13Rewards.bonusTotal()) || 0);
        }
        renderXP(totalXP);
        if (window.Med13Rewards && typeof window.Med13Rewards.render === 'function') {
            window.Med13Rewards.render();
        }
    } catch (e) {
        console.error('Gamification Error:', e);
    }
}

function renderXP(total) {
    const row = document.getElementById('starsRow');
    if (!row) return;

    // عرض نقاط XP رقمياً بدلاً من صف النجوم، مع الحفاظ على نفس عنصر الصفحة.
    const isNew = lastXP !== null && total > lastXP;
    row.innerHTML = `<span class="xp-total${isNew ? ' pop' : ''}" style="display:inline-flex;align-items:center;justify-content:center;min-width:5rem;padding:.55rem 1rem;border-radius:999px;font-size:1.15rem;font-weight:800;letter-spacing:.03em;background:rgba(16,185,129,.14);color:var(--accent,#10b981);border:1px solid rgba(16,185,129,.35)">${total} XP</span>`;
    row.setAttribute('aria-label', `لديك ${total} نقطة خبرة XP`);
    lastXP = total;

    // تقدم اليوم
    const todayN = Number(S.sessions[localDayKey()]) || 0;
    const cycle = todayN % SESSIONS_PER_MILESTONE;
    const full = todayN > 0 && cycle === 0;

    const countEl = document.getElementById('starsCount');
    const barEl = document.getElementById('starBar');
    const noteEl = document.getElementById('starNote');
    if (countEl) countEl.textContent = total + ' XP';
    if (barEl) barEl.style.width = (full ? 100 : cycle / SESSIONS_PER_MILESTONE * 100) + '%';
    if (noteEl) {
        if (todayN === 0) {
            noteEl.textContent = 'أكمل 8 جلسات تركيز اليوم لتحصل على 3 نقاط XP!';
        } else if (full) {
            noteEl.textContent = `ممتاز! أنجزت ${todayN} جلسة اليوم، ومكافآتها ${Math.floor(todayN / SESSIONS_PER_MILESTONE) * XP_PER_SESSION_MILESTONE} نقاط XP. أكمل 8 جلسات أخرى لتحصل على 3 نقاط XP إضافية.`;
        } else {
            noteEl.textContent = `أنجزت اليوم ${cycle} من ${SESSIONS_PER_MILESTONE} جلسات، وباقي ${SESSIONS_PER_MILESTONE - cycle} جلسات للحصول على 3 نقاط XP.`;
        }
    }

    // سجل نقاط الخبرة التاريخية (آخر 7 أيام فيها نقاط محفوظة)
    const log = document.getElementById('starLog');
    if (log) {
        log.innerHTML = '';
        const days = Object.keys(S.starsByDay).filter(d => S.starsByDay[d] > 0).sort().reverse().slice(0, 7);
        if (days.length) {
            const lab = document.createElement('small');
            lab.textContent = 'سجل نقاط الخبرة:';
            log.appendChild(lab);
            days.forEach(d => {
                const chip = document.createElement('span');
                chip.textContent = d.slice(5).replace('-', '/') + '  XP ' + S.starsByDay[d];
                log.appendChild(chip);
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateXP();
});
