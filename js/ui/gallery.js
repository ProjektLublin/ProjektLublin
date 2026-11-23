/* =====================================================================
   ui/gallery.js – zakładka „Galeria": mozaika (duże zdjęcie + siatka)
   losowa kolejność, roving tabindex + nawigacja strzałkami po siatce,
   lightbox, placeholder dla brakujących plików, subtelne pojawianie się kart
   ---------------------------------------------------------------------
   Układ robi CSS (css/gallery.css). JS dba tylko o:
   – losowanie kolejności (Fisher–Yates),
   – dopasowanie ostatniego rzędu, żeby nie zostawały „dziury",
   – dostępność (jeden Tab = cała galeria, strzałki przesuwają fokus),
   – lightbox i obsługę brakujących zdjęć.
   ===================================================================== */
import { $, $$, reducedMotion } from '../core/dom.js';
import { openLightbox, isLightboxOpen } from './lightbox.js';

export function initGallery() {
  const hg = $('#hgal');
  if (!hg) return;
  const grid = $('.hgal-grid', hg);
  if (!grid) return;

  let cards = $$('.hgal-card', grid);
  if (!cards.length) return;
  const n = cards.length;

  /* ---------- losowa kolejność (Fisher–Yates), jedno wstawienie do DOM ---------- */
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  const frag = document.createDocumentFragment();
  cards.forEach(c => frag.appendChild(c));
  grid.appendChild(frag);

  /* ---------- roving tabindex: jeden Tab wchodzi w galerię, drugi z niej wychodzi ---------- */
  let current = cards[0];
  const setCurrent = (card) => {
    current = card;
    for (const c of cards) c.tabIndex = c === card ? 0 : -1;
  };
  setCurrent(current);
  grid.addEventListener('focusin', (e) => {
    const card = e.target.closest('.hgal-card');
    if (card && card !== current) setCurrent(card);
  });

  /* ---------- układ: wyróżnione zdjęcie + wyrównanie ostatniego rzędu ----------
     CSS ustawia --cols (4 / 3 / 2 / 1 kolumny) na siatce 12-kolumnowej.
     Pierwsza karta jest „featured" (2×2). Jeśli ostatni rząd jest niepełny,
     jego karty rozciągamy tak, aby wypełniły całą szerokość (12 / liczba kart). */
  let lastCols = 0;

  // ile kart ląduje w ostatnim, niepełnym rzędzie
  const tail = (cols, featured) => {
    const used = featured ? 1 + 2 * (cols - 2) : 0;   // featured + dwa rzędy obok niego
    const rest = n - used;
    return rest > 0 ? rest % cols : 0;
  };

  const layout = () => {
    const cols = parseInt(getComputedStyle(grid).getPropertyValue('--cols'), 10) || 1;
    if (cols === lastCols) return;                      // układ się nie zmienił – nic nie rób
    lastCols = cols;

    for (const c of cards) { c.style.removeProperty('--span'); c.style.removeProperty('--rspan'); }

    let featured = cols > 1 && n >= 5;
    let r = tail(cols, featured);
    // pojedyncza karta w ostatnim rzędzie wygląda jak baner – wolimy wtedy zrezygnować z featured
    if (featured && r === 1 && cols > 2 && tail(cols, false) !== 1) {
      featured = false;
      r = tail(cols, false);
    }
    grid.classList.toggle('no-feature', !featured);

    if (r > 0) {
      const span = String(12 / r);                      // r ∈ {1,2,3} → 12, 6, 4
      for (let k = 0; k < r; k++) {
        const card = cards[n - 1 - k];
        card.style.setProperty('--span', span);
        if (r === 1) card.style.setProperty('--rspan', '2');   // samotna karta: pełna szerokość, ale 2 rzędy wysokości
      }
    }
  };

  layout();
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(grid);   // też przy wejściu na zakładkę
  else addEventListener('resize', layout);

  /* ---------- brakujący plik: usuń <img> (pokaże się .ph) i zepchnij kartę na koniec ----------
     Dzięki temu duże zdjęcie zawsze jest prawdziwym zdjęciem, a nie placeholderem. */
  const demote = (card) => {
    card.setAttribute('aria-disabled', 'true');
    cards = cards.filter(c => c !== card);
    cards.push(card);
    grid.appendChild(card);
    if (current === card) setCurrent(cards[0]);
    lastCols = 0;
    layout();
  };
  grid.addEventListener('error', (e) => {
    const img = e.target;
    if (!img || img.tagName !== 'IMG') return;
    const card = img.closest('.hgal-card');
    img.remove();
    if (card && card.getAttribute('aria-disabled') !== 'true') demote(card);
  }, true);

  // obrazki, które zdążyły się zepsuć, zanim podpięliśmy nasłuch
  for (const card of [...cards]) {
    const img = card.querySelector('.media img');
    if (img && img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
      img.remove();
      demote(card);
    }
  }

  /* ---------- lightbox: klik / Enter / Spacja ---------- */
  let opener = null;
  const openCard = (card) => {
    const img = card.querySelector('.media img');
    if (!img) return;                                   // brak pliku – nie ma co powiększać
    opener = card;
    openLightbox(img, card.querySelector('h3')?.textContent.trim());
  };
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.hgal-card');
    if (card) openCard(card);
  });

  // po zamknięciu lightboxa fokus wraca na kartę, z której go otwarto
  const lbEl = $('#lightbox');
  if (lbEl && 'MutationObserver' in window) {
    new MutationObserver(() => {
      if (opener && !isLightboxOpen()) {
        const c = opener;
        opener = null;
        c.focus({ preventScroll: true });
      }
    }).observe(lbEl, { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- klawiatura: strzałki poruszają się po siatce zgodnie z jej wyglądem ---------- */
  const neighbor = (from, key) => {
    const ax = from.offsetLeft, ay = from.offsetTop, aw = from.offsetWidth, ah = from.offsetHeight;
    const acx = ax + aw / 2, acy = ay + ah / 2;
    let best = null, bestScore = Infinity;
    for (const c of cards) {
      if (c === from) continue;
      const bx = c.offsetLeft, by = c.offsetTop, bw = c.offsetWidth, bh = c.offsetHeight;
      let main, cross;
      if (key === 'ArrowRight')      { main = bx - (ax + aw); cross = Math.abs(by + bh / 2 - acy); }
      else if (key === 'ArrowLeft')  { main = ax - (bx + bw); cross = Math.abs(by + bh / 2 - acy); }
      else if (key === 'ArrowDown')  { main = by - (ay + ah); cross = Math.abs(bx + bw / 2 - acx); }
      else                           { main = ay - (by + bh); cross = Math.abs(bx + bw / 2 - acx); }
      if (main < -2) continue;                          // karta nie leży w tym kierunku
      const score = main + cross * 2;
      if (score < bestScore) { bestScore = score; best = c; }
    }
    return best;
  };

  grid.addEventListener('keydown', (e) => {
    const card = e.target.closest('.hgal-card');
    if (!card || e.target !== card) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openCard(card);
      return;
    }

    let target = null;
    if (e.key === 'Home') target = cards[0];
    else if (e.key === 'End') target = cards[n - 1];
    else if (e.key.startsWith('Arrow')) {
      target = neighbor(card, e.key);
      if (!target) {                                    // koniec rzędu: przejdź do poprzedniej / następnej karty
        const i = cards.indexOf(card);
        if (e.key === 'ArrowRight') target = cards[i + 1] || null;
        else if (e.key === 'ArrowLeft') target = cards[i - 1] || null;
      }
    }
    if (target) { e.preventDefault(); target.focus(); }  // brak celu (góra/dół na krańcu) – strona przewija się normalnie
  });

  /* ---------- subtelne pojawianie się kart (tylko gdy ruch jest dozwolony) ---------- */
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    grid.classList.add('is-reveal');
    const io = new IntersectionObserver((entries) => {
      let k = 0;
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        en.target.style.setProperty('--d', Math.min(k++, 6) * 70 + 'ms');   // lekkie opóźnienie kaskadowe
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    cards.forEach(c => io.observe(c));
  }
}
