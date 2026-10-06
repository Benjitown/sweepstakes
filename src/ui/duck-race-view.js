// The duck race, out back of the Flip Booth: five lanes, an odds card on the water, pick a duck and back it.
import { $, $$, ico, fmt, fmtX, esc, pct, reduced } from '../core/util.js';
import { TABLES } from '../data/economy.js';
import { bus } from '../core/bus.js';
import { S, has } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { WeirdNoises } from '../audio/noises.js';
import { Game } from '../game/game.js';
import { DuckRace } from '../game/duck-race.js';
import { UI } from './ui.js';

const PLACES = ['1st', '2nd', '3rd', '4th', '5th'];
// The result is already decided, so the race is choreographed backwards from it: the winner crosses first, and each gap
// after is random (now and then a photo finish). On the way, every duck surges and flags at its own rhythm, so the lead
// changes hands, but its speed never drops below zero and it reaches the line exactly at its finish time.
function plan(order) {
  const T = [], first = 5.2 + Math.random() * .9; let at = first;
  order.forEach((d, k) => { if (k) at += Math.random() < .25 ? .03 + Math.random() * .06 : .12 + Math.random() * .55; T[d] = at; });
  const swim = order.map(() => {
    const a = .3 + Math.random() * .2, b = .15 + Math.random() * .12, f = .12 + Math.random() * .16, g = .3 + Math.random() * .25, p = Math.random(), q = Math.random();
    const tau = Math.PI * 2;
    // distance swum by time t: the integral of a speed of 1 + a·sin(…) + b·sin(…), which never drops to 0
    return t => t + a / (tau * f) * (Math.cos(tau * p) - Math.cos(tau * (f * t + p))) + b / (tau * g) * (Math.cos(tau * q) - Math.cos(tau * (g * t + q)));
  });
  return { T, x: (i, t) => Math.min(1, swim[i](t) / swim[i](T[i])) };
}

