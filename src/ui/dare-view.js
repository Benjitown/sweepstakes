// Dares on screen: the friend's dare in the group chat (You're on / Nah), the chip in the header that counts down while
// one's on, and what everyone says after. src/game/dares.js keeps score.
import { $, $$, rnd, esc, fmt, ico, clock } from '../core/util.js';
import { FRIENDS, LINES } from '../content/chat-lines.js';
import { DARE_ASK, DARE_ON, DARE_WON, DARE_LOST, DARE_NAH, DARE_GONE } from '../content/dares.js';
import { DARE } from '../data/dares.js';
import { S } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Dares } from '../game/dares.js';
import { Chat } from './chat.js';
import { UI } from './ui.js';
import { FX } from './fx.js';

// fills in {task} {stake} {pay} {mins}
const dareText = (t, d) => t.replace(/\{(\w+)\}/g, (_, k) => k === 'stake' || k === 'pay' ? fmt(d[k]) : k === 'mins' ? String(+(d.secs / 60).toFixed(1)) : d[k] ?? '');

export const DareView = {
  el: null, expire: 0,
  offer(o) {
    const f = FRIENDS[o.who], chat = $('#chat');
    chat.insertAdjacentHTML('beforeend', `<div class="msg invite dare">${Chat.avatar(f)}<div class="bubble" style="--fc:${f.col}"><b>${esc(f.name)}</b>
      <span>${esc(dareText(rnd(DARE_ASK[o.who]), o))}</span>
      <div class="qopts"><button type="button" class="qopt" data-a="on">${ico('dare', 'ic')} You’re on (${fmt(o.stake)})</button><button type="button" class="qopt" data-a="nah">Nah</button></div>
      <small class="qprize">Do it in time and get ${fmt(o.stake * 2)} back</small></div></div>`);
    while (chat.children.length > 40) chat.firstChild.remove();
    chat.scrollTop = chat.scrollHeight; Sound.msg();
    const el = this.el = chat.lastElementChild;
    $('[data-a="on"]', el).onclick = () => {
      if (Dares.offer !== o) return;
      if (Dares.accept()) this.settle(el, 'on'); else UI.toast('You can’t cover that right now.');
    };
    $('[data-a="nah"]', el).onclick = () => { if (Dares.offer === o && Dares.decline('nah')) this.settle(el, 'nah'); };
    clearTimeout(this.expire);
    this.expire = setTimeout(() => { if (Dares.offer === o && Dares.decline('slow')) this.settle(el, 'slow'); }, DARE.ANSWER * 1000);
    // on phones the chat sits below the boards, so say so when it's off screen
    const r = chat.getBoundingClientRect();
    if (r.top > innerHeight || r.bottom < 0) UI.toast(`${f.name} has dared you something in the group chat.`);
  },
  settle(el, how) {
    clearTimeout(this.expire);
    $$('.qopt', el).forEach(b => { b.disabled = true; if (b.dataset.a === how) b.classList.add('right'); });
    if (this.el === el) this.el = null;
  },
  // the header chip: whose dare, and the time left
  chip() {
    const c = $('#dareChip'); if (!c) return;
    const d = S.dare; c.hidden = !d; if (!d) return;
    $('.long', c).textContent = `${FRIENDS[d.who].name}’s dare · ${clock(d.left)}`;
    $('.short', c).textContent = `Dare · ${clock(d.left)}`;
    c.classList.toggle('hurry', d.left <= 30);
    c.title = `Dare: ${d.task}. ${clock(d.left)} left, ${fmt(d.stake * 2)} if you do it`;
    c.setAttribute('aria-label', c.title);
  },
  bind() { const c = $('#dareChip'); if (c) c.onclick = () => { const d = S.dare; if (d) UI.toast(`${FRIENDS[d.who].name}’s dare: ${d.task}. ${clock(d.left)} left.`); }; this.chip(); },
  on(d) {
    this.chip();
    UI.toast(`Dare on: ${d.task}. ${clock(d.left)} on the clock.`);
    setTimeout(() => Chat.post(d.who, dareText(rnd(DARE_ON[d.who]), d)), 700);
    if (Math.random() < .5) setTimeout(() => Chat.post(...rnd(LINES.dare_nan_on)), 2400);
  },
  won(d) {
    this.chip();
    Sound.cash(); FX.confetti(80);
    UI.toast(`Dare done! +${fmt(d.pay)}`);
    setTimeout(() => Chat.post(d.who, dareText(rnd(DARE_WON[d.who]), d)), 600);
    setTimeout(() => Chat.post(...rnd(LINES.dare_nan_won)), 2200);
  },
  lost(d) {
    this.chip();
    Sound.unflag();
    UI.toast(`Time’s up. ${FRIENDS[d.who].name} keeps your ${fmt(d.stake)}.`);
    setTimeout(() => Chat.post(d.who, dareText(rnd(DARE_LOST[d.who]), d)), 600);
    if (Math.random() < .6) setTimeout(() => Chat.post(...rnd(LINES.dare_nan_lost)), 2200);
  },
  declined(o) { setTimeout(() => Chat.post(o.who, dareText(rnd((o.why === 'nah' ? DARE_NAH : DARE_GONE)[o.who]), o)), 600); },
};
