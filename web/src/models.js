// Alle 3D-Modelle, aus Grundformen zusammengesetzt (Maße wie in der Unity-Fassung).
import { T } from './game.js';
import { frustum } from './geo.js';
const FR55 = frustum(0.55);

export const C = {
  sand: [0.62, 0.57, 0.47], wetSand: [0.42, 0.39, 0.33], plank: [0.52, 0.4, 0.27], drift: [0.62, 0.56, 0.48],
  tar: [0.16, 0.13, 0.11], wall: [0.36, 0.42, 0.44], wallBlue: [0.25, 0.38, 0.5], reed: [0.72, 0.62, 0.38],
  rust: [0.5, 0.28, 0.18], window: [1, 0.72, 0.38], white: [0.92, 0.92, 0.88], red: [0.7, 0.16, 0.13],
  dark: [0.12, 0.13, 0.15], roofGrey: [0.3, 0.3, 0.32],
};

/// Hütte mit Reetdach, Eckbalken, Tür (+z) und runden Fenstern
function hut(B, p, w, h, d, wall, roof, windows, door = true) {
  B.add('cube', [p[0], p[1] + h / 2, p[2]], [w, h, d], wall, { g: 0.12 });
  for (let i = 0; i < 4; i++) {
    const sx = i & 1 ? w / 2 : -w / 2, sz = i & 2 ? d / 2 : -d / 2;
    B.add('cube', [p[0] + sx, p[1] + h / 2, p[2] + sz], [0.18, h, 0.18], C.tar, { g: 0.2 });
  }
  B.add('prism', [p[0], p[1] + h, p[2]], [w * 1.22, h * 0.8, d * 1.15], roof, { g: 0.05 });
  // Dachfirst
  B.add('cube', [p[0], p[1] + h + h * 0.8, p[2]], [0.22, 0.16, d * 1.17], C.tar, { g: 0.2 });
  const fz = p[2] + d / 2 + 0.04;
  if (door) B.add('cube', [p[0], p[1] + 0.6, fz], [0.75, 1.2, 0.08], C.tar);
  for (let i = 0; i < windows; i++) {
    const t = windows === 1 ? 0.5 : i / (windows - 1);
    let x = -w * 0.32 + (w * 0.64) * t;
    if (door && Math.abs(x) < 0.65) x += x >= 0 ? 0.75 : -0.75;
    B.add('cylinder', [p[0] + x, p[1] + h * 0.6, fz], [0.55, 0.04, 0.55], C.tar, { rot: [90, 0, 0] });
    B.add('cylinder', [p[0] + x, p[1] + h * 0.6, fz + 0.02], [0.42, 0.04, 0.42], C.window, { rot: [90, 0, 0], e: 1.8 });
  }
}

function barrel(B, p) {
  B.add('cylinder', [p[0], p[1] + 0.45, p[2]], [0.6, 0.45, 0.6], C.plank, { g: 0.2 });
  B.add('cylinder', [p[0], p[1] + 0.7, p[2]], [0.63, 0.03, 0.63], C.tar, { g: 0.4 });
  B.add('cylinder', [p[0], p[1] + 0.2, p[2]], [0.63, 0.03, 0.63], C.tar, { g: 0.4 });
}

