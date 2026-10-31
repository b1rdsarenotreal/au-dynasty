// Starting programs and ratings for the starter sports.
//
// Which schools sponsor each sport comes from Wikipedia's lists of NCAA
// Division I and Division III programs (Canadian schools: U Sports).
// Ratings are an overall level (OVR, about 30–99) built from each program's
// most recent real season: final AP / ESPN–USA Softball / FCS polls, NCAA
// tournament results and records on Wikipedia. Programs that weren't ranked
// were placed by their level (Power conference, mid-major, FCS, Division III,
// U Sports) and recent record. These are starting points: edit any of them
// in the app.
//
// Sources: 2025 FBS and FCS final rankings (football), 2025–26 final AP poll
// (women's basketball), 2026 final ESPN.com/USA Softball poll and 2026 NCAA
// softball tournament (softball).

import { hashStr } from './util.js?v=20261030224435';

export const STARTER_SPORTS = ['fb', 'wbb', 'sb'];

// [school, OVR, level]
const FB = `indiana 95 FBS|ohiostate 92 FBS|miami 91 FBS|oregon 91 FBS|tamu 88 FBS|notredame 88 FBS|texas 87 FBS|utah 86 FBS
vanderbilt 85 FBS|virginia 84 FBS|iowa 83 FBS|usc 83 FBS|michigan 83 FBS|arizona 81 FBS|gatech 80 FBS|washington 79 FBS
missouri 79 FBS|illinois 79 FBS|tulane 78 FBS|asu 77 FBS|duke 76 FBS|pennstate 76 FBS|pitt 76 FBS|minnesota 75 FBS
usf 74 FBS|northwestern 73 FBS|florida 73 FBS|kansas 72 FBS|cal 71 FBS|wisconsin 70 FBS|rutgers 70 FBS|unc 69 FBS
maryland 69 FBS|msu 68 FBS|ucla 68 FBS|colorado 68 FBS|stanford 67 FBS|purdue 64 FBS|rice 62 FBS|uab 60 FBS|buffalo 60 FBS
ucdavis 60 FCS|yale 57 FCS|harvard 56 FCS|dartmouth 52 FCS|stonybrook 50 FCS|princeton 50 FCS|penn 50 FCS|brown 47 FCS
columbia 47 FCS|cornell 46 FCS|georgetown 45 FCS
jhu 42 D3|chicago 40 D3|cmu 39 D3|washu 38 D3|case 37 D3|mit 37 D3|rochester 36 D3|tufts 36 D3
toronto 36 USports|mcgill 34 USports`;

const WBB = `ucla 96 D1|texas 92 D1|duke 89 D1|michigan 89 D1|notredame 87 D1|vanderbilt 87 D1|unc 85 D1|minnesota 84 D1
iowa 84 D1|ohiostate 84 D1|maryland 82 D1|usc 82 D1|virginia 81 D1|msu 81 D1|stanford 80 D1|washington 79 D1
oregon 78 D1|illinois 78 D1|utah 74 D1|florida 73 D1|colorado 73 D1|miami 72 D1|gatech 72 D1|kansas 72 D1
cal 72 D1|princeton 72 D1|indiana 70 D1|missouri 70 D1|asu 70 D1|usf 70 D1|columbia 70 D1|harvard 69 D1
tamu 68 D1|arizona 66 D1|pennstate 66 D1|gwu 66 D1|northwestern 64 D1|wisconsin 64 D1|rice 64 D1|georgetown 64 D1
purdue 63 D1|uab 63 D1|tulane 62 D1|uci 61 D1|rutgers 60 D1|pitt 60 D1|stonybrook 60 D1|ucsb 60 D1
ucdavis 60 D1|penn 58 D1|buffalo 58 D1|brown 57 D1|ucsd 57 D1|yale 56 D1|cornell 56 D1|bu 55 D1
ucr 52 D1|dartmouth 50 D1
nyu 50 D3|tufts 47 D3|washu 46 D3|cmu 46 D3|chicago 45 D3|emory 45 D3|rochester 45 D3|jhu 45 D3
case 42 D3|brandeis 42 D3|mit 40 D3|ucsc 34 D3|caltech 30 D3
toronto 42 USports|mcgill 40 USports`;

