// 3D view: floating holo table + flip cards (neon back pattern / glowing icon front). Pure view driven by main.js.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { U } from 'cyber-kit/core/theme.js';
import { CARD_W, CARD_D, CARD_T, GAP, BOARD_Y, T_FLIP } from './config.js';
import { ICONS, iconTexture } from './icons.js';

const easeInOut = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const easeOutBack = k => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };

const FACE_VS = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SD = /* glsl */`float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q,0.0)) + min(max(q.x,q.y),0.0) - r; }`;
const BACK_FS = /* glsl */`
  uniform vec3 uC1, uC2, uC3; uniform float uTime, uHover, uGlow, uSeed, uDim; varying vec2 vUv;
  ${SD}
  void main(){
    vec2 p = (vUv - 0.5) * vec2(${CARD_W.toFixed(2)}, ${CARD_D.toFixed(2)});
    float d = sdRound(p, vec2(${(CARD_W / 2).toFixed(3)}, ${(CARD_D / 2).toFixed(3)}), 0.09);
    if (d > 0.0) discard;
    vec3 col = vec3(0.02, 0.012, 0.05);
    float border = exp(-abs(d + 0.035) * 70.0);
    col += mix(uC1, uC2, vUv.y) * border * (1.1 + uHover * 1.5 + uGlow);
    // diagonal hatch + circuit traces
    float hatch = step(0.86, fract((p.x + p.y) * 9.0));
    col += uC2 * hatch * 0.06 * smoothstep(-0.02, -0.12, d);
    vec2 g = abs(fract(p * 5.0 + uSeed) - 0.5);
    col += uC1 * smoothstep(0.03, 0.0, min(g.x, g.y)) * 0.05;
    // centre emblem: rotating diamond + ring
    vec2 q = p; float a = uTime * 0.6 + uSeed * 6.0; q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
    float dia = abs(abs(q.x) + abs(q.y) - 0.2);
    col += uC3 * exp(-dia * 60.0) * (0.9 + uHover);
    float ring = abs(length(p) - 0.31);
    col += uC1 * exp(-ring * 90.0) * 0.6;
    // scan sweep
    float sw = exp(-pow((vUv.y - fract(uTime * 0.25 + uSeed)) * 14.0, 2.0));
    col += mix(uC1, uC3, 0.5) * sw * 0.12;
    col += vec3(1.0) * uHover * 0.04;
    gl_FragColor = vec4(col * uDim, 1.0);
  }`;
const FRONT_FS = /* glsl */`
  uniform sampler2D uTex; uniform vec3 uColor; uniform float uTime, uGlow, uMatched, uMiss, uSeed; varying vec2 vUv;
  ${SD}
  void main(){
    vec2 uv = 1.0 - vUv;                                   // plane is flipped 180° by the card rotation
    vec2 p = (uv - 0.5) * vec2(${CARD_W.toFixed(2)}, ${CARD_D.toFixed(2)});
    float d = sdRound(p, vec2(${(CARD_W / 2).toFixed(3)}, ${(CARD_D / 2).toFixed(3)}), 0.09);
    if (d > 0.0) discard;
    vec3 tint = mix(uColor, vec3(1.0, 0.15, 0.25), uMiss);
    vec3 col = mix(vec3(0.03, 0.02, 0.07), tint * 0.12, smoothstep(0.7, 0.0, length(p)));
    float border = exp(-abs(d + 0.035) * 70.0);
    col += tint * border * (1.3 + uMatched * 1.2 + uGlow * 2.0);
    // icon (square, centred)
    vec2 iu = (p / ${(CARD_W * 0.86).toFixed(3)}) + 0.5;
    if (iu.x > 0.0 && iu.x < 1.0 && iu.y > 0.0 && iu.y < 1.0) { vec4 t = texture2D(uTex, iu); col = mix(col, t.rgb * (1.15 + uGlow + uMatched * 0.3), t.a); }
    float sw = exp(-pow((uv.y - fract(uTime * 0.5 + uSeed)) * 18.0, 2.0)) * uMatched;
    col += tint * sw * 0.25;
    col += vec3(1.0) * uGlow * 0.12;
    gl_FragColor = vec4(col, 1.0);
  }`;

