// Sunday dinner at Nan's (the numbers are in src/data/sunday.js): once on a Sunday, a little way into playing, Nan
// asks you round. Go, and you're full of roast (board/payout.js adds it to your next winning cash-outs); say you can't,
// or don't answer, and she plates some up for you anyway. src/ui/sunday-view.js shows it all.
import { bus } from '../core/bus.js';
import { S, SaveGame } from '../core/state.js';
import { SUNDAY } from '../data/sunday.js';

const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export const Sunday = {
  timer: 0,
  force: null, // tests: true or false pretends today is or isn't a Sunday
  today() { return this.force ?? new Date().getDay() === 0; },
  life() { return (S.life.sunday = S.life.sunday || { dinners: 0, plates: 0, last: '' }); },
  asked() { return this.life().last === dayKey(); }, // has she asked today?
  // on a Sunday she asks a little way in; any other day, look again in an hour (in case it's Saturday night)
  schedule() {
    clearTimeout(this.timer);
    if (this.asked()) return;
    const [lo, hi] = SUNDAY.AFTER;
    this.timer = this.today() ? setTimeout(() => bus.emit('sunday:due'), (lo + Math.random() * (hi - lo)) * 1000)
      : setTimeout(() => this.schedule(), 3600e3);
  },
  later(s = 60) { clearTimeout(this.timer); this.timer = setTimeout(() => bus.emit('sunday:due'), s * 1000); }, // busy right now: in a minute
  ask() { this.life().last = dayKey(); SaveGame.saveNow(); },
  // you went round: a full plate
  go() { this.life().dinners++; S.roast = (S.roast || 0) + SUNDAY.BOARDS; SaveGame.saveNow(); bus.emit('sunday', { went: true }); },
  // you couldn't (or didn't answer): she keeps a plate warm for you
  plate() { this.life().plates++; S.roast = (S.roast || 0) + SUNDAY.PLATE; SaveGame.saveNow(); bus.emit('sunday', { went: false }); },
};
