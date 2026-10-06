// The Banker: mid-game, when a board has a good profit on it, he rings with an offer: your pot plus a premium on top,
// right now. Deal, and the board's sold to him; no deal, and you play on (he only calls once about a board). Beat his
// offer later and the chat will never let him forget it.
import { bus } from '../core/bus.js';
import { S } from '../core/state.js';
import { Game } from './game.js';

export const Banker = {
  PREMIUM: [.15, .6], // his premium: this share of the board's profit at the time of the call
  MIN_X: 1.2,         // he only calls about a board whose pot is at least 1.2× its stake
  rng: Math.random,
  // the board he'd ring about: the live one with the most profit on it that he hasn't called about yet
  target() {
    return Game.slots.filter(b => b && b.started && !b.over && !b.called && b.pot() >= b.stake * this.MIN_X)
      .sort((x, y) => (y.pot() - y.stake) - (x.pot() - x.stake))[0] || null;
  },
  offer(b = this.target()) {
    if (!b) return null;
    const [lo, hi] = this.PREMIUM, pot = b.pot();
    b.called = true; b.premium = Math.max(1, Math.round((pot - b.stake) * (lo + (hi - lo) * this.rng())));
    return { b, pot, premium: b.premium };
  },
  life() { const h = S.life.house = S.life.house || {}; return h; },
  // deal: the board's sold for its pot plus the premium (board/payout.js adds it on a 'banker' cash-out)
  deal(b) {
    if (!b || b.over || !b.premium) return false;
    this.life().deals = (this.life().deals || 0) + 1;
    Game.cashOut(b, 'banker');
    bus.emit('banker', { b, deal: true });
    return true;
  },
  // no deal: remember what he offered, so cashing out for more later counts
  noDeal(b) {
    if (!b || b.over || !b.premium) return false;
    b.refused = b.pot() + b.premium; b.premium = 0;
    this.life().nodeals = (this.life().nodeals || 0) + 1;
    bus.emit('banker', { b, deal: false });
    return true;
  },
};
