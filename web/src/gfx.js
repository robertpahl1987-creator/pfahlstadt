// Grafikstufen: erkennt die Geräteleistung, Auflösung bis 8K, regelt bei Ruckeln automatisch herunter.
export const TIERS = ['Niedrig', 'Mittel', 'Hoch', 'Ultra'];
const SCALE = [0.6, 0.8, 1, 1.25];          // Ultra = Supersampling über der Geräteauflösung
const SHADOW = [0, 1024, 2048, 4096];
const PARTICLES = [0.35, 0.65, 1, 1.5];
export const MAX_SIDE = 7680;               // 8K

export class Graphics {
  constructor(world, maxTex) {
    this.world = world;
    this.maxTex = maxTex || 4096;
    this.auto = localStorage.getItem('gfx_auto') !== '0';
    const stored = +localStorage.getItem('gfx_tier');
    this.tier = this.auto || isNaN(stored) ? this.detect() : Math.max(0, Math.min(3, stored));
    this.fps = 60; this.fpsShown = 60; this.low = 0; this.t = 0;
    this.res = [0, 0];
    this.apply();
  }

  detect() {
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
    if (!mobile) return 3;
    if (mem >= 8 && cores >= 8) return 3;
    if (mem >= 6) return 2;
    if (mem >= 4) return 1;
    return 0;
  }

  apply() {
    this.world.shadowSize = Math.min(SHADOW[this.tier], this.maxTex);
    this.world.particleMul = PARTICLES[this.tier];
    this.low = 0;
  }

  cycle() {
    if (this.auto) { this.auto = false; this.tier = 0; }
    else if (this.tier === 3) { this.auto = true; this.tier = this.detect(); }
    else this.tier++;
    localStorage.setItem('gfx_auto', this.auto ? '1' : '0');
    localStorage.setItem('gfx_tier', String(this.tier));
    this.apply();
  }

  /// Zielauflösung des Bildes in Pixeln
  size(cssW, cssH) {
    const dpr = window.devicePixelRatio || 1;
    let w = cssW * dpr * SCALE[this.tier], h = cssH * dpr * SCALE[this.tier];
    const cap = MAX_SIDE / Math.max(w, h);
    if (cap < 1) { w *= cap; h *= cap; }
    this.res = [Math.max(1, Math.round(w)), Math.max(1, Math.round(h))];
    return this.res;
  }

  update(dt, colony) {
    this.t += dt;
    this.fps += (1 / Math.max(dt, 0.001) - this.fps) * 0.05;
    if (Math.floor(this.t * 2) !== Math.floor((this.t - dt) * 2)) this.fpsShown = this.fps;
    if (!this.auto || this.t < 8) return;
    if (this.fps < 40) this.low += dt; else this.low = 0;
    if (this.low > 5 && this.tier > 0) {
      this.tier--;
      this.apply();
      colony.msg(`Grafik automatisch angepasst: ${TIERS[this.tier]}`);
    }
  }
}
