import { db } from './db.js';
import {
  TRADES, AREAS, AREAS_BY_ID, DEFAULT_AREA_ID, tradePublic, areaPublic, skillPublic,
} from './catalog.js';
import { parseJson, round1, haversineKm, notFound, bad } from './util.js';
import { summariseWorker } from './ai.js';

// ---------------------------------------------------------------- locations
export function resolveLocation({ area_id, lat, lng } = {}) {
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && lat !== null && lng !== null && lat !== '' && lng !== '') {
    const la = Number(lat), ln = Number(lng);
    let nearest = AREAS[0], best = Infinity;
    for (const a of AREAS) {
      const d = haversineKm(la, ln, a.lat, a.lng);
      if (d < best) { best = d; nearest = a; }
    }
    return { lat: la, lng: ln, area: nearest, exact: true };
  }
  const area = AREAS_BY_ID[area_id] || AREAS_BY_ID[DEFAULT_AREA_ID];
  return { lat: area.lat, lng: area.lng, area, exact: false };
}

export const locationLabel = (area) => ({
  roman: `${area.name} ke qareeb`, urdu: `${area.name_ur} کے قریب`, en: `Near ${area.name}`,
});

// ---------------------------------------------------------------- workers
export function getWorker(id) {
  const w = db.prepare('SELECT * FROM workers WHERE id = ?').get(id);
  if (!w) throw notFound('Karigar');
  return w;
}

export function workerStatus(w) {
  if (w.busy_job_id) return { available: false, status: 'busy', reason: 'booked' };
  if (!w.available_today) return { available: false, status: 'busy', reason: 'off_today' };
  return { available: true, status: 'available', reason: null };
}

export function workerCard(w, distance = null) {
  const st = workerStatus(w);
  return {
    id: w.id,
    name: { en: w.name_en, ur: w.name_ur || null },
    trade: tradePublic(w.trade),
    rating: w.rating_count > 0 ? round1(w.rating) : null,
    jobs_count: w.jobs_count,
    years: w.years,
    distance_km: distance == null ? null : round1(distance),
    available: st.available,
    status: st.status, // 'available' | 'busy'  (the two badges in the Figma)
    busy_reason: st.reason, // 'booked' | 'off_today' | null
    verified: !!w.verified,
  };
}

export function buildIntro(w) {
  const trade = TRADES[w.trade];
  const areas = parseJson(w.areas_json, []).map((id) => AREAS_BY_ID[id]).filter(Boolean);
  const aRoman = areas.map((a) => a.name).join(', ');
  const aUrdu = areas.map((a) => a.name_ur).join('، ');
  const nameUr = w.name_ur || w.name_en;
  const y = w.years;
  return {
    roman: `Main ${w.name_en} hoon. ${trade.roman}${y ? `, ${y} saal ka tajurba` : ''}.${aRoman ? ` Ilaqay: ${aRoman}.` : ''}`,
    urdu: `میں ${nameUr} ہوں۔ ${trade.urdu}${y ? `، ${y} سال کا تجربہ` : ''}۔${aUrdu ? ` علاقے: ${aUrdu}۔` : ''}`,
    en: `I am ${w.name_en}, a ${trade.en}${y ? ` with ${y} years of experience` : ''}.${aRoman ? ` I work in ${aRoman}.` : ''}`,
  };
}

export function workerReviews(workerId, limit = 10) {
  return db.prepare('SELECT * FROM reviews WHERE worker_id = ? ORDER BY created_at DESC, id DESC LIMIT ?').all(workerId, limit)
    .map((r) => ({
      id: r.id, rating: r.rating, text: parseJson(r.text_json, {}), tags: parseJson(r.tags_json, []),
      created_at: r.created_at,
    }));
}

export function workerProfile(w, distance = null) {
  const areas = parseJson(w.areas_json, []).map(areaPublic).filter(Boolean);
  return {
    ...workerCard(w, distance),
    profile_confirmed: !!w.profile_confirmed,
    available_today: !!w.available_today,
    areas,
    skills: parseJson(w.skills_json, []).map((s) => skillPublic(w.trade, s)).filter(Boolean),
    intro: buildIntro(w),
    ai_summary: parseJson(w.ai_summary_json, null),
    reviews: workerReviews(w.id),
    generated_from_voice: w.source === 'onboarded',
  };
}

