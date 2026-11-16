// The all-sports calendar: every sport's games on one day, as scoreboard
// cards grouped by sport, with the week around it to move through.
// Route: #/calendar/<yyyy-mm-dd> (no date: the latest day with results).
//
// Games come from the record book (every season with a played game, from
// the apps' saves or uploads) and, for seasons that haven't started, from
// the apps' saves read on this visit (`ctx.upcoming`). Dates follow each
// sport's own calendar (`gameDay`, the same rule as its app).

import { ctx, app, $$, esc, dynasties, logoImg, confLogo, seasonLabel } from './ui.js?v=20261115174328';
import { gameDay, scoreNote, schoolUrl } from './school.js?v=20261115174328';
import { appHref, openApp } from './live.js?v=20261115174328';
import { SPORTS } from './sports.js?v=20261115174328';

const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
const iso = d => d.toISOString().slice(0, 10);
const parseIso = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
export const calendarUrl = date => `#/calendar/${typeof date === 'string' ? date : iso(date)}`;
export const longDate = d => `${DOW_LONG[d.getUTCDay()]}, ${MONTH[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
const shortDate = d => `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
const order = Object.keys(SPORTS);

// Every game with its date, by day: { 'yyyy-mm-dd': [{ d, y, s, g, conf }] }.
// Built once per history (the record book and this visit's saves).
let cache = { key: null, days: null };
export function calendarDays() {
  const key = `${ctx.history?.updated}|${ctx.liveStamp || ''}`;
  if (cache.key === key && cache.days) return cache.days;
  const days = {};
  const add = (d, y, s, g, confOf) => {
    const date = gameDay(d, y, g, s.games);
    if (!date) return;
    (days[iso(date)] ||= []).push({ d, y, s, g, conf: confOf });
  };
  const seen = new Set();
  for (const d of dynasties()) {
    for (const [y, s] of Object.entries(d.years)) {
      seen.add(`${d.sport.id}|${y}`);
      for (const g of s.games || []) add(d, +y, s, g, t => s.teams?.[t]?.conf || null);
    }
  }
  for (const u of Object.values(ctx.upcoming || {})) {
    for (const [y, s] of Object.entries(u.years)) {
      if (seen.has(`${u.sport.id}|${y}`)) continue;
      for (const g of s.games || []) add(u, +y, s, g, t => s.conf?.[t] || null);
    }
  }
  cache = { key, days };
  return days;
}

// The latest day with results, else the first day with games.
export function defaultDay(days = calendarDays()) {
  const all = Object.keys(days).sort();
  const played = all.filter(k => days[k].some(e => e.g.hr != null));
  return played[played.length - 1] || all[0] || iso(new Date());
}
// The first day with games still to play (any sport): where the sims are up to.
export function firstUnplayed(days) {
  return Object.keys(days).sort().find(k => days[k].some(e => e.g.hr == null)) || null;
}

const sportOrder = (a, b) => (order.indexOf(a.sport.id) + 99) % 199 - (order.indexOf(b.sport.id) + 99) % 199;
const unitOf = (sport, n) => `${n} ${sport.unit || 'game'}${n === 1 ? '' : sport.unit === 'match' ? 'es' : 's'}`;

// One scoreboard card: the conference's color bar and logo, the status and
// event, a row per team (the loser faded) and the score.
function card(e) {
  const { d, y, s, g } = e;
  const fin = g.hr != null;
  const conf = g.c ? e.conf(g.h) : null;
  const color = conf ? d.conferences?.[conf]?.color || '#0b1f3a' : '#0b1f3a';
  const typeName = { conf: 'Conference tournament', regional: 'National tournament', super: 'National tournament', mcws: s.finalsName || d.sport.finals };
  const tag = g.t ? (g.lb || typeName[g.t] || '') : g.lb || (g.c ? '' : 'Non-conference');
  let note = fin ? scoreNote(d, s, g) : '';
  let hw = fin && g.hr > g.ar, aw = fin && g.ar > g.hr;
  if (fin && g.pk) {
    const [ph, pa] = g.pk;
    note = [note, `${d.sport.pkWins ? 'SO' : 'PK'} ${Math.max(ph, pa)}-${Math.min(ph, pa)}`].filter(Boolean).join(', ');
    if (g.hr === g.ar) { hw = ph > pa; aw = pa > ph; }
  }
  const row = (t, r, won, lost) => `<div class="dc-row${lost ? ' loss' : ''}${won ? ' win' : ''}">${logoImg(t, 28)}<a class="dc-name" href="${schoolUrl(t, d.sport.id, y)}">${esc(t)}</a><span class="dc-score">${fin ? r : ''}</span></div>`;
  const where = g.v || (g.n && g.hs ? `at ${g.hs}` : '');
  return `<article class="dc" style="--cc:${esc(color)}">
    <div class="dc-top">${conf ? confLogo(d, conf, 20) : ''}<span class="dc-status"><b>${fin ? 'FINAL' : 'UPCOMING'}</b>${note ? ` · ${esc(note)}` : ''}</span>${tag ? `<span class="dc-tag" title="${esc(tag)}">${esc(tag)}</span>` : ''}</div>
    <div class="dc-body">${row(g.a, g.ar, aw, hw)}${row(g.h, g.hr, hw, aw)}</div>
    ${where ? `<div class="dc-foot">${esc(where)}</div>` : ''}
  </article>`;
}

