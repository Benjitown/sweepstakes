# Sweepstakes: terminal editions

The same game for the terminal, in **Kotlin**, **C#** and **Python**. All three share three things.

- **The rules and jokes of the web game.** `tools/export_rules.mjs` generates `Rules.kt`, `Rules.cs` and `rules.json`
  from the web game's `src/data` and `src/content`, so every version deals the same tables, gems and payouts and has
  the same group chat (rude lines included: the terminal versions have no switch for them).
- **The Daily Challenge.** One board a day, built from the date alone with the same seeded randomness, solver and
  scoring as the web game. The same digs give the same multiplier in every version, and each one proves it with
  `--selftest`.
- **One save file:** `~/.sweepstakes/save.txt`. Your coins, tables, shields and today's daily follow you between
  languages. Start a run in Kotlin, keep going in C#. The web game saves in the browser, so it has its own progress.

## Run them

| Version | Build and play | Needs |
|---|---|---|
| Python | `python python/sweepstakes.py` | Python 3.8+ |
| Kotlin | `cd kotlin` then `kotlinc src -include-runtime -d sweepstakes.jar` then `java -jar sweepstakes.jar` | Kotlin 1.9+ and a JDK 11+ |
| C# | `cd csharp` then `dotnet run` | .NET 6+ SDK. With Mono instead: `mcs -codepage:utf8 -out:sweepstakes.exe *.cs` then `mono sweepstakes.exe` |

Options, in every version (for `dotnet run`, put them after `--`):

- `--selftest`: check this version's Daily Challenge against the web game: boards, moves and multipliers, to the last bit
- `--plain`: no colours. Use it if your terminal shows `[31m` junk; Windows Terminal is fine without it.
- `--seed 7`: repeatable luck, for testing
- `--save FILE`: use a different save file

## Playing

From the menu you can:

- play a board at one of six tables, unlocking the bigger ones with coins
- take on the Daily Challenge
- shop for a Shield (survive one mine), Dodgy Goggles (see each tile's mine odds) or a Lucky Charm (better odds)
- try Double or Nothing (×2 up to ×100, with an are-you-sure at every rung)
- flip a coin
- save up 600T to buy the casino for New Game+, where every win pays +25% more

On a board:

| Type | Does |
|---|---|
| `C4` | dig |
| `f C4` | flag |
| `c` | cash out |
| `o` | show the mine odds (needs goggles) |
| `?` | rules |

Risky digs pay the odds. Gems (`$`) multiply the pot. Golden boards pay double. The group chat has opinions. The
smoke detector down the hall wants a new battery, and chirps about it now and then. (The door, the phone, the kitten
and the duck race are web-only.)

## Where things are

```
python/sweepstakes.py     the whole Python version (one file) + rules.json (generated)
kotlin/src/Main.kt        entry point and --selftest
kotlin/src/Game.kt        menus, boards, the daily, shop, double or nothing, coin flip
kotlin/src/Engine.kt      seeded randomness, the board, the solver, the Daily Challenge
kotlin/src/Term.kt        colours, input, number formatting, the group chat, drawing boards
kotlin/src/Save.kt        the shared save file
kotlin/src/Rules.kt       generated from the web game
csharp/                   the same files and roles as Kotlin (Program.cs is Main.kt), + Sweepstakes.csproj
```

The three versions mirror each other function by function. A rule fixed in one is easy to find in the others.

## Changing the rules

1. Edit the web game's `src/data/` (numbers) or `src/content/` (jokes).
2. Run `node tools/export_rules.mjs`. This regenerates the rules for all three versions, along with the golden daily
   runs the self-tests check against.
3. Run `python test/ports.py`. It builds every version it can find a compiler for, runs the self-tests and a scripted
   game in each, and passes one save file through all three.