export function building(B, t, level) {
  const sc = 1 + 0.06 * Math.min(level - 1, 9) + 0.012 * Math.max(0, level - 10);
  B.push([0, 0, 0], null, [sc, sc, sc]);
  switch (t) {
    case T.TREIBHOLZ:
      hut(B, [0.9, 0, -0.6], 3, 2.1, 2.6, C.wall, C.reed, 2);
      for (let i = 0; i < 7; i++) {
        const row = i < 4 ? 0 : 1, z = -1.5 + (i % 4) * 0.5 + row * 0.25;
        B.add('cylinder', [-2.3, 0.25 + row * 0.42, z], [0.45, 1.0 + (i % 3) * 0.15, 0.45], C.drift, { rot: [0, 8 * (i % 3), 90], g: 0.1 });
      }
      B.add('cube', [-3.2, 2.2, -2.6], [0.25, 4.4, 0.25], C.tar);
      B.add('cube', [-3.2, 4.3, -3.8], [0.2, 0.2, 2.6], C.tar);
      B.add('sphere', [-3.2, 3.2, -4.9], [0.9, 1.2, 0.9], [0.3, 0.35, 0.28], { g: 0.05 });
      break;

    case T.MUSCHEL:
      hut(B, [-0.8, 0, -1], 2.6, 1.9, 2.4, C.wallBlue, C.reed, 1);
      for (let i = 0; i < 4; i++) {
        const x = -1.2 + (i % 2) * 2.4, z = -4.8 - Math.floor(i / 2) * 1.4;
        B.add('cylinder', [x, -1, z], [0.18, 3, 0.18], C.tar, { g: 0.3 });
        B.add('cylinder', [x, -0.9, z], [0.34, 1, 0.34], [0.12, 0.13, 0.2], { g: 0.7 });
      }
      B.add('cube', [0, 1.6, -4.8], [2.6, 0.06, 0.06], [0.65, 0.58, 0.42]);
      for (let i = 0; i < 3; i++) B.add('cylinder', [-2.6 + i * 0.9, 0.3, 1.9], [0.7, 0.3, 0.7], C.reed);
      break;

    case T.REGEN:
      B.add('cone', [0, 4.6, 0], [4.2, 2.2, 4.2], [0.86, 0.83, 0.74], { rot: [180, 0, 0], g: 0.1 });
      for (let i = 0; i < 3; i++) {
        const a = (i * 120 * Math.PI) / 180;
        B.add('cube', [Math.cos(a) * 1.7, 2.2, Math.sin(a) * 1.7], [0.2, 4.6, 0.2], C.tar);
      }
      B.add('cylinder', [0, 1.1, 0], [1.8, 1.1, 1.8], C.plank, { g: 0.25 });
      B.add('cylinder', [0, 2.25, 0], [0.25, 0.2, 0.25], C.rust, { g: 0.5 });
      barrel(B, [2.4, 0, 1.6]); barrel(B, [2.4, 0, 0.7]); barrel(B, [-2.4, 0, 1.6]);
      break;

    case T.TAUCHER:
      hut(B, [1.2, 0, -0.6], 2.6, 2, 2.4, C.wall, C.roofGrey, 1);
      B.add('cube', [-2.2, 2.6, 0], [0.3, 5.2, 0.3], C.tar);
      B.add('cube', [-2.2, 5.1, -1.6], [0.25, 0.25, 3.4], C.tar);
      B.add('cube', [-2.2, 4.0, -3.2], [0.05, 2.2, 0.05], C.tar);
      B.add('sphere', [-2.2, 2.5, -3.2], [1.3, 1.4, 1.3], [0.55, 0.45, 0.25], { g: 0.75 });
      B.add('cylinder', [-2.2, 2.5, -3.85], [0.45, 0.03, 0.45], [0.5, 0.8, 1], { rot: [90, 0, 0], e: 1.2 });
      for (let i = 0; i < 5; i++)
        B.add('cube', [0.6 + i * 0.35, 0.25, 1.8 - (i % 2) * 0.4], [0.6, 0.4, 0.5], C.rust, { rot: [0, i * 23, i * 9], g: 0.4 });
      B.add('cube', [2.9, 0.9, 1.6], [0.15, 1.6, 0.15], C.tar, { g: 0.5 });
      B.add('cube', [2.9, 0.25, 1.6], [0.9, 0.15, 0.15], C.tar, { g: 0.5 });
      break;

    case T.HAUS:
      hut(B, [0, 0, -0.3], 5, 2.4, 3.2, C.wallBlue, C.reed, 4);
      B.add('cube', [1.6, 3.4, -0.8], [0.5, 1.6, 0.5], [0.5, 0.3, 0.25]);
      B.smoke([1.6, 4.3, -0.8], 0.6);
      B.add('cube', [-2.9, 1.1, 2.2], [0.12, 2.2, 0.12], C.tar);
      B.add('cube', [2.9, 1.1, 2.2], [0.12, 2.2, 0.12], C.tar);
      B.add('cube', [0, 2.1, 2.2], [5.8, 0.04, 0.04], C.reed);
      B.add('cube', [-1, 1.7, 2.2], [0.7, 0.8, 0.03], [0.8, 0.3, 0.25]);
      B.add('cube', [0.6, 1.75, 2.2], [0.6, 0.7, 0.03], [0.9, 0.85, 0.6]);
      break;

    case T.HEILER:
      hut(B, [0, 0, -0.3], 3.6, 2.4, 3, [0.82, 0.84, 0.8], C.reed, 2);
      B.add('sphere', [0, 2.0, 1.25], [0.55, 0.8, 0.06], [0.3, 0.95, 0.45], { rot: [0, 0, 35], e: 1.4 });
      for (let i = 0; i < 3; i++) {
        B.add('cube', [-1.4 + i * 1.4, 0.25, 2.2], [1.1, 0.5, 0.6], C.plank);
        B.add('sphere', [-1.4 + i * 1.4, 0.6, 2.2], [1, 0.5, 0.5], [0.25, 0.5, 0.25]);
      }
      break;

    case T.RAUCH:
      hut(B, [0.4, 0, -0.4], 3.2, 2.2, 2.8, [0.3, 0.26, 0.22], C.reed, 1);
      B.add('cube', [-0.6, 3.1, -0.9], [0.7, 1.8, 0.7], [0.45, 0.3, 0.24]);
      B.smoke([-0.6, 4.1, -0.9], 1);
      B.add('cube', [-2.4, 1, 1.2], [0.15, 2, 0.15], C.tar);
      B.add('cube', [-2.4, 1, -0.4], [0.15, 2, 0.15], C.tar);
      B.add('cube', [-2.4, 1.95, 0.4], [0.1, 0.1, 1.8], C.tar);
      for (let i = 0; i < 4; i++) B.add('sphere', [-2.4, 1.5, -0.2 + i * 0.4], [0.12, 0.7, 0.25], [0.75, 0.55, 0.3], { g: 0.5 });
      barrel(B, [2.4, 0, 1.5]);
      break;

    case T.KUECHE:
      hut(B, [0.6, 0, -0.6], 3.4, 2.2, 2.8, [0.55, 0.42, 0.3], C.reed, 2);
      B.add('cube', [-0.6, 3.2, -1.2], [0.7, 2.0, 0.7], [0.45, 0.3, 0.24]);
      B.smoke([-0.6, 4.3, -1.2], 0.9);
      // großer Kessel über offenem Feuer
      B.add('cylinder', [-2.2, 0.35, 1.6], [1.2, 0.08, 1.2], [0.3, 0.3, 0.32]);
      B.add('sphere', [-2.2, 0.85, 1.6], [1.1, 0.9, 1.1], [0.15, 0.15, 0.17], { g: 0.7 });
      B.add('cylinder', [-2.2, 1.2, 1.6], [0.9, 0.04, 0.9], [0.95, 0.6, 0.25], { e: 1.5 });
      B.add('cylinder', [-2.2, 0.15, 1.6], [0.8, 0.1, 0.8], [1, 0.45, 0.1], { e: 2.5 });
      B.smoke([-2.2, 1.4, 1.6], 0.4);
      for (let k = 0; k < 2; k++) B.add('cube', [-2.2 + (k ? 0.75 : -0.75), 0.9, 1.6], [0.08, 1.8, 0.08], C.tar);
      B.add('cube', [-2.2, 1.8, 1.6], [1.6, 0.06, 0.06], C.tar);
      // Tisch mit Bänken
      B.add('cube', [1.4, 0.75, 2.1], [2.2, 0.1, 0.9], C.plank);
      B.add('cube', [1.4, 0.4, 1.4], [2.2, 0.08, 0.35], C.plank);
      B.add('cube', [1.4, 0.4, 2.8], [2.2, 0.08, 0.35], C.plank);
      for (const x of [0.5, 2.3]) B.add('cube', [x, 0.35, 2.1], [0.1, 0.7, 0.7], C.tar);
      break;

    case T.KASERNE:
      hut(B, [0, 0, -0.9], 5.6, 2.5, 3.2, [0.4, 0.33, 0.28], [0.3, 0.3, 0.32], 3);
      // Fahne
      B.add('cylinder', [2.9, 3.2, 1.4], [0.08, 3.2, 0.08], C.tar);
      B.add('cube', [3.5, 5.6, 1.4], [1.2, 0.75, 0.04], [0.15, 0.45, 0.6], { g: 0.2 });
      B.add('cube', [3.5, 5.6, 1.43], [0.5, 0.3, 0.02], [0.95, 0.85, 0.4]);
      // Harpunen-Ständer
      B.add('cube', [-2.2, 0.9, 1.8], [2.0, 0.1, 0.1], C.tar);
      for (let k = 0; k < 6; k++) {
        B.add('cube', [-3.0 + k * 0.32, 1.1, 1.75], [0.05, 2.2, 0.05], [0.55, 0.45, 0.3], { rot: [8, 0, 0] });
        B.add('cone', [-3.0 + k * 0.32, 2.2, 1.9], [0.12, 0.35, 0.12], [0.7, 0.72, 0.75], { g: 0.7 });
      }
      // Übungspuppe
      B.add('cylinder', [1.4, 0.9, 2.2], [0.1, 0.9, 0.1], C.tar);
      B.add('cylinder', [1.4, 1.4, 2.2], [0.5, 0.45, 0.5], C.reed);
      B.add('sphere', [1.4, 2.1, 2.2], [0.4, 0.4, 0.4], C.reed);
      break;

    case T.HARPHOF: {
      hut(B, [0, 0, -1.2], 4.2, 2.3, 2.6, [0.45, 0.36, 0.26], C.reed, 2);
      for (let k = 0; k < 8; k++) {
        B.add('cube', [-2.4 + k * 0.6, 1.1, 1.3], [0.06, 2.2, 0.06], [0.55, 0.45, 0.3], { rot: [10, 0, 0] });
        B.add('cone', [-2.4 + k * 0.6, 2.25, 1.5], [0.14, 0.4, 0.14], [0.72, 0.74, 0.78], { g: 0.8 });
      }
      B.add('cube', [0, 0.8, 1.2], [5, 0.1, 0.1], C.tar);
      B.add('cylinder', [2.6, 1.2, 2.4], [0.7, 0.05, 0.7], [0.85, 0.2, 0.15], { rot: [90, 0, 0] });
      B.add('cylinder', [2.6, 1.2, 2.42], [0.35, 0.06, 0.35], C.white, { rot: [90, 0, 0] });
      B.add('cylinder', [2.6, 0.6, 2.35], [0.06, 0.6, 0.06], C.tar);
      break;
    }
    case T.WACHSTUBE: {
      hut(B, [0, 0, -0.8], 4.6, 2.6, 3, [0.5, 0.5, 0.5], C.roofGrey, 2);
      for (let k = 0; k < 4; k++) {
        B.add('cylinder', [-1.8 + k * 1.2, 1.3, 0.75], [0.8, 0.06, 0.8], k % 2 ? [0.2, 0.35, 0.6] : [0.7, 0.2, 0.15], { rot: [90, 0, 0], g: 0.4 });
        B.add('sphere', [-1.8 + k * 1.2, 1.3, 0.8], [0.15, 0.15, 0.1], [0.85, 0.75, 0.4], { g: 0.7 });
      }
      B.add('cube', [0, 0.05, 2.2], [4.6, 0.1, 1.6], [0.6, 0.55, 0.45]);
      break;
    }
    case T.ENTERHALLE: {
      hut(B, [0, 0, -1], 6, 2.4, 2.6, [0.38, 0.3, 0.24], [0.35, 0.25, 0.2], 3);
      for (let k = 0; k < 3; k++) B.add('cube', [-2 + k * 2, 1.6, 1.4], [0.12, 3.2, 0.12], C.tar);
      B.add('cube', [0, 3.15, 1.4], [4.4, 0.12, 0.12], C.tar);
      for (let k = 0; k < 7; k++) B.add('cube', [-1.8 + k * 0.6, 1.8, 1.45], [0.03, 2.6, 0.03], [0.75, 0.65, 0.45]);
      for (let k = 0; k < 4; k++) B.add('cube', [0, 0.8 + k * 0.7, 1.45], [4, 0.03, 0.03], [0.75, 0.65, 0.45]);
      B.add('cube', [2.6, 0.5, 2.4], [0.5, 1, 0.08], [0.6, 0.62, 0.66], { g: 0.7 });
      break;
    }
    case T.SCHLEUDER: {
      B.add('cube', [0, 0.1, 0], [5.4, 0.2, 5.4], [0.55, 0.48, 0.36]);
      B.add('cube', [0, 0.6, 0], [2.4, 0.8, 1.6], [0.45, 0.34, 0.22]);
      B.add('cube', [-0.9, 1.6, 0], [0.2, 1.6, 0.2], C.tar); B.add('cube', [0.9, 1.6, 0], [0.2, 1.6, 0.2], C.tar);
      B.add('cube', [0, 2.3, 0], [2, 0.18, 0.18], C.tar);
      B.add('cube', [0, 2.6, 0.6], [0.18, 3.4, 0.18], [0.6, 0.48, 0.3], { rot: [-35, 0, 0] });
      B.add('sphere', [0, 3.9, 1.7], [0.45, 0.3, 0.45], [0.35, 0.3, 0.25]);
      for (let k = 0; k < 6; k++) B.add('sphere', [1.8 + (k % 3) * 0.45, 0.45, -1.6 + Math.floor(k / 3) * 0.45], [0.35, 0.35, 0.35], [0.5, 0.5, 0.48]);
      hut(B, [-1.6, 0, -1.8], 2, 1.8, 1.6, C.wall, C.reed, 1, false);
      break;
    }
    case T.WATTHUETTE: {
      hut(B, [0.4, 0, -0.9], 3.6, 2.1, 2.6, C.wallBlue, C.reed, 2);
      for (let k = 0; k < 5; k++) B.add('cube', [-2.6 + k * 0.3, 0.45, 1.5], [0.18, 0.9, 0.3], [0.2, 0.25, 0.2]);
      B.add('cube', [0, 0.15, 2.3], [5, 0.12, 0.8], C.plank);
      B.add('cylinder', [2.5, 2, 1.9], [0.07, 2, 0.07], C.tar);
      B.add('cube', [2.95, 3.5, 1.9], [0.9, 0.5, 0.03], [0.95, 0.75, 0.2]);
      break;
    }
    case T.LAZARETT: {
      hut(B, [0, 0, -0.6], 5.2, 2.4, 3.2, [0.92, 0.92, 0.88], [0.55, 0.2, 0.18], 3);
      B.add('cube', [0, 2.0, 1.02], [0.9, 0.25, 0.03], [0.85, 0.12, 0.12]);
      B.add('cube', [0, 2.0, 1.02], [0.25, 0.9, 0.03], [0.85, 0.12, 0.12]);
      for (let k = 0; k < 2; k++) {
        B.add('cube', [-1.6 + k * 3.2, 0.35, 2.0], [0.9, 0.3, 1.8], [0.5, 0.38, 0.25]);
        B.add('cube', [-1.6 + k * 3.2, 0.55, 2.0], [0.85, 0.12, 1.7], [0.95, 0.95, 0.95]);
        B.add('cube', [-1.6 + k * 3.2, 0.66, 1.3], [0.6, 0.12, 0.3], [0.9, 0.9, 0.85]);
      }
      B.add('cylinder', [2.7, 1.6, 0.9], [0.07, 1.6, 0.07], C.tar);
      B.add('cube', [3.1, 2.9, 0.9], [0.8, 0.55, 0.03], [0.95, 0.95, 0.95]);
      B.add('cube', [3.1, 2.9, 0.92], [0.4, 0.12, 0.02], [0.85, 0.12, 0.12]); B.add('cube', [3.1, 2.9, 0.92], [0.12, 0.4, 0.02], [0.85, 0.12, 0.12]);
      break;
    }
    case T.WACHTURM: {
      const H = 7;
      for (let i = 0; i < 4; i++) {
        const sx = i & 1 ? 1.3 : -1.3, sz = i & 2 ? 1.3 : -1.3;
        B.add('cube', [sx, H / 2, sz], [0.25, H, 0.25], C.tar, { g: 0.3 });
      }
      for (let k = 1; k <= 3; k++) {
        const y = (H / 4) * k;
        B.add('cube', [0, y, -1.3], [2.8, 0.12, 0.12], C.plank, { rot: [0, 0, k % 2 ? 25 : -25] });
        B.add('cube', [0, y, 1.3], [2.8, 0.12, 0.12], C.plank, { rot: [0, 0, k % 2 ? -25 : 25] });
      }
      B.add('cube', [0, H, 0], [3.6, 0.25, 3.6], C.plank, { g: 0.2 });
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        B.add('cube', [Math.sin(a) * 1.75, H + 0.5, Math.cos(a) * 1.75], i % 2 ? [0.1, 0.8, 3.6] : [3.6, 0.8, 0.1], C.plank);
      }
      B.add('cube', [1.6, H + 1.6, 1.6], [0.1, 2.2, 0.1], C.tar);
      B.add('cube', [-1.6, H + 1.6, -1.6], [0.1, 2.2, 0.1], C.tar);
      B.add('cube', [1.6, H + 1.6, -1.6], [0.1, 2.2, 0.1], C.tar);
      B.add('cube', [-1.6, H + 1.6, 1.6], [0.1, 2.2, 0.1], C.tar);
      B.add('prism', [0, H + 2.7, 0], [4.2, 1.4, 4.2], C.reed, { g: 0.05 });
      B.add('cube', [0, H + 1.1, 0], [0.5, 0.6, 0.5], C.window, { e: 2.5 });
      // Leiter
      B.add('cube', [0, H / 2, 1.5], [0.6, H, 0.06], [0.45, 0.35, 0.22]);
      break;
    }

    case T.LAGER:
      B.add('cube', [0, 1.6, -0.6], [5.4, 3.2, 3.6], [0.42, 0.36, 0.3], { g: 0.1 });
      B.add('prism', [0, 3.2, -0.6], [6.0, 1.6, 4.0], [0.3, 0.3, 0.32], { g: 0.1 });
      B.add('cube', [0, 1.2, 1.22], [2.2, 2.4, 0.08], C.tar);
      for (let k = 0; k < 5; k++) B.add('cube', [-2.7 + k * 1.35, 1.6, 1.21], [0.15, 3.2, 0.1], C.tar);
      // Kisten und Fässer davor
      const crates = [[-2.2, 0.4, 2.3], [-1.4, 0.4, 2.5], [-1.8, 1.2, 2.4], [2.3, 0.4, 2.4]];
      for (const p of crates) B.add('cube', p, [0.8, 0.8, 0.8], [0.6, 0.46, 0.28], { rot: [0, p[0] * 20, 0] });
      barrel(B, [1.4, 0, 2.6]); barrel(B, [0.6, 0, 2.7]);
      break;
  }
  B.pop();
}

