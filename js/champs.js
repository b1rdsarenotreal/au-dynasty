// The postseason for one sport and year:
//
//   regular season ends (week season[1])
//   → conference tournaments are drawn, editable until their first game
//   → conference tournament week (season[1] + 1)
//   → selection opens: automatic qualifiers, the committee's at-large picks
//     and seeds, all editable until the field is announced
//   → the national championship, stage by stage, from season[1] + 2
//
// A sport's format (Settings → Championship) is copied into the season when
// its field is announced, so later edits apply from the next season.

import { createEvent, pendingMatchups, matchupLength, recordMatchup, advanceEvent, advancers, gameSite, roundLabel } from './events.js?v=20261030224435';
import { committeePicks, seedOrder, teamSheets } from './selection.js?v=20261030224435';
import { confStandings, confChampion, records, rpi } from './standings.js?v=20261030224435';
import { bracketOrder } from './postseason.js?v=20261030224435';
import { defaultFormat, defaultConfTourney, checkFormat } from './formats.js?v=20261030224435';
import { play, winner } from './game.js?v=20261030224435';
import { shuffle } from './util.js?v=20261030224435';

export const confWeek = sport => sport.season[1] + 1;
export const natlWeek = sport => sport.season[1] + 2;

export function ensureChamp(sport) {
  if (!sport.champ) sport.champ = { autoMin: 6, rule500: true, ...defaultFormat(sport.id) };
  sport.champ.autoMin ??= 6; sport.champ.rule500 ??= true;
  if (!sport.confT) sport.confT = defaultConfTourney(sport.id);
  return sport.champ;
}

// A conference's tournament settings for a sport: its own if set, else the
// sport's default.
export function confTourneySettings(L, conf, sportId) {
  const sport = L.sports[sportId];
  ensureChamp(sport);
  return { ...sport.confT, ...(L.conferences[conf]?.tourney?.[sportId] || {}) };
}

// ------------------------------------------------------------ playing games
export function playEvent(L, sport, ss, ev, week, r, rate, tag) {
  let rounds = 0;
  const gameById = id => ss.games.find(g => g.id === id);
  while (!ev.done && rounds < ev.roundsPerWeek) {
    const pend = pendingMatchups(ev);
    if (!pend.length) { if (advanceEvent(ev, gameById)) { rounds++; continue; } break; }
    for (const m of pend) {
      const len = matchupLength(ev, m);
      const ids = [];
      let wa = 0, wb = 0, n = 0;
      while (len.fixed ? n < len.fixed : wa < len.need && wb < len.need) {
        n++;
        const where = gameSite(ev, m, L.schools);
        const total = len.fixed || len.max;
        const g = { id: ss.nextId++, w: week, s: 9, n: total > 1 ? n : 0, h: where.home, a: where.away, c: '', neu: where.neu, site: where.site, ev: ev.id, rd: roundLabel(ev, m), ...tag };
        Object.assign(g, play(sport, ss.teams[g.h], ss.teams[g.a], { neutral: g.neu, playoff: ev.kind !== 'pool', r }));
        ss.games.push(g);
        rate(g);
        ids.push(g.id);
        const w = winner(g);
        if (w) { if ((w === 'home' ? g.h : g.a) === m.a) wa++; else wb++; }
      }
      recordMatchup(ev, m, ev.kind === 'pool' ? null : wa > wb ? m.a : m.b, ids);
    }
  }
  // Finish a round that just completed (so the bracket shows what's next).
  advanceEvent(ev, gameById);
}

// ----------------------------------------------------- conference tournaments
export function drawConfTourneys(L, sport, ss, year) {
  ss.ct = {};
  const groups = confStandings(ss);
  for (const [conf, order] of Object.entries(groups)) {
    if (!conf || order.length < 2 || !L.conferences[conf]) continue;
    const set = confTourneySettings(L, conf, sport.id);
    const size = Math.min(set.size || 0, order.length);
    if (size < 2) continue;
    ss.ct[conf] = makeConfEvent(L, sport, ss, conf, order.slice(0, size), set, year);
  }
}

