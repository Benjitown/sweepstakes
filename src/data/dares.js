// Dares from the group chat: now and then a friend bets you can't do something before the clock runs out. Take it on
// and your stake goes in the pot; do it in time and you get double back. Nan never bets against you.
export const DARES = [
  { id: 'x3',    task: 'cash out a board at ×3 or more',                     secs: 180 },
  { id: 'clean', task: 'clear a whole board without a single flag on it',    secs: 240 },
  { id: 'three', task: 'win three boards in a row',                          secs: 240 },
  { id: 'gem',   task: 'dig up a gem',                                       secs: 150 },
  { id: 'quick', task: 'cash out a board in profit within 15 seconds of your first dig', secs: 150 },
];
export const DARE_BY = Object.fromEntries(DARES.map(d => [d.id, d]));
export const DARE = {
  EVERY: [240, 480], // seconds between dares
  SHARE: .1,         // the stake: a tenth of your coins (nice and round, no more than the top table's max stake)
  MIN: 20,           // and at least this; you need ten times it before anyone dares you
  ANSWER: 40,        // seconds to take it on before they go off the idea
  WHO: ['dave', 'tash', 'kev', 'priya'],
};
