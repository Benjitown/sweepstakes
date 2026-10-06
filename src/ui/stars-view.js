// Nan's stars in the group chat: she asks your star sign (twelve buttons in her bubble), then reads your horoscope out
// of the paper, lucky number and all. src/game/horoscope.js writes them.
import { $, esc, rnd } from '../core/util.js';
import { FRIENDS } from '../content/chat-lines.js';
import { SIGNS } from '../content/horoscopes.js';
import { Sound } from '../audio/sound.js';
import { Stars } from '../game/horoscope.js';
import { Chat } from './chat.js';

const nanSays = (html, cls = '') => {
  const f = FRIENDS.nan, chat = $('#chat');
  chat.insertAdjacentHTML('beforeend', `<div class="msg invite ${cls}">${Chat.avatar(f)}<div class="bubble" style="--fc:${f.col}"><b>${esc(f.name)}</b>${html}</div></div>`);
  while (chat.children.length > 40) chat.firstChild.remove();
  chat.scrollTop = chat.scrollHeight; Sound.msg();
  return chat.lastElementChild;
};

export const StarsView = {
  ask() {
    const msg = nanSays(`<span>${esc(rnd(['I’m doing everyone’s stars from the paper love. What sign are you? x', 'What’s your star sign love? I’ll read you your stars x']))}</span>
      <div class="qopts signs">${SIGNS.map((s, k) => `<button type="button" class="qopt" data-sign="${k}">${esc(s)}</button>`).join('')}</div>`, 'starsask');
    msg.querySelectorAll('[data-sign]').forEach(b => b.onclick = () => {
      msg.querySelectorAll('[data-sign]').forEach(x => { x.disabled = true; x.classList.toggle('right', x === b); });
      if (Stars.setSign(+b.dataset.sign)) setTimeout(() => Stars.announce(), 700);
    });
    return msg;
  },
  read(h) {
    return nanSays(`<span>Your stars today, ${esc(h.name)} love: ${esc(h.text)} x</span><span class="lucky" title="Uncover a ${h.lucky} today and that board's pot goes ×${Stars.BONUS}">Lucky number <b>${h.lucky}</b></span>`, 'stars');
  },
};