class CardView {
  constructor(parent, geos) {
    this.group = new THREE.Group(); this.flipper = new THREE.Group(); this.group.add(this.flipper);
    this.body = new THREE.Mesh(geos.body, geos.bodyMat); this.flipper.add(this.body);
    this.backU = { uC1: U.uC1, uC2: U.uC2, uC3: U.uC3, uTime: U.uTime, uHover: { value: 0 }, uGlow: { value: 0 }, uSeed: { value: Math.random() }, uDim: { value: 1 } };
    this.back = new THREE.Mesh(geos.face, new THREE.ShaderMaterial({ uniforms: this.backU, vertexShader: FACE_VS, fragmentShader: BACK_FS }));
    this.back.rotation.x = -Math.PI / 2; this.back.position.y = CARD_T / 2 + 0.002;
    this.frontU = { uTex: { value: null }, uColor: { value: new THREE.Color() }, uTime: U.uTime, uGlow: { value: 0 }, uMatched: { value: 0 }, uMiss: { value: 0 }, uSeed: this.backU.uSeed };
    this.front = new THREE.Mesh(geos.face, new THREE.ShaderMaterial({ uniforms: this.frontU, vertexShader: FACE_VS, fragmentShader: FRONT_FS }));
    this.front.rotation.x = Math.PI / 2; this.front.position.y = -CARD_T / 2 - 0.002;
    this.flipper.add(this.back, this.front);
    this.body.userData.card = this; this.back.userData.card = this; this.front.userData.card = this;
    parent.add(this.group);
    this.angle = 0; this.flipFrom = 0; this.flipTo = 0; this.flipT = 1; this.flipDelay = 0; this.flipDir = 1;
    this.base = new THREE.Vector3(); this.moveFrom = null; this.moveT = 1;
    this.hover = 0; this.hoverTarget = 0; this.spin = 0; this.spinT = 1; this.shakeT = 1; this.lift = 0; this.matched = false;
  }
  setIcon(i) { this.icon = i; this.frontU.uTex.value = iconTexture(i); this.frontU.uColor.value.set(ICONS[i].color); }
}

