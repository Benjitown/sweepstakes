// Quiz night (the numbers are in src/data/quiz-night.js): a round of questions from the pub quiz's bank, the score, and
// what it pays. Leave half-way and you keep what you've won so far.
import { QUIZ } from '../content/quiz.js';
import { bus } from '../core/bus.js';
import { S, SaveGame, baseCap } from '../core/state.js';
import { shuffle } from '../core/util.js';
import { NIGHT } from '../data/quiz-night.js';

export const QuizNight = {
  timer: 0, offer: null, round: null, // round: { qs: [{ q, options, right, answer }], k: question on, score, prize }
  schedule(first) {
    clearTimeout(this.timer);
    const [lo, hi] = NIGHT.EVERY;
    this.timer = setTimeout(() => { bus.emit('night:due'); this.schedule(); }, (first ?? lo + Math.random() * (hi - lo)) * 1000);
  },
  prize: () => Math.max(10, Math.round(baseCap() * NIGHT.PRIZE)),
  start() {
    if (this.round) return null;
    const qs = shuffle(QUIZ.map((_, k) => k)).slice(0, NIGHT.QUESTIONS).map(i => {
      const [q, answer, ...wrong] = QUIZ[i], options = shuffle([answer, ...wrong]);
      return { q, options, right: options.indexOf(answer), answer };
    });
    this.round = { qs, k: 0, score: 0, prize: this.prize() };
    bus.emit('night:start', this.round);
    return this.round;
  },
  current() { const r = this.round; return r ? r.qs[r.k] : null; },
  // your answer to the question on (-1: out of time)
  answer(choice) {
    const r = this.round; if (!r) return null;
    const q = r.qs[r.k], right = choice === q.right;
    if (right) r.score++;
    r.k++;
    bus.emit('night:answer', { q, choice, right, k: r.k, of: r.qs.length });
    if (r.k >= r.qs.length) this.finish();
    return right;
  },
  finish() {
    const r = this.round; if (!r) return null;
    this.round = null;
    const all = r.score === r.qs.length, pay = r.score * r.prize * (all ? NIGHT.FULL : 1);
    if (pay) S.coins += pay;
    const L = S.life.night = S.life.night || { played: 0, best: 0, full: 0 };
    L.played++; L.best = Math.max(L.best, r.score); if (all) L.full++;
    SaveGame.saveNow();
    const out = { score: r.score, of: r.qs.length, pay, all, prize: r.prize };
    bus.emit('night:done', out);
    return out;
  },
  // walk out: the questions you didn't get to count as wrong, and you keep what you'd won
  quit() { const r = this.round; if (!r) return null; while (this.round) this.answer(-1); return true; },
};
