// Your best runs: when a run ends (bust, Double or Nothing, or a fresh start of your own), it's measured by its peak
// and the top five are kept for good (they live in S.life, so going bust doesn't touch them).
import { bus } from '../core/bus.js';
import { S, asc } from '../core/state.js';

export const HALL_SIZE = 5;
export const Hall = {
  runs: () => (Array.isArray(S.life.hall) ? S.life.hall : []),
  // a run that's just ended; returns where it placed (1 to 5), or 0
  record(run, why) {
    if (!run || !(run.boards > 0)) return 0; // a run with no boards in it isn't much of a run
    const rec = { peak: run.peak, time: run.time, boards: run.boards, biggest: run.biggest, why, asc: asc(), at: Date.now() };
    const all = [...this.runs(), rec].sort((a, b) => b.peak - a.peak).slice(0, HALL_SIZE);
    S.life.hall = all;
    const place = all.indexOf(rec) + 1;
    bus.emit('hall', { place, runs: all.length });
    return place;
  },
  // where the run you're on would place right now (0 if it wouldn't)
  place(run = S.run) {
    const better = this.runs().filter(r => r.peak >= run.peak).length;
    return better < HALL_SIZE ? better + 1 : 0;
  },
};
