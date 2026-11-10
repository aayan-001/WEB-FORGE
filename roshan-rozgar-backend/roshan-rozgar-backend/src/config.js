import { existsSync } from 'node:fs';

try {
  if (existsSync('.env')) process.loadEnvFile('.env');
} catch {
  /* .env is optional */
}

const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

export const config = {
  port: Number(process.env.PORT || 3000),
  dbPath: process.env.DB_PATH || './data/roshan.db',
  geminiKey: key,
  geminiProvider: (process.env.GEMINI_PROVIDER || 'studio').toLowerCase(),
  // comma-separated: tried in order, so an overloaded (503) or unavailable model falls through to the next
  models: (process.env.GEMINI_MODEL || 'gemini-3.8-flash,gemini-3.6-flash,gemini-3.1-flash-lite').split(',').map((m) => m.trim()).filter(Boolean),
  aiMode: (process.env.AI_MODE || (key ? 'on' : 'off')).toLowerCase(),
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 10000),
  openaiKey: process.env.OPENAI_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  staticDir: process.env.STATIC_DIR || '',
  demoMode: (process.env.DEMO_MODE || 'true') === 'true',
};
