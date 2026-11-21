/* =====================================================================
   features/posts.js – Aktualności z json/posts.json (najnowsze na górze)
   ===================================================================== */
import { $, esc, fmt, fmtDate, str, safeUrl, safeMedia, postTime } from '../core/dom.js';
import { t, pick, onLangChange } from '../core/i18n.js';
import { pageButtons } from '../ui/pager.js';
import { scrollToElement } from '../ui/smooth-scroll.js';

const POSTS_PER_PAGE = 4;
let postsData = [], postsPage = 1, postsFailed = false;

function renderPosts() {
  const list = $('#postsList'), pager = $('#postsPager');
  if (!list) return;
  if (postsFailed) {
    list.innerHTML = `<div class="mod-empty">${esc(t('home.loadError'))}</div>`;
    if (pager) pager.innerHTML = '';
    return;
  }
  const pagesCount = Math.max(1, Math.ceil(postsData.length / POSTS_PER_PAGE));
  postsPage = Math.min(Math.max(1, postsPage), pagesCount);
  const slice = postsData.slice((postsPage - 1) * POSTS_PER_PAGE, postsPage * POSTS_PER_PAGE);
  list.innerHTML = slice.map(p => {
    const img = p.image ? `<div class="media pm"><img decoding="async" src="${esc(p.image)}" alt="${esc(t('common.postThumbnail'))}"></div>` : '';
    const body = `${img}<div class="body"><div class="meta"><svg class="icon"><use href="#i-cal"/></svg>${esc(fmtDate(p.date))}</div><h3>${fmt(pick(p, 'title'))}</h3><p>${fmt(pick(p, 'text'))}</p></div>`;
    return p.url
      ? `<a class="card post" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${body}</a>`
      : `<article class="card post">${body}</article>`;
  }).join('');
  if (pager) pageButtons(pager, pagesCount, postsPage, (n) => { postsPage = n; renderPosts(); scrollToElement(list); });
}

const sanitizePost = (p, i) => {
  if (!p || typeof p !== 'object') return null;
  const title = str(p.title, 200); if (!title) return null;
  return { _i: i, date: str(p.date, 16), title, title_en: str(p.title_en, 200), text: str(p.text, 4000), text_en: str(p.text_en, 4000), url: safeUrl(p.url), image: safeMedia(p.image) };
};

export async function loadPosts() {
  try {
    const res = await fetch('json/posts.json', { cache: 'no-cache', credentials: 'omit' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const arr = Array.isArray(data) ? data : data.posts;
    if (!Array.isArray(arr)) throw new Error('Invalid JSON');
    postsData = arr.slice(0, 500).map(sanitizePost).filter(Boolean)
      .sort((a, b) => (postTime(b.date) - postTime(a.date)) || (a._i - b._i));
    renderPosts();
  } catch (err) {
    console.error('json/posts.json:', err);
    postsFailed = true;
    renderPosts();
  }
}

export function initPosts() {
  onLangChange(renderPosts);
}
