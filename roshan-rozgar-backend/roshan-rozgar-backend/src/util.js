import crypto from 'node:crypto';

export class HttpError extends Error {
  constructor(status, code, roman, urdu = null) {
    super(roman);
    this.status = status;
    this.code = code;
    this.urdu = urdu;
  }
}
export const bad = (code, roman, urdu) => new HttpError(400, code, roman, urdu);
export const notFound = (what = 'Cheez') => new HttpError(404, 'NOT_FOUND', `${what} nahi mili`, 'نہیں ملا');
export const forbidden = () => new HttpError(403, 'FORBIDDEN', 'Is kaam ki ijazat nahi', 'اجازت نہیں');
export const conflict = (code, roman, urdu) => new HttpError(409, code, roman, urdu);

export const nowIso = () => new Date().toISOString();
export const newToken = () => crypto.randomBytes(24).toString('hex');
export const parseJson = (s, d = null) => {
  try { return s ? JSON.parse(s) : d; } catch { return d; }
};
export const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

// Urdu / Arabic-Indic digits -> ascii
export function normDigits(s = '') {
  return String(s).replace(/[۰-۹٠-٩]/g, (d) => {
    const c = d.charCodeAt(0);
    return String(c >= 0x06f0 ? c - 0x06f0 : c - 0x0660);
  });
}
export const hasUrdu = (s = '') => /[\u0600-\u06FF]/.test(s);
export const clip = (s, n) => String(s ?? '').trim().slice(0, n);

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
// km offsets -> degrees (Islamabad latitude), used by the seeder
export const kmToLat = (km) => km / 111.2;
export const kmToLng = (km) => km / 92.6;
