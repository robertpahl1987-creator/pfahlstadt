// Spiellogik: Gezeiten, Rohstoffe, Bauen, Bevölkerung, Speichern, Offline-Fortschritt.
export const RES = ['Holz', 'Muscheln', 'Wasser', 'Altmetall'];
export const RES_COL = ['#E2B477', '#F2A08C', '#7FD3F0', '#C7CCD6'];
export const HOLZ = 0, MUSCHELN = 1, WASSER = 2, METALL = 3;

export const T = { TURM: 0, TREIBHOLZ: 1, MUSCHEL: 2, REGEN: 3, TAUCHER: 4, HAUS: 5, HEILER: 6, RAUCH: 7, KUECHE: 8, KASERNE: 9, WACHTURM: 10, LAGER: 11, MAUER: 12, ABWEHR: 13, DAMM: 14 };

export const DEFS = [
  { name: 'Gezeitenturm', short: 'Herz der Stadt', desc: 'Leuchtturm und Pfahlwerk. Jede Stufe hebt alle Plattformen der Stadt höher über das Wasser.', cost: [220, 0, 0, 60], prod: -1, rate: 0, workers: 0, build: 15 },
  { name: 'Treibholzsammler', short: '+Holz', desc: 'Fischt angeschwemmtes Holz aus dem Wasser.', cost: [40, 0, 0, 0], prod: HOLZ, rate: 0.9, workers: 2, build: 6 },
  { name: 'Muschelzucht', short: '+Muscheln, stark bei Ebbe', desc: 'Muschelpfähle im Watt. Bei Ebbe wird viel geerntet, bei Flut wenig.', cost: [60, 0, 0, 0], prod: MUSCHELN, rate: 0.75, workers: 2, build: 6 },
  { name: 'Regenfänger', short: '+Wasser, stark bei Sturm', desc: 'Segeltrichter und Fässer sammeln Regen. Bei Sturmflut fällt besonders viel.', cost: [70, 0, 0, 5], prod: WASSER, rate: 0.6, workers: 1, build: 6 },
  { name: 'Wracktaucher', short: '+Altmetall, stark bei Flut', desc: 'Taucher bergen Metall aus alten Wracks. Bei hohem Wasser kommen sie besser heran.', cost: [120, 40, 0, 0], prod: METALL, rate: 0.25, workers: 3, build: 6 },
  { name: 'Unterkunft', short: '+6 Plätze', desc: 'Pfahlhaus mit Kojen: Wohnraum für neue Siedler (6 pro Stufe).', cost: [70, 0, 0, 0], prod: -1, rate: 0, workers: 0, build: 6 },
  { name: 'Heilerhütte', short: 'heilt Kranke', desc: 'Kräuter und trockene Decken. Kranke werden deutlich schneller gesund.', cost: [140, 30, 0, 20], prod: -1, rate: 0, workers: 1, build: 6 },
  { name: 'Räucherei', short: '−Muschelverbrauch', desc: 'Räuchert Vorräte haltbar. Senkt den Muschelverbrauch um 8 % pro Stufe (max. 50 %).', cost: [100, 0, 0, 10], prod: -1, rate: 0, workers: 1, build: 6 },
  { name: 'Küche', short: '+6 % Produktion je Stufe', desc: 'Warme Mahlzeiten aus dem großen Kessel: Alle Siedler arbeiten besser (+6 % Produktion pro Stufe, max. 60 %).', cost: [120, 40, 0, 10], prod: -1, rate: 0, workers: 1, build: 7 },
  { name: 'Kaserne', short: 'bildet Truppen aus', desc: 'Bildet Harpuniere (Angriff) und Wachen (Verteidigung) aus. Höhere Stufe: schneller und größere Ausbildungsschlange.', cost: [150, 60, 0, 30], prod: -1, rate: 0, workers: 2, build: 8 },
  { name: 'Wachturm', short: '+12 % Verteidigung je Stufe', desc: 'Späher und Signalhörner: Deine Stadt verteidigt sich besser gegen Überfälle (+12 % pro Stufe).', cost: [130, 0, 0, 40], prod: -1, rate: 0, workers: 1, build: 8 },
  { name: 'Lager', short: '+1500 Lagerplatz je Stufe', desc: 'Schuppen, Kisten und Fässer: mehr Platz für jeden Rohstoff (+1500 pro Stufe).', cost: [100, 0, 0, 10], prod: -1, rate: 0, workers: 0, build: 6 },
  { name: 'Festungsmauer', short: 'Mauer mit Tor', desc: 'Umschließt dein ganzes Gelände. Stufe 1–3 Holzpalisade, 4–7 Steinwall, 8–10 Festungswall. +15 % Verteidigung pro Stufe.', cost: [200, 0, 0, 40], prod: -1, rate: 0, workers: 0, build: 12 },
  { name: 'Abwehrturm', short: 'Turm auf der Mauer', desc: 'Steinturm mit Harpunen-Schleuder auf der Festungsmauer. +40 Verteidigung pro Stufe.', cost: [160, 0, 0, 50], prod: -1, rate: 0, workers: 1, build: 10 },
  { name: 'Damm', short: 'hält Flut & Sturmflut ab', desc: 'Erddamm ganz außen um die Warft, mit Sieltor. Solange das Wasser nicht über den Damm steigt, bleibt deine Stadt trocken. Jede Stufe macht ihn 40 cm höher.', cost: [240, 0, 0, 30], prod: -1, rate: 0, workers: 0, build: 12 },
];
export const damTopFor = (lvl) => (lvl > 0 ? 3.0 + 0.4 * lvl : -99);
export const CITY_TYPES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// ---------- Militär ----------
export const UNITS = [
  { name: 'Harpunier', att: 10, def: 5, cost: [25, 15, 0, 4], time: 6 },
  { name: 'Wache', att: 3, def: 12, cost: [20, 10, 0, 6], time: 5 },
];
export const unitCost = (u, n) => UNITS[u].cost.map((c) => c * n);
const UPKEEP = 0.004; // Muscheln pro Sekunde und Soldat

