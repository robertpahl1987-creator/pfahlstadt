// Spiellogik: Gezeiten, Rohstoffe, Bauen, Bevölkerung, Speichern, Offline-Fortschritt.
export const RES = ['Holz', 'Muscheln', 'Wasser', 'Altmetall'];
export const RES_COL = ['#E2B477', '#F2A08C', '#7FD3F0', '#C7CCD6'];
export const HOLZ = 0, MUSCHELN = 1, WASSER = 2, METALL = 3;

export const T = { TURM: 0, TREIBHOLZ: 1, MUSCHEL: 2, REGEN: 3, TAUCHER: 4, HAUS: 5, HEILER: 6, RAUCH: 7 };

export const DEFS = [
  { name: 'Gezeitenturm', short: 'Herz der Stadt', desc: 'Leuchtturm und Pfahlwerk. Jede Stufe hebt alle Plattformen der Stadt höher über das Wasser.', cost: [220, 0, 0, 60], prod: -1, rate: 0, workers: 0, build: 15 },
  { name: 'Treibholzsammler', short: '+Holz', desc: 'Fischt angeschwemmtes Holz aus dem Wasser.', cost: [40, 0, 0, 0], prod: HOLZ, rate: 0.9, workers: 2, build: 6 },
  { name: 'Muschelzucht', short: '+Muscheln, stark bei Ebbe', desc: 'Muschelpfähle im Watt. Bei Ebbe wird viel geerntet, bei Flut wenig.', cost: [60, 0, 0, 0], prod: MUSCHELN, rate: 0.75, workers: 2, build: 6 },
  { name: 'Regenfänger', short: '+Wasser, stark bei Sturm', desc: 'Segeltrichter und Fässer sammeln Regen. Bei Sturmflut fällt besonders viel.', cost: [70, 0, 0, 5], prod: WASSER, rate: 0.6, workers: 1, build: 6 },
  { name: 'Wracktaucher', short: '+Altmetall, stark bei Flut', desc: 'Taucher bergen Metall aus alten Wracks. Bei hohem Wasser kommen sie besser heran.', cost: [120, 40, 0, 0], prod: METALL, rate: 0.25, workers: 3, build: 6 },
  { name: 'Pfahlhaus', short: '+6 Plätze', desc: 'Wohnraum für neue Siedler (6 pro Stufe).', cost: [70, 0, 0, 0], prod: -1, rate: 0, workers: 0, build: 6 },
  { name: 'Heilerhütte', short: 'heilt Kranke', desc: 'Kräuter und trockene Decken. Kranke werden deutlich schneller gesund.', cost: [140, 30, 0, 20], prod: -1, rate: 0, workers: 1, build: 6 },
  { name: 'Räucherei', short: '−Muschelverbrauch', desc: 'Räuchert Vorräte haltbar. Senkt den Muschelverbrauch um 8 % pro Stufe (max. 50 %).', cost: [100, 0, 0, 10], prod: -1, rate: 0, workers: 1, build: 6 },
];
export const MAX_LEVEL = 10;

export const costFor = (t, lvl) => DEFS[t].cost.map((c) => Math.round(c * Math.pow(1.65, lvl - 1)));
export const buildTime = (t, lvl) => DEFS[t].build * Math.pow(lvl, 1.5);
export const rateAt = (t, lvl) => (lvl <= 0 ? 0 : DEFS[t].rate * lvl * (1 + 0.1 * (lvl - 1)));
export const deckFor = (lvl) => 2.2 + 0.55 * Math.max(1, lvl);
export const beaconWood = (lvl) => 0.04 + 0.04 * lvl;

export const PLOTS = 13, MAX_BUILDS = 2, DAY = 240, STORM_LEN = 90, EXP_TIME = 40, EXP_FOOD = 30, EBB = 1.0;
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
  get deck() { return deckFor(this.towerLevel); }
  get freeboard() { return this.deck - this.water; }
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
    if (this.wasBurning && !this.beaconBurning && s.beaconOn) this.msg('Kein Holz mehr – das Leuchtfeuer erlischt!');
    this.wasBurning = this.beaconBurning;

    this.applyRates(this.computeRates(false), dt);
    this.advanceBuild(dt);
    this.population(dt);
    this.expedition(dt);
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
    this.efficiency = workers === 0 ? 1 : Math.min(1, this.healthy / workers);
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
    r[MUSCHELN] -= s.survivors * 0.035 * (1 - Math.min(0.5, 0.08 * smoke));
    r[WASSER] -= s.survivors * 0.03;
    if (s.beaconOn) r[HOLZ] -= beaconWood(this.towerLevel);
    for (let i = 0; i < 4; i++) this.rates[i] = r[i] * 60;
    return r;
  }

  applyRates(r, dt) { for (let i = 0; i < 4; i++) this.s.res[i] = Math.max(0, this.s.res[i] + r[i] * dt); }

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
    this.msg(this.s.beaconOn ? 'Leuchtfeuer entzündet.' : 'Leuchtfeuer gelöscht – Holz wird gespart, aber keine Boote finden her.');
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
    s.res[HOLZ] += holz; s.res[MUSCHELN] += mu; s.res[METALL] += me;
    this.msg(`Wattwanderung zurück: +${holz} Holz, +${mu} Muscheln, +${me} Altmetall`);
    if (!s.expSurprised && Math.random() < 0.3 && s.survivors < this.capacity) {
      s.survivors++;
      this.msg('Auf einer Sandbank wurde ein Gestrandeter gefunden!');
    }
  }

  // ---------- Speichern ----------
  load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    if (!s || !Array.isArray(s.plots) || s.plots.length !== PLOTS || !Array.isArray(s.res)) this.newGame();
    else { this.s = s; this.msg('Willkommen zurück in der Pfahlstadt!'); this.catchUp(); }
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
    this.log = [];
    this.msg('Willkommen in der Pfahlstadt! Bau den Gezeitenturm aus, bevor die große Flut kommt.');
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
    }
    const gains = s.res.map((v, i) => v - before[i]).map((g, i) => (Math.abs(g) >= 1 ? `${g > 0 ? '+' : ''}${Math.round(g)} ${RES[i]}` : '')).filter(Boolean).join('  ');
    this.msg(`Während du weg warst (${fmtTime(sec)}): ${gains}`);
  }
}
