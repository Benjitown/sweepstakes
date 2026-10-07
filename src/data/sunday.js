// Sunday dinner at Nan's: on a Sunday (by your device's clock), once a day and a little way into playing, Nan asks you
// round for your dinner (src/game/sunday.js). Go round and you're full of roast; can't make it and she plates some up.
export const SUNDAY = {
  AFTER: [90, 240], // seconds into a Sunday's play before she asks
  BOOST: .15,       // full of roast: +15% on the profit...
  BOARDS: 5,        // ...of this many winning cash-outs
  PLATE: 2,         // can't make it (or no answer): the plate she keeps warm for you is good for this many
  ANSWER: 150,      // seconds before the invitation goes quiet (and she plates some up anyway)
};
