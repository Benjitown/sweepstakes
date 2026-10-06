// Odd household noises that play at random: CO alarm chirp, microwave, doorbell, duck...
import { rnd } from '../core/util.js';
import { bus } from '../core/bus.js';
import { pref } from '../core/state.js';
import { AudioEngine } from './engine.js';

/* =====================================================================================
   Strategy · https://refactoring.guru/design-patterns/strategy
   Every weird noise is a strategy with the same play(ctx, out, t) interface.
   Volumes were balanced from offline renders; the CO alarm is deliberately quiet.
   ===================================================================================== */
function nbuf(a, dur) { const len = Math.max(1, Math.floor(a.sampleRate * dur)), b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; return b; }
function envG(a, t, peak, atk, hold, rel) { const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + atk); g.gain.setValueAtTime(peak, t + atk + hold); g.gain.exponentialRampToValueAtTime(.0001, t + atk + hold + rel); return g; }
export const NOISES = {
  co: { volume: .13, play(a, out, t) { // carbon monoxide alarm, low battery: one small piezo chirp
    const o = a.createOscillator(), o2 = a.createOscillator(), h = a.createGain(), g = envG(a, t, 1, .004, .035, .03);
    o.type = 'sine'; o.frequency.value = 3150; o2.type = 'sine'; o2.frequency.value = 6300; h.gain.value = .12;
    o.connect(g); o2.connect(h).connect(g); g.connect(out);
    o.start(t); o.stop(t + .09); o2.start(t); o2.stop(t + .09);
  } },
  microwave: { volume: .55, play(a, out, t) {
    for (let k = 0; k < 3; k++) { const s = t + k * .42, o = a.createOscillator(), g = envG(a, s, 1, .01, .2, .04);
      o.type = 'triangle'; o.frequency.value = 1950; o.connect(g).connect(out); o.start(s); o.stop(s + .3); }
  } },
  buzz: { volume: .92, play(a, out, t) { // phone vibrating on a table
    for (let k = 0; k < 2; k++) { const s = t + k * .75, o = a.createOscillator(), lp = a.createBiquadFilter(), am = a.createGain(), lfo = a.createOscillator(), lg = a.createGain(), g = envG(a, s, 1, .02, .4, .04);
      o.type = 'sawtooth'; o.frequency.value = 160; lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 2;
      am.gain.value = .55; lfo.type = 'square'; lfo.frequency.value = 31; lg.gain.value = .45; lfo.connect(lg).connect(am.gain);
      o.connect(lp).connect(am).connect(g).connect(out); o.start(s); o.stop(s + .5); lfo.start(s); lfo.stop(s + .5); }
  } },
  kettle: { volume: .24, play(a, out, t) {
    const d = 2.4, o = a.createOscillator(), vib = a.createOscillator(), vg = a.createGain(), g = envG(a, t, 1, .7, d - 1.05, .35);
    o.type = 'sine'; o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(2600, t + d * .75);
    vib.frequency.value = 6.5; vg.gain.value = 30; vib.connect(vg).connect(o.frequency);
    o.connect(g).connect(out); o.start(t); o.stop(t + d); vib.start(t); vib.stop(t + d);
    const h = a.createBufferSource(), hp = a.createBiquadFilter(), hg = envG(a, t, .3, .5, d - .9, .4);
    h.buffer = nbuf(a, d); hp.type = 'highpass'; hp.frequency.value = 2500; h.connect(hp).connect(hg).connect(out); h.start(t);
  } },
  doorbell: { volume: 1.18, play(a, out, t) {
    const bell = (f, s) => [[1, 1], [2.76, .3], [5.4, .14]].forEach(([m, v]) => { const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(.0001, s); g.gain.exponentialRampToValueAtTime(v, s + .006); g.gain.exponentialRampToValueAtTime(.0001, s + 1.7 / Math.sqrt(m)); o.connect(g).connect(out); o.start(s); o.stop(s + 1.8); });
    bell(659.25, t); bell(523.25, t + .6);
  } },
  fart: { volume: .61, play(a, out, t) { // whoopee cushion
    const d = .8, o = a.createOscillator(), lp = a.createBiquadFilter(), g = envG(a, t, 1, .03, d * .7 - .03, d * .3);
    const c = new Float32Array(40); for (let k = 0; k < 40; k++) c[k] = Math.max(40, 95 + 35 * Math.sin(k * 1.9) * (1 - k / 50) + 25 * (Math.random() - .5) - k * .8);
    o.type = 'sawtooth'; o.frequency.setValueCurveAtTime(c, t, d);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(1000, t); lp.frequency.exponentialRampToValueAtTime(260, t + d); lp.Q.value = 7;
    o.connect(lp).connect(g).connect(out); o.start(t); o.stop(t + d + .05);
  } },
  duck: { volume: 2.1, play(a, out, t) {
    [0, .3].forEach(w => { const s = t + w, o = a.createOscillator(), bp = a.createBiquadFilter(), pk = a.createBiquadFilter(), g = envG(a, s, 1, .02, .02, .17);
      o.type = 'sawtooth'; o.frequency.setValueAtTime(430, s); o.frequency.exponentialRampToValueAtTime(270, s + .19);
      bp.type = 'bandpass'; bp.frequency.setValueAtTime(1500, s); bp.frequency.exponentialRampToValueAtTime(950, s + .19); bp.Q.value = 2.5;
      pk.type = 'peaking'; pk.frequency.value = 2700; pk.gain.value = 9; pk.Q.value = 2;
      o.connect(bp).connect(pk).connect(g).connect(out); o.start(s); o.stop(s + .23); });
  } },
  creak: { volume: 10.5, play(a, out, t) { // door: stick-slip clicks through a moving resonance
    const d = 1.4, bp = a.createBiquadFilter(), click = nbuf(a, .004);
    bp.type = 'bandpass'; bp.Q.value = 10; bp.frequency.setValueAtTime(380, t); bp.frequency.linearRampToValueAtTime(900, t + d * .6); bp.frequency.linearRampToValueAtTime(520, t + d);
    bp.connect(out);
    for (let s = t; s < t + d; s += .009 + .02 * Math.abs(Math.sin((s - t) * 6)) + Math.random() * .006) { const src = a.createBufferSource(); src.buffer = click; src.connect(bp); src.start(s); }
  } },
  meow: { volume: 1.75, play(a, out, t) {
    const d = .75, o = a.createOscillator(), f1 = a.createBiquadFilter(), f2 = a.createBiquadFilter(), mix = a.createGain(), g = envG(a, t, 1, .08, d * .6 - .08, d * .4);
    o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(800, t + d * .35); o.frequency.linearRampToValueAtTime(470, t + d);
    f1.type = 'bandpass'; f1.Q.value = 5; f1.frequency.setValueAtTime(700, t); f1.frequency.linearRampToValueAtTime(1300, t + d * .4); f1.frequency.linearRampToValueAtTime(800, t + d);
    f2.type = 'bandpass'; f2.Q.value = 7; f2.frequency.setValueAtTime(2700, t); f2.frequency.linearRampToValueAtTime(1500, t + d);
    o.connect(f1).connect(mix); o.connect(f2).connect(mix); mix.connect(g).connect(out); o.start(t); o.stop(t + d + .05);
  } },
};
export const WeirdNoises = {
  timer: 0, coTimer: 0,
  play(k) { const eng = AudioEngine.get(), a = eng.ready(); if (!a) return; const g = a.createGain(); g.gain.value = NOISES[k].volume; g.connect(eng.master); NOISES[k].play(a, g, a.currentTime + .03); },
  surprise(k = rnd(Object.keys(NOISES))) {
    this.play(k); bus.emit('odd', { k });
    if (k === 'co') this.keepChirping(2 + Math.floor(Math.random() * 3));
  },
  // like the real thing: it chirps again about once a minute, quietly enough that you're not sure where it's coming from
  keepChirping(n) {
    clearTimeout(this.coTimer); if (n <= 0) return;
    this.coTimer = setTimeout(() => { if (pref('odd') && !document.hidden) this.play('co'); this.keepChirping(n - 1); }, 38000 + Math.random() * 20000);
  },
  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { if (pref('odd') && !document.hidden && AudioEngine.get().unlocked) this.surprise(); this.schedule(); }, (90 + Math.random() * 210) * 1000);
  },
};
