// Oberfläche (HTML über der 3D-Ansicht) inkl. Seekarte, Kaserne und Berichten
import { RES, RES_COL, DEFS, T, MAX_LEVEL, costFor, buildTime, rateAt, deckFor, beaconWood, fmtTime, EXP_FOOD, EXP_TIME, EBB, PLOTS, INNER, RING3, WALL, TOWERS, DAMM, damTopFor, LAYOUT, OUTER_LEVEL, CITY_TYPES, UNITS, unitCost, travelTime, zeroU, uSum, armyStr, troopStr, speedFactor, carryOf, TIDE_MUL, TIDE_NAME, lazSave, lazBeds } from './game.js';
import { plotPos } from './world.js';
import { towerHeight } from './models.js';
import { dailyState, dailyReward, claimDaily, DAILY, questsToday, claimQuest, ACH, achCount, TUT, tutStep, queueAdd, MAX_QUEUE, trade } from './features.js';
const QOK = ['Alle Bautrupps beschäftigt', 'Zu wenig Rohstoffe'];
import { TIERS } from './gfx.js';
import { SeaMap } from './map.js';

const $ = (sel) => document.querySelector(sel);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const amount = (v) => (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e4 ? (v / 1e3).toFixed(1) + 'k' : String(Math.floor(v)));
const rate = (v) => { const a = Math.abs(v); const s = a >= 1000 ? (a / 1000).toFixed(1) + 'k' : String(Math.round(a)); return (v < 0 ? '−' : '+') + s; };
const RES_IC = ['🪵', '🦪', '💧', '⚙️'];
const B_IC = ['🗼', '🪵', '🦪', '💧', '⚙️', '🏠', '🌿', '🐟', '🍲', '⚔️', '👁️', '📦', '🧱', '🏹', '🌊', '🔱', '🛡️', '🗡️', '🪨', '🏃', '🩹'];
const NODE_NAME = ['Treibholz', 'Muschelbank', 'Süßwassertümpel', 'Wrackteile'];
const setHTML = (el, html) => { if (el._h !== html) { el._h = html; el.innerHTML = html; } };
const clock = (d) => { const m = Math.floor(d * 1440); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

export class UI {
  constructor(colony, world, gfx, online) {
    this.c = colony; this.w = world; this.g = gfx; this.o = online;
    this.selected = -1; this.menu = false; this.confirm = null; this.panelKey = null;
    this.view = 'city'; this.mapSel = null; this.form = zeroU(); this.showReports = false;
    this.mode = null; // 'ally' | 'rank' | 'account'
    this.busy = false; this.tasksOpen = true; this.troopTab = 'truppen';
    this.build();
  }

  build() {
    const top = $('#top');
    this.cards = RES.map((name, i) => {
      const card = h('div', 'card', `<span class="ic" title="${name}">${RES_IC[i]}</span><div class="cv"><b class="rv">0</b><span class="rr">+0</span></div>`);
      top.querySelector('.res').appendChild(card);
      return { v: card.querySelector('.rv'), r: card.querySelector('.rr') };
    });
    this.gw = top.querySelector('.gw'); this.gd = top.querySelector('.gd'); this.tl = top.querySelector('.tl'); this.st = top.querySelector('.st');
    this.acc = 1;
    this.toasts = $('#toasts');
    this.labels = $('#labels');
    this.labelEls = Array.from({ length: PLOTS }, () => { const e = h('div', 'lbl'); this.labels.appendChild(e); return e; });
    this.panel = $('#panel');
    this.mapEl = $('#map');
    this.sea = new SeaMap($('#mapc'), this.c, this.o);

    this.bBeacon = $('#bBeacon'); this.bExp = $('#bExp'); this.bMap = $('#bMap'); this.bAlly = $('#bAlly'); this.bMenu = $('#bMenu'); this.bBuild = $('#bBuild'); this.bTroops = $('#bTroops'); this.bTroops.dataset.a = 'troops'; this.tasksEl = $('#tasks'); this.bGift = $('#bGift'); this.bGift.dataset.a = 'gift'; this.tutEl = $('#tut');
    this.bBuild.dataset.a = 'buildings';
    this.bBeacon.dataset.a = 'beacon'; this.bExp.dataset.a = 'exp'; this.bMap.dataset.a = 'map'; this.bAlly.dataset.a = 'ally'; this.bMenu.dataset.a = 'menu';
    this.login = $('#login');
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !e.target || e.target.tagName !== 'INPUT') return;
      const id = e.target.id;
      if (id === 'chatIn') this.action('chat', {});
      if (id === 'loginName') this.action('register', {});
      if (id === 'loginCode') this.action('restore', {});
    });
    if (!this.o.active && !localStorage.getItem('pf_offline')) this.showLogin(true);

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
      this.mapSel = this.sea.pick(e.clientX - r.left, e.clientY - r.top);
      this.form = zeroU(); this.showReports = false; this.panelKey = null; this.confirm = null;
    });

    const v = window.APP_VERSION || { name: 'dev', channel: 'test' };
    this.version = v;
    if (v.channel !== 'public') { const b = $('#badge'); b.textContent = 'TEST ' + String(v.name).replace(/^Test\s*/i, ''); b.style.display = ''; }
  }

  select(i, keepMenu) {
    if (this.view === 'map' && i !== -1) return;
    this.selected = i; this.w.selected = i; this.confirm = null; this.panelKey = null;
    if (i !== -1 && !keepMenu) { this.menu = false; this.mode = null; this.o.wantChat = false; }
  }

  showLogin(on, codeMode) {
    this.login.style.display = on ? 'flex' : 'none';
    if (on) {
      $('#loginCodeBox').style.display = codeMode ? '' : 'none';
      $('#loginNameBox').style.display = codeMode ? 'none' : '';
      $('#loginErr').textContent = '';
    }
  }

  openMenu(tab) {
    if (this.view === 'map') this.setView('city');
    this.select(-1, true); this.mode = null; this.o.wantChat = false;
    this.menu = true; this.menuTab = tab; this.confirm = null; this.panelKey = null;
    if (tab === 'rank') this.o.loadRanking();
    if (tab === 'reports' && this.o.active) this.o.sync();
  }

  openMode(m) {
    if (this.view === 'map') this.setView('city');
    this.select(-1); this.menu = false;
    this.mode = this.mode === m ? null : m; this.confirm = null; this.panelKey = null;
    this.o.wantChat = this.mode === 'ally';
    if (this.mode === 'ally') { this.o.loadAlliances(); this.o.loadChat(); this.o.loadRallies(); }
    if (this.mode === 'rank') this.o.loadRanking();
  }

  async run(fn) {
    if (this.busy) return;
    this.busy = true; this.panelKey = null;
    try { await fn(); } catch (e) { this.c.msg(e.message || 'Fehler'); }
    this.busy = false; this.panelKey = null;
  }

  setView(v) {
    this.view = v; this.mapSel = null; this.form = zeroU(); this.showReports = false;
    this.mapEl.style.display = v === 'map' ? '' : 'none';
    this.labels.style.display = v === 'map' ? 'none' : '';
    if (v === 'map') { this.select(-1); this.menu = false; this.mode = null; this.o.wantChat = false; }
    this.o.wantWorld = v === 'map';
    if (v === 'map' && this.o.active) { this.o.loadWorld(); this.o.sync(); }
    this.panelKey = null;
  }

  action(a, ds) {
    const c = this.c, o = this.o, v = +(ds.v || 0);
    const val = (id) => { const e = $('#' + id); return e ? e.value.trim() : ''; };
    if (a === 'beacon') c.toggleBeacon();
    else if (a === 'exp') c.startExpedition();
    else if (a === 'gfx') this.g.cycle();
    else if (a === 'map') this.setView(this.view === 'map' ? 'city' : 'map');
    else if (a === 'ally') this.openMode('ally');
    else if (a === 'rank') { this.troopTab = 'rank'; if (this.mode !== 'troops') this.openMode('troops'); this.o.loadRanking(); }
    else if (a === 'account') this.openMenu('settings');
    else if (a === 'menu') { if (this.menu) { this.menu = false; } else this.openMenu('settings'); }
    else if (a === 'mtab') { this.menuTab = ds.t; this.codeMsg = null; if (ds.t === 'codes') this.o.loadCodes().then(() => (this.panelKey = null)); }
    else if (a === 'redeem') {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      const code = val('codeIn'); if (!code) return;
      this.run(async () => {
        try { const t = await o.redeem(code); this.codeMsg = { ok: true, text: `🎁 Eingelöst! Du bekommst: <b>${t}</b>` }; const e = $('#codeIn'); if (e) e.value = ''; }
        catch (e) { this.codeMsg = { ok: false, text: e.message }; }
      });
    }
    else if (a === 'codeRandom') { const e = $('#ncCode'); if (e) { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let k = ''; for (let i = 0; i < 8; i++) k += A[Math.floor(Math.random() * A.length)]; e.value = k; } }
    else if (a === 'codeSave') {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      const num = (id) => Math.max(0, Math.floor(+val(id) || 0));
      const code = val('ncCode').toUpperCase(), res = [0, 1, 2, 3].map((i) => num('ncR' + i)), u = [0, 1, 2, 3, 4].map((i) => num('ncU' + i));
      const days = val('ncDays') === '' ? 1 : num('ncDays'), max = num('ncMax');
      this.run(async () => {
        try { await o.saveCode(code, res, u, days, max); this.codeMsg = { ok: true, text: `Code <b>${code}</b> gespeichert – gib ihn an deine Spieler weiter.` }; }
        catch (e) { this.codeMsg = { ok: false, text: e.message }; }
      });
    }
    else if (a === 'codeDel') { const k = ds.c; if (this.confirm === 'del' + k) { this.confirm = null; this.run(async () => { await o.deleteCode(k); }); } else this.confirm = 'del' + k; }
    else if (a === 'troops') { if (this.mode === 'troops') this.mode = null; else { this.openMode('troops'); this.troopTab = this.troopTab || 'truppen'; this.ttabLoad(); } }
    else if (a === 'ttab') { this.troopTab = ds.t; this.ttabLoad(); }
    else if (a === 'tasks') this.tasksOpen = !this.tasksOpen;
    else if (a === 'gonode') { const n = c.nodeById(+ds.i); this.menu = false; this.mode = null; if (n) { this.w.target[0] = n.x; this.w.target[2] = n.z; this.w.dist = Math.min(this.w.dist, 55); this.select(-1000 - n.id); } }
    else if (a === 'gomap') { if (this.view !== 'map') this.setView('map'); }
    else if (a === 'buildings') { if (this.mode === 'build') { this.mode = null; } else { this.openMode('build'); this.buildTab = this.buildTab || 'mine'; } }
    else if (a === 'btab') this.buildTab = ds.t;
    else if (a === 'quickbuild') {
      const t = +ds.v, i = this.freePlotFor(t);
      if (i < 0) c.msg('Kein passender freier Bauplatz – baue mehr, damit dein Gelände wächst.');
      else if (c.startBuild(i, t)) { const pp = plotPos(i); this.w.target[0] = pp[0]; this.w.target[2] = pp[2]; this.mode = null; }
    }
    else if (a === 'qbuild') { const t = +ds.v, i = this.freePlotQueue(t); if (i >= 0) { const e = queueAdd(c, i, t); if (e) c.msg(e); } }
    else if (a === 'qplot') { const e = queueAdd(c, this.selected, +ds.v); if (e) c.msg(e); else this.select(-1); }
    else if (a === 'qup') { const i = ds.i !== undefined ? +ds.i : this.selected; const e = queueAdd(c, i, null); if (e) c.msg(e); else if (ds.i === undefined || this.selected === i) this.select(-1); }
    else if (a === 'qdel') { (c.s.bq || []).splice(+ds.k, 1); }
    else if (a === 'gift') { if (this.mode === 'gift') this.mode = null; else { this.openMode('gift'); this.giftTab = this.giftTab || 'daily'; } }
    else if (a === 'gtab') this.giftTab = ds.t;
    else if (a === 'claimDaily') { const r = claimDaily(c); if (r) c.msg(`🎁 Tagesbelohnung: ${this.rewardStr(r.res, r.u)}`); }
    else if (a === 'claimQuest') { if (claimQuest(c, +ds.k)) c.msg('✅ Belohnung erhalten!'); }
    else if (a === 'trader') { this.openMode('trader'); }
    else if (a === 'trade') { const e = trade(c, +ds.k); c.msg(e || '⛵ Handel abgeschlossen.'); }
    else if (a === 'tutSkip') { c.s.tut = TUT.length; }
    else if (a === 'goto') { const i = +ds.i; this.menu = false; const pp = plotPos(i); this.w.target[0] = pp[0]; this.w.target[2] = pp[2]; this.w.dist = Math.min(this.w.dist, 45); this.select(i); }
    else if (a === 'upq') c.startUpgrade(+ds.i);
    else if (a === 'close') {
      if (this.view === 'map') { if (this.mapSel || this.showReports) { this.mapSel = null; this.showReports = false; } else this.setView('city'); }
      else { this.select(-1); this.menu = false; this.mode = null; this.o.wantChat = false; }
    }
    else if (a === 'build') { if (c.startBuild(this.selected, v)) this.select(-1); }
    else if (a === 'up') { if (c.startUpgrade(this.selected)) this.select(-1); }
    else if (a === 'demo') { if (this.confirm === 'demo') { c.demolish(this.selected); this.select(-1); } else this.confirm = 'demo'; }
    else if (a === 'save') { c.save(); c.msg('Spielstand gespeichert.'); }
    else if (a === 'new') { if (this.confirm === 'new') { c.newGame(); this.menu = false; this.confirm = null; } else this.confirm = 'new'; }
    else if (a === 'train') c.startTrain(+ds.u, +ds.n);
    else if (a === 'gath') { const id = -1000 - this.selected; c.setGatherers(id, Math.max(0, c.assigned(id) + +ds.d)); }
    else if (a === 'f') { const u = +ds.u; this.form[u] = Math.max(0, Math.min(c.s.troops[u], this.form[u] + +ds.d)); }
    else if (a === 'fall') { this.form = c.s.troops.slice(0, 5); }
    else if (a === 'f0') { this.form = zeroU(); }
    else if (a === 'send') {
      const sel = this.mapSel, f = this.form.slice();
      if (!sel) return;
      if (this.sea.isOnline) this.run(async () => { await o.sendMarch(sel.type, sel.id, f); this.form = zeroU(); this.mapSel = null; c.msg(sel.type === 'player' ? 'Angriff gestartet!' : 'Trupp ist unterwegs.'); await o.loadWorld(); });
      else if (c.sendTroops(sel.id, f)) { this.form = zeroU(); this.mapSel = null; }
    }
    else if (a === 'scout') {
      const sel = this.mapSel; if (!sel) return;
      const blk = c.scoutBlocker(); if (blk) { c.msg(blk); return; }
      if (this.sea.isOnline) this.run(async () => { await o.scout(sel.type, sel.id); c.payScout(); c.msg('🔭 Späher unterwegs – der Bericht kommt unter Berichte.'); await o.loadWorld(); });
      else c.sendScout(sel.id);
    }
    else if (a === 'rally') {
      const sel = this.mapSel, f = this.form.slice(), w = +ds.w; if (!sel) return;
      this.run(async () => { await o.rallyCreate(sel.type, sel.id, f, w); this.form = zeroU(); this.mapSel = null; c.msg(`⚔️ Sammelangriff startet in ${w} Minuten – deine Allianz wurde benachrichtigt.`); });
    }
    else if (a === 'rallyPick') { this.rallySel = +ds.id; this.form = zeroU(); }
    else if (a === 'rallyJoin') {
      const id = this.rallySel, f = this.form.slice(); if (!id) return;
      this.run(async () => { await o.rallyJoin(id, f); this.rallySel = null; this.form = zeroU(); c.msg('⚔️ Du bist beim Sammelangriff dabei!'); });
    }
    else if (a === 'rallyBack') { this.rallySel = null; }
    else if (a === 'withdraw') {
      const sel = this.mapSel; if (!sel) return;
      if (this.sea.isOnline) this.run(async () => { await o.withdraw(sel.id); c.msg('Besatzung kehrt heim.'); });
      else c.withdraw(sel.id);
    }
    else if (a === 'reports') { this.showReports = !this.showReports; this.mapSel = null; }
    // ---- online
    else if (a === 'register') {
      const name = val('loginName');
      this.run(async () => {
        try { await o.register(name); this.showLogin(false); localStorage.removeItem('pf_offline'); }
        catch (e) { $('#loginErr').textContent = e.message || 'Keine Verbindung zum Server.'; }
      });
    }
    else if (a === 'restore') {
      const code = val('loginCode');
      this.run(async () => {
        try { await o.restore(code); this.showLogin(false); localStorage.removeItem('pf_offline'); }
        catch (e) { $('#loginErr').textContent = e.message || 'Keine Verbindung zum Server.'; }
      });
    }
    else if (a === 'loginCode') this.showLogin(true, true);
    else if (a === 'loginName') this.showLogin(true, false);
    else if (a === 'offline') { localStorage.setItem('pf_offline', '1'); this.showLogin(false); }
    else if (a === 'goOnline') { this.menu = false; this.mode = null; this.showLogin(true); }
    else if (a === 'showCode') this.confirm = this.confirm === 'code' ? null : 'code';
    else if (a === 'logout') { if (this.confirm === 'logout') { o.logout(); this.mode = null; this.confirm = null; c.msg('Abgemeldet. Dein Spielstand bleibt auf dem Handy.'); } else this.confirm = 'logout'; }
    else if (a === 'allyCreate') { const n = val('alName'), t = val('alTag'); this.run(async () => { await o.createAlliance(n, t); c.msg(`Allianz ${n} gegründet!`); }); }
    else if (a === 'allyJoin') { const id = ds.id; this.run(async () => { await o.joinAlliance(id); c.msg('Allianz beigetreten!'); }); }
    else if (a === 'allyLeave') { if (this.confirm === 'leave') { this.confirm = null; this.run(async () => { await o.leaveAlliance(); c.msg('Allianz verlassen.'); }); } else this.confirm = 'leave'; }
    else if (a === 'kick') { const id = ds.id; this.run(async () => { await o.kick(id); }); }
    else if (a === 'chat') { const t = val('chatIn'); if (!t) return; const inp = $('#chatIn'); if (inp) inp.value = ''; this.run(async () => { await o.sendChat(t); }); }
    this.panelKey = null;
  }

  costStr(cost) {
    const parts = [];
    cost.forEach((v, i) => { if (v > 0) parts.push(`<span style="color:${this.c.s.res[i] >= v ? RES_COL[i] : '#ff6a6a'}">${RES[i]} ${amount(v)}</span>`); });
    return parts.length ? parts.join(' &nbsp; ') : 'kostenlos';
  }

  update(cw, ch, dt) {
    // Karte und Beschriftungen laufen flüssig mit, der Rest 10× pro Sekunde (spart Rechenzeit)
    if (this.view === 'map') this.sea.draw(dt, this.mapSel);
    else this.cityLabels(cw, ch);
    this.acc += dt;
    if (this.acc < 0.1) return;
    this.acc = 0;
    const c = this.c, s = c.s;
    this.cards.forEach((k, i) => {
      setHTML(k.v, amount(s.res[i]));
      const full = s.res[i] >= c.storage - 1;
      if (k.full !== full) { k.full = full; k.v.style.color = full ? '#ffc060' : ''; k.v.title = full ? 'Lager voll' : ''; }
      const r = c.rates[i];
      setHTML(k.r, rate(r));
      k.r.style.color = r >= 0 ? '#8ef0a0' : '#ff7a7a';
    });
    // Wasserstand-Anzeige: blau = Wasser, gelb = Deckhöhe
    const top = Math.max(c.deck + 1.5, 6);
    this.gw.style.width = `${Math.max(0, Math.min(100, (c.water / top) * 100))}%`;
    this.gd.style.left = `${Math.min(97, (c.deck / top) * 100)}%`;
    const fb = c.freeboard, fbCol = fb >= 0.5 ? '#8ef0a0' : fb >= 0 ? '#ffd27a' : '#ff6a6a';
    const tide = c.storm ? '<b style="color:#ff6060">STURMFLUT</b>' : c.water < EBB ? 'Ebbe' : c.rising ? 'Flut ↑' : 'Flut ↓';
    setHTML(this.tl, `${tide} · <b style="color:${fbCol}">${fb >= 0 ? '+' : ''}${fb.toFixed(1)} m</b>${c.damHolds ? ' · <span style="color:#8ef0a0">🌊 Damm hält</span>' : ''}${c.stormWarning ? ' · <span style="color:#ffc060">Sturm naht</span>' : ''}${c.raidIn !== null && c.raidIn < 30 ? ' · <b style="color:#ff6060">Piraten!</b>' : ''}`);
    let st = `👥 <b>${s.survivors}</b>/${c.capacity}${s.sick ? ` 🤒${s.sick}` : ''} · ⚔ <b>${uSum(s.troops)}</b> · ${clock(s.dayTime)}`;
    if (this.o.active) st += this.o.incoming ? ` · <b style="color:#ff6060">⚠ Angriff!</b>` : this.o.status === 'online' ? ' <span style="color:#8ef0a0">●</span>' : ' <span style="color:#ffb070">●</span>';
    setHTML(this.st, st);

    const now = c.time;
    const recent = c.log.filter((e) => now - e.t < 4).slice(-2);
    const key = recent.map((e) => e.t + e.text).join('|');
    if (key !== this.toastKey) {
      this.toastKey = key;
      this.toasts.innerHTML = '';
      for (const e of recent) this.toasts.appendChild(h('div', 'toast', e.text));
    }

    const btn = (el, ic, label, sub) => setHTML(el, `<span class="ic">${ic}</span><b>${label}</b>${sub ? `<span>${sub}</span>` : ''}`);
    btn(this.bBeacon, '💡', 'Licht', s.beaconOn ? 'an' : 'aus');
    this.bBeacon.classList.toggle('on', !!s.beaconOn);
    const blk = c.expeditionBlocker();
    if (this.bExp.disabled !== !!blk) this.bExp.disabled = !!blk;
    btn(this.bExp, '🧭', 'Watt', s.expLeft > 0 ? fmtTime(s.expLeft) : blk === 'Wartet auf Ebbe' ? 'bei Ebbe' : 'los');
    const nm = this.o.active ? this.o.marches.length : s.marches.length;
    if (this.view === 'map') btn(this.bMap, '🏘️', 'Stadt', '');
    else btn(this.bMap, '🗺️', 'Karte', nm ? nm + ' unterw.' : '');
    const al = this.o.alliances && this.o.me && this.o.me.alliance_id ? (this.o.alliances.list || []).find((x) => x.id === this.o.me.alliance_id) : null;
    btn(this.bAlly, '🤝', 'Allianz', !this.o.active ? 'offline' : al ? '[' + al.tag + ']' : '');
    btn(this.bMenu, '☰', 'Menü', '');
    const tq = c.queued ? c.queued() : 0;
    btn(this.bTroops, '⚔️', 'Truppen', this.o.active && this.o.incoming ? '<i style="color:#ff6060">Angriff!</i>' : tq ? `🎓 ${tq}` : '');
    this.renderTasks();
    const ds = dailyState(c), qs = questsToday(c), qready = qs.some((q) => !q.done && q.have >= q.n);
    btn(this.bGift, '🎁', 'Belohn.', ds.can || qready ? '<i class="dot"></i>' : '');
    this.bGift.classList.toggle('on', ds.can || qready);
    const ts = tutStep(c);
    if (ts < TUT.length && this.view === 'city' && this.panel.style.display === 'none') { setHTML(this.tutEl, `<span class="tn">Tipp ${ts + 1}/${TUT.length}</span> ${TUT[ts].text}<button class="tx" data-a="tutSkip">✕</button>`); this.tutEl.style.display = ''; }
    else this.tutEl.style.display = 'none';
    btn(this.bBuild, '🏗️', 'Gebäude', c.activeBuilds ? `🔨 ${c.activeBuilds}/2` : '');
    this.renderPanel();
  }

  cityLabels(cw, ch) {
    const c = this.c, s = c.s, deck = c.deck;
    const items = [];
    for (let i = 0; i < PLOTS; i++) {
      const p = s.plots[i], el = this.labelEls[i];
      const ghost = p.type < 0 && i !== DAMM && this.w.dist < 75 && !c.buildBlocker(i, LAYOUT[i])?.match(/^(Äußerer|Gelände|Erst)/);
      if ((p.type < 0 && !ghost) || (this.w.dist > 120 && p.buildLeft <= 0 && i !== 0)) { el.style.display = 'none'; continue; }
      const pp = plotPos(i);
      const tall = i === DAMM ? c.damTop - deck + 3 : i === 0 ? towerHeight(Math.max(1, p.level)) + 5 : p.type === T.WACHTURM ? 11.5 : p.type === T.ABWEHR ? 11 : i === WALL ? 10 : 6.5;
      const sp = this.w.screenPos([pp[0], deck + tall, pp[2]], cw, ch);
      if (!sp || sp[0] < -40 || sp[0] > cw + 40 || sp[1] < 60 || sp[1] > ch - 60) { el.style.display = 'none'; continue; }
      const near = this.w.dist < 50 || i === this.selected;
      const txt = ghost ? `<span class="gh">＋ ${B_IC[LAYOUT[i]]}</span>` : `<span class="li">${B_IC[p.type]}</span>${near ? ' ' + DEFS[p.type].name : ''}${p.level > 0 ? ` <i>${p.level}</i>` : ''}` +
        (p.buildLeft > 0 ? `<div class="bar"><div style="width:${(100 * (1 - p.buildLeft / Math.max(0.01, p.buildTotal))).toFixed(0)}%"></div></div><small>${fmtTime(p.buildLeft)}</small>` : '');
      if (el._t !== txt) { el._t = txt; el.innerHTML = txt; el.style.display = ''; el._w = el.offsetWidth; el._h = el.offsetHeight; }
      // Priorität: ausgewählt > im Bau > nah an der Kamera
      const prio = (i === this.selected ? 0 : p.buildLeft > 0 ? 1 : ghost ? 3 : 2) * 1e6 + sp[2];
      items.push({ el, x: sp[0], y: sp[1], w: el._w || 60, h: el._h || 22, prio });
    }
    items.sort((a, b) => a.prio - b.prio);
    const placed = [];
    for (const it of items) {
      const r = { l: it.x - it.w / 2 - 2, r: it.x + it.w / 2 + 2, t: it.y - it.h / 2 - 2, b: it.y + it.h / 2 + 2 };
      const hit = placed.some((q) => r.l < q.r && r.r > q.l && r.t < q.b && r.b > q.t);
      if (hit) { it.el.style.display = 'none'; continue; }
      placed.push(r);
      it.el.style.display = '';
      it.el.style.transform = `translate(${it.x}px, ${it.y}px) translate(-50%, -50%)`;
    }
  }

  renderPanel() {
    // Während getippt wird nicht neu zeichnen (sonst verliert das Eingabefeld den Fokus)
    const ae = document.activeElement;
    if (ae && ae.tagName === 'INPUT' && this.panel.contains(ae)) return;
    let html = '';
    if (this.view === 'map') html = this.showReports ? this.reportsHtml() : this.mapSel ? (this.mapSel.type === 'player' ? this.playerHtml() : this.terrHtml()) : this.mapHtml();
    else if (this.mode === 'ally') html = this.allyHtml();
    else if (this.mode === 'build') html = this.buildingsHtml();
    else if (this.mode === 'troops') html = this.troopsHtml();
    else if (this.mode === 'gift') html = this.giftHtml();
    else if (this.mode === 'trader') html = this.traderHtml();
    else if (this.mode === 'rank') html = this.rankHtml();
    else if (this.mode === 'account') html = this.accountHtml();
    else if (this.menu) html = this.menuHtml();
    else if (this.selected >= 0) html = this.plotHtml();
    else if (this.selected <= -1000) html = this.nodeHtml();
    if (html === this.panelKey || this.holding) return;
    this.panelKey = html;
    // Eingaben (Codes, Allianz, Chat …) beim Neuzeichnen behalten
    const keep = {};
    this.panel.querySelectorAll('input[id], textarea[id]').forEach((e) => { if (e.value) keep[e.id] = e.value; });
    this.panel.innerHTML = html;
    for (const id in keep) { const e = this.panel.querySelector('#' + id); if (e && !e.value) e.value = keep[id]; }
    this.panel.style.display = html ? '' : 'none';
    const mini = this.view !== 'map' && !this.mode && !this.menu && ((this.selected >= 0 && this.c.s.plots[this.selected].type >= 0) || this.selected <= -1000);
    this.panel.classList.toggle('mini', mini);
    const qk = document.getElementById('quick'); if (qk) qk.style.display = html ? 'none' : '';
    const cb = document.getElementById('chatBox');
    if (cb) cb.scrollTop = cb.scrollHeight;
  }

  // ---------- Auftragsliste (Bau, Ausbildung, Märsche, Sammeln, Watt) ----------
  tasks() {
    const c = this.c, s = c.s, o = this.o, out = [];
    const pct = (left, total) => Math.max(0, Math.min(100, 100 * (1 - left / Math.max(0.01, total))));
    s.plots.forEach((p, i) => {
      if (p.type >= 0 && p.buildLeft > 0) out.push({ ic: '🔨', t: `${DEFS[p.type].name} ${p.level > 0 ? '→ ' + (p.level + 1) : ''}`, left: p.buildLeft, pct: pct(p.buildLeft, p.buildTotal), a: `data-a="goto" data-i="${i}"` });
    });
    if (s.train && s.train.length) {
      const q = s.train[0];
      const all = s.train.reduce((a, x, k) => a + (k === 0 ? x.left + (x.n - 1) * x.per : x.n * x.per), 0);
      out.push({ ic: '🎓', t: `${c.queued()}× Ausbildung`, left: all, pct: pct(q.left, q.per), a: 'data-a="troops"' });
    }
    (s.bq || []).forEach((q, k) => { const t = q.type !== null && q.type !== undefined ? q.type : s.plots[q.plot].type; out.push({ ic: '🕒', t: `Wartet: ${DEFS[t].name}`, left: null, pct: null, a: `data-a="goto" data-i="${q.plot}"` }); });
    if (s.trader && s.trader.left > 0) out.push({ ic: '⛵', t: 'Händler am Steg', left: s.trader.left, pct: null, a: 'data-a="trader"' });
    if (s.expLeft > 0) out.push({ ic: '🧭', t: 'Wattwanderung', left: s.expLeft, pct: pct(s.expLeft, EXP_TIME), a: '' });
    if (o.active) {
      const now = o.serverNow(), W = o.world || { players: [], territories: [] };
      for (const m of o.marches || []) {
        const back = m.status === 'back';
        const left = Math.max(0, ((back ? Date.parse(m.back_at) : Date.parse(m.arrive)) - now) / 1000);
        const nm = m.target_player ? ((W.players.find((p) => p.id === m.target_player) || {}).name || 'Stadt') : ((W.territories.find((t) => t.id === m.target_terr) || {}).name || 'Gebiet');
        out.push({ ic: m.kind === 'scout' ? '🔭' : back ? '↩️' : m.kind === 'player' ? '⚔️' : '⛵', t: `${m.kind === 'scout' ? 'Späher' : back ? 'Heimweg' : m.rally_id ? 'Sammelangr.' : 'Angriff'} ${nm}`, left, pct: null, a: 'data-a="gomap"' });
      }
      if (o.incoming) out.push({ ic: '⚠️', t: 'Feind greift an!', left: null, red: true, a: 'data-a="gomap"' });
    } else {
      for (const m of s.marches || []) {
        const back = m.phase === 'back', nm = (s.terr[m.target] || {}).name || 'Gebiet';
        out.push({ ic: m.kind === 'scout' ? '🔭' : back ? '↩️' : m.kind === 'attack' ? '⚔️' : '🛡️', t: `${m.kind === 'scout' ? 'Späher' : back ? 'Heimweg' : m.kind === 'attack' ? 'Angriff' : 'Verstärk.'} ${nm}`, left: m.left, pct: pct(m.left, m.total), a: 'data-a="gomap"' });
      }
    }
    if (c.raidIn !== null && c.raidIn < 180) out.push({ ic: '🏴‍☠️', t: 'Piraten kommen', left: c.raidIn, pct: null, red: true, a: 'data-a="troops"' });
    // Sammler je Sammelstelle
    const by = {};
    for (const g of s.gath || []) by[g.node] = (by[g.node] || 0) + 1;
    for (const id in by) {
      const n = c.nodeById(+id);
      if (!n) { out.push({ ic: '👣', t: `${by[id]} kehren heim`, left: null, a: '' }); continue; }
      const L = c.gatherPath(n).L, trip = 2 * L / 2.3 + 5;
      const left = n.amount / Math.max(0.01, by[id] * c.carry / trip);
      out.push({ ic: RES_IC[n.type], t: `${by[id]}× ${NODE_NAME[n.type]}`, left, pct: 100 * (1 - n.amount / Math.max(1, n.max)), a: `data-a="gonode" data-i="${n.id}"` });
    }
    return out;
  }

  renderTasks() {
    const el = this.tasksEl; if (!el || this.holding) return;
    const list = this.view === 'map' ? [] : this.tasks();
    const bigPanel = this.panel.style.display !== 'none' && !this.panel.classList.contains('mini');
    if (!list.length || bigPanel) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
    if (el.style.display === 'none') el.style.display = '';
    const open = this.tasksOpen !== false;
    el.classList.toggle('shut', !open);
    const rows = list.slice(0, 7).map((t) => `<button class="tk ${t.red ? 'red' : ''}" ${t.a}><div class="tr"><span class="tn">${t.ic} ${t.t}</span>${t.left !== null ? `<b>${t.pre || ''}${fmtTime(t.left)}</b>` : ''}</div>${t.pct !== null && t.pct !== undefined ? `<div class="bar"><div style="width:${t.pct.toFixed(0)}%"></div></div>` : ''}</button>`).join('');
    const html = `<div class="tb"><div class="th">⏳ AUFTRÄGE</div>${rows}</div><div class="hd" data-a="tasks"><span>⏳</span><b>${list.length}</b><span>${open ? '◂' : '▸'}</span></div>`;
    setHTML(el, html);
  }

  head(title) { return `<div class="ph"><div class="pt">${title}</div><button class="x" data-a="close">✕</button></div>`; }

  // ---------- Bauplätze ----------
  plotHtml() {
    const c = this.c, i = this.selected, p = c.s.plots[i];
    if (p.type < 0) {
      if (i >= INNER && i < RING3 && c.towerLevel < OUTER_LEVEL)
        return this.head('Äußerer Bauplatz') + `<div class="desc">Dieser Platz liegt im äußeren Ring. Er wird frei, sobald dein Gezeitenturm Stufe ${OUTER_LEVEL} erreicht.</div>`;
      if (i >= RING3 && i < WALL && c.builtCount < c.ring3Needed(i))
        return this.head('Gelände (noch nicht erschlossen)') + `<div class="desc">Deine Warft wächst mit jedem Neubau. Dieser Platz wird frei, wenn du noch <b>${c.ring3Needed(i) - c.builtCount}</b> Gebäude baust. Geländeradius jetzt: ${Math.round(c.areaRadius)} m.</div>`;
      const types = [LAYOUT[i]];
      let rows = '';
      for (const t of types) {
        const d = DEFS[t], blk = c.buildBlocker(i, t);
        rows += `<div class="row"><div class="ri"><div><b>${d.name}</b> <span class="sh">${d.short}</span></div>
          <div class="sm">${this.costStr(costFor(t, 1))} &nbsp;·&nbsp; ${fmtTime(buildTime(t, 1))}</div>
          ${blk && blk !== 'Zu wenig Rohstoffe' ? `<div class="warn">${blk}</div>` : ''}</div>
          ${QOK.includes(blk) && (c.s.bq || []).length < MAX_QUEUE && !(c.s.bq || []).some((q) => q.plot === i) ? `<button class="btn ghost" data-a="qplot" data-v="${t}">🕒 Später</button>` : `<button class="btn" data-a="build" data-v="${t}" ${blk ? 'disabled' : ''}>Bauen</button>`}</div>`;
      }
      const zone = i === DAMM ? 'ganz außen' : i === WALL ? 'Festung' : i >= TOWERS ? 'auf der Mauer' : i >= RING3 ? 'Warft' : i >= INNER ? 'Ring 2' : 'Stadtkern';
      const title = `${B_IC[LAYOUT[i]]} Bauplatz · ${zone}`;
      const intro = i === WALL ? '<div class="desc">Baue eine Mauer mit Tor rund um dein ganzes Gelände. Sie wächst mit, wenn die Warft größer wird.</div>' : '';
      return this.head(title) + intro + `<div class="list">${rows}</div>`;
    }
    const d = DEFS[p.type], L = p.level;
    let out = this.head(`${B_IC[p.type]} ${d.name} <span class="lv">${L > 0 ? 'Stufe ' + L : 'im Bau'}</span>`);
    if (L > 0) { const inf = this.info(p.type, L); if (inf.length) out += `<div class="inf">${inf[0]}</div>`; }
    if (p.buildLeft > 0) {
      out += `<div class="bline"><div class="ri" style="flex:1">🔨 ${L > 0 ? 'Ausbau auf ' + (L + 1) : 'Bau'} · noch <b style="color:#ffd27a">${fmtTime(p.buildLeft)}</b><div class="bar"><div style="width:${(100 * (1 - p.buildLeft / Math.max(0.01, p.buildTotal))).toFixed(0)}%"></div></div></div></div>`;
    } else if (L < MAX_LEVEL) {
      const blk = c.upgradeBlocker(i);
      out += `<div class="bline"><div class="ri" style="flex:1">→ Stufe ${L + 1}: ${this.costStr(costFor(p.type, L + 1))} · ⏱ ${fmtTime(buildTime(p.type, L + 1))}${blk && blk !== 'Zu wenig Rohstoffe' ? `<div class="warn">${blk}</div>` : ''}</div>${QOK.includes(blk) && (c.s.bq || []).length < MAX_QUEUE && !(c.s.bq || []).some((q) => q.plot === i) ? `<button class="btn ghost" data-a="qup" data-i="${i}"><b>🕒 Später</b></button>` : `<button class="btn" data-a="up" ${blk ? 'disabled' : ''}><b>Ausbauen</b></button>`}</div>`;
    } else out += '<div class="sm">Maximale Stufe erreicht.</div>';
    const extra = [];
    if (L > 0 && (p.type === T.KASERNE || p.type >= T.HARPHOF)) extra.push('<button class="btn ghost" data-a="troops">⚔️ Truppen ausbilden</button>');
    if (i !== 0) extra.push(`<button class="btn ${this.confirm === 'demo' ? 'danger' : 'ghost'}" data-a="demo" style="padding:7px 10px;font-size:12px">${this.confirm === 'demo' ? '<b>Wirklich abreißen?</b>' : 'Abreißen'}</button>`);
    return out + (extra.length ? `<div class="btns" style="margin-top:8px">${extra.join('')}</div>` : '');
  }

  nodeHtml() {
    const c = this.c, id = -1000 - this.selected, n = c.nodeById(id);
    if (!n) return this.head('Sammelstelle') + '<div class="desc">Hier ist nichts mehr zu holen.</div>';
    const as = c.assigned(id), flooded = c.nodeFlooded(n);
    const path = c.gatherPath(n), trip = (path.L * 2) / 2.3 + 5;
    return this.head(`${RES_IC[n.type]} ${NODE_NAME[n.type]}`) +
      `<div class="desc">Schicke Bewohner los: Sie laufen durchs Tor hinaus, sammeln und tragen bis zu <b>${c.carry}</b> ${RES[n.type]} pro Gang zurück.</div>
       <div class="inf">Vorrat: <b>${Math.round(n.amount)}</b> ${RES[n.type]} · ein Gang ≈ ${fmtTime(trip)}</div>
       <div class="inf">${flooded ? '<b style="color:#7fd3f0">🌊 Überflutet</b> – erst bei Ebbe wieder erreichbar' : '<b style="color:#8ef0a0">✓ Erreichbar</b>' + (n.h < 0.3 ? ' (liegt im Watt: nur bei Ebbe)' : ' (auf einer Sandbank)')}</div>
       <div class="row"><div class="ri"><b>Sammler: ${as}</b><div class="sm">freie Bewohner: ${c.freeVillagers} · Sammler fehlen in den Gebäuden</div></div>
         <button class="btn sm2" data-a="gath" data-d="-1" ${as <= 0 ? 'disabled' : ''}>−1</button>
         <button class="btn sm2" data-a="gath" data-d="1" ${c.freeVillagers <= 0 ? 'disabled' : ''}>+1</button>
         <button class="btn sm2" data-a="gath" data-d="3" ${c.freeVillagers <= 0 ? 'disabled' : ''}>+3</button></div>`;
  }

  barracksHtml() {
    const c = this.c, s = c.s;
    let out = `<div class="sub2">Zu Hause: ${troopStr(s.troops)}</div>`;
    if (s.train.length) {
      const q = s.train[0];
      out += `<div class="sm">In Ausbildung: ${s.train.map((t) => `${t.n}× ${UNITS[t.u].name}`).join(', ')} · nächster in ${fmtTime(q.left)} (${c.queued()}/${c.trainSlots()})</div>`;
    } else out += `<div class="sm">Ausbildungsschlange leer (max. ${c.trainSlots()})</div>`;
    UNITS.forEach((u, k) => {
      const lv = c.levels(u.b), b1 = c.trainBlocker(k, 1), b5 = c.trainBlocker(k, 5), b10 = c.trainBlocker(k, 10);
      out += `<div class="row"><div class="ri"><div><b>${u.ic} ${u.name}</b> <span class="sh">⚔${u.att} 🛡${u.def} 🎒${u.carry}</span> <span class="sh">· ${s.troops[k]} da</span></div>
        <div class="sm">${u.info}</div>
        ${lv > 0 ? `<div class="sm">je ${this.costStr(unitCost(k, 1))}</div>` : `<div class="warn">Braucht ${DEFS[u.b].name} (${B_IC[u.b]})</div>`}</div>
        ${lv > 0 ? `<button class="btn sm2" data-a="train" data-u="${k}" data-n="1" ${b1 ? 'disabled' : ''}>+1</button>
        <button class="btn sm2" data-a="train" data-u="${k}" data-n="5" ${b5 ? 'disabled' : ''}>+5</button>
        <button class="btn sm2" data-a="train" data-u="${k}" data-n="10" ${b10 ? 'disabled' : ''}>+10</button>` : ''}</div>`;
    });
    return out;
  }

  info(t, L) {
    const c = this.c, d = DEFS[t];
    switch (t) {
      case T.TURM: return [`Deckhöhe der Stadt: <b>${deckFor(L).toFixed(2)} m</b> (nächste Stufe ${deckFor(L + 1).toFixed(2)} m)`, `Leuchtturm-Licht verbraucht ${Math.round(beaconWood(L) * 60)} Holz/min`, `Andere Gebäude bis Stufe ${L}`, L < OUTER_LEVEL ? `Äußerer Bauring ab Stufe ${OUTER_LEVEL}` : 'Äußerer Bauring ist frei'];
      case T.HAUS: return [`Platz für <b>${6 * L}</b> Siedler`];
      case T.HEILER: return [`Heilung etwa ${1 + 5 * L}× so schnell`, `Arbeiter: ${d.workers * L}`];
      case T.RAUCH: return [`Muschelverbrauch −${Math.min(50, 8 * L)} %`, `Arbeiter: ${d.workers * L}`];
      case T.KUECHE: return [`Alle Produktion <b>+${Math.min(60, 6 * L)} %</b>`, `Arbeiter: ${d.workers * L}`];
      case T.KASERNE: return [`Ausbildung ${Math.round(25 * (L - 1))} % schneller · Schlange bis ${10 * L}`];
      case T.LAZARETT: return [`Rettet <b>${Math.round(lazSave(L) * 100)} %</b> der Gefallenen · ${lazBeds(L)} Betten`, `Verwundet: ${troopStr(c.s.wounded)} · Heilung ${L} alle 8 s`];
      case T.HARPHOF: case T.WACHSTUBE: case T.ENTERHALLE: case T.SCHLEUDER: case T.WATTHUETTE: {
        const k = UNITS.findIndex((u) => u.b === t), u = UNITS[k];
        return [`${u.ic} <b>${u.name}</b>: ${u.info}`, `Ausbildung ${10 * (L - 1)} % schneller · zu Hause: ${c.s.troops[k]}`];
      }
      case T.WACHTURM: return [`Verteidigung der Stadt <b>+${12 * L} %</b>`, `Aktuelle Verteidigung: <b>${c.defense}</b>`, c.raidIn !== null ? `Nächster Piratenüberfall in etwa ${fmtTime(c.raidIn)}` : 'Piraten greifen ab Tag 2 an'];
      case T.LAGER: return [`Lagerplatz je Rohstoff: <b>${c.storage}</b>`];
      case T.DAMM: return [`Schützt bis Wasserstand <b>${damTopFor(L).toFixed(1)} m</b> (nächste Stufe ${damTopFor(L + 1).toFixed(1)} m)`, `Jetzt: Wasser ${c.water.toFixed(1)} m · ${c.damHolds ? '<b style="color:#8ef0a0">Damm hält die Flut ab</b>' : c.water > c.damTop ? '<b style="color:#ff6a6a">Wasser läuft über den Damm!</b>' : 'Stadt liegt trocken'}`];
      case T.MAUER: return [`${L <= 6 ? 'Holzpalisade' : L <= 13 ? 'Steinwall' : 'Festungswall'} · Verteidigung <b>+${15 * L} %</b>`, `Stadtverteidigung gesamt: <b>${c.defense}</b>`, `Geländeradius: ${Math.round(c.areaRadius)} m`];
      case T.ABWEHR: return [`Verteidigung <b>+${40 * L}</b>`, `Stadtverteidigung gesamt: <b>${c.defense}</b>`];
      default:
        return [`Produktion: <b>${Math.round(rateAt(t, L) * 60 * c.efficiency)}</b>/min ${RES[d.prod]} (Arbeit ${Math.round(c.efficiency * 100)} %)`,
          `Arbeiter: ${d.workers * L} &nbsp;·&nbsp; Stufe ${L + 1}: ${Math.round(rateAt(t, L + 1) * 60)}/min`];
    }
  }

  // ---------- Seekarte ----------
  troopForm(sendLabel, danger, blk, extra, act) {
    const s = this.c.s, f = this.form;
    let out = '';
    UNITS.forEach((u, k) => {
      if (!s.troops[k] && !f[k]) return;
      out += `<div class="row"><div class="ri"><b>${u.ic} ${u.name}</b> <span class="sh">${f[k]} / ${s.troops[k]}</span></div>
        <button class="btn sm2" data-a="f" data-u="${k}" data-d="-5">−5</button><button class="btn sm2" data-a="f" data-u="${k}" data-d="-1">−1</button>
        <button class="btn sm2" data-a="f" data-u="${k}" data-d="1">+1</button><button class="btn sm2" data-a="f" data-u="${k}" data-d="5">+5</button></div>`;
    });
    if (!uSum(s.troops) && !uSum(f)) out += '<div class="sm">Keine Krieger zu Hause. Bilde sie unter ⚔️ Truppen aus.</div>';
    else if (uSum(f)) out += `<div class="sm">Trupp: ${troopStr(f)} · Beute bis ${carryOf(f)} · Tempo ${speedFactor(f) < 1 ? 'schnell 🏃' : speedFactor(f) > 1 ? 'langsam 🪨' : 'normal'}</div>`;
    if (extra) out += extra;
    if (blk && blk !== 'Keine Truppen ausgewählt') out += `<div class="warn">${blk}</div>`;
    out += `<div class="btns"><button class="btn ghost" data-a="fall">Alle</button><button class="btn ghost" data-a="f0">Keine</button>
      <button class="btn ${danger ? 'danger' : ''}" data-a="${act || 'send'}" ${blk || this.busy ? 'disabled' : ''}><b>${sendLabel}</b></button></div>`;
    return out;
  }

  tideLine(sec) {
    const c = this.c, st = c.tideState(sec), m = TIDE_MUL[String(st)];
    const eff = UNITS.map((u, i) => (m[i] !== 1 ? `${u.ic}${m[i] > 1 ? '+' : '−'}${Math.round(Math.abs(m[i] - 1) * 100)} %` : '')).filter(Boolean).join(' ');
    return `🌊 ${sec ? 'Ankunft bei' : 'Jetzt'} <b>${TIDE_NAME[st]}</b>${eff ? ': ' + eff : ''}`;
  }
  tideBox() {
    const c = this.c;
    return `<div class="sm tide">${this.tideLine(0)} · wechselt in ${fmtTime(c.tideChangeIn())}</div>`;
  }

  attackInfo(att, def) {
    if (def == null) return `<div class="sm">Angriffskraft: <b>${att}</b> · Verteidigung des Gegners unbekannt</div>`;
    const ch = att <= 0 ? 0 : Math.round(Math.max(0, Math.min(1, (att / Math.max(1, def) - 0.85) / 0.3)) * 100);
    return `<div class="sm">Angriffskraft: <b>${att}</b> gegen ~${Math.round(def)} · Siegchance: <b style="color:${ch >= 70 ? '#8ef0a0' : ch >= 30 ? '#ffd27a' : '#ff7a7a'}">${ch} %</b></div>`;
  }

  homeTroops(c, s, away) {
    return `<div class="inf">Zu Hause: ${troopStr(s.troops)}</div>
       <div class="inf">Unterwegs/Besatzung: ${troopStr(away)}</div>`;
  }

  mapHtml() {
    const c = this.c, s = c.s, away = c.troopsAway, o = this.o;
    if (this.sea.isOnline) {
      const now = o.serverNow();
      const tname = (m) => m.target_player ? ((o.world.players.find((p) => p.id === m.target_player) || {}).name || 'Stadt') : ((o.world.territories.find((t) => t.id === m.target_terr) || {}).name || 'Gebiet');
      const marches = o.marches.map((m) => {
        const left = m.status === 'out' ? Date.parse(m.arrive) - now : Date.parse(m.back_at) - now;
        return `<div class="sm">${m.kind === 'scout' ? '🔭 Späher' : `⛵ ${uSum(m.u || zeroU())} Krieger${m.rally_id ? ' (Sammelangriff)' : ''}`} → ${tname(m)} (${m.status === 'back' ? 'Heimweg' : m.kind === 'player' ? 'Angriff auf Stadt' : m.kind === 'scout' ? 'Erkundung' : 'Gebiet'}) · ${fmtTime(Math.max(0, left / 1000))}</div>`;
      }).join('');
      return this.head('Seekarte (online)') + this.tideBox() + this.homeTroops(c, s, away) +
        `<div class="inf">Deine Gebiete: <b>${o.owned.length}</b> &nbsp; Spieler auf der Karte: <b>${o.world.players.length}</b></div>${marches}
         <div class="sm">Ziehen zum Verschieben. Tippe auf Inseln oder fremde Städte (🏰). Grün = deins, blau = Verbündete, orange = Gegner.</div>
         <div class="btns"><button class="btn ghost" data-a="reports">Berichte (${o.reports.length})</button></div>`;
    }
    if (o.active) return this.head('Seekarte') + '<div class="inf">Lade Weltkarte …</div>' + (o.error ? `<div class="warn">${o.error}</div>` : '');
    const owned = s.terr.filter((t) => t.owner === 1).length;
    const marches = s.marches.map((m) => `<div class="sm">${m.kind === 'scout' ? '🔭 Späher' : `⛵ ${uSum(m.u || zeroU())} Krieger`} → ${s.terr[m.target].name} (${m.kind === 'scout' ? 'Erkundung' : m.phase === 'back' ? 'Heimweg' : m.kind === 'attack' ? 'Angriff' : 'Verstärkung'}) · ${fmtTime(m.left)}</div>`).join('');
    return this.head('Seekarte (offline)') + this.tideBox() + this.homeTroops(c, s, away) +
      `<div class="inf">Gebiete: <b>${owned}/${s.terr.length}</b></div>${marches}
       <div class="sm">Offline kämpfst du gegen Piraten. Für Mitspieler und Allianzen: Menü → Online-Konto.</div>
       <div class="btns"><button class="btn ghost" data-a="reports">Berichte (${s.reports.length})</button></div>`;
  }

  terrHtml() {
    const c = this.c, s = c.s, o = this.o, f = this.form, att = Math.round(armyStr(f, null, true));
    if (this.sea.isOnline) {
      const t = o.world.territories.find((x) => x.id === this.mapSel.id);
      if (!t) return this.head('Gebiet') + '<div class="sm">Nicht gefunden.</div>';
      const me = o.me, mine = t.owner === me.id, ally = !mine && t.owner && me.alliance_id && t.owner_alliance === me.alliance_id;
      const dist = Math.hypot(t.x - me.x, t.y - me.y), tt = (20 + dist * 22) * speedFactor(f);
      let out = this.head(t.name) + `<div class="desc">${t.kind} · Bonus <b>+${t.pct} % ${RES[t.res]}</b> · Fahrt ${fmtTime(tt)}</div>`;
      if (mine) {
        out += `<div class="inf">🚩 Dein Gebiet. Besatzung: ${troopStr(t.gu || zeroU())}</div><div class="sm">Andere Spieler können es dir abnehmen – Schildwachen verteidigen am besten, Schleuderer kaum.</div>`;
        out += `<div class="sub2">Verstärkung schicken</div>` + this.troopForm('Verstärken', false, this.busy ? 'Bitte warten …' : null);
        if (uSum(t.gu || zeroU()) > 0) out += '<div class="btns"><button class="btn ghost" data-a="withdraw">Besatzung abziehen</button></div>';
        return out;
      }
      if (ally) return out + `<div class="inf">🚩 Gehört deinem Verbündeten <b>${t.owner_name}</b>.</div>`;
      if (t.kind === 'Leuchtturm') out += this.lhInfo();
      out += t.owner ? `<div class="inf">🚩 Gehört <b>${t.owner_name}</b> – Besatzung unbekannt</div>` : `<div class="inf">☠ Piraten, Stärke etwa <b>${t.strength}</b></div>`;
      const lhClosed = t.kind === 'Leuchtturm' && o.lh && !o.lh.open;
      out += `<div class="sub2">Angriffstrupp</div>` + this.troopForm('Angreifen!', true, lhClosed ? 'Nur am Wochenende angreifbar' : null, this.attackInfo(Math.round(armyStr(f, null, true, c.tideState(tt))), t.owner ? null : t.strength) + `<div class="sm">${this.tideLine(tt)}</div>`);
      out += this.extraActions(lhClosed);
      return out;
    }
    const t = s.terr[this.mapSel.id];
    if (!t) return this.head('Gebiet') + '<div class="sm">Lade …</div>';
    const tt = travelTime(t) * speedFactor(f);
    let out = this.head(t.name) + `<div class="desc">${t.kind} · Ring ${t.ring} · Bonus <b>+${t.pct} % ${RES[t.res]}</b> · Fahrt ${fmtTime(tt)}</div>`;
    out += t.owner === 1 ? `<div class="inf">🚩 Dein Gebiet. Besatzung: ${troopStr(t.gu)}</div>
        <div class="sm">Piraten versuchen ab und zu, Gebiete zurückzuerobern. Schildwachen verteidigen besonders gut.</div>` : `<div class="inf">☠ Piraten, Stärke etwa <b>${Math.round(t.pirates)}</b></div>`;
    out += `<div class="sub2">${t.owner === 1 ? 'Verstärkung schicken' : 'Angriffstrupp'}</div>`;
    out += this.troopForm(t.owner === 1 ? 'Verstärken' : 'Angreifen!', t.owner !== 1, c.attackBlocker(t.id, f), t.owner === 1 ? '' : this.attackInfo(Math.round(armyStr(f, null, true, c.tideState(tt))), t.pirates) + `<div class="sm">${this.tideLine(tt)}</div>`);
    if (t.owner !== 1) out += this.extraActions(true);
    if (t.owner === 1 && uSum(t.gu) > 0) out += '<div class="btns"><button class="btn ghost" data-a="withdraw">Besatzung abziehen</button></div>';
    return out;
  }

  /// Späher und Sammelangriff (Sammelangriff nur online in einer Allianz)
  extraActions(noRally) {
    const c = this.c, o = this.o, blk = c.scoutBlocker();
    let out = `<div class="btns"><button class="btn ghost" data-a="scout" ${blk || this.busy ? 'disabled' : ''}>🔭 Späher (40 🦪 20 ⚙️)</button></div>`;
    if (blk) out += `<div class="sm">${blk}</div>`;
    if (!noRally && this.sea.isOnline && o.me && o.me.alliance_id) {
      out += `<div class="sub2">⚔️ Allianz-Sammelangriff</div><div class="sm">Starte mit dem oben gewählten Trupp – deine Verbündeten können bis zum Start Krieger dazugeben. Alle ziehen gemeinsam los.</div>
        <div class="btns">${[2, 5, 10].map((w) => `<button class="btn ghost" data-a="rally" data-w="${w}" ${uSum(this.form) && !this.busy ? '' : 'disabled'}>in ${w} Min.</button>`).join('')}</div>`;
    }
    return out;
  }
  lhInfo() {
    const lh = this.o.lh || {}, nx = lh.next ? new Date(lh.next) : null;
    return `<div class="inf">🗼 <b>Leuchtturm-Krieg</b>: Angriffe nur Samstag bis Sonntag 20 Uhr. Wer ihn dann hält, bekommt für sich und seine Allianz <b>eine Woche +20 % Produktion</b>.</div>
      <div class="sm">${lh.open ? '<b style="color:#ff9a5a">Jetzt ist Kampfzeit!</b>' : 'Gerade Ruhezeit.'}${nx ? ' · Wertung ' + nx.toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}${lh.holder ? ` · Bonus aktuell: <b>${lh.holder}</b>` : ''}</div>`;
  }

  playerHtml() {
    const o = this.o, f = this.form, att = Math.round(armyStr(f, null, true));
    const p = o.world.players.find((x) => x.id === this.mapSel.id);
    if (!p) return this.head('Stadt') + '<div class="sm">Nicht gefunden.</div>';
    const me = o.me, ally = me.alliance_id && p.alliance_id === me.alliance_id;
    const dist = Math.hypot(p.x - me.x, p.y - me.y), tt = (20 + dist * 22) * speedFactor(f);
    let out = this.head(`🏰 ${p.tag ? '[' + p.tag + '] ' : ''}${p.name}`) +
      `<div class="desc">Macht ⚔ <b>${p.power}</b> · Gezeitenturm Stufe ${p.tower} · ${p.online ? '<span style="color:#8ef0a0">online</span>' : 'offline'} · Fahrt ${fmtTime(tt)}</div>`;
    if (ally) return out + '<div class="inf">Verbündeter – gemeinsam seid ihr stärker!</div>';
    if (p.shield) return out + '<div class="inf">🛡 Diese Stadt steht unter Schutz (neue Spieler 12 Std., nach einer Plünderung 30 Min.).</div>';
    out += '<div class="sm">Siegst du, plündern deine Truppen bis zu 20 % der Vorräte (Wattläufer tragen am meisten, Schleuderer halbieren Mauern und Türme). Wer angreift, verliert seinen eigenen Schutz.</div>';
    out += `<div class="sub2">Angriffstrupp</div>` + this.troopForm('Stadt angreifen!', true, null, this.attackInfo(Math.round(armyStr(f, null, true, this.c.tideState(tt))), null) + `<div class="sm">${this.tideLine(tt)}</div>`);
    out += this.extraActions(false);
    return out;
  }

  reportsHtml() {
    if (this.o.active && this.o.reports) {
      const rows = this.o.reports.length ? this.o.reports.map((r) => {
        const d = new Date(r.at);
        return `<div class="row rep ${r.win === true ? 'win' : r.win === false ? 'loss' : ''}"><div class="ri"><div class="sm">${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>${r.text}</div></div>`;
      }).join('') : '<div class="sm">Noch keine Kämpfe.</div>';
      return this.head('Kampfberichte') + rows;
    }
    const s = this.c.s;
    const rows = s.reports.length ? s.reports.map((r) => `<div class="row rep ${r.win ? 'win' : 'loss'}"><div class="ri"><div class="sm">Tag ${r.day} · ${clock(r.time)}</div>${r.text}</div></div>`).join('') : '<div class="sm">Noch keine Kämpfe.</div>';
    return this.head('Kampfberichte') + rows;
  }

  // ---------- Allianz ----------
  allyHtml() {
    const o = this.o;
    if (!o.active) return this.head('Allianz') + '<div class="desc">Allianzen gibt es im Online-Spiel. Erstelle dir ein Konto – nur ein Spielername ist nötig.</div><div class="btns"><button class="btn" data-a="goOnline">Online gehen</button></div>';
    const A = o.alliances;
    if (!A) return this.head('Allianz') + '<div class="inf">Lade …</div>';
    const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    if (!o.me || !o.me.alliance_id) {
      const list = (A.list || []).map((a) => `<div class="row"><div class="ri"><b>[${esc(a.tag)}] ${esc(a.name)}</b><div class="sm">${a.members}/20 Mitglieder · Macht ${a.power}</div></div>
        <button class="btn sm2" data-a="allyJoin" data-id="${a.id}" ${a.members >= 20 || this.busy ? 'disabled' : ''}>Beitreten</button></div>`).join('') || '<div class="sm">Noch keine Allianzen – gründe die erste!</div>';
      return this.head('Allianz') +
        `<div class="desc">Verbündete greifen sich nicht an, sehen ihre Gebiete und haben einen gemeinsamen Chat.</div>
         <div class="sub2">Neue Allianz gründen</div>
         <div class="form"><input id="alName" maxlength="24" placeholder="Name (3–24 Zeichen)"><input id="alTag" maxlength="4" placeholder="Kürzel" class="short"></div>
         <div class="btns"><button class="btn" data-a="allyCreate" ${this.busy ? 'disabled' : ''}>Gründen</button></div>
         <div class="sub2">Allianzen</div>${list}`;
    }
    const mine = (A.list || []).find((a) => a.id === o.me.alliance_id) || { name: 'Allianz', tag: '?', leader: null };
    const leader = mine.leader === o.me.id;
    const members = (A.members || []).map((m) => `<div class="row"><div class="ri">${m.id === mine.leader ? '👑 ' : ''}<b>${esc(m.name)}</b> <span class="sh">⚔ ${m.power}${m.online ? ' · online' : ''}</span></div>
      ${leader && m.id !== o.me.id ? `<button class="btn sm2 ghost" data-a="kick" data-id="${m.id}">Entfernen</button>` : ''}</div>`).join('');
    const chat = o.chat.slice(-30).map((m) => `<div class="msg ${m.me ? 'me' : ''} ${m.name === 'System' ? 'sys' : ''}"><b>${esc(m.name)}</b> ${esc(m.text)}</div>`).join('') || '<div class="sm">Noch keine Nachrichten.</div>';
    if (this.rallySel) {
      const r = (o.rallies || []).find((x) => x.id === this.rallySel);
      if (!r || r.status !== 'open') this.rallySel = null;
      else return this.head(`⚔️ Sammelangriff auf ${esc(r.target)}`) + `<div class="desc">Start in ${fmtTime(Math.max(0, (Date.parse(r.launch_at) - o.serverNow()) / 1000))} · Anführer ${esc(r.leader)}</div>`
        + this.troopForm('Mitmachen', true, null, '', 'rallyJoin') + '<div class="btns"><button class="btn ghost" data-a="rallyBack">Zurück</button></div>';
    }
    const rl = (o.rallies || []).map((r) => {
      const tot = (r.parts || []).reduce((acc, p) => acc.map((v, i) => v + (p.u[i] || 0)), zeroU());
      const left = r.status === 'open' ? (Date.parse(r.launch_at) - o.serverNow()) / 1000 : r.arrive ? (Date.parse(r.arrive) - o.serverNow()) / 1000 : 0;
      return `<div class="row"><div class="ri"><b>⚔️ ${esc(r.target)}</b> <span class="sh">von ${esc(r.leader)} · ${(r.parts || []).length} dabei</span>
        <div class="sm">${troopStr(tot)} · ${r.status === 'open' ? 'Start in ' : 'Ankunft in '}${fmtTime(Math.max(0, left))}</div></div>
        ${r.status === 'open' ? `<button class="btn sm2" data-a="rallyPick" data-id="${r.id}">Mitmachen</button>` : ''}</div>`;
    }).join('');
    return this.head(`[${esc(mine.tag)}] ${esc(mine.name)}`) +
      (rl ? `<div class="sub2">⚔️ Sammelangriffe</div>${rl}` : '<div class="sm">Sammelangriff starten: Ziel auf der 🗺️ Karte antippen, Trupp wählen, „Allianz-Sammelangriff“.</div>') +
      `<div class="sub2">Chat</div><div class="chat" id="chatBox">${chat}</div>
       <div class="form"><input id="chatIn" maxlength="200" placeholder="Nachricht an die Allianz …"><button class="btn sm2" data-a="chat">Senden</button></div>
       <div class="sub2">Mitglieder (${(A.members || []).length}/20)</div>${members}
       <div class="btns"><button class="btn ${this.confirm === 'leave' ? 'danger' : 'ghost'}" data-a="allyLeave">${this.confirm === 'leave' ? '<b>Wirklich verlassen?</b>' : 'Allianz verlassen'}</button></div>`;
  }

  rankHtml() {
    const r = this.o.ranking;
    if (!this.o.active) return this.head('Rangliste') + '<div class="desc">Die Rangliste gibt es im Online-Spiel.</div>';
    if (!r) return this.head('Rangliste') + '<div class="inf">Lade …</div>';
    const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    return this.head('Rangliste') + r.map((p, i) => `<div class="row ${p.me ? 'meRow' : ''}"><div class="ri"><b>${i + 1}. ${p.tag ? '[' + esc(p.tag) + '] ' : ''}${esc(p.name)}</b><div class="sm">Macht ⚔ ${p.power} · ${p.terr} Gebiete</div></div></div>`).join('');
  }

  accountHtml() {
    const o = this.o;
    if (!o.active) return this.head('Online-Konto') + '<div class="desc">Du spielst gerade offline. Mit einem Konto spielst du mit Freunden: Allianzen, Angriffe, gemeinsame Seekarte.</div><div class="btns"><button class="btn" data-a="goOnline">Online gehen</button></div>';
    return this.head('Online-Konto') +
      `<div class="inf">Spielername: <b>${o.name || '…'}</b></div>
       <div class="inf">Status: <b>${o.status}</b>${o.error ? ` <span class="warn">${o.error}</span>` : ''}</div>
       <div class="desc">Mit dem <b>Umzugscode</b> holst du dein Konto auf ein neues Handy. Gib ihn niemandem – wer ihn hat, kann mit deiner Stadt spielen.</div>
       ${this.confirm === 'code' ? `<div class="code">${o.token}</div>` : ''}
       <div class="btns col"><button class="btn ghost" data-a="showCode">${this.confirm === 'code' ? 'Code verbergen' : 'Umzugscode anzeigen'}</button>
       <button class="btn ${this.confirm === 'logout' ? 'danger' : 'ghost'}" data-a="logout">${this.confirm === 'logout' ? '<b>Wirklich abmelden? Ohne Umzugscode ist das Konto weg</b>' : 'Abmelden'}</button></div>`;
  }

  menuHtml() {
    const tab = this.menuTab === 'codes' ? 'codes' : 'settings';
    const bar = `<div class="tabs two">${[['settings', '⚙️', 'Einstellungen'], ['codes', '🎁', 'Codes']].map(([k, ic, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-a="mtab" data-t="${k}"><span>${ic}</span>${l}</button>`).join('')}</div>`;
    return this.head('Menü') + bar + `<div class="tabbody">${tab === 'codes' ? this.codesHtml() : this.settingsHtml()}</div>`;
  }

  codesHtml() {
    const o = this.o;
    if (!o.active) return '<div class="desc">Geschenk-Codes gibt es nur mit Online-Konto.</div><div class="btns"><button class="btn" data-a="goOnline">Online gehen</button></div>';
    let out = `<div class="sub2">Code einlösen</div>
      <div class="desc">Codes gibt es vom Spielleiter, zum Beispiel in eurer Gruppe. Jeder Code geht einmal pro Spieler.</div>
      <div class="form"><input id="codeIn" maxlength="16" placeholder="Code eingeben" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase"></div>
      <div class="btns"><button class="btn" data-a="redeem" ${this.busy ? 'disabled' : ''}><b>🎁 Einlösen</b></button></div>`;
    if (this.codeMsg) out += `<div class="${this.codeMsg.ok ? 'inf' : 'warn'}" style="margin-top:8px">${this.codeMsg.text}</div>`;
    if (o.me && o.me.is_admin) {
      const f = (id, ph, w) => `<input class="n" id="${id}" type="number" min="0" inputmode="numeric" placeholder="${ph}" style="flex:1 1 ${w || 31}%">`;
      out += `<div class="sub2" style="margin-top:14px">👑 Spielleiter: Code erstellen</div>
        <div class="form"><input id="ncCode" maxlength="16" placeholder="Code, z. B. FLUT26" autocomplete="off" style="text-transform:uppercase;width:62%"><button class="btn ghost" data-a="codeRandom" style="width:34%">Zufall</button></div>
        <div class="sm">Rohstoffe</div>
        <div class="form" style="flex-wrap:wrap;gap:4px">${f('ncR0', '🪵 Holz', 23)}${f('ncR1', '🦪 Muscheln', 23)}${f('ncR2', '💧 Wasser', 23)}${f('ncR3', '⚙️ Metall', 23)}</div>
        <div class="sm">Krieger</div>
        <div class="form" style="flex-wrap:wrap;gap:4px">${UNITS.map((u, k) => f('ncU' + k, u.ic + ' ' + u.name.slice(0, 6), 18)).join('')}</div>
        <div class="form" style="gap:4px">${f('ncDays', 'gültig Tage (1)', 48)}${f('ncMax', 'max. Spieler (∞)', 48)}</div>
        <div class="btns"><button class="btn" data-a="codeSave" ${this.busy ? 'disabled' : ''}><b>Code speichern</b></button></div>`;
      const list = o.codes || [];
      out += `<div class="sub2" style="margin-top:12px">Deine Codes</div>` + (list.length ? list.map((c) => `<div class="row"><div class="ri"><b style="letter-spacing:.05em">${c.code}</b> <span class="sh">${c.active ? '<span style="color:#8ef0a0">aktiv</span>' : 'abgelaufen'} · ${c.uses}${c.max ? '/' + c.max : ''}× eingelöst</span>
        <div class="sm">${c.text || '–'}${c.until ? ' · bis ' + new Date(c.until).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ' · unbegrenzt'}</div></div>
        <button class="btn sm2 ${this.confirm === 'del' + c.code ? 'danger' : 'ghost'}" data-a="codeDel" data-c="${c.code}">${this.confirm === 'del' + c.code ? 'Löschen?' : '🗑'}</button></div>`).join('') : '<div class="sm">Noch keine Codes.</div>');
    }
    return out;
  }

  ttabLoad() {
    if (this.troopTab === 'rank') this.o.loadRanking();
    if (this.troopTab === 'reports' && this.o.active) this.o.sync();
  }

  rewardStr(res, u) {
    const parts = [];
    (res || []).forEach((v, i) => v && parts.push(`${RES_IC[i]} ${v}`));
    (u || []).forEach((v, i) => v && parts.push(`${UNITS[i].ic} ${v}`));
    return parts.join(' · ');
  }

  giftHtml() {
    const c = this.c, tab = this.giftTab || 'daily';
    const ds = dailyState(c), qs = questsToday(c);
    const tabs = [['daily', '📅', 'Täglich' + (ds.can ? ' •' : '')], ['quests', '✅', 'Aufgaben' + (qs.some((q) => !q.done && q.have >= q.n) ? ' •' : '')], ['ach', '🏅', `Erfolge ${achCount(c)}/${ACH.length}`]];
    let out = this.head('Belohnungen') + `<div class="tabs" style="grid-template-columns:repeat(3,1fr)">${tabs.map(([k, ic, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-a="gtab" data-t="${k}"><span>${ic}</span>${l}</button>`).join('')}</div><div class="tabbody">`;
    if (tab === 'daily') {
      out += '<div class="desc">Schau jeden Tag vorbei! Wer einen Tag auslässt, fängt wieder bei Tag 1 an. Tag 7 ist der große Schatz.</div><div class="daily">';
      for (let d = 0; d < 7; d++) {
        const r = dailyReward(c, d), st = d < ds.day || (!ds.can && d === ds.day) ? 'got' : d === ds.day && ds.can ? 'now' : '';
        out += `<div class="dd ${st} ${r.big ? 'big' : ''}"><b>Tag ${d + 1}</b><div class="sm">${this.rewardStr(r.res, r.u)}</div>${st === 'got' ? '<div>✔</div>' : ''}</div>`;
      }
      out += `</div><div class="btns"><button class="btn" data-a="claimDaily" ${ds.can ? '' : 'disabled'}><b>${ds.can ? `🎁 Tag ${ds.day + 1} abholen` : 'Morgen wieder!'}</b></button></div>`;
    } else if (tab === 'quests') {
      out += '<div class="desc">Jeden Tag 3 neue Aufgaben.</div>';
      qs.forEach((q, k) => {
        out += `<div class="row"><div class="ri"><div><b>${q.done ? '✔ ' : ''}${q.text}</b></div><div class="sm">${Math.min(q.have, q.n)}/${q.n} · Belohnung ${this.rewardStr(q.rw)}</div>
          <div class="bar"><div style="width:${Math.round(100 * Math.min(1, q.have / q.n))}%"></div></div></div>
          <button class="btn sm2" data-a="claimQuest" data-k="${k}" ${q.done || q.have < q.n ? 'disabled' : ''}>${q.done ? 'Erledigt' : 'Abholen'}</button></div>`;
      });
    } else {
      const got = c.s.ach || {};
      out += '<div class="achs">' + ACH.map((a) => `<div class="ach ${got[a.id] ? 'on' : ''}"><span>${a.ic}</span><b>${a.name}</b><div class="sm">${a.text}</div></div>`).join('') + '</div>';
      if (this.o.active) out += '<div class="sm">Deine Erfolge sehen auch andere Spieler in der Rangliste.</div>';
    }
    return out + '</div>';
  }

  traderHtml() {
    const c = this.c, tr = c.s.trader;
    if (!tr || tr.left <= 0) return this.head('⛵ Händlerschiff') + `<div class="desc">Gerade liegt kein Schiff am Steg. Nächstes in etwa ${fmtTime(tr ? tr.next : 60)}.</div>`;
    let out = this.head('⛵ Händlerschiff') + `<div class="desc">Der Händler legt in <b>${fmtTime(tr.left)}</b> wieder ab. Jedes Angebot gilt einmal.</div>`;
    tr.offers.forEach((o, k) => {
      const get = o.unit !== undefined ? `${UNITS[o.unit].ic} ${o.rn} ${UNITS[o.unit].name}` : `${RES_IC[o.get]} ${o.rn} ${RES[o.get]}`;
      out += `<div class="row"><div class="ri"><b>${RES_IC[o.give]} ${o.gn} ${RES[o.give]}</b> → <b>${get}</b></div>
        <button class="btn sm2" data-a="trade" data-k="${k}" ${o.used || c.s.res[o.give] < o.gn ? 'disabled' : ''}>${o.used ? '✔' : 'Tauschen'}</button></div>`;
    });
    return out;
  }

  troopsHtml() {
    const tab = this.troopTab || 'truppen';
    const tabs = [['truppen', '⚔️', 'Truppen'], ['reports', '📜', 'Berichte'], ['rank', '🏆', 'Rangliste']];
    const bar = `<div class="tabs" style="grid-template-columns:repeat(3,1fr)">${tabs.map(([k, ic, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-a="ttab" data-t="${k}"><span>${ic}</span>${l}</button>`).join('')}</div>`;
    const strip = (x) => x.replace(/^<div class="ph">[\s\S]*?<\/button><\/div>/, '');
    const body = tab === 'reports' ? strip(this.reportsHtml()) : tab === 'rank' ? strip(this.rankHtml()) : this.troopsTabHtml();
    return this.head('Truppen') + bar + `<div class="tabbody">${body}</div>`;
  }

  freePlotQueue(t) {
    const c = this.c, s = c.s, q = s.bq || [];
    for (let i = 1; i < s.plots.length; i++) if (s.plots[i].type < 0 && !q.some((x) => x.plot === i)) { const b = c.buildBlocker(i, t); if (!b || QOK.includes(b)) return i; }
    return -1;
  }

  freePlotFor(t) {
    const c = this.c, s = c.s;
    const order = [];
    for (let i = 1; i < s.plots.length; i++) order.push(i);
    for (const i of order) if (s.plots[i].type < 0 && !c.buildBlocker(i, t)) return i;
    return -1;
  }

  buildingsHtml() {
    const c = this.c, tab = this.buildTab || 'mine';
    const bar = `<div class="tabs two">${[['mine', '🏘️', 'Meine Gebäude'], ['new', '➕', 'Neu bauen']].map(([k, ic, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-a="btab" data-t="${k}"><span>${ic}</span>${l}</button>`).join('')}</div>`;
    let body;
    if (tab === 'mine') body = this.cityOverviewHtml();
    else {
      const types = [...CITY_TYPES, T.MAUER, T.ABWEHR, T.DAMM];
      const groups = [['Rohstoffe', [T.TREIBHOLZ, T.MUSCHEL, T.REGEN, T.TAUCHER]], ['Wohnen & Versorgung', [T.HAUS, T.HEILER, T.RAUCH, T.KUECHE, T.LAGER]], ['Militär', [T.KASERNE, T.HARPHOF, T.WACHSTUBE, T.ENTERHALLE, T.SCHLEUDER, T.WATTHUETTE, T.LAZARETT]], ['Verteidigung', [T.WACHTURM, T.MAUER, T.ABWEHR]], ['Schutz vor der Flut', [T.DAMM]]];
      body = `<div class="sm">Bautrupps: <b>${c.activeBuilds}/2</b> beschäftigt. Der Platz wird automatisch gewählt.</div>`;
      for (const [title, list] of groups) {
        body += `<div class="sub2">${title}</div>`;
        for (const t of list) {
          if (!types.includes(t)) continue;
          const d = DEFS[t], free = this.freePlotFor(t);
          const slots = LAYOUT.filter((x) => x === t).length, have = c.s.plots.filter((p) => p.type === t).length;
          let why = '';
          if (free < 0) {
            if (c.activeBuilds >= 2) why = 'Alle Bautrupps beschäftigt';
            else if (!c.canAfford(costFor(t, 1))) why = '';
            else if (t === T.MAUER) why = c.levels(T.MAUER) > 0 || c.s.plots[WALL].type >= 0 ? 'Schon gebaut – Ausbau unter „Meine Gebäude“' : 'Nicht möglich';
            else if (t === T.DAMM) why = c.s.plots[DAMM].type >= 0 ? 'Schon gebaut – Ausbau unter „Meine Gebäude“' : 'Nicht möglich';
            else if (t === T.ABWEHR && c.levels(T.MAUER) <= 0) why = 'Erst die Festungsmauer bauen';
            else if (have >= slots) why = 'Alle Plätze bebaut – baue die vorhandenen aus';
            else why = c.towerLevel < OUTER_LEVEL ? `Nächster Platz ab Gezeitenturm Stufe ${OUTER_LEVEL} bzw. wenn die Warft wächst` : 'Nächster Platz wird frei, wenn die Warft wächst';
          }
          body += `<div class="row"><div class="ri"><div><b>${B_IC[t]} ${d.name}</b> <span class="sh">${have}/${slots} · ${d.short}</span></div>
            <div class="sm">${this.costStr(costFor(t, 1))} · ${fmtTime(buildTime(t, 1))}</div>${why ? `<div class="warn">${why}</div>` : ''}</div>
            ${free < 0 && this.freePlotQueue(t) >= 0 && (c.s.bq || []).length < MAX_QUEUE ? `<button class="btn sm2 ghost" data-a="qbuild" data-v="${t}">🕒 Später</button>` : `<button class="btn sm2" data-a="quickbuild" data-v="${t}" ${free < 0 ? 'disabled' : ''}>Bauen</button>`}</div>`;
        }
      }
    }
    return `<div class="ph"><div class="pt">🏗️ Gebäude</div><button class="x" data-a="close">✕</button></div>${bar}<div class="tabbody">${body}</div>`;
  }

  cityOverviewHtml() {
    const c = this.c, s = c.s;
    const groups = [
      ['Herz der Stadt', [T.TURM]],
      ['Rohstoffe', [T.TREIBHOLZ, T.MUSCHEL, T.REGEN, T.TAUCHER]],
      ['Wohnen & Versorgung', [T.HAUS, T.HEILER, T.RAUCH, T.KUECHE, T.LAGER]],
      ['Militär', [T.KASERNE, T.HARPHOF, T.WACHSTUBE, T.ENTERHALLE, T.SCHLEUDER, T.WATTHUETTE, T.LAZARETT]],
      ['Verteidigung', [T.WACHTURM, T.MAUER, T.ABWEHR]],
      ['Schutz vor der Flut', [T.DAMM]],
    ];
    let out = `<div class="sm">Bautrupps: <b>${c.activeBuilds}/2</b> beschäftigt · Gelände ${Math.round(c.areaRadius)} m · freie Bewohner ${c.freeVillagers}</div>`;
    for (const [title, types] of groups) {
      const rows = [];
      s.plots.forEach((p, i) => {
        if (p.type < 0 || !types.includes(p.type)) return;
        const blk = c.upgradeBlocker(i);
        const state = p.buildLeft > 0 ? `<span class="sh">🔨 ${fmtTime(p.buildLeft)}</span>` : '';
        rows.push(`<div class="row"><div class="ri"><b>${B_IC[p.type]} ${DEFS[p.type].name}</b> <i class="lv">${p.level || '–'}</i> ${state}
          ${p.buildLeft <= 0 && p.level < MAX_LEVEL ? `<div class="sm">→ ${p.level + 1}: ${this.costStr(costFor(p.type, p.level + 1))}</div>` : ''}</div>
          <button class="btn sm2 ghost" data-a="goto" data-i="${i}">Zeigen</button>
          ${p.buildLeft <= 0 && p.level < MAX_LEVEL ? (QOK.includes(blk) && (c.s.bq || []).length < MAX_QUEUE && !(c.s.bq || []).some((q) => q.plot === i) ? `<button class="btn sm2 ghost" data-a="qup" data-i="${i}">🕒</button>` : `<button class="btn sm2" data-a="upq" data-i="${i}" ${blk ? 'disabled' : ''}>⬆</button>`) : ''}</div>`);
      });
      if (rows.length) out += `<div class="sub2">${title}</div>` + rows.join('');
    }
    const free = s.plots.findIndex((p, i) => i > 0 && i < WALL && p.type < 0 && !c.buildBlocker(i, LAYOUT[i])?.startsWith('Gelände') && !c.buildBlocker(i, LAYOUT[i])?.startsWith('Äußerer'));
    out += `<div class="sm" style="margin-top:10px">Neu bauen: Reiter „Neu bauen“ oder in der Stadt auf eine freie Plattform tippen.${free > 0 ? '' : ' Gerade ist kein Platz frei.'}</div>`;
    if (free > 0) out += `<div class="btns"><button class="btn ghost" data-a="goto" data-i="${free}">Freien Bauplatz zeigen</button></div>`;
    return out;
  }

  troopsTabHtml() {
    const c = this.c, s = c.s, away = c.troopsAway;
    let out = `<div class="inf">Verteidigung der Stadt: <b>${c.defense}</b> · Macht ⚔ <b>${c.power}</b></div>
      <div class="inf">Unterwegs/Besatzung: ${troopStr(away)}</div>`;
    if (c.raidIn !== null) out += `<div class="sm">Nächster Piratenüberfall in etwa ${fmtTime(c.raidIn)}</div>`;
    out += this.tideBox();
    if (uSum(s.wounded || zeroU())) out += `<div class="inf">🩹 Im Lazarett: ${troopStr(s.wounded)} – werden nach und nach gesund.</div>`;
    else if (c.levels(T.LAZARETT) <= 0) out += '<div class="sm">Tipp: Ein 🩹 Lazarett rettet einen Teil der gefallenen Krieger.</div>';
    if (c.levels(T.KASERNE) > 0) out += this.barracksHtml();
    else out += `<div class="inf">Zu Hause: ${troopStr(s.troops)}</div><div class="desc">Für Truppen brauchst du die <b>Kaserne</b> und für jeden Krieger seine <b>Ausbildungsstätte</b>. Baue sie unter <b>🏗️ Gebäude → Neu bauen</b>.</div>`;
    out += `<div class="sm" style="margin-top:8px">Stärken: 🔱 schlägt 🗡️ · 🛡️ schlägt 🔱 · 🗡️ schlägt 🪨 und 🏃 · 🪨 schlägt 🛡️ und Mauern. Mische deine Truppen passend zum Gegner!<br>🌊 Bei Ebbe sind Wattläufer stark und Enterer schwächer, bei Flut glänzen Enterer und Harpuniere. Plane deine Ankunftszeit!</div>`;
    out += '<div class="btns"><button class="btn" data-a="map">🗺️ Seekarte öffnen</button></div>';
    return out;
  }

  settingsHtml() {
    const g = this.g, o = this.o;
    const acc = !o.active
      ? `<div class="inf">Online-Konto: <b>offline</b></div><div class="btns"><button class="btn" data-a="goOnline">Online gehen</button></div>`
      : `<div class="inf">Online als <b>${o.name || '…'}</b> · ${o.status === 'online' ? '<span style="color:#8ef0a0">verbunden</span>' : '<span style="color:#ffb070">' + o.status + '</span>'}</div>
         ${this.confirm === 'code' ? `<div class="code">${o.token}</div><div class="sm">Gib den Code niemandem – damit holst du dein Konto auf ein neues Handy.</div>` : ''}
         <div class="btns"><button class="btn ghost" data-a="showCode">${this.confirm === 'code' ? 'Code verbergen' : 'Umzugscode'}</button>
         <button class="btn ${this.confirm === 'logout' ? 'danger' : 'ghost'}" data-a="logout">${this.confirm === 'logout' ? '<b>Wirklich abmelden?</b>' : 'Abmelden'}</button></div>`;
    return `<div class="sub2">Grafik</div>
       <div class="inf">${g.auto ? 'Automatisch → ' : ''}<b>${TIERS[g.tier]}</b> · ${g.res[0]} × ${g.res[1]} · ${Math.round(g.fpsShown)} FPS</div>
       <div class="btns"><button class="btn" data-a="gfx">Grafik umschalten</button></div>
       <div class="sub2">Konto</div>${acc}
       <div class="sub2">Spielstand</div>
       <div class="btns"><button class="btn ghost" data-a="save">Speichern</button>
       <button class="btn ${this.confirm === 'new' ? 'danger' : 'ghost'}" data-a="new">${this.confirm === 'new' ? '<b>Wirklich neu anfangen?</b>' : 'Neues Spiel'}</button></div>
       <div class="sm" style="margin-top:10px">Version ${this.version.name}${this.version.channel === 'public' ? '' : ' (Testversion)'} · Updates werden beim Start automatisch geladen.</div>`;
  }

}
