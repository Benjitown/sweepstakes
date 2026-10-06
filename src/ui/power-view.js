// The power cut on screen: the lights go out, a torch follows your pointer, and the meter at the top counts down.
import { $, ico, fmt, clock, reduced } from '../core/util.js';
import { S } from '../core/state.js';
import { PowerCut } from '../game/power-cut.js';
import { UI } from './ui.js';

export const PowerView = {
  el: null, hud: null, tick: 0, last: null,
  // the torch goes wherever the pointer (or keyboard focus) is; clicks go straight through the dark
  bind() {
    const aim = (x, y) => { this.last = [Math.round(x), Math.round(y)]; if (this.el) { this.el.style.setProperty('--tx', this.last[0] + 'px'); this.el.style.setProperty('--ty', this.last[1] + 'px'); } };
    addEventListener('pointermove', e => aim(e.clientX, e.clientY), { passive: true });
    addEventListener('pointerdown', e => aim(e.clientX, e.clientY), { passive: true });
    document.addEventListener('focusin', e => { const t = e.target; if (this.el && t && t.getBoundingClientRect) { const r = t.getBoundingClientRect(); aim(r.left + r.width / 2, r.top + r.height / 2); } });
  },
  on() {
    if (this.el) return;
    const el = this.el = document.createElement('div'); el.className = 'blackout'; el.setAttribute('aria-hidden', 'true');
    const [x, y] = this.last || this.middle(); el.style.setProperty('--tx', x + 'px'); el.style.setProperty('--ty', y + 'px');
    document.body.appendChild(el);
    const hud = this.hud = document.createElement('div'); hud.className = 'meterhud'; hud.setAttribute('role', 'status');
    hud.innerHTML = `${ico('bulb', 'mbulb')}<span class="mtxt"><b>Power cut</b><span class="num" id="meterLeft"></span></span><button class="btn gold" type="button" id="meterTop"></button>`;
    document.body.appendChild(hud);
    $('#meterTop').onclick = () => { if (!PowerCut.topUp()) UI.toast(`A top-up costs ${fmt(PowerCut.cost())}. You’re short.`); };
    this.update(); clearInterval(this.tick); this.tick = setInterval(() => this.update(), 1000);
  },
  middle() { const b = $('#boards').getBoundingClientRect(); return [Math.round(b.left + b.width / 2), Math.round(Math.min(innerHeight * .6, b.top + 160))]; },
  update() {
    if (!this.hud) return;
    $('#meterLeft').textContent = `${clock(PowerCut.left())} · +${Math.round(PowerCut.BONUS * 100)}% danger money`;
    const c = PowerCut.cost(), btn = $('#meterTop'); btn.textContent = `Top up · ${fmt(c)}`; btn.disabled = S.coins < c;
  },
  off() {
    clearInterval(this.tick);
    const el = this.el, hud = this.hud; this.el = this.hud = null;
    if (hud) hud.remove();
    if (el) { if (reduced) el.remove(); else { el.classList.add('back'); setTimeout(() => el.remove(), 700); } }
  },
};