const SB = `texas 96 D1|ucla 92 D1|florida 90 D1|duke 88 D1|asu 87 D1|tamu 86 D1|oregon 85 D1|arizona 85 D1
stanford 85 D1|gatech 82 D1|washington 82 D1|michigan 81 D1|virginia 80 D1|wisconsin 79 D1|indiana 79 D1|kansas 77 D1
missouri 77 D1|northwestern 76 D1|usf 76 D1|unc 74 D1|utah 74 D1|notredame 74 D1|ohiostate 73 D1|minnesota 73 D1
illinois 72 D1|cal 72 D1|iowa 70 D1|pennstate 70 D1|maryland 70 D1|uab 68 D1|msu 66 D1|princeton 66 D1
rutgers 64 D1|pitt 64 D1|bu 64 D1|purdue 63 D1|ucdavis 63 D1|stonybrook 62 D1|ucsb 62 D1|ucsd 61 D1
harvard 60 D1|ucr 60 D1|buffalo 60 D1|columbia 58 D1|dartmouth 58 D1|gwu 58 D1|cornell 57 D1|yale 55 D1
georgetown 54 D1|penn 54 D1|brown 52 D1
tufts 46 D3|washu 46 D3|emory 46 D3|chicago 42 D3|case 42 D3|rochester 42 D3|cmu 40 D3|nyu 40 D3
brandeis 40 D3|mit 38 D3`;

function parse(sport, text) {
  return text.split(/[|\n]/).map(x => x.trim()).filter(Boolean).map(row => {
    const [school, o, level] = row.split(/\s+/);
    const ovr = Number(o);
    // Split OVR into OFF and DEF a few points apart so teams have a style.
    const d = (hashStr(`${school}:${sport}`) % 7) - 3;
    return { school, sport, off: ovr + d, def: ovr - d, prestige: ovr, level };
  });
}

// ---------------------------------------------------------------- the rest
// Who sponsors each other sport. Division I lists come from Wikipedia's
// "List of NCAA Division I … programs" pages (men's and women's soccer,
// women's volleyball, field hockey, ice hockey, lacrosse), its list of
// Division I schools without baseball, its lists of NCAA men's volleyball and
// women's beach volleyball programs, and its NCAA men's water polo
// championship appearances. Division III, Canadian and women's water polo
// sponsorship is from general knowledge and may need a check.
//
// Ratings for these sports are ESTIMATES, not yet built from results: a base
// by level (Power conference, other Division I, Ivy, Division III, U Sports)
// with well-known strong programs raised. They will be replaced by a
// Wikipedia ratings pass sport by sport.

const POWER = new Set('asu arizona cal ucla usc stanford colorado duke florida gatech illinois indiana iowa kansas maryland miami michigan msu minnesota missouri unc northwestern notredame ohiostate oregon pennstate pitt purdue rutgers texas tamu utah vanderbilt virginia washington wisconsin'.split(' '));
const IVY = new Set('brown columbia cornell dartmouth harvard penn princeton yale'.split(' '));
const D3 = new Set('brandeis caltech cmu case chicago emory jhu mit nyu rochester tufts washu ucsc'.split(' '));
const USPORTS = new Set(['mcgill', 'toronto']);
const UAA = 'brandeis cmu case chicago emory nyu rochester washu';

