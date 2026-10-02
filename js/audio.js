// NEON RECALL sounds — soft, airy, all synthesised.
import { SynthAudio, mtof } from 'cyber-kit/audio/synth.js';
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
export class RecallAudio extends SynthAudio {
  constructor(store) { super({ store, music: 'chill' }); }
  flip() { this.noiseHit({ dur: 0.07, vol: 0.04, type: 'bandpass', f: 2600, f2: 5200, q: 2, a: 0.004 }); this.osc({ type: 'triangle', f: 900, f2: 1300, dur: 0.05, vol: 0.03 }); }
  match(combo = 1) {
    if (!this.ctx) return;
    const root = 67 + PENTA[Math.min(combo - 1, PENTA.length - 1)];
    [0, 4, 7, 12].forEach((n, i) => this.osc({ type: i % 2 ? 'triangle' : 'sine', f: mtof(root + n), t: i * 0.05, dur: 0.45, vol: 0.08, send: 0.45 }));
    this.noiseHit({ t: 0.02, dur: 0.25, vol: 0.03, type: 'highpass', f: 6000, a: 0.01 });
  }
  miss() { this.osc({ type: 'sine', f: 330, f2: 250, dur: 0.22, vol: 0.07, send: 0.2 }); this.osc({ type: 'sine', f: 311, f2: 236, t: 0.04, dur: 0.22, vol: 0.05 }); }
  glitch() { for (let i = 0; i < 5; i++) this.osc({ type: 'square', f: 200 + Math.random() * 1600, t: i * 0.04, dur: 0.03, vol: 0.03, lp: 4000 }); this.noiseHit({ dur: 0.25, vol: 0.05, type: 'bandpass', f: 1200, f2: 300, q: 3 }); }
  peek() { this.osc({ type: 'sine', f: 600, f2: 1800, dur: 0.35, vol: 0.06, send: 0.5 }); this.whoosh(0.04); }
  clear() { this.levelUp(); [0, 4, 7, 11, 14].forEach((n, i) => this.osc({ type: 'sine', f: mtof(72 + n), t: 0.25 + i * 0.07, dur: 0.6, vol: 0.06, send: 0.5 })); }
  star(i) { this.osc({ type: 'triangle', f: mtof(76 + i * 4), dur: 0.3, vol: 0.09, send: 0.4 }); }
}
