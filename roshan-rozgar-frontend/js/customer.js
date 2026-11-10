// Customer journey: language -> role -> speak the problem -> AI understanding -> nearby workers -> profile
// -> chat -> book -> booking confirmed -> review.
import {
  S, $, $$, esc, view, route, go, paintShell, api, auth, store, tx, pick, ic, getLang, applyLang, toast, toastErr, bindMic,
  spinner, stars, initials, srcBadge, withCustomer, nearLabel, openAreaSheet, loadConfig, openSheet, confirmSheet, every, errMsg,
} from './core.js';
import { wname, areaName, num, LANG_IDS } from './i18n.js';
import { speak } from './speech.js';
import { chatView } from './chat.js';

const logoBlock = () => `
  <div class="hero">
    <div class="logo">${ic('wrench', 40)}</div>
    <div class="name-ur">روشن روزگار</div>
    <div class="name-en">Roshan Rozgar</div>
    <p>${esc(tx('tagline'))}</p>
  </div>`;

// ------------------------------------------------------------------ language
route(/^\/lang$/, async () => {
  await loadConfig();
  const draw = () => {
    paintShell({ narrow: true });
    view().innerHTML = `${logoBlock()}
      <h2 class="h2 center" style="margin:18px 0 12px">${esc(tx('choose_lang'))}</h2>
      <div class="stack">${S.config.languages.map((l) => `
        <button class="choice ${l.id === getLang() ? 'on' : ''}" data-l="${l.id}">
          <span class="iconbox">${ic('globe', 24)}</span>
          <span class="grow"><div class="big">${esc(l.native)}</div><div class="muted small">${esc(l.label)}</div></span>
          <span class="tick">${ic('check', 16)}</span>
        </button>`).join('')}
      </div>
      <button class="btn primary block" id="go" style="margin-top:20px">${esc(tx('continue'))} ${ic('next', 18, 'flip')}</button>`;
    $$('[data-l]').forEach((b) => { b.onclick = () => { applyLang(b.dataset.l); draw(); }; });
    $('#go').onclick = () => { store.set('rr_lang_chosen', '1'); go('/role'); };
  };
  draw();
});

// ------------------------------------------------------------------ role
route(/^\/role$/, async () => {
  await loadConfig();
  paintShell({ narrow: true });
  view().innerHTML = `${logoBlock()}
    <h2 class="h2 center" style="margin:18px 0 12px">${esc(tx('who_are_you'))}</h2>
    <div class="stack">
      <a class="choice" href="#/home"><span class="iconbox">${ic('mic', 26)}</span><span class="grow"><div class="big">${esc(tx('need_worker'))}</div><div class="muted small">${esc(tx('need_worker_sub'))}</div></span>${ic('next', 20, 'flip')}</a>
      <a class="choice" href="#/w/entry"><span class="iconbox green">${ic('briefcase', 26)}</span><span class="grow"><div class="big">${esc(tx('i_am_worker'))}</div><div class="muted small">${esc(tx('i_am_worker_sub'))}</div></span>${ic('next', 20, 'flip')}</a>
    </div>`;
});

route(/^\/?$/, async () => {
  await loadConfig();
  if (!store.get('rr_lang_chosen')) return go('/lang');
  go('/role');
});

// ------------------------------------------------------------------ home: speak the problem
route(/^\/home$/, async () => {
  await loadConfig();
  auth.role = 'customer';
  paintShell({ nav: 'customer' });
  const trades = S.config.trades;
  view().innerHTML = `
    <div class="stack" style="gap:18px">
      <button class="locbar" id="loc">${ic('pin', 18)}<span id="loc-label" style="flex:1">${esc(nearLabel())}</span><span class="muted small">${esc(tx('change_area'))}</span></button>
      <div class="center"><h1 class="h1">${esc(tx('home_title'))}</h1><p class="muted" style="margin-top:4px">${esc(tx('home_sub'))}</p></div>
      <div class="mic-wrap">
        <button class="mic" id="mic" aria-label="${esc(tx('tap_to_speak'))}" aria-pressed="false">${ic('mic', 46)}</button>
        <div class="mic-label" id="mic-label">${esc(tx('tap_to_speak'))}</div>
      </div>
      <div>
        <label class="lbl" for="problem">${esc(tx('or_type'))}</label>
        <div class="row"><textarea id="problem" class="field" rows="2" placeholder="${esc(tx('type_ph'))}" style="min-height:56px">${esc(S.draft.text)}</textarea></div>
        <button class="btn primary block" id="find" style="margin-top:10px">${ic('sparkles', 18)} ${esc(tx('find_workers'))}</button>
      </div>
      <div>
        <div class="h3" style="margin-bottom:8px">${esc(tx('or_choose'))}</div>
        <div class="trade-grid">${trades.map((t) => `<button class="trade t-${t.id}" data-t="${t.id}"><span class="tb">${ic(t.icon, 22)}</span><span>${esc(pick(t))}</span></button>`).join('')}</div>
      </div>
    </div>`;

  const input = $('#problem');
  $('#loc').onclick = () => openAreaSheet(() => { $('#loc-label').textContent = nearLabel(); });
  bindMic($('#mic'), {
    labelEl: $('#mic-label'),
    onInterim: (t) => { input.value = t; },
    onFinal: (t) => { input.value = t; submitProblem({ text: t }); }, // voice-first: no extra tap needed
  });
  $('#find').onclick = () => { const t = input.value.trim(); if (!t) { input.focus(); return toast(tx('need_problem'), 'err'); } submitProblem({ text: t }); };
  $$('[data-t]').forEach((b) => { b.onclick = () => submitProblem({ text: input.value.trim(), trade_id: b.dataset.t }); });
});

