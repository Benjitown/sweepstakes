// Thunderstorms: a couple of minutes of rain, and every so often a flash of lightning that lights up every hidden mine
// on the table for a split second (remember where they were). Sometimes one strike lands close enough to take the
// power out. src/ui/storm-view.js draws it; wiring.js starts one off the back of distant thunder.
import { bus } from '../core/bus.js';
import { SaveGame, S } from '../core/state.js';

export const Storm = {
  on: false, until: 0, timer: 0, flashTimer: 0, lastFlash: 0, flashes: 0, strikeAt: -1,
  SECONDS: 100,     // how long it rains
  FIRST: 4,         // seconds to the first flash
  GAP: [7, 13],     // seconds between flashes
  STRIKE: 1 / 3,    // the chance that one of the flashes is a strike right overhead
  RAINBOW: .5,      // and the chance of a rainbow when it's passed (a pot of gold: your next board's golden)
  rng: Math.random, // the tests swap this
  left() { return this.on ? Math.max(0, Math.ceil((this.until - Date.now()) / 1000)) : 0; },
  start(seconds = this.SECONDS) {
    if (this.on) return false;
    this.on = true; this.until = Date.now() + seconds * 1000; this.flashes = 0; this.lastFlash = 0;
    this.strikeAt = this.rng() < this.STRIKE ? 2 + Math.floor(this.rng() * 4) : -1; // which flash (if any) hits close by
    clearTimeout(this.timer); this.timer = setTimeout(() => this.end(), seconds * 1000);
    this.next(this.FIRST);
    const h = S.life.house = S.life.house || {}; h.storm = (h.storm || 0) + 1; SaveGame.save();
    bus.emit('storm', { on: true, seconds });
    return true;
  },
  next(seconds) { clearTimeout(this.flashTimer); this.flashTimer = setTimeout(() => this.flash(), seconds * 1000); },
  flash() {
    if (!this.on) return null;
    this.lastFlash = Date.now(); this.flashes++;
    const strike = this.flashes === this.strikeAt;
    bus.emit('storm:flash', { strike, n: this.flashes });
    const [lo, hi] = this.GAP; this.next(lo + this.rng() * (hi - lo));
    return { strike, n: this.flashes };
  },
  // a flash in the last couple of seconds: what Lightning Reflexes wants you to act on
  recent: (ms = 2000) => Storm.lastFlash > 0 && Date.now() - Storm.lastFlash <= ms,
  end() {
    if (!this.on) return false;
    clearTimeout(this.timer); clearTimeout(this.flashTimer); this.on = false;
    const rainbow = this.rng() < this.RAINBOW;
    if (rainbow) { S.goldNext++; const h = S.life.house = S.life.house || {}; h.rainbows = (h.rainbows || 0) + 1; SaveGame.save(); }
    bus.emit('storm', { on: false, flashes: this.flashes, rainbow });
    return true;
  },
};
