// Nan's biscuit tin (the numbers are in src/data/biscuit-tin.js). It lives in S.life, so going bust doesn't empty it:
// going bust is what it's for. wiring.js fills it on every winning cash-out, and Game.bust() hands it over.
import { bus } from '../core/bus.js';
import { S, SaveGame } from '../core/state.js';
import { START } from '../data/economy.js';
import { TIN } from '../data/biscuit-tin.js';

export const Tin = {
  cap: () => Math.round(START * TIN.CAP),
  amount: () => S.life.tin || 0,
  full() { return this.amount() >= this.cap(); },
  // Nan puts a little by, out of her own purse: a share of the profit, at least a coin, up to the cap
  put(profit) {
    if (!(profit > 0) || this.full()) return 0;
    const was = this.amount(), add = Math.min(this.cap() - was, Math.max(1, Math.round(profit * TIN.SHARE)));
    S.life.tin = was + add; SaveGame.save();
    bus.emit('tin', { was, now: S.life.tin, add, full: this.full() });
    return add;
  },
  // the rainy day: she brings the whole tin round
  open() {
    const coins = this.amount(); if (!coins) return 0;
    S.life.tin = 0; S.life.tins = (S.life.tins || 0) + 1;
    return coins;
  },
};
