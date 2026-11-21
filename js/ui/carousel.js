/* =====================================================================
   ui/carousel.js – karuzela zdjęć/wideo w kartach modów i w oknie moda
   mediaHtml(list) zwraca HTML; initCarousels() podpina globalne zdarzenia
   (strzałki, kropki, przeciąganie myszą, klawisze ←/→) – działa też na treści dodanej później.
   ===================================================================== */
import { esc } from '../core/dom.js';
import { t } from '../core/i18n.js';

const slideHtml = (m) => m.type === 'video'
  ? `<video src="${esc(m.src)}" preload="metadata" autoplay loop muted playsinline></video>`
  : `<img decoding="async" draggable="false" src="${esc(m.src)}" alt="${esc(m.alt || '')}">`;

export function mediaHtml(list) {
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

export function initCarousels() {
  document.addEventListener('scroll', (e) => {
    const el = e.target;
    if (el.classList && el.classList.contains('car-track')) requestAnimationFrame(() => carSync(el));
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

  // przeciąganie myszą (na dotyku działa natywny swipe)
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
}
