// Home: where the year stands, the calendar of every sport, the buttons that
// move the year forward, and the latest results.

import { app, esc, VY, L, changed, toast, school, sportHref, gameCard, bindGameCards, confBadge } from './ui.js?v=20261030224435';
import { yearLabel, weekLabel, activeSports, conferencesIn, weekStart, curYear } from './league.js?v=20261030224435';
import { startSeason, simWeek, simUntil, startNextYear } from './season.js?v=20261030224435';
import { postStart, LAST_WEEK, TERMS } from './sports.js?v=20261030224435';

const WEEKS = LAST_WEEK + 2;

// Weeks after the regular season: conference tournaments, then each stage
// of the championship (a one-site bracket played a round a week takes longer).
function postWeeks(sport) {
  const st = sport.champ?.stages || [];
  return 1 + st.reduce((sum, s) => { let r = 0, n = 1; while (n < s.size) { n *= 2; r++; } return sum + (s.kind === 'single' ? Math.ceil(r / (s.roundsPerWeek || 99)) : 1); }, 0);
}

function calendar(lg, Y, sports) {
  const pos = w => `${((w - 1) / WEEKS) * 100}%`;
  const months = [];
  for (let m = 0; m < 10; m++) {
    const d = new Date(Date.UTC(Y.year + (m + 8 >= 12 ? 1 : 0), (m + 8) % 12, 1));
    const w = (d - weekStart(Y.year, 1)) / (7 * 864e5) + 1;
    if (w >= 1) months.push(`<span style="left:${pos(w)}">${d.toLocaleString('en', { month: 'short', timeZone: 'UTC' })}</span>`);
  }
  const now = Y.phase === 'season' ? `<div class="now" style="left:${pos(Y.week)}"></div>` : '';
  const rows = sports.map(s => {
    const ps = s.season[1] + 1, pe = ps + postWeeks(s);
    return `<div class="lab"><a href="${sportHref(s.id)}">${esc(s.name)}</a></div><div class="track">
      <div class="seg reg" style="left:${pos(s.season[0])};width:calc(${pos(s.season[1] + 1)} - ${pos(s.season[0])})" title="Regular season"></div>
      <div class="seg post" style="left:${pos(ps)};width:calc(${pos(pe)} - ${pos(ps)})" title="Championship"></div>${now}</div>`;
  }).join('');
  return `<div class="cal"><div></div><div class="months">${months.join('')}</div>${rows}</div>`;
}

// What's waiting for the commissioner this week: conference tournaments that
// can still be edited, and fields to pick.
function postNotes(lg, Y) {
  const notes = [];
  for (const [id, ss] of Object.entries(Y.sports)) {
    const sp = lg.sports[id];
    if (ss.sel && ss.sel.status !== 'announced') notes.push(`<a href="${sportHref(id, 'selection')}">${esc(sp.name)}: the field is ready to pick</a>; it's announced when ${esc(weekLabel(Y.year, (ss.regEnd ?? sp.season[1]) + 2))} is played.`);
    else if (ss.ct && Object.values(ss.ct).some(e => !e.started) && !ss.sel) notes.push(`<a href="${sportHref(id, 'tournaments')}">${esc(sp.name)}: conference tournaments are drawn</a> and can be changed until they start.`);
  }
  return notes.length ? `<div class="card"><h2>Postseason</h2><ul class="log">${notes.map(n => `<li>${n}</li>`).join('')}</ul></div>` : '';
}

