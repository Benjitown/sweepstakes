"""Nan suite: Nan is always kind (every line of hers signs off with a kiss, she's never in the rude lists, she never
swears and nobody has a go at her), and her biscuit tin (a little of her own money put by on every winning cash-out, up
to its cap, handed over when you go bust and kept when you pull the plug yourself)."""
from common import Results, open_page

SETUP = """(() => { __sw.Coach.finish(); const S = __sw.S; S.coins = 50000; S.unlocked = ['penny', 'den']; S.sel = 'den'; S.life.lvl = 5; S.life.xp = 0;
  S.life.ach = Object.fromEntries(__sw.ACHIEVEMENTS.map(a => [a.id, 1])); S.life.tin = 0; __sw.renderAll(); })()"""
# every line anyone says, as [where, who, text]
ALL_LINES = """(() => { const L = [];
  for (const [k, v] of Object.entries(__sw.LINES)) v.forEach(([w, t]) => L.push([k, w, t]));
  for (const [k, v] of Object.entries(__sw.RUDE)) v.forEach(([w, t]) => L.push(['rude ' + k, w, t]));
  __sw.THREADS.forEach(th => th.forEach(([w, t]) => L.push(['thread', w, t])));
  __sw.RUDE_THREADS.forEach(th => th.forEach(([w, t]) => L.push(['rude thread', w, t])));
  return L; })()"""
# a live Dodgy Den board with a few safe tiles dug, cashed out in profit; returns the profit
WIN = """(() => { const old = __sw.slots[0]; if (old) { old.over = true; __sw.Game.endBoard(old); }
  let profit = null; __sw.bus.on('board:cashout', e => { if (e.b === __sw.slots[0] && profit === null) profit = e.profit; });
  __sw.Game.deal(0); const b = __sw.slots[0]; __sw.invoke(new __sw.DigCommand(b, Math.floor(b.t.h / 2) * b.t.w + Math.floor(b.t.w / 2)));
  for (let i = 0, n = 0; i < b.n && n < 6 && !b.over; i++) if (!b.mine[i] && !b.open[i]) { __sw.invoke(new __sw.DigCommand(b, i)); n++; }
  if (!b.over) __sw.Game.cashOut(b); return profit; })()"""


async def text(pg, sel):
    return await pg.evaluate(f"(document.querySelector('{sel}') || {{}}).textContent || ''")


