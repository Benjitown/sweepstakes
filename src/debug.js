// Test handle: with ?test in the URL, main.js exposes the game's internals as window.__sw for test/run.py.
import { TABLES, BOOST } from './data/economy.js';
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
import { LINES, RUDE, SURE } from './content/chat-lines.js';
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
import { Stars } from './game/horoscope.js';
import { Banker } from './game/banker.js';
import { Dog } from './game/dog.js';
import { DogView } from './ui/dog-view.js';
import { StarsView } from './ui/stars-view.js';
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
import { Tin } from './game/biscuit-tin.js';
import { Dares } from './game/dares.js';
import { DareView } from './ui/dare-view.js';
import { DARES, DARE } from './data/dares.js';
import { Seasons } from './game/seasons.js';
import { Claw } from './game/claw.js';
import { CarBoot } from './game/car-boot.js';
import { Darts } from './game/darts.js';
import { QuizNight } from './game/quiz-night.js';
import { Skins } from './game/skins.js';
import { SKINS } from './data/skins.js';
import { QuizNightView } from './ui/quiz-night-view.js';
import { NIGHT } from './data/quiz-night.js';
import { DartsView } from './ui/darts-view.js';
import { DARTS, DARTBOARD } from './data/darts.js';
import { CarBootView } from './ui/car-boot-view.js';
import { BOOT } from './data/car-boot.js';
import { ClawView } from './ui/claw-view.js';
import { CLAW, CLAW_PRIZES, CLAW_BY } from './data/claw.js';
import { SeasonView } from './ui/season-view.js';
import { SEASONS, PUMPKIN, TRICK, XMAS } from './data/seasons.js';
import { TIN } from './data/biscuit-tin.js';
import { THREADS, RUDE_THREADS } from './content/chat-threads.js';
import { QUIPS, RUDE_QUIPS } from './content/quips.js';
import { BINGO_END } from './content/bingo-calls.js';
import { Music, musicMidi } from './audio/music.js';
import { JukeboxView } from './ui/jukebox-view.js';
import { MUSIC, TRACKS, TRACK_BY } from './data/jukebox.js';
import { RECORDS } from './content/jukebox.js';
import { Allotment } from './game/allotment.js';
import { AllotmentView } from './ui/allotment-view.js';
import { PLOT, CROPS, CROP_BY } from './data/allotment.js';
import { VEG } from './content/allotment.js';
import { News, Paper } from './game/paper.js';
import { PaperView } from './ui/paper-view.js';
import { PAPER, STORY_WEIGHT } from './data/paper.js';
import { STORIES } from './content/paper.js';
import { Sweepstake } from './game/sweepstake.js';
import { DRAW } from './data/sweepstake.js';
import { Karaoke } from './game/karaoke.js';
import { KaraokeView } from './ui/karaoke-view.js';
import { KARAOKE } from './data/karaoke.js';
import { Specials } from './game/specials.js';
import { RunCard } from './ui/run-card.js';
import { Requests } from './game/requests.js';
import { Hall } from './game/hall.js';
import { Sunday } from './game/sunday.js';
import { SundayView } from './ui/sunday-view.js';
import { SUNDAY } from './data/sunday.js';
import { ROAST_MENU } from './content/sunday.js';
import { SPECIAL, SPECIALS, SPECIAL_BY } from './data/specials.js';

export function exposeForTests() {
  // no random knocks at the door mid-test (they'd pop up over what the tests click); the tests start them by hand
  clearTimeout(WeirdNoises.timer); WeirdNoises.schedule = () => {};
  clearTimeout(Quiz.timer); Quiz.schedule = () => {};
  clearTimeout(Bingo.timer); Bingo.schedule = () => {};
  clearTimeout(Dares.timer); Dares.schedule = () => {}; // nobody dares you mid-test unless a test asks
  clearTimeout(CarBoot.timer); CarBoot.schedule = () => {}; // nor does a car boot sale turn up
  clearTimeout(Darts.timer); Darts.schedule = () => {}; // or Dave with his darts
  clearTimeout(QuizNight.timer); QuizNight.schedule = () => {}; // or quiz night
  Kev.second = () => {}; // KEVCOIN neither launches nor moves on its own; the tests call Kev.launch() and Kev.tick()
  Stars.second = () => {}; // and Nan doesn't read the stars unless a test asks
  clearTimeout(Karaoke.timer); Karaoke.schedule = () => {}; // nor does anyone call you up for karaoke
  clearTimeout(Requests.timer); Requests.schedule = () => {}; // and nobody asks for a record
  clearTimeout(Sunday.timer); Sunday.schedule = () => {}; // and Nan only asks you round when a test says it's Sunday
  Specials.force = ''; // and no landlord's specials unless a test chalks one up
  Paper.auto = false; // nor does the paper come unless a test delivers it
  Music.hold('test', true); // and the jukebox stays quiet unless a test puts a record on
  Storm.RAINBOW = 0; // no surprise rainbows (they make your next board golden) unless a test asks
  clearTimeout(Chat.ambientT); Chat.ambient = () => {}; // nor do the friends start chatting among themselves mid-check (Chat.thread() still works)
  window.__sw = {
    get S() { return S; }, Game, Solver, Rack, Rank, bus, NOISES, WeirdNoises, Quips, Chat, Coach, SpinView,
    Banner, FX, UI, VERSION, renderAll, invoke, DigCommand, SaveGame, TABLES, AudioEngine,
    Daily, Achievements, ACHIEVEMENTS, DailyView, Keys, CoinChart, seeded, hashString, Household, HouseholdView, DuckRace, DuckRaceView, DOOR, GULL, LINES, RUDE,
    Scratchcards, ScratchView, SCRATCH_CARDS, SCRATCH_PRIZES, Quiz, QUIZ, PowerCut, PowerView, Storm, StormView, Kev, KevView, KEV, IceCream, VanView, Stars, StarsView, Banker, Dog, DogView, Bingo, BingoView, makeTicket, Outside, OutsideView, BINGO_TICKETS, BINGO_PAYS, BINGO_CALLS,
    Fruity, FruityRules, FruityView, FRUITY_REELS, FRUITY_PAYS, FRUITY_STAKES, FRUITY_FEATURES,
    Tin, TIN, Dares, DareView, DARES, DARE, Seasons, SeasonView, SEASONS, PUMPKIN, TRICK, XMAS, Claw, ClawView, CLAW, CLAW_PRIZES, CLAW_BY, CarBoot, CarBootView, BOOT, Darts, DartsView, DARTS, DARTBOARD, QuizNight, QuizNightView, NIGHT, Skins, SKINS, THREADS, RUDE_THREADS, QUIPS, RUDE_QUIPS, SURE, BINGO_END,
    Music, musicMidi, JukeboxView, MUSIC, TRACKS, TRACK_BY, RECORDS, Allotment, AllotmentView, PLOT, CROPS, CROP_BY, VEG, News, Paper, PaperView, PAPER, STORY_WEIGHT, STORIES, Sweepstake, DRAW, Karaoke, KaraokeView, KARAOKE, Specials, SPECIAL, SPECIALS, SPECIAL_BY, BOOST, RunCard, Requests, Hall, Sunday, SundayView, SUNDAY, ROAST_MENU,
    get slots() { return Game.slots; },
  };
}
