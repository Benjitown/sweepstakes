// What reacts to each game event (views, sounds, chat, rank). This one list is the whole wiring diagram.
import { ico, fmt, fmtX, dur } from './core/util.js';
import { START, TABLES, SPIN_EVERY, ROMAN, LADDER } from './data/economy.js';
import { ABY } from './data/addons.js';
import { bus } from './core/bus.js';
import { SaveGame, S, lvl, asc, pref, has } from './core/state.js';
import { Sound } from './audio/sound.js';
import { Game } from './game/game.js';
import { Rack } from './game/rack.js';
import { Rank } from './game/rank.js';
import { UI } from './ui/ui.js';
import { Background } from './ui/background.js';
import { FX } from './ui/fx.js';
import { Chat } from './ui/chat.js';
import { Quips } from './ui/quip-popups.js';
import { Banner } from './ui/banner.js';
import { RunPanel } from './ui/run-panel.js';
import { TablesView } from './ui/tables-view.js';
import { StakeView } from './ui/stake-view.js';
import { BoardsView } from './ui/boards-view.js';
import { AddonStrip, RackView } from './ui/addon-views.js';
import { ShopView } from './ui/shop-view.js';
import { SpinView } from './ui/spin-view.js';
import { StatsView } from './ui/stats-view.js';
import { Tabs } from './ui/tabs.js';
import { Coach } from './ui/tutorial.js';
import { Achievements } from './game/achievements.js';
import { DailyView } from './ui/daily-view.js';
import { CoinChart } from './ui/coin-chart.js';
import { Haptics } from './ui/haptics.js';
import { HOUSE_EDGE } from './board/payout.js';
import { WeirdNoises } from './audio/noises.js';
import { Household } from './game/household.js';
import { HouseholdView } from './ui/household-view.js';
import { FlipView } from './ui/flip-view.js';
import { DuckRaceView } from './ui/duck-race-view.js';
import { ScratchView } from './ui/scratch-view.js';
import { BingoView } from './ui/bingo-view.js';
import { FruityView } from './ui/fruity-view.js';
import { OutsideView } from './ui/outside-view.js';
import { Outside } from './game/outside.js';
import { Quiz } from './game/quiz.js';
import { QuizView } from './ui/quiz-view.js';
import { AudioEngine } from './audio/engine.js';
import { PowerCut } from './game/power-cut.js';
import { PowerView } from './ui/power-view.js';
import { Storm } from './game/storm.js';
import { StormView } from './ui/storm-view.js';
import { Kev } from './game/kevcoin.js';
import { KevView, fmtKev } from './ui/kevcoin-view.js';
import { IceCream } from './game/ice-cream.js';
import { Stars } from './game/horoscope.js';
import { StarsView } from './ui/stars-view.js';
import { Banker } from './game/banker.js';
import { Dog } from './game/dog.js';
import { Tin } from './game/biscuit-tin.js';
import { Dares } from './game/dares.js';
import { DareView } from './ui/dare-view.js';
import { Seasons } from './game/seasons.js';
import { ClawView } from './ui/claw-view.js';
import { Skins } from './game/skins.js';
import { CarBoot } from './game/car-boot.js';
import { Darts } from './game/darts.js';
import { QuizNightView } from './ui/quiz-night-view.js';
import { DartsView } from './ui/darts-view.js';
import { CarBootView } from './ui/car-boot-view.js';
import { SeasonView } from './ui/season-view.js';
import { PUMPKIN } from './data/seasons.js';
import { TREAT_CARD, EGGED_CARD } from './content/seasons.js';
import { Music } from './audio/music.js';
import { SPECIAL_BY } from './data/specials.js';
import { Specials } from './game/specials.js';
import { Requests } from './game/requests.js';
import { TRACKS } from './data/jukebox.js';
import { JukeboxView } from './ui/jukebox-view.js';
import { Karaoke } from './game/karaoke.js';
import { KaraokeView } from './ui/karaoke-view.js';
import { Allotment } from './game/allotment.js';
import { AllotmentView } from './ui/allotment-view.js';
import { VEG } from './content/allotment.js';
import { News, Paper } from './game/paper.js';
import { PaperView } from './ui/paper-view.js';
import { FRIENDS } from './content/chat-lines.js';

