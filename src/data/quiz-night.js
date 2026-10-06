// Quiz night at the Red Lion: now and then Priya runs a proper round: five questions in a row, fifteen seconds each,
// coins for every right answer and double for getting all five. The questions come from the pub quiz's bank.
export const NIGHT = {
  EVERY: [600, 1200],  // seconds between quiz nights
  QUESTIONS: 5,
  SECONDS: 15,         // to answer each one
  PRIZE: .05,          // per right answer: this share of your top table's max stake (at least 10)
  FULL: 2,             // all five right: the lot, doubled
  ANSWER: 40,          // seconds to say you're in before she starts without you
};
