// Lifetime rank: XP, level-ups and their rewards. Survives busting.
import { ABY } from '../data/addons.js';
import { rankName, xpNeed } from '../data/ranks.js';
import { bus } from '../core/bus.js';
import { SaveGame, S, baseCap } from '../core/state.js';
import { Game } from './game.js';

export const Rank = {
  award(xp) {
    const L = S.life; L.xp += Math.max(0, Math.round(xp));
    while (L.xp >= xpNeed(L.lvl)) {
      L.xp -= xpNeed(L.lvl); L.lvl++;
      const before = rankName(L.lvl - 1), name = rankName(L.lvl);
      let coins = Math.round(baseCap() * (.6 + .04 * L.lvl)), extra = '';
      if (L.lvl % 3 === 0) { S.inv.shield++; extra = ' + a shield'; }
      if (L.lvl % 5 === 0) { const id = Game.giveRandomAddon(); if (id) extra += ` + ${ABY[id].name}`; else coins = Math.round(coins * 1.5); }
      S.coins += coins;
      bus.emit('levelup', { lvl: L.lvl, name, newRank: name !== before, coins, extra });
    }
    bus.emit('xp');
    SaveGame.save();
  },
};
