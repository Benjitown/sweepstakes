// The Fruity (a booth tab): a three-reel fruit machine with holds, nudges and a gamble. Each go is decided the moment
// you press Spin, and whatever it wins waits in the machine's win meter (S.fruityOwed) until you collect or gamble it,
// so leaving mid-spin never loses a win (main.js pays the meter out on the next visit).
import { FRUITY_REELS, FRUITY_STAKES, FRUITY_FEATURES } from '../data/fruity.js';
import { FruityRules } from './fruity-rules.js';
import { SaveGame, S, baseCap } from '../core/state.js';

const NOT_HELD = () => [false, false, false];

export const Fruity = {
  m: null,          // the machine: { kind, pos, price, holdsOn, held, nudges, gambles, wins, dry }
  rng: Math.random, // the tests swap this for a script
  price: kind => Math.max(1, Math.ceil(baseCap() * kind.share)),
  machine() {
    if (!this.m) this.m = { kind: FRUITY_STAKES[0], pos: FRUITY_REELS.map(b => Math.floor(Math.random() * b.length)), price: 0,
      holdsOn: false, held: NOT_HELD(), nudges: 0, gambles: 0, wins: 0, dry: 0 };
    return this.m;
  },
  life() { return S.life.fruity = S.life.fruity || { goes: 0, wins: 0, best: 0, nudged: 0, sevens: 0 }; },
  // the stake can't change while holds are lit: they only work at the price of the go that earned them
  setStake(id) {
    const m = this.machine(), kind = FRUITY_STAKES.find(k => k.id === id);
    if (!kind || m.holdsOn) return false;
    m.kind = kind; return true;
  },
  toggleHold(r) {
    const m = this.machine(); if (!m.holdsOn) return false;
    if (!m.held[r] && m.held.filter(Boolean).length >= FRUITY_FEATURES.maxHolds) return false;
    m.held[r] = !m.held[r]; return true;
  },
  canSpin() { const m = this.machine(); return !m.nudges && S.coins + this.owed() >= this.price(m.kind); }, // the meter pays out first
  // one go: the meter pays out first, then the unheld reels spin. A losing go may light up nudges or holds (never both,
  // and never holds twice running); with holds lit the machine picks the best ones for you (change them if you like).
  spin() {
    const m = this.machine(); if (!this.canSpin()) return null;
    this.collect();
    const price = this.price(m.kind), held = m.holdsOn ? m.held.slice() : NOT_HELD(), heldGo = held.some(Boolean), from = m.pos.slice();
    S.coins -= price; m.price = price;
    m.pos = m.pos.map((p, r) => held[r] ? p : Math.floor(this.rng() * FRUITY_REELS[r].length));
    const line = FruityRules.line(m.pos), x = FruityRules.pay(line);
    m.holdsOn = false; m.held = NOT_HELD(); m.nudges = 0;
    if (!x) {
      const roll = this.rng();
      if (roll < FRUITY_FEATURES.nudge) m.nudges = FRUITY_FEATURES.nudges[Math.floor(this.rng() * FRUITY_FEATURES.nudges.length)];
      else if (!heldGo && roll < FRUITY_FEATURES.nudge + FRUITY_FEATURES.hold) { m.holdsOn = true; m.held = FruityRules.bestHold(m.pos).held; }
    }
    const life = this.life(); life.goes++;
    m.dry = x ? 0 : m.dry + 1;
    this.won(line, x, false);
    SaveGame.saveNow();
    return { from, pos: m.pos.slice(), held, heldGo, line, x, win: x * price, price, nudges: m.nudges, holds: m.holdsOn, dry: m.dry };
  },
  // a nudge moves one reel down a stop; a win ends the nudges
  nudge(r) {
    const m = this.machine(); if (!m.nudges || !(r >= 0 && r < 3)) return null;
    m.nudges--; m.pos = FruityRules.nudged(m.pos, r);
    const line = FruityRules.line(m.pos), x = FruityRules.pay(line);
    if (x) { m.nudges = 0; this.won(line, x, true); }
    SaveGame.saveNow();
    return { r, pos: m.pos.slice(), line, x, win: x * m.price, price: m.price, left: m.nudges };
  },
  skipNudges() { this.machine().nudges = 0; },
  won(line, x, nudged) {
    if (!x) return;
    const m = this.m, life = this.life();
    S.fruityOwed = (S.fruityOwed || 0) + x * m.price; m.gambles = 0;
    life.wins++; life.best = Math.max(life.best, x); if (nudged) life.nudged++; if (line.every(c => c === '7')) life.sevens++;
  },
  // the win meter: collect it, or gamble it on a flashing double-or-nothing (a few times in a row at most)
  owed: () => S.fruityOwed || 0,
  canGamble() { return this.owed() > 0 && this.machine().gambles < FRUITY_FEATURES.gambles; },
  gamble() {
    if (!this.canGamble()) return null;
    const m = this.machine(), stake = this.owed(), won = this.rng() < .5;
    m.gambles++; S.fruityOwed = won ? stake * 2 : 0;
    if (!won) m.gambles = 0;
    SaveGame.saveNow();
    return { won, stake, owed: S.fruityOwed, streak: won ? m.gambles : 0 };
  },
  collect() {
    const owed = this.owed(); if (this.m) this.m.gambles = 0;
    if (owed) { S.coins += owed; S.fruityOwed = 0; SaveGame.saveNow(); }
    return owed;
  },
  settle() { return this.collect(); },
};
