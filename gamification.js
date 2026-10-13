/* ==========================================
   Med13 XP System
   عرض نقاط الخبرة بدل النجوم دون تغيير نظام المكافآت.
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

function updateStaticXpLabels() {
    const card = document.querySelector('.stars-card');

    if (card) {
        const heading = card.querySelector('.progress-head b');
        if (heading) heading.textContent = 'XP | نقاط الخبرة';

        const row = document.getElementById('starsRow');
        if (row) {
            row.setAttribute('aria-label', 'نقاط الخبرة XP');
            row.setAttribute('role', 'status');
        }
    }

    const guide = document.querySelector('.guide-card');

    if (guide) {
        const icon = guide.querySelector('.guide-icon');
        const title = guide.querySelector('.guide-text strong');
        const paragraph = guide.querySelector('.guide-text p');

        if (icon) icon.textContent = 'XP';

        if (title) {
            title.textContent = 'ما هي نقاط الخبرة XP وكيف أجمعها؟';
        }

        if (paragraph) {
            paragraph.textContent =
                'تُحفظ نقاط الخبرة التي جمعتها سابقًا، وتكسب 3 XP مقابل كل 8 جلسات عمل مكتملة، ونقطة XP واحدة مقابل كل 3 إنجازات للمهام المكتملة. تُحفظ المكافآت محليًا على جهازك، ويُحدد مستواك وفق مجموع نقاط الخبرة.';
        }
    }
}

function updateStars() {
    try {
        if (typeof S === 'undefined' || !S || !S.sessions) return;

        if (!S.starsByDay) S.starsByDay = {};

        let totalXP = Object.values(S.starsByDay).reduce(
            (sum, value) => sum + Math.max(0, Number(value) || 0),
            0
        );

        if (
            window.Med13Rewards &&
            typeof window.Med13Rewards.bonusTotal === 'function'
        ) {
            totalXP += Math.max(
                0,
                Number(window.Med13Rewards.bonusTotal()) || 0
            );
        }

        renderXP(totalXP);

        if (
            window.Med13Rewards &&
            typeof window.Med13Rewards.render === 'function'
        ) {
            window.Med13Rewards.render();
        }
    } catch (e) {
        console.error('XP System Error:', e);
    }
}

function renderXP(totalXP) {
    const row = document.getElementById('starsRow');
    if (!row) return;

    const isNew = lastStars !== null && totalXP > lastStars;

    row.innerHTML = '';

    const pill = document.createElement('span');
    pill.className = 'xp-pill';
    pill.textContent = `${totalXP} XP`;

    pill.style.display = 'inline-flex';
    pill.style.alignItems = 'center';
    pill.style.justifyContent = 'center';
    pill.style.gap = '8px';
    pill.style.padding = '10px 22px';
    pill.style.borderRadius = '14px';
    pill.style.fontSize = '1.25rem';
    pill.style.fontWeight = '800';
    pill.style.letterSpacing = '0.5px';
    pill.style.color = '#8DE1D0';
    pill.style.background = 'rgba(45, 212, 191, 0.10)';
    pill.style.border = '1px solid rgba(45, 212, 191, 0.35)';
    pill.style.transition = 'transform 0.2s ease';

    if (isNew) {
        pill.style.transform = 'scale(1.05)';
    }

    row.appendChild(pill);
    row.setAttribute('aria-label', `لديك ${totalXP} نقطة XP`);

    lastStars = totalXP;

    // شريط تقدم جلسات اليوم فقط.
    const todayN = Number(S.sessions[localDayKey()]) || 0;
    const cycle = todayN % SESSIONS_PER_STAR;
    const full = todayN > 0 && cycle === 0;

    const countEl = document.getElementById('starsCount');
    const barEl = document.getElementById('starBar');
    const noteEl = document.getElementById('starNote');

    if (countEl) {
        countEl.textContent = `${totalXP} XP`;
    }

    if (barEl) {
        barEl.style.width =
            (full ? 100 : cycle / SESSIONS_PER_STAR * 100) + '%';
    }

    if (noteEl) {
        if (todayN === 0) {
            noteEl.textContent =
                'أكمل 8 جلسات تركيز اليوم لتحصل على 3 XP!';
        } else if (full) {
            const earned =
                Math.floor(todayN / SESSIONS_PER_STAR) *
                STARS_PER_SESSION_MILESTONE;

            noteEl.textContent =
                `ممتاز! أنجزت ${todayN} جلسة اليوم، ومكافآتها ${earned} XP. أكمل 8 جلسات أخرى لتحصل على 3 XP إضافية.`;
        } else {
            noteEl.textContent =
                `أنجزت اليوم ${cycle} من ${SESSIONS_PER_STAR} جلسات، وباقي ${SESSIONS_PER_STAR - cycle} جلسات للحصول على 3 XP.`;
        }
    }

    // سجل النقاط التاريخية المحفوظة سابقًا.
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
            lab.textContent = 'سجل XP:';
            log.appendChild(lab);

            days.forEach(d => {
                const chip = document.createElement('span');

                chip.textContent =
                    d.slice(5).replace('-', '/') +
                    '  XP ' +
                    S.starsByDay[d];

                log.appendChild(chip);
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateStaticXpLabels();
    updateStars();
});
