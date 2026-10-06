"""Layout suite: desktop, tablet and phone screenshots of a mid-game state; nothing may overflow sideways."""
from common import Results, open_page

MID_GAME = '''(() => { const S = __sw.S; __sw.Coach.finish(); S.coins = 4.2e8; S.unlocked = ['penny', 'den', 'alley', 'roller'];
  Object.assign(S.upg, { flip: 1, flagBot: 1, boards: 2, sweepBot: 1, goggles: 1 }); S.streak = 4; S.goldNext = 1; S.asc = 0;
  S.addons = [{ id: 'daredevil', paid: 60 }, { id: 'sevens', paid: 130 }, { id: 'eight', paid: 280 }]; S.sel = 'alley';
  S.life.lvl = 14; S.life.xp = 300; __sw.renderAll(); document.querySelector('#dealAll').click();
  setTimeout(() => { for (const b of __sw.slots) if (b) __sw.invoke(new __sw.DigCommand(b, Math.floor(b.t.h / 2) * b.t.w + Math.floor(b.t.w / 2))); }, 200); })()'''
ALL_CHIPS = '''(() => { const S = __sw.S; __sw.Coach.finish(); S.asc = 2; S.streak = 7; S.goldNext = 3; S.life.lvl = 23; S.coins = 4.2e12; __sw.renderAll(); })()'''


async def shot(R, browser, url, shots, name, w, h, setup=None, mobile=False, wait=1200, tutorial=False):
    ctx, pg, errs = await open_page(browser, url, w, h, mobile)
    if not tutorial:
        await pg.evaluate('__sw.Coach.finish()')
    if setup:
        await pg.evaluate(setup); await pg.wait_for_timeout(wait)
    sw, iw = await pg.evaluate('[document.documentElement.scrollWidth, innerWidth]')
    await pg.screenshot(path=str(shots / name))
    R.ok(sw <= iw and not errs, f'{name}: {w}px wide, no sideways scroll ({sw}/{iw})' + (f', errors: {errs[:2]}' if errs else ''))
    if name.startswith('phone_chips'):
        clipped = await pg.evaluate('''(() => { const c = document.querySelector('#chips').getBoundingClientRect();
          return [...document.querySelectorAll('#chips > *')].filter(e => !e.hidden && getComputedStyle(e).display !== 'none')
            .filter(e => { const r = e.getBoundingClientRect(); return r.right > c.right + .5 || r.bottom > c.bottom + .5; }).map(e => e.id); })()''')
        R.ok(not clipped, f'{name}: every header chip fits ({clipped or "none clipped"})')
    await ctx.close()


async def run(browser, url, shots):
    R = Results('layout')
    await shot(R, browser, url, shots, 'desktop.png', 1366, 900, MID_GAME)
    await shot(R, browser, url, shots, 'tablet.png', 1100, 900, MID_GAME)
    await shot(R, browser, url, shots, 'phone.png', 390, 844, MID_GAME, mobile=True)
    await shot(R, browser, url, shots, 'phone_chips_360.png', 360, 640, ALL_CHIPS, mobile=True, wait=300)
    await shot(R, browser, url, shots, 'phone_tutorial.png', 390, 844, None, mobile=True, tutorial=True)
    await shot(R, browser, url, shots, 'phone_wheel.png', 390, 844, "__sw.Coach.finish(); document.querySelector('#btnSpin').click()",
               mobile=True, wait=800, tutorial=True)
    return R
