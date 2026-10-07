# Sweepstakes

Minesweeper, but you're gambling. Dig for multipliers, cash out before you hit a mine, or go double or nothing.
Meanwhile life carries on: someone's at the door, a kitten wanders past, a seagull goes for your coins, and the smoke
detector wants a new battery.
A browser game in plain HTML, CSS and JavaScript (ES modules), with no frameworks and nothing to install.
There are also terminal versions in Kotlin, C# and Python in `ports/`, and they share the same Daily Challenge.

What's in each version: [CHANGELOG.md](CHANGELOG.md).

## Play it

- **Built version:** open `dist/sweepstakes.html`. It's one self-contained file that works offline and can be sent to anyone.
- **From source:** run `python tools/serve.py`, then open http://localhost:8000. Browsers only load ES modules over http, so
  `index.html` won't run if you double-click it. VS Code's Live Server works too.
- **In a terminal:**
  - `java -jar dist/sweepstakes-kotlin.jar` (Java 8+)
  - `dist/sweepstakes-csharp.exe` (Windows, using the .NET built into Windows; on macOS/Linux `mono dist/sweepstakes-csharp.exe`)
  - `python ports/python/sweepstakes.py`

  See [ports/README.md](ports/README.md).

## Build

```
python tools/build.py
```

This writes two files:

- `dist/sweepstakes.html`: the whole game in one file. Fonts and icons are embedded, so it needs no internet.
- `dist/sweepstakes-web.zip`: `index.html` plus the font licence. That's the layout itch.io, game portals and web hosts expect.

The build needs Python 3.8 or newer and nothing else. It follows the imports from `src/main.js` in the same order the
browser does and joins the modules into one script. Module-level names must therefore be unique across files, and the
build stops with a clear message if two clash.

## Where things live

The first line of every source file says what it's for, so `head -n 1 src/*/*.js` prints a map.

```
index.html          page markup + the SVG icon sheet; links css/ and loads src/main.js
css/                one stylesheet per area; the <link> order in index.html is the cascade order
src/
  main.js           entry point + the design-pattern map (refactoring.guru)
  wiring.js         what reacts to each game event: the whole wiring diagram in one list
  debug.js          ?test in the URL exposes internals for the test suite
  version.js        the version number and the "what's new" list
  core/             util (helpers), bus (events), state (the save + quick questions about it), random (seeded)
  data/             every tuning number: tables, gems, upgrades, add-ons, ranks, the wheel, achievements
  content/          every joke: chat lines, chat threads, quips
  audio/            Web Audio engine, game sounds, weird household noises, the jukebox's music (a little sequencer)
  board/            the board model, solver, factories, mine chain, payout decorators (+ New Game+ house edge)
  game/             the rules (game.js), commands, bots, rack, rank, double or nothing, daily, achievements,
                    household (the door, the phone, the kitten, the seagull, the smoke detector, the ice cream van,
                    Biscuit the dog), the Banker, power cuts, storms, the duck race, scratchcards, Nan's bingo,
                    the Fruity (fruit machine), the pub quiz, going outside, KEVCOIN, Nan's stars, Nan's biscuit tin,
                    dares from the group chat, the seasons (Halloween, Bonfire Night, Christmas), the claw machine, the car
                    boot sale, darts with Big Dave, quiz night, board styles, the allotment, The Daily Sweep (the paper)
                    and its Sweepstake (a lottery), karaoke at the Red Lion, the landlord's specials, Sunday dinner
                    at Nan's
  ui/               one file per view: panels, boards, shop, modals, tutorial, daily, keys, coin graph, household, ducks...
assets/             fonts (+ OFL licence) and the favicon
tools/              build.py, serve.py, vc.py (version control), export_rules.mjs, sim/ (economy, Fruity and KEVCOIN simulators)
ports/              terminal versions in Kotlin, C# and Python (see ports/README.md)
test/               Playwright test suites (python test/run.py)
```

Each change usually touches a small area. Prices live in `src/data/`, jokes in `src/content/`, a view's looks in its
`css/` file and its code in `src/ui/`. To trace an event end to end, search `wiring.js` for its name.

## Test

```
pip install playwright && python -m playwright install chromium   # once
python test/run.py                                                # about 15 minutes
```

The suites run against both the ES-module source and the built file:

- **regression:** boards, gems, golden boards, the mine chain, payouts, banners, rank, the add-on rack, shop + bots,
  saving, the wheel, Ascension, Double or Nothing, chat and quips
- **tutorial:** each step moves on when you actually do it
- **features:** the Daily Challenge (including golden boards in `test/daily-golden.json` that every port must match),
  achievements, shortcuts, the coin graph, New Game+ and what's new
- **household:** the door, the phone, the kitten, the smoke detector, burnt toast, the raffle, the duck race (odds,
  payouts, leaving mid-race) and the rude chat switch
- **extras:** the experimental features: scratchcards (odds, panels, scratching with the mouse, leaving mid-card) and
  the pub quiz (asking, answering, running out of time, the switch)
