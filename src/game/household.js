// Life goes on around you: someone at the door, the phone, a kitten, the smoke detector, burnt toast.
// Each starts with its noise (audio/noises.js). What you do about it can pay, cost, or just be weird.
import { TABLES } from '../data/economy.js';
import { bus } from '../core/bus.js';
import { SaveGame, S, baseCap } from '../core/state.js';
import { WeirdNoises } from '../audio/noises.js';
import { Game } from './game.js';

// coins: a share of your top table's max stake when it's good, a share of your coins (capped) when it's bad.
// fx: card, golden, shield, spin, streak0, streak1, raffle (offers a ticket), duck (offers a race)
// In the text, {coins} is what changed hands, {card} what was in the parcel, {cost} a raffle ticket's price.
export const DOOR = [
  { w: 3, mood: 'good', icon: 'door', title: 'It’s Nan', text: 'With a cake and a carrier bag full of other carrier bags. She slips you {coins} and says you look thin.', coins: .4 },
  { w: 2, mood: 'good', icon: 'door', title: 'A parcel', text: 'For you, for once. Inside: {card}, and enough bubble wrap to lose a weekend.', fx: 'card' },
  { w: 2, mood: 'good', icon: 'door', title: 'A pizza nobody ordered', text: 'Nobody’s complaining. Your next board is golden.', fx: 'golden' },
  { w: 2, mood: 'bad', icon: 'door', title: 'The bailiffs', text: 'They take {coins} and a lamp. You liked that lamp.', coins: -.06 },
  { w: 1, mood: 'bad', icon: 'door', title: 'The taxman', text: 'He takes {coins} and calls it “a contribution”. You call it something else, under your breath.', coins: -.04 },
  { w: 1, mood: 'bad', icon: 'door', title: 'A lad selling tea towels', text: 'Out of a holdall, at 9pm. You buy three for {coins}. You now own eleven tea towels.', coins: -.01 },
  { w: 2, mood: 'weird', icon: 'door', title: 'A man about your car’s extended warranty', text: 'You don’t have a car. He knows. He’s coming back on Tuesday.' },
  { w: 2, mood: 'weird', icon: 'door', title: 'Someone canvassing for the election', text: 'They promise to cut taxes on mines, scrap the Abyss table and put a duck in every pond. You nod until they leave. None of it will happen.' },
  { w: 1.2, mood: 'good', icon: 'door', title: 'A kid selling raffle tickets', text: 'For the school roof. {cost} a ticket, and one in eight wins ten times that.', fx: 'raffle' },
  { w: 2, mood: 'weird', icon: 'duck', title: 'Nobody there', text: 'Just a duck, staring at you like you owe it money. You might.', fx: 'duck' },
  { w: 1, mood: 'good', icon: 'door', title: 'Big Dave', text: 'Returning the tenner he borrowed in 2019. With interest it’s somehow {coins}. Nobody understands his maths.', coins: .3 },
  { w: 1, mood: 'bad', icon: 'door', title: 'Your neighbour', text: 'Asking you to keep the gambling noises down. You lose your streak out of pure shame.', fx: 'streak0' },
  { w: 1, mood: 'good', icon: 'door', title: 'Your ex', text: 'They want their hoodie back. You keep the hoodie. +1 to your streak, out of spite.', fx: 'streak1' },
  { w: 1, mood: 'good', icon: 'door', title: 'A vicar, a rabbi and an imam', text: 'Collecting for the roof of the community centre they share. You chip in and get blessed three times over. +1 shield.', fx: 'shield' },
  { w: 1, mood: 'weird', icon: 'door', title: 'You, from the future', text: 'Slowly shaking your head. You ask how it ends. They say “cash out at ×3” and fade away.' },
  { w: 1, mood: 'weird', icon: 'door', title: 'Two police officers', text: 'Someone reported “a lot of explosions”. You explain it’s minesweeper. They stay for one board and leave worse off.' },
  { w: 1, mood: 'weird', icon: 'door', title: 'The council', text: 'They’ve approved a mine under your patio. There was a consultation. It was in a locked filing cabinet in a disused toilet.' },
];
export const PHONE = [
  { w: 2, mood: 'weird', icon: 'phone', title: 'Your bank', text: 'Unusual activity on your account. It’s you. It’s always been you.' },
  { w: 2, mood: 'good', icon: 'phone', title: 'Nan', text: 'Checking you’ve eaten. She transfers {coins} “for a sandwich”.', coins: .25 },
  { w: 1.5, mood: 'weird', icon: 'phone', title: 'Big Dave', text: 'Wants your daily score so he can tell you his. It’s higher. It is always higher.' },
  { w: 1.5, mood: 'weird', icon: 'phone', title: 'A robot', text: '“We’ve been trying to reach you about your casino’s extended warranty.”' },
  { w: 1, mood: 'good', icon: 'phone', title: 'Kev, butt-dialling', text: 'You listen to four minutes of him singing in the car. It’s… beautiful, actually. +1 shield of emotional support.', fx: 'shield' },
  { w: 1, mood: 'good', icon: 'phone', title: 'A pollster', text: '“Who will you vote for?” You say the bomb. They hang up. You get a free spin, out of pity.', fx: 'spin' },
  { w: 1, mood: 'weird', icon: 'phone', title: 'Your landlord', text: 'Something about “the rent”. You pretend to be your own voicemail. It works.' },
  { w: 1, mood: 'weird', icon: 'phone', title: 'Tech support', text: 'Your computer has a virus, and only gift cards can fix it. You tell him your computer is a minesweeper board. He asks what the odds are.' },
  { w: 1, mood: 'weird', icon: 'phone', title: 'The council', text: 'About the pothole you reported in 2021. They’ve put a cone in it.' },
  { w: 1, mood: 'good', icon: 'phone', title: 'A wrong number', text: 'They’re after “Gaz”. You become Gaz for the afternoon. Gaz had {coins} in his coat.', coins: .2 },
];
export const KITTEN = [
  { w: 3, mood: 'good', icon: 'kitten', title: 'It purrs', text: 'You feel protected. +1 shield.', fx: 'shield' },
  { w: 2, mood: 'good', icon: 'kitten', title: 'It knocks a gold coin off the table', text: 'Your next board is golden.', fx: 'golden' },
  { w: 2, mood: 'good', icon: 'kitten', title: 'It brings you a “present”', text: 'It’s {coins}. You don’t ask where from.', coins: .3 },
  { w: 1, mood: 'good', icon: 'kitten', title: 'It sits on the wheel', text: 'Free spin, ready now.', fx: 'spin' },
];
// the odd jobs, and how they go
export const CHORES = {
  battery: { mood: 'good', icon: 'battery', title: 'Battery changed', text: 'Silence. Beautiful silence. And while you’re up there, {coins} on top of the wardrobe.', coins: .15 },
  fall: { mood: 'bad', icon: 'battery', title: 'You fell off the chair', text: 'The chirping carries on, smugly. Try again when you can feel your legs.' },
  toast: { mood: 'good', icon: 'toast', title: 'Crisis averted', text: 'The toast is gone but the house survives. You find {coins} in the crumb tray.', coins: .1 },
  raffleWin: { mood: 'good', icon: 'door', title: 'WINNER!', text: 'Ticket 47! The school gets its roof and you get {coins}.' },
  raffleLose: { mood: 'weird', icon: 'door', title: 'Not a winner', text: 'The kid thanks you for the roof tile. You paid for one roof tile.' },
};
// what happens when you leave it
export const MISSED = {
  door: ['A card through the letterbox: “Sorry we missed you.” They didn’t miss you. They saw you.', 'Whoever it was has gone. They left a footprint and a vibe.',
    'Two more knocks, then footsteps. You hold your breath until they’re gone.'],
  phone: ['It rings off. Then a text from a number you don’t know: “ring me back x”.', 'Voicemail: four minutes of breathing, then “sorry, wrong number”.',
    'It stops. Somewhere, a scammer sighs.'],
  toast: ['The alarm gives up in the end. The toast does not recover.', 'The neighbours bang on the wall. Breakfast is cancelled.'],
};

