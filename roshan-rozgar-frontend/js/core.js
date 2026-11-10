// Shared state, helpers, shell (top bar / tab bar), router and small UI primitives.
import { api, auth, store } from './api.js';
import { tx, pick, setLang, getLang, LANG_IDS, areaName } from './i18n.js';
import { ic } from './icons.js';
import { startListening, speechSupported, stopSpeaking } from './speech.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const view = () => $('#view');

// ------------------------------------------------------------------ state
export const S = {
  config: null,
  area_id: store.get('rr_area') || 'g-10',
  geo: null, // {lat,lng} from the browser, session only
  draft: { text: '', trade_id: null, understanding: null },
  filters: { available: false, nearest: true, rating: false },
};

export async function loadConfig() {
  if (S.config) return S.config;
  S.config = await api('GET', '/api/config');
  if (!store.get('rr_area')) S.area_id = S.config.default_area_id || S.area_id;
  return S.config;
}
export const areaById = (id) => S.config?.areas.find((a) => a.id === id);
export const tradeById = (id) => S.config?.trades.find((t) => t.id === id);
export const locParams = () => (S.geo ? { lat: S.geo.lat, lng: S.geo.lng } : { area_id: S.area_id });

export function nearLabel() {
  if (S.geo) return tx('my_location');
  const a = areaName(areaById(S.area_id)) || S.area_id;
  return getLang() === 'english' ? `${tx('near')} ${a}` : `${a} ${tx('near')}`;
}

// ------------------------------------------------------------------ errors / toast
export function errMsg(e) {
  if (e?.code === 'NETWORK') return tx('err_network');
  if (getLang() === 'urdu' && e?.message_ur) return e.message_ur;
  return e?.message && !/^Error \d+$/.test(e.message) ? e.message : tx('err_generic');
}
export function toast(msg, type = '') {
  const root = $('#toast-root');
  const el = document.createElement('div');
  el.className = `toast ${type}`; el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}
export const toastErr = (e) => toast(errMsg(e), 'err');

// ------------------------------------------------------------------ bottom sheet
export function openSheet(inner, onMount) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="sheet-back" role="dialog" aria-modal="true"><div class="sheet"><div class="grab"></div>${inner}</div></div>`;
  const back = $('.sheet-back', root);
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  const el = $('.sheet', root);
  onMount?.(el, close);
  return { el, close };
}

// ------------------------------------------------------------------ timers (cleared on every navigation)
const timers = [];
export function every(fn, ms) { const id = setInterval(fn, ms); timers.push(id); return id; }
export function clearTimers() { while (timers.length) clearInterval(timers.pop()); stopSpeaking(); }

// ------------------------------------------------------------------ router
const routes = [];
export const route = (re, fn) => routes.push([re, fn]);
export const go = (p) => { if (location.hash === `#${p}`) navigate(); else location.hash = `#${p}`; };
let navToken = 0;
export async function navigate() {
  const my = ++navToken;
  clearTimers();
  $('#sheet-root').innerHTML = '';
  const path = location.hash.slice(1) || '/';
  for (const [re, fn] of routes) {
    const m = path.match(re);
    if (!m) continue;
    try { await fn(...m.slice(1).map(decodeURIComponent), () => my === navToken); } catch (e) { if (my === navToken) fatal(e); }
    window.scrollTo(0, 0);
    return;
  }
  go('/');
}
function fatal(e) {
  if (e?.code === 'AUTH_REQUIRED' || e?.status === 401) { auth.clear(); go('/role'); return; }
  paintShell({});
  view().innerHTML = `<div class="empty">${ic('alert', 44)}<p class="bold" style="margin:10px 0">${esc(errMsg(e))}</p><button class="btn primary" id="retry">${esc(tx('retry'))}</button></div>`;
  $('#retry').onclick = () => navigate();
}

