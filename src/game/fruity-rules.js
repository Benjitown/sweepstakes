// The Fruity's rules on their own (no screen, no save, so node can run them too): what's on the line, what it pays,
// which reels are worth holding and the best way to spend nudges.
import { FRUITY_REELS, FRUITY_PAYS, FRUITY_CHERRIES, FRUITY_FEATURES } from '../data/fruity.js';

const holdCache = new Map();

export const FruityRules = {
  // the symbol on reel r at stop p (the bands wrap round); the win line is the middle row
  at(r, p) { const band = FRUITY_REELS[r], n = band.length; return band[((p % n) + n) % n]; },
  line(pos) { return pos.map((p, r) => this.at(r, p)); },
  // what a line pays, × the stake
  pay(line) {
    if (line[0] === line[1] && line[1] === line[2]) return FRUITY_PAYS[line[0]] || 0;
    return line[0] === 'C' && line[1] === 'C' ? FRUITY_CHERRIES : 0;
  },
  // a nudge moves one reel down a stop: the symbol above the line drops onto it
  nudged(pos, r) { const n = FRUITY_REELS[r].length; return pos.map((p, k) => k === r ? (p - 1 + n) % n : p); },
  // what the next go pays on average (× the stake) with these reels held where they are (it only depends on what's held)
  holdValue(pos, held) {
    const key = held.map((h, r) => h ? this.at(r, pos[r]) : '-').join('');
    if (holdCache.has(key)) return holdCache.get(key);
    let sum = 0, count = 0;
    const cur = pos.slice(), walk = r => {
      if (r === 3) { sum += this.pay(this.line(cur)); count++; return; }
      if (held[r]) { walk(r + 1); return; }
      for (let p = 0; p < FRUITY_REELS[r].length; p++) { cur[r] = p; walk(r + 1); }
    };
    walk(0);
    holdCache.set(key, sum / count);
    return sum / count;
  },
  // the machine's auto-hold: the reels (two at most) that make the next go worth the most, or none if holding doesn't help
  bestHold(pos) {
    let held = [false, false, false], value = this.holdValue(pos, held);
    for (let m = 1; m < 7; m++) {
      const h = [0, 1, 2].map(r => !!(m >> r & 1));
      if (h.filter(Boolean).length > FRUITY_FEATURES.maxHolds) continue;
      const v = this.holdValue(pos, h); if (v > value + 1e-9) { value = v; held = h; }
    }
    return { held, value };
  },
  // the best someone who knows the reel bands by heart can do with n nudges (they stop at the first win):
  // { pay, path }, where path lists the reels to nudge in order
  bestNudges(pos, n) {
    let best = { pay: 0, path: [] };
    const go = (cur, left, path) => {
      if (!left) return;
      for (let r = 0; r < 3; r++) {
        const next = this.nudged(cur, r), w = this.pay(this.line(next)), p = [...path, r];
        if (w) { if (w > best.pay) best = { pay: w, path: p }; } else go(next, left - 1, p);
      }
    };
    go(pos, n, []);
    return best;
  },
};
