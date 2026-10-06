"""Paper suite: The Daily Sweep. The newsroom noting the run's big moments, the paper coming through the letterbox
(the chip and the toast), the front page (the heaviest story leads, two more down the side, the weather, KEVCOIN, Nan's
stars, the small ads), Spot the Mine (always exactly one certain mine; right pays once, wrong shows where it was), a
quiet run, the bust screen's special edition, Stats and the phone."""
from common import Results, open_page

SETUP = """(() => { __sw.Coach.finish(); const S = __sw.S; S.coins = 50000; S.unlocked = ['penny', 'den']; S.sel = 'den'; S.life.lvl = 5; S.life.xp = 0;
  S.life.ach = Object.fromEntries(__sw.ACHIEVEMENTS.map(a => [a.id, 1])); __sw.renderAll(); })()"""
TOASTS = "[...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | ')"
# every puzzle the paper sets: one or two covered tiles are mines in every arrangement that fits, and at least three others aren't certain
PUZZLES = """(() => { const bad = [];
  for (let n = 0; n < 60; n++) {
    const z = __sw.Paper.puzzle(); if (!z) { bad.push('no puzzle'); continue; }
    const { W, H, nums } = z, N = W * H, cov = nums.map((v, i) => v < 0 ? i : -1).filter(i => i >= 0);
    const near = i => { const x = i % W, y = Math.floor(i / W), o = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = x + dx, b = y + dy; if ((dx || dy) && a >= 0 && b >= 0 && a < W && b < H) o.push(b * W + a); } return o; };
    let fits = 0; const hits = cov.map(() => 0);
    for (let m = 0; m < 1 << cov.length; m++) {
      const on = new Set(cov.filter((_, k) => m >> k & 1)); if (on.size !== z.mines) continue;
      if (nums.every((v, i) => v < 0 || near(i).filter(j => on.has(j)).length === v)) { fits++; cov.forEach((c, k) => { if (on.has(c)) hits[k]++; }); }
    }
    const sure = cov.filter((_, k) => hits[k] === fits);
    if (!(fits > 1 && sure.length >= 1 && sure.length <= 2 && cov.length - sure.length >= 3 && sure.join() === z.sure.join() && cov.length === __sw.PAPER.HIDDEN)) bad.push(JSON.stringify({ fits, sure, said: z.sure }));
  } return bad; })()"""


