// The room, dressed for the season: at Halloween a purple room, a pumpkin by the logo and the odd bat; on Bonfire
// Night fireworks over big wins (and some in the distance); at Christmas snow past the window. Plus eggs on the window
// if you sent the trick or treaters away. src/game/seasons.js says what's on.
import { $, reduced } from '../core/util.js';
import { TRICK } from '../data/seasons.js';
import { WeirdNoises } from '../audio/noises.js';
import { Seasons } from '../game/seasons.js';
import { FX } from './fx.js';

const DECO = { halloween: 'pumpkin', bonfire: 'firework', xmas: 'holly' };

export const SeasonView = {
  batT: 0, fwT: 0, eggT: 0,
  apply() {
    const k = Seasons.now() || '';
    document.body.dataset.season = k;
    // a little something by the logo
    let deco = $('#seasonDeco');
    if (k) {
      if (!deco) { $('.logo').insertAdjacentHTML('beforeend', '<svg class="seasondeco" id="seasonDeco" aria-hidden="true"><use href="#i-pumpkin"/></svg>'); deco = $('#seasonDeco'); }
      deco.querySelector('use').setAttribute('href', '#i-' + DECO[k]);
    } else if (deco) deco.remove();
    // snow past the window
    const snow = $('#snow');
    if (k === 'xmas' && !snow && !reduced) {
      const el = document.createElement('div'); el.className = 'snow'; el.id = 'snow'; el.setAttribute('aria-hidden', 'true');
      el.innerHTML = Array.from({ length: 36 }, () => `<i style="left:${(Math.random() * 100).toFixed(1)}%;--s:${(2 + Math.random() * 5).toFixed(1)}px;animation-duration:${(9 + Math.random() * 12).toFixed(1)}s;animation-delay:-${(Math.random() * 20).toFixed(1)}s"></i>`).join('');
      document.body.appendChild(el);
    } else if (k !== 'xmas' && snow) snow.remove();
    clearTimeout(this.batT); clearTimeout(this.fwT);
    if (k === 'halloween') this.batT = setTimeout(() => this.bats(), 12000 + Math.random() * 25000);
    if (k === 'bonfire') this.fwT = setTimeout(() => this.distant(), 25000 + Math.random() * 40000);
    return k;
  },
  // a bat flaps across the room
  bat() {
    if (reduced) return null;
    const el = document.createElement('div');
    el.className = 'bat' + (Math.random() < .5 ? ' back' : ''); el.setAttribute('aria-hidden', 'true');
    el.style.top = (6 + Math.random() * 38).toFixed(1) + 'vh';
    el.innerHTML = '<svg><use href="#i-bat"/></svg>';
    document.body.appendChild(el); setTimeout(() => el.remove(), 9000);
    return el;
  },
  bats() { if (!Seasons.is('halloween')) return; if (!document.hidden) this.bat(); this.batT = setTimeout(() => this.bats(), 30000 + Math.random() * 50000); },
  // fireworks: bursts in the sky, and the whizz and bang
  fireworks(n = 3) { FX.fireworks(n); WeirdNoises.play('firework'); },
  distant() { if (!Seasons.is('bonfire')) return; if (!document.hidden) { FX.fireworks(1); WeirdNoises.play('firework'); } this.fwT = setTimeout(() => this.distant(), 45000 + Math.random() * 60000); },
  // the trick: three eggs on the window, for a while
  eggs() {
    const old = $('#eggs'); if (old) old.remove();
    const el = document.createElement('div'); el.className = 'eggs'; el.id = 'eggs'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = [0, 1, 2].map(k => `<svg class="egg" style="left:${(8 + k * 30 + Math.random() * 14).toFixed(1)}%;top:${(18 + Math.random() * 50).toFixed(1)}%;--r:${Math.round(Math.random() * 360)}deg;--d:${k * 350}ms"><use href="#i-splat"/></svg>`).join('');
    document.body.appendChild(el);
    [0, 350, 700].forEach(ms => setTimeout(() => WeirdNoises.play('splat'), ms));
    clearTimeout(this.eggT); this.eggT = setTimeout(() => { el.classList.add('wiped'); setTimeout(() => el.remove(), 1200); }, TRICK.EGGS_MS);
    return el;
  },
};
