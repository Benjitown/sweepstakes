// Add-on cards: the strip above the tables and the rack in the shop.
import { $, $$, ico, fmt, esc, clock } from '../core/util.js';
import { RAR, ABY } from '../data/addons.js';
import { S, slotsMax } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Game } from '../game/game.js';
import { Rack } from '../game/rack.js';
import { UI } from './ui.js';
import { ShopView } from './shop-view.js';

const cardFace = id => `<span class="face">${ico(ABY[id].art)}<span class="nm">${esc(ABY[id].name)}</span></span>`;
export const AddonStrip = {
  render() {
    const el = $('#addons'), max = slotsMax();
    let html = `<div class="ahead"><h2>Add-ons <small>${S.addons.length}/${max}</small></h2><p class="hint">${S.addons.length ? 'Tap a card to read it or sell it.' : 'Buy add-on cards in the shop’s Add-ons tab. They bend the rules.'}</p></div><div class="slots">`;
    S.addons.forEach((a, k) => { html += `<button class="acard ${ABY[a.id].r}" type="button" data-k="${k}" data-id="${a.id}" style="--d:-${(k * .53).toFixed(2)}s" aria-label="${esc(ABY[a.id].name)}">${cardFace(a.id)}</button>`; });
    for (let k = S.addons.length; k < max; k++) html += '<span class="slot-empty" aria-hidden="true"></span>';
    el.innerHTML = html + '</div>';
    $$('.acard', el).forEach(c => c.onclick = () => this.inspect(+c.dataset.k));
  },
  inspect(k) {
    const a = S.addons[k]; if (!a) return; const d = ABY[a.id], back = Math.floor(a.paid / 2);
    UI.modal(`<div class="acard big ${d.r}">${cardFace(a.id)}</div><h3>${esc(d.name)}</h3><span class="rar ${d.r}">${RAR[d.r].label}</span><p>${esc(d.desc)}</p>
      <div class="row"><button class="btn red" type="button" data-a="sell">Sell for ${fmt(back)}</button><button class="btn ghost" type="button" data-a="keep">Keep it</button></div>`,
      { sell: () => { UI.closeModal(); Sound.buy(); Game.sellAddon(k); }, keep: () => UI.closeModal() });
  },
  jiggle(id) { const card = $(`#addons .acard[data-id="${id}"]`); if (card) { card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop'); } },
};
export const RackView = {
  render() {
    const el = $('#rack'), full = S.addons.length >= slotsMax();
    let html = `<p class="hint">${full ? 'Your slots are full. Sell a card to make room.' : `Slots ${S.addons.length}/${slotsMax()}.`} New stock in <span id="rackT" class="num">${clock(Rack.restockIn())}</span>.</p><div class="rack">`;
    S.rack.forEach((id, k) => {
      if (!id || !ABY[id]) { html += `<div class="offer sold"><span class="price">Sold</span><span class="slot-empty"></span></div>`; return; }
      const d = ABY[id], price = Rack.price(id);
      html += `<div class="offer"><span class="price num">${fmt(price)}</span><div class="acard ${d.r}" style="--d:-${(k * .7).toFixed(2)}s">${cardFace(id)}</div>
        <span class="rar ${d.r}">${RAR[d.r].label}</span><p>${esc(d.desc)}</p>
        <button class="btn green" type="button" data-buy="${k}" data-cost="${price}" data-ok="${full ? 0 : 1}">Buy</button></div>`;
    });
    html += `</div><div class="rackbar"><button class="btn green" type="button" id="reroll" data-cost="${Rack.rerollCost()}" data-ok="1">Reroll · ${fmt(Rack.rerollCost())}</button><span class="hint">Cards sell back for half.</span></div>`;
    el.innerHTML = html;
    $$('[data-buy]', el).forEach(bt => bt.onclick = () => Game.buyAddon(+bt.dataset.buy));
    $('#reroll').onclick = () => { if (Rack.reroll()) Sound.card(); };
    ShopView.afford();
  },
  tick() { const el = $('#rackT'); if (el) el.textContent = clock(Rack.restockIn()); },
};
