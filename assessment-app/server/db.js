/**
 * db.js — SQLite storage (via better-sqlite3).
 *
 * SQLite is used so the app runs with zero external services. The schema and
 * queries are deliberately plain SQL, so swapping to Postgres later is mostly
 * a matter of changing this one file (see README → "Moving to Postgres").
 */
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'assessment.db');
require('fs').mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS candidates (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id           TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL REFERENCES candidates(id),
    role         TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'completed',
    started_at   TEXT,
    completed_at TEXT NOT NULL
  );

  -- Raw responses, kept for audit / re-scoring if the model changes.
  CREATE TABLE IF NOT EXISTS answers (
    attempt_id TEXT NOT NULL REFERENCES attempts(id),
    section    TEXT NOT NULL,   -- 'cog' | 'beh' | 'int'
    item_id    TEXT NOT NULL,   -- e.g. 'c14', 'Pace_2', or 'order'
    value      TEXT
  );

  -- Computed scores, one row per attempt.
  CREATE TABLE IF NOT EXISTS results (
    attempt_id      TEXT PRIMARY KEY REFERENCES attempts(id),
    learning_index  INTEGER,
    cog_correct     INTEGER,
    thinking_fit    REAL,
    behavioral_fit  REAL,
    interests_fit   REAL,
    overall_fit     REAL,
    verdict_call    TEXT,
    verdict_cls     TEXT,
    distortion      INTEGER,
    full_json       TEXT,       -- the complete results object for the report view
    scored_at       TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_attempts_candidate ON attempts(candidate_id);
  CREATE INDEX IF NOT EXISTS idx_answers_attempt   ON answers(attempt_id);
`);

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

/** Persist a full submission + computed results in one transaction. */
const saveAttempt = db.transaction(({ candidate, role, answers, results }) => {
  const candidateId = uid();
  const attemptId = uid();
  const ts = now();

  db.prepare('INSERT INTO candidates (id, name, email, created_at) VALUES (?, ?, ?, ?)')
    .run(candidateId, candidate.name || 'Anonymous', candidate.email || null, ts);

  db.prepare('INSERT INTO attempts (id, candidate_id, role, status, completed_at) VALUES (?, ?, ?, ?, ?)')
    .run(attemptId, candidateId, role, 'completed', ts);

  const insAns = db.prepare('INSERT INTO answers (attempt_id, section, item_id, value) VALUES (?, ?, ?, ?)');
  for (const [k, v] of Object.entries(answers.cog || {})) insAns.run(attemptId, 'cog', k, String(v));
  for (const [k, v] of Object.entries(answers.beh || {})) insAns.run(attemptId, 'beh', k, String(v));
  insAns.run(attemptId, 'int', 'order', JSON.stringify(answers.intOrder || []));

  db.prepare(`INSERT INTO results
      (attempt_id, learning_index, cog_correct, thinking_fit, behavioral_fit, interests_fit,
       overall_fit, verdict_call, verdict_cls, distortion, full_json, scored_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(attemptId, results.learningIndex, results.correct, results.thinkingFit, results.behavioralFit,
      results.interestsFit, results.overall, results.verdict.call, results.verdict.cls,
      results.distortion ? 1 : 0, JSON.stringify(results), ts);

  return { attemptId, candidateId };
});

/** Admin: list attempts newest-first with candidate + headline scores. */
function listAttempts(limit = 200) {
  return db.prepare(`
    SELECT a.id AS attempt_id, a.role, a.completed_at,
           c.name, c.email,
           r.overall_fit, r.learning_index, r.verdict_call, r.verdict_cls, r.distortion
    FROM attempts a
    JOIN candidates c ON c.id = a.candidate_id
    LEFT JOIN results r ON r.attempt_id = a.id
    ORDER BY a.completed_at DESC
    LIMIT ?
  `).all(limit);
}

/** Admin: one full report. */
function getAttempt(attemptId) {
  const row = db.prepare(`
    SELECT a.id AS attempt_id, a.role, a.completed_at, c.name, c.email, r.full_json
    FROM attempts a
    JOIN candidates c ON c.id = a.candidate_id
    LEFT JOIN results r ON r.attempt_id = a.id
    WHERE a.id = ?
  `).get(attemptId);
  if (!row) return null;
  return {
    attemptId: row.attempt_id, role: row.role, completedAt: row.completed_at,
    name: row.name, email: row.email,
    results: row.full_json ? JSON.parse(row.full_json) : null,
  };
}

module.exports = { db, saveAttempt, listAttempts, getAttempt };
