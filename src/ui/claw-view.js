// The claw machine (the booth's sixth tab): a glass case with a pile of prizes, the claw swinging along the top, and
// one button: Grab. src/game/claw.js decides what happens the moment it drops; this plays it out: down, grip, up and
// over to the chute (unless it drops it on the way, which it does, sometimes).
import { $, $$, fmt, esc, rnd, ico } from '../core/util.js';
import { CLAW, CLAW_PRIZES, CLAW_BY } from '../data/claw.js';
import { S, has } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Game } from '../game/game.js';
import { Claw } from '../game/claw.js';
import { Chat } from './chat.js';
import { UI } from './ui.js';

const CLAW_HEAD = `<svg class="head" viewBox="0 0 60 44" aria-hidden="true"><rect x="22" y="0" width="16" height="12" rx="3" fill="#c9d6da" stroke="#141b1d" stroke-width="3"/>
  <path class="prong l" d="M24 10 Q8 18 12 38 l6 -2 Q16 22 28 14 z" fill="#93b3bd" stroke="#141b1d" stroke-width="3" stroke-linejoin="round"/>
  <path class="prong r" d="M36 10 Q52 18 48 38 l-6 -2 Q44 22 32 14 z" fill="#93b3bd" stroke="#141b1d" stroke-width="3" stroke-linejoin="round"/></svg>`;
const CLAW_BLURB = ['Line it up with the middle of a prize, then grab.', 'The claw’s grip is… let’s say “gentle”.',
  'Everyone’s won something off one of these. Once. Allegedly.', 'The crown’s slippery. Very slippery.'];

