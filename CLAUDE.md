# AAU Dynasty

The front door to the owner's AAU dynasty apps (AAU Volleyball, AAU Softball
& Baseball, AAU Soccer, AAU Field Hockey, AAU Basketball, AAU Lacrosse, AAU
Hockey, and any later sport built on the same MCS engine): an all-sports
calendar and scoreboard, every sport's status with links into its app, and
the record book (champions, school pages across sports, conferences,
national tournaments, the All-Sports Cup). It replaced the older multi-sport
engine in this repo (Nov. 2026, the owner's call) and is built from AAU
History, which stays in its own repo.

Each sport is still played in its own app; this site reads their saves and
never writes to them. It is not synced with the sport apps or AAU History:
changes here aren't ported there, or theirs here, unless the owner asks.

## The hub

- Every app is published on the same site (b1rdsarenotreal.github.io, one
  folder each), so they share the browser's storage. `js/live.js` (`APPS`:
  folder, database, save key and side of every sport) reads each app's save
  on load and whenever the page comes back into view (`syncLive` in
  `js/app.js`), folds it into the record book like an upload, and keeps
  seasons not started yet in `ctx.upcoming` for the calendar (not saved).
  It never creates an app's database (an open that would create one is
  aborted). Backup uploads (Data page) still work, for another device.
- Links into an app go to `../<folder>/#/...` (`appHref`); `openApp` sets the
  app's women's/men's switch first so it opens on the right side.
- Calendar (`js/calendar.js`, `#/calendar/<yyyy-mm-dd>`): every sport's games
  on a day, as scoreboard cards grouped by sport (the conference's color bar
  and logo, the loser faded, overtime and shootout notes), the week strip
  with each day's count, a sport filter, "Latest results" (the last day with
  a result) and "Next to play" (the first day with a game to play, any
  sport). Dates come from each sport's calendar (`gameDay`).
- Home leads with "Across the AAU" (latest results and next up); the Sports
  page (`js/sports-page.js`) has a card per sport: season, phase, games
  played, the poll's No. 1 or the champion, the latest results day, and
  links into the app.
- The record book keeps its own database, `aau-dynasty`; on the first visit
  it starts from AAU History's (`aau-history`) if this browser has one.

## How it works

- A dynasty backup is the league JSON (`{ name, side, seasons: { year: {
  teams, games, post, polls, settings, overrides } }, conferences, coaches }`).
  `js/sports.js` detects the sport from `side` (softball/baseball), then
  `league.sport` (basketball, lacrosse, hockey: the newer apps set it), then
  the shape of regular-season line scores (volleyball sets, 2 soccer halves
  or high-scoring basketball halves, 3 hockey periods, 4 field hockey
  quarters, 7/9 innings), then the name; unknown sports are named on upload
  (`customSport`). `SPORTS` is in season order (fall, winter, spring).
- `js/extract.js` keeps only a summary per season (records, conference and
  coach, conference titles, national tournament finish and wins, final poll
  rank, champions). Sport rules live in the profile: `ties` (soccer, ice
  hockey) and `pkWins` (field hockey). Bump `EXTRACT_VERSION` when the summary changes.
- The Schools page shows a badge per school in its colors (A–Z or by home
  conference: the one it plays most sports in, `homeConference`), or the
  stats table.
- School pages (`js/school.js`) look like the sport apps' team pages
  (Nov. 2026, the owner's ask): the header (`schoolHero`, the apps'
  `team-hero2`/`th-*` styles) in the school's colors (`heroColors`) with
  its logo, kicker, name and mascot, banners (national titles in gold with a
  trophy, conference titles with the conference's logo) and a numbers strip
  (all sports: titles, bids, cups, all-time record; one sport: that season's
  record, conference record and place, final poll, national finish, for and
  against), then `team-tabs` (all sports, a tab per sport, All schools).
  All sports: the banner rafters, a card per sport and the Cup; one sport: a
  season picker, the schedule in the apps' boxes (`ts2-*`: regular season, a
  box per preseason tournament, conference tournament, national tournament,
  each with its record; date, home/away/neutral, opponent with the
  conference logo on conference games, venue and round, W/L/T and score),
  program write-up, season by season and coaches. Schedules come from each
  season's compact `games` (EXTRACT_VERSION 2); dates from each sport's
  calendar (`start` in `js/sports.js`, the same rule as its app).
- National tournaments (`js/tournament.js`, `#/tournament/<sport>/<year>`):
  each season keeps its bracket in `nt` (EXTRACT_VERSION 3: the field, and
  every regional, super regional and finals event with its nodes and
  games). Drawn like a TV bracket: four regions in the corners (the right
  two mirrored), the finals in the middle; single-elimination events as a
  bracket; double elimination (`deBracketHtml`: winners' bracket over the
  elimination bracket, the final and the if-necessary game at the right) as
  a bracket too, with the finals on top of the corners (the 'tall' board);
  series as cards. A field of
  `ONE_BRACKET_MAX` (12) or fewer, all single elimination, is one bracket
  with national seeds (the owner's call). Games against a bye aren't drawn.
  Boxes are sized to fill the window (`fitSizes`) and never cut a school's
  name (a name still cut off after drawing widens them; the page then
  scrolls sideways). National-title
  banners, the Champions page and school seasons link to it.
- Conference pages (`js/conference.js`, `#/conferences`,
  `#/conference/<name>/<sport>/<year>`): like a league site, a header in
  the conference's color, a tab per sport; all sports (latest champions,
  members by sport, national champions, title leaders) or one sport's season
  (standings, the conference tournament bracket from each season's `ct`,
  EXTRACT_VERSION 4, members in the national tournament, champions by
  season). Conference-title banners and the Schools page link here.
- The AAU look (Nov. 2026, as in the dynasty apps): a two-row top bar (the
  AAU block wordmark, `img/aau-block.svg`, and "Dynasty", then the menu);
  navy `--board`, gold `--optic`; Oswald headings (uppercase page titles),
  Saira Condensed numbers, Inter text. National tournament brackets put
  the finals on a navy panel under the wordmark and each winner's score in
  a box of its school's color; a board wider than the page shrinks to fit
  (down to 72%).
- Uploads merge per sport: new seasons replace, older seasons are kept
  (`mergeDynasty` in `js/store.js`). History is in IndexedDB under
  `aau-dynasty`.
- Cup scoring is `CUP_POINTS` in `js/cup.js`; only seasons with a crowned
  champion count.
- When a new dynasty app ships, have it set `league.sport`, add its sport to
  `SPORTS` (and detection) and a fixture from it to `tests/fixtures/`
  (trimmed, gzipped).

## Before every commit

- `python3 tools/stamp.py`
- `sh tools/check.sh`
- `node tests/logic.test.mjs`
- `python3 tests/ui_test.py` (Playwright; Chromium is preinstalled)
