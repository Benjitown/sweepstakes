// The duck race out back of the Flip Booth: five rubber ducks, a bookie's odds card, one winner.
import { shuffle } from '../core/util.js';
import { SaveGame, S, luck } from '../core/state.js';

export const DUCK_NAMES = ['Quackers', 'Sir Waddles', 'Puddles', 'Big Bill', 'Captain Bread', 'Lady Splash', 'Nugget', 'Admiral Quack',
  'Soggy Steve', 'Gary', 'Margate Mike', 'Wet Kevin', 'Bath Time', 'Little Squeak', 'Pond Life', 'Waddlesworth', 'Duck Duck Gus', 'Crumbs'];
export const DUCK_COLS = ['#ffd23f', '#fe5f55', '#009dff', '#3fc18a', '#a275f0', '#ffa31a', '#ff8fb0', '#f4f1e8'];
// the bookie keeps 5% (EDGE), and even the favourite pays at least ×1.2
export const RACE = { ducks: 5, edge: .95, minPay: 1.2 };

export const DuckRace = {
  card: null,
  // a fresh odds card: each duck's form is random, its chance is its share of the form, and the odds follow
  newCard() {
    const names = shuffle(DUCK_NAMES), cols = shuffle(DUCK_COLS), form = Array.from({ length: RACE.ducks }, () => .6 + Math.random() * 2.4);
    const total = form.reduce((s, f) => s + f, 0);
    this.card = form.map((f, i) => { const p = f / total; return { name: names[i], col: cols[i], p, pay: Math.max(RACE.minPay, Math.floor(RACE.edge / p * 10) / 10) }; });
    return this.card;
  },
  // The result is decided (and saved) the moment you bet; the race on screen only shows it. The bet leaves your coins
  // straight away, and any winnings wait in S.duckOwed until the ducks cross the line (or the next page load, if you left).
  // Your luck (charms, the carrot) makes your own duck a bit quicker. Everyone else finishes in an order drawn by form.
  race(pick, bet) {
    const card = this.card;
    if (!card || !card[pick] || !(bet >= 1) || bet > S.coins) return null;
    const weight = i => card[i].p * (i === pick ? luck() : 1);
    const order = []; let left = card.map((d, i) => i);
    while (left.length) {
      let x = Math.random() * left.reduce((s, i) => s + weight(i), 0), k = left[left.length - 1];
      for (const i of left) { x -= weight(i); if (x <= 0) { k = i; break; } }
      order.push(k); left = left.filter(i => i !== k);
    }
    const win = order[0] === pick, prize = win ? Math.floor(bet * card[pick].pay) : 0;
    S.coins -= bet; S.duckOwed = (S.duckOwed || 0) + prize;
    if (win) S.life.ducks = (S.life.ducks || 0) + 1;
    this.card = null; SaveGame.saveNow();
    return { pick, bet, order, win, prize, pay: card[pick].pay, card };
  },
  settle() { const owed = S.duckOwed || 0; if (owed) { S.coins += owed; S.duckOwed = 0; SaveGame.saveNow(); } return owed; },
};
