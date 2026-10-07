// Your run as a picture to share: a 1200×630 card drawn on a canvas in the game's own colours and pixel fonts (the
// button's in Stats). Download it, or copy it to paste straight into a chat.
import { fmt, dur, esc } from '../core/util.js';
import { ROMAN } from '../data/economy.js';
import { rankName } from '../data/ranks.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { S, asc } from '../core/state.js';
import { Achievements } from '../game/achievements.js';
import { UI } from './ui.js';

const CARD_W = 1200, CARD_H = 630;
// a filled rounded box, with an optional rim
function cardRect(g, x, y, w, h, r, fill, rim) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  g.fillStyle = fill; g.fill(); if (rim) { g.lineWidth = 6; g.strokeStyle = rim; g.stroke(); }
}
// the bomb from the logo, with its face and a lit fuse
function cardBomb(g, x, y, r) {
  g.strokeStyle = '#c9a46a'; g.lineWidth = 8; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x + r * .55, y - r * .7); g.quadraticCurveTo(x + r * .9, y - r * 1.3, x + r * 1.25, y - r * 1.15); g.stroke();
  g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x + r * 1.3, y - r * 1.2, r * .2, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1b1b1b'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(x - r * .35, y - r * .4, r * .28, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; [-.32, .32].forEach(d => { g.beginPath(); g.arc(x + d * r, y - r * .05, r * .2, 0, Math.PI * 2); g.fill(); });
  g.fillStyle = '#1b1b1b'; [-.28, .36].forEach(d => { g.beginPath(); g.arc(x + d * r, y - r * .02, r * .09, 0, Math.PI * 2); g.fill(); });
  g.strokeStyle = '#fe5f55'; g.lineWidth = 5; g.beginPath(); g.arc(x, y + r * .25, r * .28, .15 * Math.PI, .85 * Math.PI); g.stroke();
}

export const RunCard = {
  // what goes on the card: six tiles of numbers
  stats(run = S.run) {
    const L = S.life;
    return [['Peak coins', fmt(run.peak)], ['Lasted', dur(run.time)], ['Boards', fmt(run.boards)],
      ['Biggest win', `+${fmt(run.biggest)}`], ['Rank', `Lv ${L.lvl} ${rankName(L.lvl)}`], ['Achievements', `${Achievements.count()} of ${ACHIEVEMENTS.length}`]];
  },
  async draw(run = S.run) {
    try { await Promise.all([document.fonts.load('64px "Jersey 10"'), document.fonts.load('24px Tiny5')]); } catch (e) { /* the fallbacks will do */ }
    const c = document.createElement('canvas'); c.width = CARD_W; c.height = CARD_H;
    const g = c.getContext('2d');
    const bg = g.createRadialGradient(360, 160, 40, 600, 315, 820); bg.addColorStop(0, '#2f8a66'); bg.addColorStop(1, '#0d3328');
    g.fillStyle = bg; g.fillRect(0, 0, CARD_W, CARD_H);
    g.fillStyle = 'rgba(255,255,255,.035)'; for (let y = 0; y < CARD_H; y += 6) for (let x = (y / 6) % 2 * 3; x < CARD_W; x += 6) g.fillRect(x, y, 2, 2);
    cardRect(g, 40, 40, CARD_W - 80, CARD_H - 80, 28, '#35474c', '#5b7379');
    g.textBaseline = 'alphabetic';
    g.font = '96px "Jersey 10", sans-serif';
    let x = 90; for (const [t, col] of [['Sweep', '#fe5f55'], ['$', '#ffd23f'], ['takes', '#fe5f55']]) { g.fillStyle = col; g.fillText(t, x, 160); x += g.measureText(t).width; }
    g.font = '24px Tiny5, monospace'; g.fillStyle = '#a9bdc2'; g.fillText('MINESWEEPER, BUT YOU’RE GAMBLING', 94, 200);
    cardBomb(g, 1020, 135, 52);
    this.stats(run).forEach(([k, v], i) => {
      const tx = 90 + (i % 3) * 350, ty = 240 + Math.floor(i / 3) * 140;
      cardRect(g, tx, ty, 330, 120, 18, '#222e32');
      g.font = '20px Tiny5, monospace'; g.fillStyle = '#a9bdc2'; g.fillText(k.toUpperCase(), tx + 22, ty + 38);
      g.font = `${v.length > 13 ? 40 : 60}px "Jersey 10", sans-serif`; g.fillStyle = '#ffd23f'; g.fillText(v, tx + 22, ty + 96, 290);
    });
    g.font = '22px Tiny5, monospace'; g.fillStyle = '#a9bdc2';
    g.fillText(`${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}${asc() ? ` · Ascension ${ROMAN[asc()]}` : ''}`, 90, CARD_H - 72);
    return c;
  },
  async open() {
    const c = await this.draw(), url = c.toDataURL('image/png'), alt = this.stats().map(([k, v]) => `${k}: ${v}`).join(', ');
    UI.modal(`<h3>Your run card</h3><img class="runcard" id="runCard" src="${url}" alt="${esc(alt)}">
      <div class="row"><a class="btn gold" id="runCardSave" href="${url}" download="sweepstakes-run.png">Download</a>
        ${navigator.clipboard && window.ClipboardItem ? '<button class="btn blue" type="button" data-a="copy">Copy</button>' : ''}
        <button class="btn ghost" type="button" data-a="close">Done</button></div>`,
      { close: () => UI.closeModal(), copy: () => this.copy(c) });
  },
  copy(c) {
    c.toBlob(b => navigator.clipboard.write([new ClipboardItem({ 'image/png': b })])
      .then(() => UI.toast('Copied. Paste it in the group chat.'), () => UI.toast('Couldn’t copy it. Download it instead.')));
  },
};
