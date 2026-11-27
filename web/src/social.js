// Aufstellung (Basis-Editor), Hindernisse im Watt, Allianz-Hilfe (Anwendung auf Bau/Forschung)
import { fmtTime, uSum } from './game.js';

// ---------- Aufstellung der Verteidiger ----------
// f[i] = Reihe der Einheit i: 0 vorne, 1 Mitte, 2 hinten (wie auf dem Server)
export const ROWS = ['Vorne', 'Mitte', 'Hinten'];
export const ROW_IC = ['🛡️', '⚔️', '🏹'];
export const formOf = (c) => (Array.isArray(c.s.formation) && c.s.formation.length === 5 ? c.s.formation : [0, 0, 0, 0, 0]);
export function formMul(f) {
  return 1 + (f[1] === 0 ? 0.06 : 0) + (f[0] === 2 ? 0.04 : 0) + (f[3] === 2 ? 0.04 : 0) + (f[2] === 1 ? 0.03 : 0)
    - (f[0] === 0 ? 0.04 : 0) - (f[3] === 0 ? 0.04 : 0);
}
export const FORM_TIPS = [
  'Schildwachen vorne fangen die Angreifer ab (+6 %).',
  'Harpuniere und Schleuderer hinten schießen geschützt (je +4 %, vorne −4 %).',
  'Enterer in der Mitte springen dorthin, wo es brennt (+3 %).',
];
export const FORM_PRESETS = [
  { name: 'Igel', ic: '🦔', f: [2, 0, 1, 2, 1], text: 'Ausgewogen, stärkste Verteidigung' },
  { name: 'Mauer', ic: '🧱', f: [1, 0, 0, 2, 0], text: 'Alle Nahkämpfer vorne' },
  { name: 'Sturm', ic: '🌊', f: [0, 0, 0, 0, 0], text: 'Alle in einer Reihe (schwach)' },
];
export function setRow(c, u, row) {
  const f = formOf(c).slice(); f[u] = Math.max(0, Math.min(2, row)); c.s.formation = f;
}

