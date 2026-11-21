/* =====================================================================
   core/router.js – strony po #hash
   Inne moduły podpinają się przez onRoute(fn) – fn(pageElement) leci przy każdej zmianie strony.
   ===================================================================== */
import { $, $$ } from './dom.js';
import { jumpTo } from '../ui/smooth-scroll.js';

const pages = $$('.page');
const hooks = [];

export const onRoute = (fn) => { hooks.push(fn); };

export function route() {
  const id = (location.hash || '#glowna').slice(1);
  const target = pages.find(p => p.id === 'page-' + id) || $('#page-glowna');
  pages.forEach(p => p.classList.toggle('show', p === target));
  $$('.nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + target.id.slice(5)));
  hooks.forEach(fn => fn(target));
  jumpTo(0);   // zmiana zakładki = od razu na górę (bez animacji)
}

export function initRouter() {
  addEventListener('hashchange', route);
  route();
}
