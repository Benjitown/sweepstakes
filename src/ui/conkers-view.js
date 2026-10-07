// Conkers with Priya on screen: her challenge in the group chat (You're on / Nah), and the match: two conkers on their
// bootlaces, the knocks each can still take, the swing meter and the Swing! button. src/game/conkers.js keeps score.
import { $, $$, esc, fmt, rnd } from '../core/util.js';
import { FRIENDS } from '../content/chat-lines.js';
import { CONKERS } from '../data/conkers.js';
import { CONKER_ASK, CONKER_SAYS } from '../content/conkers.js';
import { Conkers } from '../game/conkers.js';
import { Sound } from '../audio/sound.js';
import { Chat } from './chat.js';
import { UI } from './ui.js';
import { Haptics } from './haptics.js';

// a conker on a bootlace, cracked according to how many knocks it's taken (of max)
const conkerSvg = (id, left, max) => {
  const cracks = Math.ceil((1 - left / max) * 3);
  return `<svg class="conker" id="${id}" viewBox="0 0 80 130" aria-hidden="true"><path d="M40 0 V62" stroke="#e8dcc4" stroke-width="3"/>
    <circle cx="40" cy="92" r="30" fill="#8b4513" stroke="#141b1d" stroke-width="3.5"/><ellipse cx="40" cy="109" rx="15" ry="8" fill="#d9b98a" stroke="#141b1d" stroke-width="2"/>
    <path d="M26 78 q8 -8 18 -6" fill="none" stroke="#fff" stroke-width="3" opacity=".45" stroke-linecap="round"/>
    <g stroke="#141b1d" stroke-width="2.5" fill="none" stroke-linecap="round">${['M40 63 l-4 10 l6 6 l-5 9', 'M66 86 l-9 3 l-2 8', 'M16 98 l9 -2 l3 8'].slice(0, cracks).map(d => `<path d="${d}"/>`).join('')}</g></svg>`;
};
const pips = (left, max) => Array.from({ length: max }, (_, k) => `<i class="${k < left ? '' : 'gone'}"></i>`).join('');

