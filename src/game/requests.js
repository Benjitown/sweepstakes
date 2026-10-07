// Record requests (the numbers are in src/data/jukebox.js): now and then someone in the group chat asks for a record
// that isn't on, and tips you if you put it on. This picks the record and the friend; the jukebox view asks.
import { nice, rnd } from '../core/util.js';
import { bus } from '../core/bus.js';
import { baseCap } from '../core/state.js';
import { REQUESTS } from '../data/jukebox.js';
import { REQUEST_BY } from '../content/jukebox.js';
import { Music } from '../audio/music.js';

export const Requests = {
  timer: 0,
  schedule(first) {
    clearTimeout(this.timer);
    const [lo, hi] = REQUESTS.EVERY;
    this.timer = setTimeout(() => { bus.emit('request:due'); this.schedule(); }, (first ?? lo + Math.random() * (hi - lo)) * 1000);
  },
  tip: () => nice(Math.max(5, baseCap() * REQUESTS.TIP)),
  // a request: a record on the jukebox that isn't playing, and whoever's favourite it is
  make() {
    const ids = Music.available().map(t => t.id).filter(id => id !== Music.id && REQUEST_BY[id]);
    if (!ids.length) return null;
    const id = rnd(ids);
    return { id, who: REQUEST_BY[id], tip: this.tip() };
  },
};
