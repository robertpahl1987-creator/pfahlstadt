// WebGL2-Renderer: Licht mit Schatten, Nebel, Himmel mit Wolken, Wasser, Rauch, Regen, Lichtkegel.
import { mul, lookAt, ortho, invert, normalMat, ident, norm, add, scale } from './math.js';
import { GEO } from './geo.js';

const HEAD = '#version 300 es\nprecision highp float;\n';
const GAMMA = 'vec3 toOut(vec3 c){ c = c / (1.0 + c * 0.12); return pow(max(c, 0.0), vec3(1.0/2.2)); }\n';

const LIT_VS = HEAD + `
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec3 aCol; layout(location=3) in vec2 aMat;
uniform mat4 uVP, uModel, uShadowVP; uniform mat3 uNrmM;
out vec3 vPos; out vec3 vNrm; out vec3 vCol; out vec2 vMat; out vec4 vSh;
void main(){
  vec4 wp = uModel * vec4(aPos, 1.0);
  vPos = wp.xyz; vNrm = uNrmM * aNrm; vCol = pow(aCol, vec3(2.2)); vMat = aMat; vSh = uShadowVP * vec4(wp.xyz + normalize(uNrmM * aNrm) * 0.12, 1.0);
  gl_Position = uVP * wp;
}`;

