// Tournament engine. One "event" is one bracket or pool: a conference
// tournament, a regional, a pod, a World Series bracket, a championship
// series. Every format is built from the same parts:
//
//   single   single elimination (byes for top seeds when the field isn't a
//            power of two); each round a single game or a best-of-N series
//   double   double elimination: teams are out after two losses. Winners and
//            losers are paired each round by how many losses they have, which
//            gives the classic NCAA regional (1v4, 2v3; winners meet, losers
//            meet; ...). The final can have an "if necessary" game.
//   playin   a single-elimination play-in for the low seeds, then double
//            elimination (as in MCS conference tournaments)
//   pool     round robin; the top `advance` teams move on
//
// An event only knows its teams (in seed order) and settings. Games are made
// by the caller (season.js) from `pendingMatchups`, then reported back with
// `recordGame`.

import { bracketOrder } from './postseason.js?v=20261030224435';
import { roundRobin } from './schedule.js?v=20261030224435';

export const EVENT_KINDS = {
  single: 'Single elimination',
  double: 'Double elimination',
  playin: 'Play-in, then double elimination',
  pool: 'Pool play (round robin)',
};
export const HOSTING = {
  topSeed: 'Top seed hosts',
  higherSeed: 'Higher seed hosts each game',
  school: 'A school hosts',
  rotate: 'Rotates among schools (random each year)',
  venue: 'Neutral venue',
};

// opts: { id, name, teams (seed order), seeds {school: seed shown}, kind,
//   bestOf, finalBestOf, ifNecessary, gpm, advance, hosting, host, venues,
//   campusRounds, roundsPerWeek }
export function createEvent(opts) {
  const ev = {
    id: opts.id, name: opts.name || '', kind: opts.kind || 'single',
    teams: [...opts.teams], seeds: opts.seeds || Object.fromEntries(opts.teams.map((t, i) => [t, i + 1])),
    bestOf: opts.bestOf || 1, finalBestOf: opts.finalBestOf || opts.bestOf || 1, ifNecessary: opts.ifNecessary ?? true,
    gpm: opts.gpm || 1, advance: opts.advance || 1,
    hosting: opts.hosting || 'higherSeed', host: opts.host || null, venues: opts.venues || [],
    campusRounds: opts.campusRounds || 0, roundsPerWeek: opts.roundsPerWeek || 99,
    matchups: [], losses: {}, round: 0, done: false, winner: null, finish: [], started: false,
  };
  if (ev.kind === 'playin' && ev.teams.length < 5) ev.kind = 'double';
  if (ev.teams.length < 2) { ev.done = true; ev.winner = ev.teams[0] || null; ev.finish = [...ev.teams]; return ev; }
  if (ev.hosting === 'topSeed') ev.host = ev.teams[0];
  start(ev);
  return ev;
}

const M = (ev, r, br, a, b, extra = {}) => ({ id: `${ev.id}-m${(ev.mseq = (ev.mseq || 0) + 1)}`, r, br, a, b, winner: null, games: [], ...extra });

function start(ev) {
  for (const t of ev.teams) ev.losses[t] = 0;
  ev.round = 1;
  if (ev.kind === 'single') {
    const n = ev.teams.length;
    let P = 1; while (P < n) P *= 2;
    const order = bracketOrder(P);
    const rounds = Math.log2(P);
    const first = [];
    for (let i = 0; i < P; i += 2) {
      const a = ev.teams[order[i] - 1] || null, b = ev.teams[order[i + 1] - 1] || null;
      first.push(M(ev, 1, 'W', a, b, { slot: i / 2, winner: a && !b ? a : b && !a ? b : null, bye: !(a && b) }));
    }
    ev.matchups.push(...first);
    for (let r = 2; r <= rounds; r++) for (let s = 0; s < P >> r; s++) ev.matchups.push(M(ev, r, 'W', null, null, { slot: s }));
    ev.rounds = rounds;
    fillSingle(ev);
  } else if (ev.kind === 'pool') {
    roundRobin(ev.teams).forEach((rd, i) => rd.forEach(([a, b]) => ev.matchups.push(M(ev, i + 1, 'P', a, b))));
    ev.rounds = Math.max(...ev.matchups.map(m => m.r));
  } else if (ev.kind === 'playin') {
    const n = ev.teams.length, target = n <= 8 ? 4 : 8, plays = Math.min(n - target, target);
    const byes = target - plays;
    const low = ev.teams.slice(byes);
    for (let i = 0; i < plays; i++) ev.matchups.push(M(ev, 1, 'PI', low[i], low[low.length - 1 - i]));
    ev.playinDone = false;
  } else nextDouble(ev);
}

