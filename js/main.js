// NEON RECALL 霓虹記憶 — controller: levels, preview, flips, matches, glitch swaps, peek, stars, demo AI, camera, saves.
import * as THREE from 'three';
import { i18n, t, themeLabel, flags, createStore, createStage, ThemeController, themeFor, U, Particles, Shockwaves, FxState, NeonCity, createInput, CyberUI, Platform, createAds } from 'cyber-kit';
import { GAME_ID, previewFor, PEEK_START, PEEK_EVERY, PEEK_REWARD, PEEK_TIME, T_FLIP, T_MISS_HOLD, AI_STEP, AI_FORGET, BOARD_Y, ADS, LAYOUTS, MILESTONE_EVERY, milestoneReward } from './config.js';
import './strings.js';
import { RecallGame, makeRng } from './logic.js';
import { CardTable } from './cards.js';
import { ICONS } from './icons.js';
import { RecallAudio } from './audio.js';

const $ = (id) => document.getElementById(id);
const store = createStore(GAME_ID);
if (flags.reset) store.clear();
const ui = new CyberUI({ screens: ['start', 'pause', 'clear'] });
const stage = createStage({ canvas: $('scene'), bloom: 0.85, bloomRadius: 0.5, bloomThreshold: 0.8, fov: 46, exposure: 1.05, onFatal: (m) => ui.fatal(m) });
ui.glowToggle(stage);   // cyber-kit v0.3.0: GLOW LOW/HIGH button in the pause screen (shared preference, LOW = crisp default)
const { scene, camera } = stage;
const theme = new ThemeController(); theme.set(1, true);
const city = new NeonCity(stage, { floor: 'reflect', innerRadius: 20, buildings: 260, billboard: { zh: '霓虹記憶', en: 'N E O N   R E C A L L', pos: [0, 22, -46], width: 30 }, dustArea: 30, dustHeight: 12 });
const table = new CardTable(scene);
const particles = new Particles(scene, 2000, { floorY: BOARD_Y + 0.05 });
stage.onResize((w, h, pr) => particles.resize(h, pr));
const waves = new Shockwaves(scene, 8);
const fx = new FxState();
const audio = new RecallAudio(store); ui.setMuted(audio.muted);
const ads = createAds({ gameId: GAME_ID, ...ADS, onAdOpen: (on) => audio.duckAll(on) });

const S = {
  state: 'attract',            // attract | preview | playing | peek | paused | clear
  demo: !!flags.demo,
  game: new RecallGame(flags.seed != null ? { rng: makeRng(flags.seed) } : {}),
  level: 1, peeks: PEEK_START, timers: [], missT: 0, stateT: 0, levelTime: 0, aiT: 0, mem: new Map(), aiPlan: -1,
  cursor: 0, portrait: stage.width / stage.height < 0.9, pausedFrom: null,
};
window.__recall = S;  // test hook (tests/smoke.py)
const later = (delay, fn) => S.timers.push({ t: delay, fn });
const isPortrait = () => stage.width / stage.height < 0.9;

// ---------------------------------------------------------------- saves
const getStars = () => store.getJSON('stars', {}) || {};
const totalStars = () => Object.values(getStars()).reduce((a, b) => a + b, 0);
function saveProgress() { if (S.demo) return; store.setJSON('progress', { v: 1, level: S.level, score: S.game.score, peeks: S.peeks }); }
const loadProgress = () => { const p = store.getJSON('progress'); return p && p.v === 1 && p.level >= 1 ? p : null; };

