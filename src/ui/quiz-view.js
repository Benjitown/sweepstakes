// The pub quiz in the group chat: a question bubble with three answers and a shrinking timer.
import { $, $$, rnd, esc, fmt } from '../core/util.js';
import { FRIENDS } from '../content/chat-lines.js';
import { QUIZ_INTROS } from '../content/quiz.js';
import { Sound } from '../audio/sound.js';
import { Quiz } from '../game/quiz.js';
import { Chat } from './chat.js';
import { UI } from './ui.js';

export const QuizView = {
  el: null, // the open question's bubble
  show(L) {
    const who = rnd(Object.keys(FRIENDS)), f = FRIENDS[who], chat = $('#chat');
    chat.insertAdjacentHTML('beforeend', `<div class="msg quiz">${Chat.avatar(f)}<div class="bubble" style="--fc:${f.col}"><b>${esc(f.name)}</b>
      <span>${esc(rnd(QUIZ_INTROS))} ${esc(L.q)}</span>
      <div class="qopts">${L.options.map((o, k) => `<button type="button" class="qopt" data-k="${k}">${esc(o)}</button>`).join('')}</div>
      <small class="qprize">Right answer: +${fmt(L.prize)} coins</small><i class="qtimer" style="--qt:${Quiz.SECONDS}s"></i></div></div>`);
    while (chat.children.length > 40) chat.firstChild.remove();
    chat.scrollTop = chat.scrollHeight; Sound.msg();
    const el = this.el = chat.lastElementChild;
    $$('.qopt', el).forEach(b => b.onclick = () => Quiz.answer(+b.dataset.k));
    // on phones the chat sits below the boards, so say so when it's off screen
    const r = chat.getBoundingClientRect();
    if (r.top > innerHeight || r.bottom < 0) UI.toast('Pub quiz in the group chat! Quick!');
  },
  // marks the right answer (and yours, if it wasn't); returns the bubble
  settle(L, k) {
    const el = this.el; if (!el) return null;
    $$('.qopt', el).forEach((b, j) => { b.disabled = true; if (j === L.right) b.classList.add('right'); else if (j === k) b.classList.add('wrong'); });
    const t = $('.qtimer', el); if (t) t.remove();
    this.el = null;
    return el;
  },
};
