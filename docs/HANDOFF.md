# NEON RECALL 霓虹記憶 — Handoff

Status: **web build done (v1.0)** · live https://fung2222.github.io/neon-recall/ · not yet packaged for Android.
Series rules: see `fung2222/cyber-arcade/docs/ARCADE-HANDOFF.md` (never port sono code, AdMob policy, naming). Concept only from SONO's broken 記憶配對; all code is new.

## 1. Design
- 3D holo cards on a floating table over the neon city. Backs: animated circuit pattern in the zone colours; fronts: 16 original neon line icons (canvas-drawn: chip, bolt, eye, cat, lantern, ramen, rocket, heart, planet, crystal, key, note, moon, drone, tram 叮叮, umbrella).
- **Level start preview**: all cards face-up for `previewFor(level)` seconds (2.2 s → 0.7 s), then flip down in a wave.
- Flip with lift arc; **match** = both cards spin + rise, link beam, particles, floor pulse, chord pitched by combo; **miss** = red shake, cards flip back after 0.7 s (tapping another card resolves instantly — no waiting).
- **No fail, no timer.** Stars by misses: ★★★ ≤ 0.5×pairs, ★★ ≤ 1.25×pairs. Combo multiplier ×1…×5. Star bonus 150/star.
- Layouts: 4×2, 4×3, 4×4, 5×4, 6×4 (then 6×4 with shorter preview). Portrait uses the short side as columns.
- **Glitch swap** (level ≥ 7): after a miss, 35 % chance two face-down cards swap places with an arc + glitch effect.
- **Peek**: reveal all hidden cards 1.4 s. 1 charge at start, +1 every 3 levels; refill +2 via rewarded hook (web: free claim dialog).
- Zone colour theme changes each level (cyber-kit THEMES). Attract mode: the AI plays behind the start screen.
- Saves: best score, furthest level, best stars per level, run progress (`cyber.neon-recall.*`).

## 2. Controls
Tap card · mouse click (hover highlight) · arrows move a cursor + Enter/Space flips · Z peek · R restart level (confirm) · P/Esc pause · M mute · Android back: dialog → pause → resume; clear screen → menu.

## 3. Tuning constants (`js/config.js`)
| Constant | Value |
|---|---|
| `LAYOUTS` | [4,2] [4,3] [4,4] [5,4] [6,4] |
| `previewFor(level)` | max(0.7, 2.2 − 0.18·(level−1)) s |
| `GLITCH_FROM_LEVEL` / `GLITCH_CHANCE` | 7 / 0.35 |
| `MATCH_POINTS` / `COMBO_CAP` / `STAR_BONUS` | 100 / 5 / 150 |
| `STAR3` / `STAR2` | 0.5 / 1.25 (misses per pair) |
| `PEEK_START` / `PEEK_EVERY` / `PEEK_REWARD` / `PEEK_TIME` | 1 / 3 / 2 / 1.4 s |
| `T_FLIP` / `T_MISS_HOLD` | 0.3 / 0.7 s |
| `AI_STEP` / `AI_FORGET` | 0.55 s / 0.12 |
| `CARD_W` / `CARD_D` / `GAP` / `BOARD_Y` | 1.0 / 1.3 / 0.2 / 3.6 |
| `ADS` | interstitial cooldown 180 s, every 3rd level clear, 150 s grace |

## 4. File map
```
index.html        HUD, start / pause / clear screens, import map
css/game.css      layout + star animation
js/config.js      constants
js/logic.js       RecallGame: deck, flip/match/miss, hideMiss + glitch swap, stars (pure, unit-tested)
js/icons.js       16 canvas-drawn neon icons -> CanvasTexture
js/cards.js       CardTable: table slab + surface shader, CardView (back/front shaders), flip/match/miss/swap anims, picking
js/audio.js       RecallAudio (cyber-kit SynthAudio, 'chill' music)
js/main.js        states attract/preview/playing/peek/paused/clear, input + raycast, AI, camera, saves, ads hooks
vendor/cyber-kit  cyber-kit v0.1.0
tests/            logic.test.mjs, smoke.py
```
Test hook: `window.__recall` (`state, level, game, peeks, api.flip/peek/screenOf/clearNow`).

## 5. Tests
`node tests/logic.test.mjs` (6 rule tests) · `python tests/smoke.py [url] [out]` — real taps on projected card positions at 412×915 (touch) and 1280×800: preview→playing, match, miss, level clear + stars, next level, peek, pause/resume, continue after reload, demo AI, zero console errors.
Last run 2026-10-02: ALL PASSED.

## 6. Android packaging
Same as DATA FUSE (Capacitor 8, `@capacitor-community/admob` v8, app id suggestion `hk.fung2222.neonrecall`). Copy `index.html css js vendor privacy.html` into `www/`.

## 7. Ad placements
| Placement | Type | Code | Rule |
|---|---|---|---|
| `level` | interstitial | `nextLevel()` / `replayLevel()` / `clearToMenu()` → `ads.naturalBreak('level')` | only after the player taps a button on the clear screen; capped to ≈ every 3 levels; never at launch or level start |
| `peek` | rewarded | `peek()` when charges = 0 | opt-in dialog, +2 peeks |
Target audience 13+ (card games look kid-friendly — do not opt into Families).

## 8. Known issues / ideas
- Headless screenshots run at ~3 FPS; real devices 60 FPS.
- Ideas: daily seeded board, icon packs per zone, colour-blind mode (icons are already distinct shapes).