async function submitProblem({ text = '', trade_id = null }) {
  const btn = $('#find');
  if (btn) { btn.disabled = true; btn.innerHTML = `${ic('sparkles', 18)} ${esc(tx('understanding'))}`; }
  try {
    const r = await api('POST', '/api/ai/understand', { text, trade_id, language: getLang() }, { token: null });
    S.draft = { text, trade_id: r.trade_id, understanding: r };
    go('/understand');
  } catch (e) {
    toastErr(e);
    if (btn) { btn.disabled = false; btn.innerHTML = `${ic('sparkles', 18)} ${esc(tx('find_workers'))}`; }
  }
}

// ------------------------------------------------------------------ "AI ne samjha"
route(/^\/understand$/, async () => {
  await loadConfig();
  const u = S.draft.understanding;
  if (!u) return go('/home');
  paintShell({ back: '/home', title: tx('ai_understood'), nav: 'customer' });
  const trade = u.trade || (u.trade_id ? S.config.trades.find((t) => t.id === u.trade_id) : null);
  view().innerHTML = `
    <div class="stack">
      <div class="ai-card">
        <div class="row between"><div class="ai-head">${ic('sparkles', 20)} ${esc(tx('ai_understood'))}</div>${srcBadge(u.source)}</div>
        <div class="ai-text">${esc(pick(u.summary) || pick(u.problem) || S.draft.text)}</div>
        ${trade ? `<span class="chip on">${ic(trade.icon, 16)} ${esc(pick(trade))}</span>` : ''}
        <div class="row" style="margin-top:12px"><button class="btn ghost sm" id="hear">${ic('volume', 16)} ${esc(tx('heard'))}</button></div>
      </div>
      ${trade ? '' : `<div class="notice info">${ic('alert', 18)}<span>${esc(tx('pick_trade_hint'))}</span></div>
        <div class="trade-grid">${S.config.trades.map((t) => `<button class="trade t-${t.id}" data-t="${t.id}"><span class="tb">${ic(t.icon, 22)}</span><span>${esc(pick(t))}</span></button>`).join('')}</div>`}
      <button class="btn primary block" id="next" ${trade ? '' : 'disabled'}>${ic('next', 18, 'flip')} ${esc(tx('find_workers'))}</button>
      <a class="btn ghost block" href="#/home">${ic('mic', 18)} ${esc(tx('speak_again'))}</a>
    </div>`;
  $('#hear').onclick = () => speak(u.summary);
  $('#next').onclick = () => go('/workers');
  $$('[data-t]').forEach((b) => { b.onclick = async () => {
    try {
      const r = await api('POST', '/api/ai/understand', { text: S.draft.text, trade_id: b.dataset.t, language: getLang() }, { token: null });
      S.draft = { ...S.draft, trade_id: r.trade_id, understanding: r };
      go('/understand');
    } catch (e) { toastErr(e); }
  }; });
});

