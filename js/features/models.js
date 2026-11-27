// Modele 3D w sekcji #wspolpraca – zamiast obrazków w .work[data-model]
// Dane: json/modele.json. Biblioteka model-viewer ładowana lokalnie (CSP blokuje CDN)
// i dopiero gdy sekcja pojawi się na ekranie.
// Komputer: obrót myszką, przybliżanie kółkiem. Telefon: obrót palcem, przybliżanie przyciskami.
//
// Struktura tworzona dla każdego modelu:
//   .work-model-frame
//     ├─ .work-model-stage      (poświata + miękkie krawędzie; w środku <model-viewer>)
//     ├─ .work-model-loader     (spinner + „Wczytywanie modelu...”)
//     └─ .work-model-tools      (+ − ⟲, tylko urządzenia dotykowe)

const DATA_URL = 'json/modele.json';
const VIEWER_URL = '../vendor/model-viewer.min.js'; // względem js/features/

const figures = [...document.querySelectorAll('.work[data-model]')];
const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const items = [];

const UI = {
  loading: { pl: 'Wczytywanie modelu...', en: 'Loading model...' },
  zoomIn:  { pl: 'Przybliż', en: 'Zoom in' },
  zoomOut: { pl: 'Oddal', en: 'Zoom out' },
  reset:   { pl: 'Resetuj widok', en: 'Reset view' }
};

// Przybliżanie przyciskami: krok i zakres względem początkowego dystansu kamery
const ZOOM_STEP = 1.25;
const ZOOM_MIN = 0.4;   // najbliżej: 40% początkowego dystansu
const ZOOM_MAX = 1.8;   // najdalej: 180%

function lang() {
  return (document.documentElement.lang || 'pl').slice(0, 2).toLowerCase() === 'en' ? 'en' : 'pl';
}

function tr(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return v[lang()] ?? v.pl ?? '';
}

function updateTexts() {
  for (const it of items) {
    const title = tr(it.m.title);
    it.mv.setAttribute('alt', title);
    if (it.cap && title) it.cap.textContent = title;
    if (it.loaderText) it.loaderText.textContent = tr(UI.loading);
    for (const [b, key] of it.buttons) {
      b.title = tr(UI[key]);
      b.setAttribute('aria-label', tr(UI[key]));
    }
  }
}

/* ---------- Przezroczystość (alpha) modelu ----------
   "alpha" w modele.json może być:
     • liczbą 0–1                      → cały model (1 = pełne krycie)
     • obiektem { "NazwaMateriału": 0.3, ... } → tylko wskazane materiały
   Nazwy materiałów (porównanie bez rozróżniania wielkości liter) wypisuje konsola
   po wczytaniu modelu: „[modele] obiekt1 – materiały: [...]”.
   Uwaga: alfa działa na cały materiał – jeśli dwie części budynku mają ten sam
   materiał, trzeba je rozdzielić w programie 3D (Blender), by miały osobne. */
function applyAlpha(mv, frame, m) {
  const materials = (mv.model && mv.model.materials) || [];
  console.info(`[modele] ${m.id} – materiały:`, materials.map((x) => x.name));

  const alpha = m.alpha;
  if (alpha == null) return;

  const clamp = (v) => Math.min(1, Math.max(0, Number(v)));
  const perMaterial = typeof alpha === 'object';
  const map = {};
  if (perMaterial) {
    for (const [k, v] of Object.entries(alpha)) map[k.trim().toLowerCase()] = clamp(v);
  }

  let applied = 0;
  for (const mat of materials) {
    const a = perMaterial ? map[String(mat.name || '').trim().toLowerCase()] : clamp(alpha);
    if (a == null || !isFinite(a) || a >= 1) continue;
    try {
      if (typeof mat.setAlphaMode !== 'function') continue;
      mat.setAlphaMode('BLEND');
      const f = mat.pbrMetallicRoughness.baseColorFactor;
      mat.pbrMetallicRoughness.setBaseColorFactor([f[0], f[1], f[2], a]);
      applied++;
    } catch (e) {
      console.warn('[modele] alpha – błąd materiału', mat.name, e);
    }
  }

  if (perMaterial && !applied) {
    console.warn(`[modele] ${m.id}: żaden materiał nie pasuje do nazw w "alpha". Sprawdź listę wyżej.`);
  }
  // Zastępczo (stara wersja model-viewer bez setAlphaMode): CSS opacity – tylko dla alfy liczbowej
  if (!perMaterial && !applied) {
    const a = clamp(alpha);
    if (isFinite(a) && a < 1) frame.style.setProperty('--model-alpha', String(a));
  }
}

