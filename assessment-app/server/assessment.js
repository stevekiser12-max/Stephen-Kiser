/**
 * assessment.js — SERVER-ONLY question bank and Performance Models.
 *
 * IMPORTANT: This file contains the cognitive answer key, the behavioral
 * reverse-scored flags, and the role Performance Models. It must NEVER be
 * bundled into or served to the client. The only thing the browser receives
 * is the output of publicForm(), which strips every answer.
 *
 * The model ranges below are a STARTING TEMPLATE. Before using this for real
 * hiring, benchmark them against your own top performers and replace the
 * ranges in MODELS.
 */

const COG = [
  // A1 — Verbal Skill (vocabulary)
  { id: 'c1', sub: 'Verbal Skill', type: 'mc', q: 'Choose the word closest in meaning to <b>CONCEDE</b>.', choices: ['refuse', 'admit / yield', 'delay', 'argue'], answer: 1 },
  { id: 'c2', sub: 'Verbal Skill', type: 'mc', q: 'Choose the word closest in meaning to <b>PRUDENT</b>.', choices: ['reckless', 'wealthy', 'careful', 'rude'], answer: 2 },
  { id: 'c3', sub: 'Verbal Skill', type: 'mc', q: 'Choose the word closest in meaning to <b>MITIGATE</b>.', choices: ['worsen', 'lessen', 'confuse', 'repeat'], answer: 1 },
  { id: 'c4', sub: 'Verbal Skill', type: 'mc', q: 'Choose the word closest in meaning to <b>CANDID</b>.', choices: ['sweet', 'hidden', 'frank', 'nervous'], answer: 2 },
  { id: 'c5', sub: 'Verbal Skill', type: 'mc', q: 'Choose the word closest in meaning to <b>TENTATIVE</b>.', choices: ['certain', 'provisional', 'permanent', 'hostile'], answer: 1 },
  { id: 'c6', sub: 'Verbal Skill', type: 'mc', q: 'Choose the word closest in meaning to <b>DISCREPANCY</b>.', choices: ['agreement', 'discount', 'inconsistency', 'delay'], answer: 2 },
  // A2 — Verbal Reasoning
  { id: 'c7', sub: 'Verbal Reasoning', type: 'mc', q: '<span class="lead">A seller will only accept an all-cash offer that closes in 14 days. Our buyer needs 21 days.</span> Which is best supported?', choices: ['The deal is dead.', 'The buyer must be all-cash.', 'The timeline, not the price, is the current obstacle.', 'The seller wants more money.'], answer: 2 },
  { id: 'c8', sub: 'Verbal Reasoning', type: 'mc', q: '<span class="lead">Every lead from Channel X this month was a wrong number or a renter. Channel Y produced 3 contracts.</span> A reasonable conclusion:', choices: ['Channel X should get more budget.', 'Channel Y converts and X is not producing sellers.', 'Renters never sell.', 'Channel Y is cheaper.'], answer: 1 },
  { id: 'c9', sub: 'Verbal Reasoning', type: 'mc', q: '<span class="lead">"We can assign this contract only if the purchase agreement has no anti-assignment clause." The contract has such a clause.</span> Therefore:', choices: ['We can still assign it.', 'We cannot assign it as written.', 'The clause is unenforceable.', 'We must close ourselves — always.'], answer: 1 },
  { id: 'c10', sub: 'Verbal Reasoning', type: 'mc', q: '<span class="lead">All of our best months followed weeks where reps made 250+ dials. Last week reps made 90 dials.</span> Most defensible statement:', choices: ['This month will be bad.', 'Dials guarantee deals.', 'Activity was below the level historically tied to strong months.', 'Reps are lazy.'], answer: 2 },
  { id: 'c11', sub: 'Verbal Reasoning', type: 'mc', q: '<span class="lead">A homeowner says "I\'m not interested" but keeps asking what the house is worth.</span> Best inference:', choices: ['Hang up.', 'There may be latent interest worth exploring.', 'They want a free appraisal only.', 'They\'re a competitor.'], answer: 1 },
  { id: 'c12', sub: 'Verbal Reasoning', type: 'mc', q: '<span class="lead">If ARV is $300k and we need 30% margin plus $40k rehab, then a $170k offer…</span>', choices: ['exceeds our max.', 'is within a defensible range.', 'cannot be evaluated.', 'ignores rehab.'], answer: 1 },
  // A3 — Numerical Ability
  { id: 'c13', sub: 'Numerical Ability', type: 'num', q: 'What is <b>15% of 240</b>?', answer: 36 },
  { id: 'c14', sub: 'Numerical Ability', type: 'num', q: 'Add: <b>$1,850 + $2,995 + $410</b>.', answer: 5255, prefix: '$' },
  { id: 'c15', sub: 'Numerical Ability', type: 'num', q: 'What is <b>3/4 of 88</b>?', answer: 66 },
  { id: 'c16', sub: 'Numerical Ability', type: 'num', q: 'What is <b>$18,000 ÷ 12</b>?', answer: 1500, prefix: '$' },
  { id: 'c17', sub: 'Numerical Ability', type: 'num', q: 'What is <b>240,000 × 0.70</b>?', answer: 168000 },
  { id: 'c18', sub: 'Numerical Ability', type: 'num', q: 'A number rose from <b>80 to 100</b>. What is the % increase?', answer: 25, suffix: '%' },
  // A4 — Numeric Reasoning
  { id: 'c19', sub: 'Numeric Reasoning', type: 'num', q: 'ARV is $250,000. Max Allowable Offer = 70% of ARV minus $35,000 rehab. What is the <b>MAO</b>?', answer: 140000, prefix: '$' },
  { id: 'c20', sub: 'Numeric Reasoning', type: 'num', q: 'You assign a contract for a $12,000 fee. Marketing to source it cost $3,500. What is the <b>net</b>?', answer: 8500, prefix: '$' },
  { id: 'c21', sub: 'Numeric Reasoning', type: 'num', q: 'A rep closes 2 deals per 60 contacts. At the same rate, how many <b>contacts</b> to close 5 deals?', answer: 150 },
  { id: 'c22', sub: 'Numeric Reasoning', type: 'num', q: 'A seller owes $90,000 and wants $15,000 in cash. Your all-in acquisition number is at least?', answer: 105000, prefix: '$' },
  { id: 'c23', sub: 'Numeric Reasoning', type: 'num', q: 'Complete the sequence: <b>5, 10, 20, 40, __</b>', answer: 80 },
  { id: 'c24', sub: 'Numeric Reasoning', type: 'num', q: 'A deal nets $10,000, split 50/50 with a partner, then you pay a 10% referral on your half. Your <b>take-home</b>?', answer: 4500, prefix: '$' },
];

