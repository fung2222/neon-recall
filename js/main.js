// NEON RECALL 霓虹記憶 — controller: levels, preview, flips, matches, glitch swaps, peek, stars, demo AI, camera, saves.
// v1.2 polish + modifiers (twin/drift/wild/surge) + overload peek + echo hint.
import * as THREE from 'three';
import { i18n, t, themeLabel, flags, createStore, createStage, ThemeController, themeFor, U, Particles, Shockwaves, FxState, NeonCity, createInput, CyberUI, Platform, createAds, readHub, returnToHub, shouldShowArcadeMenu} from 'cyber-kit';
import { GAME_ID, previewFor, PEEK_START, PEEK_EVERY, PEEK_REWARD, PEEK_TIME, OVERLOAD_PEEK_TIME, OVERLOAD_HOLD_MS, T_FLIP, T_MISS_HOLD, AI_STEP, AI_FORGET, BOARD_Y, ADS, LAYOUTS, MILESTONE_EVERY, milestoneReward, SURGE_PEEK_BONUS, WILD_REVEAL, modifierFor } from './config.js';
import './strings.js';
import { RecallGame, makeRng } from './logic.js';
import { CardTable } from './cards.js';
import { ICONS } from './icons.js';
import { RecallAudio } from './audio.js';
import { ComboAura, EchoHint, flipTrail } from './polish.js';

const $ = (id) => document.getElementById(id);
const store = createStore(GAME_ID);
if (flags.reset) store.clear();
const ui = new CyberUI({ screens: ['start', 'pause', 'clear'] });
const stage = createStage({ canvas: $('scene'), bloom: 0.85, bloomRadius: 0.5, bloomThreshold: 0.8, fov: 46, exposure: 1.05, onFatal: (m) => ui.fatal(m) });
ui.glowToggle(stage);
const { scene, camera } = stage;
const theme = new ThemeController(); theme.set(1, true);
const city = new NeonCity(stage, { floor: 'reflect', innerRadius: 20, buildings: 260, billboard: { zh: '霓虹記憶', en: 'N E O N   R E C A L L', pos: [0, 22, -46], width: 30 }, dustArea: 30, dustHeight: 12 });
const table = new CardTable(scene);
const particles = new Particles(scene, 2000, { floorY: BOARD_Y + 0.05 });
stage.onResize((w, h, pr) => particles.resize(h, pr));
const waves = new Shockwaves(scene, 8);
const fx = new FxState();
const comboAura = new ComboAura(scene);
const echoHint = new EchoHint();
const audio = new RecallAudio(store); ui.setMuted(audio.muted);
const ads = createAds({ gameId: GAME_ID, ...ADS, onAdOpen: (on) => audio.duckAll(on) });

const S = {
  state: 'attract',
  demo: !!flags.demo,
  game: new RecallGame(flags.seed != null ? { rng: makeRng(flags.seed) } : {}),
  level: 1, peeks: PEEK_START, timers: [], missT: 0, stateT: 0, levelTime: 0, aiT: 0, mem: new Map(), aiPlan: -1,
  cursor: 0, portrait: stage.width / stage.height < 0.9, pausedFrom: null,
  idleT: 0, wildReveal: false,
};
window.__recall = S;
const later = (delay, fn) => S.timers.push({ t: delay, fn });
const isPortrait = () => stage.width / stage.height < 0.9;

const getStars = () => store.getJSON('stars', {}) || {};
const totalStars = () => Object.values(getStars()).reduce((a, b) => a + b, 0);
function saveProgress() { if (S.demo) return; store.setJSON('progress', { v: 1, level: S.level, score: S.game.score, peeks: S.peeks }); }
const loadProgress = () => { const p = store.getJSON('progress'); return p && p.v === 1 && p.level >= 1 ? p : null; };

function setHintUi(on) { const b = $('btn-hint'); if (b) b.classList.toggle('off', !on); }
setHintUi(echoHint.enabled);

function updatePeekMeter() {
  const fill = $('peek-fill'), btn = $('btn-peek');
  if (!fill || !btn) return;
  if (btn.classList.contains('charging')) return;
  if (S.game.overloadLeft > 0) {
    btn.classList.add('overload');
    fill.style.width = (S.game.overloadLeft / 2 * 100) + '%';
  } else {
    btn.classList.remove('overload');
    fill.style.width = S.peeks > 0 ? '100%' : '0%';
  }
}

