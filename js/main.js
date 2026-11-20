/* =====================================================================
   Projekt Lublin – main.js
   ===================================================================== */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;

  /* =====================================================================
     i18n – pliki json/pl.json i json/en.json
     Statyczny HTML: data-i18n="sekcja.klucz"  |  data-i18n-attr="atrybut:sekcja.klucz;atrybut2:klucz2"
     Dynamiczny JS:  t('sekcja.klucz', { param })  |  tn('klucz.liczbaMnoga', n)
     Dane z JSON-ów (json/posts.json, json/mods.json, json/progress.json): pole *_en, a gdy go brak – polski oryginał
     ===================================================================== */
  const LANGS = ['pl', 'en'];
  const DEFAULT_LANG = 'pl';
  const LANG_KEY = 'pl-lang';
  const FLAGS = { pl: '#i-flag-pl', en: '#i-flag-gb' };   // przycisk pokazuje flagę języka, NA KTÓRY przełączy
  const bundles = {};      // lang -> wczytany JSON
  const loading = {};      // lang -> Promise (jedno żądanie na język)
  let currentLang = DEFAULT_LANG;
  let langSeq = 0;         // ignoruje spóźnione odpowiedzi przy szybkim klikaniu

  function loadLanguage(lang) {
    if (!loading[lang]) {
      loading[lang] = fetch(`json/${lang}.json`, { cache: 'no-cache', credentials: 'omit' })
        .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(data => (bundles[lang] = data))
        .catch(err => { console.error(`json/${lang}.json:`, err); delete loading[lang]; return null; });
    }
    return loading[lang];
  }

  const lookup = (bundle, key) => key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), bundle);
  // bieżący język -> PL -> (w t/tn) sam klucz
  const resolve = (key) => lookup(bundles[currentLang], key) ?? lookup(bundles[DEFAULT_LANG], key);
  const fill = (str, params) => str.replace(/\{(\w+)\}/g, (m, k) => (params && params[k] != null ? params[k] : m));

  function t(key, params) {
    const v = resolve(key);
    return typeof v === 'string' ? fill(v, params) : key;
  }

  // liczba mnoga według reguł języka (PL: one/few/many/other, EN: one/other); {n} = liczba
  function tn(key, n, params) {
    const forms = resolve(key);
    if (!forms || typeof forms !== 'object') return key;
    const form = forms[new Intl.PluralRules(currentLang).select(n)] ?? forms.other;
    return typeof form === 'string' ? fill(form, { n, ...params }) : key;
  }

  // pole z danych w bieżącym języku (title_en, text_en…) albo polski oryginał
  const pick = (obj, field) => (currentLang !== DEFAULT_LANG && obj[`${field}_${currentLang}`]) || obj[field];

  function applyTranslations(scope = document) {
    $$('[data-i18n]', scope).forEach(el => { el.textContent = t(el.dataset.i18n, el.dataset); });
    $$('[data-i18n-attr]', scope).forEach(el => {
      el.dataset.i18nAttr.split(';').forEach(pair => {
        const i = pair.indexOf(':');
        if (i > 0) el.setAttribute(pair.slice(0, i).trim(), t(pair.slice(i + 1).trim(), el.dataset));
      });
    });
  }

  // odświeża treści generowane w JS: wpisy, zakładka Rozwój, filtry, lista modów, otwarte okno moda
  function renderDynamic() {
    renderPosts();
    renderProgress(false);   // po zmianie języka bez ponownej animacji liczników i trasy
    if (modsFailed) renderModsPage();
    else if (modsData.mods.length) {
      buildFilters();
      applyModsFilter(true);
      const mod = openModId && modsData.mods.find(m => m.id === openModId);
      if (mod) {
        const st = modalBody.scrollTop;
        renderModal(mod);
        modalBody.scrollTop = st;
      }
    }
  }

  async function setLang(lang) {
    if (!LANGS.includes(lang)) lang = DEFAULT_LANG;
    const seq = ++langSeq;
    const [bundle] = await Promise.all([loadLanguage(lang), loadLanguage(DEFAULT_LANG)]);
    if (seq !== langSeq || !bundle) return;   // nowsze kliknięcie wygrało / brak pliku -> zostaje poprzedni język

    currentLang = lang;
    root.lang = lang;
    document.title = t('meta.title');
    $('meta[name="description"]')?.setAttribute('content', t('meta.description'));

    const next = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
    $$('.lang-label').forEach(el => { el.textContent = next.toUpperCase(); });
    $$('.lang-flag use').forEach(u => u.setAttribute('href', FLAGS[next]));

    applyTranslations();
    renderDynamic();
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  }

  // desktop (#langBtn w menu „more") ORAZ mobile ([data-act="lang"] w .nav-extra hamburgera)
  const toggleLang = () => setLang(LANGS[(LANGS.indexOf(currentLang) + 1) % LANGS.length]);
  $$('#langBtn, [data-act="lang"]').forEach(b => b.addEventListener('click', toggleLang));

  /* ---------- Motyw (ciemny / jasny) ---------- */
  try { const saved = localStorage.getItem('pl-theme'); if (saved === 'dark' || saved === 'light') root.dataset.theme = saved; } catch (e) {}
  const toggleTheme = () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('pl-theme', root.dataset.theme); } catch (e) {}
  };
  $$('#themeBtn, [data-act="theme"]').forEach(b => b.addEventListener('click', toggleTheme));

  /* ---------- Jedno menu: Facebook + język + motyw ---------- */
  const moreBtn = $('#moreBtn'), morePanel = $('#morePanel');
  const setMore = (open) => {
    morePanel.classList.toggle('open', open);
    moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setMore(!morePanel.classList.contains('open'));
  });
  morePanel.addEventListener('click', (e) => { if (e.target.closest('.more-item')) setMore(false); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#moreMenu')) setMore(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMore(false); });

  /* ---------- Menu mobilne (hamburger) ---------- */
  const nav = $('#nav'), menuBtn = $('#menuBtn');
  menuBtn.addEventListener('click', () => {
    nav.classList.toggle('open');
    menuBtn.querySelector('use').setAttribute('href', nav.classList.contains('open') ? '#i-x' : '#i-menu');
  });

  /* ---------- Routing (strony po #hash) ---------- */
  const pages = $$('.page');
  function route() {
    const id = (location.hash || '#glowna').slice(1);
    const target = pages.find(p => p.id === 'page-' + id) || $('#page-glowna');
    pages.forEach(p => p.classList.toggle('show', p === target));
    $$('.nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + target.id.slice(5)));
    nav.classList.remove('open');
    menuBtn.querySelector('use').setAttribute('href', '#i-menu');
    setMore(false);
    closeMod();
    window.scrollTo({ top: 0 });
    if (target.id === 'page-rozwoj') updateProgress();
  }
  window.addEventListener('hashchange', route);

  /* ---------- Lightbox (galeria) ---------- */
  const lb = $('#lightbox');
  $$('.gallery .card').forEach(c => c.addEventListener('click', () => {
    const img = c.querySelector('.media img'); if (!img) return;
    lb.querySelector('img').src = img.src; lb.classList.add('open');
  }));
  lb.addEventListener('click', () => lb.classList.remove('open'));

  /* =====================================================================
     MODY – lista, wyszukiwarka, filtry, okno z historią wersji
     Dane: json/mods.json  (każdy mod ma tablicę "versions")
     ===================================================================== */
  const MODS_PER_PAGE = 4;
  let modsData = { categories: [], mods: [] };
  let modsFiltered = [];
  let modsPage = 1;
  const catById = {};      // id kategorii -> { id, label, label_en }
  let modsFailed = false;

  const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // **pogrubienie** i ~~przekreślenie~~ w opisach z JSON-ów (reszta jest escapowana)
  const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/~~(.+?)~~/g, '<s>$1</s>');

  const toTime = (s) => {
    if (!s) return 0;
    s = String(s).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
    return 0;
  };

  const fmtDate = (s) => {
    const t = toTime(s);
    if (!t) return '—';
    const d = new Date(t);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
  };

  const catName = (id) => (catById[id] ? pick(catById[id], 'label') : id);

  function buildFilters() {
    const box = $('#modFilters');
    if (!box) return;
    const checked = new Set($$('#modFilters input:checked').map(i => i.value));   // zachowaj zaznaczenie przy zmianie języka
    box.innerHTML = '';
    modsData.categories.forEach(c => {
      const lab = document.createElement('label');
      lab.innerHTML = `<input type="checkbox" value="${esc(c.id)}"><span>${esc(pick(c, 'label'))}</span>`;
      const input = lab.querySelector('input');
      input.checked = checked.has(c.id);
      lab.classList.toggle('active', input.checked);
      lab.addEventListener('change', () => {
        lab.classList.toggle('active', input.checked);
        applyModsFilter();
      });
      box.append(lab);
    });
  }

  /* ---------- Karuzela: lista zdjęć/wideo -> przewijany slider ---------- */
  const slideHtml = (m) => m.type === 'video'
    ? `<video src="${esc(m.src)}" preload="metadata" autoplay loop muted playsinline></video>`
    : `<img decoding="async" draggable="false" src="${esc(m.src)}" alt="${esc(m.alt || '')}">`;

  function mediaHtml(list) {
    const items = Array.isArray(list) ? list : (list ? [list] : []);
    if (!items.length) return `<div class="ph"><svg class="icon"><use href="#i-image"/></svg>${esc(t('common.noPreview'))}</div>`;
    const n = items.length;
    const slides = items.map(m => `<div class="car-slide">${slideHtml(m)}</div>`).join('');
    if (n === 1) return `<div class="car single"><div class="car-track">${slides}</div></div>`;
    const dots = items.map((_, i) => `<button type="button" class="car-dot${i ? '' : ' on'}" data-i="${i}" aria-label="${esc(t('common.photoNumber', { n: i + 1 }))}"></button>`).join('');
    return `<div class="car"><div class="car-track">${slides}</div>
      <button type="button" class="car-btn prev" aria-label="${esc(t('common.prevSlide'))}"><svg class="icon"><use href="#i-left"/></svg></button>
      <button type="button" class="car-btn next" aria-label="${esc(t('common.nextSlide'))}"><svg class="icon"><use href="#i-right"/></svg></button>
      <span class="car-count">1 / ${n}</span><div class="car-dots">${dots}</div></div>`;
  }

  const verDesc = (v) => fmt(pick(v, 'description'));
  const dlLabel = (d) => d.label ? fmt(pick(d, 'label')) : esc(t('common.download'));
  const tagsHtml = (mod) => (mod.categories || []).map(id =>
    `<span class="tag-chip">${esc(catName(id))}</span>`
  ).join('');

  function renderModsPage() {
    const list = $('#modsList');
    const pager = $('#modsPager');
    const countEl = $('#modCount');
    if (!list) return;

    if (modsFailed) {
      list.innerHTML = `<div class="mod-empty">${esc(t('mods.loadError'))}</div>`;
      if (pager) pager.innerHTML = '';
      if (countEl) countEl.textContent = '';
      return;
    }

    const total = modsFiltered.length;
    const pages = Math.max(1, Math.ceil(total / MODS_PER_PAGE));
    modsPage = Math.min(Math.max(1, modsPage), pages);
    const start = (modsPage - 1) * MODS_PER_PAGE;
    const slice = modsFiltered.slice(start, start + MODS_PER_PAGE);

    if (countEl) {
      countEl.textContent = total
        ? tn('mods.shown', total, { shown: slice.length, total })
        : t('mods.noResults');
    }

    if (!slice.length) {
      list.innerHTML = `<div class="mod-empty">${esc(t('mods.empty'))}</div>`;
      if (pager) pager.innerHTML = '';
      return;
    }

    // karta na liście = NAJNOWSZA wersja moda
    list.innerHTML = slice.map(mod => {
      const v = mod.versions[0];
      const n = mod.versions.length;
      const verLabel = pick(v, 'version') ? ` · ${esc(pick(v, 'version'))}` : '';
      const countChip = n > 1 ? `<span class="tag-chip">${esc(tn('common.versions', n))}</span>` : '';
      return `<article class="card mod" data-id="${esc(mod.id)}" tabindex="0" role="button" aria-haspopup="dialog">
        <div class="media">${mediaHtml(v.media)}</div>
        <div class="body">
          <div class="date-meta"><svg class="icon"><use href="#i-cal"/></svg>${esc(fmtDate(v.date))}${verLabel}</div>
          <h3>${esc(pick(mod, 'title'))}</h3>
          <p>${verDesc(v)}</p>
          <div class="tags">${tagsHtml(mod)}${countChip}</div>
          <div class="row">
            <div class="meta"><svg class="icon"><use href="#i-user"/></svg>${esc(t('common.author'))} ${esc(mod.author)}</div>
            <span class="btn ghost mod-open"><svg class="icon"><use href="#i-download"/></svg>${esc(t('common.download'))}</span>
          </div>
        </div>
      </article>`;
    }).join('');

    if (pager) pageButtons(pager, pages, modsPage, (n) => {
      modsPage = n;
      renderModsPage();
      list.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function applyModsFilter(keepPage = false) {
    const q = ($('#modSearch')?.value || '').trim().toLowerCase();
    const checked = $$('#modFilters input:checked').map(i => i.value);
    const sort = $('#modSort')?.value || 'date-desc';

    modsFiltered = modsData.mods.filter(m => {
      if (checked.length) {
        const cats = m.categories || [];
        if (!checked.some(c => cats.includes(c))) return false;
      }
      if (!q) return true;
      const hay = [
        m.title, m.title_en, m.author,
        ...m.versions.flatMap(v => [v.version, v.version_en, v.description, v.description_en]),
        ...(m.categories || []).flatMap(c => [catById[c]?.label || c, catById[c]?.label_en])
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });

    const byTitle = (a, b) => (pick(a, 'title') || '').localeCompare(pick(b, 'title') || '', currentLang);
    const byIndex = (a, b) => a._i - b._i;

    modsFiltered.sort((a, b) => {
      switch (sort) {
        case 'date-desc':  return (toTime(b.date) - toTime(a.date)) || byIndex(a, b);
        case 'date-asc':   return (toTime(a.date) - toTime(b.date)) || byIndex(a, b);
        case 'title-asc':  return byTitle(a, b) || byIndex(a, b);
        case 'title-desc': return byTitle(b, a) || byIndex(a, b);
        case 'author-asc': return (a.author || '').localeCompare(b.author || '', currentLang) || byIndex(a, b);
        default:           return byIndex(a, b);
      }
    });

    if (!keepPage) modsPage = 1;
    renderModsPage();
  }

  /* ---------- Okno (modal) moda: najnowsza wersja na górze, niżej starsze ---------- */
  const modal = $('#modModal');
  const modalBody = $('#modModalBody');
  let openModId = null, lastFocus = null;

  // jeden blok wersji: zdjęcia (karuzela), nazwa wersji, data, opis, pliki do pobrania
  function versionBlock(v, i, total) {
    const dls = v.downloads.map(d => `<a class="mm-item" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer">
        <svg class="icon"><use href="#i-download"/></svg>
        <span class="lbl">${dlLabel(d)}</span>
      </a>`).join('');
    const badge = i === 0
      ? (total > 1 ? `<span class="tag-chip new">${esc(t('common.latest'))}</span>` : '')
      : `<span class="tag-chip">${esc(t('common.archived'))}</span>`;
    return `<section class="mm-ver${i === 0 ? ' latest' : ''}">
      <div class="media">${mediaHtml(v.media)}</div>
      <div class="mm-ver-body">
        <div class="mm-ver-top">
          ${pick(v, 'version') ? `<h4>${esc(pick(v, 'version'))}</h4>` : ''}
          ${badge}
        </div>
        <div class="date-meta"><svg class="icon"><use href="#i-cal"/></svg>${esc(fmtDate(v.date))}</div>
        <p>${verDesc(v)}</p>
        <div class="mm-files">
          <div class="mm-label">${esc(t('mods.filesToDownload'))}</div>
          ${dls ? `<div class="mm-list">${dls}</div>` : `<p class="mm-empty">${esc(t('mods.noFiles'))}</p>`}
        </div>
      </div>
    </section>`;
  }

  function renderModal(mod) {
    const n = mod.versions.length;
    const latest = versionBlock(mod.versions[0], 0, n);
    const older = mod.versions.slice(1).map((v, k) => versionBlock(v, k + 1, n)).join('');
    modalBody.innerHTML = `<div class="mm-content">
      <div class="mm-head">
        <h3 id="modModalTitle">${esc(pick(mod, 'title'))}</h3>
        <div class="meta"><svg class="icon"><use href="#i-user"/></svg>${esc(t('common.author'))} ${esc(mod.author)}</div>
        <div class="tags">${tagsHtml(mod)}</div>
      </div>
      ${latest}
      ${n > 1 ? `<h4 class="mm-sep">${esc(t('mods.previousVersions'))}</h4>${older}` : ''}
    </div>`;
  }

  function openMod(id) {
    const mod = modsData.mods.find(m => m.id === id);
    if (!mod) return;
    lastFocus = document.activeElement;
    openModId = id;
    renderModal(mod);
    modal.classList.add('open');
    document.body.classList.add('modal-open');
    modalBody.scrollTop = 0;
    $('.mod-modal-close', modal)?.focus();
  }

  function closeMod() {
    if (!modal || !modal.classList.contains('open')) return;
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
    openModId = null;
    modalBody.innerHTML = '';
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
    lastFocus = null;
  }

  modal.addEventListener('click', (e) => { if (e.target === modal) closeMod(); });
  $('.mod-modal-close', modal).addEventListener('click', closeMod);
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeMod(); lb.classList.remove('open'); }
  });

  const modsListEl = $('#modsList');
  modsListEl?.addEventListener('click', (e) => {
    if (e.target.closest('.car-btn, .car-dot, .car-count')) return;
    const c = e.target.closest('.mod');
    if (c) openMod(c.dataset.id);
  });
  modsListEl?.addEventListener('keydown', (e) => {
    if (e.target.closest('.car-btn, .car-dot')) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const c = e.target.closest('.mod');
    if (c) { e.preventDefault(); openMod(c.dataset.id); }
  });

  /* ---------- Wczytywanie i czyszczenie danych z json/mods.json ---------- */
  let validCats = new Set();
  const str = (v, max) => (typeof v === 'string' ? v : '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max);
  const safeUrl = (u) => {
    try { const x = new URL(String(u), location.href); return x.protocol === 'https:' ? x.href : ''; }
    catch (e) { return ''; }
  };
  const safeMedia = (u) => {
    u = String(u || '').trim();
    if (u.length > 200 || u.includes('..') || u.includes(':') || u.startsWith('/') || u.startsWith('\\')) return '';
    return /^[\w\-./ ()]+\.(png|jpe?g|webp|gif|mp4|webm)$/i.test(u) ? u : '';
  };
  const sanitizeCats = (arr) => (Array.isArray(arr) ? arr : []).slice(0, 30)
    .map(c => c && typeof c === 'object' ? { id: str(c.id, 32), label: str(c.label, 60), label_en: str(c.label_en, 60) } : null)
    .filter(c => c && /^[a-z0-9_-]{1,32}$/i.test(c.id) && c.label);

  // media: pojedynczy obiekt, tablica obiektów lub tablica ścieżek ("image/a.png")
  const sanitizeMedia = (mt) => {
    const arr = Array.isArray(mt) ? mt : (mt ? [mt] : []);
    return arr.slice(0, 40).map(x => {
      if (typeof x === 'string') x = { src: x };
      if (!x || typeof x !== 'object') return null;
      const src = safeMedia(x.src);
      if (!src) return null;
      return { type: (x.type === 'video' || /\.(mp4|webm)$/i.test(src)) ? 'video' : 'image', src, alt: str(x.alt, 160) };
    }).filter(Boolean);
  };
  const sanitizeDl = (d) => d && typeof d === 'object'
    ? { label: str(d.label, 80), label_en: str(d.label_en, 80), url: safeUrl(d.url), date: str(d.date, 10) }
    : null;
  const sanitizeVersion = (v, i) => {
    if (!v || typeof v !== 'object') return null;
    const downloads = (Array.isArray(v.downloads) ? v.downloads : []).slice(0, 30)
      .map(sanitizeDl).filter(d => d && d.url);
    return {
      _i: i,
      version: str(v.version, 60),
      version_en: str(v.version_en, 60),
      date: str(v.date, 10) || downloads.map(d => d.date).find(Boolean) || '',
      description: str(v.description, 2000),
      description_en: str(v.description_en, 2000),
      media: sanitizeMedia(v.media ?? v.images),
      downloads
    };
  };

  const sanitizeMod = (m) => {
    if (!m || typeof m !== 'object') return null;
    const id = str(m.id, 80), title = str(m.title, 120);
    if (!id || !title) return null;

    // wartości zapasowe z poziomu moda (gdy wersja nie ma własnego zdjęcia/opisu/daty)
    const baseMedia = sanitizeMedia(m.media ?? m.images);
    const baseDate = str(m.date, 10);
    const baseDesc = str(m.description, 2000);
    const baseDescEn = str(m.description_en, 2000);

    // nowy format: "versions": [...]  |  stary format (jedna wersja na poziomie moda) nadal działa
    const raw = (Array.isArray(m.versions) && m.versions.length)
      ? m.versions.slice(0, 50)
      : [{ version: m.version, version_en: m.version_en, date: m.date, description: m.description, description_en: m.description_en, media: m.media ?? m.images, downloads: m.downloads }];

    let versions = raw.map(sanitizeVersion).filter(Boolean).map(v => ({
      ...v,
      date: v.date || baseDate,
      description: v.description || baseDesc,
      description_en: v.description_en || baseDescEn,
      media: (v.media && v.media.length) ? v.media : baseMedia
    }));
    if (!versions.length) return null;

    // najnowsza wersja pierwsza; przy tej samej dacie decyduje kolejność w JSON
    versions.sort((a, b) => (toTime(b.date) - toTime(a.date)) || (a._i - b._i));

    return {
      id, title, title_en: str(m.title_en, 120),
      author: str(m.author, 80),
      date: versions[0].date,
      categories: (Array.isArray(m.categories) ? m.categories : []).map(c => str(c, 32)).filter(c => validCats.has(c)).slice(0, 6),
      versions
    };
  };

  async function loadMods() {
    try {
      const res = await fetch('json/mods.json', { cache: 'no-cache', credentials: 'omit' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data || !Array.isArray(data.mods)) throw new Error('Invalid JSON');
      const cats = sanitizeCats(data.categories);
      validCats = new Set(cats.map(c => c.id));
      cats.forEach(c => { catById[c.id] = c; });
      modsData = {
        categories: cats,
        mods: data.mods.slice(0, 500).map(sanitizeMod).filter(Boolean).map((m, i) => ({ ...m, _i: i }))
      };
      buildFilters();
      applyModsFilter();
    } catch (err) {
      console.error('json/mods.json:', err);
      modsFailed = true;
      renderModsPage();
    }
  }

  $('#modSearch')?.addEventListener('input', () => applyModsFilter());
  $('#modSort')?.addEventListener('change', () => applyModsFilter());

  /* ---------- Karuzela zdjęć (strzałki, kropki, przeciąganie, swipe) ---------- */
  const carIdx = (tr) => Math.round(tr.scrollLeft / (tr.clientWidth || 1));
  function carGo(car, i) {
    const tr = car.querySelector('.car-track'), n = tr.children.length;
    tr.scrollTo({ left: ((i + n) % n) * tr.clientWidth, behavior: 'smooth' });
  }
  function carSync(tr) {
    const car = tr.parentElement, i = carIdx(tr);
    car.querySelectorAll('.car-dot').forEach((d, k) => d.classList.toggle('on', k === i));
    const c = car.querySelector('.car-count');
    if (c) c.textContent = `${i + 1} / ${tr.children.length}`;
  }
  document.addEventListener('scroll', (e) => {
    const t = e.target;
    if (t.classList && t.classList.contains('car-track')) requestAnimationFrame(() => carSync(t));
  }, true);
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.car-btn, .car-dot'); if (!b) return;
    const car = b.closest('.car'), tr = car.querySelector('.car-track');
    if (b.classList.contains('car-dot')) carGo(car, +b.dataset.i);
    else carGo(car, carIdx(tr) + (b.classList.contains('next') ? 1 : -1));
  });
  addEventListener('keydown', (e) => {
    if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || !e.target.closest) return;
    const car = e.target.closest('.car'); if (!car || car.classList.contains('single')) return;
    e.preventDefault();
    carGo(car, carIdx(car.querySelector('.car-track')) + (e.key === 'ArrowRight' ? 1 : -1));
  });
  let drag = null, noClick = false;
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !e.target.closest) return;
    const tr = e.target.closest('.car-track');
    if (!tr || tr.parentElement.classList.contains('single')) return;
    drag = { tr, x: e.clientX, s: tr.scrollLeft, moved: false };
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    drag.moved = true; drag.tr.classList.add('drag');
    drag.tr.scrollLeft = drag.s - dx;
  });
  const endDrag = (e) => {
    if (!drag) return;
    const { tr, moved, x, s } = drag; drag = null;
    if (!moved) return;
    noClick = true; setTimeout(() => { noClick = false; }, 60);
    const w = tr.clientWidth || 1, dx = e.clientX - x;
    let i = Math.round(s / w) + (Math.abs(dx) > w * 0.15 ? (dx < 0 ? 1 : -1) : 0);
    i = Math.max(0, Math.min(tr.children.length - 1, i));
    tr.scrollTo({ left: i * w, behavior: 'smooth' });
    setTimeout(() => tr.classList.remove('drag'), 450);
  };
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  document.addEventListener('click', (e) => { if (noClick) { e.stopPropagation(); e.preventDefault(); } }, true);

  /* ---------- Aktualności z json/posts.json (najnowsze na górze) ---------- */
  const POSTS_PER_PAGE = 4;
  let postsData = [], postsPage = 1, postsFailed = false;
  const postTime = (s) => {
    const m = String(s || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : toTime(s);
  };
  function pageButtons(pager, pagesCount, cur, go) {
    pager.innerHTML = '';
    if (pagesCount <= 1) return;
    const mk = (html, page, o = {}) => {
      const b = document.createElement('button');
      b.innerHTML = html; b.disabled = !!o.disabled;
      if (o.on) b.classList.add('on');
      if (o.label) b.setAttribute('aria-label', o.label);
      b.addEventListener('click', () => go(page));
      return b;
    };
    pager.append(mk('<svg class="icon"><use href="#i-left"/></svg>', cur - 1, { disabled: cur === 1, label: t('common.prevPage') }));
    for (let i = 1; i <= pagesCount; i++) pager.append(mk(String(i), i, { on: i === cur }));
    pager.append(mk('<svg class="icon"><use href="#i-right"/></svg>', cur + 1, { disabled: cur === pagesCount, label: t('common.nextPage') }));
  }
  function renderPosts() {
    const list = $('#postsList'), pager = $('#postsPager');
    if (!list) return;
    if (postsFailed) {
      list.innerHTML = `<div class="mod-empty">${esc(t('home.loadError'))}</div>`;
      if (pager) pager.innerHTML = '';
      return;
    }
    const pagesCount = Math.max(1, Math.ceil(postsData.length / POSTS_PER_PAGE));
    postsPage = Math.min(Math.max(1, postsPage), pagesCount);
    const slice = postsData.slice((postsPage - 1) * POSTS_PER_PAGE, postsPage * POSTS_PER_PAGE);
    list.innerHTML = slice.map(p => {
      const img = p.image ? `<div class="media pm"><img decoding="async" src="${esc(p.image)}" alt="${esc(t('common.postThumbnail'))}"></div>` : '';
      const body = `${img}<div class="body"><div class="meta"><svg class="icon"><use href="#i-cal"/></svg>${esc(fmtDate(p.date))}</div><h3>${fmt(pick(p, 'title'))}</h3><p>${fmt(pick(p, 'text'))}</p></div>`;
      return p.url
        ? `<a class="card post" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${body}</a>`
        : `<article class="card post">${body}</article>`;
    }).join('');
    if (pager) pageButtons(pager, pagesCount, postsPage, (n) => { postsPage = n; renderPosts(); list.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }
  const sanitizePost = (p, i) => {
    if (!p || typeof p !== 'object') return null;
    const title = str(p.title, 200); if (!title) return null;
    return { _i: i, date: str(p.date, 16), title, title_en: str(p.title_en, 200), text: str(p.text, 4000), text_en: str(p.text_en, 4000), url: safeUrl(p.url), image: safeMedia(p.image) };
  };
  async function loadPosts() {
    try {
      const res = await fetch('json/posts.json', { cache: 'no-cache', credentials: 'omit' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.posts;
      if (!Array.isArray(arr)) throw new Error('Invalid JSON');
      postsData = arr.slice(0, 500).map(sanitizePost).filter(Boolean)
        .sort((a, b) => (postTime(b.date) - postTime(a.date)) || (a._i - b._i));
      renderPosts();
    } catch (err) {
      console.error('json/posts.json:', err);
      postsFailed = true;
      renderPosts();
    }
  }

  /* =====================================================================
     ROZWÓJ – cała zakładka generowana z json/progress.json
     Format: jedna linia  { line, route, legend, done, todo }
             albo wiele   { legend (wspólna, opcjonalna), lines: [ { line, route, legend?, done, todo }, … ] }
     Teksty: pole + wersja *_en (line.name/name_en, legend.completed/completed_en…),
             a elementy list done/todo to { pl, en } (lub zwykły tekst).
     Trasa:  route.path (SVG), route.points (przystanki), route.progressRed/Orange/Green (0–100)
     ===================================================================== */
  const PROGRESS_COLORS = ['red', 'orange', 'green'];                         // kolejność rysowania (zielona na wierzchu)
  const PROGRESS_STROKE = { red: '#ef2b2b', orange: '#ff7a1a', green: '#22c55e' };
  const COUNT_MS = 1400;
  const SVG_PATH_RE = /^[MmLlHhVvCcSsQqTtAaZz0-9\s.,eE+-]{1,12000}$/;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let progressData = [], progressFailed = false;

  /* ---------- Animacje: liczniki i linie trasy ---------- */
  // odliczanie od 0 do wartości docelowej (ease-out)
  function countTo(el, to, animate) {
    cancelAnimationFrame(el._raf);
    if (!animate || reduceMotion || to <= 0) { el.textContent = to; return; }
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
        const run = animate && !reduceMotion;
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

  // wywoływane przy wejściu na zakładkę #rozwoj (route) – animacja powtarza się za każdym razem
  function updateProgress(animate = true) {
    $$('.pg-count').forEach(el => countTo(el, +el.dataset.to || 0, animate));
    updateRoute(animate);
  }

  const isProgressVisible = () => !!$('#page-rozwoj')?.classList.contains('show');

  /* ---------- Czyszczenie danych z progress.json ---------- */
  const num = (v, d = 0) => (v !== '' && v !== null && isFinite(+v) ? +v : d);
  const pct = (v) => Math.max(0, Math.min(100, num(v)));

  // element listy: { pl, en } albo zwykły tekst
  const sanitizeProgressItem = (x) => {
    if (typeof x === 'string') x = { pl: x };
    if (!x || typeof x !== 'object') return null;
    const pl = str(x.pl ?? x.text, 300);
    return pl ? { pl, en: str(x.en ?? x.text_en, 300) } : null;
  };

  const sanitizePoint = (p) => {
    if (!p || typeof p !== 'object') return null;
    const lb = p.label && typeof p.label === 'object' ? p.label : {};
    const text = str(typeof p.label === 'string' ? p.label : p.text, 40);
    const x = num(p.x), y = num(p.y);
    const lw = num(lb.width, text.length * 13 + 26);
    const lx = num(lb.x, x + 16);
    return {
      x, y, text, lx, lw,
      ly: num(lb.y, y - 18),
      tx: num(lb.textX, lx + 14),
      ty: num(lb.textY, y + 7),
      tl: num(lb.textLength, lw - 26)
    };
  };

  const sanitizeProgressLine = (d, shared) => {
    if (!d || typeof d !== 'object') return null;
    const ln = d.line && typeof d.line === 'object' ? d.line : {};
    const rt = d.route && typeof d.route === 'object' ? d.route : {};
    const lg = (d.legend && typeof d.legend === 'object' ? d.legend : shared && shared.legend) || {};
    const list = (a) => (Array.isArray(a) ? a : []).slice(0, 100).map(sanitizeProgressItem).filter(Boolean);
    const legend = {};
    ['completed', 'renovation', 'streets'].forEach(k => {
      legend[k] = str(lg[k], 80);
      legend[`${k}_en`] = str(lg[`${k}_en`], 80);
    });
    const path = typeof rt.path === 'string' ? rt.path.trim() : '';
    return {
      number: str(ln.number, 8),
      name: str(ln.name, 80), name_en: str(ln.name_en, 80),
      completionLabel: str(ln.completionLabel, 80), completionLabel_en: str(ln.completionLabel_en, 80),
      legend,
      route: {
        image: safeMedia(rt.image),
        imageAlt: str(rt.imageAlt, 200), imageAlt_en: str(rt.imageAlt_en, 200),
        width: Math.max(1, num(rt.width, 1376)), height: Math.max(1, num(rt.height, 752)),
        path: SVG_PATH_RE.test(path) ? path : '',
        points: (Array.isArray(rt.points) ? rt.points : []).slice(0, 50).map(sanitizePoint).filter(Boolean),
        progress: { red: pct(rt.progressRed), orange: pct(rt.progressOrange), green: pct(rt.progressGreen) }
      },
      done: list(d.done),
      todo: list(d.todo)
    };
  };

  /* ---------- Renderowanie ---------- */
  const itemText = (it) => (currentLang !== DEFAULT_LANG && it[currentLang]) || it.pl;

  /* ---------- Mapa tła trasy: szablon <template id="routeMapTpl"> z index.html ---------- */
  let routeMapHtml = null;
  const routeMapSvg = (label) => {
    if (routeMapHtml === null) {
      const svg = $('#routeMapTpl')?.content.firstElementChild;
      routeMapHtml = svg ? { vb: svg.getAttribute('viewBox') || '0 0 1273 699', inner: svg.innerHTML } : false;
    }
    return routeMapHtml
      ? `<svg class="route-map" viewBox="${esc(routeMapHtml.vb)}" preserveAspectRatio="none" role="img" aria-label="${label}">${routeMapHtml.inner}</svg>`
      : '';
  };

  const pointSvg = (p) => `<g class="route-point">${p.text
    ? `<rect x="${p.lx}" y="${p.ly}" width="${p.lw}" height="36" rx="18" fill="#050505"/><text x="${p.tx}" y="${p.ty}" textLength="${p.tl}" lengthAdjust="spacingAndGlyphs">${esc(p.text)}</text>`
    : ''}<circle cx="${p.x}" cy="${p.y}" r="12" fill="#000" stroke="#fff" stroke-width="5"/></g>`;

  function progressLineHtml(ln, i) {
    const sfx = i ? `-${i}` : '';   // pierwsza linia zachowuje id: cDone, cTodo, hDone, hTodo
    const rt = ln.route, lg = ln.legend;

    const legend = [['green', 'completed'], ['orange', 'renovation'], ['red', 'streets']].map(([color, key]) =>
      `<div class="item"><span class="swatch ${color}"></span><span>${fmt(pick(lg, key) || t(`progress.legend.${key}`))}</span></div>`
    ).join('');

    const alt = esc(pick(rt, 'imageAlt') || t('progress.routeAlt'));
    const mapSvg = routeMapSvg(alt);
    // tło: narysowana mapa (szablon #routeMapTpl); gdy go brak – dawny obraz z progress.json
    const stage = mapSvg || (rt.image ? `<img decoding="async" fetchpriority="low" src="${esc(rt.image)}" alt="${alt}" width="${rt.width}" height="${rt.height}">` : '');

    const route = stage ? `<div class="card route-card" data-progress-red="${rt.progress.red}" data-progress-orange="${rt.progress.orange}" data-progress-green="${rt.progress.green}">
      <div class="route-stage">
        ${stage}
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

  async function loadProgress() {
    try {
      const res = await fetch('json/progress.json', { cache: 'no-cache', credentials: 'omit' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data || typeof data !== 'object') throw new Error('Invalid JSON');
      const raw = Array.isArray(data.lines) ? data.lines : [data];
      progressData = raw.slice(0, 20).map(d => sanitizeProgressLine(d, data)).filter(Boolean);
      if (!progressData.length) throw new Error('Invalid JSON');
      progressFailed = false;
    } catch (err) {
      console.error('json/progress.json:', err);
      progressFailed = true;
    }
    renderProgress(true);
  }

  /* ---------- Start: routing od razu, potem język, a dopiero potem dane (posts/mods/progress) ---------- */
  route();
  (async () => {
    let saved = DEFAULT_LANG;
    try { const v = localStorage.getItem(LANG_KEY); if (LANGS.includes(v)) saved = v; } catch (e) {}
    await setLang(saved);
    loadPosts();
    loadMods();
    loadProgress();
  })();
})();
  /* ---------- Wymagania: animacje wejścia/wyjścia (Intersection Observer) ----------
     Fade/slide-in przy wjeździe w viewport (scroll w dół),
     fade/slide-out przy wyjeździe w górę (scroll w górę).
     Tilt/depth (data-tilt) działa niezależnie przez translate (CSS), więc nie koliduje. */
  (function initReqFlow(){
    const items = document.querySelectorAll('.req-item');
    if (!items.length) return;

    // Fallback dla starszych przeglądarek – wszystko widoczne od razu
    if (!('IntersectionObserver' in window)) {
      items.forEach(i => i.classList.add('in'));
      return;
    }

    // Śledzenie kierunku scrolla (z małym progiem, żeby mikro-ruch nie pstrykał)
    let lastY = window.scrollY, goingUp = false;
    window.addEventListener('scroll', () => {
      goingUp = window.scrollY < lastY - 2;
      lastY = window.scrollY;
    }, { passive: true });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');          // wjazd w viewport → zawsze fade-in
        } else if (goingUp) {
          e.target.classList.remove('in');       // wyjazd w górę → fade-out (re-trigger)
        }
        // Wyjazd w dół (przewinięcie obok) → zostawiamy „in" — element ma pozostać wizualnie obecny
      });
    }, {
      rootMargin: '-6% 0px -6% 0px',
      threshold: 0.12
    });

    items.forEach(i => io.observe(i));
  })();
