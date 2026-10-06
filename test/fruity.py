"""Fruity suite (experimental): the fruit machine in the Flip Booth. What it pays back (worked out exactly), a win and
the meter, nudges, holds, the gamble, the jackpot, the stakes, and leaving with a win still in the meter."""
from common import Results, open_page

SETUP = """(() => { __sw.Coach.finish(); const S = __sw.S; S.coins = 50000; S.upg.flip = 1; S.life.lvl = 5; S.life.xp = 0;
  S.life.ach = Object.fromEntries(__sw.ACHIEVEMENTS.map(a => [a.id, 1])); ['nudge', 'gamble3', 'triple7'].forEach(k => delete S.life.ach[k]); __sw.renderAll(); })()"""
# rigging: the reels stop where the test says (Fruity.rng is what picks the stops, then the nudge/hold roll)
HELP = """(() => {
  const F = __sw.FruityRules, N = r => __sw.FRUITY_REELS[r].length;
  window.rig = (...v) => { const q = v.slice(); __sw.Fruity.rng = () => q.length ? q.shift() : Math.random(); };
  window.stop = (r, p) => (((p % N(r)) + N(r)) % N(r) + .5) / N(r);
  window.find = ok => { for (let a = 0; a < N(0); a++) for (let b = 0; b < N(1); b++) for (let c = 0; c < N(2); c++) {
    const pos = [a, b, c]; if (ok(F.line(pos), (r, d) => F.at(r, pos[r] + d), pos)) return pos; } return null; };
  window.rigLine = (want, ...more) => { const pos = find(l => l.join('') === want); rig(...pos.map((p, r) => stop(r, p)), ...more); return pos; };
})()"""
# the payback, exactly: the plain reels, then with nudges and holds for a casual player (auto-hold; a nudge where it
# visibly wins, else at random) and an expert (the best path through the nudges, knowing the bands by heart)
PAYBACK = """(() => { const R = __sw.FruityRules, F = __sw.FRUITY_FEATURES, N = __sw.FRUITY_REELS.map(b => b.length), all = N[0] * N[1] * N[2];
  const each = fn => { for (let a = 0; a < N[0]; a++) for (let b = 0; b < N[1]; b++) for (let c = 0; c < N[2]; c++) fn([a, b, c]); };
  const wN = {}; F.nudges.forEach(n => { wN[n] = (wN[n] || 0) + 1 / F.nudges.length; });
  const casual = (cur, left) => { if (!left) return 0; const w = [0, 1, 2].map(r => R.pay(R.line(R.nudged(cur, r)))), best = Math.max(...w);
    return best || [0, 1, 2].reduce((s, r) => s + casual(R.nudged(cur, r), left - 1), 0) / 3; };
  const nudges = (pos, ex) => Object.entries(wN).reduce((s, [n, p]) => s + p * (ex ? R.bestNudges(pos, +n).pay : casual(pos, +n)), 0);
  const cache = new Map(), heldGo = (pos, held, ex) => { const key = ex + held.map((h, r) => h ? R.at(r, pos[r]) : '-').join('');
    if (!cache.has(key)) { let sum = 0, n = 0; each(p => { const cur = p.map((x, r) => held[r] ? pos[r] : x), w = R.pay(R.line(cur)); sum += w || F.nudge * nudges(cur, ex); n++; });
      cache.set(key, sum / n); } return cache.get(key); };
  const payback = ex => { let ret = 0, held = 0; each(pos => { const w = R.pay(R.line(pos)); if (w) { ret += w; return; }
      ret += F.nudge * nudges(pos, ex); const h = R.bestHold(pos).held; if (h.some(Boolean)) { held += F.hold; ret += F.hold * heldGo(pos, h, ex); } });
    return ret / all / (1 + held / all); };
  let plain = 0, hits = 0; each(pos => { const w = R.pay(R.line(pos)); plain += w; if (w) hits++; });
  return { plain: plain / all, hit: all / hits, casual: payback(false), expert: payback(true) }; })()"""


async def text(pg, sel):
    return await pg.evaluate(f"(document.querySelector('{sel}') || {{}}).textContent || ''")


