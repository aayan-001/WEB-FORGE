import { db, tx, insertId } from './db.js';
import { config } from './config.js';
import {
  LANGUAGES, TRADES, TRADE_IDS, AREAS, AREAS_BY_ID, SKILLS, DEFAULT_AREA_ID, tradePublic, areaPublic,
} from './catalog.js';
import {
  HttpError, bad, notFound, forbidden, conflict, nowIso, newToken, parseJson, clip, haversineKm, round1,
} from './util.js';
import * as ai from './ai.js';
import {
  resolveLocation, locationLabel, getWorker, workerCard, workerProfile, workerStatus,
  refreshWorkerSummary, getJob, jobMessages, addMessage, serializeJob, requireParticipant, releaseWorker,
} from './core.js';

const needAuth = (auth, role) => {
  if (!auth) throw new HttpError(401, 'AUTH_REQUIRED', 'Pehle shuru karain', 'پہلے شروع کریں');
  if (role && auth.role !== role) throw forbidden();
  return auth;
};
const makeSession = (role, user_id) => {
  const token = newToken();
  db.prepare('INSERT INTO sessions (token, role, user_id, created_at) VALUES (?,?,?,?)').run(token, role, user_id, nowIso());
  return token;
};
const asInt = (v) => (v === undefined || v === null || v === '' ? null : Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : null);
const fmtPrice = (n) => Number(n).toLocaleString('en-US');

export const routes = [];
const route = (method, path, handler) => routes.push([method, path, handler]);

// ================================================================ meta
route('GET', '/api/health', () => ({
  ok: true, time: nowIso(),
  ai: { mode: ai.aiEnabled() ? 'llm_with_fallback' : 'fallback_only', model: ai.aiEnabled() ? config.models.join(', ') : null, stats: ai.aiStats },
  stt: { server: config.openaiKey ? 'whisper' : 'none (use browser Web Speech API)' },
  demo_mode: config.demoMode,
}));

route('GET', '/api/config', () => ({
  languages: LANGUAGES,
  trades: TRADE_IDS.map((id) => ({ ...tradePublic(id), price_options: TRADES[id].price_options })),
  areas: AREAS.map((a) => areaPublic(a.id)),
  default_area_id: DEFAULT_AREA_ID,
  skills: SKILLS,
  worker_filters: ['available', 'nearest', 'rating_4_plus'],
}));

// ================================================================ auth-lite (no passwords - low literacy users)
route('POST', '/api/customers', ({ body }) => {
  const loc = resolveLocation(body);
  const language = LANGUAGES.some((l) => l.id === body.language) ? body.language : 'roman_urdu';
  const r = db.prepare('INSERT INTO customers (name, language, area_id, lat, lng, created_at) VALUES (?,?,?,?,?,?)')
    .run(body.name ? clip(body.name, 60) : null, language, loc.area.id, loc.lat, loc.lng, nowIso());
  const id = insertId(r);
  return { token: makeSession('customer', id), customer: { id, language, area: areaPublic(loc.area.id), location_label: locationLabel(loc.area) } };
});

route('GET', '/api/demo/workers', () => {
  if (!config.demoMode) throw notFound();
  return { workers: db.prepare("SELECT * FROM workers WHERE profile_confirmed = 1 ORDER BY id").all().map((w) => workerCard(w)) };
});
route('POST', '/api/auth/demo-worker', ({ body }) => {
  if (!config.demoMode) throw notFound();
  const w = getWorker(asInt(body.worker_id));
  return { token: makeSession('worker', w.id), worker: workerProfile(w) };
});

// ================================================================ AI + speech helpers
route('POST', '/api/ai/understand', async ({ body }) => {
  if (!clip(body.text, 600) && !body.trade_id) throw bad('TEXT_REQUIRED', 'Masla bolain ya kaam chunain', 'مسئلہ بولیں یا کام چنیں');
  const r = await ai.understandProblem({ text: body.text, trade_id: body.trade_id, language: body.language });
  return { ...r, trade: r.trade_id ? tradePublic(r.trade_id) : null };
});

