# AAU Dynasty

Every AAU sport in one place, at b1rdsarenotreal.github.io/au-dynasty:

- **Calendar:** every sport's games on any day, as scoreboard cards grouped
  by sport, with the week around it, a sport filter, and jumps to the latest
  results and to the next day with games to play.
- **Sports:** each sport's season at a glance (phase, games played, the
  poll's No. 1 or the champion) with links straight into its app.
- **The record book:** national and conference champions, national
  tournament brackets, every school across every sport, conference pages and
  the All-Sports Cup (points for each national tournament finish: champion
  100, runner-up 85, the finals site 70, a super regional 55, the national
  tournament 30 plus 8 a win, at most 50).

Each sport is played in its own app. Because the apps live on the same site,
AAU Dynasty reads their saves straight from your browser: sim in an app, come
back, and the calendar and record book are up to date. Nothing to upload.

It is a static site with no build step, like the dynasty apps.

## On another device

The apps' saves are read from the browser you play in. To see the record book
somewhere else, upload backups (or restore a history backup):

1. In each dynasty, **Settings → Download backup**.
2. In AAU Dynasty, **Home** or **Data → Upload dynasty backups**, and pick or
   drop the files (several at once is fine).
3. After each season, upload the new backups. A sport's newer upload replaces
   its seasons and keeps any older seasons the new file no longer has.

AAU Dynasty works out which sport each file is from the sport the newer
apps write into their backups (basketball, lacrosse, ice hockey) or from its
results (sets, innings, halves, periods or quarters), so a renamed dynasty is
still recognized.
A backup it doesn't know (a sport added later) asks for the sport's name,
women's or men's, and whether ties stand; after that it works like the rest.
Records follow each sport's rules: a soccer match decided on penalty kicks is
a tie, a field hockey shootout is a win, and a regular-season ice hockey game
tied after overtime is a tie.

Seasons still in progress show on school pages (marked with \*) and count in
the cup once their national champion is crowned.

## Where the history lives

In this browser (IndexedDB), like the dynasties. Only a summary of each
season is kept (records, titles, finishes, coaches), about 15–35 KB a sport
per season. **Data → Download history backup** saves it; **Restore history
backup** (or uploading that file anywhere) brings it back on another device.

## Run it on GitHub Pages

Settings → Pages → Deploy from a branch → `main`, `/ (root)`. To run it
locally, serve the folder with any static server (`python3 -m http.server`).

## Project layout

```
index.html          app shell
css/styles.css      styles (shared with the dynasty apps)
js/app.js           loading, top bar, routing
js/views.js         pages: home, champions, schools, a school, the cup, data
js/ui.js            shared pieces: school labels, logos
js/sports.js        the sports and how a backup's sport is detected
js/extract.js       turns a dynasty backup into history
js/cup.js           All-Sports Cup scoring
js/store.js         saving, merging uploads, backups
js/logos.js         logo list loading and lookup
img/conf/           the commissioner's conference logos
tests/              logic test (Node) and UI test (Playwright), with fixtures
                    from each dynasty app
```

Before committing, run `python3 tools/stamp.py`, `sh tools/check.sh`,
`node tests/logic.test.mjs` and `python3 tests/ui_test.py`.
