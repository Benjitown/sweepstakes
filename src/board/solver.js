// What the numbers prove (safe tiles, certain mines) and rough odds for the rest. Used by bots and the odds overlay.
import { has } from '../core/state.js';

export const Solver = {
  // Proves mines (KM) and safe tiles (KS) from the numbers alone. Player flags are ignored, so they can't game the odds.
  deduce(b, subset) {
    const KM = new Uint8Array(b.n), KS = new Uint8Array(b.n);
    for (let pass = 0, changed = true; changed && pass < 80; pass++) {
      changed = false; const info = [];
      for (let i = 0; i < b.n; i++) {
        if (!b.open[i] || !b.num[i]) continue;
        const H = []; let F = 0;
        for (const j of b.nb[i]) { if (KM[j]) F++; else if (!b.open[j] && !KS[j]) H.push(j); }
        if (!H.length) continue;
        const r = b.num[i] - F;
        if (r === H.length) { for (const j of H) KM[j] = 1; changed = true; }
        else if (r === 0) { for (const j of H) KS[j] = 1; changed = true; }
        else info.push({ H, r });
      }
      if (changed || !subset) continue;
      outer: for (const A of info) for (const B of info) {
        if (A === B || A.H.length >= B.H.length || !A.H.every(x => B.H.includes(x))) continue;
        const diff = B.H.filter(x => !A.H.includes(x)), dr = B.r - A.r;
        if (dr === 0) { for (const j of diff) KS[j] = 1; changed = true; break outer; }
        if (dr === diff.length) { for (const j of diff) KM[j] = 1; changed = true; break outer; }
      }
    }
    return { KM, KS };
  },
  odds(b, { KM, KS }) {
    const P = new Float32Array(b.n).fill(NaN); let km = 0, unk = 0;
    for (let i = 0; i < b.n; i++) { if (b.open[i]) continue; if (KM[i]) km++; else if (!KS[i]) unk++; }
    const glob = unk ? Math.max(0, Math.min(1, (b.m - km) / unk)) : 0;
    for (let i = 0; i < b.n; i++) {
      if (!b.open[i] || !b.num[i]) continue;
      const H = []; let F = 0;
      for (const j of b.nb[i]) { if (KM[j]) F++; else if (!b.open[j] && !KS[j]) H.push(j); }
      if (!H.length) continue;
      const q = Math.max(0, Math.min(1, (b.num[i] - F) / H.length));
      for (const j of H) P[j] = isNaN(P[j]) ? q : Math.max(P[j], q);
    }
    for (let i = 0; i < b.n; i++) { if (b.open[i] || KS[i]) P[i] = 0; else if (KM[i]) P[i] = 1; else if (isNaN(P[i])) P[i] = glob; }
    return P;
  },
  full(b) { if (!b.ded || b.ded.v !== b.revealed) { const d = this.deduce(b, true); d.P = this.odds(b, d); d.v = b.revealed; b.ded = d; } return b.ded; },
  forBots(b) {
    if (has('brain')) return this.full(b);
    if (!b.dedB || b.dedB.v !== b.revealed) { b.dedB = this.deduce(b, false); b.dedB.v = b.revealed; }
    return b.dedB;
  },
};
