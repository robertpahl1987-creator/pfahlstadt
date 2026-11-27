(() => {
  // src/math.js
  var D2R = Math.PI / 180;
  function ident() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  }
  function mul(a, b, out = new Float32Array(16)) {
    const r = out === a || out === b ? new Float32Array(16) : out;
    for (let c = 0; c < 4; c++)
      for (let row = 0; row < 4; row++) {
        r[c * 4 + row] = a[row] * b[c * 4] + a[4 + row] * b[c * 4 + 1] + a[8 + row] * b[c * 4 + 2] + a[12 + row] * b[c * 4 + 3];
      }
    if (r !== out) out.set(r);
    return out;
  }
  function trs(p, rot, s) {
    const [rx, ry, rz] = rot ? [rot[0] * D2R, rot[1] * D2R, rot[2] * D2R] : [0, 0, 0];
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    const m00 = cy * cz + sy * sx * sz, m01 = -cy * sz + sy * sx * cz, m02 = sy * cx;
    const m10 = cx * sz, m11 = cx * cz, m12 = -sx;
    const m20 = -sy * cz + cy * sx * sz, m21 = sy * sz + cy * sx * cz, m22 = cy * cx;
    const sX = s ? s[0] : 1, sY = s ? s[1] : 1, sZ = s ? s[2] : 1;
    const m = new Float32Array(16);
    m[0] = m00 * sX;
    m[1] = m10 * sX;
    m[2] = m20 * sX;
    m[4] = m01 * sY;
    m[5] = m11 * sY;
    m[6] = m21 * sY;
    m[8] = m02 * sZ;
    m[9] = m12 * sZ;
    m[10] = m22 * sZ;
    m[12] = p ? p[0] : 0;
    m[13] = p ? p[1] : 0;
    m[14] = p ? p[2] : 0;
    m[15] = 1;
    return m;
  }
  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    const m = new Float32Array(16);
    m[0] = f / aspect;
    m[5] = f;
    m[10] = (far + near) * nf;
    m[11] = -1;
    m[14] = 2 * far * near * nf;
    return m;
  }
  function ortho(l, r, b, t, n, f) {
    const m = new Float32Array(16);
    m[0] = 2 / (r - l);
    m[5] = 2 / (t - b);
    m[10] = -2 / (f - n);
    m[12] = -(r + l) / (r - l);
    m[13] = -(t + b) / (t - b);
    m[14] = -(f + n) / (f - n);
    m[15] = 1;
    return m;
  }
  function lookAt(eye, target, up = [0, 1, 0]) {
    let z = norm(sub(eye, target));
    let x = norm(cross(up, z));
    if (len(x) < 1e-6) x = [1, 0, 0];
    const y = cross(z, x);
    const m = new Float32Array(16);
    m[0] = x[0];
    m[4] = x[1];
    m[8] = x[2];
    m[1] = y[0];
    m[5] = y[1];
    m[9] = y[2];
    m[2] = z[0];
    m[6] = z[1];
    m[10] = z[2];
    m[12] = -dot(x, eye);
    m[13] = -dot(y, eye);
    m[14] = -dot(z, eye);
    m[15] = 1;
    return m;
  }
  function invert(m) {
    const inv = new Float32Array(16);
    const a = m;
    inv[0] = a[5] * a[10] * a[15] - a[5] * a[11] * a[14] - a[9] * a[6] * a[15] + a[9] * a[7] * a[14] + a[13] * a[6] * a[11] - a[13] * a[7] * a[10];
    inv[4] = -a[4] * a[10] * a[15] + a[4] * a[11] * a[14] + a[8] * a[6] * a[15] - a[8] * a[7] * a[14] - a[12] * a[6] * a[11] + a[12] * a[7] * a[10];
    inv[8] = a[4] * a[9] * a[15] - a[4] * a[11] * a[13] - a[8] * a[5] * a[15] + a[8] * a[7] * a[13] + a[12] * a[5] * a[11] - a[12] * a[7] * a[9];
    inv[12] = -a[4] * a[9] * a[14] + a[4] * a[10] * a[13] + a[8] * a[5] * a[14] - a[8] * a[6] * a[13] - a[12] * a[5] * a[10] + a[12] * a[6] * a[9];
    inv[1] = -a[1] * a[10] * a[15] + a[1] * a[11] * a[14] + a[9] * a[2] * a[15] - a[9] * a[3] * a[14] - a[13] * a[2] * a[11] + a[13] * a[3] * a[10];
    inv[5] = a[0] * a[10] * a[15] - a[0] * a[11] * a[14] - a[8] * a[2] * a[15] + a[8] * a[3] * a[14] + a[12] * a[2] * a[11] - a[12] * a[3] * a[10];
    inv[9] = -a[0] * a[9] * a[15] + a[0] * a[11] * a[13] + a[8] * a[1] * a[15] - a[8] * a[3] * a[13] - a[12] * a[1] * a[11] + a[12] * a[3] * a[9];
    inv[13] = a[0] * a[9] * a[14] - a[0] * a[10] * a[13] - a[8] * a[1] * a[14] + a[8] * a[2] * a[13] + a[12] * a[1] * a[10] - a[12] * a[2] * a[9];
    inv[2] = a[1] * a[6] * a[15] - a[1] * a[7] * a[14] - a[5] * a[2] * a[15] + a[5] * a[3] * a[14] + a[13] * a[2] * a[7] - a[13] * a[3] * a[6];
    inv[6] = -a[0] * a[6] * a[15] + a[0] * a[7] * a[14] + a[4] * a[2] * a[15] - a[4] * a[3] * a[14] - a[12] * a[2] * a[7] + a[12] * a[3] * a[6];
    inv[10] = a[0] * a[5] * a[15] - a[0] * a[7] * a[13] - a[4] * a[1] * a[15] + a[4] * a[3] * a[13] + a[12] * a[1] * a[7] - a[12] * a[3] * a[5];
    inv[14] = -a[0] * a[5] * a[14] + a[0] * a[6] * a[13] + a[4] * a[1] * a[14] - a[4] * a[2] * a[13] - a[12] * a[1] * a[6] + a[12] * a[2] * a[5];
    inv[3] = -a[1] * a[6] * a[11] + a[1] * a[7] * a[10] + a[5] * a[2] * a[11] - a[5] * a[3] * a[10] - a[9] * a[2] * a[7] + a[9] * a[3] * a[6];
    inv[7] = a[0] * a[6] * a[11] - a[0] * a[7] * a[10] - a[4] * a[2] * a[11] + a[4] * a[3] * a[10] + a[8] * a[2] * a[7] - a[8] * a[3] * a[6];
    inv[11] = -a[0] * a[5] * a[11] + a[0] * a[7] * a[9] + a[4] * a[1] * a[11] - a[4] * a[3] * a[9] - a[8] * a[1] * a[7] + a[8] * a[3] * a[5];
    inv[15] = a[0] * a[5] * a[10] - a[0] * a[6] * a[9] - a[4] * a[1] * a[10] + a[4] * a[2] * a[9] + a[8] * a[1] * a[6] - a[8] * a[2] * a[5];
    let det = a[0] * inv[0] + a[1] * inv[4] + a[2] * inv[8] + a[3] * inv[12];
    if (Math.abs(det) < 1e-12) return ident();
    det = 1 / det;
    for (let i = 0; i < 16; i++) inv[i] *= det;
    return inv;
  }
  function normalMat(m) {
    const a00 = m[0], a01 = m[1], a02 = m[2], a10 = m[4], a11 = m[5], a12 = m[6], a20 = m[8], a21 = m[9], a22 = m[10];
    const b01 = a22 * a11 - a12 * a21, b11 = -a22 * a10 + a12 * a20, b21 = a21 * a10 - a11 * a20;
    let det = a00 * b01 + a01 * b11 + a02 * b21;
    if (Math.abs(det) < 1e-12) det = 1e-12;
    const id = 1 / det;
    const out = new Float32Array(9);
    out[0] = b01 * id;
    out[3] = b11 * id;
    out[6] = b21 * id;
    out[1] = (-a22 * a01 + a02 * a21) * id;
    out[4] = (a22 * a00 - a02 * a20) * id;
    out[7] = (-a21 * a00 + a01 * a20) * id;
    out[2] = (a12 * a01 - a02 * a11) * id;
    out[5] = (-a12 * a00 + a02 * a10) * id;
    out[8] = (a11 * a00 - a01 * a10) * id;
    return out;
  }
  function project(vp, v) {
    const x = vp[0] * v[0] + vp[4] * v[1] + vp[8] * v[2] + vp[12];
    const y = vp[1] * v[0] + vp[5] * v[1] + vp[9] * v[2] + vp[13];
    const w = vp[3] * v[0] + vp[7] * v[1] + vp[11] * v[2] + vp[15];
    return [x / w, y / w, w];
  }
  var sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  var add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  var scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  var cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  var len = (a) => Math.hypot(a[0], a[1], a[2]);
  var norm = (a) => {
    const l = len(a) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  var lerp = (a, b, t) => a + (b - a) * t;
  var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  var clamp01 = (v) => clamp(v, 0, 1);
  var lerpC = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  var mulC = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  function moveTowards(v, target, d) {
    return Math.abs(target - v) <= d ? target : v + Math.sign(target - v) * d;
  }
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = s * 1664525 + 1013904223 >>> 0;
      return s / 4294967296;
    };
  }
  function noise1(x) {
    const i = Math.floor(x), f = x - i;
    const h2 = (n) => {
      const s = Math.sin(n * 127.1) * 43758.5453;
      return s - Math.floor(s);
    };
    const u = f * f * (3 - 2 * f);
    return lerp(h2(i), h2(i + 1), u);
  }

  // src/geo.js
  function shape() {
    return { p: [], n: [], i: [] };
  }
  function vert(s, p, n) {
    s.p.push(p[0], p[1], p[2]);
    s.n.push(n[0], n[1], n[2]);
    return s.p.length / 3 - 1;
  }
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
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
      [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
      [[0, -1, 0], [0, 0, -1], [1, 0, 0]],
      [[0, 0, 1], [-1, 0, 0], [0, 1, 0]],
      [[0, 0, -1], [1, 0, 0], [0, 1, 0]]
    ];
    for (const [n, u, v] of faces) {
      const base = s.p.length / 3;
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
        vert(s, [0.5 * (n[0] + a * u[0] + b * v[0]), 0.5 * (n[1] + a * u[1] + b * v[1]), 0.5 * (n[2] + a * u[2] + b * v[2])], n);
      s.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    return s;
  }
  function cylinder(seg = 20) {
    const s = shape();
    for (let k = 0; k <= seg; k++) {
      const a = k / seg * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
      vert(s, [x * 0.5, -1, z * 0.5], [x, 0, z]);
      vert(s, [x * 0.5, 1, z * 0.5], [x, 0, z]);
    }
    for (let k = 0; k < seg; k++) {
      const a = k * 2;
      s.i.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
    for (const y of [-1, 1]) {
      const c = vert(s, [0, y, 0], [0, y, 0]);
      const first = s.p.length / 3;
      for (let k = 0; k <= seg; k++) {
        const a = k / seg * Math.PI * 2;
        vert(s, [Math.cos(a) * 0.5, y, Math.sin(a) * 0.5], [0, y, 0]);
      }
      for (let k = 0; k < seg; k++) s.i.push(c, first + k, first + k + 1);
    }
    return s;
  }
  function sphere(seg = 18, rings = 12) {
    const s = shape();
    for (let r = 0; r <= rings; r++) {
      const v = r / rings, phi = v * Math.PI;
      for (let k = 0; k <= seg; k++) {
        const th = k / seg * Math.PI * 2;
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
  function capsule(seg = 14, rings = 12) {
    const s = shape();
    for (let r = 0; r <= rings; r++) {
      const v = r / rings, phi = v * Math.PI;
      const yOff = v <= 0.5 ? 0.5 : -0.5;
      for (let k = 0; k <= seg; k++) {
        const th = k / seg * Math.PI * 2;
        const n = [Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)];
        vert(s, [n[0] * 0.5, n[1] * 0.5 + yOff, n[2] * 0.5], n);
      }
      if (r === rings / 2) {
        for (let k = 0; k <= seg; k++) {
          const th = k / seg * Math.PI * 2;
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
  function cone(seg = 14) {
    const s = shape(), top = [0, 1, 0], c = [0, 0.33, 0];
    for (let k = 0; k < seg; k++) {
      const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2;
      const p0 = [Math.cos(a0) * 0.5, 0, Math.sin(a0) * 0.5], p1 = [Math.cos(a1) * 0.5, 0, Math.sin(a1) * 0.5];
      flatTri(s, p0, top, p1, c);
      flatTri(s, p1, [0, 0, 0], p0, [0, 0.5, 0]);
    }
    return s;
  }
  function prism() {
    const s = shape(), c = [0, 0.33, 0];
    const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C2 = [0, 1, -0.5], A2 = [-0.5, 0, 0.5], B2 = [0.5, 0, 0.5], C22 = [0, 1, 0.5];
    flatTri(s, A, C2, B, c);
    flatTri(s, B2, C22, A2, c);
    flatTri(s, A2, C22, C2, c);
    flatTri(s, A2, C2, A, c);
    flatTri(s, B, C2, C22, c);
    flatTri(s, B, C22, B2, c);
    return s;
  }
  function plane() {
    const s = shape();
    for (const [x, z] of [[-5, -5], [5, -5], [5, 5], [-5, 5]]) vert(s, [x, 0, z], [0, 1, 0]);
    s.i.push(0, 1, 2, 0, 2, 3);
    return s;
  }
  function frustum(k, seg = 40) {
    const s = shape();
    const ny = 0.5 * (1 - k);
    for (let i = 0; i <= seg; i++) {
      const a = i / seg * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
      const n = [x, ny, z], l = Math.hypot(n[0], n[1], n[2]);
      vert(s, [x * 0.5, 0, z * 0.5], [n[0] / l, n[1] / l, n[2] / l]);
      vert(s, [x * 0.5 * k, 1, z * 0.5 * k], [n[0] / l, n[1] / l, n[2] / l]);
    }
    for (let i = 0; i < seg; i++) {
      const a = i * 2;
      s.i.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
    const c = vert(s, [0, 1, 0], [0, 1, 0]), first = s.p.length / 3;
    for (let i = 0; i <= seg; i++) {
      const a = i / seg * Math.PI * 2;
      vert(s, [Math.cos(a) * 0.5 * k, 1, Math.sin(a) * 0.5 * k], [0, 1, 0]);
    }
    for (let i = 0; i < seg; i++) s.i.push(c, first + i, first + i + 1);
    return s;
  }
  var GEO = {
    cube: cube(),
    cylinder: cylinder(),
    sphere: sphere(),
    capsule: capsule(),
    cone: cone(),
    prism: prism(),
    plane: plane(),
    cylLow: cylinder(10)
  };
  var Builder = class {
    constructor() {
      this.v = [];
      this.i = [];
      this.stack = [ident()];
      this.emitters = [];
    }
    get base() {
      return this.stack[this.stack.length - 1];
    }
    push(pos, rot, scl) {
      this.stack.push(mul(this.base, trs(pos, rot, scl)));
    }
    pushMatrix(m) {
      this.stack.push(mul(this.base, m));
    }
    pop() {
      this.stack.pop();
    }
    add(name, pos, scl, col, o = {}) {
      const g = typeof name === "string" ? GEO[name] : name;
      const M = mul(this.base, trs(pos, o.rot, scl));
      const N = normalMat(M);
      const e = o.e || 0, gl = o.g === void 0 ? 0.15 : o.g;
      const start2 = this.v.length / 11;
      const P = g.p, Nn = g.n;
      for (let k = 0; k < P.length; k += 3) {
        const x = P[k], y = P[k + 1], z = P[k + 2];
        const nx = Nn[k], ny = Nn[k + 1], nz = Nn[k + 2];
        let tx = N[0] * nx + N[3] * ny + N[6] * nz, ty = N[1] * nx + N[4] * ny + N[7] * nz, tz = N[2] * nx + N[5] * ny + N[8] * nz;
        const l = Math.hypot(tx, ty, tz) || 1;
        this.v.push(
          M[0] * x + M[4] * y + M[8] * z + M[12],
          M[1] * x + M[5] * y + M[9] * z + M[13],
          M[2] * x + M[6] * y + M[10] * z + M[14],
          tx / l,
          ty / l,
          tz / l,
          col[0],
          col[1],
          col[2],
          e,
          gl
        );
      }
      for (const idx of g.i) this.i.push(start2 + idx);
    }
    smoke(pos, size) {
      const M = this.base;
      this.emitters.push({ p: [M[0] * pos[0] + M[4] * pos[1] + M[8] * pos[2] + M[12], M[1] * pos[0] + M[5] * pos[1] + M[9] * pos[2] + M[13], M[2] * pos[0] + M[6] * pos[1] + M[10] * pos[2] + M[14]], size });
    }
    get empty() {
      return this.i.length === 0;
    }
  };

  // src/renderer.js
  var HEAD = "#version 300 es\nprecision highp float;\n";
  var GAMMA = "vec3 toOut(vec3 c){ c = c / (1.0 + c * 0.12); return pow(max(c, 0.0), vec3(1.0/2.2)); }\n";
  var LIT_VS = HEAD + `
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec3 aCol; layout(location=3) in vec2 aMat;
uniform mat4 uVP, uModel, uShadowVP; uniform mat3 uNrmM;
out vec3 vPos; out vec3 vNrm; out vec3 vCol; out vec2 vMat; out vec4 vSh;
void main(){
  vec4 wp = uModel * vec4(aPos, 1.0);
  vPos = wp.xyz; vNrm = uNrmM * aNrm; vCol = pow(aCol, vec3(2.2)); vMat = aMat; vSh = uShadowVP * vec4(wp.xyz + normalize(uNrmM * aNrm) * 0.12, 1.0);
  gl_Position = uVP * wp;
}`;
  var LIT_FS = HEAD + `precision highp sampler2DShadow;
in vec3 vPos; in vec3 vNrm; in vec3 vCol; in vec2 vMat; in vec4 vSh;
uniform vec3 uSunDir, uSunCol, uSkyAmb, uGroundAmb, uCam, uFogCol, uPLPos, uPLCol, uTint;
uniform float uFogDen, uPLRange, uShadowOn, uTexel, uEmis, uSnow;
uniform sampler2DShadow uShadow;
out vec4 o;
` + GAMMA + `
float shadowAt(){
  vec3 p = vSh.xyz / vSh.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float s = 0.0;
  s += texture(uShadow, vec3(p.xy + vec2(-0.5, -0.5) * uTexel, p.z - 0.0025));
  s += texture(uShadow, vec3(p.xy + vec2(0.5, -0.5) * uTexel, p.z - 0.0025));
  s += texture(uShadow, vec3(p.xy + vec2(-0.5, 0.5) * uTexel, p.z - 0.0025));
  s += texture(uShadow, vec3(p.xy + vec2(0.5, 0.5) * uTexel, p.z - 0.0025));
  return s * 0.25;
}
void main(){
  vec3 n = normalize(vNrm);
  vec3 base = vCol * uTint;
  base = mix(base, vec3(0.9, 0.93, 0.97), uSnow * smoothstep(0.55, 0.85, n.y) * (1.0 - clamp(vMat.x, 0.0, 1.0)));
  float ndl = max(dot(n, uSunDir), 0.0);
  float sh = uShadowOn > 0.5 ? shadowAt() : 1.0;
  vec3 v = normalize(uCam - vPos);
  vec3 h = normalize(uSunDir + v);
  float gl = vMat.y;
  float spec = pow(max(dot(n, h), 0.0), mix(6.0, 140.0, gl)) * gl * 0.9;
  vec3 amb = mix(uGroundAmb, uSkyAmb, n.y * 0.5 + 0.5);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.18;
  vec3 col = base * (amb + uSunCol * ndl * sh) + uSunCol * spec * sh + amb * rim;
  vec3 lv = uPLPos - vPos; float d = length(lv);
  float att = clamp(1.0 - d / uPLRange, 0.0, 1.0); att *= att;
  col += base * uPLCol * att * (max(dot(n, lv / max(d, 0.001)), 0.0) * 0.8 + 0.2);
  col += vCol * vMat.x * uEmis;
  float dist = length(uCam - vPos);
  float f = 1.0 - exp(-pow(dist * uFogDen, 2.0));
  col = mix(col, uFogCol, f);
  o = vec4(toOut(col), 1.0);
}`;
  var DEPTH_VS = HEAD + `layout(location=0) in vec3 aPos; uniform mat4 uVP, uModel; void main(){ gl_Position = uVP * uModel * vec4(aPos,1.0); }`;
  var DEPTH_FS = HEAD + `out vec4 o; void main(){ o = vec4(1.0); }`;
  var SKY_VS = HEAD + `out vec2 vNdc; void main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); vNdc = p*2.0-1.0; gl_Position = vec4(vNdc, 0.9999, 1.0); }`;
  var SKY_FS = HEAD + `in vec2 vNdc; uniform mat4 uInvVP; uniform vec3 uCam, uSunDir, uZenith, uHorizon, uSunCol, uFogCol, uCloudCol;
uniform float uTime, uCloud, uNight; out vec4 o;
` + GAMMA + `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++){ s += a * noise(p); p *= 2.03; a *= 0.5; } return s + 0.12; }
void main(){
  vec4 w = uInvVP * vec4(vNdc, 1.0, 1.0);
  vec3 d = normalize(w.xyz / w.w - uCam);
  float h = max(d.y, 0.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.45));
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunCol * (pow(sd, 900.0) * 6.0 + pow(sd, 10.0) * 0.22);
  if (d.y > 0.0) {
    vec2 uv = d.xz / (d.y + 0.12) * 0.7 + vec2(uTime * 0.012, uTime * 0.004);
    float c = smoothstep(0.42 - 0.2 * uCloud, 0.85, fbm(uv));
    float lit = 0.75 + 0.25 * noise(uv * 3.0 + 3.0);
    col = mix(col, uCloudCol * lit, c * (0.6 + 0.35 * uCloud) * smoothstep(0.0, 0.25, d.y));
    float st = step(0.9975, hash(floor(d.xz / (d.y + 0.05) * 160.0)));
    col += vec3(st) * uNight * (1.0 - c) * smoothstep(0.05, 0.4, d.y);
  }
  col = mix(uFogCol, col, smoothstep(-0.02, 0.16, d.y));
  o = vec4(toOut(col), 1.0);
}`;
  var WATER_VS = HEAD + `layout(location=0) in vec3 aPos; uniform mat4 uVP; uniform float uY; out vec3 vPos;
void main(){ vPos = vec3(aPos.x * 140.0, uY, aPos.z * 140.0); gl_Position = uVP * vec4(vPos, 1.0); }`;
  var WATER_FS = HEAD + `in vec3 vPos; uniform vec3 uCam, uSunDir, uSunCol, uFogCol, uDeep, uShallow, uZenith, uHorizon, uPLPos, uPLCol;
uniform float uFogDen, uTime, uStorm, uPLRange, uY; out vec4 o;
` + GAMMA + `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
vec2 swell(vec2 p){
  float t = uTime; vec2 g = vec2(0.0); float a = 0.045 + 0.16 * uStorm;
  vec2 d1 = normalize(vec2(1.0, 0.3)), d2 = normalize(vec2(-0.4, 1.0)), d3 = normalize(vec2(0.7, -0.8));
  g += d1 * cos(dot(d1, p) * 0.45 + t * 1.0) * 0.45 * a;
  g += d2 * cos(dot(d2, p) * 0.9 + t * 1.4) * 0.9 * a * 0.6;
  g += d3 * cos(dot(d3, p) * 1.9 + t * 2.1) * 1.9 * a * 0.3;
  return g;
}
void main(){
  vec3 v = normalize(uCam - vPos);
  float dist = length(uCam - vPos);
  // feine Kr\xE4uselung als Sinuswellen (g\xFCnstig), zur Ferne hin ausblenden
  float fade = 1.0 - smoothstep(30.0, 160.0, dist);
  float t = uTime;
  vec2 rp = vPos.xz;
  vec2 rg = vec2(cos(rp.x * 2.7 + rp.y * 0.9 + t * 2.2), cos(rp.y * 3.1 - rp.x * 0.7 + t * 1.8)) * 0.5
          + vec2(cos(rp.x * 5.3 - rp.y * 2.1 + t * 3.1), cos(rp.y * 4.7 + rp.x * 1.9 - t * 2.6)) * 0.25;
  vec2 g = swell(vPos.xz) + rg * (0.025 + 0.12 * uStorm) * fade;
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));

  float ndv = max(dot(n, v), 0.0);
  float fres = 0.02 + 0.6 * pow(1.0 - ndv, 5.0);
  vec3 r = reflect(-v, n);
  vec3 sky = mix(uHorizon, uZenith, pow(clamp(r.y, 0.0, 1.0), 0.55)) * 0.8;

  // Wasserfarbe: flach = t\xFCrkis, tief = dunkelblau
  float depth = max(uY, 0.0);
  vec3 body = mix(uShallow, uDeep, smoothstep(0.2, 4.5, depth));
  // Licht scheint durch die Wellenk\xE4mme (Streulicht)
  float sss = pow(max(dot(v, -uSunDir + vec3(0.0, 0.6, 0.0)), 0.0), 3.0) * max(g.x + g.y + 0.2, 0.0);
  body += uShallow * sss * 0.25 * length(uSunCol);
  body *= 0.7 + 0.35 * max(dot(n, uSunDir), 0.0) * min(length(uSunCol), 1.2);

  vec3 col = mix(body, sky, fres);
  // Sonnenglitzern
  float sp = min(pow(max(dot(r, uSunDir), 0.0), 2500.0) * 0.9, 0.6) + pow(max(dot(r, uSunDir), 0.0), 300.0) * 0.04;
  col += uSunCol * sp;
  // Leuchtturm spiegelt sich
  vec3 lv = uPLPos - vPos; float d = length(lv);
  col += uPLCol * pow(max(dot(r, lv / d), 0.0), 140.0) * clamp(1.0 - d / (uPLRange * 2.5), 0.0, 1.0) * 0.5;
  // Gischt bei Sturm
  if (uStorm > 0.01) {
    float foam = smoothstep(0.30, 0.55, length(swell(vPos.xz))) * uStorm;
    foam *= 0.5 + 0.5 * vnoise(vPos.xz * 1.5 + uTime);
    col = mix(col, vec3(0.88, 0.92, 0.95), foam * 0.7);
  }

  col = mix(col, uFogCol, 1.0 - exp(-pow(dist * uFogDen, 2.0)));
  float alpha = mix(0.55, 0.93, smoothstep(0.0, 2.5, depth));
  alpha = max(alpha, fres);
  o = vec4(toOut(col), alpha);
}`;
  var BEAM_VS = HEAD + `layout(location=0) in vec3 aPos; uniform mat4 uVP, uModel; out vec3 vPos;
void main(){ vec4 wp = uModel * vec4(aPos,1.0); vPos = wp.xyz; gl_Position = uVP * wp; }`;
  var BEAM_FS = HEAD + `in vec3 vPos; uniform vec3 uOrigin, uColor; uniform float uLen, uAlpha; out vec4 o;
void main(){ float t = 1.0 - clamp(length(vPos - uOrigin) / uLen, 0.0, 1.0); o = vec4(uColor * t * t * uAlpha, 1.0); }`;
  var PT_VS = HEAD + `layout(location=0) in vec3 aPos; layout(location=1) in vec2 aSA; uniform mat4 uVP; uniform vec3 uCam; uniform float uPx;
out float vA; void main(){ gl_Position = uVP * vec4(aPos,1.0); gl_PointSize = clamp(aSA.x * uPx / max(gl_Position.w, 0.1), 1.0, 256.0); vA = aSA.y; }`;
  var PT_FS = HEAD + `in float vA; uniform vec3 uColor; uniform vec3 uFogCol; out vec4 o;
void main(){ vec2 p = gl_PointCoord * 2.0 - 1.0; float d = dot(p,p); if (d > 1.0) discard; float a = (1.0 - d) * vA; o = vec4(pow(uColor, vec3(1.0/2.2)), a); }`;
  var LINE_VS = HEAD + `layout(location=0) in vec4 aP; uniform mat4 uVP; out float vA; void main(){ gl_Position = uVP * vec4(aP.xyz,1.0); vA = aP.w; }`;
  var LINE_FS = HEAD + `in float vA; uniform vec3 uColor; out vec4 o; void main(){ o = vec4(uColor, vA); }`;
  function toLin(c) {
    return [Math.pow(c[0], 2.2), Math.pow(c[1], 2.2), Math.pow(c[2], 2.2)];
  }
  var Renderer = class {
    constructor(canvas) {
      const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance", stencil: false });
      if (!gl) throw new Error("WebGL2 wird von diesem Ger\xE4t nicht unterst\xFCtzt.");
      this.gl = gl;
      this.canvas = canvas;
      this.lit = this.prog(LIT_VS, LIT_FS);
      this.depth = this.prog(DEPTH_VS, DEPTH_FS);
      this.sky = this.prog(SKY_VS, SKY_FS);
      this.water = this.prog(WATER_VS, WATER_FS);
      this.beam = this.prog(BEAM_VS, BEAM_FS);
      this.pt = this.prog(PT_VS, PT_FS);
      this.line = this.prog(LINE_VS, LINE_FS);
      this.emptyVao = gl.createVertexArray();
      this.waterVao = gl.createVertexArray();
      gl.bindVertexArray(this.waterVao);
      const wb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, wb);
      const W = [];
      const N = 24;
      for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
        const a = [x / N * 2 - 1, z / N * 2 - 1], b = [(x + 1) / N * 2 - 1, (z + 1) / N * 2 - 1];
        W.push(a[0] * 5, 0, a[1] * 5, b[0] * 5, 0, a[1] * 5, b[0] * 5, 0, b[1] * 5, a[0] * 5, 0, a[1] * 5, b[0] * 5, 0, b[1] * 5, a[0] * 5, 0, b[1] * 5);
      }
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(W), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
      this.waterCount = W.length / 3;
      this.ptVao = gl.createVertexArray();
      this.ptBuf = gl.createBuffer();
      gl.bindVertexArray(this.ptVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.ptBuf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
      this.lineVao = gl.createVertexArray();
      this.lineBuf = gl.createBuffer();
      gl.bindVertexArray(this.lineVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
      gl.bindVertexArray(null);
      this.shadowSize = 0;
      this.ident = ident();
      this.identN = normalMat(this.ident);
    }
    prog(vs, fs) {
      const gl = this.gl;
      const mk = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("Shader: " + gl.getShaderInfoLog(s));
        return s;
      };
      const p = gl.createProgram();
      gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("Programm: " + gl.getProgramInfoLog(p));
      const u = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i);
        u[info.name] = gl.getUniformLocation(p, info.name);
      }
      return { p, u };
    }
    /// Builder → GPU-Mesh
    upload(b) {
      const gl = this.gl;
      if (b.empty) return null;
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const vb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(b.v), gl.STATIC_DRAW);
      const ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(b.i), gl.STATIC_DRAW);
      const S = 44;
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 12);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 3, gl.FLOAT, false, S, 24);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 2, gl.FLOAT, false, S, 36);
      gl.bindVertexArray(null);
      return { vao, vb, ib, count: b.i.length };
    }
    free(m) {
      if (!m) return;
      const gl = this.gl;
      gl.deleteVertexArray(m.vao);
      gl.deleteBuffer(m.vb);
      gl.deleteBuffer(m.ib);
    }
    ensureShadow(size) {
      const gl = this.gl;
      if (size === this.shadowSize) return;
      this.lastShadowVP = null;
      if (this.shadowTex) {
        gl.deleteTexture(this.shadowTex);
        gl.deleteFramebuffer(this.shadowFb);
        this.shadowTex = null;
      }
      this.shadowSize = size;
      if (!size) return;
      this.shadowTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, size, size);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
      this.shadowFb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
      gl.drawBuffers([gl.NONE]);
      gl.readBuffer(gl.NONE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    /// Zeichnet ein komplettes Bild
    render(s) {
      const gl = this.gl;
      const W = this.canvas.width, H = this.canvas.height;
      const VP = mul(s.proj, s.view);
      this.ensureShadow(s.shadowSize);
      let shadowVP = this.ident;
      this.frameNo = (this.frameNo || 0) + 1;
      const redoShadow = this.frameNo % 3 === 1 || !this.lastShadowVP;
      if (this.shadowSize && !redoShadow) shadowVP = this.lastShadowVP;
      else if (this.shadowSize) {
        const r = s.shadowRadius;
        const up = Math.abs(s.sunDir[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
        const lv = lookAt(add(s.shadowCenter, scale(s.sunDir, 200)), s.shadowCenter, up);
        shadowVP = mul(ortho(-r, r, -r, r, 10, 420), lv);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFb);
        gl.viewport(0, 0, this.shadowSize, this.shadowSize);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(2, 4);
        gl.useProgram(this.depth.p);
        gl.uniformMatrix4fv(this.depth.u.uVP, false, shadowVP);
        for (const d of s.draws) {
          if (!d.mesh || d.noShadow) continue;
          gl.uniformMatrix4fv(this.depth.u.uModel, false, d.model || this.ident);
          gl.bindVertexArray(d.mesh.vao);
          gl.drawElements(gl.TRIANGLES, d.mesh.count, gl.UNSIGNED_INT, 0);
        }
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.lastShadowVP = shadowVP;
      }
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.disable(gl.CULL_FACE);
      const L = (c) => toLin(c);
      const fogL = L(s.fogCol), sunL = s.sunCol.map((v) => v), zen = L(s.zenith), hor = L(s.horizon);
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.useProgram(this.sky.p);
      const su = this.sky.u;
      gl.uniformMatrix4fv(su.uInvVP, false, invert(VP));
      gl.uniform3fv(su.uCam, s.camPos);
      gl.uniform3fv(su.uSunDir, s.sunDir);
      gl.uniform3fv(su.uZenith, zen);
      gl.uniform3fv(su.uHorizon, hor);
      gl.uniform3fv(su.uSunCol, sunL);
      gl.uniform3fv(su.uFogCol, fogL);
      gl.uniform3fv(su.uCloudCol, L(s.cloudCol));
      gl.uniform1f(su.uTime, s.time);
      gl.uniform1f(su.uCloud, s.cloud);
      gl.uniform1f(su.uNight, s.night);
      gl.bindVertexArray(this.emptyVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.depthMask(true);
      gl.enable(gl.DEPTH_TEST);
      const lu = this.lit.u;
      gl.useProgram(this.lit.p);
      gl.uniformMatrix4fv(lu.uVP, false, VP);
      gl.uniformMatrix4fv(lu.uShadowVP, false, shadowVP);
      gl.uniform3fv(lu.uSunDir, s.sunDir);
      gl.uniform3fv(lu.uSunCol, sunL);
      gl.uniform3fv(lu.uSkyAmb, L(s.ambSky));
      gl.uniform3fv(lu.uGroundAmb, L(s.ambGround));
      gl.uniform3fv(lu.uCam, s.camPos);
      gl.uniform3fv(lu.uFogCol, fogL);
      gl.uniform1f(lu.uFogDen, s.fogDen);
      gl.uniform3fv(lu.uPLPos, s.plPos);
      gl.uniform3fv(lu.uPLCol, s.plCol);
      gl.uniform1f(lu.uPLRange, s.plRange);
      gl.uniform1f(lu.uShadowOn, this.shadowSize ? 1 : 0);
      gl.uniform1f(lu.uSnow, s.snow || 0);
      gl.uniform1f(lu.uTexel, this.shadowSize ? 1 / this.shadowSize : 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.shadowTex || null);
      gl.uniform1i(lu.uShadow, 0);
      for (const d of s.draws) {
        if (!d.mesh) continue;
        gl.uniformMatrix4fv(lu.uModel, false, d.model || this.ident);
        gl.uniformMatrix3fv(lu.uNrmM, false, d.model ? d.nrm || normalMat(d.model) : this.identN);
        gl.uniform3fv(lu.uTint, d.tint || [1, 1, 1]);
        gl.uniform1f(lu.uEmis, d.emis === void 0 ? 1 : d.emis);
        gl.bindVertexArray(d.mesh.vao);
        gl.drawElements(gl.TRIANGLES, d.mesh.count, gl.UNSIGNED_INT, 0);
      }
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      const wu = this.water.u;
      gl.useProgram(this.water.p);
      gl.uniformMatrix4fv(wu.uVP, false, VP);
      gl.uniform1f(wu.uY, s.waterY);
      gl.uniform3fv(wu.uCam, s.camPos);
      gl.uniform3fv(wu.uSunDir, s.sunDir);
      gl.uniform3fv(wu.uSunCol, sunL);
      gl.uniform3fv(wu.uFogCol, fogL);
      gl.uniform1f(wu.uFogDen, s.fogDen);
      gl.uniform3fv(wu.uDeep, L(s.waterDeep));
      gl.uniform3fv(wu.uShallow, L(s.waterShallow));
      gl.uniform3fv(wu.uZenith, zen);
      gl.uniform3fv(wu.uHorizon, hor);
      gl.uniform3fv(wu.uPLPos, s.plPos);
      gl.uniform3fv(wu.uPLCol, s.plCol);
      gl.uniform1f(wu.uPLRange, s.plRange);
      gl.uniform1f(wu.uTime, s.time);
      gl.uniform1f(wu.uStorm, s.storm);
      gl.bindVertexArray(this.waterVao);
      gl.drawArrays(gl.TRIANGLES, 0, this.waterCount);
      if (s.smoke && s.smokeCount) {
        gl.useProgram(this.pt.p);
        gl.uniformMatrix4fv(this.pt.u.uVP, false, VP);
        gl.uniform1f(this.pt.u.uPx, H / (2 * Math.tan(s.fov / 2)));
        gl.uniform3fv(this.pt.u.uColor, s.smokeCol);
        gl.bindVertexArray(this.ptVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.ptBuf);
        gl.bufferData(gl.ARRAY_BUFFER, s.smoke.subarray(0, s.smokeCount * 5), gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.POINTS, 0, s.smokeCount);
      }
      if (s.rain && s.rainCount) {
        gl.useProgram(this.line.p);
        gl.uniformMatrix4fv(this.line.u.uVP, false, VP);
        gl.uniform3fv(this.line.u.uColor, [0.8, 0.86, 0.92]);
        gl.bindVertexArray(this.lineVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
        gl.bufferData(gl.ARRAY_BUFFER, s.rain.subarray(0, s.rainCount * 8), gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.LINES, 0, s.rainCount * 2);
      }
      if (s.beams && s.beams.length) {
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.useProgram(this.beam.p);
        gl.uniformMatrix4fv(this.beam.u.uVP, false, VP);
        for (const b of s.beams) {
          gl.uniformMatrix4fv(this.beam.u.uModel, false, b.model);
          gl.uniform3fv(this.beam.u.uOrigin, b.origin);
          gl.uniform3fv(this.beam.u.uColor, [1, 0.85, 0.55]);
          gl.uniform1f(this.beam.u.uLen, b.len);
          gl.uniform1f(this.beam.u.uAlpha, b.alpha);
          gl.bindVertexArray(b.mesh.vao);
          gl.drawElements(gl.TRIANGLES, b.mesh.count, gl.UNSIGNED_INT, 0);
        }
      }
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      gl.bindVertexArray(null);
    }
  };

  // src/progress.js
  var today = () => {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };
  var VIP_PTS = [0, 100, 300, 700, 1500, 3e3, 5e3, 8e3, 12e3, 17e3, 25e3];
  var VIP_PERKS = [
    "",
    "T\xE4gliche VIP-Truhe \xB7 +2 % Produktion",
    "+5 % schneller bauen",
    "+1 Bautrupp (3 gleichzeitig)",
    "+10 % Sammler-Traglast \xB7 +5 % Produktion",
    "+1 Platz in der Bauwarteschlange \xB7 +10 % schneller ausbilden \xB7 +10 % schneller bauen",
    "+5 % Angriff und Verteidigung",
    "+1 Bautrupp (4 gleichzeitig) \xB7 +8 % Produktion",
    "Lazarett rettet +10 % mehr \xB7 +15 % schneller bauen",
    "+10 % schnellere Fahrten \xB7 +20 % schneller ausbilden",
    "+12 % Produktion \xB7 +10 % Angriff und Verteidigung \xB7 goldener VIP-Rahmen"
  ];
  function vipLevel(c) {
    const p = c.s.vipPts || 0;
    let L = 0;
    for (let i = 1; i <= 10; i++) if (p >= VIP_PTS[i]) L = i;
    return L;
  }
  function addVip(c, n) {
    const before = vipLevel(c);
    c.s.vipPts = (c.s.vipPts || 0) + n;
    const after = vipLevel(c);
    if (after > before) c.msg(`\u{1F451} VIP-Stufe ${after} erreicht! ${VIP_PERKS[after]}`);
  }
  var vipChestCan = (c) => vipLevel(c) >= 1 && c.s.vipDay !== today();
  function vipChest(c) {
    const L = vipLevel(c), f = 1 + 0.3 * (c.towerLevel - 1);
    return { res: [1, 1, 1, 0.3].map((v) => Math.round(300 * L * v * f)), items: { sp5: L, ...L >= 4 ? { sp15: L - 3 } : {}, ...L >= 8 ? { sp60: L - 7 } : {} }, medals: Math.ceil(L / 3) };
  }
  function claimVipChest(c) {
    if (!vipChestCan(c)) return null;
    const r = vipChest(c), s = c.s;
    r.res.forEach((v, i) => v && c.addRes(i, v));
    s.items = s.items || {};
    for (const k in r.items) s.items[k] = (s.items[k] || 0) + r.items[k];
    s.medals = (s.medals || 0) + r.medals;
    s.vipDay = today();
    return r;
  }
  var TECH = [
    { id: "pile", ic: "\u{1FAB5}", name: "Bessere Pf\xE4hle", text: "+0,3 m Deckh\xF6he", cost: [300, 60, 0, 60] },
    { id: "gath", ic: "\u{1F9FA}", name: "Flinke Sammler", text: "+10 % Traglast der Sammler", cost: [200, 120, 60, 20] },
    { id: "atk", ic: "\u{1F531}", name: "Sch\xE4rfere Harpunen", text: "+5 % Angriff", cost: [250, 80, 0, 100] },
    { id: "def", ic: "\u{1F6E1}\uFE0F", name: "Eichenschilde", text: "+5 % Verteidigung", cost: [300, 60, 0, 80] },
    { id: "prod", ic: "\u{1F372}", name: "Wattk\xFCche", text: "+5 % Produktion", cost: [200, 200, 100, 0] },
    { id: "build", ic: "\u{1F528}", name: "Zimmermannskunst", text: "\u22126 % Bauzeit", cost: [400, 50, 0, 60] },
    { id: "drill", ic: "\u{1F393}", name: "Drill", text: "\u22128 % Ausbildungszeit", cost: [150, 150, 50, 60] },
    { id: "med", ic: "\u{1FA79}", name: "Wundkr\xE4uter", text: "+5 % gerettete Verwundete", cost: [100, 200, 200, 0] },
    { id: "store", ic: "\u{1F4E6}", name: "Speicherkunst", text: "+10 % Lagerplatz", cost: [350, 100, 100, 20] },
    { id: "navi", ic: "\u{1F9ED}", name: "Navigation", text: "\u22126 % Fahrzeit", cost: [250, 100, 50, 80] }
  ];
  var TECH_MAX = 5;
  var techLv = (c, id) => (c.s.tech || {})[id] || 0;
  var techCost = (t, k) => t.cost.map((v) => Math.round(v * Math.pow(1.8, k - 1)));
  var techTime = (c, k) => 60 * Math.pow(2, k - 1) / (1 + 0.1 * Math.max(0, c.levels(T.AKADEMIE) - 1));
  function techBlocker(c, id) {
    const t = TECH.find((x) => x.id === id), k = techLv(c, id) + 1, ak = c.levels(T.AKADEMIE);
    if (ak <= 0) return "Erst die Akademie bauen";
    if (k > TECH_MAX) return "Fertig erforscht";
    if (c.s.research) return "Es wird schon geforscht";
    if (ak < 2 * k - 1) return `Braucht Akademie Stufe ${2 * k - 1}`;
    if (!c.canAfford(techCost(t, k))) return "Zu wenig Rohstoffe";
    return null;
  }
  function startTech(c, id) {
    if (techBlocker(c, id)) return false;
    const t = TECH.find((x) => x.id === id), k = techLv(c, id) + 1, tt = techTime(c, k);
    c.pay(techCost(t, k));
    c.s.research = { id, left: tt, total: tt };
    c.msg(`\u{1F4DA} Forschung gestartet: ${t.name} ${k}`);
    return true;
  }
  function researchTick(c, dt) {
    const r = c.s.research;
    if (!r) return;
    if (c.levels(T.AKADEMIE) <= 0) return;
    r.left -= dt;
    if (r.left <= 0) {
      c.s.tech = c.s.tech || {};
      c.s.tech[r.id] = (c.s.tech[r.id] || 0) + 1;
      const t = TECH.find((x) => x.id === r.id);
      c.msg(`\u{1F4DA} Erforscht: ${t.name} Stufe ${c.s.tech[r.id]} (${t.text})`);
      c.s.research = null;
    }
  }
  var CAPTAINS = [
    { id: "hanne", ic: "\u{1F30A}", name: "Hanne Gezeitenkund", text: "+20 % Kampfkraft bei Ebbe", cost: 5 },
    { id: "okko", ic: "\u26C8\uFE0F", name: "Okko Sturmkapit\xE4n", text: "+20 % Kampfkraft bei Flut", cost: 5 },
    { id: "gesa", ic: "\u{1F4AA}", name: "Gesa Eisenfaust", text: "+12 % Kampfkraft immer", cost: 10 },
    { id: "fiete", ic: "\u{1F4B0}", name: "Fiete Pl\xFCnderer", text: "+30 % Beute", cost: 10 },
    { id: "wiebke", ic: "\u{1F9ED}", name: "Wiebke Lotsin", text: "\u221225 % Fahrzeit", cost: 15 }
  ];
  var capOf = (c, id) => (c.s.captains || {})[id];
  var capMul = (lvl) => 1 + 0.1 * (lvl - 1);
  function capFree(c, id) {
    const k = capOf(c, id);
    return k && !(k.busy > Date.now());
  }
  function hireCaptain(c, id) {
    const d = CAPTAINS.find((x) => x.id === id), s = c.s;
    if (!d || capOf(c, id)) return "Schon angeheuert";
    if ((s.medals || 0) < d.cost) return `Braucht ${d.cost} Kapit\xE4nsabzeichen`;
    s.medals -= d.cost;
    s.captains = s.captains || {};
    s.captains[id] = { lvl: 1, xp: 0, busy: 0 };
    c.msg(`\u{1F396}\uFE0F ${d.name} ist an Bord!`);
    return null;
  }
  function upCaptain(c, id) {
    const k = capOf(c, id), s = c.s;
    if (!k) return "Nicht angeheuert";
    if (k.lvl >= 10) return "H\xF6chste Stufe";
    const need = k.lvl * 2;
    if ((s.medals || 0) < need) return `Braucht ${need} Abzeichen`;
    s.medals -= need;
    k.lvl++;
    c.msg(`\u{1F396}\uFE0F ${CAPTAINS.find((x) => x.id === id).name} ist jetzt Stufe ${k.lvl}.`);
    return null;
  }
  var GEAR = [
    { id: "hut", ic: "\u{1F3A9}", name: "Kapit\xE4nshut", text: "+1,5 % Kampfkraft je Stufe" },
    { id: "saebel", ic: "\u{1F5E1}\uFE0F", name: "Enters\xE4bel", text: "+1,5 % Kampfkraft je Stufe" },
    { id: "mantel", ic: "\u{1F9E5}", name: "\xD6lzeugmantel", text: "+2 % Beute je Stufe" },
    { id: "kompass", ic: "\u{1F9ED}", name: "Messingkompass", text: "\u22121 % Fahrzeit je Stufe" }
  ];
  var GEAR_MAX = 10;
  var gearLv = (c, cap, slot) => ((c.s.gear || {})[cap] || {})[slot] || 0;
  var gearCost = (k) => ({ ore: 2 + 2 * k, metal: 50 * k });
  function gearBlocker(c, cap, slot) {
    if (!capOf(c, cap)) return "Kapit\xE4n erst anheuern";
    const k = gearLv(c, cap, slot) + 1, g = gearCost(k);
    if (k > GEAR_MAX) return "H\xF6chste Stufe";
    if (k > capOf(c, cap).lvl + 2) return `Braucht Kapit\xE4n Stufe ${k - 2}`;
    if ((c.s.ore || 0) < g.ore) return `Braucht ${g.ore} \u{1F529}`;
    if (c.s.res[3] < g.metal) return "Zu wenig Altmetall";
    return null;
  }
  function forgeGear(c, cap, slot) {
    const e = gearBlocker(c, cap, slot);
    if (e) return e;
    const k = gearLv(c, cap, slot) + 1, g = gearCost(k), s = c.s;
    s.ore -= g.ore;
    s.res[3] -= g.metal;
    s.gear = s.gear || {};
    s.gear[cap] = s.gear[cap] || {};
    s.gear[cap][slot] = k;
    c.msg(`\u2692\uFE0F ${GEAR.find((x) => x.id === slot).name} f\xFCr ${CAPTAINS.find((x) => x.id === cap).name.split(" ")[0]} ist jetzt Stufe ${k}.`);
    return null;
  }
  var gAtk = (c, id) => 1 + 0.015 * (gearLv(c, id, "hut") + gearLv(c, id, "saebel"));
  function capAtk(c, id, tide) {
    const k = capOf(c, id);
    if (!k) return 1;
    const m = capMul(k.lvl), g = gAtk(c, id);
    if (id === "hanne") return (tide === -1 ? 1 + 0.2 * m : 1) * g;
    if (id === "okko") return (tide === 1 ? 1 + 0.2 * m : 1) * g;
    if (id === "gesa") return (1 + 0.12 * m) * g;
    return g;
  }
  var capLoot = (c, id) => capOf(c, id) ? (id === "fiete" ? 1 + 0.3 * capMul(capOf(c, id).lvl) : 1) * (1 + 0.02 * gearLv(c, id, "mantel")) : 1;
  var capSpeed = (c, id) => capOf(c, id) ? (id === "wiebke" ? Math.max(0.5, 1 - 0.25 * capMul(capOf(c, id).lvl) * 0.8) : 1) * (1 - 0.01 * gearLv(c, id, "kompass")) : 1;
  function capSend(c, id, travel) {
    const k = capOf(c, id);
    if (k) {
      k.busy = Date.now() + travel * 2e3 + 5e3;
      k.xp = (k.xp || 0) + 1;
    }
  }
  var BOAT_COST = [220, 0, 0, 70];
  var BOAT_TIME = 60;
  var BOAT_CAP = 25;
  var maxBoats = (c) => 2 * c.levels(T.WERFT);
  function boatBlocker(c) {
    if (c.levels(T.WERFT) <= 0) return "Erst die Werft bauen";
    if ((c.s.boats || 0) + (c.s.boatQ ? 1 : 0) >= maxBoats(c)) return `H\xF6chstens ${maxBoats(c)} Kutter (Werft ausbauen)`;
    if (c.s.boatQ) return "Es wird schon ein Kutter gebaut";
    if (!c.canAfford(BOAT_COST)) return "Zu wenig Rohstoffe";
    return null;
  }
  function buildBoat(c) {
    if (boatBlocker(c)) return false;
    c.pay(BOAT_COST);
    const tt = BOAT_TIME / (1 + 0.1 * (c.levels(T.WERFT) - 1));
    c.s.boatQ = { left: tt, total: tt };
    c.msg("\u2693 Ein Kutter wird gebaut.");
    return true;
  }
  function boatTick(c, dt) {
    const q = c.s.boatQ;
    if (!q) return;
    q.left -= dt;
    if (q.left <= 0) {
      c.s.boats = (c.s.boats || 0) + 1;
      c.s.boatQ = null;
      c.msg("\u2693 Neuer Kutter vom Stapel gelaufen!");
    }
  }
  var fleetFits = (c, u) => (c.s.boats || 0) * BOAT_CAP >= uSum(u) && uSum(u) > 0;
  var fleetSpeed = (c, u) => fleetFits(c, u) ? 0.75 : 1;
  var fleetLoot = (c, u) => fleetFits(c, u) ? 1.25 : 1;
  function mods(c) {
    const v = vipLevel(c), L = c.levels(T.WAHRZEICHEN), o = c.online;
    const ally = o && o.active && o.ally ? o.ally : {};
    return {
      prod: (1 + [0, 0.02, 0.02, 0.02, 0.05, 0.05, 0.05, 0.08, 0.08, 0.08, 0.12][v]) * (1 + 0.05 * techLv(c, "prod")) * (1 + 0.02 * L) * (1 + (ally.landmark || 0) + (ally.workshop || 0)),
      build: 1 / (1 + [0, 0, 0.05, 0.05, 0.05, 0.1, 0.1, 0.1, 0.15, 0.15, 0.15][v]) * Math.max(0.5, 1 - 0.06 * techLv(c, "build")) * (1 - (ally.build || 0)),
      train: 1 / (1 + (v >= 9 ? 0.2 : v >= 5 ? 0.1 : 0)) * Math.max(0.5, 1 - 0.08 * techLv(c, "drill")),
      builds: 2 + (v >= 3 ? 1 : 0) + (v >= 7 ? 1 : 0),
      queue: 3 + (v >= 5 ? 1 : 0),
      gather: 1 + (v >= 4 ? 0.1 : 0) + 0.1 * techLv(c, "gath") + (ally.gather || 0),
      atk: (1 + (v >= 10 ? 0.1 : v >= 6 ? 0.05 : 0)) * (1 + 0.05 * techLv(c, "atk")) * (1 + (ally.atk || 0)),
      def: (1 + (v >= 10 ? 0.1 : v >= 6 ? 0.05 : 0)) * (1 + 0.05 * techLv(c, "def")) * (1 + (ally.def || 0)),
      save: (v >= 8 ? 0.1 : 0) + 0.05 * techLv(c, "med"),
      travel: (v >= 9 ? 0.9 : 1) * Math.max(0.6, 1 - 0.06 * techLv(c, "navi")) * (1 - (ally.march || 0)),
      store: (1 + 0.1 * techLv(c, "store")) * (1 + (ally.storage || 0)),
      deck: 0.3 * techLv(c, "pile"),
      dam: ally.dike || 0
    };
  }

  // src/features.js
  var addVipX = (c, n) => addVip(c, n);
  var today2 = () => {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };
  var yesterday = () => {
    const d = new Date(Date.now() - 864e5);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };
  var DAILY = [
    { res: [200, 120, 80, 0] },
    { res: [300, 200, 150, 20] },
    { res: [0, 0, 0, 60], u: [3, 3, 0, 0, 0] },
    { res: [500, 300, 200, 40] },
    { res: [0, 400, 300, 80] },
    { res: [800, 500, 400, 120] },
    { res: [1e3, 800, 600, 200], u: [0, 0, 5, 2, 5], big: true }
  ];
  function dailyReward(c, day) {
    const f = 1 + 0.35 * (c.towerLevel - 1), d = DAILY[day];
    return { res: d.res.map((v) => Math.round(v * f)), u: d.u || [0, 0, 0, 0, 0], big: d.big };
  }
  function dailyState(c) {
    const s = c.s;
    if (!s.daily) s.daily = { last: "", streak: 0 };
    const can = s.daily.last !== today2();
    const day = can ? s.daily.last === yesterday() ? s.daily.streak % 7 : 0 : (s.daily.streak - 1) % 7;
    return { can, day };
  }
  function claimDaily(c) {
    const st = dailyState(c);
    if (!st.can) return null;
    const r = dailyReward(c, st.day);
    r.res.forEach((v, i) => v && c.addRes(i, v));
    c.s.troops = c.s.troops.map((v, i) => v + (r.u[i] || 0));
    c.s.daily = { last: today2(), streak: st.day + 1 };
    questEvent(c, "daily", 1);
    addVipX(c, 50 + 10 * Math.min(7, c.s.daily.streak));
    return r;
  }
  var QUESTS = [
    { id: "build", text: (n) => `Starte ${n} Bau- oder Ausbauarbeiten`, n: [2, 3, 4], rw: [0, 0, 0, 40] },
    { id: "gather", text: (n) => `Sammler bringen ${n} Rohstoffe heim`, n: [150, 300, 500], rw: [200, 150, 0, 0] },
    { id: "train", text: (n) => `Bilde ${n} Krieger aus`, n: [5, 10, 20], rw: [0, 250, 150, 0] },
    { id: "win", text: (n) => `Gewinne ${n} Kampf${n > 1 ? "e" : ""}`, n: [1, 2], rw: [300, 0, 0, 80] },
    { id: "exp", text: (n) => `Mach ${n} Wattwanderung${n > 1 ? "en" : ""}`, n: [1, 2, 3], rw: [150, 150, 150, 0] },
    { id: "trade", text: () => "Handle mit dem H\xE4ndlerschiff", n: [1], rw: [0, 0, 200, 50] },
    { id: "heal", text: (n) => `Heile ${n} verwundete Krieger`, n: [3, 6], rw: [0, 200, 200, 0] },
    { id: "bot", text: (n) => `Versenke ${n} Piratenschiff${n > 1 ? "e" : ""}`, n: [1, 2, 3], rw: [250, 150, 0, 60] }
  ];
  function questsToday(c) {
    const s = c.s;
    if (!s.quests || s.quests.day !== today2()) {
      let seed = [...today2()].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
      const R = () => {
        seed = seed * 1664525 + 1013904223 >>> 0;
        return seed / 4294967296;
      };
      const pool = QUESTS.slice(), list = [];
      while (list.length < 3) {
        const q = pool.splice(Math.floor(R() * pool.length), 1)[0];
        list.push({ id: q.id, n: q.n[Math.floor(R() * q.n.length)], have: 0, done: false });
      }
      s.quests = { day: today2(), list };
    }
    return s.quests.list.map((q) => {
      const d = QUESTS.find((x) => x.id === q.id);
      const f = 1 + 0.35 * (c.towerLevel - 1);
      return { ...q, text: d.text(q.n), rw: d.rw.map((v) => Math.round(v * f)) };
    });
  }
  function questEvent(c, id, n) {
    const s = c.s;
    if (!s.quests || s.quests.day !== today2()) questsToday(c);
    for (const q of s.quests.list) if (q.id === id && !q.done && q.have < q.n) {
      q.have = Math.min(q.n, q.have + n);
      if (q.have >= q.n) c.msg("\u2705 Tagesaufgabe erf\xFCllt \u2013 Belohnung abholen unter \u{1F381}!");
    }
    s.stats = s.stats || {};
    s.stats[id] = (s.stats[id] || 0) + n;
    addXp(c, id, n);
  }
  function claimQuest(c, k) {
    const list = questsToday(c), q = list[k];
    if (!q || q.done || q.have < q.n) return false;
    q.rw.forEach((v, i) => v && c.addRes(i, v));
    c.s.quests.list[k].done = true;
    addVipX(c, 15);
    return true;
  }
  var ACH = [
    { id: "b5", ic: "\u{1F3D7}\uFE0F", name: "Baumeister", text: "5 Geb\xE4ude errichtet", ok: (c) => c.s.plots.filter((p) => p.type >= 0 && p.level > 0).length >= 5 },
    { id: "b20", ic: "\u{1F3D8}\uFE0F", name: "Pfahlstadt", text: "20 Geb\xE4ude errichtet", ok: (c) => c.s.plots.filter((p) => p.type >= 0 && p.level > 0).length >= 20 },
    { id: "t5", ic: "\u{1F5FC}", name: "Leuchtfeuer", text: "Gezeitenturm Stufe 5", ok: (c) => c.towerLevel >= 5 },
    { id: "t10", ic: "\u{1F31F}", name: "Turmherr", text: "Gezeitenturm Stufe 10", ok: (c) => c.towerLevel >= 10 },
    { id: "t20", ic: "\u{1F451}", name: "Herr der Gezeiten", text: "Gezeitenturm Stufe 20", ok: (c) => c.towerLevel >= 20 },
    { id: "d1", ic: "\u{1F30A}", name: "Deichbauer", text: "Damm gebaut", ok: (c) => c.levels(T.DAMM) >= 1 },
    { id: "d10", ic: "\u{1F6E1}\uFE0F", name: "Deichgraf", text: "Damm Stufe 10", ok: (c) => c.levels(T.DAMM) >= 10 },
    { id: "w1", ic: "\u{1F9F1}", name: "Festung", text: "Festungsmauer gebaut", ok: (c) => c.levels(T.MAUER) >= 1 },
    { id: "a50", ic: "\u2694\uFE0F", name: "Heerf\xFChrer", text: "50 Krieger gleichzeitig", ok: (c) => c.troopTotal >= 50 },
    { id: "a200", ic: "\u{1F396}\uFE0F", name: "Feldherr", text: "200 Krieger gleichzeitig", ok: (c) => c.troopTotal >= 200 },
    { id: "v1", ic: "\u{1F6A9}", name: "Erste Insel", text: "Ein Gebiet erobert", ok: (c) => c.s.stats && c.s.stats.win >= 1 },
    { id: "v10", ic: "\u{1F3F4}", name: "Eroberer", text: "10 K\xE4mpfe gewonnen", ok: (c) => c.s.stats && c.s.stats.win >= 10 },
    { id: "g1k", ic: "\u{1F9FA}", name: "Sammler", text: "1000 Rohstoffe gesammelt", ok: (c) => c.s.stats && c.s.stats.gather >= 1e3 },
    { id: "tr5", ic: "\u26F5", name: "Kaufmann", text: "5 Mal gehandelt", ok: (c) => c.s.stats && c.s.stats.trade >= 5 },
    { id: "dl7", ic: "\u{1F4C5}", name: "Treue Seele", text: "7 Tage am St\xFCck dabei", ok: (c) => c.s.daily && c.s.daily.streak >= 7 },
    { id: "p100", ic: "\u{1F465}", name: "Gro\xDFstadt", text: "100 Bewohner", ok: (c) => c.s.survivors >= 100 },
    { id: "bot5", ic: "\u{1F3F4}\u200D\u2620\uFE0F", name: "Piratenj\xE4ger", text: "Piratenschiff Stufe 5 versenkt", ok: (c) => c.s.botLevel > 5 },
    { id: "bot15", ic: "\u2620\uFE0F", name: "Schrecken der Meere", text: "Piratenschiff Stufe 15 versenkt", ok: (c) => c.s.botLevel > 15 },
    { id: "bot30", ic: "\u{1F988}", name: "Admiral", text: "Piratenschiff Stufe 30 versenkt", ok: (c) => c.s.botLevel > 30 },
    { id: "all5", ic: "\u{1F393}", name: "Alle Waffengattungen", text: "Alle 5 Kriegerarten ausgebildet", ok: (c) => c.s.troops.slice(0, 5).every((v) => v > 0) }
  ];
  function checkAch(c) {
    const s = c.s;
    s.ach = s.ach || {};
    for (const a of ACH) if (!s.ach[a.id] && a.ok(c)) {
      s.ach[a.id] = Date.now();
      c.msg(`\u{1F3C5} Erfolg freigeschaltet: ${a.ic} ${a.name}!`);
    }
  }
  var achCount = (c) => Object.keys(c.s.ach || {}).length;
  var TUT = [
    { text: "Willkommen! Tippe unten auf <b>\u{1F3D7}\uFE0F Geb\xE4ude</b> \u2192 <b>Neu bauen</b> und baue eine <b>Unterkunft</b>.", ok: (c) => c.s.plots.filter((p) => p.type === T.HAUS).length >= 2 },
    { text: "Vor dem Tor liegen Sammelstellen. Tippe eine an und schicke mit <b>+1</b> Bewohner zum Sammeln.", ok: (c) => c.s.gath.length > 0 || c.s.stats && c.s.stats.gather > 0 },
    { text: "Baue den <b>Gezeitenturm</b> (Mitte) auf Stufe 2 aus \u2013 er hebt die Stadt \xFCber die Flut.", ok: (c) => c.towerLevel >= 2 },
    { text: "Baue eine <b>K\xFCche</b> \u2013 sie steigert die gesamte Produktion.", ok: (c) => c.levels(T.KUECHE) > 0 },
    { text: "F\xFCr Krieger brauchst du die <b>Kaserne</b> und einen <b>Harpunierhof</b>.", ok: (c) => c.levels(T.KASERNE) > 0 && c.levels(T.HARPHOF) > 0 },
    { text: "Bilde unter <b>\u2694\uFE0F Truppen</b> 5 Harpuniere aus.", ok: (c) => c.troopTotal >= 5 },
    { text: "\xD6ffne die <b>\u{1F5FA}\uFE0F Karte</b> und erobere eine Pirateninsel in deiner N\xE4he.", ok: (c) => c.s.stats && c.s.stats.win >= 1 },
    { text: "Hol dir jeden Tag deine Belohnung bei <b>\u{1F381}</b> rechts unten. Viel Spa\xDF!", ok: (c) => c.s.daily && c.s.daily.last === today2() }
  ];
  function tutStep(c) {
    const s = c.s;
    if (s.tut === void 0) s.tut = c.towerLevel >= 3 ? TUT.length : 0;
    while (s.tut < TUT.length && TUT[s.tut].ok(c)) {
      s.tut++;
      if (s.tut < TUT.length) c.msg("\u{1F44D} Gut gemacht!");
    }
    return s.tut;
  }
  function queueAdd(c, plot, type) {
    const s = c.s;
    s.bq = s.bq || [];
    if (s.bq.length >= c.queueMax) return `Warteschlange voll (max. ${c.queueMax})`;
    if (s.bq.some((q) => q.plot === plot)) return "Steht schon in der Warteschlange";
    s.bq.push({ plot, type });
    c.msg(`In Warteschlange: ${DEFS[type !== null && type !== void 0 ? type : s.plots[plot].type].name}`);
    return null;
  }
  function queueTick(c) {
    const s = c.s;
    if (!s.bq || !s.bq.length) return;
    const q = s.bq[0];
    const p = s.plots[q.plot];
    if (q.type !== null && q.type !== void 0 && p.type < 0) {
      const blk = c.buildBlocker(q.plot, q.type);
      if (!blk) {
        c.startBuild(q.plot, q.type);
        s.bq.shift();
      } else if (blk !== "Alle Bautrupps besch\xE4ftigt" && blk !== "Zu wenig Rohstoffe") {
        s.bq.shift();
        c.msg(`Warteschlange: ${blk}`);
      }
    } else {
      const blk = c.upgradeBlocker(q.plot);
      if (!blk) {
        c.startUpgrade(q.plot);
        s.bq.shift();
      } else if (blk !== "Alle Bautrupps besch\xE4ftigt" && blk !== "Zu wenig Rohstoffe" && blk !== "Wird gerade gebaut") {
        s.bq.shift();
        c.msg(`Warteschlange: ${blk}`);
      }
    }
  }
  function traderTick(c, dt) {
    const s = c.s;
    if (!s.trader) s.trader = { next: 90, left: 0, offers: [] };
    const tr = s.trader;
    if (tr.left > 0) {
      tr.left -= dt;
      if (tr.left <= 0) {
        tr.left = 0;
        tr.next = 420 + Math.random() * 300;
        c.msg("\u26F5 Das H\xE4ndlerschiff legt wieder ab.");
      }
    } else {
      tr.next -= dt;
      if (tr.next <= 0) {
        tr.left = 150;
        tr.offers = makeOffers(c);
        c.msg("\u26F5 Ein H\xE4ndlerschiff hat am Steg angelegt!");
      }
    }
  }
  function makeOffers(c) {
    const f = 1 + 0.4 * (c.towerLevel - 1), out = [];
    for (let k = 0; k < 3; k++) {
      const give = Math.floor(Math.random() * 4);
      let get = Math.floor(Math.random() * 3);
      if (get >= give) get++;
      const g = Math.round((80 + Math.random() * 120) * f), r = Math.round(g * (0.9 + Math.random() * 0.5) * (get === 3 ? 0.35 : 1) * (give === 3 ? 2.5 : 1));
      out.push({ give, gn: g, get, rn: r, used: false });
    }
    const u = Math.floor(Math.random() * 5);
    out.push({ give: 3, gn: Math.round(60 * f), unit: u, rn: Math.max(1, Math.round(3 * f)), used: false });
    return out;
  }
  function trade(c, k) {
    const tr = c.s.trader;
    if (!tr || tr.left <= 0) return "Kein H\xE4ndler da";
    const o = tr.offers[k];
    if (!o || o.used) return "Schon gehandelt";
    if (c.s.res[o.give] < o.gn) return "Zu wenig " + RES[o.give];
    c.s.res[o.give] -= o.gn;
    if (o.unit !== void 0) c.s.troops[o.unit] += o.rn;
    else c.addRes(o.get, o.rn);
    o.used = true;
    questEvent(c, "trade", 1);
    return null;
  }
  var SEASONS = [
    { name: "Fr\xFChling", ic: "\u{1F338}", text: "Regenf\xE4nger +20 %, Verwundete heilen schneller" },
    { name: "Sommer", ic: "\u2600\uFE0F", text: "Muscheln +15 %, Badeg\xE4ste kaufen Muscheln gegen Altmetall" },
    { name: "Herbst", ic: "\u{1F342}", text: "Treibholz +25 %, h\xE4ufiger Sturmfluten" },
    { name: "Winter", ic: "\u2744\uFE0F", text: "Eisgang: Muscheln \u221220 %, Wattwanderungen dauern l\xE4nger und sind gef\xE4hrlich" }
  ];
  var WEEK = 7 * 864e5;
  var EPOCH = Date.UTC(2026, 10, 23);
  function season() {
    const k = Math.floor((Date.now() - EPOCH) / WEEK), idx = (k % 4 + 4) % 4;
    return { idx, ...SEASONS[idx], left: (EPOCH + (k + 1) * WEEK - Date.now()) / 1e3 };
  }
  var PASS_XP = 800;
  var PASS_TIERS = 30;
  var XP = { build: 6, train: 0.5, gather: 0.01, win: 25, bot: 30, exp: 10, trade: 15, heal: 2, daily: 50, treasure: 8 };
  var monthKey = () => {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}`;
  };
  function passState(c) {
    const s = c.s;
    if (!s.pass || s.pass.m !== monthKey()) s.pass = { m: monthKey(), xp: 0, got: [] };
    const tier = Math.min(PASS_TIERS, Math.floor(s.pass.xp / PASS_XP));
    return { xp: s.pass.xp, tier, got: s.pass.got, into: s.pass.xp - tier * PASS_XP };
  }
  function passReward(c, t) {
    const f = 1 + 0.3 * (c.towerLevel - 1);
    const big = t % 5 === 0, last = t === PASS_TIERS;
    const r = { res: [0, 0, 0, 0], items: {}, u: [0, 0, 0, 0, 0] };
    if (last) {
      r.items = { sp60: 2, sp180: 1 };
      r.res = [3e3, 2e3, 2e3, 600].map((v) => Math.round(v * f));
      r.u = [10, 10, 10, 5, 10];
    } else if (big) {
      r.items = { [t >= 15 ? "sp60" : "sp15"]: 1 };
      r.u[t / 5 % 5] = 5 + t;
    } else if (t % 3 === 0) r.items = { [t >= 12 ? "sp15" : "sp5"]: 2 };
    else r.res[t % 4] = Math.round((200 + t * 40) * f);
    return r;
  }
  function claimPass(c, t) {
    const st = passState(c);
    if (t > st.tier || st.got.includes(t)) return false;
    const r = passReward(c, t);
    r.res.forEach((v, i) => v && c.addRes(i, v));
    c.s.items = c.s.items || {};
    for (const k in r.items) c.s.items[k] = (c.s.items[k] || 0) + r.items[k];
    c.s.troops = c.s.troops.map((v, i) => v + (r.u[i] || 0));
    c.s.pass.got.push(t);
    addVipX(c, 20);
    if (t % 5 === 0) c.s.medals = (c.s.medals || 0) + 2;
    return true;
  }
  function addXp(c, id, n) {
    const st = passState(c), before = st.tier;
    c.s.pass.xp += (XP[id] || 0) * n;
    const after = passState(c).tier;
    if (after > before) c.msg(`\u{1F3AB} Saison-Pass Stufe ${after} erreicht \u2013 Belohnung unter \u{1F381} abholen!`);
  }
  function treasureTick(c, dt) {
    const s = c.s;
    if (!s.treasures) s.treasures = [];
    if ((c.tideSin || 0) > 0.15) {
      if (s.treasures.length) s.treasures = [];
      return;
    }
    if ((c.tideSin || 0) > -0.4) return;
    s.treasureT = (s.treasureT || 8) - dt;
    if (s.treasureT > 0 || s.treasures.length >= 1) return;
    s.treasureT = 90 + Math.random() * 150;
    const a = (Math.random() < 0.5 ? 1 : -1) * (0.4 + Math.random() * 2.4), r = c.areaRadius + 3 + 15 + Math.random() * 14;
    s.treasureSeq = (s.treasureSeq || 0) + 1;
    s.treasures.push({ id: s.treasureSeq, x: Math.sin(a) * r, z: Math.cos(a) * r });
  }
  function collectTreasure(c, id) {
    const s = c.s, k = (s.treasures || []).findIndex((t) => t.id === id);
    if (k < 0) return;
    s.treasures.splice(k, 1);
    const roll = Math.random(), f = 1 + 0.25 * (c.towerLevel - 1);
    s.items = s.items || {};
    let txt;
    if (roll < 0.35) {
      s.items.sp1 = (s.items.sp1 || 0) + 1;
      txt = "\u26A1 Beschleuniger 1 Min.";
    } else if (roll < 0.5) {
      s.items.sp5 = (s.items.sp5 || 0) + 1;
      txt = "\u26A1 Beschleuniger 5 Min.";
    } else if (roll < 0.53) {
      s.items.sp15 = (s.items.sp15 || 0) + 1;
      txt = "\u26A1 Beschleuniger 15 Min.!";
    } else {
      const v = Math.round((40 + Math.random() * 120) * f);
      c.addRes(3, v);
      txt = `${v} Altmetall`;
    }
    if (Math.random() < 0.3) {
      s.ore = (s.ore || 0) + 1;
      txt += " \xB7 \u{1F529} 1 Schmiedeeisen";
    }
    c.msg(`\u2728 Schatz im Watt gefunden: ${txt}`);
    questEvent(c, "treasure", 1);
    addVipX(c, 3);
  }

  // src/social.js
  var ROWS = ["Vorne", "Mitte", "Hinten"];
  var ROW_IC = ["\u{1F6E1}\uFE0F", "\u2694\uFE0F", "\u{1F3F9}"];
  var formOf = (c) => Array.isArray(c.s.formation) && c.s.formation.length === 5 ? c.s.formation : [0, 0, 0, 0, 0];
  function formMul(f) {
    return 1 + (f[1] === 0 ? 0.06 : 0) + (f[0] === 2 ? 0.04 : 0) + (f[3] === 2 ? 0.04 : 0) + (f[2] === 1 ? 0.03 : 0) - (f[0] === 0 ? 0.04 : 0) - (f[3] === 0 ? 0.04 : 0);
  }
  var FORM_TIPS = [
    "Schildwachen vorne fangen die Angreifer ab (+6 %).",
    "Harpuniere und Schleuderer hinten schie\xDFen gesch\xFCtzt (je +4 %, vorne \u22124 %).",
    "Enterer in der Mitte springen dorthin, wo es brennt (+3 %)."
  ];
  var FORM_PRESETS = [
    { name: "Igel", ic: "\u{1F994}", f: [2, 0, 1, 2, 1], text: "Ausgewogen, st\xE4rkste Verteidigung" },
    { name: "Mauer", ic: "\u{1F9F1}", f: [1, 0, 0, 2, 0], text: "Alle Nahk\xE4mpfer vorne" },
    { name: "Sturm", ic: "\u{1F30A}", f: [0, 0, 0, 0, 0], text: "Alle in einer Reihe (schwach)" }
  ];
  function setRow(c, u, row) {
    const f = formOf(c).slice();
    f[u] = Math.max(0, Math.min(2, row));
    c.s.formation = f;
  }
  var OBST = [
    { name: "Treibgut-Haufen", ic: "\u{1FAB5}", cost: [0, 0, 0, 0], time: 20 },
    { name: "Schiffswrack", ic: "\u2693", cost: [60, 0, 0, 0], time: 60 },
    { name: "Tangberg", ic: "\u{1F33F}", cost: [0, 40, 0, 0], time: 40 },
    { name: "Felsbrocken", ic: "\u{1FAA8}", cost: [100, 0, 0, 20], time: 90 }
  ];
  var OBST_MAX = 5;
  function obstTick(c, dt) {
    const s = c.s;
    if (!s.obst) s.obst = [];
    s.obstT = (s.obstT === void 0 ? 45 : s.obstT) - dt;
    if (s.obstT <= 0) {
      s.obstT = 240 + Math.random() * 240;
      if (s.obst.length < OBST_MAX) {
        let x = 0, z = 0;
        for (let k = 0; k < 12; k++) {
          const a = Math.random() * Math.PI * 2, r2 = c.areaRadius + 8 + Math.random() * 8;
          x = Math.sin(a) * r2;
          z = Math.cos(a) * r2;
          if (z > -(c.areaRadius + 2) || Math.abs(x) > 14) {
            if (!s.obst.some((o) => Math.hypot(o.x - x, o.z - z) < 6)) break;
          }
        }
        s.obstSeq = (s.obstSeq || 0) + 1;
        const r = Math.random(), kind = r < 0.4 ? 0 : r < 0.65 ? 2 : r < 0.85 ? 1 : 3;
        s.obst.push({ id: s.obstSeq, kind, x, z, rot: Math.random() * 360 });
      }
    }
    const cl = s.clearing;
    if (cl) {
      cl.left -= dt;
      if (cl.left <= 0) {
        s.clearing = null;
        finishObst(c, cl.id);
      }
    }
  }
  function obstBlocker(c, id) {
    const o = (c.s.obst || []).find((x) => x.id === id);
    if (!o) return "Schon wegger\xE4umt";
    if (c.s.clearing) return c.s.clearing.id === id ? "Wird gerade ger\xE4umt" : "Es wird schon ein Hindernis ger\xE4umt";
    if (!c.canAfford(OBST[o.kind].cost)) return "Zu wenig Rohstoffe";
    return null;
  }
  function startObst(c, id) {
    if (obstBlocker(c, id)) return false;
    const o = c.s.obst.find((x) => x.id === id), d = OBST[o.kind];
    c.pay(d.cost);
    c.s.clearing = { id, left: d.time, total: d.time };
    c.msg(`\u{1F9F9} ${d.name} wird wegger\xE4umt (${fmtTime(d.time)}).`);
    return true;
  }
  function finishObst(c, id) {
    const s = c.s, k = (s.obst || []).findIndex((x) => x.id === id);
    if (k < 0) return;
    const o = s.obst[k];
    s.obst.splice(k, 1);
    const f = 1 + 0.3 * (c.towerLevel - 1), rnd = (a, b) => Math.round((a + Math.random() * (b - a)) * f);
    const got = [];
    const res = (i, v, ic) => {
      c.addRes(i, v);
      got.push(`${ic} ${v}`);
    };
    if (o.kind === 0) res(0, rnd(80, 200), "\u{1FAB5}");
    else if (o.kind === 1) {
      res(3, rnd(40, 120), "\u2699\uFE0F");
      s.ore = (s.ore || 0) + 1 + Math.floor(Math.random() * 2);
      got.push("\u{1F529} Schmiedeeisen");
    } else if (o.kind === 2) {
      res(1, rnd(60, 160), "\u{1F9AA}");
      res(2, rnd(40, 100), "\u{1F4A7}");
    } else {
      s.ore = (s.ore || 0) + 2 + Math.floor(Math.random() * 2);
      got.push("\u{1F529} Schmiedeeisen");
      res(3, rnd(30, 80), "\u2699\uFE0F");
    }
    if (Math.random() < 0.25) {
      s.items = s.items || {};
      s.items.sp5 = (s.items.sp5 || 0) + 1;
      got.push("\u26A1 5 Min.");
    }
    s.vipPts = (s.vipPts || 0) + 2;
    s.obstCleared = (s.obstCleared || 0) + 1;
    c.msg(`\u{1F9F9} ${OBST[o.kind].name} ger\xE4umt: ${got.join(" \xB7 ")}`);
  }
  function helpTargets(c) {
    const s = c.s, out = [];
    s.plots.forEach((p, i) => {
      if (p.type >= 0 && p.buildLeft > 1) out.push({ key: `b:${i}:${p.level + 1}`, label: `\u{1F528} Bau Stufe ${p.level + 1}`, kind: "b", i });
    });
    if (s.research && s.research.left > 1) out.push({ key: `r:${s.research.id}:${((s.tech || {})[s.research.id] || 0) + 1}`, label: "\u{1F4DA} Forschung", kind: "r" });
    return out;
  }
  var helpStep = (total) => Math.max(30, total * 0.015);
  function applyHelp(c, key, n) {
    const s = c.s, [kind, a, lv] = key.split(":");
    if (kind === "b") {
      const p = s.plots[+a];
      if (!p || p.buildLeft <= 0 || p.level + 1 !== +lv) return 0;
      const red = Math.min(p.buildLeft - 0.5, helpStep(p.buildTotal) * n);
      if (red <= 0) return 0;
      p.buildLeft -= red;
      return red;
    }
    if (kind === "r") {
      const r = s.research;
      if (!r || r.id !== a || ((s.tech || {})[a] || 0) + 1 !== +lv) return 0;
      const red = Math.min(r.left - 0.5, helpStep(r.total) * n);
      if (red <= 0) return 0;
      r.left -= red;
      return red;
    }
    return 0;
  }
  var gcapOf = (c) => 15 + 10 * c.towerLevel;

  // src/bots.js
  var ITEMS = {
    sp1: { ic: "\u26A1", name: "Beschleuniger 1 Min.", sec: 60 },
    sp5: { ic: "\u26A1", name: "Beschleuniger 5 Min.", sec: 300 },
    sp15: { ic: "\u26A1", name: "Beschleuniger 15 Min.", sec: 900 },
    sp60: { ic: "\u26A1", name: "Beschleuniger 1 Std.", sec: 3600 },
    sp180: { ic: "\u26A1", name: "Beschleuniger 3 Std.", sec: 10800 }
  };
  var SPEED_KEYS = ["sp1", "sp5", "sp15", "sp60", "sp180"];
  var SHIP_NAMES = ["Schwarze M\xF6we", "Rostiger Anker", "Seeteufel", "Krakenfaust", "Nebelhai", "Sturmkr\xE4he", "Blutige Auster", "Wattwolf", "Grauer Hering", "Knochenkiel"];
  function botArmy(L) {
    const n = Math.round(5 * Math.pow(1.14, L - 1) + L), fav = (L - 1) % 5;
    const w = [1, 1, 1, 1, 1];
    w[fav] = 3;
    if (L >= 6) w[(fav + 2) % 5] = 2;
    const sw = w.reduce((a, b) => a + b, 0), u = w.map((x) => Math.floor(n * x / sw));
    u[fav] += n - uSum(u);
    return u;
  }
  function botReward(L) {
    const it = {};
    const add2 = (k, v) => it[k] = (it[k] || 0) + v;
    if (L <= 4) add2("sp1", 2);
    else if (L <= 9) {
      add2("sp1", 1);
      add2("sp5", 1);
    } else if (L <= 19) {
      add2("sp5", 2);
      if (L % 2) add2("sp15", 1);
    } else {
      add2("sp15", 2);
      if (L % 3 === 0) add2("sp60", 1);
    }
    const big = L % 5 === 0;
    if (big) {
      add2(L >= 10 ? "sp60" : "sp15", 1);
      if (L >= 25) add2("sp180", 1);
    }
    const res = [0, 0, 0, 0];
    res[L % 4] = Math.round(150 * Math.pow(1.15, L - 1));
    res[(L + 1) % 4] = Math.round(80 * Math.pow(1.15, L - 1));
    const u = zeroU();
    if (big) u[(L - 1) % 5] = 3 + Math.floor(L / 2);
    return { items: it, res, u, big };
  }
  var itemStr = (it) => Object.keys(it).filter((k) => it[k] > 0).map((k) => `\u26A1${fmtShort(ITEMS[k].sec)}\xD7${it[k]}`).join(" ");
  function fmtShort(sec) {
    return sec >= 3600 ? `${sec / 3600}h` : `${sec / 60}m`;
  }
  function ensureBots(c) {
    const s = c.s;
    if (!s.botLevel) s.botLevel = 1;
    if (!s.items) s.items = {};
    if (!s.botMarches) s.botMarches = [];
    if (!s.bots || s.bots.length !== 3) makeBots(c);
  }
  function makeBots(c) {
    const s = c.s, L = s.botLevel, out = [];
    const o = c.online, onl = o && o.active && o.world && o.me;
    const pts = onl ? o.world.territories.map((t) => [t.x - o.me.x, t.y - o.me.y]).concat(o.world.players.map((p) => [p.x - o.me.x, p.y - o.me.y])) : (s.terr || []).map((t) => [t.x, t.y]);
    pts.push([0, 0]);
    const rnd = () => (s.botSeed = (s.botSeed || 7) * 1103515245 + 12345 >>> 0) / 4294967296;
    for (let k = 0; k < 3; k++) {
      const lv = L + k;
      let best = null, bd = -1;
      for (let tries = 0; tries < 40; tries++) {
        const a = rnd() * Math.PI * 2, d = 0.75 + k * 0.45 + rnd() * 0.3, x = Math.cos(a) * d, y = Math.sin(a) * d;
        const m = Math.min(...pts.map((p) => Math.hypot(p[0] - x, p[1] - y)));
        if (m > bd) {
          bd = m;
          best = [x, y];
        }
        if (m > 0.6) break;
      }
      pts.push(best);
      out.push({ id: lv, level: lv, name: SHIP_NAMES[lv * 7 % SHIP_NAMES.length], dx: best[0], dy: best[1], u: botArmy(lv) });
    }
    s.bots = out;
  }
  var botTravel = (b, u, c, cap) => (18 + Math.hypot(b.dx, b.dy) * 22) * speedFactor(u) * (c ? mods(c).travel * fleetSpeed(c, u) * capSpeed(c, cap) : 1);
  var STAM_MAX = 10;
  var STAM_SEC = 1200;
  function stamina(c) {
    const s = c.s, now = Date.now();
    if (!s.stam) s.stam = { n: STAM_MAX, t: now };
    if (s.stam.n >= STAM_MAX) s.stam.t = now;
    else {
      const k = Math.floor((now - s.stam.t) / (STAM_SEC * 1e3));
      if (k > 0) {
        s.stam.n = Math.min(STAM_MAX, s.stam.n + k);
        s.stam.t += k * STAM_SEC * 1e3;
      }
    }
    return { n: s.stam.n, next: s.stam.n >= STAM_MAX ? 0 : (s.stam.t + STAM_SEC * 1e3 - now) / 1e3 };
  }
  function botBlocker(c, id, u) {
    const b = c.s.bots.find((x) => x.id === id);
    if (stamina(c).n <= 0) return "Keine Ausdauer \u2013 alle 20 Minuten kommt ein Punkt zur\xFCck";
    if (!b) return "Schiff ist weg";
    if (uSum(u) <= 0) return "Keine Truppen ausgew\xE4hlt";
    if (u.some((v, i) => v > c.s.troops[i])) return "So viele Truppen hast du nicht zu Hause";
    if (c.s.botMarches.some((m) => m.bot.id === id && m.phase === "out")) return "Dorthin ist schon ein Trupp unterwegs";
    return null;
  }
  function sendToBot(c, id, u, cap) {
    if (botBlocker(c, id, u)) return false;
    const b = c.s.bots.find((x) => x.id === id), tt = botTravel(b, u, c, cap);
    if (cap) capSend(c, cap, tt);
    c.s.troops = uSub(c.s.troops, u);
    c.s.stam.n--;
    c.s.botMarches.push({ bot: { ...b }, u: u.slice(), left: tt, total: tt, phase: "out", cap: cap || null, loot: capLoot(c, cap) * fleetLoot(c, u) });
    c.msg(`\u2694\uFE0F Angriff auf das Piratenschiff \u201E${b.name}\u201C (Stufe ${b.level})!`);
    return true;
  }
  function botTick(c, dt) {
    ensureBots(c);
    const s = c.s;
    for (let i = s.botMarches.length - 1; i >= 0; i--) {
      const m = s.botMarches[i];
      m.left -= dt;
      if (m.left > 0) continue;
      if (m.phase === "back") {
        s.troops = uAdd(s.troops, m.u);
        s.botMarches.splice(i, 1);
        c.msg(`${uSum(m.u)} Krieger sind vom Piratenschiff zur\xFCck.`);
        continue;
      }
      fight(c, m);
    }
  }
  function fight(c, m) {
    const s = c.s, b = m.bot, tide = c.tideState(0);
    const att = armyStr(m.u, b.u, true, tide) * mods(c).atk * capAtk(c, m.cap, tide) * (0.85 + Math.random() * 0.3);
    const def = Math.max(1, armyStr(b.u, m.u, false, tide));
    let lost;
    if (att > def) {
      lost = uScale(m.u, Math.min(0.85, Math.pow(def / att, 1.3) * 0.5));
      const r = botReward(b.level);
      for (const k in r.items) s.items[k] = (s.items[k] || 0) + r.items[k];
      r.res = r.res.map((v) => Math.round(v * (m.loot || 1)));
      r.res.forEach((v, i) => v && c.addRes(i, v));
      s.troops = uAdd(s.troops, r.u);
      s.medals = (s.medals || 0) + (r.big ? 3 : 1);
      const ore = 1 + Math.floor(b.level / 4) + (r.big ? 2 : 0);
      s.ore = (s.ore || 0) + ore;
      addVip(c, 2 * b.level);
      if (b.level >= s.botLevel) {
        s.botLevel = b.level + 1;
      }
      s.bots = s.bots.filter((x) => x.id !== b.id);
      if (s.bots.length < 3 || b.level >= s.botLevel - 1) makeBots(c);
      questEvent(c, "bot", 1);
      questEvent(c, "win", 1);
      c.report(`\u{1F3F4}\u200D\u2620\uFE0F \u201E${b.name}\u201C (Stufe ${b.level}) versenkt! Beute: ${itemStr(r.items)} \xB7 \u{1F396}\uFE0F${r.big ? 3 : 1} \xB7 \u{1F529}${ore}${r.res.some((v) => v) ? " \xB7 " + r.res.map((v, i) => v ? `${v} ${RES[i]}` : "").filter(Boolean).join(", ") : ""}${uSum(r.u) ? " \xB7 \xDCberl\xE4ufer: " + troopStr(r.u) : ""}. Verluste: ${troopStr(lost)}.`, true);
    } else {
      lost = uScale(m.u, 0.55);
      c.report(`\u{1F3F4}\u200D\u2620\uFE0F Angriff auf \u201E${b.name}\u201C (Stufe ${b.level}) gescheitert. Verluste: ${troopStr(lost)}. Tipp: Krieger w\xE4hlen, die gegen die Mannschaft stark sind.`, false);
    }
    c.addWounded(lost);
    m.u = uSub(m.u, lost);
    m.phase = "back";
    m.left = m.total;
    if (!uSum(m.u)) c.s.botMarches.splice(c.s.botMarches.indexOf(m), 1);
  }
  function useSpeed(c, key, kind, target) {
    const s = c.s, it = ITEMS[key];
    if (!it || !(s.items[key] > 0)) return "Keinen solchen Beschleuniger";
    let sec = it.sec;
    if (kind === "plot") {
      const p = s.plots[target];
      if (!p || p.buildLeft <= 0) return "Hier wird nicht gebaut";
      p.buildLeft = Math.max(0.01, p.buildLeft - sec);
    } else if (kind === "train") {
      if (!s.train.length) return "Keine Ausbildung l\xE4uft";
      while (sec > 0 && s.train.length) {
        const q = s.train[0];
        if (q.left <= sec) {
          sec -= q.left;
          q.n--;
          s.troops[q.u]++;
          questEvent(c, "train", 1);
          q.left = q.per;
          if (q.n <= 0) s.train.shift();
        } else {
          q.left -= sec;
          sec = 0;
        }
      }
    } else if (kind === "heal") {
      const L = c.levels(20);
      if (L <= 0 || !uSum(s.wounded)) return "Niemand im Lazarett";
      s.healT = (s.healT || 0) + sec * L;
    } else if (kind === "exp") {
      if (!(s.expLeft > 0)) return "Keine Wattwanderung unterwegs";
      s.expLeft = Math.max(0.01, s.expLeft - sec);
    } else if (kind === "research") {
      if (!s.research) return "Keine Forschung l\xE4uft";
      s.research.left = Math.max(0.01, s.research.left - sec);
    } else if (kind === "bot") {
      const m = s.botMarches[target];
      if (!m) return "Kein Trupp";
      m.left = Math.max(0.01, m.left - sec);
    } else return "Geht hier nicht";
    s.items[key]--;
    c.msg(`\u26A1 ${it.name} eingesetzt.`);
    return null;
  }
  var speedCount = (c) => SPEED_KEYS.reduce((a, k) => a + (c.s.items && c.s.items[k] || 0), 0);

  // src/game.js
  var RES = ["Holz", "Muscheln", "Wasser", "Altmetall"];
  var RES_COL = ["#E2B477", "#F2A08C", "#7FD3F0", "#C7CCD6"];
  var HOLZ = 0;
  var MUSCHELN = 1;
  var WASSER = 2;
  var METALL = 3;
  var T = { TURM: 0, TREIBHOLZ: 1, MUSCHEL: 2, REGEN: 3, TAUCHER: 4, HAUS: 5, HEILER: 6, RAUCH: 7, KUECHE: 8, KASERNE: 9, WACHTURM: 10, LAGER: 11, MAUER: 12, ABWEHR: 13, DAMM: 14, HARPHOF: 15, WACHSTUBE: 16, ENTERHALLE: 17, SCHLEUDER: 18, WATTHUETTE: 19, LAZARETT: 20, AKADEMIE: 21, WERFT: 22, WAHRZEICHEN: 23 };
  var DEFS = [
    { name: "Gezeitenturm", short: "Herz der Stadt", desc: "Leuchtturm und Pfahlwerk. Jede Stufe hebt alle Plattformen der Stadt h\xF6her \xFCber das Wasser.", cost: [220, 0, 0, 60], prod: -1, rate: 0, workers: 0, build: 15 },
    { name: "Treibholzsammler", short: "+Holz", desc: "Fischt angeschwemmtes Holz aus dem Wasser.", cost: [40, 0, 0, 0], prod: HOLZ, rate: 1.2, workers: 2, build: 6 },
    { name: "Muschelzucht", short: "+Muscheln, stark bei Ebbe", desc: "Muschelpf\xE4hle im Watt. Bei Ebbe wird viel geerntet, bei Flut wenig.", cost: [60, 0, 0, 0], prod: MUSCHELN, rate: 0.75, workers: 2, build: 6 },
    { name: "Regenf\xE4nger", short: "+Wasser, stark bei Sturm", desc: "Segeltrichter und F\xE4sser sammeln Regen. Bei Sturmflut f\xE4llt besonders viel.", cost: [70, 0, 0, 5], prod: WASSER, rate: 0.6, workers: 1, build: 6 },
    { name: "Wracktaucher", short: "+Altmetall, stark bei Flut", desc: "Taucher bergen Metall aus alten Wracks. Bei hohem Wasser kommen sie besser heran.", cost: [120, 40, 0, 0], prod: METALL, rate: 0.25, workers: 3, build: 6 },
    { name: "Unterkunft", short: "+6 Pl\xE4tze", desc: "Pfahlhaus mit Kojen: Wohnraum f\xFCr neue Siedler (6 pro Stufe).", cost: [70, 0, 0, 0], prod: -1, rate: 0, workers: 0, build: 6 },
    { name: "Heilerh\xFCtte", short: "heilt Kranke", desc: "Kr\xE4uter und trockene Decken. Kranke werden deutlich schneller gesund.", cost: [140, 30, 0, 20], prod: -1, rate: 0, workers: 1, build: 6 },
    { name: "R\xE4ucherei", short: "\u2212Muschelverbrauch", desc: "R\xE4uchert Vorr\xE4te haltbar. Senkt den Muschelverbrauch um 8 % pro Stufe (max. 50 %).", cost: [100, 0, 0, 10], prod: -1, rate: 0, workers: 1, build: 6 },
    { name: "K\xFCche", short: "+6 % Produktion je Stufe", desc: "Warme Mahlzeiten aus dem gro\xDFen Kessel: Alle Siedler arbeiten besser (+6 % Produktion pro Stufe, max. 60 %).", cost: [120, 40, 0, 10], prod: -1, rate: 0, workers: 1, build: 7 },
    { name: "Kaserne", short: "Hauptquartier der Truppen", desc: "Ohne Kaserne keine Ausbildung. Jede Stufe: +10 Pl\xE4tze in der Ausbildungsschlange und schnellere Ausbildung. Die Krieger selbst lernen in ihren Ausbildungsst\xE4tten.", cost: [150, 60, 0, 30], prod: -1, rate: 0, workers: 2, build: 8 },
    { name: "Wachturm", short: "+12 % Verteidigung je Stufe", desc: "Sp\xE4her und Signalh\xF6rner: Deine Stadt verteidigt sich besser gegen \xDCberf\xE4lle (+12 % pro Stufe).", cost: [130, 0, 0, 40], prod: -1, rate: 0, workers: 1, build: 8 },
    { name: "Lager", short: "+1500 Lagerplatz je Stufe", desc: "Schuppen, Kisten und F\xE4sser: mehr Platz f\xFCr jeden Rohstoff (+1500 pro Stufe).", cost: [100, 0, 0, 10], prod: -1, rate: 0, workers: 0, build: 6 },
    { name: "Festungsmauer", short: "Mauer mit Tor", desc: "Umschlie\xDFt dein ganzes Gel\xE4nde. Stufe 1\u20136 Holzpalisade, 7\u201313 Steinwall, 14\u201320 Festungswall. +15 % Verteidigung pro Stufe.", cost: [200, 0, 0, 40], prod: -1, rate: 0, workers: 0, build: 12 },
    { name: "Abwehrturm", short: "Turm auf der Mauer", desc: "Steinturm mit Harpunen-Schleuder auf der Festungsmauer. +40 Verteidigung pro Stufe.", cost: [160, 0, 0, 50], prod: -1, rate: 0, workers: 1, build: 10 },
    { name: "Damm", short: "h\xE4lt Flut & Sturmflut ab", desc: "Erddamm ganz au\xDFen um die Warft, mit Sieltor. Solange das Wasser nicht \xFCber den Damm steigt, bleibt deine Stadt trocken. Jede Stufe macht ihn 25 cm h\xF6her.", cost: [240, 0, 0, 30], prod: -1, rate: 0, workers: 0, build: 12 },
    { name: "Harpunierhof", short: "bildet Harpuniere aus", desc: "Schie\xDFstand mit Harpunen-St\xE4ndern. Schaltet Harpuniere frei; jede Stufe bildet sie 10 % schneller aus.", cost: [110, 30, 0, 15], prod: -1, rate: 0, workers: 1, build: 7 },
    { name: "Wachstube", short: "bildet Schildwachen aus", desc: "Steinhaus mit Schilden und \xDCbungsplatz. Schaltet Schildwachen frei; jede Stufe bildet sie 10 % schneller aus.", cost: [100, 20, 0, 25], prod: -1, rate: 0, workers: 1, build: 7 },
    { name: "Enterhalle", short: "bildet Enterer aus", desc: "Lange Halle mit Kletternetzen und Enterhaken. Schaltet Enterer frei; jede Stufe bildet sie 10 % schneller aus.", cost: [160, 60, 0, 30], prod: -1, rate: 0, workers: 1, build: 9 },
    { name: "Schleuderplatz", short: "bildet Schleuderer aus", desc: "Offener Platz mit Wurfschleuder. Schaltet Schleuderer frei; jede Stufe bildet sie 10 % schneller aus.", cost: [180, 40, 0, 50], prod: -1, rate: 0, workers: 1, build: 9 },
    { name: "Wattl\xE4uferh\xFCtte", short: "bildet Wattl\xE4ufer aus", desc: "H\xFCtte mit Wattstiefeln und Laufstegen. Schaltet Wattl\xE4ufer frei; jede Stufe bildet sie 10 % schneller aus.", cost: [120, 50, 20, 0], prod: -1, rate: 0, workers: 1, build: 8 },
    { name: "Lazarett", short: "rettet verwundete Krieger", desc: "Ein Teil der gefallenen Krieger kommt verwundet zur\xFCck statt zu sterben und wird hier wieder gesund (kostet etwas Muscheln und Wasser). Jede Stufe: mehr Betten, mehr Gerettete, schnellere Heilung.", cost: [140, 60, 80, 10], prod: -1, rate: 0, workers: 2, build: 8 },
    { name: "Seefahrer-Akademie", short: "Forschung mit Dauerboni", desc: "Hier erforschen Gelehrte Verbesserungen: h\xF6here Pf\xE4hle, sch\xE4rfere Harpunen, schnelleres Bauen \u2026 Jede Akademie-Stufe forscht schneller und schaltet h\xF6here Forschungsstufen frei.", cost: [300, 120, 80, 60], prod: -1, rate: 0, workers: 2, build: 12 },
    { name: "Werft", short: "baut Kutter f\xFCr die Flotte", desc: "Baut Kutter. Passt ein Trupp komplett auf deine Flotte (25 Krieger je Kutter), segelt er 25 % schneller und bringt 25 % mehr Beute heim. Jede Stufe: 2 Kutter mehr.", cost: [350, 40, 0, 90], prod: -1, rate: 0, workers: 2, build: 12 },
    { name: "Gezeitenuhr (Wahrzeichen)", short: "Wahrzeichen mit Bonus", desc: "Das riesige Wahrzeichen deiner Stadt. Jede Stufe: +2 % auf alle Produktion f\xFCr dich \u2013 und online +1 % f\xFCr jedes Mitglied deiner Allianz.", cost: [500, 200, 200, 150], prod: -1, rate: 0, workers: 0, build: 20 }
  ];
  var lazSave = (L) => L > 0 ? Math.min(0.6, 0.25 + 0.02 * L) : 0;
  var lazBeds = (L) => 25 * L;
  var TIDE_MUL = { "-1": [1, 1, 0.85, 1, 1.35], "0": [1, 1, 1, 1, 1], "1": [1.1, 1, 1.3, 1, 0.75] };
  var TIDE_NAME = { "-1": "Ebbe", "0": "Wechsel", "1": "Flut" };
  var tideStateOf = (v) => v > 0.35 ? 1 : v < -0.35 ? -1 : 0;
  var damTopFor = (lvl) => lvl > 0 ? 3 + 0.25 * lvl : -99;
  var CITY_TYPES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  var UNITS = [
    { name: "Harpunier", ic: "\u{1F531}", att: 10, def: 5, carry: 30, cost: [25, 15, 0, 4], time: 6, b: 15, info: "Fernkampf. Stark gegen Enterer, schwach gegen Schildwachen." },
    { name: "Schildwache", ic: "\u{1F6E1}\uFE0F", att: 3, def: 12, carry: 15, cost: [20, 10, 0, 6], time: 5, b: 16, info: "Verteidiger. Stark gegen Harpuniere, schwach gegen Schleuderer." },
    { name: "Enterer", ic: "\u{1F5E1}\uFE0F", att: 14, def: 6, carry: 25, cost: [32, 20, 0, 8], time: 8, b: 17, info: "Nahkampf. Stark gegen Schleuderer und Wattl\xE4ufer, schwach gegen Harpuniere." },
    { name: "Schleuderer", ic: "\u{1FAA8}", att: 9, def: 3, carry: 15, cost: [36, 10, 0, 12], time: 9, b: 18, info: "Belagerung: halbiert Mauern und T\xFCrme, stark gegen Schildwachen. Schwach gegen Enterer, langsam." },
    { name: "Wattl\xE4ufer", ic: "\u{1F3C3}", att: 6, def: 5, carry: 60, cost: [20, 20, 10, 0], time: 5, b: 19, info: "Schnell (40 % k\xFCrzere Wege) und tr\xE4gt doppelt Beute. Schwach gegen Enterer." }
  ];
  var NU = 5;
  var STRONG = [[2], [0], [3, 4], [1], []];
  var WEAK = [[1], [3], [0], [2], [2]];
  var zeroU = () => [0, 0, 0, 0, 0];
  var uSum = (u) => (u || []).reduce((a, b) => a + (b || 0), 0);
  var uScale = (u, f) => u.map((v) => Math.round(v * f));
  var uSub = (a, b) => a.map((v, i) => v - (b && b[i] || 0));
  var uAdd = (a, b) => a.map((v, i) => v + (b && b[i] || 0));
  function armyStr(u, other, att, tide) {
    const tm = TIDE_MUL[String(tide || 0)];
    const tot = Math.max(1, uSum(other));
    let s = 0;
    for (let i = 0; i < NU; i++) {
      const strong = other ? STRONG[i].reduce((a, j) => a + (other[j] || 0), 0) / tot : 0;
      const weak = other ? WEAK[i].reduce((a, j) => a + (other[j] || 0), 0) / tot : 0;
      s += (u[i] || 0) * (att ? UNITS[i].att : UNITS[i].def) * tm[i] * (1 + 0.5 * strong - 0.4 * weak);
    }
    return s;
  }
  var speedFactor = (u) => u[3] > 0 ? 1.25 : uSum(u) > 0 && u[4] === uSum(u) ? 0.6 : 1;
  var carryOf = (u) => u.reduce((a, v, i) => a + v * UNITS[i].carry, 0);
  var troopStr = (u) => uSum(u) ? u.map((v, i) => v ? `${UNITS[i].ic}${v}` : "").filter(Boolean).join(" ") : "keine";
  var unitCost = (u, n) => UNITS[u].cost.map((c) => c * n);
  var UPKEEP = 4e-3;
  var TERR_NAMES = [
    "M\xF6wenbank",
    "Krabbensand",
    "Seehundsplate",
    "Bernsteinriff",
    "Nebelhallig",
    "Priel-Insel",
    "Austernbank",
    "Sturmwarft",
    "Robbeneck",
    "Muschelplate",
    "Tangfeld",
    "D\xFCnenhallig",
    "Schlickwall",
    "Wrackbucht",
    "Leuchtsand",
    "Graue Plate",
    "Salzwiese",
    "Kormoranriff"
  ];
  var TERR_KIND = ["Sandbank", "Hallig", "Riff"];
  function makeTerritories() {
    let seed = 1234567;
    const R = () => {
      seed = seed * 1664525 + 1013904223 >>> 0;
      return seed / 4294967296;
    };
    const list = [];
    for (let ring = 1; ring <= 3; ring++)
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI * 2 + ring * 0.5 + (R() - 0.5) * 0.4;
        const d = ring * 1.15 + (R() - 0.5) * 0.35;
        const base = [0, 60, 220, 700][ring] * (0.8 + R() * 0.5);
        list.push({
          id: list.length,
          name: TERR_NAMES[list.length],
          ring,
          kind: TERR_KIND[Math.floor(R() * 3)],
          x: Math.cos(a) * d,
          y: Math.sin(a) * d,
          res: Math.floor(R() * 4),
          pct: [0, 10, 18, 30][ring],
          base: Math.round(base),
          pirates: Math.round(base),
          owner: 0,
          gu: [0, 0, 0, 0, 0],
          seed: Math.floor(R() * 1e6)
        });
      }
    return list;
  }
  var travelTime = (t) => 20 + Math.hypot(t.x, t.y) * 22;
  var MAX_LEVEL = 20;
  var costFor = (t, lvl) => {
    const f = Math.pow(1.55, Math.min(lvl, 10) - 1) * Math.pow(1.3, Math.max(0, lvl - 10));
    const c = DEFS[t].cost.map((v) => Math.round(v * f));
    if (lvl >= 6) {
      const w = DEFS[t].cost[0] * f * Math.min(0.6, 0.12 * (lvl - 5));
      c[1] += Math.round(w * 0.6);
      c[2] += Math.round(w * 0.5);
    }
    return c;
  };
  var buildTime = (t, lvl) => DEFS[t].build * (lvl <= 1 ? 1 : 2 * Math.pow(lvl, 1.8));
  var rateAt = (t, lvl) => lvl <= 0 ? 0 : DEFS[t].rate * lvl * (1 + 0.1 * (lvl - 1));
  var deckFor = (lvl) => 2.65 + 0.55 * Math.max(1, Math.min(lvl, 10)) + 0.2 * Math.max(0, lvl - 10);
  var beaconWood = (lvl) => 0.04 + 0.04 * lvl;
  var DAMM = 52;
  var _T = { L: 11, H: 5, K: 8, HE: 6, KA: 9, W: 10, R: 7, TH: 1, MU: 2, RE: 3, TA: 4, HP: 15, WS: 16, EN: 17, SL: 18, WL: 19 };
  var LAYOUT = [
    0,
    // Ring 1 (Stadtkern, Plätze 1–12, im Uhrzeigersinn ab Norden; 7 = Torseite)
    23,
    _T.TH,
    _T.MU,
    _T.RE,
    _T.H,
    _T.HP,
    _T.KA,
    _T.WS,
    _T.H,
    _T.TA,
    _T.K,
    _T.H,
    // Ring 2 (ab Gezeitenturm 3)
    _T.TH,
    _T.MU,
    _T.RE,
    _T.H,
    _T.R,
    _T.EN,
    _T.W,
    _T.SL,
    _T.TA,
    _T.L,
    20,
    _T.HE,
    // Ring 3 (Warft, wächst mit)
    _T.TH,
    _T.MU,
    _T.RE,
    _T.TA,
    _T.H,
    _T.L,
    _T.H,
    _T.W,
    _T.WL,
    _T.W,
    22,
    _T.TA,
    _T.RE,
    _T.MU,
    _T.TH,
    _T.H,
    _T.L,
    21,
    12,
    13,
    13,
    13,
    13,
    13,
    13,
    13,
    13,
    14
  ];
  var PLOTS = 53;
  var INNER = 13;
  var RING3 = 25;
  var WALL = 43;
  var TOWERS = 44;
  var OUTER_LEVEL = 3;
  var DAY = 240;
  var STORM_LEN = 90;
  var EXP_TIME = 40;
  var EXP_FOOD = 30;
  var EBB = 1;
  var KEY = "pfahlstadt_save_v1";
  function fmtTime(s) {
    const t = Math.ceil(s);
    if (t >= 86400) return `${Math.floor(t / 86400)} T ${Math.floor(t % 86400 / 3600)} Std`;
    if (t >= 3600) return `${Math.floor(t / 3600)}h ${String(Math.floor(t % 3600 / 60)).padStart(2, "0")}m`;
    if (t >= 60) return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
    return t + "s";
  }
  var Colony = class {
    constructor() {
      this.log = [];
      this.rates = [0, 0, 0, 0];
      this.efficiency = 1;
      this.capacity = 4;
      this.workers = 0;
      this.water = 1.4;
      this.tideSin = 0;
      this.rising = true;
      this.wasBurning = true;
      this.time = 0;
      this.load();
    }
    msg(text) {
      this.log.push({ text, t: this.time });
      if (this.log.length > 30) this.log.shift();
    }
    get towerLevel() {
      return this.s.plots[0].level;
    }
    levels(t) {
      let n = 0;
      for (const p of this.s.plots) if (p.type === t) n += p.level;
      return n;
    }
    /// Gebäude auf dem Gelände (ohne Turm, Mauer, Abwehrtürme)
    get builtCount() {
      let n = 0;
      this.s.plots.forEach((p, i) => {
        if (i > 0 && i < WALL && p.type >= 0 && p.level > 0) n++;
      });
      return n;
    }
    get areaRadius() {
      return Math.min(66, 40 + 1.4 * this.builtCount);
    }
    ring3Needed(i) {
      return 8 + (i - RING3);
    }
    get storage() {
      return Math.round((1500 + 2500 * this.levels(T.LAGER)) * mods(this).store);
    }
    get maxBuilds() {
      return mods(this).builds;
    }
    get queueMax() {
      return mods(this).queue;
    }
    get troopsAway() {
      let a = zeroU();
      for (const m of this.s.botMarches || []) a = uAdd(a, m.u);
      if (this.online && this.online.active) return uAdd(a, this.online.troopsAway());
      for (const m of this.s.marches) a = uAdd(a, m.u);
      for (const t of this.s.terr) a = uAdd(a, t.gu);
      return a;
    }
    /// Muscheln pro Minute für die Krieger: Besatzungen auf Inseln brauchen nur die Hälfte
    get upkeep() {
      const o = this.online;
      let gar = 0;
      if (o && o.active) {
        if (o.world && o.me) {
          for (const t of o.world.territories) if (t.owner === o.me.id) gar += uSum(t.gu || zeroU());
        }
      } else for (const t of this.s.terr) gar += uSum(t.gu);
      return (this.troopTotal - 0.5 * gar) * UPKEEP * 60;
    }
    /// Krieger entlassen: 25 % der Ausbildungskosten zurück
    dismiss(u, n) {
      const s = this.s;
      n = Math.min(n, s.troops[u]);
      if (n <= 0) return 0;
      s.troops[u] -= n;
      unitCost(u, n).forEach((v, i) => v && this.addRes(i, Math.floor(v * 0.25)));
      this.msg(`${n}\xD7 ${UNITS[u].name} entlassen (25 % der Kosten zur\xFCck).`);
      return n;
    }
    summerTick(dt) {
      if (season().idx !== 1 || this.s.res[MUSCHELN] < 60) return;
      this.s.summerT = (this.s.summerT || 200) - dt;
      if (this.s.summerT > 0) return;
      this.s.summerT = 180 + Math.random() * 120;
      const mu = Math.round(Math.min(this.s.res[MUSCHELN] * 0.05, 40 + 10 * this.towerLevel)), me = Math.round(mu * 0.6);
      this.s.res[MUSCHELN] -= mu;
      this.addRes(METALL, me);
      this.msg(`\u2600\uFE0F Badeg\xE4ste kaufen ${mu} Muscheln und zahlen ${me} Altmetall.`);
    }
    get troopTotal() {
      return uSum(this.s.troops) + uSum(this.troopsAway);
    }
    get defense() {
      const base = armyStr(this.s.troops, null, false) * mods(this).def + this.healthy * 2 + 40 * this.levels(T.ABWEHR);
      return Math.round(base * (1 + 0.12 * this.levels(T.WACHTURM) + 0.15 * this.levels(T.MAUER)));
    }
    get power() {
      let b = 0;
      for (const p of this.s.plots) if (p.type >= 0) b += p.level * 10;
      return b + this.troopTotal * 2 + this.defense;
    }
    get deck() {
      return deckFor(this.towerLevel) + mods(this).deck;
    }
    get damTop() {
      const L = this.levels(T.DAMM);
      return L > 0 ? damTopFor(L) + mods(this).dam : -99;
    }
    /// Wasser innerhalb des Damms: hält der Damm, bleibt die Stadt trocken
    get damHolds() {
      return this.water > this.deck && this.water <= this.damTop;
    }
    get inWater() {
      return this.damHolds ? this.deck - 0.35 : this.water;
    }
    get freeboard() {
      return this.deck - this.inWater;
    }
    get storm() {
      return this.s.stormLeft > 0 || !!this.eventStorm;
    }
    get stormWarning() {
      return !this.storm && this.s.stormTimer < 30;
    }
    get healthy() {
      return Math.max(0, this.s.survivors - this.s.sick);
    }
    get beaconBurning() {
      return this.s.beaconOn && this.s.res[HOLZ] > 0.01;
    }
    get starving() {
      return this.s.survivors > 0 && (this.s.res[MUSCHELN] <= 0.01 || this.s.res[WASSER] <= 0.01);
    }
    // ---------- Simulation ----------
    tick(dt) {
      const s = this.s;
      this.time += dt;
      s.dayTime += dt / DAY;
      if (s.dayTime >= 1) {
        s.dayTime -= 1;
        s.days++;
        this.msg(`Tag ${s.days} beginnt.`);
      }
      if (s.stormLeft > 0) {
        s.stormLeft -= dt;
        if (s.stormLeft <= 0) {
          s.stormLeft = 0;
          s.stormTimer = 300 + Math.random() * 180;
          this.msg("Die Sturmflut zieht ab.");
        }
      } else {
        const before = s.stormTimer;
        s.stormTimer -= dt * (season().idx === 2 ? 1.4 : 1);
        if (before >= 30 && s.stormTimer < 30) this.msg("Warnung: Eine Sturmflut zieht auf!");
        if (s.stormTimer <= 0) {
          s.stormLeft = STORM_LEN;
          this.msg("STURMFLUT! Das Wasser steigt!");
        }
      }
      this.updateWater();
      if (this.wasBurning && !this.beaconBurning && s.beaconOn) this.msg("Kein Holz mehr \u2013 das Licht im Leuchtturm geht aus!");
      this.wasBurning = this.beaconBurning;
      this.applyRates(this.computeRates(false), dt);
      this.advanceBuild(dt);
      this.population(dt);
      this.expedition(dt);
      this.military(dt, false);
      this.gathering(dt, false);
      traderTick(this, dt);
      treasureTick(this, dt);
      obstTick(this, dt);
      this.summerTick(dt);
      botTick(this, dt);
      researchTick(this, dt);
      boatTick(this, dt);
      this.healTick(dt);
      if (this.eventStorm && this.freeboard < 0) {
        for (let i = 0; i < 4; i++) s.res[i] *= 1 - 0.03 * dt / 60;
        this.floodWarnT = (this.floodWarnT || 0) - dt;
        if (this.floodWarnT <= 0) {
          this.floodWarnT = 30;
          this.msg("\u{1F30A} Die Sturmflut sp\xFClt Vorr\xE4te weg! Damm oder Gezeitenturm ausbauen!");
        }
      }
      queueTick(this);
      this.achT = (this.achT || 0) - dt;
      if (this.achT <= 0) {
        this.achT = 2;
        checkAch(this);
      }
    }
    updateWater() {
      const s = this.s;
      const phase = this.tidePhase(0);
      this.tideSin = Math.sin(phase);
      this.rising = Math.cos(phase) > 0;
      let surge = 0;
      if (s.stormLeft > 0) {
        const ramp = Math.max(0, Math.min(1, Math.min((STORM_LEN - s.stormLeft) / 12, s.stormLeft / 12)));
        surge = ramp * (2.6 + 0.3 * Math.sin(this.time * 1.7));
      }
      const ev = this.online ? this.online.eventLeft("sturmflut") : 0;
      if (ev > 0) surge = Math.max(surge, Math.min(1, ev / 15) * (3.2 + 0.4 * Math.sin(this.time * 1.3)));
      this.eventStorm = ev > 0;
      this.water = 1.4 + 1.6 * this.tideSin + surge;
    }
    /// Gezeitenphase jetzt + sec Sekunden. Online für alle Spieler gleich (Serverzeit), offline aus dem eigenen Tag
    tidePhase(sec) {
      const o = this.online;
      if (o && o.active && o.offset !== void 0 && o.status === "online") return 2 * Math.PI * ((Date.now() - o.offset) / 1e3 + sec) / 120;
      return this.s.dayTime * 2 * Math.PI * 2 + 2 * Math.PI * sec / 120;
    }
    tideState(sec) {
      return tideStateOf(Math.sin(this.tidePhase(sec || 0)));
    }
    /// Sekunden bis zum nächsten Wechsel des Gezeiten-Zustands
    tideChangeIn() {
      const now = this.tideState(0);
      for (let k = 1; k < 130; k++) if (this.tideState(k) !== now) return k;
      return 60;
    }
    computeRates(offline) {
      const s = this.s;
      const r = [0, 0, 0, 0];
      let workers = 0, cap = 4, smoke = 0;
      for (const p of s.plots) {
        if (p.type < 0 || p.level <= 0) continue;
        workers += DEFS[p.type].workers * p.level;
        if (p.type === T.HAUS) cap += 6 * p.level;
        if (p.type === T.RAUCH) smoke += p.level;
      }
      this.workers = workers;
      this.capacity = cap;
      this.efficiency = workers === 0 ? 1 : Math.min(1, Math.max(0, this.healthy - this.gatherers) / workers);
      const fb = this.freeboard;
      const flood = offline ? 0.5 : fb < 0 ? Math.max(0.25, Math.min(1, 1 + fb / 2)) : 1;
      const tide = offline ? 0 : this.tideSin;
      let avail = Math.max(0, this.healthy - this.gatherers);
      const prio = (t) => DEFS[t].prod === MUSCHELN || DEFS[t].prod === WASSER ? 0 : DEFS[t].prod === HOLZ ? 1 : 2;
      const prodPlots = s.plots.filter((p) => p.type >= 0 && p.level > 0 && DEFS[p.type].prod >= 0).sort((a, b) => prio(a.type) - prio(b.type));
      const effOf = /* @__PURE__ */ new Map();
      for (const p of prodPlots) {
        const need = DEFS[p.type].workers * p.level;
        effOf.set(p, need > 0 ? Math.min(1, avail / need) : 1);
        avail -= Math.min(avail, need);
      }
      for (const p of prodPlots) {
        const d = DEFS[p.type];
        let f = 1;
        if (p.type === T.MUSCHEL) f = 1 - 0.5 * tide;
        if (p.type === T.TAUCHER) f = 1 + 0.5 * tide;
        if (p.type === T.REGEN && this.storm && !offline) f = 2.5;
        const se = season().idx;
        if (se === 0 && p.type === T.REGEN) f *= 1.2;
        if (se === 1 && p.type === T.MUSCHEL) f *= 1.15;
        if (se === 2 && p.type === T.TREIBHOLZ) f *= 1.25;
        if (se === 3 && p.type === T.MUSCHEL) f *= 0.8;
        r[d.prod] += rateAt(p.type, p.level) * effOf.get(p) * flood * f;
      }
      const kitchen = 1 + Math.min(0.6, 0.06 * this.levels(T.KUECHE));
      const terrBonus = [1, 1, 1, 1];
      const owned = this.online && this.online.active ? this.online.owned : s.terr.filter((t) => t.owner === 1);
      for (const t of owned) terrBonus[t.res] += t.pct / 100;
      const lh = this.online && this.online.active && this.online.lh && this.online.lh.bonus ? 1.2 : 1;
      const pm = mods(this).prod;
      for (let i = 0; i < 4; i++) if (r[i] > 0) r[i] *= kitchen * terrBonus[i] * lh * pm;
      r[MUSCHELN] -= this.upkeep / 60;
      r[MUSCHELN] += 0.25;
      r[WASSER] += 0.25;
      this.ration = [s.res[MUSCHELN] <= 1, s.res[WASSER] <= 1];
      r[MUSCHELN] -= s.survivors * 0.035 * (1 - Math.min(0.5, 0.08 * smoke)) * (this.ration[0] ? 0.6 : 1);
      r[WASSER] -= s.survivors * 0.03 * (this.ration[1] ? 0.6 : 1);
      if (s.beaconOn) r[HOLZ] -= beaconWood(this.towerLevel);
      for (let i = 0; i < 4; i++) this.rates[i] = r[i] * 60;
      return r;
    }
    applyRates(r, dt) {
      const cap = this.storage;
      for (let i = 0; i < 4; i++) {
        const v = this.s.res[i] + r[i] * dt;
        this.s.res[i] = Math.max(0, r[i] > 0 ? Math.min(v, Math.max(cap, this.s.res[i])) : v);
      }
    }
    addRes(i, v) {
      this.s.res[i] = Math.max(0, Math.min(this.storage, this.s.res[i] + v));
    }
    advanceBuild(dt) {
      this.s.plots.forEach((p, i) => {
        if (p.buildLeft <= 0) return;
        p.buildLeft -= dt;
        if (p.buildLeft <= 0) {
          p.buildLeft = 0;
          p.level++;
          if (i === 0) this.msg(`Gezeitenturm Stufe ${p.level}: Die Stadt steht jetzt auf ${deckFor(p.level).toFixed(2)} m!`);
          else this.msg(`${DEFS[p.type].name} Stufe ${p.level} fertig!`);
        }
      });
    }
    population(dt) {
      const s = this.s;
      const wet = this.freeboard < 0, starving = this.starving;
      if (wet || starving) {
        const sev = (wet ? -this.freeboard * 0.6 : 0) + (starving ? 0.25 : 0);
        s.sickProg += dt * sev * this.healthy / 120;
        while (s.sickProg >= 1 && s.sick < s.survivors) {
          s.sickProg -= 1;
          s.sick++;
          this.msg(starving ? "Hunger und Durst: Jemand ist erkrankt!" : "Nasse F\xFC\xDFe, kalter Wind: Jemand ist erkrankt!");
        }
      } else s.sickProg = Math.max(0, s.sickProg - dt * 0.01);
      if (s.sick > 0 && s.survivors > 1 && (this.freeboard < -1.2 || starving)) {
        s.deathProg += dt * Math.min(s.sick, 10) / 900;
        if (s.deathProg >= 1) {
          s.deathProg = 0;
          s.sick--;
          s.survivors--;
          this.msg("Ein Siedler hat es nicht geschafft \u2026");
        }
      }
      if (s.sick > 0 && !wet) {
        let healers = 0;
        for (const p of s.plots) if (p.type === T.HEILER) healers += p.level;
        s.healProg += dt * (Math.max(4e-3, 15e-4 * Math.min(s.sick, 60)) + 0.02 * healers) * (this.beaconBurning ? 1.5 : 1);
        while (s.healProg >= 1 && s.sick > 0) {
          s.healProg -= 1;
          s.sick--;
          this.msg("Ein Kranker ist wieder gesund.");
        }
      }
      if (s.survivors < this.capacity && !wet && !starving && this.beaconBurning && this.rates[MUSCHELN] > 4 && this.rates[WASSER] > 3.5) {
        s.arriveProg += dt / 25;
        if (s.arriveProg >= 1) {
          s.arriveProg = 0;
          s.survivors++;
          this.msg("Ein Boot legt an: Ein neuer Siedler!");
        }
      }
    }
    expedition(dt) {
      const s = this.s;
      if (s.expLeft <= 0) return;
      s.expLeft -= dt;
      if (!s.expSurprised && this.water > 2) {
        s.expSurprised = true;
        this.msg("Die Flut kommt! Die Wattwanderer m\xFCssen umkehren \u2026");
      }
      if (s.expLeft <= 0) {
        s.expLeft = 0;
        this.finishExpedition();
      }
    }
    // ---------- Aktionen ----------
    get activeBuilds() {
      return this.s.plots.filter((p) => p.buildLeft > 0).length;
    }
    canAfford(c) {
      return c.every((v, i) => this.s.res[i] >= v);
    }
    pay(c) {
      c.forEach((v, i) => this.s.res[i] -= v);
    }
    buildBlocker(plot, t) {
      if (plot === 0 || t === T.TURM) return "Nicht m\xF6glich";
      if (this.s.plots[plot].type >= 0) return "Platz belegt";
      if (LAYOUT[plot] !== t) return `Dieser Platz ist f\xFCr: ${DEFS[LAYOUT[plot]].name}`;
      if (plot >= TOWERS && plot < DAMM && this.levels(T.MAUER) <= 0) return "Erst die Festungsmauer bauen";
      if (plot >= INNER && plot < RING3 && this.towerLevel < OUTER_LEVEL) return `\xC4u\xDFerer Ring ab Gezeitenturm Stufe ${OUTER_LEVEL}`;
      if (plot >= RING3 && plot < WALL && this.builtCount < this.ring3Needed(plot)) return `Gel\xE4nde zu klein: noch ${this.ring3Needed(plot) - this.builtCount} Geb\xE4ude bauen`;
      if (this.activeBuilds >= this.maxBuilds) return "Alle Bautrupps besch\xE4ftigt";
      if (!this.canAfford(costFor(t, 1))) return "Zu wenig Rohstoffe";
      return null;
    }
    startBuild(plot, t) {
      if (this.buildBlocker(plot, t)) return false;
      this.pay(costFor(t, 1));
      const bt = buildTime(t, 1) * mods(this).build;
      this.s.plots[plot] = { type: t, level: 0, buildLeft: bt, buildTotal: bt };
      this.msg(`Bau von ${DEFS[t].name} begonnen.`);
      questEvent(this, "build", 1);
      return true;
    }
    upgradeBlocker(plot) {
      const p = this.s.plots[plot];
      if (p.type < 0) return "Kein Geb\xE4ude";
      if (p.buildLeft > 0) return "Wird gerade gebaut";
      if (p.level >= MAX_LEVEL) return "Maximale Stufe";
      if (plot !== 0 && p.level + 1 > this.towerLevel) return `Erst Gezeitenturm auf Stufe ${p.level + 1}`;
      if (this.activeBuilds >= this.maxBuilds) return "Alle Bautrupps besch\xE4ftigt";
      if (!this.canAfford(costFor(p.type, p.level + 1))) return "Zu wenig Rohstoffe";
      return null;
    }
    startUpgrade(plot) {
      if (this.upgradeBlocker(plot)) return false;
      const p = this.s.plots[plot];
      this.pay(costFor(p.type, p.level + 1));
      p.buildTotal = p.buildLeft = buildTime(p.type, p.level + 1) * mods(this).build;
      this.msg(`Ausbau: ${DEFS[p.type].name} \u2192 Stufe ${p.level + 1}`);
      questEvent(this, "build", 1);
      return true;
    }
    demolish(plot) {
      if (plot === 0) return;
      const p = this.s.plots[plot];
      const n = p.type >= 0 ? DEFS[p.type].name : "Geb\xE4ude";
      this.s.plots[plot] = { type: -1, level: 0, buildLeft: 0, buildTotal: 0 };
      this.msg(`${n} abgerissen.`);
    }
    toggleBeacon() {
      this.s.beaconOn = !this.s.beaconOn;
      this.msg(this.s.beaconOn ? "Leuchtturm-Licht eingeschaltet." : "Leuchtturm-Licht aus \u2013 Holz wird gespart, aber keine Boote finden her.");
      this.wasBurning = this.beaconBurning;
    }
    expeditionBlocker() {
      if (this.s.expLeft > 0) return "Unterwegs";
      if (this.water > EBB) return "Wartet auf Ebbe";
      if (this.healthy < 2) return "Zu wenig Gesunde";
      if (this.s.res[MUSCHELN] < EXP_FOOD) return "Zu wenig Muscheln";
      return null;
    }
    startExpedition() {
      if (this.expeditionBlocker()) return false;
      this.s.res[MUSCHELN] -= EXP_FOOD;
      this.s.expLeft = EXP_TIME * (season().idx === 3 ? 1.5 : 1);
      this.s.expSurprised = false;
      this.msg("Eine Gruppe wandert ins Watt hinaus.");
      return true;
    }
    finishExpedition() {
      const s = this.s;
      const m = (0.8 + 0.4 * this.towerLevel) * (s.expSurprised ? 0.4 : 1);
      const r = (a, b) => Math.round((a + Math.random() * (b - a)) * m);
      const holz = r(40, 90), mu = r(30, 70), me = r(6, 22);
      this.addRes(HOLZ, holz);
      this.addRes(MUSCHELN, mu);
      this.addRes(METALL, me);
      questEvent(this, "exp", 1);
      if (season().idx === 3 && Math.random() < 0.25 && this.healthy > 1) {
        this.s.sick++;
        this.msg("\u2744\uFE0F Eisgang: Ein Wattwanderer hat sich erk\xE4ltet.");
      }
      this.msg(`Wattwanderung zur\xFCck: +${holz} Holz, +${mu} Muscheln, +${me} Altmetall`);
      if (!s.expSurprised && Math.random() < 0.3 && s.survivors < this.capacity) {
        s.survivors++;
        this.msg("Auf einer Sandbank wurde ein Gestrandeter gefunden!");
      }
    }
    // ---------- Militär: Ausbildung, Märsche, Kämpfe, Überfälle ----------
    report(text, win, rp) {
      const s = this.s;
      s.reports.unshift({ text, win, day: s.days, time: s.dayTime, ...rp ? { rp } : {} });
      if (s.reports.length > 25) s.reports.length = 25;
      this.msg(text);
    }
    trainSlots() {
      return 10 * this.levels(T.KASERNE);
    }
    queued() {
      return this.s.train.reduce((a, q) => a + q.n, 0);
    }
    trainBlocker(u, n) {
      if (this.levels(T.KASERNE) <= 0) return "Erst eine Kaserne bauen";
      if (this.levels(UNITS[u].b) <= 0) return `Erst ${DEFS[UNITS[u].b].name} bauen`;
      if (this.queued() + n > this.trainSlots()) return `Schlange voll (max. ${this.trainSlots()})`;
      if (!this.canAfford(unitCost(u, n))) return "Zu wenig Rohstoffe";
      return null;
    }
    startTrain(u, n) {
      if (this.trainBlocker(u, n)) return false;
      this.pay(unitCost(u, n));
      const per = UNITS[u].time / (1 + 0.25 * (this.levels(T.KASERNE) - 1)) / (1 + 0.1 * (this.levels(UNITS[u].b) - 1)) * mods(this).train;
      this.s.train.push({ u, n, per, left: per });
      this.msg(`${n}\xD7 ${UNITS[u].name} in Ausbildung.`);
      return true;
    }
    scoutBlocker() {
      if (this.levels(T.WACHTURM) <= 0) return "Sp\xE4her brauchen einen Wachturm";
      if (this.s.res[MUSCHELN] < 40 || this.s.res[METALL] < 20) return "Sp\xE4her kosten 40 Muscheln und 20 Altmetall";
      return null;
    }
    payScout() {
      this.s.res[MUSCHELN] -= 40;
      this.s.res[METALL] -= 20;
    }
    sendScout(id) {
      if (this.scoutBlocker()) return false;
      const t = this.s.terr[id], tt = travelTime(t) * 0.5;
      this.payScout();
      this.s.marches.push({ target: id, u: zeroU(), left: tt, total: tt, phase: "out", kind: "scout" });
      this.msg(`\u{1F52D} Sp\xE4her nach ${t.name} unterwegs.`);
      return true;
    }
    // ---------- Lazarett ----------
    addWounded(u) {
      const L = this.levels(T.LAZARETT);
      if (L <= 0 || !u) return;
      const s = this.s, f = Math.min(0.8, lazSave(L) + mods(this).save), cap = lazBeds(L);
      let w = uScale(u, f), room = cap - uSum(s.wounded);
      if (room <= 0) return;
      if (uSum(w) > room) w = uScale(w, room / uSum(w));
      s.wounded = uAdd(s.wounded, w);
      if (uSum(w) > 0) this.msg(`\u{1FA79} ${uSum(w)} Verwundete im Lazarett.`);
    }
    healTick(dt) {
      const s = this.s, L = this.levels(T.LAZARETT);
      if (L <= 0 || !uSum(s.wounded)) return;
      s.healT = (s.healT || 0) + dt * L * (season().idx === 0 ? 1.5 : 1);
      while (s.healT >= 8) {
        const k = s.wounded.findIndex((v) => v > 0);
        if (k < 0) break;
        const cost = [0, Math.ceil(UNITS[k].cost[1] * 0.3), Math.ceil(UNITS[k].cost[0] * 0.2), 0];
        if (s.res[MUSCHELN] < cost[1] || s.res[WASSER] < cost[2]) {
          s.healT = 8;
          break;
        }
        s.res[MUSCHELN] -= cost[1];
        s.res[WASSER] -= cost[2];
        s.wounded[k]--;
        s.troops[k]++;
        s.healT -= 8;
        questEvent(this, "heal", 1);
      }
    }
    attackBlocker(id, u) {
      const t = this.s.terr[id];
      if (!t) return "Unbekanntes Ziel";
      if (uSum(u) <= 0) return "Keine Truppen ausgew\xE4hlt";
      if (u.some((v, i) => v > this.s.troops[i])) return "So viele Truppen hast du nicht zu Hause";
      if (this.s.marches.some((m) => m.target === id && m.phase === "out" && m.kind !== "scout")) return "Dorthin ist schon ein Trupp unterwegs";
      return null;
    }
    sendTroops(id, u, cap) {
      if (this.attackBlocker(id, u)) return false;
      const t = this.s.terr[id], tt = travelTime(t) * speedFactor(u) * mods(this).travel * fleetSpeed(this, u) * capSpeed(this, cap);
      if (cap) capSend(this, cap, tt);
      this.s.troops = uSub(this.s.troops, u);
      this.s.marches.push({ target: id, u: u.slice(), left: tt, total: tt, phase: "out", kind: t.owner === 1 ? "reinforce" : "attack", cap: cap || null });
      this.msg(t.owner === 1 ? `Verst\xE4rkung nach ${t.name} unterwegs.` : `Angriff auf ${t.name} gestartet!`);
      return true;
    }
    withdraw(id) {
      const t = this.s.terr[id];
      if (!t || t.owner !== 1 || uSum(t.gu) === 0) return false;
      const tt = travelTime(t) * speedFactor(t.gu);
      this.s.marches.push({ target: id, u: t.gu.slice(), left: tt, total: tt, phase: "back", kind: "return" });
      t.gu = zeroU();
      this.msg(`Besatzung von ${t.name} kehrt heim.`);
      return true;
    }
    battle(m, t) {
      const tide = this.tideState(0);
      const att = armyStr(m.u, null, true, tide) * mods(this).atk * capAtk(this, m.cap, tide) * (0.85 + Math.random() * 0.3);
      if (att > t.pirates) {
        const loss = Math.min(0.9, Math.pow(t.pirates / att, 1.3) * 0.6);
        const lost = uScale(m.u, loss);
        t.owner = 1;
        t.pirates = 0;
        t.gu = uAdd(t.gu, uSub(m.u, lost));
        this.addWounded(lost);
        questEvent(this, "win", 1);
        this.report(`Sieg! ${t.name} erobert. Verluste: ${troopStr(lost)}. Bonus: +${t.pct} % ${RES[t.res]}.${tide ? " (" + TIDE_NAME[tide] + ")" : ""}`, true);
      } else {
        const lost = uScale(m.u, 0.8), rest = uSub(m.u, lost);
        this.addWounded(lost);
        t.pirates = Math.max(Math.round(t.base * 0.3), Math.round(t.pirates - att * 0.5));
        if (uSum(rest) > 0) {
          const tt = travelTime(t) * speedFactor(rest);
          this.s.marches.push({ target: t.id, u: rest, left: tt, total: tt, phase: "back", kind: "return" });
        }
        this.report(`Niederlage bei ${t.name}. Verluste: ${troopStr(lost)}. Die Piraten sind geschw\xE4cht.`, false);
      }
    }
    military(dt, offline) {
      const s = this.s;
      if (s.train.length) {
        const q = s.train[0];
        q.left -= dt;
        while (q.left <= 0 && q.n > 0) {
          q.n--;
          s.troops[q.u]++;
          questEvent(this, "train", 1);
          q.left += q.per;
        }
        if (q.n <= 0) {
          s.train.shift();
          this.msg(`Ausbildung fertig: ${UNITS[q.u].name}.`);
        }
      }
      for (let i = s.marches.length - 1; i >= 0; i--) {
        const m = s.marches[i];
        m.left -= dt;
        if (m.left > 0) continue;
        s.marches.splice(i, 1);
        const t = s.terr[m.target];
        if (m.kind === "scout") {
          this.report(`\u{1F52D} Sp\xE4herbericht ${t.name}: ${t.owner === 1 ? "deine Besatzung " + troopStr(t.gu) : "Piraten mit St\xE4rke " + Math.round(t.pirates)}. Gezeiten jetzt: ${TIDE_NAME[this.tideState(0)]}.`, true);
          continue;
        }
        if (m.phase === "back") {
          s.troops = uAdd(s.troops, m.u);
          this.msg(`${uSum(m.u)} Krieger sind heimgekehrt.`);
        } else if (t.owner === 1) {
          t.gu = uAdd(t.gu, m.u);
          this.msg(`Verst\xE4rkung in ${t.name} angekommen.`);
        } else this.battle(m, t);
      }
      for (const t of s.terr) if (t.owner === 0 && t.pirates < t.base) t.pirates = Math.min(t.base, t.pirates + t.base * dt / 600);
      if (offline) return;
      const owned = s.terr.filter((t) => t.owner === 1);
      if (owned.length) {
        s.counterTimer -= dt;
        if (s.counterTimer <= 0) {
          s.counterTimer = 360 + Math.random() * 300;
          const t = owned[Math.floor(Math.random() * owned.length)];
          const str = t.base * (0.5 + Math.random() * 0.5);
          const def = armyStr(t.gu, null, false) * (0.85 + Math.random() * 0.3);
          if (def > str) {
            const lost = uScale(t.gu, Math.min(0.9, Math.pow(str / def, 1.3) * 0.5));
            t.gu = uSub(t.gu, lost);
            this.addWounded(lost);
            this.report(`Piraten griffen ${t.name} an und wurden zur\xFCckgeschlagen! Verluste: ${troopStr(lost)}.`, true);
          } else {
            t.owner = 0;
            t.gu = zeroU();
            t.pirates = t.base;
            this.report(`${t.name} ist an die Piraten gefallen! Die Besatzung ist verloren.`, false);
          }
        }
      }
      if (s.days >= 2) {
        const before = s.raidTimer;
        s.raidTimer -= dt;
        if (before >= 30 && s.raidTimer < 30) this.msg("Sp\xE4her melden: Piratenboote n\xE4hern sich der Stadt!");
        if (s.raidTimer <= 0) {
          s.raidTimer = 420 + Math.random() * 300;
          const str = (25 + 18 * (s.days - 1) + 10 * this.towerLevel) * (0.8 + Math.random() * 0.4);
          const fm = formMul(formOf(this)), troopPart = armyStr(s.troops, null, false) * mods(this).def;
          const def = (this.defense + troopPart * (fm - 1)) * (0.85 + Math.random() * 0.3);
          const n = Math.max(4, Math.round(str / 8)), pu = [Math.round(n * 0.3), Math.round(n * 0.1), Math.round(n * 0.35), Math.round(n * 0.1), Math.round(n * 0.15)];
          const rp = (win, al, dl) => ({ a: { n: "Piraten", u: pu, l: al }, d: { n: s.playerName || "Pfahlstadt", u: s.troops.slice(0, 5), l: dl, def: Math.round(this.defense), f: formOf(this) }, win: !win, tide: this.tideState(0), raid: true });
          if (def > str) {
            const loss = Math.min(0.8, Math.pow(str / def, 1.3) * 0.5);
            const lost = uScale(s.troops, loss), r = rp(true, pu, lost);
            s.troops = uSub(s.troops, lost);
            this.addWounded(lost);
            this.report(`Piraten\xFCberfall abgewehrt! (St\xE4rke ${Math.round(str)} gegen ${Math.round(def)}) Verluste: ${troopStr(lost)}.`, true, r);
          } else {
            const lost = s.res.map((v) => Math.round(v * 0.2)), r = rp(false, uScale(pu, 0.3), uSub(s.troops, uScale(s.troops, 0.4)));
            lost.forEach((v, i) => s.res[i] -= v);
            this.addWounded(uSub(s.troops, uScale(s.troops, 0.4)));
            s.troops = uScale(s.troops, 0.4);
            this.report(`Piraten haben die Stadt gepl\xFCndert! (St\xE4rke ${Math.round(str)} gegen ${Math.round(def)}) Verloren: ${lost.map((v, i) => v + " " + RES[i]).join(", ")}.`, false, r);
          }
        }
      }
    }
    get raidIn() {
      return this.s.days >= 2 ? this.s.raidTimer : null;
    }
    /// Alte Spielstände: Gebäude auf die festen Plätze umziehen (Stufe bleibt erhalten)
    relayout() {
      const s = this.s, moved = [];
      for (let i = 1; i < PLOTS; i++) {
        const p = s.plots[i];
        if (p.type >= 0 && p.type !== LAYOUT[i]) {
          moved.push(p);
          s.plots[i] = { type: -1, level: 0, buildLeft: 0, buildTotal: 0 };
        }
      }
      moved.sort((a, b) => b.level - a.level);
      for (const p of moved) {
        let j = -1;
        for (let i = 1; i < PLOTS; i++) if (LAYOUT[i] === p.type && s.plots[i].type < 0) {
          j = i;
          break;
        }
        if (j < 0) {
          for (let i = 1; i < WALL; i++) if (s.plots[i].type < 0) {
            j = i;
            break;
          }
        }
        if (j >= 0) s.plots[j] = p;
      }
    }
    ensureMilitary() {
      const s = this.s;
      if (!s.nodes) s.nodes = [];
      if (!s.gath) s.gath = [];
      if (s.nodeTimer === void 0) s.nodeTimer = 2;
      if (s.nodeSeq === void 0) s.nodeSeq = 1;
      if (!s.troops) s.troops = zeroU();
      while (s.troops.length < NU) s.troops.push(0);
      if (!s.wounded) s.wounded = zeroU();
      ensureBots(this);
      for (const m of s.marches || []) if (!m.u) {
        m.u = [m.h || 0, m.w || 0, 0, 0, 0];
        delete m.h;
        delete m.w;
      }
      for (const t of s.terr || []) if (!t.gu) {
        t.gu = [t.gh || 0, t.gw || 0, 0, 0, 0];
        delete t.gh;
        delete t.gw;
      }
      if (!s.train) s.train = [];
      if (!s.marches) s.marches = [];
      if (!s.reports) s.reports = [];
      if (!s.terr || s.terr.length !== 18) s.terr = makeTerritories();
      if (s.raidTimer === void 0) s.raidTimer = 480;
      if (s.counterTimer === void 0) s.counterTimer = 420;
      while (s.plots.length < PLOTS) s.plots.push({ type: -1, level: 0, buildLeft: 0, buildTotal: 0 });
      if ((s.layoutV || 0) < 4) {
        this.relayout();
        s.layoutV = 4;
      }
      if (!s.nodes.length && !s.gath.length) {
        for (let k = 0; k < 4; k++) {
          this.spawnNodeAt(k);
        }
      }
    }
    // ---------- Sammeln mit Bewohnern ----------
    get gatherers() {
      return this.s.gath ? this.s.gath.length : 0;
    }
    get freeVillagers() {
      return Math.max(0, this.healthy - this.gatherers);
    }
    get carry() {
      return (18 + 3 * this.towerLevel) * (this.online && this.online.eventLeft("doppelt") > 0 ? 2 : 1) * mods(this).gather;
    }
    nodeById(id) {
      return this.s.nodes.find((n) => n.id === id);
    }
    nodeFlooded(n) {
      return this.water > n.h + 0.25;
    }
    assigned(id) {
      return this.s.gath.filter((g) => g.node === id).length;
    }
    /// Weg von der Stadtmitte durchs Tor hinaus zur Sammelstelle (Punkte in x/z)
    gatherPath(n) {
      const R = this.areaRadius + 3;
      const pts = [[0, -4], [0, -(R - 3)], [0, -(R + 5)]];
      const a = Math.atan2(n.x, n.z);
      let from = Math.PI, to = a < 0 ? a + Math.PI * 2 : a;
      const steps = Math.ceil(Math.abs(to - from) / 0.2);
      for (let k = 1; k <= steps; k++) {
        const t = from + (to - from) * (k / steps);
        pts.push([Math.sin(t) * (R + 5), Math.cos(t) * (R + 5)]);
      }
      pts.push([n.x, n.z]);
      let L = 0;
      const seg = [0];
      for (let k = 1; k < pts.length; k++) {
        L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
        seg.push(L);
      }
      return { pts, seg, L };
    }
    pathPoint(path, d) {
      const { pts, seg } = path;
      d = Math.max(0, Math.min(path.L, d));
      for (let k = 1; k < pts.length; k++) if (d <= seg[k]) {
        const t = (d - seg[k - 1]) / Math.max(1e-3, seg[k] - seg[k - 1]);
        return [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * t, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * t, Math.atan2(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])];
      }
      const e = pts[pts.length - 1];
      return [e[0], e[1], 0];
    }
    spawnNode() {
      const s = this.s, R = this.areaRadius + 3;
      const type = Math.floor(Math.random() * 4);
      const a = Math.PI + (Math.random() - 0.5) * 2.2;
      const r = R + 12 + Math.random() * 26;
      const base = [140, 110, 100, 45][type] * (1 + 0.15 * (s.days - 1));
      s.nodes.push({ id: s.nodeSeq++, type, x: Math.sin(a) * r, z: Math.cos(a) * r, h: type === WASSER || type === METALL ? 0.6 : 0.05, amount: Math.round(base), max: Math.round(base) });
    }
    spawnNodeAt(type) {
      const s = this.s, R = 40 + 1.4 * 4 + 3;
      const a = Math.PI + (type - 1.5) * 0.45;
      const r = R + 14 + type * 3;
      s.nodes.push({ id: s.nodeSeq++, type, x: Math.sin(a) * r, z: Math.cos(a) * r, h: type === WASSER || type === METALL ? 0.6 : 0.05, amount: [160, 120, 110, 50][type], max: [160, 120, 110, 50][type] });
    }
    setGatherers(id, n) {
      const s = this.s, node = this.nodeById(id);
      if (!node) return;
      const cur = this.assigned(id);
      if (n > cur) {
        const add2 = Math.min(n - cur, this.freeVillagers);
        for (let k = 0; k < add2; k++) s.gath.push({ node: id, phase: "out", d: -k * 2.5, t: 0, load: 0 });
      } else if (n < cur) {
        let rm = cur - n;
        for (const g of s.gath) if (rm > 0 && g.node === id && g.phase !== "back") {
          g.phase = "back";
          g.stop = true;
          rm--;
        }
        for (const g of s.gath) if (rm > 0 && g.node === id && !g.stop) {
          g.stop = true;
          rm--;
        }
      }
    }
    gathering(dt, offline) {
      const s = this.s;
      s.nodeTimer -= dt;
      if (s.nodeTimer <= 0) {
        s.nodeTimer = 35 + Math.random() * 30;
        if (s.nodes.length < 7) this.spawnNode();
      }
      const speed = 2.3 * (this.storm && !offline ? 0.7 : 1);
      const paths = {};
      for (let i = s.gath.length - 1; i >= 0; i--) {
        const g = s.gath[i], n = this.nodeById(g.node);
        if (!n && g.phase !== "back") {
          g.phase = "back";
          g.stop = true;
        }
        const path = n ? paths[n.id] || (paths[n.id] = this.gatherPath(n)) : null;
        if (path && g.d > path.L) g.d = path.L;
        if (g.phase === "out") {
          if (n && this.nodeFlooded(n) && !offline) {
            if (g.d <= 0.1) {
              g.d = Math.min(g.d, 0);
              continue;
            }
            g.phase = "back";
            continue;
          }
          g.d += speed * dt;
          if (g.d >= path.L) {
            g.d = path.L;
            g.phase = "work";
            g.t = 5;
          }
        } else if (g.phase === "work") {
          if (n && this.nodeFlooded(n) && !offline) {
            g.phase = "back";
            continue;
          }
          g.t -= dt;
          if (g.t <= 0) {
            const take = Math.min(this.carry, n ? n.amount : 0);
            g.load = take;
            if (n) n.amount -= take;
            g.phase = "back";
            if (n && n.amount <= 0) {
              s.nodes = s.nodes.filter((x) => x.id !== n.id);
              this.msg(`${["Treibholz", "Muschelbank", "T\xFCmpel", "Wrackteile"][n.type]} ist leer gesammelt.`);
            }
          }
        } else {
          g.d -= speed * dt;
          if (g.d <= 0) {
            if (g.load > 0) {
              this.addRes(g.res !== void 0 ? g.res : n ? n.type : 0, g.load);
              questEvent(this, "gather", Math.round(g.load));
            }
            g.load = 0;
            g.d = 0;
            if (g.stop || !this.nodeById(g.node)) {
              s.gath.splice(i, 1);
              continue;
            }
            g.phase = "out";
          }
        }
        if (n && g.phase === "back" && g.res === void 0) g.res = n.type;
        if (g.phase === "out") g.res = void 0;
      }
    }
    // ---------- Speichern ----------
    load() {
      let s = null;
      try {
        s = JSON.parse(localStorage.getItem(KEY) || "null");
      } catch (e) {
        s = null;
      }
      if (!s || !Array.isArray(s.plots) || s.plots.length < 13 || !Array.isArray(s.res)) this.newGame();
      else {
        this.s = s;
        this.ensureMilitary();
        this.msg("Willkommen zur\xFCck in der Pfahlstadt!");
        this.catchUp();
      }
      this.updateWater();
      this.computeRates(false);
    }
    save() {
      if (!this.s) return;
      this.s.lastSave = Date.now();
      try {
        localStorage.setItem(KEY, JSON.stringify(this.s));
      } catch (e) {
      }
    }
    newGame() {
      const empty = () => ({ type: -1, level: 0, buildLeft: 0, buildTotal: 0 });
      const plots = Array.from({ length: PLOTS }, empty);
      plots[0] = { type: T.TURM, level: 1, buildLeft: 0, buildTotal: 0 };
      plots[2] = { type: T.TREIBHOLZ, level: 1, buildLeft: 0, buildTotal: 0 };
      plots[3] = { type: T.MUSCHEL, level: 1, buildLeft: 0, buildTotal: 0 };
      plots[4] = { type: T.REGEN, level: 1, buildLeft: 0, buildTotal: 0 };
      plots[5] = { type: T.HAUS, level: 1, buildLeft: 0, buildTotal: 0 };
      this.s = {
        res: [250, 160, 120, 30],
        survivors: 6,
        sick: 0,
        beaconOn: true,
        plots,
        layoutV: 4,
        lastSave: Date.now(),
        dayTime: 0.3,
        days: 1,
        stormTimer: 360,
        stormLeft: 0,
        expLeft: 0,
        expSurprised: false,
        sickProg: 0,
        deathProg: 0,
        healProg: 0,
        arriveProg: 0
      };
      this.ensureMilitary();
      this.log = [];
      this.msg("Willkommen in der Pfahlstadt! Tipp: Vor dem Tor liegen Sammelstellen \u2013 tippe sie an und schicke Bewohner los.");
      this.save();
    }
    catchUp() {
      const s = this.s;
      const now = Date.now();
      let sec = s.lastSave ? (now - s.lastSave) / 1e3 : 0;
      s.lastSave = now;
      if (sec < 10) return;
      sec = Math.min(sec, 8 * 3600);
      const before = s.res.slice();
      const steps = Math.max(1, Math.min(3e3, Math.floor(sec / 10)));
      const dt = sec / steps;
      for (let i = 0; i < steps; i++) {
        this.applyRates(this.computeRates(true), dt);
        this.advanceBuild(dt);
        if (s.expLeft > 0) {
          s.expLeft -= dt;
          if (s.expLeft <= 0) {
            s.expLeft = 0;
            this.finishExpedition();
          }
        }
        this.military(dt, true);
        this.gathering(dt, true);
        botTick(this, dt);
      }
      const gains = s.res.map((v, i) => v - before[i]).map((g, i) => Math.abs(g) >= 1 ? `${g > 0 ? "+" : ""}${Math.round(g)} ${RES[i]}` : "").filter(Boolean).join("  ");
      this.msg(`W\xE4hrend du weg warst (${fmtTime(sec)}): ${gains}`);
    }
  };

  // src/models.js
  var FR55 = frustum(0.55);
  var C = {
    sand: [0.62, 0.57, 0.47],
    wetSand: [0.42, 0.39, 0.33],
    plank: [0.52, 0.4, 0.27],
    drift: [0.62, 0.56, 0.48],
    tar: [0.16, 0.13, 0.11],
    wall: [0.36, 0.42, 0.44],
    wallBlue: [0.25, 0.38, 0.5],
    reed: [0.72, 0.62, 0.38],
    rust: [0.5, 0.28, 0.18],
    window: [1, 0.72, 0.38],
    white: [0.92, 0.92, 0.88],
    red: [0.7, 0.16, 0.13],
    dark: [0.12, 0.13, 0.15],
    roofGrey: [0.3, 0.3, 0.32]
  };
  function hut(B, p, w, h2, d, wall2, roof, windows, door = true) {
    B.add("cube", [p[0], p[1] + h2 / 2, p[2]], [w, h2, d], wall2, { g: 0.12 });
    for (let i = 0; i < 4; i++) {
      const sx = i & 1 ? w / 2 : -w / 2, sz = i & 2 ? d / 2 : -d / 2;
      B.add("cube", [p[0] + sx, p[1] + h2 / 2, p[2] + sz], [0.18, h2, 0.18], C.tar, { g: 0.2 });
    }
    B.add("prism", [p[0], p[1] + h2, p[2]], [w * 1.22, h2 * 0.8, d * 1.15], roof, { g: 0.05 });
    B.add("cube", [p[0], p[1] + h2 + h2 * 0.8, p[2]], [0.22, 0.16, d * 1.17], C.tar, { g: 0.2 });
    const fz = p[2] + d / 2 + 0.04;
    if (door) B.add("cube", [p[0], p[1] + 0.6, fz], [0.75, 1.2, 0.08], C.tar);
    for (let i = 0; i < windows; i++) {
      const t = windows === 1 ? 0.5 : i / (windows - 1);
      let x = -w * 0.32 + w * 0.64 * t;
      if (door && Math.abs(x) < 0.65) x += x >= 0 ? 0.75 : -0.75;
      B.add("cylinder", [p[0] + x, p[1] + h2 * 0.6, fz], [0.55, 0.04, 0.55], C.tar, { rot: [90, 0, 0] });
      B.add("cylinder", [p[0] + x, p[1] + h2 * 0.6, fz + 0.02], [0.42, 0.04, 0.42], C.window, { rot: [90, 0, 0], e: 1.8 });
    }
  }
  function barrel(B, p) {
    B.add("cylinder", [p[0], p[1] + 0.45, p[2]], [0.6, 0.45, 0.6], C.plank, { g: 0.2 });
    B.add("cylinder", [p[0], p[1] + 0.7, p[2]], [0.63, 0.03, 0.63], C.tar, { g: 0.4 });
    B.add("cylinder", [p[0], p[1] + 0.2, p[2]], [0.63, 0.03, 0.63], C.tar, { g: 0.4 });
  }
  function building(B, t, level) {
    const sc = 1 + 0.06 * Math.min(level - 1, 9) + 0.012 * Math.max(0, level - 10);
    B.push([0, 0, 0], null, [sc, sc, sc]);
    switch (t) {
      case T.TREIBHOLZ:
        hut(B, [0.9, 0, -0.6], 3, 2.1, 2.6, C.wall, C.reed, 2);
        for (let i = 0; i < 7; i++) {
          const row = i < 4 ? 0 : 1, z = -1.5 + i % 4 * 0.5 + row * 0.25;
          B.add("cylinder", [-2.3, 0.25 + row * 0.42, z], [0.45, 1 + i % 3 * 0.15, 0.45], C.drift, { rot: [0, 8 * (i % 3), 90], g: 0.1 });
        }
        B.add("cube", [-3.2, 2.2, -2.6], [0.25, 4.4, 0.25], C.tar);
        B.add("cube", [-3.2, 4.3, -3.8], [0.2, 0.2, 2.6], C.tar);
        B.add("sphere", [-3.2, 3.2, -4.9], [0.9, 1.2, 0.9], [0.3, 0.35, 0.28], { g: 0.05 });
        break;
      case T.MUSCHEL:
        hut(B, [-0.8, 0, -1], 2.6, 1.9, 2.4, C.wallBlue, C.reed, 1);
        for (let i = 0; i < 4; i++) {
          const x = -1.2 + i % 2 * 2.4, z = -4.8 - Math.floor(i / 2) * 1.4;
          B.add("cylinder", [x, -1, z], [0.18, 3, 0.18], C.tar, { g: 0.3 });
          B.add("cylinder", [x, -0.9, z], [0.34, 1, 0.34], [0.12, 0.13, 0.2], { g: 0.7 });
        }
        B.add("cube", [0, 1.6, -4.8], [2.6, 0.06, 0.06], [0.65, 0.58, 0.42]);
        for (let i = 0; i < 3; i++) B.add("cylinder", [-2.6 + i * 0.9, 0.3, 1.9], [0.7, 0.3, 0.7], C.reed);
        break;
      case T.REGEN:
        B.add("cone", [0, 4.6, 0], [4.2, 2.2, 4.2], [0.86, 0.83, 0.74], { rot: [180, 0, 0], g: 0.1 });
        for (let i = 0; i < 3; i++) {
          const a = i * 120 * Math.PI / 180;
          B.add("cube", [Math.cos(a) * 1.7, 2.2, Math.sin(a) * 1.7], [0.2, 4.6, 0.2], C.tar);
        }
        B.add("cylinder", [0, 1.1, 0], [1.8, 1.1, 1.8], C.plank, { g: 0.25 });
        B.add("cylinder", [0, 2.25, 0], [0.25, 0.2, 0.25], C.rust, { g: 0.5 });
        barrel(B, [2.4, 0, 1.6]);
        barrel(B, [2.4, 0, 0.7]);
        barrel(B, [-2.4, 0, 1.6]);
        break;
      case T.TAUCHER:
        hut(B, [1.2, 0, -0.6], 2.6, 2, 2.4, C.wall, C.roofGrey, 1);
        B.add("cube", [-2.2, 2.6, 0], [0.3, 5.2, 0.3], C.tar);
        B.add("cube", [-2.2, 5.1, -1.6], [0.25, 0.25, 3.4], C.tar);
        B.add("cube", [-2.2, 4, -3.2], [0.05, 2.2, 0.05], C.tar);
        B.add("sphere", [-2.2, 2.5, -3.2], [1.3, 1.4, 1.3], [0.55, 0.45, 0.25], { g: 0.75 });
        B.add("cylinder", [-2.2, 2.5, -3.85], [0.45, 0.03, 0.45], [0.5, 0.8, 1], { rot: [90, 0, 0], e: 1.2 });
        for (let i = 0; i < 5; i++)
          B.add("cube", [0.6 + i * 0.35, 0.25, 1.8 - i % 2 * 0.4], [0.6, 0.4, 0.5], C.rust, { rot: [0, i * 23, i * 9], g: 0.4 });
        B.add("cube", [2.9, 0.9, 1.6], [0.15, 1.6, 0.15], C.tar, { g: 0.5 });
        B.add("cube", [2.9, 0.25, 1.6], [0.9, 0.15, 0.15], C.tar, { g: 0.5 });
        break;
      case T.HAUS:
        hut(B, [0, 0, -0.3], 5, 2.4, 3.2, C.wallBlue, C.reed, 4);
        B.add("cube", [1.6, 3.4, -0.8], [0.5, 1.6, 0.5], [0.5, 0.3, 0.25]);
        B.smoke([1.6, 4.3, -0.8], 0.6);
        B.add("cube", [-2.9, 1.1, 2.2], [0.12, 2.2, 0.12], C.tar);
        B.add("cube", [2.9, 1.1, 2.2], [0.12, 2.2, 0.12], C.tar);
        B.add("cube", [0, 2.1, 2.2], [5.8, 0.04, 0.04], C.reed);
        B.add("cube", [-1, 1.7, 2.2], [0.7, 0.8, 0.03], [0.8, 0.3, 0.25]);
        B.add("cube", [0.6, 1.75, 2.2], [0.6, 0.7, 0.03], [0.9, 0.85, 0.6]);
        break;
      case T.HEILER:
        hut(B, [0, 0, -0.3], 3.6, 2.4, 3, [0.82, 0.84, 0.8], C.reed, 2);
        B.add("sphere", [0, 2, 1.25], [0.55, 0.8, 0.06], [0.3, 0.95, 0.45], { rot: [0, 0, 35], e: 1.4 });
        for (let i = 0; i < 3; i++) {
          B.add("cube", [-1.4 + i * 1.4, 0.25, 2.2], [1.1, 0.5, 0.6], C.plank);
          B.add("sphere", [-1.4 + i * 1.4, 0.6, 2.2], [1, 0.5, 0.5], [0.25, 0.5, 0.25]);
        }
        break;
      case T.RAUCH:
        hut(B, [0.4, 0, -0.4], 3.2, 2.2, 2.8, [0.3, 0.26, 0.22], C.reed, 1);
        B.add("cube", [-0.6, 3.1, -0.9], [0.7, 1.8, 0.7], [0.45, 0.3, 0.24]);
        B.smoke([-0.6, 4.1, -0.9], 1);
        B.add("cube", [-2.4, 1, 1.2], [0.15, 2, 0.15], C.tar);
        B.add("cube", [-2.4, 1, -0.4], [0.15, 2, 0.15], C.tar);
        B.add("cube", [-2.4, 1.95, 0.4], [0.1, 0.1, 1.8], C.tar);
        for (let i = 0; i < 4; i++) B.add("sphere", [-2.4, 1.5, -0.2 + i * 0.4], [0.12, 0.7, 0.25], [0.75, 0.55, 0.3], { g: 0.5 });
        barrel(B, [2.4, 0, 1.5]);
        break;
      case T.KUECHE:
        hut(B, [0.6, 0, -0.6], 3.4, 2.2, 2.8, [0.55, 0.42, 0.3], C.reed, 2);
        B.add("cube", [-0.6, 3.2, -1.2], [0.7, 2, 0.7], [0.45, 0.3, 0.24]);
        B.smoke([-0.6, 4.3, -1.2], 0.9);
        B.add("cylinder", [-2.2, 0.35, 1.6], [1.2, 0.08, 1.2], [0.3, 0.3, 0.32]);
        B.add("sphere", [-2.2, 0.85, 1.6], [1.1, 0.9, 1.1], [0.15, 0.15, 0.17], { g: 0.7 });
        B.add("cylinder", [-2.2, 1.2, 1.6], [0.9, 0.04, 0.9], [0.95, 0.6, 0.25], { e: 1.5 });
        B.add("cylinder", [-2.2, 0.15, 1.6], [0.8, 0.1, 0.8], [1, 0.45, 0.1], { e: 2.5 });
        B.smoke([-2.2, 1.4, 1.6], 0.4);
        for (let k = 0; k < 2; k++) B.add("cube", [-2.2 + (k ? 0.75 : -0.75), 0.9, 1.6], [0.08, 1.8, 0.08], C.tar);
        B.add("cube", [-2.2, 1.8, 1.6], [1.6, 0.06, 0.06], C.tar);
        B.add("cube", [1.4, 0.75, 2.1], [2.2, 0.1, 0.9], C.plank);
        B.add("cube", [1.4, 0.4, 1.4], [2.2, 0.08, 0.35], C.plank);
        B.add("cube", [1.4, 0.4, 2.8], [2.2, 0.08, 0.35], C.plank);
        for (const x of [0.5, 2.3]) B.add("cube", [x, 0.35, 2.1], [0.1, 0.7, 0.7], C.tar);
        break;
      case T.KASERNE:
        hut(B, [0, 0, -0.9], 5.6, 2.5, 3.2, [0.4, 0.33, 0.28], [0.3, 0.3, 0.32], 3);
        B.add("cylinder", [2.9, 3.2, 1.4], [0.08, 3.2, 0.08], C.tar);
        B.add("cube", [3.5, 5.6, 1.4], [1.2, 0.75, 0.04], [0.15, 0.45, 0.6], { g: 0.2 });
        B.add("cube", [3.5, 5.6, 1.43], [0.5, 0.3, 0.02], [0.95, 0.85, 0.4]);
        B.add("cube", [-2.2, 0.9, 1.8], [2, 0.1, 0.1], C.tar);
        for (let k = 0; k < 6; k++) {
          B.add("cube", [-3 + k * 0.32, 1.1, 1.75], [0.05, 2.2, 0.05], [0.55, 0.45, 0.3], { rot: [8, 0, 0] });
          B.add("cone", [-3 + k * 0.32, 2.2, 1.9], [0.12, 0.35, 0.12], [0.7, 0.72, 0.75], { g: 0.7 });
        }
        B.add("cylinder", [1.4, 0.9, 2.2], [0.1, 0.9, 0.1], C.tar);
        B.add("cylinder", [1.4, 1.4, 2.2], [0.5, 0.45, 0.5], C.reed);
        B.add("sphere", [1.4, 2.1, 2.2], [0.4, 0.4, 0.4], C.reed);
        break;
      case T.HARPHOF: {
        hut(B, [0, 0, -1.2], 4.2, 2.3, 2.6, [0.45, 0.36, 0.26], C.reed, 2);
        for (let k = 0; k < 8; k++) {
          B.add("cube", [-2.4 + k * 0.6, 1.1, 1.3], [0.06, 2.2, 0.06], [0.55, 0.45, 0.3], { rot: [10, 0, 0] });
          B.add("cone", [-2.4 + k * 0.6, 2.25, 1.5], [0.14, 0.4, 0.14], [0.72, 0.74, 0.78], { g: 0.8 });
        }
        B.add("cube", [0, 0.8, 1.2], [5, 0.1, 0.1], C.tar);
        B.add("cylinder", [2.6, 1.2, 2.4], [0.7, 0.05, 0.7], [0.85, 0.2, 0.15], { rot: [90, 0, 0] });
        B.add("cylinder", [2.6, 1.2, 2.42], [0.35, 0.06, 0.35], C.white, { rot: [90, 0, 0] });
        B.add("cylinder", [2.6, 0.6, 2.35], [0.06, 0.6, 0.06], C.tar);
        break;
      }
      case T.WACHSTUBE: {
        hut(B, [0, 0, -0.8], 4.6, 2.6, 3, [0.5, 0.5, 0.5], C.roofGrey, 2);
        for (let k = 0; k < 4; k++) {
          B.add("cylinder", [-1.8 + k * 1.2, 1.3, 0.75], [0.8, 0.06, 0.8], k % 2 ? [0.2, 0.35, 0.6] : [0.7, 0.2, 0.15], { rot: [90, 0, 0], g: 0.4 });
          B.add("sphere", [-1.8 + k * 1.2, 1.3, 0.8], [0.15, 0.15, 0.1], [0.85, 0.75, 0.4], { g: 0.7 });
        }
        B.add("cube", [0, 0.05, 2.2], [4.6, 0.1, 1.6], [0.6, 0.55, 0.45]);
        break;
      }
      case T.ENTERHALLE: {
        hut(B, [0, 0, -1], 6, 2.4, 2.6, [0.38, 0.3, 0.24], [0.35, 0.25, 0.2], 3);
        for (let k = 0; k < 3; k++) B.add("cube", [-2 + k * 2, 1.6, 1.4], [0.12, 3.2, 0.12], C.tar);
        B.add("cube", [0, 3.15, 1.4], [4.4, 0.12, 0.12], C.tar);
        for (let k = 0; k < 7; k++) B.add("cube", [-1.8 + k * 0.6, 1.8, 1.45], [0.03, 2.6, 0.03], [0.75, 0.65, 0.45]);
        for (let k = 0; k < 4; k++) B.add("cube", [0, 0.8 + k * 0.7, 1.45], [4, 0.03, 0.03], [0.75, 0.65, 0.45]);
        B.add("cube", [2.6, 0.5, 2.4], [0.5, 1, 0.08], [0.6, 0.62, 0.66], { g: 0.7 });
        break;
      }
      case T.SCHLEUDER: {
        B.add("cube", [0, 0.1, 0], [5.4, 0.2, 5.4], [0.55, 0.48, 0.36]);
        B.add("cube", [0, 0.6, 0], [2.4, 0.8, 1.6], [0.45, 0.34, 0.22]);
        B.add("cube", [-0.9, 1.6, 0], [0.2, 1.6, 0.2], C.tar);
        B.add("cube", [0.9, 1.6, 0], [0.2, 1.6, 0.2], C.tar);
        B.add("cube", [0, 2.3, 0], [2, 0.18, 0.18], C.tar);
        B.add("cube", [0, 2.6, 0.6], [0.18, 3.4, 0.18], [0.6, 0.48, 0.3], { rot: [-35, 0, 0] });
        B.add("sphere", [0, 3.9, 1.7], [0.45, 0.3, 0.45], [0.35, 0.3, 0.25]);
        for (let k = 0; k < 6; k++) B.add("sphere", [1.8 + k % 3 * 0.45, 0.45, -1.6 + Math.floor(k / 3) * 0.45], [0.35, 0.35, 0.35], [0.5, 0.5, 0.48]);
        hut(B, [-1.6, 0, -1.8], 2, 1.8, 1.6, C.wall, C.reed, 1, false);
        break;
      }
      case T.WATTHUETTE: {
        hut(B, [0.4, 0, -0.9], 3.6, 2.1, 2.6, C.wallBlue, C.reed, 2);
        for (let k = 0; k < 5; k++) B.add("cube", [-2.6 + k * 0.3, 0.45, 1.5], [0.18, 0.9, 0.3], [0.2, 0.25, 0.2]);
        B.add("cube", [0, 0.15, 2.3], [5, 0.12, 0.8], C.plank);
        B.add("cylinder", [2.5, 2, 1.9], [0.07, 2, 0.07], C.tar);
        B.add("cube", [2.95, 3.5, 1.9], [0.9, 0.5, 0.03], [0.95, 0.75, 0.2]);
        break;
      }
      case T.AKADEMIE: {
        const st = [0.78, 0.75, 0.68];
        B.add("cube", [0, 1.4, -0.4], [5, 2.8, 3.4], st, { g: 0.15 });
        B.add("prism", [0, 3.3, -0.4], [5.3, 1.1, 3.7], [0.3, 0.35, 0.42], { g: 0.3 });
        for (let k = 0; k < 4; k++) B.add("cylinder", [-1.8 + k * 1.2, 1.3, 1.55], [0.32, 1.3, 0.32], [0.92, 0.9, 0.85]);
        B.add("cube", [0, 2.75, 1.55], [5, 0.3, 0.5], [0.92, 0.9, 0.85]);
        B.add("cylinder", [1.8, 4.2, -1.2], [0.9, 0.5, 0.9], [0.45, 0.5, 0.58], { g: 0.6 });
        B.add("sphere", [1.8, 4.7, -1.2], [1, 0.8, 1], [0.45, 0.55, 0.62], { g: 0.7 });
        B.add("cylinder", [2.2, 4.9, -0.8], [0.18, 0.6, 0.18], [0.75, 0.62, 0.3], { rot: [-40, 30, 0], g: 0.8 });
        for (let k = 0; k < 3; k++) B.add("cube", [-1.2 + k * 1.2, 1.6, 1.32], [0.5, 0.8, 0.04], C.window, { e: 1.5 });
        break;
      }
      case T.WERFT: {
        B.add("cube", [0, 0.1, 0], [6, 0.2, 5.4], C.plank);
        for (let k = 0; k < 2; k++) {
          B.add("cylinder", [-2.6 + k * 5.2, 2.2, -2.2], [0.25, 2.2, 0.25], C.tar);
          B.add("cylinder", [-2.6 + k * 5.2, 2.2, 2.2], [0.25, 2.2, 0.25], C.tar);
        }
        B.add("cube", [0, 4.4, -2.2], [5.6, 0.25, 0.25], C.tar);
        B.add("cube", [0, 4.4, 2.2], [5.6, 0.25, 0.25], C.tar);
        B.add("cube", [0, 1, 0], [4.2, 1.2, 1.8], [0.55, 0.38, 0.22], { g: 0.2 });
        B.add("prism", [2.6, 1.05, 0], [1, 1.3, 1.8], [0.55, 0.38, 0.22], { rot: [0, 0, -90] });
        for (let k = 0; k < 6; k++) B.add("cube", [-1.8 + k * 0.7, 1.75, 0], [0.12, 0.2, 2], [0.4, 0.28, 0.16]);
        B.add("cylinder", [0, 3, 0], [0.12, 1.8, 0.12], C.tar);
        B.add("cube", [-2.4, 0.6, 2.5], [1.2, 1, 0.8], [0.6, 0.48, 0.3]);
        break;
      }
      case T.WAHRZEICHEN: {
        const st = [0.72, 0.7, 0.66], gold = [0.95, 0.78, 0.3], H = 6 + 0.25 * level;
        B.add("cylinder", [0, 0.4, 0], [5, 0.4, 5], st, { g: 0.2 });
        B.add("cylinder", [0, 0.9, 0], [4, 0.2, 4], [0.6, 0.58, 0.55]);
        B.add(frustum(0.7), [0, 1, 0], [2.6, H, 2.6], st, { g: 0.2 });
        for (const r of [0, 90, 180, 270]) {
          const a = r * Math.PI / 180, x = Math.sin(a) * 0.93, z = Math.cos(a) * 0.93;
          B.add("cylinder", [x, H - 0.5, z], [1.3, 0.06, 1.3], [0.95, 0.94, 0.88], { rot: [90, r, 0], e: 0.6 });
          B.add("cube", [x * 1.03, H - 0.5 + 0.25, z * 1.03], [0.06, 0.55, 0.04], [0.15, 0.15, 0.18], { rot: [0, r, 0] });
          B.add("cube", [x * 1.03, H - 0.5, z * 1.03], [0.4, 0.06, 0.04], [0.15, 0.15, 0.18], { rot: [0, r, 0] });
        }
        B.add("cone", [0, H + 0.9, 0], [2.4, 1.8, 2.4], [0.25, 0.45, 0.4], { g: 0.5 });
        B.add("sphere", [0, H + 2, 0], [0.4, 0.4, 0.4], gold, { g: 0.9, e: 0.4 });
        for (let k = 0; k < 6; k++) {
          const a = k * Math.PI / 3;
          B.add("cube", [Math.sin(a) * 4.3, 0.95, Math.cos(a) * 4.3], [0.5, 0.15, 0.5], [0.95, 0.75, 0.3], { e: 1.2 });
        }
        break;
      }
      case T.LAZARETT: {
        hut(B, [0, 0, -0.6], 5.2, 2.4, 3.2, [0.92, 0.92, 0.88], [0.55, 0.2, 0.18], 3);
        B.add("cube", [0, 2, 1.02], [0.9, 0.25, 0.03], [0.85, 0.12, 0.12]);
        B.add("cube", [0, 2, 1.02], [0.25, 0.9, 0.03], [0.85, 0.12, 0.12]);
        for (let k = 0; k < 2; k++) {
          B.add("cube", [-1.6 + k * 3.2, 0.35, 2], [0.9, 0.3, 1.8], [0.5, 0.38, 0.25]);
          B.add("cube", [-1.6 + k * 3.2, 0.55, 2], [0.85, 0.12, 1.7], [0.95, 0.95, 0.95]);
          B.add("cube", [-1.6 + k * 3.2, 0.66, 1.3], [0.6, 0.12, 0.3], [0.9, 0.9, 0.85]);
        }
        B.add("cylinder", [2.7, 1.6, 0.9], [0.07, 1.6, 0.07], C.tar);
        B.add("cube", [3.1, 2.9, 0.9], [0.8, 0.55, 0.03], [0.95, 0.95, 0.95]);
        B.add("cube", [3.1, 2.9, 0.92], [0.4, 0.12, 0.02], [0.85, 0.12, 0.12]);
        B.add("cube", [3.1, 2.9, 0.92], [0.12, 0.4, 0.02], [0.85, 0.12, 0.12]);
        break;
      }
      case T.WACHTURM: {
        const H = 7;
        for (let i = 0; i < 4; i++) {
          const sx = i & 1 ? 1.3 : -1.3, sz = i & 2 ? 1.3 : -1.3;
          B.add("cube", [sx, H / 2, sz], [0.25, H, 0.25], C.tar, { g: 0.3 });
        }
        for (let k = 1; k <= 3; k++) {
          const y = H / 4 * k;
          B.add("cube", [0, y, -1.3], [2.8, 0.12, 0.12], C.plank, { rot: [0, 0, k % 2 ? 25 : -25] });
          B.add("cube", [0, y, 1.3], [2.8, 0.12, 0.12], C.plank, { rot: [0, 0, k % 2 ? -25 : 25] });
        }
        B.add("cube", [0, H, 0], [3.6, 0.25, 3.6], C.plank, { g: 0.2 });
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2;
          B.add("cube", [Math.sin(a) * 1.75, H + 0.5, Math.cos(a) * 1.75], i % 2 ? [0.1, 0.8, 3.6] : [3.6, 0.8, 0.1], C.plank);
        }
        B.add("cube", [1.6, H + 1.6, 1.6], [0.1, 2.2, 0.1], C.tar);
        B.add("cube", [-1.6, H + 1.6, -1.6], [0.1, 2.2, 0.1], C.tar);
        B.add("cube", [1.6, H + 1.6, -1.6], [0.1, 2.2, 0.1], C.tar);
        B.add("cube", [-1.6, H + 1.6, 1.6], [0.1, 2.2, 0.1], C.tar);
        B.add("prism", [0, H + 2.7, 0], [4.2, 1.4, 4.2], C.reed, { g: 0.05 });
        B.add("cube", [0, H + 1.1, 0], [0.5, 0.6, 0.5], C.window, { e: 2.5 });
        B.add("cube", [0, H / 2, 1.5], [0.6, H, 0.06], [0.45, 0.35, 0.22]);
        break;
      }
      case T.LAGER:
        B.add("cube", [0, 1.6, -0.6], [5.4, 3.2, 3.6], [0.42, 0.36, 0.3], { g: 0.1 });
        B.add("prism", [0, 3.2, -0.6], [6, 1.6, 4], [0.3, 0.3, 0.32], { g: 0.1 });
        B.add("cube", [0, 1.2, 1.22], [2.2, 2.4, 0.08], C.tar);
        for (let k = 0; k < 5; k++) B.add("cube", [-2.7 + k * 1.35, 1.6, 1.21], [0.15, 3.2, 0.1], C.tar);
        const crates = [[-2.2, 0.4, 2.3], [-1.4, 0.4, 2.5], [-1.8, 1.2, 2.4], [2.3, 0.4, 2.4]];
        for (const p of crates) B.add("cube", p, [0.8, 0.8, 0.8], [0.6, 0.46, 0.28], { rot: [0, p[0] * 20, 0] });
        barrel(B, [1.4, 0, 2.6]);
        barrel(B, [0.6, 0, 2.7]);
        break;
    }
    B.pop();
  }
  function defenseTower(B, level) {
    const stone = level >= 7 ? [0.5, 0.5, 0.52] : [0.56, 0.5, 0.44];
    const H = 7 + 0.2 * level;
    B.add("cylinder", [0, -0.9 + H / 2, 0], [3.4, H / 2, 3.4], stone, { g: 0.15 });
    B.add("cylinder", [0, -0.9 + H + 0.2, 0], [3.9, 0.2, 3.9], [0.36, 0.36, 0.38]);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      B.add("cube", [Math.sin(a) * 1.75, -0.9 + H + 0.75, Math.cos(a) * 1.75], [0.8, 0.9, 0.5], stone, { rot: [0, a / (Math.PI / 180), 0] });
    }
    B.add("cube", [0, -0.9 + H + 0.8, 0], [0.5, 0.8, 0.5], C.tar);
    B.add("cube", [0, -0.9 + H + 1.3, 0.4], [1.8, 0.15, 0.15], [0.45, 0.32, 0.2]);
    B.add("cube", [0, -0.9 + H + 1.35, 0.6], [0.12, 0.12, 2.2], [0.55, 0.45, 0.3]);
    B.add("cone", [0, -0.9 + H + 1.35, 1.75], [0.25, 0.5, 0.25], [0.75, 0.77, 0.8], { rot: [90, 0, 0], g: 0.7 });
    for (let k = 0; k < 3; k++) B.add("cube", [0, -0.9 + 2 + k * 1.8, 1.72], [0.25, 0.6, 0.06], C.window, { e: 1.6 });
    B.add("cylinder", [0, -0.9 + H + 2.6, -0.9], [0.06, 1.6, 0.06], C.tar);
    B.add("cube", [0.45, -0.9 + H + 3.7, -0.9], [0.9, 0.55, 0.03], [0.15, 0.45, 0.6]);
  }
  function wall(B, level, R, base) {
    const seg = Math.ceil(2 * Math.PI * R / 3);
    const gateHalf = 5 / R;
    const kind = level <= 0 ? 0 : level <= 6 ? 1 : level <= 13 ? 2 : 3;
    const stone = kind === 3 ? [0.42, 0.42, 0.45] : [0.55, 0.53, 0.5];
    const H = kind === 1 ? 3 + 0.2 * level : kind === 2 ? 4 + 0.2 * (level - 7) : 6 + 0.2 * (level - 14);
    for (let k = 0; k < seg; k++) {
      const a = k / seg * Math.PI * 2;
      let d = Math.abs(a - Math.PI);
      if (d < gateHalf) continue;
      B.push([Math.sin(a) * R, base, Math.cos(a) * R], [0, a / (Math.PI / 180), 0]);
      if (kind === 0) {
        if (k % 2 === 0) B.add("cube", [0, 0.15, 0], [0.6, 0.3, 0.6], [0.6, 0.6, 0.6]);
      } else if (kind === 1) {
        for (let j = 0; j < 6; j++) {
          const x = -1.25 + j * 0.5, hh = H + (j * 7 + k) % 3 * 0.2;
          B.add("cylinder", [x, hh / 2, 0], [0.42, hh / 2, 0.42], [0.45, 0.33, 0.21], { g: 0.1 });
          B.add("cone", [x, hh, 0], [0.42, 0.5, 0.42], [0.4, 0.3, 0.2]);
        }
        B.add("cube", [0, H * 0.7, -0.3], [3.05, 0.2, 0.15], [0.35, 0.25, 0.16]);
      } else {
        const th = kind === 3 ? 2.2 : 1.3;
        B.add("cube", [0, H / 2, 0], [3.05, H, th], stone, { g: 0.1 });
        B.add("cube", [0, H + 0.05, 0], [3.1, 0.1, th + 0.2], [0.35, 0.35, 0.37]);
        for (const x of [-0.75, 0.75]) B.add("cube", [x, H + 0.4, th / 2 - 0.2], [0.75, 0.7, 0.4], stone);
        if (kind === 3 && k % 4 === 0) B.add("cube", [0, H * 0.4, th / 2 + 0.4], [0.9, H * 0.8, 0.8], stone);
      }
      B.pop();
    }
    if (kind > 0) {
      B.push([0, base, -R], [0, 180, 0]);
      const tw = kind === 1 ? [0.45, 0.33, 0.21] : stone, th = H + 2;
      for (const x of [-3.6, 3.6]) {
        B.add("cube", [x, th / 2, 0], [2.4, th, 2.8], tw, { g: 0.1 });
        B.add("prism", [x, th, 0], [2.9, 1.8, 3.2], [0.4, 0.2, 0.15], { rot: [0, 90, 0] });
        B.add("cube", [x, th * 0.6, 1.42], [0.3, 0.6, 0.05], C.window, { e: 2 });
      }
      B.add("cube", [0, H + 0.5, 0], [4.8, 1.2, 2], tw);
      B.add("cube", [-1.05, H * 0.42, 0.2], [2, H * 0.84, 0.3], [0.3, 0.2, 0.12], { rot: [0, -35, 0] });
      B.add("cube", [1.05, H * 0.42, 0.2], [2, H * 0.84, 0.3], [0.3, 0.2, 0.12], { rot: [0, 35, 0] });
      B.add("cube", [0, H + 1.6, 1.05], [1.4, 0.9, 0.05], [0.15, 0.45, 0.6]);
      B.pop();
    }
  }
  function resourceNode(B, type) {
    if (type === 0) {
      for (let i = 0; i < 7; i++) B.add("cylinder", [(i % 3 - 1) * 0.7, 0.3 + Math.floor(i / 3) * 0.45, i % 2 * 0.5 - 0.25], [0.4, 1.3 + i % 3 * 0.2, 0.4], C.drift, { rot: [0, i * 37, 90], g: 0.1 });
      B.add("cylinder", [1.6, 0.25, 1.2], [0.3, 0.9, 0.3], C.drift, { rot: [0, -40, 90] });
    } else if (type === 1) {
      for (let i = 0; i < 9; i++) B.add("sphere", [Math.cos(i * 2.4) * (0.4 + i * 0.12), 0.15, Math.sin(i * 2.4) * (0.4 + i * 0.12)], [0.7, 0.35, 0.5], [0.12, 0.13, 0.2], { rot: [0, i * 40, 0], g: 0.8 });
      B.add("cylinder", [0, 0.9, 0], [0.12, 0.9, 0.12], C.tar);
      B.add("cube", [0.25, 1.6, 0], [0.5, 0.35, 0.04], [0.95, 0.6, 0.2]);
    } else if (type === 2) {
      B.add("sphere", [0, -0.05, 0], [5, 0.5, 3.6], C.sand, { g: 0.2 });
      B.add("cylinder", [0, 0.18, 0], [3.4, 0.03, 2.4], [0.3, 0.62, 0.75], { g: 0.95, e: 0.25 });
      for (let i = 0; i < 4; i++) B.add("cone", [Math.cos(i * 1.6) * 2, 0.1, Math.sin(i * 1.6) * 1.5], [0.6, 1.1, 0.6], [0.5, 0.55, 0.3]);
    } else {
      B.add("sphere", [0, -0.05, 0], [4.6, 0.5, 3.4], C.sand, { g: 0.2 });
      B.add("cube", [0, 0.45, 0], [2.4, 0.7, 1.2], [0.22, 0.17, 0.13], { rot: [0, 20, 18] });
      for (let i = 0; i < 5; i++) B.add("cube", [-1.2 + i * 0.6, 0.35, 0.9 - i % 2 * 1.6], [0.5, 0.35, 0.4], C.rust, { rot: [i * 15, i * 30, i * 9], g: 0.45 });
      B.add("cylinder", [0.8, 0.5, -0.4], [0.5, 0.35, 0.5], C.rust, { rot: [80, 0, 0], g: 0.45 });
    }
    B.add("cylinder", [0, 2, 0], [0.08, 2, 0.08], C.tar);
    B.add("cube", [0.35, 3.7, 0], [0.7, 0.4, 0.03], [[0.9, 0.7, 0.4], [0.95, 0.5, 0.45], [0.4, 0.8, 0.95], [0.8, 0.8, 0.85]][type], { e: 0.6 });
  }
  function basket(B) {
    B.add("cylinder", [0, 1.05, -0.32], [0.42, 0.25, 0.42], [0.72, 0.6, 0.35]);
  }
  var TH = [4.5, 4.5, 5, 5.5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21.5, 23, 24.5, 26, 28];
  var towerHeight = (level) => TH[Math.max(1, Math.min(20, level))];
  var towerEra = (level) => level <= 3 ? 0 : level <= 8 ? 1 : level <= 14 ? 2 : 3;
  var lampHeight = (level) => towerHeight(level) + (towerEra(level) === 0 ? 0.7 : towerEra(level) === 3 ? 2 : 1.2);
  function tower(B, level) {
    const H = towerHeight(level), era = towerEra(level);
    const wood = [0.55, 0.42, 0.28], stone = [0.5, 0.49, 0.46], stoneD = [0.38, 0.37, 0.35], concrete = [0.86, 0.87, 0.88], steel = [0.45, 0.48, 0.52];
    if (era === 0) {
      const r = 1.1 - 0.07 * (level - 1);
      for (let i = 0; i < 4; i++) {
        const sx = i & 1 ? 1 : -1, sz = i & 2 ? 1 : -1;
        B.add("cube", [sx * r, H / 2, sz * r], [0.22, H, 0.22], wood, { rot: [sz * -4, 0, sx * 4] });
      }
      for (let k = 1; k <= 2; k++) {
        const y = H * k / 3;
        B.add("cube", [0, y, r], [r * 2, 0.12, 0.12], wood);
        B.add("cube", [0, y, -r], [r * 2, 0.12, 0.12], wood);
        B.add("cube", [r, y, 0], [0.12, 0.12, r * 2], wood);
        B.add("cube", [-r, y, 0], [0.12, 0.12, r * 2], wood);
        B.add("cube", [0, y - H / 6, r], [r * 2.3, 0.1, 0.1], wood, { rot: [0, 0, 35] });
        B.add("cube", [r, y - H / 6, 0], [0.1, 0.1, r * 2.3], wood, { rot: [35, 0, 0] });
      }
      B.add("cube", [0, H, 0], [r * 2.6, 0.2, r * 2.6], C.plank);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        B.add("cube", [Math.cos(a) * 0.7, H + 0.45, Math.sin(a) * 0.7], [0.08, 0.9, 0.08], C.dark);
      }
      B.add("cube", [0, 0.25, 0], [r * 2.6, 0.5, r * 2.6], C.drift);
      return;
    }
    if (era === 1) {
      const layers = Math.round(H / 1.1);
      for (let i = 0; i < layers; i++) {
        const t = i / layers, rad = 2.7 - 0.7 * t, segH = H / layers;
        B.add("cylLow", [0, segH * (i + 0.5), 0], [rad, segH / 2, rad], i % 3 === 0 ? stoneD : stone, { g: 0.08, rot: [0, i * 13, 0] });
      }
      B.add("cube", [0, 0.95, 1.6], [0.9, 1.9, 0.14], C.tar);
      for (let i = 1; i < 3; i++) B.add("cube", [0, H * i / 3, 2.7 - 0.7 * (i / 3) - 0.02], [0.35, 0.55, 0.06], C.window, { e: 1.2 });
      B.add("cylinder", [0, H + 0.1, 0], [2.6, 0.14, 2.6], stoneD);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI * 2 / 8;
        B.add("cube", [Math.cos(a) * 1.15, H + 1.2, Math.sin(a) * 1.15], [0.12, 2.2, 0.12], wood);
      }
      B.add("cone", [0, H + 2.8, 0], [2.6, 1.2, 2.6], C.roofGrey, { g: 0.2 });
      return;
    }
    if (era === 2) {
      const bands = 6 + (level - 9);
      for (let i = 0; i < bands; i++) {
        const rad = 3.4 + (2.3 - 3.4) * (i / bands), segH = H / bands;
        B.add("cylinder", [0, segH * (i + 0.5), 0], [rad, segH / 2, rad], i % 2 === 0 ? C.red : C.white, { g: 0.35 });
      }
      B.add("cube", [0, 0.9, 1.68], [1, 1.8, 0.12], C.tar);
      for (let i = 1; i < 4; i++) {
        const y = H * i / 4.5, rad = (3.4 + (2.3 - 3.4) * (y / H)) * 0.5 + 0.02;
        B.add("cube", [0, y, rad], [0.4, 0.6, 0.06], C.window, { e: 1.4 });
      }
      B.add("cylinder", [0, H + 0.1, 0], [3.4, 0.12, 3.4], C.dark, { g: 0.5 });
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI * 2 / 16;
        B.add("cube", [Math.cos(a) * 1.6, H + 0.55, Math.sin(a) * 1.6], [0.07, 0.8, 0.07], C.dark);
      }
      B.add("cylinder", [0, H + 0.95, 0], [3.25, 0.04, 3.25], C.dark);
      B.add("cone", [0, H + 2.2, 0], [2.6, 1.5, 2.6], C.red, { g: 0.35 });
      B.add("sphere", [0, H + 3.8, 0], [0.35, 0.35, 0.35], C.dark, { g: 0.6 });
      return;
    }
    B.add("cylinder", [0, 0.6, 0], [5.2, 0.6, 5.2], concrete, { g: 0.3 });
    B.add(FR55, [0, 1.2, 0], [4.4, H - 1.2, 4.4], concrete, { g: 0.5 });
    const rings = level >= 18 ? 3 : 2;
    for (let i = 1; i <= rings; i++) {
      const y = 1.2 + (H - 1.2) * i / (rings + 1), rad = 2.2 - 1 * ((y - 1.2) / (H - 1.2));
      B.add("cylinder", [0, y, 0], [rad * 2 + 0.15, 0.25, rad * 2 + 0.15], C.red, { g: 0.4 });
    }
    for (let i = 1; i < 6; i++) {
      const y = H * i / 6.5, rad = 2.2 - 1 * ((y - 1.2) / (H - 1.2));
      B.add("cube", [0, y, rad - 0.02], [0.3, 0.9, 0.06], [0.55, 0.8, 0.95], { e: 0.9, g: 0.9 });
    }
    B.add("cube", [0, 1.3, 2.3], [1.2, 2.4, 0.14], steel, { g: 0.7 });
    B.add("cylinder", [0, H + 0.12, 0], [3.8, 0.12, 3.8], steel, { g: 0.7 });
    for (let i = 0; i < 20; i++) {
      const a = i * Math.PI * 2 / 20;
      B.add("cube", [Math.cos(a) * 1.85, H + 0.6, Math.sin(a) * 1.85], [0.05, 0.9, 0.05], steel, { g: 0.8 });
    }
    B.add("cylinder", [0, H + 1.05, 0], [3.7, 0.04, 3.7], steel, { g: 0.8 });
    B.add("cylinder", [0, H + 3, 0], [2.6, 0.1, 2.6], steel, { g: 0.8 });
    B.add("sphere", [0, H + 3.1, 0], [2.4, 1, 2.4], concrete, { g: 0.7 });
    B.add("cube", [0, H + 5, 0], [0.08, 3, 0.08], steel);
    B.add("sphere", [0, H + 6.5, 0], [0.25, 0.25, 0.25], C.red, { e: 2.5 });
    B.add("cube", [0.9, H + 4, 0], [1.4, 0.08, 0.08], steel);
  }
  function lantern(B, level) {
    const H = towerHeight(level), era = towerEra(level);
    if (era === 0) {
      B.add("cylinder", [0, H + 0.55, 0], [1, 0.35, 1], [1, 0.6, 0.25], { e: 3 });
      B.add("sphere", [0, H + 0.95, 0], [0.8, 0.6, 0.8], [1, 0.75, 0.35], { e: 3.5 });
      return;
    }
    if (era === 3) {
      B.add("cylinder", [0, H + 2, 0], [2.1, 0.95, 2.1], [0.85, 0.95, 1], { e: 3.2, g: 1 });
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI * 2 / 8;
        B.add("cube", [Math.cos(a) * 1.05, H + 2, Math.sin(a) * 1.05], [0.05, 1.9, 0.05], C.dark);
      }
      return;
    }
    B.add("cylinder", [0, H + 1.2, 0], [1.9, 1, 1.9], [1, 0.85, 0.45], { e: 3 });
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI * 2 / 6;
      B.add("cube", [Math.cos(a) * 0.95, H + 1.2, Math.sin(a) * 0.95], [0.08, 2, 0.08], C.dark);
    }
  }
  function dike(B, level, R, top) {
    const base = -1.2, H = top - base, N = 80, gap = 0.075;
    const grass = [0.36, 0.5, 0.27], earth = [0.5, 0.44, 0.33], stone = [0.46, 0.46, 0.44], concrete = [0.78, 0.78, 0.76];
    const seg = 2 * Math.PI * R / N * 1.08;
    for (let k = 0; k < N; k++) {
      const a = (k + 0.5) / N * Math.PI * 2;
      if (Math.abs(a - Math.PI) < gap) continue;
      const x = Math.sin(a), z = Math.cos(a), yaw = a / (Math.PI / 180);
      const lay = (y0, h2, w2, off, col) => B.add("cube", [x * (R + off), y0 + h2 / 2, z * (R + off)], [seg, h2, w2], col, { rot: [0, yaw, 0], g: 0.08 });
      lay(base, H * 0.4, 9, 0, level >= 7 ? stone : earth);
      lay(base + H * 0.4, H * 0.35, 6.5, 0.3, level >= 7 ? stone : earth);
      lay(base + H * 0.75, H * 0.25, 4, 0.3, grass);
      if (level >= 7) lay(base + H * 0.4, H * 0.35, 1, -2.8, grass);
      if (level >= 14) lay(top, 0.9, 0.6, 2, concrete);
    }
    const zc = -R;
    for (const s of [-1, 1]) {
      const xs = s * Math.sin(gap) * R;
      B.add("cube", [xs, base + (H + 1.5) / 2, zc], [1.6, H + 1.5, 7], level >= 7 ? concrete : C.plank, { g: 0.2 });
    }
    const w = Math.sin(gap) * R * 2;
    B.add("cube", [0, top + 1.2, zc], [w + 1.6, 0.6, 1.4], level >= 7 ? concrete : C.plank);
    B.add("cube", [0, top - 0.6, zc + 2.6], [w, H * 0.5, 0.35], level >= 14 ? [0.4, 0.44, 0.5] : C.tar, { g: 0.5 });
    B.add("cube", [0, base + 0.2, zc], [w, 0.4, 7], earth);
  }
  function scaffold(B, half, newBuild) {
    const wood = [0.65, 0.5, 0.3];
    const h2 = half * 1.1 + 1.5;
    for (let i = 0; i < 4; i++) {
      const sx = i & 1 ? half : -half, sz = i & 2 ? half : -half;
      B.add("cube", [sx, h2 / 2, sz], [0.18, h2, 0.18], wood);
    }
    for (let k = 1; k <= 2; k++) {
      const y = h2 * 0.45 * k;
      B.add("cube", [0, y, -half], [half * 2, 0.12, 0.12], wood);
      B.add("cube", [0, y, half], [half * 2, 0.12, 0.12], wood);
      B.add("cube", [-half, y, 0], [0.12, 0.12, half * 2], wood);
      B.add("cube", [half, y, 0], [0.12, 0.12, half * 2], wood);
      B.add("cube", [0, y * 0.5 + 0.3, -half], [half * 2.2, 0.1, 0.1], wood, { rot: [0, 0, 28] });
    }
    if (newBuild) B.add("cube", [half + 0.6, 0.3, half - 0.6], [0.9, 0.6, 1.4], C.drift);
  }
  function villager(B, coat) {
    B.add("capsule", [0, 0.55, 0], [0.55, 0.55, 0.55], coat, { g: 0.35 });
    B.add("sphere", [0, 1.25, 0], [0.38, 0.38, 0.38], [0.9, 0.72, 0.6]);
    B.add("cylinder", [0, 1.42, -0.04], [0.55, 0.04, 0.6], [0.9, 0.75, 0.2], { g: 0.4 });
    B.add("sphere", [0, 1.48, 0], [0.36, 0.2, 0.36], [0.9, 0.75, 0.2], { g: 0.4 });
  }
  var SKINS = [[0.93, 0.76, 0.64], [0.72, 0.53, 0.4], [0.5, 0.35, 0.26]];
  var HAIRS = [[0.22, 0.15, 0.1], [0.78, 0.62, 0.36], [0.62, 0.6, 0.58]];
  function personTorso(B, coat, hat, skin, trousers) {
    const sk = SKINS[skin], dark = [0.16, 0.13, 0.11];
    B.add("capsule", [0, 0.93, 0], [0.33, 0.14, 0.21], trousers, { g: 0.15 });
    B.add("capsule", [0, 1.19, 0], [0.38, 0.3, 0.24], coat, { g: 0.25 });
    B.add("capsule", [0, 1.4, -5e-3], [0.46, 0.13, 0.25], coat, { rot: [0, 0, 90], g: 0.25 });
    B.add("cube", [0, 1.4, -5e-3], [0.36, 0.13, 0.24], coat, { g: 0.25 });
    B.add("cylinder", [0, 1, 0], [0.37, 0.025, 0.23], dark, { g: 0.4 });
    B.add("cube", [0, 1, 0.115], [0.06, 0.045, 0.012], [0.75, 0.65, 0.35], { g: 0.8 });
    for (let k = 0; k < 3; k++) B.add("sphere", [0, 1.12 + k * 0.1, 0.122], [0.025, 0.025, 0.015], dark, { g: 0.6 });
    B.add("cube", [0, 1.2, 0.118], [0.012, 0.36, 0.01], mulCol(coat, 0.7));
    B.add("cylinder", [0, 1.49, 0], [0.17, 0.035, 0.15], mulCol(coat, 0.85));
    B.add("cylinder", [0, 1.53, 5e-3], [0.095, 0.05, 0.095], sk);
    B.add("sphere", [0, 1.66, 0.01], [0.19, 0.235, 0.215], sk, { g: 0.15 });
    B.add("sphere", [0, 1.6, 0.04], [0.15, 0.1, 0.15], sk);
    B.add("cube", [0, 1.655, 0.115], [0.028, 0.05, 0.035], mulCol(sk, 0.95), { rot: [-12, 0, 0] });
    for (const x of [-0.042, 0.042]) {
      B.add("sphere", [x, 1.69, 0.1], [0.03, 0.022, 0.02], [0.96, 0.96, 0.94]);
      B.add("sphere", [x, 1.69, 0.108], [0.016, 0.016, 0.01], [0.12, 0.1, 0.09]);
      B.add("cube", [x, 1.716, 0.103], [0.04, 8e-3, 0.01], dark);
    }
    B.add("cube", [0, 1.615, 0.103], [0.05, 9e-3, 0.01], mulCol(sk, 0.7));
    for (const x of [-0.098, 0.098]) B.add("sphere", [x, 1.665, 0], [0.03, 0.06, 0.04], mulCol(sk, 0.95));
    if (hat === 0) {
      const y = [0.95, 0.78, 0.18];
      B.add("sphere", [0, 1.75, -5e-3], [0.235, 0.16, 0.25], y, { g: 0.55 });
      B.add("cylinder", [0, 1.725, -0.035], [0.33, 0.012, 0.37], y, { rot: [-9, 0, 0], g: 0.55 });
    } else if (hat === 1) {
      const col = [[0.7, 0.15, 0.13], [0.15, 0.3, 0.55], [0.9, 0.9, 0.86]][(coat[0] * 10 | 0) % 3];
      B.add("sphere", [0, 1.755, -5e-3], [0.215, 0.17, 0.235], col, { g: 0.1 });
      B.add("cylinder", [0, 1.7, -5e-3], [0.22, 0.025, 0.24], mulCol(col, 0.8));
      B.add("sphere", [0, 1.85, -0.01], [0.07, 0.07, 0.07], [0.95, 0.95, 0.92]);
    } else {
      const hc = HAIRS[hat - 2];
      B.add("sphere", [0, 1.73, -0.01], [0.205, 0.15, 0.225], hc, { g: 0.2 });
      B.add("sphere", [0, 1.67, -0.06], [0.2, 0.18, 0.14], hc, { g: 0.2 });
    }
  }
  function personThigh(B, trousers) {
    B.add("capsule", [0, -0.21, 0], [0.15, 0.25, 0.16], trousers, { g: 0.15 });
  }
  function personShin(B, trousers) {
    const boot = [0.2, 0.17, 0.14];
    B.add("capsule", [0, -0.16, 0], [0.12, 0.19, 0.125], trousers, { g: 0.15 });
    B.add("capsule", [0, -0.33, 0], [0.125, 0.12, 0.13], boot, { g: 0.45 });
    B.add("cube", [0, -0.425, 0.045], [0.115, 0.075, 0.25], boot, { g: 0.45 });
    B.add("sphere", [0, -0.415, 0.15], [0.11, 0.08, 0.08], boot, { g: 0.45 });
    B.add("cube", [0, -0.458, 0.04], [0.12, 0.018, 0.26], [0.1, 0.09, 0.08]);
  }
  function personUpperArm(B, coat) {
    B.add("sphere", [0, -0.01, 0], [0.13, 0.13, 0.13], coat, { g: 0.25 });
    B.add("capsule", [0, -0.15, 0], [0.105, 0.17, 0.11], coat, { g: 0.25 });
  }
  function personForearm(B, coat, skin) {
    const sk = SKINS[skin];
    B.add("capsule", [0, -0.12, 0], [0.095, 0.15, 0.1], coat, { g: 0.25 });
    B.add("cylinder", [0, -0.235, 0], [0.1, 0.015, 0.105], mulCol(coat, 0.75));
    B.add("sphere", [0, -0.3, 0.01], [0.075, 0.11, 0.05], sk, { g: 0.1 });
    B.add("sphere", [0.035, -0.27, 0.035], [0.03, 0.06, 0.03], sk, { rot: [0, 0, 30] });
  }
  function backBasket(B) {
    B.add("cylinder", [0, 1.24, -0.27], [0.34, 0.19, 0.3], [0.72, 0.6, 0.35], { g: 0.1 });
    for (let k = 0; k < 3; k++) B.add("cylinder", [0, 1.12 + k * 0.12, -0.27], [0.35, 0.01, 0.31], [0.55, 0.44, 0.24]);
    for (const x of [-0.11, 0.11]) {
      B.add("cube", [x, 1.26, 0.122], [0.035, 0.34, 0.012], [0.35, 0.25, 0.16]);
      B.add("cube", [x, 1.43, -0.02], [0.035, 0.012, 0.27], [0.35, 0.25, 0.16]);
    }
  }
  var mulCol = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
  function traderShip(B) {
    const hull = [0.42, 0.28, 0.17], dark = [0.25, 0.17, 0.1];
    B.add("cube", [0, 0.4, 0], [9, 1.6, 3.4], hull, { g: 0.2 });
    B.add("cube", [0, -0.3, 0], [7.6, 0.8, 2.4], dark);
    B.add("prism", [5.2, 0.55, 0], [1.6, 1.9, 3.4], hull, { rot: [0, 0, -90] });
    B.add("cube", [-3.6, 1.7, 0], [2.2, 1.2, 3.2], hull, { g: 0.2 });
    B.add("cube", [-3.6, 2.35, 0], [2.4, 0.12, 3.4], dark);
    B.add("cube", [0, 1.22, 0], [9, 0.1, 3.5], [0.6, 0.45, 0.28]);
    B.add("cylinder", [0.4, 5, 0], [0.22, 4, 0.22], dark);
    B.add("cube", [0.4, 5.6, 0], [0.25, 4.6, 5.2], [0.93, 0.88, 0.76], { rot: [0, 90, 0], g: 0.1 });
    B.add("cube", [0.4, 5.6, 0.14], [0.3, 1.2, 1.2], [0.75, 0.2, 0.15], { rot: [0, 90, 0] });
    B.add("cube", [0.4, 8.1, 0], [0.12, 0.12, 5.4], dark, { rot: [0, 90, 0] });
    B.add("cube", [0.4, 9.4, 0], [0.9, 0.5, 0.04], [0.9, 0.75, 0.2], { rot: [0, 90, 0] });
    for (const [x, z] of [[-1.5, 0.8], [1.8, -0.6], [2.6, 0.9]]) B.add("cube", [x, 1.55, z], [0.9, 0.7, 0.9], [0.55, 0.42, 0.25]);
    B.add("cylinder", [-0.8, 1.6, -0.9], [0.6, 0.4, 0.6], [0.5, 0.35, 0.2]);
  }
  function gullBody(B) {
    B.add("capsule", [0, 0, 0], [0.25, 0.4, 0.25], [0.95, 0.95, 0.95], { rot: [90, 0, 0], g: 0.2 });
    B.add("cube", [0, 0.05, 0.45], [0.08, 0.06, 0.2], [0.95, 0.75, 0.2]);
  }
  function gullWing(B, side) {
    B.add("cube", [side * 0.55, 0, 0], [1.1, 0.04, 0.35], [0.55, 0.58, 0.62], { g: 0.2 });
  }
  function buoy(B, col) {
    B.add("cylinder", [0, 0.3, 0], [0.9, 0.5, 0.9], col, { g: 0.4 });
    B.add("cone", [0, 0.8, 0], [0.8, 1.1, 0.8], col, { g: 0.4 });
    B.add("sphere", [0, 2, 0], [0.25, 0.25, 0.25], [1, 0.9, 0.6], { e: 2 });
  }

  // src/world.js
  var RING = 20;
  var RING2 = 34;
  var RING3R = 47;
  var UNIFORMS = [[0.16, 0.24, 0.45], [0.55, 0.57, 0.6], [0.62, 0.14, 0.12], [0.45, 0.33, 0.2], [0.25, 0.45, 0.28]];
  var STRIDE = 1.25;
  var randomLook = () => ({ coat: Math.floor(Math.random() * COATS.length), hat: Math.floor(Math.random() * 5), skin: Math.random() < 0.6 ? 0 : Math.random() < 0.6 ? 1 : 2, tr: Math.floor(Math.random() * 3) });
  var COATS = [[0.75, 0.55, 0.15], [0.2, 0.32, 0.5], [0.55, 0.2, 0.18], [0.3, 0.42, 0.3], [0.5, 0.45, 0.38], [0.85, 0.75, 0.3]];
  var AREA = { r: 45 };
  var wallRadius = () => AREA.r + 3;
  var damRadius = () => AREA.r + 20;
  function plotAngle(i) {
    if (i < INNER) return (i - 1) * Math.PI * 2 / 12;
    if (i < RING3) return (i - INNER + 0.5) * Math.PI * 2 / 12;
    if (i < WALL) return (i - RING3 + 0.5) * Math.PI * 2 / 18;
    if (i === WALL || i === DAMM) return Math.PI;
    return (i - TOWERS + 0.5) * Math.PI * 2 / 8;
  }
  function plotRadius(i) {
    return i === 0 ? 0 : i < INNER ? RING : i < RING3 ? RING2 : i < WALL ? RING3R : i === DAMM ? damRadius() : wallRadius();
  }
  function plotPos(i) {
    if (i === 0) return [0, 0, 0];
    const a = plotAngle(i), r = plotRadius(i);
    return [Math.sin(a) * r, 0, Math.cos(a) * r];
  }
  function plotYaw(i) {
    if (i === 0) return 0;
    const p = plotPos(i);
    return Math.atan2(-p[0], -p[2]) / D2R;
  }
  var wyNow = (c) => c.water;
  var World = class {
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
      this.target = [0, 3, 0];
      this.dist = 62;
      this.minDist = 22;
      this.maxDist = 170;
      this.buildEnvironment();
      this.buildStatic();
      this.villagers = [];
      this.gulls = [];
      const R = rng(99);
      for (let i = 0; i < 7; i++) this.gulls.push({ radius: 14 + R() * 32, height: 14 + R() * 12, speed: (0.15 + R() * 0.15) * (R() < 0.5 ? 1 : -1), angle: R() * 6.28, flap: R() * 10 });
      this.smoke = new Float32Array(600 * 5);
      this.smokeP = [];
      this.rainMax = 3e3;
      this.rain = new Float32Array(this.rainMax * 8);
      this.drops = [];
    }
    // ---------------- Aufbau ----------------
    buildEnvironment() {
      const B = new Builder();
      const R = rng(4711);
      const rr = (a, b) => a + R() * (b - a);
      B.add("plane", [0, 0, 0], [70, 1, 70], C.wetSand, { g: 0.55 });
      for (let i = 0; i < 14; i++) {
        const a = rr(0, 6.28), d = rr(40, 160);
        B.add("cube", [Math.sin(a) * d, 0.01, Math.cos(a) * d], [rr(3, 7), 0.02, rr(30, 80)], [0.3, 0.3, 0.27], { rot: [0, rr(0, 180), 0], g: 0.8 });
      }
      for (let i = 0; i < 34; i++) {
        const a = rr(0, 6.28), d = rr(36, 210);
        B.add("sphere", [Math.sin(a) * d, -0.35, Math.cos(a) * d], [rr(18, 55), rr(1.6, 2.8), rr(12, 36)], C.sand, { rot: [0, rr(0, 180), 0], g: 0.2 });
      }
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * 6.28 + rr(-0.2, 0.2), d = rr(230, 300);
        const c = [Math.sin(a) * d, 0, Math.cos(a) * d];
        B.add("sphere", c, [rr(70, 120), rr(16, 26), rr(35, 60)], C.sand, { rot: [0, a / D2R, 0] });
        for (let k = 0; k < 10; k++) B.add("cone", [c[0] + rr(-25, 25), rr(6, 9), c[2] + rr(-12, 12)], [rr(5, 9), rr(3, 6), rr(5, 9)], [0.55, 0.58, 0.32], { g: 0.05 });
      }
      for (let side = -1; side <= 1; side += 2)
        for (let i = 0; i < 16; i++) {
          const p = [side * (6 + i * 0.6) + 40, 0, -40 - i * 11];
          B.add("cylinder", [p[0], 2, p[2]], [0.12, 2, 0.12], [0.35, 0.3, 0.25]);
          B.add("sphere", [p[0], 4.1, p[2]], [0.6, 0.8, 0.6], [0.35, 0.3, 0.25]);
        }
      B.push([-70, 0, -55], [0, 35, 12]);
      const hull = [0.22, 0.17, 0.13];
      B.add("cube", [0, 0.6, 0], [5, 1.4, 18], hull);
      for (let i = 0; i < 7; i++) {
        const z = -7 + i * 2.3;
        B.add("cube", [-2.6, 2.2, z], [0.35, 3.2, 0.35], hull, { rot: [0, 0, -12] });
        B.add("cube", [2.6, 2, z], [0.35, 2.6 + i % 3 * 0.6, 0.35], hull, { rot: [0, 0, 12] });
      }
      B.add("cylinder", [0, 4.5, 2], [0.5, 4.5, 0.5], hull, { rot: [18, 0, 0] });
      B.pop();
      this.envMesh = this.r.upload(B);
      this.buoys = [];
      for (let i = 0; i < 8; i++) {
        const a = rr(0, 6.28), d = rr(32, 70);
        this.buoys.push({ x: Math.sin(a) * d, z: Math.cos(a) * d, red: i % 2 === 0 });
      }
    }
    buildStatic() {
      const r = this.r;
      this.villagerMeshes = COATS.map((c) => {
        const B2 = new Builder();
        villager(B2, c);
        return r.upload(B2);
      });
      const sickB = new Builder();
      villager(sickB, [0.45, 0.58, 0.42]);
      this.sickMesh = r.upload(sickB);
      const up = (f) => {
        const B2 = new Builder();
        f(B2);
        return r.upload(B2);
      };
      const TROUSERS = [[0.2, 0.22, 0.28], [0.32, 0.27, 0.2], [0.24, 0.24, 0.24]];
      const coatsP = COATS.concat([[0.45, 0.58, 0.42]], UNIFORMS);
      this.P = {
        torso: coatsP.map((c, ci) => [0, 1, 2, 3, 4].map((h2) => [0, 1, 2].map((sk) => TROUSERS.map((tr) => null)))),
        thigh: TROUSERS.map((tr) => up((B2) => personThigh(B2, tr))),
        shin: TROUSERS.map((tr) => up((B2) => personShin(B2, tr))),
        uarm: coatsP.map((c) => up((B2) => personUpperArm(B2, c))),
        farm: coatsP.map((c) => [0, 1, 2].map((sk) => up((B2) => personForearm(B2, c, sk)))),
        basket: up((B2) => backBasket(B2)),
        torsoMesh: (ci, h2, sk, tr) => this.P.torso[ci][h2][sk][tr] || (this.P.torso[ci][h2][sk][tr] = up((B2) => personTorso(B2, coatsP[ci], h2, sk, TROUSERS[tr])))
      };
      this.gState = /* @__PURE__ */ new WeakMap();
      this.dtNow = 0.016;
      let B = new Builder();
      gullBody(B);
      this.gullBody = r.upload(B);
      B = new Builder();
      gullWing(B, -1);
      this.gullWingL = r.upload(B);
      B = new Builder();
      gullWing(B, 1);
      this.gullWingR = r.upload(B);
      B = new Builder();
      buoy(B, [0.8, 0.15, 0.12]);
      this.buoyRed = r.upload(B);
      B = new Builder();
      buoy(B, [0.15, 0.55, 0.25]);
      this.buoyGreen = r.upload(B);
      B = new Builder();
      B.add("cube", [0, 0.5, 0], [1, 1, 1], [0.6, 0.5, 0.38]);
      this.ghostMesh = r.upload(B);
      B = new Builder();
      B.add("cube", [0, 0, 0], [1, 1, 1], [0.3, 0.85, 1], { e: 2.5 });
      this.selMesh = r.upload(B);
      this.nodeMeshes = [0, 1, 2, 3].map((t) => {
        const b = new Builder();
        resourceNode(b, t);
        return r.upload(b);
      });
      B = new Builder();
      basket(B);
      this.basketMesh = r.upload(B);
      B = new Builder();
      traderShip(B);
      this.shipMesh = r.upload(B);
      this.obstMeshes = [
        (() => {
          const b = new Builder();
          for (let k = 0; k < 5; k++) b.add("cylinder", [(k - 2) * 0.55, 0.25 + k % 2 * 0.35, (k % 3 - 1) * 0.4], [0.28, 2.6 - k % 3 * 0.5, 0.28], [0.5 - k * 0.03, 0.36, 0.22], { rot: [0, k * 37, 90] });
          return r.upload(b);
        })(),
        (() => {
          const b = new Builder();
          traderShip(b);
          return r.upload(b);
        })(),
        (() => {
          const b = new Builder();
          for (let k = 0; k < 6; k++) b.add("sphere", [Math.cos(k) * 0.9, 0.35 + k % 3 * 0.25, Math.sin(k * 1.3) * 0.8], [0.9, 0.7, 0.9], [0.22 + k * 0.02, 0.42 + k % 2 * 0.08, 0.18]);
          return r.upload(b);
        })(),
        (() => {
          const b = new Builder();
          b.add("sphere", [0, 0.6, 0], [2.2, 1.5, 1.8], [0.48, 0.47, 0.45]);
          b.add("sphere", [1.1, 0.4, 0.6], [1.2, 0.9, 1.1], [0.42, 0.41, 0.4]);
          b.add("sphere", [-0.9, 0.3, -0.5], [1, 0.7, 0.9], [0.52, 0.5, 0.47]);
          return r.upload(b);
        })()
      ];
      B = new Builder();
      B.add("cube", [0, 0.25, 0], [0.9, 0.5, 0.6], [0.45, 0.3, 0.15]);
      B.add("cylinder", [0, 0.5, 0], [0.9, 0.3, 0.6], [0.5, 0.33, 0.16], { rot: [0, 0, 90] });
      B.add("cube", [0, 0.35, 0.31], [0.2, 0.2, 0.04], [1, 0.85, 0.3], { e: 2 });
      B.add("sphere", [0, 0.75, 0], [0.5, 0.5, 0.5], [1, 0.9, 0.5], { e: 3 });
      this.chestMesh = r.upload(B);
      B = new Builder();
      B.add("cylinder", [0, 0, 0], [0.06, 0.4, 0.06], [0.3, 0.2, 0.12]);
      B.add("sphere", [0, 0.48, 0], [0.22, 0.32, 0.22], [1, 0.6, 0.2], { e: 3 });
      this.torchMesh = r.upload(B);
      this.columns = [];
      this.seenMarch = /* @__PURE__ */ new Set();
      B = new Builder();
      B.add("cylinder", [0, 0, 0], [1, 0.03, 1], [0.3, 0.85, 1], { e: 2 });
      this.ringMesh = r.upload(B);
      this.gPaths = /* @__PURE__ */ new WeakMap();
      B = new Builder();
      B.add("cone", [0, 0, 60], [9, 60, 4], [1, 1, 1], { rot: [-90, 0, 0] });
      this.beamMesh = r.upload(B);
    }
    buildInfra(deck, area) {
      this.r.free(this.infraMesh);
      const B = new Builder();
      const top = deck - 0.9, R = area + 5, Rb = area + 16;
      B.add(frustum(R / Rb), [0, -1, 0], [Rb * 2, top + 1, Rb * 2], [0.6, 0.55, 0.43], { g: 0.15 });
      B.add("cylinder", [0, top - 0.02, 0], [R * 2 - 0.5, 0.05, R * 2 - 0.5], [0.4, 0.5, 0.29], { g: 0.05 });
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2 + Math.PI / 8;
        B.add("cube", [Math.sin(a) * (R * 0.62 + 6), top + 0.04, Math.cos(a) * (R * 0.62 + 6)], [2.2, 0.04, R * 0.75], [0.55, 0.48, 0.36], { rot: [0, a / D2R, 0] });
      }
      const post = C.tar, algae = [0.18, 0.28, 0.2], plank = C.plank;
      const postLen = deck + 1, postY = (deck - 1) / 2;
      B.add("cylinder", [0, deck - 0.15, 0], [19, 0.15, 19], plank, { g: 0.2 });
      B.add("cylinder", [0, (deck - 1.05) / 2, 0], [7, (deck + 0.95) / 2, 7], [0.38, 0.38, 0.4], { g: 0.2 });
      for (let k = -4; k <= 4; k++) B.add("cube", [k * 2, deck + 5e-3, 0], [0.06, 0.01, Math.sqrt(Math.max(0, 90 - k * k * 4)) * 2], [0.35, 0.26, 0.17]);
      for (let i = 0; i < 18; i++) {
        const a = i * Math.PI * 2 / 18, px = Math.sin(a) * 8.8, pz = Math.cos(a) * 8.8;
        B.add("cylinder", [px, postY, pz], [0.5, postLen / 2, 0.5], post, { g: 0.35 });
        B.add("cylinder", [px, 0.4, pz], [0.56, 0.6, 0.56], algae, { g: 0.6 });
        if (i % 3 !== 0) B.add("cube", [px * 1.05, deck + 0.5, pz * 1.05], [0.12, 1, 0.12], post);
      }
      for (let i = 1; i < RING3; i++) {
        const p = plotPos(i);
        B.push(p, [0, plotYaw(i), 0]);
        B.add("cube", [0, deck - 0.15, 0], [8, 0.3, 8], plank, { g: 0.2 });
        for (let k = -3; k <= 3; k++) B.add("cube", [k * 1.1, deck + 5e-3, 0], [0.05, 0.01, 7.9], [0.35, 0.26, 0.17]);
        for (let k = 0; k < 9; k++) {
          const lx = (k % 3 - 1) * 3.6, lz = (Math.floor(k / 3) - 1) * 3.6;
          B.add("cylinder", [lx, postY, lz], [0.42, postLen / 2, 0.42], post, { g: 0.35 });
          B.add("cylinder", [lx, 0.4, lz], [0.48, 0.6, 0.48], algae, { g: 0.6 });
        }
        const outer = i >= INNER;
        const wl = outer ? 21.4 : 7.2, wz = outer ? 14.7 : 7.5, ww = outer ? 1.8 : 2.2;
        B.add("cube", [0, deck - 0.1, wz], [ww, 0.2, wl], plank, { g: 0.2 });
        for (let k = 0; k < (outer ? 6 : 2); k++) {
          const z = (outer ? 6 : 6) + k * 3;
          B.add("cylinder", [-1, postY, z], [0.3, postLen / 2, 0.3], post);
          B.add("cylinder", [1, postY, z], [0.3, postLen / 2, 0.3], post);
          B.add("cube", [-1.1, deck + 0.3, z], [0.1, 0.6, 0.1], post);
          B.add("cube", [1.1, deck + 0.3, z], [0.1, 0.6, 0.1], post);
        }
        B.add("cube", [-ww / 2, deck + 0.6, wz], [0.08, 0.08, wl], post);
        B.add("cube", [ww / 2, deck + 0.6, wz], [0.08, 0.08, wl], post);
        B.pop();
      }
      for (let i = RING3; i < WALL; i++) {
        const p = plotPos(i);
        B.push(p, [0, plotYaw(i), 0]);
        B.add("cube", [0, deck - 0.15, 0], [8, 0.3, 8], plank, { g: 0.2 });
        for (let k = -3; k <= 3; k++) B.add("cube", [k * 1.1, deck + 5e-3, 0], [0.05, 0.01, 7.9], [0.35, 0.26, 0.17]);
        for (let k = 0; k < 4; k++) B.add("cube", [k & 1 ? 3.6 : -3.6, deck - 0.6, k & 2 ? 3.6 : -3.6], [0.4, 1, 0.4], post);
        B.pop();
      }
      const pa = 15 * D2R, pg = [Math.sin(pa) * 9.8, 0, Math.cos(pa) * 9.8];
      for (let k = 0; k < 10; k++) B.add("cube", [pg[0], k + 0.5, pg[2]], [0.35, 1, 0.12], k % 2 === 0 ? [0.95, 0.95, 0.92] : [0.1, 0.1, 0.12], { g: 0.3 });
      B.add("cube", [pg[0], deck, pg[2]], [0.6, 0.08, 0.2], [1, 0.25, 0.2], { e: 2 });
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * 6.28 + 0.26, lx = Math.sin(a) * 7.6, lz = Math.cos(a) * 7.6;
        B.add("cylinder", [lx, deck + 1.2, lz], [0.15, 1.2, 0.15], C.dark);
        B.add("cube", [lx, deck + 2.6, lz], [0.4, 0.5, 0.4], C.window, { e: 2.2 });
      }
      this.infraMesh = this.r.upload(B);
      this.infraDeck = deck;
      this.infraArea = area;
    }
    buildWall(level, deck) {
      this.r.free(this.wallMesh);
      const B = new Builder();
      wall(B, level, wallRadius(), deck - 0.9);
      this.wallMesh = this.r.upload(B);
      this.wallKey = `${level}|${AREA.r}|${deck}`;
    }
    buildPlot(i) {
      const p = this.c.s.plots[i];
      const deck = this.c.deck;
      this.r.free(this.plotMesh[i]);
      if (i === 0) {
        this.r.free(this.lanternMesh);
        this.lanternMesh = null;
      }
      const B = new Builder();
      B.push([plotPos(i)[0], deck, plotPos(i)[2]], [0, plotYaw(i), 0]);
      if (i === 0) {
        tower(B, Math.max(1, p.level));
        const L = new Builder();
        L.push([0, deck, 0]);
        lantern(L, Math.max(1, p.level));
        this.lanternMesh = this.r.upload(L);
        this.lampPos = [0, deck + lampHeight(Math.max(1, p.level)), 0];
      } else if (i === DAMM) {
      } else if (i >= TOWERS) {
        if (p.type >= 0 && p.level > 0) defenseTower(B, p.level);
        else if (this.c.levels(T.MAUER) > 0) B.add("cylinder", [0, -0.75, 0], [3.6, 0.15, 3.6], [0.5, 0.5, 0.5]);
      } else if (i === WALL) {
      } else if (p.type >= 0 && p.level > 0) building(B, p.type, p.level);
      if (p.buildLeft > 0 && i === DAMM) {
        B.push([0, -deck - 1.2, 0]);
        scaffold(B, 4.5, p.level === 0);
        B.pop();
      }
      if (p.buildLeft > 0 && i !== WALL && i !== DAMM) scaffold(B, i === 0 ? 4.5 : 3, p.level === 0);
      if (p.buildLeft > 0 && i === WALL) {
        B.push([0, -0.9, 0]);
        scaffold(B, 4.5, false);
        B.pop();
      }
      B.pop();
      this.plotMesh[i] = this.r.upload(B);
      this.plotEmit[i] = B.emitters;
      Object.assign(this.shown[i], { type: p.type, level: p.level, building: p.buildLeft > 0, deck, area: AREA.r, wall: this.c.levels(T.MAUER) });
    }
    // ---------------- Aktualisierung ----------------
    update(dt) {
      this.dtNow = Math.min(0.1, dt);
      this.time += dt;
      const c = this.c;
      const deck = c.deck;
      AREA.r = c.areaRadius;
      if (this.infraDeck !== deck || this.infraArea !== AREA.r) this.buildInfra(deck, AREA.r);
      const wl = c.levels(T.MAUER);
      if (this.wallKey !== `${wl}|${AREA.r}|${deck}`) this.buildWall(wl, deck);
      const dl = c.levels(T.DAMM);
      if (this.damKey !== `${dl}|${AREA.r}`) {
        this.r.free(this.damMesh);
        this.damMesh = null;
        if (dl > 0) {
          const B = new Builder();
          dike(B, dl, damRadius(), damTopFor(dl));
          this.damMesh = this.r.upload(B);
        }
        this.damKey = `${dl}|${AREA.r}`;
      }
      for (let i = 0; i < PLOTS; i++) {
        const p = c.s.plots[i], sh = this.shown[i];
        const moved = i >= WALL && (sh.area !== AREA.r || sh.wall !== wl);
        if (p.type !== sh.type || p.level !== sh.level || p.buildLeft > 0 !== sh.building || sh.deck !== deck || moved) this.buildPlot(i);
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
      const want = Math.max(0, Math.min(c.s.survivors - c.gatherers, 36));
      while (this.villagers.length < want) {
        const a = Math.random() * 6.28, d = 3 + Math.random() * 4.5;
        this.villagers.push({ x: Math.sin(a) * d, z: Math.cos(a) * d, yaw: 0, path: [], spoke: -1, wait: Math.random() * 2, speed: 1.3 + Math.random() * 0.5, phase: Math.random() * 10, mesh: Math.floor(Math.random() * COATS.length), look: randomLook(), ph: 0, amp: 0 });
      }
      this.villagers.length = want;
      const polar = (a, r) => [Math.sin(a) * r, Math.cos(a) * r];
      const spokeA = (i) => plotAngle(i);
      this.villagers.forEach((v, idx) => {
        v.sick = idx < c.s.sick;
        if (!v.path.length) {
          v.bob = 0;
          v.amp = Math.max(0, v.amp - dt * 4);
          v.wait -= dt;
          if (v.wait > 0) return;
          if (v.spoke >= 0) v.path.push(polar(spokeA(v.spoke), 8));
          let target = -1;
          if (c.freeboard >= 0 && Math.random() < 0.6) {
            const built = [];
            for (let i = 1; i < RING3; i++) if (c.s.plots[i].type >= 0) built.push(i);
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
        if (d < 0.25) {
          v.path.shift();
          if (!v.path.length) v.wait = 1.5 + Math.random() * 3.5;
          return;
        }
        const sp = v.speed * (v.sick ? 0.45 : 1) * (c.storm ? 0.7 : 1);
        v.x += dx / d * sp * dt;
        v.z += dz / d * sp * dt;
        v.ph += sp * dt * Math.PI * 2 / STRIDE;
        v.amp = Math.min(Math.min(1, sp / 1.6), v.amp + dt * 4);
        const fr = Math.hypot(v.x, v.z);
        if (v.spoke < 0 && fr < 2.3 && fr > 1e-3) {
          v.x *= 2.3 / fr;
          v.z *= 2.3 / fr;
        }
        const want2 = Math.atan2(dx, dz);
        let diff = want2 - v.yaw;
        while (diff > Math.PI) diff -= 6.283;
        while (diff < -Math.PI) diff += 6.283;
        v.yaw += diff * Math.min(1, dt * 8);
        v.bob = 0;
      });
    }
    /// Wachen mit Fackeln (nachts), exerzierende Krieger vor der Kaserne, ausrückende Trupps
    life(draws, deck, day) {
      const c = this.c, t = this.time, NC = COATS.length + 1;
      const uniform = (k, i) => ({ coat: NC + k, hat: i % 2, skin: i % 3 === 2 ? 1 : 0, tr: 2 });
      if (day < 0.35) {
        const R = wallRadius() - 2.2;
        for (let g = 0; g < 2; g++) {
          const a = t * 0.05 + g * Math.PI, x = Math.sin(a) * R, z = Math.cos(a) * R, y = this.groundAt(x, z);
          const yaw = (a + Math.PI / 2) / D2R;
          this.person(draws, uniform(1, g), [x, y, z], yaw, t * 0.05 * R * 2 * Math.PI / STRIDE, 0.8, "walk", false, false, g * 3);
          draws.push({ mesh: this.torchMesh, model: trs([x + Math.cos(a) * 0.35, y + 1.25 + Math.sin(t * 9 + g) * 0.02, z - Math.sin(a) * 0.35]), emis: 0.9 + 0.3 * noise1(t * 6 + g), noShadow: true });
        }
      }
      const ki = c.s.plots.findIndex((p) => p.type === T.KASERNE && p.level > 0);
      const home = c.s.troops, n = Math.min(12, uSum(home));
      if (ki > 0 && n > 0 && day >= 0.25) {
        const pp = plotPos(ki), q = [pp[0] * 0.55, pp[2] * 0.55], yaw = Math.atan2(pp[0] - q[0], pp[2] - q[1]) / D2R;
        const fx = Math.cos(yaw * D2R), fz = -Math.sin(yaw * D2R), tot = uSum(home);
        let k = 0, unit = 0, acc = 0;
        for (let i = 0; i < n; i++) {
          while (unit < 4 && (i + 0.5) / n > (acc + home[unit]) / tot) {
            acc += home[unit];
            unit++;
          }
          const col = i % 4, row = Math.floor(i / 4), ox = (col - 1.5) * 1.15, oz = -row * 1.25;
          const fw = [Math.sin(yaw * D2R), Math.cos(yaw * D2R)];
          const x = q[0] + fx * ox + fw[0] * oz, z = q[1] + fz * ox + fw[1] * oz;
          const drill = Math.floor(t / 6) % 3;
          this.person(draws, uniform(unit, i), [x, deck, z], yaw, t * 5.2, drill === 0 ? 0.55 : 0, drill === 2 ? "work" : "walk", false, false, i);
          k++;
        }
      }
      const o = c.online, list = o && o.active ? (o.marches || []).filter((m) => m.status === "out" && m.kind !== "scout") : c.s.marches.filter((m) => m.phase === "out" && m.kind !== "scout");
      for (const m of c.s.botMarches || []) if (m.phase === "out") list.push(m);
      for (const m of list) {
        const key = m.id !== void 0 ? "o" + m.id : m;
        if (this.seenMarch.has(key)) continue;
        this.seenMarch.add(key);
        if (!this.marchInit) continue;
        const u = m.u || [0, 0, 0, 0, 0], cnt = Math.min(10, uSum(u));
        let unit = 0;
        for (let i = 0; i < cnt; i++) {
          while (unit < 4 && u[unit] <= Math.floor(i * uSum(u) / cnt) - u.slice(0, unit).reduce((a, b) => a + b, 0)) unit++;
          this.columns.push({ d: -i * 1.4, look: uniform(unit, i), ph: Math.random() * 6 });
        }
      }
      this.marchInit = true;
      if (this.columns.length) {
        const kp = ki > 0 ? plotPos(ki) : [0, 0, -8], R = wallRadius();
        const path = [[kp[0] * 0.8, kp[2] * 0.8], [0, -R + 1], [0, -R - 16]];
        const L1 = Math.hypot(path[1][0] - path[0][0], path[1][1] - path[0][1]), L2 = 17;
        const dt = this.dtNow;
        for (let i = this.columns.length - 1; i >= 0; i--) {
          const s2 = this.columns[i];
          s2.d += dt * 2.3;
          s2.ph += dt * 2.3 * Math.PI * 2 / STRIDE;
          if (s2.d > L1 + L2) {
            this.columns.splice(i, 1);
            continue;
          }
          if (s2.d < 0) continue;
          const seg = s2.d < L1 ? 0 : 1, f = seg === 0 ? s2.d / L1 : (s2.d - L1) / L2, A = path[seg], Bp = path[seg + 1];
          const x = A[0] + (Bp[0] - A[0]) * f, z = A[1] + (Bp[1] - A[1]) * f, yaw = Math.atan2(Bp[0] - A[0], Bp[1] - A[1]) / D2R;
          this.person(draws, s2.look, [x, this.groundAt(x, z), z], yaw, s2.ph, 1, "walk", false, false, i);
        }
      }
    }
    /// Mensch mit natürlichem Gang: Hüfte, Knie, Schultern, Ellbogen; Becken hebt/senkt sich, Arme gegengleich
    person(draws, look, pos, yaw, ph, amp, mode, sick, basket2, seed) {
      const S = 0.86, t = this.time + seed;
      if (this.dist > (this.figureLod || 115)) {
        draws.push({ mesh: sick ? this.sickMesh : this.villagerMeshes[look.coat % this.villagerMeshes.length], model: trs(pos, [0, yaw, 0], [0.9, 0.9, 0.9]) });
        return;
      }
      const ci = sick ? COATS.length : look.coat, P = this.P;
      if (sick) amp *= 0.6;
      const work = mode === "work";
      let lean = 2 + 4 * amp + (sick ? 12 : 0), roll = 2.2 * amp * Math.sin(ph), bob = 0.045 * amp * (Math.cos(2 * ph) - 1);
      let twist = 5 * amp * Math.sin(ph);
      if (work) {
        const w = Math.sin(t * 4.2);
        lean = 40 + 8 * w;
        bob = -0.165;
        roll = 0;
        twist = 0;
      }
      const breathe = 1 + 0.012 * Math.sin(t * 1.7);
      const root = trs([pos[0], pos[1] + bob * S, pos[2]], [0, yaw, roll], [S, S, S]);
      const upper = mul(root, trs([0, 0.9, 0], [lean, twist, 0], [1, breathe, 1]));
      const torsoM = mul(upper, trs([0, -0.9, 0]));
      draws.push({ mesh: P.torsoMesh(ci, look.hat, look.skin, look.tr), model: torsoM });
      if (basket2) draws.push({ mesh: P.basket, model: torsoM });
      for (const side of [-1, 1]) {
        const ps = ph + (side > 0 ? 0 : Math.PI), sn = Math.sin(ps), cs = Math.cos(ps);
        let thighA = -sn * 27 * amp, knee = amp * (4 + 52 * Math.pow(Math.max(0, cs), 1.4));
        if (work) {
          thighA = -42;
          knee = 74;
        }
        const thigh = mul(root, trs([side * 0.095, 0.9, 0], [thighA, 0, side * 2]));
        draws.push({ mesh: P.thigh[look.tr], model: thigh });
        draws.push({ mesh: P.shin[look.tr], model: mul(thigh, trs([0, -0.44, 0], [knee, 0, 0])) });
        let armA = sn * 21 * amp + 3 + 1.5 * Math.sin(t * 1.3 + side), elbow = -(9 + 26 * amp * Math.max(0, -sn));
        if (work) {
          const w = Math.sin(t * 4.2 + (side > 0 ? 0 : 0.5));
          armA = -62 - 34 * w;
          elbow = -28 - 16 * w;
        }
        if (basket2 && !work) {
          armA = sn * 12 * amp - 8;
          elbow = -34;
        }
        const shoulder = mul(upper, trs([side * 0.215, 0.5, -0.01], [armA, 0, side * (5 + 2 * amp)]));
        draws.push({ mesh: P.uarm[ci], model: shoulder, noShadow: true });
        draws.push({ mesh: P.farm[ci][look.skin], model: mul(shoulder, trs([0, -0.29, 0], [elbow, 0, 0])), noShadow: true });
      }
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
        if (p.life >= p.max) {
          P.splice(i, 1);
          continue;
        }
        p.x += (p.vx + wind) * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const t = p.life / p.max;
        const a = (t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8) * 0.5;
        const o = n * 5;
        this.smoke[o] = p.x;
        this.smoke[o + 1] = p.y;
        this.smoke[o + 2] = p.z;
        this.smoke[o + 3] = p.size * (0.6 + 1.8 * t) * 2;
        this.smoke[o + 4] = a;
        n++;
      }
      this.smokeCount = n;
    }
    updateRain(dt) {
      const c = this.c;
      const night = c.s.dayTime < 0.25 || c.s.dayTime > 0.75 ? 0.12 : 0;
      const amount2 = Math.max(night, this.stormBlend);
      const want = Math.floor(this.rainMax * amount2 * Math.min(1, this.particleMul));
      const D = this.drops, T2 = this.target;
      const wind = lerp(1, 12, this.stormBlend);
      while (D.length < want) D.push({ x: T2[0] + (Math.random() - 0.5) * 90, y: T2[1] + Math.random() * 30, z: T2[2] + (Math.random() - 0.5) * 90 });
      D.length = Math.min(D.length, want);
      let n = 0;
      const len2 = 0.06;
      for (const d of D) {
        d.y -= 18 * dt;
        d.x += wind * dt;
        if (d.y < Math.max(c.water, 0) || Math.abs(d.x - T2[0]) > 45) {
          d.x = T2[0] + (Math.random() - 0.5) * 90;
          d.z = T2[2] + (Math.random() - 0.5) * 90;
          d.y = T2[1] + 24 + Math.random() * 6;
        }
        const o = n * 8;
        this.rain[o] = d.x;
        this.rain[o + 1] = d.y;
        this.rain[o + 2] = d.z;
        this.rain[o + 3] = 0;
        this.rain[o + 4] = d.x - wind * len2;
        this.rain[o + 5] = d.y + 18 * len2;
        this.rain[o + 6] = d.z;
        this.rain[o + 7] = 0.5;
        n++;
      }
      this.rainCount = n;
    }
    /// Bodenhöhe für Fußgänger (Plattform, Warft, Böschung, Watt)
    groundAt(x, z) {
      const c = this.c, r = Math.hypot(x, z), deck = c.deck, A = AREA.r;
      if (r < 9.5) return deck;
      if (r < A + 5) return deck - 0.9;
      if (r < A + 16) return lerp(deck - 0.9, 0, (r - (A + 5)) / 11);
      return 0;
    }
    // ---------------- Kamera ----------------
    camera(aspect) {
      const t = (this.dist - this.minDist) / (this.maxDist - this.minDist);
      const pitch = clamp(lerp(36, 58, clamp01(t)) + (this.tilt || 0), 14, 82) * D2R, yaw = (this.yaw || 0) * D2R;
      const fwd = [Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
      const pos = [this.target[0] - fwd[0] * this.dist, this.target[1] - fwd[1] * this.dist, this.target[2] - fwd[2] * this.dist];
      const fov = (aspect < 1 ? 55 : 42) * D2R;
      const view = lookAt(pos, this.target);
      const proj = perspective(fov, aspect, 0.5, 900);
      this.cam = { pos, view, proj, fov, fwd, vp: mul(proj, view) };
      return this.cam;
    }
    pan(dx, dy, viewH) {
      const k = this.dist / viewH * 1.6, y = (this.yaw || 0) * D2R, c = Math.cos(y), sn = Math.sin(y);
      this.target[0] += (dx * c + dy * sn) * k;
      this.target[2] += (-dx * sn + dy * c) * k;
      const r = Math.hypot(this.target[0], this.target[2]);
      if (r > 75) {
        this.target[0] *= 75 / r;
        this.target[2] *= 75 / r;
      }
    }
    /// Ein Finger nach kurzem Halten: links/rechts dreht, hoch/runter neigt
    rotate(dx, dy, viewH) {
      this.yaw = ((this.yaw || 0) - dx / viewH * 200) % 360;
      this.tilt = clamp((this.tilt || 0) + dy / viewH * 70, -22, 24);
    }
    zoom(f) {
      this.dist = clamp(this.dist * f, this.minDist, this.maxDist);
    }
    /// Bildschirmpunkt (NDC) → Bauplatz-Index oder -1
    pick(nx, ny) {
      if (!this.cam) return -1;
      const inv = invert(this.cam.vp);
      const un = (z) => {
        const v = [nx, ny, z, 1];
        const o = [0, 0, 0, 0];
        for (let r = 0; r < 4; r++) o[r] = inv[r] * v[0] + inv[4 + r] * v[1] + inv[8 + r] * v[2] + inv[12 + r] * v[3];
        return [o[0] / o[3], o[1] / o[3], o[2] / o[3]];
      };
      const a = un(-1), b = un(1);
      const deck = this.c.deck;
      const dir = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      for (let s2 = 0; s2 <= 1; s2 += 2e-3) {
        const p = [a[0] + dir[0] * s2, a[1] + dir[1] * s2, a[2] + dir[2] * s2];
        if (p[1] < deck) break;
        if (p[1] < deck + 15 && Math.hypot(p[0], p[2]) < 2.2) return 0;
      }
      if (Math.abs(dir[1]) < 1e-6) return -1;
      const s = (deck - a[1]) / dir[1];
      const hx = a[0] + dir[0] * s, hz = a[2] + dir[2] * s;
      const hr = Math.hypot(hx, hz);
      if (hr < 9.8) return 0;
      {
        const s0 = (0.3 - a[1]) / dir[1], gx = a[0] + dir[0] * s0, gz = a[2] + dir[2] * s0;
        for (const t of this.c.s.obst || []) if (Math.hypot(gx - t.x, gz - t.z) < 3.5) return -4e3 - t.id;
        for (const t of this.c.s.treasures || []) if (Math.hypot(gx - t.x, gz - t.z) < 4) return -3e3 - t.id;
        for (const n of this.c.s.nodes) if (Math.hypot(gx - n.x, gz - n.z) < 4.5) return -1e3 - n.id;
      }
      for (let i = 1; i < PLOTS; i++) {
        const p = plotPos(i), yaw = plotYaw(i) * D2R;
        const lx0 = hx - p[0], lz0 = hz - p[2];
        const lx = Math.cos(yaw) * lx0 - Math.sin(yaw) * lz0, lz = Math.sin(yaw) * lx0 + Math.cos(yaw) * lz0;
        if (Math.abs(lx) < 4.4 && Math.abs(lz) < 4.4) return i;
      }
      if (Math.abs(hr - wallRadius()) < 3.5) return WALL;
      if (this.c.s.plots[DAMM].type >= 0 && Math.abs(hr - damRadius()) < 6) return DAMM;
      return -1;
    }
    screenPos(p, w, h2) {
      const q = project(this.cam.vp, p);
      if (q[2] <= 0) return null;
      return [(q[0] * 0.5 + 0.5) * w, (1 - (q[1] * 0.5 + 0.5)) * h2, q[2]];
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
      const sunCol = mulC(lerpC([0.45, 0.55, 0.9], [1, 0.93, 0.82], day), lerp(0.18, 1.25, day) * gloom);
      let fog = lerpC([0.07, 0.09, 0.15], [0.72, 0.78, 0.84], day);
      fog = lerpC(fog, mulC([0.45, 0.5, 0.55], lerp(0.3, 1, day)), sb);
      const zenith = lerpC(lerpC([0.02, 0.03, 0.08], [0.32, 0.52, 0.78], day), mulC([0.35, 0.38, 0.42], lerp(0.25, 1, day)), sb);
      const horizon = lerpC(lerpC([0.08, 0.1, 0.17], [0.78, 0.83, 0.88], day), fog, sb);
      const winter = season().idx === 3;
      this.snow = lerp(this.snow || 0, winter ? 0.85 : 0, 0.02);
      const waterDeep = lerpC([0.01, 0.03, 0.08], winter ? [0.06, 0.18, 0.3] : [0.02, 0.17, 0.38], day);
      const waterShallow = lerpC([0.02, 0.06, 0.1], [0.08, 0.5, 0.58], day);
      const burn = c.beaconBurning;
      const flick = noise1(this.time * 2.5);
      this.lampI = lerp(this.lampI || 0, burn ? 1.6 + flick : 0, 0.1);
      const draws = [];
      draws.push({ mesh: this.envMesh });
      draws.push({ mesh: this.infraMesh });
      if (this.wallMesh) draws.push({ mesh: this.wallMesh });
      if (this.damMesh) draws.push({ mesh: this.damMesh });
      const glow = 0.35 + 1.5 * (1 - day);
      for (const m of this.plotMesh) if (m) draws.push({ mesh: m, emis: glow });
      if (this.lanternMesh) draws.push({ mesh: this.lanternMesh, emis: burn ? 0.8 + flick * 0.6 : 0.02, noShadow: true });
      const deck = c.deck;
      c.s.plots.forEach((p, i) => {
        if (p.buildLeft > 0 && p.level === 0) {
          const prog = 1 - p.buildLeft / Math.max(0.01, p.buildTotal);
          const pp = plotPos(i);
          draws.push({ mesh: this.ghostMesh, model: trs([pp[0], deck, pp[2]], [0, plotYaw(i), 0], [3.9, Math.max(0.05, prog * 2.6), 3.9]) });
        }
      });
      const c2 = this.c;
      for (const n of c2.s.nodes) {
        const f = 0.55 + 0.45 * Math.min(1, n.amount / Math.max(1, n.max));
        draws.push({ mesh: this.nodeMeshes[n.type], model: trs([n.x, n.h > 0.3 ? n.h - 0.35 : 0, n.z], [0, n.id * 47, 0], [f, f, f]), tint: c2.nodeFlooded(n) ? [0.6, 0.7, 0.8] : void 0 });
        if (this.selected === -1e3 - n.id) draws.push({ mesh: this.ringMesh, model: trs([n.x, Math.max(n.h - 0.2, wyNow(c2)) + 0.05, n.z], null, [6, 1, 6]), emis: 0.6 + 0.4 * Math.sin(this.time * 4), noShadow: true });
      }
      const pathCache = {};
      for (const g of c2.s.gath) {
        const n = c2.nodeById(g.node);
        let path = n ? pathCache[n.id] || (pathCache[n.id] = c2.gatherPath(n)) : this.gPaths.get(g);
        if (!path) continue;
        this.gPaths.set(g, path);
        const [x, z, yaw0] = c2.pathPoint(path, g.d);
        let y = this.groundAt(x, z);
        if (n && path.L - g.d < 5) y = lerp(y, n.h > 0.3 ? n.h - 0.1 : 0, 1 - (path.L - g.d) / 5);
        const yaw = (g.phase === "back" ? yaw0 + Math.PI : yaw0) / D2R;
        let st = this.gState.get(g);
        if (!st) {
          st = { d: g.d, ph: Math.random() * 6, amp: 0, look: randomLook() };
          this.gState.set(g, st);
        }
        const moved = Math.abs(g.d - st.d);
        st.d = g.d;
        if (moved < 1) st.ph += moved * Math.PI * 2 / STRIDE;
        const walking = g.phase !== "work" && moved > 5e-4;
        st.amp = walking ? Math.min(1, st.amp + this.dtNow * 4) : Math.max(0, st.amp - this.dtNow * 4);
        this.person(draws, st.look, [x, y, z], yaw, st.ph, st.amp, g.phase === "work" ? "work" : "walk", false, g.load > 0 || g.phase === "work", g.d * 7.3);
      }
      for (const tr of c2.s.treasures || []) {
        const y = this.groundAt(tr.x, tr.z), p = 0.6 + 0.4 * Math.sin(this.time * 5 + tr.id);
        draws.push({ mesh: this.chestMesh, model: trs([tr.x, y + 0.1, tr.z], [0, this.time * 40 + tr.id * 50, 0], [1.4, 1.4, 1.4]), emis: p, noShadow: true });
      }
      for (const ob of c2.s.obst || []) {
        const y = this.groundAt(ob.x, ob.z), cl = c2.s.clearing && c2.s.clearing.id === ob.id ? c2.s.clearing : null;
        const k = cl ? 0.35 + 0.65 * Math.max(0, cl.left / cl.total) : 1, sel = this.selected === -4e3 - ob.id;
        const sc = ob.kind === 1 ? [0.5 * k, 0.5 * k, 0.5 * k] : [k, k, k];
        draws.push({ mesh: this.obstMeshes[ob.kind], model: trs([ob.x, y - (ob.kind === 1 ? 0.5 : 0) + (cl ? Math.sin(this.time * 20) * 0.03 : 0), ob.z], ob.kind === 1 ? [0, ob.rot, 28] : [0, ob.rot, 0], sc) });
        if (sel || cl) draws.push({ mesh: this.ringMesh, model: trs([ob.x, y + 0.08, ob.z], null, [4.5, 1, 4.5]), emis: 0.6 + 0.4 * Math.sin(this.time * 4), noShadow: true });
      }
      for (let k = 0; k < Math.min(6, c2.s.boats || 0); k++) {
        const x = (k % 2 ? 1 : -1) * (5 + Math.floor(k / 2) * 4.5), z = -(wallRadius() + 7);
        draws.push({ mesh: this.shipMesh, model: trs([x, wyNow(c2) + Math.sin(this.time + k) * 0.08, z], [Math.sin(this.time * 0.8 + k) * 1.5, 90, 0], [0.45, 0.45, 0.45]) });
      }
      if (c2.s.trader && c2.s.trader.left > 0) {
        const zr = -(damRadius() + 12), arrive = Math.min(1, (150 - c2.s.trader.left) / 8), leave = Math.min(1, c2.s.trader.left / 8);
        const off = (1 - Math.min(arrive, leave)) * 40;
        draws.push({ mesh: this.shipMesh, model: trs([12 + off, wyNow(c2) + Math.sin(this.time * 1.3) * 0.12, zr], [Math.sin(this.time * 0.9) * 2, 0, Math.sin(this.time * 1.1) * 2.5], [1, 1, 1]) });
      }
      const awake = day < 0.25 ? Math.ceil(this.villagers.length * 0.3) : this.villagers.length;
      this.villagers.forEach((v, k) => {
        if (k < awake) this.person(draws, v.look, [v.x, deck, v.z], v.yaw / D2R, v.ph, v.amp, "walk", v.sick, false, v.phase);
      });
      this.life(draws, deck, day);
      for (const g of this.gulls) {
        const p = [Math.cos(g.angle) * g.radius, deck + g.height + Math.sin(g.angle * 3) * 1.5, Math.sin(g.angle) * g.radius];
        const yaw = Math.atan2(-Math.sin(g.angle) * Math.sign(g.speed), Math.cos(g.angle) * Math.sign(g.speed)) / D2R;
        const body = trs(p, [0, yaw, -20 * Math.sign(g.speed)], [1, 1, 1]);
        const w = Math.sin((this.time + g.flap) * 7) * 28;
        draws.push({ mesh: this.gullBody, model: body, noShadow: true });
        draws.push({ mesh: this.gullWingL, model: mul(body, trs(null, [0, 0, w], null)), noShadow: true });
        draws.push({ mesh: this.gullWingR, model: mul(body, trs(null, [0, 0, -w], null)), noShadow: true });
      }
      const wy = c.inWater + Math.sin(this.time * 0.9) * 0.05;
      this.buoys.forEach((b, i) => {
        const tilt = 6 + 14 * sb;
        const m = trs([b.x, Math.max(0, wy) - 0.2 + Math.sin(this.time * 1.5 + i) * 0.1, b.z], [Math.sin(this.time * 1.2 + i) * tilt, 0, Math.cos(this.time + i) * tilt], [1, 1, 1]);
        draws.push({ mesh: b.red ? this.buoyRed : this.buoyGreen, model: m });
      });
      if (this.selected >= 0) {
        const s = this.selected, half = s === 0 ? 9.7 : s === WALL ? 6 : 4.15, pp = plotPos(s), yaw = plotYaw(s);
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
        view: cam.view,
        proj: cam.proj,
        camPos: cam.pos,
        fov: cam.fov,
        time: this.time,
        sunDir,
        sunCol,
        ambSky: mulC(lerpC([0.1, 0.12, 0.22], [0.62, 0.7, 0.8], day), gloom),
        ambGround: mulC(lerpC([0.05, 0.05, 0.08], [0.4, 0.38, 0.33], day), gloom),
        fogCol: fog,
        fogDen: lerp(45e-4, 0.022, sb),
        zenith,
        horizon,
        cloud: sb,
        night: 1 - day,
        snow: this.snow,
        cloudCol: lerpC(lerpC([0.12, 0.13, 0.18], [0.95, 0.95, 0.97], day), mulC([0.4, 0.42, 0.46], lerp(0.3, 1, day)), sb),
        plPos: this.lampPos || [0, 15, 0],
        plCol,
        plRange: 38 + 4 * c.towerLevel,
        draws,
        waterY: wy,
        waterDeep: lerpC(waterDeep, [0.12, 0.17, 0.2], sb * 0.6),
        waterShallow: lerpC(waterShallow, [0.2, 0.26, 0.28], sb * 0.6),
        storm: sb,
        smoke: this.smoke,
        smokeCount: this.smokeCount,
        smokeCol: mulC(lerpC([0.25, 0.27, 0.32], [0.82, 0.82, 0.85], day), 1),
        rain: this.rain,
        rainCount: this.rainCount,
        beams,
        shadowSize: day > 0.05 ? this.shadowSize : 0,
        shadowCenter: [this.target[0], deck, this.target[2]],
        shadowRadius: 60 + this.dist * 0.3
      };
    }
  };

  // src/gfx.js
  var TIERS = ["Niedrig", "Mittel", "Hoch", "Ultra"];
  var SCALE = [1, 1, 1, 1.25];
  var MAXDPR = [1, 1.5, 2, 4];
  var SHADOW = [0, 1024, 2048, 2048];
  var PARTICLES = [0.35, 0.65, 1, 1.5];
  var MAX_SIDE = 7680;
  var Graphics = class {
    constructor(world, maxTex) {
      this.world = world;
      this.maxTex = maxTex || 4096;
      this.auto = localStorage.getItem("gfx_auto") !== "0";
      const stored = +localStorage.getItem("gfx_tier");
      this.tier = this.auto || isNaN(stored) ? this.detect() : Math.max(0, Math.min(3, stored));
      this.fps = 60;
      this.fpsShown = 60;
      this.low = 0;
      this.t = 0;
      this.res = [0, 0];
      this.apply();
    }
    detect() {
      const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
      const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
      if (!mobile) return 3;
      if (mem >= 6 && cores >= 8) return 2;
      if (mem >= 4) return 1;
      return 0;
    }
    apply() {
      this.world.shadowSize = Math.min(SHADOW[this.tier], this.maxTex);
      this.world.particleMul = PARTICLES[this.tier];
      this.world.figureLod = [50, 80, 115, 150][this.tier];
      this.low = 0;
    }
    cycle() {
      if (this.auto) {
        this.auto = false;
        this.tier = 0;
      } else if (this.tier === 3) {
        this.auto = true;
        this.tier = this.detect();
      } else this.tier++;
      localStorage.setItem("gfx_auto", this.auto ? "1" : "0");
      localStorage.setItem("gfx_tier", String(this.tier));
      this.apply();
    }
    /// Zielauflösung des Bildes in Pixeln
    size(cssW, cssH) {
      const dpr = window.devicePixelRatio || 1;
      const d = Math.min(dpr, MAXDPR[this.tier]) * SCALE[this.tier];
      let w = cssW * d, h2 = cssH * d;
      const cap = MAX_SIDE / Math.max(w, h2);
      if (cap < 1) {
        w *= cap;
        h2 *= cap;
      }
      this.res = [Math.max(1, Math.round(w)), Math.max(1, Math.round(h2))];
      return this.res;
    }
    update(dt, colony) {
      this.t += dt;
      this.fps += (1 / Math.max(dt, 1e-3) - this.fps) * 0.05;
      if (Math.floor(this.t * 2) !== Math.floor((this.t - dt) * 2)) this.fpsShown = this.fps;
      if (!this.auto || this.t < 8) return;
      if (this.fps < 40) this.low += dt;
      else this.low = 0;
      if (this.fps > 57) this.high = (this.high || 0) + dt;
      else this.high = 0;
      if (this.low > 4 && this.tier > 0) {
        this.tier--;
        this.ceiling = this.tier;
        this.apply();
        colony.msg(`Grafik automatisch angepasst: ${TIERS[this.tier]}`);
      } else if (this.high > 12 && this.tier < 2 && (this.ceiling === void 0 || this.tier < this.ceiling)) {
        this.tier++;
        this.high = 0;
        this.apply();
      }
    }
  };

  // src/map.js
  function blob(ctx, x, y, r, seed, fill, stroke) {
    ctx.beginPath();
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const a = i / n * Math.PI * 2;
      const k = 0.75 + 0.25 * Math.sin(a * 3 + seed) * Math.cos(a * 2 + seed * 0.7);
      const px = x + Math.cos(a) * r * k, py = y + Math.sin(a) * r * k * 0.8;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  var SeaMap = class {
    constructor(canvas, colony, online) {
      this.cv = canvas;
      this.ctx = canvas.getContext("2d");
      this.c = colony;
      this.o = online;
      this.t = 0;
      this.ox = 0;
      this.oy = 0;
    }
    drag(dx, dy) {
      const lim = this.u * (this.isOnline ? 14 : 3.2);
      this.ox = Math.max(-lim, Math.min(lim, this.ox + dx));
      this.oy = Math.max(-lim, Math.min(lim, this.oy + dy));
    }
    get isOnline() {
      return !!(this.o && this.o.world && this.o.me);
    }
    layout() {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = this.cv.clientWidth, h2 = this.cv.clientHeight;
      if (this.cv.width !== Math.round(w * dpr) || this.cv.height !== Math.round(h2 * dpr)) {
        this.cv.width = Math.round(w * dpr);
        this.cv.height = Math.round(h2 * dpr);
      }
      this.dpr = dpr;
      this.w = w;
      this.h = h2;
      this.u = Math.min(w, h2) / (this.isOnline ? 7.5 : 5.6);
      this.cx = w / 2 + this.ox;
      this.cy = h2 * 0.42 + this.oy;
      this.home = this.isOnline ? [this.o.me.x, this.o.me.y] : [0, 0];
    }
    pos(x, y) {
      return [this.cx + (x - this.home[0]) * this.u, this.cy + (y - this.home[1]) * this.u];
    }
    /// Alles Anklickbare: { type: 'terr'|'player', id, x, y }
    items() {
      const ex = this.isOnline && this.o.boss ? [{ type: "boss", id: 1, x: 3.5, y: -3.5 }] : [];
      const bots = (this.c.s.bots || []).map((b) => ({ type: "bot", id: b.id, x: this.home[0] + b.dx, y: this.home[1] + b.dy }));
      return this.items0().concat(bots, ex);
    }
    items0() {
      if (this.isOnline) {
        const w = this.o.world;
        return [...w.territories.map((t) => ({ ...t, type: "terr" })), ...w.players.filter((p) => p.id !== this.o.me.id).map((p) => ({ ...p, type: "player" })), ...(w.fields || []).map((f) => ({ ...f, type: "field" }))];
      }
      return this.c.s.terr.map((t) => ({ ...t, type: "terr" }));
    }
    pick(x, y) {
      let best = null, bd = 1e9;
      for (const it of this.items()) {
        const [px, py] = this.pos(it.x, it.y);
        const d = Math.hypot(px - x, py - y);
        if (d < bd) {
          bd = d;
          best = it;
        }
      }
      return best && bd < this.u * 0.45 ? { type: best.type, id: best.id } : null;
    }
    draw(dt, sel) {
      this.t += dt;
      this.layout();
      const ctx = this.ctx, { w, h: h2, u } = this;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const [hx, hy] = this.pos(this.home[0], this.home[1]);
      const g = ctx.createRadialGradient(hx, hy, u * 0.3, hx, hy, Math.max(w, h2) * 0.9);
      g.addColorStop(0, "#1d6f9a");
      g.addColorStop(0.55, "#0f4c78");
      g.addColorStop(1, "#082a48");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h2);
      ctx.strokeStyle = "rgba(160,215,240,0.12)";
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 26; k++) {
        const y = (k * 53 + this.t * 6) % (h2 + 40) - 20;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.03 + k + this.t * 0.8) * 3);
        ctx.stroke();
      }
      if (this.isOnline) this.drawOnline(sel);
      else this.drawOffline(sel);
      this.drawBots(sel);
      if (this.isOnline && this.o.boss) this.drawBoss(sel);
    }
    drawBoss(sel) {
      const ctx = this.ctx, u = this.u, b = this.o.boss, [x, y] = this.pos(3.5, -3.5), t = this.t;
      if (sel && sel.type === "boss") {
        ctx.fillStyle = "rgba(255,90,90,0.25)";
        ctx.beginPath();
        ctx.arc(x, y, u * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(160,40,120,0.5)";
      ctx.lineWidth = 3;
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3 + Math.sin(t + k) * 0.3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(a) * u * 0.35, y + Math.sin(a) * u * 0.35 + Math.sin(t * 2 + k) * 6, x + Math.cos(a + 0.4) * u * 0.6, y + Math.sin(a + 0.4) * u * 0.6);
        ctx.stroke();
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.round(u * 0.6)}px system-ui`;
      ctx.fillText("\u{1F419}", x, y + Math.sin(t * 1.3) * 3);
      const w = u * 0.9;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(x - w / 2, y + u * 0.38, w, 7);
      ctx.fillStyle = "#ff5a5a";
      ctx.fillRect(x - w / 2, y + u * 0.38, w * b.hp / b.maxhp, 7);
      this.label(x, y + u * 0.45, `Riesenkrake Stufe ${b.level}`, "#ffb0e0");
    }
    /// Piratenschiffe (Bots) und Trupps dorthin
    drawBots(sel) {
      const ctx = this.ctx, u = this.u, s = this.c.s, [cx, cy] = this.pos(this.home[0], this.home[1]);
      for (const m of s.botMarches || []) {
        const [tx, ty] = this.pos(this.home[0] + m.bot.dx, this.home[1] + m.bot.dy), p = 1 - m.left / m.total;
        this.march(cx, cy, tx, ty, m.phase === "out" ? p : 1 - p, m.phase === "out" ? "rgba(255,200,90,0.85)" : "rgba(200,220,255,0.7)");
      }
      for (const b of s.bots || []) {
        const [x, y] = this.pos(this.home[0] + b.dx, this.home[1] + b.dy), bob = Math.sin(this.t * 1.6 + b.id) * 2;
        if (sel && sel.type === "bot" && sel.id === b.id) {
          ctx.fillStyle = "rgba(255,200,90,0.25)";
          ctx.beginPath();
          ctx.arc(x, y, u * 0.38, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(x, y + u * 0.1, u * 0.2, u * 0.05, 0, 0, Math.PI * 2);
        ctx.stroke();
        const k = u * 6e-3, yy = y + bob;
        ctx.fillStyle = "#5a3a22";
        ctx.beginPath();
        ctx.moveTo(x - 30 * k, yy);
        ctx.lineTo(x + 30 * k, yy);
        ctx.lineTo(x + 20 * k, yy + 13 * k);
        ctx.lineTo(x - 22 * k, yy + 13 * k);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#3a2414";
        ctx.fillRect(x - 1.5 * k, yy - 40 * k, 3 * k, 40 * k);
        ctx.fillStyle = "#1b1b1f";
        ctx.beginPath();
        ctx.moveTo(x - 20 * k, yy - 36 * k);
        ctx.lineTo(x + 20 * k, yy - 34 * k);
        ctx.lineTo(x + 17 * k, yy - 8 * k);
        ctx.lineTo(x - 18 * k, yy - 6 * k);
        ctx.closePath();
        ctx.fill();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${Math.round(16 * k)}px system-ui`;
        ctx.fillStyle = "#fff";
        ctx.fillText("\u2620", x, yy - 21 * k);
        this.label(x, y + u * 0.1, `\u{1F3F4}\u200D\u2620\uFE0F Stufe ${b.level}`, b.level === s.botLevel ? "#ffd27a" : "#ffb0a0", b.name);
      }
    }
    label(x, y, text, color, sub2) {
      const ctx = this.ctx;
      ctx.font = "bold 12px system-ui";
      const tw = ctx.measureText(text).width + 10;
      ctx.fillStyle = "rgba(0,15,25,0.7)";
      ctx.fillRect(x - tw / 2, y, tw, 17);
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, y + 9);
      if (sub2) {
        ctx.font = "11px system-ui";
        ctx.fillStyle = "#cfe6ea";
        ctx.fillText(sub2, x, y + 26);
      }
    }
    island(t, x, y, r, selected, stroke, icon) {
      const ctx = this.ctx;
      if (selected) {
        ctx.fillStyle = "rgba(120,220,255,0.25)";
        ctx.beginPath();
        ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      blob(ctx, x, y, r * 1.2, t.seed % 100, "rgba(120,200,215,0.35)");
      blob(ctx, x, y, r, t.seed % 100, t.kind === "Riff" ? "#9a8f7f" : "#d9c79c", stroke || (selected ? "#7fd3f0" : null));
      if (t.kind === "Hallig") blob(ctx, x - r * 0.1, y - r * 0.1, r * 0.55, t.seed % 37, "#7fa35a");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.round(r * 0.75)}px system-ui`;
      ctx.fillText(icon, x, y - r * 0.05);
    }
    march(fromX, fromY, toX, toY, frac, color) {
      const ctx = this.ctx;
      ctx.strokeStyle = color;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -this.t * 20;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
      ctx.setLineDash([]);
      const bx = fromX + (toX - fromX) * frac, by = fromY + (toY - fromY) * frac;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    /// Rohstofffeld (online): Holz, Muscheln, Wasser, Altmetall – Stufe 1–5
    field(f, x, y, selected, myAlly) {
      const ctx = this.ctx, u = this.u, r = u * (0.13 + 0.02 * f.level);
      const col = ["#b98a52", "#e9d6b8", "#6fc3ef", "#9aa3ad"][f.kind - 1], ic = ["\u{1FAB5}", "\u{1F9AA}", "\u{1F4A7}", "\u2699\uFE0F"][f.kind - 1];
      if (selected) {
        ctx.fillStyle = "rgba(120,220,255,0.25)";
        ctx.beginPath();
        ctx.arc(x, y, r * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(0,20,30,0.35)";
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.5, r * 1.3, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      const occ = f.occ, mine = f.mine, ally = !mine && occ && myAlly && f.occ_ally === myAlly;
      ctx.strokeStyle = mine ? "#56e39a" : ally ? "#6fb6ff" : occ ? "#ff9a5a" : "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      const p = f.amount / Math.max(1, f.total);
      ctx.strokeStyle = "#ffe08a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.round(r * 1.2)}px system-ui`;
      ctx.fillText(ic, x, y);
      if (u > 50 || selected) this.label(x, y + r + 4, `Stufe ${f.level}`, mine ? "#8ef0b0" : occ ? "#ffc29a" : "#fff", occ ? "\u26CF " + occ : null);
    }
    city(x, y, name, color, mine, sub2, selected, shield) {
      const ctx = this.ctx, u = this.u;
      if (selected) {
        ctx.fillStyle = "rgba(120,220,255,0.25)";
        ctx.beginPath();
        ctx.arc(x, y, u * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      if (mine) {
        ctx.fillStyle = "rgba(255,215,120,0.18)";
        ctx.beginPath();
        ctx.arc(x, y, u * 0.34 + Math.sin(this.t * 2) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = mine ? "#8a6a44" : "#6d5a4a";
      ctx.beginPath();
      ctx.arc(x, y, u * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.round(u * 0.24)}px system-ui`;
      ctx.fillText(mine ? "\u{1F5FC}" : "\u{1F3F0}", x, y);
      if (shield) {
        ctx.font = `${Math.round(u * 0.16)}px system-ui`;
        ctx.fillText("\u{1F6E1}", x + u * 0.2, y - u * 0.18);
      }
      this.label(x, y + u * 0.26, name, color, sub2);
    }
    drawOffline(sel) {
      const ctx = this.ctx, u = this.u, [cx, cy] = this.pos(0, 0);
      ctx.setLineDash([4, 8]);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      for (let r = 1; r <= 3; r++) {
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.15 * u, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const m of this.c.s.marches) {
        const t = this.c.s.terr[m.target], [tx, ty] = this.pos(t.x, t.y), p = 1 - m.left / m.total;
        this.march(cx, cy, tx, ty, m.phase === "out" ? p : 1 - p, m.phase === "out" ? "rgba(255,120,90,0.8)" : "rgba(200,220,255,0.7)");
      }
      for (const t of this.c.s.terr) {
        const [x, y] = this.pos(t.x, t.y), r = u * (0.2 + t.ring * 0.03), mine = t.owner === 1;
        this.island(t, x, y, r, sel && sel.id === t.id, mine ? "#56e39a" : null, mine ? "\u{1F6A9}" : "\u2620");
        this.label(x, y + r * 0.85, t.name, mine ? "#8ef0b0" : "#fff", mine ? `+${t.pct}% ${RES[t.res]}` : `\u2620 ${Math.round(t.pirates)}`);
      }
      this.city(cx, cy, "Pfahlstadt", "#ffe9a8", true);
    }
    drawOnline(sel) {
      const o = this.o, me = o.me, wld = o.world, u = this.u;
      const myAlly = me.alliance_id;
      const now = o.serverNow();
      const [mx, my] = this.pos(me.x, me.y);
      for (const m of o.marches) {
        let tx, ty;
        if (m.field_id) {
          const f = (wld.fields || []).find((q) => q.id === m.field_id);
          if (!f) continue;
          [tx, ty] = this.pos(f.x, f.y);
          if (m.status === "gather") {
            this.march(mx, my, tx, ty, 1, "rgba(140,240,160,0.7)");
            continue;
          }
        } else if (m.target_player) {
          const p = wld.players.find((q) => q.id === m.target_player);
          if (!p) continue;
          [tx, ty] = this.pos(p.x, p.y);
        } else {
          const t = wld.territories.find((q) => q.id === m.target_terr);
          if (!t) continue;
          [tx, ty] = this.pos(t.x, t.y);
        }
        let frac;
        if (m.status === "out") {
          const a = Date.parse(m.depart), b = Date.parse(m.arrive);
          frac = Math.min(1, Math.max(0, (now - a) / Math.max(1, b - a)));
        } else {
          const b = Date.parse(m.back_at), a = b - Math.max(1, Date.parse(m.arrive) - Date.parse(m.depart));
          frac = 1 - Math.min(1, Math.max(0, (now - a) / Math.max(1, b - a)));
        }
        this.march(mx, my, tx, ty, frac, m.status === "out" ? m.kind === "player" ? "rgba(255,90,90,0.85)" : "rgba(255,170,90,0.8)" : "rgba(200,220,255,0.7)");
      }
      for (const f of wld.fields || []) {
        const [x, y] = this.pos(f.x, f.y);
        if (x < -60 || y < -60 || x > this.w + 60 || y > this.h + 60) continue;
        this.field(f, x, y, sel && sel.type === "field" && sel.id === f.id, myAlly);
      }
      for (const t of wld.territories) {
        const [x, y] = this.pos(t.x, t.y);
        if (x < -80 || y < -80 || x > this.w + 80 || y > this.h + 80) continue;
        const lhT = t.kind === "Leuchtturm";
        const r = u * (lhT ? 0.45 : t.pct >= 30 ? 0.32 : t.pct >= 18 ? 0.27 : 0.23);
        const mine = t.owner === me.id, ally = !mine && t.owner && myAlly && t.owner_alliance === myAlly, enemy = t.owner && !mine && !ally;
        const col = mine ? "#56e39a" : ally ? "#6fb6ff" : enemy ? "#ff9a5a" : null;
        this.island(t, x, y, r, sel && sel.type === "terr" && sel.id === t.id, col || (lhT ? "#ffd27a" : null), lhT ? "\u{1F5FC}" : t.owner ? "\u{1F6A9}" : "\u2620");
        const sub2 = mine ? `+${t.pct}% ${RES[t.res]}` : t.owner ? `${t.owner_name}` : `\u2620 ${t.strength}`;
        this.label(x, y + r * 0.85, t.name, mine ? "#8ef0b0" : ally ? "#a8d4ff" : enemy ? "#ffc29a" : "#fff", sub2);
      }
      for (const p of wld.players) {
        if (p.id === me.id) continue;
        const [x, y] = this.pos(p.x, p.y);
        if (x < -80 || y < -80 || x > this.w + 80 || y > this.h + 80) continue;
        const ally = myAlly && p.alliance_id === myAlly;
        this.city(x, y, (p.tag ? `[${p.tag}] ` : "") + p.name, ally ? "#a8d4ff" : "#ffc29a", false, `\u2694 ${p.power}${p.online ? " \xB7 online" : ""}`, sel && sel.type === "player" && sel.id === p.id, p.shield);
      }
      this.city(mx, my, o.name || "Du", "#ffe9a8", true);
    }
  };

  // src/ui2.js
  var RES_IC = ["\u{1FAB5}", "\u{1F9AA}", "\u{1F4A7}", "\u2699\uFE0F"];
  var esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  var LEAGUES = [["\u{1F949}", "Bronze", 0], ["\u{1F948}", "Silber", 400], ["\u{1F947}", "Gold", 800], ["\u{1F48E}", "Kristall", 1200], ["\u{1F451}", "Meister", 1800], ["\u{1F3C6}", "Champion", 2600]];
  var ALLY_RES = {
    f_atk: ["\u2694\uFE0F Kriegskunst", "+2 % Angriff je Stufe"],
    f_def: ["\u{1F6E1}\uFE0F Bollwerk", "+2 % Verteidigung je Stufe"],
    f_gather: ["\u{1F9FA} Sammlergilde", "+5 % Sammeln je Stufe"],
    f_build: ["\u{1F528} Bauh\xFCtte", "\u22123 % Bauzeit je Stufe"],
    f_march: ["\u{1F9ED} Seewege", "\u22123 % Fahrzeit je Stufe"]
  };
  function installUI2(UI2) {
    const P = UI2.prototype;
    P.troopsHtml = function() {
      const tab = this.troopTab || "truppen";
      const tabs = [["truppen", "\u2694\uFE0F", "Truppen"], ["form", "\u{1F9F1}", "Aufstellung"], ["caps", "\u{1F396}\uFE0F", "Kapit\xE4ne"], ["arena", "\u{1F3DF}\uFE0F", "Arena"], ["reports", "\u{1F4DC}", "Berichte"], ["rank", "\u{1F3C6}", "Rang"]];
      const bar = `<div class="tabs" style="grid-template-columns:repeat(6,1fr)">${tabs.map(([k, ic, l]) => `<button class="tab ${k === tab ? "on" : ""}" data-a="ttab" data-t="${k}"><span>${ic}</span>${l}</button>`).join("")}</div>`;
      const strip = (x) => x.replace(/^<div class="ph">[\s\S]*?<\/button><\/div>/, "");
      const body = tab === "reports" ? strip(this.reportsHtml()) : tab === "rank" ? strip(this.rankHtml()) : tab === "caps" ? this.captainsHtml() + this.forgeHtml() : tab === "arena" ? this.arenaHtml() : tab === "form" ? this.formHtml() : this.troopsTabHtml();
      return this.head("Truppen") + bar + `<div class="tabbody">${body}</div>`;
    };
    const ttab0 = P.ttabLoad;
    P.ttabLoad = function() {
      ttab0.call(this);
      if (this.troopTab === "arena" && this.o.active) this.o.arenaList().then(() => this.panelKey = null);
    };
    P.formHtml = function() {
      const c = this.c, f = formOf(c), m = formMul(f), s = c.s;
      let out = `<div class="desc">Lege fest, wo deine Verteidiger stehen, wenn Piraten oder andere Spieler angreifen. Die Aufstellung gilt auch in der \u{1F3DF}\uFE0F Arena.</div>
      <div class="inf">Aufstellungs-Bonus: <b style="color:${m >= 1.1 ? "#8ef0a0" : m >= 1 ? "#ffd27a" : "#ff7a7a"}">${m >= 1 ? "+" : "\u2212"}${Math.round(Math.abs(m - 1) * 100)} %</b> auf die Kampfkraft deiner Verteidiger</div>`;
      out += '<div class="formgrid">' + [2, 1, 0].map((r) => `<div class="frow"><span class="fl">${ROW_IC[r]} ${ROWS[r]}</span>${UNITS.map((u, k) => f[k] === r ? `<span class="fu">${u.ic}<small>${s.troops[k]}</small></span>` : "").join("") || '<span class="sm">leer</span>'}</div>`).join("") + '<div class="frow gate">\u{1F3F0} Stadttor</div></div>';
      UNITS.forEach((u, k) => {
        out += `<div class="row"><div class="ri"><b>${u.ic} ${u.name}</b></div>${[0, 1, 2].map((r) => `<button class="btn sm2 ${f[k] === r ? "" : "ghost"}" data-a="formSet" data-u="${k}" data-r="${r}">${ROWS[r]}</button>`).join("")}</div>`;
      });
      out += '<div class="sub2">Schnellwahl</div><div class="btns">' + FORM_PRESETS.map((p, k) => `<button class="btn ghost" data-a="formPreset" data-k="${k}">${p.ic} ${p.name}</button>`).join("") + "</div>";
      out += `<div class="sm">${FORM_TIPS.join("<br>")}</div>`;
      return out;
    };
    P.forgeHtml = function() {
      const c = this.c, s = c.s, hired = CAPTAINS.filter((k) => capOf(c, k.id));
      let out = `<div class="sub2">\u2692\uFE0F Schmiede</div><div class="inf">\u{1F529} Schmiedeeisen: <b>${s.ore || 0}</b> \xB7 \u2699\uFE0F Altmetall: <b>${Math.floor(s.res[3])}</b></div>
      <div class="sm">Schmiedeeisen gibt es von \u{1F3F4}\u200D\u2620\uFE0F Piratenschiffen, Sch\xE4tzen im Watt, ger\xE4umten Wracks und Felsen sowie aus der Arena. Ausr\xFCstung wirkt nur, wenn der Kapit\xE4n den Trupp anf\xFChrt.</div>`;
      if (!hired.length) return out + '<div class="sm">Heuere zuerst einen Kapit\xE4n an.</div>';
      const sel = hired.find((k) => k.id === this.gearCap) || hired[0];
      out += `<div class="speeds">${hired.map((k) => `<button class="btn sm2 ${k.id === sel.id ? "" : "ghost"}" data-a="gearCap" data-id="${k.id}">${k.ic} ${k.name.split(" ")[0]}</button>`).join("")}</div>`;
      for (const g of GEAR) {
        const L = gearLv(c, sel.id, g.id), cost = gearCost(L + 1), blk = gearBlocker(c, sel.id, g.id);
        out += `<div class="row"><div class="ri"><b>${g.ic} ${g.name}</b> <span class="sh">Stufe ${L}/${GEAR_MAX}</span><div class="sm">${g.text}</div>
        ${L < GEAR_MAX ? `<div class="sm">N\xE4chste Stufe: \u{1F529} ${cost.ore} \xB7 \u2699\uFE0F ${cost.metal}${blk && !/^Braucht \d+ 🔩|Zu wenig/.test(blk) ? ` \xB7 <span class="warn">${blk}</span>` : ""}</div>` : ""}</div>
        ${L < GEAR_MAX ? `<button class="btn sm2" data-a="forge" data-cap="${sel.id}" data-g="${g.id}" ${blk ? "disabled" : ""}>${L ? "Verbessern" : "Schmieden"}</button>` : "<b>MAX</b>"}</div>`;
      }
      return out;
    };
    P.arenaHtml = function() {
      const o = this.o, c = this.c;
      if (!o.active) return '<div class="desc">\u{1F3DF}\uFE0F Die Arena gibt es im Online-Spiel: K\xE4mpfe gegen die Aufstellungen anderer Spieler, sammle Pokale und steige von Bronze bis Champion auf.</div><div class="btns"><button class="btn" data-a="goOnline">Online gehen</button></div>';
      const A = o.arena;
      if (!A) return `<div class="inf">Lade Arena \u2026</div>${o.arenaErr ? `<div class="warn">${esc(o.arenaErr)}</div>` : ""}`;
      const lg = LEAGUES[A.league], nx = LEAGUES[A.league + 1];
      const att = Math.round(armyStr(c.s.troops, null, true) * mods(c).atk);
      let out = `<div class="arenahd"><span class="big">${lg[0]}</span><div><b>${lg[1]}-Liga</b><div class="sm">\u{1F3C6} ${A.tr} Pokale${nx ? ` \xB7 ${nx[0]} ${nx[1]} ab ${nx[2]}` : ""}</div></div></div>
      <div class="desc">Trainingsk\xE4mpfe: Deine Krieger zu Hause k\xE4mpfen gegen die Verteidiger anderer \u2013 <b>niemand verliert dabei Krieger</b>. Sieg bringt Pokale, Niederlage kostet welche. Jeden Tag gibt es je nach Liga Abzeichen, Rohstoffe und Schmiedeeisen.</div>
      <div class="inf">\u2694\uFE0F K\xE4mpfe heute: <b>${A.left}/${A.max}</b> \xB7 Deine Angriffskraft: <b>${att.toLocaleString("de-DE")}</b></div>
      <div class="btns"><button class="btn" data-a="arenaClaim" ${A.claim && !this.busy ? "" : "disabled"}>${A.claim ? `\u{1F381} Liga-Belohnung (${lg[1]})` : "\u2714 Belohnung abgeholt"}</button></div>
      <div class="sub2">Gegner</div>`;
      out += (A.opps || []).map((p) => `<div class="row"><div class="ri"><b>${p.bot ? "\u{1F47B} " : "\u{1F3F0} "}${esc(p.name)}</b> <span class="sh">\u{1F3C6} ${p.tr} \xB7 \u2694 ${p.power}</span>${p.bot ? '<div class="sm">Geisterkapit\xE4n</div>' : ""}</div>
      <button class="btn sm2 danger" data-a="arenaFight" ${p.id ? `data-id="${p.id}"` : `data-bot="${p.bot}"`} ${A.left > 0 && uSum(c.s.troops) > 0 && !this.busy ? "" : "disabled"}>K\xE4mpfen</button></div>`).join("");
      if (!uSum(c.s.troops)) out += '<div class="warn">Keine Krieger zu Hause.</div>';
      if ((A.log || []).length) {
        out += '<div class="sub2">Letzte K\xE4mpfe</div>' + A.log.map((l, k) => `<div class="row rep ${l.win ? "win" : "loss"}"><div class="ri">${l.att ? "\u2694\uFE0F gegen" : "\u{1F6E1}\uFE0F von"} <b>${esc(l.name)}</b> \xB7 ${l.win ? "Sieg" : "Niederlage"} <b>${l.dt > 0 ? "+" : ""}${l.dt} \u{1F3C6}</b></div>${l.replay ? `<button class="btn sm2 ghost" data-a="replayArena" data-k="${k}">\u25B6</button>` : ""}</div>`).join("");
      }
      return out;
    };
    P.obstHtml = function() {
      const c = this.c, id = -4e3 - this.selected, o = (c.s.obst || []).find((x) => x.id === id);
      if (!o) return this.head("Hindernis") + '<div class="sm">Schon wegger\xE4umt.</div>';
      const d = OBST[o.kind], cl = c.s.clearing, mine = cl && cl.id === id, blk = obstBlocker(c, id);
      let out = this.head(`${d.ic} ${d.name}`) + '<div class="desc">Angesp\xFClt vom letzten Hochwasser. R\xE4um es weg \u2013 darunter steckt oft etwas Brauchbares (Rohstoffe, \u{1F529} Schmiedeeisen, manchmal ein Beschleuniger).</div>';
      if (mine) return out + `<div class="inf">\u{1F9F9} Wird ger\xE4umt \u2026 noch ${fmtTime(cl.left)}</div><div class="bar"><div style="width:${Math.round(100 * (1 - cl.left / cl.total))}%"></div></div>`;
      out += `<div class="inf">Kosten: ${this.costStr(d.cost)} \xB7 Dauer ${fmtTime(d.time)}</div>`;
      if (blk && blk !== "Zu wenig Rohstoffe") out += `<div class="warn">${blk}</div>`;
      return out + `<div class="btns"><button class="btn" data-a="obstClear" ${blk ? "disabled" : ""}><b>\u{1F9F9} Wegr\xE4umen</b></button></div>`;
    };
    P.fieldHtml = function() {
      const c = this.c, o = this.o, f0 = this.form, fl = ((o.world || {}).fields || []).find((x) => x.id === this.mapSel.id);
      if (!fl) return this.head("Rohstofffeld") + '<div class="sm">Das Feld ist ersch\xF6pft.</div>';
      const me = o.me, dist = Math.hypot(fl.x - me.x, fl.y - me.y), tt = (20 + dist * 22) * speedFactor(f0);
      const nm = ["Treibholz-Feld", "Muschelbank", "S\xFC\xDFwasserquelle", "Schrottberg"][fl.kind - 1];
      let out = this.head(`${RES_IC[fl.kind - 1]} ${nm} \xB7 Stufe ${fl.level}`) + `<div class="desc">Schicke einen Trupp zum Sammeln. Je h\xF6her die Stufe, desto schneller wird gesammelt. Feinde k\xF6nnen deinen Trupp angreifen und vertreiben!</div>
      <div class="inf">Vorrat: <b>${fl.amount.toLocaleString("de-DE")}</b> / ${fl.total.toLocaleString("de-DE")} ${RES[fl.kind - 1]} \xB7 Fahrt ${fmtTime(tt)}</div><div class="bar"><div style="width:${Math.round(100 * fl.amount / Math.max(1, fl.total))}%"></div></div>`;
      const mm = (o.marches || []).find((m) => m.field_id === fl.id);
      if (mm) {
        if (mm.status === "gather") return out + `<div class="inf">\u26CF Dein Trupp sammelt (${troopStr(mm.u)}) \xB7 fertig in ${fmtTime(Math.max(0, (Date.parse(mm.gather_end) - o.serverNow()) / 1e3))}</div><div class="btns"><button class="btn ghost" data-a="gatherRecall" data-id="${mm.id}" ${this.busy ? "disabled" : ""}>Zur\xFCckrufen (bringt das bisher Gesammelte mit)</button></div>`;
        return out + '<div class="inf">\u26F5 Dein Trupp ist unterwegs.</div>';
      }
      if (fl.occ) out += `<div class="inf">\u26CF Hier sammelt gerade <b>${esc(fl.occ)}</b>${fl.occ_ally && fl.occ_ally === me.alliance_id ? " (Verb\xFCndeter)" : " \u2013 greif an, um das Feld zu \xFCbernehmen!"}</div>`;
      const carry = Math.round(carryOf(f0)), rate2 = Math.max(1, carry) / 1800 * (1 + 0.15 * fl.level), amt = Math.min(carry, fl.amount);
      const extra = uSum(f0) ? `<div class="sm">Traglast ${carry.toLocaleString("de-DE")} \u2192 etwa ${fmtTime(amt / rate2)} Sammelzeit</div>` : '<div class="sm">Tipp: \u{1F3C3} Wattl\xE4ufer tragen am meisten.</div>';
      const ally = fl.occ && fl.occ_ally && fl.occ_ally === me.alliance_id;
      return out + '<div class="sub2">Sammeltrupp</div>' + this.troopForm(fl.occ && !ally ? "Angreifen & sammeln!" : "Sammeln!", !!fl.occ && !ally, ally ? "Ein Verb\xFCndeter sammelt hier" : null, extra, "sendGather");
    };
    const ally0 = P.allyHtml;
    P.allyHtml = function() {
      const o = this.o;
      if (!o.active || !o.alliances || !o.me || !o.me.alliance_id || this.helpTo || this.rallySel) return ally0.call(this);
      const tab = this.allyTab || "main";
      const tabs = [["main", "\u{1F4AC}", "Allianz"], ["help", "\u{1F91D}", "Hilfe" + (o.helpOpen ? ` ${o.helpOpen}` : "")], ["garr", "\u{1F6E1}\uFE0F", "Burg"], ["res", "\u{1F52C}", "Forschung"], ["war", "\u2694\uFE0F", "Krieg" + (o.war ? " \u2022" : "")]];
      const bar = `<div class="tabs" style="grid-template-columns:repeat(5,1fr)">${tabs.map(([k, ic, l]) => `<button class="tab ${k === tab ? "on" : ""}" data-a="atab" data-t="${k}"><span>${ic}</span>${l}</button>`).join("")}</div>`;
      const full = ally0.call(this), m = full.match(/^<div class="ph">[\s\S]*?<\/button><\/div>/), head = m ? m[0] : this.head("Allianz");
      const body = tab === "help" ? this.allyHelpHtml() : tab === "garr" ? this.garrHtml() : tab === "res" ? this.allyResHtml() : tab === "war" ? this.warHtml() : full.slice(head.length);
      return head + bar + `<div class="tabbody">${body}</div>`;
    };
    P.allyHelpHtml = function() {
      const o = this.o, L = o.helps;
      let out = `<div class="desc">Jeder Bau und jede Forschung bittet deine Allianz automatisch um Hilfe. Jeder Tipp eines Verb\xFCndeten verk\xFCrzt die Restzeit (mindestens 30 Sek., bei langen Auftr\xE4gen 1,5 %). F\xFCrs Helfen gibt es \u2699\uFE0F 15 Altmetall und 1 VIP-Punkt (bis 30\xD7 am Tag).</div>`;
      if (!L) return out + '<div class="inf">Lade \u2026</div>';
      out += `<div class="btns"><button class="btn" data-a="helpAll" ${L.length && !this.busy ? "" : "disabled"}><b>\u{1F91D} Allen helfen (${L.length})</b></button></div>`;
      out += L.map((h2) => `<div class="row"><div class="ri"><b>${esc(h2.name)}</b> <span class="sh">${esc(h2.label)}</span><div class="bar"><div style="width:${Math.round(100 * h2.got / h2.max)}%"></div></div><div class="sm">${h2.got}/${h2.max} Hilfen</div></div>
      <button class="btn sm2" data-a="helpOne" data-id="${h2.id}" ${this.busy ? "disabled" : ""}>Helfen</button></div>`).join("") || '<div class="sm">Gerade braucht niemand Hilfe. \u{1F44D}</div>';
      const own = Object.entries(this.c.s.helpGot || {}).filter(([, n]) => n > 0);
      if (own.length) out += `<div class="sm" style="margin-top:8px">Deine Auftr\xE4ge haben heute ${own.reduce((a, [, n]) => a + n, 0)}\xD7 Hilfe bekommen.</div>`;
      return out;
    };
    P.garrHtml = function() {
      const o = this.o, c = this.c, G = o.garr;
      const cap = gcapOf(c);
      if (this.donTo) {
        return `<div class="sub2">\u{1F6E1}\uFE0F Verst\xE4rkung f\xFCr ${esc(this.donTo.name)} (${this.donTo.free} Pl\xE4tze frei)</div><div class="desc">Deine Krieger verteidigen seine Stadt mit, bis er sie zur\xFCckschickt oder du sie zur\xFCckholst. Fallen sie im Kampf, sind sie verloren. Pro 5 Krieger gibt es 1 VIP-Punkt.</div>` + this.troopForm("Schicken", false, uSum(this.form) > this.donTo.free ? "Zu viele f\xFCr die freien Pl\xE4tze" : null, "", "donateTroops") + '<div class="btns"><button class="btn ghost" data-a="donToBack">Zur\xFCck</button></div>';
      }
      let out = `<div class="desc">In deiner <b>Allianzburg</b> k\xF6nnen Verb\xFCndete Krieger stationieren, die deine Stadt mitverteidigen \u2013 gegen Spieler-Angriffe. Platz: 15 + 10 je Gezeitenturm-Stufe.</div>`;
      if (!G) return out + '<div class="inf">Lade \u2026</div>';
      out += `<div class="inf">\u{1F3F0} Deine Burg: <b>${G.total}/${cap}</b> Krieger${G.total ? " \xB7 " + troopStr(G.u) : ""}</div><div class="bar"><div style="width:${Math.round(100 * G.total / Math.max(1, cap))}%"></div></div>
      <div class="btns"><button class="btn" data-a="troopReq" ${G.total >= cap || this.busy ? "disabled" : ""}>\u{1F4E3} Um Verst\xE4rkung bitten</button></div>`;
      out += (G.rows || []).map((r) => `<div class="row"><div class="ri"><b>${esc(r.name)}</b><div class="sm">${troopStr(r.u)}</div></div><button class="btn sm2 ghost" data-a="garrBack" data-id="${r.donor}">Zur\xFCckschicken</button></div>`).join("");
      out += '<div class="sub2">Verb\xFCndete bitten um Verst\xE4rkung</div>' + ((G.req || []).map((r) => `<div class="row"><div class="ri"><b>${esc(r.name)}</b> <span class="sh">${r.free} Pl\xE4tze frei</span></div><button class="btn sm2" data-a="donTo" data-id="${r.id}" data-n="${esc(r.name)}" data-f="${r.free}">Krieger schicken</button></div>`).join("") || '<div class="sm">Gerade keine Anfragen.</div>');
      if ((G.mine || []).length) out += '<div class="sub2">Deine Krieger bei anderen</div>' + G.mine.map((r) => `<div class="row"><div class="ri"><b>${esc(r.name)}</b><div class="sm">${troopStr(r.u)}</div></div><button class="btn sm2 ghost" data-a="garrRecall" data-id="${r.host}">Zur\xFCckholen</button></div>`).join("");
      return out;
    };
    P.allyResHtml = function() {
      const o = this.o, Pj = o.projects || [];
      if (this.donKind && ALLY_RES[this.donKind]) {
        const n = (k) => `<input class="n" id="dn${k}" type="number" min="0" inputmode="numeric" placeholder="${RES_IC[k]} ${RES[k]}" style="flex:1 1 23%">`;
        return `<div class="sub2">Spenden f\xFCr ${ALLY_RES[this.donKind][0]}</div><div class="form" style="flex-wrap:wrap;gap:4px">${[0, 1, 2, 3].map(n).join("")}</div>
        <div class="btns"><button class="btn" data-a="donSend" ${this.busy ? "disabled" : ""}><b>Spenden</b></button><button class="btn ghost" data-a="donBack">Zur\xFCck</button></div>`;
      }
      return '<div class="desc">\u{1F52C} Allianz-Forschung: Alle spenden Rohstoffe, jede Stufe wirkt f\xFCr <b>jedes Mitglied</b>. Pro 500 gespendete Rohstoffe gibt es 1 VIP-Punkt.</div>' + Object.keys(ALLY_RES).map((k) => {
        const p = Pj.find((x) => x.kind === k) || { level: 0, progress: 0, goal: 4e3 };
        return `<div class="row"><div class="ri"><b>${ALLY_RES[k][0]}</b> <span class="sh">Stufe ${p.level}/10 \xB7 ${ALLY_RES[k][1]}</span>
        ${p.level < 10 ? `<div class="bar"><div style="width:${Math.round(100 * p.progress / p.goal)}%"></div></div><div class="sm">${p.progress.toLocaleString("de-DE")} / ${p.goal.toLocaleString("de-DE")}</div>` : ""}</div>
        ${p.level < 10 ? `<button class="btn sm2" data-a="donPick" data-k="${k}">Spenden</button>` : "<b>MAX</b>"}</div>`;
      }).join("");
    };
    P.warHtml = function() {
      const o = this.o, W = o.warI;
      let out = '<div class="desc">\u2694\uFE0F <b>Allianz-Krieg</b>: 48 Stunden, jedes Mitglied hat <b>2 Kriegsangriffe</b> auf St\xE4dte der gegnerischen Allianz. Ein Sieg bringt 1\u20133 \u2B50 (je klarer, desto mehr), eine eroberte Insel 3 \u2B50. Gez\xE4hlt werden die besten Sterne je Gegner. Die Gewinner bekommen 12 Abzeichen, Rohstoffe und einen 60-Min-Beschleuniger.</div>';
      if (!W) return out + '<div class="inf">Lade \u2026</div>';
      const w = W.war;
      if (!w) {
        if (!W.leader) return out + '<div class="inf">Gerade herrscht Frieden. Nur euer Anf\xFChrer kann einen Krieg erkl\xE4ren.</div>';
        return out + '<div class="sub2">Gegner w\xE4hlen</div>' + ((W.targets || []).map((t) => `<div class="row"><div class="ri"><b>[${esc(t.tag)}] ${esc(t.name)}</b> <span class="sh">${t.n} Mitglieder \xB7 \u2694 ${t.power}</span></div>
        <button class="btn sm2 ${this.confirm === "war" + t.id ? "danger" : ""}" data-a="warDeclare" data-id="${t.id}" ${this.busy ? "disabled" : ""}>${this.confirm === "war" + t.id ? "<b>Wirklich?</b>" : "Krieg erkl\xE4ren"}</button></div>`).join("") || '<div class="sm">Keine anderen Allianzen.</div>');
      }
      const left = (Date.parse(w.ends) - o.serverNow()) / 1e3, done = w.status !== "active";
      out = `<div class="warhd"><div><b>[${esc(w.us.tag)}]</b><div class="big">${w.us.score} \u2B50</div></div><div class="vs">${done ? w.winner === "us" ? "\u{1F3C6} Sieg!" : w.winner === "them" ? "Niederlage" : "Unentschieden" : '\u2694\uFE0F<div class="sm">' + fmtTime(Math.max(0, left)) + "</div>"}</div><div><b>[${esc(w.them.tag)}]</b><div class="big">${w.them.score} \u2B50</div></div></div>`;
      if (!done) out += `<div class="inf">Deine Kriegsangriffe \xFCbrig: <b>${w.hits_left}/2</b></div>`;
      out += '<div class="sub2">Gegner</div>' + w.enemies.map((e) => `<div class="row"><div class="ri"><b>${esc(e.name)}</b> <span class="sh">\u2694 ${e.power} \xB7 \u{1F5FC}${e.tower}${e.shield ? " \xB7 \u{1F6E1} Schutz" : ""}</span><div class="stars">${"\u2B50".repeat(e.stars)}${"\u2606".repeat(3 - e.stars)}</div></div>
      ${!done ? `<button class="btn sm2 danger" data-a="warGo" data-id="${e.id}" ${e.shield || w.hits_left <= 0 ? "disabled" : ""}>Angreifen</button>` : ""}</div>`).join("");
      out += '<div class="sub2">Unsere Seite</div>' + w.ours.map((e) => `<div class="row"><div class="ri"><b>${esc(e.name)}</b> <span class="sh">\u2694 ${e.power} \xB7 Angriffe ${e.used}/2</span><div class="stars">Verloren: ${"\u2B50".repeat(e.stars)}${"\u2606".repeat(3 - e.stars)}</div></div></div>`).join("");
      return out;
    };
    P.showReplay = function(rp) {
      if (!rp || !rp.a || !rp.d) {
        this.c.msg("Keine Wiederholung vorhanden.");
        return;
      }
      this.closeReplay();
      const box = document.createElement("div");
      box.id = "replay";
      const title = rp.arena ? "\u{1F3DF}\uFE0F Arena" : rp.raid ? "\u{1F3F4}\u200D\u2620\uFE0F Piraten\xFCberfall" : "\u2694\uFE0F Angriff";
      box.innerHTML = `<div class="rpin"><div class="ph"><div class="pt">${title}: ${esc(rp.a.n)} gegen ${esc(rp.d.n)}</div><button class="x" data-a="replayClose">\u2715</button></div>
      <canvas id="rpc"></canvas><div class="rpres" id="rpres"></div>
      <div class="btns"><button class="btn ghost" data-a="replayAgain">\u25B6 Nochmal</button><button class="btn" data-a="replayClose">Schlie\xDFen</button></div></div>`;
      document.body.appendChild(box);
      this.rp = { data: rp, t: 0, last: performance.now() };
      const loop = (now) => {
        if (!this.rp || !document.getElementById("replay")) return;
        const st = this.rp;
        st.t += Math.min(0.05, (now - st.last) / 1e3);
        st.last = now;
        drawReplay(document.getElementById("rpc"), st.data, st.t);
        const res = document.getElementById("rpres");
        if (res && st.t > 6.2 && !res.textContent) {
          const d = st.data, al = uSum(d.a.l || zeroU()), dl = uSum(d.d.l || zeroU());
          res.innerHTML = `<b style="color:${d.win ? "#ffb070" : "#8ef0a0"}">${d.win ? `${esc(d.a.n)} gewinnt` : `${esc(d.d.n)} h\xE4lt stand`}</b> \xB7 Verluste: Angreifer ${al}, Verteidiger ${dl}${d.d.f ? ` \xB7 Aufstellung ${Math.round((formMul(d.d.f) - 1) * 100)} %` : ""}`;
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    };
    P.closeReplay = function() {
      const e = document.getElementById("replay");
      if (e) e.remove();
      this.rp = null;
    };
    P.action2 = function(a, ds) {
      const c = this.c, o = this.o;
      switch (a) {
        case "formSet":
          setRow(c, +ds.u, +ds.r);
          if (o.active) o.t.sync = 99;
          return true;
        case "formPreset":
          c.s.formation = FORM_PRESETS[+ds.k].f.slice();
          if (o.active) o.t.sync = 99;
          c.msg(`\u{1F9F1} Aufstellung \u201E${FORM_PRESETS[+ds.k].name}\u201C gew\xE4hlt.`);
          return true;
        case "gearCap":
          this.gearCap = ds.id;
          return true;
        case "forge": {
          const e = forgeGear(c, ds.cap, ds.g);
          if (e) c.msg(e);
          return true;
        }
        case "arenaFight": {
          const boost = mods(c).atk;
          this.run(async () => {
            const r = await o.arenaFight(ds.id || null, ds.bot ? +ds.bot : null, boost);
            c.msg(r.win ? `\u{1F3DF}\uFE0F Sieg! +${r.dt} Pokale` : `\u{1F3DF}\uFE0F Niederlage. ${r.dt} Pokale`);
            this.showReplay(r.replay);
          });
          return true;
        }
        case "arenaClaim":
          this.run(async () => {
            const r = await o.arenaClaim();
            c.msg(`\u{1F3DF}\uFE0F Liga-Belohnung: \u{1F396}\uFE0F ${r.medals} \xB7 \u{1F529} ${r.ore || 0} \xB7 je ${Math.round(r.res)} Rohstoffe`);
          });
          return true;
        case "replayArena": {
          const l = ((o.arena || {}).log || [])[+ds.k];
          if (l) this.showReplay(l.replay);
          return true;
        }
        case "replay": {
          if (ds.id) this.run(async () => {
            this.showReplay(await o.replay(+ds.id));
          });
          else {
            const r = c.s.reports[+ds.k];
            if (r) this.showReplay(r.rp);
          }
          return true;
        }
        case "replayAgain":
          if (this.rp) {
            this.rp.t = 0;
            const r = document.getElementById("rpres");
            if (r) r.textContent = "";
          }
          return true;
        case "replayClose":
          this.closeReplay();
          return true;
        case "obstClear": {
          const id = -4e3 - this.selected;
          if (startObst(c, id)) {
          }
          return true;
        }
        case "sendGather": {
          const sel = this.mapSel, f = this.form.slice();
          if (!sel) return true;
          const cap = this.capSel && capFree(c, this.capSel) ? this.capSel : null;
          const boost = mods(c).atk * capAtk(c, cap, c.tideState(30)), speed = mods(c).travel * fleetSpeed(c, f) * capSpeed(c, cap);
          this.run(async () => {
            await o.sendMarch("gather", sel.id, f, boost, speed);
            this.capSel = null;
            this.form = zeroU();
            this.mapSel = null;
            c.msg("\u26CF Sammeltrupp ist unterwegs.");
            await o.loadWorld();
          });
          return true;
        }
        case "gatherRecall":
          this.run(async () => {
            await o.gatherRecall(+ds.id);
            c.msg("Trupp kehrt mit der Ladung heim.");
          });
          return true;
        case "atab":
          this.allyTab = ds.t;
          this.donKind = null;
          this.donTo = null;
          this.form = zeroU();
          if (ds.t === "help") o.helpList().then(() => this.panelKey = null);
          if (ds.t === "garr") o.garrisonInfo().then(() => this.panelKey = null);
          if (ds.t === "war") o.warInfo().then(() => this.panelKey = null);
          if (ds.t === "res") o.allyProjects().then(() => this.panelKey = null);
          return true;
        case "helpAll":
        case "helpOne":
          this.run(async () => {
            const r = await o.helpGive(a === "helpOne" ? +ds.id : null);
            c.msg(r.n ? `\u{1F91D} ${r.n}\xD7 geholfen${r.reward ? ` \xB7 +${r.reward * 15} \u2699\uFE0F` : ""}` : "Gerade gibt es nichts zu helfen.");
          });
          return true;
        case "troopReq":
          this.run(async () => {
            await o.troopRequest();
            c.msg("\u{1F4E3} Deine Allianz wurde um Verst\xE4rkung gebeten.");
          });
          return true;
        case "donTo":
          this.donTo = { id: ds.id, name: ds.n, free: +ds.f };
          this.form = zeroU();
          return true;
        case "donToBack":
          this.donTo = null;
          return true;
        case "donateTroops": {
          const to = this.donTo, f = this.form.slice();
          this.run(async () => {
            await o.troopDonate(to.id, f);
            this.donTo = null;
            this.form = zeroU();
            c.msg(`\u{1F6E1}\uFE0F ${uSum(f)} Krieger zu ${to.name} geschickt.`);
          });
          return true;
        }
        case "garrBack":
          this.run(async () => {
            await o.garrisonBack(ds.id);
          });
          return true;
        case "garrRecall":
          this.run(async () => {
            await o.call("garrison_back", { p_token: o.token, p_other: ds.id });
            await o.sync();
            await o.garrisonInfo();
            c.msg("Deine Krieger kehren heim.");
          });
          return true;
        case "warDeclare":
          if (this.confirm !== "war" + ds.id) {
            this.confirm = "war" + ds.id;
            return true;
          }
          this.confirm = null;
          this.run(async () => {
            await o.warDeclare(ds.id);
            c.msg("\u2694\uFE0F Der Krieg ist erkl\xE4rt!");
          });
          return true;
        case "warGo": {
          this.setView("map");
          this.mapSel = { type: "player", id: ds.id };
          this.form = zeroU();
          return true;
        }
        default:
          return false;
      }
    };
  }
  function drawReplay(cv, d, t) {
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth || 320, H = cv.clientHeight || 220;
    if (cv.width !== Math.round(W * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1a5f86");
    g.addColorStop(1, "#0b3352");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#7a6448";
    ctx.fillRect(W * 0.62, 0, W * 0.38, H);
    ctx.fillStyle = "#5c4a35";
    for (let k = 0; k < 9; k++) ctx.fillRect(W * 0.62, k * H / 9 + 2, W * 0.38, 2);
    ctx.fillStyle = "#4a3a28";
    ctx.fillRect(W * 0.62 - 4, 0, 6, H);
    const P = Math.min(1, Math.max(0, (t - 0.6) / 4.5));
    const march = Math.min(1, t / 1.6);
    const au = d.a.u || zeroU(), al = d.a.l || zeroU(), du = d.d.u || zeroU(), dl = d.d.l || zeroU(), f = d.d.f || [0, 0, 0, 0, 0];
    const cnt = (u, l, i) => Math.max(0, Math.round(u[i] - l[i] * P));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const ax0 = W * 0.08 + march * W * 0.22;
    UNITS.forEach((u, i) => {
      if (!au[i]) return;
      const n = cnt(au, al, i), y = H * (0.14 + i * 0.18), shake = P > 0 && P < 1 ? Math.sin(t * 20 + i) * 2 : 0;
      ctx.globalAlpha = n > 0 ? 1 : 0.25;
      ctx.font = "22px system-ui";
      ctx.fillText(u.ic, ax0 + shake, y);
      ctx.font = "bold 11px system-ui";
      ctx.fillStyle = "#ffd9b0";
      ctx.fillText(n, ax0 + shake, y + 15);
      ctx.fillStyle = "#fff";
    });
    const rowX = [W * 0.68, W * 0.79, W * 0.9];
    const perRow = [0, 0, 0];
    UNITS.forEach((u, i) => {
      if (!du[i]) return;
      const r = f[i] || 0, k = perRow[r]++, y = H * (0.16 + k * 0.2), n = cnt(du, dl, i);
      ctx.globalAlpha = n > 0 ? 1 : 0.25;
      ctx.font = "22px system-ui";
      ctx.fillText(u.ic, rowX[r], y);
      ctx.font = "bold 11px system-ui";
      ctx.fillStyle = "#b8f0c8";
      ctx.fillText(n, rowX[r], y + 15);
      ctx.fillStyle = "#fff";
    });
    ctx.globalAlpha = 1;
    if (d.d.def) {
      ctx.font = "11px system-ui";
      ctx.fillStyle = "#ffe9a8";
      ctx.fillText(`\u{1F3F0} Verteidigung ${d.d.def}`, W * 0.81, H - 10);
      ctx.fillStyle = "#fff";
    }
    if (P > 0 && P < 1) {
      for (let k = 0; k < 7; k++) {
        const ph = (t * 1.3 + k * 0.37) % 1, fromA = k % 2 === 0;
        const x0 = fromA ? ax0 + 14 : rowX[2] - 10, x1 = fromA ? W * 0.66 : ax0 + 20;
        const y0 = H * (0.15 + k % 5 * 0.18), y1 = H * (0.2 + k * 3 % 5 * 0.16);
        const x = x0 + (x1 - x0) * ph, y = y0 + (y1 - y0) * ph - Math.sin(ph * Math.PI) * 30;
        ctx.fillStyle = fromA ? "#ffcf7a" : "#bfe8ff";
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      const mx = (ax0 + W * 0.66) / 2;
      for (let k = 0; k < 4; k++) {
        const a = t * 9 + k * 1.7;
        ctx.fillStyle = `rgba(255,${180 + k * 15},90,${0.5 + 0.5 * Math.sin(a)})`;
        ctx.beginPath();
        ctx.arc(mx + Math.cos(a) * 18, H / 2 + Math.sin(a * 1.3) * 40, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (t > 5.4) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, H / 2 - 22, W, 44);
      ctx.font = "bold 20px system-ui";
      ctx.fillStyle = d.win ? "#ffb070" : "#8ef0a0";
      ctx.fillText(d.win ? "\u2694\uFE0F Angriff erfolgreich" : "\u{1F6E1}\uFE0F Verteidigung h\xE4lt", W / 2, H / 2);
    }
    if (d.tide) {
      ctx.font = "11px system-ui";
      ctx.fillStyle = "#cfe6ea";
      ctx.textAlign = "left";
      ctx.fillText(d.tide === -1 ? "\u{1F30A} Ebbe" : "\u{1F30A} Flut", 6, H - 10);
    }
  }

  // src/ui.js
  var QOK = ["Alle Bautrupps besch\xE4ftigt", "Zu wenig Rohstoffe"];
  var $ = (sel) => document.querySelector(sel);
  var h = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== void 0) e.innerHTML = html;
    return e;
  };
  var amount = (v) => v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e4 ? (v / 1e3).toFixed(1) + "k" : String(Math.floor(v));
  var rate = (v) => {
    const a = Math.abs(v);
    const s = a >= 1e3 ? (a / 1e3).toFixed(1) + "k" : String(Math.round(a));
    return (v < 0 ? "\u2212" : "+") + s;
  };
  var RES_IC2 = ["\u{1FAB5}", "\u{1F9AA}", "\u{1F4A7}", "\u2699\uFE0F"];
  var B_IC = ["\u{1F5FC}", "\u{1FAB5}", "\u{1F9AA}", "\u{1F4A7}", "\u2699\uFE0F", "\u{1F3E0}", "\u{1F33F}", "\u{1F41F}", "\u{1F372}", "\u2694\uFE0F", "\u{1F441}\uFE0F", "\u{1F4E6}", "\u{1F9F1}", "\u{1F3F9}", "\u{1F30A}", "\u{1F531}", "\u{1F6E1}\uFE0F", "\u{1F5E1}\uFE0F", "\u{1FAA8}", "\u{1F3C3}", "\u{1FA79}", "\u{1F4DA}", "\u2693", "\u{1F570}\uFE0F"];
  var NODE_NAME = ["Treibholz", "Muschelbank", "S\xFC\xDFwassert\xFCmpel", "Wrackteile"];
  var setHTML = (el, html) => {
    if (el._h !== html) {
      el._h = html;
      el.innerHTML = html;
    }
  };
  var clock = (d) => {
    const m = Math.floor(d * 1440);
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };
  var UI = class {
    constructor(colony, world, gfx, online) {
      this.c = colony;
      this.w = world;
      this.g = gfx;
      this.o = online;
      this.selected = -1;
      this.menu = false;
      this.confirm = null;
      this.panelKey = null;
      this.view = "city";
      this.mapSel = null;
      this.form = zeroU();
      this.showReports = false;
      this.mode = null;
      this.busy = false;
      this.tasksOpen = true;
      this.troopTab = "truppen";
      this.build();
    }
    build() {
      const top = $("#top");
      this.cards = RES.map((name, i) => {
        const card = h("div", "card", `<span class="ic" title="${name}">${RES_IC2[i]}</span><div class="cv"><b class="rv">0</b><span class="rr">+0</span></div>`);
        top.querySelector(".res").appendChild(card);
        return { v: card.querySelector(".rv"), r: card.querySelector(".rr") };
      });
      this.avaEl = $("#ava");
      this.avaEl.dataset.a = "profile";
      this.raidEl = $("#raid");
      this.raidEl.dataset.a = "troops";
      this.aviEl = top.querySelector(".avi");
      this.vipEl = top.querySelector(".vipb");
      this.nameEl = top.querySelector(".pname");
      this.clockEl = top.querySelector(".clock");
      $("#avFile").addEventListener("change", (e) => this.avatarFile(e.target.files && e.target.files[0]));
      this.gw = top.querySelector(".gw");
      this.gd = top.querySelector(".gd");
      this.tl = top.querySelector(".tl");
      this.st = top.querySelector(".st");
      this.acc = 1;
      this.toasts = $("#toasts");
      this.labels = $("#labels");
      this.labelEls = Array.from({ length: PLOTS }, () => {
        const e = h("div", "lbl");
        this.labels.appendChild(e);
        return e;
      });
      this.panel = $("#panel");
      this.mapEl = $("#map");
      this.sea = new SeaMap($("#mapc"), this.c, this.o);
      this.bBeacon = $("#bBeacon");
      this.bExp = $("#bExp");
      this.bMap = $("#bMap");
      this.bAlly = $("#bAlly");
      this.bMenu = $("#bMenu");
      this.bBuild = $("#bBuild");
      this.bTroops = $("#bTroops");
      this.bTroops.dataset.a = "troops";
      this.tasksEl = $("#tasks");
      this.bGift = $("#bGift");
      this.bGift.dataset.a = "gift";
      this.tutEl = $("#tut");
      this.newsEl = $("#news");
      this.bBuild.dataset.a = "buildings";
      this.bBeacon.dataset.a = "beacon";
      this.bExp.dataset.a = "exp";
      this.bMap.dataset.a = "map";
      this.bAlly.dataset.a = "ally";
      this.bMenu.dataset.a = "menu";
      this.login = $("#login");
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" || !e.target || e.target.tagName !== "INPUT") return;
        const id = e.target.id;
        if (id === "chatIn") this.action("chat", {});
        if (id === "loginName") this.action("register", {});
        if (id === "loginCode") this.action("restore", {});
      });
      if (!this.o.active && !localStorage.getItem("pf_offline")) this.showLogin(true);
      this.down = null;
      document.addEventListener("pointerdown", (e) => {
        if (e.target.closest && e.target.closest("#panel")) this.holding = true;
        const b = e.target.closest && e.target.closest("[data-a]");
        if (!b) {
          this.down = null;
          return;
        }
        this.down = { b, x: e.clientX, y: e.clientY, id: e.pointerId };
        this.holding = true;
      }, true);
      document.addEventListener("pointerup", (e) => {
        const d = this.down;
        this.down = null;
        setTimeout(() => this.holding = false, 30);
        if (!d || d.id !== e.pointerId) return;
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 18) return;
        const r = d.b.getBoundingClientRect();
        if (e.clientX < r.left - 10 || e.clientX > r.right + 10 || e.clientY < r.top - 10 || e.clientY > r.bottom + 10) return;
        if (d.b.disabled || !d.b.isConnected) return;
        e.preventDefault();
        this.action(d.b.dataset.a, d.b.dataset);
      }, true);
      document.addEventListener("pointercancel", () => {
        this.down = null;
        this.holding = false;
      }, true);
      const mc = $("#mapc");
      let md = null;
      mc.addEventListener("pointerdown", (e) => {
        md = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: 0 };
        mc.setPointerCapture(e.pointerId);
      });
      mc.addEventListener("pointermove", (e) => {
        if (!md) return;
        const dx = e.clientX - md.lx, dy = e.clientY - md.ly;
        md.lx = e.clientX;
        md.ly = e.clientY;
        md.moved += Math.abs(dx) + Math.abs(dy);
        if (md.moved > 12) this.sea.drag(dx, dy);
      });
      mc.addEventListener("pointerup", (e) => {
        if (!md || md.moved > 15) {
          md = null;
          return;
        }
        md = null;
        const r = mc.getBoundingClientRect();
        this.mapSel = this.sea.pick(e.clientX - r.left, e.clientY - r.top);
        if (this.mapSel && this.mapSel.type === "boss") this.o.bossInfo().then(() => this.panelKey = null);
        this.form = zeroU();
        this.showReports = false;
        this.panelKey = null;
        this.confirm = null;
      });
      const v = window.APP_VERSION || { name: "dev", channel: "test" };
      this.version = v;
      if (v.channel !== "public") {
        const b = $("#badge");
        b.textContent = "TEST " + String(v.name).replace(/^Test\s*/i, "");
        b.style.display = "";
      }
    }
    select(i, keepMenu) {
      if (this.view === "map" && i !== -1) return;
      if (i <= -3e3 && i > -4e3) {
        collectTreasure(this.c, -3e3 - i);
        return;
      }
      this.selected = i;
      this.w.selected = i;
      this.confirm = null;
      this.panelKey = null;
      if (i !== -1 && !keepMenu) {
        this.menu = false;
        this.mode = null;
        this.o.wantChat = false;
      }
    }
    /// Altersbestätigung (ab 10 Jahren) – einmal pro Gerät
    ageOk() {
      if (localStorage.getItem("pf_age10") === "1") return true;
      const cb = $("#age10");
      if (cb && cb.checked) {
        localStorage.setItem("pf_age10", "1");
        return true;
      }
      const e = $("#loginErr");
      if (e) e.textContent = "Bitte best\xE4tige zuerst mit dem H\xE4kchen, dass du mindestens 10 Jahre alt bist.";
      const b = document.querySelector("#login .agebox");
      if (b) {
        b.classList.remove("shake");
        void b.offsetWidth;
        b.classList.add("shake");
      }
      return false;
    }
    showLogin(on, codeMode) {
      this.login.style.display = on ? "flex" : "none";
      if (on) {
        $("#loginCodeBox").style.display = codeMode ? "" : "none";
        $("#loginNameBox").style.display = codeMode ? "none" : "";
        $("#loginErr").textContent = "";
        const ab = document.querySelector("#login .agebox");
        if (ab) ab.style.display = localStorage.getItem("pf_age10") === "1" ? "none" : "";
      }
    }
    openMenu(tab) {
      if (this.view === "map") this.setView("city");
      this.select(-1, true);
      this.mode = null;
      this.o.wantChat = false;
      this.menu = true;
      this.menuTab = tab;
      this.confirm = null;
      this.panelKey = null;
      if (tab === "rank") this.o.loadRanking();
      if (tab === "reports" && this.o.active) this.o.sync();
    }
    openMode(m) {
      if (this.view === "map") this.setView("city");
      this.select(-1);
      this.menu = false;
      this.mode = this.mode === m ? null : m;
      this.confirm = null;
      this.panelKey = null;
      this.o.wantChat = this.mode === "ally";
      if (this.mode === "ally") {
        this.o.loadAlliances();
        this.o.loadChat();
        this.o.loadRallies();
        this.o.allyProjects().then(() => this.panelKey = null);
      }
      if (this.mode === "rank") this.o.loadRanking();
    }
    async run(fn) {
      if (this.busy) return;
      this.busy = true;
      this.panelKey = null;
      try {
        await fn();
      } catch (e) {
        this.c.msg(e.message || "Fehler");
      }
      this.busy = false;
      this.panelKey = null;
    }
    setView(v) {
      this.view = v;
      this.mapSel = null;
      this.form = zeroU();
      this.showReports = false;
      this.mapEl.style.display = v === "map" ? "" : "none";
      this.labels.style.display = v === "map" ? "none" : "";
      if (v === "map") {
        this.select(-1);
        this.menu = false;
        this.mode = null;
        this.o.wantChat = false;
      }
      this.o.wantWorld = v === "map";
      if (v === "map" && this.o.active) {
        this.o.loadWorld();
        this.o.sync();
      }
      this.panelKey = null;
    }
    action(a, ds) {
      if (this.action2 && this.action2(a, ds)) {
        this.panelKey = null;
        return;
      }
      const c = this.c, o = this.o, v = +(ds.v || 0);
      const val = (id) => {
        const e = $("#" + id);
        return e ? e.value.trim() : "";
      };
      if (a === "beacon") c.toggleBeacon();
      else if (a === "exp") c.startExpedition();
      else if (a === "gfx") this.g.cycle();
      else if (a === "map") this.setView(this.view === "map" ? "city" : "map");
      else if (a === "ally") this.openMode("ally");
      else if (a === "rank") {
        this.troopTab = "rank";
        if (this.mode !== "troops") this.openMode("troops");
        this.o.loadRanking();
      } else if (a === "account") this.openMenu("settings");
      else if (a === "menu") {
        if (this.menu) {
          this.menu = false;
        } else this.openMenu("settings");
      } else if (a === "mtab") {
        this.menuTab = ds.t;
        this.codeMsg = null;
        if (ds.t === "codes") this.o.loadCodes().then(() => this.panelKey = null);
        if (ds.t === "admin") {
          this.o.adminPlayers().then(() => this.panelKey = null);
          this.o.adminAvatars().then(() => this.panelKey = null);
        }
      } else if (a === "redeem") {
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        const code = val("codeIn");
        if (!code) return;
        this.run(async () => {
          try {
            const t = await o.redeem(code);
            this.codeMsg = { ok: true, text: `\u{1F381} Eingel\xF6st! Du bekommst: <b>${t}</b>` };
            const e = $("#codeIn");
            if (e) e.value = "";
          } catch (e) {
            this.codeMsg = { ok: false, text: e.message };
          }
        });
      } else if (a === "codeRandom") {
        const e = $("#ncCode");
        if (e) {
          const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          let k = "";
          for (let i = 0; i < 8; i++) k += A[Math.floor(Math.random() * A.length)];
          e.value = k;
        }
      } else if (a === "codeSave") {
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        const num = (id) => Math.max(0, Math.floor(+val(id) || 0));
        const code = val("ncCode").toUpperCase(), res = [0, 1, 2, 3].map((i) => num("ncR" + i)), u = [0, 1, 2, 3, 4].map((i) => num("ncU" + i));
        const days = val("ncDays") === "" ? 1 : num("ncDays"), max = num("ncMax"), vp = num("ncVip");
        this.run(async () => {
          try {
            await o.saveCode(code, res, u, days, max, vp);
            this.codeMsg = { ok: true, text: `Code <b>${code}</b> gespeichert \u2013 gib ihn an deine Spieler weiter.` };
          } catch (e) {
            this.codeMsg = { ok: false, text: e.message };
          }
        });
      } else if (a === "codeDel") {
        const k = ds.c;
        if (this.confirm === "del" + k) {
          this.confirm = null;
          this.run(async () => {
            await o.deleteCode(k);
          });
        } else this.confirm = "del" + k;
      } else if (a === "troops") {
        if (this.mode === "troops") this.mode = null;
        else {
          this.openMode("troops");
          this.troopTab = this.troopTab || "truppen";
          this.ttabLoad();
        }
      } else if (a === "ttab") {
        this.troopTab = ds.t;
        this.ttabLoad();
      } else if (a === "tasks") this.tasksOpen = !this.tasksOpen;
      else if (a === "gonode") {
        const n = c.nodeById(+ds.i);
        this.menu = false;
        this.mode = null;
        if (n) {
          this.w.target[0] = n.x;
          this.w.target[2] = n.z;
          this.w.dist = Math.min(this.w.dist, 55);
          this.select(-1e3 - n.id);
        }
      } else if (a === "gomap") {
        if (this.view !== "map") this.setView("map");
      } else if (a === "buildings") {
        if (this.mode === "build") {
          this.mode = null;
        } else {
          this.openMode("build");
          this.buildTab = this.buildTab || "mine";
        }
      } else if (a === "btab") this.buildTab = ds.t;
      else if (a === "quickbuild") {
        const t = +ds.v, i = this.freePlotFor(t);
        if (i < 0) c.msg("Kein passender freier Bauplatz \u2013 baue mehr, damit dein Gel\xE4nde w\xE4chst.");
        else if (c.startBuild(i, t)) {
          const pp = plotPos(i);
          this.w.target[0] = pp[0];
          this.w.target[2] = pp[2];
          this.mode = null;
        }
      } else if (a === "qbuild") {
        const t = +ds.v, i = this.freePlotQueue(t);
        if (i >= 0) {
          const e = queueAdd(c, i, t);
          if (e) c.msg(e);
        }
      } else if (a === "qplot") {
        const e = queueAdd(c, this.selected, +ds.v);
        if (e) c.msg(e);
        else this.select(-1);
      } else if (a === "qup") {
        const i = ds.i !== void 0 ? +ds.i : this.selected;
        const e = queueAdd(c, i, null);
        if (e) c.msg(e);
        else if (ds.i === void 0 || this.selected === i) this.select(-1);
      } else if (a === "qdel") {
        (c.s.bq || []).splice(+ds.k, 1);
      } else if (a === "gift") {
        if (this.mode === "gift") this.mode = null;
        else {
          this.openMode("gift");
          this.giftTab = this.giftTab || "daily";
        }
      } else if (a === "gtab") this.giftTab = ds.t;
      else if (a === "claimDaily") {
        const r = claimDaily(c);
        if (r) c.msg(`\u{1F381} Tagesbelohnung: ${this.rewardStr(r.res, r.u)}`);
      } else if (a === "toggleDismiss") {
        this.showDismiss = !this.showDismiss;
      } else if (a === "openMode") {
        this.openMode(ds.m);
      } else if (a === "bossHit") {
        const f = this.form.slice(), cap = this.capSel && capFree(c, this.capSel) ? this.capSel : null, boost = mods(c).atk * capAtk(c, cap, c.tideState(0));
        this.run(async () => {
          try {
            const r = await o.bossAttack(f, boost);
            if (cap) capSend(c, cap, 30);
            this.form = zeroU();
            this.capSel = null;
            c.msg(r.killed ? "\u{1F419} Die Riesenkrake ist besiegt! Belohnungen kommen gleich." : `\u{1F419} Treffer! ${r.dmg.toLocaleString("de-DE")} Schaden \xB7 Verluste ${troopStr(r.lost)}`);
          } catch (e) {
            c.msg(e.message);
          }
        });
      } else if (a === "admBoss") {
        this.run(async () => {
          try {
            await o.adminBoss();
            this.codeMsg = { ok: true, text: "\u{1F419} Die Riesenkrake ist aufgetaucht!" };
          } catch (e) {
            this.codeMsg = { ok: false, text: e.message };
          }
        });
      } else if (a === "avOk" || a === "avNo") {
        const id = ds.id;
        this.run(async () => {
          await o.adminAvatarSet(id, a === "avOk");
        });
      } else if (a === "donPick") {
        this.donKind = ds.k;
      } else if (a === "donBack") {
        this.donKind = null;
      } else if (a === "donSend") {
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        const res = [0, 1, 2, 3].map((k2) => Math.max(0, Math.min(Math.floor(c.s.res[k2]), Math.floor(+val("dn" + k2) || 0))));
        if (!res.some((v2) => v2 > 0)) {
          c.msg("Bitte eine Menge eintragen.");
          return;
        }
        const k = this.donKind;
        this.run(async () => {
          await o.allyDonate(k, res);
          this.donKind = null;
          c.msg("\u{1F3D7}\uFE0F Danke f\xFCr deine Spende!");
        });
      } else if (a === "profile") {
        if (this.mode === "profile") this.mode = null;
        else this.openMode("profile");
      } else if (a === "avPreset") {
        c.s.avatar = ds.v;
        c.s.avatarPhoto = false;
      } else if (a === "avPhotoUse") {
        c.s.avatarPhoto = !c.s.avatarPhoto;
      } else if (a === "avUpload") {
        const f = $("#avFile");
        if (f) {
          f.value = "";
          f.click();
        }
      } else if (a === "tech") {
        startTech(c, ds.id);
      } else if (a === "boat") {
        buildBoat(c);
      } else if (a === "hire") {
        const e = hireCaptain(c, ds.id);
        if (e) c.msg(e);
      } else if (a === "capUp") {
        const e = upCaptain(c, ds.id);
        if (e) c.msg(e);
      } else if (a === "capSel") {
        this.capSel = this.capSel === ds.id ? null : ds.id;
      } else if (a === "vipChest") {
        const r = claimVipChest(c);
        if (r) c.msg(`\u{1F451} VIP-Truhe: ${this.rewardStr(r.res)} \xB7 ${itemStr(r.items)} \xB7 \u{1F396}\uFE0F${r.medals}`);
      } else if (a === "claimPass") {
        if (claimPass(c, +ds.t)) c.msg(`\u{1F3AB} Pass-Belohnung Stufe ${ds.t} erhalten!`);
      } else if (a === "dismiss") {
        c.dismiss(+ds.u, ds.n === "all" ? c.s.troops[+ds.u] : +ds.n);
      } else if (a === "claimQuest") {
        if (claimQuest(c, +ds.k)) c.msg("\u2705 Belohnung erhalten!");
      } else if (a === "trader") {
        this.openMode("trader");
      } else if (a === "trade") {
        const e = trade(c, +ds.k);
        c.msg(e || "\u26F5 Handel abgeschlossen.");
      } else if (a === "tutSkip") {
        c.s.tut = TUT.length;
      } else if (a === "warnHide") {
        this.warnHide = c.time + 90;
      } else if (a === "goto") {
        const i = +ds.i;
        this.menu = false;
        const pp = plotPos(i);
        this.w.target[0] = pp[0];
        this.w.target[2] = pp[2];
        this.w.dist = Math.min(this.w.dist, 45);
        this.select(i);
      } else if (a === "upq") c.startUpgrade(+ds.i);
      else if (a === "close") {
        if (this.view === "map") {
          if (this.mapSel || this.showReports) {
            this.mapSel = null;
            this.showReports = false;
          } else this.setView("city");
        } else {
          this.select(-1);
          this.menu = false;
          this.mode = null;
          this.o.wantChat = false;
        }
      } else if (a === "build") {
        if (c.startBuild(this.selected, v)) this.select(-1);
      } else if (a === "up") {
        if (c.startUpgrade(this.selected)) this.select(-1);
      } else if (a === "demo") {
        if (this.confirm === "demo") {
          c.demolish(this.selected);
          this.select(-1);
        } else this.confirm = "demo";
      } else if (a === "save") {
        c.save();
        c.msg("Spielstand gespeichert.");
      } else if (a === "new") {
        if (this.confirm === "new") {
          c.newGame();
          this.menu = false;
          this.confirm = null;
        } else this.confirm = "new";
      } else if (a === "train") c.startTrain(+ds.u, +ds.n);
      else if (a === "gath") {
        const id = -1e3 - this.selected;
        c.setGatherers(id, Math.max(0, c.assigned(id) + +ds.d));
      } else if (a === "f") {
        const u = +ds.u;
        this.form[u] = Math.max(0, Math.min(c.s.troops[u], this.form[u] + +ds.d));
      } else if (a === "fall") {
        this.form = c.s.troops.slice(0, 5);
      } else if (a === "f0") {
        this.form = zeroU();
      } else if (a === "send") {
        const sel = this.mapSel, f = this.form.slice();
        if (!sel) return;
        const cap = this.capSel && capFree(c, this.capSel) ? this.capSel : null;
        const boost = mods(c).atk * capAtk(c, cap, c.tideState(30)), speed = mods(c).travel * fleetSpeed(c, f) * capSpeed(c, cap);
        if (this.sea.isOnline) this.run(async () => {
          await o.sendMarch(sel.type, sel.id, f, boost, speed);
          if (cap) capSend(c, cap, 60);
          this.capSel = null;
          this.form = zeroU();
          this.mapSel = null;
          c.msg(sel.type === "player" ? "Angriff gestartet!" : "Trupp ist unterwegs.");
          await o.loadWorld();
        });
        else if (c.sendTroops(sel.id, f, this.capSel)) {
          this.form = zeroU();
          this.mapSel = null;
          this.capSel = null;
        }
      } else if (a === "sendBot") {
        const sel = this.mapSel, f = this.form.slice();
        if (sel && sendToBot(c, sel.id, f, this.capSel && capFree(c, this.capSel) ? this.capSel : null)) {
          this.form = zeroU();
          this.mapSel = null;
          this.capSel = null;
        }
      } else if (a === "speed") {
        const e = useSpeed(c, ds.k, ds.kind, +ds.t);
        if (e) c.msg(e);
      } else if (a === "scout") {
        const sel = this.mapSel;
        if (!sel) return;
        const blk = c.scoutBlocker();
        if (blk) {
          c.msg(blk);
          return;
        }
        if (this.sea.isOnline) this.run(async () => {
          await o.scout(sel.type, sel.id);
          c.payScout();
          c.msg("\u{1F52D} Sp\xE4her unterwegs \u2013 der Bericht kommt unter Berichte.");
          await o.loadWorld();
        });
        else c.sendScout(sel.id);
      } else if (a === "rally") {
        const sel = this.mapSel, f = this.form.slice(), w = +ds.w;
        if (!sel) return;
        this.run(async () => {
          await o.rallyCreate(sel.type, sel.id, f, w);
          this.form = zeroU();
          this.mapSel = null;
          c.msg(`\u2694\uFE0F Sammelangriff startet in ${w} Minuten \u2013 deine Allianz wurde benachrichtigt.`);
        });
      } else if (a === "rallyPick") {
        this.rallySel = +ds.id;
        this.form = zeroU();
      } else if (a === "rallyJoin") {
        const id = this.rallySel, f = this.form.slice();
        if (!id) return;
        this.run(async () => {
          await o.rallyJoin(id, f);
          this.rallySel = null;
          this.form = zeroU();
          c.msg("\u2694\uFE0F Du bist beim Sammelangriff dabei!");
        });
      } else if (a === "rallyBack") {
        this.rallySel = null;
      } else if (a === "helpPick") {
        this.helpTo = { id: ds.id, name: ds.n };
      } else if (a === "helpBack") {
        this.helpTo = null;
      } else if (a === "helpSend") {
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        const res = [0, 1, 2, 3].map((k) => Math.max(0, Math.min(Math.floor(c.s.res[k]), Math.floor(+val("hp" + k) || 0))));
        if (!res.some((v2) => v2 > 0)) {
          c.msg("Bitte eine Menge eintragen.");
          return;
        }
        const to = this.helpTo;
        this.run(async () => {
          await o.sendHelp(to.id, res);
          this.helpTo = null;
          c.msg(`\u{1F91D} Hilfe an ${to.name} geschickt.`);
        });
      } else if (a === "newsOk") {
        o.newsPending = null;
      } else if (a === "sound") {
        const sn = window.__game.sound;
        if (sn) {
          sn.init();
          sn.toggle();
        }
      } else if (a === "notify") {
        localStorage.setItem("pf_notify", localStorage.getItem("pf_notify") === "0" ? "1" : "0");
      } else if (a === "admBroadcast") {
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        const t = val("admText");
        if (!t) return;
        this.run(async () => {
          try {
            await o.adminBroadcast(t);
            this.codeMsg = { ok: true, text: "Nachricht an alle gesendet." };
            const e = $("#admText");
            if (e) e.value = "";
          } catch (e) {
            this.codeMsg = { ok: false, text: e.message };
          }
        });
      } else if (a === "admEvent") {
        const k = ds.k, m = +ds.m;
        this.run(async () => {
          try {
            await o.adminEvent(k, m);
            this.codeMsg = { ok: true, text: k === "stop" ? "Alle Events beendet." : "Event gestartet!" };
          } catch (e) {
            this.codeMsg = { ok: false, text: e.message };
          }
        });
      } else if (a === "admBan") {
        const id = ds.id, b = ds.b === "1";
        if (this.confirm !== "ban" + id && b) {
          this.confirm = "ban" + id;
          return;
        }
        this.confirm = null;
        this.run(async () => {
          await o.adminBan(id, b);
        });
      } else if (a === "withdraw") {
        const sel = this.mapSel;
        if (!sel) return;
        if (this.sea.isOnline) this.run(async () => {
          await o.withdraw(sel.id);
          c.msg("Besatzung kehrt heim.");
        });
        else c.withdraw(sel.id);
      } else if (a === "reports") {
        this.showReports = !this.showReports;
        this.mapSel = null;
      } else if ((a === "register" || a === "restore" || a === "offline") && !this.ageOk()) {
        return;
      } else if (a === "register") {
        const name = val("loginName");
        this.run(async () => {
          try {
            await o.register(name);
            this.showLogin(false);
            localStorage.removeItem("pf_offline");
          } catch (e) {
            $("#loginErr").textContent = e.message || "Keine Verbindung zum Server.";
          }
        });
      } else if (a === "restore") {
        const code = val("loginCode");
        this.run(async () => {
          try {
            await o.restore(code);
            this.showLogin(false);
            localStorage.removeItem("pf_offline");
          } catch (e) {
            $("#loginErr").textContent = e.message || "Keine Verbindung zum Server.";
          }
        });
      } else if (a === "loginCode") this.showLogin(true, true);
      else if (a === "loginName") this.showLogin(true, false);
      else if (a === "offline") {
        localStorage.setItem("pf_offline", "1");
        this.showLogin(false);
      } else if (a === "goOnline") {
        this.menu = false;
        this.mode = null;
        this.showLogin(true);
      } else if (a === "showCode") this.confirm = this.confirm === "code" ? null : "code";
      else if (a === "logout") {
        if (this.confirm === "logout") {
          o.logout();
          this.mode = null;
          this.confirm = null;
          c.msg("Abgemeldet. Dein Spielstand bleibt auf dem Handy.");
        } else this.confirm = "logout";
      } else if (a === "allyCreate") {
        const n = val("alName"), t = val("alTag");
        this.run(async () => {
          await o.createAlliance(n, t);
          c.msg(`Allianz ${n} gegr\xFCndet!`);
        });
      } else if (a === "allyJoin") {
        const id = ds.id;
        this.run(async () => {
          await o.joinAlliance(id);
          c.msg("Allianz beigetreten!");
        });
      } else if (a === "allyLeave") {
        if (this.confirm === "leave") {
          this.confirm = null;
          this.run(async () => {
            await o.leaveAlliance();
            c.msg("Allianz verlassen.");
          });
        } else this.confirm = "leave";
      } else if (a === "kick") {
        const id = ds.id;
        this.run(async () => {
          await o.kick(id);
        });
      } else if (a === "chat") {
        const t = val("chatIn");
        if (!t) return;
        const inp = $("#chatIn");
        if (inp) inp.value = "";
        this.run(async () => {
          await o.sendChat(t);
        });
      }
      this.panelKey = null;
    }
    costStr(cost) {
      const parts = [];
      cost.forEach((v, i) => {
        if (v > 0) parts.push(`<span style="color:${this.c.s.res[i] >= v ? RES_COL[i] : "#ff6a6a"}">${RES[i]} ${amount(v)}</span>`);
      });
      return parts.length ? parts.join(" &nbsp; ") : "kostenlos";
    }
    update(cw, ch, dt) {
      if (this.view === "map") this.sea.draw(dt, this.mapSel);
      else this.cityLabels(cw, ch);
      this.acc += dt;
      if (this.acc < 0.1) return;
      this.acc = 0;
      const c = this.c, s = c.s;
      this.cards.forEach((k, i) => {
        setHTML(k.v, amount(s.res[i]));
        const full = s.res[i] >= c.storage - 1;
        if (k.full !== full) {
          k.full = full;
          k.v.style.color = full ? "#ffc060" : "";
          k.v.title = full ? "Lager voll" : "";
        }
        const r = c.rates[i];
        setHTML(k.r, rate(r));
        k.r.style.color = r >= 0 ? "#8ef0a0" : "#ff7a7a";
      });
      const top = Math.max(c.deck + 1.5, 6);
      this.gw.style.width = `${Math.max(0, Math.min(100, c.water / top * 100))}%`;
      this.gd.style.left = `${Math.min(97, c.deck / top * 100)}%`;
      const fb = c.freeboard, fbCol = fb >= 0.5 ? "#8ef0a0" : fb >= 0 ? "#ffd27a" : "#ff6a6a";
      const tide = c.storm ? '<b style="color:#ff6060">STURMFLUT</b>' : c.water < EBB ? "Ebbe" : c.rising ? "Flut \u2191" : "Flut \u2193";
      setHTML(this.tl, `${tide} \xB7 <b style="color:${fbCol}">${fb >= 0 ? "+" : ""}${fb.toFixed(1)} m</b>${c.damHolds ? ' \xB7 <span style="color:#8ef0a0">\u{1F30A} Damm h\xE4lt</span>' : ""}${" \xB7 " + season().ic}${this.o.eventLeft("sturmflut") > 0 ? ` \xB7 <b style="color:#ff9a5a">Sturmflut-Event ${fmtTime(this.o.eventLeft("sturmflut"))}</b>` : ""}${this.o.eventLeft("doppelt") > 0 ? ' \xB7 <b style="color:#8ef0a0">\u{1F9FA} 2\xD7 Sammeln</b>' : ""}${this.o.lh && this.o.lh.bonus ? " \xB7 \u{1F5FC}+20 %" : ""}${c.stormWarning ? ' \xB7 <span style="color:#ffc060">Sturm naht</span>' : ""}${c.raidIn !== null && c.raidIn < 30 ? ' \xB7 <b style="color:#ff6060">Piraten!</b>' : ""}`);
      let st = `\u{1F465} <b>${s.survivors}</b>/${c.capacity}${s.sick ? ` \u{1F912}${s.sick}` : ""} \xB7 \u2694 <b>${uSum(s.troops)}</b> \xB7 ${s.dayTime < 0.25 || s.dayTime > 0.75 ? "\u{1F319}" : "\u2600\uFE0F"} ${clock(s.dayTime)}`;
      const vl = vipLevel(c);
      setHTML(this.vipEl, "VIP " + vl);
      this.vipEl.className = "vipb" + (vl ? "" : " v0");
      this.avaEl.classList.toggle("gold", vl >= 10);
      setHTML(this.nameEl, (this.o.active && this.o.name ? this.o.name : s.playerName || "Pfahlst\xE4dter").replace(/[&<>"]/g, ""));
      setHTML(this.aviEl, this.avatarHtml());
      if (c.raidIn !== null && this.view === "city") {
        setHTML(this.raidEl, `<span class="ri2">\u{1F3F4}\u200D\u2620\uFE0F</span><b>${fmtTime(c.raidIn)}</b><small>Piraten</small>`);
        this.raidEl.style.display = "";
        this.raidEl.classList.toggle("alarm", c.raidIn < 30);
      } else this.raidEl.style.display = "none";
      const d = /* @__PURE__ */ new Date();
      setHTML(this.clockEl, d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      if (this.o.active) st += this.o.incoming ? ` \xB7 <b style="color:#ff6060">\u26A0 Angriff!</b>` : this.o.status === "online" ? ' <span style="color:#8ef0a0">\u25CF</span>' : ' <span style="color:#ffb070">\u25CF</span>';
      setHTML(this.st, st);
      const now = c.time;
      const recent = c.log.filter((e) => now - e.t < 4).slice(-2);
      const key = recent.map((e) => e.t + e.text).join("|");
      if (key !== this.toastKey) {
        this.toastKey = key;
        this.toasts.innerHTML = "";
        for (const e of recent) this.toasts.appendChild(h("div", "toast", e.text));
      }
      const btn = (el, ic, label, sub2) => setHTML(el, `<span class="ic">${ic}</span><b>${label}</b>${sub2 ? `<span>${sub2}</span>` : ""}`);
      btn(this.bBeacon, "\u{1F4A1}", "Licht", s.beaconOn ? "an" : "aus");
      this.bBeacon.classList.toggle("on", !!s.beaconOn);
      const blk = c.expeditionBlocker();
      if (this.bExp.disabled !== !!blk) this.bExp.disabled = !!blk;
      btn(this.bExp, "\u{1F9ED}", "Watt", s.expLeft > 0 ? fmtTime(s.expLeft) : blk === "Wartet auf Ebbe" ? "bei Ebbe" : "los");
      const nm = (this.o.active ? this.o.marches.length : s.marches.length) + (s.botMarches || []).length;
      if (this.view === "map") btn(this.bMap, "\u{1F3D8}\uFE0F", "Stadt", "");
      else btn(this.bMap, "\u{1F5FA}\uFE0F", "Karte", nm ? nm + " unterw." : "");
      const al = this.o.alliances && this.o.me && this.o.me.alliance_id ? (this.o.alliances.list || []).find((x) => x.id === this.o.me.alliance_id) : null;
      btn(this.bAlly, "\u{1F91D}", "Allianz", !this.o.active ? "offline" : this.o.helpOpen ? `<i style="color:#8ef0a0">\u{1F91D} ${this.o.helpOpen}</i>` : this.o.war ? '<i style="color:#ff9a5a">\u2694\uFE0F Krieg</i>' : al ? "[" + al.tag + "]" : "");
      btn(this.bMenu, "\u2630", "Men\xFC", "");
      const tq = c.queued ? c.queued() : 0;
      btn(this.bTroops, "\u2694\uFE0F", "Truppen", this.o.active && this.o.incoming ? '<i style="color:#ff6060">Angriff!</i>' : tq ? `\u{1F393} ${tq}` : "");
      this.renderTasks();
      const nw = this.o.newsPending;
      if (nw) {
        setHTML(this.newsEl, `<div class="nh">\u{1F4E2} Nachricht vom Spielleiter</div><div>${String(nw.text).replace(/[&<>"]/g, (ch2) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch2])}</div><div class="btns"><button class="btn" data-a="newsOk"><b>OK</b></button></div>`);
        this.newsEl.style.display = "";
      } else this.newsEl.style.display = "none";
      const ds = dailyState(c), qs = questsToday(c), qready = qs.some((q) => !q.done && q.have >= q.n);
      const gready = ds.can || qready || this.passReady();
      btn(this.bGift, "\u{1F381}", "Belohn.", gready ? '<i class="dot"></i>' : "");
      this.bGift.classList.toggle("on", gready);
      const ts = tutStep(c), wn = this.warnHtml(), calm = this.view === "city" && this.panel.style.display === "none";
      this.tutEl.classList.toggle("warnmode", !!wn);
      if (wn && calm) {
        setHTML(this.tutEl, wn);
        this.tutEl.style.display = "";
      } else if (ts < TUT.length && calm) {
        setHTML(this.tutEl, `<span class="tn">Tipp ${ts + 1}/${TUT.length}</span> ${TUT[ts].text}<button class="tx" data-a="tutSkip">\u2715</button>`);
        this.tutEl.style.display = "";
      } else this.tutEl.style.display = "none";
      btn(this.bBuild, "\u{1F3D7}\uFE0F", "Geb\xE4ude", c.activeBuilds ? `\u{1F528} ${c.activeBuilds}/2` : "");
      this.renderPanel();
    }
    /// Warnung, wenn Muscheln, Wasser oder Holz bald ausgehen (mit Lösungsvorschlag)
    warnHtml() {
      const c = this.c, s = c.s;
      if (this.warnHide && c.time < this.warnHide) return "";
      const chk = (i, name, ic, t, hint) => {
        const r = c.rates[i];
        if (r >= 0 && s.res[i] > 1) return null;
        if (s.res[i] <= 1) return { text: `${ic} <b>${name} sind alle!</b> ${i === 0 ? "Das Licht ist aus." : "Notration \u2013 Siedler werden krank."} ${hint}`, t };
        const left = s.res[i] / -r;
        return left < 8 ? { text: `${ic} ${name} reichen nur noch <b>${fmtTime(left * 60)}</b>. ${hint}`, t } : null;
      };
      const w = chk(1, "Muscheln", "\u{1F9AA}", T.MUSCHEL, "Muschelbank bauen/ausbauen oder Sammler zu Muschelb\xE4nken schicken.") || chk(2, "Wasser", "\u{1F4A7}", T.REGEN, "Regenf\xE4nger bauen/ausbauen oder Sammler zu S\xFC\xDFwassert\xFCmpeln.") || (s.beaconOn ? chk(0, "Holz", "\u{1FAB5}", T.TREIBHOLZ, "Treibholz sammeln \u2013 oder das Licht ausschalten, das spart Holz.") : null);
      if (w) {
        const tgt = c.levels(w.t) > 0 ? s.plots.findIndex((p) => p.type === w.t && p.buildLeft <= 0) : -1;
        const btn = tgt >= 0 ? `<button class="btn sm2" data-a="goto" data-i="${tgt}">\u2B06 ${DEFS[w.t].name}</button>` : `<button class="btn sm2" data-a="quickbuild" data-v="${w.t}">\u{1F528} ${DEFS[w.t].name}</button>`;
        return `<span class="tn">\u26A0 Achtung</span> ${w.text}<div class="wb">${btn}</div><button class="tx" data-a="warnHide">\u2715</button>`;
      }
      if (s.sick >= 3 && c.levels(T.HEILER) <= 0) return `<span class="tn">\u26A0 Achtung</span> \u{1F912} <b>${s.sick} Kranke</b> arbeiten nicht. Eine Heilerh\xFCtte macht sie viel schneller gesund.<div class="wb"><button class="btn sm2" data-a="quickbuild" data-v="${T.HEILER}">\u{1F528} ${DEFS[T.HEILER].name}</button></div><button class="tx" data-a="warnHide">\u2715</button>`;
      if (c.freeboard < 0 && !c.damHolds) return `<span class="tn">\u26A0 Achtung</span> \u{1F30A} <b>Nasse F\xFC\xDFe!</b> Das Wasser steht \xFCber dem Deck \u2013 Siedler werden krank. Gezeitenturm ausbauen (h\xF6heres Deck) oder einen Damm bauen.<button class="tx" data-a="warnHide">\u2715</button>`;
      return "";
    }
    cityLabels(cw, ch) {
      const c = this.c, s = c.s, deck = c.deck;
      const items = [];
      for (let i = 0; i < PLOTS; i++) {
        const p = s.plots[i], el = this.labelEls[i];
        const ghost = p.type < 0 && i !== DAMM && this.w.dist < 75 && !c.buildBlocker(i, LAYOUT[i])?.match(/^(Äußerer|Gelände|Erst)/);
        if (p.type < 0 && !ghost || this.w.dist > 120 && p.buildLeft <= 0 && i !== 0) {
          el.style.display = "none";
          continue;
        }
        const pp = plotPos(i);
        const tall = i === DAMM ? c.damTop - deck + 3 : i === 0 ? towerHeight(Math.max(1, p.level)) + 5 : p.type === T.WACHTURM ? 11.5 : p.type === T.ABWEHR ? 11 : i === WALL ? 10 : 6.5;
        const sp = this.w.screenPos([pp[0], deck + tall, pp[2]], cw, ch);
        if (!sp || sp[0] < -40 || sp[0] > cw + 40 || sp[1] < 60 || sp[1] > ch - 60) {
          el.style.display = "none";
          continue;
        }
        const near = this.w.dist < 50 || i === this.selected;
        const txt = ghost ? `<span class="gh">\uFF0B ${B_IC[LAYOUT[i]]}</span>` : `<span class="li">${B_IC[p.type]}</span>${near ? " " + DEFS[p.type].name : ""}${p.level > 0 ? ` <i>${p.level}</i>` : ""}` + (p.buildLeft > 0 ? `<div class="bar"><div style="width:${(100 * (1 - p.buildLeft / Math.max(0.01, p.buildTotal))).toFixed(0)}%"></div></div><small>${fmtTime(p.buildLeft)}</small>` : "");
        if (el._t !== txt) {
          el._t = txt;
          el.innerHTML = txt;
          el.style.display = "";
          el._w = el.offsetWidth;
          el._h = el.offsetHeight;
        }
        const prio = (i === this.selected ? 0 : p.buildLeft > 0 ? 1 : ghost ? 3 : 2) * 1e6 + sp[2];
        items.push({ el, x: sp[0], y: sp[1], w: el._w || 60, h: el._h || 22, prio });
      }
      items.sort((a, b) => a.prio - b.prio);
      const placed = [];
      for (const it of items) {
        const r = { l: it.x - it.w / 2 - 2, r: it.x + it.w / 2 + 2, t: it.y - it.h / 2 - 2, b: it.y + it.h / 2 + 2 };
        const hit = placed.some((q) => r.l < q.r && r.r > q.l && r.t < q.b && r.b > q.t);
        if (hit) {
          it.el.style.display = "none";
          continue;
        }
        placed.push(r);
        it.el.style.display = "";
        it.el.style.transform = `translate(${it.x}px, ${it.y}px) translate(-50%, -50%)`;
      }
    }
    renderPanel() {
      const ae = document.activeElement;
      if (ae && ae.tagName === "INPUT" && this.panel.contains(ae)) return;
      let html = "";
      try {
        html = this.panelBody();
      } catch (e) {
        console.error(e);
        html = this.head("Hinweis") + '<div class="sm">Lade \u2026</div>';
      }
      if (html === this.panelKey || this.holding) return;
      this.panelKey = html;
      this.showPanel(html);
    }
    panelBody() {
      let html = "";
      if (this.view === "map" && this.mapSel && (this.mapSel.type === "player" || this.mapSel.type === "field") && !(this.o.world && this.o.me)) return this.head("Seekarte") + '<div class="sm">Lade Weltkarte \u2026</div>';
      if (this.view === "map") html = this.showReports ? this.reportsHtml() : this.mapSel ? this.mapSel.type === "player" ? this.playerHtml() : this.mapSel.type === "bot" ? this.botHtml() : this.mapSel.type === "boss" ? this.bossHtml() : this.mapSel.type === "field" ? this.fieldHtml() : this.terrHtml() : this.mapHtml();
      else if (this.mode === "ally") html = this.allyHtml();
      else if (this.mode === "build") html = this.buildingsHtml();
      else if (this.mode === "troops") html = this.troopsHtml();
      else if (this.mode === "gift") html = this.giftHtml();
      else if (this.mode === "research") html = this.researchHtml();
      else if (this.mode === "profile") html = this.profileHtml();
      else if (this.mode === "yard") html = this.yardHtml();
      else if (this.mode === "trader") html = this.traderHtml();
      else if (this.mode === "rank") html = this.rankHtml();
      else if (this.mode === "account") html = this.accountHtml();
      else if (this.menu) html = this.menuHtml();
      else if (this.selected >= 0) html = this.plotHtml();
      else if (this.selected <= -4e3) html = this.obstHtml();
      else if (this.selected <= -1e3) html = this.nodeHtml();
      return html;
    }
    showPanel(html) {
      const keep = {};
      this.panel.querySelectorAll("input[id], textarea[id]").forEach((e) => {
        if (e.value) keep[e.id] = e.value;
      });
      this.panel.innerHTML = html;
      for (const id in keep) {
        const e = this.panel.querySelector("#" + id);
        if (e && !e.value) e.value = keep[id];
      }
      this.panel.style.display = html ? "" : "none";
      const mini = this.view !== "map" && !this.mode && !this.menu && (this.selected >= 0 && this.c.s.plots[this.selected].type >= 0 || this.selected <= -1e3);
      this.panel.classList.toggle("mini", mini);
      this.panel.classList.toggle("seamini", this.view === "map" && !this.mapSel && !this.showReports);
      this.panel.classList.toggle("sea", this.view === "map");
      const qk = document.getElementById("quick");
      if (qk) qk.style.display = html ? "none" : "";
      const cb = document.getElementById("chatBox");
      if (cb) cb.scrollTop = cb.scrollHeight;
    }
    // ---------- Auftragsliste (Bau, Ausbildung, Märsche, Sammeln, Watt) ----------
    tasks() {
      const c = this.c, s = c.s, o = this.o, out = [];
      const pct = (left, total) => Math.max(0, Math.min(100, 100 * (1 - left / Math.max(0.01, total))));
      s.plots.forEach((p, i) => {
        if (p.type >= 0 && p.buildLeft > 0) out.push({ ic: "\u{1F528}", t: `${DEFS[p.type].name} ${p.level > 0 ? "\u2192 " + (p.level + 1) : ""}`, left: p.buildLeft, pct: pct(p.buildLeft, p.buildTotal), a: `data-a="goto" data-i="${i}"` });
      });
      if (s.train && s.train.length) {
        const q = s.train[0];
        const all = s.train.reduce((a, x, k) => a + (k === 0 ? x.left + (x.n - 1) * x.per : x.n * x.per), 0);
        out.push({ ic: "\u{1F393}", t: `${c.queued()}\xD7 Ausbildung`, left: all, pct: pct(q.left, q.per), a: 'data-a="troops"' });
      }
      (s.bq || []).forEach((q, k) => {
        const t = q.type !== null && q.type !== void 0 ? q.type : s.plots[q.plot].type;
        out.push({ ic: "\u{1F552}", t: `Wartet: ${DEFS[t].name}`, left: null, pct: null, a: `data-a="goto" data-i="${q.plot}"` });
      });
      for (const m of s.botMarches || []) out.push({ ic: m.phase === "back" ? "\u21A9\uFE0F" : "\u{1F3F4}\u200D\u2620\uFE0F", t: `${m.phase === "back" ? "Heimweg" : "Entern"} ${m.bot.name}`, left: m.left, pct: 100 * (1 - m.left / m.total), a: 'data-a="gomap"' });
      if (s.trader && s.trader.left > 0) out.push({ ic: "\u26F5", t: "H\xE4ndler am Steg", left: s.trader.left, pct: null, a: 'data-a="trader"' });
      if (s.expLeft > 0) out.push({ ic: "\u{1F9ED}", t: "Wattwanderung", left: s.expLeft, pct: pct(s.expLeft, EXP_TIME), a: "" });
      if (s.clearing) {
        const ob = (s.obst || []).find((x) => x.id === s.clearing.id);
        out.push({ ic: "\u{1F9F9}", t: `R\xE4umen: ${ob ? OBST[ob.kind].name : "Hindernis"}`, left: s.clearing.left, pct: pct(s.clearing.left, s.clearing.total), a: "" });
      }
      if (o.active) {
        const now = o.serverNow(), W = o.world || { players: [], territories: [] };
        for (const m of o.marches || []) {
          const back = m.status === "back";
          if (m.status === "gather") {
            out.push({ ic: "\u26CF", t: "Sammelt am Feld", left: Math.max(0, (Date.parse(m.gather_end) - now) / 1e3), pct: null, a: 'data-a="gomap"' });
            continue;
          }
          const left = Math.max(0, ((back ? Date.parse(m.back_at) : Date.parse(m.arrive)) - now) / 1e3);
          if (m.field_id) {
            out.push({ ic: back ? "\u21A9\uFE0F" : "\u26CF", t: back ? "Heimweg mit Ladung" : "Zum Rohstofffeld", left, pct: null, a: 'data-a="gomap"' });
            continue;
          }
          const nm = m.target_player ? (W.players.find((p) => p.id === m.target_player) || {}).name || "Stadt" : (W.territories.find((t) => t.id === m.target_terr) || {}).name || "Gebiet";
          out.push({ ic: m.kind === "scout" ? "\u{1F52D}" : back ? "\u21A9\uFE0F" : m.kind === "player" ? "\u2694\uFE0F" : "\u26F5", t: `${m.kind === "scout" ? "Sp\xE4her" : back ? "Heimweg" : m.rally_id ? "Sammelangr." : "Angriff"} ${nm}`, left, pct: null, a: 'data-a="gomap"' });
        }
        if (o.incoming) out.push({ ic: "\u26A0\uFE0F", t: "Feind greift an!", left: null, red: true, a: 'data-a="gomap"' });
        if (o.helpOpen > 0) out.unshift({ ic: "\u{1F91D}", t: `${o.helpOpen}\xD7 Hilfe gesucht \u2013 tippen`, left: null, pct: null, a: 'data-a="helpAll"' });
      } else {
        for (const m of s.marches || []) {
          const back = m.phase === "back", nm = (s.terr[m.target] || {}).name || "Gebiet";
          out.push({ ic: m.kind === "scout" ? "\u{1F52D}" : back ? "\u21A9\uFE0F" : m.kind === "attack" ? "\u2694\uFE0F" : "\u{1F6E1}\uFE0F", t: `${m.kind === "scout" ? "Sp\xE4her" : back ? "Heimweg" : m.kind === "attack" ? "Angriff" : "Verst\xE4rk."} ${nm}`, left: m.left, pct: pct(m.left, m.total), a: 'data-a="gomap"' });
        }
      }
      const by = {};
      for (const g of s.gath || []) by[g.node] = (by[g.node] || 0) + 1;
      for (const id in by) {
        const n = c.nodeById(+id);
        if (!n) {
          out.push({ ic: "\u{1F463}", t: `${by[id]} kehren heim`, left: null, a: "" });
          continue;
        }
        const L = c.gatherPath(n).L, trip = 2 * L / 2.3 + 5;
        const left = n.amount / Math.max(0.01, by[id] * c.carry / trip);
        out.push({ ic: RES_IC2[n.type], t: `${by[id]}\xD7 ${NODE_NAME[n.type]}`, left, pct: 100 * (1 - n.amount / Math.max(1, n.max)), a: `data-a="gonode" data-i="${n.id}"` });
      }
      return out;
    }
    renderTasks() {
      const el = this.tasksEl;
      if (!el || this.holding) return;
      const list = this.view === "map" ? [] : this.tasks();
      const bigPanel = this.panel.style.display !== "none" && !this.panel.classList.contains("mini");
      if (!list.length || bigPanel) {
        if (el.style.display !== "none") el.style.display = "none";
        return;
      }
      if (el.style.display === "none") el.style.display = "";
      const open = this.tasksOpen !== false;
      el.classList.toggle("shut", !open);
      const rows = list.slice(0, 7).map((t) => `<button class="tk ${t.red ? "red" : ""}" ${t.a}><div class="tr"><span class="tn">${t.ic} ${t.t}</span>${t.left !== null ? `<b>${t.pre || ""}${fmtTime(t.left)}</b>` : ""}</div>${t.pct !== null && t.pct !== void 0 ? `<div class="bar"><div style="width:${t.pct.toFixed(0)}%"></div></div>` : ""}</button>`).join("");
      const html = `<div class="tb"><div class="th">\u23F3 AUFTR\xC4GE</div>${rows}</div><div class="hd" data-a="tasks"><span>\u23F3</span><b>${list.length}</b><span>${open ? "\u25C2" : "\u25B8"}</span></div>`;
      setHTML(el, html);
    }
    head(title) {
      return `<div class="ph"><div class="pt">${title}</div><button class="x" data-a="close">\u2715</button></div>`;
    }
    // ---------- Bauplätze ----------
    plotHtml() {
      const c = this.c, i = this.selected, p = c.s.plots[i];
      if (p.type < 0) {
        if (i >= INNER && i < RING3 && c.towerLevel < OUTER_LEVEL)
          return this.head("\xC4u\xDFerer Bauplatz") + `<div class="desc">Dieser Platz liegt im \xE4u\xDFeren Ring. Er wird frei, sobald dein Gezeitenturm Stufe ${OUTER_LEVEL} erreicht.</div>`;
        if (i >= RING3 && i < WALL && c.builtCount < c.ring3Needed(i))
          return this.head("Gel\xE4nde (noch nicht erschlossen)") + `<div class="desc">Deine Warft w\xE4chst mit jedem Neubau. Dieser Platz wird frei, wenn du noch <b>${c.ring3Needed(i) - c.builtCount}</b> Geb\xE4ude baust. Gel\xE4nderadius jetzt: ${Math.round(c.areaRadius)} m.</div>`;
        const types = [LAYOUT[i]];
        let rows = "";
        for (const t of types) {
          const d2 = DEFS[t], blk = c.buildBlocker(i, t);
          rows += `<div class="row"><div class="ri"><div><b>${d2.name}</b> <span class="sh">${d2.short}</span></div>
          <div class="sm">${this.costStr(costFor(t, 1))} &nbsp;\xB7&nbsp; ${fmtTime(buildTime(t, 1))}</div>
          ${blk && blk !== "Zu wenig Rohstoffe" ? `<div class="warn">${blk}</div>` : ""}</div>
          ${QOK.includes(blk) && (c.s.bq || []).length < c.queueMax && !(c.s.bq || []).some((q) => q.plot === i) ? `<button class="btn ghost" data-a="qplot" data-v="${t}">\u{1F552} Sp\xE4ter</button>` : `<button class="btn" data-a="build" data-v="${t}" ${blk ? "disabled" : ""}>Bauen</button>`}</div>`;
        }
        const zone = i === DAMM ? "ganz au\xDFen" : i === WALL ? "Festung" : i >= TOWERS ? "auf der Mauer" : i >= RING3 ? "Warft" : i >= INNER ? "Ring 2" : "Stadtkern";
        const title = `${B_IC[LAYOUT[i]]} Bauplatz \xB7 ${zone}`;
        const intro = i === WALL ? '<div class="desc">Baue eine Mauer mit Tor rund um dein ganzes Gel\xE4nde. Sie w\xE4chst mit, wenn die Warft gr\xF6\xDFer wird.</div>' : "";
        return this.head(title) + intro + `<div class="list">${rows}</div>`;
      }
      const d = DEFS[p.type], L = p.level;
      let out = this.head(`${B_IC[p.type]} ${d.name} <span class="lv">${L > 0 ? "Stufe " + L : "im Bau"}</span>`);
      if (L > 0) {
        const inf = this.info(p.type, L);
        if (inf.length) out += `<div class="inf">${inf[0]}</div>`;
      }
      if (p.buildLeft > 0) {
        out += `<div class="bline"><div class="ri" style="flex:1">\u{1F528} ${L > 0 ? "Ausbau auf " + (L + 1) : "Bau"} \xB7 noch <b style="color:#ffd27a">${fmtTime(p.buildLeft)}</b><div class="bar"><div style="width:${(100 * (1 - p.buildLeft / Math.max(0.01, p.buildTotal))).toFixed(0)}%"></div></div></div></div>` + this.speedBtns("plot", i);
      } else if (L < MAX_LEVEL) {
        const blk = c.upgradeBlocker(i);
        out += `<div class="bline"><div class="ri" style="flex:1">\u2192 Stufe ${L + 1}: ${this.costStr(costFor(p.type, L + 1))} \xB7 \u23F1 ${fmtTime(buildTime(p.type, L + 1))}${blk && blk !== "Zu wenig Rohstoffe" ? `<div class="warn">${blk}</div>` : ""}</div>${QOK.includes(blk) && (c.s.bq || []).length < c.queueMax && !(c.s.bq || []).some((q) => q.plot === i) ? `<button class="btn ghost" data-a="qup" data-i="${i}"><b>\u{1F552} Sp\xE4ter</b></button>` : `<button class="btn" data-a="up" ${blk ? "disabled" : ""}><b>Ausbauen</b></button>`}</div>`;
      } else out += '<div class="sm">Maximale Stufe erreicht.</div>';
      const extra = [];
      if (L > 0 && p.type === T.AKADEMIE) extra.push('<button class="btn" data-a="openMode" data-m="research">\u{1F4DA} Forschung</button>');
      if (L > 0 && p.type === T.WERFT) extra.push('<button class="btn" data-a="openMode" data-m="yard">\u2693 Werft</button>');
      if (L > 0 && (p.type === T.KASERNE || p.type >= T.HARPHOF && p.type <= T.LAZARETT)) extra.push('<button class="btn ghost" data-a="troops">\u2694\uFE0F Truppen ausbilden</button>');
      if (i !== 0) extra.push(`<button class="btn ${this.confirm === "demo" ? "danger" : "ghost"}" data-a="demo" style="padding:7px 10px;font-size:12px">${this.confirm === "demo" ? "<b>Wirklich abrei\xDFen?</b>" : "Abrei\xDFen"}</button>`);
      return out + (extra.length ? `<div class="btns" style="margin-top:8px">${extra.join("")}</div>` : "");
    }
    nodeHtml() {
      const c = this.c, id = -1e3 - this.selected, n = c.nodeById(id);
      if (!n) return this.head("Sammelstelle") + '<div class="desc">Hier ist nichts mehr zu holen.</div>';
      const as = c.assigned(id), flooded = c.nodeFlooded(n);
      const path = c.gatherPath(n), trip = path.L * 2 / 2.3 + 5;
      return this.head(`${RES_IC2[n.type]} ${NODE_NAME[n.type]}`) + `<div class="desc">Schicke Bewohner los: Sie laufen durchs Tor hinaus, sammeln und tragen bis zu <b>${c.carry}</b> ${RES[n.type]} pro Gang zur\xFCck.</div>
       <div class="inf">Vorrat: <b>${Math.round(n.amount)}</b> ${RES[n.type]} \xB7 ein Gang \u2248 ${fmtTime(trip)}</div>
       <div class="inf">${flooded ? '<b style="color:#7fd3f0">\u{1F30A} \xDCberflutet</b> \u2013 erst bei Ebbe wieder erreichbar' : '<b style="color:#8ef0a0">\u2713 Erreichbar</b>' + (n.h < 0.3 ? " (liegt im Watt: nur bei Ebbe)" : " (auf einer Sandbank)")}</div>
       <div class="row"><div class="ri"><b>Sammler: ${as}</b><div class="sm">freie Bewohner: ${c.freeVillagers} \xB7 Sammler fehlen in den Geb\xE4uden</div></div>
         <button class="btn sm2" data-a="gath" data-d="-1" ${as <= 0 ? "disabled" : ""}>\u22121</button>
         <button class="btn sm2" data-a="gath" data-d="1" ${c.freeVillagers <= 0 ? "disabled" : ""}>+1</button>
         <button class="btn sm2" data-a="gath" data-d="3" ${c.freeVillagers <= 0 ? "disabled" : ""}>+3</button></div>`;
    }
    barracksHtml() {
      const c = this.c, s = c.s;
      let out = `<div class="sub2">Zu Hause: ${troopStr(s.troops)}</div>
      <div class="sm">\u{1F9AA} Unterhalt: ${Math.round(c.upkeep).toLocaleString("de-DE")} Muscheln/min (Besatzungen auf Inseln brauchen nur die H\xE4lfte) \xB7 <a data-a="toggleDismiss" style="text-decoration:underline">${this.showDismiss ? "Entlassen ausblenden" : "Krieger entlassen"}</a></div>`;
      if (s.train.length) {
        const q = s.train[0];
        out += `<div class="sm">In Ausbildung: ${s.train.map((t) => `${t.n}\xD7 ${UNITS[t.u].name}`).join(", ")} \xB7 n\xE4chster in ${fmtTime(q.left)} (${c.queued()}/${c.trainSlots()})</div>`;
        out += this.speedBtns("train", 0);
      } else out += `<div class="sm">Ausbildungsschlange leer (max. ${c.trainSlots()})</div>`;
      UNITS.forEach((u, k) => {
        const lv = c.levels(u.b), b1 = c.trainBlocker(k, 1), b5 = c.trainBlocker(k, 5), b10 = c.trainBlocker(k, 10);
        out += `<div class="row"><div class="ri"><div><b>${u.ic} ${u.name}</b> <span class="sh">\u2694${u.att} \u{1F6E1}${u.def} \u{1F392}${u.carry}</span> <span class="sh">\xB7 ${s.troops[k]} da</span></div>
        <div class="sm">${u.info}</div>
        ${lv > 0 ? `<div class="sm">je ${this.costStr(unitCost(k, 1))}</div>` : `<div class="warn">Braucht ${DEFS[u.b].name} (${B_IC[u.b]})</div>`}</div>
        ${lv > 0 ? `<button class="btn sm2" data-a="train" data-u="${k}" data-n="1" ${b1 ? "disabled" : ""}>+1</button>
        <button class="btn sm2" data-a="train" data-u="${k}" data-n="5" ${b5 ? "disabled" : ""}>+5</button>
        <button class="btn sm2" data-a="train" data-u="${k}" data-n="10" ${b10 ? "disabled" : ""}>+10</button>` : ""}</div>
        ${s.troops[k] > 0 && this.showDismiss ? `<div class="btns" style="margin:-4px 0 6px"><span class="sm">Entlassen:</span><button class="btn sm2 ghost" data-a="dismiss" data-u="${k}" data-n="10">\u221210</button><button class="btn sm2 ghost" data-a="dismiss" data-u="${k}" data-n="100">\u2212100</button><button class="btn sm2 ghost" data-a="dismiss" data-u="${k}" data-n="all">alle</button></div>` : ""}`;
      });
      return out;
    }
    info(t, L) {
      const c = this.c, d = DEFS[t];
      switch (t) {
        case T.TURM:
          return [`Deckh\xF6he der Stadt: <b>${deckFor(L).toFixed(2)} m</b> (n\xE4chste Stufe ${deckFor(L + 1).toFixed(2)} m)`, `Leuchtturm-Licht verbraucht ${Math.round(beaconWood(L) * 60)} Holz/min`, `Andere Geb\xE4ude bis Stufe ${L}`, L < OUTER_LEVEL ? `\xC4u\xDFerer Bauring ab Stufe ${OUTER_LEVEL}` : "\xC4u\xDFerer Bauring ist frei"];
        case T.HAUS:
          return [`Platz f\xFCr <b>${6 * L}</b> Siedler`];
        case T.HEILER:
          return [`Heilung etwa ${1 + 5 * L}\xD7 so schnell`, `Arbeiter: ${d.workers * L}`];
        case T.RAUCH:
          return [`Muschelverbrauch \u2212${Math.min(50, 8 * L)} %`, `Arbeiter: ${d.workers * L}`];
        case T.KUECHE:
          return [`Alle Produktion <b>+${Math.min(60, 6 * L)} %</b>`, `Arbeiter: ${d.workers * L}`];
        case T.KASERNE:
          return [`Ausbildung ${Math.round(25 * (L - 1))} % schneller \xB7 Schlange bis ${10 * L}`];
        case T.AKADEMIE:
          return [`Forscht ${10 * (L - 1)} % schneller \xB7 Forschungsstufen bis ${Math.min(TECH_MAX, Math.floor((L + 1) / 2))}`, c.s.research ? `Forscht gerade: ${TECH.find((t2) => t2.id === c.s.research.id).name} (${fmtTime(c.s.research.left)})` : "Gerade keine Forschung"];
        case T.WERFT:
          return [`Flotte: <b>${c.s.boats || 0}/${maxBoats(c)}</b> Kutter \xB7 ${(c.s.boats || 0) * BOAT_CAP} Pl\xE4tze`, "Trupps, die ganz auf die Flotte passen: \u221225 % Fahrzeit, +25 % Beute"];
        case T.WAHRZEICHEN:
          return [`Produktion <b>+${2 * L} %</b> f\xFCr dich`, `Online: +${L} % f\xFCr jedes Allianz-Mitglied`];
        case T.LAZARETT:
          return [`Rettet <b>${Math.round(lazSave(L) * 100)} %</b> der Gefallenen \xB7 ${lazBeds(L)} Betten`, `Verwundet: ${troopStr(c.s.wounded)} \xB7 Heilung ${L} alle 8 s`];
        case T.HARPHOF:
        case T.WACHSTUBE:
        case T.ENTERHALLE:
        case T.SCHLEUDER:
        case T.WATTHUETTE: {
          const k = UNITS.findIndex((u2) => u2.b === t), u = UNITS[k];
          return [`${u.ic} <b>${u.name}</b>: ${u.info}`, `Ausbildung ${10 * (L - 1)} % schneller \xB7 zu Hause: ${c.s.troops[k]}`];
        }
        case T.WACHTURM:
          return [`Verteidigung der Stadt <b>+${12 * L} %</b>`, `Aktuelle Verteidigung: <b>${c.defense}</b>`, c.raidIn !== null ? `N\xE4chster Piraten\xFCberfall in etwa ${fmtTime(c.raidIn)}` : "Piraten greifen ab Tag 2 an"];
        case T.LAGER:
          return [`Lagerplatz je Rohstoff: <b>${c.storage}</b>`];
        case T.DAMM:
          return [`Sch\xFCtzt bis Wasserstand <b>${damTopFor(L).toFixed(1)} m</b> (n\xE4chste Stufe ${damTopFor(L + 1).toFixed(1)} m)`, `Jetzt: Wasser ${c.water.toFixed(1)} m \xB7 ${c.damHolds ? '<b style="color:#8ef0a0">Damm h\xE4lt die Flut ab</b>' : c.water > c.damTop ? '<b style="color:#ff6a6a">Wasser l\xE4uft \xFCber den Damm!</b>' : "Stadt liegt trocken"}`];
        case T.MAUER:
          return [`${L <= 6 ? "Holzpalisade" : L <= 13 ? "Steinwall" : "Festungswall"} \xB7 Verteidigung <b>+${15 * L} %</b>`, `Stadtverteidigung gesamt: <b>${c.defense}</b>`, `Gel\xE4nderadius: ${Math.round(c.areaRadius)} m`];
        case T.ABWEHR:
          return [`Verteidigung <b>+${40 * L}</b>`, `Stadtverteidigung gesamt: <b>${c.defense}</b>`];
        default:
          return [
            `Produktion: <b>${Math.round(rateAt(t, L) * 60 * c.efficiency)}</b>/min ${RES[d.prod]} (Arbeit ${Math.round(c.efficiency * 100)} %)`,
            `Arbeiter: ${d.workers * L} &nbsp;\xB7&nbsp; Stufe ${L + 1}: ${Math.round(rateAt(t, L + 1) * 60)}/min`
          ];
      }
    }
    // ---------- Seekarte ----------
    troopForm(sendLabel, danger, blk, extra, act) {
      const s = this.c.s, f = this.form;
      let out = "";
      UNITS.forEach((u, k) => {
        if (!s.troops[k] && !f[k]) return;
        out += `<div class="row"><div class="ri"><b>${u.ic} ${u.name}</b> <span class="sh">${f[k]} / ${s.troops[k]}</span></div>
        <button class="btn sm2" data-a="f" data-u="${k}" data-d="-5">\u22125</button><button class="btn sm2" data-a="f" data-u="${k}" data-d="-1">\u22121</button>
        <button class="btn sm2" data-a="f" data-u="${k}" data-d="1">+1</button><button class="btn sm2" data-a="f" data-u="${k}" data-d="5">+5</button></div>`;
      });
      const caps = CAPTAINS.filter((k) => capOf(this.c, k.id));
      if (caps.length) out += `<div class="speeds"><span class="sm">\u{1F396}\uFE0F Kapit\xE4n:</span>${caps.map((k) => {
        const free = capFree(this.c, k.id);
        return `<button class="btn sm2 ${this.capSel === k.id ? "" : "ghost"}" data-a="capSel" data-id="${k.id}" ${free ? "" : "disabled"}>${k.ic} ${k.name.split(" ")[0]}${free ? "" : " \u23F3"}</button>`;
      }).join("")}</div>`;
      if (fleetFits(this.c, f)) out += '<div class="sm">\u2693 Passt auf deine Flotte: \u221225 % Fahrzeit, +25 % Beute</div>';
      if (!uSum(s.troops) && !uSum(f)) out += '<div class="sm">Keine Krieger zu Hause. Bilde sie unter \u2694\uFE0F Truppen aus.</div>';
      else if (uSum(f)) out += `<div class="sm">Trupp: ${troopStr(f)} \xB7 Beute bis ${carryOf(f)} \xB7 Tempo ${speedFactor(f) < 1 ? "schnell \u{1F3C3}" : speedFactor(f) > 1 ? "langsam \u{1FAA8}" : "normal"}</div>`;
      if (extra) out += extra;
      if (blk && blk !== "Keine Truppen ausgew\xE4hlt") out += `<div class="warn">${blk}</div>`;
      out += `<div class="btns"><button class="btn ghost" data-a="fall">Alle</button><button class="btn ghost" data-a="f0">Keine</button>
      <button class="btn ${danger ? "danger" : ""}" data-a="${act || "send"}" ${blk || this.busy ? "disabled" : ""}><b>${sendLabel}</b></button></div>`;
      return out;
    }
    tideLine(sec) {
      const c = this.c, st = c.tideState(sec), m = TIDE_MUL[String(st)];
      const eff = UNITS.map((u, i) => m[i] !== 1 ? `${u.ic}${m[i] > 1 ? "+" : "\u2212"}${Math.round(Math.abs(m[i] - 1) * 100)} %` : "").filter(Boolean).join(" ");
      return `\u{1F30A} ${sec ? "Ankunft bei" : "Jetzt"} <b>${TIDE_NAME[st]}</b>${eff ? ": " + eff : ""}`;
    }
    tideBox() {
      const c = this.c;
      return `<div class="sm tide">${this.tideLine(0)} \xB7 wechselt in ${fmtTime(c.tideChangeIn())}</div>`;
    }
    attackInfo(att, def) {
      if (def == null) return `<div class="sm">Angriffskraft: <b>${att}</b> \xB7 Verteidigung des Gegners unbekannt</div>`;
      const ch = att <= 0 ? 0 : Math.round(Math.max(0, Math.min(1, (att / Math.max(1, def) - 0.85) / 0.3)) * 100);
      return `<div class="sm">Angriffskraft: <b>${att}</b> gegen ~${Math.round(def)} \xB7 Siegchance: <b style="color:${ch >= 70 ? "#8ef0a0" : ch >= 30 ? "#ffd27a" : "#ff7a7a"}">${ch} %</b></div>`;
    }
    homeTroops(c, s, away) {
      return `<div class="inf">Zu Hause: ${troopStr(s.troops)}</div>
       <div class="inf">Unterwegs/Besatzung: ${troopStr(away)}</div>`;
    }
    mapHtml() {
      const c = this.c, s = c.s, away = c.troopsAway, o = this.o, fmtN = (n) => n.toLocaleString("de-DE");
      const st = c.tideState(0), m = TIDE_MUL[String(st)];
      const eff = UNITS.map((u, i) => m[i] !== 1 ? `${u.ic}${m[i] > 1 ? "+" : "\u2212"}${Math.round(Math.abs(m[i] - 1) * 100)}%` : "").filter(Boolean).join(" ");
      const head = `<div class="ph"><div class="pt" style="font-size:16px">\u{1F5FA}\uFE0F Seekarte</div><button class="btn sm2 ghost" data-a="reports">\u{1F4DC} ${(o.active ? o.reports : s.reports).length}</button><button class="x" data-a="close">\u2715</button></div>`;
      const line1 = `<div class="sm">\u{1F30A} <b>${TIDE_NAME[st]}</b> ${eff} \xB7 wechselt in ${fmtTime(c.tideChangeIn())}</div>`;
      let rows = [];
      if (this.sea.isOnline) {
        const now = o.serverNow();
        const tname = (mm) => mm.field_id ? "Rohstofffeld" : mm.target_player ? (o.world.players.find((p) => p.id === mm.target_player) || {}).name || "Stadt" : (o.world.territories.find((t) => t.id === mm.target_terr) || {}).name || "Gebiet";
        rows = o.marches.map((mm) => `${mm.kind === "scout" ? "\u{1F52D}" : mm.status === "gather" ? "\u26CF" : mm.status === "back" ? "\u21A9\uFE0F" : "\u26F5"} ${tname(mm)} \xB7 ${fmtTime(Math.max(0, ((mm.status === "out" ? Date.parse(mm.arrive) : mm.status === "gather" ? Date.parse(mm.gather_end) : Date.parse(mm.back_at)) - now) / 1e3))}`);
      } else if (o.active) return head + '<div class="sm">Lade Weltkarte \u2026</div>' + (o.error ? `<div class="warn">${o.error}</div>` : "");
      else rows = s.marches.map((mm) => `${mm.kind === "scout" ? "\u{1F52D}" : mm.phase === "back" ? "\u21A9\uFE0F" : "\u26F5"} ${s.terr[mm.target].name} \xB7 ${fmtTime(mm.left)}`);
      for (const mm of s.botMarches || []) rows.push(`${mm.phase === "back" ? "\u21A9\uFE0F" : "\u{1F3F4}\u200D\u2620\uFE0F"} ${mm.bot.name} \xB7 ${fmtTime(mm.left)}`);
      const owned = this.sea.isOnline ? o.owned.length : s.terr.filter((t) => t.owner === 1).length;
      const line2 = `<div class="sm">\u{1F3E0} Zu Hause <b>${fmtN(uSum(s.troops))}</b> \xB7 \u2694 unterwegs/Besatzung <b>${fmtN(uSum(away))}</b> \xB7 \u{1F6A9} <b>${owned}</b> Gebiete</div>`;
      const marches = rows.length ? `<div class="sm">${rows.slice(0, 3).join(" &nbsp;\xB7&nbsp; ")}${rows.length > 3 ? ` (+${rows.length - 3})` : ""}</div>` : "";
      return head + line1 + line2 + marches + '<div class="sm" style="opacity:.75">Tippe auf Inseln, St\xE4dte oder \u{1F3F4}\u200D\u2620\uFE0F Schiffe.</div>';
    }
    terrHtml() {
      const c = this.c, s = c.s, o = this.o, f = this.form, att = Math.round(armyStr(f, null, true));
      if (this.sea.isOnline) {
        const t2 = o.world.territories.find((x) => x.id === this.mapSel.id);
        if (!t2) return this.head("Gebiet") + '<div class="sm">Nicht gefunden.</div>';
        const me = o.me, mine = t2.owner === me.id, ally = !mine && t2.owner && me.alliance_id && t2.owner_alliance === me.alliance_id;
        const dist = Math.hypot(t2.x - me.x, t2.y - me.y), tt2 = (20 + dist * 22) * speedFactor(f);
        let out2 = this.head(t2.name) + `<div class="desc">${t2.kind} \xB7 Bonus <b>+${t2.pct} % ${RES[t2.res]}</b> \xB7 Fahrt ${fmtTime(tt2)}</div>`;
        if (mine) {
          out2 += `<div class="inf">\u{1F6A9} Dein Gebiet. Besatzung: ${troopStr(t2.gu || zeroU())}</div><div class="sm">Andere Spieler k\xF6nnen es dir abnehmen \u2013 Schildwachen verteidigen am besten, Schleuderer kaum.</div>`;
          out2 += `<div class="sub2">Verst\xE4rkung schicken</div>` + this.troopForm("Verst\xE4rken", false, this.busy ? "Bitte warten \u2026" : null);
          if (uSum(t2.gu || zeroU()) > 0) out2 += '<div class="btns"><button class="btn ghost" data-a="withdraw">Besatzung abziehen</button></div>';
          return out2;
        }
        if (ally) return out2 + `<div class="inf">\u{1F6A9} Geh\xF6rt deinem Verb\xFCndeten <b>${t2.owner_name}</b>.</div>`;
        if (t2.kind === "Leuchtturm") out2 += this.lhInfo();
        out2 += t2.owner ? `<div class="inf">\u{1F6A9} Geh\xF6rt <b>${t2.owner_name}</b> \u2013 Besatzung unbekannt</div>` : `<div class="inf">\u2620 Piraten, St\xE4rke etwa <b>${t2.strength}</b></div>`;
        const lhClosed = t2.kind === "Leuchtturm" && o.lh && !o.lh.open;
        out2 += `<div class="sub2">Angriffstrupp</div>` + this.troopForm("Angreifen!", true, lhClosed ? "Nur am Wochenende angreifbar" : null, this.attackInfo(Math.round(armyStr(f, null, true, c.tideState(tt2))), t2.owner ? null : t2.strength) + `<div class="sm">${this.tideLine(tt2)}</div>`);
        out2 += this.extraActions(lhClosed);
        return out2;
      }
      const t = s.terr[this.mapSel.id];
      if (!t) return this.head("Gebiet") + '<div class="sm">Lade \u2026</div>';
      const tt = travelTime(t) * speedFactor(f);
      let out = this.head(t.name) + `<div class="desc">${t.kind} \xB7 Ring ${t.ring} \xB7 Bonus <b>+${t.pct} % ${RES[t.res]}</b> \xB7 Fahrt ${fmtTime(tt)}</div>`;
      out += t.owner === 1 ? `<div class="inf">\u{1F6A9} Dein Gebiet. Besatzung: ${troopStr(t.gu)}</div>
        <div class="sm">Piraten versuchen ab und zu, Gebiete zur\xFCckzuerobern. Schildwachen verteidigen besonders gut.</div>` : `<div class="inf">\u2620 Piraten, St\xE4rke etwa <b>${Math.round(t.pirates)}</b></div>`;
      out += `<div class="sub2">${t.owner === 1 ? "Verst\xE4rkung schicken" : "Angriffstrupp"}</div>`;
      out += this.troopForm(t.owner === 1 ? "Verst\xE4rken" : "Angreifen!", t.owner !== 1, c.attackBlocker(t.id, f), t.owner === 1 ? "" : this.attackInfo(Math.round(armyStr(f, null, true, c.tideState(tt))), t.pirates) + `<div class="sm">${this.tideLine(tt)}</div>`);
      if (t.owner !== 1) out += this.extraActions(true);
      if (t.owner === 1 && uSum(t.gu) > 0) out += '<div class="btns"><button class="btn ghost" data-a="withdraw">Besatzung abziehen</button></div>';
      return out;
    }
    /// Beschleuniger-Knöpfe für Bau, Ausbildung, Lazarett …
    speedBtns(kind, target) {
      const it = this.c.s.items || {}, have = SPEED_KEYS.filter((k) => it[k] > 0);
      if (!have.length) return "";
      return `<div class="speeds"><span class="sm">\u26A1</span>${have.map((k) => `<button class="btn sm2 ghost" data-a="speed" data-k="${k}" data-kind="${kind}" data-t="${target}">${ITEMS[k].sec >= 3600 ? ITEMS[k].sec / 3600 + " Std" : ITEMS[k].sec / 60 + " Min"} \xD7${it[k]}</button>`).join("")}</div>`;
    }
    botHtml() {
      const c = this.c, s = c.s, f = this.form, b = (s.bots || []).find((x) => x.id === this.mapSel.id);
      if (!b) return this.head("Piratenschiff") + '<div class="sm">Das Schiff ist weitergesegelt.</div>';
      const tt = botTravel(b, f), tide = c.tideState(tt), r = botReward(b.level);
      const def = Math.round(armyStr(b.u, uSum(f) ? f : null, false, tide)), att = Math.round(armyStr(f, b.u, true, tide));
      let out = this.head(`\u{1F3F4}\u200D\u2620\uFE0F ${b.name} \xB7 Stufe ${b.level}`) + `<div class="desc">Piratenschiff. Jede Stufe ist etwas st\xE4rker \u2013 versenke es f\xFCr Beschleuniger und Beute. Fahrt ${fmtTime(tt)}</div>
       <div class="inf">Mannschaft: ${troopStr(b.u)}</div>
       <div class="sm">\u26A1 Ausdauer: <b>${stamina(c).n}/${STAM_MAX}</b>${stamina(c).next ? " \xB7 +1 in " + fmtTime(stamina(c).next) : ""}</div>
       <div class="sm">Beute: ${itemStr(r.items)} \xB7 ${r.res.map((v, i) => v ? `${RES_IC2[i]} ${v}` : "").filter(Boolean).join(" ")}${uSum(r.u) ? " \xB7 \xDCberl\xE4ufer " + troopStr(r.u) : ""}${r.big ? ' \xB7 <b style="color:#ffd27a">Schatztruhe!</b>' : ""}</div>`;
      out += `<div class="sub2">Angriffstrupp</div>` + this.troopForm("Entern!", true, botBlocker(c, b.id, f), this.attackInfo(att, def) + `<div class="sm">${this.tideLine(tt)}</div>`, "sendBot");
      return out;
    }
    itemsHtml() {
      const c = this.c, s = c.s, it = s.items || {};
      let out = `<div class="desc">Beschleuniger erbeutest du von \u{1F3F4}\u200D\u2620\uFE0F Piratenschiffen auf der Seekarte. Einsetzen kannst du sie bei Bauarbeiten (Geb\xE4ude antippen), in der Ausbildung (\u2694\uFE0F Truppen), im Lazarett und hier f\xFCr laufende Auftr\xE4ge.</div>
      <div class="inf">\u{1F3F4}\u200D\u2620\uFE0F Piratenschiffe: n\xE4chste Stufe <b>${s.botLevel || 1}</b> \xB7 Beschleuniger gesamt: <b>${speedCount(c)}</b></div>`;
      out += SPEED_KEYS.map((k) => `<div class="row"><div class="ri"><b>${ITEMS[k].ic} ${ITEMS[k].name}</b></div><b>\xD7${it[k] || 0}</b></div>`).join("");
      if (s.expLeft > 0) out += `<div class="sub2">\u{1F9ED} Wattwanderung (${fmtTime(s.expLeft)})</div>` + this.speedBtns("exp", 0);
      (s.botMarches || []).forEach((m, k) => {
        out += `<div class="sub2">\u{1F3F4}\u200D\u2620\uFE0F Trupp ${m.phase === "back" ? "auf dem Heimweg" : "zum " + m.bot.name} (${fmtTime(m.left)})</div>` + this.speedBtns("bot", k);
      });
      return out;
    }
    bossHtml() {
      const c = this.c, o = this.o, b = o.boss, I = o.bossI || {}, f = this.form;
      if (!b) return this.head("\u{1F419} Riesenkrake") + '<div class="sm">Die Krake ist abgetaucht.</div>';
      const left = (Date.parse(b.ends) - o.serverNow()) / 1e3, cd = I.cooldown || 0;
      let out = this.head(`\u{1F419} Riesenkrake \xB7 Stufe ${b.level}`) + `<div class="desc">Alle Spieler k\xE4mpfen gemeinsam! Jeder Angriff macht Schaden; deine Krieger kehren sofort zur\xFCck, etwa 12 % fallen. Ist die Krake besiegt, bekommt jeder Teilnehmer Beute \u2013 die Besten und die st\xE4rkste Allianz extra viel.</div>
      <div class="inf">\u2764\uFE0F ${b.hp.toLocaleString("de-DE")} / ${b.maxhp.toLocaleString("de-DE")} \xB7 taucht ab in ${fmtTime(Math.max(0, left))}</div><div class="bar big"><div style="width:${Math.round(100 * b.hp / b.maxhp)}%;background:#ff5a5a"></div></div>`;
      if (I.mine) out += `<div class="sm">Dein Schaden: <b>${I.mine.toLocaleString("de-DE")}</b>${cd > 0 ? ` \xB7 n\xE4chster Angriff in ${fmtTime(cd)}` : ""}</div>`;
      if ((I.players || []).length) out += '<div class="sm">\u{1F3C6} ' + I.players.slice(0, 5).map((p, i) => `${i + 1}. ${p.name} ${p.dmg.toLocaleString("de-DE")}`).join(" \xB7 ") + "</div>";
      if ((I.alliances || []).length) out += '<div class="sm">\u{1F91D} ' + I.alliances.map((a) => `[${a.tag}] ${a.dmg.toLocaleString("de-DE")}`).join(" \xB7 ") + "</div>";
      out += '<div class="sub2">Angriffstrupp</div>' + this.troopForm("Angreifen!", true, cd > 0 ? "Kurz warten \u2013 alle 5 Minuten ein Angriff" : null, `<div class="sm">Erwarteter Schaden: ~${Math.round(armyStr(f, null, true) * mods(c).atk).toLocaleString("de-DE")}</div>`, "bossHit");
      return out;
    }
    projectsHtml() {
      const o = this.o, P = o.projects || [];
      const NAMES = { deich: ["\u{1F30A} Allianz-Deich", "+0,5 m Dammschutz je Stufe f\xFCr alle"], speicher: ["\u{1F4E6} Gemeinschaftsspeicher", "+10 % Lagerplatz je Stufe"], werkstatt: ["\u{1F6E0}\uFE0F Werkstatt", "+4 % Produktion je Stufe"] };
      if (this.donKind && NAMES[this.donKind]) {
        const n = (k) => `<input class="n" id="dn${k}" type="number" min="0" inputmode="numeric" placeholder="${RES_IC2[k]} ${RES[k]}" style="flex:1 1 23%">`;
        return `<div class="sub2">Spenden f\xFCr ${NAMES[this.donKind][0]}</div><div class="form" style="flex-wrap:wrap;gap:4px">${[0, 1, 2, 3].map(n).join("")}</div>
        <div class="btns"><button class="btn" data-a="donSend" ${this.busy ? "disabled" : ""}><b>Spenden</b></button><button class="btn ghost" data-a="donBack">Zur\xFCck</button></div>`;
      }
      return '<div class="sub2">\u{1F3D7}\uFE0F Allianz-Projekte</div><div class="sm">Alle Mitglieder spenden Rohstoffe \u2013 jede Stufe gilt f\xFCr die ganze Allianz.</div>' + ["deich", "speicher", "werkstatt"].map((k) => {
        const p = P.find((x) => x.kind === k) || { level: 0, progress: 0, goal: 4e3 };
        return `<div class="row"><div class="ri"><b>${NAMES[k][0]}</b> <span class="sh">Stufe ${p.level}/10 \xB7 ${NAMES[k][1]}</span>
        ${p.level < 10 ? `<div class="bar"><div style="width:${Math.round(100 * p.progress / p.goal)}%"></div></div><div class="sm">${p.progress.toLocaleString("de-DE")} / ${p.goal.toLocaleString("de-DE")}</div>` : ""}</div>
        ${p.level < 10 ? `<button class="btn sm2" data-a="donPick" data-k="${k}">Spenden</button>` : "<b>MAX</b>"}</div>`;
      }).join("");
    }
    /// Späher und Sammelangriff (Sammelangriff nur online in einer Allianz)
    extraActions(noRally) {
      const c = this.c, o = this.o, blk = c.scoutBlocker();
      let out = `<div class="btns"><button class="btn ghost" data-a="scout" ${blk || this.busy ? "disabled" : ""}>\u{1F52D} Sp\xE4her (40 \u{1F9AA} 20 \u2699\uFE0F)</button></div>`;
      if (blk) out += `<div class="sm">${blk}</div>`;
      if (!noRally && this.sea.isOnline && o.me && o.me.alliance_id) {
        out += `<div class="sub2">\u2694\uFE0F Allianz-Sammelangriff</div><div class="sm">Starte mit dem oben gew\xE4hlten Trupp \u2013 deine Verb\xFCndeten k\xF6nnen bis zum Start Krieger dazugeben. Alle ziehen gemeinsam los.</div>
        <div class="btns">${[2, 5, 10].map((w) => `<button class="btn ghost" data-a="rally" data-w="${w}" ${uSum(this.form) && !this.busy ? "" : "disabled"}>in ${w} Min.</button>`).join("")}</div>`;
      }
      return out;
    }
    lhInfo() {
      const lh = this.o.lh || {}, nx = lh.next ? new Date(lh.next) : null;
      return `<div class="inf">\u{1F5FC} <b>Leuchtturm-Krieg</b>: Angriffe nur Samstag bis Sonntag 20 Uhr. Wer ihn dann h\xE4lt, bekommt f\xFCr sich und seine Allianz <b>eine Woche +20 % Produktion</b>.</div>
      <div class="sm">${lh.open ? '<b style="color:#ff9a5a">Jetzt ist Kampfzeit!</b>' : "Gerade Ruhezeit."}${nx ? " \xB7 Wertung " + nx.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}${lh.holder ? ` \xB7 Bonus aktuell: <b>${lh.holder}</b>` : ""}</div>`;
    }
    playerHtml() {
      const o = this.o, f = this.form, att = Math.round(armyStr(f, null, true));
      const p = o.world.players.find((x) => x.id === this.mapSel.id);
      if (!p) return this.head("Stadt") + '<div class="sm">Nicht gefunden.</div>';
      const me = o.me, ally = me.alliance_id && p.alliance_id === me.alliance_id;
      const dist = Math.hypot(p.x - me.x, p.y - me.y), tt = (20 + dist * 22) * speedFactor(f);
      let out = this.head(`\u{1F3F0} ${p.tag ? "[" + p.tag + "] " : ""}${p.name}`) + `<div class="desc">Macht \u2694 <b>${p.power}</b> \xB7 Gezeitenturm Stufe ${p.tower} \xB7 ${p.online ? '<span style="color:#8ef0a0">online</span>' : "offline"} \xB7 Fahrt ${fmtTime(tt)}</div>`;
      if (ally) return out + '<div class="inf">Verb\xFCndeter \u2013 gemeinsam seid ihr st\xE4rker!</div>';
      if (p.shield) return out + '<div class="inf">\u{1F6E1} Diese Stadt steht unter Schutz (neue Spieler 12 Std., nach einer Pl\xFCnderung 30 Min.).</div>';
      out += '<div class="sm">Siegst du, pl\xFCndern deine Truppen bis zu 20 % der Vorr\xE4te (Wattl\xE4ufer tragen am meisten, Schleuderer halbieren Mauern und T\xFCrme). Wer angreift, verliert seinen eigenen Schutz.</div>';
      out += `<div class="sub2">Angriffstrupp</div>` + this.troopForm("Stadt angreifen!", true, null, this.attackInfo(Math.round(armyStr(f, null, true, this.c.tideState(tt))), null) + `<div class="sm">${this.tideLine(tt)}</div>`);
      out += this.extraActions(false);
      return out;
    }
    reportsHtml() {
      if (this.o.active && this.o.reports) {
        const rows2 = this.o.reports.length ? this.o.reports.map((r) => {
          const d = new Date(r.at);
          return `<div class="row rep ${r.win === true ? "win" : r.win === false ? "loss" : ""}"><div class="ri"><div class="sm">${d.toLocaleDateString("de-DE")} ${d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</div>${r.text}</div>${r.rp ? `<button class="btn sm2 ghost" data-a="replay" data-id="${r.id}">\u25B6</button>` : ""}</div>`;
        }).join("") : '<div class="sm">Noch keine K\xE4mpfe.</div>';
        return this.head("Kampfberichte") + rows2;
      }
      const s = this.c.s;
      const rows = s.reports.length ? s.reports.map((r, k) => `<div class="row rep ${r.win ? "win" : "loss"}"><div class="ri"><div class="sm">Tag ${r.day} \xB7 ${clock(r.time)}</div>${r.text}</div>${r.rp ? `<button class="btn sm2 ghost" data-a="replay" data-k="${k}">\u25B6</button>` : ""}</div>`).join("") : '<div class="sm">Noch keine K\xE4mpfe.</div>';
      return this.head("Kampfberichte") + rows;
    }
    // ---------- Allianz ----------
    allyHtml() {
      const o = this.o;
      if (!o.active) return this.head("Allianz") + '<div class="desc">Allianzen gibt es im Online-Spiel. Erstelle dir ein Konto \u2013 nur ein Spielername ist n\xF6tig.</div><div class="btns"><button class="btn" data-a="goOnline">Online gehen</button></div>';
      const A = o.alliances;
      if (!A) return this.head("Allianz") + '<div class="inf">Lade \u2026</div>';
      const esc2 = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
      if (!o.me || !o.me.alliance_id) {
        const list = (A.list || []).map((a) => `<div class="row"><div class="ri"><b>[${esc2(a.tag)}] ${esc2(a.name)}</b><div class="sm">${a.members}/20 Mitglieder \xB7 Macht ${a.power}</div></div>
        <button class="btn sm2" data-a="allyJoin" data-id="${a.id}" ${a.members >= 20 || this.busy ? "disabled" : ""}>Beitreten</button></div>`).join("") || '<div class="sm">Noch keine Allianzen \u2013 gr\xFCnde die erste!</div>';
        return this.head("Allianz") + `<div class="desc">Verb\xFCndete greifen sich nicht an, sehen ihre Gebiete und haben einen gemeinsamen Chat.</div>
         <div class="sub2">Neue Allianz gr\xFCnden</div>
         <div class="form"><input id="alName" maxlength="24" placeholder="Name (3\u201324 Zeichen)"><input id="alTag" maxlength="4" placeholder="K\xFCrzel" class="short"></div>
         <div class="btns"><button class="btn" data-a="allyCreate" ${this.busy ? "disabled" : ""}>Gr\xFCnden</button></div>
         <div class="sub2">Allianzen</div>${list}`;
      }
      const mine = (A.list || []).find((a) => a.id === o.me.alliance_id) || { name: "Allianz", tag: "?", leader: null };
      const leader = mine.leader === o.me.id;
      const members = (A.members || []).map((m) => `<div class="row"><div class="ri">${m.id === mine.leader ? "\u{1F451} " : ""}<b>${esc2(m.name)}</b> <span class="sh">\u2694 ${m.power}${m.online ? " \xB7 online" : ""}</span></div>
      ${m.id !== o.me.id ? `<button class="btn sm2 ghost" data-a="helpPick" data-id="${m.id}" data-n="${esc2(m.name)}">\u{1F91D}</button>` : ""}
      ${leader && m.id !== o.me.id ? `<button class="btn sm2 ghost" data-a="kick" data-id="${m.id}">Entfernen</button>` : ""}</div>`).join("");
      const chat = o.chat.slice(-30).map((m) => `<div class="msg ${m.me ? "me" : ""} ${m.name === "System" ? "sys" : ""}"><b>${esc2(m.name)}</b> ${esc2(m.text)}</div>`).join("") || '<div class="sm">Noch keine Nachrichten.</div>';
      if (this.helpTo) {
        const n = (k, ic) => `<input class="n" id="hp${k}" type="number" min="0" inputmode="numeric" placeholder="${ic} ${RES[k]}" style="flex:1 1 23%">`;
        return this.head(`\u{1F91D} Hilfe f\xFCr ${esc2(this.helpTo.name)}`) + `<div class="desc">Schicke Rohstoffe an deinen Verb\xFCndeten \u2013 z. B. Holz f\xFCr den Damm bei einer Sturmflut. (max. 20.000 pro Stunde)</div>
        <div class="form" style="flex-wrap:wrap;gap:4px">${[0, 1, 2, 3].map((k) => n(k, RES_IC2[k])).join("")}</div>
        <div class="btns"><button class="btn" data-a="helpSend" ${this.busy ? "disabled" : ""}><b>Senden</b></button><button class="btn ghost" data-a="helpBack">Zur\xFCck</button></div>`;
      }
      if (this.rallySel) {
        const r = (o.rallies || []).find((x) => x.id === this.rallySel);
        if (!r || r.status !== "open") this.rallySel = null;
        else return this.head(`\u2694\uFE0F Sammelangriff auf ${esc2(r.target)}`) + `<div class="desc">Start in ${fmtTime(Math.max(0, (Date.parse(r.launch_at) - o.serverNow()) / 1e3))} \xB7 Anf\xFChrer ${esc2(r.leader)}</div>` + this.troopForm("Mitmachen", true, null, "", "rallyJoin") + '<div class="btns"><button class="btn ghost" data-a="rallyBack">Zur\xFCck</button></div>';
      }
      const rl = (o.rallies || []).map((r) => {
        const tot = (r.parts || []).reduce((acc, p) => acc.map((v, i) => v + (p.u[i] || 0)), zeroU());
        const left = r.status === "open" ? (Date.parse(r.launch_at) - o.serverNow()) / 1e3 : r.arrive ? (Date.parse(r.arrive) - o.serverNow()) / 1e3 : 0;
        return `<div class="row"><div class="ri"><b>\u2694\uFE0F ${esc2(r.target)}</b> <span class="sh">von ${esc2(r.leader)} \xB7 ${(r.parts || []).length} dabei</span>
        <div class="sm">${troopStr(tot)} \xB7 ${r.status === "open" ? "Start in " : "Ankunft in "}${fmtTime(Math.max(0, left))}</div></div>
        ${r.status === "open" ? `<button class="btn sm2" data-a="rallyPick" data-id="${r.id}">Mitmachen</button>` : ""}</div>`;
      }).join("");
      return this.head(`[${esc2(mine.tag)}] ${esc2(mine.name)}`) + (rl ? `<div class="sub2">\u2694\uFE0F Sammelangriffe</div>${rl}` : '<div class="sm">Sammelangriff starten: Ziel auf der \u{1F5FA}\uFE0F Karte antippen, Trupp w\xE4hlen, \u201EAllianz-Sammelangriff\u201C.</div>') + this.projectsHtml() + `<div class="sub2">Chat</div><div class="chat" id="chatBox">${chat}</div>
       <div class="form"><input id="chatIn" maxlength="200" placeholder="Nachricht an die Allianz \u2026"><button class="btn sm2" data-a="chat">Senden</button></div>
       <div class="sub2">Mitglieder (${(A.members || []).length}/20)</div>${members}
       <div class="btns"><button class="btn ${this.confirm === "leave" ? "danger" : "ghost"}" data-a="allyLeave">${this.confirm === "leave" ? "<b>Wirklich verlassen?</b>" : "Allianz verlassen"}</button></div>`;
    }
    rankHtml() {
      const r = this.o.ranking;
      if (!this.o.active) return this.head("Rangliste") + '<div class="desc">Die Rangliste gibt es im Online-Spiel.</div>';
      if (!r) return this.head("Rangliste") + '<div class="inf">Lade \u2026</div>';
      const esc2 = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
      return this.head("Rangliste") + '<div class="sm">Jeden Monat Saisonwertung: Platz 1 wird \u201EWattk\xF6nig\u201C, Platz 2 \u201EDeichgraf\u201C, Platz 3 \u201EStrandvogt\u201C, Platz 4\u201310 \u201EKapit\xE4n\u201C.</div>' + r.map((p, i) => `<div class="row ${p.me ? "meRow" : ""}"><div class="ri"><b>${i + 1}. ${p.tag ? "[" + esc2(p.tag) + "] " : ""}${esc2(p.name)}</b>${p.title ? ` <span class="title">\u{1F451} ${esc2(p.title)}</span>` : ""}<div class="sm">Macht \u2694 ${p.power} \xB7 ${p.terr} Gebiete \xB7 \u{1F3C5} ${p.badges || 0} Erfolge</div></div></div>`).join("");
    }
    accountHtml() {
      const o = this.o;
      if (!o.active) return this.head("Online-Konto") + '<div class="desc">Du spielst gerade offline. Mit einem Konto spielst du mit Freunden: Allianzen, Angriffe, gemeinsame Seekarte.</div><div class="btns"><button class="btn" data-a="goOnline">Online gehen</button></div>';
      return this.head("Online-Konto") + `<div class="inf">Spielername: <b>${o.name || "\u2026"}</b></div>
       <div class="inf">Status: <b>${o.status}</b>${o.error ? ` <span class="warn">${o.error}</span>` : ""}</div>
       <div class="desc">Mit dem <b>Umzugscode</b> holst du dein Konto auf ein neues Handy. Gib ihn niemandem \u2013 wer ihn hat, kann mit deiner Stadt spielen.</div>
       ${this.confirm === "code" ? `<div class="code">${o.token}</div>` : ""}
       <div class="btns col"><button class="btn ghost" data-a="showCode">${this.confirm === "code" ? "Code verbergen" : "Umzugscode anzeigen"}</button>
       <button class="btn ${this.confirm === "logout" ? "danger" : "ghost"}" data-a="logout">${this.confirm === "logout" ? "<b>Wirklich abmelden? Ohne Umzugscode ist das Konto weg</b>" : "Abmelden"}</button></div>`;
    }
    menuHtml() {
      const adm = this.o.active && this.o.me && this.o.me.is_admin;
      const tab = this.menuTab === "codes" ? "codes" : this.menuTab === "admin" && adm ? "admin" : "settings";
      const tl = [["settings", "\u2699\uFE0F", "Einstellungen"], ["codes", "\u{1F381}", "Codes"]].concat(adm ? [["admin", "\u{1F451}", "Spielleiter"]] : []);
      const bar = `<div class="tabs" style="grid-template-columns:repeat(${tl.length},1fr)">${tl.map(([k, ic, l]) => `<button class="tab ${k === tab ? "on" : ""}" data-a="mtab" data-t="${k}"><span>${ic}</span>${l}</button>`).join("")}</div>`;
      return this.head("Men\xFC") + bar + `<div class="tabbody">${tab === "codes" ? this.codesHtml() : tab === "admin" ? this.adminHtml() : this.settingsHtml()}</div>`;
    }
    adminHtml() {
      const o = this.o, esc2 = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
      let out = `<div class="sub2">\u{1F4E2} Nachricht an alle Spieler</div>
      <div class="form"><input id="admText" maxlength="300" placeholder="z. B. Heute Abend Leuchtturm-Krieg!"><button class="btn sm2" data-a="admBroadcast">Senden</button></div>`;
      if (this.codeMsg) out += `<div class="${this.codeMsg.ok ? "inf" : "warn"}">${this.codeMsg.text}</div>`;
      const sf = o.eventLeft("sturmflut"), dp = o.eventLeft("doppelt");
      out += `<div class="sub2">\u{1F389} Events f\xFCr alle</div>
      <div class="sm">${sf > 0 ? `\u{1F30A} Sturmflut l\xE4uft noch ${fmtTime(sf)} \xB7 ` : ""}${dp > 0 ? `\u{1F9FA} Sammel-Fest l\xE4uft noch ${fmtTime(dp)}` : ""}${!sf && !dp ? "Gerade kein Event." : ""}</div>
      <div class="btns"><button class="btn ghost" data-a="admEvent" data-k="sturmflut" data-m="10">\u{1F30A} Sturmflut 10 Min.</button><button class="btn ghost" data-a="admEvent" data-k="sturmflut" data-m="30">\u{1F30A} 30 Min.</button></div>
      <div class="btns"><button class="btn ghost" data-a="admEvent" data-k="doppelt" data-m="30">\u{1F9FA} 2\xD7 Sammeln 30 Min.</button><button class="btn ghost" data-a="admEvent" data-k="doppelt" data-m="120">\u{1F9FA} 2 Std.</button></div>
      <div class="btns"><button class="btn ghost" data-a="admEvent" data-k="stop" data-m="1">\u23F9 Alle Events beenden</button><button class="btn ghost" data-a="admBoss">\u{1F419} Krake rufen</button></div>`;
      const avq = o.avQueue || [];
      out += `<div class="sub2">\u{1F4F7} Profilbilder pr\xFCfen (${avq.length})</div>` + (avq.length ? avq.map((a) => `<div class="row"><img src="${a.data}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;margin-right:8px"><div class="ri"><b>${esc2(a.name)}</b><div class="sm">Verst\xF6\xDFt das Bild gegen Gesetze oder ist es anst\xF6\xDFig? Dann ablehnen.</div></div>
      <button class="btn sm2" data-a="avOk" data-id="${a.player}">\u2714</button><button class="btn sm2 danger" data-a="avNo" data-id="${a.player}">\u2716</button></div>`).join("") : '<div class="sm">Keine Bilder zu pr\xFCfen.</div>');
      out += '<div class="sub2">\u{1F465} Spieler</div>' + (o.players || []).map((p) => `<div class="row"><div class="ri"><b>${esc2(p.name)}</b> <span class="sh">\u2694 ${p.power}${p.admin ? " \xB7 \u{1F451}" : ""}${p.banned ? ' \xB7 <span style="color:#ff6a6a">gesperrt</span>' : ""}</span>
      <div class="sm">zuletzt ${new Date(p.seen).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div></div>
      ${p.admin ? "" : p.banned ? `<button class="btn sm2 ghost" data-a="admBan" data-id="${p.id}" data-b="0">Entsperren</button>` : `<button class="btn sm2 ${this.confirm === "ban" + p.id ? "danger" : "ghost"}" data-a="admBan" data-id="${p.id}" data-b="1">${this.confirm === "ban" + p.id ? "Sperren?" : "Sperren"}</button>`}</div>`).join("");
      return out;
    }
    codesHtml() {
      const o = this.o;
      if (!o.active) return '<div class="desc">Geschenk-Codes gibt es nur mit Online-Konto.</div><div class="btns"><button class="btn" data-a="goOnline">Online gehen</button></div>';
      let out = `<div class="sub2">Code einl\xF6sen</div>
      <div class="desc">Codes gibt es vom Spielleiter, zum Beispiel in eurer Gruppe. Jeder Code geht einmal pro Spieler.</div>
      <div class="form"><input id="codeIn" maxlength="16" placeholder="Code eingeben" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase"></div>
      <div class="btns"><button class="btn" data-a="redeem" ${this.busy ? "disabled" : ""}><b>\u{1F381} Einl\xF6sen</b></button></div>`;
      if (this.codeMsg) out += `<div class="${this.codeMsg.ok ? "inf" : "warn"}" style="margin-top:8px">${this.codeMsg.text}</div>`;
      if (o.me && o.me.is_admin) {
        const f = (id, ph, w) => `<input class="n" id="${id}" type="number" min="0" inputmode="numeric" placeholder="${ph}" style="flex:1 1 ${w || 31}%">`;
        out += `<div class="sub2" style="margin-top:14px">\u{1F451} Spielleiter: Code erstellen</div>
        <div class="form"><input id="ncCode" maxlength="16" placeholder="Code, z. B. FLUT26" autocomplete="off" style="text-transform:uppercase;width:62%"><button class="btn ghost" data-a="codeRandom" style="width:34%">Zufall</button></div>
        <div class="sm">Rohstoffe</div>
        <div class="form" style="flex-wrap:wrap;gap:4px">${f("ncR0", "\u{1FAB5} Holz", 23)}${f("ncR1", "\u{1F9AA} Muscheln", 23)}${f("ncR2", "\u{1F4A7} Wasser", 23)}${f("ncR3", "\u2699\uFE0F Metall", 23)}</div>
        <div class="sm">Krieger</div>
        <div class="form" style="flex-wrap:wrap;gap:4px">${UNITS.map((u, k) => f("ncU" + k, u.ic + " " + u.name.slice(0, 6), 18)).join("")}</div>
        <div class="form" style="gap:4px">${f("ncDays", "g\xFCltig Tage (1)", 31)}${f("ncMax", "max. Spieler (\u221E)", 31)}${f("ncVip", "\u{1F451} VIP-Punkte", 31)}</div>
        <div class="btns"><button class="btn" data-a="codeSave" ${this.busy ? "disabled" : ""}><b>Code speichern</b></button></div>`;
        const list = o.codes || [];
        out += `<div class="sub2" style="margin-top:12px">Deine Codes</div>` + (list.length ? list.map((c) => `<div class="row"><div class="ri"><b style="letter-spacing:.05em">${c.code}</b> <span class="sh">${c.active ? '<span style="color:#8ef0a0">aktiv</span>' : "abgelaufen"} \xB7 ${c.uses}${c.max ? "/" + c.max : ""}\xD7 eingel\xF6st</span>
        <div class="sm">${c.text || "\u2013"}${c.until ? " \xB7 bis " + new Date(c.until).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : " \xB7 unbegrenzt"}</div></div>
        <button class="btn sm2 ${this.confirm === "del" + c.code ? "danger" : "ghost"}" data-a="codeDel" data-c="${c.code}">${this.confirm === "del" + c.code ? "L\xF6schen?" : "\u{1F5D1}"}</button></div>`).join("") : '<div class="sm">Noch keine Codes.</div>');
      }
      return out;
    }
    ttabLoad() {
      if (this.troopTab === "rank") this.o.loadRanking();
      if (this.troopTab === "reports" && this.o.active) this.o.sync();
    }
    avatarHtml() {
      const s = this.c.s, o = this.o;
      if (s.avatarPhoto && o.avatar && o.avatar.status === "ok" && o.avatar.data) return `<img src="${o.avatar.data}" alt="">`;
      return s.avatar || "\u{1F9D1}\u200D\u2708\uFE0F";
    }
    profileHtml() {
      const c = this.c, s = c.s, o = this.o, vl = vipLevel(c), av = o.avatar || {};
      const PRE = ["\u{1F9D1}\u200D\u2708\uFE0F", "\u{1F469}\u200D\u2708\uFE0F", "\u{1F9D4}", "\u{1F469}", "\u{1F468}\u200D\u{1F9B0}", "\u{1F469}\u200D\u{1F9B3}", "\u{1F9D3}", "\u{1F466}", "\u{1F9AD}", "\u{1F419}", "\u{1F980}", "\u2693"];
      let out = this.head("Profil") + `<div class="avprev">${this.avatarHtml()}</div>
      <div class="inf" style="text-align:center"><b>${(o.active && o.name ? o.name : s.playerName || "Pfahlst\xE4dter").replace(/[&<>"]/g, "")}</b> \xB7 \u{1F451} VIP ${vl} \xB7 Macht \u2694 ${c.power}</div>
      <div class="sub2">Profilbild w\xE4hlen</div><div class="avgrid">${PRE.map((e) => `<button class="${!s.avatarPhoto && (s.avatar || "\u{1F9D1}\u200D\u2708\uFE0F") === e ? "on" : ""}" data-a="avPreset" data-v="${e}">${e}</button>`).join("")}</div>
      <div class="sub2">\u{1F4F7} Eigenes Foto ${vl >= 4 ? "" : "(ab VIP 4)"}</div>`;
      if (vl < 4) out += `<div class="sm">Ab VIP 4 kannst du ein eigenes Foto hochladen. Dir fehlen noch ${(VIP_PTS[4] - (s.vipPts || 0)).toLocaleString("de-DE")} VIP-Punkte.</div>`;
      else if (!o.active) out += '<div class="sm">Eigene Fotos gibt es nur mit Online-Konto, weil sie vor der Freischaltung gepr\xFCft werden.</div>';
      else {
        out += `<div class="sm">Erlaubt sind nur Bilder, die nicht gegen deutsches Recht versto\xDFen: keine Nacktheit, Gewalt, verbotenen Symbole, Beleidigungen oder fremden Personen ohne deren Einverst\xE4ndnis. Jedes Foto wird vor der Freischaltung gepr\xFCft.</div>`;
        if (av.status === "pending") out += '<div class="inf">\u23F3 Dein Foto wird gerade gepr\xFCft.</div>';
        else if (av.status === "rejected") out += '<div class="warn">\u274C Dein letztes Foto wurde abgelehnt. Bitte ein anderes w\xE4hlen.</div>';
        else if (av.status === "ok") out += `<div class="btns"><button class="btn ${s.avatarPhoto ? "" : "ghost"}" data-a="avPhotoUse">${s.avatarPhoto ? "\u2714 Foto wird angezeigt" : "Freigegebenes Foto anzeigen"}</button></div>`;
        if (this.avMsg) out += `<div class="${this.avMsg.ok ? "inf" : "warn"}">${this.avMsg.text}</div>`;
        out += `<div class="btns"><button class="btn" data-a="avUpload" ${this.busy ? "disabled" : ""}>\u{1F4F7} Foto hochladen</button></div>`;
      }
      return out;
    }
    /// Foto verkleinern (128×128, JPEG) und zur Prüfung schicken
    avatarFile(file) {
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        this.avMsg = { ok: false, text: "Das ist kein Bild." };
        this.panelKey = null;
        return;
      }
      if (file.size > 15e6) {
        this.avMsg = { ok: false, text: "Das Bild ist zu gro\xDF (max. 15 MB)." };
        this.panelKey = null;
        return;
      }
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const S = 128, cv = document.createElement("canvas");
        cv.width = cv.height = S;
        const k = Math.min(img.width, img.height), sx = (img.width - k) / 2, sy = (img.height - k) / 2;
        cv.getContext("2d").drawImage(img, sx, sy, k, k, 0, 0, S, S);
        URL.revokeObjectURL(url);
        const data = cv.toDataURL("image/jpeg", 0.75);
        this.run(async () => {
          try {
            await this.o.avatarUpload(data);
            this.avMsg = { ok: true, text: "\u{1F4E8} Foto hochgeladen \u2013 es wird jetzt gepr\xFCft und danach freigeschaltet." };
          } catch (e) {
            this.avMsg = { ok: false, text: e.message };
          }
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        this.avMsg = { ok: false, text: "Das Bild konnte nicht gelesen werden." };
        this.panelKey = null;
      };
      img.src = url;
    }
    vipHtml() {
      const c = this.c, L = vipLevel(c), pts = c.s.vipPts || 0;
      let out = `<div class="inf">\u{1F451} <b>VIP ${L}</b> \xB7 ${pts.toLocaleString("de-DE")} VIP-Punkte${L < 10 ? ` \xB7 noch ${(VIP_PTS[L + 1] - pts).toLocaleString("de-DE")} bis VIP ${L + 1}` : ""}</div>
      ${L < 10 ? `<div class="bar big"><div style="width:${Math.round(100 * (pts - VIP_PTS[L]) / (VIP_PTS[L + 1] - VIP_PTS[L]))}%"></div></div>` : ""}
      <div class="sm">VIP-Punkte gibt es f\xFCr die t\xE4gliche Anmeldung, Tagesaufgaben, Saison-Pass-Stufen, Piratenschiffe, Sch\xE4tze und Geschenk-Codes.</div>`;
      if (L >= 1) {
        const r = vipChest(c);
        out += `<div class="row meRow"><div class="ri"><b>\u{1F451} T\xE4gliche VIP-Truhe</b><div class="sm">${this.rewardStr(r.res)} \xB7 ${itemStr(r.items)} \xB7 \u{1F396}\uFE0F${r.medals}</div></div><button class="btn sm2" data-a="vipChest" ${vipChestCan(c) ? "" : "disabled"}>${vipChestCan(c) ? "\xD6ffnen" : "Morgen"}</button></div>`;
      } else out += '<div class="sm">Ab VIP 1 gibt es jeden Tag eine VIP-Truhe.</div>';
      for (let k = 1; k <= 10; k++) out += `<div class="row ${k === L ? "meRow" : ""}" style="${k > L ? "opacity:.6" : ""}"><div class="ri"><b>${k <= L ? "\u2714" : "\u{1F512}"} VIP ${k}</b> <span class="sh">${VIP_PTS[k].toLocaleString("de-DE")} Punkte</span><div class="sm">${VIP_PERKS[k]}</div></div></div>`;
      return out;
    }
    researchHtml() {
      const c = this.c, r = c.s.research;
      let out = this.head("\u{1F4DA} Seefahrer-Akademie") + `<div class="desc">Forschung gibt dauerhafte Boni. Es l\xE4uft immer nur eine Forschung; h\xF6here Stufen brauchen eine h\xF6here Akademie.</div>`;
      if (r) {
        const t = TECH.find((x) => x.id === r.id);
        out += `<div class="inf">Forscht: <b>${t.ic} ${t.name} ${techLv(c, r.id) + 1}</b> \xB7 noch ${fmtTime(r.left)}</div><div class="bar big"><div style="width:${Math.round(100 * (1 - r.left / r.total))}%"></div></div>` + this.speedBtns("research", 0);
      }
      for (const t of TECH) {
        const lv = techLv(c, t.id), k = lv + 1, blk = techBlocker(c, t.id);
        out += `<div class="row"><div class="ri"><b>${t.ic} ${t.name}</b> <span class="sh">${lv}/${TECH_MAX} \xB7 ${t.text} je Stufe</span>
        ${k <= TECH_MAX ? `<div class="sm">${this.costStr(techCost(t, k))} \xB7 \u23F1 ${fmtTime(techTime(c, k))}</div>${blk && !["Zu wenig Rohstoffe", "Es wird schon geforscht"].includes(blk) ? `<div class="warn">${blk}</div>` : ""}` : ""}</div>
        ${k <= TECH_MAX ? `<button class="btn sm2" data-a="tech" data-id="${t.id}" ${blk ? "disabled" : ""}>Forschen</button>` : "<b>\u2714</b>"}</div>`;
      }
      return out;
    }
    yardHtml() {
      const c = this.c, s = c.s, blk = boatBlocker(c);
      let out = this.head("\u2693 Werft") + `<div class="desc">Kutter bringen deine Trupps \xFCbers Meer. Passt ein Trupp ganz auf die Flotte (${BOAT_CAP} Krieger je Kutter), ist er 25 % schneller und bringt 25 % mehr Beute.</div>
      <div class="inf">Flotte: <b>${s.boats || 0}/${maxBoats(c)}</b> Kutter \xB7 ${(s.boats || 0) * BOAT_CAP} Pl\xE4tze</div>`;
      if (s.boatQ) out += `<div class="sm">Im Bau: Kutter \xB7 noch ${fmtTime(s.boatQ.left)}</div><div class="bar"><div style="width:${Math.round(100 * (1 - s.boatQ.left / s.boatQ.total))}%"></div></div>`;
      out += `<div class="row"><div class="ri"><b>\u26F5 Kutter bauen</b><div class="sm">${this.costStr(BOAT_COST)}</div>${blk && blk !== "Zu wenig Rohstoffe" ? `<div class="warn">${blk}</div>` : ""}</div><button class="btn sm2" data-a="boat" ${blk ? "disabled" : ""}>Bauen</button></div>`;
      return out;
    }
    captainsHtml() {
      const c = this.c, s = c.s;
      let out = `<div class="inf">\u{1F396}\uFE0F Kapit\xE4nsabzeichen: <b>${s.medals || 0}</b></div><div class="sm">Abzeichen gibt es von Piratenschiffen, Saison-Pass und VIP-Truhe. W\xE4hle beim Losschicken einen Kapit\xE4n f\xFCr den Trupp \u2013 er ist dann bis zur R\xFCckkehr unterwegs.</div>`;
      for (const k of CAPTAINS) {
        const cp = capOf(c, k.id), m = cp ? capMul(cp.lvl) : 1;
        out += `<div class="row"><div class="ri"><b>${k.ic} ${k.name}</b> ${cp ? `<span class="sh">Stufe ${cp.lvl}/10${cp.busy > Date.now() ? " \xB7 unterwegs" : ""}</span>` : ""}
        <div class="sm">${k.text}${cp && cp.lvl > 1 ? ` (\xD7${m.toFixed(1)})` : ""}</div></div>
        ${cp ? cp.lvl < 10 ? `<button class="btn sm2" data-a="capUp" data-id="${k.id}" ${(s.medals || 0) >= cp.lvl * 2 ? "" : "disabled"}>\u2B06 ${cp.lvl * 2}\u{1F396}\uFE0F</button>` : "<b>MAX</b>" : `<button class="btn sm2" data-a="hire" data-id="${k.id}" ${(s.medals || 0) >= k.cost ? "" : "disabled"}>Anheuern ${k.cost}\u{1F396}\uFE0F</button>`}</div>`;
      }
      return out;
    }
    passReady() {
      const ps = passState(this.c);
      for (let t = 1; t <= ps.tier; t++) if (!ps.got.includes(t)) return true;
      return false;
    }
    rewardStr(res, u) {
      const parts = [];
      (res || []).forEach((v, i) => v && parts.push(`${RES_IC2[i]} ${v}`));
      (u || []).forEach((v, i) => v && parts.push(`${UNITS[i].ic} ${v}`));
      return parts.join(" \xB7 ");
    }
    giftHtml() {
      const c = this.c, tab = this.giftTab || "daily";
      const ds = dailyState(c), qs = questsToday(c);
      const tabs = [["daily", "\u{1F4C5}", "T\xE4glich" + (ds.can ? " \u2022" : "")], ["quests", "\u2705", "Aufgaben" + (qs.some((q) => !q.done && q.have >= q.n) ? " \u2022" : "")], ["pass", "\u{1F3AB}", "Pass" + (this.passReady() ? " \u2022" : "")], ["vip", "\u{1F451}", "VIP " + vipLevel(c) + (vipChestCan(c) ? " \u2022" : "")], ["items", "\u26A1", `${speedCount(c)}`], ["ach", "\u{1F3C5}", `${achCount(c)}/${ACH.length}`]];
      let out = this.head("Belohnungen") + `<div class="tabs" style="grid-template-columns:repeat(6,1fr)">${tabs.map(([k, ic, l]) => `<button class="tab ${k === tab ? "on" : ""}" data-a="gtab" data-t="${k}"><span>${ic}</span>${l}</button>`).join("")}</div><div class="tabbody">`;
      if (tab === "daily") {
        out += '<div class="desc">Schau jeden Tag vorbei! Wer einen Tag ausl\xE4sst, f\xE4ngt wieder bei Tag 1 an. Tag 7 ist der gro\xDFe Schatz.</div><div class="daily">';
        for (let d = 0; d < 7; d++) {
          const r = dailyReward(c, d), st = d < ds.day || !ds.can && d === ds.day ? "got" : d === ds.day && ds.can ? "now" : "";
          out += `<div class="dd ${st} ${r.big ? "big" : ""}"><b>Tag ${d + 1}</b><div class="sm">${this.rewardStr(r.res, r.u)}</div>${st === "got" ? "<div>\u2714</div>" : ""}</div>`;
        }
        out += `</div><div class="btns"><button class="btn" data-a="claimDaily" ${ds.can ? "" : "disabled"}><b>${ds.can ? `\u{1F381} Tag ${ds.day + 1} abholen` : "Morgen wieder!"}</b></button></div>`;
      } else if (tab === "quests") {
        out += '<div class="desc">Jeden Tag 3 neue Aufgaben.</div>';
        qs.forEach((q, k) => {
          out += `<div class="row"><div class="ri"><div><b>${q.done ? "\u2714 " : ""}${q.text}</b></div><div class="sm">${Math.min(q.have, q.n)}/${q.n} \xB7 Belohnung ${this.rewardStr(q.rw)}</div>
          <div class="bar"><div style="width:${Math.round(100 * Math.min(1, q.have / q.n))}%"></div></div></div>
          <button class="btn sm2" data-a="claimQuest" data-k="${k}" ${q.done || q.have < q.n ? "disabled" : ""}>${q.done ? "Erledigt" : "Abholen"}</button></div>`;
        });
      } else if (tab === "vip") {
        out += this.vipHtml();
      } else if (tab === "pass") {
        const ps = passState(c), mon = (/* @__PURE__ */ new Date()).toLocaleString("de-DE", { month: "long" });
        out += `<div class="desc">\u{1F3AB} Saison-Pass ${mon} \u2013 kostenlos! Erfahrung gibt es f\xFCr Bauen, Ausbilden, Sammeln, K\xE4mpfe, Piratenschiffe, Handel, Sch\xE4tze und die Tagesbelohnung. Jeden Monat beginnt ein neuer Pass.</div>
        <div class="inf">Stufe <b>${ps.tier}/${PASS_TIERS}</b> \xB7 ${ps.tier < PASS_TIERS ? `${Math.floor(ps.into)}/${PASS_XP} EP bis Stufe ${ps.tier + 1}` : "Alles geschafft!"}</div><div class="bar big"><div style="width:${Math.round(100 * Math.min(1, ps.into / PASS_XP))}%"></div></div>`;
        for (let t = 1; t <= PASS_TIERS; t++) {
          const r = passReward(c, t), got = ps.got.includes(t), can = t <= ps.tier && !got;
          out += `<div class="row ${t % 5 === 0 ? "meRow" : ""}"><div class="ri"><b>Stufe ${t}</b> <span class="sh">${[this.rewardStr(r.res, r.u), itemStr(r.items)].filter(Boolean).join(" \xB7 ")}</span></div>
          <button class="btn sm2" data-a="claimPass" data-t="${t}" ${can ? "" : "disabled"}>${got ? "\u2714" : t <= ps.tier ? "Abholen" : "\u{1F512}"}</button></div>`;
        }
      } else if (tab === "items") {
        out += this.itemsHtml();
      } else {
        const got = c.s.ach || {};
        out += '<div class="achs">' + ACH.map((a) => `<div class="ach ${got[a.id] ? "on" : ""}"><span>${a.ic}</span><b>${a.name}</b><div class="sm">${a.text}</div></div>`).join("") + "</div>";
        if (this.o.active) out += '<div class="sm">Deine Erfolge sehen auch andere Spieler in der Rangliste.</div>';
      }
      return out + "</div>";
    }
    traderHtml() {
      const c = this.c, tr = c.s.trader;
      if (!tr || tr.left <= 0) return this.head("\u26F5 H\xE4ndlerschiff") + `<div class="desc">Gerade liegt kein Schiff am Steg. N\xE4chstes in etwa ${fmtTime(tr ? tr.next : 60)}.</div>`;
      let out = this.head("\u26F5 H\xE4ndlerschiff") + `<div class="desc">Der H\xE4ndler legt in <b>${fmtTime(tr.left)}</b> wieder ab. Jedes Angebot gilt einmal.</div>`;
      tr.offers.forEach((o, k) => {
        const get = o.unit !== void 0 ? `${UNITS[o.unit].ic} ${o.rn} ${UNITS[o.unit].name}` : `${RES_IC2[o.get]} ${o.rn} ${RES[o.get]}`;
        out += `<div class="row"><div class="ri"><b>${RES_IC2[o.give]} ${o.gn} ${RES[o.give]}</b> \u2192 <b>${get}</b></div>
        <button class="btn sm2" data-a="trade" data-k="${k}" ${o.used || c.s.res[o.give] < o.gn ? "disabled" : ""}>${o.used ? "\u2714" : "Tauschen"}</button></div>`;
      });
      return out;
    }
    troopsHtml() {
      const tab = this.troopTab || "truppen";
      const tabs = [["truppen", "\u2694\uFE0F", "Truppen"], ["caps", "\u{1F396}\uFE0F", "Kapit\xE4ne"], ["reports", "\u{1F4DC}", "Berichte"], ["rank", "\u{1F3C6}", "Rangliste"]];
      const bar = `<div class="tabs" style="grid-template-columns:repeat(4,1fr)">${tabs.map(([k, ic, l]) => `<button class="tab ${k === tab ? "on" : ""}" data-a="ttab" data-t="${k}"><span>${ic}</span>${l}</button>`).join("")}</div>`;
      const strip = (x) => x.replace(/^<div class="ph">[\s\S]*?<\/button><\/div>/, "");
      const body = tab === "reports" ? strip(this.reportsHtml()) : tab === "rank" ? strip(this.rankHtml()) : tab === "caps" ? this.captainsHtml() : this.troopsTabHtml();
      return this.head("Truppen") + bar + `<div class="tabbody">${body}</div>`;
    }
    freePlotQueue(t) {
      const c = this.c, s = c.s, q = s.bq || [];
      for (let i = 1; i < s.plots.length; i++) if (s.plots[i].type < 0 && !q.some((x) => x.plot === i)) {
        const b = c.buildBlocker(i, t);
        if (!b || QOK.includes(b)) return i;
      }
      return -1;
    }
    freePlotFor(t) {
      const c = this.c, s = c.s;
      const order = [];
      for (let i = 1; i < s.plots.length; i++) order.push(i);
      for (const i of order) if (s.plots[i].type < 0 && !c.buildBlocker(i, t)) return i;
      return -1;
    }
    buildingsHtml() {
      const c = this.c, tab = this.buildTab || "mine";
      const bar = `<div class="tabs two">${[["mine", "\u{1F3D8}\uFE0F", "Meine Geb\xE4ude"], ["new", "\u2795", "Neu bauen"]].map(([k, ic, l]) => `<button class="tab ${k === tab ? "on" : ""}" data-a="btab" data-t="${k}"><span>${ic}</span>${l}</button>`).join("")}</div>`;
      let body;
      if (tab === "mine") body = this.cityOverviewHtml();
      else {
        const types = [...CITY_TYPES, T.MAUER, T.ABWEHR, T.DAMM];
        const groups = [["Rohstoffe", [T.TREIBHOLZ, T.MUSCHEL, T.REGEN, T.TAUCHER]], ["Wohnen & Versorgung", [T.HAUS, T.HEILER, T.RAUCH, T.KUECHE, T.LAGER]], ["Milit\xE4r", [T.KASERNE, T.HARPHOF, T.WACHSTUBE, T.ENTERHALLE, T.SCHLEUDER, T.WATTHUETTE, T.LAZARETT]], ["Verteidigung", [T.WACHTURM, T.MAUER, T.ABWEHR]], ["Schutz vor der Flut", [T.DAMM]], ["Wissen & Seefahrt", [T.AKADEMIE, T.WERFT, T.WAHRZEICHEN]]];
        body = `<div class="sm">Bautrupps: <b>${c.activeBuilds}/2</b> besch\xE4ftigt. Der Platz wird automatisch gew\xE4hlt.</div>`;
        for (const [title, list] of groups) {
          body += `<div class="sub2">${title}</div>`;
          for (const t of list) {
            if (!types.includes(t)) continue;
            const d = DEFS[t], free = this.freePlotFor(t);
            const slots = LAYOUT.filter((x) => x === t).length, have = c.s.plots.filter((p) => p.type === t).length;
            let why = "";
            if (free < 0) {
              if (c.activeBuilds >= c.maxBuilds) why = "Alle Bautrupps besch\xE4ftigt";
              else if (!c.canAfford(costFor(t, 1))) why = "";
              else if (t === T.MAUER) why = c.levels(T.MAUER) > 0 || c.s.plots[WALL].type >= 0 ? "Schon gebaut \u2013 Ausbau unter \u201EMeine Geb\xE4ude\u201C" : "Nicht m\xF6glich";
              else if (t === T.DAMM) why = c.s.plots[DAMM].type >= 0 ? "Schon gebaut \u2013 Ausbau unter \u201EMeine Geb\xE4ude\u201C" : "Nicht m\xF6glich";
              else if (t === T.ABWEHR && c.levels(T.MAUER) <= 0) why = "Erst die Festungsmauer bauen";
              else if (have >= slots) why = "Alle Pl\xE4tze bebaut \u2013 baue die vorhandenen aus";
              else why = c.towerLevel < OUTER_LEVEL ? `N\xE4chster Platz ab Gezeitenturm Stufe ${OUTER_LEVEL} bzw. wenn die Warft w\xE4chst` : "N\xE4chster Platz wird frei, wenn die Warft w\xE4chst";
            }
            body += `<div class="row"><div class="ri"><div><b>${B_IC[t]} ${d.name}</b> <span class="sh">${have}/${slots} \xB7 ${d.short}</span></div>
            <div class="sm">${this.costStr(costFor(t, 1))} \xB7 ${fmtTime(buildTime(t, 1))}</div>${why ? `<div class="warn">${why}</div>` : ""}</div>
            ${free < 0 && this.freePlotQueue(t) >= 0 && (c.s.bq || []).length < c.queueMax ? `<button class="btn sm2 ghost" data-a="qbuild" data-v="${t}">\u{1F552} Sp\xE4ter</button>` : `<button class="btn sm2" data-a="quickbuild" data-v="${t}" ${free < 0 ? "disabled" : ""}>Bauen</button>`}</div>`;
          }
        }
      }
      return `<div class="ph"><div class="pt">\u{1F3D7}\uFE0F Geb\xE4ude</div><button class="x" data-a="close">\u2715</button></div>${bar}<div class="tabbody">${body}</div>`;
    }
    cityOverviewHtml() {
      const c = this.c, s = c.s;
      const groups = [
        ["Herz der Stadt", [T.TURM]],
        ["Rohstoffe", [T.TREIBHOLZ, T.MUSCHEL, T.REGEN, T.TAUCHER]],
        ["Wohnen & Versorgung", [T.HAUS, T.HEILER, T.RAUCH, T.KUECHE, T.LAGER]],
        ["Milit\xE4r", [T.KASERNE, T.HARPHOF, T.WACHSTUBE, T.ENTERHALLE, T.SCHLEUDER, T.WATTHUETTE, T.LAZARETT]],
        ["Verteidigung", [T.WACHTURM, T.MAUER, T.ABWEHR]],
        ["Schutz vor der Flut", [T.DAMM]],
        ["Wissen & Seefahrt", [T.AKADEMIE, T.WERFT, T.WAHRZEICHEN]]
      ];
      let out = `<div class="sm">Bautrupps: <b>${c.activeBuilds}/2</b> besch\xE4ftigt \xB7 Gel\xE4nde ${Math.round(c.areaRadius)} m \xB7 freie Bewohner ${c.freeVillagers}</div>`;
      for (const [title, types] of groups) {
        const rows = [];
        s.plots.forEach((p, i) => {
          if (p.type < 0 || !types.includes(p.type)) return;
          const blk = c.upgradeBlocker(i);
          const state = p.buildLeft > 0 ? `<span class="sh">\u{1F528} ${fmtTime(p.buildLeft)}</span>` : "";
          rows.push(`<div class="row"><div class="ri"><b>${B_IC[p.type]} ${DEFS[p.type].name}</b> <i class="lv">${p.level || "\u2013"}</i> ${state}
          ${p.buildLeft <= 0 && p.level < MAX_LEVEL ? `<div class="sm">\u2192 ${p.level + 1}: ${this.costStr(costFor(p.type, p.level + 1))}</div>` : ""}</div>
          <button class="btn sm2 ghost" data-a="goto" data-i="${i}">Zeigen</button>
          ${p.buildLeft <= 0 && p.level < MAX_LEVEL ? QOK.includes(blk) && (c.s.bq || []).length < c.queueMax && !(c.s.bq || []).some((q) => q.plot === i) ? `<button class="btn sm2 ghost" data-a="qup" data-i="${i}">\u{1F552}</button>` : `<button class="btn sm2" data-a="upq" data-i="${i}" ${blk ? "disabled" : ""}>\u2B06</button>` : ""}</div>`);
        });
        if (rows.length) out += `<div class="sub2">${title}</div>` + rows.join("");
      }
      const free = s.plots.findIndex((p, i) => i > 0 && i < WALL && p.type < 0 && !c.buildBlocker(i, LAYOUT[i])?.startsWith("Gel\xE4nde") && !c.buildBlocker(i, LAYOUT[i])?.startsWith("\xC4u\xDFerer"));
      out += `<div class="sm" style="margin-top:10px">Neu bauen: Reiter \u201ENeu bauen\u201C oder in der Stadt auf eine freie Plattform tippen.${free > 0 ? "" : " Gerade ist kein Platz frei."}</div>`;
      if (free > 0) out += `<div class="btns"><button class="btn ghost" data-a="goto" data-i="${free}">Freien Bauplatz zeigen</button></div>`;
      return out;
    }
    troopsTabHtml() {
      const c = this.c, s = c.s, away = c.troopsAway;
      let out = `<div class="inf">Verteidigung der Stadt: <b>${c.defense}</b> \xB7 Macht \u2694 <b>${c.power}</b></div>
      <div class="inf">Unterwegs/Besatzung: ${troopStr(away)}</div>`;
      if (c.raidIn !== null) out += `<div class="sm">N\xE4chster Piraten\xFCberfall in etwa ${fmtTime(c.raidIn)}</div>`;
      out += this.tideBox();
      {
        const se = season();
        out += `<div class="sm">${se.ic} <b>${se.name}</b>: ${se.text} \xB7 noch ${fmtTime(se.left)}</div>`;
      }
      if (uSum(s.wounded || zeroU())) out += `<div class="inf">\u{1FA79} Im Lazarett: ${troopStr(s.wounded)} \u2013 werden nach und nach gesund.</div>` + this.speedBtns("heal", 0);
      else if (c.levels(T.LAZARETT) <= 0) out += '<div class="sm">Tipp: Ein \u{1FA79} Lazarett rettet einen Teil der gefallenen Krieger.</div>';
      if (c.levels(T.KASERNE) > 0) out += this.barracksHtml();
      else out += `<div class="inf">Zu Hause: ${troopStr(s.troops)}</div><div class="desc">F\xFCr Truppen brauchst du die <b>Kaserne</b> und f\xFCr jeden Krieger seine <b>Ausbildungsst\xE4tte</b>. Baue sie unter <b>\u{1F3D7}\uFE0F Geb\xE4ude \u2192 Neu bauen</b>.</div>`;
      out += `<div class="sm" style="margin-top:8px">St\xE4rken: \u{1F531} schl\xE4gt \u{1F5E1}\uFE0F \xB7 \u{1F6E1}\uFE0F schl\xE4gt \u{1F531} \xB7 \u{1F5E1}\uFE0F schl\xE4gt \u{1FAA8} und \u{1F3C3} \xB7 \u{1FAA8} schl\xE4gt \u{1F6E1}\uFE0F und Mauern. Mische deine Truppen passend zum Gegner!<br>\u{1F30A} Bei Ebbe sind Wattl\xE4ufer stark und Enterer schw\xE4cher, bei Flut gl\xE4nzen Enterer und Harpuniere. Plane deine Ankunftszeit!</div>`;
      out += '<div class="btns"><button class="btn" data-a="map">\u{1F5FA}\uFE0F Seekarte \xF6ffnen</button></div>';
      return out;
    }
    settingsHtml() {
      const g = this.g, o = this.o;
      const acc = !o.active ? `<div class="inf">Online-Konto: <b>offline</b></div><div class="btns"><button class="btn" data-a="goOnline">Online gehen</button></div>` : `<div class="inf">Online als <b>${o.name || "\u2026"}</b> \xB7 ${o.status === "online" ? '<span style="color:#8ef0a0">verbunden</span>' : '<span style="color:#ffb070">' + o.status + "</span>"}</div>
         ${this.confirm === "code" ? `<div class="code">${o.token}</div><div class="sm">Gib den Code niemandem \u2013 damit holst du dein Konto auf ein neues Handy.</div>` : ""}
         <div class="btns"><button class="btn ghost" data-a="showCode">${this.confirm === "code" ? "Code verbergen" : "Umzugscode"}</button>
         <button class="btn ${this.confirm === "logout" ? "danger" : "ghost"}" data-a="logout">${this.confirm === "logout" ? "<b>Wirklich abmelden?</b>" : "Abmelden"}</button></div>`;
      const snd = window.__game && window.__game.sound, nat = !!window.PfNative, nOn = localStorage.getItem("pf_notify") !== "0";
      const extra = `<div class="sub2">Ton & Meldungen</div>
      <div class="btns"><button class="btn ghost" data-a="sound">${snd && snd.on ? "\u{1F50A} Ton an" : "\u{1F507} Ton aus"}</button>
      <button class="btn ghost" data-a="notify" ${nat ? "" : "disabled"}>${nOn ? "\u{1F514} Benachrichtigungen an" : "\u{1F515} Benachrichtigungen aus"}</button></div>
      ${nat ? '<div class="sm">Meldet sich, wenn Bauten fertig sind, Truppen zur\xFCckkommen oder der H\xE4ndler da ist \u2013 auch wenn das Spiel geschlossen ist.</div>' : '<div class="sm">Benachrichtigungen gibt es mit der neuen App-Version (einmal neu installieren).</div>'}`;
      return extra + `<div class="sub2">Grafik</div>
       <div class="inf">${g.auto ? "Automatisch \u2192 " : ""}<b>${TIERS[g.tier]}</b> \xB7 ${g.res[0]} \xD7 ${g.res[1]} \xB7 ${Math.round(g.fpsShown)} FPS</div>
       <div class="btns"><button class="btn" data-a="gfx">Grafik umschalten</button></div>
       <div class="sub2">Konto</div>${acc}
       <div class="sub2">Spielstand</div>
       <div class="btns"><button class="btn ghost" data-a="save">Speichern</button>
       <button class="btn ${this.confirm === "new" ? "danger" : "ghost"}" data-a="new">${this.confirm === "new" ? "<b>Wirklich neu anfangen?</b>" : "Neues Spiel"}</button></div>
       <div class="sm" style="margin-top:10px">Version ${this.version.name}${this.version.channel === "public" ? "" : " (Testversion)"} \xB7 Updates werden beim Start automatisch geladen.</div>`;
    }
  };
  installUI2(UI);

  // src/online.js
  var SERVER = "https://qoatkmjobrlnqadsfmhs.supabase.co";
  var KEY2 = "sb_publishable_J84AUIbZnb_CZuak5SiKRg_f5nLkn1w";
  var ERR = {
    NAME_VERGEBEN: "Dieser Name ist schon vergeben.",
    NAME_LAENGE: "Der Name braucht 3 bis 16 Zeichen.",
    TAG_LAENGE: "Das K\xFCrzel braucht 2 bis 4 Zeichen.",
    NICHT_ANGEMELDET: "Anmeldung ung\xFCltig. Bitte neu anmelden oder Umzugscode pr\xFCfen.",
    KEINE_TRUPPEN: "Keine Truppen ausgew\xE4hlt.",
    ZU_WENIG_TRUPPEN: "So viele Truppen hast du nicht zu Hause.",
    ZU_VIELE_MAERSCHE: "H\xF6chstens 5 Trupps gleichzeitig unterwegs.",
    VERBUENDET: "Verb\xFCndete kann man nicht angreifen.",
    GESCHUETZT: "Diese Stadt steht gerade unter Schutz.",
    UNBEKANNT: "Ziel nicht gefunden.",
    SCHON_IN_ALLIANZ: "Du bist schon in einer Allianz.",
    ALLIANZ_VERGEBEN: "Name oder K\xFCrzel ist schon vergeben.",
    ALLIANZ_VOLL: "Diese Allianz ist voll (max. 20).",
    KEINE_ALLIANZ: "Du bist in keiner Allianz.",
    NICHT_ANFUEHRER: "Nur der Anf\xFChrer darf das.",
    NICHT_MOEGLICH: "Das geht gerade nicht.",
    TEXT_LAENGE: "Nachricht: 1 bis 200 Zeichen.",
    ZU_SCHNELL: "Bitte kurz warten.",
    KEIN_ADMIN: "Nur der Spielleiter darf Codes erstellen.",
    CODE_FORMAT: "Code: 4 bis 16 Buchstaben oder Zahlen, ohne Leerzeichen.",
    LEER: "Bitte eine Belohnung eintragen.",
    UNGUELTIG: "Ung\xFCltige Eingabe.",
    KEINE_KRAKE: "Gerade ist keine Riesenkrake da.",
    VIP4: "Eigene Fotos gibt es ab VIP 4.",
    BILD: "Das Bild ist ung\xFCltig oder zu gro\xDF.",
    GESPERRT: "Dieses Konto wurde vom Spielleiter gesperrt.",
    HILFE_LIMIT: "H\xF6chstens 20.000 Rohstoffe Hilfe pro Stunde.",
    ZU_WENIG: "So viel hast du nicht.",
    KEINE_KAEMPFE: "F\xFCr heute sind alle Arena-K\xE4mpfe verbraucht. Morgen geht es weiter!",
    SCHON_ABGEHOLT: "Heute schon abgeholt.",
    NUR_ANFUEHRER: "Nur der Anf\xFChrer kann einen Krieg erkl\xE4ren.",
    SCHON_IM_KRIEG: "Eine der beiden Allianzen ist schon im Krieg.",
    PAUSE: "Nach einem Krieg ist 12 Stunden Pause.",
    BURG_VOLL: "Die Allianzburg ist voll.",
    NICHT_VERBUENDET: "Nur an Mitglieder deiner Allianz.",
    ZU_FRUEH: "Du hast gerade erst um Verst\xE4rkung gebeten (alle 10 Minuten m\xF6glich).",
    SCHON_UNTERWEGS: "Zu diesem Feld ist schon ein Trupp von dir unterwegs.",
    NUR_WOCHENENDE: "Um den Gro\xDFen Leuchtturm wird nur am Wochenende gek\xE4mpft (Samstag 0 Uhr bis Sonntag 20 Uhr)."
  };
  var Online = class {
    constructor(colony) {
      this.c = colony;
      this.token = localStorage.getItem("pf_token");
      this.name = localStorage.getItem("pf_name");
      this.status = this.token ? "verbinde" : "aus";
      this.error = "";
      this.queue = Promise.resolve();
      this.me = null;
      this.world = null;
      this.marches = [];
      this.reports = [];
      this.owned = [];
      this.incoming = 0;
      this.offset = 0;
      this.lastReport = +(localStorage.getItem("pf_lastrep") || 0);
      this.chat = [];
      this.chatAfter = 0;
      this.alliances = null;
      this.ranking = null;
      this.t = { sync: 99, world: 99, chat: 99, all: 99 };
      this.wantWorld = false;
      this.wantChat = false;
    }
    get active() {
      return !!this.token;
    }
    serverNow() {
      return Date.now() - this.offset;
    }
    /// Aufrufe nacheinander ausführen; args als Funktion = erst beim Ausführen auswerten
    call(fn, args) {
      const run = async () => {
        const body = JSON.stringify(typeof args === "function" ? args() : args);
        const r = await fetch(`${SERVER}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: KEY2, "Content-Type": "application/json" }, body });
        const txt = await r.text();
        let data = null;
        try {
          data = txt ? JSON.parse(txt) : null;
        } catch (e) {
          data = null;
        }
        if (!r.ok) {
          const code = data && data.message || "FEHLER";
          const e = new Error(ERR[code] || "Serverfehler: " + code);
          e.code = code;
          throw e;
        }
        return data;
      };
      const p = this.queue.then(run, run);
      this.queue = p.catch(() => {
      });
      return p;
    }
    newToken() {
      const a = new Uint8Array(24);
      crypto.getRandomValues(a);
      return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
    }
    saveLogin() {
      if (this.token) localStorage.setItem("pf_token", this.token);
      else localStorage.removeItem("pf_token");
      if (this.name) localStorage.setItem("pf_name", this.name);
      else localStorage.removeItem("pf_name");
    }
    async register(name) {
      const token = this.newToken();
      const r = await this.call("register", { p_name: name, p_token: token });
      this.token = token;
      this.name = r.name;
      this.saveLogin();
      this.c.msg(`Willkommen, ${r.name}! Du bist jetzt online.`);
      await this.sync();
    }
    async restore(code) {
      const old = this.token;
      this.token = code.trim();
      try {
        await this.sync(true);
        this.name = this.me.name;
        this.saveLogin();
        this.c.msg(`Konto ${this.name} \xFCbernommen.`);
      } catch (e) {
        this.token = old;
        throw e;
      }
    }
    logout() {
      this.token = null;
      this.name = null;
      this.me = null;
      this.world = null;
      this.saveLogin();
      this.status = "aus";
    }
    snapshot() {
      const c = this.c, s = c.s;
      return { form: formOf(c), gcap: gcapOf(c), power: c.power, tower: c.towerLevel, u: s.troops.slice(0, 5), laz: c.levels(20), vip: vipLevel(c), lm: c.levels(23), ach: Object.keys(s.ach || {}).length, h: s.troops[0], w: s.troops[1], def: c.defense, res: s.res.map((v) => Math.floor(v)) };
    }
    async sync(strict) {
      if (!this.token) return;
      try {
        const r = await this.call("sync", () => ({ p_token: this.token, p_snap: this.snapshot() }));
        this.offset = Date.now() - Date.parse(r.now);
        this.me = r.me;
        this.name = r.me.name;
        this.marches = r.marches || [];
        this.owned = r.owned || [];
        this.incoming = r.incoming || 0;
        const d = r.delta || { res: [0, 0, 0, 0], u: zeroU() };
        const s = this.c.s, du = d.u || zeroU();
        d.res.forEach((v, i) => {
          if (v) this.c.addRes(i, v);
        });
        s.troops = s.troops.map((v, i) => Math.max(0, v + (du[i] || 0)));
        if (d.wounded && d.wounded.some((v) => v > 0)) {
          const cap = 25 * this.c.levels(20), room = Math.max(0, cap - s.wounded.reduce((a, b) => a + b, 0));
          let w = d.wounded.slice(0, 5), tot = w.reduce((a, b) => a + b, 0);
          if (tot > room) w = w.map((v) => Math.floor(v * room / tot));
          s.wounded = s.wounded.map((v, i) => v + (w[i] || 0));
          if (w.some((v) => v > 0)) this.c.msg(`\u{1FA79} ${w.reduce((a, b) => a + b, 0)} Verwundete sind im Lazarett angekommen.`);
        }
        this.lh = r.lh || null;
        this.openRallies = r.rallies || 0;
        this.ally = r.ally || {};
        this.boss = r.boss || null;
        if (d.vip) addVip(this.c, d.vip);
        if (d.items) {
          s.items = s.items || {};
          for (const k in d.items) {
            if (!(d.items[k] > 0)) continue;
            if (k === "medals") s.medals = (s.medals || 0) + d.items[k];
            else if (k === "ore") s.ore = (s.ore || 0) + d.items[k];
            else s.items[k] = (s.items[k] || 0) + d.items[k];
          }
        }
        this.helpOpen = r.help_open || 0;
        this.garrison = r.garrison || 0;
        this.gcap = r.gcap || 0;
        this.troopReq = r.troop_req || 0;
        this.war = r.war || null;
        this.trophies = r.trophies || 0;
        if (r.me) this.me.leader = !!r.me.leader;
        this.applyHelps(r.helps || []);
        this.askHelps();
        const av = r.avatar;
        if (!av) this.avatar = null;
        else if (av.status !== "ok") this.avatar = { status: av.status };
        else if (!this.avatar || this.avatar.v !== av.v || !this.avatar.data) {
          const cached = JSON.parse(localStorage.getItem("pf_av") || "null");
          if (cached && cached.v === av.v) this.avatar = { status: "ok", v: av.v, data: cached.data };
          else this.call("avatar_get", { p_token: this.token }).then((g) => {
            if (g && g.data) {
              this.avatar = { status: "ok", v: av.v, data: g.data };
              try {
                localStorage.setItem("pf_av", JSON.stringify(this.avatar));
              } catch (e) {
              }
            }
          }).catch(() => {
          });
        }
        this.events = r.events || [];
        this.title = r.title || null;
        if (r.news && r.news.id > (+localStorage.getItem("pf_news") || 0)) {
          this.newsPending = r.news;
          localStorage.setItem("pf_news", String(r.news.id));
        }
        const back = du.reduce((a, v) => a + Math.max(0, v), 0);
        if (back > 0) this.c.msg(`${back} Krieger sind eingetroffen${d.res.some((v) => v > 0) ? " \u2013 mit Beute!" : "."}`);
        this.reports = r.reports || [];
        for (const rep of this.reports.slice().reverse()) if (rep.id > this.lastReport) {
          this.c.msg(rep.text);
          if (this.lastReport > 0 && rep.win === true && /^Sieg/.test(rep.text)) questEvent(this.c, "win", 1);
          this.lastReport = rep.id;
        }
        localStorage.setItem("pf_lastrep", String(this.lastReport));
        this.status = "online";
        this.error = "";
      } catch (e) {
        if (e.code === "NICHT_ANGEMELDET" && !strict) {
          this.status = "fehler";
          this.error = e.message;
          return;
        }
        this.status = e.code ? "fehler" : "offline";
        this.error = e.code ? e.message : "Keine Verbindung zum Server.";
        if (strict) throw e;
      }
    }
    async loadWorld() {
      if (!this.token) return;
      try {
        this.world = await this.call("world", { p_token: this.token });
      } catch (e) {
      }
    }
    async loadAlliances() {
      if (!this.token) return;
      try {
        this.alliances = await this.call("alliances_list", { p_token: this.token });
      } catch (e) {
      }
    }
    async loadChat() {
      if (!this.token || !this.me || !this.me.alliance_id) return;
      try {
        const msgs = await this.call("chat_get", { p_token: this.token, p_after: this.chatAfter });
        if (msgs && msgs.length) {
          this.chat = this.chat.concat(msgs).slice(-80);
          this.chatAfter = msgs[msgs.length - 1].id;
        }
      } catch (e) {
      }
    }
    // ---------- Riesenkrake, Allianz-Projekte, Profilbild ----------
    async bossInfo() {
      try {
        this.bossI = await this.call("boss_info", { p_token: this.token });
      } catch (e) {
      }
    }
    async bossAttack(u, boost) {
      const r = await this.call("boss_attack", { p_token: this.token, p_u: u, p_boost: boost });
      const s = this.c.s;
      s.troops = s.troops.map((v, i) => Math.max(0, v - (r.lost[i] || 0)));
      await this.sync();
      await this.bossInfo();
      return r;
    }
    async adminBoss() {
      await this.call("admin_boss", { p_token: this.token });
      await this.sync();
    }
    async allyProjects() {
      try {
        this.projects = await this.call("ally_projects", { p_token: this.token });
      } catch (e) {
      }
    }
    async allyDonate(kind, res) {
      await this.call("ally_donate", { p_token: this.token, p_kind: kind, p_res: res });
      res.forEach((v, i) => this.c.s.res[i] = Math.max(0, this.c.s.res[i] - v));
      await this.allyProjects();
      await this.sync();
    }
    async avatarUpload(data) {
      await this.call("avatar_upload", { p_token: this.token, p_data: data });
      await this.sync();
    }
    async adminAvatars() {
      try {
        this.avQueue = await this.call("admin_avatars", { p_token: this.token });
      } catch (e) {
      }
    }
    async adminAvatarSet(id, ok) {
      await this.call("admin_avatar_set", { p_token: this.token, p_player: id, p_ok: ok });
      await this.adminAvatars();
    }
    // ---------- Events, Hilfe, Spielleiter ----------
    eventLeft(kind) {
      if (!this.active || !this.events) return 0;
      const now = this.serverNow();
      for (const e of this.events) if (e.kind === kind) {
        const l = (Date.parse(e.until) - now) / 1e3;
        if (l > 0) return l;
      }
      return 0;
    }
    async sendHelp(to, res) {
      await this.call("send_help", { p_token: this.token, p_to: to, p_res: res });
      res.forEach((v, i) => this.c.s.res[i] = Math.max(0, this.c.s.res[i] - v));
      await this.sync();
    }
    async adminBroadcast(text) {
      await this.call("admin_broadcast", { p_token: this.token, p_text: text });
      await this.sync();
    }
    async adminEvent(kind, min) {
      await this.call("admin_event", { p_token: this.token, p_kind: kind, p_minutes: min });
      await this.sync();
    }
    async adminPlayers() {
      try {
        this.players = await this.call("admin_players", { p_token: this.token });
      } catch (e) {
      }
    }
    async adminBan(id, ban) {
      await this.call("admin_ban", { p_token: this.token, p_player: id, p_ban: ban });
      await this.adminPlayers();
    }
    // ---------- Späher & Sammelangriffe ----------
    async scout(kind, target) {
      await this.call("scout", { p_token: this.token, p_kind: kind, p_target: kind === "terr" || kind === "gather" ? target : null, p_target_player: kind === "player" ? target : null });
      await this.sync();
    }
    async rallyCreate(kind, target, u, wait) {
      const s = this.c.s;
      await this.call("rally_create", { p_token: this.token, p_kind: kind, p_target: kind === "terr" || kind === "gather" ? target : null, p_target_player: kind === "player" ? target : null, p_u: u, p_wait: wait });
      s.troops = s.troops.map((v, i) => v - (u[i] || 0));
      await this.sync();
      await this.loadRallies();
    }
    async rallyJoin(id, u) {
      const s = this.c.s;
      await this.call("rally_join", { p_token: this.token, p_rally: id, p_u: u });
      s.troops = s.troops.map((v, i) => v - (u[i] || 0));
      await this.sync();
      await this.loadRallies();
    }
    async loadRallies() {
      try {
        this.rallies = await this.call("rally_list", { p_token: this.token });
      } catch (e) {
      }
    }
    // ---------- Codes ----------
    async redeem(code) {
      const r = await this.call("redeem_code", { p_token: this.token, p_code: code });
      if (!r.ok) throw new Error(r.err || "Code ung\xFCltig.");
      await this.sync();
      return r.text;
    }
    async loadCodes() {
      if (this.me && this.me.is_admin) try {
        this.codes = await this.call("admin_codes", { p_token: this.token });
      } catch (e) {
      }
    }
    async saveCode(code, res, u, days, max, vip) {
      await this.call("admin_code_save", { p_token: this.token, p_code: code, p_res: res, p_u: u, p_days: days, p_max: max, p_vip: vip || 0 });
      await this.loadCodes();
    }
    async deleteCode(code) {
      await this.call("admin_code_delete", { p_token: this.token, p_code: code });
      await this.loadCodes();
    }
    async loadRanking() {
      if (!this.token) return;
      try {
        this.ranking = await this.call("ranking", { p_token: this.token });
      } catch (e) {
      }
    }
    async sendMarch(kind, target, u, boost, speed) {
      const s = this.c.s;
      const r = await this.call("send_march", () => ({
        p_token: this.token,
        p_kind: kind,
        p_target: kind === "terr" || kind === "gather" ? target : null,
        p_target_player: kind === "player" ? target : null,
        p_u: u,
        p_boost: boost || 1,
        p_speed: speed || 1
      }));
      s.troops = s.troops.map((v, i) => v - (u[i] || 0));
      await this.sync();
      return r;
    }
    async withdraw(terr) {
      await this.call("withdraw", { p_token: this.token, p_terr: terr });
      await this.sync();
      await this.loadWorld();
    }
    async createAlliance(name, tag) {
      await this.call("alliance_create", { p_token: this.token, p_name: name, p_tag: tag });
      this.chat = [];
      this.chatAfter = 0;
      await this.sync();
      await this.loadAlliances();
    }
    async joinAlliance(id) {
      await this.call("alliance_join", { p_token: this.token, p_alliance: id });
      this.chat = [];
      this.chatAfter = 0;
      await this.sync();
      await this.loadAlliances();
    }
    async leaveAlliance() {
      await this.call("alliance_leave", { p_token: this.token });
      this.chat = [];
      this.chatAfter = 0;
      await this.sync();
      await this.loadAlliances();
    }
    async kick(id) {
      await this.call("alliance_kick", { p_token: this.token, p_player: id });
      await this.loadAlliances();
    }
    async sendChat(text) {
      await this.call("chat_send", { p_token: this.token, p_text: text });
      await this.loadChat();
    }
    // ---------- Allianz-Hilfe ----------
    applyHelps(list) {
      const s = this.c.s;
      s.helpGot = s.helpGot || {};
      const keep = {};
      let n = 0, sec = 0;
      for (const h2 of list) {
        keep[h2.key] = Math.max(h2.got, s.helpGot[h2.key] || 0);
        const prev = s.helpGot[h2.key] || 0;
        if (h2.got > prev) {
          sec += applyHelp(this.c, h2.key, h2.got - prev);
          n += h2.got - prev;
        }
      }
      s.helpGot = keep;
      if (n > 0 && sec > 0) this.c.msg(`\u{1F91D} ${n}\xD7 Allianz-Hilfe: \u2212${fmtTime(sec)}`);
    }
    askHelps() {
      if (!this.me || !this.me.alliance_id) return;
      const s = this.c.s, req = s.helpReq || {}, now = {};
      for (const t of helpTargets(this.c)) {
        now[t.key] = 1;
        if (!req[t.key]) this.call("help_ask", { p_token: this.token, p_key: t.key, p_label: t.label }).catch(() => {
          delete s.helpReq[t.key];
        });
      }
      s.helpReq = now;
    }
    async helpList() {
      try {
        this.helps = await this.call("help_list", { p_token: this.token });
      } catch (e) {
      }
    }
    async helpGive(id) {
      const r = await this.call("help_give", { p_token: this.token, p_id: id || null });
      this.helpOpen = Math.max(0, this.helpOpen - r.n);
      await this.helpList();
      await this.sync();
      return r;
    }
    // ---------- Allianzburg (Truppen spenden) ----------
    async garrisonInfo() {
      try {
        this.garr = await this.call("garrison_info", { p_token: this.token });
      } catch (e) {
      }
    }
    async troopRequest() {
      await this.call("troop_request", { p_token: this.token });
      await this.loadChat();
    }
    async troopDonate(to, u) {
      await this.call("troop_donate", { p_token: this.token, p_to: to, p_u: u });
      const s = this.c.s;
      s.troops = s.troops.map((v, i) => Math.max(0, v - (u[i] || 0)));
      await this.sync();
      await this.garrisonInfo();
    }
    async garrisonBack(other) {
      await this.call("garrison_back", { p_token: this.token, p_other: other || null });
      await this.sync();
      await this.garrisonInfo();
    }
    // ---------- Arena ----------
    async arenaList() {
      try {
        this.arena = await this.call("arena_list", { p_token: this.token });
      } catch (e) {
        this.arenaErr = e.message;
      }
    }
    async arenaFight(target, bot, boost) {
      const r = await this.call("arena_fight", { p_token: this.token, p_target: target || null, p_bot: bot || null, p_boost: boost || 1 });
      await this.arenaList();
      return r;
    }
    async arenaClaim() {
      const r = await this.call("arena_claim", { p_token: this.token });
      await this.sync();
      await this.arenaList();
      return r;
    }
    // ---------- Allianz-Krieg ----------
    async warInfo() {
      try {
        this.warI = await this.call("war_info", { p_token: this.token });
      } catch (e) {
      }
    }
    async warDeclare(id) {
      await this.call("war_declare", { p_token: this.token, p_alliance: id });
      await this.sync();
      await this.warInfo();
    }
    // ---------- Rohstofffelder, Wiederholungen ----------
    async gatherRecall(id) {
      await this.call("gather_recall", { p_token: this.token, p_march: id });
      await this.sync();
      await this.loadWorld();
    }
    async replay(id) {
      return this.call("report_replay", { p_token: this.token, p_id: id });
    }
    /// eigene Gebiete (für Produktionsbonus)
    ownedBonus() {
      return this.owned;
    }
    troopsAway() {
      let a = zeroU();
      for (const m of this.marches) a = uAdd(a, m.u || zeroU());
      if (this.world && this.me) {
        for (const t of this.world.territories) if (t.owner === this.me.id) a = uAdd(a, t.gu || zeroU());
      }
      return a;
    }
    update(dt) {
      if (!this.token) return;
      for (const k in this.t) this.t[k] += dt;
      if (this.t.sync > 15) {
        this.t.sync = 0;
        this.sync();
      }
      if (this.wantWorld && this.t.world > 10) {
        this.t.world = 0;
        this.loadWorld();
      }
      if (this.wantChat && this.t.chat > 4) {
        this.t.chat = 0;
        this.loadChat();
      }
      if (this.wantChat && this.t.all > 15) {
        this.t.all = 0;
        this.loadAlliances();
      }
    }
  };

  // src/sound.js
  var Sound = class {
    constructor(colony, online) {
      this.c = colony;
      this.o = online;
      this.on = localStorage.getItem("pf_sound") !== "0";
      this.ctx = null;
      this.gullT = 4;
      this.hammerT = 1;
      this.lastIncoming = 0;
      this.raidRang = false;
      const start2 = () => {
        this.init();
      };
      document.addEventListener("pointerdown", start2, { once: false, passive: true });
    }
    toggle() {
      this.on = !this.on;
      localStorage.setItem("pf_sound", this.on ? "1" : "0");
      if (this.master) this.master.gain.value = this.on ? 0.9 : 0;
    }
    init() {
      if (this.ctx) {
        if (this.ctx.state === "suspended") this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain();
      this.master.gain.value = this.on ? 0.9 : 0;
      this.master.connect(ctx.destination);
      const len2 = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len2, ctx.sampleRate), d = buf.getChannelData(0);
      let b = 0;
      for (let i = 0; i < len2; i++) {
        const w = Math.random() * 2 - 1;
        b = 0.985 * b + 0.015 * w;
        d[i] = b * 6 + w * 0.15;
      }
      this.noise = buf;
      const surf = ctx.createBufferSource();
      surf.buffer = buf;
      surf.loop = true;
      this.surfF = ctx.createBiquadFilter();
      this.surfF.type = "lowpass";
      this.surfF.frequency.value = 500;
      this.surfG = ctx.createGain();
      this.surfG.gain.value = 0;
      surf.connect(this.surfF).connect(this.surfG).connect(this.master);
      surf.start();
      const wind = ctx.createBufferSource();
      wind.buffer = buf;
      wind.loop = true;
      wind.playbackRate.value = 1.7;
      this.windF = ctx.createBiquadFilter();
      this.windF.type = "bandpass";
      this.windF.frequency.value = 900;
      this.windF.Q.value = 0.7;
      this.windG = ctx.createGain();
      this.windG.gain.value = 0;
      wind.connect(this.windF).connect(this.windG).connect(this.master);
      wind.start();
    }
    update(dt, time) {
      if (!this.ctx || !this.on || this.ctx.state !== "running") return;
      const c = this.c, now = this.ctx.currentTime;
      const storm = c.storm ? 1 : 0;
      const swell = 0.5 + 0.5 * Math.sin(time * 0.9) * Math.sin(time * 0.37 + 1);
      this.surfG.gain.setTargetAtTime(0.035 + 0.05 * swell + 0.02 * (c.tideSin || 0) + 0.08 * storm, now, 0.3);
      this.surfF.frequency.setTargetAtTime(380 + 300 * swell + 500 * storm, now, 0.3);
      this.windG.gain.setTargetAtTime(storm ? 0.06 + 0.04 * Math.sin(time * 1.7) : 6e-3, now, 0.5);
      const day = c.s.dayTime > 0.22 && c.s.dayTime < 0.78;
      this.gullT -= dt;
      if (this.gullT <= 0) {
        this.gullT = 5 + Math.random() * 10;
        if (day && !storm) this.gull();
      }
      this.hammerT -= dt;
      if (this.hammerT <= 0) {
        this.hammerT = 0.45 + Math.random() * 0.5;
        if (c.activeBuilds > 0) this.hammer();
      }
      const raidSoon = c.raidIn !== null && c.raidIn < 30;
      if (raidSoon && !this.raidRang) this.bell();
      this.raidRang = raidSoon;
      const inc = this.o && this.o.active ? this.o.incoming || 0 : 0;
      if (inc > this.lastIncoming) this.bell();
      this.lastIncoming = inc;
    }
    gull() {
      const ctx = this.ctx, t0 = ctx.currentTime, n = 2 + Math.floor(Math.random() * 3), base = 1100 + Math.random() * 500;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) {
        pan.pan.value = Math.random() * 1.6 - 0.8;
        pan.connect(this.master);
      }
      for (let k = 0; k < n; k++) {
        const t = t0 + k * (0.22 + Math.random() * 0.08);
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(base * 1.25, t);
        o.frequency.exponentialRampToValueAtTime(base * 0.7, t + 0.16);
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = base;
        f.Q.value = 3;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.025, t + 0.02);
        g.gain.exponentialRampToValueAtTime(8e-4, t + 0.18);
        o.connect(f).connect(g).connect(pan || this.master);
        o.start(t);
        o.stop(t + 0.2);
      }
    }
    hammer() {
      const ctx = this.ctx, t = ctx.currentTime;
      const s = ctx.createBufferSource();
      s.buffer = this.noise;
      s.playbackRate.value = 3;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 1400 + Math.random() * 800;
      f.Q.value = 4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(5e-4, t + 0.07);
      s.connect(f).connect(g).connect(this.master);
      s.start(t, Math.random());
      s.stop(t + 0.08);
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.value = 180;
      o.type = "triangle";
      og.gain.setValueAtTime(0.03, t);
      og.gain.exponentialRampToValueAtTime(5e-4, t + 0.06);
      o.connect(og).connect(this.master);
      o.start(t);
      o.stop(t + 0.07);
    }
    bell() {
      const ctx = this.ctx;
      if (!ctx || !this.on) return;
      for (let k = 0; k < 3; k++) {
        const t = ctx.currentTime + k * 0.55;
        for (const [fr, v] of [[620, 0.08], [1240, 0.035], [1860, 0.02], [2480, 0.012]]) {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.frequency.value = fr;
          g.gain.setValueAtTime(v, t);
          g.gain.exponentialRampToValueAtTime(5e-4, t + 1.4);
          o.connect(g).connect(this.master);
          o.start(t);
          o.stop(t + 1.5);
        }
      }
    }
  };

  // src/main.js
  function fail(msg) {
    const e = document.getElementById("err");
    e.style.display = "flex";
    e.querySelector("p").textContent = msg;
  }
  function start() {
    const canvas = document.getElementById("c");
    let r;
    try {
      r = new Renderer(canvas);
    } catch (e) {
      fail(e.message);
      return;
    }
    const colony = new Colony();
    const online = new Online(colony);
    colony.online = online;
    const world = new World(r, colony);
    const gfx = new Graphics(world, r.gl.getParameter(r.gl.MAX_TEXTURE_SIZE));
    const ui = new UI(colony, world, gfx, online);
    window.__game = { colony, world, gfx, ui, online };
    window.__save = () => colony.save();
    const sound = new Sound(colony, online);
    window.__game.sound = sound;
    window.__notify = () => {
      const N = window.PfNative;
      if (!N || localStorage.getItem("pf_notify") === "0") return;
      try {
        N.cancelAll();
        const s = colony.s, list = [];
        s.plots.forEach((p) => {
          if (p.type >= 0 && p.buildLeft > 5) list.push([p.buildLeft, "\u{1F3D7}\uFE0F Bau fertig", `${DEFS[p.type].name} ${p.level > 0 ? "ist jetzt Stufe " + (p.level + 1) : "ist fertig gebaut"}.`]);
        });
        if (s.train.length) {
          const all = s.train.reduce((a, x, k) => a + (k === 0 ? x.left + (x.n - 1) * x.per : x.n * x.per), 0);
          list.push([all, "\u2694\uFE0F Ausbildung fertig", "Deine Krieger sind fertig ausgebildet."]);
        }
        if (s.expLeft > 5) list.push([s.expLeft, "\u{1F9ED} Wattwanderung zur\xFCck", "Deine Bewohner sind mit Beute zur\xFCck."]);
        if (online.active) {
          const now = online.serverNow();
          for (const m of online.marches || []) {
            const t = (Date.parse(m.status === "back" ? m.back_at : m.arrive) - now) / 1e3;
            if (t > 5) list.push([t, m.status === "back" ? "\u26F5 Truppen zur\xFCck" : m.kind === "scout" ? "\u{1F52D} Sp\xE4herbericht" : "\u2694\uFE0F Angriff erreicht das Ziel", m.status === "back" ? "Deine Krieger sind heimgekehrt." : "Schau in die Kampfberichte!"]);
          }
        } else for (const m of s.marches) if (m.left > 5) list.push([m.left, m.phase === "back" ? "\u26F5 Truppen zur\xFCck" : "\u2694\uFE0F Trupp am Ziel", "Schau in die Kampfberichte!"]);
        for (const m of s.botMarches || []) if (m.left > 5) list.push([m.left, m.phase === "back" ? "\u26F5 Truppen zur\xFCck" : "\u{1F3F4}\u200D\u2620\uFE0F Piratenschiff erreicht", m.phase === "back" ? "Deine Krieger sind mit Beute zur\xFCck." : "Der Kampf beginnt \u2013 schau in die Berichte!"]);
        if (s.trader && s.trader.left <= 0 && s.trader.next > 5) list.push([s.trader.next, "\u26F5 H\xE4ndlerschiff", "Ein H\xE4ndler hat am Steg angelegt \u2013 nur kurz!"]);
        list.push([20 * 3600, "\u{1F3DD}\uFE0F Deine Pfahlstadt wartet", "Deine Tagesbelohnung liegt bereit!"]);
        list.sort((a, b) => a[0] - b[0]).slice(0, 30).forEach((n, i) => N.schedule(i + 1, n[0], n[1], n[2]));
      } catch (e) {
      }
    };
    const ptrs = /* @__PURE__ */ new Map();
    let moved = 0, pinch = 0, rot = false, holdT = null;
    const hint = document.createElement("div");
    hint.id = "rotHint";
    hint.textContent = "\u27F2 Drehen & Neigen";
    document.body.appendChild(hint);
    const showHint = (on, x, y) => {
      hint.style.display = on ? "block" : "none";
      if (on) {
        hint.style.left = x + "px";
        hint.style.top = y - 70 + "px";
      }
    };
    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      clearTimeout(holdT);
      if (ptrs.size === 1) {
        moved = 0;
        rot = false;
        holdT = setTimeout(() => {
          if (ptrs.size === 1 && moved < 8) {
            rot = true;
            const p = [...ptrs.values()][0];
            showHint(true, p.x, p.y);
            try {
              navigator.vibrate && navigator.vibrate(15);
            } catch (er) {
            }
          }
        }, 380);
      }
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
        moved = 999;
        rot = false;
        showHint(false);
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      const p = ptrs.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (ptrs.size === 1) {
        moved += Math.abs(dx) + Math.abs(dy);
        if (rot) {
          world.rotate(dx, dy, canvas.clientHeight);
          showHint(true, p.x, p.y);
        } else if (moved > 10) {
          clearTimeout(holdT);
          world.pan(dx, dy, canvas.clientHeight);
        }
      } else if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0 && d > 0) world.zoom(pinch / d);
        pinch = d;
      }
    });
    const up = (e) => {
      const p = ptrs.get(e.pointerId);
      ptrs.delete(e.pointerId);
      clearTimeout(holdT);
      if (!p) return;
      if (ptrs.size === 0 && moved <= 10 && !rot && e.type === "pointerup") {
        const rect = canvas.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width * 2 - 1, ny = 1 - (e.clientY - rect.top) / rect.height * 2;
        if (ui.view === "city") ui.select(world.pick(nx, ny));
      }
      if (ptrs.size === 0) {
        rot = false;
        showHint(false);
      }
      if (ptrs.size === 1) moved = 999;
    };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      world.zoom(e.deltaY > 0 ? 1.1 : 0.9);
    }, { passive: false });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        colony.save();
        online.sync();
        window.__notify();
      } else {
        colony.catchUp();
        last = performance.now();
        online.sync();
        if (window.PfNative) try {
          window.PfNative.cancelAll();
        } catch (e) {
        }
      }
    });
    window.addEventListener("pagehide", () => colony.save());
    setInterval(() => colony.save(), 3e4);
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1e3));
      last = now;
      colony.tick(dt);
      world.update(dt);
      gfx.update(dt, colony);
      online.update(dt);
      sound.update(dt, world.time);
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      const [w, h2] = gfx.size(cw, ch);
      if (canvas.width !== w || canvas.height !== h2) {
        canvas.width = w;
        canvas.height = h2;
      }
      r.render(world.scene(cw / Math.max(1, ch)));
      ui.update(cw, ch, dt);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    document.getElementById("loading").remove();
    const updNote = new URLSearchParams(location.search).get("update");
    if (updNote === "updated") colony.msg(`Update installiert: ${(window.APP_VERSION || {}).name || "neue Version"} \u2713`);
    if (updNote === "shell") colony.msg("Es gibt ein gr\xF6\xDFeres Update \u2013 bitte die neue APK einmal installieren.");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
