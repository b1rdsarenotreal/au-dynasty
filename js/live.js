// Reading the sport apps' saves straight from this browser.
//
// Every AAU app is published on the same site (b1rdsarenotreal.github.io,
// each in its own folder), so they share this browser's storage: each app
// keeps its league in IndexedDB (database `db`, store 'kv', one key per
// side, with a localStorage copy as a fallback). The hub reads them on load,
// never writes to them, and never creates a database an app hasn't made.

import { SPORTS } from './sports.js?v=20261122204729';

// app: folder on the site; sideKey/side: the app's women's/men's switch
// (localStorage), set before opening an app so it shows the right side.
export const APPS = [
  { app: 'aau-football', name: 'Football', db: 'aau-football', sideKey: null, saves: [['aau-football-league', 'football', 'men']] },
  { app: 'aau-volleyball', name: 'Volleyball', db: 'aau-volleyball', sideKey: 'aau-volleyball-side', saves: [['aau-volleyball-league', 'w-volleyball', 'women'], ['aau-volleyball-league-men', 'm-volleyball', 'men']] },
  { app: 'aau-soccer', name: 'Soccer', db: 'aau-soccer', sideKey: 'aau-soccer-side', saves: [['aau-soccer-league', 'w-soccer', 'women'], ['aau-soccer-league-men', 'm-soccer', 'men']] },
  { app: 'aau-fhockey', name: 'Field Hockey', db: 'aau-fhockey', sideKey: null, saves: [['aau-fhockey-league', 'field-hockey', 'women']] },
  { app: 'uaa-ihockey', name: 'Hockey', db: 'aau-hockey', sideKey: 'aau-hockey-side', saves: [['aau-hockey-league', 'w-hockey', 'women'], ['aau-hockey-league-men', 'm-hockey', 'men']] },
  { app: 'uaa-basketball', name: 'Basketball', db: 'aau-basketball', sideKey: 'aau-basketball-side', saves: [['aau-basketball-league', 'w-basketball', 'women'], ['aau-basketball-league-men', 'm-basketball', 'men']] },
  { app: 'uaa-lax', name: 'Lacrosse', db: 'aau-lacrosse', sideKey: 'aau-lacrosse-side', saves: [['aau-lacrosse-league', 'w-lacrosse', 'women'], ['aau-lacrosse-league-men', 'm-lacrosse', 'men']] },
  { app: 'aau-softball', name: 'Softball & Baseball', db: 'aau-diamond', sideKey: 'aau-diamond-side', saves: [['aau-softball-league', 'softball', 'softball'], ['aau-baseball-league', 'baseball', 'baseball']] },
];
const BY_SPORT = Object.fromEntries(APPS.flatMap(a => a.saves.map(([key, id, side]) => [id, { ...a, key, side }])));
export const appFor = sportId => BY_SPORT[sportId] || null;

// A link into a sport's app (a hash route such as '#/team/Stanford'), on
// the right side: the side is set when the link is clicked (`openApp`).
export const appHref = (sportId, route = '#/home') => { const a = appFor(sportId); return a ? `../${a.app}/${route}` : null; };
export function openApp(sportId) {
  const a = appFor(sportId);
  if (a?.sideKey) try { localStorage.setItem(a.sideKey, a.side); } catch { /* the app opens on its last side */ }
}

// Open a database only if it already exists: an open that would create it
// (no app has saved there) is aborted, so the hub never leaves empty
// databases behind.
function openExisting(name) {
  return new Promise(resolve => {
    let req;
    try { req = indexedDB.open(name); } catch { return resolve(null); }
    let created = false;
    req.onupgradeneeded = () => { created = true; req.transaction.abort(); };
    req.onsuccess = () => { if (created) { req.result.close(); resolve(null); } else resolve(req.result); };
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}
function getKey(db, key) {
  return new Promise(resolve => {
    try {
      const r = db.transaction('kv').objectStore('kv').get(key);
      r.onsuccess = () => resolve(r.result || null); r.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
const fromLocal = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const looksLikeLeague = v => !!(v && typeof v === 'object' && v.seasons && typeof v.seasons === 'object');

// Every save found: [{ sport, league, app }].
export async function loadLive() {
  const out = [];
  if (!('indexedDB' in globalThis)) return out;
  let names = null;
  try { if (indexedDB.databases) names = new Set((await indexedDB.databases()).map(d => d.name)); } catch { names = null; }
  for (const a of APPS) {
    const db = !names || names.has(a.db) ? await openExisting(a.db) : null;
    for (const [key, id] of a.saves) {
      let league = db ? await getKey(db, key) : null;
      if (!looksLikeLeague(league)) league = fromLocal(key);
      if (looksLikeLeague(league) && SPORTS[id]) out.push({ sport: SPORTS[id], league, app: a });
    }
    db?.close();
  }
  return out;
}
