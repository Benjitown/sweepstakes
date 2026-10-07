// The landlord's specials (the numbers are in src/data/specials.js): which boards get one, how long's left on
// Against the Clock, and whether the doors are still locked on a Lock-in. The factory chalks the special on the board;
// game.js pays Double Trouble's risky digs, keeps a Lock-in shut and gives Happy Hour's stake back; payout.js pays the
// clock's and the Lock-in's bonuses; wiring.js cashes a clock board out when its time's up.
import { SPECIAL, SPECIALS, SPECIAL_BY } from '../data/specials.js';

export const Specials = {
  rng: Math.random,
  force: null, // a special for every board ('' for none): the tests use it
  // the special for a board about to be dealt ('' for none); a golden board's special enough already
  roll(golden) {
    if (this.force !== null) return SPECIAL_BY[this.force] ? this.force : '';
    if (golden || this.rng() >= SPECIAL.CHANCE) return '';
    let x = this.rng() * SPECIALS.reduce((t, s) => t + s.w, 0);
    for (const s of SPECIALS) { x -= s.w; if (x <= 0) return s.id; }
    return SPECIALS[SPECIALS.length - 1].id;
  },
  // Against the Clock: seconds left on board b (null if it isn't one, or the clock hasn't started)
  left(b) { return b.special !== 'clock' || !b.started || !b.t0 ? null : Math.max(0, SPECIAL_BY.clock.secs - (Date.now() - b.t0) / 1000); },
  // The Lock-in: are the doors still locked on board b (no cashing out till half of it's dug)?
  locked(b) { return b.special === 'lockin' && !b.over && b.frac() < SPECIAL_BY.lockin.frac; },
  // ...and how many more tiles till they open
  toGo(b) {
    if (!this.locked(b) || !b.started) return 0;
    return Math.max(1, Math.ceil(b.base + SPECIAL_BY.lockin.frac * (b.safe - b.base) - b.revealed - 1e-9));
  },
};
