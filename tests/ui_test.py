"""Browser test: python3 tests/ui_test.py [screenshot-dir]

Builds a few conferences through the UI (full members, affiliates, a
sport-only conference), plays a whole year, and visits every page, failing on
any page error or console error.
"""
import http.server, socketserver, threading, sys, pathlib, functools, os
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None
if OUT: OUT.mkdir(parents=True, exist_ok=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{srv.server_address[1]}/index.html"
errors = []

def shot(page, name):
    if OUT: page.screenshot(path=str(OUT / f"{name}.png"), full_page=True)

def ok(page, where):
    txt = page.locator("#app").inner_text()
    assert "Something went wrong" not in txt, f"{where}: {txt[:300]}"

def found(page, name, abbr, sports, sport_only=False):
    page.goto(URL + "#/conferences"); page.wait_for_timeout(150)
    page.click("#new")
    page.fill("#c-name", name); page.fill("#c-abbr", abbr)
    if sport_only: page.check("#c-only")
    for s in sports: page.check(f".multi input[value='{s}']")
    page.click("#c-save"); page.wait_for_timeout(200)

def invite(page, schools, affiliate=None):
    page.click("#add"); page.wait_for_timeout(100)
    if affiliate:
        page.check("input[name=kind][value=aff]")
        for s in affiliate: page.check(f"#aff-sports input[value='{s}']")
    for s in schools: page.check(f"#schools input[value='{s}']")
    page.click("#go"); page.wait_for_timeout(200)

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1360, "height": 900})
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: m.type == "error" and "fonts.g" not in m.text and "ERR_" not in m.text and errors.append(f"console: {m.text}"))
    page.on("dialog", lambda d: d.accept())
    page.goto(URL); page.wait_for_selector(".kpis")
    assert "73" in page.locator(".kpis").inner_text()
    shot(page, "01-home-preseason")

    found(page, "Great Lakes Conference", "GLC", ["fb", "wbb", "sb"])
    invite(page, ["michigan", "ohiostate", "msu", "northwestern", "illinois", "indiana", "purdue", "wisconsin", "minnesota", "iowa"])
    found(page, "Pacific Research Conference", "PRC", ["fb", "wbb"])
    invite(page, ["ucla", "usc", "stanford", "cal", "oregon", "washington", "utah", "arizona", "asu", "colorado"])
    found(page, "Western Softball League", "WSL", ["sb"], sport_only=True)
    invite(page, ["ucla", "stanford", "cal", "oregon", "washington", "utah", "arizona", "asu"], affiliate=["sb"])
    ok(page, "conference page"); shot(page, "02-conference")
    txt = page.locator("#app").inner_text()
    assert "Affiliate" in txt, "affiliates missing"

    page.goto(URL + "#/conferences"); page.wait_for_timeout(150); ok(page, "conferences"); shot(page, "03-conferences")
    page.goto(URL + "#/school/caltech"); page.wait_for_timeout(150)
    page.click("[data-add='fb']"); page.click("#go"); page.wait_for_timeout(150)
    assert "Drop" in page.locator("tr", has_text="Football").first.inner_text()
    ok(page, "school"); shot(page, "04-school-preseason")

    page.goto(URL + "#/home"); page.wait_for_timeout(150)
    page.click("#start"); page.wait_for_timeout(300)
    page.click("#week"); page.wait_for_timeout(300)
    ok(page, "home week 1"); shot(page, "05-home-week1")
    page.click("#all"); page.wait_for_timeout(1500)
    assert "complete" in page.locator("#app").inner_text()
    shot(page, "06-home-complete")

    for sport in ["fb", "wbb", "sb"]:
        for tab in ["standings", "schedule", "rankings", "championship", "teams"]:
            page.goto(URL + f"#/sport/{sport}/{tab}"); page.wait_for_timeout(120); ok(page, f"{sport} {tab}")
            if sport == "sb" or tab == "championship": shot(page, f"07-{sport}-{tab}")
    page.goto(URL + "#/sport/fb/schedule/michigan"); page.wait_for_timeout(120); ok(page, "team schedule")
    page.locator("[data-game]").first.click(); page.wait_for_timeout(150)
    assert page.locator("dialog[open] .lscore").count() == 1
    shot(page, "08-game"); page.click("dialog [data-close]")

    page.goto(URL + "#/school/stanford"); page.wait_for_timeout(150); ok(page, "school after"); shot(page, "09-school")
    for v in ["sports", "schools", "conferences", "history", "settings"]:
        page.goto(URL + f"#/{v}"); page.wait_for_timeout(120); ok(page, v)
    shot(page, "10-settings")
    page.goto(URL + "#/history"); page.wait_for_timeout(120); shot(page, "11-history")

    # Realignment during the season goes to next year; then roll over.
    page.goto(URL + "#/home"); page.click("#next"); page.wait_for_timeout(300)
    ok(page, "next year")
    assert "2031" in page.locator(".season-picker").inner_text()

    page.set_viewport_size({"width": 390, "height": 800})
    page.goto(URL + "#/conferences"); page.wait_for_timeout(150); shot(page, "12-mobile-conferences")
    overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
    assert not overflow, "page scrolls sideways on a phone"
    b.close()

srv.shutdown()
if errors:
    print("\n".join(errors)); sys.exit(1)
print("ui test passed")
