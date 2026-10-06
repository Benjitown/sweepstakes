// Scratchcards: buy one, nine panels, three of a kind wins. The result is decided at the till; scratching only shows it.
import { shuffle } from '../core/util.js';
import { SCRATCH_CARDS, SCRATCH_PRIZES } from '../data/scratchcards.js';
import { SaveGame, S, baseCap, luck } from '../core/state.js';


export const Scratchcards = {
  card: null, // the card in your hand: { kind, price, win, prize, panels }
  price: kind => Math.max(5, Math.round(baseCap() * kind.share)),
  // nine panels: the winning symbol three times (if it's a winner) and every other symbol at most twice
  panels(win) {
    const others = SCRATCH_PRIZES.map(p => p.sym).filter(s => !win || s !== win.sym);
    const filler = shuffle(others.flatMap(s => [s, s])).slice(0, win ? 6 : 9);
    return shuffle((win ? [win.sym, win.sym, win.sym] : []).concat(filler));
  },
  // Buys a card. The price leaves your coins now; any prize waits in S.scratchOwed until it's scratched (or the next
  // page load, if you leave). Luck (charms, the carrot) makes every prize a bit likelier.
  buy(id, roll = Math.random()) {
    const kind = SCRATCH_CARDS.find(c => c.id === id), price = kind && this.price(kind);
    if (!kind || this.card || S.coins < price) return null;
    let x = roll, win = null;
    for (const pz of SCRATCH_PRIZES) { x -= pz.p * luck(); if (x < 0) { win = pz; break; } }
    const prize = win ? price * win.x : 0;
    S.coins -= price; S.scratchOwed = (S.scratchOwed || 0) + prize;
    const L = S.life.scratch = S.life.scratch || { bought: 0, won: 0, best: 0 };
    L.bought++; if (win) { L.won++; L.best = Math.max(L.best, win.x); }
    SaveGame.saveNow();
    return (this.card = { kind, price, win, prize, panels: this.panels(win) });
  },
  // the card is fully scratched: pay out whatever was owed
  settle() { const owed = S.scratchOwed || 0; this.card = null; if (owed) { S.coins += owed; S.scratchOwed = 0; SaveGame.saveNow(); } return owed; },
};
