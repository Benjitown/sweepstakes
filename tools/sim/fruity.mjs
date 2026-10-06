// What the Fruity pays back. node tools/sim/fruity.mjs [spins]
// Works the plain reels out exactly, then plays a long session two ways: an expert (auto-hold, and the best path
// through every set of nudges, knowing the reel bands by heart) and a casual player (auto-hold, and a nudge only
// where they can see it wins). Gambling is a fair double-or-nothing, so it doesn't change the payback.
import { FRUITY_REELS, FRUITY_PAYS, FRUITY_CHERRIES, FRUITY_FEATURES as F } from '../../src/data/fruity.js';
import { FruityRules as R } from '../../src/game/fruity-rules.js';

const SPINS = +process.argv[2] || 400000;
// try other numbers without editing the data file: FRUITY='{"nudge":.15,"nudges":[1,2],"pays":{"L":6},"reels":["…","…","…"]}'
if (process.env.FRUITY) {
  const o = JSON.parse(process.env.FRUITY);
  Object.assign(F, o); Object.assign(FRUITY_PAYS, o.pays || {}); (o.reels || []).forEach((b, r) => { FRUITY_REELS[r] = b; });
}
let seed = 7; const rand = () => { let t = seed = (seed + 0x6D2B79F5) | 0; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; // mulberry32
const pick = a => a[Math.floor(rand() * a.length)];

// the plain reels, exactly
const N = FRUITY_REELS.map(b => b.length), wins = {}, base = { ret: 0, hits: 0, all: N[0] * N[1] * N[2] };
for (let a = 0; a < N[0]; a++) for (let b = 0; b < N[1]; b++) for (let c = 0; c < N[2]; c++) {
  const line = R.line([a, b, c]), w = R.pay(line); if (!w) continue;
  const k = w === FRUITY_CHERRIES && line[2] !== 'C' ? 'CC-' : line.join(''); wins[k] = (wins[k] || 0) + 1;
  base.ret += w; base.hits++;
}
console.log(`reels: ${N.join(' × ')} stops`);
for (const [k, n] of Object.entries(wins).sort((x, y) => R.pay([...x[0]]) - R.pay([...y[0]]))) {
  const w = k === 'CC-' ? FRUITY_CHERRIES : FRUITY_PAYS[k[0]];
  console.log(`  ${k.padEnd(4)} ×${String(w).padEnd(4)} 1 in ${(base.all / n).toFixed(1).padStart(7)}   ${(100 * n * w / base.all).toFixed(1).padStart(5)}%`);
}
console.log(`plain reels: hit 1 in ${(base.all / base.hits).toFixed(1)}, pays back ${(100 * base.ret / base.all).toFixed(1)}%`);

// The long run, exactly. A free go is sometimes followed by one held go, so per free go:
//   payback = (what the free go returns + what any held go after it returns) / (1 + the chance of a held go)
// Nudges are worth: for the expert, the best path through them; for the casual player, a nudge on whichever reel
// visibly wins (the biggest win, if there's a choice), else on a reel picked at random (averaged over the three).
const wNudge = F.nudges.reduce((m, n) => (m[n] = (m[n] || 0) + 1 / F.nudges.length, m), {});
function casual(cur, left) {
  if (!left) return 0;
  const win = [0, 1, 2].map(r => R.pay(R.line(R.nudged(cur, r)))), best = Math.max(...win);
  if (best) return best; // the reel that visibly wins the most
  return [0, 1, 2].reduce((sum, r) => sum + casual(R.nudged(cur, r), left - 1), 0) / 3;
}
const nudgeValue = (pos, expert) => Object.entries(wNudge).reduce((sum, [n, p]) => sum + p * (expert ? R.bestNudges(pos, +n).pay : casual(pos, +n)), 0);
// what one go returns on average with these reels held (none held: a free go), counting nudges after a loss
const goCache = new Map();
function goValue(pos, held, expert) {
  const key = expert + held.map((h, r) => h ? R.at(r, pos[r]) : '-').join('');
  if (goCache.has(key)) return goCache.get(key);
  let sum = 0, count = 0; const cur = pos.slice();
  const walk = r => {
    if (r === 3) { const w = R.pay(R.line(cur)); sum += w || F.nudge * nudgeValue(cur, expert); count++; return; }
    if (held[r]) { walk(r + 1); return; }
    for (let p = 0; p < N[r]; p++) { cur[r] = p; walk(r + 1); }
  };
  walk(0); goCache.set(key, sum / count); return sum / count;
}
function payback(expert) {
  let free = 0, heldRet = 0, heldP = 0, hits = 0, nudgeWin = 0;
  for (let a = 0; a < N[0]; a++) for (let b = 0; b < N[1]; b++) for (let c = 0; c < N[2]; c++) {
    const pos = [a, b, c], w = R.pay(R.line(pos));
    if (w) { free += w; hits++; continue; }
    free += F.nudge * nudgeValue(pos, expert);
    const h = R.bestHold(pos).held;
    if (h.some(Boolean)) { heldP += F.hold; heldRet += F.hold * goValue(pos, h, expert); }
  }
  const all = N[0] * N[1] * N[2];
  return { rtp: (free + heldRet) / all / (1 + heldP / all), holdShare: heldP / all };
}
for (const [name, expert] of [['expert', true], ['casual', false]]) {
  const r = payback(expert);
  console.log(`${name.padEnd(6)}: pays back ${(100 * r.rtp).toFixed(2)}% exactly (holds offered after ${(100 * r.holdShare).toFixed(1)}% of free goes)`);
}

// a long session
function session(expert) {
  let staked = 0, ret = 0, hits = 0, held = null, wasHeld = false, nudgeSets = 0, nudgeWins = 0, holdSets = 0, holdRet = 0, holdStake = 0;
  const pos = [0, 0, 0];
  for (let s = 0; s < SPINS; s++) {
    staked++;
    for (let r = 0; r < 3; r++) if (!held || !held[r]) pos[r] = Math.floor(rand() * N[r]);
    const thisHeld = !!held; held = null;
    let w = R.pay(R.line(pos));
    if (thisHeld) { holdStake++; holdRet += w; }
    if (!w) {
      const roll = rand();
      if (roll < F.nudge) {
        nudgeSets++;
        const n = pick(F.nudges);
        if (expert) w = R.bestNudges(pos, n).pay;
        else { // a nudge on any reel where the symbol above the line makes a win; otherwise nudge at random
          let cur = pos.slice();
          for (let k = 0; k < n && !w; k++) {
            const pays = [0, 1, 2].map(x => R.pay(R.line(R.nudged(cur, x)))), top = Math.max(...pays);
            const r = top ? pays.indexOf(top) : Math.floor(rand() * 3);
            cur = R.nudged(cur, r); w = R.pay(R.line(cur));
          }
        }
        if (w) nudgeWins++;
      } else if (!thisHeld && roll < F.nudge + F.hold) {
        const h = R.bestHold(pos).held; if (h.some(Boolean)) { held = h; holdSets++; }
      }
    }
    if (w) { hits++; ret += w; }
    wasHeld = thisHeld;
  }
  return { rtp: ret / staked, hit: staked / hits, nudgeSets: nudgeSets / SPINS, nudgeWin: nudgeWins / Math.max(1, nudgeSets),
    holdSets: holdSets / SPINS, holdRtp: holdRet / Math.max(1, holdStake) };
}
for (const [name, expert] of [['expert', true], ['casual', false]]) {
  const r = session(expert);
  console.log(`${name.padEnd(6)}: pays back ${(100 * r.rtp).toFixed(1)}%, a win every ${r.hit.toFixed(1)} goes; nudges on ${(100 * r.nudgeSets).toFixed(1)}% of goes ` +
    `(${(100 * r.nudgeWin).toFixed(0)}% turned into a win), holds on ${(100 * r.holdSets).toFixed(1)}% (a held go pays back ${(100 * r.holdRtp).toFixed(0)}%)`);
}
