# NEON RECALL — deep audit (2026-11-02)

Status: **all three findings fixed in the 2026-11-02 deep-pass commit; read-only audit remains below.**  
Scope: `neon-recall` v0.3.13, 360 / 390 / 412 px, Playwright + pure-logic tests.  
Purpose: find player-experience, feel, rule and audio problems with evidence, then fix one item per commit.

## Fix status (2026-11-02)

| # | Finding | Result |
|---|---|---|
| 1 | Continuous BGM hiss | ambient bed removed; `NEON_CHILL` has no noise hats/snare and `playStep` is fully tonal. Loudness: music −20.3 LUFS, SFX median −20.5, peak −1.6 dBFS. |
| 2 | PEEK farming | surge PEEK once per entry (`surgeAwarded` persisted); every-3-level PEEK first-clear only. `tests/rewards.py` passes. |
| 3 | Best score before milestone | `submitBest` moved after milestone scoring. `tests/rewards.py` checks stored best equals final score. |

Commit: `147eb9a`. Regression tests: `node tests/logic.test.mjs` 12/12, `python tests/rewards.py` all pass, 390 match test no console errors.

## Baseline checked

- `node tests/logic.test.mjs` — **ALL PASSED (12)**.
- 360 / 390 / 412 start + preview screens: no horizontal overflow, no console errors.
- In-play controls at 360: PEEK 122 px + four 44 px buttons; Mute right edge 344 < 360.
- In-play controls at 390: Mute right edge 374 < 390. The old DATA FUSE overflow bug is **not** present here.
- Start screen at 360/390: tagline, large Start button (240×70) and best/level/stars line all fit.
- Real match test at 390: tapped a matching pair; `matched=1`, `score=100`, `combo=1`, no console errors.
- Headless WebGL runs at roughly 1 FPS, so preview/pacing timings are not representative. I forced `previewT` low only to reach the playing state for the match test.

## Findings, in fix order

### 1. HIGH — background music still has a continuous noise bed and noise percussion

This is the same headphone problem Roy just asked to remove from DATA FUSE, and it is present in NEON RECALL:

- `RecallAudio.startMusic()` calls `startAmbient()` (`js/audio.js:89-92`), which loops a noise buffer through a 420 Hz band-pass at gain **0.016** (`js/audio.js:68-78`). That is a continuous hiss under the music.
- The `chill` preset uses `hats: 'soft'` and noise snare hits (`vendor/cyber-kit/audio/synth.js:41`, `245-252`), so there is also periodic noise on the backbeat.
- The loudness meter reads music `-20.2 LUFS`, peak `-1.6 dBFS`, so this is not a level/clipping issue; it is timbre. The hiss will be most obvious on headphones.

Fix direction: remove the ambient noise bed and make the chill loop fully tonal (kick, bass, pad, soft arp). Keep short noise only in the card-flip SFX if it helps touch feedback, not as a continuous bed.

### 2. MEDIUM — free PEEK farming by restarting/replaying

`startLevel()` adds `SURGE_PEEK_BONUS` every time it runs (`js/main.js:123`). A surge level is level 9 (modifier cycle `twin → drift → wild → surge`). Restarting a surge level, or replaying it from the clear screen, runs `startLevel()` again and adds another free peek each time.

Evidence from the test hook at level 9:

```
start: peeks 1
__recall.api.level(9) → peeks 2
__recall.api.level(9) → peeks 3
```

Separately, `levelClear()` adds `S.peeks++` for every level divisible by 3 (`js/main.js:319`) with no first-clear guard. Clearing level 3, then replaying it, adds another peek each clear. This undermines the rewarded-peek economy and is inconsistent with the milestone reward, which is explicitly first-clear only.

Fix direction: award the surge peek once per level entry (or once per run), and make the every-3-levels peek first-clear only. Add a regression test that restart/replay does not increase peeks.

### 3. MEDIUM — best score can be stored before the milestone bonus

`levelClear()` calls `store.submitBest(g.score)` at `js/main.js:315`, then adds the milestone bonus (`g.score += m.pts`) at `js/main.js:320`. On a milestone clear, the stored best excludes the bonus; the start screen can show a lower best than the final score. Fix by submitting the best after all score additions.

### 4. LOW — level-1 preview is 5.0 s including the banner hold

`previewWindow(1) = 2.2 + 0.7 + 2.1 = 5.0 s`. That is intentional for memory, and the banner-hold fix is correct, but on a commute game the first level can feel like a long wait before the first tap. Not a bug; worth watching on a real device. Headless timing cannot judge this fairly.

## What is already good

- First 30 seconds are clear: tagline says flip and match, the large Start button is obvious, and the preview shows the cards.
- No layout overflow at 360/390; PEEK and all four icon buttons are fully visible.
- Match feedback, combo HUD, progress bar and card states are readable.
- Pure logic tests cover slides, stars, modifiers, glitch swaps and preview timing.

## Audit vs fixes

The audit itself changed no gameplay code; the three fixes are in `147eb9a`, so they can be reverted separately from this report.

## Follow-up

Watch level-1 preview pacing on a real phone. The clean BGM still needs a real headphone listen; loudness and noise layers are fixed, but taste is subjective.
