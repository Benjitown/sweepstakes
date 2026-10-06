// Odd household noises that play at random: the smoke detector's 3am chirp, knocks, kittens, ducks, the phone...
import { bus } from '../core/bus.js';
import { pref, level } from '../core/state.js';
import { AudioEngine } from './engine.js';

/* =====================================================================================
   Strategy · https://refactoring.guru/design-patterns/strategy
   Every weird noise is a strategy with the same play(ctx, out, t) interface. `w` is how often it turns up at
   random (0 = only when an event asks for it). Volumes were balanced from offline renders.
   Some noises start a household event (game/household.js): knocks, kittens, the phone, the smoke detector.
   ===================================================================================== */
function nbuf(a, dur) { const len = Math.max(1, Math.floor(a.sampleRate * dur)), b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; return b; }
function envG(a, t, peak, atk, hold, rel) { const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + atk); g.gain.setValueAtTime(peak, t + atk + hold); g.gain.exponentialRampToValueAtTime(.0001, t + atk + hold + rel); return g; }

// a piezo beeper: a square wave rung through its own resonance (the shrill bit), with a sine to give it body
function piezo(a, out, s, len, f) {
  const sq = a.createOscillator(), bp = a.createBiquadFilter(), si = a.createOscillator(), sg = a.createGain(), g = envG(a, s, 1, .002, len, .02);
  sq.type = 'square'; sq.frequency.value = f; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 6;
  si.type = 'sine'; si.frequency.value = f; sg.gain.value = .6;
  sq.connect(bp).connect(g); si.connect(sg).connect(g); g.connect(out);
  sq.start(s); sq.stop(s + len + .05); si.start(s); si.stop(s + len + .05);
  return g;
}
// "somewhere in the house": two quiet reflections off the walls
function room(a, out, gap1 = .023, gap2 = .061) {
  const inp = a.createGain(), d1 = a.createDelay(.3), d2 = a.createDelay(.3), r1 = a.createGain(), r2 = a.createGain();
  d1.delayTime.value = gap1; d2.delayTime.value = gap2; r1.gain.value = .32; r2.gain.value = .16;
  inp.connect(out); inp.connect(d1).connect(r1).connect(out); inp.connect(d2).connect(r2).connect(out);
  return inp;
}
function quack(a, out, s, p = 1) {
  const o = a.createOscillator(), bp = a.createBiquadFilter(), pk = a.createBiquadFilter(), g = envG(a, s, 1, .02, .02, .17);
  o.type = 'sawtooth'; o.frequency.setValueAtTime(430 * p, s); o.frequency.exponentialRampToValueAtTime(270 * p, s + .19);
  bp.type = 'bandpass'; bp.frequency.setValueAtTime(1500 * p, s); bp.frequency.exponentialRampToValueAtTime(950 * p, s + .19); bp.Q.value = 2.5;
  pk.type = 'peaking'; pk.frequency.value = 2700 * p; pk.gain.value = 9; pk.Q.value = 2;
  o.connect(bp).connect(pk).connect(g).connect(out); o.start(s); o.stop(s + .23);
}
function mew(a, out, s, p = 1, d = .3) { // a kitten: high, short, rising then falling
  const o = a.createOscillator(), f1 = a.createBiquadFilter(), f2 = a.createBiquadFilter(), mix = a.createGain(), g = envG(a, s, 1, .03, d * .5, d * .45);
  const f0 = 780 * p;
  o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, s); o.frequency.linearRampToValueAtTime(f0 * 1.45, s + d * .35); o.frequency.linearRampToValueAtTime(f0 * 1.05, s + d);
  f1.type = 'bandpass'; f1.Q.value = 6; f1.frequency.setValueAtTime(1100 * p, s); f1.frequency.linearRampToValueAtTime(1800 * p, s + d * .4); f1.frequency.linearRampToValueAtTime(1300 * p, s + d);
  f2.type = 'bandpass'; f2.Q.value = 8; f2.frequency.setValueAtTime(3200 * p, s); f2.frequency.linearRampToValueAtTime(2400 * p, s + d);
  o.connect(f1).connect(mix); o.connect(f2).connect(mix); mix.connect(g).connect(out); o.start(s); o.stop(s + d + .05);
}
function gullCall(a, out, s, p = 1, d = .32) { // a herring gull's "kyow": nasal and harsh, it leaps up then slides down
  const o = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), f1 = a.createBiquadFilter(), f2 = a.createBiquadFilter(), mix = a.createGain();
  const g = envG(a, s, 1, .012, d * .5, d * .45), f0 = 1000 * p;
  o.type = 'sawtooth'; o.frequency.setValueAtTime(f0 * .78, s); o.frequency.linearRampToValueAtTime(f0 * 1.22, s + d * .16); o.frequency.exponentialRampToValueAtTime(f0 * .7, s + d);
  lfo.frequency.value = 37; lg.gain.value = f0 * .045; lfo.connect(lg).connect(o.frequency); // the rasp
  f1.type = 'bandpass'; f1.frequency.value = 1850 * p; f1.Q.value = 4; f2.type = 'bandpass'; f2.frequency.value = 3250 * p; f2.Q.value = 5;
  o.connect(f1).connect(mix); o.connect(f2).connect(mix); mix.connect(g).connect(out);
  o.start(s); o.stop(s + d + .05); lfo.start(s); lfo.stop(s + d + .05);
  const n = a.createBufferSource(), bp = a.createBiquadFilter(), ng = envG(a, s, .25, .01, d * .4, d * .4); // a bit of breath
  n.buffer = nbuf(a, d + .05); bp.type = 'bandpass'; bp.frequency.value = 2600 * p; bp.Q.value = 2; n.connect(bp).connect(ng).connect(out); n.start(s);
}
function knuckle(a, out, s, v) { // knuckle on a wooden door: a dull thump with a bit of crack
  const n = a.createBufferSource(), bp = a.createBiquadFilter(), g = envG(a, s, v, .002, .004, .07);
  n.buffer = nbuf(a, .08); bp.type = 'bandpass'; bp.frequency.value = 190 + Math.random() * 50; bp.Q.value = 3.5;
  n.connect(bp).connect(g).connect(out); n.start(s);
  const o = a.createOscillator(), og = envG(a, s, v * .9, .002, .01, .1);
  o.type = 'sine'; o.frequency.setValueAtTime(135, s); o.frequency.exponentialRampToValueAtTime(68, s + .11);
  o.connect(og).connect(out); o.start(s); o.stop(s + .15);
  const c = a.createBufferSource(), hp = a.createBiquadFilter(), cg = envG(a, s, v * .25, .001, .002, .02);
  c.buffer = nbuf(a, .03); hp.type = 'highpass'; hp.frequency.value = 2500; c.connect(hp).connect(cg).connect(out); c.start(s);
}

