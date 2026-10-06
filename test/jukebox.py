"""Jukebox suite: the records (every note is a real note and fits its bar), putting one on, every record playing,
shuffle, the Music switch and slider, J, and when the music stops: muted, outside, a power cut (the record winds down)
and a fresh run (your record carries over)."""
from common import Results, open_page

SETUP = """(() => { __sw.Coach.finish(); const S = __sw.S; S.coins = 50000; S.unlocked = ['penny', 'den']; S.sel = 'den'; S.life.lvl = 5; S.life.xp = 0;
  S.life.ach = Object.fromEntries(__sw.ACHIEVEMENTS.map(a => [a.id, 1])); __sw.renderAll(); })()"""
# every way a record could be written wrong
CHECK = """(() => { const bad = [];
  for (const T of __sw.TRACKS) { const n = T.beats * T.sub, at = (k, what) => bad.push(`${T.id} bar ${k + 1}: ${what}`);
    if (!__sw.RECORDS[T.id]) bad.push(T.id + ': no name on the jukebox');
    T.bars.forEach(([ch, low, tune], k) => {
      (Array.isArray(ch) ? ch : [ch]).forEach(c => c.split(' ').forEach(x => { if (!__sw.musicMidi(x)) at(k, 'chord note ' + x); }));
      const lows = low.split(' '); if (n % lows.length) at(k, 'the bass doesn’t divide the bar');
      lows.forEach(x => { if (x !== '_' && !__sw.musicMidi(x)) at(k, 'bass note ' + x); });
      tune.forEach(([s, x, len]) => { if (!__sw.musicMidi(x)) at(k, 'tune note ' + x); if (s + len > n) at(k, 'the tune runs over the bar'); });
    });
    for (const [d, [pat]] of Object.entries(T.drums)) if (pat.length !== n) bad.push(`${T.id}: the ${d} pattern isn’t a bar long`);
    T.comp.forEach(([s]) => { if (s >= n) bad.push(`${T.id}: a chord after the end of the bar`); });
  } return bad; })()"""
STATE = """(() => ({ id: __sw.Music.id, on: !!__sw.Music.timer, notes: __sw.Music.notes, track: __sw.S.track, music: __sw.S.music,
  now: (document.querySelector('#jukeNow') || {}).textContent || '', pressed: (document.querySelector('#modalBox .jrec[aria-pressed="true"]') || {dataset: {}}).dataset.rec,
  ahead: __sw.Music.ctx ? __sw.Music.at - __sw.Music.ctx.currentTime : 0, holds: [...__sw.Music.holds] }))()"""


