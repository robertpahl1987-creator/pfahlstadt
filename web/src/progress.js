// VIP, Forschung (Akademie), Kapitäne, Werft & Flotte, Wahrzeichen – und alle Boni an einer Stelle
import { T, DEFS, RES, uSum } from './game.js';

const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

// ---------- VIP ----------
export const VIP_PTS = [0, 100, 300, 700, 1500, 3000, 5000, 8000, 12000, 17000, 25000];
export const VIP_PERKS = [
  '',
  'Tägliche VIP-Truhe · +2 % Produktion',
  '+5 % schneller bauen',
  '+1 Bautrupp (3 gleichzeitig)',
  '+10 % Sammler-Traglast · +5 % Produktion',
  '+1 Platz in der Bauwarteschlange · +10 % schneller ausbilden · +10 % schneller bauen',
  '+5 % Angriff und Verteidigung',
  '+1 Bautrupp (4 gleichzeitig) · +8 % Produktion',
  'Lazarett rettet +10 % mehr · +15 % schneller bauen',
  '+10 % schnellere Fahrten · +20 % schneller ausbilden',
  '+12 % Produktion · +10 % Angriff und Verteidigung · goldener VIP-Rahmen',
];
export function vipLevel(c) { const p = (c.s.vipPts || 0); let L = 0; for (let i = 1; i <= 10; i++) if (p >= VIP_PTS[i]) L = i; return L; }
export function addVip(c, n) {
  const before = vipLevel(c);
  c.s.vipPts = (c.s.vipPts || 0) + n;
  const after = vipLevel(c);
  if (after > before) c.msg(`👑 VIP-Stufe ${after} erreicht! ${VIP_PERKS[after]}`);
}
export const vipChestCan = (c) => vipLevel(c) >= 1 && c.s.vipDay !== today();
export function vipChest(c) {
  const L = vipLevel(c), f = 1 + 0.3 * (c.towerLevel - 1);
  return { res: [1, 1, 1, 0.3].map((v) => Math.round(300 * L * v * f)), items: { sp5: L, ...(L >= 4 ? { sp15: L - 3 } : {}), ...(L >= 8 ? { sp60: L - 7 } : {}) }, medals: Math.ceil(L / 3) };
}
export function claimVipChest(c) {
  if (!vipChestCan(c)) return null;
  const r = vipChest(c), s = c.s;
  r.res.forEach((v, i) => v && c.addRes(i, v));
  s.items = s.items || {};
  for (const k in r.items) s.items[k] = (s.items[k] || 0) + r.items[k];
  s.medals = (s.medals || 0) + r.medals;
  s.vipDay = today();
  return r;
}

