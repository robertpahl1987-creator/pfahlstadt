// Grundformen (gleiche Maße wie Unity-Primitive) und ein Builder, der viele Teile
// zu einem einzigen GPU-Puffer zusammenfasst (wenige Zeichenaufrufe = flüssig auf dem Handy).
import { mul, trs, normalMat, ident } from './math.js';

function shape() { return { p: [], n: [], i: [] }; }
function vert(s, p, n) { s.p.push(p[0], p[1], p[2]); s.n.push(n[0], n[1], n[2]); return s.p.length / 3 - 1; }

function faceNormal(a, b, c, center) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  n = [n[0] / l, n[1] / l, n[2] / l];
  const m = [(a[0] + b[0] + c[0]) / 3 - center[0], (a[1] + b[1] + c[1]) / 3 - center[1], (a[2] + b[2] + c[2]) / 3 - center[2]];
  if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0) n = [-n[0], -n[1], -n[2]];
  return n;
}

function flatTri(s, a, b, c, center) {
  const n = faceNormal(a, b, c, center);
  const i0 = vert(s, a, n), i1 = vert(s, b, n), i2 = vert(s, c, n);
  s.i.push(i0, i1, i2);
}

function cube() {
  const s = shape();
  const faces = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
    [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]],
    [[0, 0, 1], [-1, 0, 0], [0, 1, 0]], [[0, 0, -1], [1, 0, 0], [0, 1, 0]],
  ];
  for (const [n, u, v] of faces) {
    const base = s.p.length / 3;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
      vert(s, [0.5 * (n[0] + a * u[0] + b * v[0]), 0.5 * (n[1] + a * u[1] + b * v[1]), 0.5 * (n[2] + a * u[2] + b * v[2])], n);
    s.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return s;
}

/// Zylinder: Durchmesser 1, Höhe 2, zentriert (wie Unity)
function cylinder(seg = 20) {
  const s = shape();
  for (let k = 0; k <= seg; k++) {
    const a = (k / seg) * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
    vert(s, [x * 0.5, -1, z * 0.5], [x, 0, z]);
    vert(s, [x * 0.5, 1, z * 0.5], [x, 0, z]);
  }
  for (let k = 0; k < seg; k++) { const a = k * 2; s.i.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  for (const y of [-1, 1]) {
    const c = vert(s, [0, y, 0], [0, y, 0]);
    const first = s.p.length / 3;
    for (let k = 0; k <= seg; k++) { const a = (k / seg) * Math.PI * 2; vert(s, [Math.cos(a) * 0.5, y, Math.sin(a) * 0.5], [0, y, 0]); }
    for (let k = 0; k < seg; k++) s.i.push(c, first + k, first + k + 1);
  }
  return s;
}

/// Kugel: Durchmesser 1
function sphere(seg = 18, rings = 12) {
  const s = shape();
  for (let r = 0; r <= rings; r++) {
    const v = r / rings, phi = v * Math.PI;
    for (let k = 0; k <= seg; k++) {
      const th = (k / seg) * Math.PI * 2;
      const n = [Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)];
      vert(s, [n[0] * 0.5, n[1] * 0.5, n[2] * 0.5], n);
    }
  }
  for (let r = 0; r < rings; r++)
    for (let k = 0; k < seg; k++) {
      const a = r * (seg + 1) + k, b = a + seg + 1;
      s.i.push(a, b, a + 1, a + 1, b, b + 1);
    }
  return s;
}

/// Kapsel: Durchmesser 1, Höhe 2
function capsule(seg = 14, rings = 12) {
  const s = shape();
  for (let r = 0; r <= rings; r++) {
    const v = r / rings, phi = v * Math.PI;
    const yOff = v <= 0.5 ? 0.5 : -0.5;
    for (let k = 0; k <= seg; k++) {
      const th = (k / seg) * Math.PI * 2;
      const n = [Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)];
      vert(s, [n[0] * 0.5, n[1] * 0.5 + yOff, n[2] * 0.5], n);
    }
    if (r === rings / 2) {
      for (let k = 0; k <= seg; k++) {
        const th = (k / seg) * Math.PI * 2;
        const n = [Math.cos(th), 0, Math.sin(th)];
        vert(s, [n[0] * 0.5, -0.5, n[2] * 0.5], n);
      }
    }
  }
  const rows = rings + 1;
  for (let r = 0; r < rows; r++)
    for (let k = 0; k < seg; k++) {
      const a = r * (seg + 1) + k, b = a + seg + 1;
      s.i.push(a, b, a + 1, a + 1, b, b + 1);
    }
  return s;
}

