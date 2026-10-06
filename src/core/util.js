// Small helpers used everywhere: DOM lookups, number formatting, HTML escaping.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const rnd = a => a[Math.floor(Math.random() * a.length)];
// a shuffled copy (Fisher–Yates)
export const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const ico = (id, cls = '') => `<svg viewBox="0 0 64 64" class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
export function fmt(n) {
  n = Math.floor(n); const a = Math.abs(n);
  if (a < 10000) return n.toLocaleString('en-GB');
  for (const [v, s] of [[1e18, 'Qi'], [1e15, 'Qa'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']])
    if (a >= v) return (n / v).toFixed(a / v < 100 ? 2 : 1).replace(/\.?0+$/, '') + s;
}
export const fmtX = x => x >= 100 ? fmt(x) : x >= 10 ? x.toFixed(1) : x.toFixed(2);
export const fmtLim = x => Number.isInteger(x) ? fmt(x) : fmtX(x);
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const pct = c => (c * 100).toFixed(c < .1 ? 1 : 0) + '%';
export const dur = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}h ${m}m` : `${m}m ${Math.floor(s % 60)}s`; };
export const clock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const nice = v => { if (v < 100) return Math.round(v); const p = 10 ** (Math.floor(Math.log10(v)) - 1); return Math.round(v / p) * p; };
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
