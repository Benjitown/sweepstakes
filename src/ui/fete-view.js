// The church fete on screen: the card that says it's on, and Splat the Rat (the drainpipe, the cord, the rat and the
// splat). src/game/fete.js keeps the score.
import { $, fmt, rnd } from '../core/util.js';
import { S } from '../core/state.js';
import { FETE } from '../data/fete.js';
import { FETE_SAYS, FETE_RESULT, TOMBOLA_PRIZES } from '../content/fete.js';
import { Fete, Tombola } from '../game/fete.js';
import { Game } from '../game/game.js';
import { Sound } from '../audio/sound.js';
import { UI } from './ui.js';
import { Haptics } from './haptics.js';
import { HouseholdView } from './household-view.js';

const PIPE_ART = `<svg class="pipeart" viewBox="0 0 120 200" aria-hidden="true">
  <rect x="40" y="0" width="40" height="160" fill="#8d9a9e" stroke="#141b1d" stroke-width="3"/>
  <path d="M40 158 h40 l12 24 h-64 z" fill="#8d9a9e" stroke="#141b1d" stroke-width="3" stroke-linejoin="round"/>
  <rect x="32" y="34" width="56" height="9" rx="2" fill="#56656a" stroke="#141b1d" stroke-width="2"/><rect x="32" y="104" width="56" height="9" rx="2" fill="#56656a" stroke="#141b1d" stroke-width="2"/>
  <path d="M80 8 q22 6 18 46" fill="none" stroke="#c9a46a" stroke-width="3" stroke-linecap="round"/><circle cx="98" cy="56" r="4" fill="#c9a46a" stroke="#141b1d" stroke-width="1.5"/>
</svg>`;
const RAT_ART = `<svg class="ratart" viewBox="0 0 90 44" aria-hidden="true">
  <path d="M16 30 q-14 2 -12 -14" fill="none" stroke="#141b1d" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="42" cy="28" rx="27" ry="13" fill="#8a8f92" stroke="#141b1d" stroke-width="2.5"/>
  <circle cx="68" cy="23" r="9" fill="#8a8f92" stroke="#141b1d" stroke-width="2.5"/><circle cx="63" cy="14" r="4.5" fill="#d9a3a3" stroke="#141b1d" stroke-width="2"/>
  <circle cx="71" cy="21" r="2" fill="#141b1d"/><circle cx="77" cy="26" r="2.2" fill="#d97a8a"/>
</svg>`;