function updateModChip() {
  const chip = $('hud-mod'), name = $('hud-mod-name'), sub = $('hud-mod-sub');
  if (!chip) return;
  const mod = S.game.mod;
  if (!mod || S.state === 'attract') { chip.classList.add('hidden'); return; }
  chip.classList.remove('hidden', 'twin', 'drift', 'wild', 'surge');
  chip.classList.add(mod);
  name.textContent = t('mod.' + mod);
  sub.textContent = t('mod.' + mod + 'S');
}

function updateHUD() {
  const g = S.game;
  ui.setText('hud-score', g.score.toLocaleString('en-US'));
  ui.setText('hud-best', Math.max(store.best, g.score).toLocaleString('en-US'));
  ui.setText('hud-level', S.level);
  ui.setText('hud-combo', '×' + g.combo);
  $('hud-combo')?.classList.toggle('hot', g.combo >= 2);
  ui.setText('hud-pairs', `${g.matched} / ${g.pairs}`);
  $('hud-progress').style.width = (g.pairs ? g.matched / g.pairs * 100 : 0).toFixed(1) + '%';
  const th = themeFor(S.level); ui.setText('hud-zone-name', `${themeLabel(th)} · ${g.long}×${g.short}${S.level > LAYOUTS.length ? ' · ' + t('endless') : ''}`);
  const b = $('peek-badge');
  if (S.peeks > 0) { b.textContent = S.peeks; b.classList.remove('ad'); } else { b.textContent = ads.isNative ? 'AD' : '+' + PEEK_REWARD; b.classList.add('ad'); }
  $('btn-peek').classList.toggle('disabled', S.state !== 'playing' || S.demo);
  updatePeekMeter();
  updateModChip();
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
  S.state = s; S.stateT = 0; S.idleT = 0;
  ui.show({ attract: 'start', paused: 'pause', clear: 'clear' }[s] || null);
  ui.hud(s !== 'attract');
  $('demo-tag').classList.toggle('hidden', !S.demo);
  updateHUD();
}

function modBanner(level) {
  const mod = modifierFor(level);
  if (!mod) return null;
  return { main: t('mod.' + mod), sub: t('mod.' + mod + 'S') };
}

function startLevel(level, { attract = false } = {}) {
  S.level = level; S.timers = []; S.missT = 0; S.levelTime = 0; S.mem.clear(); S.aiPlan = -1; S.idleT = 0; S.wildReveal = false;
  S.game.setup(level);
  S.portrait = isPortrait();
  table.setup(S.game, S.portrait, true);
  theme.set(level); audio.setLevel(level);
  S.cursor = 0; table.setHover(-1);
  if (S.game.mod === 'surge' && !attract && !S.demo) S.peeks += SURGE_PEEK_BONUS;
  if (attract) { S.state = 'attract'; S.previewT = 2.2; S.aiT = -1; memorise(0.5); return; }
  setState('preview'); S.previewT = previewFor(level) + 0.7;
  const mb = modBanner(level);
  if (S.milestone) {
    const m = S.milestone; S.milestone = null;
    ui.banner(t('milestone', { n: m.n }), t('milestoneS', { pts: m.pts.toLocaleString('en-US'), peeks: m.peeks }), mb ? mb.main : t('memorise'));
  } else if (mb) {
    ui.banner(t('levelN', { n: level }), mb.main, mb.sub);
    audio.modChime();
  } else {
    ui.banner(t('levelN', { n: level }), `${S.game.long}×${S.game.short}${level > LAYOUTS.length ? ' · ' + t('endless') : ''}`, t('memorise'));
  }
  memorise(0.55);
  audio.whoosh(0.05);
  updateHUD();
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
  S.idleT = 0;
  table.flip(id, true); audio.flip(); if (!byAI || S.demo) Platform.haptic('light');
  const pos = table.worldPos(id);
  const col = new THREE.Color(ICONS[S.game.cards[id].icon]?.color || '#00e5ff');
  flipTrail(particles, pos, col, r.type === 'first' ? 12 : 18);
  if (Math.random() > AI_FORGET) S.mem.set(id, S.game.cards[id].icon);

  // TWIN SIGNAL modifier + soft echo of first-flip twin for everyone? only mod twin
  if (r.type === 'first' && S.game.mod === 'twin' && S.state !== 'attract') {
    const twin = S.game.twinOf(id);
    if (twin) { table.twinPulse(twin.id, ICONS[twin.icon].color); audio.twin(); }
  }

  if (r.type === 'match') later(T_FLIP * 0.9, () => onMatch(r));
  else if (r.type === 'miss') {
    S.missT = T_MISS_HOLD + T_FLIP;
    later(T_FLIP, () => {
      table.miss(r.ids);
      if (S.state !== 'attract') {
        audio.miss(); Platform.haptic('warning');
        if (r.voided) { audio.overloadVoid(); ui.toast(t('overloadVoid'), 1600); updatePeekMeter(); }
      }
    });
  }
  updateHUD();
}

