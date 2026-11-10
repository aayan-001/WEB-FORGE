// Thin API client for the Roshan Rozgar backend.
// Same-origin by default (backend serves this folder via STATIC_DIR). To host the frontend elsewhere,
// set window.RR_API_BASE = 'https://your-backend' in config.js.

export const API_BASE = String(window.RR_API_BASE || '').replace(/\/$/, '');

// localStorage can throw (private mode, blocked storage) - never let that break the app.
export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { if (v === null || v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* ignore */ } },
};

export const auth = {
  get role() { return store.get('rr_role'); },
  set role(r) { store.set('rr_role', r); },
  token(role = auth.role) { return role ? store.get(`rr_token_${role}`) : null; },
  setToken(role, t) { store.set(`rr_token_${role}`, t); },
  clear(role) { if (role) store.set(`rr_token_${role}`, null); else { ['customer', 'worker'].forEach((r) => store.set(`rr_token_${r}`, null)); store.set('rr_role', null); } },
};

export async function api(method, path, body, opts = {}) {
  const token = 'token' in opts ? opts.token : auth.token(opts.role);
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    const e = new Error('Network error'); e.code = 'NETWORK'; throw e;
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const er = data?.error || {};
    const e = new Error(er.message || `Error ${res.status}`);
    e.code = er.code || `HTTP_${res.status}`; e.status = res.status; e.message_ur = er.message_ur || null;
    throw e;
  }
  return data;
}

// Raw audio upload for the optional server-side STT path (POST /api/stt, needs OPENAI_API_KEY on the server).
export async function uploadAudio(blob, language) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/stt?language=${encodeURIComponent(language)}`, {
      method: 'POST', headers: { 'Content-Type': blob.type || 'audio/webm' }, body: blob,
    });
  } catch {
    const e = new Error('Network error'); e.code = 'NETWORK'; throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data?.error?.message || 'STT failed'); e.code = data?.error?.code || `HTTP_${res.status}`; throw e; }
  return data.text || '';
}
