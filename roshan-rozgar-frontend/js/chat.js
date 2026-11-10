// Shared negotiation chat for both roles. Polls GET /api/jobs/:id?after=<lastMsgId> every 2.5s (backend has no websockets).
import {
  $, $$, esc, view, go, paintShell, api, tx, pick, ic, getLang, toast, toastErr, bindMic, spinner, initials, timeOf, every,
  withCustomer, confirmSheet, S,
} from './core.js';
import { wname, num } from './i18n.js';
import { speak } from './speech.js';

const callFor = (role, fn) => (role === 'customer' ? withCustomer(fn) : fn());

export async function chatView(jobId, role, live) {
  const isCustomer = role === 'customer';
  paintShell({ back: isCustomer ? '/jobs' : '/w/home', title: '', nav: isCustomer ? 'customer' : null, worker: !isCustomer });
  view().innerHTML = spinner();

  const first = await callFor(role, () => api('GET', `/api/jobs/${jobId}`, undefined, { role }));
  if (!live()) return;
  let job = first.job;
  paintShell({ back: isCustomer ? '/jobs' : '/w/home', title: isCustomer ? wname(job.worker) : (pick(job.problem.summary) || tx('problem')), nav: isCustomer ? 'customer' : null, worker: !isCustomer });
  const seen = new Set();
  let lastId = 0;
  let selPrice = null; // worker: tapped price chip
  let timeText = '';
  let sideSig = '';

  view().innerHTML = `
    <div class="two-col">
      <div class="chat-wrap">
        <div class="msgs" id="msgs" aria-live="polite"></div>
        <div id="empty" class="muted center small" hidden>${esc(tx('chat_empty'))}</div>
        <form class="composer" id="composer" autocomplete="off">
          <button type="button" class="mic xs" id="mic" aria-label="${esc(tx('tap_to_speak'))}">${ic('mic', 20)}</button>
          <input id="msg" type="text" placeholder="${esc(tx('type_msg'))}" maxlength="500" aria-label="${esc(tx('type_msg'))}">
          <button class="send" aria-label="${esc(tx('send'))}">${ic('send', 20, 'flip')}</button>
        </form>
      </div>
      <aside class="stack sticky-col first-on-mobile" id="side"></aside>
    </div>`;

  const msgsEl = $('#msgs');
  const addMsgs = (list) => {
    for (const m of list) {
      if (seen.has(m.id)) continue;
      seen.add(m.id); lastId = Math.max(lastId, m.id);
      const sys = m.sender === 'system';
      const mine = m.sender === role;
      const text = getLang() === 'urdu' && m.text_ur ? m.text_ur : m.text;
      const el = document.createElement('div');
      el.className = `bubble ${sys ? 'sys' : mine ? 'me' : ''} ${m.kind === 'accept' ? 'accept' : ''}`;
      el.dataset.id = m.id;
      el.innerHTML = `<span>${esc(text)}</span>${sys ? '' : `<div class="foot"><button type="button" class="play" aria-label="play">${ic('volume', 14)}</button><span class="time">${esc(timeOf(m.created_at))}</span></div>`}`;
      const play = el.querySelector('.play');
      if (play) play.onclick = () => speak({ roman: m.text, urdu: m.text_ur });
      msgsEl.appendChild(el);
    }
    $('#empty').hidden = seen.size > 1;
    if (list.length) el_scroll();
  };
  const el_scroll = () => requestAnimationFrame(() => $('#composer')?.scrollIntoView({ block: 'end', behavior: 'smooth' }));

  // ---------------------------------------------------------------- side panel (deal / actions)
  const paintSide = () => {
    const sig = JSON.stringify(job);
    if (sig === sideSig) return;
    sideSig = sig;
    const keepTime = $('#time-in')?.value; if (keepTime !== undefined) timeText = keepTime;
    const d = job.deal;
    const w = job.worker;
    const head = isCustomer
      ? `<div class="card"><div class="row"><div class="avatar t-${w.trade.id}">${esc(initials(w.name.en))}</div>
          <div style="flex:1;min-width:0"><div class="name bold" style="font-size:18px">${esc(wname(w))}</div><div class="muted small">${esc(pick(w.trade))} · <span class="ltr">${job.distance_km} ${esc(tx('km'))}</span></div></div>
          <span class="badge ${job.worker_available ? 'ok' : 'busy'}"><span class="dot"></span>${esc(tx(job.worker_available ? 'available' : 'busy'))}</span></div></div>`
      : `<div class="card"><div class="h3">${esc(tx('problem'))}</div><p class="bold" style="font-size:18px;margin-top:4px">${esc(pick(job.problem.summary) || pick(job.problem) || job.problem.text)}</p>
          <div class="meta" style="margin-top:6px"><span>${ic('pin', 14)} <span class="ltr">${job.distance_km} ${esc(tx('km'))}</span></span><span class="badge ghost">${esc(tx(`st_${job.status}`))}</span></div></div>`;

    const dealHtml = d.price != null ? `
      <div class="deal"><div class="row" style="color:#8A5A00;font-weight:800">${ic('sparkles', 18)} ${esc(tx('deal_title'))}</div>
        <dl><dt>${esc(tx('deal_job'))}</dt><dd>${esc(pick(d.job) || pick(job.problem))}</dd>
        ${d.time ? `<dt>${esc(tx('deal_time'))}</dt><dd>${esc(pick(d.time))}</dd>` : ''}
        <dt>${esc(tx('deal_price'))}</dt><dd class="price">${esc(tx('rs'))} ${num(d.price)}</dd></dl></div>`
      : `<div class="deal empty">${esc(tx('deal_pending'))}</div>`;

    let actions = '';
    if (isCustomer) {
      if (job.status === 'negotiating') {
        actions = job.worker_available
          ? `<button class="btn primary block" id="book" ${d.ready ? '' : 'disabled'}>${ic('check', 18)} ${esc(tx('book'))}</button>`
          : `<div class="notice warn">${ic('alert', 18)}<span>${esc(tx('taken_note'))}</span></div><a class="btn primary block" href="#/workers">${esc(tx('worker_gone'))}</a>`;
        actions += `<button class="btn danger block" id="cancel">${esc(tx('cancel'))}</button>`;
      } else if (job.status === 'declined') {
        actions = `<div class="notice warn">${ic('alert', 18)}<span>${esc(tx('declined_note'))}</span></div><a class="btn primary block" href="#/workers">${esc(tx('worker_gone'))}</a>`;
      } else if (job.status === 'cancelled') {
        actions = `<div class="notice warn">${ic('alert', 18)}<span>${esc(tx('st_cancelled'))}</span></div><a class="btn primary block" href="#/workers">${esc(tx('worker_gone'))}</a>`;
      } else {
        actions = `<a class="btn primary block" href="#/booked/${job.id}">${esc(tx('booked_title'))}</a>`;
      }
    } else if (job.status === 'negotiating') {
      const opts = job.price_options || [];
      actions = d.worker_accepted
        ? `<div class="notice info">${ic('clock', 18)}<span>${esc(tx('waiting_book'))}</span></div>`
        : `<div class="card stack"><div class="h3">${esc(tx('pick_price'))}</div>
            <div class="price-chips">${opts.map((p) => `<button class="price-chip ${selPrice === p ? 'on' : ''}" data-p="${p}">${esc(tx('rs'))} ${num(p)}</button>`).join('')}</div>
            <div class="row"><button type="button" class="mic xs" id="pmic">${ic('mic', 20)}</button><div class="mic-label small" id="pl" style="text-align:start">${esc(tx('say_price'))}</div></div>
            <input id="time-in" class="field" placeholder="${esc(tx('time_ph'))}" value="${esc(timeText)}">
            <div class="row"><button class="btn danger" style="flex:1" id="decline">${esc(tx('decline'))}</button><button class="btn primary" style="flex:2" id="accept">${ic('check', 18)} ${esc(tx('accept'))}</button></div></div>`;
    } else if (job.status === 'booked') {
      actions = `<div class="notice info">${ic('check', 18)}<span>${esc(tx('worker_booked'))}</span></div><button class="btn primary block" id="complete">${ic('check', 18)} ${esc(tx('job_done'))}</button>`;
    } else {
      actions = `<div class="notice warn">${ic('alert', 18)}<span>${esc(tx(`st_${job.status}`))}</span></div><a class="btn ghost block" href="#/w/home">${esc(tx('back_home'))}</a>`;
    }
    $('#side').innerHTML = `${head}${dealHtml}${actions}`;
    bindActions();
  };

  // ---------------------------------------------------------------- actions
  const bindActions = () => {
    const book = $('#book');
    if (book) book.onclick = async () => {
      book.disabled = true;
      try {
        await withCustomer(() => api('POST', `/api/jobs/${job.id}/book`, undefined, { role }));
        go(`/booked/${job.id}`);
      } catch (e) {
        toastErr(e); book.disabled = false;
        if (e.code === 'WORKER_UNAVAILABLE') await refresh();
      }
    };
    const cancel = $('#cancel');
    if (cancel) cancel.onclick = () => confirmSheet(tx('cancel_ask'), tx('cancel'), async () => {
      try { await api('POST', `/api/jobs/${job.id}/cancel`, undefined, { role }); go('/jobs'); } catch (e) { toastErr(e); }
    });
    $$('.price-chip').forEach((b) => { b.onclick = () => { selPrice = Number(b.dataset.p); $$('.price-chip').forEach((x) => x.classList.toggle('on', x === b)); }; });
    const pmic = $('#pmic');
    if (pmic) bindMic(pmic, { labelEl: $('#pl'), onFinal: async (t) => { selPrice = null; $$('.price-chip').forEach((x) => x.classList.remove('on')); await accept({ price_text: t }); } });
    const accBtn = $('#accept');
    if (accBtn) accBtn.onclick = () => {
      if (!selPrice) return toast(tx('pick_price'), 'err');
      accept({ price: selPrice });
    };
    const dec = $('#decline');
    if (dec) dec.onclick = async () => { try { await api('POST', `/api/jobs/${job.id}/decline`, undefined, { role }); go('/w/home'); } catch (e) { toastErr(e); } };
    const comp = $('#complete');
    if (comp) comp.onclick = async () => { try { await api('POST', `/api/jobs/${job.id}/complete`, undefined, { role }); go('/w/home'); } catch (e) { toastErr(e); } };
  };
  async function accept(extra) {
    try {
      const body = { ...extra }; const t = $('#time-in')?.value.trim(); if (t) body.time_text = t;
      const r = await api('POST', `/api/jobs/${job.id}/accept`, body, { role });
      job = r.job; addMsgs(r.messages); sideSig = ''; paintSide();
    } catch (e) { toastErr(e); }
  }

  // ---------------------------------------------------------------- polling
  async function refresh() {
    try {
      const r = await callFor(role, () => api('GET', `/api/jobs/${job.id}?after=${lastId}`, undefined, { role }));
      if (!live()) return;
      const was = job.status;
      job = r.job; addMsgs(r.messages); paintSide();
      if (isCustomer && was !== 'booked' && job.status === 'booked') go(`/booked/${job.id}`);
    } catch { /* transient; next tick retries */ }
  }
  addMsgs(first.messages);
  paintSide();
  every(refresh, 2500);

  // ---------------------------------------------------------------- composer
  const input = $('#msg');
  bindMic($('#mic'), { onInterim: (t) => { input.value = t; }, onFinal: (t) => { input.value = t; input.focus(); } });
  $('#composer').onsubmit = async (e) => {
    e.preventDefault();
    const text = input.value.trim(); if (!text) return;
    input.value = '';
    try {
      const r = await callFor(role, () => api('POST', `/api/jobs/${job.id}/messages`, { text }, { role }));
      addMsgs([r.message]); job = r.job; paintSide();
    } catch (err) { toastErr(err); input.value = text; }
  };
}