/// Abwehrturm auf der Mauer (Fuß auf der Warft, 0.9 m unter Deckhöhe)
export function defenseTower(B, level) {
  const stone = level >= 7 ? [0.5, 0.5, 0.52] : [0.56, 0.5, 0.44];
  const H = 7 + 0.2 * level;
  B.add('cylinder', [0, -0.9 + H / 2, 0], [3.4, H / 2, 3.4], stone, { g: 0.15 });
  B.add('cylinder', [0, -0.9 + H + 0.2, 0], [3.9, 0.2, 3.9], [0.36, 0.36, 0.38]);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    B.add('cube', [Math.sin(a) * 1.75, -0.9 + H + 0.75, Math.cos(a) * 1.75], [0.8, 0.9, 0.5], stone, { rot: [0, a / (Math.PI / 180), 0] });
  }
  // Harpunen-Schleuder
  B.add('cube', [0, -0.9 + H + 0.8, 0], [0.5, 0.8, 0.5], C.tar);
  B.add('cube', [0, -0.9 + H + 1.3, 0.4], [1.8, 0.15, 0.15], [0.45, 0.32, 0.2]);
  B.add('cube', [0, -0.9 + H + 1.35, 0.6], [0.12, 0.12, 2.2], [0.55, 0.45, 0.3]);
  B.add('cone', [0, -0.9 + H + 1.35, 1.75], [0.25, 0.5, 0.25], [0.75, 0.77, 0.8], { rot: [90, 0, 0], g: 0.7 });
  // Schießscharten mit Licht
  for (let k = 0; k < 3; k++) B.add('cube', [0, -0.9 + 2 + k * 1.8, 1.72], [0.25, 0.6, 0.06], C.window, { e: 1.6 });
  // Fahne
  B.add('cylinder', [0, -0.9 + H + 2.6, -0.9], [0.06, 1.6, 0.06], C.tar);
  B.add('cube', [0.45, -0.9 + H + 3.7, -0.9], [0.9, 0.55, 0.03], [0.15, 0.45, 0.6]);
}

