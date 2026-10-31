// Logic tests: node tests/logic.test.mjs
import assert from 'node:assert/strict';
import { SCHOOLS } from '../js/schools.js';
import { SPORT_CATALOG } from '../js/sports.js';
import { SEED_PROGRAMS } from '../js/seed.js';
import { newLeague, createConference, joinConference, leaveConference, confOf, confMembers, addProgram, dropProgram, hasProgram, effectiveYear, dissolveConference, addSchool, addSport, weekStart, curYear } from '../js/league.js';
import { buildSchedule, roundRobin } from '../js/schedule.js';
import { startSeason, simWeek, simUntil, startNextYear } from '../js/season.js';
import { records, rpi } from '../js/standings.js';
import { play, winner } from '../js/game.js';
import { bracketOrder, buildBracket } from '../js/postseason.js';
import { rng } from '../js/util.js';

let passed = 0;
const test = (name, fn) => { try { fn(); passed++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exitCode = 1; } };

test('73 AAU schools with unique ids', () => {
  assert.equal(SCHOOLS.length, 73);
  assert.equal(new Set(SCHOOLS.map(s => s.id)).size, 73);
  assert.equal(SCHOOLS.filter(s => s.country === 'CA').length, 2);
});

test('seed programs point at real schools and sports, no duplicates', () => {
  const ids = new Set(SCHOOLS.map(s => s.id)), sports = new Set(SPORT_CATALOG.map(s => s.id));
  const keys = SEED_PROGRAMS.map(p => `${p.school}:${p.sport}`);
  for (const p of SEED_PROGRAMS) { assert.ok(ids.has(p.school), p.school); assert.ok(sports.has(p.sport), p.sport); }
  assert.equal(new Set(keys).size, keys.length);
});

test('week 1 starts on the last Monday of August', () => {
  const d = weekStart(2030, 1);
  assert.equal(d.getUTCDay(), 1);
  assert.equal(d.getUTCMonth(), 7);
  assert.ok(d.getUTCDate() >= 25);
});

test('round robin: everyone meets once', () => {
  const rr = roundRobin(['a', 'b', 'c', 'd', 'e']);
  const seen = new Set();
  for (const rd of rr) for (const [h, a] of rd) seen.add([h, a].sort().join());
  assert.equal(seen.size, 10);
});

test('full members, affiliates and sport-only conferences', () => {
  const L = newLeague();
  const big = createConference(L, { name: 'Big Test', sponsors: ['fb', 'wbb'] });
  const sbc = createConference(L, { name: 'Softball League', sponsors: ['sb'], sportOnly: true });
  joinConference(L, 'michigan', big);
  joinConference(L, 'ohiostate', big);
  assert.equal(confOf(L, 'michigan', 'fb', 2030), big);
  assert.equal(confOf(L, 'michigan', 'sb', 2030), null); // home conference doesn't sponsor softball
  joinConference(L, 'michigan', sbc, ['sb']);
  assert.equal(confOf(L, 'michigan', 'sb', 2030), sbc);
  assert.equal(confOf(L, 'michigan', 'fb', 2030), big);
  assert.deepEqual(confMembers(L, big, 'fb', 2030).sort(), ['michigan', 'ohiostate']);
  // No program, no conference.
  joinConference(L, 'caltech', big);
  assert.equal(confOf(L, 'caltech', 'fb', 2030), null);
  assert.equal(confOf(L, 'caltech', 'wbb', 2030), big);
});

test('realignment after the preseason takes effect next year; history kept', () => {
  const L = newLeague();
  const a = createConference(L, { name: 'A', sponsors: ['fb', 'wbb', 'sb'] });
  const b = createConference(L, { name: 'B', sponsors: ['fb', 'wbb', 'sb'] });
  joinConference(L, 'texas', a);
  startSeason(L);
  assert.equal(effectiveYear(L), 2031);
  joinConference(L, 'texas', b);
  assert.equal(confOf(L, 'texas', 'fb', 2030), a);
  assert.equal(confOf(L, 'texas', 'fb', 2031), b);
  const m = L.memberships.find(x => x.conf === b);
  leaveConference(L, m.id); // never took effect → removed
  assert.equal(confOf(L, 'texas', 'fb', 2031), null);
  assert.equal(confOf(L, 'texas', 'fb', 2030), a);
});

test('department expansion and dropping a program', () => {
  const L = newLeague();
  assert.equal(hasProgram(L, 'usc', 'sb', 2030), false);
  addProgram(L, 'usc', 'sb', { off: 50, def: 48 });
  assert.equal(hasProgram(L, 'usc', 'sb', 2030), true);
  dropProgram(L, 'usc', 'sb');
  assert.equal(hasProgram(L, 'usc', 'sb', 2030), false);
  startSeason(L);
  dropProgram(L, 'texas', 'fb');
  assert.equal(hasProgram(L, 'texas', 'fb', 2030), true);
  assert.equal(hasProgram(L, 'texas', 'fb', 2031), false);
});

test('dissolving a conference ends its memberships', () => {
  const L = newLeague();
  const a = createConference(L, { name: 'A', sponsors: ['fb'] });
  joinConference(L, 'texas', a);
  dissolveConference(L, a);
  assert.equal(L.conferences[a], undefined);
  assert.equal(confOf(L, 'texas', 'fb', 2030), null);
});

