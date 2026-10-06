// The shop's rack of add-on cards: restocks, rerolls, buying and selling.
import { RESTOCK } from '../data/economy.js';
import { RAR, ADDONS, ABY } from '../data/addons.js';
import { bus } from '../core/bus.js';
import { SaveGame, S, hasA, baseCap } from '../core/state.js';
import { Game } from './game.js';
import { UI } from '../ui/ui.js';

export const Rack = {
  scale() { return baseCap() / 100; },
  price(id) { return Math.ceil(RAR[ABY[id].r].base * this.scale()); },
  rerollCost() { return Math.ceil(15 * this.scale() * (1 + S.rerolls)); },
  restockIn: () => Math.max(0, RESTOCK - (S.run.time - S.rackAt)),
  roll(keepTimer) {
    const pool = ADDONS.filter(a => !hasA(a.id)), out = [];
    for (let k = 0; k < 3 && pool.length; k++) {
      const tot = pool.reduce((s, a) => s + RAR[a.r].w, 0); let x = Math.random() * tot, pick = pool.length - 1;
      for (let j = 0; j < pool.length; j++) { x -= RAR[pool[j].r].w; if (x <= 0) { pick = j; break; } }
      out.push(pool[pick].id); pool.splice(pick, 1);
    }
    S.rack = out;
    if (!keepTimer) { S.rackAt = S.run.time; S.rerolls = 0; }
    bus.emit('rack');
  },
  reroll() { const c = this.rerollCost(); if (!Game.spend(c)) return false; const n = S.rerolls + 1; this.roll(true); S.rerolls = n; bus.emit('rack'); SaveGame.saveNow(); return true; },
  tick() { if (this.restockIn() <= 0) { this.roll(); UI.toast('Fresh add-ons in the rack.'); } },
};
