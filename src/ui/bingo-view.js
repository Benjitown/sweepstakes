// Nan's bingo hall (the booth's fourth tab): pick a ticket, then Nan calls 60 balls and your ticket daubs itself.
import { $, $$, ico, fmt, esc, rnd } from '../core/util.js';
import { TABLES } from '../data/economy.js';
import { FRIENDS } from '../content/chat-lines.js';
import { BINGO_TICKETS, BINGO_PAYS, BINGO_CALLS } from '../data/bingo.js';
import { BINGO_CALL, BINGO_NOISE, BINGO_START, BINGO_SWEAT, BINGO_END } from '../content/bingo-calls.js';
import { bus } from '../core/bus.js';
import { S, has, pref, level } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { WeirdNoises } from '../audio/noises.js';
import { Game } from '../game/game.js';
import { Bingo } from '../game/bingo.js';
import { UI } from './ui.js';
import { Chat } from './chat.js';

const RESULT = ['No luck', 'A line', 'Two lines', 'Full house'];
const BALL_COLS = ['#fe5f55', '#ffa31a', '#ffd23f', '#3fc18a', '#43d9d0', '#009dff', '#a275f0', '#ff8fb0', '#f4f1e8'];
const ballCol = n => BALL_COLS[Math.min(8, Math.floor(n / 10))];

// Nan reads the calls out loud with the browser's own voice (Stats has a switch). Muted means quiet.
const Voice = {
  ok: () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined',
  on: () => Voice.ok() && pref('nanvoice') && !S.muted && level('vol') > 0,
  // says it, then calls back when she's done (or after a few seconds, if the browser never says she's done)
  say(text, then) {
    let fired = false; const go = () => { if (!fired) { fired = true; if (then) then(); } };
    if (!this.on()) { setTimeout(go, BingoView.STEP_MS); return; }
    try {
      const u = new SpeechSynthesisUtterance(text), v = speechSynthesis.getVoices().find(x => /en[-_]GB/i.test(x.lang));
      if (v) u.voice = v; u.lang = 'en-GB'; u.rate = 1.08; u.pitch = 1.25; u.volume = level('vol');
      u.onend = u.onerror = () => setTimeout(go, 220);
      speechSynthesis.speak(u); setTimeout(go, 4500);
    } catch (e) { setTimeout(go, BingoView.STEP_MS); }
  },
  hush() { try { if (this.ok()) speechSynthesis.cancel(); } catch (e) { /* nothing to hush */ } },
};

