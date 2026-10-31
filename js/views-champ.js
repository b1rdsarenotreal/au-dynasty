// Postseason pages for one sport: conference tournaments, selection, and the
// national championship; plus the editors for championship formats and
// conference tournaments.

import { esc, L, $, $$, changed, toast, school, confBadge, openModal, options, sportHref, readableOn } from './ui.js?v=20261030224435';
import { EVENT_KINDS, HOSTING, poolTable, roundLabel, advancers } from './events.js?v=20261030224435';
import { confTourneySettings, redrawConfTourney, openSelection, selectionData, confirmTeams, announce, ensureChamp, autoBids, regTitles, finishOf } from './champs.js?v=20261030224435';
import { committeePicks, compare, eligible, quadCuts } from './selection.js?v=20261030224435';
import { confStandings, records, fmtRec } from './standings.js?v=20261030224435';
import { checkFormat, describeFormat, defaultFormat, defaultConfTourney, newStage } from './formats.js?v=20261030224435';
import { winner } from './game.js?v=20261030224435';
import { yearLabel, weekLabel } from './league.js?v=20261030224435';

const editable = (lg, Y) => Y.year === lg.currentYear;

// ------------------------------------------------------------ event drawing
function sideScore(ss, m, t) {
  if (!m.games.length) return '';
  const gs = m.games.map(id => ss.games.find(g => g.id === id)).filter(Boolean);
  if (gs.length === 1) { const g = gs[0]; return g.h === t ? g.hs : g.as; }
  return gs.filter(g => { const w = winner(g); return w && (w === 'home' ? g.h : g.a) === t; }).length;
}

function matchCard(ev, m, ss, sportId) {
  const side = t => {
    if (!t) return `<div class="side l"><span class="seed"></span><span class="muted">${m.bye ? 'Bye' : 'TBD'}</span><span></span></div>`;
    const cls = m.winner ? (m.winner === t ? 'w' : 'l') : '';
    return `<div class="side ${cls}"><span class="seed">${ev.seeds[t] ?? ''}</span>${school(t, { link: false })}<span class="sc">${sideScore(ss, m, t)}</span></div>`;
  };
  const last = m.games[m.games.length - 1];
  const series = m.games.length > 1 ? `<div class="mnote">${ev.kind === 'pool' ? `${m.games.length} games` : `Series ${Math.max(sideScore(ss, m, m.a), sideScore(ss, m, m.b))}-${Math.min(sideScore(ss, m, m.a), sideScore(ss, m, m.b))}`}</div>` : '';
  return `<div class="match ${last ? 'click' : ''}" ${last ? `data-game="${last}" data-sport="${sportId}"` : ''}>${side(m.a)}${side(m.b)}${series}</div>`;
}

export function hostLine(lg, ev) {
  if (ev.hosting === 'venue') { const v = ev.venues; return v.length ? v.map(x => `${esc(x.name)}${x.city ? `, ${esc(x.city)}` : ''}`).filter((x, i, a) => a.indexOf(x) === i).join(' · ') : 'Neutral site'; }
  if (ev.hosting === 'higherSeed') return 'Higher seed hosts';
  const h = lg.schools[ev.host];
  return h ? `Hosted by ${esc(h.short)} · ${esc(h.city)}${h.state ? `, ${esc(h.state)}` : ''}` : 'Host to be set';
}

function formatLine(ev) {
  const bits = [EVENT_KINDS[ev.kind]];
  if (ev.kind === 'pool') bits.push(`${ev.gpm > 1 ? `${ev.gpm} games vs. each` : 'one game vs. each'}, top ${ev.advance} advance`);
  else {
    if (ev.bestOf > 1) bits.push(`best of ${ev.bestOf}`);
    if (ev.finalBestOf > 1 && ev.finalBestOf !== ev.bestOf) bits.push(`final best of ${ev.finalBestOf}`);
    if ((ev.kind === 'double' || ev.kind === 'playin') && !ev.ifNecessary) bits.push('one-game final');
  }
  return bits.join(', ');
}

