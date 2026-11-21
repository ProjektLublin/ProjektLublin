/* =====================================================================
   ui/header.js – motyw, menu „więcej" (język/motyw) i hamburger na mobile
   ===================================================================== */
import { $, $$, root } from '../core/dom.js';
import { onRoute } from '../core/router.js';

export function initHeader() {
  /* ---------- Motyw (ciemny / jasny) ---------- */
  try { const saved = localStorage.getItem('pl-theme'); if (saved === 'dark' || saved === 'light') root.dataset.theme = saved; } catch (e) {}
  const toggleTheme = () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('pl-theme', root.dataset.theme); } catch (e) {}
  };
  $$('#themeBtn, [data-act="theme"]').forEach(b => b.addEventListener('click', toggleTheme));

  /* ---------- Jedno menu: język + motyw ---------- */
  const moreBtn = $('#moreBtn'), morePanel = $('#morePanel');
  const setMore = (open) => {
    morePanel.classList.toggle('open', open);
    moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setMore(!morePanel.classList.contains('open'));
  });
  morePanel.addEventListener('click', (e) => { if (e.target.closest('.more-item')) setMore(false); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#moreMenu')) setMore(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMore(false); });

  /* ---------- Menu mobilne (hamburger) ---------- */
  const nav = $('#nav'), menuBtn = $('#menuBtn');
  const menuIcon = (open) => menuBtn.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
  menuBtn.addEventListener('click', () => {
    nav.classList.toggle('open');
    menuIcon(nav.classList.contains('open'));
  });

  // po każdej zmianie strony zamknij oba menu
  onRoute(() => {
    nav.classList.remove('open');
    menuIcon(false);
    setMore(false);
  });
}
