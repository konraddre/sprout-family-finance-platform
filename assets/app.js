/* ============================================================
   STATE
   ============================================================ */
const state = {
  theme: 'light',
  view: 'overview',
  bankName: 'Northwind Bank',
  appName: 'Junior Pay',
  accent: '#0f766e',
  cardStyle: 'navy',
  balance: 38.50,
  blocked: false,
};
const charts = {};
const initialized = { overview: false, parent: false, junior: false };

/* ============================================================
   HELPERS
   ============================================================ */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

function fmt(n, decimals = 0) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function animateValue(el, end, { decimals = 0, prefix = '', suffix = '', duration = 1100 } = {}) {
  const start = 0, t0 = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  function frame(now) {
    const p = Math.min((now - t0) / duration, 1);
    const val = start + (end - start) * ease(p);
    el.textContent = prefix + fmt(val, decimals) + suffix;
    if (p < 1) requestAnimationFrame(frame);
    else el.textContent = prefix + fmt(end, decimals) + suffix;
  }
  requestAnimationFrame(frame);
}

function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

/* ============================================================
   TOASTS
   ============================================================ */
function showToast(text, type = 'ok') {
  const stack = $('#toastStack');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = type === 'ok' ? 'check' : 'info';
  el.innerHTML = `<span class="t-ico"><i data-lucide="${icon}"></i></span><span class="t-txt">${text}</span>`;
  stack.appendChild(el);
  lucide.createIcons({ nameAttr: 'data-lucide' });
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }, 3400);
}

/* ============================================================
   THEME
   ============================================================ */
function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  $('#themeBtn').innerHTML = `<i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}"></i>`;
  lucide.createIcons({ nameAttr: 'data-lucide' });
  updateChartsTheme();
}
$('#themeBtn').addEventListener('click', () => setTheme(state.theme === 'dark' ? 'light' : 'dark'));

/* ============================================================
   NAVIGATION
   ============================================================ */
function showSection(view) {
  state.view = view;
  $$('.view').forEach(v => v.classList.remove('active'));
  const target = $(`#view-${view}`);
  if (target) target.classList.add('active');
  $$('.nav-item').forEach(n => {
    const on = n.dataset.view === view;
    n.classList.toggle('active', on);
    if (on) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current');
  });
  $('#content').scrollTop = 0;
  closeSidebar();

  if (view === 'overview') initOverview();
  if (view === 'parent') initParent();
  if (view === 'launch') setTimeout(() => { $('#tlProgress').style.width = '67%'; }, 150);
  if (view === 'rules') buildMcc();
  if (view === 'junior') initJunior();

  if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
}

$$('.nav-item').forEach(item => item.addEventListener('click', () => showSection(item.dataset.view)));

/* Mobile sidebar */
function openSidebar()  { $('#sidebar').classList.add('open'); $('#scrim').classList.add('show'); }
function closeSidebar() { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); }
$('#menuToggle').addEventListener('click', () => $('#sidebar').classList.contains('open') ? closeSidebar() : openSidebar());
$('#scrim').addEventListener('click', closeSidebar);

/* Bank selector */
const bankBtn = $('#bankBtn'), bankMenu = $('#bankMenu');
bankBtn.addEventListener('click', e => {
  e.stopPropagation();
  const open = bankMenu.classList.toggle('open');
  bankBtn.setAttribute('aria-expanded', open);
});
document.addEventListener('click', () => { bankMenu.classList.remove('open'); bankBtn.setAttribute('aria-expanded', 'false'); });
$$('#bankMenu button').forEach(b => b.addEventListener('click', () => {
  const name = b.dataset.bank;
  setBankName(name);
  $$('#bankMenu button').forEach(x => { x.setAttribute('aria-current', x === b ? 'true' : 'false'); x.querySelector('i')?.remove(); x.querySelector('span')?.remove(); });
  b.insertAdjacentHTML('afterbegin', '<i data-lucide="check" style="width:14px;height:14px;"></i>');
  $$('#bankMenu button').forEach(x => { if (x !== b && !x.querySelector('span')) x.insertAdjacentHTML('afterbegin', '<span style="width:14px;"></span>'); });
  lucide.createIcons({ nameAttr: 'data-lucide' });
  showToast(`Switched to <b>${name}</b>`, 'info');
}));