// ------------------------------------------------------------------ shell
export function paintShell({ title = '', back = null, nav = null, narrow = false, worker = false } = {}) {
  const tb = $('#topbar');
  const items = nav === 'customer' ? [
    { href: '/home', icon: 'home', label: tx('nav_home') },
    { href: '/jobs', icon: 'briefcase', label: tx('my_jobs') },
  ] : [];
  const cur = location.hash.slice(1);
  const langNative = (S.config?.languages.find((l) => l.id === getLang()) || {}).native || '';
  tb.innerHTML = `
    ${back ? `<a class="icon-btn" href="#${back}" aria-label="${esc(tx('back_home'))}">${ic('back', 22, 'flip')}</a>` : ''}
    ${back && title ? `<div class="title">${esc(title)}</div>` : `<a class="brand" href="#/"><span class="brand-mark">${ic('wrench', 18)}</span><span>${esc(tx('brand'))}</span></a>`}
    ${items.length ? `<nav class="top-nav">${items.map((i) => `<a href="#${i.href}" class="${cur.startsWith(i.href) ? 'on' : ''}">${ic(i.icon, 18)} ${esc(i.label)}</a>`).join('')}</nav>` : ''}
    <div class="spacer"></div>
    ${worker ? `<button class="icon-btn" id="logout-btn" aria-label="${esc(tx('logout'))}">${ic('logout', 20, 'flip')}</button>` : ''}
    <button class="lang-btn" id="lang-btn" aria-label="${esc(tx('choose_lang'))}">${ic('globe', 18)}<span>${esc(langNative)}</span></button>`;
  $('#lang-btn').onclick = openLanguageSheet;
  if (worker) $('#logout-btn').onclick = () => { auth.clear('worker'); auth.role = null; go('/role'); };

  const tab = $('#tabbar');
  tab.innerHTML = items.map((i) => `<a href="#${i.href}" class="${cur.startsWith(i.href) ? 'on' : ''}">${ic(i.icon, 22)}<span>${esc(i.label)}</span></a>`).join('');
  const v = view();
  v.classList.toggle('narrow', narrow);
  v.classList.toggle('has-no-tabbar', !items.length);
}

export function openLanguageSheet() {
  const opts = S.config?.languages || [{ id: 'roman_urdu', native: 'Apni zubaan' }, { id: 'urdu', native: 'اردو' }, { id: 'english', native: 'English' }];
  openSheet(`<h2 class="h2" style="margin-bottom:12px">${esc(tx('choose_lang'))}</h2>
    <div class="stack">${opts.map((l) => `<button class="choice ${l.id === getLang() ? 'on' : ''}" data-l="${l.id}"><div class="grow"><div class="big">${esc(l.native)}</div><div class="muted small">${esc(l.label)}</div></div><span class="tick">${ic('check', 16)}</span></button>`).join('')}</div>`,
  (el, close) => {
    $$('[data-l]', el).forEach((b) => { b.onclick = () => { applyLang(b.dataset.l); close(); navigate(); }; });
  });
}
export function applyLang(l) { setLang(l); store.set('rr_lang', l); }

// ------------------------------------------------------------------ voice input binding
const MIC_ERR = { denied: 'mic_denied', unsupported: 'mic_unsupported', nospeech: 'mic_nospeech', network: 'mic_network', secure: 'mic_secure', stt_unavailable: 'mic_unsupported', failed: 'err_generic' };

// Wires a mic button: tap to start, tap again to stop. Interim text streams into onInterim, final into onFinal.
export function bindMic(btn, { onInterim, onFinal, labelEl, idleText } = {}) {
  const setLabel = (t, live) => { if (labelEl) { labelEl.textContent = t; labelEl.classList.toggle('live', !!live); } };
  const idle = idleText ?? (labelEl ? labelEl.textContent : '');
  let ctl = null;
  btn.addEventListener('click', () => {
    if (ctl) { ctl.stop(); return; }
    stopSpeaking();
    btn.classList.add('listening'); btn.setAttribute('aria-pressed', 'true');
    setLabel(tx('listening'), true);
    ctl = startListening({
      language: getLang(),
      onInterim, onFinal,
      onTranscribing: () => setLabel(tx('transcribing'), false),
      onError: (code) => toast(tx(MIC_ERR[code] || 'err_generic'), 'err'),
      onEnd: () => { ctl = null; btn.classList.remove('listening'); btn.setAttribute('aria-pressed', 'false'); setLabel(idle, false); },
    });
  });
  if (!speechSupported) btn.title = tx('mic_unsupported');
}

