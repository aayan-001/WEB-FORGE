import { store } from './api.js';
import { setLang } from './i18n.js';
import { navigate, loadConfig, paintShell, view, errMsg, tx, ic, $ } from './core.js';
import './customer.js';
import './worker.js';

setLang(store.get('rr_lang') || 'roman_urdu');

async function boot() {
  try {
    await loadConfig();
  } catch (e) {
    paintShell({});
    view().innerHTML = `<div class="empty">${ic('alert', 44)}<p class="bold" style="margin:10px 0">${errMsg(e)}</p><button class="btn primary" id="retry">${tx('retry')}</button></div>`;
    $('#retry').onclick = () => location.reload();
    return;
  }
  window.addEventListener('hashchange', navigate);
  navigate();
}
boot();
