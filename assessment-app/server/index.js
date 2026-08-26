/**
 * index.js — Express API + static host for the FHB Fit Assessment.
 *
 * Routes
 *   GET  /                     applicant test (public/index.html)
 *   GET  /admin                admin dashboard (public/admin.html)
 *   GET  /api/form             questions with NO answers (safe for the browser)
 *   POST /api/attempts         submit answers -> server scores -> stores -> returns report
 *   GET  /api/attempts         [admin] list all attempts
 *   GET  /api/attempts/:id     [admin] one full report
 *
 * Admin routes require header:  Authorization: Bearer <ADMIN_TOKEN>
 */
const express = require('express');
const path = require('path');
const { publicForm } = require('./assessment');
const { score, validate } = require('./scoring');
const store = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me-admin-token';

app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Public: the blank form ---
app.get('/api/form', (_req, res) => res.json(publicForm()));

// --- Public: submit a completed assessment ---
app.post('/api/attempts', (req, res) => {
  try {
    const { candidate = {}, role, answers = {} } = req.body || {};
    const problems = validate(role, answers);
    if (problems.length) return res.status(400).json({ error: 'Incomplete submission', problems });

    const results = score(role, answers);
    const { attemptId } = store.saveAttempt({ candidate, role, answers, results });
    // Return the report so the applicant/recruiter sees it immediately.
    res.json({ attemptId, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Scoring failed' });
  }
});

// --- Admin auth guard ---
function requireAdmin(req, res, next) {
  const hdr = req.get('authorization') || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (token && token === ADMIN_TOKEN) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

app.get('/api/attempts', requireAdmin, (_req, res) => res.json({ attempts: store.listAttempts() }));
app.get('/api/attempts/:id', requireAdmin, (req, res) => {
  const row = store.getAttempt(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'admin.html')));

app.listen(PORT, () => {
  console.log(`FHB Fit Assessment running on http://localhost:${PORT}`);
  if (ADMIN_TOKEN === 'change-me-admin-token') {
    console.warn('WARNING: ADMIN_TOKEN is the default. Set a real one in .env before deploying.');
  }
});
