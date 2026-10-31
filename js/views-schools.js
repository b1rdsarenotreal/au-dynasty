// Schools: the member list and each school's page with its athletic
// department (every sport it sponsors), its conference memberships, and
// department expansion (adding or dropping programs).

import { app, esc, VY, L, $, $$, changed, toast, school, badge, confBadge, sportHref, schoolHref, openModal, options, readableOn } from './ui.js?v=20261030221621';
import { yearLabel, homeConf, membershipsOf, confOf, program, hasProgram, effectiveYear, addProgram, dropProgram, leaveConference, joinConference, conferencesIn, addSchool } from './league.js?v=20261030221621';
import { records, fmtRec } from './standings.js?v=20261030221621';
import { TERMS } from './sports.js?v=20261030221621';

export function renderSchools() {
  const lg = L(), Y = VY();
  const list = Object.values(lg.schools).sort((a, b) => a.short.localeCompare(b.short));
  const progCount = id => Object.values(lg.programs).filter(p => p.school === id && p.from <= Y.year && (p.to == null || p.to > Y.year)).length;
  app.innerHTML = `<div class="section-head"><h1>Schools</h1><span class="muted">${list.length} members · ${yearLabel(Y.year)}</span><div class="spacer"></div>
      <input type="text" class="searchbox" id="q" placeholder="Search schools"><button class="btn" id="add">Add a school</button></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>School</th><th>Home conference</th><th>Location</th><th class="num">Programs</th><th>AAU since</th></tr></thead><tbody>
    ${list.map(s => `<tr class="clickable" data-href="${schoolHref(s.id)}" data-q="${esc(`${s.name} ${s.short} ${s.mascot} ${s.state}`.toLowerCase())}"><td>${school(s.id, { size: 22 })} <span class="muted small">${esc(s.mascot)}</span></td><td>${confBadge(homeConf(lg, s.id, Y.year))}</td><td>${esc(s.city)}${s.state ? `, ${esc(s.state)}` : ''}</td><td class="num">${progCount(s.id)}</td><td>${s.aau || '<span class="muted">—</span>'}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  for (const tr of $$('tr[data-href]')) tr.onclick = e => { if (!e.target.closest('a')) location.hash = tr.dataset.href; };
  $('#q').oninput = e => { const q = e.target.value.toLowerCase(); for (const tr of $$('tr[data-q]')) tr.style.display = tr.dataset.q.includes(q) ? '' : 'none'; };
  $('#add').onclick = () => schoolForm(null);
}

function schoolForm(id) {
  const lg = L(), s = id ? lg.schools[id] : { name: '', short: '', mascot: '', city: '', state: '', country: 'US', colors: ['#33475b', '#f2c14e'], private: false };
  openModal(`<div class="modal-head"><h2>${id ? `Edit ${esc(s.short)}` : 'Add a school'}</h2><button class="btn ghost" data-close>Cancel</button></div>
    <div class="modal-body stack">
      ${id ? '' : '<p class="note">New schools join the association with no programs and no conference. Add programs on their page, then invite them to conferences.</p>'}
      <div class="form-grid">
        <label class="field">Full name<input type="text" id="f-name" value="${esc(s.name)}"></label>
        <label class="field">Short name<input type="text" id="f-short" value="${esc(s.short)}"></label>
        <label class="field">Mascot<input type="text" id="f-mascot" value="${esc(s.mascot)}"></label>
        <label class="field">City<input type="text" id="f-city" value="${esc(s.city)}"></label>
        <label class="field">State / province<input type="text" id="f-state" value="${esc(s.state)}"></label>
        <label class="field">Country<select id="f-country">${options([['US', 'United States'], ['CA', 'Canada'], ['MX', 'Mexico'], ['other', 'Other']], s.country)}</select></label>
        <label class="field">Primary color<input type="color" id="f-c1" value="${s.colors[0]}"></label>
        <label class="field">Secondary color<input type="color" id="f-c2" value="${s.colors[1]}"></label>
      </div>
    </div>
    <div class="modal-foot"><button class="btn primary" id="f-save">${id ? 'Save' : 'Add school'}</button></div>`, m => {
    $('#f-save', m).onclick = () => {
      const v = k => $(`#f-${k}`, m).value.trim();
      if (!v('name') || !v('short')) return toast('A school needs a full name and a short name.', true);
      const data = { name: v('name'), short: v('short'), mascot: v('mascot'), city: v('city'), state: v('state'), country: v('country'), colors: [v('c1'), v('c2')] };
      try {
        if (id) Object.assign(lg.schools[id], data);
        else { const nid = addSchool(lg, data); location.hash = schoolHref(nid); }
      } catch (e) { return toast(e.message, true); }
      m.close(); changed();
    };
  });
}