function setBankName(name) {
  state.bankName = name;
  $('#bankLabel').textContent = name;
  $('#bankTitle').textContent = name;
  $('#bankNameInput').value = name;
}

/* ============================================================
   OVERVIEW - KPIs + CHARTS
   ============================================================ */
function initOverview() {
  // KPI count-up (re-runs each visit)
  $$('#view-overview .kpi-value').forEach(el => {
    animateValue(el, parseFloat(el.dataset.count), {
      decimals: parseInt(el.dataset.decimals || '0', 10),
      prefix: el.dataset.prefix || '',
    });
  });
  if (initialized.overview) {
    // re-animate charts
    charts.growth && charts.growth.update();
    charts.volume && charts.volume.update();
    return;
  }
  initialized.overview = true;
  buildGrowthChart();
  buildVolumeChart();
}

function buildGrowthChart() {
  const ctx = $('#growthChart').getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 300);
  grad.addColorStop(0, 'rgba(247,166,0,0.28)');
  grad.addColorStop(1, 'rgba(247,166,0,0.00)');
  charts.growth = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      datasets: [{
        label: 'Active junior accounts',
        data: [3200, 3850, 4600, 5400, 6300, 7250, 8200, 9100, 9950, 10900, 11850, 12847],
        borderColor: cssVar('--c-navy') || '#0f766e',
        backgroundColor: grad,
        borderWidth: 2.5, fill: true, tension: 0.38,
        pointRadius: 0, pointHoverRadius: 5,
        pointBackgroundColor: '#F7A600', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2,
      }],
    },
    options: baseLineOptions(),
  });
}

function buildVolumeChart() {
  const ctx = $('#volumeChart').getContext('2d');
  const cats = [
    { label: 'Groceries', color: '#0f766e', data: [88, 94, 101, 108, 116, 124] },
    { label: 'Gaming',    color: '#F7A600', data: [52, 58, 61, 66, 70, 78] },
    { label: 'Food',      color: '#2bb3a3', data: [44, 47, 50, 54, 58, 63] },
    { label: 'Transport', color: '#2a9d8f', data: [22, 24, 25, 27, 29, 31] },
    { label: 'Education',  color: '#c47f00', data: [18, 20, 19, 23, 26, 28] },
    { label: 'Other',     color: '#a8a6a0', data: [14, 15, 16, 17, 18, 20] },
  ];
  charts.volume = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Jan','Feb','Mar','Apr','May','Jun'],
      datasets: cats.map(c => ({ label: c.label, data: c.data, backgroundColor: c.color, borderRadius: 3, borderSkipped: false, maxBarThickness: 30 })),
    },
    options: baseBarOptions(),
  });
}

function baseLineOptions() {
  const muted = cssVar('--color-text-muted'), grid = cssVar('--color-divider');
  return {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 1100, easing: 'easeOutCubic' },
    plugins: { legend: { display: false }, tooltip: tooltipStyle() },
    scales: {
      x: { grid: { display: false }, ticks: { color: muted, font: { family: 'Inter', size: 11 } }, border: { color: grid } },
      y: { grid: { color: grid, drawBorder: false }, ticks: { color: muted, font: { family: 'Inter', size: 11 }, callback: v => v >= 1000 ? (v/1000)+'k' : v }, border: { display: false } },
    },
  };
}
function baseBarOptions() {
  const muted = cssVar('--color-text-muted'), grid = cssVar('--color-divider');
  return {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 1000, easing: 'easeOutCubic' },
    plugins: {
      legend: { position: 'bottom', labels: { color: muted, font: { family: 'Inter', size: 10 }, boxWidth: 9, boxHeight: 9, usePointStyle: true, padding: 12 } },
      tooltip: tooltipStyle(),
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: muted, font: { family: 'Inter', size: 11 } }, border: { color: grid } },
      y: { stacked: true, grid: { color: grid, drawBorder: false }, ticks: { color: muted, font: { family: 'Inter', size: 11 }, callback: v => '€'+v+'k' }, border: { display: false } },
    },
  };
}
function tooltipStyle() {
  return {
    backgroundColor: cssVar('--color-text'), titleColor: cssVar('--color-bg'), bodyColor: cssVar('--color-bg'),
    padding: 10, cornerRadius: 8, displayColors: true, boxPadding: 4,
    titleFont: { family: 'Inter', weight: '600' }, bodyFont: { family: 'Inter' },
  };
}

