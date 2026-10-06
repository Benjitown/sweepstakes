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
import { SpinView } from './ui/spin-view.js';
import { Coach } from './ui/tutorial.js';
import { renderAll } from './wiring.js';

export function exposeForTests() {
  window.__sw = {
    get S() { return S; }, Game, Solver, Rack, Rank, bus, NOISES, WeirdNoises, Quips, Chat, Coach, SpinView,
    Banner, FX, renderAll, invoke, DigCommand, SaveGame, TABLES, AudioEngine,
    get slots() { return Game.slots; },
  };
}
