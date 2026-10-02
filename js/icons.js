// 16 original neon line icons drawn on canvas (no fonts / emoji / third-party art). Each -> CanvasTexture.
import * as THREE from 'three';

export const ICONS = [
  { id: 'chip', zh: '晶片', color: '#00e5ff' }, { id: 'bolt', zh: '閃電', color: '#fff35c' },
  { id: 'eye', zh: '電子眼', color: '#ff2bd6' }, { id: 'cat', zh: '機械貓', color: '#ff9a2b' },
  { id: 'lantern', zh: '燈籠', color: '#ff3b5c' }, { id: 'ramen', zh: '拉麵', color: '#ffc22b' },
  { id: 'rocket', zh: '火箭', color: '#4d8bff' }, { id: 'heart', zh: '霓虹心', color: '#ff5fa8' },
  { id: 'planet', zh: '行星', color: '#a66bff' }, { id: 'crystal', zh: '水晶', color: '#3bffe0' },
  { id: 'key', zh: '密鑰', color: '#b6ff3b' }, { id: 'note', zh: '音符', color: '#5cffa1' },
  { id: 'moon', zh: '月亮', color: '#ffe9a8' }, { id: 'drone', zh: '無人機', color: '#2bd8ff' },
  { id: 'tram', zh: '叮叮', color: '#3bff6b' }, { id: 'umbrella', zh: '雨傘', color: '#d36bff' },
];

