// Touching grass: step away for a few minutes. The game pauses while you're out, and staying out the whole time pays.
import { bus } from '../core/bus.js';
import { SaveGame, S, baseCap } from '../core/state.js';

export const Outside = {
  on: false, since: 0, timer: 0,
  SECONDS: 180,          // a proper break
  NUDGE_AFTER: 60 * 60,  // Nan says something after an hour of play in one sitting
  session: 0, nudgedAt: 0, // seconds played since the page loaded (main.js counts them), and when Nan last nudged
  bonus: () => Math.max(10, Math.round(baseCap() * .3)),
  left() { return this.on ? Math.max(0, Math.ceil(this.SECONDS - (Date.now() - this.since) / 1000)) : 0; },
  go() {
    if (this.on) return false;
    this.on = true; this.since = Date.now();
    clearTimeout(this.timer); this.timer = setTimeout(() => this.back(), this.SECONDS * 1000);
    bus.emit('outside', { on: true });
    return true;
  },
  // coming back in: early pays nothing; the whole break pays the fresh air bonus
  back() {
    if (!this.on) return null;
    clearTimeout(this.timer); this.on = false;
    const secs = Math.round((Date.now() - this.since) / 1000), full = secs >= this.SECONDS - 1, coins = full ? this.bonus() : 0;
    if (coins) S.coins += coins;
    const life = S.life.outside = S.life.outside || { breaks: 0, full: 0 }; life.breaks++; if (full) life.full++;
    this.session = 0; this.nudgedAt = 0; SaveGame.saveNow();
    bus.emit('outside', { on: false, secs, full, coins });
    return { secs, full, coins };
  },
  // called once a second of play (main.js): after an hour in one go, Nan has a word (and again an hour later)
  tick() {
    this.session++;
    if (this.session - this.nudgedAt >= this.NUDGE_AFTER) { this.nudgedAt = this.session; bus.emit('grass:due'); }
  },
};
