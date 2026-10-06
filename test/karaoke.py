"""Karaoke suite: the notes (timed to the record, swing and all), the scoring (great, good, missed and bum notes), a
standing ovation and what it pays, the machine's rest, being booed off the stage, singing with the sound muted, the
jukebox picking up again after, and the phone."""
from common import Results, open_page

SETUP = """(() => { __sw.Coach.finish(); const S = __sw.S; S.coins = 50000; S.unlocked = ['penny', 'den']; S.sel = 'den'; S.life.lvl = 5; S.life.xp = 0;
  S.life.ach = Object.fromEntries(__sw.ACHIEVEMENTS.map(a => [a.id, 1])); __sw.renderAll(); })()"""
# a stand-in clock for the song, so the test can sing every note bang on time
FAKE = "(() => { window.__kt = 100; window.__realClock = window.__realClock || __sw.KaraokeView.clock; __sw.KaraokeView.clock = () => window.__kt; })()"
SING = """(() => { const K = __sw.KaraokeView, t0 = K.t0; __sw.Karaoke.live.notes.forEach(n => { window.__kt = t0 + n.t; K.press(); }); window.__kt = t0 + __sw.Karaoke.length() + 1; })()"""
TOASTS = "[...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | ')"


async def run(browser, url, shots):
    R = Results('karaoke'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=1200)
    await pg.mouse.click(3, 300)
    await pg.evaluate(SETUP); await pg.wait_for_timeout(200)

    # --- the notes, timed to the record
    st = await pg.evaluate("""(() => { const n = __sw.Karaoke.notes(), T = __sw.TRACK_BY[__sw.KARAOKE.TRACK], beat = 60 / T.bpm, bar = 4 * beat;
      const per = T.bars.map(b => b[2].length).reduce((a, b) => a + b, 0);
      return { n: n.length, per, first: n[0].t - bar, second: n[1].t - bar - beat, swung: n.find(x => Math.abs(x.t - (bar * 3 + 3 * beat + T.swing * beat)) < 1e-9) ? 1 : 0,
        len: __sw.Karaoke.length() - bar * 17 }; })()""")
    ok(st['n'] == 2 * st['per'] == 58 and abs(st['first']) < 1e-9 and abs(st['second']) < 1e-9 and abs(st['len']) < 1e-9,
       f'Last Orders twice through: {st["n"]} notes after a bar to count you in, on the record’s beat')
    ok(st['swung'] == 1, 'the off-beat notes land where the record’s swing puts them')

    # --- the scoring
    sc = await pg.evaluate("""(() => { const n = __sw.Karaoke.notes(), J = (p) => __sw.Karaoke.judge(n, p);
      const spam = n.map(x => x.t).concat([.1, .3, .5, .7]);
      return { perfect: J(n.map(x => x.t)), none: J([]), late: J(n.map(x => x.t + .1)), spam: J(spam) }; })()""")
    ok(sc['perfect']['score'] == 1 and sc['perfect']['great'] == 58, 'every note bang on time: 100%')
    ok(sc['none']['score'] == 0 and sc['none']['miss'] == 58, 'not a note: 0%, all missed')
    ok(sc['late']['good'] == 58 and abs(sc['late']['score'] - .6) < 1e-9, 'a beat behind all the way: all good, none great (60%)')
    ok(sc['spam']['bum'] == 4 and sc['spam']['score'] < 1, f'pressing between the notes costs you (4 bum notes: {sc["spam"]["score"]:.0%})')

    # --- up on stage, from the jukebox: a standing ovation
    await pg.evaluate('delete __sw.S.life.ach.ovation')
    fee = await pg.evaluate('__sw.Karaoke.fee()'); c0 = await pg.evaluate('__sw.S.coins')
    await pg.evaluate(FAKE)
    await pg.click('#btnJuke'); await pg.wait_for_timeout(250)
    ok(f'({fee:,})' in await pg.evaluate("document.getElementById('jukeSing').textContent"), 'the jukebox has a karaoke button, with the fee on it')
    await pg.click('#jukeSing'); await pg.wait_for_timeout(300)
    st = await pg.evaluate("({ notes: document.querySelectorAll('#kLane .kn').length, coins: __sw.S.coins, held: __sw.Music.holds.has('karaoke'), locked: __sw.UI.modalLocked })")
    ok(st['notes'] == 58 and st['coins'] == c0 - fee and st['held'] and st['locked'], f'on stage: 58 notes in the lane, {fee} in the pot, the jukebox waits')
    await pg.screenshot(path=str(shots / 'karaoke.png'))
    await pg.evaluate(SING); await pg.wait_for_timeout(400)
    st = await pg.evaluate(f"({{ coins: __sw.S.coins, msg: document.getElementById('kMsg').textContent, life: __sw.S.life.karaoke, held: __sw.Music.holds.has('karaoke'), toasts: {TOASTS}, banner: document.getElementById('banner').textContent }})")
    ach = await pg.evaluate("__sw.Achievements.reward(__sw.ACHIEVEMENTS.find(a => a.id === 'ovation'))")
    ok(st['coins'] == c0 + 2 * fee + ach and 'Standing ovation' in st['msg'] and '100%' in st['msg'], f'every note sung: a standing ovation, three times the fee back ({st["msg"]})')
    ok(st['life']['ovations'] == 1 and st['life']['best'] == 100 and not st['held'], 'Stats remember it, and the jukebox picks up again')
    ok(await pg.evaluate("__sw.Achievements.has('ovation') && __sw.S.run.news.some(s => s.k === 'karaoke_ovation')"), 'achievement: Standing Ovation, and it’ll be in the paper')
    await pg.wait_for_timeout(2600)
    said = await pg.evaluate("[...document.querySelectorAll('#chat .msg')].slice(-3).map(m => m.textContent).join(' | ')")
    lines = await pg.evaluate("__sw.LINES.karaoke_great.map(l => l[1])")
    ok(any(l in said for l in lines), 'the group chat loved it')
    await pg.click('#kQuit'); await pg.wait_for_timeout(200)

    # --- the machine needs a rest
    await pg.click('#btnJuke'); await pg.wait_for_timeout(250)
    ok('resting' in await pg.evaluate("document.getElementById('jukeSing').textContent"), 'the karaoke machine needs a rest between singers')
    await pg.click('#jukeSing'); await pg.wait_for_timeout(200)
    ok('needs a rest' in await pg.evaluate(TOASTS) and not await pg.evaluate('!!__sw.Karaoke.live'), 'so you can’t go straight back up')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)

    # --- booed off: leave the stage without singing
    await pg.evaluate("(() => { __sw.S.karaokeAt = 0; __sw.KaraokeView.open(); })()"); await pg.wait_for_timeout(200)
    c1 = await pg.evaluate('__sw.S.coins')
    await pg.click('#kQuit'); await pg.wait_for_timeout(300)
    st = await pg.evaluate("({ coins: __sw.S.coins, msg: document.getElementById('kMsg').textContent, out: document.getElementById('kQuit').textContent })")
    ok(st['coins'] == c1 and 'Booed off' in st['msg'] and st['out'] == 'Back to the table', f'leaving the stage without a note: booed off, and the pot stays behind the bar')
    await pg.click('#kQuit'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("__sw.UI.modalClosed() && !__sw.Music.holds.has('karaoke')"), 'Back to the table')

    # --- with the sound muted it still works (the page keeps time)
    await pg.evaluate("(() => { __sw.KaraokeView.clock = window.__realClock; __sw.S.muted = true; __sw.S.karaokeAt = 0; __sw.KaraokeView.open(); })()"); await pg.wait_for_timeout(500)
    st = await pg.evaluate("({ audio: !!__sw.KaraokeView.audio, live: !!__sw.Karaoke.live, moved: document.querySelector('#kLane .kn').style.transform })")
    ok(not st['audio'] and st['live'] and 'translateX' in st['moved'], 'muted: no record, but the notes still slide along on the page’s clock')
    await pg.click('#kQuit'); await pg.wait_for_timeout(200); await pg.click('#kQuit')
    await pg.evaluate("__sw.S.muted = false")

    # --- the invite in the group chat
    await pg.evaluate("(() => { __sw.S.karaokeAt = 0; __sw.KaraokeView.invite(); })()"); await pg.wait_for_timeout(300)
    inv = await pg.evaluate("(() => { const m = [...document.querySelectorAll('#chat .karaoke-invite')].pop(); return m ? m.textContent : ''; })()")
    ok('Grab the mic' in inv and 'Not tonight' in inv, 'now and then the group chat calls you up for karaoke')
    await pg.evaluate("[...document.querySelectorAll('#chat .karaoke-invite')].pop().querySelector('[data-a=\"sing\"]').click()"); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("!!__sw.Karaoke.live && !!document.getElementById('kLane')"), 'Grab the mic: straight up on stage')
    await pg.click('#kQuit'); await pg.wait_for_timeout(200); await pg.click('#kQuit'); await pg.wait_for_timeout(150)

    # --- the phone
    pctx, pp, perrs = await open_page(browser, url, width=360, height=780, mobile=True, wait=1200)
    await pp.evaluate(SETUP)
    await pp.evaluate("__sw.KaraokeView.open()"); await pp.wait_for_timeout(600)
    sw = await pp.evaluate("[document.documentElement.scrollWidth, innerWidth]")
    ok(sw[0] <= sw[1], f'phone: the stage fits without sideways scrolling {sw}')
    await pp.screenshot(path=str(shots / 'phone_karaoke.png'))
    await pp.evaluate("__sw.KaraokeView.end()")
    await pctx.close()

    ok(not errs and not perrs, f'no console errors {(errs + perrs)[:3]}')
    await ctx.close()
    return R