const TERR_NAMES = ['Möwenbank', 'Krabbensand', 'Seehundsplate', 'Bernsteinriff', 'Nebelhallig', 'Priel-Insel', 'Austernbank', 'Sturmwarft',
  'Robbeneck', 'Muschelplate', 'Tangfeld', 'Dünenhallig', 'Schlickwall', 'Wrackbucht', 'Leuchtsand', 'Graue Plate', 'Salzwiese', 'Kormoranriff'];
const TERR_KIND = ['Sandbank', 'Hallig', 'Riff'];
export function makeTerritories() {
  let seed = 1234567;
  const R = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const list = [];
  for (let ring = 1; ring <= 3; ring++)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + ring * 0.5 + (R() - 0.5) * 0.4;
      const d = ring * 1.15 + (R() - 0.5) * 0.35;
      const base = [0, 60, 220, 700][ring] * (0.8 + R() * 0.5);
      list.push({
        id: list.length, name: TERR_NAMES[list.length], ring, kind: TERR_KIND[Math.floor(R() * 3)],
        x: Math.cos(a) * d, y: Math.sin(a) * d, res: Math.floor(R() * 4), pct: [0, 10, 18, 30][ring],
        base: Math.round(base), pirates: Math.round(base), owner: 0, gh: 0, gw: 0, seed: Math.floor(R() * 1e6),
      });
    }
  return list;
}
export const travelTime = (t) => 20 + Math.hypot(t.x, t.y) * 22;
export const MAX_LEVEL = 10;

export const costFor = (t, lvl) => DEFS[t].cost.map((c) => Math.round(c * Math.pow(1.65, lvl - 1)));
export const buildTime = (t, lvl) => DEFS[t].build * Math.pow(lvl, 1.5);
export const rateAt = (t, lvl) => (lvl <= 0 ? 0 : DEFS[t].rate * lvl * (1 + 0.1 * (lvl - 1)));
export const deckFor = (lvl) => 2.2 + 0.55 * Math.max(1, lvl);
export const beaconWood = (lvl) => 0.04 + 0.04 * lvl;

export const DAMM = 52;
export const PLOTS = 53, INNER = 13, RING3 = 25, WALL = 43, TOWERS = 44, OUTER_LEVEL = 3, MAX_BUILDS = 2, DAY = 240, STORM_LEN = 90, EXP_TIME = 40, EXP_FOOD = 30, EBB = 1.0;
const KEY = 'pfahlstadt_save_v1';

export function fmtTime(s) {
  const t = Math.ceil(s);
  if (t >= 3600) return `${Math.floor(t / 3600)}h ${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}m`;
  if (t >= 60) return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  return t + 's';
}

