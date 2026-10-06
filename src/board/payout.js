// Add-on cards (and New Game+, and power cuts) that change what a cash-out pays.
import { fmt } from '../core/util.js';
import { S, hasA } from '../core/state.js';
import { PowerCut } from '../game/power-cut.js';
import { IceCream } from '../game/ice-cream.js';

/* =====================================================================================
   Decorator · https://refactoring.guru/design-patterns/decorator
   ===================================================================================== */
class Payout { pay(b) { return { amount: b.pot(), extras: [] }; } }
class PayoutDecorator extends Payout { constructor(inner) { super(); this.inner = inner; } pay(b, why) { return this.inner.pay(b, why); } }
class NestEggPayout extends PayoutDecorator {
  pay(b, why) { const r = super.pay(b, why); if (b.guesses) { const e = Math.floor(b.stake * .1); r.amount += e; r.extras.push(['egg', `Nest Egg +${fmt(e)}`]); } return r; }
}
class FlagFanaticPayout extends PayoutDecorator {
  pay(b, why) {
    const r = super.pay(b, why); if (!b.guesses) return r;
    let n = 0; for (let k = 0; k < b.n; k++) if (b.flag[k] && b.mine[k] && !b.defused.has(k)) n++;
    if (n) { const e = Math.floor(r.amount * Math.min(.5, .02 * n)); r.amount += e; r.extras.push(['flagfan', `Flags +${fmt(e)}`]); }
    return r;
  }
}
class CompoundPayout extends PayoutDecorator {
  pay(b, why) { const r = super.pay(b, why); if (b.guesses) { const e = Math.min(b.stake, Math.floor(S.coins * .01)); if (e > 0) { r.amount += e; r.extras.push(['compound', `Interest +${fmt(e)}`]); } } return r; }
}
class ChickenDinnerPayout extends PayoutDecorator {
  pay(b, why) { const r = super.pay(b, why); if (why === 'coward' && r.amount > b.stake) { const e = Math.floor((r.amount - b.stake) * .3); r.amount += e; r.extras.push(['dinner', `Dinner +${fmt(e)}`]); } return r; }
}
// New Game+: every casino you've ever bought adds +25% to the profit of every board, forever.
class HouseEdgePayout extends PayoutDecorator {
  pay(b, why) {
    const r = super.pay(b, why), n = S.life.casinos || 0, profit = r.amount - b.stake;
    if (n && profit > 0) { const e = Math.floor(profit * HOUSE_EDGE * n); r.amount += e; r.extras.push(['house', `House edge +${fmt(e)}`]); }
    return r;
  }
}
// A power cut: every board cashed out in the dark pays danger money on top of its profit (game/power-cut.js).
class DarkPayout extends PayoutDecorator {
  pay(b, why) {
    const r = super.pay(b, why), profit = r.amount - b.stake;
    if (profit > 0) { const e = Math.floor(profit * PowerCut.BONUS); r.amount += e; r.extras.push(['dark', `Danger money +${fmt(e)}`]); }
    return r;
  }
}
// A sugar rush from the ice cream van: the next winning cash-out gets +25% on its profit (one cone, one cash-out).
class SugarPayout extends PayoutDecorator {
  pay(b, why) {
    const r = super.pay(b, why), profit = r.amount - b.stake;
    if (profit > 0 && S.sugar > 0) { const e = Math.floor(profit * IceCream.RUSH); S.sugar--; r.amount += e; r.extras.push(['sugar', `Sugar rush +${fmt(e)}`]); }
    return r;
  }
}
export const HOUSE_EDGE = .25;
const PAYOUT_DECORATORS = [['egg', NestEggPayout], ['flagfan', FlagFanaticPayout], ['compound', CompoundPayout], ['dinner', ChickenDinnerPayout]];
export const buildPayout = () => {
  let p = PAYOUT_DECORATORS.reduce((acc, [id, D]) => hasA(id) ? new D(acc) : acc, new Payout());
  if (S.life.casinos) p = new HouseEdgePayout(p);
  if (S.sugar > 0) p = new SugarPayout(p);
  return PowerCut.on ? new DarkPayout(p) : p;
};
