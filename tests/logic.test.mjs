import { RecallGame, makeRng } from '../js/logic.js';
import assert from 'node:assert/strict';
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('setup sizes', () => { const g = new RecallGame({ rng: makeRng(1) }); for (const [lv, p] of [[1, 4], [2, 6], [3, 8], [4, 10], [5, 12], [9, 12]]) { g.setup(lv); assert.equal(g.pairs, p); assert.equal(g.cards.length, p * 2); const cnt = {}; g.cards.forEach(c => cnt[c.icon] = (cnt[c.icon] || 0) + 1); assert.ok(Object.values(cnt).every(v => v === 2)); } });
t('match + combo + score', () => { const g = new RecallGame({ rng: makeRng(2) }); g.setup(1); const a = g.cards[0]; const b = g.cards.find(c => c.icon === a.icon && c.id !== a.id);
  assert.equal(g.flip(a.id).type, 'first'); const r = g.flip(b.id); assert.equal(r.type, 'match'); assert.equal(r.gained, 100); assert.equal(g.matched, 1); assert.equal(g.combo, 1); });
t('miss then hide', () => { const g = new RecallGame({ rng: makeRng(3) }); g.setup(1); const a = g.cards[0]; const b = g.cards.find(c => c.icon !== a.icon);
  g.flip(a.id); assert.equal(g.flip(b.id).type, 'miss'); assert.equal(g.flip(g.cards.find(c => c.state === 'down').id).type, 'ignored');
  const h = g.hideMiss(); assert.deepEqual(h.ids.sort(), [a.id, b.id].sort()); assert.equal(a.state, 'down'); assert.equal(g.combo, 0); assert.equal(g.misses, 1); });
t('cannot flip same / matched card', () => { const g = new RecallGame({ rng: makeRng(4) }); g.setup(1); g.flip(0); assert.equal(g.flip(0).type, 'ignored'); });
t('perfect clear = 3 stars', () => { const g = new RecallGame({ rng: makeRng(5) }); g.setup(3); const seen = new Set();
  for (const c of g.cards) { if (seen.has(c.id)) continue; const m = g.cards.find(x => x.icon === c.icon && x.id !== c.id); g.flip(c.id); g.flip(m.id); seen.add(c.id); seen.add(m.id); }
  assert.ok(g.done); assert.equal(g.stars(), 3); assert.equal(g.maxCombo, 5); const s0 = g.score; assert.equal(g.clearBonus(), 450); assert.equal(g.score, s0 + 450); });
t('glitch swap keeps slots a permutation', () => { const g = new RecallGame({ rng: makeRng(6) }); g.setup(8); let swaps = 0;
  for (let k = 0; k < 40; k++) { const d = g.cards.filter(c => c.state === 'down'); const a = d[0], b = d.find(c => c.icon !== a.icon); g.flip(a.id); g.flip(b.id); const h = g.hideMiss(); if (h.swap) swaps++; }
  assert.ok(swaps > 3); const slots = g.cards.map(c => c.slot).sort((x, y) => x - y); assert.deepEqual(slots, [...Array(24).keys()]); });
console.log(`ALL PASSED (${n})`);
