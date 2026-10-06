// The autominer bots: each one proposes a move for a board; the first that can, does.
import { lvl, has, on, hasA } from '../core/state.js';
import { Solver } from '../board/solver.js';
import { Game } from './game.js';
import { DigCommand, FlagCommand, CashOutCommand, invoke } from './commands.js';
import { Outside } from './outside.js';

/* =====================================================================================
   Strategy · https://refactoring.guru/design-patterns/strategy
   Each bot may propose one command for a board. The first active one wins.
   ===================================================================================== */
const BOTS = [
  { id: 'goblin', active: () => has('flagBot'),
    next(b) { const d = Solver.forBots(b); for (let i = 0; i < b.n; i++) if (d.KM[i] && !b.flag[i] && !b.open[i]) return new FlagCommand(b, i, 'bot'); return null; } },
  { id: 'autominer', active: () => has('sweepBot'),
    next(b) { const d = Solver.forBots(b); for (let i = 0; i < b.n; i++) if (d.KS[i] && !b.open[i]) return b.flag[i] ? new FlagCommand(b, i, 'bot') : new DigCommand(b, i, 'bot'); return null; } },
  { id: 'yolo', active: () => has('sweepBot') && on('yolo'),
    next(b) {
      const P = Solver.full(b).P; let best = -1, bp = 2;
      for (let i = 0; i < b.n; i++) { if (b.open[i] || b.flag[i] || P[i] >= 1) continue; const v = P[i] + Math.random() * 1e-4; if (v < bp) { bp = v; best = i; } }
      return best >= 0 && (!on('coward') || bp <= .25) ? new DigCommand(b, best, 'yolo') : null;
    } },
  { id: 'coward', active: () => has('sweepBot') && on('coward'), next: b => new CashOutCommand(b, 'coward') },
];
export const Bots = {
  timer: 0,
  delay: () => [520, 320, 180, 90][lvl('overclock')] * (hasA('oil') ? .6 : 1),
  tick() {
    try {
      for (const b of Game.slots) {
        if (!b || !b.started || b.over || Outside.on) continue; // nobody plays while you're outside
        for (const bot of BOTS) { if (!bot.active()) continue; const cmd = bot.next(b); if (cmd) { invoke(cmd); break; } }
      }
    } finally { this.timer = setTimeout(() => this.tick(), this.delay()); }
  },
};