export function renderEvent(lg, ss, ev, sportId) {
  const head = `<div class="section-head"><h3 style="margin:0">${esc(ev.name)}</h3><span class="muted small">${formatLine(ev)} · ${hostLine(lg, ev)}</span>${ev.done && ev.winner ? `<span class="pill full">Champion: ${esc(lg.schools[ev.winner]?.short)}</span>` : ''}</div>`;
  if (ev.kind === 'pool') {
    const gameById = id => ss.games.find(g => g.id === id);
    const tbl = poolTable(ev, gameById);
    const rounds = [...new Set(ev.matchups.map(m => m.r))];
    return `${head}<div class="grid wide"><div><table><thead><tr><th>Team</th><th class="num">W-L</th><th class="num">+/-</th></tr></thead><tbody>${tbl.map((x, i) => `<tr class="${i < ev.advance ? 'adv' : ''}"><td><span class="seed">${ev.seeds[x.team]}</span> ${school(x.team)}${i < ev.advance && ev.done ? ' <span class="pill full">Advances</span>' : ''}</td><td class="num">${fmtRec(x.w, x.l, x.tie)}</td><td class="num">${x.pf - x.pa}</td></tr>`).join('')}</tbody></table></div>
      <div class="bracket">${rounds.map(r => `<div class="round"><h3>Round ${r}</h3><div class="ms">${ev.matchups.filter(m => m.r === r).map(m => matchCard(ev, m, ss, sportId)).join('')}</div></div>`).join('')}</div></div>`;
  }
  const rounds = [...new Set(ev.matchups.map(m => m.r))].sort((a, b) => a - b);
  const byes = ev.kind === 'single' && ev.matchups.some(m => m.r === 1 && m.bye);
  const cols = rounds.map(r => {
    const ms = ev.matchups.filter(m => m.r === r && !(ev.kind === 'single' && r === 1 && m.bye && false));
    const groups = {};
    for (const m of ms) (groups[roundLabel(ev, m)] ??= []).push(m);
    const title = ev.kind === 'single' ? (r === 1 && byes ? 'First round' : roundLabel(ev, ms[0])) : `Round ${r}`;
    return `<div class="round"><h3>${title}</h3><div class="ms">${Object.entries(groups).map(([label, list]) => `${ev.kind !== 'single' ? `<div class="small muted">${esc(label)}</div>` : ''}${list.map(m => matchCard(ev, m, ss, sportId)).join('')}`).join('')}</div></div>`;
  }).join('');
  return `${head}<div class="bracket">${cols}</div>`;
}

// ------------------------------------------------- conference tournaments
export function tourneysTab(lg, Y, sport, ss) {
  const groups = confStandings(ss);
  const confs = Object.keys(groups).filter(c => c && lg.conferences[c]).sort((a, b) => lg.conferences[a].name.localeCompare(lg.conferences[b].name));
  if (!confs.length) return '<div class="card empty">No conferences play this sport this year, so there are no conference tournaments.</div>';
  const regEnd = ss.regEnd ?? sport.season[1];
  const drawn = !!ss.ct;
  const ed = editable(lg, Y);
  const intro = drawn ? `<p class="note">Tournaments are drawn from the final standings. ${ed ? 'Each one can be changed (format, teams, seeds, host) until its first game.' : ''} Champions get the automatic bid in conferences with at least ${ensureChamp(sport).autoMin} teams.</p>`
    : `<p class="note">Tournaments are drawn when the regular season ends (${esc(weekLabel(Y.year, regEnd))}) and played the week after. Below is each conference's format and how it would be seeded today.${ed ? ' Changes here become the conference\'s format for this sport.' : ''}</p>`;
  return intro + confs.map(c => {
    const ev = ss.ct?.[c], set = confTourneySettings(lg, c, sport.id), n = groups[c].length;
    const size = Math.min(set.size || 0, n);
    const head = `<div class="section-head"><h2 style="margin:0">${confBadge(c)} ${esc(lg.conferences[c].name)}</h2><span class="muted small">${n} teams${n < ensureChamp(sport).autoMin ? ' · no automatic bid (too few teams)' : ''}</span><div class="spacer"></div>
      ${ed && (!ev || !ev.started) ? `<button class="btn sm" data-ct-edit="${c}">${drawn ? 'Edit this tournament' : 'Edit format'}</button>` : ''}</div>`;
    if (ev) return `<div class="card" id="ct-${c}">${head}${renderEvent(lg, ss, ev, sport.id)}</div>`;
    if (size < 2) return `<div class="card">${head}<p class="muted">No tournament${drawn ? ' this year' : ''}: the regular-season champion takes the automatic bid.</p></div>`;
    return `<div class="card">${head}<p>${size >= n ? 'All' : `Top ${size}`} teams · ${EVENT_KINDS[set.kind]}${set.bestOf > 1 ? `, best of ${set.bestOf}` : ''} · ${HOSTING[set.hosting]}</p>
      <div class="small muted">Seeded today: ${groups[c].slice(0, size).map((t, i) => `${i + 1}. ${esc(lg.schools[t].short)}`).join(' · ')}</div></div>`;
  }).join('');
}

