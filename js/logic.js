// Pure memory-match rules (no DOM / three). Slots are grid positions; cards can move between slots (glitch swap).
import {
  layoutFor, MATCH_POINTS, COMBO_CAP, STAR3, STAR2, STAR_BONUS, glitchChanceFor,
  modifierFor, WILD_ICON, WILD_BONUS, SURGE_MULT, OVERLOAD_MATCHES,
} from './config.js';

export function makeRng(seed) { let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export class RecallGame {
  constructor({ rng = Math.random, iconCount = 16 } = {}) { this.rng = rng; this.iconCount = iconCount; this.score = 0; }
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  setup(level) {
    this.level = level;
    this.mod = modifierFor(level);
    const [L, S] = layoutFor(level);
    this.long = L; this.short = S; this.pairs = (L * S) / 2;
    const icons = this.shuffle([...Array(this.iconCount).keys()]).slice(0, this.pairs);
    // NEON WILD: replace one pair's icon with the wild glyph (still a normal pair — matching it triggers free reveal + bonus)
    if (this.mod === 'wild' && icons.length) icons[0] = WILD_ICON;
    const deck = this.shuffle([...icons, ...icons]);
    this.cards = deck.map((icon, i) => ({ id: i, icon, slot: i, state: 'down' }));
    this.open = [];
    this.matched = 0; this.moves = 0; this.misses = 0; this.combo = 0; this.maxCombo = 0; this.levelScore = 0;
    this.scoreMult = this.mod === 'surge' ? SURGE_MULT : 1;
    this.overloadLeft = 0;   // remaining ×2 overload matches
    this.wildMatched = false;
    return this.cards;
  }
  get done() { return this.matched === this.pairs; }
  cardAt(slot) { return this.cards.find(c => c.slot === slot); }
  twinOf(id) {
    const c = this.cards[id]; if (!c) return null;
    return this.cards.find(x => x.id !== id && x.icon === c.icon && x.state !== 'matched') || null;
  }
  /** arm OVERLOAD: next OVERLOAD_MATCHES matches score ×2; miss voids */
  armOverload() { this.overloadLeft = OVERLOAD_MATCHES; }
  clearOverload() { this.overloadLeft = 0; }

  /** flip card id. Returns {type:'first'|'match'|'miss'|'ignored', ids, gained, combo, tier, wild, overload} */
  flip(id) {
    const c = this.cards[id];
    if (!c || c.state !== 'down' || this.open.length >= 2) return { type: 'ignored', ids: [] };
    c.state = 'up'; this.open.push(id);
    if (this.open.length === 1) return { type: 'first', ids: [id], icon: c.icon };
    const [a, b] = this.open.map(i => this.cards[i]);
    this.moves++;
    if (a.icon === b.icon) {
      a.state = b.state = 'matched'; this.open = []; this.matched++;
      this.combo = Math.min(COMBO_CAP, this.combo + 1); this.maxCombo = Math.max(this.maxCombo, this.combo);
      let mult = this.scoreMult;
      let overload = false;
      if (this.overloadLeft > 0) { mult *= 2; this.overloadLeft--; overload = true; }
      const wild = a.icon === WILD_ICON;
      if (wild) this.wildMatched = true;
      let gained = Math.round(MATCH_POINTS * this.combo * mult);
      if (wild) gained += WILD_BONUS;
      this.score += gained; this.levelScore += gained;
      // tier for VFX/SFX (no rule change)
      let tier = 'normal';
      if (wild) tier = 'wild';
      else if (this.misses === 0 && this.matched === this.pairs) tier = 'clearing';
      else if (this.misses === 0) tier = 'perfect';
      else if (this.combo >= 2 || overload) tier = 'combo';
      if (this.matched === this.pairs && tier !== 'wild') tier = 'clearing';
      return { type: 'match', ids: [a.id, b.id], gained, combo: this.combo, tier, wild, overload, mult };
    }
    this.misses++; this.combo = 0;
    const voided = this.overloadLeft > 0;
    this.overloadLeft = 0;
    return { type: 'miss', ids: [a.id, b.id], voided };
  }
  /** turn the unresolved miss pair face-down again. Returns ids hidden and an optional glitch swap [idA, idB]. */
  hideMiss() {
    if (this.open.length < 2) return { ids: [], swap: null };
    const ids = this.open.slice(); for (const i of ids) this.cards[i].state = 'down'; this.open = [];
    let swap = null;
    if (this.rng() < glitchChanceFor(this.level)) {
      const down = this.cards.filter(c => c.state === 'down');
      if (down.length >= 4) {
        const [x, y] = this.shuffle(down.slice()).slice(0, 2);
        [x.slot, y.slot] = [y.slot, x.slot]; swap = [x.id, y.id];
      }
    }
    return { ids, swap };
  }
  /** DATA DRIFT modifier: after a match, swap two face-down cards. Returns [idA,idB] or null. */
  driftSwap() {
    if (this.mod !== 'drift') return null;
    const down = this.cards.filter(c => c.state === 'down');
    if (down.length < 2) return null;
    const [x, y] = this.shuffle(down.slice()).slice(0, 2);
    [x.slot, y.slot] = [y.slot, x.slot];
    return [x.id, y.id];
  }
  stars() { const m = this.misses, p = this.pairs; return m <= p * STAR3 ? 3 : m <= p * STAR2 ? 2 : 1; }
  /** call once at level clear: adds the star bonus and returns it */
  clearBonus() { const b = this.stars() * STAR_BONUS; this.score += b; this.levelScore += b; return b; }
}
