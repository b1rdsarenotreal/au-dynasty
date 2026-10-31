// Game simulators. Every team has two ratings, OFF and DEF (about 30–99).
// Each model turns the two teams' ratings into a final score and a line
// score (points per quarter/half/period/inning/set).
//
// play(sport, home, away, { neutral, playoff, r }) returns
//   { hs, as, line: [homeLine, awayLine], ot, so, note }
// `so` names the shootout winner ('home'/'away') when a tie was broken by a
// shootout. `ot` counts overtime periods / extra innings.

import { rng as makeRng, normal, clamp } from './util.js?v=20261030221621';

export const HOME_EDGE = 1.5; // rating points added to the home team
export const ovr = t => (t.off + t.def) / 2;

function edge(t, on) { return on ? { off: t.off + HOME_EDGE, def: t.def + HOME_EDGE } : t; }

function poisson(lambda, r) {
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * normal(r)));
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= r(); } while (p > L);
  return k - 1;
}

// ---------------------------------------------------------------- football
// Each team gets about a dozen drives. A drive ends in a touchdown, a field
// goal or nothing, with chances set by the offense against the defense.
function driveProbs(off, def, ot = false) {
  const t = (off - def) / 12;
  let td = 0.24 * Math.exp(0.45 * t), fg = 0.12 * Math.exp(0.12 * t);
  if (ot) { td *= 1.6; fg = Math.max(fg * 2, 0.22); }
  const s = td + fg;
  if (s > 0.86) { td *= 0.86 / s; fg *= 0.86 / s; }
  return { td, fg };
}
function drivePoints(p, r) {
  const x = r();
  if (x < p.td) { const y = r(); return y < 0.94 ? 7 : y < 0.98 ? 6 : 8; }
  if (x < p.td + p.fg) return 3;
  return 0;
}
function playFootball(sport, H, A, o) {
  const r = o.r;
  const ph = driveProbs(H.off, A.def), pa = driveProbs(A.off, H.def);
  const n = 11 + Math.floor(r() * 3);
  const line = [[0, 0, 0, 0], [0, 0, 0, 0]];
  for (let i = 0; i < n; i++) {
    const q = Math.floor((i * 4) / n);
    line[0][q] += drivePoints(ph, r);
    line[1][q] += drivePoints(pa, r);
    if (r() < 0.004) line[r() < 0.5 ? 0 : 1][q] += 2; // safety
  }
  let hs = line[0].reduce((a, b) => a + b), as = line[1].reduce((a, b) => a + b), ot = 0;
  if (hs === as) {
    let ho = 0, ao = 0;
    while (ho === ao && ot < 9) {
      ot++;
      if (ot >= 3) { ho = r() < 0.47 + (H.off - A.def) / 200 ? 2 : 0; ao = r() < 0.47 + (A.off - H.def) / 200 ? 2 : 0; }
      else { ho = drivePoints(driveProbs(H.off, A.def, true), r); ao = drivePoints(driveProbs(A.off, H.def, true), r); }
      if (ho === ao) { hs += ho; as += ao; ho = ao = 0; }
    }
    if (ho === ao) ho += 2; // never leave a football game tied
    hs += ho; as += ao;
    line[0].push(hs - line[0].reduce((a, b) => a + b)); line[1].push(as - line[1].reduce((a, b) => a + b));
  }
  return { hs, as, line, ot };
}