export function renderSchool(id) {
  const lg = L(), Y = VY(), s = lg.schools[id];
  if (!s) { app.innerHTML = '<div class="empty">No such school.</div>'; return; }
  const cur = Y.year === lg.currentYear, eff = effectiveYear(lg);
  const effNote = cur ? (eff === Y.year ? `Changes count for ${yearLabel(eff)}.` : `Changes take effect in ${yearLabel(eff)} (the ${yearLabel(Y.year)} season is underway).`) : '';
  const ms = membershipsOf(lg, id, Y.year);
  const home = ms.find(m => !m.sports);
  const allMs = lg.memberships.filter(m => m.school === id).sort((a, b) => a.from - b.from);
  const titles = Object.entries(lg.years).flatMap(([yr, y]) => Object.entries(y.sports).filter(([, ss]) => ss.champion === id).map(([sid]) => [Number(yr), sid]));

  // Athletic department: every sport, grouped by season.
  const deptRows = Object.entries(TERMS).map(([t, label]) => {
    const sports = Object.values(lg.sports).filter(x => x.term === t).sort((a, b) => a.name.localeCompare(b.name));
    return `<tr><th colspan="7" style="padding-top:14px">${label}</th></tr>` + sports.map(sp => {
      const p = program(lg, id, sp.id), has = hasProgram(lg, id, sp.id, Y.year), hasNext = hasProgram(lg, id, sp.id, eff);
      const ss = Y.sports[sp.id], team = ss?.teams[id];
      const rec = team ? records(ss)[id] : null;
      const off = team ? team.off : p?.off, def = team ? team.def : p?.def, ovr = has ? Math.round((off + def) / 2) : null;
      const conf = has ? (ss ? ss.conf[id] : confOf(lg, id, sp.id, Y.year)) : null;
      let action = '';
      if (cur) action = hasNext ? `<button class="btn sm danger" data-drop="${sp.id}">Drop</button>` : `<button class="btn sm" data-add="${sp.id}">Add program</button>`;
      const status = has ? '' : hasNext ? `<span class="pill full">Starts ${yearLabel(eff)}</span>` : `<span class="muted">No program</span>`;
      const ending = has && !hasNext && cur ? ` <span class="pill warn">Ends after ${yearLabel(Y.year)}</span>` : '';
      return `<tr><td>${sp.active ? `<a href="${sportHref(sp.id)}">${esc(sp.name)}</a>` : `<span class="muted">${esc(sp.name)}</span> <span class="pill">off</span>`}${ending}</td>
        <td>${has ? confBadge(conf) : status}</td>
        <td class="num">${has ? `<span class="ovr">${ovr}</span>` : ''}</td>
        <td>${has ? `<div class="bar" title="OFF ${Math.round(off)} · DEF ${Math.round(def)}"><div style="width:${Math.max(0, (ovr - 25) / 74 * 100)}%;background:${s.colors[0]}"></div></div>` : ''}</td>
        <td class="small muted">${has ? `OFF ${Math.round(off)} · DEF ${Math.round(def)}` : ''}</td>
        <td class="num">${rec ? fmtRec(rec.w, rec.l, rec.t) : ''}${ss?.champion === id ? ' 🏆' : ''}</td><td class="num">${action}</td></tr>`;
    }).join('');
  }).join('');

  const c1 = s.colors[0], c2 = s.colors[1];
  app.innerHTML = `
    <div class="team-hero" style="--tc:${c1};--ta:${c2};color:${readableOn(c1)}">
      ${badge(id, 72)}
      <div><div class="team-hero-name">${esc(s.name)}</div><div class="team-hero-sub">${esc(s.mascot)} · ${esc(s.city)}${s.state ? `, ${esc(s.state)}` : ''}${s.country === 'CA' ? ', Canada' : ''} · ${s.aau ? `AAU member since ${s.aau}` : `Joined ${yearLabel(s.joined)}`}</div></div>
      <div class="spacer"></div><button class="btn" id="edit">Edit school</button>
    </div>
    <div class="grid wide">
      <div class="card"><div class="section-head"><h2>Conferences</h2><span class="muted">${yearLabel(Y.year)}</span></div>
        ${ms.length ? `<table><tbody>${ms.map(m => `<tr><td>${confBadge(m.conf)} <a href="#/conference/${m.conf}">${esc(lg.conferences[m.conf]?.name)}</a></td>
          <td>${m.sports ? `<span class="pill aff">Affiliate</span> <span class="small">${m.sports.map(x => esc(lg.sports[x]?.name || x)).join(', ')}</span>` : '<span class="pill full">Full member</span>'}</td>
          <td class="small muted">since ${yearLabel(m.from)}${m.to ? ` · leaving after ${yearLabel(m.to - 1)}` : ''}</td>
          <td class="num">${cur && (m.to == null || m.to > eff) ? `<button class="btn sm danger" data-leave="${m.id}">Leave</button>` : ''}</td></tr>`).join('')}</tbody></table>`
          : `<p class="muted">${esc(s.short)} isn't in a conference${home ? '' : ''} and plays every sport as an independent.</p>`}
        ${cur ? `<div class="row" style="margin-top:12px"><button class="btn" id="join">Join a conference</button><span class="note">${effNote}</span></div>` : ''}
      </div>
      <div class="card"><h2>National championships</h2>${titles.length ? `<ul class="log">${titles.map(([yr, sid]) => `<li><span class="y">${yearLabel(yr)}</span><a href="${sportHref(sid, 'championship')}">${esc(lg.sports[sid]?.name)}</a></li>`).join('')}</ul>` : '<p class="muted">None yet.</p>'}</div>
    </div>
    <div class="card"><div class="section-head"><h2>Athletic department</h2><span class="muted">${yearLabel(Y.year)}</span>${cur ? `<span class="note">${effNote}</span>` : ''}</div>
      <div class="table-wrap"><table class="dept"><thead><tr><th>Sport</th><th>Conference</th><th class="num">OVR</th><th></th><th></th><th class="num">Record</th><th></th></tr></thead><tbody>${deptRows}</tbody></table></div></div>
    ${allMs.length ? `<div class="card"><h2>Membership history</h2><ul class="log">${allMs.map(m => `<li><span class="y">${yearLabel(m.from)}</span><span>${m.to ? `to ${yearLabel(m.to - 1)}: ` : 'Now: '}${confBadge(m.conf)} ${esc(lg.conferences[m.conf]?.name || 'Former conference')} ${m.sports ? `(affiliate: ${m.sports.map(x => esc(lg.sports[x]?.name || x)).join(', ')})` : ''}</span></li>`).join('')}</ul></div>` : ''}`;

  $('#edit').onclick = () => schoolForm(id);
  for (const b of $$('[data-add]')) b.onclick = () => addProgramForm(id, b.dataset.add);
  for (const b of $$('[data-drop]')) b.onclick = () => {
    const sp = lg.sports[b.dataset.drop];
    if (!confirm(`Drop ${s.short} ${sp.name}? ${eff === lg.currentYear ? 'It won\'t be played this year.' : `It finishes ${yearLabel(lg.currentYear)} and is gone from ${yearLabel(eff)}.`}`)) return;
    dropProgram(lg, id, sp.id); toast(`${s.short} dropped ${sp.name}.`); changed();
  };
  for (const b of $$('[data-leave]')) b.onclick = () => {
    const m = lg.memberships.find(x => x.id === b.dataset.leave);
    if (!confirm(`Take ${s.short} out of the ${lg.conferences[m.conf].name}${m.sports ? ` (${m.sports.map(x => lg.sports[x]?.name).join(', ')})` : ''}, starting ${yearLabel(eff)}?`)) return;
    leaveConference(lg, m.id); changed();
  };
  $('#join')?.addEventListener('click', () => joinForm(id));
}

export function addProgramForm(id, sportId) {
  const lg = L(), s = lg.schools[id], sp = lg.sports[sportId], eff = effectiveYear(lg);
  openModal(`<div class="modal-head"><h2>${esc(s.short)} adds ${esc(sp.name)}</h2><button class="btn ghost" data-close>Cancel</button></div>
    <div class="modal-body stack">
      <p>The program starts in ${yearLabel(eff)}.${sp.active ? '' : ` ${esc(sp.name)} isn't being played yet; turn it on in Settings when you're ready.`} New programs usually start low and build up over a few years.</p>
      <div class="form-grid">
        <label class="field">Starting level<select id="lvl">${options([[40, 'Startup (40)'], [50, 'Established small program (50)'], [62, 'Solid program (62)'], [75, 'Big investment (75)']], 40)}</select></label>
        <label class="field">OFF<input type="number" id="off" value="40" min="25" max="99"></label>
        <label class="field">DEF<input type="number" id="def" value="40" min="25" max="99"></label>
      </div>
      <p class="note">It plays as an independent in ${esc(sp.name)} unless its home conference sponsors the sport, or you add it as an affiliate somewhere.</p>
    </div>
    <div class="modal-foot"><button class="btn primary" id="go">Add ${esc(sp.name)}</button></div>`, m => {
    $('#lvl', m).onchange = e => { $('#off', m).value = e.target.value; $('#def', m).value = e.target.value; };
    $('#go', m).onclick = () => { addProgram(lg, id, sportId, { off: Number($('#off', m).value), def: Number($('#def', m).value) }); m.close(); toast(`${s.short} added ${sp.name}.`); changed(); };
  });
}

export function joinForm(id, confPre = '') {
  const lg = L(), s = lg.schools[id], eff = effectiveYear(lg);
  const confs = conferencesIn(lg, eff).sort((a, b) => a.name.localeCompare(b.name));
  if (!confs.length) { toast('Found a conference first, on the Conferences page.', true); return; }
  openModal(`<div class="modal-head"><h2>${esc(s.short)} joins a conference</h2><button class="btn ghost" data-close>Cancel</button></div>
    <div class="modal-body stack">
      <label class="field">Conference<select id="conf">${options(confs.map(c => [c.id, c.name]), confPre || confs[0].id)}</select></label>
      <label class="check"><input type="radio" name="kind" value="full" checked> Full member: plays every sport the conference sponsors (replaces its current home conference)</label>
      <label class="check"><input type="radio" name="kind" value="aff"> Affiliate member in these sports:</label>
      <div class="multi" id="sports"></div>
      <p class="note">Starts in ${yearLabel(eff)}.</p>
    </div>
    <div class="modal-foot"><button class="btn primary" id="go">Join</button></div>`, m => {
    const fill = () => {
      const c = lg.conferences[$('#conf', m).value];
      $('#sports', m).innerHTML = c.sponsors.length ? c.sponsors.map(sid => `<label class="check"><input type="checkbox" value="${sid}" ${hasProgram(lg, id, sid, eff) ? '' : 'disabled'}> ${esc(lg.sports[sid]?.name || sid)}${hasProgram(lg, id, sid, eff) ? '' : ' <span class="muted small">(no program)</span>'}</label>`).join('') : '<span class="muted">This conference doesn\'t sponsor any sports yet.</span>';
    };
    fill();
    $('#conf', m).onchange = fill;
    $('#go', m).onclick = () => {
      const conf = $('#conf', m).value, kind = m.querySelector('input[name=kind]:checked').value;
      let sports = null;
      if (kind === 'aff') { sports = $$('#sports input:checked', m).map(x => x.value); if (!sports.length) return toast('Pick at least one sport for an affiliate membership.', true); }
      joinConference(lg, id, conf, sports); m.close(); toast(`${s.short} joins the ${lg.conferences[conf].name} in ${yearLabel(eff)}.`); changed();
    };
  });
}
