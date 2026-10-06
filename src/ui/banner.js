// Big announcements: BIG WIN, JACKPOT, LEVEL UP.
import { $, esc } from '../core/util.js';

// Only one banner at a time: an optional one is skipped if another is up, a forced one (level up, jackpot) waits its turn.
export const Banner = {
  last: 0, timer: 0, until: 0, queue: [],
  show(text, sub = '', tone = 'gold', force = false) {
    const now = performance.now();
    if (now < this.until) { if (force && this.queue.length < 3) this.queue.push([text, sub, tone]); return false; }
    if (!force && now - this.last < 1200) return false;
    this.last = now; this.until = now + 1700;
    const el = $('#banner');
    el.className = 'banner ' + tone; el.innerHTML = `<b>${esc(text)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`;
    el.hidden = false; void el.offsetWidth; el.classList.add('show');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      el.hidden = true; el.classList.remove('show'); this.until = 0;
      const next = this.queue.shift(); if (next) this.show(...next, true);
    }, 1700);
    return true;
  },
};