function comboToast(x, y, n) {
  const d = document.createElement('div');
  d.className = 'popup combo-toast';
  d.style.left = x + 'px'; d.style.top = y + 'px';
  d.textContent = t('comboText', { n });
  (ui.el.popups || document.body).appendChild(d);
  setTimeout(() => d.remove(), 1100);
}

function onMatch(r) {
  const ic = ICONS[S.game.cards[r.ids[0]].icon], col = new THREE.Color(ic.color);
  const tier = r.tier || 'normal';
  table.match(r.ids, ic.color, tier);
  const burstN = tier === 'wild' || tier === 'clearing' ? 70 : tier === 'perfect' ? 55 : tier === 'combo' ? 48 : (S.state === 'attract' ? 16 : 40);
  for (const id of r.ids) {
    S.mem.delete(id);
    const p = table.worldPos(id);
    particles.burst(p, col, burstN, { speed: 4 + (tier === 'wild' ? 2 : 0), up: 4, life: 0.85, size: tier === 'clearing' ? 1.15 : 0.9, color2: new THREE.Color(0xffffff) });
    waves.spawn(new THREE.Vector3(p.x, BOARD_Y + 0.05, p.z), col, { r0: 0.2, r1: tier === 'clearing' ? 3.2 : 2.2, h: 0.4, dur: 0.5 });
    table.pulse(p.x, p.z, tier === 'wild' ? 1.6 : 1);
  }
  if (S.state === 'attract') return;
  audio.match(r.combo, tier);
  if (r.combo >= 2) audio.combo(r.combo);
  Platform.haptic('medium');
  const mid = table.worldPos(r.ids[0]).add(table.worldPos(r.ids[1])).multiplyScalar(0.5); mid.y += 0.8;
  const sp = stage.toScreen(mid);
  comboAura.pulse(mid.x, mid.z, r.combo >= 3 ? 1.4 : r.combo >= 2 ? 1 : 0.55);
  let popCls = tier === 'wild' ? 'wild' : tier === 'clearing' ? 'clearing' : tier === 'perfect' ? 'perfect' : r.combo >= 2 ? 'combo-pop' : (r.combo >= 3 ? 'big' : '');
  const sub = r.overload ? `×2 · COMBO ×${r.combo}` : (r.combo > 1 ? `COMBO ×${r.combo}` : t('icon.' + ic.id));
  ui.popup(sp.x, sp.y, '+' + r.gained, sub, popCls);
  if (r.combo >= 2) comboToast(sp.x, sp.y - 36, r.combo);
  if (r.combo >= 3 || tier === 'wild') fx.kick({ aberr: 0.5, trauma: 0.08 });
  if (tier === 'clearing') fx.kick({ aberr: 0.7, trauma: 0.12, fovKick: 0.6 });
  city.pulse(mid.x * 3, mid.z * 3 - 4, 0.6);
  ui.bump('hud-score'); ui.bump('hud-combo');
  updateHUD();

  // DATA DRIFT after match
  if (S.game.mod === 'drift' && !S.game.done) {
    const swap = S.game.driftSwap();
    if (swap) {
      later(0.35, () => {
        table.resyncSlots(S.game); table.swap(swap);
        for (const id of swap) if (Math.random() < 0.5) S.mem.delete(id);
        audio.drift(); ui.toast(t('drift'), 1400);
      });
    }
  }

  // NEON WILD: free full reveal
  if (r.wild && !S.game.done) {
    ui.toast(t('wildClear'), 1800);
    later(0.4, () => {
      S.wildReveal = true;
      table.flipAll(S.game, true, 0.01);
      table.startPeekScan();
      audio.peek(); fx.kick({ aberr: 0.7 }); ui.flash('rgba(255,225,74,0.22)', 450);
      later(WILD_REVEAL + T_FLIP, () => {
        if (S.state === 'playing' || S.wildReveal) {
          table.flipAll(S.game, false, 0.01);
          S.wildReveal = false;
        }
      });
    });
  }

  if (S.game.done) later(0.55, levelClear);
}

