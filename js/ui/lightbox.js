/* =====================================================================
   ui/lightbox.js – powiększanie zdjęć (używa galeria)
   ===================================================================== */
import { $ } from '../core/dom.js';

const lb = $('#lightbox');
const lbImg = lb.querySelector('img');

export const isLightboxOpen = () => lb.classList.contains('open');
export const closeLightbox = () => lb.classList.remove('open');

export function openLightbox(img, title) {
  lbImg.src = img.src;
  lbImg.alt = title || '';
  lb.classList.add('open');
}

export function initLightbox() {
  lb.addEventListener('click', closeLightbox);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
}
