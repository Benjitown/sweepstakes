// Event-driven progression sim + cost tuner for Sweepstakes v3.
// node tools/sim/prog.js run   -> milestone times with the costs below
// node tools/sim/prog.js tune  -> adjusts costs toward the target timeline and prints them
'use strict';
const { seed, rand, play } = require('./engine');

const C = {
  startCoins: 1000, BOOST: 1.2, CLEAR: 1.25, GOLDEN: .08, ASC_CAP_BASE: 2.5, ASC_LIM: .5,
  GEM_TIERS: [[1.2, .6], [1.5, .28], [2, .1], [5, .02]],
  TABLES: [
    { id: 'penny',  w: 6,  h: 6,  m: 5,  lim: 3,   prog: .4,  min: 10,    cap: 1e3,   gems: 1 },
    { id: 'den',    w: 8,  h: 8,  m: 11, lim: 6,   prog: .3,  min: 200,   cap: 2e4,   gems: 2 },
    { id: 'alley',  w: 9,  h: 9,  m: 17, lim: 12,  prog: .25, min: 4e3,   cap: 4e5,   gems: 2 },
    { id: 'roller', w: 10, h: 10, m: 24, lim: 25,  prog: .2,  min: 8e4,   cap: 8e6,   gems: 3 },
    { id: 'whale',  w: 12, h: 12, m: 38, lim: 60,  prog: .15, min: 1.6e6, cap: 1.6e8, gems: 4 },
    { id: 'abyss',  w: 14, h: 14, m: 56, lim: 200, prog: .12, min: 3.2e7, cap: 3.2e9, gems: 5 },
  ],
  SPIN_EVERY: 180, SPIN_EV_CAPS: 1.6,
  LEVEL: { need: l => Math.round(30 * l ** 1.55), rewardCaps: l => .6 + .04 * l },
  HUMAN: { overhead: 2.5, perDig: .45, perGuess: 1.2, guessThr: .3 },
  BOT_DELAY: [.52, .32, .18, .09],
};
// purchase order: [id, target minute, cost]
let ORDER0 = [
  ['flagBot', .5, 2e3], ['T:den', 1.4, 8e3], ['boards', 2.2, 8e3], ['sweepBot', 3.2, 2e4], ['coward', 4.2, 1.5e5], ['overclock', 5.2, 1e5],
  ['boards', 6.7, 4e5], ['T:alley', 8.5, 4e5], ['brain', 10.5, 3e6], ['restake', 12.5, 6e6], ['overclock', 15, 1e7], ['boards', 18, 2e7],
  ['T:roller', 21, 2e7], ['yolo', 24, 6e7], ['overclock', 27, 5e8], ['T:whale', 33, 8e8], ['T:abyss', 42, 4e10], ['A', 52, 1e12],
  ['boards', 57, 2e11], ['A', 65, 1e13], ['boards', 71, 2e12], ['A', 80, 8e13], ['boards', 87, 1.5e13], ['A', 97, 5e14], ['boards', 104, 1e14],
  ['casino', 120, 5e15],
];
let ORDER = [["flagBot",0.5,5900],["T:den",1.4,16000],["boards",2.2,200000],["sweepBot",3.2,300000],["coward",4.2,1100000],["overclock",5.2,390000],["boards",6.7,960000],["T:alley",8.5,1300000],["brain",10.5,18000000],["restake",12.5,23000000],["overclock",15,38000000],["boards",18,76000000],["T:roller",21,87000000],["yolo",24,1300000000],["overclock",27,1900000000],["T:whale",33,5500000000],["T:abyss",42,110000000000],["A",52,2400000000000],["boards",57,4200000000000],["A",65,6000000000000],["boards",71,19000000000000],["A",80,33000000000000],["boards",87,84000000000000],["A",97,170000000000000],["boards",104,320000000000000],["casino",120,1600000000000000]];
// stretch the timeline a little: real players also use add-ons, flips and Double or Nothing, which the sim doesn't
ORDER = ORDER.map(([id, t, c]) => [id, +(t * 1.12).toFixed(1), c]);

