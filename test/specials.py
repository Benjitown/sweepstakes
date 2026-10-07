"""Specials suite: the landlord's specials. Which boards get one (about 1 in 12, never a golden one), Double Trouble
(more mines, double the limit, risky digs pay double), Gem Rush (two more gems), Against the Clock (the countdown,
+50% for beating it, the cash-out when it's up, with no bonus then), the chalk on the board, the achievement, a
special surviving a reload, and the phone."""
from common import Results, open_page

SETUP = """(() => { __sw.Coach.finish(); const S = __sw.S; S.coins = 50000; S.unlocked = ['penny', 'den']; S.sel = 'den'; S.life.lvl = 5; S.life.xp = 0;
  S.life.ach = Object.fromEntries(__sw.ACHIEVEMENTS.map(a => [a.id, 1])); S.tog.restake = false; S.upg.boards = 3; __sw.renderAll(); })()"""
# deal slot k with special sp, and make the first dig in the middle; returns the board's numbers
DEAL = """((k, sp) => { __sw.Specials.force = sp; __sw.Game.deal(k); __sw.Specials.force = ''; const b = __sw.slots[k];
  __sw.invoke(new __sw.DigCommand(b, Math.floor(b.t.h / 2) * b.t.w + Math.floor(b.t.w / 2)));
  let pool = 0; for (let i = 0; i < b.n; i++) if (!b.open[i] && !b.mine[i]) pool++;
  return { special: b.special, m: b.m, lim: b.lim, tm: b.t.m, tlim: b.t.lim, n: b.n, gems: b.gemsTotal, tgems: b.t.gems, pool, tag: (b.el.querySelector('.spectag') || {}).textContent || '' }; })"""
# a safe tile that isn't provably safe (a risky dig), or -1
RISKY = """(k => { const b = __sw.slots[k], d = __sw.Solver.full(b); for (let i = 0; i < b.n; i++) if (!b.open[i] && !b.flag[i] && !b.mine[i] && !d.KS[i] && d.P[i] > 0) return [i, Math.min(.95, d.P[i])]; return [-1, 0]; })"""
SAFE = """((k, n) => { const b = __sw.slots[k]; for (let i = 0, c = 0; i < b.n && c < n && !b.over; i++) if (!b.mine[i] && !b.open[i]) { __sw.invoke(new __sw.DigCommand(b, i)); c++; } return b.over; })"""


