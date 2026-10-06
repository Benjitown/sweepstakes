// The Allotment tab: four beds of soil with whatever's growing in them (seeds, a sprout, leaves, then the crop
// itself), the seed packets, and Pick when something's ripe. A chip in the header says when there's veg ready.
import { $, $$, fmt, esc, clock } from '../core/util.js';
import { S } from '../core/state.js';
import { PLOT, CROPS } from '../data/allotment.js';
import { VEG } from '../content/allotment.js';
import { Allotment } from '../game/allotment.js';
import { UI } from './ui.js';

const VEG_COL = { radish: '#e8456b', lettuce: '#8fd16a', carrot: '#ffa31a', spuds: '#d9b27c', marrow: '#4c9a4c', pumpkin: '#ff8c1a' };
const SOIL = '<rect x="3" y="31" width="58" height="15" rx="5" fill="#6b4226" stroke="#141b1d" stroke-width="3"/><path d="M10 39 h10 M27 42 h10 M44 38 h9" stroke="#4a2c18" stroke-width="2.5" stroke-linecap="round"/>';
const leaf = (x, y, rx, ry, rot, fill = '#3fc18a') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="${fill}" stroke="#141b1d" stroke-width="2"/>`;
const sprout = (x, top, size) => `<path d="M${x} 32 V${top}" stroke="#1f7d55" stroke-width="3" stroke-linecap="round"/>${leaf(x - size, top, size, size * .5, -25)}${leaf(x + size, top, size, size * .5, 25)}`;
// what's in a bed: 0 just sown (the packet on a stick), 1 a sprout, 2 leafy, 3 ripe
const RIPE = {
  radish: () => [18, 32, 46].map(x => `${leaf(x - 3, 20, 5, 2.5, -35)}${leaf(x + 3, 20, 5, 2.5, 35)}<circle cx="${x}" cy="29" r="6" fill="#e8456b" stroke="#141b1d" stroke-width="2.5"/><path d="M${x} 35 v4" stroke="#f3c1cc" stroke-width="2"/>`).join(''),
  lettuce: () => [[22, 25, 10], [45, 26, 9]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#8fd16a" stroke="#141b1d" stroke-width="2.5"/><path d="M${x - r * .6} ${y} q${r * .6} ${-r * .8} ${r * 1.2} 0 M${x - r * .4} ${y + r * .4} q${r * .4} ${-r * .5} ${r * .8} 0" fill="none" stroke="#4e9a3a" stroke-width="2"/>`).join(''),
  carrot: () => [18, 32, 46].map(x => `<path d="M${x} 27 L${x - 5} 13 M${x} 27 L${x} 11 M${x} 27 L${x + 5} 13" stroke="#3fc18a" stroke-width="3" stroke-linecap="round"/><path d="M${x - 5} 33 Q${x} 23 ${x + 5} 33 Z" fill="#ffa31a" stroke="#141b1d" stroke-width="2.5" stroke-linejoin="round"/>`).join(''),
  spuds: () => `${sprout(32, 16, 7)}${leaf(22, 22, 6, 3, -40)}${leaf(42, 22, 6, 3, 40)}${[[15, 31], [31, 34], [48, 31]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6.5" ry="4.5" fill="#d9b27c" stroke="#141b1d" stroke-width="2.5"/><circle cx="${x - 2}" cy="${y - 1}" r=".9" fill="#8a6a3d"/>`).join('')}`,
  marrow: () => `${leaf(48, 18, 9, 5, 30)}<ellipse cx="30" cy="27" rx="22" ry="9" fill="#4c9a4c" stroke="#141b1d" stroke-width="3"/><path d="M14 25 q16 -6 32 0 M13 29 q17 -5 34 0" fill="none" stroke="#bfe3a0" stroke-width="2"/><path d="M52 26 q5 -2 6 -7" fill="none" stroke="#1f7d55" stroke-width="3" stroke-linecap="round"/>`,
  pumpkin: () => `${leaf(13, 24, 8, 4.5, -30)}${leaf(52, 22, 8, 4.5, 30)}<ellipse cx="32" cy="23" rx="17" ry="12" fill="#ff8c1a" stroke="#141b1d" stroke-width="3"/><path d="M25 13 q-6 10 0 21 M39 13 q6 10 0 21 M32 11 v24" fill="none" stroke="#c75f00" stroke-width="2"/><path d="M32 12 l2 -7" stroke="#6b4226" stroke-width="4" stroke-linecap="round"/>`,
};
function vegArt(id, stage) {
  const body = stage >= 3 ? RIPE[id]() : stage === 2 ? [18, 32, 46].map(x => sprout(x, 21, 6)).join('') : stage === 1 ? sprout(32, 24, 5)
    : `<path d="M48 32 V16" stroke="#c9a46a" stroke-width="3"/><rect x="40" y="7" width="16" height="11" rx="2" fill="#fff8e1" stroke="#141b1d" stroke-width="2"/><circle cx="48" cy="12.5" r="3" fill="${VEG_COL[id]}"/>${[16, 26, 36].map(x => `<circle cx="${x}" cy="31" r="1.8" fill="#4a2c18"/>`).join('')}`;
  return `<svg class="vegart" viewBox="0 0 64 48" aria-hidden="true">${SOIL}${body}</svg>`;
}
const plotStage = k => Allotment.ripe(k) ? 3 : Math.min(2, Math.floor(Allotment.grown(k) * 3));

export const AllotmentView = {
  sig: '',
  showing: () => { const el = $('#plot'); return !!el && !el.hidden; },
  // what the tab's drawn from: a bed changing stage, or a packet becoming affordable, means a redraw
  signature: () => Allotment.beds().map((b, k) => b ? b.c + plotStage(k) : '-').join() + CROPS.map(c => +(S.coins >= Allotment.cost(c.id))).join(''),
  render() {
    const el = $('#plot'); if (!el) return;
    this.sig = this.signature();
    const beds = Allotment.beds(), used = beds.filter(Boolean).length, L = S.life.plot;
    el.innerHTML = `<h2>The allotment <small>${used} of ${PLOT.BEDS} beds planted</small></h2>
      <p class="hint">Seeds grow while you play. Pick them when they’re ripe and the farm shop buys them, usually for a lot more than the seeds.</p>
      <div class="beds">${beds.map((b, k) => this.bed(b, k)).join('')}</div>
      <h3 class="seedh">Seeds <small>tap a packet to plant it</small></h3>
      <div class="seeds">${CROPS.map(c => { const cost = Allotment.cost(c.id), v = VEG[c.id];
        return `<button type="button" class="seed" data-seed="${c.id}" ${S.coins < cost || used >= PLOT.BEDS ? 'aria-disabled="true"' : ''} title="${esc(v.blurb)}">${vegArt(c.id, 3)}
          <b>${esc(v.name)}</b><small>${c.mins} min → about ${fmt(Math.round(cost * c.x))}</small><span class="num">${fmt(cost)}</span></button>`; }).join('')}</div>
      <p class="plotlog">${L && L.picked ? `Picked ${L.picked} so far, for ${fmt(L.earned)} all told${L.rosettes ? `. ${L.rosettes} rosette${L.rosettes > 1 ? 's' : ''} from the village show` : ''}${L.slugs ? `. The slugs have had ${L.slugs}` : ''}.` : 'Nothing picked yet. Radishes are quick.'}</p>`;
    $$('#plot [data-pick]').forEach(b => b.onclick = () => Allotment.pick(+b.dataset.pick));
    $$('#plot [data-seed]').forEach(b => b.onclick = () => this.plant(b.dataset.seed));
  },
  bed(b, k) {
    if (!b) return `<div class="bed empty" data-k="${k}"><svg class="vegart" viewBox="0 0 64 48" aria-hidden="true">${SOIL}</svg><b>Empty</b><small>Plant something below</small></div>`;
    const v = VEG[b.c], left = Allotment.left(k);
    if (!left) return `<button type="button" class="bed ripe" data-k="${k}" data-pick="${k}" aria-label="Pick the ${esc(v.veg)}">${vegArt(b.c, 3)}<b>${esc(v.name)}</b><span class="pickme">Pick</span></button>`;
    return `<div class="bed" data-k="${k}">${vegArt(b.c, plotStage(k))}<b>${esc(v.name)}</b><i class="grow"><b style="width:${(Allotment.grown(k) * 100).toFixed(1)}%"></b></i><small class="num">${clock(left)} to go</small></div>`;
  },
  plant(id) {
    if (Allotment.free() < 0) return UI.toast('All four beds are planted. Pick something first.');
    const cost = Allotment.cost(id);
    if (S.coins < cost) return UI.toast(`A packet of ${VEG[id].veg} seeds costs ${fmt(cost)}.`);
    Allotment.plant(id);
  },
  // once a second while the tab's open: the clocks and the growth bars (and a redraw when something changes stage)
  tick() {
    if (!this.showing()) return;
    if (this.signature() !== this.sig) return this.render();
    Allotment.beds().forEach((b, k) => {
      const el = b && $(`#plot .bed[data-k="${k}"]`); if (!el || Allotment.ripe(k)) return;
      const bar = $('.grow b', el), t = $('small', el);
      if (bar) bar.style.width = (Allotment.grown(k) * 100).toFixed(1) + '%';
      if (t) t.textContent = `${clock(Allotment.left(k))} to go`;
    });
  },
  chip() { const c = $('#plotChip'); if (c) c.hidden = !Allotment.anyRipe(); },
  // a crop picked and sold
  picked(r) {
    UI.toast(r.whopper ? `A whopper! The farm shop paid ${fmt(r.pay)}, and it took first prize at the village show.` : `+${fmt(r.pay)} for your ${VEG[r.id].veg} at the farm shop.`);
    this.render(); this.chip();
  },
};
