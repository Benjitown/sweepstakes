// Your allotment: four beds down the road. Seeds grow by the minute while you play (so they wait while you're outside
// or in another tab), and the farm shop buys what you pick. Longer crops pay better per minute, but the slugs get longer.
export const PLOT = {
  BEDS: 4,
  SLUGS: .01,        // each minute, the chance slugs get a crop that's still growing (bed by bed)
  RAIN: 120,         // a thunderstorm waters the lot: this many seconds closer to ripe
  WHOPPER: .08,      // the chance a crop comes up a whopper: double, and first prize at the village show
  SIZE: [.85, 1.25], // otherwise it sells for its usual price, give or take this
  OCTOBER: 1.3,      // pumpkins fetch more in October
};
// mins: minutes of play to ripen; share: a packet of seeds, as a share of your top table's max stake; x: what it sells for, times that
export const CROPS = [
  { id: 'radish', mins: 2, share: .05, x: 1.6 },
  { id: 'lettuce', mins: 3, share: .06, x: 1.8 },
  { id: 'carrot', mins: 5, share: .08, x: 2.1 },
  { id: 'spuds', mins: 7, share: .1, x: 2.4 },
  { id: 'marrow', mins: 10, share: .12, x: 2.8 },
  { id: 'pumpkin', mins: 14, share: .15, x: 3.4 },
];
export const CROP_BY = Object.fromEntries(CROPS.map(c => [c.id, c]));
