// Zusatz-Oberflächen: Arena, Aufstellung, Wiederholungen, Schmiede, Hindernisse,
// Allianz-Hilfe, Allianzburg, Allianz-Forschung, Allianz-Krieg, Rohstofffelder
import { RES, UNITS, fmtTime, zeroU, uSum, troopStr, armyStr, carryOf, speedFactor } from './game.js';
import { mods, CAPTAINS, capOf, capAtk, capFree, capSpeed, fleetSpeed, GEAR, GEAR_MAX, gearLv, gearCost, gearBlocker, forgeGear } from './progress.js';
import { ROWS, ROW_IC, formOf, formMul, FORM_TIPS, FORM_PRESETS, setRow, OBST, obstBlocker, startObst, gcapOf, helpStep } from './social.js';

const RES_IC = ['🪵', '🦪', '💧', '⚙️'];
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
export const LEAGUES = [['🥉', 'Bronze', 0], ['🥈', 'Silber', 400], ['🥇', 'Gold', 800], ['💎', 'Kristall', 1200], ['👑', 'Meister', 1800], ['🏆', 'Champion', 2600]];
const ALLY_RES = {
  f_atk: ['⚔️ Kriegskunst', '+2 % Angriff je Stufe'],
  f_def: ['🛡️ Bollwerk', '+2 % Verteidigung je Stufe'],
  f_gather: ['🧺 Sammlergilde', '+5 % Sammeln je Stufe'],
  f_build: ['🔨 Bauhütte', '−3 % Bauzeit je Stufe'],
  f_march: ['🧭 Seewege', '−3 % Fahrzeit je Stufe'],
};

