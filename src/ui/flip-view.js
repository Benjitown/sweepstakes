// The Flip Booth: the coin flip (the duck race is the other tab, in duck-race-view.js).
import { $, $$, ico, fmt, pct } from '../core/util.js';
import { TABLES } from '../data/economy.js';
import { bus } from '../core/bus.js';
import { S, has, luck } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Game } from '../game/game.js';
import { UI } from './ui.js';

export const FlipView = {
  side: 'smile',
  open() {
    if (!has('flip')) return;
    UI.modal(`${UI.boothTabs('flip')}<h3>Flip Booth</h3><p>Pick a side. Win and your bet doubles. Chance ${pct(Math.min(.95, .5 * luck()))}.</p>
      <div class="coinstage"><div class="coin3d" id="fc">${ico('coin')}${ico('coinskull', 'back')}</div></div>
      <div class="sides"><button class="side-btn" type="button" data-side="smile" aria-pressed="${this.side === 'smile'}">${ico('coin')}Smiley</button>
        <button class="side-btn" type="button" data-side="skull" aria-pressed="${this.side === 'skull'}">${ico('coinskull')}Skull</button></div>
      <div class="betrow"><label for="flipBet">Bet</label><input id="flipBet" type="number" min="1" inputmode="numeric">
        <button class="btn ghost" type="button" data-q=".1">10%</button><button class="btn ghost" type="button" data-q=".5">Half</button><button class="btn ghost" type="button" data-q="1">All</button></div>
      <div class="row"><button class="btn blue big" type="button" id="flipGo">Flip it</button><button class="btn ghost" type="button" data-a="close">Leave</button></div>`,
      { close: () => UI.closeModal(), 'booth-ducks': () => bus.emit('booth', 'ducks') });
    const inp = $('#flipBet'); inp.value = Math.max(1, Math.floor(S.coins * .1));
    $$('.side-btn', UI.el.box).forEach(b => b.onclick = () => { this.side = b.dataset.side; $$('.side-btn', UI.el.box).forEach(x => x.setAttribute('aria-pressed', x === b)); });
    $$('.betrow [data-q]', UI.el.box).forEach(b => b.onclick = () => { inp.value = Math.max(1, Math.floor(S.coins * +b.dataset.q)); });
    let busy = false;
    $('#flipGo').onclick = () => {
      if (busy) return; const bet = Math.floor(+inp.value);
      if (!(bet >= 1) || bet > S.coins) return UI.toast(`Bet between 1 and ${fmt(S.coins)}.`);
      busy = true; UI.modalLocked = true; $('#flipGo').disabled = true; $$('.booth button', UI.el.box).forEach(b => { b.disabled = true; });
      const { win, face } = Game.flip(bet, this.side);
      Sound.drum(14);
      UI.spinCoin($('#fc'), face, () => {
        busy = false; UI.modalLocked = false; const g = $('#flipGo'); if (g) g.disabled = false; $$('.booth button', UI.el.box).forEach(b => { b.disabled = false; });
        Game.setCoins(S.coins, win, win ? { from: $('#fc'), amount: bet } : null); bus.emit('flip', { win, bet });
        if (S.coins < TABLES[0].min && !Game.slots.some(Boolean)) UI.closeModal();
        else if (inp.isConnected) inp.value = Math.max(1, Math.min(+inp.value, S.coins));
      });
    };
  },
};
