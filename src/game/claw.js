// The claw machine (the numbers are in src/data/claw.js): the pile of prizes, and a go. The result is decided the
// moment the claw drops, and a prize's winnings wait in S.clawOwed until it lands in the chute, so leaving mid-grab
// still pays (main.js calls settle() on load, like the other booth games).
import { bus } from '../core/bus.js';
import { S, SaveGame, baseCap } from '../core/state.js';
import { CLAW, CLAW_PRIZES, CLAW_BY } from '../data/claw.js';

const clawPick = rng => { let t = rng() * CLAW_PRIZES.reduce((s, p) => s + p.w, 0); for (const p of CLAW_PRIZES) { t -= p.w; if (t <= 0) return p; } return CLAW_PRIZES[0]; };

export const Claw = {
  rng: Math.random,
  pile: null, // [{ id, x }]: where each prize sits, 0 to 1 across the machine
  price: () => Math.max(5, Math.ceil(baseCap() * CLAW.PRICE)),
  // tops the machine back up to CLAW.PILE prizes: one to a spot along the bottom, each nudged a bit off its spot
  fill() {
    const pile = this.pile = (this.pile || []).slice(), w = .74 / CLAW.PILE;
    for (let k = 0; k < CLAW.PILE; k++) if (!pile.some(q => q.s === k)) pile.push({ id: clawPick(this.rng).id, x: .14 + w * (k + .5) + (this.rng() - .5) * w * .4, s: k });
    return pile.sort((a, b) => a.x - b.x);
  },
  // the prize under the claw at x (the nearest one whose width it's over), and how far off centre: 0 middle, 1 edge
  under(x) {
    let best = null, d = 2;
    for (const q of this.pile || []) { const dd = Math.abs(q.x - x) / CLAW_BY[q.id].r; if (dd <= 1 && dd < d) { best = q; d = dd; } }
    return { q: best, d: best ? d : 1 };
  },
  // the chance a grab at x comes home with the prize
  chance(x) {
    const { q, d } = this.under(x); if (!q) return 0;
    const [g0, g1] = CLAW.GRIP;
    return (g0 + (g1 - g0) * d) * CLAW_BY[q.id].slip * (1 - CLAW.DROP);
  },
  // a go: the price goes in and the claw drops at x; returns what happens (the view plays it out)
  grab(x) {
    const cost = this.price(); if (S.coins < cost) return null;
    if (!this.pile) this.fill();
    S.coins -= cost;
    const { q, d } = this.under(x), P = q && CLAW_BY[q.id], [g0, g1] = CLAW.GRIP;
    const grip = P ? (g0 + (g1 - g0) * d) * P.slip : 0;
    const held = !!P && this.rng() < grip, dropped = held && this.rng() < CLAW.DROP, won = held && !dropped;
    const pay = won ? Math.floor(cost * P.x) : 0;
    if (won) {
      this.pile = this.pile.filter(o => o !== q); S.clawOwed = (S.clawOwed || 0) + pay;
      if (P.fx === 'shield') S.inv.shield++;
      if (P.fx === 'golden') S.goldNext++;
    }
    const L = S.life.claw = S.life.claw || { goes: 0, won: 0, best: '' };
    L.goes++; if (won) { L.won++; if (!L.best || CLAW_BY[L.best].x < P.x) L.best = P.id; }
    SaveGame.saveNow();
    const r = { x, cost, prize: q ? { ...q } : null, d, grip, held, dropped, won, pay, fx: won ? P.fx || null : null };
    bus.emit('claw:grab', r);
    return r;
  },
  // the prize drops into the chute: its winnings are yours
  collect() { const owed = S.clawOwed || 0; if (owed) { S.coins += owed; S.clawOwed = 0; SaveGame.saveNow(); } return owed; },
  settle() { return this.collect(); },
};
