// Logic tests: node tests/logic.test.mjs
import assert from 'node:assert/strict';
import { SCHOOLS } from '../js/schools.js';
import { SPORT_CATALOG } from '../js/sports.js';
import { SEED_PROGRAMS, seedFor } from '../js/seed.js';
import { logoFor, setTables, gistTable, espnTable } from '../js/logos.js';
import { newLeague, seedSport, program, createConference, joinConference, leaveConference, confOf, confMembers, addProgram, dropProgram, hasProgram, effectiveYear, dissolveConference, addSchool, addSport, weekStart, curYear } from '../js/league.js';
import { buildSchedule, roundRobin } from '../js/schedule.js';
import { startSeason, simWeek, simUntil, startNextYear } from '../js/season.js';
import { records, rpi } from '../js/standings.js';
import { play, winner } from '../js/game.js';
import { bracketOrder, buildBracket } from '../js/postseason.js';
import { createEvent, pendingMatchups, recordMatchup, advanceEvent, matchupLength, advancers } from '../js/events.js';
import { DEFAULT_FORMATS, checkFormat, newStage } from '../js/formats.js';
import { quadCuts, compare, committeeOrder, teamSheets } from '../js/selection.js';
import { redrawConfTourney, confirmTeams, announce, finishOf } from '../js/champs.js';
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
  assert.equal(Y.sports.fb.sel.auto.length, 2);
  assert.ok(Y.sports.fb.ct && Object.keys(Y.sports.fb.ct).length === 2, 'football conference championship games');
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

test('every sport has real-life sponsors that are AAU schools', () => {
  const ids = SCHOOLS.map(s => s.id), known = new Set(ids);
  for (const sport of SPORT_CATALOG) {
    const list = seedFor(sport.id, ids);
    assert.ok(list.length >= 8, `${sport.id}: only ${list.length} programs`);
    for (const p of list) { assert.ok(known.has(p.school), `${sport.id}: ${p.school}`); assert.ok(p.off >= 20 && p.off <= 99 && p.def >= 20 && p.def <= 99); }
    assert.equal(new Set(list.map(p => p.school)).size, list.length, `${sport.id} duplicates`);
  }
  assert.equal(seedFor('mbb', ids).length, 73);
});

test('turning a sport on adds its real-life programs once, and respects drops', () => {
  const L = newLeague();
  assert.equal(Object.values(L.programs).filter(p => p.sport === 'mih').length, 0);
  const n = seedSport(L, 'mih');
  assert.ok(n >= 15);
  assert.ok(program(L, 'michigan', 'mih'));
  assert.ok(!program(L, 'texas', 'mih'));
  dropProgram(L, 'michigan', 'mih');
  assert.equal(seedSport(L, 'mih'), 0);
  assert.equal(hasProgram(L, 'michigan', 'mih', 2030), false);
  // Mid-season activation starts programs next year.
  startSeason(L);
  seedSport(L, 'mlax');
  assert.equal(hasProgram(L, 'jhu', 'mlax', 2030), false);
  assert.equal(hasProgram(L, 'jhu', 'mlax', 2031), true);
});

test('logos: own logo, football list, then ESPN by full name', () => {
  setTables({
    gist: gistTable('school,logo,alt_name1\nMichigan,http://a/mich.png,UM\nMiami,https://a/miami.png,\nPittsburgh,https://a/pitt.png,Pitt\n'),
    espn: espnTable({ sports: [{ leagues: [{ teams: [
      { team: { displayName: 'UC San Diego Tritons', location: 'UC San Diego', logos: [{ href: 'https://e/ucsd.png' }] } },
      { team: { displayName: 'Washington Huskies', location: 'Washington', logos: [{ href: 'https://e/uw.png' }] } },
    ] }] }] }),
  });
  const S = Object.fromEntries(SCHOOLS.map(s => [s.id, s]));
  assert.equal(logoFor(S.michigan), 'https://a/mich.png');
  assert.equal(logoFor(S.miami), 'https://a/miami.png');
  assert.equal(logoFor(S.pitt), 'https://a/pitt.png');
  assert.equal(logoFor(S.ucsd), 'https://e/ucsd.png');
  assert.equal(logoFor(S.washington), 'https://e/uw.png');
  assert.equal(logoFor(S.washu), null);
  assert.equal(logoFor({ ...S.washu, logo: 'data:image/png;base64,xx' }), 'data:image/png;base64,xx');
  setTables(null);
});

function runEvent(opts) {
  const ev = createEvent({ id: 't', teams: Array.from({ length: opts.n }, (_, i) => `t${i + 1}`), ...opts });
  const G = {}; let id = 0, guard = 500;
  while (!ev.done && guard--) {
    const p = pendingMatchups(ev);
    if (!p.length) { advanceEvent(ev, x => G[x]); continue; }
    for (const m of p) {
      const len = matchupLength(ev, m), ids = []; let wa = 0, wb = 0, k = 0;
      while (len.fixed ? k < len.fixed : wa < len.need && wb < len.need) { k++; const g = { id: ++id, h: m.a, a: m.b }; const aw = (id * 7) % 3 !== 0; g.hs = aw ? 3 : 1; g.as = aw ? 1 : 3; G[g.id] = g; ids.push(g.id); aw ? wa++ : wb++; }
      recordMatchup(ev, m, ev.kind === 'pool' ? null : wa > wb ? m.a : m.b, ids);
    }
  }
  return { ev, games: id };
}

