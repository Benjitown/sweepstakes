"""Specials suite: the landlord's specials. Which boards get one (about 1 in 12, never a golden one), Double Trouble
(more mines, double the limit, risky digs pay double), Gem Rush (two more gems), Against the Clock (the countdown,
+50% for beating it, the cash-out when it's up, with no bonus then), the Lock-in (no cashing out till half the board's
dug, then double the profit, and the Banker can't get in), Happy Hour (half the stake back on a bang), the chalk on
the board, the achievements, a special surviving a reload, and the phone. Also three add-on cards that came with
them: Doggy Bag, Tea and Toast and Hat Trick."""
from common import Results, open_page

SETUP = """(() => { __sw.Coach.finish(); const S = __sw.S; S.coins = 50000; S.unlocked = ['penny', 'den']; S.sel = 'den'; S.life.lvl = 5; S.life.xp = 0;
  S.life.ach = Object.fromEntries(__sw.ACHIEVEMENTS.map(a => [a.id, 1])); S.tog.restake = false; S.upg.boards = 3; __sw.renderAll(); })()"""
# deal slot k with special sp, and make the first dig in the middle; returns the board's numbers
DEAL = """((k, sp) => { __sw.Specials.force = sp; __sw.Game.deal(k); __sw.Specials.force = ''; const b = __sw.slots[k];
  __sw.invoke(new __sw.DigCommand(b, Math.floor(b.t.h / 2) * b.t.w + Math.floor(b.t.w / 2)));
  let pool = 0; for (let i = 0; i < b.n; i++) if (!b.open[i] && !b.mine[i]) pool++;
  return { special: b.special, golden: !!b.golden, m: b.m, lim: b.lim, tm: b.t.m, tlim: b.t.lim, n: b.n, gems: b.gemsTotal, tgems: b.t.gems, pool, tag: (b.el.querySelector('.spectag') || {}).textContent || '' }; })"""
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
    ok(.07 < st['rate'] < .097 and st['g'] == 0 and len(st['kinds']) == 5, f'about one board in twelve gets a special ({st["rate"]:.3f}), never a golden one, all five kinds {st["kinds"]}')

    # --- Double Trouble
    d = await pg.evaluate(f"{DEAL}(0, 'trouble')")
    gold = 2 if d['golden'] else 1  # (a forced special can land on a golden board, which doubles the limit again)
    ok(d['special'] == 'trouble' and d['m'] == min(d['n'] - 9, int(d['tm'] * 1.5 + .5)) and d['lim'] == d['tlim'] * 2 * gold and d['tag'] == 'Double Trouble',
       f'Double Trouble: {d["m"]} mines instead of {d["tm"]}, limit ×{d["lim"]} instead of ×{d["tlim"]}{" (golden)" if gold > 1 else ""}, chalked on the board')
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

    # --- the Lock-in: the doors stay shut till half the board's dug, then the profit's doubled
    await pg.evaluate("(() => { __sw.Game.slots.forEach(b => { if (b) { b.over = true; __sw.Game.endBoard(b); } }); delete __sw.S.life.ach.lockin; })()")
    await pg.wait_for_timeout(200)
    d = await pg.evaluate(f"{DEAL}(0, 'lockin')")
    lk = await pg.evaluate("""(() => { const b = __sw.slots[0], btn = b.el.querySelector('.cash'), go = __sw.Specials.toGo(b);
      __sw.Game.cashOut(b, 'manual');
      return { locked: __sw.Specials.locked(b), go, over: b.over, dis: btn.disabled, txt: btn.textContent.trim(), toasts: [...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | ') }; })()""")
    ok(d['tag'] == 'The Lock-in' and lk['locked'] and not lk['over'] and lk['go'] > 0 and lk['dis'] and lk['txt'] == f'Locked in: {lk["go"]} more to dig',
       f'the Lock-in: no cashing out yet (“{lk["txt"]}”)')
    ok('The doors are locked' in lk['toasts'], 'trying anyway says the doors are locked')
    r = await pg.evaluate("""(() => { const b = __sw.slots[0]; let opened = 0; __sw.bus.on('special:open', e => { if (e.b === b) opened++; });
      for (let i = 0; i < b.n && __sw.Specials.locked(b) && !b.over; i++) if (!b.mine[i] && !b.open[i]) __sw.invoke(new __sw.DigCommand(b, i));
      return { opened, locked: __sw.Specials.locked(b), over: b.over, frac: b.frac(), doors: b.doors, cash: b.el.querySelector('.cash').disabled }; })()""")
    if not r['over']:
        ok(r['opened'] == 1 and not r['locked'] and r['doors'] and r['frac'] >= .5 and not r['cash'], f'half the board dug ({r["frac"]:.0%}): the doors open, once')
        r = await pg.evaluate("""(() => { const b = __sw.slots[0]; b.G = Math.max(b.G, 3); const banker = __sw.Banker.target() === b;
          let got = null; __sw.bus.on('board:cashout', e => { if (e.b === b && !got) got = e; });
          const pot = b.pot(); __sw.Game.cashOut(b, 'manual'); return { pot, stake: b.stake, amount: got && got.amount, banker }; })()""")
        ok(r['amount'] == r['pot'] + max(0, r['pot'] - r['stake']), f'cash out after: the pot ({r["pot"]}) plus its profit again ({r["amount"]})')
        ok(not r['banker'], 'the Banker can’t get into a Lock-in')
        ok(await pg.evaluate("(__sw.S.run.news || []).some(n => n.k === 'lockin' && n.vars.profit)"), 'and it makes the paper')
        ok(await pg.evaluate("__sw.Achievements.has('lockin')"), 'achievement: Stay for One More')
    else:
        for _ in range(5): ok(True, 'the board finished before the doors opened (nothing to check)')
    await pg.wait_for_timeout(1400)

    # --- Happy Hour: half your stake back if it goes bang
    d = await pg.evaluate(f"{DEAL}(1, 'happy')")
    r = await pg.evaluate("""(() => { const b = __sw.slots[1]; __sw.S.inv.shield = 0; const c0 = __sw.S.coins; let i = 0; while (!b.mine[i] || b.open[i]) i++;
      __sw.invoke(new __sw.DigCommand(b, i)); return { back: __sw.S.coins - c0, half: Math.floor(b.stake / 2), stake: b.stake, result: b.result, over: b.over }; })()""")
    await pg.wait_for_timeout(300)
    t = await pg.evaluate("[...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | ')")
    ok(await pg.evaluate("(__sw.S.run.news || []).some(n => n.k === 'happy' && n.vars.back)"), 'Happy Hour makes the paper too')
    ok(d['tag'] == 'Happy Hour' and r['over'] and r['back'] == r['half'] > 0 and 'Happy Hour: the landlord’s given you' in t,
       f'Happy Hour: a bang gives you half the stake back ({r["back"]} of {r["stake"]}, “{r["result"]}”)')
    await pg.wait_for_timeout(1800)

    # --- three more add-on cards: Doggy Bag, Tea and Toast, Hat Trick
    await pg.evaluate("(() => { __sw.Game.slots.forEach(b => { if (b) { b.over = true; __sw.Game.endBoard(b); } }); __sw.S.addons = [{ id: 'doggy', paid: 50 }, { id: 'tea', paid: 50 }, { id: 'hattrick', paid: 110 }]; __sw.renderAll(); })()")
    await pg.wait_for_timeout(200)
    await pg.evaluate(f"{DEAL}(0, '')")
    r = await pg.evaluate("""(() => { const b = __sw.slots[0]; __sw.S.inv.shield = 0; const c0 = __sw.S.coins; let i = 0; while (!b.mine[i]) i++;
      __sw.invoke(new __sw.DigCommand(b, i)); return { back: __sw.S.coins - c0, fifth: Math.floor(b.stake / 5), over: b.over, result: b.result }; })()""")
    ok(r['over'] and r['back'] == r['fifth'] > 0, f'Doggy Bag: a bang still sends a fifth of the stake home ({r["back"]:,}, “{r["result"]}”)')
    await pg.evaluate(f"{DEAL}(1, '')")
    r = await pg.evaluate("""(() => { const b = __sw.slots[1];
      for (let k = 0; k < 3 && !b.over; k++) { const d = __sw.Solver.full(b); let j = -1; for (let i = 0; i < b.n; i++) if (!b.open[i] && !b.flag[i] && d.KS[i]) { j = i; break; } if (j < 0) break; __sw.invoke(new __sw.DigCommand(b, j)); }
      if (b.over || b.guesses) return null;
      let got = null; __sw.bus.on('board:cashout', e => { if (e.b === b && !got) got = e; });
      const pot = b.pot(); __sw.Game.cashOut(b, 'manual'); return { pot, stake: b.stake, amount: got.amount }; })()""")
    if r:
        want = r['pot'] + (int((r['pot'] - r['stake']) * .15) if r['pot'] > r['stake'] else 0)
        ok(r['amount'] == want, f'Tea and Toast: no risky digs, +15% on the profit ({r["pot"]:,} → {r["amount"]:,})')
    else:
        ok(True, 'the board finished on its own (nothing to check)')
    await pg.evaluate(f"{DEAL}(2, '')")
    r = await pg.evaluate("""(() => { const b = __sw.slots[2]; let fired = 0; __sw.bus.on('addon:fired', e => { if (e.id === 'hattrick' && e.b === b) fired++; });
      for (let k = 0; k < 3 && !b.over; k++) { const d = __sw.Solver.full(b); let j = -1; for (let i = 0; i < b.n; i++) if (!b.open[i] && !b.flag[i] && !b.mine[i] && !d.KS[i] && d.P[i] > 0) { j = i; break; } if (j < 0) break; __sw.invoke(new __sw.DigCommand(b, j)); }
      return { fired, combo: b.combo }; })()""")
    ok(r['fired'] == (1 if r['combo'] >= 3 else 0), f'Hat Trick: the third risky dig gives an extra ×1.3 ({r["combo"]} risky digs, fired {r["fired"]}×)')
    await pg.evaluate("(() => { __sw.S.addons = []; __sw.Game.slots.forEach(b => { if (b) { b.over = true; __sw.Game.endBoard(b); } }); __sw.renderAll(); })()")
    await pg.wait_for_timeout(300)

    # --- a special survives a reload
    await pg.evaluate("(() => { __sw.Game.slots.forEach(b => { if (b) { b.over = true; __sw.Game.endBoard(b); } }); })()")
    await pg.wait_for_timeout(200)
    d = await pg.evaluate(f"{DEAL}(2, 'trouble')")
    await pg.evaluate("__sw.SaveGame.saveNow()")
    await pg.reload(); await pg.wait_for_timeout(1300)
    st = await pg.evaluate("(() => { const b = __sw.slots[2]; return b ? { special: b.special, m: b.m, tag: (b.el.querySelector('.spectag') || {}).textContent || '' } : null; })()")
    ok(st and st['special'] == 'trouble' and st['m'] == d['m'] and st['tag'] == 'Double Trouble', f'a special survives a reload ({st})')

    # --- Halloween's friendly ghost: dig it up and it points out a mine
    await pg.evaluate("(() => { __sw.Game.slots.forEach(b => { if (b) { b.over = true; __sw.Game.endBoard(b); } }); __sw.Seasons.force = 'halloween'; window.__srng = __sw.Seasons.rng; __sw.Seasons.rng = () => 0; })()")
    await pg.wait_for_timeout(200)
    await pg.evaluate(f"{DEAL}(0, '')")
    st = await pg.evaluate("""(() => { const b = __sw.slots[0], g = b.ghost; if (g < 0) return { g };
      let flags0 = 0; for (let i = 0; i < b.n; i++) flags0 += b.flag[i];
      const n0 = __sw.S.life.ghosts || 0; __sw.invoke(new __sw.DigCommand(b, g));
      let flags = 0, right = true; for (let i = 0; i < b.n; i++) if (b.flag[i]) { flags++; if (!b.mine[i]) right = false; }
      return { g, flags0, flags, right, n: (__sw.S.life.ghosts || 0) - n0, gone: b.ghost }; })()""")
    await pg.evaluate("(() => { __sw.Seasons.force = 'none'; __sw.Seasons.rng = window.__srng; })()")
    ok(st['g'] >= 0 and st['flags'] == st['flags0'] + 1 and st['right'] and st['n'] == 1 and st['gone'] == -1,
       f'Halloween: a friendly ghost under a tile; dig it up and it flags a mine for you ({st})')

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
