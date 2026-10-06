// The car boot sale on screen: the card at the bottom of the screen that says he's set up, and the stall itself (his
// cards and prices, Buy and Offer, the mystery box, and how long until he packs up). src/game/car-boot.js does the deals.
import { $, $$, fmt, esc, rnd, ico, clock } from '../core/util.js';
import { RAR, ABY } from '../data/addons.js';
import { BOOT_SAYS } from '../content/car-boot.js';
import { S } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Game } from '../game/game.js';
import { Rack } from '../game/rack.js';
import { CarBoot } from '../game/car-boot.js';
import { UI } from './ui.js';
import { cardFace } from './addon-views.js';
import { HouseholdView } from './household-view.js';

export const CarBootView = {
  tick: 0,
  // he's set up: a card at the bottom of the screen
  invite() {
    HouseholdView.show({ icon: 'boot', mood: 'good', title: 'Car boot sale', ms: 15000,
      text: 'A bloke’s set up a pasting table at the end of the road. Add-on cards at boot-sale prices, a mystery box, and he’ll haggle.',
      buttons: [['Have a look', 'gold', () => { CarBoot.open(); this.open(); }], ['Not today', 'ghost']] });
  },
  open() {
    const st = CarBoot.stall; if (!st) return;
    UI.modal(`<div class="bootsale"><h3>${ico('boot', 'ic')} The car boot sale</h3>
      <p class="hint">He packs up in <b class="num" id="bootT">${clock(CarBoot.left())}</b>. No refunds. Cards still sell back for half what you paid.</p>
      <div class="boot" id="bootTable"></div>
      <p class="bootmsg" id="bootMsg" aria-live="polite">${esc(rnd(BOOT_SAYS.hello))}</p>
      <button class="btn ghost" type="button" data-a="close">Leave</button></div>`, { close: () => this.leave() });
    this.render();
    clearInterval(this.tick);
    this.tick = setInterval(() => this.second(), 1000);
  },
  live() { return !!$('#bootTable', UI.el.box); },
  say(t) { const el = $('#bootMsg'); if (el) el.textContent = t; },
  render() {
    const st = CarBoot.stall, el = $('#bootTable'); if (!st || !el) return;
    const room = CarBoot.room();
    el.innerHTML = st.cards.map((c, k) => {
      const d = ABY[c.id], shop = Rack.price(c.id), off = CarBoot.offer(k);
      if (c.sold || c.gone) return `<div class="offer sold"><span class="price">${c.sold ? 'Yours' : 'Gone'}</span><div class="acard ${d.r} dim">${cardFace(c.id)}</div><p>${esc(d.name)}</p></div>`;
      return `<div class="offer"><span class="price num">${fmt(c.price)}</span><div class="acard ${d.r}">${cardFace(c.id)}</div>
        <span class="rar ${d.r}">${RAR[d.r].label}</span><p>${esc(d.desc)}</p><small class="was ${c.price < shop ? 'cheap' : 'dear'}">Shop price ${fmt(shop)}</small>
        <div class="row"><button class="btn green" type="button" data-bbuy="${k}" ${room && S.coins >= c.price ? '' : 'disabled'}>Buy</button>
        ${off ? `<button class="btn blue" type="button" data-offer="${k}" ${room && S.coins >= off ? '' : 'disabled'}>Offer ${fmt(off)}</button>` : ''}</div></div>`;
    }).join('') + `<div class="offer mbox"><span class="price num">${st.boxSold ? 'Yours' : fmt(st.box)}</span><div class="acard box">${ico('boot')}<b>?</b></div>
      <span class="rar">Mystery box</span><p>Any card you haven’t got. Could be a rare one. Probably isn’t.</p>
      ${st.boxSold ? '' : `<button class="btn gold" type="button" data-box ${room && S.coins >= st.box ? '' : 'disabled'}>Take a punt</button>`}</div>`;
    $$('[data-bbuy]', el).forEach(b => b.onclick = () => this.buy(+b.dataset.bbuy));
    $$('[data-offer]', el).forEach(b => b.onclick = () => this.haggle(+b.dataset.offer));
    const bx = $('[data-box]', el); if (bx) bx.onclick = () => this.box();
  },
  buy(k) {
    const r = CarBoot.buy(k);
    this.say(r === 'ok' ? rnd(BOOT_SAYS.bought) : rnd(BOOT_SAYS[r] || BOOT_SAYS.done));
    if (r === 'ok') Game.setCoins(S.coins);
    this.render();
  },
  haggle(k) {
    const price = CarBoot.offer(k), r = CarBoot.haggle(k);
    this.say(r === 'yes' ? `${rnd(BOOT_SAYS.yes)} Yours for ${fmt(price)}.` : rnd(BOOT_SAYS[r] || BOOT_SAYS.done));
    if (r === 'yes') Game.setCoins(S.coins); else if (r === 'no' || r === 'walk') Sound.unflag();
    this.render();
  },
  box() {
    const r = CarBoot.box();
    if (ABY[r]) { this.say(`${rnd(BOOT_SAYS.box)} Inside: ${ABY[r].name}.`); Game.setCoins(S.coins); } else this.say(rnd(BOOT_SAYS[r] || BOOT_SAYS.done));
    this.render();
  },
  second() {
    if (!this.live()) { clearInterval(this.tick); return; }
    const left = CarBoot.left(), t = $('#bootT'); if (t) t.textContent = clock(left);
    if (left > 0) return;
    clearInterval(this.tick); CarBoot.close();
    this.say(rnd(BOOT_SAYS.bye)); $$('#bootTable button').forEach(b => { b.disabled = true; });
    setTimeout(() => { if (this.live()) UI.closeModal(); }, 1800);
  },
  leave() { clearInterval(this.tick); CarBoot.close(); UI.closeModal(); },
};
