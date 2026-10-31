// The dynasty's data model: schools, sports, programs (a school's team in one
// sport), conferences and conference memberships, plus the academic-year
// calendar. Everything that changes over time (programs, memberships,
// conferences) carries the years it is in effect, so history stays correct
// after realignment.
//
// Years are academic years named by their fall: 2030 = the 2030–31 year.
// A record with { from, to } is in effect for from <= year < to (to = null
// means still in effect).

import { SCHOOLS } from './schools.js?v=20261030222729';
import { SPORT_CATALOG } from './sports.js?v=20261030222729';
import { seedFor, STARTER_SPORTS } from './seed.js?v=20261030222729';
import { clamp } from './util.js?v=20261030222729';

export const START_YEAR = 2030;
export const yearLabel = y => `${y}–${String((y + 1) % 100).padStart(2, '0')}`;

const live = (rec, year) => rec.from <= year && (rec.to == null || rec.to > year);

export function newLeague() {
  const L = {
    version: 1,
    name: 'AAU Dynasty',
    startYear: START_YEAR,
    currentYear: START_YEAR,
    viewYear: START_YEAR,
    schools: {}, sports: {}, programs: {}, conferences: {}, memberships: [],
    years: {}, log: [], nextId: 1,
    settings: { autoMin: 6, form: 'normal' },
  };
  for (const s of SCHOOLS) L.schools[s.id] = { ...s, joined: START_YEAR };
  for (const s of SPORT_CATALOG) L.sports[s.id] = structuredClone({ ...s, active: STARTER_SPORTS.includes(s.id), custom: false });
  L.years[START_YEAR] = newYear(START_YEAR);
  for (const id of STARTER_SPORTS) seedSport(L, id);
  return L;
}

// Give every school that has this sport in real life its program, starting
// in the effective year. Schools that ever had a program in the sport in this
// dynasty (including ones the commissioner dropped) are left alone.
export function seedSport(L, sport) {
  const year = effectiveYear(L);
  let n = 0;
  for (const p of seedFor(sport, Object.keys(L.schools))) {
    if (!L.schools[p.school] || L.programs[pkey(p.school, sport)]) continue;
    L.programs[pkey(p.school, sport)] = { school: p.school, sport, off: p.off, def: p.def, prestige: p.prestige, from: year, to: null, level: p.level || '', note: p.note || '' };
    n++;
  }
  return n;
}

export function newYear(year) { return { year, phase: 'preseason', week: 0, sports: {} }; }

export function migrateLeague(L) {
  L.settings ??= {}; L.settings.autoMin ??= 6; L.settings.form ??= 'normal';
  L.log ??= []; L.nextId ??= 1;
  return L;
}

export const pkey = (school, sport) => `${school}:${sport}`;
export const newId = (L, prefix) => `${prefix}${L.nextId++}`;

// ------------------------------------------------------------------ queries
export const curYear = L => L.years[L.currentYear];
export const schoolName = (L, id) => L.schools[id]?.short || id;

// Changes made now take effect this year while it is still in the
// preseason, otherwise next year.
export function effectiveYear(L) { return curYear(L).phase === 'preseason' ? L.currentYear : L.currentYear + 1; }

export function activeSports(L) { return Object.values(L.sports).filter(s => s.active); }

export function program(L, school, sport) { return L.programs[pkey(school, sport)]; }
export function hasProgram(L, school, sport, year) { const p = program(L, school, sport); return !!p && live(p, year); }
export function programsIn(L, sport, year) { return Object.values(L.programs).filter(p => p.sport === sport && live(p, year)); }
export function schoolPrograms(L, school, year) { return Object.values(L.programs).filter(p => p.school === school && live(p, year)); }

export function confLive(c, year) { return c.founded <= year && (c.dissolved == null || c.dissolved > year); }
export function conferencesIn(L, year) { return Object.values(L.conferences).filter(c => confLive(c, year)); }

export function membershipsOf(L, school, year) { return L.memberships.filter(m => m.school === school && live(m, year)); }

// The conference a school plays `sport` in. A sport-specific membership
// (affiliate, or a sport-only conference) wins over the school's all-sports
// home; a home conference counts only if it sponsors the sport.
export function confOf(L, school, sport, year) {
  if (!hasProgram(L, school, sport, year)) return null;
  const ms = membershipsOf(L, school, year).filter(m => L.conferences[m.conf] && confLive(L.conferences[m.conf], year));
  const aff = ms.find(m => m.sports && m.sports.includes(sport) && L.conferences[m.conf].sponsors.includes(sport));
  if (aff) return aff.conf;
  const home = ms.find(m => !m.sports && L.conferences[m.conf].sponsors.includes(sport));
  return home ? home.conf : null;
}

export function homeConf(L, school, year) { return membershipsOf(L, school, year).find(m => !m.sports)?.conf || null; }

// Teams playing `sport` in conference `conf`.
export function confMembers(L, conf, sport, year) {
  return programsIn(L, sport, year).map(p => p.school).filter(s => confOf(L, s, sport, year) === conf);
}

// Every school with a membership in `conf` and how it belongs.
export function confRoster(L, conf, year) {
  return L.memberships.filter(m => m.conf === conf && live(m, year)).map(m => ({ ...m, kind: m.sports ? 'affiliate' : 'full' }));
}

