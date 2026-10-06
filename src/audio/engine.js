// One shared Web Audio context (unlocked by the first tap) with tone and noise primitives.
import { S } from '../core/state.js';

/* =====================================================================================
   Singleton · https://refactoring.guru/design-patterns/singleton
   ===================================================================================== */
export class AudioEngine {
  static get() { return AudioEngine.instance || (AudioEngine.instance = new AudioEngine()); }
  constructor() { this.ctx = null; this.master = null; this.unlocked = false; }
  unlock() { this.unlocked = true; this.ready(); }
  ready() {
    if (S.muted || !this.unlocked) return null;
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = .22; this.master.connect(this.ctx.destination); }
      catch (e) { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }
  tone(f, dur = .12, type = 'triangle', vol = .5, when = 0, to = null) {
    const a = this.ready(); if (!a) return;
    const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + .03);
  }
  noise(dur = .4, vol = .5, f = 900, when = 0, type = 'lowpass') {
    const a = this.ready(); if (!a) return;
    const t = a.currentTime + when, len = Math.max(1, Math.floor(a.sampleRate * dur)), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; fl.type = type; fl.frequency.setValueAtTime(f, t); if (type === 'lowpass') fl.frequency.exponentialRampToValueAtTime(80, t + dur);
    g.gain.value = vol; src.connect(fl).connect(g).connect(this.master); src.start(t);
  }
}
['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => AudioEngine.get().unlock(), { capture: true, passive: true }));
