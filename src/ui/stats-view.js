// The Stats tab: run and lifetime numbers, house rules, settings, replay tutorial, bankruptcy.
import { $, $$, ico, fmt, fmtX, esc, dur } from '../core/util.js';
import { START, LADDER, ROMAN } from '../data/economy.js';
import { rankName } from '../data/ranks.js';
import { ACHIEVEMENTS, ACH_BY } from '../data/achievements.js';
import { VERSION } from '../version.js';
import { SaveGame, S, pref, level, asc } from '../core/state.js';
import { AudioEngine } from '../audio/engine.js';
import { Sound } from '../audio/sound.js';
import { WeirdNoises } from '../audio/noises.js';
import { Game } from '../game/game.js';
import { Achievements } from '../game/achievements.js';
import { HOUSE_EDGE } from '../board/payout.js';
import { UI } from './ui.js';
import { RunPanel } from './run-panel.js';
import { Coach } from './tutorial.js';
import { CoinChart } from './coin-chart.js';
import { WhatsNew } from './whats-new.js';
import { Keys } from './keys.js';
import { Chat } from './chat.js';
import { Quips } from './quip-popups.js';

export const StatsView = {
  // don't redraw the tab under someone dragging a slider
  busy() { const a = document.activeElement; return !!(a && a.type === 'range' && a.closest('#stats')); },
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
      <dt>Duck races won</dt><dd>${L.ducks || 0}</dd><dt>Pub quiz</dt><dd>${L.quiz ? `${L.quiz.right} right of ${L.quiz.asked}` : 'not yet'}</dd><dt>Scratchcards</dt><dd>${L.scratch ? `${L.scratch.bought} bought, best ×${L.scratch.best}` : 'none yet'}</dd><dt>Kittens petted</dt><dd>${(L.house && L.house.kitten) || 0}</dd><dt>Power cuts</dt><dd>${(L.house && L.house.powercut) || 0}${L.house && L.house.topups ? ` (${L.house.topups} topped up)` : ''}</dd><dt>Seagulls shooed</dt><dd>${(L.house && L.house.gull) || 0}${L.house && L.house.gullNicked ? ` (${L.house.gullNicked} got away)` : ''}</dd>
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
        <li>Life carries on around you. Answer the door, pet the kitten, shoo the seagull off your coins, change the smoke detector’s battery, keep playing through a power cut (for danger money). It might pay. It might not.</li>
        <li>The Flip Booth has a duck pond out back: back a duck, and long shots pay more.</li>
        <li>Progress saves in this browser. The coins aren’t real money.</li></ol>
      <div class="sliders">${[['vol', 'Volume'], ['noiseVol', 'Household noises']].map(([k, label]) => { const v = Math.round(level(k) * 100);
        return `<label class="sl" for="sl-${k}"><span>${label}</span><input type="range" id="sl-${k}" min="0" max="100" step="5" value="${v}"><output class="num" id="sl-${k}-o">${v}%</output></label>`; }).join('')}</div>
      <div class="toggles"><label class="sw"><input type="checkbox" id="tg-crt" ${pref('crt') ? 'checked' : ''}> Scanlines</label>
        <label class="sw"><input type="checkbox" id="tg-quips" ${pref('quips') ? 'checked' : ''}> Random nonsense</label>
        <label class="sw"><input type="checkbox" id="tg-odd" ${pref('odd') ? 'checked' : ''}> Weird noises &amp; visitors</label>
        <label class="sw"><input type="checkbox" id="tg-vibe" ${pref('vibe') ? 'checked' : ''}> Vibration</label>
        <label class="sw"><input type="checkbox" id="tg-rude" ${pref('rude') ? 'checked' : ''}> Rude chat</label>
        <label class="sw"><input type="checkbox" id="tg-quiz" ${pref('quiz') ? 'checked' : ''}> Pub quiz</label></div>
      <div class="row-btns"><button class="btn blue" type="button" id="btnTut">Replay tutorial</button><button class="btn ghost" type="button" id="btnReset">Declare bankruptcy</button></div>
      <p class="ver">Sweepstakes v${VERSION} · <button class="clink" type="button" id="btnNews">What’s new</button> · <button class="clink" type="button" id="btnKeys">Shortcuts</button></p>`;
    ['crt', 'quips', 'odd', 'vibe', 'rude', 'quiz'].forEach(k => { $('#tg-' + k).onchange = e => {
      S[k] = e.target.checked; Sound.toggle(e.target.checked); RunPanel.render(); SaveGame.saveNow();
      if (k === 'odd' && !S.odd) WeirdNoises.stopChirping();
      if (k === 'rude') { Chat.bag = []; Quips.bag = []; }
    }; });
    // volume sliders: they apply while you drag, and play a sample when you let go
    [['vol', () => Sound.msg()], ['noiseVol', () => WeirdNoises.play('duck')]].forEach(([k, sample]) => {
      const inp = $('#sl-' + k), out = $('#sl-' + k + '-o');
      inp.oninput = () => { S[k] = +inp.value / 100; out.textContent = inp.value + '%'; AudioEngine.get().applyVolume(); Sound.slide(S[k]); };
      inp.onchange = () => { SaveGame.saveNow(); sample(); };
    });
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