// ------------------------------------------------------------------ workers list
function workerCardHtml(w) {
  const busy = !w.available;
  return `<article class="card wcard ${busy ? 'is-busy' : ''}" data-id="${w.id}" style="cursor:pointer">
    <div class="row" style="align-items:flex-start">
      <div class="avatar t-${w.trade.id}">${esc(initials(w.name.en))}</div>
      <div style="flex:1;min-width:0">
        <div class="row between" style="align-items:flex-start"><div class="name">${esc(wname(w))}</div>
          <span class="badge ${busy ? 'busy' : 'ok'}"><span class="dot"></span>${esc(tx(busy ? 'busy' : 'available'))}</span></div>
        <div class="muted small">${esc(pick(w.trade))}</div>
        <div class="meta">
          ${w.rating != null ? `<span class="star">${ic('star', 15)}<b style="color:var(--ink)">${w.rating}</b></span>` : ''}
          <span>${ic('briefcase', 14)} ${num(w.jobs_count)} ${esc(tx('jobs'))}</span>
          ${w.years ? `<span>${ic('clock', 14)} ${w.years} ${esc(tx('years'))}</span>` : ''}
          ${w.distance_km != null ? `<span>${ic('pin', 14)} <span class="ltr">${w.distance_km} ${esc(tx('km'))}</span></span>` : ''}
        </div>
      </div>
    </div>
    <div class="row between wrap">
      ${w.verified ? `<span class="badge brand">${ic('shield', 13)} ${esc(tx('verified'))}</span>` : '<span></span>'}
      <button class="btn primary sm talk" data-talk="${w.id}" ${busy ? 'disabled' : ''}>${ic('send', 15, 'flip')} ${esc(tx(busy ? 'busy_btn' : 'talk'))}</button>
    </div>
  </article>`;
}

route(/^\/workers$/, async (live) => {
  await loadConfig();
  if (!S.draft.trade_id) return go(S.draft.understanding ? '/understand' : '/home');
  paintShell({ back: '/understand', title: tx('nearby_workers'), nav: 'customer' });
  const trade = S.config.trades.find((t) => t.id === S.draft.trade_id);
  const f = S.filters;
  view().innerHTML = `
    <div class="stack">
      <div class="row between wrap">
        <div><h1 class="h2">${esc(pick(trade))} · ${esc(tx('nearby_workers'))}</h1><div class="muted small" id="count">&nbsp;</div></div>
        <button class="locbar" id="loc" style="width:auto">${ic('pin', 16)}<span id="loc-label">${esc(nearLabel())}</span></button>
      </div>
      <div class="chips" id="filters">
        <button class="chip ${f.available ? 'on' : ''}" data-f="available">${ic('check', 14)} ${esc(tx('filter_available'))}</button>
        <button class="chip ${f.nearest ? 'on' : ''}" data-f="nearest">${ic('pin', 14)} ${esc(tx('filter_nearest'))}</button>
        <button class="chip ${f.rating ? 'on' : ''}" data-f="rating">${ic('star', 14)} ${esc(tx('filter_rating'))}</button>
      </div>
      <div id="list" class="worker-list">${[1, 2, 3].map(() => '<div class="skeleton"></div>').join('')}</div>
    </div>`;
  $('#loc').onclick = () => openAreaSheet(() => go('/workers'));
  $$('[data-f]').forEach((b) => { b.onclick = () => { f[b.dataset.f] = !f[b.dataset.f]; go('/workers'); }; });

  const q = new URLSearchParams({ trade: S.draft.trade_id, sort: f.nearest ? 'nearest' : 'rating', ...Object.fromEntries(Object.entries(S.geo ? { lat: S.geo.lat, lng: S.geo.lng } : { area_id: S.area_id })) });
  if (f.available) q.set('available', '1');
  if (f.rating) q.set('min_rating', '4');
  const r = await api('GET', `/api/workers?${q}`, undefined, { token: null });
  if (!live()) return;
  $('#count').textContent = `${r.count} ${tx('count_workers')} · ${r.available_count} ${tx('count_free')}`;
  $('#list').innerHTML = r.workers.length ? r.workers.map(workerCardHtml).join('')
    : `<div class="empty" style="grid-column:1/-1">${ic('user', 44)}<p class="bold">${esc(tx('no_workers'))}</p><p class="small">${esc(tx('no_workers_hint'))}</p></div>`;
  $$('.wcard').forEach((c) => {
    c.onclick = (e) => { if (e.target.closest('[data-talk]')) return; go(`/worker/${c.dataset.id}`); };
  });
  $$('[data-talk]').forEach((b) => { b.onclick = () => startChat(Number(b.dataset.talk), b); });
});

