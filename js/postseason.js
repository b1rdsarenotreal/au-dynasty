// National championships. After the regular season each sport picks a field:
// every conference with enough teams in the sport sends its regular-season
// champion (an automatic bid), and the best remaining teams by RPI fill the
// rest. Seeds follow the RPI. The bracket is single elimination; a round can
// be a best-of-3 series (baseball, softball). Higher seeds host until the
// sport's neutral-site round.

import { records, rpi, rpiRanking, confStandings, confChampion } from './standings.js?v=20261030222729';

export function selectField(ss, sport, autoMin = 6) {
  const rec = records(ss), r = rpi(ss), groups = confStandings(ss, rec, r);
  const size = Math.min(sport.post.field, Object.keys(ss.teams).length);
  if (size < 2) return [];
  const auto = [];
  for (const conf of Object.keys(groups)) {
    if (!conf || groups[conf].length < autoMin) continue;
    const ch = confChampion(ss, conf, groups);
    if (ch) auto.push(ch);
  }
  const ranked = rpiRanking(ss, rec, r);
  const chosen = new Set(auto.slice(0, size));
  for (const t of ranked) { if (chosen.size >= size) break; chosen.add(t); }
  return ranked.filter(t => chosen.has(t)).map((school, i) => ({ school, seed: i + 1, auto: auto.includes(school) }));
}

// Seed order for a bracket of size P (power of two): 1,P,P/2+1,... so that
// the top seeds meet as late as possible.
export function bracketOrder(P) {
  let order = [1];
  while (order.length < P) { const n = order.length * 2 + 1; order = order.flatMap(s => [s, n - s]); }
  return order;
}

export function roundName(teamsLeft) {
  return { 2: 'Championship', 4: 'Semifinals', 8: 'Quarterfinals', 16: 'Round of 16', 32: 'Round of 32', 64: 'Round of 64' }[teamsLeft] || `Round of ${teamsLeft}`;
}

// The bracket: rounds of matchups { a, b, winner } with seeds; byes are
// decided immediately.
export function buildBracket(field) {
  const n = field.length;
  let P = 1; while (P < n) P *= 2;
  const bySeed = Object.fromEntries(field.map(f => [f.seed, f.school]));
  const order = bracketOrder(P);
  const first = [];
  for (let i = 0; i < P; i += 2) {
    const a = bySeed[order[i]] || null, b = bySeed[order[i + 1]] || null;
    first.push({ a, b, winner: a && !b ? a : b && !a ? b : null, games: [] });
  }
  const rounds = [first];
  for (let m = P / 4; m >= 1; m /= 2) rounds.push(Array.from({ length: m }, () => ({ a: null, b: null, winner: null, games: [] })));
  if (P === 1) rounds.length = 0;
  advance({ rounds });
  return { field, rounds, next: rounds.findIndex(rd => rd.some(m => !m.winner)), champion: null };
}

// Move winners into the next round.
export function advance(post) {
  for (let i = 0; i + 1 < post.rounds.length; i++) {
    post.rounds[i].forEach((m, j) => {
      if (!m.winner) return;
      const nx = post.rounds[i + 1][j >> 1];
      if (j % 2) nx.b = m.winner; else nx.a = m.winner;
    });
  }
  const last = post.rounds[post.rounds.length - 1];
  if (last && last.length === 1 && last[0].winner) post.champion = last[0].winner;
}

export const seedOf = (post, school) => post.field.find(f => f.school === school)?.seed;
