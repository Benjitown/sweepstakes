// How KEVCOIN treats a few kinds of investor. node tools/sim/kevcoin.mjs [runs]
// Each strategy pays Kev's 5% going in and coming out; numbers are the average return on what was put in.
import { KEV } from '../../src/data/kevcoin.js';
import { Kev } from '../../src/game/kevcoin.js';
import { S } from '../../src/core/state.js';
import { bus } from '../../src/core/bus.js';

const RUNS = +process.argv[2] || 4000;
let seed = 11; Kev.rng = () => { let t = seed = (seed + 0x6D2B79F5) | 0; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
let hyped = false; bus.on('kev:hype', () => { hyped = true; });
const fresh = () => { delete S.kev; Kev.launch(); for (let i = 0, n = Math.floor(Kev.rng() * 200); i < n; i++) Kev.tick(); };
const ret = (buy, sell) => sell * (1 - KEV.FEE) * (1 - KEV.FEE) / buy - 1; // a round trip at these prices, fees both ways
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
// 1. buy at a random moment, hold for a while, sell (if it got rugged meanwhile, sell what's left)
for (const hold of [20, 100, 400]) {
  const r = [];
  for (let i = 0; i < RUNS; i++) { fresh(); const v = S.kev.v, p0 = S.kev.price; for (let t = 0; t < hold && S.kev.v === v; t++) Kev.tick(); r.push(S.kev.v === v ? ret(p0, S.kev.price) : -1); }
  console.log(`hold ${String(hold).padStart(3)} ticks (${hold * KEV.TICK_S / 60} min): average ${(100 * mean(r)).toFixed(1)}%, ${(100 * r.filter(x => x > 0).length / r.length).toFixed(0)}% of trades in profit`);
}
// 2. the hype rider: wait for Kev's post, buy on the next tick, sell m ticks later
for (const m of [2, 4, 6, 9]) {
  const r = [];
  for (let i = 0; i < RUNS; i++) {
    fresh(); hyped = false; const v = S.kev.v; let guard = 0;
    while (!hyped && S.kev.v === v && guard++ < 400) Kev.tick();
    if (!hyped || S.kev.v !== v) continue;
    const p0 = S.kev.price; for (let t = 0; t < m && S.kev.v === v; t++) Kev.tick();
    r.push(S.kev.v === v ? ret(p0, S.kev.price) : -1);
  }
  console.log(`buy on the hype, sell ${m} ticks later: average ${(100 * mean(r)).toFixed(1)}% over ${r.length} trades, ${(100 * r.filter(x => x > 0).length / r.length).toFixed(0)}% in profit`);
}
// 3. the clever one: buy on the hype, sell the first tick it goes down
{
  const r = [];
  for (let i = 0; i < RUNS; i++) {
    fresh(); hyped = false; const v = S.kev.v; let guard = 0;
    while (!hyped && S.kev.v === v && guard++ < 400) Kev.tick();
    if (!hyped || S.kev.v !== v) continue;
    const p0 = S.kev.price; let last = p0;
    for (let t = 0; t < 30 && S.kev.v === v; t++) { Kev.tick(); if (S.kev.price < last) break; last = S.kev.price; }
    r.push(S.kev.v === v ? ret(p0, S.kev.price) : -1);
  }
  console.log(`buy on the hype, sell on the first dip: average ${(100 * mean(r)).toFixed(1)}%, ${(100 * r.filter(x => x > 0).length / r.length).toFixed(0)}% in profit`);
}
