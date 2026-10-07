// Conkers with Priya (src/game/conkers.js): in conker season she challenges you in the group chat, with some coins on
// it. Her conker's been soaked in vinegar and baked ("preparation", she says). You take turns to strike; the first
// conker to crack loses. The swing meter decides how hard you hit.
export const CONKERS = {
  EVERY: [600, 1200],    // seconds between challenges
  MONTHS: [9, 10, 11],   // conker season: September to November, by your clock
  SHARE: .08,            // the stake: this share of your coins, nice and round, at most the top table's max stake
  MIN: 20,               // and at least this; you need ten times it before she asks
  ANSWER: 40,            // seconds to say yes
  MINE: 5,               // knocks your conker can take
  HERS: 6,               // and hers (the vinegar)
  SWEEP: .8,             // the swing meter: there and back this many times a second
  SMASH: .08, HIT: .24,  // how close to the middle of the meter (0 to 1; the middle's .5) for a smash (two knocks) or a hit (one)
  STRINGS: .3,           // a miss tangles the strings this often: shout "Strings!" and you go again
  HER: [.3, .5, .2],     // her strike: no knocks, one, two
};
