// The numbers that set the pace: starting coins, the six tables, prices of Ascensions, the Double or Nothing ladder.

/* lim = the most a board can pay (× stake). prog = what a fully cleared board pays from safe digs alone.
   Risky digs multiply the pot by the odds taken: × (1 + BOOST·p/(1−p)). Gems multiply it again. Clearing adds × CLEAR. */
export const START = 1000;
export const TABLES = [
  { id: 'penny',  name: 'Penny Patch',  w: 6,  h: 6,  m: 5,  gems: 1, lim: 3,   prog: .4,  min: 10,    cap: 1e3,   cost: 0,     col: '#3fc18a', blurb: 'Training wheels. Nan plays here.' },
  { id: 'den',    name: 'Dodgy Den',    w: 8,  h: 8,  m: 11, gems: 2, lim: 6,   prog: .3,  min: 200,   cap: 2e4,   cost: 18e3,  col: '#009dff', blurb: 'Sticky floor. Sticky tiles.' },
  { id: 'alley',  name: 'Back Alley',   w: 9,  h: 9,  m: 17, gems: 2, lim: 12,  prog: .25, min: 4e3,   cap: 4e5,   cost: 1.2e6, col: '#ffd23f', blurb: 'Cash only. No questions.' },
  { id: 'roller', name: 'High Rollers', w: 10, h: 10, m: 24, gems: 3, lim: 25,  prog: .2,  min: 8e4,   cap: 8e6,   cost: 75e6,  col: '#fe5f55', blurb: 'Velvet rope, velvet mines.' },
  { id: 'whale',  name: 'Whale Pit',    w: 12, h: 12, m: 38, gems: 4, lim: 60,  prog: .15, min: 1.6e6, cap: 1.6e8, cost: 4.5e9, col: '#ffa31a', blurb: 'Where fortunes go for a swim.' },
  { id: 'abyss',  name: 'The Abyss',    w: 14, h: 14, m: 56, gems: 5, lim: 200, prog: .12, min: 3.2e7, cap: 3.2e9, cost: 85e9,  col: '#a275f0', blurb: 'It stares back.' },
];
export const TBY = Object.fromEntries(TABLES.map(t => [t.id, t]));
export const CASINO = 600e12, BOOST = 1.2, CLEAR = 1.25, MAXB = 8, RESTOCK = 120, GOLDEN = .08, SPIN_EVERY = 180, ASC_CAP = 2.5;
export const LADDER = [2, 5, 10, 25, 100];
export const ASC = [{ cost: 1.9e12, boards: 4 }, { cost: 4.2e12, boards: 5 }, { cost: 20e12, boards: 6 }, { cost: 90e12, boards: 7 }];
export const ROMAN = ['0', 'I', 'II', 'III', 'IV'];
