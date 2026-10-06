// Touching grass, on screen: a little park while the game waits, birdsong, a countdown, and the fresh air bonus.
import { $, fmt, esc, rnd, clock, reduced } from '../core/util.js';
import { FRIENDS } from '../content/chat-lines.js';
import { S } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { WeirdNoises } from '../audio/noises.js';
import { Game } from '../game/game.js';
import { Outside } from '../game/outside.js';
import { UI } from './ui.js';
import { Chat } from './chat.js';
import { Coach } from './tutorial.js';

const BLADES = Array.from({ length: 27 }, (_, k) => `<path class="pblade" style="--d:-${(k * .37 % 2).toFixed(2)}s" d="M${6 + k * 13.3} 200 q3 -10 ${k % 2 ? 2 : -2} -${15 + k * 7 % 10}"/>`).join('');
// the park: sky, sun, clouds and birds drifting by, two hills, a tree, a bench, the pond and its duck (css/booth.css moves them)
const PARK = `<svg viewBox="0 0 360 200" class="park" aria-hidden="true">
  <defs><linearGradient id="parksky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fcaff"/><stop offset="1" stop-color="#e2f5ff"/></linearGradient></defs>
  <rect width="360" height="200" fill="url(#parksky)"/>
  <g class="psun"><g stroke="#ffd23f" stroke-width="4" stroke-linecap="round" class="prays"><path d="M300 12 v-7 M300 76 v7 M268 44 h-7 M332 44 h7 M278 22 l-5-5 M322 66 l5 5 M278 66 l-5 5 M322 22 l5-5"/></g>
    <circle cx="300" cy="44" r="21" fill="#ffd23f" stroke="#141b1d" stroke-width="3"/><circle cx="293" cy="41" r="2.5" fill="#141b1d"/><circle cx="307" cy="41" r="2.5" fill="#141b1d"/>
    <path d="M293 50 q7 6 14 0" fill="none" stroke="#141b1d" stroke-width="2.5" stroke-linecap="round"/></g>
  <g class="pcloud c1"><path d="M40 52 a14 14 0 0 1 22 -12 a18 18 0 0 1 32 4 a12 12 0 0 1 4 24 h-52 a10 10 0 0 1 -6 -16 z" fill="#fff" stroke="#141b1d" stroke-width="3"/></g>
  <g class="pcloud c2"><path d="M170 30 a11 11 0 0 1 17 -9 a14 14 0 0 1 25 3 a9 9 0 0 1 3 18 h-40 a8 8 0 0 1 -5 -12 z" fill="#fff" stroke="#141b1d" stroke-width="3"/></g>
  <g class="pbird b1"><path d="M0 0 q6 -6 12 0 q6 -6 12 0" fill="none" stroke="#141b1d" stroke-width="2.5" stroke-linecap="round"/></g>
  <g class="pbird b2"><path d="M0 0 q5 -5 10 0 q5 -5 10 0" fill="none" stroke="#141b1d" stroke-width="2.5" stroke-linecap="round"/></g>
  <path d="M-4 132 Q90 96 190 122 T364 112 V204 H-4 Z" fill="#3fc18a" stroke="#141b1d" stroke-width="3"/>
  <path d="M58 150 v-36" stroke="#141b1d" stroke-width="10" stroke-linecap="round"/><path d="M58 150 v-36" stroke="#a8743a" stroke-width="5" stroke-linecap="round"/>
  <g class="ptree"><circle cx="58" cy="102" r="25" fill="#1f7d55" stroke="#141b1d" stroke-width="3"/><circle cx="47" cy="94" r="7" fill="#3fc18a" opacity=".55"/></g>
  <path d="M-4 160 Q120 130 240 152 T364 148 V204 H-4 Z" fill="#2aa874" stroke="#141b1d" stroke-width="3"/>
  <path d="M116 157 h50" stroke="#141b1d" stroke-width="9" stroke-linecap="round"/><path d="M116 157 h50" stroke="#c8732e" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M118 168 h46" stroke="#141b1d" stroke-width="9" stroke-linecap="round"/><path d="M118 168 h46" stroke="#c8732e" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M123 170 v12 M159 170 v12" stroke="#141b1d" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="262" cy="176" rx="64" ry="14" fill="#009dff" stroke="#141b1d" stroke-width="3"/><path d="M222 175 h18 M276 181 h24" stroke="#bfe7ff" stroke-width="3" stroke-linecap="round"/>
  <g class="pduck"><use href="#i-duck" x="248" y="150" width="30" height="30"/></g>
  <g class="pgrass" fill="none" stroke="#1f7d55" stroke-width="3" stroke-linecap="round">${BLADES}</g>
</svg>`;

