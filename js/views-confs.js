// Conferences: founding them, choosing the sports they sponsor, inviting
// full and affiliate members, and realignment. The commissioner makes every
// move; nothing realigns on its own.

import { app, esc, VY, L, $, $$, changed, toast, school, confBadge, confHref, sportHref, schoolHref, openModal, options } from './ui.js?v=20261030222729';
import { yearLabel, conferencesIn, confRoster, confMembers, confOf, effectiveYear, createConference, dissolveConference, joinConference, leaveConference, hasProgram, homeConf, programsIn, activeSports } from './league.js?v=20261030222729';
import { TERMS } from './sports.js?v=20261030222729';

const COLORS = ['#1d4f91', '#b3192f', '#17784a', '#6b3fa0', '#c25e00', '#0f6e7a', '#8a1538', '#3a4a5c', '#a8740c', '#2b6cb0'];

export function renderConferences() {
  const lg = L(), Y = VY(), cur = Y.year === lg.currentYear, eff = effectiveYear(lg);
  const confs = conferencesIn(lg, Y.year).sort((a, b) => a.name.localeCompare(b.name));
  const future = cur ? conferencesIn(lg, eff).filter(c => c.founded > Y.year) : [];
  const card = c => {
    const roster = confRoster(lg, c.id, Y.year);
    const full = roster.filter(m => m.kind === 'full').length, aff = roster.filter(m => m.kind === 'affiliate').length;
    const thin = c.sponsors.filter(sid => lg.sports[sid]?.active && confMembers(lg, c.id, sid, Y.year).length < lg.settings.autoMin);
    return `<a class="card conf-card" href="${confHref(c.id)}"><div class="row">${confBadge(c.id, { link: false })}<h3 style="margin:0">${esc(c.name)}</h3></div>
      <div class="muted small" style="margin-top:6px">${full} full member${full === 1 ? '' : 's'}${aff ? ` · ${aff} affiliate${aff === 1 ? '' : 's'}` : ''} · ${c.sponsors.length} sport${c.sponsors.length === 1 ? '' : 's'}${c.sportOnly ? ' · sport-specific' : ''}</div>
      ${thin.length ? `<div style="margin-top:6px"><span class="pill warn">Under ${lg.settings.autoMin} teams: ${thin.map(x => esc(lg.sports[x].name)).join(', ')}</span></div>` : ''}</a>`;
  };
  // Who still needs a home next year.
  const homeless = Object.values(lg.schools).filter(s => !homeConf(lg, s.id, eff));
  const indBySport = activeSports(lg).map(sp => [sp, programsIn(lg, sp.id, eff).filter(p => !confOf(lg, p.school, sp.id, eff)).map(p => p.school)]).filter(([, l]) => l.length);
  app.innerHTML = `<div class="section-head"><h1>Conferences</h1><span class="muted">${yearLabel(Y.year)}</span><div class="spacer"></div>${cur ? '<button class="btn primary" id="new">Found a conference</button>' : ''}</div>
    ${!confs.length && !future.length ? `<div class="card empty">No conferences ${cur ? 'yet. Found the first one to start building the map. A conference can be all-sports (full members play everything it sponsors) or sport-specific (for example a hockey or lacrosse league made of affiliates).' : `in ${yearLabel(Y.year)}.`}</div>` : ''}
    <div class="grid narrow" style="margin-bottom:16px">${confs.map(card).join('')}</div>
    ${future.length ? `<h2>Starting ${yearLabel(eff)}</h2><div class="grid narrow" style="margin-bottom:16px">${future.map(card).join('')}</div>` : ''}
    ${cur ? `<div class="grid wide">
      <div class="card"><div class="section-head"><h2>Schools without a home conference</h2><span class="muted">${yearLabel(eff)}</span></div>
        ${homeless.length ? `<p class="muted small">${homeless.length} school${homeless.length === 1 ? '' : 's'}</p><div class="row">${homeless.sort((a, b) => a.short.localeCompare(b.short)).map(s => school(s.id, { size: 16 })).join(' ')}</div>` : '<p class="muted">Every school has a home conference.</p>'}</div>
      <div class="card"><div class="section-head"><h2>Independents by sport</h2><span class="muted">${yearLabel(eff)}</span></div>
        ${indBySport.length ? `<table><tbody>${indBySport.map(([sp, l]) => `<tr><td><a href="${sportHref(sp.id, 'teams')}">${esc(sp.name)}</a></td><td class="num">${l.length}</td><td class="small muted">${l.slice(0, 12).map(t => esc(lg.schools[t].short)).join(', ')}${l.length > 12 ? '…' : ''}</td></tr>`).join('')}</tbody></table>
          <p class="note">These programs have no conference in that sport: their home conference doesn't sponsor it, or they have no home conference. Independents can still earn at-large bids.</p>` : '<p class="muted">No independents.</p>'}</div>
    </div>` : ''}
    ${Object.values(lg.conferences).some(c => c.dissolved != null && c.dissolved <= Y.year) ? `<div class="card"><h2>Former conferences</h2>${Object.values(lg.conferences).filter(c => c.dissolved != null && c.dissolved <= Y.year).map(c => `<div>${confBadge(c.id)} ${esc(c.name)} <span class="muted small">${yearLabel(c.founded)} to ${yearLabel(c.dissolved - 1)}</span></div>`).join('')}</div>` : ''}`;
  $('#new')?.addEventListener('click', () => confForm(null));
}

