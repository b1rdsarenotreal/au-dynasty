// A school's pages, like a team website: a header in the school's colors,
// a tab for every sport it plays, and
// - all sports: the banners (national titles, regular-season conference
//   titles and conference tournament titles), All-Sports Cup finishes and a
//   card per sport;
// - one sport: its banners, a season picked by year (snapshot and schedule
//   with results), a short program history, coaches and every season.
// Routes: #/school/<name>, #/school/<name>/<sport>, #/school/<name>/<sport>/<year>.

import { ctx, app, esc, dynasties, schoolLook, logoImg, confLogo, rec, confRec, seasonLabel, seasonSpan } from './ui.js?v=20261122201752';
import { tournamentUrl } from './tournament.js?v=20261122201752';
import { conferenceUrl } from './conference.js?v=20261122201752';
import { cupStandings, cupYears, FINISH_LABEL } from './cup.js?v=20261122201752';
import { schoolSeasons, schoolTotals, homeConference } from './views.js?v=20261122201752';
import { pct } from './extract.js?v=20261122201752';
import { appHref, openApp } from './live.js?v=20261122201752';

const enc = encodeURIComponent;
export const schoolUrl = (name, sport, year) => `#/school/${enc(name)}${sport ? `/${enc(sport)}` : ''}${sport && year ? `/${year}` : ''}`;
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAME = { Mon: 'Mon.', Tue: 'Tue.', Wed: 'Wed.', Thu: 'Thu.', Fri: 'Fri.', Sat: 'Sat.', Sun: 'Sun.' };
const MON = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
const ordinal = n => `${n}${[, 'st', 'nd', 'rd'][(n % 100 >> 3 ^ 1) && n % 10] || 'th'}`;
const pct3 = r => (r.w + r.l + r.t ? pct(r).toFixed(3).replace(/^0/, '') : '—');

