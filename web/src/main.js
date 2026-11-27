// Einstieg: Renderer, Spiel, Welt, Oberfläche, Steuerung und Hauptschleife.
import { Renderer } from './renderer.js';
import { Colony } from './game.js';
import { World } from './world.js';
import { UI } from './ui.js';
import { Graphics } from './gfx.js';
import { Online } from './online.js';
import { Sound } from './sound.js';
import { DEFS, UNITS, fmtTime } from './game.js';

function fail(msg) {
  const e = document.getElementById('err');
  e.style.display = 'flex';
  e.querySelector('p').textContent = msg;
}

function start() {
  const canvas = document.getElementById('c');
  let r;
  try { r = new Renderer(canvas); } catch (e) { fail(e.message); return; }
  const colony = new Colony();
  const online = new Online(colony);
  colony.online = online;
  const world = new World(r, colony);
  const gfx = new Graphics(world, r.gl.getParameter(r.gl.MAX_TEXTURE_SIZE));
  const ui = new UI(colony, world, gfx, online);
  window.__game = { colony, world, gfx, ui, online };
  window.__save = () => colony.save();
  const sound = new Sound(colony, online);
  window.__game.sound = sound;
  // Benachrichtigungen planen, wenn die App in den Hintergrund geht (nur in der App mit neuer APK)
  window.__notify = () => {
    const N = window.PfNative; if (!N || localStorage.getItem('pf_notify') === '0') return;
    try {
      N.cancelAll();
      const s = colony.s, list = [];
      s.plots.forEach((p) => { if (p.type >= 0 && p.buildLeft > 5) list.push([p.buildLeft, '🏗️ Bau fertig', `${DEFS[p.type].name} ${p.level > 0 ? 'ist jetzt Stufe ' + (p.level + 1) : 'ist fertig gebaut'}.`]); });
      if (s.train.length) { const all = s.train.reduce((a, x, k) => a + (k === 0 ? x.left + (x.n - 1) * x.per : x.n * x.per), 0); list.push([all, '⚔️ Ausbildung fertig', 'Deine Krieger sind fertig ausgebildet.']); }
      if (s.expLeft > 5) list.push([s.expLeft, '🧭 Wattwanderung zurück', 'Deine Bewohner sind mit Beute zurück.']);
      if (online.active) {
        const now = online.serverNow();
        for (const m of online.marches || []) {
          const t = (Date.parse(m.status === 'back' ? m.back_at : m.arrive) - now) / 1000;
          if (t > 5) list.push([t, m.status === 'back' ? '⛵ Truppen zurück' : m.kind === 'scout' ? '🔭 Späherbericht' : '⚔️ Angriff erreicht das Ziel', m.status === 'back' ? 'Deine Krieger sind heimgekehrt.' : 'Schau in die Kampfberichte!']);
        }
      } else for (const m of s.marches) if (m.left > 5) list.push([m.left, m.phase === 'back' ? '⛵ Truppen zurück' : '⚔️ Trupp am Ziel', 'Schau in die Kampfberichte!']);
      for (const m of s.botMarches || []) if (m.left > 5) list.push([m.left, m.phase === 'back' ? '⛵ Truppen zurück' : '🏴‍☠️ Piratenschiff erreicht', m.phase === 'back' ? 'Deine Krieger sind mit Beute zurück.' : 'Der Kampf beginnt – schau in die Berichte!']);
      if (s.trader && s.trader.left <= 0 && s.trader.next > 5) list.push([s.trader.next, '⛵ Händlerschiff', 'Ein Händler hat am Steg angelegt – nur kurz!']);
      list.push([20 * 3600, '🏝️ Deine Pfahlstadt wartet', 'Deine Tagesbelohnung liegt bereit!']);
      list.sort((a, b) => a[0] - b[0]).slice(0, 30).forEach((n, i) => N.schedule(i + 1, n[0], n[1], n[2]));
    } catch (e) { /* */ }
  };

  // ---- Steuerung: 1 Finger ziehen = verschieben, 1 Finger kurz halten + ziehen = drehen und neigen,
  //      2 Finger = zoomen, Tippen = wählen ----
  const ptrs = new Map();
  let moved = 0, pinch = 0, rot = false, holdT = null;
  const hint = document.createElement('div'); hint.id = 'rotHint'; hint.textContent = '⟲ Drehen & Neigen'; document.body.appendChild(hint);
  const showHint = (on, x, y) => { hint.style.display = on ? 'block' : 'none'; if (on) { hint.style.left = x + 'px'; hint.style.top = (y - 70) + 'px'; } };
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    clearTimeout(holdT);
    if (ptrs.size === 1) {
      moved = 0; rot = false;
      holdT = setTimeout(() => {
        if (ptrs.size === 1 && moved < 8) { rot = true; const p = [...ptrs.values()][0]; showHint(true, p.x, p.y); try { navigator.vibrate && navigator.vibrate(15); } catch (er) { /* */ } }
      }, 380);
    }
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); moved = 999; rot = false; showHint(false); }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 1) {
      moved += Math.abs(dx) + Math.abs(dy);
      if (rot) { world.rotate(dx, dy, canvas.clientHeight); showHint(true, p.x, p.y); }
      else if (moved > 10) { clearTimeout(holdT); world.pan(dx, dy, canvas.clientHeight); }
    } else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0 && d > 0) world.zoom(pinch / d);
      pinch = d;
    }
  });
  const up = (e) => {
    const p = ptrs.get(e.pointerId);
    ptrs.delete(e.pointerId);
    clearTimeout(holdT);
    if (!p) return;
    if (ptrs.size === 0 && moved <= 10 && !rot && e.type === 'pointerup') {
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1, ny = 1 - ((e.clientY - rect.top) / rect.height) * 2;
      if (ui.view === 'city') ui.select(world.pick(nx, ny));
    }
    if (ptrs.size === 0) { rot = false; showHint(false); }
    if (ptrs.size === 1) moved = 999;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); world.zoom(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });

  // ---- Speichern & Offline-Fortschritt ----
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { colony.save(); online.sync(); window.__notify(); }
    else { colony.catchUp(); last = performance.now(); online.sync(); if (window.PfNative) try { window.PfNative.cancelAll(); } catch (e) { /* */ } }
  });
  window.addEventListener('pagehide', () => colony.save());
  setInterval(() => colony.save(), 30000);

  // ---- Hauptschleife ----
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    colony.tick(dt);
    world.update(dt);
    gfx.update(dt, colony);
    online.update(dt);
    sound.update(dt, world.time);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const [w, h] = gfx.size(cw, ch);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    r.render(world.scene(cw / Math.max(1, ch)));
    ui.update(cw, ch, dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.getElementById('loading').remove();
  const updNote = new URLSearchParams(location.search).get('update');
  if (updNote === 'updated') colony.msg(`Update installiert: ${(window.APP_VERSION || {}).name || 'neue Version'} ✓`);
  if (updNote === 'shell') colony.msg('Es gibt ein größeres Update – bitte die neue APK einmal installieren.');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