// ---------------------------------------------------------------- HUD
function updateHUD() {
  const g = S.game;
  ui.setText('hud-score', g.score.toLocaleString('en-US'));
  ui.setText('hud-best', Math.max(store.best, g.score).toLocaleString('en-US'));
  ui.setText('hud-level', S.level);
  ui.setText('hud-combo', '×' + g.combo);
  ui.setText('hud-pairs', `${g.matched} / ${g.pairs}`);
  $('hud-progress').style.width = (g.pairs ? g.matched / g.pairs * 100 : 0).toFixed(1) + '%';
  const th = themeFor(S.level); ui.setText('hud-zone-name', `${themeLabel(th)} · ${g.long}×${g.short}${S.level > LAYOUTS.length ? ' · ' + t('endless') : ''}`);
  const b = $('peek-badge');
  if (S.peeks > 0) { b.textContent = S.peeks; b.classList.remove('ad'); } else { b.textContent = ads.isNative ? 'AD' : '+' + PEEK_REWARD; b.classList.add('ad'); }
  $('btn-peek').classList.toggle('disabled', S.state !== 'playing' || S.demo);
}
function refreshStart() {
  const p = loadProgress();
  $('btn-continue').classList.toggle('hidden', !p || p.level <= 1);
  if (p) ui.setText('continue-sub', t('continueS', { level: p.level, score: p.score.toLocaleString('en-US') }));
  ui.setText('start-best', store.best.toLocaleString('en-US'));
  ui.setText('start-level', store.getNum('maxLevel', 0) || '—');
  ui.setText('start-stars', totalStars());
}
function setState(s) {
  S.state = s; S.stateT = 0;
  ui.show({ attract: 'start', paused: 'pause', clear: 'clear' }[s] || null);
  ui.hud(s !== 'attract');
  $('demo-tag').classList.toggle('hidden', !S.demo);
  updateHUD();
}

// ---------------------------------------------------------------- level flow
function startLevel(level, { attract = false } = {}) {
  S.level = level; S.timers = []; S.missT = 0; S.levelTime = 0; S.mem.clear(); S.aiPlan = -1;
  S.game.setup(level);
  S.portrait = isPortrait();
  table.setup(S.game, S.portrait, true);
  theme.set(level); audio.setLevel(level);
  S.cursor = 0; table.setHover(-1);
  if (attract) { S.state = 'attract'; S.previewT = 2.2; S.aiT = -1; memorise(0.5); return; }
  setState('preview'); S.previewT = previewFor(level) + 0.7;
  if (S.milestone) { const m = S.milestone; S.milestone = null; ui.banner(t('milestone', { n: m.n }), t('milestoneS', { pts: m.pts.toLocaleString('en-US'), peeks: m.peeks }), t('memorise')); }
  else ui.banner(t('levelN', { n: level }), `${S.game.long}×${S.game.short}${level > LAYOUTS.length ? ' · ' + t('endless') : ''}`, t('memorise'));
  memorise(0.55);
  audio.whoosh(0.05);
}
function memorise(p) { for (const c of S.game.cards) if (Math.random() < p) S.mem.set(c.id, c.icon); }
function endPreview() {
  table.flipAll(S.game, false, 0.015); audio.flip();
  if (S.state === 'preview') setState('playing');
}

