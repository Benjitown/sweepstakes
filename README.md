# Sweepstakes

Minesweeper, but you're gambling. Dig for multipliers, cash out before you hit a mine, or go double or nothing.
A browser game in plain HTML, CSS and JavaScript (ES modules), with no frameworks and nothing to install.

What's in each version: [CHANGELOG.md](CHANGELOG.md).

## Play it

- **Built version:** open `dist/sweepstakes.html`. It's one self-contained file that works offline and can be sent to anyone.
- **From source:** run `python tools/serve.py`, then open http://localhost:8000. Browsers only load ES modules over http, so
  `index.html` won't run if you double-click it. VS Code's Live Server works too.

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
  audio/            Web Audio engine, game sounds, weird household noises
  board/            the board model, solver, factories, mine chain, payout decorators (+ New Game+ house edge)
  game/             the rules (game.js), commands, bots, rack, rank, double or nothing, daily, achievements
  ui/               one file per view: panels, boards, shop, modals, tutorial, daily, keys, coin graph...
assets/             fonts (+ OFL licence) and the favicon
tools/              build.py, serve.py, vc.py (version control), sim/ (economy simulator)
test/               Playwright test suites (python test/run.py)
```

Each change usually touches a small area. Prices live in `src/data/`, jokes in `src/content/`, a view's looks in its
`css/` file and its code in `src/ui/`. To trace an event end to end, search `wiring.js` for its name.

## Test

```
pip install playwright && python -m playwright install chromium   # once
python test/run.py                                                # about 4 minutes
```

The suites run against both the ES-module source and the built file:

- **regression:** boards, gems, golden boards, the mine chain, payouts, banners, rank, the add-on rack, shop + bots,
  saving, the wheel, Ascension, Double or Nothing, chat and quips
- **tutorial:** each step moves on when you actually do it
- **features:** the Daily Challenge (including golden boards in `test/daily-golden.json`),
  achievements, shortcuts, the coin graph, New Game+ and what's new
- **layout:** desktop, tablet and phone sizes with no sideways scrolling

Screenshots go to `test/screenshots/`.

## Version control

`tools/vc.py` is a small version control tool: no git needed, standard library only.

```
python tools/vc.py status                   what changed since the last save
python tools/vc.py save "message" --tag v4.1
python tools/vc.py log                      every save, newest first
python tools/vc.py diff v4.0                your files vs a save (or: diff v4.0 v4.1)
python tools/vc.py restore v3.0             go back (it saves a backup of your current files first)
python tools/vc.py export v3.0 v3.zip       copy a save out without touching your files
```

Snapshots live in `.vc/`, and file contents are stored once each and compressed. `.vcignore` lists what's skipped
(`dist/`, screenshots, build folders).

## Economy simulator

`node tools/sim/prog.js run` plays whole runs with the real board rules and prints when each purchase happens.
`node tools/sim/prog.js tune` nudges prices toward a target timeline. That's how the run was paced to about two hours.

## Credits

The fonts are Jersey 10 and Tiny5, both under the SIL Open Font License (see `assets/fonts/LICENSE.txt`). The code
structure follows the pattern catalogue at https://refactoring.guru/design-patterns.
