// Darts at the Red Lion (the numbers are in src/data/darts.js): where a dart scores, Dave's three darts, and the money.
// Your stake goes in when you say yes; Dave's darts are thrown then too (you watch them land first). Then it's yours.
import { nice, rnd } from '../core/util.js';
import { bus } from '../core/bus.js';
import { S, SaveGame, baseCap } from '../core/state.js';
import { DARTS, DARTBOARD } from '../data/darts.js';
import { Game } from './game.js';

const dartLife = () => (S.life.darts = S.life.darts || { played: 0, won: 0, drawn: 0, best: 0, nah: 0 });

export const Darts = {
  timer: 0, offer: null, match: null, rng: Math.random,
  schedule(first) {
    clearTimeout(this.timer);
    const [lo, hi] = DARTS.EVERY;
    this.timer = setTimeout(() => { bus.emit('darts:due'); this.schedule(); }, (first ?? lo + this.rng() * (hi - lo)) * 1000);
  },
  // what a dart at (x, y) scores: the middle is (0, 0), the outside of the double ring is 1 away, and y goes down
  score(x, y) {
    const B = DARTBOARD, r = Math.hypot(x, y);
    if (r > B.DOUBLE[1]) return { s: 0, label: 'Miss' };
    if (r <= B.BULL) return { s: 50, label: 'Bull' };
    if (r <= B.OUTER) return { s: 25, label: '25' };
    const deg = (Math.atan2(x, -y) * 180 / Math.PI + 369) % 360, n = B.ORDER[Math.floor(deg / 18)];
    const m = r >= B.TREBLE[0] && r <= B.TREBLE[1] ? 3 : r >= B.DOUBLE[0] ? 2 : 1;
    return { s: n * m, label: m === 3 ? `T${n}` : m === 2 ? `D${n}` : String(n) };
  },
  // a rough normal spread (good enough for a pub)
  spread(sd) { let t = 0; for (let k = 0; k < 6; k++) t += this.rng(); return (t - 3) * sd / .707; },
  stake: () => nice(Math.max(DARTS.MIN, Math.min(baseCap(), S.coins * DARTS.SHARE))),
  canOffer: () => !Darts.offer && !Darts.match && S.coins >= DARTS.MIN * 10,
  make() { this.offer = { stake: this.stake(), at: Date.now() }; bus.emit('darts:offer', this.offer); return this.offer; },
  decline(why = 'nah') { const o = this.offer; if (!o) return false; this.offer = null; if (why === 'nah') { dartLife().nah++; SaveGame.save(); } bus.emit('darts:declined', { ...o, why }); return true; },
  // you're on: the stake goes in, and Dave throws his three (aiming at treble 20)
  accept() {
    const o = this.offer; if (!o || this.match || S.coins < o.stake) return false;
    this.offer = null; Game.setCoins(S.coins - o.stake);
    const ty = -(DARTBOARD.TREBLE[0] + DARTBOARD.TREBLE[1]) / 2;
    const dave = [0, 1, 2].map(() => { const x = this.spread(DARTS.DAVE), y = ty + this.spread(DARTS.DAVE); return { x, y, ...this.score(x, y) }; });
    this.match = { stake: o.stake, dave, mine: [], daveTotal: dave.reduce((t, d) => t + d.s, 0) };
    dartLife().played++; SaveGame.saveNow();
    bus.emit('darts:on', this.match);
    return this.match;
  },
  // your dart, thrown when your aim was at (x, y); it lands a little way off
  throwAt(x, y) {
    const m = this.match; if (!m || m.mine.length >= 3) return null;
    const lx = x + this.spread(DARTS.SCATTER), ly = y + this.spread(DARTS.SCATTER), d = { x: lx, y: ly, ...this.score(lx, ly) };
    m.mine.push(d);
    if (m.mine.length === 3) this.finish();
    return d;
  },
  finish() {
    const m = this.match; if (!m) return null;
    const mine = m.mine.reduce((t, d) => t + d.s, 0), L = dartLife();
    m.total = mine; m.result = mine > m.daveTotal ? 'won' : mine === m.daveTotal ? 'drew' : 'lost';
    m.pay = m.result === 'won' ? m.stake * 2 : m.result === 'drew' ? m.stake : 0;
    if (m.pay) Game.setCoins(S.coins + m.pay, m.result === 'won');
    if (m.result === 'won') L.won++; if (m.result === 'drew') L.drawn++; L.best = Math.max(L.best, mine);
    this.match = null; SaveGame.saveNow();
    bus.emit('darts:done', m);
    return m;
  },
  // walk away mid-game: Dave keeps the pot
  concede() { const m = this.match; if (!m) return null; while (m.mine.length < 3) m.mine.push({ x: 9, y: 9, s: 0, label: 'Miss' }); return this.finish(); },
};