function confForm(id) {
  const lg = L(), c = id ? lg.conferences[id] : { name: '', abbr: '', color: COLORS[Object.keys(lg.conferences).length % COLORS.length], sponsors: [], sportOnly: false };
  const sportBoxes = Object.entries(TERMS).map(([t, label]) => `<div><b class="small">${label}</b>${Object.values(lg.sports).filter(s => s.term === t).map(s => `<label class="check"><input type="checkbox" value="${s.id}" ${c.sponsors.includes(s.id) ? 'checked' : ''}> ${esc(s.name)}${s.active ? '' : ' <span class="muted small">(off)</span>'}</label>`).join('')}</div>`).join('');
  openModal(`<div class="modal-head"><h2>${id ? `Edit ${esc(c.name)}` : 'Found a conference'}</h2><button class="btn ghost" data-close>Cancel</button></div>
    <div class="modal-body stack">
      <div class="form-grid">
        <label class="field">Name<input type="text" id="c-name" value="${esc(c.name)}" placeholder="Atlantic Research Conference"></label>
        <label class="field">Abbreviation<input type="text" id="c-abbr" value="${esc(c.abbr)}" maxlength="8" placeholder="ARC"></label>
        <label class="field">Color<input type="color" id="c-color" value="${c.color}"></label>
      </div>
      <label class="check"><input type="checkbox" id="c-only" ${c.sportOnly ? 'checked' : ''}> Sport-specific conference (members join as affiliates for its sports)</label>
      <div><div class="small muted" style="margin-bottom:4px">Sports it sponsors</div><div class="multi" style="max-height:none">${sportBoxes}</div></div>
      ${id ? '<p class="note">Changing the sports a conference sponsors applies from the next schedule made (this year if it\'s still the preseason).</p>' : `<p class="note">The conference starts in ${yearLabel(effectiveYear(lg))}.</p>`}
    </div>
    <div class="modal-foot"><button class="btn primary" id="c-save">${id ? 'Save' : 'Found it'}</button>${id ? '<div class="spacer"></div><button class="btn danger" id="c-dissolve">Dissolve</button>' : ''}</div>`, m => {
    $('#c-save', m).onclick = () => {
      const name = $('#c-name', m).value.trim();
      if (!name) return toast('Give the conference a name.', true);
      const data = { name, abbr: $('#c-abbr', m).value.trim() || name.split(/\s+/).map(w => w[0]).join('').toUpperCase(), color: $('#c-color', m).value, sportOnly: $('#c-only', m).checked, sponsors: $$('.multi input:checked', m).map(x => x.value) };
      if (id) Object.assign(lg.conferences[id], data);
      else { const nid = createConference(lg, data); location.hash = confHref(nid); }
      m.close(); changed();
    };
    $('#c-dissolve', m)?.addEventListener('click', () => {
      if (!confirm(`Dissolve the ${c.name}? Every member leaves starting ${yearLabel(effectiveYear(lg))}. Its history stays.`)) return;
      dissolveConference(lg, id); m.close(); location.hash = '#/conferences'; changed();
    });
  });
}

