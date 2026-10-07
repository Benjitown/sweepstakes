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
  voice (switch it off in Stats), "Faster please, Nan" skips to the end, and like the ducks and scratchcards the result is
  settled the moment you buy, so leaving mid-game still pays. Now and then she invites the group chat. New
  achievements: Eyes Down and Full House. The booth's tabs now have short names (Flip, Ducks, Scratch, Bingo).
- **Go outside.** A button in Stats (or press G) takes you to a little park for three minutes: birds, a breeze, the
  duck from the pond. The whole game waits while you're out (the clock, the bots, the house), and staying out the
  whole time pays a fresh air bonus. Come back early and there's no bonus, but Nan's glad you went. After an hour of play in
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
  outside in that. New achievement: Lightning Reflexes (flag a mine within two seconds of a flash). Half the time,
  when it's passed, there's a rainbow: a pot of gold at the end of it, so your next board's golden.
- **KEVCOIN.** A minute or so into a run, Kev launches a cryptocurrency in the group chat, with a ticker in the chat's
  header (or press K). The price wanders, a little downhill. Now and then Kev hypes it, and then it pumps (and gives
  half of it back) or it dumps, and you can't tell which from his post. Once in a while the devs vanish: a rug pull,
  trading suspended, and later KEVCOIN 2.0 without your old coins. Kev takes 5% of every buy and sell, and his exchange
  won't let you hold more than twice the top table's max stake. Holding it for five minutes loses about a third on
  average (`node tools/sim/kevcoin.mjs` plays a few strategies). New achievements: To the Moon and Rugged.
- **The ice cream van.** Now and then you'll hear Greensleeves (tinny, warbling, louder as it comes up the road and a
  touch flat as it goes) and the van drives along the bottom of the screen. Tap it before it's gone and it stops to
  hand you a cone: a sugar rush, +25% on the profit of your next winning cash-out (a pink chip in the header shows it's
  waiting). New achievement: Brain Freeze.
- **Nan's stars.** Nan asks your star sign in the group chat (once; change it in Stats), then reads your horoscope out
  of the paper once a day, with a lucky number from 2 to 6. The first time a board uncovers it that day, its pot goes
  ×1.25. The reading comes from the date and your sign, so it's the same all day. New achievement: Written in the
  Stars.
- **The Banker.** When a board has a good profit on it, a desk phone might trill: the Banker, offering to buy that
  board right now for its pot plus a premium (15 to 60% of its profit). Deal, and it's sold. No deal, and you play on;
  cash it out later for more than he offered and the chat will never let him forget it. He only rings once about a
  board. New achievements: Deal! and No Deal.
- **Biscuit, next door's dog.** If you hear barking, he trots in along the bottom of the screen and waits ("Woof?").
  Give him a biscuit (3% of the top table's max stake) and he sniffs out a mine on your board and sits on it: flagged,
  glowing orange for a moment. Ignore him and he wanders off. New achievement: Good Boy.
- **More to talk about:** eight new group chat conversations (Dave's 4kg marrow, Kev's royalties, Nan's Wireless is her
  song) and nine more quiz questions.
- **The Daily Sweep,** the local paper, written from your run. Every twenty minutes of play it comes through the
  letterbox (a chip in the header says so): the run's biggest moment on the front page (a jackpot gem, Dave beaten at
  darts, a rug pull, a giant marrow at the village show), two more stories down the side, the weather, KEVCOIN's
  price, Nan's stars and the small ads. At the bottom, Spot the Mine: a little board where one or two of the covered
  tiles have to be mines. Tap one of those for a prize. Go bust and the bust screen's "Read all about it" opens a special
  edition. "Copy the front page" puts the headline on your clipboard for the group chat.
- **The Sweepstake,** the paper's lottery. Buy Lucky Dip lines, or pick your own five (from 30, up to five lines a draw) in
  The Daily Sweep, and the next paper prints the draw and pays out: three numbers ×12, four ×200, all five ×10,000
  (about 1 in 142,500). Like any lottery it's a bad bet: about half the money comes back, worked out exactly. A big
  win makes the front page.
- **New achievements:** Green Fingers (pick 10 crops), Best in Show (grow a whopper), Read All About It (solve the
  paper's puzzle), Name That Tune (put every record on the jukebox), Standing Ovation (95% at karaoke) and Lucky
  Numbers (three numbers on the Sweepstake). Karaoke night makes the paper too, for better or worse.
- **The allotment,** a fourth tab (or press 4). Four beds and six packets of seeds, from radishes (two minutes) to
  pumpkins (fourteen). They grow by the minute while you play, so they wait while you're outside, and when they're
  ripe a chip in the header says so. Pick them and the farm shop buys them, usually for two or three times what the
  seeds cost (a packet's price follows your top table's max stake), and the slower the crop, the better it pays by
  the minute. Slugs might get a crop that's still growing, a thunderstorm waters the lot (two minutes closer), one
  in twelve comes up a whopper (double, and a rosette at the village show), and in October pumpkins fetch 30% more.
  Big Dave has the next plot, and has opinions about marrows.
- **Karaoke at the Red Lion,** from the jukebox. Sing Last Orders: the notes of the tune slide along a lane
  towards the mic (high notes higher), and you press Sing, or Space, as each one gets there. The record plays under
  you with the tune as a guide, counted in with four clicks, and the jukebox waits until you're done. Your fee goes
  in the pot: 60% of the notes gets it back, 80% doubles it and 95% trebles it, with a standing ovation. Pressing
  between notes counts as a bum note. The machine needs three minutes' rest between singers. Now and then Priya or
  Big Dave calls you up in the group chat (the Music switch covers it).
- **A record scratch** when you go bust or a big board blows up: the needle skids and the music ducks. The jukebox
  also turns down while Nan calls the bingo.
- **The jukebox.** Music at last. The button next to mute (or J) opens the Red Lion's jukebox, with four records
  synthesised note by note in your browser: High Roller Lounge (slow swing on an electric piano, brushes and a double
  bass), Last Orders (a knees-up on the pub's old upright), Insert Coin (Kev's eight-bit tune) and Nan's Wireless (a
  gentle waltz on a music box), plus shuffle. Each season adds one: The Haunted Arcade in October (spooky organ
  and a theremin), Penny for the Guy on Bonfire Night (a jig) and Tinsel on the Telly at Christmas (sleigh bells and a
  celesta). It sits quietly under the game, with a Music slider in the jukebox and in Stats. It stops while you're
  muted, outside or in another tab, and when the power goes the record winds down. Switch it off in the jukebox or in
  Stats. The group chat's header shows what's playing (tap it for the jukebox), and everyone in the chat has an
  opinion about your record.
