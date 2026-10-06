// Shop upgrades: price of every level and what each one does.

export const UPGS = [
  { id: 'flip',      name: 'Flip Booth',      icon: 'coin',    costs: [3000], desc: 'Unlocks Coin Flip (pick a side, double your bet) and the duck race out back.' },
  { id: 'flagBot',   name: 'Flag Goblin',     icon: 'goblin',  costs: [6500], desc: 'A little goblin flags every mine it can prove.' },
  { id: 'boards',    name: 'Extra Board',     icon: 'boards',  costs: [200e3, 800e3, 65e6, 3e12, 14e12, 55e12, 160e12], desc: 'Play one more board at once. Boards 5 to 8 each need an Ascension first.' },
  { id: 'sweepBot',  name: 'Autominer',       icon: 'bot',     costs: [430e3], req: 'flagBot', desc: 'Digs every tile it can prove is safe, on every board.' },
  { id: 'pockets',   name: 'Bigger Pockets',  icon: 'bag',     costs: [150e3, 60e6], desc: 'One more add-on slot.' },
  { id: 'overclock', name: 'Overclock',       icon: 'bolt',    costs: [375e3, 35e6, 2e9], req: 'flagBot', desc: 'Bots think faster. Much faster.' },
  { id: 'coward',    name: 'Coward Chip',     icon: 'chicken', costs: [300e3], req: 'sweepBot', toggle: true, desc: 'When the bots run out of safe moves, cash out. No guessing, no glory.' },
  { id: 'charm',     name: 'Lucky Charm',     icon: 'clover',  costs: [2e6, 500e6, 100e9], desc: '+8% better odds on Coin Flip and Double or Nothing, per level.' },
  { id: 'goggles',   name: 'Dodgy Goggles',   icon: 'goggles', costs: [1e6], toggle: true, desc: 'Tints tiles green to red by rough mine odds. Roughly right.' },
  { id: 'brain',     name: 'Galaxy Brain',    icon: 'brain',   costs: [17e6], req: 'sweepBot', desc: 'Bots learn the pair trick and solve far more of each board.' },
  { id: 'restake',   name: 'Degenerate Loop', icon: 'loop',    costs: [25e6], req: 'sweepBot', toggle: true, desc: 'Finished boards re-deal at the same stake and open themselves.' },
  { id: 'yolo',      name: 'YOLO Bot',        icon: 'rocket',  costs: [1.3e9], req: 'sweepBot', toggle: true, desc: 'When stuck, digs the least scary tile. With Coward Chip on, only at 25% risk or less.' },
];
export const UBY = Object.fromEntries(UPGS.map(u => [u.id, u]));
