// Around the house, on screen: the "someone's at the door" card, the kitten that wanders past, the smoke detector chip.
import { $, rnd, ico, fmt, esc, reduced } from '../core/util.js';
import { ABY } from '../data/addons.js';
import { bus } from '../core/bus.js';
import { S, has } from '../core/state.js';
import { WeirdNoises } from '../audio/noises.js';
import { Game } from '../game/game.js';
import { Household, MISSED } from '../game/household.js';
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
const aCard = id => { const n = ABY[id].name; return `${/^[aeiou]/i.test(n) ? 'an' : 'a'} ${n} card`; };

export const HouseholdView = {
  card: null, timer: 0, kitten: null,
  bind() { $('#chirpChip').onclick = () => this.fixBattery(); },
  // is now a good time for something to happen? Never in a window, in the tutorial, or while something else is happening.
  free() { return UI.modalClosed() && !Coach.active && !this.card && !this.kitten; },
  start(kind, k, handle) {
    if (kind === 'kitten') this.walkKitten();
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
  clear() { this.close(); if (this.kitten) { this.kitten.remove(); this.kitten = null; } },

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

  /* the smoke detector: a chip in the run panel while it chirps */
  chirp(on) { const c = $('#chirpChip'); c.hidden = !on; if (on) c.disabled = false; },
  fixBattery() {
    const c = $('#chirpChip'); if (c.disabled || c.hidden) return;
    const { ok } = Household.changeBattery();
    if (!ok) { WeirdNoises.play('thud'); c.disabled = true; setTimeout(() => { c.disabled = false; }, 3500); }
  },
};
