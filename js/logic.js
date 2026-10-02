// Pure memory-match rules (no DOM / three). Slots are grid positions; cards can move between slots (glitch swap).
import { layoutFor, MATCH_POINTS, COMBO_CAP, STAR3, STAR2, STAR_BONUS, GLITCH_FROM_LEVEL, GLITCH_CHANCE } from './config.js';

export function makeRng(seed) { let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export class RecallGame {
  constructor({ rng = Math.random, iconCount = 16 } = {}) { this.rng = rng; this.iconCount = iconCount; this.score = 0; }
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  setup(level) {
    this.level = level;
    const [L, S] = layoutFor(level);
    this.long = L; this.short = S; this.pairs = (L * S) / 2;
    const icons = this.shuffle([...Array(this.iconCount).keys()]).slice(0, this.pairs);
    const deck = this.shuffle([...icons, ...icons]);
    this.cards = deck.map((icon, i) => ({ id: i, icon, slot: i, state: 'down' }));
    this.open = [];               // ids face-up and unresolved (0..2)
    this.matched = 0; this.moves = 0; this.misses = 0; this.combo = 0; this.maxCombo = 0; this.levelScore = 0;
    return this.cards;
  }
  get done() { return this.matched === this.pairs; }
  cardAt(slot) { return this.cards.find(c => c.slot === slot); }
  /** flip card id. Returns {type:'first'|'match'|'miss'|'ignored', ids, gained} */
  flip(id) {
    const c = this.cards[id];
    if (!c || c.state !== 'down' || this.open.length >= 2) return { type: 'ignored', ids: [] };
    c.state = 'up'; this.open.push(id);
    if (this.open.length === 1) return { type: 'first', ids: [id] };
    const [a, b] = this.open.map(i => this.cards[i]);
    this.moves++;
    if (a.icon === b.icon) {
      a.state = b.state = 'matched'; this.open = []; this.matched++;
      this.combo = Math.min(COMBO_CAP, this.combo + 1); this.maxCombo = Math.max(this.maxCombo, this.combo);
      const gained = MATCH_POINTS * this.combo; this.score += gained; this.levelScore += gained;
      return { type: 'match', ids: [a.id, b.id], gained, combo: this.combo };
    }
    this.misses++; this.combo = 0;
    return { type: 'miss', ids: [a.id, b.id] };
  }
  /** turn the unresolved miss pair face-down again. Returns ids hidden and an optional glitch swap [idA, idB]. */
  hideMiss() {
    if (this.open.length < 2) return { ids: [], swap: null };
    const ids = this.open.slice(); for (const i of ids) this.cards[i].state = 'down'; this.open = [];
    let swap = null;
    if (this.level >= GLITCH_FROM_LEVEL && this.rng() < GLITCH_CHANCE) {
      const down = this.cards.filter(c => c.state === 'down');
      if (down.length >= 4) {
        const [x, y] = this.shuffle(down.slice()).slice(0, 2);
        [x.slot, y.slot] = [y.slot, x.slot]; swap = [x.id, y.id];
      }
    }
    return { ids, swap };
  }
  stars() { const m = this.misses, p = this.pairs; return m <= p * STAR3 ? 3 : m <= p * STAR2 ? 2 : 1; }
  /** call once at level clear: adds the star bonus and returns it */
  clearBonus() { const b = this.stars() * STAR_BONUS; this.score += b; this.levelScore += b; return b; }
}
