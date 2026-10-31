// Sport pages: standings by conference, the schedule week by week, RPI
// rankings, the national championship bracket, and team ratings.

import { app, esc, VY, L, $, $$, changed, school, confBadge, sportHref, gameCard, bindGameCards, options, toast } from './ui.js?v=20261030224435';
import { programsIn, confOf, weekLabel, yearLabel, program } from './league.js?v=20261030224435';
import { records, rpi, rpiRanking, confStandings, fmtRec, winPct, fmtPct, ovrOf } from './standings.js?v=20261030224435';
import { selectField, roundName, seedOf } from './postseason.js?v=20261030224435';
import { winner } from './game.js?v=20261030224435';
import { postStart, MODELS, TERMS, GENDER } from './sports.js?v=20261030224435';
import { tourneysTab, selectionTab, championshipTab, bindChampPages } from './views-champ.js?v=20261030224435';
import { clamp } from './util.js?v=20261030224435';

const TABS = { standings: 'Standings', schedule: 'Schedule', rankings: 'Rankings', tournaments: 'Conf. tournaments', selection: 'Selection', championship: 'Championship', teams: 'Teams' };

export function renderSports() {
  const lg = L(), Y = VY();
  const card = s => {
    const ss = Y.sports[s.id], n = programsIn(lg, s.id, Y.year).length;
    const played = ss ? ss.games.filter(g => g.hs != null).length : 0;
    const status = ss?.champion ? `Champion: ${school(ss.champion)}` : ss ? `${played} of ${ss.games.length} games played` : Y.phase === 'preseason' ? 'Preseason' : 'Not played this year';
    return `<a class="card conf-card" href="${sportHref(s.id)}"><h3>${esc(s.name)}</h3><div class="muted small">${TERMS[s.term]} · ${n} programs · ${MODELS[s.model].split(' (')[0]}</div><div style="margin-top:8px">${status}</div></a>`;
  };
  const active = Object.values(lg.sports).filter(s => s.active), off = Object.values(lg.sports).filter(s => !s.active);
  app.innerHTML = `<div class="section-head"><h1>Sports</h1><span class="muted">${yearLabel(Y.year)}</span></div>
    ${Object.entries(TERMS).map(([t, label]) => { const l = active.filter(s => s.term === t); return l.length ? `<h2>${label}</h2><div class="grid narrow" style="margin-bottom:18px">${l.map(card).join('')}</div>` : ''; }).join('')}
    ${off.length ? `<div class="card"><h2>Not being played yet</h2><p class="muted">${off.map(s => esc(s.name)).join(' · ')}</p><p class="note">Turn a sport on in <a href="#/settings">Settings</a> and every school that has it in real life gets its program.</p></div>` : ''}`;
}

export function renderSport([id, tab = 'standings', arg]) {
  const lg = L(), Y = VY(), sport = lg.sports[id];
  if (!sport) { app.innerHTML = '<div class="empty">No such sport.</div>'; return; }
  const ss = Y.sports[id];
  if (!TABS[tab]) tab = 'standings';
  const head = `<div class="section-head"><h1>${esc(sport.name)}</h1><span class="muted">${yearLabel(Y.year)} · ${TERMS[sport.term]} · ${GENDER[sport.gender] || ''}</span></div>
    <div class="tabs">${Object.entries(TABS).map(([k, l]) => `<a href="${sportHref(id, k)}" class="${k === tab ? 'active' : ''}">${l}</a>`).join('')}</div>`;
  if (!ss && tab !== 'teams') {
    const fmt = tab === 'championship' && Y.year === lg.currentYear ? `<div class="row" style="justify-content:center;margin-top:10px"><button class="btn" data-fmt-edit="${id}">Edit the championship format</button></div>` : '';
    app.innerHTML = head + `<div class="card empty">${Y.phase === 'preseason' ? `The ${yearLabel(Y.year)} season hasn't started. Schedules are made when it does.` : `${esc(sport.name)} wasn't played in ${yearLabel(Y.year)}.`} <a href="${sportHref(id, 'teams')}">See the teams</a>.${fmt}</div>`;
    bindChampPages(lg, Y, sport, ss);
    return;
  }
  const champ = ss.post ? champTab : championshipTab;
  const body = { standings: standingsTab, schedule: scheduleTab, rankings: rankingsTab, tournaments: tourneysTab, selection: selectionTab, championship: champ, teams: teamsTab }[tab](lg, Y, sport, ss, arg);
  app.innerHTML = head + body;
  bindGameCards();
  bind[tab]?.(lg, Y, sport, ss);
  bindChampPages(lg, Y, sport, ss);
}

