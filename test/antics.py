"""Antics suite (experimental): dares from the group chat (the offer, You're on / Nah / no answer, the clock in the
header, doing it in time for double, running out of time, the switch, each dare's rule)."""
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
    ok(await pg.evaluate('__sw.S.coins') == c0 - stake and await pg.evaluate('!!__sw.S.dare && __sw.S.dare.id === "quick"') and 'Big Dave’s dare · 2:3' in chip,
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

    ok(not errs, f'no console errors {errs[:3]}')
    await ctx.close()
    return R