// ------------------------------------------------------------------ single
function fillSingle(ev) {
  for (let r = 1; r < ev.rounds; r++) {
    for (const m of ev.matchups.filter(x => x.r === r && x.winner)) {
      const nx = ev.matchups.find(x => x.r === r + 1 && x.slot === m.slot >> 1);
      if (m.slot % 2) nx.b = m.winner; else nx.a = m.winner;
    }
  }
  const fin = ev.matchups.find(x => x.r === ev.rounds);
  if (fin?.winner) finishSingle(ev);
}
function finishSingle(ev) {
  ev.done = true;
  ev.winner = ev.matchups.find(x => x.r === ev.rounds).winner;
  // Finish order: champion, runner-up, then by round lost (better seed first).
  const out = [ev.winner];
  for (let r = ev.rounds; r >= 1; r--) {
    const lost = ev.matchups.filter(x => x.r === r && x.winner && !x.bye).map(x => (x.winner === x.a ? x.b : x.a)).filter(Boolean);
    out.push(...lost.sort((a, b) => ev.seeds[a] - ev.seeds[b]));
  }
  ev.finish = out;
}

// ------------------------------------------------------------------ double
function pairUp(list, ev) {
  const pool = [...list].sort((a, b) => ev.seeds[a] - ev.seeds[b]);
  const pairs = [];
  let bye = null;
  if (pool.length % 2) bye = pool.shift(); // best seed waits
  const met = new Set(ev.matchups.filter(m => m.winner).map(m => [m.a, m.b].sort().join('|')));
  while (pool.length) {
    const a = pool.shift();
    let j = pool.length - 1;
    for (let k = pool.length - 1; k >= 0; k--) if (!met.has([a, pool[k]].sort().join('|'))) { j = k; break; }
    const b = pool.splice(j, 1)[0];
    pairs.push([a, b]);
  }
  return { pairs, bye };
}

function nextDouble(ev) {
  const alive = ev.teams.filter(t => ev.losses[t] < 2);
  const zero = alive.filter(t => ev.losses[t] === 0), one = alive.filter(t => ev.losses[t] === 1);
  const r = ev.round;
  if (alive.length === 1) { finishDouble(ev, alive[0]); return; }
  const final = ev.matchups.find(m => m.br === 'F' && m.winner);
  if (final) {
    // The undefeated team lost the final: both have one loss.
    if (zero.length === 0 && one.length === 2 && ev.ifNecessary && !ev.matchups.some(m => m.br === 'F2')) {
      ev.matchups.push(M(ev, r, 'F2', final.winner, final.winner === final.a ? final.b : final.a));
      return;
    }
    finishDouble(ev, ev.matchups.filter(m => m.br === 'F' || m.br === 'F2').pop().winner);
    return;
  }
  if (zero.length === 1 && one.length === 1) { ev.matchups.push(M(ev, r, 'F', zero[0], one[0])); return; }
  if (zero.length === 0 && one.length === 2) { ev.matchups.push(M(ev, r, 'F', one[0], one[1])); return; }
  // First round of plain double elimination: bracket order, top seeds get byes.
  const firstRound = !ev.matchups.some(m => m.br === 'W' || m.br === 'L');
  if (firstRound && ev.kind === 'double') {
    const n = zero.length;
    let P = 1; while (P < n) P *= 2;
    const order = bracketOrder(P);
    const seeded = [...zero].sort((a, b) => ev.seeds[a] - ev.seeds[b]);
    for (let i = 0; i < P; i += 2) {
      const a = seeded[order[i] - 1], b = seeded[order[i + 1] - 1];
      if (a && b) ev.matchups.push(M(ev, r, 'W', a, b));
    }
    return;
  }
  const w = zero.length > 1 ? pairUp(zero, ev) : { pairs: [] };
  const l = one.length > 1 ? pairUp(one, ev) : { pairs: [] };
  w.pairs.forEach(([a, b]) => ev.matchups.push(M(ev, r, 'W', a, b)));
  l.pairs.forEach(([a, b]) => ev.matchups.push(M(ev, r, 'L', a, b)));
}

function finishDouble(ev, champ) {
  ev.done = true; ev.winner = champ;
  // Finish order: champion, then by when each team was eliminated (later is better).
  const outAt = {};
  for (const m of ev.matchups) if (m.winner && m.a && m.b) { const lo = m.winner === m.a ? m.b : m.a; if (ev.losses[lo] >= 2 || m.br === 'PI') outAt[lo] = Math.max(outAt[lo] || 0, m.r + (m.br === 'F' || m.br === 'F2' ? 0.5 : 0)); }
  ev.finish = [champ, ...ev.teams.filter(t => t !== champ).sort((a, b) => (outAt[b] || 0) - (outAt[a] || 0) || ev.seeds[a] - ev.seeds[b])];
}

