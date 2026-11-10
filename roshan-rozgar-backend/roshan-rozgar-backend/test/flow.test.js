import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.AI_MODE = 'off'; // deterministic: exercises the rule-based fallbacks
process.env.GEMINI_API_KEY = '';
process.env.GOOGLE_API_KEY = '';

const { start } = await import('../src/server.js');
let server, base;

const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
};
const newCustomer = async (area_id = 'g-10') => (await call('POST', '/api/customers', { body: { language: 'roman_urdu', area_id } })).data.token;
const demoWorker = async (id) => (await call('POST', '/api/auth/demo-worker', { body: { worker_id: id } })).data.token;

before(async () => { server = await start(0); base = `http://localhost:${server.address().port}`; });
after(() => server.close());

test('health + config', async () => {
  const h = await call('GET', '/api/health');
  assert.equal(h.status, 200);
  assert.equal(h.data.ai.mode, 'fallback_only');
  const c = await call('GET', '/api/config');
  assert.equal(c.data.trades.length, 5);
});

test('AI understands a problem (Roman Urdu + Urdu script)', async () => {
  const a = await call('POST', '/api/ai/understand', { body: { text: 'Pankha nahi chal raha' } });
  assert.equal(a.data.trade_id, 'electrician');
  assert.match(a.data.summary.roman, /electrician chahiye/);
  const b = await call('POST', '/api/ai/understand', { body: { text: 'میرے نل سے پانی لیک ہو رہا ہے' } });
  assert.equal(b.data.trade_id, 'plumber');
  const c = await call('POST', '/api/ai/understand', { body: { text: 'AC thanda nahi kar raha' } });
  assert.equal(c.data.trade_id, 'ac_technician');
});

test('discovery matches the Figma: 3 electricians near G-10, nearest first, busy last', async () => {
  const r = await call('GET', '/api/workers?trade=electrician&area_id=g-10&radius_km=2.5');
  const names = r.data.workers.map((w) => `${w.name.en}:${w.distance_km}:${w.status}`);
  assert.deepEqual(names, ['Ahmed Khan:0.8:available', 'Bilal Hussain:1.4:available', 'Imran Ali:2.1:busy']);
  const only = await call('GET', '/api/workers?trade=electrician&area_id=g-10&available=1&min_rating=4');
  assert.ok(only.data.workers.every((w) => w.available && w.rating >= 4));
  assert.ok(!only.data.workers.some((w) => w.name.en === 'Imran Ali'));
});

test('worker profile has verified stats, AI khulasa and reviews', async () => {
  const r = await call('GET', '/api/workers/1?area_id=g-10');
  const w = r.data.worker;
  assert.equal(w.rating, 4.8);
  assert.equal(w.jobs_count, 52);
  assert.equal(w.years, 15);
  assert.equal(w.ai_summary.roman, 'Waqt par aate hain, kaam saaf, qeemat pehle batate hain');
  assert.ok(w.reviews.length >= 2);
  assert.equal(w.phone, undefined); // phone is never public
});

test('full flow: chat -> deal -> book -> busy -> review -> free again', async () => {
  const cust = await newCustomer();
  const worker = await demoWorker(1);

  const created = await call('POST', '/api/jobs', { token: cust, body: { worker_id: 1, problem_text: 'Pankha nahi chal raha' } });
  assert.equal(created.status, 200);
  const jobId = created.data.job.id;
  assert.equal(created.data.job.deal.ready, false);

  // worker inbox
  const inbox = await call('GET', '/api/jobs/mine', { token: worker });
  assert.equal(inbox.data.jobs[0].first_message.text, 'Pankha nahi chal raha');

  // booking before a deal exists is rejected
  assert.equal((await call('POST', `/api/jobs/${jobId}/book`, { token: cust })).status, 422);

  // customer asks, worker answers in chat -> deal extracted from the chat
  await call('POST', `/api/jobs/${jobId}/messages`, { token: cust, body: { text: 'Pankha theek karna hai, aaj shaam aa sakte hain?' } });
  const m = await call('POST', `/api/jobs/${jobId}/messages`, { token: worker, body: { text: 'Ji haan, shaam 4 baje aa jaoonga, 1,500 rupay lagenge' } });
  assert.equal(m.data.job.deal.price, 1500);
  assert.equal(m.data.job.deal.time.roman, 'Shaam 4 baje');
  assert.equal(m.data.job.deal.ready, true);

  // customer cannot read someone else's job
  const other = await newCustomer();
  assert.equal((await call('GET', `/api/jobs/${jobId}`, { token: other })).status, 404);

  const booked = await call('POST', `/api/jobs/${jobId}/book`, { token: cust });
  assert.equal(booked.status, 200);
  assert.equal(booked.data.job.status, 'booked');
  assert.ok(booked.data.job.worker.phone); // call button unlocks only after booking
  assert.equal(booked.data.job.worker.status, 'busy');

  // Ahmed is now hidden from other customers' "available" list
  const list = await call('GET', '/api/workers?trade=electrician&area_id=g-10&available=1');
  assert.ok(!list.data.workers.some((w) => w.name.en === 'Ahmed Khan'));
  // ...and a second customer cannot start a job with him
  assert.equal((await call('POST', '/api/jobs', { token: other, body: { worker_id: 1, problem_text: 'Light kharab' } })).status, 409);

  // review: thumbs up + voice note -> job completed, worker free again, rating updated
  const rv = await call('POST', `/api/jobs/${jobId}/review`, { token: cust, body: { sentiment: 'good', transcript: 'Bohat acha kaam kiya, waqt par aaye aur saaf kaam kiya' } });
  assert.equal(rv.status, 200);
  assert.ok(rv.data.review.tags.includes('punctual'));
  assert.equal(rv.data.job.status, 'completed');
  assert.equal(rv.data.worker.status, 'available');
  assert.equal(rv.data.worker.jobs_count, 53);
  assert.equal((await call('POST', `/api/jobs/${jobId}/review`, { token: cust, body: { sentiment: 'good' } })).status, 409);
});

