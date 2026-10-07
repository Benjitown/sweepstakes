// The rules: dealing, digging, cashing out, shopping, spins, busts. Views only talk to this.
import { fmt, nice } from '../core/util.js';
import { TABLES, TBY, CASINO, BOOST, MAXB, GOLDEN, SPIN_EVERY, ASC, ROMAN } from '../data/economy.js';
import { gemTier } from '../data/gems.js';
import { UBY } from '../data/upgrades.js';
import { RAR, ADDONS, ABY } from '../data/addons.js';
import { WHEEL } from '../data/wheel.js';
import { bus } from '../core/bus.js';
import {
  freshRun, SaveGame, S, setState, lvl, has, on, pref, hasA, boardCount, asc, tableCap, effCap, baseCap, luck,
  slotsMax,
} from '../core/state.js';
import { boardFactory } from '../board/factory.js';
import { Solver } from '../board/solver.js';
import { mineChain } from '../board/mine-chain.js';
import { buildPayout } from '../board/payout.js';
import { DigCommand, invoke } from './commands.js';
import { Rack } from './rack.js';
import { Stars } from './horoscope.js';
import { Tin } from './biscuit-tin.js';
import { Seasons } from './seasons.js';
import { PUMPKIN } from '../data/seasons.js';
import { SPECIAL_BY } from '../data/specials.js';
import { Specials } from './specials.js';
import { UI } from '../ui/ui.js';

/* =====================================================================================
   Mediator · https://refactoring.guru/design-patterns/mediator
   ===================================================================================== */