const RED = 'var(--red)', GOLD = 'var(--gold)', GREEN = 'var(--green)', PURPLE = 'var(--purple)';
export function renderAll(keepModal) {
  RunPanel.snap(); RunPanel.render(); AddonStrip.render(); TablesView.render(); StakeView.render(); BoardsView.renderAll(); ShopView.render();
  if (Tabs.showing('rack')) RackView.render();
  if (Tabs.showing('stats')) StatsView.render();
  if (!keepModal && !UI.modalClosed() && !UI.modalLocked) UI.closeModal();
}
const xpFor = (b, cleared) => Math.round((8 + 4 * TABLES.indexOf(b.t)) * (cleared ? 1.5 : 1) + 3 * b.gemsFound);
bus.on('reset', ({ keepModal } = {}) => renderAll(keepModal));
bus.on('coins', ({ bump, fx }) => { RunPanel.coins(bump, fx); RunPanel.render(); TablesView.render(); StakeView.render(); ShopView.afford(); BoardsView.renderEmpties(); });
bus.on('stake', () => BoardsView.renderEmpties());
bus.on('table:selected', () => { TablesView.render(); TablesView.reveal(); StakeView.render(); BoardsView.renderEmpties(); ShopView.render(); });
bus.on('table:unlocked', ({ t }) => {
  Sound.buy(); FX.confetti(40); Chat.say('unlock', {}, 1); UI.toast(`${t.name} unlocked. ${t.blurb}`);
  TablesView.render(); TablesView.reveal(); StakeView.render(); BoardsView.renderEmpties(); ShopView.render(); RunPanel.render(); if (Tabs.showing('rack')) RackView.render();
});
bus.on('board:dealt', ({ b, big }) => {
  BoardsView.render(b.slot); RunPanel.render();
  if (big) Chat.say('deal_big', { stake: fmt(b.stake) });
  if (b.golden) { Sound.golden(); Chat.say('golden'); Background.flashGold(1800); }
  Coach.event('board:dealt');
});
bus.on('board:cells', ({ b, cells }) => cells.forEach(i => BoardsView.cell(b, i)));
bus.on('board:hud', ({ b }) => { BoardsView.hud(b); BoardsView.odds(b); });
bus.on('board:tools', ({ b }) => BoardsView.tools(b));
bus.on('inventory', () => { Game.slots.forEach(b => b && BoardsView.tools(b)); ShopView.later(); });
bus.on('dig', ({ b, src }) => { Sound.reveal(b.frac(), src === 'bot'); if (src === 'you') Coach.event('dig:you'); });
bus.on('board:risky', ({ b, i, k, p, src, combo }) => {
  BoardsView.float(b, i, `×${k.toFixed(2)}${combo > 1 ? ` · COMBO ${combo}` : ''}`, p < .2 ? GREEN : p < .35 ? GOLD : RED, combo > 2);
  if (src !== 'bot') Sound.risky(p, combo);
});
bus.on('board:gem', ({ b, i, x, tier }) => {
  BoardsView.float(b, i, `${tier.name.toUpperCase()} ×${x}`, tier.k === 'jackpot' ? RED : GOLD, true);
  Sound.gem(tier.k); if (b.human) Haptics.buzz([15, 25, 15]);
  const c = b.cells && b.cells[i];
  if (c) { const r = c.getBoundingClientRect(); FX.confetti(tier.k === 'jackpot' ? 120 : 18, { x: r.left + r.width / 2, y: r.top }); }
  if (tier.k === 'jackpot') { Banner.show('JACKPOT!', `×5 on ${b.t.name}`, 'red', true); Background.flashGold(); Chat.say('jackpot', {}, 1); }
  else Chat.say('gem');
});
bus.on('flag', ({ b, on: isOn, src }) => { src === 'bot' ? Sound.tick() : isOn ? Sound.flag() : Sound.unflag(); BoardsView.odds(b); });
bus.on('probe', ({ b }) => { Sound.flag(); UI.toast('Probe says: mine. Flagged it for you.'); BoardsView.odds(b); });
bus.on('board:defused', ({ by }) => {
  Sound.shield();
  if (by === 'fuse') { AddonStrip.jiggle('fuse'); Chat.say('fuse'); } else { UI.toast('Shield popped! That mine is defused.'); Chat.say('shield'); ShopView.later(); }
  Game.slots.forEach(b => b && BoardsView.tools(b));
});
bus.on('addon:fired', ({ id, b, i, text }) => { AddonStrip.jiggle(id); if (b && text) BoardsView.float(b, i, text, PURPLE); });
bus.on('board:boom', ({ b, i, src, left, missed }) => {
  Sound.boom(); BoardsView.boom(b, i); if (b.human) Haptics.buzz([70, 40, 120]);
  // near misses sting, so say them out loud
  const sub = left > 0 && left <= 5 ? `${left} tile${left > 1 ? 's' : ''} from a clean sweep` : missed ? `${missed} gem${missed > 1 ? 's' : ''} still down there` : '';
  BoardsView.stamp(b, `−${fmt(b.stake)}`, 'lose', sub);
  Chat.say(src === 'yolo' ? 'yolo' : 'boom', { stake: fmt(b.stake) }, src === 'yolo' ? .6 : undefined);
  if (src !== 'bot' && src !== 'yolo') Quips.maybe(.15);
  Rank.award(3); Coach.event('board:over');
});
bus.on('board:cashout', ({ b, why, profit, mult, missed }) => {
  BoardsView.ghostMines(b);
  const sub = missed && why !== 'clear' ? `you left ${missed} gem${missed > 1 ? 's' : ''} behind` : '';
  if (why === 'clear') { Sound.clear(); FX.confetti(); BoardsView.stamp(b, `CLEAN SWEEP +${fmt(profit)}`, 'win'); Chat.say('clear'); }
  else if (why === 'limit') { Sound.clear(); FX.confetti(); BoardsView.stamp(b, `TABLE LIMIT +${fmt(profit)}`, 'win'); Chat.say('cash_big', { profit: fmt(profit) }, 1); }
  else { Sound.cash(); BoardsView.stamp(b, `+${fmt(profit)}`, 'win', sub); Chat.say(why === 'coward' ? 'coward' : profit >= Math.max(300, b.stake) ? 'cash_big' : 'cash_small', { profit: fmt(profit) }); }
  const tier = mult >= 50 ? 3 : mult >= 15 ? 2 : mult >= 5 ? 1 : 0;
  if (tier && (b.human || tier >= 2) && Banner.show(['', 'BIG WIN', 'HUGE WIN', 'MEGA WIN'][tier], `+${fmt(profit)} · ×${fmtX(mult)}`, ['', 'gold', 'orange', 'red'][tier])) { Sound.bigwin(tier); FX.confetti(60 * tier); }
  if (b.human && (tier || why === 'clear')) Haptics.buzz([25, 30, 25]);
  if (why === 'manual') Quips.maybe(.12);
  Rank.award(xpFor(b, why === 'clear')); Coach.event('board:over');
});
bus.on('board:ended', ({ b }) => { BoardsView.render(b.slot); RunPanel.render(); });
bus.on('streak', ({ n }) => { if (n >= 3) Chat.say('streak', { streak: n }); RunPanel.render(); });
bus.on('xp', () => RunPanel.rank());
bus.on('levelup', ({ lvl: L, name, newRank, coins, extra }) => {
  Sound.levelup(); FX.confetti(70, { x: innerWidth / 2, y: innerHeight * .35 }); Haptics.buzz([20, 30, 20, 30, 40]);
  Banner.show(`LEVEL ${L}`, newRank ? `New rank: ${name}` : `+${fmt(coins)}${extra}`, 'purple', true);
  UI.toast(`Level ${L}! +${fmt(coins)} coins${extra}.`);
  Game.setCoins(S.coins, true, { from: { x: innerWidth / 2, y: innerHeight * .4, ok: true }, amount: coins });
  Chat.say('levelup', { rank: name }, newRank ? 1 : .4);
  Game.slots.forEach(b => b && BoardsView.tools(b)); AddonStrip.render(); ShopView.later();
});
bus.on('upgrade:bought', ({ u }) => {
  Sound.buy(); Chat.say('buy'); UI.toast(`${u.name}${u.costs.length > 1 ? ' Lv ' + lvl(u.id) : ''} bought.`); Quips.maybe(.1);
  if (u.id === 'boards') BoardsView.ensureSlots();
  if (u.id === 'pockets') { AddonStrip.render(); if (Tabs.showing('rack')) RackView.render(); }
  ShopView.render(); RunPanel.render(); Game.slots.forEach(b => b && (BoardsView.hud(b), BoardsView.odds(b)));
});
bus.on('toggles', () => Game.slots.forEach(b => b && BoardsView.odds(b)));
bus.on('purchase', () => { Sound.buy(); ShopView.render(); });
bus.on('addon:bought', ({ id }) => { Sound.buy(); Sound.card(); Chat.say('addon'); UI.toast(`${ABY[id].name} added.`); Quips.maybe(.1); });
bus.on('addon:changed', () => { AddonStrip.render(); if (Tabs.showing('rack')) RackView.render(); StakeView.render(); Game.slots.forEach(b => b && BoardsView.tools(b)); ShopView.later(); });
bus.on('addon:bought', () => bus.emit('addon:changed'));
bus.on('addon:burned', ({ id }) => UI.toast(`${ABY[id].name} burned up.`));
bus.on('rack', () => { if (Tabs.showing('rack')) RackView.render(); });
bus.on('ascended', ({ level }) => {
  Sound.ascend(); FX.confetti(220); Chat.say('ascend', {}, 1); UI.toast(`Ascension ${ROMAN[level]}. The tables just got meaner.`);
  Rank.award(100);
  RunPanel.render(); ShopView.render(); TablesView.render(); StakeView.render();
});
bus.on('casino', () => {
  Sound.win(); FX.confetti(260); Chat.say('casino', {}, 1); setTimeout(() => Chat.say('casino', {}, 1), 1500); ShopView.render();
  UI.modal(`${ico('crown', 'bigicon')}<h3>You own the casino</h3>
    <p>From ${fmt(START)} coins to the deeds in ${dur(S.run.time)}, at Ascension ${ROMAN[asc()]}. You busted ${S.life.busts} time${S.life.busts === 1 ? '' : 's'} getting here.</p>
    <p class="perk">New Game+: every casino you’ve owned adds +${Math.round(HOUSE_EDGE * 100)}% to the profit of every win, forever. You’re on +${Math.round(HOUSE_EDGE * 100 * S.life.casinos)}%.</p>
    <div class="row"><button class="btn green" type="button" data-a="keep">Keep playing</button><button class="btn gold" type="button" data-a="new">New Game+ (fresh run)</button></div>`,
    { keep: () => UI.closeModal(), new: () => { UI.closeModal(); Game.resetRun(); } });
});
bus.on('spin:landed', ({ prize, from }) => {
  if (prize.coins) Game.setCoins(S.coins, true, { from, amount: prize.coins });
  if (prize.kind === 'jackpot') { Banner.show('JACKPOT!', prize.text, 'red', true); Sound.bigwin(3); FX.confetti(200); } else { Sound.cash(); FX.confetti(50); }
  if (prize.kind === 'shield' || prize.kind === 'probe') Game.slots.forEach(b => b && BoardsView.tools(b));
  if (prize.card) { AddonStrip.render(); Sound.card(); }
  Chat.say('spin'); Rank.award(5); RunPanel.render(); ShopView.later();
});
bus.on('modal:closed', () => { if (SpinView.pending) { const prize = SpinView.pending; SpinView.pending = null; bus.emit('spin:done', { prize }); } });
bus.on('spin:done', () => Coach.event('spin:done'));
bus.on('don:offer', ({ step }) => Chat.say('don_offer', {}, step ? .9 : .7));
bus.on('don:win', ({ step }) => { Sound.win(); Haptics.buzz([40, 40, 80]); FX.confetti(220); Chat.say('don_win', {}, 1); Quips.maybe(.35); Rank.award(20 * (step + 1)); });
bus.on('flip', ({ win, bet }) => {
  if (win) { Sound.cash(); UI.toast(`+${fmt(bet)}! The coin likes you.`); Chat.say('flip_win'); Quips.maybe(.15); }
  else { Sound.boom(); UI.toast(`−${fmt(bet)}. The coin does not like you.`); Chat.say('flip_lose'); }
});
bus.on('bust', ({ reason }) => { Sound.bust(); Haptics.buzz(220); Chat.say(reason === 'don' ? 'don_lose' : 'bust', {}, 1); });
bus.on('tick', () => {
  RunPanel.spin(); Rack.tick(); RackView.tick();
  if (S.run.time % 15 === 0) SaveGame.save();
  if (S.run.time % 10 === 0) CoinChart.sample();
  if (Tabs.showing('stats') && S.run.time % 5 === 0 && !StatsView.busy()) StatsView.render();
  if (S.run.time % 20 === 0 && UI.modalClosed()) Quips.maybe(.18);
  if (S.run.time === S.spinAt + SPIN_EVERY) { UI.toast('Free spin ready!'); Sound.select(2); }
  Kev.second(); Stars.second();
});