route('POST', '/api/stt', async ({ raw, query, ctype }) => {
  if (!config.openaiKey) {
    throw new HttpError(501, 'STT_NOT_CONFIGURED', 'Server par speech-to-text nahi. Browser ki Web Speech API istemal karain.', 'سرور پر اسپیچ ٹو ٹیکسٹ نہیں');
  }
  if (!raw?.length) throw bad('AUDIO_REQUIRED', 'Awaaz nahi mili', 'آواز نہیں ملی');
  const form = new FormData();
  const ext = /mp4|m4a/.test(ctype) ? 'm4a' : /ogg/.test(ctype) ? 'ogg' : /wav/.test(ctype) ? 'wav' : 'webm';
  form.append('file', new Blob([raw], { type: ctype }), `speech.${ext}`);
  form.append('model', 'whisper-1');
  form.append('language', query.language === 'english' ? 'en' : 'ur');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${config.openaiKey}` }, body: form, signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new HttpError(502, 'STT_FAILED', 'Awaaz samajh nahi aayi, dobara bolain', 'آواز سمجھ نہیں آئی');
  return { text: (await res.json()).text || '' };
});

// ================================================================ workers: discovery
route('GET', '/api/workers', ({ query }) => {
  const loc = resolveLocation({ area_id: query.area_id, lat: query.lat, lng: query.lng });
  const trade = TRADES[query.trade] ? query.trade : null;
  const radius = Number(query.radius_km) > 0 ? Number(query.radius_km) : 12;
  const minRating = Number(query.min_rating) || 0;
  const onlyAvailable = query.available === '1' || query.available === 'true';

  const rows = trade
    ? db.prepare('SELECT * FROM workers WHERE profile_confirmed = 1 AND trade = ?').all(trade)
    : db.prepare('SELECT * FROM workers WHERE profile_confirmed = 1').all();

  let list = rows.map((w) => ({ w, d: haversineKm(loc.lat, loc.lng, w.lat, w.lng), st: workerStatus(w) }))
    .filter((x) => x.d <= radius)
    .filter((x) => !onlyAvailable || x.st.available)
    .filter((x) => !minRating || (x.w.rating_count > 0 && x.w.rating >= minRating));

  const byRating = query.sort === 'rating';
  // Free workers always come first; then nearest (default) or best rated.
  list.sort((a, b) => Number(b.st.available) - Number(a.st.available) || (byRating ? b.w.rating - a.w.rating || a.d - b.d : a.d - b.d));

  return {
    location: { area: areaPublic(loc.area.id), exact: loc.exact, label: locationLabel(loc.area) },
    trade: trade ? tradePublic(trade) : null,
    count: list.length,
    available_count: list.filter((x) => x.st.available).length,
    workers: list.map((x) => workerCard(x.w, x.d)),
  };
});

// ================================================================ workers: own account (must be before /:id)
route('GET', '/api/workers/me', ({ auth }) => {
  needAuth(auth, 'worker');
  return { worker: workerProfile(getWorker(auth.user_id)) };
});

route('PATCH', '/api/workers/me', ({ auth, body }) => {
  needAuth(auth, 'worker');
  const w = getWorker(auth.user_id);
  const upd = {};
  if (typeof body.available_today === 'boolean') upd.available_today = body.available_today ? 1 : 0; // "Main aaj dastiyab hoon"
  if (body.confirm === true) upd.profile_confirmed = 1; // "Theek hai"
  if (body.years !== undefined) { const y = asInt(body.years); if (y && y > 0 && y < 60) upd.years = y; }
  if (body.name_en) upd.name_en = clip(body.name_en, 60);
  if (body.trade_id && TRADES[body.trade_id] && body.trade_id !== w.trade) { upd.trade = body.trade_id; upd.skills_json = '[]'; }
  if (Array.isArray(body.area_ids)) {
    const ids = body.area_ids.filter((a) => AREAS_BY_ID[a]);
    if (ids.length) { upd.areas_json = JSON.stringify(ids); upd.home_area_id = ids[0]; upd.lat = AREAS_BY_ID[ids[0]].lat; upd.lng = AREAS_BY_ID[ids[0]].lng; }
  }
  const keys = Object.keys(upd);
  if (keys.length) db.prepare(`UPDATE workers SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => upd[k]), w.id);
  return { worker: workerProfile(getWorker(w.id)) };
});