export const DuckRaceView = {
  pick: null, bet: 0, running: false,
  open() {
    if (!has('flip')) return UI.toast('The duck pond is out back of the Flip Booth. Buy the booth first.');
    if (this.running) return;
    if (!DuckRace.card) DuckRace.newCard();
    this.pick = null; this.render();
  },
  render() {
    const card = DuckRace.card;
    UI.modal(`${UI.boothTabs('ducks')}<h3>Duck Race</h3><p>Back a duck. Long shots pay more. The ducks don’t know about any of this.</p>
      <div class="pond">${card.map((d, i) => `<button type="button" class="lane" data-lane="${i}" aria-pressed="false" style="--duck:${d.col}" aria-label="${esc(d.name)}, pays ×${fmtX(d.pay)}">
        <span class="rduck">${ico('duck')}</span><span class="ltag"><b>${esc(d.name)}</b> <span class="num">×${fmtX(d.pay)}</span></span></button>`).join('')}</div>
      <div class="duckres" id="duckRes" aria-live="polite"><span>Tap a lane to back that duck.</span></div>
      <div class="betrow"><label for="duckBet">Bet</label><input id="duckBet" type="number" min="1" inputmode="numeric">
        <button class="btn ghost" type="button" data-q=".1">10%</button><button class="btn ghost" type="button" data-q=".5">Half</button><button class="btn ghost" type="button" data-q="1">All</button></div>
      <div class="row"><button class="btn gold big" type="button" id="duckGo" disabled>Pick a duck</button><button class="btn ghost" type="button" data-a="close">Leave</button></div>`,
      { close: () => UI.closeModal(), 'booth-flip': () => bus.emit('booth', 'flip') });
    const inp = $('#duckBet'); inp.value = Math.max(1, Math.min(S.coins, this.bet || Math.floor(S.coins * .1)));
    $$('.betrow [data-q]', UI.el.box).forEach(b => b.onclick = () => { inp.value = Math.max(1, Math.floor(S.coins * +b.dataset.q)); });
    $$('.lane', UI.el.box).forEach(l => l.onclick = () => this.choose(+l.dataset.lane));
    $('#duckGo').onclick = () => this.go();
  },
  choose(i) {
    if (this.running || !DuckRace.card) return;
    this.pick = i; const d = DuckRace.card[i];
    $$('.lane', UI.el.box).forEach((l, k) => l.setAttribute('aria-pressed', k === i));
    const go = $('#duckGo'); go.disabled = false; go.textContent = `Race! (${d.name})`;
    $('#duckRes').innerHTML = `<span>${esc(d.name)}: about ${pct(d.p)} to win. Pays ×${fmtX(d.pay)} your bet.</span>`;
    Sound.pop(i);
  },
  go() {
    if (this.running || this.pick == null) return;
    const bet = Math.floor(+$('#duckBet').value);
    if (!(bet >= 1) || bet > S.coins) return UI.toast(`Bet between 1 and ${fmt(S.coins)}.`);
    const res = DuckRace.race(this.pick, bet); if (!res) return;
    this.bet = bet; this.running = true; UI.modalLocked = true;
    Game.setCoins(S.coins); // the bet leaves your coins now; any winnings land at the line
    $$('.lane', UI.el.box).forEach(l => { l.disabled = true; l.classList.add('racing'); });
    $$('.booth button, .betrow button, #duckBet, [data-a="close"]', UI.el.box).forEach(b => { b.disabled = true; });
    const go = $('#duckGo'); go.disabled = true; go.textContent = 'They’re off!';
    $('#duckRes').innerHTML = '<span>And they’re off!</span>';
    WeirdNoises.play('whistle'); bus.emit('duck:start', res);
    this.animate(res);
  },
  animate(res) {
    const lanes = $$('.lane', UI.el.box), ducks = lanes.map(l => l.querySelector('.rduck'));
    const L = lanes[0].clientWidth - 64, { T, x } = plan(res.order), end = Math.max(...T), t0 = performance.now();
    if (reduced) { ducks.forEach(el => { el.style.transform = `translateX(${L}px)`; }); setTimeout(() => this.finish(res, lanes, T), 500); return; }
    let quack = .7;
    const frame = now => {
      if (!lanes[0].isConnected) return this.finish(res, null, T); // the window was replaced mid-race: settle up anyway
      const t = (now - t0) / 1000;
      ducks.forEach((el, i) => {
        const swimming = t < T[i], bob = swimming ? Math.sin(t * 9 + i * 1.7) * 2 : 0, tilt = swimming ? Math.sin(t * 11 + i * 2.3) * 7 : 0;
        el.style.transform = `translate(${(L * x(i, t)).toFixed(1)}px,${bob.toFixed(1)}px) rotate(${tilt.toFixed(1)}deg)`;
      });
      if (t >= quack && t < end) { WeirdNoises.play('quack'); quack = t + .45 + Math.random() * .8; }
      if (t < end + .3) requestAnimationFrame(frame); else this.finish(res, lanes, T);
    };
    requestAnimationFrame(frame);
  },
  finish(res, lanes, T) {
    this.running = false;
    DuckRace.settle();
    const winner = res.card[res.order[0]], photo = T[res.order[1]] - T[res.order[0]] < .1, mine = res.card[res.pick];
    if (lanes) {
      UI.modalLocked = false;
      res.order.forEach((d, k) => lanes[d].insertAdjacentHTML('beforeend', `<span class="place p${k + 1}">${PLACES[k]}</span>`));
      const box = $('#duckRes'); box.className = 'duckres' + (res.win ? '' : ' lose');
      box.innerHTML = res.win ? `<b>${esc(winner.name)} wins! +${fmt(res.prize)}</b><span>${photo ? 'By a beak. Photo finish!' : 'Your duck. Your glory.'}</span>`
        : `<b>${esc(winner.name)} wins</b><span>${photo ? 'Photo finish! ' : ''}${esc(mine.name)} came ${PLACES[res.order.indexOf(res.pick)]}.</span>`;
      $$('.booth button, .betrow button, #duckBet, [data-a="close"]', UI.el.box).forEach(b => { b.disabled = false; });
      const go = $('#duckGo'); go.disabled = false; go.textContent = 'Next race';
      go.onclick = () => { DuckRace.newCard(); this.pick = null; this.render(); };
    }
    Game.setCoins(S.coins, res.win, res.win && lanes ? { from: lanes[res.pick].querySelector('.rduck'), amount: res.prize } : null);
    bus.emit('duck', { ...res, photo });
    // skint, with nothing on the tables: give them a moment to take it in, then the bust screen
    if (S.coins < TABLES[0].min && !Game.slots.some(Boolean)) setTimeout(() => { if (!this.running && !UI.modalClosed()) UI.closeModal(); }, 1800);
  },
};
