// The Fruity (the booth's fifth tab): three reels behind glass and a win line, a Hold/Nudge button under each reel,
// lamps for nudges and holds, the win meter with Collect and Gamble, the stakes and the paytable.
// src/game/fruity.js decides everything; this only shows it (the reels really do spin through their bands).
import { $, $$, fmt, esc, rnd, reduced } from '../core/util.js';
import { TABLES } from '../data/economy.js';
import { FRUITY_SYMBOLS, FRUITY_REELS, FRUITY_PAYS, FRUITY_CHERRIES, FRUITY_STAKES } from '../data/fruity.js';
import { bus } from '../core/bus.js';
import { S, has } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Game } from '../game/game.js';
import { Fruity } from '../game/fruity.js';
import { FruityRules } from '../game/fruity-rules.js';
import { UI } from './ui.js';

const fsym = c => `<svg viewBox="0 0 64 64" class="fsym" aria-hidden="true"><use href="#i-${FRUITY_SYMBOLS[c].id}"/></svg>`;
// a reel's stops from..to (they wrap round), top to bottom
const fcells = (r, from, to) => { let h = ''; for (let p = from; p <= to; p++) h += `<i>${fsym(FruityRules.at(r, p))}</i>`; return h; };
const fname = line => FRUITY_SYMBOLS[line[0]].many;
const FRUITY_BLURB = ['Three on the line pays. Two cherries on the left pay ×2.', 'Feeling lucky?', 'It’s due. Probably.',
  'Hold. Nudge. Win. In theory.', 'Kev swears it paid out on Tuesday.'];

