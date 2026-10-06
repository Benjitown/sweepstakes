// The Daily Challenge: one board a day, built from the date alone, so everyone (in every version of the game) gets
// the same mines, gems and opening. No add-ons, no shields, no stake: you play for the multiplier and compare.
import { TBY, BOOST } from '../data/economy.js';
import { gemTier } from '../data/gems.js';
import { seeded, hashString } from '../core/random.js';
import { bus } from '../core/bus.js';
import { SaveGame, S, baseCap } from '../core/state.js';
import { Board } from '../board/board.js';
import { Solver } from '../board/solver.js';

const EPOCH = Date.UTC(2026, 9, 6);      // Daily #1 is 6 October 2026
const DAILY_LIMIT = 100, DAILY_GEMS = 3;
export const PRIZE = .3; // the prize is this share of your top table's max stake, times your multiplier
// how the group chat plays it: [chance of blowing up, worst mult, best mult]
const STYLES = { nan: [0, 1.2, 2.6], kev: [.2, 1.1, 3.5], tash: [.3, 1.8, 8], priya: [.25, 2.5, 10], dave: [.45, 3, 18] };
const EMOJI = { safe: '🟩', r1: '🟨', r2: '🟧', r3: '🟥', gem: '💎', boom: '💥', cash: '💰', clear: '🏁', limit: '🚀' };
const pad = n => String(n).padStart(2, '0');

export const Daily = {
  board: null,
  key(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; },
  number(key) { const [y, m, d] = key.split('-').map(Number); return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 864e5) + 1; },
  yesterday(key) { const [y, m, d] = key.split('-').map(Number); return this.key(new Date(y, m - 1, d - 1)); },
  msToTomorrow(now = new Date()) { return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now; },
  state() { const L = S.life; return L.daily && L.daily.key === this.key() ? L.daily : null; },
  done() { const st = this.state(); return !!(st && st.result); },

  // The board for a date. Same date, same board: the seed is the date, and nothing else is random.
  create(key) {
    const rng = seeded(hashString('sweepstakes-daily-' + key)), t = TBY.alley;
    const b = new Board({ slot: -1, table: t, stake: 0, mines: t.m, limit: DAILY_LIMIT });
    b.rng = rng;
    const start = (2 + Math.floor(rng() * (t.h - 4))) * t.w + 2 + Math.floor(rng() * (t.w - 4));
    b.placeMines(start); b.started = true; b.flood(start); b.base = b.revealed;
    b.placeGems(DAILY_GEMS);
    return this.prep(b, key, []);
  },
  prep(b, key, moves) { Object.assign(b, { daily: key, moves }); return b; },

  // Today's board: carry on with one in progress, or deal it fresh.
  open() {
    const key = this.key();
    if (this.board && this.board.daily === key) return this.board;
    const st = this.state();
    if (st && st.board) { const b = Board.fromMemento(st.board); if (b) return (this.board = this.prep(b, key, st.moves || [])); }
    this.board = this.create(key);
    S.life.daily = { ...(S.life.daily || {}), key, board: null, moves: [], result: null };
    return this.board;
  },

  dig(b, i) {
    if (b.over || b.open[i] || b.flag[i]) return;
    const d = Solver.full(b), p = d.KS[i] ? 0 : Math.min(.95, d.P[i]);
    if (b.mine[i]) { b.moves.push('boom'); return this.finish(b, 'boom', i); }
    const opened = b.flood(i);
    let k = 1, gem = null;
    if (p > 0) { k = 1 + BOOST * p / (1 - p); b.G *= k; b.guesses++; b.combo++; }
    for (const j of opened) { const x = b.gem[j]; if (x) { b.J *= x; b.gemsFound++; gem = gemTier(x); } }
    b.moves.push(gem ? 'gem' : p >= .5 ? 'r3' : p >= .25 ? 'r2' : p > 0 ? 'r1' : 'safe');
    bus.emit('daily:dig', { b, i, opened, p, k, gem });
    if (b.revealed >= b.safe) return this.finish(b, 'clear');
    if (b.rawMult() >= b.lim) return this.finish(b, 'limit');
    this.save(b);
  },
  flag(b, i) { if (b.over || b.open[i]) return; b.flag[i] ^= 1; bus.emit('daily:flag', { b, i, on: !!b.flag[i] }); this.save(b); },
  chord(b, i) {
    if (!b.open[i] || !b.num[i]) return;
    let f = 0; for (const j of b.nb[i]) f += b.flag[j];
    if (f !== b.num[i]) return;
    for (const j of b.nb[i]) if (!b.open[j] && !b.flag[j]) { this.dig(b, j); if (b.over) return; }
  },
  cash(b) { if (!b.over) this.finish(b, 'cash'); },
  save(b) { const L = S.life; L.daily = { ...L.daily, board: b.toMemento(), moves: b.moves.slice() }; SaveGame.save(); },

  finish(b, why, i) {
    b.over = true;
    const L = S.life, prev = L.daily || {}, key = b.daily;
    const mult = why === 'boom' ? 0 : b.mult(), prize = why === 'boom' ? 0 : Math.round(baseCap() * PRIZE * mult);
    const streak = prev.lastKey === this.yesterday(key) ? (prev.streak || 0) + 1 : prev.lastKey === key ? (prev.streak || 1) : 1;
    const friends = this.friends(key), top = mult > 0 && friends.every(f => mult > f.mult);
    const result = { why, mult, gems: b.gemsFound, gemsTotal: b.gemsTotal, digs: b.moves.length, moves: b.moves.slice(), prize };
    L.daily = { key, board: b.toMemento(), moves: b.moves.slice(), result, streak, lastKey: key,
      best: Math.max(prev.best || 0, mult), played: (prev.played || 0) + 1 };
    S.coins += prize;
    bus.emit('daily:done', { b, why, i, result, streak, top, friends });
    SaveGame.saveNow();
  },

  // The group chat plays the same daily. Their scores come from the date too, so they're fixed for the day.
  friends(key) {
    const rng = seeded(hashString('sweepstakes-chat-' + key));
    return Object.entries(STYLES).map(([who, [boom, lo, hi]]) => {
      const blew = rng() < boom, x = lo + (hi - lo) * rng() ** 2;
      return { who, mult: blew ? 0 : Math.round(x * 100) / 100 };
    });
  },

  // A spoiler-free result to paste into a group chat.
  shareText(key, r) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const head = r.why === 'boom' ? 'blew up 💥' : `×${r.mult.toFixed(2)} ${EMOJI[r.why]}`;
    const trail = r.moves.map(x => EMOJI[x]).concat(r.why === 'boom' ? [] : [EMOJI[r.why]]);
    const rows = []; for (let k = 0; k < trail.length; k += 10) rows.push(trail.slice(k, k + 10).join(''));
    return `Sweepstakes Daily #${this.number(key)} · ${date}\n${head} · 💎 ${r.gems}/${r.gemsTotal} · ${r.digs} dig${r.digs === 1 ? '' : 's'}\n${rows.join('\n')}`;
  },
};
