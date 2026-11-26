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
uniform float uFogDen, uPLRange, uShadowOn, uTexel, uEmis;
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

  // src/game.js
  var RES = ["Holz", "Muscheln", "Wasser", "Altmetall"];
  var RES_COL = ["#E2B477", "#F2A08C", "#7FD3F0", "#C7CCD6"];
  var HOLZ = 0;
  var MUSCHELN = 1;
  var WASSER = 2;
  var METALL = 3;
  var T = { TURM: 0, TREIBHOLZ: 1, MUSCHEL: 2, REGEN: 3, TAUCHER: 4, HAUS: 5, HEILER: 6, RAUCH: 7, KUECHE: 8, KASERNE: 9, WACHTURM: 10, LAGER: 11, MAUER: 12, ABWEHR: 13, DAMM: 14 };
  var DEFS = [
    { name: "Gezeitenturm", short: "Herz der Stadt", desc: "Leuchtturm und Pfahlwerk. Jede Stufe hebt alle Plattformen der Stadt h\xF6her \xFCber das Wasser.", cost: [220, 0, 0, 60], prod: -1, rate: 0, workers: 0, build: 15 },
    { name: "Treibholzsammler", short: "+Holz", desc: "Fischt angeschwemmtes Holz aus dem Wasser.", cost: [40, 0, 0, 0], prod: HOLZ, rate: 0.9, workers: 2, build: 6 },
    { name: "Muschelzucht", short: "+Muscheln, stark bei Ebbe", desc: "Muschelpf\xE4hle im Watt. Bei Ebbe wird viel geerntet, bei Flut wenig.", cost: [60, 0, 0, 0], prod: MUSCHELN, rate: 0.75, workers: 2, build: 6 },
    { name: "Regenf\xE4nger", short: "+Wasser, stark bei Sturm", desc: "Segeltrichter und F\xE4sser sammeln Regen. Bei Sturmflut f\xE4llt besonders viel.", cost: [70, 0, 0, 5], prod: WASSER, rate: 0.6, workers: 1, build: 6 },
    { name: "Wracktaucher", short: "+Altmetall, stark bei Flut", desc: "Taucher bergen Metall aus alten Wracks. Bei hohem Wasser kommen sie besser heran.", cost: [120, 40, 0, 0], prod: METALL, rate: 0.25, workers: 3, build: 6 },
    { name: "Unterkunft", short: "+6 Pl\xE4tze", desc: "Pfahlhaus mit Kojen: Wohnraum f\xFCr neue Siedler (6 pro Stufe).", cost: [70, 0, 0, 0], prod: -1, rate: 0, workers: 0, build: 6 },
    { name: "Heilerh\xFCtte", short: "heilt Kranke", desc: "Kr\xE4uter und trockene Decken. Kranke werden deutlich schneller gesund.", cost: [140, 30, 0, 20], prod: -1, rate: 0, workers: 1, build: 6 },
    { name: "R\xE4ucherei", short: "\u2212Muschelverbrauch", desc: "R\xE4uchert Vorr\xE4te haltbar. Senkt den Muschelverbrauch um 8 % pro Stufe (max. 50 %).", cost: [100, 0, 0, 10], prod: -1, rate: 0, workers: 1, build: 6 },
    { name: "K\xFCche", short: "+6 % Produktion je Stufe", desc: "Warme Mahlzeiten aus dem gro\xDFen Kessel: Alle Siedler arbeiten besser (+6 % Produktion pro Stufe, max. 60 %).", cost: [120, 40, 0, 10], prod: -1, rate: 0, workers: 1, build: 7 },
    { name: "Kaserne", short: "bildet Truppen aus", desc: "Bildet Harpuniere (Angriff) und Wachen (Verteidigung) aus. H\xF6here Stufe: schneller und gr\xF6\xDFere Ausbildungsschlange.", cost: [150, 60, 0, 30], prod: -1, rate: 0, workers: 2, build: 8 },
    { name: "Wachturm", short: "+12 % Verteidigung je Stufe", desc: "Sp\xE4her und Signalh\xF6rner: Deine Stadt verteidigt sich besser gegen \xDCberf\xE4lle (+12 % pro Stufe).", cost: [130, 0, 0, 40], prod: -1, rate: 0, workers: 1, build: 8 },
    { name: "Lager", short: "+1500 Lagerplatz je Stufe", desc: "Schuppen, Kisten und F\xE4sser: mehr Platz f\xFCr jeden Rohstoff (+1500 pro Stufe).", cost: [100, 0, 0, 10], prod: -1, rate: 0, workers: 0, build: 6 },
    { name: "Festungsmauer", short: "Mauer mit Tor", desc: "Umschlie\xDFt dein ganzes Gel\xE4nde. Stufe 1\u20133 Holzpalisade, 4\u20137 Steinwall, 8\u201310 Festungswall. +15 % Verteidigung pro Stufe.", cost: [200, 0, 0, 40], prod: -1, rate: 0, workers: 0, build: 12 },
    { name: "Abwehrturm", short: "Turm auf der Mauer", desc: "Steinturm mit Harpunen-Schleuder auf der Festungsmauer. +40 Verteidigung pro Stufe.", cost: [160, 0, 0, 50], prod: -1, rate: 0, workers: 1, build: 10 },
    { name: "Damm", short: "h\xE4lt Flut & Sturmflut ab", desc: "Erddamm ganz au\xDFen um die Warft, mit Sieltor. Solange das Wasser nicht \xFCber den Damm steigt, bleibt deine Stadt trocken. Jede Stufe macht ihn 40 cm h\xF6her.", cost: [240, 0, 0, 30], prod: -1, rate: 0, workers: 0, build: 12 }
  ];
  var damTopFor = (lvl) => lvl > 0 ? 3 + 0.4 * lvl : -99;
  var CITY_TYPES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  var UNITS = [
    { name: "Harpunier", att: 10, def: 5, cost: [25, 15, 0, 4], time: 6 },
    { name: "Wache", att: 3, def: 12, cost: [20, 10, 0, 6], time: 5 }
  ];
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
          gh: 0,
          gw: 0,
          seed: Math.floor(R() * 1e6)
        });
      }
    return list;
  }
  var travelTime = (t) => 20 + Math.hypot(t.x, t.y) * 22;
  var MAX_LEVEL = 10;
  var costFor = (t, lvl) => DEFS[t].cost.map((c) => Math.round(c * Math.pow(1.65, lvl - 1)));
  var buildTime = (t, lvl) => DEFS[t].build * Math.pow(lvl, 1.5);
  var rateAt = (t, lvl) => lvl <= 0 ? 0 : DEFS[t].rate * lvl * (1 + 0.1 * (lvl - 1));
  var deckFor = (lvl) => 2.2 + 0.55 * Math.max(1, lvl);
  var beaconWood = (lvl) => 0.04 + 0.04 * lvl;
  var DAMM = 52;
  var PLOTS = 53;
  var INNER = 13;
  var RING3 = 25;
  var WALL = 43;
  var TOWERS = 44;
  var OUTER_LEVEL = 3;
  var MAX_BUILDS = 2;
  var DAY = 240;
  var STORM_LEN = 90;
  var EXP_TIME = 40;
  var EXP_FOOD = 30;
  var EBB = 1;
  var KEY = "pfahlstadt_save_v1";
  function fmtTime(s) {
    const t = Math.ceil(s);
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
      return 1500 + 1500 * this.levels(T.LAGER);
    }
    get troopsAway() {
      if (this.online && this.online.active) return this.online.troopsAway();
      let h2 = 0, w = 0;
      for (const m of this.s.marches) {
        h2 += m.h;
        w += m.w;
      }
      for (const t of this.s.terr) {
        h2 += t.gh;
        w += t.gw;
      }
      return { h: h2, w };
    }
    get troopTotal() {
      const a = this.troopsAway;
      return this.s.troops[0] + this.s.troops[1] + a.h + a.w;
    }
    get defense() {
      const base = this.s.troops[0] * UNITS[0].def + this.s.troops[1] * UNITS[1].def + this.healthy * 2 + 40 * this.levels(T.ABWEHR);
      return Math.round(base * (1 + 0.12 * this.levels(T.WACHTURM) + 0.15 * this.levels(T.MAUER)));
    }
    get power() {
      let b = 0;
      for (const p of this.s.plots) if (p.type >= 0) b += p.level * 10;
      return b + this.troopTotal * 2 + this.defense;
    }
    get deck() {
      return deckFor(this.towerLevel);
    }
    get damTop() {
      return damTopFor(this.levels(T.DAMM));
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
      return this.s.stormLeft > 0;
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
        s.stormTimer -= dt;
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
    }
    updateWater() {
      const s = this.s;
      const phase = s.dayTime * 2 * Math.PI * 2;
      this.tideSin = Math.sin(phase);
      this.rising = Math.cos(phase) > 0;
      let surge = 0;
      if (s.stormLeft > 0) {
        const ramp = Math.max(0, Math.min(1, Math.min((STORM_LEN - s.stormLeft) / 12, s.stormLeft / 12)));
        surge = ramp * (2.6 + 0.3 * Math.sin(this.time * 1.7));
      }
      this.water = 1.4 + 1.6 * this.tideSin + surge;
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
      for (const p of s.plots) {
        if (p.type < 0 || p.level <= 0) continue;
        const d = DEFS[p.type];
        if (d.prod < 0) continue;
        let f = 1;
        if (p.type === T.MUSCHEL) f = 1 - 0.5 * tide;
        if (p.type === T.TAUCHER) f = 1 + 0.5 * tide;
        if (p.type === T.REGEN && this.storm && !offline) f = 2.5;
        r[d.prod] += rateAt(p.type, p.level) * this.efficiency * flood * f;
      }
      const kitchen = 1 + Math.min(0.6, 0.06 * this.levels(T.KUECHE));
      const terrBonus = [1, 1, 1, 1];
      const owned = this.online && this.online.active ? this.online.owned : s.terr.filter((t) => t.owner === 1);
      for (const t of owned) terrBonus[t.res] += t.pct / 100;
      for (let i = 0; i < 4; i++) if (r[i] > 0) r[i] *= kitchen * terrBonus[i];
      r[MUSCHELN] -= this.troopTotal * UPKEEP;
      r[MUSCHELN] -= s.survivors * 0.035 * (1 - Math.min(0.5, 0.08 * smoke));
      r[WASSER] -= s.survivors * 0.03;
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
        const sev = (wet ? -this.freeboard * 1.2 : 0) + (starving ? 1 : 0);
        s.sickProg += dt * sev * this.healthy / 120;
        while (s.sickProg >= 1 && s.sick < s.survivors) {
          s.sickProg -= 1;
          s.sick++;
          this.msg(starving ? "Hunger und Durst: Jemand ist erkrankt!" : "Nasse F\xFC\xDFe, kalter Wind: Jemand ist erkrankt!");
        }
      } else s.sickProg = Math.max(0, s.sickProg - dt * 0.01);
      if (s.sick > 0 && s.survivors > 1 && (this.freeboard < -1.2 || starving)) {
        s.deathProg += dt * s.sick / 240;
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
        s.healProg += dt * (4e-3 + 0.02 * healers) * (this.beaconBurning ? 1.5 : 1);
        if (s.healProg >= 1) {
          s.healProg = 0;
          s.sick--;
          this.msg("Ein Kranker ist wieder gesund.");
        }
      }
      if (s.survivors < this.capacity && !wet && !starving && this.beaconBurning) {
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
      if (plot === DAMM && t !== T.DAMM) return "Hier entsteht der Damm";
      if (plot !== DAMM && t === T.DAMM) return "Nur am Dammplatz";
      if (plot === WALL && t !== T.MAUER) return "Hier steht die Festungsmauer";
      if (plot !== WALL && t === T.MAUER) return "Nur am Mauerplatz";
      if (plot >= TOWERS && plot < DAMM && t !== T.ABWEHR) return "Hier passen nur Abwehrt\xFCrme";
      if (plot < TOWERS && t === T.ABWEHR) return "Nur auf der Mauer";
      if (plot >= TOWERS && plot < DAMM && this.levels(T.MAUER) <= 0) return "Erst die Festungsmauer bauen";
      if (plot >= INNER && plot < RING3 && this.towerLevel < OUTER_LEVEL) return `\xC4u\xDFerer Ring ab Gezeitenturm Stufe ${OUTER_LEVEL}`;
      if (plot >= RING3 && plot < WALL && this.builtCount < this.ring3Needed(plot)) return `Gel\xE4nde zu klein: noch ${this.ring3Needed(plot) - this.builtCount} Geb\xE4ude bauen`;
      if (this.activeBuilds >= MAX_BUILDS) return "Alle Bautrupps besch\xE4ftigt";
      if (!this.canAfford(costFor(t, 1))) return "Zu wenig Rohstoffe";
      return null;
    }
    startBuild(plot, t) {
      if (this.buildBlocker(plot, t)) return false;
      this.pay(costFor(t, 1));
      this.s.plots[plot] = { type: t, level: 0, buildLeft: buildTime(t, 1), buildTotal: buildTime(t, 1) };
      this.msg(`Bau von ${DEFS[t].name} begonnen.`);
      return true;
    }
    upgradeBlocker(plot) {
      const p = this.s.plots[plot];
      if (p.type < 0) return "Kein Geb\xE4ude";
      if (p.buildLeft > 0) return "Wird gerade gebaut";
      if (p.level >= MAX_LEVEL) return "Maximale Stufe";
      if (plot !== 0 && p.level + 1 > this.towerLevel) return `Erst Gezeitenturm auf Stufe ${p.level + 1}`;
      if (this.activeBuilds >= MAX_BUILDS) return "Alle Bautrupps besch\xE4ftigt";
      if (!this.canAfford(costFor(p.type, p.level + 1))) return "Zu wenig Rohstoffe";
      return null;
    }
    startUpgrade(plot) {
      if (this.upgradeBlocker(plot)) return false;
      const p = this.s.plots[plot];
      this.pay(costFor(p.type, p.level + 1));
      p.buildTotal = p.buildLeft = buildTime(p.type, p.level + 1);
      this.msg(`Ausbau: ${DEFS[p.type].name} \u2192 Stufe ${p.level + 1}`);
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
      this.s.expLeft = EXP_TIME;
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
      this.msg(`Wattwanderung zur\xFCck: +${holz} Holz, +${mu} Muscheln, +${me} Altmetall`);
      if (!s.expSurprised && Math.random() < 0.3 && s.survivors < this.capacity) {
        s.survivors++;
        this.msg("Auf einer Sandbank wurde ein Gestrandeter gefunden!");
      }
    }
    // ---------- Militär: Ausbildung, Märsche, Kämpfe, Überfälle ----------
    report(text, win) {
      const s = this.s;
      s.reports.unshift({ text, win, day: s.days, time: s.dayTime });
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
      if (this.queued() + n > this.trainSlots()) return `Schlange voll (max. ${this.trainSlots()})`;
      if (!this.canAfford(unitCost(u, n))) return "Zu wenig Rohstoffe";
      return null;
    }
    startTrain(u, n) {
      if (this.trainBlocker(u, n)) return false;
      this.pay(unitCost(u, n));
      const per = UNITS[u].time / (1 + 0.25 * (this.levels(T.KASERNE) - 1));
      this.s.train.push({ u, n, per, left: per });
      this.msg(`${n}\xD7 ${UNITS[u].name} in Ausbildung.`);
      return true;
    }
    attackBlocker(id, h2, w) {
      const t = this.s.terr[id];
      if (!t) return "Unbekanntes Ziel";
      if (h2 + w <= 0) return "Keine Truppen ausgew\xE4hlt";
      if (h2 > this.s.troops[0] || w > this.s.troops[1]) return "So viele Truppen hast du nicht zu Hause";
      if (this.s.marches.some((m) => m.target === id && m.phase === "out")) return "Dorthin ist schon ein Trupp unterwegs";
      return null;
    }
    sendTroops(id, h2, w) {
      if (this.attackBlocker(id, h2, w)) return false;
      const t = this.s.terr[id], tt = travelTime(t);
      this.s.troops[0] -= h2;
      this.s.troops[1] -= w;
      this.s.marches.push({ target: id, h: h2, w, left: tt, total: tt, phase: "out", kind: t.owner === 1 ? "reinforce" : "attack" });
      this.msg(t.owner === 1 ? `Verst\xE4rkung nach ${t.name} unterwegs.` : `Angriff auf ${t.name} gestartet!`);
      return true;
    }
    withdraw(id) {
      const t = this.s.terr[id];
      if (!t || t.owner !== 1 || t.gh + t.gw === 0) return false;
      const tt = travelTime(t);
      this.s.marches.push({ target: id, h: t.gh, w: t.gw, left: tt, total: tt, phase: "back", kind: "return" });
      t.gh = 0;
      t.gw = 0;
      this.msg(`Besatzung von ${t.name} kehrt heim.`);
      return true;
    }
    winChance(id, h2, w) {
      const t = this.s.terr[id];
      const att = h2 * UNITS[0].att + w * UNITS[1].att;
      if (att <= 0) return 0;
      const r = att / Math.max(1, t.pirates);
      return Math.max(0, Math.min(1, (r - 0.85) / 0.3));
    }
    battle(m, t) {
      const att = (m.h * UNITS[0].att + m.w * UNITS[1].att) * (0.85 + Math.random() * 0.3);
      if (att > t.pirates) {
        const loss = Math.min(0.9, Math.pow(t.pirates / att, 1.3) * 0.6);
        const lh = Math.round(m.h * loss), lw = Math.round(m.w * loss);
        t.owner = 1;
        t.pirates = 0;
        t.gh += m.h - lh;
        t.gw += m.w - lw;
        this.report(`Sieg! ${t.name} erobert. Verluste: ${lh} Harpuniere, ${lw} Wachen. Bonus: +${t.pct} % ${RES[t.res]}.`, true);
      } else {
        const lh = Math.round(m.h * 0.8), lw = Math.round(m.w * 0.8);
        t.pirates = Math.max(Math.round(t.base * 0.3), Math.round(t.pirates - att * 0.5));
        const rh = m.h - lh, rw = m.w - lw;
        if (rh + rw > 0) {
          const tt = travelTime(t);
          this.s.marches.push({ target: t.id, h: rh, w: rw, left: tt, total: tt, phase: "back", kind: "return" });
        }
        this.report(`Niederlage bei ${t.name}. Verluste: ${lh} Harpuniere, ${lw} Wachen. Die Piraten sind geschw\xE4cht.`, false);
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
        if (m.phase === "back") {
          s.troops[0] += m.h;
          s.troops[1] += m.w;
          this.msg(`${m.h + m.w} Soldaten sind heimgekehrt.`);
        } else if (t.owner === 1) {
          t.gh += m.h;
          t.gw += m.w;
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
          const def = (t.gh * UNITS[0].def + t.gw * UNITS[1].def) * (0.85 + Math.random() * 0.3);
          if (def > str) {
            const loss = Math.min(0.9, Math.pow(str / def, 1.3) * 0.5);
            const lh = Math.round(t.gh * loss), lw = Math.round(t.gw * loss);
            t.gh -= lh;
            t.gw -= lw;
            this.report(`Piraten griffen ${t.name} an und wurden zur\xFCckgeschlagen! Verluste: ${lh + lw}.`, true);
          } else {
            t.owner = 0;
            t.gh = 0;
            t.gw = 0;
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
          const def = this.defense * (0.85 + Math.random() * 0.3);
          if (def > str) {
            const loss = Math.min(0.8, Math.pow(str / def, 1.3) * 0.5);
            const lh = Math.round(s.troops[0] * loss), lw = Math.round(s.troops[1] * loss);
            s.troops[0] -= lh;
            s.troops[1] -= lw;
            this.report(`Piraten\xFCberfall abgewehrt! (St\xE4rke ${Math.round(str)} gegen ${Math.round(def)}) Verluste: ${lh + lw}.`, true);
          } else {
            const lost = s.res.map((v) => Math.round(v * 0.2));
            lost.forEach((v, i) => s.res[i] -= v);
            s.troops[0] = Math.round(s.troops[0] * 0.4);
            s.troops[1] = Math.round(s.troops[1] * 0.4);
            this.report(`Piraten haben die Stadt gepl\xFCndert! (St\xE4rke ${Math.round(str)} gegen ${Math.round(def)}) Verloren: ${lost.map((v, i) => v + " " + RES[i]).join(", ")}.`, false);
          }
        }
      }
    }
    get raidIn() {
      return this.s.days >= 2 ? this.s.raidTimer : null;
    }
    ensureMilitary() {
      const s = this.s;
      if (!s.nodes) s.nodes = [];
      if (!s.gath) s.gath = [];
      if (s.nodeTimer === void 0) s.nodeTimer = 2;
      if (s.nodeSeq === void 0) s.nodeSeq = 1;
      if (!s.troops) s.troops = [0, 0];
      if (!s.train) s.train = [];
      if (!s.marches) s.marches = [];
      if (!s.reports) s.reports = [];
      if (!s.terr || s.terr.length !== 18) s.terr = makeTerritories();
      if (s.raidTimer === void 0) s.raidTimer = 480;
      if (s.counterTimer === void 0) s.counterTimer = 420;
      while (s.plots.length < PLOTS) s.plots.push({ type: -1, level: 0, buildLeft: 0, buildTotal: 0 });
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
      return 18 + 3 * this.towerLevel;
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
      plots[1] = { type: T.TREIBHOLZ, level: 1, buildLeft: 0, buildTotal: 0 };
      plots[4] = { type: T.MUSCHEL, level: 1, buildLeft: 0, buildTotal: 0 };
      plots[7] = { type: T.REGEN, level: 1, buildLeft: 0, buildTotal: 0 };
      plots[10] = { type: T.HAUS, level: 1, buildLeft: 0, buildTotal: 0 };
      this.s = {
        res: [250, 160, 120, 30],
        survivors: 6,
        sick: 0,
        beaconOn: true,
        plots,
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
    B.push([0, 0, 0], null, [1 + 0.07 * (level - 1), 1 + 0.07 * (level - 1), 1 + 0.07 * (level - 1)]);
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
    const stone = level >= 4 ? [0.5, 0.5, 0.52] : [0.56, 0.5, 0.44];
    const H = 7 + 0.3 * level;
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
    const kind = level <= 0 ? 0 : level <= 3 ? 1 : level <= 7 ? 2 : 3;
    const stone = kind === 3 ? [0.42, 0.42, 0.45] : [0.55, 0.53, 0.5];
    const H = kind === 1 ? 3 + 0.3 * level : kind === 2 ? 4 + 0.3 * (level - 4) : 6 + 0.3 * (level - 8);
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
  var TH = [4.5, 4.5, 5.5, 8, 9.5, 11, 13, 14.5, 16, 20, 23];
  var towerHeight = (level) => TH[Math.max(1, Math.min(10, level))];
  var towerEra = (level) => level <= 2 ? 0 : level <= 5 ? 1 : level <= 8 ? 2 : 3;
  var lampHeight = (level) => towerHeight(level) + (towerEra(level) === 0 ? 0.7 : towerEra(level) === 3 ? 2 : 1.2);
  function tower(B, level) {
    const H = towerHeight(level), era = towerEra(level);
    const wood = [0.55, 0.42, 0.28], stone = [0.5, 0.49, 0.46], stoneD = [0.38, 0.37, 0.35], concrete = [0.86, 0.87, 0.88], steel = [0.45, 0.48, 0.52];
    if (era === 0) {
      const r = 1.1 - 0.1 * (level - 1);
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
      const bands = 6 + (level - 6);
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
    const rings = level === 10 ? 3 : 2;
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
      lay(base, H * 0.4, 9, 0, level >= 4 ? stone : earth);
      lay(base + H * 0.4, H * 0.35, 6.5, 0.3, level >= 4 ? stone : earth);
      lay(base + H * 0.75, H * 0.25, 4, 0.3, grass);
      if (level >= 4) lay(base + H * 0.4, H * 0.35, 1, -2.8, grass);
      if (level >= 8) lay(top, 0.9, 0.6, 2, concrete);
    }
    const zc = -R;
    for (const s of [-1, 1]) {
      const xs = s * Math.sin(gap) * R;
      B.add("cube", [xs, base + (H + 1.5) / 2, zc], [1.6, H + 1.5, 7], level >= 4 ? concrete : C.plank, { g: 0.2 });
    }
    const w = Math.sin(gap) * R * 2;
    B.add("cube", [0, top + 1.2, zc], [w + 1.6, 0.6, 1.4], level >= 4 ? concrete : C.plank);
    B.add("cube", [0, top - 0.6, zc + 2.6], [w, H * 0.5, 0.35], level >= 8 ? [0.4, 0.44, 0.5] : C.tar, { g: 0.5 });
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
        this.villagers.push({ x: Math.sin(a) * d, z: Math.cos(a) * d, yaw: 0, path: [], spoke: -1, wait: Math.random() * 2, speed: 1.5 + Math.random() * 0.6, phase: Math.random() * 10, mesh: Math.floor(Math.random() * COATS.length) });
      }
      this.villagers.length = want;
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
      const k = this.dist / viewH * 1.6;
      this.target[0] += dx * k;
      this.target[2] += dy * k;
      const r = Math.hypot(this.target[0], this.target[2]);
      if (r > 75) {
        this.target[0] *= 75 / r;
        this.target[2] *= 75 / r;
      }
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
      const waterDeep = lerpC([0.01, 0.03, 0.08], [0.02, 0.17, 0.38], day);
      const waterShallow = lerpC([0.02, 0.06, 0.1], [0.08, 0.5, 0.58], day);
      const burn = c.beaconBurning;
      const flick = noise1(this.time * 2.5);
      this.lampI = lerp(this.lampI || 0, burn ? 1.6 + flick : 0, 0.1);
      const draws = [];
      draws.push({ mesh: this.envMesh });
      draws.push({ mesh: this.infraMesh });
      if (this.wallMesh) draws.push({ mesh: this.wallMesh });
      if (this.damMesh) draws.push({ mesh: this.damMesh });
      for (const m of this.plotMesh) if (m) draws.push({ mesh: m });
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
        const bob = g.phase === "work" ? Math.abs(Math.sin(this.time * 6)) * 0.15 : Math.abs(Math.sin(this.time * 9 + g.d)) * 0.07;
        const m = trs([x, y + bob, z], [g.phase === "work" ? 25 : 0, yaw, 0], [1, 1, 1]);
        draws.push({ mesh: this.villagerMeshes[(g.node + Math.floor(g.d * 0)) % this.villagerMeshes.length], model: m });
        if (g.load > 0 || g.phase === "work") draws.push({ mesh: this.basketMesh, model: m, noShadow: true });
      }
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
      if (this.isOnline) {
        const w = this.o.world;
        return [...w.territories.map((t) => ({ ...t, type: "terr" })), ...w.players.filter((p) => p.id !== this.o.me.id).map((p) => ({ ...p, type: "player" }))];
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
        if (m.target_player) {
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
      for (const t of wld.territories) {
        const [x, y] = this.pos(t.x, t.y);
        if (x < -80 || y < -80 || x > this.w + 80 || y > this.h + 80) continue;
        const r = u * (t.pct >= 30 ? 0.32 : t.pct >= 18 ? 0.27 : 0.23);
        const mine = t.owner === me.id, ally = !mine && t.owner && myAlly && t.owner_alliance === myAlly, enemy = t.owner && !mine && !ally;
        const col = mine ? "#56e39a" : ally ? "#6fb6ff" : enemy ? "#ff9a5a" : null;
        this.island(t, x, y, r, sel && sel.type === "terr" && sel.id === t.id, col, t.owner ? "\u{1F6A9}" : "\u2620");
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

  // src/ui.js
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
  var RES_IC = ["\u{1FAB5}", "\u{1F9AA}", "\u{1F4A7}", "\u2699\uFE0F"];
  var B_IC = ["\u{1F5FC}", "\u{1FAB5}", "\u{1F9AA}", "\u{1F4A7}", "\u2699\uFE0F", "\u{1F3E0}", "\u{1F33F}", "\u{1F41F}", "\u{1F372}", "\u2694\uFE0F", "\u{1F441}\uFE0F", "\u{1F4E6}", "\u{1F9F1}", "\u{1F3F9}", "\u{1F30A}"];
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
      this.form = [0, 0];
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
        const card = h("div", "card", `<span class="ic" title="${name}">${RES_IC[i]}</span><div class="cv"><b class="rv">0</b><span class="rr">+0</span></div>`);
        top.querySelector(".res").appendChild(card);
        return { v: card.querySelector(".rv"), r: card.querySelector(".rr") };
      });
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
        this.form = [0, 0];
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
    showLogin(on, codeMode) {
      this.login.style.display = on ? "flex" : "none";
      if (on) {
        $("#loginCodeBox").style.display = codeMode ? "" : "none";
        $("#loginNameBox").style.display = codeMode ? "none" : "";
        $("#loginErr").textContent = "";
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
      this.form = [0, 0];
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
        this.form = [c.s.troops[0], c.s.troops[1]];
      } else if (a === "f0") {
        this.form = [0, 0];
      } else if (a === "send") {
        const sel = this.mapSel, f = this.form.slice();
        if (!sel) return;
        if (this.sea.isOnline) this.run(async () => {
          await o.sendMarch(sel.type, sel.id, f[0], f[1]);
          this.form = [0, 0];
          this.mapSel = null;
          c.msg(sel.type === "player" ? "Angriff gestartet!" : "Trupp ist unterwegs.");
          await o.loadWorld();
        });
        else if (c.sendTroops(sel.id, f[0], f[1])) {
          this.form = [0, 0];
          this.mapSel = null;
        }
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
      setHTML(this.tl, `${tide} \xB7 <b style="color:${fbCol}">${fb >= 0 ? "+" : ""}${fb.toFixed(1)} m</b>${c.damHolds ? ' \xB7 <span style="color:#8ef0a0">\u{1F30A} Damm h\xE4lt</span>' : ""}${c.stormWarning ? ' \xB7 <span style="color:#ffc060">Sturm naht</span>' : ""}${c.raidIn !== null && c.raidIn < 30 ? ' \xB7 <b style="color:#ff6060">Piraten!</b>' : ""}`);
      let st = `\u{1F465} <b>${s.survivors}</b>/${c.capacity}${s.sick ? ` \u{1F912}${s.sick}` : ""} \xB7 \u2694 <b>${s.troops[0] + s.troops[1]}</b> \xB7 ${clock(s.dayTime)}`;
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
      const nm = this.o.active ? this.o.marches.length : s.marches.length;
      if (this.view === "map") btn(this.bMap, "\u{1F3D8}\uFE0F", "Stadt", "");
      else btn(this.bMap, "\u{1F5FA}\uFE0F", "Karte", nm ? nm + " unterw." : "");
      const al = this.o.alliances && this.o.me && this.o.me.alliance_id ? (this.o.alliances.list || []).find((x) => x.id === this.o.me.alliance_id) : null;
      btn(this.bAlly, "\u{1F91D}", "Allianz", !this.o.active ? "offline" : al ? "[" + al.tag + "]" : "");
      btn(this.bMenu, "\u2630", "Men\xFC", "");
      const tq = c.queued ? c.queued() : 0;
      btn(this.bTroops, "\u2694\uFE0F", "Truppen", this.o.active && this.o.incoming ? '<i style="color:#ff6060">Angriff!</i>' : tq ? `\u{1F393} ${tq}` : "");
      this.renderTasks();
      btn(this.bBuild, "\u{1F3D7}\uFE0F", "Geb\xE4ude", c.activeBuilds ? `\u{1F528} ${c.activeBuilds}/2` : "");
      this.renderPanel();
    }
    cityLabels(cw, ch) {
      const c = this.c, s = c.s, deck = c.deck;
      const items = [];
      for (let i = 0; i < PLOTS; i++) {
        const p = s.plots[i], el = this.labelEls[i];
        if (p.type < 0 || this.w.dist > 120 && p.buildLeft <= 0 && i !== 0) {
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
        const txt = `<span class="li">${B_IC[p.type]}</span>${near ? " " + DEFS[p.type].name : ""}${p.level > 0 ? ` <i>${p.level}</i>` : ""}` + (p.buildLeft > 0 ? `<div class="bar"><div style="width:${(100 * (1 - p.buildLeft / Math.max(0.01, p.buildTotal))).toFixed(0)}%"></div></div><small>${fmtTime(p.buildLeft)}</small>` : "");
        if (el._t !== txt) {
          el._t = txt;
          el.innerHTML = txt;
          el.style.display = "";
          el._w = el.offsetWidth;
          el._h = el.offsetHeight;
        }
        const prio = (i === this.selected ? 0 : p.buildLeft > 0 ? 1 : 2) * 1e6 + sp[2];
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
      if (this.view === "map") html = this.showReports ? this.reportsHtml() : this.mapSel ? this.mapSel.type === "player" ? this.playerHtml() : this.terrHtml() : this.mapHtml();
      else if (this.mode === "ally") html = this.allyHtml();
      else if (this.mode === "build") html = this.buildingsHtml();
      else if (this.mode === "troops") html = this.troopsHtml();
      else if (this.mode === "rank") html = this.rankHtml();
      else if (this.mode === "account") html = this.accountHtml();
      else if (this.menu) html = this.menuHtml();
      else if (this.selected >= 0) html = this.plotHtml();
      else if (this.selected <= -1e3) html = this.nodeHtml();
      if (html === this.panelKey || this.holding) return;
      this.panelKey = html;
      this.panel.innerHTML = html;
      this.panel.style.display = html ? "" : "none";
      const mini = this.view !== "map" && !this.mode && !this.menu && (this.selected >= 0 && this.c.s.plots[this.selected].type >= 0 || this.selected <= -1e3);
      this.panel.classList.toggle("mini", mini);
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
      if (s.expLeft > 0) out.push({ ic: "\u{1F9ED}", t: "Wattwanderung", left: s.expLeft, pct: pct(s.expLeft, EXP_TIME), a: "" });
      if (o.active) {
        const now = o.serverNow(), W = o.world || { players: [], territories: [] };
        for (const m of o.marches || []) {
          const back = m.status === "back";
          const left = Math.max(0, ((back ? Date.parse(m.back_at) : Date.parse(m.arrive)) - now) / 1e3);
          const nm = m.target_player ? (W.players.find((p) => p.id === m.target_player) || {}).name || "Stadt" : (W.territories.find((t) => t.id === m.target_terr) || {}).name || "Gebiet";
          out.push({ ic: back ? "\u21A9\uFE0F" : m.kind === "player" ? "\u2694\uFE0F" : "\u26F5", t: `${back ? "Heimweg" : "Angriff"} ${nm}`, left, pct: null, a: 'data-a="gomap"' });
        }
        if (o.incoming) out.push({ ic: "\u26A0\uFE0F", t: "Feind greift an!", left: null, red: true, a: 'data-a="gomap"' });
      } else {
        for (const m of s.marches || []) {
          const back = m.phase === "back", nm = (s.terr[m.target] || {}).name || "Gebiet";
          out.push({ ic: back ? "\u21A9\uFE0F" : m.kind === "attack" ? "\u2694\uFE0F" : "\u{1F6E1}\uFE0F", t: `${back ? "Heimweg" : m.kind === "attack" ? "Angriff" : "Verst\xE4rk."} ${nm}`, left: m.left, pct: pct(m.left, m.total), a: 'data-a="gomap"' });
        }
      }
      if (c.raidIn !== null && c.raidIn < 180) out.push({ ic: "\u{1F3F4}\u200D\u2620\uFE0F", t: "Piraten kommen", left: c.raidIn, pct: null, red: true, a: 'data-a="troops"' });
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
        out.push({ ic: RES_IC[n.type], t: `${by[id]}\xD7 ${NODE_NAME[n.type]}`, left, pct: 100 * (1 - n.amount / Math.max(1, n.max)), a: `data-a="gonode" data-i="${n.id}"` });
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
        const types = i === DAMM ? [T.DAMM] : i === WALL ? [T.MAUER] : i >= TOWERS ? [T.ABWEHR] : CITY_TYPES;
        let rows = "";
        for (const t of types) {
          const d2 = DEFS[t], blk = c.buildBlocker(i, t);
          rows += `<div class="row"><div class="ri"><div><b>${d2.name}</b> <span class="sh">${d2.short}</span></div>
          <div class="sm">${this.costStr(costFor(t, 1))} &nbsp;\xB7&nbsp; ${fmtTime(buildTime(t, 1))}</div>
          ${blk && blk !== "Zu wenig Rohstoffe" ? `<div class="warn">${blk}</div>` : ""}</div>
          <button class="btn" data-a="build" data-v="${t}" ${blk ? "disabled" : ""}>Bauen</button></div>`;
        }
        const title = i === DAMM ? "Dammplatz" : i === WALL ? "Festung" : i >= TOWERS ? "Turmplatz auf der Mauer" : i >= RING3 ? "Bauplatz auf der Warft" : i >= INNER ? "Freier Bauplatz (au\xDFen)" : "Freier Bauplatz";
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
        out += `<div class="bline"><div class="ri" style="flex:1">\u{1F528} ${L > 0 ? "Ausbau auf " + (L + 1) : "Bau"} \xB7 noch <b style="color:#ffd27a">${fmtTime(p.buildLeft)}</b><div class="bar"><div style="width:${(100 * (1 - p.buildLeft / Math.max(0.01, p.buildTotal))).toFixed(0)}%"></div></div></div></div>`;
      } else if (L < MAX_LEVEL) {
        const blk = c.upgradeBlocker(i);
        out += `<div class="bline"><div class="ri" style="flex:1">\u2192 Stufe ${L + 1}: ${this.costStr(costFor(p.type, L + 1))} \xB7 \u23F1 ${fmtTime(buildTime(p.type, L + 1))}${blk && blk !== "Zu wenig Rohstoffe" ? `<div class="warn">${blk}</div>` : ""}</div><button class="btn" data-a="up" ${blk ? "disabled" : ""}><b>Ausbauen</b></button></div>`;
      } else out += '<div class="sm">Maximale Stufe erreicht.</div>';
      const extra = [];
      if (L > 0 && p.type === T.KASERNE) extra.push('<button class="btn ghost" data-a="troops">\u2694\uFE0F Truppen ausbilden</button>');
      if (i !== 0) extra.push(`<button class="btn ${this.confirm === "demo" ? "danger" : "ghost"}" data-a="demo" style="padding:7px 10px;font-size:12px">${this.confirm === "demo" ? "<b>Wirklich abrei\xDFen?</b>" : "Abrei\xDFen"}</button>`);
      return out + (extra.length ? `<div class="btns" style="margin-top:8px">${extra.join("")}</div>` : "");
    }
    nodeHtml() {
      const c = this.c, id = -1e3 - this.selected, n = c.nodeById(id);
      if (!n) return this.head("Sammelstelle") + '<div class="desc">Hier ist nichts mehr zu holen.</div>';
      const as = c.assigned(id), flooded = c.nodeFlooded(n);
      const path = c.gatherPath(n), trip = path.L * 2 / 2.3 + 5;
      return this.head(`${RES_IC[n.type]} ${NODE_NAME[n.type]}`) + `<div class="desc">Schicke Bewohner los: Sie laufen durchs Tor hinaus, sammeln und tragen bis zu <b>${c.carry}</b> ${RES[n.type]} pro Gang zur\xFCck.</div>
       <div class="inf">Vorrat: <b>${Math.round(n.amount)}</b> ${RES[n.type]} \xB7 ein Gang \u2248 ${fmtTime(trip)}</div>
       <div class="inf">${flooded ? '<b style="color:#7fd3f0">\u{1F30A} \xDCberflutet</b> \u2013 erst bei Ebbe wieder erreichbar' : '<b style="color:#8ef0a0">\u2713 Erreichbar</b>' + (n.h < 0.3 ? " (liegt im Watt: nur bei Ebbe)" : " (auf einer Sandbank)")}</div>
       <div class="row"><div class="ri"><b>Sammler: ${as}</b><div class="sm">freie Bewohner: ${c.freeVillagers} \xB7 Sammler fehlen in den Geb\xE4uden</div></div>
         <button class="btn sm2" data-a="gath" data-d="-1" ${as <= 0 ? "disabled" : ""}>\u22121</button>
         <button class="btn sm2" data-a="gath" data-d="1" ${c.freeVillagers <= 0 ? "disabled" : ""}>+1</button>
         <button class="btn sm2" data-a="gath" data-d="3" ${c.freeVillagers <= 0 ? "disabled" : ""}>+3</button></div>`;
    }
    barracksHtml() {
      const c = this.c, s = c.s;
      let out = `<div class="sub2">Truppen zu Hause: <b>${s.troops[0]}</b> Harpuniere \xB7 <b>${s.troops[1]}</b> Wachen</div>`;
      if (s.train.length) {
        const q = s.train[0];
        out += `<div class="sm">In Ausbildung: ${s.train.map((t) => `${t.n}\xD7 ${UNITS[t.u].name}`).join(", ")} \xB7 n\xE4chster in ${fmtTime(q.left)} (${c.queued()}/${c.trainSlots()})</div>`;
      } else out += `<div class="sm">Ausbildungsschlange leer (max. ${c.trainSlots()})</div>`;
      UNITS.forEach((u, k) => {
        const b1 = c.trainBlocker(k, 1), b5 = c.trainBlocker(k, 5);
        out += `<div class="row"><div class="ri"><div><b>${u.name}</b> <span class="sh">Angriff ${u.att} \xB7 Verteidigung ${u.def}</span></div>
        <div class="sm">je ${this.costStr(unitCost(k, 1))}</div></div>
        <button class="btn sm2" data-a="train" data-u="${k}" data-n="1" ${b1 ? "disabled" : ""}>+1</button>
        <button class="btn sm2" data-a="train" data-u="${k}" data-n="5" ${b5 ? "disabled" : ""}>+5</button></div>`;
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
        case T.WACHTURM:
          return [`Verteidigung der Stadt <b>+${12 * L} %</b>`, `Aktuelle Verteidigung: <b>${c.defense}</b>`, c.raidIn !== null ? `N\xE4chster Piraten\xFCberfall in etwa ${fmtTime(c.raidIn)}` : "Piraten greifen ab Tag 2 an"];
        case T.LAGER:
          return [`Lagerplatz je Rohstoff: <b>${c.storage}</b>`];
        case T.DAMM:
          return [`Sch\xFCtzt bis Wasserstand <b>${damTopFor(L).toFixed(1)} m</b> (n\xE4chste Stufe ${damTopFor(L + 1).toFixed(1)} m)`, `Jetzt: Wasser ${c.water.toFixed(1)} m \xB7 ${c.damHolds ? '<b style="color:#8ef0a0">Damm h\xE4lt die Flut ab</b>' : c.water > c.damTop ? '<b style="color:#ff6a6a">Wasser l\xE4uft \xFCber den Damm!</b>' : "Stadt liegt trocken"}`];
        case T.MAUER:
          return [`${L <= 3 ? "Holzpalisade" : L <= 7 ? "Steinwall" : "Festungswall"} \xB7 Verteidigung <b>+${15 * L} %</b>`, `Stadtverteidigung gesamt: <b>${c.defense}</b>`, `Gel\xE4nderadius: ${Math.round(c.areaRadius)} m`];
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
    troopForm(sendLabel, danger, blk, extra) {
      const s = this.c.s, f = this.form;
      let out = "";
      UNITS.forEach((u, k) => {
        out += `<div class="row"><div class="ri"><b>${u.name}</b> <span class="sh">${f[k]} / ${s.troops[k]}</span></div>
        <button class="btn sm2" data-a="f" data-u="${k}" data-d="-5">\u22125</button><button class="btn sm2" data-a="f" data-u="${k}" data-d="-1">\u22121</button>
        <button class="btn sm2" data-a="f" data-u="${k}" data-d="1">+1</button><button class="btn sm2" data-a="f" data-u="${k}" data-d="5">+5</button></div>`;
      });
      if (extra) out += extra;
      if (blk && blk !== "Keine Truppen ausgew\xE4hlt") out += `<div class="warn">${blk}</div>`;
      out += `<div class="btns"><button class="btn ghost" data-a="fall">Alle</button><button class="btn ghost" data-a="f0">Keine</button>
      <button class="btn ${danger ? "danger" : ""}" data-a="send" ${blk || this.busy ? "disabled" : ""}><b>${sendLabel}</b></button></div>`;
      return out;
    }
    attackInfo(att, def) {
      if (def == null) return `<div class="sm">Angriffskraft: <b>${att}</b> \xB7 Verteidigung des Gegners unbekannt</div>`;
      const ch = att <= 0 ? 0 : Math.round(Math.max(0, Math.min(1, (att / Math.max(1, def) - 0.85) / 0.3)) * 100);
      return `<div class="sm">Angriffskraft: <b>${att}</b> gegen ~${Math.round(def)} \xB7 Siegchance: <b style="color:${ch >= 70 ? "#8ef0a0" : ch >= 30 ? "#ffd27a" : "#ff7a7a"}">${ch} %</b></div>`;
    }
    homeTroops(c, s, away) {
      return `<div class="inf">Zu Hause: <b>${s.troops[0]}</b> Harpuniere \xB7 <b>${s.troops[1]}</b> Wachen</div>
       <div class="inf">Unterwegs/Besatzung: <b>${away.h}</b> \xB7 <b>${away.w}</b></div>`;
    }
    mapHtml() {
      const c = this.c, s = c.s, away = c.troopsAway, o = this.o;
      if (this.sea.isOnline) {
        const now = o.serverNow();
        const tname = (m) => m.target_player ? (o.world.players.find((p) => p.id === m.target_player) || {}).name || "Stadt" : (o.world.territories.find((t) => t.id === m.target_terr) || {}).name || "Gebiet";
        const marches2 = o.marches.map((m) => {
          const left = m.status === "out" ? Date.parse(m.arrive) - now : Date.parse(m.back_at) - now;
          return `<div class="sm">\u26F5 ${m.h + m.w} Soldaten \u2192 ${tname(m)} (${m.status === "back" ? "Heimweg" : m.kind === "player" ? "Angriff auf Stadt" : "Gebiet"}) \xB7 ${fmtTime(Math.max(0, left / 1e3))}</div>`;
        }).join("");
        return this.head("Seekarte (online)") + this.homeTroops(c, s, away) + `<div class="inf">Deine Gebiete: <b>${o.owned.length}</b> &nbsp; Spieler auf der Karte: <b>${o.world.players.length}</b></div>${marches2}
         <div class="sm">Ziehen zum Verschieben. Tippe auf Inseln oder fremde St\xE4dte (\u{1F3F0}). Gr\xFCn = deins, blau = Verb\xFCndete, orange = Gegner.</div>
         <div class="btns"><button class="btn ghost" data-a="reports">Berichte (${o.reports.length})</button></div>`;
      }
      if (o.active) return this.head("Seekarte") + '<div class="inf">Lade Weltkarte \u2026</div>' + (o.error ? `<div class="warn">${o.error}</div>` : "");
      const owned = s.terr.filter((t) => t.owner === 1).length;
      const marches = s.marches.map((m) => `<div class="sm">\u26F5 ${m.h + m.w} Soldaten \u2192 ${s.terr[m.target].name} (${m.phase === "back" ? "Heimweg" : m.kind === "attack" ? "Angriff" : "Verst\xE4rkung"}) \xB7 ${fmtTime(m.left)}</div>`).join("");
      return this.head("Seekarte (offline)") + this.homeTroops(c, s, away) + `<div class="inf">Gebiete: <b>${owned}/${s.terr.length}</b></div>${marches}
       <div class="sm">Offline k\xE4mpfst du gegen Piraten. F\xFCr Mitspieler und Allianzen: Men\xFC \u2192 Online-Konto.</div>
       <div class="btns"><button class="btn ghost" data-a="reports">Berichte (${s.reports.length})</button></div>`;
    }
    terrHtml() {
      const c = this.c, s = c.s, o = this.o, f = this.form, att = f[0] * UNITS[0].att + f[1] * UNITS[1].att;
      if (this.sea.isOnline) {
        const t2 = o.world.territories.find((x) => x.id === this.mapSel.id);
        if (!t2) return this.head("Gebiet") + '<div class="sm">Nicht gefunden.</div>';
        const me = o.me, mine = t2.owner === me.id, ally = !mine && t2.owner && me.alliance_id && t2.owner_alliance === me.alliance_id;
        const dist = Math.hypot(t2.x - me.x, t2.y - me.y), tt2 = 20 + dist * 22;
        let out2 = this.head(t2.name) + `<div class="desc">${t2.kind} \xB7 Bonus <b>+${t2.pct} % ${RES[t2.res]}</b> \xB7 Fahrt ${fmtTime(tt2)}</div>`;
        if (mine) {
          out2 += `<div class="inf">\u{1F6A9} Dein Gebiet. Besatzung: <b>${t2.gh || 0}</b> Harpuniere \xB7 <b>${t2.gw || 0}</b> Wachen</div><div class="sm">Andere Spieler k\xF6nnen es dir abnehmen \u2013 Wachen verteidigen am besten.</div>`;
          out2 += `<div class="sub2">Verst\xE4rkung schicken</div>` + this.troopForm("Verst\xE4rken", false, this.busy ? "Bitte warten \u2026" : null);
          if ((t2.gh || 0) + (t2.gw || 0) > 0) out2 += '<div class="btns"><button class="btn ghost" data-a="withdraw">Besatzung abziehen</button></div>';
          return out2;
        }
        if (ally) return out2 + `<div class="inf">\u{1F6A9} Geh\xF6rt deinem Verb\xFCndeten <b>${t2.owner_name}</b>.</div>`;
        out2 += t2.owner ? `<div class="inf">\u{1F6A9} Geh\xF6rt <b>${t2.owner_name}</b> \u2013 Besatzung unbekannt</div>` : `<div class="inf">\u2620 Piraten, St\xE4rke etwa <b>${t2.strength}</b></div>`;
        out2 += `<div class="sub2">Angriffstrupp</div>` + this.troopForm("Angreifen!", true, null, this.attackInfo(att, t2.owner ? null : t2.strength));
        return out2;
      }
      const t = s.terr[this.mapSel.id], tt = travelTime(t);
      let out = this.head(t.name) + `<div class="desc">${t.kind} \xB7 Ring ${t.ring} \xB7 Bonus <b>+${t.pct} % ${RES[t.res]}</b> \xB7 Fahrt ${fmtTime(tt)}</div>`;
      out += t.owner === 1 ? `<div class="inf">\u{1F6A9} Dein Gebiet. Besatzung: <b>${t.gh}</b> Harpuniere \xB7 <b>${t.gw}</b> Wachen</div>
        <div class="sm">Piraten versuchen ab und zu, Gebiete zur\xFCckzuerobern. Wachen verteidigen besonders gut.</div>` : `<div class="inf">\u2620 Piraten, St\xE4rke etwa <b>${Math.round(t.pirates)}</b></div>`;
      out += `<div class="sub2">${t.owner === 1 ? "Verst\xE4rkung schicken" : "Angriffstrupp"}</div>`;
      out += this.troopForm(t.owner === 1 ? "Verst\xE4rken" : "Angreifen!", t.owner !== 1, c.attackBlocker(t.id, f[0], f[1]), t.owner === 1 ? "" : this.attackInfo(att, t.pirates));
      if (t.owner === 1 && t.gh + t.gw > 0) out += '<div class="btns"><button class="btn ghost" data-a="withdraw">Besatzung abziehen</button></div>';
      return out;
    }
    playerHtml() {
      const o = this.o, f = this.form, att = f[0] * UNITS[0].att + f[1] * UNITS[1].att;
      const p = o.world.players.find((x) => x.id === this.mapSel.id);
      if (!p) return this.head("Stadt") + '<div class="sm">Nicht gefunden.</div>';
      const me = o.me, ally = me.alliance_id && p.alliance_id === me.alliance_id;
      const dist = Math.hypot(p.x - me.x, p.y - me.y), tt = 20 + dist * 22;
      let out = this.head(`\u{1F3F0} ${p.tag ? "[" + p.tag + "] " : ""}${p.name}`) + `<div class="desc">Macht \u2694 <b>${p.power}</b> \xB7 Gezeitenturm Stufe ${p.tower} \xB7 ${p.online ? '<span style="color:#8ef0a0">online</span>' : "offline"} \xB7 Fahrt ${fmtTime(tt)}</div>`;
      if (ally) return out + '<div class="inf">Verb\xFCndeter \u2013 gemeinsam seid ihr st\xE4rker!</div>';
      if (p.shield) return out + '<div class="inf">\u{1F6E1} Diese Stadt steht unter Schutz (neue Spieler 12 Std., nach einer Pl\xFCnderung 30 Min.).</div>';
      out += '<div class="sm">Siegst du, pl\xFCndern deine Truppen bis zu 20 % der Vorr\xE4te (Harpuniere tragen 30, Wachen 15). Wer angreift, verliert seinen eigenen Schutz.</div>';
      out += `<div class="sub2">Angriffstrupp</div>` + this.troopForm("Stadt angreifen!", true, null, this.attackInfo(att, null));
      return out;
    }
    reportsHtml() {
      if (this.o.active && this.o.reports) {
        const rows2 = this.o.reports.length ? this.o.reports.map((r) => {
          const d = new Date(r.at);
          return `<div class="row rep ${r.win === true ? "win" : r.win === false ? "loss" : ""}"><div class="ri"><div class="sm">${d.toLocaleDateString("de-DE")} ${d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</div>${r.text}</div></div>`;
        }).join("") : '<div class="sm">Noch keine K\xE4mpfe.</div>';
        return this.head("Kampfberichte") + rows2;
      }
      const s = this.c.s;
      const rows = s.reports.length ? s.reports.map((r) => `<div class="row rep ${r.win ? "win" : "loss"}"><div class="ri"><div class="sm">Tag ${r.day} \xB7 ${clock(r.time)}</div>${r.text}</div></div>`).join("") : '<div class="sm">Noch keine K\xE4mpfe.</div>';
      return this.head("Kampfberichte") + rows;
    }
    // ---------- Allianz ----------
    allyHtml() {
      const o = this.o;
      if (!o.active) return this.head("Allianz") + '<div class="desc">Allianzen gibt es im Online-Spiel. Erstelle dir ein Konto \u2013 nur ein Spielername ist n\xF6tig.</div><div class="btns"><button class="btn" data-a="goOnline">Online gehen</button></div>';
      const A = o.alliances;
      if (!A) return this.head("Allianz") + '<div class="inf">Lade \u2026</div>';
      const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
      if (!o.me || !o.me.alliance_id) {
        const list = (A.list || []).map((a) => `<div class="row"><div class="ri"><b>[${esc(a.tag)}] ${esc(a.name)}</b><div class="sm">${a.members}/20 Mitglieder \xB7 Macht ${a.power}</div></div>
        <button class="btn sm2" data-a="allyJoin" data-id="${a.id}" ${a.members >= 20 || this.busy ? "disabled" : ""}>Beitreten</button></div>`).join("") || '<div class="sm">Noch keine Allianzen \u2013 gr\xFCnde die erste!</div>';
        return this.head("Allianz") + `<div class="desc">Verb\xFCndete greifen sich nicht an, sehen ihre Gebiete und haben einen gemeinsamen Chat.</div>
         <div class="sub2">Neue Allianz gr\xFCnden</div>
         <div class="form"><input id="alName" maxlength="24" placeholder="Name (3\u201324 Zeichen)"><input id="alTag" maxlength="4" placeholder="K\xFCrzel" class="short"></div>
         <div class="btns"><button class="btn" data-a="allyCreate" ${this.busy ? "disabled" : ""}>Gr\xFCnden</button></div>
         <div class="sub2">Allianzen</div>${list}`;
      }
      const mine = (A.list || []).find((a) => a.id === o.me.alliance_id) || { name: "Allianz", tag: "?", leader: null };
      const leader = mine.leader === o.me.id;
      const members = (A.members || []).map((m) => `<div class="row"><div class="ri">${m.id === mine.leader ? "\u{1F451} " : ""}<b>${esc(m.name)}</b> <span class="sh">\u2694 ${m.power}${m.online ? " \xB7 online" : ""}</span></div>
      ${leader && m.id !== o.me.id ? `<button class="btn sm2 ghost" data-a="kick" data-id="${m.id}">Entfernen</button>` : ""}</div>`).join("");
      const chat = o.chat.slice(-30).map((m) => `<div class="msg ${m.me ? "me" : ""} ${m.name === "System" ? "sys" : ""}"><b>${esc(m.name)}</b> ${esc(m.text)}</div>`).join("") || '<div class="sm">Noch keine Nachrichten.</div>';
      return this.head(`[${esc(mine.tag)}] ${esc(mine.name)}`) + `<div class="sub2">Chat</div><div class="chat" id="chatBox">${chat}</div>
       <div class="form"><input id="chatIn" maxlength="200" placeholder="Nachricht an die Allianz \u2026"><button class="btn sm2" data-a="chat">Senden</button></div>
       <div class="sub2">Mitglieder (${(A.members || []).length}/20)</div>${members}
       <div class="btns"><button class="btn ${this.confirm === "leave" ? "danger" : "ghost"}" data-a="allyLeave">${this.confirm === "leave" ? "<b>Wirklich verlassen?</b>" : "Allianz verlassen"}</button></div>`;
    }
    rankHtml() {
      const r = this.o.ranking;
      if (!this.o.active) return this.head("Rangliste") + '<div class="desc">Die Rangliste gibt es im Online-Spiel.</div>';
      if (!r) return this.head("Rangliste") + '<div class="inf">Lade \u2026</div>';
      const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
      return this.head("Rangliste") + r.map((p, i) => `<div class="row ${p.me ? "meRow" : ""}"><div class="ri"><b>${i + 1}. ${p.tag ? "[" + esc(p.tag) + "] " : ""}${esc(p.name)}</b><div class="sm">Macht \u2694 ${p.power} \xB7 ${p.terr} Gebiete</div></div></div>`).join("");
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
      return this.head("Men\xFC") + this.settingsHtml();
    }
    ttabLoad() {
      if (this.troopTab === "rank") this.o.loadRanking();
      if (this.troopTab === "reports" && this.o.active) this.o.sync();
    }
    troopsHtml() {
      const tab = this.troopTab || "truppen";
      const tabs = [["truppen", "\u2694\uFE0F", "Truppen"], ["reports", "\u{1F4DC}", "Berichte"], ["rank", "\u{1F3C6}", "Rangliste"]];
      const bar = `<div class="tabs" style="grid-template-columns:repeat(3,1fr)">${tabs.map(([k, ic, l]) => `<button class="tab ${k === tab ? "on" : ""}" data-a="ttab" data-t="${k}"><span>${ic}</span>${l}</button>`).join("")}</div>`;
      const strip = (x) => x.replace(/^<div class="ph">[\s\S]*?<\/button><\/div>/, "");
      const body = tab === "reports" ? strip(this.reportsHtml()) : tab === "rank" ? strip(this.rankHtml()) : this.troopsTabHtml();
      return this.head("Truppen") + bar + `<div class="tabbody">${body}</div>`;
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
        const groups = [["Rohstoffe", [T.TREIBHOLZ, T.MUSCHEL, T.REGEN, T.TAUCHER]], ["Wohnen & Versorgung", [T.HAUS, T.HEILER, T.RAUCH, T.KUECHE, T.LAGER]], ["Verteidigung", [T.KASERNE, T.WACHTURM, T.MAUER, T.ABWEHR]], ["Schutz vor der Flut", [T.DAMM]]];
        body = `<div class="sm">Bautrupps: <b>${c.activeBuilds}/2</b> besch\xE4ftigt. Der Platz wird automatisch gew\xE4hlt.</div>`;
        for (const [title, list] of groups) {
          body += `<div class="sub2">${title}</div>`;
          for (const t of list) {
            if (!types.includes(t)) continue;
            const d = DEFS[t], free = this.freePlotFor(t);
            let why = "";
            if (free < 0) {
              if (c.activeBuilds >= 2) why = "Alle Bautrupps besch\xE4ftigt";
              else if (!c.canAfford(costFor(t, 1))) why = "";
              else if (t === T.MAUER) why = c.levels(T.MAUER) > 0 || c.s.plots[WALL].type >= 0 ? "Schon gebaut \u2013 Ausbau unter \u201EMeine Geb\xE4ude\u201C" : "Nicht m\xF6glich";
              else if (t === T.DAMM) why = c.s.plots[DAMM].type >= 0 ? "Schon gebaut \u2013 Ausbau unter \u201EMeine Geb\xE4ude\u201C" : "Nicht m\xF6glich";
              else if (t === T.ABWEHR && c.levels(T.MAUER) <= 0) why = "Erst die Festungsmauer bauen";
              else why = "Kein freier Platz \u2013 baue mehr, dann w\xE4chst dein Gel\xE4nde";
            }
            body += `<div class="row"><div class="ri"><div><b>${B_IC[t]} ${d.name}</b> <span class="sh">${d.short}</span></div>
            <div class="sm">${this.costStr(costFor(t, 1))} \xB7 ${fmtTime(buildTime(t, 1))}</div>${why ? `<div class="warn">${why}</div>` : ""}</div>
            <button class="btn sm2" data-a="quickbuild" data-v="${t}" ${free < 0 ? "disabled" : ""}>Bauen</button></div>`;
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
        ["Verteidigung", [T.KASERNE, T.WACHTURM, T.MAUER, T.ABWEHR]],
        ["Schutz vor der Flut", [T.DAMM]]
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
          ${p.buildLeft <= 0 && p.level < MAX_LEVEL ? `<button class="btn sm2" data-a="upq" data-i="${i}" ${blk ? "disabled" : ""}>\u2B06</button>` : ""}</div>`);
        });
        if (rows.length) out += `<div class="sub2">${title}</div>` + rows.join("");
      }
      const free = s.plots.findIndex((p, i) => i > 0 && i < WALL && p.type < 0 && !c.buildBlocker(i, T.HAUS)?.startsWith("Gel\xE4nde") && !c.buildBlocker(i, T.HAUS)?.startsWith("\xC4u\xDFerer"));
      out += `<div class="sm" style="margin-top:10px">Neu bauen: Reiter \u201ENeu bauen\u201C oder in der Stadt auf eine freie Plattform tippen.${free > 0 ? "" : " Gerade ist kein Platz frei."}</div>`;
      if (free > 0) out += `<div class="btns"><button class="btn ghost" data-a="goto" data-i="${free}">Freien Bauplatz zeigen</button></div>`;
      return out;
    }
    troopsTabHtml() {
      const c = this.c, s = c.s, away = c.troopsAway;
      let out = `<div class="inf">Verteidigung der Stadt: <b>${c.defense}</b> \xB7 Macht \u2694 <b>${c.power}</b></div>
      <div class="inf">Unterwegs/Besatzung: <b>${away.h + away.w}</b> Soldaten</div>`;
      if (c.levels(T.KASERNE) <= 0) out += `<div class="inf">Zu Hause: <b>${s.troops[0]}</b> Harpuniere \xB7 <b>${s.troops[1]}</b> Wachen</div>`;
      if (c.raidIn !== null) out += `<div class="sm">N\xE4chster Piraten\xFCberfall in etwa ${fmtTime(c.raidIn)}</div>`;
      if (c.levels(T.KASERNE) > 0) out += this.barracksHtml();
      else out += '<div class="desc">F\xFCr Truppen brauchst du eine <b>Kaserne</b>. Baue sie unter <b>\u{1F3D7}\uFE0F Geb\xE4ude \u2192 Neu bauen</b>.</div>';
      out += '<div class="btns"><button class="btn" data-a="map">\u{1F5FA}\uFE0F Seekarte \xF6ffnen</button></div>';
      return out;
    }
    settingsHtml() {
      const g = this.g, o = this.o;
      const acc = !o.active ? `<div class="inf">Online-Konto: <b>offline</b></div><div class="btns"><button class="btn" data-a="goOnline">Online gehen</button></div>` : `<div class="inf">Online als <b>${o.name || "\u2026"}</b> \xB7 ${o.status === "online" ? '<span style="color:#8ef0a0">verbunden</span>' : '<span style="color:#ffb070">' + o.status + "</span>"}</div>
         ${this.confirm === "code" ? `<div class="code">${o.token}</div><div class="sm">Gib den Code niemandem \u2013 damit holst du dein Konto auf ein neues Handy.</div>` : ""}
         <div class="btns"><button class="btn ghost" data-a="showCode">${this.confirm === "code" ? "Code verbergen" : "Umzugscode"}</button>
         <button class="btn ${this.confirm === "logout" ? "danger" : "ghost"}" data-a="logout">${this.confirm === "logout" ? "<b>Wirklich abmelden?</b>" : "Abmelden"}</button></div>`;
      return `<div class="sub2">Grafik</div>
       <div class="inf">${g.auto ? "Automatisch \u2192 " : ""}<b>${TIERS[g.tier]}</b> \xB7 ${g.res[0]} \xD7 ${g.res[1]} \xB7 ${Math.round(g.fpsShown)} FPS</div>
       <div class="btns"><button class="btn" data-a="gfx">Grafik umschalten</button></div>
       <div class="sub2">Konto</div>${acc}
       <div class="sub2">Spielstand</div>
       <div class="btns"><button class="btn ghost" data-a="save">Speichern</button>
       <button class="btn ${this.confirm === "new" ? "danger" : "ghost"}" data-a="new">${this.confirm === "new" ? "<b>Wirklich neu anfangen?</b>" : "Neues Spiel"}</button></div>
       <div class="sm" style="margin-top:10px">Version ${this.version.name}${this.version.channel === "public" ? "" : " (Testversion)"} \xB7 Updates werden beim Start automatisch geladen.</div>`;
    }
  };

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
    ZU_SCHNELL: "Bitte kurz warten."
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
      return { power: c.power, tower: c.towerLevel, h: s.troops[0], w: s.troops[1], def: c.defense, res: s.res.map((v) => Math.floor(v)) };
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
        const d = r.delta || { res: [0, 0, 0, 0], h: 0, w: 0 };
        const s = this.c.s;
        d.res.forEach((v, i) => {
          if (v) this.c.addRes(i, v);
        });
        if (d.h) s.troops[0] = Math.max(0, s.troops[0] + d.h);
        if (d.w) s.troops[1] = Math.max(0, s.troops[1] + d.w);
        if (d.h > 0 || d.w > 0) this.c.msg(`${Math.max(0, d.h) + Math.max(0, d.w)} Soldaten sind heimgekehrt${d.res.some((v) => v > 0) ? " \u2013 mit Beute!" : "."}`);
        this.reports = r.reports || [];
        for (const rep of this.reports.slice().reverse()) if (rep.id > this.lastReport) {
          this.c.msg(rep.text);
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
    async loadRanking() {
      if (!this.token) return;
      try {
        this.ranking = await this.call("ranking", { p_token: this.token });
      } catch (e) {
      }
    }
    async sendMarch(kind, target, h2, w) {
      const s = this.c.s;
      const r = await this.call("send_march", () => ({
        p_token: this.token,
        p_kind: kind,
        p_target: kind === "terr" ? target : null,
        p_target_player: kind === "player" ? target : null,
        p_h: h2,
        p_w: w
      }));
      s.troops[0] -= h2;
      s.troops[1] -= w;
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
    /// eigene Gebiete (für Produktionsbonus)
    ownedBonus() {
      return this.owned;
    }
    troopsAway() {
      let h2 = 0, w = 0;
      for (const m of this.marches) {
        h2 += m.h;
        w += m.w;
      }
      if (this.world && this.me) {
        for (const t of this.world.territories) if (t.owner === this.me.id) {
          h2 += t.gh || 0;
          w += t.gw || 0;
        }
      }
      return { h: h2, w };
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
    const ptrs = /* @__PURE__ */ new Map();
    let moved = 0, pinch = 0;
    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) moved = 0;
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
        moved = 999;
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
        if (moved > 10) world.pan(dx, dy, canvas.clientHeight);
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
      if (!p) return;
      if (ptrs.size === 0 && moved <= 10 && e.type === "pointerup") {
        const rect = canvas.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width * 2 - 1, ny = 1 - (e.clientY - rect.top) / rect.height * 2;
        if (ui.view === "city") ui.select(world.pick(nx, ny));
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
      } else {
        colony.catchUp();
        last = performance.now();
        online.sync();
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
