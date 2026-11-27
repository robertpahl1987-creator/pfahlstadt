// Belohnungen, Tagesaufgaben, Erfolge, Einführung, Bauwarteschlange, Händlerschiff
import { T, DEFS, UNITS, RES, uSum, costFor } from './game.js';

const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const yesterday = () => { const d = new Date(Date.now() - 864e5); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

// ---------- Tägliche Anmeldebelohnung (7-Tage-Kalender) ----------
export const DAILY = [
  { res: [200, 120, 80, 0] }, { res: [300, 200, 150, 20] }, { res: [0, 0, 0, 60], u: [3, 3, 0, 0, 0] },
  { res: [500, 300, 200, 40] }, { res: [0, 400, 300, 80] }, { res: [800, 500, 400, 120] }, { res: [1000, 800, 600, 200], u: [0, 0, 5, 2, 5], big: true },
];
export function dailyReward(c, day) {
  const f = 1 + 0.35 * (c.towerLevel - 1), d = DAILY[day];
  return { res: d.res.map((v) => Math.round(v * f)), u: d.u || [0, 0, 0, 0, 0], big: d.big };
}
export function dailyState(c) {
  const s = c.s;
  if (!s.daily) s.daily = { last: '', streak: 0 };
  const can = s.daily.last !== today();
  const day = can ? (s.daily.last === yesterday() ? s.daily.streak % 7 : 0) : (s.daily.streak - 1) % 7;
  return { can, day };
}
export function claimDaily(c) {
  const st = dailyState(c);
  if (!st.can) return null;
  const r = dailyReward(c, st.day);
  r.res.forEach((v, i) => v && c.addRes(i, v));
  c.s.troops = c.s.troops.map((v, i) => v + (r.u[i] || 0));
  c.s.daily = { last: today(), streak: st.day + 1 };
  return r;
}

// ---------- Tagesaufgaben ----------
const QUESTS = [
  { id: 'build', text: (n) => `Starte ${n} Bau- oder Ausbauarbeiten`, n: [2, 3, 4], rw: [0, 0, 0, 40] },
  { id: 'gather', text: (n) => `Sammler bringen ${n} Rohstoffe heim`, n: [150, 300, 500], rw: [200, 150, 0, 0] },
  { id: 'train', text: (n) => `Bilde ${n} Krieger aus`, n: [5, 10, 20], rw: [0, 250, 150, 0] },
  { id: 'win', text: (n) => `Gewinne ${n} Kampf${n > 1 ? 'e' : ''}`, n: [1, 2], rw: [300, 0, 0, 80] },
  { id: 'exp', text: (n) => `Mach ${n} Wattwanderung${n > 1 ? 'en' : ''}`, n: [1, 2, 3], rw: [150, 150, 150, 0] },
  { id: 'trade', text: () => 'Handle mit dem Händlerschiff', n: [1], rw: [0, 0, 200, 50] },
  { id: 'heal', text: (n) => `Heile ${n} verwundete Krieger`, n: [3, 6], rw: [0, 200, 200, 0] },
];
export function questsToday(c) {
  const s = c.s;
  if (!s.quests || s.quests.day !== today()) {
    let seed = [...today()].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
    const R = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const pool = QUESTS.slice(), list = [];
    while (list.length < 3) { const q = pool.splice(Math.floor(R() * pool.length), 1)[0]; list.push({ id: q.id, n: q.n[Math.floor(R() * q.n.length)], have: 0, done: false }); }
    s.quests = { day: today(), list };
  }
  return s.quests.list.map((q) => { const d = QUESTS.find((x) => x.id === q.id); const f = 1 + 0.35 * (c.towerLevel - 1); return { ...q, text: d.text(q.n), rw: d.rw.map((v) => Math.round(v * f)) }; });
}
export function questEvent(c, id, n) {
  const s = c.s;
  if (!s.quests || s.quests.day !== today()) questsToday(c);
  for (const q of s.quests.list) if (q.id === id && !q.done && q.have < q.n) {
    q.have = Math.min(q.n, q.have + n);
    if (q.have >= q.n) c.msg('✅ Tagesaufgabe erfüllt – Belohnung abholen unter 🎁!');
  }
  s.stats = s.stats || {};
  s.stats[id] = (s.stats[id] || 0) + n;
}
export function claimQuest(c, k) {
  const list = questsToday(c), q = list[k];
  if (!q || q.done || q.have < q.n) return false;
  q.rw.forEach((v, i) => v && c.addRes(i, v));
  c.s.quests.list[k].done = true;
  return true;
}

// ---------- Erfolge ----------
export const ACH = [
  { id: 'b5', ic: '🏗️', name: 'Baumeister', text: '5 Gebäude errichtet', ok: (c) => c.s.plots.filter((p) => p.type >= 0 && p.level > 0).length >= 5 },
  { id: 'b20', ic: '🏘️', name: 'Pfahlstadt', text: '20 Gebäude errichtet', ok: (c) => c.s.plots.filter((p) => p.type >= 0 && p.level > 0).length >= 20 },
  { id: 't5', ic: '🗼', name: 'Leuchtfeuer', text: 'Gezeitenturm Stufe 5', ok: (c) => c.towerLevel >= 5 },
  { id: 't10', ic: '🌟', name: 'Turmherr', text: 'Gezeitenturm Stufe 10', ok: (c) => c.towerLevel >= 10 },
  { id: 't20', ic: '👑', name: 'Herr der Gezeiten', text: 'Gezeitenturm Stufe 20', ok: (c) => c.towerLevel >= 20 },
  { id: 'd1', ic: '🌊', name: 'Deichbauer', text: 'Damm gebaut', ok: (c) => c.levels(T.DAMM) >= 1 },
  { id: 'd10', ic: '🛡️', name: 'Deichgraf', text: 'Damm Stufe 10', ok: (c) => c.levels(T.DAMM) >= 10 },
  { id: 'w1', ic: '🧱', name: 'Festung', text: 'Festungsmauer gebaut', ok: (c) => c.levels(T.MAUER) >= 1 },
  { id: 'a50', ic: '⚔️', name: 'Heerführer', text: '50 Krieger gleichzeitig', ok: (c) => c.troopTotal >= 50 },
  { id: 'a200', ic: '🎖️', name: 'Feldherr', text: '200 Krieger gleichzeitig', ok: (c) => c.troopTotal >= 200 },
  { id: 'v1', ic: '🚩', name: 'Erste Insel', text: 'Ein Gebiet erobert', ok: (c) => (c.s.stats && c.s.stats.win >= 1) },
  { id: 'v10', ic: '🏴', name: 'Eroberer', text: '10 Kämpfe gewonnen', ok: (c) => (c.s.stats && c.s.stats.win >= 10) },
  { id: 'g1k', ic: '🧺', name: 'Sammler', text: '1000 Rohstoffe gesammelt', ok: (c) => (c.s.stats && c.s.stats.gather >= 1000) },
  { id: 'tr5', ic: '⛵', name: 'Kaufmann', text: '5 Mal gehandelt', ok: (c) => (c.s.stats && c.s.stats.trade >= 5) },
  { id: 'dl7', ic: '📅', name: 'Treue Seele', text: '7 Tage am Stück dabei', ok: (c) => c.s.daily && c.s.daily.streak >= 7 },
  { id: 'p100', ic: '👥', name: 'Großstadt', text: '100 Bewohner', ok: (c) => c.s.survivors >= 100 },
  { id: 'all5', ic: '🎓', name: 'Alle Waffengattungen', text: 'Alle 5 Kriegerarten ausgebildet', ok: (c) => c.s.troops.slice(0, 5).every((v) => v > 0) },
];
export function checkAch(c) {
  const s = c.s; s.ach = s.ach || {};
  for (const a of ACH) if (!s.ach[a.id] && a.ok(c)) { s.ach[a.id] = Date.now(); c.msg(`🏅 Erfolg freigeschaltet: ${a.ic} ${a.name}!`); }
}
export const achCount = (c) => Object.keys(c.s.ach || {}).length;

// ---------- Einführung ----------
export const TUT = [
  { text: 'Willkommen! Tippe unten auf <b>🏗️ Gebäude</b> → <b>Neu bauen</b> und baue eine <b>Unterkunft</b>.', ok: (c) => c.s.plots.filter((p) => p.type === T.HAUS).length >= 2 },
  { text: 'Vor dem Tor liegen Sammelstellen. Tippe eine an und schicke mit <b>+1</b> Bewohner zum Sammeln.', ok: (c) => c.s.gath.length > 0 || (c.s.stats && c.s.stats.gather > 0) },
  { text: 'Baue den <b>Gezeitenturm</b> (Mitte) auf Stufe 2 aus – er hebt die Stadt über die Flut.', ok: (c) => c.towerLevel >= 2 },
  { text: 'Baue eine <b>Küche</b> – sie steigert die gesamte Produktion.', ok: (c) => c.levels(T.KUECHE) > 0 },
  { text: 'Für Krieger brauchst du die <b>Kaserne</b> und einen <b>Harpunierhof</b>.', ok: (c) => c.levels(T.KASERNE) > 0 && c.levels(T.HARPHOF) > 0 },
  { text: 'Bilde unter <b>⚔️ Truppen</b> 5 Harpuniere aus.', ok: (c) => c.troopTotal >= 5 },
  { text: 'Öffne die <b>🗺️ Karte</b> und erobere eine Pirateninsel in deiner Nähe.', ok: (c) => (c.s.stats && c.s.stats.win >= 1) },
  { text: 'Hol dir jeden Tag deine Belohnung bei <b>🎁</b> rechts unten. Viel Spaß!', ok: (c) => c.s.daily && c.s.daily.last === today() },
];
export function tutStep(c) {
  const s = c.s;
  if (s.tut === undefined) s.tut = c.towerLevel >= 3 ? TUT.length : 0;
  while (s.tut < TUT.length && TUT[s.tut].ok(c)) { s.tut++; if (s.tut < TUT.length) c.msg('👍 Gut gemacht!'); }
  return s.tut;
}

// ---------- Bauwarteschlange ----------
export const MAX_QUEUE = 3;
export function queueAdd(c, plot, type) {
  const s = c.s; s.bq = s.bq || [];
  if (s.bq.length >= MAX_QUEUE) return 'Warteschlange voll (max. 3)';
  if (s.bq.some((q) => q.plot === plot)) return 'Steht schon in der Warteschlange';
  s.bq.push({ plot, type });
  c.msg(`In Warteschlange: ${DEFS[type !== null && type !== undefined ? type : s.plots[plot].type].name}`);
  return null;
}
export function queueTick(c) {
  const s = c.s; if (!s.bq || !s.bq.length) return;
  const q = s.bq[0];
  const p = s.plots[q.plot];
  if (q.type !== null && q.type !== undefined && p.type < 0) {
    const blk = c.buildBlocker(q.plot, q.type);
    if (!blk) { c.startBuild(q.plot, q.type); s.bq.shift(); }
    else if (blk !== 'Alle Bautrupps beschäftigt' && blk !== 'Zu wenig Rohstoffe') { s.bq.shift(); c.msg(`Warteschlange: ${blk}`); }
  } else {
    const blk = c.upgradeBlocker(q.plot);
    if (!blk) { c.startUpgrade(q.plot); s.bq.shift(); }
    else if (blk !== 'Alle Bautrupps beschäftigt' && blk !== 'Zu wenig Rohstoffe' && blk !== 'Wird gerade gebaut') { s.bq.shift(); c.msg(`Warteschlange: ${blk}`); }
  }
}

// ---------- Händlerschiff ----------
export function traderTick(c, dt) {
  const s = c.s;
  if (!s.trader) s.trader = { next: 90, left: 0, offers: [] };
  const tr = s.trader;
  if (tr.left > 0) {
    tr.left -= dt;
    if (tr.left <= 0) { tr.left = 0; tr.next = 420 + Math.random() * 300; c.msg('⛵ Das Händlerschiff legt wieder ab.'); }
  } else {
    tr.next -= dt;
    if (tr.next <= 0) { tr.left = 150; tr.offers = makeOffers(c); c.msg('⛵ Ein Händlerschiff hat am Steg angelegt!'); }
  }
}
function makeOffers(c) {
  const f = 1 + 0.4 * (c.towerLevel - 1), out = [];
  for (let k = 0; k < 3; k++) {
    const give = Math.floor(Math.random() * 4); let get = Math.floor(Math.random() * 3); if (get >= give) get++;
    const g = Math.round((80 + Math.random() * 120) * f), r = Math.round(g * (0.9 + Math.random() * 0.5) * (get === 3 ? 0.35 : 1) * (give === 3 ? 2.5 : 1));
    out.push({ give, gn: g, get, rn: r, used: false });
  }
  const u = Math.floor(Math.random() * 5);
  out.push({ give: 3, gn: Math.round(60 * f), unit: u, rn: Math.max(1, Math.round(3 * f)), used: false });
  return out;
}
export function trade(c, k) {
  const tr = c.s.trader; if (!tr || tr.left <= 0) return 'Kein Händler da';
  const o = tr.offers[k]; if (!o || o.used) return 'Schon gehandelt';
  if (c.s.res[o.give] < o.gn) return 'Zu wenig ' + RES[o.give];
  c.s.res[o.give] -= o.gn;
  if (o.unit !== undefined) c.s.troops[o.unit] += o.rn; else c.addRes(o.get, o.rn);
  o.used = true;
  questEvent(c, 'trade', 1);
  return null;
}
export { UNITS, uSum, costFor };
