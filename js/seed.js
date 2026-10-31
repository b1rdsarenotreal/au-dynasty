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

import { hashStr } from './util.js?v=20261030221621';

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

export const SEED_PROGRAMS = [...parse('fb', FB), ...parse('wbb', WBB), ...parse('sb', SB)];