test('tournament formats all finish with one champion', () => {
  for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 12, 16]) {
    for (const kind of ['single', 'double', 'playin']) {
      const { ev, games } = runEvent({ n, kind, ifNecessary: true });
      assert.ok(ev.done && ev.winner, `${kind} ${n}`);
      assert.equal(ev.finish.length, n, `${kind} ${n} finish order`);
      if (kind === 'single') assert.equal(games, n - 1);
      if (kind === 'double') assert.ok(games >= 2 * n - 2 && games <= 2 * n - 1, `${kind} ${n}: ${games} games`);
    }
  }
  const pool = runEvent({ n: 4, kind: 'pool', advance: 2, gpm: 2 });
  assert.equal(pool.games, 12);
  assert.equal(advancers(pool.ev).length, 2);
  const series = runEvent({ n: 2, kind: 'single', bestOf: 3 });
  assert.ok(series.games >= 2 && series.games <= 3);
  // A classic 4-team regional: 1v4 and 2v3 first.
  const reg = createEvent({ id: 'r', teams: ['a', 'b', 'c', 'd'], kind: 'double' });
  assert.deepEqual(pendingMatchups(reg).map(m => [m.a, m.b]), [['a', 'd'], ['b', 'c']]);
});

test('every default championship format is valid', () => {
  for (const [id, f] of Object.entries(DEFAULT_FORMATS)) assert.deepEqual(checkFormat(f), [], id);
  assert.ok(checkFormat({ field: 16, stages: [newStage({ groups: 4, size: 4 }), newStage({ size: 2 })] }).length > 0);
});

test('quadrants scale with the sport', () => {
  const q = quadCuts(360);
  assert.deepEqual(q.home, [30, 75, 160]);
  const small = quadCuts(60);
  assert.deepEqual(small.home, [5, 13, 27]);
});

test('every sport plays a full year: conference tournaments, selection, stages', () => {
  const L = newLeague();
  for (const sp of Object.keys(L.sports)) { L.sports[sp].active = true; seedSport(L, sp); }
  const all = Object.keys(L.sports);
  const confs = [['A', 'michigan ohiostate pennstate maryland rutgers indiana purdue northwestern illinois iowa wisconsin minnesota msu'], ['B', 'ucla usc stanford cal oregon washington utah arizona asu colorado'], ['C', 'harvard yale princeton penn columbia cornell brown dartmouth'], ['D', 'brandeis cmu case chicago emory nyu rochester washu']];
  for (const [n, m] of confs) { const c = createConference(L, { name: n, sponsors: all }); m.split(' ').forEach(s => joinConference(L, s, c)); }
  // A pool-play championship for women's water polo.
  L.sports.wwp.champ = { ...L.sports.wwp.champ, field: 8, stages: [newStage({ name: 'Pools', label: 'Pool', groups: 2, size: 4, kind: 'pool', advance: 2 }), newStage({ name: 'Final Four', size: 4, venues: [{ name: 'X', city: 'Y' }] })] };
  startSeason(L);
  simUntil(L, () => false);
  const Y = curYear(L);
  assert.equal(Y.phase, 'complete');
  for (const [id, ss] of Object.entries(Y.sports)) {
    assert.ok(ss.champion, `${id} champion`);
    assert.equal(ss.natl.champion, ss.champion);
    assert.equal(finishOf(ss, ss.champion), 'National champion');
    const n = ss.natl.fmt.stages.length;
    assert.equal(ss.natl.stages.length, n, `${id} stages`);
    const field = Object.keys(ss.natl.seeds).length;
    assert.equal(field, ss.natl.fmt.field);
    // No team is in two sites of one stage.
    for (const st of ss.natl.stages) { const t = st.groups.flatMap(e => e.teams); assert.equal(new Set(t).size, t.length, `${id} ${st.name}`); }
  }
  // Softball: 8 regionals of 4 → two WCWS brackets → a best-of-3 series.
  const sb = Y.sports.sb.natl;
  assert.deepEqual(sb.stages.map(s => s.groups.length), [8, 2, 1]);
  assert.ok(sb.stages[0].groups[0].teams.includes(Object.keys(sb.seeds)[0]));
  const bracketA = sb.stages[1].groups[0].teams.map(t => sb.seeds[t]);
  assert.ok(Math.min(...bracketA) === 1 || bracketA.length === 4);
  // Pools sent two teams each.
  assert.equal(Y.sports.wwp.natl.stages[1].groups[0].teams.length, 4);
});

test('conference tournaments can be redrawn before they start; seeds can be set by hand', () => {
  const L = newLeague();
  const all = Object.keys(L.sports);
  const c = createConference(L, { name: 'A', sponsors: all });
  'michigan ohiostate pennstate maryland rutgers indiana purdue northwestern'.split(' ').forEach(s => joinConference(L, s, c));
  startSeason(L);
  const ss = curYear(L).sports.sb;
  simUntil(L, y => y.week > L.sports.sb.season[1]);
  const ev = ss.ct[c];
  assert.ok(ev && !ev.started);
  const teams = [...ev.teams].reverse().slice(0, 4);
  redrawConfTourney(L, L.sports.sb, ss, c, { teams, set: { size: 4, kind: 'single', bestOf: 3, hosting: 'venue', venue: { name: 'Park', city: 'Town' } } });
  assert.deepEqual(ss.ct[c].teams, teams);
  simWeek(L);
  assert.ok(ss.ct[c].done);
  assert.ok(ss.games.filter(g => g.ct === c).every(g => g.site?.name === 'Park'));
  assert.ok(ss.sel && ss.sel.status === 'open');
  confirmTeams(L, L.sports.sb, ss);
  ss.sel.seeds.reverse();
  const top = ss.sel.seeds[0];
  announce(L, L.sports.sb, ss, curYear(L).week);
  assert.equal(ss.natl.seeds[top], 1);
});

console.log(`${passed} tests passed`);