export const FeteView = {
  t: 0, phase: 'idle', // idle, wait (up the pipe), out (splat it!)
  // it's on: a card at the bottom of the screen
  invite() {
    HouseholdView.show({ icon: 'bell', mood: 'good', title: 'The church fete', ms: 15000,
      text: `Bunting up, Nan on the cake stall, and Splat the Rat by the tombola. Three goes for ${fmt(Fete.fee())}.`,
      buttons: [['Splat the Rat', 'gold', () => this.open()], ['Tombola', 'blue', () => this.tombola()], ['Not today', 'ghost']] });
  },
  open() {
    clearTimeout(this.t); this.phase = 'idle';
    UI.modal(`<div class="fete"><h3>Splat the Rat</h3>
      <p class="hint">Pull the cord, and when the rat shoots out of the bottom of the drainpipe, splat it. One splat gets your money back, two pays ×${FETE.PAYS[2]}, all three ×${FETE.PAYS[3]}.</p>
      <div class="pipe" id="splatPipe">${PIPE_ART}<div class="rat" id="splatRat">${RAT_ART}</div></div>
      <p class="splatmsg" id="splatMsg" aria-live="polite">${S.splat ? 'You’ve still got goes left.' : 'Three goes, then.'}</p>
      <p class="splatgoes" id="splatGoes"></p>
      <div class="row"><button class="btn gold big" type="button" id="splatGo"></button><button class="btn red big" type="button" id="splatHit">Splat!</button></div>
      <button class="btn ghost" type="button" data-a="close">Leave</button></div>`, { close: () => this.leave() });
    $('#splatGo').onclick = () => this.pull();
    const hit = $('#splatHit');
    hit.onpointerdown = e => { e.preventDefault(); this.whack(); };
    hit.onclick = e => { if (e.detail === 0) this.whack(); }; // (a key press: a pointer's already been handled)
    $('#splatPipe').onpointerdown = () => this.whack();
    this.render();
  },
  live() { return !!$('#splatPipe', UI.el.box); },
  say(t) { const el = $('#splatMsg'); if (el) el.textContent = t; },
  render() {
    if (!this.live()) return;
    const st = Fete.st(), go = $('#splatGo');
    go.textContent = st ? 'Pull the cord' : `Three goes (${fmt(Fete.fee())})`;
    go.disabled = this.phase !== 'idle' || (!st && S.coins < Fete.fee());
    $('#splatHit').disabled = this.phase === 'idle';
    $('#splatGoes').textContent = st ? `Go ${FETE.GOES - st.goes + 1} of ${FETE.GOES} · ${st.hits} splatted` : '';
  },
  // pull the cord (paying for three goes first, if it's a fresh start)
  pull() {
    if (this.phase !== 'idle' || !this.live()) return;
    if (!Fete.st()) { if (!Fete.pay()) return this.say('You can’t afford three goes.'); Game.setCoins(S.coins); }
    this.phase = 'wait'; this.say(rnd(FETE_SAYS.pull)); Sound.tick();
    $('#splatRat').className = 'rat';
    this.t = setTimeout(() => this.drop(), Fete.drop());
    this.render(); $('#splatHit').focus({ preventScroll: true }); // (so Space or Enter splats it)
  },
  // it's out!
  drop() {
    if (!this.live() || this.phase !== 'wait') return;
    this.phase = 'out'; $('#splatRat').classList.add('out'); Sound.pop(); this.say('NOW!');
    this.t = setTimeout(() => { if (this.phase === 'out') this.done('missed'); }, FETE.WINDOW);
  },
  whack() {
    if (this.phase === 'wait' || this.phase === 'out') { clearTimeout(this.t); this.done(this.phase === 'out' ? 'hit' : 'early'); }
  },
  done(how) {
    this.phase = 'idle';
    const rat = $('#splatRat');
    if (rat) { rat.classList.remove('out'); rat.classList.add(how === 'hit' ? 'splat' : 'gone'); }
    if (how === 'hit') { Sound.drum(); Haptics.buzz([30, 20, 50]); } else Sound.unflag();
    this.say(rnd(FETE_SAYS[how]));
    const r = Fete.go(how);
    if (r && r.done) { this.say(`${rnd(FETE_SAYS[how])} ${FETE_RESULT[Math.min(r.hits, FETE_RESULT.length - 1)]}${r.pay ? ` +${fmt(r.pay)}` : ''}`); Game.setCoins(S.coins, r.pay > 0); }
    this.render(); const go = $('#splatGo'); if (go && !go.disabled) go.focus({ preventScroll: true });
  },
  // the tombola: a ticket out of the drum
  tombola() {
    UI.modal(`<div class="fete tombola"><h3>The tombola</h3>
      <p class="hint">Every ticket ending in 0 or 5 wins a prize off the table. It’s all for the church roof.</p>
      <div class="drum" id="tomDrum" aria-hidden="true"><i></i><i></i><i></i></div>
      <p class="ticket num" id="tomTicket">?</p>
      <p class="splatmsg" id="tomMsg" aria-live="polite">Pick a ticket, any ticket.</p>
      <div class="row"><button class="btn gold big" type="button" id="tomBuy">A ticket (${fmt(Tombola.price())})</button><button class="btn ghost" type="button" data-a="close">Leave</button></div></div>`,
      { close: () => UI.closeModal() });
    $('#tomBuy').onclick = () => this.draw();
  },
  draw() {
    const r = Tombola.buy(); if (!r) return this.sayT('You can’t afford a ticket. The vicar looks disappointed.');
    Game.setCoins(S.coins, r.pay > 0);
    const t = $('#tomTicket'); if (t) { t.textContent = String(r.n).padStart(3, '0'); t.classList.remove('win', 'pop'); void t.offsetWidth; t.classList.add('pop'); t.classList.toggle('win', !!r.prize); }
    const d = $('#tomDrum'); if (d) { d.classList.remove('spin'); void d.offsetWidth; d.classList.add('spin'); }
    this.sayT(r.prize ? `Ends in ${r.n % 10}! ${TOMBOLA_PRIZES[r.prize]} Worth ${fmt(r.pay)}.` : `Ends in ${r.n % 10}. Not a winner.`);
    if (r.prize) Sound.coin(); else Sound.unflag();
  },
  sayT(t) { const el = $('#tomMsg'); if (el) el.textContent = t; },
  // walking off pays for your splats so far
  leave() {
    clearTimeout(this.t); this.phase = 'idle';
    const r = Fete.st() ? Fete.settle() : null;
    UI.closeModal();
    if (r) { Game.setCoins(S.coins, r.pay > 0); UI.toast(r.pay ? `${r.hits} splat${r.hits === 1 ? '' : 's'}: +${fmt(r.pay)}. Your other goes go to the church roof.` : 'Your other goes go to the church roof.'); }
  },
};