const lum = c => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return 0; const n = parseInt(m[1], 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
// Text on a gold national-title banner: the school's darker color, or
// near-black when both its colors are light.
const goldInk = (c1, c2) => (lum(c1) < 0.35 ? c1 : lum(c2) < 0.35 ? c2 : '#1d2329');
function readableOn(bg) {
  const m = /^#?([0-9a-f]{6})$/i.exec(bg || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#111' : '#fff';
}
// The school's colors, with a fallback for a second color too close to the first.
function colorsOf(name) {
  const look = schoolLook(name);
  const c1 = /^#[0-9a-f]{6}$/i.test(look.color || '') ? look.color : '#33424d';
  let c2 = /^#[0-9a-f]{6}$/i.test(look.altColor || '') ? look.altColor : '#ffffff';
  if (c2.toLowerCase() === c1.toLowerCase()) c2 = '#ffffff';
  return { c1, c2, ink: readableOn(c1) };
}

// ---------- banners ----------

// Every banner a school has earned, in one sport or all: national titles
// first, then regular-season and tournament conference titles, newest first.
export function bannersOf(name, sportId = null) {
  const out = [];
  for (const d of dynasties()) {
    if (sportId && d.sport.id !== sportId) continue;
    for (const [y, s] of Object.entries(d.years)) {
      const t = s.teams[name];
      if (!t) continue;
      if (t.finish === 'champion') out.push({ kind: 'national', d, y: +y, title: 'National Champions' });
      if (t.regChamp && t.conf) out.push({ kind: 'reg', d, y: +y, conf: t.conf, title: 'Champions', full: `${t.conf} Champions` });
      if (t.tourneyChamp && t.conf) out.push({ kind: 'tourney', d, y: +y, conf: t.conf, title: 'Tournament Champions', full: `${t.conf} Tournament Champions` });
    }
  }
  const rank = { national: 0, reg: 1, tourney: 2 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || b.y - a.y || a.d.sport.name.localeCompare(b.d.sport.name));
}
function bannerHtml(name, b, showSport) {
  const { c1, c2, ink } = colorsOf(name);
  return `<a class="banner ${b.kind}" href="${b.kind === 'national' ? tournamentUrl(b.d.sport.id, b.y) : conferenceUrl(b.conf, b.d.sport.id, b.y)}" style="--bc:${c1};--bt:${c2};--bi:${ink};--gi:${goldInk(c1, c2)}" title="${esc(`${seasonLabel(b.y)} ${b.full || b.title} · ${b.d.sport.name}${b.kind === 'national' ? ' · see the national tournament' : ' · see the conference season'}`)}">
    <span class="bn-logo">${logoImg(name, 30)}</span>
    ${b.kind === 'national' ? '<span class="bn-star">★</span>' : ''}
    <span class="bn-year">${seasonLabel(b.y)}</span>
    ${b.conf ? `<span class="bn-conf" title="${esc(b.conf)}">${confLogo(b.d, b.conf, 40)}</span>` : ''}
    <span class="bn-title">${esc(b.title)}</span>
    ${showSport ? `<span class="bn-sport">${esc(b.d.sport.name)}</span>` : ''}
  </a>`;
}
function rafters(name, list, showSport, empty) {
  if (!list.length) return `<div class="rafters empty-rafters"><p class="muted">${empty}</p></div>`;
  const count = k => list.filter(b => b.kind === k).length;
  const sum = [['national', 'national title'], ['reg', 'regular-season conference title'], ['tourney', 'conference tournament title']]
    .map(([k, l]) => (count(k) ? `${count(k)} ${l}${count(k) > 1 ? 's' : ''}` : '')).filter(Boolean).join(' · ');
  return `<div class="rafters"><div class="rafter-bar"></div><div class="banner-row">${list.map(b => bannerHtml(name, b, showSport)).join('')}</div></div><p class="small muted banner-sum">${sum}</p>`;
}

// ---------- schedule ----------

// A game's calendar date from its sport's calendar: week and day, a week
// later for a postseason game played after its event's weekend (order 7 or
// more, or a Monday to Wednesday game after an earlier one later in the week).
export function gameDay(d, y, g, games) {
  const start = d.sport.start?.(y);
  if (!start || !g.w) return null;
  let n = (g.w - 1) * 7 + Math.max(0, DOW.indexOf(g.d));
  const after = (g.o ?? 0) >= 7 || (g.t && g.t !== 'conf' && ['Mon', 'Tue', 'Wed'].includes(g.d)
    && games.some(x => x.e && x.e === g.e && x.w === g.w && (x.o ?? 0) < (g.o ?? 0) && DOW.indexOf(x.d) > DOW.indexOf(g.d)));
  if (after) n += 7;
  const date = new Date(start); date.setUTCDate(date.getUTCDate() + n);
  return date;
}
// The score note: overtimes, extra innings or a shortened game, and the shootout.
export function scoreNote(d, s, g) {
  const reg = s.reg ?? d.sport.reg;
  let note = '';
  if (reg && g.x && g.x !== reg) {
    if (d.sport.innings) note = `${g.x} inn.`;
    else if (g.x > reg) note = g.x - reg === 1 ? 'OT' : `${g.x - reg}OT`;
  }
  return note;
}
function scheduleHtml(d, y, s, name) {
  const games = (s.games || []).filter(g => g.h === name || g.a === name);
  if (!games.length) return '<p class="muted">No schedule for this season. Upload its backup again to add it (schedules are kept from now on).</p>';
  const rows = games.map(g => ({ g, date: gameDay(d, y, g, s.games) }))
    .sort((a, b) => (a.date && b.date ? a.date - b.date : 0) || a.g.w - b.g.w || DOW.indexOf(a.g.d) - DOW.indexOf(b.g.d) || (a.g.o ?? 0) - (b.g.o ?? 0));
  // As on the sport apps' team pages: one box for the regular season, one
  // per preseason tournament, one for the conference tournament and one for
  // the national tournament, each with its record.
  const natName = s.finalsName ? 'National tournament' : 'National tournament';
  const boxOf = g => (g.t === 'conf' ? 'conf' : g.t ? 'nat' : g.lb && g.n ? `t:${g.lb}` : 'reg');
  const titleOf = k => (k === 'reg' ? 'Regular season' : k === 'conf' ? 'Conference tournament' : k === 'nat' ? natName : k.slice(2));
  const boxes = [];
  for (const r of rows) { const k = boxOf(r.g); let b = boxes.find(x => x.k === k); if (!b) boxes.push(b = { k, rows: [] }); b.rows.push(r); }
  const ord = k => (k.startsWith('t:') ? 0 : k === 'reg' ? 1 : k === 'conf' ? 2 : 3);
  boxes.sort((a, b) => ord(a.k) - ord(b.k));
  const conf = s.teams[name]?.conf;
  const recOf = list => {
    const r = { w: 0, l: 0, t: 0, cw: 0, cl: 0, ct: 0 };
    for (const { g } of list) {
      const res = resultOf(d, name, g);
      if (!res) continue;
      r[res.toLowerCase()]++;
      if (g.c && !g.t) r['c' + res.toLowerCase()]++;
    }
    return r;
  };
  const row = ({ g, date }) => {
    const home = g.h === name, opp = home ? g.a : g.h, res = resultOf(d, name, g);
    const where = g.n ? 'Neutral' : home ? 'Home' : 'Away';
    const place = g.v || (g.n && g.hs && g.hs !== name && g.hs !== opp ? g.hs : '') || (g.t === 'mcws' ? s.venue : '');
    const round = g.t ? (g.lb || '') : '';
    const oc = g.c ? (s.teams[opp]?.conf || conf) : null;
    const score = g.hr == null ? '' : `${home ? g.hr : g.ar}-${home ? g.ar : g.hr}`;
    const note = [g.hr != null ? scoreNote(d, s, g) : '', g.pk ? `${d.sport.pkWins ? 'SO' : 'PK'} ${home ? g.pk[0] : g.pk[1]}-${home ? g.pk[1] : g.pk[0]}` : ''].filter(Boolean).join(', ');
    return `<div class="ts2-row"><span class="ts2-date">${date ? `${DAY_NAME[g.d] || g.d} ${MON[date.getUTCMonth()]} ${date.getUTCDate()}` : `Week ${g.w}`}</span><span class="ts2-where">${where}</span>
      <span class="ts2-opp"><span class="ts2-vs">${g.n || home ? 'vs' : 'at'}</span><span class="ts2-logo">${logoImg(opp, 26)}</span><a class="team-link" href="${schoolUrl(opp, d.sport.id, y)}">${esc(opp)}</a>${oc && !g.t ? `<span class="ts2-conf" title="${esc(oc)} ${esc(d.sport.unit || 'game')}">${confLogo(d, oc, 20)}</span>` : ''}</span>
      <span class="ts2-venue">${place ? `<b>${esc(place)}</b>` : ''}${round ? `<span>${esc(round)}</span>` : ''}</span>
      <span class="ts2-res">${res ? `<span class="ts2-wl ${res.toLowerCase()}">${res}</span><b>${score}</b>${note ? `<small>${esc(note)}</small>` : ''}` : '<span class="muted">—</span>'}</span></div>`;
  };
  return boxes.map(b => {
    const r = recOf(b.rows), played = r.w + r.l + r.t;
    const hrec = played ? `${rec(r)}${b.k === 'reg' && r.cw + r.cl + r.ct ? ` · ${esc(d.conferences?.[conf]?.abbr || 'Conf')} ${confRec(r)}` : ''}` : '';
    return `<div class="ts2-box"><div class="ts2-head">${esc(titleOf(b.k))}${hrec ? `<span class="ts2-hrec">${hrec}</span>` : ''}</div>
      <div class="ts2-scroll"><div class="ts2-cols"><span>Date</span><span>Where</span><span>Opponent</span><span>Venue</span><span>Result</span></div>${b.rows.map(row).join('')}</div></div>`;
  }).join('');
}
// W, L or T for a school in a played game (a shootout decides it where the
// sport counts it, field hockey; a soccer shootout leaves a tie).
function resultOf(d, name, g) {
  if (g.hr == null) return null;
  const home = g.h === name, us = home ? g.hr : g.ar, them = home ? g.ar : g.hr;
  if (us !== them) return us > them ? 'W' : 'L';
  if (g.pk && d.sport.pkWins) { const [ph, pa] = g.pk; return (home ? ph > pa : pa > ph) ? 'W' : 'L'; }
  return 'T';
}

// ---------- one sport ----------

// A team's place in its conference standings that season ("2nd", "T-3rd").
function confPlace(d, s, name) {
  const t = s.teams[name];
  if (!t?.conf || !(t.cw + t.cl + t.ct)) return null;
  const score = r => (d.sport.ties ? (3 * r.cw + r.ct) / (r.cw + r.cl + r.ct) : (r.cw + r.ct / 2) / (r.cw + r.cl + r.ct));
  const mates = Object.values(s.teams).filter(x => x.conf === t.conf && x.cw + x.cl + x.ct);
  const me = score(t), better = mates.filter(x => score(x) > me + 1e-9).length, same = mates.filter(x => Math.abs(score(x) - me) < 1e-9).length;
  return `${same > 1 ? 'T-' : ''}${ordinal(better + 1)}`;
}
function finishLine(d, s, t) {
  if (!t.finish) return 'Did not make the national tournament';
  const what = t.finish === 'champion' ? '🏆 National champions' : t.finish === 'finals' ? `Reached the ${s.finalsName}` : t.finish === 'runner-up' ? 'National runner-up' : t.finish === 'super' ? 'Reached the super regionals' : 'National tournament';
  return `${what}${t.seed ? ` · ${t.seed} seed` : ''}${t.natW + t.natL ? ` · ${t.natW}-${t.natL}` : ''}`;
}
// Coaches in order, each with their run of seasons.
function coachRuns(rows) {
  const runs = [];
  for (const r of rows) {
    const name = r.t.coach || 'Unknown';
    const last = runs[runs.length - 1];
    if (last && last.name === name && last.to === r.y - 1) { last.to = r.y; last.rows.push(r); } else runs.push({ name, from: r.y, to: r.y, rows: [r] });
  }
  return runs.map(run => {
    const tot = { w: 0, l: 0, t: 0 };
    for (const { t } of run.rows) { tot.w += t.w; tot.l += t.l; tot.t += t.t; }
    return { ...run, tot, nat: run.rows.filter(r => r.t.finish === 'champion').length, reg: run.rows.filter(r => r.t.regChamp).length, tour: run.rows.filter(r => r.t.tourneyChamp).length, bids: run.rows.filter(r => r.t.finish).length };
  });
}
// A few sentences on the program, from its seasons.
function synopsis(name, d, rows) {
  const tot = { w: 0, l: 0, t: 0, cw: 0, cl: 0, ct: 0 };
  for (const { t } of rows) for (const k of Object.keys(tot)) tot[k] += t[k] || 0;
  const done = rows.filter(r => r.s.complete);
  const nat = rows.filter(r => r.t.finish === 'champion'), reg = rows.filter(r => r.t.regChamp), tour = rows.filter(r => r.t.tourneyChamp), bids = done.filter(r => r.t.finish);
  const finals = rows.filter(r => ['champion', 'runner-up', 'finals'].includes(r.t.finish));
  const span = seasonSpan(rows[0].y, rows[rows.length - 1].y);
  const look = schoolLook(name), team = look.mascot ? `the ${look.mascot}` : name;
  const out = [`${name} has played ${rows.length} season${rows.length === 1 ? '' : 's'} of ${d.sport.name.toLowerCase()} in the dynasty (${span}), going ${rec(tot)} overall (${pct3(tot)})${tot.cw + tot.cl + tot.ct ? ` and ${confRec(tot)} in conference play` : ''}.`];
  const honors = [];
  if (nat.length) honors.push(`${nat.length === 1 ? 'a national title' : `${nat.length} national titles`} (${nat.map(r => seasonLabel(r.y)).join(', ')})`);
  if (reg.length) honors.push(`${reg.length} regular-season conference title${reg.length > 1 ? 's' : ''}`);
  if (tour.length) honors.push(`${tour.length} conference tournament title${tour.length > 1 ? 's' : ''}`);
  if (honors.length) out.push(`The program has won ${honors.length > 1 ? `${honors.slice(0, -1).join(', ')} and ${honors[honors.length - 1]}` : honors[0]}.`);
  if (done.length) out.push(bids.length ? `It has made the national tournament ${bids.length} time${bids.length > 1 ? 's' : ''} in ${done.length} finished season${done.length > 1 ? 's' : ''}${finals.length && !nat.length ? `, reaching the ${rows[0].s.finalsName} ${finals.length === 1 ? 'once' : `${finals.length} times`}` : ''}.` : `It hasn't made the national tournament yet.`);
  const rank = r => (r.t.finish === 'champion' ? 5 : r.t.finish === 'runner-up' ? 4 : r.t.finish === 'finals' ? 3 : r.t.finish === 'super' ? 2 : r.t.finish ? 1 : 0);
  const best = [...done].sort((a, b) => rank(b) - rank(a) || pct(b.t) - pct(a.t))[0];
  if (best && rows.length > 1) out.push(`Best season: ${seasonLabel(best.y)}, ${rec(best.t)}${best.t.finish ? `, ${best.t.finish === 'champion' ? 'national champions' : best.t.finish === 'finals' ? `a trip to the ${best.s.finalsName}` : (FINISH_LABEL[best.t.finish] || '').toLowerCase()}` : best.t.regChamp ? ', conference champions' : ''}.`);
  const runs = coachRuns(rows), cur = runs[runs.length - 1];
  if (cur && cur.name !== 'Unknown') out.push(`${cur.name} has coached ${team} since ${seasonLabel(cur.from)}${cur.rows.length > 1 ? `, going ${rec(cur.tot)}` : ''}.`);
  return out.join(' ');
}

function renderSport(name, d, yearArg) {
  const rows = schoolSeasons(name).filter(r => r.d.sport.id === d.sport.id).sort((a, b) => a.y - b.y);
  const years = rows.map(r => r.y);
  const y = years.includes(+yearArg) ? +yearArg : years[years.length - 1];
  const cur = rows.find(r => r.y === y), { s, t } = cur;
  const place = confPlace(d, s, name);
  const snap = (v, l) => `<div class="snap"><div class="v">${v}</div><div class="l">${l}</div></div>`;
  const titles = [t.regChamp ? 'Regular-season conference champions' : '', t.tourneyChamp ? 'Conference tournament champions' : ''].filter(Boolean);
  const runs = coachRuns(rows);
  return `
    <div class="card">
      <div class="row season-head"><h2 style="margin:0">${seasonLabel(y)} ${esc(d.sport.name)}</h2>${s.complete ? '' : '<span class="badge">In progress</span>'}<span class="spacer"></span>
        <label class="small muted">Season <select id="sch-year">${[...years].reverse().map(v => `<option value="${v}" ${v === y ? 'selected' : ''}>${seasonLabel(v)}</option>`).join('')}</select></label></div>
      <p class="season-line">${s.complete || t.finish ? esc(finishLine(d, s, t)).replace('🏆', '🏆') : 'Season in progress'}${t.finish && s.nt ? ` · <a href="${tournamentUrl(d.sport.id, Object.keys(d.years).find(k => d.years[k] === s))}">Bracket →</a>` : ''}${titles.length ? ` · <b>${titles.join(' · ')}</b>` : ''}</p>
      <h3>Schedule &amp; results</h3>
      ${scheduleHtml(d, y, s, name)}
    </div>
    <div class="card"><h2>${esc(d.sport.name)} banners</h2>${rafters(name, bannersOf(name, d.sport.id), false, 'No banners in this sport yet.')}</div>
    <div class="card"><h2>Program history</h2><p class="synopsis">${esc(synopsis(name, d, rows))}</p>
      <div class="table-wrap"><table><thead><tr><th>Season</th><th>Coach</th><th class="num">Record</th><th class="num">Conf.</th><th>Titles</th><th>National tournament</th><th class="num">Final rank</th></tr></thead><tbody>
        ${[...rows].reverse().map(r => `<tr class="${r.y === y ? 'cur' : ''}"><td><a href="${schoolUrl(name, d.sport.id, r.y)}">${seasonLabel(r.y)}</a>${r.s.complete ? '' : '<span class="muted">*</span>'}</td><td class="small">${esc(r.t.coach || '—')}</td><td class="num">${rec(r.t)}</td><td class="num">${r.t.cw + r.t.cl + r.t.ct ? confRec(r.t) : ''}${confPlace(d, r.s, name) ? ` <span class="muted small">${confPlace(d, r.s, name)}</span>` : ''}</td>
          <td>${r.t.regChamp ? '<span class="badge">Reg. season</span> ' : ''}${r.t.tourneyChamp ? '<span class="badge gold">Tournament</span>' : ''}</td>
          <td class="small">${r.t.finish ? esc(finishLine(d, r.s, r.t)) : '<span class="muted">—</span>'}</td><td class="num">${r.t.rank ?? '<span class="muted">NR</span>'}</td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="card"><h2>Coaches</h2><div class="table-wrap"><table><thead><tr><th>Coach</th><th>Seasons</th><th class="num">Record</th><th class="num">Pct.</th><th class="num" title="Regular-season conference titles">Conf.</th><th class="num" title="Conference tournament titles">Tourn.</th><th class="num" title="National tournament appearances">Bids</th><th class="num">Nat. titles</th></tr></thead><tbody>
      ${[...runs].reverse().map(c => `<tr><td><b>${esc(c.name)}</b></td><td>${seasonSpan(c.from, c.to)} <span class="muted small">(${c.rows.length})</span></td><td class="num">${rec(c.tot)}</td><td class="num">${pct3(c.tot)}</td><td class="num">${c.reg || ''}</td><td class="num">${c.tour || ''}</td><td class="num">${c.bids || ''}</td><td class="num">${c.nat ? `<b>${c.nat}</b>` : ''}</td></tr>`).join('')}
    </tbody></table></div></div>`;
}

// ---------- the header, like the sport apps' team pages ----------

const TROPHY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/></svg>';
// The school's color behind the header (its second color when the first is
// white or black), the text on it, and an accent (its other color when that
// reads on it).
function heroColors(name) {
  const look = schoolLook(name), ok = c => /^#[0-9a-f]{6}$/i.test(c || '');
  const bg = ok(look.color) && !['#ffffff', '#000000'].includes(look.color.toLowerCase()) ? look.color : ok(look.altColor) && look.altColor.toLowerCase() !== '#ffffff' ? look.altColor : '#0b1f3a';
  const ink = readableOn(bg), alt = bg === look.color ? look.altColor : look.color;
  const contrast = (a, b) => Math.abs(lum(a) - lum(b));
  const acc = ok(alt) && contrast(alt, bg) > 0.35 ? alt : ink === '#111' ? '#3a3a3a' : '#f6efd9';
  return { bg, ink, acc };
}
// A banner in the header: national titles in gold with a trophy, conference
// titles with the conference's logo. `withSport` names the sport (all-sports view).
function heroBanner(b, name, withSport) {
  const sp = withSport ? `${esc(b.d.sport.short || b.d.sport.name)} · ` : '';
  if (b.kind === 'national') return `<a class="th-banner gold" href="${tournamentUrl(b.d.sport.id, b.y)}">${TROPHY}<b>${esc(seasonLabel(b.y))}</b><span>${sp}National champions</span></a>`;
  const abbr = b.d.conferences?.[b.conf]?.abbr || b.conf;
  return `<a class="th-banner" href="${conferenceUrl(b.conf, b.d.sport.id, b.y)}">${confLogo(b.d, b.conf, 24)}<b>${esc(seasonLabel(b.y))}</b><span>${sp}${esc(abbr)} ${b.kind === 'tourney' ? 'tournament' : 'champions'}</span></a>`;
}
function schoolHero(name, { kick = '', rank = null, sub = '', banners = [], stats = [], withSport = false }) {
  const look = schoolLook(name), { bg, ink, acc } = heroColors(name);
  const stat = ([v, l]) => `<div class="th-stat"><b>${v}</b><span>${l}</span></div>`;
  return `<section class="team-hero2" style="--tb:${esc(bg)};--ti:${ink};--ta:${esc(acc)}">
    <div class="th-top">
      <div class="th-logo">${logoImg(name, 96)}</div>
      <div class="th-main">
        ${kick ? `<span class="th-kick">${kick}</span>` : ''}
        <h1 class="th-name">${rank ? `<span class="th-rank">${rank}</span>` : ''}${esc(name)}${look.mascot ? ` <span class="th-mascot">${esc(look.mascot)}</span>` : ''}</h1>
        ${sub ? `<span class="th-sub">${sub}</span>` : ''}
      </div>
      ${banners.length ? `<div class="th-banners">${banners.slice(0, 4).map(b => heroBanner(b, name, withSport)).join('')}</div>` : ''}
    </div>
    ${stats.length ? `<div class="th-strip">${stats.map(stat).join('')}</div>` : ''}
  </section>`;
}
const FINISH_SHORT = { champion: 'Champions', 'runner-up': 'Runner-up', finals: 'Finals', super: 'Super regional', field: 'In the field' };
const forAgainst = sport => (/volleyball/.test(sport.id) ? 'Sets won–lost' : /basketball/.test(sport.id) ? 'Points for–against' : sport.innings ? 'Runs for–against' : 'Goals for–against');

// ---------- all sports ----------

function renderAll(name, sportOrder, bySport) {
  const x = schoolTotals(name);
  const cupRows = cupYears(ctx.history).map(y => { const c = cupStandings(ctx.history, y); const i = c.schools.findIndex(s => s.school === name); return i < 0 ? null : { y, rank: i + 1, ...c.schools[i], of: c.schools.length }; }).filter(Boolean).reverse();
  const kpi = (v, l) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`;
  return `
    <div class="card"><h2>Banners</h2>${rafters(name, bannersOf(name), true, 'No banners yet: national titles and conference titles hang here.')}</div>
    <div class="sport-cards">${sportOrder.map(id => {
      const { d, rows } = bySport[id], last = rows[rows.length - 1];
      const tot = rows.reduce((a, r) => ({ w: a.w + r.t.w, l: a.l + r.t.l, t: a.t + r.t.t }), { w: 0, l: 0, t: 0 });
      const n = bannersOf(name, id).length;
      return `<a class="card sport-card" href="${schoolUrl(name, id)}"><div class="sc-name">${esc(d.sport.name)}</div>
        <div class="sc-rec"><b>${rec(last.t)}</b> <span class="muted small">${seasonLabel(last.y)}${last.t.conf ? ` · ${esc(d.conferences?.[last.t.conf]?.abbr || last.t.conf)}` : ''}</span></div>
        <div class="small">${last.s.complete || last.t.finish ? esc(finishLine(d, last.s, last.t)) : 'In progress'}</div>
        <div class="small muted">All-time ${rec(tot)}${n ? ` · ${n} banner${n > 1 ? 's' : ''}` : ''}</div></a>`;
    }).join('')}</div>
    ${cupRows.length ? `<div class="card"><h2>All-Sports Cup</h2><div class="table-wrap"><table><thead><tr><th>Season</th><th class="num">Rank</th><th class="num">Points</th>${dynasties().map(d => `<th class="num" title="${esc(d.sport.name)}">${esc(d.sport.short)}</th>`).join('')}</tr></thead><tbody>
      ${cupRows.map(c => `<tr><td>${seasonLabel(c.y)}</td><td class="num"><b>${c.rank}</b> <span class="muted small">of ${c.of}</span></td><td class="num"><b>${c.total}</b></td>${dynasties().map(d => `<td class="num">${c.bySport[d.sport.id] ?? '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div></div>` : ''}`;
}

export function renderSchool(parts) {
  const [name, sportId, year] = parts;
  const rows = schoolSeasons(name);
  if (!rows.length) { app.innerHTML = `<div class="empty">No history for ${esc(name)} yet. <a href="#/schools">All schools</a></div>`; return; }
  const bySport = {};
  for (const r of rows) (bySport[r.d.sport.id] ||= { d: r.d, rows: [] }).rows.push(r);
  for (const v of Object.values(bySport)) v.rows.sort((a, b) => a.y - b.y);
  const sportOrder = dynasties().map(d => d.sport.id).filter(id => bySport[id]);
  const active = bySport[sportId] ? sportId : null;
  const tabs = `<nav class="team-tabs" style="--tc:${esc(heroColors(name).bg)}"><a href="${schoolUrl(name)}" class="${active ? '' : 'active'}">All sports</a>${sportOrder.map(id => `<a href="${schoolUrl(name, id)}" class="${id === active ? 'active' : ''}">${esc(bySport[id].d.sport.name)}</a>`).join('')}<span class="spacer"></span><a class="tt-all" href="#/schools">All schools</a></nav>`;
  let hero;
  if (active) {
    const { d, rows: sr } = bySport[active];
    const years = sr.map(r => r.y), y = years.includes(+year) ? +year : years[years.length - 1];
    const { s, t } = sr.find(r => r.y === y), place = confPlace(d, s, name);
    const live = appHref(d.sport.id) && (ctx.live || []).some(x => x.sport.id === d.sport.id);
    hero = schoolHero(name, {
      kick: `${t.conf ? `<a href="${conferenceUrl(t.conf, d.sport.id, y)}">${esc(t.conf)}</a> · ` : ''}${esc(d.sport.name)} · ${esc(seasonLabel(y))}`,
      rank: t.rank || null,
      sub: `${t.coach ? `Head coach ${esc(t.coach)}` : ''}${live ? `${t.coach ? ' · ' : ''}<a href="${esc(appHref(d.sport.id, `#/team/${encodeURIComponent(name)}`))}" data-open="${esc(d.sport.id)}">Open in the ${esc(d.sport.name)} app ›</a>` : ''}`,
      banners: bannersOf(name, d.sport.id),
      stats: [[rec(t), 'Overall'], ...(t.cw + t.cl + t.ct ? [[confRec(t), `${esc(d.conferences?.[t.conf]?.abbr || 'Conf')}${place ? ` · ${place}` : ''}`]] : []), [t.rank ? `No. ${t.rank}` : 'NR', 'Final poll'],
        [t.finish ? esc(FINISH_SHORT[t.finish] || '') : s.complete ? '—' : '…', t.seed ? `National · ${t.seed} seed` : 'National tournament'], [`${t.gf ?? 0}–${t.ga ?? 0}`, forAgainst(d.sport)]],
    });
  } else {
    const x = schoolTotals(name), home = homeConference(name);
    hero = schoolHero(name, {
      kick: `${home?.conf ? `<a href="${conferenceUrl(home.conf)}">${esc(home.conf)}</a> · ` : ''}${sportOrder.length} sport${sportOrder.length > 1 ? 's' : ''}`,
      sub: sportOrder.map(id => esc(bySport[id].d.sport.short || bySport[id].d.sport.name)).join(' · '),
      banners: bannersOf(name).filter(b => b.kind === 'national').sort((a, b) => b.y - a.y), withSport: true,
      stats: [[x.titles, 'National titles'], [x.reg, 'Conference titles'], [x.tour, 'Conf. tournaments'], [x.bids, 'National tournaments'], [x.cups, 'All-Sports Cups'], [rec(x), 'All-time']],
    });
  }
  app.innerHTML = `${hero}${tabs}
    ${active ? renderSport(name, bySport[active].d, year) : renderAll(name, sportOrder, bySport)}`;
  document.querySelectorAll('[data-open]').forEach(el => (el.onclick = () => openApp(el.dataset.open)));
  const sel = document.getElementById('sch-year');
  if (sel) sel.onchange = () => { location.hash = schoolUrl(name, active, sel.value); };
}