export function renderCalendar(parts) {
  const days = calendarDays();
  if (!Object.keys(days).length) {
    app.innerHTML = `<div class="section-head"><h1>Calendar</h1></div><div class="empty">No schedules yet. Open a sport's app and start a season, or add a backup on the Data page.</div>`;
    return;
  }
  const day = parseIso(parts[0]) ? parts[0] : defaultDay(days);
  const date = parseIso(day);
  const filter = ctx.calSport && days[day]?.some(e => e.d.sport.id === ctx.calSport) ? ctx.calSport : 'all';
  // The week (Monday to Sunday) around the day, with each day's count.
  const mon = addDays(date, -((date.getUTCDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const keys = Object.keys(days).sort();
  const prevDay = [...keys].reverse().find(k => k < day), nextDay = keys.find(k => k > day);
  const entries = (days[day] || []).slice();
  const bySport = new Map();
  for (const e of entries) {
    const id = e.d.sport.id;
    if (!bySport.has(id)) bySport.set(id, { sport: e.d.sport, y: e.y, list: [] });
    bySport.get(id).list.push(e);
  }
  const groups = [...bySport.values()].sort(sportOrder);
  for (const gr of groups) gr.list.sort((a, b) => (a.g.t ? 1 : 0) - (b.g.t ? 1 : 0) || (a.g.o ?? 0) - (b.g.o ?? 0) || a.g.h.localeCompare(b.g.h));
  const shown = filter === 'all' ? groups : groups.filter(gr => gr.sport.id === filter);
  const later = firstUnplayed(days);
  app.innerHTML = `<div class="section-head cal-head"><div><div class="kicker">Calendar · all sports</div><h1>${esc(longDate(date))}</h1></div>
      <div class="cal-jump"><a class="btn" href="${calendarUrl(defaultDay(days))}">Latest results</a>${later && later !== day ? `<a class="btn" href="${calendarUrl(later)}">Next to play · ${esc(shortDate(parseIso(later)))}</a>` : ''}<input type="date" id="cal-date" value="${day}" aria-label="Go to a date"></div></div>
    <nav class="cal-week" aria-label="Days">
      <a class="cal-step" href="${prevDay ? calendarUrl(prevDay) : '#'}" ${prevDay ? '' : 'aria-disabled="true"'} title="Previous day with games">‹</a>
      ${week.map(w => { const k = iso(w), n = (days[k] || []).length; return `<a class="cal-day${k === day ? ' active' : ''}${n ? '' : ' none'}" href="${calendarUrl(k)}"><span class="cd-dow">${DOW_SHORT[w.getUTCDay()]}</span><span class="cd-date">${esc(shortDate(w))}</span><span class="cd-n">${n ? n : '—'}</span></a>`; }).join('')}
      <a class="cal-step" href="${nextDay ? calendarUrl(nextDay) : '#'}" ${nextDay ? '' : 'aria-disabled="true"'} title="Next day with games">›</a>
    </nav>
    ${groups.length > 1 ? `<div class="chips cal-chips"><button class="chip${filter === 'all' ? ' active' : ''}" data-cs="all">All sports · ${entries.length}</button>${groups.map(gr => `<button class="chip${filter === gr.sport.id ? ' active' : ''}" data-cs="${esc(gr.sport.id)}">${esc(gr.sport.name)} · ${gr.list.length}</button>`).join('')}</div>` : ''}
    ${shown.length ? shown.map(gr => {
      const href = appHref(gr.sport.id, '#/schedule');
      const fin = gr.list.filter(e => e.g.hr != null).length;
      return `<section class="cal-sport"><div class="cal-sport-head"><h2>${esc(gr.sport.name)}</h2><span class="muted small">${esc(seasonLabel(gr.y))} · ${esc(unitOf(gr.sport, gr.list.length))}${fin && fin < gr.list.length ? ` · ${fin} final` : ''}</span>${href ? `<a class="btn sm cal-open" href="${esc(href)}" data-open="${esc(gr.sport.id)}">Open the app ›</a>` : ''}</div>
        <div class="dc-grid">${gr.list.map(card).join('')}</div></section>`;
    }).join('') : `<div class="empty">Nothing on this day.${prevDay || nextDay ? ` ${prevDay ? `<a href="${calendarUrl(prevDay)}">${esc(longDate(parseIso(prevDay)))}</a>` : ''}${prevDay && nextDay ? ' · ' : ''}${nextDay ? `<a href="${calendarUrl(nextDay)}">${esc(longDate(parseIso(nextDay)))}</a>` : ''}` : ''}</div>`}`;
  $$('[data-cs]').forEach(b => (b.onclick = () => { ctx.calSport = b.dataset.cs === 'all' ? null : b.dataset.cs; renderCalendar([day]); }));
  $$('[data-open]').forEach(a => (a.onclick = () => openApp(a.dataset.open)));
  const input = document.getElementById('cal-date');
  if (input) input.onchange = () => { if (parseIso(input.value)) location.hash = calendarUrl(input.value); };
}
