// Sports catalog. A sport is only settings: which game model it uses, when it
// is played, how its schedule is built and how its championship works. New
// sports are added in the app by copying one of these and changing it.
//
// Calendar weeks count from the last Monday of August (week 1) through June.
//
// model:    'football' | 'periods' | 'innings' | 'sets'
// season:   [first week, last regular-season week]; postseason follows
// slots:    game slots per week. 1 = one game; a {series: 3} slot is a
//           three-game series against one opponent (weekend series)
// games:    regular-season games each team aims for
// confGames: conference games target (round robins are trimmed or doubled)
// wp:       spread of the win-chance curve (measured by simulation; lower
//           means favorites win more often)
// post:     national championship: field size, games per round (series),
//           rounds per calendar week, and the round where sites go neutral

export const MODELS = {
  football: 'Football (drives, quarters)',
  periods: 'Timed periods (basketball, soccer, hockey, lacrosse…)',
  innings: 'Innings (baseball, softball)',
  sets: 'Sets (volleyball)',
};

const P = (o) => o; // readability only

export const SPORT_CATALOG = [
  // ---- Fall ----
  P({ id: 'fb', wp: 5, name: 'Football', gender: 'M', model: 'football', term: 'fall', season: [1, 13], slots: [1], games: 12, confGames: 9,
    params: {}, post: { field: 12, series: 1, perWeek: 1, neutralFrom: 3, byes: true } }),
  P({ id: 'msoc', wp: 11, name: "Men's Soccer", gender: 'M', model: 'periods', term: 'fall', season: [1, 11], slots: [1, 1], games: 17, confGames: 8,
    params: { periods: 2, length: 45, avg: 1.45, k: 29, ot: 'none', otLen: 20, ties: true, label: 'H' }, post: { field: 32, series: 1, perWeek: 1, neutralFrom: 5 } }),
  P({ id: 'wsoc', wp: 11, name: "Women's Soccer", gender: 'W', model: 'periods', term: 'fall', season: [1, 11], slots: [1, 1], games: 18, confGames: 10,
    params: { periods: 2, length: 45, avg: 1.5, k: 29, ot: 'none', otLen: 20, ties: true, label: 'H' }, post: { field: 32, series: 1, perWeek: 1, neutralFrom: 5 } }),
  P({ id: 'wvb', wp: 5, name: "Women's Volleyball", gender: 'W', model: 'sets', term: 'fall', season: [1, 15], slots: [1, 1], games: 28, confGames: 18,
    params: { bestOf: 5, to: 25, last: 15 }, post: { field: 32, series: 1, perWeek: 2, neutralFrom: 5 } }),
  P({ id: 'fh', wp: 8.7, name: 'Field Hockey', gender: 'W', model: 'periods', term: 'fall', season: [1, 11], slots: [1, 1], games: 17, confGames: 7,
    params: { periods: 4, length: 15, avg: 2.3, k: 32, ot: 'sudden', otLen: 10, ties: false, label: 'Q' }, post: { field: 16, series: 1, perWeek: 2, neutralFrom: 3 } }),
  P({ id: 'mwp', wp: 5.8, name: "Men's Water Polo", gender: 'M', model: 'periods', term: 'fall', season: [2, 12], slots: [1, 1], games: 24, confGames: 8,
    params: { periods: 4, length: 8, avg: 11, k: 45, ot: 'sudden', otLen: 0, ties: false, label: 'Q' }, post: { field: 8, series: 1, perWeek: 3, neutralFrom: 1 } }),
  // ---- Winter ----
  P({ id: 'mbb', wp: 6, name: "Men's Basketball", gender: 'M', model: 'periods', term: 'winter', season: [11, 28], slots: [1, 1], games: 31, confGames: 20,
    params: { periods: 2, length: 20, avg: 72, k: 100, ot: 'period', otLen: 5, ties: false, label: 'H' }, post: { field: 32, series: 1, perWeek: 2, neutralFrom: 1 } }),
  P({ id: 'wbb', wp: 6.3, name: "Women's Basketball", gender: 'W', model: 'periods', term: 'winter', season: [11, 28], slots: [1, 1], games: 30, confGames: 18,
    params: { periods: 4, length: 10, avg: 68, k: 100, ot: 'period', otLen: 5, ties: false, label: 'Q' }, post: { field: 32, series: 1, perWeek: 2, neutralFrom: 3 } }),
  P({ id: 'mih', wp: 8.7, name: "Men's Ice Hockey", gender: 'M', model: 'periods', term: 'winter', season: [7, 29], slots: [{ series: 2 }], games: 34, confGames: 24,
    params: { periods: 3, length: 20, avg: 3.0, k: 35, ot: 'sudden', otLen: 5, ties: true, label: 'P' }, post: { field: 16, series: 1, perWeek: 2, neutralFrom: 1 } }),
  P({ id: 'wih', wp: 8.7, name: "Women's Ice Hockey", gender: 'W', model: 'periods', term: 'winter', season: [7, 29], slots: [{ series: 2 }], games: 34, confGames: 24,
    params: { periods: 3, length: 20, avg: 2.9, k: 35, ot: 'sudden', otLen: 5, ties: true, label: 'P' }, post: { field: 11, series: 1, perWeek: 2, neutralFrom: 3 } }),
  // ---- Spring ----
  P({ id: 'base', wp: 8, name: 'Baseball', gender: 'M', model: 'innings', term: 'spring', season: [25, 38], slots: [1, { series: 3 }], games: 56, confGames: 30,
    params: { innings: 9, mercy: [10, 7], tiebreak: false, avgRuns: 6.2 }, post: { field: 16, series: 3, perWeek: 1, neutralFrom: 3 } }),
  P({ id: 'sb', wp: 9.6, name: 'Softball', gender: 'W', model: 'innings', term: 'spring', season: [25, 38], slots: [1, { series: 3 }], games: 56, confGames: 24,
    params: { innings: 7, mercy: [8, 5], tiebreak: true, avgRuns: 6.4 }, post: { field: 16, series: 3, perWeek: 1, neutralFrom: 3 } }),
  P({ id: 'mlax', wp: 5.5, name: "Men's Lacrosse", gender: 'M', model: 'periods', term: 'spring', season: [24, 36], slots: [1], games: 14, confGames: 6,
    params: { periods: 4, length: 15, avg: 11.5, k: 45, ot: 'sudden', otLen: 0, ties: false, label: 'Q' }, post: { field: 16, series: 1, perWeek: 2, neutralFrom: 3 } }),
  P({ id: 'wlax', wp: 5.5, name: "Women's Lacrosse", gender: 'W', model: 'periods', term: 'spring', season: [24, 36], slots: [1, 1], games: 17, confGames: 8,
    params: { periods: 4, length: 15, avg: 12.5, k: 45, ot: 'sudden', otLen: 0, ties: false, label: 'Q' }, post: { field: 16, series: 1, perWeek: 2, neutralFrom: 3 } }),
  P({ id: 'mvb', wp: 5.2, name: "Men's Volleyball", gender: 'M', model: 'sets', term: 'spring', season: [20, 34], slots: [{ series: 2 }], games: 26, confGames: 14,
    params: { bestOf: 5, to: 25, last: 15 }, post: { field: 8, series: 1, perWeek: 3, neutralFrom: 1 } }),
  P({ id: 'wwp', wp: 5.8, name: "Women's Water Polo", gender: 'W', model: 'periods', term: 'spring', season: [23, 35], slots: [1, 1], games: 24, confGames: 8,
    params: { periods: 4, length: 8, avg: 10, k: 45, ot: 'sudden', otLen: 0, ties: false, label: 'Q' }, post: { field: 8, series: 1, perWeek: 3, neutralFrom: 1 } }),
  P({ id: 'bvb', wp: 4, name: 'Beach Volleyball', gender: 'W', model: 'sets', term: 'spring', season: [26, 36], slots: [1, 1, 1], games: 26, confGames: 8,
    params: { bestOf: 3, to: 21, last: 15, flights: 5 }, post: { field: 8, series: 1, perWeek: 3, neutralFrom: 1 } }),
];

export const TERMS = { fall: 'Fall', winter: 'Winter', spring: 'Spring' };
export const GENDER = { M: "Men's", W: "Women's", X: 'Coed' };

// Games one slot holds.
export const slotGames = s => (typeof s === 'object' ? s.series : s);

// Total calendar weeks in the regular season and the week the championship
// starts (the week after the regular season, plus a week off for football).
export function postStart(sport) { return sport.season[1] + (sport.model === 'football' ? 2 : 1); }

export const LAST_WEEK = 46; // mid-June
