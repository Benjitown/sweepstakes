// The car boot sale: now and then a bloke sets up a pasting table at the end of the road with a few add-on cards on
// it at boot-sale prices (some bargains, some rip-offs), and you can haggle. There's a mystery box too.
export const BOOT = {
  EVERY: [420, 780],  // seconds between boot sales (seven to thirteen minutes)
  OPEN_S: 75,         // how long he stays once you're there
  CARDS: 3,
  ASK: [.45, 1.35],   // his asking price: this × the shop's price, rolled for each card
  // two goes at haggling: a cheeky offer first, then a fair one. If he says no, he might sell it to someone else.
  OFFERS: [{ at: .6, yes: .4 }, { at: .8, yes: .7 }],
  WALK: .2,
  BOX: 1,             // the mystery box costs what an uncommon card costs in the shop; inside, any card you haven't got
};
