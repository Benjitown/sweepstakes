// Left panel (top bar on phones): coins, rank, chips, next goal and the big buttons.
import { $, fmt, clock, reduced } from '../core/util.js';
import { TABLES, CASINO, ROMAN } from '../data/economy.js';
import { rankName, xpNeed } from '../data/ranks.js';
import { S, has, pref, asc, streakBonus } from '../core/state.js';
import { Sound } from '../audio/sound.js';
import { Board } from '../board/board.js';
import { Game } from '../game/game.js';
import { Background } from './background.js';
import { FX } from './fx.js';

export const RunPanel = {
  shown: S.coins, anim: 0, wait: 0,
  coins(bump, fx) {
    // with flying coins, the counter starts when the first coin lands and finishes with the last one
    const to = S.coins;
    let delay = 0, length = 450;
    if (fx && fx.from) {
      const human = fx.human !== false, n = human ? Math.max(8, Math.min(24, Math.round(4 + Math.log10(Math.max(10, fx.amount || 10)) * 2))) : 3;
      const src = fx.from instanceof Board ? (fx.from.el && fx.from.el.querySelector('.pot')) : fx.from;
      const t = src ? FX.coins(src, n, k => Sound.coin(k, !human)) : { first: 0 };
      if (t.first) { delay = t.first; length = Math.max(300, t.last - t.first); }
    }
    cancelAnimationFrame(this.anim); clearTimeout(this.wait);
    const run = () => {
      const t0 = performance.now(), start = this.shown;
      const step = now => {
        const k = Math.min(1, (now - t0) / length); this.shown = start + (to - start) * (1 - Math.pow(1 - k, 3)); $('#coins').textContent = fmt(this.shown);
        if (k < 1) this.anim = requestAnimationFrame(step); else this.landed(bump);
      };
      this.anim = requestAnimationFrame(step);
    };
    if (delay) this.wait = setTimeout(run, delay); else run();
  },
  landed(bump) { if (bump && !reduced) { const e = $('#bank'); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); } },
  snap() { cancelAnimationFrame(this.anim); clearTimeout(this.wait); this.shown = S.coins; $('#coins').textContent = fmt(S.coins); },
  goal() {
    const lt = TABLES.find(t => !S.unlocked.includes(t.id));
    if (lt) return { label: `Next: unlock ${lt.name}`, cost: lt.cost };
    return S.owned ? { label: 'You own the casino', cost: 0 } : { label: 'Goal: buy the casino', cost: CASINO };
  },
  rank() {
    const L = S.life, need = xpNeed(L.lvl);
    $('#rankLv').textContent = `Lv ${L.lvl}`; $('#rankName').textContent = rankName(L.lvl); $('#lvChip').textContent = `Lv ${L.lvl}`;
    $('#rank .xpbar i').style.width = Math.min(100, L.xp / need * 100) + '%';
    $('#rank').title = `${fmt(L.xp)} / ${fmt(need)} XP to level ${L.lvl + 1}`;
  },
  spin() {
    const btn = $('#btnSpin'), left = Game.spinIn();
    btn.disabled = left > 0; btn.classList.toggle('ready', left <= 0);
    $('#spinLbl').textContent = left > 0 ? `Free spin in ${clock(left)}` : 'Free spin!';
    $('#spinShort').textContent = left > 0 ? clock(left) : 'Spin!';
    btn.setAttribute('aria-label', left > 0 ? `Free spin in ${clock(left)}` : 'Free spin ready');
  },
  render() {
    const g = this.goal();
    $('#goal .goal-l').textContent = g.cost ? `${g.label} · ${fmt(g.cost)}` : g.label;
    $('#goal .goal-bar i').style.width = (g.cost ? Math.min(100, S.coins / g.cost * 100) : 100) + '%';
    // each chip has a long label (desktop) and a short one (phone header)
    const chip = (sel, show, long, short) => { const el = $(sel); el.hidden = !show; el.querySelector('.long').textContent = long; el.querySelector('.short').textContent = short; };
    chip('#streak', S.streak >= 2, `${S.streak} streak · +${Math.round(streakBonus() * 100)}%`, `${S.streak}`);
    chip('#ascBadge', asc() > 0, `Ascension ${ROMAN[asc()]}`, ROMAN[asc()] || '');
    chip('#goldChip', S.goldNext > 0, `${S.goldNext} golden next`, `${S.goldNext}`);
    chip('#sugarChip', S.sugar > 0, `Sugar rush${S.sugar > 1 ? ' ×' + S.sugar : ''} · +25%`, '+25%');
    const busy = Game.slots.some(Boolean), don = $('#btnDon');
    don.disabled = busy || S.coins < 20;
    don.title = busy ? 'Finish or cash out your boards first' : S.coins < 20 ? 'Need at least 20 coins' : 'Stake everything you have';
    const fl = $('#btnFlip'); fl.disabled = !has('flip'); fl.title = has('flip') ? 'Coin flip' : 'Buy the Flip Booth in the shop';
    $('#btnMute use').setAttribute('href', S.muted ? '#i-mute' : '#i-sound');
    $('#btnMute').setAttribute('aria-label', S.muted ? 'Unmute sounds' : 'Mute sounds');
    $('#crt').hidden = !pref('crt');
    this.rank(); this.spin();
    Background.refresh();
  },
};