export const ConkersView = {
  raf: 0, t0: 0, expire: 0, her: 0, busy: false,
  // Priya's challenge, in the group chat
  offer(o) {
    const f = FRIENDS.priya, chat = $('#chat'); if (!chat) return;
    chat.insertAdjacentHTML('beforeend', `<div class="msg invite conker-ask">${Chat.avatar(f)}<div class="bubble" style="--fc:${f.col}"><b>${esc(f.name)}</b>
      <span>${esc(rnd(CONKER_ASK).replace('{stake}', fmt(o.stake)))}</span>
      <div class="qopts"><button type="button" class="qopt" data-a="on">You’re on</button><button type="button" class="qopt" data-a="no">Nah</button></div></div></div>`);
    while (chat.children.length > 40) chat.firstChild.remove();
    chat.scrollTop = chat.scrollHeight; Sound.msg();
    const el = chat.lastElementChild, settle = how => { clearTimeout(this.expire); $$('.qopt', el).forEach(b => { b.disabled = true; if (b.dataset.a === how) b.classList.add('right'); }); };
    $('[data-a="on"]', el).onclick = () => {
      if (!UI.modalClosed()) return UI.toast('Finish what you’re doing first.');
      if (!Conkers.accept()) { settle(''); return UI.toast('You can’t cover the stake.'); }
      settle('on'); this.open();
    };
    $('[data-a="no"]', el).onclick = () => { settle('no'); Conkers.decline('nah'); };
    clearTimeout(this.expire); this.expire = setTimeout(() => { settle(''); Conkers.decline('ignored'); }, CONKERS.ANSWER * 1000);
  },
  open() {
    const m = Conkers.match; if (!m) return;
    UI.modal(`<div class="conkers"><h3>Conkers <small class="num">${fmt(m.stake)} on it</small></h3>
      <div class="cring"><div class="cside"><b>You</b><span id="cMineC"></span><span class="pips" id="cMine"></span></div><div class="cvs">vs</div>
        <div class="cside"><b>Priya</b><span id="cHersC"></span><span class="pips" id="cHers"></span></div></div>
      <div class="cmeter" style="--hit:${CONKERS.HIT * 100}%;--smash:${CONKERS.SMASH * 100}%"><i class="good"></i><i class="sweet"></i><b id="cNeedle"></b></div>
      <p class="cmsg" id="cMsg" aria-live="polite">Your go. Swing when the needle’s in the gold.</p>
      <div class="row"><button class="btn gold big" type="button" id="cSwing">Swing!</button></div>
      <button class="btn ghost" type="button" data-a="close" id="cLeave">Walk away</button></div>`, { close: () => this.leave() });
    const sw = $('#cSwing'); sw.onpointerdown = e => { e.preventDefault(); this.swing(); }; sw.onclick = e => { if (e.detail === 0) this.swing(); };
    this.busy = false; this.render(); this.t0 = performance.now(); this.loop();
  },
  live() { return !!$('#cNeedle', UI.el.box); },
  // where the needle is (0 to 1, there and back)
  at() { const x = ((performance.now() - this.t0) / 1000 * CONKERS.SWEEP) % 1; return 1 - Math.abs(2 * x - 1); },
  loop() {
    cancelAnimationFrame(this.raf);
    const step = () => { if (!this.live()) return; $('#cNeedle').style.left = (this.at() * 100).toFixed(2) + '%'; this.raf = requestAnimationFrame(step); };
    step();
  },
  stop() { cancelAnimationFrame(this.raf); clearTimeout(this.her); this.busy = false; },
  render(m = Conkers.match, last = null) {
    if (!this.live()) return;
    const mine = m ? m.mine : last.mine, hers = m ? m.hers : last.hers;
    $('#cMineC').innerHTML = conkerSvg('cMineS', mine, CONKERS.MINE); $('#cHersC').innerHTML = conkerSvg('cHersS', hers, CONKERS.HERS);
    $('#cMine').innerHTML = pips(mine, CONKERS.MINE); $('#cHers').innerHTML = pips(hers, CONKERS.HERS);
    $('#cSwing').disabled = !m || m.turn !== 'you' || this.busy;
  },
  say(t) { const el = $('#cMsg'); if (el) el.textContent = t; },
  shake(id) { const el = $('#' + id); if (el) { el.classList.remove('shake'); void el.getBoundingClientRect(); el.classList.add('shake'); } },
  swing() {
    const m = Conkers.match; if (!m || m.turn !== 'you' || this.busy || !this.live()) return;
    const before = { mine: m.mine, hers: m.hers }, r = Conkers.strike(this.at());
    if (!r) return;
    if (r.knocks) { Sound.drum(); Haptics.buzz(r.knocks > 1 ? [40, 30, 60] : 30); } else Sound.unflag();
    this.say(rnd(CONKER_SAYS[r.knocks === 2 ? 'smash' : r.knocks ? 'hit' : r.strings ? 'strings' : 'miss']));
    if (r.done) return this.done(r, { mine: before.mine, hers: 0 });
    this.render(); if (r.knocks) this.shake('cHersS');
    if (Conkers.match.turn === 'her') { this.busy = true; this.render(); this.her = setTimeout(() => this.hers(), 1100); }
  },
  hers() {
    this.busy = false; const m = Conkers.match; if (!m || !this.live()) return;
    const before = { mine: m.mine, hers: m.hers }, r = Conkers.herStrike(); if (!r) return;
    if (r.knocks) { Sound.drum(); Haptics.buzz(30); } else Sound.unflag();
    this.say(rnd(CONKER_SAYS['her' + r.knocks]) + (r.done ? '' : ' Your go.'));
    if (r.done) return this.done(r, { mine: 0, hers: before.hers });
    this.render(); if (r.knocks) this.shake('cMineS');
  },
  done(r, last) {
    this.stop(); this.render(null, last); this.shake(r.result === 'won' ? 'cHersS' : 'cMineS');
    this.say(r.result === 'won' ? `Hers is in bits! You win ${fmt(r.pay)}.` : `Yours is in bits. Priya keeps the ${fmt(r.stake)}.`);
    if (r.result === 'won') Sound.win(); else Sound.boo();
    const lv = $('#cLeave'); if (lv) { lv.textContent = 'Done'; lv.classList.replace('ghost', 'green'); }
  },
  // walking off mid-match: she wins
  leave() {
    this.stop();
    const r = Conkers.match ? Conkers.forfeit() : null;
    UI.closeModal();
    if (r) UI.toast(`You walk off. Priya keeps the ${fmt(r.stake)}, and the bragging rights.`);
  },
};
