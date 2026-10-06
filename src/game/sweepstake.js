// The Sweepstake (the numbers are in src/data/sweepstake.js): lines bought from the paper, drawn when the next paper
// comes through the letterbox (game/paper.js calls draw()). Winnings are paid there and then.
import { nice } from '../core/util.js';
import { bus } from '../core/bus.js';
import { S, SaveGame, baseCap } from '../core/state.js';
import { DRAW } from '../data/sweepstake.js';
import { Game } from './game.js';

const nCr = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };

export const Sweepstake = {
  rng: Math.random,
  price: () => nice(Math.max(5, baseCap() * DRAW.PRICE)),
  lines: () => (S.lotto && S.lotto.lines) || [],
  // five different numbers from 1 to 30, in order
  dip() { const s = new Set(); while (s.size < DRAW.PICK) s.add(1 + Math.floor(this.rng() * DRAW.BALLS)); return [...s].sort((a, b) => a - b); },
  buy(nums = this.dip()) {
    const p = this.price(); if (this.lines().length >= DRAW.LINES || S.coins < p) return null;
    Game.setCoins(S.coins - p);
    S.lotto = S.lotto || { lines: [] }; S.lotto.lines.push({ nums, paid: p });
    SaveGame.saveNow(); bus.emit('lotto:bought', { nums, price: p });
    return nums;
  },
  // the draw: five balls, and what each of your lines won (nothing to check if you had no lines)
  draw() {
    const lines = this.lines(), balls = this.dip(), hit = new Set(balls);
    const res = lines.map(l => { const hits = l.nums.filter(n => hit.has(n)).length; return { nums: l.nums, hits, pay: (DRAW.PAYS[hits] || 0) * l.paid }; });
    const total = res.reduce((t, r) => t + r.pay, 0);
    if (lines.length) {
      S.lotto = { lines: [] };
      const L = S.life.lotto = S.life.lotto || { lines: 0, won: 0, best: 0 };
      L.lines += res.length; L.won += total; L.best = Math.max(L.best, ...res.map(r => r.hits));
      if (total) Game.setCoins(S.coins + total, true);
      SaveGame.saveNow();
    }
    const out = { balls, lines: res, total };
    if (lines.length) bus.emit('lotto:drawn', out);
    return out;
  },
  // what a line pays back on average, worked out exactly
  payback() { const all = nCr(DRAW.BALLS, DRAW.PICK); return Object.entries(DRAW.PAYS).reduce((t, [k, x]) => t + x * nCr(DRAW.PICK, +k) * nCr(DRAW.BALLS - DRAW.PICK, DRAW.PICK - k) / all, 0); },
};
