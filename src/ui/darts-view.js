// Darts at the Red Lion on screen: Dave's challenge in the group chat, then the board. Dave throws first, then your
// aim wanders about the board and you press Throw (or Space) three times. src/game/darts.js keeps the score.
import { $, $$, fmt, esc, rnd, ico } from '../core/util.js';
import { FRIENDS, LINES } from '../content/chat-lines.js';
import { DARTS, DARTBOARD } from '../data/darts.js';
import { S } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Darts } from '../game/darts.js';
import { Chat } from './chat.js';
import { UI } from './ui.js';
import { FX } from './fx.js';

// a point r out from the middle, deg clockwise from the top
const dpt = (r, deg) => [r * Math.sin(deg * Math.PI / 180), -r * Math.cos(deg * Math.PI / 180)].map(v => +v.toFixed(4));
const dwedge = (r1, r2, a0, a1) => { const [x0, y0] = dpt(r1, a0), [x1, y1] = dpt(r2, a0), [x2, y2] = dpt(r2, a1), [x3, y3] = dpt(r1, a1);
  return `M${x0} ${y0}L${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x0} ${y0}Z`; };
function dartboardSvg() {
  const B = DARTBOARD, [t0, t1] = B.TREBLE, [d0] = B.DOUBLE;
  let h = '<circle r="1.17" fill="#141b1d"/>';
  B.ORDER.forEach((n, i) => {
    const a0 = i * 18 - 9, a1 = a0 + 18, dark = i % 2 === 0, one = dark ? '#1f1f1f' : '#f1e2c2', two = dark ? '#e03a2e' : '#2f9e5a';
    h += `<path d="${dwedge(B.OUTER, t0, a0, a1)}" fill="${one}"/><path d="${dwedge(t0, t1, a0, a1)}" fill="${two}"/>`
      + `<path d="${dwedge(t1, d0, a0, a1)}" fill="${one}"/><path d="${dwedge(d0, 1, a0, a1)}" fill="${two}"/>`;
    const [tx, ty] = dpt(1.085, i * 18);
    h += `<text x="${tx}" y="${ty}" class="dnum">${n}</text>`;
  });
  h += `<circle r="${B.OUTER}" fill="#2f9e5a"/><circle r="${B.BULL}" fill="#e03a2e"/>`;
  return `<svg class="dsvg" viewBox="-1.2 -1.2 2.4 2.4" aria-hidden="true"><g class="wires">${h}</g><g id="dDarts"></g>
    <g id="dAim" class="daim"><circle r=".075" fill="none" stroke="#ffd23f" stroke-width=".02"/><path d="M-.13 0H-.05M.05 0H.13M0 -.13V-.05M0 .05V.13" stroke="#ffd23f" stroke-width=".02"/></g></svg>`;
}

