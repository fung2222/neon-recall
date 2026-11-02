"""PEEK / milestone reward guards for NEON RECALL.

Covers the two farming holes found in the 2026-11-02 deep audit:
  - a surge level must award +1 PEEK only once per run/entry
  - the every-3-level PEEK is first-clear only
  - the stored best must include milestone points

Usage:
  python tests/rewards.py [url]
"""
from __future__ import annotations
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:18940/neon-recall/'
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

fails = []
def check(ok, msg):
    print(('ok   ' if ok else 'FAIL ') + msg)
    if not ok:
        fails.append(msg)

with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = c.new_page()
    errors = []
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.goto(URL + '?lang=zh&reset=1', wait_until='domcontentloaded')
    pg.wait_for_function("() => {const l=document.getElementById('loading'); return l && (l.classList.contains('done')||l.classList.contains('hidden'));}", timeout=60000)
    pg.wait_for_timeout(700)
    pg.click('#btn-start')
    pg.wait_for_timeout(700)

    base = pg.evaluate('() => __recall.peeks')
    first = pg.evaluate("() => { __recall.api.level(9); return {peeks:__recall.peeks, awarded:[...__recall.surgeAwarded], mod:__recall.game.mod}; }")
    second = pg.evaluate("() => { __recall.api.level(9); return {peeks:__recall.peeks, awarded:[...__recall.surgeAwarded], mod:__recall.game.mod}; }")
    check(first['mod'] == 'surge', 'level 9 is the surge modifier')
    check(first['peeks'] == base + 1, 'surge entry awards exactly one PEEK')
    check(second['peeks'] == first['peeks'], 're-entering the same surge level does not add another PEEK')
    check(second['awarded'] == [9], 'surge level is recorded as already awarded')

    clear1 = pg.evaluate("() => { __recall.api.level(3); __recall.peeks = 0; __recall.api.clearNow(); return {peeks:__recall.peeks, level:__recall.level}; }")
    pg.wait_for_timeout(120)
    clear2 = pg.evaluate("() => { __recall.api.level(3); __recall.peeks = 0; __recall.api.clearNow(); return {peeks:__recall.peeks, level:__recall.level}; }")
    check(clear1['peeks'] == 1, 'first clear of level 3 awards the PEEK')
    check(clear2['peeks'] == 0, 'replaying level 3 does not award another PEEK')

    ms = pg.evaluate("""() => {
      __recall.api.level(10);
      __recall.game.score = 500; __recall.game.levelScore = 0; __recall.game.misses = 0;
      __recall.api.clearNow();
      const raw = localStorage.getItem('cyber.neon-recall.best');
      return {score:__recall.game.score, best: Number(raw || 0)};
    }""")
    check(ms['score'] > 500, 'milestone level adds its bonus to the run score')
    check(ms['best'] == ms['score'], 'stored best includes the milestone bonus')
    check(len(errors) == 0, 'zero console errors')
    b.close()

print(f'\n{len(fails)} FAILED' if fails else '\nALL PASSED')
raise SystemExit(1 if fails else 0)