/// Mauerring um das Gelände. level 0 = nur Markierungssteine
export function wall(B, level, R, base) {
  const seg = Math.ceil((2 * Math.PI * R) / 3);
  const gateHalf = 5 / R;
  const kind = level <= 0 ? 0 : level <= 6 ? 1 : level <= 13 ? 2 : 3;
  const stone = kind === 3 ? [0.42, 0.42, 0.45] : [0.55, 0.53, 0.5];
  const H = kind === 1 ? 3 + 0.2 * level : kind === 2 ? 4 + 0.2 * (level - 7) : 6 + 0.2 * (level - 14);
  for (let k = 0; k < seg; k++) {
    const a = (k / seg) * Math.PI * 2;
    let d = Math.abs(a - Math.PI); if (d < gateHalf) continue;
    B.push([Math.sin(a) * R, base, Math.cos(a) * R], [0, a / (Math.PI / 180), 0]);
    if (kind === 0) {
      if (k % 2 === 0) B.add('cube', [0, 0.15, 0], [0.6, 0.3, 0.6], [0.6, 0.6, 0.6]);
    } else if (kind === 1) {
      for (let j = 0; j < 6; j++) {
        const x = -1.25 + j * 0.5, hh = H + ((j * 7 + k) % 3) * 0.2;
        B.add('cylinder', [x, hh / 2, 0], [0.42, hh / 2, 0.42], [0.45, 0.33, 0.21], { g: 0.1 });
        B.add('cone', [x, hh, 0], [0.42, 0.5, 0.42], [0.4, 0.3, 0.2]);
      }
      B.add('cube', [0, H * 0.7, -0.3], [3.05, 0.2, 0.15], [0.35, 0.25, 0.16]);
    } else {
      const th = kind === 3 ? 2.2 : 1.3;
      B.add('cube', [0, H / 2, 0], [3.05, H, th], stone, { g: 0.1 });
      B.add('cube', [0, H + 0.05, 0], [3.1, 0.1, th + 0.2], [0.35, 0.35, 0.37]);
      for (const x of [-0.75, 0.75]) B.add('cube', [x, H + 0.4, th / 2 - 0.2], [0.75, 0.7, 0.4], stone);
      if (kind === 3 && k % 4 === 0) B.add('cube', [0, H * 0.4, th / 2 + 0.4], [0.9, H * 0.8, 0.8], stone);
    }
    B.pop();
  }
  // Tor
  if (kind > 0) {
    B.push([0, base, -R], [0, 180, 0]);
    const tw = kind === 1 ? [0.45, 0.33, 0.21] : stone, th = H + 2;
    for (const x of [-3.6, 3.6]) {
      B.add('cube', [x, th / 2, 0], [2.4, th, 2.8], tw, { g: 0.1 });
      B.add('prism', [x, th, 0], [2.9, 1.8, 3.2], [0.4, 0.2, 0.15], { rot: [0, 90, 0] });
      B.add('cube', [x, th * 0.6, 1.42], [0.3, 0.6, 0.05], C.window, { e: 2 });
    }
    B.add('cube', [0, H + 0.5, 0], [4.8, 1.2, 2.0], tw);
    B.add('cube', [-1.05, H * 0.42, 0.2], [2.0, H * 0.84, 0.3], [0.3, 0.2, 0.12], { rot: [0, -35, 0] });
    B.add('cube', [1.05, H * 0.42, 0.2], [2.0, H * 0.84, 0.3], [0.3, 0.2, 0.12], { rot: [0, 35, 0] });
    B.add('cube', [0, H + 1.6, 1.05], [1.4, 0.9, 0.05], [0.15, 0.45, 0.6]);
    B.pop();
  }
}