export class Colony {
  constructor() {
    this.log = [];
    this.rates = [0, 0, 0, 0];
    this.efficiency = 1; this.capacity = 4; this.workers = 0;
    this.water = 1.4; this.tideSin = 0; this.rising = true;
    this.wasBurning = true;
    this.time = 0;
    this.load();
  }

  msg(text) { this.log.push({ text, t: this.time }); if (this.log.length > 30) this.log.shift(); }

  get towerLevel() { return this.s.plots[0].level; }
  levels(t) { let n = 0; for (const p of this.s.plots) if (p.type === t) n += p.level; return n; }
  /// Gebäude auf dem Gelände (ohne Turm, Mauer, Abwehrtürme)
  get builtCount() { let n = 0; this.s.plots.forEach((p, i) => { if (i > 0 && i < WALL && p.type >= 0 && p.level > 0) n++; }); return n; }
  get areaRadius() { return Math.min(66, 40 + 1.4 * this.builtCount); }
  ring3Needed(i) { return 8 + (i - RING3); }
  get storage() { return 1500 + 1500 * this.levels(T.LAGER); }
  get troopsAway() {
    if (this.online && this.online.active) return this.online.troopsAway();
    let h = 0, w = 0; for (const m of this.s.marches) { h += m.h; w += m.w; } for (const t of this.s.terr) { h += t.gh; w += t.gw; } return { h, w };
  }
  get troopTotal() { const a = this.troopsAway; return this.s.troops[0] + this.s.troops[1] + a.h + a.w; }
  get defense() {
    const base = this.s.troops[0] * UNITS[0].def + this.s.troops[1] * UNITS[1].def + this.healthy * 2 + 40 * this.levels(T.ABWEHR);
    return Math.round(base * (1 + 0.12 * this.levels(T.WACHTURM) + 0.15 * this.levels(T.MAUER)));
  }
  get power() {
    let b = 0; for (const p of this.s.plots) if (p.type >= 0) b += p.level * 10;
    return b + this.troopTotal * 2 + this.defense;
  }
  get deck() { return deckFor(this.towerLevel); }
  get damTop() { return damTopFor(this.levels(T.DAMM)); }
  /// Wasser innerhalb des Damms: hält der Damm, bleibt die Stadt trocken
  get damHolds() { return this.water > this.deck && this.water <= this.damTop; }
  get inWater() { return this.damHolds ? this.deck - 0.35 : this.water; }
  get freeboard() { return this.deck - this.inWater; }
  get storm() { return this.s.stormLeft > 0; }
  get stormWarning() { return !this.storm && this.s.stormTimer < 30; }
  get healthy() { return Math.max(0, this.s.survivors - this.s.sick); }
  get beaconBurning() { return this.s.beaconOn && this.s.res[HOLZ] > 0.01; }
  get starving() { return this.s.survivors > 0 && (this.s.res[MUSCHELN] <= 0.01 || this.s.res[WASSER] <= 0.01); }

