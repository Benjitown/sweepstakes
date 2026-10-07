// The allotment (the numbers are in src/data/allotment.js): plant a bed, it grows by the minute of play, pick it when
// it's ripe and the farm shop pays for it. Slugs might get a growing crop first; a thunderstorm waters the lot.
import { nice } from '../core/util.js';
import { bus } from '../core/bus.js';
import { S, SaveGame, baseCap } from '../core/state.js';
import { PLOT, CROP_BY, SHED_BY } from '../data/allotment.js';
import { Game } from './game.js';
import { Seasons } from './seasons.js';

const plotLife = () => (S.life.plot = S.life.plot || { picked: 0, rosettes: 0, best: 0, bestId: '', slugs: 0, earned: 0 });
const shed = id => !!(S.plotUp && S.plotUp[id]);
const plotSize = () => PLOT.BEDS + (shed('beds') ? SHED_BY.beds.beds : 0);
const plotBeds = () => { if (!Array.isArray(S.plot)) S.plot = []; while (S.plot.length < plotSize()) S.plot.push(null); return S.plot; };
// seconds of play a crop needs (a greenhouse brings everything on)
const needOf = c => c.mins * 60 * (shed('greenhouse') ? SHED_BY.greenhouse.faster : 1);

export const Allotment = {
  rng: Math.random,
  beds: plotBeds,
  // a packet of seeds
  cost: id => nice(Math.max(5, baseCap() * CROP_BY[id].share)),
  // seconds of play until bed k is ripe (0 = ripe; null = nothing in it), and how far along it is (0 to 1)
  left(k) { const b = plotBeds()[k]; return b ? Math.max(0, Math.ceil(needOf(CROP_BY[b.c]) - (S.run.time - b.at) - (b.rain || 0))) : null; },
  grown(k) { const b = plotBeds()[k]; return b ? 1 - this.left(k) / needOf(CROP_BY[b.c]) : 0; },
  size: plotSize,
  has: shed,
  // the shed: a one-off buy for this run's allotment
  shedCost: id => nice(Math.max(20, baseCap() * SHED_BY[id].share)),
  buy(id) {
    const x = SHED_BY[id], cost = x && this.shedCost(id);
    if (!x || shed(id) || S.coins < cost) return false;
    Game.setCoins(S.coins - cost); S.plotUp = { ...(S.plotUp || {}), [id]: true }; plotBeds();
    SaveGame.saveNow(); bus.emit('plot:shed', { id, cost }); return true;
  },
  ripe(k) { return this.left(k) === 0; },
  anyRipe() { return plotBeds().some((b, k) => b && this.ripe(k)); },
  free: () => plotBeds().indexOf(null),
  plant(id, k = this.free()) {
    const cost = CROP_BY[id] && this.cost(id);
    if (!cost || k < 0 || plotBeds()[k] || S.coins < cost) return null;
    Game.setCoins(S.coins - cost);
    const b = plotBeds()[k] = { c: id, at: S.run.time, rain: 0, paid: cost, ripe: false };
    SaveGame.saveNow(); bus.emit('plot:planted', { k, id, cost });
    return b;
  },
  // what the farm shop pays: the seeds' price times the crop's multiplier, give or take; double for a whopper, and
  // pumpkins fetch more in October
  pick(k) {
    if (!this.ripe(k)) return null;
    const b = plotBeds()[k], c = CROP_BY[b.c], L = plotLife(), [lo, hi] = PLOT.SIZE;
    const whopper = this.rng() < PLOT.WHOPPER, size = lo + this.rng() * (hi - lo), oct = b.c === 'pumpkin' && Seasons.is('halloween') ? PLOT.OCTOBER : 1;
    const pay = Math.max(1, Math.round(b.paid * c.x * size * oct * (whopper ? 2 : 1)));
    plotBeds()[k] = null; L.picked++; L.earned += pay; if (whopper) L.rosettes++; if (pay > L.best) { L.best = pay; L.bestId = b.c; }
    Game.setCoins(S.coins + pay, true);
    SaveGame.saveNow();
    const r = { k, id: b.c, pay, whopper, paid: b.paid };
    bus.emit('plot:picked', r);
    return r;
  },
  // every second of play: anything that's just ripened, and once a minute the slugs come out
  second() {
    plotBeds().forEach((b, k) => { if (b && !b.ripe && this.ripe(k)) { b.ripe = true; bus.emit('plot:ripe', { k, id: b.c }); } });
    if (S.run.time % 60 === 0) this.slugs();
  },
  slugs() {
    plotBeds().forEach((b, k) => {
      if (!b || this.ripe(k) || this.rng() >= PLOT.SLUGS * (shed('traps') ? SHED_BY.traps.slugs : 1)) return;
      plotBeds()[k] = null; plotLife().slugs++; SaveGame.save(); bus.emit('plot:slugs', { k, id: b.c });
    });
  },
  // a thunderstorm's rain waters everything still growing
  rain() {
    let n = 0; plotBeds().forEach((b, k) => { if (b && !this.ripe(k)) { b.rain = (b.rain || 0) + PLOT.RAIN; n++; } });
    if (n) { SaveGame.save(); bus.emit('plot:rain', { n }); }
    return n;
  },
};