export const OutsideView = {
  tick: 0, amb: 0,
  // go outside (from Stats, the G key, or Nan's nudge); only from the table, not from another window
  open() {
    if (!UI.modalClosed() || Coach.active) return false;
    return Outside.go(); // wiring.js shows the park on the 'outside' event
  },
  show() {
    UI.modal(`<h3 class="green">You’re outside</h3><div class="parkbox">${PARK}</div>
      <p id="grassText">The boards are paused. The mines will wait. Have a breather.</p>
      <div class="grassbar"><i id="grassBar"></i></div>
      <p class="hint num" id="grassLeft"></p>
      <div class="row"><button class="btn ghost" type="button" id="grassIn">Go back in early</button></div>`, {}, true);
    $('#grassIn').onclick = () => Outside.back();
    this.update(); clearInterval(this.tick); this.tick = setInterval(() => this.update(), 500);
    // the park sounds like a park: birds now and then, and a breeze
    clearTimeout(this.amb);
    const ambience = () => { if (!Outside.on) return; WeirdNoises.play(Math.random() < .8 ? 'bird' : 'breeze'); this.amb = setTimeout(ambience, 1400 + Math.random() * 2600); };
    this.amb = setTimeout(ambience, 600);
  },
  update() {
    const bar = $('#grassBar'); if (!bar || !Outside.on) return;
    const left = Outside.left(); bar.style.width = (100 * (1 - left / Outside.SECONDS)).toFixed(1) + '%';
    $('#grassLeft').textContent = `${clock(left)} to go for the fresh air bonus (+${fmt(Outside.bonus())})`;
  },
  // back in: the whole break pays the bonus (and the window waits for you); early, you're straight back at the table
  done({ full, coins, secs }) {
    clearInterval(this.tick); clearTimeout(this.amb);
    if (!full) { UI.closeModal(); UI.toast(secs < 60 ? `Out for ${secs} seconds. Nan says that doesn’t count.` : `Out for ${clock(secs)}. Better than nothing.`); return; }
    UI.modalLocked = false;
    UI.modal(`<h3 class="green">That’s better</h3><div class="parkbox">${PARK}</div>
      <p>Three whole minutes of fresh air. The boards are right where you left them.</p>
      <div class="duckres"><b>+${fmt(coins)}</b><span>Fresh air bonus</span></div>
      <button class="btn green big" type="button" data-a="in">Go back in</button>`, { in: () => UI.closeModal() });
    Sound.cash(); Game.setCoins(S.coins, true, { from: $('.duckres', UI.el.box), amount: coins });
  },
  // after a long session, Nan says something, with a button that sends you outside
  nudge() {
    const f = FRIENDS.nan, chat = $('#chat');
    chat.insertAdjacentHTML('beforeend', `<div class="msg invite">${Chat.avatar(f)}<div class="bubble" style="--fc:${f.col}"><b>${esc(f.name)}</b>
      <span>${esc(rnd(['You’ve been on that for an hour love. Go and get some fresh air, it’s lovely out x',
        'An hour?! Your eyes will go square. Go and touch some grass love x', 'Have a little walk round the block love, the mines aren’t going anywhere x']))}</span>
      <div class="qopts"><button type="button" class="qopt">Go outside for 3 minutes</button></div></div></div>`);
    while (chat.children.length > 40) chat.firstChild.remove();
    chat.scrollTop = chat.scrollHeight; Sound.msg();
    chat.lastElementChild.querySelector('.qopt').onclick = e => { if (this.open()) e.currentTarget.disabled = true; };
  },
};
