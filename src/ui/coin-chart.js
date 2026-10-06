// Coins over time for the Stats tab: a sample every 10 seconds of play, drawn on a log scale (runs span 1,000 to trillions).
import { fmt, dur } from '../core/util.js';
import { S } from '../core/state.js';

const MAX_POINTS = 240;

export const CoinChart = {
  sample() {
    const r = S.run; if (!r.hist) r.hist = []; // saves from before v4.1 start their graph now
    r.hist.push([r.time, S.coins]);
    if (r.hist.length > MAX_POINTS) r.hist = r.hist.filter((p, k) => k % 2 === 0 || k === r.hist.length - 1); // halve the detail, keep the shape
  },
  svg() {
    const h = (S.run.hist || []).concat([[S.run.time, S.coins]]);
    if (h.length < 3) return '<p class="hint">Play for a bit and your coins graph shows up here.</p>';
    const W = 300, H = 90, P = 4, t0 = h[0][0], t1 = Math.max(t0 + 1, h[h.length - 1][0]);
    const ys = h.map(p => Math.log10(Math.max(1, p[1]))), lo = Math.min(...ys), hi = Math.max(lo + 1, ...ys);
    const X = t => P + (t - t0) / (t1 - t0) * (W - 2 * P), Y = v => H - P - (v - lo) / (hi - lo) * (H - 2 * P);
    const pts = h.map((p, k) => `${X(p[0]).toFixed(1)},${Y(ys[k]).toFixed(1)}`);
    const peak = ys.indexOf(Math.max(...ys));
    return `<svg class="coinsvg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Coins over this run, from ${fmt(h[0][1])} to ${fmt(S.coins)}">
      <polygon points="${X(t0)},${H - P} ${pts.join(' ')} ${X(h[h.length - 1][0])},${H - P}" fill="var(--gold)" opacity=".18"/>
      <polyline points="${pts.join(' ')}" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${X(h[peak][0])}" cy="${Y(ys[peak])}" r="3.5" fill="var(--red)"/></svg>
      <div class="chartcap"><span>${dur(t0)}</span><span>peak ${fmt(10 ** ys[peak])}</span><span>${dur(t1)}</span></div>`;
  },
};