function addMembersForm(id) {
  const lg = L(), c = lg.conferences[id], eff = effectiveYear(lg);
  const roster = confRoster(lg, id, eff);
  const inFull = new Set(roster.filter(m => m.kind === 'full').map(m => m.school));
  const list = Object.values(lg.schools).filter(s => !inFull.has(s.id)).sort((a, b) => a.short.localeCompare(b.short));
  openModal(`<div class="modal-head"><h2>Invite schools to the ${esc(c.name)}</h2><button class="btn ghost" data-close>Cancel</button></div>
    <div class="modal-body stack">
      <div class="row"><label class="check"><input type="radio" name="kind" value="full" ${c.sportOnly ? '' : 'checked'}> Full members</label>
        <label class="check"><input type="radio" name="kind" value="aff" ${c.sportOnly ? 'checked' : ''}> Affiliates in:</label>
        <span id="aff-sports" class="row">${c.sponsors.map(s => `<label class="check"><input type="checkbox" value="${s}" ${c.sportOnly ? 'checked' : ''}> ${esc(lg.sports[s]?.name || s)}</label>`).join('')}</span></div>
      <input type="text" id="q" placeholder="Filter schools">
      <div class="multi" id="schools">${list.map(s => { const h = homeConf(lg, s.id, eff); return `<label class="check" data-q="${esc(`${s.name} ${s.short} ${s.state}`.toLowerCase())}"><input type="checkbox" value="${s.id}"> ${esc(s.short)}${h ? ` <span class="muted small">(${esc(lg.conferences[h].abbr)})</span>` : ''}</label>`; }).join('')}</div>
      <p class="note">Full members leave their current home conference. Affiliates keep their home conference and play only the chosen sports here (schools without a program in a sport skip it). Starts ${yearLabel(eff)}.</p>
    </div>
    <div class="modal-foot"><button class="btn primary" id="go">Add members</button></div>`, m => {
    $('#q', m).oninput = e => { const q = e.target.value.toLowerCase(); for (const l of $$('[data-q]', m)) l.style.display = l.dataset.q.includes(q) ? '' : 'none'; };
    $('#go', m).onclick = () => {
      const picks = $$('#schools input:checked', m).map(x => x.value);
      if (!picks.length) return toast('Pick at least one school.', true);
      const kind = m.querySelector('input[name=kind]:checked').value;
      const sports = kind === 'aff' ? $$('#aff-sports input:checked', m).map(x => x.value) : null;
      if (kind === 'aff' && !sports.length) return toast('Pick the sports for the affiliate memberships.', true);
      for (const s of picks) {
        if (sports) { const own = sports.filter(sp => hasProgram(lg, s, sp, eff)); if (own.length) joinConference(lg, s, id, own); }
        else joinConference(lg, s, id, null);
      }
      m.close(); toast(`${picks.length} school${picks.length > 1 ? 's' : ''} added.`); changed();
    };
  });
}