test('schedules: nobody double-booked, conference games stay in conference, counts near target', () => {
  for (const sport of SPORT_CATALOG) {
    const teams = Array.from({ length: 40 }, (_, i) => `t${i}`);
    const conf = t => { const n = +t.slice(1); return n < 12 ? 'A' : n < 22 ? 'B' : n < 36 ? 'C' : null; };
    const games = buildSchedule(sport, teams, conf, { seed: 3 });
    const slot = new Map();
    const count = Object.fromEntries(teams.map(t => [t, 0]));
    for (const g of games) {
      for (const t of [g.h, g.a]) {
        const k = `${t}:${g.w}:${g.s}`;
        const opp = g.h === t ? g.a : g.h;
        if (slot.has(k)) assert.equal(slot.get(k), opp, `${sport.id} ${k} double-booked`);
        slot.set(k, opp);
        count[t]++;
      }
      if (g.c) assert.ok(conf(g.h) === g.c && conf(g.a) === g.c, `${sport.id} conference game across conferences`);
      else assert.ok(!conf(g.h) || conf(g.h) !== conf(g.a), `${sport.id} non-conference game inside a conference`);
    }
    const avg = Object.values(count).reduce((a, b) => a + b) / teams.length;
    assert.ok(avg >= sport.games * 0.85 && avg <= sport.games + 3, `${sport.id}: average ${avg} vs target ${sport.games}`);
  }
});

test('every model produces a decided playoff game', () => {
  const r = rng(11);
  for (const sport of SPORT_CATALOG) {
    for (let i = 0; i < 200; i++) {
      const g = play(sport, { off: 70, def: 70 }, { off: 70, def: 70 }, { playoff: true, r });
      assert.ok(winner(g), `${sport.id} playoff tie`);
      assert.equal(g.line[0].filter(x => x != null).reduce((a, b) => a + b, 0) + (sport.model === 'sets' && !sport.params.flights ? 0 : 0) >= 0, true);
    }
  }
});

test('line scores add up to the final score', () => {
  const r = rng(5);
  for (const sport of SPORT_CATALOG.filter(s => s.model !== 'sets')) {
    for (let i = 0; i < 200; i++) {
      const g = play(sport, { off: 75, def: 65 }, { off: 66, def: 72 }, { r });
      const sum = l => l.reduce((a, b) => a + (b || 0), 0);
      assert.equal(sum(g.line[0]), g.hs, `${sport.id} home line`);
      assert.equal(sum(g.line[1]), g.as, `${sport.id} away line`);
    }
  }
});

test('bracket order keeps 1 and 2 apart', () => {
  const o = bracketOrder(8);
  assert.deepEqual(o, [1, 8, 4, 5, 2, 7, 3, 6]);
  const b = buildBracket(Array.from({ length: 12 }, (_, i) => ({ school: `s${i + 1}`, seed: i + 1 })));
  assert.equal(b.rounds[0].filter(m => m.winner).length, 4); // four byes
});

test('a full year plays out with champions, then rolls over', () => {
  const L = newLeague();
  const c1 = createConference(L, { name: 'East', sponsors: ['fb', 'wbb', 'sb'] });
  const c2 = createConference(L, { name: 'West', sponsors: ['fb', 'wbb', 'sb'] });
  ['michigan', 'ohiostate', 'pennstate', 'maryland', 'rutgers', 'indiana', 'purdue', 'northwestern'].forEach(s => joinConference(L, s, c1));
  ['ucla', 'usc', 'stanford', 'cal', 'oregon', 'washington', 'utah', 'arizona', 'asu'].forEach(s => joinConference(L, s, c2));
  startSeason(L);
  simUntil(L, () => false);
  const Y = curYear(L);
  assert.equal(Y.phase, 'complete');
  for (const id of ['fb', 'wbb', 'sb']) {
    const ss = Y.sports[id];
    assert.ok(ss.champion, `${id} champion`);
    assert.ok(ss.games.every(g => g.hs != null), `${id} unplayed games`);
    const rec = records(ss);
    assert.ok(Object.values(rec).every(r => r.w + r.l + r.t > 0));
    const r = rpi(ss);
    assert.ok(Object.values(r).every(x => x >= 0 && x <= 1));
  }
  // Auto bids went to the two conference champions in football.
  assert.equal(Y.sports.fb.post.field.filter(f => f.auto).length, 2);
  startNextYear(L);
  assert.equal(L.currentYear, 2031);
  startSeason(L);
  simWeek(L);
  assert.ok(Object.keys(curYear(L).sports.fb.teams).length > 40);
});

test('new schools and sports', () => {
  const L = newLeague();
  const id = addSchool(L, { name: 'University of Nowhere', short: 'Nowhere' });
  addProgram(L, id, 'wbb', { off: 50, def: 50 });
  const sid = addSport(L, 'wbb', { name: "Women's 3x3 Basketball", id: 'w3x3' });
  addProgram(L, id, sid);
  addProgram(L, 'texas', sid);
  startSeason(L);
  assert.ok(curYear(L).sports.w3x3);
  assert.ok(curYear(L).sports.wbb.teams[id]);
});

console.log(`${passed} tests passed`);
