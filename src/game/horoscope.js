// Nan's stars: pick your star sign once (it stays when you go bust), and every day Nan reads your horoscope out of the
// paper, with a lucky number. The first time a board uncovers today's lucky number its pot goes ×1.25 (game.js asks
// luckyToday()). Built from the date and your sign alone, so it's the same all day.
import { SIGNS, STARS_OPEN, STARS_MIDDLE, STARS_LUCKY } from '../content/horoscopes.js';
import { seeded, hashString } from '../core/random.js';
import { bus } from '../core/bus.js';
import { SaveGame, S } from '../core/state.js';
import { Daily } from './daily.js';

export const Stars = {
  BONUS: 1.25,
  AFTER: 45,  // seconds into a sitting before Nan gets the paper out
  secs: 0, asked: false,
  sign: () => (S.life.sign >= 0 && S.life.sign < 12 ? S.life.sign : -1),
  setSign(k) { if (!(k >= 0 && k < 12)) return false; S.life.sign = k; SaveGame.saveNow(); bus.emit('stars:sign', { sign: k }); return true; },
  // today's horoscope for a sign: { sign, text, lucky } (lucky is 2 to 6)
  read(key = Daily.key(), sign = this.sign()) {
    if (sign < 0) return null;
    const r = seeded(hashString(`sweepstakes-stars-${key}-${sign}`)), pick = a => a[Math.floor(r() * a.length)];
    const lucky = 2 + Math.floor(r() * 5);
    return { sign, name: SIGNS[sign], lucky, text: `${pick(STARS_OPEN)} ${pick(STARS_MIDDLE)} ${pick(STARS_LUCKY).replace('{n}', lucky)}` };
  },
  luckyToday() { const h = this.sign() >= 0 && S.life.starsRead === Daily.key() ? this.read() : null; return h ? h.lucky : 0; },
  // once a sitting, a little way in: Nan asks your sign (if she doesn't know it) or reads today's stars (if she hasn't)
  second() {
    if (++this.secs !== this.AFTER) return;
    if (this.sign() < 0) { if (!this.asked) { this.asked = true; bus.emit('stars:ask'); } }
    else if (S.life.starsRead !== Daily.key()) this.announce();
  },
  announce() {
    const h = this.read(); if (!h) return null;
    S.life.starsRead = Daily.key(); SaveGame.save();
    bus.emit('stars', h);
    return h;
  },
};