function updateChartsTheme() {
  if (charts.growth) { Object.assign(charts.growth.options, baseLineOptions()); charts.growth.update('none'); }
  if (charts.volume) { Object.assign(charts.volume.options, baseBarOptions()); charts.volume.update('none'); }
  if (charts.donut) {
    charts.donut.options.plugins.tooltip = tooltipStyle();
    charts.donut.options.borderColor = cssVar('--color-surface-2');
    charts.donut.data.datasets[0].borderColor = cssVar('--color-surface-2');
    charts.donut.update('none');
  }
}

/* ============================================================
   SPENDING RULES (1B)
   ============================================================ */
const MCC = [
  { name: 'Grocery Stores', icon: 'shopping-cart', on: true,  state: 'change' },
  { name: 'Restaurants', icon: 'utensils', on: true, state: 'change' },
  { name: 'Gaming & Entertainment', icon: 'gamepad-2', on: true, state: 'change' },
  { name: 'Education & Books', icon: 'book-open', on: true, state: 'change' },
  { name: 'Clothing', icon: 'shirt', on: true, state: 'change' },
  { name: 'Transport', icon: 'bus', on: true, state: 'change' },
  { name: 'Alcohol & Tobacco', icon: 'wine', on: false, state: 'lock' },
  { name: 'Gambling', icon: 'dices', on: false, state: 'lock' },
  { name: 'Adult Content', icon: 'shield-off', on: false, state: 'lock' },
  { name: 'Online Marketplaces', icon: 'shopping-bag', on: true, state: 'approval' },
];
let mccBuilt = false;
function buildMcc() {
  if (mccBuilt) return; mccBuilt = true;
  const grid = $('#mccGrid');
  grid.innerHTML = MCC.map(c => {
    let meta = '';
    if (c.state === 'lock') meta = `<span class="mcc-meta"><i data-lucide="lock"></i> Locked by bank</span>`;
    else if (c.state === 'approval') meta = `<span class="chip warn" style="margin-top:4px;"><i data-lucide="alert-triangle" style="width:12px;height:12px;"></i> Requires approval</span>`;
    else meta = `<span class="mcc-meta"><i data-lucide="user-check"></i> Parent can change</span>`;
    const disabled = c.state === 'lock' ? 'disabled' : '';
    const checked = c.on ? 'checked' : '';
    const lockClass = c.state === 'lock' ? 'locked' : '';
    return `<div class="mcc-tile ${lockClass}">
      <div class="mcc-ico"><i data-lucide="${c.icon}"></i></div>
      <div class="mcc-body"><div class="mcc-name">${c.name}</div>${meta}</div>
      <label class="switch"><input type="checkbox" ${checked} ${disabled} aria-label="${c.name}"><span class="switch-track"><span class="switch-thumb"></span></span></label>
    </div>`;
  }).join('');
  lucide.createIcons({ nameAttr: 'data-lucide' });
}

// Limit sliders
$$('#view-rules input[type="range"]').forEach(slider => {
  slider.addEventListener('input', () => {
    const map = { daily: '#lim-daily', weekly: '#lim-weekly', single: '#lim-single', atm: '#lim-atm', count: '#lim-count' };
    const el = $(map[slider.dataset.limit]);
    el.textContent = slider.dataset.fmt === 'eur' ? '€' + slider.value : slider.value;
  });
});

