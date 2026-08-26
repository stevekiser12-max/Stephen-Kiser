/**
 * scoring.js — authoritative, server-side scoring.
 *
 * The browser never runs this. It sends raw answers; the server scores them
 * here against the answer key and Performance Model, so results can't be
 * forged client-side. The math mirrors the FHB assessment spec exactly.
 */
const { COG, TRAITS, MODELS, GUIDE } = require('./assessment');

const COG_BANDS = [
  [22, 24, 10], [20, 21, 9], [18, 19, 8], [16, 17, 7], [14, 15, 6],
  [12, 13, 5], [10, 11, 4], [8, 9, 3], [6, 7, 2], [0, 5, 1],
];

function cogIndex(correct) {
  for (const [lo, hi, idx] of COG_BANDS) if (correct >= lo && correct <= hi) return idx;
  return 1;
}
function stenFromRaw(raw) {
  if (raw <= 5) return 1; if (raw <= 7) return 2; if (raw <= 8) return 3; if (raw <= 10) return 4;
  if (raw <= 11) return 5; if (raw <= 13) return 6; if (raw <= 14) return 7; if (raw <= 16) return 8;
  if (raw <= 18) return 9; return 10;
}
function normNum(v) {
  if (v == null) return NaN;
  const s = String(v).replace(/[^0-9.\-]/g, '');
  return s === '' ? NaN : parseFloat(s);
}

/**
 * @param {'acq'|'dispo'} role
 * @param {{cog:Object, beh:Object, intOrder:string[]}} answers
 * @returns full results object (also what the client renders)
 */
function score(role, answers) {
  const model = MODELS[role];
  if (!model) throw new Error(`Unknown role: ${role}`);
  const cog = answers.cog || {};
  const beh = answers.beh || {};
  const intOrder = Array.isArray(answers.intOrder) ? answers.intOrder : [];

  // --- Section A: Thinking Style ---
  let correct = 0;
  const subCounts = {};
  for (const item of COG) {
    subCounts[item.sub] = subCounts[item.sub] || { c: 0, n: 0 };
    subCounts[item.sub].n++;
    const a = cog[item.id];
    let ok = false;
    if (item.type === 'mc') ok = Number(a) === item.answer;
    else ok = Math.abs(normNum(a) - item.answer) < 0.5;
    if (ok) { correct++; subCounts[item.sub].c++; }
  }
  const idx = cogIndex(correct);
  const [clo, chi] = model.cog;
  let thinkingFit;
  if (idx >= clo && idx <= chi) thinkingFit = 100;
  else if (idx < clo) thinkingFit = Math.max(0, 100 - 30 * (clo - idx));
  else thinkingFit = 100;

  // --- Section B: Behavioral Traits ---
  const traitResults = [];
  let bSum = 0;
  for (const tr of TRAITS) {
    let raw = 0;
    tr.items.forEach((it, i) => {
      const resp = Number(beh[`${tr.key}_${i}`]);
      raw += it.r ? 6 - resp : resp;
    });
    const sten = stenFromRaw(raw);
    const [lo, hi] = model.traits[tr.key];
    let flag;
    if (sten >= lo && sten <= hi) { flag = 'in'; bSum += 1; }
    else if (sten === lo - 1 || sten === hi + 1) { flag = 'near'; bSum += 0.5; }
    else { flag = 'out'; }
    traitResults.push({ key: tr.key, low: tr.low, high: tr.high, sten, raw, lo, hi, flag });
  }
  const behavioralFit = (bSum / TRAITS.length) * 100;

  // --- Section C: Interests ---
  const top3 = intOrder.slice(0, 3);
  const matches = top3.filter((k) => model.interests.includes(k));
  const interestsFit = (matches.length / 3) * 100;

  // --- Overall (40 / 40 / 20) ---
  const overall = thinkingFit * 0.4 + behavioralFit * 0.4 + interestsFit * 0.2;

  // --- Distortion (consistency) check ---
  let inconsistent = 0;
  for (const tr of TRAITS) {
    const nonRev = [];
    let rev = null;
    tr.items.forEach((it, i) => {
      const resp = Number(beh[`${tr.key}_${i}`]);
      if (it.r) rev = resp; else nonRev.push(resp);
    });
    const avg = nonRev.reduce((a, b) => a + b, 0) / nonRev.length;
    if ((avg >= 4 && rev >= 4) || (avg <= 2 && rev <= 2)) inconsistent++;
  }
  const allResp = Object.values(beh).map(Number);
  const highCount = allResp.filter((v) => v >= 4).length;
  const lowCount = allResp.filter((v) => v <= 2).length;
  const allInZone = traitResults.every((t) => t.flag === 'in');
  const extreme = highCount >= 30 && lowCount <= 2 && allInZone;
  const distortion = inconsistent >= 3 || extreme;

  // --- Verdict ---
  const verdict = verdictOf(overall, distortion);

  // --- Interview guide (targeted at gaps) ---
  const guide = [];
  if (idx < clo) guide.push({ tag: 'Cognitive', ...GUIDE.cog });
  for (const t of traitResults) {
    if (t.flag !== 'in') guide.push({ tag: `${t.key}${t.sten < t.lo ? ' — too low' : ' — too high'}`, ...GUIDE[t.key] });
  }
  if (matches.length < 3) guide.push({ tag: 'Interest mismatch', ...GUIDE.interest });
  if (distortion) guide.push({ tag: 'Distortion flagged', ...GUIDE.distortion });

  return {
    role, modelLabel: model.label, modelInterests: model.interests, modelCog: model.cog,
    correct, cogItems: COG.length, subCounts, learningIndex: idx,
    thinkingFit: round(thinkingFit), behavioralFit: round(behavioralFit), interestsFit: round(interestsFit),
    overall: round(overall), verdict,
    traitResults, top3, matches: matches.length, distortion, inconsistent, extreme, guide,
  };
}

function verdictOf(overall, distortion) {
  if (overall >= 80) {
    return distortion
      ? { cls: 'warn', call: 'Advance — with a distortion check', sub: 'Strong fit, but the honesty check flagged. Confirm the "perfect" traits in the interview before advancing.' }
      : { cls: 'good', call: 'Advance', sub: 'Fit is at or above the 80% bar against this model.' };
  }
  if (overall >= 65) return { cls: 'warn', call: 'Conditional — clear the gaps first', sub: 'Advance only if the interview resolves every flagged gap below.' };
  return { cls: 'crit', call: 'Do not advance', sub: 'Fit is below 65% against this model. Combined with a weak interview, this is an out.' };
}

const round = (n) => Math.round(n * 10) / 10;

/** Validate a submission is complete before scoring. Returns [] or a list of problems. */
function validate(role, answers) {
  const problems = [];
  if (!MODELS[role]) problems.push('Invalid or missing role.');
  const cog = answers?.cog || {};
  for (const item of COG) {
    const v = cog[item.id];
    if (v == null || String(v).trim() === '') problems.push(`Missing cognitive answer: ${item.id}`);
  }
  const beh = answers?.beh || {};
  for (const tr of TRAITS) {
    for (let i = 0; i < tr.items.length; i++) {
      const v = Number(beh[`${tr.key}_${i}`]);
      if (!(v >= 1 && v <= 5)) problems.push(`Missing/invalid behavioral answer: ${tr.key}_${i}`);
    }
  }
  const order = answers?.intOrder;
  if (!Array.isArray(order) || order.length !== 6 || new Set(order).size !== 6) {
    problems.push('Interests must be a full ranking of all six areas.');
  }
  return problems;
}

module.exports = { score, validate };
