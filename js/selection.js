// Selection committee, as in MCS Dynasty: team sheets (record, RPI,
// quadrant records, strength of schedule), a committee order built from
// two-team comparisons in tiers, the at-large board, and seeds.
//
// Quadrants follow the NCAA team sheet: a game's quadrant depends on the
// opponent's RPI rank and where it was played. The NCAA's cut-offs (for about
// 360 Division I teams) are scaled to the number of teams in the sport.

import { winner } from './game.js?v=20261030224435';
import { records, rpi, rpiRanking, winPct } from './standings.js?v=20261030224435';

const NCAA_TEAMS = 360;
const CUTS = { home: [30, 75, 160], neutral: [50, 100, 200], away: [75, 135, 240] };
const QW = [4, 2, 1, 0.25], QL = [0, 0.5, 2, 4];

export function quadCuts(n) {
  const k = n / NCAA_TEAMS;
  return Object.fromEntries(Object.entries(CUTS).map(([loc, c]) => [loc, c.map(x => Math.max(1, Math.round(x * k)))]));
}

// Every team's sheet, from games before the national championship.
export function teamSheets(ss, { regTitles = new Set(), autoBids = new Set() } = {}) {
  const games = ss.games.filter(g => g.hs != null && !g.p);
  const view = { ...ss, games };
  const rec = records(view), r = rpi(view), order = rpiRanking(view, rec, r);
  const rank = Object.fromEntries(order.map((t, i) => [t, i + 1]));
  const cuts = quadCuts(order.length);
  const opp = {};
  for (const t of Object.keys(ss.teams)) opp[t] = [];
  for (const g of games) { if (opp[g.h] && opp[g.a]) { opp[g.h].push(g.a); opp[g.a].push(g.h); } }
  const wp = t => winPct(rec[t].w, rec[t].l, rec[t].t);
  const owp = t => (opp[t].length ? opp[t].reduce((s, o) => s + wp(o), 0) / opp[t].length : 0);
  const sheets = {};
  for (const t of Object.keys(ss.teams)) {
    const q = [[0, 0], [0, 0], [0, 0], [0, 0]];
    const h2h = {};
    for (const g of games) {
      if (g.h !== t && g.a !== t) continue;
      const o = g.h === t ? g.a : g.h, loc = g.neu ? 'neutral' : g.h === t ? 'home' : 'away';
      const or = rank[o] || order.length, c = cuts[loc];
      const qi = or <= c[0] ? 0 : or <= c[1] ? 1 : or <= c[2] ? 2 : 3;
      const w = winner(g), won = w && (w === 'home') === (g.h === t), lost = w && !won;
      if (won) { q[qi][0]++; h2h[o] = (h2h[o] || 0) + 1; } else if (lost) q[qi][1]++;
    }
    const oo = opp[t].length ? opp[t].reduce((s, o) => s + owp(o), 0) / opp[t].length : 0;
    sheets[t] = {
      team: t, w: rec[t].w, l: rec[t].l, t: rec[t].t, pct: wp(t), rpi: r[t], rank: rank[t],
      sos: (2 / 3) * owp(t) + (1 / 3) * oo, q, h2h,
      qpts: q.reduce((s, [w, l], i) => s + w * QW[i] - l * QL[i], 0),
      auto: autoBids.has(t), regTitle: regTitles.has(t),
    };
  }
  const sosOrder = Object.values(sheets).sort((a, b) => b.sos - a.sos);
  sosOrder.forEach((s, i) => (s.sosRank = i + 1));
  return sheets;
}

const qpct = ([w, l]) => (w + l ? w / (w + l) : 0);
// Each criterion: [label, value(sheet, other) — higher is better].
const TIERS = [
  ['Tier 1', [['RPI', a => a.rpi], ['Q1 wins', a => a.q[0][0]], ['Q4 losses', a => -a.q[3][1]]]],
  ['Tier 2', [['SOS', a => a.sos], ['Head-to-head', (a, b) => (a.h2h[b.team] || 0) - (b.h2h[a.team] || 0)], ['Q2 wins', a => a.q[1][0]], ['W-L', a => a.pct]]],
  ['Tier 3', [['Automatic bid', a => (a.auto ? 1 : 0)], ['Conference title', a => (a.regTitle ? 1 : 0)], ['Q3 losses', a => -a.q[2][1]], ['Q1 win %', a => qpct(a.q[0])], ['Q2 win %', a => qpct(a.q[1])], ['Q1+Q2 win %', a => qpct([a.q[0][0] + a.q[1][0], a.q[0][1] + a.q[1][1]])]]],
];

// Compare two teams: { better: team, tier, reasons: [criteria won] }.
export function compare(A, B) {
  for (const [tier, crit] of TIERS) {
    const won = { [A.team]: [], [B.team]: [] };
    for (const [label, f] of crit) {
      const a = f(A, B), b = f(B, A);
      if (Math.abs(a - b) < 1e-9) continue;
      won[a > b ? A.team : B.team].push(label);
    }
    if (won[A.team].length !== won[B.team].length) {
      const better = won[A.team].length > won[B.team].length ? A.team : B.team;
      return { better, tier, reasons: won[better] };
    }
  }
  return { better: A.rpi >= B.rpi ? A.team : B.team, tier: 'RPI', reasons: ['RPI'] };
}

// Committee order: start in RPI order; each team moves up past every team it
// beats until one beats it.
export function committeeOrder(teams, sheets) {
  const list = [...teams].sort((a, b) => sheets[a].rank - sheets[b].rank);
  for (let i = 1; i < list.length; i++) {
    let j = i;
    while (j > 0 && compare(sheets[list[j]], sheets[list[j - 1]]).better === list[j]) { [list[j - 1], list[j]] = [list[j], list[j - 1]]; j--; }
  }
  return list;
}

export const eligible = s => s.w >= s.l;

// The committee's picks. auto: [{ school, how }].
export function committeePicks(ss, field, auto, regTitles) {
  const autoSet = new Set(auto.map(a => a.school));
  const sheets = teamSheets(ss, { regTitles, autoBids: autoSet });
  const all = committeeOrder(Object.keys(ss.teams), sheets);
  const spots = Math.max(0, Math.min(field, all.length) - Math.min(autoSet.size, field));
  const pool = all.filter(t => !autoSet.has(t));
  const ok = pool.filter(t => eligible(sheets[t]));
  let picks = ok.slice(0, spots);
  const below = [];
  if (picks.length < spots) { const extra = pool.filter(t => !eligible(sheets[t])).slice(0, spots - picks.length); picks = picks.concat(extra); below.push(...extra); }
  return { sheets, order: all, board: pool, atLarge: picks, below, autoList: auto.slice(0, field) };
}

export function seedOrder(field, sheets) { return committeeOrder(field, sheets); }