/* ---------- around the house: the noises, and what they turn into ---------- */
// time for a noise: anything that would start an event waits until nothing else is going on
const startsEvent = k => Household.EVENTS[k];
const canStart = k => {
  const e = startsEvent(k); if (!e) return true;
  if (e === 'battery') return !WeirdNoises.chirping;
  // the meter only runs out mid-game: a power cut with nothing on the tables is just a dark room (and a storm's no use either)
  if (e === 'powercut') return HouseholdView.free() && !PowerCut.on && Game.slots.some(b => b && b.started && !b.over);
  if (e === 'storm') return HouseholdView.free() && Game.slots.some(b => b && b.started && !b.over);
  if (e === 'banker') return HouseholdView.free() && !!Banker.target(); // he only rings about a board with profit on it
  if (e === 'dog') return HouseholdView.free() && !!Dog.sniff(); // Biscuit only comes round when there's a mine to find
  return HouseholdView.free();
};
bus.on('noise:due', () => { if (!Outside.on) WeirdNoises.surprise(WeirdNoises.pick(canStart)); }); // the house is quiet while you're out
bus.on('odd', ({ k, handle }) => {
  const kind = startsEvent(k);
  if (kind && kind !== 'battery' && HouseholdView.free()) HouseholdView.start(kind, k, handle);
  if (Math.random() < .55) setTimeout(() => Chat.say('odd_' + k, {}, 1), 1700 + Math.random() * 1600);
});
bus.on('chirp', ({ on: isOn, again }) => { HouseholdView.chirp(isOn); if (again && Math.random() < .3) Chat.say('chirp_again', {}, 1); });
const HOUSE_CHAT = { door: e => 'door_' + e.o.mood, phone: () => 'phone', kitten: () => 'kitten_pet', toast: () => 'toast',
  battery: e => e.ok ? 'battery_ok' : 'battery_fall', raffle: e => e.win ? 'raffle_win' : 'raffle_lose', gull: () => 'gull_shoo', gullNicked: () => 'gull_nicked' };
