// Scratchcards, the Flip Booth's third tab: pick a card off the shelf, then scratch the foil off with a mouse or finger.
import { $, $$, rnd, ico, fmt, esc } from '../core/util.js';
import { TABLES } from '../data/economy.js';
import { SCRATCH_CARDS, SCRATCH_PRIZES } from '../data/scratchcards.js';
import { bus } from '../core/bus.js';
import { S, has } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Game } from '../game/game.js';
import { Scratchcards } from '../game/scratchcards.js';
import { UI } from './ui.js';

const REVEAL_AT = .45; // a panel pops open once this much of its foil is scratched off
const NO_LUCK = ['The corner shop thanks you for your custom.', 'Better luck next time, says the back of the card.',
  'You could have had a meal deal.', 'The newsagent nods at you, slowly.'];
// a losing card that showed two of something big gets told so (it always stings)
const nearMiss = panels => { const two = SCRATCH_PRIZES.slice().reverse().find(p => p.x >= 20 && panels.filter(s => s === p.sym).length === 2);
  return two ? `Two ${two.name} and no third. Classic.` : rnd(NO_LUCK); };

export const ScratchView = {
  st: null, // the card being scratched: its canvas, panel rectangles and which panels are open
  open() {
    if (!has('flip')) return UI.toast('The corner shop is next to the Flip Booth. Buy the booth first.');
    if (Scratchcards.card) { Scratchcards.settle(); Game.setCoins(S.coins); } // a card left half-scratched still pays
    this.shelf();
  },
  shelf() {
    this.st = null;
    UI.modal(`${UI.boothTabs('scratch')}<h3>Scratchcards</h3><p>From the corner shop. Scratch off all nine panels: three of a kind wins.</p>
      <div class="shelf">${SCRATCH_CARDS.map(c => { const price = Scratchcards.price(c);
        return `<button type="button" class="ticket" data-card="${c.id}" style="--tc:${c.col}"${S.coins < price ? ' disabled' : ''}>
          ${ico('ticket')}<b>${esc(c.name)}</b><span class="num">${fmt(price)}</span><small>${esc(c.blurb)}</small></button>`; }).join('')}</div>
      <ul class="paytable">${SCRATCH_PRIZES.slice().reverse().map(p => `<li>${ico(p.sym).repeat(3)}<b>×${p.x}</b></li>`).join('')}</ul>
      <div class="row"><button class="btn ghost" type="button" data-a="close">Leave</button></div>`, { close: () => UI.closeModal() });
    $$('.ticket', UI.el.box).forEach(b => b.onclick = () => this.buy(b.dataset.card));
  },
  buy(id) {
    const card = Scratchcards.buy(id);
    if (!card) return UI.toast('Not enough coins for that one.');
    Game.setCoins(S.coins); Sound.buy(); bus.emit('scratch:bought', { card });
    this.play(card);
  },

  /* one card: nine panels under a foil canvas */
  play(card) {
    UI.modal(`${UI.boothTabs('scratch')}
      <div class="scard" style="--tc:${card.kind.col}"><div class="shead"><b>${esc(card.kind.name)}</b><span class="num">${fmt(card.price)}</span></div>
        <div class="sgrid">${card.panels.map((s, i) => `<div class="spanel" data-p="${i}">${ico(s)}</div>`).join('')}
          <canvas class="foil" role="img" aria-label="Scratch-off foil: drag across it to scratch"></canvas></div>
        <p class="sfoot">Three of a kind wins. Scratch with your mouse or finger.</p></div>
      <div class="duckres" id="scratchRes" aria-live="polite"><span>Scratch away.</span></div>
      <div class="row"><button class="btn gold" type="button" id="scratchAll">Scratch it all</button>
        <button class="btn ghost" type="button" id="scratchShelf" hidden>Back to the shelf</button><button class="btn ghost" type="button" data-a="close" disabled>Leave</button></div>`,
      { close: () => UI.closeModal() }, true);
    $$('.booth button', UI.el.box).forEach(b => { b.disabled = true; });
    const grid = $('.sgrid', UI.el.box), cv = $('.foil', grid), dpr = Math.min(2, devicePixelRatio || 1), g = grid.getBoundingClientRect();
    cv.width = Math.round(g.width * dpr); cv.height = Math.round(g.height * dpr);
    const panels = $$('.spanel', grid);
    const rects = panels.map(p => { const r = p.getBoundingClientRect(); return { x: (r.left - g.left) * dpr, y: (r.top - g.top) * dpr, w: r.width * dpr, h: r.height * dpr }; });
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    this.st = { card, cv, ctx, dpr, rects, panels, open: card.panels.map(() => false), done: false };
    this.paint();
    // scratching: a fat round brush that rubs the foil away; every so often, see which panels are mostly clear
    let last = null, timer = 0;
    const at = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr }; };
    const rub = (a, b) => {
      ctx.globalCompositeOperation = 'destination-out'; ctx.lineCap = 'round'; ctx.lineWidth = 30 * dpr;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
      Sound.scratch();
      if (!timer) timer = setTimeout(() => { timer = 0; this.check(); }, 110);
    };
    cv.addEventListener('pointerdown', e => { if (this.st.done) return; e.preventDefault(); cv.setPointerCapture(e.pointerId); last = at(e); rub(last, { x: last.x + .5, y: last.y }); });
    cv.addEventListener('pointermove', e => { if (!last) return; const p = at(e); rub(last, p); last = p; });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => cv.addEventListener(ev, () => { if (last) { last = null; this.check(); } }));
    $('#scratchAll').onclick = () => this.all();
  },
  // silver foil over each panel, with a scuffed sheen and a question mark
  paint() {
    const { ctx, rects, dpr } = this.st;
    rects.forEach(r => {
      const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
      g.addColorStop(0, '#eef2f3'); g.addColorStop(.42, '#aab7bc'); g.addColorStop(.55, '#cdd7da'); g.addColorStop(1, '#8b999f');
      ctx.fillStyle = g; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, 8 * dpr); else ctx.rect(r.x, r.y, r.w, r.h);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      for (let k = 0; k < 22; k++) ctx.fillRect(r.x + Math.random() * (r.w - 3 * dpr), r.y + Math.random() * (r.h - 3 * dpr), 2 * dpr, 2 * dpr);
      ctx.strokeStyle = 'rgba(20,27,29,.28)'; ctx.lineWidth = 3 * dpr;
      ctx.beginPath(); ctx.arc(r.x + r.w / 2, r.y + r.h / 2, r.w * .3, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(20,27,29,.32)'; ctx.font = `${Math.round(r.h * .4)}px "Jersey 10", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', r.x + r.w / 2, r.y + r.h / 2 + r.h * .02);
    });
  },
  // a panel opens once enough of its foil is gone (sampling every 7th pixel's alpha is plenty)
  check() {
    const st = this.st; if (!st || st.done || !st.cv.isConnected) return;
    st.rects.forEach((r, i) => {
      if (st.open[i]) return;
      const d = st.ctx.getImageData(Math.floor(r.x), Math.floor(r.y), Math.max(1, Math.floor(r.w)), Math.max(1, Math.floor(r.h))).data;
      let clear = 0, n = 0;
      for (let k = 3; k < d.length; k += 28) { n++; if (d[k] < 60) clear++; }
      if (clear / n >= REVEAL_AT) this.reveal(i);
    });
  },
  reveal(i) {
    const st = this.st; if (!st || st.open[i]) return;
    st.open[i] = true;
    const r = st.rects[i]; st.ctx.clearRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    st.panels[i].classList.add('open'); Sound.pop(st.open.filter(Boolean).length % 6);
    const { win, panels } = st.card;
    if (win && panels[i] === win.sym && panels.filter((s, j) => s === win.sym && st.open[j]).length === 3) {
      panels.forEach((s, j) => { if (s === win.sym) st.panels[j].classList.add('match'); });
      Sound.gem(win.x >= 100 ? 'jackpot' : win.x >= 20 ? 'diamond' : 'ruby');
    }
    if (st.open.every(Boolean)) this.done();
  },
  // "Scratch it all": the rest open one after another
  all() {
    const st = this.st; if (!st || st.done) return;
    $('#scratchAll').disabled = true;
    const shut = st.open.map((o, i) => o ? -1 : i).filter(i => i >= 0);
    shut.forEach((i, k) => setTimeout(() => { if (this.st === st) { Sound.scratch(); this.reveal(i); } }, k * 110));
  },
  done() {
    const st = this.st; if (!st || st.done) return;
    st.done = true; UI.modalLocked = false;
    const { card } = st, again = Scratchcards.price(card.kind);
    Scratchcards.settle();
    $$('.booth button, [data-a="close"]', UI.el.box).forEach(b => { b.disabled = false; });
    const res = $('#scratchRes');
    if (card.win) { res.className = 'duckres'; res.innerHTML = `<b>Three ${card.win.name}! +${fmt(card.prize)}</b><span>×${card.win.x} your money</span>`; }
    else { res.className = 'duckres lose'; res.innerHTML = `<b>Not a winner</b><span>${esc(nearMiss(card.panels))}</span>`; }
    const go = $('#scratchAll');
    go.disabled = S.coins < again; go.textContent = `Another one (${fmt(again)})`; go.onclick = () => this.buy(card.kind.id);
    const shelf = $('#scratchShelf'); shelf.hidden = false; shelf.onclick = () => this.shelf();
    Game.setCoins(S.coins, !!card.win, card.win ? { from: $('.scard', UI.el.box), amount: card.prize } : null);
    bus.emit('scratch', { win: !!card.win, x: card.win ? card.win.x : 0, prize: card.prize, price: card.price, kind: card.kind.id });
    // skint, with nothing on the tables: a moment to take it in, then the bust screen
    if (S.coins < TABLES[0].min && !Game.slots.some(Boolean)) setTimeout(() => { if (this.st === st && !UI.modalClosed()) UI.closeModal(); }, 1800);
  },
};
