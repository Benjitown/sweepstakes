// The save state S, the save game, and quick questions about S (upgrade levels, Ascension, caps, luck).
import { START, TABLES, MAXB, ASC_CAP } from '../data/economy.js';

/* =====================================================================================
   Memento · https://refactoring.guru/design-patterns/memento
   ===================================================================================== */
const freshLife = () => ({ busts: 0, bestPeak: START, casinos: 0, donBest: 0, time: 0, boards: 0, bestAsc: 0, lvl: 1, xp: 0, tut: false, gems: 0, jackpots: 0,
  ach: {}, daily: null, seen: '', ducks: 0, house: {} });
export function freshRun(life, prefs = {}) {
  return { v: 3, coins: START, unlocked: ['penny'], sel: 'penny', stakes: {}, upg: {}, inv: { shield: 0, probe: 0 },
    tog: { coward: true, yolo: true, restake: true, goggles: true }, streak: 0, owned: false, asc: 0,
    addons: [], rack: [], rackAt: 0, rerolls: 0, spinAt: -1e9, goldNext: 0, wheel: 0, duckOwed: 0, scratchOwed: 0, bingoOwed: 0,
    muted: !!prefs.muted, crt: prefs.crt !== false, quips: prefs.quips !== false, odd: prefs.odd !== false, vibe: prefs.vibe !== false, rude: prefs.rude !== false, quiz: prefs.quiz !== false, nanvoice: prefs.nanvoice !== false,
    vol: prefs.vol ?? 1, noiseVol: prefs.noiseVol ?? 1,
    run: { start: Date.now(), time: 0, boards: 0, wins: 0, losses: 0, biggest: 0, peak: START, don: 0, hist: [[0, START]] },
    life: life || freshLife(), boards: [] };
}
export const SaveGame = {
  KEY: 'sweepstakes.save.v3', timer: 0,
  boards: () => [], // mementos of the live boards; game.js plugs this in, so saving never needs to import Game
  load() { try { const raw = localStorage.getItem(this.KEY); const s = raw && JSON.parse(raw); if (s && s.v === 3) return s; } catch (e) {} return null; },
  save() { clearTimeout(this.timer); this.timer = setTimeout(() => this.saveNow(), 250); },
  saveNow() {
    clearTimeout(this.timer);
    S.boards = this.boards();
    try { localStorage.setItem(this.KEY, JSON.stringify(S)); } catch (e) {}
  },
};
export let S = SaveGame.load() || freshRun();
S.life = Object.assign(freshLife(), S.life);
// the only way to swap in a whole new state (a bust starts a fresh run)
export function setState(next) { S = next; }

export const lvl = id => S.upg[id] || 0;
export const has = id => lvl(id) > 0;
export const on = id => has(id) && S.tog[id];
export const pref = k => S[k] !== false;
// a 0–1 level setting (vol, noiseVol); missing in older saves means full volume
export const level = k => typeof S[k] === 'number' ? Math.max(0, Math.min(1, S[k])) : 1;
export const hasA = id => S.addons.some(a => a.id === id);
export const boardCount = () => Math.min(MAXB, 1 + lvl('boards'));
export const asc = () => S.asc || 0;
const capMul = () => ASC_CAP ** asc();
export const ascMines = t => Math.min(t.w * t.h - 9, Math.round(t.m * (1 + .1 * asc())));
export const ascLim = t => t.lim * (1 + .5 * asc());
export const tableCap = t => Math.floor(t.cap * capMul());
export const effCap = t => Math.floor(tableCap(t) * (hasA('stacks') ? 1.5 : 1));
const topTable = () => { let t = TABLES[0]; for (const x of TABLES) if (S.unlocked.includes(x.id)) t = x; return t; };
export const baseCap = () => tableCap(topTable());
export const luck = () => (1 + .08 * lvl('charm') + (hasA('carrot') ? .12 : 0)) * (1 - .05 * asc());
export const slotsMax = () => 3 + lvl('pockets');
export const streakBonus = () => Math.min(S.streak, hasA('hot') ? 25 : 10) * .1;