/// Kegel: Radius 0.5, Höhe 1, Boden bei y=0
function cone(seg = 14) {
  const s = shape(), top = [0, 1, 0], c = [0, 0.33, 0];
  for (let k = 0; k < seg; k++) {
    const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
    const p0 = [Math.cos(a0) * 0.5, 0, Math.sin(a0) * 0.5], p1 = [Math.cos(a1) * 0.5, 0, Math.sin(a1) * 0.5];
    flatTri(s, p0, top, p1, c);
    flatTri(s, p1, [0, 0, 0], p0, [0, 0.5, 0]);
  }
  return s;
}

/// Dachprisma: Breite 1 (x), Höhe 1, Tiefe 1 (z), First entlang z
function prism() {
  const s = shape(), c = [0, 0.33, 0];
  const A = [-.5, 0, -.5], B = [.5, 0, -.5], C = [0, 1, -.5], A2 = [-.5, 0, .5], B2 = [.5, 0, .5], C2 = [0, 1, .5];
  flatTri(s, A, C, B, c); flatTri(s, B2, C2, A2, c);
  flatTri(s, A2, C2, C, c); flatTri(s, A2, C, A, c);
  flatTri(s, B, C, C2, c); flatTri(s, B, C2, B2, c);
  return s;
}

/// Ebene 10x10 (wie Unity), Normale nach oben
function plane() {
  const s = shape();
  for (const [x, z] of [[-5, -5], [5, -5], [5, 5], [-5, 5]]) vert(s, [x, 0, z], [0, 1, 0]);
  s.i.push(0, 1, 2, 0, 2, 3);
  return s;
}

/// Kegelstumpf: unten Radius 0.5, oben 0.5*k, Höhe 1 (Boden bei y=0)
export function frustum(k, seg = 40) {
  const s = shape();
  const ny = 0.5 * (1 - k);
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
    const n = [x, ny, z], l = Math.hypot(n[0], n[1], n[2]);
    vert(s, [x * 0.5, 0, z * 0.5], [n[0] / l, n[1] / l, n[2] / l]);
    vert(s, [x * 0.5 * k, 1, z * 0.5 * k], [n[0] / l, n[1] / l, n[2] / l]);
  }
  for (let i = 0; i < seg; i++) { const a = i * 2; s.i.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  const c = vert(s, [0, 1, 0], [0, 1, 0]), first = s.p.length / 3;
  for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2; vert(s, [Math.cos(a) * 0.5 * k, 1, Math.sin(a) * 0.5 * k], [0, 1, 0]); }
  for (let i = 0; i < seg; i++) s.i.push(c, first + i, first + i + 1);
  return s;
}

export const GEO = {
  cube: cube(), cylinder: cylinder(), sphere: sphere(), capsule: capsule(), cone: cone(), prism: prism(), plane: plane(),
  cylLow: cylinder(10),
};

/// Sammelt viele Teile in einen Puffer. Farben in sRGB (0..1).
/// Vertex: pos(3) normal(3) farbe(3) leuchten(1) glanz(1) = 11 floats
export class Builder {
  constructor() {
    this.v = [];
    this.i = [];
    this.stack = [ident()];
    this.emitters = [];   // Rauchquellen in Weltkoordinaten
  }
  get base() { return this.stack[this.stack.length - 1]; }
  push(pos, rot, scl) { this.stack.push(mul(this.base, trs(pos, rot, scl))); }
  pushMatrix(m) { this.stack.push(mul(this.base, m)); }
  pop() { this.stack.pop(); }

  add(name, pos, scl, col, o = {}) {
    const g = typeof name === 'string' ? GEO[name] : name;
    const M = mul(this.base, trs(pos, o.rot, scl));
    const N = normalMat(M);
    const e = o.e || 0, gl = o.g === undefined ? 0.15 : o.g;
    const start = this.v.length / 11;
    const P = g.p, Nn = g.n;
    for (let k = 0; k < P.length; k += 3) {
      const x = P[k], y = P[k + 1], z = P[k + 2];
      const nx = Nn[k], ny = Nn[k + 1], nz = Nn[k + 2];
      let tx = N[0] * nx + N[3] * ny + N[6] * nz, ty = N[1] * nx + N[4] * ny + N[7] * nz, tz = N[2] * nx + N[5] * ny + N[8] * nz;
      const l = Math.hypot(tx, ty, tz) || 1;
      this.v.push(
        M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14],
        tx / l, ty / l, tz / l, col[0], col[1], col[2], e, gl);
    }
    for (const idx of g.i) this.i.push(start + idx);
  }

  smoke(pos, size) {
    const M = this.base;
    this.emitters.push({ p: [M[0] * pos[0] + M[4] * pos[1] + M[8] * pos[2] + M[12], M[1] * pos[0] + M[5] * pos[1] + M[9] * pos[2] + M[13], M[2] * pos[0] + M[6] * pos[1] + M[10] * pos[2] + M[14]], size });
  }

  get empty() { return this.i.length === 0; }
}
