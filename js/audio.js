// NEON RECALL sounds — soft, airy, all synthesised. Polish: tiered match, combo, overload, ambient bed.
import { SynthAudio, mtof } from 'cyber-kit/audio/synth.js';
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
export class RecallAudio extends SynthAudio {
  constructor(store) { super({ store, music: 'chill', sfxTrimDb: -3.3 }); this._amb = null; }

  flip() {
    this.noiseHit({ dur: 0.07, vol: 0.04, type: 'bandpass', f: 2600, f2: 5200, q: 2, a: 0.004 });
    this.osc({ type: 'triangle', f: 900, f2: 1300, dur: 0.05, vol: 0.03 });
  }

  // tier: 'normal' | 'combo' | 'perfect' | 'clearing' | 'wild'
  match(combo = 1, tier = 'normal') {
    if (!this.ctx) return;
    const root = 67 + PENTA[Math.min(combo - 1, PENTA.length - 1)];
    const vol = tier === 'wild' || tier === 'clearing' ? 0.1 : 0.08;
    [0, 4, 7, 12].forEach((n, i) => this.osc({ type: i % 2 ? 'triangle' : 'sine', f: mtof(root + n), t: i * 0.05, dur: 0.45, vol, send: 0.45 }));
    this.noiseHit({ t: 0.02, dur: 0.25, vol: 0.03, type: 'highpass', f: 6000, a: 0.01 });
    if (tier === 'combo' || combo >= 3) {
      this.osc({ type: 'square', f: mtof(root + 16), t: 0.08, dur: 0.14, vol: 0.05, lp: 5000, send: 0.35 });
    }
    if (tier === 'perfect') {
      this.osc({ type: 'sine', f: mtof(root + 19), t: 0.1, dur: 0.35, vol: 0.07, send: 0.55 });
    }
    if (tier === 'clearing') {
      [0, 7, 12, 16].forEach((n, i) => this.osc({ type: 'sine', f: mtof(72 + n), t: 0.12 + i * 0.05, dur: 0.4, vol: 0.06, send: 0.5 }));
    }
    if (tier === 'wild') {
      this.osc({ type: 'sawtooth', f: mtof(root + 12), t: 0.04, dur: 0.22, vol: 0.06, lp: 3200, send: 0.5 });
      this.noiseHit({ t: 0.02, dur: 0.18, vol: 0.05, type: 'bandpass', f: 1800, f2: 5000, q: 1.5 });
    }
  }

  combo(n = 2) {
    if (!this.ctx) return;
    const root = 60 + Math.min(n, 8) * 2;
    [0, 4, 7, 12].forEach((iv, i) => this.osc({ type: 'sawtooth', f: mtof(root + iv), t: i * 0.03, dur: 0.2, vol: 0.05, lp: 2800 + i * 400, send: 0.4 }));
    this.noiseHit({ t: 0, dur: 0.15, vol: 0.04, type: 'bandpass', f: 800, f2: 4000, q: 1.2 });
  }

  miss() { this.osc({ type: 'sine', f: 330, f2: 250, dur: 0.22, vol: 0.07, send: 0.2 }); this.osc({ type: 'sine', f: 311, f2: 236, t: 0.04, dur: 0.22, vol: 0.05 }); }
  overloadVoid() {
    if (!this.ctx) return;
    this.osc({ type: 'sawtooth', f: 280, f2: 90, dur: 0.28, vol: 0.09, lp: 1200 });
    this.noiseHit({ dur: 0.2, vol: 0.05, type: 'lowpass', f: 2000, f2: 400 });
  }
  glitch() { for (let i = 0; i < 5; i++) this.osc({ type: 'square', f: 200 + Math.random() * 1600, t: i * 0.04, dur: 0.03, vol: 0.03, lp: 4000 }); this.noiseHit({ dur: 0.25, vol: 0.05, type: 'bandpass', f: 1200, f2: 300, q: 3 }); }
  drift() { for (let i = 0; i < 3; i++) this.osc({ type: 'triangle', f: 400 + i * 180, t: i * 0.05, dur: 0.08, vol: 0.035, send: 0.3 }); this.noiseHit({ dur: 0.18, vol: 0.035, type: 'bandpass', f: 900, f2: 2200, q: 2 }); }

  peek() { this.osc({ type: 'sine', f: 600, f2: 1800, dur: 0.35, vol: 0.06, send: 0.5 }); this.whoosh(0.04); }
  peekOverload() {
    if (!this.ctx) return;
    this.osc({ type: 'sawtooth', f: 180, f2: 720, dur: 0.22, vol: 0.1, lp: 2400, send: 0.25 });
    this.osc({ type: 'sine', f: 900, f2: 2200, t: 0.04, dur: 0.35, vol: 0.07, send: 0.55 });
    this.noiseHit({ dur: 0.2, vol: 0.06, type: 'highpass', f: 2500, f2: 7000 });
  }
  twin() { this.osc({ type: 'sine', f: 1400, f2: 900, dur: 0.12, vol: 0.04, send: 0.35 }); }

  clear() { this.levelUp(); [0, 4, 7, 11, 14].forEach((n, i) => this.osc({ type: 'sine', f: mtof(72 + n), t: 0.25 + i * 0.07, dur: 0.6, vol: 0.06, send: 0.5 })); }
  perfectClear() {
    if (!this.ctx) return;
    this.clear();
    [0, 4, 7, 12, 16, 19].forEach((n, i) => this.osc({ type: 'triangle', f: mtof(76 + n), t: 0.15 + i * 0.06, dur: 0.5, vol: 0.055, send: 0.55 }));
  }
  star(i) { this.osc({ type: 'triangle', f: mtof(76 + i * 4), dur: 0.3, vol: 0.09, send: 0.4 }); }
  modChime() { this.osc({ type: 'sine', f: 520, f2: 1040, dur: 0.25, vol: 0.05, send: 0.4 }); this.osc({ type: 'triangle', f: 780, t: 0.06, dur: 0.18, vol: 0.04 }); }

  startAmbient() {
    if (!this.ctx || this._amb) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.55;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    src.connect(bp); bp.connect(g); g.connect(this.sfx);
    src.start();
    g.gain.setTargetAtTime(0.016, ctx.currentTime, 0.9);
    this._amb = { src, g };
  }
  stopAmbient(fade = 0.5) {
    if (!this._amb) return;
    const { src, g } = this._amb;
    const t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(0.0001, t, fade / 3);
    setTimeout(() => { try { src.stop(); } catch (e) {} }, fade * 1000 + 200);
    this._amb = null;
  }

  startMusic() {
    super.startMusic();
    this.startAmbient();
  }
  stopMusic(fade = 0.5) {
    this.stopAmbient(fade);
    super.stopMusic(fade);
  }
}
