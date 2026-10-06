// The table picker.
import { $, ico, fmt, fmtLim } from '../core/util.js';
import { TABLES } from '../data/economy.js';
import { S, ascMines, ascLim } from '../core/state.js';
import { Game } from '../game/game.js';

export const TablesView = {
  render() {
    const el = $('#tables'), keep = el.scrollLeft; el.innerHTML = '';
    for (const t of TABLES) {
      const unl = S.unlocked.includes(t.id), b = document.createElement('button');
      b.type = 'button'; b.className = 'tbl' + (unl ? '' : ' locked'); b.style.setProperty('--tc', t.col); b.dataset.t = t.id;
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', S.sel === t.id);
      b.innerHTML = unl ? `<span class="dot"></span><span><b>${t.name}</b><small>${t.w}×${t.h} · ${ascMines(t)} mines · ${t.gems} gem${t.gems > 1 ? 's' : ''} · up to ×${fmtLim(ascLim(t))}</small></span>`
        : `${ico('lock')}<span><b>${t.name}</b><small>Unlock ${fmt(t.cost)}${S.coins >= t.cost ? ' · tap to buy' : ''}</small></span>`;
      b.onclick = () => Game.unlockTable(t);
      el.appendChild(b);
    }
    el.scrollLeft = keep; // re-renders on every coin change must not yank the phone's sideways scroll
  },
  reveal() {
    const el = $('#tables'), sel = $('[aria-selected="true"]', el);
    if (sel && el.scrollWidth > el.clientWidth) el.scrollLeft = Math.max(0, sel.offsetLeft - el.offsetLeft - 16);
  },
};
