// History (champions and realignment log) and Settings (sports, rules,
// saving and loading).

import { app, esc, L, $, $$, changed, toast, school, sportHref, openModal, options, ctx, flushSave } from './ui.js?v=20261030222729';
import { yearLabel, addSport, addProgram, hasProgram, effectiveYear, newLeague, migrateLeague, seedSport } from './league.js?v=20261030222729';
import { MODELS, TERMS, GENDER } from './sports.js?v=20261030222729';
import { exportLeague, saveLeague, clearLeague } from './store.js?v=20261030222729';
import { FORM_LEVELS } from './season.js?v=20261030222729';

export function renderHistory() {
  const lg = L();
  const years = Object.keys(lg.years).map(Number).sort((a, b) => b - a);
  const sports = Object.values(lg.sports).filter(s => years.some(y => lg.years[y].sports[s.id]));
  const titles = {};
  for (const y of years) for (const [sid, ss] of Object.entries(lg.years[y].sports)) if (ss.champion) titles[ss.champion] = (titles[ss.champion] || 0) + 1;
  const leaders = Object.entries(titles).sort((a, b) => b[1] - a[1]).slice(0, 15);
  app.innerHTML = `<div class="section-head"><h1>History</h1></div>
    <div class="card"><h2>National champions</h2>${sports.length ? `<div class="table-wrap"><table><thead><tr><th>Year</th>${sports.map(s => `<th>${esc(s.name)}</th>`).join('')}</tr></thead><tbody>
      ${years.map(y => `<tr><td><b>${yearLabel(y)}</b></td>${sports.map(s => { const ss = lg.years[y].sports[s.id]; return `<td>${ss?.champion ? `<a href="#/sport/${s.id}/championship" data-year="${y}" style="text-decoration:none">${school(ss.champion, { link: false })}</a>` : '<span class="muted">—</span>'}</td>`; }).join('')}</tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">No championships played yet.</p>'}</div>
    ${leaders.length ? `<div class="card"><h2>Most national titles</h2><table><tbody>${leaders.map(([t, n]) => `<tr><td>${school(t)}</td><td class="num"><b>${n}</b></td></tr>`).join('')}</tbody></table></div>` : ''}
    <div class="card"><h2>Realignment and department news</h2>${lg.log.length ? `<ul class="log">${[...lg.log].reverse().map(e => `<li><span class="y">${yearLabel(e.year)}</span><span>${esc(e.text)}</span></li>`).join('')}</ul>` : '<p class="muted">Nothing yet.</p>'}</div>`;
  for (const a of $$('a[data-year]')) a.onclick = () => { lg.viewYear = Number(a.dataset.year); };
}

export function renderSettings() {
  const lg = L(), eff = effectiveYear(lg);
  const count = sid => Object.values(lg.programs).filter(p => p.sport === sid && p.from <= eff && (p.to == null || p.to > eff)).length;
  app.innerHTML = `<div class="section-head"><h1>Settings</h1></div>
    <div class="card stack"><h2>Dynasty</h2>
      <div class="form-grid">
        <label class="field">Name<input type="text" id="name" value="${esc(lg.name)}"></label>
        <label class="field">Teams a conference needs for an automatic bid<input type="number" id="automin" min="2" max="20" value="${lg.settings.autoMin}"></label>
        <label class="field">How much ratings move during a season<select id="form">${options(Object.keys(FORM_LEVELS).map(k => [k, k[0].toUpperCase() + k.slice(1)]), lg.settings.form)}</select></label>
      </div></div>
    <div class="card"><div class="section-head"><h2>Sports</h2><div class="spacer"></div><button class="btn" id="newsport">Add a sport</button></div>
      <p class="note">Turning a sport on gives a program to every school that has that sport in real life, and it's played from the next season that starts (this year if it's still the preseason). Turning it off keeps its programs. Ratings for sports other than football, women's basketball and softball are estimates for now.</p>
      <div class="table-wrap"><table><thead><tr><th>Sport</th><th>Season</th><th>Game model</th><th class="num">Programs ${yearLabel(eff)}</th><th>Played</th><th></th></tr></thead><tbody>
      ${Object.values(lg.sports).sort((a, b) => Object.keys(TERMS).indexOf(a.term) - Object.keys(TERMS).indexOf(b.term) || a.name.localeCompare(b.name)).map(s => `<tr>
        <td>${s.active ? `<a href="${sportHref(s.id)}">${esc(s.name)}</a>` : esc(s.name)}${s.custom ? ' <span class="pill">custom</span>' : ''}</td><td>${TERMS[s.term]}</td><td class="small">${esc(MODELS[s.model].split(' (')[0])}</td>
        <td class="num">${count(s.id)}</td>
        <td><label class="check"><input type="checkbox" data-active="${s.id}" ${s.active ? 'checked' : ''}> ${s.active ? 'On' : 'Off'}</label></td>
        <td class="num"><button class="btn sm" data-bulk="${s.id}">Add programs</button> <button class="btn sm" data-rules="${s.id}">Rules</button></td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="card stack"><h2>Save and load</h2>
      <p class="note">The dynasty saves in this browser automatically. Download a backup to keep it safe or move it to another device.</p>
      <div class="row"><button class="btn" id="export">Download backup</button><label class="btn">Load a backup<input type="file" id="import" accept=".json,application/json" hidden></label><div class="spacer"></div><button class="btn danger" id="reset">Start over</button></div></div>`;

  $('#name').onchange = e => { lg.name = e.target.value.trim() || 'AAU Dynasty'; changed(); };
  $('#automin').onchange = e => { lg.settings.autoMin = Math.max(2, Number(e.target.value) || 6); changed(); };
  $('#form').onchange = e => { lg.settings.form = e.target.value; changed(); };
  for (const b of $$('[data-active]')) b.onchange = () => {
    const s = lg.sports[b.dataset.active]; s.active = b.checked;
    if (b.checked) {
      // Schools that have the sport in real life get their programs.
      const added = seedSport(lg, s.id);
      const when = eff === lg.currentYear ? 'this year' : `from ${yearLabel(eff)}`;
      toast(`${s.name} is on${added ? ` with ${added} program${added === 1 ? '' : 's'} (${when})` : count(s.id) ? '' : '. No school has it yet: add programs'}.`);
    } else toast(`${s.name} is off. Its programs and history stay.`);
    changed();
  };
  for (const b of $$('[data-bulk]')) b.onclick = () => bulkPrograms(b.dataset.bulk);
  for (const b of $$('[data-rules]')) b.onclick = () => rulesForm(b.dataset.rules);
  $('#newsport').onclick = newSportForm;
  $('#export').onclick = async () => { await flushSave(); exportLeague(lg); };
  $('#import').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.years || !data.schools) throw new Error('That file isn\'t an AAU Dynasty backup.');
      if (!confirm(`Replace this dynasty with "${data.name}" (${yearLabel(data.currentYear)})?`)) return;
      migrateLeague(data); ctx.league = data; await saveLeague(data); toast('Backup loaded.'); location.hash = '#/home'; changed();
    } catch (err) { toast(err.message, true); }
  };
  $('#reset').onclick = async () => {
    if (!confirm('Start a brand-new dynasty? This one is deleted from this browser (download a backup first if you want to keep it).')) return;
    await clearLeague(); ctx.league = newLeague(); await saveLeague(ctx.league); location.hash = '#/home'; changed();
  };
}

function bulkPrograms(sid) {
  const lg = L(), sp = lg.sports[sid], eff = effectiveYear(lg);
  const list = Object.values(lg.schools).filter(s => !hasProgram(lg, s.id, sid, eff)).sort((a, b) => a.short.localeCompare(b.short));
  openModal(`<div class="modal-head"><h2>Add ${esc(sp.name)} programs</h2><button class="btn ghost" data-close>Cancel</button></div>
    <div class="modal-body stack">
      <p class="note">Every school you pick gets a ${esc(sp.name)} program starting ${yearLabel(eff)}, at the rating below (change individual teams afterwards on the sport's Teams tab).</p>
      <div class="row"><label class="field">Starting rating<input type="number" id="r" value="55" min="25" max="99"></label><button class="btn sm" id="all">Select all</button><button class="btn sm" id="none">Clear</button></div>
      <div class="multi" id="schools">${list.map(s => `<label class="check"><input type="checkbox" value="${s.id}"> ${esc(s.short)}</label>`).join('') || '<span class="muted">Every school already has this sport.</span>'}</div>
    </div>
    <div class="modal-foot"><button class="btn primary" id="go">Add programs</button></div>`, m => {
    $('#all', m).onclick = () => $$('#schools input', m).forEach(x => (x.checked = true));
    $('#none', m).onclick = () => $$('#schools input', m).forEach(x => (x.checked = false));
    $('#go', m).onclick = () => {
      const picks = $$('#schools input:checked', m).map(x => x.value), r = Number($('#r', m).value) || 55;
      for (const s of picks) addProgram(lg, s, sid, { off: r, def: r });
      m.close(); toast(`${picks.length} ${sp.name} program${picks.length === 1 ? '' : 's'} added.`); changed();
    };
  });
}

function rulesForm(sid) {
  const lg = L(), s = lg.sports[sid];
  const n = (id, label, v, min = 1, max = 99) => `<label class="field">${label}<input type="number" id="${id}" value="${v}" min="${min}" max="${max}"></label>`;
  openModal(`<div class="modal-head"><h2>${esc(s.name)} rules</h2><button class="btn ghost" data-close>Cancel</button></div>
    <div class="modal-body stack">
      <div class="form-grid">
        ${n('s0', 'First week', s.season[0], 1, 46)}${n('s1', 'Last regular-season week', s.season[1], 1, 46)}
        ${n('games', 'Games per team', s.games, 1, 80)}${n('conf', 'Conference games', s.confGames, 0, 60)}
        ${n('field', 'Championship field', s.post.field, 2, 64)}${n('series', 'Games per round (1 or 3)', s.post.series, 1, 5)}
        ${n('neutral', 'Neutral sites from round', s.post.neutralFrom, 1, 7)}${n('perweek', 'Rounds per week', s.post.perWeek, 1, 6)}
      </div>
      <p class="note">Changes apply to the next season that starts. Week 1 is the last week of August.</p>
    </div>
    <div class="modal-foot"><button class="btn primary" id="go">Save</button></div>`, m => {
    $('#go', m).onclick = () => {
      const v = id => Number($(`#${id}`, m).value);
      if (v('s1') < v('s0')) return toast('The season has to end after it starts.', true);
      s.season = [v('s0'), v('s1')]; s.games = v('games'); s.confGames = v('conf');
      Object.assign(s.post, { field: v('field'), series: v('series') % 2 ? v('series') : v('series') + 1, neutralFrom: v('neutral'), perWeek: v('perweek') });
      m.close(); changed();
    };
  });
}

