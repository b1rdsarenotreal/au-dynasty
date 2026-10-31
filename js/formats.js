// Championship formats. A national championship is a list of stages; each
// stage is `groups` sites of `size` teams playing one event format. The
// first stage takes the whole field (seeds placed serpentine, so with 8
// regionals: 1-16-17-32, 2-15-18-31, ...). Each later stage takes the teams
// the previous one sends on: when every site sends its winner, sites are
// paired in bracket order (the 1 seed's site meets the last host's), as in
// MCS super regionals and World Series brackets.
//
// Every value is editable per sport in Settings → Championship. The defaults
// follow each sport's real NCAA championship, scaled to the AAU's size.

const V = (name, city) => ({ name, city });

const stage = (o) => ({ name: 'Championship', label: '', groups: 1, size: 2, kind: 'single', bestOf: 1, finalBestOf: 1, ifNecessary: true, gpm: 1, advance: 1, hosting: 'venue', campusRounds: 0, roundsPerWeek: 99, venues: [], ...o });

export const DEFAULT_FORMATS = {
  fb: { field: 12, stages: [stage({ name: 'College Football Playoff', size: 12, campusRounds: 1, roundsPerWeek: 1,
    venues: [V('Quarterfinal bowls', 'Pasadena, Miami Gardens, Arlington, New Orleans'), V('Semifinal bowls', 'Atlanta and Glendale'), V('Championship Game', 'Indianapolis, IN')] })] },
  msoc: { field: 32, stages: [
    stage({ name: 'Early rounds', label: 'Bracket', groups: 4, size: 8, hosting: 'higherSeed' }),
    stage({ name: 'Men\'s College Cup', size: 4, venues: [V('Sahlen\'s Stadium', 'Cary, NC')] })] },
  wsoc: { field: 32, stages: [
    stage({ name: 'Early rounds', label: 'Bracket', groups: 4, size: 8, hosting: 'higherSeed' }),
    stage({ name: 'Women\'s College Cup', size: 4, venues: [V('WakeMed Soccer Park', 'Cary, NC')] })] },
  wvb: { field: 32, stages: [
    stage({ name: 'First and second rounds', label: 'Site', groups: 8, size: 4, hosting: 'topSeed' }),
    stage({ name: 'Regionals', label: 'Regional', groups: 4, size: 2, hosting: 'topSeed' }),
    stage({ name: 'Final Four', size: 4, venues: [V('T-Mobile Center', 'Kansas City, MO')] })] },
  fh: { field: 16, stages: [
    stage({ name: 'First round and quarterfinals', label: 'Site', groups: 4, size: 4, hosting: 'topSeed' }),
    stage({ name: 'Final Four', size: 4, venues: [V('Karen Shelton Stadium', 'Chapel Hill, NC')] })] },
  mwp: { field: 8, stages: [stage({ name: 'NCAA Championship', size: 8, venues: [V('Avery Aquatic Center', 'Stanford, CA')] })] },
  mbb: { field: 32, stages: [
    stage({ name: 'First weekend', label: 'Pod', groups: 8, size: 4, venues: [V('Bon Secours Wellness Arena', 'Greenville, SC'), V('Rupp Arena', 'Lexington, KY'), V('Amica Mutual Pavilion', 'Providence, RI'), V('INTRUST Bank Arena', 'Wichita, KS'), V('Ball Arena', 'Denver, CO'), V('Lenovo Center', 'Raleigh, NC'), V('Rocket Arena', 'Cleveland, OH'), V('Climate Pledge Arena', 'Seattle, WA')] }),
    stage({ name: 'Regionals', label: 'Regional', groups: 4, size: 2, venues: [V('East Regional', 'Newark, NJ'), V('South Regional', 'Houston, TX'), V('Midwest Regional', 'Chicago, IL'), V('West Regional', 'San Jose, CA')] }),
    stage({ name: 'Final Four', size: 4, venues: [V('Lucas Oil Stadium', 'Indianapolis, IN')] })] },
  wbb: { field: 32, stages: [
    stage({ name: 'First and second rounds', label: 'Site', groups: 8, size: 4, hosting: 'topSeed' }),
    stage({ name: 'Regionals', label: 'Regional', groups: 4, size: 2, venues: [V('Regional 1', 'Spokane, WA'), V('Regional 2', 'Birmingham, AL'), V('Regional 3', 'Albany, NY'), V('Regional 4', 'Portland, OR')] }),
    stage({ name: 'Final Four', size: 4, venues: [V('Mortgage Matchup Center', 'Phoenix, AZ')] })] },
  mih: { field: 16, stages: [
    stage({ name: 'Regionals', label: 'Regional', groups: 4, size: 4, venues: [V('Northeast Regional', 'Manchester, NH'), V('East Regional', 'Allentown, PA'), V('Midwest Regional', 'Toledo, OH'), V('West Regional', 'Sioux Falls, SD')] }),
    stage({ name: 'Frozen Four', size: 4, venues: [V('T-Mobile Arena', 'Las Vegas, NV')] })] },
  wih: { field: 8, stages: [
    stage({ name: 'Quarterfinals', label: 'Quarterfinal', groups: 4, size: 2, hosting: 'higherSeed' }),
    stage({ name: 'Frozen Four', size: 4, venues: [V('Frozen Four site', 'Duluth, MN')] })] },
  base: { field: 32, stages: [
    stage({ name: 'Regionals', label: 'Regional', groups: 8, size: 4, kind: 'double', hosting: 'topSeed' }),
    stage({ name: 'Men\'s College World Series', label: 'Bracket', groups: 2, size: 4, kind: 'double', venues: [V('Charles Schwab Field', 'Omaha, NE')] }),
    stage({ name: 'Championship Series', size: 2, bestOf: 3, finalBestOf: 3, venues: [V('Charles Schwab Field', 'Omaha, NE')] })] },
  sb: { field: 32, stages: [
    stage({ name: 'Regionals', label: 'Regional', groups: 8, size: 4, kind: 'double', hosting: 'topSeed' }),
    stage({ name: 'Women\'s College World Series', label: 'Bracket', groups: 2, size: 4, kind: 'double', venues: [V('Devon Park', 'Oklahoma City, OK')] }),
    stage({ name: 'Championship Series', size: 2, bestOf: 3, finalBestOf: 3, venues: [V('Devon Park', 'Oklahoma City, OK')] })] },
  mlax: { field: 16, stages: [
    stage({ name: 'First round', label: 'Game', groups: 8, size: 2, hosting: 'higherSeed' }),
    stage({ name: 'Quarterfinals', label: 'Quarterfinal', groups: 4, size: 2, venues: [V('Quarterfinal site A', 'Hempstead, NY'), V('Quarterfinal site A', 'Hempstead, NY'), V('Quarterfinal site B', 'Philadelphia, PA'), V('Quarterfinal site B', 'Philadelphia, PA')] }),
    stage({ name: 'Championship Weekend', size: 4, venues: [V('Gillette Stadium', 'Foxborough, MA')] })] },
  wlax: { field: 16, stages: [
    stage({ name: 'First and second rounds', label: 'Site', groups: 4, size: 4, hosting: 'topSeed' }),
    stage({ name: 'Championship Weekend', size: 4, venues: [V('Gillette Stadium', 'Foxborough, MA')] })] },
  mvb: { field: 8, stages: [stage({ name: 'NCAA Championship', size: 8, campusRounds: 1, venues: [V('Pauley Pavilion', 'Los Angeles, CA')] })] },
  wwp: { field: 8, stages: [stage({ name: 'NCAA Championship', size: 8, venues: [V('Spieker Aquatics Complex', 'Berkeley, CA')] })] },
  bvb: { field: 8, stages: [stage({ name: 'NCAA Championship', size: 8, kind: 'double', ifNecessary: false, venues: [V('Gulf Place', 'Gulf Shores, AL')] })] },
};

