# Changelog

Each version is also a save in the built-in version control. Run `python tools/vc.py log` to list them, or
`python tools/vc.py export v3.0 v3.zip` to get any of them back.

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