// Recompute the "AI khulasa" from the latest reviews (called after every new review)
export async function refreshWorkerSummary(workerId) {
  const reviews = workerReviews(workerId, 20);
  const s = await summariseWorker({ reviews });
  db.prepare('UPDATE workers SET ai_summary_json = ? WHERE id = ?').run(JSON.stringify(s), workerId);
  return s;
}

// ---------------------------------------------------------------- jobs
export function getJob(id) {
  const j = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  if (!j) throw notFound('Kaam');
  return j;
}

export function jobMessages(jobId, afterId = 0) {
  return db.prepare('SELECT * FROM messages WHERE job_id = ? AND id > ? ORDER BY id').all(jobId, afterId).map((m) => {
    const meta = parseJson(m.meta_json, {});
    return { id: m.id, sender: m.sender, kind: m.kind, text: m.text, text_ur: meta.urdu || null, created_at: m.created_at };
  });
}

export function addMessage(jobId, sender, text, { kind = 'text', urdu = null } = {}) {
  const r = db.prepare('INSERT INTO messages (job_id, sender, kind, text, meta_json, created_at) VALUES (?,?,?,?,?,?)')
    .run(jobId, sender, kind, text, urdu ? JSON.stringify({ urdu }) : null, new Date().toISOString());
  return Number(r.lastInsertRowid);
}

export function serializeJob(job, viewerRole) {
  const w = getWorker(job.worker_id);
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(job.customer_id);
  const understanding = parseJson(job.problem_json, {});
  const st = workerStatus(w);
  const showPhone = viewerRole === 'worker' ? false : ['booked', 'completed'].includes(job.status);
  const card = workerCard(w, job.distance_km);
  const reviewed = !!db.prepare('SELECT 1 FROM reviews WHERE job_id = ?').get(job.id);
  const dealJob = parseJson(job.deal_job_json, null) || understanding.problem || null;
  return {
    id: job.id,
    status: job.status, // negotiating | booked | completed | declined | cancelled
    created_at: job.created_at,
    booked_at: job.booked_at,
    completed_at: job.completed_at,
    trade: tradePublic(job.trade),
    problem: { text: job.problem_text, ...(understanding.problem ? { roman: understanding.problem.roman, urdu: understanding.problem.urdu, en: understanding.problem.en } : {}), summary: understanding.summary || null, urgency: understanding.urgency || 'now' },
    area: areaPublic(job.area_id),
    distance_km: round1(job.distance_km),
    worker: { ...card, ...(showPhone ? { phone: w.phone } : {}) },
    customer: { id: c.id, name: c.name || null },
    deal: {
      job: dealJob,
      time: parseJson(job.deal_time_json, null),
      price: job.deal_price,
      by: job.deal_by,
      worker_accepted: !!job.worker_accepted,
      ready: job.deal_price != null, // enables the "Book karain" button
    },
    // true while the worker can still be booked for this job
    worker_available: job.status === 'negotiating' ? st.available : job.status === 'booked',
    // after booking the Figma shows "Masroof / Busy - hidden from other customers"
    worker_hidden_from_others: job.status === 'booked',
    price_options: TRADES[job.trade].price_options,
    can_review: ['booked', 'completed'].includes(job.status) && !reviewed,
    reviewed,
  };
}

export function requireParticipant(job, auth) {
  if (!auth) throw bad('AUTH_REQUIRED', 'Pehle login karain', 'پہلے لاگ ان کریں');
  const ok = (auth.role === 'customer' && job.customer_id === auth.user_id) || (auth.role === 'worker' && job.worker_id === auth.user_id);
  if (!ok) throw notFound('Kaam');
  return auth.role;
}

// Free a worker if (and only if) they are currently held by this job.
export function releaseWorker(workerId, jobId) {
  db.prepare('UPDATE workers SET busy_job_id = NULL WHERE id = ? AND busy_job_id = ?').run(workerId, jobId);
}
