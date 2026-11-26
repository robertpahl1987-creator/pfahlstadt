// Die 3D-Welt: Watt, Pfahlwerk, Gebäude, Siedler, Möwen, Wetter, Licht und Kamera.
import { Builder } from './geo.js';
import * as M from './models.js';
import { C } from './models.js';
import { PLOTS, INNER, deckFor } from './game.js';
import { trs, mul, perspective, lookAt, invert, normalMat, clamp, clamp01, lerp, lerpC, mulC, moveTowards, rng, noise1, D2R, project } from './math.js';

export const RING = 20, RING2 = 34;
const COATS = [[0.75, 0.55, 0.15], [0.2, 0.32, 0.5], [0.55, 0.2, 0.18], [0.3, 0.42, 0.3], [0.5, 0.45, 0.38], [0.85, 0.75, 0.3]];

export function plotAngle(i) { return i < INNER ? ((i - 1) * Math.PI * 2) / 12 : ((i - INNER + 0.5) * Math.PI * 2) / 12; }
export function plotPos(i) {
  if (i === 0) return [0, 0, 0];
  const a = plotAngle(i), r = i < INNER ? RING : RING2;
  return [Math.sin(a) * r, 0, Math.cos(a) * r];
}
/// Drehung so, dass die Vorderseite (+z) zur Mitte zeigt
export function plotYaw(i) {
  if (i === 0) return 0;
  const p = plotPos(i);
  return Math.atan2(-p[0], -p[2]) / D2R;
}

export class World {
  constructor(r, colony) {
    this.r = r;
    this.c = colony;
    this.time = 0;
    this.stormBlend = 0;
    this.plotMesh = new Array(PLOTS).fill(null);
    this.plotEmit = new Array(PLOTS).fill(null).map(() => []);
    this.shown = new Array(PLOTS).fill(null).map(() => ({ type: -99, level: -1, building: false, deck: -1 }));
    this.selected = -1;
    this.particleMul = 1;
    this.shadowSize = 2048;

    // Kamera
    this.target = [0, 3, 0];
    this.dist = 62;
    this.minDist = 22; this.maxDist = 140;

    this.buildEnvironment();
    this.buildStatic();
    this.villagers = [];
    this.gulls = [];
    const R = rng(99);
    for (let i = 0; i < 7; i++) this.gulls.push({ radius: 14 + R() * 32, height: 14 + R() * 12, speed: (0.15 + R() * 0.15) * (R() < 0.5 ? 1 : -1), angle: R() * 6.28, flap: R() * 10 });
    this.smoke = new Float32Array(600 * 5); this.smokeP = [];
    this.rainMax = 3000; this.rain = new Float32Array(this.rainMax * 8); this.drops = [];
  }

  // ---------------- Aufbau ----------------

  buildEnvironment() {
    const B = new Builder();
    const R = rng(4711);
    const rr = (a, b) => a + R() * (b - a);
    B.add('plane', [0, 0, 0], [70, 1, 70], C.wetSand, { g: 0.55 });
    // Priele (dunklere Rinnen im Watt)
    for (let i = 0; i < 14; i++) {
      const a = rr(0, 6.28), d = rr(40, 160);
      B.add('cube', [Math.sin(a) * d, 0.01, Math.cos(a) * d], [rr(3, 7), 0.02, rr(30, 80)], [0.3, 0.3, 0.27], { rot: [0, rr(0, 180), 0], g: 0.8 });
    }
    // Sandbänke
    for (let i = 0; i < 34; i++) {
      const a = rr(0, 6.28), d = rr(36, 210);
      B.add('sphere', [Math.sin(a) * d, -0.35, Math.cos(a) * d], [rr(18, 55), rr(1.6, 2.8), rr(12, 36)], C.sand, { rot: [0, rr(0, 180), 0], g: 0.2 });
    }
    // Dünen-Inseln mit Strandhafer
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.28 + rr(-0.2, 0.2), d = rr(230, 300);
      const c = [Math.sin(a) * d, 0, Math.cos(a) * d];
      B.add('sphere', c, [rr(70, 120), rr(16, 26), rr(35, 60)], C.sand, { rot: [0, a / D2R, 0] });
      for (let k = 0; k < 10; k++) B.add('cone', [c[0] + rr(-25, 25), rr(6, 9), c[2] + rr(-12, 12)], [rr(5, 9), rr(3, 6), rr(5, 9)], [0.55, 0.58, 0.32], { g: 0.05 });
    }
    // Pricken (Fahrrinne)
    for (let side = -1; side <= 1; side += 2)
      for (let i = 0; i < 16; i++) {
        const p = [side * (6 + i * 0.6) + 40, 0, -40 - i * 11];
        B.add('cylinder', [p[0], 2, p[2]], [0.12, 2, 0.12], [0.35, 0.3, 0.25]);
        B.add('sphere', [p[0], 4.1, p[2]], [0.6, 0.8, 0.6], [0.35, 0.3, 0.25]);
      }
    // Wrack
    B.push([-70, 0, -55], [0, 35, 12]);
    const hull = [0.22, 0.17, 0.13];
    B.add('cube', [0, 0.6, 0], [5, 1.4, 18], hull);
    for (let i = 0; i < 7; i++) {
      const z = -7 + i * 2.3;
      B.add('cube', [-2.6, 2.2, z], [0.35, 3.2, 0.35], hull, { rot: [0, 0, -12] });
      B.add('cube', [2.6, 2.0, z], [0.35, 2.6 + (i % 3) * 0.6, 0.35], hull, { rot: [0, 0, 12] });
    }
    B.add('cylinder', [0, 4.5, 2], [0.5, 4.5, 0.5], hull, { rot: [18, 0, 0] });
    B.pop();
    this.envMesh = this.r.upload(B);

