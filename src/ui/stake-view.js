// The stake slider and its quick buttons.
import { $, $$, fmt, fmtLim, nice } from '../core/util.js';
import { TBY } from '../data/economy.js';
import { S, ascLim, effCap } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Game } from '../game/game.js';

export const StakeView = {
  range: $('#stakeRange'), lastShown: '',
  render() {
    const t = TBY[S.sel], [lo, hi] = Game.stakeBounds(t), v = Game.stakeFor(t);
    this.range.disabled = S.coins < t.min || hi <= lo;
    this.range.value = hi > lo ? Math.round(1000 * Math.log(v / lo) / Math.log(hi / lo)) : 0;
    $('#stakeOut').textContent = this.lastShown = fmt(v);
    $('#tinfo').textContent = S.coins < t.min ? `You need ${fmt(t.min)} coins to play ${t.name}.`
      : `${t.name}: stake ${fmt(t.min)} to ${fmt(effCap(t))}. A board pays at most ×${fmtLim(ascLim(t))}. ${t.blurb}`;
  },
  bind() {
    this.range.addEventListener('input', () => {
      const t = TBY[S.sel], [lo, hi] = Game.stakeBounds(t);
      Game.setStake(t, nice(hi > lo ? lo * Math.pow(hi / lo, this.range.value / 1000) : lo));
      const shown = fmt(Game.stakeFor(t));
      if (shown !== this.lastShown) { this.lastShown = shown; Sound.slide(this.range.value / 1000); }
      $('#stakeOut').textContent = shown;
    });
    $$('.quick button').forEach(btn => btn.onclick = () => {
      const t = TBY[S.sel], [lo, hi] = Game.stakeBounds(t), q = btn.dataset.q;
      Game.setStake(t, q === 'min' ? lo : q === 'max' ? hi : nice(hi / 2)); this.render();
    });
    $('#dealAll').onclick = () => Game.dealAll();
  },
};
