// Einstieg: Renderer, Spiel, Welt, Oberfläche, Steuerung und Hauptschleife.
import { Renderer } from './renderer.js';
import { Colony } from './game.js';
import { World } from './world.js';
import { UI } from './ui.js';
import { Graphics } from './gfx.js';
import { Online } from './online.js';

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

  // ---- Steuerung: 1 Finger verschieben, 2 Finger zoomen, Tippen wählen ----
  const ptrs = new Map();
  let moved = 0, pinch = 0;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) moved = 0;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); moved = 999; }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 1) {
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 10) world.pan(dx, dy, canvas.clientHeight);
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
    if (!p) return;
    if (ptrs.size === 0 && moved <= 10 && e.type === 'pointerup') {
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1, ny = 1 - ((e.clientY - rect.top) / rect.height) * 2;
      if (ui.view === 'city') ui.select(world.pick(nx, ny));
    }
    if (ptrs.size === 1) moved = 999;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); world.zoom(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });

  // ---- Speichern & Offline-Fortschritt ----
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { colony.save(); online.sync(); }
    else { colony.catchUp(); last = performance.now(); online.sync(); }
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
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const [w, h] = gfx.size(cw, ch);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    r.render(world.scene(cw / Math.max(1, ch)));
    ui.update(cw, ch, dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.getElementById('loading').remove();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