async def run(browser, url, shots):
    R = Results('nan'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=1200)
    await pg.mouse.click(3, 300)
    await pg.evaluate(SETUP); await pg.wait_for_timeout(200)

    # --- Nan is always kind
    lines = await pg.evaluate(ALL_LINES)
    nan = [l for l in lines if l[1] == 'nan']
    ok(len(nan) >= 100 and all(t.endswith(' x') for _, _, t in nan), f'every one of Nan’s {len(nan)} lines signs off with a kiss')
    ok(not [l for l in lines if l[1] == 'nan' and l[0].startswith('rude ') and l[0] != 'rude thread'], 'Nan is never in the rude chat')
    swears = r'\b(bugger|bloody|sod|sodding|arse|bollocks|piss|pissed|muppet|git|pillock|crap|hell|damn)\b'
    rude_nan = await pg.evaluate(f"(lines => lines.filter(l => l[1] === 'nan' && new RegExp({swears!r}, 'i').test(l[2])))({ALL_LINES})")
    ok(not rude_nan, f'Nan never swears {rude_nan}')
    # nobody has a go at her: no line, quip or Double or Nothing nag that mentions Nan is unkind about her
    unkind = r'laugh|crying|pathetic|made up|rigged|could do better|seen better|tablets|had a sherry|plays here|ghost|pensioner|80\?|his own nan|speedrun'
    about = await pg.evaluate(f"""(() => {{ const re = new RegExp({unkind!r}, 'i'), nan = /\\bnan|nans\\b|grandad/i;
      const said = {ALL_LINES}.filter(l => l[1] !== 'nan').map(l => l[2]);
      const rest = [...__sw.QUIPS, ...__sw.RUDE_QUIPS, ...__sw.SURE, ...__sw.TABLES.map(t => t.blurb), ...__sw.BINGO_TICKETS.map(t => t.blurb),
        ...__sw.SCRATCH_CARDS.map(c => c.blurb), ...Object.values(__sw.BINGO_END).flat(), ...__sw.QUIZ.flat()];
      return [...said, ...rest].filter(t => nan.test(t) && re.test(t)); }})()""")
    ok(not about, f'nobody has a go at Nan {about}')
    ok(await pg.evaluate("__sw.SURE.some(s => /Nan’s put the kettle on/.test(s)) && !__sw.SURE.some(s => /crying/.test(s))"), 'Double or Nothing’s nag: Nan’s put the kettle on (she isn’t crying)')
    end = await pg.evaluate("Object.values(__sw.BINGO_END).flat()")
    ok(not [t for t in end if 'tablets' in t or 'sit down' in t] and any('proud of you' in t for t in end), 'a full house at bingo: Nan’s so proud of you')

    # --- the bingo hall's button asks nicely
    await pg.evaluate("(() => { __sw.S.upg.flip = 1; __sw.S.nanvoice = false; __sw.renderAll(); })()")
    await pg.click('#btnFlip'); await pg.wait_for_timeout(300)
    await pg.click('#modalBox [data-booth="bingo"]'); await pg.wait_for_timeout(300)
    await pg.click('#modalBox .bticket[data-kind="penny"]'); await pg.wait_for_timeout(300)
    ok((await text(pg, '#bingoFast')).strip() == 'Faster please, Nan', f"the bingo hall’s skip button asks nicely: “{(await text(pg, '#bingoFast')).strip()}”")
    await pg.evaluate("__sw.BingoView.FAST_MS = 15"); await pg.click('#bingoFast')
    await pg.wait_for_function('__sw.BingoView.st && __sw.BingoView.st.done', timeout=8000); await pg.wait_for_timeout(200)
    await pg.evaluate("(() => { __sw.UI.closeModal(); __sw.S.coins = 50000; __sw.renderAll(); })()"); await pg.wait_for_timeout(200)

    # --- coming back in early from outside: no bonus, but no telling off either
    await pg.evaluate("(() => { __sw.HouseholdView.clear(); __sw.OutsideView.open(); })()"); await pg.wait_for_timeout(300)
    if await pg.evaluate("__sw.Outside.on"):
        await pg.click('#grassIn')
        await pg.wait_for_timeout(300)
    toasts = await pg.evaluate("[...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | ')")
    ok('every little helps' in toasts and 'doesn’t count' not in toasts, f'back in early: “Nan says every little helps, love” ({toasts[-80:]})')
    await pg.evaluate("(() => { __sw.UI.closeModal(); __sw.S.coins = 50000; __sw.renderAll(); })()")

    # --- Nan's biscuit tin: empty to start with
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok('Nan’s biscuit tin' in await text(pg, '#stats') and 'nothing yet' in await text(pg, '#stats'), 'Stats: Nan’s biscuit tin, nothing in it yet')
    await pg.click('[data-tab="shop"]')
    # a winning cash-out: you get every coin, and Nan puts 3% of the profit by out of her own purse
    c0 = await pg.evaluate('__sw.S.coins')
    profit = await pg.evaluate(WIN)
    tin = await pg.evaluate('__sw.S.life.tin')
    want = min(2500, max(1, int(profit * .03 + .5))) if profit and profit > 0 else 0  # (a big win can fill it in one go)
    ok(profit and profit > 0 and tin == want, f'a board cashes out +{profit}: Nan puts {tin} in the biscuit tin (3%)')
    ok(await pg.evaluate('__sw.S.coins') == c0 + profit, 'and none of it comes out of your winnings')
    await pg.wait_for_timeout(3000)
    said = await pg.evaluate("[...document.querySelectorAll('#chat .msg')].map(m => m.textContent).filter(t => /biscuit tin/.test(t))")
    ok(bool(said) and 'Nan' in said[-1], f'and tells you so in the group chat: {said[-1][:70] if said else None}')
    # a board that blows up adds nothing
    await pg.evaluate("(() => { const old = __sw.slots[0]; if (old) { old.over = true; __sw.Game.endBoard(old); } __sw.Game.deal(0); const b = __sw.slots[0]; __sw.invoke(new __sw.DigCommand(b, Math.floor(b.t.h / 2) * b.t.w + Math.floor(b.t.w / 2))); if (!b.over) __sw.Game.dig(b, b.mine.indexOf(1)); })()")
    await pg.wait_for_timeout(300)
    ok(await pg.evaluate('__sw.S.life.tin') == tin, 'a board that blows up adds nothing')
    # it fills up to two and a half times the starting coins, and then she sits on the lid
    cap = await pg.evaluate('__sw.Tin.cap()')
    await pg.evaluate('(() => { __sw.S.life.tin = 0; __sw.Tin.put(1e9); })()'); await pg.wait_for_timeout(3000)
    more = await pg.evaluate('__sw.Tin.put(1e6)')
    lid = await pg.evaluate("[...document.querySelectorAll('#chat .msg')].some(m => /sit on the lid/.test(m.textContent))")
    ok(cap == 2500 and await pg.evaluate('__sw.S.life.tin') == cap and more == 0 and lid, f'the tin holds {cap:,} at most, and Nan says it’s full')
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok('2,500 put by for a rainy day (full)' in await text(pg, '#stats'), 'Stats: 2,500 put by for a rainy day (full)')
    await pg.click('[data-tab="shop"]')
    # pulling the plug yourself (Fresh run) isn't a rainy day: the tin stays shut
    await pg.evaluate("(() => { const b = __sw.slots[0]; if (b) { b.over = true; __sw.Game.endBoard(b); } __sw.Game.resetRun(); })()"); await pg.wait_for_timeout(300)
    ok(await pg.evaluate('__sw.S.coins') == 1000 and await pg.evaluate('__sw.S.life.tin') == cap, 'a fresh run you start yourself: 1,000 coins, and the tin stays full')
    # a real bust: she brings it round
    await pg.evaluate("(() => { __sw.UI.closeModal(); __sw.Game.slots.fill(null); delete __sw.S.life.ach.tin; __sw.S.coins = 3; __sw.Game.checkBust(); })()"); await pg.wait_for_timeout(500)
    bonus = await pg.evaluate("__sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === 'tin'))")
    card = await text(pg, '#modalBox .tincard')
    again = await text(pg, '#modalBox [data-a="again"]')
    ok(await text(pg, '#modalBox h3') == 'Stuffed.' and '2,500' in card and 'rainy day' in card and 'Start again with 3,500' in again,
       f'go bust: Nan brings her biscuit tin round ({card.strip()[:60]}…) and the button says {again!r}')
    ok(await pg.evaluate('__sw.S.coins') == 1000 + cap + bonus and await pg.evaluate('__sw.S.life.tin') == 0 and await pg.evaluate("__sw.Achievements.has('tin')"),
       f'the fresh run starts with 1,000 + 2,500 (and Rainy Day unlocks, +{bonus}); the tin’s empty again')
    await pg.screenshot(path=str(shots / 'nan_tin.png'))
    await pg.click('#modalBox [data-a="again"]'); await pg.wait_for_timeout(300)
    # bust again with nothing in the tin: no card, back to 1,000
    await pg.evaluate("(() => { __sw.UI.closeModal(); __sw.Game.slots.fill(null); __sw.S.coins = 3; __sw.Game.checkBust(); })()"); await pg.wait_for_timeout(500)
    ok(not await pg.evaluate("!!document.querySelector('#modalBox .tincard')") and 'Start again with 1,000' in await text(pg, '#modalBox [data-a="again"]'),
       'bust with an empty tin: no card, start again with 1,000')
    await pg.click('#modalBox [data-a="again"]'); await pg.wait_for_timeout(300)

    ok(not errs, f'no console errors {errs[:3]}')
    await ctx.close()
    return R