// sport: [schools (D1 then D3/U Sports), "school rating" overrides]
const OTHER = {
  msoc: [`bu brown cal ucdavis uci ucla ucr ucsd ucsb columbia cornell dartmouth duke gwu georgetown harvard indiana maryland michigan msu unc northwestern notredame ohiostate penn pennstate pitt princeton rutgers usf stanford stonybrook uab virginia washington wisconsin yale ${UAA} tufts mit jhu caltech ucsc toronto mcgill`,
    'unc 80 stanford 78 indiana 80 ohiostate 77 maryland 76 duke 76 virginia 75 georgetown 78 pitt 75 washington 75 notredame 74 cornell 64 ucsb 66 ucla 66'],
  wsoc: [`asu arizona bu brown buffalo cal ucdavis uci ucla ucr ucsd ucsb colorado columbia cornell dartmouth duke florida gwu georgetown harvard illinois indiana iowa kansas maryland miami michigan msu minnesota missouri unc northwestern notredame ohiostate oregon penn pennstate pitt princeton purdue rice rutgers usc usf stanford stonybrook texas tamu tulane uab utah vanderbilt virginia washington wisconsin yale ${UAA} tufts mit jhu ucsc toronto mcgill`,
    'stanford 88 unc 88 duke 82 ucla 85 usc 78 texas 74 virginia 78 notredame 80 pennstate 80 michigan 74 washington 72 tamu 73 georgetown 74 florida 68 harvard 62 princeton 62 rice 64'],
  wvb: [`asu arizona bu brown buffalo cal ucdavis uci ucla ucr ucsd ucsb colorado columbia cornell dartmouth duke florida gwu georgetown gatech harvard illinois indiana iowa kansas maryland miami michigan msu minnesota missouri unc northwestern notredame ohiostate oregon penn pennstate pitt princeton purdue rice rutgers usc usf stanford stonybrook texas tamu tulane uab utah vanderbilt virginia washington wisconsin yale ${UAA} tufts mit jhu caltech ucsc toronto`,
    'pennstate 88 texas 88 stanford 84 pitt 86 wisconsin 85 minnesota 80 oregon 78 purdue 80 usc 75 washington 72 tamu 74 kansas 76 arizona 70 utah 73 unc 70 florida 78 gatech 76 ucla 70 rice 66 washu 46 emory 46 nyu 44'],
  fh: ['bu brown cal ucdavis columbia cornell dartmouth duke georgetown harvard indiana iowa maryland michigan msu northwestern unc ohiostate penn pennstate princeton rutgers stanford virginia yale jhu tufts mit washu rochester',
    'unc 90 northwestern 88 maryland 82 virginia 80 duke 80 pennstate 78 iowa 78 michigan 78 princeton 80 harvard 76 stanford 70 cal 62 ohiostate 66 rutgers 70 msu 64 indiana 66 cornell 64 yale 62 bu 64 ucdavis 58 tufts 46 jhu 44'],
  mwp: ['cal stanford ucla usc uci ucsb ucsd ucdavis harvard princeton brown gwu jhu mit caltech',
    'ucla 90 usc 87 cal 90 stanford 85 uci 75 ucsb 70 ucsd 70 ucdavis 68 princeton 66 harvard 64 brown 58 gwu 56 jhu 50 mit 40 caltech 32'],
  mbb: ['*',
    'duke 92 michigan 92 florida 88 purdue 86 arizona 90 illinois 84 unc 82 kansas 82 tamu 76 vanderbilt 80 ucla 78 usc 74 wisconsin 80 msu 85 indiana 70 ohiostate 74 maryland 70 oregon 72 utah 66 asu 66 colorado 64 washington 66 stanford 70 cal 66 gatech 62 virginia 76 notredame 64 pitt 62 miami 70 missouri 74 minnesota 60 northwestern 64 pennstate 60 rutgers 64 iowa 72 texas 74 georgetown 66 ucsd 70 uci 68 ucsb 64 ucdavis 60 ucr 58 princeton 64 yale 66 harvard 58 cornell 62 columbia 54 dartmouth 54 brown 56 penn 52 usf 64 uab 66 rice 58 tulane 60 gwu 64 bu 54 buffalo 50 stonybrook 54 washu 46 nyu 44 emory 46 chicago 44 case 42 cmu 44 rochester 44 jhu 46 tufts 46 mit 42 brandeis 42 ucsc 36 caltech 28 toronto 42 mcgill 40'],
  mih: ['asu bu brown cornell dartmouth harvard michigan msu minnesota notredame ohiostate pennstate princeton wisconsin yale toronto mcgill',
    'bu 84 michigan 86 msu 86 minnesota 85 wisconsin 82 ohiostate 76 pennstate 80 notredame 74 cornell 80 harvard 74 dartmouth 68 yale 66 princeton 64 brown 62 asu 72 toronto 42 mcgill 42'],
  wih: ['bu brown cornell dartmouth harvard minnesota ohiostate pennstate princeton wisconsin yale toronto mcgill',
    'wisconsin 92 ohiostate 92 minnesota 86 cornell 82 pennstate 76 bu 70 harvard 72 yale 78 princeton 74 dartmouth 64 brown 62 toronto 44 mcgill 48'],
  base: ['asu arizona brown cal ucdavis uci ucla ucr ucsd ucsb columbia cornell dartmouth duke florida gwu georgetown gatech harvard illinois indiana iowa kansas maryland miami michigan msu minnesota missouri unc northwestern notredame ohiostate oregon penn pennstate pitt princeton purdue rice rutgers usc usf stanford stonybrook texas tamu tulane uab utah vanderbilt virginia washington yale brandeis case chicago emory jhu mit rochester tufts washu caltech',
    'florida 82 texas 82 tamu 82 vanderbilt 82 unc 82 virginia 80 oregon 78 stanford 76 ucla 82 usc 72 arizona 78 asu 74 gatech 76 duke 74 miami 74 notredame 70 michigan 68 msu 64 illinois 66 indiana 70 iowa 70 maryland 68 minnesota 60 missouri 62 northwestern 58 ohiostate 62 pennstate 66 purdue 66 rutgers 70 washington 66 utah 62 kansas 70 pitt 64 cal 66 rice 62 tulane 68 usf 70 uab 62 ucsb 74 uci 74 ucsd 66 ucdavis 60 ucr 56 stonybrook 64 georgetown 58 gwu 58 columbia 58 penn 58 yale 56 harvard 52 emory 46 jhu 46 tufts 44 case 44 caltech 26'],
  mlax: ['bu brown cornell dartmouth duke georgetown harvard jhu maryland michigan unc notredame ohiostate penn pennstate princeton rutgers stonybrook utah virginia yale tufts mit case',
    'notredame 90 maryland 88 cornell 88 duke 84 pennstate 84 jhu 82 georgetown 80 unc 80 virginia 80 princeton 80 harvard 72 yale 76 penn 76 michigan 74 ohiostate 74 rutgers 74 brown 68 dartmouth 60 bu 66 stonybrook 64 utah 66 tufts 46 mit 38 case 38'],
  wlax: ['asu bu brown cal ucdavis colorado columbia cornell dartmouth duke florida gwu georgetown harvard jhu maryland michigan unc northwestern notredame ohiostate oregon penn pennstate pitt princeton rutgers usf stanford stonybrook usc vanderbilt virginia yale tufts mit rochester',
    'northwestern 92 unc 92 maryland 84 florida 84 stanford 76 duke 80 jhu 80 pennstate 80 notredame 78 yale 78 virginia 78 princeton 78 usc 74 michigan 74 georgetown 70 cornell 70 harvard 68 penn 72 rutgers 70 ohiostate 66 oregon 64 asu 64 cal 58 colorado 66 vanderbilt 64 pitt 60 usf 60 dartmouth 60 brown 58 columbia 60 bu 64 stonybrook 74 ucdavis 54 gwu 56 tufts 44 mit 36 rochester 38'],
  mvb: ['uci ucla ucsd ucsb harvard ohiostate pennstate princeton stanford usc ucsc mit nyu',
    'ucla 90 usc 84 stanford 76 uci 86 ucsb 82 ucsd 74 pennstate 72 ohiostate 72 harvard 56 princeton 66 nyu 40 mit 38 ucsc 36'],
  wwp: ['cal stanford ucla usc uci ucsb ucsd ucdavis asu michigan indiana princeton harvard brown gwu caltech',
    'stanford 90 ucla 88 usc 88 cal 86 uci 76 ucsb 68 ucsd 64 ucdavis 68 asu 70 michigan 72 indiana 64 princeton 66 harvard 62 brown 56 gwu 56 caltech 30'],
  bvb: ['asu arizona cal ucdavis ucla stanford usc usf tulane uab texas washington oregon',
    'ucla 90 usc 88 texas 72 stanford 80 cal 74 asu 76 arizona 72 usf 70 tulane 74 uab 66 washington 64 oregon 62 ucdavis 68'],
};