// ------------------------------------------------------------------ small html builders
export const TRADE_CLASS = (t) => (t ? `t-${t.id || t}` : '');
export const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
export function stars(n, size = 16) {
  const r = Math.round(n || 0);
  return `<span class="stars" aria-label="${n} / 5">${[1, 2, 3, 4, 5].map((i) => ic('star', size, i <= r ? '' : 'off')).join('')}</span>`;
}
export const spinner = () => '<div class="spinner" role="progressbar"></div>';
export const timeOf = (iso) => { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
export const srcBadge = (src) => `<span class="badge ${src === 'ai' ? 'brand' : 'ghost'}">${src === 'ai' ? ic('sparkles', 12) : ''} ${esc(tx(src === 'ai' ? 'src_ai' : 'src_fallback'))}</span>`;

// ------------------------------------------------------------------ session helpers
export async function ensureCustomer() {
  if (auth.token('customer')) { auth.role = 'customer'; return; }
  const r = await api('POST', '/api/customers', { language: getLang(), ...locParams() }, { token: null });
  auth.setToken('customer', r.token); auth.role = 'customer';
}
// run an authenticated call; if the stored session is stale (e.g. DB was reset) start a fresh one once
export async function withCustomer(fn) {
  await ensureCustomer();
  try { return await fn(); } catch (e) {
    if (e.code === 'AUTH_REQUIRED' || e.status === 401) { auth.clear('customer'); await ensureCustomer(); return fn(); }
    throw e;
  }
}

export function useMyLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { toast(tx('geo_denied'), 'err'); resolve(false); return; }
    toast(tx('locating'));
    navigator.geolocation.getCurrentPosition(
      (p) => { S.geo = { lat: p.coords.latitude, lng: p.coords.longitude }; resolve(true); },
      () => { toast(tx('geo_denied'), 'err'); resolve(false); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  });
}

export function openAreaSheet(onChange) {
  const areas = S.config.areas;
  openSheet(`<h2 class="h2" style="margin-bottom:12px">${esc(tx('pick_area'))}</h2>
    <button class="btn sun block" id="geo" style="margin-bottom:14px">${ic('locate', 18)} ${esc(tx('my_location'))}</button>
    <div class="area-grid">${areas.map((a) => `<button class="chip ${!S.geo && a.id === S.area_id ? 'on' : ''}" data-a="${a.id}">${esc(areaName(a))}</button>`).join('')}</div>`,
  (el, close) => {
    $('#geo', el).onclick = async () => { if (await useMyLocation()) { close(); onChange?.(); } };
    $$('[data-a]', el).forEach((b) => { b.onclick = () => { S.area_id = b.dataset.a; S.geo = null; store.set('rr_area', S.area_id); close(); onChange?.(); }; });
  });
}

export function confirmSheet(text, yesLabel, onYes) {
  openSheet(`<p class="h2 center" style="margin:6px 0 18px">${esc(text)}</p>
    <div class="row"><button class="btn ghost" style="flex:1" id="n">${esc(tx('no'))}</button><button class="btn primary" style="flex:1" id="y">${esc(yesLabel || tx('yes'))}</button></div>`,
  (el, close) => { $('#n', el).onclick = close; $('#y', el).onclick = () => { close(); onYes(); }; });
}

export { api, auth, store, tx, pick, ic, getLang };
