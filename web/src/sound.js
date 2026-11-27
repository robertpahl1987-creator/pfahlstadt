// Geräusche ohne Audiodateien: Brandung, Wind, Möwen, Hämmern, Alarmglocke (Web Audio, erzeugt)
export class Sound {
  constructor(colony, online) {
    this.c = colony; this.o = online;
    this.on = localStorage.getItem('pf_sound') !== '0';
    this.ctx = null; this.gullT = 4; this.hammerT = 1; this.lastIncoming = 0; this.raidRang = false;
    const start = () => { this.init(); };
    document.addEventListener('pointerdown', start, { once: false, passive: true });
  }

  toggle() {
    this.on = !this.on;
    localStorage.setItem('pf_sound', this.on ? '1' : '0');
    if (this.master) this.master.gain.value = this.on ? 0.9 : 0;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.on ? 0.9 : 0; this.master.connect(ctx.destination);
    // Rauschen als Grundlage
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = 0.985 * b + 0.015 * w; d[i] = b * 6 + w * 0.15; }
    this.noise = buf;
    // Brandung
    const surf = ctx.createBufferSource(); surf.buffer = buf; surf.loop = true;
    this.surfF = ctx.createBiquadFilter(); this.surfF.type = 'lowpass'; this.surfF.frequency.value = 500;
    this.surfG = ctx.createGain(); this.surfG.gain.value = 0;
    surf.connect(this.surfF).connect(this.surfG).connect(this.master); surf.start();
    // Wind / Regen
    const wind = ctx.createBufferSource(); wind.buffer = buf; wind.loop = true; wind.playbackRate.value = 1.7;
    this.windF = ctx.createBiquadFilter(); this.windF.type = 'bandpass'; this.windF.frequency.value = 900; this.windF.Q.value = 0.7;
    this.windG = ctx.createGain(); this.windG.gain.value = 0;
    wind.connect(this.windF).connect(this.windG).connect(this.master); wind.start();
  }

  update(dt, time) {
    if (!this.ctx || !this.on || this.ctx.state !== 'running') return;
    const c = this.c, now = this.ctx.currentTime;
    // Brandung schwillt mit den Wellen, lauter bei Flut und Sturm
    const storm = c.storm ? 1 : 0;
    const swell = 0.5 + 0.5 * Math.sin(time * 0.9) * Math.sin(time * 0.37 + 1);
    this.surfG.gain.setTargetAtTime(0.035 + 0.05 * swell + 0.02 * (c.tideSin || 0) + 0.08 * storm, now, 0.3);
    this.surfF.frequency.setTargetAtTime(380 + 300 * swell + 500 * storm, now, 0.3);
    this.windG.gain.setTargetAtTime(storm ? 0.06 + 0.04 * Math.sin(time * 1.7) : 0.006, now, 0.5);
    // Möwen bei Tag
    const day = c.s.dayTime > 0.22 && c.s.dayTime < 0.78;
    this.gullT -= dt;
    if (this.gullT <= 0) { this.gullT = 5 + Math.random() * 10; if (day && !storm) this.gull(); }
    // Hämmern auf Baustellen
    this.hammerT -= dt;
    if (this.hammerT <= 0) { this.hammerT = 0.45 + Math.random() * 0.5; if (c.activeBuilds > 0) this.hammer(); }
    // Alarmglocke: Piraten oder Angriff im Anmarsch
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
    if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(this.master); }
    for (let k = 0; k < n; k++) {
      const t = t0 + k * (0.22 + Math.random() * 0.08);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(base * 1.25, t); o.frequency.exponentialRampToValueAtTime(base * 0.7, t + 0.16);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = base; f.Q.value = 3;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.025, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.18);
      o.connect(f).connect(g).connect(pan || this.master); o.start(t); o.stop(t + 0.2);
    }
  }

  hammer() {
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 3;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400 + Math.random() * 800; f.Q.value = 4;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.07);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + 0.08);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = 180; o.type = 'triangle';
    og.gain.setValueAtTime(0.03, t); og.gain.exponentialRampToValueAtTime(0.0005, t + 0.06);
    o.connect(og).connect(this.master); o.start(t); o.stop(t + 0.07);
  }

  bell() {
    const ctx = this.ctx; if (!ctx || !this.on) return;
    for (let k = 0; k < 3; k++) {
      const t = ctx.currentTime + k * 0.55;
      for (const [fr, v] of [[620, 0.08], [1240, 0.035], [1860, 0.02], [2480, 0.012]]) {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = fr;
        g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 1.4);
        o.connect(g).connect(this.master); o.start(t); o.stop(t + 1.5);
      }
    }
  }
}
