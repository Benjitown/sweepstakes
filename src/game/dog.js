// Biscuit, next door's dog: now and then he wanders in (you'll hear him first). Give him a biscuit and he sniffs out
// a mine on one of your live boards and sits on it, so it gets flagged for you. He is never, ever wrong.
import { bus } from '../core/bus.js';
import { SaveGame, S, baseCap } from '../core/state.js';
import { Game } from './game.js';

export const Dog = {
  rng: Math.random,
  price: () => Math.max(5, Math.ceil(baseCap() * .03)),
  // a hidden, unflagged mine on a live board (a board you've been playing by hand comes first)
  sniff() {
    const boards = Game.slots.filter(b => b && b.started && !b.over).sort((x, y) => (y.human ? 1 : 0) - (x.human ? 1 : 0));
    for (const b of boards) {
      const mines = []; for (let i = 0; i < b.n; i++) if (b.mine[i] && !b.flag[i] && !b.open[i]) mines.push(i);
      if (mines.length) return { b, i: mines[Math.floor(this.rng() * mines.length)] };
    }
    return null;
  },
  treat() {
    const c = this.price(); if (S.coins < c) return null;
    const hit = this.sniff(); if (!hit) return null;
    S.coins -= c;
    const h = S.life.house = S.life.house || {}; h.dog = (h.dog || 0) + 1;
    Game.toggleFlag(hit.b, hit.i, 'dog');
    SaveGame.saveNow(); bus.emit('dog', { ...hit, price: c });
    return hit;
  },
};
