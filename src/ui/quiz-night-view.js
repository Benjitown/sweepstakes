// Quiz night on screen: Priya's invite in the group chat, then the round itself (a question, three answers and a
// shrinking bar, five times), then the score. src/game/quiz-night.js keeps score.
import { $, $$, fmt, esc, rnd, ico } from '../core/util.js';
import { FRIENDS, LINES } from '../content/chat-lines.js';
import { NIGHT } from '../data/quiz-night.js';
import { Sound } from '../audio/sound.js';
import { Game } from '../game/game.js';
import { S } from '../core/state.js';
import { QuizNight } from '../game/quiz-night.js';
import { Chat } from './chat.js';
import { UI } from './ui.js';
import { FX } from './fx.js';

export const QuizNightView = {
  expire: 0, timer: 0, next: 0,
  invite() {
    const f = FRIENDS.priya, chat = $('#chat');
    chat.insertAdjacentHTML('beforeend', `<div class="msg invite night">${Chat.avatar(f)}<div class="bubble" style="--fc:${f.col}"><b>${esc(f.name)}</b>
      <span>${esc(rnd(['quiz night at the Red Lion! five questions, coins for every right answer. you in?', 'I’m doing a proper quiz round. five questions, fifteen seconds each. who’s in',
        'QUIZ NIGHT. all five right and the prize doubles. pull up a chair']))}</span>
      <div class="qopts"><button type="button" class="qopt" data-a="in">${ico('brain', 'ic')} Pull up a chair</button><button type="button" class="qopt" data-a="no">Not tonight</button></div></div></div>`);
    while (chat.children.length > 40) chat.firstChild.remove();
    chat.scrollTop = chat.scrollHeight; Sound.msg();
    const el = chat.lastElementChild, settle = how => { clearTimeout(this.expire); $$('.qopt', el).forEach(b => { b.disabled = true; if (b.dataset.a === how) b.classList.add('right'); }); };
    $('[data-a="in"]', el).onclick = () => { if (!UI.modalClosed()) return UI.toast('Finish what you’re doing first.'); settle('in'); this.open(); };
    $('[data-a="no"]', el).onclick = () => { settle('no'); setTimeout(() => Chat.post('priya', 'your loss. literally'), 600); };
    clearTimeout(this.expire); this.expire = setTimeout(() => settle(''), NIGHT.ANSWER * 1000);
    const r = chat.getBoundingClientRect();
    if (r.top > innerHeight || r.bottom < 0) UI.toast('Quiz night in the group chat!');
  },
  open() {
    const r = QuizNight.start(); if (!r) return;
    UI.modal(`<div class="qnight"><h3>${ico('brain', 'ic')} Quiz night at the Red Lion</h3>
      <p class="qnhead"><span id="qnNum"></span><span>Score <b class="num" id="qnScore">0</b></span><span>${fmt(r.prize)} a question</span></p>
      <p class="qnq" id="qnQ"></p><div class="qnopts" id="qnOpts"></div><i class="qnbar" id="qnBar"></i>
      <p class="qnmsg" id="qnMsg" aria-live="polite"></p>
      <button class="btn ghost" type="button" data-a="close">Leave (keep what you’ve won)</button></div>`, { close: () => this.leave() }, true); // (Escape mustn't strand a round)
    this.show();
  },
  live() { return !!$('#qnOpts', UI.el.box); },
  // the question on, with its three answers and the clock
  show() {
    const r = QuizNight.round, q = QuizNight.current(); if (!r || !q || !this.live()) return;
    $('#qnNum').textContent = `Question ${r.k + 1} of ${r.qs.length}`;
    $('#qnQ').textContent = q.q; $('#qnMsg').textContent = '';
    $('#qnOpts').innerHTML = q.options.map((o, k) => `<button type="button" class="qopt" data-k="${k}">${esc(o)}</button>`).join('');
    $$('#qnOpts .qopt').forEach(b => b.onclick = () => this.pick(+b.dataset.k));
    const bar = $('#qnBar'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = `qnbar ${NIGHT.SECONDS}s linear forwards`;
    clearTimeout(this.timer); this.timer = setTimeout(() => this.pick(-1), NIGHT.SECONDS * 1000);
  },
  pick(k) {
    clearTimeout(this.timer);
    const r = QuizNight.round, q = QuizNight.current(); if (!r || !q || !this.live()) return;
    const right = k === q.right, more = r.k < r.qs.length - 1;
    $$('#qnOpts .qopt').forEach((b, j) => { b.disabled = true; if (j === q.right) b.classList.add('right'); else if (j === k) b.classList.add('wrong'); });
    $('#qnBar').style.animation = 'none';
    $('#qnMsg').textContent = right ? rnd(['Correct!', 'Spot on.', 'Yes!', 'Get in.']) : k < 0 ? `Time’s up. It was ${q.answer}.` : `No, it was ${q.answer}.`;
    $('#qnScore').textContent = r.score + (right ? 1 : 0);
    right ? Sound.select(2) : Sound.unflag();
    QuizNight.answer(k); // the last one finishes the round (and done() shows the score in a moment)
    if (more) { clearTimeout(this.next); this.next = setTimeout(() => this.show(), 1100); }
  },
  // the final score (wiring.js calls this on 'night:done'): paid now, shown once the last answer's sunk in
  done(o) {
    clearTimeout(this.timer); clearTimeout(this.next);
    const msg = o.all ? `All ${o.of}! Double prize: +${fmt(o.pay)}` : o.score ? `${o.score} out of ${o.of}: +${fmt(o.pay)}` : `None out of ${o.of}. There’s always next week.`;
    UI.toast(msg);
    if (o.pay) { Game.setCoins(S.coins, true); Sound.cash(); }
    if (o.all) FX.confetti(90);
    this.next = setTimeout(() => {
      if (!this.live()) return;
      $('#qnScore').textContent = o.score; $('#qnMsg').textContent = msg; $('#qnQ').textContent = 'That’s the round.'; $('#qnOpts').innerHTML = '';
      const out = UI.el.box.querySelector('[data-a="close"]'); if (out) out.textContent = 'Back to the table';
    }, 1100);
    setTimeout(() => Chat.post('priya', o.all ? 'a PERFECT round. are you cheating. you’re cheating' : o.score >= 3 ? `${o.score} out of ${o.of}. respectable` : 'and the wooden spoon goes to…'), 700);
    setTimeout(() => Chat.post(...rnd(LINES[o.score >= 3 ? 'night_nan_good' : 'night_nan_bad'])), 2000);
  },
  leave() { clearTimeout(this.timer); clearTimeout(this.next); QuizNight.quit(); UI.closeModal(); },
};
