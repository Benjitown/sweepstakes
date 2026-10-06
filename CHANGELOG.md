# Changelog

Each version is also a save in the built-in version control. Run `python tools/vc.py log` to list them, or
`python tools/vc.py export v3.0 v3.zip` to get any of them back.

## 4.3.0 (6 Oct 2026)

- **Life goes on around you.** Knocks at the door, the doorbell, the phone, a smoke alarm (someone burnt the toast).
  Each pops up a card: answer it or ignore it. Nan might slip you a tenner, the bailiffs might take a lamp, a kid might
  sell you a raffle ticket (1 in 8 wins ten times its price), and there's a duck. Nothing happens while a window is
  open or during the tutorial, and bad luck never takes you near bust.
- **The smoke detector's low-battery chirp** (the 3am one), synthesised from scratch: a piezo beep with a bit of
  room echo. Like the real thing, it chirps again every minute or so until you change the battery from the chip in
  the run panel. Sometimes you fall off the chair.
- **A kitten** wanders across the bottom of the screen now and then. Pet it for a purr, hearts and a present.
- **Duck racing** out back of the Flip Booth (or press R): five rubber ducks, a bookie's odds card (5% house edge),
  overtakes and photo finishes. The result is settled the moment you bet, so leaving mid-race still pays.
- **New sounds:** knocks, a two-tone doorbell, an old landline, mewing kittens, a purr, ducks, a squeaky toy, a car
  alarm three streets away, a referee's whistle and you falling off a chair.
- **Ruder chat.** Swearing, crude jokes and political satire in the group chat, quips and threads. "Rude chat" in
  Stats turns the rude lines off.
- **45 achievements** (five new: Quack Addict, Long Shot, Cat Person, DIY Hero, Fixed the Roof).
- Stats shows duck races won and kittens petted. New test suite: `household`.

## 4.2.0 (6 Oct 2026)

- **Terminal versions in Kotlin, C# and Python** (`ports/`), with boards at six tables, gems, golden boards, shields,
  streaks, the shop, Double or Nothing, coin flips, New Game+ and the group chat.
- **The Daily Challenge is identical everywhere.** Every version uses the same seeded randomness, solver and scoring
  as the web game, so the same digs give the same multiplier in all four. Each port checks this with `--selftest`.
- **One save file for all three terminal versions,** so your coins follow you between languages.
- `tools/export_rules.mjs` generates each port's rules from the web game's data, and `test/ports.py` builds and
  tests every port it finds a compiler for.
- The web game itself is unchanged.

## 4.1.0 (6 Oct 2026)

- **Daily Challenge.** One board a day, built from the date alone, so everyone gets the same mines, gems and opening,
  in every version of the game. You get no add-ons, no shields and no stake, and you play for the multiplier. Afterwards
  you see how you did against the group chat (who play it too) and get a spoiler-free emoji result to share, plus a
  streak, a prize and a nudge in the chat if you haven't played yet.
- **40 achievements.** Each one pays out (tiers 1 to 3) and survives busting. Returning players get credit for what
  they'd already done.
- **New Game+.** Every casino you've bought adds +25% to the profit of every win, forever.
- **Coin graph.** The Stats tab now graphs your coins over the run on a log scale.
- **Keyboard shortcuts.** D deal, C cash out, F flag mode, S spin, T daily, M mute, 1–3 tabs, ? for the list.
- **Vibration** on phones for the big moments, with a switch in Stats.
- **What's new.** Returning players see the new features once. The Stats tab shows the version.
- Banners now queue instead of overwriting each other, so a level-up no longer wipes a BIG WIN.

## 4.0.0 (6 Oct 2026)

- Split the single file into 48 ES modules and 10 stylesheets, grouped by mechanic. Gameplay is unchanged.
- `tools/build.py` rebuilds the single-file game and needs nothing to install. `tools/serve.py` serves the source
  for development.
- Test suites for the source and the build. `tools/vc.py` is the built-in version control.

## 3.0.0 (5 Oct 2026)

- Tutorial with Fuse the bomb, gems under tiles, golden boards, a free spin every 3 minutes, and lifetime rank.
- BIG/HUGE/MEGA WIN banners, flying coins and near-miss callouts.
- The carbon monoxide alarm is now one quiet chirp. The chat is weirder. Menus make satisfying sounds.
- Money goes from 1,000 to a 600 trillion casino, paced by a simulator to about two hours.

## 2.0.0

- Balatro-style look, several boards at once with an autominer, upgrades and add-on cards.
- Up to 8 boards: every board past 4 needs an Ascension (more mines, less luck, bigger stakes).
- Random comments and odd household noises. The code follows the refactoring.guru pattern catalogue.

## 1.0.0

- The first version: minesweeper with stakes, cash-out, coin flip and Double or Nothing (×2, ×5, ×10…).