async def run(browser, url, shots):
    R = Results('paper'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=1200)
    await pg.mouse.click(3, 300)
    await pg.evaluate(SETUP); await pg.wait_for_timeout(200)

    # --- the newsroom hears what happens
    await pg.evaluate("(() => { __sw.S.run.news = []; __sw.Stars.setSign(4); __sw.Kev.launch(); __sw.Game.deal(0); __sw.PowerCut.start(30); })()"); await pg.wait_for_timeout(300)
    await pg.evaluate("(() => { __sw.PowerCut.end('topup'); __sw.News.note('jackpot', { table: 'Dodgy Den' }); __sw.News.note('clear', { table: 'Penny Patch' }); __sw.News.note('gull'); })()")
    kinds = await pg.evaluate("__sw.S.run.news.map(s => s.k)")
    ok({'kev_launch', 'power', 'jackpot', 'clear', 'gull'} <= set(kinds), f'the newsroom notes the run’s big moments {kinds}')

    # --- through the letterbox
    await pg.evaluate("(() => { __sw.Paper.auto = true; __sw.S.paperAt = undefined; __sw.S.run.time = __sw.PAPER.FIRST - 1; })()"); await pg.wait_for_timeout(1600)
    await pg.evaluate("__sw.Paper.auto = false")
    st = await pg.evaluate(f"({{ no: __sw.S.paper && __sw.S.paper.no, next: __sw.S.paperAt - __sw.S.run.time, chip: !document.getElementById('paperChip').hidden, toasts: {TOASTS} }})")
    ok(st['no'] == 1 and st['chip'] and 'letterbox' in st['toasts'] and 1100 < st['next'] <= 1200, f'ten minutes in, the first paper comes: a chip and a toast, and the next one’s due in twenty minutes ({st})')

    # --- the front page
    await pg.click('#paperChip'); await pg.wait_for_timeout(300)
    fp = await pg.evaluate("""(() => { const q = s => (document.querySelector('#modalBox ' + s) || {}).textContent || '';
      return { mast: q('.mast'), head: q('.head'), side: document.querySelectorAll('#modalBox .sidecol article').length, markets: q('.cols section:nth-child(2)'),
        stars: q('.cols section:nth-child(3)'), ads: document.querySelectorAll('#modalBox .ads p').length, chip: !document.getElementById('paperChip').hidden }; })()""")
    ok('The Daily Sweep' in fp['mast'] and 'No. 1' in fp['mast'], 'the masthead, the date and the number')
    ok('JACKPOT' in fp['head'] and fp['side'] == 2, f'the heaviest story leads (“{fp["head"]}”), two more down the side')
    ok('KEVCOIN' in fp['markets'] and 'since launch' in fp['markets'], f'markets: {fp["markets"][7:70]}')
    ok('Leo' in fp['stars'] and 'Tell Nan' not in fp['stars'], f'Nan’s stars, for your sign ({fp["stars"][11:60]}…)')
    ok(fp['ads'] == 3 and not fp['chip'], 'three small ads, and the chip goes once you’ve read it')
    await pg.screenshot(path=str(shots / 'paper.png'))

    # --- Spot the Mine
    bad = await pg.evaluate(PUZZLES)
    ok(not bad, f'sixty puzzles: each has one or two tiles that have to be mines, and at least three that might not be {bad[:3]}')
    await pg.evaluate("delete __sw.S.life.ach.puzzle")
    c0 = await pg.evaluate('__sw.S.coins'); prize = await pg.evaluate('__sw.S.paper.prize'); mine = await pg.evaluate('__sw.S.paper.puzzle.sure[0]')
    await pg.click(f'#modalBox [data-pt="{mine}"]'); await pg.wait_for_timeout(300)
    st = await pg.evaluate("({ coins: __sw.S.coins, res: document.getElementById('paperRes').textContent, open: document.querySelectorAll('#modalBox button.pt:not(:disabled)').length, solved: __sw.S.life.paper.solved })")
    ach = await pg.evaluate("__sw.Achievements.has('puzzle') ? __sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === 'puzzle')) : -1")
    ok(st['coins'] == c0 + prize + ach and 'Right' in st['res'] and st['open'] == 0 and st['solved'] == 1, f'the right tile pays {prize}, and that’s the puzzle done')
    ok(ach > 0, 'achievement: Read All About It')
    c0 += ach
    ok(await pg.evaluate(f"__sw.Paper.answer({mine}) === null && __sw.S.coins === {c0 + prize}"), 'it only pays once')
    await pg.evaluate("__sw.UI.closeModal()")
    await pg.evaluate("__sw.Paper.deliver()"); await pg.click('#paperChip'); await pg.wait_for_timeout(300)
    c1 = await pg.evaluate('__sw.S.coins')
    wrong = await pg.evaluate("__sw.S.paper.puzzle.nums.findIndex((v, i) => v < 0 && !__sw.S.paper.puzzle.sure.includes(i))")
    await pg.click(f'#modalBox [data-pt="{wrong}"]'); await pg.wait_for_timeout(300)
    st = await pg.evaluate("({ coins: __sw.S.coins, res: document.getElementById('paperRes').textContent, mine: !!document.querySelector('#modalBox .pt.mine'), wrong: !!document.querySelector('#modalBox .pt.wrong') })")
    ok(st['coins'] == c1 and 'Not that one' in st['res'] and st['mine'] and st['wrong'], 'a wrong tile: no prize, and the paper shows where the mine was')
    await pg.evaluate("__sw.UI.closeModal()")

    # --- a quiet run
    q = await pg.evaluate("__sw.Paper.compose({ time: 100, news: [] }).lead")
    ok(q['k'] == 'quiet' and q['head'] in ('NOTHING HAPPENS IN SWEEPTOWN', 'SLOW NEWS DAY'), f'a quiet run: “{q["head"]}”')
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok('2 papers, 1 puzzle solved' in await pg.evaluate("document.getElementById('stats').textContent"), 'Stats: papers delivered and puzzles solved')
    await pg.click('[data-tab="shop"]')

    # --- going bust: a special edition
    await pg.evaluate("(() => { __sw.News.note('cashout_big', { profit: '12,345', mult: '20.0', table: 'Dodgy Den' }); __sw.Game.slots.fill(null); __sw.Game.bust('broke'); })()"); await pg.wait_for_timeout(400)
    await pg.click('#modalBox [data-a="paper"]'); await pg.wait_for_timeout(300)
    st = await pg.evaluate("""(() => { const q = s => (document.querySelector('#modalBox ' + s) || {}).textContent || '';
      return { special: q('.special'), head: q('.head'), stand: q('.stand'), side: q('.sidecol'), btn: q('[data-a="after"]'), puzzle: !!document.querySelector('#modalBox .puzzle') }; })()""")
    ok('Special edition' in st['special'] and st['head'] in ('STUFFED', 'IT’S ALL GONE', 'RUN ENDS IN RUIN') and 'Lasted' in st['stand'], f'the bust screen’s “Read all about it”: a special edition (“{st["head"]}”)')
    ok('12,345' in st['side'] and st['btn'].startswith('Start again with') and not st['puzzle'], 'the run’s best moments down the side, and Start again at the bottom')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
    ok(await pg.evaluate("!__sw.UI.modalClosed()"), 'Escape can’t skip past the fresh start')
    await pg.click('#modalBox [data-a="after"]'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("__sw.UI.modalClosed() && __sw.S.run.boards === 0"), 'Start again: a fresh run')

    # --- the phone
    pctx, pp, perrs = await open_page(browser, url, width=360, height=780, mobile=True, wait=1200)
    await pp.evaluate(SETUP)
    await pp.evaluate("(() => { __sw.News.note('whopper', { veg: 'Marrow' }); __sw.News.note('darts_won', { total: 140, dave: 96 }); __sw.Paper.deliver(); })()"); await pp.wait_for_timeout(300)
    await pp.evaluate("document.getElementById('paperChip').click()"); await pp.wait_for_timeout(400)
    sw = await pp.evaluate("[document.documentElement.scrollWidth, innerWidth, document.getElementById('modalBox').scrollWidth <= document.getElementById('modalBox').clientWidth]")
    ok(sw[0] <= sw[1] and sw[2], f'phone: the paper fits without sideways scrolling {sw}')
    await pp.screenshot(path=str(shots / 'phone_paper.png'))
    await pctx.close()

    ok(not errs and not perrs, f'no console errors {(errs + perrs)[:3]}')
    await ctx.close()
    return R
