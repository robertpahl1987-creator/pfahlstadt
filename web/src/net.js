// Verbindung zum Mehrspieler-Server (Supabase, nur über RPC-Funktionen mit Spieler-Token)
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { RES } from './game.js';

export class Net {
  constructor(colony) {
    this.c = colony;
    this.token = localStorage.getItem('pf_token');
    this.name = localStorage.getItem('pf_name');
    this.world = null; this.worldAt = 0; this.clockOffset = 0;
    this.reports = []; this.seenReport = localStorage.getItem('pf_seen') || '';
    this.alliances = null; this.chat = []; this.ranking = null;
    this.busy = false; this.lastSync = 0; this.err = null;
  }

  get enabled() { return !!SUPABASE_URL && !!SUPABASE_KEY; }
  get online() { return this.enabled && !!this.token; }

  async rpc(fn, args) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
      body: JSON.stringify(args),
    });
    const txt = await r.text();
    let d = null;
    try { d = txt ? JSON.parse(txt) : null; } catch (e) { d = null; }
    if (!r.ok) throw new Error((d && (d.message || d.hint)) || 'Server nicht erreichbar (' + r.status + ')');
    return d;
  }

  async register(name) {
    const d = await this.rpc('pf_register', { p_name: name });
    this.token = d.token; this.name = d.name;
    localStorage.setItem('pf_token', d.token); localStorage.setItem('pf_name', d.name);
    this.c.msg(`Willkommen in der Online-Welt, ${d.name}!`);
    await this.sync();
    await this.loadWorld();
  }

  logout() {
    this.token = null; this.world = null; this.c.onlineBonus = null;
    localStorage.removeItem('pf_token'); localStorage.removeItem('pf_name');
  }

  state() {
    const c = this.c, s = c.s;
    return { res: s.res.map((v) => Math.floor(v)), h: s.troops[0], w: s.troops[1], defense: c.defense, power: c.power, tower: c.towerLevel };
  }

  async sync() {
    if (!this.online || this.busy) return;
    this.busy = true;
    try {
      const d = await this.rpc('pf_sync', { p_token: this.token, p_state: this.state() });
      const p = d.pending || {}, s = this.c.s;
      if (p.res) p.res.forEach((v, i) => { if (v) s.res[i] = Math.max(0, s.res[i] + v); });
      if (p.h) s.troops[0] = Math.max(0, s.troops[0] + p.h);
      if (p.w) s.troops[1] = Math.max(0, s.troops[1] + p.w);
      this.c.onlineBonus = (d.bonus || []).map((b) => ({ res: b.res, pct: b.pct }));
      this.reports = d.reports || [];
      // neue Berichte als Meldung zeigen
      const newest = this.reports[0] ? this.reports[0].created_at : '';
      if (newest && newest !== this.seenReport) {
        for (const r of this.reports) { if (r.created_at <= this.seenReport) break; this.c.msg(r.text); }
        this.seenReport = newest; localStorage.setItem('pf_seen', newest);
      }
      this.err = null;
    } catch (e) {
      this.err = e.message;
      if (/Unbekannter Spieler/.test(e.message)) this.logout();
    } finally {
      this.busy = false; this.lastSync = Date.now();
    }
  }

  async loadWorld() {
    if (!this.online) return;
    try {
      const w = await this.rpc('pf_world', { p_token: this.token });
      this.clockOffset = Date.parse(w.now) - Date.now();
      for (const m of w.marches) { m.t0 = Date.parse(m.depart); m.t1 = Date.parse(m.arrive); }
      this.world = w; this.worldAt = Date.now(); this.err = null;
    } catch (e) { this.err = e.message; }
  }

  serverNow() { return Date.now() + this.clockOffset; }

  async send(kind, target, h, w) {
    await this.sync();
    await this.rpc('pf_send', { p_token: this.token, p_kind: kind, p_target: String(target), p_h: h, p_w: w });
    this.c.s.troops[0] -= h; this.c.s.troops[1] -= w;
    this.c.msg(kind === 'attack_player' ? 'Angriff auf Spieler gestartet!' : kind === 'reinforce' ? 'Verstärkung ist unterwegs.' : 'Angriff gestartet!');
    await this.loadWorld();
  }

  async withdraw(terr) { await this.rpc('pf_withdraw', { p_token: this.token, p_terr: terr }); this.c.msg('Besatzung kehrt heim.'); await this.loadWorld(); }

  async loadAlliances() { this.alliances = await this.rpc('pf_alliances', { p_token: this.token }); }
  async createAlliance(name, tag) { await this.rpc('pf_alliance_create', { p_token: this.token, p_name: name, p_tag: tag }); await this.loadAlliances(); await this.loadWorld(); }
  async joinAlliance(id) { await this.rpc('pf_alliance_join', { p_token: this.token, p_alliance: id }); await this.loadAlliances(); await this.loadWorld(); }
  async leaveAlliance() { await this.rpc('pf_alliance_leave', { p_token: this.token }); await this.loadAlliances(); await this.loadWorld(); }
  async loadChat(text) { this.chat = await this.rpc('pf_chat', { p_token: this.token, p_text: text || null }); }
  async loadRanking() { this.ranking = await this.rpc('pf_ranking', { p_token: this.token }); }

  /// regelmäßiger Abgleich
  tick() {
    if (!this.online) return;
    const now = Date.now();
    if (now - this.lastSync > 15000) this.sync();
  }
}

export const resName = (i) => RES[i];
