"""Antics suite (experimental): dares from the group chat (the offer, You're on / Nah / no answer, the clock in the
header, doing it in time for double, running out of time, the switch, each dare's rule) and the seasons (the calendar,
Halloween's pumpkins, bats and trick or treaters, Bonfire Night's fireworks, Christmas snow and Nan's card) and the claw
machine (the sixth booth tab, the swing, what it pays back, a win, a drop, a slip, a miss, leaving mid-grab) and the car
boot sale (his prices, buying, haggling, being sold out from under you, the mystery box, packing up)."""
from common import Results, open_page

SETUP = """(() => { __sw.Coach.finish(); const S = __sw.S; S.coins = 50000; S.unlocked = ['penny', 'den']; S.sel = 'den'; S.life.lvl = 5; S.life.xp = 0;
  S.life.ach = Object.fromEntries(__sw.ACHIEVEMENTS.map(a => [a.id, 1])); S.life.tin = 0; __sw.renderAll(); })()"""
# deal a Dodgy Den board, dig the middle and a few more safe tiles, then cash out; returns { profit, amount }
WIN = """(() => { const old = __sw.slots[0]; if (old) { old.over = true; __sw.Game.endBoard(old); }
  let r = null; __sw.bus.on('board:cashout', e => { if (e.b === __sw.slots[0] && !r) r = { profit: e.profit, amount: e.amount }; });
  __sw.Game.deal(0); const b = __sw.slots[0]; __sw.invoke(new __sw.DigCommand(b, Math.floor(b.t.h / 2) * b.t.w + Math.floor(b.t.w / 2)));
  for (let i = 0, n = 0; i < b.n && n < 6 && !b.over; i++) if (!b.mine[i] && !b.open[i]) { __sw.invoke(new __sw.DigCommand(b, i)); n++; }
  if (!b.over) __sw.Game.cashOut(b); return r; })()"""
# clicks You're on / Nah on the newest dare in the chat
DARE_BTN = "[...document.querySelectorAll('#chat .msg.dare')].pop().querySelector('[data-a=\"%s\"]').click()"
LAST = "(() => { const m = [...document.querySelectorAll('#chat .msg')].pop(); return m ? m.textContent : ''; })()"


async def text(pg, sel):
    return await pg.evaluate(f"(document.querySelector('{sel}') || {{}}).textContent || ''")


async def toasts(pg):
    return await pg.evaluate("[...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | ')")