async def run(browser, url, shots):
    R = Results('fruity'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=1200)
    await pg.mouse.click(3, 300)
    await pg.evaluate(SETUP); await pg.evaluate(HELP); await pg.wait_for_timeout(200)
    reward = "(id => __sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === id)))"
    coins = lambda: pg.evaluate('__sw.S.coins')
    owed = lambda: pg.evaluate('__sw.S.fruityOwed')

    # --- what it pays back, worked out exactly
    pb = await pg.evaluate(PAYBACK)
    ok(abs(pb['plain'] - .404) < .005 and 16 < pb['hit'] < 17.5, f"the plain reels win 1 go in {pb['hit']:.1f} and pay back {pb['plain']:.1%}")
    ok(.85 < pb['casual'] < .91 and .9 < pb['expert'] < .97,
       f"with the nudges and holds it pays back {pb['casual']:.1%} (a casual player) to {pb['expert']:.1%} (knowing the reels by heart): the house still wins")

    # --- the booth's fifth tab
    await pg.click('#btnFlip'); await pg.wait_for_timeout(300)
    await pg.click('#modalBox [data-booth="fruity"]'); await pg.wait_for_timeout(300)
    stakes = await pg.evaluate("[...document.querySelectorAll('#modalBox .fstakes b')].map(e => e.textContent)")
    ok(stakes == ['10', '50', '250'] and await pg.evaluate("document.querySelectorAll('#fReels .reel').length === 3 && [...document.querySelectorAll('#fReels .strip')].every(s => s.children.length === 3)"),
       f'the booth’s Fruity tab: three reels showing three stops each, and three stakes {stakes}')
    await pg.screenshot(path=str(shots / 'fruity.png'))

    # --- a winning go: three lemons pay ×6 into the meter
    c0 = await coins(); pos = await pg.evaluate("rigLine('LLL')")
    await pg.click('#fSpin'); await pg.wait_for_timeout(200)
    ok(await coins() == c0 - 10 and await pg.evaluate("document.querySelector('#fSpin').disabled && !!document.querySelector('.reel.spinning')"), 'Spin takes 10 and the reels spin')
    await pg.wait_for_timeout(1700)
    ok(await pg.evaluate(f"__sw.Fruity.m.pos.join() === '{','.join(map(str, pos))}' && document.querySelector('#fReels').getAttribute('aria-label') === 'The line shows Lemon, Lemon, Lemon'"),
       'they stop on three lemons, where the machine said they would')
    ok(await owed() == 60 and '60' in await text(pg, '#fMeter') and 'Lemons' in await text(pg, '#fMsg')
       and await pg.evaluate("!document.querySelector('#fCollect').hidden && !document.querySelector('#fGamble').hidden"), 'the win (×6 = 60) goes in the meter: Collect or Gamble')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
    ok(await pg.evaluate("!!document.querySelector('#fReels')"), 'Escape can’t walk off with coins in the meter')
    await pg.click('#fCollect'); await pg.wait_for_timeout(200)
    ok(await coins() == c0 + 50 and not await owed(), 'Collect pays it out (+60 for a 10 go)')

    # --- nudges: two oranges, and an orange just above the third reel's line
    pos = await pg.evaluate("""(() => { const pos = find((l, at) => l[0] === 'O' && l[1] === 'O' && l[2] !== 'O' && at(2, -1) === 'O');
      rig(...pos.map((p, r) => stop(r, p)), .01, .01); return pos; })()""")  # the roll (.01) means nudges; .01 again picks one nudge
    await pg.click('#fSpin'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("!document.querySelector('#fNudge').classList.contains('lit')"), 'the lamps stay dark until the reels stop')
    await pg.wait_for_timeout(1600)
    ok(await pg.evaluate("document.querySelector('#fNudge').classList.contains('lit') && document.querySelector('#fNudge b').textContent === '1' && document.querySelector('#fSpin').disabled")
       and await pg.evaluate("[...document.querySelectorAll('.rbtn')].every(b => !b.disabled && /Nudge/.test(b.textContent))"), 'a losing go lights up 1 nudge: the reel buttons say Nudge, and Spin waits')
    await pg.screenshot(path=str(shots / 'fruity_nudge.png'))
    c0, bonus = await pg.evaluate(f"[__sw.S.coins, {reward}('nudge')]")
    await pg.keyboard.press('3'); await pg.wait_for_timeout(600)
    ok(await owed() == 80 and await pg.evaluate("__sw.Fruity.m.pos[2]") == (pos[2] - 1) % 20 and await pg.evaluate("__sw.Achievements.has('nudge')"),
       'nudge reel 3 (the 3 key works too): the orange drops onto the line for ×8, and Nudge Nudge unlocks')
    await pg.click('#fCollect'); await pg.wait_for_timeout(150)
    ok(await coins() == c0 + 80 + bonus, f'collected (+80, +{bonus:,} for the achievement)')
    # turning nudges down
    await pg.evaluate("(() => { const pos = find((l, at) => !__sw.FruityRules.pay(l)); rig(...pos.map((p, r) => stop(r, p)), .01, .99); })()")  # .99 picks the most nudges
    await pg.click('#fSpin'); await pg.wait_for_timeout(1900)
    n = await pg.evaluate("__sw.Fruity.m.nudges")
    await pg.click('#fSkip'); await pg.wait_for_timeout(150)
    ok(n == 2 and await pg.evaluate("__sw.Fruity.m.nudges === 0 && !document.querySelector('#fSpin').disabled && document.querySelector('#fSkip').hidden"), '“No thanks” turns the nudges down')

    # --- holds: two bells; the machine holds them for you
    pos = await pg.evaluate("""(() => { const pos = find(l => l[0] === 'B' && l[1] === 'B' && l[2] !== 'B'); rig(...pos.map((p, r) => stop(r, p)), .3); return pos; })()""")  # .3: holds
    await pg.click('#fSpin'); await pg.wait_for_timeout(1900)
    held = await pg.evaluate("[...document.querySelectorAll('.rbtn')].map(b => b.classList.contains('held'))")
    ok(await pg.evaluate("document.querySelector('#fHold').classList.contains('lit')") and held == [True, True, False]
       and await pg.evaluate("[...document.querySelectorAll('.fstakes button')].every(b => b.disabled)"), 'holds light up, the machine holds the two bells, and the stake is locked')
    await pg.screenshot(path=str(shots / 'fruity_holds.png'))
    await pg.click('.rbtn[data-r="2"]'); await pg.wait_for_timeout(100)
    ok('at most' in await text(pg, '#fMsg') and not await pg.evaluate("__sw.Fruity.m.held[2]"), 'two holds at most')
    await pg.click('.rbtn[data-r="0"]'); await pg.click('.rbtn[data-r="0"]'); await pg.wait_for_timeout(100)
    ok(await pg.evaluate("__sw.Fruity.m.held.join()") == 'true,true,false', 'tap a held reel to let it go, tap again to hold it')
    await pg.evaluate("(() => { const c = [...Array(20).keys()].find(p => __sw.FruityRules.at(2, p) === 'B'); rig(stop(2, c)); })()")
    await pg.click('#fSpin'); await pg.wait_for_timeout(1300)
    ok(await pg.evaluate("__sw.Fruity.m.pos.slice(0, 2).join()") == f'{pos[0]},{pos[1]}' and await owed() == 250, 'the held reels stay put, the third spins in a bell: ×25 = 250')
    ok(await pg.evaluate("[...document.querySelectorAll('.toast')].some(t => /Fruity/.test(t.textContent))"), 'a big win gets a toast')

    # --- the gamble: double or nothing
    await pg.evaluate("rig(.2)"); await pg.click('#fGamble'); await pg.wait_for_timeout(500)
    ok(await pg.evaluate("!document.querySelector('#fGambleLights').hidden && document.querySelector('#fCollect').hidden"), 'Gamble: the lights flash back and forth')
    await pg.screenshot(path=str(shots / 'fruity_gamble.png'))
    await pg.wait_for_timeout(1900)
    ok(await owed() == 500 and 'Doubled' in await text(pg, '#fMsg'), 'and land on Double: 500 in the meter')
    await pg.evaluate("rig(.8)"); await pg.click('#fGamble'); await pg.wait_for_timeout(2800)
    ok(await owed() == 0 and 'Gone' in await text(pg, '#fMsg') and await pg.evaluate("document.querySelector('#fCollect').hidden"), 'or on Lose it: the meter’s empty')
    # three doubles in a row, and then no more
    c0, bonus = await pg.evaluate(f"[__sw.S.coins, {reward}('gamble3')]")
    await pg.evaluate("rigLine('LLL')"); await pg.click('#fSpin'); await pg.wait_for_timeout(1800)
    for _ in range(3):
        await pg.evaluate("rig(.1)"); await pg.click('#fGamble'); await pg.wait_for_timeout(2500)
    ok(await owed() == 480 and await pg.evaluate("__sw.Achievements.has('gamble3') && document.querySelector('#fGamble').disabled"),
       'three doubles in a row (60 → 480) unlock Let It Ride, and that’s the limit')
    await pg.click('#fCollect'); await pg.wait_for_timeout(150)
    ok(await coins() == c0 - 10 + 480 + bonus, 'collected')

    # --- the jackpot
    c0, bonus = await pg.evaluate(f"[__sw.S.coins, {reward}('triple7')]")
    await pg.evaluate("rigLine('777')"); await pg.click('#fSpin'); await pg.wait_for_timeout(1800)
    ok(await owed() == 2500 and await pg.evaluate("__sw.Achievements.has('triple7') && __sw.S.life.fruity.sevens === 1")
       and await pg.evaluate("[...document.querySelectorAll('.banner')].some(b => /JACKPOT/.test(b.textContent))"), 'three sevens: JACKPOT, ×250, and Triple Seven')
    await pg.screenshot(path=str(shots / 'fruity_jackpot.png'))
    await pg.click('#modalBox [data-a="close"]'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate('__sw.UI.modalClosed()') and await coins() == c0 - 10 + 2500 + bonus and not await owed(), 'Leave takes the meter with you')

    # --- P opens it; the stakes
    await pg.evaluate("document.activeElement && document.activeElement.blur()"); await pg.keyboard.press('p'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("!!document.querySelector('#fReels')"), 'P opens the Fruity')
    await pg.click('.fstakes [data-kind="proper"]'); await pg.wait_for_timeout(100)
    ok(await text(pg, '#fSpin') == 'Spin · 50' and await pg.evaluate("document.querySelector('.fstakes [data-kind=\"proper\"]').getAttribute('aria-checked')") == 'true', 'pick a stake: a go costs 50')
    # walk off mid-spin (reload): the win's waiting next time
    c0 = await coins()
    await pg.evaluate("rigLine('LLL')"); await pg.click('#fSpin'); await pg.wait_for_timeout(150)
    await pg.reload(); await pg.wait_for_timeout(1300)
    ok(await coins() == c0 - 50 + 300 and not await owed(), 'reload mid-spin and the win (×6 of 50) pays on your next visit')
    # switching tabs pays the meter too
    await pg.evaluate(SETUP); await pg.evaluate(HELP)
    await pg.evaluate("__sw.FruityView.open()"); await pg.wait_for_timeout(200)
    c0 = await coins(); await pg.evaluate("rigLine('LLL')"); await pg.click('#fSpin'); await pg.wait_for_timeout(1800)
    await pg.click('#modalBox [data-booth="ducks"]'); await pg.wait_for_timeout(300)
    ok(await coins() == c0 + 50 and not await owed(), 'switch to another booth tab and the meter pays out')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
    # skint
    await pg.evaluate("(() => { __sw.S.coins = 5; __sw.renderAll(); __sw.FruityView.open(); })()"); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("document.querySelector('#fSpin').disabled"), 'no go without the coins for it')
    await pg.evaluate("(() => { __sw.S.coins = 50000; __sw.UI.closeModal(); __sw.renderAll(); })()")  # (coins first, or closing would find you bust)
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    st = await text(pg, '#stats')
    ok('The Fruity' in st and 'best ×250' in st and '1 jackpot' in st, 'Stats shows your Fruity record')

    ok(not errs, 'no console errors' + (': ' + '; '.join(errs[:3]) if errs else ''))
    await ctx.close()
    return R