export class CardTable {
  constructor(scene) {
    this.root = new THREE.Group(); scene.add(this.root);
    this.geos = {
      body: new RoundedBoxGeometry(CARD_W, CARD_T, CARD_D, 2, 0.03),
      bodyMat: new THREE.MeshStandardMaterial({ color: 0x0a0716, metalness: 0.8, roughness: 0.35 }),
      face: new THREE.PlaneGeometry(CARD_W, CARD_D),
    };
    this.views = []; this.byId = []; this.pickables = [];
    this.buildTable();
    this.cols = 4; this.rows = 2;
  }
  buildTable() {
    this.table = new THREE.Group(); this.root.add(this.table);
    this.slab = new THREE.Mesh(new RoundedBoxGeometry(1, 0.36, 1, 2, 0.06), new THREE.MeshStandardMaterial({ color: 0x07060f, metalness: 0.92, roughness: 0.3 }));
    this.slab.position.y = BOARD_Y - 0.2; this.table.add(this.slab);
    this.surfU = { uTime: U.uTime, uC1: U.uC1, uC2: U.uC2, uSize: { value: new THREE.Vector2(1, 1) }, uPulse: { value: new THREE.Vector4(0, 0, -100, 0) } };
    this.surf = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: this.surfU, vertexShader: FACE_VS,
      fragmentShader: /* glsl */`uniform float uTime; uniform vec3 uC1, uC2; uniform vec2 uSize; uniform vec4 uPulse; varying vec2 vUv;
        void main(){ vec2 p = (vUv - 0.5) * uSize; vec3 col = vec3(0.01, 0.008, 0.022);
          vec2 g = abs(fract(p * 2.0) - 0.5); col += uC1 * smoothstep(0.02, 0.0, min(g.x, g.y)) * 0.06;
          vec2 e = uSize * 0.5 - abs(p); float edge = min(e.x, e.y); col += mix(uC1, uC2, vUv.x) * exp(-edge * 18.0) * 0.5;
          float age = uTime - uPulse.z; if (age > 0.0 && age < 1.4) { float r = age * 6.0; float dd = length(p - uPulse.xy); col += uC2 * exp(-pow((dd - r) * 3.0, 2.0)) * (1.0 - age / 1.4) * uPulse.w * 0.6; }
          float sy = mod(uTime * 1.2, uSize.y + 4.0) - uSize.y * 0.5 - 2.0; col += uC1 * exp(-pow((p.y - sy) * 2.0, 2.0)) * 0.05;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    this.surf.rotation.x = -Math.PI / 2; this.surf.position.y = BOARD_Y + 0.001; this.table.add(this.surf);
    this.rimMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); this.rimMat2 = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.rims = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), i < 4 ? this.rimMat : this.rimMat2); this.table.add(m); this.rims.push(m); }
    this.nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); this.nodes = [];
    for (let i = 0; i < 4; i++) { const n = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), this.nodeMat); this.table.add(n); this.nodes.push(n); }
    // link beam drawn between a matched pair
    this.linkMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.link = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6, 1, true), this.linkMat); this.link.visible = false; this.root.add(this.link);
    this.linkT = 1;
  }
  /** grid size for current orientation */
  layout(long, short, portrait) {
    this.cols = portrait ? short : long; this.rows = portrait ? long : short;
    if (portrait && long === 4 && short === 2) { this.cols = 2; this.rows = 4; }
    const W = this.cols * CARD_W + (this.cols - 1) * GAP, D = this.rows * CARD_D + (this.rows - 1) * GAP;
    this.halfW = W / 2 + 0.45; this.halfD = D / 2 + 0.45;
    const hw = this.halfW, hd = this.halfD;
    this.slab.scale.set(hw * 2, 1, hd * 2); this.surf.scale.set(hw * 2 - 0.06, hd * 2 - 0.06, 1); this.surfU.uSize.value.set(hw * 2, hd * 2);
    const R = [[hw * 2, 0.04, 0.04, 0, -hd], [hw * 2, 0.04, 0.04, 0, hd], [0.04, 0.04, hd * 2, -hw, 0], [0.04, 0.04, hd * 2, hw, 0]];
    R.forEach(([sx, sy, sz, x, z], i) => { this.rims[i].scale.set(sx, sy, sz); this.rims[i].position.set(x, BOARD_Y + 0.01, z); this.rims[i + 4].scale.set(sx * 1.01, 0.025, sz * 1.01); this.rims[i + 4].position.set(x * 1.01, BOARD_Y - 0.37, z * 1.01); });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) => this.nodes[i].position.set(sx * (hw + 0.22), BOARD_Y + 0.1, sz * (hd + 0.22)));
    return { halfW: hw, halfD: hd };
  }
  slotPos(slot, out = new THREE.Vector3()) {
    const c = slot % this.cols, r = Math.floor(slot / this.cols);
    return out.set((c - (this.cols - 1) / 2) * (CARD_W + GAP), BOARD_Y + CARD_T / 2 + 0.02, (r - (this.rows - 1) / 2) * (CARD_D + GAP));
  }
  /** (re)build for a new level. faceUp = start revealed (preview) */
  setup(game, portrait, faceUp = false) {
    const ext = this.layout(game.long, game.short, portrait);
    while (this.views.length < game.cards.length) this.views.push(new CardView(this.root, this.geos));
    this.byId = []; this.pickables = [];
    this.views.forEach((v, i) => {
      const c = game.cards[i];
      v.group.visible = !!c; if (!c) return;
      v.id = c.id; v.setIcon(c.icon); v.matched = false;
      this.slotPos(c.slot, v.base); v.group.position.copy(v.base);
      v.angle = v.flipFrom = v.flipTo = faceUp ? Math.PI : 0; v.flipT = 1; v.flipper.rotation.set(0, 0, v.angle);
      v.frontU.uMatched.value = 0; v.frontU.uGlow.value = 0; v.frontU.uMiss.value = 0; v.backU.uDim.value = 1;
      v.spinT = 1; v.shakeT = 1; v.lift = 0; v.moveT = 1; v.group.rotation.set(0, 0, 0); v.group.scale.setScalar(1);
      // drop-in entrance
      v.enterT = -i * 0.03; v.group.position.y = v.base.y + 3;
      this.byId[c.id] = v; this.pickables.push(v.body, v.back, v.front);
    });
    return ext;
  }
  /** re-layout after orientation change (cards glide) */
  relayout(game, portrait) {
    const ext = this.layout(game.long, game.short, portrait);
    for (const c of game.cards) { const v = this.byId[c.id]; v.moveFrom = v.group.position.clone(); this.slotPos(c.slot, v.base); v.moveT = 0; }
    return ext;
  }
  flip(id, up, delay = 0) {
    const v = this.byId[id]; if (!v) return;
    v.flipFrom = v.angle; v.flipTo = up ? Math.PI : 0; v.flipT = 0; v.flipDelay = delay;
  }
  flipAll(game, up, stagger = 0.02) {
    game.cards.forEach((c, i) => { if (c.state === 'down') this.flip(c.id, up, i * stagger); });
  }
  match(ids, color) {
    const [a, b] = ids.map(i => this.byId[i]);
    for (const v of [a, b]) { v.matched = true; v.spinT = 0; v.frontU.uGlow.value = 0.7; }
    this.link.visible = true; this.linkT = 0; this.linkMat.color.set(color).multiplyScalar(3);
    this.linkA = a; this.linkB = b;
  }
  miss(ids) { for (const i of ids) { const v = this.byId[i]; v.shakeT = 0; } }
  swap(ids) {
    for (const i of ids) { const v = this.byId[i]; v.moveFrom = v.group.position.clone(); v.moveT = 0; v.glitch = 1; }
  }
  resyncSlots(game) { for (const c of game.cards) this.slotPos(c.slot, this.byId[c.id].base); }
  setHover(id) { for (const v of this.views) v.hoverTarget = v.id === id && v.group.visible ? 1 : 0; }
  pick(raycaster) {
    const hit = raycaster.intersectObjects(this.pickables, false)[0];
    return hit ? hit.object.userData.card.id : -1;
  }
  pulse(x, z, s = 1) { this.surfU.uPulse.value.set(x, -z, U.uTime.value, s); }
  celebrate() { this.views.forEach((v, i) => { if (v.group.visible) { v.spinT = -i * 0.04; v.frontU.uGlow.value = 1; } }); }
  get busy() { return this.views.some(v => v.group.visible && (v.flipT < 1 || v.moveT < 1)); }
  worldPos(id) { const v = this.byId[id]; return v ? v.group.position.clone() : new THREE.Vector3(); }

  update(dt, t) {
    for (const v of this.views) {
      if (!v.group.visible) continue;
      // entrance drop
      let y = v.base.y;
      if (v.enterT !== undefined && v.enterT < 1) { v.enterT += dt * 2.6; const k = Math.max(0, Math.min(1, v.enterT)); y += (1 - easeOutBack(k)) * 3; if (v.enterT >= 1) v.enterT = 1; }
      // flip
      let lift = 0;
      if (v.flipT < 1) {
        if (v.flipDelay > 0) v.flipDelay -= dt;
        else { v.flipT = Math.min(1, v.flipT + dt / T_FLIP); const k = easeInOut(v.flipT); v.angle = v.flipFrom + (v.flipTo - v.flipFrom) * k; lift = Math.sin(v.flipT * Math.PI) * 0.45; }
      }
      v.flipper.rotation.z = v.angle;
      // slot move (swap / relayout) with arc
      const pos = v.group.position;
      if (v.moveT < 1) {
        v.moveT = Math.min(1, v.moveT + dt / 0.55); const k = easeInOut(v.moveT);
        pos.lerpVectors(v.moveFrom, v.base, k); y += Math.sin(v.moveT * Math.PI) * 1.2;
        if (v.glitch) { pos.x += (Math.random() - 0.5) * 0.08 * v.glitch; v.glitch = v.moveT < 1 ? 1 : 0; }
      } else { pos.x = v.base.x; pos.z = v.base.z; }
      // match spin + rise
      let spinY = 0, s = 1;
      if (v.spinT < 1) {
        v.spinT += dt / 0.7; const k = Math.max(0, Math.min(1, v.spinT));
        spinY = easeInOut(k) * Math.PI * 2; lift += Math.sin(k * Math.PI) * 0.9; s = 1 + Math.sin(k * Math.PI) * 0.12;
      }
      v.group.rotation.y = spinY;
      // miss shake
      if (v.shakeT < 1) { v.shakeT += dt / 0.45; const k = Math.min(1, v.shakeT); pos.x = v.base.x + Math.sin(k * 40) * 0.07 * (1 - k); v.frontU.uMiss.value = Math.sin(k * Math.PI); }
      else v.frontU.uMiss.value = 0;
      // hover
      v.hover += (v.hoverTarget - v.hover) * Math.min(1, dt * 12);
      v.backU.uHover.value = v.hover;
      y += lift + v.hover * 0.12 + (v.matched ? -0.02 : Math.sin(t * 1.6 + v.backU.uSeed.value * 6) * 0.025);
      pos.y = y; v.group.scale.setScalar(s * (1 + v.hover * 0.04));
      v.frontU.uGlow.value = Math.max(0, v.frontU.uGlow.value - dt * 1.6);
      v.frontU.uMatched.value += ((v.matched ? 1 : 0) - v.frontU.uMatched.value) * Math.min(1, dt * 4);
    }
    // link beam between last matched pair
    if (this.link.visible) {
      this.linkT += dt / 0.8; const a = this.linkA.group.position, b = this.linkB.group.position;
      this.link.position.copy(a).add(b).multiplyScalar(0.5); this.link.position.y += 0.1;
      const len = a.distanceTo(b); this.link.scale.set(1 + (1 - this.linkT) * 2, len, 1 + (1 - this.linkT) * 2);
      this.link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      this.linkMat.opacity = Math.max(0, Math.sin(Math.min(1, this.linkT) * Math.PI));
      if (this.linkT >= 1) this.link.visible = false;
    }
    this.rimMat.color.copy(U.uC1.value).multiplyScalar(1.5);
    this.rimMat2.color.copy(U.uC2.value).multiplyScalar(1.2);
    this.nodeMat.color.copy(U.uC3.value).multiplyScalar(Math.sin(t * 3) > 0 ? 3 : 1.2);
    for (const n of this.nodes) n.rotation.y = t * 1.5;
  }
}
