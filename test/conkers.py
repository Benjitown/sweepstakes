"""Conkers suite: conkers with Priya. Only in conker season, her challenge in the group chat (the stake), Nah, You're
on (the stake goes in), the swing meter (a smash in the gold, a hit in the green, a miss outside it, and strings),
her strikes, winning (double the stake, Oner, the paper), losing, walking away, Stats, and the phone."""
from common import Results, open_page

SETUP = """(() => { __sw.Coach.finish(); const S = __sw.S; S.coins = 50000; S.unlocked = ['penny', 'den']; S.sel = 'den'; S.life.lvl = 5; S.life.xp = 0;
  S.life.ach = Object.fromEntries(__sw.ACHIEVEMENTS.map(a => [a.id, 1])); delete S.life.ach.conker; S.life.conkers = null; __sw.renderAll(); })()"""
ASK = """(() => { __sw.Conkers.force = true; __sw.Conkers.offer = null; const n0 = document.querySelectorAll('#chat .conker-ask').length; __sw.bus.emit('conkers:due');
  const el = [...document.querySelectorAll('#chat .conker-ask')].pop(); return { n: document.querySelectorAll('#chat .conker-ask').length - n0, text: el ? el.querySelector('span').textContent : '', stake: __sw.Conkers.offer && __sw.Conkers.offer.stake }; })()"""
ST = "({ m: __sw.Conkers.match && { mine: __sw.Conkers.match.mine, hers: __sw.Conkers.match.hers, turn: __sw.Conkers.match.turn }, msg: document.getElementById('cMsg') ? document.getElementById('cMsg').textContent : '', coins: __sw.S.coins })"


