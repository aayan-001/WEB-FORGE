// Worker journey: voice onboarding (no form) -> confirm profile -> dashboard (availability + "Naya kaam" inbox) -> chat.
import {
  S, $, $$, esc, view, route, go, paintShell, api, auth, tx, pick, ic, getLang, toast, toastErr, bindMic, spinner, initials,
  loadConfig, every, srcBadge,
} from './core.js';
import { wname, areaName, num } from './i18n.js';
import { speak } from './speech.js';
import { chatView } from './chat.js';

const W = (method, path, body) => api('GET' === method ? 'GET' : method, path, body, { role: 'worker' });

// entry: decide where a worker should land
route(/^\/w\/entry$/, async () => {
  await loadConfig();
  if (auth.token('worker')) {
    try {
      const { worker } = await W('GET', '/api/workers/me');
      auth.role = 'worker';
      return go(worker.profile_confirmed ? '/w/home' : '/w/confirm');
    } catch { auth.clear('worker'); }
  }
  go('/w/start');
});

// ------------------------------------------------------------------ voice onboarding
route(/^\/w\/start$/, async () => {
  await loadConfig();
  paintShell({ back: '/role', title: tx('i_am_worker'), narrow: true });
  let chosen = null;
  view().innerHTML = `
    <div class="stack" style="gap:18px">
      <div class="center"><h1 class="h1">${esc(tx('w_onboard_title'))}</h1><p class="muted" style="margin-top:4px">${esc(tx('w_onboard_hint'))}</p></div>
      <div class="mic-wrap"><button class="mic" id="mic" aria-pressed="false" aria-label="${esc(tx('tap_to_speak'))}">${ic('mic', 46)}</button><div class="mic-label" id="ml">${esc(tx('tap_to_speak'))}</div></div>
      <textarea id="tr" class="field" rows="3" placeholder="${esc(tx('w_example'))}"></textarea>
      <div><div class="h3" style="margin-bottom:8px">${esc(tx('pick_trade'))}</div>
        <div class="trade-grid">${S.config.trades.map((t) => `<button class="trade t-${t.id}" data-t="${t.id}"><span class="tb">${ic(t.icon, 22)}</span><span>${esc(pick(t))}</span></button>`).join('')}</div></div>
      <button class="btn primary block" id="make">${ic('sparkles', 18)} ${esc(tx('make_profile'))}</button>
      <div id="demo"></div>
    </div>`;
  bindMic($('#mic'), { labelEl: $('#ml'), onInterim: (t) => { $('#tr').value = t; }, onFinal: (t) => { $('#tr').value = t; submit(); } });
  $$('[data-t]').forEach((b) => { b.onclick = () => { chosen = b.dataset.t; $$('[data-t]').forEach((x) => x.classList.toggle('on', x === b)); }; });
  $('#make').onclick = () => submit();

  async function submit() {
    const transcript = $('#tr').value.trim();
    if (!transcript && !chosen) return toast(tx('w_onboard_hint'), 'err');
    const btn = $('#make'); btn.disabled = true;
    try {
      auth.clear('worker'); // a brand-new profile: never merge into an old demo/worker session
      const r = await api('POST', '/api/workers/onboard', {
        transcript: transcript || undefined, trade_id: chosen || undefined, language: getLang(), ...(S.geo ? { lat: S.geo.lat, lng: S.geo.lng } : { area_id: S.area_id }),
      }, { token: null });
      if (r.needs?.includes('trade')) { toast(tx('pick_trade'), 'err'); $('.trade-grid').scrollIntoView({ behavior: 'smooth' }); btn.disabled = false; return; }
      if (r.token) { auth.setToken('worker', r.token); auth.role = 'worker'; }
      go('/w/confirm');
    } catch (e) { toastErr(e); btn.disabled = false; }
  }

  // demo workers: one-tap login (backend DEMO_MODE)
  try {
    const d = await api('GET', '/api/demo/workers', undefined, { token: null });
    $('#demo').innerHTML = `<div class="h3 center" style="margin:6px 0 10px">— ${esc(tx('or'))} —</div><div class="h3" style="margin-bottom:8px">${esc(tx('demo_login'))}</div>
      <div class="chips">${d.workers.map((w) => `<button class="chip" data-w="${w.id}"><span class="badge ghost">${esc(initials(w.name.en))}</span>${esc(wname(w))}</button>`).join('')}</div>`;
    $$('[data-w]').forEach((b) => { b.onclick = async () => {
      try {
        const r = await api('POST', '/api/auth/demo-worker', { worker_id: Number(b.dataset.w) }, { token: null });
        auth.setToken('worker', r.token); auth.role = 'worker'; go('/w/home');
      } catch (e) { toastErr(e); }
    }; });
  } catch { /* demo mode off */ }
});