// Editor for one conference's tournament in one sport. When the season has
// drawn it (and it hasn't started) the change also redraws this year's.
export function confTourneyForm(lg, sportId, conf, ss) {
  const sport = lg.sports[sportId], c = lg.conferences[conf];
  const set = confTourneySettings(lg, conf, sportId);
  const ev = ss?.ct?.[conf];
  const members = ss ? (confStandings(ss)[conf] || []) : [];
  let seeds = ev ? [...ev.teams] : null;
  const schoolsIn = members.length ? members : lg.memberships.filter(m => m.conf === conf && (m.to == null)).map(m => m.school);
  openModal(`<div class="modal-head"><h2>${esc(c.name)} ${esc(sport.name)} Tournament</h2><button class="btn ghost" data-close>Cancel</button></div>
    <div class="modal-body stack">
      <div class="form-grid">
        <label class="field">Teams in it (0 = none)<input type="number" id="t-size" min="0" max="64" value="${set.size >= 99 ? (members.length || 16) : set.size}"></label>
        <label class="field">Format<select id="t-kind">${options(Object.entries(EVENT_KINDS), set.kind)}</select></label>
        <label class="field">Games per round (best of)<input type="number" id="t-bo" min="1" max="7" step="2" value="${set.bestOf || 1}"></label>
        <label class="field">Final (best of)<input type="number" id="t-fbo" min="1" max="7" step="2" value="${set.finalBestOf || set.bestOf || 1}"></label>
        <label class="field">Pool games vs. each team<input type="number" id="t-gpm" min="1" max="4" value="${set.gpm || 1}"></label>
        <label class="field">Hosting<select id="t-host">${options(Object.entries(HOSTING), set.hosting)}</select></label>
        <label class="field">Host school<select id="t-school"><option value="">—</option>${options(schoolsIn.map(t => [t, lg.schools[t].short]), set.host || ev?.host || '')}</select></label>
        <label class="field">Venue name<input type="text" id="t-vn" value="${esc(set.venue?.name || '')}"></label>
        <label class="field">Venue city<input type="text" id="t-vc" value="${esc(set.venue?.city || '')}"></label>
      </div>
      <label class="check"><input type="checkbox" id="t-ifn" ${set.ifNecessary ? 'checked' : ''}> Double elimination: "if necessary" game in the final (otherwise the bracket winners meet once)</label>
      ${set.size >= 99 ? '<p class="note">Currently every team makes it.</p>' : ''}
      ${ev ? `<div><div class="small muted" style="margin-bottom:4px">Seeds for ${yearLabel(lg.currentYear)} (move with the arrows)</div><ol class="seedlist" id="t-seeds"></ol></div>` : ''}
      <label class="check"><input type="checkbox" id="t-keep" checked> Keep this as the conference's format in future years</label>
    </div>
    <div class="modal-foot"><button class="btn primary" id="t-save">Save</button><button class="btn" id="t-reset">Use the ${esc(sport.name)} default</button></div>`, m => {
    const drawSeeds = () => {
      const ol = $('#t-seeds', m); if (!ol) return;
      ol.innerHTML = seeds.map((t, i) => `<li><span class="row" style="gap:6px">${school(t, { link: false })}<span class="spacer"></span><button class="btn sm" data-up="${i}" ${i ? '' : 'disabled'}>↑</button><button class="btn sm" data-dn="${i}" ${i < seeds.length - 1 ? '' : 'disabled'}>↓</button></span></li>`).join('');
      for (const b of $$('[data-up]', ol)) b.onclick = () => { const i = +b.dataset.up; [seeds[i - 1], seeds[i]] = [seeds[i], seeds[i - 1]]; drawSeeds(); };
      for (const b of $$('[data-dn]', ol)) b.onclick = () => { const i = +b.dataset.dn; [seeds[i + 1], seeds[i]] = [seeds[i], seeds[i + 1]]; drawSeeds(); };
    };
    if (seeds) drawSeeds();
    $('#t-size', m).onchange = () => {
      if (!seeds) return;
      const n = Math.max(0, Math.min(+$('#t-size', m).value || 0, members.length));
      seeds = [...seeds.filter(t => members.indexOf(t) >= 0)];
      const pool = members.filter(t => !seeds.includes(t));
      while (seeds.length < n && pool.length) seeds.push(pool.shift());
      seeds = seeds.slice(0, n); drawSeeds();
    };
    const read = () => {
      const odd = x => { const v = Math.max(1, +x || 1); return v % 2 ? v : v + 1; };
      const vn = $('#t-vn', m).value.trim(), vc = $('#t-vc', m).value.trim();
      const sz = Math.max(0, +$('#t-size', m).value || 0);
      return { size: set.size >= 99 && sz >= members.length ? 99 : sz, kind: $('#t-kind', m).value, bestOf: odd($('#t-bo', m).value), finalBestOf: odd($('#t-fbo', m).value), gpm: Math.max(1, +$('#t-gpm', m).value || 1), hosting: $('#t-host', m).value, host: $('#t-school', m).value || null, venue: vn ? { name: vn, city: vc } : null, ifNecessary: $('#t-ifn', m).checked };
    };
    const apply = (set2) => {
      if (set2.hosting === 'school' && !set2.host) return toast('Pick the host school.', true);
      if (set2.hosting === 'venue' && !set2.venue) return toast('Give the venue a name.', true);
      if ($('#t-keep', m).checked) { c.tourney ??= {}; c.tourney[sportId] = set2; }
      if (ss && ss.ct && (!ev || !ev.started)) {
        const list = seeds && seeds.length === Math.min(set2.size, members.length) ? seeds : null;
        redrawConfTourney(lg, sport, ss, conf, { teams: list, set: set2 });
      }
      m.close(); toast('Tournament saved.'); changed();
    };
    $('#t-save', m).onclick = () => apply(read());
    $('#t-reset', m).onclick = () => { if (c.tourney) delete c.tourney[sportId]; if (ss?.ct && (!ev || !ev.started)) redrawConfTourney(lg, sport, ss, conf, {}); m.close(); changed(); };
  });
}