// ---------- Forschung ----------
export const TECH = [
  { id: 'pile', ic: '🪵', name: 'Bessere Pfähle', text: '+0,3 m Deckhöhe', cost: [300, 60, 0, 60] },
  { id: 'gath', ic: '🧺', name: 'Flinke Sammler', text: '+10 % Traglast der Sammler', cost: [200, 120, 60, 20] },
  { id: 'atk', ic: '🔱', name: 'Schärfere Harpunen', text: '+5 % Angriff', cost: [250, 80, 0, 100] },
  { id: 'def', ic: '🛡️', name: 'Eichenschilde', text: '+5 % Verteidigung', cost: [300, 60, 0, 80] },
  { id: 'prod', ic: '🍲', name: 'Wattküche', text: '+5 % Produktion', cost: [200, 200, 100, 0] },
  { id: 'build', ic: '🔨', name: 'Zimmermannskunst', text: '−6 % Bauzeit', cost: [400, 50, 0, 60] },
  { id: 'drill', ic: '🎓', name: 'Drill', text: '−8 % Ausbildungszeit', cost: [150, 150, 50, 60] },
  { id: 'med', ic: '🩹', name: 'Wundkräuter', text: '+5 % gerettete Verwundete', cost: [100, 200, 200, 0] },
  { id: 'store', ic: '📦', name: 'Speicherkunst', text: '+10 % Lagerplatz', cost: [350, 100, 100, 20] },
  { id: 'navi', ic: '🧭', name: 'Navigation', text: '−6 % Fahrzeit', cost: [250, 100, 50, 80] },
];
export const TECH_MAX = 5;
export const techLv = (c, id) => ((c.s.tech || {})[id] || 0);
export const techCost = (t, k) => t.cost.map((v) => Math.round(v * Math.pow(1.8, k - 1)));
export const techTime = (c, k) => (60 * Math.pow(2, k - 1)) / (1 + 0.1 * Math.max(0, c.levels(T.AKADEMIE) - 1));
export function techBlocker(c, id) {
  const t = TECH.find((x) => x.id === id), k = techLv(c, id) + 1, ak = c.levels(T.AKADEMIE);
  if (ak <= 0) return 'Erst die Akademie bauen';
  if (k > TECH_MAX) return 'Fertig erforscht';
  if (c.s.research) return 'Es wird schon geforscht';
  if (ak < 2 * k - 1) return `Braucht Akademie Stufe ${2 * k - 1}`;
  if (!c.canAfford(techCost(t, k))) return 'Zu wenig Rohstoffe';
  return null;
}
export function startTech(c, id) {
  if (techBlocker(c, id)) return false;
  const t = TECH.find((x) => x.id === id), k = techLv(c, id) + 1, tt = techTime(c, k);
  c.pay(techCost(t, k));
  c.s.research = { id, left: tt, total: tt };
  c.msg(`📚 Forschung gestartet: ${t.name} ${k}`);
  return true;
}
export function researchTick(c, dt) {
  const r = c.s.research; if (!r) return;
  if (c.levels(T.AKADEMIE) <= 0) return;
  r.left -= dt;
  if (r.left <= 0) {
    c.s.tech = c.s.tech || {};
    c.s.tech[r.id] = (c.s.tech[r.id] || 0) + 1;
    const t = TECH.find((x) => x.id === r.id);
    c.msg(`📚 Erforscht: ${t.name} Stufe ${c.s.tech[r.id]} (${t.text})`);
    c.s.research = null;
  }
}

