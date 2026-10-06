// The upgrades shop and the Ascension screen.
import { $, $$, ico, fmt, fmtX, esc } from '../core/util.js';
import { TBY, CASINO, ASC_CAP, ASC, ROMAN } from '../data/economy.js';
import { UPGS } from '../data/upgrades.js';
import { S, lvl, boardCount, asc } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Game } from '../game/game.js';
import { UI } from './ui.js';

export const ShopView = {
  soon: 0,
  later() { clearTimeout(this.soon); this.soon = setTimeout(() => this.render(), 60); },
  render() {
    const el = $('#shop'), keep = el.scrollTop; el.innerHTML = '';
    const add = html => { el.insertAdjacentHTML('beforeend', html); return el.lastElementChild; };
    add(`<p class="sec">Upgrades</p>`);
    for (const u of UPGS.slice().sort((a, b) => (Game.nextCost(a) ?? 1e30) - (Game.nextCost(b) ?? 1e30))) {
      const L = lvl(u.id), maxed = L >= u.costs.length, cost = Game.nextCost(u), why = maxed ? null : Game.gate(u);
      const lvTxt = u.costs.length > 1 ? `<span class="lv">Lv ${L}/${u.costs.length}</span>` : '';
      const n = add(`<div class="item${maxed ? ' done' : ''}">${ico(u.icon, 'ii')}<div><b>${u.name} ${lvTxt}</b><p>${u.desc}${why ? ` <em>${why}</em>` : ''}</p>
        ${u.toggle && L ? `<label class="sw"><input type="checkbox" id="tog-${u.id}" ${S.tog[u.id] ? 'checked' : ''}> On</label>` : ''}</div>
        ${maxed ? '<span class="lv">Owned</span>' : `<button class="btn gold" type="button" data-cost="${cost}" data-ok="${why ? 0 : 1}">${fmt(cost)}</button>`}</div>`);
      const btn = $('button', n); if (btn) btn.onclick = () => Game.buyUpgrade(u);
      const tg = $('input', n); if (tg) tg.onchange = () => { Sound.toggle(tg.checked); Game.setToggle(u.id, tg.checked); };
    }
    add(`<p class="sec">Consumables · ${esc(TBY[S.sel].name)} prices</p>`);
    for (const c of Game.consumables()) {
      const n = add(`<div class="item">${ico(c.icon, 'ii')}<div><b>${c.name}</b><p>${c.desc}</p></div><button class="btn blue" type="button" data-cost="${c.cost}" data-ok="1">${fmt(c.cost)}</button></div>`);
      $('button', n).onclick = () => Game.buyConsumable(c);
    }
    add(`<p class="sec">The big ones</p>`);
    const A = asc();
    if (A < 4) {
      const need = ASC[A], why = boardCount() < need.boards ? `Needs ${need.boards} boards.` : null;
      const n = add(`<div class="item">${ico('asc', 'ii')}<div><b>Ascend to ${ROMAN[A + 1]}</b><p>More mines, worse luck. Max stakes ×2.5, bigger payouts and limits. Unlocks board slot ${A + 5}.${why ? ` <em>${why}</em>` : ''}</p></div>
        <button class="btn purple" type="button" data-cost="${need.cost}" data-ok="${why ? 0 : 1}">${fmt(need.cost)}</button></div>`);
      $('button', n).onclick = () => AscendView.open();
    } else add(`<div class="item done">${ico('asc', 'ii')}<div><b>Ascension IV</b><p>As high as it goes. Every board is a minefield.</p></div><span class="lv">Maxed</span></div>`);
    const n = add(`<div class="item${S.owned ? ' done' : ''}">${ico('casino', 'ii')}<div><b>Buy the Casino</b><p>The whole building. The carpet. Big Dave’s tab.</p></div>
      ${S.owned ? '<span class="lv">Yours</span>' : `<button class="btn red" type="button" data-cost="${CASINO}" data-ok="1">${fmt(CASINO)}</button>`}</div>`);
    const cb = $('button', n); if (cb) cb.onclick = () => Game.buyCasino();
    el.scrollTop = keep;
    this.afford();
  },
  afford() { $$('#shop button[data-cost], #rack button[data-cost]').forEach(b => { b.disabled = S.coins < +b.dataset.cost || b.dataset.ok !== '1'; }); },
};
const AscendView = {
  open() {
    const A = asc(), need = ASC[A]; if (!Game.canAscend()) return;
    UI.moodLock = 'asc';
    UI.modal(`${ico('asc', 'bigicon')}<h3 class="purple">Ascend to ${ROMAN[A + 1]}?</h3><p>Is it worth the risk?</p>
      <ul class="trade">
        <li class="bad">Every board gets ${10 * (A + 1)}% more mines than normal (now ${10 * A}%)</li>
        <li class="bad">Double or Nothing and Coin Flip odds drop to ${100 - 5 * (A + 1)}% of normal</li>
        <li class="good">Max stakes ×2.5 again: ${fmtX(ASC_CAP ** (A + 1))}× normal</li>
        <li class="good">Risky digs pay ${25 * (A + 1)}% more, and table limits rise to ${100 + 50 * (A + 1)}%</li>
        <li class="good">Unlocks board slot ${A + 5} (bought separately)</li>
      </ul>
      <p class="warn">Costs ${fmt(need.cost)}. There’s no going back down.</p>
      <button class="btn purple big hold" type="button" id="holdBtn"><i></i><span>Hold to ascend</span></button>
      <button class="btn ghost" type="button" data-a="no">Not yet</button>`, { no: () => UI.closeModal() });
    UI.holdButton($('#holdBtn'), 1300, () => { UI.closeModal(); Game.ascend(); });
  },
};
