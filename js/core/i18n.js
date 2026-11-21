/* =====================================================================
   core/i18n.js – tłumaczenia (json/pl.json, json/en.json)
   Statyczny HTML: data-i18n="sekcja.klucz"  |  data-i18n-attr="atrybut:sekcja.klucz;atrybut2:klucz2"
   Dynamiczny JS:  t('sekcja.klucz', { param })  |  tn('klucz.liczbaMnoga', n)
   Dane z JSON-ów (posts/mods/progress): pole *_en, a gdy go brak – polski oryginał (pick)
   Moduły odświeżają swoje treści po zmianie języka przez onLangChange(fn).
   ===================================================================== */
import { $, $$, root } from './dom.js';

export const LANGS = ['pl', 'en'];
export const DEFAULT_LANG = 'pl';
const LANG_KEY = 'pl-lang';
const FLAGS = { pl: '#i-flag-pl', en: '#i-flag-gb' };   // przycisk pokazuje flagę języka, NA KTÓRY przełączy
const bundles = {};      // lang -> wczytany JSON
const loading = {};      // lang -> Promise (jedno żądanie na język)
const listeners = [];
let langSeq = 0;         // ignoruje spóźnione odpowiedzi przy szybkim klikaniu

export let currentLang = DEFAULT_LANG;   // „żywy" import – zawsze aktualny język

export const onLangChange = (fn) => { listeners.push(fn); };

function loadLanguage(lang) {
  if (!loading[lang]) {
    loading[lang] = fetch(`json/${lang}.json`, { cache: 'no-cache', credentials: 'omit' })
      .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(data => (bundles[lang] = data))
      .catch(err => { console.error(`json/${lang}.json:`, err); delete loading[lang]; return null; });
  }
  return loading[lang];
}

const lookup = (bundle, key) => key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), bundle);
// bieżący język -> PL -> (w t/tn) sam klucz
const resolve = (key) => lookup(bundles[currentLang], key) ?? lookup(bundles[DEFAULT_LANG], key);
const fill = (s, params) => s.replace(/\{(\w+)\}/g, (m, k) => (params && params[k] != null ? params[k] : m));

export function t(key, params) {
  const v = resolve(key);
  return typeof v === 'string' ? fill(v, params) : key;
}

// liczba mnoga według reguł języka (PL: one/few/many/other, EN: one/other); {n} = liczba
export function tn(key, n, params) {
  const forms = resolve(key);
  if (!forms || typeof forms !== 'object') return key;
  const form = forms[new Intl.PluralRules(currentLang).select(n)] ?? forms.other;
  return typeof form === 'string' ? fill(form, { n, ...params }) : key;
}

// pole z danych w bieżącym języku (title_en, text_en…) albo polski oryginał
export const pick = (obj, field) => (currentLang !== DEFAULT_LANG && obj[`${field}_${currentLang}`]) || obj[field];

export function applyTranslations(scope = document) {
  $$('[data-i18n]', scope).forEach(el => { el.textContent = t(el.dataset.i18n, el.dataset); });
  $$('[data-i18n-attr]', scope).forEach(el => {
    el.dataset.i18nAttr.split(';').forEach(pair => {
      const i = pair.indexOf(':');
      if (i > 0) el.setAttribute(pair.slice(0, i).trim(), t(pair.slice(i + 1).trim(), el.dataset));
    });
  });
}

export async function setLang(lang) {
  if (!LANGS.includes(lang)) lang = DEFAULT_LANG;
  const seq = ++langSeq;
  const [bundle] = await Promise.all([loadLanguage(lang), loadLanguage(DEFAULT_LANG)]);
  if (seq !== langSeq || !bundle) return;   // nowsze kliknięcie wygrało / brak pliku -> zostaje poprzedni język

  currentLang = lang;
  root.lang = lang;
  document.title = t('meta.title');
  $('meta[name="description"]')?.setAttribute('content', t('meta.description'));

  const next = LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
  $$('.lang-label').forEach(el => { el.textContent = next.toUpperCase(); });
  $$('.lang-flag use').forEach(u => u.setAttribute('href', FLAGS[next]));

  applyTranslations();
  listeners.forEach(fn => fn(lang));
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
}

// desktop (#langBtn w menu „more") ORAZ mobile ([data-act="lang"] w .nav-extra hamburgera)
const toggleLang = () => setLang(LANGS[(LANGS.indexOf(currentLang) + 1) % LANGS.length]);

export async function initI18n() {
  $$('#langBtn, [data-act="lang"]').forEach(b => b.addEventListener('click', toggleLang));
  let saved = DEFAULT_LANG;
  try { const v = localStorage.getItem(LANG_KEY); if (LANGS.includes(v)) saved = v; } catch (e) {}
  await setLang(saved);
}
