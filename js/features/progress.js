/* =====================================================================
   features/progress.js – zakładka ROZWÓJ: render + animacje liczników i trasy
   Dane i sanityzacja: progress-data.js (json/progress.json)
   ===================================================================== */
import { $, $$, esc, fmt, pct, reducedMotion } from '../core/dom.js';
import { t, pick, currentLang, DEFAULT_LANG, onLangChange } from '../core/i18n.js';
import { onRoute } from '../core/router.js';
import { fetchProgress } from './progress-data.js';

const PROGRESS_COLORS = ['red', 'orange', 'green'];                         // kolejność rysowania (zielona na wierzchu)
const PROGRESS_STROKE = { red: '#ef2b2b', orange: '#ff7a1a', green: '#22c55e' };
const COUNT_MS = 1400;
let progressData = [], progressFailed = false;

/* ---------- Animacje: liczniki i linie trasy ---------- */
// odliczanie od 0 do wartości docelowej (ease-out)
function countTo(el, to, animate) {
  cancelAnimationFrame(el._raf);
  if (!animate || reducedMotion.matches || to <= 0) { el.textContent = to; return; }
  el.textContent = 0;
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / COUNT_MS);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}

function updateRoute(animate = true) {
  $$('.route-card').forEach(card => {
    PROGRESS_COLORS.forEach(color => {
      const fill = $(`.route-line.${color}`, card); if (!fill) return;
      const p = pct(card.dataset[`progress${color[0].toUpperCase()}${color.slice(1)}`]);
      const run = animate && !reducedMotion.matches;
      fill.style.transition = 'none';
      fill.style.strokeDashoffset = run ? 100 : 100 - p;
      if (!run) return;
      fill.getBoundingClientRect();
      requestAnimationFrame(() => {
        fill.style.transition = 'stroke-dashoffset 1.4s var(--ease)';
        fill.style.strokeDashoffset = 100 - p;
      });
    });
  });
}

// wywoływane przy wejściu na zakładkę #rozwoj – animacja powtarza się za każdym razem
function updateProgress(animate = true) {
  $$('.pg-count').forEach(el => countTo(el, +el.dataset.to || 0, animate));
  updateRoute(animate);
}

const isProgressVisible = () => !!$('#page-rozwoj')?.classList.contains('show');

/* ---------- Renderowanie ---------- */
const itemText = (it) => (currentLang !== DEFAULT_LANG && it[currentLang]) || it.pl;

const pointSvg = (p) => `<g class="route-point">${p.text
  ? `<rect x="${p.lx}" y="${p.ly}" width="${p.lw}" height="36" rx="18" fill="#050505"/><text x="${p.tx}" y="${p.ty}" textLength="${p.tl}" lengthAdjust="spacingAndGlyphs">${esc(p.text)}</text>`
  : ''}<circle cx="${p.x}" cy="${p.y}" r="12" fill="#000" stroke="#fff" stroke-width="5"/></g>`;

function progressLineHtml(ln, i) {
  const sfx = i ? `-${i}` : '';   // pierwsza linia zachowuje id: cDone, cTodo, hDone, hTodo
  const rt = ln.route, lg = ln.legend;

  const legend = [['green', 'completed'], ['orange', 'renovation'], ['red', 'streets']].map(([color, key]) =>
    `<div class="item"><span class="swatch ${color}"></span><span>${fmt(pick(lg, key) || t(`progress.legend.${key}`))}</span></div>`
  ).join('');

  const route = rt.image ? `<div class="card route-card" data-progress-red="${rt.progress.red}" data-progress-orange="${rt.progress.orange}" data-progress-green="${rt.progress.green}">
    <div class="route-stage">
      <img decoding="async" fetchpriority="low" src="${esc(rt.image)}" alt="${esc(pick(rt, 'imageAlt') || t('progress.routeAlt'))}" width="${rt.width}" height="${rt.height}">
      ${rt.path ? `<svg viewBox="0 0 ${rt.width} ${rt.height}" preserveAspectRatio="none" aria-hidden="true">
        ${PROGRESS_COLORS.map(c => `<path class="route-line ${c}" pathLength="100" fill="none" stroke="${PROGRESS_STROKE[c]}" stroke-width="5" stroke-linecap="butt" stroke-linejoin="round" d="${esc(rt.path)}"/>`).join('')}
        ${rt.points.map(pointSvg).join('')}
      </svg>` : ''}
    </div>
  </div>` : '';

  const items = (arr) => arr.map(it => `<li>${fmt(itemText(it))}</li>`).join('');

  return `<div class="progress-line">
    <div class="card progress-card">
      <div class="progress-top">
        <div class="line-tag">
          ${ln.number ? `<span class="line-num">${esc(ln.number)}</span>` : ''}
          <div><h2>${esc(pick(ln, 'name') || t('progress.line'))}</h2><small>${esc(pick(ln, 'completionLabel') || t('progress.completion'))}</small></div>
        </div>
      </div>
      <div class="progress-info">
        <span><span>${esc(t('progress.done'))}</span> <b class="pg-count" id="cDone${sfx}" data-to="${ln.done.length}">0</b></span>
        <span><span>${esc(t('progress.todo'))}</span> <b class="pg-count" id="cTodo${sfx}" data-to="${ln.todo.length}">0</b></span>
      </div>
      <div class="route-legend">${legend}</div>
    </div>
    ${route}
    <div class="tasks">
      <div class="card">
        <h3><svg class="icon ok"><use href="#i-check"/></svg><span>${esc(t('progress.doneHeading'))}</span> <span class="count pg-count" id="hDone${sfx}" data-to="${ln.done.length}">0</span></h3>
        <ul class="task-list done-list">${items(ln.done)}</ul>
      </div>
      <div class="card">
        <h3><svg class="icon no"><use href="#i-clock"/></svg><span>${esc(t('progress.todoHeading'))}</span> <span class="count pg-count" id="hTodo${sfx}" data-to="${ln.todo.length}">0</span></h3>
        <ul class="task-list todo-list">${items(ln.todo)}</ul>
      </div>
    </div>
  </div>`;
}

// animate = true tylko przy pierwszym wczytaniu na otwartej zakładce; po zmianie języka wartości od razu końcowe
function renderProgress(animate = false) {
  const box = $('#progressRoot'); if (!box) return;
  if (progressFailed) {
    const msg = t('progress.loadError');
    box.innerHTML = `<div class="mod-empty">${esc(msg === 'progress.loadError' ? t('mods.loadError') : msg)}</div>`;
    return;
  }
  box.innerHTML = progressData.map(progressLineHtml).join('');
  if (isProgressVisible()) updateProgress(animate);
}

export async function loadProgress() {
  try {
    progressData = await fetchProgress();
    progressFailed = false;
  } catch (err) {
    console.error('json/progress.json:', err);
    progressFailed = true;
  }
  renderProgress(true);
}

export function initProgress() {
  onLangChange(() => renderProgress(false));                          // po zmianie języka bez ponownej animacji
  onRoute((page) => { if (page.id === 'page-rozwoj') updateProgress(); });
}
