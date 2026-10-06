// The Sweepstake: the paper's lottery. Five numbers from 1 to 30; buy lines for the next draw in the paper, and the
// next paper prints the numbers and pays out. Like any lottery it's a bad bet: about half of what goes in comes back.
export const DRAW = {
  BALLS: 30, PICK: 5,
  PAYS: { 3: 12, 4: 200, 5: 10000 }, // times the price of a line, for matching that many
  PRICE: .01,                         // a line costs this share of your top table's max stake
  LINES: 5,                           // the most lines in one draw
};
