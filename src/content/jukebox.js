// The jukebox at the Red Lion: what's on it (the notes themselves are in src/data/jukebox.js).
export const RECORDS = {
  lounge: { code: 'A1', name: 'High Roller Lounge', by: 'The Croupiers', blurb: 'Smooth as a fresh deck. They play it in the posh bit of the casino.' },
  pub:    { code: 'A2', name: 'Last Orders', by: 'Big Dave & the Regulars', blurb: 'A knees-up on the Red Lion’s old piano. Dave doesn’t know the words and sings anyway.' },
  chip:   { code: 'B1', name: 'Insert Coin', by: '8-Bit Kev', blurb: 'Kev made it on his lunch break. He’s trying to sell it as an NFT.' },
  waltz:  { code: 'B2', name: 'Nan’s Wireless', by: 'The Tea Dance Orchestra', blurb: 'Nan’s favourite. She hums along while the kettle boils, and sometimes she has a little dance.' },
  bonfire: { code: 'F1', name: 'Penny for the Guy', by: 'The Bonfire Ceilidh Band', blurb: 'Only on the jukebox for Bonfire Night. A jig to keep warm by, with fireworks going off outside.' },
  xmas:    { code: 'X1', name: 'Tinsel on the Telly', by: 'The Carol Singers', blurb: 'Only on the jukebox at Christmas. Sleigh bells, a celesta and a bit too much tinsel.' },
  haunted: { code: 'H1', name: 'The Haunted Arcade', by: 'The Night Shift', blurb: 'Only on the jukebox in October. Spooky organ, a theremin, and something in the cellar.' },
};
// who asks for which record, and how
export const REQUEST_BY = { lounge: 'priya', pub: 'dave', chip: 'kev', waltz: 'nan', haunted: 'tash', bonfire: 'dave', xmas: 'tash' };
export const REQUEST_LINES = {
  priya: ['can someone put the posh one on. High Roller Lounge. I’m feeling fancy', 'High Roller Lounge please. I want to feel like I own a yacht'],
  dave: ['someone put {name} on. I NEED it', 'put {name} on and I’ll get the next round in'],
  kev: ['put Insert Coin on. for me. for the culture', 'Insert Coin please. it’s my track. streams matter'],
  nan: ['Could someone put my song on, love? Nan’s Wireless. I’ll have a little dance x'],
  tash: ['put {name} on. it’s the season. don’t argue', '{name}. now. please. thank you'],
};
export const SHUFFLE = { code: 'C1', name: 'Shuffle', by: 'whatever the jukebox fancies', blurb: 'A different record every few minutes.' };
