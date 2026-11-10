import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { db } from './db.js';
import { HttpError } from './util.js';
import { routes } from './routes.js';
import { seedIfEmpty } from './seed.js';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

// compile "/api/jobs/:id/book" -> regex
const compiled = routes.map(([method, pattern, handler]) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:([a-z_]+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
  return { method, re, keys, handler };
});

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
}
function send(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(data) });
  res.end(data);
}
async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new HttpError(413, 'TOO_LARGE', 'Data bohat bara hai', 'ڈیٹا بہت بڑا ہے');
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

function authFrom(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  return s ? { token, role: s.role, user_id: s.user_id } : null;
}

async function serveStatic(req, res, pathname) {
  if (!config.staticDir) return false;
  let file = normalize(join(config.staticDir, pathname));
  if (!file.startsWith(normalize(config.staticDir))) return false;
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(config.staticDir, 'index.html'); // SPA fallback
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
    return true;
  } catch { return false; }
}

export function createServer() {
  return http.createServer(async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const url = new URL(req.url, 'http://localhost');
    try {
      if (!url.pathname.startsWith('/api/')) {
        if (req.method === 'GET' && (await serveStatic(req, res, url.pathname))) return;
        return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Rasta nahi mila' } });
      }
      for (const r of compiled) {
        if (r.method !== req.method) continue;
        const m = url.pathname.match(r.re);
        if (!m) continue;
        const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
        const ctype = req.headers['content-type'] || '';
        let body = {}, raw = null;
        if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
          if (/^(audio|application\/octet-stream)/.test(ctype)) raw = await readBody(req, 10 * 1024 * 1024);
          else {
            const buf = await readBody(req, 1024 * 1024);
            if (buf.length) {
              try { body = JSON.parse(buf.toString('utf8')); } catch { throw new HttpError(400, 'BAD_JSON', 'Data sahi nahi', 'ڈیٹا درست نہیں'); }
            }
          }
        }
        const out = await r.handler({ req, params, query: Object.fromEntries(url.searchParams), body, raw, auth: authFrom(req), ctype });
        return send(res, out?.__status || 200, out?.__body ?? out ?? { ok: true });
      }
      send(res, 404, { error: { code: 'NOT_FOUND', message: 'Rasta nahi mila' } });
    } catch (e) {
      if (e instanceof HttpError) {
        return send(res, e.status, { error: { code: e.code, message: e.message, message_ur: e.urdu } });
      }
      console.error(e);
      send(res, 500, { error: { code: 'SERVER_ERROR', message: 'Kuch ghalat ho gaya, dobara koshish karain', message_ur: 'کچھ غلط ہو گیا، دوبارہ کوشش کریں' } });
    }
  });
}

export function start(port = config.port) {
  seedIfEmpty();
  const server = createServer();
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start().then((s) => {
    console.log(`Roshan Rozgar API on http://localhost:${s.address().port}  (AI: ${config.aiMode === 'on' && config.geminiKey ? 'LLM + fallback' : 'rule-based fallback only'})`);
  });
}