// ---------------------------------------------------------- timed periods
// Scoring rates come from the sport's average score, raised or lowered by
// the offense-against-defense gap. High-scoring sports (basketball) use a
// normal spread per period, low-scoring sports a Poisson count.
function rates(sport, H, A) {
  const { avg, k } = sport.params;
  return [avg * Math.exp((H.off - A.def) / k), avg * Math.exp((A.off - H.def) / k)];
}
function score(lambda, r, big) {
  if (!big) return poisson(lambda, r);
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * 1.25 * normal(r)));
}
function playPeriods(sport, H, A, o) {
  const r = o.r, p = sport.params;
  const [lh, la] = rates(sport, H, A);
  const big = p.avg >= 30, n = p.periods;
  const line = [[], []];
  for (let i = 0; i < n; i++) { line[0].push(score(lh / n, r, big)); line[1].push(score(la / n, r, big)); }
  let hs = line[0].reduce((a, b) => a + b), as = line[1].reduce((a, b) => a + b), ot = 0, so = null;
  if (hs !== as) return { hs, as, line, ot };
  const perMin = l => l / (n * p.length);
  const tiesOk = p.ties && !o.playoff;
  if (p.ot === 'period') {
    while (hs === as && ot < 8) {
      ot++;
      const a = score(perMin(lh) * p.otLen, r, big), b = score(perMin(la) * p.otLen, r, big);
      line[0].push(a); line[1].push(b); hs += a; as += b;
    }
    if (hs === as) { line[0][line[0].length - 1]++; hs++; }
    return { hs, as, line, ot };
  }
  // Sudden victory: the first goal wins. In regular-season soccer there is no
  // overtime at all (ot: 'none'); in the postseason it gets sudden victory too.
  if (p.ot === 'sudden' || !tiesOk) {
    const mh = perMin(lh), ma = perMin(la);
    const len = p.otLen || Infinity;
    const scored = len === Infinity || r() < 1 - Math.exp(-(mh + ma) * len);
    ot = 1;
    if (scored) {
      const h = r() < mh / (mh + ma);
      line[0].push(h ? 1 : 0); line[1].push(h ? 0 : 1);
      return { hs: hs + (h ? 1 : 0), as: as + (h ? 0 : 1), line, ot };
    }
    line[0].push(0); line[1].push(0);
  }
  if (tiesOk) return { hs, as, line, ot };
  so = r() < 0.5 + (ovr(H) - ovr(A)) / 400 ? 'home' : 'away';
  return { hs, as, line, ot, so };
}

// ---------------------------------------------------------------- innings
// Plate appearance by plate appearance: the batting team's OFF against the
// fielding team's DEF (pitching and defense together).
const BASE = { k: 0.19, bb: 0.08, hbp: 0.017, hr: 0.024, tri: 0.006, dbl: 0.045, sgl: 0.152, err: 0.03 };
function paProbs(off, def, boost) {
  const t = (off - def) / 21;
  const p = {
    k: BASE.k * Math.exp(-0.32 * t), bb: BASE.bb * Math.exp(0.22 * t) * boost, hbp: BASE.hbp,
    hr: BASE.hr * Math.exp(0.5 * t) * boost * boost, tri: BASE.tri * Math.exp(0.3 * t), dbl: BASE.dbl * Math.exp(0.36 * t) * boost,
    sgl: BASE.sgl * Math.exp(0.26 * t) * boost, err: BASE.err * Math.exp(-0.25 * t),
  };
  const sum = Object.values(p).reduce((a, b) => a + b, 0);
  if (sum > 0.6) for (const k in p) p[k] *= 0.6 / sum;
  return p;
}
function half(p, r, onSecond, onRun) {
  let outs = 0, runs = 0, H = 0, E = 0, over = false;
  const b = [false, !!onSecond, false];
  while (outs < 3 && !over) {
    let x = r(), o = 'out';
    for (const k of ['k', 'bb', 'hbp', 'hr', 'tri', 'dbl', 'sgl', 'err']) { if ((x -= p[k]) < 0) { o = k; break; } }
    let n = 0;
    switch (o) {
      case 'k': outs++; break;
      case 'bb': case 'hbp': if (b[0] && b[1] && b[2]) n++; b[2] = b[2] || (b[0] && b[1]); b[1] = b[1] || b[0]; b[0] = true; break;
      case 'hr': n = 1 + b.filter(Boolean).length; b[0] = b[1] = b[2] = false; H++; break;
      case 'tri': n = b.filter(Boolean).length; b[0] = b[1] = false; b[2] = true; H++; break;
      case 'dbl': { if (b[2]) n++; if (b[1]) n++; const third = b[0] && !(r() < 0.45 && ++n); b[0] = false; b[1] = true; b[2] = !!third; H++; break; }
      case 'sgl': case 'err': {
        const nb = [true, false, false];
        if (b[2]) n++;
        if (b[1]) { if (r() < (o === 'sgl' ? 0.6 : 0.4)) n++; else nb[2] = true; }
        if (b[0]) { if (o === 'sgl' && !nb[2] && r() < 0.28) nb[2] = true; else nb[1] = true; }
        b[0] = nb[0]; b[1] = nb[1]; b[2] = nb[2];
        if (o === 'sgl') H++; else E++;
        break;
      }
      default:
        outs++;
        if (outs < 3 && b[0] && r() < 0.13) { outs++; b[0] = false; }
        if (outs < 3) { if (b[2] && r() < 0.42) { n++; b[2] = false; } if (b[1] && !b[2] && r() < 0.35) { b[2] = true; b[1] = false; } }
    }
    for (let i = 0; i < n && !over; i++) { runs++; over = onRun(); }
  }
  return { runs, H, E };
}
function playInnings(sport, H, A, o) {
  const r = o.r, pr = sport.params;
  const boost = Math.sqrt(pr.avgRuns / 5);
  const ph = paProbs(H.off, A.def, boost), pa = paProbs(A.off, H.def, boost);
  const line = [[], []], he = { H: [0, 0], E: [0, 0] };
  let hs = 0, as = 0, inn = 0;
  const [mercyRuns, mercyInn] = o.playoff ? [99, 99] : pr.mercy;
  while (true) {
    inn++;
    const tb = pr.tiebreak && inn > pr.innings;
    const top = half(pa, r, tb, () => false);
    as += top.runs; line[1].push(top.runs); he.H[1] += top.H; he.E[0] += top.E;
    if (inn >= pr.innings && hs > as) { line[0].push(null); break; }
    if (inn >= mercyInn && hs - as >= mercyRuns) { line[0].push(null); break; }
    const bot = half(ph, r, tb, () => { hs++; return (inn >= pr.innings && hs > as) || (inn >= mercyInn && hs - as >= mercyRuns); });
    line[0].push(bot.runs); he.H[0] += bot.H; he.E[1] += bot.E;
    if (inn >= pr.innings && hs !== as) break;
    if (inn >= mercyInn && Math.abs(hs - as) >= mercyRuns) break;
    if (inn >= pr.innings + 9) { if (hs === as) { line[0][line[0].length - 1]++; hs++; } break; }
  }
  return { hs, as, line, ot: Math.max(0, inn - pr.innings), hits: he.H, errors: he.E };
}

