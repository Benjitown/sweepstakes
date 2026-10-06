// The Stats tab: run and lifetime numbers, house rules, settings, replay tutorial, bankruptcy.
import { $, ico, fmt, esc, dur } from '../core/util.js';
import { START, LADDER, ROMAN } from '../data/economy.js';
import { rankName } from '../data/ranks.js';
import { SaveGame, S, pref, asc } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Game } from '../game/game.js';
import { UI } from './ui.js';
import { RunPanel } from './run-panel.js';
import { Coach } from './tutorial.js';

export const StatsView = {
  render() {
    const r = S.run, L = S.life;
    $('#stats').innerHTML = `<h2>This run</h2><dl>
      <dt>Time</dt><dd>${dur(r.time)}</dd><dt>Boards played</dt><dd>${r.boards}</dd><dt>Cashed out / blown up</dt><dd>${r.wins} / ${r.losses}</dd>
      <dt>Biggest single win</dt><dd>${fmt(r.biggest)}</dd><dt>Peak coins</dt><dd>${fmt(r.peak)}</dd><dt>Ascension</dt><dd>${ROMAN[asc()]}</dd><dt>Double or nothing wins</dt><dd>${r.don}</dd></dl>
      <h2>All time</h2><dl><dt>Rank</dt><dd>Lv ${L.lvl} · ${esc(rankName(L.lvl))}</dd><dt>Busts</dt><dd>${L.busts}</dd><dt>Best peak</dt><dd>${fmt(L.bestPeak)}</dd>
      <dt>Gems found</dt><dd>${fmt(L.gems)}</dd><dt>Jackpot gems</dt><dd>${L.jackpots}</dd><dt>Highest Ascension</dt><dd>${ROMAN[L.bestAsc || 0]}</dd>
      <dt>Casinos bought</dt><dd>${L.casinos}</dd><dt>Highest ladder rung</dt><dd>${L.donBest ? '×' + LADDER[L.donBest - 1] : 'none'}</dd></dl>
      <h2>House rules</h2><ol class="rules">
        <li>Pick a table and a stake, then deal. Your first dig is always safe.</li>
        <li>Safe digs nudge the pot up a little. Risky digs pay the odds: dig a tile with a 30% chance of a mine and the pot jumps about ×1.5.</li>
        <li>Hidden gems multiply the pot: ×1.2, ×1.5, ×2, or a ×5 jackpot. They’re never in the opening, so dig for them. About 1 board in 12 is golden and pays double.</li>
        <li>Clearing the whole board adds ×1.25. Each table has a limit, and hitting it cashes you out.</li>
        <li>Cash out whenever you like. Hit a mine and the stake is gone.</li>
        <li>Cash out big to build a streak: +10% profit per win, up to +100%.</li>
        <li>Free spin every 3 minutes of play. Your rank levels up as you play, pays out coins, and survives busting.</li>
        <li>Add-on cards bend the rules. You get 3 slots (5 with Bigger Pockets) and they sell back for half.</li>
        <li>Boards 5 to 8 each need an Ascension. Ascending adds mines and worsens your luck, but multiplies max stakes by 2.5.</li>
        <li>Double or nothing stakes everything: ×2, then ×5, ×10, ×25, ×100. Lose and the run is over.</li>
        <li>Run out of coins and you’re stuffed. Start again from ${fmt(START)}.</li>
        <li>Progress saves in this browser. The coins aren’t real money.</li></ol>
      <div class="toggles"><label class="sw"><input type="checkbox" id="tg-crt" ${pref('crt') ? 'checked' : ''}> Scanlines</label>
        <label class="sw"><input type="checkbox" id="tg-quips" ${pref('quips') ? 'checked' : ''}> Random nonsense</label>
        <label class="sw"><input type="checkbox" id="tg-odd" ${pref('odd') ? 'checked' : ''}> Weird noises</label></div>
      <div class="row-btns"><button class="btn blue" type="button" id="btnTut">Replay tutorial</button><button class="btn ghost" type="button" id="btnReset">Declare bankruptcy</button></div>`;
    ['crt', 'quips', 'odd'].forEach(k => { $('#tg-' + k).onchange = e => { S[k] = e.target.checked; Sound.toggle(e.target.checked); RunPanel.render(); SaveGame.saveNow(); }; });
    $('#btnTut').onclick = () => Coach.start(true);
    $('#btnReset').onclick = () => UI.modal(`${ico('skull', 'bigicon')}<h3 class="red">Start over?</h3><p>This wipes the current run. Your rank and all-time stats stay.</p>
      <div class="row"><button class="btn red" type="button" data-a="yes">Wipe it</button><button class="btn ghost" type="button" data-a="no">Keep going</button></div>`,
      { yes: () => { UI.closeModal(); Game.bust('manual'); }, no: () => UI.closeModal() });
  },
};
