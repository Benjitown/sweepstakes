// Dares from the group chat (the numbers and the tasks are in src/data/dares.js). A friend puts one to you; take it on
// and your stake goes in the pot, then do the task before the clock runs out for double back. The dare you've taken
// lives in S.dare, so it survives a reload; its clock only runs while you're playing (wiring.js ticks it).
import { nice, rnd } from '../core/util.js';
import { bus } from '../core/bus.js';
import { S, SaveGame, baseCap } from '../core/state.js';
import { DARES, DARE_BY, DARE } from '../data/dares.js';
import { Game } from './game.js';

// has this event done the dare? (d is the dare in hand: d.wins counts winning boards in a row)
// the lifetime record: dares taken, won, lost and turned down
const dareLife = () => (S.life.dares = S.life.dares || { taken: 0, won: 0, lost: 0, nah: 0 });
const DARE_DONE = {
  x3: (ev, { b, mult }) => ev === 'cashout' && b.human && mult >= 3,
  clean: (ev, { b, why }) => ev === 'cashout' && b.human && why === 'clear' && !b.flagged,
  three: (ev, { b, profit }, d) => {
    if (!b.human) return false;
    if (ev === 'boom') d.wins = 0; else if (ev === 'cashout') d.wins = profit > 0 ? (d.wins || 0) + 1 : 0;
    return d.wins >= 3;
  },
  gem: (ev, { b }) => ev === 'gem' && b.human,
  quick: (ev, { b, profit }) => ev === 'cashout' && b.human && profit > 0 && b.t0 > 0 && Date.now() - b.t0 <= 15000,
};

export const Dares = {
  timer: 0, offer: null, rng: Math.random,
  schedule(first) {
    clearTimeout(this.timer);
    const [lo, hi] = DARE.EVERY;
    this.timer = setTimeout(() => { bus.emit('dare:due'); this.schedule(); }, (first ?? lo + this.rng() * (hi - lo)) * 1000);
  },
  stake: () => nice(Math.max(DARE.MIN, Math.min(baseCap(), S.coins * DARE.SHARE))),
  canOffer: () => !S.dare && !Dares.offer && S.coins >= DARE.MIN * 10,
  // a friend puts a dare to you (id for the tests; otherwise any dare, from anyone but Nan)
  make(id, who) {
    const d = DARE_BY[id] || DARES[Math.floor(this.rng() * DARES.length)];
    this.offer = { id: d.id, task: d.task, secs: d.secs, who: who || rnd(DARE.WHO), stake: this.stake(), at: Date.now() };
    bus.emit('dare:offer', this.offer);
    return this.offer;
  },
  // you're on: the stake goes in the pot
  accept() {
    const o = this.offer; if (!o || S.dare || S.coins < o.stake) return false;
    this.offer = null;
    Game.setCoins(S.coins - o.stake);
    S.dare = { ...o, left: o.secs, wins: 0 };
    dareLife().taken++;
    SaveGame.saveNow(); bus.emit('dare:on', S.dare);
    return true;
  },
  // nah (or no answer in time)
  decline(why = 'nah') {
    const o = this.offer; if (!o) return false;
    this.offer = null;
    if (why === 'nah') { dareLife().nah++; SaveGame.save(); }
    bus.emit('dare:declined', { ...o, why });
    return true;
  },
  // every game event that could do it (wiring.js sends cash-outs, booms and gems)
  check(ev, data) {
    const d = S.dare; if (!d || !data || !data.b) return false;
    if (DARE_DONE[d.id](ev, data, d)) { this.win(); return true; }
    return false;
  },
  // a second of play off the clock
  second() {
    const d = S.dare; if (!d) return;
    if (--d.left <= 0) this.lose();
  },
  win() {
    const d = S.dare; if (!d) return;
    S.dare = null;
    const pay = d.stake * 2;
    dareLife().won++;
    Game.setCoins(S.coins + pay, true);
    SaveGame.saveNow(); bus.emit('dare:won', { ...d, pay });
  },
  lose() {
    const d = S.dare; if (!d) return;
    S.dare = null; dareLife().lost++;
    SaveGame.saveNow(); bus.emit('dare:lost', d);
  },
};
