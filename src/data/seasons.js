// The seasons, by the calendar on your device: Easter from Good Friday to Easter Monday (it moves; game/seasons.js
// works it out), Halloween all October, Bonfire Night the first week of November, Christmas from the 1st to Boxing Day. Each brings its own bits (src/game/seasons.js). ?season=xmas (or halloween,
// bonfire, none) in the URL tries one out; "Seasonal bits" in Stats switches them off.
export const SEASONS = {
  halloween: { name: 'Halloween', from: [10, 1], to: [10, 31] },  // [month, day], both ends included
  bonfire:   { name: 'Bonfire Night', from: [11, 1], to: [11, 7] },
  xmas:      { name: 'Christmas', from: [12, 1], to: [12, 26] },
  easter:    { name: 'Easter', around: [-2, 1] },  // days either side of Easter Sunday
};
export const PUMPKIN = { CHANCE: .5, X: 1.15 };  // Halloween: half the boards hide a pumpkin under a safe tile, ×1.15 (at Easter, a chocolate egg)
export const GHOST = { CHANCE: .2 };            // and one in five a friendly ghost, who points out a mine when you dig it up
export const TRICK = {
  CHANCE: .5,      // of answering the door in October: trick or treaters
  SWEETS: .02,     // a bag of sweets: this share of your top table's max stake (at least 5)
  EGGS_MS: 40000,  // say no and the eggs stay on the window this long
};
export const GUY = { CHANCE: .5 };  // Bonfire Night: of answering the door, kids with a Guy (a quid costs what a bag of sweets does)
export const XMAS = { CARD: .5 };
export const CAROL = { CHANCE: .4 };  // Christmas: of answering the door (once Nan's card's come), carol singers (a quid costs what a bag of sweets does)  // Nan's Christmas card through the door: this share of your top table's max stake