// ------------------------------------------------------------------ start a chat (POST /api/jobs)
async function ensureProblem() {
  if (S.draft.text || S.draft.understanding) return true;
  return new Promise((resolve) => {
    openSheet(`<h2 class="h2" style="margin-bottom:10px">${esc(tx('need_problem'))}</h2>
      <div class="mic-wrap" style="flex-direction:row;justify-content:center"><button class="mic sm" id="smic">${ic('mic', 24)}</button><div class="mic-label" id="slabel">${esc(tx('tap_to_speak'))}</div></div>
      <textarea id="sp" class="field" rows="3" placeholder="${esc(tx('type_ph'))}"></textarea>
      <button class="btn primary block" id="sgo" style="margin-top:12px">${esc(tx('continue'))}</button>`,
    (el, close) => {
      bindMic($('#smic', el), { labelEl: $('#slabel', el), onInterim: (t) => { $('#sp', el).value = t; }, onFinal: (t) => { $('#sp', el).value = t; } });
      $('#sgo', el).onclick = async () => {
        const text = $('#sp', el).value.trim(); if (!text) return;
        try {
          const r = await api('POST', '/api/ai/understand', { text, language: getLang() }, { token: null });
          S.draft = { text, trade_id: S.draft.trade_id || r.trade_id, understanding: r };
          close(); resolve(true);
        } catch (e) { toastErr(e); }
      };
    });
  });
}

export async function startChat(workerId, btn) {
  if (!(await ensureProblem())) return;
  if (btn) btn.disabled = true;
  try {
    const d = S.draft;
    const r = await withCustomer(() => api('POST', '/api/jobs', {
      worker_id: workerId, problem_text: d.text || undefined, understanding: d.understanding || undefined, ...(S.geo ? { lat: S.geo.lat, lng: S.geo.lng } : { area_id: S.area_id }),
    }));
    go(`/chat/${r.job.id}`);
  } catch (e) { toastErr(e); if (btn) btn.disabled = false; }
}