// ---------------------------------------------------------------- selection
function sheetCells(s, ss) {
  const q = s.q.map(([w, l]) => `<td class="num">${w}-${l}</td>`).join('');
  return `<td class="num">${fmtRec(s.w, s.l, s.t)}</td><td class="num rpi"><b>${s.rank}</b> <span class="muted small">${s.rpi.toFixed(4)}</span></td>${q}<td class="num">${s.sosRank}</td>`;
}
const sheetHead = '<th class="num">W-L</th><th class="num">RPI</th><th class="num">Q1</th><th class="num">Q2</th><th class="num">Q3</th><th class="num">Q4</th><th class="num">SOS</th>';

const committeeBox = cuts => `<details class="hint"><summary><b>How the committee compares teams</b></summary>
  <p>Two teams at a time, in tiers. <b>Tier 1:</b> RPI, Q1 wins, Q4 losses. <b>Tier 2:</b> strength of schedule, head-to-head, Q2 wins, W-L. <b>Tier 3:</b> automatic bid, regular-season conference title, Q3 losses, Q1 win %, Q2 win %, Q1+Q2 win %. Whoever wins more criteria in a tier is ahead; the next tier only counts when a tier is even. Teams start in RPI order and each moves up past every team it beats until one beats it.</p>
  <p>Quadrants (scaled from the NCAA's to this sport's size): Q1 is home vs. RPI 1–${cuts.home[0]}, neutral 1–${cuts.neutral[0]}, away 1–${cuts.away[0]}; Q2 home to ${cuts.home[1]}, neutral to ${cuts.neutral[1]}, away to ${cuts.away[1]}; Q3 home to ${cuts.home[2]}, neutral to ${cuts.neutral[2]}, away to ${cuts.away[2]}; Q4 the rest. Teams below .500 only get in with an automatic bid.</p></details>`;

