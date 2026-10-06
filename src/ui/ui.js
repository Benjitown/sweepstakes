// Helpers every view shares: the modal, toasts, hold-to-confirm buttons, the coin spin and the bust screen.
import { $, $$, rnd, ico, fmt, dur, reduced } from '../core/util.js';
import { START } from '../data/economy.js';
import { LINES } from '../content/chat-lines.js';
import { bus } from '../core/bus.js';
import { S } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Game } from '../game/game.js';
import { Background } from './background.js';
import { Chat } from './chat.js';
import { RunPanel } from './run-panel.js';

export const UI = {
  moodLock: null, modalLocked: false,
  el: { modal: $('#modal'), box: $('#modalBox') },
  modalClosed() { return this.el.modal.hidden; },
  modal(html, actions = {}, locked = false) {
    const wasClosed = this.el.modal.hidden;
    this.el.box.innerHTML = html; this.el.modal.hidden = false; this.modalLocked = locked;
    $$('[data-a]', this.el.box).forEach(b => b.onclick = () => actions[b.dataset.a] && actions[b.dataset.a]());
    $$('[data-booth]', this.el.box).forEach(b => b.onclick = () => { if (b.getAttribute('aria-selected') !== 'true') bus.emit('booth', b.dataset.booth); });
    const f = $('button:not(:disabled)', this.el.box); if (f) f.focus({ preventScroll: true });
    if (wasClosed) Sound.open();
    Background.refresh();
  },
  closeModal() {
    if (!this.el.modal.hidden) Sound.close();
    this.el.modal.hidden = true; this.el.box.innerHTML = ''; this.modalLocked = false; this.moodLock = null;
    RunPanel.render(); Background.refresh(); Game.checkBust(); bus.emit('modal:closed');
  },
  // the tabs at the top of the Flip Booth: coin flip | duck race | scratchcards | bingo | the Fruity (wiring.js switches on the 'booth' event)
  boothTabs(on) {
    return `<div class="booth" role="tablist" aria-label="The booth">${[['flip', 'coin', 'Coin flip', 'Flip'], ['ducks', 'duck', 'Duck race', 'Ducks'],
      ['scratch', 'ticket', 'Scratchcards', 'Scratch'], ['bingo', 'bingo', 'Bingo', 'Bingo'], ['fruity', 'cherry', 'The Fruity (fruit machine)', 'Fruity']].map(([k, icon, label, short]) =>
      `<button type="button" role="tab" aria-selected="${k === on}" data-booth="${k}" title="${label}" aria-label="${label}">${ico(icon)}<span>${short}</span></button>`).join('')}</div>`;
  },
  toast(msg) {
    const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; $('#toasts').appendChild(d);
    setTimeout(() => d.remove(), 2600); while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
  },
  holdButton(btn, ms, done) {
    const bar = btn.querySelector('i'); let t0 = 0, raf = 0, fired = false, lastBeep = 0;
    const loop = now => {
      if (!btn.isConnected) return;
      const p = Math.min(1, (now - t0) / ms); bar.style.width = p * 100 + '%';
      if (now - lastBeep > 90) { Sound.hold(p); lastBeep = now; }
      if (p >= 1) { fired = true; done(); return; }
      raf = requestAnimationFrame(loop);
    };
    const start = e => { if (fired) return; e.preventDefault(); t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); };
    const stop = () => { if (fired) return; cancelAnimationFrame(raf); bar.style.width = '0%'; };
    btn.addEventListener('pointerdown', start); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
    btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
    btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') stop(); });
    btn.addEventListener('contextmenu', e => e.preventDefault());
  },
  spinCoin(el, front, cb) {
    el.style.transition = 'none'; el.style.transform = 'rotateY(0deg)'; void el.offsetWidth;
    el.style.transition = reduced ? 'none' : 'transform 2s cubic-bezier(.15,.7,.2,1)';
    el.style.transform = `rotateY(${360 * 7 + (front ? 0 : 180)}deg)`;
    setTimeout(cb, reduced ? 50 : 2050);
  },
  showBust(reason) {
    const r = Game.lastRun || S.run;
    const why = { don: 'Double or nothing said nothing.', broke: 'Out of coins.', manual: 'You pulled the plug.' }[reason] || 'Out of coins.';
    const roast = [rnd(LINES.don_lose), rnd(LINES.bust)].filter((x, i, a) => a.findIndex(y => y[0] === x[0]) === i);
    bus.emit('bust', { reason });
    this.moodLock = 'bust';
    // Nan's biscuit tin (game/biscuit-tin.js): on a real bust she brings round what she's put by
    const tin = reason === 'manual' ? 0 : Game.lastTin || 0;
    this.modal(`${ico('skull', 'bigicon')}<h3 class="red">Stuffed.</h3><p>${why} Your rank survives. ${tin ? 'And Nan’s been round.' : 'Everything else is gone.'}</p>
      <div class="odds"><div><small>Lasted</small><b class="num">${dur(r.time)}</b></div><div><small>Peak</small><b class="num">${fmt(r.peak)}</b></div><div><small>Boards</small><b class="num">${r.boards}</b></div></div>
      ${tin ? `<div class="tincard">${ico('tin')}<p><b>Nan’s biscuit tin.</b> It isn’t biscuits. It’s <b class="num">${fmt(tin)}</b> she’s been putting by for you, a little every time you won.
        <q>For a rainy day, love. I’m always here x</q></p></div>` : ''}
      <div class="roast">${roast.map(([w, t]) => Chat.bubble(w, t)).join('')}</div>
      <button class="btn green big" type="button" data-a="again">Start again with ${fmt(START + tin)}</button>`,
      { again: () => { this.closeModal(); bus.emit('reset'); } }, true);
    bus.emit('reset', { keepModal: true });
  },
};
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !UI.modalClosed() && !UI.modalLocked) UI.closeModal(); });
