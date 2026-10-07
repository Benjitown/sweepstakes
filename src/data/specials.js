// The landlord's specials: now and then a dealt board comes with a twist chalked on it, for that board only (never a
// golden board, and never the Daily). The numbers for each are here; src/game/specials.js picks them.
export const SPECIAL = { CHANCE: 1 / 12, FRIDAY: 2 };  // (on a Friday, by your clock, he chalks twice as many)
export const SPECIALS = [
  { id: 'trouble', name: 'Double Trouble', w: 1, mines: 1.5, risky: 2,
    blurb: 'Half as many mines again, but risky digs pay double and the limit’s doubled.' },
  { id: 'rush', name: 'Gem Rush', w: 1, gems: 2, blurb: 'Two extra gems hidden on this board.' },
  { id: 'clock', name: 'Against the Clock', w: 1, secs: 40, bonus: .5,
    blurb: 'Forty seconds from your first dig. Cash out in time for +50% on the profit; run out and it cashes out for you, bonus or no bonus.' },
  { id: 'lockin', name: 'The Lock-in', w: 1, frac: .5, bonus: 1,
    blurb: 'The landlord’s locked the doors: no cashing out till half the board’s dug. Stay for it and the profit’s doubled.' },
  { id: 'happy', name: 'Happy Hour', w: 1, back: .5, blurb: 'If this board goes bang, the landlord gives you half your stake back.' },
  { id: 'orders', name: 'Last Orders', w: 1, digs: 10, bonus: .5,
    blurb: 'Ten digs and that’s your lot: it cashes out after the tenth. Whenever it cashes out, +50% on the profit.' },
];
export const SPECIAL_BY = Object.fromEntries(SPECIALS.map(s => [s.id, s]));
