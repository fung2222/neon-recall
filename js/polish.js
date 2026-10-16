// Feel helpers for the polish pass: combo aura, echo hint, flip trail particles.
import * as THREE from 'three';
import { BOARD_Y, ECHO_FADE } from './config.js';

/** Expanding combo glow disc under a match midpoint. */
export class ComboAura {
  constructor(scene) {
    const geo = new THREE.RingGeometry(0.45, 0.78, 48);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.t = 0; this.power = 0;
  }
  pulse(x, z, power = 1) {
    this.mesh.position.set(x, BOARD_Y + 0.04, z);
    this.power = Math.max(this.power, power);
    this.t = 0; this.mesh.visible = true;
  }
  update(dt, color) {
    if (this.power <= 0) { this.mesh.visible = false; return; }
    this.t += dt;
    const k = Math.min(1, this.t / 0.55);
    const s = 1 + k * (0.9 + this.power * 0.4);
    this.mesh.scale.setScalar(s);
    if (color) this.mat.color.copy(color);
    this.mat.opacity = (1 - k) * (0.38 + this.power * 0.18);
    if (k >= 1) { this.power *= 0.35; this.t = 0; if (this.power < 0.15) { this.power = 0; this.mesh.visible = false; } }
  }
}

/** Soft residual glow after a miss — remembers the colour of the cards you just saw. Persist toggle. */
export class EchoHint {
  constructor() {
    this.enabled = true;
    try { if (localStorage.getItem('cyber.neon-recall.echoHint') === '0') this.enabled = false; } catch (e) { /* ignore */ }
  }
  setEnabled(on) {
    this.enabled = !!on;
    try { localStorage.setItem('cyber.neon-recall.echoHint', on ? '1' : '0'); } catch (e) { /* ignore */ }
  }
  toggle() { this.setEnabled(!this.enabled); return this.enabled; }
}

/** Short additive streak opposite the flip lift (memory analogue of snake turn trail). */
export function flipTrail(particles, pos, color, count = 14) {
  const v = new THREE.Vector3(), p = new THREE.Vector3();
  for (let n = 0; n < count; n++) {
    const t = n / count;
    p.set(pos.x + (Math.random() - 0.5) * 0.2, pos.y + 0.1 + t * 0.35, pos.z + (Math.random() - 0.5) * 0.2);
    v.set((Math.random() - 0.5) * 1.2, 2.5 + Math.random() * 2.5, (Math.random() - 0.5) * 1.2);
    particles.emit(p, v, color, { life: 0.22 + Math.random() * 0.18, size: 0.5 + Math.random() * 0.35, grav: -2, drag: 2.2, bright: 3.2 });
  }
}

export { ECHO_FADE };