    // Bojen-Positionen
    this.buoys = [];
    for (let i = 0; i < 8; i++) {
      const a = rr(0, 6.28), d = rr(32, 70);
      this.buoys.push({ x: Math.sin(a) * d, z: Math.cos(a) * d, red: i % 2 === 0 });
    }
  }

  buildStatic() {
    const r = this.r;
    this.villagerMeshes = COATS.map((c) => { const B = new Builder(); M.villager(B, c); return r.upload(B); });
    const sickB = new Builder(); M.villager(sickB, [0.45, 0.58, 0.42]); this.sickMesh = r.upload(sickB);
    let B = new Builder(); M.gullBody(B); this.gullBody = r.upload(B);
    B = new Builder(); M.gullWing(B, -1); this.gullWingL = r.upload(B);
    B = new Builder(); M.gullWing(B, 1); this.gullWingR = r.upload(B);
    B = new Builder(); M.buoy(B, [0.8, 0.15, 0.12]); this.buoyRed = r.upload(B);
    B = new Builder(); M.buoy(B, [0.15, 0.55, 0.25]); this.buoyGreen = r.upload(B);
    B = new Builder(); B.add('cube', [0, 0.5, 0], [1, 1, 1], [0.6, 0.5, 0.38]); this.ghostMesh = r.upload(B);
    B = new Builder(); B.add('cube', [0, 0, 0], [1, 1, 1], [0.3, 0.85, 1], { e: 2.5 }); this.selMesh = r.upload(B);
    // Lichtkegel: Spitze im Ursprung, öffnet sich entlang +z (60 m)
    B = new Builder(); B.add('cone', [0, 0, 60], [9, 60, 4], [1, 1, 1], { rot: [-90, 0, 0] }); this.beamMesh = r.upload(B);
  }

  buildInfra(deck) {
    this.r.free(this.infraMesh);
    const B = new Builder();
    const post = C.tar, algae = [0.18, 0.28, 0.2], plank = C.plank;
    const postLen = deck + 1, postY = (deck - 1) / 2;
    B.add('cylinder', [0, deck - 0.15, 0], [19, 0.15, 19], plank, { g: 0.2 });
    B.add('cylinder', [0, (deck - 1.05) / 2, 0], [7, (deck + 0.95) / 2, 7], [0.38, 0.38, 0.4], { g: 0.2 });
    // Planken-Fugen auf der Mittelplattform
    for (let k = -4; k <= 4; k++) B.add('cube', [k * 2, deck + 0.005, 0], [0.06, 0.01, Math.sqrt(Math.max(0, 90 - k * k * 4)) * 2], [0.35, 0.26, 0.17]);
    for (let i = 0; i < 18; i++) {
      const a = (i * Math.PI * 2) / 18, px = Math.sin(a) * 8.8, pz = Math.cos(a) * 8.8;
      B.add('cylinder', [px, postY, pz], [0.5, postLen / 2, 0.5], post, { g: 0.35 });
      B.add('cylinder', [px, 0.4, pz], [0.56, 0.6, 0.56], algae, { g: 0.6 });
      if (i % 3 !== 0) B.add('cube', [px * 1.05, deck + 0.5, pz * 1.05], [0.12, 1, 0.12], post);
    }
    for (let i = 1; i < PLOTS; i++) {
      const p = plotPos(i);
      B.push(p, [0, plotYaw(i), 0]);
      B.add('cube', [0, deck - 0.15, 0], [8, 0.3, 8], plank, { g: 0.2 });
      for (let k = -3; k <= 3; k++) B.add('cube', [k * 1.1, deck + 0.005, 0], [0.05, 0.01, 7.9], [0.35, 0.26, 0.17]);
      for (let k = 0; k < 9; k++) {
        const lx = ((k % 3) - 1) * 3.6, lz = (Math.floor(k / 3) - 1) * 3.6;
        B.add('cylinder', [lx, postY, lz], [0.42, postLen / 2, 0.42], post, { g: 0.35 });
        B.add('cylinder', [lx, 0.4, lz], [0.48, 0.6, 0.48], algae, { g: 0.6 });
      }
      const outer = i >= INNER;
      const wl = outer ? 21.4 : 7.2, wz = outer ? 14.7 : 7.5, ww = outer ? 1.8 : 2.2;
      B.add('cube', [0, deck - 0.1, wz], [ww, 0.2, wl], plank, { g: 0.2 });
      for (let k = 0; k < (outer ? 6 : 2); k++) {
        const z = (outer ? 6 : 6) + k * 3;
        B.add('cylinder', [-1, postY, z], [0.3, postLen / 2, 0.3], post);
        B.add('cylinder', [1, postY, z], [0.3, postLen / 2, 0.3], post);
        B.add('cube', [-1.1, deck + 0.3, z], [0.1, 0.6, 0.1], post);
        B.add('cube', [1.1, deck + 0.3, z], [0.1, 0.6, 0.1], post);
      }
      B.add('cube', [-ww / 2, deck + 0.6, wz], [0.08, 0.08, wl], post);
      B.add('cube', [ww / 2, deck + 0.6, wz], [0.08, 0.08, wl], post);
      B.pop();
    }
    // Pegel-Latte mit roter Marke auf Deckhöhe
    const pa = 15 * D2R, pg = [Math.sin(pa) * 9.8, 0, Math.cos(pa) * 9.8];
    for (let k = 0; k < 10; k++) B.add('cube', [pg[0], k + 0.5, pg[2]], [0.35, 1, 0.12], k % 2 === 0 ? [0.95, 0.95, 0.92] : [0.1, 0.1, 0.12], { g: 0.3 });
    B.add('cube', [pg[0], deck, pg[2]], [0.6, 0.08, 0.2], [1, 0.25, 0.2], { e: 2 });
    // Laternen auf der Mittelplattform
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.28 + 0.26, lx = Math.sin(a) * 7.6, lz = Math.cos(a) * 7.6;
      B.add('cylinder', [lx, deck + 1.2, lz], [0.15, 1.2, 0.15], C.dark);
      B.add('cube', [lx, deck + 2.6, lz], [0.4, 0.5, 0.4], C.window, { e: 2.2 });
    }
    this.infraMesh = this.r.upload(B);
    this.infraDeck = deck;
  }

  buildPlot(i) {
    const p = this.c.s.plots[i];
    const deck = this.c.deck;
    this.r.free(this.plotMesh[i]);
    if (i === 0) { this.r.free(this.lanternMesh); this.lanternMesh = null; }
    const B = new Builder();
    B.push([plotPos(i)[0], deck, plotPos(i)[2]], [0, plotYaw(i), 0]);
    if (i === 0) {
      M.tower(B, Math.max(1, p.level));
      const L = new Builder(); L.push([0, deck, 0]); M.lantern(L, Math.max(1, p.level));
      this.lanternMesh = this.r.upload(L);
      this.lampPos = [0, deck + M.towerHeight(Math.max(1, p.level)) + 1.2, 0];
    } else if (p.type >= 0 && p.level > 0) M.building(B, p.type, p.level);
    if (p.buildLeft > 0) M.scaffold(B, i === 0 ? 4.5 : 3, p.level === 0);
    B.pop();
    this.plotMesh[i] = this.r.upload(B);
    this.plotEmit[i] = B.emitters;
    Object.assign(this.shown[i], { type: p.type, level: p.level, building: p.buildLeft > 0, deck });
  }

  // ---------------- Aktualisierung ----------------

  update(dt) {
    this.time += dt;
    const c = this.c;
    const deck = c.deck;
    if (this.infraDeck !== deck) this.buildInfra(deck);
    for (let i = 0; i < PLOTS; i++) {
      const p = c.s.plots[i], sh = this.shown[i];
      if (p.type !== sh.type || p.level !== sh.level || (p.buildLeft > 0) !== sh.building || sh.deck !== deck) this.buildPlot(i);
    }
    this.stormBlend = moveTowards(this.stormBlend, c.storm ? 1 : 0, dt * 0.25);
    this.target[1] = deck;
    for (const g of this.gulls) g.angle += g.speed * (c.storm ? 1.8 : 1) * dt;
    this.updateVillagers(dt);
    this.updateSmoke(dt);
    this.updateRain(dt);
  }

  // ---- Siedler laufen über die Stege ----
  updateVillagers(dt) {
    const c = this.c;
    const want = Math.min(c.s.survivors, 36);
    while (this.villagers.length < want) {
      const a = Math.random() * 6.28, d = 3 + Math.random() * 4.5;
      this.villagers.push({ x: Math.sin(a) * d, z: Math.cos(a) * d, yaw: 0, path: [], spoke: -1, wait: Math.random() * 2, speed: 1.5 + Math.random() * 0.6, phase: Math.random() * 10, mesh: Math.floor(Math.random() * COATS.length) });
    }
    this.villagers.length = want;
    // Soldaten (sichtbar als rote Figuren auf der Mittelplattform)
    const polar = (a, r) => [Math.sin(a) * r, Math.cos(a) * r];
    const spokeA = (i) => plotAngle(i);
    this.villagers.forEach((v, idx) => {
      v.sick = idx < c.s.sick;
      if (!v.path.length) {
        v.bob = 0;
        v.wait -= dt;
        if (v.wait > 0) return;
        if (v.spoke >= 0) v.path.push(polar(spokeA(v.spoke), 8));
        let target = -1;
        if (c.freeboard >= 0 && Math.random() < 0.6) {
          const built = [];
          for (let i = 1; i < PLOTS; i++) if (c.s.plots[i].type >= 0) built.push(i);
          if (built.length) target = built[Math.floor(Math.random() * built.length)];
        }
        if (target > 0) {
          const a = spokeA(target);
          v.path.push(polar(a, 8));
          const far = target >= INNER;
          const off = polar(a + Math.PI / 2, (Math.random() - 0.5) * (far ? 0.6 : 1.2)), base = polar(a, far ? 24 + Math.random() * 5.5 : 10 + Math.random() * 5.5);
          v.path.push([base[0] + off[0], base[1] + off[1]]);
          v.spoke = target;
        } else {
          v.path.push(polar(Math.random() * 6.28, 3 + Math.random() * 4.5));
          v.spoke = -1;
        }
        return;
      }
      const t = v.path[0];
      const dx = t[0] - v.x, dz = t[1] - v.z, d = Math.hypot(dx, dz);
      if (d < 0.25) { v.path.shift(); if (!v.path.length) v.wait = 1.5 + Math.random() * 3.5; return; }
      const sp = v.speed * (v.sick ? 0.45 : 1) * (c.storm ? 0.7 : 1);
      v.x += (dx / d) * sp * dt; v.z += (dz / d) * sp * dt;
      const fr = Math.hypot(v.x, v.z);
      if (v.spoke < 0 && fr < 2.3 && fr > 0.001) { v.x *= 2.3 / fr; v.z *= 2.3 / fr; }
      const want2 = Math.atan2(dx, dz);
      let diff = want2 - v.yaw;
      while (diff > Math.PI) diff -= 6.283; while (diff < -Math.PI) diff += 6.283;
      v.yaw += diff * Math.min(1, dt * 8);
      v.bob = Math.abs(Math.sin((this.time + v.phase) * 9)) * 0.07;
    });
  }

  updateSmoke(dt) {
    const P = this.smokeP;
    const wind = 0.4 + 2.5 * this.stormBlend;
    for (let i = 0; i < PLOTS; i++)
      for (const e of this.plotEmit[i]) {
        e.acc = (e.acc || 0) + dt * 6 * this.particleMul;
        while (e.acc >= 1 && P.length < 600) {
          e.acc -= 1;
          const s = e.size;
          P.push({ x: e.p[0], y: e.p[1], z: e.p[2], vy: (0.8 + Math.random() * 0.8) * s, vx: (Math.random() - 0.5) * 0.3, vz: (Math.random() - 0.5) * 0.3, life: 0, max: 3.5 + Math.random() * 2, size: (0.8 + Math.random() * 0.6) * s });
        }
      }
    let n = 0;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life += dt;
      if (p.life >= p.max) { P.splice(i, 1); continue; }
      p.x += (p.vx + wind) * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const t = p.life / p.max;
      const a = (t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8) * 0.5;
      const o = n * 5;
      this.smoke[o] = p.x; this.smoke[o + 1] = p.y; this.smoke[o + 2] = p.z;
      this.smoke[o + 3] = p.size * (0.6 + 1.8 * t) * 2; this.smoke[o + 4] = a;
      n++;
    }
    this.smokeCount = n;
  }

  updateRain(dt) {
    const c = this.c;
    const night = c.s.dayTime < 0.25 || c.s.dayTime > 0.75 ? 0.12 : 0;
    const amount = Math.max(night, this.stormBlend);
    const want = Math.floor(this.rainMax * amount * Math.min(1, this.particleMul));
    const D = this.drops, T = this.target;
    const wind = lerp(1, 12, this.stormBlend);
    while (D.length < want) D.push({ x: T[0] + (Math.random() - 0.5) * 90, y: T[1] + Math.random() * 30, z: T[2] + (Math.random() - 0.5) * 90 });
    D.length = Math.min(D.length, want);
    let n = 0;
    const len = 0.06;
    for (const d of D) {
      d.y -= 18 * dt; d.x += wind * dt;
      if (d.y < Math.max(c.water, 0) || Math.abs(d.x - T[0]) > 45) { d.x = T[0] + (Math.random() - 0.5) * 90; d.z = T[2] + (Math.random() - 0.5) * 90; d.y = T[1] + 24 + Math.random() * 6; }
      const o = n * 8;
      this.rain[o] = d.x; this.rain[o + 1] = d.y; this.rain[o + 2] = d.z; this.rain[o + 3] = 0;
      this.rain[o + 4] = d.x - wind * len; this.rain[o + 5] = d.y + 18 * len; this.rain[o + 6] = d.z; this.rain[o + 7] = 0.5;
      n++;
    }
    this.rainCount = n;
  }

  // ---------------- Kamera ----------------

  camera(aspect) {
    const t = (this.dist - this.minDist) / (this.maxDist - this.minDist);
    const pitch = lerp(36, 58, clamp01(t)) * D2R, yaw = 0;
    const fwd = [Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
    const pos = [this.target[0] - fwd[0] * this.dist, this.target[1] - fwd[1] * this.dist, this.target[2] - fwd[2] * this.dist];
    const fov = (aspect < 1 ? 55 : 42) * D2R;
    const view = lookAt(pos, this.target);
    const proj = perspective(fov, aspect, 0.5, 900);
    this.cam = { pos, view, proj, fov, fwd, vp: mul(proj, view) };
    return this.cam;
  }

  pan(dx, dy, viewH) {
    const k = (this.dist / viewH) * 1.6;
    // Kamera schaut entlang +z: rechts = -x
    this.target[0] += dx * k;
    this.target[2] += dy * k;
    const r = Math.hypot(this.target[0], this.target[2]);
    if (r > 60) { this.target[0] *= 60 / r; this.target[2] *= 60 / r; }
  }

  zoom(f) { this.dist = clamp(this.dist * f, this.minDist, this.maxDist); }

  /// Bildschirmpunkt (NDC) → Bauplatz-Index oder -1
  pick(nx, ny) {
    if (!this.cam) return -1;
    const inv = invert(this.cam.vp);
    const un = (z) => { const v = [nx, ny, z, 1]; const o = [0, 0, 0, 0]; for (let r = 0; r < 4; r++) o[r] = inv[r] * v[0] + inv[4 + r] * v[1] + inv[8 + r] * v[2] + inv[12 + r] * v[3]; return [o[0] / o[3], o[1] / o[3], o[2] / o[3]]; };
    const a = un(-1), b = un(1);
    const deck = this.c.deck;
    // erst Turm (zylindrisch, hoch), dann Deck-Ebene
    const dir = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    for (let s = 0; s <= 1; s += 0.002) {
      const p = [a[0] + dir[0] * s, a[1] + dir[1] * s, a[2] + dir[2] * s];
      if (p[1] < deck) break;
      if (p[1] < deck + 15 && Math.hypot(p[0], p[2]) < 2.2) return 0;
    }
    if (Math.abs(dir[1]) < 1e-6) return -1;
    const s = (deck - a[1]) / dir[1];
    const hx = a[0] + dir[0] * s, hz = a[2] + dir[2] * s;
    if (Math.hypot(hx, hz) < 9.8) return 0;
    for (let i = 1; i < PLOTS; i++) {
      const p = plotPos(i), yaw = plotYaw(i) * D2R;
      const lx0 = hx - p[0], lz0 = hz - p[2];
      const lx = Math.cos(yaw) * lx0 - Math.sin(yaw) * lz0, lz = Math.sin(yaw) * lx0 + Math.cos(yaw) * lz0;
      if (Math.abs(lx) < 4.4 && Math.abs(lz) < 4.4) return i;
    }
    return -1;
  }

  screenPos(p, w, h) {
    const q = project(this.cam.vp, p);
    if (q[2] <= 0) return null;
    return [(q[0] * 0.5 + 0.5) * w, (1 - (q[1] * 0.5 + 0.5)) * h];
  }

  // ---------------- Szene für den Renderer ----------------

  scene(aspect) {
    const c = this.c;
    const cam = this.camera(aspect);
    const t = c.s.dayTime;
    const day = clamp01(Math.sin((t - 0.25) * Math.PI * 2) * 1.4 + 0.15);
    const sb = this.stormBlend, gloom = 1 - 0.55 * sb;

    const elev = lerp(18, 55, day) * D2R, azim = (-40 + t * 90) * D2R;
    const sunDir = [Math.cos(elev) * Math.sin(azim), Math.sin(elev), Math.cos(elev) * Math.cos(azim)];
    const sunCol = mulC(lerpC([0.45, 0.55, 0.9], [1.0, 0.93, 0.82], day), lerp(0.18, 1.25, day) * gloom);

    let fog = lerpC([0.07, 0.09, 0.15], [0.72, 0.78, 0.84], day);
    fog = lerpC(fog, mulC([0.45, 0.5, 0.55], lerp(0.3, 1, day)), sb);
    const zenith = lerpC(lerpC([0.02, 0.03, 0.08], [0.32, 0.52, 0.78], day), mulC([0.35, 0.38, 0.42], lerp(0.25, 1, day)), sb);
    const horizon = lerpC(lerpC([0.08, 0.1, 0.17], [0.78, 0.83, 0.88], day), fog, sb);
    const waterDeep = lerpC([0.01, 0.03, 0.08], [0.02, 0.17, 0.38], day);
    const waterShallow = lerpC([0.02, 0.06, 0.1], [0.08, 0.5, 0.58], day);

    const burn = c.beaconBurning;
    const flick = noise1(this.time * 2.5);
    this.lampI = lerp(this.lampI || 0, burn ? 1.6 + flick : 0, 0.1);

    const draws = [];
    draws.push({ mesh: this.envMesh });
    draws.push({ mesh: this.infraMesh });
    for (const m of this.plotMesh) if (m) draws.push({ mesh: m });
    if (this.lanternMesh) draws.push({ mesh: this.lanternMesh, emis: burn ? 0.8 + flick * 0.6 : 0.02, noShadow: true });

    const deck = c.deck;
    // Baufortschritt (wachsender Rohbau)
    c.s.plots.forEach((p, i) => {
      if (p.buildLeft > 0 && p.level === 0) {
        const prog = 1 - p.buildLeft / Math.max(0.01, p.buildTotal);
        const pp = plotPos(i);
        draws.push({ mesh: this.ghostMesh, model: trs([pp[0], deck, pp[2]], [0, plotYaw(i), 0], [3.9, Math.max(0.05, prog * 2.6), 3.9]) });
      }
    });
    for (const v of this.villagers) {
      const m = trs([v.x, deck + (v.bob || 0), v.z], [0, v.yaw / D2R, 0], [1, 1, 1]);
      draws.push({ mesh: v.sick ? this.sickMesh : this.villagerMeshes[v.mesh], model: m });
    }
    for (const g of this.gulls) {
      const p = [Math.cos(g.angle) * g.radius, deck + g.height + Math.sin(g.angle * 3) * 1.5, Math.sin(g.angle) * g.radius];
      const yaw = Math.atan2(-Math.sin(g.angle) * Math.sign(g.speed), Math.cos(g.angle) * Math.sign(g.speed)) / D2R;
      const body = trs(p, [0, yaw, -20 * Math.sign(g.speed)], [1, 1, 1]);
      const w = Math.sin((this.time + g.flap) * 7) * 28;
      draws.push({ mesh: this.gullBody, model: body, noShadow: true });
      draws.push({ mesh: this.gullWingL, model: mul(body, trs(null, [0, 0, w], null)), noShadow: true });
      draws.push({ mesh: this.gullWingR, model: mul(body, trs(null, [0, 0, -w], null)), noShadow: true });
    }
    const wy = c.water + Math.sin(this.time * 0.9) * 0.05;
    this.buoys.forEach((b, i) => {
      const tilt = 6 + 14 * sb;
      const m = trs([b.x, Math.max(0, wy) - 0.2 + Math.sin(this.time * 1.5 + i) * 0.1, b.z], [Math.sin(this.time * 1.2 + i) * tilt, 0, Math.cos(this.time + i) * tilt], [1, 1, 1]);
      draws.push({ mesh: b.red ? this.buoyRed : this.buoyGreen, model: m });
    });
    if (this.selected >= 0) {
      const s = this.selected, half = s === 0 ? 9.7 : 4.15, pp = plotPos(s), yaw = plotYaw(s);
      const base = trs([pp[0], deck + 0.08, pp[2]], [0, yaw, 0], null);
      const pulse = 0.6 + 0.4 * Math.sin(this.time * 4);
      for (let k = 0; k < 4; k++) {
        const along = k < 2, sign = k % 2 === 0 ? -1 : 1;
        const m = trs(along ? [0, 0, sign * half] : [sign * half, 0, 0], null, along ? [half * 2 + 0.25, 0.1, 0.25] : [0.25, 0.1, half * 2 + 0.25]);
        draws.push({ mesh: this.selMesh, model: mul(base, m), emis: pulse, noShadow: true });
      }
    }

    const beams = [];
    const dark = t < 0.27 || t > 0.73 || sb > 0.3;
    if (burn && dark && this.lampPos) {
      const rot = this.time * 35;
      for (let k = 0; k < 2; k++)
        beams.push({ mesh: this.beamMesh, model: trs(this.lampPos, [0, rot + k * 180, 0], null), origin: this.lampPos, len: 60, alpha: 0.22 });
    }

    const plCol = mulC([1, 0.75, 0.45], this.lampI * 1.4);
    return {
      view: cam.view, proj: cam.proj, camPos: cam.pos, fov: cam.fov, time: this.time,
      sunDir, sunCol, ambSky: mulC(lerpC([0.1, 0.12, 0.22], [0.62, 0.7, 0.8], day), gloom),
      ambGround: mulC(lerpC([0.05, 0.05, 0.08], [0.4, 0.38, 0.33], day), gloom),
      fogCol: fog, fogDen: lerp(0.0045, 0.022, sb), zenith, horizon, cloud: sb, night: 1 - day,
      cloudCol: lerpC(lerpC([0.12, 0.13, 0.18], [0.95, 0.95, 0.97], day), mulC([0.4, 0.42, 0.46], lerp(0.3, 1, day)), sb),
      plPos: this.lampPos || [0, 15, 0], plCol, plRange: 38 + 4 * c.towerLevel,
      draws, waterY: wy, waterDeep: lerpC(waterDeep, [0.12, 0.17, 0.2], sb * 0.6), waterShallow: lerpC(waterShallow, [0.2, 0.26, 0.28], sb * 0.6), storm: sb,
      smoke: this.smoke, smokeCount: this.smokeCount, smokeCol: mulC(lerpC([0.25, 0.27, 0.32], [0.82, 0.82, 0.85], day), 1),
      rain: this.rain, rainCount: this.rainCount, beams,
      shadowSize: day > 0.05 ? this.shadowSize : 0, shadowCenter: [this.target[0], deck, this.target[2]], shadowRadius: 55 + this.dist * 0.25,
    };
  }
}
