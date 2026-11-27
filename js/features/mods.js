@@ -1,175 +1,191 @@
/* =====================================================================
   features/mods.js – zakładka MODY: lista, wyszukiwarka, filtry, sortowanie, paginacja
   Dane: mods-data.js | okno szczegółów: mod-modal.js | karuzela: ui/carousel.js
   ===================================================================== */
import { $, $$, esc, fmtDate, toTime } from '../core/dom.js';
import { t, tn, pick, currentLang, onLangChange } from '../core/i18n.js';
import { mediaHtml } from '../ui/carousel.js';
import { pageButtons } from '../ui/pager.js';
import { scrollToElement } from '../ui/smooth-scroll.js';
import { fetchMods, catById, tagsHtml, verDesc } from './mods-data.js';
import { openMod, refreshModal, getOpenModId } from './mod-modal.js';

const MODS_PER_PAGE = 4;
let modsData = { categories: [], mods: [] };
let modsFiltered = [];
let modsPage = 1;
let modsFailed = false;

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
if (countEl) {
    countEl.textContent = total
      ? tn('mods.shown', total, { shown: slice.length, total })
      : t('mods.noResults');
 if (!slice.length) {
    list.innerHTML = `<div class="mod-empty">${esc(t('mods.empty'))}</div>`;
    if (pager) pager.innerHTML = '';
    return;
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
    scrollToElement(list);
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
export async function loadMods() {
  try {
    modsData = await fetchMods();
    buildFilters();
    applyModsFilter();
  } catch (err) {
    console.error('json/mods.json:', err);
    modsFailed = true;
    renderModsPage();
export function initMods() {
  const listEl = $('#modsList');
  const findMod = (id) => modsData.mods.find(m => m.id === id);
listEl?.addEventListener('click', (e) => {
    if (e.target.closest('.car-btn, .car-dot, .car-count')) return;
    const c = e.target.closest('.mod');
    if (c) openMod(findMod(c.dataset.id));
  });
  listEl?.addEventListener('keydown', (e) => {
    if (e.target.closest('.car-btn, .car-dot')) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const c = e.target.closest('.mod');
    if (c) { e.preventDefault(); openMod(findMod(c.dataset.id)); }
  });
$('#modSearch')?.addEventListener('input', () => applyModsFilter());
  $('#modSort')?.addEventListener('change', () => applyModsFilter());

  // zmiana języka: filtry, lista i (jeśli otwarte) okno moda
  onLangChange(() => {
    if (modsFailed) { renderModsPage(); return; }
    if (!modsData.mods.length) return;
    buildFilters();
    applyModsFilter(true);
    const id = getOpenModId();
    const mod = id && findMod(id);
    if (mod) refreshModal(mod);
