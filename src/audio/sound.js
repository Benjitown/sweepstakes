// Every game sound as a one-line call: digs, cash-outs, gems, menus.
import { AudioEngine } from './engine.js';

/* =====================================================================================
   Facade · https://refactoring.guru/design-patterns/facade
   ===================================================================================== */
const PENTA = [0, 2, 4, 7, 9];
const note = k => 392 * Math.pow(2, (Math.floor(k / 5) * 12 + PENTA[((k % 5) + 5) % 5]) / 12);
export const Sound = (() => {
  const A = () => AudioEngine.get(); const last = {};
  const tone = (...x) => A().tone(...x), noise = (...x) => A().noise(...x);
  const gate = (k, ms) => { const n = performance.now(); if (n - (last[k] || 0) < ms) return false; last[k] = n; return true; };
  return {
    reveal(f, quiet) { if (!gate('rv', 45)) return; const fr = note(Math.floor(f * 13)); tone(fr, .1, 'triangle', quiet ? .1 : .3); tone(fr * 2, .06, 'sine', quiet ? .03 : .1); },
    risky(p, combo = 1) { const n = 7 + Math.min(12, combo * 2) + Math.round(p * 6); tone(note(n), .12, 'square', .07); tone(note(n + 2), .16, 'triangle', .22, .07); tone(note(n + 4), .22, 'triangle', .24, .14); },
    card() { tone(1320, .05, 'square', .05); tone(1760, .08, 'triangle', .13, .04); },
    quip() { tone(700, .05, 'sine', .12); tone(1050, .08, 'sine', .1, .05); },
    // menus: a soft wooden "tock" on press, a bubbly pop on select, two-note pops for tabs
    press() { if (!gate('press', 30)) return; noise(.012, .35, 2600, 0, 'bandpass'); tone(190, .05, 'sine', .22, 0, 120); },
    pop(k = 0) { tone(900 + k * 120, .07, 'sine', .22, 0, 420 + k * 60); tone(1800 + k * 200, .03, 'sine', .05, .01); },
    tab(k = 0) { tone(note(9 + k), .07, 'sine', .2, 0, note(9 + k) * .7); tone(note(12 + k), .1, 'triangle', .16, .055); },
    select(k = 0) { tone(note(7 + k), .08, 'triangle', .2); tone(note(10 + k), .12, 'triangle', .18, .06); tone(note(14 + k), .16, 'sine', .08, .12); },
    hover() { if (!gate('hover', 55)) return; tone(2400, .018, 'sine', .035); },
    slide(p) { if (!gate('slide', 28)) return; tone(700 + p * 1300, .014, 'square', .028); },
    open() { tone(260, .14, 'triangle', .1, 0, 520); noise(.12, .05, 1800, 0, 'bandpass'); },
    close() { tone(520, .1, 'triangle', .08, 0, 280); },
    toggle(onState) { tone(onState ? 660 : 440, .05, 'square', .06); tone(onState ? 990 : 330, .07, 'triangle', .12, .04); },
    flag() { tone(900, .08, 'square', .12, 0, 450); },
    unflag() { tone(450, .07, 'square', .1, 0, 700); },
    coin(k, quiet) { if (!gate('coin', 22)) return; const f = note(12 + Math.min(14, k)); tone(f, .07, 'triangle', quiet ? .05 : .15); tone(f * 2, .05, 'sine', quiet ? .015 : .05, .01); },
    cash() { [0, 4, 7, 12].forEach((s, k) => tone(523.25 * 2 ** (s / 12), .2, 'triangle', .36, k * .06)); tone(1568, .35, 'sine', .12, .26); },
    clear() { [0, 4, 7, 12, 16, 19, 24].forEach((s, k) => tone(523.25 * 2 ** (s / 12), .22, 'triangle', .33, k * .07)); [0, 1, 2].forEach(k => tone(2093 + k * 300, .15, 'sine', .07, .5 + k * .08)); },
    gem(tier) {
      const steps = tier === 'jackpot' ? [0, 4, 7, 12, 16, 19, 24, 28, 31, 36] : tier === 'diamond' ? [0, 7, 12, 16, 19, 24] : tier === 'ruby' ? [0, 4, 7, 12, 16] : [0, 7, 12, 19];
      steps.forEach((s, k) => tone(1046.5 * 2 ** (s / 12), .12, 'sine', .14, k * .045));
      tone(2093, .5, 'triangle', .05, steps.length * .045);
    },
    golden() { [0, 4, 7, 11, 14].forEach((s, k) => tone(784 * 2 ** (s / 12), .5, 'sine', .08, k * .05)); },
    boom() { noise(.55, .75, 1400); tone(170, .5, 'sine', .55, 0, 38); tone(90, .3, 'square', .08, .02, 40); },
    buy() { tone(988, .07, 'square', .13); tone(1319, .26, 'square', .13, .07); },
    tick() { if (!gate('tick', 20)) return; tone(1400, .022, 'square', .04); },
    wheel(speed) { tone(1700 - speed * 200, .02, 'square', .07); noise(.015, .12, 3000, 0, 'bandpass'); },
    msg() { tone(1046, .05, 'sine', .09); tone(1318, .09, 'sine', .09, .05); },
    shield() { tone(660, .25, 'sine', .3, 0, 1320); tone(990, .25, 'triangle', .15, .08, 1980); },
    drum(n = 16) { for (let k = 0; k < n; k++) noise(.05, .25 + k * .02, 2500, k * .065); },
    win() { [0, 7, 12, 16, 19, 24, 28, 31].forEach((s, k) => tone(392 * 2 ** (s / 12), .3, 'triangle', .36, k * .075)); [0, 4, 7].forEach(s => tone(784 * 2 ** (s / 12), 1.1, 'sine', .13, .65)); },
    bigwin(level) { const n = 5 + level * 3; for (let k = 0; k < n; k++) tone(note(8 + k), .14, 'triangle', .22, k * .06); [0, 4, 7, 12].forEach(s => tone(523.25 * 2 ** (s / 12), 1.2, 'sine', .1, n * .06)); },
    levelup() { [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, k) => tone(523.25 * 2 ** (s / 12), .14, 'square', .07, k * .07)); tone(1046.5, .7, 'triangle', .18, .56); },
    achievement(tier = 1) { const st = [0, 4, 7, 12, 16].slice(0, 2 + tier); st.forEach((x, k) => tone(659.25 * 2 ** (x / 12), .12, 'square', .07, k * .06)); tone(tier === 3 ? 1975.5 : 1318.5, .45, 'triangle', .12, st.length * .06); },
    bust() { tone(392, .38, 'triangle', .35, 0, 370); tone(370, .38, 'triangle', .35, .4, 349); tone(349, 1.1, 'triangle', .35, .8, 290); tone(196, 1.9, 'sawtooth', .05, 0, 145); },
    ascend() { [0, 5, 7, 12, 17, 19, 24].forEach((s, k) => tone(196 * 2 ** (s / 12), .6, 'sawtooth', .05, k * .12)); [0, 7, 12, 16].forEach((s, k) => tone(392 * 2 ** (s / 12), 1.4, 'triangle', .28, .9 + k * .05)); },
    hold(p) { tone(220 + p * 660, .05, 'sine', .08); },
    // the Fruity: a reel thunking to a stop, a nudge clicking a reel down, the gamble lights ticking back and forth
    reel(k = 0) { noise(.06, .4, 700 + k * 160, 0, 'bandpass'); tone(150 - k * 12, .09, 'square', .1, 0, 80); },
    nudge() { tone(520, .05, 'square', .09, 0, 300); noise(.04, .3, 1200, 0, 'bandpass'); tone(160, .07, 'sine', .25, .03, 90); },
    gamble(k) { tone(k ? 880 : 660, .05, 'square', .07); },
    // the paper through the letterbox: the flap clacks, the paper thumps on the mat
    letterbox() { noise(.04, .5, 1800, 0, 'bandpass'); tone(420, .05, 'square', .06, 0, 300); noise(.12, .45, 600, .12); tone(95, .14, 'sine', .4, .12, 60); },
    // the Red Lion's crowd: applause (lots of little claps) or a good-natured boo
    cheer() { for (let k = 0; k < 40; k++) noise(.04, .1 + Math.random() * .12, 1500 + Math.random() * 2000, k * .04 + Math.random() * .05, 'bandpass'); },
    boo() { tone(190, .9, 'sawtooth', .04, 0, 120); tone(160, 1, 'sawtooth', .035, .12, 105); tone(140, .9, 'triangle', .1, .05, 95); },
    // a dart in the board: a short thunk
    dart() { noise(.03, .45, 900, 0, 'bandpass'); tone(170, .06, 'square', .12, 0, 70); tone(75, .1, 'sine', .3); },
    // the claw machine paying out: an eight-bit arpeggio
    arcade() { [0, 4, 7, 12, 16, 19, 24].forEach((s, k) => tone(659.25 * 2 ** (s / 12), .09, 'square', .07, k * .055)); },
    // the claw closing: a servo whirr and a clack
    claw() { tone(300, .2, 'sawtooth', .04, 0, 520); noise(.03, .3, 2200, .2, 'bandpass'); },
    scratch() { if (!gate('scratch', 65)) return; noise(.07, .16, 2600 + Math.random() * 1400, 0, 'bandpass'); },
    coach() { tone(note(10), .06, 'sine', .14); tone(note(13), .09, 'sine', .12, .06); },
  };
})();
