# AAU Dynasty

A multi-sport college dynasty (every men's and women's team sport) for the
AAU's 73 member schools, starting in 2030. It borrows the look and tooling of
the owner's MCS Dynasty and SACAA Dynasty, but it is **not** a twin of them:
changes here are not ported to those repos, and theirs are not ported here,
unless the owner asks.

## Owner's rules for this league

- The owner builds conferences inside the dynasty. Don't add preset
  conferences.
- Realignment happens only when the owner makes a move. Don't add automatic
  realignment.
- Conferences work like real life: full members, affiliate members for
  certain sports, and sport-specific conferences.
- Ratings should come from real results wherever possible (Wikipedia is
  reachable through WebFetch; stats.ncaa.org blocks automated requests and
  NCAA.com stat pages don't render). Fictional values are fine where there is
  no data. Say which in `js/seed.js`.

## Design

- A sport is data (`js/sports.js`): model, calendar weeks, slots, games,
  conference games, championship. New behavior should be a setting on a model,
  not code for one sport.
- Records that change over time carry `{ from, to }` (to = first year no
  longer in effect). Seasons snapshot their teams and conference assignments,
  so history stays correct after realignment.
- Postseason formats are data too: national championships are stages of
  sites (`js/formats.js`), each site an event from `js/events.js` (single,
  double, play-in, pool). Add new formats as event kinds or stage settings.
- Edits take effect in `effectiveYear()`: this year in the preseason,
  otherwise next year.

## Before every commit

- `python3 tools/stamp.py`
- `sh tools/check.sh`
- `node tests/logic.test.mjs`
- `python3 tests/ui_test.py` (Playwright; Chromium is preinstalled)