// ---------- Hindernisse ----------
export const OBST = [
  { name: 'Treibgut-Haufen', ic: '🪵', cost: [0, 0, 0, 0], time: 20 },
  { name: 'Schiffswrack', ic: '⚓', cost: [60, 0, 0, 0], time: 60 },
  { name: 'Tangberg', ic: '🌿', cost: [0, 40, 0, 0], time: 40 },
  { name: 'Felsbrocken', ic: '🪨', cost: [100, 0, 0, 20], time: 90 },
];
export const OBST_MAX = 5;
export function obstTick(c, dt) {
  const s = c.s;
  if (!s.obst) s.obst = [];
  s.obstT = (s.obstT === undefined ? 45 : s.obstT) - dt;
  if (s.obstT <= 0) {
    s.obstT = 240 + Math.random() * 240;
    if (s.obst.length < OBST_MAX) {
      let x = 0, z = 0;
      for (let k = 0; k < 12; k++) {
        const a = Math.random() * Math.PI * 2, r = c.areaRadius + 8 + Math.random() * 8;
        x = Math.sin(a) * r; z = Math.cos(a) * r;
        if (z > -(c.areaRadius + 2) || Math.abs(x) > 14) { if (!s.obst.some((o) => Math.hypot(o.x - x, o.z - z) < 6)) break; }
      }
      s.obstSeq = (s.obstSeq || 0) + 1;
      const r = Math.random(), kind = r < 0.4 ? 0 : r < 0.65 ? 2 : r < 0.85 ? 1 : 3;
      s.obst.push({ id: s.obstSeq, kind, x, z, rot: Math.random() * 360 });
    }
  }
  const cl = s.clearing;
  if (cl) {
    cl.left -= dt;
    if (cl.left <= 0) { s.clearing = null; finishObst(c, cl.id); }
  }
}
export function obstBlocker(c, id) {
  const o = (c.s.obst || []).find((x) => x.id === id);
  if (!o) return 'Schon weggeräumt';
  if (c.s.clearing) return c.s.clearing.id === id ? 'Wird gerade geräumt' : 'Es wird schon ein Hindernis geräumt';
  if (!c.canAfford(OBST[o.kind].cost)) return 'Zu wenig Rohstoffe';
  return null;
}
export function startObst(c, id) {
  if (obstBlocker(c, id)) return false;
  const o = c.s.obst.find((x) => x.id === id), d = OBST[o.kind];
  c.pay(d.cost);
  c.s.clearing = { id, left: d.time, total: d.time };
  c.msg(`🧹 ${d.name} wird weggeräumt (${fmtTime(d.time)}).`);
  return true;
}
function finishObst(c, id) {
  const s = c.s, k = (s.obst || []).findIndex((x) => x.id === id);
  if (k < 0) return;
  const o = s.obst[k]; s.obst.splice(k, 1);
  const f = 1 + 0.3 * (c.towerLevel - 1), rnd = (a, b) => Math.round((a + Math.random() * (b - a)) * f);
  const got = [];
  const res = (i, v, ic) => { c.addRes(i, v); got.push(`${ic} ${v}`); };
  if (o.kind === 0) res(0, rnd(80, 200), '🪵');
  else if (o.kind === 1) { res(3, rnd(40, 120), '⚙️'); s.ore = (s.ore || 0) + 1 + Math.floor(Math.random() * 2); got.push('🔩 Schmiedeeisen'); }
  else if (o.kind === 2) { res(1, rnd(60, 160), '🦪'); res(2, rnd(40, 100), '💧'); }
  else { s.ore = (s.ore || 0) + 2 + Math.floor(Math.random() * 2); got.push('🔩 Schmiedeeisen'); res(3, rnd(30, 80), '⚙️'); }
  if (Math.random() < 0.25) { s.items = s.items || {}; s.items.sp5 = (s.items.sp5 || 0) + 1; got.push('⚡ 5 Min.'); }
  s.vipPts = (s.vipPts || 0) + 2;
  s.obstCleared = (s.obstCleared || 0) + 1;
  c.msg(`🧹 ${OBST[o.kind].name} geräumt: ${got.join(' · ')}`);
}

// ---------- Allianz-Hilfe ----------
/// Laufende Aufträge, für die Verbündete helfen können
export function helpTargets(c) {
  const s = c.s, out = [];
  s.plots.forEach((p, i) => { if (p.type >= 0 && p.buildLeft > 1) out.push({ key: `b:${i}:${p.level + 1}`, label: `🔨 Bau Stufe ${p.level + 1}`, kind: 'b', i }); });
  if (s.research && s.research.left > 1) out.push({ key: `r:${s.research.id}:${((s.tech || {})[s.research.id] || 0) + 1}`, label: '📚 Forschung', kind: 'r' });
  return out;
}
export const helpStep = (total) => Math.max(30, total * 0.015);
export function applyHelp(c, key, n) {
  const s = c.s, [kind, a, lv] = key.split(':');
  if (kind === 'b') {
    const p = s.plots[+a];
    if (!p || p.buildLeft <= 0 || p.level + 1 !== +lv) return 0;
    const red = Math.min(p.buildLeft - 0.5, helpStep(p.buildTotal) * n);
    if (red <= 0) return 0;
    p.buildLeft -= red; return red;
  }
  if (kind === 'r') {
    const r = s.research;
    if (!r || r.id !== a || ((s.tech || {})[a] || 0) + 1 !== +lv) return 0;
    const red = Math.min(r.left - 0.5, helpStep(r.total) * n);
    if (red <= 0) return 0;
    r.left -= red; return red;
  }
  return 0;
}

export const gcapOf = (c) => 15 + 10 * c.towerLevel;
export { uSum };