function run(order, sd, verbose) {
  seed(sd);
  const S = { coins: C.startCoins, unl: 1, upg: {}, asc: 0, t: 0, lvl: 1, xp: 0, streak: 0, spinAt: -1e9, boards: 0, next: 0 };
  const lv = id => S.upg[id] || 0, slots = () => 1 + lv('boards');
  const capMul = () => C.ASC_CAP_BASE ** S.asc;
  const effCap = tb => tb.cap * capMul();
  const times = [];
  let humanFree = 0;
  const slotEnd = []; const inFlight = []; // per slot: finish time, {stake, payout, xp}
  function shop() {
    while (S.next < order.length) {
      const [id, , cost] = order[S.next];
      const f = id === 'casino' ? 1 : (id.startsWith('T:') || id === 'A') ? .5 : .6;
      if (cost > f * S.coins) return;
      S.coins -= cost; times.push(S.t); S.next++;
      if (id.startsWith('T:')) S.unl++; else if (id === 'A') S.asc++; else if (id !== 'casino') S.upg[id] = lv(id) + 1;
      if (id === 'casino') return true;
    }
  }
  function award(xp) {
    S.xp += xp;
    while (S.xp >= C.LEVEL.need(S.lvl)) { S.xp -= C.LEVEL.need(S.lvl); S.lvl++; S.coins += Math.round(effCap(C.TABLES[S.unl - 1]) * C.LEVEL.rewardCaps(S.lvl)); }
  }
  function pickTable(nActive) { let k = 0; for (let i = 0; i < S.unl; i++) if (C.TABLES[i].min * (nActive + 2) <= S.coins) k = i; return k; }
  function deal(slot) {
    const bots = lv('sweepBot') > 0, auto = bots && lv('coward') > 0;
    if (!bots && slot > 0) { slotEnd[slot] = Infinity; return; }
    const active = bots ? slots() : 1, ti = pickTable(active), tb = C.TABLES[ti];
    const stake = Math.max(tb.min, Math.min(effCap(tb), Math.floor(S.coins / (active + 2))));
    if (stake > S.coins) { slotEnd[slot] = Infinity; inFlight[slot] = null; return; }
    S.coins -= stake;
    const strategy = !auto ? 'human' : lv('yolo') ? 'botC' : lv('brain') ? 'botB' : 'botA';
    const o = play(C, tb, S.asc, strategy, rand() < C.GOLDEN);
    const delay = C.BOT_DELAY[lv('overclock')];
    let start = S.t, dur;
    if (!bots) { start = Math.max(S.t, humanFree); dur = C.HUMAN.overhead + C.HUMAN.perDig * o.digs + C.HUMAN.perGuess * o.guesses; humanFree = start + dur; }
    else {
      dur = (o.digs + o.flags + o.guesses + 1) * delay;
      if (!auto) { const hs = Math.max(start + dur, humanFree); humanFree = hs + 2 + C.HUMAN.perGuess * o.guesses; dur = humanFree - start; }
      // the game waits ~1.1–1.7s on the result stamp before a board is re-dealt
      if (!lv('restake')) { const hs = Math.max(start, humanFree); humanFree = hs + 1.2; start = hs + 2.8; } else start += 1.6;
    }
    S.boards++;
    inFlight[slot] = { stake, o, ti };
    slotEnd[slot] = start + dur;
  }
  for (let s = 0; s < 8; s++) slotEnd[s] = Infinity;
  deal(0);
  const LIMIT = 5 * 3600;
  while (S.t < LIMIT) {
    let s = 0; for (let k = 1; k < 8; k++) if (slotEnd[k] < slotEnd[s]) s = k;
    if (slotEnd[s] === Infinity) { if (verbose) console.log('stalled/bust at', S.t, S.coins); return { times, S, bust: true }; }
    S.t = slotEnd[s];
    const f = inFlight[s]; inFlight[s] = null;
    if (f) {
      const { stake, o, ti } = f;
      const pay = o.boom ? 0 : Math.floor(stake + stake * (o.mult - 1) * (1 + Math.min(S.streak, 10) * .1));
      if (o.boom) S.streak = 0; else if (o.mult >= 2) S.streak++;
      S.coins += pay;
      award(o.boom ? 3 : Math.round((8 + 4 * ti) * (o.cleared ? 1.5 : 1) + 3 * o.gems));
    }
    if (S.t - S.spinAt >= C.SPIN_EVERY) { S.spinAt = S.t; S.coins += Math.round(C.SPIN_EV_CAPS * effCap(C.TABLES[S.unl - 1]) * (.6 + rand() * .8)); }
    if (shop()) return { times, S, bust: false };
    deal(s);
    // newly bought slots start now
    if (lv('sweepBot')) for (let k = 0; k < slots(); k++) if (slotEnd[k] === Infinity && !inFlight[k]) { slotEnd[k] = S.t; }
  }
  return { times, S, bust: false, timeout: true };
}
const fmtT = s => `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, '0')}`;
const sig = v => { const p = 10 ** (Math.floor(Math.log10(v)) - 1); return Math.round(v / p) * p; };
const mode = process.argv[2] || 'run';
if (mode === 'run') {
  for (const sd of [1, 2, 3]) {
    const r = run(ORDER, sd, true);
    console.log(`seed ${sd}: ${r.bust ? 'BUST' : r.timeout ? 'TIMEOUT' : 'done'} ${fmtT(r.S.t)} boards ${r.S.boards} lvl ${r.S.lvl}`);
    console.log('  ' + r.times.map((t, i) => `${ORDER[i][0]}@${fmtT(t)}`).join(' '));
  }
} else {
  const seeds = [11, 12, 13, 14, 15];
  let best = null, bestErr = 1e9, prevOrder = null;
  for (let pass = 1; pass <= +(process.argv[3] || 8); pass++) {
    prevOrder = prevOrder || ORDER;
    const runs = seeds.map(sd => run(ORDER, sd));
    const avg = ORDER.map((_, i) => { const v = runs.map(r => r.times[i]).filter(x => x !== undefined); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 5 * 3600; });
    let err = 0;
    ORDER = ORDER.map(([id, tgt, cost], i) => {
      const prevA = i ? avg[i - 1] : 0, prevT = i ? ORDER[i - 1][1] * 60 : 0;
      const act = Math.max(1, avg[i] - prevA), want = Math.max(10, tgt * 60 - prevT);
      err += Math.abs(Math.log(act / want));
      return [id, tgt, Math.max(100, cost * Math.min(4, Math.max(.25, (want / act) ** (pass < 4 ? .8 : .5))))];
    }, 0);
    err /= ORDER.length;
    if (err < bestErr) { bestErr = err; best = prevOrder; }
    console.log(`pass ${pass}: mean |log error| ${err.toFixed(3)}  casino@${fmtT(avg[avg.length - 1])}`);
    prevOrder = ORDER;
  }
  console.log('best error', bestErr.toFixed(3));
  console.log(JSON.stringify(best.map(([id, tgt, cost]) => [id, tgt, sig(cost)])));
}
