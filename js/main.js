/* =====================================================================
   Projekt Lublin – js/main.js (punkt wejścia, tylko składa moduły)
   Mapa plików: patrz PROJECT_MAP.md
   Kolejność ma znaczenie: moduły rejestrują się w onLangChange / onRoute w tej kolejności.
   ===================================================================== */
import { initSmoothScroll } from './ui/smooth-scroll.js';
import { initHeader } from './ui/header.js';
import { initLightbox } from './ui/lightbox.js';
import { initCarousels } from './ui/carousel.js';
import { initGallery } from './ui/gallery.js';
import { initRouter } from './core/router.js';
import { initI18n } from './core/i18n.js';
import { initPosts, loadPosts } from './features/posts.js';
import { initProgress, loadProgress } from './features/progress.js';
import { initMods, loadMods } from './features/mods.js';
import { initModModal } from './features/mod-modal.js';
import { initCoop } from './features/coop.js';

initSmoothScroll();
initHeader();
initLightbox();
initCarousels();
initGallery();
initPosts();
initProgress();
initMods();
initModModal();
initCoop();

initRouter();                 // strona od razu, bez czekania na dane

(async () => {
  await initI18n();           // najpierw język, dopiero potem dane (render korzysta z t())
  loadPosts();
  loadMods();
  loadProgress();
})();
