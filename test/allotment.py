"""Allotment suite: the tab, the seed packets and their prices, planting, growing by the minute of play, ripe (the chip
in the header), picking and the farm shop's price, a whopper (double, and a rosette), slugs (only on growing crops),
a thunderstorm watering the lot, full beds, October pumpkins, the 4 key, Stats, a fresh run, and the phone layout."""
from common import Results, open_page

SETUP = """(() => { __sw.Coach.finish(); const S = __sw.S; S.coins = 50000; S.unlocked = ['penny', 'den']; S.sel = 'den'; S.life.lvl = 5; S.life.xp = 0;
  S.life.ach = Object.fromEntries(__sw.ACHIEVEMENTS.map(a => [a.id, 1])); __sw.renderAll(); })()"""
RIPEN = "(k => { __sw.S.plot[k].at -= 1e5; __sw.Allotment.second(); __sw.AllotmentView.tick(); })"
TOASTS = "[...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | ')"


async def run(browser, url, shots):
    R = Results('allotment'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=1200)
    await pg.mouse.click(3, 300)
    await pg.evaluate(SETUP); await pg.wait_for_timeout(200)

    # --- the tab
    await pg.click('[data-tab="plot"]'); await pg.wait_for_timeout(250)
    ok(await pg.evaluate("document.querySelectorAll('#plot .bed').length === 4 && document.querySelectorAll('#plot .bed.empty').length === 4"), 'the Allotment tab: four empty beds')
    seeds = await pg.evaluate("[...document.querySelectorAll('#plot .seed')].map(b => b.dataset.seed)")
    ok(seeds == ['radish', 'lettuce', 'carrot', 'spuds', 'marrow', 'pumpkin'], f'six seed packets, quickest first {seeds}')
    bad = await pg.evaluate("""(() => { const cap = __sw.TABLES.find(t => t.id === 'den').cap;
      return __sw.CROPS.filter(c => { const cost = __sw.Allotment.cost(c.id), want = c.share * cap;
        return Math.abs(cost - want) > want * .06 || !document.querySelector(`#plot .seed[data-seed="${c.id}"] span`).textContent.length; }).map(c => c.id); })()""")
    ok(not bad, f'a packet costs its share of the top table’s max stake {bad}')
    rate = await pg.evaluate("__sw.CROPS.map(c => (c.x - 1) * c.share / c.mins)")
    ok(all(b > a for a, b in zip(rate, rate[1:])), f'the slower the crop, the better it pays by the minute {[round(r, 4) for r in rate]}')

    # --- planting
    c0 = await pg.evaluate('__sw.S.coins'); cost = await pg.evaluate("__sw.Allotment.cost('radish')")
    await pg.click('#plot .seed[data-seed="radish"]'); await pg.wait_for_timeout(250)
    st = await pg.evaluate("({ c: __sw.S.plot[0] && __sw.S.plot[0].c, coins: __sw.S.coins, txt: document.querySelector('#plot .bed[data-k=\"0\"]').textContent })")
    ok(st['c'] == 'radish' and st['coins'] == c0 - cost and ('2:00 to go' in st['txt'] or '1:59 to go' in st['txt']), f'planting radishes: {cost} for the seeds, ripe in two minutes ({st["txt"].strip()})')
    await pg.evaluate("(() => { __sw.S.plot[0].at = __sw.S.run.time - 50; __sw.Allotment.second(); __sw.AllotmentView.tick(); })()")
    st = await pg.evaluate("({ w: document.querySelector('#plot .bed[data-k=\"0\"] .grow b').style.width, t: document.querySelector('#plot .bed[data-k=\"0\"] small').textContent })")
    ok(41 <= float(st['w'].rstrip('%')) <= 43.5 and st['t'] in ('1:10 to go', '1:09 to go'), f'fifty seconds of play later: {st["w"]} grown, {st["t"]}')
    ok(await pg.evaluate("document.getElementById('plotChip').hidden"), 'no “veg ready” chip yet')

    # --- ripe, and picking
    await pg.evaluate("(() => { __sw.S.run.time += 70; __sw.Allotment.second(); __sw.AllotmentView.tick(); })()"); await pg.wait_for_timeout(200)
    st = await pg.evaluate("({ ripe: !!document.querySelector('#plot .bed.ripe[data-pick=\"0\"]'), chip: !document.getElementById('plotChip').hidden })")
    ok(st['ripe'] and st['chip'], 'two minutes in: ripe, with a Pick button, and the “veg ready” chip in the header')
    await pg.screenshot(path=str(shots / 'allotment.png'))
    c1 = await pg.evaluate('__sw.S.coins')
    await pg.click('#plot .bed.ripe'); await pg.wait_for_timeout(250)
    st = await pg.evaluate("({ coins: __sw.S.coins, life: __sw.S.life.plot, bed: __sw.S.plot[0], chip: !document.getElementById('plotChip').hidden })")
    pay = st['coins'] - c1
    ok(cost * 1.6 * .85 - 1 <= pay <= cost * 1.6 * 1.25 * 2 + 1 and st['life']['picked'] == 1 and st['bed'] is None and not st['chip'],
       f'picked: the farm shop paid {pay} for {cost} of seeds, the bed’s empty again and the chip’s gone')

    # --- a whopper
    await pg.evaluate("(() => { delete __sw.S.life.ach.whopper; window.__whop = null; __sw.bus.on('plot:picked', r => { window.__whop = r; }); __sw.Allotment.rng = () => 0; __sw.Allotment.plant('carrot'); })()")
    paid = await pg.evaluate("__sw.S.plot[0].paid")
    await pg.evaluate(RIPEN + "(0)")
    e2 = await pg.evaluate('__sw.S.life.plot.earned'); r2 = await pg.evaluate('__sw.S.life.plot.rosettes')
    await pg.click('#plot .bed.ripe'); await pg.wait_for_timeout(300)
    st = await pg.evaluate(f"({{ pay: __sw.S.life.plot.earned - {e2}, rosettes: __sw.S.life.plot.rosettes - {r2}, whopper: !!(window.__whop && window.__whop.whopper) }})")
    ok(st['pay'] == round(paid * 2.1 * .85 * 2) and st['rosettes'] == 1 and st['whopper'], f'a whopper pays double ({st["pay"]}) and wins a rosette at the village show')
    ok(await pg.evaluate("__sw.Achievements.has('whopper')"), 'achievement: Best in Show')

    # --- slugs: only on growing crops
    await pg.evaluate("(() => { __sw.Allotment.plant('lettuce', 0); __sw.Allotment.plant('radish', 1); })()")
    await pg.evaluate(RIPEN + "(1)")
    await pg.evaluate("__sw.Allotment.slugs()"); await pg.wait_for_timeout(2300)
    st = await pg.evaluate(f"({{ beds: __sw.S.plot.map(b => b && b.c), slugs: __sw.S.life.plot.slugs, toasts: {TOASTS}, said: [...document.querySelectorAll('#chat .msg')].slice(-3).map(m => m.textContent).join(' | ') }})")
    ok(st['beds'][0] is None and st['beds'][1] == 'radish' and st['slugs'] == 1, f'slugs ate the growing lettuce, not the ripe radishes {st["beds"]}')
    lines = await pg.evaluate("__sw.LINES.plot_slugs.map(l => l[1])")
    ok('Slugs got your lettuce' in st['toasts'] and any(l in st['said'] for l in lines), f'a toast, and someone in the chat feels for you ({st["said"][-90:]})')
    await pg.evaluate("__sw.Allotment.rng = Math.random")

    # --- a thunderstorm waters the lot
    await pg.evaluate("(() => { __sw.Allotment.plant('pumpkin', 0); __sw.Allotment.plant('spuds', 2); })()")
    left0 = await pg.evaluate("[__sw.Allotment.left(0), __sw.Allotment.left(2)]")
    await pg.evaluate("__sw.bus.emit('storm', { on: false, flashes: 0, rainbow: false })"); await pg.wait_for_timeout(1600)
    left1 = await pg.evaluate("[__sw.Allotment.left(0), __sw.Allotment.left(2)]")
    ok(all(120 <= a - b <= 123 for a, b in zip(left0, left1)) and 'watered your allotment' in await pg.evaluate(TOASTS), f'after a thunderstorm everything’s two minutes closer {left0} → {left1}')

    # --- full beds, and short of coins
    await pg.evaluate("__sw.Allotment.plant('radish', 3)")
    await pg.evaluate("document.querySelector('#plot .seed[data-seed=\"carrot\"]').click()"); await pg.wait_for_timeout(200)
    ok('All four beds are planted' in await pg.evaluate(TOASTS), 'all four beds planted: the packets say so')
    await pg.evaluate("(() => { __sw.S.plot = []; __sw.S.coins = 3; __sw.AllotmentView.render(); })()")
    await pg.evaluate("document.querySelector('#plot .seed[data-seed=\"carrot\"]').click()"); await pg.wait_for_timeout(200)
    ok('seeds costs' in await pg.evaluate(TOASTS) and await pg.evaluate("__sw.S.plot.every(b => !b)"), 'short of coins: no seeds')
    await pg.evaluate("(() => { __sw.S.coins = 50000; __sw.renderAll(); })()")

    # --- pumpkins fetch more in October
    await pg.evaluate("(() => { __sw.Seasons.force = 'halloween'; __sw.Allotment.rng = () => .5; __sw.Allotment.plant('pumpkin', 0); })()")
    paid = await pg.evaluate("__sw.S.plot[0].paid")
    await pg.evaluate(RIPEN + "(0)")
    r = await pg.evaluate("__sw.Allotment.pick(0)")
    ok(r['pay'] == round(paid * 3.4 * 1.05 * 1.3), f'October pumpkins fetch 30% more ({r["pay"]} for {paid} of seeds)')
    await pg.evaluate("(() => { __sw.Seasons.force = 'none'; __sw.Allotment.rng = Math.random; })()")

    # --- the shed: a greenhouse, beer traps, two more beds
    await pg.evaluate("(() => { __sw.S.coins = 500000; __sw.S.plot = []; __sw.renderAll(); __sw.AllotmentView.render(); })()")
    costs = await pg.evaluate("Object.fromEntries(['greenhouse', 'traps', 'beds'].map(k => [k, __sw.Allotment.shedCost(k)]))")
    c5 = await pg.evaluate('__sw.S.coins')
    for k in ('greenhouse', 'traps', 'beds'):
        await pg.click(f'#plot [data-shed="{k}"]'); await pg.wait_for_timeout(150)
    st = await pg.evaluate("({ coins: __sw.S.coins, beds: document.querySelectorAll('#plot .bed').length, done: document.querySelectorAll('#plot .shedx.own').length, size: __sw.Allotment.size() })")
    ok(st['coins'] == c5 - sum(costs.values()) and st['beds'] == 6 and st['size'] == 6 and st['done'] == 3, f'the shed: all three bought for {sum(costs.values())}, and there are six beds now')
    await pg.evaluate("__sw.Allotment.plant('radish', 0)")
    ok(await pg.evaluate("__sw.Allotment.left(0)") in (96, 95), 'under glass, radishes take 96 seconds instead of 120')
    await pg.evaluate("(() => { __sw.Allotment.rng = () => .005; __sw.Allotment.slugs(); __sw.Allotment.rng = Math.random; })()")
    ok(await pg.evaluate("!!__sw.S.plot[0]"), 'with beer traps down, a slug roll that would have got it doesn’t')
    await pg.evaluate("(() => { for (let k = 1; k < 6; k++) __sw.Allotment.plant('radish', k); })()")
    await pg.evaluate("document.querySelector('#plot .seed[data-seed=\"carrot\"]').click()"); await pg.wait_for_timeout(150)
    ok('All six beds are planted' in await pg.evaluate(TOASTS), 'all six beds full: the packets say so')

    # --- the 4 key, Stats, a fresh run
    await pg.click('[data-tab="shop"]'); await pg.wait_for_timeout(100)
    await pg.keyboard.press('4'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("!document.getElementById('plot').hidden"), '4 opens the Allotment tab')
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    txt = await pg.evaluate("document.getElementById('stats').textContent")
    ok('The allotment3 picked' in txt and 'rosette' in txt, 'Stats: what you’ve picked, and your rosette')
    await pg.evaluate("(() => { __sw.Allotment.plant('radish', 0); __sw.Game.resetRun(); })()"); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("__sw.S.plot.every(b => !b) && __sw.S.life.plot.picked === 3 && __sw.Allotment.size() === 4"), 'a fresh run: four empty beds and an empty shed, but your all-time numbers stay')

    # --- the phone: the beds and packets fit
    pctx, pp, perrs = await open_page(browser, url, width=360, height=780, mobile=True, wait=1200)
    await pp.evaluate(SETUP)
    await pp.evaluate("(() => { __sw.Allotment.plant('radish', 0); __sw.Allotment.plant('pumpkin', 1); __sw.S.plot[0].at -= 1e5; __sw.Allotment.second(); __sw.Tabs ? 0 : 0; })()")
    await pp.evaluate("document.querySelector('[data-tab=\"plot\"]').click()"); await pp.wait_for_timeout(300)
    await pp.evaluate("document.getElementById('plot').scrollIntoView()"); await pp.wait_for_timeout(200)
    sw = await pp.evaluate("[document.documentElement.scrollWidth, innerWidth]")
    ok(sw[0] <= sw[1], f'phone: the allotment fits without sideways scrolling {sw}')
    await pp.screenshot(path=str(shots / 'phone_allotment.png'))
    await pctx.close()

    ok(not errs and not perrs, f'no console errors {(errs + perrs)[:3]}')
    await ctx.close()
    return R