export const NOISES = {
  smoke: { volume: .22, w: 1.4, play(a, out, t) { // smoke detector, low battery: THE 3am chirp, from down the hall
    piezo(a, room(a, out), t, .075, 3300);
  } },
  alarm: { volume: .17, w: .5, play(a, out, t) { // smoke alarm going off (someone burnt the toast): beep-beep-beep, twice
    const r = room(a, out);
    for (const c of [0, 2.1]) for (const k of [0, .55, 1.1]) piezo(a, r, t + c + k, .36, 3100);
  } },
  knock: { volume: 1.05, w: 2.2, play(a, out, t) { // someone at the door: knock-knock-knock, or "shave and a haircut... two bits"
    const pattern = Math.random() < .5 ? [0, .22, .44] : [0, .2, .3, .4, .6, 1.1, 1.3];
    pattern.forEach(w => knuckle(a, out, t + w, .8 + Math.random() * .25));
  } },
  kittens: { volume: 2.3, w: 1.6, play(a, out, t) { // two or three tiny mews
    const n = 2 + Math.floor(Math.random() * 2);
    for (let k = 0, s = t; k < n; k++, s += .3 + Math.random() * .25) mew(a, out, s, 1 + Math.random() * .3, .26 + Math.random() * .1);
  } },
  purr: { volume: 3.6, w: 0, play(a, out, t) { // a happy kitten: rumbling noise, pulsing 26 times a second, two breaths
    for (const [s0, d, v] of [[0, .75, .6], [.85, .95, 1]]) {
      const s = t + s0, n = a.createBufferSource(), lp = a.createBiquadFilter(), am = a.createGain(), lfo = a.createOscillator(), lg = a.createGain(), g = envG(a, s, v, .15, d - .3, .15);
      n.buffer = nbuf(a, d + .1); lp.type = 'lowpass'; lp.frequency.value = 360;
      am.gain.value = .5; lfo.frequency.value = 25 + s0 * 3; lg.gain.value = .5; lfo.connect(lg).connect(am.gain);
      n.connect(lp).connect(am).connect(g).connect(out); n.start(s); lfo.start(s); lfo.stop(s + d + .1);
    }
  } },
  ducks: { volume: 2.5, w: .9, play(a, out, t) { // a small, rude flock
    for (let k = 0, s = t; k < 4 + Math.floor(Math.random() * 3); k++, s += .12 + Math.random() * .22) quack(a, out, s, .85 + Math.random() * .4);
  } },
  duck: { volume: 2.1, w: .7, play(a, out, t) { quack(a, out, t); quack(a, out, t + .3); } },
  quack: { volume: 2.1, w: 0, play(a, out, t) { quack(a, out, t, .85 + Math.random() * .4); } }, // one duck, mid-race
  whistle: { volume: .38, w: 0, play(a, out, t) { // the starter's whistle at the duck race: the pea inside makes it trill
    const d = .55, o = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), g = envG(a, t, 1, .02, d - .1, .08);
    o.type = 'sine'; o.frequency.value = 2900; lfo.frequency.value = 32; lg.gain.value = 170; lfo.connect(lg).connect(o.frequency);
    o.connect(g).connect(out); o.start(t); o.stop(t + d + .02); lfo.start(t); lfo.stop(t + d + .02);
    const h = a.createBufferSource(), bp = a.createBiquadFilter(), hg = envG(a, t, .12, .02, d - .1, .08);
    h.buffer = nbuf(a, d + .05); bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 1.5; h.connect(bp).connect(hg).connect(out); h.start(t);
  } },
  thud: { volume: 1.3, w: 0, play(a, out, t) { // you, falling off the chair you stood on to reach the smoke detector
    const n = a.createBufferSource(), bp = a.createBiquadFilter(), g = envG(a, t, .5, .01, .12, .05); // the chair skids
    n.buffer = nbuf(a, .2); bp.type = 'bandpass'; bp.frequency.setValueAtTime(900, t); bp.frequency.linearRampToValueAtTime(500, t + .17); bp.Q.value = 4;
    n.connect(bp).connect(g).connect(out); n.start(t);
    const s = t + .2, o = a.createOscillator(), og = envG(a, s, 1, .003, .02, .25); // you hit the floor
    o.type = 'sine'; o.frequency.setValueAtTime(110, s); o.frequency.exponentialRampToValueAtTime(42, s + .25);
    o.connect(og).connect(out); o.start(s); o.stop(s + .32);
    const m = a.createBufferSource(), lp = a.createBiquadFilter(), mg = envG(a, s, .9, .002, .015, .12);
    m.buffer = nbuf(a, .18); lp.type = 'lowpass'; lp.frequency.value = 420; m.connect(lp).connect(mg).connect(out); m.start(s);
    knuckle(a, out, s + .32, .5); knuckle(a, out, s + .45, .3); // and the chair follows you down
  } },
  squeak: { volume: .58, w: .7, play(a, out, t) { // the dog's squeaky toy, squeezed twice
    for (const [w, p] of [[0, 1], [.32, 1.12]]) {
      const s = t + w, d = .18, o = a.createOscillator(), bp = a.createBiquadFilter(), g = envG(a, s, 1, .01, d * .5, d * .4);
      o.type = 'square'; o.frequency.setValueAtTime(1300 * p, s); o.frequency.exponentialRampToValueAtTime(2100 * p, s + d * .4); o.frequency.exponentialRampToValueAtTime(1500 * p, s + d);
      bp.type = 'bandpass'; bp.frequency.value = 2200 * p; bp.Q.value = 3;
      o.connect(bp).connect(g).connect(out); o.start(s); o.stop(s + d + .02);
    }
  } },
  phone: { volume: .42, w: 1.1, play(a, out, t) { // an old landline: brrring-brrring, twice
    for (const c of [0, 1.7]) for (const w of [0, .6]) {
      const s = t + c + w, g = envG(a, s, 1, .01, .36, .03), am = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
      am.gain.value = .55; lfo.type = 'square'; lfo.frequency.value = 22; lg.gain.value = .45; lfo.connect(lg).connect(am.gain);
      for (const f of [400, 450]) { const o = a.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(am); o.start(s); o.stop(s + .45); }
      am.connect(g).connect(out); lfo.start(s); lfo.stop(s + .45);
    }
  } },
  carAlarm: { volume: .32, w: .5, play(a, out, t) { // somebody's car, three streets away
    const o = a.createOscillator(), lp = a.createBiquadFilter(), hp = a.createBiquadFilter(), d = 2.4, g = envG(a, t, 1, .05, d - .3, .25);
    o.type = 'sawtooth'; for (let k = 0; k < 6; k++) { o.frequency.setValueAtTime(650, t + k * .4); o.frequency.linearRampToValueAtTime(1350, t + k * .4 + .38); }
    lp.type = 'lowpass'; lp.frequency.value = 1800; hp.type = 'highpass'; hp.frequency.value = 500;
    o.connect(lp).connect(hp).connect(g).connect(room(a, out, .09, .21)); o.start(t); o.stop(t + d + .1);
  } },
  microwave: { volume: .55, w: .8, play(a, out, t) {
    for (let k = 0; k < 3; k++) { const s = t + k * .42, o = a.createOscillator(), g = envG(a, s, 1, .01, .2, .04);
      o.type = 'triangle'; o.frequency.value = 1950; o.connect(g).connect(out); o.start(s); o.stop(s + .3); }
  } },
  buzz: { volume: .92, w: .8, play(a, out, t) { // phone vibrating on a table
    for (let k = 0; k < 2; k++) { const s = t + k * .75, o = a.createOscillator(), lp = a.createBiquadFilter(), am = a.createGain(), lfo = a.createOscillator(), lg = a.createGain(), g = envG(a, s, 1, .02, .4, .04);
      o.type = 'sawtooth'; o.frequency.value = 160; lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 2;
      am.gain.value = .55; lfo.type = 'square'; lfo.frequency.value = 31; lg.gain.value = .45; lfo.connect(lg).connect(am.gain);
      o.connect(lp).connect(am).connect(g).connect(out); o.start(s); o.stop(s + .5); lfo.start(s); lfo.stop(s + .5); }
  } },
  kettle: { volume: .24, w: .6, play(a, out, t) {
    const d = 2.4, o = a.createOscillator(), vib = a.createOscillator(), vg = a.createGain(), g = envG(a, t, 1, .7, d - 1.05, .35);
    o.type = 'sine'; o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(2600, t + d * .75);
    vib.frequency.value = 6.5; vg.gain.value = 30; vib.connect(vg).connect(o.frequency);
    o.connect(g).connect(out); o.start(t); o.stop(t + d); vib.start(t); vib.stop(t + d);
    const h = a.createBufferSource(), hp = a.createBiquadFilter(), hg = envG(a, t, .3, .5, d - .9, .4);
    h.buffer = nbuf(a, d); hp.type = 'highpass'; hp.frequency.value = 2500; h.connect(hp).connect(hg).connect(out); h.start(t);
  } },
  doorbell: { volume: 1.18, w: 1, play(a, out, t) {
    const bell = (f, s) => [[1, 1], [2.76, .3], [5.4, .14]].forEach(([m, v]) => { const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(.0001, s); g.gain.exponentialRampToValueAtTime(v, s + .006); g.gain.exponentialRampToValueAtTime(.0001, s + 1.7 / Math.sqrt(m)); o.connect(g).connect(out); o.start(s); o.stop(s + 1.8); });
    bell(659.25, t); bell(523.25, t + .6);
  } },
  fart: { volume: .61, w: .8, play(a, out, t) { // whoopee cushion
    const d = .8, o = a.createOscillator(), lp = a.createBiquadFilter(), g = envG(a, t, 1, .03, d * .7 - .03, d * .3);
    const c = new Float32Array(40); for (let k = 0; k < 40; k++) c[k] = Math.max(40, 95 + 35 * Math.sin(k * 1.9) * (1 - k / 50) + 25 * (Math.random() - .5) - k * .8);
    o.type = 'sawtooth'; o.frequency.setValueCurveAtTime(c, t, d);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(1000, t); lp.frequency.exponentialRampToValueAtTime(260, t + d); lp.Q.value = 7;
    o.connect(lp).connect(g).connect(out); o.start(t); o.stop(t + d + .05);
  } },
  creak: { volume: 10.5, w: .8, play(a, out, t) { // door: stick-slip clicks through a moving resonance
    const d = 1.4, bp = a.createBiquadFilter(), click = nbuf(a, .004);
    bp.type = 'bandpass'; bp.Q.value = 10; bp.frequency.setValueAtTime(380, t); bp.frequency.linearRampToValueAtTime(900, t + d * .6); bp.frequency.linearRampToValueAtTime(520, t + d);
    bp.connect(out);
    for (let s = t; s < t + d; s += .009 + .02 * Math.abs(Math.sin((s - t) * 6)) + Math.random() * .006) { const src = a.createBufferSource(); src.buffer = click; src.connect(bp); src.start(s); }
  } },
  gull: { volume: 1.55, w: .9, play(a, out, t) { // a herring gull on the roof: two long cries, then that laugh (it's after your coins)
    const r = room(a, out, .03, .08);
    gullCall(a, r, t, 1, .4); gullCall(a, r, t + .52, .95, .36);
    for (let k = 0; k < 5; k++) gullCall(a, r, t + 1.02 + k * .15, 1.1 - k * .045, .11);
  } },
  gullShoo: { volume: 1.4, w: 0, play(a, out, t) { gullCall(a, out, t, 1.3, .2); gullCall(a, out, t + .19, 1.42, .17); } }, // shooed: a panicked squawk
  powerdown: { volume: .6, w: .5, play(a, out, t) { // the meter runs out: the relay clunks, the fridge winds down, the telly pops
    knuckle(a, out, t, .9);
    const c = a.createBufferSource(), hp = a.createBiquadFilter(), cg = envG(a, t, .5, .001, .005, .03);
    c.buffer = nbuf(a, .05); hp.type = 'highpass'; hp.frequency.value = 3000; c.connect(hp).connect(cg).connect(out); c.start(t);
    const d = 1.7, lp = a.createBiquadFilter(), hg = envG(a, t, .9, .01, .3, d - .3);
    lp.type = 'lowpass'; lp.frequency.value = 420; lp.connect(hg).connect(out);
    for (const [type, f] of [['sawtooth', 100], ['sine', 50]]) {
      const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .3, t + d);
      o.connect(lp); o.start(t); o.stop(t + d + .05);
    }
    const tv = a.createOscillator(), tg = envG(a, t + .05, .25, .005, .05, .35);
    tv.type = 'sine'; tv.frequency.setValueAtTime(1500, t + .05); tv.frequency.exponentialRampToValueAtTime(70, t + .45); tv.connect(tg).connect(out); tv.start(t + .05); tv.stop(t + .5);
  } },
  powerup: { volume: 1, w: 0, play(a, out, t) { // the lights come back: a clunk, the hum rises, a strip light tinks into life
    knuckle(a, out, t, .7);
    const d = .9, lp = a.createBiquadFilter(), hg = envG(a, t, .5, .25, .3, .35);
    lp.type = 'lowpass'; lp.frequency.value = 500; lp.connect(hg).connect(out);
    for (const f of [100, 50]) { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * .4, t); o.frequency.exponentialRampToValueAtTime(f, t + .3); o.connect(lp); o.start(t); o.stop(t + d + .05); }
    for (const [w, f] of [[.32, 3100], [.47, 2900], [.7, 3300]]) { const o = a.createOscillator(), g = envG(a, t + w, .45, .002, .01, .09); o.type = 'triangle'; o.frequency.value = f; o.connect(g).connect(out); o.start(t + w); o.stop(t + w + .12); }
  } },
  meow: { volume: 1.75, w: .8, play(a, out, t) {
    const d = .75, o = a.createOscillator(), f1 = a.createBiquadFilter(), f2 = a.createBiquadFilter(), mix = a.createGain(), g = envG(a, t, 1, .08, d * .6 - .08, d * .4);
    o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(800, t + d * .35); o.frequency.linearRampToValueAtTime(470, t + d);
    f1.type = 'bandpass'; f1.Q.value = 5; f1.frequency.setValueAtTime(700, t); f1.frequency.linearRampToValueAtTime(1300, t + d * .4); f1.frequency.linearRampToValueAtTime(800, t + d);
    f2.type = 'bandpass'; f2.Q.value = 7; f2.frequency.setValueAtTime(2700, t); f2.frequency.linearRampToValueAtTime(1500, t + d);
    o.connect(f1).connect(mix); o.connect(f2).connect(mix); mix.connect(g).connect(out); o.start(t); o.stop(t + d + .05);
  } },
};

