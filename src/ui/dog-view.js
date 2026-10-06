// Biscuit on screen: he trots in along the bottom, stops, wags and waits ("Woof?"). Tap him to give him a biscuit and
// he bounds off, having flagged a mine on your board (the tile glows orange for a moment). Ignore him and he wanders on.
import { fmt, reduced } from '../core/util.js';
import { S } from '../core/state.js';
import { WeirdNoises } from '../audio/noises.js';
import { Game } from '../game/game.js';
import { Dog } from '../game/dog.js';
import { UI } from './ui.js';

const DOG_SVG = `<svg viewBox="0 0 90 60" aria-hidden="true">
  <g class="dtail"><path d="M15 27 q-10 -11 -5 -20" fill="none" stroke="#141b1d" stroke-width="7" stroke-linecap="round"/><path d="M15 27 q-10 -11 -5 -20" fill="none" stroke="#c8732e" stroke-width="3.5" stroke-linecap="round"/></g>
  <g fill="#c8732e" stroke="#141b1d" stroke-width="2.5"><rect class="dl" x="19" y="35" width="7" height="19" rx="3"/><rect class="dl b" x="28" y="35" width="7" height="19" rx="3"/>
    <rect class="dl b" x="47" y="35" width="7" height="19" rx="3"/><rect class="dl" x="56" y="35" width="7" height="19" rx="3"/></g>
  <ellipse cx="39" cy="31" rx="27" ry="13" fill="#c8732e" stroke="#141b1d" stroke-width="3"/><ellipse cx="33" cy="27" rx="8" ry="5" fill="#7a4a1e" opacity=".55"/>
  <path d="M56 29 q5 6 13 5" stroke="#fe5f55" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="62" cy="35" r="2.6" fill="#ffd23f" stroke="#141b1d" stroke-width="1.5"/>
  <circle cx="67" cy="21" r="12" fill="#c8732e" stroke="#141b1d" stroke-width="3"/>
  <ellipse cx="78" cy="25" rx="7.5" ry="5.5" fill="#e0a85a" stroke="#141b1d" stroke-width="2.5"/><circle cx="84" cy="23" r="2.6" fill="#141b1d"/>
  <path d="M61 11 q-7 8 -3 19 q7 -4 9 -12 z" fill="#7a4a1e" stroke="#141b1d" stroke-width="2.5" stroke-linejoin="round"/><circle cx="71" cy="18" r="2" fill="#141b1d"/>
</svg>`;

export const DogView = {
  dog: null, WALK_MS: 2600, WAIT_MS: 9000, LEAVE_MS: 4200, // trotting in, waiting for a biscuit, wandering off
  visit() {
    if (this.dog) return false;
    const btn = document.createElement('button'), w = innerWidth, W = 90, stop = Math.round(Math.min(w * .35, w - W - 20));
    btn.type = 'button'; btn.className = 'dog walking'; btn.setAttribute('aria-label', `Biscuit the dog. Give him a biscuit (${fmt(Dog.price())})`);
    btn.innerHTML = `<span class="db">${DOG_SVG}</span><b class="dsay" aria-hidden="true">Woof?</b>`;
    document.body.appendChild(btn); this.dog = btn;
    let fed = false, timer = 0;
    const move = (from, to, ms, done) => {
      if (reduced) { btn.style.transform = `translateX(${to}px)`; setTimeout(done, Math.min(ms, 300)); return; }
      const a = btn.animate([{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
      a.onfinish = done;
    };
    const gone = () => { if (this.dog !== btn) return; btn.remove(); this.dog = null; };
    const leave = (fast) => { clearTimeout(timer); btn.classList.add('walking'); btn.classList.remove('waiting'); move(stop, w + 10, fast ? this.LEAVE_MS / 3 : this.LEAVE_MS, gone); };
    move(-W - 10, stop, this.WALK_MS, () => { if (this.dog !== btn || fed) return; btn.classList.remove('walking'); btn.classList.add('waiting'); timer = setTimeout(() => { if (!fed) leave(false); }, this.WAIT_MS); });
    btn.onclick = () => {
      if (fed) return;
      const hit = Dog.treat();
      if (!hit) { UI.toast(S.coins < Dog.price() ? `A biscuit’s ${fmt(Dog.price())}. You’re short.` : 'Biscuit sniffs about and finds nothing. Good boy anyway.'); return; }
      fed = true; WeirdNoises.play('bark'); Game.setCoins(S.coins);
      btn.classList.add('fed'); btn.querySelector('.dsay').textContent = 'Woof!';
      const cell = hit.b.cells && hit.b.cells[hit.i]; if (cell) { cell.classList.add('paw'); setTimeout(() => cell.classList.remove('paw'), 2200); }
      setTimeout(() => leave(true), 700);
    };
    return true;
  },
  clear() { if (this.dog) { this.dog.remove(); this.dog = null; } },
};
