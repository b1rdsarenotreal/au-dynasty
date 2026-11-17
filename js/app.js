// App shell: loading the record book and the apps' saves, the top bar and
// page routing.

import { loadHistory, repairHistory, saveHistory, mergeDynasty } from './store.js?v=20261117010429';
import { loadLive } from './live.js?v=20261117010429';
import { extractDynasty } from './extract.js?v=20261117010429';
import { renderCalendar } from './calendar.js?v=20261117010429';
import { renderSports } from './sports-page.js?v=20261117010429';
import { renderRealign } from './realign.js?v=20261117010429';
import { loadLogoTable } from './logos.js?v=20261117010429';
import { renderSchool } from './school.js?v=20261117010429';
import { renderTournament } from './tournament.js?v=20261117010429';
import { renderConference, renderConferences } from './conference.js?v=20261117010429';
import { ctx, app, esc } from './ui.js?v=20261117010429';
import { renderHome, renderChampions, renderSchools, renderCup, renderData } from './views.js?v=20261117010429';

const VIEWS = { home: 'Home', calendar: 'Calendar', sports: 'Sports', champions: 'Champions', tournament: 'Tournaments', schools: 'Schools', conferences: 'Conferences', realign: 'Realignment', cup: 'All-Sports Cup', data: 'Data' };
const SUBVIEWS = { school: 'schools', conference: 'conferences' };
const RENDER = { calendar: () => renderCalendar(routeParts()), sports: renderSports, home: renderHome, champions: renderChampions, schools: renderSchools, school: () => renderSchool(routeParts()), tournament: () => renderTournament(routeParts()), conferences: renderConferences, conference: () => renderConference(routeParts()), cup: renderCup, realign: renderRealign, data: renderData };

function currentView() { const v = location.hash.replace(/^#\/?/, '').split('/')[0]; return VIEWS[v] || SUBVIEWS[v] ? v : 'home'; }
// The route's parts after the page name, each decoded (a school name may hold any character).
function routeParts() { return location.hash.replace(/^#\/?/, '').split('/').slice(1).map(p => { try { return decodeURIComponent(p); } catch { return p; } }); }

function render() {
  const v = currentView();
  document.getElementById('nav').innerHTML = Object.entries(VIEWS).map(([k, label]) => `<a href="#/${k}" class="${k === v || SUBVIEWS[v] === k ? 'active' : ''}">${label}</a>`).join('');
  try { RENDER[v](); } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="empty">Something went wrong showing this page: ${esc(e.message)}</div>`;
  }
}

// Brackets are fitted to the window, so draw them again when it resizes.
let resizeTimer = null;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (currentView() === 'tournament') render(); }, 150); });

let lastView = null;
window.addEventListener('hashchange', () => { const v = currentView(); render(); if (v !== lastView) window.scrollTo(0, 0); lastView = v; });

// Read every sport app's save in this browser and fold it into the record
// book (each season replaces the stored one; seasons only in the record
// book stay). Seasons not started yet go to `ctx.upcoming` for the calendar.
// Runs on load and when the page comes back into view (after a sim in an app).
async function syncLive() {
  let found = [];
  try { found = await loadLive(); } catch (e) { console.warn('reading the apps failed', e); }
  ctx.live = found; ctx.upcoming = {};
  for (const { sport, league } of found) {
    const ext = extractDynasty(league, sport);
    if (Object.keys(ext.years).length) mergeDynasty(ctx.history, ext, { fileName: '' });
    if (Object.keys(ext.upcoming).length) ctx.upcoming[sport.id] = { sport, years: ext.upcoming, conferences: ext.conferences, schools: ext.schools };
  }
  ctx.liveStamp = Date.now();
  if (found.length) await saveHistory(ctx.history);
}
document.addEventListener('visibilitychange', async () => { if (document.visibilityState === 'visible' && ctx.history) { await syncLive(); render(); } });

async function boot() {
  ctx.render = render;
  ctx.history = await loadHistory();
  const removed = repairHistory(ctx.history);
  if (removed.length) {
    await saveHistory(ctx.history);
    ctx.notice = removed.map(r => `Your ${r.name} history had another sport's backup in it (${r.fileName}), so it was cleared. Upload your ${r.name} backup again, and ${r.fileName} too.`).join(' ');
  }
  render();
  await syncLive();
  render();
  // Logos load in the background; draw again once they're in.
  loadLogoTable().then(render).catch(() => {});
}
boot();