const TRAITS = [
  { key: 'Pace', low: 'Steady', high: 'Urgent', items: [
    { t: 'I feel restless when work moves slowly.', r: false },
    { t: 'I\'d rather act now and adjust than wait for the perfect moment.', r: false },
    { t: 'I prefer a calm, predictable pace.', r: true },
    { t: 'Deadlines energize me more than they stress me.', r: false } ] },
  { key: 'Assertiveness', low: 'Unassuming', high: 'Forceful', items: [
    { t: 'I push my point of view even when others resist.', r: false },
    { t: 'I take charge of a room without being asked.', r: false },
    { t: 'I\'d rather let others lead the conversation.', r: true },
    { t: 'I\'m comfortable telling someone their offer won\'t work.', r: false } ] },
  { key: 'Sociability', low: 'Reserved', high: 'Outgoing', items: [
    { t: 'Talking to strangers all day energizes me.', r: false },
    { t: 'I build rapport with new people quickly.', r: false },
    { t: 'I need quiet, solo time to recharge.', r: true },
    { t: 'I enjoy cold outreach.', r: false } ] },
  { key: 'Conformity', low: 'Strong-willed', high: 'Compliant', items: [
    { t: 'I follow the script / process even when I\'d do it differently.', r: false },
    { t: 'I check with a manager before deviating from policy.', r: false },
    { t: 'I trust my own judgment over the established playbook.', r: true },
    { t: 'I\'m comfortable operating inside tight rules.', r: false } ] },
  { key: 'Outlook', low: 'Skeptical', high: 'Trusting', items: [
    { t: 'I assume people are telling me the truth until proven otherwise.', r: false },
    { t: 'I take what sellers tell me at face value.', r: false },
    { t: 'I look for the catch in most deals.', r: true },
    { t: 'I give people the benefit of the doubt.', r: false } ] },
  { key: 'Decisiveness', low: 'Deliberate', high: 'Bold', items: [
    { t: 'I make calls fast, even with incomplete information.', r: false },
    { t: 'I\'m comfortable committing to a number on the first call.', r: false },
    { t: 'I like to gather all the facts before deciding.', r: true },
    { t: 'I trust my gut on close calls.', r: false } ] },
  { key: 'Accommodation', low: 'Steadfast', high: 'Agreeable', items: [
    { t: 'I\'d rather find middle ground than hold my line.', r: false },
    { t: 'I avoid conflict when I can.', r: false },
    { t: 'I hold firm on my position under pressure.', r: true },
    { t: 'Keeping the other side happy matters to me in a negotiation.', r: false } ] },
  { key: 'Independence', low: 'Reliant', high: 'Autonomous', items: [
    { t: 'I do my best work with little supervision.', r: false },
    { t: 'I set my own daily priorities without being told.', r: false },
    { t: 'I prefer clear direction on exactly what to do.', r: true },
    { t: 'I hold myself accountable to my own numbers.', r: false } ] },
  { key: 'Judgment', low: 'Intuitive', high: 'Factual', items: [
    { t: 'I base decisions on data more than instinct.', r: false },
    { t: 'I want the comps and numbers before I commit.', r: false },
    { t: 'I often "just know" the right move without the analysis.', r: true },
    { t: 'I document my reasoning with facts.', r: false } ] },
];