/* ---------- Zoom przyciskami (niezawodny, niezależny od mv.zoom()) ----------
   Trzymamy własny „docelowy” promień kamery. Dzięki temu szybkie, kolejne
   dotknięcia sumują się (getCameraOrbit() w trakcie animacji zwraca wartość
   pośrednią, co wcześniej powodowało gubienie kliknięć). */
function createZoomController(mv, m) {
  const st = { base: null, r: null };

  function zoom(dir) {
    const o = mv.getCameraOrbit();
    if (!o || !isFinite(o.radius)) return;
    if (st.base == null) { st.base = o.radius; st.r = o.radius; }
    const next = dir > 0 ? st.r / ZOOM_STEP : st.r * ZOOM_STEP;
    st.r = Math.min(st.base * ZOOM_MAX, Math.max(st.base * ZOOM_MIN, next));
    mv.cameraOrbit = `${o.theta}rad ${o.phi}rad ${st.r}m`;
  }

  function reset() {
    st.base = null; st.r = null;
    mv.cameraOrbit = m.cameraOrbit || 'auto auto auto';
    mv.cameraTarget = 'auto auto auto';
    mv.fieldOfView = 'auto';
  }

  return { zoom, reset };
}

// Przycisk obsługiwany przez pointer events (bez opóźnienia i gubienia „click”),
// z powtarzaniem przy przytrzymaniu. Klawiatura (Enter/Spacja) → zwykły click.
function bindPress(btn, fn) {
  let timer = null, interval = null;
  const stop = () => {
    clearTimeout(timer); clearInterval(interval);
    timer = interval = null;
  };

  btn.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();          // brak przewijania/zoomu strony i „ghost click”
    e.stopPropagation();
    try { btn.setPointerCapture(e.pointerId); } catch (_) {}
    fn();
    stop();
    timer = setTimeout(() => { interval = setInterval(fn, 110); }, 380);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave'].forEach(
    (ev) => btn.addEventListener(ev, stop)
  );
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.detail === 0) fn();    // aktywacja z klawiatury
  });
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

