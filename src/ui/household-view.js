// Around the house, on screen: the "someone's at the door" card, the kitten, the seagull after your coins, the smoke detector chip.
import { $, rnd, ico, fmt, esc, reduced } from '../core/util.js';
import { ABY } from '../data/addons.js';
import { bus } from '../core/bus.js';
import { S, has } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { WeirdNoises } from '../audio/noises.js';
import { Game } from '../game/game.js';
import { Household, MISSED } from '../game/household.js';
import { PowerCut } from '../game/power-cut.js';
import { Storm } from '../game/storm.js';
import { UI } from './ui.js';
import { Coach } from './tutorial.js';

// what each event says before you decide (one line per noise that starts it)
const ASK = {
  door: { icon: 'door', mood: 'weird', title: 'Someone’s at the door', yes: 'Answer it', no: 'Ignore it',
    knock: ['Three knocks. Firm ones.', 'Knock knock. You know how this goes.', 'Somebody’s knocking like they mean it.'],
    doorbell: ['Ding dong. Nobody uses the doorbell. Suspicious.', 'The doorbell! You’re not expecting anyone. You never are.'] },
  phone: { icon: 'phone', mood: 'weird', title: 'The phone’s ringing', yes: 'Answer it', no: 'Let it ring',
    phone: ['The landline. Nobody has the landline number.', 'Unknown number. Could be anyone. Could be Nan.'] },
  toast: { icon: 'toast', mood: 'bad', title: 'Someone burnt the toast', yes: 'Wave a tea towel at it', no: 'Leave it',
    alarm: ['The smoke alarm is going mental.', 'BEEP BEEP BEEP. The whole street knows about your toast.'] },
};
const OK = { good: ['Lovely', 'green'], bad: ['Typical', 'ghost'], weird: ['Right then', 'purple'] };
const ASK_MS = 12000, SHOW_MS = 9000;

