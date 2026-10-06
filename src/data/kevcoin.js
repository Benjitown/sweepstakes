// KEVCOIN, Kev's cryptocurrency: how its price moves, how often Kev hypes it, how often it gets rug-pulled, and his fee.
// A tick is three seconds of play. node tools/sim/kevcoin.mjs plays a few strategies against it.
export const KEV = {
  START: 1, HIST: 120, TICK_S: 3,
  LAUNCH_AFTER: 90,        // seconds of play before Kev launches it (once a run)
  DRIFT: -.0006, VOL: .012, // between hypes it wanders, a little downhill (about −0.06% and ±1.2% a tick)
  HYPE_EVERY: [60, 140],   // ticks between Kev's hype posts
  PUMP: .5,                // the chance a hype is followed by a pump (else a dump)
  PUMP_SIZE: [.25, 1.2],   // a pump climbs this much over a few ticks, then gives half of it back
  DUMP_SIZE: [.25, .6],    // a dump falls this much, most of it in the first tick
  HYPE_TICKS: [4, 9],
  RUG: 1 / 700,            // the chance, each tick, that the devs vanish (the price drops to 2% and stays dead a while)
  RUG_TO: .02, DEAD_TICKS: 40,
  FEE: .05,                // Kev's cut of every buy and every sell
  CAP: 2,                  // you can't hold more than 2× the top table's max stake (it's a small exchange)
  BUYS: [.1, .5, 2],       // the Buy buttons, × the top table's max stake
};
