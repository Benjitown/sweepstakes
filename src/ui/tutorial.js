// The tutorial: Fuse the bomb walks you through your first board.
import { $, $$, esc, reduced } from '../core/util.js';
import { SaveGame, S } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Game } from '../game/game.js';
import { UI } from './ui.js';
import { Tabs } from './tabs.js';

/* =====================================================================================
   State · https://refactoring.guru/design-patterns/state
   The tutorial: each step is a state that knows what to point at and which event moves it on.
   ===================================================================================== */
const firstBoard = sel => { const b = Game.slots.find(Boolean); return b && b.el ? $(sel, b.el) : $('#boards'); };
const STEPS = [
  { text: 'Hi, I’m Fuse. I’m a bomb, but a friendly one. Let’s make you rich. Fake rich.', next: 'Let’s go' },
  { at: () => $('#bank'), text: 'This is your bank. The coins aren’t real. Lose them all and you’re stuffed: back to 1,000.' },
  { at: () => $('#btnSpin'), text: 'Free spin! You get one every 3 minutes of play. Go on, spin it.', wait: 'spin:done' },
  { at: () => $('.stake'), text: 'Pick a stake, then deal. Bigger stake, bigger pot.', wait: 'board:dealt' },
  { at: () => firstBoard('.grid'), text: 'Dig a tile. Your first dig is always safe.', wait: 'dig:you' },
  { at: () => firstBoard('.score'), text: 'Numbers count the mines touching that tile. Safe digs nudge the Mult up. Risky digs, where you can’t be sure, pay the odds. Riskier means bigger.' },
  { at: () => firstBoard('.gemct'), text: 'Every board hides gems that multiply the pot: ×1.2 up to a ×5 jackpot. They’re never in the opening, so go digging.' },
  { at: () => firstBoard('.cash'), text: 'Cash out to bank the pot. Hit a mine and the stake is gone. Your call.', wait: 'board:over' },
  { at: () => $('.side .panel'), text: 'Spend it here: bots that play for you, more boards, and add-on cards that bend the rules.' },
  { at: () => $('#btnDon'), text: 'Double or Nothing bets everything. Win and it climbs to ×100. Lose and your whole run resets. Is it worth the risk?' },
  { text: 'That’s it. Go get rich, or get stuffed. My mum plays this game.', next: 'Let’s play' },
];
export const Coach = {
  active: false, i: 0, raf: 0, target: null, seen: new Set(),
  el: { wrap: $('#coach'), ring: $('#coachRing'), bub: $('#coachBubble') },
  start(replay) {
    if (this.active) return;
    if (replay) Tabs.show('shop');
    this.active = true; this.seen.clear(); this.go(0);
    this.raf = requestAnimationFrame(() => this.track());
  },
  go(i) {
    this.i = i; const st = STEPS[i]; if (!st) return this.finish();
    const last = i === STEPS.length - 1;
    this.el.bub.innerHTML = `<svg viewBox="0 0 64 64" class="fuse" aria-hidden="true"><use href="#i-bomb"/></svg>
      <div class="ctext"><p>${esc(st.text)}</p>
      <div class="crow"><span class="cstep">${i + 1}/${STEPS.length}</span>${last ? '' : '<button class="clink" type="button" data-c="skip">Skip tutorial</button>'}
      <button class="btn ${st.wait ? 'ghost' : 'gold'}" type="button" data-c="next">${st.next || (st.wait ? 'Skip step' : 'Next')}</button></div></div>`;
    $$('[data-c]', this.el.bub).forEach(b => b.onclick = () => b.dataset.c === 'skip' ? this.finish() : this.go(this.i + 1));
    this.target = st.at ? st.at() : null;
    if (this.target) { const r = this.target.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 70) this.target.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); }
    if (st.wait && this.seen.has(st.wait)) setTimeout(() => { if (this.active && this.i === i) this.go(i + 1); }, 900);
    this.el.wrap.hidden = false; this.el.bub.classList.remove('in'); void this.el.bub.offsetWidth; this.el.bub.classList.add('in');
    Sound.coach();
  },
  event(name) {
    if (!this.active) return; this.seen.add(name);
    if (STEPS[this.i] && STEPS[this.i].wait === name) { const i = this.i; setTimeout(() => { if (this.active && this.i === i) this.go(i + 1); }, 700); }
  },
  track() {
    if (!this.active) return;
    const st = STEPS[this.i], show = UI.modalClosed();
    this.el.wrap.hidden = !show;
    if (show) {
      if (st && st.at && (!this.target || !this.target.isConnected)) this.target = st.at();
      const vw = innerWidth, vh = innerHeight, bw = Math.min(380, vw - 32), bub = this.el.bub;
      bub.style.width = bw + 'px';
      const bh = bub.offsetHeight;
      if (this.target && this.target.isConnected) {
        const r = this.target.getBoundingClientRect(), pad = 6;
        Object.assign(this.el.ring.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
        this.el.ring.classList.remove('center');
        let top = r.bottom + 14 + pad;
        if (top + bh > vh - 12) top = r.top - bh - 14 - pad;
        if (top < 12) top = r.top + r.height / 2 > vh / 2 ? 12 : vh - bh - 12;
        const left = Math.min(vw - bw - 16, Math.max(16, r.left + r.width / 2 - bw / 2));
        bub.style.left = left + 'px'; bub.style.top = top + 'px';
      } else {
        Object.assign(this.el.ring.style, { left: vw / 2 + 'px', top: vh / 2 + 'px', width: '0px', height: '0px' });
        this.el.ring.classList.add('center');
        bub.style.left = (vw - bw) / 2 + 'px'; bub.style.top = Math.max(12, (vh - bh) / 2) + 'px';
      }
    }
    this.raf = requestAnimationFrame(() => this.track());
  },
  finish() {
    this.active = false; cancelAnimationFrame(this.raf); this.el.wrap.hidden = true;
    S.life.tut = true; SaveGame.saveNow(); Sound.select(3);
  },
};