const HEART = '<svg viewBox="0 0 22 20" class="kheart" aria-hidden="true"><path d="M11 18 L3 10 A4.6 4.6 0 0 1 11 4 A4.6 4.6 0 0 1 19 10 Z" fill="#ff8fb0" stroke="#141b1d" stroke-width="2" stroke-linejoin="round"/></svg>';
const leg = (x, cls) => `<g class="kl ${cls}"><path d="M${x} 38 V51" stroke="#141b1d" stroke-width="9" stroke-linecap="round"/><path d="M${x} 38 V51" stroke="#ffa31a" stroke-width="4.5" stroke-linecap="round"/></g>`;
// a ginger kitten, side on, walking right (legs and tail animate in css/household.css)
const KITTEN_SVG = `<svg viewBox="0 0 90 60" aria-hidden="true">
  <g class="ktail"><path d="M18 32 C8 32 3 22 8 9" fill="none" stroke="#141b1d" stroke-width="10" stroke-linecap="round"/><path d="M18 32 C8 32 3 22 8 9" fill="none" stroke="#ffa31a" stroke-width="5" stroke-linecap="round"/></g>
  ${leg(24, 'a')}${leg(31, 'b')}${leg(50, 'b')}${leg(57, 'a')}
  <ellipse cx="40" cy="32" rx="24" ry="13" fill="#ffa31a" stroke="#141b1d" stroke-width="3.5"/>
  <path d="M28 21 q3 5 1 10 M36 19.5 q3 5 1 10 M44 20 q3 5 1 10" fill="none" stroke="#ad6800" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="43" cy="40" rx="13" ry="4.5" fill="#fff3e3"/>
  <path d="M60 22 L59 5 L69 13 Q73 12 77 13 L86 5 L85 22 Q90 30 85 38 Q79 44 72 44 Q65 44 60 38 Q55 30 60 22 Z" fill="#ffa31a" stroke="#141b1d" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M61.5 9 L66.5 13.5 L62 17 Z M83.5 9 L78.5 13.5 L83 17 Z" fill="#ff8fb0"/>
  <ellipse cx="67" cy="27" rx="3.2" ry="4" fill="#141b1d"/><ellipse cx="79" cy="27" rx="3.2" ry="4" fill="#141b1d"/>
  <circle cx="68" cy="25.5" r="1.2" fill="#fff"/><circle cx="80" cy="25.5" r="1.2" fill="#fff"/>
  <ellipse cx="73" cy="36" rx="6.5" ry="4.5" fill="#fff3e3"/>
  <path d="M71 33 h4 l-2 2.5 z" fill="#ff8fb0" stroke="#141b1d" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M66 35 L56 33 M66 37.5 L57 39 M80 35 L89 33 M80 37.5 L88 39" stroke="#141b1d" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;
// a herring gull, side on, facing right: wings up for flying (they flap in css/household.css), folded with legs out when it lands
const GULL_SVG = `<svg viewBox="0 0 96 64" aria-hidden="true">
  <g class="gwing far"><path d="M47 30 C40 15 30 7 17 7 C24 17 29 26 33 34 Z" fill="#8a9ca3" stroke="#141b1d" stroke-width="3" stroke-linejoin="round"/></g>
  <g class="glegs"><path d="M41 45 V58 M51 45 V58" stroke="#141b1d" stroke-width="6" stroke-linecap="round"/><path d="M41 45 V58 M51 45 V58" stroke="#ffb38a" stroke-width="3" stroke-linecap="round"/><path d="M36 59.5 H45 M46 59.5 H55" stroke="#141b1d" stroke-width="3" stroke-linecap="round"/></g>
  <path d="M3 30 L18 31 C21 42 32 48 46 48 C61 48 70 41 71 31 C71 25 66 21 60 21 C52 22 46 27 36 28 C29 29 22 29 16 28 Z" fill="#fff" stroke="#141b1d" stroke-width="3.5" stroke-linejoin="round"/>
  <g class="gfold"><path d="M21 30 C33 24 50 23 60 29 C53 38 37 40 23 36 Z" fill="#c9d6da" stroke="#141b1d" stroke-width="3" stroke-linejoin="round"/><path d="M8 30 L23 29 L23 36 Z" fill="#141b1d" stroke="#141b1d" stroke-width="2" stroke-linejoin="round"/></g>
  <circle cx="66" cy="21" r="11" fill="#fff"/><path d="M56.5 26 A11 11 0 1 1 75.5 26" fill="none" stroke="#141b1d" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M75 17 L92 20 Q94 26 89 27 L75 25 Z" fill="#ffd23f" stroke="#141b1d" stroke-width="2.5" stroke-linejoin="round"/><circle cx="88" cy="24.6" r="1.9" fill="#fe5f55"/>
  <circle cx="68" cy="17.5" r="2.7" fill="#141b1d"/><circle cx="69" cy="16.5" r="1" fill="#fff"/><path d="M62 12 L73 14.5" stroke="#141b1d" stroke-width="2.8" stroke-linecap="round"/>
  <g class="gwing near"><path d="M52 29 C44 12 31 2 14 2 C22 14 28 26 34 36 C41 38 47 35 52 29 Z" fill="#c9d6da" stroke="#141b1d" stroke-width="3" stroke-linejoin="round"/><path d="M14 2 C19 8 23 14 25 20 L19 19 C17 13 16 8 14 2 Z" fill="#141b1d"/></g>
  <g class="gcoin"><circle cx="87" cy="31" r="6.5" fill="#ffd23f" stroke="#141b1d" stroke-width="2.5"/><path d="M84.5 29 h4" stroke="#b98a00" stroke-width="2" stroke-linecap="round"/></g>
