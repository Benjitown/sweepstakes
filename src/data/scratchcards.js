// Scratchcards from the corner shop: the cards on the shelf, and what three of a kind pays.

// each card costs a share of your top table's max stake (at least 5 coins)
export const SCRATCH_CARDS = [
  { id: 'dip',     name: 'Lucky Dip',     share: .02, col: '#3fc18a', blurb: 'Cheap thrills.' },
  { id: 'bonanza', name: 'Cash Bonanza',  share: .1,  col: '#009dff', blurb: 'The one the newsagent recommends.' },
  { id: 'golden',  name: 'Golden Ticket', share: .5,  col: '#ffd23f', blurb: 'Nan says these are a waste of money.' },
];
// Three of a symbol wins it (× the card's price); p is how many cards out of 1 win that way, before luck.
// Returns about 94% of what you spend on average. The duck is the jackpot, obviously.
export const SCRATCH_PRIZES = [
  { sym: 'coin',   x: 1,   p: .16,   name: 'coins' },
  { sym: 'clover', x: 2,   p: .1,    name: 'clovers' },
  { sym: 'seven',  x: 5,   p: .04,   name: 'sevens' },
  { sym: 'gem',    x: 20,  p: .008,  name: 'gems' },
  { sym: 'crown',  x: 100, p: .0012, name: 'crowns' },
  { sym: 'duck',   x: 500, p: .0002, name: 'ducks' },
];