async def run(browser, url, shots):
    R = Results('specials'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=1200)
    await pg.mouse.click(3, 300)
    await pg.evaluate(SETUP); await pg.wait_for_timeout(200)

    # --- how often
    st = await pg.evaluate("""(() => { __sw.Specials.force = null; let n = 0, g = 0, kinds = {};
      for (let i = 0; i < 12000; i++) { const s = __sw.Specials.roll(false); if (s) { n++; kinds[s] = (kinds[s] || 0) + 1; } if (__sw.Specials.roll(true)) g++; }
      __sw.Specials.force = ''; return { rate: n / 12000, g, kinds }; })()""")
    ok(.07 < st['rate'] < .097 and st['g'] == 0 and len(st['kinds']) == 3, f'about one board in twelve gets a special ({st["rate"]:.3f}), never a golden one, all three kinds {st["kinds"]}')

    # --- Double Trouble
    d = await pg.evaluate(f"{DEAL}(0, 'trouble')")
    ok(d['special'] == 'trouble' and d['m'] == min(d['n'] - 9, int(d['tm'] * 1.5 + .5)) and d['lim'] == d['tlim'] * 2 and d['tag'] == 'Double Trouble',
       f'Double Trouble: {d["m"]} mines instead of {d["tm"]}, limit ×{d["lim"]} instead of ×{d["tlim"]}, chalked on the board')
    i, p = await pg.evaluate(f"{RISKY}(0)")
    if i >= 0:
        k = await pg.evaluate(f"(() => {{ const b = __sw.slots[0], g = b.G; __sw.invoke(new __sw.DigCommand(b, {i})); return b.G / g; }})()")
        want = 1 + await pg.evaluate('__sw.BOOST') * p / (1 - p) * 2
        ok(abs(k - want) < 1e-9, f'a risky dig on it pays double (×{k:.3f}, a {p:.0%} tile)')
    else:
        ok(True, 'no risky dig on this Double Trouble board (nothing to check)')
    await pg.screenshot(path=str(shots / 'special_trouble.png'))

    # --- Gem Rush
    d = await pg.evaluate(f"{DEAL}(1, 'rush')")
    ok(d['special'] == 'rush' and d['gems'] == min(d['tgems'] + 2, d['pool']) and d['tag'] == 'Gem Rush', f'Gem Rush: {d["gems"]} gems instead of {d["tgems"]}')

    # --- Against the Clock: beat it
    await pg.evaluate("(() => { __sw.Game.slots.forEach(b => { if (b) { b.over = true; __sw.Game.endBoard(b); } }); delete __sw.S.life.ach.nick; })()")
    await pg.wait_for_timeout(200)
    d = await pg.evaluate(f"{DEAL}(0, 'clock')")
    left = await pg.evaluate("__sw.Specials.left(__sw.slots[0])")
    ok(d['special'] == 'clock' and d['tag'].startswith('Against the Clock') and 38 < left <= 40, f'Against the Clock: “{d["tag"].strip()}”, ticking from the first dig ({left:.1f}s left)')
    await pg.evaluate(f"{SAFE}(0, 1)")
    r = await pg.evaluate("""(() => { const b = __sw.slots[0]; if (b.over) return null; let got = null; __sw.bus.on('board:cashout', e => { if (e.b === b && !got) got = e; });
      const pot = b.pot(); __sw.Game.cashOut(b, 'manual'); return { pot, stake: b.stake, amount: got.amount }; })()""")
    if r:
        bonus = (r['pot'] - r['stake']) // 2 if r['pot'] > r['stake'] else 0
        ok(r['amount'] == r['pot'] + bonus, f'beat the clock: the pot ({r["pot"]}) plus half its profit ({bonus})')
        ok(await pg.evaluate("__sw.Achievements.has('nick')") or r['pot'] <= r['stake'], 'achievement: In the Nick of Time')
    else:
        ok(True, 'the board cleared before it could be cashed out (nothing to check)'); ok(True, '')
    await pg.wait_for_timeout(1400)

    # --- Against the Clock: run out of time
    d = await pg.evaluate(f"{DEAL}(1, 'clock')")
    await pg.evaluate(f"{SAFE}(1, 2)")
    r = await pg.evaluate("""(() => { const b = __sw.slots[1]; window.__late = null; __sw.bus.on('board:cashout', e => { if (e.b === b) window.__late = e; });
      window.__latePot = b.pot(); b.t0 = Date.now() - 41000; return !b.over; })()""")
    await pg.wait_for_timeout(1500)
    late = await pg.evaluate("window.__late ? { why: window.__late.why, amount: window.__late.amount, pot: window.__latePot } : null")
    ok(r and late and late['why'] == 'clock' and late['amount'] == late['pot'], f'time’s up: it cashes out for you, with no bonus ({late})')

    # --- a special survives a reload
    await pg.evaluate("(() => { __sw.Game.slots.forEach(b => { if (b) { b.over = true; __sw.Game.endBoard(b); } }); })()")
    await pg.wait_for_timeout(200)
    d = await pg.evaluate(f"{DEAL}(2, 'trouble')")
    await pg.evaluate("__sw.SaveGame.saveNow()")
    await pg.reload(); await pg.wait_for_timeout(1300)
    st = await pg.evaluate("(() => { const b = __sw.slots[2]; return b ? { special: b.special, m: b.m, tag: (b.el.querySelector('.spectag') || {}).textContent || '' } : null; })()")
    ok(st and st['special'] == 'trouble' and st['m'] == d['m'] and st['tag'] == 'Double Trouble', f'a special survives a reload ({st})')

    # --- the phone
    pctx, pp, perrs = await open_page(browser, url, width=360, height=780, mobile=True, wait=1200)
    await pp.evaluate(SETUP)
    await pp.evaluate(f"{DEAL}(0, 'clock')"); await pp.wait_for_timeout(300)
    await pp.evaluate("__sw.slots[0].el.scrollIntoView()"); await pp.wait_for_timeout(200)
    sw = await pp.evaluate("[document.documentElement.scrollWidth, innerWidth]")
    ok(sw[0] <= sw[1], f'phone: a board with a special fits without sideways scrolling {sw}')
    await pp.screenshot(path=str(shots / 'phone_special.png'))
    await pctx.close()

    ok(not errs and not perrs, f'no console errors {(errs + perrs)[:3]}')
    await ctx.close()
    return R
