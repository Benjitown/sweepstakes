// Entry point: wires the buttons, restores the save, starts the timers.
/* =====================================================================================
   SWEEPSTAKES · code map (patterns from https://refactoring.guru/design-patterns)
     Observer ............... core/bus.js: the game announces events; wiring.js says who reacts
     Mediator ............... game/game.js: the one place the rules live; views only talk to it
     Command ................ game/commands.js: Dig, Flag, Chord, Probe and Cash Out (you + bots)
     Strategy ............... game/bots.js (bot behaviours), audio/noises.js (weird household noises)
     Chain of Responsibility  board/mine-chain.js: Spare Fuse → Shield → boom
     Decorator .............. board/payout.js: add-on cards wrap the cash-out payout
     State .................. game/double-or-nothing.js (the ladder), ui/tutorial.js (the steps)
     Memento ................ board/board.js (board snapshots), core/state.js (the save game)
     Factory Method ......... board/factory.js: normal, Ascended and golden boards
     Flyweight .............. board/neighbours.js: neighbour maps shared per table size
     Singleton .............. audio/engine.js: one AudioContext for the whole page
     Facade ................. audio/sound.js: one-line calls over the Web Audio graph
   Prices were tuned with tools/sim, which plays the real board rules for a whole run (~2 hours).
   ===================================================================================== */

import { $ } from './core/util.js';
import { TBY } from './data/economy.js';
import { LINES } from './content/chat-lines.js';
import { bus } from './core/bus.js';
import { SaveGame, S, boardCount } from './core/state.js';
import { Sound } from './audio/sound.js';
import { WeirdNoises } from './audio/noises.js';
import { Board } from './board/board.js';
import { Game } from './game/game.js';
import { Bots } from './game/bots.js';
import { Rack } from './game/rack.js';
import { DonLadder } from './game/double-or-nothing.js';
import { Chat } from './ui/chat.js';
import { RunPanel } from './ui/run-panel.js';
import { TablesView } from './ui/tables-view.js';
import { StakeView } from './ui/stake-view.js';
import { FlipView } from './ui/flip-view.js';
import { SpinView } from './ui/spin-view.js';
import { Tabs } from './ui/tabs.js';
import { UiSounds } from './ui/ui-sounds.js';
import { Coach } from './ui/tutorial.js';
import { renderAll } from './wiring.js';
import { exposeForTests } from './debug.js';

$('#btnDon').onclick = () => DonLadder.start();
$('#btnFlip').onclick = () => FlipView.open();
$('#btnSpin').onclick = () => { if (Game.spinIn() <= 0) SpinView.open(); };
$('#btnMute').onclick = () => { S.muted = !S.muted; if (!S.muted) Sound.msg(); RunPanel.render(); SaveGame.saveNow(); };
StakeView.bind(); Tabs.bind(); UiSounds.bind();
document.addEventListener('visibilitychange', () => { if (document.hidden) SaveGame.saveNow(); });
addEventListener('pagehide', () => SaveGame.saveNow());
setInterval(() => { if (document.hidden) return; S.run.time++; bus.emit('tick'); }, 1000);

(S.boards || []).forEach(o => { if (o && o.slot < boardCount()) { const b = Board.fromMemento(o); if (b) Game.slots[o.slot] = b; } });
if (!TBY[S.sel] || !S.unlocked.includes(S.sel)) S.sel = 'penny';
if (!S.rack || !S.rack.length || S.rackAt > S.run.time) Rack.roll();
renderAll();
TablesView.reveal();
Bots.timer = setTimeout(() => Bots.tick(), Bots.delay());
WeirdNoises.schedule();
Chat.ambient();
const hi = LINES.hello.slice().sort(() => Math.random() - .5);
setTimeout(() => Chat.post(...hi[0]), 600);
setTimeout(() => Chat.post(...hi[1]), 2000);
if (!S.life.tut) setTimeout(() => Coach.start(), 900);

// ?test in the URL hands the game's internals to the regression tests (test/run.py)
if (new URLSearchParams(location.search).has('test')) exposeForTests();
