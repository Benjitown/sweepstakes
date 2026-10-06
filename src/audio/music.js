// The jukebox's music: a small sequencer that plays the tracks in src/data/jukebox.js on the Web Audio clock, a bar
// at a time, through its own volume (the Music slider) and on into the master volume. It goes quiet while you're
// muted, outside or the tab's hidden, and when the power goes the record winds down.
import { S, pref } from '../core/state.js';
import { bus } from '../core/bus.js';
import { AudioEngine } from './engine.js';
import { MUSIC, TRACKS, TRACK_BY } from '../data/jukebox.js';

const MUSIC_PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const musicMidi = s => { const m = /^([A-G])(#|b)?(\d)$/.exec(s); return m ? 12 * (+m[3] + 1) + MUSIC_PITCH[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) : 0; };
const musicHz = s => 440 * 2 ** ((musicMidi(s) - 69) / 12);
// when step s of a bar of track T starts, in seconds from the start of the bar (swing pushes the off-beats late)
export const stepAt = (T, s) => { const beat = 60 / T.bpm; return Math.floor(s / T.sub) * beat + (T.sub === 2 && s % 2 ? T.swing * beat : (s % T.sub) * beat / T.sub); };
const musicNoise = new WeakMap(); // a second of white noise per audio context, shared by every drum hit

// a gain that swells to v in atk seconds, then dies away to nothing by `end`
function mEnv(a, t, v, atk, end) {
  const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, v), t + atk);
  g.gain.exponentialRampToValueAtTime(.0001, Math.max(t + atk + .01, end)); return g;
}
// a held note: swells, holds until `off`, then lets go over rel seconds
function mHold(a, t, v, atk, off, rel) {
  const g = a.createGain(), o = Math.max(t + atk, off); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, v), t + atk);
  g.gain.setValueAtTime(Math.max(.0002, v), o); g.gain.exponentialRampToValueAtTime(.0001, o + rel); return g;
}
function mOsc(a, type, f, t, end, out, gain = 1) {
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (gain === 1) o.connect(out); else { const g = a.createGain(); g.gain.value = gain; o.connect(g).connect(out); }
  o.start(t); o.stop(end + .05); Music.live.push([o, end]); return o;
}
function mFilter(a, type, f, out, q = .7) { const n = a.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; n.connect(out); return n; }
function mNoise(a, t, end, out) {
  let b = musicNoise.get(a);
  if (!b) { b = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; musicNoise.set(a, b); }
  const s = a.createBufferSource(); s.buffer = b; s.connect(out); s.start(t, Math.random() * .5); s.stop(end + .02);
}