- **Board styles,** in Stats: Card table felt, Neon, Nan's knitting (purple wool, cable stitch) and Gold leaf, for
  the tiles on every board (and Double or Nothing's). Each is bought once with coins and kept for good: going bust
  doesn't take it back, and swapping between the ones you own is free. New achievement: Interior Design.
- **Quiz night.** Now and then Priya runs a proper round at the Red Lion: five questions in a row, fifteen seconds
  each, coins for every right answer and double for all five. Leave half-way and you keep what you've won. The "Pub
  quiz" switch covers it. New achievement: Quiz Champion.
- **Darts at the Red Lion.** Now and then Big Dave challenges you in the group chat: three darts each, best total
  wins the pot. Dave throws first (he aims for treble 20, give or take), then your aim wanders round a proper
  dartboard and you press Throw (or Space) when it's where you want it. Beat him for double your stake, draw for
  your stake back, or walk away and he keeps it. "Dares from the chat" in Stats switches him off too. New
  achievements: Arrows and One Hundred and Eighty!
- **The car boot sale.** Every so often a bloke sets up a pasting table at the end of the road with three add-on
  cards you haven't got, at his prices (anywhere from 45% to 135% of the shop's, so check), and a mystery box. You
  get two goes at haggling over each card: a cheeky offer at 60% first, then a fair one at 80%. He might take it, say
  no, or sell it to someone else while you dither. He packs up after a minute and a bit. New achievement: Haggler.
- **The claw machine,** the Flip Booth's sixth tab. The claw swings along the top of a glass case of prizes and you
  press Grab to drop it: a rubber duck (×1.5), a kitten plushie (×2), a googly-eyed bomb (×3 and a shield), a big
  glass gem (×5) or the golden crown (×10 and a golden board). Dead centre grips best, the dearer prizes are
  slippery, and it can still drop it on the way to the chute. Even perfect timing pays back a little less than a go
  costs (90 to 96%); grabbing blind, about half. Leave mid-grab and the prize still pays. New achievements: Claw
  Blimey and Heavy Is the Head.
- **The seasons,** by your device's calendar. **Halloween (all October):** the room goes purple, a pumpkin sits by
  the logo and the odd bat flaps past. Half the boards hide a pumpkin under a safe tile the opening didn't reach: dig
  it up and the pot goes ×1.15. Trick or treaters come to the door: give them sweets and they give you a sugar rush
  back (+25% on your next winning cash-out), or pretend you're out and they egg the window. **Bonfire Night (1–7
  November):** fireworks over every win of ×5 or more, and a few in the distance. **Christmas (1–26 December):** snow
  past the window, holly by the logo, and a card from Nan through the door with something in it. Try one out any
  time with `?season=halloween` (or `bonfire`, `xmas`, `none`) on the address, or switch them off with "Seasonal
  bits" in Stats. New achievements: Pumpkin Patch and Trick or Treat.
- **Dares.** Now and then someone in the group chat dares you: Tash bets 5,000 you can't cash out a board at ×3 in
  three minutes, Dave that you can't clear one without a single flag, Priya that you can't win three in a row. Say
  "You're on" and your stake goes in the pot (a tenth of your coins); do it before the clock in the header runs out
  and you get double back. Say "Nah" and you get clucked at. The clock stops while you're outside, Nan never bets
  against you (she cheers), and "Dares from the chat" in Stats switches them off. New achievements: Dared and Done
  and Triple Dog Dare.
- **Nan is always lovely.** Every one of her lines is warm and signs off with a kiss, she's out of the rude chat, and
  nobody in the group chat has a go at her any more (the old digs at her, and at Grandad, are gone). When you lose she's
  there with a kind word, and when you win she's told the whole street.
- **Nan's biscuit tin.** Every time a board cashes out in profit, Nan puts a little of her own money by for you (3% of
  the profit, never out of your winnings, up to 2,500). Go bust and she brings the tin round: the fresh run starts
  with what's in it. Starting a fresh run yourself doesn't count. Stats shows what's in the tin. New achievement:
  Rainy Day.
- The Flip Booth's tabs (six of them now) show their icon above the name at every screen size.
- **More to talk about:** a dozen new pub quiz questions, ten new group chat conversations (Nan's put a fiver in
  every coat you own), more quips and more of Nan's horoscopes.
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
