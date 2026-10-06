// Double or Nothing: the offer, the are-you-sure, the flip, then win or lose.
import { $, ico, fmt, pct } from '../core/util.js';
import { START, LADDER } from '../data/economy.js';
import { bus } from '../core/bus.js';
import { SaveGame, S, luck } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Game } from './game.js';
import { UI } from '../ui/ui.js';

/* =====================================================================================
   State · https://refactoring.guru/design-patterns/state
   Double or Nothing moves Offer → Confirm → Resolve → Won/Lost.
   ===================================================================================== */
const donChance = step => Math.min(.95, (1 / LADDER[step]) * luck());
const SURE = ['Are you sure?', 'Are you SURE sure?', 'Mate. Are you actually sure?', 'This is where sensible people stop.', 'Nan is crying. Are you sure?'];
class DonState { constructor(ladder, step) { this.ladder = ladder; this.step = step; } enter() {} }
class OfferState extends DonState {
  enter() {
    const m = LADDER[this.step], stake = S.coins;
    bus.emit('don:offer', { step: this.step });
    UI.modal(`${ico('dice', 'bigicon')}<h3>${this.step ? `Let it ride: ×${m}?` : 'Double or nothing'}</h3>
      <div class="odds"><div><small>You stake</small><b class="num">${fmt(stake)}</b></div><div><small>You could have</small><b class="num">${fmt(stake * m)}</b></div><div><small>Chance</small><b class="num">${pct(donChance(this.step))}</b></div></div>
      <p class="warn">Lose and the whole run resets. Coins, tables, cards, bots, Ascension. Everything.</p>
      <div class="row"><button class="btn red big" type="button" data-a="go">I’m in</button><button class="btn ghost" type="button" data-a="no">${this.step ? `Walk away with ${fmt(stake)}` : 'Not today'}</button></div>`,
      { go: () => this.ladder.go(new ConfirmState(this.ladder, this.step)),
        no: () => { this.ladder.end(); if (this.step) { Sound.cash(); UI.toast(`Walked away with ${fmt(S.coins)}. Smart. Boring, but smart.`); } } }, this.step > 0);
  }
}
class ConfirmState extends DonState {
  enter() {
    UI.modal(`${ico('skull', 'bigicon')}<h3 class="red">${SURE[this.step]}</h3>
      <p>${fmt(S.coins)} coins on a ${pct(donChance(this.step))} shot. If it goes wrong, you start again from ${fmt(START)}.</p>
      <button class="btn red big hold" type="button" id="holdBtn"><i></i><span>Hold to risk it all</span></button>
      <button class="btn ghost" type="button" data-a="no">Chicken out</button>`,
      { no: () => this.step ? this.ladder.go(new OfferState(this.ladder, this.step)) : this.ladder.end() }, this.step > 0);
    UI.holdButton($('#holdBtn'), 1300, () => this.ladder.go(new ResolveState(this.ladder, this.step)));
  }
}
class ResolveState extends DonState {
  enter() {
    // The result is decided and saved before the animation, so reloading can't change it.
    const m = LADDER[this.step], win = Math.random() < donChance(this.step);
    if (win) {
      S.coins = Math.floor(S.coins * m); S.run.peak = Math.max(S.run.peak, S.coins); S.life.bestPeak = Math.max(S.life.bestPeak, S.coins);
      S.run.don++; S.life.donBest = Math.max(S.life.donBest, this.step + 1); SaveGame.saveNow();
    } else Game.bust('don', true);
    const next = () => this.ladder.go(win ? new WonState(this.ladder, this.step) : new LostState(this.ladder, this.step));
    this.step === 0 ? this.flip(win, next) : this.pick(win, next);
  }
  flip(win, next) {
    Sound.drum(18);
    UI.modal(`<h3>Flipping…</h3><div class="coinstage"><div class="coin3d" id="c3">${ico('coin')}${ico('coinskull', 'back')}</div></div><p>Smiley wins. Skull loses.</p>`, {}, true);
    UI.spinCoin($('#c3'), win, () => setTimeout(next, 350));
  }
  pick(win, next) {
    const n = LADDER[this.step], cols = n <= 5 ? n : n <= 25 ? 5 : 10;
    UI.modal(`<h3>Find the gem: 1 in ${n}</h3><p>Pick a tile.</p><div class="picks" id="picks" style="grid-template-columns:repeat(${cols},1fr);max-width:${cols * 64}px"></div>`, {}, true);
    const box = $('#picks');
    for (let k = 0; k < n; k++) { const b = document.createElement('button'); b.type = 'button'; b.className = 'pick'; b.setAttribute('aria-label', `Tile ${k + 1}`); box.appendChild(b); }
    box.addEventListener('click', e => {
      const p = e.target.closest('.pick'); if (!p || box.dataset.done) return; box.dataset.done = 1;
      const tiles = [...box.children], idx = tiles.indexOf(p);
      tiles.forEach(t => t.disabled = true); Sound.drum(10);
      let gem = idx; if (!win) { do { gem = Math.floor(Math.random() * n); } while (gem === idx); }
      setTimeout(() => {
        p.classList.add(win ? 'win' : 'lose'); p.innerHTML = ico(win ? 'gem' : 'bomb');
        setTimeout(() => {
          tiles.forEach((t, k) => { if (k === idx) return; t.classList.add('rev'); t.innerHTML = ico(k === gem ? 'gem' : 'bomb'); if (k === gem) t.classList.add('win'); });
          setTimeout(next, 600);
        }, 500);
      }, 1100);
    });
  }
}
class WonState extends DonState {
  enter() {
    const m = LADDER[this.step], top = this.step >= LADDER.length - 1;
    Game.setCoins(S.coins, true); bus.emit('don:win', { step: this.step });
    setTimeout(() => UI.modal(`${ico('crown', 'bigicon')}<h3>×${m}! You now have ${fmt(S.coins)}</h3>
      <p>${top ? 'You climbed the whole ladder. Absolute legend. Nobody does that.' : `Next rung pays ×${LADDER[this.step + 1]}. Or you could just keep it.`}</p>
      <div class="row">${top ? '' : `<button class="btn red big" type="button" data-a="ride">Let it ride ×${LADDER[this.step + 1]}</button>`}<button class="btn green" type="button" data-a="keep">Keep ${fmt(S.coins)}</button></div>`,
      { ride: () => this.ladder.go(new OfferState(this.ladder, this.step + 1)), keep: () => { this.ladder.end(); Sound.cash(); } }, true), 700);
  }
}
class LostState extends DonState { enter() { Sound.boom(); setTimeout(() => UI.showBust('don'), 900); } }
export const DonLadder = {
  state: null,
  start() {
    if (Game.slots.some(Boolean)) return UI.toast('Finish or cash out your boards first.');
    if (S.coins < 20) return UI.toast('You need at least 20 coins.');
    UI.moodLock = 'danger'; this.go(new OfferState(this, 0));
  },
  go(state) { this.state = state; state.enter(); },
  end() { this.state = null; UI.closeModal(); },
};
