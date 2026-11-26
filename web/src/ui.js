// Oberfläche (HTML über der 3D-Ansicht)
import { RES, RES_COL, DEFS, T, MAX_LEVEL, costFor, buildTime, rateAt, deckFor, beaconWood, fmtTime, EXP_FOOD, EBB, PLOTS } from './game.js';
import { plotPos } from './world.js';
import { TIERS } from './gfx.js';

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

    this.bBeacon = $('#bBeacon'); this.bExp = $('#bExp'); this.bGfx = $('#bGfx'); this.bMenu = $('#bMenu');
    this.bBeacon.dataset.a = 'beacon'; this.bExp.dataset.a = 'exp'; this.bGfx.dataset.a = 'gfx'; this.bMenu.dataset.a = 'menu';

    // Eigene Tipp-Erkennung: Finger runter + Finger hoch auf demselben Knopf, wenig Bewegung.
    // Robust auch dann, wenn sich der Knopftext zwischendurch ändert.
    this.down = null;
    document.addEventListener('pointerdown', (e) => {
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
      this.action(d.b.dataset.a, +d.b.dataset.v);
    }, true);
    document.addEventListener('pointercancel', () => { this.down = null; this.holding = false; }, true);
    this.lastLog = 0;
    const v = window.APP_VERSION || { name: 'dev', channel: 'test' };
    this.version = v;
    if (v.channel !== 'public') { const b = $('#badge'); b.textContent = 'TEST ' + v.name; b.style.display = ''; }
  }

  select(i, keepMenu) {
    this.selected = i; this.w.selected = i; this.confirm = null; this.panelKey = null;
    if (i >= 0 && !keepMenu) this.menu = false;
  }

  action(a, v) {
    const c = this.c;
    if (a === 'beacon') c.toggleBeacon();
    else if (a === 'exp') c.startExpedition();
    else if (a === 'gfx') this.g.cycle();
    else if (a === 'menu') { this.menu = !this.menu; this.confirm = null; if (this.menu) this.select(-1, true); }
    else if (a === 'close') { this.select(-1); this.menu = false; }
    else if (a === 'build') c.startBuild(this.selected, v);
    else if (a === 'up') c.startUpgrade(this.selected);
    else if (a === 'demo') { if (this.confirm === 'demo') { c.demolish(this.selected); this.select(-1); } else this.confirm = 'demo'; }
    else if (a === 'save') { c.save(); c.msg('Spielstand gespeichert.'); }
    else if (a === 'new') { if (this.confirm === 'new') { c.newGame(); this.menu = false; this.confirm = null; } else this.confirm = 'new'; }
    this.panelKey = null;
  }

  costStr(cost) {
    const parts = [];
    cost.forEach((v, i) => { if (v > 0) parts.push(`<span style="color:${this.c.s.res[i] >= v ? RES_COL[i] : '#ff6a6a'}">${RES[i]} ${amount(v)}</span>`); });
    return parts.length ? parts.join(' &nbsp; ') : 'kostenlos';
  }

  update(cw, ch) {
    const c = this.c, s = c.s;
    // Kopfzeile
    this.cards.forEach((k, i) => {
      k.v.textContent = amount(s.res[i]);
      const r = c.rates[i];
      k.r.textContent = rate(r) + '/min';
      k.r.style.color = r >= 0 ? '#8ef0a0' : '#ff7a7a';
    });
    const fb = c.freeboard, fbCol = fb >= 0.5 ? '#8ef0a0' : fb >= 0 ? '#ffd27a' : '#ff6a6a';
    const tide = c.water < EBB ? 'Ebbe' : c.rising ? 'Flut steigt' : 'Wasser fällt';
    setHTML(this.line1, `Wasser <b>${c.water.toFixed(1)} m</b> (${tide}) &nbsp; Deck ${c.deck.toFixed(1)} m &nbsp; Abstand <b style="color:${fbCol}">${fb >= 0 ? '+' : ''}${fb.toFixed(1)} m</b>`);
    let l2 = `Siedler <b>${s.survivors}/${c.capacity}</b> &nbsp; Krank <b>${s.sick}</b> &nbsp; Arbeit ${Math.round(c.efficiency * 100)}% &nbsp; Tag ${s.days} · ${clock(s.dayTime)}`;
    if (c.storm) l2 += ' &nbsp; <b style="color:#ff6060">STURMFLUT!</b>';
    else if (c.stormWarning) l2 += ` &nbsp; <span style="color:#ffc060">Sturm in ${Math.ceil(s.stormTimer)}s</span>`;
    setHTML(this.line2, l2);

    // Meldungen
    const now = c.time;
    const recent = c.log.filter((e) => now - e.t < 5).slice(-3);
    const key = recent.map((e) => e.t + e.text).join('|');
    if (key !== this.toastKey) {
      this.toastKey = key;
      this.toasts.innerHTML = '';
      for (const e of recent) this.toasts.appendChild(h('div', 'toast', e.text));
    }

    // Knöpfe
    setHTML(this.bBeacon, `<b>Leuchtfeuer</b><span>${s.beaconOn ? '<i style="color:#ffd27a">AN</i>' : '<i style="color:#9ab8c8">AUS</i>'}</span>`);
    const blk = c.expeditionBlocker();
    if (this.bExp.disabled !== !!blk) this.bExp.disabled = !!blk;
    setHTML(this.bExp, s.expLeft > 0 ? `<b>Im Watt</b><span>${fmtTime(s.expLeft)}</span>`
      : blk === 'Wartet auf Ebbe' ? '<b>Wattwandern</b><span>wartet auf Ebbe</span>' : `<b>Wattwandern</b><span>${EXP_FOOD} Muscheln</span>`);
    setHTML(this.bGfx, `<b>Grafik</b><span>${this.g.auto ? 'Auto · ' : ''}${TIERS[this.g.tier]}</span>`);

    // Beschriftungen über den Gebäuden
    const deck = c.deck;
    for (let i = 0; i < PLOTS; i++) {
      const p = s.plots[i], el = this.labelEls[i];
      if (p.type < 0) { el.style.display = 'none'; continue; }
      const pp = plotPos(i);
      const sp = this.w.screenPos([pp[0], deck + (i === 0 ? 16 : 6.5), pp[2]], cw, ch);
      if (!sp) { el.style.display = 'none'; continue; }
      el.style.display = '';
      el.style.transform = `translate(${sp[0]}px, ${sp[1]}px) translate(-50%, -50%)`;
      const txt = (p.level > 0 ? `${DEFS[p.type].name} <i>${p.level}</i>` : DEFS[p.type].name) +
        (p.buildLeft > 0 ? `<div class="bar"><div style="width:${(100 * (1 - p.buildLeft / Math.max(0.01, p.buildTotal))).toFixed(0)}%"></div></div><small>${fmtTime(p.buildLeft)}</small>` : '');
      if (el._t !== txt) { el._t = txt; el.innerHTML = txt; }
    }

    this.renderPanel();
  }

  renderPanel() {
    const c = this.c, s = c.s;
    let html = '';
    if (this.menu) html = this.menuHtml();
    else if (this.selected >= 0) html = this.plotHtml();
    if (html === this.panelKey || this.holding) return;
    this.panelKey = html;
    this.panel.innerHTML = html;
    this.panel.style.display = html ? '' : 'none';
  }

  head(title) { return `<div class="ph"><div class="pt">${title}</div><button class="x" data-a="close">✕</button></div>`; }

  plotHtml() {
    const c = this.c, i = this.selected, p = c.s.plots[i];
    if (p.type < 0) {
      let rows = '';
      for (let t = 1; t < DEFS.length; t++) {
        const d = DEFS[t], blk = c.buildBlocker(i, t);
        rows += `<div class="row"><div class="ri"><div><b>${d.name}</b> <span class="sh">${d.short}</span></div>
          <div class="sm">${this.costStr(costFor(t, 1))} &nbsp;·&nbsp; ${fmtTime(buildTime(t, 1))}</div>
          ${blk && blk !== 'Zu wenig Rohstoffe' ? `<div class="warn">${blk}</div>` : ''}</div>
          <button class="btn" data-a="build" data-v="${t}" ${blk ? 'disabled' : ''}>Bauen</button></div>`;
      }
      return this.head('Freier Bauplatz') + `<div class="list">${rows}</div>`;
    }
    const d = DEFS[p.type], L = p.level;
    let out = this.head(L > 0 ? `${d.name} · Stufe ${L}` : `${d.name} (im Bau)`) + `<div class="desc">${d.desc}</div>`;
    if (L > 0) out += this.info(p.type, L).map((l) => `<div class="inf">${l}</div>`).join('');
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

  info(t, L) {
    const c = this.c, d = DEFS[t];
    switch (t) {
      case T.TURM: return [`Deckhöhe der Stadt: <b>${deckFor(L).toFixed(2)} m</b> (nächste Stufe ${deckFor(L + 1).toFixed(2)} m)`, `Leuchtfeuer verbraucht ${Math.round(beaconWood(L) * 60)} Holz/min`, `Andere Gebäude bis Stufe ${L}`];
      case T.HAUS: return [`Platz für <b>${6 * L}</b> Siedler`];
      case T.HEILER: return [`Heilung etwa ${1 + 5 * L}× so schnell`, `Arbeiter: ${d.workers * L}`];
      case T.RAUCH: return [`Muschelverbrauch −${Math.min(50, 8 * L)} %`, `Arbeiter: ${d.workers * L}`];
      default:
        return [`Produktion: <b>${Math.round(rateAt(t, L) * 60 * c.efficiency)}</b>/min ${RES[d.prod]} (Arbeit ${Math.round(c.efficiency * 100)} %)`,
          `Arbeiter: ${d.workers * L} &nbsp;·&nbsp; Stufe ${L + 1}: ${Math.round(rateAt(t, L + 1) * 60)}/min`];
    }
  }

  menuHtml() {
    const g = this.g;
    return this.head('Pfahlstadt – Menü') +
      `<div class="inf">Grafikstufe: <b>${g.auto ? 'Automatisch → ' : ''}${TIERS[g.tier]}</b></div>
       <div class="inf">Auflösung: <b>${g.res[0]} × ${g.res[1]}</b> (Ultra: Supersampling, max. 8K)</div>
       <div class="inf">Bildrate: <b>${Math.round(g.fpsShown)} FPS</b></div>
       <div class="inf">Version: <b>${this.version.name}</b>${this.version.channel === 'public' ? '' : ' (Testversion)'}</div>
       <div class="btns col"><button class="btn" data-a="save">Spiel speichern</button>
       <button class="btn ${this.confirm === 'new' ? 'danger' : 'ghost'}" data-a="new">${this.confirm === 'new' ? '<b>Wirklich neu anfangen? Alles geht verloren</b>' : 'Neues Spiel'}</button></div>
       <div class="sm">Tipp: Wattwandern geht nur bei Ebbe. Muscheln wachsen bei Ebbe, Taucher arbeiten bei Flut, Regenfänger lieben Stürme. Steigt das Wasser über das Deck, werden Siedler krank – bau den Gezeitenturm aus!</div>`;
  }
}
