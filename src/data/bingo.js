// Nan's speed bingo: the tickets on sale, how many numbers she calls, and what each result pays (× the ticket price).
export const BINGO_CALLS = 60; // of the 90 balls
export const BINGO_TICKETS = [
  { id: 'penny', name: 'Penny Bingo', share: .02, col: '#3fc18a', blurb: 'For the regulars.' },
  { id: 'proper', name: 'Proper Bingo', share: .1, col: '#009dff', blurb: 'Dabbers at the ready.' },
  { id: 'big', name: 'Nan’s Big Night', share: .5, col: '#a275f0', blurb: 'She’s had a sherry.' },
];
// by how many of the ticket's three rows are complete after the last call (3 is a full house).
// With 60 calls: a line 29.7% of the time, two lines 3.6%, a full house 1 in 861, so it pays back about 91%.
export const BINGO_PAYS = [0, 1.5, 5, 250];
