// Add-on cards: rarities, prices and what each card does.

export const RAR = { common: { base: 50, w: 60, label: 'Common' }, uncommon: { base: 110, w: 28, label: 'Uncommon' }, rare: { base: 240, w: 12, label: 'Rare' } };
export const ADDONS = [
  { id: 'daredevil',  name: 'Daredevil',         r: 'common',   art: 'devil',     desc: 'Risky digs pay 30% more.' },
  { id: 'corner',     name: 'Corner Office',     r: 'common',   art: 'corner',    desc: 'A risky dig on a corner tile gives an extra ×1.25.' },
  { id: 'nester',     name: 'Empty Nester',      r: 'common',   art: 'nest',      desc: 'A risky dig that opens 10 or more tiles gives ×1.3.' },
  { id: 'egg',        name: 'Nest Egg',          r: 'common',   art: 'egg',       desc: 'Cash out after a risky dig and get 10% of the stake on top.' },
  { id: 'bulk',       name: 'Bulk Buyer',        r: 'common',   art: 'tag',       desc: 'Shields and probes cost half.' },
  { id: 'dinner',     name: 'Chicken Dinner',    r: 'common',   art: 'drumstick', desc: 'Coward Chip cash-outs pay 30% more profit.' },
  { id: 'flagfan',    name: 'Flag Fanatic',      r: 'common',   art: 'flag',      desc: 'Cash out after a risky dig: +2% per correct flag, up to +50%.' },
  { id: 'sniffer',    name: 'Mine Sniffer',      r: 'common',   art: 'nose',      desc: 'Every board starts with a free probe.' },
  { id: 'sevens',     name: 'Lucky Sevens',      r: 'uncommon', art: 'seven',     desc: 'Every 7 you uncover multiplies the pot by ×1.77.' },
  { id: 'hot',        name: 'Hot Streak',        r: 'uncommon', art: 'flame',     desc: 'Your streak bonus can climb to +250% instead of +100%.' },
  { id: 'oil',        name: 'Oil Change',        r: 'uncommon', art: 'oil',       desc: 'Bots work 40% faster.' },
  { id: 'speed',      name: 'Speed Demon',       r: 'uncommon', art: 'stopwatch', desc: 'Clear a board within 25 seconds of your first dig for ×1.5.' },
  { id: 'glass',      name: 'Glass Jaw',         r: 'uncommon', art: 'crack',     desc: 'Risky digs pay double. Shields stop working.' },
  { id: 'prospector', name: 'Prospector',        r: 'uncommon', art: 'gem',       desc: 'Every board hides one extra gem.' },
  { id: 'eight',      name: 'Eight Ball',        r: 'rare',     art: 'eight',     desc: 'Uncover an 8 and the pot goes ×8.' },
  { id: 'fuse',       name: 'Spare Fuse',        r: 'rare',     art: 'fuse',      desc: 'The first mine you hit on each board fizzles. 1 in 4 chance this card burns up when it does.' },
  { id: 'carrot',     name: 'Lucky Carrot',      r: 'rare',     art: 'carrot',    desc: '+12% better odds on Double or Nothing and Coin Flip.' },
  { id: 'stacks',     name: 'Fat Stacks',        r: 'rare',     art: 'stack',     desc: 'Every table’s max stake is 50% higher.' },
  { id: 'compound',   name: 'Compound Interest', r: 'rare',     art: 'chart',     desc: 'Cash out after a risky dig and get 1% of your coins too, up to the stake.' },
  { id: 'midas',      name: 'Midas Touch',       r: 'rare',     art: 'crown',     desc: 'Golden boards turn up three times as often.' },
];
export const ABY = Object.fromEntries(ADDONS.map(a => [a.id, a]));
