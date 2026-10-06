// The jukebox (the button by the mute button, or J): put a record on, shuffle them, turn it down or switch it off.
// src/audio/music.js plays them; the notes are in src/data/jukebox.js and the records' names in src/content/jukebox.js.
import { $, $$, esc } from '../core/util.js';
import { S, SaveGame, pref } from '../core/state.js';
import { MUSIC, TRACKS } from '../data/jukebox.js';
import { RECORDS, SHUFFLE } from '../content/jukebox.js';
import { Sound } from '../audio/sound.js';
import { Music } from '../audio/music.js';
import { AudioEngine } from '../audio/engine.js';
import { Chat } from './chat.js';
import { UI } from './ui.js';

const JUKE_ART = `<svg class="jbox" viewBox="0 0 120 150" aria-hidden="true">
  <path d="M8 146 V62 A52 52 0 0 1 112 62 V146 Z" fill="#5a2a82" stroke="#141b1d" stroke-width="4" stroke-linejoin="round"/>
  <path class="tube t1" d="M17 146 V63 A43 43 0 0 1 103 63 V146" fill="none" stroke="#ffd23f" stroke-width="5"/>
  <path class="tube t2" d="M25 146 V64 A35 35 0 0 1 95 64 V146" fill="none" stroke="#fe5f55" stroke-width="5"/>
  <path d="M33 66 A27 27 0 0 1 87 66 V96 H33 Z" fill="#141b1d" stroke="#141b1d" stroke-width="3"/>
  <g class="disc"><circle cx="60" cy="76" r="17" fill="#2a2a2a" stroke="#000" stroke-width="2"/><circle cx="60" cy="76" r="11" fill="none" stroke="#444" stroke-width="1.5"/><circle cx="60" cy="76" r="5.5" fill="#ffd23f"/><circle cx="57" cy="74" r="1.6" fill="#141b1d"/></g>
  <rect x="33" y="102" width="54" height="36" rx="5" fill="#2b1840" stroke="#141b1d" stroke-width="3"/>
  <path d="M40 110 H80 M40 116 H80 M40 122 H80 M40 128 H80" stroke="#7e4fb3" stroke-width="2.5" stroke-linecap="round"/></svg>`;

export const JukeboxView = {
  open() {
    const v = Math.round(Music.volume() / MUSIC.LEVEL * 100);
    const recs = [...TRACKS.map(t => [t.id, RECORDS[t.id]]), ['shuffle', SHUFFLE]];
    UI.modal(`<div class="juke">${JUKE_ART}<h3>The jukebox</h3>
      <p class="jnow" id="jukeNow" aria-live="polite"></p>
      <ul class="jlist" aria-label="Records">${recs.map(([id, r]) => `<li><button type="button" class="jrec" data-rec="${id}" aria-pressed="false">
        <kbd>${r.code}</kbd><b>${esc(r.name)}</b><small>${esc(r.by)}</small><span>${esc(r.blurb)}</span></button></li>`).join('')}</ul>
      <label class="sl" for="jukeVol"><span>Music</span><input type="range" id="jukeVol" min="0" max="100" step="5" value="${v}"><output class="num" id="jukeVolO">${v}%</output></label>
      <div class="row"><button class="btn ghost" type="button" id="jukeOff"></button><button class="btn green" type="button" data-a="close">Done</button></div></div>`,
      { close: () => UI.closeModal() });
    $$('.jrec', UI.el.box).forEach(b => b.onclick = () => this.choose(b.dataset.rec));
    $('#jukeOff').onclick = () => this.toggle();
    const inp = $('#jukeVol'), out = $('#jukeVolO');
    inp.oninput = () => { S.musicVol = +inp.value / 100; out.textContent = inp.value + '%'; Music.applyVolume(); Sound.slide(S.musicVol); };
    inp.onchange = () => SaveGame.saveNow();
    this.now();
  },
  live() { return !!$('#jukeNow', UI.el.box); },
  // put a record on (and someone in the chat has an opinion about it)
  choose(id) {
    const changed = id !== S.track || !pref('music');
    S.music = true; Music.play(id); SaveGame.saveNow(); Sound.select(1); this.now();
    if (changed && RECORDS[id]) setTimeout(() => Chat.say('juke_' + id, {}, .8), 900);
  },
  toggle() {
    S.music = !pref('music'); Music.sync(); SaveGame.saveNow(); Sound.toggle(S.music); this.now();
    if (!S.music) setTimeout(() => Chat.say('juke_off', {}, .5), 700);
  },
  // what's on, or why nothing is
  now() {
    if (!this.live()) return;
    const on = pref('music'), id = Music.timer ? Music.id : S.track || 'lounge', r = RECORDS[id] || SHUFFLE;
    const why = !on ? 'The jukebox is off.' : S.muted ? 'You’re muted. Unmute (the speaker button, or M) to hear it.'
      : Music.holds.has('power') ? 'No power. It’ll come back on with the lights.' : Music.timer ? '' : !AudioEngine.get().unlocked ? 'Tap anywhere and it’ll start.' : 'Warming up…';
    const el = $('#jukeNow');
    el.innerHTML = why ? esc(why) : `<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span> Now playing: <b>${esc(r.name)}</b> by ${esc(r.by)}${S.track === 'shuffle' ? ' (shuffle)' : ''}`;
    UI.el.box.querySelector('.juke').classList.toggle('playing', !!Music.timer);
    $$('.jrec', UI.el.box).forEach(b => b.setAttribute('aria-pressed', String(on && b.dataset.rec === (S.track || 'lounge'))));
    $('#jukeOff').textContent = on ? 'Switch it off' : 'Switch it on';
  },
};