function standingsTab(lg, Y, sport, ss) {
  const rec = records(ss), r = rpi(ss), rank = rpiRanking(ss, rec, r), rk = Object.fromEntries(rank.map((t, i) => [t, i + 1]));
  const groups = confStandings(ss, rec, r);
  const keys = Object.keys(groups).sort((a, b) => (a === '') - (b === '') || (lg.conferences[a]?.name || '').localeCompare(lg.conferences[b]?.name || ''));
  const ties = Object.values(rec).some(x => x.t);
  return `<div class="grid wide">${keys.map(c => `<div class="card"><div class="section-head"><h2>${c ? esc(lg.conferences[c]?.name || c) : 'Independents'}</h2>${c ? confBadge(c) : ''}</div>
    <div class="table-wrap"><table><thead><tr><th>Team</th>${c ? `<th class="num">Conf</th><th class="num">Pct</th>` : ''}<th class="num">Overall</th><th class="num">Pct</th><th class="num">Strk</th><th class="num">RPI</th></tr></thead><tbody>
    ${groups[c].map(t => { const x = rec[t]; return `<tr><td>${school(t)}${ss.champion === t ? ' 🏆' : ''}</td>${c ? `<td class="num">${fmtRec(x.cw, x.cl, x.ct)}</td><td class="num">${fmtPct(winPct(x.cw, x.cl, x.ct))}</td>` : ''}<td class="num">${fmtRec(x.w, x.l, ties ? x.t : 0)}</td><td class="num">${fmtPct(winPct(x.w, x.l, x.t))}</td><td class="num">${x.streak || '–'}</td><td class="num">${x.w + x.l + x.t ? rk[t] : '–'}</td></tr>`; }).join('')}
    </tbody></table></div></div>`).join('')}</div>`;
}

function scheduleTab(lg, Y, sport, ss, arg) {
  const weeks = [...new Set(ss.games.map(g => g.w))].sort((a, b) => a - b);
  const playedWeeks = weeks.filter(w => ss.games.some(g => g.w === w && g.hs != null));
  let team = '';
  let w = Number(arg);
  if (arg && !weeks.includes(w)) { team = arg; w = null; }
  if (!team && !weeks.includes(w)) w = (Y.phase === 'season' && weeks.includes(Y.week) ? Y.week : playedWeeks[playedWeeks.length - 1]) ?? weeks[0];
  const teamList = Object.keys(ss.teams).sort((a, b) => lg.schools[a].short.localeCompare(lg.schools[b].short)).map(t => [t, lg.schools[t].short]);
  const games = team ? ss.games.filter(g => g.h === team || g.a === team) : ss.games.filter(g => g.w === w);
  const picker = `<div class="row" style="margin-bottom:12px"><label class="field">Team<select id="team-pick"><option value="">All teams, by week</option>${options(teamList, team)}</select></label></div>`;
  const chips = team ? '' : `<div class="chips">${weeks.map(x => `<a class="chip ${x === w ? 'active' : ''}" href="${sportHref(sport.id, 'schedule')}/${x}" title="${esc(weekLabel(Y.year, x))}">${x}</a>`).join('')}</div>`;
  if (team) {
    const rec = records(ss)[team];
    const byWeek = {};
    for (const g of games) (byWeek[g.w] ??= []).push(g);
    return picker + `<div class="card"><div class="section-head"><h2>${school(team)}</h2><span class="muted">${fmtRec(rec.w, rec.l, rec.t)} · ${confBadge(ss.conf[team])}</span></div>
      <div class="table-wrap"><table><thead><tr><th>Week</th><th>Opponent</th><th>Result</th></tr></thead><tbody>${games.map(g => {
        const home = g.h === team, opp = home ? g.a : g.h;
        const fin = g.hs != null, w2 = fin ? winner(g) : null, won = w2 === (home ? 'home' : 'away');
        const res = !fin ? '<span class="muted">—</span>' : `<b class="${won ? 'good' : w2 ? 'bad' : ''}">${won ? 'W' : w2 ? 'L' : 'T'}</b> ${home ? g.hs : g.as}-${home ? g.as : g.hs}${g.ot ? ' (OT)' : ''}`;
        return `<tr class="clickable" data-game="${g.id}" data-sport="${sport.id}"><td>${esc(weekLabel(Y.year, g.w))}</td><td>${g.neu ? 'vs.' : home ? 'vs.' : 'at'} ${school(opp, { link: false })} ${g.c ? confBadge(g.c, { link: false }) : ''}${g.p ? ' <span class="badge gold">Championship</span>' : ''}</td><td>${res}</td></tr>`;
      }).join('')}</tbody></table></div></div>`;
  }
  return picker + chips + `<div class="section-head"><h2>${esc(weekLabel(Y.year, w))}</h2><span class="muted">${games.length} games</span></div>
    ${games.length ? `<div class="games">${games.map(g => gameCard(sport, ss, g)).join('')}</div>` : '<div class="empty">No games this week.</div>'}`;
}