function tryFlip(id, byAI = false) {
  if (id < 0) return;
  if (S.state !== 'playing' && !(byAI && S.state === 'attract')) return;
  if (S.demo && !byAI) return;
  if (S.game.open.length === 2) resolveMiss();
  const r = S.game.flip(id);
  if (r.type === 'ignored') return;
  table.flip(id, true); audio.flip(); if (!byAI || S.demo) Platform.haptic('light');
  if (Math.random() > AI_FORGET) S.mem.set(id, S.game.cards[id].icon);
  if (r.type === 'match') later(T_FLIP * 0.9, () => onMatch(r));
  else if (r.type === 'miss') { S.missT = T_MISS_HOLD + T_FLIP; later(T_FLIP, () => { table.miss(r.ids); if (S.state !== 'attract') { audio.miss(); Platform.haptic('warning'); } }); }
  updateHUD();
}
function onMatch(r) {
  const ic = ICONS[S.game.cards[r.ids[0]].icon], col = new THREE.Color(ic.color);
  table.match(r.ids, ic.color);
  for (const id of r.ids) { S.mem.delete(id); const p = table.worldPos(id); particles.burst(p, col, S.state === 'attract' ? 16 : 40, { speed: 4, up: 4, life: 0.8, size: 0.9, color2: new THREE.Color(0xffffff) }); waves.spawn(new THREE.Vector3(p.x, BOARD_Y + 0.05, p.z), col, { r0: 0.2, r1: 2.2, h: 0.4, dur: 0.5 }); table.pulse(p.x, p.z, 1); }
  if (S.state === 'attract') return;
  audio.match(r.combo); Platform.haptic('medium');
  const mid = table.worldPos(r.ids[0]).add(table.worldPos(r.ids[1])).multiplyScalar(0.5); mid.y += 0.8;
  const sp = stage.toScreen(mid); ui.popup(sp.x, sp.y, '+' + r.gained, r.combo > 1 ? `COMBO ×${r.combo}` : t('icon.' + ic.id), r.combo >= 3 ? 'big' : '');
  if (r.combo >= 3) fx.kick({ aberr: 0.5, trauma: 0.08 });
  city.pulse(mid.x * 3, mid.z * 3 - 4, 0.6);
  ui.bump('hud-score'); ui.bump('hud-combo');
  updateHUD();
  if (S.game.done) later(0.75, levelClear);
}
function resolveMiss() {
  S.missT = 0;
  const h = S.game.hideMiss();
  for (const id of h.ids) table.flip(id, false);
  if (h.swap) {
    table.resyncSlots(S.game); table.swap(h.swap);
    for (const id of h.swap) if (Math.random() < 0.5) S.mem.delete(id);
    if (S.state !== 'attract') { audio.glitch(); fx.kick({ glitch: 0.7, aberr: 0.8 }); ui.toast(t('glitch'), 1600); }
  }
}

async function peek() {
  if (S.state !== 'playing' || S.demo || ui.modalOpen) return;
  if (S.peeks <= 0) {
    const ok = await ui.confirm(ads.isNative
      ? { kicker: 'PEEK', title: t('peekMoreQ', { n: PEEK_REWARD }), text: t('peekAdText'), ok: t('kit.watchAd'), okSmall: `+${PEEK_REWARD}`, cancel: t('kit.noThanks'), cancelSmall: '' }
      : { kicker: 'PEEK', title: t('peekMore', { n: PEEK_REWARD }), text: t('peekFreeText'), ok: t('claim'), okSmall: `+${PEEK_REWARD}`, cancel: t('kit.noThanks'), cancelSmall: '' });
    if (!ok) return;
    const r = await ads.rewarded('peek');
    if (!r.rewarded) { ui.toast(t('noReward')); return; }
    S.peeks += PEEK_REWARD; updateHUD(); saveProgress();
    if (S.state !== 'playing') return;
  }
  S.peeks--;
  if (S.game.open.length === 2) resolveMiss();
  table.flipAll(S.game, true, 0.01);
  setState('peek'); S.peekT = PEEK_TIME + T_FLIP;
  audio.peek(); fx.kick({ aberr: 0.6 }); ui.flash('rgba(0,229,255,0.18)', 400);
  saveProgress();
}

