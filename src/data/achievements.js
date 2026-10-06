// Achievements: what each one asks for and how big its reward is (tier 1–3 pays 20%, 50% or 100% of your top table's max stake).
export const ACHIEVEMENTS = [
  // boards
  { id: 'pocket',   tier: 1, icon: 'coin',      name: 'Pocket Money',        desc: 'Cash out a board.' },
  { id: 'x5',       tier: 1, icon: 'flame',     name: 'Five Alive',          desc: 'Cash out at ×5 or more.' },
  { id: 'x25',      tier: 2, icon: 'flame',     name: 'Quarter Pounder',     desc: 'Cash out at ×25 or more.' },
  { id: 'x100',     tier: 3, icon: 'flame',     name: 'Centurion',           desc: 'Cash out at ×100 or more.' },
  { id: 'sweep',    tier: 1, icon: 'bomb',      name: 'Clean Sweep',         desc: 'Clear a whole board.' },
  { id: 'limit',    tier: 2, icon: 'rocket',    name: 'House Limit',         desc: 'Max out a table’s limit.' },
  { id: 'coward',   tier: 1, icon: 'chicken',   name: 'Bok Bok',             desc: 'Let the Coward Chip cash out for you.' },
  { id: 'golden',   tier: 1, icon: 'crown',     name: 'Gold Rush',           desc: 'Cash out a golden board.' },
  // gems
  { id: 'shiny',    tier: 1, icon: 'gem',       name: 'Shiny',               desc: 'Find a gem.' },
  { id: 'ruby',     tier: 1, icon: 'gem',       name: 'Seeing Red',          desc: 'Find a ruby.' },
  { id: 'diamond',  tier: 2, icon: 'gem',       name: 'Diamond Hands',       desc: 'Find a diamond.' },
  { id: 'jackpot',  tier: 3, icon: 'gem',       name: 'Jackpot!',            desc: 'Find a jackpot gem.' },
  { id: 'allgems',  tier: 2, icon: 'gem',       name: 'Mined Out',           desc: 'Find every gem on a board with two or more.' },
  // nerve
  { id: 'fifty',    tier: 1, icon: 'dice',      name: 'Fifty-Fifty',         desc: 'Survive a dig with a 50% chance of a mine.' },
  { id: 'combo5',   tier: 2, icon: 'bolt',      name: 'On a Roll',           desc: 'Survive 5 risky digs in a row on one board.' },
  { id: 'boom',     tier: 1, icon: 'skull',     name: 'Kaboom',              desc: 'Hit a mine. Everyone does.' },
  { id: 'saved',    tier: 1, icon: 'shield',    name: 'Not Today',           desc: 'Get saved by a Spare Fuse or a Shield.' },
  { id: 'streak5',  tier: 2, icon: 'flame',     name: 'Heater',              desc: 'Win 5 boards in a row.' },
  { id: 'streak10', tier: 3, icon: 'flame',     name: 'Absolute Heater',     desc: 'Win 10 boards in a row.' },
  // gambling
  { id: 'don',      tier: 2, icon: 'dice',      name: 'Double Trouble',      desc: 'Win a Double or Nothing.' },
  { id: 'don10',    tier: 3, icon: 'dice',      name: 'Ladder Climber',      desc: 'Win the ×10 rung of Double or Nothing.' },
  { id: 'flip',     tier: 1, icon: 'coin',      name: 'Heads or Tails',      desc: 'Win a coin flip.' },
  { id: 'spinjack', tier: 2, icon: 'wheel',     name: 'Spin Doctor',         desc: 'Land the jackpot on the free spin.' },
  { id: 'bust',     tier: 1, icon: 'coinskull', name: 'Stuffed',             desc: 'Go bust. Your mum warned you.' },
  // empire
  { id: 'auto',     tier: 1, icon: 'bot',       name: 'Automation',          desc: 'Buy the Autominer.' },
  { id: 'boards4',  tier: 2, icon: 'boards',    name: 'Multitasker',         desc: 'Own 4 boards.' },
  { id: 'boards8',  tier: 3, icon: 'boards',    name: 'Octopus',             desc: 'Own all 8 boards.' },
  { id: 'abyss',    tier: 2, icon: 'lock',      name: 'It Stares Back',      desc: 'Unlock The Abyss.' },
  { id: 'asc1',     tier: 2, icon: 'asc',       name: 'Ascended',            desc: 'Ascend once.' },
  { id: 'asc4',     tier: 3, icon: 'asc',       name: 'Final Form',          desc: 'Reach Ascension IV.' },
  { id: 'million',  tier: 1, icon: 'bag',       name: 'Millionaire',         desc: 'Hold a million coins.' },
  { id: 'billion',  tier: 2, icon: 'bag',       name: 'Billionaire',         desc: 'Hold a billion coins.' },
  { id: 'trillion', tier: 3, icon: 'bag',       name: 'Unreasonable',        desc: 'Hold a trillion coins.' },
  { id: 'casino',   tier: 3, icon: 'casino',    name: 'The House Always Wins', desc: 'Buy the casino.' },
  { id: 'lvl10',    tier: 1, icon: 'trophy',    name: 'Regular',             desc: 'Reach rank level 10.' },
  { id: 'lvl30',    tier: 3, icon: 'trophy',    name: 'Part of the Furniture', desc: 'Reach rank level 30.' },
  // daily + tutorial
  { id: 'daily',    tier: 1, icon: 'calendar',  name: 'Daily Grind',         desc: 'Finish a Daily Challenge.' },
  { id: 'daily7',   tier: 3, icon: 'calendar',  name: 'Creature of Habit',   desc: 'Play the Daily Challenge 7 days in a row.' },
  { id: 'dailytop', tier: 2, icon: 'calendar',  name: 'Beat the Chat',       desc: 'Top the group chat’s Daily scores.' },
  { id: 'nan',      tier: 1, icon: 'bomb',      name: 'Nan Approved',        desc: 'Finish the tutorial without skipping.' },
  // around the house
  { id: 'duck',     tier: 1, icon: 'duck',      name: 'Quack Addict',        desc: 'Win a duck race.' },
  { id: 'longshot', tier: 2, icon: 'duck',      name: 'Long Shot',           desc: 'Win a duck race at ×8 or more.' },
  { id: 'kitten',   tier: 1, icon: 'kitten',    name: 'Cat Person',          desc: 'Pet the kitten.' },
  { id: 'battery',  tier: 1, icon: 'battery',   name: 'DIY Hero',            desc: 'Change the smoke detector’s battery.' },
  { id: 'raffle',   tier: 2, icon: 'door',      name: 'Fixed the Roof',      desc: 'Win the school raffle.' },
  { id: 'gull',     tier: 1, icon: 'gull',      name: 'Not My Chips',        desc: 'Shoo a seagull off your coins.' },
  { id: 'dark',     tier: 2, icon: 'bulb',      name: 'Danger Money',        desc: 'Cash out a board in a power cut.' },
  { id: 'scratch',  tier: 2, icon: 'ticket',    name: 'Scratch That Itch',   desc: 'Win ×20 or more on a scratchcard.' },
  { id: 'quiz',     tier: 2, icon: 'brain',     name: 'Know-It-All',         desc: 'Get 10 pub quiz questions right.' },
  { id: 'bingo',    tier: 1, icon: 'bingo',     name: 'Eyes Down',           desc: 'Get a line at Nan’s bingo.' },
  { id: 'house',    tier: 3, icon: 'bingo',     name: 'Full House',          desc: 'Get a full house at Nan’s bingo.' },
];
export const ACH_BY = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
export const ACH_REWARD = [0, .2, .5, 1];