function rankingsTab(lg, Y, sport, ss) {
  const rec = records(ss), r = rpi(ss), rank = rpiRanking(ss, rec, r);
  const played = rank.filter(t => rec[t].w + rec[t].l + rec[t].t);
  if (!played.length) return '<div class="card empty">Rankings start after the first games.</div>';
  return `<div class="card"><p class="note">RPI: 25% winning percentage, 50% opponents' winning percentage, 25% opponents' opponents'. The national championship field is picked and seeded by it.</p>
    <div class="table-wrap"><table><thead><tr><th class="num">#</th><th>Team</th><th>Conf</th><th class="num">Record</th><th class="num">RPI</th><th class="num">OVR</th></tr></thead><tbody>
    ${played.map((t, i) => `<tr><td class="num">${i + 1}</td><td>${school(t)}</td><td>${confBadge(ss.conf[t])}</td><td class="num">${fmtRec(rec[t].w, rec[t].l, rec[t].t)}</td><td class="num">${r[t].toFixed(4)}</td><td class="num">${Math.round(ovrOf(ss, t))}</td></tr>`).join('')}
    </tbody></table></div></div>`;
}

function champTab(lg, Y, sport, ss) {
  const post = ss.post;
  if (!post) {
    const field = selectField(ss, sport, lg.settings.autoMin);
    return `<div class="card"><h2>Projected field</h2><p class="note">The field of ${sport.post.field} is picked after the regular season (${esc(weekLabel(Y.year, postStart(sport)))}): every conference with at least ${lg.settings.autoMin} teams in ${esc(sport.name)} sends its regular-season champion, and the best remaining teams by RPI fill it. ${sport.post.series > 1 ? `Rounds are best-of-${sport.post.series} series. ` : ''}${sport.post.neutralFrom > 1 ? `Higher seeds host the first ${sport.post.neutralFrom - 1 === 1 ? 'round' : `${sport.post.neutralFrom - 1} rounds`}; the rest are at neutral sites.` : 'Every round is at a neutral site.'}</p>
      ${fieldTable(lg, ss, field)}</div>`;
  }
  const rec = records(ss);
  const sc = (m) => {
    if (!m.games.length) return ['', ''];
    const gs = m.games.map(id => ss.games.find(g => g.id === id));
    if (gs.length === 1) { const g = gs[0]; return g.h === m.a ? [g.hs, g.as] : [g.as, g.hs]; }
    const wa = gs.filter(g => (winner(g) === 'home' ? g.h : g.a) === m.a).length;
    return [wa, gs.length - wa];
  };
  const side = (t, s, m) => !t ? `<div class="side l"><span class="seed"></span><span class="muted">${m.winner ? 'Bye' : 'TBD'}</span><span></span></div>`
    : `<div class="side ${m.winner ? (m.winner === t ? 'w' : 'l') : ''}"><span class="seed">${seedOf(post, t)}</span>${school(t, { link: false })}<span class="sc">${s}</span></div>`;
  const P = post.rounds[0].length * 2;
  const byes = post.rounds[0].some(m => !m.a || !m.b);
  const rounds = post.rounds.map((rd, i) => `<div class="round"><h3>${i === 0 && byes ? 'First round' : roundName(P >> i)}</h3><div class="ms">${rd.map(m => {
    const [sa, sb] = sc(m);
    return `<div class="match ${m.games.length ? 'click' : ''}" ${m.games.length ? `data-game="${m.games[m.games.length - 1]}" data-sport="${sport.id}"` : ''}>${side(m.a, sa, m)}${side(m.b, sb, m)}</div>`;
  }).join('')}</div></div>`).join('');
  return `${ss.champion ? `<div class="banner" style="margin-bottom:16px"><div class="trophy">🏆</div><div><div class="big">${esc(lg.schools[ss.champion].short)}</div><div>${yearLabel(Y.year)} ${esc(sport.name)} national champion · ${fmtRec(rec[ss.champion].w, rec[ss.champion].l, rec[ss.champion].t)}</div></div></div>` : ''}
    <div class="card"><div class="bracket">${rounds}</div></div>
    <div class="card"><h2>Field</h2>${fieldTable(lg, ss, post.field)}</div>`;
}

