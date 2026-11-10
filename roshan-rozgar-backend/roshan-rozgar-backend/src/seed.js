// Seed data. EVERYTHING here is fictional/simulated: names, phone numbers, ratings, jobs and reviews.
// Coordinates are placed relative to G-10 so distances match the Figma (0.8 km / 1.4 km / 2.1 km).
import { fileURLToPath } from 'node:url';
import { db, tx, insertId } from './db.js';
import { AREAS_BY_ID } from './catalog.js';
import { kmToLat, kmToLng } from './util.js';
import { summaryFromTags } from './ai.js';

const REF = AREAS_BY_ID['g-10'];

const POOL = [
  { tags: ['punctual', 'skilled'], rating: 5, roman: 'Bohat acha kaam, waqt par pahunche', urdu: 'بہت اچھا کام، وقت پر پہنچے', en: 'Very good work, arrived on time' },
  { tags: ['fair_price'], rating: 5, roman: 'Qeemat theek thi', urdu: 'قیمت ٹھیک تھی', en: 'The price was fair' },
  { tags: ['clean', 'polite'], rating: 5, roman: 'Kaam saaf kiya, safai ka khayal rakha', urdu: 'کام صاف کیا، صفائی کا خیال رکھا', en: 'Clean work, left no mess' },
  { tags: ['price_upfront', 'punctual'], rating: 4, roman: 'Pehle hi qeemat bata di, waqt par aaye', urdu: 'پہلے ہی قیمت بتا دی، وقت پر آئے', en: 'Told the price upfront, came on time' },
  { tags: ['skilled'], rating: 5, roman: 'Masla foran samajh gaye aur theek kar diya', urdu: 'مسئلہ فوراً سمجھ گئے اور ٹھیک کر دیا', en: 'Understood the problem at once and fixed it' },
  { tags: ['polite', 'fair_price'], rating: 5, roman: 'Akhlaaq acha, ghar walon se izzat se baat ki', urdu: 'اخلاق اچھا، گھر والوں سے عزت سے بات کی', en: 'Polite with the family, fair price' },
  { tags: ['late', 'skilled'], rating: 4, roman: 'Thora late aaye, magar kaam theek kiya', urdu: 'تھوڑا لیٹ آئے، مگر کام ٹھیک کیا', en: 'Came a little late but did the job well' },
  { tags: ['clean', 'price_upfront'], rating: 5, roman: 'Safai se kaam kiya, extra paise nahi maange', urdu: 'صفائی سے کام کیا، اضافی پیسے نہیں مانگے', en: 'Tidy work, asked for no extra money' },
  { tags: ['punctual', 'fair_price'], rating: 5, roman: 'Waqt par aaye, rate theek laga', urdu: 'وقت پر آئے، ریٹ ٹھیک لگا', en: 'On time, fair rate' },
  { tags: ['skilled', 'clean'], rating: 5, roman: 'Kaafi tajurba-kaar, kaam bohat saaf', urdu: 'کافی تجربہ کار، کام بہت صاف', en: 'Experienced, very clean work' },
];

// name, urdu, trade, years, areas, skills, [km north of G-10, km east], rating, jobs, review pool idx, extras
const W = [
  ['Ahmed Khan', 'احمد خان', 'electrician', 15, ['g-10', 'g-11', 'i-8'], ['wiring', 'fan_repair', 'solar_breaker'], [0.8, 0], 4.8, 52, [0, 1, 2, 3]],
  ['Bilal Hussain', 'بلال حسین', 'electrician', 8, ['g-10', 'g-9', 'f-10'], ['wiring', 'switch_socket', 'lighting'], [1.4, 0], 4.6, 31, [6, 1, 5, 8]],
  ['Imran Ali', 'عمران علی', 'electrician', 12, ['g-10', 'g-11', 'g-13'], ['wiring', 'ups_inverter', 'short_circuit'], [2.1, 0], 4.9, 88, [9, 4, 0, 7], { busy: true }],
  ['Rashid Mehmood', 'راشد محمود', 'electrician', 6, ['g-11', 'g-13', 'i-10'], ['fan_repair', 'lighting'], [-2.4, -1.5], 4.3, 19, [8, 1, 4, 6]],
  ['Tariq Javed', 'طارق جاوید', 'electrician', 20, ['i-8', 'i-9', 'h-8'], ['wiring', 'solar_breaker', 'short_circuit'], [-3.0, 4.0], 4.1, 12, [6, 1, 5]],
  ['Usman Ghani', 'عثمان غنی', 'plumber', 10, ['g-10', 'g-9', 'g-11'], ['pipe_leak', 'tap_fix', 'geyser'], [-1.1, 0.4], 4.7, 40, [0, 7, 2, 4]],
  ['Shahid Iqbal', 'شاہد اقبال', 'plumber', 14, ['g-10', 'f-10', 'e-11'], ['drain', 'toilet', 'water_tank'], [1.8, -1.4], 4.4, 22, [3, 1, 8], { off: true }],
  ['Naveed Akhtar', 'نوید اختر', 'plumber', 5, ['g-9', 'h-9', 'i-8'], ['tap_fix', 'motor_pump'], [-2.2, 2.0], 4.2, 15, [6, 1, 5]],
  ['Faisal Mehmood', 'فیصل محمود', 'ac_technician', 11, ['g-10', 'g-11', 'g-9'], ['ac_install', 'gas_refill', 'ac_service'], [1.6, 0.6], 4.8, 61, [0, 3, 9, 7]],
  ['Adeel Raza', 'عدیل رضا', 'ac_technician', 7, ['f-10', 'f-11', 'g-10'], ['ac_service', 'cooling_issue', 'compressor'], [2.6, -0.4], 4.5, 27, [8, 1, 4, 5]],
  ['Khalid Hussain', 'خالد حسین', 'carpenter', 18, ['g-10', 'g-11', 'g-13'], ['door_fix', 'wardrobe', 'polish'], [-1.2, 0.6], 4.6, 35, [9, 2, 5, 3]],
  ['Zubair Ahmed', 'زبیر احمد', 'carpenter', 9, ['g-9', 'h-8', 'i-8'], ['furniture', 'kitchen_cabinet'], [-2.5, 2.0], 4.0, 11, [6, 1, 8]],
  ['Kamran Shah', 'کامران شاہ', 'mechanic', 13, ['g-10', 'g-11', 'i-10'], ['car_engine', 'oil_change', 'brake'], [1.1, 1.5], 4.7, 47, [0, 4, 7, 8]],
  ['Asif Nawaz', 'آصف نواز', 'mechanic', 8, ['g-9', 'g-10', 'f-10'], ['bike_repair', 'battery', 'oil_change'], [-3.4, 0.5], 4.3, 18, [6, 1, 5]],
];

