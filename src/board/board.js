// The board model: mines, numbers, gems, the pot and its multiplier. No DOM in here.
import { TBY, CLEAR } from '../data/economy.js';
import { rollGem } from '../data/gems.js';
import { streakBonus } from '../core/state.js';
import { Neighbours } from './neighbours.js';

export class Board {
  constructor({ slot, table, stake, mines, limit }) {
    const n = table.w * table.h;
    Object.assign(this, { slot, t: table, stake, n, m: mines, lim: limit, nb: Neighbours.for(table),
      mine: new Uint8Array(n), open: new Uint8Array(n), flag: new Uint8Array(n), num: new Int8Array(n), gem: new Float64Array(n),
      started: false, revealed: 0, base: 0, safe: n - mines, over: false, result: '', mode: 'dig',
      probed: new Set(), defused: new Set(), G: 1, J: 1, golden: false, guesses: 0, combo: 0, gemsTotal: table.gems, gemsFound: 0,
      human: false, fp: 0, t0: 0, fuseUsed: false, ded: null, dedB: null, rng: Math.random, pumpkin: -1, pumpkinAt: -1, special: '', doors: false });
  }
  calcNums() { for (let i = 0; i < this.n; i++) { let c = 0; for (const j of this.nb[i]) c += this.mine[j]; this.num[i] = c; } }
  placeMines(first) {
    const ban = new Set([first, ...this.nb[first]]);
    let pool = []; for (let i = 0; i < this.n; i++) if (!ban.has(i)) pool.push(i);
    if (pool.length < this.m) { pool = []; for (let i = 0; i < this.n; i++) if (i !== first) pool.push(i); }
    for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(this.rng() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
    for (let k = 0; k < this.m; k++) this.mine[pool[k]] = 1;
    this.calcNums();
  }
  // Gems go only where the opening didn't reach, so you have to dig into the unknown to find them.
  placeGems(count) {
    const pool = []; for (let i = 0; i < this.n; i++) if (!this.open[i] && !this.mine[i]) pool.push(i);
    for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(this.rng() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
    this.gemsTotal = Math.min(count, pool.length);
    for (let k = 0; k < this.gemsTotal; k++) this.gem[pool[k]] = rollGem(this.rng).x;
  }
  flood(i) {
    const st = [i], out = [];
    while (st.length) {
      const k = st.pop(); if (this.open[k] || this.flag[k] || this.mine[k]) continue;
      this.open[k] = 1; this.revealed++; out.push(k);
      if (this.num[k] === 0) for (const j of this.nb[k]) if (!this.open[j] && !this.flag[j]) st.push(j);
    }
    return out;
  }
  hiddenGems() { let n = 0; for (let i = 0; i < this.n; i++) if (this.gem[i] && !this.open[i]) n++; return n; }
  isCorner(i) { const x = i % this.t.w, y = (i / this.t.w) | 0; return (x === 0 || x === this.t.w - 1) && (y === 0 || y === this.t.h - 1); }
  frac() { if (!this.started) return 0; const d = this.safe - this.base; return d <= 0 ? 1 : (this.revealed - this.base) / d; }
  rawMult() { return this.started ? (1 + this.t.prog * this.frac()) * this.G * this.J * (this.revealed >= this.safe ? CLEAR : 1) : this.J; }
  mult() { return Math.min(this.lim, this.rawMult()); }
  pot() { return Math.floor(this.stake + this.stake * (this.mult() - 1) * (1 + streakBonus())); }
  toMemento() {
    const gems = []; for (let i = 0; i < this.n; i++) if (this.gem[i]) gems.push([i, this.gem[i]]);
    return { slot: this.slot, tid: this.t.id, stake: this.stake, m: this.m, lim: this.lim, started: this.started, revealed: this.revealed, base: this.base,
      G: this.G, J: this.J, golden: this.golden, guesses: this.guesses, combo: this.combo, gems, gemsTotal: this.gemsTotal, gemsFound: this.gemsFound, human: this.human,
      fp: this.fp, fuseUsed: this.fuseUsed, probed: [...this.probed], defused: [...this.defused], pumpkin: this.pumpkin, pumpkinAt: this.pumpkinAt, special: this.special, doors: this.doors, t0: this.t0,
      mine: this.mine.join(''), open: this.open.join(''), flag: this.flag.join('') };
  }
  static fromMemento(o) {
    const t = TBY[o.tid]; if (!t || typeof o.mine !== 'string') return null;
    const b = new Board({ slot: o.slot, table: t, stake: o.stake, mines: o.m || t.m, limit: o.lim || t.lim });
    const fill = (arr, s) => { for (let i = 0; i < arr.length; i++) arr[i] = s.charCodeAt(i) === 49 ? 1 : 0; };
    fill(b.mine, o.mine); fill(b.open, o.open); fill(b.flag, o.flag);
    Object.assign(b, { started: o.started, revealed: o.revealed, base: o.base, G: o.G || 1, J: o.J || 1, golden: !!o.golden, guesses: o.guesses || 0, combo: o.combo || 0,
      gemsTotal: o.gemsTotal ?? t.gems, gemsFound: o.gemsFound || 0, human: !!o.human, fp: o.fp || 0, fuseUsed: !!o.fuseUsed, pumpkin: o.pumpkin ?? -1, pumpkinAt: o.pumpkinAt ?? -1, special: o.special || '', doors: !!o.doors, t0: o.t0 || 0 });
    (o.gems || []).forEach(([i, x]) => { b.gem[i] = x; });
    (o.probed || []).forEach(i => b.probed.add(i)); (o.defused || []).forEach(i => b.defused.add(i));
    b.calcNums();
    return b;
  }
}
