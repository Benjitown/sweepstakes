// How each friend puts a dare to you, and what they say after. {task}, {stake}, {mins} and {pay} get filled in.
export const DARE_ASK = {
  dave:  ['bet you {stake} you can’t {task} in the next {mins} minutes', 'right. {stake} says you can’t {task} in {mins} minutes. go'],
  tash:  ['dare you to {task} in {mins} minutes. {stake} on it', 'I bet {stake} you bottle it. {task}. {mins} minutes. starting now'],
  kev:   ['I’ll pay you double your {stake} if you {task} in {mins} minutes. I literally cannot lose', 'statistically you can’t {task} in {mins} minutes. {stake} on it'],
  priya: ['{stake} says you can’t {task} in {mins} minutes', 'quick dare: {task}. {mins} minutes, {stake}. in or out'],
};
export const DARE_ON = {
  dave: ['game on'], tash: ['oh this is going to be good'], kev: ['the clock is ticking. I’ve started a spreadsheet'], priya: ['clock’s running'],
};
export const DARE_WON = {
  dave: ['fine. FINE. +{pay}', 'unbelievable. pay the man. +{pay}'], tash: ['how. HOW. fine, +{pay}', 'I hate this. +{pay}'],
  kev: ['I’ve been played. sending {pay}', 'that wasn’t statistically possible. +{pay}'], priya: ['respect. +{pay} sent', 'ugh. fair play. +{pay}'],
};
export const DARE_LOST = {
  dave: ['too slow. that’s my {stake} now', 'easiest {stake} I’ve ever made'], tash: ['HAHA. {stake} please', 'bottled it. as predicted'],
  kev: ['thank you for funding KEVCOIN', 'the {stake} is mine. let this be a learning experience'], priya: ['time’s up. I’ll take that {stake}', 'and that’s why you don’t take dares from me'],
};
export const DARE_NAH = { dave: ['chicken'], tash: ['bok bok bok'], kev: ['sensible. boring. but sensible'], priya: ['wise'] };
export const DARE_GONE = { dave: ['forget it then'], tash: ['too slow to even say yes'], kev: ['offer withdrawn. the market has moved'], priya: ['never mind'] };
