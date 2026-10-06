// Nan's speed bingo (a booth tab): one 90-ball ticket, 60 calls, paid on how many of its rows you complete.
import { BINGO_CALLS, BINGO_TICKETS, BINGO_PAYS } from '../data/bingo.js';
import { bus } from '../core/bus.js';
import { SaveGame, S, baseCap } from '../core/state.js';
import { shuffle } from '../core/util.js';

// A ticket: 3 rows × 9 columns, 5 numbers a row. Column c holds numbers from its decade (1–9, 10–19 … 80–90), at least
// one per column, smallest at the top. cells[r][c] is the number, or 0 for a blank square.
export function makeTicket() {
  for (;;) {
    const count = Array(9).fill(1);
    for (let k = 0; k < 6;) { const c = Math.floor(Math.random() * 9); if (count[c] < 3) { count[c]++; k++; } }
    // the fullest columns go first, each into the rows with the most room left (this never needs a second go in practice)
    const room = [5, 5, 5], cells = Array.from({ length: 3 }, () => Array(9).fill(0));
    let ok = true;
    for (const c of shuffle([...Array(9).keys()]).sort((a, b) => count[b] - count[a])) {
      const rows = shuffle([0, 1, 2].filter(r => room[r] > 0)).sort((a, b) => room[b] - room[a]).slice(0, count[c]);
      if (rows.length < count[c]) { ok = false; break; }
      rows.forEach(r => { cells[r][c] = 1; room[r]--; });
    }
    if (!ok || room.some(Boolean)) continue;
    for (let c = 0; c < 9; c++) {
      const lo = c ? c * 10 : 1, hi = c === 8 ? 90 : c * 10 + 9, pool = [];
      for (let n = lo; n <= hi; n++) pool.push(n);
      const pick = shuffle(pool).slice(0, count[c]).sort((a, b) => a - b);
      let k = 0; for (let r = 0; r < 3; r++) if (cells[r][c]) cells[r][c] = pick[k++];
    }
    return cells;
  }
}

export const Bingo = {
  game: null, // the ticket being played: { kind, price, ticket, calls, rowAt, lines, x, prize }
  timer: 0,
  price: kind => Math.max(1, Math.ceil(baseCap() * kind.share)),
  // The result is decided (and saved) the moment you buy: the ticket and the 60 balls. The price leaves at once and the
  // winnings wait in S.bingoOwed until Nan's called the last one (or until the next page load, if you left).
  buy(id) {
    const kind = BINGO_TICKETS.find(k => k.id === id); if (!kind) return null;
    const price = this.price(kind); if (S.coins < price) return null;
    const ticket = makeTicket(), calls = shuffle([...Array(90)].map((_, k) => k + 1)).slice(0, BINGO_CALLS);
    const { rowAt, lines, x } = this.score(ticket, calls), prize = Math.floor(price * x);
    S.coins -= price; S.bingoOwed = (S.bingoOwed || 0) + prize;
    const life = S.life.bingo = S.life.bingo || { tickets: 0, lines: 0, twos: 0, houses: 0 };
    life.tickets++; if (lines === 1) life.lines++; if (lines === 2) life.twos++; if (lines === 3) life.houses++;
    SaveGame.saveNow();
    return this.game = { kind, price, ticket, calls, rowAt, lines, x, prize };
  },
  // how a ticket does on a list of calls: the call on which each row fills (Infinity if it never does), earliest first,
  // how many rows filled, and what that pays (× the price)
  score(ticket, calls) {
    const at = new Map(calls.map((n, i) => [n, i]));
    const rowAt = ticket.map(row => row.reduce((m, n) => n ? Math.max(m, at.has(n) ? at.get(n) : Infinity) : m, -1)).sort((a, b) => a - b);
    const lines = rowAt.filter(Number.isFinite).length;
    return { rowAt, lines, x: BINGO_PAYS[lines] };
  },
  settle() { const owed = S.bingoOwed || 0; this.game = null; if (owed) { S.coins += owed; S.bingoOwed = 0; SaveGame.saveNow(); } return owed; },
  // every 9 to 15 minutes Nan asks the chat who's coming to bingo (wiring.js decides if now's a good time)
  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { bus.emit('bingo:due'); this.schedule(); }, (540 + Math.random() * 360) * 1000);
  },
};
