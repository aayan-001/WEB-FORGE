import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config.js';

if (config.dbPath !== ':memory:') mkdirSync(dirname(config.dbPath), { recursive: true });
export const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, language TEXT DEFAULT 'roman_urdu',
  area_id TEXT, lat REAL, lng REAL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_en TEXT NOT NULL, name_ur TEXT, phone TEXT,
  trade TEXT NOT NULL, years INTEGER,
  areas_json TEXT NOT NULL DEFAULT '[]', skills_json TEXT NOT NULL DEFAULT '[]',
  home_area_id TEXT, lat REAL, lng REAL,
  rating REAL NOT NULL DEFAULT 0, rating_count INTEGER NOT NULL DEFAULT 0, jobs_count INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  available_today INTEGER NOT NULL DEFAULT 1,
  busy_job_id INTEGER,
  ai_summary_json TEXT, profile_confirmed INTEGER NOT NULL DEFAULT 0,
  language TEXT DEFAULT 'roman_urdu', source TEXT NOT NULL DEFAULT 'seed',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, role TEXT NOT NULL, user_id INTEGER NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  worker_id INTEGER NOT NULL REFERENCES workers(id),
  trade TEXT NOT NULL,
  problem_text TEXT, problem_json TEXT,
  area_id TEXT, lat REAL, lng REAL, distance_km REAL,
  status TEXT NOT NULL DEFAULT 'negotiating',
  deal_job_json TEXT, deal_time_json TEXT, deal_price INTEGER, deal_by TEXT, worker_accepted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, booked_at TEXT, completed_at TEXT
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id),
  sender TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'text',
  text TEXT NOT NULL, meta_json TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER UNIQUE REFERENCES jobs(id),
  worker_id INTEGER NOT NULL REFERENCES workers(id),
  customer_id INTEGER,
  rating INTEGER NOT NULL, text_json TEXT NOT NULL, tags_json TEXT NOT NULL DEFAULT '[]',
  transcript TEXT, sentiment TEXT, source TEXT NOT NULL DEFAULT 'seed', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workers_trade ON workers(trade);
CREATE INDEX IF NOT EXISTS idx_jobs_worker ON jobs(worker_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_job ON messages(job_id, id);
CREATE INDEX IF NOT EXISTS idx_reviews_worker ON reviews(worker_id, created_at);
`);

// Synchronous transaction. node:sqlite is synchronous, so BEGIN IMMEDIATE gives us a real
// write lock - this is what keeps "who is free / who is engaged" consistent.
export function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
export const insertId = (r) => Number(r.lastInsertRowid);
