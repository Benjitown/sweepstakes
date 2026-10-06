"""Mayhem suite (experimental): the seagull after your coins, power cuts."""
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

    # --- a power cut: the meter runs out mid-game, and the dark pays danger money
    await pg.evaluate(f"(() => {{ {CLEAR}; __sw.S.coins = 50000; __sw.S.life.ach = Object.fromEntries(__sw.ACHIEVEMENTS.map(a => [a.id, 1])); delete __sw.S.life.ach.dark; __sw.renderAll(); }})()")
    # a live board with some profit on it (as if a risky dig had paid ×1.6)
    DEAL = "(() => { __sw.Game.deal(0); const b = __sw.slots[0]; __sw.invoke(new __sw.DigCommand(b, Math.floor(b.t.h / 2) * b.t.w + Math.floor(b.t.w / 2))); b.G *= 1.6; return [b.pot(), b.stake]; })()"
    await pg.evaluate(DEAL); await pg.wait_for_timeout(300)
    await pg.evaluate("__sw.WeirdNoises.surprise('powerdown')"); await pg.wait_for_timeout(1100)
    ok(await pg.evaluate("__sw.PowerCut.on && !!document.querySelector('.blackout') && !!document.querySelector('.meterhud')") and 'meter' in await text(pg, '.happening b'),
       'the meter runs out: the lights go off and a card says why')
    hud = await text(pg, '.meterhud')
    ok('Power cut' in hud and 'Top up' in hud and '+50% danger money' in hud, f'the meter at the top counts down and offers a top-up (“{hud.strip()[:60]}”)')
    await pg.mouse.move(400, 500); await pg.wait_for_timeout(100)
    ok(await pg.evaluate("document.querySelector('.blackout').style.getPropertyValue('--tx') === '400px' && document.querySelector('.blackout').style.getPropertyValue('--ty') === '500px'"),
       'the torch follows the pointer')
    await pg.screenshot(path=str(shots / 'power_cut.png'))
    await pg.click('.happening [data-h="1"]'); await pg.wait_for_timeout(200)
    # cash out in the dark: +50% on the profit, and Danger Money
    pot, stake, c0, bonus = await pg.evaluate(f"(() => {{ const b = __sw.slots[0]; return [b.pot(), b.stake, __sw.S.coins, {reward}('dark')]; }})()")
    await pg.evaluate("__sw.Game.cashOut(__sw.slots[0], 'manual')"); await pg.wait_for_timeout(300)
    paid = await pg.evaluate('__sw.S.coins') - c0 - bonus
    ok(pot > stake and paid == pot + (pot - stake) // 2, f'a board cashed out in the dark pays its pot ({pot:,}) plus half its profit again: {paid:,}')
    ok(await pg.evaluate("__sw.Achievements.has('dark')"), 'and unlocks Danger Money')
    # top up the meter
    cost, c0 = await pg.evaluate("[__sw.PowerCut.cost(), __sw.S.coins]")
    await pg.click('#meterTop'); await pg.wait_for_timeout(800)
    ok(await pg.evaluate('__sw.S.coins') == c0 - cost and await pg.evaluate("!__sw.PowerCut.on && !document.querySelector('.meterhud') && !document.querySelector('.blackout')"),
       f'topping up costs {cost:,} and the lights come back')
    pot, stake = await pg.evaluate(DEAL)
    c0 = await pg.evaluate('__sw.S.coins'); await pg.evaluate("__sw.Game.cashOut(__sw.slots[0], 'manual')"); await pg.wait_for_timeout(200)
    ok(await pg.evaluate('__sw.S.coins') - c0 == pot, f'with the lights on, a board pays just its pot ({pot:,})')
    # or wait for the emergency credit
    await pg.evaluate("__sw.PowerCut.start(1)"); await pg.wait_for_timeout(1900)
    ok(await pg.evaluate("!__sw.PowerCut.on && !document.querySelector('.blackout')") and await pg.evaluate("[...document.querySelectorAll('.toast')].some(t => /emergency credit/.test(t.textContent))"),
       'or wait, and the emergency credit kicks in')
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok('Power cuts' in await text(pg, '#stats') and '1 topped up' in await text(pg, '#stats'), 'Stats counts power cuts and top-ups')

    ok(not errs, 'no console errors' + (': ' + '; '.join(errs[:3]) if errs else ''))
    await ctx.close()
    return R