const levelOf = id => (USPORTS.has(id) ? 'USports' : D3.has(id) ? 'D3' : IVY.has(id) ? 'Ivy' : POWER.has(id) ? 'Power' : 'D1');
const BASE = { Power: 64, D1: 56, Ivy: 52, D3: 38, USports: 38 };

function estimated(sport, [list, over]) {
  const o = {};
  const t = over.split(/\s+/);
  for (let i = 0; i < t.length; i += 2) o[t[i]] = Number(t[i + 1]);
  const ids = list === '*' ? null : list.split(/\s+/);
  return { sport, ids, o };
}

const EST = Object.entries(OTHER).map(([sport, v]) => estimated(sport, v));

// All school ids are needed for sports every school plays (men's basketball).
export function seedFor(sport, allSchools) {
  if (sport === 'fb' || sport === 'wbb' || sport === 'sb') return SEED_PROGRAMS.filter(p => p.sport === sport);
  const e = EST.find(x => x.sport === sport);
  if (!e) return [];
  return (e.ids || allSchools).map(school => {
    const ovr = e.o[school] ?? BASE[levelOf(school)];
    const d = (hashStr(`${school}:${sport}`) % 7) - 3;
    return { school, sport, off: ovr + d, def: ovr - d, prestige: ovr, level: levelOf(school), note: 'estimated' };
  });
}

export const SEED_PROGRAMS = [...parse('fb', FB), ...parse('wbb', WBB), ...parse('sb', SB)];