export const FruityView = {
  busy: false,     // reels turning, or the gamble lights flashing
  spinning: false, // reels turning: the go's nudges or holds stay secret until they stop
  STOP_MS: 650, GAP_MS: 330, // when the first reel stops, and the gap to the next one
  open() {
    if (!has('flip')) return UI.toast('The Fruity is in the corner of the Flip Booth. Buy the booth first.');
    if (this.busy) return;
    this.render();
  },
  live() { return !!$('#fReels', UI.el.box); },
  render() {
    const m = Fruity.machine();
    UI.modal(`${UI.boothTabs('fruity')}<div class="fruity">
      <div class="cab"><div class="marquee"><h3>The Fruity</h3><span class="bulbs" aria-hidden="true">${'<i></i>'.repeat(12)}</span></div>
        <div class="reels" id="fReels" role="img" aria-label="">${[0, 1, 2].map(r => `<div class="reel" data-r="${r}"><div class="strip">${fcells(r, m.pos[r] - 1, m.pos[r] + 1)}</div></div>`).join('')}<b class="winline" aria-hidden="true"></b></div>
        <div class="rbtns">${[0, 1, 2].map(r => `<button type="button" class="rbtn" data-r="${r}" disabled>Hold</button>`).join('')}</div>
        <div class="lamps"><span class="lamp" id="fNudge">Nudges <b>0</b></span><span class="lamp" id="fHold">Hold</span><span class="meter" id="fMeter">Win <b class="num">0</b></span></div>
        <div class="fgamble" id="fGambleLights" hidden><span data-g="0">Lose it</span><span data-g="1">Double</span></div></div>
      <p class="fmsg" id="fMsg" aria-live="polite">${esc(rnd(FRUITY_BLURB))}</p>
      <div class="fplay"><div class="fstakes" role="radiogroup" aria-label="Stake a go">${FRUITY_STAKES.map(k => `<button type="button" role="radio" data-kind="${k.id}" title="${esc(k.name)}"><b class="num">${fmt(Fruity.price(k))}</b></button>`).join('')}</div>
        <button class="btn gold big" type="button" id="fSpin">Spin</button></div>
      <div class="row fbtns"><button class="btn green" type="button" id="fCollect" hidden>Collect</button>
        <button class="btn purple" type="button" id="fGamble" title="Double or nothing" hidden>Gamble</button>
        <button class="btn ghost" type="button" id="fSkip" hidden>No thanks</button><button class="btn ghost" type="button" data-a="close">Leave</button></div>
      <ul class="fpays" aria-label="What pays">${Object.entries(FRUITY_PAYS).map(([c, x]) => `<li title="Three ${esc(FRUITY_SYMBOLS[c].many.toLowerCase())}">${fsym(c)}<b>×${x}</b></li>`).join('')}
        <li title="Two cherries on the left">${fsym('C')}${fsym('C')}<b>×${FRUITY_CHERRIES}</b></li></ul></div>`, { close: () => this.leave() });
    $$('.fstakes button', UI.el.box).forEach(b => b.onclick = () => { if (Fruity.setStake(b.dataset.kind)) { Sound.select(FRUITY_STAKES.findIndex(k => k.id === b.dataset.kind)); this.sync(); } });
    $$('.rbtn', UI.el.box).forEach(b => b.onclick = () => this.reel(+b.dataset.r));
    $('#fSpin').onclick = () => this.spin();
    $('#fCollect').onclick = () => this.collect();
    $('#fGamble').onclick = () => this.gamble();
    $('#fSkip').onclick = () => { Fruity.skipNudges(); this.msg('Nudges gone. Spin again?'); this.sync(); };
    this.sync();
  },
  msg(t) { const el = $('#fMsg'); if (el) el.textContent = t; },
  // buttons, lamps and labels to match the machine
  sync() {
    if (!this.live()) return;
    const m = Fruity.machine(), price = Fruity.price(m.kind), busy = this.busy, hide = this.spinning;
    const owed = hide ? 0 : Fruity.owed(), nudges = hide ? 0 : m.nudges, holdsOn = !hide && m.holdsOn, held = holdsOn ? m.held : [false, false, false];
    $$('.fstakes button', UI.el.box).forEach(b => { const k = FRUITY_STAKES.find(x => x.id === b.dataset.kind), on = k === m.kind;
      b.setAttribute('aria-checked', on); b.classList.toggle('on', on); b.disabled = busy || holdsOn || !!nudges || (!on && S.coins + owed < Fruity.price(k)); });
    $$('.rbtn', UI.el.box).forEach(b => { const r = +b.dataset.r;
      b.disabled = busy || !(nudges || holdsOn);
      b.classList.toggle('held', held[r]); b.classList.toggle('nudge', !!nudges);
      b.textContent = nudges ? 'Nudge ▼' : held[r] ? 'Held' : 'Hold';
      b.setAttribute('aria-pressed', held[r]);
      b.setAttribute('aria-label', nudges ? `Nudge reel ${r + 1} down one` : `Hold reel ${r + 1}`); });
    $$('.reel', UI.el.box).forEach(el => el.classList.toggle('held', held[+el.dataset.r]));
    const nl = $('#fNudge'); nl.classList.toggle('lit', !!nudges); nl.querySelector('b').textContent = nudges;
    $('#fHold').classList.toggle('lit', holdsOn);
    const meter = $('#fMeter'); meter.classList.toggle('lit', owed > 0); meter.querySelector('b').textContent = fmt(owed);
    const spin = $('#fSpin');
    spin.textContent = `Spin · ${fmt(price)}`; spin.disabled = busy || !!nudges || S.coins + owed < price;
    $('#fCollect').hidden = !owed || busy; $('#fGamble').hidden = !owed || busy;
    $('#fGamble').disabled = !Fruity.canGamble();
    $('#fSkip').hidden = !nudges || busy;
    $$('.booth button', UI.el.box).forEach(b => { b.disabled = busy; });
    $('[data-a="close"]', UI.el.box).disabled = busy;
    $('#fReels').setAttribute('aria-label', hide ? 'The reels are spinning' : `The line shows ${FruityRules.line(m.pos).map(c => FRUITY_SYMBOLS[c].one).join(', ')}`);
    UI.modalLocked = busy || Fruity.owed() > 0 || !!m.nudges; // Escape can't walk off with coins in the meter
  },

  /* a go */
  spin() {
    if (this.busy || !Fruity.canSpin()) return;
    const g = Fruity.spin(); if (!g) return; // (anything in the meter goes in your pocket first)
    Game.setCoins(S.coins); Sound.buy();
    this.busy = this.spinning = true; $('#fReels').classList.remove('won');
    this.msg(g.heldGo ? 'Holding…' : 'Round they go…'); this.sync();
    const stops = [0, 1, 2].map(r => g.held[r] ? 0 : this.STOP_MS + this.GAP_MS * [0, 1, 2].filter(k => !g.held[k] && k < r).length);
    const last = Math.max(...stops);
    let whirr = setInterval(() => Sound.tick(), 75);
    [0, 1, 2].forEach(r => { if (!g.held[r]) this.turn(r, g.from[r], g.pos[r], stops[r], 1 + r); });
    setTimeout(() => { clearInterval(whirr); whirr = 0; this.landed(g); }, last + (reduced ? 0 : 120));
  },
  // one reel spins from stop p0 to stop q: loops times round its band, then on to q (it runs top to bottom, like the real thing)
  turn(r, p0, q, ms, loops) {
    const reel = $(`.reel[data-r="${r}"]`, UI.el.box); if (!reel) return;
    const n = FRUITY_REELS[r].length, d = ((p0 - q) % n + n) % n + loops * n, strip = reel.querySelector('.strip');
    if (reduced) { setTimeout(() => this.place(r, q), ms); return; }
    strip.innerHTML = fcells(r, q - 2, q + d + 1); // one spare stop on top, for the bounce
    const len = d + 4, from = `translateY(${(-100 * (d + 1) / len).toFixed(4)}%)`, to = `translateY(${(-100 / len).toFixed(4)}%)`;
    reel.classList.add('spinning');
    const a = strip.animate([{ transform: from }, { transform: to }], { duration: ms, easing: 'cubic-bezier(.25,.6,.35,1.08)', fill: 'forwards' });
    setTimeout(() => reel.classList.remove('spinning'), ms * .7);
    a.finished.then(() => { this.place(r, q); Sound.reel(r); }).catch(() => {});
  },
  // a reel at rest: just its three stops
  place(r, q) {
    const reel = $(`.reel[data-r="${r}"]`, UI.el.box); if (!reel) return;
    const strip = reel.querySelector('.strip'); strip.getAnimations().forEach(a => a.cancel()); strip.style.transform = '';
    strip.innerHTML = fcells(r, q - 1, q + 1);
  },
  landed(g) {
    this.busy = this.spinning = false;
    if (!this.live()) return; // left mid-spin: the win's in the meter, paid next time
    [0, 1, 2].forEach(r => this.place(r, g.pos[r]));
    if (g.x) this.winLine(g.x, g.line, false);
    else if (g.nudges) { this.msg(`${g.nudges} nudge${g.nudges > 1 ? 's' : ''}! Tap a reel to drop the symbol above onto the line.`); Sound.select(3); }
    else if (g.holds) { this.msg(Fruity.machine().held.some(Boolean) ? 'Holds! The machine’s picked the best ones. Change them if you like, then spin.' : 'Holds! Hold up to two reels, then spin.'); Sound.select(1); }
    else this.msg(g.dry >= 5 ? rnd(['Nothing. It’s definitely due now.', 'Nothing again.', 'It’s warming up. Probably.']) : rnd(['Nothing.', 'Not this time.', 'So close. (It wasn’t.)']));
    this.sync();
    bus.emit('fruity', { x: g.x, win: g.win, line: g.line, nudged: false, nudges: g.nudges, holds: g.holds, dry: g.dry, price: g.price });
    this.broke();
  },
  // light up the win line, fill the meter
  winLine(x, line, nudged) {
    const reels = $('#fReels'); reels.classList.remove('won'); void reels.offsetWidth; reels.classList.add('won');
    const two = !(line[0] === line[1] && line[1] === line[2]);
    this.msg(`${nudged ? 'Nudged in! ' : ''}${two ? 'Two cherries' : fname(line)}: ×${x}. Collect it, or gamble it.`);
    x >= 250 ? Sound.bigwin(3) : x >= 25 ? Sound.win() : Sound.cash();
  },
  // tap a reel button: hold it (when holds are lit) or nudge it (when there are nudges)
  reel(r) {
    if (this.busy) return;
    const m = Fruity.machine();
    if (m.nudges) return this.nudge(r);
    if (m.holdsOn && Fruity.toggleHold(r)) { Sound.toggle(m.held[r]); this.sync(); }
    else if (m.holdsOn) this.msg(`Two holds at most.`);
  },
  nudge(r) {
    const from = Fruity.machine().pos[r], n = Fruity.nudge(r); if (!n) return;
    Sound.nudge();
    const reel = $(`.reel[data-r="${r}"]`, UI.el.box), strip = reel && reel.querySelector('.strip');
    if (strip && !reduced) {
      strip.innerHTML = fcells(r, from - 2, from + 1);
      strip.animate([{ transform: 'translateY(-25%)' }, { transform: 'translateY(0)' }], { duration: 240, easing: 'cubic-bezier(.3,1.5,.5,1)' })
        .finished.then(() => this.place(r, n.pos[r])).catch(() => {});
    } else this.place(r, n.pos[r]);
    if (n.x) { this.winLine(n.x, n.line, true); bus.emit('fruity', { x: n.x, win: n.win, line: n.line, nudged: true, nudges: 0, holds: false, dry: 0, price: n.price }); }
    else if (n.left) this.msg(`${n.left} nudge${n.left > 1 ? 's' : ''} left.`);
    else this.msg('Out of nudges. Spin again?');
    this.sync();
    if (!n.x && !n.left) this.broke();
  },
  collect() {
    const owed = Fruity.collect(); if (!owed) return;
    Sound.cash(); Game.setCoins(S.coins, true, { from: $('#fMeter'), amount: owed });
    this.msg(`+${fmt(owed)} in your pocket.`); this.sync();
  },
  // double or nothing: the two lights flash back and forth, slowing down, and stop on the answer (already decided)
  gamble() {
    if (this.busy || !Fruity.canGamble()) return;
    const g = Fruity.gamble(); if (!g) return;
    this.busy = true; this.sync();
    const box = $('#fGambleLights'), lights = $$('span', box); box.hidden = false;
    let k = 0, wait = 45; const steps = g.won ? 13 : 14; // the last flash lands on Double (odd) for a win, Lose it (even) for a loss
    const flash = () => {
      lights.forEach((l, i) => l.classList.toggle('lit', i === k % 2)); Sound.gamble(k % 2);
      if (++k <= steps) { wait *= 1.12; setTimeout(flash, wait); return; }
      setTimeout(() => this.gambled(g), 380);
    };
    if (reduced) { lights.forEach((l, i) => l.classList.toggle('lit', i === (g.won ? 1 : 0))); setTimeout(() => this.gambled(g), 300); } else flash();
  },
  gambled(g) {
    this.busy = false;
    if (!this.live()) return;
    $('#fGambleLights').hidden = true;
    if (g.won) { this.msg(`Doubled! ${fmt(g.owed)} in the meter.${Fruity.canGamble() ? ' Again?' : ' That’s your lot: collect it.'}`); Sound.cash(); }
    else { this.msg(`Gone. ${fmt(g.stake)}, just like that.`); Sound.unflag(); }
    this.sync();
    bus.emit('fruity:gamble', g);
    if (!g.won) this.broke();
  },
  // walking away pays the meter and closes the booth
  leave() { this.collect(); UI.closeModal(); },
  // switching to another booth tab pays the meter too
  away() { if (Fruity.owed() && !this.busy) { Fruity.collect(); Game.setCoins(S.coins); } },
  // skint (nothing in the meter, can't afford a go, no boards on): closing lets the bust check happen
  broke() {
    const m = Fruity.machine();
    if (Fruity.owed() || m.nudges || m.holdsOn || S.coins >= TABLES[0].min || Game.slots.some(Boolean)) return;
    if (FRUITY_STAKES.some(k => S.coins >= Fruity.price(k))) return;
    setTimeout(() => { if (this.live() && !this.busy) UI.closeModal(); }, 1800);
  },
  keys(e) { // 1 2 3 work the buttons under the reels
    if (!this.live() || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const r = { 1: 0, 2: 1, 3: 2 }[e.key]; if (r === undefined) return;
    const b = $(`.rbtn[data-r="${r}"]`, UI.el.box); if (b && !b.disabled) { e.preventDefault(); b.click(); }
  },
  bind() { document.addEventListener('keydown', e => this.keys(e)); },
};
