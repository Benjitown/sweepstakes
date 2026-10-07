// Conkers with Priya (the numbers are in src/data/conkers.js): in conker season she challenges you in the group chat.
// Your stake goes in when you say yes. Then you take turns: your strike is however good your timing on the swing meter
// was (src/ui/conkers-view.js), hers is luck and vinegar. The first conker to crack loses; win and it pays double.
import { nice } from '../core/util.js';
import { bus } from '../core/bus.js';
import { S, SaveGame, baseCap } from '../core/state.js';
import { CONKERS } from '../data/conkers.js';
import { Game } from './game.js';

const conkerLife = () => (S.life.conkers = S.life.conkers || { played: 0, won: 0, nah: 0 });

export const Conkers = {
  timer: 0, offer: null, match: null, rng: Math.random,
  force: null, // true or false: pretend it is or isn't conker season (the tests)
  season() { return this.force ?? CONKERS.MONTHS.includes(new Date().getMonth() + 1); },
  schedule(first) {
    clearTimeout(this.timer);
    const [lo, hi] = CONKERS.EVERY;
    this.timer = setTimeout(() => { bus.emit('conkers:due'); this.schedule(); }, (first ?? lo + this.rng() * (hi - lo)) * 1000);
  },
  stake: () => nice(Math.max(CONKERS.MIN, Math.min(baseCap(), S.coins * CONKERS.SHARE))),
  canOffer() { return this.season() && !this.offer && !this.match && S.coins >= CONKERS.MIN * 10; },
  make() { this.offer = { stake: this.stake() }; bus.emit('conkers:offer', this.offer); return this.offer; },
  decline(why = 'nah') { const o = this.offer; if (!o) return false; this.offer = null; if (why === 'nah') { conkerLife().nah++; SaveGame.save(); } bus.emit('conkers:declined', { ...o, why }); return true; },
  // you're on: the stake goes in
  accept() {
    const o = this.offer; if (!o || this.match || S.coins < o.stake) return false;
    this.offer = null; Game.setCoins(S.coins - o.stake);
    this.match = { stake: o.stake, mine: CONKERS.MINE, hers: CONKERS.HERS, turn: 'you' };
    conkerLife().played++; SaveGame.saveNow();
    bus.emit('conkers:on', this.match); return this.match;
  },
  // your strike, with the swing meter at pos (0 to 1; the middle's best)
  strike(pos) {
    const m = this.match; if (!m || m.turn !== 'you') return null;
    const off = Math.abs(pos - .5), knocks = off <= CONKERS.SMASH ? 2 : off <= CONKERS.HIT ? 1 : 0;
    const strings = !knocks && this.rng() < CONKERS.STRINGS;
    m.hers = Math.max(0, m.hers - knocks);
    const r = { who: 'you', knocks, strings };
    if (!m.hers) return this.finish('won', r);
    if (!strings) m.turn = 'her';
    return r;
  },
  // her strike
  herStrike() {
    const m = this.match; if (!m || m.turn !== 'her') return null;
    let x = this.rng(), knocks = CONKERS.HER.length - 1;
    for (let k = 0; k < CONKERS.HER.length; k++) { if (x < CONKERS.HER[k]) { knocks = k; break; } x -= CONKERS.HER[k]; }
    m.mine = Math.max(0, m.mine - knocks);
    const r = { who: 'her', knocks };
    if (!m.mine) return this.finish('lost', r);
    m.turn = 'you'; return r;
  },
  finish(result, r) {
    const m = this.match; m.result = result; m.pay = result === 'won' ? m.stake * 2 : 0;
    if (m.pay) Game.setCoins(S.coins + m.pay, true);
    if (result === 'won') conkerLife().won++;
    this.match = null; SaveGame.saveNow(); bus.emit('conkers:done', m);
    return { ...r, done: true, result, pay: m.pay, stake: m.stake };
  },
  // walking off mid-match: hers wins (the stake's gone)
  forfeit() { return this.match ? this.finish('lost', { who: 'you', knocks: 0, forfeit: true }) : null; },
};
