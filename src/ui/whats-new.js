// Tells returning players what changed since the version they last played (once per version; also in Stats).
import { ico, esc } from '../core/util.js';
import { SaveGame, S } from '../core/state.js';
import { VERSION, WHATS_NEW } from '../version.js';
import { UI } from './ui.js';
import { Coach } from './tutorial.js';

export const WhatsNew = {
  maybe() {
    const L = S.life; if (L.seen === VERSION) return;
    const returning = L.tut; L.seen = VERSION; SaveGame.save();
    if (returning) setTimeout(() => { if (UI.modalClosed() && !Coach.active) this.show(); }, 1600);
  },
  show() {
    UI.modal(`<h3>New in v${esc(VERSION)}</h3><ul class="news">${WHATS_NEW.map(([icon, title, text]) =>
      `<li>${ico(icon)}<div><b>${esc(title)}</b><span>${esc(text)}</span></div></li>`).join('')}</ul>
      <button class="btn green big" type="button" data-a="ok">Let’s go</button>`, { ok: () => UI.closeModal() });
  },
};
