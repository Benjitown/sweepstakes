// The Daily Sweep (the numbers are in src/data/paper.js, the words in src/content/paper.js). The newsroom notes the
// run's big moments as they happen; every twenty minutes of play the paper comes through the letterbox with the
// biggest of them on the front, plus the weather, KEVCOIN, Nan's stars, the small ads and a puzzle that pays.
import { nice, fmt, dur } from '../core/util.js';
import { bus } from '../core/bus.js';
import { S, SaveGame, baseCap } from '../core/state.js';
import { PAPER, STORY_WEIGHT } from '../data/paper.js';
import { STORIES, STORY_ART, SMALL_ADS, PAPER_WEATHER } from '../content/paper.js';
import { Game } from './game.js';
import { Seasons } from './seasons.js';
import { Stars } from './horoscope.js';

const fill = (t, vars) => t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const pickOf = (a, rng) => a[Math.floor(rng() * a.length)];

export const News = {
  // a story for the paper: what kind (src/content/paper.js), its details, and how much it matters
  note(k, vars = {}) {
    if (!STORIES[k]) return;
    const n = S.run.news = S.run.news || [];
    n.push({ k, vars, w: STORY_WEIGHT[k] || 1, t: S.run.time });
    if (n.length > PAPER.KEEP) n.splice(0, n.length - PAPER.KEEP);
  },
};

export const Paper = {
  auto: true, rng: Math.random,
  // every second of play: is the paper due?
  second() {
    if (!this.auto) return;
    if (S.run.time >= (S.paperAt ?? PAPER.FIRST)) { S.paperAt = S.run.time + PAPER.EVERY; this.deliver(); }
  },
  deliver() {
    const L = S.life; L.paper = L.paper || { delivered: 0, solved: 0 };
    const p = S.paper = this.compose(S.run, 'daily', ++L.paper.delivered);
    SaveGame.save(); bus.emit('paper', p);
    return p;
  },
  // the front page: the heaviest story leads (fresher ones count for a bit more), the next two go down the side
  compose(run, mode = 'daily', no = (S.life.paper ? S.life.paper.delivered : 0) || 1) {
    const rng = this.rng, now = run.time || 1;
    const ranked = (run.news || []).map(s => ({ ...s, rank: s.w + 2 * (s.t || 0) / now })).sort((a, b) => b.rank - a.rank);
    const kinds = new Set(), top = [];
    if (mode === 'bust') { const k = run.reason === 'don' ? 'bust_don' : 'bust'; top.push({ k, vars: { lasted: dur(run.time || 0), peak: fmt(run.peak || 0) } }); kinds.add('bust'); }
    for (const s of ranked) { if (top.length >= 3) break; if (!kinds.has(s.k)) { kinds.add(s.k); top.push(s); } }
    if (!top.length) top.push({ k: 'quiet', vars: {} });
    const story = s => { const [heads, subs] = STORIES[s.k]; return { k: s.k, head: fill(pickOf(heads, rng), s.vars).toUpperCase(), sub: fill(pickOf(subs, rng), s.vars), art: STORY_ART[s.k] || 'coin' }; };
    const season = Seasons.now(), stormy = (run.news || []).some(s => s.k === 'storm');
    const kev = S.kev, star = Stars.read();
    const ads = SMALL_ADS.slice().sort(() => rng() - .5).slice(0, 3);
    return {
      no, mode, date: new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      lead: story(top[0]), side: top.slice(1).map(story),
      weather: stormy ? PAPER_WEATHER.storm : PAPER_WEATHER[season] || pickOf(PAPER_WEATHER.any, rng),
      markets: kev ? { v: kev.v, price: kev.price, start: kev.hist && kev.hist[0] } : null,
      stars: star ? { name: star.name, text: star.text } : null,
      ads, puzzle: mode === 'daily' ? this.puzzle(rng) : null, prize: nice(Math.max(10, baseCap() * PAPER.PUZZLE)), solved: false, read: false,
    };
  },
  // Spot the Mine: a little board, open except for the mines and some safe tiles next to them, where one or two of
  // the covered tiles have to be mines (in every way the mines could lie that fits the numbers and the total) and at
  // least three others might not be
  puzzle(rng = this.rng) {
    const [W, H] = PAPER.GRID, N = W * H;
    const near = i => { const x = i % W, y = Math.floor(i / W), out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if ((dx || dy) && nx >= 0 && ny >= 0 && nx < W && ny < H) out.push(ny * W + nx); } return out; };
    for (let tries = 0; tries < 500; tries++) {
      const mines = new Set(); while (mines.size < PAPER.MINES) mines.add(Math.floor(rng() * N));
      const hidden = new Set(mines), edge = [...new Set([...mines].flatMap(near))].filter(j => !mines.has(j)).sort(() => rng() - .5);
      for (const j of edge) { if (hidden.size >= PAPER.HIDDEN) break; hidden.add(j); }
      while (hidden.size < PAPER.HIDDEN) hidden.add(Math.floor(rng() * N));
      const cov = [...hidden].sort((a, b) => a - b), nums = Array.from({ length: N }, (_, i) => hidden.has(i) ? -1 : near(i).filter(j => mines.has(j)).length);
      const counts = cov.map(() => 0); let fits = 0;
      for (let m = 0; m < 1 << cov.length; m++) {
        let bits = 0; for (let b = m; b; b &= b - 1) bits++;
        if (bits !== PAPER.MINES) continue;
        const on = new Set(cov.filter((_, i) => m >> i & 1));
        if (!nums.every((v, i) => v < 0 || near(i).filter(j => on.has(j)).length === v)) continue;
        fits++; cov.forEach((c, i) => { if (on.has(c)) counts[i]++; });
      }
      const sure = cov.filter((_, i) => counts[i] === fits);
      if (fits > 1 && sure.length >= 1 && sure.length <= 2 && cov.length - sure.length >= 3) return { W, H, nums, sure, mines: PAPER.MINES };
    }
    return null;
  },
  // your answer to the puzzle: right pays the prize, once
  answer(i) {
    const p = S.paper; if (!p || !p.puzzle || p.solved) return null;
    p.solved = p.puzzle.sure.includes(i) ? 'right' : 'wrong';
    if (p.solved === 'right') { Game.setCoins(S.coins + p.prize, true); S.life.paper.solved++; }
    SaveGame.saveNow(); bus.emit('paper:answer', { right: p.solved === 'right', prize: p.prize });
    return p.solved;
  },
};
