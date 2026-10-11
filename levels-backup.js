
/* Med13 — المكافآت والمستويات والنسخ الاحتياطي */
(function () {
  'use strict';

  const REWARD_KEY = 'student-rewards-v1';
  const PLANNER_KEY = 'student-planner-v1';
  const SITE_KEY = 'student-site-v1';
  const THRESHOLDS = [0, 20, 50, 90, 140, 200];

  function sessionCount() {
    if (typeof S === 'undefined' || !S.sessions) return 0;
    return Object.values(S.sessions)
      .reduce((sum, n) => sum + Math.max(0, Number(n) || 0), 0);
  }

  function readLedger() {
    try {
      const x = JSON.parse(localStorage.getItem(REWARD_KEY) || 'null');
      if (
        x && x.v === 1 &&
        Array.isArray(x.taskRewards) &&
        Array.isArray(x.taskFingerprints) &&
        Array.isArray(x.pomoMilestones) &&
        Number.isFinite(Number(x.total))
      ) return x;
    } catch (_) {}

    return {
      v: 1,
      taskRewards: [],
      taskFingerprints: [],
      pomoMilestones: [],
      total: 0,
      sessionBaseline: sessionCount()
    };
  }

  let ledger = readLedger();

  // تسجيل عدد الجلسات القديمة كنقطة بداية، حتى لا تُمنح مكافآت رجعية.
  if (!Number.isFinite(Number(ledger.sessionBaseline))) {
    ledger.sessionBaseline = sessionCount();
  }

  function writeLedger() {
    try {
      localStorage.setItem(REWARD_KEY, JSON.stringify(ledger));
      return true;
    } catch (error) {
      console.error('تعذر حفظ المكافآت:', error);
      return false;
    }
  }

  function normalizeTitle(title) {
    return String(title || '')
      .trim()
      .toLocaleLowerCase()
      .replace(/\s+/g, ' ');
  }

  // منع تكرار مكافأة المهمة نفسها حتى لو حُذفت وأُعيد إنشاؤها.
  // ملاحظة: المهمة الجديدة بالعنوان نفسه لن تمنح نجمة إضافية.
  function taskFingerprint(task) {
    return normalizeTitle(task.title);
  }

  function historicalStars() {
    if (typeof S === 'undefined' || !S.starsByDay) return 0;
    return Object.values(S.starsByDay)
      .reduce((sum, n) => sum + Math.max(0, Number(n) || 0), 0);
  }

  function totalStars() {
    return historicalStars() + Math.max(0, Number(ledger.total) || 0);
  }

  function refresh() {
    if (typeof window.updateStars === 'function') {
      window.updateStars();
    } else {
      renderLevel();
    }
  }

  function onTaskCompleted(event) {
    const task = event.detail || {};
    if (!task.first || !task.id || !task.title) return;

    const id = String(task.id);
    const fingerprint = taskFingerprint(task);

    if (
      ledger.taskRewards.includes(id) ||
      ledger.taskFingerprints.includes(fingerprint)
    ) return;

    ledger.taskRewards.push(id);
    ledger.taskFingerprints.push(fingerprint);
    ledger.total = Math.max(0, Number(ledger.total) || 0) + 1;

    if (writeLedger()) refresh();
  }

  function onWorkSessionCompleted(event) {
    const count = Number(event.detail && event.detail.count);
    if (!Number.isFinite(count)) return;

    const baseline = Math.max(0, Number(ledger.sessionBaseline) || 0);
    const newlyCompleted = Math.max(0, count - baseline);
    const milestones = Math.floor(newlyCompleted / 8);
    let changed = false;

    // كل 8 جلسات عمل مكتملة حديثًا = 3 نجوم، وكل معلم مرة واحدة فقط.
    for (let milestone = 1; milestone <= milestones; milestone++) {
      if (!ledger.pomoMilestones.includes(milestone)) {
        ledger.pomoMilestones.push(milestone);
        ledger.total = Math.max(0, Number(ledger.total) || 0) + 3;
        changed = true;
      }
    }

    if (changed && writeLedger()) refresh();
  }

  document.addEventListener('planner:task-completed', onTaskCompleted);
  document.addEventListener('med13:pomo-work-completed', onWorkSessionCompleted);

  function levelFor(stars) {
    let index = 0;
    for (let i = 0; i < THRESHOLDS.length; i++) {
      if (stars >= THRESHOLDS[i]) index = i;
    }
    return index;
  }

  function renderLevel() {
    const stars = totalStars();
    const index = levelFor(stars);
    const next = THRESHOLDS[index + 1];
    const previous = THRESHOLDS[index];
    const percent = next
      ? Math.max(0, Math.min(100, (stars - previous) / (next - previous) * 100))
      : 100;

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText('levelNumber', index + 1);
    setText(
      'levelCaption',
      index === 5 ? 'وصلت إلى أعلى مستوى!' : `تابع التقدم نحو المستوى ${index + 2}`
    );
    setText('levelStarText', `${stars} نجمة إجمالًا`);
    setText(
      'levelNextText',
      next ? `باقي ${next - stars} نجمة للمستوى التالي` : 'أعلى مستوى'
    );

    const bar = document.getElementById('levelBar');
    if (bar) bar.style.width = percent + '%';

    const emblem = document.getElementById('levelEmblem');
    if (emblem) emblem.className = `level-emblem level-${index + 1}`;

    const badges = document.getElementById('levelBadges');
    if (badges) {
      badges.innerHTML = '';
      THRESHOLDS.forEach((threshold, i) => {
        const badge = document.createElement('span');
        badge.className = 'level-badge' +
          (i === index ? ' current' : i < index ? ' reached' : '');
        badge.textContent = String(i + 1);
        badge.title = `المستوى ${i + 1}: ${threshold} نجمة فما فوق`;
        badges.appendChild(badge);
      });
    }
  }

  window.Med13Rewards = {
    getData() {
      return JSON.parse(JSON.stringify(ledger));
    },

    bonusTotal() {
      return Math.max(0, Number(ledger.total) || 0);
    },

    total: totalStars,
    render: renderLevel,

    setData(data) {
      if (
        !data || data.v !== 1 ||
        !Array.isArray(data.taskRewards) ||
        !Array.isArray(data.pomoMilestones) ||
        !Number.isFinite(Number(data.total))
      ) return false;

      ledger = {
        v: 1,
        taskRewards: [...new Set(data.taskRewards.map(String))],
        taskFingerprints: [
          ...new Set(
            (Array.isArray(data.taskFingerprints) ? data.taskFingerprints : [])
              .map(String)
          )
        ],
        pomoMilestones: [
          ...new Set(
            data.pomoMilestones
              .map(Number)
              .filter(n => Number.isInteger(n) && n > 0)
          )
        ],
        sessionBaseline: Number.isFinite(Number(data.sessionBaseline))
          ? Number(data.sessionBaseline)
          : sessionCount(),
        total: Math.max(0, Math.floor(Number(data.total)))
      };

      return writeLedger();
    }
  };

  const status = document.getElementById('backupStatus');
  const fileInput = document.getElementById('importDataFile');

  function say(message) {
    if (status) status.textContent = message;
  }

  const exportButton = document.getElementById('exportData');
  if (exportButton) {
    exportButton.addEventListener('click', () => {
      try {
        const backup = {
          format: 'med13-backup',
          version: 1,
          createdAt: new Date().toISOString(),
          site: JSON.parse(localStorage.getItem(SITE_KEY) || '{}'),
          planner: JSON.parse(
            localStorage.getItem(PLANNER_KEY) ||
            '{"v":1,"tasks":[],"rejected":[]}'
          ),
          rewards: JSON.parse(localStorage.getItem(REWARD_KEY) || 'null') || ledger
        };

        const blob = new Blob(
          [JSON.stringify(backup, null, 2)],
          { type: 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'med13-backup-' +
          new Date().toISOString().slice(0, 10) + '.json';

        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        say('تم إنشاء النسخة الاحتياطية. احتفظي بها في مكان آمن.');
      } catch (error) {
        say('تعذر تصدير البيانات.');
      }
    });
  }

  const importButton = document.getElementById('importDataBtn');
  if (importButton && fileInput) {
    importButton.addEventListener('click', () => fileInput.click());
  }

  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;

      try {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('حجم الملف أكبر من الحد المسموح (5 ميغابايت).');
        }

        const backup = JSON.parse(await file.text());

        if (
          !backup ||
          backup.format !== 'med13-backup' ||
          backup.version !== 1 ||
          !backup.site ||
          typeof backup.site !== 'object' ||
          Array.isArray(backup.site) ||
          !backup.planner ||
          !Array.isArray(backup.planner.tasks) ||
          !backup.rewards ||
          backup.rewards.v !== 1 ||
          !Array.isArray(backup.rewards.taskRewards) ||
          !Array.isArray(backup.rewards.pomoMilestones) ||
          !Number.isFinite(Number(backup.rewards.total))
        ) {
          throw new Error('الملف غير صالح أو غير متوافق مع هذه النسخة.');
        }

        if (!confirm(
          'سيتم استبدال بيانات Med13 الحالية بالبيانات الموجودة في النسخة. ' +
          'هل تريدين المتابعة؟ يُفضّل تصدير نسخة من بياناتك الحالية أولًا.'
        )) return;

        const keys = [SITE_KEY, PLANNER_KEY, REWARD_KEY];
        const previous = {};
        keys.forEach(key => {
          previous[key] = localStorage.getItem(key);
        });

        try {
          localStorage.setItem(SITE_KEY, JSON.stringify(backup.site));
          localStorage.setItem(PLANNER_KEY, JSON.stringify(backup.planner));
          localStorage.setItem(REWARD_KEY, JSON.stringify(backup.rewards));
        } catch (error) {
          keys.forEach(key => {
            if (previous[key] === null) localStorage.removeItem(key);
            else localStorage.setItem(key, previous[key]);
          });
          throw new Error('تعذر حفظ النسخة؛ أُعيدت القيم السابقة قدر الإمكان.');
        }

        say('تم الاستيراد. جارٍ إعادة تحميل الموقع.');
        location.reload();
      } catch (error) {
        say(error.message || 'تعذر استيراد الملف.');
      } finally {
        fileInput.value = '';
      }
    });
  }

  renderLevel();
})();
