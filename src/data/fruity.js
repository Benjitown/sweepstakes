// The Fruity, the fruit machine in the Flip Booth: its three reels, what a line pays, the stakes, and how often it
// offers holds and nudges. node tools/sim/fruity.mjs works out what it all pays back.
export const FRUITY_SYMBOLS = {
  C: { id: 'cherry', one: 'Cherry', many: 'Cherries' }, L: { id: 'lemon', one: 'Lemon', many: 'Lemons' }, O: { id: 'orange', one: 'Orange', many: 'Oranges' },
  P: { id: 'plum', one: 'Plum', many: 'Plums' }, B: { id: 'bell', one: 'Bell', many: 'Bells' }, R: { id: 'bar', one: 'Gold bar', many: 'Gold bars' },
  7: { id: 'lucky7', one: 'Seven', many: 'Sevens' },
};
// each reel's band, top to bottom (it wraps round); one letter a stop, as in FRUITY_SYMBOLS
export const FRUITY_REELS = [
  'LOCBLOPRLO7CLOBPLORC',
  'OLBCOLRPOLC7OLPBOLCR',
  'LOPLBCLORLP7LOBLPCLO',
];
// three of a kind on the line pays × the stake; two cherries from the left pay FRUITY_CHERRIES whatever the third reel says.
// On the plain reels: lemons 1 in 46, oranges 1 in 80, cherries 1 in 444 (two cherries 1 in 49), plums 1 in 667,
// bells 1 in 1000, gold bars 1 in 2000, sevens 1 in 8000. That's 40% back; the holds and nudges bring it up to about 88%
// (a casual player) or 93% (someone who knows the reel bands by heart).
export const FRUITY_PAYS = { 7: 250, R: 50, B: 25, P: 16, C: 12, O: 8, L: 6 };
export const FRUITY_CHERRIES = 2;
// a go costs this share of the top table's max stake
export const FRUITY_STAKES = [
  { id: 'small', name: 'Small change', share: .01 },
  { id: 'proper', name: 'Proper go', share: .05 },
  { id: 'big', name: 'Big spender', share: .25 },
];
// after a go that doesn't win, the machine sometimes gives you nudges (each moves one reel down a stop; they stop at the
// first win) or holds (keep up to two reels where they are for the next go; never twice running)
export const FRUITY_FEATURES = { nudge: .2, nudges: [1, 1, 1, 2], hold: .3, maxHolds: 2, gambles: 3 };
