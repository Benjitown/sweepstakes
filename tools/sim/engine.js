// Board engine shared by the simulators. Same rules as the game: first dig safe, gems hidden only outside
// the opening flood, risky digs multiply the pot by 1 + B·p/(1−p), table limit cashes out automatically.
'use strict';
let rs = 1;
const seed = s => { rs = s * 9301 + 49297; };
const rand = () => { rs = (rs * 1103515245 + 12345) % 2147483648; return rs / 2147483648; };
const NBC = {};
function nbrs(t) {
  if (NBC[t.id]) return NBC[t.id];
  const out = [];
  for (let i = 0; i < t.w * t.h; i++) { const x = i % t.w, y = (i / t.w) | 0, a = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < t.w && ny < t.h) a.push(ny * t.w + nx); }
    out.push(a); }
  return (NBC[t.id] = out);
}
function deduce(b, subset) {
  const KM = new Uint8Array(b.n), KS = new Uint8Array(b.n);
  for (let pass = 0, changed = true; changed && pass < 80; pass++) {
    changed = false; const info = [];
    for (let i = 0; i < b.n; i++) { if (!b.open[i] || !b.num[i]) continue; const H = []; let F = 0;
      for (const j of b.nb[i]) { if (KM[j]) F++; else if (!b.open[j] && !KS[j]) H.push(j); }
      if (!H.length) continue; const r = b.num[i] - F;
      if (r === H.length) { for (const j of H) KM[j] = 1; changed = true; } else if (r === 0) { for (const j of H) KS[j] = 1; changed = true; } else info.push({ H, r }); }
    if (changed || !subset) continue;
    outer: for (const A of info) for (const B of info) {
      if (A === B || A.H.length >= B.H.length || !A.H.every(x => B.H.includes(x))) continue;
      const diff = B.H.filter(x => !A.H.includes(x)), dr = B.r - A.r;
      if (dr === 0) { for (const j of diff) KS[j] = 1; changed = true; break outer; }
      if (dr === diff.length) { for (const j of diff) KM[j] = 1; changed = true; break outer; } }
  }
  return { KM, KS };
}
function odds(b, { KM, KS }) {
  const P = new Float32Array(b.n).fill(NaN); let km = 0, unk = 0;
  for (let i = 0; i < b.n; i++) { if (b.open[i]) continue; if (KM[i]) km++; else if (!KS[i]) unk++; }
  const glob = unk ? Math.max(0, Math.min(1, (b.m - km) / unk)) : 0;
  for (let i = 0; i < b.n; i++) { if (!b.open[i] || !b.num[i]) continue; const H = []; let F = 0;
    for (const j of b.nb[i]) { if (KM[j]) F++; else if (!b.open[j] && !KS[j]) H.push(j); }
    if (!H.length) continue; const q = Math.max(0, Math.min(1, (b.num[i] - F) / H.length)); for (const j of H) P[j] = isNaN(P[j]) ? q : Math.max(P[j], q); }
  for (let i = 0; i < b.n; i++) { if (b.open[i] || KS[i]) P[i] = 0; else if (KM[i]) P[i] = 1; else if (isNaN(P[i])) P[i] = glob; }
  return P;
}
// strategy: 'human' (guess <= .30) | 'botA' (no pair trick, no guesses) | 'botB' (pair trick, no guesses) | 'botC' (pair trick, guess <= .25)
function play(C, t, asc, strategy, golden) {
  const n = t.w * t.h, m = Math.min(n - 9, Math.round(t.m * (1 + .1 * asc)));
  const b = { t, n, m, nb: nbrs(t), mine: new Uint8Array(n), open: new Uint8Array(n), num: new Int8Array(n), gem: new Float32Array(n), revealed: 0, safe: n - m };
  const first = Math.floor(t.h / 2) * t.w + Math.floor(t.w / 2), found = [];
  const ban = new Set([first, ...b.nb[first]]);
  let pool = []; for (let i = 0; i < n; i++) if (!ban.has(i)) pool.push(i);
  for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(rand() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
  for (let k = 0; k < m; k++) b.mine[pool[k]] = 1;
  for (let i = 0; i < n; i++) { let c = 0; for (const j of b.nb[i]) c += b.mine[j]; b.num[i] = c; }
  const flood = i => { const st = [i]; let o = 0; while (st.length) { const k = st.pop(); if (b.open[k] || b.mine[k]) continue; b.open[k] = 1; b.revealed++; o++; if (b.gem[k]) found.push(b.gem[k]); if (b.num[k] === 0) for (const j of b.nb[k]) if (!b.open[j]) st.push(j); } return o; };
  flood(first);
  pool = []; for (let i = 0; i < n; i++) if (!b.open[i] && !b.mine[i]) pool.push(i);
  for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(rand() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
  for (let k = 0; k < t.gems && k < pool.length; k++) { let x = rand(), v = C.GEM_TIERS[0][0]; for (const [mm, w] of C.GEM_TIERS) { x -= w; if (x <= 0) { v = mm; break; } } b.gem[pool[k]] = v; }
  const base = b.revealed, B = C.BOOST * (1 + .25 * asc), lim = t.lim * (1 + C.ASC_LIM * asc) * (golden ? 2 : 1);
  let G = 1, digs = 1, flags = 0, guesses = 0, boom = false; const flagged = new Uint8Array(n);
  const raw = () => { const f = b.safe - base <= 0 ? 1 : (b.revealed - base) / (b.safe - base); let J = golden ? 2 : 1; for (const g of found) J *= g;
    return (1 + t.prog * f) * G * J * (b.revealed >= b.safe ? C.CLEAR : 1); };
  const subset = strategy !== 'botA', thr = strategy === 'human' ? C.HUMAN.guessThr : strategy === 'botC' ? .25 : -1;
  while (true) {
    if (b.revealed >= b.safe || raw() >= lim) break;
    const d = deduce(b, subset);
    for (let i = 0; i < n; i++) if (d.KM[i] && !flagged[i] && !b.open[i]) { flagged[i] = 1; flags++; }
    let moved = false;
    for (let i = 0; i < n; i++) if (d.KS[i] && !b.open[i] && flood(i)) { digs++; moved = true; }
    if (moved) continue;
    if (thr < 0) break;
    const P = odds(b, subset ? d : deduce(b, true)); let bi = -1, bp = 2;
    for (let i = 0; i < n; i++) { if (b.open[i] || P[i] >= 1) continue; const v = P[i] + rand() * 1e-4; if (v < bp) { bp = v; bi = i; } }
    if (bi < 0 || bp > thr) break;
    guesses++;
    if (b.mine[bi]) { boom = true; break; }
    const p = Math.min(.95, bp); G *= 1 + B * p / (1 - p); flood(bi);
  }
  return { mult: boom ? 0 : Math.min(lim, raw()), boom, cleared: b.revealed >= b.safe, digs, flags, guesses, gems: found.length };
}
module.exports = { seed, rand, play };