function resolveMiss() {
  S.missT = 0;
  const h = S.game.hideMiss();
  // echo hint: remember colours of the miss pair
  if (echoHint.enabled && S.state !== 'attract') {
    for (const id of h.ids) {
      const ic = ICONS[S.game.cards[id].icon];
      if (ic) table.echoGlow([id], ic.color);
    }
  }
  for (const id of h.ids) table.flip(id, false);
  if (h.swap) {
    table.resyncSlots(S.game); table.swap(h.swap);
    for (const id of h.swap) if (Math.random() < 0.5) S.mem.delete(id);
    if (S.state !== 'attract') { audio.glitch(); fx.kick({ glitch: 0.7, aberr: 0.8 }); ui.toast(t('glitch'), 1600); }
  }
  updatePeekMeter();
}

async function doPeek({ overload = false } = {}) {
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
  table.startPeekScan();
  setState('peek');
  const dur = overload ? OVERLOAD_PEEK_TIME : PEEK_TIME;
  S.peekT = dur + T_FLIP;
  if (overload) {
    S.game.armOverload();
    audio.peekOverload();
    fx.kick({ aberr: 0.85, trauma: 0.1, fovKick: 0.5 });
    ui.flash('rgba(255,225,74,0.22)', 480);
    ui.toast(t('overloadOn'), 1800);
  } else {
    audio.peek(); fx.kick({ aberr: 0.6 }); ui.flash('rgba(0,229,255,0.18)', 400);
  }
  saveProgress(); updateHUD();
}
async function peek() { return doPeek({ overload: false }); }
async function overloadPeek() { return doPeek({ overload: true }); }

function levelClear() {
  const g = S.game, stars = g.stars(), bonus = g.clearBonus();
  const perfect = g.misses === 0;
  table.celebrate();
  if (perfect) audio.perfectClear(); else audio.clear();
  Platform.haptic('success');
  fx.kick({ trauma: perfect ? 0.28 : 0.2, aberr: 1, fovKick: 1 });
  ui.flash(perfect ? 'rgba(255,225,74,0.35)' : 'rgba(255,255,255,0.3)', 420);
  particles.ring(new THREE.Vector3(0, BOARD_Y + 0.1, 0), new THREE.Color().copy(U.uC3.value), perfect ? 220 : 160, perfect ? 11 : 9, BOARD_Y + 0.1);
  waves.spawn(new THREE.Vector3(0, BOARD_Y, 0), new THREE.Color().copy(U.uC1.value), { r0: 1, r1: 13, h: 2, dur: 1.1, a: 3 });
  city.pulse(0, -6, 2);
  if (S.demo) { later(2.2, () => startLevel(S.level >= 5 ? 1 : S.level + 1)); setState('playing'); return; }
  const rec = getStars(); if ((rec[S.level] || 0) < stars) { rec[S.level] = stars; store.setJSON('stars', rec); }
  store.submitBest(g.score);
  const firstClear = S.level + 1 > store.getNum('maxLevel', 0);
  store.setNum('maxLevel', Math.max(store.getNum('maxLevel', 0), S.level + 1));
  S.clearInfo = { stars, bonus, perfect };
  if (S.level % PEEK_EVERY === 0) { S.peeks++; ui.toast(t('peekPlus'), 1800); }
  if (S.level % MILESTONE_EVERY === 0 && firstClear) { const m = milestoneReward(S.level); g.score += m.pts; S.peeks += m.peeks; S.milestone = { n: S.level, ...m }; }
  const lv = S.level; S.level = lv + 1; saveProgress(); S.level = lv;
  later(0.85, () => {
    ui.setText('clear-kicker', t('clearKicker', { n: S.level, bonus }));
    const title = $('screen-clear')?.querySelector('.title2');
    const titleEn = $('screen-clear')?.querySelector('.title-en');
    if (perfect && title) { title.textContent = t('perfectSync'); title.dataset.text = t('perfectSync'); }
    else if (title) { title.textContent = t('synced'); title.dataset.text = t('synced'); }
    if (perfect && titleEn) titleEn.textContent = t('perfectSyncS');
    else if (titleEn) titleEn.textContent = t('syncedS');
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
    else if (a === 'overload') overloadPeek();
    else if (a === 'hint') { setHintUi(echoHint.toggle()); audio.click(); }
    else if (a === 'restart') { if (S.state === 'clear') replayLevel(); else restartLevel(); }
    else if (a === 'fps') $('fps').classList.toggle('hidden');
  },
}, { swipe: 'once', threshold: 40, actions: { KeyX: 'overload', KeyH: 'hint' } });
$('scene').addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' || S.state !== 'playing' || S.demo) return; const id = pickAt(e.clientX, e.clientY); table.setHover(id); document.body.style.cursor = id >= 0 && S.game.cards[id].state === 'down' ? 'pointer' : ''; });
ui.on('btn-start', () => { audio.init(); beginRun(false); });
const __hub = readHub();
if (shouldShowArcadeMenu(__hub)) { const b = document.getElementById('btn-arcade-menu'); if (b) b.classList.remove('hidden'); }
ui.on('btn-arcade-menu', () => { try { audio.back(); } catch {} returnToHub({ gameId: 'neon-recall', openStore: false }); });

