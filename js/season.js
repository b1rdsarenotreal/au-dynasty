// Running a year: start the season (lock in teams, conferences and
// schedules for every active sport), play the calendar week by week, crown
// champions, then roll the dynasty into the next year.

import { activeSports, programsIn, confOf, curYear, newYear } from './league.js?v=20261030222729';
import { buildSchedule } from './schedule.js?v=20261030222729';
import { postStart, LAST_WEEK } from './sports.js?v=20261030222729';
import { play, winner, winProbability } from './game.js?v=20261030222729';
import { selectField, buildBracket, advance, seedOf } from './postseason.js?v=20261030222729';
import { clamp, normal, rng as makeRng, hashStr } from './util.js?v=20261030222729';

export const FORM_LEVELS = { none: 0, small: 0.5, normal: 1, big: 1.6 };
const MAX_DRIFT = 8;

export function startSeason(L) {
  const Y = curYear(L);
  if (Y.phase !== 'preseason') return;
  for (const sport of activeSports(L)) {
    const progs = programsIn(L, sport.id, Y.year);
    if (progs.length < 2) continue;
    const teams = {}, conf = {};
    for (const p of progs) {
      teams[p.school] = { off: p.off, def: p.def, base: { off: p.off, def: p.def } };
      conf[p.school] = confOf(L, p.school, sport.id, Y.year) || '';
    }
    const games = buildSchedule(sport, Object.keys(teams), s => conf[s] || null, { seed: Y.year * 7919 });
    Y.sports[sport.id] = { teams, conf, games, post: null, champion: null, done: false, nextId: games.length + 1, postWeek: postStart(sport) };
  }
  Y.phase = 'season';
  Y.week = 1;
}

function rate(L, sport, ss, g) {
  const level = FORM_LEVELS[L.settings.form] ?? 1;
  if (!level) return;
  const H = ss.teams[g.h], A = ss.teams[g.a];
  const p = winProbability(sport, H, A, !!g.neu);
  const w = winner(g), res = w === 'home' ? 1 : w === 'away' ? 0 : 0.5;
  const k = level * Math.sqrt(clamp(30 / sport.games, 0.5, 3));
  for (const [T, s] of [[H, res - p], [A, p - res]]) {
    for (const key of ['off', 'def']) T[key] = clamp(T[key] + k * s, T.base[key] - MAX_DRIFT, T.base[key] + MAX_DRIFT);
  }
}

function playGame(L, sport, ss, g, r) {
  Object.assign(g, play(sport, ss.teams[g.h], ss.teams[g.a], { neutral: !!g.neu, playoff: !!g.p, r }));
  rate(L, sport, ss, g);
}

function playRound(L, sport, ss, week, r) {
  const post = ss.post, k = post.next;
  const need = Math.ceil(sport.post.series / 2);
  const neutral = k + 1 >= sport.post.neutralFrom;
  for (const m of post.rounds[k]) {
    if (m.winner || !m.a || !m.b) continue;
    const [hi, lo] = seedOf(post, m.a) < seedOf(post, m.b) ? [m.a, m.b] : [m.b, m.a];
    const wins = { [hi]: 0, [lo]: 0 };
    let n = 0;
    while (wins[hi] < need && wins[lo] < need) {
      n++;
      const g = { id: ss.nextId++, w: week, s: 9, n: sport.post.series > 1 ? n : 0, h: hi, a: lo, c: '', p: k + 1, neu: neutral };
      ss.games.push(g);
      playGame(L, sport, ss, g, r);
      wins[winner(g) === 'home' ? hi : lo]++;
    }
    m.winner = wins[hi] >= need ? hi : lo;
    m.games = ss.games.filter(g => g.p === k + 1 && ((g.h === hi && g.a === lo) || (g.h === lo && g.a === hi))).map(g => g.id);
  }
  advance(post);
  post.next++;
  if (post.champion) { ss.champion = post.champion; ss.done = true; }
}

// Play every game in the current week, for every sport.
export function simWeek(L) {
  const Y = curYear(L);
  if (Y.phase !== 'season') return;
  const w = Y.week;
  const r = makeRng(hashStr(`${Y.year}-${w}`) ^ (Date.now() & 0xffff));
  for (const [id, ss] of Object.entries(Y.sports)) {
    const sport = L.sports[id];
    if (ss.done) continue;
    for (const g of ss.games) if (g.w === w && g.hs == null && !g.p) playGame(L, sport, ss, g, r);
    if (!ss.post && w >= ss.postWeek) {
      const field = selectField(ss, sport, L.settings.autoMin);
      if (field.length < 2) { ss.done = true; continue; }
      ss.post = buildBracket(field);
      ss.post.startWeek = w;
    }
    if (ss.post && !ss.done) for (let i = 0; i < sport.post.perWeek && !ss.done; i++) playRound(L, sport, ss, w, r);
  }
  Y.week = w + 1;
  if (Object.values(Y.sports).every(s => s.done) || Y.week > LAST_WEEK + 4) Y.phase = 'complete';
}

// Keep playing weeks until `stop(Y)` is true or the year is over.
export function simUntil(L, stop) {
  const Y = curYear(L);
  let guard = 80;
  while (Y.phase === 'season' && !stop(Y) && guard--) simWeek(L);
}

// Sports with games or championship rounds in a week.
export function sportsInWeek(L, Y, w) {
  return Object.entries(Y.sports).filter(([, ss]) => ss.games.some(g => g.w === w) || (!ss.done && ss.postWeek <= w && !ss.post) || (ss.post && !ss.done)).map(([id]) => id);
}

// Ratings for next year: a program keeps much of how it finished, regresses
// toward its long-run level (prestige), and gets a little random change
// (recruiting, graduation, coaching).
export function startNextYear(L) {
  const Y = curYear(L);
  if (Y.phase !== 'complete') return;
  const r = makeRng(hashStr(`next-${Y.year}`));
  for (const [sid, ss] of Object.entries(Y.sports)) {
    for (const [school, t] of Object.entries(ss.teams)) {
      const p = L.programs[`${school}:${sid}`];
      if (!p) continue;
      const end = (t.off + t.def) / 2;
      p.prestige = clamp(p.prestige * 0.8 + end * 0.2, 25, 99);
      for (const k of ['off', 'def']) p[k] = Math.round(clamp(0.6 * t[k] + 0.4 * (p.prestige + (t[k] - end)) + normal(r) * 3, 25, 99));
    }
  }
  L.currentYear = Y.year + 1;
  L.years[L.currentYear] = newYear(L.currentYear);
  L.viewYear = L.currentYear;
}
