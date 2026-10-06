// Gem tiers hidden under tiles, and how often each one turns up.

const GEMS = [
  { k: 'gem',     x: 1.2, w: .6,  name: 'Gem' },
  { k: 'ruby',    x: 1.5, w: .28, name: 'Ruby' },
  { k: 'diamond', x: 2,   w: .1,  name: 'Diamond' },
  { k: 'jackpot', x: 5,   w: .02, name: 'JACKPOT' },
];
export const rollGem = () => { let r = Math.random(); for (const g of GEMS) { r -= g.w; if (r <= 0) return g; } return GEMS[0]; };
export const gemTier = x => GEMS.find(g => Math.abs(g.x - x) < 1e-6) || GEMS[0];