function attach(fig, m) {
  const fx = fig.querySelector('.fx') || fig;
  const img = fx.querySelector('img');
  const cap = fx.querySelector('figcaption');

  const frame = document.createElement('div');
  frame.className = 'work-model-frame is-loading';

  // Scena: poświata + model (maska krawędzi w CSS)
  const stage = document.createElement('div');
  stage.className = 'work-model-stage';

  const mv = document.createElement('model-viewer');
  mv.className = 'work-model';
  mv.setAttribute('src', m.src);
  mv.setAttribute('loading', 'eager');           // sekcja może być ukryta (strona po #hash)
  mv.setAttribute('camera-controls', '');
  mv.setAttribute('bounds', 'tight');
  mv.setAttribute('interaction-prompt', 'none');
  mv.setAttribute('shadow-intensity', String(m.shadow ?? 1));
  if (m.autoRotate !== false) mv.setAttribute('auto-rotate', '');
  if (m.cameraOrbit) mv.setAttribute('camera-orbit', m.cameraOrbit);

  // Ukrywa wbudowany pasek postępu – mamy własny loader
  const noBar = document.createElement('div');
  noBar.slot = 'progress-bar';
  mv.append(noBar);

  if (isTouch) {
    // Jeden palec obraca model / przewija stronę, przybliżanie tylko przyciskami
    mv.setAttribute('touch-action', 'pan-y');
    mv.setAttribute('disable-zoom', '');
  }

  stage.append(mv);
  frame.append(stage);

  // Loader
  const loader = document.createElement('div');
  loader.className = 'work-model-loader';
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-live', 'polite');
  const spinner = document.createElement('span');
  spinner.className = 'work-model-spinner';
  spinner.setAttribute('aria-hidden', 'true');
  const loaderText = document.createElement('span');
  loaderText.className = 'work-model-loader-text';
  loader.append(spinner, loaderText);
  frame.append(loader);

  // Przyciski (tylko dotyk) – aktywne dopiero po wczytaniu modelu
  const buttons = [];
  if (isTouch) {
    const ctrl = createZoomController(mv, m);
    const tools = document.createElement('div');
    tools.className = 'work-model-tools';
    const mk = (label, key, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.disabled = true;
      bindPress(b, fn);
      tools.append(b);
      buttons.push([b, key]);
    };
    mk('+', 'zoomIn', () => ctrl.zoom(1));
    mk('−', 'zoomOut', () => ctrl.zoom(-1));
    mk('⟲', 'reset', () => ctrl.reset());
    frame.append(tools);
  }

  const item = { m, mv, cap, buttons, loaderText, frame, img };
  item.fail = () => {
    frame.remove();
    if (img) img.hidden = false;
    fig.classList.remove('has-model');
    const i = items.indexOf(item);
    if (i >= 0) items.splice(i, 1);
  };

  mv.addEventListener('load', () => {
    applyAlpha(mv, frame, m);
    fig.classList.add('has-model');
    frame.classList.remove('is-loading');
    frame.classList.add('is-ready');
    buttons.forEach(([b]) => { b.disabled = false; });
    loader.setAttribute('aria-hidden', 'true');
    setTimeout(() => loader.remove(), 700);      // po zakończeniu płynnego zaniku
  });
  mv.addEventListener('error', (e) => {
    console.error('[modele] nie udało się wczytać', m.src, e.detail || e);
    item.fail();
  });

  // Obrazek zastępczy ukrywamy od razu – w tym miejscu jest loader (przy błędzie wraca)
  if (img) img.hidden = true;
  if (img) img.after(frame); else fx.prepend(frame);

  // Podpis z JSON-a (jeśli jest tytuł) – wyłączamy wtedy tłumaczenie z i18n
  if (cap && m.title) cap.removeAttribute('data-i18n');

  items.push(item);
}

// --- Szybsze wczytywanie -------------------------------------------------
let libPromise = null;
const prefetched = new Set();

function loadLib() {
  if (!libPromise) {
    libPromise = import(VIEWER_URL).catch((e) => {
      libPromise = null;
      throw e;
    });
  }
  return libPromise;
}

function prefetchModels(models) {
  for (const fig of figures) {
    const m = models.find((x) => x && x.id === fig.dataset.model && x.src);
    if (!m || prefetched.has(m.src)) continue;
    prefetched.add(m.src);
    fetch(m.src).catch(() => prefetched.delete(m.src));
  }
}

async function init() {
  if (!figures.length) return;

  let models;
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    models = Array.isArray(data.models) ? data.models : [];
  } catch (e) {
    console.error('modele.json:', e);
    return; // zostają obrazki
  }

  // Ramki z loaderem powstają od razu – użytkownik widzi spinner, a nie pustkę
  for (const fig of figures) {
    const m = models.find((x) => x && x.id === fig.dataset.model && x.src);
    if (m) attach(fig, m);
    else console.warn('[modele] brak w JSON modelu o id', fig.dataset.model);
  }
  updateTexts();

  const warmUp = () => { loadLib().catch(() => {}); prefetchModels(models); };

  document.querySelectorAll('a[href="#wspolpraca"]').forEach((a) => {
    a.addEventListener('pointerenter', warmUp, { once: true, passive: true });
    a.addEventListener('touchstart', warmUp, { once: true, passive: true });
    a.addEventListener('focus', warmUp, { once: true });
  });
  if (location.hash === '#wspolpraca') warmUp();

  // Biblioteka (element <model-viewer> „ożywa” po jej załadowaniu i wtedy startuje pobieranie .glb)
  let started = false;
  const io = new IntersectionObserver(async (entries) => {
    if (started || !entries.some((e) => e.isIntersecting)) return;
    started = true;
    io.disconnect();
    warmUp();
    try {
      await loadLib();
    } catch (e) {
      console.error('model-viewer: nie udało się wczytać biblioteki', e);
      [...items].forEach((it) => it.fail());   // wracają obrazki
    }
  }, { rootMargin: '600px' });
  figures.forEach((f) => io.observe(f));

  new MutationObserver(updateTexts)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
}

init();