// ------------------------------------------------------------------ confirm the generated profile
route(/^\/w\/confirm$/, async (live) => {
  await loadConfig();
  paintShell({ title: tx('w_confirm_title'), back: '/w/start', narrow: true, worker: true });
  view().innerHTML = spinner();
  const { worker: w } = await W('GET', '/api/workers/me');
  if (!live()) return;
  const needsName = !w.name.en || w.name.en === 'Karigar';
  view().innerHTML = `
    <div class="stack">
      <div class="center"><h1 class="h1">${esc(tx('w_confirm_title'))}</h1><p class="muted">${esc(tx('w_confirm_hint'))}</p></div>
      <div class="card stack">
        <div class="row"><div class="avatar lg t-${w.trade.id}">${esc(initials(w.name.en))}</div>
          <div style="flex:1;min-width:0"><div class="h2">${esc(wname(w))}</div><div class="muted">${esc(pick(w.trade))}${w.years ? ` · ${w.years} ${esc(tx('years'))}` : ''}</div></div></div>
        <div class="deal" style="background:var(--surface-2);border-color:var(--line)"><div class="row between"><div class="h3">${esc(tx('voice_intro'))}</div><button class="btn ghost sm" id="hear">${ic('volume', 16)}</button></div><p style="margin-top:4px">${esc(pick(w.intro))}</p></div>
        ${w.skills.length ? `<div><div class="h3" style="margin-bottom:8px">${esc(tx('skills'))}</div><div class="chips">${w.skills.map((s) => `<span class="chip static">${esc(pick(s))}</span>`).join('')}</div></div>` : ''}
        ${w.areas.length ? `<div><div class="h3" style="margin-bottom:8px">${esc(tx('areas'))}</div><div class="chips">${w.areas.map((a) => `<span class="chip static">${ic('pin', 12)} ${esc(areaName(a))}</span>`).join('')}</div></div>` : ''}
        ${needsName || !w.years ? `<div class="notice warn">${ic('alert', 18)}<span>${esc(tx('missing_years'))}</span></div>
          <div class="row">${needsName ? `<div style="flex:2"><label class="lbl" for="nm">${esc(tx('name_label'))}</label><input id="nm" class="field" maxlength="60"></div>` : ''}
          <div style="flex:1"><label class="lbl" for="yr">${esc(tx('years_label'))}</label><input id="yr" class="field ltr" type="number" min="1" max="59" inputmode="numeric" value="${w.years || ''}"></div></div>` : ''}
      </div>
      <div class="mic-wrap" style="flex-direction:row;justify-content:center"><button class="mic sm" id="mic" aria-pressed="false">${ic('mic', 24)}</button><div class="mic-label" id="ml">${esc(tx('speak_again'))}</div></div>
      <button class="btn primary block" id="ok">${ic('check', 18)} ${esc(tx('ok_btn'))}</button>
    </div>`;
  $('#hear').onclick = () => speak(w.intro);
  bindMic($('#mic'), { labelEl: $('#ml'), onFinal: async (t) => {
    try { await api('POST', '/api/workers/onboard', { transcript: t, language: getLang() }, { role: 'worker' }); go('/w/confirm'); } catch (e) { toastErr(e); }
  } });
  $('#ok').onclick = async (e) => {
    e.currentTarget.disabled = true;
    try {
      const patch = { confirm: true };
      const yr = $('#yr')?.value; if (yr) patch.years = Number(yr);
      const nm = $('#nm')?.value.trim(); if (nm) patch.name_en = nm;
      await W('PATCH', '/api/workers/me', patch);
      go('/w/home');
    } catch (err) { toastErr(err); e.currentTarget.disabled = false; }
  };
});

