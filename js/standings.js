// Records, conference standings and the RPI, for one sport's season.
// A season (`ss`) = { teams, conf: {school: confId|''}, games, post }.

import { winner } from './game.js?v=20261030222729';

export const isFinal = g => g.hs != null;
export const isPost = g => !!g.p;

function blank() { return { w: 0, l: 0, t: 0, cw: 0, cl: 0, ct: 0, pw: 0, pl: 0, pf: 0, pa: 0, streak: '' }; }

export function records(ss) {
  const rec = {};
  for (const t of Object.keys(ss.teams)) rec[t] = blank();
  for (const g of ss.games) {
    if (!isFinal(g)) continue;
    const win = winner(g), H = rec[g.h], A = rec[g.a];
    if (!H || !A) continue;
    const res = [[H, win === 'home' ? 'W' : win === 'away' ? 'L' : 'T', g.hs, g.as], [A, win === 'away' ? 'W' : win === 'home' ? 'L' : 'T', g.as, g.hs]];
    for (const [R, x, f, a] of res) {
      R.pf += f; R.pa += a;
      if (g.p) { if (x === 'W') R.pw++; else if (x === 'L') R.pl++; }
      if (x === 'W') R.w++; else if (x === 'L') R.l++; else R.t++;
      if (g.c && !g.p) { if (x === 'W') R.cw++; else if (x === 'L') R.cl++; else R.ct++; }
      R.streak = R.streak[0] === x ? x + (Number(R.streak.slice(1)) + 1) : x + 1;
    }
  }
  return rec;
}

export const winPct = (w, l, t = 0) => (w + l + t ? (w + t / 2) / (w + l + t) : 0);
export const fmtRec = (w, l, t = 0) => `${w}-${l}${t ? `-${t}` : ''}`;
export const fmtPct = x => x.toFixed(3).replace(/^0/, '');

// RPI: 25% own win percentage, 50% opponents' (without games against this
// team), 25% opponents' opponents'. Ties count as half a win.
export function rpi(ss) {
  const res = {}; // team -> list of [opp, score 1/0.5/0]
  for (const t of Object.keys(ss.teams)) res[t] = [];
  for (const g of ss.games) {
    if (!isFinal(g) || !res[g.h] || !res[g.a]) continue;
    const w = winner(g), sh = w === 'home' ? 1 : w === 'away' ? 0 : 0.5;
    res[g.h].push([g.a, sh]); res[g.a].push([g.h, 1 - sh]);
  }
  const wp = (t, without) => { const l = res[t].filter(([o]) => o !== without); return l.length ? l.reduce((s, [, x]) => s + x, 0) / l.length : 0; };
  const owp = {};
  for (const t in res) owp[t] = res[t].length ? res[t].reduce((s, [o]) => s + wp(o, t), 0) / res[t].length : 0;
  const out = {};
  for (const t in res) {
    const oowp = res[t].length ? res[t].reduce((s, [o]) => s + owp[o], 0) / res[t].length : 0;
    out[t] = res[t].length ? 0.25 * wp(t) + 0.5 * owp[t] + 0.25 * oowp : 0;
  }
  return out;
}

// Teams ranked by RPI (ties broken by win percentage, then rating).
export function rpiRanking(ss, rec = records(ss), r = rpi(ss)) {
  return Object.keys(ss.teams).sort((a, b) => r[b] - r[a] || winPct(rec[b].w, rec[b].l, rec[b].t) - winPct(rec[a].w, rec[a].l, rec[a].t) || ovrOf(ss, b) - ovrOf(ss, a));
}
export const ovrOf = (ss, t) => (ss.teams[t].off + ss.teams[t].def) / 2;

// Conference groups: { confId: [teams sorted] }, independents under ''.
export function confStandings(ss, rec = records(ss), r = rpi(ss)) {
  const groups = {};
  for (const t of Object.keys(ss.teams)) (groups[ss.conf[t] || ''] ??= []).push(t);
  for (const k in groups) {
    groups[k].sort((a, b) => {
      const A = rec[a], B = rec[b];
      return winPct(B.cw, B.cl, B.ct) - winPct(A.cw, A.cl, A.ct) || (B.cw - A.cw) || winPct(B.w, B.l, B.t) - winPct(A.w, A.l, A.t) || r[b] - r[a];
    });
  }
  return groups;
}

// Regular-season conference champion (first place in the standings).
export function confChampion(ss, conf, groups = confStandings(ss)) {
  const g = groups[conf];
  if (!conf || !g || g.length < 2) return null;
  const rec = records(ss);
  return rec[g[0]].cw + rec[g[0]].cl + rec[g[0]].ct ? g[0] : null;
}
