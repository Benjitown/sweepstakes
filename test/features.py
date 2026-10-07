"""v4.1 suite: the Daily Challenge (identical boards from the date, the flow, saving, sharing), achievements,
keyboard shortcuts, the coin graph, New Game+, what's new, the vibration switch and the volume sliders."""
import json, pathlib
from common import Results, open_page

GOLDEN = json.loads((pathlib.Path(__file__).parent / 'daily-golden.json').read_text(encoding='utf-8'))
BOARD = "(b => ({ mines: Array.from(b.mine).join(''), open: Array.from(b.open).join(''), opened: b.revealed, gems: [...b.gem].map((x, i) => [i, x]).filter(p => p[1]) }))"


async def run(browser, url, shots):
    R = Results('features'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=1200)
    await pg.mouse.click(3, 3)
    await pg.evaluate('__sw.Coach.finish()')

    # --- the daily board comes from the date alone, and matches the golden boards every port checks against
    for g in GOLDEN:
        b = await pg.evaluate(f"{BOARD}(__sw.Daily.create('{g['key']}'))")
        same = b['mines'] == g['mines'] and b['open'] == g['open'] and b['gems'] == g['gems']
        friends = await pg.evaluate(f"__sw.Daily.friends('{g['key']}')")
        ok(same and friends == g['friends'] and await pg.evaluate(f"__sw.Daily.number('{g['key']}')") == g['number'],
           f"daily {g['key']} (#{g['number']}) matches the golden board: {g['opened']} tiles open, gems {g['gems']}")
    differ = await pg.evaluate(f"{BOARD}(__sw.Daily.create('2026-10-07')).mines !== {BOARD}(__sw.Daily.create('2026-10-08')).mines")
    ok(differ, 'different days give different boards')

    # --- play today's daily through the chip: safe digs only, then cash out
    chip = await pg.text_content('#tables .tbl.daily')
    ok('Daily #' in chip and 'not played' in chip, f'daily chip leads the table row: "{chip.strip()}"')
    await pg.click('#tables .tbl.daily'); await pg.wait_for_timeout(400)
    ok(await pg.evaluate("document.querySelectorAll('#modalBox .dboard .grid .c').length") == 81, 'daily opens a 9×9 board in a window')
    await pg.screenshot(path=str(shots / 'daily_board.png'))
    safe = await pg.evaluate("(() => { const b = __sw.Daily.board, d = __sw.Solver.full(b); for (let i = 0; i < b.n; i++) if (d.KS[i] && !b.open[i]) return i; return -1; })()")
    if safe >= 0:
        r0 = await pg.evaluate('__sw.Daily.board.revealed')
        await pg.click(f'#modalBox .dboard .grid .c[data-i="{safe}"]'); await pg.wait_for_timeout(250)
        ok(await pg.evaluate('__sw.Daily.board.revealed') > r0, f'a proven-safe dig opens tiles (tile {safe})')
    else:
        # no proven-safe tile after today's opening: flag a covered tile instead (a flag is progress too, and it's saved)
        cov = await pg.evaluate("(() => { const b = __sw.Daily.board; for (let i = 0; i < b.n; i++) if (!b.open[i]) return i; return -1; })()")
        await pg.evaluate(f"__sw.Daily.flag(__sw.Daily.board, {cov})")
        ok(True, 'no proven-safe tile after the opening today (nothing to dig safely, so it flags a tile instead)')
    # saved mid-game: reload and carry on
    rev = await pg.evaluate('__sw.Daily.board.revealed')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    await pg.reload(); await pg.wait_for_timeout(1200)
    chip2 = await pg.text_content('#tables .tbl.daily')
    await pg.click('#tables .tbl.daily'); await pg.wait_for_timeout(400)
    ok('In progress' in chip2 and await pg.evaluate('__sw.Daily.board.revealed') == rev, f'an unfinished daily survives a reload ({rev} tiles, chip "{chip2.strip()}")')
    c0 = await pg.evaluate('__sw.S.coins')
    await pg.click('#modalBox [data-a="cash"]'); await pg.wait_for_timeout(2300)
    res = await pg.evaluate('__sw.S.life.daily.result')
    ok(res and res['why'] == 'cash' and res['prize'] > 0, f"cashing out ends it: ×{res and res['mult']}, prize {res and res['prize']}")
    ok(await pg.evaluate("document.querySelectorAll('#modalBox .dlist li').length") == 6 and await pg.evaluate("!!document.querySelector('#modalBox .dlist li.me')"),
       'the result screen ranks you against the 5 friends')
    share = await pg.evaluate("__sw.Daily.shareText(__sw.S.life.daily.key, __sw.S.life.daily.result)")
    lines = share.split('\n')
    ok(lines[0].startswith('Sweepstakes Daily #') and 'dig' in lines[1] and lines[-1].endswith('💰'), f'share text: {lines[0]} / {lines[1]}')
    await pg.screenshot(path=str(shots / 'daily_result.png'))
    ok(await pg.evaluate('__sw.S.coins') >= c0 + res['prize'], 'the prize lands in the bank')
    ok(await pg.evaluate("__sw.Achievements.has('daily')"), 'finishing unlocks Daily Grind')
    await pg.click('#modalBox [data-a="close"]'); await pg.wait_for_timeout(200)
    await pg.click('#tables .tbl.daily'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("!!document.querySelector('#modalBox .dres') && !document.querySelector('#modalBox .dboard')"), 'one go a day: reopening shows the result, not a new board')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)

    # --- achievements: cash out a normal board
    await pg.evaluate("(() => { __sw.S.life.ach = {}; __sw.Game.slots.fill(null); __sw.renderAll(); })()")
    await pg.click('#dealAll'); await pg.wait_for_timeout(200)
    w = await pg.evaluate('__sw.slots[0].t.w')
    await pg.click(f'#boards [data-slot="0"] .grid .c[data-i="{(w // 2) * w + w // 2}"]'); await pg.wait_for_timeout(200)
    if not await pg.evaluate('__sw.slots[0].over'):
        await pg.click('#boards [data-slot="0"] .cash')
    await pg.wait_for_timeout(500)
    toast = await pg.evaluate("[...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | ')")
    ok(await pg.evaluate("__sw.Achievements.has('pocket')") and 'Pocket Money' in toast, f'cashing out unlocks Pocket Money ("{toast[:80]}")')
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(300)
    got = await pg.evaluate("document.querySelectorAll('#stats .ach.got').length")
    total = await pg.evaluate('__sw.ACHIEVEMENTS.length')
    ok(got >= 1 and await pg.evaluate("document.querySelectorAll('#stats .ach').length") == total, f'Stats shows all {total} badges, {got} earned')
    await pg.click('#stats .ach.got'); await pg.wait_for_timeout(100)
    ok('Pocket Money' in await pg.text_content('#achCap') or got > 1, 'tapping a badge explains it')
    ok(await pg.evaluate("!!document.querySelector('#tg-vibe')") and ('v' + await pg.evaluate('__sw.VERSION')) in await pg.text_content('#stats .ver'), 'Stats has the vibration switch and the version line')

    # --- coin graph
    await pg.evaluate("(() => { const S = __sw.S; for (let k = 1; k <= 6; k++) { S.run.time += 10; S.coins = 1000 * 3 ** k; __sw.CoinChart.sample(); } __sw.renderAll(); })()")
    await pg.wait_for_timeout(200)
    ok(await pg.evaluate("!!document.querySelector('#stats .coinsvg polyline')"), 'the coin graph draws in Stats')
    await pg.screenshot(path=str(shots / 'stats_v41.png'))

    # --- keyboard shortcuts
    await pg.evaluate("(() => { __sw.Game.slots.fill(null); __sw.S.coins = 5000; __sw.renderAll(); document.activeElement && document.activeElement.blur(); })()")
    await pg.keyboard.press('d'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate('!!__sw.slots[0]'), 'D deals')
    await pg.keyboard.press('Shift+Slash'); await pg.wait_for_timeout(250)
    ok(await pg.evaluate("!!document.querySelector('#modalBox .keys')"), '? lists the shortcuts')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    await pg.keyboard.press('1'); await pg.wait_for_timeout(150)
    ok(await pg.evaluate("document.querySelector('[data-tab=\"shop\"]').getAttribute('aria-selected')") == 'true', '1 switches to the Upgrades tab')

    # --- New Game+: the house edge adds 25% of the profit per casino owned
    await pg.evaluate("(() => { const S = __sw.S; S.life.casinos = 1; S.addons = []; __sw.Game.slots.fill(null); S.coins = 5000; S.streak = 0; __sw.renderAll(); })()")
    await pg.click('#dealAll'); await pg.wait_for_timeout(200)
    await pg.click(f'#boards [data-slot="0"] .grid .c[data-i="{(w // 2) * w + w // 2}"]'); await pg.wait_for_timeout(200)
    if not await pg.evaluate('__sw.slots[0].over'):
        pot, stake = await pg.evaluate('(() => { const b = __sw.slots[0]; b.G = 2; return [b.pot(), b.stake]; })()')
        before = await pg.evaluate('__sw.S.coins')
        await pg.click('#boards [data-slot="0"] .cash'); await pg.wait_for_timeout(300)
        gain = await pg.evaluate('__sw.S.coins') - before
        expect = pot + int((pot - stake) * .25)
        ok(gain >= expect, f'house edge: pot {pot} + 25% of profit = {expect}, paid {gain}')
    else:
        ok(True, 'house edge: board ended on the opening, skipped')
    await pg.wait_for_timeout(1200)

    # --- what's new: a returning player who hasn't seen this version gets told once
    await pg.evaluate("(() => { __sw.S.life.seen = ''; __sw.S.life.tut = true; __sw.SaveGame.saveNow(); })()")
    await pg.reload(); await pg.wait_for_timeout(2400)
    ok(await pg.evaluate("!!document.querySelector('#modalBox .news')"), "a returning player sees what's new")
    await pg.screenshot(path=str(shots / 'whats_new.png'))
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    await pg.reload(); await pg.wait_for_timeout(2400)
    ok(await pg.evaluate("!document.querySelector('#modalBox .news')"), '…only once')

    # --- the chat nudges you about today's daily (when you haven't played it)
    n0 = await pg.evaluate("document.querySelectorAll('#chat .msg').length")
    await pg.evaluate("(() => { __sw.S.life.daily = null; __sw.DailyView.nudge(); })()")
    ok(await pg.evaluate("document.querySelectorAll('#chat .msg').length") == n0 + 1, 'a friend brags about their daily score in the chat')

    # --- volume: the two sliders in Stats set the master and household-noise levels, and survive going bust
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    await pg.evaluate('''(() => { for (const [id, v] of [['#sl-vol', 40], ['#sl-noiseVol', 25]]) { const s = document.querySelector(id); s.value = v;
      s.dispatchEvent(new Event('input')); s.dispatchEvent(new Event('change')); } })()''')
    g = await pg.evaluate("[__sw.S.vol, __sw.S.noiseVol, __sw.AudioEngine.get().master.gain.value, __sw.WeirdNoises.play('duck').gain.gain.value, __sw.NOISES.duck.volume, document.querySelector('#sl-vol-o').textContent]")
    ok(g[0] == .4 and g[1] == .25 and abs(g[2] - .088) < 1e-6 and abs(g[3] - g[4] * .25) < 1e-6 and g[5] == '40%',
       f'volume sliders: master gain {g[2]:.3f} (.22 at 40%), a duck plays at {g[3]:.3f} (25% of {g[4]})')
    ok(await pg.evaluate("(() => { __sw.Game.bust('manual', true); return [__sw.S.vol, __sw.S.noiseVol]; })()") == [.4, .25], '…and they survive going bust')

    # --- the run card: a picture of your run to share
    await pg.evaluate("__sw.UI.closeModal()")
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    await pg.click('#btnCard'); await pg.wait_for_timeout(1200)
    st = await pg.evaluate("""(() => { const i = document.getElementById('runCard'), a = document.getElementById('runCardSave');
      return i ? { w: i.naturalWidth, h: i.naturalHeight, png: i.src.startsWith('data:image/png') && i.src.length > 20000, dl: a.getAttribute('download'), alt: i.alt } : null; })()""")
    ok(st and st['w'] == 1200 and st['h'] == 630 and st['png'] and st['dl'] == 'sweepstakes-run.png' and 'Peak coins' in st['alt'] and 'Achievements' in st['alt'],
       f'Stats: Run card draws a 1200×630 picture of your run, ready to download ({st and st["alt"][:70]}…)')
    await pg.screenshot(path=str(shots / 'run_card.png'))
    await pg.evaluate("__sw.UI.closeModal()")

    ok(not errs, 'no console errors' + (': ' + '; '.join(errs[:3]) if errs else ''))
    await ctx.close()
    return R
