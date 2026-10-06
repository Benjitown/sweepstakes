"""v4.3 suite: around the house (the door, the phone, the kitten, the smoke detector, burnt toast, the raffle),
the duck race, the rude chat switch and the new achievements."""
from common import Results, open_page

CLEAR = '__sw.HouseholdView.clear()'


async def text(pg, sel):
    return await pg.evaluate(f"(document.querySelector('{sel}') || {{}}).textContent || ''")


async def run(browser, url, shots):
    R = Results('household'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=1200)
    await pg.mouse.click(3, 300)
    # level 5 with no XP: nothing below levels up, so the only extra coins are the achievements this suite unlocks
    await pg.evaluate("(() => { __sw.Coach.finish(); __sw.S.coins = 50000; __sw.S.life.ach = {}; __sw.S.addons = []; __sw.S.life.lvl = 5; __sw.S.life.xp = 0; __sw.renderAll(); })()")
    await pg.wait_for_timeout(200)

    # --- a knock at the door: a card asks, answering it resolves it, and only one thing happens at a time
    await pg.evaluate("__sw.WeirdNoises.surprise('knock')"); await pg.wait_for_timeout(300)
    ok('at the door' in await text(pg, '.happening b'), 'a knock brings up “Someone’s at the door”')
    await pg.evaluate("__sw.WeirdNoises.surprise('phone')"); await pg.wait_for_timeout(100)
    ok(await pg.evaluate("document.querySelectorAll('.happening').length") == 1 and 'at the door' in await text(pg, '.happening b'),
       'the phone doesn’t barge in while the door is waiting')
    n = await pg.evaluate('(__sw.S.life.house || {}).door || 0')
    await pg.click('.happening [data-h="0"]'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate('__sw.S.life.house.door') == n + 1 and 'at the door' not in await text(pg, '.happening b'),
       f"answering shows who it was: “{await text(pg, '.happening b')}”")
    await pg.screenshot(path=str(shots / 'house_door.png'))

    # --- outcomes do what they say
    idx = lambda title: f"__sw.DOOR.findIndex(o => o.title.startsWith('{title}'))"
    nan = await pg.evaluate(f"(() => {{ {CLEAR}; const c = __sw.S.coins; __sw.Household.answerDoor({idx('It’s Nan')}); return __sw.S.coins - c; }})()")
    ok(nan > 0 and str(f'{nan:,}') in await text(pg, '.happening p'), f'Nan slips you {nan:,} (and the card says so)')
    took = await pg.evaluate(f"(() => {{ {CLEAR}; const c = __sw.S.coins; __sw.Household.answerDoor({idx('The bailiffs')}); return c - __sw.S.coins; }})()")
    ok(took > 0, f'the bailiffs take {took:,}')
    left = await pg.evaluate(f"(() => {{ {CLEAR}; __sw.S.coins = 31; __sw.Household.answerDoor({idx('The bailiffs')}); return __sw.S.coins; }})()")
    ok(left >= 30, f'…but bad luck never takes you near bust (31 → {left})')
    cards = await pg.evaluate(f"(() => {{ {CLEAR}; __sw.S.coins = 50000; __sw.S.addons = []; __sw.Household.answerDoor({idx('A parcel')}); return __sw.S.addons.length; }})()")
    ok(cards == 1 and ' card' in await text(pg, '.happening p'),
       f"the parcel brings an add-on card: “{(await text(pg, '.happening p'))[:60]}…”")
    sh = await pg.evaluate(f"(() => {{ {CLEAR}; const s = __sw.S.inv.shield; __sw.Household.answerDoor({idx('A vicar')}); return __sw.S.inv.shield - s; }})()")
    ok(sh == 1, 'the vicar, the rabbi and the imam bless you with a shield')

    # --- the raffle kid: a ticket costs 10% of your top table's max stake, and one in eight wins ten times that
    await pg.evaluate(f"(() => {{ {CLEAR}; __sw.Household.answerDoor({idx('A kid selling')}); }})()"); await pg.wait_for_timeout(100)
    ok('ticket' in (await text(pg, '.happening .hbtns')).lower(), 'the raffle kid offers a ticket')
    reward = "(id => __sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === id)))"
    net, cost, bonus = await pg.evaluate(f"(() => {{ const c = __sw.S.coins, cost = __sw.Household.raffleCost(), bonus = {reward}('raffle'); __sw.Household.raffle(true); return [__sw.S.coins - c, cost, bonus]; }})()")
    ok(net == 9 * cost + bonus and await pg.evaluate("__sw.Achievements.has('raffle')"), f'a winning ticket pays 10 × {cost} (net +{net - bonus}) and unlocks Fixed the Roof (+{bonus})')
    net = await pg.evaluate(f"(() => {{ {CLEAR}; const c = __sw.S.coins; __sw.Household.raffle(false); return __sw.S.coins - c; }})()")
    ok(net == -cost and 'Not a winner' in await text(pg, '.happening b'), 'a losing ticket costs just the ticket')

    # --- ignoring things
    await pg.evaluate(f"(() => {{ {CLEAR}; __sw.WeirdNoises.surprise('phone'); }})()"); await pg.wait_for_timeout(200)
    await pg.click('.happening [data-h="1"]'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("!document.querySelector('.happening') && document.querySelectorAll('.toast').length > 0"), 'letting the phone ring: the card goes and a toast says what you missed')

    # --- burnt toast: wave a tea towel at the smoke alarm
    await pg.evaluate(f"(() => {{ {CLEAR}; __sw.WeirdNoises.surprise('alarm'); }})()"); await pg.wait_for_timeout(200)
    ok('toast' in await text(pg, '.happening b'), 'the smoke alarm going off means someone burnt the toast')
    c0 = await pg.evaluate('__sw.S.coins')
    await pg.click('.happening [data-h="0"]'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate('__sw.S.coins') > c0 and await pg.evaluate('__sw.S.life.house.toast') == 1, 'the tea towel saves the house (and the crumb tray pays)')

    # --- the kitten
    await pg.evaluate(f"(() => {{ {CLEAR}; __sw.WeirdNoises.surprise('kittens'); }})()"); await pg.wait_for_timeout(1500)
    ok(await pg.evaluate("!!document.querySelector('.kitten')"), 'mewing means a kitten wanders across the bottom of the screen')
    await pg.screenshot(path=str(shots / 'house_kitten.png'))
    await pg.evaluate("document.querySelector('.kitten').click()"); await pg.wait_for_timeout(400)
    ok(await pg.evaluate("__sw.Achievements.has('kitten') && !!document.querySelector('.kitten.pet') && !!document.querySelector('.happening')"),
       'petting it: a purr, hearts, a present and Cat Person')
    await pg.evaluate("document.querySelector('.kitten').click()"); await pg.wait_for_timeout(100)
    ok(await pg.evaluate('__sw.S.life.house.kitten') == 1, 'one pet per kitten')

    # --- the smoke detector: chirps until you change the battery
    await pg.evaluate(f"(() => {{ {CLEAR}; __sw.WeirdNoises.surprise('smoke'); }})()"); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("!document.querySelector('#chirpChip').hidden && __sw.WeirdNoises.chirping"), 'the low-battery chirp puts a “Change the battery” chip in the run panel')
    await pg.evaluate("__sw.Household.changeBattery(false)"); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("__sw.WeirdNoises.chirping") and 'fell' in await text(pg, '.happening b'), 'fall off the chair and it keeps chirping')
    await pg.evaluate(f"(() => {{ {CLEAR}; __sw.Household.changeBattery(true); }})()"); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("!__sw.WeirdNoises.chirping && document.querySelector('#chirpChip').hidden && __sw.Achievements.has('battery')"),
       'a new battery: silence, the chip goes, DIY Hero')

    # --- never while a window is open
    await pg.evaluate(f"(() => {{ {CLEAR}; __sw.Keys.help(); for (let i = 0; i < 40; i++) __sw.bus.emit('noise:due'); __sw.WeirdNoises.stopChirping(); }})()")
    await pg.wait_for_timeout(200)
    ok(await pg.evaluate("!document.querySelector('.happening') && !document.querySelector('.kitten')"), '40 random noises with a window open: nobody knocks, no kitten')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)

    # --- the duck race: R opens it (out back of the Flip Booth)
    await pg.evaluate(f"(() => {{ {CLEAR}; __sw.S.upg.flip = 1; __sw.S.coins = 10000; __sw.renderAll(); document.activeElement && document.activeElement.blur(); }})()")
    await pg.keyboard.press('r'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("document.querySelectorAll('#modalBox .lane').length") == 5, 'R opens the duck race: five ducks in five lanes')
    odds = await pg.evaluate('__sw.DuckRace.card.map(d => [d.p, d.pay])')
    ok(abs(sum(p for p, _ in odds) - 1) < 1e-9 and all(pay * p <= .95 + 1e-9 or pay == 1.2 for p, pay in odds),
       'the bookie keeps 5%: every duck pays a bit under its fair odds (' + ', '.join(f'×{pay}' for _, pay in odds) + ')')
    await pg.screenshot(path=str(shots / 'duck_card.png'))
    # back lane 0 and fix the draw so lane 0 wins
    await pg.click('#modalBox .lane[data-lane="0"]'); await pg.fill('#duckBet', '1000')
    pay = odds[0][1]
    bonus = await pg.evaluate(f"{reward}('duck') + ({pay} >= 8 ? {reward}('longshot') : 0)")
    await pg.evaluate("Math._r = Math.random; Math.random = () => 0")
    await pg.click('#duckGo')
    await pg.evaluate("Math.random = Math._r")
    mid = await pg.evaluate("[__sw.S.coins, __sw.S.duckOwed]")
    ok(mid[0] == 9000 and mid[1] == int(1000 * pay), f'the bet leaves at once (10,000 → {mid[0]:,}); the {mid[1]:,} winnings wait for the line')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(1300)
    ok(await pg.evaluate("document.querySelectorAll('#modalBox .lane').length") == 5, 'Escape can’t walk out on a race')
    await pg.screenshot(path=str(shots / 'duck_race.png'))
    await pg.wait_for_timeout(6200)
    res = await text(pg, '#duckRes')
    ok(await pg.evaluate('__sw.S.coins') == 9000 + int(1000 * pay) + bonus and 'wins!' in res and await pg.evaluate("__sw.Achievements.has('duck')"),
       f'your duck wins at ×{pay}: paid {int(1000 * pay):,}, Quack Addict unlocked (“{res[:40]}”)')
    ok(await pg.evaluate("document.querySelectorAll('#modalBox .place').length") == 5, 'every lane gets its place, 1st to 5th')
    await pg.screenshot(path=str(shots / 'duck_done.png'))
    # next race; back the outsider in lane 4 and fix the draw against it
    await pg.click('#duckGo'); await pg.wait_for_timeout(200)
    await pg.click('#modalBox .lane[data-lane="4"]'); await pg.fill('#duckBet', '500')
    c0 = await pg.evaluate('__sw.S.coins')
    await pg.evaluate("Math._r = Math.random; Math.random = () => 0"); await pg.click('#duckGo'); await pg.evaluate("Math.random = Math._r")
    await pg.wait_for_timeout(7600)
    ok(await pg.evaluate('__sw.S.coins') == c0 - 500 and 'came 5th' in await text(pg, '#duckRes'), 'back a loser and the bet is gone')
    # leave mid-race (reload): the winnings still arrive
    await pg.click('#duckGo'); await pg.wait_for_timeout(200)
    await pg.click('#modalBox .lane[data-lane="0"]'); await pg.fill('#duckBet', '100')
    pay = await pg.evaluate('__sw.DuckRace.card[0].pay')
    c0 = await pg.evaluate('__sw.S.coins')
    await pg.evaluate("Math._r = Math.random; Math.random = () => 0"); await pg.click('#duckGo'); await pg.evaluate("Math.random = Math._r")
    await pg.wait_for_timeout(300)
    await pg.reload(); await pg.wait_for_timeout(1300)
    ok(await pg.evaluate('__sw.S.coins') == c0 - 100 + int(100 * pay) and not await pg.evaluate('__sw.S.duckOwed'),
       'leave mid-race and the winnings land on your next visit')

    # --- the Flip Booth tabs switch between the coin flip and the ducks
    await pg.evaluate("(() => { __sw.Coach.finish(); __sw.S.upg.flip = 1; __sw.renderAll(); })()")
    await pg.click('#btnFlip'); await pg.wait_for_timeout(300)
    await pg.click('#modalBox [data-booth="ducks"]'); await pg.wait_for_timeout(200)
    ducks = await pg.evaluate("!!document.querySelector('#modalBox .pond')")
    await pg.click('#modalBox [data-booth="flip"]'); await pg.wait_for_timeout(200)
    ok(ducks and await pg.evaluate("!!document.querySelector('#flipGo')"), 'the booth’s tabs go coin flip ⇄ duck race')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)

    # --- rude chat: on by default, and the switch in Stats keeps the rude lines out
    ok(await pg.evaluate("__sw.S.rude !== false"), 'rude chat is on by default')
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    await pg.click('#tg-rude'); await pg.wait_for_timeout(100)
    said = await pg.evaluate("""(async () => { const C = __sw.Chat, post = C.post, got = []; C.post = (w, t) => got.push(t);
      for (let i = 0; i < 80; i++) { C.busyUntil = 0; C.lastLine = ''; C.say('boom', { stake: '1' }, 1); }
      await new Promise(r => setTimeout(r, 1200)); C.post = post; return got; })()""")
    rude = await pg.evaluate("__sw.RUDE.boom.map(l => l[1])")
    ok(await pg.evaluate('__sw.S.rude') is False and said and not any(t in rude for t in said), f'with Rude chat off, {len(said)} boom lines and none of them rude')
    await pg.click('#tg-rude'); await pg.wait_for_timeout(100)
    said = await pg.evaluate("""(async () => { const C = __sw.Chat, post = C.post, got = []; C.post = (w, t) => got.push(t);
      for (let i = 0; i < 120; i++) { C.busyUntil = 0; C.lastLine = ''; C.say('boom', { stake: '1' }, 1); }
      await new Promise(r => setTimeout(r, 1200)); C.post = post; return got; })()""")
    ok(any(t in rude for t in said), 'switched back on, the rude ones come back')

    n = await pg.evaluate('__sw.ACHIEVEMENTS.length')
    ok(await pg.evaluate("document.querySelectorAll('#stats .ach').length") == n >= 45, f'Stats shows all {n} badges')
    ok(not errs, 'no console errors' + (': ' + '; '.join(errs[:3]) if errs else ''))
    await ctx.close()
    return R