// ---------- Kapitäne ----------
export const CAPTAINS = [
  { id: 'hanne', ic: '🌊', name: 'Hanne Gezeitenkund', text: '+20 % Kampfkraft bei Ebbe', cost: 5 },
  { id: 'okko', ic: '⛈️', name: 'Okko Sturmkapitän', text: '+20 % Kampfkraft bei Flut', cost: 5 },
  { id: 'gesa', ic: '💪', name: 'Gesa Eisenfaust', text: '+12 % Kampfkraft immer', cost: 10 },
  { id: 'fiete', ic: '💰', name: 'Fiete Plünderer', text: '+30 % Beute', cost: 10 },
  { id: 'wiebke', ic: '🧭', name: 'Wiebke Lotsin', text: '−25 % Fahrzeit', cost: 15 },
];
export const capOf = (c, id) => (c.s.captains || {})[id];
export const capMul = (lvl) => 1 + 0.1 * (lvl - 1);
export function capFree(c, id) { const k = capOf(c, id); return k && !(k.busy > Date.now()); }
export function hireCaptain(c, id) {
  const d = CAPTAINS.find((x) => x.id === id), s = c.s;
  if (!d || capOf(c, id)) return 'Schon angeheuert';
  if ((s.medals || 0) < d.cost) return `Braucht ${d.cost} Kapitänsabzeichen`;
  s.medals -= d.cost; s.captains = s.captains || {}; s.captains[id] = { lvl: 1, xp: 0, busy: 0 };
  c.msg(`🎖️ ${d.name} ist an Bord!`);
  return null;
}
export function upCaptain(c, id) {
  const k = capOf(c, id), s = c.s; if (!k) return 'Nicht angeheuert';
  if (k.lvl >= 10) return 'Höchste Stufe';
  const need = k.lvl * 2;
  if ((s.medals || 0) < need) return `Braucht ${need} Abzeichen`;
  s.medals -= need; k.lvl++;
  c.msg(`🎖️ ${CAPTAINS.find((x) => x.id === id).name} ist jetzt Stufe ${k.lvl}.`);
  return null;
}
// ---------- Ausrüstung der Kapitäne (Schmiede) ----------
export const GEAR = [
  { id: 'hut', ic: '🎩', name: 'Kapitänshut', text: '+1,5 % Kampfkraft je Stufe' },
  { id: 'saebel', ic: '🗡️', name: 'Entersäbel', text: '+1,5 % Kampfkraft je Stufe' },
  { id: 'mantel', ic: '🧥', name: 'Ölzeugmantel', text: '+2 % Beute je Stufe' },
  { id: 'kompass', ic: '🧭', name: 'Messingkompass', text: '−1 % Fahrzeit je Stufe' },
];
export const GEAR_MAX = 10;
export const gearLv = (c, cap, slot) => (((c.s.gear || {})[cap] || {})[slot] || 0);
export const gearCost = (k) => ({ ore: 2 + 2 * k, metal: 50 * k });
export function gearBlocker(c, cap, slot) {
  if (!capOf(c, cap)) return 'Kapitän erst anheuern';
  const k = gearLv(c, cap, slot) + 1, g = gearCost(k);
  if (k > GEAR_MAX) return 'Höchste Stufe';
  if (k > capOf(c, cap).lvl + 2) return `Braucht Kapitän Stufe ${k - 2}`;
  if ((c.s.ore || 0) < g.ore) return `Braucht ${g.ore} 🔩`;
  if (c.s.res[3] < g.metal) return 'Zu wenig Altmetall';
  return null;
}
export function forgeGear(c, cap, slot) {
  const e = gearBlocker(c, cap, slot); if (e) return e;
  const k = gearLv(c, cap, slot) + 1, g = gearCost(k), s = c.s;
  s.ore -= g.ore; s.res[3] -= g.metal;
  s.gear = s.gear || {}; s.gear[cap] = s.gear[cap] || {}; s.gear[cap][slot] = k;
  c.msg(`⚒️ ${GEAR.find((x) => x.id === slot).name} für ${CAPTAINS.find((x) => x.id === cap).name.split(' ')[0]} ist jetzt Stufe ${k}.`);
  return null;
}
const gAtk = (c, id) => 1 + 0.015 * (gearLv(c, id, 'hut') + gearLv(c, id, 'saebel'));

/// Kampf-Faktor eines Kapitäns (bei Ebbe/Flut/immer) inkl. Ausrüstung
export function capAtk(c, id, tide) {
  const k = capOf(c, id); if (!k) return 1;
  const m = capMul(k.lvl), g = gAtk(c, id);
  if (id === 'hanne') return (tide === -1 ? 1 + 0.2 * m : 1) * g;
  if (id === 'okko') return (tide === 1 ? 1 + 0.2 * m : 1) * g;
  if (id === 'gesa') return (1 + 0.12 * m) * g;
  return g;
}
export const capLoot = (c, id) => (capOf(c, id) ? (id === 'fiete' ? 1 + 0.3 * capMul(capOf(c, id).lvl) : 1) * (1 + 0.02 * gearLv(c, id, 'mantel')) : 1);
export const capSpeed = (c, id) => (capOf(c, id) ? (id === 'wiebke' ? Math.max(0.5, 1 - 0.25 * capMul(capOf(c, id).lvl) * 0.8) : 1) * (1 - 0.01 * gearLv(c, id, 'kompass')) : 1);
export function capSend(c, id, travel) { const k = capOf(c, id); if (k) { k.busy = Date.now() + travel * 2000 + 5000; k.xp = (k.xp || 0) + 1; } }