function levelClear() {
  const g = S.game, stars = g.stars(), bonus = g.clearBonus();
  table.celebrate(); audio.clear(); Platform.haptic('success');
  fx.kick({ trauma: 0.2, aberr: 1, fovKick: 1 }); ui.flash('rgba(255,255,255,0.3)', 420);
  particles.ring(new THREE.Vector3(0, BOARD_Y + 0.1, 0), new THREE.Color().copy(U.uC3.value), 160, 9, BOARD_Y + 0.1);
  waves.spawn(new THREE.Vector3(0, BOARD_Y, 0), new THREE.Color().copy(U.uC1.value), { r0: 1, r1: 13, h: 2, dur: 1.1, a: 3 });
  city.pulse(0, -6, 2);
  if (S.demo) { later(2.2, () => startLevel(S.level >= 5 ? 1 : S.level + 1)); setState('playing'); return; }
  const rec = getStars(); if ((rec[S.level] || 0) < stars) { rec[S.level] = stars; store.setJSON('stars', rec); }
  store.submitBest(g.score);
  const firstClear = S.level + 1 > store.getNum('maxLevel', 0);
  store.setNum('maxLevel', Math.max(store.getNum('maxLevel', 0), S.level + 1));
  S.clearInfo = { stars, bonus };
  if (S.level % PEEK_EVERY === 0) { S.peeks++; ui.toast(t('peekPlus'), 1800); }
  if (S.level % MILESTONE_EVERY === 0 && firstClear) { const m = milestoneReward(S.level); g.score += m.pts; S.peeks += m.peeks; S.milestone = { n: S.level, ...m }; }
  const lv = S.level; S.level = lv + 1; saveProgress(); S.level = lv;
  later(1.1, () => {
    ui.setText('clear-kicker', t('clearKicker', { n: S.level, bonus }));
    ui.setText('clear-score', g.levelScore.toLocaleString('en-US')); ui.setText('clear-misses', g.misses);
    ui.setText('clear-combo', '×' + g.maxCombo); ui.setText('clear-time', Math.round(S.levelTime) + 's');
    const st = [...$('clear-stars').children]; st.forEach(e => e.classList.remove('on', 'show'));
    setState('clear');
    st.forEach((e, i) => setTimeout(() => { e.classList.add('show'); if (i < stars) { e.classList.add('on'); audio.star(i); } }, 250 + i * 260));
  });
}
async function nextLevel() { if (S.state !== 'clear') return; audio.click(); await ads.naturalBreak('level'); startLevel(S.level + 1); }
async function replayLevel() { if (S.state !== 'clear') return; S.milestone = null; audio.click(); S.game.score -= S.game.levelScore; await ads.naturalBreak('level'); startLevel(S.level); }
async function clearToMenu() { if (S.state !== 'clear') return; await ads.naturalBreak('level'); showAttract(); }

function beginRun(resume) {
  audio.init(); audio.startMusic(); audio.unduckMusic();
  const p = resume ? loadProgress() : null;
  S.game.score = p ? p.score : 0; S.peeks = p ? p.peeks : PEEK_START;
  startLevel(p ? p.level : (flags.level || 1));
  audio.confirm();
}
function showAttract() { startLevel(2 + Math.floor(Math.random() * 3), { attract: true }); refreshStart(); setState('attract'); audio.unduckMusic(); }
function pause() { if (!['playing', 'preview', 'peek'].includes(S.state)) return; S.pausedFrom = S.state; setState('paused'); audio.duckMusic(); audio.back(); }
function resume() { if (S.state !== 'paused') return; setState(S.pausedFrom || 'playing'); audio.unduckMusic(); audio.click(); }
function toMenu() { saveProgress(); audio.back(); showAttract(); }
async function restartLevel() {
  if (!['playing', 'preview'].includes(S.state) || ui.modalOpen || S.demo) return;
  const ok = await ui.confirm({ kicker: 'RESTART', title: t('restartQ'), text: t('restartText'), ok: t('restart'), okSmall: '', cancel: t('keepPlaying'), cancelSmall: '' });
  if (!ok) return; S.game.score -= S.game.levelScore; startLevel(S.level);
}

// ---------------------------------------------------------------- demo AI
function aiStep() {
  const g = S.game; if (g.open.length === 2 || g.done) return;
  const down = g.cards.filter(c => c.state === 'down');
  if (!down.length) return;
  const known = down.filter(c => S.mem.has(c.id));
  const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
  let pick = null;
  if (g.open.length === 0) {
    for (const a of known) { const b = known.find(x => x.id !== a.id && S.mem.get(x.id) === S.mem.get(a.id)); if (b) { pick = a; S.aiPlan = b.id; break; } }
    if (!pick) { S.aiPlan = -1; const unk = down.filter(c => !S.mem.has(c.id)); pick = rnd(unk.length ? unk : down); }
  } else {
    const first = g.cards[g.open[0]];
    if (S.aiPlan >= 0 && g.cards[S.aiPlan].state === 'down') pick = g.cards[S.aiPlan];
    else { const m = known.find(c => c.id !== first.id && S.mem.get(c.id) === first.icon); const unk = down.filter(c => !S.mem.has(c.id)); pick = m || rnd(unk.length ? unk : down); }
    S.aiPlan = -1;
  }
  if (pick) { S.cursor = pick.slot; table.setHover(pick.id); tryFlip(pick.id, true); }
}

