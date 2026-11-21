/* =====================================================================
   features/mods-data.js – wczytywanie i czyszczenie json/mods.json
   + małe pomocniki HTML wspólne dla listy modów i okna moda.
   Każdy mod ma tablicę "versions" (stary format z jedną wersją też działa).
   ===================================================================== */
import { esc, fmt, str, safeUrl, safeMedia, toTime } from '../core/dom.js';
import { t, pick } from '../core/i18n.js';

export const catById = {};      // id kategorii -> { id, label, label_en }
let validCats = new Set();

/* ---------- Pomocniki widoku ---------- */
export const catName = (id) => (catById[id] ? pick(catById[id], 'label') : id);
export const verDesc = (v) => fmt(pick(v, 'description'));
export const dlLabel = (d) => d.label ? fmt(pick(d, 'label')) : esc(t('common.download'));
export const tagsHtml = (mod) => (mod.categories || []).map(id =>
  `<span class="tag-chip">${esc(catName(id))}</span>`
).join('');

/* ---------- Czyszczenie danych ---------- */
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

  const versions = raw.map(sanitizeVersion).filter(Boolean).map(v => ({
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

// zwraca { categories, mods } albo rzuca wyjątek (obsługuje go mods.js)
export async function fetchMods() {
  const res = await fetch('json/mods.json', { cache: 'no-cache', credentials: 'omit' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  if (!data || !Array.isArray(data.mods)) throw new Error('Invalid JSON');
  const cats = sanitizeCats(data.categories);
  validCats = new Set(cats.map(c => c.id));
  cats.forEach(c => { catById[c.id] = c; });
  return {
    categories: cats,
    mods: data.mods.slice(0, 500).map(sanitizeMod).filter(Boolean).map((m, i) => ({ ...m, _i: i }))
  };
}
