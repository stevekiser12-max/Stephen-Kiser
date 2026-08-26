/**
 * admin.js — recruiter dashboard. Lists stored attempts and shows full reports.
 * Auth is a bearer token entered once and kept in sessionStorage. This is a
 * STARTER-level guard — see README for hardening before real use.
 */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const screen = $('#screen');
  const KEY = 'fhb_admin_token';
  let token = sessionStorage.getItem(KEY) || '';

  async function api(path) {
    const r = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 401) { token = ''; sessionStorage.removeItem(KEY); throw new Error('unauthorized'); }
    if (!r.ok) throw new Error('request failed');
    return r.json();
  }

  function login() {
    screen.innerHTML = `
      <div class="eyebrow">Recruiter access</div>
      <h1 class="title">Admin sign-in</h1>
      <p class="lede">Enter the admin token (the <code>ADMIN_TOKEN</code> value from the server's environment).</p>
      <div class="card">
        <div class="field"><label for="tok">Admin token</label><input id="tok" type="password" placeholder="••••••••"></div>
        <p class="err hidden" id="loginErr">That token was rejected.</p>
        <button class="btn primary" id="go">Sign in</button>
      </div>`;
    const submit = () => { token = $('#tok').value.trim(); sessionStorage.setItem(KEY, token); loadList(); };
    $('#go').addEventListener('click', submit);
    $('#tok').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  }

  async function loadList() {
    screen.innerHTML = '<div class="center"><div class="spin"></div><p>Loading candidates…</p></div>';
    let data;
    try { data = await api('api/attempts'); }
    catch (e) { if (e.message === 'unauthorized') { login(); const le = $('#loginErr'); if (le) le.classList.remove('hidden'); } else screen.innerHTML = '<div class="center">Could not load. Refresh to retry.</div>'; return; }

    const rows = data.attempts;
    screen.innerHTML = `
      <div class="eyebrow">Candidate results</div>
      <h1 class="title" style="margin-bottom:16px">${rows.length} assessment${rows.length === 1 ? '' : 's'}</h1>
      ${rows.length ? `<div class="card" style="padding:6px 6px"><div style="overflow-x:auto"><table class="tbl">
        <thead><tr><th>Candidate</th><th>Role</th><th>Fit</th><th>Learning</th><th>Verdict</th><th>Flag</th><th>Date</th></tr></thead>
        <tbody>${rows.map(rowHtml).join('')}</tbody></table></div></div>`
        : '<div class="muted-note">No completed assessments yet. Share the test link to collect results.</div>'}
      <p style="margin-top:16px"><button class="btn ghost" id="out">Sign out</button></p>`;
    screen.querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => loadReport(tr.dataset.id)));
    $('#out').addEventListener('click', () => { token = ''; sessionStorage.removeItem(KEY); login(); });
  }

  function rowHtml(r) {
    const fit = r.overall_fit != null ? Math.round(r.overall_fit) : '—';
    return `<tr data-id="${r.attempt_id}">
      <td><b>${esc(r.name)}</b><br><span style="color:var(--muted);font-size:.82rem">${esc(r.email || '')}</span></td>
      <td>${r.role === 'acq' ? 'Acquisitions' : 'Dispo'}</td>
      <td><span class="num" style="font-weight:700">${fit}%</span></td>
      <td class="num">${r.learning_index ?? '—'}/10</td>
      <td><span class="badge ${r.verdict_cls || ''}">${shortVerdict(r.verdict_call)}</span></td>
      <td>${r.distortion ? '<span class="badge warn">⚠</span>' : ''}</td>
      <td style="color:var(--muted);font-size:.82rem">${fmtDate(r.completed_at)}</td>
    </tr>`;
  }
  function shortVerdict(v) { if (!v) return '—'; if (v.startsWith('Advance')) return 'Advance'; if (v.startsWith('Conditional')) return 'Conditional'; return 'Out'; }

  async function loadReport(id) {
    screen.innerHTML = '<div class="center"><div class="spin"></div></div>';
    let row;
    try { row = await api('api/attempts/' + id); }
    catch { screen.innerHTML = '<div class="center">Could not load report.</div>'; return; }
    const r = row.results;
    screen.innerHTML = `
      <p><button class="btn ghost" id="back">← All candidates</button></p>
      <div class="eyebrow">Comprehensive Selection Report</div>
      <h2 class="sec">${r.modelLabel} fit</h2>
      <div class="rep-head"><b>${esc(row.name)}</b> · ${esc(row.email || '')} · Model: <b>${r.modelLabel}</b> · ${fmtDate(row.completedAt)}</div>

      <div class="verdict ${r.verdict.cls}">
        <div><span class="big">${Math.round(r.overall)}</span><span class="pct">%</span></div>
        <div><p class="call">${r.verdict.call}</p><p class="sub">${r.verdict.sub}</p></div>
      </div>
      <div class="breakdown">
        ${metric('Thinking Style', r.thinkingFit, '40% weight', r.thinkingFit * 0.4)}
        ${metric('Behavioral', r.behavioralFit, '40% weight', r.behavioralFit * 0.4)}
        ${metric('Interests', r.interestsFit, '20% weight', r.interestsFit * 0.2)}
      </div>

      <hr class="hr"><h3 class="block">Learning Index</h3>
      <p class="block-sub">${r.correct} of ${r.cogItems} correct → <b>${r.learningIndex}/10</b>. Model target ${r.modelCog[0]}–${r.modelCog[1]}.</p>
      <div class="pillrow">${Object.entries(r.subCounts).map(([k, x]) => `<span class="pill">${k}: <b class="num">${x.c}/${x.n}</b></span>`).join('')}</div>

      <hr class="hr"><h3 class="block">Behavioral traits vs. model</h3>
      <div>${r.traitResults.map(trackRow).join('')}</div>

      <hr class="hr"><h3 class="block">Interests</h3>
      <p class="block-sub">Top 3 vs. model (${r.modelInterests.join(', ')}). ${r.matches}/3 match.</p>
      <div class="pillrow">${r.top3.map((k, i) => `<span class="pill ${r.modelInterests.includes(k) ? 'match' : ''}"><span class="rank">#${i + 1}</span> ${k}${r.modelInterests.includes(k) ? ' ✓' : ''}</span>`).join('')}</div>

      <hr class="hr"><h3 class="block">Distortion check</h3>
      <div class="flagbox ${r.distortion ? 'on' : 'off'}"><div class="ft">${r.distortion ? '⚠ Possible impression management' : '✓ No distortion indicated'}</div></div>

      <hr class="hr"><h3 class="block">Interview guide</h3>
      ${r.guide.length ? `<div class="guide">${r.guide.map((it) => `<div class="gitem"><div class="gtag">${it.tag}</div><div class="gq">${it.q}</div><div class="gl"><b>Listen for:</b> ${it.l}</div></div>`).join('')}</div>` : '<div class="muted-note">No gaps — inside every model range.</div>'}

      <p style="margin-top:24px"><button class="btn primary" id="print">⎙ Print / save report</button></p>`;
    $('#back').addEventListener('click', loadList);
    $('#print').addEventListener('click', () => window.print());
  }

  function metric(lab, fit, wt, contrib) {
    return `<div class="metric"><div class="lab">${lab}</div><div class="val">${Math.round(fit)}%</div>
      <div class="wt">${wt} → +${Math.round(contrib)} pts</div>
      <div class="bar"><i style="width:${Math.max(2, Math.round(fit))}%"></i></div></div>`;
  }
  function trackRow(t) {
    const bandL = (t.lo - 1) / 10 * 100, bandW = (t.hi - t.lo + 1) / 10 * 100, mk = (t.sten - 0.5) / 10 * 100;
    const flagTxt = { in: 'In range', near: '1 off', out: 'Gap' }[t.flag];
    return `<div class="track-row"><div class="tname">${t.key}<small>${t.low} ↔ ${t.high}</small></div>
      <div class="track"><div class="grid">${'<span></span>'.repeat(10)}</div>
        <div class="band" style="left:${bandL}%;width:${bandW}%"></div>
        <div class="marker" data-v="${t.sten}" style="left:${mk}%"></div></div>
      <span class="fitflag ${t.flag}">${flagTxt}</span></div>`;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function fmtDate(iso) { if (!iso) return ''; const d = new Date(iso); return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }

  $('#themeBtn').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : (cur === 'light' ? 'dark' : (matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark'));
    document.documentElement.setAttribute('data-theme', next);
  });

  if (token) loadList(); else login();
})();
