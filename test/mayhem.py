"""Mayhem suite (experimental): the seagull after your coins."""
from common import Results, open_page

CLEAR = '__sw.HouseholdView.clear()'
SETUP = "(() => { __sw.Coach.finish(); __sw.S.coins = 50000; __sw.S.life.ach = Object.fromEntries(__sw.ACHIEVEMENTS.map(a => [a.id, 1])); __sw.S.life.lvl = 5; __sw.S.life.xp = 0; __sw.renderAll(); })()"


async def text(pg, sel):
    return await pg.evaluate(f"(document.querySelector('{sel}') || {{}}).textContent || ''")


async def run(browser, url, shots):
    R = Results('mayhem'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=1200)
    await pg.mouse.click(3, 300)
    await pg.evaluate(SETUP); await pg.wait_for_timeout(200)
    reward = "(id => __sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === id)))"

    # --- the seagull: a squawk, then it swoops onto your coins
    await pg.evaluate("__sw.WeirdNoises.surprise('gull')"); await pg.wait_for_timeout(500)
    ok(await pg.evaluate("!!document.querySelector('.gull') && !document.querySelector('.gull.landed')"), 'a squawk, and a seagull swoops in')
    await pg.wait_for_timeout(900)
    near = await pg.evaluate('''(() => { const g = document.querySelector('.gull').getBoundingClientRect(), b = document.querySelector('#bank').getBoundingClientRect();
      return Math.abs((g.left + g.width / 2) - (b.left + b.width / 2)) < 60 && g.bottom > b.top && g.top < b.bottom; })()''')
    ok(near and await pg.evaluate("!!document.querySelector('.gull.landed') && document.querySelector('#bank').classList.contains('pecked')"),
       'it lands on your coins and starts pecking')
    await pg.screenshot(path=str(shots / 'gull_pecking.png'))
    ok(await pg.evaluate("__sw.WeirdNoises.surprise('knock'), document.querySelectorAll('.happening').length === 0"), 'nobody knocks while the seagull’s at your coins')
    # shoo it: it flees, drops a chip, and the outcome pays (the gull outcomes are fixed here: "Shoo!" pays 15% of the top table's max stake)
    await pg.evaluate(f"(() => {{ __sw.S.life.ach = {{}}; window._c0 = __sw.S.coins; __sw.Household._shoo = __sw.Household.shooGull; __sw.Household.shooGull = () => __sw.Household._shoo(0); }})()")
    await pg.click('.gull'); await pg.wait_for_timeout(300)
    got = await pg.evaluate("__sw.S.coins - window._c0")
    ok(got > 0 and 'Shoo' in await text(pg, '.happening b') and await pg.evaluate("!!document.querySelector('.gull.shooed')"),
       f'tap it and it flees in a panic: “Shoo!” (+{got:,} with Not My Chips)')
    ok(await pg.evaluate("__sw.Achievements.has('gull') && __sw.S.life.house.gull === 1"), 'shooing one unlocks Not My Chips')
    await pg.screenshot(path=str(shots / 'gull_shooed.png'))
    await pg.wait_for_timeout(900)
    ok(await pg.evaluate("!document.querySelector('.gull') && !__sw.HouseholdView.gull"), 'and it’s gone')
    await pg.evaluate("(() => { __sw.Household.shooGull = __sw.Household._shoo; })()")

    # --- leave it: it pecks for a while, then flies off with some of your coins
    await pg.evaluate(f"(() => {{ {CLEAR}; __sw.HouseholdView.GULL_MS = 800; window._c0 = __sw.S.coins; __sw.HouseholdView.swoopGull(); }})()")
    await pg.wait_for_timeout(2300)
    lost = await pg.evaluate("window._c0 - __sw.S.coins")
    ok(lost > 0 and await pg.evaluate("__sw.S.life.house.gullNicked === 1") and await text(pg, '.happening b') in ('It got away', 'Daylight robbery'),
       f"ignore it and it gets away with {lost:,} (“{await text(pg, '.happening b')}”)")
    ok(lost <= 0.05 * 50000 + 1, 'it only takes a small bite (5% at most here)')
    await pg.screenshot(path=str(shots / 'gull_nicked.png'))
    # never near bust
    await pg.evaluate(f"(() => {{ {CLEAR}; __sw.S.coins = 31; }})()"); await pg.wait_for_timeout(1700)
    await pg.evaluate("__sw.HouseholdView.swoopGull()"); await pg.wait_for_timeout(2300)
    ok(await pg.evaluate("__sw.S.coins") >= 30, f"…and never takes you near bust (31 → {await pg.evaluate('__sw.S.coins')})")
    await pg.evaluate(f"(() => {{ {CLEAR}; __sw.HouseholdView.GULL_MS = 3600; __sw.S.coins = 50000; }})()")
    # the stats line
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok('Seagulls shooed' in await text(pg, '#stats') and 'got away' in await text(pg, '#stats'), 'Stats counts the seagulls you shooed (and the ones that got away)')

    ok(not errs, 'no console errors' + (': ' + '; '.join(errs[:3]) if errs else ''))
    await ctx.close()
    return R
