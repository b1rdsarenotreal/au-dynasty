// App shell: loading the dynasty, the top bar, and page routing.

import { loadLeague, saveLeague } from './store.js?v=20261030221621';
import { newLeague, migrateLeague, yearLabel } from './league.js?v=20261030221621';
import { ctx, app, persist, esc } from './ui.js?v=20261030221621';
import { renderHome } from './views-home.js?v=20261030221621';
import { renderSports, renderSport } from './views-sports.js?v=20261030221621';
import { renderSchools, renderSchool } from './views-schools.js?v=20261030221621';
import { renderConferences, renderConference } from './views-confs.js?v=20261030221621';
import { renderHistory, renderSettings } from './views-admin.js?v=20261030221621';

const VIEWS = { home: 'Home', sports: 'Sports', schools: 'Schools', conferences: 'Conferences', history: 'History', settings: 'Settings' };
const SUBVIEWS = { sport: 'sports', school: 'schools', conference: 'conferences' };
const RENDER = {
  home: renderHome, sports: renderSports, schools: renderSchools, conferences: renderConferences, history: renderHistory, settings: renderSettings,
  sport: () => renderSport(routeArgs()), school: () => renderSchool(routeArgs()[0]), conference: () => renderConference(routeArgs()[0]),
};

function currentView() { const v = location.hash.replace(/^#\/?/, '').split('/')[0]; return VIEWS[v] || SUBVIEWS[v] ? v : 'home'; }
function routeArgs() { return location.hash.replace(/^#\/?/, '').split('/').slice(1).map(decodeURIComponent); }

function renderChrome() {
  const L = ctx.league;
  document.getElementById('league-name').textContent = L.name;
  document.title = L.name;
  const v = currentView();
  document.getElementById('nav').innerHTML = Object.entries(VIEWS).map(([k, label]) => `<a href="#/${k}" class="${k === v || SUBVIEWS[v] === k ? 'active' : ''}">${label}</a>`).join('');
  const years = Object.keys(L.years).map(Number).sort((a, b) => b - a);
  const picker = document.getElementById('season-picker');
  picker.innerHTML = `<select aria-label="Year">${years.map(y => `<option value="${y}" ${y === L.viewYear ? 'selected' : ''}>${yearLabel(y)}${y === L.currentYear ? '' : ' (past)'}</option>`).join('')}</select>`;
  picker.querySelector('select').onchange = e => { L.viewYear = Number(e.target.value); persist(); render(); };
}

export function render() {
  renderChrome();
  try { RENDER[currentView()](); }
  catch (e) { console.error(e); app.innerHTML = `<div class="empty">Something went wrong drawing this page: ${esc(e.message)}</div>`; }
}

let lastView = null;
window.addEventListener('hashchange', () => { const v = location.hash; render(); if (v.split('/')[1] !== lastView) window.scrollTo(0, 0); lastView = v.split('/')[1]; });

async function boot() {
  ctx.render = render;
  let league = await loadLeague();
  if (!league || !league.years) { league = newLeague(); await saveLeague(league); }
  migrateLeague(league);
  if (!league.years[league.viewYear]) league.viewYear = league.currentYear;
  ctx.league = league;
  render();
}

boot().catch(e => {
  console.error(e);
  app.innerHTML = `<div class="empty">The dynasty couldn't load: ${esc(e.message)}. Your saved dynasty hasn't been changed. Try reloading the page.</div>`;
});