function makeConfEvent(L, sport, ss, conf, teams, set, year) {
  let host = null;
  if (set.hosting === 'school') host = set.host && ss.teams[set.host] ? set.host : null;
  if (set.hosting === 'rotate' || (set.hosting === 'school' && !host)) {
    const members = Object.keys(ss.teams).filter(t => ss.conf[t] === conf);
    const last = L.years[year - 1]?.sports?.[sport.id]?.ct?.[conf]?.host;
    host = shuffle(members.filter(t => t !== last))[0] || members[0];
  }
  return createEvent({
    id: `${sport.id}-ct-${conf}`, name: `${L.conferences[conf].name} Tournament`, teams,
    kind: set.kind, bestOf: set.bestOf, finalBestOf: set.finalBestOf || set.bestOf, ifNecessary: !!set.ifNecessary,
    gpm: set.gpm || 1, advance: 1, hosting: set.hosting === 'rotate' ? 'school' : set.hosting, host,
    venues: set.venue ? [set.venue] : [], campusRounds: set.campusRounds || 0,
  });
}

// Redraw one conference's tournament with new settings or seeds (only before
// its first game).
export function redrawConfTourney(L, sport, ss, conf, { teams, set } = {}) {
  const ev = ss.ct?.[conf];
  if (ev?.started) return false;
  const s = set || confTourneySettings(L, conf, sport.id);
  const order = confStandings(ss)[conf] || [];
  const list = teams || order.slice(0, Math.min(s.size, order.length));
  if (list.length < 2) { delete ss.ct[conf]; return true; }
  const keepHost = ev && s.hosting === 'rotate' ? ev.host : null;
  ss.ct[conf] = makeConfEvent(L, sport, ss, conf, list, s, L.viewYear ?? L.currentYear);
  if (keepHost) { ss.ct[conf].host = keepHost; }
  return true;
}

// -------------------------------------------------------------------- bids
export function autoBids(L, sport, ss) {
  const champ = ensureChamp(sport);
  const groups = confStandings(ss);
  const out = [];
  for (const [conf, members] of Object.entries(groups)) {
    if (!conf || members.length < champ.autoMin) continue;
    const ev = ss.ct?.[conf];
    if (ev?.done && ev.winner) out.push({ school: ev.winner, conf, how: 'Tournament champion' });
    else { const c = confChampion(ss, conf, groups); if (c) out.push({ school: c, conf, how: 'Regular-season champion' }); }
  }
  return out;
}

export function regTitles(ss) {
  const groups = confStandings(ss), out = new Set();
  for (const conf of Object.keys(groups)) { const c = confChampion(ss, conf, groups); if (c) out.add(c); }
  return out;
}

// ---------------------------------------------------------------- selection
export function openSelection(L, sport, ss) {
  const champ = ensureChamp(sport);
  const field = Math.min(champ.field, Object.keys(ss.teams).length);
  const auto = autoBids(L, sport, ss);
  const picks = committeePicks(ss, field, auto, regTitles(ss));
  ss.sel = { status: 'open', field, auto: picks.autoList, atLarge: picks.atLarge, committee: picks.atLarge, seeds: null, committeeSeeds: null };
}

export function selectionData(L, sport, ss) {
  const auto = new Set(ss.sel.auto.map(a => a.school));
  const sheets = teamSheets(ss, { regTitles: regTitles(ss), autoBids: auto });
  return { sheets, auto };
}

export function confirmTeams(L, sport, ss) {
  const { sheets } = selectionData(L, sport, ss);
  const field = [...ss.sel.auto.map(a => a.school), ...ss.sel.atLarge];
  ss.sel.committeeSeeds = seedOrder(field, sheets);
  ss.sel.seeds = [...ss.sel.committeeSeeds];
  ss.sel.status = 'seeded';
}

export function announce(L, sport, ss, week) {
  if (ss.sel.status === 'open') confirmTeams(L, sport, ss);
  const fmt = structuredClone(ensureChamp(sport));
  // A format that doesn't fit this field falls back to one bracket.
  if (checkFormat({ ...fmt, field: ss.sel.seeds.length }).length) {
    fmt.stages = [{ ...defaultFormat('x').stages[0], name: 'National Championship', size: ss.sel.seeds.length }];
  }
  fmt.field = ss.sel.seeds.length;
  ss.sel.status = 'announced';
  ss.natl = { fmt, seeds: Object.fromEntries(ss.sel.seeds.map((t, i) => [t, i + 1])), stages: [], cur: 0, champion: null };
  buildStage(L, sport, ss, 0, ss.sel.seeds, week);
}