</svg>`;
const aCard = id => { const n = ABY[id].name; return `${/^[aeiou]/i.test(n) ? 'an' : 'a'} ${n} card`; };

export const HouseholdView = {
  card: null, timer: 0, kitten: null, gull: null,
  GULL_MS: 3600, // how long the seagull pecks at your coins before it flies off with some
  bind() { $('#chirpChip').onclick = () => this.fixBattery(); },
  // is now a good time for something to happen? Never in a window, in the tutorial, or while something else is happening.
  free() { return UI.modalClosed() && !Coach.active && !this.card && !this.kitten && !this.gull && !Storm.on; },
  start(kind, k, handle) {
    if (kind === 'kitten') this.walkKitten();
    else if (kind === 'gull') this.swoopGull();
    else if (kind === 'powercut') this.powerCut();
    else if (kind === 'storm') this.storm();
    else if (ASK[kind]) this.ask(kind, k, handle);
  },

  /* the card: bottom right (full width on phones), with buttons and a timer bar; it leaves on its own */
  show({ icon, mood = 'weird', title, text, coins = 0, buttons, ms = SHOW_MS, onTimeout }) {
    this.close();
    const el = document.createElement('div');
    el.className = 'happening ' + mood; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', title);
    el.innerHTML = `${ico(icon, 'hic')}<div class="htext"><b>${esc(title)}</b><p>${esc(text)}</p>${coins
      ? `<span class="hcoins num${coins < 0 ? ' minus' : ''}">${coins < 0 ? '−' : '+'}${fmt(Math.abs(coins))}</span>` : ''}</div>
      <div class="hbtns">${buttons.map(([label, cls], i) => `<button class="btn ${cls}" type="button" data-h="${i}">${esc(label)}</button>`).join('')}</div>
      <i class="htimer" style="--ht:${ms}ms"></i>`;
    buttons.forEach(([, , fn], i) => { el.querySelector(`[data-h="${i}"]`).onclick = () => { if (this.card !== el) return; this.close(); if (fn) fn(); }; });
    document.body.appendChild(el); this.card = el; this.lift();
    // the timer pauses while the pointer is over the card
    let left = ms, t0 = 0;
    const arm = () => { t0 = performance.now(); clearTimeout(this.timer); this.timer = setTimeout(() => { if (this.card === el) { this.close(); if (onTimeout) onTimeout(); } }, left); };
    el.addEventListener('mouseenter', () => { clearTimeout(this.timer); left = Math.max(1500, left - (performance.now() - t0)); });
    el.addEventListener('mouseleave', () => { if (this.card === el) arm(); });
    arm();
    return el;
  },
  close() { clearTimeout(this.timer); if (this.card) { this.card.remove(); this.card = null; } this.lift(); },
  // on narrower screens the toasts hop up above the card
  lift() { document.body.classList.toggle('hh-up', !!this.card); if (this.card) document.documentElement.style.setProperty('--hh', this.card.offsetHeight + 'px'); },
  clear() {
    this.close(); if (this.kitten) { this.kitten.remove(); this.kitten = null; }
    if (this.gull) { this.gull.leave(); this.gull = null; }
  },

  ask(kind, k, handle) {
    const a = ASK[kind], text = rnd(a[k] || Object.values(a).find(Array.isArray));
    const act = { door: () => Household.answerDoor(), phone: () => Household.answerPhone(), toast: () => { if (handle) handle.stop(); Household.saveToast(); } }[kind];
    const missed = () => UI.toast(rnd(MISSED[kind]));
    this.show({ icon: a.icon, mood: a.mood, title: a.title, text, ms: ASK_MS, onTimeout: missed, buttons: [[a.yes, 'green', act], [a.no, 'ghost', missed]] });
  },
  // how it went (wiring.js calls this for every 'household' event)
  outcome({ o, coins = 0, card }) {
    const vars = { coins: coins ? fmt(Math.abs(coins)) : 'nothing', cost: fmt(Household.raffleCost()), card: card ? aCard(card) : `${fmt(coins)} coins in cash` };
    const text = o.text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    let buttons = [[...OK[o.mood || 'weird']]], ms = SHOW_MS;
    if (o.fx === 'raffle') {
      ms = 15000;
      buttons = [[`Buy a ticket (${fmt(Household.raffleCost())})`, 'gold', () => { if (!Household.raffle()) UI.toast('You can’t afford a ticket. The kid looks at you with pity.'); }], ['No thanks', 'ghost']];
    }
    if (o.fx === 'duck' && has('flip')) buttons = [['Race it', 'gold', () => bus.emit('booth', 'ducks')], ['Shut the door', 'ghost']];
    const el = this.show({ icon: o.icon, mood: o.mood, title: o.title, text, coins: o.fx === 'raffle' ? 0 : coins, buttons, ms });
    if (coins) Game.setCoins(S.coins, coins > 0, coins > 0 ? { from: el.querySelector('.hic'), amount: coins } : null);
  },

  /* the kitten: wanders along the bottom of the screen; tap it for a purr and a present */
  walkKitten() {
    if (this.kitten) return;
    const rtl = Math.random() < .5, btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'kitten' + (rtl ? ' rtl' : ''); btn.setAttribute('aria-label', 'A kitten! Pet it');
    btn.innerHTML = `<span class="kb">${KITTEN_SVG}</span>`;
    document.body.appendChild(btn); this.kitten = btn;
    let petted = false, anim = null;
    const gone = () => { if (this.kitten !== btn) return; btn.remove(); this.kitten = null; bus.emit('kitten:gone', { petted }); };
    const w = innerWidth, from = rtl ? w + 10 : -94, to = rtl ? -94 : w + 10;
    if (reduced) { btn.style.transform = `translateX(${Math.round(w * .1)}px)`; setTimeout(gone, 12000); }
    else { anim = btn.animate([{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }], { duration: Math.max(8000, (w + 104) / 90 * 1000), easing: 'linear', fill: 'forwards' }); anim.onfinish = gone; }
    btn.onclick = () => {
      if (petted) return; // one pet per kitten: it's a kitten, not a fruit machine
      petted = true; btn.classList.add('pet', 'petted'); if (anim) anim.pause();
      WeirdNoises.play('purr');
      for (let k = 0; k < 3; k++) setTimeout(() => { if (!btn.isConnected) return; btn.insertAdjacentHTML('beforeend', HEART); const h = btn.lastElementChild; h.style.setProperty('--kx', (k - 1) * 18 + 'px'); setTimeout(() => h.remove(), 1300); }, k * 220);
      Household.petKitten();
      setTimeout(() => { btn.classList.remove('pet'); if (anim) anim.play(); else gone(); }, 2400);
    };
  },

  /* a power cut: the lights go out (ui/power-view.js does the dark); this card says why, and offers a top-up */
  powerCut() {
    if (!PowerCut.start()) return;
    const cost = PowerCut.cost();
    this.show({ icon: 'bulb', mood: 'bad', title: 'The meter’s run out', ms: ASK_MS,
      text: `The lights go out and the fridge sighs. Until the power’s back, boards cashed out in the dark pay +${Math.round(PowerCut.BONUS * 100)}% danger money.`,
      buttons: [[`Top up (${fmt(cost)})`, 'gold', () => { if (!PowerCut.topUp()) UI.toast('You can’t afford the meter. Torch it is.'); }], ['Play in the dark', 'purple']] });
  },

  // thunder in the distance, then the rain: the lightning shows the mines, if you're quick
  storm() {
    if (!Storm.start()) return;
    this.show({ icon: 'bolt', mood: 'weird', title: 'Thunderstorm',
      text: 'Rain’s hammering on the window. When the lightning flashes, watch your boards: for a split second you can see every mine.',
      buttons: [['Eyes peeled', 'blue']] });
  },

  /* the seagull: swoops down onto your coins and pecks at them. Tap it before it flies off with some. */
  swoopGull() {
    if (this.gull) return;
    const bank = $('#bank'), r = bank.getBoundingClientRect(), W = 84, H = 56;
    const x = Math.round(Math.min(innerWidth - W - 4, Math.max(4, r.left + r.width / 2 - W / 2))), y = Math.round(Math.max(4, r.top + r.height / 2 - H + 10));
    const fromRight = x + W / 2 < innerWidth / 2, side = d => d ? innerWidth + 30 : -W - 30; // it comes in across the screen
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'gull' + (fromRight ? ' rtl' : ''); btn.setAttribute('aria-label', 'A seagull is after your coins! Shoo it');
    btn.innerHTML = `<span class="gb">${GULL_SVG}</span>`;
    document.body.appendChild(btn); this.gull = btn;
    let state = 'in', anim = null, timer = 0, peck = 0;
    const at = (px, py) => `translate(${px}px, ${py}px)`;
    const stop = () => { clearTimeout(timer); clearInterval(peck); bank.classList.remove('pecked'); };
    const gone = () => { stop(); if (anim) anim.cancel(); btn.remove(); if (this.gull === btn) this.gull = null; };
    btn.leave = gone;
    // flies off from wherever it is now; `to` is the side of the screen it heads for
    const flyOff = (to, ms) => {
      stop(); if (anim) { try { anim.commitStyles(); } catch (e) { /* nothing to keep */ } anim.cancel(); }
      if (reduced) { setTimeout(gone, 500); return; }
      const from = btn.style.transform || at(x, y);
      anim = btn.animate([{ transform: from }, { transform: `translate(${side(to)}px, ${-H - 80}px)` }], { duration: ms, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' });
      anim.onfinish = gone;
    };
    const land = () => {
      if (state !== 'in') return;
      state = 'pecking'; btn.classList.add('landed'); bank.classList.add('pecked');
      peck = setInterval(() => Sound.coin(Math.floor(Math.random() * 6), true), 420);
      timer = setTimeout(() => {
        if (state !== 'pecking') return;
        state = 'away'; btn.classList.remove('landed'); btn.classList.add('nicked');
        Household.gullNicked(); flyOff(!fromRight, 1500); // it carries on the way it was going, with your coins
      }, this.GULL_MS);
    };
    if (reduced) { btn.style.transform = at(x, y); land(); }
    else {
      anim = btn.animate([{ transform: `translate(${side(fromRight)}px, ${-H - 20}px)` }, { transform: `translate(${Math.round((side(fromRight) + x) / 2)}px, ${y + 40}px)`, offset: .62 },
        { transform: at(x, y) }], { duration: 1150, easing: 'ease-out', fill: 'forwards' });
      anim.onfinish = land;
    }
    btn.onclick = () => {
      if (state !== 'in' && state !== 'pecking') return;
      state = 'shooed'; btn.classList.remove('landed', 'rtl'); btn.classList.add('shooed'); if (!fromRight) btn.classList.add('rtl'); // it turns tail and flees back the way it came
      WeirdNoises.play('gullShoo'); this.dropChip(btn);
      Household.shooGull(); flyOff(fromRight, 700);
    };
  },
  // shooed, it drops a chip (the potato kind): it falls, spins and goes
  dropChip(from) {
    if (reduced) return;
    const r = from.getBoundingClientRect(), c = document.createElement('i');
    c.className = 'gchip'; c.style.left = Math.round(r.left + r.width * .6) + 'px'; c.style.top = Math.round(r.top + r.height * .45) + 'px';
    document.body.appendChild(c);
    c.animate([{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: `translateY(${Math.round(innerHeight * .35)}px) rotate(${Math.random() < .5 ? '-' : ''}540deg)`, opacity: 0 }],
      { duration: 1100, easing: 'cubic-bezier(.4,0,1,1)' }).onfinish = () => c.remove();
  },

  /* the smoke detector: a chip in the run panel while it chirps */
  chirp(on) { const c = $('#chirpChip'); c.hidden = !on; if (on) c.disabled = false; },
  fixBattery() {
    const c = $('#chirpChip'); if (c.disabled || c.hidden) return;
    const { ok } = Household.changeBattery();
    if (!ok) { WeirdNoises.play('thud'); c.disabled = true; setTimeout(() => { c.disabled = false; }, 3500); }
  },
};
