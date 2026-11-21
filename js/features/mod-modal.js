/* =====================================================================
   features/mod-modal.js – okno moda: najnowsza wersja na górze, niżej starsze
   ===================================================================== */
import { $, esc, fmtDate } from '../core/dom.js';
import { t, pick } from '../core/i18n.js';
import { onRoute } from '../core/router.js';
import { mediaHtml } from '../ui/carousel.js';
import { tagsHtml, verDesc, dlLabel } from './mods-data.js';

const modal = $('#modModal');
const modalBody = $('#modModalBody');
let openModId = null, lastFocus = null;

export const getOpenModId = () => openModId;

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

// ponowne wyrenderowanie (np. po zmianie języka) z zachowaniem pozycji przewinięcia
export function refreshModal(mod) {
  const st = modalBody.scrollTop;
  renderModal(mod);
  modalBody.scrollTop = st;
}

export function openMod(mod) {
  if (!mod) return;
  lastFocus = document.activeElement;
  openModId = mod.id;
  renderModal(mod);
  modal.classList.add('open');
  document.body.classList.add('modal-open');
  modalBody.scrollTop = 0;
  $('.mod-modal-close', modal)?.focus();
}

export function closeMod() {
  if (!modal || !modal.classList.contains('open')) return;
  modal.classList.remove('open');
  document.body.classList.remove('modal-open');
  openModId = null;
  modalBody.innerHTML = '';
  if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  lastFocus = null;
}

export function initModModal() {
  modal.addEventListener('click', (e) => { if (e.target === modal) closeMod(); });
  $('.mod-modal-close', modal).addEventListener('click', closeMod);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMod(); });
  onRoute(closeMod);
}
