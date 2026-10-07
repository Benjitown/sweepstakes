// Board styles: how the tiles look. Bought once with coins and kept for good (going bust doesn't take them back).
// The colours themselves are in css/boards.css, under body[data-skin=…].
export const SKINS = [
  { id: 'classic', name: 'Classic',        cost: 0,     tile: '#6d8c96', blurb: 'Slate grey. Like the old days.' },
  { id: 'felt',    name: 'Card table felt', cost: 25e3,  tile: '#2f7d5a', blurb: 'Green baize, like a proper casino.' },
  { id: 'neon',    name: 'Neon',           cost: 25e4,  tile: '#1b1d3a', blurb: 'Pink edges, dark tiles, a faint hum.' },
  { id: 'carpet',  name: 'Pub carpet',     cost: 75e4,  tile: '#7a1f2b', blurb: 'Red and gold swirls, slightly sticky. Hides a multitude of sins.' },
  { id: 'knitted', name: 'Nan’s knitting', cost: 25e5,  tile: '#8f62d6', blurb: 'Purple wool, cable stitch. She made it for you.' },
  { id: 'gold',    name: 'Gold leaf',      cost: 1e8,   tile: '#c9a227', blurb: 'Tasteful. Not at all.' },
];
export const SKIN_BY = Object.fromEntries(SKINS.map(s => [s.id, s]));
