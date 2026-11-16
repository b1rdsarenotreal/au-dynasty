// The Sports page: every sport's app, where its season stands (read from
// this browser's saves) and links into it.

import { ctx, app, $$, esc, logoImg, seasonLabel } from './ui.js?v=20261115174328';
import { APPS, appHref, openApp } from './live.js?v=20261115174328';
import { SPORTS } from './sports.js?v=20261115174328';
import { calendarDays, calendarUrl, longDate } from './calendar.js?v=20261115174328';
import { schoolUrl } from './school.js?v=20261115174328';

const PHASE = { regular: 'Regular season', conf: 'Conference tournaments', selection: 'Selection', regionals: 'National tournament', supers: 'National tournament', mcws: 'National finals', complete: 'Season complete' };
const isFinal = g => !!g.final && g.homeR != null && g.awayR != null;

// Where a sport's current season stands: phase, games played, the poll's
// No. 1, the champion.
function status(league, sport) {
  const y = league.currentYear ?? Math.max(...Object.keys(league.seasons).map(Number));
  const s = league.seasons[y];
  if (!s) return null;
  const reg = (s.games || []).filter(g => g.type === 'regular'), played = reg.filter(isFinal).length;
  const weeks = Object.keys(s.polls || {}).filter(k => k !== 'final' && k !== '0').map(Number).sort((a, b) => a - b);
  const poll = s.polls?.final || (weeks.length ? s.polls[weeks[weeks.length - 1]] : s.polls?.[0]);
  const top = poll?.ranks?.[0]?.team || null;
  const champ = s.post?.champion || s.post?.mcws?.champion || null;
  const phase = champ ? 'complete' : s.phase;
  return { y, phase: PHASE[phase] || 'Preseason', played, total: reg.length, top, champ, finals: s.settings?.mcwsName || sport.finals };
}

export function renderSports() {
  const found = Object.fromEntries((ctx.live || []).map(x => [x.sport.id, x]));
  const days = calendarDays();
  const lastDay = {};
  for (const [k, list] of Object.entries(days)) for (const e of list) if (e.g.hr != null && (!lastDay[e.d.sport.id] || k > lastDay[e.d.sport.id])) lastDay[e.d.sport.id] = k;
  const cards = [];
  for (const a of APPS) {
    for (const [, id] of a.saves) {
      const sport = SPORTS[id], live = found[id], st = live ? status(live.league, sport) : null;
      const open = route => `<a class="btn sm" href="${esc(appHref(id, route))}" data-open="${esc(id)}">${route === '#/home' ? 'Open' : route === '#/schedule' ? 'Schedule' : route === '#/standings' ? 'Standings' : route === '#/rankings' ? 'Rankings' : 'Postseason'}</a>`;
      cards.push(`<article class="card sp-card sport-${sport.gender}">
        <div class="sp-head"><h2>${esc(sport.name)}</h2>${st ? `<span class="sp-year">${esc(seasonLabel(st.y))}</span>` : ''}</div>
        ${st ? `<div class="sp-phase"><b>${esc(st.phase)}</b>${st.total ? ` · ${st.played} of ${st.total} regular-season ${sport.unit === 'match' ? 'matches' : 'games'} played` : ''}</div>
          <div class="sp-facts">
            ${st.champ ? `<div><span class="muted small">${esc(st.finals)} champion</span>${logoImg(st.champ, 22)} <a href="${schoolUrl(st.champ, id, st.y)}">${esc(st.champ)}</a></div>` : ''}
            ${st.top && !st.champ ? `<div><span class="muted small">No. 1 in the poll</span>${logoImg(st.top, 22)} <a href="${schoolUrl(st.top, id, st.y)}">${esc(st.top)}</a></div>` : ''}
            ${lastDay[id] ? `<div><span class="muted small">Latest results</span><a href="${calendarUrl(lastDay[id])}">${esc(longDate(new Date(lastDay[id] + 'T00:00:00Z')))}</a></div>` : ''}
          </div>`
        : `<p class="muted small">No save for this sport in this browser yet. Open the app to start a season.</p>`}
        <div class="sp-links">${open('#/home')}${live ? `${open('#/schedule')}${open('#/standings')}${open('#/rankings')}${open('#/postseason')}` : ''}</div>
      </article>`);
    }
  }
  app.innerHTML = `<div class="section-head"><div><div class="kicker">Every AAU sport</div><h1>Sports</h1></div><span class="muted small">Read from this browser's saves${ctx.liveStamp ? ' just now' : ''}. Sim in each sport's app; this page, the calendar and the record book update when you come back.</span></div>
    <div class="sp-grid">${cards.join('')}</div>`;
  $$('[data-open]').forEach(a => (a.onclick = () => openApp(a.dataset.open)));
}
