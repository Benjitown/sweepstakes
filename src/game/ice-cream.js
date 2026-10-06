// The ice cream van: now and then it comes down the road playing Greensleeves (src/ui/van-view.js drives it past).
// Catch it and a cone gives you a sugar rush: +25% on the profit of your next winning cash-out (board/payout.js).
import { bus } from '../core/bus.js';
import { SaveGame, S, baseCap } from '../core/state.js';

export const IceCream = {
  RUSH: .25, // the sugar rush: +25% on a cash-out's profit
  price: () => Math.max(5, Math.ceil(baseCap() * .02)),
  buy() {
    const c = this.price(); if (S.coins < c) return 0;
    S.coins -= c; S.sugar = (S.sugar || 0) + 1;
    const h = S.life.house = S.life.house || {}; h.icecream = (h.icecream || 0) + 1;
    SaveGame.saveNow(); bus.emit('icecream', { price: c, sugar: S.sugar });
    return c;
  },
};
