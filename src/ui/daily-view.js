// The Daily Challenge screen: today's board in a modal, then your result, the group chat's scores and a share button.
import { $, ico, fmt, fmtX, esc } from '../core/util.js';
import { FRIENDS, LINES } from '../content/chat-lines.js';
import { S, baseCap } from '../core/state.js';
import { Daily, PRIZE } from '../game/daily.js';
import { UI } from './ui.js';
import { BoardsView } from './boards-view.js';
import { Chat } from './chat.js';

const hm = ms => { const h = Math.floor(ms / 36e5), m = Math.max(1, Math.ceil(ms % 36e5 / 6e4)); return h ? `${h}h ${m}m` : `${m}m`; };

export const DailyView = {
  open() {
    if (Daily.done()) return this.results();
    const b = Daily.open();
    UI.modal(`<div class="dmodal">
      <div class="dhead">${ico('calendar', 'dico')}<div><h3>Daily #${Daily.number(b.daily)}</h3>
        <p>Same board for everyone today. No add-ons, no shields, no stake. One go, so make it count.</p></div></div>
      <div class="board dboard">
        <div class="score dscore"><div class="box mlt"><small>Mult</small><b class="num">1.00</b></div>
          <div class="pot"><small>Prize</small><b class="num">0</b></div>
          <span class="gemct" title="Gems found">${ico('gem')}<b class="num">0/0</b></span></div>
        <div class="bprog"><i></i></div>
        <div class="gridwrap"><div class="grid" style="--w:${b.t.w}"></div></div>
        <div class="bf"><button class="btn ghost" type="button" data-a="later">Finish later</button>
          <button class="btn green cash" type="button" data-a="cash">${ico('chicken', 'ic')}<span>Cash out</span></button></div>
      </div></div>`, { later: () => UI.closeModal(), cash: () => Daily.cash(b) });
    b.el = $('.dboard', UI.el.box);
    const grid = $('.grid', b.el), frag = document.createDocumentFragment();
    b.cells = [];
    for (let i = 0; i < b.n; i++) { const c = document.createElement('button'); c.type = 'button'; c.dataset.i = i; b.cells.push(c); frag.appendChild(c); }
    grid.appendChild(frag);
    for (let i = 0; i < b.n; i++) BoardsView.cell(b, i);
    BoardsView.bindGrid(b, grid, { tap: i => b.open[i] ? Daily.chord(b, i) : Daily.dig(b, i), flag: i => Daily.flag(b, i) });
    this.hud(b);
  },

  hud(b) {
    if (!b.el || !b.el.isConnected) return;
    const m = b.mult();
    $('.box.mlt b', b.el).textContent = fmtX(m);
    $('.pot b', b.el).textContent = fmt(Math.round(baseCap() * PRIZE * m));
    $('.gemct b', b.el).textContent = `${b.gemsFound}/${b.gemsTotal}`;
    $('.bprog i', b.el).style.width = (b.frac() * 100).toFixed(1) + '%';
    const sc = $('.score', b.el); sc.classList.toggle('hot', m >= 3 && m < 10); sc.classList.toggle('blaze', m >= 10);
    const cash = $('.cash', b.el); cash.disabled = b.over;
    $('span', cash).textContent = b.over ? 'Done' : `Cash out ×${fmtX(m)}`;
  },

  results() {
    const st = Daily.state(), r = st.result, key = st.key;
    const rows = [{ who: 'you', mult: r.mult }, ...Daily.friends(key)].sort((a, b) => b.mult - a.mult);
    const list = rows.map((x, k) => {
      const f = x.who === 'you' ? null : FRIENDS[x.who];
      return `<li class="${f ? '' : 'me'}"><span class="rk">${k + 1}</span>${f ? Chat.avatar(f) : ico('bomb')}<span class="nm">${f ? esc(f.name) : 'You'}</span>
        <b class="num">${x.mult ? '×' + fmtX(x.mult) : 'blew up'}</b></li>`;
    }).join('');
    const line = r.why === 'boom' ? `Blew up after ${r.digs} dig${r.digs === 1 ? '' : 's'}.`
      : `×${fmtX(r.mult)} · ${r.gems}/${r.gemsTotal} gems · ${r.digs} dig${r.digs === 1 ? '' : 's'}${r.why === 'clear' ? ' · cleared it' : ''}`;
    const text = Daily.shareText(key, r);
    UI.modal(`<div class="dmodal dres">${ico('calendar', 'bigicon')}<h3>Daily #${Daily.number(key)}</h3>
      <p class="dline">${esc(line)}</p>
      <pre class="dshare" aria-label="Your result as emoji">${esc(text.split('\n').slice(2).join('\n'))}</pre>
      <ol class="dlist">${list}</ol>
      <p>${r.prize ? `Prize: <b class="num">+${fmt(r.prize)}</b> coins.` : 'No prize. Just the shame.'} Streak: ${st.streak} day${st.streak === 1 ? '' : 's'}.</p>
      <div class="row"><button class="btn gold" type="button" data-a="copy">Copy result</button>
        ${navigator.share ? '<button class="btn blue" type="button" data-a="share">Share</button>' : ''}
        <button class="btn ghost" type="button" data-a="close">Close</button></div>
      <p class="hint">Next board in ${hm(Daily.msToTomorrow())}.</p></div>`,
      { copy: () => this.copy(text), share: () => navigator.share({ text }).catch(() => {}), close: () => UI.closeModal() });
  },

  copy(text, said = 'Copied. Paste it in the group chat and gloat.') {
    const done = () => UI.toast(said);
    const fallback = () => {
      const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch (e) { UI.toast('Couldn’t copy. Long-press the emoji to copy them.'); }
      t.remove();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  },

  // The chip at the front of the table row.
  chip() {
    const st = Daily.state(), n = Daily.number(Daily.key());
    const sub = st && st.result ? `${st.result.mult ? '×' + fmtX(st.result.mult) : 'Blew up'} · next in ${hm(Daily.msToTomorrow())}`
      : st && st.board ? 'In progress · tap to finish' : 'Today’s board · not played';
    return { n, sub, fresh: !(st && st.result) };
  },

  // Someone in the chat has already done today's daily and wants you to know.
  nudge() {
    if (Daily.done()) return;
    const f = Daily.friends(Daily.key()), pick = f[Math.floor(Math.random() * f.length)];
    const pool = LINES[pick.mult ? 'daily_nudge' : 'daily_nudge_boom'].filter(([w]) => w === pick.who);
    const line = pool.length ? pool[Math.floor(Math.random() * pool.length)][1] : null;
    if (line) Chat.post(pick.who, line.replace('{x}', fmtX(pick.mult)));
  },
};
