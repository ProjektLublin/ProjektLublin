/* =====================================================================
   ui/gallery.js – zakładka „Galeria": poziomy pasek ze zdjęciami
   losowa kolejność, kropki, strzałki, kółko myszy, przeciąganie, lightbox
   ===================================================================== */
import { $, $$, reducedMotion } from '../core/dom.js';
import { openLightbox } from './lightbox.js';

export function initGallery() {
  const hg = $('#hgal');
  if (!hg) return;
  const track = $('.hgal-track', hg);
  const prevBtn = $('.hgal-btn.prev', hg);
  const nextBtn = $('.hgal-btn.next', hg);
  const dotsBox = $('#hgalDots');

  // losowa kolejność kart przy każdym załadowaniu (Fisher–Yates), jedno wstawienie do DOM
  const cards = $$('.hgal-card', track);
  if (!cards.length) return;
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  const frag = document.createDocumentFragment();
  cards.forEach(c => frag.appendChild(c));
  track.appendChild(frag);
  track.scrollLeft = 0;
  const n = cards.length;

  // brakujący plik -> usuń <img>, wtedy pokazuje się placeholder (.ph)
  track.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'IMG') e.target.remove();
  }, true);

  /* ---------- kropki (jedna na zdjęcie) ---------- */
  const DOT_MIN = 0.3, DOT_STEP = 0.17;       // skala najmniejszej kropki i spadek skali na każdą kropkę dystansu
  const dots = [];
  if (dotsBox) {
    const f = document.createDocumentFragment();
    cards.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hgal-dot';
      b.dataset.i = i;
      b.dataset.n = i + 1;
      b.dataset.i18nAttr = 'aria-label:common.photoNumber';   // tłumaczone razem z resztą strony
      b.setAttribute('aria-label', 'Zdjęcie ' + (i + 1));
      b.tabIndex = -1;
      f.appendChild(b);
      dots.push(b);
    });
    dotsBox.appendChild(f);
  }

  /* ---------- pomiary (liczone tylko przy zmianie rozmiaru, nie przy każdym scrollu) ---------- */
  let max = 0, pos = [], rests = [];
  let edgeStart = null, edgeEnd = null, activeIdx = -1;
  let pin = null;          // kropka wybrana kliknięciem (ostatnie karty nie mogą dojechać do lewej krawędzi)
  let driving = false;     // scrollem steruje JS – natywne zdarzenia scroll są wtedy pomijane

  const measure = () => {
    max = Math.max(0, track.scrollWidth - track.clientWidth);
    const x0 = cards[0].getBoundingClientRect().left;
    pos = cards.map(c => Math.min(max, c.getBoundingClientRect().left - x0));   // pozycje snapu kart
    rests = pos.filter(p => p < max - 2);                                        // unikalne punkty spoczynku
    rests.push(max);
    if (dotsBox) {
      const hide = max <= 2;                    // wszystko się mieści – kropki zbędne
      if (dotsBox.hidden !== hide) dotsBox.hidden = hide;
    }
  };

  // numer zdjęcia najbliższego bieżącej pozycji (na samym końcu zawsze ostatnie)
  const indexAt = (x) => {
    if (max <= 2) return 0;
    let best = n - 1, d = Math.abs(max - x);
    for (let i = 0; i < n && pos[i] < max - 2; i++) {
      const dd = Math.abs(pos[i] - x);
      if (dd < d) { d = dd; best = i; }
    }
    return best;
  };

  const setActive = (i) => {
    if (i === activeIdx) return;
    activeIdx = i;
    for (let k = 0; k < dots.length; k++) {
      const d = dots[k], on = k === i;
      d.style.setProperty('--s', Math.max(DOT_MIN, 1 - Math.abs(k - i) * DOT_STEP).toFixed(3));
      d.classList.toggle('on', on);
      d.tabIndex = on ? 0 : -1;                 // roving tabindex: jeden Tab = cały suwak
      if (on) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
    }
  };

  // jedyne miejsce, które dotyka DOM po zmianie pozycji; pisze tylko, gdy stan się zmienił
  const update = (x) => {
    const start = x <= 2, end = x >= max - 2;
    if (start !== edgeStart) { edgeStart = start; hg.classList.toggle('at-start', start); prevBtn.disabled = start; }
    if (end !== edgeEnd) { edgeEnd = end; hg.classList.toggle('at-end', end); nextBtn.disabled = end; }
    if (pin !== null && !driving && Math.abs(x - pos[pin]) >= 3) pin = null;   // użytkownik przewinął sam
    setActive(pin !== null ? pin : indexAt(x));
  };

  const relayout = () => { measure(); update(track.scrollLeft); };
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(track);   // też przy wejściu na zakładkę
  else addEventListener('resize', relayout);
  relayout();

  // natywny scroll (swipe, klawiatura, focus) – jedna aktualizacja na klatkę
  let tick = 0;
  track.addEventListener('scroll', () => {
    if (driving || tick) return;
    tick = requestAnimationFrame(() => { tick = 0; update(track.scrollLeft); });
  }, { passive: true });

  /* ---------- płynny ruch sterowany z JS (przyciski, kropki, kółko, wypuszczenie drag) ---------- */
  const clamp = (v) => Math.max(0, Math.min(max, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  // łagodny start i koniec – bez „szarpnięcia" przy ruszaniu ze spoczynku
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const nearestRest = (x) => rests.reduce((b, r) => (Math.abs(r - x) < Math.abs(b - x) ? r : b), rests[0]);
  const restFrom = (x, dir) => {
    let r;
    for (const p of rests) {
      if (dir > 0 ? p > x + 2 : p < x - 2) { r = p; if (dir > 0) break; }
    }
    return r;
  };

  let raf = 0, motion = null, settleT = 0, goal = 0;
  const hold = () => { driving = true; track.classList.add('is-free'); };       // snap + CSS smooth OFF na czas ruchu
  const release = () => { driving = false; track.classList.remove('is-free'); };
  const halt = () => { cancelAnimationFrame(raf); raf = 0; motion = null; clearTimeout(settleT); };

  const tweenTo = (to, ease = easeInOut, ms) => {
    halt();
    to = clamp(to);
    goal = to;
    const from = track.scrollLeft, dist = to - from;
    hold();
    if (Math.abs(dist) < 1 || reducedMotion.matches) {
      track.scrollLeft = to; release(); update(to); return;
    }
    ms = ms || Math.min(950, 480 + Math.abs(dist) * 0.18);
    motion = 'tween';
    const t0 = performance.now();
    const frame = (now) => {
      const p = Math.min(1, Math.max(0, (now - t0) / ms));
      const x = from + dist * ease(p);
      track.scrollLeft = x;
      update(x);
      if (p < 1) raf = requestAnimationFrame(frame);
      else { raf = 0; motion = null; track.scrollLeft = to; release(); update(to); }
    };
    raf = requestAnimationFrame(frame);
  };

  // dociąga do najbliższej karty; czas rośnie z dystansem, easeInOut = miękki start po wyhamowaniu kółka
  const settle = () => {
    const x = track.scrollLeft, to = nearestRest(x);
    tweenTo(to, easeInOut, Math.min(900, 420 + Math.abs(to - x) * 0.9));
  };

  // przyciski ← → (jedna karta; na końcu – ostatni, krótszy krok)
  const goRel = (dir) => {
    pin = null;
    const r = restFrom(motion === 'tween' ? goal : track.scrollLeft, dir);
    if (r !== undefined) tweenTo(r, easeInOut);
  };
  prevBtn.addEventListener('click', () => goRel(-1));
  nextBtn.addEventListener('click', () => goRel(1));

  // kliknięcie w kropkę -> przewiń do zdjęcia
  const goTo = (i) => {
    i = Math.max(0, Math.min(n - 1, i));
    pin = i;
    tweenTo(pos[i], easeInOut);
  };
  if (dotsBox) {
    dotsBox.addEventListener('click', (e) => {
      const b = e.target.closest('.hgal-dot');
      if (b) goTo(+b.dataset.i);
    });
    dotsBox.addEventListener('keydown', (e) => {
      const b = e.target.closest('.hgal-dot');
      if (!b) return;
      const i = +b.dataset.i;
      const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null;
      if (to === null) return;
      e.preventDefault();
      const k = Math.max(0, Math.min(n - 1, to));
      dots[k].focus();
      goTo(k);
    });
  }

  // kółko myszy nad galerią -> przewijanie w poziomie (gładkie, z bezwładnością)
  const WHEEL_EASE = 0.1;        // mniej = miększe wygaszanie (było 0.18 – twarde)
  const WHEEL_IDLE = 150;        // ms ciszy po kółku, zanim galeria dociągnie do karty
  let wTarget = 0, wCur = 0, wLast = 0;
  const wheelFrame = (now) => {
    const dt = Math.min(48, now - wLast) || 16;
    wLast = now;
    wCur += (wTarget - wCur) * (reducedMotion.matches ? 1 : 1 - Math.pow(1 - WHEEL_EASE, dt / 16.67));
    if (Math.abs(wTarget - wCur) < 0.4) wCur = wTarget;
    track.scrollLeft = wCur;
    update(wCur);
    if (wCur === wTarget) { raf = 0; settleT = setTimeout(settle, WHEEL_IDLE); }   // po wyhamowaniu – dociągnij do karty
    else raf = requestAnimationFrame(wheelFrame);
  };
  hg.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;                                   // zoom przeglądarki
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;     // natywny gest poziomy (touchpad)
    if (!e.deltaY) return;
    if (max <= 0) return;
    const wheeling = motion === 'wheel';
    const x = wheeling ? wTarget : track.scrollLeft;
    if ((x <= 0 && e.deltaY < 0) || (x >= max - 1 && e.deltaY > 0)) return;   // na krańcach strona przewija się normalnie
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? track.clientWidth : 1;
    pin = null;
    if (!wheeling) {
      halt(); hold();
      motion = 'wheel';
      wCur = wTarget = track.scrollLeft;
    }
    clearTimeout(settleT);
    wTarget = clamp(wTarget + e.deltaY * unit);
    if (!raf) { wLast = performance.now(); raf = requestAnimationFrame(wheelFrame); }
  }, { passive: false });

  // przeciąganie myszą (na dotyku działa natywny swipe)
  let drag = null, suppress = false, dragRaf = 0;
  const applyDrag = () => {
    dragRaf = 0;
    if (!drag) return;
    const x = clamp(drag.s - drag.dx);
    track.scrollLeft = x;
    update(x);
  };
  const onMove = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 6) return;
      drag.moved = true;
      hold();
      track.classList.add('is-drag');
    }
    const dt = e.timeStamp - drag.lt;                        // wygładzona prędkość do „rzutu" po puszczeniu
    if (dt > 0) {
      drag.v = drag.v * 0.6 + ((e.clientX - drag.lx) / dt) * 0.4;
      drag.lx = e.clientX; drag.lt = e.timeStamp;
    }
    drag.dx = dx;
    if (!dragRaf) dragRaf = requestAnimationFrame(applyDrag);   // jeden zapis scrollLeft na klatkę
  };
  const endDrag = (e) => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', endDrag);
    document.removeEventListener('pointercancel', endDrag);
    if (!drag) return;
    if (dragRaf) { cancelAnimationFrame(dragRaf); applyDrag(); }
    const d = drag;
    drag = null;
    if (!d.moved) { if (driving) settle(); return; }
    suppress = true;
    setTimeout(() => { suppress = false; }, 80);
    track.classList.remove('is-drag');
    const fling = e.timeStamp - d.lt < 80 ? -d.v * 160 : 0;     // lekki rzut zgodnie z kierunkiem ruchu
    tweenTo(nearestRest(track.scrollLeft + fling), easeOut, 620);   // po rzucie jest prędkość – easeOut pasuje
  };
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') {                         // dotyk: przerwij animację, dalej natywny swipe
      if (driving) { halt(); release(); }
      return;
    }
    if (e.button !== 0) return;
    halt();
    pin = null;
    drag = { x: e.clientX, s: track.scrollLeft, dx: 0, moved: false, v: 0, lx: e.clientX, lt: e.timeStamp };
    document.addEventListener('pointermove', onMove);        // nasłuch tylko na czas przeciągania
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);
  });

  // klik / Enter / Spacja -> lightbox
  const openCard = (card) => {
    const img = card.querySelector('.media img');
    if (!img) return;                                        // brak pliku – nie ma co powiększać
    openLightbox(img, card.querySelector('h3')?.textContent.trim());
  };
  track.addEventListener('click', (e) => {
    if (suppress) { e.preventDefault(); e.stopPropagation(); return; }
    const card = e.target.closest('.hgal-card');
    if (card) openCard(card);
  });
  track.addEventListener('keydown', (e) => {
    const card = e.target.closest('.hgal-card');
    if (!card) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(card); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const sib = e.key === 'ArrowRight' ? card.nextElementSibling : card.previousElementSibling;
      if (sib && sib.classList.contains('hgal-card')) { e.preventDefault(); sib.focus(); }
    }
  });
}