export function selectionTab(lg, Y, sport, ss) {
  const champ = ensureChamp(sport);
  const ed = editable(lg, Y);
  const cuts = quadCuts(Object.keys(ss.teams).length);
  if (!ss.sel) {
    // Bracketology: the field as if the season ended today.
    const played = ss.games.some(g => g.hs != null);
    if (!played) return '<div class="card empty">Projections start after the first games.</div>';
    const field = Math.min(champ.field, Object.keys(ss.teams).length);
    const auto = autoBids(lg, sport, ss);
    const p = committeePicks(ss, field, auto, regTitles(ss));
    const s = p.sheets;
    const inField = [...p.autoList.map(a => a.school), ...p.atLarge];
    const seeds = [...inField].sort((a, b) => p.order.indexOf(a) - p.order.indexOf(b));
    const last4 = p.atLarge.slice(-4), out4 = p.board.filter(t => !p.atLarge.includes(t) && eligible(s[t])).slice(0, 4);
    return `<div class="card"><div class="section-head"><h2>Bracketology</h2><span class="muted">if the season ended today</span></div>
      <p class="note">The real selection opens after conference tournaments (${esc(weekLabel(Y.year, (ss.regEnd ?? sport.season[1]) + 1))}). Automatic bids here go to each conference's current leader.</p>
      <div class="grid wide"><div><h3>Projected seeds</h3><table><tbody>${seeds.map((t, i) => `<tr><td class="num">${i + 1}</td><td>${school(t)}</td><td>${confBadge(ss.conf[t])}</td><td>${p.autoList.some(a => a.school === t) ? '<span class="pill full">AQ</span>' : ''}</td></tr>`).join('')}</tbody></table></div>
      <div><h3>Bubble</h3><p><b>Last four in:</b> ${last4.map(t => esc(lg.schools[t].short)).join(', ') || '—'}</p><p><b>First four out:</b> ${out4.map(t => esc(lg.schools[t].short)).join(', ') || '—'}</p></div></div>
      ${committeeBox(cuts)}</div>`;
  }
  const sel = ss.sel;
  const { sheets } = selectionData(lg, sport, ss);
  const autoRows = sel.auto.map(a => `<tr><td>${school(a.school)}</td><td>${confBadge(a.conf)}</td><td>${esc(a.how)}</td>${sheetCells(sheets[a.school], ss)}</tr>`).join('');
  const autoCard = `<div class="card"><h2>Automatic qualifiers <span class="muted small">${sel.auto.length}</span></h2>${sel.auto.length ? `<div class="table-wrap"><table><thead><tr><th>Team</th><th>Conf</th><th>Bid</th>${sheetHead}</tr></thead><tbody>${autoRows}</tbody></table></div>` : '<p class="muted">None: no conference is big enough for an automatic bid.</p>'}</div>`;
  if (sel.status === 'open') {
    const p = committeePicks(ss, sel.field, sel.auto, regTitles(ss));
    const spots = sel.field - sel.auto.length;
    const lastPick = Math.max(spots, ...p.atLarge.map(t => p.board.indexOf(t) + 1));
    const board = p.board.slice(0, lastPick + 10);
    const committee = new Set(p.atLarge);
    const last4 = p.atLarge.slice(-4), out4 = board.filter(t => !committee.has(t) && eligible(p.sheets[t])).slice(0, 4);
    const rows = board.map((t, i) => {
      const sh = p.sheets[t], tag = last4.includes(t) ? '<span class="pill aff">Last four in</span>' : out4.includes(t) ? '<span class="pill warn">First four out</span>' : !eligible(sh) ? '<span class="pill">Below .500</span>' : '';
      return `<tr class="${t === p.atLarge[p.atLarge.length - 1] ? 'cutline' : ''}"><td><input type="checkbox" data-pick="${t}" ${sel.atLarge.includes(t) ? 'checked' : ''} ${ed ? '' : 'disabled'}></td><td class="num">${i + 1}</td><td>${school(t)} ${tag}</td><td>${confBadge(ss.conf[t])}</td>${sheetCells(sh, ss)}</tr>`;
    }).join('');
    return `<div class="banner" style="margin-bottom:16px"><div><div class="big">Selection: pick the teams</div><div>${sel.field} spots: ${sel.auto.length} automatic, ${spots} at-large. The committee's picks are checked; the line marks its cut.</div></div></div>
      ${autoCard}
      <div class="card"><div class="section-head"><h2>At-large board</h2><span class="muted">committee order</span><div class="spacer"></div><span id="pickcount" class="pill"></span>${ed ? '<button class="btn" id="sel-reset">Committee picks</button><button class="btn primary" id="sel-confirm">Confirm teams</button>' : ''}</div>
        <div class="table-wrap"><table><thead><tr><th></th><th class="num">#</th><th>Team</th><th>Conf</th>${sheetHead}</tr></thead><tbody>${rows}</tbody></table></div>${committeeBox(cuts)}</div>`;
  }
  // Seeding / announced.
  const seeds = sel.seeds;
  const pref = sel.committeeSeeds || seeds;
  const over = seeds.map((t, i) => {
    if (i === seeds.length - 1) return '';
    const c = compare(sheets[t], sheets[seeds[i + 1]]);
    const wrong = c.better !== t;
    return `<span class="${wrong ? 'bad' : 'muted'} small">${wrong ? `Committee prefers ${esc(lg.schools[seeds[i + 1]].short)} (${c.tier}: ${c.reasons.join(', ')})` : `${c.tier}: ${c.reasons.join(', ')}`}</span>`;
  });
  const announced = sel.status === 'announced';
  const fmt = announced ? ss.natl.fmt : champ;
  const first = fmt.stages[0];
  // Site preview: serpentine into the first stage's sites.
  const G = first.groups, sites = Array.from({ length: G }, () => []);
  seeds.forEach((t, i) => { const row = Math.floor(i / G), col = i % G; sites[row % 2 ? G - 1 - col : col].push(t); });
  const preview = G > 1 ? `<div class="card"><h2>${esc(first.name)} preview</h2><div class="grid narrow">${sites.map((s, g) => {
    const confs = s.map(t => ss.conf[t]).filter(Boolean), dup = confs.some((c, i) => confs.indexOf(c) !== i);
    return `<div class="hint"><b>${first.hosting === 'topSeed' ? `${esc(lg.schools[s[0]]?.city || '')} ${esc(first.label || 'Site')}` : `${esc(first.label || 'Site')} ${g + 1}`}</b>${dup ? ' <span class="pill warn">Conference rivals</span>' : ''}<div>${s.map(t => `<div>${seeds.indexOf(t) + 1}. ${school(t, { link: false })}</div>`).join('')}</div></div>`;
  }).join('')}</div></div>` : '';
  return `${announced ? '' : `<div class="banner" style="margin-bottom:16px"><div><div class="big">Selection: seed the field</div><div>Move teams with the arrows. ${G > 1 ? `The top ${G} ${first.hosting === 'topSeed' ? 'host' : 'lead'} the ${esc(first.name.toLowerCase())}.` : ''} Then announce the field.</div></div><div class="spacer"></div>${ed ? '<button class="btn" id="sel-back">Change teams</button><button class="btn primary" id="sel-announce">Announce the field</button>' : ''}</div>`}
    <div class="card"><div class="section-head"><h2>${announced ? 'The field' : 'Seeds'}</h2><span class="muted">${seeds.length} teams</span></div>
      <div class="table-wrap"><table><thead><tr><th class="num">Seed</th>${announced || !ed ? '' : '<th></th>'}<th>Team</th><th>Conf</th>${sheetHead}<th>Over next</th></tr></thead><tbody>
      ${seeds.map((t, i) => `<tr><td class="num"><b>${i + 1}</b></td>${announced || !ed ? '' : `<td><button class="btn sm" data-sup="${i}" ${i ? '' : 'disabled'}>↑</button><button class="btn sm" data-sdn="${i}" ${i < seeds.length - 1 ? '' : 'disabled'}>↓</button></td>`}<td>${school(t)} ${sel.auto.some(a => a.school === t) ? '<span class="pill full">AQ</span>' : ''}${announced ? ` <span class="small muted">${esc(finishOf(ss, t) || '')}</span>` : ''}</td><td>${confBadge(ss.conf[t])}</td>${sheetCells(sheets[t], ss)}<td>${over[i]}</td></tr>`).join('')}
      </tbody></table></div>${committeeBox(cuts)}</div>
    ${announced ? '' : preview}
    ${announced ? '' : autoCard}`;
}