export const WeirdNoises = {
  timer: 0, chirpTimer: 0, chirping: false,
  // plays a noise now; returns a handle with stop() so an event can cut it short (waving a tea towel at the alarm)
  play(k) {
    const eng = AudioEngine.get(), a = eng.ready(); if (!a) return { stop() {} };
    const g = a.createGain(); g.gain.value = NOISES[k].volume * level('noiseVol'); g.connect(eng.master); NOISES[k].play(a, g, a.currentTime + .03);
    return { gain: g, stop() { try { g.gain.setTargetAtTime(0, a.currentTime, .03); } catch (e) { /* already gone */ } } };
  },
  // a random noise, weighted by w; `ok` can rule some out (no knock at the door while a window is open, say)
  pick(ok = () => true) {
    const pool = Object.entries(NOISES).filter(([k, n]) => n.w > 0 && ok(k)), total = pool.reduce((s, [, n]) => s + n.w, 0);
    let x = Math.random() * total;
    for (const [k, n] of pool) { x -= n.w; if (x <= 0) return k; }
    return pool.length ? pool[0][0] : null;
  },
  surprise(k = this.pick()) {
    if (!NOISES[k]) return null;
    const handle = this.play(k); bus.emit('odd', { k, handle });
    if (k === 'smoke') this.startChirping(3 + Math.floor(Math.random() * 3));
    return handle;
  },
  // like the real thing: it chirps again about once a minute until someone changes the battery
  startChirping(n) { this.chirping = true; this.keepChirping(n); bus.emit('chirp', { on: true }); },
  keepChirping(n) {
    clearTimeout(this.chirpTimer);
    if (n <= 0) { this.stopChirping(); return; }
    this.chirpTimer = setTimeout(() => {
      if (pref('odd') && !document.hidden) { this.play('smoke'); bus.emit('chirp', { on: true, again: true }); }
      this.keepChirping(n - 1);
    }, 35000 + Math.random() * 20000);
  },
  stopChirping() { clearTimeout(this.chirpTimer); if (this.chirping) { this.chirping = false; bus.emit('chirp', { on: false }); } },
  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { if (pref('odd') && !document.hidden && AudioEngine.get().unlocked) bus.emit('noise:due'); this.schedule(); }, (70 + Math.random() * 150) * 1000);
  },
};
