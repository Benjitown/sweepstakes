// The storm on screen: rain down the window, the room a shade darker, and lightning. Each flash shows every hidden
// mine on your live boards for a split second, then thunder rolls in a few seconds behind (straight away for a strike).
// The flash is one soft pulse, never a strobe; with reduced motion it's fainter and the rain doesn't move.
import { reduced } from '../core/util.js';
import { WeirdNoises } from '../audio/noises.js';
import { Game } from '../game/game.js';

export const StormView = {
  el: null, rain: null,
  FLASH_MS: 260, // how long the mines show for
  on() {
    if (this.el) return;
    const el = this.el = document.createElement('div'); el.className = 'storm'; el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    this.rain = WeirdNoises.play('rain');
  },
  flash({ strike }) {
    // the sky lights up
    const f = document.createElement('div'); f.className = 'lightning' + (strike ? ' strike' : '') + (reduced ? ' soft' : ''); f.setAttribute('aria-hidden', 'true');
    document.body.appendChild(f); setTimeout(() => f.remove(), 900);
    // and so do the mines
    const lit = this.light();
    setTimeout(() => lit.forEach(c => c.classList.remove('lit')), this.FLASH_MS * (reduced ? 1.5 : 1));
    // thunder: right overhead for a strike, otherwise a few seconds behind
    if (strike) WeirdNoises.play('crack'); else setTimeout(() => WeirdNoises.play('thunder'), 600 + Math.random() * 2400);
    return lit.length;
  },
  // every hidden, unflagged mine on a board that's being played
  light() {
    const lit = [];
    for (const b of Game.slots) {
      if (!b || !b.started || b.over || !b.cells) continue;
      for (let i = 0; i < b.n; i++) if (b.mine[i] && !b.open[i] && !b.flag[i] && b.cells[i]) { b.cells[i].classList.add('lit'); lit.push(b.cells[i]); }
    }
    return lit;
  },
  // after the storm, sometimes: a rainbow across the sky for a while
  rainbow() {
    const old = document.querySelector('.rainbow'); if (old) old.remove();
    const el = document.createElement('div'); el.className = 'rainbow'; el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el); setTimeout(() => el.remove(), 20000);
    return el;
  },
  off() {
    if (this.rain) { this.rain.stop(); this.rain = null; }
    const el = this.el; this.el = null;
    if (el) { if (reduced) el.remove(); else { el.classList.add('clearing'); setTimeout(() => el.remove(), 1600); } }
  },
};