// ---------- Werft & Flotte ----------
export const BOAT_COST = [220, 0, 0, 70], BOAT_TIME = 60, BOAT_CAP = 25;
export const maxBoats = (c) => 2 * c.levels(T.WERFT);
export function boatBlocker(c) {
  if (c.levels(T.WERFT) <= 0) return 'Erst die Werft bauen';
  if ((c.s.boats || 0) + (c.s.boatQ ? 1 : 0) >= maxBoats(c)) return `Höchstens ${maxBoats(c)} Kutter (Werft ausbauen)`;
  if (c.s.boatQ) return 'Es wird schon ein Kutter gebaut';
  if (!c.canAfford(BOAT_COST)) return 'Zu wenig Rohstoffe';
  return null;
}
export function buildBoat(c) {
  if (boatBlocker(c)) return false;
  c.pay(BOAT_COST);
  const tt = BOAT_TIME / (1 + 0.1 * (c.levels(T.WERFT) - 1));
  c.s.boatQ = { left: tt, total: tt };
  c.msg('⚓ Ein Kutter wird gebaut.');
  return true;
}
export function boatTick(c, dt) {
  const q = c.s.boatQ; if (!q) return;
  q.left -= dt;
  if (q.left <= 0) { c.s.boats = (c.s.boats || 0) + 1; c.s.boatQ = null; c.msg('⚓ Neuer Kutter vom Stapel gelaufen!'); }
}
/// Passt der Trupp auf die Flotte, segelt er schneller und trägt mehr
export const fleetFits = (c, u) => (c.s.boats || 0) * BOAT_CAP >= uSum(u) && uSum(u) > 0;
export const fleetSpeed = (c, u) => (fleetFits(c, u) ? 0.75 : 1);
export const fleetLoot = (c, u) => (fleetFits(c, u) ? 1.25 : 1);

// ---------- alle Boni ----------
export function mods(c) {
  const v = vipLevel(c), L = c.levels(T.WAHRZEICHEN), o = c.online;
  const ally = o && o.active && o.ally ? o.ally : {};
  return {
    prod: (1 + [0, 0.02, 0.02, 0.02, 0.05, 0.05, 0.05, 0.08, 0.08, 0.08, 0.12][v]) * (1 + 0.05 * techLv(c, 'prod')) * (1 + 0.02 * L) * (1 + (ally.landmark || 0) + (ally.workshop || 0)),
    build: 1 / (1 + [0, 0, 0.05, 0.05, 0.05, 0.1, 0.1, 0.1, 0.15, 0.15, 0.15][v]) * Math.max(0.5, 1 - 0.06 * techLv(c, 'build')) * (1 - (ally.build || 0)),
    train: 1 / (1 + (v >= 9 ? 0.2 : v >= 5 ? 0.1 : 0)) * Math.max(0.5, 1 - 0.08 * techLv(c, 'drill')),
    builds: 2 + (v >= 3 ? 1 : 0) + (v >= 7 ? 1 : 0),
    queue: 3 + (v >= 5 ? 1 : 0),
    gather: 1 + (v >= 4 ? 0.1 : 0) + 0.1 * techLv(c, 'gath') + (ally.gather || 0),
    atk: (1 + (v >= 10 ? 0.1 : v >= 6 ? 0.05 : 0)) * (1 + 0.05 * techLv(c, 'atk')) * (1 + (ally.atk || 0)),
    def: (1 + (v >= 10 ? 0.1 : v >= 6 ? 0.05 : 0)) * (1 + 0.05 * techLv(c, 'def')) * (1 + (ally.def || 0)),
    save: (v >= 8 ? 0.1 : 0) + 0.05 * techLv(c, 'med'),
    travel: (v >= 9 ? 0.9 : 1) * Math.max(0.6, 1 - 0.06 * techLv(c, 'navi')) * (1 - (ally.march || 0)),
    store: (1 + 0.1 * techLv(c, 'store')) * (1 + (ally.storage || 0)),
    deck: 0.3 * techLv(c, 'pile'),
    dam: ally.dike || 0,
  };
}
export { RES, DEFS };
