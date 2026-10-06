# Changelog

Each version is also a save in the built-in version control. Run `python tools/vc.py log` to list them, or
`python tools/vc.py export v3.0 v3.zip` to get any of them back.

## Unreleased (on experimental and dev)

- **Scratchcards** in the Flip Booth: three cards off the corner shop's shelf, nine panels each, three of a kind wins.
  Scratch the foil off with the mouse or a finger, or scratch it all at once.
- **The pub quiz:** now and then a friend asks the group chat a question with three answers. Get it right in 25
  seconds for a few coins. Switch it off in Stats.
- **A seagull** after your coins. You'll hear it first. Then it swoops onto your coin counter and starts pecking: tap
  it to shoo it off (it drops whatever it nicked from someone else), or it flies away with a small bite of your coins.
  Like everything around the house, it never takes you near bust. New achievement: Not My Chips.
- **Power cuts.** Now and then, mid-game, the prepaid meter runs out: the relay clunks, the fridge winds down and the
  lights go off. You play by torchlight (the beam follows your pointer, or your keyboard focus), and every board you
  cash out in the dark pays +50% danger money on its profit. Top the meter up from the bar at the top of the screen,
  or wait for the emergency credit to kick in. New achievement: Danger Money.
- **Nan's bingo,** a fourth tab in the Flip Booth (or press B). Buy one of three 90-ball tickets and Nan calls 60 balls,
  with the old calls ("two little ducks, 22", and the ducks quack). Your ticket dabs itself; a line pays ×1.5, two lines
  ×5 and a full house ×250 (about 1 in 860), so it pays back about 91%. Nan reads the calls out with your browser's own
  voice (switch it off in Stats), "Hurry up, Nan" skips to the end, and like the ducks and scratchcards the result is
  settled the moment you buy, so leaving mid-game still pays. Now and then she invites the group chat. New
  achievements: Eyes Down and Full House. The booth's tabs now have short names (Flip, Ducks, Scratch, Bingo).
- **Go outside.** A button in Stats (or press G) takes you to a little park for three minutes: birds, a breeze, the
  duck from the pond. The whole game waits while you're out (the clock, the bots, the house), and staying out the
  whole time pays a fresh air bonus. Come back early and you get nothing but a look from Nan. After an hour of play in
  one go, she suggests it herself. New achievement: Touched Grass.
- **The Fruity,** a fruit machine in the corner of the Flip Booth (its fifth tab, or press P). Three reels, one win
  line: three of a kind pays from ×6 (lemons) to ×250 (sevens), and two cherries on the left pay ×2. A go that loses
  may light up nudges (tap a reel to drop the symbol above onto the line) or holds (keep up to two reels for the next
  go; the machine picks the best ones for you). Wins wait in the meter: collect them, or gamble them double or
  nothing, up to three times. It pays back about 88% (93% if you learn the reel bands by heart, so the house still
  wins); `node tools/sim/fruity.mjs` works it out. New achievements: Nudge Nudge, Let It Ride and Triple Seven.
- **Thunderstorms.** Now and then distant thunder rolls in a storm: rain down the window and a darker room for a
  couple of minutes. Every flash of lightning lights up every hidden mine on your boards for a split second, so
  remember where they were. One storm in three, a strike lands right overhead and takes the power out. Nobody goes
  outside in that. New achievement: Lightning Reflexes (flag a mine within two seconds of a flash).
- **KEVCOIN.** A minute or so into a run, Kev launches a cryptocurrency in the group chat, with a ticker in the chat's
  header (or press K). The price wanders, a little downhill. Now and then Kev hypes it, and then it pumps (and gives
  half of it back) or it dumps, and you can't tell which from his post. Once in a while the devs vanish: a rug pull,
  trading suspended, and later KEVCOIN 2.0 without your old coins. Kev takes 5% of every buy and sell, and his exchange
  won't let you hold more than twice the top table's max stake. Holding it for five minutes loses about a third on
  average (`node tools/sim/kevcoin.mjs` plays a few strategies). New achievements: To the Moon and Rugged.
- The Flip Booth's five tabs now show their icon above the name at every screen size.
- `tools/build.py` now stops with a clear message on `import { x as y }`, which the bundler can't do.

## 4.4.0 (6 Oct 2026)

- **Volume controls.** Two sliders in Stats: Volume for everything, and Household noises for the door, the phone, the
  kitten, the ducks and the smoke detector on their own. They survive going bust.
- **The project moved to git.** Three branches: main (released), dev (works, not fully tested) and experimental
  (where new work lands, one feature branch at a time). The old versions are the tags v3.0 to v4.3. `tools/vc.py`
  still works if you ever need it without git.
- **GitHub Actions.** Every push builds the game, runs every browser suite on the source and the built file, and
  builds and tests the Kotlin, C# and Python versions. Each run attaches the built game. Pushing to main publishes it
  to GitHub Pages once Pages is switched on.

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
