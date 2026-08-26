# FHB Fit Assessment — full-stack app

A dedicated website that lets applicants take the FHB total-person assessment
and stores every candidate's scores in a database. Built as a hand-off for a
developer (Alfred) to run, deploy, and extend.

> **Handoff note (for Alfred):** this is a clean, framework-light starter —
> Node + Express + SQLite, vanilla JS frontend, no build step. It runs as-is.
> The two things to do before it's production-facing are called out under
> **Before you go live**. Everything scoring-related is server-side on purpose.

---

## What's here

```
assessment-app/
├── server/
│   ├── index.js        Express API + static host
│   ├── assessment.js   Question bank + Performance Models  (SERVER-ONLY — has the answer key)
│   ├── scoring.js      Authoritative scoring (mirrors the FHB spec)
│   └── db.js           SQLite schema + queries
├── public/
│   ├── index.html      Applicant test
│   ├── app.js          Applicant flow (fetches blank form, submits answers)
│   ├── admin.html      Recruiter dashboard
│   ├── admin.js        Dashboard logic
│   └── styles.css      Shared design system (light/dark, print)
├── package.json
├── .env.example
└── .gitignore
```

### Architecture in one paragraph
The browser fetches a **blank** form from `GET /api/form` (no correct answers,
no reverse-scoring flags). The applicant answers and `POST`s raw responses to
`/api/attempts`. The **server** scores them against the answer key + role model
in `scoring.js`, writes candidate + answers + computed results to SQLite, and
returns the report. Recruiters read results at `/admin` behind a token. Because
the answer key never reaches the browser, applicants can't read it from page
source or forge a passing score.

---

## Run it locally

Requires Node 18+.

```bash
cd assessment-app
cp .env.example .env          # then edit ADMIN_TOKEN
npm install
npm start                      # -> http://localhost:3000
```

- **Applicant test:** http://localhost:3000/
- **Admin dashboard:** http://localhost:3000/admin  (sign in with your `ADMIN_TOKEN`)

To pre-assign the role via the link you send a candidate (so they can't pick
their own scoring model), append `?role=acq` or `?role=dispo`:
`http://localhost:3000/?role=acq`

---

## API reference

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET`  | `/api/form` | — | Blank questions for rendering (no answers). |
| `POST` | `/api/attempts` | — | Submit `{candidate:{name,email}, role, answers:{cog,beh,intOrder}}`; returns `{attemptId, results}`. |
| `GET`  | `/api/attempts` | admin | List all attempts (headline scores). |
| `GET`  | `/api/attempts/:id` | admin | One full report. |

Admin routes expect `Authorization: Bearer <ADMIN_TOKEN>`.

---

## Data model (SQLite)

- **candidates** — `id, name, email, created_at`
- **attempts** — `id, candidate_id, role, status, completed_at`
- **answers** — raw responses per item (`section` = cog/beh/int), kept for audit
  and re-scoring if the model changes
- **results** — computed `learning_index, cog_correct, thinking_fit,
  behavioral_fit, interests_fit, overall_fit, verdict, distortion`, plus
  `full_json` (the complete report object)

Storing raw answers separately from computed results means that when you
re-benchmark the Performance Model, you can re-score historical candidates
without asking them to retake anything.

---

## Scoring (authoritative, in `scoring.js`)

- **Thinking Style (40%)** — 24 cognitive items, 1 pt each → 1–10 Learning
  Index via band table → fit vs. the role's target range.
- **Behavioral (40%)** — 9 traits × 4 items, reverse items scored `6 − x`, raw
  4–20 → STEN 1–10 → in-range / one-off / gap, averaged.
- **Interests (20%)** — top-3 overlap with the role's top-3.
- **Overall** = 0.40·Thinking + 0.40·Behavioral + 0.20·Interests.
- **Verdict** — ≥80 Advance · 65–79 Conditional · <65 Out.
- **Distortion** — reverse-pair inconsistency (≥3 traits) or an implausibly
  flawless profile → flag (probability, not proof).

### Re-benchmarking the models (do this early)
The ranges in `server/assessment.js → MODELS` are a **template**, not validated
numbers. Have current top performers (Jo/Cliff/Adam for Acq; Ivan/Matt for
Dispo) take it, then edit each trait's `[min, max]` and the `interests` array to
match their score patterns. Re-run stored answers through `scoring.js` to
re-score history. Until this is done, treat the fit % as directional.

---

## Before you go live

1. **Harden admin auth.** The bearer-token guard is fine for an internal MVP but
   is not real user management. Put the app behind SSO / your existing auth, or
   swap in session-based login with hashed credentials and rate limiting.
2. **Add anti-refresh / one-attempt logic** if you want to stop retakes
   (e.g. issue a signed, single-use invite link per applicant).
3. **Serve over HTTPS** and set `helmet` + CORS appropriately.
4. **Back up the database** (or move to Postgres, below).
5. **EEOC/legal hygiene** (carried over from the assessment spec): use it
   identically for every candidate in a role, as one input among several, never
   as a sole knockout. Keep it ~1/3 of the decision.

---

## Moving to Postgres (when SQLite isn't enough)

Everything DB-specific is isolated in `server/db.js`. To switch:
1. `npm i pg` and point at a `DATABASE_URL`.
2. Recreate the four tables (the `CREATE TABLE` SQL is nearly identical; change
   `TEXT` PKs to `uuid`/`text` as you prefer).
3. Replace the `better-sqlite3` prepared-statement calls with `pg` queries. The
   function signatures (`saveAttempt`, `listAttempts`, `getAttempt`) stay the
   same, so `index.js` doesn't change.

---

## Wiring results into Zoho (optional, per the deploy plan)

The plan calls for storing fit %, cognitive composite, and trait scores as
candidate fields in Zoho, then correlating against close rate / ramp after 6
months. Cleanest hook: in `server/index.js`, right after `store.saveAttempt(...)`
succeeds, `POST` the `results` summary to Zoho's CRM API (upsert the candidate
by email, write `overall_fit`, `learning_index`, and the 9 trait STENs to custom
fields). Keep it non-blocking so a Zoho hiccup never fails the applicant's
submission. Ask Stephen for the Zoho custom-field API names first.

---

## Deploy

No build step — any Node host works (Render, Railway, Fly, a VM, etc.).
Set `PORT`, `ADMIN_TOKEN`, and a persistent `DB_PATH` (mount a volume so the
SQLite file survives redeploys), then `npm install && npm start`.
