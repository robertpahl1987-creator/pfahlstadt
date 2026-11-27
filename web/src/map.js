// Seekarte: offline mit eigenen Piraten-Inseln, online mit gemeinsamer Welt (Spieler, Allianzen, Gebiete).
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
  constructor(canvas, colony, online) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.c = colony;
    this.o = online;
    this.t = 0;
    this.ox = 0; this.oy = 0;
  }

  drag(dx, dy) {
    const lim = this.u * (this.isOnline ? 14 : 3.2);
    this.ox = Math.max(-lim, Math.min(lim, this.ox + dx));
    this.oy = Math.max(-lim, Math.min(lim, this.oy + dy));
  }

  get isOnline() { return !!(this.o && this.o.world && this.o.me); }

  layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = this.cv.clientWidth, h = this.cv.clientHeight;
    if (this.cv.width !== Math.round(w * dpr) || this.cv.height !== Math.round(h * dpr)) {
      this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    }
    this.dpr = dpr; this.w = w; this.h = h;
    this.u = Math.min(w, h) / (this.isOnline ? 7.5 : 5.6);
    this.cx = w / 2 + this.ox; this.cy = h * 0.42 + this.oy;
    this.home = this.isOnline ? [this.o.me.x, this.o.me.y] : [0, 0];
  }

  pos(x, y) { return [this.cx + (x - this.home[0]) * this.u, this.cy + (y - this.home[1]) * this.u]; }

  /// Alles Anklickbare: { type: 'terr'|'player', id, x, y }
  items() {
    if (this.isOnline) {
      const w = this.o.world;
      return [...w.territories.map((t) => ({ ...t, type: 'terr' })), ...w.players.filter((p) => p.id !== this.o.me.id).map((p) => ({ ...p, type: 'player' }))];
    }
    return this.c.s.terr.map((t) => ({ ...t, type: 'terr' }));
  }

  pick(x, y) {
    let best = null, bd = 1e9;
    for (const it of this.items()) {
      const [px, py] = this.pos(it.x, it.y);
      const d = Math.hypot(px - x, py - y);
      if (d < bd) { bd = d; best = it; }
    }
    return best && bd < this.u * 0.45 ? { type: best.type, id: best.id } : null;
  }

  draw(dt, sel) {
    this.t += dt;
    this.layout();
    const ctx = this.ctx, { w, h, u } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const [hx, hy] = this.pos(this.home[0], this.home[1]);
    const g = ctx.createRadialGradient(hx, hy, u * 0.3, hx, hy, Math.max(w, h) * 0.9);
    g.addColorStop(0, '#1d6f9a'); g.addColorStop(0.55, '#0f4c78'); g.addColorStop(1, '#082a48');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(160,215,240,0.12)'; ctx.lineWidth = 1.5;
    for (let k = 0; k < 26; k++) {
      const y = ((k * 53 + this.t * 6) % (h + 40)) - 20;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.03 + k + this.t * 0.8) * 3);
      ctx.stroke();
    }
    if (this.isOnline) this.drawOnline(sel); else this.drawOffline(sel);
  }

  label(x, y, text, color, sub) {
    const ctx = this.ctx;
    ctx.font = 'bold 12px system-ui';
    const tw = ctx.measureText(text).width + 10;
    ctx.fillStyle = 'rgba(0,15,25,0.7)';
    ctx.fillRect(x - tw / 2, y, tw, 17);
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 9);
    if (sub) { ctx.font = '11px system-ui'; ctx.fillStyle = '#cfe6ea'; ctx.fillText(sub, x, y + 26); }
  }

  island(t, x, y, r, selected, stroke, icon) {
    const ctx = this.ctx;
    if (selected) { ctx.fillStyle = 'rgba(120,220,255,0.25)'; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, Math.PI * 2); ctx.fill(); }
    blob(ctx, x, y, r * 1.2, t.seed % 100, 'rgba(120,200,215,0.35)');
    blob(ctx, x, y, r, t.seed % 100, t.kind === 'Riff' ? '#9a8f7f' : '#d9c79c', stroke || (selected ? '#7fd3f0' : null));
    if (t.kind === 'Hallig') blob(ctx, x - r * 0.1, y - r * 0.1, r * 0.55, t.seed % 37, '#7fa35a');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(r * 0.75)}px system-ui`;
    ctx.fillText(icon, x, y - r * 0.05);
  }

  march(fromX, fromY, toX, toY, frac, color) {
    const ctx = this.ctx;
    ctx.strokeStyle = color; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -this.t * 20; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(toX, toY); ctx.stroke(); ctx.setLineDash([]);
    const bx = fromX + (toX - fromX) * frac, by = fromY + (toY - fromY) * frac;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill();
  }

  city(x, y, name, color, mine, sub, selected, shield) {
    const ctx = this.ctx, u = this.u;
    if (selected) { ctx.fillStyle = 'rgba(120,220,255,0.25)'; ctx.beginPath(); ctx.arc(x, y, u * 0.45, 0, Math.PI * 2); ctx.fill(); }
    if (mine) { ctx.fillStyle = 'rgba(255,215,120,0.18)'; ctx.beginPath(); ctx.arc(x, y, u * 0.34 + Math.sin(this.t * 2) * 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = mine ? '#8a6a44' : '#6d5a4a'; ctx.beginPath(); ctx.arc(x, y, u * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(u * 0.24)}px system-ui`; ctx.fillText(mine ? '🗼' : '🏰', x, y);
    if (shield) { ctx.font = `${Math.round(u * 0.16)}px system-ui`; ctx.fillText('🛡', x + u * 0.2, y - u * 0.18); }
    this.label(x, y + u * 0.26, name, color, sub);
  }

  drawOffline(sel) {
    const ctx = this.ctx, u = this.u, [cx, cy] = this.pos(0, 0);
    ctx.setLineDash([4, 8]); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
    for (let r = 1; r <= 3; r++) { ctx.beginPath(); ctx.arc(cx, cy, r * 1.15 * u, 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([]);
    for (const m of this.c.s.marches) {
      const t = this.c.s.terr[m.target], [tx, ty] = this.pos(t.x, t.y), p = 1 - m.left / m.total;
      this.march(cx, cy, tx, ty, m.phase === 'out' ? p : 1 - p, m.phase === 'out' ? 'rgba(255,120,90,0.8)' : 'rgba(200,220,255,0.7)');
    }
    for (const t of this.c.s.terr) {
      const [x, y] = this.pos(t.x, t.y), r = u * (0.2 + t.ring * 0.03), mine = t.owner === 1;
      this.island(t, x, y, r, sel && sel.id === t.id, mine ? '#56e39a' : null, mine ? '🚩' : '☠');
      this.label(x, y + r * 0.85, t.name, mine ? '#8ef0b0' : '#fff', mine ? `+${t.pct}% ${RES[t.res]}` : `☠ ${Math.round(t.pirates)}`);
    }
    this.city(cx, cy, 'Pfahlstadt', '#ffe9a8', true);
  }

  drawOnline(sel) {
    const o = this.o, me = o.me, wld = o.world, u = this.u;
    const myAlly = me.alliance_id;
    const now = o.serverNow();
    const [mx, my] = this.pos(me.x, me.y);
    for (const m of o.marches) {
      let tx, ty;
      if (m.target_player) { const p = wld.players.find((q) => q.id === m.target_player); if (!p) continue; [tx, ty] = this.pos(p.x, p.y); }
      else { const t = wld.territories.find((q) => q.id === m.target_terr); if (!t) continue; [tx, ty] = this.pos(t.x, t.y); }
      let frac;
      if (m.status === 'out') { const a = Date.parse(m.depart), b = Date.parse(m.arrive); frac = Math.min(1, Math.max(0, (now - a) / Math.max(1, b - a))); }
      else { const b = Date.parse(m.back_at), a = b - Math.max(1, Date.parse(m.arrive) - Date.parse(m.depart)); frac = 1 - Math.min(1, Math.max(0, (now - a) / Math.max(1, b - a))); }
      this.march(mx, my, tx, ty, frac, m.status === 'out' ? (m.kind === 'player' ? 'rgba(255,90,90,0.85)' : 'rgba(255,170,90,0.8)') : 'rgba(200,220,255,0.7)');
    }
    for (const t of wld.territories) {
      const [x, y] = this.pos(t.x, t.y);
      if (x < -80 || y < -80 || x > this.w + 80 || y > this.h + 80) continue;
      const lhT = t.kind === 'Leuchtturm';
      const r = u * (lhT ? 0.45 : t.pct >= 30 ? 0.32 : t.pct >= 18 ? 0.27 : 0.23);
      const mine = t.owner === me.id, ally = !mine && t.owner && myAlly && t.owner_alliance === myAlly, enemy = t.owner && !mine && !ally;
      const col = mine ? '#56e39a' : ally ? '#6fb6ff' : enemy ? '#ff9a5a' : null;
      this.island(t, x, y, r, sel && sel.type === 'terr' && sel.id === t.id, col || (lhT ? '#ffd27a' : null), lhT ? '🗼' : t.owner ? '🚩' : '☠');
      const sub = mine ? `+${t.pct}% ${RES[t.res]}` : t.owner ? `${t.owner_name}` : `☠ ${t.strength}`;
      this.label(x, y + r * 0.85, t.name, mine ? '#8ef0b0' : ally ? '#a8d4ff' : enemy ? '#ffc29a' : '#fff', sub);
    }
    for (const p of wld.players) {
      if (p.id === me.id) continue;
      const [x, y] = this.pos(p.x, p.y);
      if (x < -80 || y < -80 || x > this.w + 80 || y > this.h + 80) continue;
      const ally = myAlly && p.alliance_id === myAlly;
      this.city(x, y, (p.tag ? `[${p.tag}] ` : '') + p.name, ally ? '#a8d4ff' : '#ffc29a', false, `⚔ ${p.power}${p.online ? ' · online' : ''}`, sel && sel.type === 'player' && sel.id === p.id, p.shield);
    }
    this.city(mx, my, o.name || 'Du', '#ffe9a8', true);
  }
}
