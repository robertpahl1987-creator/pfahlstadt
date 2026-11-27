// Piratenschiffe (Bots) auf der Seekarte: Stufe für Stufe etwas stärker, Beute sind Beschleuniger, Rohstoffe und Krieger
import { UNITS, RES, armyStr, uSum, uScale, uSub, uAdd, zeroU, troopStr, speedFactor } from './game.js';
import { questEvent } from './features.js';
import { mods, capAtk, capLoot, capSpeed, capSend, fleetSpeed, fleetLoot, addVip } from './progress.js';

export const ITEMS = {
  sp1: { ic: '⚡', name: 'Beschleuniger 1 Min.', sec: 60 },
  sp5: { ic: '⚡', name: 'Beschleuniger 5 Min.', sec: 300 },
  sp15: { ic: '⚡', name: 'Beschleuniger 15 Min.', sec: 900 },
  sp60: { ic: '⚡', name: 'Beschleuniger 1 Std.', sec: 3600 },
  sp180: { ic: '⚡', name: 'Beschleuniger 3 Std.', sec: 10800 },
};
export const SPEED_KEYS = ['sp1', 'sp5', 'sp15', 'sp60', 'sp180'];
const SHIP_NAMES = ['Schwarze Möwe', 'Rostiger Anker', 'Seeteufel', 'Krakenfaust', 'Nebelhai', 'Sturmkrähe', 'Blutige Auster', 'Wattwolf', 'Grauer Hering', 'Knochenkiel'];

/// Mannschaft eines Piratenschiffs: wächst je Stufe um etwa 12 %, eine Kriegerart ist jeweils stärker vertreten
export function botArmy(L) {
  const n = Math.round(5 * Math.pow(1.14, L - 1) + L), fav = (L - 1) % 5;
  const w = [1, 1, 1, 1, 1]; w[fav] = 3; if (L >= 6) w[(fav + 2) % 5] = 2;
  const sw = w.reduce((a, b) => a + b, 0), u = w.map((x) => Math.floor((n * x) / sw));
  u[fav] += n - uSum(u);
  return u;
}
export function botReward(L) {
  const it = {};
  const add = (k, v) => (it[k] = (it[k] || 0) + v);
  if (L <= 4) add('sp1', 2);
  else if (L <= 9) { add('sp1', 1); add('sp5', 1); }
  else if (L <= 19) { add('sp5', 2); if (L % 2) add('sp15', 1); }
  else { add('sp15', 2); if (L % 3 === 0) add('sp60', 1); }
  const big = L % 5 === 0;
  if (big) { add(L >= 10 ? 'sp60' : 'sp15', 1); if (L >= 25) add('sp180', 1); }
  const res = [0, 0, 0, 0]; res[L % 4] = Math.round(150 * Math.pow(1.15, L - 1)); res[(L + 1) % 4] = Math.round(80 * Math.pow(1.15, L - 1));
  const u = zeroU(); if (big) u[(L - 1) % 5] = 3 + Math.floor(L / 2);
  return { items: it, res, u, big };
}
export const itemStr = (it) => Object.keys(it).filter((k) => it[k] > 0).map((k) => `⚡${fmtShort(ITEMS[k].sec)}×${it[k]}`).join(' ');
function fmtShort(sec) { return sec >= 3600 ? `${sec / 3600}h` : `${sec / 60}m`; }

export function ensureBots(c) {
  const s = c.s;
  if (!s.botLevel) s.botLevel = 1;
  if (!s.items) s.items = {};
  if (!s.botMarches) s.botMarches = [];
  if (!s.bots || s.bots.length !== 3) makeBots(c);
}
function makeBots(c) {
  const s = c.s, L = s.botLevel, out = [];
  // freie Stellen auf der Karte suchen (nicht auf Inseln oder Städten)
  const o = c.online, onl = o && o.active && o.world && o.me;
  const pts = onl ? o.world.territories.map((t) => [t.x - o.me.x, t.y - o.me.y]).concat(o.world.players.map((p) => [p.x - o.me.x, p.y - o.me.y])) : (s.terr || []).map((t) => [t.x, t.y]);
  pts.push([0, 0]);
  const rnd = () => (s.botSeed = ((s.botSeed || 7) * 1103515245 + 12345) >>> 0) / 4294967296;
  for (let k = 0; k < 3; k++) {
    const lv = L + k;
    let best = null, bd = -1;
    for (let tries = 0; tries < 40; tries++) {
      const a = rnd() * Math.PI * 2, d = 0.75 + k * 0.45 + rnd() * 0.3, x = Math.cos(a) * d, y = Math.sin(a) * d;
      const m = Math.min(...pts.map((p) => Math.hypot(p[0] - x, p[1] - y)));
      if (m > bd) { bd = m; best = [x, y]; }
      if (m > 0.6) break;
    }
    pts.push(best);
    out.push({ id: lv, level: lv, name: SHIP_NAMES[(lv * 7) % SHIP_NAMES.length], dx: best[0], dy: best[1], u: botArmy(lv) });
  }
  s.bots = out;
}
export const botTravel = (b, u, c, cap) => (18 + Math.hypot(b.dx, b.dy) * 22) * speedFactor(u) * (c ? mods(c).travel * fleetSpeed(c, u) * capSpeed(c, cap) : 1);

