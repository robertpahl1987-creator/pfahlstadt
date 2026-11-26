// Oberfläche (HTML über der 3D-Ansicht) inkl. Seekarte, Kaserne und Berichten
import { RES, RES_COL, DEFS, T, MAX_LEVEL, costFor, buildTime, rateAt, deckFor, beaconWood, fmtTime, EXP_FOOD, EBB, PLOTS, INNER, OUTER_LEVEL, UNITS, unitCost, travelTime } from './game.js';
import { plotPos } from './world.js';
import { TIERS } from './gfx.js';
import { SeaMap } from './map.js';

const $ = (sel) => document.querySelector(sel);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const amount = (v) => (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e4 ? (v / 1e3).toFixed(1) + 'k' : String(Math.floor(v)));
const rate = (v) => { const a = Math.abs(v); const s = a >= 100 ? String(Math.round(a)) : a.toFixed(1).replace(/\.0$/, ''); return (v < 0 ? '−' : '+') + s; };
const setHTML = (el, html) => { if (el._h !== html) { el._h = html; el.innerHTML = html; } };
const clock = (d) => { const m = Math.floor(d * 1440); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

export class UI {
  constructor(colony, world, gfx) {
    this.c = colony; this.w = world; this.g = gfx;
    this.selected = -1; this.menu = false; this.confirm = null; this.panelKey = null;
    this.view = 'city'; this.mapSel = -1; this.form = [0, 0]; this.showReports = false;
    this.build();
  }

  build() {
    const top = $('#top');
    this.cards = RES.map((name, i) => {
      const card = h('div', 'card', `<div class="rn" style="color:${RES_COL[i]}">${name}</div><div class="rv">0</div><div class="rr">+0/min</div>`);
      top.querySelector('.res').appendChild(card);
      return { v: card.querySelector('.rv'), r: card.querySelector('.rr') };
    });
    this.line1 = top.querySelector('.l1'); this.line2 = top.querySelector('.l2');
    this.toasts = $('#toasts');
    this.labels = $('#labels');
    this.labelEls = Array.from({ length: PLOTS }, () => { const e = h('div', 'lbl'); this.labels.appendChild(e); return e; });
    this.panel = $('#panel');
    this.mapEl = $('#map');
    this.sea = new SeaMap($('#mapc'), this.c);

    this.bBeacon = $('#bBeacon'); this.bExp = $('#bExp'); this.bMap = $('#bMap'); this.bMenu = $('#bMenu');
    this.bBeacon.dataset.a = 'beacon'; this.bExp.dataset.a = 'exp'; this.bMap.dataset.a = 'map'; this.bMenu.dataset.a = 'menu';

    // Eigene Tipp-Erkennung: Finger runter + Finger hoch auf demselben Knopf, wenig Bewegung.
    this.down = null;
    document.addEventListener('pointerdown', (e) => {
      if (e.target.closest && e.target.closest('#panel')) this.holding = true;
      const b = e.target.closest && e.target.closest('[data-a]');
      if (!b) { this.down = null; return; }
      this.down = { b, x: e.clientX, y: e.clientY, id: e.pointerId };
      this.holding = true;
    }, true);
    document.addEventListener('pointerup', (e) => {
      const d = this.down;
      this.down = null;
      setTimeout(() => (this.holding = false), 30);
      if (!d || d.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 18) return;
      const r = d.b.getBoundingClientRect();
      if (e.clientX < r.left - 10 || e.clientX > r.right + 10 || e.clientY < r.top - 10 || e.clientY > r.bottom + 10) return;
      if (d.b.disabled || !d.b.isConnected) return;
      e.preventDefault();
      this.action(d.b.dataset.a, d.b.dataset);
    }, true);
    document.addEventListener('pointercancel', () => { this.down = null; this.holding = false; }, true);

    // Tippen auf der Seekarte
    const mc = $('#mapc');
    let md = null;
    mc.addEventListener('pointerdown', (e) => { md = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: 0 }; mc.setPointerCapture(e.pointerId); });
    mc.addEventListener('pointermove', (e) => {
      if (!md) return;
      const dx = e.clientX - md.lx, dy = e.clientY - md.ly;
      md.lx = e.clientX; md.ly = e.clientY; md.moved += Math.abs(dx) + Math.abs(dy);
      if (md.moved > 12) this.sea.drag(dx, dy);
    });
    mc.addEventListener('pointerup', (e) => {
      if (!md || md.moved > 15) { md = null; return; }
      md = null;
      const r = mc.getBoundingClientRect();
      const id = this.sea.pick(e.clientX - r.left, e.clientY - r.top);
      this.mapSel = id; this.form = [0, 0]; this.showReports = false; this.panelKey = null;
    });

    const v = window.APP_VERSION || { name: 'dev', channel: 'test' };
    this.version = v;
    if (v.channel !== 'public') { const b = $('#badge'); b.textContent = 'TEST ' + v.name; b.style.display = ''; }
  }

  select(i, keepMenu) {
    if (this.view === 'map' && i >= 0) return;
    this.selected = i; this.w.selected = i; this.confirm = null; this.panelKey = null;
    if (i >= 0 && !keepMenu) this.menu = false;
  }

  setView(v) {
    this.view = v; this.mapSel = -1; this.form = [0, 0]; this.showReports = false;
    this.mapEl.style.display = v === 'map' ? '' : 'none';
    this.labels.style.display = v === 'map' ? 'none' : '';
    if (v === 'map') { this.select(-1); this.menu = false; }
    this.panelKey = null;
  }

  action(a, ds) {
    const c = this.c, v = +(ds.v || 0);
    if (a === 'beacon') c.toggleBeacon();
    else if (a === 'exp') c.startExpedition();
    else if (a === 'gfx') this.g.cycle();
    else if (a === 'map') this.setView(this.view === 'map' ? 'city' : 'map');
    else if (a === 'menu') { if (this.view === 'map') this.setView('city'); this.menu = !this.menu; this.confirm = null; if (this.menu) this.select(-1, true); }
    else if (a === 'close') {
      if (this.view === 'map') { if (this.mapSel >= 0 || this.showReports) { this.mapSel = -1; this.showReports = false; } else this.setView('city'); }
      else { this.select(-1); this.menu = false; }
    }
    else if (a === 'build') c.startBuild(this.selected, v);
    else if (a === 'up') c.startUpgrade(this.selected);
    else if (a === 'demo') { if (this.confirm === 'demo') { c.demolish(this.selected); this.select(-1); } else this.confirm = 'demo'; }
    else if (a === 'save') { c.save(); c.msg('Spielstand gespeichert.'); }
    else if (a === 'new') { if (this.confirm === 'new') { c.newGame(); this.menu = false; this.confirm = null; } else this.confirm = 'new'; }
    else if (a === 'train') c.startTrain(+ds.u, +ds.n);
    else if (a === 'f') { const u = +ds.u; this.form[u] = Math.max(0, Math.min(c.s.troops[u], this.form[u] + +ds.d)); }
    else if (a === 'fall') { this.form = [c.s.troops[0], c.s.troops[1]]; }
    else if (a === 'f0') { this.form = [0, 0]; }
    else if (a === 'send') { if (c.sendTroops(this.mapSel, this.form[0], this.form[1])) { this.form = [0, 0]; this.mapSel = -1; } }
    else if (a === 'withdraw') c.withdraw(this.mapSel);
    else if (a === 'reports') { this.showReports = !this.showReports; this.mapSel = -1; }
    this.panelKey = null;
  }

  costStr(cost) {
    const parts = [];
    cost.forEach((v, i) => { if (v > 0) parts.push(`<span style="color:${this.c.s.res[i] >= v ? RES_COL[i] : '#ff6a6a'}">${RES[i]} ${amount(v)}</span>`); });
    return parts.length ? parts.join(' &nbsp; ') : 'kostenlos';
  }

  update(cw, ch, dt) {
    const c = this.c, s = c.s;
    this.cards.forEach((k, i) => {
      setHTML(k.v, amount(s.res[i]) + (s.res[i] >= c.storage - 1 ? ' <small style="font-size:10px;color:#ffc060">voll</small>' : ''));
      const r = c.rates[i];
      setHTML(k.r, rate(r) + '/min');
      k.r.style.color = r >= 0 ? '#8ef0a0' : '#ff7a7a';
    });
    const fb = c.freeboard, fbCol = fb >= 0.5 ? '#8ef0a0' : fb >= 0 ? '#ffd27a' : '#ff6a6a';
    const tide = c.water < EBB ? 'Ebbe' : c.rising ? 'Flut steigt' : 'Wasser fällt';
    setHTML(this.line1, `Wasser <b>${c.water.toFixed(1)} m</b> (${tide}) &nbsp; Deck ${c.deck.toFixed(1)} m &nbsp; Abstand <b style="color:${fbCol}">${fb >= 0 ? '+' : ''}${fb.toFixed(1)} m</b>`);
    let l2 = `Siedler <b>${s.survivors}/${c.capacity}</b> &nbsp; Krank <b>${s.sick}</b> &nbsp; ⚔ <b>${s.troops[0]}</b>/<b>${s.troops[1]}</b> &nbsp; Tag ${s.days} · ${clock(s.dayTime)}`;
    if (c.storm) l2 += ' &nbsp; <b style="color:#ff6060">STURMFLUT!</b>';
    else if (c.stormWarning) l2 += ` &nbsp; <span style="color:#ffc060">Sturm in ${Math.ceil(s.stormTimer)}s</span>`;
    if (c.raidIn !== null && c.raidIn < 30) l2 += ` &nbsp; <b style="color:#ff6060">Piraten in ${Math.ceil(c.raidIn)}s!</b>`;
    setHTML(this.line2, l2);

    const now = c.time;
    const recent = c.log.filter((e) => now - e.t < 5).slice(-3);
    const key = recent.map((e) => e.t + e.text).join('|');
    if (key !== this.toastKey) {
      this.toastKey = key;
      this.toasts.innerHTML = '';
      for (const e of recent) this.toasts.appendChild(h('div', 'toast', e.text));
    }

    setHTML(this.bBeacon, `<b>Leuchtfeuer</b><span>${s.beaconOn ? '<i style="color:#ffd27a">AN</i>' : '<i style="color:#9ab8c8">AUS</i>'}</span>`);
    const blk = c.expeditionBlocker();
    if (this.bExp.disabled !== !!blk) this.bExp.disabled = !!blk;
    setHTML(this.bExp, s.expLeft > 0 ? `<b>Im Watt</b><span>${fmtTime(s.expLeft)}</span>`
      : blk === 'Wartet auf Ebbe' ? '<b>Wattwandern</b><span>wartet auf Ebbe</span>' : `<b>Wattwandern</b><span>${EXP_FOOD} Muscheln</span>`);
    setHTML(this.bMap, this.view === 'map' ? '<b>Stadt</b><span>zurück</span>' : `<b>Seekarte</b><span>${s.marches.length ? s.marches.length + ' unterwegs' : 'Gebiete'}</span>`);

    if (this.view === 'map') this.sea.draw(dt, this.mapSel);
    else this.cityLabels(cw, ch);
    this.renderPanel();
  }

  cityLabels(cw, ch) {
    const c = this.c, s = c.s, deck = c.deck;
    for (let i = 0; i < PLOTS; i++) {
      const p = s.plots[i], el = this.labelEls[i];
      if (p.type < 0) { el.style.display = 'none'; continue; }
      const pp = plotPos(i);
      const tall = i === 0 ? 16 : p.type === T.WACHTURM ? 11.5 : 6.5;
      const sp = this.w.screenPos([pp[0], deck + tall, pp[2]], cw, ch);
      if (!sp) { el.style.display = 'none'; continue; }
      el.style.display = '';
      el.style.transform = `translate(${sp[0]}px, ${sp[1]}px) translate(-50%, -50%)`;
      const txt = (p.level > 0 ? `${DEFS[p.type].name} <i>${p.level}</i>` : DEFS[p.type].name) +
        (p.buildLeft > 0 ? `<div class="bar"><div style="width:${(100 * (1 - p.buildLeft / Math.max(0.01, p.buildTotal))).toFixed(0)}%"></div></div><small>${fmtTime(p.buildLeft)}</small>` : '');
      if (el._t !== txt) { el._t = txt; el.innerHTML = txt; }
    }
  }

  renderPanel() {
    let html = '';
    if (this.view === 'map') html = this.showReports ? this.reportsHtml() : this.mapSel >= 0 ? this.terrHtml() : this.mapHtml();
    else if (this.menu) html = this.menuHtml();
    else if (this.selected >= 0) html = this.plotHtml();
    if (html === this.panelKey || this.holding) return;
    this.panelKey = html;
    this.panel.innerHTML = html;
    this.panel.style.display = html ? '' : 'none';
  }

  head(title) { return `<div class="ph"><div class="pt">${title}</div><button class="x" data-a="close">✕</button></div>`; }

  // ---------- Bauplätze ----------
  plotHtml() {
    const c = this.c, i = this.selected, p = c.s.plots[i];
    if (p.type < 0) {
      if (i >= INNER && c.towerLevel < OUTER_LEVEL)
        return this.head('Äußerer Bauplatz') + `<div class="desc">Dieser Platz liegt im äußeren Ring. Er wird frei, sobald dein Gezeitenturm Stufe ${OUTER_LEVEL} erreicht.</div>`;
      let rows = '';
      for (let t = 1; t < DEFS.length; t++) {
        const d = DEFS[t], blk = c.buildBlocker(i, t);
        rows += `<div class="row"><div class="ri"><div><b>${d.name}</b> <span class="sh">${d.short}</span></div>
          <div class="sm">${this.costStr(costFor(t, 1))} &nbsp;·&nbsp; ${fmtTime(buildTime(t, 1))}</div>
          ${blk && blk !== 'Zu wenig Rohstoffe' ? `<div class="warn">${blk}</div>` : ''}</div>
          <button class="btn" data-a="build" data-v="${t}" ${blk ? 'disabled' : ''}>Bauen</button></div>`;
      }
      return this.head(i >= INNER ? 'Freier Bauplatz (außen)' : 'Freier Bauplatz') + `<div class="list">${rows}</div>`;
    }
    const d = DEFS[p.type], L = p.level;
    let out = this.head(L > 0 ? `${d.name} · Stufe ${L}` : `${d.name} (im Bau)`) + `<div class="desc">${d.desc}</div>`;
    if (L > 0) out += this.info(p.type, L).map((l) => `<div class="inf">${l}</div>`).join('');
    if (L > 0 && p.type === T.KASERNE) out += this.barracksHtml();
    if (p.buildLeft > 0) {
      out += `<div class="inf">Bauarbeiten: noch ${fmtTime(p.buildLeft)}</div><div class="bar big"><div style="width:${(100 * (1 - p.buildLeft / Math.max(0.01, p.buildTotal))).toFixed(0)}%"></div></div>`;
    }
    let btns = '';
    if (p.buildLeft <= 0 && L < MAX_LEVEL) {
      const blk = c.upgradeBlocker(i);
      out += `<div class="sm">Ausbau auf Stufe ${L + 1}: ${this.costStr(costFor(p.type, L + 1))} &nbsp;·&nbsp; ${fmtTime(buildTime(p.type, L + 1))}</div>`;
      if (blk && blk !== 'Zu wenig Rohstoffe') out += `<div class="warn">${blk}</div>`;
      btns += `<button class="btn" data-a="up" ${blk ? 'disabled' : ''}><b>Ausbauen → ${L + 1}</b></button>`;
    } else if (L >= MAX_LEVEL) out += '<div class="sm">Maximale Stufe erreicht.</div>';
    if (i !== 0) btns += `<button class="btn ${this.confirm === 'demo' ? 'danger' : 'ghost'}" data-a="demo">${this.confirm === 'demo' ? '<b>Wirklich abreißen?</b>' : 'Abreißen'}</button>`;
    return out + `<div class="btns">${btns}</div>`;
  }

  barracksHtml() {
    const c = this.c, s = c.s;
    let out = `<div class="sub2">Truppen zu Hause: <b>${s.troops[0]}</b> Harpuniere · <b>${s.troops[1]}</b> Wachen</div>`;
    if (s.train.length) {
      const q = s.train[0];
      out += `<div class="sm">In Ausbildung: ${s.train.map((t) => `${t.n}× ${UNITS[t.u].name}`).join(', ')} · nächster in ${fmtTime(q.left)} (${c.queued()}/${c.trainSlots()})</div>`;
    } else out += `<div class="sm">Ausbildungsschlange leer (max. ${c.trainSlots()})</div>`;
    UNITS.forEach((u, k) => {
      const b1 = c.trainBlocker(k, 1), b5 = c.trainBlocker(k, 5);
      out += `<div class="row"><div class="ri"><div><b>${u.name}</b> <span class="sh">Angriff ${u.att} · Verteidigung ${u.def}</span></div>
        <div class="sm">je ${this.costStr(unitCost(k, 1))}</div></div>
        <button class="btn sm2" data-a="train" data-u="${k}" data-n="1" ${b1 ? 'disabled' : ''}>+1</button>
        <button class="btn sm2" data-a="train" data-u="${k}" data-n="5" ${b5 ? 'disabled' : ''}>+5</button></div>`;
    });
    return out;
  }

  info(t, L) {
    const c = this.c, d = DEFS[t];
    switch (t) {
      case T.TURM: return [`Deckhöhe der Stadt: <b>${deckFor(L).toFixed(2)} m</b> (nächste Stufe ${deckFor(L + 1).toFixed(2)} m)`, `Leuchtfeuer verbraucht ${Math.round(beaconWood(L) * 60)} Holz/min`, `Andere Gebäude bis Stufe ${L}`, L < OUTER_LEVEL ? `Äußerer Bauring ab Stufe ${OUTER_LEVEL}` : 'Äußerer Bauring ist frei'];
      case T.HAUS: return [`Platz für <b>${6 * L}</b> Siedler`];
      case T.HEILER: return [`Heilung etwa ${1 + 5 * L}× so schnell`, `Arbeiter: ${d.workers * L}`];
      case T.RAUCH: return [`Muschelverbrauch −${Math.min(50, 8 * L)} %`, `Arbeiter: ${d.workers * L}`];
      case T.KUECHE: return [`Alle Produktion <b>+${Math.min(60, 6 * L)} %</b>`, `Arbeiter: ${d.workers * L}`];
      case T.KASERNE: return [`Ausbildung ${Math.round(25 * (L - 1))} % schneller · Schlange bis ${10 * L}`];
      case T.WACHTURM: return [`Verteidigung der Stadt <b>+${12 * L} %</b>`, `Aktuelle Verteidigung: <b>${c.defense}</b>`, c.raidIn !== null ? `Nächster Piratenüberfall in etwa ${fmtTime(c.raidIn)}` : 'Piraten greifen ab Tag 2 an'];
      case T.LAGER: return [`Lagerplatz je Rohstoff: <b>${c.storage}</b>`];
      default:
        return [`Produktion: <b>${Math.round(rateAt(t, L) * 60 * c.efficiency)}</b>/min ${RES[d.prod]} (Arbeit ${Math.round(c.efficiency * 100)} %)`,
          `Arbeiter: ${d.workers * L} &nbsp;·&nbsp; Stufe ${L + 1}: ${Math.round(rateAt(t, L + 1) * 60)}/min`];
    }
  }

  // ---------- Seekarte ----------
  mapHtml() {
    const c = this.c, s = c.s, away = c.troopsAway;
    const owned = s.terr.filter((t) => t.owner === 1).length;
    const marches = s.marches.map((m) => `<div class="sm">⛵ ${m.h + m.w} Soldaten → ${s.terr[m.target].name} (${m.phase === 'back' ? 'Heimweg' : m.kind === 'attack' ? 'Angriff' : 'Verstärkung'}) · ${fmtTime(m.left)}</div>`).join('');
    return this.head('Seekarte') +
      `<div class="inf">Zu Hause: <b>${s.troops[0]}</b> Harpuniere · <b>${s.troops[1]}</b> Wachen</div>
       <div class="inf">Unterwegs/Besatzung: <b>${away.h}</b> · <b>${away.w}</b> &nbsp; Gebiete: <b>${owned}/${s.terr.length}</b></div>
       ${marches}
       <div class="sm">Tippe auf eine Insel, um sie anzugreifen oder zu verstärken. Eroberte Gebiete geben Produktionsbonus.</div>
       <div class="btns"><button class="btn ghost" data-a="reports">Berichte (${s.reports.length})</button></div>`;
  }

  terrHtml() {
    const c = this.c, s = c.s, t = s.terr[this.mapSel];
    const tt = travelTime(t);
    let out = this.head(t.name) + `<div class="desc">${t.kind} · Ring ${t.ring} · Bonus <b>+${t.pct} % ${RES[t.res]}</b> · Fahrt ${fmtTime(tt)}</div>`;
    if (t.owner === 1) {
      out += `<div class="inf">🚩 Dein Gebiet. Besatzung: <b>${t.gh}</b> Harpuniere · <b>${t.gw}</b> Wachen</div>
        <div class="sm">Piraten versuchen ab und zu, Gebiete zurückzuerobern. Wachen verteidigen besonders gut.</div>`;
    } else {
      out += `<div class="inf">☠ Piraten, Stärke etwa <b>${Math.round(t.pirates)}</b></div>`;
    }
    const f = this.form;
    out += `<div class="sub2">${t.owner === 1 ? 'Verstärkung schicken' : 'Angriffstrupp'}</div>`;
    UNITS.forEach((u, k) => {
      out += `<div class="row"><div class="ri"><b>${u.name}</b> <span class="sh">${f[k]} / ${s.troops[k]}</span></div>
        <button class="btn sm2" data-a="f" data-u="${k}" data-d="-5">−5</button><button class="btn sm2" data-a="f" data-u="${k}" data-d="-1">−1</button>
        <button class="btn sm2" data-a="f" data-u="${k}" data-d="1">+1</button><button class="btn sm2" data-a="f" data-u="${k}" data-d="5">+5</button></div>`;
    });
    const blk = c.attackBlocker(t.id, f[0], f[1]);
    if (t.owner !== 1) {
      const att = f[0] * UNITS[0].att + f[1] * UNITS[1].att, ch = Math.round(c.winChance(t.id, f[0], f[1]) * 100);
      out += `<div class="sm">Angriffskraft: <b>${att}</b> gegen ~${Math.round(t.pirates)} · Siegchance: <b style="color:${ch >= 70 ? '#8ef0a0' : ch >= 30 ? '#ffd27a' : '#ff7a7a'}">${ch} %</b></div>`;
    }
    if (blk && blk !== 'Keine Truppen ausgewählt') out += `<div class="warn">${blk}</div>`;
    out += `<div class="btns"><button class="btn ghost" data-a="fall">Alle</button><button class="btn ghost" data-a="f0">Keine</button>
      <button class="btn ${t.owner === 1 ? '' : 'danger'}" data-a="send" ${blk ? 'disabled' : ''}><b>${t.owner === 1 ? 'Verstärken' : 'Angreifen!'}</b></button>
      ${t.owner === 1 && t.gh + t.gw > 0 ? '<button class="btn ghost" data-a="withdraw">Besatzung abziehen</button>' : ''}</div>`;
    return out;
  }

  reportsHtml() {
    const s = this.c.s;
    const rows = s.reports.length ? s.reports.map((r) => `<div class="row rep ${r.win ? 'win' : 'loss'}"><div class="ri"><div class="sm">Tag ${r.day} · ${clock(r.time)}</div>${r.text}</div></div>`).join('') : '<div class="sm">Noch keine Kämpfe.</div>';
    return this.head('Kampfberichte') + rows;
  }

  menuHtml() {
    const g = this.g;
    return this.head('Pfahlstadt – Menü') +
      `<div class="inf">Grafikstufe: <b>${g.auto ? 'Automatisch → ' : ''}${TIERS[g.tier]}</b></div>
       <div class="inf">Auflösung: <b>${g.res[0]} × ${g.res[1]}</b> (Ultra: Supersampling, max. 8K)</div>
       <div class="inf">Bildrate: <b>${Math.round(g.fpsShown)} FPS</b></div>
       <div class="inf">Version: <b>${this.version.name}</b>${this.version.channel === 'public' ? '' : ' (Testversion)'}</div>
       <div class="btns col"><button class="btn" data-a="gfx">Grafik umschalten (${g.auto ? 'Auto' : TIERS[g.tier]})</button>
       <button class="btn" data-a="save">Spiel speichern</button>
       <button class="btn ${this.confirm === 'new' ? 'danger' : 'ghost'}" data-a="new">${this.confirm === 'new' ? '<b>Wirklich neu anfangen? Alles geht verloren</b>' : 'Neues Spiel'}</button></div>
       <div class="sm">Tipps: Wattwandern geht nur bei Ebbe. Muscheln wachsen bei Ebbe, Taucher arbeiten bei Flut. Steigt das Wasser über das Deck, werden Siedler krank. Ab Tag 2 greifen Piraten an – Kaserne und Wachturm schützen die Stadt.</div>`;
  }
}
