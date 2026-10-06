// The pub quiz: now and then a friend asks the chat a question. Get it right inside 25 seconds for a few coins.
import { QUIZ } from '../content/quiz.js';
import { bus } from '../core/bus.js';
import { SaveGame, S, baseCap } from '../core/state.js';
import { shuffle } from '../core/util.js';

export const Quiz = {
  SECONDS: 25,
  live: null, // the open question: { i, q, options, right, prize, timer }
  bag: [], timer: 0,
  prize: () => Math.max(10, Math.round(baseCap() * .08)),
  // asks question i (or the next one from a shuffled bag, so nothing repeats until they've all been asked)
  ask(i) {
    if (this.live) return null;
    if (i == null) { if (!this.bag.length) this.bag = shuffle(QUIZ.map((_, k) => k)); i = this.bag.pop(); }
    const [q, right, ...wrong] = QUIZ[i], options = shuffle([right, ...wrong]);
    this.live = { i, q, options, right: options.indexOf(right), answer: right, prize: this.prize() };
    this.live.timer = setTimeout(() => this.timeUp(), this.SECONDS * 1000);
    bus.emit('quiz:ask', this.live);
    return this.live;
  },
  answer(k) {
    const L = this.live; if (!L) return null;
    clearTimeout(L.timer); this.live = null;
    const right = k === L.right, life = S.life.quiz = S.life.quiz || { right: 0, asked: 0 };
    life.asked++; if (right) { life.right++; S.coins += L.prize; }
    SaveGame.saveNow();
    bus.emit('quiz:answer', { ...L, k, correct: right });
    return right;
  },
  timeUp() {
    const L = this.live; if (!L) return;
    this.live = null; S.life.quiz = S.life.quiz || { right: 0, asked: 0 }; S.life.quiz.asked++; SaveGame.save();
    bus.emit('quiz:timeout', L);
  },
  // every 4 to 8 minutes, the quiz asks whether now's a good time (wiring.js decides)
  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { bus.emit('quiz:due'); this.schedule(); }, (240 + Math.random() * 240) * 1000);
  },
};