export function bindSelection(lg, Y, sport, ss) {
  if (!ss?.sel) return;
  const sel = ss.sel;
  const count = () => { const n = sel.atLarge.length, need = sel.field - sel.auto.length; const el = $('#pickcount'); if (el) { el.textContent = `${n} of ${need} at-large picked`; el.className = `pill ${n === need ? 'full' : 'warn'}`; } };
  count();
  for (const b of $$('[data-pick]')) b.onchange = () => {
    const t = b.dataset.pick;
    sel.atLarge = b.checked ? [...sel.atLarge, t] : sel.atLarge.filter(x => x !== t);
    count(); changed();
  };
  $('#sel-reset')?.addEventListener('click', () => { sel.atLarge = [...sel.committee]; changed(); });
  $('#sel-confirm')?.addEventListener('click', () => {
    const need = sel.field - sel.auto.length;
    if (sel.atLarge.length !== need) return toast(`Pick exactly ${need} at-large teams (${sel.atLarge.length} picked).`, true);
    confirmTeams(lg, sport, ss); changed();
  });
  $('#sel-back')?.addEventListener('click', () => { sel.status = 'open'; sel.seeds = null; changed(); });
  for (const b of $$('[data-sup]')) b.onclick = () => { const i = +b.dataset.sup; [sel.seeds[i - 1], sel.seeds[i]] = [sel.seeds[i], sel.seeds[i - 1]]; changed(); };
  for (const b of $$('[data-sdn]')) b.onclick = () => { const i = +b.dataset.sdn; [sel.seeds[i + 1], sel.seeds[i]] = [sel.seeds[i], sel.seeds[i + 1]]; changed(); };
  $('#sel-announce')?.addEventListener('click', () => {
    const w = Math.max(Y.week, (ss.regEnd ?? sport.season[1]) + 2);
    announce(lg, sport, ss, w); toast('Field announced.'); location.hash = sportHref(sport.id, 'championship'); changed();
  });
}

// ------------------------------------------------------------ championship
export function championshipTab(lg, Y, sport, ss) {
  const champ = ensureChamp(sport);
  const n = ss.natl;
  const ed = editable(lg, Y);
  if (!n) {
    const status = ss.sel ? `Selection is open on the <a href="${sportHref(sport.id, 'selection')}">Selection</a> tab.` : `The field is picked after conference tournaments (${esc(weekLabel(Y.year, (ss.regEnd ?? sport.season[1]) + 1))}).`;
    return `<div class="card"><h2>${yearLabel(Y.year)} format</h2><p>${status}</p><p>${esc(describeFormat(champ, EVENT_KINDS))}</p>
      ${champ.stages.map(s => `<div class="small"><b>${esc(s.name)}</b>: ${HOSTING[s.hosting]}${s.venues.length ? ` · ${s.venues.map(v => esc(`${v.name}${v.city ? `, ${v.city}` : ''}`)).filter((x, i, a) => a.indexOf(x) === i).join(' · ')}` : ''}</div>`).join('')}
      ${ed ? `<div class="row" style="margin-top:12px"><button class="btn" data-fmt-edit="${sport.id}">Edit the championship</button></div>` : ''}</div>`;
  }
  const rec = records(ss);
  const banner = n.champion ? `<div class="banner" style="margin-bottom:16px"><div class="trophy">🏆</div><div><div class="big">${esc(lg.schools[n.champion].short)}</div><div>${yearLabel(Y.year)} ${esc(sport.name)} national champion · ${fmtRec(rec[n.champion].w, rec[n.champion].l, rec[n.champion].t)}</div></div></div>` : '';
  const stages = [...n.stages].map((st, i) => st ? `<div class="card"><div class="section-head"><h2>${esc(st.name)}</h2><span class="muted">${esc(weekLabel(Y.year, st.startWeek))}</span></div>
    ${st.groups.map(ev => `<div class="event" id="ev-${esc(ev.id)}">${renderEvent(lg, ss, ev, sport.id)}</div>`).join('<hr class="sep">')}</div>` : '').reverse();
  const later = n.fmt.stages.slice(n.stages.length).map(s => `<div class="card"><h2>${esc(s.name)}</h2><p class="muted">${s.groups > 1 ? `${s.groups} sites of ${s.size}` : `${s.size} teams`} · ${EVENT_KINDS[s.kind]}${s.bestOf > 1 ? `, best of ${s.bestOf}` : ''} · ${HOSTING[s.hosting]}${s.venues.length ? ` · ${esc(s.venues[0].name)}` : ''}</p></div>`);
  return banner + [...later.reverse(), ...stages].join('');
}