// ------------------------------------------------------------------ dashboard
route(/^\/w\/home$/, async (live) => {
  await loadConfig();
  paintShell({ worker: true });
  view().innerHTML = spinner();
  let me;
  try { me = (await W('GET', '/api/workers/me')).worker; } catch (e) { if (e.status === 401 || e.code === 'AUTH_REQUIRED') { auth.clear('worker'); return go('/w/entry'); } throw e; }
  if (!live()) return;
  if (!me.profile_confirmed) return go('/w/confirm');
  auth.role = 'worker';
  view().innerHTML = `
    <div class="two-col even">
      <div class="stack">
        <div class="card stack">
          <div class="row"><div class="avatar t-${me.trade.id}">${esc(initials(me.name.en))}</div>
            <div style="flex:1;min-width:0"><div class="h2">${esc(wname(me))}</div><div class="muted small">${esc(pick(me.trade))}</div></div>
            ${me.verified ? `<span class="badge brand">${ic('shield', 13)} ${esc(tx('verified'))}</span>` : ''}</div>
          <div class="stats" style="grid-template-columns:repeat(3,1fr)">
            <div class="stat"><b>${me.rating ?? '–'}</b><span>${esc(tx('rating'))}</span></div>
            <div class="stat"><b>${num(me.jobs_count)}</b><span>${esc(tx('jobs'))}</span></div>
            <div class="stat"><b>${me.years ?? '–'}</b><span>${esc(tx('years'))}</span></div>
          </div>
        </div>
        <div class="card"><label class="row between" style="cursor:pointer"><span class="bold" style="font-size:18px">${esc(tx('available_today'))}</span>
          <span class="switch"><input type="checkbox" id="avail" ${me.available_today ? 'checked' : ''} aria-label="${esc(tx('available_today'))}"><span class="track"></span><span class="knob"></span></span></label>
          <p class="small muted" id="avail-note" style="margin-top:6px" ${me.available_today ? 'hidden' : ''}>${esc(tx('off_today'))}</p></div>
      </div>
      <div class="stack"><h2 class="h2">${esc(tx('new_jobs'))}</h2><div id="inbox" class="stack">${spinner()}</div></div>
    </div>`;
  $('#avail').onchange = async (e) => {
    const on = e.currentTarget.checked;
    try { await W('PATCH', '/api/workers/me', { available_today: on }); $('#avail-note').hidden = on; }
    catch (err) { e.currentTarget.checked = !on; toastErr(err); }
  };

  const loadInbox = async () => {
    try {
      const r = await W('GET', '/api/jobs/mine');
      if (!live()) return;
      $('#inbox').innerHTML = r.jobs.length ? r.jobs.map((j) => {
        const first = j.first_message;
        const text = getLang() === 'urdu' && first?.text_ur ? first.text_ur : first?.text;
        return `<div class="card stack" data-job="${j.id}">
          <div class="row between"><span class="badge ${j.status === 'booked' ? 'ok' : 'sun'}">${esc(tx(`st_${j.status}`))}</span><span class="meta"><span>${ic('pin', 14)} <span class="ltr">${j.distance_km} ${esc(tx('km'))}</span></span></span></div>
          <p class="bold" style="font-size:18px">${esc(pick(j.problem.summary) || text || '')}</p>
          ${text ? `<p class="muted small">“${esc(text)}”</p>` : ''}
          <div class="row wrap"><button class="btn ghost sm" data-hear="${j.id}">${ic('volume', 16)} ${esc(tx('hear_customer'))}</button>
            <a class="btn primary sm" href="#/w/job/${j.id}" style="margin-inline-start:auto">${esc(tx('open'))} ${ic('next', 15, 'flip')}</a></div></div>`;
      }).join('') : `<div class="empty">${ic('inbox', 44)}<p>${esc(tx('no_jobs'))}</p></div>`;
      $$('[data-hear]').forEach((b) => { b.onclick = () => { const j = r.jobs.find((x) => x.id === Number(b.dataset.hear)); speak({ roman: j.first_message?.text, urdu: j.first_message?.text_ur }); }; });
    } catch { /* next poll */ }
  };
  await loadInbox();
  every(loadInbox, 5000);
});

route(/^\/w\/job\/(\d+)$/, (id, live) => chatView(Number(id), 'worker', live));