// Voice onboarding: speech transcript (+ optional tapped trade) -> complete profile. Can be called repeatedly
// ("Dobara bolain"): later calls merge into the same worker. Nothing is typed by the worker.
route('POST', '/api/workers/onboard', async ({ auth, body }) => {
  const transcript = clip(body.transcript, 1200);
  const tradeId = TRADES[body.trade_id] ? body.trade_id : null;
  if (!transcript && !tradeId) throw bad('INPUT_REQUIRED', 'Bolain ya apna kaam chunain', 'بولیں یا اپنا کام چنیں');

  const parsed = await ai.parseWorkerProfile({ transcript, trade_id: tradeId, language: body.language });
  const existing = auth?.role === 'worker' ? db.prepare('SELECT * FROM workers WHERE id = ?').get(auth.user_id) : null;
  const trade = parsed.trade_id || existing?.trade || null;
  if (!trade) {
    return { needs: ['trade'], draft: parsed, message: { roman: 'Aap kya kaam karte hain? Neeche se chunain.', urdu: 'آپ کیا کام کرتے ہیں؟ نیچے سے چنیں۔' }, source: parsed.source };
  }

  const loc = parsed.area_ids.length ? AREAS_BY_ID[parsed.area_ids[0]] : null;
  const fallbackLoc = resolveLocation({ area_id: body.area_id, lat: body.lat, lng: body.lng }).area;
  const skills = parsed.skill_ids.length && (!existing || trade === existing.trade) ? parsed.skill_ids : null;

  let workerId, token = null;
  tx(() => {
    if (existing) {
      const areas = parsed.area_ids.length ? parsed.area_ids : parseJson(existing.areas_json, []);
      const home = AREAS_BY_ID[areas[0]] || fallbackLoc;
      db.prepare(`UPDATE workers SET name_en = ?, name_ur = ?, trade = ?, years = ?, areas_json = ?, skills_json = ?, home_area_id = ?, lat = ?, lng = ?, language = ?, profile_confirmed = 0 WHERE id = ?`)
        .run(parsed.name_en || existing.name_en, parsed.name_ur || existing.name_ur, trade, parsed.years ?? existing.years, JSON.stringify(areas),
          trade === existing.trade ? JSON.stringify(skills || parseJson(existing.skills_json, [])) : JSON.stringify(skills || []),
          home.id, home.lat, home.lng, body.language || existing.language, existing.id);
      workerId = existing.id;
    } else {
      const areas = parsed.area_ids.length ? parsed.area_ids : [fallbackLoc.id];
      const home = AREAS_BY_ID[areas[0]];
      const phone = clip(body.phone, 20) || `03${Math.floor(10 + Math.random() * 89)}-${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`; // mock when not given
      const r = db.prepare(`INSERT INTO workers (name_en, name_ur, phone, trade, years, areas_json, skills_json, home_area_id, lat, lng, ai_summary_json, language, source, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(parsed.name_en || 'Karigar', parsed.name_ur, phone, trade, parsed.years, JSON.stringify(areas), JSON.stringify(skills || []), home.id, home.lat, home.lng,
          JSON.stringify(ai.summaryFromTags({}, 0)), body.language || 'roman_urdu', 'onboarded', nowIso());
      workerId = insertId(r);
      token = makeSession('worker', workerId);
    }
  });

  const w = getWorker(workerId);
  const missing = [];
  if (!parsed.name_en && !parsed.name_ur && !existing) missing.push('name');
  if (!w.years) missing.push('years');
  return { token, worker: workerProfile(w), missing, source: parsed.source, used_area_fallback: !loc && !existing };
});

route('GET', '/api/workers/:id', ({ params, query }) => {
  const w = getWorker(asInt(params.id));
  const loc = resolveLocation({ area_id: query.area_id, lat: query.lat, lng: query.lng });
  return { worker: workerProfile(w, haversineKm(loc.lat, loc.lng, w.lat, w.lng)) };
});

// ================================================================ jobs
const GATE = /\d|hazar|hazaar|ہزار|baje|بجے|\bkal\b|\baaj\b|subah|shaam|dopahar|raat|abhi|آج|کل|صبح|شام|دوپہر|رات|ابھی|rupay|روپے/i;

route('POST', '/api/jobs', async ({ auth, body }) => {
  needAuth(auth, 'customer');
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(auth.user_id);
  const w = getWorker(asInt(body.worker_id));
  if (!w.profile_confirmed) throw notFound('Karigar');
  const st = workerStatus(w);
  if (!st.available) throw conflict('WORKER_BUSY', `${w.name_en} abhi masroof hain`, `${w.name_ur || w.name_en} ابھی مصروف ہیں`);

  const text = clip(body.problem_text, 600);
  if (!text && !body.understanding) throw bad('PROBLEM_REQUIRED', 'Pehle masla batayen', 'پہلے مسئلہ بتائیں');
  const loc = body.area_id || body.lat ? resolveLocation(body) : resolveLocation({ area_id: customer.area_id, lat: customer.lat, lng: customer.lng });

  // reuse an open conversation with the same worker
  const open = db.prepare("SELECT * FROM jobs WHERE customer_id = ? AND worker_id = ? AND status = 'negotiating'").get(customer.id, w.id);
  if (open) return { job: serializeJob(open, 'customer'), messages: jobMessages(open.id), reused: true };

  const u = body.understanding && body.understanding.problem ? body.understanding
    : await ai.understandProblem({ text, trade_id: w.trade, language: customer.language });
  const dist = haversineKm(loc.lat, loc.lng, w.lat, w.lng);
  const id = tx(() => {
    const r = db.prepare(`INSERT INTO jobs (customer_id, worker_id, trade, problem_text, problem_json, area_id, lat, lng, distance_km, deal_job_json, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(customer.id, w.id, w.trade, text, JSON.stringify({ problem: u.problem, summary: u.summary, urgency: u.urgency }), loc.area.id, loc.lat, loc.lng, dist,
        u.problem?.roman ? JSON.stringify(u.problem) : null, nowIso());
    const jid = insertId(r);
    addMessage(jid, 'customer', text || u.problem?.roman || '', { urdu: u.problem?.urdu || null });
    return jid;
  });
  return { job: serializeJob(getJob(id), 'customer'), messages: jobMessages(id), reused: false };
});

// Both roles. Worker sees their inbox ("Naya kaam"); customer sees their conversations/bookings.
route('GET', '/api/jobs/mine', ({ auth, query }) => {
  needAuth(auth);
  const col = auth.role === 'worker' ? 'worker_id' : 'customer_id';
  const statuses = query.status ? query.status.split(',') : auth.role === 'worker' ? ['negotiating', 'booked'] : ['negotiating', 'booked', 'completed'];
  const rows = db.prepare(`SELECT * FROM jobs WHERE ${col} = ? AND status IN (${statuses.map(() => '?').join(',')}) ORDER BY id DESC LIMIT 50`).all(auth.user_id, ...statuses);
  return {
    jobs: rows.map((j) => {
      const first = db.prepare('SELECT * FROM messages WHERE job_id = ? ORDER BY id LIMIT 1').get(j.id);
      const meta = parseJson(first?.meta_json, {});
      return { ...serializeJob(j, auth.role), first_message: first ? { text: first.text, text_ur: meta.urdu || null } : null };
    }),
  };
});

route('GET', '/api/jobs/:id', ({ auth, params, query }) => {
  const job = getJob(asInt(params.id));
  const role = requireParticipant(job, auth);
  return { job: serializeJob(job, role), messages: jobMessages(job.id, asInt(query.after) || 0) }; // poll with ?after=<last message id>
});

route('POST', '/api/jobs/:id/messages', async ({ auth, params, body }) => {
  const job = getJob(asInt(params.id));
  const role = requireParticipant(job, auth);
  if (!['negotiating', 'booked'].includes(job.status)) throw conflict('JOB_CLOSED', 'Yeh baat-cheet band ho chuki hai', 'یہ بات چیت بند ہو چکی ہے');
  const text = clip(body.text, 500);
  if (!text) throw bad('TEXT_REQUIRED', 'Paigham khali hai', 'پیغام خالی ہے');
  const mid = addMessage(job.id, role, text);

  // The agreed job/time/price card is derived from what the worker says in chat.
  if (role === 'worker' && job.status === 'negotiating' && GATE.test(text)) {
    const msgs = jobMessages(job.id);
    const d = await ai.extractDeal({ messages: msgs, problem: parseJson(job.problem_json, {}).problem });
    const price = d.price ?? job.deal_price;
    if (d.price != null || d.time || d.job) {
      db.prepare('UPDATE jobs SET deal_price = ?, deal_time_json = COALESCE(?, deal_time_json), deal_job_json = COALESCE(?, deal_job_json), deal_by = ? WHERE id = ?')
        .run(price, d.time ? JSON.stringify(d.time) : null, d.job ? JSON.stringify(d.job) : null, d.price != null ? 'ai' : job.deal_by, job.id);
    }
  }
  return { message: jobMessages(job.id, mid - 1)[0], job: serializeJob(getJob(job.id), role) };
});

// Worker taps a price chip (Rs 1,000 / 1,500 / 2,000) or speaks their own, then "Qabool hai".
route('POST', '/api/jobs/:id/accept', ({ auth, params, body }) => {
  needAuth(auth, 'worker');
  const job = getJob(asInt(params.id));
  requireParticipant(job, auth);
  if (job.status !== 'negotiating') throw conflict('JOB_CLOSED', 'Yeh kaam ab khula nahi', 'یہ کام اب کھلا نہیں');
  const w = getWorker(job.worker_id);
  if (!workerStatus(w).available) throw conflict('WORKER_BUSY', 'Aap abhi masroof hain', 'آپ ابھی مصروف ہیں');
  let price = asInt(body.price);
  if (price == null && body.price_text) price = ai.parsePrice(String(body.price_text)); // "apni qeemat bolain"
  if (!price || price < 50 || price > 200000) throw bad('PRICE_INVALID', 'Qeemat sahi nahi', 'قیمت درست نہیں');

  const timeText = clip(body.time_text, 60);
  const time = (timeText && (ai.parseTime(timeText) || { roman: timeText, urdu: null })) || parseJson(job.deal_time_json, null)
    || jobMessages(job.id).map((m) => ai.parseTime(m.text)).filter(Boolean).pop() || { roman: 'Abhi', urdu: 'ابھی' };

  const roman = `Ji haan, ${time.roman.charAt(0).toLowerCase() + time.roman.slice(1)} aa jaoonga, ${fmtPrice(price)} rupay lagenge`;
  const urdu = `جی ہاں، ${time.urdu || time.roman} آ جاؤں گا، ${fmtPrice(price)} روپے لگیں گے`;
  tx(() => {
    db.prepare("UPDATE jobs SET deal_price = ?, deal_time_json = ?, deal_by = 'worker', worker_accepted = 1 WHERE id = ?").run(price, JSON.stringify(time), job.id);
    addMessage(job.id, 'worker', roman, { kind: 'accept', urdu });
  });
  return { job: serializeJob(getJob(job.id), 'worker'), messages: jobMessages(job.id) };
});

route('POST', '/api/jobs/:id/decline', ({ auth, params }) => {
  needAuth(auth, 'worker');
  const job = getJob(asInt(params.id));
  requireParticipant(job, auth);
  if (job.status !== 'negotiating') throw conflict('JOB_CLOSED', 'Yeh kaam ab khula nahi', 'یہ کام اب کھلا نہیں');
  tx(() => {
    db.prepare("UPDATE jobs SET status = 'declined' WHERE id = ?").run(job.id);
    addMessage(job.id, 'worker', 'Maazrat, abhi yeh kaam nahi kar sakta', { kind: 'decline', urdu: 'معذرت، ابھی یہ کام نہیں کر سکتا' });
  });
  return { job: serializeJob(getJob(job.id), 'worker') };
});

// The consistency-critical step: atomically lock the worker. Exactly one customer can win.
route('POST', '/api/jobs/:id/book', ({ auth, params }) => {
  needAuth(auth, 'customer');
  const jobId = asInt(params.id);
  const result = tx(() => {
    const job = getJob(jobId);
    requireParticipant(job, auth);
    if (job.status === 'booked') throw conflict('ALREADY_BOOKED', 'Booking pehle se pakki hai', 'بکنگ پہلے سے پکی ہے');
    if (job.status !== 'negotiating') throw conflict('JOB_CLOSED', 'Yeh baat-cheet band ho chuki hai', 'یہ بات چیت بند ہو چکی ہے');
    if (job.deal_price == null) throw new HttpError(422, 'NO_DEAL', 'Pehle qeemat tay karain', 'پہلے قیمت طے کریں');

    const lock = db.prepare('UPDATE workers SET busy_job_id = ? WHERE id = ? AND busy_job_id IS NULL AND available_today = 1').run(job.id, job.worker_id);
    if (lock.changes !== 1) {
      const w = getWorker(job.worker_id);
      throw conflict('WORKER_UNAVAILABLE', `${w.name_en} ab masroof hain. Doosra karigar chunain.`, `${w.name_ur || w.name_en} اب مصروف ہیں۔ دوسرا کاریگر چنیں۔`);
    }
    const time = job.deal_time_json || JSON.stringify({ roman: 'Abhi', urdu: 'ابھی' });
    db.prepare("UPDATE jobs SET status = 'booked', booked_at = ?, deal_time_json = ? WHERE id = ?").run(nowIso(), time, job.id);
    addMessage(job.id, 'system', 'Booking pakki ho gayi', { kind: 'booked', urdu: 'بکنگ پکی ہو گئی' });
    // everybody else still talking to this worker is told right away
    const others = db.prepare("SELECT id FROM jobs WHERE worker_id = ? AND status = 'negotiating' AND id != ?").all(job.worker_id, job.id);
    for (const o of others) addMessage(o.id, 'system', 'Karigar doosray kaam mein masroof ho gaye hain', { kind: 'worker_taken', urdu: 'کاریگر دوسرے کام میں مصروف ہو گئے ہیں' });
    return job.id;
  });
  return { job: serializeJob(getJob(result), 'customer'), messages: jobMessages(result) };
});

function closeJob(jobId, auth, to) {
  const job = getJob(jobId);
  requireParticipant(job, auth);
  tx(() => {
    const j = getJob(jobId);
    if (to === 'completed') {
      if (j.status !== 'booked') throw conflict('NOT_BOOKED', 'Pehle booking honi chahiye', 'پہلے بکنگ ہونی چاہیے');
      db.prepare("UPDATE jobs SET status = 'completed', completed_at = ? WHERE id = ?").run(nowIso(), j.id);
      db.prepare('UPDATE workers SET jobs_count = jobs_count + 1 WHERE id = ?').run(j.worker_id);
      releaseWorker(j.worker_id, j.id);
    } else {
      if (!['negotiating', 'booked'].includes(j.status)) throw conflict('JOB_CLOSED', 'Yeh kaam pehle hi band hai', 'یہ کام پہلے ہی بند ہے');
      db.prepare("UPDATE jobs SET status = 'cancelled' WHERE id = ?").run(j.id);
      if (j.status === 'booked') releaseWorker(j.worker_id, j.id);
      addMessage(j.id, 'system', 'Kaam mansookh kar diya gaya', { kind: 'cancelled', urdu: 'کام منسوخ کر دیا گیا' });
    }
  });
  return getJob(jobId);
}
route('POST', '/api/jobs/:id/complete', ({ auth, params }) => {
  needAuth(auth);
  return { job: serializeJob(closeJob(asInt(params.id), auth, 'completed'), auth.role) };
});
route('POST', '/api/jobs/:id/cancel', ({ auth, params }) => {
  needAuth(auth);
  return { job: serializeJob(closeJob(asInt(params.id), auth, 'cancelled'), auth.role) };
});

// "Kaam kaisa raha?" - thumbs up/down and/or a voice note; AI writes the review. Also closes the job
// and frees the worker, so the next customer sees them as available again.
route('POST', '/api/jobs/:id/review', async ({ auth, params, body }) => {
  needAuth(auth, 'customer');
  const jobId = asInt(params.id);
  const job = getJob(jobId);
  requireParticipant(job, auth);
  if (!['booked', 'completed'].includes(job.status)) throw conflict('NOT_BOOKED', 'Review kaam ke baad hota hai', 'ریویو کام کے بعد ہوتا ہے');
  if (db.prepare('SELECT 1 FROM reviews WHERE job_id = ?').get(jobId)) throw conflict('ALREADY_REVIEWED', 'Aap review de chuke hain', 'آپ ریویو دے چکے ہیں');

  const sentiment = ['good', 'bad'].includes(body.sentiment) ? body.sentiment : null; // Acha / Theek nahi
  const stars = asInt(body.stars);
  const transcript = clip(body.transcript, 800);
  if (!sentiment && !stars && !transcript) throw bad('INPUT_REQUIRED', 'Acha ya Theek nahi dabayen, ya bol kar batayen', 'اچھا یا ٹھیک نہیں دبائیں، یا بول کر بتائیں');
  if (stars !== null && (stars < 1 || stars > 5)) throw bad('STARS_INVALID', 'Stars 1 se 5 tak hon', 'ستارے 1 سے 5 تک ہوں');

  const gen = await ai.buildReview({ transcript, sentiment, stars, tradeId: job.trade });
  const reviewId = tx(() => {
    const j = getJob(jobId);
    if (db.prepare('SELECT 1 FROM reviews WHERE job_id = ?').get(jobId)) throw conflict('ALREADY_REVIEWED', 'Aap review de chuke hain', 'آپ ریویو دے چکے ہیں');
    const r = db.prepare('INSERT INTO reviews (job_id, worker_id, customer_id, rating, text_json, tags_json, transcript, sentiment, source, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(j.id, j.worker_id, j.customer_id, gen.rating, JSON.stringify(gen.review), JSON.stringify(gen.tags), transcript || null, sentiment, gen.source, nowIso());
    const w = getWorker(j.worker_id);
    const newAvg = (w.rating * w.rating_count + gen.rating) / (w.rating_count + 1);
    db.prepare('UPDATE workers SET rating = ?, rating_count = rating_count + 1 WHERE id = ?').run(newAvg, w.id);
    if (j.status === 'booked') {
      db.prepare("UPDATE jobs SET status = 'completed', completed_at = ? WHERE id = ?").run(nowIso(), j.id);
      db.prepare('UPDATE workers SET jobs_count = jobs_count + 1 WHERE id = ?').run(w.id);
      releaseWorker(w.id, j.id);
    }
    return insertId(r);
  });
  await refreshWorkerSummary(job.worker_id);
  const w = getWorker(job.worker_id);
  return {
    review: { id: reviewId, rating: gen.rating, text: gen.review, tags: gen.tags, source: gen.source },
    worker: workerCard(w),
    ai_summary: parseJson(w.ai_summary_json, null),
    job: serializeJob(getJob(jobId), 'customer'),
  };
});