export const STAM_MAX = 10, STAM_SEC = 1200;
/// Ausdauer für Piratenschiff-Angriffe: 10 Punkte, alle 20 Minuten einer zurück
export function stamina(c) {
  const s = c.s, now = Date.now();
  if (!s.stam) s.stam = { n: STAM_MAX, t: now };
  if (s.stam.n >= STAM_MAX) s.stam.t = now;
  else { const k = Math.floor((now - s.stam.t) / (STAM_SEC * 1000)); if (k > 0) { s.stam.n = Math.min(STAM_MAX, s.stam.n + k); s.stam.t += k * STAM_SEC * 1000; } }
  return { n: s.stam.n, next: s.stam.n >= STAM_MAX ? 0 : (s.stam.t + STAM_SEC * 1000 - now) / 1000 };
}
export function botBlocker(c, id, u) {
  const b = c.s.bots.find((x) => x.id === id);
  if (stamina(c).n <= 0) return 'Keine Ausdauer – alle 20 Minuten kommt ein Punkt zurück';
  if (!b) return 'Schiff ist weg';
  if (uSum(u) <= 0) return 'Keine Truppen ausgewählt';
  if (u.some((v, i) => v > c.s.troops[i])) return 'So viele Truppen hast du nicht zu Hause';
  if (c.s.botMarches.some((m) => m.bot.id === id && m.phase === 'out')) return 'Dorthin ist schon ein Trupp unterwegs';
  return null;
}
export function sendToBot(c, id, u, cap) {
  if (botBlocker(c, id, u)) return false;
  const b = c.s.bots.find((x) => x.id === id), tt = botTravel(b, u, c, cap);
  if (cap) capSend(c, cap, tt);
  c.s.troops = uSub(c.s.troops, u);
  c.s.stam.n--;
  c.s.botMarches.push({ bot: { ...b }, u: u.slice(), left: tt, total: tt, phase: 'out', cap: cap || null, loot: capLoot(c, cap) * fleetLoot(c, u) });
  c.msg(`⚔️ Angriff auf das Piratenschiff „${b.name}“ (Stufe ${b.level})!`);
  return true;
}

export function botTick(c, dt) {
  ensureBots(c);
  const s = c.s;
  for (let i = s.botMarches.length - 1; i >= 0; i--) {
    const m = s.botMarches[i];
    m.left -= dt;
    if (m.left > 0) continue;
    if (m.phase === 'back') { s.troops = uAdd(s.troops, m.u); s.botMarches.splice(i, 1); c.msg(`${uSum(m.u)} Krieger sind vom Piratenschiff zurück.`); continue; }
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
    addVip(c, 2 * b.level);
    if (b.level >= s.botLevel) { s.botLevel = b.level + 1; }
    s.bots = s.bots.filter((x) => x.id !== b.id);
    if (s.bots.length < 3 || b.level >= s.botLevel - 1) makeBots(c);
    questEvent(c, 'bot', 1);
    questEvent(c, 'win', 1);
    c.report(`🏴‍☠️ „${b.name}“ (Stufe ${b.level}) versenkt! Beute: ${itemStr(r.items)} · 🎖️${r.big ? 3 : 1}${r.res.some((v) => v) ? ' · ' + r.res.map((v, i) => (v ? `${v} ${RES[i]}` : '')).filter(Boolean).join(', ') : ''}${uSum(r.u) ? ' · Überläufer: ' + troopStr(r.u) : ''}. Verluste: ${troopStr(lost)}.`, true);
  } else {
    lost = uScale(m.u, 0.55);
    c.report(`🏴‍☠️ Angriff auf „${b.name}“ (Stufe ${b.level}) gescheitert. Verluste: ${troopStr(lost)}. Tipp: Krieger wählen, die gegen die Mannschaft stark sind.`, false);
  }
  c.addWounded(lost);
  m.u = uSub(m.u, lost);
  m.phase = 'back'; m.left = m.total;
  if (!uSum(m.u)) c.s.botMarches.splice(c.s.botMarches.indexOf(m), 1);
}

// ---------- Beschleuniger einsetzen ----------
export function useSpeed(c, key, kind, target) {
  const s = c.s, it = ITEMS[key];
  if (!it || !(s.items[key] > 0)) return 'Keinen solchen Beschleuniger';
  let sec = it.sec;
  if (kind === 'plot') {
    const p = s.plots[target]; if (!p || p.buildLeft <= 0) return 'Hier wird nicht gebaut';
    p.buildLeft = Math.max(0.01, p.buildLeft - sec);
  } else if (kind === 'train') {
    if (!s.train.length) return 'Keine Ausbildung läuft';
    while (sec > 0 && s.train.length) {
      const q = s.train[0];
      if (q.left <= sec) { sec -= q.left; q.n--; s.troops[q.u]++; questEvent(c, 'train', 1); q.left = q.per; if (q.n <= 0) s.train.shift(); }
      else { q.left -= sec; sec = 0; }
    }
  } else if (kind === 'heal') {
    const L = c.levels(20); if (L <= 0 || !uSum(s.wounded)) return 'Niemand im Lazarett';
    s.healT = (s.healT || 0) + sec * L;
  } else if (kind === 'exp') {
    if (!(s.expLeft > 0)) return 'Keine Wattwanderung unterwegs';
    s.expLeft = Math.max(0.01, s.expLeft - sec);
  } else if (kind === 'research') {
    if (!s.research) return 'Keine Forschung läuft';
    s.research.left = Math.max(0.01, s.research.left - sec);
  } else if (kind === 'bot') {
    const m = s.botMarches[target]; if (!m) return 'Kein Trupp';
    m.left = Math.max(0.01, m.left - sec);
  } else return 'Geht hier nicht';
  s.items[key]--;
  c.msg(`⚡ ${it.name} eingesetzt.`);
  return null;
}
export const speedCount = (c) => SPEED_KEYS.reduce((a, k) => a + (c.s.items && c.s.items[k] || 0), 0);
export { UNITS };