test('no double booking: two customers race for the same worker, exactly one wins', async () => {
  const worker = await demoWorker(2); // Bilal
  const c1 = await newCustomer(), c2 = await newCustomer();
  const j1 = (await call('POST', '/api/jobs', { token: c1, body: { worker_id: 2, problem_text: 'Switch kharab' } })).data.job.id;
  const j2 = (await call('POST', '/api/jobs', { token: c2, body: { worker_id: 2, problem_text: 'Light nahi aa rahi' } })).data.job.id;
  await call('POST', `/api/jobs/${j1}/accept`, { token: worker, body: { price: 1000, time_text: 'abhi' } });
  await call('POST', `/api/jobs/${j2}/accept`, { token: worker, body: { price: 1500, time_text: 'aaj shaam 6 baje' } });

  const [a, b] = await Promise.all([
    call('POST', `/api/jobs/${j1}/book`, { token: c1 }),
    call('POST', `/api/jobs/${j2}/book`, { token: c2 }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  const loser = a.status === 409 ? a : b;
  assert.equal(loser.data.error.code, 'WORKER_UNAVAILABLE');
  const bilal = (await call('GET', '/api/workers/2')).data.worker;
  assert.equal(bilal.status, 'busy');
  // the losing customer got a system message in their chat
  const loserJob = a.status === 409 ? j1 : j2;
  const msgs = (await call('GET', `/api/jobs/${loserJob}`, { token: a.status === 409 ? c1 : c2 })).data.messages;
  assert.ok(msgs.some((x) => x.kind === 'worker_taken'));
});

test('worker can decline; busy worker cannot accept new work; availability toggle works', async () => {
  const worker = await demoWorker(6); // Usman
  const c = await newCustomer();
  const j = (await call('POST', '/api/jobs', { token: c, body: { worker_id: 6, problem_text: 'Nalka leak ho raha hai' } })).data.job.id;
  assert.equal((await call('POST', `/api/jobs/${j}/decline`, { token: worker })).data.job.status, 'declined');

  const off = await call('PATCH', '/api/workers/me', { token: worker, body: { available_today: false } });
  assert.equal(off.data.worker.status, 'busy');
  assert.equal(off.data.worker.busy_reason, 'off_today');
  assert.equal((await call('POST', '/api/jobs', { token: c, body: { worker_id: 6, problem_text: 'Nalka' } })).status, 409);
  await call('PATCH', '/api/workers/me', { token: worker, body: { available_today: true } });
});

test('voice onboarding: transcript -> complete profile -> confirm -> discoverable', async () => {
  const r = await call('POST', '/api/workers/onboard', {
    body: { transcript: 'Mera naam Zahid Ali hai, main electrician hoon, 12 saal ka tajurba hai, G-9 aur G-10 mein kaam karta hoon, wiring aur pankhe theek karta hoon' },
  });
  assert.equal(r.status, 200);
  const w = r.data.worker;
  assert.equal(w.name.en, 'Zahid Ali');
  assert.equal(w.trade.id, 'electrician');
  assert.equal(w.years, 12);
  assert.deepEqual(w.areas.map((a) => a.id), ['g-9', 'g-10']);
  assert.deepEqual(w.skills.map((s) => s.id).sort(), ['fan_repair', 'wiring']);
  assert.match(w.intro.roman, /12 saal ka tajurba/);

  // not visible until the worker taps "Theek hai"
  const before = await call('GET', '/api/workers?trade=electrician&area_id=g-9');
  assert.ok(!before.data.workers.some((x) => x.id === w.id));
  const token = r.data.token;
  await call('PATCH', '/api/workers/me', { token, body: { confirm: true } });
  const after = await call('GET', '/api/workers?trade=electrician&area_id=g-9');
  assert.ok(after.data.workers.some((x) => x.id === w.id));

  // "Dobara bolain" merges into the same worker
  const again = await call('POST', '/api/workers/onboard', { token, body: { transcript: 'Mere 15 saal ka tajurba hai' } });
  assert.equal(again.data.worker.id, w.id);
  assert.equal(again.data.worker.years, 15);
  assert.equal(again.data.worker.name.en, 'Zahid Ali');

  // only a tapped trade tile (no speech) also works; unknown trade asks for the tile
  const tile = await call('POST', '/api/workers/onboard', { body: { trade_id: 'plumber' } });
  assert.equal(tile.data.worker.trade.id, 'plumber');
  const none = await call('POST', '/api/workers/onboard', { body: { transcript: 'hello' } });
  assert.deepEqual(none.data.needs, ['trade']);
});

test('validation and auth', async () => {
  assert.equal((await call('POST', '/api/jobs', { body: { worker_id: 1, problem_text: 'x' } })).status, 401);
  assert.equal((await call('GET', '/api/workers/9999')).status, 404);
  assert.equal((await call('GET', '/api/nope')).status, 404);
  const cust = await newCustomer();
  assert.equal((await call('POST', '/api/jobs/1/review', { token: cust, body: { sentiment: 'good' } })).status, 404);
});
