// Karaoke (the numbers are in src/data/karaoke.js): the notes of the tune, timed to the record, and how you sang them.
// Each press of Sing counts for the nearest note that's still waiting (great close in, good a bit off); a press with
// no note near it is a bum note.
import { nice } from '../core/util.js';
import { bus } from '../core/bus.js';
import { S, SaveGame, baseCap } from '../core/state.js';
import { KARAOKE } from '../data/karaoke.js';
import { TRACK_BY } from '../data/jukebox.js';
import { stepAt } from '../audio/music.js';
import { Game } from './game.js';

export const Karaoke = {
  live: null,
  fee: () => nice(Math.max(10, baseCap() * KARAOKE.FEE)),
  wait: () => Math.max(0, (S.karaokeAt || 0) - S.run.time),
  // every note to sing, in seconds from the start: a bar to count you in, then the tune, twice
  notes() {
    const T = TRACK_BY[KARAOKE.TRACK], bar = T.beats * 60 / T.bpm, out = [];
    for (let loop = 0; loop < KARAOKE.LOOPS; loop++) T.bars.forEach(([, , tune], k) => tune.forEach(([s, note]) => out.push({ t: bar * (1 + loop * T.bars.length + k) + stepAt(T, s), note })));
    return out;
  },
  length() { const T = TRACK_BY[KARAOKE.TRACK]; return T.beats * 60 / T.bpm * (1 + KARAOKE.LOOPS * T.bars.length); },
  // the score for a set of presses (seconds from the start): great + 0.6 × good, less a quarter for every bum note, out of the notes
  judge(notes, presses) {
    const st = notes.map(() => ''), r = { great: 0, good: 0, miss: 0, bum: 0 };
    presses.slice().sort((a, b) => a - b).forEach(p => {
      let best = -1; notes.forEach((n, i) => { if (!st[i] && Math.abs(n.t - p) <= KARAOKE.GOOD && (best < 0 || Math.abs(n.t - p) < Math.abs(notes[best].t - p))) best = i; });
      if (best < 0) { r.bum++; return; }
      st[best] = Math.abs(notes[best].t - p) <= KARAOKE.GREAT ? 'great' : 'good'; r[st[best]]++;
    });
    r.miss = st.filter(x => !x).length;
    r.score = Math.max(0, Math.min(1, (r.great + .6 * r.good - .25 * r.bum) / notes.length));
    return r;
  },
  // up you go: the fee goes in the pot, and the machine needs a rest after
  start() {
    const fee = this.fee(); if (this.live || this.wait() > 0 || S.coins < fee) return null;
    Game.setCoins(S.coins - fee); S.karaokeAt = S.run.time + KARAOKE.REST;
    this.live = { fee, notes: this.notes() }; SaveGame.saveNow(); bus.emit('karaoke:on', this.live);
    return this.live;
  },
  // the song's over (or you left the stage): how it went, and the pot
  finish(presses) {
    const k = this.live; if (!k) return null;
    const r = this.judge(k.notes, presses), [, x, verdict] = KARAOKE.PAYS.find(([min]) => r.score >= min);
    r.pay = k.fee * x; r.x = x; r.verdict = verdict; r.fee = k.fee;
    if (r.pay) Game.setCoins(S.coins + r.pay, true);
    const L = S.life.karaoke = S.life.karaoke || { sung: 0, best: 0, ovations: 0 };
    L.sung++; L.best = Math.max(L.best, Math.round(r.score * 100)); if (x >= 3) L.ovations++;
    this.live = null; SaveGame.saveNow(); bus.emit('karaoke:done', r);
    return r;
  },
};
