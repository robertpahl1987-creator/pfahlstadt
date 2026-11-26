// Seekarte: deine Stadt in der Mitte, Sandbänke/Halligen/Riffe ringsum, Märsche als Linien.
import { RES } from './game.js';


function blob(ctx, x, y, r, seed, fill, stroke) {
  ctx.beginPath();
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.75 + 0.25 * Math.sin(a * 3 + seed) * Math.cos(a * 2 + seed * 0.7);
    const px = x + Math.cos(a) * r * k, py = y + Math.sin(a) * r * k * 0.8;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
}

export class SeaMap {
  constructor(canvas, colony) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.c = colony;
    this.t = 0;
    this.ox = 0; this.oy = 0;   // Verschiebung durch Ziehen
  }
  drag(dx, dy) {
    const lim = this.u * 3.2;
    this.ox = Math.max(-lim, Math.min(lim, this.ox + dx));
    this.oy = Math.max(-lim, Math.min(lim, this.oy + dy));
  }

  layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = this.cv.clientWidth, h = this.cv.clientHeight;
    if (this.cv.width !== Math.round(w * dpr) || this.cv.height !== Math.round(h * dpr)) {
      this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    }
    this.dpr = dpr; this.w = w; this.h = h;
    this.u = Math.min(w, h) / 5.6;
    this.cx = w / 2 + this.ox; this.cy = h * 0.42 + this.oy;
  }

  pos(t) { return [this.cx + t.x * this.u, this.cy + t.y * this.u]; }

  pick(x, y) {
    let best = -1, bd = 1e9;
    for (const t of this.c.s.terr) {
      const [px, py] = this.pos(t);
      const d = Math.hypot(px - x, py - y);
      if (d < bd) { bd = d; best = t.id; }
    }
    return bd < this.u * 0.35 ? best : -1;
  }

  draw(dt, selected) {
    this.t += dt;
    this.layout();
    const ctx = this.ctx, { w, h, cx, cy, u } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // Meer
    const g = ctx.createRadialGradient(cx, cy, u * 0.3, cx, cy, Math.max(w, h) * 0.8);
    g.addColorStop(0, '#1d6f9a'); g.addColorStop(0.55, '#0f4c78'); g.addColorStop(1, '#082a48');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // Wellenlinien
    ctx.strokeStyle = 'rgba(160,215,240,0.12)'; ctx.lineWidth = 1.5;
    for (let k = 0; k < 26; k++) {
      const y = ((k * 53 + this.t * 6) % (h + 40)) - 20;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.03 + k + this.t * 0.8) * 3);
      ctx.stroke();
    }
    // Reichweite-Ringe
    ctx.setLineDash([4, 8]); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
    for (let r = 1; r <= 3; r++) { ctx.beginPath(); ctx.arc(cx, cy, r * 1.15 * u, 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([]);

    // Märsche
    for (const m of this.c.s.marches) {
      const t = this.c.s.terr[m.target];
      const [tx, ty] = this.pos(t);
      const p = 1 - m.left / m.total;
      const f = m.phase === 'out' ? p : 1 - p;
      ctx.strokeStyle = m.phase === 'out' ? (m.kind === 'attack' ? 'rgba(255,120,90,0.8)' : 'rgba(140,230,160,0.8)') : 'rgba(200,220,255,0.7)';
      ctx.setLineDash([6, 6]); ctx.lineDashOffset = -this.t * 20; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
      const bx = cx + (tx - cx) * f, by = cy + (ty - cy) * f;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#16323f'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⛵', bx, by);
    }

    // Gebiete
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.c.s.terr) {
      const [x, y] = this.pos(t);
      const r = u * (0.2 + t.ring * 0.03);
      const mine = t.owner === 1;
      if (t.id === selected) { ctx.fillStyle = 'rgba(120,220,255,0.25)'; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, Math.PI * 2); ctx.fill(); }
      blob(ctx, x, y, r * 1.2, t.seed % 100, 'rgba(120,200,215,0.35)');
      blob(ctx, x, y, r, t.seed % 100, t.kind === 'Riff' ? '#9a8f7f' : '#d9c79c', mine ? '#56e39a' : t.id === selected ? '#7fd3f0' : null);
      if (t.kind === 'Hallig') blob(ctx, x - r * 0.1, y - r * 0.1, r * 0.55, t.seed % 37, '#7fa35a');
      // Markierung
      ctx.font = `${Math.round(r * 0.75)}px system-ui`;
      ctx.fillText(mine ? '🚩' : '☠', x, y - r * 0.05);
      ctx.font = 'bold 12px system-ui';
      ctx.fillStyle = 'rgba(0,15,25,0.65)';
      const label = t.name, tw = ctx.measureText(label).width + 10;
      ctx.fillRect(x - tw / 2, y + r * 0.85, tw, 17);
      ctx.fillStyle = mine ? '#8ef0b0' : '#ffffff';
      ctx.fillText(label, x, y + r * 0.85 + 9);
      ctx.font = '11px system-ui'; ctx.fillStyle = '#cfe6ea';
      ctx.fillText(mine ? `+${t.pct}% ${RES[t.res]}` : `☠ ${Math.round(t.pirates)}`, x, y + r * 0.85 + 26);
    }

    // eigene Stadt
    ctx.fillStyle = 'rgba(255,215,120,0.18)'; ctx.beginPath(); ctx.arc(cx, cy, u * 0.32 + Math.sin(this.t * 2) * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a6a44'; ctx.beginPath(); ctx.arc(cx, cy, u * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.font = `${Math.round(u * 0.26)}px system-ui`; ctx.fillText('🗼', cx, cy);
    ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#ffe9a8'; ctx.fillText('Pfahlstadt', cx, cy + u * 0.32);
  }
}
