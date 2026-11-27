// Podgląd modeli 3D (GLB) – dane wczytywane z json/modele.json
// model-viewer jest ładowany lokalnie (CSP blokuje CDN) i dopiero wtedy,
// gdy sekcja z modelami pojawi się na ekranie.

const DATA_URL = 'json/modele.json';
const VIEWER_URL = '../vendor/model-viewer.min.js'; // względem js/features/

const UI = {
  reset:   { pl: 'Resetuj widok', en: 'Reset view' },
  author:  { pl: 'Autor', en: 'Author' },
  error:   { pl: 'Nie udało się wczytać modelu.', en: 'Failed to load the model.' },
  empty:   { pl: 'Brak modeli do wyświetlenia.', en: 'No models to display.' },
  loadErr: { pl: 'Nie udało się wczytać listy modeli.', en: 'Failed to load the model list.' },
  hint:    { pl: 'Przeciągnij, aby obrócić. Kółko / dwa palce – zoom.', en: 'Drag to rotate. Wheel / pinch to zoom.' }
};

const root = document.getElementById('modelsList');
const cards = [];
let models = [];
let viewerPromise = null;

function lang() {
  const l = (document.documentElement.lang || 'pl').slice(0, 2).toLowerCase();
  return l === 'en' ? 'en' : 'pl';
}

function tr(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return v[lang()] ?? v.pl ?? '';
}

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

function loadViewer() {
  if (!viewerPromise) {
    viewerPromise = import(VIEWER_URL).catch((err) => {
      console.error('model-viewer: nie udało się wczytać biblioteki', err);
      viewerPromise = null;
      throw err;
    });
  }
  return viewerPromise;
}

function buildCard(m) {
  const card = el('figure', 'card model-card');

  const mv = document.createElement('model-viewer');
  mv.setAttribute('src', m.src);
  mv.setAttribute('camera-controls', '');
  mv.setAttribute('touch-action', 'pan-y');
  mv.setAttribute('interaction-prompt', 'auto');
  mv.setAttribute('loading', 'lazy');
  mv.setAttribute('shadow-intensity', String(m.shadow ?? 1));
  if (m.autoRotate !== false) mv.setAttribute('auto-rotate', '');
  if (m.cameraOrbit) mv.setAttribute('camera-orbit', m.cameraOrbit);
  if (m.poster) mv.setAttribute('poster', m.poster);

  const err = el('div', 'model-error');
  err.hidden = true;
  mv.addEventListener('error', () => { err.hidden = false; });

  const media = el('div', 'model-media');
  media.append(mv, err);

  const body = el('figcaption', 'body');
  const h3 = el('h3');
  const desc = el('p', 'model-desc');
  const meta = el('div', 'model-meta');
  const author = el('span', 'model-author');
  const reset = el('button', 'btn ghost model-reset');
  reset.type = 'button';
  reset.addEventListener('click', () => {
    mv.cameraOrbit = m.cameraOrbit || 'auto auto auto';
    mv.cameraTarget = 'auto auto auto';
    mv.fieldOfView = 'auto';
  });
  meta.append(author, reset);
  body.append(h3, desc, meta);
  card.append(media, body);

  const ref = { m, mv, h3, desc, author, reset, err };
  cards.push(ref);
  return card;
}

function updateTexts() {
  for (const c of cards) {
    c.h3.textContent = tr(c.m.title);
    c.desc.textContent = tr(c.m.description);
    c.desc.hidden = !c.desc.textContent;
    c.author.textContent = c.m.author ? `${tr(UI.author)}: ${c.m.author}` : '';
    c.reset.textContent = tr(UI.reset);
    c.err.textContent = tr(UI.error);
    c.mv.setAttribute('alt', tr(c.m.title));
  }
  const hint = document.getElementById('modelsHint');
  if (hint) hint.textContent = tr(UI.hint);
  const empty = root.querySelector('.models-empty');
  if (empty) empty.textContent = tr(empty.dataset.key === 'loadErr' ? UI.loadErr : UI.empty);
}

function showMessage(key) {
  const p = el('p', 'models-empty', tr(UI[key]));
  p.dataset.key = key;
  root.replaceChildren(p);
}

async function init() {
  if (!root) return;

  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    models = Array.isArray(data.models) ? data.models.filter((m) => m && m.src) : [];
  } catch (e) {
    console.error('modele.json:', e);
    showMessage('loadErr');
    return;
  }

  if (!models.length) { showMessage('empty'); return; }

  root.replaceChildren(...models.map(buildCard));
  updateTexts();

  // Biblioteka 3D dopiero, gdy sekcja jest widoczna
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      loadViewer().catch(() => {});
    }
  });
  io.observe(root);

  // Zmiana języka – aktualizacja tekstów bez przeładowania modeli
  new MutationObserver(updateTexts)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
}

init();
