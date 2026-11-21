/* =====================================================================
   core/dom.js – małe narzędzia bez zależności: selektory, escapowanie,
   sanityzacja danych z JSON-ów, daty.
   ===================================================================== */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const root = document.documentElement;

// jedno zapytanie na stałe (MediaQueryList jest „żywy" – zawsze czytaj .matches)
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Tekst / HTML ---------- */
export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// **pogrubienie** i ~~przekreślenie~~ w opisach z JSON-ów (reszta jest escapowana)
export const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/~~(.+?)~~/g, '<s>$1</s>');

/* ---------- Sanityzacja wartości z JSON-ów ---------- */
export const str = (v, max) => (typeof v === 'string' ? v : '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max);

export const num = (v, d = 0) => (v !== '' && v !== null && isFinite(+v) ? +v : d);
export const pct = (v) => Math.max(0, Math.min(100, num(v)));

export const safeUrl = (u) => {
  try { const x = new URL(String(u), location.href); return x.protocol === 'https:' ? x.href : ''; }
  catch (e) { return ''; }
};

export const safeMedia = (u) => {
  u = String(u || '').trim();
  if (u.length > 200 || u.includes('..') || u.includes(':') || u.startsWith('/') || u.startsWith('\\')) return '';
  return /^[\w\-./ ()]+\.(png|jpe?g|webp|gif|mp4|webm)$/i.test(u) ? u : '';
};

/* ---------- Daty ---------- */
export const toTime = (s) => {
  if (!s) return 0;
  s = String(s).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
  return 0;
};

export const fmtDate = (s) => {
  const t = toTime(s);
  if (!t) return '—';
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
};

// data wpisu z opcjonalną godziną (YYYY-MM-DD HH:MM)
export const postTime = (s) => {
  const m = String(s || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : toTime(s);
};
