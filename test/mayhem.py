"""Mayhem suite (experimental): the seagull after your coins, power cuts, Nan's bingo, touching grass."""
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

    # --- Nan's bingo: the tickets are proper 90-ball tickets
    bad = await pg.evaluate("""(() => { let bad = 0;
      for (let i = 0; i < 300; i++) { const t = __sw.makeTicket(), nums = t.flat().filter(Boolean);
        if (nums.length !== 15 || new Set(nums).size !== 15 || t.some(r => r.filter(Boolean).length !== 5)) bad++;
        for (let c = 0; c < 9; c++) { const col = [0, 1, 2].map(r => t[r][c]).filter(Boolean), lo = c ? c * 10 : 1, hi = c === 8 ? 90 : c * 10 + 9;
          if (!col.length || col.some((n, k) => n < lo || n > hi || (k && n <= col[k - 1]))) bad++; } }
      return bad; })()""")
    ok(bad == 0, '300 tickets: 15 numbers, 5 a row, every column used, each in its own decade and sorted top to bottom')
    odds = await pg.evaluate("""(() => { const n = 6000, h = [0, 0, 0, 0], all = [...Array(90)].map((_, k) => k + 1);
      for (let i = 0; i < n; i++) { const c = all.slice().sort(() => Math.random() - .5).slice(0, __sw.BINGO_CALLS); h[__sw.Bingo.score(__sw.makeTicket(), c).lines]++; }
      return h.map(x => x / n); })()""")
    house = 1
    for i in range(15): house *= (60 - i) / (90 - i)
    rtp = odds[1] * 1.5 + odds[2] * 5 + house * 250
    ok(.24 < odds[1] < .35 and .02 < odds[2] < .055 and .86 < rtp < .99,
       f'60 calls: a line {odds[1]:.1%}, two lines {odds[2]:.1%}, a full house 1 in {1 / house:.0f}; it pays back about {rtp:.0%}')
    # the shelf (the booth's Bingo tab) and buying a ticket
    await pg.evaluate("(() => { __sw.Coach.finish(); __sw.S.coins = 50000; __sw.S.upg.flip = 1; __sw.S.nanvoice = false; __sw.renderAll(); })()")
    await pg.click('#btnFlip'); await pg.wait_for_timeout(300)
    await pg.click('#modalBox [data-booth="bingo"]'); await pg.wait_for_timeout(300)
    prices = await pg.evaluate("[...document.querySelectorAll('#modalBox .bticket .num')].map(e => e.textContent)")
    ok(prices == ['20', '100', '500'], f'the booth’s Bingo tab sells three tickets: {prices}')
    await pg.screenshot(path=str(shots / 'bingo_shelf.png'))
    c0 = await pg.evaluate('__sw.S.coins')
    await pg.click('#modalBox .bticket[data-kind="proper"]'); await pg.wait_for_timeout(300)
    g = await pg.evaluate("(() => { const g = __sw.Bingo.game; return { price: g.price, prize: g.prize, lines: g.lines, owed: __sw.S.bingoOwed, nums: document.querySelectorAll('#modalBox .bn').length }; })()")
    ok(await pg.evaluate('__sw.S.coins') == c0 - 100 and g['nums'] == 15 and g['owed'] == g['prize'], f"a Proper Bingo ticket costs 100 and shows its 15 numbers (this one: {['nothing', 'a line', 'two lines', 'a full house'][g['lines']]})")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("!!document.querySelector('#modalBox .bcard')"), 'Escape can’t walk out on Nan mid-game')
    await pg.wait_for_timeout(1500)
    ok(await pg.evaluate("__sw.BingoView.st.k >= 1 && document.querySelectorAll('#modalBox .trail i').length >= 0 && /Call [1-9]/.test(document.querySelector('#bCount').textContent)"), 'Nan starts calling')
    await pg.screenshot(path=str(shots / 'bingo_calling.png'))
    await pg.evaluate("(() => { __sw.BingoView.FAST_MS = 15; })()")
    await pg.click('#bingoFast'); await pg.wait_for_timeout(2000)
    daubed = await pg.evaluate("[...document.querySelectorAll('#modalBox .bn.daub')].map(e => +e.dataset.n).sort((a, b) => a - b).join()")
    want = await pg.evaluate("(() => { const g = __sw.BingoView.st.g; return g.ticket.flat().filter(n => n && g.calls.includes(n)).sort((a, b) => a - b).join(); })()")
    ok(daubed == want and await pg.evaluate("__sw.BingoView.st.done"), f'“Hurry up, Nan” rattles through the rest; exactly the called numbers get dabbed ({len(want.split(",")) if want else 0})')
    ok(await pg.evaluate('__sw.S.coins') == c0 - 100 + g['prize'] and not await pg.evaluate('__sw.S.bingoOwed'), f"the result pays what it said it would (+{g['prize']:,})")
    # a fixed full house: the ticket's numbers come up early
    await pg.evaluate("(() => { delete __sw.S.life.ach.house; delete __sw.S.life.ach.bingo; })()")
    c0, bonus = await pg.evaluate(f"[__sw.S.coins, {reward}('house') + {reward}('bingo')]")
    await pg.evaluate("""(() => { const g = __sw.Bingo.buy('proper'), nums = g.ticket.flat().filter(Boolean), rest = [...Array(90)].map((_, k) => k + 1).filter(n => !nums.includes(n));
      g.calls = [...rest.slice(0, 20), ...nums, ...rest.slice(20, 45)]; Object.assign(g, __sw.Bingo.score(g.ticket, g.calls));
      const prize = Math.floor(g.price * g.x); __sw.S.bingoOwed += prize - g.prize; g.prize = prize; __sw.BingoView.FAST_MS = 15; __sw.BingoView.play(g); })()""")
    await pg.click('#bingoFast'); await pg.wait_for_timeout(2200)
    res = await text(pg, '#bingoRes')
    ok(await pg.evaluate('__sw.S.coins') == c0 - 100 + 25000 + bonus and 'Full house' in res, f'a full house pays ×250 (+25,000): “{res[:40]}”')
    ok(await pg.evaluate("__sw.Achievements.has('house') && __sw.Achievements.has('bingo') && document.querySelectorAll('#modalBox .bn.lined').length === 15"),
       'every number goes gold, and Eyes Down and Full House unlock')
    await pg.screenshot(path=str(shots / 'bingo_house.png'))
    # leave mid-game (reload): the winnings still arrive
    await pg.evaluate("""(() => { const g = __sw.Bingo.buy('penny'), nums = g.ticket[0].filter(Boolean), rest = [...Array(90)].map((_, k) => k + 1).filter(n => !g.ticket.flat().includes(n));
      g.calls = [...nums, ...rest.slice(0, 55)]; Object.assign(g, __sw.Bingo.score(g.ticket, g.calls)); const prize = Math.floor(g.price * g.x);
      __sw.S.bingoOwed += prize - g.prize; g.prize = prize; __sw.SaveGame.saveNow(); __sw.BingoView.play(g); })()""")
    c0, owed = await pg.evaluate("[__sw.S.coins, __sw.S.bingoOwed]")
    await pg.reload(); await pg.wait_for_timeout(1300)
    ok(owed == 30 and await pg.evaluate('__sw.S.coins') == c0 + 30 and not await pg.evaluate('__sw.S.bingoOwed'), 'leave with a line on the way and it pays on your next visit (×1.5 of 20)')
    # Nan's invite in the chat, and B for bingo
    await pg.evaluate("(() => { __sw.Coach.finish(); __sw.S.upg.flip = 1; __sw.S.coins = 50000; __sw.renderAll(); __sw.bus.emit('bingo:due'); })()"); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("!!document.querySelector('#chat .msg.invite .qopt')"), 'now and then Nan invites the chat to bingo')
    await pg.click('#chat .msg.invite .qopt'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("document.querySelectorAll('#modalBox .bticket').length === 3"), 'and her button opens the bingo hall')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    await pg.evaluate("document.activeElement && document.activeElement.blur()"); await pg.keyboard.press('b'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("document.querySelectorAll('#modalBox .bticket').length === 3"), 'B opens it too')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok('Nan’s bingo' in await text(pg, '#stats') and await pg.evaluate("!!document.querySelector('#tg-nanvoice')"), 'Stats shows your bingo record and the “Nan reads the bingo” switch')

    # --- touching grass: a live board with a mine the Flag Goblin could prove (the goblin's off while we deal)
    found = await pg.evaluate("""(() => { const S = __sw.S; S.coins = 50000; S.upg.flagBot = 0; S.life.lvl = 5; S.life.xp = 0; delete S.life.ach.grass; __sw.renderAll();
      for (let k = 0; k < 25; k++) {
        const old = __sw.slots[0]; if (old) { old.over = true; __sw.Game.endBoard(old); }
        __sw.Game.deal(0); const b = __sw.slots[0]; __sw.invoke(new __sw.DigCommand(b, Math.floor(b.t.h / 2) * b.t.w + Math.floor(b.t.w / 2)));
        if (b.over) continue;
        const d = __sw.Solver.forBots(b); for (let i = 0; i < b.n; i++) if (d.KM[i] && !b.flag[i] && !b.open[i]) return true;
      }
      return false; })()""")
    snap = "(() => { const b = __sw.slots[0]; return [b.flag.reduce((a, x) => a + x, 0), b.revealed, __sw.S.run.time]; })()"
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    await pg.click('#btnGrass'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("__sw.Outside.on && !!document.querySelector('#modalBox .park') && /outside/.test(document.querySelector('#modalBox h3').textContent)"),
       'Stats → “Go outside”: off to the park')
    await pg.evaluate("(() => { __sw.S.upg.flagBot = 1; window._odd = 0; __sw.bus.on('odd', () => { window._odd++; }); })()")
    before = await pg.evaluate(snap)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(2300)
    ok(await pg.evaluate("!!document.querySelector('#modalBox .park')"), 'Escape doesn’t bring you back in')
    after = await pg.evaluate(snap)
    ok(found and before == after, f'the game waits: the clock stops and the Flag Goblin downs tools (flags, cells, seconds: {before} → {after})')
    await pg.evaluate("__sw.bus.emit('noise:due')")
    ok(await pg.evaluate("window._odd === 0"), 'and the house is quiet while you’re out')
    bar = await pg.evaluate("parseFloat(document.querySelector('#grassBar').style.width)")
    ok(0 < bar < 5 and 'fresh air bonus' in await text(pg, '#grassLeft'), f'the bar creeps up to the fresh air bonus ({bar}%: “{(await text(pg, "#grassLeft"))[:44]}”)')
    await pg.screenshot(path=str(shots / 'grass_park.png'))
    # back in early: no bonus, and everyone carries on
    c0 = await pg.evaluate('__sw.S.coins')
    await pg.click('#grassIn'); await pg.wait_for_timeout(250)
    early = await pg.evaluate(f"[__sw.UI.modalClosed(), __sw.Outside.on, [...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | '), __sw.S.coins - {c0}, __sw.Achievements.has('grass')]")
    ok(early[0] and not early[1] and 'doesn’t count' in early[2] and early[3] == 0 and not early[4], f'back in early: no bonus (“{early[2][:60]}”)')
    await pg.wait_for_timeout(1350)
    back = await pg.evaluate(snap)
    ok(back[0] > after[0] and back[2] > after[2], f'the goblin picks his flags back up and the clock runs again ({after} → {back})')
    # the whole break (shortened here): the bonus, and Touched Grass
    await pg.evaluate("(() => { __sw.Outside.SECONDS = 1; delete __sw.S.life.ach.grass; __sw.S.life.xp = 0; document.activeElement && document.activeElement.blur(); })()")
    c0, bonus, extra = await pg.evaluate(f"[__sw.S.coins, __sw.Outside.bonus(), {reward}('grass')]")
    await pg.keyboard.press('g'); await pg.wait_for_timeout(1700)
    ok(await pg.evaluate('__sw.S.coins') == c0 + bonus + extra and 'That’s better' in await text(pg, '#modalBox h3') and bonus in (10, 300),
       f'G goes outside, and staying out the whole time pays the fresh air bonus (+{bonus:,})')
    ok(await pg.evaluate("__sw.Achievements.has('grass') && __sw.S.life.outside.full === 1 && __sw.S.life.outside.breaks === 2"), 'and unlocks Touched Grass')
    await pg.screenshot(path=str(shots / 'grass_back.png'))
    await pg.click('#modalBox [data-a="in"]'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate('__sw.UI.modalClosed()'), '“Go back in”')
    # Nan's nudge after an hour in one sitting
    await pg.evaluate("(() => { __sw.Outside.SECONDS = 180; __sw.Outside.session = 100; __sw.Outside.tick(); })()")
    n0 = await pg.evaluate("document.querySelectorAll('#chat .msg.invite').length")
    await pg.evaluate("(() => { __sw.Outside.session = __sw.Outside.NUDGE_AFTER - 1; __sw.Outside.tick(); })()"); await pg.wait_for_timeout(200)
    last = "[...document.querySelectorAll('#chat .msg.invite')].pop()"
    ok(n0 == await pg.evaluate("document.querySelectorAll('#chat .msg.invite').length") - 1 and 'Go outside' in await pg.evaluate(f"{last}.querySelector('.qopt').textContent"),
       'an hour in, Nan tells you to get some fresh air (not before)')
    await pg.locator('#chat .msg.invite').last.locator('.qopt').click(); await pg.wait_for_timeout(300)
    ok(await pg.evaluate(f"__sw.Outside.on && !!document.querySelector('#modalBox .park') && {last}.querySelector('.qopt').disabled"), 'and her button sends you outside')
    await pg.click('#grassIn'); await pg.wait_for_timeout(300)
    await pg.click('[data-tab="shop"]'); await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok('Touched grass' in await text(pg, '#stats') and '3 times (1 for the full 3 minutes)' in await text(pg, '#stats'), 'Stats counts the breaks (and the proper ones)')

    ok(not errs,'no console errors' + (': ' + '; '.join(errs[:3]) if errs else ''))
    await ctx.close()
    return R