bus.on('household', e => {
  HouseholdView.outcome(e);
  const fx = e.o.fx;
  if (fx === 'card') { Sound.card(); bus.emit('addon:changed'); }
  if (fx === 'shield') { Sound.shield(); bus.emit('inventory'); }
  if (fx === 'golden') Sound.golden();
  if (e.kind === 'raffle' && e.win) { Sound.bigwin(1); FX.confetti(80); }
  RunPanel.render(); Rank.award(3);
  setTimeout(() => Chat.say(HOUSE_CHAT[e.kind](e), {}, .8), 900);
});
bus.on('kitten:gone', ({ petted }) => { if (!petted) Chat.say('kitten_gone', {}, .7); });
bus.on('power', ({ on: isOn, why }) => {
  Music.hold('power', isOn); // the jukebox goes with the lights
  if (isOn) { PowerView.on(); return; }
  PowerView.off(); WeirdNoises.play('powerup');
  if (why === 'reset') return;
  UI.toast(why === 'topup' ? 'Meter topped up. Let there be light.' : 'The emergency credit kicked in. Lights on.');
  setTimeout(() => Chat.say(why === 'topup' ? 'power_topup' : 'power_back', {}, .8), 700);
});
bus.on('addon:fired', ({ id }) => { if (id === 'dark') Chat.say('power_win', {}, .5); });
/* ---------- Biscuit the dog ---------- */
bus.on('dog', ({ b }) => {
  UI.toast(`Biscuit sniffed out a mine on your ${b.t.name} board and sat on it. Flagged. Good boy.`);
  RunPanel.render(); Rank.award(2); setTimeout(() => Chat.say('dog_flag', {}, .9), 900);
});

/* ---------- the Banker ---------- */
bus.on('banker', ({ deal }) => { setTimeout(() => Chat.say(deal ? 'banker_deal' : 'banker_nodeal', {}, .8), 700); RunPanel.render(); });
bus.on('board:cashout', ({ b, why, amount }) => { if (why !== 'banker' && b.refused && amount > b.refused) { UI.toast(`+${fmt(amount - b.refused)} more than the Banker offered. No deal, no regrets.`); setTimeout(() => Chat.say('banker_beat', {}, 1), 900); } });

/* ---------- Nan's stars ---------- */
bus.on('stars:ask', () => { if (pref('quips')) StarsView.ask(); });
bus.on('stars', h => { StarsView.read(h); if (Math.random() < .5) setTimeout(() => Chat.say('stars_re', {}, 1), 2400); });
bus.on('addon:fired', ({ id }) => { if (id === 'stars') Chat.say('stars_hit', {}, .7); });

/* ---------- the ice cream van ---------- */
bus.on('icecream', ({ sugar }) => {
  RunPanel.render(); Rank.award(3);
  UI.toast(`A cone with sprinkles. Sugar rush: +${Math.round(IceCream.RUSH * 100)}% on your next winning cash-out${sugar > 1 ? ` (and the one after${sugar > 2 ? 's' : ''})` : ''}.`);
  setTimeout(() => Chat.say('icecream_bought', {}, .8), 900);
});
bus.on('addon:fired', ({ id }) => { if (id === 'sugar') RunPanel.render(); });

/* ---------- KEVCOIN: Kev's coin, in the chat ---------- */
bus.on('kev:launch', () => { KevView.ticker(); Chat.say('kev_launch', {}, 1); setTimeout(() => Chat.say('kev_launch_re', {}, 1), 2600); });
bus.on('kev:tick', () => KevView.update());
bus.on('kev:hype', () => {
  Chat.say('kev_hype', {}, 1); setTimeout(() => Chat.say('kev_hype_re', {}, .4), 2200);
  const t = document.querySelector('#kevTicker'); if (t) { t.classList.remove('hype'); void t.offsetWidth; t.classList.add('hype'); }
});
bus.on('kev:rug', ({ held }) => {
  Chat.say('kev_rug', {}, 1); setTimeout(() => Chat.say('kev_rug_re', {}, 1), 2200);
  if (held) { Banner.show('RUG PULL', `Your KEVCOIN is worth ${fmt(Kev.value())} now`, 'red', true); Sound.boom(); Haptics.buzz([80, 40, 80]); }
});
bus.on('kev:relaunch', ({ v, burned }) => { KevView.update(); Chat.say('kev_relaunch', { v }, 1); if (burned) UI.toast(`KEVCOIN ${v}.0 is live. Your old coins didn’t make the move.`); });
bus.on('kev:trade', ({ buy, x }) => { if (!buy && x >= 1.5) Chat.say('kev_win', {}, 1); else if (!buy && x < .9) Chat.say('kev_loss', {}, .6); });
bus.on('reset', () => KevView.ticker());