export const ClawView = {
  raf: 0, x: .5, dir: 1, busy: false, run: 0,
  SPEED: 1, // stretches every step of a grab (the tests speed it up)
  open() {
    if (!has('flip')) return UI.toast('The claw machine is in the corner of the Flip Booth. Buy the booth first.');
    if (this.busy) return;
    Claw.fill();
    UI.modal(`${UI.boothTabs('claw')}<div class="clawm">
      <h3>The Claw</h3>
      <div class="case" id="clawCase" aria-hidden="true"><i class="rail"></i>
        <div class="arm" id="clawArm"><i class="wire"></i>${CLAW_HEAD}</div>
        <div class="pile" id="clawPile"></div><div class="chute"><b>PRIZES</b></div></div>
      <p class="clawmsg" id="clawMsg" aria-live="polite">${esc(rnd(CLAW_BLURB))}</p>
      <div class="row"><button class="btn gold big" type="button" id="clawGo"></button><button class="btn ghost" type="button" data-a="close">Leave</button></div>
      <ul class="clawpays" aria-label="What the prizes pay">${CLAW_PRIZES.map(p => `<li title="${esc(p.name)}">${ico(p.icon)}<b>×${p.x}</b>${p.fx ? `<small>${p.fx === 'shield' ? '+ a shield' : '+ a golden board'}</small>` : ''}</li>`).join('')}</ul></div>`,
      { close: () => this.leave() });
    $('#clawGo').onclick = () => this.grab();
    this.pile(); this.sync(); this.place(this.x); this.sweep();
  },
  live() { return !!$('#clawCase', UI.el.box); },
  msg(t) { const el = $('#clawMsg'); if (el) el.textContent = t; },
  sync() { const b = $('#clawGo'); if (!b) return; const p = Claw.price(); b.textContent = `Grab (${fmt(p)})`; b.disabled = this.busy || S.coins < p; },
  pile() {
    const el = $('#clawPile'); if (!el) return;
    el.innerHTML = (Claw.pile || []).map(q => { const P = CLAW_BY[q.id];
      return `<i class="prize p-${q.id}" data-x="${q.x}" style="left:${(q.x * 100).toFixed(2)}%;--w:${(P.r * 200).toFixed(1)}%">${ico(P.icon)}</i>`; }).join('');
  },
  place(x) { const a = $('#clawArm'); if (a) a.style.left = (x * 100).toFixed(2) + '%'; },
  // the claw swings back and forth along the top until you grab
  sweep() {
    cancelAnimationFrame(this.raf);
    let last = performance.now();
    const step = now => {
      if (!this.live() || this.busy) return;
      const dt = Math.min(50, now - last); last = now;
      this.x += this.dir * dt / CLAW.SWEEP_MS * .8;
      if (this.x > .9) { this.x = .9; this.dir = -1; } else if (this.x < .1) { this.x = .1; this.dir = 1; }
      this.place(this.x);
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  },
  grab() {
    if (this.busy || !this.live()) return;
    const r = Claw.grab(this.x);
    if (!r) return UI.toast('You can’t afford a go.');
    this.busy = true; cancelAnimationFrame(this.raf); UI.modalLocked = true; this.sync();
    $$('.booth button', UI.el.box).forEach(b => { b.disabled = true; });
    Game.setCoins(S.coins); Sound.buy();
    const run = ++this.run, arm = $('#clawArm'), P = r.prize && CLAW_BY[r.prize.id];
    const el = r.prize && [...$$('#clawPile .prize')].find(e => +e.dataset.x === r.prize.x);
    const at = (ms, fn) => setTimeout(() => { if (this.run === run && this.live()) fn(); }, ms * this.SPEED);
    this.msg('Down it goes…');
    arm.classList.add('down');                                                     // down
    at(750, () => { arm.classList.add('shut'); Sound.claw(); });                   // grip
    at(1000, () => {                                                               // and up
      if (r.held && el) { arm.appendChild(el); el.classList.add('held'); el.style.left = ''; }
      else if (el) el.classList.add('wiggle');
      arm.classList.remove('down');
    });
    if (!r.held) return at(1800, () => { arm.classList.remove('shut'); this.done(r); });
    at(1750, () => { arm.classList.add('travel'); this.place(.075); });           // over to the chute
    if (r.dropped) {
      at(2050, () => {                                                             // …and it drops it
        const box = $('#clawCase').getBoundingClientRect(), a = arm.getBoundingClientRect(), fx = Math.min(.88, Math.max(.16, (a.left + a.width / 2 - box.left) / box.width));
        const q = (Claw.pile || []).find(o => o.x === r.prize.x); if (q) q.x = fx;
        el.classList.remove('held'); el.classList.add('fall'); el.dataset.x = fx; el.style.left = (fx * 100).toFixed(2) + '%'; $('#clawPile').appendChild(el);
        Sound.unflag();
      });
      return at(2600, () => { arm.classList.remove('shut', 'travel'); this.done(r); });
    }
    at(2550, () => { arm.classList.remove('shut'); el.classList.add('chuted'); });  // into the chute
    at(3000, () => { arm.classList.remove('travel'); el.remove(); this.done(r); });
  },
  // after a go: pay out, say how it went, top the machine up and set the claw swinging again
  done(r) {
    const P = r.prize && CLAW_BY[r.prize.id];
    if (r.won) {
      const owed = Claw.collect();
      Game.setCoins(S.coins, true, { from: $('#clawCase .chute'), amount: owed }); Sound.arcade();
      this.msg(`${P.name[0].toUpperCase() + P.name.slice(1)}! +${fmt(r.pay)}${r.fx === 'shield' ? ', and a shield' : r.fx === 'golden' ? ', and your next board’s golden' : ''}.`);
      setTimeout(() => Chat.say('claw_win', {}, .7), 700);
    } else if (r.dropped) { this.msg('It’s got it, it’s got it… and it drops it.'); setTimeout(() => Chat.say('claw_drop', {}, .6), 600); }
    else if (r.prize) this.msg('Got it… no. It slips straight out of the claw.');
    else { this.msg('Nothing under it. The claw closes on thin air.'); setTimeout(() => Chat.say('claw_miss', {}, .4), 600); }
    Claw.fill(); this.pile();
    this.busy = false; UI.modalLocked = false;
    $$('.booth button', UI.el.box).forEach(b => { b.disabled = false; });
    this.sync(); this.sweep();
  },
  // switching tabs or leaving mid-grab: the result's already decided, so pay what's owed
  away() {
    cancelAnimationFrame(this.raf); this.run++;
    if (this.busy) { this.busy = false; UI.modalLocked = false; }
    if (Claw.collect()) Game.setCoins(S.coins, true);
  },
  leave() { this.away(); UI.closeModal(); },
};
