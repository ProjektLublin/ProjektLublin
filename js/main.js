/* =====================================================================
   Projekt Lublin – main.js
   ===================================================================== */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;

  let currentLang = 'pl';
  const L = (pl, en) => (currentLang === 'en' ? en : pl);

  /* ---------- Motyw (ciemny / jasny) ---------- */
  try { const t = localStorage.getItem('pl-theme'); if (t === 'dark' || t === 'light') root.dataset.theme = t; } catch (e) {}
  $('#themeBtn').addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('pl-theme', root.dataset.theme); } catch (e) {}
  });

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

  /* ---------- Rozwój: liczniki i trasa ---------- */
  function updateProgress() {
    const done = $$('.done-list li').length;
    const todo = $$('.todo-list li').length;
    $('#cDone').textContent = done; $('#cTodo').textContent = todo;
    $('#hDone').textContent = done; $('#hTodo').textContent = todo;
    updateRoute();
  }

  function updateRoute() {
    const card = $('#routeCard'); if (!card) return;
    [['#routeRed', 'progressRed'], ['#routeOrange', 'progressOrange'], ['#routeGreen', 'progressGreen']].forEach(([sel, key]) => {
      let p = parseFloat(card.dataset[key]);
      if (!isFinite(p)) p = 0;
      p = Math.max(0, Math.min(100, p));
      const fill = $(sel);
      fill.style.transition = 'none';
      fill.style.strokeDashoffset = 100;
      fill.getBoundingClientRect();
      requestAnimationFrame(() => {
        fill.style.transition = 'stroke-dashoffset 1.4s var(--ease)';
        fill.style.strokeDashoffset = 100 - p;
      });
    });
  }

  /* ---------- Lightbox (galeria) ---------- */
  const lb = $('#lightbox');
  $$('.gallery .card').forEach(c => c.addEventListener('click', () => {
    const img = c.querySelector('.media img'); if (!img) return;
    lb.querySelector('img').src = img.src; lb.classList.add('open');
  }));
  lb.addEventListener('click', () => lb.classList.remove('open'));

  /* ---------- Cząsteczki w tle ---------- */
  const cv = $('#particles'), ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, pts = [], dpr = 1, raf = 0;
  let pColor = getComputedStyle(root).getPropertyValue('--particle').trim() || '255,255,255';
  new MutationObserver(() => { pColor = getComputedStyle(root).getPropertyValue('--particle').trim() || pColor; })
    .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  const mouse = { x: -999, y: -999 };
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(70, Math.round(W * H / 22000));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25,
      r: Math.random() * 1.3 + .4
    }));
  }
  function draw() {
    const c = pColor;
    ctx.clearRect(0, 0, W, H);
    const D = 120;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!reduce) { p.x += p.vx; p.y += p.vy; }
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      const mdx = p.x - mouse.x, mdy = p.y - mouse.y, md = Math.hypot(mdx, mdy);
      if (md < 100) { p.x += mdx / md * .6; p.y += mdy / md * .6; }
      ctx.fillStyle = `rgba(${c},.55)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j], d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < D) {
          ctx.strokeStyle = `rgba(${c},${(1 - d / D) * .14})`;
          ctx.lineWidth = .6;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }
    raf = document.hidden ? 0 : requestAnimationFrame(draw);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !raf) raf = requestAnimationFrame(draw); });
  addEventListener('resize', resize);
  addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  addEventListener('mouseleave', () => { mouse.x = mouse.y = -999; });
  resize(); draw();

  /* =====================================================================
     MODY – lista, wyszukiwarka, filtry, okno z historią wersji
     Dane: mods.json  (każdy mod ma tablicę "versions")
     ===================================================================== */
  const MODS_PER_PAGE = 4;
  let modsData = { categories: [], mods: [] };
  let modsFiltered = [];
  let modsPage = 1;
  const catLabel = {};

  const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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

  function buildFilters() {
    const box = $('#modFilters');
    if (!box) return;
    box.innerHTML = '';
    modsData.categories.forEach(c => {
      catLabel[c.id] = c.label;
      const lab = document.createElement('label');
      lab.innerHTML = `<input type="checkbox" value="${esc(c.id)}"><span>${esc(c.label)}</span>`;
      lab.addEventListener('change', () => {
        lab.classList.toggle('active', lab.querySelector('input').checked);
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
    if (!items.length) return '<div class="ph"><svg class="icon"><use href="#i-image"/></svg>Brak podglądu</div>';
    const n = items.length;
    const slides = items.map(m => `<div class="car-slide">${slideHtml(m)}</div>`).join('');
    if (n === 1) return `<div class="car single"><div class="car-track">${slides}</div></div>`;
    const dots = items.map((_, i) => `<button type="button" class="car-dot${i ? '' : ' on'}" data-i="${i}" aria-label="${L('Zdjęcie', 'Photo')} ${i + 1}"></button>`).join('');
    return `<div class="car"><div class="car-track">${slides}</div>
      <button type="button" class="car-btn prev" aria-label="${L('Poprzednie', 'Previous')}"><svg class="icon"><use href="#i-left"/></svg></button>
      <button type="button" class="car-btn next" aria-label="${L('Następne', 'Next')}"><svg class="icon"><use href="#i-right"/></svg></button>
      <span class="car-count">1 / ${n}</span><div class="car-dots">${dots}</div></div>`;
  }

  const verDesc = (v) => txt(v.description, v.description_en);
  const dlLabel = (d) => d.label ? txt(d.label, d.label_en) : esc(L('Pobierz', 'Download'));
  const tagsHtml = (mod) => (mod.categories || []).map(id =>
    `<span class="tag-chip">${esc(catLabel[id] || id)}</span>`
  ).join('');

  const plVersion = (n) => {
    if (n === 1) return 'wersja';
    const a = n % 10, b = n % 100;
    return (a >= 2 && a <= 4 && !(b >= 12 && b <= 14)) ? 'wersje' : 'wersji';
  };
  const verCount = (n) => L(`${n} ${plVersion(n)}`, `${n} version${n === 1 ? '' : 's'}`);

  function renderModsPage() {
    const list = $('#modsList');
    const pager = $('#modsPager');
    const countEl = $('#modCount');
    if (!list) return;

    const total = modsFiltered.length;
    const pages = Math.max(1, Math.ceil(total / MODS_PER_PAGE));
    modsPage = Math.min(Math.max(1, modsPage), pages);
    const start = (modsPage - 1) * MODS_PER_PAGE;
    const slice = modsFiltered.slice(start, start + MODS_PER_PAGE);

    if (countEl) {
      countEl.textContent = total
        ? L(`Wyświetlono ${slice.length} z ${total} mod${total === 1 ? 'a' : total < 5 ? 'y' : 'ów'}`,
            `Showing ${slice.length} of ${total} mod${total === 1 ? '' : 's'}`)
        : L('Brak wyników dla wybranych filtrów', 'No results for the selected filters');
    }

    if (!slice.length) {
      list.innerHTML = `<div class="mod-empty">${L('Nic nie znaleziono. Zmień wyszukiwanie lub filtry.', 'Nothing found. Change your search or filters.')}</div>`;
      if (pager) pager.innerHTML = '';
      return;
    }

    // karta na liście = NAJNOWSZA wersja moda
    list.innerHTML = slice.map(mod => {
      const v = mod.versions[0];
      const n = mod.versions.length;
      const verLabel = v.version ? ` · ${esc(v.version)}` : '';
      const countChip = n > 1 ? `<span class="tag-chip">${esc(verCount(n))}</span>` : '';
      return `<article class="card mod" data-id="${esc(mod.id)}" tabindex="0" role="button" aria-haspopup="dialog">
        <div class="media">${mediaHtml(v.media)}</div>
        <div class="body">
          <div class="date-meta"><svg class="icon"><use href="#i-cal"/></svg>${esc(fmtDate(v.date))}${verLabel}</div>
          <h3>${esc(mod.title)}</h3>
          <p>${verDesc(v)}</p>
          <div class="tags">${tagsHtml(mod)}${countChip}</div>
          <div class="row">
            <div class="meta"><svg class="icon"><use href="#i-user"/></svg>Autor: ${esc(mod.author)}</div>
            <span class="btn ghost mod-open"><svg class="icon"><use href="#i-download"/></svg>Pobierz</span>
          </div>
        </div>
      </article>`;
    }).join('');

    if (!pager) return;
    pager.innerHTML = '';
    if (pages <= 1) return;
    const mk = (html, page, opts = {}) => {
      const b = document.createElement('button');
      b.innerHTML = html;
      b.disabled = !!opts.disabled;
      if (opts.on) b.classList.add('on');
      if (opts.label) b.setAttribute('aria-label', opts.label);
      b.addEventListener('click', () => {
        modsPage = page;
        renderModsPage();
        list.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return b;
    };
    pager.append(mk('<svg class="icon"><use href="#i-left"/></svg>', modsPage - 1, { disabled: modsPage === 1, label: 'Poprzednia' }));
    for (let i = 1; i <= pages; i++) pager.append(mk(String(i), i, { on: i === modsPage }));
    pager.append(mk('<svg class="icon"><use href="#i-right"/></svg>', modsPage + 1, { disabled: modsPage === pages, label: 'Następna' }));
  }

  function applyModsFilter() {
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
        m.title, m.author,
        ...m.versions.flatMap(v => [v.version, v.description, v.description_en]),
        ...(m.categories || []).map(c => catLabel[c] || c)
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });

    const byTitle = (a, b) => (a.title || '').localeCompare(b.title || '', 'pl');
    const byIndex = (a, b) => a._i - b._i;

    modsFiltered.sort((a, b) => {
      switch (sort) {
        case 'date-desc':  return (toTime(b.date) - toTime(a.date)) || byIndex(a, b);
        case 'date-asc':   return (toTime(a.date) - toTime(b.date)) || byIndex(a, b);
        case 'title-asc':  return byTitle(a, b) || byIndex(a, b);
        case 'title-desc': return byTitle(b, a) || byIndex(a, b);
        case 'author-asc': return (a.author || '').localeCompare(b.author || '', 'pl') || byIndex(a, b);
        default:           return byIndex(a, b);
      }
    });

    modsPage = 1;
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
      ? (total > 1 ? '<span class="tag-chip new">Najnowsza</span>' : '')
      : '<span class="tag-chip">Archiwalna</span>';
    return `<section class="mm-ver${i === 0 ? ' latest' : ''}">
      <div class="media">${mediaHtml(v.media)}</div>
      <div class="mm-ver-body">
        <div class="mm-ver-top">
          ${v.version ? `<h4>${esc(v.version)}</h4>` : ''}
          ${badge}
        </div>
        <div class="date-meta"><svg class="icon"><use href="#i-cal"/></svg>${esc(fmtDate(v.date))}</div>
        <p>${verDesc(v)}</p>
        <div class="mm-files">
          <div class="mm-label">Pliki do pobrania</div>
          ${dls ? `<div class="mm-list">${dls}</div>` : '<p class="mm-empty">Brak plików do pobrania.</p>'}
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
        <h3 id="modModalTitle">${esc(mod.title)}</h3>
        <div class="meta"><svg class="icon"><use href="#i-user"/></svg>Autor: ${esc(mod.author)}</div>
        <div class="tags">${tagsHtml(mod)}</div>
      </div>
      ${latest}
      ${n > 1 ? `<h4 class="mm-sep">Poprzednie wersje</h4>${older}` : ''}
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

  /* ---------- Wczytywanie i czyszczenie danych z mods.json ---------- */
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
    .map(c => c && typeof c === 'object' ? { id: str(c.id, 32), label: str(c.label, 60) } : null)
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
      : [{ version: m.version, date: m.date, description: m.description, description_en: m.description_en, media: m.media ?? m.images, downloads: m.downloads }];

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
      id, title,
      author: str(m.author, 80),
      date: versions[0].date,
      categories: (Array.isArray(m.categories) ? m.categories : []).map(c => str(c, 32)).filter(c => validCats.has(c)).slice(0, 6),
      versions
    };
  };

  async function loadMods() {
    try {
      const res = await fetch('mods.json', { cache: 'no-cache', credentials: 'omit' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data || !Array.isArray(data.mods)) throw new Error('Invalid JSON');
      const cats = sanitizeCats(data.categories);
      validCats = new Set(cats.map(c => c.id));
      cats.forEach(c => { catLabel[c.id] = c.label; });
      modsData = {
        categories: cats,
        mods: data.mods.slice(0, 500).map(sanitizeMod).filter(Boolean).map((m, i) => ({ ...m, _i: i }))
      };
      buildFilters();
      applyModsFilter();
    } catch (err) {
      console.error('mods.json:', err);
      const list = $('#modsList');
      if (list) list.innerHTML = `<div class="mod-empty">${L('Nie udało się wczytać listy modów (mods.json).', 'Failed to load the mods list (mods.json).')}</div>`;
    }
  }

  $('#modSearch')?.addEventListener('input', () => applyModsFilter());
  $('#modSort')?.addEventListener('change', () => applyModsFilter());
  loadMods();

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

  /* ---------- Automatyczne tłumaczenie PL -> EN ----------
     Kolejność: pole *_en z JSON (jeśli jest) -> słownik -> pamięć podręczna ->
     tłumacz wbudowany w Chrome -> Google (translate.googleapis.com) -> MyMemory */
  const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/~~(.+?)~~/g, '<s>$1</s>');
  const trCache = new Map();
  try { Object.entries(JSON.parse(localStorage.getItem('pl-trcache') || '{}')).forEach(([k, v]) => { if (typeof v === 'string') trCache.set(k, v); }); } catch (e) {}
  const saveTr = () => {
    try {
      while (trCache.size > 300) trCache.delete(trCache.keys().next().value);
      localStorage.setItem('pl-trcache', JSON.stringify(Object.fromEntries(trCache)));
    } catch (e) {}
  };
  const trSrc = new Map(), trPend = new Map();
  let tidSeq = 0, active = 0, nativeTr = null, nativeOff = false;
  const waitQ = [];
  const slot = async () => { if (active >= 4) await new Promise(r => waitQ.push(r)); active++; };
  const free = () => { active--; const n = waitQ.shift(); if (n) n(); };

  // tekst do wstawienia w HTML; w EN bez gotowego tłumaczenia zwraca <span data-tid> i tłumaczy w tle
  function txt(raw, over) {
    raw = raw || '';
    if (!raw || currentLang !== 'en') return fmt(raw);
    if (over) return fmt(over);
    if (trCache.has(raw)) return fmt(trCache.get(raw));
    const id = String(++tidSeq); trSrc.set(id, raw);
    return `<span data-tid="${id}">${fmt(raw)}</span>`;
  }
  function flushTr(rootEl) {
    const els = [...rootEl.querySelectorAll('[data-tid]')];
    if (rootEl.matches && rootEl.matches('[data-tid]')) els.push(rootEl);
    els.forEach(el => {
      const id = el.dataset.tid, src = trSrc.get(id);
      el.removeAttribute('data-tid'); trSrc.delete(id);
      if (!src) return;
      autoTr(src).then(t => { if (el.isConnected && currentLang === 'en') el.innerHTML = fmt(t); }).catch(() => {});
    });
  }
  async function viaNative(t) {
    if (nativeOff) throw new Error('off');
    if (!nativeTr) {
      try {
        const o = { sourceLanguage: 'pl', targetLanguage: 'en' };
        if (!('Translator' in self) || await Translator.availability(o) !== 'available') throw new Error('na');
        nativeTr = await Translator.create(o);
      } catch (e) { nativeOff = true; throw e; }
    }
    return nativeTr.translate(t);
  }
  async function viaGoogle(t) {
    const r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=pl&tl=en&dt=t&q=' + encodeURIComponent(t), { credentials: 'omit' });
    if (!r.ok) throw new Error('G' + r.status);
    return (await r.json())[0].map(s => s[0]).join('');
  }
  async function viaMyMemory(t) {
    const r = await fetch('https://api.mymemory.translated.net/get?langpair=pl%7Cen&q=' + encodeURIComponent(t), { credentials: 'omit' });
    const j = await r.json();
    if (!r.ok || j.responseStatus != 200) throw new Error('MM');
    return j.responseData.translatedText;
  }
  async function trChunk(t) {
    for (const f of [viaNative, viaGoogle, viaMyMemory]) { try { const o = await f(t); if (o) return o; } catch (e) {} }
    throw new Error('no translator');
  }
  function chunks(line) {
    const out = []; let cur = '';
    (line.match(/[^.!?…]+[.!?…]*\s*/g) || [line]).forEach(s => {
      while (s.length > 450) {
        let k = s.lastIndexOf(' ', 450); if (k < 100) k = 450;
        if (cur) { out.push(cur); cur = ''; }
        out.push(s.slice(0, k)); s = s.slice(k);
      }
      if ((cur + s).length > 450) { out.push(cur); cur = ''; }
      cur += s;
    });
    out.push(cur);
    return out.filter(x => x.trim());
  }
  function autoTr(text) {
    const known = DICT.get(text.trim().replace(/\s+/g, ' '));
    if (known) return Promise.resolve(known);
    if (trCache.has(text)) return Promise.resolve(trCache.get(text));
    if (trPend.has(text)) return trPend.get(text);
    const p = (async () => {
      const lines = await Promise.all(text.split('\n').map(async (line) => {
        if (!/\p{L}/u.test(line)) return line;
        const res = [];
        for (const c of chunks(line)) { await slot(); try { res.push(await trChunk(c)); } finally { free(); } }
        return res.join(' ').replace(/ {2,}/g, ' ').trim();
      }));
      const out = lines.join('\n');
      trCache.set(text, out); saveTr();
      return out;
    })();
    trPend.set(text, p);
    p.catch(() => {}).finally(() => trPend.delete(text));
    return p;
  }

  /* ---------- Aktualności z posts.json (najnowsze na górze) ---------- */
  const POSTS_PER_PAGE = 4;
  let postsData = [], postsPage = 1;
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
    pager.append(mk('<svg class="icon"><use href="#i-left"/></svg>', cur - 1, { disabled: cur === 1, label: L('Poprzednia', 'Previous') }));
    for (let i = 1; i <= pagesCount; i++) pager.append(mk(String(i), i, { on: i === cur }));
    pager.append(mk('<svg class="icon"><use href="#i-right"/></svg>', cur + 1, { disabled: cur === pagesCount, label: L('Następna', 'Next') }));
  }
  function renderPosts() {
    const list = $('#postsList'), pager = $('#postsPager');
    if (!list) return;
    const pagesCount = Math.max(1, Math.ceil(postsData.length / POSTS_PER_PAGE));
    postsPage = Math.min(Math.max(1, postsPage), pagesCount);
    const slice = postsData.slice((postsPage - 1) * POSTS_PER_PAGE, postsPage * POSTS_PER_PAGE);
    list.innerHTML = slice.map(p => {
      const img = p.image ? `<div class="media pm"><img decoding="async" src="${esc(p.image)}" alt="${esc(L('Miniaturka wpisu', 'Post thumbnail'))}"></div>` : '';
      const body = `${img}<div class="body"><div class="meta"><svg class="icon"><use href="#i-cal"/></svg>${esc(fmtDate(p.date))}</div><h3>${txt(p.title, p.title_en)}</h3><p>${txt(p.text, p.text_en)}</p></div>`;
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
      const res = await fetch('posts.json', { cache: 'no-cache', credentials: 'omit' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.posts;
      if (!Array.isArray(arr)) throw new Error('Invalid JSON');
      postsData = arr.slice(0, 500).map(sanitizePost).filter(Boolean)
        .sort((a, b) => (postTime(b.date) - postTime(a.date)) || (a._i - b._i));
      renderPosts();
    } catch (err) {
      console.error('posts.json:', err);
      const l = $('#postsList');
      if (l) l.innerHTML = `<div class="mod-empty">${L('Nie udało się wczytać wpisów (posts.json).', 'Failed to load posts (posts.json).')}</div>`;
    }
  }
  loadPosts();

  /* ---------- Tłumaczenie strony PL <-> EN ---------- */
  const DICT = new Map(Object.entries({
    // nawigacja i nagłówki
    'MODY': 'MODS',
    'Rozwój': 'Progress',
    'Współpraca': 'Cooperation',
    'Galeria': 'Gallery',
    'Aktualności': 'News',
    'Pobieranie': 'Downloads',
    'Modyfikacje': 'Modifications',
    'Postęp prac': 'Work progress',
    'Screenshoty': 'Screenshots',
    'Zespół': 'Team',
    'Archiwum': 'Archive',
    'O mieście': 'About the city',
    // menu (Facebook / język / motyw)
    'Więcej': 'More',
    'Motyw': 'Theme',
    // strona główna
    'Najnowsze wpisy i informacje o postępach projektu.': 'Latest posts and information about the project\'s progress.',
    'Linia 151 Projekt Lublin 4.0 odcinek Węglin - Wojciechowska': 'Line 151 Projekt Lublin 4.0, Węglin - Wojciechowska section',
    'Poradnik obiektów Blender - OMSI2': 'Blender - OMSI2 objects tutorial',
    'Postanowiliśmy przetestować nowy projekt OpenOmsi na mapie Lublina, wyniki są bardzo ciekawe. Mimo, że teren wizualnie może wyglądać identycznie jak na poprzednim filmie to prace nadal trwają. Na Kraśnickiej zostały juz głównie minimalne poprawki i ruch/kostki AI, natomiast ulica Kunickiego zaszła już za skrzyżowanie Kunickiego i Zemborzyckiej (same spliny na ten moment). Niestety rąk do pomocy jest bardzo mało (a właściwie w ogóle ich nie ma) dlatego projekt długo się ciągnie, chętnych do udzielenia jakiejkolwiek pomocy prosimy o kontakt przez "ticket" na serwerze Discord':
      'We decided to test the new OpenOmsi project on the Lublin map, and the results are very interesting. Even though the area may look identical to the previous video visually, work is still in progress. On Kraśnicka there are mostly only minor fixes and AI traffic/cubes left, while Kunickiego street has already gone past the Kunickiego and Zemborzycka intersection (splines only for now). Unfortunately, there are very few hands to help (in fact, none at all), which is why the project drags on. If you would like to offer any help, please contact us via a "ticket" on the Discord server',
    'Pierwszy przejazd po skończonym odcinku 151 Węglin - Wojciechowska. Wszystkie linki w komentarzu pod filmem.': 'The first ride along the finished 151 Węglin - Wojciechowska section. All links are in the comment under the video.',
    'Prosty poradnik tworzenia obiektów dedykowanych w Blenderze dla OMSI2. Wszystkie linki w komentarzu pod filmem.': 'A simple tutorial on creating dedicated objects in Blender for OMSI2. All links are in the comment under the video.',
    'Wesprzyj twórców': 'Support the creators',
    // download
    'Pobierz najnowszą wersję mapy i dodatków.': 'Download the latest version of the map and add-ons.',
    'Mapa Projekt Lublin': 'Projekt Lublin map',
    'Po prostu pobierz.': 'Just download it.',
    'Pobierz': 'Download',
    'Opis pliku do pobrania.': 'Description of the file to download.',
    'Poprzednie wersje mapy.': 'Previous versions of the map.',
    '· dodano nową linię – 156': '· added a new line – 156',
    '· zaktualizowano trasę linii 55': '· updated the route of line 55',
    '· zaktualizowano otoczenie, stan na 2017/2018 rok.': '· updated the surroundings, state as of 2017/2018.',
    '· Dodano linię 55': '· Added line 55',
    // mody
    'Modyfikacje stworzone przez społeczność. Szukaj, filtruj i sortuj.': 'Community-made modifications. Search, filter and sort.',
    'Szukaj po nazwie, autorze, opisie…': 'Search by name, author, description…',
    'Sortuj:': 'Sort:',
    'Najnowsze': 'Newest',
    'Najstarsze': 'Oldest',
    'Nazwa A–Z': 'Name A–Z',
    'Nazwa Z–A': 'Name Z–A',
    'Autor A–Z': 'Author A–Z',
    'Malowanie': 'Livery',
    'Pojazd': 'Vehicle',
    'Blender / Narzędzia': 'Blender / Tools',
    'Sieć trolejbusowa': 'Trolleybus network',
    'AI / HOF': 'AI / HOF',
    'Inne': 'Other',
    'Brak podglądu': 'No preview',
    'Wersje do pobrania': 'Available versions',
    'Pliki do pobrania': 'Files to download',
    'Poprzednie wersje': 'Previous versions',
    'Archiwalna': 'Archived',
    'Najnowsza': 'Latest',
    'Brak plików do pobrania.': 'No files to download.',
    'Aktualna wersja (Google Drive)': 'Current version (Google Drive)',
    'Aktualna wersja': 'Current version',
    'Aktualna paczka (MEGA)': 'Current pack (MEGA)',
    'Pobierz ze strony autora': 'Download from the author\'s website',
    'Wersja 1.0r BETA': 'Version 1.0r BETA',
    // rozwój
    'Linia 151': 'Line 151',
    'Postęp ukończenia': 'Completion progress',
    'Zrobione:': 'Done:',
    'Do zrobienia:': 'To do:',
    'Ukończony odcinek': 'Completed section',
    'Odcinek do renowacji': 'Section to be renovated',
    'Odcinek z utworzonymi ulicami': 'Section with streets created',
    'Zrobione': 'Done',
    'Do zrobienia': 'To do',
    'Wykonanie Ulic na Al.Kraśnickiej': 'Streets on Al. Kraśnicka completed',
    'Wykonanie wszystkich obiektów na Al.Kraśnickiej': 'All objects on Al. Kraśnicka completed',
    'Ulice na odcinku Targi-Głuska': 'Streets on the Targi-Głuska section',
    'Ulice na odcinku Głuska-Abramowice': 'Streets on the Głuska-Abramowice section',
    'Wykonanie Obiektów na odcinku Kunickiego-Abramowice': 'Objects on the Kunickiego-Abramowice section',
    'Modernizacja AL.Racławickich': 'Modernization of Al. Racławickie',
    // współpraca
    'Dołącz do nas': 'Join us',
    'Projekt Lublin tworzymy w małym zespole, dlatego każda pomoc się liczy. Sprawdź, w czym możesz nam pomóc.': 'We build Projekt Lublin in a small team, so every bit of help counts. See how you can help us.',
    'Szukamy pomocy': 'We need help',
    'Przydadzą się osoby z doświadczeniem w:': 'People with experience in the following would be welcome:',
    'Modelowanie obiektów w Blenderze': 'Modelling objects in Blender',
    'Tworzenie ulic i splinów w Edytorze OMSI 2': 'Creating streets and splines in the OMSI 2 Editor',
    'Ruch AI i pliki HOF': 'AI traffic and HOF files',
    'Testowanie mapy i zgłaszanie błędów': 'Testing the map and reporting bugs',
    'Jak się skontaktować': 'How to get in touch',
    'Najszybciej napiszesz do nas przez ticket na serwerze Discord. Możesz też odezwać się na Facebooku albo wesprzeć projekt.': 'The fastest way to reach us is a ticket on our Discord server. You can also message us on Facebook or support the project.',
    // galeria / info
    'Szpital Wojewódzki': 'Provincial Hospital',
    'Główny twórca Projektu Lublin': 'Lead creator of Projekt Lublin',
    'Edytor, Blender': 'Editor, Blender',
    'Edytor, Blender, PR': 'Editor, Blender, PR',
    'Lublin to największe miasto we wschodniej Polsce i stolica województwa lubelskiego. Położony nad Bystrzycą, słynie z malowniczego Starego Miasta, Zamku Lubelskiego z Kaplicą Trójcy Świętej oraz Bramy Krakowskiej. To ważny ośrodek akademicki z kilkoma uczelniami i dziesiątkami tysięcy studentów. Lublin ma jedną z największych sieci trolejbusowych w Polsce, a komunikację miejską obsługuje ZTM Lublin.':
      'Lublin is the largest city in eastern Poland and the capital of Lublin Voivodeship. Located on the Bystrzyca river, it is famous for its picturesque Old Town, the Lublin Castle with the Chapel of the Holy Trinity, and the Kraków Gate. It is an important academic center with several universities and tens of thousands of students. Lublin has one of the largest trolleybus networks in Poland, and public transport is operated by ZTM Lublin.',
    'mieszkańców (koniec 2025)': 'residents (end of 2025)',
    'powierzchnia': 'area',
    'prawa miejskie': 'city rights',
    'województwo': 'voivodeship',
    'lubelskie': 'Lublin Voivodeship',
    // atrybuty (alt, aria-label, title)
    'Metaliczne logo Projekt Lublin': 'Metallic Projekt Lublin logo',
    'Miniaturka wpisu': 'Post thumbnail',
    'Przebieg trasy linii 151 od Węglina do Abramowic': 'Route of line 151 from Węglin to Abramowice',
    'Awatar 1': 'Avatar 1',
    'Awatar 2': 'Avatar 2',
    'Mapa Lublina': 'Map of Lublin',
    'Zmień motyw': 'Change theme',
    'Zamknij': 'Close',
    'Poprzednia': 'Previous',
    'Następna': 'Next'
  }));
  const PATTERNS = [
    [/^Wersja: /, 'Version: '],
    [/^Wersja (?=\d)/, 'Version '],
    [/^Autor: /, 'Author: '],
    [/^Data wydania /, 'Release date '],
    [/^Zdjęcie (\d+)$/, 'Photo $1']
  ];
  const TITLE_PL = document.title;
  const TITLE_EN = 'Projekt Lublin – Lublin map for OMSI 2 | Line 151, mods, download';
  const ATTRS = ['placeholder', 'aria-label', 'alt', 'title'];
  const origText = new WeakMap();
  const origAttr = new WeakMap();

  function trStr(s) {
    const core = s.trim().replace(/\s+/g, ' ');
    if (!core) return s;
    const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
    if (DICT.has(core)) return lead + DICT.get(core) + trail;
    for (const [re, rep] of PATTERNS) {
      if (re.test(core)) return lead + core.replace(re, rep) + trail;
    }
    return s;
  }

  function applyText(n) {
    const p = n.parentNode;
    if (!p || p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE') return;
    if (currentLang === 'en') {
      const base = origText.has(n) ? origText.get(n) : n.nodeValue;
      const out = trStr(base);
      if (out !== base) { origText.set(n, base); if (n.nodeValue !== out) n.nodeValue = out; }
    } else if (origText.has(n)) {
      n.nodeValue = origText.get(n);
      origText.delete(n);
    }
  }

  function applyAttrs(el) {
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      let store = origAttr.get(el);
      if (currentLang === 'en') {
        const base = (store && a in store) ? store[a] : el.getAttribute(a);
        const out = trStr(base);
        if (out !== base) {
          if (!store) { store = {}; origAttr.set(el, store); }
          store[a] = base;
          el.setAttribute(a, out);
        }
      } else if (store && a in store) {
        el.setAttribute(a, store[a]);
        delete store[a];
      }
    }
  }

  function translateTree(rootNode) {
    if (!rootNode) return;
    if (rootNode.nodeType === 3) { applyText(rootNode); return; }
    if (rootNode.nodeType !== 1) return;
    applyAttrs(rootNode);
    const tw = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) applyText(n); else applyAttrs(n);
    }
  }

  // tłumaczy treści doklejane dynamicznie (lista modów, wpisy, filtry, okno modala, paginacja)
  new MutationObserver((muts) => {
    if (currentLang !== 'en') return;
    muts.forEach(m => m.addedNodes.forEach(n => { translateTree(n); if (n.nodeType === 1) flushTr(n); }));
  }).observe(document.body, { childList: true, subtree: true });

  const langBtn = $('#langBtn');
  const langLabel = $('#langLabel');

  function setLang(lang) {
    currentLang = lang === 'en' ? 'en' : 'pl';
    langLabel.textContent = currentLang === 'pl' ? 'EN' : 'PL';
    $('#langFlag use').setAttribute('href', currentLang === 'pl' ? '#i-flag-gb' : '#i-flag-pl');
    document.documentElement.lang = currentLang;
    document.title = currentLang === 'en' ? TITLE_EN : TITLE_PL;
    translateTree(document.body);
    renderPosts();
    if (modsData.mods.length) {
      renderModsPage();
      if (openModId) {
        const mod = modsData.mods.find(m => m.id === openModId);
        if (mod) {
          const st = modalBody.scrollTop;
          renderModal(mod);
          modalBody.scrollTop = st;
        }
      }
    }
    try { localStorage.setItem('pl-lang', currentLang); } catch (e) {}
  }

  langBtn.addEventListener('click', () => setLang(currentLang === 'pl' ? 'en' : 'pl'));

  let startLang = 'pl';
  try { const s = localStorage.getItem('pl-lang'); if (s === 'en' || s === 'pl') startLang = s; } catch (e) {}
  setLang(startLang);

  route();
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