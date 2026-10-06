// Big announcements: BIG WIN, JACKPOT, LEVEL UP.
import { $, esc } from '../core/util.js';

export const Banner = {
  last: 0, timer: 0,
  show(text, sub = '', tone = 'gold', force = false) {
    const now = performance.now(); if (!force && now - this.last < 1200) return false; this.last = now;
    const el = $('#banner');
    el.className = 'banner ' + tone; el.innerHTML = `<b>${esc(text)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`;
    el.hidden = false; void el.offsetWidth; el.classList.add('show');
    clearTimeout(this.timer); this.timer = setTimeout(() => { el.hidden = true; el.classList.remove('show'); }, 1700);
    return true;
  },
};