export const BingoView = {
  st: null, // the game on screen: { g, k (calls so far), called, fast, done, timer }
  STEP_MS: 1150, FAST_MS: 260, // between calls; with Nan's voice on she finishes each call first
  open() {
    if (!has('flip')) return UI.toast('Nan’s bingo is out back of the Flip Booth. Buy the booth first.');
    if (this.st && !this.st.done) return;
    if (Bingo.game) { Bingo.settle(); Game.setCoins(S.coins); } // a ticket you left half-called still pays
    this.shelf();
  },
  shelf() {
    this.st = null;
    UI.modal(`${UI.boothTabs('bingo')}<h3>Nan’s Bingo</h3><p>One ticket, ${BINGO_CALLS} calls. Fill a row for a line, two rows for two lines, all three for a full house.</p>
      <div class="shelf">${BINGO_TICKETS.map(k => { const price = Bingo.price(k);
        return `<button type="button" class="ticket bticket" data-kind="${k.id}" style="--tc:${k.col}"${S.coins < price ? ' disabled' : ''}>
          ${ico('bingo')}<b>${esc(k.name)}</b><span class="num">${fmt(price)}</span><small>${esc(k.blurb)}</small></button>`; }).join('')}</div>
      <ul class="paytable bpays">${[3, 2, 1].map(n => `<li><span>${RESULT[n]}</span><b>×${BINGO_PAYS[n]}</b></li>`).join('')}</ul>
      <div class="row"><button class="btn ghost" type="button" data-a="close">Leave</button></div>`, { close: () => UI.closeModal() });
    $$('.bticket', UI.el.box).forEach(b => b.onclick = () => this.buy(b.dataset.kind));
  },
  buy(id) {
    const g = Bingo.buy(id);
    if (!g) return UI.toast('Not enough coins for that one.');
    Game.setCoins(S.coins); Sound.buy(); bus.emit('bingo:bought', g);
    this.play(g);
  },

  /* one game: the caller up top, your ticket below */
  play(g) {
    UI.modal(`${UI.boothTabs('bingo')}
      <div class="caller"><div class="ball" id="bBall"><span class="num">?</span></div>
        <div class="ctext"><b id="bCall">Eyes down…</b><small id="bCount">Call 0 of ${BINGO_CALLS}</small></div><div class="trail" id="bTrail"></div></div>
      <div class="bcard" style="--tc:${g.kind.col}"><div class="bhead"><b>${esc(g.kind.name)}</b><span class="num">${fmt(g.price)}</span></div>
        <div class="bgrid">${g.ticket.map((row, r) => row.map(n => n ? `<span class="bn" data-n="${n}" data-r="${r}">${n}</span>` : '<span class="bx"></span>').join('')).join('')}</div>
        <p class="bsweat" id="bSweat" aria-live="polite"></p></div>
      <div class="duckres" id="bingoRes" aria-live="polite"><span>Line ×${BINGO_PAYS[1]} · two lines ×${BINGO_PAYS[2]} · full house ×${BINGO_PAYS[3]}</span></div>
      <div class="row"><button class="btn gold" type="button" id="bingoFast">Faster please, Nan</button>
        <button class="btn ghost" type="button" id="bingoShelf" hidden>Back to the shelf</button><button class="btn ghost" type="button" data-a="close" disabled>Leave</button></div>`,
      { close: () => UI.closeModal() }, true);
    $$('.booth button', UI.el.box).forEach(b => { b.disabled = true; });
    const st = this.st = { g, k: 0, called: new Set(), lines: 0, fast: false, done: false, pending: false, timer: 0 };
    $('#bingoFast').onclick = () => {
      st.fast = true; $('#bingoFast').disabled = true; Voice.hush();
      if (st.pending) { st.pending = false; st.timer = setTimeout(() => this.next(st), this.FAST_MS); }
    };
    const hi = rnd(BINGO_START); $('#bCall').textContent = hi;
    this.wait(st, hi);
  },
  // the next call comes once Nan has finished saying this one (or straight away, in a hurry)
  wait(st, text) {
    if (st.fast) { st.timer = setTimeout(() => this.next(st), this.FAST_MS); return; }
    st.pending = true;
    Voice.say(text, () => { if (st.pending) { st.pending = false; this.next(st); } });
  },
  live(st) { return this.st === st && !st.done && $('#bBall') && UI.el.box.contains($('#bBall')); },
  next(st) {
    if (!this.live(st)) return;
    const n = st.g.calls[st.k++], call = BINGO_CALL[n], ball = $('#bBall');
    st.called.add(n);
    ball.querySelector('.num').textContent = n; ball.style.setProperty('--bc', ballCol(n));
    ball.classList.remove('roll'); void ball.offsetWidth; ball.classList.add('roll');
    $('#bCall').textContent = st.fast ? `${n}` : `${call}… ${n}`;
    $('#bCount').textContent = `Call ${st.k} of ${BINGO_CALLS}`;
    if (st.k > 1) { const tr = $('#bTrail'), prev = st.g.calls[st.k - 2]; tr.insertAdjacentHTML('afterbegin', `<i style="--bc:${ballCol(prev)}">${prev}</i>`); while (tr.children.length > 6) tr.lastChild.remove(); }
    const cell = $(`.bn[data-n="${n}"]`, UI.el.box);
    if (cell) { cell.classList.add('daub'); Sound.pop(st.k % 5); } else Sound.tick();
    if (!st.fast && BINGO_NOISE[n]) WeirdNoises.play(BINGO_NOISE[n]);
    const done = st.g.rowAt.filter(a => a === st.k - 1).length; // rows finished by this very call
    if (done) { st.lines += done; this.line(st); } else this.sweat(st);
    if (st.k >= BINGO_CALLS) { st.timer = setTimeout(() => this.done(st), st.fast ? 500 : 1100); return; }
    this.wait(st, `${call}, ${n}`);
  },
  // a row's just been filled: light it up and shout about it
  line(st) {
    const rows = new Set(st.g.ticket.map((row, r) => row.every(n => !n || st.called.has(n)) ? r : -1).filter(r => r >= 0));
    $$('.bn', UI.el.box).forEach(c => { if (rows.has(+c.dataset.r)) c.classList.add('lined'); });
    const word = ['', 'LINE!', 'TWO LINES!', 'HOUSE!'][st.lines], card = $('.bcard', UI.el.box);
    card.insertAdjacentHTML('beforeend', `<b class="bstamp">${word}</b>`); const s = card.lastElementChild; setTimeout(() => s.remove(), 1600);
    st.lines >= 3 ? Sound.win() : Sound.cash();
    $('#bSweat').textContent = st.lines >= 3 ? 'Full house!' : st.lines === 2 ? 'Two lines! One row to go for the house.' : 'A line! Now for two.';
    bus.emit('bingo:line', { lines: st.lines });
  },
  // one number away from something? Nan's hall goes quiet
  sweat(st) {
    const left = st.g.ticket.map(row => row.filter(n => n && !st.called.has(n))), open = left.filter(l => l.length), one = open.find(l => l.length === 1);
    const all = open.flat();
    $('#bSweat').textContent = all.length === 1 ? `Sweating on ${all[0]} for the full house!` : one ? rnd(BINGO_SWEAT).replace('{n}', one[0]) : '';
  },
  done(st) {
    if (this.st !== st || st.done) return;
    st.done = true; UI.modalLocked = false; Voice.hush();
    const { g } = st, again = Bingo.price(g.kind);
    Bingo.settle();
    $$('.booth button, [data-a="close"]', UI.el.box).forEach(b => { b.disabled = false; });
    const res = $('#bingoRes');
    if (g.prize) { res.className = 'duckres'; res.innerHTML = `<b>${RESULT[g.lines]}! +${fmt(g.prize)}</b><span>×${g.x} your money · ${esc(rnd(BINGO_END[g.lines]))}</span>`; }
    else { res.className = 'duckres lose'; res.innerHTML = `<b>No luck</b><span>${esc(rnd(BINGO_END[0]))}</span>`; }
    const go = $('#bingoFast');
    go.disabled = S.coins < again; go.textContent = `Another ticket (${fmt(again)})`; go.onclick = () => this.buy(g.kind.id);
    const shelf = $('#bingoShelf'); shelf.hidden = false; shelf.onclick = () => this.shelf();
    Game.setCoins(S.coins, !!g.prize, g.prize ? { from: $('.bcard', UI.el.box), amount: g.prize } : null);
    bus.emit('bingo', { lines: g.lines, x: g.x, prize: g.prize, price: g.price, kind: g.kind.id });
    if (S.coins < TABLES[0].min && !Game.slots.some(Boolean)) setTimeout(() => { if (this.st === st && !UI.modalClosed()) UI.closeModal(); }, 1800);
  },

  // now and then Nan asks the group chat who's coming to bingo, with a button that opens the hall
  invite() {
    const f = FRIENDS.nan, chat = $('#chat');
    chat.insertAdjacentHTML('beforeend', `<div class="msg invite">${Chat.avatar(f)}<div class="bubble" style="--fc:${f.col}"><b>${esc(f.name)}</b>
      <span>${esc(rnd(['Bingo at the community centre tonight! Who’s coming? x', 'I’m calling the bingo tonight love, come and keep me company x',
        'Eyes down at 7! I’ve saved you a seat and a dabber x']))}</span>
      <div class="qopts"><button type="button" class="qopt">${ico('bingo', 'ic')} Grab a ticket</button></div></div></div>`);
    while (chat.children.length > 40) chat.firstChild.remove();
    chat.scrollTop = chat.scrollHeight; Sound.msg();
    chat.lastElementChild.querySelector('.qopt').onclick = e => { e.currentTarget.disabled = true; this.open(); };
  },
};
