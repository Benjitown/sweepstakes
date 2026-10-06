// Confetti and flying coins, drawn on one canvas.
import { $, rnd, reduced } from '../core/util.js';

export const FX = (() => {
  const cv = $('#fx'), ctx = cv.getContext('2d'); let parts = [], coins = [], running = false;
  const cols = ['#fe5f55', '#009dff', '#3fc18a', '#ffd23f', '#ffa31a', '#a275f0'];
  const size = () => { const w = innerWidth * devicePixelRatio, h = innerHeight * devicePixelRatio; if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } };
  function loop(now) {
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life-- > 0 && p.y < innerHeight + 40);
    for (const p of parts) {
      if (p.wait > 0) { p.wait--; continue; }
      p.vy += p.g ?? .45; p.vx *= p.drag ?? .985; if (p.drag) p.vy *= p.drag; p.x += p.vx; p.y += p.vy;
      const s = Math.round(p.r); ctx.fillStyle = '#141b1d'; ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, s + 2, s + 2);
      ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    }
    coins = coins.filter(c => {
      const t = (now - c.t0) / c.dur; if (t < 0) return true;
      if (t >= 1) { if (c.land) c.land(); return false; }
      const e = t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2, u = 1 - e;
      const x = u * u * c.x0 + 2 * u * e * c.cx + e * e * c.x1, y = u * u * c.y0 + 2 * u * e * c.cy + e * e * c.y1, r = c.r * (1 - .35 * e);
      ctx.fillStyle = '#141b1d'; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff6b0'; ctx.fillRect(Math.round(x - r * .45), Math.round(y - r * .5), Math.max(2, r * .35), Math.max(2, r * .35));
      return true;
    });
    if (parts.length || coins.length) requestAnimationFrame(loop); else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  const go = () => { if (!running) { running = true; size(); requestAnimationFrame(loop); } };
  const center = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, ok: r.width > 0 && r.bottom > 0 && r.top < innerHeight }; };
  return {
    confetti(n = 140, from) {
      if (reduced) return; size();
      const ox = from ? from.x : innerWidth / 2, oy = from ? from.y : innerHeight * .45;
      for (let k = 0; k < n; k++) parts.push({ x: ox + (Math.random() - .5) * 200, y: oy, vx: (Math.random() - .5) * 16, vy: -Math.random() * 15 - 4, r: Math.random() * 5 + 4, c: rnd(cols), life: 90 + Math.random() * 50 });
      go();
    },
    // Bonfire Night: n bursts across the top of the screen, one after another
    fireworks(n = 3) {
      if (reduced) return; size();
      for (let k = 0; k < n; k++) {
        const x = innerWidth * (.15 + Math.random() * .7), y = innerHeight * (.12 + Math.random() * .28), c = rnd(cols), m = 36 + Math.floor(Math.random() * 18), wait = k * 22;
        for (let j = 0; j < m; j++) {
          const a = j / m * Math.PI * 2 + Math.random() * .2, v = 2.5 + Math.random() * 3.5;
          parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 2 + 3, c, g: .06, drag: .955, wait, life: wait + 55 + Math.random() * 30 });
        }
      }
      go();
    },
    // Coins fly from an element (or point) to the bank. Returns how long until the first and last land.
    coins(from, n, onLand) {
      const bank = $('#bank svg') || $('#bank'); if (!bank) return { first: 0, last: 0 };
      const a = from && from.getBoundingClientRect ? center(from) : from, b = center(bank);
      if (reduced || !a || !a.ok || coins.length > 160) n = 0;
      const now = performance.now(), stagger = 45, flight = 620;
      for (let k = 0; k < n; k++) {
        const x0 = a.x + (Math.random() - .5) * 40, y0 = a.y + (Math.random() - .5) * 24;
        coins.push({ x0, y0, x1: b.x, y1: b.y, cx: (x0 + b.x) / 2 + (Math.random() - .5) * 260, cy: Math.min(y0, b.y) - 80 - Math.random() * 140,
          r: 7 + Math.random() * 3, t0: now + k * stagger, dur: flight + Math.random() * 120, land: () => onLand && onLand(k) });
      }
      if (n) go();
      return { first: n ? flight : 0, last: n ? flight + (n - 1) * stagger + 120 : 0 };
    },
  };
})();