export function installUI2(UI) {
  const P = UI.prototype;

  // ---------- Truppen: zusätzliche Reiter ----------
  P.troopsHtml = function () {
    const tab = this.troopTab || 'truppen';
    const tabs = [['truppen', '⚔️', 'Truppen'], ['form', '🧱', 'Aufstellung'], ['caps', '🎖️', 'Kapitäne'], ['arena', '🏟️', 'Arena'], ['reports', '📜', 'Berichte'], ['rank', '🏆', 'Rang']];
    const bar = `<div class="tabs" style="grid-template-columns:repeat(6,1fr)">${tabs.map(([k, ic, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-a="ttab" data-t="${k}"><span>${ic}</span>${l}</button>`).join('')}</div>`;
    const strip = (x) => x.replace(/^<div class="ph">[\s\S]*?<\/button><\/div>/, '');
    const body = tab === 'reports' ? strip(this.reportsHtml()) : tab === 'rank' ? strip(this.rankHtml()) : tab === 'caps' ? this.captainsHtml() + this.forgeHtml()
      : tab === 'arena' ? this.arenaHtml() : tab === 'form' ? this.formHtml() : this.troopsTabHtml();
    return this.head('Truppen') + bar + `<div class="tabbody">${body}</div>`;
  };
  const ttab0 = P.ttabLoad;
  P.ttabLoad = function () {
    ttab0.call(this);
    if (this.troopTab === 'arena' && this.o.active) this.o.arenaList().then(() => (this.panelKey = null));
  };

  // ---------- Aufstellung (Basis-Editor) ----------
  P.formHtml = function () {
    const c = this.c, f = formOf(c), m = formMul(f), s = c.s;
    let out = `<div class="desc">Lege fest, wo deine Verteidiger stehen, wenn Piraten oder andere Spieler angreifen. Die Aufstellung gilt auch in der 🏟️ Arena.</div>
      <div class="inf">Aufstellungs-Bonus: <b style="color:${m >= 1.1 ? '#8ef0a0' : m >= 1 ? '#ffd27a' : '#ff7a7a'}">${m >= 1 ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)} %</b> auf die Kampfkraft deiner Verteidiger</div>`;
    out += '<div class="formgrid">' + [2, 1, 0].map((r) => `<div class="frow"><span class="fl">${ROW_IC[r]} ${ROWS[r]}</span>${UNITS.map((u, k) => (f[k] === r ? `<span class="fu">${u.ic}<small>${s.troops[k]}</small></span>` : '')).join('') || '<span class="sm">leer</span>'}</div>`).join('') + '<div class="frow gate">🏰 Stadttor</div></div>';
    UNITS.forEach((u, k) => {
      out += `<div class="row"><div class="ri"><b>${u.ic} ${u.name}</b></div>${[0, 1, 2].map((r) => `<button class="btn sm2 ${f[k] === r ? '' : 'ghost'}" data-a="formSet" data-u="${k}" data-r="${r}">${ROWS[r]}</button>`).join('')}</div>`;
    });
    out += '<div class="sub2">Schnellwahl</div><div class="btns">' + FORM_PRESETS.map((p, k) => `<button class="btn ghost" data-a="formPreset" data-k="${k}">${p.ic} ${p.name}</button>`).join('') + '</div>';
    out += `<div class="sm">${FORM_TIPS.join('<br>')}</div>`;
    return out;
  };

  // ---------- Schmiede (Ausrüstung der Kapitäne) ----------
  P.forgeHtml = function () {
    const c = this.c, s = c.s, hired = CAPTAINS.filter((k) => capOf(c, k.id));
    let out = `<div class="sub2">⚒️ Schmiede</div><div class="inf">🔩 Schmiedeeisen: <b>${s.ore || 0}</b> · ⚙️ Altmetall: <b>${Math.floor(s.res[3])}</b></div>
      <div class="sm">Schmiedeeisen gibt es von 🏴‍☠️ Piratenschiffen, Schätzen im Watt, geräumten Wracks und Felsen sowie aus der Arena. Ausrüstung wirkt nur, wenn der Kapitän den Trupp anführt.</div>`;
    if (!hired.length) return out + '<div class="sm">Heuere zuerst einen Kapitän an.</div>';
    const sel = hired.find((k) => k.id === this.gearCap) || hired[0];
    out += `<div class="speeds">${hired.map((k) => `<button class="btn sm2 ${k.id === sel.id ? '' : 'ghost'}" data-a="gearCap" data-id="${k.id}">${k.ic} ${k.name.split(' ')[0]}</button>`).join('')}</div>`;
    for (const g of GEAR) {
      const L = gearLv(c, sel.id, g.id), cost = gearCost(L + 1), blk = gearBlocker(c, sel.id, g.id);
      out += `<div class="row"><div class="ri"><b>${g.ic} ${g.name}</b> <span class="sh">Stufe ${L}/${GEAR_MAX}</span><div class="sm">${g.text}</div>
        ${L < GEAR_MAX ? `<div class="sm">Nächste Stufe: 🔩 ${cost.ore} · ⚙️ ${cost.metal}${blk && !/^Braucht \d+ 🔩|Zu wenig/.test(blk) ? ` · <span class="warn">${blk}</span>` : ''}</div>` : ''}</div>
        ${L < GEAR_MAX ? `<button class="btn sm2" data-a="forge" data-cap="${sel.id}" data-g="${g.id}" ${blk ? 'disabled' : ''}>${L ? 'Verbessern' : 'Schmieden'}</button>` : '<b>MAX</b>'}</div>`;
    }
    return out;
  };

  // ---------- Arena ----------
  P.arenaHtml = function () {
    const o = this.o, c = this.c;
    if (!o.active) return '<div class="desc">🏟️ Die Arena gibt es im Online-Spiel: Kämpfe gegen die Aufstellungen anderer Spieler, sammle Pokale und steige von Bronze bis Champion auf.</div><div class="btns"><button class="btn" data-a="goOnline">Online gehen</button></div>';
    const A = o.arena;
    if (!A) return `<div class="inf">Lade Arena …</div>${o.arenaErr ? `<div class="warn">${esc(o.arenaErr)}</div>` : ''}`;
    const lg = LEAGUES[A.league], nx = LEAGUES[A.league + 1];
    const att = Math.round(armyStr(c.s.troops, null, true) * mods(c).atk);
    let out = `<div class="arenahd"><span class="big">${lg[0]}</span><div><b>${lg[1]}-Liga</b><div class="sm">🏆 ${A.tr} Pokale${nx ? ` · ${nx[0]} ${nx[1]} ab ${nx[2]}` : ''}</div></div></div>
      <div class="desc">Trainingskämpfe: Deine Krieger zu Hause kämpfen gegen die Verteidiger anderer – <b>niemand verliert dabei Krieger</b>. Sieg bringt Pokale, Niederlage kostet welche. Jeden Tag gibt es je nach Liga Abzeichen, Rohstoffe und Schmiedeeisen.</div>
      <div class="inf">⚔️ Kämpfe heute: <b>${A.left}/${A.max}</b> · Deine Angriffskraft: <b>${att.toLocaleString('de-DE')}</b></div>
      <div class="btns"><button class="btn" data-a="arenaClaim" ${A.claim && !this.busy ? '' : 'disabled'}>${A.claim ? `🎁 Liga-Belohnung (${lg[1]})` : '✔ Belohnung abgeholt'}</button></div>
      <div class="sub2">Gegner</div>`;
    out += (A.opps || []).map((p) => `<div class="row"><div class="ri"><b>${p.bot ? '👻 ' : '🏰 '}${esc(p.name)}</b> <span class="sh">🏆 ${p.tr} · ⚔ ${p.power}</span>${p.bot ? '<div class="sm">Geisterkapitän</div>' : ''}</div>
      <button class="btn sm2 danger" data-a="arenaFight" ${p.id ? `data-id="${p.id}"` : `data-bot="${p.bot}"`} ${A.left > 0 && uSum(c.s.troops) > 0 && !this.busy ? '' : 'disabled'}>Kämpfen</button></div>`).join('');
    if (!uSum(c.s.troops)) out += '<div class="warn">Keine Krieger zu Hause.</div>';
    if ((A.log || []).length) {
      out += '<div class="sub2">Letzte Kämpfe</div>' + A.log.map((l, k) => `<div class="row rep ${l.win ? 'win' : 'loss'}"><div class="ri">${l.att ? '⚔️ gegen' : '🛡️ von'} <b>${esc(l.name)}</b> · ${l.win ? 'Sieg' : 'Niederlage'} <b>${l.dt > 0 ? '+' : ''}${l.dt} 🏆</b></div>${l.replay ? `<button class="btn sm2 ghost" data-a="replayArena" data-k="${k}">▶</button>` : ''}</div>`).join('');
    }
    return out;
  };

  // ---------- Hindernisse ----------
  P.obstHtml = function () {
    const c = this.c, id = -4000 - this.selected, o = (c.s.obst || []).find((x) => x.id === id);
    if (!o) return this.head('Hindernis') + '<div class="sm">Schon weggeräumt.</div>';
    const d = OBST[o.kind], cl = c.s.clearing, mine = cl && cl.id === id, blk = obstBlocker(c, id);
    let out = this.head(`${d.ic} ${d.name}`) + '<div class="desc">Angespült vom letzten Hochwasser. Räum es weg – darunter steckt oft etwas Brauchbares (Rohstoffe, 🔩 Schmiedeeisen, manchmal ein Beschleuniger).</div>';
    if (mine) return out + `<div class="inf">🧹 Wird geräumt … noch ${fmtTime(cl.left)}</div><div class="bar"><div style="width:${Math.round(100 * (1 - cl.left / cl.total))}%"></div></div>`;
    out += `<div class="inf">Kosten: ${this.costStr(d.cost)} · Dauer ${fmtTime(d.time)}</div>`;
    if (blk && blk !== 'Zu wenig Rohstoffe') out += `<div class="warn">${blk}</div>`;
    return out + `<div class="btns"><button class="btn" data-a="obstClear" ${blk ? 'disabled' : ''}><b>🧹 Wegräumen</b></button></div>`;
  };

  // ---------- Rohstofffeld (Seekarte online) ----------
  P.fieldHtml = function () {
    const c = this.c, o = this.o, f0 = this.form, fl = ((o.world || {}).fields || []).find((x) => x.id === this.mapSel.id);
    if (!fl) return this.head('Rohstofffeld') + '<div class="sm">Das Feld ist erschöpft.</div>';
    const me = o.me, dist = Math.hypot(fl.x - me.x, fl.y - me.y), tt = (20 + dist * 22) * speedFactor(f0);
    const nm = ['Treibholz-Feld', 'Muschelbank', 'Süßwasserquelle', 'Schrottberg'][fl.kind - 1];
    let out = this.head(`${RES_IC[fl.kind - 1]} ${nm} · Stufe ${fl.level}`) + `<div class="desc">Schicke einen Trupp zum Sammeln. Je höher die Stufe, desto schneller wird gesammelt. Feinde können deinen Trupp angreifen und vertreiben!</div>
      <div class="inf">Vorrat: <b>${fl.amount.toLocaleString('de-DE')}</b> / ${fl.total.toLocaleString('de-DE')} ${RES[fl.kind - 1]} · Fahrt ${fmtTime(tt)}</div><div class="bar"><div style="width:${Math.round(100 * fl.amount / Math.max(1, fl.total))}%"></div></div>`;
    const mm = (o.marches || []).find((m) => m.field_id === fl.id);
    if (mm) {
      if (mm.status === 'gather') return out + `<div class="inf">⛏ Dein Trupp sammelt (${troopStr(mm.u)}) · fertig in ${fmtTime(Math.max(0, (Date.parse(mm.gather_end) - o.serverNow()) / 1000))}</div><div class="btns"><button class="btn ghost" data-a="gatherRecall" data-id="${mm.id}" ${this.busy ? 'disabled' : ''}>Zurückrufen (bringt das bisher Gesammelte mit)</button></div>`;
      return out + '<div class="inf">⛵ Dein Trupp ist unterwegs.</div>';
    }
    if (fl.occ) out += `<div class="inf">⛏ Hier sammelt gerade <b>${esc(fl.occ)}</b>${fl.occ_ally && fl.occ_ally === me.alliance_id ? ' (Verbündeter)' : ' – greif an, um das Feld zu übernehmen!'}</div>`;
    const carry = Math.round(carryOf(f0)), rate = Math.max(1, carry) / 1800 * (1 + 0.15 * fl.level), amt = Math.min(carry, fl.amount);
    const extra = uSum(f0) ? `<div class="sm">Traglast ${carry.toLocaleString('de-DE')} → etwa ${fmtTime(amt / rate)} Sammelzeit</div>` : '<div class="sm">Tipp: 🏃 Wattläufer tragen am meisten.</div>';
    const ally = fl.occ && fl.occ_ally && fl.occ_ally === me.alliance_id;
    return out + '<div class="sub2">Sammeltrupp</div>' + this.troopForm(fl.occ && !ally ? 'Angreifen & sammeln!' : 'Sammeln!', !!fl.occ && !ally, ally ? 'Ein Verbündeter sammelt hier' : null, extra, 'sendGather');
  };

  // ---------- Allianz: Reiter ----------
  const ally0 = P.allyHtml;
  P.allyHtml = function () {
    const o = this.o;
    if (!o.active || !o.alliances || !o.me || !o.me.alliance_id || this.helpTo || this.rallySel) return ally0.call(this);
    const tab = this.allyTab || 'main';
    const tabs = [['main', '💬', 'Allianz'], ['help', '🤝', 'Hilfe' + (o.helpOpen ? ` ${o.helpOpen}` : '')], ['garr', '🛡️', 'Burg'], ['res', '🔬', 'Forschung'], ['war', '⚔️', 'Krieg' + (o.war ? ' •' : '')]];
    const bar = `<div class="tabs" style="grid-template-columns:repeat(5,1fr)">${tabs.map(([k, ic, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-a="atab" data-t="${k}"><span>${ic}</span>${l}</button>`).join('')}</div>`;
    const full = ally0.call(this), m = full.match(/^<div class="ph">[\s\S]*?<\/button><\/div>/), head = m ? m[0] : this.head('Allianz');
    const body = tab === 'help' ? this.allyHelpHtml() : tab === 'garr' ? this.garrHtml() : tab === 'res' ? this.allyResHtml() : tab === 'war' ? this.warHtml() : full.slice(head.length);
    return head + bar + `<div class="tabbody">${body}</div>`;
  };

  P.allyHelpHtml = function () {
    const o = this.o, L = o.helps;
    let out = `<div class="desc">Jeder Bau und jede Forschung bittet deine Allianz automatisch um Hilfe. Jeder Tipp eines Verbündeten verkürzt die Restzeit (mindestens 30 Sek., bei langen Aufträgen 1,5 %). Fürs Helfen gibt es ⚙️ 15 Altmetall und 1 VIP-Punkt (bis 30× am Tag).</div>`;
    if (!L) return out + '<div class="inf">Lade …</div>';
    out += `<div class="btns"><button class="btn" data-a="helpAll" ${L.length && !this.busy ? '' : 'disabled'}><b>🤝 Allen helfen (${L.length})</b></button></div>`;
    out += L.map((h) => `<div class="row"><div class="ri"><b>${esc(h.name)}</b> <span class="sh">${esc(h.label)}</span><div class="bar"><div style="width:${Math.round(100 * h.got / h.max)}%"></div></div><div class="sm">${h.got}/${h.max} Hilfen</div></div>
      <button class="btn sm2" data-a="helpOne" data-id="${h.id}" ${this.busy ? 'disabled' : ''}>Helfen</button></div>`).join('') || '<div class="sm">Gerade braucht niemand Hilfe. 👍</div>';
    const own = Object.entries(this.c.s.helpGot || {}).filter(([, n]) => n > 0);
    if (own.length) out += `<div class="sm" style="margin-top:8px">Deine Aufträge haben heute ${own.reduce((a, [, n]) => a + n, 0)}× Hilfe bekommen.</div>`;
    return out;
  };

  P.garrHtml = function () {
    const o = this.o, c = this.c, G = o.garr;
    const cap = gcapOf(c);
    if (this.donTo) {
      return `<div class="sub2">🛡️ Verstärkung für ${esc(this.donTo.name)} (${this.donTo.free} Plätze frei)</div><div class="desc">Deine Krieger verteidigen seine Stadt mit, bis er sie zurückschickt oder du sie zurückholst. Fallen sie im Kampf, sind sie verloren. Pro 5 Krieger gibt es 1 VIP-Punkt.</div>`
        + this.troopForm('Schicken', false, uSum(this.form) > this.donTo.free ? 'Zu viele für die freien Plätze' : null, '', 'donateTroops') + '<div class="btns"><button class="btn ghost" data-a="donToBack">Zurück</button></div>';
    }
    let out = `<div class="desc">In deiner <b>Allianzburg</b> können Verbündete Krieger stationieren, die deine Stadt mitverteidigen – gegen Spieler-Angriffe. Platz: 15 + 10 je Gezeitenturm-Stufe.</div>`;
    if (!G) return out + '<div class="inf">Lade …</div>';
    out += `<div class="inf">🏰 Deine Burg: <b>${G.total}/${cap}</b> Krieger${G.total ? ' · ' + troopStr(G.u) : ''}</div><div class="bar"><div style="width:${Math.round(100 * G.total / Math.max(1, cap))}%"></div></div>
      <div class="btns"><button class="btn" data-a="troopReq" ${G.total >= cap || this.busy ? 'disabled' : ''}>📣 Um Verstärkung bitten</button></div>`;
    out += (G.rows || []).map((r) => `<div class="row"><div class="ri"><b>${esc(r.name)}</b><div class="sm">${troopStr(r.u)}</div></div><button class="btn sm2 ghost" data-a="garrBack" data-id="${r.donor}">Zurückschicken</button></div>`).join('');
    out += '<div class="sub2">Verbündete bitten um Verstärkung</div>' + ((G.req || []).map((r) => `<div class="row"><div class="ri"><b>${esc(r.name)}</b> <span class="sh">${r.free} Plätze frei</span></div><button class="btn sm2" data-a="donTo" data-id="${r.id}" data-n="${esc(r.name)}" data-f="${r.free}">Krieger schicken</button></div>`).join('') || '<div class="sm">Gerade keine Anfragen.</div>');
    if ((G.mine || []).length) out += '<div class="sub2">Deine Krieger bei anderen</div>' + G.mine.map((r) => `<div class="row"><div class="ri"><b>${esc(r.name)}</b><div class="sm">${troopStr(r.u)}</div></div><button class="btn sm2 ghost" data-a="garrRecall" data-id="${r.host}">Zurückholen</button></div>`).join('');
    return out;
  };

  P.allyResHtml = function () {
    const o = this.o, Pj = o.projects || [];
    if (this.donKind && ALLY_RES[this.donKind]) {
      const n = (k) => `<input class="n" id="dn${k}" type="number" min="0" inputmode="numeric" placeholder="${RES_IC[k]} ${RES[k]}" style="flex:1 1 23%">`;
      return `<div class="sub2">Spenden für ${ALLY_RES[this.donKind][0]}</div><div class="form" style="flex-wrap:wrap;gap:4px">${[0, 1, 2, 3].map(n).join('')}</div>
        <div class="btns"><button class="btn" data-a="donSend" ${this.busy ? 'disabled' : ''}><b>Spenden</b></button><button class="btn ghost" data-a="donBack">Zurück</button></div>`;
    }
    return '<div class="desc">🔬 Allianz-Forschung: Alle spenden Rohstoffe, jede Stufe wirkt für <b>jedes Mitglied</b>. Pro 500 gespendete Rohstoffe gibt es 1 VIP-Punkt.</div>' + Object.keys(ALLY_RES).map((k) => {
      const p = Pj.find((x) => x.kind === k) || { level: 0, progress: 0, goal: 4000 };
      return `<div class="row"><div class="ri"><b>${ALLY_RES[k][0]}</b> <span class="sh">Stufe ${p.level}/10 · ${ALLY_RES[k][1]}</span>
        ${p.level < 10 ? `<div class="bar"><div style="width:${Math.round(100 * p.progress / p.goal)}%"></div></div><div class="sm">${p.progress.toLocaleString('de-DE')} / ${p.goal.toLocaleString('de-DE')}</div>` : ''}</div>
        ${p.level < 10 ? `<button class="btn sm2" data-a="donPick" data-k="${k}">Spenden</button>` : '<b>MAX</b>'}</div>`;
    }).join('');
  };

  P.warHtml = function () {
    const o = this.o, W = o.warI;
    let out = '<div class="desc">⚔️ <b>Allianz-Krieg</b>: 48 Stunden, jedes Mitglied hat <b>2 Kriegsangriffe</b> auf Städte der gegnerischen Allianz. Ein Sieg bringt 1–3 ⭐ (je klarer, desto mehr), eine eroberte Insel 3 ⭐. Gezählt werden die besten Sterne je Gegner. Die Gewinner bekommen 12 Abzeichen, Rohstoffe und einen 60-Min-Beschleuniger.</div>';
    if (!W) return out + '<div class="inf">Lade …</div>';
    const w = W.war;
    if (!w) {
      if (!W.leader) return out + '<div class="inf">Gerade herrscht Frieden. Nur euer Anführer kann einen Krieg erklären.</div>';
      return out + '<div class="sub2">Gegner wählen</div>' + ((W.targets || []).map((t) => `<div class="row"><div class="ri"><b>[${esc(t.tag)}] ${esc(t.name)}</b> <span class="sh">${t.n} Mitglieder · ⚔ ${t.power}</span></div>
        <button class="btn sm2 ${this.confirm === 'war' + t.id ? 'danger' : ''}" data-a="warDeclare" data-id="${t.id}" ${this.busy ? 'disabled' : ''}>${this.confirm === 'war' + t.id ? '<b>Wirklich?</b>' : 'Krieg erklären'}</button></div>`).join('') || '<div class="sm">Keine anderen Allianzen.</div>');
    }
    const left = (Date.parse(w.ends) - o.serverNow()) / 1000, done = w.status !== 'active';
    out = `<div class="warhd"><div><b>[${esc(w.us.tag)}]</b><div class="big">${w.us.score} ⭐</div></div><div class="vs">${done ? (w.winner === 'us' ? '🏆 Sieg!' : w.winner === 'them' ? 'Niederlage' : 'Unentschieden') : '⚔️<div class="sm">' + fmtTime(Math.max(0, left)) + '</div>'}</div><div><b>[${esc(w.them.tag)}]</b><div class="big">${w.them.score} ⭐</div></div></div>`;
    if (!done) out += `<div class="inf">Deine Kriegsangriffe übrig: <b>${w.hits_left}/2</b></div>`;
    out += '<div class="sub2">Gegner</div>' + w.enemies.map((e) => `<div class="row"><div class="ri"><b>${esc(e.name)}</b> <span class="sh">⚔ ${e.power} · 🗼${e.tower}${e.shield ? ' · 🛡 Schutz' : ''}</span><div class="stars">${'⭐'.repeat(e.stars)}${'☆'.repeat(3 - e.stars)}</div></div>
      ${!done ? `<button class="btn sm2 danger" data-a="warGo" data-id="${e.id}" ${e.shield || w.hits_left <= 0 ? 'disabled' : ''}>Angreifen</button>` : ''}</div>`).join('');
    out += '<div class="sub2">Unsere Seite</div>' + w.ours.map((e) => `<div class="row"><div class="ri"><b>${esc(e.name)}</b> <span class="sh">⚔ ${e.power} · Angriffe ${e.used}/2</span><div class="stars">Verloren: ${'⭐'.repeat(e.stars)}${'☆'.repeat(3 - e.stars)}</div></div></div>`).join('');
    return out;
  };

  // ---------- Kampf-Wiederholung ----------
  P.showReplay = function (rp) {
    if (!rp || !rp.a || !rp.d) { this.c.msg('Keine Wiederholung vorhanden.'); return; }
    this.closeReplay();
    const box = document.createElement('div'); box.id = 'replay';
    const title = rp.arena ? '🏟️ Arena' : rp.raid ? '🏴‍☠️ Piratenüberfall' : '⚔️ Angriff';
    box.innerHTML = `<div class="rpin"><div class="ph"><div class="pt">${title}: ${esc(rp.a.n)} gegen ${esc(rp.d.n)}</div><button class="x" data-a="replayClose">✕</button></div>
      <canvas id="rpc"></canvas><div class="rpres" id="rpres"></div>
      <div class="btns"><button class="btn ghost" data-a="replayAgain">▶ Nochmal</button><button class="btn" data-a="replayClose">Schließen</button></div></div>`;
    document.body.appendChild(box);
    this.rp = { data: rp, t: 0, last: performance.now() };
    const loop = (now) => {
      if (!this.rp || !document.getElementById('replay')) return;
      const st = this.rp; st.t += Math.min(0.05, (now - st.last) / 1000); st.last = now;
      drawReplay(document.getElementById('rpc'), st.data, st.t);
      const res = document.getElementById('rpres');
      if (res && st.t > 6.2 && !res.textContent) {
        const d = st.data, al = uSum(d.a.l || zeroU()), dl = uSum(d.d.l || zeroU());
        res.innerHTML = `<b style="color:${d.win ? '#ffb070' : '#8ef0a0'}">${d.win ? `${esc(d.a.n)} gewinnt` : `${esc(d.d.n)} hält stand`}</b> · Verluste: Angreifer ${al}, Verteidiger ${dl}${d.d.f ? ` · Aufstellung ${Math.round((formMul(d.d.f) - 1) * 100)} %` : ''}`;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };
  P.closeReplay = function () { const e = document.getElementById('replay'); if (e) e.remove(); this.rp = null; };

  // ---------- Aktionen ----------
  P.action2 = function (a, ds) {
    const c = this.c, o = this.o;
    switch (a) {
      case 'formSet': setRow(c, +ds.u, +ds.r); if (o.active) o.t.sync = 99; return true;
      case 'formPreset': c.s.formation = FORM_PRESETS[+ds.k].f.slice(); if (o.active) o.t.sync = 99; c.msg(`🧱 Aufstellung „${FORM_PRESETS[+ds.k].name}“ gewählt.`); return true;
      case 'gearCap': this.gearCap = ds.id; return true;
      case 'forge': { const e = forgeGear(c, ds.cap, ds.g); if (e) c.msg(e); return true; }
      case 'arenaFight': {
        const boost = mods(c).atk;
        this.run(async () => { const r = await o.arenaFight(ds.id || null, ds.bot ? +ds.bot : null, boost); c.msg(r.win ? `🏟️ Sieg! +${r.dt} Pokale` : `🏟️ Niederlage. ${r.dt} Pokale`); this.showReplay(r.replay); });
        return true;
      }
      case 'arenaClaim': this.run(async () => { const r = await o.arenaClaim(); c.msg(`🏟️ Liga-Belohnung: 🎖️ ${r.medals} · 🔩 ${r.ore || 0} · je ${Math.round(r.res)} Rohstoffe`); }); return true;
      case 'replayArena': { const l = ((o.arena || {}).log || [])[+ds.k]; if (l) this.showReplay(l.replay); return true; }
      case 'replay': {
        if (ds.id) this.run(async () => { this.showReplay(await o.replay(+ds.id)); });
        else { const r = c.s.reports[+ds.k]; if (r) this.showReplay(r.rp); }
        return true;
      }
      case 'replayAgain': if (this.rp) { this.rp.t = 0; const r = document.getElementById('rpres'); if (r) r.textContent = ''; } return true;
      case 'replayClose': this.closeReplay(); return true;
      case 'obstClear': { const id = -4000 - this.selected; if (startObst(c, id)) { /* bleibt offen */ } return true; }
      case 'sendGather': {
        const sel = this.mapSel, f = this.form.slice(); if (!sel) return true;
        const cap = this.capSel && capFree(c, this.capSel) ? this.capSel : null;
        const boost = mods(c).atk * capAtk(c, cap, c.tideState(30)), speed = mods(c).travel * fleetSpeed(c, f) * capSpeed(c, cap);
        this.run(async () => { await o.sendMarch('gather', sel.id, f, boost, speed); this.capSel = null; this.form = zeroU(); this.mapSel = null; c.msg('⛏ Sammeltrupp ist unterwegs.'); await o.loadWorld(); });
        return true;
      }
      case 'gatherRecall': this.run(async () => { await o.gatherRecall(+ds.id); c.msg('Trupp kehrt mit der Ladung heim.'); }); return true;
      case 'atab':
        this.allyTab = ds.t; this.donKind = null; this.donTo = null; this.form = zeroU();
        if (ds.t === 'help') o.helpList().then(() => (this.panelKey = null));
        if (ds.t === 'garr') o.garrisonInfo().then(() => (this.panelKey = null));
        if (ds.t === 'war') o.warInfo().then(() => (this.panelKey = null));
        if (ds.t === 'res') o.allyProjects().then(() => (this.panelKey = null));
        return true;
      case 'helpAll': case 'helpOne':
        this.run(async () => { const r = await o.helpGive(a === 'helpOne' ? +ds.id : null); c.msg(r.n ? `🤝 ${r.n}× geholfen${r.reward ? ` · +${r.reward * 15} ⚙️` : ''}` : 'Gerade gibt es nichts zu helfen.'); });
        return true;
      case 'troopReq': this.run(async () => { await o.troopRequest(); c.msg('📣 Deine Allianz wurde um Verstärkung gebeten.'); }); return true;
      case 'donTo': this.donTo = { id: ds.id, name: ds.n, free: +ds.f }; this.form = zeroU(); return true;
      case 'donToBack': this.donTo = null; return true;
      case 'donateTroops': { const to = this.donTo, f = this.form.slice(); this.run(async () => { await o.troopDonate(to.id, f); this.donTo = null; this.form = zeroU(); c.msg(`🛡️ ${uSum(f)} Krieger zu ${to.name} geschickt.`); }); return true; }
      case 'garrBack': this.run(async () => { await o.garrisonBack(ds.id); }); return true;
      case 'garrRecall': this.run(async () => { await o.call('garrison_back', { p_token: o.token, p_other: ds.id }); await o.sync(); await o.garrisonInfo(); c.msg('Deine Krieger kehren heim.'); }); return true;
      case 'warDeclare': if (this.confirm !== 'war' + ds.id) { this.confirm = 'war' + ds.id; return true; } this.confirm = null; this.run(async () => { await o.warDeclare(ds.id); c.msg('⚔️ Der Krieg ist erklärt!'); }); return true;
      case 'warGo': { this.setView('map'); this.mapSel = { type: 'player', id: ds.id }; this.form = zeroU(); return true; }
      default: return false;
    }
  };
}

// ---------- Zeichnen der Wiederholung ----------
function drawReplay(cv, d, t) {
  if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth || 320, H = cv.clientHeight || 220;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Meer und Watt
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a5f86'); g.addColorStop(1, '#0b3352');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#7a6448'; ctx.fillRect(W * 0.62, 0, W * 0.38, H);
  ctx.fillStyle = '#5c4a35'; for (let k = 0; k < 9; k++) ctx.fillRect(W * 0.62, k * H / 9 + 2, W * 0.38, 2);
  ctx.fillStyle = '#4a3a28'; ctx.fillRect(W * 0.62 - 4, 0, 6, H);
  const P = Math.min(1, Math.max(0, (t - 0.6) / 4.5)); // Kampffortschritt
  const march = Math.min(1, t / 1.6);
  const au = d.a.u || zeroU(), al = d.a.l || zeroU(), du = d.d.u || zeroU(), dl = d.d.l || zeroU(), f = d.d.f || [0, 0, 0, 0, 0];
  const cnt = (u, l, i) => Math.max(0, Math.round(u[i] - l[i] * P));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // Angreifer: Spalten von links heranrückend
  const ax0 = W * 0.08 + march * W * 0.22;
  UNITS.forEach((u, i) => {
    if (!au[i]) return;
    const n = cnt(au, al, i), y = H * (0.14 + i * 0.18), shake = P > 0 && P < 1 ? Math.sin(t * 20 + i) * 2 : 0;
    ctx.globalAlpha = n > 0 ? 1 : 0.25;
    ctx.font = '22px system-ui'; ctx.fillText(u.ic, ax0 + shake, y);
    ctx.font = 'bold 11px system-ui'; ctx.fillStyle = '#ffd9b0'; ctx.fillText(n, ax0 + shake, y + 15); ctx.fillStyle = '#fff';
  });
  // Verteidiger: 3 Reihen (vorne = nah am Rand)
  const rowX = [W * 0.68, W * 0.79, W * 0.9];
  const perRow = [0, 0, 0];
  UNITS.forEach((u, i) => {
    if (!du[i]) return;
    const r = f[i] || 0, k = perRow[r]++, y = H * (0.16 + k * 0.2), n = cnt(du, dl, i);
    ctx.globalAlpha = n > 0 ? 1 : 0.25;
    ctx.font = '22px system-ui'; ctx.fillText(u.ic, rowX[r], y);
    ctx.font = 'bold 11px system-ui'; ctx.fillStyle = '#b8f0c8'; ctx.fillText(n, rowX[r], y + 15); ctx.fillStyle = '#fff';
  });
  ctx.globalAlpha = 1;
  if (d.d.def) { ctx.font = '11px system-ui'; ctx.fillStyle = '#ffe9a8'; ctx.fillText(`🏰 Verteidigung ${d.d.def}`, W * 0.81, H - 10); ctx.fillStyle = '#fff'; }
  // Geschosse und Funken
  if (P > 0 && P < 1) {
    for (let k = 0; k < 7; k++) {
      const ph = (t * 1.3 + k * 0.37) % 1, fromA = k % 2 === 0;
      const x0 = fromA ? ax0 + 14 : rowX[2] - 10, x1 = fromA ? W * 0.66 : ax0 + 20;
      const y0 = H * (0.15 + (k % 5) * 0.18), y1 = H * (0.2 + ((k * 3) % 5) * 0.16);
      const x = x0 + (x1 - x0) * ph, y = y0 + (y1 - y0) * ph - Math.sin(ph * Math.PI) * 30;
      ctx.fillStyle = fromA ? '#ffcf7a' : '#bfe8ff'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    const mx = (ax0 + W * 0.66) / 2;
    for (let k = 0; k < 4; k++) { const a = t * 9 + k * 1.7; ctx.fillStyle = `rgba(255,${180 + k * 15},90,${0.5 + 0.5 * Math.sin(a)})`; ctx.beginPath(); ctx.arc(mx + Math.cos(a) * 18, H / 2 + Math.sin(a * 1.3) * 40, 3, 0, Math.PI * 2); ctx.fill(); }
  }
  if (t > 5.4) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, H / 2 - 22, W, 44);
    ctx.font = 'bold 20px system-ui'; ctx.fillStyle = d.win ? '#ffb070' : '#8ef0a0';
    ctx.fillText(d.win ? '⚔️ Angriff erfolgreich' : '🛡️ Verteidigung hält', W / 2, H / 2);
  }
  // Gezeiten
  if (d.tide) { ctx.font = '11px system-ui'; ctx.fillStyle = '#cfe6ea'; ctx.textAlign = 'left'; ctx.fillText(d.tide === -1 ? '🌊 Ebbe' : '🌊 Flut', 6, H - 10); }
}
export { esc, helpStep };
