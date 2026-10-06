// The group chat panel: reactions to what happens, plus ambient threads.
import { $, rnd, esc } from '../core/util.js';
import { FRIENDS, LINES, CHANCE } from '../content/chat-lines.js';
import { THREADS } from '../content/chat-threads.js';
import { pref } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { UI } from './ui.js';
import { Coach } from './tutorial.js';

export const Chat = {
  busyUntil: 0, lastLine: '', ambientT: 0, bag: [],
  avatar(f) {
    return `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="21" r="17" fill="${f.bg}" stroke="#141b1d" stroke-width="2.5"/>${f.extra}<circle cx="14.5" cy="20" r="2.2" fill="#141b1d"/><circle cx="25.5" cy="20" r="2.2" fill="#141b1d"/><path d="${f.mouth}" fill="none" stroke="#141b1d" stroke-width="2" stroke-linecap="round"/></svg>`;
  },
  bubble(who, text) { const f = FRIENDS[who]; return `<div class="msg">${this.avatar(f)}<div class="bubble" style="--fc:${f.col}"><b>${f.name}</b><span>${esc(text)}</span></div></div>`; },
  post(who, text) {
    const el = $('#chat'); el.insertAdjacentHTML('beforeend', this.bubble(who, text));
    while (el.children.length > 40) el.firstChild.remove();
    el.scrollTop = el.scrollHeight; Sound.msg();
  },
  say(ev, vars = {}, chance) {
    const pool = LINES[ev]; if (!pool) return;
    if (Math.random() > (chance ?? CHANCE[ev] ?? .6)) return;
    const now = performance.now(); if (now < this.busyUntil && chance !== 1) return;
    this.busyUntil = now + 1400;
    let pick = rnd(pool);
    for (let k = 0; k < 4 && pool.length > 1 && pick[1] === this.lastLine; k++) pick = rnd(pool);
    this.lastLine = pick[1];
    setTimeout(() => this.post(pick[0], pick[1].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')), 350 + Math.random() * 700);
  },
  thread() {
    if (!this.bag.length) this.bag = THREADS.slice().sort(() => Math.random() - .5);
    const t = this.bag.pop(); this.busyUntil = performance.now() + t.length * 2400;
    t.forEach(([w, s], k) => setTimeout(() => this.post(w, s), k * (1600 + Math.random() * 1200)));
  },
  ambient() {
    clearTimeout(this.ambientT);
    this.ambientT = setTimeout(() => { if (pref('quips') && !document.hidden && UI.modalClosed() && !Coach.active) this.thread(); this.ambient(); }, (50 + Math.random() * 90) * 1000);
  },
};
