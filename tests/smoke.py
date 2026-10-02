"""Headless smoke test for NEON RECALL.
Usage: python tests/smoke.py [base_url] [out_dir]   (serve the parent folder: python3 -m http.server 18940)
Checks: zero console errors, preview -> playing, tapping cards (real pointer events at projected card positions)
matches / misses, level clear screen + stars, next level, peek, pause, continue after reload, demo autoplay.
"""
import sys, os
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:18940/neon-recall/'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'docs/shots'
os.makedirs(OUT, exist_ok=True)
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
fails = []
def check(c, m):
    print(('PASS ' if c else 'FAIL ') + m)
    if not c: fails.append(m)

def run(p, name, w, h, mobile):
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
    pg = ctx.new_page(); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '?reset=1'); pg.wait_for_timeout(4500)
    pg.screenshot(path=f'{OUT}/{name}-start.png')
    st = lambda: pg.evaluate('({s: __recall.state, lv: __recall.level, m: __recall.game.matched, p: __recall.game.pairs, miss: __recall.game.misses, score: __recall.game.score, peeks: __recall.peeks})')
    pg.click('#btn-start')
    for _ in range(60):
        if st()['s'] == 'playing': break
        pg.wait_for_timeout(250)
    check(st()['s'] == 'playing', f'{name}: preview -> playing')
    cards = pg.evaluate('__recall.game.cards.map(c => ({id: c.id, icon: c.icon}))')
    def tap(cid):
        pt = pg.evaluate(f'__recall.api.screenOf({cid})')
        if mobile: pg.touchscreen.tap(pt['x'], pt['y'])
        else: pg.mouse.click(pt['x'], pt['y'])
        pg.wait_for_timeout(450)
    a = cards[0]; bb = next(c for c in cards if c['icon'] == a['icon'] and c['id'] != a['id'])
    tap(a['id']); tap(bb['id']); pg.wait_for_timeout(500)
    check(st()['m'] == 1, f'{name}: tapping a pair matches ({st()["m"]})')
    rest = [c for c in cards if c['id'] not in (a['id'], bb['id'])]
    x = rest[0]; y = next(c for c in rest if c['icon'] != x['icon'])
    tap(x['id']); tap(y['id']); pg.wait_for_timeout(300)
    check(st()['miss'] == 1, f'{name}: mismatch counted')
    pg.screenshot(path=f'{OUT}/{name}-play.png')
    pg.wait_for_timeout(900)
    done = {a['id'], bb['id']}
    for c in rest:
        if c['id'] in done: continue
        m = next(d for d in rest if d['icon'] == c['icon'] and d['id'] != c['id'])
        tap(c['id']); tap(m['id']); done |= {c['id'], m['id']}
    for _ in range(40):
        if st()['s'] == 'clear': break
        pg.wait_for_timeout(250)
    check(st()['s'] == 'clear', f'{name}: level clear screen')
    pg.wait_for_timeout(1200); pg.screenshot(path=f'{OUT}/{name}-clear.png')
    pg.click('#btn-next')
    for _ in range(60):
        if st()['s'] == 'playing': break
        pg.wait_for_timeout(250)
    check(st()['lv'] == 2 and st()['s'] == 'playing', f'{name}: next level ({st()["lv"]})')
    p0 = st()['peeks']; pg.keyboard.press('z'); pg.wait_for_timeout(400)
    check(st()['s'] == 'peek' and st()['peeks'] == p0 - 1, f'{name}: peek')
    pg.wait_for_timeout(500); pg.screenshot(path=f'{OUT}/{name}-peek.png')
    pg.wait_for_timeout(2500)
    pg.keyboard.press('p'); pg.wait_for_timeout(300); check(st()['s'] == 'paused', f'{name}: pause')
    pg.keyboard.press('p'); pg.wait_for_timeout(300); check(st()['s'] in ('playing', 'peek'), f'{name}: resume')
    pg.goto(BASE); pg.wait_for_timeout(3500)
    check(pg.is_visible('#btn-continue'), f'{name}: CONTINUE offered after reload')
    pg.goto(BASE + '?demo=1'); pg.wait_for_timeout(22000)
    d = st(); mv = pg.evaluate('__recall.game.moves'); check(mv >= 1 or d['lv'] > 1, f'{name}: demo AI plays (moves {mv}, matched {d["m"]}, lv {d["lv"]})')
    pg.screenshot(path=f'{OUT}/{name}-demo.png')
    check(not errs, f'{name}: zero console errors {errs[:3]}')
    b.close()

with sync_playwright() as p:
    run(p, 'mobile', 412, 915, True)
    run(p, 'desktop', 1280, 800, False)
print('ALL PASSED' if not fails else f'{len(fails)} FAILED')
sys.exit(1 if fails else 0)