const pickW = list => { let x = Math.random() * list.reduce((s, o) => s + o.w, 0); for (const o of list) { x -= o.w; if (x <= 0) return o; } return list[0]; };
const counted = k => { S.life.house = S.life.house || {}; S.life.house[k] = (S.life.house[k] || 0) + 1; };

export const Household = {
  // which noise starts which event (the view decides whether now's a good time)
  EVENTS: { knock: 'door', doorbell: 'door', phone: 'phone', kittens: 'kitten', alarm: 'toast', smoke: 'battery' },
  raffleCost: () => Math.max(5, Math.ceil(baseCap() * .1)),

  // applies an outcome; returns the coins that changed hands and the add-on card it gave (if any)
  apply(o) {
    let coins = 0, card = null;
    if (o.coins > 0) coins = Math.round(baseCap() * o.coins);
    // bad luck never takes you near bust: it stops three minimum stakes short
    if (o.coins < 0) coins = -Math.max(0, Math.min(Math.round(S.coins * -o.coins), Math.round(baseCap() * .5), S.coins - TABLES[0].min * 3));
    if (o.fx === 'card' && !(card = Game.giveRandomAddon())) coins = Math.round(baseCap() * .3);
    if (o.fx === 'golden') S.goldNext++;
    if (o.fx === 'shield') S.inv.shield++;
    if (o.fx === 'spin') S.spinAt = -1e9;
    if (o.fx === 'streak0') S.streak = 0;
    if (o.fx === 'streak1') S.streak++;
    if (coins) S.coins = Math.max(0, S.coins + coins);
    SaveGame.saveNow();
    return { coins: coins || 0, card };
  },
  resolve(kind, list, pick) {
    const o = pick != null ? list[pick] : pickW(list);
    const { coins, card } = o.fx === 'raffle' ? { coins: 0, card: null } : this.apply(o);
    counted(kind);
    bus.emit('household', { kind, o, coins, card });
    return { o, coins, card };
  },
  answerDoor(pick) { return this.resolve('door', DOOR, pick); },
  answerPhone(pick) { return this.resolve('phone', PHONE, pick); },
  petKitten(pick) { return this.resolve('kitten', KITTEN, pick); },
  raffle(win = Math.random() < 1 / 8) { // one ticket: one in eight wins ten times the price
    const cost = this.raffleCost(); if (S.coins < cost) return null;
    const coins = (win ? cost * 10 : 0) - cost;
    S.coins += coins; if (win) counted('raffle'); SaveGame.saveNow();
    bus.emit('household', { kind: 'raffle', o: win ? CHORES.raffleWin : CHORES.raffleLose, coins: win ? cost * 10 : -cost, win });
    return { win, cost, coins };
  },
  changeBattery(ok = Math.random() < .75) { // you stand on a chair. it's the wobbly one.
    const { coins } = ok ? this.apply(CHORES.battery) : { coins: 0 };
    if (ok) { WeirdNoises.stopChirping(); counted('battery'); }
    bus.emit('household', { kind: 'battery', o: ok ? CHORES.battery : CHORES.fall, coins, ok });
    return { ok, coins };
  },
  saveToast() { const { coins } = this.apply(CHORES.toast); counted('toast'); bus.emit('household', { kind: 'toast', o: CHORES.toast, coins }); return coins; },
};
