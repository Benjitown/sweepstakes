// Karaoke at the Red Lion (from the jukebox): sing along to Last Orders by hitting each note of the tune as it reaches
// the mic. You pay into the prize pot; sing well and it pays you back several times over. The machine needs a rest
// between singers.
export const KARAOKE = {
  TRACK: 'pub',      // the one everybody knows
  LOOPS: 2,          // twice through the tune
  FEE: .03,          // a go costs this share of your top table's max stake
  PAYS: [[.95, 3, 'Standing ovation!'], [.8, 2, 'Encore!'], [.6, 1, 'Not bad at all.'], [0, 0, 'Booed off.']], // a score of at least this pays this many times the fee
  GREAT: .08,        // seconds either side of a note for a great one
  GOOD: .16,         // and for a good one
  REST: 180,         // seconds of play before the machine's free again
  SPEED: 150,        // pixels a second the notes slide towards the mic
};
