"""Fete suite: the church fete's Splat the Rat. The card that says it's on, three goes for the fee, splatting the rat,
pulling too early, being too slow, what it pays (your money back, ×3, ×8), Rat Catcher, walking off half-way (still
paid for your splats), Stats, the paper, and the phone."""
from common import Results, open_page

SETUP = """(() => { __sw.Coach.finish(); const S = __sw.S; S.coins = 50000; S.unlocked = ['penny', 'den']; S.sel = 'den'; S.life.lvl = 5; S.life.xp = 0;
  S.life.ach = Object.fromEntries(__sw.ACHIEVEMENTS.map(a => [a.id, 1])); delete S.life.ach.rat; S.splat = null; S.life.fete = null; __sw.renderAll(); })()"""
ST = "({ coins: __sw.S.coins, splat: __sw.S.splat, msg: document.getElementById('splatMsg').textContent, goes: document.getElementById('splatGoes').textContent })"


async def run(browser, url, shots):
    R = Results('fete'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=1200)
    await pg.mouse.click(3, 300)
    await pg.evaluate(SETUP); await pg.wait_for_timeout(200)

    # --- it's on
    await pg.evaluate("__sw.bus.emit('fete:due')"); await pg.wait_for_timeout(300)
    card = await pg.evaluate("(document.querySelector('.happening') || {}).textContent || ''")
    fee = await pg.evaluate('__sw.Fete.fee()')
    ok('The church fete' in card and 'Splat the Rat' in card and f'{fee:,}' in card, f'the church fete is on: “{card[:70]}…”')
    await pg.click('.happening [data-h="0"]'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("!!document.getElementById('splatPipe') && document.getElementById('splatGo').textContent.includes('Three goes')"), 'Have a go: Splat the Rat, three goes')

    # --- a splat, one too early, one too slow: one splat gets your money back
    await pg.evaluate("(() => { __sw.FETE.DROP = [250, 250]; __sw.FETE.WINDOW = 5000; })()")
    c0 = await pg.evaluate('__sw.S.coins')
    await pg.click('#splatGo'); await pg.wait_for_timeout(100)
    st = await pg.evaluate(ST)
    ok(st['coins'] == c0 - fee and st['splat'] == {'fee': fee, 'goes': 3, 'hits': 0} and 'Go 1 of 3' in st['goes'], f'three goes for {fee:,}, and the cord’s pulled')
    await pg.wait_for_timeout(450)
    ok(await pg.evaluate("document.getElementById('splatRat').classList.contains('out') && document.getElementById('splatMsg').textContent === 'NOW!'"), 'the rat shoots out of the bottom of the pipe: NOW!')
    await pg.screenshot(path=str(shots / 'fete_rat.png'))
    await pg.click('#splatHit'); await pg.wait_for_timeout(150)
    st = await pg.evaluate(ST)
    ok(st['splat'] == {'fee': fee, 'goes': 2, 'hits': 1} and ('SPLAT' in st['msg'].upper()), f'splat! ({st["msg"]})')
    await pg.click('#splatGo'); await pg.wait_for_timeout(60); await pg.click('#splatHit'); await pg.wait_for_timeout(150)
    st = await pg.evaluate(ST)
    ok(st['splat'] == {'fee': fee, 'goes': 1, 'hits': 1} and ('early' in st['msg'] or 'keen' in st['msg']), f'too early: it’s still up the pipe, and that’s a go gone ({st["msg"]})')
    await pg.evaluate("__sw.FETE.WINDOW = 60")
    await pg.click('#splatGo'); await pg.wait_for_timeout(800)
    st = await pg.evaluate(ST)
    ok(st['splat'] is None and st['coins'] == c0 and 'money back' in st['msg'], f'too slow on the last go: one splat out of three, your money back ({st["msg"]})')

    # --- all three: ×8, and Rat Catcher
    await pg.evaluate("__sw.FETE.WINDOW = 5000")
    bonus = await pg.evaluate("__sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === 'rat'))")
    c1 = await pg.evaluate('__sw.S.coins')
    for _ in range(3):
        await pg.click('#splatGo'); await pg.wait_for_timeout(450); await pg.click('#splatHit'); await pg.wait_for_timeout(150)
    st = await pg.evaluate(ST)
    ok(st['splat'] is None and st['coins'] == c1 + 7 * fee + bonus and 'All three' in st['msg'] and await pg.evaluate("__sw.Achievements.has('rat')"),
       f'all three: eight times the fee (+{8 * fee:,}), and Rat Catcher unlocks (+{bonus:,})')
    ok(await pg.evaluate("(__sw.S.run.news || []).some(n => n.k === 'splat3')"), 'and it makes the paper')

    # --- the keyboard: Enter pulls the cord, and Space splats it
    await pg.evaluate("__sw.FETE.WINDOW = 5000")
    await pg.focus('#splatGo'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(450)
    ok(await pg.evaluate("document.activeElement && document.activeElement.id === 'splatHit'"), 'pulling the cord puts you on the Splat! button')
    await pg.keyboard.press('Space'); await pg.wait_for_timeout(150)
    ok(await pg.evaluate("__sw.S.splat && __sw.S.splat.hits === 1"), 'and Space splats it')
    await pg.evaluate("(() => { __sw.Fete.settle(); __sw.FeteView.render(); })()")

    # --- walking off half-way still pays for your splats
    c2 = await pg.evaluate('__sw.S.coins')
    await pg.click('#splatGo'); await pg.wait_for_timeout(450); await pg.click('#splatHit'); await pg.wait_for_timeout(150)
    await pg.click('#modalBox [data-a="close"]'); await pg.wait_for_timeout(200)
    toasts = await pg.evaluate("[...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | ')")
    ok(await pg.evaluate('__sw.S.splat') is None and await pg.evaluate('__sw.S.coins') == c2 and 'church roof' in toasts, f'walk off after one splat: your money back anyway ({toasts[-70:]})')
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok('3 times, best 3 out of 3' in await pg.evaluate("document.getElementById('stats').textContent"), 'Stats: Splat the Rat, 3 times, best 3 out of 3')
    await pg.click('[data-tab="shop"]')

    # --- the phone
    pctx, pp, perrs = await open_page(browser, url, width=360, height=780, mobile=True, wait=1200)
    await pp.evaluate(SETUP); await pp.evaluate("__sw.FeteView.open()"); await pp.wait_for_timeout(300)
    sw = await pp.evaluate("[document.documentElement.scrollWidth, innerWidth, document.getElementById('splatHit').getBoundingClientRect().right]")
    ok(sw[0] <= sw[1] and sw[2] <= sw[1], f'phone: Splat the Rat fits without sideways scrolling {sw}')
    await pp.screenshot(path=str(shots / 'phone_fete.png'))
    await pctx.close()

    ok(not errs and not perrs, f'no console errors {(errs + perrs)[:3]}')
    await ctx.close()
    return R
