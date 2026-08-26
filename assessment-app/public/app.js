/**
 * app.js — applicant-facing client.
 *
 * It fetches the BLANK form from the server (no answers), collects responses,
 * and POSTs them for authoritative scoring. The report it renders is exactly
 * what the server returns — the browser never scores anything.
 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const screen = $('#screen');
  const STEPS = ['Start', 'Thinking Style', 'Behavioral', 'Interests', 'Results'];

  // Role can be pre-set by the recruiter via ?role=acq — then applicants can't change it.
  const urlRole = new URLSearchParams(location.search).get('role');

  const state = {
    step: 0, form: null, role: null, roleLocked: false,
    candidate: { name: '', email: '' },
    cog: {}, beh: {}, intOrder: [], results: null, submitting: false, error: '',
  };

  /* ---------- boot ---------- */
  async function boot() {
    try {
      const r = await fetch('api/form');
      if (!r.ok) throw new Error();
      state.form = await r.json();
      if (urlRole && state.form.roles.some((x) => x.id === urlRole)) { state.role = urlRole; state.roleLocked = true; }
    } catch {
      screen.innerHTML = '<div class="center"><p>Could not load the assessment. Please refresh, or contact the recruiter.</p></div>';
      return;
    }
    render();
  }

  /* ---------- rail / nav ---------- */
  function renderRail() {
    const rail = $('#rail'); rail.innerHTML = '';
    STEPS.forEach((_, i) => {
      const seg = document.createElement('div');
      seg.className = 'seg' + (i < state.step ? ' done' : '') + (i === state.step ? ' active' : '');
      seg.innerHTML = '<i></i>'; rail.appendChild(seg);
    });
    $('#stepLabel').textContent = `Step ${state.step + 1} of ${STEPS.length} · ${STEPS[state.step]}`;
  }

  /* ---------- screens ---------- */
  function screenStart() {
    const roleUI = state.roleLocked
      ? `<p class="muted-note">You're being assessed for the <b>${roleLabel(state.role)}</b> role.</p>`
      : `<div class="steplabel" style="margin-bottom:10px">Which seat is this for?</div>
         <div class="roles">${state.form.roles.map((r) => `
           <button class="role" data-role="${r.id}" aria-pressed="${state.role === r.id}">
             <h3>${r.label}</h3><p>${r.blurb}</p></button>`).join('')}</div>`;
    screen.innerHTML = `
      <div class="eyebrow">Total-Person Assessment</div>
      <h1 class="title">Welcome — let's find your fit.</h1>
      <p class="lede">Three short sections: a thinking-style quiz, a set of workplace statements, and a ranking of what you enjoy. It takes about 45–60 minutes, it's untimed, and there are no trick questions. A calculator is allowed on the first section only.</p>
      <div class="card">
        <div class="field"><label for="nm">Full name <span class="req">*</span></label>
          <input id="nm" type="text" autocomplete="name" placeholder="Your name" value="${esc(state.candidate.name)}"></div>
        <div class="field"><label for="em">Email <span class="req">*</span></label>
          <input id="em" type="email" autocomplete="email" placeholder="you@email.com" value="${esc(state.candidate.email)}"></div>
        ${roleUI}
        <p class="err ${state.error ? '' : 'hidden'}" id="startErr">${state.error}</p>
      </div>`;
    $('#nm').addEventListener('input', (e) => { state.candidate.name = e.target.value; updateNav(); });
    $('#em').addEventListener('input', (e) => { state.candidate.email = e.target.value; updateNav(); });
    screen.querySelectorAll('.role').forEach((b) => b.addEventListener('click', () => {
      state.role = b.dataset.role;
      screen.querySelectorAll('.role').forEach((x) => x.setAttribute('aria-pressed', x.dataset.role === state.role));
      updateNav();
    }));
  }

  function screenCog() {
    let html = `<div class="eyebrow">Section 1 of 3</div><h2 class="sec">Thinking Style</h2>
      <p class="lede">Pick the single best answer for each. A calculator is fine; no other help. Take your time.</p>`;
    let lastSub = '';
    state.form.cognitive.forEach((item, n) => {
      if (item.sub !== lastSub) { html += `<h3 class="block">${item.sub}</h3>`; lastSub = item.sub; }
      const ans = state.cog[item.id];
      html += `<div class="q" data-q="${item.id}"><div class="qnum">Q${n + 1}</div><div class="qtext">${item.q}</div>`;
      if (item.type === 'mc') {
        html += '<div class="choices">';
        item.choices.forEach((c, i) => {
          html += `<label class="choice"><input type="radio" name="${item.id}" value="${i}" ${ans === i ? 'checked' : ''}>
            <span class="tick"></span><span class="key">${String.fromCharCode(97 + i)}</span><span>${c}</span></label>`;
        });
        html += '</div>';
      } else {
        html += `<div class="numrow"><input type="text" inputmode="decimal" data-num="${item.id}" placeholder="${(item.prefix || '') + '0' + (item.suffix || '')}" value="${ans != null ? esc(String(ans)) : ''}">
          <span class="hint">Enter a number${item.prefix ? ' — the $ is optional' : ''}${item.suffix ? ' — the % is optional' : ''}.</span></div>`;
      }
      html += '</div>';
    });
    screen.innerHTML = html;
    screen.querySelectorAll('input[type=radio]').forEach((r) => r.addEventListener('change', (e) => {
      state.cog[e.target.name] = parseInt(e.target.value, 10);
      e.target.closest('.q').classList.add('answered'); updateNav();
    }));
    screen.querySelectorAll('input[data-num]').forEach((inp) => inp.addEventListener('input', (e) => {
      const id = e.target.dataset.num; const v = e.target.value.trim();
      if (v === '') { delete state.cog[id]; e.target.closest('.q').classList.remove('answered'); }
      else { state.cog[id] = v; e.target.closest('.q').classList.add('answered'); }
      updateNav();
    }));
    state.form.cognitive.forEach((item) => { if (state.cog[item.id] != null) { const q = screen.querySelector(`[data-q="${item.id}"]`); if (q) q.classList.add('answered'); } });
  }

  function screenBeh() {
    let html = `<div class="eyebrow">Section 2 of 3</div><h2 class="sec">About How You Work</h2>
      <p class="lede">There are no right answers here — just rate how well each statement describes you. Answer honestly and go with your first instinct.</p>`;
    state.form.traits.forEach((tr) => {
      html += `<div class="trait-block"><div class="scale-head"><span class="name">${tr.key}</span><span class="poles">${tr.low} ↔ ${tr.high}</span></div><div class="items">`;
      tr.items.forEach((it, i) => {
        const nm = tr.key + '_' + i; const cur = state.beh[nm];
        html += `<div class="q" data-q="${nm}" style="padding:14px 16px"><div class="qtext" style="margin-bottom:10px">${it.t}</div><div class="likert">`;
        for (let v = 1; v <= 5; v++) {
          html += `<label><input type="radio" name="${nm}" value="${v}" ${cur === v ? 'checked' : ''}><span class="n">${v}</span><span class="t">${['SD', 'D', 'N', 'A', 'SA'][v - 1]}</span></label>`;
        }
        html += '</div></div>';
      });
      html += '</div></div>';
    });
    screen.innerHTML = html;
    screen.querySelectorAll('input[type=radio]').forEach((r) => r.addEventListener('change', (e) => {
      state.beh[e.target.name] = parseInt(e.target.value, 10);
      e.target.closest('.q').classList.add('answered'); updateNav();
    }));
    Object.keys(state.beh).forEach((k) => { const q = screen.querySelector(`[data-q="${k}"]`); if (q) q.classList.add('answered'); });
  }

  function screenInt() {
    screen.innerHTML = `<div class="eyebrow">Section 3 of 3</div><h2 class="sec">What You Enjoy</h2>
      <p class="lede">Click these in your order of preference — most appealing first. Click a picked one again to remove it. Rank all six.</p>
      <div class="card"><div class="int-grid" id="intGrid"></div>
      <p class="muted-note" style="margin-top:14px" id="intStatus"></p></div>`;
    drawInt();
  }
  function drawInt() {
    const grid = $('#intGrid'); grid.innerHTML = '';
    state.form.interests.forEach((o) => {
      const rank = state.intOrder.indexOf(o.key); const picked = rank >= 0;
      const el = document.createElement('button');
      el.className = 'int-opt'; el.type = 'button'; el.dataset.picked = picked ? '1' : '0';
      el.innerHTML = `<span class="rankbadge">${picked ? rank + 1 : '·'}</span><span class="body"><b>${o.key}</b><span>${o.desc}</span></span>`;
      el.addEventListener('click', () => {
        const i = state.intOrder.indexOf(o.key);
        if (i >= 0) state.intOrder.splice(i, 1); else if (state.intOrder.length < 6) state.intOrder.push(o.key);
        drawInt(); updateNav();
      });
      grid.appendChild(el);
    });
    const rem = 6 - state.intOrder.length;
    $('#intStatus').textContent = rem > 0 ? `${rem} left to rank.` : `All six ranked: ${state.intOrder.join(' › ')}.`;
  }

  /* ---------- submit + results ---------- */
  async function submit() {
    state.submitting = true; state.error = ''; render();
    try {
      const r = await fetch('api/attempts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate: state.candidate, role: state.role, answers: { cog: state.cog, beh: state.beh, intOrder: state.intOrder } }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Submission failed');
      state.results = data.results; state.submitting = false; state.step = 4; render();
    } catch (e) {
      state.submitting = false; state.error = e.message || 'Something went wrong. Please try again.';
      state.step = 3; render();
    }
  }

  function screenSubmitting() {
    renderRail();
    screen.innerHTML = '<div class="center"><div class="spin"></div><p>Scoring your assessment…</p></div>';
    $('#navbar').innerHTML = '';
  }

  function screenResults() {
    const r = state.results;
    screen.innerHTML = `
      <div class="eyebrow">Comprehensive Selection Report</div>
      <h2 class="sec">${r.modelLabel} fit</h2>
      <div class="rep-head"><b>${esc(state.candidate.name || 'Candidate')}</b> · ${esc(state.candidate.email || '')} · Model: <b>${r.modelLabel}</b></div>

      <div class="verdict ${r.verdict.cls}">
        <div><span class="big">${Math.round(r.overall)}</span><span class="pct">%</span></div>
        <div><p class="call">${r.verdict.call}</p><p class="sub">${r.verdict.sub}</p></div>
      </div>

      <div class="breakdown">
        ${metric('Thinking Style', r.thinkingFit, '40% weight', r.thinkingFit * 0.4)}
        ${metric('Behavioral', r.behavioralFit, '40% weight', r.behavioralFit * 0.4)}
        ${metric('Interests', r.interestsFit, '20% weight', r.interestsFit * 0.2)}
      </div>
      <p class="muted-note">Overall fit = Thinking 40% + Behavioral 40% + Interests 20%. Field rule of thumb: ~70%+ is a generally acceptable fit. Keep this to about one-third of the hiring decision, next to the interview and track record.</p>

      <hr class="hr">
      <h3 class="block">Learning Index</h3>
      <p class="block-sub">${r.correct} of ${r.cogItems} correct → index <b>${r.learningIndex}/10</b>. Model target ${r.modelCog[0]}–${r.modelCog[1]}. Predicts ramp speed inside the 90-day gate.</p>
      <div class="pillrow">${Object.entries(r.subCounts).map(([k, x]) => `<span class="pill">${k}: <b class="num">${x.c}/${x.n}</b></span>`).join('')}</div>

      <hr class="hr">
      <h3 class="block">Behavioral traits vs. model</h3>
      <p class="block-sub">Each trait on the 1–10 STEN scale. The shaded band is the ${r.modelLabel} target; the marker is this candidate. Neither end is "good" — fit means landing in the band.</p>
      <div>${r.traitResults.map(trackRow).join('')}</div>

      <hr class="hr">
      <h3 class="block">Interests</h3>
      <p class="block-sub">Top 3 vs. the ${r.modelLabel} model's top 3 (${r.modelInterests.join(', ')}). ${r.matches}/3 match.</p>
      <div class="pillrow">${r.top3.map((k, i) => `<span class="pill ${r.modelInterests.includes(k) ? 'match' : ''}"><span class="rank">#${i + 1}</span> ${k}${r.modelInterests.includes(k) ? ' ✓' : ''}</span>`).join('')}</div>

      <hr class="hr">
      <h3 class="block">Distortion check</h3>
      <div class="flagbox ${r.distortion ? 'on' : 'off'}">
        <div class="ft">${r.distortion ? '⚠ Possible impression management' : '✓ No distortion indicated'}</div>
        <p class="sub" style="margin:6px 0 0;color:var(--muted);font-size:.9rem">${r.distortion
          ? `Response patterns suggest answering for the job rather than honestly (${r.inconsistent} contradictory trait pair${r.inconsistent === 1 ? '' : 's'}${r.extreme ? ', plus an unusually flawless profile' : ''}). A probability, not proof — lean on the interview and re-probe the "perfect" traits. Do not auto-reject.`
          : 'Reverse-scored items moved consistently and the profile is not implausibly flawless. Treat self-report at face value.'}</p>
      </div>

      <hr class="hr">
      <h3 class="block">Interview guide — targeted at each gap</h3>
      <p class="block-sub">Auto-generated for every scale outside the model. Structure the final interview around these.</p>
      ${buildGuide(r)}

      <div class="navbar" style="border-top:1px solid var(--line)">
        <button class="btn ghost" id="restartBtn">↺ New assessment</button>
        <button class="btn primary" id="printBtn" style="margin-left:auto">⎙ Print / save report</button>
      </div>`;
    renderRail();
    $('#navbar').innerHTML = '';
    $('#restartBtn').addEventListener('click', () => {
      Object.assign(state, { step: 0, role: state.roleLocked ? state.role : null, candidate: { name: '', email: '' }, cog: {}, beh: {}, intOrder: [], results: null, error: '' });
      render();
    });
    $('#printBtn').addEventListener('click', () => window.print());
  }

  function metric(lab, fit, wt, contrib) {
    return `<div class="metric"><div class="lab">${lab}</div><div class="val">${Math.round(fit)}%</div>
      <div class="wt">${wt} → +${Math.round(contrib)} pts</div>
      <div class="bar"><i style="width:${Math.max(2, Math.round(fit))}%"></i></div></div>`;
  }
  function trackRow(t) {
    const bandL = (t.lo - 1) / 10 * 100, bandW = (t.hi - t.lo + 1) / 10 * 100, mk = (t.sten - 0.5) / 10 * 100;
    const flagTxt = { in: 'In range', near: '1 off', out: 'Gap' }[t.flag];
    return `<div class="track-row">
      <div class="tname">${t.key}<small>${t.low} ↔ ${t.high}</small></div>
      <div class="track"><div class="grid">${'<span></span>'.repeat(10)}</div>
        <div class="band" style="left:${bandL}%;width:${bandW}%"></div>
        <div class="marker" data-v="${t.sten}" style="left:${mk}%"></div></div>
      <span class="fitflag ${t.flag}">${flagTxt}</span></div>`;
  }
  function buildGuide(r) {
    if (!r.guide.length) return `<div class="muted-note">No gaps — the candidate landed inside every model range. Use the interview to confirm track record and motivation.</div>`;
    return `<div class="guide">${r.guide.map((it) => `<div class="gitem"><div class="gtag">${it.tag}</div><div class="gq">${it.q}</div><div class="gl"><b>Listen for:</b> ${it.l}</div></div>`).join('')}</div>`;
  }

  /* ---------- completion + nav ---------- */
  function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
  function complete() {
    if (state.step === 0) return state.candidate.name.trim() && validEmail(state.candidate.email.trim()) && state.role;
    if (state.step === 1) return state.form.cognitive.every((i) => state.cog[i.id] != null && String(state.cog[i.id]).trim() !== '');
    if (state.step === 2) return Object.keys(state.beh).length === state.form.traits.length * 4;
    if (state.step === 3) return state.intOrder.length === 6;
    return true;
  }
  function remaining() {
    if (state.step === 1) return state.form.cognitive.length - state.form.cognitive.filter((i) => state.cog[i.id] != null && String(state.cog[i.id]).trim() !== '').length;
    if (state.step === 2) return state.form.traits.length * 4 - Object.keys(state.beh).length;
    if (state.step === 3) return 6 - state.intOrder.length;
    return 0;
  }
  function updateNav() {
    const nav = $('#navbar');
    if (state.step >= 4) { nav.innerHTML = ''; return; }
    const rem = remaining();
    const counter = state.step >= 1 && state.step <= 3 ? `<span class="counter"><b>${rem}</b> item${rem === 1 ? '' : 's'} left</span>` : '';
    const label = state.step === 3 ? 'Submit & score →' : 'Continue →';
    nav.innerHTML = `
      ${state.step > 0 ? '<button class="btn ghost" id="backBtn">← Back</button>' : ''}
      ${counter}
      <button class="btn primary" id="nextBtn" ${complete() ? '' : 'disabled'}>${label}</button>`;
    const back = $('#backBtn'); if (back) back.addEventListener('click', () => go(state.step - 1));
    $('#nextBtn').addEventListener('click', () => { if (state.step === 3) submit(); else go(state.step + 1); });
  }
  function go(step) {
    if (step > state.step && !complete()) return;
    state.step = step; state.error = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    render();
  }
  function render() {
    if (state.submitting) return screenSubmitting();
    renderRail();
    if (state.step === 0) screenStart();
    else if (state.step === 1) screenCog();
    else if (state.step === 2) screenBeh();
    else if (state.step === 3) screenInt();
    else screenResults();
    if (state.step < 4) updateNav();
  }

  /* ---------- utils ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function roleLabel(id) { const r = state.form.roles.find((x) => x.id === id); return r ? r.label : id; }

  /* ---------- theme ---------- */
  $('#themeBtn').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : (cur === 'light' ? 'dark' : (matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark'));
    document.documentElement.setAttribute('data-theme', next);
  });

  boot();
})();