  // ---------- Simulation ----------
  tick(dt) {
    const s = this.s;
    this.time += dt;
    s.dayTime += dt / DAY;
    if (s.dayTime >= 1) { s.dayTime -= 1; s.days++; this.msg(`Tag ${s.days} beginnt.`); }

    if (s.stormLeft > 0) {
      s.stormLeft -= dt;
      if (s.stormLeft <= 0) { s.stormLeft = 0; s.stormTimer = 300 + Math.random() * 180; this.msg('Die Sturmflut zieht ab.'); }
    } else {
      const before = s.stormTimer;
      s.stormTimer -= dt;
      if (before >= 30 && s.stormTimer < 30) this.msg('Warnung: Eine Sturmflut zieht auf!');
      if (s.stormTimer <= 0) { s.stormLeft = STORM_LEN; this.msg('STURMFLUT! Das Wasser steigt!'); }
    }

    this.updateWater();
    if (this.wasBurning && !this.beaconBurning && s.beaconOn) this.msg('Kein Holz mehr – das Licht im Leuchtturm geht aus!');
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
    this.workers = workers; this.capacity = cap;
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
  addRes(i, v) { this.s.res[i] = Math.max(0, Math.min(this.storage, this.s.res[i] + v)); }

  advanceBuild(dt) {
    this.s.plots.forEach((p, i) => {
      if (p.buildLeft <= 0) return;
      p.buildLeft -= dt;
      if (p.buildLeft <= 0) {
        p.buildLeft = 0; p.level++;
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
        s.sickProg -= 1; s.sick++;
        this.msg(starving ? 'Hunger und Durst: Jemand ist erkrankt!' : 'Nasse Füße, kalter Wind: Jemand ist erkrankt!');
      }
    } else s.sickProg = Math.max(0, s.sickProg - dt * 0.01);

    if (s.sick > 0 && s.survivors > 1 && (this.freeboard < -1.2 || starving)) {
      s.deathProg += dt * s.sick / 240;
      if (s.deathProg >= 1) { s.deathProg = 0; s.sick--; s.survivors--; this.msg('Ein Siedler hat es nicht geschafft …'); }
    }

    if (s.sick > 0 && !wet) {
      let healers = 0;
      for (const p of s.plots) if (p.type === T.HEILER) healers += p.level;
      s.healProg += dt * (0.004 + 0.02 * healers) * (this.beaconBurning ? 1.5 : 1);
      if (s.healProg >= 1) { s.healProg = 0; s.sick--; this.msg('Ein Kranker ist wieder gesund.'); }
    }

    if (s.survivors < this.capacity && !wet && !starving && this.beaconBurning) {
      s.arriveProg += dt / 25;
      if (s.arriveProg >= 1) { s.arriveProg = 0; s.survivors++; this.msg('Ein Boot legt an: Ein neuer Siedler!'); }
    }
  }

  expedition(dt) {
    const s = this.s;
    if (s.expLeft <= 0) return;
    s.expLeft -= dt;
    if (!s.expSurprised && this.water > 2.0) { s.expSurprised = true; this.msg('Die Flut kommt! Die Wattwanderer müssen umkehren …'); }
    if (s.expLeft <= 0) { s.expLeft = 0; this.finishExpedition(); }
  }

  // ---------- Aktionen ----------
  get activeBuilds() { return this.s.plots.filter((p) => p.buildLeft > 0).length; }
  canAfford(c) { return c.every((v, i) => this.s.res[i] >= v); }
  pay(c) { c.forEach((v, i) => (this.s.res[i] -= v)); }

  buildBlocker(plot, t) {
    if (plot === 0 || t === T.TURM) return 'Nicht möglich';
    if (this.s.plots[plot].type >= 0) return 'Platz belegt';
    if (plot === DAMM && t !== T.DAMM) return 'Hier entsteht der Damm';
    if (plot !== DAMM && t === T.DAMM) return 'Nur am Dammplatz';
    if (plot === WALL && t !== T.MAUER) return 'Hier steht die Festungsmauer';
    if (plot !== WALL && t === T.MAUER) return 'Nur am Mauerplatz';
    if (plot >= TOWERS && plot < DAMM && t !== T.ABWEHR) return 'Hier passen nur Abwehrtürme';
    if (plot < TOWERS && t === T.ABWEHR) return 'Nur auf der Mauer';
    if (plot >= TOWERS && plot < DAMM && this.levels(T.MAUER) <= 0) return 'Erst die Festungsmauer bauen';
    if (plot >= INNER && plot < RING3 && this.towerLevel < OUTER_LEVEL) return `Äußerer Ring ab Gezeitenturm Stufe ${OUTER_LEVEL}`;
    if (plot >= RING3 && plot < WALL && this.builtCount < this.ring3Needed(plot)) return `Gelände zu klein: noch ${this.ring3Needed(plot) - this.builtCount} Gebäude bauen`;
    if (this.activeBuilds >= MAX_BUILDS) return 'Alle Bautrupps beschäftigt';
    if (!this.canAfford(costFor(t, 1))) return 'Zu wenig Rohstoffe';
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
    if (p.type < 0) return 'Kein Gebäude';
    if (p.buildLeft > 0) return 'Wird gerade gebaut';
    if (p.level >= MAX_LEVEL) return 'Maximale Stufe';
    if (plot !== 0 && p.level + 1 > this.towerLevel) return `Erst Gezeitenturm auf Stufe ${p.level + 1}`;
    if (this.activeBuilds >= MAX_BUILDS) return 'Alle Bautrupps beschäftigt';
    if (!this.canAfford(costFor(p.type, p.level + 1))) return 'Zu wenig Rohstoffe';
    return null;
  }

  startUpgrade(plot) {
    if (this.upgradeBlocker(plot)) return false;
    const p = this.s.plots[plot];
    this.pay(costFor(p.type, p.level + 1));
    p.buildTotal = p.buildLeft = buildTime(p.type, p.level + 1);
    this.msg(`Ausbau: ${DEFS[p.type].name} → Stufe ${p.level + 1}`);
    return true;
  }

  demolish(plot) {
    if (plot === 0) return;
    const p = this.s.plots[plot];
    const n = p.type >= 0 ? DEFS[p.type].name : 'Gebäude';
    this.s.plots[plot] = { type: -1, level: 0, buildLeft: 0, buildTotal: 0 };
    this.msg(`${n} abgerissen.`);
  }

  toggleBeacon() {
    this.s.beaconOn = !this.s.beaconOn;
    this.msg(this.s.beaconOn ? 'Leuchtturm-Licht eingeschaltet.' : 'Leuchtturm-Licht aus – Holz wird gespart, aber keine Boote finden her.');
    this.wasBurning = this.beaconBurning;
  }

  expeditionBlocker() {
    if (this.s.expLeft > 0) return 'Unterwegs';
    if (this.water > EBB) return 'Wartet auf Ebbe';
    if (this.healthy < 2) return 'Zu wenig Gesunde';
    if (this.s.res[MUSCHELN] < EXP_FOOD) return 'Zu wenig Muscheln';
    return null;
  }

  startExpedition() {
    if (this.expeditionBlocker()) return false;
    this.s.res[MUSCHELN] -= EXP_FOOD;
    this.s.expLeft = EXP_TIME;
    this.s.expSurprised = false;
    this.msg('Eine Gruppe wandert ins Watt hinaus.');
    return true;
  }

  finishExpedition() {
    const s = this.s;
    const m = (0.8 + 0.4 * this.towerLevel) * (s.expSurprised ? 0.4 : 1);
    const r = (a, b) => Math.round((a + Math.random() * (b - a)) * m);
    const holz = r(40, 90), mu = r(30, 70), me = r(6, 22);
    this.addRes(HOLZ, holz); this.addRes(MUSCHELN, mu); this.addRes(METALL, me);
    this.msg(`Wattwanderung zurück: +${holz} Holz, +${mu} Muscheln, +${me} Altmetall`);
    if (!s.expSurprised && Math.random() < 0.3 && s.survivors < this.capacity) {
      s.survivors++;
      this.msg('Auf einer Sandbank wurde ein Gestrandeter gefunden!');
    }
  }


  // ---------- Militär: Ausbildung, Märsche, Kämpfe, Überfälle ----------
  report(text, win) {
    const s = this.s;
    s.reports.unshift({ text, win, day: s.days, time: s.dayTime });
    if (s.reports.length > 25) s.reports.length = 25;
    this.msg(text);
  }

  trainSlots() { return 10 * this.levels(T.KASERNE); }
  queued() { return this.s.train.reduce((a, q) => a + q.n, 0); }
  trainBlocker(u, n) {
    if (this.levels(T.KASERNE) <= 0) return 'Erst eine Kaserne bauen';
    if (this.queued() + n > this.trainSlots()) return `Schlange voll (max. ${this.trainSlots()})`;
    if (!this.canAfford(unitCost(u, n))) return 'Zu wenig Rohstoffe';
    return null;
  }
  startTrain(u, n) {
    if (this.trainBlocker(u, n)) return false;
    this.pay(unitCost(u, n));
    const per = UNITS[u].time / (1 + 0.25 * (this.levels(T.KASERNE) - 1));
    this.s.train.push({ u, n, per, left: per });
    this.msg(`${n}× ${UNITS[u].name} in Ausbildung.`);
    return true;
  }

  attackBlocker(id, h, w) {
    const t = this.s.terr[id];
    if (!t) return 'Unbekanntes Ziel';
    if (h + w <= 0) return 'Keine Truppen ausgewählt';
    if (h > this.s.troops[0] || w > this.s.troops[1]) return 'So viele Truppen hast du nicht zu Hause';
    if (this.s.marches.some((m) => m.target === id && m.phase === 'out')) return 'Dorthin ist schon ein Trupp unterwegs';
    return null;
  }
  sendTroops(id, h, w) {
    if (this.attackBlocker(id, h, w)) return false;
    const t = this.s.terr[id], tt = travelTime(t);
    this.s.troops[0] -= h; this.s.troops[1] -= w;
    this.s.marches.push({ target: id, h, w, left: tt, total: tt, phase: 'out', kind: t.owner === 1 ? 'reinforce' : 'attack' });
    this.msg(t.owner === 1 ? `Verstärkung nach ${t.name} unterwegs.` : `Angriff auf ${t.name} gestartet!`);
    return true;
  }
  withdraw(id) {
    const t = this.s.terr[id];
    if (!t || t.owner !== 1 || t.gh + t.gw === 0) return false;
    const tt = travelTime(t);
    this.s.marches.push({ target: id, h: t.gh, w: t.gw, left: tt, total: tt, phase: 'back', kind: 'return' });
    t.gh = 0; t.gw = 0;
    this.msg(`Besatzung von ${t.name} kehrt heim.`);
    return true;
  }
  winChance(id, h, w) {
    const t = this.s.terr[id];
    const att = h * UNITS[0].att + w * UNITS[1].att;
    if (att <= 0) return 0;
    const r = att / Math.max(1, t.pirates); // Zufall ±15 %
    return Math.max(0, Math.min(1, (r - 0.85) / 0.3));
  }

  battle(m, t) {
    const att = (m.h * UNITS[0].att + m.w * UNITS[1].att) * (0.85 + Math.random() * 0.3);
    if (att > t.pirates) {
      const loss = Math.min(0.9, Math.pow(t.pirates / att, 1.3) * 0.6);
      const lh = Math.round(m.h * loss), lw = Math.round(m.w * loss);
      t.owner = 1; t.pirates = 0;
      t.gh += m.h - lh; t.gw += m.w - lw;
      this.report(`Sieg! ${t.name} erobert. Verluste: ${lh} Harpuniere, ${lw} Wachen. Bonus: +${t.pct} % ${RES[t.res]}.`, true);
    } else {
      const lh = Math.round(m.h * 0.8), lw = Math.round(m.w * 0.8);
      t.pirates = Math.max(Math.round(t.base * 0.3), Math.round(t.pirates - att * 0.5));
      const rh = m.h - lh, rw = m.w - lw;
      if (rh + rw > 0) { const tt = travelTime(t); this.s.marches.push({ target: t.id, h: rh, w: rw, left: tt, total: tt, phase: 'back', kind: 'return' }); }
      this.report(`Niederlage bei ${t.name}. Verluste: ${lh} Harpuniere, ${lw} Wachen. Die Piraten sind geschwächt.`, false);
    }
  }

  military(dt, offline) {
    const s = this.s;
    // Ausbildung
    if (s.train.length) {
      const q = s.train[0];
      q.left -= dt;
      while (q.left <= 0 && q.n > 0) {
        q.n--; s.troops[q.u]++;
        q.left += q.per;
      }
      if (q.n <= 0) { s.train.shift(); this.msg(`Ausbildung fertig: ${UNITS[q.u].name}.`); }
    }
    // Märsche
    for (let i = s.marches.length - 1; i >= 0; i--) {
      const m = s.marches[i];
      m.left -= dt;
      if (m.left > 0) continue;
      s.marches.splice(i, 1);
      const t = s.terr[m.target];
      if (m.phase === 'back') { s.troops[0] += m.h; s.troops[1] += m.w; this.msg(`${m.h + m.w} Soldaten sind heimgekehrt.`); }
      else if (t.owner === 1) { t.gh += m.h; t.gw += m.w; this.msg(`Verstärkung in ${t.name} angekommen.`); }
      else this.battle(m, t);
    }
    // Piraten erholen sich langsam
    for (const t of s.terr) if (t.owner === 0 && t.pirates < t.base) t.pirates = Math.min(t.base, t.pirates + t.base * dt / 600);
    if (offline) return;

    // Piraten-Gegenangriffe auf eroberte Gebiete
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
          t.gh -= lh; t.gw -= lw;
          this.report(`Piraten griffen ${t.name} an und wurden zurückgeschlagen! Verluste: ${lh + lw}.`, true);
        } else {
          t.owner = 0; t.gh = 0; t.gw = 0; t.pirates = t.base;
          this.report(`${t.name} ist an die Piraten gefallen! Die Besatzung ist verloren.`, false);
        }
      }
    }