// ---------------------------------------------------------------- input
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pickAt(x, y) { ndc.set(x / stage.width * 2 - 1, -(y / stage.height) * 2 + 1); ray.setFromCamera(ndc, camera); return table.pick(ray); }
function moveCursor(d) {
  if (S.state !== 'playing' || S.demo) return;
  const cols = table.cols, rows = table.rows; let c = S.cursor % cols, r = Math.floor(S.cursor / cols);
  if (d === 'left') c = (c + cols - 1) % cols; if (d === 'right') c = (c + 1) % cols; if (d === 'up') r = (r + rows - 1) % rows; if (d === 'down') r = (r + 1) % rows;
  S.cursor = r * cols + c; const card = S.game.cardAt(S.cursor); table.setHover(card ? card.id : -1); audio.tick();
}
createInput({
  anyGesture() { audio.init(); audio.startMusic(); },
  tap(p) { if (ui.modalOpen) return; const id = pickAt(p.x, p.y); if (id >= 0) { const c = S.game.cards[id]; S.cursor = c.slot; tryFlip(id); } },
  dir(d) { if (!ui.modalOpen) moveCursor(d); },
  action(a) {
    if (ui.modalOpen) { if (a === 'pause') ui.closeModal(); return; }
    if (a === 'primary') {
      if (S.state === 'attract') beginRun(!!(loadProgress()?.level > 1));
      else if (S.state === 'playing' && !S.demo) { const c = S.game.cardAt(S.cursor); if (c) tryFlip(c.id); }
      else if (S.state === 'paused') resume(); else if (S.state === 'clear') nextLevel();
    } else if (a === 'pause') { if (S.state === 'paused') resume(); else pause(); }
    else if (a === 'mute') { audio.init(); ui.setMuted(audio.toggleMute()); }
    else if (a === 'undo') peek();
    else if (a === 'restart') { if (S.state === 'clear') replayLevel(); else restartLevel(); }
    else if (a === 'fps') $('fps').classList.toggle('hidden');
  },
}, { swipe: 'once', threshold: 40 });
$('scene').addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' || S.state !== 'playing' || S.demo) return; const id = pickAt(e.clientX, e.clientY); table.setHover(id); document.body.style.cursor = id >= 0 && S.game.cards[id].state === 'down' ? 'pointer' : ''; });
ui.on('btn-start', () => { audio.init(); beginRun(false); });
ui.on('btn-continue', () => { audio.init(); beginRun(true); });
ui.on('btn-resume', resume); ui.on('btn-quit', toMenu); ui.on('btn-pause', pause);
ui.on('btn-mute', () => { audio.init(); ui.setMuted(audio.toggleMute()); });
ui.on('btn-peek', peek); ui.on('btn-restart', restartLevel);
i18n.bindToggle($('btn-lang')); i18n.bindToggle($('btn-lang2'));
i18n.onChange(() => { updateHUD(); if (S.state === 'attract') refreshStart(); });
ui.on('btn-next', nextLevel); ui.on('btn-replay', replayLevel); ui.on('btn-menu', clearToMenu);
Platform.onBack(() => {
  if (ui.closeModal()) return true;
  if (['playing', 'preview', 'peek'].includes(S.state)) { pause(); return true; }
  if (S.state === 'paused') { resume(); return true; }
  if (S.state === 'clear') { clearToMenu(); return true; }
  return false;
});
Platform.onPause(() => { saveProgress(); if (!S.demo) pause(); });
S.api = { level: (n) => { S.timers = []; startLevel(n); }, flip: (id) => tryFlip(id), peek, screenOf: (id) => stage.toScreen(table.worldPos(id)), clearNow: () => { for (const c of S.game.cards) if (c.state !== 'matched') { c.state = 'matched'; } S.game.matched = S.game.pairs; levelClear(); } };

