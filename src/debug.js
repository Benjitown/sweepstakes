// Test handle: with ?test in the URL, main.js exposes the game's internals as window.__sw for test/run.py.
import { TABLES } from './data/economy.js';
import { bus } from './core/bus.js';
import { S, SaveGame } from './core/state.js';
import { AudioEngine } from './audio/engine.js';
import { NOISES, WeirdNoises } from './audio/noises.js';
import { Solver } from './board/solver.js';
import { Game } from './game/game.js';
import { invoke, DigCommand } from './game/commands.js';
import { Rack } from './game/rack.js';
import { Rank } from './game/rank.js';
import { FX } from './ui/fx.js';
import { Chat } from './ui/chat.js';
import { Quips } from './ui/quip-popups.js';
import { Banner } from './ui/banner.js';
import { UI } from './ui/ui.js';
import { VERSION } from './version.js';
import { SpinView } from './ui/spin-view.js';
import { Coach } from './ui/tutorial.js';
import { renderAll } from './wiring.js';
import { Daily } from './game/daily.js';
import { Achievements } from './game/achievements.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { DailyView } from './ui/daily-view.js';
import { Keys } from './ui/keys.js';
import { CoinChart } from './ui/coin-chart.js';
import { seeded, hashString } from './core/random.js';
import { Household, DOOR, GULL } from './game/household.js';
import { LINES, RUDE } from './content/chat-lines.js';
import { HouseholdView } from './ui/household-view.js';
import { DuckRace } from './game/duck-race.js';
import { DuckRaceView } from './ui/duck-race-view.js';
import { Scratchcards } from './game/scratchcards.js';
import { ScratchView } from './ui/scratch-view.js';
import { Quiz } from './game/quiz.js';
import { QUIZ } from './content/quiz.js';
import { PowerCut } from './game/power-cut.js';
import { Storm } from './game/storm.js';
import { Kev } from './game/kevcoin.js';
import { KevView } from './ui/kevcoin-view.js';
import { KEV } from './data/kevcoin.js';
import { IceCream } from './game/ice-cream.js';
import { VanView } from './ui/van-view.js';
import { StormView } from './ui/storm-view.js';
import { Outside } from './game/outside.js';
import { OutsideView } from './ui/outside-view.js';
import { Bingo, makeTicket } from './game/bingo.js';
import { BingoView } from './ui/bingo-view.js';
import { BINGO_TICKETS, BINGO_PAYS, BINGO_CALLS } from './data/bingo.js';
import { Fruity } from './game/fruity.js';
import { FruityRules } from './game/fruity-rules.js';
import { FruityView } from './ui/fruity-view.js';
import { FRUITY_REELS, FRUITY_PAYS, FRUITY_STAKES, FRUITY_FEATURES } from './data/fruity.js';
import { PowerView } from './ui/power-view.js';
import { SCRATCH_CARDS, SCRATCH_PRIZES } from './data/scratchcards.js';

export function exposeForTests() {
  // no random knocks at the door mid-test (they'd pop up over what the tests click); the tests start them by hand
  clearTimeout(WeirdNoises.timer); WeirdNoises.schedule = () => {};
  clearTimeout(Quiz.timer); Quiz.schedule = () => {};
  clearTimeout(Bingo.timer); Bingo.schedule = () => {};
  Kev.second = () => {}; // KEVCOIN neither launches nor moves on its own; the tests call Kev.launch() and Kev.tick()
  clearTimeout(Chat.ambientT); Chat.ambient = () => {}; // nor do the friends start chatting among themselves mid-check (Chat.thread() still works)
  window.__sw = {
    get S() { return S; }, Game, Solver, Rack, Rank, bus, NOISES, WeirdNoises, Quips, Chat, Coach, SpinView,
    Banner, FX, UI, VERSION, renderAll, invoke, DigCommand, SaveGame, TABLES, AudioEngine,
    Daily, Achievements, ACHIEVEMENTS, DailyView, Keys, CoinChart, seeded, hashString, Household, HouseholdView, DuckRace, DuckRaceView, DOOR, GULL, LINES, RUDE,
    Scratchcards, ScratchView, SCRATCH_CARDS, SCRATCH_PRIZES, Quiz, QUIZ, PowerCut, PowerView, Storm, StormView, Kev, KevView, KEV, IceCream, VanView, Bingo, BingoView, makeTicket, Outside, OutsideView, BINGO_TICKETS, BINGO_PAYS, BINGO_CALLS,
    Fruity, FruityRules, FruityView, FRUITY_REELS, FRUITY_PAYS, FRUITY_STAKES, FRUITY_FEATURES,
    get slots() { return Game.slots; },
  };
}
