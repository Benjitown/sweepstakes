// Karaoke on screen: the tune's notes slide along a lane towards the mic, high notes higher, and you press Sing (or
// Space) as each one reaches it. The record plays under you with the tune as a guide; the jukebox waits until you're
// done. src/game/karaoke.js keeps the score.
import { $, $$, fmt, esc, ico } from '../core/util.js';
import { S } from '../core/state.js';
import { KARAOKE } from '../data/karaoke.js';
import { TRACK_BY } from '../data/jukebox.js';
import { RECORDS } from '../content/jukebox.js';
import { Music, musicMidi } from '../audio/music.js';
import { AudioEngine } from '../audio/engine.js';
import { Sound } from '../audio/sound.js';
import { Karaoke } from '../game/karaoke.js';
import { UI } from './ui.js';

const MIC_X = 54;
export const KaraokeView = {
  raf: 0, t0: 0, presses: [], keyFn: null, done: 0, audio: null,
  // the song's clock, in seconds: the audio clock when there's sound (so the notes match the record), else the page's
  clock() { return this.audio ? this.audio.currentTime : performance.now() / 1000; },
  open() {
    if (Karaoke.live) return;
    const wait = Karaoke.wait(), fee = Karaoke.fee();
    if (wait > 0) return UI.toast(`The karaoke machine needs a rest. Free again in ${Math.ceil(wait / 60)} min.`);
    if (S.coins < fee) return UI.toast(`It’s ${fmt(fee)} to get up and sing.`);
    const k = Karaoke.start(); if (!k) return;
    const r = RECORDS[KARAOKE.TRACK], lo = Math.min(...k.notes.map(n => musicMidi(n.note))), hi = Math.max(...k.notes.map(n => musicMidi(n.note)));
    UI.modal(`<div class="karaoke"><h3>Karaoke</h3><p class="ksong">${esc(r.name)}, by ${esc(r.by)}</p>
      <div class="klane" id="kLane"><i class="kmic">${ico('juke')}</i>${k.notes.map((n, i) => `<b class="kn" data-n="${i}" style="--y:${(1 - (musicMidi(n.note) - lo) / Math.max(1, hi - lo)) * 70 + 10}%"></b>`).join('')}</div>
      <p class="kmsg" id="kMsg" aria-live="polite">Get ready…</p>
      <div class="row"><button class="btn gold big" type="button" id="kSing">Sing!</button><button class="btn ghost" type="button" id="kQuit">Leave the stage</button></div>
      <p class="hint">Press Sing (or Space) as each note reaches the mic.</p></div>`, {}, true);
    this.presses = []; this.done = 0;
    $('#kSing').onpointerdown = e => { e.preventDefault(); this.press(); };
    $('#kSing').onclick = e => { if (e.detail === 0) this.press(); }; // the keyboard's Enter on the button
    $('#kQuit').onclick = () => this.end();
    this.keyFn = e => { if (e.key === ' ' && Karaoke.live) { e.preventDefault(); if (!e.repeat) this.press(); } };
    document.addEventListener('keydown', this.keyFn);
    Music.hold('karaoke', true); // the jukebox waits
    const e = AudioEngine.get(); this.audio = !S.muted && e.unlocked ? e.ready() : null;
    this.t0 = this.clock() + .6;
    if (this.audio) this.backing(this.audio, this.t0);
    this.loop();
  },
  // the record under you: a bar of clicks to count you in, then the song (with the tune on it as a guide)
  backing(a, t0) {
    const T = TRACK_BY[KARAOKE.TRACK], bar = T.beats * 60 / T.bpm, out = a.createGain(); out.gain.value = Music.volume() || .3; out.connect(AudioEngine.get().master);
    this.out = out;
    for (let b = 0; b < T.beats; b++) AudioEngine.get().tone(b ? 880 : 1320, .05, 'square', .12, t0 - a.currentTime + b * 60 / T.bpm);
    for (let i = 0; i < KARAOKE.LOOPS * T.bars.length; i++) Music.bar(a, out, T, i % T.bars.length, 1 + Math.floor(i / T.bars.length), t0 + bar * (1 + i));
  },
  loop() {
    cancelAnimationFrame(this.raf);
    const lane = $('#kLane'); if (!lane || !Karaoke.live) return;
    const now = this.clock() - this.t0, notes = Karaoke.live.notes, T = TRACK_BY[KARAOKE.TRACK];
    $$('.kn', lane).forEach(el => {
      const n = notes[+el.dataset.n], x = MIC_X + (n.t - now) * KARAOKE.SPEED;
      el.style.transform = `translateX(${x.toFixed(1)}px)`;
      if (!el.className.includes(' ') && now > n.t + KARAOKE.GOOD) el.classList.add('miss');
    });
    const msg = $('#kMsg');
    if (msg && now < 60 / T.bpm * T.beats) msg.textContent = ['Four…', 'Three…', 'Two…', 'One…'][Math.max(0, Math.min(3, Math.floor(now / (60 / T.bpm))))];
    else if (msg && msg.textContent.endsWith('…')) msg.textContent = 'Sing!';
    if (now > Karaoke.length() + .4) return this.end();
    this.raf = requestAnimationFrame(() => this.loop());
  },
  // a press of Sing: it counts for the nearest waiting note (Karaoke.judge does the sums at the end)
  press() {
    if (!Karaoke.live) return;
    const now = this.clock() - this.t0, notes = Karaoke.live.notes; this.presses.push(now);
    let best = -1; notes.forEach((n, i) => { const el = $(`#kLane .kn[data-n="${i}"]`); if (el && !el.className.includes(' ') && Math.abs(n.t - now) <= KARAOKE.GOOD && (best < 0 || Math.abs(n.t - now) < Math.abs(notes[best].t - now))) best = i; });
    const el = best >= 0 && $(`#kLane .kn[data-n="${best}"]`), lane = $('#kLane');
    if (el) el.classList.add(Math.abs(notes[best].t - now) <= KARAOKE.GREAT ? 'great' : 'good');
    else if (lane) { lane.classList.remove('bum'); void lane.offsetWidth; lane.classList.add('bum'); }
  },
  // the end of the song (or you walked off): the verdict, and the jukebox picks up again
  end() {
    if (!Karaoke.live) return;
    cancelAnimationFrame(this.raf);
    if (this.keyFn) { document.removeEventListener('keydown', this.keyFn); this.keyFn = null; }
    if (this.out && this.audio) { const t = this.audio.currentTime, out = this.out; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + .4); setTimeout(() => { try { out.disconnect(); } catch (err) {} }, 900); }
    this.out = null;
    const r = Karaoke.finish(this.presses);
    Music.hold('karaoke', false);
    const msg = $('#kMsg'); if (msg) msg.textContent = `${r.verdict} ${Math.round(r.score * 100)}%: ${r.great} great, ${r.good} good, ${r.miss} missed${r.bum ? `, ${r.bum} bum note${r.bum > 1 ? 's' : ''}` : ''}.${r.pay ? ` +${fmt(r.pay)}` : ''}`;
    const sing = $('#kSing'); if (sing) sing.disabled = true;
    const q = $('#kQuit'); if (q) { q.textContent = 'Back to the table'; q.onclick = () => UI.closeModal(); }
    UI.modalLocked = false;
  },
};