// Save button
$('#saveRulesBtn').addEventListener('click', function () {
  if (this.classList.contains('saving') || this.classList.contains('saved')) return;
  const label = this.querySelector('.btn-label');
  const original = label.textContent;
  this.classList.add('saving');
  this.innerHTML = `<span class="spinner"></span><span class="btn-label">Saving…</span>`;
  setTimeout(() => {
    this.classList.remove('saving');
    this.classList.add('saved');
    this.innerHTML = `<i data-lucide="check"></i><span class="btn-label">Rules saved</span>`;
    lucide.createIcons({ nameAttr: 'data-lucide' });
    showToast(`Configuration saved to <b>${state.bankName}</b>`, 'ok');
    setTimeout(() => {
      this.classList.remove('saved');
      this.innerHTML = `<span class="btn-label">${original}</span>`;
    }, 2000);
  }, 1500);
});

/* ============================================================
   BRANDING (1C) - live preview bindings
   ============================================================ */
function applyAppName(name) {
  state.appName = name || ' ';
  const letter = (name.trim()[0] || 'J').toUpperCase();
  $('#previewAppName').textContent = name || ' ';
  $('#previewLogo').textContent = letter;
  $('#parentAppName').textContent = name || ' ';
  $('#parentLogo').textContent = letter;
}
function applyAccent(hex) {
  state.accent = hex;
  $('#colorHex').textContent = hex.toUpperCase();
  document.documentElement.style.setProperty('--app-accent', hex);
}
function applyCardStyle(style) {
  state.cardStyle = style;
  $('#previewCard').className = 'vcard style-' + style;
  $('#previewCard').style.aspectRatio = '1.7';
  $('#previewCard').style.marginBottom = '0';
  const pc = $('#parentCard');
  pc.className = 'vcard style-' + style + (state.blocked ? ' blocked' : '');
}

$('#appNameInput').addEventListener('input', e => applyAppName(e.target.value));
$('#bankNameInput').addEventListener('input', e => { setBankName(e.target.value || 'Northwind Bank'); });
$('#colorInput').addEventListener('input', e => applyAccent(e.target.value));
$$('#cardStyles .card-style').forEach(btn => btn.addEventListener('click', () => {
  $$('#cardStyles .card-style').forEach(b => b.setAttribute('aria-pressed', 'false'));
  btn.setAttribute('aria-pressed', 'true');
  applyCardStyle(btn.dataset.style);
}));

/* ============================================================
   PARENT PREVIEW (Section 2)
   ============================================================ */
function initParent() {
  setTimeout(() => { $('#budgetFill').style.width = '57%'; }, 150);
  if (initialized.parent) return;
  initialized.parent = true;
  buildDonut();
}

function buildDonut() {
  const ctx = $('#parentDonut').getContext('2d');
  charts.donut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Groceries','Gaming','Food','Transport','Other'],
      datasets: [{
        data: [35, 25, 20, 10, 10],
        backgroundColor: ['#0f766e','#F7A600','#2bb3a3','#2a9d8f','#a8a6a0'],
        borderColor: cssVar('--color-surface-2'), borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      animation: { duration: 900, easing: 'easeOutCubic' },
      plugins: { legend: { display: false }, tooltip: { ...tooltipStyle(), callbacks: { label: c => ` ${c.label}: ${c.raw}%` } } },
    },
  });
}

// Emergency block
$('#blockToggle').addEventListener('change', function () {
  state.blocked = this.checked;
  const card = $('#parentCard');
  const stateEl = $('#blockState');
  if (this.checked) {
    card.classList.add('blocked', 'shake');
    setTimeout(() => card.classList.remove('shake'), 600);
    stateEl.textContent = 'Card blocked';
    stateEl.classList.add('on');
    showToast('Card temporarily blocked. Kacper will be notified.', 'info');
  } else {
    card.classList.remove('blocked');
    stateEl.textContent = 'Card is active';
    stateEl.classList.remove('on');
    showToast('Card unblocked. Kacper can spend again.', 'ok');
  }
});