// Conference tournament defaults per sport. size 0 = no tournament; a size
// bigger than the conference means everyone.
export const DEFAULT_CONF_TOURNEY = {
  fb: { size: 2, kind: 'single', bestOf: 1, hosting: 'higherSeed' },
  msoc: { size: 6, kind: 'single', bestOf: 1, hosting: 'higherSeed' },
  wsoc: { size: 8, kind: 'single', bestOf: 1, hosting: 'rotate' },
  wvb: { size: 0, kind: 'single', bestOf: 1, hosting: 'rotate' },
  fh: { size: 4, kind: 'single', bestOf: 1, hosting: 'topSeed' },
  mwp: { size: 4, kind: 'single', bestOf: 1, hosting: 'topSeed' },
  mbb: { size: 99, kind: 'single', bestOf: 1, hosting: 'rotate' },
  wbb: { size: 99, kind: 'single', bestOf: 1, hosting: 'rotate' },
  mih: { size: 8, kind: 'single', bestOf: 1, hosting: 'higherSeed' },
  wih: { size: 8, kind: 'single', bestOf: 1, hosting: 'higherSeed' },
  base: { size: 8, kind: 'double', bestOf: 1, hosting: 'rotate', ifNecessary: false },
  sb: { size: 8, kind: 'double', bestOf: 1, hosting: 'rotate', ifNecessary: false },
  mlax: { size: 4, kind: 'single', bestOf: 1, hosting: 'topSeed' },
  wlax: { size: 6, kind: 'single', bestOf: 1, hosting: 'topSeed' },
  mvb: { size: 6, kind: 'single', bestOf: 1, hosting: 'topSeed' },
  wwp: { size: 6, kind: 'single', bestOf: 1, hosting: 'rotate' },
  bvb: { size: 0, kind: 'double', bestOf: 1, hosting: 'rotate', ifNecessary: false },
};