export function seedIfEmpty() {
  if (db.prepare('SELECT COUNT(*) AS n FROM workers').get().n > 0) return false;
  const now = Date.now();
  tx(() => {
    const cust = insertId(db.prepare("INSERT INTO customers (name, language, area_id, lat, lng, created_at) VALUES ('Seeded customer','roman_urdu','g-10',?,?,?)").run(REF.lat, REF.lng, new Date().toISOString()));

    W.forEach(([name, urdu, trade, years, areas, skills, [dn, de], rating, jobs, rev, extra = {}], i) => {
      const lat = REF.lat + kmToLat(dn), lng = REF.lng + kmToLng(de);
      const counts = {};
      rev.forEach((ri) => POOL[ri].tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
      const wid = insertId(db.prepare(`INSERT INTO workers (name_en, name_ur, phone, trade, years, areas_json, skills_json, home_area_id, lat, lng, rating, rating_count, jobs_count, verified,
          available_today, ai_summary_json, profile_confirmed, source, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,1,'seed',?)`)
        .run(name, urdu, `0300-55501${String(i + 10)}`, trade, years, JSON.stringify(areas), JSON.stringify(skills), areas[0], lat, lng, rating, jobs, jobs,
          extra.off ? 0 : 1, JSON.stringify(summaryFromTags(counts, rev.length)), new Date(now).toISOString()));
      rev.forEach((ri, k) => {
        const p = POOL[ri];
        db.prepare("INSERT INTO reviews (worker_id, rating, text_json, tags_json, source, created_at) VALUES (?,?,?,?, 'seed', ?)")
          .run(wid, p.rating, JSON.stringify({ roman: p.roman, urdu: p.urdu, en: p.en }), JSON.stringify(p.tags), new Date(now - (k + 1) * 36 * 3600 * 1000).toISOString());
      });

      if (extra.busy) {
        // Imran Ali is genuinely engaged: a booked job holds him, so "Masroof / Busy" is real state, not a flag.
        const jid = insertId(db.prepare(`INSERT INTO jobs (customer_id, worker_id, trade, problem_text, problem_json, area_id, lat, lng, distance_km, status,
            deal_job_json, deal_time_json, deal_price, deal_by, worker_accepted, created_at, booked_at) VALUES (?,?,?,?,?,?,?,?,?,'booked',?,?,2000,'worker',1,?,?)`)
          .run(cust, wid, trade, 'Switch board jal gaya', JSON.stringify({ problem: { roman: 'Switch board jal gaya', urdu: 'سوئچ بورڈ جل گیا' }, urgency: 'now' }), 'g-10', REF.lat, REF.lng, 2.1,
            JSON.stringify({ roman: 'Switch board jal gaya', urdu: 'سوئچ بورڈ جل گیا' }), JSON.stringify({ roman: 'Aaj dopahar 2 baje', urdu: 'آج دوپہر 2 بجے' }), new Date().toISOString(), new Date().toISOString()));
        db.prepare('UPDATE workers SET busy_job_id = ? WHERE id = ?').run(jid, wid);
      }
    });
  });
  return true;
}

export function resetAll() {
  tx(() => {
    for (const t of ['reviews', 'messages', 'jobs', 'sessions', 'workers', 'customers']) db.exec(`DELETE FROM ${t}`);
    db.exec("DELETE FROM sqlite_sequence");
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--reset')) resetAll();
  console.log(seedIfEmpty() ? `Seeded ${W.length} workers.` : 'Database already has data (use --reset).');
}