/* ---------- thunderstorms: each flash shows the mines; one strike in three storms takes the power out ---------- */
bus.on('storm', e => {
  if (e.on) { StormView.on(); setTimeout(() => Chat.say('storm_start', {}, .9), 2500); return; }
  StormView.off();
  if (e.rainbow) { StormView.rainbow(); RunPanel.render(); UI.toast('The storm’s passed, and there’s a rainbow! A pot of gold at the end of it: your next board’s golden.'); setTimeout(() => Chat.say('rainbow', {}, 1), 900); }
  else { UI.toast('The storm’s passed.'); setTimeout(() => Chat.say('storm_end', {}, .5), 800); }
});
bus.on('storm:flash', e => {
  if (document.hidden) return; // nobody's watching: no flash, no thunder, no strike
  StormView.flash(e);
  if (e.strike) {
    Haptics.buzz([60, 40, 120]); Chat.say('storm_strike', {}, 1);
    if (!PowerCut.on && Game.slots.some(b => b && b.started && !b.over)) setTimeout(() => HouseholdView.powerCut(), 350);
  } else if (Math.random() < .15) Chat.say('storm_flash', {}, 1);
});
/* ---------- the Flip Booth: coin flip, duck race, scratchcards, bingo, the Fruity ---------- */
bus.on('booth', k => { FruityView.away(); ClawView.away(); ({ ducks: DuckRaceView, scratch: ScratchView, bingo: BingoView, fruity: FruityView, claw: ClawView }[k] || FlipView).open(); });
bus.on('duck:start', () => Chat.say('duck_start'));
bus.on('duck', ({ win, prize, bet, pay }) => {
  if (win) {
    pay >= 3 ? Sound.win() : Sound.cash(); FX.confetti(pay >= 8 ? 180 : 70); UI.toast(`+${fmt(prize - bet)}! Your duck came in at ×${fmtX(pay)}.`);
    if (pay >= 8) Banner.show('LONG SHOT', `×${fmtX(pay)} duck`, 'gold', true);
    Chat.say('duck_win', {}, .9); Quips.maybe(.15); Haptics.buzz([30, 30, 60]);
  } else { WeirdNoises.play('duck'); UI.toast(`−${fmt(bet)}. Your duck had other plans.`); Chat.say('duck_lose', {}, .7); }
  Rank.award(win ? 8 : 3); RunPanel.render();
});

bus.on('scratch:bought', () => Chat.say('scratch_buy', {}, .25));
bus.on('scratch', ({ win, x, prize, price }) => {
  if (win) {
    x >= 5 ? Sound.win() : Sound.cash(); FX.confetti(x >= 100 ? 220 : x >= 20 ? 120 : 50);
    UI.toast(x > 1 ? `+${fmt(prize)}! Three of a kind.` : 'Your money back. The newsagent shrugs.');
    if (x >= 100) Banner.show('JACKPOT!', `×${x} scratchcard`, 'red', true);
    else if (x >= 20) Banner.show('SCRATCH WIN', `+${fmt(prize)}`, 'gold');
    Chat.say(x > 1 ? 'scratch_win' : 'scratch_evens', {}, x >= 20 ? 1 : .6); Haptics.buzz([25, 30, 25]);
  } else Chat.say('scratch_lose', {}, .35);
  Rank.award(win ? 4 + Math.min(20, x) : 2); RunPanel.render();
});

/* ---------- Nan's bingo ---------- */
bus.on('bingo:due', () => { if (has('flip') && pref('quips') && !document.hidden && UI.modalClosed() && !Coach.active) BingoView.invite(); });
bus.on('bingo:bought', () => Chat.say('bingo_buy', {}, .5));
bus.on('bingo:line', ({ lines }) => { if (lines >= 3) { Banner.show('HOUSE!', 'Full house at Nan’s bingo', 'red', true); FX.confetti(200); } else if (lines === 2) FX.confetti(70); });
bus.on('bingo', ({ lines, prize }) => {
  if (lines) { UI.toast(`+${fmt(prize)}! ${['', 'A line', 'Two lines', 'A full house'][lines]} at Nan’s bingo.`); Haptics.buzz([25, 30, 25]); }
  Chat.say(['bingo_lose', 'bingo_line', 'bingo_two', 'bingo_house'][lines], {}, lines ? 1 : .4);
  Rank.award(lines ? 4 + 6 * lines : 2); RunPanel.render();
});

/* ---------- Nan's biscuit tin: a little put by on every winning cash-out, handed over when you go bust ---------- */
bus.on('board:cashout', ({ profit }) => Tin.put(profit));
bus.on('tin', ({ was, full }) => { if (!was || full) setTimeout(() => Chat.say(full ? 'tin_full' : 'tin_first', {}, 1), 1600); });

/* ---------- dares from the group chat: a friend bets you can't do something in time ---------- */
bus.on('dare:due', () => { if (pref('dares') && !document.hidden && UI.modalClosed() && !Coach.active && !Outside.on && Dares.canOffer()) Dares.make(); });
bus.on('dare:offer', o => DareView.offer(o));
bus.on('dare:on', d => DareView.on(d));
bus.on('dare:won', d => DareView.won(d));
bus.on('dare:lost', d => DareView.lost(d));
bus.on('dare:declined', o => DareView.declined(o));
bus.on('board:cashout', e => Dares.check('cashout', e));
bus.on('board:boom', e => Dares.check('boom', e));
bus.on('board:gem', e => Dares.check('gem', e));
bus.on('flag', ({ b, on: isOn }) => { if (isOn) b.flagged = true; });
bus.on('tick', () => { if (S.dare) { Dares.second(); DareView.chip(); } });
bus.on('reset', () => DareView.chip());

/* ---------- the seasons: pumpkins and trick or treaters at Halloween, fireworks on Bonfire Night, Nan's card at Christmas ---------- */
bus.on('pumpkin', ({ b, i }) => {
  BoardsView.cell(b, i); BoardsView.float(b, i, `PUMPKIN ×${PUMPKIN.X}`, 'var(--orange)', true); BoardsView.hud(b);
  Sound.gem('ruby'); Haptics.buzz([15, 25, 15]); Chat.say('pumpkin', {}, .6);
});
bus.on('treat', () => {
  HouseholdView.show({ ...TREAT_CARD, buttons: [['Aww', 'green']] }); RunPanel.render(); Sound.buy();
  setTimeout(() => Chat.say('treat', {}, .9), 900);
});
bus.on('trick', () => {
  SeasonView.eggs(); HouseholdView.show({ ...EGGED_CARD, buttons: [['Charming', 'ghost']] });
  setTimeout(() => Chat.say('egged', {}, .9), 1200);
});
bus.on('household', ({ o }) => { if (o.fx === 'xmas') setTimeout(() => Chat.say('xmas_card', {}, .8), 1400); });
bus.on('board:cashout', ({ mult }) => { if (mult >= 5 && Seasons.is('bonfire')) { SeasonView.fireworks(mult >= 50 ? 5 : mult >= 15 ? 3 : 2); setTimeout(() => Chat.say('fireworks', {}, .5), 1600); } });