async def run(browser, url, shots):
    R = Results('conkers'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=1200)
    await pg.mouse.click(3, 300)
    await pg.evaluate(SETUP); await pg.wait_for_timeout(200)

    # --- only in conker season
    off = await pg.evaluate("(() => { __sw.Conkers.force = false; const n0 = document.querySelectorAll('#chat .conker-ask').length; __sw.bus.emit('conkers:due'); return document.querySelectorAll('#chat .conker-ask').length - n0; })()")
    a = await pg.evaluate(ASK)
    ok(off == 0 and a['n'] == 1 and f'{a["stake"]:,}' in a['text'], f'in conker season (and only then) Priya wants a game: “{a["text"][:70]}…”')
    await pg.click('#chat .conker-ask:last-child [data-a="no"]'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("__sw.Conkers.offer === null && __sw.S.life.conkers.nah === 1"), 'Nah: she lets it go (and remembers)')

    # --- you're on: the stake goes in
    a = await pg.evaluate(ASK); c0 = await pg.evaluate('__sw.S.coins')
    await pg.click('#chat .conker-ask:last-child [data-a="on"]'); await pg.wait_for_timeout(300)
    st = await pg.evaluate(ST)
    ok(st['m'] == {'mine': 5, 'hers': 6, 'turn': 'you'} and st['coins'] == c0 - a['stake'] and await pg.evaluate("!!document.getElementById('cNeedle')"),
       f'You’re on: {a["stake"]:,} goes in, and it’s your swing')
    await pg.screenshot(path=str(shots / 'conkers.png'))

    # --- the swing meter: gold's a smash, green's a hit; then her strike
    await pg.evaluate("(() => { __sw.ConkersView.at = () => .5; __sw.Conkers.rng = () => .1; })()")  # (.1: she misses)
    await pg.click('#cSwing'); await pg.wait_for_timeout(100)
    st = await pg.evaluate(ST)
    ok(st['m'] == {'mine': 5, 'hers': 4, 'turn': 'her'} and await pg.evaluate("document.getElementById('cSwing').disabled"), f'a swing in the gold: a smash, two knocks ({st["msg"]})')
    await pg.wait_for_timeout(1300)
    st = await pg.evaluate(ST)
    ok(st['m'] == {'mine': 5, 'hers': 4, 'turn': 'you'} and 'Your go' in st['msg'], f'then she swings, and misses ({st["msg"]})')
    await pg.evaluate("__sw.ConkersView.at = () => .5 + .2")
    await pg.click('#cSwing'); await pg.wait_for_timeout(100)
    ok((await pg.evaluate(ST))['m']['hers'] == 3, 'a swing in the green: one knock')
    await pg.wait_for_timeout(1300)
    await pg.evaluate("__sw.ConkersView.at = () => 0")
    await pg.click('#cSwing'); await pg.wait_for_timeout(100)
    st = await pg.evaluate(ST)
    ok(st['m']['hers'] == 3 and st['m']['turn'] == 'you' and 'STRINGS' in st['msg'], f'a miss, but the strings tangle: you go again ({st["msg"]})')
    await pg.evaluate("__sw.Conkers.rng = () => .9")  # (.9: no strings, and she smashes)
    await pg.click('#cSwing'); await pg.wait_for_timeout(1400)
    st = await pg.evaluate(ST)
    ok(st['m'] == {'mine': 3, 'hers': 3, 'turn': 'you'}, f'a miss, and she smashes yours: two knocks ({st["msg"]})')

    # --- win: double the stake, and Oner
    await pg.evaluate("(() => { __sw.ConkersView.at = () => .5; __sw.Conkers.rng = () => .1; })()")
    bonus = await pg.evaluate("__sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === 'conker'))")
    c1 = await pg.evaluate('__sw.S.coins')
    await pg.click('#cSwing'); await pg.wait_for_timeout(1400); await pg.click('#cSwing'); await pg.wait_for_timeout(300)
    st = await pg.evaluate(ST)
    ok(st['m'] is None and st['coins'] == c1 + 2 * a['stake'] + bonus and 'You win' in st['msg'] and await pg.evaluate("__sw.Achievements.has('conker')"),
       f'hers cracks: you win double the stake ({2 * a["stake"]:,}) and Oner unlocks')
    ok(await pg.evaluate("(__sw.S.run.news || []).some(n => n.k === 'conker')") and (await pg.text_content('#cLeave')).strip() == 'Done', 'it makes the paper, and the button says Done')
    await pg.click('#cLeave'); await pg.wait_for_timeout(300)

    # --- lose: she smashes every time
    a = await pg.evaluate(ASK)
    await pg.click('#chat .conker-ask:last-child [data-a="on"]'); await pg.wait_for_timeout(300)
    await pg.evaluate("(() => { __sw.ConkersView.at = () => 0; __sw.Conkers.rng = () => .9; })()")
    for _ in range(3):
        await pg.click('#cSwing'); await pg.wait_for_timeout(1350)
    st = await pg.evaluate(ST)
    ok(st['m'] is None and 'Priya keeps' in st['msg'], f'she cracks yours: Priya keeps the stake ({st["msg"]})')
    await pg.click('#cLeave'); await pg.wait_for_timeout(300)

    # --- walking away mid-match: she wins
    a = await pg.evaluate(ASK); c2 = await pg.evaluate('__sw.S.coins')
    await pg.click('#chat .conker-ask:last-child [data-a="on"]'); await pg.wait_for_timeout(300)
    await pg.click('#cLeave'); await pg.wait_for_timeout(300)
    toasts = await pg.evaluate("[...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | ')")
    ok(await pg.evaluate("__sw.Conkers.match === null") and await pg.evaluate('__sw.S.coins') == c2 - a['stake'] and 'You walk off' in toasts, 'walk away mid-match: she keeps the stake')
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok('1 won of 3' in await pg.evaluate("document.getElementById('stats').textContent"), 'Stats: conkers, 1 won of 3')
    await pg.click('[data-tab="shop"]')

    # --- the phone
    pctx, pp, perrs = await open_page(browser, url, width=360, height=780, mobile=True, wait=1200)
    await pp.evaluate(SETUP); await pp.evaluate(ASK); await pp.evaluate("(() => { __sw.Conkers.accept(); __sw.ConkersView.open(); })()"); await pp.wait_for_timeout(300)
    sw = await pp.evaluate("[document.documentElement.scrollWidth, innerWidth, document.querySelector('.cmeter').getBoundingClientRect().right]")
    ok(sw[0] <= sw[1] and sw[2] <= sw[1], f'phone: conkers fits without sideways scrolling {sw}')
    await pp.screenshot(path=str(shots / 'phone_conkers.png'))
    await pctx.close()

    ok(not errs and not perrs, f'no console errors {(errs + perrs)[:3]}')
    await ctx.close()
    return R
