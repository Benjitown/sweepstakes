// The car boot sale (the numbers are in src/data/car-boot.js): the stall, his prices, haggling and the mystery box.
// It turns up every so often (wiring.js decides if now's a good time) and packs up after a while.
import { bus } from '../core/bus.js';
import { S, SaveGame, hasA, slotsMax } from '../core/state.js';
import { ADDONS, RAR, ABY } from '../data/addons.js';
import { BOOT } from '../data/car-boot.js';
import { Game } from './game.js';
import { Rack } from './rack.js';

// a card you haven't got, weighted by rarity (and not one already on the table)
const bootPick = (rng, not = []) => {
  const pool = ADDONS.filter(a => !hasA(a.id) && !not.includes(a.id)); if (!pool.length) return null;
  let x = rng() * pool.reduce((s, a) => s + RAR[a.r].w, 0);
  for (const a of pool) { x -= RAR[a.r].w; if (x <= 0) return a.id; }
  return pool[pool.length - 1].id;
};

export const CarBoot = {
  timer: 0, stall: null, rng: Math.random,
  schedule(first) {
    clearTimeout(this.timer);
    const [lo, hi] = BOOT.EVERY;
    this.timer = setTimeout(() => { bus.emit('boot:due'); this.schedule(); }, (first ?? lo + this.rng() * (hi - lo)) * 1000);
  },
  // he sets up: three cards at his prices, and the mystery box
  open() {
    const cards = [];
    for (let k = 0; k < BOOT.CARDS; k++) {
      const id = bootPick(this.rng, cards.map(c => c.id)); if (!id) break;
      const [lo, hi] = BOOT.ASK;
      cards.push({ id, price: Math.max(1, Math.ceil(Rack.price(id) * (lo + this.rng() * (hi - lo)))), tries: 0, gone: false, sold: false });
    }
    this.stall = { cards, until: Date.now() + BOOT.OPEN_S * 1000, box: Math.ceil(RAR.uncommon.base * Rack.scale() * BOOT.BOX), boxSold: false };
    bus.emit('boot:open', this.stall);
    return this.stall;
  },
  left() { return this.stall ? Math.max(0, Math.ceil((this.stall.until - Date.now()) / 1000)) : 0; },
  room: () => S.addons.length < slotsMax(),
  // buys card k at its price; returns why not if it can't
  buy(k, price) {
    const c = this.stall && this.stall.cards[k]; if (!c || c.gone || c.sold) return 'gone';
    if (!this.room()) return 'full';
    const p = price ?? c.price; if (!Game.spend(p)) return 'skint';
    S.addons.push({ id: c.id, paid: p }); c.sold = true; this.offShelf(c.id);
    const L = S.life.boot = S.life.boot || { bought: 0, saved: 0, boxes: 0 }; L.bought++; L.saved += Math.max(0, Rack.price(c.id) - p);
    SaveGame.saveNow(); bus.emit('addon:bought', { id: c.id }); bus.emit('boot:bought', { id: c.id, price: p });
    return 'ok';
  },
  // what you'd offer for card k next (or 0 if you've had both goes)
  offer(k) { const c = this.stall && this.stall.cards[k], o = c && BOOT.OFFERS[c.tries]; return o ? Math.max(1, Math.floor(c.price * o.at)) : 0; },
  // make an offer: 'yes' (and it's yours at that), 'no', 'walk' (he sold it to someone else), or why you can't
  haggle(k) {
    const c = this.stall && this.stall.cards[k]; if (!c || c.gone || c.sold) return 'gone';
    const o = BOOT.OFFERS[c.tries], p = this.offer(k); if (!o) return 'done';
    if (!this.room()) return 'full';
    if (S.coins < p) return 'skint';
    c.tries++;
    if (this.rng() < o.yes) { const r = this.buy(k, p); if (r === 'ok') { bus.emit('boot:haggled', { id: c.id, price: p }); return 'yes'; } return r; }
    if (this.rng() < BOOT.WALK) { c.gone = true; return 'walk'; }
    return 'no';
  },
  // the mystery box: any card you haven't got, for one price
  box() {
    const st = this.stall; if (!st || st.boxSold) return 'gone';
    if (!this.room()) return 'full';
    const id = bootPick(this.rng); if (!id) return 'gone';
    if (!Game.spend(st.box)) return 'skint';
    S.addons.push({ id, paid: st.box }); st.boxSold = true; this.offShelf(id);
    const L = S.life.boot = S.life.boot || { bought: 0, saved: 0, boxes: 0 }; L.boxes++;
    SaveGame.saveNow(); bus.emit('addon:bought', { id }); bus.emit('boot:box', { id, price: st.box });
    return id;
  },
  // a card you've just bought here comes off the shop's rack too
  offShelf(id) { if (S.rack.includes(id)) { S.rack = S.rack.map(r => r === id ? null : r); bus.emit('rack'); } },
  close() { if (!this.stall) return; this.stall = null; bus.emit('boot:closed'); },
};
