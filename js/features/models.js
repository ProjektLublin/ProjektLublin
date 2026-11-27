// Modele 3D w sekcji #wspolpraca – zamiast obrazków w .work[data-model]
// Dane: json/modele.json. Biblioteka model-viewer ładowana lokalnie (CSP blokuje CDN)
// i dopiero gdy sekcja pojawi się na ekranie.

const DATA_URL = 'json/modele.json';
const VIEWER_URL = '../vendor/model-viewer.min.js'; // względem js/features/

const figures = [...document.querySelectorAll('.work[data-model]')];
console.info('[modele] start, ramek z data-model:', figures.length);
const items = [];

function lang() {
  return (document.documentElement.lang || 'pl').slice(0, 2).toLowerCase() === 'en' ? 'en' : 'pl';
}

function tr(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return v[lang()] ?? v.pl ?? '';
}

function updateTexts() {
  for (const { m, mv, cap } of items) {
    const title = tr(m.title);
    mv.setAttribute('alt', title);
    if (cap && title) cap.textContent = title;
  }
}

function attach(fig, m) {
  const fx = fig.querySelector('.fx') || fig;
  const img = fx.querySelector('img');
  const cap = fx.querySelector('figcaption');

  const mv = document.createElement('model-viewer');
  mv.className = 'work-model';
  mv.setAttribute('src', m.src);
  mv.setAttribute('camera-controls', '');
  mv.setAttribute('touch-action', 'pan-y');      // na telefonie da się przewijać stronę
  mv.setAttribute('interaction-prompt', 'none');
  mv.setAttribute('shadow-intensity', String(m.shadow ?? 1));
  if (m.autoRotate !== false) mv.setAttribute('auto-rotate', '');
  if (m.cameraOrbit) mv.setAttribute('camera-orbit', m.cameraOrbit);

  // Obrazek znika dopiero, gdy model się wczyta; przy błędzie zostaje
  mv.addEventListener('load', () => {
    console.info('[modele] wczytano', m.src); if (img) img.hidden = true; fig.classList.add('has-model'); });
  mv.addEventListener('error', (e) => {
    console.error('[modele] nie udało się wczytać', m.src, e.detail || e);
    mv.remove(); if (img) img.hidden = false;
  });

  // Zwykłe kółko przewija stronę, Ctrl + kółko przybliża model
  mv.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
  }, { capture: true });

  // Przyciski: przybliż / oddal / reset
  const tools = document.createElement('div');
  tools.className = 'work-model-tools';
  const mk = (label, title, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
    tools.append(b);
  };
  const zoom = (n) => {
    if (typeof mv.zoom === 'function') { mv.zoom(n); return; }
    const o = mv.getCameraOrbit();
    mv.cameraOrbit = `${o.theta}rad ${o.phi}rad ${o.radius * (n > 0 ? 0.8 : 1.25)}m`;
  };
  mk('+', 'Przybliż', () => zoom(3));
  mk('−', 'Oddal', () => zoom(-3));
  mk('⟲', 'Resetuj widok', () => {
    mv.cameraOrbit = m.cameraOrbit || 'auto auto auto';
    mv.cameraTarget = 'auto auto auto';
    mv.fieldOfView = 'auto';
  });
  mv.append(tools); // wewnątrz model-viewera = nakładka na model

  if (img) img.after(mv); else fx.prepend(mv);

  // Podpis z JSON-a (jeśli jest tytuł) – wyłączamy wtedy tłumaczenie z i18n
  if (cap && m.title) cap.removeAttribute('data-i18n');

  items.push({ m, mv, cap });
}

async function init() {
  if (!figures.length) return;

  let models;
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    models = Array.isArray(data.models) ? data.models : [];
    console.info('[modele] modele.json OK, modeli:', models.length);
  } catch (e) {
    console.error('modele.json:', e);
    return; // zostają obrazki
  }

  const io = new IntersectionObserver(async (entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    try {
      await import(VIEWER_URL);
      console.info('[modele] biblioteka model-viewer OK');
    } catch (e) {
      console.error('model-viewer: nie udało się wczytać biblioteki', e);
      return; // zostają obrazki
    }
    for (const fig of figures) {
      const m = models.find((x) => x && x.id === fig.dataset.model && x.src);
      if (m) attach(fig, m);
      else console.warn('[modele] brak w JSON modelu o id', fig.dataset.model);
    }
    updateTexts();
  }, { rootMargin: '200px' });
  figures.forEach((f) => io.observe(f));

  new MutationObserver(updateTexts)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
}

init();
