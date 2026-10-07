// Sunday dinner at Nan's on screen: her invitation in the group chat (Go round / Not today, Nan) and the dinner itself.
import { $, $$, esc, ico, rnd } from '../core/util.js';
import { FRIENDS, LINES } from '../content/chat-lines.js';
import { ROAST_MENU } from '../content/sunday.js';
import { SUNDAY } from '../data/sunday.js';
import { Sunday } from '../game/sunday.js';
import { Sound } from '../audio/sound.js';
import { Chat } from './chat.js';
import { UI } from './ui.js';

const PLATE_ART = `<svg class="roastplate" viewBox="0 0 160 128" aria-hidden="true">
  <g class="steam" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"><path d="M62 34 q-6 -7 0 -14 q6 -7 0 -14"/><path d="M82 30 q-6 -7 0 -14 q6 -7 0 -14"/><path d="M102 34 q-6 -7 0 -14 q6 -7 0 -14"/></g>
  <ellipse cx="80" cy="84" rx="72" ry="40" fill="#e9e4d8" stroke="#141b1d" stroke-width="3"/>
  <ellipse cx="80" cy="82" rx="56" ry="29" fill="#fffdf6" stroke="#cfc6b2" stroke-width="2"/>
  <ellipse cx="88" cy="86" rx="32" ry="13" fill="#7a4521"/>
  <path d="M74 80 q-4 -16 16 -18 q20 -1 18 13 q-2 12 -18 11 q-12 0 -16 -6 z" fill="#c0702f" stroke="#141b1d" stroke-width="2"/>
  <path d="M106 70 l10 -7" stroke="#f3ead6" stroke-width="5" stroke-linecap="round"/><circle cx="118" cy="61" r="3.5" fill="#f3ead6" stroke="#141b1d" stroke-width="1.5"/>
  <ellipse cx="50" cy="74" rx="16" ry="10" fill="#d9a050" stroke="#141b1d" stroke-width="2"/><ellipse cx="50" cy="72" rx="8.5" ry="4.5" fill="#9c6a2c"/>
  <g fill="#e8b04a" stroke="#141b1d" stroke-width="2"><ellipse cx="46" cy="92" rx="9" ry="6.5"/><ellipse cx="62" cy="98" rx="9" ry="6.5"/><ellipse cx="60" cy="86" rx="7.5" ry="5.5"/></g>
  <g fill="#f28c28" stroke="#141b1d" stroke-width="1.5"><rect x="104" y="88" width="20" height="6" rx="3" transform="rotate(-18 114 91)"/><rect x="108" y="96" width="18" height="6" rx="3" transform="rotate(-8 117 99)"/></g>
  <g fill="#78c552" stroke="#2f5d1e" stroke-width="1"><circle cx="86" cy="102" r="3.2"/><circle cx="93" cy="104" r="3.2"/><circle cx="90" cy="98" r="3.2"/><circle cx="98" cy="101" r="3.2"/></g>
</svg>`;
const roastSays = pool => (rnd(LINES[pool]) || ['nan', ''])[1];

export const SundayView = {
  expire: 0,
  // her invitation, in the group chat
  invite() {
    const f = FRIENDS.nan, chat = $('#chat'); if (!chat) return;
    chat.insertAdjacentHTML('beforeend', `<div class="msg invite sunday-invite">${Chat.avatar(f)}<div class="bubble" style="--fc:${f.col}"><b>${esc(f.name)}</b>
      <span>${esc(roastSays('sunday_ask'))}</span>
      <div class="qopts"><button type="button" class="qopt" data-a="go">${ico('drumstick', 'ic')} Go round</button><button type="button" class="qopt" data-a="no">Not today, Nan</button></div></div></div>`);
    while (chat.children.length > 40) chat.firstChild.remove();
    chat.scrollTop = chat.scrollHeight; Sound.msg();
    const el = chat.lastElementChild, settle = how => { clearTimeout(this.expire); $$('.qopt', el).forEach(b => { b.disabled = true; if (b.dataset.a === how) b.classList.add('right'); }); };
    $('[data-a="go"]', el).onclick = () => { settle('go'); Sunday.go(); this.dinner(); };
    $('[data-a="no"]', el).onclick = () => { settle('no'); Sunday.plate(); setTimeout(() => Chat.post('nan', roastSays('sunday_plate')), 700); };
    clearTimeout(this.expire);
    this.expire = setTimeout(() => { settle(''); Sunday.plate(); Chat.post('nan', roastSays('sunday_plate')); }, SUNDAY.ANSWER * 1000);
  },
  // round at Nan's
  dinner() {
    Sound.select(1);
    UI.modal(`<div class="sunday">${PLATE_ART}<h3>Sunday dinner at Nan’s</h3>
      <p>${esc(rnd(ROAST_MENU))}</p><q>${esc(roastSays('sunday_table'))}</q>
      <p class="hint">Full of roast: your next ${SUNDAY.BOARDS} winning cash-outs get +${Math.round(SUNDAY.BOOST * 100)}% on the profit.</p>
      <button class="btn green big" type="button" data-a="close">Thanks, Nan</button></div>`,
      { close: () => { UI.closeModal(); setTimeout(() => Chat.post('nan', roastSays('sunday_bye')), 600); } });
  },
};
