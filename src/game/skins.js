// Board styles (src/data/skins.js): which you own, which is on, and buying one. Kept in S.life, so they last.
import { bus } from '../core/bus.js';
import { S, SaveGame } from '../core/state.js';
import { SKIN_BY } from '../data/skins.js';
import { Game } from './game.js';

export const Skins = {
  owned: id => id === 'classic' || (S.life.skins || []).includes(id),
  current: () => (SKIN_BY[S.life.skin] && Skins.owned(S.life.skin) ? S.life.skin : 'classic'),
  // put one on (if it's yours)
  wear(id) {
    if (!SKIN_BY[id] || !this.owned(id)) return false;
    S.life.skin = id; SaveGame.save(); bus.emit('skin', { id });
    return true;
  },
  // buy one and put it on
  buy(id) {
    const s = SKIN_BY[id]; if (!s || this.owned(id)) return this.wear(id);
    if (!Game.spend(s.cost)) return false;
    S.life.skins = [...(S.life.skins || []), id]; SaveGame.saveNow();
    bus.emit('skin:bought', { id });
    return this.wear(id);
  },
};
