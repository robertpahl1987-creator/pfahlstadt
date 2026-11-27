// Verbindung zum Mehrspieler-Server (Supabase). Alle Spielregeln laufen auf dem Server.
import { RES, uAdd, zeroU, uSum } from './game.js';
import { questEvent } from './features.js';

export const SERVER = 'https://qoatkmjobrlnqadsfmhs.supabase.co';
const KEY = 'sb_publishable_J84AUIbZnb_CZuak5SiKRg_f5nLkn1w';

const ERR = {
  NAME_VERGEBEN: 'Dieser Name ist schon vergeben.',
  NAME_LAENGE: 'Der Name braucht 3 bis 16 Zeichen.',
  TAG_LAENGE: 'Das Kürzel braucht 2 bis 4 Zeichen.',
  NICHT_ANGEMELDET: 'Anmeldung ungültig. Bitte neu anmelden oder Umzugscode prüfen.',
  KEINE_TRUPPEN: 'Keine Truppen ausgewählt.',
  ZU_WENIG_TRUPPEN: 'So viele Truppen hast du nicht zu Hause.',
  ZU_VIELE_MAERSCHE: 'Höchstens 5 Trupps gleichzeitig unterwegs.',
  VERBUENDET: 'Verbündete kann man nicht angreifen.',
  GESCHUETZT: 'Diese Stadt steht gerade unter Schutz.',
  UNBEKANNT: 'Ziel nicht gefunden.',
  SCHON_IN_ALLIANZ: 'Du bist schon in einer Allianz.',
  ALLIANZ_VERGEBEN: 'Name oder Kürzel ist schon vergeben.',
  ALLIANZ_VOLL: 'Diese Allianz ist voll (max. 20).',
  KEINE_ALLIANZ: 'Du bist in keiner Allianz.',
  NICHT_ANFUEHRER: 'Nur der Anführer darf das.',
  NICHT_MOEGLICH: 'Das geht gerade nicht.',
  TEXT_LAENGE: 'Nachricht: 1 bis 200 Zeichen.',
  ZU_SCHNELL: 'Bitte kurz warten.',
  KEIN_ADMIN: 'Nur der Spielleiter darf Codes erstellen.',
  CODE_FORMAT: 'Code: 4 bis 16 Buchstaben oder Zahlen, ohne Leerzeichen.',
  LEER: 'Bitte eine Belohnung eintragen.',
  UNGUELTIG: 'Ungültige Eingabe.',
  GESPERRT: 'Dieses Konto wurde vom Spielleiter gesperrt.',
  HILFE_LIMIT: 'Höchstens 20.000 Rohstoffe Hilfe pro Stunde.',
  ZU_WENIG: 'So viel hast du nicht.',
  NUR_WOCHENENDE: 'Um den Großen Leuchtturm wird nur am Wochenende gekämpft (Samstag 0 Uhr bis Sonntag 20 Uhr).',
};

export class Online {
  constructor(colony) {
    this.c = colony;
    this.token = localStorage.getItem('pf_token');
    this.name = localStorage.getItem('pf_name');
    this.status = this.token ? 'verbinde' : 'aus';
    this.error = '';
    this.queue = Promise.resolve();
    this.me = null; this.world = null; this.marches = []; this.reports = []; this.owned = [];
    this.incoming = 0; this.offset = 0;
    this.lastReport = +(localStorage.getItem('pf_lastrep') || 0);
    this.chat = []; this.chatAfter = 0; this.alliances = null; this.ranking = null;
    this.t = { sync: 99, world: 99, chat: 99, all: 99 };
    this.wantWorld = false; this.wantChat = false;
  }

  get active() { return !!this.token; }
  serverNow() { return Date.now() - this.offset; }

