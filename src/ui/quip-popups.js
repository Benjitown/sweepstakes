// Flashes the random nonsense on screen.
import { rnd } from '../core/util.js';
import { QUIPS, RUDE_QUIPS } from '../content/quips.js';
import { pref } from '../core/state.js';
import { AudioEngine } from '../audio/engine.js';
import { Sound } from '../audio/sound.js';
import { Coach } from './tutorial.js';

export const Quips = {
  last: 0, bag: [],
  show(x, y) {
    if (!pref('quips') || !AudioEngine.get().unlocked || Coach.active) return;
    const now = performance.now(); if (now - this.last < 9000) return; this.last = now;
    if (!this.bag.length) this.bag = QUIPS.concat(pref('rude') ? RUDE_QUIPS : []).sort(() => Math.random() - .5);
    const d = document.createElement('div'); d.className = 'quip'; d.setAttribute('aria-hidden', 'true'); d.textContent = this.bag.pop();
    d.style.setProperty('--qc', rnd(['var(--purple)', 'var(--red)', 'var(--blue)', 'var(--green)', 'var(--orange)']));
    d.style.setProperty('--qr', (Math.random() * 12 - 6).toFixed(1) + 'deg');
    const half = Math.min(170, innerWidth * .44);
    const px = x ?? innerWidth * (.3 + Math.random() * .4), py = y ?? innerHeight * (.25 + Math.random() * .5);
    d.style.left = Math.min(innerWidth - half, Math.max(half, px)) + 'px';
    d.style.top = Math.min(innerHeight - 60, Math.max(60, py - 50)) + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 1950);
    Sound.quip();
  },
  maybe(chance, x, y) { if (Math.random() < chance) this.show(x, y); },
};