/// Sammelstellen: 0 Treibholz, 1 Muschelbank, 2 Süßwassertümpel, 3 Wrackteile
export function resourceNode(B, type) {
  if (type === 0) {
    for (let i = 0; i < 7; i++) B.add('cylinder', [(i % 3 - 1) * 0.7, 0.3 + Math.floor(i / 3) * 0.45, (i % 2) * 0.5 - 0.25], [0.4, 1.3 + (i % 3) * 0.2, 0.4], C.drift, { rot: [0, i * 37, 90], g: 0.1 });
    B.add('cylinder', [1.6, 0.25, 1.2], [0.3, 0.9, 0.3], C.drift, { rot: [0, -40, 90] });
  } else if (type === 1) {
    for (let i = 0; i < 9; i++) B.add('sphere', [Math.cos(i * 2.4) * (0.4 + i * 0.12), 0.15, Math.sin(i * 2.4) * (0.4 + i * 0.12)], [0.7, 0.35, 0.5], [0.12, 0.13, 0.2], { rot: [0, i * 40, 0], g: 0.8 });
    B.add('cylinder', [0, 0.9, 0], [0.12, 0.9, 0.12], C.tar);
    B.add('cube', [0.25, 1.6, 0], [0.5, 0.35, 0.04], [0.95, 0.6, 0.2]);
  } else if (type === 2) {
    B.add('sphere', [0, -0.05, 0], [5, 0.5, 3.6], C.sand, { g: 0.2 });
    B.add('cylinder', [0, 0.18, 0], [3.4, 0.03, 2.4], [0.3, 0.62, 0.75], { g: 0.95, e: 0.25 });
    for (let i = 0; i < 4; i++) B.add('cone', [Math.cos(i * 1.6) * 2, 0.1, Math.sin(i * 1.6) * 1.5], [0.6, 1.1, 0.6], [0.5, 0.55, 0.3]);
  } else {
    B.add('sphere', [0, -0.05, 0], [4.6, 0.5, 3.4], C.sand, { g: 0.2 });
    B.add('cube', [0, 0.45, 0], [2.4, 0.7, 1.2], [0.22, 0.17, 0.13], { rot: [0, 20, 18] });
    for (let i = 0; i < 5; i++) B.add('cube', [-1.2 + i * 0.6, 0.35, 0.9 - (i % 2) * 1.6], [0.5, 0.35, 0.4], C.rust, { rot: [i * 15, i * 30, i * 9], g: 0.45 });
    B.add('cylinder', [0.8, 0.5, -0.4], [0.5, 0.35, 0.5], C.rust, { rot: [80, 0, 0], g: 0.45 });
  }
  // Markierungsstab mit Wimpel, damit man die Stelle findet
  B.add('cylinder', [0, 2, 0], [0.08, 2, 0.08], C.tar);
  B.add('cube', [0.35, 3.7, 0], [0.7, 0.4, 0.03], [[0.9, 0.7, 0.4], [0.95, 0.5, 0.45], [0.4, 0.8, 0.95], [0.8, 0.8, 0.85]][type], { e: 0.6 });
}

export function basket(B) {
  B.add('cylinder', [0, 1.05, -0.32], [0.42, 0.25, 0.42], [0.72, 0.6, 0.35]);
}

// Leuchtturm wächst mit dem Ausbau: Holzbake (1–3) → Steinturm (4–8) → klassischer Leuchtturm (9–14) → moderner Turm (15–20)
const TH = [4.5, 4.5, 5, 5.5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21.5, 23, 24.5, 26, 28];
export const towerHeight = (level) => TH[Math.max(1, Math.min(20, level))];
export const towerEra = (level) => (level <= 3 ? 0 : level <= 8 ? 1 : level <= 14 ? 2 : 3);
export const lampHeight = (level) => towerHeight(level) + (towerEra(level) === 0 ? 0.7 : towerEra(level) === 3 ? 2.0 : 1.2);