// Send pocket money
$('#sendMoneyBtn').addEventListener('click', function () {
  if (this.disabled) return;
  this.disabled = true;
  const label = this.querySelector('.btn-label');
  const original = label.textContent;

  const from = state.balance;
  state.balance = +(state.balance + 10).toFixed(2);
  animateValue($('#balanceDisplay'), state.balance, { decimals: 2, prefix: '€', duration: 800 });

  // flash +€10
  const flash = $('#flashPlus');
  flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');

  // in-phone notification
  $('#paNotifSub').textContent = `New balance: €${fmt(state.balance, 2)}`;
  const notif = $('#paNotif');
  notif.classList.add('show');
  setTimeout(() => notif.classList.remove('show'), 3200);

  this.innerHTML = `<i data-lucide="check"></i><span class="btn-label">Sent! €10 added</span>`;
  this.classList.add('saved');
  lucide.createIcons({ nameAttr: 'data-lucide' });
  setTimeout(() => {
    this.classList.remove('saved');
    this.innerHTML = `<i data-lucide="banknote"></i><span class="btn-label">${original}</span>`;
    lucide.createIcons({ nameAttr: 'data-lucide' });
    this.disabled = false;
  }, 2200);
});

// Child tabs (visual)
$$('#view-parent .child-tab').forEach(tab => tab.addEventListener('click', () => {
  $$('#view-parent .child-tab').forEach(t => { t.classList.remove('active'); t.querySelector('i')?.remove(); });
  tab.classList.add('active');
  if (!tab.querySelector('i')) { tab.insertAdjacentHTML('afterbegin', '<i data-lucide="check"></i>'); lucide.createIcons({ nameAttr: 'data-lucide' }); }
}));

/* ============================================================
   JUNIOR PREVIEW (Section 2B)
   ============================================================ */
const RING_CIRC = 157.08; // 2·π·25

function setRing(goalEl) {
  const saved = parseFloat(goalEl.dataset.saved);
  const target = parseFloat(goalEl.dataset.target);
  const pct = Math.min(saved / target, 1);
  const ring = goalEl.querySelector('.ring-prog');
  ring.style.transition = 'stroke-dashoffset .7s cubic-bezier(.3,.8,.3,1)';
  ring.style.strokeDashoffset = (RING_CIRC * (1 - pct)).toFixed(2);
  goalEl.querySelector('.g-saved').textContent = '€' + fmt(saved, saved % 1 ? 2 : 0);
  goalEl.querySelector('.j-goal-pct').textContent = Math.round(pct * 100) + '%';
}

function spawnConfetti(targetEl) {
  const colors = ['#2bb673', '#ff7a59', '#7c5cff', '#38b6ff', '#F7A600'];
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('span');
    p.className = 'confetti-piece';
    const ang = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 55;
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--cx', `calc(-50% + ${Math.cos(ang) * dist}px)`);
    p.style.setProperty('--cy', `calc(-50% + ${Math.sin(ang) * dist}px)`);
    p.style.setProperty('--cr', (Math.random() * 540 - 270) + 'deg');
    p.style.animationDelay = (Math.random() * 0.08) + 's';
    targetEl.appendChild(p);
    setTimeout(() => p.remove(), 950);
  }
}

function setJuniorBalance(v) {
  state.balance = +v.toFixed(2);
  const el = $('#jBalance');
  if (el) el.textContent = '€' + fmt(state.balance, 2);
  // keep the parent preview in sync
  const pb = $('#balanceDisplay');
  if (pb) pb.textContent = '€' + fmt(state.balance, 2);
}