/* ---------- quiz night: Priya runs a round of five (the pub quiz switch covers it) ---------- */
bus.on('night:due', () => { if (pref('quiz') && !document.hidden && UI.modalClosed() && !Coach.active && !Outside.on && !Quiz.live) QuizNightView.invite(); });
bus.on('night:done', o => { QuizNightView.done(o); RunPanel.render(); Rank.award(3 + 3 * o.score); });

/* ---------- darts at the Red Lion: Dave challenges you (the dares switch covers it) ---------- */
bus.on('darts:due', () => { if (pref('dares') && !document.hidden && UI.modalClosed() && !Coach.active && !Outside.on && Darts.canOffer()) Darts.make(); });
bus.on('darts:offer', o => DartsView.offer(o));
bus.on('darts:declined', o => DartsView.declined(o));
bus.on('darts:done', m => { DartsView.done(m); RunPanel.render(); Rank.award(m.result === 'won' ? 6 : 2); });

/* ---------- the car boot sale ---------- */
bus.on('boot:due', () => { if (pref('odd') && !document.hidden && HouseholdView.free() && !Outside.on && S.coins >= 50) { CarBootView.invite(); setTimeout(() => Chat.say('boot_open', {}, .8), 1200); } });
bus.on('boot:bought', () => setTimeout(() => Chat.say('boot_bought', {}, .5), 800));
bus.on('boot:box', () => setTimeout(() => Chat.say('boot_box', {}, .8), 800));

/* ---------- the allotment: it grows by the minute of play; storms water it ---------- */
bus.on('tick', () => { Allotment.second(); AllotmentView.tick(); });
bus.on('plot:planted', ({ id }) => { Sound.buy(); AllotmentView.render(); if (Math.random() < .3) setTimeout(() => Chat.say('plot_planted', { veg: VEG[id].veg }, .6), 800); });
bus.on('plot:ripe', ({ id }) => {
  AllotmentView.render(); AllotmentView.chip(); Sound.select(3);
  if (!AllotmentView.showing()) UI.toast(`Ready to pick: your ${VEG[id].veg} (the Allotment tab).`);
  setTimeout(() => Chat.say('plot_ripe', { veg: VEG[id].veg }, .6), 900);
});
bus.on('plot:picked', r => {
  AllotmentView.picked(r); RunPanel.render(); Rank.award(r.whopper ? 12 : 4);
  if (r.whopper) { Banner.show('WHOPPER!', 'First prize at the village show', 'green', true); Sound.bigwin(1); FX.confetti(90); setTimeout(() => Chat.say('plot_whopper', {}, 1), 900); }
  else { Sound.cash(); if (Math.random() < .35) setTimeout(() => Chat.say('plot_pick', {}, 1), 900); }
});
bus.on('plot:slugs', ({ id }) => { UI.toast(`Slugs got your ${VEG[id].veg}.`); AllotmentView.render(); setTimeout(() => Chat.say('plot_slugs', {}, 1), 900); });
bus.on('plot:rain', () => { AllotmentView.render(); UI.toast('The rain’s watered your allotment: everything’s two minutes closer.'); setTimeout(() => Chat.say('plot_rain', {}, .5), 2400); });
bus.on('storm', e => { if (!e.on) setTimeout(() => Allotment.rain(), 1200); });
bus.on('plot:shed', ({ id }) => { Sound.buy(); AllotmentView.render(); UI.toast({ greenhouse: 'A greenhouse: everything grows 20% quicker.', traps: 'Beer traps down. The slugs have other plans now.', beds: 'Brambles cleared: two more beds.' }[id]); setTimeout(() => Chat.say('plot_' + id, {}, .8), 900); });
bus.on('reset', () => { AllotmentView.chip(); if (AllotmentView.showing()) AllotmentView.render(); });

/* ---------- The Daily Sweep: the newsroom notes the run's big moments; the paper comes every twenty minutes ---------- */
bus.on('board:cashout', ({ b, why, profit, mult, amount }) => {
  if (mult >= 15 && profit > 0) News.note('cashout_big', { profit: fmt(profit), mult: fmtX(mult), table: b.t.name });
  if (why === 'clear') News.note('clear', { table: b.t.name });
  if (why === 'banker') News.note('banker_deal', { paid: fmt(amount) });
  else if (b.refused && amount > b.refused) News.note('banker_beat', { offer: fmt(b.refused), paid: fmt(amount) });
});
bus.on('board:gem', ({ b, tier }) => { if (tier.k === 'jackpot') News.note('jackpot', { table: b.t.name }); });
bus.on('board:boom', ({ b, src }) => { if (src !== 'bot' && b.stake >= Math.max(500, S.coins * .25)) News.note('boom_big', { stake: fmt(b.stake), table: b.t.name }); });
bus.on('don:win', ({ step }) => News.note('don_win', { x: LADDER[step] }));
bus.on('kev:launch', () => News.note('kev_launch'));
bus.on('kev:rug', () => News.note('rug', { v: (S.kev ? S.kev.v : 1) + 1 }));
bus.on('storm', e => News.note(e.on ? 'storm' : e.rainbow ? 'rainbow' : '_'));
bus.on('power', ({ on: isOn }) => { if (isOn) News.note('power'); });
bus.on('darts:done', m => News.note(m.result === 'won' ? 'darts_won' : m.result === 'lost' ? 'darts_lost' : '_', { total: m.total, dave: m.daveTotal }));
bus.on('night:done', o => { if (o.all) News.note('night_full'); });
bus.on('duck', ({ win, pay }) => { if (win && pay >= 8) News.note('duck_long', { x: fmtX(pay) }); });
bus.on('bingo', ({ lines }) => { if (lines >= 3) News.note('bingo_house'); });
bus.on('scratch', ({ x }) => { if (x >= 20) News.note('scratch_big', { x }); });
bus.on('fruity', ({ x }) => { if (x >= 250) News.note('fruity_jackpot'); });
bus.on('plot:picked', ({ whopper, id }) => { if (whopper) News.note('whopper', { veg: VEG[id].name }); });
bus.on('plot:slugs', ({ id }) => News.note('slugs', { veg: VEG[id].veg }));
bus.on('claw:grab', ({ won }) => { if (won) News.note('claw_win'); });
bus.on('table:unlocked', ({ t }) => News.note('unlock', { table: t.name }));
bus.on('ascended', () => News.note('ascend'));
bus.on('casino', () => News.note('casino'));
bus.on('levelup', ({ newRank, name }) => { if (newRank) News.note('levelup', { rank: name }); });
bus.on('dare:won', d => News.note('dare_won', { who: (FRIENDS[d.who] || {}).name || 'A friend' }));
bus.on('household', e => { if (e.kind === 'gullNicked') News.note('gull'); });
bus.on('tick', () => Paper.second());
bus.on('lotto:bought', () => { Sound.buy(); RunPanel.render(); });
bus.on('lotto:drawn', ({ total, lines }) => {
  const best = Math.max(0, ...lines.map(l => l.hits)), top = lines.find(l => l.hits === best);
  if (best >= 5) { News.note('lotto_jackpot', { pay: fmt(top.pay) }); Banner.show('JACKPOT!', 'All five on the Sweepstake', 'red', true); FX.confetti(200); Sound.bigwin(3); }
  else if (best === 4) News.note('lotto_four', { pay: fmt(top.pay) });
  if (total) { UI.toast(`+${fmt(total)} on the Sweepstake! It’s in the paper.`); RunPanel.render(); setTimeout(() => Chat.say(best >= 5 ? 'lotto_jackpot' : 'lotto_win', {}, 1), 2600); }
});
bus.on('paper', () => { Sound.letterbox(); PaperView.chip(); UI.toast('The Daily Sweep’s come through the letterbox.'); });
bus.on('paper:answer', ({ right, prize }) => { if (right) { Sound.cash(); UI.toast(`+${fmt(prize)}: you spotted the mine.`); RunPanel.render(); } else Sound.unflag(); });
bus.on('paper:bust', a => PaperView.open(Paper.compose(Game.lastRun || S.run, 'bust'), a)); // the bust screen's "Read all about it"
bus.on('reset', () => PaperView.chip());

