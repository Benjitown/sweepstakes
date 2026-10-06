// Power cuts: the prepaid meter runs out. Boards cashed out in the dark pay danger money until the lights come back.
import { bus } from '../core/bus.js';
import { SaveGame, S, baseCap } from '../core/state.js';

export const PowerCut = {
  on: false, until: 0, timer: 0,
  SECONDS: 45,  // how long until the meter's emergency credit kicks in
  BONUS: .5,    // danger money: +50% on the profit of every board cashed out in the dark
  cost: () => Math.max(5, Math.ceil(baseCap() * .05)), // a top-up
  left() { return this.on ? Math.max(0, Math.ceil((this.until - Date.now()) / 1000)) : 0; },
  start(seconds = this.SECONDS) {
    if (this.on) return false;
    this.on = true; this.until = Date.now() + seconds * 1000;
    clearTimeout(this.timer); this.timer = setTimeout(() => this.end('credit'), seconds * 1000);
    S.life.house = S.life.house || {}; S.life.house.powercut = (S.life.house.powercut || 0) + 1; SaveGame.save();
    bus.emit('power', { on: true, seconds });
    return true;
  },
  // why: 'credit' (the emergency credit kicked in), 'topup' (you paid), 'reset' (a new run, or the tests)
  end(why = 'credit') {
    if (!this.on) return false;
    clearTimeout(this.timer); this.on = false;
    bus.emit('power', { on: false, why });
    return true;
  },
  topUp() {
    const c = this.cost(); if (!this.on || S.coins < c) return 0;
    S.coins -= c; S.life.house.topups = (S.life.house.topups || 0) + 1; SaveGame.saveNow();
    this.end('topup');
    return c;
  },
};