export const Game = {
  slots: new Array(MAXB).fill(null),

  /* coins. fx describes where the money flies in from, for the view; the logic never waits for it. */
  setCoins(v, bump, fx) { S.coins = v; S.run.peak = Math.max(S.run.peak, v); S.life.bestPeak = Math.max(S.life.bestPeak, v); bus.emit('coins', { bump, fx }); },
  spend(n) { if (S.coins < n) return false; this.setCoins(S.coins - n); return true; },

  /* stakes & tables */
  clampStake(t, v) { const hi = Math.min(effCap(t), S.coins); return Math.max(t.min, Math.min(Math.floor(v), hi)); },
  stakeFor(t) { return this.clampStake(t, S.stakes[t.id] ?? nice(Math.max(t.min, S.coins / 5))); },
  stakeBounds(t) { return [t.min, Math.max(t.min, Math.min(effCap(t), S.coins))]; },
  setStake(t, v) { S.stakes[t.id] = this.clampStake(t, v); bus.emit('stake'); SaveGame.save(); },
  selectTable(t) { S.sel = t.id; bus.emit('table:selected', { t }); SaveGame.save(); },
  unlockTable(t) {
    if (S.unlocked.includes(t.id)) return this.selectTable(t);
    if (!this.spend(t.cost)) return UI.toast(`${t.name} costs ${fmt(t.cost)} to unlock.`);
    S.unlocked.push(t.id); S.sel = t.id; Rack.roll();
    bus.emit('table:unlocked', { t }); SaveGame.saveNow();
  },

  /* boards */
  deal(slot, tid = S.sel, quiet = false) {
    const t = TBY[tid];
    if (this.slots[slot]) return false;
    if (S.coins < t.min) { if (!quiet) UI.toast(`You need ${fmt(t.min)} coins to sit at ${t.name}.`); return false; }
    const stake = this.stakeFor(t);
    let golden = Math.random() < GOLDEN * (hasA('midas') ? 3 : 1);
    if (S.goldNext > 0) { S.goldNext--; golden = true; }
    S.run.boards++; S.life.boards++;
    const b = boardFactory().create(slot, t, stake, golden, Specials.roll(golden));
    this.slots[slot] = b;
    this.setCoins(S.coins - stake);
    bus.emit('board:dealt', { b, quiet, big: !quiet && stake >= Math.max(500, (S.coins + stake) * .4) });
    SaveGame.saveNow();
    return true;
  },
  dealAll() {
    let n = 0;
    for (let s = 0; s < boardCount(); s++) { if (this.slots[s]) continue; if (!this.deal(s, S.sel, n > 0)) break; n++; }
    if (!n && this.slots.slice(0, boardCount()).every(Boolean)) UI.toast('All your boards are already in play.');
  },
  dig(b, i, src = 'you') {
    if (b.over || b.open[i] || b.flag[i]) return;
    if (src === 'you' || src === 'probe') b.human = true;
    if (!b.started) {
      b.placeMines(i); b.started = true; const opened = b.flood(i); b.base = b.revealed; b.t0 = Date.now();
      b.placeGems(b.gemsTotal); b.pumpkin = Seasons.pumpkinFor(b);
      bus.emit('board:cells', { b, cells: opened });
      this.tileAddons(b, i, opened, 0);
      bus.emit('dig', { b, i, src, risk: 0 });
      return this.after(b);
    }
    // How risky was this dig? Provably safe and probed tiles pay nothing extra.
    let p = 0;
    if (src !== 'probe') { const d = Solver.full(b); if (!d.KS[i]) p = Math.min(.95, d.P[i]); }
    if (b.mine[i]) { b.combo = 0; mineChain.handle(b, i, src); return; }
    const opened = b.flood(i);
    bus.emit('board:cells', { b, cells: opened });
    if (p > 0) {
      let bonus = BOOST * (1 + .25 * asc()) * p / (1 - p);
      if (hasA('daredevil')) { bonus *= 1.3; bus.emit('addon:fired', { id: 'daredevil' }); }
      if (hasA('glass')) { bonus *= 2; bus.emit('addon:fired', { id: 'glass' }); }
      if (b.special === 'trouble') bonus *= SPECIAL_BY.trouble.risky; // the landlord's special: risky digs pay double
      const k = 1 + bonus; b.G *= k; b.guesses++; b.combo++;
      bus.emit('board:risky', { b, i, k, p, src, combo: b.combo });
    }
    this.collectGems(b, opened);
    this.tileAddons(b, i, opened, p);
    bus.emit('dig', { b, i, src, risk: p });
    this.after(b);
  },
  collectGems(b, opened) {
    for (const j of opened) {
      const x = b.gem[j]; if (!x) continue;
      b.J *= x; b.gemsFound++; S.life.gems++;
      const tier = gemTier(x); if (tier.k === 'jackpot') S.life.jackpots++;
      bus.emit('board:gem', { b, i: j, x, tier });
    }
  },
  tileAddons(b, i, opened, p) {
    const fire = (id, cell, k, text) => { b.G *= k; bus.emit('addon:fired', { id, b, i: cell, text }); };
    if (p > 0 && hasA('corner') && b.isCorner(i)) fire('corner', i, 1.25, 'Corner ×1.25');
    if (p > 0 && hasA('nester') && opened.length >= 10) fire('nester', i, 1.3, 'Nester ×1.3');
    if (hasA('sevens')) { const s = opened.filter(j => b.num[j] === 7); if (s.length) fire('sevens', s[0], 1.77 ** s.length, `Sevens ×${(1.77 ** s.length).toFixed(2)}`); }
    if (hasA('eight')) { const s = opened.filter(j => b.num[j] === 8); if (s.length) fire('eight', s[0], 8 ** s.length, `Eight Ball ×${8 ** s.length}`); }
    // Nan's stars: the first time a board uncovers today's lucky number, ×1.25 (game/horoscope.js)
    const lucky = b.starred ? 0 : Stars.luckyToday(), hit = lucky ? opened.find(j => b.num[j] === lucky) : undefined;
    if (hit !== undefined) { b.starred = true; fire('stars', hit, Stars.BONUS, `Written in the stars ×${Stars.BONUS}`); }
    // Halloween: this board's pumpkin, dug up (game/seasons.js)
    if (b.pumpkin >= 0 && opened.includes(b.pumpkin)) { const j = b.pumpkin; b.pumpkin = -1; b.pumpkinAt = j; b.G *= PUMPKIN.X; Seasons.found(b, j); }
  },
  defuse(b, i, by) {
    b.flag[i] = 1; b.defused.add(i);
    bus.emit('board:cells', { b, cells: [i] }); bus.emit('board:defused', { b, i, by });
    this.after(b); SaveGame.saveNow();
  },
  toggleFlag(b, i, src = 'you') {
    if (b.over || b.open[i] || b.defused.has(i)) return;
    b.flag[i] ^= 1;
    bus.emit('board:cells', { b, cells: [i] }); bus.emit('flag', { b, i, on: !!b.flag[i], src });
    SaveGame.save();
  },
  chord(b, i, src = 'you') {
    if (!b.open[i] || !b.num[i]) return;
    let f = 0; for (const j of b.nb[i]) f += b.flag[j];
    if (f !== b.num[i]) return;
    for (const j of b.nb[i]) if (!b.open[j] && !b.flag[j]) { this.dig(b, j, src); if (b.over) return; }
  },
  probesFor: b => S.inv.probe + (b.fp || 0),
  probe(b, i) {
    if (b.open[i] || b.flag[i]) return;
    if (!b.started) return this.dig(b, i);
    if (this.probesFor(b) <= 0) { b.mode = 'dig'; return bus.emit('board:tools', { b }); }
    if (b.fp > 0) b.fp--; else S.inv.probe--;
    b.mode = 'dig'; b.probed.add(i); bus.emit('board:tools', { b }); bus.emit('inventory');
    if (b.mine[i]) { b.flag[i] = 1; bus.emit('board:cells', { b, cells: [i] }); bus.emit('probe', { b, i, mine: true }); SaveGame.saveNow(); }
    else this.dig(b, i, 'probe');
  },
  after(b) {
    if (b.over) return;
    if (b.revealed >= b.safe) {
      if (hasA('speed') && b.t0 && Date.now() - b.t0 <= 25000) { b.G *= 1.5; bus.emit('addon:fired', { id: 'speed', b, i: null, text: 'Speed Demon ×1.5' }); }
      return this.cashOut(b, 'clear');
    }
    if (b.rawMult() >= b.lim) return this.cashOut(b, 'limit');
    // The Lock-in (a landlord's special): half the board's dug, so the landlord unlocks the doors
    if (b.special === 'lockin' && !b.doors && !Specials.locked(b)) { b.doors = true; bus.emit('special:open', { b }); }
    bus.emit('board:hud', { b }); SaveGame.save();
  },
  explode(b, i, src) {
    b.over = true; b.result = `Lost ${fmt(b.stake)}`; S.streak = 0; S.run.losses++;
    // Happy Hour (a landlord's special): the landlord gives you half your stake back
    const back = b.special === 'happy' ? Math.floor(b.stake * SPECIAL_BY.happy.back) : 0;
    if (back) { b.result = `Lost ${fmt(b.stake - back)}`; this.setCoins(S.coins + back); }
    bus.emit('board:boom', { b, i, src, left: b.safe - b.revealed, missed: b.hiddenGems(), back }); bus.emit('board:hud', { b }); bus.emit('coins', {});
    SaveGame.saveNow();
    setTimeout(() => this.endBoard(b), 1700);
  },
  cashOut(b, why = 'manual') {
    if (b.over || !b.started) return;
    // The Lock-in: nobody leaves till half the board's dug (the board finishing, or hitting its limit, still pays)
    if (Specials.locked(b) && (why === 'manual' || why === 'coward')) { if (why === 'manual') bus.emit('special:locked', { b }); return; }
    const { amount, extras } = buildPayout().pay(b, why);
    extras.forEach(([id, text]) => bus.emit('addon:fired', { id, b, i: null, text }));
    const profit = amount - b.stake, mult = b.mult();
    b.over = true; b.result = `Paid ${fmt(amount)}`; S.run.wins++;
    if (profit > 0 && (b.frac() >= .5 || mult >= 2)) { S.streak++; bus.emit('streak', { n: S.streak }); }
    S.run.biggest = Math.max(S.run.biggest, profit);
    this.setCoins(S.coins + amount, true, { from: b, amount, human: b.human });
    bus.emit('board:cashout', { b, why, amount, profit, mult, missed: b.hiddenGems() }); bus.emit('board:hud', { b });
    SaveGame.saveNow();
    setTimeout(() => this.endBoard(b), why === 'clear' || why === 'limit' ? 1600 : 1100);
  },
  endBoard(b) {
    if (this.slots[b.slot] !== b) return;
    this.slots[b.slot] = null; bus.emit('board:ended', { b });
    if (on('restake') && b.slot < boardCount() && S.coins >= b.t.min && S.unlocked.includes(b.t.id)) {
      const keep = S.stakes[b.t.id]; S.stakes[b.t.id] = b.stake;
      const ok = this.deal(b.slot, b.t.id, true); S.stakes[b.t.id] = keep;
      if (ok) { const nb = this.slots[b.slot]; setTimeout(() => { if (this.slots[b.slot] === nb && !nb.started) invoke(new DigCommand(nb, Math.floor(nb.t.h / 2) * nb.t.w + Math.floor(nb.t.w / 2), 'bot')); }, 350); }
    }
    this.checkBust(); SaveGame.saveNow();
  },

  /* shop */
  nextCost: u => u.costs[lvl(u.id)],
  gate(u) {
    if (u.req && !has(u.req)) return `Needs ${UBY[u.req].name}.`;
    if (u.id === 'boards') { const L = lvl('boards'); if (L >= 3 && L < 7 && asc() < L - 2) return `Needs Ascension ${ROMAN[L - 2]}.`; }
    return null;
  },
  buyUpgrade(u) {
    const cost = this.nextCost(u); if (cost == null || this.gate(u) || !this.spend(cost)) return;
    S.upg[u.id] = lvl(u.id) + 1; if (u.toggle) S.tog[u.id] = true;
    bus.emit('upgrade:bought', { u }); SaveGame.saveNow();
  },
  setToggle(id, v) { S.tog[id] = v; bus.emit('toggles'); SaveGame.saveNow(); },
  consumables() {
    const t = TBY[S.sel], k = hasA('bulk') ? .5 : 1, c = tableCap(t);
    return [
      { id: 'shield', name: 'Shield', icon: 'shield', cost: Math.ceil(c * .3 * k), desc: hasA('glass') ? 'Glass Jaw has switched shields off.' : `Survive one mine. You have ${S.inv.shield}.` },
      { id: 'probe', name: 'Probe', icon: 'probe', cost: Math.ceil(c * .1 * k), desc: `Check one tile before you dig it. You have ${S.inv.probe}.` }];
  },
  buyConsumable(c) { if (!this.spend(c.cost)) return; S.inv[c.id]++; bus.emit('inventory'); bus.emit('purchase'); SaveGame.saveNow(); },

  /* add-ons */
  buyAddon(k) {
    const id = S.rack[k]; if (!id) return;
    if (S.addons.length >= slotsMax()) return UI.toast('No room. Sell a card first.');
    const price = Rack.price(id); if (!this.spend(price)) return;
    S.addons.push({ id, paid: price }); S.rack[k] = null;
    bus.emit('addon:bought', { id }); SaveGame.saveNow();
  },
  sellAddon(k) {
    const a = S.addons[k]; if (!a) return;
    S.addons.splice(k, 1); bus.emit('addon:changed'); this.setCoins(S.coins + Math.floor(a.paid / 2), true); SaveGame.saveNow();
  },
  dropAddon(id) { const k = S.addons.findIndex(a => a.id === id); if (k < 0) return; S.addons.splice(k, 1); bus.emit('addon:burned', { id }); bus.emit('addon:changed'); SaveGame.saveNow(); },
  giveRandomAddon() {
    const pool = ADDONS.filter(a => !hasA(a.id)); if (!pool.length || S.addons.length >= slotsMax()) return null;
    const tot = pool.reduce((s, a) => s + RAR[a.r].w, 0); let x = Math.random() * tot, pick = pool[pool.length - 1];
    for (const a of pool) { x -= RAR[a.r].w; if (x <= 0) { pick = a; break; } }
    S.addons.push({ id: pick.id, paid: Rack.price(pick.id) }); S.rack = S.rack.map(id => id === pick.id ? null : id);
    return pick.id;
  },

  /* free spin: the prize is decided and saved the moment you spin, then the wheel catches up */
  spinIn: () => Math.max(0, SPIN_EVERY - (S.run.time - S.spinAt)),
  spin() {
    if (this.spinIn() > 0) return null;
    const k = Math.floor(Math.random() * WHEEL.length), w = WHEEL[k], base = baseCap();
    const prize = { k, kind: w.k, coins: 0, card: null, text: '' };
    if (w.k === 'coins' || w.k === 'jackpot') { prize.coins = Math.round(base * w.x); prize.text = `+${fmt(prize.coins)} coins`; }
    else if (w.k === 'golden') { S.goldNext += 2; prize.text = 'Your next 2 boards are golden'; }
    else if (w.k === 'shield') { S.inv.shield += 2; prize.text = '+2 shields'; }
    else if (w.k === 'probe') { S.inv.probe += 3; prize.text = '+3 probes'; }
    else if (w.k === 'card') {
      prize.card = this.giveRandomAddon();
      if (prize.card) prize.text = `Free card: ${ABY[prize.card].name}`;
      else { prize.coins = base; prize.text = `No room for a card, so +${fmt(base)} coins`; }
    }
    S.spinAt = S.run.time;
    if (prize.coins) S.coins += prize.coins;
    SaveGame.saveNow();
    return prize;
  },

  /* the big ones */
  canAscend() { const need = ASC[asc()]; return need && S.coins >= need.cost && boardCount() >= need.boards; },
  ascend() {
    const A = asc(), need = ASC[A]; if (!this.canAscend() || !this.spend(need.cost)) return false;
    S.asc = A + 1; S.life.bestAsc = Math.max(S.life.bestAsc || 0, S.asc);
    bus.emit('ascended', { level: S.asc }); SaveGame.saveNow(); return true;
  },
  buyCasino() { if (S.owned || !this.spend(CASINO)) return; S.owned = true; S.life.casinos++; bus.emit('casino'); SaveGame.saveNow(); },
  flip(bet, side) {
    const win = Math.random() < Math.min(.95, .5 * luck());
    S.coins += win ? bet : -bet; SaveGame.saveNow();
    return { win, face: win === (side === 'smile') };
  },

  /* busting */
  lastRun: null, lastTin: 0,
  bust(reason, deferModal) {
    this.lastRun = { ...S.run, reason };
    S.life.busts++; S.life.time += S.run.time;
    this.slots.fill(null);
    setState(freshRun(S.life, { muted: S.muted, crt: pref('crt'), quips: pref('quips'), odd: pref('odd'), vibe: pref('vibe'), rude: pref('rude'), quiz: pref('quiz'), nanvoice: pref('nanvoice'), dares: pref('dares'), seasons: pref('seasons'), vol: S.vol, noiseVol: S.noiseVol, music: pref('music'), musicVol: S.musicVol, track: S.track }));
    // a real rainy day (not when you pull the plug yourself): Nan brings her biscuit tin round
    const tin = this.lastTin = reason === 'manual' ? 0 : Tin.open();
    if (tin) { S.coins += tin; S.run.peak = S.coins; S.run.hist = [[0, S.coins]]; bus.emit('tin:open', { coins: tin }); }
    Rack.roll(); SaveGame.saveNow();
    if (!deferModal) UI.showBust(reason);
  },
  resetRun() { this.bust('manual', true); S.life.busts--; SaveGame.saveNow(); bus.emit('reset'); UI.toast('Fresh run. Same friends.'); },
  checkBust() { if (S.coins < TABLES[0].min && !this.slots.some(Boolean) && UI.modalClosed()) this.bust('broke'); },
};
// the save game snapshots unfinished boards through this hook (Memento)
SaveGame.boards = () => Game.slots.map(b => b && !b.over ? b.toMemento() : null);
