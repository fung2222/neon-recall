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
| `LAYOUTS` | [4,2] [4,3] [4,4] [5,4] [6,4] (authored; level ≥ 5 stays 6×4) |
| `ENDLESS_BIG_FROM` | 12 — from here every 3rd level is a 6×5 overclock grid (15 pairs, the cap) |
| `previewFor(level)` | max(0.7, 2.2 − 0.18·(level−1)) s |
| `GLITCH_FROM_LEVEL` / `GLITCH_CHANCE` | 7 / 0.35 |
| `glitchChanceFor(level)` | 0.35 + 1 %/level after 7, capped at 0.6 (endless) |
| `MILESTONE_EVERY` / `milestoneReward(level)` | 10 / +1000×(level/10) pts, +2 peeks — first clear only (no replay farming); banner shown at the next level start |
| `MATCH_POINTS` / `COMBO_CAP` / `STAR_BONUS` | 100 / 5 / 150 |
| `STAR3` / `STAR2` | 0.5 / 1.25 (misses per pair) |
| `PEEK_START` / `PEEK_EVERY` / `PEEK_REWARD` / `PEEK_TIME` | 1 / 3 / 2 / 1.4 s |
| `T_FLIP` / `T_MISS_HOLD` | 0.3 / 0.7 s |
| `AI_STEP` / `AI_FORGET` | 0.55 s / 0.12 |
| `CARD_W` / `CARD_D` / `GAP` / `BOARD_Y` | 1.0 / 1.3 / 0.2 / 3.6 |
| `ADS` | interstitial cooldown 180 s, every 3rd level clear, 150 s grace |

## 3b. Endless mode & i18n (v1.1)
- Levels are infinite; there is no final level. HUD zone line + level banner show `ENDLESS` past level 5. Best level (`maxLevel`) is the endless record on the start screen.
- Test hook: `__recall.api.level(n)` jumps to level n.
- Strings: `js/strings.js` (cyber-kit v0.2.1 i18n, incl. 16 icon names `icon.*`); HTML `data-i18n*`; toggles `#btn-lang` / `#btn-lang2`; `?lang=en|zh`.
- Natural ad breaks unchanged: clear screen buttons (≈ every 3 levels, capped). The milestone banner is never an ad point.

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
Test hook: `window.__recall` (`state, level, game, peeks, api.level/flip/peek/screenOf/clearNow`).

## 5. Tests
`node tests/logic.test.mjs` (6 rule tests) · `python tests/smoke.py [url] [out]` — real taps on projected card positions at 412×915 (touch) and 1280×800: preview→playing, match, miss, level clear + stars, next level, peek, pause/resume, continue after reload, demo AI, language toggle/persist, endless level 10 milestone → 11 and 6×5 grid at 12, zero console errors.
Last run 2026-10-02 (v1.1): logic 6/6, smoke ALL PASSED.

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

## Audio loudness + glow (cyber-kit v0.3.0, 2026-10-03)
- Audio: kit loudness model (music ≈ −20 LUFS integrated, median SFX ≈ music level). This game: music 'chill', sfxTrimDb -3.3 in `js/audio.js`. Re-measure after changing sounds: `python3 ../cyber-kit/tests/loudness.py http://127.0.0.1:18940 <dir>:<AudioClass> --kit /cyber-kit` (see kit docs/API.md "Loudness"). Keep music −20 ± 1 LUFS and SFX/BGM 0 ± 2 dB.
- Glow: `createStage` values are the HIGH look; default is LOW (crisp). Shared pref `localStorage cyber.glow`, `?glow=low|high`. Pause screen has a GLOW: LOW/HIGH button (`ui.glowToggle(stage)`).
