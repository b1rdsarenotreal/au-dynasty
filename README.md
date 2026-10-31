# AAU Dynasty

A commissioner-style college sports dynasty set in 2030. After years of
trouble the NCAA has collapsed, and the **Association of American
Universities** (AAU) has stepped in: its 73 member universities (71 in the
United States, McGill and Toronto in Canada) run college athletics through a
new association.

The dynasty can hold every men's and women's team sport. You build the
conference map yourself, move schools between conferences, add and drop
programs at any school, add new schools, and add new sports.

Open `index.html` through any static web server (GitHub Pages works). The
dynasty saves in the browser; use **Settings → Download backup** to keep a
copy or move it to another device.

## How a year works

Years are academic years: 2030–31 starts in late August 2030 and ends in June.

1. **Preseason.** Found conferences, invite members, add or drop programs.
   Everything you change now counts for this year.
2. **Start the season.** This locks in each sport's teams, conferences and
   schedule for the year.
3. **Play week by week** (or a month, a term, or the rest of the year at once).
   Fall, winter and spring sports run on one shared calendar.
4. **Championships.** When a sport's regular season ends, its national
   championship field is picked and played (see below).
5. **Start next year.** Ratings carry over, partly regressing toward each
   program's long-run level, with some random change (recruiting, graduation,
   coaching).

Changes made after the season starts take effect the following year, the way
real realignment does.

## Conferences and realignment

- A conference **sponsors** a list of sports.
- A **full member** plays every sport its home conference sponsors.
- An **affiliate member** joins another conference for one or more sports,
  usually because its home conference doesn't sponsor them.
- A **sport-specific conference** (a hockey or lacrosse league, say) is made
  of affiliates.
- A school with no conference in a sport plays it as an **independent**.
- Every membership records when it started and ended, so history pages show
  who was where in each year.
- Realignment only happens when you do it.

## Sports

Every sport is a set of settings: its game model, calendar weeks, games per
team, conference games, and championship format. The catalog starts with the
NCAA's men's and women's team sports:

| Fall | Winter | Spring |
|---|---|---|
| Football, men's and women's soccer, women's volleyball, field hockey, men's water polo | Men's and women's basketball, men's and women's ice hockey | Baseball, softball, men's and women's lacrosse, men's volleyball, women's water polo, beach volleyball |

Four game models cover them all:

- **Football**: about a dozen drives a team, each ending in a touchdown, a
  field goal or nothing; scored by quarter, with college overtime.
- **Timed periods**: basketball, soccer, hockey, lacrosse, field hockey and
  water polo. Each sport has its own scoring rate, periods and overtime rule
  (full overtime periods, sudden victory, or ties in the regular season).
  Postseason ties go to a shootout.
- **Innings**: baseball and softball, plate appearance by plate appearance,
  with run rules and softball's extra-inning tiebreaker.
- **Sets**: volleyball by rally scoring; beach volleyball as five pairs.

Football, women's basketball and softball are on at the start. Turning
another sport on in **Settings** gives a program to every AAU school that has
that sport in real life (from the current year in the preseason, otherwise
from next year). Programs you dropped stay dropped. More programs can be added
one school at a time on its page, or many at once in Settings. **Add a
sport** copies an existing sport's model and format under a new name.

Each team has two ratings: **OFF** (scoring) and **DEF** (stopping the other
team; pitching and fielding in baseball and softball). OVR is their average.
Ratings move a little after every game based on how the result compared with
the expected one.

## Logos

Logos load the same way as in MCS Dynasty: the college football logo list
(ESPN logos) used there, plus ESPN's women's college basketball team list,
which covers every Division I school, including those without football. Both
are fetched by the browser and cached for 30 days. Schools neither list
covers (most Division III schools, McGill and Toronto) show a monogram in
their colors. **Edit school** takes a logo link or an uploaded image for any
school.

## Championships

After the regular season each sport picks its field (12 in football, 32 in
basketball, 16 in softball by default; change it under **Rules**):

- Every conference with at least 6 teams in the sport (changeable in
  Settings) sends its regular-season champion.
- The best remaining teams by **RPI** fill the field and everyone is seeded
  by RPI. Independents can earn at-large bids.
- Single elimination; baseball and softball rounds are best-of-3. Higher
  seeds host until the sport's neutral-site rounds.

## Starting ratings

Starting programs and ratings for football, women's basketball and softball
come from the most recent real seasons, using Wikipedia:

- **Which schools have which sports**: Wikipedia's lists of NCAA Division I
  and Division III softball and football programs. Every AAU school sponsors
  women's basketball.
- **Football**: the 2025 final AP poll and final CFP rankings (FBS), the
  2025 final FCS polls, and each program's level (FBS, FCS, Division III,
  U Sports).
- **Women's basketball**: the 2025–26 final AP poll.
- **Softball**: the 2026 final ESPN.com/USA Softball poll and the 2026 NCAA
  tournament field.

Ranked programs are placed by their final ranking and record. Unranked
programs are placed by their level and recent results, which involves some
judgment. All ratings can be edited on each sport's **Teams** tab.

For the other sports, which schools have them comes from Wikipedia's lists
of NCAA programs (Division I soccer, volleyball, field hockey, ice hockey,
lacrosse, baseball, men's volleyball, beach volleyball, and men's water polo
championship appearances); Division III, Canadian and women's water polo
sponsorship is from general knowledge. Their ratings are **estimates** for
now (a base by level, with well-known strong programs raised), to be
replaced by a Wikipedia pass sport by sport.

## Development

Plain ES modules, no build step. Before every commit:

```
python3 tools/stamp.py      # version-stamp script and stylesheet links
sh tools/check.sh           # every module parses
node tests/logic.test.mjs   # engine tests
python3 tests/ui_test.py    # browser test (Playwright + Chromium)
```

| File | What it does |
|---|---|
| `js/schools.js` | The 73 AAU members |
| `js/logos.js` | Logo lookup and uploads |
| `js/sports.js` | Sport catalog and settings |
| `js/seed.js` | Starting programs and ratings |
| `js/league.js` | Data model: programs, conferences, memberships, calendar |
| `js/game.js` | The four game models |
| `js/schedule.js` | Schedule builder (round robins plus non-conference fill) |
| `js/standings.js` | Records, standings, RPI |
| `js/postseason.js` | Championship field and bracket |
| `js/season.js` | Starting, playing and rolling over a year |
| `js/views-*.js` | Pages |
