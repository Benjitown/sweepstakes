"""Tutorial suite: Fuse's walkthrough starts on a fresh save and moves on as you actually do each step."""
from common import Results, open_page


async def run(browser, url, shots):
    R = Results('tutorial'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=1500)
    step = lambda: pg.evaluate('__sw.Coach.i')
    ok(await pg.evaluate('__sw.Coach.active'), 'tutorial starts on a fresh save')
    await pg.screenshot(path=str(shots / 'tut_0_welcome.png'))
    await pg.click('#coachBubble [data-c="next"]'); await pg.wait_for_timeout(400)
    await pg.click('#coachBubble [data-c="next"]'); await pg.wait_for_timeout(400)
    ok(await step() == 2, f'Next moves through the intro (now on step {await step()})')
    await pg.click('#btnSpin'); await pg.wait_for_timeout(500)
    await pg.click('#spinGo'); await pg.wait_for_timeout(5200)
    prize = await pg.evaluate("document.querySelector('#wres').textContent")
    ok(bool(prize.strip()), f'the wheel lands on a prize ("{prize.strip()}")')
    await pg.screenshot(path=str(shots / 'tut_1_wheel.png'))
    await pg.click('#spinGo'); await pg.wait_for_timeout(1200)
    ok(await step() == 3, f'closing the wheel moves on to the stake step (step {await step()})')
    await pg.click('#dealAll'); await pg.wait_for_timeout(1200)
    ok(await step() == 4, f'dealing moves on to the dig step (step {await step()})')
    w = await pg.evaluate('__sw.slots[0].t.w')
    await pg.click(f'#boards [data-slot="0"] .grid .c[data-i="{(w // 2) * w + w // 2}"]', force=True); await pg.wait_for_timeout(1200)
    ok(await step() == 5, f'digging moves on to the score step (step {await step()})')
    await pg.screenshot(path=str(shots / 'tut_2_score.png'))
    await pg.click('#coachBubble [data-c="skip"]'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate('!__sw.Coach.active && __sw.S.life.tut'), 'Skip ends it and remembers')
    ok(not errs, 'no console errors' + (': ' + '; '.join(errs[:3]) if errs else ''))
    await ctx.close()
    return R
