// Modele 3D w sekcji #wspolpraca – zamiast obrazków w .work[data-model]
// Dane: json/modele.json. Biblioteka model-viewer ładowana lokalnie (CSP blokuje CDN)
// i dopiero gdy sekcja pojawi się na ekranie.
// Komputer: obrót myszką, przybliżanie kółkiem. Telefon: obrót palcem, przybliżanie przyciskami.

const DATA_URL = 'json/modele.json';
const VIEWER_URL = '../vendor/model-viewer.min.js'; // względem js/features/

const figures = [...document.querySelectorAll('.work[data-model]')];
const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const items = [];

const UI = {
  zoomIn:  { pl: 'Przybliż', en: 'Zoom in' },
  zoomOut: { pl: 'Oddal', en: 'Zoom out' },
  reset:   { pl: 'Resetuj widok', en: 'Reset view' }
};

function lang() {
  return (document.documentElement.lang || 'pl').slice(0, 2).toLowerCase() === 'en' ? 'en' : 'pl';
}

function tr(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return v[lang()] ?? v.pl ?? '';
}

function updateTexts() {
  for (const { m, mv, cap, buttons } of items) {
    const title = tr(m.title);
    mv.setAttribute('alt', title);
    if (cap && title) cap.textContent = title;
    for (const [b, key] of buttons) {
      b.title = tr(UI[key]);
      b.setAttribute('aria-label', tr(UI[key]));
    }
  }
}

function zoom(mv, dir) {
  if (typeof mv.zoom === 'function') { mv.zoom(dir * 3); return; }
  const o = mv.getCameraOrbit();
  mv.cameraOrbit = `${o.theta}rad ${o.phi}rad ${o.radius * (dir > 0 ? 0.8 : 1.25)}m`;
}

function attach(fig, m) {
  const fx = fig.querySelector('.fx') || fig;
  const img = fx.querySelector('img');
  const cap = fx.querySelector('figcaption');

  // Ramka: model + rozmyte krawędzie
  const frame = document.createElement('div');
  frame.className = 'work-model-frame';

  const mv = document.createElement('model-viewer');
  mv.className = 'work-model';
  mv.setAttribute('src', m.src);
  mv.setAttribute('camera-controls', '');
  mv.setAttribute('bounds', 'tight');            // model ciaśniej wypełnia ramkę
  mv.setAttribute('interaction-prompt', 'none');
  mv.setAttribute('shadow-intensity', String(m.shadow ?? 1));
  if (m.autoRotate !== false) mv.setAttribute('auto-rotate', '');
  if (m.cameraOrbit) mv.setAttribute('camera-orbit', m.cameraOrbit);

  if (isTouch) {
    // Telefon: jeden palec obraca / przewija stronę, przybliżanie tylko przyciskami
    mv.setAttribute('touch-action', 'pan-y');
    mv.setAttribute('disable-zoom', '');
  }

  const edge = document.createElement('div');
  edge.className = 'work-model-edge';
  edge.setAttribute('aria-hidden', 'true');

  frame.append(mv, edge);

  // Przyciski tylko na telefonie
  const buttons = [];
  if (isTouch) {
    const tools = document.createElement('div');
    tools.className = 'work-model-tools';
    const mk = (label, key, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      tools.append(b);
      buttons.push([b, key]);
    };
    mk('+', 'zoomIn', () => zoom(mv, 1));
    mk('−', 'zoomOut', () => zoom(mv, -1));
    mk('⟲', 'reset', () => {
      mv.cameraOrbit = m.cameraOrbit || 'auto auto auto';
      mv.cameraTarget = 'auto auto auto';
      mv.fieldOfView = 'auto';
    });
    frame.append(tools);
  }

  // Obrazek znika dopiero, gdy model się wczyta; przy błędzie zostaje
  mv.addEventListener('load', () => {
    if (img) img.hidden = true;
    fig.classList.add('has-model');
  });
  mv.addEventListener('error', (e) => {
    console.error('[modele] nie udało się wczytać', m.src, e.detail || e);
    frame.remove();
    if (img) img.hidden = false;
  });

  if (img) img.after(frame); else fx.prepend(frame);

  // Podpis z JSON-a (jeśli jest tytuł) – wyłączamy wtedy tłumaczenie z i18n
  if (cap && m.title) cap.removeAttribute('data-i18n');

  items.push({ m, mv, cap, buttons });
}

async function init() {
  if (!figures.length) return;

  let models;
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    models = Array.isArray(data.models) ? data.models : [];
  } catch (e) {
    console.error('modele.json:', e);
    return; // zostają obrazki
  }

  const io = new IntersectionObserver(async (entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    try {
      await import(VIEWER_URL);
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
