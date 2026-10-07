// The seasons (src/data/seasons.js has the dates). Halloween hides pumpkins under safe tiles and sends trick or
// treaters to the door, Bonfire Night has fireworks and kids with a Guy, and at Christmas Nan sends a card. src/ui/season-view.js dresses
// the room for each.
import { bus } from '../core/bus.js';
import { S, SaveGame, pref, baseCap } from '../core/state.js';
import { SEASONS, PUMPKIN, TRICK, GHOST } from '../data/seasons.js';

// is month m, day d between [m1, d1] and [m2, d2]?
const inSeason = (m, d, [m1, d1], [m2, d2]) => { const x = m * 100 + d; return x >= m1 * 100 + d1 && x <= m2 * 100 + d2; };
// Easter Sunday in year y (the anonymous Gregorian method), and is date within [lo, hi] days of it?
export const easterSunday = y => {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, (h + l - 7 * m + 114) % 31 + 1);
};
const nearEaster = (date, [lo, hi]) => { const n = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - easterSunday(date.getFullYear())) / 864e5); return n >= lo && n <= hi; };

export const Seasons = {
  force: null, // a season to try out (?season= in the URL, or the tests); 'none' for none
  rng: Math.random,
  now(date = new Date()) {
    if (!pref('seasons')) return null;
    if (this.force !== null) return SEASONS[this.force] ? this.force : null;
    const m = date.getMonth() + 1, d = date.getDate();
    return Object.keys(SEASONS).find(k => SEASONS[k].around ? nearEaster(date, SEASONS[k].around) : inSeason(m, d, SEASONS[k].from, SEASONS[k].to)) || null;
  },
  is(k) { return this.now() === k; },
  // Pancake Day: Shrove Tuesday, 47 days before Easter Sunday (Nan says so in the group chat)
  pancakeDay(date = new Date()) { const e = easterSunday(date.getFullYear()); return Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - e) / 864e5) === -47; },
  // Halloween: the safe tile that hides this board's pumpkin (one the opening didn't reach, and not a gem), or -1. At
  // Easter it's a chocolate egg instead.
  egg() { return this.is('easter'); },
  pumpkinFor(b) {
    if (!(this.is('halloween') || this.is('easter')) || this.rng() >= PUMPKIN.CHANCE) return -1;
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
  found(b, i) {
    const egg = this.egg(), k = egg ? 'easterEggs' : 'pumpkins'; S.life[k] = (S.life[k] || 0) + 1; SaveGame.save();
    bus.emit('pumpkin', { b, i, n: S.life[k], egg });
  },
  sweets: () => Math.max(5, Math.ceil(baseCap() * TRICK.SWEETS)),
  // trick or treaters: a bag of sweets, and they give you a sugar rush back (+25% on your next winning cash-out)
  treat() {
    const cost = this.sweets(); if (S.coins < cost) return false;
    S.coins -= cost; S.sugar = (S.sugar || 0) + 1; S.life.treats = (S.life.treats || 0) + 1; SaveGame.saveNow();
    bus.emit('treat', { cost }); return true;
  },
  // no sweets: they egg the window
  trick() { S.life.egged = (S.life.egged || 0) + 1; SaveGame.save(); bus.emit('trick'); },
  // Christmas: a quid in the carol singers' tin gets you a shield (and nothing happens if you hide)
  carol(give) {
    if (give) {
      const cost = this.sweets(); if (S.coins < cost) return false;
      S.coins -= cost; S.inv.shield = (S.inv.shield || 0) + 1; S.life.carols = (S.life.carols || 0) + 1; SaveGame.saveNow();
      bus.emit('carol', { give: true, cost }); return true;
    }
    bus.emit('carol', { give: false }); return true;
  },
  // Bonfire Night: a quid for the Guy gets you a sparkler (your next board's golden); no quid and they let a banger off
  guy(give) {
    if (give) {
      const cost = this.sweets(); if (S.coins < cost) return false;
      S.coins -= cost; S.goldNext = (S.goldNext || 0) + 1; S.life.guys = (S.life.guys || 0) + 1; SaveGame.saveNow();
      bus.emit('guy', { give: true, cost }); return true;
    }
    S.streak = 0; SaveGame.save(); bus.emit('guy', { give: false }); return true;
  },
};