// ------------------------------------------------------------------ worker profile
route(/^\/worker\/(\d+)$/, async (id, live) => {
  await loadConfig();
  paintShell({ back: S.draft.trade_id ? '/workers' : '/home', title: tx('nearby_workers'), nav: 'customer' });
  view().innerHTML = spinner();
  const { worker: w } = await api('GET', `/api/workers/${id}?${new URLSearchParams(S.geo ? { lat: S.geo.lat, lng: S.geo.lng } : { area_id: S.area_id })}`, undefined, { token: null });
  if (!live()) return;
  const busy = !w.available;
  const sum = w.ai_summary;
  view().innerHTML = `
    <div class="two-col">
      <div class="stack">
        <div class="card stack">
          <div class="row" style="align-items:flex-start;gap:14px">
            <div class="avatar lg t-${w.trade.id}">${esc(initials(w.name.en))}</div>
            <div style="flex:1;min-width:0">
              <h1 class="h1" style="font-size:24px">${esc(wname(w))}</h1>
              <div class="muted">${esc(pick(w.trade))}</div>
              <div class="row wrap" style="margin-top:8px">
                <span class="badge ${busy ? 'busy' : 'ok'}"><span class="dot"></span>${esc(tx(busy ? 'busy' : 'available'))}</span>
                ${w.verified ? `<span class="badge brand">${ic('shield', 13)} ${esc(tx('verified'))}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="stats">
            <div class="stat"><b>${w.rating ?? '–'}</b><span>${esc(tx('rating'))}</span></div>
            <div class="stat"><b>${num(w.jobs_count)}</b><span>${esc(tx('jobs'))}</span></div>
            <div class="stat"><b>${w.years ?? '–'}</b><span>${esc(tx('years'))}</span></div>
            <div class="stat"><b class="ltr">${w.distance_km ?? '–'}</b><span>${esc(tx('km'))}</span></div>
          </div>
        </div>
        ${sum ? `<div class="ai-card"><div class="row between"><div class="ai-head">${ic('sparkles', 18)} ${esc(tx('ai_summary'))}</div>${sum.source ? srcBadge(sum.source) : ''}</div><p class="bold" style="margin-top:8px;font-size:17px">${esc(pick(sum))}</p></div>` : ''}
        <div class="card"><div class="row between"><div class="h3">${esc(tx('voice_intro'))}</div><button class="btn ghost sm" id="intro">${ic('volume', 16)}</button></div><p style="margin-top:6px">${esc(pick(w.intro))}</p></div>
      </div>
      <div class="stack sticky-col">
        <div class="card stack">
          ${w.skills.length ? `<div><div class="h3" style="margin-bottom:8px">${esc(tx('skills'))}</div><div class="chips">${w.skills.map((s) => `<span class="chip static">${esc(pick(s))}</span>`).join('')}</div></div>` : ''}
          ${w.areas.length ? `<div><div class="h3" style="margin-bottom:8px">${esc(tx('areas'))}</div><div class="chips">${w.areas.map((a) => `<span class="chip static">${ic('pin', 12)} ${esc(areaName(a))}</span>`).join('')}</div></div>` : ''}
        </div>
        <div class="card"><div class="h3" style="margin-bottom:10px">${esc(tx('reviews'))}</div>
          ${w.reviews.length ? w.reviews.slice(0, 6).map((r) => `<div class="review"><div class="row between">${stars(r.rating, 15)}</div><p style="margin-top:4px">${esc(pick(r.text))}</p></div>`).join('<div style="height:10px"></div>') : `<p class="muted">${esc(tx('no_reviews'))}</p>`}
        </div>
        <button class="btn primary block" id="talk" ${busy ? 'disabled' : ''}>${ic('send', 18, 'flip')} ${esc(tx(busy ? 'busy_btn' : 'talk'))}</button>
      </div>
    </div>`;
  $('#intro').onclick = () => speak(w.intro);
  $('#talk').onclick = (e) => startChat(w.id, e.currentTarget);
});

// ------------------------------------------------------------------ chat (customer)
route(/^\/chat\/(\d+)$/, (id, live) => chatView(Number(id), 'customer', live));

// ------------------------------------------------------------------ booking confirmed
route(/^\/booked\/(\d+)$/, async (id, live) => {
  paintShell({ nav: 'customer', narrow: true });
  view().innerHTML = spinner();
  const { job } = await withCustomer(() => api('GET', `/api/jobs/${id}`));
  if (!live()) return;
  if (!['booked', 'completed'].includes(job.status)) return go(`/chat/${id}`);
  const w = job.worker;
  view().innerHTML = `
    <div class="stack">
      <div class="center"><div class="success-mark">${ic('check', 44)}</div><h1 class="h1">${esc(tx('booked_title'))}</h1><p class="muted">${esc(tx('booked_sub'))}</p></div>
      <div class="card stack">
        <div class="row"><div class="avatar t-${w.trade.id}">${esc(initials(w.name.en))}</div><div style="flex:1"><div class="name bold" style="font-size:18px">${esc(wname(w))}</div><div class="muted small">${esc(pick(w.trade))}</div></div>
          <span class="badge busy"><span class="dot"></span>${esc(tx('busy'))}</span></div>
        ${w.phone ? `<div class="phone-box"><div><div class="tiny muted">${esc(tx('phone'))}</div><b>${esc(w.phone)}</b></div><a class="btn sun sm" href="tel:${esc(w.phone.replace(/[^\d+]/g, ''))}">${ic('phone', 16)} ${esc(tx('call'))}</a></div>` : ''}
        <div class="deal"><dl>
          <dt>${esc(tx('deal_job'))}</dt><dd>${esc(pick(job.deal.job) || pick(job.problem))}</dd>
          ${job.deal.time ? `<dt>${esc(tx('deal_time'))}</dt><dd>${esc(pick(job.deal.time))}</dd>` : ''}
          <dt>${esc(tx('deal_price'))}</dt><dd class="price">${esc(tx('rs'))} ${num(job.deal.price)}</dd></dl></div>
        <div class="notice info">${ic('shield', 18)}<span>${esc(tx('worker_hidden'))}</span></div>
      </div>
      ${job.status === 'booked' ? `<button class="btn primary block" id="done">${ic('check', 18)} ${esc(tx('job_done'))}</button><a class="btn ghost block" href="#/chat/${id}">${ic('send', 16, 'flip')} ${esc(tx('talk'))}</a><button class="btn danger block" id="cancel">${esc(tx('cancel'))}</button>`
        : job.can_review ? `<a class="btn primary block" href="#/review/${id}">${esc(tx('how_was'))}</a>` : `<a class="btn ghost block" href="#/home">${esc(tx('back_home'))}</a>`}
    </div>`;
  const done = $('#done');
  if (done) done.onclick = () => go(`/review/${id}`);
  const cancel = $('#cancel');
  if (cancel) cancel.onclick = () => confirmSheet(tx('cancel_ask'), tx('cancel'), async () => {
    try { await api('POST', `/api/jobs/${id}/cancel`); go('/jobs'); } catch (e) { toastErr(e); }
  });
});

// ------------------------------------------------------------------ review ("Kaam kaisa raha?")
route(/^\/review\/(\d+)$/, async (id, live) => {
  paintShell({ back: `/booked/${id}`, title: tx('how_was'), nav: 'customer', narrow: true });
  view().innerHTML = spinner();
  const { job } = await withCustomer(() => api('GET', `/api/jobs/${id}`));
  if (!live()) return;
  if (!job.can_review) return go('/jobs');
  let sentiment = null;
  view().innerHTML = `
    <div class="stack">
      <div class="center"><h1 class="h1">${esc(tx('how_was'))}</h1><p class="muted">${esc(wname(job.worker))} · ${esc(pick(job.trade))}</p></div>
      <div class="thumbs">
        <button class="thumb good" data-s="good">${ic('up', 40)}<span>${esc(tx('good'))}</span></button>
        <button class="thumb bad" data-s="bad">${ic('down', 40)}<span>${esc(tx('bad'))}</span></button>
      </div>
      <div class="mic-wrap" style="flex-direction:row;justify-content:center"><button class="mic sm" id="mic">${ic('mic', 24)}</button><div class="mic-label" id="ml">${esc(tx('speak_review'))}</div></div>
      <textarea id="tr" class="field" rows="3" placeholder="${esc(tx('speak_review'))}"></textarea>
      <button class="btn primary block" id="send">${esc(tx('submit'))}</button>
    </div>`;
  $$('.thumb').forEach((b) => { b.onclick = () => { sentiment = b.dataset.s; $$('.thumb').forEach((x) => x.classList.toggle('on', x === b)); }; });
  bindMic($('#mic'), { labelEl: $('#ml'), onInterim: (t) => { $('#tr').value = t; }, onFinal: (t) => { $('#tr').value = t; } });
  $('#send').onclick = async (e) => {
    const transcript = $('#tr').value.trim();
    if (!sentiment && !transcript) return toast(`${tx('good')} / ${tx('bad')}`, 'err');
    e.currentTarget.disabled = true;
    try {
      const r = await withCustomer(() => api('POST', `/api/jobs/${id}/review`, { sentiment: sentiment || undefined, transcript: transcript || undefined }));
      view().innerHTML = `<div class="stack center"><div class="success-mark">${ic('check', 44)}</div><h1 class="h1">${esc(tx('thanks'))}</h1><p class="muted">${esc(tx('review_saved'))}</p>
        <div class="card" style="text-align:start"><div class="row between">${stars(r.review.rating, 18)}${srcBadge(r.review.source)}</div><p style="margin-top:6px" class="bold">${esc(pick(r.review.text))}</p></div>
        <a class="btn primary block" href="#/home">${esc(tx('back_home'))}</a></div>`;
    } catch (err) { toastErr(err); e.currentTarget.disabled = false; }
  };
});

// ------------------------------------------------------------------ my jobs
route(/^\/jobs$/, async (live) => {
  paintShell({ nav: 'customer' });
  view().innerHTML = `<h1 class="h1" style="margin-bottom:14px">${esc(tx('my_jobs'))}</h1><div id="list" class="worker-list">${spinner()}</div>`;
  const r = await withCustomer(() => api('GET', '/api/jobs/mine'));
  if (!live()) return;
  const href = (j) => (j.status === 'booked' ? `#/booked/${j.id}` : j.status === 'negotiating' ? `#/chat/${j.id}` : j.can_review ? `#/review/${j.id}` : `#/booked/${j.id}`);
  $('#list').innerHTML = r.jobs.length ? r.jobs.map((j) => `
    <a class="card wcard" href="${href(j)}" style="text-decoration:none;color:inherit">
      <div class="row"><div class="avatar t-${j.worker.trade.id}">${esc(initials(j.worker.name.en))}</div>
        <div style="flex:1;min-width:0"><div class="name">${esc(wname(j.worker))}</div><div class="muted small">${esc(pick(j.problem.summary) || pick(j.problem))}</div></div>
        <span class="badge ${j.status === 'booked' ? 'ok' : j.status === 'negotiating' ? 'sun' : 'ghost'}">${esc(tx(`st_${j.status}`))}</span></div>
      ${j.deal.price != null ? `<div class="bold">${esc(tx('rs'))} ${num(j.deal.price)}</div>` : ''}
    </a>`).join('') : `<div class="empty" style="grid-column:1/-1">${ic('briefcase', 44)}<p class="bold">${esc(tx('no_my_jobs'))}</p><a class="btn primary" href="#/home" style="margin-top:10px">${esc(tx('find_workers'))}</a></div>`;
});