/// Leuchtturm (ohne Laterne – die wird dynamisch gezeichnet)
export function tower(B, level) {
  const H = towerHeight(level), era = towerEra(level);
  const wood = [0.55, 0.42, 0.28], stone = [0.5, 0.49, 0.46], stoneD = [0.38, 0.37, 0.35], concrete = [0.86, 0.87, 0.88], steel = [0.45, 0.48, 0.52];
  if (era === 0) {
    // einfache Holzbake: vier Pfosten, Streben, Plattform mit Feuerkorb
    const r = 1.1 - 0.07 * (level - 1);
    for (let i = 0; i < 4; i++) {
      const sx = i & 1 ? 1 : -1, sz = i & 2 ? 1 : -1;
      B.add('cube', [sx * r, H / 2, sz * r], [0.22, H, 0.22], wood, { rot: [sz * -4, 0, sx * 4] });
    }
    for (let k = 1; k <= 2; k++) {
      const y = (H * k) / 3;
      B.add('cube', [0, y, r], [r * 2, 0.12, 0.12], wood); B.add('cube', [0, y, -r], [r * 2, 0.12, 0.12], wood);
      B.add('cube', [r, y, 0], [0.12, 0.12, r * 2], wood); B.add('cube', [-r, y, 0], [0.12, 0.12, r * 2], wood);
      B.add('cube', [0, y - H / 6, r], [r * 2.3, 0.1, 0.1], wood, { rot: [0, 0, 35] });
      B.add('cube', [r, y - H / 6, 0], [0.1, 0.1, r * 2.3], wood, { rot: [35, 0, 0] });
    }
    B.add('cube', [0, H, 0], [r * 2.6, 0.2, r * 2.6], C.plank);
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + Math.PI / 4; B.add('cube', [Math.cos(a) * 0.7, H + 0.45, Math.sin(a) * 0.7], [0.08, 0.9, 0.08], C.dark); }
    B.add('cube', [0, 0.25, 0], [r * 2.6, 0.5, r * 2.6], C.drift);
    return;
  }
  if (era === 1) {
    // Steinturm aus groben Lagen, Holzdach
    const layers = Math.round(H / 1.1);
    for (let i = 0; i < layers; i++) {
      const t = i / layers, rad = 2.7 - 0.7 * t, segH = H / layers;
      B.add('cylLow', [0, segH * (i + 0.5), 0], [rad, segH / 2, rad], i % 3 === 0 ? stoneD : stone, { g: 0.08, rot: [0, i * 13, 0] });
    }
    B.add('cube', [0, 0.95, 1.6], [0.9, 1.9, 0.14], C.tar);
    for (let i = 1; i < 3; i++) B.add('cube', [0, (H * i) / 3, 2.7 - 0.7 * (i / 3) - 0.02], [0.35, 0.55, 0.06], C.window, { e: 1.2 });
    B.add('cylinder', [0, H + 0.1, 0], [2.6, 0.14, 2.6], stoneD);
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI * 2) / 8; B.add('cube', [Math.cos(a) * 1.15, H + 1.2, Math.sin(a) * 1.15], [0.12, 2.2, 0.12], wood); }
    B.add('cone', [0, H + 2.8, 0], [2.6, 1.2, 2.6], C.roofGrey, { g: 0.2 });
    return;
  }
  if (era === 2) {
    // klassischer rot-weißer Leuchtturm mit Galerie
    const bands = 6 + (level - 9);
    for (let i = 0; i < bands; i++) {
      const rad = 3.4 + (2.3 - 3.4) * (i / bands), segH = H / bands;
      B.add('cylinder', [0, segH * (i + 0.5), 0], [rad, segH / 2, rad], i % 2 === 0 ? C.red : C.white, { g: 0.35 });
    }
    B.add('cube', [0, 0.9, 1.68], [1, 1.8, 0.12], C.tar);
    for (let i = 1; i < 4; i++) {
      const y = (H * i) / 4.5, rad = (3.4 + (2.3 - 3.4) * (y / H)) * 0.5 + 0.02;
      B.add('cube', [0, y, rad], [0.4, 0.6, 0.06], C.window, { e: 1.4 });
    }
    B.add('cylinder', [0, H + 0.1, 0], [3.4, 0.12, 3.4], C.dark, { g: 0.5 });
    for (let i = 0; i < 16; i++) { const a = (i * Math.PI * 2) / 16; B.add('cube', [Math.cos(a) * 1.6, H + 0.55, Math.sin(a) * 1.6], [0.07, 0.8, 0.07], C.dark); }
    B.add('cylinder', [0, H + 0.95, 0], [3.25, 0.04, 3.25], C.dark);
    B.add('cone', [0, H + 2.2, 0], [2.6, 1.5, 2.6], C.red, { g: 0.35 });
    B.add('sphere', [0, H + 3.8, 0], [0.35, 0.35, 0.35], C.dark, { g: 0.6 });
    return;
  }
  // moderner Turm: schlanker weißer Betonschaft, Stahlringe, Glaskanzel, Antenne
  B.add('cylinder', [0, 0.6, 0], [5.2, 0.6, 5.2], concrete, { g: 0.3 });
  B.add(FR55, [0, 1.2, 0], [4.4, H - 1.2, 4.4], concrete, { g: 0.5 });
  const rings = level >= 18 ? 3 : 2;
  for (let i = 1; i <= rings; i++) { const y = 1.2 + ((H - 1.2) * i) / (rings + 1), rad = (2.2 - 1.0 * ((y - 1.2) / (H - 1.2))) ; B.add('cylinder', [0, y, 0], [rad * 2 + 0.15, 0.25, rad * 2 + 0.15], C.red, { g: 0.4 }); }
  for (let i = 1; i < 6; i++) { const y = (H * i) / 6.5, rad = 2.2 - 1.0 * ((y - 1.2) / (H - 1.2)); B.add('cube', [0, y, rad - 0.02], [0.3, 0.9, 0.06], [0.55, 0.8, 0.95], { e: 0.9, g: 0.9 }); }
  B.add('cube', [0, 1.3, 2.3], [1.2, 2.4, 0.14], steel, { g: 0.7 });
  B.add('cylinder', [0, H + 0.12, 0], [3.8, 0.12, 3.8], steel, { g: 0.7 });
  for (let i = 0; i < 20; i++) { const a = (i * Math.PI * 2) / 20; B.add('cube', [Math.cos(a) * 1.85, H + 0.6, Math.sin(a) * 1.85], [0.05, 0.9, 0.05], steel, { g: 0.8 }); }
  B.add('cylinder', [0, H + 1.05, 0], [3.7, 0.04, 3.7], steel, { g: 0.8 });
  B.add('cylinder', [0, H + 3.0, 0], [2.6, 0.1, 2.6], steel, { g: 0.8 });
  B.add('sphere', [0, H + 3.1, 0], [2.4, 1.0, 2.4], concrete, { g: 0.7 });
  B.add('cube', [0, H + 5.0, 0], [0.08, 3, 0.08], steel);
  B.add('sphere', [0, H + 6.5, 0], [0.25, 0.25, 0.25], C.red, { e: 2.5 });
  B.add('cube', [0.9, H + 4.0, 0], [1.4, 0.08, 0.08], steel);
}

/// Laterne (eigenes Mesh, damit sie flackern kann)
export function lantern(B, level) {
  const H = towerHeight(level), era = towerEra(level);
  if (era === 0) {
    B.add('cylinder', [0, H + 0.55, 0], [1.0, 0.35, 1.0], [1, 0.6, 0.25], { e: 3 });
    B.add('sphere', [0, H + 0.95, 0], [0.8, 0.6, 0.8], [1, 0.75, 0.35], { e: 3.5 });
    return;
  }
  if (era === 3) {
    B.add('cylinder', [0, H + 2.0, 0], [2.1, 0.95, 2.1], [0.85, 0.95, 1], { e: 3.2, g: 1 });
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI * 2) / 8; B.add('cube', [Math.cos(a) * 1.05, H + 2.0, Math.sin(a) * 1.05], [0.05, 1.9, 0.05], C.dark); }
    return;
  }
  B.add('cylinder', [0, H + 1.2, 0], [1.9, 1, 1.9], [1, 0.85, 0.45], { e: 3 });
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2) / 6;
    B.add('cube', [Math.cos(a) * 0.95, H + 1.2, Math.sin(a) * 0.95], [0.08, 2, 0.08], C.dark);
  }
}

