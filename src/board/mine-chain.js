// What happens when a mine is hit: Spare Fuse, then Shield, then boom.
import { S, hasA } from '../core/state.js';
import { Game } from '../game/game.js';

/* =====================================================================================
   Chain of Responsibility · https://refactoring.guru/design-patterns/chain-of-responsibility
   ===================================================================================== */
class MineHandler {
  setNext(h) { this.next = h; return h; }
  handle(b, i, src) { return this.next ? this.next.handle(b, i, src) : false; }
}
class SpareFuseHandler extends MineHandler {
  handle(b, i, src) {
    if (!hasA('fuse') || b.fuseUsed) return super.handle(b, i, src);
    b.fuseUsed = true; Game.defuse(b, i, 'fuse');
    if (Math.random() < .25) setTimeout(() => Game.dropAddon('fuse'), 700);
    return true;
  }
}
class ShieldHandler extends MineHandler {
  handle(b, i, src) {
    if (S.inv.shield <= 0 || hasA('glass')) return super.handle(b, i, src);
    S.inv.shield--; Game.defuse(b, i, 'shield');
    return true;
  }
}
class ExplodeHandler extends MineHandler { handle(b, i, src) { Game.explode(b, i, src); return true; } }
export const mineChain = new SpareFuseHandler();
mineChain.setNext(new ShieldHandler()).setNext(new ExplodeHandler());