const LIT_FS = HEAD + `precision highp sampler2DShadow;
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
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++)
    s += texture(uShadow, vec3(p.xy + vec2(float(x), float(y)) * uTexel, p.z - 0.0025));
  return s / 9.0;
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

const DEPTH_VS = HEAD + `layout(location=0) in vec3 aPos; uniform mat4 uVP, uModel; void main(){ gl_Position = uVP * uModel * vec4(aPos,1.0); }`;
const DEPTH_FS = HEAD + `out vec4 o; void main(){ o = vec4(1.0); }`;

const SKY_VS = HEAD + `out vec2 vNdc; void main(){ vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2)); vNdc = p*2.0-1.0; gl_Position = vec4(vNdc, 0.9999, 1.0); }`;
const SKY_FS = HEAD + `in vec2 vNdc; uniform mat4 uInvVP; uniform vec3 uCam, uSunDir, uZenith, uHorizon, uSunCol, uFogCol, uCloudCol;
uniform float uTime, uCloud, uNight; out vec4 o;
` + GAMMA + `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
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
    float lit = 0.6 + 0.4 * fbm(uv * 1.7 + 3.0);
    col = mix(col, uCloudCol * lit, c * (0.6 + 0.35 * uCloud) * smoothstep(0.0, 0.25, d.y));
    float st = step(0.9975, hash(floor(d.xz / (d.y + 0.05) * 160.0)));
    col += vec3(st) * uNight * (1.0 - c) * smoothstep(0.05, 0.4, d.y);
  }
  col = mix(uFogCol, col, smoothstep(-0.02, 0.16, d.y));
  o = vec4(toOut(col), 1.0);
}`;

const WATER_VS = HEAD + `layout(location=0) in vec3 aPos; uniform mat4 uVP; uniform float uY; out vec3 vPos;
void main(){ vPos = vec3(aPos.x * 140.0, uY, aPos.z * 140.0); gl_Position = uVP * vec4(vPos, 1.0); }`;
const WATER_FS = HEAD + `in vec3 vPos; uniform vec3 uCam, uSunDir, uSunCol, uFogCol, uDeep, uZenith, uHorizon, uPLPos, uPLCol;
uniform float uFogDen, uTime, uStorm, uPLRange; out vec4 o;
` + GAMMA + `
vec2 wave(vec2 p){
  float t = uTime; vec2 g = vec2(0.0); float a = 0.05 + 0.14 * uStorm;
  vec2 d1 = normalize(vec2(1.0, 0.3)), d2 = normalize(vec2(-0.4, 1.0)), d3 = normalize(vec2(0.7, -0.8)), d4 = normalize(vec2(-1.0, -0.2)), d5 = normalize(vec2(0.2, 1.0));
  g += d1 * cos(dot(d1, p) * 0.55 + t * 1.1) * 0.55 * a;
  g += d2 * cos(dot(d2, p) * 1.1 + t * 1.6) * 1.1 * a * 0.6;
  g += d3 * cos(dot(d3, p) * 2.3 + t * 2.4) * 2.3 * a * 0.3;
  g += d4 * cos(dot(d4, p) * 4.7 + t * 3.3) * 4.7 * a * 0.12;
  g += d5 * cos(dot(d5, p) * 9.1 + t * 4.1) * 9.1 * a * 0.05;
  return g;
}
void main(){
  vec2 g = wave(vPos.xz);
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 v = normalize(uCam - vPos);
  float fres = 0.06 + 0.9 * pow(1.0 - max(dot(n, v), 0.0), 4.0);
  vec3 r = reflect(-v, n);
  vec3 sky = mix(uHorizon, uZenith, pow(clamp(r.y, 0.0, 1.0), 0.5));
  vec3 col = mix(uDeep, sky, fres);
  col += uSunCol * pow(max(dot(r, uSunDir), 0.0), 260.0) * 4.0;
  vec3 lv = uPLPos - vPos; float d = length(lv);
  col += uPLCol * pow(max(dot(r, lv / d), 0.0), 60.0) * clamp(1.0 - d / (uPLRange * 2.5), 0.0, 1.0) * 1.5;
  float foam = smoothstep(0.32, 0.6, length(g)) * uStorm * 0.55;
  col = mix(col, vec3(0.85), foam);
  float dist = length(uCam - vPos);
  col = mix(col, uFogCol, 1.0 - exp(-pow(dist * uFogDen, 2.0)));
  o = vec4(toOut(col), mix(0.74, 0.96, fres));
}`;

const BEAM_VS = HEAD + `layout(location=0) in vec3 aPos; uniform mat4 uVP, uModel; out vec3 vPos;
void main(){ vec4 wp = uModel * vec4(aPos,1.0); vPos = wp.xyz; gl_Position = uVP * wp; }`;
const BEAM_FS = HEAD + `in vec3 vPos; uniform vec3 uOrigin, uColor; uniform float uLen, uAlpha; out vec4 o;
void main(){ float t = 1.0 - clamp(length(vPos - uOrigin) / uLen, 0.0, 1.0); o = vec4(uColor * t * t * uAlpha, 1.0); }`;

const PT_VS = HEAD + `layout(location=0) in vec3 aPos; layout(location=1) in vec2 aSA; uniform mat4 uVP; uniform vec3 uCam; uniform float uPx;
out float vA; void main(){ gl_Position = uVP * vec4(aPos,1.0); gl_PointSize = clamp(aSA.x * uPx / max(gl_Position.w, 0.1), 1.0, 256.0); vA = aSA.y; }`;
const PT_FS = HEAD + `in float vA; uniform vec3 uColor; uniform vec3 uFogCol; out vec4 o;
void main(){ vec2 p = gl_PointCoord * 2.0 - 1.0; float d = dot(p,p); if (d > 1.0) discard; float a = (1.0 - d) * vA; o = vec4(pow(uColor, vec3(1.0/2.2)), a); }`;

const LINE_VS = HEAD + `layout(location=0) in vec4 aP; uniform mat4 uVP; out float vA; void main(){ gl_Position = uVP * vec4(aP.xyz,1.0); vA = aP.w; }`;
const LINE_FS = HEAD + `in float vA; uniform vec3 uColor; out vec4 o; void main(){ o = vec4(uColor, vA); }`;

export function toLin(c) { return [Math.pow(c[0], 2.2), Math.pow(c[1], 2.2), Math.pow(c[2], 2.2)]; }

export class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false });
    if (!gl) throw new Error('WebGL2 wird von diesem Gerät nicht unterstützt.');
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

    // Wasser-Quad (wird im Shader auf 280 m skaliert)
    this.waterVao = gl.createVertexArray();
    gl.bindVertexArray(this.waterVao);
    const wb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, wb);
    const W = [];
    const N = 24; // Raster, damit Nebel/Perspektive sauber interpoliert
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const a = [x / N * 2 - 1, z / N * 2 - 1], b = [(x + 1) / N * 2 - 1, (z + 1) / N * 2 - 1];
      W.push(a[0] * 5, 0, a[1] * 5, b[0] * 5, 0, a[1] * 5, b[0] * 5, 0, b[1] * 5, a[0] * 5, 0, a[1] * 5, b[0] * 5, 0, b[1] * 5, a[0] * 5, 0, b[1] * 5);
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(W), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    this.waterCount = W.length / 3;

    // dynamische Puffer
    this.ptVao = gl.createVertexArray(); this.ptBuf = gl.createBuffer();
    gl.bindVertexArray(this.ptVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.ptBuf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
    this.lineVao = gl.createVertexArray(); this.lineBuf = gl.createBuffer();
    gl.bindVertexArray(this.lineVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
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
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Programm: ' + gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
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
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, S, 24);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 2, gl.FLOAT, false, S, 36);
    gl.bindVertexArray(null);
    return { vao, vb, ib, count: b.i.length };
  }

  free(m) {
    if (!m) return;
    const gl = this.gl;
    gl.deleteVertexArray(m.vao); gl.deleteBuffer(m.vb); gl.deleteBuffer(m.ib);
  }

  ensureShadow(size) {
    const gl = this.gl;
    if (size === this.shadowSize) return;
    if (this.shadowTex) { gl.deleteTexture(this.shadowTex); gl.deleteFramebuffer(this.shadowFb); this.shadowTex = null; }
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

    // ---- Schatten-Pass ----
    this.ensureShadow(s.shadowSize);
    let shadowVP = this.ident;
    if (this.shadowSize) {
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
    }

    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);

    const L = (c) => toLin(c);
    const fogL = L(s.fogCol), sunL = s.sunCol.map((v) => v), zen = L(s.zenith), hor = L(s.horizon);

    // ---- Himmel ----
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.useProgram(this.sky.p);
    const su = this.sky.u;
    gl.uniformMatrix4fv(su.uInvVP, false, invert(VP));
    gl.uniform3fv(su.uCam, s.camPos); gl.uniform3fv(su.uSunDir, s.sunDir);
    gl.uniform3fv(su.uZenith, zen); gl.uniform3fv(su.uHorizon, hor); gl.uniform3fv(su.uSunCol, sunL);
    gl.uniform3fv(su.uFogCol, fogL); gl.uniform3fv(su.uCloudCol, L(s.cloudCol));
    gl.uniform1f(su.uTime, s.time); gl.uniform1f(su.uCloud, s.cloud); gl.uniform1f(su.uNight, s.night);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);

    // ---- Beleuchtete Objekte ----
    const lu = this.lit.u;
    gl.useProgram(this.lit.p);
    gl.uniformMatrix4fv(lu.uVP, false, VP);
    gl.uniformMatrix4fv(lu.uShadowVP, false, shadowVP);
    gl.uniform3fv(lu.uSunDir, s.sunDir); gl.uniform3fv(lu.uSunCol, sunL);
    gl.uniform3fv(lu.uSkyAmb, L(s.ambSky)); gl.uniform3fv(lu.uGroundAmb, L(s.ambGround));
    gl.uniform3fv(lu.uCam, s.camPos); gl.uniform3fv(lu.uFogCol, fogL); gl.uniform1f(lu.uFogDen, s.fogDen);
    gl.uniform3fv(lu.uPLPos, s.plPos); gl.uniform3fv(lu.uPLCol, s.plCol); gl.uniform1f(lu.uPLRange, s.plRange);
    gl.uniform1f(lu.uShadowOn, this.shadowSize ? 1 : 0);
    gl.uniform1f(lu.uTexel, this.shadowSize ? 1 / this.shadowSize : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex || null);
    gl.uniform1i(lu.uShadow, 0);
    for (const d of s.draws) {
      if (!d.mesh) continue;
      gl.uniformMatrix4fv(lu.uModel, false, d.model || this.ident);
      gl.uniformMatrix3fv(lu.uNrmM, false, d.model ? (d.nrm || normalMat(d.model)) : this.identN);
      gl.uniform3fv(lu.uTint, d.tint || [1, 1, 1]);
      gl.uniform1f(lu.uEmis, d.emis === undefined ? 1 : d.emis);
      gl.bindVertexArray(d.mesh.vao);
      gl.drawElements(gl.TRIANGLES, d.mesh.count, gl.UNSIGNED_INT, 0);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);

    // ---- Transparentes: Wasser ----
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    const wu = this.water.u;
    gl.useProgram(this.water.p);
    gl.uniformMatrix4fv(wu.uVP, false, VP);
    gl.uniform1f(wu.uY, s.waterY);
    gl.uniform3fv(wu.uCam, s.camPos); gl.uniform3fv(wu.uSunDir, s.sunDir); gl.uniform3fv(wu.uSunCol, sunL);
    gl.uniform3fv(wu.uFogCol, fogL); gl.uniform1f(wu.uFogDen, s.fogDen);
    gl.uniform3fv(wu.uDeep, L(s.waterCol)); gl.uniform3fv(wu.uZenith, zen); gl.uniform3fv(wu.uHorizon, hor);
    gl.uniform3fv(wu.uPLPos, s.plPos); gl.uniform3fv(wu.uPLCol, s.plCol); gl.uniform1f(wu.uPLRange, s.plRange);
    gl.uniform1f(wu.uTime, s.time); gl.uniform1f(wu.uStorm, s.storm);
    gl.bindVertexArray(this.waterVao);
    gl.drawArrays(gl.TRIANGLES, 0, this.waterCount);

    // ---- Rauch ----
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

    // ---- Regen ----
    if (s.rain && s.rainCount) {
      gl.useProgram(this.line.p);
      gl.uniformMatrix4fv(this.line.u.uVP, false, VP);
      gl.uniform3fv(this.line.u.uColor, [0.8, 0.86, 0.92]);
      gl.bindVertexArray(this.lineVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
      gl.bufferData(gl.ARRAY_BUFFER, s.rain.subarray(0, s.rainCount * 8), gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.LINES, 0, s.rainCount * 2);
    }

    // ---- Leuchtturm-Strahl (additiv) ----
    if (s.beams && s.beams.length) {
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(this.beam.p);
      gl.uniformMatrix4fv(this.beam.u.uVP, false, VP);
      for (const b of s.beams) {
        gl.uniformMatrix4fv(this.beam.u.uModel, false, b.model);
        gl.uniform3fv(this.beam.u.uOrigin, b.origin);
        gl.uniform3fv(this.beam.u.uColor, [1.0, 0.85, 0.55]);
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
}