/// Damm ganz außen: Erdwall mit Grasnarbe, ab Stufe 4 Steinpackung, ab Stufe 8 Betonkrone; Sieltor am Weg (−z)
export function dike(B, level, R, top) {
  const base = -1.2, H = top - base, N = 80, gap = 0.075;
  const grass = [0.36, 0.5, 0.27], earth = [0.5, 0.44, 0.33], stone = [0.46, 0.46, 0.44], concrete = [0.78, 0.78, 0.76];
  const seg = (2 * Math.PI * R) / N * 1.08;
  for (let k = 0; k < N; k++) {
    const a = ((k + 0.5) / N) * Math.PI * 2;
    if (Math.abs(a - Math.PI) < gap) continue;
    const x = Math.sin(a), z = Math.cos(a), yaw = a / (Math.PI / 180);
    const lay = (y0, h, w, off, col) => B.add('cube', [x * (R + off), y0 + h / 2, z * (R + off)], [seg, h, w], col, { rot: [0, yaw, 0], g: 0.08 });
    lay(base, H * 0.4, 9, 0, level >= 7 ? stone : earth);
    lay(base + H * 0.4, H * 0.35, 6.5, 0.3, level >= 7 ? stone : earth);
    lay(base + H * 0.75, H * 0.25, 4, 0.3, grass);
    if (level >= 7) lay(base + H * 0.4, H * 0.35, 1, -2.8, grass);
    if (level >= 14) lay(top, 0.9, 0.6, 2.0, concrete);
  }
  // Sieltor
  const zc = -R;
  for (const s of [-1, 1]) {
    const xs = s * Math.sin(gap) * R;
    B.add('cube', [xs, base + (H + 1.5) / 2, zc], [1.6, H + 1.5, 7], level >= 7 ? concrete : C.plank, { g: 0.2 });
  }
  const w = Math.sin(gap) * R * 2;
  B.add('cube', [0, top + 1.2, zc], [w + 1.6, 0.6, 1.4], level >= 7 ? concrete : C.plank);
  B.add('cube', [0, top - 0.6, zc + 2.6], [w, H * 0.5, 0.35], level >= 14 ? [0.4, 0.44, 0.5] : C.tar, { g: 0.5 });
  B.add('cube', [0, base + 0.2, zc], [w, 0.4, 7], earth);
}

export function scaffold(B, half, newBuild) {
  const wood = [0.65, 0.5, 0.3];
  const h = half * 1.1 + 1.5;
  for (let i = 0; i < 4; i++) {
    const sx = i & 1 ? half : -half, sz = i & 2 ? half : -half;
    B.add('cube', [sx, h / 2, sz], [0.18, h, 0.18], wood);
  }
  for (let k = 1; k <= 2; k++) {
    const y = h * 0.45 * k;
    B.add('cube', [0, y, -half], [half * 2, 0.12, 0.12], wood);
    B.add('cube', [0, y, half], [half * 2, 0.12, 0.12], wood);
    B.add('cube', [-half, y, 0], [0.12, 0.12, half * 2], wood);
    B.add('cube', [half, y, 0], [0.12, 0.12, half * 2], wood);
    B.add('cube', [0, y * 0.5 + 0.3, -half], [half * 2.2, 0.1, 0.1], wood, { rot: [0, 0, 28] });
  }
  if (newBuild) B.add('cube', [half + 0.6, 0.3, half - 0.6], [0.9, 0.6, 1.4], C.drift);
}

/// Siedler in Ölzeug mit Südwester
export function villager(B, coat) {
  B.add('capsule', [0, 0.55, 0], [0.55, 0.55, 0.55], coat, { g: 0.35 });
  B.add('sphere', [0, 1.25, 0], [0.38, 0.38, 0.38], [0.9, 0.72, 0.6]);
  B.add('cylinder', [0, 1.42, -0.04], [0.55, 0.04, 0.6], [0.9, 0.75, 0.2], { g: 0.4 });
  B.add('sphere', [0, 1.48, 0], [0.36, 0.2, 0.36], [0.9, 0.75, 0.2], { g: 0.4 });
}

