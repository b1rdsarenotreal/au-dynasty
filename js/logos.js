// School logos, found the same way as in MCS Dynasty plus one more source:
//
// 1. A logo the commissioner set for the school (Edit school).
// 2. The college football logo list MCS uses
//    (https://gist.github.com/saiemgilani/c6596f0e1c8b148daabc2b7f1e6f6add,
//    ESPN logo URLs keyed by school name and alternate names).
// 3. ESPN's women's college basketball team list, which covers every
//    Division I school, including the ones without football.
//
// Both lists are fetched by the browser once and cached for 30 days. Schools
// neither list covers (most Division III and Canadian schools) show a
// monogram in their colors until a logo is set.

const GIST_RAW = 'https://gist.githubusercontent.com/saiemgilani/c6596f0e1c8b148daabc2b7f1e6f6add/raw/logos';
const ESPN_TEAMS = 'https://site.api.espn.com/apis/site/v2/sports/basketball/womens-college-basketball/teams?limit=1000';
const CACHE_KEY = 'au-logo-tables-v1';
const MAX_AGE = 30 * 24 * 3600 * 1000;

// Other names the lists may use for a school.
export const LOGO_ALIASES = {
  miami: ['Miami', 'Miami (FL)', 'Miami Hurricanes'],
  penn: ['Pennsylvania', 'Penn'],
  usc: ['USC', 'Southern California'],
  pitt: ['Pittsburgh', 'Pitt'],
  cal: ['California', 'Cal'],
  usf: ['South Florida', 'USF'],
  unc: ['North Carolina', 'UNC'],
  washu: ['Washington-St. Louis', 'Washington (MO)', 'Washington University', 'WashU'],
  case: ['Case Western', 'Case Western Reserve'],
  chicago: ['Chicago', 'University of Chicago'],
  nyu: ['NYU', 'New York University'],
  cmu: ['Carnegie Mellon'],
  mit: ['MIT', 'Massachusetts Institute of Technology'],
  caltech: ['Caltech', 'California Institute of Technology'],
  bu: ['Boston University'],
  gwu: ['George Washington'],
  stonybrook: ['Stony Brook'],
  ohiostate: ['Ohio State'],
  notredame: ['Notre Dame'],
};

let tables = null; // { gist: {name: url}, espn: {name: url} }
const https = u => (u ? String(u).replace(/^http:\/\//i, 'https://') : null);
const norm = s => String(s || '').trim().toLowerCase();

export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(x => x !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some(x => x !== '')) rows.push(row); }
  return rows;
}

export function gistTable(csvText) {
  const [header, ...rows] = parseCSV(csvText);
  const col = name => header.findIndex(h => h.trim().toLowerCase() === name);
  const iSchool = col('school'), iLogo = col('logo');
  const alt = ['alt_name1', 'alt_name2', 'alt_name3'].map(col).filter(i => i >= 0);
  const out = {};
  for (const r of rows) {
    const url = https(r[iLogo]);
    if (!url) continue;
    const k = norm(r[iSchool]);
    if (k) out[k] = url;
    for (const i of alt) { const a = norm(r[i]); if (a && !(a in out)) out[a] = url; }
  }
  return out;
}

export function espnTable(json) {
  const out = {};
  const teams = json?.sports?.[0]?.leagues?.[0]?.teams || [];
  for (const { team: t } of teams) {
    const url = https(t?.logos?.[0]?.href);
    if (!url) continue;
    out[norm(t.displayName)] = url; // "Michigan Wolverines": exact, so checked first
    const loc = norm(t.location);
    if (loc && !(loc in out)) out[loc] = url;
  }
  return out;
}

async function fetchTables() {
  const [g, e] = await Promise.allSettled([
    fetch(GIST_RAW).then(r => (r.ok ? r.text() : Promise.reject(r.status))).then(gistTable),
    fetch(ESPN_TEAMS).then(r => (r.ok ? r.json() : Promise.reject(r.status))).then(espnTable),
  ]);
  return { gist: g.status === 'fulfilled' ? g.value : {}, espn: e.status === 'fulfilled' ? e.value : {} };
}

export async function loadLogos({ force = false } = {}) {
  if (tables && !force) return tables;
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (c && !force && Date.now() - c.at < MAX_AGE && (Object.keys(c.tables.gist).length || Object.keys(c.tables.espn).length)) return (tables = c.tables);
  } catch { /* ignore */ }
  tables = await fetchTables().catch(() => ({ gist: {}, espn: {} }));
  if (Object.keys(tables.gist).length || Object.keys(tables.espn).length) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), tables })); } catch { /* quota */ }
  }
  return tables;
}

// For tests: use given tables instead of fetching.
export function setTables(t) { tables = t; }

// Logo URL for a school, or null.
export function logoFor(s) {
  if (!s) return null;
  if (s.logo) return https(s.logo);
  if (!tables) return null;
  const names = [...(LOGO_ALIASES[s.id] || []), s.short, s.name].map(norm);
  for (const n of names) if (tables.gist[n]) return tables.gist[n];
  const full = norm(`${s.short} ${s.mascot}`);
  if (tables.espn[full]) return tables.espn[full];
  for (const n of names) if (tables.espn[n]) return tables.espn[n];
  return null;
}

// Shrink an image file to at most `max` pixels and return it as a data URL,
// so an uploaded logo stays small inside the save.
export function imageFileToDataUrl(file, max = 160) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file isn\'t an image this browser can read.')); };
    img.src = url;
  });
}