const INTERESTS = [
  { key: 'Enterprising', desc: 'Persuading, negotiating, closing deals, driving revenue.' },
  { key: 'People Service', desc: 'Helping people through a stressful situation, guiding them.' },
  { key: 'Financial/Admin', desc: 'Numbers, contracts, tracking, organizing pipelines.' },
  { key: 'Technical', desc: 'Systems, tools, CRMs, data, analysis.' },
  { key: 'Mechanical', desc: 'Hands-on, building or fixing physical things.' },
  { key: 'Creative', desc: 'Design, writing, novel ideas, marketing angles.' },
];

const MODELS = {
  acq: {
    label: 'Acquisitions',
    blurb: 'Talks to sellers, negotiates, gets contracts signed. Urgent, forceful, self-driven, holds the line.',
    cog: [6, 10],
    traits: { Pace: [6, 9], Assertiveness: [6, 9], Sociability: [6, 10], Conformity: [4, 7], Outlook: [3, 6], Decisiveness: [6, 9], Accommodation: [3, 6], Independence: [6, 10], Judgment: [4, 7] },
    interests: ['Enterprising', 'People Service', 'Financial/Admin'],
  },
  dispo: {
    label: 'Dispo',
    blurb: 'Prices deals, works the buyers list, moves contracts. Data-led on pricing, deal-greaser, autonomous.',
    cog: [6, 10],
    traits: { Pace: [5, 8], Assertiveness: [6, 9], Sociability: [5, 8], Conformity: [4, 7], Outlook: [4, 7], Decisiveness: [5, 8], Accommodation: [5, 8], Independence: [6, 9], Judgment: [6, 9] },
    interests: ['Enterprising', 'Technical', 'People Service'],
  },
};

const GUIDE = {
  cog: { q: 'Walk me through how you\'d calculate a max offer on a $220k ARV with $30k rehab.', l: 'Can they reason through it live, not just recall a formula.' },
  Pace: { q: 'Tell me about a time you had to move on something before you felt fully ready.', l: 'Real urgency vs. discomfort with speed.' },
  Assertiveness: { q: 'Describe pushing back on a seller or agent who wanted terms you couldn\'t give.', l: 'Do they hold a position or fold.' },
  Sociability: { q: 'How do you feel after a full day of cold calls?', l: 'Drained-and-done vs. energized.' },
  Conformity: { q: 'When did you deviate from a script, and why?', l: 'Judgment, not blind rule-following.' },
  Outlook: { q: 'A seller\'s story doesn\'t match the comps. What do you do?', l: 'Verifies vs. takes at face value.' },
  Decisiveness: { q: 'Tell me about the last time you had to commit to a number with incomplete info.', l: 'Comfort deciding under ambiguity.' },
  Accommodation: { q: 'Tell me about a negotiation where you had to hold firm.', l: 'Can they resist just splitting the difference.' },
  Independence: { q: 'Describe a week where nobody told you what to do. What happened?', l: 'Self-direction and self-accountability.' },
  Judgment: { q: 'How do you price a wholesale deal for your buyers list?', l: 'Data-led, comps-driven pricing.' },
  interest: { q: 'What part of this job would you most look forward to on a Monday?', l: 'Alignment with the role\'s core motivators.' },
  distortion: { q: 'Re-ask 2–3 of the "perfect" traits behaviorally — ask for a specific story.', l: 'Consistency between self-report and real examples.' },
};

/** Public projection sent to the browser — every answer/reverse flag removed. */
function publicForm() {
  return {
    roles: Object.entries(MODELS).map(([id, m]) => ({ id, label: m.label, blurb: m.blurb })),
    cognitive: COG.map(({ answer, ...rest }) => rest),
    traits: TRAITS.map((t) => ({ key: t.key, low: t.low, high: t.high, items: t.items.map((i) => ({ t: i.t })) })),
    interests: INTERESTS,
  };
}

module.exports = { COG, TRAITS, INTERESTS, MODELS, GUIDE, publicForm };
