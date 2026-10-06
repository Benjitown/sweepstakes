// KEVCOIN on screen: a ticker in the group chat's header, and the trading window (the price and its chart, your
// holding and where you'd break even, Buy and Sell). src/game/kevcoin.js runs the market; this just watches it.
import { $, $$, ico, fmt, esc, rnd } from '../core/util.js';
import { KEV } from '../data/kevcoin.js';
import { S, baseCap } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Game } from '../game/game.js';
import { Kev } from '../game/kevcoin.js';
import { UI } from './ui.js';

// a price: whole coins when it's big, a few significant figures when it's small (it gets very small)
export const fmtKev = p => p >= 1000 ? fmt(p) : p >= 1 ? p.toFixed(2) : p >= .001 ? p.toPrecision(3) : p.toExponential(1);
const KEV_SMALL = ['Not financial advice. (It is, though. Bad advice.)', 'Kev takes 5% going in and 5% coming out. Kev always wins.',
  'Past performance is not a guide to anything. Neither is Kev.', 'Your capital is at risk. So is Kev’s, mostly from Kev.'];

export const KevView = {
  bind() { $('#kevTicker').onclick = () => this.open(); this.ticker(); },
  open() {
    if (!Kev.launched()) return UI.toast('Kev hasn’t launched his coin yet. Give him time.');
    UI.modal(`<div class="kevwin"><h3 class="kevh">${ico('kevcoin')}KEVCOIN <small id="kevVer"></small></h3>
      <div class="kevprice"><b class="num" id="kevPrice"></b><span id="kevChg"></span></div>
      <svg class="kevchart" id="kevChart" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="kevfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".35"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
        <polygon id="kevArea" fill="url(#kevfill)"/><polyline id="kevLine" fill="none" stroke="currentColor" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
        <line id="kevEven" x1="0" x2="300" stroke="#ffd23f" stroke-width="1.5" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/></svg>
      <p class="kevnote" id="kevNote" aria-live="polite"></p>
      <dl class="kevhold"><dt>You hold</dt><dd class="num" id="kevUnits"></dd><dt>Worth</dt><dd class="num" id="kevValue"></dd><dt>Paid</dt><dd class="num" id="kevPaid"></dd></dl>
      <div class="row kevbuy">${KEV.BUYS.map((x, i) => `<button class="btn green" type="button" data-buy="${i}"></button>`).join('')}</div>
      <div class="row"><button class="btn red" type="button" data-sell=".5">Sell half</button><button class="btn red" type="button" data-sell="1">Sell all</button></div>
      <p class="hint">${esc(rnd(KEV_SMALL))}</p>
      <button class="btn ghost" type="button" data-a="close">Leave</button></div>`, { close: () => UI.closeModal() });
    $$('[data-buy]', UI.el.box).forEach(b => b.onclick = () => this.buy(Math.round(baseCap() * KEV.BUYS[+b.dataset.buy])));
    $$('[data-sell]', UI.el.box).forEach(b => b.onclick = () => this.sell(+b.dataset.sell));
    this.update();
  },
  live() { return !!$('#kevChart', UI.el.box); },
  // change over the last minute of trading
  change(k) { const h = k.hist, then = h[Math.max(0, h.length - 1 - 60 / KEV.TICK_S)]; return then ? k.price / then - 1 : 0; },
  ticker() {
    const t = $('#kevTicker'), k = Kev.state(); if (!t) return;
    t.hidden = !k; if (!k) return;
    const c = this.change(k);
    t.classList.toggle('dead', !!k.dead); t.classList.toggle('up', !k.dead && c >= 0); t.classList.toggle('down', !k.dead && c < 0);
    t.innerHTML = `${ico('kevcoin')}<span>KEV</span><b class="num">${fmtKev(k.price)}</b><i>${k.dead ? 'suspended' : `${c >= 0 ? '▲' : '▼'}${Math.abs(c * 100).toFixed(1)}%`}</i>`;
    t.setAttribute('aria-label', `KEVCOIN ${fmtKev(k.price)}, ${k.dead ? 'trading suspended' : `${c >= 0 ? 'up' : 'down'} ${Math.abs(c * 100).toFixed(1)}% in the last minute`}. Open the KEVCOIN window`);
  },
  update() {
    this.ticker();
    const k = Kev.state(); if (!k || !this.live()) return;
    const c = this.change(k), up = c >= 0;
    $('#kevVer').textContent = k.v > 1 ? `${k.v}.0` : '';
    $('#kevPrice').textContent = fmtKev(k.price);
    const chg = $('#kevChg'); chg.className = k.dead ? 'dead' : up ? 'up' : 'down'; chg.textContent = k.dead ? 'trading suspended' : `${up ? '▲' : '▼'} ${Math.abs(c * 100).toFixed(1)}% this minute`;
    this.chart(k);
    const value = Kev.value(), even = k.units ? k.paid / (k.units * (1 - KEV.FEE)) : 0;
    $('#kevUnits').textContent = k.units ? `${fmtKev(k.units)} KEV` : 'none';
    $('#kevValue').textContent = k.units ? `${fmt(value)} (${fmt(Math.floor(value * (1 - KEV.FEE)))} after Kev’s cut)` : '—';
    $('#kevPaid').textContent = k.units ? `${fmt(Math.round(k.paid))} · break even at ${fmtKev(even)}` : '—';
    const room = Kev.room();
    $$('[data-buy]', UI.el.box).forEach(b => { const want = Math.round(baseCap() * KEV.BUYS[+b.dataset.buy]);
      b.textContent = `Buy ${fmt(want)}`; b.disabled = !!k.dead || S.coins < 1 || room < 1; });
    $$('[data-sell]', UI.el.box).forEach(b => { b.disabled = !!k.dead || !k.units; });
    $('#kevNote').textContent = k.dead ? 'The devs have gone quiet. Trading is suspended while Kev “looks into it”.'
      : room < 1 ? `That’s the most Kev’s exchange will let you hold (${fmt(Kev.cap())}).` : k.hype === 'pump' ? 'Something’s happening…' : '';
  },
  // the last few minutes of prices, scaled to fit, green if it's up on the window and red if it's down; the dashed line is
  // where you'd break even after Kev's cut
  chart(k) {
    const h = k.hist, lo = Math.min(...h), hi = Math.max(...h), span = hi - lo || hi * .01 || 1, n = Math.max(1, KEV.HIST - 1);
    const y = p => (92 - 84 * (p - lo) / span).toFixed(1), x = i => (300 * (i + KEV.HIST - h.length) / n).toFixed(1);
    const pts = h.map((p, i) => `${x(i)},${y(p)}`).join(' ');
    $('#kevLine').setAttribute('points', pts);
    $('#kevArea').setAttribute('points', `${x(0)},100 ${pts} 300,100`);
    $('#kevChart').classList.toggle('down', h[h.length - 1] < h[0]);
    const even = k.units ? k.paid / (k.units * (1 - KEV.FEE)) : 0, ev = $('#kevEven');
    ev.style.display = even && even >= lo && even <= hi ? '' : 'none';
    if (even) { ev.setAttribute('y1', y(even)); ev.setAttribute('y2', y(even)); }
  },
  buy(coins) {
    const r = Kev.buy(coins);
    if (!r) return UI.toast(Kev.room() < 1 ? 'Kev’s exchange won’t let you hold any more.' : 'You can’t afford that.');
    Sound.buy(); Game.setCoins(S.coins); this.update();
  },
  sell(share) {
    const r = Kev.sell(share); if (!r) return;
    r.profit >= 0 ? Sound.cash() : Sound.unflag();
    Game.setCoins(S.coins, r.profit > 0, r.profit > 0 ? { from: $('#kevValue'), amount: r.coins } : null);
    UI.toast(r.profit >= 0 ? `Sold for ${fmt(r.coins)}: +${fmt(r.profit)}.` : `Sold for ${fmt(r.coins)}: −${fmt(-r.profit)}. Kev thanks you for your liquidity.`);
    this.update();
  },
};