// -------------------------------------------------------------------- pool
export function poolTable(ev, gameById) {
  const t = Object.fromEntries(ev.teams.map(x => [x, { team: x, w: 0, l: 0, tie: 0, pf: 0, pa: 0 }]));
  const h2h = {};
  for (const m of ev.matchups) for (const id of m.games) {
    const g = gameById(id); if (!g || g.hs == null) continue;
    const w = g.hs > g.as || g.so === 'home' ? g.h : g.as > g.hs || g.so === 'away' ? g.a : null;
    for (const [s, f, a] of [[g.h, g.hs, g.as], [g.a, g.as, g.hs]]) { t[s].pf += f; t[s].pa += a; if (!w) t[s].tie++; else if (w === s) t[s].w++; else t[s].l++; }
    if (w) h2h[`${w}>${w === g.h ? g.a : g.h}`] = (h2h[`${w}>${w === g.h ? g.a : g.h}`] || 0) + 1;
  }
  const pct = x => (x.w + x.l + x.tie ? (x.w + x.tie / 2) / (x.w + x.l + x.tie) : 0);
  return Object.values(t).sort((a, b) => pct(b) - pct(a) || (h2h[`${b.team}>${a.team}`] || 0) - (h2h[`${a.team}>${b.team}`] || 0) || (b.pf - b.pa) - (a.pf - a.pa) || ev.seeds[a.team] - ev.seeds[b.team]);
}

// ------------------------------------------------------------------ common
// Matchups ready to play now (both teams known, not decided), all from the
// current round.
export function pendingMatchups(ev) {
  if (ev.done) return [];
  const open = ev.matchups.filter(m => !m.winner && m.a && m.b && !(ev.kind === 'pool' && m.played));
  if (!open.length) return [];
  const r = Math.min(...open.map(m => m.r));
  return open.filter(m => m.r === r);
}

// Games a matchup needs: a series is best of N (first to N/2+1); pools play
// `gpm` games every time.
export function matchupLength(ev, m) {
  if (ev.kind === 'pool') return { fixed: ev.gpm };
  const last = (ev.kind === 'single' && m.r === ev.rounds) || m.br === 'F' || m.br === 'F2';
  const n = last ? ev.finalBestOf : ev.bestOf;
  return { need: Math.ceil(n / 2), max: n };
}

// Report a finished matchup: `winner` (null for a pool) and its game ids.
export function recordMatchup(ev, m, winner, gameIds) {
  ev.started = true;
  m.games.push(...gameIds);
  if (ev.kind === 'pool') m.played = true; else m.winner = winner;
  if (ev.kind === 'double' || ev.kind === 'playin') {
    const lo = winner === m.a ? m.b : m.a;
    if (m.br === 'PI') ev.losses[lo] = 2;
    else ev.losses[lo]++;
  }
}

// After a round is complete, set up the next one. Returns true if the event
// moved on.
export function advanceEvent(ev, gameById) {
  if (ev.done) return false;
  if (pendingMatchups(ev).length) return false;
  const cur = ev.matchups.filter(m => m.r === ev.round);
  if (cur.some(m => !(m.winner || m.played) && m.a && m.b)) return false;
  if (ev.kind === 'single') { ev.round++; fillSingle(ev); if (!ev.done && !pendingMatchups(ev).length) return advanceEvent(ev, gameById); return true; }
  if (ev.kind === 'pool') {
    ev.round++;
    if (ev.round > ev.rounds) { ev.done = true; ev.finish = poolTable(ev, gameById).map(x => x.team); ev.winner = ev.finish[0]; }
    return true;
  }
  ev.round++;
  nextDouble(ev);
  return true;
}

export const advancers = (ev) => (ev.kind === 'pool' ? ev.finish.slice(0, ev.advance) : ev.winner ? [ev.winner] : []);

// Where a game is played and who's at home. Returns { home, away, neu, site }
// where site = { name, city } or null (home team's campus).
export function gameSite(ev, m, schools) {
  const r = m.r;
  const [hi, lo] = (ev.seeds[m.a] ?? 99) <= (ev.seeds[m.b] ?? 99) ? [m.a, m.b] : [m.b, m.a];
  let mode = ev.hosting;
  if (r <= ev.campusRounds) mode = 'higherSeed';
  if (mode === 'venue') {
    const singleRounds = ev.kind === 'single' ? r - ev.campusRounds - 1 : 0;
    const v = ev.venues[Math.min(Math.max(0, singleRounds), ev.venues.length - 1)] || null;
    return { home: hi, away: lo, neu: true, site: v };
  }
  if (mode === 'higherSeed' || !ev.host) return { home: hi, away: lo, neu: false, site: null };
  const H = schools[ev.host];
  const site = { name: H ? `${H.short}` : ev.host, city: H ? `${H.city}${H.state ? `, ${H.state}` : ''}` : '' };
  if (m.a === ev.host || m.b === ev.host) return { home: ev.host, away: m.a === ev.host ? m.b : m.a, neu: false, site: null };
  return { home: hi, away: lo, neu: true, site };
}

export function roundLabel(ev, m) {
  if (ev.kind === 'pool') return `Pool round ${m.r}`;
  if (m.br === 'PI') return 'Play-in';
  if (m.br === 'F') return ev.kind === 'single' ? 'Final' : 'Championship';
  if (m.br === 'F2') return 'Championship (if necessary)';
  if (ev.kind === 'single') {
    const left = 2 ** (ev.rounds - m.r + 1);
    return { 2: 'Final', 4: 'Semifinals', 8: 'Quarterfinals' }[left] || `Round of ${left}`;
  }
  return m.br === 'W' ? 'Winners bracket' : 'Elimination bracket';
}
