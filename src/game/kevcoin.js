// KEVCOIN: Kev's cryptocurrency, traded from the group chat. The price wanders (downhill, on average), Kev hypes it now
// and then (a pump follows, or a dump, and you can't tell which from the post), and once in a while the devs vanish
// and it's rug-pulled; a while later Kev relaunches it as KEVCOIN 2.0 and your old coins are worth nothing. He takes
// 5% of every trade. Lives in the run (S.kev), so going bust loses your holdings like everything else.
import { KEV } from '../data/kevcoin.js';
import { bus } from '../core/bus.js';
import { SaveGame, S, baseCap } from '../core/state.js';

const between = ([lo, hi], r) => lo + (hi - lo) * r;

export const Kev = {
  rng: Math.random, // the tests swap this
  secs: 0,          // seconds of play this page load, towards the next tick (and the launch)
  launched: () => !!S.kev,
  state() { return S.kev; },
  launch() {
    if (S.kev) return false;
    S.kev = { v: 1, price: KEV.START, hist: [KEV.START], units: 0, paid: 0, ticks: 0, path: [], hype: null, dead: 0,
      nextHype: Math.round(between(KEV.HYPE_EVERY, this.rng() * .5)) };
    SaveGame.save(); bus.emit('kev:launch');
    return true;
  },
  // called once a second of play (wiring.js, on 'tick')
  second() {
    if (!S.kev) { if (++this.secs >= KEV.LAUNCH_AFTER) { this.secs = 0; this.launch(); } return; }
    if (++this.secs >= KEV.TICK_S) { this.secs = 0; this.tick(); }
  },
  gauss() { let u = 0, v = 0; while (!u) u = this.rng(); v = this.rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
  tick() {
    const k = S.kev; if (!k) return null;
    k.ticks++;
    if (k.dead) { k.dead--; this.record(k); if (!k.dead) this.relaunch(); return k.price; }
    let r = KEV.DRIFT + KEV.VOL * this.gauss();
    if (k.path.length) { r += k.path.shift(); if (!k.path.length) k.hype = null; }
    else if (k.ticks >= k.nextHype) { this.hype(); r += k.path.shift(); }
    k.price = Math.max(1e-6, k.price * Math.exp(r));
    this.record(k);
    if (this.rng() < KEV.RUG) this.rug();
    return k.price;
  },
  record(k) { k.hist.push(k.price); if (k.hist.length > KEV.HIST) k.hist.shift(); bus.emit('kev:tick', { price: k.price }); },
  // Kev posts in the chat; what happens next is already decided: a pump (climb, then give half back) or a dump (mostly at
  // once). Nothing moves on the tick he posts, so buying on the post really is a coin toss.
  hype() {
    const k = S.kev, pump = this.rng() < KEV.PUMP, n = Math.round(between(KEV.HYPE_TICKS, this.rng()));
    if (pump) {
      const up = Math.log(1 + between(KEV.PUMP_SIZE, this.rng()));
      k.path = [0, ...Array(n).fill(up / n), ...Array(n).fill(-up / 2 / n)];
    } else {
      const down = Math.log(1 - between(KEV.DUMP_SIZE, this.rng()));
      k.path = [0, down * .6, ...Array(n - 1).fill(down * .4 / (n - 1))];
    }
    k.hype = pump ? 'pump' : 'dump';
    k.nextHype = k.ticks + Math.round(between(KEV.HYPE_EVERY, this.rng()));
    bus.emit('kev:hype', { pump });
  },
  rug() {
    const k = S.kev; if (!k || k.dead) return;
    const lost = this.value();
    if (k.units > 0) this.life().rugged++;
    k.price *= KEV.RUG_TO; k.dead = KEV.DEAD_TICKS; k.path = []; k.hype = null;
    this.record(k); SaveGame.save();
    bus.emit('kev:rug', { held: k.units > 0, lost });
  },
  relaunch() {
    const k = S.kev, burned = k.units > 0;
    Object.assign(k, { v: k.v + 1, price: KEV.START, hist: [KEV.START], units: 0, paid: 0, path: [], hype: null, dead: 0 });
    SaveGame.save(); bus.emit('kev:relaunch', { v: k.v, burned });
  },
  value() { const k = S.kev; return k ? Math.floor(k.units * k.price) : 0; },
  cap: () => Math.round(baseCap() * KEV.CAP),
  room() { const k = S.kev; return k ? Math.max(0, Math.floor((this.cap() - k.units * k.price) / (1 - KEV.FEE))) : 0; }, // coins you can still put in (after Kev's cut, that fills the cap)
  // buy `coins` worth (Kev keeps 5%); returns what you got, or null
  buy(coins) {
    const k = S.kev; if (!k || k.dead) return null;
    coins = Math.floor(Math.min(coins, S.coins, this.room()));
    if (coins < 1) return null;
    const units = coins * (1 - KEV.FEE) / k.price;
    S.coins -= coins; k.units += units; k.paid += coins;
    const life = this.life(); life.bought += coins;
    SaveGame.saveNow(); bus.emit('kev:trade', { buy: true, coins, units });
    return { coins, units };
  },
  // sell a share of your holding (Kev keeps 5%); profit is against what that share cost you
  sell(share = 1) {
    const k = S.kev; if (!k || !k.units || k.dead) return null;
    const units = k.units * Math.min(1, share), coins = Math.floor(units * k.price * (1 - KEV.FEE)), cost = k.paid * Math.min(1, share);
    k.units -= units; k.paid -= cost; if (k.units < 1e-9) { k.units = 0; k.paid = 0; }
    S.coins += coins;
    const profit = coins - Math.round(cost), x = cost ? coins / cost : 0, life = this.life();
    life.sold += coins; life.best = Math.max(life.best, x);
    SaveGame.saveNow(); bus.emit('kev:trade', { buy: false, coins, units, profit, x });
    return { coins, units, profit, x };
  },
  life() { return S.life.kev = S.life.kev || { bought: 0, sold: 0, best: 0, rugged: 0 }; },
};
