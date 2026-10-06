"""Wildcards suite (experimental): thunderstorms (the rain, lightning that shows the mines, a strike that takes the
power out, Lightning Reflexes) and KEVCOIN (the launch, the ticker, buying and selling with Kev's cut, the cap, hype
pumps, the rug pull and the relaunch, and whether holding it loses money on average) and the ice cream van (the
drive-by, a cone, the sugar rush on the next winning cash-out) Nan's stars (your sign, the daily reading, the lucky
number's ×1.25) the Banker (deal, no deal, beating his offer) and Biscuit
the dog (a biscuit, a flagged mine)."""
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

    # --- KEVCOIN: nothing until Kev launches it
    ok(await pg.evaluate("document.querySelector('#kevTicker').hidden && !__sw.Kev.launched()"), 'no KEVCOIN ticker before Kev launches it')
    await pg.evaluate("document.activeElement && document.activeElement.blur()"); await pg.keyboard.press('k'); await pg.wait_for_timeout(150)
    ok(await pg.evaluate("__sw.UI.modalClosed() && [...document.querySelectorAll('.toast')].some(t => /launched his coin/.test(t.textContent))"), 'K before the launch: Kev hasn’t made it yet')
    await pg.evaluate("(() => { __sw.Chat.busyUntil = 0; __sw.Kev.launch(); })()"); await pg.wait_for_timeout(1300)
    ok(await pg.evaluate("!document.querySelector('#kevTicker').hidden && /KEV/.test(document.querySelector('#kevTicker').textContent)")
       and await pg.evaluate("[...document.querySelectorAll('#chat .msg')].some(m => /KEVCOIN/.test(m.textContent))"), 'Kev launches it in the chat, and its ticker appears in the chat’s header')
    # buying and selling: Kev keeps 5% each way
    await pg.evaluate("(() => { __sw.KEV.VOL = 0; __sw.KEV.DRIFT = 0; __sw.KEV.RUG = 0; __sw.S.kev.price = 1; __sw.S.kev.hist = [1]; __sw.S.kev.nextHype = 1e9; })()")
    await pg.click('#kevTicker'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("!!document.querySelector('#kevChart polyline').getAttribute('points')") and await text(pg, '#kevPrice') == '1.00', 'the ticker opens the KEVCOIN window: price, chart, holding')
    c0, buy = await pg.evaluate("[__sw.S.coins, Math.round(__sw.Kev.cap() / 20)]")  # the small Buy button: a tenth of the top table's max stake
    await pg.click('[data-buy="0"]'); await pg.wait_for_timeout(150)
    k = await pg.evaluate("[__sw.S.kev.units, __sw.S.kev.paid, __sw.S.coins]")
    ok(abs(k[0] - buy * .95) < 1e-6 and k[1] == buy and k[2] == c0 - buy, f'Buy {buy:,} at 1.00 gets {buy * .95:,.0f} KEV: Kev keeps 5%')
    await pg.evaluate("(() => { __sw.S.kev.price = 2.5; __sw.Kev.record(__sw.S.kev); delete __sw.S.life.ach.moon; })()")
    c0, bonus = await pg.evaluate("[__sw.S.coins, __sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === 'moon'))]")
    ok('break even at 1.11' in await text(pg, '#kevPaid') and f'{int(buy * .95 * 2.5):,}' in await text(pg, '#kevValue'),
       f"it shows what that’s worth and where you’d break even (“{await text(pg, '#kevPaid')}”)")
    await pg.click('[data-sell="1"]'); await pg.wait_for_timeout(200)
    got = int(buy * .95 * 2.5 * .95)
    ok(await pg.evaluate('__sw.S.coins') == c0 + got + bonus and await pg.evaluate("__sw.S.kev.units === 0 && __sw.Achievements.has('moon')"),
       f'up to 2.50, Sell all pays {got:,} (less Kev’s 5% again): over twice what it cost, so To the Moon unlocks')
    # the cap: Kev's exchange won't let you hold more than twice the top table's max stake
    await pg.evaluate("(() => { __sw.S.kev.price = 1; __sw.S.coins = 200000; __sw.Game.setCoins(__sw.S.coins); __sw.KevView.update(); })()")
    for _ in range(2):
        await pg.click('[data-buy="2"]'); await pg.wait_for_timeout(120)
    held = await pg.evaluate("[__sw.Kev.value(), __sw.Kev.cap()]")
    ok(held[1] - 2 <= held[0] <= held[1] and await pg.evaluate("[...document.querySelectorAll('[data-buy]')].every(b => b.disabled)") and 'the most' in await text(pg, '#kevNote'),
       f'you can hold up to {held[1]:,} worth, and no more')
    # a hype post: nothing moves on the tick he posts, then (here) a pump: up, then half of it back
    await pg.evaluate("(() => { __sw.Kev.rng = () => .1; __sw.Chat.busyUntil = 0; __sw.S.kev.nextHype = __sw.S.kev.ticks + 1; __sw.Kev.tick(); })()"); await pg.wait_for_timeout(1200)
    path = await pg.evaluate("[__sw.S.kev.hype, __sw.S.kev.price, __sw.S.kev.path.length]")
    ok(path[0] == 'pump' and abs(path[1] - 1) < 1e-9 and await pg.evaluate("document.querySelector('#kevTicker').classList.contains('hype')")
       and await pg.evaluate("[...document.querySelectorAll('#chat .msg')].some(m => __sw.LINES.kev_hype.some(([, t]) => m.textContent.includes(t)))"),
       'Kev hypes it in the chat (the ticker flashes); the price hasn’t moved yet')
    peak = await pg.evaluate("(() => { for (let i = 0; i < 5; i++) __sw.Kev.tick(); return __sw.S.kev.price; })()")
    end = await pg.evaluate("(() => { for (let i = 0; i < 5; i++) __sw.Kev.tick(); return __sw.S.kev.price; })()")
    ok(abs(peak - 1.345) < 1e-6 and abs(end - 1.345 ** .5) < 1e-6, f'the pump climbs to {peak:.3f}, then gives half of it back ({end:.3f})')
    # the rug pull: the price goes to 2%, trading stops, and a while later it's relaunched without your coins
    await pg.evaluate("(() => { delete __sw.S.life.ach.rugged; __sw.Chat.busyUntil = 0; __sw.Kev.rug(); })()"); await pg.wait_for_timeout(500)
    ok(await pg.evaluate("[...document.querySelectorAll('.banner')].some(b => /RUG PULL/.test(b.textContent)) && __sw.Achievements.has('rugged') && __sw.S.life.kev.rugged === 1")
       and await pg.evaluate("[...document.querySelectorAll('[data-buy], [data-sell]')].every(b => b.disabled) && document.querySelector('#kevTicker').classList.contains('dead')"),
       'rug pull: a banner, Rugged unlocks, trading’s suspended and the ticker goes grey')
    await pg.screenshot(path=str(shots / 'kevcoin_rug.png'))
    await pg.evaluate("(() => { __sw.Chat.busyUntil = 0; for (let i = 0; i < __sw.KEV.DEAD_TICKS; i++) __sw.Kev.tick(); })()"); await pg.wait_for_timeout(1200)
    ok(await pg.evaluate("__sw.S.kev.v === 2 && __sw.S.kev.units === 0 && __sw.S.kev.price === 1 && document.querySelector('#kevVer').textContent === '2.0'")
       and await pg.evaluate("[...document.querySelectorAll('.toast')].some(t => /2\\.0 is live/.test(t.textContent))"), 'and it comes back as KEVCOIN 2.0, minus your coins')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
    # on average, holding it loses money (400 seeded holds of five minutes, the real numbers)
    avg = await pg.evaluate('''(() => { Object.assign(__sw.KEV, { VOL: .012, DRIFT: -.0006, RUG: 1 / 700 }); let s = 7;
      __sw.Kev.rng = () => { let t = s = (s + 0x6D2B79F5) | 0; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      const save = __sw.S.kev, fee = (1 - __sw.KEV.FEE) ** 2, r = []; __sw.bus.emit = (e => (...a) => { if (!String(a[0]).startsWith('kev:')) e(...a); })(__sw.bus.emit);
      for (let i = 0; i < 400; i++) { delete __sw.S.kev; __sw.Kev.launch(); for (let t = 0, n = Math.floor(__sw.Kev.rng() * 200); t < n; t++) __sw.Kev.tick();
        const v = __sw.S.kev.v, p0 = __sw.S.kev.price; for (let t = 0; t < 100 && __sw.S.kev.v === v; t++) __sw.Kev.tick(); r.push(__sw.S.kev.v === v ? __sw.S.kev.price / p0 * fee - 1 : -1); }
      __sw.S.kev = save; return r.reduce((a, x) => a + x, 0) / r.length; })()''')
    ok(avg < -.1, f'holding it for five minutes loses {-avg:.0%} on average (the house is Kev)')
    await pg.reload(); await pg.wait_for_timeout(1300)
    await pg.evaluate(SETUP)
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok('KEVCOIN' in await text(pg, '#stats') and 'rugged 1×' in await text(pg, '#stats'), 'Stats keeps your KEVCOIN record')
    await pg.click('[data-tab="shop"]')

    # --- the ice cream van: Greensleeves, then the van along the bottom; tap it for a cone
    await pg.evaluate("(() => { __sw.HouseholdView.clear(); __sw.Coach.finish(); __sw.S.coins = 50000; delete __sw.S.life.ach.cone; __sw.renderAll(); __sw.WeirdNoises.surprise('icecream'); })()")
    await pg.wait_for_timeout(1500)
    ok(await pg.evaluate("!!document.querySelector('.van') && !__sw.HouseholdView.free()"), 'Greensleeves, and the ice cream van comes along the bottom of the screen')
    await pg.screenshot(path=str(shots / 'ice_cream_van.png'))
    c0, price, bonus = await pg.evaluate("[__sw.S.coins, __sw.IceCream.price(), __sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === 'cone'))]")
    await pg.click('.van', force=True); await pg.wait_for_timeout(400)  # (it's moving, so no waiting for it to hold still)
    ok(await pg.evaluate('__sw.S.coins') == c0 - price + bonus and await pg.evaluate("__sw.S.sugar === 1 && !!document.querySelector('.van.serving .vcone') && __sw.Achievements.has('cone')"),
       f'tap it: it stops, hands out a cone ({price:,}), and Brain Freeze unlocks')
    ok(await pg.evaluate("!document.querySelector('#sugarChip').hidden") and 'Sugar rush' in await text(pg, '#sugarChip'), 'a Sugar rush chip shows in the header')
    await pg.click('.van', force=True); await pg.wait_for_timeout(200)
    ok(await pg.evaluate('__sw.S.sugar') == 1, 'one cone per van')
    # the sugar rush: +25% on the profit of the next winning cash-out, then it's gone
    await pg.evaluate("__sw.VanView.clear()"); await pg.evaluate(DEAL)
    pot, stake = await pg.evaluate("(() => { const b = __sw.slots[0]; b.G *= 1.6; return [b.pot(), b.stake]; })()")
    c0 = await pg.evaluate('__sw.S.coins')
    await pg.evaluate("__sw.Game.cashOut(__sw.slots[0], 'manual')"); await pg.wait_for_timeout(300)
    rush = (pot - stake) // 4
    ok(await pg.evaluate('__sw.S.coins') - c0 == pot + rush and await pg.evaluate("__sw.S.sugar === 0 && document.querySelector('#sugarChip').hidden"),
       f'the next winning cash-out pays its pot ({pot:,}) plus a quarter of its profit ({rush:,}), and the rush is used up')
    # a van you don't catch just goes
    await pg.evaluate("(() => { __sw.VanView.SPEED = 1e5; __sw.NOISES.icecream.dur = .5; __sw.VanView.drive(); })()"); await pg.wait_for_timeout(1300)
    ok(await pg.evaluate("!document.querySelector('.van') && [...document.querySelectorAll('.toast')].some(t => /van’s gone/.test(t.textContent))"), 'miss it and it drives off')
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok('Ice creams' in await text(pg, '#stats'), 'Stats counts your ice creams')
    await pg.click('[data-tab="shop"]')

    # --- Nan's stars: the same reading all day for a sign, a lucky number from 2 to 6
    same = await pg.evaluate("(() => { const a = __sw.Stars.read('2026-10-06', 4), b = __sw.Stars.read('2026-10-06', 4); return a.text === b.text && a.lucky === b.lucky; })()")
    spread = await pg.evaluate('''(() => { const seen = new Set(), texts = new Set(); for (let d = 1; d <= 28; d++) for (let s = 0; s < 12; s++) {
      const h = __sw.Stars.read(`2026-11-${String(d).padStart(2, '0')}`, s); seen.add(h.lucky); texts.add(h.text); } return [[...seen].sort().join(), texts.size]; })()''')
    ok(same and spread[0] == '2,3,4,5,6' and spread[1] > 250, f'a reading is fixed by the day and the sign; lucky numbers run 2 to 6 ({spread[1]} different readings in 336)')
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok('Nan hasn’t asked yet' in await text(pg, '#stats') and await pg.evaluate("__sw.Stars.luckyToday() === 0"), 'no sign, no lucky number')
    await pg.click('[data-tab="shop"]')
    await pg.evaluate("__sw.StarsView.ask()"); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("document.querySelectorAll('#chat .msg.starsask .qopt').length") == 12, 'Nan asks your star sign in the chat: twelve buttons')
    await pg.locator('#chat .msg.starsask').last.locator('[data-sign="4"]').click(); await pg.wait_for_timeout(1000)
    h = await pg.evaluate("__sw.Stars.read()")
    reading = await pg.evaluate("[...document.querySelectorAll('#chat .msg.stars')].pop().textContent")
    ok(await pg.evaluate("__sw.S.life.sign") == 4 and 'Leo' in reading and f"Lucky number {h['lucky']}" in reading and await pg.evaluate("__sw.Stars.luckyToday()") == h['lucky'],
       f"pick Leo and she reads your stars, lucky number {h['lucky']} (“{h['text'][:50]}…”)")
    await pg.screenshot(path=str(shots / 'stars.png'))
    # the first time a board uncovers the lucky number: ×1.25, once
    got = await pg.evaluate(f'''(() => {{ delete __sw.S.life.ach.stars; window._stars = []; __sw.bus.on('addon:fired', e => {{ if (e.id === 'stars') window._stars.push(e.text); }});
      const real = __sw.Stars.luckyToday.bind(__sw.Stars);
      for (let tries = 0; tries < 30; tries++) {{
        __sw.Stars.luckyToday = () => 0; {DEAL}; const b = __sw.slots[0];
        const open = new Set(); for (let i = 0; i < b.n; i++) if (b.open[i]) open.add(b.num[i]);
        const hidden = n => {{ const r = []; for (let i = 0; i < b.n; i++) if (!b.open[i] && !b.mine[i] && b.num[i] === n) r.push(i); return r; }};
        const N = [2, 3, 4, 5, 6].find(n => !open.has(n) && hidden(n).length >= 2); if (!N) continue;
        __sw.Stars.luckyToday = () => N; const [i, j] = hidden(N), g0 = b.G;
        __sw.Game.tileAddons(b, i, [i], 0); const g1 = b.G; __sw.Game.tileAddons(b, j, [j], 0);
        __sw.Stars.luckyToday = real;
        return {{ N, k: g1 / g0, again: b.G / g1, fired: window._stars.length, text: window._stars[0] }};
      }}
      __sw.Stars.luckyToday = real; return null; }})()''')
    ok(got and abs(got['k'] - 1.25) < 1e-9 and got['again'] == 1 and got['fired'] == 1 and await pg.evaluate("__sw.Achievements.has('stars')"),
       f"uncover a {got and got['N']}: “{got and got['text']}” (the second one doesn’t count), and Written in the Stars unlocks")
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok(f"Leo · lucky number today: {h['lucky']}" in await text(pg, '#stats'), 'Stats shows your sign and today’s lucky number')
    await pg.click('#btnSign'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("document.querySelectorAll('#chat .msg.starsask').length") == 2, '“change” has Nan ask again')
    await pg.click('[data-tab="shop"]')

    # --- the Banker: he rings about a board with profit on it, offering its pot plus a premium
    await pg.evaluate("(() => { __sw.HouseholdView.clear(); ['deal', 'nodeal'].forEach(k => delete __sw.S.life.ach[k]); __sw.Banker.rng = () => .5; __sw.S.life.starsRead = ''; })()")  # (no lucky number boosting the opening)
    await pg.evaluate(DEAL)
    await pg.evaluate("(() => { const b = __sw.slots[0]; if (b.golden) { b.golden = false; b.J = 1; b.lim = b.t.lim; } })()")  # (a random golden board starts at ×2)
    ok(await pg.evaluate("__sw.Banker.target() === null"), 'no call about a board without much profit on it')
    pot, stake = await pg.evaluate("(() => { const b = __sw.slots[0]; b.G *= 1.6; return [b.pot(), b.stake]; })()")
    await pg.evaluate("__sw.WeirdNoises.surprise('bankerRing')"); await pg.wait_for_timeout(300)
    premium = int((pot - stake) * .375 + .5)  # (JS rounds halves up; Python's round() wouldn't)
    card = await text(pg, '.happening')
    ok('Banker' in card and 'its pot (' in card and (premium >= 10000 or f'plus {premium:,} on top' in card) and await pg.evaluate("__sw.slots[0].called && __sw.Banker.target() === null"),
       f'a profitable board: the Banker rings, offering its pot ({pot:,}) plus {premium:,} (and he only calls once about it)')
    await pg.screenshot(path=str(shots / 'banker.png'))
    c0, bonus = await pg.evaluate("[__sw.S.coins, __sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === 'deal'))]")
    await pg.click('.happening [data-h="0"]'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate('__sw.S.coins') == c0 + pot + premium + bonus and await pg.evaluate("__sw.slots[0].over && __sw.Achievements.has('deal')"),
       f'Deal: the board’s sold for {pot + premium:,}, and Deal! unlocks')
    # no deal, then beat him
    await pg.wait_for_timeout(1300); await pg.evaluate(DEAL)
    pot, stake = await pg.evaluate("(() => { const b = __sw.slots[0]; b.G *= 1.6; return [b.pot(), b.stake]; })()")
    await pg.evaluate("__sw.WeirdNoises.surprise('bankerRing')"); await pg.wait_for_timeout(300)
    await pg.click('.happening [data-h="1"]'); await pg.wait_for_timeout(200)
    offered = pot + int((pot - stake) * .375 + .5)
    ok(await pg.evaluate("__sw.slots[0].refused") == offered and not await pg.evaluate("__sw.slots[0].over"), f'No deal: you play on (he’d offered {offered:,})')
    c0, bonus = await pg.evaluate("[__sw.S.coins, __sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === 'nodeal'))]")
    pot2 = await pg.evaluate("(() => { const b = __sw.slots[0]; b.G *= 2; return b.pot(); })()")
    await pg.evaluate("__sw.Game.cashOut(__sw.slots[0], 'manual')"); await pg.wait_for_timeout(300)
    ok(await pg.evaluate('__sw.S.coins') == c0 + pot2 + bonus and await pg.evaluate("__sw.Achievements.has('nodeal')")
       and await pg.evaluate("[...document.querySelectorAll('.toast')].some(t => /more than the Banker offered/.test(t.textContent))"),
       f'cash it out later for {pot2:,}, more than he offered: No Deal unlocks')
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok('1 deal, 1 no deal' in await text(pg, '#stats'), 'Stats counts your deals')
    await pg.click('[data-tab="shop"]')

    # --- Biscuit the dog: a bark, then he trots in and waits; a biscuit gets a mine flagged
    await pg.evaluate("(() => { __sw.HouseholdView.clear(); delete __sw.S.life.ach.dog; __sw.DogView.WALK_MS = 600; })()")
    await pg.wait_for_timeout(1300); await pg.evaluate(DEAL)
    flags0 = await pg.evaluate("__sw.slots[0].flag.reduce((a, x) => a + x, 0)")
    await pg.evaluate("__sw.WeirdNoises.surprise('bark')"); await pg.wait_for_timeout(1000)
    ok(await pg.evaluate("!!document.querySelector('.dog.waiting') && !__sw.HouseholdView.free()") and 'Woof?' in await text(pg, '.dog .dsay'),
       'a bark, and Biscuit trots in and waits: “Woof?”')
    await pg.screenshot(path=str(shots / 'dog.png'))
    c0, price, bonus = await pg.evaluate("[__sw.S.coins, __sw.Dog.price(), __sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === 'dog'))]")
    await pg.click('.dog', force=True); await pg.wait_for_timeout(300)
    hit = await pg.evaluate("(() => { const b = __sw.slots[0], c = document.querySelector('.c.paw'); return [b.flag.reduce((a, x) => a + x, 0), c ? b.mine[+c.dataset.i] : -1, b.flag[c ? +c.dataset.i : 0]]; })()")
    ok(await pg.evaluate('__sw.S.coins') == c0 - price + bonus and hit == [flags0 + 1, 1, 1] and await pg.evaluate("__sw.Achievements.has('dog')"),
       f'give him a biscuit ({price:,}): he finds a mine and sits on it (flagged, and it glows), and Good Boy unlocks')
    ok(await pg.evaluate("[...document.querySelectorAll('.toast')].some(t => /Biscuit sniffed out a mine/.test(t.textContent))"), 'and the toast says so')
    # no live board, no dog; ignore him and he wanders off
    await pg.evaluate("(() => { __sw.DogView.clear(); __sw.Game.cashOut(__sw.slots[0], 'manual'); })()"); await pg.wait_for_timeout(1300)
    ok(await pg.evaluate("__sw.Dog.sniff() === null"), 'with nothing on the tables he doesn’t come round')
    await pg.evaluate(DEAL)
    await pg.evaluate("(() => { Object.assign(__sw.DogView, { WALK_MS: 200, WAIT_MS: 200, LEAVE_MS: 200 }); __sw.DogView.visit(); })()"); await pg.wait_for_timeout(1200)
    ok(await pg.evaluate("!document.querySelector('.dog') && !__sw.DogView.dog"), 'ignore him and he wanders off')
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok('Biscuits given' in await text(pg, '#stats'), 'Stats counts his biscuits')
    await pg.click('[data-tab="shop"]')

    ok(not errs, 'no console errors' + (': ' + '; '.join(errs[:3]) if errs else ''))
    await ctx.close()
    return R
