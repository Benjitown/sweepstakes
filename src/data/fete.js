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
// The tombola, at the same fete: tickets out of a drum, and the ones ending in 0 or 5 win a prize off the table. The
// prizes are what people didn't want for Christmas; what each is worth is the ticket price times x (w: how many on the
// table). It's for the church roof, so on average a ticket brings back about two thirds of its price.
export const TOMBOLA = {
  TICKET: .01,  // a ticket: this share of your top table's max stake (at least 2)
  TICKETS: 200, // numbered 1 to 200
  PRIZES: [
    { id: 'bath',    w: 30, x: 1 },  { id: 'sweets', w: 25, x: 2 }, { id: 'jigsaw', w: 20, x: 2 }, { id: 'sherry', w: 12, x: 4 },
    { id: 'choc',    w: 8,  x: 6 },  { id: 'envelope', w: 4, x: 15 }, { id: 'hamper', w: 1, x: 40 },
  ],
};