    // Überfälle auf die Stadt (ab Tag 2)
    if (s.days >= 2) {
      const before = s.raidTimer;
      s.raidTimer -= dt;
      if (before >= 30 && s.raidTimer < 30) this.msg('Späher melden: Piratenboote nähern sich der Stadt!');
      if (s.raidTimer <= 0) {
        s.raidTimer = 420 + Math.random() * 300;
        const str = (25 + 18 * (s.days - 1) + 10 * this.towerLevel) * (0.8 + Math.random() * 0.4);
        const def = this.defense * (0.85 + Math.random() * 0.3);
        if (def > str) {
          const loss = Math.min(0.8, Math.pow(str / def, 1.3) * 0.5);
          const lh = Math.round(s.troops[0] * loss), lw = Math.round(s.troops[1] * loss);
          s.troops[0] -= lh; s.troops[1] -= lw;
          this.report(`Piratenüberfall abgewehrt! (Stärke ${Math.round(str)} gegen ${Math.round(def)}) Verluste: ${lh + lw}.`, true);
        } else {
          const lost = s.res.map((v) => Math.round(v * 0.2));
          lost.forEach((v, i) => (s.res[i] -= v));
          s.troops[0] = Math.round(s.troops[0] * 0.4); s.troops[1] = Math.round(s.troops[1] * 0.4);
          this.report(`Piraten haben die Stadt geplündert! (Stärke ${Math.round(str)} gegen ${Math.round(def)}) Verloren: ${lost.map((v, i) => v + ' ' + RES[i]).join(', ')}.`, false);
        }
      }
    }
  }

  get raidIn() { return this.s.days >= 2 ? this.s.raidTimer : null; }

  ensureMilitary() {
    const s = this.s;
    if (!s.nodes) s.nodes = [];
    if (!s.gath) s.gath = [];
    if (s.nodeTimer === undefined) s.nodeTimer = 2;
    if (s.nodeSeq === undefined) s.nodeSeq = 1;
    if (!s.troops) s.troops = [0, 0];
    if (!s.train) s.train = [];
    if (!s.marches) s.marches = [];
    if (!s.reports) s.reports = [];
    if (!s.terr || s.terr.length !== 18) s.terr = makeTerritories();
    if (s.raidTimer === undefined) s.raidTimer = 480;
    if (s.counterTimer === undefined) s.counterTimer = 420;
    while (s.plots.length < PLOTS) s.plots.push({ type: -1, level: 0, buildLeft: 0, buildTotal: 0 });
    if (!s.nodes.length && !s.gath.length) { for (let k = 0; k < 4; k++) { this.spawnNodeAt(k); } }
  }


  // ---------- Sammeln mit Bewohnern ----------
  get gatherers() { return this.s.gath ? this.s.gath.length : 0; }
  get freeVillagers() { return Math.max(0, this.healthy - this.gatherers); }
  get carry() { return 18 + 3 * this.towerLevel; }
  nodeById(id) { return this.s.nodes.find((n) => n.id === id); }
  nodeFlooded(n) { return this.water > n.h + 0.25; }
  assigned(id) { return this.s.gath.filter((g) => g.node === id).length; }

  /// Weg von der Stadtmitte durchs Tor hinaus zur Sammelstelle (Punkte in x/z)
  gatherPath(n) {
    const R = this.areaRadius + 3;
    const pts = [[0, -4], [0, -(R - 3)], [0, -(R + 5)]];
    const a = Math.atan2(n.x, n.z); // Winkel wie plotPos (sin, cos)
    let from = Math.PI, to = a < 0 ? a + Math.PI * 2 : a;
    const steps = Math.ceil(Math.abs(to - from) / 0.2);
    for (let k = 1; k <= steps; k++) {
      const t = from + (to - from) * (k / steps);
      pts.push([Math.sin(t) * (R + 5), Math.cos(t) * (R + 5)]);
    }
    pts.push([n.x, n.z]);
    let L = 0; const seg = [0];
    for (let k = 1; k < pts.length; k++) { L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); seg.push(L); }
    return { pts, seg, L };
  }
  pathPoint(path, d) {
    const { pts, seg } = path;
    d = Math.max(0, Math.min(path.L, d));
    for (let k = 1; k < pts.length; k++) if (d <= seg[k]) {
      const t = (d - seg[k - 1]) / Math.max(0.001, seg[k] - seg[k - 1]);
      return [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * t, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * t, Math.atan2(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])];
    }
    const e = pts[pts.length - 1]; return [e[0], e[1], 0];
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
      const add = Math.min(n - cur, this.freeVillagers);
      for (let k = 0; k < add; k++) s.gath.push({ node: id, phase: 'out', d: -k * 2.5, t: 0, load: 0 });
    } else if (n < cur) {
      let rm = cur - n;
      for (const g of s.gath) if (rm > 0 && g.node === id && g.phase !== 'back') { g.phase = 'back'; g.stop = true; rm--; }
      for (const g of s.gath) if (rm > 0 && g.node === id && !g.stop) { g.stop = true; rm--; }
    }
  }

  gathering(dt, offline) {
    const s = this.s;
    s.nodeTimer -= dt;
    if (s.nodeTimer <= 0) { s.nodeTimer = 35 + Math.random() * 30; if (s.nodes.length < 7) this.spawnNode(); }
    const speed = 2.3 * (this.storm && !offline ? 0.7 : 1);
    const paths = {};
    for (let i = s.gath.length - 1; i >= 0; i--) {
      const g = s.gath[i], n = this.nodeById(g.node);
      if (!n && g.phase !== 'back') { g.phase = 'back'; g.stop = true; }
      const path = n ? (paths[n.id] || (paths[n.id] = this.gatherPath(n))) : null;
      if (path && g.d > path.L) g.d = path.L;
      if (g.phase === 'out') {
        if (n && this.nodeFlooded(n) && !offline) { if (g.d <= 0.1) { g.d = Math.min(g.d, 0); continue; } g.phase = 'back'; continue; }
        g.d += speed * dt;
        if (g.d >= path.L) { g.d = path.L; g.phase = 'work'; g.t = 5; }
      } else if (g.phase === 'work') {
        if (n && this.nodeFlooded(n) && !offline) { g.phase = 'back'; continue; }
        g.t -= dt;
        if (g.t <= 0) {
          const take = Math.min(this.carry, n ? n.amount : 0);
          g.load = take; if (n) n.amount -= take;
          g.phase = 'back';
          if (n && n.amount <= 0) { s.nodes = s.nodes.filter((x) => x.id !== n.id); this.msg(`${['Treibholz', 'Muschelbank', 'Tümpel', 'Wrackteile'][n.type]} ist leer gesammelt.`); }
        }
      } else {
        g.d -= speed * dt;
        if (g.d <= 0) {
          if (g.load > 0) { this.addRes(g.res !== undefined ? g.res : (n ? n.type : 0), g.load); }
          g.load = 0; g.d = 0;
          if (g.stop || !this.nodeById(g.node)) { s.gath.splice(i, 1); continue; }
          g.phase = 'out';
        }
      }
      if (n && g.phase === 'back' && g.res === undefined) g.res = n.type;
      if (g.phase === 'out') g.res = undefined;
    }
  }

  // ---------- Speichern ----------
  load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    if (!s || !Array.isArray(s.plots) || s.plots.length < 13 || !Array.isArray(s.res)) this.newGame();
    else { this.s = s; this.ensureMilitary(); this.msg('Willkommen zurück in der Pfahlstadt!'); this.catchUp(); }
    this.updateWater();
    this.computeRates(false);
  }

  save() {
    if (!this.s) return;
    this.s.lastSave = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch (e) { /* voll */ }
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
      res: [250, 160, 120, 30], survivors: 6, sick: 0, beaconOn: true, plots,
      lastSave: Date.now(), dayTime: 0.3, days: 1, stormTimer: 360, stormLeft: 0,
      expLeft: 0, expSurprised: false, sickProg: 0, deathProg: 0, healProg: 0, arriveProg: 0,
    };
    this.ensureMilitary();
    this.log = [];
    this.msg('Willkommen in der Pfahlstadt! Tipp: Vor dem Tor liegen Sammelstellen – tippe sie an und schicke Bewohner los.');
    this.save();
  }

  catchUp() {
    const s = this.s;
    const now = Date.now();
    let sec = s.lastSave ? (now - s.lastSave) / 1000 : 0;
    s.lastSave = now;
    if (sec < 10) return;
    sec = Math.min(sec, 8 * 3600);
    const before = s.res.slice();
    const steps = Math.max(1, Math.min(3000, Math.floor(sec / 10)));
    const dt = sec / steps;
    for (let i = 0; i < steps; i++) {
      this.applyRates(this.computeRates(true), dt);
      this.advanceBuild(dt);
      if (s.expLeft > 0) { s.expLeft -= dt; if (s.expLeft <= 0) { s.expLeft = 0; this.finishExpedition(); } }
      this.military(dt, true);
      this.gathering(dt, true);
    }
    const gains = s.res.map((v, i) => v - before[i]).map((g, i) => (Math.abs(g) >= 1 ? `${g > 0 ? '+' : ''}${Math.round(g)} ${RES[i]}` : '')).filter(Boolean).join('  ');
    this.msg(`Während du weg warst (${fmtTime(sec)}): ${gains}`);
  }
}
