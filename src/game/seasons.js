// The seasons (src/data/seasons.js has the dates). Halloween hides pumpkins under safe tiles and sends trick or
// treaters to the door, Bonfire Night has fireworks, and at Christmas Nan sends a card. src/ui/season-view.js dresses
// the room for each.
import { bus } from '../core/bus.js';
import { S, SaveGame, pref, baseCap } from '../core/state.js';
import { SEASONS, PUMPKIN, TRICK, GHOST } from '../data/seasons.js';

// is month m, day d between [m1, d1] and [m2, d2]?
const inSeason = (m, d, [m1, d1], [m2, d2]) => { const x = m * 100 + d; return x >= m1 * 100 + d1 && x <= m2 * 100 + d2; };

export const Seasons = {
  force: null, // a season to try out (?season= in the URL, or the tests); 'none' for none
  rng: Math.random,
  now(date = new Date()) {
    if (!pref('seasons')) return null;
    if (this.force !== null) return SEASONS[this.force] ? this.force : null;
    const m = date.getMonth() + 1, d = date.getDate();
    return Object.keys(SEASONS).find(k => inSeason(m, d, SEASONS[k].from, SEASONS[k].to)) || null;
  },
  is(k) { return this.now() === k; },
  // Halloween: the safe tile that hides this board's pumpkin (one the opening didn't reach, and not a gem), or -1
  pumpkinFor(b) {
    if (!this.is('halloween') || this.rng() >= PUMPKIN.CHANCE) return -1;
    const pool = []; for (let i = 0; i < b.n; i++) if (!b.open[i] && !b.mine[i] && !b.gem[i]) pool.push(i);
    return pool.length ? pool[Math.floor(this.rng() * pool.length)] : -1;
  },
  // Halloween: a friendly ghost under a safe tile on some boards (not the pumpkin's), or -1
  ghostFor(b) {
    if (!this.is('halloween') || this.rng() >= GHOST.CHANCE) return -1;
    const pool = []; for (let i = 0; i < b.n; i++) if (!b.open[i] && !b.mine[i] && !b.gem[i] && i !== b.pumpkin) pool.push(i);
    return pool.length ? pool[Math.floor(this.rng() * pool.length)] : -1;
  },
  // the ghost, dug up: it points at a hidden mine, which Game.tileAddons has flagged (mine is -1 if there were none left)
  boo(b, i, mine) { S.life.ghosts = (S.life.ghosts || 0) + 1; SaveGame.save(); bus.emit('ghost', { b, i, mine, n: S.life.ghosts }); },
  // a pumpkin dug up (Game.tileAddons has already put the pot up)
  found(b, i) { S.life.pumpkins = (S.life.pumpkins || 0) + 1; SaveGame.save(); bus.emit('pumpkin', { b, i, n: S.life.pumpkins }); },
  sweets: () => Math.max(5, Math.ceil(baseCap() * TRICK.SWEETS)),
  // trick or treaters: a bag of sweets, and they give you a sugar rush back (+25% on your next winning cash-out)
  treat() {
    const cost = this.sweets(); if (S.coins < cost) return false;
    S.coins -= cost; S.sugar = (S.sugar || 0) + 1; S.life.treats = (S.life.treats || 0) + 1; SaveGame.saveNow();
    bus.emit('treat', { cost }); return true;
  },
  // no sweets: they egg the window
  trick() { S.life.egged = (S.life.egged || 0) + 1; SaveGame.save(); bus.emit('trick'); },
};
