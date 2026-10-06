// The claw machine, in the corner of the Flip Booth (its sixth tab). A go costs a share of your top table's max stake.
// The claw swings back and forth along the top and you press Grab to drop it. How well it grips depends on how close
// you got to a prize's middle and how slippery that prize is, and it can still drop it on the way to the chute. Even
// perfect timing pays back less than you put in (test/antics.py works it out), so the house still wins.
export const CLAW = {
  PRICE: .04,      // of the top table's max stake (at least 5)
  GRIP: [.8, .3],  // the chance it holds on: dead centre, and at the very edge of a prize (times the prize's slip)
  DROP: .25,       // then the chance it drops it on the way to the chute anyway
  SWEEP_MS: 1900,  // how long the claw takes to cross the machine
  PILE: 5,         // prizes in the machine
};
// x: what it pays, times the price of a go. r: how wide it is (a share of the machine). w: how often one turns up.
export const CLAW_PRIZES = [
  { id: 'duck',   name: 'a rubber duck',      icon: 'duck',   x: 1.5, slip: 1,   r: .075, w: 4 },
  { id: 'kitten', name: 'a kitten plushie',   icon: 'kitten', x: 2,   slip: .8,  r: .07,  w: 3 },
  { id: 'bomb',   name: 'a googly-eyed bomb', icon: 'bomb',   x: 3,   slip: .5,  r: .065, w: 2, fx: 'shield' },
  { id: 'gem',    name: 'a big glass gem',    icon: 'gem',    x: 5,   slip: .32, r: .055, w: 1 },
  { id: 'crown',  name: 'the golden crown',   icon: 'crown',  x: 10,  slip: .15, r: .045, w: .5, fx: 'golden' },
];
export const CLAW_BY = Object.fromEntries(CLAW_PRIZES.map(p => [p.id, p]));