// -------------------------------------------------------------------- sets
// Rally scoring. Each rally goes to the home side with a chance set by the
// rating gap. Beach volleyball is a dual: five pairs each play a match and
// the team score is pairs won.
function rally(H, A) { return clamp(0.5 + (ovr(H) - ovr(A)) * 0.0045, 0.3, 0.7); }
function playSet(p, to, r) {
  let a = 0, b = 0;
  while (!((a >= to || b >= to) && Math.abs(a - b) >= 2)) { if (r() < p) a++; else b++; }
  return [a, b];
}
function playMatch(p, pr, r) {
  const need = Math.ceil(pr.bestOf / 2), sets = [[], []];
  let w = 0, l = 0;
  while (w < need && l < need) {
    const last = w + l === pr.bestOf - 1;
    const [a, b] = playSet(p, last ? pr.last : pr.to, r);
    sets[0].push(a); sets[1].push(b);
    if (a > b) w++; else l++;
  }
  return { w, l, sets };
}
function playSets(sport, H, A, o) {
  const r = o.r, pr = sport.params, p = rally(H, A);
  if (!pr.flights) {
    const m = playMatch(p, pr, r);
    return { hs: m.w, as: m.l, line: m.sets, ot: 0 };
  }
  const line = [[], []], detail = [];
  let hs = 0, as = 0;
  for (let i = 0; i < pr.flights; i++) {
    // Top pairs are closer to the team's level than the bottom ones.
    const m = playMatch(clamp(0.5 + (p - 0.5) * (0.55 + i * 0.1), 0.3, 0.7), pr, r);
    const won = m.w > m.l;
    line[0].push(won ? 1 : 0); line[1].push(won ? 0 : 1);
    detail.push(m.sets[0].map((x, j) => `${x}-${m.sets[1][j]}`).join(', '));
    if (won) hs++; else as++;
  }
  return { hs, as, line, ot: 0, detail };
}

const MODELS = { football: playFootball, periods: playPeriods, innings: playInnings, sets: playSets };

export function play(sport, home, away, { neutral = false, playoff = false, seed, r } = {}) {
  r = r || makeRng(seed ?? Math.floor(Math.random() * 2 ** 31));
  const H = edge(home, !neutral);
  return MODELS[sport.model](sport, H, away, { r, playoff });
}

// Winner of a finished game: 'home', 'away' or null for a tie.
export function winner(g) {
  if (g.hs > g.as) return 'home';
  if (g.as > g.hs) return 'away';
  return g.so || null;
}

// Chance the home team wins, used for rating changes and previews. Each
// sport's `wp` spread was measured by simulating its model (see tests).
export function winProbability(sport, home, away, neutral = false) {
  const d = ovr(home) - ovr(away) + (neutral ? 0 : HOME_EDGE);
  return 1 / (1 + Math.exp(-d / (sport.wp || 8)));
}
