// Schedule builder for one sport and year. It works the same for every sport:
//
// 1. The sport's calendar is cut into slots (a week can hold several; a slot
//    can be a single game or a series against one opponent).
// 2. Each conference plays round robins in the last slots of the season:
//    a partial round robin when the conference is large, a double one when
//    the conference-games target allows it.
// 3. Everyone's remaining games are filled with non-conference opponents,
//    earliest slots first, avoiding conference mates and repeat opponents.

import { slotGames } from './sports.js?v=20261030221621';
import { shuffle, rng as makeRng, hashStr } from './util.js?v=20261030221621';

export function buildSlots(sport) {
  const out = [];
  for (let w = sport.season[0]; w <= sport.season[1]; w++) {
    sport.slots.forEach((s, i) => out.push({ week: w, idx: i, n: slotGames(s), series: typeof s === 'object' }));
  }
  return out.map((s, i) => ({ ...s, i }));
}

// Circle-method round robin. Returns rounds of [home, away] pairs.
export function roundRobin(teams) {
  const t = [...teams];
  if (t.length % 2) t.push(null);
  const n = t.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let i = 0; i < n / 2; i++) {
      const a = t[i], b = t[n - 1 - i];
      if (a && b) round.push((r + i) % 2 ? [a, b] : [b, a]);
    }
    rounds.push(round);
    t.splice(1, 0, t.pop());
  }
  return rounds;
}

// teams: [school]; confOf: school -> conf id or null.
export function buildSchedule(sport, teams, confOf, { seed = 1, startId = 1 } = {}) {
  const r = makeRng(seed ^ hashStr(sport.id));
  const slots = buildSlots(sport);
  const main = sport.slots.findIndex(s => typeof s === 'object'); // conference series slot, if the sport has one
  const confSlots = slots.filter(s => main < 0 || s.idx === main);
  const perConfSlot = confSlots[0]?.n || 1;
  const busy = Object.fromEntries(teams.map(t => [t, new Set()]));
  const count = Object.fromEntries(teams.map(t => [t, 0]));
  const homeN = Object.fromEntries(teams.map(t => [t, 0]));
  const met = new Set(), pair = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const games = [];
  let id = startId;
  const add = (slot, h, a, conf) => {
    for (let k = 0; k < slot.n; k++) games.push({ id: id++, w: slot.week, s: slot.idx, n: slot.n > 1 ? k + 1 : 0, h, a, c: conf || '' });
    busy[h].add(slot.i); busy[a].add(slot.i);
    count[h] += slot.n; count[a] += slot.n; homeN[h] += slot.n;
    met.add(pair(h, a));
  };

  // Conferences.
  const groups = {};
  for (const t of teams) { const c = confOf(t); if (c) (groups[c] ??= []).push(t); }
  for (const [conf, members] of Object.entries(groups)) {
    if (members.length < 2) continue;
    const base = roundRobin(shuffle(members, r));
    const wanted = Math.max(1, Math.round(sport.confGames / perConfSlot));
    let rounds = [];
    for (let cycle = 0; rounds.length < wanted && cycle < 4; cycle++) rounds.push(...base.map(rd => (cycle % 2 ? rd.map(([h, a]) => [a, h]) : rd)));
    rounds = rounds.slice(0, Math.min(wanted, confSlots.length));
    const use = confSlots.slice(confSlots.length - rounds.length);
    rounds.forEach((rd, i) => rd.forEach(([h, a]) => add(use[i], h, a, conf)));
  }

  // Non-conference games, earliest slots first.
  const sameConf = (a, b) => { const c = confOf(a); return !!c && c === confOf(b); };
  for (const slot of slots) {
    const free = shuffle(teams.filter(t => !busy[t].has(slot.i) && count[t] < sport.games), r);
    const used = new Set();
    for (const a of free) {
      if (used.has(a)) continue;
      const options = free.filter(b => b !== a && !used.has(b) && !sameConf(a, b));
      const b = options.find(x => !met.has(pair(a, x))) || options[0];
      if (!b) continue;
      used.add(a); used.add(b);
      const [h, aw] = homeN[a] <= homeN[b] ? [a, b] : [b, a];
      add(slot, h, aw, '');
    }
  }
  games.sort((x, y) => x.w - y.w || x.s - y.s || x.n - y.n || x.id - y.id);
  return games;
}