export function renderHome() {
  const lg = L(), Y = VY(), cur = Y.year === lg.currentYear;
  const sports = activeSports(lg).sort((a, b) => a.season[0] - b.season[0] || a.name.localeCompare(b.name));
  const confs = conferencesIn(lg, Y.year);
  const programs = Object.values(lg.programs).filter(p => p.from <= Y.year && (p.to == null || p.to > Y.year) && lg.sports[p.sport]?.active).length;

  let actions = '';
  if (!cur) actions = `<div class="hint">You're looking at a past year. Pick ${yearLabel(lg.currentYear)} at the top to keep playing.</div>`;
  else if (Y.phase === 'preseason') actions = `<div class="hint">Preseason. Build conferences, move schools and add or drop programs now and it all counts for ${yearLabel(Y.year)}. Starting the season locks in teams, conferences and schedules for the year.</div>
    <div class="row"><button class="btn primary" id="start">Start the ${yearLabel(Y.year)} season</button></div>`;
  else if (Y.phase === 'season') {
    const fallDone = sports.filter(s => s.term === 'fall').every(s => !Y.sports[s.id] || Y.sports[s.id].done);
    const winterDone = sports.filter(s => s.term !== 'spring').every(s => !Y.sports[s.id] || Y.sports[s.id].done);
    actions = `<div class="row"><button class="btn primary" id="week">Play ${esc(weekLabel(Y.year, Y.week))}</button>
      <button class="btn" id="four">Play 4 weeks</button>
      ${!fallDone ? '<button class="btn" id="fall">Play through fall</button>' : !winterDone ? '<button class="btn" id="winter">Play through winter</button>' : ''}
      <button class="btn" id="all">Play the rest of the year</button></div>
      <p class="note">Realignment and program changes made during the season take effect in ${yearLabel(Y.year + 1)}.</p>`;
  } else actions = `<div class="banner"><div class="trophy">🏆</div><div><div class="big">${yearLabel(Y.year)} is complete</div><div>Every championship has been decided.</div></div><div class="spacer"></div><button class="btn primary" id="next">Start ${yearLabel(Y.year + 1)}</button></div>`;

  const lastWeek = Y.phase === 'complete' ? Math.max(0, ...Object.values(Y.sports).flatMap(s => s.games.map(g => g.w))) : Y.week - 1;
  const recent = Object.entries(Y.sports).map(([id, ss]) => [lg.sports[id], ss, ss.games.filter(g => g.w === lastWeek && g.hs != null)]).filter(([, , gs]) => gs.length);
  const champs = Object.entries(Y.sports).filter(([, ss]) => ss.champion);

  app.innerHTML = `
    <div class="section-head"><h1>${yearLabel(Y.year)}</h1><span class="muted">${Y.phase === 'preseason' ? 'Preseason' : Y.phase === 'season' ? `Next up: ${esc(weekLabel(Y.year, Y.week))}` : 'Year complete'}</span></div>
    <div class="kpis">
      <div class="kpi"><div class="v">${Object.keys(lg.schools).length}</div><div class="l">Member schools</div></div>
      <div class="kpi"><div class="v">${sports.length}</div><div class="l">Sports being played</div></div>
      <div class="kpi"><div class="v">${programs}</div><div class="l">Programs</div></div>
      <div class="kpi"><div class="v">${confs.length}</div><div class="l">Conferences</div></div>
    </div>
    <div class="card stack">${actions}</div>
    ${cur && Y.phase === 'season' ? postNotes(lg, Y) : ''}
    ${!confs.length && cur && Y.phase === 'preseason' ? `<div class="card"><h2>No conferences yet</h2><p>The AAU starts with a blank map. Go to <a href="#/conferences">Conferences</a> to found the first ones and invite members. Teams without a conference play a full independent schedule.</p></div>` : ''}
    ${champs.length ? `<div class="card"><h2>Champions</h2><table><tbody>${champs.map(([id, ss]) => `<tr><td><a href="${sportHref(id, 'championship')}">${esc(lg.sports[id].name)}</a></td><td>${school(ss.champion)}</td><td>${confBadge(ss.conf[ss.champion])}</td></tr>`).join('')}</tbody></table></div>` : ''}
    <div class="card"><h2>Calendar</h2><p class="note">Blue is the regular season, gold the conference tournaments and national championship.${Y.phase === 'season' ? ' The red line is this week.' : ''}</p>${calendar(lg, Y, sports)}</div>
    ${recent.length ? `<div class="card"><h2>Results · ${esc(weekLabel(Y.year, lastWeek))}</h2>${recent.map(([sport, ss, gs]) => `
      <div class="section-head" style="margin-top:14px"><h3><a href="${sportHref(sport.id, 'schedule')}">${esc(sport.name)}</a></h3><span class="muted small">${gs.length} game${gs.length > 1 ? 's' : ''}${gs.length > 6 ? ', showing 6' : ''}</span></div>
      <div class="games">${gs.slice(-6).map(g => gameCard(sport, ss, g)).join('')}</div>`).join('')}</div>` : ''}
    <div class="card"><h2>Sports by season</h2><div class="grid narrow">${Object.entries(TERMS).map(([t, label]) => `<div><h3>${label}</h3>${Object.values(lg.sports).filter(s => s.term === t).map(s => `<div>${s.active ? `<a href="${sportHref(s.id)}">${esc(s.name)}</a>` : `<span class="muted">${esc(s.name)}</span> <span class="pill">off</span>`}</div>`).join('')}</div>`).join('')}</div>
      <p class="note">Turn sports on in <a href="#/settings">Settings</a>.</p></div>`;

  bindGameCards();
  const on = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = fn; };
  on('start', () => {
    if (!confs.length && !confirm('There are no conferences yet, so every team will play an independent schedule this year. Start anyway?')) return;
    startSeason(lg); toast(`${yearLabel(Y.year)} season started.`); changed();
  });
  on('week', () => { simWeek(lg); changed(); });
  on('four', () => { for (let i = 0; i < 4; i++) simWeek(lg); changed(); });
  const until = terms => { simUntil(lg, y => Object.entries(y.sports).filter(([id]) => terms.includes(lg.sports[id].term)).every(([, s]) => s.done)); changed(); };
  on('fall', () => until(['fall']));
  on('winter', () => until(['fall', 'winter']));
  on('all', () => { simUntil(lg, () => false); toast('Year complete.'); changed(); });
  on('next', () => { startNextYear(lg); toast(`Welcome to ${yearLabel(curYear(lg).year)}.`); changed(); });
}
