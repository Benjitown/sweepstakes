// Keyboard shortcuts for desktop players. Press ? to see them all.
import { $, esc } from '../core/util.js';
import { Game } from '../game/game.js';
import { CashOutCommand, invoke } from '../game/commands.js';
import { UI } from './ui.js';
import { BoardsView } from './boards-view.js';
import { SpinView } from './spin-view.js';
import { Tabs } from './tabs.js';
import { Coach } from './tutorial.js';
import { DailyView } from './daily-view.js';
import { DuckRaceView } from './duck-race-view.js';
import { BingoView } from './bingo-view.js';
import { FruityView } from './fruity-view.js';
import { OutsideView } from './outside-view.js';

// the board a shortcut acts on: the first one you've been playing by hand, else the first live one
const liveBoard = () => Game.slots.find(b => b && b.started && !b.over && b.human) || Game.slots.find(b => b && b.started && !b.over);
const KEYS = [
  ['D', 'Deal every empty board', () => Game.dealAll()],
  ['C', 'Cash out (the board you’re playing)', () => { const b = liveBoard(); if (b) invoke(new CashOutCommand(b, 'manual')); }],
  ['F', 'Flag mode on/off for that board', () => { const b = liveBoard(); if (b) { b.mode = b.mode === 'flag' ? 'dig' : 'flag'; BoardsView.tools(b); } }],
  ['S', 'Free spin (when it’s ready)', () => { if (Game.spinIn() <= 0) SpinView.open(); }],
  ['T', 'Today’s Daily Challenge', () => DailyView.open()],
  ['R', 'Duck race (out back of the Flip Booth)', () => DuckRaceView.open()],
  ['B', 'Nan’s bingo (out back of the Flip Booth)', () => BingoView.open()],
  ['P', 'The Fruity: the fruit machine in the Flip Booth', () => FruityView.open()],
  ['G', 'Go outside for a few minutes (the game pauses)', () => OutsideView.open()],
  ['M', 'Mute / unmute', () => $('#btnMute').click()],
  ['1 2 3', 'Upgrades / Add-ons / Stats', null],
  ['?', 'This list', () => Keys.help()],
  ['Esc', 'Close a window', null],
];

export const Keys = {
  bind() {
    document.addEventListener('keydown', e => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      if (!UI.modalClosed() || Coach.active) return;
      const k = e.key.toUpperCase();
      const tab = { 1: 'shop', 2: 'rack', 3: 'stats' }[k];
      const row = KEYS.find(([key, , fn]) => fn && key === k);
      if (!tab && !row) return;
      e.preventDefault();
      if (tab) Tabs.show(tab); else row[2]();
    });
  },
  help() {
    UI.modal(`<h3>Shortcuts</h3><dl class="keys">${KEYS.map(([k, what]) => `<dt>${k.split(' ').map(x => `<kbd>${esc(x)}</kbd>`).join(' ')}</dt><dd>${esc(what)}</dd>`).join('')}</dl>
      <p class="hint">Tiles: click to dig, right-click (or long-press, or F on a focused tile) to flag, click a number to clear around it.</p>
      <button class="btn green" type="button" data-a="ok">Got it</button>`, { ok: () => UI.closeModal() });
  },
};
