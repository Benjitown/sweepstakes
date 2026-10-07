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
import { OutsideView } from './outside-view.js';
import { Stars } from '../game/horoscope.js';
import { Tin } from '../game/biscuit-tin.js';
import { SeasonView } from './season-view.js';
import { CLAW_BY } from '../data/claw.js';
import { SKINS, SKIN_BY } from '../data/skins.js';
import { Skins } from '../game/skins.js';
import { StarsView } from './stars-view.js';
import { SIGNS } from '../content/horoscopes.js';
import { Music } from '../audio/music.js';
import { JukeboxView } from './jukebox-view.js';
import { RunCard } from './run-card.js';
import { Hall } from '../game/hall.js';

export const StatsView = {
  // don't redraw the tab under someone dragging a slider
  busy() { const a = document.activeElement; return !!(a && a.type === 'range' && a.closest('#stats')); },
  badge: '', // the achievement badge you last tapped
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
      <dt>Duck races won</dt><dd>${L.ducks || 0}</dd><dt>Pub quiz</dt><dd>${L.quiz ? `${L.quiz.right} right of ${L.quiz.asked}` : 'not yet'}</dd><dt>Nan’s bingo</dt><dd>${L.bingo ? `${L.bingo.tickets} ticket${L.bingo.tickets === 1 ? '' : 's'}, ${L.bingo.houses ? `${L.bingo.houses} full house${L.bingo.houses > 1 ? 's' : ''}` : `${L.bingo.lines + L.bingo.twos} with a line`}` : 'not yet'}</dd><dt>Dares</dt><dd>${L.dares && L.dares.taken ? `${L.dares.won} won, ${L.dares.lost} lost${L.dares.nah ? `, ${L.dares.nah} turned down` : ''}` : L.dares && L.dares.nah ? `${L.dares.nah} turned down` : 'not yet'}</dd>${L.pumpkins || L.treats || L.egged || L.ghosts ? `<dt>Halloween</dt><dd>${L.pumpkins || 0} pumpkin${L.pumpkins === 1 ? '' : 's'} dug up${L.treats ? `, sweets for ${L.treats}` : ''}${L.egged ? `, egged ${L.egged}×` : ''}${L.ghosts ? `, ${L.ghosts} friendly ghost${L.ghosts === 1 ? '' : 's'}` : ''}</dd>` : ''}${L.guys ? `<dt>Bonfire Night</dt><dd>a quid for the Guy ${L.guys === 1 ? 'once' : `${L.guys} times`}</dd>` : ''}<dt>Splat the Rat</dt><dd>${L.fete ? `${L.fete.goes} time${L.fete.goes === 1 ? '' : 's'}, best ${L.fete.best} out of 3` : 'not yet'}</dd><dt>Conkers</dt><dd>${L.conkers && L.conkers.played ? `${L.conkers.won} won of ${L.conkers.played}` : 'not yet'}</dd><dt>The tombola</dt><dd>${L.tombola && L.tombola.tickets ? `${L.tombola.tickets} ticket${L.tombola.tickets === 1 ? '' : 's'}, ${L.tombola.prizes} prize${L.tombola.prizes === 1 ? '' : 's'}` : 'not yet'}</dd><dt>Quiz nights</dt><dd>${L.night ? `${L.night.played} played, best ${L.night.best} out of 5${L.night.full ? ` (${L.night.full} perfect)` : ''}` : 'not yet'}</dd><dt>Darts with Dave</dt><dd>${L.darts && L.darts.played ? `${L.darts.won} won of ${L.darts.played}${L.darts.drawn ? `, ${L.darts.drawn} drawn` : ''}, best ${L.darts.best}` : 'not yet'}</dd><dt>Car boot sales</dt><dd>${L.boot ? `${L.boot.bought} card${L.boot.bought === 1 ? '' : 's'} bought${L.boot.saved ? `, ${fmt(L.boot.saved)} saved` : ''}${L.boot.boxes ? `, ${L.boot.boxes} mystery box${L.boot.boxes > 1 ? 'es' : ''}` : ''}` : 'not yet'}</dd><dt>The claw</dt><dd>${L.claw ? `${L.claw.goes} go${L.claw.goes === 1 ? '' : 's'}, ${L.claw.won} prize${L.claw.won === 1 ? '' : 's'}${L.claw.best ? ` (best: ${CLAW_BY[L.claw.best].name})` : ''}` : 'not yet'}</dd><dt>The allotment</dt><dd>${L.plot && L.plot.picked ? `${L.plot.picked} picked, ${fmt(L.plot.earned)} from the farm shop${L.plot.rosettes ? `, ${L.plot.rosettes} rosette${L.plot.rosettes > 1 ? 's' : ''}` : ''}${L.plot.slugs ? `, ${L.plot.slugs} lost to slugs` : ''}` : 'nothing picked yet'}</dd><dt>The Daily Sweep</dt><dd>${L.paper && L.paper.delivered ? `${L.paper.delivered} paper${L.paper.delivered === 1 ? '' : 's'}, ${L.paper.solved} puzzle${L.paper.solved === 1 ? '' : 's'} solved` : 'not delivered yet'}</dd><dt>The Sweepstake</dt><dd>${L.lotto && L.lotto.lines ? `${L.lotto.lines} line${L.lotto.lines === 1 ? '' : 's'}, ${fmt(L.lotto.won)} won, best ${L.lotto.best} number${L.lotto.best === 1 ? '' : 's'}` : 'no lines yet'}</dd><dt>Karaoke</dt><dd>${L.karaoke && L.karaoke.sung ? `${L.karaoke.sung} song${L.karaoke.sung === 1 ? '' : 's'}, best ${L.karaoke.best}%${L.karaoke.ovations ? `, ${L.karaoke.ovations} standing ovation${L.karaoke.ovations > 1 ? 's' : ''}` : ''}` : 'not yet'}</dd><dt>Sunday dinners</dt><dd>${L.sunday && (L.sunday.dinners || L.sunday.plates) ? `${L.sunday.dinners} at Nan’s${L.sunday.plates ? `, ${L.sunday.plates} plate${L.sunday.plates === 1 ? '' : 's'} kept warm` : ''}` : 'not yet'}</dd><dt>Nan’s biscuit tin</dt><dd>${Tin.amount() ? `${fmt(Tin.amount())} put by for a rainy day${Tin.full() ? ' (full)' : ''}` : 'nothing yet'}</dd><dt>Scratchcards</dt><dd>${L.scratch ? `${L.scratch.bought} bought, best ×${L.scratch.best}` : 'none yet'}</dd><dt>KEVCOIN</dt><dd>${L.kev && L.kev.bought ? `bought ${fmt(L.kev.bought)}, sold ${fmt(L.kev.sold)}${L.kev.best ? `, best ×${L.kev.best.toFixed(2)}` : ''}${L.kev.rugged ? `, rugged ${L.kev.rugged}×` : ''}` : 'not yet'}</dd><dt>The Fruity</dt><dd>${L.fruity ? `${L.fruity.goes} go${L.fruity.goes === 1 ? '' : 's'}${L.fruity.best ? `, best ×${L.fruity.best}` : ''}${L.fruity.sevens ? `, ${L.fruity.sevens} jackpot${L.fruity.sevens > 1 ? 's' : ''}` : ''}` : 'not yet'}</dd><dt>Kittens petted</dt><dd>${(L.house && L.house.kitten) || 0}</dd><dt>Power cuts</dt><dd>${(L.house && L.house.powercut) || 0}${L.house && L.house.topups ? ` (${L.house.topups} topped up)` : ''}</dd><dt>Storms</dt><dd>${(L.house && L.house.storm) || 0}</dd><dt>The Banker</dt><dd>${L.house && (L.house.deals || L.house.nodeals) ? `${L.house.deals || 0} deal${L.house.deals === 1 ? '' : 's'}, ${L.house.nodeals || 0} no deal${L.house.nodeals === 1 ? '' : 's'}` : 'hasn’t rung'}</dd><dt>Biscuits given</dt><dd>${(L.house && L.house.dog) || 0}</dd><dt>Ice creams</dt><dd>${(L.house && L.house.icecream) || 0}</dd><dt>Seagulls shooed</dt><dd>${(L.house && L.house.gull) || 0}${L.house && L.house.gullNicked ? ` (${L.house.gullNicked} got away)` : ''}</dd>
      <dt>Touched grass</dt><dd>${L.outside ? `${L.outside.breaks} time${L.outside.breaks === 1 ? '' : 's'}${L.outside.full < L.outside.breaks ? ` (${L.outside.full} for the full 3 minutes)` : ''}` : 'never'}</dd><dt>Star sign</dt><dd>${Stars.sign() >= 0 ? `${SIGNS[Stars.sign()]}${Stars.luckyToday() ? ` · lucky number today: ${Stars.luckyToday()}` : ''} <button class="clink" type="button" id="btnSign">change</button>` : 'Nan hasn’t asked yet'}</dd><dt>Best daily</dt><dd>${L.daily && L.daily.best ? '×' + fmtX(L.daily.best) : 'not yet'}</dd><dt>Daily streak</dt><dd>${L.daily && L.daily.streak ? L.daily.streak + ' day' + (L.daily.streak > 1 ? 's' : '') : '0'}</dd></dl>
      <h2>Your best runs <small>by peak coins</small></h2>
      ${Hall.runs().length ? `<ol class="hall">${Hall.runs().map(h => `<li><b class="num">${fmt(h.peak)}</b><span>${dur(h.time)} · ${fmt(h.boards)} board${h.boards === 1 ? '' : 's'}${h.asc ? ` · Ascension ${ROMAN[h.asc]}` : ''}</span><small>${esc({ don: 'Double or nothing', broke: 'Ran out of coins', manual: 'Started again' }[h.why] || 'Ran out of coins')}, ${new Date(h.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small></li>`).join('')}</ol>`
        : '<p class="hint">Your best runs go here once one’s over.</p>'}
      ${Hall.runs().length && Hall.place() && S.run.boards ? `<p class="hint">This run’s on course for number ${Hall.place()}.</p>` : ''}
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
        <li>Now and then a board comes with the landlord’s special chalked on it: Double Trouble (half as many mines again, but risky digs pay double and the limit doubles), Gem Rush (two extra gems), Against the Clock (forty seconds from your first dig: cash out in time for +50% on the profit, or it cashes out for you), the Lock-in (no cashing out till half the board’s dug, then the profit’s doubled), Happy Hour (half your stake back if it goes bang) or Last Orders (ten digs and that’s your lot, but +50% on the profit).</li>
        <li>Add-on cards bend the rules. You get 3 slots (5 with Bigger Pockets) and they sell back for half.</li>
        <li>Boards 5 to 8 each need an Ascension. Ascending adds mines and worsens your luck, but multiplies max stakes by 2.5.</li>
        <li>Double or nothing stakes everything: ×2, then ×5, ×10, ×25, ×100. Lose and the run is over.</li>
        <li>Run out of coins and you’re stuffed. Start again from ${fmt(START)}.</li>
        <li>The Daily Challenge (first chip by the tables) is one board a day, the same for everyone. No add-ons or stake: you play for the multiplier.</li>
        <li>Buying the casino adds +25% to every win’s profit for good. Each casino you buy stacks.</li>
        <li>Life carries on around you. Answer the door, pet the kitten, shoo the seagull off your coins, change the smoke detector’s battery, keep playing through a power cut (for danger money). It might pay. It might not.</li>
        <li>Kev launches a cryptocurrency a minute or so into a run. It goes up, it goes down, and sometimes the devs vanish. He takes 5% on every trade. Its ticker is in the chat (or press K).</li>
        <li>Now and then a friend dares you in the group chat: take it on and your stake goes in the pot; do the task before the clock runs out and you get double back. Nan never bets against you.</li>
        <li>Quiz night: now and then Priya runs a round of five questions, fifteen seconds each. Coins for every right answer, doubled if you get all five.</li>
        <li>Now and then Big Dave challenges you to darts: three each, best total wins the pot. Your aim wanders, so time your throws.</li>
        <li>Now and then a car boot sale sets up at the end of the road: add-on cards at boot-sale prices (some bargains, some rip-offs), two goes at haggling each (he might sell it to someone else while you think), and a mystery box.</li>
        <li>The booth’s claw machine: the claw swings along the top and you grab. Dead centre on a prize grips best, the dearer prizes are slippery, and it can still drop it on the way to the chute. Even perfect timing pays back a bit less than it costs.</li>
        <li>The seasons, by your calendar: all October, half the boards hide a pumpkin under a safe tile (×1.15 when you dig it up), one in five a friendly ghost (dig it up and it points out a mine) and trick or treaters come to the door (give them sweets for a sugar rush, or get egged). The first week of November, big wins get fireworks and kids come round with a Guy (a quid gets you a sparkler and a golden board; no change gets you a banger on the step). At Christmas it snows, and Nan sends a card.</li>
        <li>Every time a board cashes out in profit, Nan puts a little of her own money in her biscuit tin for you. Go bust and she brings it round: the fresh run starts with it.</li>
        <li>Nan reads your stars from the paper once a day, with a lucky number: the first time a board uncovers it that day, the pot goes ×1.25.</li>
        <li>Sometimes the Banker rings about your best board: its pot plus a premium, right now. Deal, or play on and try to beat him.</li>
        <li>If you hear a dog, it’s Biscuit from next door. Give him a biscuit and he’ll find a mine on your board and flag it.</li>
        <li>When you hear the ice cream van, catch it: a cone gives you a sugar rush, +25% on the profit of your next winning cash-out.</li>
        <li>In a thunderstorm, watch the boards: each flash of lightning shows every mine for a split second. One storm in three, a strike takes the power out.</li>
        <li>The Flip Booth has a duck pond out back: back a duck, and long shots pay more. Nan calls the bingo there too: a line, two lines or a full house in 60 calls.</li>
        <li>The Fruity, in the corner of the booth: three on the line pays. A go that loses may light up nudges (drop the symbol above onto the line) or holds (keep up to two reels for the next go). Wins wait in the meter: collect them, or gamble them double or nothing.</li>
        <li>Go outside now and then (the button below, or G). The game pauses, and three whole minutes out pays a fresh air bonus.</li>
        <li>The allotment (the fourth tab, or 4): seeds grow by the minute while you play. Pick them when they’re ripe and the farm shop buys them, usually for two or three times what the seeds cost; the slower the crop, the better it pays. Slugs might get a growing crop, a thunderstorm waters the lot, and now and then one comes up a whopper: double, and a rosette at the village show.</li>
        <li>The Daily Sweep comes through the letterbox every twenty minutes of play, written from your run: the biggest story on the front. Spot the mine in its puzzle for a prize. When you go bust, there’s a special edition.</li>
        <li>The Sweepstake, in the paper: buy Lucky Dip lines (five numbers from 30) and the next paper prints the draw. Three numbers pay ×12, four ×200, all five ×10,000. It’s a lottery: about half the money comes back.</li>
        <li>Karaoke, from the jukebox: sing Last Orders by pressing Sing (or Space) as each note reaches the mic. Your fee goes in the pot; 60% gets it back, 80% doubles it and 95% trebles it. The machine needs three minutes’ rest between singers, and now and then the group chat calls you up.</li>
        <li>On a Sunday, Nan asks you round for your dinner. Go, and you’re full of roast: +15% on the profit of your next five winning cash-outs. Can’t make it, and she keeps a plate warm for you anyway.</li>
        <li>Now and then the church fete’s on, with Splat the Rat: three goes for a fee. Pull the cord, and splat the rat as it shoots out of the drainpipe. One splat gets your money back, two pays ×3, all three ×8.</li>
        <li>In conker season (September to November), Priya challenges you to conkers. Stop the swing meter in the gold for a smash, the green for a hit; the first conker to crack loses, and a win pays double.</li>
        <li>Stats keeps your five best runs by their peak, for good.</li>
        <li>The jukebox (next to the mute button, or J) plays music. Pick a record or shuffle them; the Music slider and switch are below.</li>
        <li>Progress saves in this browser. The coins aren’t real money.</li></ol>
      <h2>Board style</h2><div class="skins">${SKINS.map(k => { const own = Skins.owned(k.id), on = Skins.current() === k.id;
        return `<button type="button" class="skin" data-skin="${k.id}" style="--sk:${k.tile}" aria-pressed="${on}" title="${esc(k.blurb)}"><i></i><b>${esc(k.name)}</b><small>${on ? 'On' : own ? 'Yours' : fmt(k.cost)}</small></button>`; }).join('')}</div>
      <div class="sliders">${[['vol', 'Volume'], ['musicVol', 'Music'], ['noiseVol', 'Household noises']].map(([k, label]) => { const v = Math.round(level(k) * 100);
        return `<label class="sl" for="sl-${k}"><span>${label}</span><input type="range" id="sl-${k}" min="0" max="100" step="5" value="${v}"><output class="num" id="sl-${k}-o">${v}%</output></label>`; }).join('')}</div>
      <div class="toggles"><label class="sw"><input type="checkbox" id="tg-crt" ${pref('crt') ? 'checked' : ''}> Scanlines</label>
        <label class="sw"><input type="checkbox" id="tg-quips" ${pref('quips') ? 'checked' : ''}> Random nonsense</label>
        <label class="sw"><input type="checkbox" id="tg-odd" ${pref('odd') ? 'checked' : ''}> Weird noises &amp; visitors</label>
        <label class="sw"><input type="checkbox" id="tg-vibe" ${pref('vibe') ? 'checked' : ''}> Vibration</label>
        <label class="sw"><input type="checkbox" id="tg-rude" ${pref('rude') ? 'checked' : ''}> Rude chat</label>
        <label class="sw"><input type="checkbox" id="tg-quiz" ${pref('quiz') ? 'checked' : ''}> Pub quiz</label>
        <label class="sw"><input type="checkbox" id="tg-dares" ${pref('dares') ? 'checked' : ''}> Dares from the chat</label>
        <label class="sw"><input type="checkbox" id="tg-seasons" ${pref('seasons') ? 'checked' : ''}> Seasonal bits</label>
        <label class="sw"><input type="checkbox" id="tg-nanvoice" ${pref('nanvoice') ? 'checked' : ''}> Nan reads the bingo</label>
        <label class="sw"><input type="checkbox" id="tg-music" ${pref('music') ? 'checked' : ''}> Music (the jukebox)</label></div>
      <div class="row-btns"><button class="btn green" type="button" id="btnGrass">Go outside</button><button class="btn gold" type="button" id="btnCard">Run card</button><button class="btn blue" type="button" id="btnTut">Replay tutorial</button><button class="btn ghost" type="button" id="btnReset">Declare bankruptcy</button></div>
      <p class="ver">Sweepstakes v${VERSION} · <button class="clink" type="button" id="btnNews">What’s new</button> · <button class="clink" type="button" id="btnKeys">Shortcuts</button> · <button class="clink" type="button" id="btnJukeS">Jukebox</button></p>`;
    ['crt', 'quips', 'odd', 'vibe', 'rude', 'quiz', 'dares', 'seasons', 'nanvoice', 'music'].forEach(k => { $('#tg-' + k).onchange = e => {
      S[k] = e.target.checked; Sound.toggle(e.target.checked); RunPanel.render(); SaveGame.saveNow();
      if (k === 'odd' && !S.odd) WeirdNoises.stopChirping();
      if (k === 'rude') { Chat.bag = []; Quips.bag = []; }
      if (k === 'seasons') SeasonView.apply();
      if (k === 'music') Music.sync();
    }; });
    // volume sliders: they apply while you drag, and play a sample when you let go
    [['vol', () => Sound.msg()], ['musicVol', () => {}], ['noiseVol', () => WeirdNoises.play('duck')]].forEach(([k, sample]) => {
      const inp = $('#sl-' + k), out = $('#sl-' + k + '-o');
      inp.oninput = () => { S[k] = +inp.value / 100; out.textContent = inp.value + '%'; AudioEngine.get().applyVolume(); Music.applyVolume(); Sound.slide(S[k]); };
      inp.onchange = () => { SaveGame.saveNow(); sample(); };
    });
    $$('#stats [data-skin]').forEach(b => b.onclick = () => {
      const k = SKIN_BY[b.dataset.skin];
      if (Skins.owned(k.id)) Skins.wear(k.id);
      else if (Skins.buy(k.id)) { Sound.buy(); UI.toast(`${k.name}: yours. ${k.blurb}`); }
      else return UI.toast(`${k.name} costs ${fmt(k.cost)}.`);
      this.render();
    });
    $('#btnTut').onclick = () => Coach.start(true);
    $('#btnGrass').onclick = () => OutsideView.open();
    $('#btnCard').onclick = () => RunCard.open();
    const sg = $('#btnSign'); if (sg) sg.onclick = () => { StarsView.ask(); UI.toast('Nan’s asking in the group chat.'); };
    $('#btnNews').onclick = () => WhatsNew.show();
    $('#btnKeys').onclick = () => Keys.help();
    $('#btnJukeS').onclick = () => JukeboxView.open();
    const cap = id => { const a = ACH_BY[id]; if (!a) return; const got = Achievements.has(a.id);
      $('#achCap').textContent = `${got ? '' : 'Locked · '}${a.name}: ${a.desc} (pays ${['', 'a bit', 'well', 'big'][a.tier]})`; };
    $$('#stats .ach').forEach(el => { el.onclick = () => { this.badge = el.dataset.ach; cap(this.badge); }; });
    if (this.badge) cap(this.badge); // (the tab redraws every few seconds: the badge you tapped stays explained)
    $('#btnReset').onclick = () => UI.modal(`${ico('skull', 'bigicon')}<h3 class="red">Start over?</h3><p>This wipes the current run. Your rank and all-time stats stay.</p>
      <div class="row"><button class="btn red" type="button" data-a="yes">Wipe it</button><button class="btn ghost" type="button" data-a="no">Keep going</button></div>`,
      { yes: () => { UI.closeModal(); Game.bust('manual'); }, no: () => UI.closeModal() });
  },
};
