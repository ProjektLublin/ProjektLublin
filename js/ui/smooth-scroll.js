/* =====================================================================
   ui/smooth-scroll.js – płynne przewijanie całej strony kółkiem myszy
   Własne, lekkie rozwiązanie (bez bibliotek): kółko przesuwa „cel", a strona
   dojeżdża do niego z wygaszaniem (lerp). Dotyk i klawiatura zostają natywne.
   Nie przechwytuje: Ctrl+kółko (zoom), gestów poziomych, zdarzeń już obsłużonych
   (galeria), przewijanych elementów (okno moda, menu), otwartego modala/lightboxa.
   API: scrollToElement(el), scrollToY(y), jumpTo(y)
   ===================================================================== */
import { root, reducedMotion } from '../core/dom.js';
import { isLightboxOpen } from './lightbox.js';

const EASE = 0.085;            // 0–1: mniej = bardziej „miękko" i dłużej (na klatkę 60 fps)
const LINE_PX = 40;            // 1 „linia" kółka (deltaMode 1) w pikselach

let enabled = false;
let target = 0, current = 0, lastSet = 0, last = 0, raf = 0;

const maxY = () => Math.max(0, root.scrollHeight - innerHeight);
const clamp = (v) => Math.max(0, Math.min(maxY(), v));
const setY = (y) => { lastSet = y; scrollTo({ top: y, behavior: 'instant' }); };

function frame(now) {
  const dt = Math.min(50, now - last) || 16.67;
  last = now;
  current += (target - current) * (1 - Math.pow(1 - EASE, dt / 16.67));
  if (Math.abs(target - current) < 0.5) current = target;
  setY(current);
  raf = current === target ? 0 : requestAnimationFrame(frame);
}

function start() {
  if (raf) return;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

// czy pod kursorem jest element, który sam może się jeszcze przewinąć w tym kierunku
function canScrollInside(el, dy) {
  for (; el && el !== document.body && el !== root; el = el.parentElement) {
    if (el.scrollHeight <= el.clientHeight + 1) continue;
    if (!/(auto|scroll)/.test(getComputedStyle(el).overflowY)) continue;
    if (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
  }
  return false;
}

function onWheel(e) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey) return;
  if (!e.deltaY || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  if (document.body.classList.contains('modal-open') || isLightboxOpen()) return;
  if (canScrollInside(e.target, e.deltaY)) return;

  e.preventDefault();
  const unit = e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? innerHeight : 1;
  if (!raf) target = current = scrollY;                 // start od realnej pozycji
  target = clamp(target + e.deltaY * unit);
  start();
}

// przewinięcie z zewnątrz (pasek, klawiatura, kotwica, dotyk) – zsynchronizuj i przerwij animację
function onScroll() {
  if (Math.abs(scrollY - lastSet) <= 2) return;         // to nasz własny ruch
  cancelAnimationFrame(raf); raf = 0;
  target = current = lastSet = scrollY;
}

/* ---------- API ---------- */
export function scrollToY(y) {
  if (!enabled) { scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); return; }
  if (!raf) current = scrollY;
  target = clamp(y);
  start();
}

// przewija tak, by element był tuż pod przyklejonym nagłówkiem
export function scrollToElement(el, offset = 88) {
  if (!el) return;
  scrollToY(el.getBoundingClientRect().top + scrollY - offset);
}

export function jumpTo(y = 0) {
  cancelAnimationFrame(raf); raf = 0;
  target = current = y;
  setY(y);
}

export function initSmoothScroll() {
  if (reducedMotion.matches) return;                    // szanujemy ustawienie systemu
  enabled = true;
  root.classList.add('js-smooth');                      // wyłącza natywne scroll-behavior (kolidowałoby z lerp)
  target = current = lastSet = scrollY;
  addEventListener('wheel', onWheel, { passive: false });
  addEventListener('scroll', onScroll, { passive: true });
}