// Place teams into a stage's sites. `incoming` is the ordered list of teams
// arriving; `fromGroups` (for later stages) is the previous stage's site
// winners in site order.
function buildStage(L, sport, ss, idx, incoming, week, fromGroups = null) {
  const st = ss.natl.fmt.stages[idx];
  const seeds = ss.natl.seeds;
  const G = st.groups;
  let sites = Array.from({ length: G }, () => []);
  if (fromGroups && fromGroups.length === G * st.size) {
    // Each site sent one team. First-stage sites are in seed order, so pair
    // them in bracket order (the 1 seed's site meets the last host's); later
    // stages are already in bracket order, so neighbors meet.
    const order = idx === 1 ? bracketOrder(fromGroups.length) : fromGroups.map((_, i) => i + 1);
    order.forEach((pos, i) => sites[Math.floor(i / st.size)].push(fromGroups[pos - 1]));
  } else {
    const list = [...incoming].sort((a, b) => seeds[a] - seeds[b]);
    list.forEach((t, i) => { const row = Math.floor(i / G), col = i % G; sites[row % 2 ? G - 1 - col : col].push(t); });
  }
  sites = sites.map(s => s.sort((a, b) => seeds[a] - seeds[b]));
  const stage = { name: st.name, label: st.label, startWeek: week, groups: [] };
  sites.forEach((teams, g) => {
    const venues = G > 1 ? [st.venues[g] || st.venues[st.venues.length - 1]].filter(Boolean) : st.venues;
    let name = st.name;
    if (G > 1) {
      const sharedVenue = new Set(st.venues.map(v => v.name)).size <= 1;
      const letter = String.fromCharCode(65 + g);
      if (st.hosting === 'topSeed') { const h = L.schools[teams[0]]; name = `${h?.city || h?.short} ${st.label || 'Site'}`; }
      else if (st.hosting === 'venue' && !sharedVenue && venues[0]?.city) name = `${venues[0].city.split(',')[0]} ${st.label || 'Site'}`;
      else name = `${st.label || 'Site'} ${G <= 8 ? letter : g + 1}`;
    }
    stage.groups.push(createEvent({
      id: `${sport.id}-n${idx}-${g}`, name, teams, seeds: Object.fromEntries(teams.map(t => [t, seeds[t]])),
      kind: st.kind, bestOf: st.bestOf, finalBestOf: st.finalBestOf, ifNecessary: st.ifNecessary, gpm: st.gpm,
      advance: st.kind === 'pool' ? st.advance : 1, hosting: st.hosting, venues, campusRounds: st.campusRounds, roundsPerWeek: st.roundsPerWeek,
    }));
  });
  ss.natl.stages[idx] = stage;
  ss.natl.cur = idx;
}

// Play this week's national championship games.
export function playNational(L, sport, ss, week, r, rate) {
  const n = ss.natl;
  if (!n || n.champion) return;
  const stage = n.stages[n.cur];
  if (stage.startWeek > week) return;
  for (const ev of stage.groups) playEvent(L, sport, ss, ev, week, r, rate, { p: n.cur + 1 });
  if (!stage.groups.every(ev => ev.done)) return;
  stage.done = true;
  if (n.cur === n.fmt.stages.length - 1) {
    n.champion = stage.groups[0].winner;
    return;
  }
  const allSingle = stage.groups.every(ev => ev.kind !== 'pool');
  const winners = stage.groups.map(ev => ev.winner);
  const incoming = stage.groups.flatMap(ev => advancers(ev));
  buildStage(L, sport, ss, n.cur + 1, incoming, week + 1, allSingle ? winners : null);
}

// Where a team's championship ended, e.g. "Austin Regional · out in
// Elimination bracket" or "Champion".
export function finishOf(ss, team) {
  const n = ss.natl;
  if (!n || !n.seeds[team]) return null;
  if (n.champion === team) return 'National champion';
  for (let i = n.stages.length - 1; i >= 0; i--) {
    const ev = n.stages[i]?.groups.find(e => e.teams.includes(team));
    if (!ev) continue;
    if (!ev.done) return `${ev.name} (in progress)`;
    const still = advancers(ev).includes(team);
    if (still && i < n.stages.length - 1) continue;
    return `${ev.name}`;
  }
  return null;
}
