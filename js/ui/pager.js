/* =====================================================================
   ui/pager.js – przyciski paginacji (aktualności, mody)
   ===================================================================== */
import { t } from '../core/i18n.js';

export function pageButtons(pager, pagesCount, cur, go) {
  pager.innerHTML = '';
  if (pagesCount <= 1) return;
  const mk = (html, page, o = {}) => {
    const b = document.createElement('button');
    b.innerHTML = html; b.disabled = !!o.disabled;
    if (o.on) b.classList.add('on');
    if (o.label) b.setAttribute('aria-label', o.label);
    b.addEventListener('click', () => go(page));
    return b;
  };
  pager.append(mk('<svg class="icon"><use href="#i-left"/></svg>', cur - 1, { disabled: cur === 1, label: t('common.prevPage') }));
  for (let i = 1; i <= pagesCount; i++) pager.append(mk(String(i), i, { on: i === cur }));
  pager.append(mk('<svg class="icon"><use href="#i-right"/></svg>', cur + 1, { disabled: cur === pagesCount, label: t('common.nextPage') }));
}
