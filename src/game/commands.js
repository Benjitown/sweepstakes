// Dig, Flag, Chord, Probe and Cash Out as objects, used by you and the bots alike.
import { Game } from './game.js';

/* =====================================================================================
   Command · https://refactoring.guru/design-patterns/command
   ===================================================================================== */
class Command { constructor(b, i, src = 'you') { this.b = b; this.i = i; this.src = src; } execute() {} }
export class DigCommand extends Command { execute() { Game.dig(this.b, this.i, this.src); } }
export class FlagCommand extends Command { execute() { Game.toggleFlag(this.b, this.i, this.src); } }
export class ChordCommand extends Command { execute() { Game.chord(this.b, this.i, this.src); } }
export class ProbeCommand extends Command { execute() { Game.probe(this.b, this.i); } }
export class CashOutCommand extends Command { constructor(b, why = 'manual') { super(b, null, why); } execute() { Game.cashOut(this.b, this.src); } }
export function invoke(cmd) { if (!cmd.b || cmd.b.over || Game.slots[cmd.b.slot] !== cmd.b) return; cmd.execute(); }