// ------------------------------------------------------- format editor
export function formatForm(lg, sportId) {
  const sport = lg.sports[sportId];
  const f = structuredClone(ensureChamp(sport));
  const ct = structuredClone(sport.confT);
  const teams = Object.values(lg.programs).filter(p => p.sport === sportId && p.to == null).length;
  const draw = m => {
    const problems = checkFormat(f, teams);
    $('#f-body', m).innerHTML = `
      <div class="form-grid">
        <label class="field">Field (teams)<input type="number" data-f="field" min="2" max="128" value="${f.field}"></label>
        <label class="field">Teams a conference needs for an automatic bid<input type="number" data-f="autoMin" min="2" max="30" value="${f.autoMin}"></label>
      </div>
      <h3 style="margin-top:14px">Stages</h3>
      ${f.stages.map((s, i) => `<div class="stage-ed">
        <div class="row"><b>Stage ${i + 1}</b><input type="text" data-s="${i}" data-k="name" value="${esc(s.name)}" style="flex:1"><button class="btn sm" data-mv="${i}:-1" ${i ? '' : 'disabled'}>↑</button><button class="btn sm" data-mv="${i}:1" ${i < f.stages.length - 1 ? '' : 'disabled'}>↓</button><button class="btn sm danger" data-del="${i}" ${f.stages.length > 1 ? '' : 'disabled'}>Remove</button></div>
        <div class="form-grid">
          <label class="field">Sites<input type="number" data-s="${i}" data-k="groups" min="1" max="64" value="${s.groups}"></label>
          <label class="field">Teams per site<input type="number" data-s="${i}" data-k="size" min="2" max="128" value="${s.size}"></label>
          <label class="field">Site name (e.g. Regional)<input type="text" data-s="${i}" data-k="label" value="${esc(s.label)}"></label>
          <label class="field">Format<select data-s="${i}" data-k="kind">${options(Object.entries(EVENT_KINDS), s.kind)}</select></label>
          <label class="field">Games per round (best of)<input type="number" data-s="${i}" data-k="bestOf" min="1" max="7" step="2" value="${s.bestOf}"></label>
          <label class="field">Final (best of)<input type="number" data-s="${i}" data-k="finalBestOf" min="1" max="7" step="2" value="${s.finalBestOf}"></label>
          <label class="field">Pool games vs. each<input type="number" data-s="${i}" data-k="gpm" min="1" max="4" value="${s.gpm}"></label>
          <label class="field">Pool teams that advance<input type="number" data-s="${i}" data-k="advance" min="1" max="16" value="${s.advance}"></label>
          <label class="field">Hosting<select data-s="${i}" data-k="hosting">${options(Object.entries(HOSTING).filter(([k]) => k !== 'school' && k !== 'rotate'), s.hosting)}</select></label>
          <label class="field">Rounds on campus first<input type="number" data-s="${i}" data-k="campusRounds" min="0" max="6" value="${s.campusRounds}"></label>
          <label class="field">Rounds per week<input type="number" data-s="${i}" data-k="roundsPerWeek" min="1" max="99" value="${s.roundsPerWeek}"></label>
          <label class="check"><input type="checkbox" data-s="${i}" data-k="ifNecessary" ${s.ifNecessary ? 'checked' : ''}> "If necessary" final game</label>
        </div>
        <label class="field">Venues, one per line as "Name | City" (one per site; for a one-site bracket, one per round once games move to venues)<textarea data-s="${i}" data-k="venues" rows="${Math.min(8, Math.max(2, s.venues.length + 1))}">${esc(s.venues.map(v => `${v.name}${v.city ? ` | ${v.city}` : ''}`).join('\n'))}</textarea></label>
      </div>`).join('')}
      <div class="row"><button class="btn sm" id="f-add">Add a stage</button></div>
      ${problems.length ? `<div class="hint bad">${problems.map(esc).join('<br>')}</div>` : `<div class="hint good">The format works: ${esc(describeFormat(f, EVENT_KINDS))}.</div>`}
      <h3 style="margin-top:14px">Conference tournaments (default for every conference)</h3>
      <div class="form-grid">
        <label class="field">Teams (0 = none, 99 = everyone)<input type="number" data-c="size" min="0" max="99" value="${ct.size}"></label>
        <label class="field">Format<select data-c="kind">${options(Object.entries(EVENT_KINDS), ct.kind)}</select></label>
        <label class="field">Games per round (best of)<input type="number" data-c="bestOf" min="1" max="7" step="2" value="${ct.bestOf || 1}"></label>
        <label class="field">Final (best of)<input type="number" data-c="finalBestOf" min="1" max="7" step="2" value="${ct.finalBestOf || ct.bestOf || 1}"></label>
        <label class="field">Hosting<select data-c="hosting">${options(Object.entries(HOSTING).filter(([k]) => k !== 'school' && k !== 'venue'), ct.hosting)}</select></label>
        <label class="check"><input type="checkbox" data-c="ifNecessary" ${ct.ifNecessary ? 'checked' : ''}> "If necessary" final game</label>
      </div>
      <p class="note">Each conference can change its own tournament on its page or on the sport's Tournaments tab.</p>`;
    bindForm(m);
  };
  const num = x => Number(x);
  const bindForm = m => {
    for (const el of $$('[data-f]', m)) el.onchange = () => { f[el.dataset.f] = Math.max(1, num(el.value) || 1); draw(m); };
    for (const el of $$('[data-s]', m)) el.onchange = () => {
      const s = f.stages[+el.dataset.s], k = el.dataset.k;
      if (k === 'venues') s.venues = el.value.split('\n').map(x => x.trim()).filter(Boolean).map(x => { const [a, b] = x.split('|'); return { name: a.trim(), city: (b || '').trim() }; });
      else if (k === 'ifNecessary') s[k] = el.checked;
      else if (['name', 'label', 'kind', 'hosting'].includes(k)) s[k] = el.value;
      else { let v = Math.max(k === 'campusRounds' ? 0 : 1, num(el.value) || 0); if (k === 'bestOf' || k === 'finalBestOf') v = v % 2 ? v : v + 1; s[k] = v; }
      draw(m);
    };
    for (const el of $$('[data-c]', m)) el.onchange = () => { const k = el.dataset.c; ct[k] = k === 'ifNecessary' ? el.checked : ['kind', 'hosting'].includes(k) ? el.value : Math.max(0, num(el.value) || 0); };
    for (const b of $$('[data-mv]', m)) b.onclick = () => { const [i, d] = b.dataset.mv.split(':').map(Number); [f.stages[i], f.stages[i + d]] = [f.stages[i + d], f.stages[i]]; draw(m); };
    for (const b of $$('[data-del]', m)) b.onclick = () => { f.stages.splice(+b.dataset.del, 1); draw(m); };
    $('#f-add', m).onclick = () => { const last = f.stages[f.stages.length - 1]; f.stages.push(newStage({ name: 'Final', size: 2 })); if (last) last.groups = Math.max(1, last.groups); draw(m); };
  };
  openModal(`<div class="modal-head"><h2>${esc(sport.name)} championship</h2><button class="btn ghost" data-close>Cancel</button></div>
    <div class="modal-body stack" id="f-body"></div>
    <div class="modal-foot"><button class="btn primary" id="f-save">Save</button><button class="btn" id="f-default">Reset to the real-life format</button></div>`, m => {
    draw(m);
    $('#f-default', m).onclick = () => { Object.assign(f, defaultFormat(sportId)); Object.assign(ct, defaultConfTourney(sportId)); draw(m); };
    $('#f-save', m).onclick = () => {
      const problems = checkFormat(f, Infinity);
      if (problems.length) return toast(problems[0], true);
      sport.champ = f; sport.confT = ct;
      const Y = lg.years[lg.currentYear], ss = Y.sports[sportId];
      m.close();
      toast(ss?.natl ? `Saved. This year's field is already announced, so it starts in ${yearLabel(lg.currentYear + 1)}.` : 'Saved. It applies to this year\'s championship.');
      changed();
    };
  });
}

export function bindChampPages(lg, Y, sport, ss) {
  for (const b of $$('[data-ct-edit]')) b.onclick = () => confTourneyForm(lg, sport.id, b.dataset.ctEdit, ss);
  for (const b of $$('[data-fmt-edit]')) b.onclick = () => formatForm(lg, b.dataset.fmtEdit);
  bindSelection(lg, Y, sport, ss);
}
