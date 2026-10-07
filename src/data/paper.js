// The Daily Sweep: the local paper, written from your run. It comes through the letterbox every twenty minutes of
// play, and when you go bust there's a special edition. Each story the newsroom notes has a weight: the heaviest
// (and freshest) makes the front page.
export const PAPER = {
  FIRST: 600,     // seconds of play before the first paper of a run
  EVERY: 1200,    // and between papers after that
  KEEP: 30,       // stories kept per run
  PUZZLE: .04,    // Spot the Mine pays this share of your top table's max stake
  GRID: [5, 4],   // the puzzle board (columns, rows)
  MINES: 3,
  HIDDEN: 8,      // tiles still covered: the mines and some safe tiles next to them
};
export const STORY_WEIGHT = {
  casino: 12, bust: 11, lotto_jackpot: 10, jackpot: 8, lotto_four: 5, bingo_house: 8, fruity_jackpot: 8, ascend: 7, don_win: 7, cashout_big: 6, rug: 6, whopper: 6,
  night_full: 6, karaoke_ovation: 5, karaoke_booed: 3, scratch_big: 6, duck_long: 5, boom_big: 5, darts_won: 5, banker_beat: 5, unlock: 4, clear: 4, rainbow: 4, claw_win: 4,
  banker_deal: 4, dare_won: 4, storm: 3, power: 3, kev_launch: 3, darts_lost: 3, levelup: 3, gull: 2, slugs: 2, ghost: 2,
};