function initJunior() {
  // sync card design with the rest of the product
  $('#juniorCard').className = 'vcard style-' + state.cardStyle;
  $('#juniorCard').style.aspectRatio = '1.9';
  $('#juniorCard').style.marginBottom = 'var(--space-3)';

  // animate balance + stats
  animateValue($('#jBalance'), state.balance, { decimals: 2, prefix: '€', duration: 800 });
  $$('#view-junior .j-stat .sv').forEach(el => animateValue(el, parseFloat(el.dataset.count), {
    decimals: parseInt(el.dataset.decimals || '0', 10), suffix: el.dataset.suffix || '',
  }));

  // animate goal rings + XP bar
  setTimeout(() => {
    $$('#view-junior .j-goal').forEach(setRing);
    $('#jXpFill').style.width = '64%';
  }, 150);

  if (initialized.junior) return;
  initialized.junior = true;

  // bottom-nav tab switching
  $$('#view-junior .j-nav-btn').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.jtab;
    $$('#view-junior .j-nav-btn').forEach(b => b.classList.toggle('active', b === btn));
    $$('#view-junior .j-tab').forEach(t => t.classList.toggle('active', t.dataset.jtab === id));
    if (id === 'goals') $$('#view-junior .j-goal').forEach(setRing);
    if (id === 'learn') { $('#jXpFill').style.width = '64%'; }
  }));

  // goals - add €5
  $$('#view-junior .j-goal').forEach(goalEl => {
    const btn = goalEl.querySelector('.j-add-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (goalEl.classList.contains('done')) return;
      const target = parseFloat(goalEl.dataset.target);
      let saved = parseFloat(goalEl.dataset.saved);
      const add = Math.min(5, target - saved);
      if (state.balance < add) { showToast('Not enough in your balance to save more 🐷', 'info'); return; }
      saved += add;
      goalEl.dataset.saved = saved;
      setJuniorBalance(state.balance - add);
      setRing(goalEl);
      const name = goalEl.querySelector('.j-goal-name').textContent;
      if (saved >= target) {
        goalEl.classList.add('done');
        goalEl.querySelector('.ring-prog').setAttribute('stroke', 'var(--j-mint)');
        btn.textContent = 'Done ✓';
        spawnConfetti(goalEl.querySelector('.j-ring'));
        showToast(`🎉 Goal reached: ${name}!`, 'ok');
      } else {
        showToast(`€${add} saved towards ${name} 🎯`, 'ok');
      }
    });
  });

  // tasks - mark done
  $$('#view-junior .j-task').forEach(taskEl => {
    const btn = taskEl.querySelector('.j-done-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const reward = parseFloat(taskEl.dataset.reward);
      setJuniorBalance(state.balance + reward);
      const earnedEl = $('#jEarned');
      const newEarned = parseFloat(earnedEl.textContent.replace('€', '')) + reward;
      earnedEl.textContent = '€' + fmt(newEarned, newEarned % 1 ? 2 : 0);
      const stateEl = taskEl.querySelector('.j-task-state');
      stateEl.className = 'j-task-state pending';
      stateEl.innerHTML = '<i data-lucide="clock"></i> Waiting for Anna to approve';
      btn.remove();
      spawnConfetti(taskEl);
      lucide.createIcons({ nameAttr: 'data-lucide' });
      showToast(`Nice work! €${fmt(reward, reward % 1 ? 2 : 0)} on the way 🙌`, 'ok');
    });
  });

  // learn - quiz
  $$('#jQuiz .j-quiz-opt').forEach(opt => opt.addEventListener('click', () => {
    if ($('#jQuiz').dataset.answered) return;
    $('#jQuiz').dataset.answered = '1';
    const correct = opt.dataset.correct === 'true';
    $$('#jQuiz .j-quiz-opt').forEach(o => {
      o.disabled = true;
      if (o.dataset.correct === 'true') o.classList.add('correct');
    });
    if (!correct) {
      opt.classList.remove('correct'); opt.classList.add('wrong');
      showToast('Almost! Saving some first is the smart move 💡', 'info');
      return;
    }
    // reward: grow XP + unlock badge
    $('#jXpFill').style.width = '82%';
    $('#jXpLabel').textContent = '410 / 500 XP';
    const badge = $('#jBadgeLocked');
    badge.classList.remove('locked');
    badge.classList.add('unlock-anim');
    showToast('🏅 New badge unlocked: Smart Saver!', 'ok');
  }));
}

/* ============================================================
   BOOT
   ============================================================ */
function boot() {
  lucide.createIcons({ nameAttr: 'data-lucide' });
  applyAccent('#0f766e');
  buildMcc();
  const start = (location.hash || '#overview').slice(1);
  const valid = ['overview','rules','branding','launch','parent','junior','why'];
  showSection(valid.includes(start) ? start : 'overview');
}
boot();
