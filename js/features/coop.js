/* =====================================================================
   features/coop.js – zakładka WSPÓŁPRACA: animacje wejścia/wyjścia sekcji „Wymagania"
   Fade/slide-in przy wjeździe w viewport (scroll w dół),
   fade/slide-out przy wyjeździe w górę (scroll w górę).
   Tilt/depth (data-tilt) działa niezależnie przez translate (CSS), więc nie koliduje.
   ===================================================================== */
export function initCoop() {
  const items = document.querySelectorAll('.req-item');
  if (!items.length) return;

  // Fallback dla starszych przeglądarek – wszystko widoczne od razu
  if (!('IntersectionObserver' in window)) {
    items.forEach(i => i.classList.add('in'));
    return;
  }

  // Śledzenie kierunku scrolla (z małym progiem, żeby mikro-ruch nie pstrykał)
  let lastY = window.scrollY, goingUp = false;
  window.addEventListener('scroll', () => {
    goingUp = window.scrollY < lastY - 2;
    lastY = window.scrollY;
  }, { passive: true });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');          // wjazd w viewport → zawsze fade-in
      } else if (goingUp) {
        e.target.classList.remove('in');       // wyjazd w górę → fade-out (re-trigger)
      }
      // Wyjazd w dół (przewinięcie obok) → zostawiamy „in" — element ma pozostać wizualnie obecny
    });
  }, {
    rootMargin: '-6% 0px -6% 0px',
    threshold: 0.12
  });

  items.forEach(i => io.observe(i));
}