// ---------- Menschen mit Gelenken (Rumpf + Kopf, Oberschenkel, Unterschenkel, Oberarm, Unterarm) ----------
// Maße in Metern, Ursprung = Boden zwischen den Füßen, Hüfte bei 0,9, Schultern bei 1,42, vorne = +z
export const SKINS = [[0.93, 0.76, 0.64], [0.72, 0.53, 0.4], [0.5, 0.35, 0.26]];
const HAIRS = [[0.22, 0.15, 0.1], [0.78, 0.62, 0.36], [0.62, 0.6, 0.58]];
export function personTorso(B, coat, hat, skin, trousers) {
  const sk = SKINS[skin], dark = [0.16, 0.13, 0.11];
  // Hose / Hüfte
  B.add('capsule', [0, 0.93, 0], [0.33, 0.14, 0.21], trousers, { g: 0.15 });
  // Jacke: Rumpf, Schultern, Kragen, Gürtel, Knöpfe, Saum
  B.add('capsule', [0, 1.19, 0], [0.38, 0.3, 0.24], coat, { g: 0.25 });
  B.add('capsule', [0, 1.4, -0.005], [0.46, 0.13, 0.25], coat, { rot: [0, 0, 90], g: 0.25 });
  B.add('cube', [0, 1.4, -0.005], [0.36, 0.13, 0.24], coat, { g: 0.25 });
  B.add('cylinder', [0, 1.0, 0], [0.37, 0.025, 0.23], dark, { g: 0.4 });
  B.add('cube', [0, 1.0, 0.115], [0.06, 0.045, 0.012], [0.75, 0.65, 0.35], { g: 0.8 });
  for (let k = 0; k < 3; k++) B.add('sphere', [0, 1.12 + k * 0.1, 0.122], [0.025, 0.025, 0.015], dark, { g: 0.6 });
  B.add('cube', [0.0, 1.2, 0.118], [0.012, 0.36, 0.01], mulCol(coat, 0.7));
  B.add('cylinder', [0, 1.49, 0], [0.17, 0.035, 0.15], mulCol(coat, 0.85));
  // Hals und Kopf
  B.add('cylinder', [0, 1.53, 0.005], [0.095, 0.05, 0.095], sk);
  B.add('sphere', [0, 1.66, 0.01], [0.19, 0.235, 0.215], sk, { g: 0.15 });
  B.add('sphere', [0, 1.6, 0.04], [0.15, 0.1, 0.15], sk);
  B.add('cube', [0, 1.655, 0.115], [0.028, 0.05, 0.035], mulCol(sk, 0.95), { rot: [-12, 0, 0] });
  for (const x of [-0.042, 0.042]) {
    B.add('sphere', [x, 1.69, 0.1], [0.03, 0.022, 0.02], [0.96, 0.96, 0.94]);
    B.add('sphere', [x, 1.69, 0.108], [0.016, 0.016, 0.01], [0.12, 0.1, 0.09]);
    B.add('cube', [x, 1.716, 0.103], [0.04, 0.008, 0.01], dark);
  }
  B.add('cube', [0, 1.615, 0.103], [0.05, 0.009, 0.01], mulCol(sk, 0.7));
  for (const x of [-0.098, 0.098]) B.add('sphere', [x, 1.665, 0.0], [0.03, 0.06, 0.04], mulCol(sk, 0.95));
  if (hat === 0) { // Südwester
    const y = [0.95, 0.78, 0.18];
    B.add('sphere', [0, 1.75, -0.005], [0.235, 0.16, 0.25], y, { g: 0.55 });
    B.add('cylinder', [0, 1.725, -0.035], [0.33, 0.012, 0.37], y, { rot: [-9, 0, 0], g: 0.55 });
  } else if (hat === 1) { // Strickmütze mit Bommel
    const col = [[0.7, 0.15, 0.13], [0.15, 0.3, 0.55], [0.9, 0.9, 0.86]][(coat[0] * 10 | 0) % 3];
    B.add('sphere', [0, 1.755, -0.005], [0.215, 0.17, 0.235], col, { g: 0.1 });
    B.add('cylinder', [0, 1.7, -0.005], [0.22, 0.025, 0.24], mulCol(col, 0.8));
    B.add('sphere', [0, 1.85, -0.01], [0.07, 0.07, 0.07], [0.95, 0.95, 0.92]);
  } else { // Haare
    const hc = HAIRS[hat - 2];
    B.add('sphere', [0, 1.73, -0.01], [0.205, 0.15, 0.225], hc, { g: 0.2 });
    B.add('sphere', [0, 1.67, -0.06], [0.2, 0.18, 0.14], hc, { g: 0.2 });
  }
}
export function personThigh(B, trousers) {
  B.add('capsule', [0, -0.21, 0], [0.15, 0.25, 0.16], trousers, { g: 0.15 });
}
export function personShin(B, trousers) {
  const boot = [0.2, 0.17, 0.14];
  B.add('capsule', [0, -0.16, 0], [0.12, 0.19, 0.125], trousers, { g: 0.15 });
  B.add('capsule', [0, -0.33, 0], [0.125, 0.12, 0.13], boot, { g: 0.45 });
  B.add('cube', [0, -0.425, 0.045], [0.115, 0.075, 0.25], boot, { g: 0.45 });
  B.add('sphere', [0, -0.415, 0.15], [0.11, 0.08, 0.08], boot, { g: 0.45 });
  B.add('cube', [0, -0.458, 0.04], [0.12, 0.018, 0.26], [0.1, 0.09, 0.08]);
}
export function personUpperArm(B, coat) {
  B.add('sphere', [0, -0.01, 0], [0.13, 0.13, 0.13], coat, { g: 0.25 });
  B.add('capsule', [0, -0.15, 0], [0.105, 0.17, 0.11], coat, { g: 0.25 });
}
export function personForearm(B, coat, skin) {
  const sk = SKINS[skin];
  B.add('capsule', [0, -0.12, 0.0], [0.095, 0.15, 0.1], coat, { g: 0.25 });
  B.add('cylinder', [0, -0.235, 0], [0.1, 0.015, 0.105], mulCol(coat, 0.75));
  B.add('sphere', [0, -0.3, 0.01], [0.075, 0.11, 0.05], sk, { g: 0.1 });
  B.add('sphere', [0.035, -0.27, 0.035], [0.03, 0.06, 0.03], sk, { rot: [0, 0, 30] });
}
/// Kiepe (Rückenkorb), am Rumpf befestigt
export function backBasket(B) {
  B.add('cylinder', [0, 1.24, -0.27], [0.34, 0.19, 0.3], [0.72, 0.6, 0.35], { g: 0.1 });
  for (let k = 0; k < 3; k++) B.add('cylinder', [0, 1.12 + k * 0.12, -0.27], [0.35, 0.01, 0.31], [0.55, 0.44, 0.24]);
  for (const x of [-0.11, 0.11]) { B.add('cube', [x, 1.26, 0.122], [0.035, 0.34, 0.012], [0.35, 0.25, 0.16]); B.add('cube', [x, 1.43, -0.02], [0.035, 0.012, 0.27], [0.35, 0.25, 0.16]); }
}
const mulCol = (c, f) => [c[0] * f, c[1] * f, c[2] * f];

/// Händlerschiff (Kogge) – Ursprung Wasserlinie, Bug zeigt +x
export function traderShip(B) {
  const hull = [0.42, 0.28, 0.17], dark = [0.25, 0.17, 0.1];
  B.add('cube', [0, 0.4, 0], [9, 1.6, 3.4], hull, { g: 0.2 });
  B.add('cube', [0, -0.3, 0], [7.6, 0.8, 2.4], dark);
  B.add('prism', [5.2, 0.55, 0], [1.6, 1.9, 3.4], hull, { rot: [0, 0, -90] });
  B.add('cube', [-3.6, 1.7, 0], [2.2, 1.2, 3.2], hull, { g: 0.2 });
  B.add('cube', [-3.6, 2.35, 0], [2.4, 0.12, 3.4], dark);
  B.add('cube', [0, 1.22, 0], [9, 0.1, 3.5], [0.6, 0.45, 0.28]);
  B.add('cylinder', [0.4, 5, 0], [0.22, 4, 0.22], dark);
  B.add('cube', [0.4, 5.6, 0], [0.25, 4.6, 5.2], [0.93, 0.88, 0.76], { rot: [0, 90, 0], g: 0.1 });
  B.add('cube', [0.4, 5.6, 0.14], [0.3, 1.2, 1.2], [0.75, 0.2, 0.15], { rot: [0, 90, 0] });
  B.add('cube', [0.4, 8.1, 0], [0.12, 0.12, 5.4], dark, { rot: [0, 90, 0] });
  B.add('cube', [0.4, 9.4, 0], [0.9, 0.5, 0.04], [0.9, 0.75, 0.2], { rot: [0, 90, 0] });
  for (const [x, z] of [[-1.5, 0.8], [1.8, -0.6], [2.6, 0.9]]) B.add('cube', [x, 1.55, z], [0.9, 0.7, 0.9], [0.55, 0.42, 0.25]);
  B.add('cylinder', [-0.8, 1.6, -0.9], [0.6, 0.4, 0.6], [0.5, 0.35, 0.2]);
}

export function gullBody(B) {
  B.add('capsule', [0, 0, 0], [0.25, 0.4, 0.25], [0.95, 0.95, 0.95], { rot: [90, 0, 0], g: 0.2 });
  B.add('cube', [0, 0.05, 0.45], [0.08, 0.06, 0.2], [0.95, 0.75, 0.2]);
}
export function gullWing(B, side) {
  B.add('cube', [side * 0.55, 0, 0], [1.1, 0.04, 0.35], [0.55, 0.58, 0.62], { g: 0.2 });
}

export function buoy(B, col) {
  B.add('cylinder', [0, 0.3, 0], [0.9, 0.5, 0.9], col, { g: 0.4 });
  B.add('cone', [0, 0.8, 0], [0.8, 1.1, 0.8], col, { g: 0.4 });
  B.add('sphere', [0, 2, 0], [0.25, 0.25, 0.25], [1, 0.9, 0.6], { e: 2 });
}