// ---------------------------------------------------------------- camera
const camPos = new THREE.Vector3(0, 20, 14), camLook = new THREE.Vector3(0, BOARD_Y, 0), tP = new THREE.Vector3(), tL = new THREE.Vector3();
function frameCamera(dt, now, instant = false) {
  const aspect = stage.width / stage.height, portrait = aspect < 0.9, attract = S.state === 'attract';
  const vfov = portrait ? 50 : 42; camera.fov = vfov + fx.fovKick * 3; camera.updateProjectionMatrix();
  const pitch = THREE.MathUtils.degToRad(attract ? (portrait ? 52 : 42) : (portrait ? 66 : 60));
  const hw = table.halfW + 0.3, hd = table.halfD + 0.3;
  const tanV = Math.tan(THREE.MathUtils.degToRad(vfov / 2)), tanH = tanV * aspect;
  const usable = portrait ? 0.62 : 0.72;
  const dW = hw / (tanH * (portrait ? 0.96 : 0.9)) + hd * Math.cos(pitch);
  const dH = hd * Math.sin(pitch) / (tanV * usable) + hd * Math.cos(pitch);
  let d = Math.max(dW, dH), yaw = Math.sin(now * 0.13) * 0.03, lx = 0, lz = portrait ? -0.3 : 0;
  if (attract) { yaw = Math.sin(now * 0.12) * 0.4; d *= portrait ? 1.1 : 1.3; if (!portrait) lx = -hw * 0.95; else lz = hd * 0.5; }
  tL.set(lx, BOARD_Y, lz);
  tP.set(Math.sin(yaw) * Math.cos(pitch) * d, Math.sin(pitch) * d, Math.cos(yaw) * Math.cos(pitch) * d).add(tL);
  if (attract && !portrait) tP.x += lx;
  const k = instant ? 1 : 1 - Math.exp(-dt * 3);
  camPos.lerp(tP, k); camLook.lerp(tL, k); camera.position.copy(camPos); camera.lookAt(camLook);
  fx.shake(camera, now, 0.6);
}

// ---------------------------------------------------------------- loop
function tick(dt, now) {
  U.uTime.value = now; theme.update(dt); fx.update(dt);
  const running = S.state !== 'paused';
  if (running) {
    S.stateT += dt;
    for (const tm of S.timers.slice()) { tm.t -= dt; if (tm.t <= 0) { S.timers.splice(S.timers.indexOf(tm), 1); tm.fn(); } }
    if (S.missT > 0) { S.missT -= dt; if (S.missT <= 0) resolveMiss(); }
    if (S.state === 'preview') { S.previewT -= dt; if (S.previewT <= 0) endPreview(); }
    if (S.state === 'peek') { S.peekT -= dt; if (S.peekT <= 0) { table.flipAll(S.game, false, 0.01); setState('playing'); } }
    if (S.state === 'playing') S.levelTime += dt;
    if (S.state === 'attract') {
      if (S.previewT > 0) { S.previewT -= dt; if (S.previewT <= 0) table.flipAll(S.game, false, 0.015); }
      else { S.aiT += dt; if (S.aiT > 0.9) { S.aiT = 0; if (S.game.done) { if (!S.timers.length) later(1.5, () => S.state === 'attract' && startLevel(2 + Math.floor(Math.random() * 3), { attract: true })); } else aiStep(); } }
    }
    if (S.state === 'playing' && S.demo && S.missT <= 0) { S.aiT += dt; if (S.aiT > AI_STEP) { S.aiT = 0; aiStep(); } }
  }
  if (isPortrait() !== S.portrait && S.game.cards) { S.portrait = isPortrait(); table.relayout(S.game, S.portrait); }
  table.update(dt, now); particles.update(dt); waves.update(dt);
  city.update(now, dt, camera); frameCamera(dt, now); fx.applyPost(stage, now); ui.tick(dt);
  stage.render(dt);
}

async function boot() {
  if (document.fonts) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
  if (S.demo || flags.autostart) { beginRun(false); } else showAttract();
  frameCamera(0, 0, true);
  ui.loaded();
  stage.loop(tick, { isActive: () => S.state !== 'paused', fpsEl: $('fps') });
  if (flags.fps) $('fps').classList.remove('hidden');
  ads.init().catch(() => {});
}
boot().catch((e) => { console.error(e); ui.fatal(t('fatal') + ': ' + e.message); });
