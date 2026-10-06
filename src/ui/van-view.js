// The ice cream van on screen: it drives along the bottom of the screen while its jingle plays. Tap it and it stops,
// hands a cone out of the hatch, and drives on (once per van). src/game/ice-cream.js sells the cone.
import { fmt, reduced } from '../core/util.js';
import { S } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { NOISES } from '../audio/noises.js';
import { Game } from '../game/game.js';
import { IceCream } from '../game/ice-cream.js';
import { UI } from './ui.js';

const VAN_SVG = `<svg viewBox="0 0 150 92" aria-hidden="true">
  <path d="M68 25 l6 -15 l6 15 z" fill="#e0a85a" stroke="#141b1d" stroke-width="2.5" stroke-linejoin="round"/><circle cx="74" cy="9" r="7" fill="#ff8fb0" stroke="#141b1d" stroke-width="2.5"/>
  <path d="M77 2 l5 -2" stroke="#7a4a1e" stroke-width="3" stroke-linecap="round"/>
  <path d="M100 26 h10 l4 -6 h-18 z" fill="#c9d6da" stroke="#141b1d" stroke-width="2" stroke-linejoin="round"/>
  <rect x="5" y="25" width="112" height="47" rx="8" fill="#fff8e6" stroke="#141b1d" stroke-width="3"/>
  <path d="M113 37 h20 q11 0 13 14 v15 a6 6 0 0 1 -6 6 h-27 z" fill="#fff8e6" stroke="#141b1d" stroke-width="3" stroke-linejoin="round"/>
  <path d="M122 41 h10 q7 0 9 10 h-19 z" fill="#bfe7ff" stroke="#141b1d" stroke-width="2.5" stroke-linejoin="round"/>
  <rect x="54" y="36" width="44" height="21" rx="3" fill="#3b2b00" stroke="#141b1d" stroke-width="2.5"/>
  <g class="awning" stroke="#141b1d" stroke-width="2"><path d="M50 30 h52 v6 h-52 z" fill="#ff8fb0"/><path d="M59 30 v6 M68 30 v6 M77 30 v6 M86 30 v6 M95 30 v6" stroke="#fff" stroke-width="4"/></g>
  <rect x="5" y="60" width="141" height="6" fill="#ff8fb0"/>
  <text class="vtext" x="11" y="52">ICES</text>
  <g class="vwheel"><circle cx="34" cy="74" r="10" fill="#141b1d"/><circle cx="34" cy="74" r="4" fill="#c9d6da"/><path d="M34 66 v4" stroke="#c9d6da" stroke-width="2"/></g>
  <g class="vwheel"><circle cx="120" cy="74" r="10" fill="#141b1d"/><circle cx="120" cy="74" r="4" fill="#c9d6da"/><path d="M120 66 v4" stroke="#c9d6da" stroke-width="2"/></g>
</svg>`;
const CONE_SVG = `<svg viewBox="0 0 40 56" class="vcone" aria-hidden="true"><path d="M10 22 l10 32 l10 -32 z" fill="#e0a85a" stroke="#141b1d" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="20" cy="17" r="11" fill="#fff8e6" stroke="#141b1d" stroke-width="2.5"/><path d="M12 14 q8 6 16 0" fill="none" stroke="#ff4f8b" stroke-width="3" stroke-linecap="round"/><path d="M24 8 l6 -6" stroke="#7a4a1e" stroke-width="4" stroke-linecap="round"/></svg>`;

export const VanView = {
  van: null, SPEED: 110, // pixels a second (it takes at least as long as its tune)
  // drive past (the jingle's handle comes from the noise that started it, so a cone can stop the music)
  drive(handle) {
    if (this.van) return false;
    const btn = document.createElement('button'), w = innerWidth, W = 150;
    btn.type = 'button'; btn.className = 'van'; btn.setAttribute('aria-label', `The ice cream van! Buy a cone (${fmt(IceCream.price())})`);
    btn.innerHTML = `<span class="vb">${VAN_SVG}</span>`;
    document.body.appendChild(btn); this.van = btn;
    let bought = false, anim = null;
    const gone = () => { if (this.van !== btn) return; btn.remove(); this.van = null; if (!bought) UI.toast('The ice cream van’s gone. You’ll hear it again.'); };
    const ms = Math.max(NOISES.icecream.dur * 1000, (w + W + 20) / this.SPEED * 1000);
    if (reduced) { btn.style.transform = `translateX(${Math.round(w * .1)}px)`; setTimeout(gone, ms); }
    else { anim = btn.animate([{ transform: `translateX(${-W - 10}px)` }, { transform: `translateX(${w + 10}px)` }], { duration: ms, easing: 'linear', fill: 'forwards' }); anim.onfinish = gone; }
    btn.onclick = () => {
      if (bought) return;
      if (!IceCream.buy()) { UI.toast(`A cone’s ${fmt(IceCream.price())}. You’re short.`); return; }
      bought = true; btn.classList.add('serving'); if (anim) anim.pause(); if (handle) handle.stop();
      Sound.coin(8); Game.setCoins(S.coins);
      btn.insertAdjacentHTML('beforeend', CONE_SVG);
      setTimeout(() => { btn.classList.remove('serving'); btn.classList.add('served'); if (anim) anim.play(); else gone(); }, 1600);
    };
    return true;
  },
  clear() { if (this.van) { this.van.remove(); this.van = null; } },
};