// ------------------------------------------------------------------- edits
function note(L, year, text) { L.log.push({ year, text }); }

export function createConference(L, { name, abbr, color = '#33475b', sponsors = [], sportOnly = false }) {
  const year = effectiveYear(L);
  const id = newId(L, 'c');
  L.conferences[id] = { id, name, abbr: abbr || name, color, sponsors: [...sponsors], sportOnly, founded: year, dissolved: null };
  note(L, year, `${name} was founded.`);
  return id;
}

export function dissolveConference(L, conf) {
  const year = effectiveYear(L), c = L.conferences[conf];
  for (const m of L.memberships) if (m.conf === conf && live(m, year)) endMembership(L, m, year);
  if (c.founded >= year) delete L.conferences[conf]; else c.dissolved = year;
  note(L, year, `${c.name} was dissolved.`);
}

function endMembership(L, m, year) {
  if (m.from >= year) L.memberships.splice(L.memberships.indexOf(m), 1); else m.to = year;
}

// A school joins `conf`. `sports` = null for a full (all-sports) member, or
// the list of sports for an affiliate. Joining as a full member ends the
// school's previous full membership; joining as an affiliate in a sport ends
// any other affiliate membership in that sport.
export function joinConference(L, school, conf, sports = null) {
  const year = effectiveYear(L);
  for (const m of [...membershipsOf(L, school, year)]) {
    if (m.conf === conf) endMembership(L, m, year);
    else if (!sports && !m.sports) endMembership(L, m, year);
    else if (sports && m.sports) {
      const keep = m.sports.filter(s => !sports.includes(s));
      if (keep.length !== m.sports.length) {
        endMembership(L, m, year);
        if (keep.length) L.memberships.push({ id: newId(L, 'm'), school, conf: m.conf, sports: keep, from: year, to: null });
      }
    }
  }
  L.memberships.push({ id: newId(L, 'm'), school, conf, sports: sports ? [...sports] : null, from: year, to: null });
  const c = L.conferences[conf];
  note(L, year, sports ? `${schoolName(L, school)} joined the ${c.name} as an affiliate member in ${sports.map(s => L.sports[s]?.name || s).join(', ')}.` : `${schoolName(L, school)} joined the ${c.name}.`);
}

export function leaveConference(L, membershipId) {
  const year = effectiveYear(L), m = L.memberships.find(x => x.id === membershipId);
  if (!m) return;
  endMembership(L, m, year);
  note(L, year, `${schoolName(L, m.school)} left the ${L.conferences[m.conf]?.name}${m.sports ? ` (${m.sports.map(s => L.sports[s]?.name || s).join(', ')})` : ''}.`);
}

export function addProgram(L, school, sport, { off = 45, def = 45 } = {}) {
  const year = effectiveYear(L), k = pkey(school, sport), old = L.programs[k];
  const rating = { off: clamp(+off, 25, 99), def: clamp(+def, 25, 99) };
  if (old && live(old, year)) return;
  // A dropped program that comes back keeps its history; seasons already
  // played keep their own team lists, so the gap years stay correct there.
  if (old) { old.to = null; old.from = Math.min(old.from, year); Object.assign(old, rating); old.restarted = year; }
  else L.programs[k] = { school, sport, ...rating, prestige: (rating.off + rating.def) / 2, from: year, to: null, level: '', note: '' };
  note(L, year, `${schoolName(L, school)} added ${L.sports[sport].name}.`);
}

export function dropProgram(L, school, sport) {
  const year = effectiveYear(L), p = program(L, school, sport);
  if (!p || !live(p, year)) return;
  // Keep a dropped program on record (even one that never played) so turning
  // the sport off and on again does not bring it back.
  p.to = Math.max(p.from, year);
  note(L, year, `${schoolName(L, school)} dropped ${L.sports[sport].name}.`);
}

export function addSchool(L, data) {
  const id = data.id || data.short.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (L.schools[id]) throw new Error(`A school with id "${id}" already exists.`);
  L.schools[id] = { id, name: data.name, short: data.short, mascot: data.mascot || '', city: data.city || '', state: data.state || '', country: data.country || 'US', colors: data.colors || ['#33475b', '#ffffff'], logo: data.logo || '', aau: null, private: !!data.private, joined: effectiveYear(L) };
  note(L, effectiveYear(L), `${data.short} joined the association.`);
  return id;
}

export function addSport(L, base, data) {
  const id = data.id || (data.name.toLowerCase().replace(/[^a-z0-9]+/g, '')).slice(0, 8);
  if (L.sports[id]) throw new Error(`A sport with id "${id}" already exists.`);
  L.sports[id] = { ...structuredClone(L.sports[base]), ...data, id, active: true, custom: true };
  return id;
}

// Calendar: week 1 starts on the last Monday of August.
export function weekStart(year, week) {
  const d = new Date(Date.UTC(year, 7, 31));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  d.setUTCDate(d.getUTCDate() + (week - 1) * 7);
  return d;
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function weekLabel(year, week) {
  if (week < 1) return 'Preseason';
  const d = weekStart(year, week);
  return `Week ${week} · ${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