async def run(browser, url, shots):
    R = Results('antics'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=1200)
    await pg.mouse.click(3, 300)
    await pg.evaluate(SETUP); await pg.wait_for_timeout(200)

    # --- nobody dares you when you're nearly skint
    ok(await pg.evaluate("(() => { const c = __sw.S.coins; __sw.S.coins = 150; const no = !__sw.Dares.canOffer(); __sw.S.coins = c; return no && __sw.Dares.canOffer(); })()"),
       'no dares under 200 coins (ten times the smallest stake)')
    # --- the offer: Tash bets a tenth of your coins
    stake = await pg.evaluate('__sw.Dares.stake()')
    await pg.evaluate("__sw.Dares.make('x3', 'tash')"); await pg.wait_for_timeout(300)
    bubble = await pg.evaluate("(() => { const m = [...document.querySelectorAll('#chat .msg.dare')].pop(); return m ? m.textContent : ''; })()")
    ok('Tash' in bubble and '×3 or more' in bubble and f'You’re on ({stake:,})' in bubble and 'Nah' in bubble,
       f'Tash dares you in the group chat: {stake:,} says you can’t cash out at ×3 or more')
    ok(stake == 5000, f'the stake is a tenth of your coins, nice and round ({stake:,} of 50,000)')
    await pg.screenshot(path=str(shots / 'dare_offer.png'))
    # Nah: she calls you wise, nothing's taken
    c0 = await pg.evaluate('__sw.S.coins')
    await pg.evaluate(DARE_BTN % 'nah'); await pg.wait_for_timeout(1300)
    ok(await pg.evaluate('!__sw.Dares.offer && !__sw.S.dare') and await pg.evaluate('__sw.S.coins') == c0 and 'Tash' in await pg.evaluate(LAST)
       and await pg.evaluate("document.querySelector('#chat .msg.dare [data-a=\"nah\"]').disabled"), 'Nah: no dare, no coins taken, and Tash has her say')
    # no answer: they go off the idea
    await pg.evaluate("(() => { __sw.DARE.ANSWER = .4; __sw.Dares.make('x3', 'priya'); })()"); await pg.wait_for_timeout(1500)
    ok(await pg.evaluate('!__sw.Dares.offer') and 'never mind' in await pg.evaluate(LAST), 'leave it unanswered and Priya goes off the idea')
    await pg.evaluate('__sw.DARE.ANSWER = 40')

    # --- You're on: the stake goes in the pot, and the clock starts in the header
    await pg.evaluate("__sw.Dares.make('quick', 'dave')"); await pg.wait_for_timeout(300)
    c0 = await pg.evaluate('__sw.S.coins'); stake = await pg.evaluate('__sw.Dares.offer.stake')
    await pg.evaluate(DARE_BTN % 'on'); await pg.wait_for_timeout(400)
    chip = await text(pg, '#dareChip .long')
    ok(await pg.evaluate('__sw.S.coins') == c0 - stake and await pg.evaluate('!!__sw.S.dare && __sw.S.dare.id === "quick"') and 'Big Dave’s dare · 2:' in chip,
       f'You’re on: {stake:,} goes in the pot and the clock starts in the header ({chip})')
    ok('Dare on' in await toasts(pg), 'a toast says what you have to do')
    await pg.screenshot(path=str(shots / 'dare_on.png'))
    # do it in time: double back
    await pg.evaluate("delete __sw.S.life.ach.dare")
    c1 = await pg.evaluate('__sw.S.coins')
    r = await pg.evaluate(WIN)
    bonus = await pg.evaluate("__sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === 'dare'))")
    await pg.wait_for_timeout(1500)
    ok(r and r['profit'] > 0 and await pg.evaluate('!__sw.S.dare') and await pg.evaluate('__sw.S.coins') == c1 + r['profit'] + 2 * stake + bonus,
       f"cash out in profit within 15 seconds: dare done, +{2 * stake:,} on top of the board's +{r and r['profit']:,} (and Dared and Done, +{bonus})")
    ok(await pg.evaluate("document.querySelector('#dareChip').hidden") and 'Dare done' in await toasts(pg), 'the chip goes and a toast says so')
    said = await pg.evaluate("[...document.querySelectorAll('#chat .msg')].slice(-3).map(m => m.textContent).join(' | ')")
    ok('Big Dave' in said, f'Dave pays up in the chat ({said[-90:]})')

    # --- run out of time: the stake's gone
    await pg.evaluate("__sw.Dares.make('gem', 'kev')"); await pg.wait_for_timeout(200)
    await pg.evaluate(DARE_BTN % 'on'); await pg.wait_for_timeout(300)
    c2 = await pg.evaluate('__sw.S.coins')
    await pg.evaluate('__sw.S.dare.left = 2'); await pg.wait_for_timeout(2600)
    ok(await pg.evaluate('!__sw.S.dare') and await pg.evaluate('__sw.S.coins') == c2 and 'keeps your' in await toasts(pg), 'run out of time: Kev keeps the stake')
    await pg.wait_for_timeout(800)
    ok('Kev' in await pg.evaluate("[...document.querySelectorAll('#chat .msg')].slice(-3).map(m => m.textContent).join(' ')"), 'and Kev gloats')
    # the clock only runs while you're at the table (not while you're outside)
    await pg.evaluate("__sw.Dares.make('gem', 'priya')"); await pg.wait_for_timeout(200)
    await pg.evaluate(DARE_BTN % 'on'); await pg.wait_for_timeout(300)
    await pg.evaluate("(() => { __sw.HouseholdView.clear(); __sw.UI.closeModal(); __sw.OutsideView.open(); })()"); await pg.wait_for_timeout(200)
    left = await pg.evaluate('__sw.S.dare.left'); await pg.wait_for_timeout(2200)
    ok(await pg.evaluate('__sw.Outside.on') and await pg.evaluate('__sw.S.dare.left') == left, 'the dare’s clock stops while you’re outside')
    await pg.click('#grassIn'); await pg.wait_for_timeout(300)
    await pg.evaluate("(() => { __sw.Dares.lose(); __sw.UI.closeModal(); })()"); await pg.wait_for_timeout(300)

    # --- each dare's rule (straight to the rules, with made-up events)
    rules = await pg.evaluate("""(() => { const D = __sw.Dares, S = __sw.S, me = { human: true }, bot = { human: false }, out = {};
      const take = id => { S.dare = { id, who: 'dave', stake: 10, secs: 60, left: 60, wins: 0, task: '' }; };
      const won = () => !S.dare;
      take('x3'); D.check('cashout', { b: me, mult: 2.9, profit: 5 }); out.x3low = won(); D.check('cashout', { b: bot, mult: 4 }); out.x3bot = won();
      D.check('cashout', { b: me, mult: 3, profit: 9 }); out.x3 = won();
      take('clean'); D.check('cashout', { b: { human: true, flagged: true }, why: 'clear', mult: 2 }); out.cleanFlag = won();
      D.check('cashout', { b: me, why: 'manual', mult: 2 }); out.cleanManual = won(); D.check('cashout', { b: me, why: 'clear', mult: 2 }); out.clean = won();
      take('three'); D.check('cashout', { b: me, profit: 5 }); D.check('cashout', { b: me, profit: 5 }); D.check('boom', { b: me }); out.threeBroken = won();
      D.check('cashout', { b: me, profit: 5 }); D.check('cashout', { b: me, profit: 5 }); out.threeTwo = won(); D.check('cashout', { b: me, profit: 5 }); out.three = won();
      take('gem'); D.check('gem', { b: bot }); out.gemBot = won(); D.check('gem', { b: me }); out.gem = won();
      take('quick'); D.check('cashout', { b: { human: true, t0: Date.now() - 16000 }, profit: 5 }); out.quickSlow = won();
      D.check('cashout', { b: { human: true, t0: Date.now() - 5000 }, profit: 0 }); out.quickEven = won(); D.check('cashout', { b: { human: true, t0: Date.now() - 5000 }, profit: 5 }); out.quick = won();
      return out; })()""")
    ok(rules == {'x3low': False, 'x3bot': False, 'x3': True, 'cleanFlag': False, 'cleanManual': False, 'clean': True, 'threeBroken': False, 'threeTwo': False, 'three': True,
                 'gemBot': False, 'gem': True, 'quickSlow': False, 'quickEven': False, 'quick': True},
       f'each dare’s rule: ×3 (yours, not a bot’s), a clear with no flags, three wins in a row (a boom resets it), a gem, a quick profit ({rules})')
    await pg.wait_for_timeout(2500)

    # --- Stats keeps score, and the switch turns dares off
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    st = await text(pg, '#stats')
    ok('Dares' in st and 'won' in st and 'turned down' in st, 'Stats: dares won, lost and turned down')
    await pg.click('#tg-dares'); await pg.wait_for_timeout(100)
    await pg.evaluate("(() => { __sw.UI.closeModal(); __sw.bus.emit('dare:due'); })()"); await pg.wait_for_timeout(200)
    off = await pg.evaluate('!__sw.Dares.offer')
    await pg.click('#tg-dares'); await pg.wait_for_timeout(100)
    await pg.evaluate("__sw.bus.emit('dare:due')"); await pg.wait_for_timeout(200)
    ok(off and await pg.evaluate('!!__sw.Dares.offer'), 'switch “Dares from the chat” off and nobody dares you; on again and they do')
    await pg.evaluate("__sw.Dares.decline('slow')")
    await pg.click('[data-tab="shop"]')

    # --- the seasons: by the calendar
    when = await pg.evaluate("""(() => { const X = __sw.Seasons, f = X.force; X.force = null; const at = d => X.now(new Date(d));
      const r = { oct1: at('2026-10-01T09:00'), oct15: at('2026-10-15T12:00'), oct31: at('2026-10-31T23:00'), nov5: at('2026-11-05T19:00'), nov8: at('2026-11-08T12:00'),
        dec25: at('2026-12-25T10:00'), dec27: at('2026-12-27T10:00'), jun: at('2026-06-01T12:00') };
      __sw.S.seasons = false; r.off = at('2026-10-15T12:00'); __sw.S.seasons = true; X.force = f; return r; })()""")
    ok(when == {'oct1': 'halloween', 'oct15': 'halloween', 'oct31': 'halloween', 'nov5': 'bonfire', 'nov8': None, 'dec25': 'xmas', 'dec27': None, 'jun': None, 'off': None},
       f'the calendar: Halloween all October, Bonfire Night 1–7 November, Christmas 1–26 December, nothing in June, nothing with the switch off')
    ok(await pg.evaluate("!document.body.dataset.season && !document.querySelector('#seasonDeco')"), 'the tests start with no season (?test picks none)')
    # Halloween: a purple room, a pumpkin by the logo, the odd bat
    await pg.evaluate("(() => { __sw.Seasons.force = 'halloween'; __sw.SeasonView.apply(); __sw.SeasonView.bat(); })()"); await pg.wait_for_timeout(1500)
    ok(await pg.evaluate("document.body.dataset.season === 'halloween' && document.querySelector('#seasonDeco use').getAttribute('href') === '#i-pumpkin' && !!document.querySelector('.bat')"),
       'Halloween: the room goes purple, a pumpkin sits by the logo, and a bat flaps across')
    await pg.screenshot(path=str(shots / 'halloween.png'))
    # a pumpkin under a safe tile the opening didn't reach: dig it up for ×1.15
    PUMP = """(() => { const old = __sw.slots[0]; if (old) { old.over = true; __sw.Game.endBoard(old); }
      __sw.Seasons.rng = () => 0; __sw.Game.deal(0); const b = __sw.slots[0]; __sw.invoke(new __sw.DigCommand(b, Math.floor(b.t.h / 2) * b.t.w + Math.floor(b.t.w / 2)));
      __sw.Seasons.rng = Math.random; const j = b.pumpkin; if (j < 0 || b.over) return { j };
      const hid = !b.open[j] && !b.mine[j] && !b.gem[j]; let k = 1; __sw.bus.on('board:risky', e => { if (e.b === b && e.i === j) k = e.k; });
      const g0 = b.G; __sw.Game.dig(b, j);
      return { j, hid, at: b.pumpkinAt, ratio: b.G / g0 / k, pk: b.cells[j].classList.contains('pk'), n: __sw.S.life.pumpkins || 0 }; })()"""
    await pg.evaluate("(() => { __sw.S.life.pumpkins = 4; delete __sw.S.life.ach.pumpkin; })()")
    r = await pg.evaluate(PUMP); await pg.wait_for_timeout(150)
    floats = await pg.evaluate("[...document.querySelectorAll('.float')].map(e => e.textContent).join(' ')")
    await pg.wait_for_timeout(250)
    ok(r.get('j', -1) >= 0 and r['hid'] and r['at'] == r['j'] and abs(r['ratio'] - 1.15) < 1e-9 and r['pk'],
       f"a pumpkin hides under a safe tile the opening didn’t reach; dig it up and the pot goes ×1.15 ({r})")
    ok(r.get('n') == 5 and await pg.evaluate("__sw.Achievements.has('pumpkin')"), 'the fifth pumpkin: Pumpkin Patch')
    ok('PUMPKIN ×1.15' in floats, f'and it says so on the board ({floats[:60]})')
    await pg.screenshot(path=str(shots / 'pumpkin.png'))
    none = await pg.evaluate("""(() => { const b = __sw.slots[0], out = {}; __sw.Seasons.rng = () => .99; out.unlucky = __sw.Seasons.pumpkinFor(b);
      __sw.Seasons.rng = () => 0; __sw.Seasons.force = 'none'; out.offSeason = __sw.Seasons.pumpkinFor(b); __sw.Seasons.force = 'halloween'; __sw.Seasons.rng = Math.random; return out; })()""")
    ok(none == {'unlucky': -1, 'offSeason': -1}, 'half the boards have no pumpkin, and none out of season')
    await pg.evaluate("(() => { const b = __sw.slots[0]; if (b) { b.over = true; __sw.Game.endBoard(b); } __sw.HouseholdView.clear(); })()")
    # trick or treat: sweets for a sugar rush...
    await pg.evaluate("(() => { __sw.Seasons.rng = () => 0; delete __sw.S.life.ach.treat; __sw.S.sugar = 0; __sw.Household.answerDoor(); __sw.Seasons.rng = Math.random; })()"); await pg.wait_for_timeout(300)
    card = await text(pg, '.happening')
    sweets = await pg.evaluate('__sw.Seasons.sweets()')
    ok('Trick or treat!' in card and f'Give them sweets ({sweets:,})' in card and 'Pretend you’re out' in card, f'Halloween at the door: trick or treaters ({card[:70]}…)')
    await pg.screenshot(path=str(shots / 'trick_or_treat.png'))
    c0 = await pg.evaluate('__sw.S.coins')
    await pg.click('.happening [data-h="0"]'); await pg.wait_for_timeout(400)
    bonus = await pg.evaluate("__sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === 'treat'))")
    ok(await pg.evaluate('__sw.S.coins') == c0 - sweets + bonus and await pg.evaluate('__sw.S.sugar') == 1 and 'Treat!' in await text(pg, '.happening')
       and await pg.evaluate("__sw.Achievements.has('treat') && !document.querySelector('#sugarChip').hidden"),
       f'give them sweets ({sweets:,}): they give you a sugar rush back (+25% on your next winning cash-out), and Trick or Treat unlocks')
    # ...or eggs on the window
    await pg.evaluate("(() => { __sw.HouseholdView.clear(); __sw.TRICK.EGGS_MS = 1200; __sw.Seasons.rng = () => 0; __sw.Household.answerDoor(); __sw.Seasons.rng = Math.random; })()"); await pg.wait_for_timeout(300)
    await pg.click('.happening [data-h="1"]'); await pg.wait_for_timeout(700)
    eggs = await pg.evaluate("document.querySelectorAll('#eggs .egg').length")
    ok(eggs == 3 and 'Trick!' in await text(pg, '.happening'), f'pretend you’re out and they egg the window ({eggs} eggs)')
    await pg.screenshot(path=str(shots / 'egged.png'))
    await pg.wait_for_timeout(2000)
    ok(await pg.evaluate("!document.querySelector('#eggs')"), 'the eggs come off in the end')
    await pg.evaluate("(() => { __sw.HouseholdView.clear(); __sw.TRICK.EGGS_MS = 40000; })()")
    # Bonfire Night: fireworks over a big win
    fw = await pg.evaluate("""(() => { __sw.Seasons.force = 'bonfire'; __sw.SeasonView.apply(); const real = __sw.FX.fireworks; let n = 0; __sw.FX.fireworks = k => { n += k; };
      const old = __sw.slots[0]; if (old) { old.over = true; __sw.Game.endBoard(old); }
      __sw.Game.deal(0); const b = __sw.slots[0]; __sw.invoke(new __sw.DigCommand(b, Math.floor(b.t.h / 2) * b.t.w + Math.floor(b.t.w / 2)));
      let small = -1; if (!b.over) { b.G = 1; __sw.Game.cashOut(b); small = n; }
      const o2 = __sw.slots[0]; if (o2) { o2.over = true; __sw.Game.endBoard(o2); }
      __sw.Game.deal(0); const c = __sw.slots[0]; __sw.invoke(new __sw.DigCommand(c, Math.floor(c.t.h / 2) * c.t.w + Math.floor(c.t.w / 2)));
      if (!c.over) { c.G = 10; __sw.Game.cashOut(c); }
      __sw.FX.fireworks = real; return { deco: document.querySelector('#seasonDeco use').getAttribute('href'), small, big: n }; })()""")
    ok(fw['deco'] == '#i-firework' and fw['small'] == 0 and fw['big'] >= 2, f'Bonfire Night: a rocket by the logo, and fireworks over a big win, not a small one ({fw})')
    # Christmas: snow, and a card from Nan (once a day)
    await pg.evaluate("(() => { __sw.HouseholdView.clear(); __sw.Seasons.force = 'xmas'; __sw.SeasonView.apply(); delete __sw.S.life.xmasCard; })()"); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("document.querySelectorAll('#snow i').length === 36 && document.querySelector('#seasonDeco use').getAttribute('href') === '#i-holly'"), 'Christmas: snow past the window, holly by the logo')
    c0 = await pg.evaluate('__sw.S.coins')
    first = await pg.evaluate("__sw.Household.answerDoor().o.title"); await pg.wait_for_timeout(300)
    got = await pg.evaluate('__sw.S.coins') - c0
    card = await text(pg, '.happening')
    second = await pg.evaluate("(() => { __sw.HouseholdView.clear(); return __sw.Household.answerDoor().o.title; })()")
    ok(first == 'A card from Nan' and got > 0 and 'All my love, Nan x' in card and second != 'A card from Nan', f'a card from Nan with {got:,} in it (just the one a day)')
    await pg.screenshot(path=str(shots / 'xmas.png'))
    # and out of season again
    await pg.evaluate("(() => { __sw.HouseholdView.clear(); __sw.Seasons.force = 'none'; __sw.SeasonView.apply(); })()"); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("!document.body.dataset.season && !document.querySelector('#seasonDeco') && !document.querySelector('#snow')"), 'out of season: the room’s back to normal')

    # --- the claw machine: the booth's sixth tab
    await pg.evaluate("(() => { __sw.HouseholdView.clear(); __sw.UI.closeModal(); __sw.S.upg.flip = 1; __sw.S.coins = 50000; __sw.renderAll(); })()")
    await pg.click('#btnFlip'); await pg.wait_for_timeout(300)
    tabs = await pg.evaluate("[...document.querySelectorAll('#modalBox .booth button')].map(b => b.dataset.booth)")
    await pg.click('#modalBox [data-booth="claw"]'); await pg.wait_for_timeout(400)
    st = await pg.evaluate("({ prizes: document.querySelectorAll('#clawPile .prize').length, price: __sw.Claw.price(), btn: document.querySelector('#clawGo').textContent })")
    ok(tabs == ['flip', 'ducks', 'scratch', 'bingo', 'fruity', 'claw'] and st['prizes'] == 5 and st['btn'] == f"Grab ({st['price']:,})",
       f"the booth’s sixth tab: the claw machine, five prizes in the case, {st['btn']} ({tabs}, {st['prizes']})")
    x0 = await pg.evaluate('__sw.ClawView.x'); await pg.wait_for_timeout(450); x1 = await pg.evaluate('__sw.ClawView.x')
    ok(abs(x1 - x0) > .05, f'the claw swings along the top ({x0:.2f} → {x1:.2f})')
    await pg.screenshot(path=str(shots / 'claw.png'))
    # the house wins: even dead centre on every prize pays back less than a go, and real timing pays back a lot less
    best = await pg.evaluate("__sw.CLAW_PRIZES.map(p => [p.id, +(__sw.CLAW.GRIP[0] * p.slip * (1 - __sw.CLAW.DROP) * p.x).toFixed(3)])")
    rtp = await pg.evaluate("""(() => { const C = __sw.Claw, keep = [C.pile, C.rng], r = __sw.seeded(11); C.rng = r; let pay = 0; const n = 20000;
      for (let k = 0; k < n; k++) { C.pile = null; C.fill(); const x = .1 + r() * .8, u = C.under(x); if (u.q) pay += C.chance(x) * __sw.CLAW_BY[u.q.id].x; }
      [C.pile, C.rng] = keep; return pay / n; })()""")
    ok(all(v < 1 for _, v in best) and rtp < .6, f"dead centre pays back {', '.join(f'{k} {v:.0%}' for k, v in best)}; grabbing blind, {rtp:.0%}")
    # a win: dead centre on the first prize, a claw that holds on and doesn't drop it
    GO = """(q => { const C = __sw.Claw, v = __sw.ClawView; v.SPEED = .2; const seq = q.slice(); C.rng = () => seq.length ? seq.shift() : .5;
      const p = C.pile[0], P = __sw.CLAW_BY[p.id]; v.x = %s; const c0 = __sw.S.coins, price = C.price(), sh = __sw.S.inv.shield, gold = __sw.S.goldNext; v.grab();
      return { id: p.id, x: P.x, fx: P.fx || '', c0, price, sh, gold }; })(%s)"""
    await pg.evaluate("delete __sw.S.life.ach.claw")
    g = await pg.evaluate(GO % ('p.x', '[0, .99]'))
    ok(await pg.evaluate("__sw.UI.modalLocked && document.querySelector('#clawGo').disabled"), 'while the claw’s going, you can’t grab again (or walk off with Escape)')
    await pg.wait_for_timeout(1300)
    bonus = await pg.evaluate("__sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === 'claw'))")
    pay = int(g['price'] * g['x'])
    ok(await pg.evaluate('__sw.S.coins') == g['c0'] - g['price'] + pay + bonus and await pg.evaluate('__sw.S.life.claw.won') == 1
       and await pg.evaluate("__sw.Achievements.has('claw') && !__sw.ClawView.busy && !__sw.UI.modalLocked"),
       f"dead centre on {g['id']}: the claw holds, carries it to the chute and pays ×{g['x']} (+{pay:,}), and Claw Blimey unlocks")
    fxok = (g['fx'] != 'shield' or await pg.evaluate('__sw.S.inv.shield') == g['sh'] + 1) and (g['fx'] != 'golden' or await pg.evaluate('__sw.S.goldNext') == g['gold'] + 1)
    ok(fxok and '+' in await text(pg, '#clawMsg'), f"…and says what you won ({(await text(pg, '#clawMsg'))[:60]})")
    # a drop on the way to the chute, a slip, and a miss: you just lose the go
    d = await pg.evaluate(GO % ('p.x', '[0, 0]')); await pg.wait_for_timeout(1100)
    ok(await pg.evaluate('__sw.S.coins') == d['c0'] - d['price'] and 'drops it' in await text(pg, '#clawMsg'), 'it grips, lifts… and drops it on the way: no prize')
    sl = await pg.evaluate(GO % ('p.x', '[.99]')); await pg.wait_for_timeout(900)
    ok(await pg.evaluate('__sw.S.coins') == sl['c0'] - sl['price'] and 'slips' in await text(pg, '#clawMsg'), 'or it slips straight out of the claw')
    gap = await pg.evaluate("(() => { for (let x = .1; x <= .9; x += .005) if (!__sw.Claw.under(x).q) return x; return -1; })()")
    m = await pg.evaluate(GO % (str(gap), '[]')); await pg.wait_for_timeout(900)
    ok(gap > 0 and await pg.evaluate('__sw.S.coins') == m['c0'] - m['price'] and 'thin air' in await text(pg, '#clawMsg'), 'or there’s nothing under it at all')
    # leave mid-grab: it was decided when the claw dropped, so the prize is paid
    w = await pg.evaluate(GO % ('p.x', '[0, .99]'))
    await pg.evaluate('__sw.ClawView.leave()'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate('__sw.S.coins') == w['c0'] - w['price'] + int(w['price'] * w['x']) and await pg.evaluate('__sw.UI.modalClosed() && !__sw.S.clawOwed'),
       'leave mid-grab and the prize still pays')
    ok(await pg.evaluate("(() => { const c = __sw.S.coins; __sw.S.clawOwed = 77; __sw.Claw.settle(); return __sw.S.coins === c + 77 && !__sw.S.clawOwed; })()"),
       'and a prize still in the chute when the page closed pays out next time (settle)')
    await pg.evaluate("(() => { __sw.Claw.rng = Math.random; __sw.ClawView.SPEED = 1; })()")
    # --- the car boot sale
    await pg.evaluate("(() => { __sw.HouseholdView.clear(); __sw.UI.closeModal(); __sw.S.addons = []; __sw.S.coins = 1e6; __sw.renderAll(); __sw.bus.emit('boot:due'); })()")
    await pg.wait_for_timeout(300)
    card = await text(pg, '.happening')
    ok('Car boot sale' in card and 'Have a look' in card, 'a car boot sale sets up at the end of the road')
    await pg.click('.happening [data-h="0"]'); await pg.wait_for_timeout(300)
    st = await pg.evaluate("""(() => { const st = __sw.CarBoot.stall; return { n: st.cards.length, ok: st.cards.every(c => { const shop = __sw.Rack.price(c.id);
      return !__sw.S.addons.some(a => a.id === c.id) && c.price >= Math.ceil(shop * .45) - 1 && c.price <= Math.ceil(shop * 1.35) + 1; }),
      shown: document.querySelectorAll('#bootTable .offer').length, box: st.box }; })()""")
    ok(st['n'] == 3 and st['ok'] and st['shown'] == 4, f"his table: three cards you haven’t got at his prices (45% to 135% of the shop’s) and a mystery box ({st})")
    await pg.screenshot(path=str(shots / 'car_boot.png'))
    # buy one at his price
    c0 = await pg.evaluate('__sw.S.coins'); p0 = await pg.evaluate('__sw.CarBoot.stall.cards[0].price'); id0 = await pg.evaluate('__sw.CarBoot.stall.cards[0].id')
    await pg.click('#bootTable [data-bbuy="0"]'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate('__sw.S.coins') == c0 - p0 and await pg.evaluate(f"__sw.S.addons.some(a => a.id === '{id0}' && a.paid === {p0})") and 'Yours' in await text(pg, '#bootTable .offer'),
       f'buy one at his price ({p0:,}): it goes in your add-on slots')
    # haggle: a cheeky offer (60%) he turns down, then a fair one (80%) he takes
    await pg.evaluate("delete __sw.S.life.ach.haggle")
    p1 = await pg.evaluate('__sw.CarBoot.stall.cards[1].price')
    await pg.evaluate("(() => { const q = [.99, .99, 0]; __sw.CarBoot.rng = () => q.length ? q.shift() : .5; })()")
    off1 = await pg.evaluate('__sw.CarBoot.offer(1)')
    await pg.click('#bootTable [data-offer="1"]'); await pg.wait_for_timeout(200)
    said1 = await text(pg, '#bootMsg'); off2 = await pg.evaluate('__sw.CarBoot.offer(1)')
    c1 = await pg.evaluate('__sw.S.coins')
    await pg.click('#bootTable [data-offer="1"]'); await pg.wait_for_timeout(300)
    bonus = await pg.evaluate("__sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === 'haggle'))")
    ok(off1 == int(p1 * .6) and off2 == int(p1 * .8) and '“' in said1 and await pg.evaluate('__sw.S.coins') == c1 - off2 + bonus and await pg.evaluate("__sw.Achievements.has('haggle')"),
       f'haggle: offer {off1:,} and he says no ({said1}); offer {off2:,} and it’s yours (Haggler unlocks)')
    # he sells the last one to someone else while you dither
    await pg.evaluate("(() => { const q = [.99, 0]; __sw.CarBoot.rng = () => q.length ? q.shift() : .5; })()")
    await pg.click('#bootTable [data-offer="2"]'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate('__sw.CarBoot.stall.cards[2].gone') and 'Gone' in await text(pg, '#bootTable'), f"or he sells it to someone else while you haggle ({await text(pg, '#bootMsg')})")
    # the mystery box: any card you haven't got
    c2 = await pg.evaluate('__sw.S.coins'); box = await pg.evaluate('__sw.CarBoot.stall.box'); n0 = await pg.evaluate('__sw.S.addons.length')
    await pg.evaluate("__sw.CarBoot.rng = Math.random")
    await pg.click('#bootTable [data-box]'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate('__sw.S.coins') == c2 - box and await pg.evaluate('__sw.S.addons.length') == n0 + 1 and 'Inside:' in await text(pg, '#bootMsg'),
       f"the mystery box ({box:,}): {(await text(pg, '#bootMsg'))[:60]}")
    # and he packs up
    await pg.evaluate("__sw.CarBoot.stall.until = Date.now() + 900"); await pg.wait_for_timeout(3200)
    ok(await pg.evaluate('!__sw.CarBoot.stall && __sw.UI.modalClosed()'), 'and when time’s up he packs up and goes')
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok('Car boot sales' in await text(pg, '#stats') and 'mystery box' in await text(pg, '#stats'), 'Stats: what you bought at car boot sales')
    await pg.click('[data-tab="shop"]')
    ids = await pg.evaluate("[...document.querySelectorAll('svg symbol')].map(s => s.id)")
    ok(len(ids) == len(set(ids)), f'every icon in the sheet has its own id ({len(ids)} icons{", doubled: " + str(sorted({x for x in ids if ids.count(x) > 1})) if len(ids) != len(set(ids)) else ""})')
    ok(not errs, f'no console errors {errs[:3]}')
    await ctx.close()
    return R
