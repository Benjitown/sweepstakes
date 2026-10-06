// The Daily Sweep on screen: the front page in newsprint (headline, photo, two side stories, the weather, KEVCOIN,
// Nan's stars, the small ads) and Spot the Mine at the bottom. A chip in the header says a paper's come.
import { $, $$, fmt, esc, ico } from '../core/util.js';
import { S, SaveGame } from '../core/state.js';
import { Paper } from '../game/paper.js';
import { fmtKev } from './kevcoin-view.js';
import { UI } from './ui.js';

const CAPTION = { bust: 'The scene this morning.', bust_don: 'The coin, pictured yesterday.', quiet: 'Library picture.', storm: 'Our photographer, bravely.',
  gull: 'The suspect.', slugs: 'A slug (not the one).', rug: 'KEVCOIN, artist’s impression.', kev_launch: 'KEVCOIN, artist’s impression.' };

export const PaperView = {
  // after: a button that replaces "Fold it up" (the bust edition's "Start again"), and the paper stays put until you press it
  open(p = S.paper, after = null) {
    if (!p) return UI.toast('No paper yet. It comes through the letterbox every twenty minutes of play.');
    if (p === S.paper && !p.read) { p.read = true; SaveGame.save(); this.chip(); }
    const L = p.lead, m = p.markets;
    const markets = m ? `KEVCOIN${m.v > 1 ? ` ${m.v}.0` : ''} ${fmtKev(m.price)} ${m.start ? `(${m.price >= m.start ? 'up' : 'down'} ${Math.abs(Math.round((m.price / m.start - 1) * 100))}% since launch)` : ''}` : 'KEVCOIN: not launched yet. Kev says “soon”.';
    UI.modal(`<div class="paper">
      <header class="mast"><b>The Daily Sweep</b><small><span>${esc(p.date)}</span><span>No. ${p.no}</span><span>40p</span></small></header>
      ${p.mode === 'bust' ? '<p class="special">Special edition</p>' : ''}
      <h3 class="head">${esc(L.head)}</h3><p class="stand">${esc(L.sub)}</p>
      <div class="front"><figure class="photo">${ico(L.art)}<figcaption>${esc(CAPTION[L.k] || 'Pictured: the moment it happened.')}</figcaption></figure>
        <div class="sidecol">${p.side.length ? p.side.map(s => `<article><h4>${esc(s.head)}</h4><p>${esc(s.sub)}</p></article>`).join('') : '<article><h4>ALSO TODAY</h4><p>Not much. Put the kettle on.</p></article>'}</div></div>
      <div class="cols"><section><h5>Weather</h5><p>${esc(p.weather)}</p></section><section><h5>Markets</h5><p>${esc(markets)}</p></section>
        <section><h5>Nan’s stars</h5><p>${p.stars ? `<b>${esc(p.stars.name)}:</b> ${esc(p.stars.text)}` : 'Tell Nan your star sign and she’ll read them out.'}</p></section></div>
      <section class="ads"><h5>Small ads</h5>${p.ads.map(a => `<p>${esc(a)}</p>`).join('')}</section>
      ${p.puzzle ? this.puzzle(p) : ''}
      <div class="row">${after ? `<button class="btn green big" type="button" data-a="after">${esc(after.label)}</button>` : '<button class="btn green" type="button" data-a="close">Fold it up</button>'}</div></div>`,
      { close: () => UI.closeModal(), after: () => after && after.go() }, !!after);
    this.bind(p);
  },
  puzzle(p) {
    const z = p.puzzle;
    return `<section class="puzzle"><h5>Spot the mine <small>${fmt(p.prize)} for the right answer</small></h5>
      <p>${z.mines} mines are hidden on this board. Tap a covered tile that has to be one.</p>
      <div class="pgrid" style="--w:${z.W}">${z.nums.map((v, i) => v < 0
        ? `<button type="button" class="pt${p.solved && z.sure.includes(i) ? ' mine' : ''}${p.solved && i === p.picked && !z.sure.includes(i) ? ' wrong' : ''}" data-pt="${i}" aria-label="Covered tile, row ${Math.floor(i / z.W) + 1}, column ${i % z.W + 1}" ${p.solved ? 'disabled' : ''}>${p.solved && z.sure.includes(i) ? ico('bomb') : ''}</button>`
        : `<span class="pt open n${v}">${v || ''}</span>`).join('')}</div>
      <p class="pres" id="paperRes">${p.solved === 'right' ? `Right! ${fmt(p.prize)} from the puzzle editor.` : p.solved === 'wrong' ? `Not that one. ${z.sure.length > 1 ? 'Either of the marked ones had' : 'The marked one had'} to be a mine.` : 'Tap the tile.'}</p></section>`;
  },
  bind(p) {
    $$('#modalBox [data-pt]').forEach(b => b.onclick = () => {
      if (p.solved || p !== S.paper) return;
      p.picked = +b.dataset.pt; const r = Paper.answer(p.picked);
      if (!r) return;
      const box = $('#modalBox .puzzle'); if (box) box.outerHTML = this.puzzle(p);
    });
  },
  chip() { const c = $('#paperChip'); if (c) c.hidden = !(S.paper && !S.paper.read); },
};
