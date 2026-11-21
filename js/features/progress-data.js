/* =====================================================================
   features/progress-data.js – wczytywanie i czyszczenie json/progress.json
   Format: jedna linia  { line, route, legend, done, todo }
           albo wiele   { legend (wspólna, opcjonalna), lines: [ { line, route, legend?, done, todo }, … ] }
   Teksty: pole + wersja *_en (line.name/name_en, legend.completed/completed_en…),
           a elementy list done/todo to { pl, en } (lub zwykły tekst).
   Trasa:  route.path (SVG), route.points (przystanki), route.progressRed/Orange/Green (0–100)
   ===================================================================== */
import { str, num, pct, safeMedia } from '../core/dom.js';

const SVG_PATH_RE = /^[MmLlHhVvCcSsQqTtAaZz0-9\s.,eE+-]{1,12000}$/;

// element listy: { pl, en } albo zwykły tekst
const sanitizeItem = (x) => {
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

const sanitizeLine = (d, shared) => {
  if (!d || typeof d !== 'object') return null;
  const ln = d.line && typeof d.line === 'object' ? d.line : {};
  const rt = d.route && typeof d.route === 'object' ? d.route : {};
  const lg = (d.legend && typeof d.legend === 'object' ? d.legend : shared && shared.legend) || {};
  const list = (a) => (Array.isArray(a) ? a : []).slice(0, 100).map(sanitizeItem).filter(Boolean);
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

// zwraca tablicę linii albo rzuca wyjątek (obsługuje go progress.js)
export async function fetchProgress() {
  const res = await fetch('json/progress.json', { cache: 'no-cache', credentials: 'omit' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (!data || typeof data !== 'object') throw new Error('Invalid JSON');
  const raw = Array.isArray(data.lines) ? data.lines : [data];
  const lines = raw.slice(0, 20).map(d => sanitizeLine(d, data)).filter(Boolean);
  if (!lines.length) throw new Error('Invalid JSON');
  return lines;
}
