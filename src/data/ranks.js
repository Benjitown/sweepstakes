// Lifetime rank names and the XP each level needs.

const RANKS = [[1, 'Tile Toddler'], [3, 'Casual Digger'], [5, 'Flag Enjoyer'], [8, 'Certified Sweeper'], [12, 'Mine Whisperer'], [16, 'Goblin Accountant'],
  [20, 'Bomb Sommelier'], [25, 'Casino Gremlin'], [32, 'Tile Royalty'], [40, 'Minesweeper Menace'], [50, 'Ascended Degenerate'], [65, 'Legally a Wizard'], [80, 'Your Mum (she plays this)']];
export const rankName = l => { let n = RANKS[0][1]; for (const [at, name] of RANKS) if (l >= at) n = name; return n; };
export const xpNeed = l => Math.round(30 * l ** 1.55);
