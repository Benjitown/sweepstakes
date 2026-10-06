// Entry point: wires the buttons, restores the save, starts the timers.
/* =====================================================================================
   SWEEPSTAKES · code map (patterns from https://refactoring.guru/design-patterns)
     Observer ............... core/bus.js: the game announces events; wiring.js says who reacts
     Mediator ............... game/game.js: the one place the rules live; views only talk to it
     Command ................ game/commands.js: Dig, Flag, Chord, Probe and Cash Out (you + bots)
     Strategy ............... game/bots.js (bot behaviours), audio/noises.js (weird household noises → game/household.js)
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
import { Keys } from './ui/keys.js';
import { WhatsNew } from './ui/whats-new.js';
import { Achievements } from './game/achievements.js';
import { DailyView } from './ui/daily-view.js';
import { HouseholdView } from './ui/household-view.js';
import { PowerView } from './ui/power-view.js';
import { DuckRace } from './game/duck-race.js';
import { Scratchcards } from './game/scratchcards.js';
import { Quiz } from './game/quiz.js';
import { Bingo } from './game/bingo.js';
import { Fruity } from './game/fruity.js';
import { Claw } from './game/claw.js';
import { CarBoot } from './game/car-boot.js';
import { Darts } from './game/darts.js';
import { FruityView } from './ui/fruity-view.js';
import { KevView } from './ui/kevcoin-view.js';
import { Outside } from './game/outside.js';
import { Dares } from './game/dares.js';
import { DareView } from './ui/dare-view.js';
import { Seasons } from './game/seasons.js';
import { SeasonView } from './ui/season-view.js';
import { exposeForTests } from './debug.js';

$('#btnDon').onclick = () => DonLadder.start();
$('#btnFlip').onclick = () => FlipView.open();
$('#btnSpin').onclick = () => { if (Game.spinIn() <= 0) SpinView.open(); };
$('#btnMute').onclick = () => { S.muted = !S.muted; if (!S.muted) Sound.msg(); RunPanel.render(); SaveGame.saveNow(); };
StakeView.bind(); Tabs.bind(); UiSounds.bind(); Keys.bind(); HouseholdView.bind(); PowerView.bind(); FruityView.bind();
document.addEventListener('visibilitychange', () => { if (document.hidden) SaveGame.saveNow(); });
addEventListener('pagehide', () => SaveGame.saveNow());
setInterval(() => { if (document.hidden || Outside.on) return; S.run.time++; Outside.tick(); bus.emit('tick'); }, 1000); // the clock stops while you're outside

(S.boards || []).forEach(o => { if (o && o.slot < boardCount()) { const b = Board.fromMemento(o); if (b) Game.slots[o.slot] = b; } });
if (!TBY[S.sel] || !S.unlocked.includes(S.sel)) S.sel = 'penny';
DuckRace.settle(); Scratchcards.settle(); Bingo.settle(); Fruity.settle(); Claw.settle(); // a duck race, scratchcard, bingo ticket, Fruity win or claw prize you left behind still pays out
if (!S.rack || !S.rack.length || S.rackAt > S.run.time) Rack.roll();
renderAll();
KevView.bind(); DareView.bind();
// the season (?season=halloween / bonfire / xmas / none tries one out; the tests pick their own)
const trySeason = new URLSearchParams(location.search).get('season');
if (trySeason !== null) Seasons.force = trySeason; else if (new URLSearchParams(location.search).has('test')) Seasons.force = 'none';
const season = SeasonView.apply();
TablesView.reveal();
Bots.timer = setTimeout(() => Bots.tick(), Bots.delay());
WeirdNoises.schedule();
Quiz.schedule();
Bingo.schedule();
Dares.schedule();
CarBoot.schedule();
Darts.schedule();
Chat.ambient();
const hi = LINES.hello.slice().sort(() => Math.random() - .5);
setTimeout(() => Chat.post(...hi[0]), 600);
setTimeout(() => Chat.post(...hi[1]), 2000);
if (season) { const sh = LINES[season + '_hi'].slice().sort(() => Math.random() - .5); setTimeout(() => Chat.post(...sh[0]), 3800); setTimeout(() => Chat.post(...sh[1]), 5600); }
if (!S.life.tut) setTimeout(() => Coach.start(), 900);
WhatsNew.maybe();
if (S.life.tut) {
  setTimeout(() => Achievements.catchUp(), 2500);                    // credit for what returning players already did
  setTimeout(() => DailyView.nudge(), 25000 + Math.random() * 20000); // someone in the chat has done today's daily
}

// ?test in the URL hands the game's internals to the regression tests (test/run.py)
if (new URLSearchParams(location.search).has('test')) exposeForTests();
