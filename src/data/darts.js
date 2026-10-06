// Darts at the Red Lion: now and then Big Dave challenges you in the group chat. Three darts each, highest total wins,
// with some coins on it. Dave throws first; your aim wanders about (it's the pub), so you press Throw when it's where
// you want it. The board is a real one: sizes as a share of its radius (170mm to the outside of the double ring).
export const DARTS = {
  EVERY: [360, 720],   // seconds between challenges
  SHARE: .08,          // the stake: this share of your coins, nice and round, at most the top table's max stake
  MIN: 20,             // and at least this; you need ten times it before Dave asks
  ANSWER: 40,          // seconds to say yes before he finds someone else
  WOBBLE: .58,         // how far your aim wanders from the middle, as a share of the radius
  SCATTER: .035,       // where the dart actually lands, around where you threw it
  DAVE: .2,            // Dave aims at treble 20 and lands about this far off, give or take
};
export const DARTBOARD = {
  ORDER: [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5],  // clockwise from the top
  BULL: 6.35 / 170, OUTER: 15.9 / 170, TREBLE: [99 / 170, 107 / 170], DOUBLE: [162 / 170, 1],
};
