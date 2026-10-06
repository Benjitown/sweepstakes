// The Stats tab: run and lifetime numbers, house rules, settings, replay tutorial, bankruptcy.
import { $, $$, ico, fmt, fmtX, esc, dur } from '../core/util.js';
import { START, LADDER, ROMAN } from '../data/economy.js';
import { rankName } from '../data/ranks.js';
import { ACHIEVEMENTS, ACH_BY } from '../data/achievements.js';
import { VERSION } from '../version.js';
import { SaveGame, S, pref, asc } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Game } from '../game/game.js';
import { Achievements } from '../game/achievements.js';
import { HOUSE_EDGE } from '../board/payout.js';
import { UI } from './ui.js';
import { RunPanel } from './run-panel.js';
import { Coach } from './tutorial.js';
import { CoinChart } from './coin-chart.js';
import { WhatsNew } from './whats-new.js';
import { Keys } from './keys.js';

export const StatsView = {
  render() {
    const r = S.run, L = S.life;
    $('#stats').innerHTML = `<h2>This run</h2><dl>
      <dt>Time</dt><dd>${dur(r.time)}</dd><dt>Boards played</dt><dd>${r.boards}</dd><dt>Cashed out / blown up</dt><dd>${r.wins} / ${r.losses}</dd>
      <dt>Biggest single win</dt><dd>${fmt(r.biggest)}</dd><dt>Peak coins</dt><dd>${fmt(r.peak)}</dd><dt>Ascension</dt><dd>${ROMAN[asc()]}</dd><dt>Double or nothing wins</dt><dd>${r.don}</dd></dl>
      <div class="chart">${CoinChart.svg()}</div>
      <h2>All time</h2><dl><dt>Rank</dt><dd>Lv ${L.lvl} · ${esc(rankName(L.lvl))}</dd><dt>Busts</dt><dd>${L.busts}</dd><dt>Best peak</dt><dd>${fmt(L.bestPeak)}</dd>
      <dt>Gems found</dt><dd>${fmt(L.gems)}</dd><dt>Jackpot gems</dt><dd>${L.jackpots}</dd><dt>Highest Ascension</dt><dd>${ROMAN[L.bestAsc || 0]}</dd>
      <dt>Casinos bought</dt><dd>${L.casinos}</dd><dt>Highest ladder rung</dt><dd>${L.donBest ? '×' + LADDER[L.donBest - 1] : 'none'}</dd>
      ${L.casinos ? `<dt>House edge</dt><dd>+${Math.round(HOUSE_EDGE * 100 * L.casinos)}% profit</dd>` : ''}
      <dt>Best daily</dt><dd>${L.daily && L.daily.best ? '×' + fmtX(L.daily.best) : 'not yet'}</dd><dt>Daily streak</dt><dd>${L.daily && L.daily.streak ? L.daily.streak + ' day' + (L.daily.streak > 1 ? 's' : '') : '0'}</dd></dl>
      <h2>Achievements <small>${Achievements.count()}/${ACHIEVEMENTS.length}</small></h2>
      <div class="achs">${ACHIEVEMENTS.map(a => { const got = Achievements.has(a.id); return `<button type="button" class="ach t${a.tier}${got ? ' got' : ''}" data-ach="${a.id}" title="${esc(a.name)}: ${esc(a.desc)}" aria-label="${esc(a.name)}, ${got ? 'unlocked' : 'locked'}: ${esc(a.desc)}">${ico(got ? a.icon : 'lock')}</button>`; }).join('')}</div>
      <p class="achcap hint" id="achCap">Tap a badge to see what it wants from you.</p>
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
        <li>The Daily Challenge (first chip by the tables) is one board a day, the same for everyone. No add-ons or stake: you play for the multiplier.</li>
        <li>Buying the casino adds +25% to every win’s profit for good. Each casino you buy stacks.</li>
        <li>Progress saves in this browser. The coins aren’t real money.</li></ol>
      <div class="toggles"><label class="sw"><input type="checkbox" id="tg-crt" ${pref('crt') ? 'checked' : ''}> Scanlines</label>
        <label class="sw"><input type="checkbox" id="tg-quips" ${pref('quips') ? 'checked' : ''}> Random nonsense</label>
        <label class="sw"><input type="checkbox" id="tg-odd" ${pref('odd') ? 'checked' : ''}> Weird noises</label>
        <label class="sw"><input type="checkbox" id="tg-vibe" ${pref('vibe') ? 'checked' : ''}> Vibration</label></div>
      <div class="row-btns"><button class="btn blue" type="button" id="btnTut">Replay tutorial</button><button class="btn ghost" type="button" id="btnReset">Declare bankruptcy</button></div>
      <p class="ver">Sweepstakes v${VERSION} · <button class="clink" type="button" id="btnNews">What’s new</button> · <button class="clink" type="button" id="btnKeys">Shortcuts</button></p>`;
    ['crt', 'quips', 'odd', 'vibe'].forEach(k => { $('#tg-' + k).onchange = e => { S[k] = e.target.checked; Sound.toggle(e.target.checked); RunPanel.render(); SaveGame.saveNow(); }; });
    $('#btnTut').onclick = () => Coach.start(true);
    $('#btnNews').onclick = () => WhatsNew.show();
    $('#btnKeys').onclick = () => Keys.help();
    $$('#stats .ach').forEach(el => { el.onclick = () => { const a = ACH_BY[el.dataset.ach], got = Achievements.has(a.id);
      $('#achCap').textContent = `${got ? '' : 'Locked · '}${a.name}: ${a.desc} (pays ${['', 'a bit', 'well', 'big'][a.tier]})`; }; });
    $('#btnReset').onclick = () => UI.modal(`${ico('skull', 'bigicon')}<h3 class="red">Start over?</h3><p>This wipes the current run. Your rank and all-time stats stay.</p>
      <div class="row"><button class="btn red" type="button" data-a="yes">Wipe it</button><button class="btn ghost" type="button" data-a="no">Keep going</button></div>`,
      { yes: () => { UI.closeModal(); Game.bust('manual'); }, no: () => UI.closeModal() });
  },
};