// the instruments: each plays a note of frequency f at time t, about len seconds long, at volume v
const VOICES = {
  epiano(a, out, f, t, len, v) { // a soft electric piano: a round tone with a bright tine on the front
    const end = t + len + .5, g = mEnv(a, t, v, .006, end); g.connect(out); mOsc(a, 'sine', f, t, end, g);
    const h = mEnv(a, t, v * .35, .004, t + .3); h.connect(out); mOsc(a, 'sine', f * 2, t, t + .3, h);
  },
  vibes(a, out, f, t, len, v) { // a vibraphone: a long ring, with a little metal on the strike
    const end = t + Math.max(1.3, len + .9), g = mEnv(a, t, v, .004, end); g.connect(out); mOsc(a, 'sine', f, t, end, g);
    const h = mEnv(a, t, v * .22, .002, t + .25); h.connect(out); mOsc(a, 'sine', f * 4, t, t + .25, h);
  },
  piano(a, out, f, t, len, v) { // the Red Lion's old upright, a little out of tune
    const end = t + Math.min(1.7, len + .9), lp = mFilter(a, 'lowpass', 3200, out), g = mEnv(a, t, v, .004, end); g.connect(lp);
    mOsc(a, 'triangle', f * 1.003, t, end, g); mOsc(a, 'triangle', f * .997, t, end, g);
    const h = mEnv(a, t, v * .3, .003, t + .4); h.connect(lp); mOsc(a, 'sine', f * 2, t, t + .4, h);
  },
  organ(a, out, f, t, len, v) { // a soft reed organ for the oom-pah-pah
    const lp = mFilter(a, 'lowpass', 1900, out), g = mHold(a, t, v, .05, t + len, .22); g.connect(lp);
    mOsc(a, 'triangle', f, t, t + len + .25, g); mOsc(a, 'sine', f * 2, t, t + len + .25, g, .35);
  },
  musicbox(a, out, f, t, len, v) { // a music box: plucked, sweet and ringing
    const end = t + Math.max(1.2, len + .6), g = mEnv(a, t, v, .003, end); g.connect(out); mOsc(a, 'sine', f, t, end, g);
    const h = mEnv(a, t, v * .18, .002, t + .5); h.connect(out); mOsc(a, 'sine', f * 3, t, t + .5, h);
  },
  square(a, out, f, t, len, v) { // the eight-bit lead
    const lp = mFilter(a, 'lowpass', 2600, out), g = mHold(a, t, v, .005, t + len * .85, .05); g.connect(lp); mOsc(a, 'square', f, t, t + len, g);
  },
  arp(a, out, f, t, len, v) { const g = mEnv(a, t, v, .003, t + .09); g.connect(out); mOsc(a, 'square', f, t, t + .1, g); },
  tri(a, out, f, t, len, v) { const g = mHold(a, t, v, .004, t + len * .8, .03); g.connect(out); mOsc(a, 'triangle', f, t, t + len, g); },
  upright(a, out, f, t, len, v) { // a double bass, plucked
    const end = t + len + .12, lp = mFilter(a, 'lowpass', 900, out), g = mEnv(a, t, v, .008, end); g.connect(lp);
    mOsc(a, 'sine', f, t, end, g); mOsc(a, 'triangle', f, t, end, g, .5);
  },
  theremin(a, out, f, t, len, v) { // a theremin: a sine that swoops in and wobbles
    const g = mHold(a, t, v, .08, t + len, .25); g.connect(out);
    const o = mOsc(a, 'sine', f * .97, t, t + len + .25, g); o.frequency.exponentialRampToValueAtTime(f, t + .09);
    const lfo = a.createOscillator(), depth = a.createGain(); lfo.frequency.value = 5.5; depth.gain.value = f * .012;
    lfo.connect(depth).connect(o.frequency); lfo.start(t); lfo.stop(t + len + .3);
  },
  soft(a, out, f, t, len, v) { const end = t + 1, g = mEnv(a, t, v, .02, end); g.connect(out); mOsc(a, 'sine', f, t, end, g); mOsc(a, 'sine', f * 2, t, end, g, .25); },
};
const DRUMS = {
  kick(a, out, t, v) {
    const g = mEnv(a, t, .3 * v, .003, t + .2); g.connect(out);
    mOsc(a, 'sine', 120, t, t + .2, g).frequency.exponentialRampToValueAtTime(48, t + .12);
  },
  brush(a, out, t, v) { mHit(a, t, .06 * v, .02, .22, mFilter(a, 'bandpass', 2400, out, .8)); },
  ride(a, out, t, v) { mHit(a, t, .035 * v, .001, .28, mFilter(a, 'bandpass', 7500, out, 1.5)); },
  tamb(a, out, t, v) { const bp = mFilter(a, 'bandpass', 8500, out, 2); mHit(a, t, .05 * v, .001, .07, bp); mHit(a, t + .035, .04 * v, .001, .07, bp); },
  snare(a, out, t, v) {
    mHit(a, t, .08 * v, .001, .13, mFilter(a, 'highpass', 1200, out));
    const g = mEnv(a, t, .06 * v, .002, t + .08); g.connect(out); mOsc(a, 'triangle', 190, t, t + .08, g);
  },
  hat(a, out, t, v) { mHit(a, t, .03 * v, .001, .035, mFilter(a, 'highpass', 8000, out)); },
};
// a burst of noise through an envelope into `into` (a filter)
function mHit(a, t, v, atk, len, into) { const g = mEnv(a, t, v, atk, t + len); g.connect(into); mNoise(a, t, t + len, g); }
// how loud each part of each track sits
const MIX = {
  lounge: { keys: .055, lead: .1, low: .2, drums: 1 },
  pub: { keys: .05, lead: .085, low: .12, drums: 1 },
  chip: { arp: .016, lead: .036, low: .12, drums: .8 },
  haunted: { keys: .06, lead: .11, low: .2, drums: 1 },
  xmas: { keys: .05, lead: .14, low: .22, drums: 1 },
  bonfire: { keys: .05, lead: .085, low: .2, drums: 1 },
  waltz: { keys: .065, lead: .15, low: .26, drums: 1 },
};