export const defaultFormat = id => structuredClone(DEFAULT_FORMATS[id] || { field: 8, stages: [stage({ size: 8 })] });
export const defaultConfTourney = id => ({ finalBestOf: undefined, ifNecessary: false, campusRounds: 0, ...structuredClone(DEFAULT_CONF_TOURNEY[id] || { size: 4, kind: 'single', bestOf: 1, hosting: 'topSeed' }) });
export const newStage = o => stage(o);

// Problems with a format, as sentences (empty when it works).
export function checkFormat(f, teamCount = Infinity) {
  const out = [];
  if (!f.stages?.length) return ['Add at least one stage.'];
  if (f.field < 2) out.push('The field needs at least 2 teams.');
  if (f.field > teamCount) out.push(`The field (${f.field}) is bigger than the ${teamCount} teams in the sport.`);
  let incoming = f.field;
  f.stages.forEach((s, i) => {
    const label = `Stage ${i + 1} (${s.name})`;
    if (s.groups < 1 || s.size < 2) out.push(`${label}: each site needs at least 2 teams.`);
    const cap = s.groups * s.size;
    if (cap !== incoming) out.push(`${label} holds ${s.groups} × ${s.size} = ${cap} teams, but ${incoming} arrive${i ? ' from the stage before' : ' (the field)'}.`);
    if (s.kind === 'pool' && (s.advance < 1 || s.advance >= s.size) && i < f.stages.length - 1) out.push(`${label}: pools must send on fewer teams than they hold.`);
    incoming = s.groups * (s.kind === 'pool' ? s.advance : 1);
  });
  if (incoming !== 1) out.push(`The last stage leaves ${incoming} teams; it needs to end with one champion (one site, sending on one team).`);
  return out;
}

// A one-line description of a format.
export function describeFormat(f, kinds) {
  return f.stages.map(s => `${s.name}: ${s.groups > 1 ? `${s.groups} × ${s.size}-team ${s.label || 'site'}s` : `${s.size} teams`}, ${kinds[s.kind].toLowerCase()}${s.bestOf > 1 ? `, best of ${s.bestOf}` : ''}${s.finalBestOf > 1 && s.finalBestOf !== s.bestOf ? `, final best of ${s.finalBestOf}` : ''}`).join(' → ');
}
