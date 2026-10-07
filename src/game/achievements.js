// Achievements: each unlocks once, pays out, and survives busting (they live in S.life).
import { ACHIEVEMENTS, ACH_BY, ACH_REWARD } from '../data/achievements.js';
import { bus } from '../core/bus.js';
import { SaveGame, S, baseCap, boardCount, asc } from '../core/state.js';
import { Rank } from './rank.js';
import { Storm } from './storm.js';
import { TRACKS } from '../data/jukebox.js';

export const Achievements = {
  has(id) { return !!(S.life.ach && S.life.ach[id]); },
  count() { return ACHIEVEMENTS.filter(a => this.has(a.id)).length; },
  reward(a) { return Math.round(baseCap() * ACH_REWARD[a.tier]); },

  unlock(id, quiet = false) {
    const a = ACH_BY[id];
    if (!a || this.has(id)) return 0;
    S.life.ach = S.life.ach || {};
    S.life.ach[id] = Date.now();
    const coins = this.reward(a);
    S.coins += coins;
    if (!quiet) bus.emit('achievement', { a, coins });
    Rank.award(10 * a.tier);
    SaveGame.save();
    return coins;
  },

  // Returning players get credit for what they'd already done (one toast, not twenty).
  catchUp() {
    const done = [], L = S.life;
    const check = (id, cond) => { if (cond && !this.has(id)) { this.unlock(id, true); done.push(id); } };
    check('million', S.coins >= 1e6 || L.bestPeak >= 1e6); check('billion', S.coins >= 1e9 || L.bestPeak >= 1e9);
    check('trillion', S.coins >= 1e12 || L.bestPeak >= 1e12);
    check('lvl10', L.lvl >= 10); check('lvl30', L.lvl >= 30);
    check('boards4', boardCount() >= 4); check('boards8', boardCount() >= 8);
    check('asc1', asc() >= 1 || L.bestAsc >= 1); check('asc4', asc() >= 4 || L.bestAsc >= 4);
    check('casino', L.casinos > 0); check('bust', L.busts > 0); check('shiny', L.gems > 0); check('jackpot', L.jackpots > 0);
    check('auto', (S.upg.sweepBot || 0) > 0); check('abyss', S.unlocked.includes('abyss'));
    if (done.length) bus.emit('achievements:caught-up', { ids: done });
    return done;
  },

  // Observer: listens to what the game announces and ticks things off.
  listen() {
    const u = id => this.unlock(id);
    bus.on('board:cashout', ({ b, why, mult }) => {
      u('pocket'); if (mult >= 5) u('x5'); if (mult >= 25) u('x25'); if (mult >= 100) u('x100');
      if (why === 'clear') u('sweep'); if (why === 'limit') u('limit'); if (why === 'coward') u('coward'); if (b.golden) u('golden');
    });
    bus.on('board:gem', ({ b, tier }) => {
      u('shiny'); if (tier.k === 'ruby') u('ruby'); if (tier.k === 'diamond') u('diamond'); if (tier.k === 'jackpot') u('jackpot');
      if (b.gemsTotal >= 2 && b.gemsFound >= b.gemsTotal) u('allgems');
    });
    bus.on('board:risky', ({ p, combo, src }) => { if (src !== 'you') return; if (p >= .5) u('fifty'); if (combo >= 5) u('combo5'); });
    bus.on('board:boom', ({ b }) => { if (b.human) u('boom'); });
    bus.on('board:defused', () => u('saved'));
    bus.on('streak', ({ n }) => { if (n >= 5) u('streak5'); if (n >= 10) u('streak10'); });
    bus.on('don:win', ({ step }) => { u('don'); if (step >= 2) u('don10'); });
    bus.on('flip', ({ win }) => { if (win) u('flip'); });
    bus.on('spin:landed', ({ prize }) => { if (prize.kind === 'jackpot') u('spinjack'); });
    bus.on('bust', () => u('bust'));
    bus.on('plot:picked', ({ whopper }) => { if (whopper) u('whopper'); if (S.life.plot && S.life.plot.picked >= 10) u('veg'); });
    bus.on('paper:answer', ({ right }) => { if (right) u('puzzle'); });
    bus.on('karaoke:done', ({ x }) => { if (x >= 3) u('ovation'); });
    bus.on('board:cashout', ({ b, why, profit }) => { if (b.special === 'clock' && why !== 'clock' && profit > 0 && b.human) u('nick'); });
    bus.on('board:cashout', ({ b, why, profit }) => { if (b.special === 'lockin' && why === 'manual' && profit > 0 && b.human) u('lockin'); });
    bus.on('lotto:drawn', ({ lines }) => { if (lines.some(l => l.hits >= 3)) u('lotto3'); });
    bus.on('music', ({ id, on }) => { if (!on || !id) return; const r = S.life.records = S.life.records || {}; r[id] = 1; if (TRACKS.filter(t => !t.season).every(t => r[t.id])) u('records'); });
    bus.on('upgrade:bought', ({ u: up }) => {
      if (up.id === 'sweepBot') u('auto');
      if (up.id === 'boards') { if (boardCount() >= 4) u('boards4'); if (boardCount() >= 8) u('boards8'); }
    });
    bus.on('table:unlocked', ({ t }) => { if (t.id === 'abyss') u('abyss'); });
    bus.on('ascended', ({ level }) => { u('asc1'); if (level >= 4) u('asc4'); });
    bus.on('coins', () => { if (S.coins >= 1e6) u('million'); if (S.coins >= 1e9) u('billion'); if (S.coins >= 1e12) u('trillion'); });
    bus.on('casino', () => u('casino'));
    bus.on('levelup', ({ lvl }) => { if (lvl >= 10) u('lvl10'); if (lvl >= 30) u('lvl30'); });
    bus.on('daily:done', ({ streak, top }) => { u('daily'); if (streak >= 7) u('daily7'); if (top) u('dailytop'); });
    bus.on('tutorial:done', ({ completed }) => { if (completed) u('nan'); });
    bus.on('tin:open', () => u('tin'));
    bus.on('pumpkin', ({ n }) => { if (n >= 5) u('pumpkin'); });
    bus.on('treat', () => u('treat'));
    bus.on('boot:haggled', () => u('haggle'));
    bus.on('skin:bought', () => u('skin'));
    bus.on('night:done', ({ all }) => { if (all) u('night5'); });
    bus.on('darts:done', ({ result, total }) => { if (result === 'won') u('darts'); if (total === 180) u('ton80'); });
    bus.on('claw:grab', ({ won, prize }) => { if (won) { u('claw'); if (prize.id === 'crown') u('crown'); } });
    bus.on('dare:won', () => { u('dare'); if ((S.life.dares && S.life.dares.won || 0) >= 3) u('dare3'); });
    bus.on('addon:fired', ({ id }) => { if (id === 'dark') u('dark'); });
    bus.on('kev:trade', ({ buy, x }) => { if (!buy && x >= 2) u('moon'); });
    bus.on('icecream', () => u('cone'));
    bus.on('dog', () => u('dog'));
    bus.on('banker', ({ deal }) => { if (deal) u('deal'); });
    bus.on('board:cashout', ({ b, why, amount }) => { if (why !== 'banker' && b.refused && amount > b.refused) u('nodeal'); });
    bus.on('addon:fired', ({ id }) => { if (id === 'stars') u('stars'); });
    bus.on('kev:rug', ({ held }) => { if (held) u('rugged'); });
    bus.on('flag', ({ b, i, on: isOn, src }) => { if (isOn && src === 'you' && b.mine[i] && Storm.recent()) u('storm'); });
    bus.on('duck', ({ win, pay }) => { if (win) { u('duck'); if (pay >= 8) u('longshot'); } });
    bus.on('scratch', ({ win, x }) => { if (win && x >= 20) u('scratch'); });
    bus.on('outside', ({ on: isOn, full }) => { if (!isOn && full) u('grass'); });
    bus.on('bingo', ({ lines }) => { if (lines) u('bingo'); if (lines >= 3) u('house'); });
    bus.on('fruity', ({ x, nudged, line }) => { if (x && nudged) u('nudge'); if (x && line.every(c => c === '7')) u('triple7'); });
    bus.on('fruity:gamble', ({ won, streak }) => { if (won && streak >= 3) u('gamble3'); });
    bus.on('quiz:answer', ({ correct }) => { if (correct && S.life.quiz && S.life.quiz.right >= 10) u('quiz'); });
    bus.on('household', ({ kind, ok, win }) => { if (kind === 'kitten') u('kitten'); if (kind === 'battery' && ok) u('battery'); if (kind === 'raffle' && win) u('raffle'); if (kind === 'gull') u('gull'); });
  },
};