function newSportForm() {
  const lg = L();
  const bases = Object.values(lg.sports).map(s => [s.id, `${s.name} (${MODELS[s.model].split(' (')[0]})`]);
  openModal(`<div class="modal-head"><h2>Add a sport</h2><button class="btn ghost" data-close>Cancel</button></div>
    <div class="modal-body stack">
      <p class="note">A new sport copies the game model, calendar and championship of an existing one. Change the details afterwards with Rules.</p>
      <div class="form-grid">
        <label class="field">Name<input type="text" id="nm" placeholder="Women's Rugby"></label>
        <label class="field">Plays like<select id="base">${options(bases, 'wsoc')}</select></label>
        <label class="field">Gender<select id="g">${options(Object.entries(GENDER), 'W')}</select></label>
        <label class="field">Season<select id="term">${options(Object.entries(TERMS), 'fall')}</select></label>
      </div>
    </div>
    <div class="modal-foot"><button class="btn primary" id="go">Add sport</button></div>`, m => {
    $('#go', m).onclick = () => {
      const name = $('#nm', m).value.trim();
      if (!name) return toast('Name the sport.', true);
      try { addSport(lg, $('#base', m).value, { name, gender: $('#g', m).value, term: $('#term', m).value }); }
      catch (e) { return toast(e.message, true); }
      m.close(); toast(`${name} added. Give schools programs with "Add programs".`); changed();
    };
  });
}
