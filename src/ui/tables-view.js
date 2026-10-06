// The table picker.
import { $, ico, fmt, fmtLim, esc } from '../core/util.js';
import { TABLES } from '../data/economy.js';
import { S, ascMines, ascLim } from '../core/state.js';
import { Game } from '../game/game.js';
import { DailyView } from './daily-view.js';

export const TablesView = {
  render() {
    const el = $('#tables'), keep = el.scrollLeft; el.innerHTML = '';
    const d = DailyView.chip(), dc = document.createElement('button');
    dc.type = 'button'; dc.className = 'tbl daily' + (d.fresh ? ' fresh' : ''); dc.dataset.t = 'daily';
    dc.innerHTML = `${ico('calendar')}<span><b>Daily #${d.n}</b><small>${esc(d.sub)}</small></span>`;
    dc.onclick = () => DailyView.open();
    el.appendChild(dc);
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
  reveal() { // on phones the row scrolls sideways: keep the selected table in view (and the daily chip too, if both fit)
    const el = $('#tables'), sel = $('[aria-selected="true"]', el);
    if (!sel || el.scrollWidth <= el.clientWidth) return;
    const left = sel.offsetLeft - el.offsetLeft;
    el.scrollLeft = left + sel.offsetWidth <= el.clientWidth ? 0 : Math.max(0, left - 16);
  },
};