function fieldTable(lg, ss, field) {
  const rec = records(ss);
  if (!field.length) return '<div class="empty">Not enough teams for a championship.</div>';
  return `<div class="table-wrap"><table><thead><tr><th class="num">Seed</th><th>Team</th><th>Conf</th><th class="num">Record</th><th>Bid</th></tr></thead><tbody>
    ${field.map(f => `<tr><td class="num">${f.seed}</td><td>${school(f.school)}</td><td>${confBadge(ss.conf[f.school])}</td><td class="num">${fmtRec(rec[f.school].w, rec[f.school].l, rec[f.school].t)}</td><td>${f.auto ? '<span class="pill full">Automatic</span>' : '<span class="pill">At-large</span>'}</td></tr>`).join('')}
    </tbody></table></div>`;
}

// Teams and ratings. In the preseason the ratings edited are the programs'
// own; during a season they are this season's (and carry into next year).
function teamsTab(lg, Y, sport, ss) {
  const cur = Y.year === lg.currentYear;
  const rows = ss ? Object.keys(ss.teams).map(t => ({ t, conf: ss.conf[t], ...ss.teams[t] }))
    : programsIn(lg, sport.id, Y.year).map(p => ({ t: p.school, conf: confOf(lg, p.school, sport.id, Y.year), off: p.off, def: p.def }));
  rows.sort((a, b) => (b.off + b.def) - (a.off + a.def));
  const edit = cur;
  return `<div class="card"><p class="note">OFF is scoring, DEF is keeping the other team from scoring (pitching and defense in baseball and softball). OVR is the average. ${edit ? 'Edit a rating and press Enter or click away to save.' : ''}</p>
    <div class="table-wrap"><table class="dept"><thead><tr><th class="num">#</th><th>Team</th><th>Conf</th><th class="num">OFF</th><th class="num">DEF</th><th class="num">OVR</th><th>Level</th></tr></thead><tbody>
    ${rows.map((x, i) => `<tr><td class="num">${i + 1}</td><td>${school(x.t)}</td><td>${confBadge(x.conf)}</td>
      ${['off', 'def'].map(k => `<td class="num">${edit ? `<input class="rin" type="number" min="25" max="99" data-t="${x.t}" data-k="${k}" value="${Math.round(x[k])}">` : Math.round(x[k])}</td>`).join('')}
      <td class="num ovr">${Math.round((x.off + x.def) / 2)}</td><td class="small muted">${esc(program(lg, x.t, sport.id)?.level || '')}</td></tr>`).join('')}
    </tbody></table></div></div>`;
}

const bind = {
  schedule(lg, Y, sport) {
    const s = $('#team-pick');
    if (s) s.onchange = () => { location.hash = `${sportHref(sport.id, 'schedule')}${s.value ? `/${encodeURIComponent(s.value)}` : ''}`; };
  },
  teams(lg, Y, sport, ss) {
    for (const inp of $$('input.rin')) inp.onchange = () => {
      const v = clamp(Math.round(Number(inp.value)) || 0, 25, 99), t = inp.dataset.t, k = inp.dataset.k;
      const p = program(lg, t, sport.id);
      if (ss && ss.teams[t]) { const T = ss.teams[t]; T.base[k] += v - T[k]; T[k] = v; }
      if (p) p[k] = v;
      toast(`${lg.schools[t].short} ${k.toUpperCase()} set to ${v}.`);
      changed();
    };
  },
};