export const Music = {
  available: () => TRACKS, // the records on the jukebox right now (wiring.js adds the seasonal one in its season)
  holds: new Set(), ducked: false, ctx: null, out: null, lp: null, timer: 0, at: 0, k: 0, loop: 0, id: '', notes: 0, live: [], heard: false,
  // should a record be playing? (your Music switch, the mute button, and nothing holding it: outside, a power cut, the tests)
  want() { const e = AudioEngine.get(); return pref('music') && !S.muted && e.unlocked && !document.hidden && !this.holds.size; },
  hold(why, on) { if (on) { if (why === 'power' && this.timer) this.windDown(); this.holds.add(why); } else this.holds.delete(why); this.sync(); },
  sync() { if (!this.want()) { if (this.timer) this.stop(); return; } if (!this.timer) this.start(); },
  // the record that's on: yours, or shuffle's pick (never the same one twice running)
  pick(prev = this.id) {
    const on = this.available(), t = S.track || 'lounge'; if (t !== 'shuffle') return on.some(x => x.id === t) ? t : 'lounge';
    const ids = on.map(x => x.id).filter(x => x !== prev); return ids[Math.floor(Math.random() * ids.length)];
  },
  volume: () => MUSIC.LEVEL * (typeof S.musicVol === 'number' ? Math.max(0, Math.min(1, S.musicVol)) : MUSIC.VOL),
  applyVolume() { if (this.out) this.out.gain.setTargetAtTime(this.volume() * (this.ducked ? .25 : 1), this.ctx.currentTime, .05); },
  // something to hear over the record (Nan calling the bingo): turn it down for a moment, then back up
  duck(on) { if (this.ducked === !!on) return; this.ducked = !!on; if (this.out) this.out.gain.setTargetAtTime(this.volume() * (on ? .25 : 1), this.ctx.currentTime, .08); },
  start() {
    const e = AudioEngine.get(), a = e.ready(); if (!a || !e.master) return;
    this.ctx = a; this.out = a.createGain(); this.out.gain.value = this.volume() * (this.ducked ? .25 : 1);
    this.lp = mFilter(a, 'lowpass', 18000, e.master); this.out.connect(this.lp);
    this.id = this.pick(); this.k = 0; this.loop = 0; this.at = a.currentTime + .08;
    clearInterval(this.timer); this.timer = setInterval(() => this.pump(), 150); this.pump();
    bus.emit('music', { id: this.id, on: true, first: !this.heard }); this.heard = true;
  },
  stop(fade = .35) {
    clearInterval(this.timer); this.timer = 0;
    const a = this.ctx, out = this.out, lp = this.lp; this.out = null; this.live = [];
    if (a && out) {
      const t = a.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + fade);
      setTimeout(() => { try { out.disconnect(); lp.disconnect(); } catch (err) {} }, fade * 1000 + 2500);
    }
    bus.emit('music', { id: this.id, on: false });
  },
  // the power's gone: every note that's still sounding sags an octave and the record grinds to a halt
  windDown() {
    const a = this.ctx; if (!a || !this.out) return;
    const t = a.currentTime;
    this.live.forEach(([o, end]) => { if (end > t) { try { o.detune.cancelScheduledValues(t); o.detune.setValueAtTime(0, t); o.detune.linearRampToValueAtTime(-1200, t + 1.1); } catch (err) {} } });
    this.lp.frequency.setValueAtTime(18000, t); this.lp.frequency.exponentialRampToValueAtTime(300, t + 1.1);
    this.stop(1.2);
  },
  // a record scratch (a big board going up, going bust): the needle skids across the record and the music ducks
  scratch() {
    const a = this.ctx, out = this.out, e = AudioEngine.get(); if (!a || !out || !this.timer || !e.master) return false;
    const t = a.currentTime, v = this.volume(), bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3; bp.connect(e.master);
    bp.frequency.setValueAtTime(350, t); bp.frequency.exponentialRampToValueAtTime(2600, t + .12); bp.frequency.exponentialRampToValueAtTime(450, t + .32);
    const g = mEnv(a, t, .55, .01, t + .34); g.connect(bp); mNoise(a, t, t + .36, g);
    out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(v * .12, t + .06);
    out.gain.setValueAtTime(v * .12, t + .5); out.gain.linearRampToValueAtTime(v, t + 2.2);
    return true;
  },
  // put a record on (or 'shuffle')
  play(id) { S.track = id; if (this.timer) this.stop(.25); this.sync(); },
  // keep a little of the track queued ahead of the clock
  pump() {
    const a = this.ctx; if (!a || !this.out) return;
    if (!this.want()) return this.stop();
    const now = a.currentTime; this.live = this.live.filter(([, end]) => end > now);
    if (this.at < now) this.at = now + .05; // the tab was asleep: pick up from here, don't cram in the bars we missed
    while (this.at < now + MUSIC.AHEAD) {
      const T = TRACK_BY[this.id];
      this.at += this.bar(a, this.out, T, this.k, this.loop, this.at);
      if (++this.k >= T.bars.length) {
        this.k = 0; this.loop++;
        if (S.track === 'shuffle' && this.loop >= MUSIC.SHUFFLE_LOOPS) { this.id = this.pick(); this.loop = 0; bus.emit('music', { id: this.id, on: true }); }
      }
    }
  },
  // one bar of track T (bar k, time round `loop`) from time t0 into out; returns how long the bar lasts
  bar(a, out, T, k, loop, t0) {
    const beat = 60 / T.bpm, step = beat / T.sub, n = T.beats * T.sub, [ch, low, tune] = T.bars[k], mix = MIX[T.id];
    const at = s => t0 + stepAt(T, s);
    const chordAt = s => (Array.isArray(ch) ? ch[s < n / 2 ? 0 : 1] : ch).split(' ');
    const play = (voice, note, s, len, v) => { VOICES[voice](a, out, musicHz(note), at(s), len * step, v); this.notes++; };
    T.comp.forEach(([s, len, v]) => chordAt(s).forEach(note => play(T.keys, note, s, len, mix.keys * v)));
    if (T.arp) for (let s = 0; s < n; s++) { const c = chordAt(s), i = [0, 1, 2, 1][s % 4] % c.length; play('arp', c[i].replace(/\d$/, d => +d + 1), s, 1, mix.arp * (s % 4 ? 1 : 1.4)); }
    const lows = low.split(' '), each = n / lows.length;
    lows.forEach((note, i) => { if (note !== '_') play(T.low, note, i * each, each, mix.low); });
    const from = T.leadFrom || 0, every = T.leadEvery || 1;
    if (loop >= from && (loop - from) % every === 0) tune.forEach(([s, note, len]) => play(T.lead, note, s, len, mix.lead));
    for (const [name, [pat, v]] of Object.entries(T.drums)) for (let s = 0; s < n; s++) if (pat[s] === 'x') { DRUMS[name](a, out, at(s), v * mix.drums); this.notes++; }
    return T.beats * beat;
  },
};
// the first tap anywhere unlocks the audio (engine.js), and then the record can start; it stops while the tab's hidden
['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => { if (!Music.timer) setTimeout(() => Music.sync(), 0); }, { capture: true, passive: true }));
document.addEventListener('visibilitychange', () => Music.sync());