- **mayhem:** the newest experimental features: the seagull (swooping in, pecking, shooing it, losing coins to it),
  power cuts (the dark, the torch, danger money, topping up, the emergency credit), Nan's bingo (the tickets, the
  odds, the calls, dabbing, a full house, leaving mid-game, her invite) and going outside (the game waiting, coming
  back early, the fresh air bonus, Nan's nudge)
- **fruity:** the fruit machine: what it pays back (worked out exactly), wins and the meter, nudges, holds, the gamble,
  the jackpot, the stakes, and leaving with a win in the meter
- **wildcards:** the newest experimental bits: thunderstorms (lightning that shows the mines, a strike that cuts the
  power, Lightning Reflexes) and KEVCOIN (the launch, trading with Kev's cut, the cap, a pump, the rug pull and the
  relaunch, and a seeded check that holding it loses money), the ice cream van (a cone, the sugar rush) and Nan's
  stars (the daily reading, the lucky number), the Banker (deal, no deal, beating his offer) and Biscuit the dog
- **nan:** Nan is always kind (every line of hers signs off with a kiss, she's never in the rude chat, she never swears
  and nobody has a go at her), her biscuit tin (filling it, the cap, handing it over when you go bust, keeping it
  when you start a fresh run yourself) and Sunday dinner at hers (only on a Sunday and once a day, going round, the
  roast on a winning cash-out, the plate she keeps warm, Stats)
- **antics:** dares from the group chat (the offer, You're on, Nah, no answer, the clock in the header and when it
  stops, doing it in time, running out of time, each dare's rule, the switch) and the seasons (the calendar, Halloween's
  pumpkins, bats and trick or treaters, Bonfire Night's fireworks, Christmas snow and Nan's card), the claw machine
  (the swing, what it pays back, a win, a drop, a slip, a miss, leaving mid-grab), the car boot sale (his prices,
  buying, haggling, being sold out from under you, the mystery box, packing up), darts with Big Dave (a real
  dartboard's scores, a win with 180, a loss, a draw, walking away), quiz night (a perfect round, a mixed one,
  running out of time, leaving half-way), board styles (buying, wearing, keeping them when you go bust), plus checks
  that every icon in the sheet has its own id and the pub quiz never repeats itself
- **allotment:** the tab, the seed packets' prices, planting, growing by the minute, ripe (and the chip), picking,
  a whopper, slugs, a thunderstorm watering the lot, full beds, October pumpkins, the 4 key, Stats, a fresh run and the phone
- **paper:** The Daily Sweep: the newsroom noting the run's big moments, the paper arriving, the front page (the
  biggest story leads), Spot the Mine (one or two certain mines; right pays once), the Sweepstake (Lucky Dip lines,
  the draw, the payouts, about half back), a quiet run, the bust screen's special edition, Stats and the phone
- **specials:** the landlord's specials: how often (about 1 in 12, never golden), Double Trouble's mines, limit and
  risky digs, Gem Rush's gems, Against the Clock's countdown, bonus and cash-out, surviving a reload, and the phone
- **karaoke:** the notes timed to the record (swing and all), the scoring (great, good, missed, bum notes), a standing
  ovation and what it pays, the machine's rest, being booed off, singing with the sound muted, and the phone
- **jukebox:** the records (every note a real note that fits its bar), putting one on, every record playing, shuffle,
  the Music switch and slider, and when the music stops (muted, outside, a power cut) and starts again
- **layout:** desktop, tablet and phone sizes with no sideways scrolling

Screenshots go to `test/screenshots/`.

`python test/ports.py` checks the terminal versions (see [ports/README.md](ports/README.md)). It builds each one it
finds a compiler for, checks that its Daily Challenge matches the web game exactly, plays a scripted game and passes
one save file between them.

On GitHub, Actions runs all of this on every push and pull request (`.github/workflows/ci.yml`), and attaches the
built game to each run so any branch can be played. Every push to main also publishes the game to GitHub Pages
(`.github/workflows/pages.yml`) once Pages is switched on: Settings > Pages > Source: GitHub Actions.

## Branches and version control

The project lives in git, on GitHub. Work moves through three branches:

```
feature/<name> ──> experimental ──> dev ──> main
```

- **experimental** is where work happens. Each new feature gets its own branch off experimental and is merged back
  into it when it's done.
- **dev** gets experimental once everything works, before it's fully tested.
- **main** gets dev once it's fully tested and ready to publish. Each release on main is tagged (`v4.3`…), and the
  tags `v3.0` to `v4.3` are the versions from before the move to git.

`tools/vc.py` is the small version control tool the project used before git (no git needed, standard library only).
It still works if you ever need it without git: `python tools/vc.py status | save "message" | log | diff | restore | export`.

## Economy simulator

`node tools/sim/prog.js run` plays whole runs with the real board rules and prints when each purchase happens.
`node tools/sim/prog.js tune` nudges prices toward a target timeline. That's how the run was paced to about two hours.

## Credits

The fonts are Jersey 10 and Tiny5, both under the SIL Open Font License (see `assets/fonts/LICENSE.txt`). The code
structure follows the pattern catalogue at https://refactoring.guru/design-patterns.