const P = Math.PI;
const draw = {
  chip(c) { c.strokeRect(78, 78, 100, 100); c.strokeRect(104, 104, 48, 48); for (let i = 0; i < 4; i++) { const o = 92 + i * 24; for (const [x1, y1, x2, y2] of [[o, 78, o, 50], [o, 178, o, 206], [78, o, 50, o], [178, o, 206, o]]) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); } } },
  bolt(c) { c.beginPath(); c.moveTo(146, 40); c.lineTo(84, 140); c.lineTo(128, 140); c.lineTo(108, 216); c.lineTo(176, 108); c.lineTo(132, 108); c.closePath(); c.stroke(); },
  eye(c) { c.beginPath(); c.moveTo(40, 128); c.quadraticCurveTo(128, 40, 216, 128); c.quadraticCurveTo(128, 216, 40, 128); c.stroke(); c.beginPath(); c.arc(128, 128, 30, 0, 2 * P); c.stroke(); c.beginPath(); c.arc(128, 128, 10, 0, 2 * P); c.fill(); },
  cat(c) { c.beginPath(); c.moveTo(62, 200); c.lineTo(62, 92); c.lineTo(80, 52); c.lineTo(108, 84); c.lineTo(148, 84); c.lineTo(176, 52); c.lineTo(194, 92); c.lineTo(194, 200); c.closePath(); c.stroke(); c.strokeRect(92, 120, 22, 14); c.strokeRect(142, 120, 22, 14); c.beginPath(); c.moveTo(118, 160); c.lineTo(128, 170); c.lineTo(138, 160); c.stroke(); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(128 + s * 40, 168); c.lineTo(128 + s * 84, 160); c.moveTo(128 + s * 40, 178); c.lineTo(128 + s * 84, 184); c.stroke(); } },
  lantern(c) { c.beginPath(); c.ellipse(128, 132, 58, 70, 0, 0, 2 * P); c.stroke(); c.strokeRect(104, 52, 48, 12); c.strokeRect(104, 200, 48, 12); c.beginPath(); c.ellipse(128, 132, 26, 70, 0, 0, 2 * P); c.stroke(); c.beginPath(); c.moveTo(128, 212); c.lineTo(128, 236); c.moveTo(128, 30); c.lineTo(128, 52); c.stroke(); },
  ramen(c) { c.beginPath(); c.moveTo(44, 124); c.lineTo(212, 124); c.quadraticCurveTo(206, 206, 128, 206); c.quadraticCurveTo(50, 206, 44, 124); c.stroke(); c.beginPath(); c.moveTo(150, 30); c.lineTo(110, 118); c.moveTo(180, 40); c.lineTo(130, 118); c.stroke(); for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(70 + i * 26, 110); c.bezierCurveTo(60 + i * 26, 90, 84 + i * 26, 80, 72 + i * 26, 60); c.stroke(); } },
  rocket(c) { c.beginPath(); c.moveTo(128, 30); c.quadraticCurveTo(178, 80, 164, 170); c.lineTo(92, 170); c.quadraticCurveTo(78, 80, 128, 30); c.stroke(); c.beginPath(); c.arc(128, 104, 18, 0, 2 * P); c.stroke(); c.beginPath(); c.moveTo(92, 140); c.lineTo(62, 190); c.lineTo(96, 176); c.moveTo(164, 140); c.lineTo(194, 190); c.lineTo(160, 176); c.moveTo(112, 184); c.lineTo(128, 224); c.lineTo(144, 184); c.stroke(); },
  heart(c) { c.beginPath(); c.moveTo(128, 206); c.bezierCurveTo(30, 140, 50, 50, 128, 92); c.bezierCurveTo(206, 50, 226, 140, 128, 206); c.stroke(); c.beginPath(); c.moveTo(70, 132); c.lineTo(104, 132); c.lineTo(116, 108); c.lineTo(134, 156); c.lineTo(146, 132); c.lineTo(186, 132); c.stroke(); },
  planet(c) { c.beginPath(); c.arc(128, 128, 50, 0, 2 * P); c.stroke(); c.beginPath(); c.ellipse(128, 128, 104, 30, -0.35, 0.15 * P, 0.95 * P, true); c.stroke(); c.beginPath(); c.arc(196, 62, 8, 0, 2 * P); c.fill(); },
  crystal(c) { c.beginPath(); c.moveTo(128, 30); c.lineTo(190, 100); c.lineTo(128, 226); c.lineTo(66, 100); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(66, 100); c.lineTo(190, 100); c.moveTo(104, 100); c.lineTo(128, 30); c.lineTo(152, 100); c.lineTo(128, 226); c.lineTo(104, 100); c.stroke(); },
  key(c) { c.beginPath(); c.arc(86, 128, 36, 0, 2 * P); c.stroke(); c.beginPath(); c.arc(86, 128, 12, 0, 2 * P); c.stroke(); c.beginPath(); c.moveTo(122, 128); c.lineTo(216, 128); c.moveTo(186, 128); c.lineTo(186, 160); c.moveTo(208, 128); c.lineTo(208, 150); c.stroke(); },
  note(c) { c.beginPath(); c.ellipse(90, 182, 26, 18, -0.4, 0, 2 * P); c.stroke(); c.beginPath(); c.ellipse(178, 160, 26, 18, -0.4, 0, 2 * P); c.stroke(); c.beginPath(); c.moveTo(114, 176); c.lineTo(114, 56); c.lineTo(202, 36); c.lineTo(202, 154); c.moveTo(114, 86); c.lineTo(202, 66); c.stroke(); },
  moon(c) { c.beginPath(); c.arc(128, 128, 76, 0.35 * P, 1.65 * P); c.arc(160, 116, 58, 1.45 * P, 0.62 * P, true); c.stroke(); for (const [x, y] of [[190, 52], [208, 92]]) { c.beginPath(); c.moveTo(x, y - 12); c.lineTo(x, y + 12); c.moveTo(x - 12, y); c.lineTo(x + 12, y); c.stroke(); } },
  drone(c) { c.strokeRect(100, 112, 56, 32); for (const [x, y] of [[62, 82], [194, 82], [62, 174], [194, 174]]) { c.beginPath(); c.ellipse(x, y, 30, 9, 0, 0, 2 * P); c.stroke(); c.beginPath(); c.moveTo(x, y); c.lineTo(x < 128 ? 100 : 156, y < 128 ? 112 : 144); c.stroke(); } c.beginPath(); c.arc(128, 128, 6, 0, 2 * P); c.fill(); },
  tram(c) { c.strokeRect(64, 64, 128, 132); c.beginPath(); c.moveTo(64, 112); c.lineTo(192, 112); c.moveTo(64, 160); c.lineTo(192, 160); c.moveTo(106, 64); c.lineTo(106, 112); c.moveTo(150, 64); c.lineTo(150, 112); c.moveTo(128, 64); c.lineTo(128, 34); c.lineTo(168, 20); c.stroke(); for (const x of [92, 164]) { c.beginPath(); c.arc(x, 212, 12, 0, 2 * P); c.stroke(); } },
  umbrella(c) { c.beginPath(); c.moveTo(36, 120); c.quadraticCurveTo(128, 10, 220, 120); c.quadraticCurveTo(197, 104, 174, 120); c.quadraticCurveTo(151, 104, 128, 120); c.quadraticCurveTo(105, 104, 82, 120); c.quadraticCurveTo(59, 104, 36, 120); c.stroke(); c.beginPath(); c.moveTo(128, 120); c.lineTo(128, 204); c.arc(110, 204, 18, 0, P); c.stroke(); for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(60 + i * 46, 160 + (i % 2) * 20); c.lineTo(52 + i * 46, 182 + (i % 2) * 20); c.stroke(); } },
};

const cache = new Map();
export function iconTexture(i) {
  if (cache.has(i)) return cache.get(i);
  const ic = ICONS[i], cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const c = cv.getContext('2d');
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const [w, blur, col, a] of [[16, 26, ic.color, 0.55], [9, 10, ic.color, 1], [3.5, 0, '#ffffff', 0.95]]) {
    c.save(); c.globalAlpha = a; c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w; c.shadowColor = ic.color; c.shadowBlur = blur;
    draw[ic.id](c); c.restore();
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  cache.set(i, tex); return tex;
}