async def run(browser, url, shots):
    R = Results('jukebox'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=1200)
    await pg.mouse.click(3, 300)  # a tap unlocks the audio
    await pg.evaluate(SETUP); await pg.wait_for_timeout(200)

    bad = await pg.evaluate(CHECK)
    ok(not bad, f'every record’s notes are real notes that fit their bars {bad[:6]}')
    ok(await pg.evaluate("__sw.S.music === true && __sw.S.track === 'lounge' && __sw.S.musicVol === __sw.MUSIC.VOL"), 'a fresh save: the jukebox is on, with the lounge record, at 60%')
    ok(await pg.evaluate("!__sw.Music.timer && __sw.Music.holds.has('test')"), 'the tests keep it quiet until one puts a record on')

    # --- the jukebox button
    await pg.click('#btnJuke'); await pg.wait_for_timeout(300)
    recs = await pg.evaluate("[...document.querySelectorAll('#modalBox .jrec')].map(b => b.dataset.rec)")
    ok(recs == ['lounge', 'pub', 'chip', 'waltz', 'shuffle'], f'the jukebox: four records and shuffle {recs}')
    st = await pg.evaluate(STATE)
    ok(st['pressed'] == 'lounge', f'the lounge record is the one that’s down ({st["pressed"]})')
    await pg.evaluate("__sw.Music.holds.delete('test')")
    await pg.click('#modalBox .jrec[data-rec="chip"]'); await pg.wait_for_timeout(1000)
    st = await pg.evaluate(STATE)
    ok(st['on'] and st['id'] == 'chip' and st['track'] == 'chip' and st['notes'] > 20, f'B1 goes on: Insert Coin plays ({st["notes"]} notes queued)')
    ok('Now playing: Insert Coin by 8-Bit Kev' in st['now'] and st['pressed'] == 'chip', f'now playing: “{st["now"].strip()}”')
    ok(0 < st['ahead'] <= 2.5, f'the music stays a little ahead of the audio clock ({st["ahead"]:.2f}s)')
    toasts = await pg.evaluate("[...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | ')")
    ok('The jukebox is on' in toasts and await pg.evaluate('__sw.S.life.juke === 1'), 'the first time it plays, a toast says where the jukebox is')
    await pg.screenshot(path=str(shots / 'jukebox.png'))

    # --- every record plays
    await pg.evaluate("delete __sw.S.life.ach.records")
    for rid in ['lounge', 'pub', 'waltz']:
        n0 = await pg.evaluate('__sw.Music.notes')
        await pg.click(f'#modalBox .jrec[data-rec="{rid}"]'); await pg.wait_for_timeout(700)
        st = await pg.evaluate(STATE)
        ok(st['on'] and st['id'] == rid and st['notes'] > n0, f'{rid} plays ({st["notes"] - n0} notes)')
    ok(await pg.evaluate("__sw.Achievements.has('records')"), 'achievement: Name That Tune, for putting every record on')
    said = await pg.evaluate("[...document.querySelectorAll('#chat .msg')].slice(-3).map(m => m.textContent)")
    ok(any(s for s in said), 'someone in the chat has an opinion about the record')
    await pg.evaluate("__sw.Music.play('shuffle')"); await pg.wait_for_timeout(400)
    st = await pg.evaluate(STATE)
    ok(st['on'] and st['id'] in ('lounge', 'pub', 'chip', 'waltz') and st['track'] == 'shuffle', f'shuffle picks a record ({st["id"]})')
    ok(await pg.evaluate("[...Array(30)].every(() => __sw.Music.pick('pub') !== 'pub')"), 'shuffle never plays the same record twice running')
    await pg.evaluate("(() => { __sw.Music.k = __sw.TRACK_BY[__sw.Music.id].bars.length - 1; __sw.Music.loop = __sw.MUSIC.SHUFFLE_LOOPS - 1; __sw.Music.at = 0; })()")
    was = st['id']; await pg.wait_for_timeout(500)
    st = await pg.evaluate(STATE)
    ok(st['on'] and st['id'] != was, f'after a few times round, shuffle moves on ({was} → {st["id"]})')

    # --- the Halloween record (only in its season)
    await pg.evaluate("(() => { __sw.Seasons.force = 'halloween'; __sw.JukeboxView.open(); })()"); await pg.wait_for_timeout(250)
    recs = await pg.evaluate("[...document.querySelectorAll('#modalBox .jrec')].map(b => b.dataset.rec)")
    await pg.click('#modalBox .jrec[data-rec="haunted"]'); await pg.wait_for_timeout(600)
    st = await pg.evaluate(STATE)
    ok('haunted' in recs and st['on'] and st['id'] == 'haunted' and 'The Haunted Arcade' in st['now'], f'in October the jukebox has a spooky record, and it plays ({recs})')
    await pg.evaluate("(() => { __sw.Seasons.force = 'xmas'; __sw.JukeboxView.open(); })()"); await pg.wait_for_timeout(250)
    await pg.click('#modalBox .jrec[data-rec="xmas"]'); await pg.wait_for_timeout(600)
    st = await pg.evaluate(STATE)
    ok(st['on'] and st['id'] == 'xmas' and 'Tinsel on the Telly' in st['now'] and not await pg.evaluate("!!document.querySelector('#modalBox .jrec[data-rec=\"haunted\"]')"), 'at Christmas it’s a Christmas one instead')
    await pg.evaluate("(() => { __sw.Seasons.force = 'none'; __sw.Music.play('lounge'); __sw.JukeboxView.open(); })()"); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("!document.querySelector('#modalBox .jrec[data-rec=\"haunted\"]') && !document.querySelector('#modalBox .jrec[data-rec=\"xmas\"]') && __sw.Music.pick() === 'lounge'"), 'out of season, they’re gone')

    # --- switching it off and on
    await pg.click('#jukeOff'); await pg.wait_for_timeout(300)
    st = await pg.evaluate(STATE)
    ok(not st['on'] and st['music'] is False and 'off' in st['now'], f'Switch it off: the music stops ({st["now"].strip()})')
    await pg.click('#jukeOff'); await pg.wait_for_timeout(400)
    st = await pg.evaluate(STATE)
    ok(st['on'] and st['music'] is True, 'Switch it on: it plays again')
    await pg.evaluate("__sw.Music.play('lounge')")
    await pg.evaluate("(() => { const i = document.querySelector('#jukeVol'); i.value = 30; i.dispatchEvent(new Event('input')); })()"); await pg.wait_for_timeout(400)
    g = await pg.evaluate('__sw.Music.out.gain.value')
    ok(abs(g - .5 * .3) < .02 and await pg.evaluate('__sw.S.musicVol') == .3, f'the Music slider turns it down (gain {g:.3f})')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    await pg.evaluate("__sw.bus.emit('bust', { reason: 'broke' })"); await pg.wait_for_timeout(250)
    g2 = await pg.evaluate('__sw.Music.out.gain.value')
    ok(g2 < .15 * .5, f'going bust: a record scratch, and the music ducks (gain {g2:.3f})')
    await pg.wait_for_timeout(2200)
    ok(abs(await pg.evaluate('__sw.Music.out.gain.value') - .15) < .02, 'then it comes back up')

    await pg.evaluate("__sw.Music.duck(true)"); await pg.wait_for_timeout(500)
    gd = await pg.evaluate('__sw.Music.out.gain.value')
    await pg.evaluate("__sw.Music.duck(false)"); await pg.wait_for_timeout(500)
    gu = await pg.evaluate('__sw.Music.out.gain.value')
    ok(abs(gd - .15 * .25) < .01 and abs(gu - .15) < .01, f'while Nan calls the bingo the record goes down, then back up ({gd:.3f} → {gu:.3f})')

    # --- muted, outside, a power cut
    await pg.click('#btnMute'); await pg.wait_for_timeout(300)
    ok(not await pg.evaluate('!!__sw.Music.timer'), 'muting stops the music')
    await pg.click('#btnMute'); await pg.wait_for_timeout(400)
    ok(await pg.evaluate('!!__sw.Music.timer'), 'unmuting starts it again')
    await pg.evaluate("(() => { __sw.HouseholdView.clear(); __sw.OutsideView.open(); })()"); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("__sw.Outside.on && !__sw.Music.timer && __sw.Music.holds.has('outside')"), 'outside: the jukebox is inside, so you can’t hear it')
    await pg.click('#grassIn'); await pg.wait_for_timeout(400)
    await pg.evaluate("__sw.UI.closeModal()")
    ok(await pg.evaluate('!__sw.Outside.on && !!__sw.Music.timer'), 'back in: the music’s still on')
    await pg.evaluate("(() => { __sw.Game.deal(0); __sw.PowerCut.start(30); })()"); await pg.wait_for_timeout(300)
    det = await pg.evaluate("__sw.Music.ctx && __sw.Music.holds.has('power') && !__sw.Music.timer")
    ok(det, 'a power cut: the jukebox goes with the lights (the record winds down)')
    await pg.keyboard.press('j'); await pg.wait_for_timeout(300)
    ok('No power' in await pg.evaluate("(document.querySelector('#jukeNow') || {}).textContent || ''"), 'J opens the jukebox, which says there’s no power')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
    await pg.evaluate("__sw.PowerCut.end('topup')"); await pg.wait_for_timeout(400)
    ok(await pg.evaluate("!__sw.Music.holds.has('power') && !!__sw.Music.timer"), 'the lights come back on, and so does the music')

    # --- the Stats tab: a Music slider and switch
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(250)
    ok(await pg.evaluate("!!document.querySelector('#sl-musicVol') && document.querySelector('#sl-musicVol').value === '30'"), 'Stats: a Music slider, where you left it')
    await pg.click('#tg-music'); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("__sw.S.music === false && !__sw.Music.timer"), 'Stats: the Music switch turns it off')
    await pg.click('#tg-music'); await pg.wait_for_timeout(400)
    ok(await pg.evaluate("__sw.S.music === true && !!__sw.Music.timer"), '…and on again')
    await pg.click('[data-tab="shop"]')

    # --- a fresh run keeps your record
    await pg.evaluate("(() => { __sw.Music.play('waltz'); __sw.Game.resetRun(); })()"); await pg.wait_for_timeout(300)
    ok(await pg.evaluate("__sw.S.track === 'waltz' && __sw.S.musicVol === .3 && __sw.S.music === true"), 'a fresh run keeps your record and your volume')
    await pg.evaluate("(() => { __sw.Music.holds.add('test'); __sw.Music.sync(); })()")

    ok(not errs, f'no console errors {errs[:3]}')
    await ctx.close()
    return R
