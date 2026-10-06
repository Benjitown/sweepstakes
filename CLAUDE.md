# Sweepstakes: notes for Claude

Minesweeper with gambling, as a browser game (plain HTML/CSS/JS ES modules, no frameworks) plus terminal versions in
Kotlin, C# and Python under `ports/`. README.md has the full map; the first line of every source file says what it's for.

## Branches (always follow this)

```
feature/<name> ──> experimental ──> dev ──> main
```

- **experimental** is where work happens. Never commit new work straight to dev or main.
- Every new feature gets its own branch off experimental (`git switch experimental && git switch -c feature/<name>`).
  When it's done, merge it back into experimental (`git switch experimental && git merge --no-ff feature/<name>`).
- **dev**: merge experimental into dev once everything works but isn't fully tested yet.
- **main**: merge dev into main only when it's fully tested, production ready and ready to publish. Tag each release
  on main (`v4.3`, `v4.4`…) and bump `src/version.js` + CHANGELOG.md in the same release.
- Never force-push dev or main.

## Before merging

- `python tools/build.py` must build (it stops if two modules declare the same top-level name).
- `python test/run.py` runs every browser suite against the source and the build (all checks must pass before dev → main).
  GitHub Actions runs the same suites plus `test/ports.py` on every push (`.github/workflows/ci.yml`); main also deploys
  to GitHub Pages (`pages.yml`), so merging into main publishes.
- After changing `src/data/`, `src/content/` or the daily, run `node tools/export_rules.mjs`, then
  `python test/ports.py` (the terminal versions must still match the web game's Daily Challenge exactly).

## Conventions

- One file per view in `src/ui/`, one per mechanic in `src/game/`; events go through the bus, and `src/wiring.js`
  lists who reacts to what.
- Tuning numbers live in `src/data/`, jokes in `src/content/`.
- The bundler (`tools/build.py`) puts every module in one scope: top-level names must be unique across files, and
  imports can't be renamed (`import { x as y }` stops the build).
- Booth games (ducks, scratchcards, bingo, the Fruity) decide a result the moment you pay and keep any winnings in an
  `S.<game>Owed` amount until they're shown, so leaving half-way still pays (each has a `settle()` that main.js calls).
  The Fruity's payback comes from `node tools/sim/fruity.mjs`; re-run it after touching `src/data/fruity.js`.
- The rude chat lines live in the `RUDE` / `RUDE_THREADS` / `RUDE_QUIPS` lists, which the "Rude chat" switch turns off.
