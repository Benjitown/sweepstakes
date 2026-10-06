// What The Daily Sweep prints: a headline and a standfirst for every kind of story ({vars} come from the run), the
// weather, the small ads, and the puzzle. src/data/paper.js says which story leads.
export const STORIES = {
  casino: [['LOCAL GAMBLER BUYS THE CASINO'], ['The new owner promises “mostly the same, but mine”.']],
  bust: [['STUFFED', 'IT’S ALL GONE', 'RUN ENDS IN RUIN'], ['Lasted {lasted} and peaked at {peak}. The rank survives; nothing else does.']],
  bust_don: [['DOUBLE OR NOTHING SAYS NOTHING'], ['Everything on one go. Lasted {lasted}, peaked at {peak}.']],
  lotto_jackpot: [['SWEEPSTAKE JACKPOT WON LOCALLY', 'ALL FIVE NUMBERS UP!'], ['{pay} on a single line. The newsagent has asked for a photo.']],
  lotto_four: [['FOUR NUMBERS UP ON THE SWEEPSTAKE'], ['{pay} on one line. One number away from the jackpot, as everyone keeps saying.']],
  jackpot: [['JACKPOT GEM FOUND', '×5! JACKPOT AT {table}'], ['Neighbours report screaming.', 'A ×5 gem, right where nobody was looking.']],
  bingo_house: [['FULL HOUSE AT NAN’S BINGO'], ['Nan says she’s never been prouder, and she’s told the whole street.']],
  fruity_jackpot: [['THREE SEVENS ON THE FRUITY'], ['The landlord is having the machine looked at.']],
  ascend: [['ASCENSION: THE TABLES GET MEANER'], ['More mines, worse luck, bigger stakes. “Bring it on,” says the player.']],
  don_win: [['DOUBLE OR NOTHING? DOUBLE!', 'LADDER CLIMBER HITS ×{x}'], ['Everything on the line, and it came back ×{x}.']],
  cashout_big: [['{profit} WIN AT {table}', 'LOCAL PLAYER BANKS {profit}', '“I KNEW WHEN TO STOP,” SAYS {profit} WINNER'], ['A ×{mult} cash-out had the group chat in bits.', 'Experts call it luck. The player calls it skill.']],
  rug: [['KEVCOIN DEVS VANISH', 'RUG PULLED ON KEVCOIN'], ['Kev says KEVCOIN {v}.0 will be “completely different”.']],
  whopper: [['GIANT {veg} WINS VILLAGE SHOW'], ['Big Dave, on the next plot, declined to comment. Then commented at length.']],
  night_full: [['QUIZ NIGHT WHIZZ: FIVE OUT OF FIVE'], ['Priya has asked for a recount.']],
  karaoke_ovation: [['STANDING OVATION AT THE RED LION', 'LAST ORDERS, SUNG PROPERLY'], ['{score}% of the notes. Big Dave says he’s retiring from karaoke. He isn’t.']],
  karaoke_booed: [['BOOED OFF AT THE RED LION'], ['{score}% of the notes. The landlord has asked for the microphone back.']],
  scratch_big: [['SCRATCHCARD WIN: ×{x}'], ['The newsagent shrugged.']],
  duck_long: [['RUBBER DUCK ROMPS HOME AT ×{x}'], ['The long shot came good. The other ducks are said to be furious.']],
  boom_big: [['{stake} GONE IN ONE DIG', 'BOOM AT {table}'], ['“The odds were with me,” said the player. They weren’t.']],
  darts_won: [['DAVE DEFEATED AT THE OCHE'], ['{total} to {dave}. Big Dave blames the fruit machine for distracting him.']],
  banker_beat: [['NO DEAL! PLAYER BEATS THE BANKER'], ['He offered {offer}. The board paid {paid}.']],
  unlock: [['HIGH ROLLER SPOTTED AT {table}'], ['The bouncer let them straight in.']],
  clear: [['NOT ONE MINE: CLEAN SWEEP AT {table}'], ['Every safe tile dug. Nan described it as “very tidy”.']],
  rainbow: [['RAINBOW OVER THE ESTATE'], ['A pot of gold reported at the end of it, and a golden board soon after.']],
  claw_win: [['CLAW MACHINE FINALLY GIVES SOMETHING UP'], ['Witnesses describe the grip as “unusually firm”.']],
  banker_deal: [['BANKER STRIKES A DEAL'], ['A board sold for {paid}, cash. No questions asked.']],
  dare_won: [['DARE DONE! {who} PAYS UP'], ['They said it couldn’t be done in time. It could.']],
  storm: [['STORM LASHES STREET'], ['Lightning lit up every mine for a split second. Some people were looking.']],
  power: [['POWER CUT: GAMBLER PLAYS ON BY TORCHLIGHT'], ['The meter ran out mid-game. Danger money was paid.']],
  kev_launch: [['LOCAL MAN LAUNCHES CRYPTOCURRENCY'], ['Kev from work says KEVCOIN is “not a scam”. We asked twice.']],
  darts_lost: [['DAVE WINS AGAIN AT THE RED LION'], ['“Easiest money I’ve ever made,” he told reporters.']],
  levelup: [['PROMOTED: NOW A {rank}'], ['Colleagues describe the new title as “a bit much”.']],
  gull: [['SEAGULL MUGGING IN BROAD DAYLIGHT'], ['The suspect was last seen heading for the seafront.']],
  slugs: [['SLUGS STRIKE ON ALLOTMENTS'], ['A crop of {veg} lost overnight. Police have no leads.']],
  quiet: [['NOTHING HAPPENS IN SWEEPTOWN', 'SLOW NEWS DAY'], ['A board was dealt. Then another one. Our reporter fell asleep.']],
};
// what the "photo" on the front page shows (an icon from the sheet, printed in newsprint grey)
export const STORY_ART = {
  casino: 'casino', bust: 'skull', bust_don: 'dice', lotto_jackpot: 'ticket', lotto_four: 'ticket', jackpot: 'gem', bingo_house: 'bingo', fruity_jackpot: 'lucky7', ascend: 'asc', don_win: 'dice',
  cashout_big: 'coin', rug: 'kevcoin', whopper: 'veg', night_full: 'brain', karaoke_ovation: 'juke', karaoke_booed: 'juke', scratch_big: 'ticket', duck_long: 'duck', boom_big: 'bomb', darts_won: 'dart',
  banker_beat: 'phone', unlock: 'crown', clear: 'flag', rainbow: 'clover', claw_win: 'claw', banker_deal: 'phone', dare_won: 'dare', storm: 'bolt',
  power: 'bulb', kev_launch: 'kevcoin', darts_lost: 'dart', levelup: 'trophy', gull: 'gull', slugs: 'veg', quiet: 'coin',
};
export const SMALL_ADS = [
  'FOR SALE: rubber duck. One careful owner. Won’t stop winning.', 'LOST: smoke detector battery. Answers to “beep”.',
  'WANTED: someone to explain KEVCOIN to Kev.', 'FREE: marrows. Too many marrows. Please. (D.)', 'FOR SALE: torch, barely used, slightly singed.',
  'NAN’S BAKE SALE: Saturday, church hall. Everyone welcome, bring a tin.', 'WANTED: darts partner for Big Dave. Must lose gracefully.',
  'FOUND: one seagull. Not ours. Please collect.', 'FOR HIRE: Biscuit (dog). Finds mines. Paid in biscuits.',
  'PIANO LESSONS on the Red Lion’s old upright. Slightly out of tune, as is the teacher.', 'CAR BOOT: Sunday, end of the road. Haggling encouraged, mostly.',
  'FOR SALE: claw machine prize (crown). Slippery.', 'QUIZ NIGHT: Thursdays. Priya hosts. No phones. She will check.',
];
export const PAPER_WEATHER = {
  storm: 'Thunderstorms, clearing later. Chance of a rainbow: about even.', halloween: 'Foggy evenings, with trick or treaters.',
  bonfire: 'Cold and smoky, with fireworks.', xmas: 'Snow. Proper snow.', any: ['Mild. Grey. Typical.', 'Drizzle, then more drizzle.', 'Bright spells, if you go outside.', 'Breezy. Hold on to your coins (seagulls).'],
};