/* ---------- karaoke at the Red Lion (the Music switch covers the invites) ---------- */
bus.on('karaoke:due', () => { if (pref('music') && !document.hidden && UI.modalClosed() && !Coach.active && !Outside.on && !Karaoke.live && Karaoke.wait() <= 0 && S.coins >= Karaoke.fee() * 10) KaraokeView.invite(); });
bus.on('karaoke:done', r => {
  r.x >= 2 ? Sound.cheer() : r.x ? Sound.cash() : Sound.boo(); RunPanel.render(); Rank.award(2 + Math.round(8 * r.score));
  if (r.x >= 3) { FX.confetti(120); Banner.show('STANDING OVATION', `${Math.round(r.score * 100)}% at the karaoke`, 'gold', true); }
  UI.toast(r.pay ? `${r.verdict} +${fmt(r.pay)} from the karaoke pot.` : `${r.verdict} The pot stays behind the bar.`);
  setTimeout(() => Chat.say(r.x >= 2 ? 'karaoke_great' : 'karaoke_bad', {}, 1), 1500);
  if (r.x >= 3) News.note('karaoke_ovation', { score: Math.round(r.score * 100) }); else if (!r.x) News.note('karaoke_booed', { score: Math.round(r.score * 100) });
});

/* ---------- the landlord's specials: a twist chalked on a board now and then ---------- */
bus.on('board:dealt', ({ b, quiet }) => {
  if (!b.special) return;
  const sp = SPECIAL_BY[b.special];
  if (!quiet) UI.toast(`The landlord’s special on ${b.t.name}: ${sp.name}. ${sp.blurb}`);
  setTimeout(() => Chat.say('special_' + b.special, {}, .5), 900);
});
bus.on('tick', () => Game.slots.forEach(b => { // Against the Clock: the countdown, and the cash-out when it's up
  if (!b || b.over || b.special !== 'clock') return;
  const l = Specials.left(b); if (l === 0) Game.cashOut(b, 'clock'); else if (l !== null) BoardsView.hud(b);
}));
bus.on('board:cashout', ({ b, why, profit }) => { if (b.special === 'clock' && b.human) setTimeout(() => Chat.say(why === 'clock' ? 'special_late' : profit > 0 ? 'special_beat' : '_', {}, .7), 800); });
bus.on('special:locked', ({ b }) => { Sound.tick(); UI.toast(`The doors are locked on ${b.t.name}. Dig ${Specials.toGo(b)} more and the landlord will let you out.`); });
bus.on('special:open', ({ b }) => { Sound.select(1); UI.toast(`The doors are open on ${b.t.name}. Cash out whenever you like: the profit’s doubled.`); setTimeout(() => Chat.say('special_open', {}, .6), 700); });
bus.on('board:boom', ({ b, back }) => { if (!back) return; UI.toast(`Happy Hour: the landlord’s given you ${fmt(back)} back on ${b.t.name}.`); setTimeout(() => Chat.say('special_happy_back', {}, .7), 1500); });

/* ---------- the jukebox (the Halloween record's only on it in October) ---------- */
bus.on('request:due', () => { // someone asks for a record (only while the jukebox is playing)
  if (!pref('music') || !Music.timer || document.hidden || !UI.modalClosed() || Coach.active || Outside.on) return;
  const o = Requests.make(); if (o) JukeboxView.request(o);
});
Music.available = () => TRACKS.filter(t => !t.season || Seasons.is(t.season));
bus.on('bust', () => Music.scratch()); // the needle comes off the record
bus.on('board:boom', ({ b, src }) => { if (src !== 'bot' && b.stake >= Math.max(500, S.coins * .25)) Music.scratch(); });
bus.on('music', ({ first }) => {
  JukeboxView.now(); JukeboxView.ticker();
  if (first && !S.life.juke) { S.life.juke = 1; SaveGame.save(); UI.toast('The jukebox is on. Change the record with the jukebox button (or J), or switch it off in there.'); }
});

/* ---------- board styles ---------- */
bus.on('skin', () => { document.body.dataset.skin = Skins.current(); });

