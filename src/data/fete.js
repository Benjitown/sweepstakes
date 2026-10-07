// The church fete (src/game/fete.js): every so often it's on, and there's Splat the Rat. Three goes for a fee; pull the
// cord and the rat drops down the drainpipe, and you've a split second to splat it as it shoots out of the bottom.
export const FETE = {
  EVERY: [1200, 2400], // seconds between fetes
  FEE: .03,            // three goes: this share of your top table's max stake (at least 5)
  GOES: 3,
  DROP: [700, 2600],   // ms after you pull the cord before the rat shoots out
  WINDOW: 420,         // ms you've got to splat it
  PAYS: [0, 1, 3, 8],  // splats → the fee times this
};
