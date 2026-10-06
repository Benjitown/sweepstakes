"""Wildcards suite (experimental): thunderstorms (the rain, lightning that shows the mines, a strike that takes the
power out, Lightning Reflexes)."""
from common import Results, open_page

SETUP = """(() => { __sw.Coach.finish(); const S = __sw.S; S.coins = 50000; S.unlocked = ['penny', 'den']; S.sel = 'den'; S.life.lvl = 5; S.life.xp = 0;
  S.life.ach = Object.fromEntries(__sw.ACHIEVEMENTS.map(a => [a.id, 1])); __sw.renderAll(); })()"""
# a live Dodgy Den board with its opening dug
DEAL = """(() => { const old = __sw.slots[0]; if (old) { old.over = true; __sw.Game.endBoard(old); }
  __sw.Game.deal(0); const b = __sw.slots[0]; __sw.invoke(new __sw.DigCommand(b, Math.floor(b.t.h / 2) * b.t.w + Math.floor(b.t.w / 2))); return !b.over; })()"""
HIDDEN = "(() => { const b = __sw.slots[0]; let n = 0; for (let i = 0; i < b.n; i++) if (b.mine[i] && !b.open[i] && !b.flag[i]) n++; return n; })()"


async def text(pg, sel):
    return await pg.evaluate(f"(document.querySelector('{sel}') || {{}}).textContent || ''")


async def run(browser, url, shots):
    R = Results('wildcards'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=1200)
    await pg.mouse.click(3, 300)
    await pg.evaluate(SETUP); await pg.wait_for_timeout(200)

    # --- a thunderstorm: distant thunder, then the rain
    await pg.evaluate(DEAL); await pg.wait_for_timeout(200)
    await pg.evaluate("(() => { __sw.Storm.FIRST = .6; __sw.Storm.STRIKE = 0; __sw.WeirdNoises.surprise('thunder'); })()"); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("__sw.Storm.on && !!document.querySelector('.storm')") and 'Thunderstorm' in await text(pg, '.happening b'),
       'distant thunder, then a storm: rain down the window and a card that says to watch for the flashes')
    ok(await pg.evaluate("!__sw.HouseholdView.free()"), 'nothing else happens around the house mid-storm')
    # the first flash lights up the mines
    await pg.evaluate("__sw.StormView.FLASH_MS = 1500"); await pg.wait_for_timeout(500)
    hidden = await pg.evaluate(HIDDEN)
    lit = await pg.evaluate("document.querySelectorAll('.c.lit').length")
    lit_mines = await pg.evaluate("[...document.querySelectorAll('.c.lit')].every(c => __sw.slots[0].mine[+c.dataset.i])")
    ok(hidden > 0 and lit == hidden and lit_mines and await pg.evaluate("!!document.querySelector('.lightning')"),
       f'lightning: for a split second every hidden mine lights up ({lit} of {hidden}), and only the mines')
    await pg.screenshot(path=str(shots / 'storm_flash.png'))
    await pg.wait_for_timeout(1600)
    ok(await pg.evaluate("document.querySelectorAll('.c.lit').length === 0"), 'then they’re hidden again')
    # Lightning Reflexes: flag a mine within two seconds of a flash (not three)
    await pg.evaluate("(() => { delete __sw.S.life.ach.storm; __sw.Storm.lastFlash = Date.now() - 3000; const b = __sw.slots[0]; __sw.Game.toggleFlag(b, b.mine.indexOf(1)); })()")
    late = await pg.evaluate("__sw.Achievements.has('storm')")
    c0, bonus = await pg.evaluate("[__sw.S.coins, __sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === 'storm'))]")
    await pg.evaluate("(() => { __sw.Storm.flash(); const b = __sw.slots[0]; let i = -1; for (let k = 0; k < b.n; k++) if (b.mine[k] && !b.flag[k] && !b.open[k]) { i = k; break; } __sw.Game.toggleFlag(b, i); })()")
    ok(not late and await pg.evaluate("__sw.Achievements.has('storm')") and await pg.evaluate('__sw.S.coins') == c0 + bonus,
       'flag a mine within two seconds of a flash and Lightning Reflexes unlocks (three seconds is too slow)')
    # a strike right overhead takes the power out
    await pg.evaluate("(() => { __sw.Storm.strikeAt = __sw.Storm.flashes + 1; __sw.Storm.flash(); })()"); await pg.wait_for_timeout(700)
    ok(await pg.evaluate("__sw.PowerCut.on && !!document.querySelector('.blackout') && !!document.querySelector('.lightning.strike')"), 'a strike right overhead: a brighter flash, and the power goes')
    await pg.evaluate("__sw.PowerCut.end('reset')"); await pg.wait_for_timeout(200)
    # nobody goes outside in this
    await pg.evaluate("(() => { __sw.HouseholdView.clear(); __sw.OutsideView.open(); })()"); await pg.wait_for_timeout(150)
    ok(await pg.evaluate("!__sw.Outside.on && [...document.querySelectorAll('.toast')].some(t => /chucking it down/.test(t.textContent))"), 'and nobody’s going outside in this')
    # it passes
    await pg.evaluate("__sw.Storm.end()"); await pg.wait_for_timeout(1800)
    ok(await pg.evaluate("!__sw.Storm.on && !document.querySelector('.storm') && [...document.querySelectorAll('.toast')].some(t => /passed/.test(t.textContent))"),
       'the storm passes: the rain stops and the room brightens')
    await pg.evaluate("__sw.Storm.flash()"); await pg.wait_for_timeout(100)
    ok(await pg.evaluate("document.querySelectorAll('.c.lit, .lightning').length === 0"), 'and no more flashes after it’s gone')
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok('Storms' in await text(pg, '#stats'), 'Stats counts the storms')
    await pg.click('[data-tab="shop"]')

    ok(not errs, 'no console errors' + (': ' + '; '.join(errs[:3]) if errs else ''))
    await ctx.close()
    return R