export const DartsView = {
  el: null, expire: 0, raf: 0, t0: 0, aim: [0, 0], keyFn: null,
  // Dave's challenge in the group chat
  offer(o) {
    const f = FRIENDS.dave, chat = $('#chat');
    chat.insertAdjacentHTML('beforeend', `<div class="msg invite dare darts">${Chat.avatar(f)}<div class="bubble" style="--fc:${f.col}"><b>${esc(f.name)}</b>
      <span>${esc(rnd(['darts at the Red Lion? three each, highest score wins. {stake} on it', 'fancy a game of arrows? three darts each. {stake} says I beat you',
        'I’m at the oche. three darts, best total wins. {stake}. you in?']).replace('{stake}', fmt(o.stake)))}</span>
      <div class="qopts"><button type="button" class="qopt" data-a="on">${ico('dart', 'ic')} You’re on (${fmt(o.stake)})</button><button type="button" class="qopt" data-a="nah">Nah</button></div>
      <small class="qprize">Beat him and get ${fmt(o.stake * 2)} back</small></div></div>`);
    while (chat.children.length > 40) chat.firstChild.remove();
    chat.scrollTop = chat.scrollHeight; Sound.msg();
    const el = this.el = chat.lastElementChild;
    const settle = how => { clearTimeout(this.expire); $$('.qopt', el).forEach(b => { b.disabled = true; if (b.dataset.a === how) b.classList.add('right'); }); };
    $('[data-a="on"]', el).onclick = () => { if (Darts.offer !== o) return; if (!UI.modalClosed()) return UI.toast('Finish what you’re doing first.'); const m = Darts.accept(); if (m) { settle('on'); this.open(m); } else UI.toast('You can’t cover that right now.'); };
    $('[data-a="nah"]', el).onclick = () => { if (Darts.offer === o && Darts.decline('nah')) settle('nah'); };
    clearTimeout(this.expire);
    this.expire = setTimeout(() => { if (Darts.offer === o && Darts.decline('slow')) settle('slow'); }, DARTS.ANSWER * 1000);
    const r = chat.getBoundingClientRect();
    if (r.top > innerHeight || r.bottom < 0) UI.toast('Big Dave has challenged you to darts in the group chat.');
  },
  declined(o) { setTimeout(() => Chat.post('dave', o.why === 'nah' ? rnd(['scared of the oche', 'bottled it before a single dart']) : 'found someone else. Kev’s rubbish though'), 600); },
  // the board: Dave's darts land first, then it's your go
  open(m) {
    UI.modal(`<div class="darts"><h3>Darts at the Red Lion</h3>
      <div class="dboard">${dartboardSvg()}</div>
      <p class="dscore"><span>Big Dave <b class="num" id="dDave">…</b></span><span>You <b class="num" id="dYou">0</b></span><span>Pot <b class="num">${fmt(m.stake * 2)}</b></span></p>
      <p class="dmsg" id="dMsg" aria-live="polite">Dave steps up to the oche…</p>
      <div class="row"><button class="btn gold big" type="button" id="dThrow" disabled>Throw</button><button class="btn ghost" type="button" id="dQuit">Walk away</button></div></div>`, {}, true);
    $('#dThrow').onclick = () => this.throw();
    $('#dQuit').onclick = () => { this.stop(); Darts.concede(); };
    this.keyFn = e => { if ((e.key === ' ' || e.key === 'Enter') && this.live() && !$('#dThrow').disabled) { e.preventDefault(); this.throw(); } };
    document.addEventListener('keydown', this.keyFn);
    let total = 0;
    m.dave.forEach((d, k) => setTimeout(() => {
      if (!this.live()) return;
      this.mark(d, 'dave'); total += d.s; $('#dDave').textContent = k < 2 ? total : m.daveTotal; Sound.dart();
      this.say(k < 2 ? `Dave: ${d.label}.` : `Dave: ${d.label}. That’s ${m.daveTotal}. Your go: press Throw when your aim’s where you want it.`);
      if (k === 2) { $('#dThrow').disabled = false; this.wobble(); }
    }, 700 + k * 650));
  },
  live() { return !!$('#dDarts', UI.el.box); },
  say(t) { const el = $('#dMsg'); if (el) el.textContent = t; },
  mark(d, who) {
    const g = $('#dDarts'); if (!g) return;
    g.insertAdjacentHTML('beforeend', `<g class="dart ${who}" transform="translate(${d.x.toFixed(3)} ${d.y.toFixed(3)})"><circle r=".035"/><text y="-.07" class="dlab">${esc(d.label)}</text></g>`);
  },
  // your aim drifts about the board
  wobble() {
    cancelAnimationFrame(this.raf); this.t0 = performance.now();
    const W = DARTS.WOBBLE, step = now => {
      if (!this.live()) return;
      const t = (now - this.t0) / 1000;
      this.aim = [W * (.72 * Math.sin(1.25 * t + .4) + .28 * Math.sin(3.05 * t + 1)), W * (.72 * Math.sin(1.69 * t + 1.2) + .28 * Math.sin(2.35 * t + 2))];
      const a = $('#dAim'); if (a) a.setAttribute('transform', `translate(${this.aim[0].toFixed(3)} ${this.aim[1].toFixed(3)})`);
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  },
  throw() {
    const m = Darts.match; if (!m) return;
    const d = Darts.throwAt(this.aim[0], this.aim[1]); if (!d) return;
    this.mark(d, 'you'); Sound.dart();
    const n = m.mine.length, mine = m.mine.reduce((t, x) => t + x.s, 0);
    $('#dYou').textContent = mine;
    if (n < 3) this.say(`${d.label}! ${3 - n} to go.`);
    else { const t = $('#dThrow'); if (t) t.disabled = true; } // the third dart: Darts.finish() has already said how it went
  },
  stop() { cancelAnimationFrame(this.raf); if (this.keyFn) { document.removeEventListener('keydown', this.keyFn); this.keyFn = null; } },
  // how it went (Darts.finish says so through the bus)
  done(m) {
    this.stop();
    const msg = m.result === 'won' ? `You win ${m.total} to ${m.daveTotal}! +${fmt(m.pay)}` : m.result === 'drew' ? `${m.total} each. A draw: your ${fmt(m.stake)} back.` : `${m.total} to Dave’s ${m.daveTotal}. Dave takes the pot.`;
    if (this.live()) {
      this.say(msg);
      const q = $('#dQuit'); q.disabled = false; q.textContent = 'Back to the table'; q.onclick = () => UI.closeModal();
      UI.modalLocked = false;
    }
    UI.toast(msg);
    if (m.result === 'won') { Sound.cash(); FX.confetti(70); } else if (m.result === 'lost') Sound.unflag();
    setTimeout(() => Chat.post('dave', rnd(m.result === 'won' ? ['how. HOW. fine.', 'I want a rematch. I was distracted by the fruit machine'] : m.result === 'drew' ? ['a draw. we never speak of this'] : ['get IN. one hundred and eighty (it wasn’t)', 'easiest money I’ve ever made'])), 700);
    if (m.result !== 'drew') setTimeout(() => Chat.post(...rnd(LINES[m.result === 'won' ? 'darts_nan_won' : 'darts_nan_lost'])), 2200);
  },
};
