// The church fete (the numbers are in src/data/fete.js): every so often it's on, and there's Splat the Rat. Pay for
// three goes; pull the cord and the rat (a sock full of sand) drops down the drainpipe, and you've a split second to
// splat it as it shoots out of the bottom. Your goes live in S.splat, so leaving half-way still pays for your splats.
import { bus } from '../core/bus.js';
import { S, SaveGame, baseCap } from '../core/state.js';
import { FETE, TOMBOLA } from '../data/fete.js';

export const Fete = {
  timer: 0, rng: Math.random,
  schedule(first) {
    clearTimeout(this.timer);
    const [lo, hi] = FETE.EVERY;
    this.timer = setTimeout(() => { bus.emit('fete:due'); this.schedule(); }, (first ?? lo + this.rng() * (hi - lo)) * 1000);
  },
  fee: () => Math.max(5, Math.ceil(baseCap() * FETE.FEE)),
  st: () => S.splat || null,
  // three goes (or the ones you've still got)
  pay() {
    if (S.splat) return S.splat;
    const fee = this.fee(); if (S.coins < fee) return null;
    S.coins -= fee; S.splat = { fee, goes: FETE.GOES, hits: 0 }; SaveGame.saveNow();
    bus.emit('fete:paid', { fee }); return S.splat;
  },
  // pull the cord: how long till the rat shoots out (ms)
  drop() { const [lo, hi] = FETE.DROP; return lo + this.rng() * (hi - lo); },
  // how a go went: 'hit', 'early' (it was still up the pipe) or 'missed' (too slow)
  go(how) {
    const st = S.splat; if (!st || st.goes <= 0) return null;
    st.goes--; if (how === 'hit') st.hits++;
    SaveGame.save(); bus.emit('fete:go', { how, goes: st.goes, hits: st.hits });
    return st.goes > 0 ? { ...st, done: false } : this.settle();
  },
  pays: hits => FETE.PAYS[Math.min(hits, FETE.PAYS.length - 1)],
  // all three gone, or you've walked off: paid for the splats so far
  settle() {
    const st = S.splat; if (!st) return null;
    const pay = st.fee * this.pays(st.hits);
    S.splat = null; S.coins += pay;
    const L = S.life.fete = S.life.fete || { goes: 0, best: 0 }; L.goes++; L.best = Math.max(L.best, st.hits);
    SaveGame.saveNow(); bus.emit('fete:done', { hits: st.hits, pay, fee: st.fee });
    return { hits: st.hits, pay, fee: st.fee, done: true };
  },
};

// The tombola (the numbers are in src/data/fete.js): a ticket out of the drum; ending in 0 or 5, it wins a prize
export const Tombola = {
  rng: Math.random,
  price: () => Math.max(2, Math.ceil(baseCap() * TOMBOLA.TICKET)),
  buy() {
    const price = this.price(); if (S.coins < price) return null;
    const n = 1 + Math.floor(this.rng() * TOMBOLA.TICKETS), win = n % 5 === 0;
    let prize = null;
    if (win) { let x = this.rng() * TOMBOLA.PRIZES.reduce((t, p) => t + p.w, 0); prize = TOMBOLA.PRIZES.find(p => (x -= p.w) <= 0) || TOMBOLA.PRIZES[0]; }
    const pay = prize ? price * prize.x : 0;
    S.coins += pay - price;
    const L = S.life.tombola = S.life.tombola || { tickets: 0, prizes: 0 }; L.tickets++; if (prize) L.prizes++;
    SaveGame.saveNow(); bus.emit('tombola', { n, prize: prize && prize.id, pay, price });
    return { n, prize: prize && prize.id, pay, price };
  },
};