export function renderConference(id) {
  const lg = L(), Y = VY(), c = lg.conferences[id];
  if (!c) { app.innerHTML = '<div class="empty">No such conference.</div>'; return; }
  const cur = Y.year === lg.currentYear, eff = effectiveYear(lg);
  // Show next year's lineup while the current season is underway, so moves
  // you make are visible; past years show what was.
  const showYear = cur ? eff : Y.year;
  const roster = confRoster(lg, id, showYear).sort((a, b) => (a.kind > b.kind ? 1 : a.kind < b.kind ? -1 : lg.schools[a.school].short.localeCompare(lg.schools[b.school].short)));
  const sponsors = c.sponsors.filter(s => lg.sports[s]).sort((a, b) => Object.keys(TERMS).indexOf(lg.sports[a].term) - Object.keys(TERMS).indexOf(lg.sports[b].term) || lg.sports[a].name.localeCompare(lg.sports[b].name));
  const counts = Object.fromEntries(sponsors.map(sp => [sp, confMembers(lg, id, sp, showYear).length]));
  const abbr = sp => lg.sports[sp].name.replace("Women's ", 'W ').replace("Men's ", 'M ');
  const cell = (s, sp, m) => {
    if (!hasProgram(lg, s, sp, showYear)) return '<span class="mk x" title="No program">–</span>';
    const where = confOf(lg, s, sp, showYear);
    if (where === id) return m.kind === 'full' ? '<span class="mk f" title="Plays here as a full member">F</span>' : '<span class="mk a" title="Plays here as an affiliate">A</span>';
    return `<span class="mk x" title="Plays ${where ? `in the ${esc(lg.conferences[where].name)}` : 'as an independent'}">${where ? esc(lg.conferences[where].abbr) : 'IND'}</span>`;
  };
  const log = lg.log.filter(e => e.text.includes(c.name)).slice(-30).reverse();
  app.innerHTML = `
    <div class="team-hero" style="--tc:${c.color};--ta:#f2c14e">
      <span class="cbadge" style="--cc:rgba(0,0,0,.25);font-size:28px;padding:14px 16px">${esc(c.abbr)}</span>
      <div><div class="team-hero-name">${esc(c.name)}</div><div class="team-hero-sub">Founded ${yearLabel(c.founded)}${c.dissolved ? ` · dissolved after ${yearLabel(c.dissolved - 1)}` : ''}${c.sportOnly ? ' · sport-specific' : ''} · ${sponsors.length} sport${sponsors.length === 1 ? '' : 's'}</div></div>
      <div class="spacer"></div>${cur && !c.dissolved ? '<button class="btn" id="edit">Edit</button><button class="btn" id="add">Invite schools</button>' : ''}
    </div>
    <div class="card"><div class="section-head"><h2>Members</h2><span class="muted">${yearLabel(showYear)}${cur && showYear !== Y.year ? ' (next year: moves made now show here)' : ''}</span></div>
      ${roster.length ? `<div class="table-wrap"><table class="matrix"><thead><tr><th>School</th><th>Membership</th>${sponsors.map(sp => `<th class="sp" title="${esc(lg.sports[sp].name)}"><a href="${sportHref(sp, 'standings')}">${esc(abbr(sp))}</a></th>`).join('')}<th></th></tr></thead><tbody>
        ${roster.map(m => `<tr><td>${school(m.school)}</td><td>${m.kind === 'full' ? '<span class="pill full">Full</span>' : '<span class="pill aff">Affiliate</span>'} <span class="small muted">since ${yearLabel(m.from)}${m.to ? `, leaving after ${yearLabel(m.to - 1)}` : ''}</span></td>
          ${sponsors.map(sp => `<td class="sp">${m.kind === 'full' || m.sports.includes(sp) ? cell(m.school, sp, m) : ''}</td>`).join('')}
          <td class="num">${cur && (m.to == null || m.to > eff) ? `<button class="btn sm danger" data-leave="${m.id}">Remove</button>` : ''}</td></tr>`).join('')}
        <tr><td colspan="2"><b>Teams per sport</b> <span class="note">${lg.settings.autoMin}+ earns an automatic bid</span></td>${sponsors.map(sp => `<td class="sp"><b class="${counts[sp] < lg.settings.autoMin ? 'bad' : ''}">${counts[sp]}</b></td>`).join('')}<td></td></tr>
      </tbody></table></div>
      <p class="note"><b>F</b> plays here as a full member, <b>A</b> as an affiliate. A gray label means the school has the sport but plays it in another conference (or as an independent).</p>`
        : `<p class="muted">No members yet.${cur ? ' Invite schools to join.' : ''}</p>`}
    </div>
    ${sponsors.length ? `<div class="card"><h2>Standings</h2><div class="row">${sponsors.filter(sp => Y.sports[sp]).map(sp => `<a class="btn" href="${sportHref(sp, 'standings')}">${esc(lg.sports[sp].name)}</a>`).join('') || `<span class="muted">Standings appear once the ${yearLabel(Y.year)} season starts.</span>`}</div></div>` : ''}
    ${log.length ? `<div class="card"><h2>History</h2><ul class="log">${log.map(e => `<li><span class="y">${yearLabel(e.year)}</span><span>${esc(e.text)}</span></li>`).join('')}</ul></div>` : ''}`;

  $('#edit')?.addEventListener('click', () => confForm(id));
  $('#add')?.addEventListener('click', () => addMembersForm(id));
  for (const b of $$('[data-leave]')) b.onclick = () => {
    const m = lg.memberships.find(x => x.id === b.dataset.leave);
    if (!confirm(`Remove ${lg.schools[m.school].short} from the ${c.name}, starting ${yearLabel(eff)}?`)) return;
    leaveConference(lg, m.id); changed();
  };
}
