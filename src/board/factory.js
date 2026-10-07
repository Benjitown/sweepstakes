// Makes boards: normal, Ascended (more mines, bigger pay), golden, and the landlord's specials.
import { hasA, asc } from '../core/state.js';
import { Board } from './board.js';
import { SPECIAL_BY } from '../data/specials.js';

/* =====================================================================================
   Factory Method · https://refactoring.guru/design-patterns/factory-method
   The base factory deals a table as printed; the ascended factory overrides the mine and limit steps.
   Both can deal a golden board: double pay, double limit.
   ===================================================================================== */
class BoardFactory {
  create(slot, table, stake, golden, special = '') {
    // a landlord's special (data/specials.js): Double Trouble has more mines and twice the limit, Gem Rush more gems
    const trouble = special === 'trouble', mines = trouble ? Math.min(table.w * table.h - 9, Math.round(this.mines(table) * SPECIAL_BY.trouble.mines)) : this.mines(table);
    const b = new Board({ slot, table, stake, mines, limit: this.limit(table) * (trouble ? 2 : 1) });
    b.gemsTotal = table.gems + (hasA('prospector') ? 1 : 0) + (special === 'rush' ? SPECIAL_BY.rush.gems : 0);
    if (special) b.special = special;
    if (golden) { b.golden = true; b.J = 2; b.lim *= 2; }
    if (hasA('sniffer')) b.fp = 1;
    return b;
  }
  mines(t) { return t.m; }
  limit(t) { return t.lim; }
}
class AscendedBoardFactory extends BoardFactory {
  constructor(level) { super(); this.level = level; }
  mines(t) { return Math.min(t.w * t.h - 9, Math.round(t.m * (1 + .1 * this.level))); }
  limit(t) { return t.lim * (1 + .5 * this.level); }
}
export const boardFactory = () => asc() ? new AscendedBoardFactory(asc()) : new BoardFactory();
