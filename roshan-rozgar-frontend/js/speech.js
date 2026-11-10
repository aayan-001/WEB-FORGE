// Speech-to-text and text-to-speech.
//
// STT strategy (matches the backend README):
//   1. Browser Web Speech API (ur-PK / en-PK) - no key, no server cost. Chrome / Edge / Safari.
//   2. If that is missing (e.g. Firefox) but the browser can record audio, upload it to POST /api/stt
//      (server-side Whisper, only works when OPENAI_API_KEY is set on the backend).
//   3. Otherwise the UI tells the user and the typing box stays available - nothing is ever blocked on voice.
// The resulting transcript is what the backend's Gemini layer understands (problem, worker profile, review, price...).

import { uploadAudio } from './api.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const hasWebSpeech = !!SR;
export const canRecord = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
export const speechSupported = hasWebSpeech || canRecord;

const LOCALE = { roman_urdu: 'ur-PK', urdu: 'ur-PK', english: 'en-PK' };

// Returns a controller { stop() }. Callbacks: onInterim(text), onFinal(text), onEnd(), onError(code)
// Error codes: unsupported | denied | nospeech | network | secure | stt_unavailable | failed
export function startListening({ language = 'roman_urdu', onInterim, onFinal, onEnd, onError, onTranscribing }) {
  if (!window.isSecureContext) { onError?.('secure'); onEnd?.(); return { stop() {} }; }
  if (hasWebSpeech) return viaWebSpeech(language, { onInterim, onFinal, onEnd, onError });
  if (canRecord) return viaRecorder(language, { onFinal, onEnd, onError, onTranscribing });
  onError?.('unsupported'); onEnd?.();
  return { stop() {} };
}

function viaWebSpeech(language, { onInterim, onFinal, onEnd, onError }) {
  const rec = new SR();
  rec.lang = LOCALE[language] || 'ur-PK';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = '', failed = false, ended = false;
  rec.onresult = (ev) => {
    let interim = '';
    finalText = '';
    for (let i = 0; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) finalText += r[0].transcript + ' '; else interim += r[0].transcript;
    }
    onInterim?.((finalText + interim).trim());
  };
  rec.onerror = (ev) => {
    failed = true;
    const e = ev.error;
    if (e === 'not-allowed' || e === 'service-not-allowed') onError?.('denied');
    else if (e === 'no-speech') onError?.('nospeech');
    else if (e === 'network') onError?.('network');
    else if (e === 'aborted') failed = false;
    else onError?.('failed');
  };
  rec.onend = () => {
    if (ended) return; ended = true;
    if (!failed && finalText.trim()) onFinal?.(finalText.trim());
    else if (!failed) onError?.('nospeech');
    onEnd?.();
  };
  try { rec.start(); } catch { onError?.('failed'); onEnd?.(); }
  return { stop() { try { rec.stop(); } catch { /* already stopped */ } } };
}

function viaRecorder(language, { onFinal, onEnd, onError, onTranscribing }) {
  let recorder = null, stream = null, stopped = false;
  const ctl = { stop() { stopped = true; if (recorder && recorder.state !== 'inactive') recorder.stop(); } };
  navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
    stream = s;
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported?.(m));
    recorder = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      try {
        onTranscribing?.();
        const text = await uploadAudio(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }), language);
        if (text.trim()) onFinal?.(text.trim()); else onError?.('nospeech');
      } catch (e) {
        onError?.(e.code === 'STT_NOT_CONFIGURED' || e.code === 'HTTP_501' ? 'stt_unavailable' : e.code === 'NETWORK' ? 'network' : 'failed');
      }
      onEnd?.();
    };
    if (stopped) { recorder.stop(); return; }
    recorder.start();
    setTimeout(() => ctl.stop(), 15000); // safety: never record forever
  }).catch(() => { onError?.('denied'); onEnd?.(); });
  return ctl;
}

// ------------------------------------------------------------------ text to speech
let voices = [];
const loadVoices = () => { voices = window.speechSynthesis?.getVoices?.() || []; };
if ('speechSynthesis' in window) { loadVoices(); window.speechSynthesis.onvoiceschanged = loadVoices; }
export const canSpeak = 'speechSynthesis' in window;

// text = {roman, urdu, en} or a plain string. Prefers a real Urdu voice (reads Urdu script),
// otherwise reads the Roman text with an Indian/English voice so it never goes silent.
export function speak(text, onEnd) {
  if (!canSpeak) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const o = typeof text === 'string' ? { roman: text } : text || {};
  const urVoice = voices.find((v) => /^ur/i.test(v.lang));
  let utter;
  if (urVoice && o.urdu) { utter = new SpeechSynthesisUtterance(o.urdu); utter.voice = urVoice; utter.lang = urVoice.lang; }
  else {
    utter = new SpeechSynthesisUtterance(o.roman || o.en || o.urdu || '');
    const v = voices.find((x) => /^hi/i.test(x.lang)) || voices.find((x) => /^en-(IN|PK|GB)/i.test(x.lang)) || voices.find((x) => /^en/i.test(x.lang));
    if (v) { utter.voice = v; utter.lang = v.lang; } else utter.lang = 'en-IN';
  }
  utter.rate = 0.92;
  utter.onend = () => onEnd?.();
  utter.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utter);
}
export const stopSpeaking = () => { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } };
