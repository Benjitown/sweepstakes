// Draws each board, its score box and tools, and turns taps into commands.
import { $, ico, fmt, fmtX, fmtLim, esc, reduced } from '../core/util.js';
import { TBY } from '../data/economy.js';
import { gemTier } from '../data/gems.js';
import { S, has, on, hasA, boardCount } from '../core/state.js';
import { Solver } from '../board/solver.js';
import { Game } from '../game/game.js';
import { DigCommand, FlagCommand, ChordCommand, ProbeCommand, CashOutCommand, invoke } from '../game/commands.js';
import { UI } from './ui.js';
import { Quips } from './quip-popups.js';
import { SPECIAL_BY } from '../data/specials.js';
import { Specials } from '../game/specials.js';

export const BoardsView = {
  root: $('#boards'),
  holder(s) { return this.root.querySelector(`[data-slot="${s}"]`); },
  renderAll() {
    this.root.innerHTML = '';
    for (let s = 0; s < boardCount(); s++) { const d = document.createElement('div'); d.dataset.slot = s; this.root.appendChild(d); this.render(s); }
  },
  ensureSlots() {
    for (let s = this.root.children.length; s < boardCount(); s++) { const d = document.createElement('div'); d.dataset.slot = s; this.root.appendChild(d); this.render(s); }
  },
  renderEmpties() { for (let s = 0; s < boardCount(); s++) if (!Game.slots[s]) this.render(s); },
  render(s) {
    const holder = this.holder(s); if (!holder) return;
    const b = Game.slots[s], t = TBY[S.sel];
    if (!b) {
      const can = S.coins >= t.min;
      holder.className = 'board empty'; holder.removeAttribute('style');
      holder.innerHTML = `${ico('bomb', 'big')}<p>Board ${s + 1} is empty</p>
        <button class="btn ${can ? 'blue' : 'ghost'}" type="button" ${can ? '' : 'disabled'}>Deal ${esc(t.name)} · ${fmt(Game.stakeFor(t))}</button>`;
      holder.querySelector('button').onclick = () => Game.deal(s);
      return;
    }
    b.el = holder; holder.className = 'board' + (b.golden ? ' golden' : '') + (b.special ? ' special' : ''); holder.style.setProperty('--tc', b.t.col);
    const sp = b.special && SPECIAL_BY[b.special];
    holder.innerHTML = `<div class="bh"><span class="tchip">${esc(b.t.name)}</span>${b.golden ? '<span class="goldtag">Golden ×2</span>' : ''}${sp ? `<span class="spectag" title="${esc(sp.blurb)}">${esc(sp.name)}${b.special === 'clock' ? ' <b class="clockct num"></b>' : ''}</span>` : ''}
        <span class="bot-on" hidden title="Bots are working this board">${ico('bot')}</span>
        <span class="gemct" title="Gems found on this board">${ico('gem')}<b class="num">0/0</b></span>
        <span class="blim">${b.m} mines · limit ×${fmtLim(b.lim)}</span></div>
      <div class="score"><div class="box stk"><small>Stake</small><b class="num">${fmt(b.stake)}</b></div><span class="x">×</span>
        <div class="box mlt"><small>Mult</small><b class="num">1.00</b></div><span class="x">=</span><div class="pot"><small>Pot</small><b class="num">${fmt(b.stake)}</b></div></div>
      <div class="bprog"><i></i></div>
      <div class="gridwrap"><div class="grid" style="--w:${b.t.w}"></div></div>
      <div class="bf">
        <button class="tool t-flag" type="button" aria-pressed="false" title="Flag mode (tap to flag)">${ico('flag')}</button>
        <button class="tool t-probe" type="button" aria-pressed="false" title="Probe a tile safely">${ico('probe')}<span></span></button>
        <span class="tool" title="Shields: survive one mine each" style="cursor:default">${ico('shield')}<span class="t-sh"></span></span>
        <button class="btn green cash" type="button">${ico('chicken', 'ic')}<span>Cash out</span></button>
      </div>`;
    const grid = holder.querySelector('.grid'), frag = document.createDocumentFragment();
    b.cells = [];
    for (let i = 0; i < b.n; i++) { const c = document.createElement('button'); c.type = 'button'; c.dataset.i = i; b.cells.push(c); frag.appendChild(c); }
    grid.appendChild(frag);
    for (let i = 0; i < b.n; i++) this.cell(b, i);
    this.bindGrid(b, grid);
    holder.querySelector('.t-flag').onclick = () => { b.mode = b.mode === 'flag' ? 'dig' : 'flag'; this.tools(b); };
    holder.querySelector('.t-probe').onclick = () => { if (Game.probesFor(b) > 0) { b.mode = b.mode === 'probe' ? 'dig' : 'probe'; this.tools(b); } else UI.toast('No probes left. Buy some in the shop.'); };
    holder.querySelector('.cash').onclick = () => invoke(new CashOutCommand(b, 'manual'));
    b.lastM = 0; this.hud(b); this.tools(b); this.odds(b);
  },
  cell(b, i) {
    const c = b.cells && b.cells[i]; if (!c) return;
    const x = i % b.t.w + 1, y = ((i / b.t.w) | 0) + 1;
    if (b.open[i]) {
      const g = b.gem[i];
      const pk = b.pumpkinAt === i;
      c.className = 'c o' + (b.num[i] ? ' n' + b.num[i] : '') + (g ? ' gem t-' + gemTier(g).k : '') + (pk ? ' pk' : '') + (b.probed.has(i) ? ' probed' : '');
      if (g && !b.num[i]) c.innerHTML = ico('gem'); else if (pk && !b.num[i]) c.innerHTML = ico('pumpkin'); else c.textContent = b.num[i] || '';
      c.removeAttribute('title'); c.setAttribute('aria-label', `Row ${y} column ${x}: ${b.num[i] || 'empty'}${g ? ', gem' : ''}`);
    } else if (b.flag[i]) {
      c.className = 'c f' + (b.defused.has(i) ? ' defused' : '') + (b.probed.has(i) ? ' probed' : '');
      c.innerHTML = ico(b.defused.has(i) ? 'shield' : 'flag'); c.removeAttribute('title'); c.setAttribute('aria-label', `Row ${y} column ${x}: flagged`);
    } else {
      c.className = 'c'; c.textContent = ''; c.setAttribute('aria-label', `Row ${y} column ${x}: hidden`);
    }
  },
  // Taps dig (or chord on a number), right-click / long-press / F flags. `act` lets another view reuse the same
  // input handling with its own rules: the Daily Challenge passes { tap, flag }.
  bindGrid(b, grid, act = {
    tap: i => invoke(b.mode === 'flag' ? (b.open[i] ? new ChordCommand(b, i) : new FlagCommand(b, i))
      : b.mode === 'probe' ? new ProbeCommand(b, i)
      : b.open[i] ? new ChordCommand(b, i) : new DigCommand(b, i)),
    flag: i => invoke(new FlagCommand(b, i)),
  }) {
    let lp = 0, suppress = false;
    const cellOf = e => e.target.closest && e.target.closest('.c');
    grid.addEventListener('click', e => {
      const c = cellOf(e); if (!c) return;
      if (suppress) { suppress = false; return; }
      act.tap(+c.dataset.i);
      Quips.maybe(.03, e.clientX, e.clientY);
    });
    grid.addEventListener('contextmenu', e => { const c = cellOf(e); if (!c) return; e.preventDefault(); if (suppress) return; act.flag(+c.dataset.i); Quips.maybe(.04, e.clientX, e.clientY); });
    grid.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch') return; const c = cellOf(e); if (!c) return;
      clearTimeout(lp); suppress = false;
      lp = setTimeout(() => { suppress = true; act.flag(+c.dataset.i); if (navigator.vibrate) try { navigator.vibrate(15); } catch (er) {} }, 380);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => grid.addEventListener(ev, () => clearTimeout(lp)));
    grid.addEventListener('keydown', e => { if (e.key !== 'f' && e.key !== 'F') return; const c = cellOf(e); if (!c) return; e.preventDefault(); act.flag(+c.dataset.i); });
  },
  hud(b) {
    if (!b.el) return;
    const m = b.mult(), mb = b.el.querySelector('.box.mlt'), sc = b.el.querySelector('.score');
    mb.querySelector('b').textContent = fmtX(m);
    if (b.lastM && m > b.lastM + 1e-9 && !reduced) { mb.classList.remove('bump'); void mb.offsetWidth; mb.classList.add('bump'); }
    b.lastM = m;
    sc.classList.toggle('hot', m >= 3 && m < 10); sc.classList.toggle('blaze', m >= 10);
    b.el.querySelector('.pot b').textContent = fmt(b.pot());
    b.el.querySelector('.bprog i').style.width = (b.frac() * 100).toFixed(1) + '%';
    b.el.querySelector('.gemct b').textContent = `${b.gemsFound}/${b.gemsTotal}`;
    const ck = b.el.querySelector('.clockct');
    if (ck) { const l = Specials.left(b), s = Math.ceil(l ?? SPECIAL_BY.clock.secs); ck.textContent = `${s}s`; ck.classList.toggle('hurry', l !== null && l <= 10 && !b.over); }
    b.el.querySelector('.gemct').classList.toggle('all', b.started && b.gemsFound >= b.gemsTotal && b.gemsTotal > 0);
    const cash = b.el.querySelector('.cash');
    cash.disabled = !b.started || b.over;
    cash.querySelector('span').textContent = b.result || (b.started ? `Cash out ${fmt(b.pot())}` : 'Dig a tile to start');
    b.el.querySelector('.bot-on').hidden = !(has('flagBot') && b.started && !b.over);
  },
  tools(b) {
    if (!b.el) return;
    b.el.querySelector('.t-flag').setAttribute('aria-pressed', b.mode === 'flag');
    const pr = b.el.querySelector('.t-probe'); pr.setAttribute('aria-pressed', b.mode === 'probe'); pr.querySelector('span').textContent = Game.probesFor(b);
    b.el.querySelector('.t-sh').textContent = hasA('glass') ? '×' : S.inv.shield;
  },
  odds(b) {
    if (!b.el || !b.cells) return;
    const show = on('goggles') && b.started && !b.over, P = show ? Solver.full(b).P : null;
    for (let i = 0; i < b.n; i++) {
      const c = b.cells[i]; if (!c || b.open[i] || b.flag[i]) continue;
      if (show) { c.classList.add('g'); c.style.setProperty('--p', P[i].toFixed(2)); c.title = `~${Math.round(P[i] * 100)}% mine`; }
      else if (c.classList.contains('g')) { c.classList.remove('g'); c.removeAttribute('title'); }
    }
  },
  stamp(b, text, kind, sub) {
    const w = b.el && b.el.querySelector('.gridwrap'); if (!w) return;
    const d = document.createElement('div'); d.className = 'stamp ' + kind; d.innerHTML = `<span>${esc(text)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>`; w.appendChild(d);
  },
  float(b, i, text, color, big) {
    const wrap = b.el && b.el.querySelector('.gridwrap'); if (!wrap) return;
    const w = wrap.getBoundingClientRect(); let x = w.width / 2, y = w.height / 2;
    if (i != null && b.cells[i]) { const r = b.cells[i].getBoundingClientRect(); x = r.left - w.left + r.width / 2; y = r.top - w.top + r.height / 2; }
    else { b.floats = (b.floats || 0) + 1; y += (b.floats % 4) * 30 - 30; }
    const s = document.createElement('span'); s.className = 'float' + (big ? ' big' : ''); s.textContent = text;
    s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.setProperty('--fc', color);
    wrap.appendChild(s); setTimeout(() => s.remove(), big ? 1500 : 1150);
  },
  boom(b, i) {
    if (!b.el) return;
    b.cells[i].className = 'c boom'; b.cells[i].innerHTML = ico('bomb');
    if (!reduced) { b.el.classList.remove('shake'); void b.el.offsetWidth; b.el.classList.add('shake'); }
    const mines = [];
    for (let k = 0; k < b.n; k++) { if (b.mine[k] && k !== i && !b.flag[k]) mines.push(k); else if (b.flag[k] && !b.mine[k]) b.cells[k].className = 'c wf'; }
    mines.sort(() => Math.random() - .5);
    const step = Math.min(60, 900 / Math.max(1, mines.length));
    mines.forEach((k, n) => setTimeout(() => { if (!b.cells[k]) return; b.cells[k].className = 'c mine'; b.cells[k].innerHTML = ico('bomb'); }, 120 + n * step));
    this.ghostGems(b);
  },
  ghostMines(b) { if (!b.el) return; for (let k = 0; k < b.n; k++) if (b.mine[k] && !b.flag[k]) { b.cells[k].className = 'c mine ghost'; b.cells[k].innerHTML = ico('bomb'); } this.ghostGems(b); },
  ghostGems(b) { if (!b.el) return; for (let k = 0; k < b.n; k++) if (b.gem[k] && !b.open[k]) { b.cells[k].className = 'c gemghost'; b.cells[k].innerHTML = ico('gem'); } },
};