ui.on('btn-continue', () => { audio.init(); beginRun(true); });
ui.on('btn-resume', resume); ui.on('btn-quit', toMenu); ui.on('btn-pause', pause);
ui.on('btn-mute', () => { audio.init(); ui.setMuted(audio.toggleMute()); });
ui.on('btn-restart', restartLevel);
$('btn-hint')?.addEventListener('click', (e) => { e.stopPropagation(); setHintUi(echoHint.toggle()); audio.click(); e.currentTarget.blur(); });

// Peek: tap = normal; hold = overload
{
  const btn = $('btn-peek');
  let holdTimer = 0, holding = false, overloaded = false;
  const clearHold = () => { cancelAnimationFrame(holdTimer); holding = false; btn?.classList.remove('charging'); btn?.style.removeProperty('--charge'); };
  btn?.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (S.state !== 'playing' || S.demo) return;
    holding = true; overloaded = false;
    btn.classList.add('charging');
    const t0 = performance.now();
    const tick = () => {
      if (!holding) return;
      const k = Math.min(1, (performance.now() - t0) / OVERLOAD_HOLD_MS);
      btn.style.setProperty('--charge', (k * 100) + '%');
      $('peek-fill').style.width = (k * 100) + '%';
      if (k >= 1) { overloaded = true; clearHold(); overloadPeek(); return; }
      holdTimer = requestAnimationFrame(tick);
    };
    holdTimer = requestAnimationFrame(tick);
  });
  const end = (e) => {
    if (!holding) return;
    e?.preventDefault?.(); e?.stopPropagation?.();
    const was = overloaded; clearHold(); updatePeekMeter();
    if (!was) peek();
  };
  btn?.addEventListener('pointerup', end);
  btn?.addEventListener('pointerleave', () => { if (holding && !overloaded) { clearHold(); updatePeekMeter(); } });
  btn?.addEventListener('pointercancel', () => { clearHold(); updatePeekMeter(); });
  btn?.addEventListener('click', (e) => e.preventDefault()); // handled by pointer
}

i18n.bindToggle($('btn-lang')); i18n.bindToggle($('btn-lang2'));

ui.mountHowto({
  privacyUrl: './privacy.html',
  onOpen: () => { try { audio.click(); } catch (_) {} },
  getContent: () => ({
    kicker: 'NEON RECALL',
    title: t('kit.howto'),
    sections: [
      { heading: t('kit.rules'), body: t('help.rules') },
      { heading: t('kit.controls'), body: t('help.controls') },
    ],
  }),
});
ui.mountSettings({
  audio, stage,
  onOpen: () => { try { audio.click(); } catch (_) {} },
});


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
S.api = { level: (n) => { S.timers = []; startLevel(n); }, flip: (id) => tryFlip(id), peek, overloadPeek, screenOf: (id) => stage.toScreen(table.worldPos(id)), clearNow: () => { for (const c of S.game.cards) if (c.state !== 'matched') { c.state = 'matched'; } S.game.matched = S.game.pairs; levelClear(); } };

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

function tick(dt, now) {
  U.uTime.value = now; theme.update(dt); fx.update(dt);
  const running = S.state !== 'paused';
  if (running) {
    S.stateT += dt;
    if (S.state === 'playing') S.idleT += dt;
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
  table.update(dt, now, S.state === 'playing' && S.idleT > 2);
  comboAura.update(dt, U.uC3.value);
  particles.update(dt); waves.update(dt);
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