  /// Aufrufe nacheinander ausführen; args als Funktion = erst beim Ausführen auswerten
  call(fn, args) {
    const run = async () => {
      const body = JSON.stringify(typeof args === 'function' ? args() : args);
      const r = await fetch(`${SERVER}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body });
      const txt = await r.text();
      let data = null;
      try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }
      if (!r.ok) {
        const code = (data && data.message) || 'FEHLER';
        const e = new Error(ERR[code] || 'Serverfehler: ' + code);
        e.code = code;
        throw e;
      }
      return data;
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => {});
    return p;
  }

  newToken() {
    const a = new Uint8Array(24);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  saveLogin() {
    if (this.token) localStorage.setItem('pf_token', this.token); else localStorage.removeItem('pf_token');
    if (this.name) localStorage.setItem('pf_name', this.name); else localStorage.removeItem('pf_name');
  }

  async register(name) {
    const token = this.newToken();
    const r = await this.call('register', { p_name: name, p_token: token });
    this.token = token; this.name = r.name; this.saveLogin();
    this.c.msg(`Willkommen, ${r.name}! Du bist jetzt online.`);
    await this.sync();
  }

  async restore(code) {
    const old = this.token;
    this.token = code.trim();
    try { await this.sync(true); this.name = this.me.name; this.saveLogin(); this.c.msg(`Konto ${this.name} übernommen.`); }
    catch (e) { this.token = old; throw e; }
  }

  logout() { this.token = null; this.name = null; this.me = null; this.world = null; this.saveLogin(); this.status = 'aus'; }

  snapshot() {
    const c = this.c, s = c.s;
    return { power: c.power, tower: c.towerLevel, u: s.troops.slice(0, 5), laz: c.levels(20), ach: Object.keys(s.ach || {}).length, h: s.troops[0], w: s.troops[1], def: c.defense, res: s.res.map((v) => Math.floor(v)) };
  }

  async sync(strict) {
    if (!this.token) return;
    try {
      const r = await this.call('sync', () => ({ p_token: this.token, p_snap: this.snapshot() }));
      this.offset = Date.now() - Date.parse(r.now);
      this.me = r.me; this.name = r.me.name;
      this.marches = r.marches || []; this.owned = r.owned || []; this.incoming = r.incoming || 0;
      const d = r.delta || { res: [0, 0, 0, 0], u: zeroU() };
      const s = this.c.s, du = d.u || zeroU();
      d.res.forEach((v, i) => { if (v) this.c.addRes(i, v); });
      s.troops = s.troops.map((v, i) => Math.max(0, v + (du[i] || 0)));
      if (d.wounded && d.wounded.some((v) => v > 0)) {
        const cap = 25 * this.c.levels(20), room = Math.max(0, cap - s.wounded.reduce((a, b) => a + b, 0));
        let w = d.wounded.slice(0, 5), tot = w.reduce((a, b) => a + b, 0);
        if (tot > room) w = w.map((v) => Math.floor(v * room / tot));
        s.wounded = s.wounded.map((v, i) => v + (w[i] || 0));
        if (w.some((v) => v > 0)) this.c.msg(`🩹 ${w.reduce((a, b) => a + b, 0)} Verwundete sind im Lazarett angekommen.`);
      }
      this.lh = r.lh || null; this.openRallies = r.rallies || 0;
      this.events = r.events || []; this.title = r.title || null;
      if (r.news && r.news.id > (+localStorage.getItem('pf_news') || 0)) { this.newsPending = r.news; localStorage.setItem('pf_news', String(r.news.id)); }
      const back = du.reduce((a, v) => a + Math.max(0, v), 0);
      if (back > 0) this.c.msg(`${back} Krieger sind eingetroffen${d.res.some((v) => v > 0) ? ' – mit Beute!' : '.'}`);
      this.reports = r.reports || [];
      for (const rep of this.reports.slice().reverse()) if (rep.id > this.lastReport) { this.c.msg(rep.text); if (this.lastReport > 0 && rep.win === true && /^Sieg/.test(rep.text)) questEvent(this.c, 'win', 1); this.lastReport = rep.id; }
      localStorage.setItem('pf_lastrep', String(this.lastReport));
      this.status = 'online'; this.error = '';
    } catch (e) {
      if (e.code === 'NICHT_ANGEMELDET' && !strict) { this.status = 'fehler'; this.error = e.message; return; }
      this.status = e.code ? 'fehler' : 'offline';
      this.error = e.code ? e.message : 'Keine Verbindung zum Server.';
      if (strict) throw e;
    }
  }

  async loadWorld() {
    if (!this.token) return;
    try { this.world = await this.call('world', { p_token: this.token }); } catch (e) { /* nächster Versuch */ }
  }

  async loadAlliances() {
    if (!this.token) return;
    try { this.alliances = await this.call('alliances_list', { p_token: this.token }); } catch (e) { /* */ }
  }

  async loadChat() {
    if (!this.token || !this.me || !this.me.alliance_id) return;
    try {
      const msgs = await this.call('chat_get', { p_token: this.token, p_after: this.chatAfter });
      if (msgs && msgs.length) { this.chat = this.chat.concat(msgs).slice(-80); this.chatAfter = msgs[msgs.length - 1].id; }
    } catch (e) { /* */ }
  }

  // ---------- Events, Hilfe, Spielleiter ----------
  eventLeft(kind) {
    if (!this.active || !this.events) return 0;
    const now = this.serverNow();
    for (const e of this.events) if (e.kind === kind) { const l = (Date.parse(e.until) - now) / 1000; if (l > 0) return l; }
    return 0;
  }
  async sendHelp(to, res) {
    await this.call('send_help', { p_token: this.token, p_to: to, p_res: res });
    res.forEach((v, i) => (this.c.s.res[i] = Math.max(0, this.c.s.res[i] - v)));
    await this.sync();
  }
  async adminBroadcast(text) { await this.call('admin_broadcast', { p_token: this.token, p_text: text }); await this.sync(); }
  async adminEvent(kind, min) { await this.call('admin_event', { p_token: this.token, p_kind: kind, p_minutes: min }); await this.sync(); }
  async adminPlayers() { try { this.players = await this.call('admin_players', { p_token: this.token }); } catch (e) { /* */ } }
  async adminBan(id, ban) { await this.call('admin_ban', { p_token: this.token, p_player: id, p_ban: ban }); await this.adminPlayers(); }

  // ---------- Späher & Sammelangriffe ----------
  async scout(kind, target) {
    await this.call('scout', { p_token: this.token, p_kind: kind, p_target: kind === 'terr' ? target : null, p_target_player: kind === 'player' ? target : null });
    await this.sync();
  }
  async rallyCreate(kind, target, u, wait) {
    const s = this.c.s;
    await this.call('rally_create', { p_token: this.token, p_kind: kind, p_target: kind === 'terr' ? target : null, p_target_player: kind === 'player' ? target : null, p_u: u, p_wait: wait });
    s.troops = s.troops.map((v, i) => v - (u[i] || 0));
    await this.sync(); await this.loadRallies();
  }
  async rallyJoin(id, u) {
    const s = this.c.s;
    await this.call('rally_join', { p_token: this.token, p_rally: id, p_u: u });
    s.troops = s.troops.map((v, i) => v - (u[i] || 0));
    await this.sync(); await this.loadRallies();
  }
  async loadRallies() { try { this.rallies = await this.call('rally_list', { p_token: this.token }); } catch (e) { /* */ } }

  // ---------- Codes ----------
  async redeem(code) {
    const r = await this.call('redeem_code', { p_token: this.token, p_code: code });
    if (!r.ok) throw new Error(r.err || 'Code ungültig.');
    await this.sync();
    return r.text;
  }
  async loadCodes() { if (this.me && this.me.is_admin) try { this.codes = await this.call('admin_codes', { p_token: this.token }); } catch (e) { /* */ } }
  async saveCode(code, res, u, days, max) {
    await this.call('admin_code_save', { p_token: this.token, p_code: code, p_res: res, p_u: u, p_days: days, p_max: max });
    await this.loadCodes();
  }
  async deleteCode(code) { await this.call('admin_code_delete', { p_token: this.token, p_code: code }); await this.loadCodes(); }

  async loadRanking() {
    if (!this.token) return;
    try { this.ranking = await this.call('ranking', { p_token: this.token }); } catch (e) { /* */ }
  }

  async sendMarch(kind, target, u) {
    const s = this.c.s;
    const r = await this.call('send_march', () => ({
      p_token: this.token, p_kind: kind, p_target: kind === 'terr' ? target : null, p_target_player: kind === 'player' ? target : null, p_u: u,
    }));
    s.troops = s.troops.map((v, i) => v - (u[i] || 0));
    await this.sync();
    return r;
  }

  async withdraw(terr) { await this.call('withdraw', { p_token: this.token, p_terr: terr }); await this.sync(); await this.loadWorld(); }
  async createAlliance(name, tag) { await this.call('alliance_create', { p_token: this.token, p_name: name, p_tag: tag }); this.chat = []; this.chatAfter = 0; await this.sync(); await this.loadAlliances(); }
  async joinAlliance(id) { await this.call('alliance_join', { p_token: this.token, p_alliance: id }); this.chat = []; this.chatAfter = 0; await this.sync(); await this.loadAlliances(); }
  async leaveAlliance() { await this.call('alliance_leave', { p_token: this.token }); this.chat = []; this.chatAfter = 0; await this.sync(); await this.loadAlliances(); }
  async kick(id) { await this.call('alliance_kick', { p_token: this.token, p_player: id }); await this.loadAlliances(); }
  async sendChat(text) { await this.call('chat_send', { p_token: this.token, p_text: text }); await this.loadChat(); }

  /// eigene Gebiete (für Produktionsbonus)
  ownedBonus() { return this.owned; }
  troopsAway() {
    let a = zeroU();
    for (const m of this.marches) a = uAdd(a, m.u || zeroU());
    if (this.world && this.me) for (const t of this.world.territories) if (t.owner === this.me.id) a = uAdd(a, t.gu || zeroU());
    return a;
  }

  update(dt) {
    if (!this.token) return;
    for (const k in this.t) this.t[k] += dt;
    if (this.t.sync > 15) { this.t.sync = 0; this.sync(); }
    if (this.wantWorld && this.t.world > 10) { this.t.world = 0; this.loadWorld(); }
    if (this.wantChat && this.t.chat > 4) { this.t.chat = 0; this.loadChat(); }
    if (this.wantChat && this.t.all > 15) { this.t.all = 0; this.loadAlliances(); }
  }
}

export const resName = (i) => RES[i];