/* ---------- the claw machine ---------- */
bus.on('claw:grab', ({ won, fx }) => { Rank.award(won ? 5 : 1); if (won) { RunPanel.render(); if (fx === 'golden') UI.toast('The golden crown! Your next board is golden.'); } });

/* ---------- the Fruity ---------- */
bus.on('fruity', ({ x, win, nudged, holds, dry }) => {
  if (!x) {
    if (dry && dry % 12 === 0) Chat.say('fruity_dry', {}, .8);
    else if (holds && Math.random() < .2) Chat.say('fruity_hold', {}, 1);
    return;
  }
  if (x >= 250) { Banner.show('JACKPOT!', 'Three sevens on the Fruity', 'red', true); Background.flashGold(); FX.confetti(220); Haptics.buzz([40, 30, 40, 30, 80]); }
  else if (x >= 25) { FX.confetti(80); Haptics.buzz([25, 30, 25]); }
  Chat.say(x >= 250 ? 'fruity_jackpot' : x >= 25 ? 'fruity_big' : nudged ? 'fruity_nudge' : 'fruity_win', {}, x >= 25 ? 1 : nudged ? .7 : .2);
  if (x >= 25) UI.toast(`+${fmt(win)} in the Fruity’s meter. Collect it or gamble it.`);
  Rank.award(Math.min(40, 1 + Math.round(x / 2))); RunPanel.render();
});
bus.on('fruity:gamble', ({ won, streak }) => Chat.say(won ? 'fruity_double' : 'fruity_gone', {}, won && streak >= 2 ? 1 : .3));

/* ---------- touching grass ---------- */
bus.on('outside', e => {
  Music.hold('outside', e.on);
  if (e.on) { OutsideView.show(); return; }
  OutsideView.done(e);
  setTimeout(() => Chat.say(e.full ? 'grass_back' : 'grass_early', {}, .9), 800);
  if (e.full) Rank.award(10);
  RunPanel.render();
});
bus.on('grass:due', () => { if (UI.modalClosed() && !Coach.active && !document.hidden) OutsideView.nudge(); });

/* ---------- the pub quiz ---------- */
bus.on('quiz:due', () => { if (pref('quiz') && !document.hidden && UI.modalClosed() && !Coach.active && AudioEngine.get().unlocked) Quiz.ask(); });
bus.on('quiz:ask', L => QuizView.show(L));
const spoken = answer => answer.replace(/^(A|An|The) /, w => w.toLowerCase()); // "it was a unicorn", not "it was A unicorn"
bus.on('quiz:answer', L => {
  const el = QuizView.settle(L, L.k);
  if (L.correct) {
    Sound.cash(); Game.setCoins(S.coins, true, { from: el && el.querySelector('.qopt.right'), amount: L.prize });
    Chat.say('quiz_right', { answer: spoken(L.answer) }, 1); Rank.award(3);
  } else { Sound.unflag(); Chat.say('quiz_wrong', { answer: spoken(L.answer) }, 1); }
});
bus.on('quiz:timeout', L => { QuizView.settle(L, -1); Chat.say('quiz_slow', { answer: spoken(L.answer) }, 1); });

/* ---------- achievements ---------- */
Achievements.listen();
bus.on('achievement', ({ a, coins }) => {
  Sound.achievement(a.tier); Haptics.buzz(30);
  UI.toast(`Achievement: ${a.name}. +${fmt(coins)}`);
  if (a.tier === 3) Banner.show('ACHIEVEMENT', a.name, 'purple');
  Game.setCoins(S.coins, true, { from: { x: innerWidth / 2, y: innerHeight - 90, ok: true }, amount: coins });
  Chat.say('achievement', { name: a.name }, .4);
  if (Tabs.showing('stats')) StatsView.render();
});
bus.on('achievements:caught-up', ({ ids }) => {
  Sound.achievement(2); UI.toast(`${ids.length} achievement${ids.length > 1 ? 's' : ''} unlocked for what you’d already done.`);
  Game.setCoins(S.coins, true); if (Tabs.showing('stats')) StatsView.render();
});

/* ---------- the Daily Challenge ---------- */
bus.on('daily:dig', ({ b, i, opened, p, k, gem }) => {
  opened.forEach(j => BoardsView.cell(b, j));
  if (p > 0) { BoardsView.float(b, i, `×${k.toFixed(2)}${b.combo > 1 ? ` · COMBO ${b.combo}` : ''}`, p < .2 ? GREEN : p < .35 ? GOLD : RED, b.combo > 2); Sound.risky(p, b.combo); }
  else Sound.reveal(b.frac());
  if (gem) { BoardsView.float(b, i, `${gem.name.toUpperCase()} ×${gem.x}`, gem.k === 'jackpot' ? RED : GOLD, true); Sound.gem(gem.k); Haptics.buzz([15, 25, 15]); }
  DailyView.hud(b);
});
bus.on('daily:flag', ({ b, i, on: isOn }) => { BoardsView.cell(b, i); isOn ? Sound.flag() : Sound.unflag(); });
bus.on('daily:done', ({ b, why, i, result, top }) => {
  DailyView.hud(b);
  if (why === 'boom') {
    Sound.boom(); BoardsView.boom(b, i); BoardsView.stamp(b, 'BOOM', 'lose', `after ${result.digs} dig${result.digs === 1 ? '' : 's'}`);
    Haptics.buzz([70, 40, 120]); Chat.say('daily_boom', {}, .9);
  } else {
    why === 'cash' ? Sound.cash() : Sound.clear(); FX.confetti(top ? 160 : 60); BoardsView.ghostMines(b);
    BoardsView.stamp(b, `×${fmtX(result.mult)}`, 'win', result.prize ? `+${fmt(result.prize)} coins` : '');
    Haptics.buzz([25, 30, 25]); Chat.say(top ? 'daily_top' : 'daily_ok', { x: fmtX(result.mult) }, .9);
    if (result.prize) Game.setCoins(S.coins, true, { from: b.el, amount: result.prize });
  }
  Rank.award(15 + Math.round(5 * Math.min(20, result.mult)));
  TablesView.render();
  setTimeout(() => { if (!UI.modalClosed() && b.el && b.el.isConnected) DailyView.results(); }, 1700);
});
