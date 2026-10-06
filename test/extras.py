"""Experimental suite: scratchcards (the Flip Booth's third tab) and the pub quiz in the group chat."""
from common import Results, open_page


async def text(pg, sel):
    return await pg.evaluate(f"(document.querySelector('{sel}') || {{}}).textContent || ''")


async def scratch_row(pg, row):
    """Drags the mouse back and forth across one row of the foil, like scratching with a coin."""
    box = await (await pg.query_selector('#modalBox .foil')).bounding_box()
    top = box['y'] + box['height'] * row / 3
    await pg.mouse.move(box['x'] + 8, top + 10); await pg.mouse.down()
    for k in range(26):
        await pg.mouse.move(box['x'] + 8 + (k % 2) * (box['width'] - 16), top + 8 + k * box['height'] / 3 / 28, steps=5)
    await pg.mouse.up(); await pg.wait_for_timeout(300)


async def run(browser, url, shots):
    R = Results('extras'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=1200)
    await pg.mouse.click(3, 300)
    # level 5 with no XP so nothing levels up, and every achievement already unlocked so none pays out by surprise
    await pg.evaluate('''(() => { const S = __sw.S; __sw.Coach.finish(); S.coins = 50000; S.upg.flip = 1; S.life.lvl = 5; S.life.xp = 0;
      S.life.ach = Object.fromEntries(__sw.ACHIEVEMENTS.map(a => [a.id, 1])); __sw.renderAll(); })()''')
    await pg.wait_for_timeout(200)

    # --- the shelf: three cards priced from your top table's max stake
    await pg.click('#btnFlip'); await pg.wait_for_timeout(300)
    await pg.click('#modalBox [data-booth="scratch"]'); await pg.wait_for_timeout(300)
    prices = await pg.evaluate("[...document.querySelectorAll('#modalBox .ticket .num')].map(e => e.textContent)")
    ok(prices == ['20', '100', '500'], f'the booth’s Scratchcards tab shows three cards at 2%, 10% and 50% of a 1,000 max stake: {prices}')
    rtp = await pg.evaluate('__sw.SCRATCH_PRIZES.reduce((s, p) => s + p.p * p.x, 0)')
    ok(.9 <= rtp < 1, f'the prize table pays back {rtp:.0%} on average')
    rules = await pg.evaluate('''(() => { const bad = [];
      for (const win of [null, ...__sw.SCRATCH_PRIZES]) for (let k = 0; k < 200; k++) {
        const p = __sw.Scratchcards.panels(win), n = {}; p.forEach(s => n[s] = (n[s] || 0) + 1);
        const three = Object.keys(n).filter(s => n[s] >= 3);
        if (p.length !== 9 || (win ? three.join() !== win.sym || n[win.sym] !== 3 : three.length)) bad.push(p.join());
      } return bad.length; })()''')
    ok(rules == 0, 'every card has nine panels: a winner shows its symbol exactly three times, nothing else (or a loser anything) three times')
    await pg.screenshot(path=str(shots / 'scratch_shelf.png'))

    # --- buy one at the till: the price leaves now, the prize waits until it's scratched
    c0 = await pg.evaluate('__sw.S.coins')
    await pg.click('#modalBox .ticket[data-card="bonanza"]'); await pg.wait_for_timeout(300)
    owed = await pg.evaluate('__sw.S.scratchOwed')
    ok(await pg.evaluate('__sw.S.coins') == c0 - 100 and await pg.evaluate("document.querySelectorAll('#modalBox .spanel').length") == 9,
       f'buying a Cash Bonanza takes 100 and deals nine covered panels (owed until scratched: {owed})')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("!!document.querySelector('#modalBox .scard')"), 'Escape can’t walk off with a half-scratched card')
    await scratch_row(pg, 0)
    opened = await pg.evaluate('__sw.ScratchView.st.open.filter(Boolean).length')
    ok(opened >= 2, f'scratching the top row with the mouse rubs the foil off ({opened} panels open)')
    await pg.screenshot(path=str(shots / 'scratch_card.png'))
    await pg.click('#scratchAll'); await pg.wait_for_timeout(1400)
    res = await text(pg, '#scratchRes')
    ok(await pg.evaluate('__sw.ScratchView.st.open.every(Boolean)') and await pg.evaluate('__sw.S.coins') == c0 - 100 + owed
       and not await pg.evaluate('__sw.S.scratchOwed'), f'“Scratch it all” opens the rest and pays what was owed ({res[:40]})')

    # --- a fixed winner: three gems pay ×20 and unlock Scratch That Itch
    c0 = await pg.evaluate('(() => { delete __sw.S.life.ach.scratch; return __sw.S.coins; })()')
    await pg.evaluate("__sw.ScratchView.play(__sw.Scratchcards.buy('bonanza', 0.305))"); await pg.wait_for_timeout(200)
    await pg.click('#scratchAll'); await pg.wait_for_timeout(1500)
    bonus = await pg.evaluate("__sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === 'scratch'))")
    ok(await pg.evaluate('__sw.S.coins') == c0 - 100 + 2000 + bonus and 'Three gems' in await text(pg, '#scratchRes')
       and await pg.evaluate("__sw.Achievements.has('scratch') && document.querySelectorAll('#modalBox .spanel.match').length === 3"),
       'three gems pay ×20 (2,000), light up, and unlock Scratch That Itch')
    await pg.screenshot(path=str(shots / 'scratch_win.png'))

    # --- leave mid-card (reload): the prize still arrives
    await pg.evaluate("__sw.ScratchView.play(__sw.Scratchcards.buy('dip', 0.01))"); await pg.wait_for_timeout(200)
    c0 = await pg.evaluate('__sw.S.coins')
    await pg.reload(); await pg.wait_for_timeout(1300)
    ok(await pg.evaluate('__sw.S.coins') == c0 + 20 and not await pg.evaluate('__sw.S.scratchOwed'), 'leave a winning card half-scratched and it pays on your next visit')

    # --- skint: the cards you can't afford are greyed out
    await pg.evaluate("(() => { __sw.Coach.finish(); __sw.S.coins = 150; __sw.S.upg.flip = 1; __sw.ScratchView.open(); })()"); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("[...document.querySelectorAll('#modalBox .ticket')].map(b => b.disabled).join()") == 'false,false,true', 'with 150 coins, the Golden Ticket is out of reach')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)

    # --- the pub quiz: a question in the chat, three answers, 25 seconds
    await pg.evaluate("(() => { __sw.Coach.finish(); __sw.S.coins = 5000; __sw.S.life.lvl = 5; __sw.S.life.xp = 0; __sw.S.life.ach = Object.fromEntries(__sw.ACHIEVEMENTS.map(a => [a.id, 1])); __sw.renderAll(); })()")
    L = await pg.evaluate("(() => { const L = __sw.Quiz.ask(0); return { q: L.q, options: L.options, right: L.right, prize: L.prize }; })()")
    shown = await text(pg, '#chat .msg.quiz:last-child .bubble')
    ok('capital of Australia' in shown and await pg.evaluate("document.querySelectorAll('#chat .msg.quiz:last-child .qopt').length") == 3
       and L['options'][L['right']] == 'Canberra', f"a friend asks the chat: “{L['q']}” with three answers ({', '.join(L['options'])})")
    c0 = await pg.evaluate('__sw.S.coins')
    await pg.click(f'#chat .msg.quiz:last-child .qopt[data-k="{L["right"]}"]'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate('__sw.S.coins') == c0 + L['prize'] and await pg.evaluate("!![...document.querySelectorAll('#chat .msg.quiz')].pop().querySelector('.qopt.right:disabled')"),
       f"the right answer pays {L['prize']} and the question closes")
    L = await pg.evaluate("(() => { const L = __sw.Quiz.ask(1); return { right: L.right, answer: L.answer }; })()")
    wrong = (L['right'] + 1) % 3
    c0 = await pg.evaluate('__sw.S.coins'); n0 = await pg.evaluate("document.querySelectorAll('#chat .msg').length")
    await pg.click(f'#chat .msg.quiz:last-child .qopt[data-k="{wrong}"]'); await pg.wait_for_timeout(1600)
    marks = await pg.evaluate("[...document.querySelectorAll('#chat .msg.quiz')].pop().querySelectorAll('.qopt.right, .qopt.wrong').length")
    said = await pg.evaluate("[...document.querySelectorAll('#chat .msg')].slice(-1)[0].textContent")
    ok(await pg.evaluate('__sw.S.coins') == c0 and marks == 2 and L['answer'] in said, f"a wrong answer pays nothing, shows the right one, and someone tells you: “{said.strip()[-60:]}”")
    await pg.evaluate("(() => { __sw.Quiz.SECONDS = 1; __sw.Quiz.ask(2); })()"); await pg.wait_for_timeout(2600)
    said = await pg.evaluate("[...document.querySelectorAll('#chat .msg')].slice(-1)[0].textContent")
    ok(not await pg.evaluate('__sw.Quiz.live') and 'unicorn' in said.lower(), f"too slow: the question closes and the answer comes out (“{said.strip()[-50:]}”)")
    await pg.evaluate("__sw.Quiz.SECONDS = 25")
    # never while a window is open, or with the switch off
    n0 = await pg.evaluate("document.querySelectorAll('#chat .msg.quiz').length")
    await pg.evaluate("(() => { __sw.Keys.help(); __sw.bus.emit('quiz:due'); __sw.UI.closeModal(); __sw.S.quiz = false; __sw.bus.emit('quiz:due'); __sw.S.quiz = true; })()")
    ok(await pg.evaluate("document.querySelectorAll('#chat .msg.quiz').length") == n0 and not await pg.evaluate('__sw.Quiz.live'),
       'no quiz while a window is open, or with “Pub quiz” switched off')
    await pg.evaluate("__sw.bus.emit('quiz:due')")
    ok(await pg.evaluate("document.querySelectorAll('#chat .msg.quiz').length") == n0 + 1, '…and one turns up when it’s due and nothing’s in the way')
    # ten right answers: Know-It-All
    await pg.evaluate("(() => { const k = __sw.Quiz.live.right; delete __sw.S.life.ach.quiz; __sw.S.life.quiz.right = 9; __sw.Quiz.answer(k); })()"); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("__sw.Achievements.has('quiz') && __sw.S.life.quiz.right === 10"), 'the tenth right answer unlocks Know-It-All')
    await pg.screenshot(path=str(shots / 'quiz.png'))
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("!!document.querySelector('#tg-quiz') && /\\d+ right of \\d+/.test(document.querySelector('#stats').textContent)"), 'Stats has the Pub quiz switch and your score')

    ok(not errs, 'no console errors' + (': ' + '; '.join(errs[:3]) if errs else ''))
    await ctx.close()
    return R
