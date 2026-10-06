// The free spin wheel.
import { $, fmt, esc, reduced } from '../core/util.js';
import { WHEEL } from '../data/wheel.js';
import { bus } from '../core/bus.js';
import { SaveGame, S, baseCap } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Game } from '../game/game.js';
import { UI } from './ui.js';

export const SpinView = {
  pending: null,
  label(w, base) {
    return { coins: `+${fmt(base * w.x)}`, jackpot: `JACKPOT ×${w.x}`, golden: 'GOLDEN ×2', shield: '+2 SHIELDS', probe: '+3 PROBES', card: 'FREE CARD' }[w.k];
  },
  svg(base) {
    const R = 130, cx = 140, cy = 140, n = WHEEL.length;
    let s = `<svg viewBox="0 0 280 290" class="wheelsvg" aria-hidden="true"><g id="wheelRot" transform="rotate(${(S.wheel % 360).toFixed(2)} ${cx} ${cy})">`;
    WHEEL.forEach((w, k) => {
      const a0 = (k / n) * 2 * Math.PI - Math.PI / 2, a1 = ((k + 1) / n) * 2 * Math.PI - Math.PI / 2;
      const p = a => `${(cx + R * Math.cos(a)).toFixed(1)} ${(cy + R * Math.sin(a)).toFixed(1)}`;
      s += `<path d="M${cx} ${cy}L${p(a0)}A${R} ${R} 0 0 1 ${p(a1)}Z" fill="${w.col}" stroke="#141b1d" stroke-width="3"/>`;
      const mid = (k + .5) * 360 / n;
      s += `<g transform="rotate(${mid} ${cx} ${cy})"><text x="${cx}" y="${cy - 40}" transform="rotate(-90 ${cx} ${cy - 40})" class="wl${w.k === 'golden' ? ' dark' : ''}" text-anchor="start" dominant-baseline="middle">${esc(this.label(w, base))}</text></g>`;
    });
    s += `</g><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#141b1d" stroke-width="6"/>`;
    for (let k = 0; k < n; k++) { const a = (k / n) * 2 * Math.PI - Math.PI / 2; s += `<circle cx="${(cx + (R - 4) * Math.cos(a)).toFixed(1)}" cy="${(cy + (R - 4) * Math.sin(a)).toFixed(1)}" r="3.5" fill="#fff" stroke="#141b1d" stroke-width="1.5"/>`; }
    s += `<circle cx="${cx}" cy="${cy}" r="30" fill="#35474c" stroke="#141b1d" stroke-width="4"/><use href="#i-bomb" x="${cx - 22}" y="${cy - 24}" width="44" height="44"/>
      <path d="M${cx - 15} 2 H${cx + 15} L${cx} 30 Z" fill="#fe5f55" stroke="#141b1d" stroke-width="4" stroke-linejoin="round"/></svg>`;
    return s;
  },
  open() {
    const base = baseCap();
    UI.modal(`<h3>Free spin</h3><div class="wheel">${this.svg(base)}</div><p class="wres" id="wres">Twelve slices, all the same size. What you see is what you get.</p>
      <div class="row"><button class="btn gold big" type="button" id="spinGo">Spin it</button><button class="btn ghost" type="button" data-a="close">Later</button></div>`, { close: () => UI.closeModal() });
    $('#spinGo').onclick = () => this.go();
  },
  go() {
    const prize = Game.spin(); if (!prize) return;
    const go = $('#spinGo'); go.disabled = true; go.textContent = 'Spinning…'; UI.modalLocked = true;
    const close = $('[data-a="close"]', UI.el.box); if (close) close.hidden = true;
    const n = WHEEL.length, slice = 360 / n, from = S.wheel % 360;
    const targetMod = ((-(prize.k + .5) * slice + (Math.random() - .5) * slice * .7) % 360 + 360) % 360;
    const to = from + 360 * 5 + ((targetMod - from) % 360 + 360) % 360;
    const rot = $('#wheelRot'), T = reduced ? 1 : 4200, t0 = performance.now();
    let lastSeg = Math.floor(from / slice);
    const frame = now => {
      if (!rot.isConnected) return;
      const t = Math.min(1, (now - t0) / T), e = 1 - Math.pow(1 - t, 4), a = from + (to - from) * e;
      rot.setAttribute('transform', `rotate(${a.toFixed(2)} 140 140)`);
      const seg = Math.floor(a / slice); if (seg !== lastSeg) { lastSeg = seg; Sound.wheel(1 - t); }
      if (t < 1) requestAnimationFrame(frame); else this.land(prize, to);
    };
    requestAnimationFrame(frame);
  },
  land(prize, angle) {
    S.wheel = angle % 360; SaveGame.save();
    $('#wres').innerHTML = `<b>${esc(prize.text)}</b>`;
    const go = $('#spinGo'); go.disabled = false; go.textContent = 'Nice'; UI.modalLocked = false;
    this.pending = prize; go.onclick = () => UI.closeModal();
    bus.emit('spin:landed', { prize, from: $('.wheel', UI.el.box) });
  },
};
