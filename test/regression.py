"""Regression suite: 25 checks across boards, gems, golden boards, the mine chain, payouts, banners, rank,
the add-on rack, the shop and bots, saving, the spin wheel, Ascension, Double or Nothing, chat, quips and the tutorial."""
from common import Results, open_page

async def hold(pg, ms=1600):
    b=await pg.query_selector('#holdBtn'); box=await b.bounding_box()
    await pg.mouse.move(box['x']+box['width']/2, box['y']+box['height']/2); await pg.mouse.down(); await pg.wait_for_timeout(ms); await pg.mouse.up()
async def play_board(pg, slot, maxsteps=80):
    for _ in range(maxsteps):
        info=await pg.evaluate(f'''(()=>{{const b=__sw.slots[{slot}]; if(!b||b.over) return null; const d=__sw.Solver.full(b);
           let s=-1; for(let i=0;i<b.n;i++) if(d.KS[i]&&!b.open[i]&&!b.flag[i]){{s=i;break}}
           let g=-1,gp=2; for(let i=0;i<b.n;i++){{ if(b.open[i]||b.flag[i]||d.P[i]>=1) continue; if(d.P[i]<gp){{gp=d.P[i];g=i}} }}
           return {{s,g}}}})()''')
        if not info: return
        tgt = info['s'] if info['s']>=0 else info['g']
        await pg.click(f'#boards [data-slot="{slot}"] .grid .c[data-i="{tgt}"]'); await pg.wait_for_timeout(50)
async def fresh(pg, setup=''):
    # every achievement pre-unlocked, so their payouts don't move the coin counts these checks compare
    await pg.evaluate(f"(()=>{{__sw.Coach.finish(); __sw.Game.slots.fill(null); __sw.S.life.ach=Object.fromEntries(__sw.ACHIEVEMENTS.map(a=>[a.id,1])); {setup}; __sw.renderAll();}})()"); await pg.wait_for_timeout(150)
async def deal_open(pg, slot=0):
    await pg.click('#dealAll'); await pg.wait_for_timeout(200)
    w=await pg.evaluate(f'__sw.slots[{slot}].t.w')
    await pg.click(f'#boards [data-slot="{slot}"] .grid .c[data-i="{(w//2)*w+w//2}"]'); await pg.wait_for_timeout(150)

async def run(browser, url, shots):
    R = Results('regression'); ok = R.ok
    ctx, pg, errs = await open_page(browser, url, wait=900)
    await pg.mouse.click(3, 3)
    await fresh(pg)
    # 1. manual board
    await deal_open(pg); c0=await pg.evaluate('__sw.S.coins')
    await play_board(pg, 0); await pg.wait_for_timeout(2300)
    r=await pg.evaluate('__sw.S.run'); ok(r['wins']+r['losses']==1, f"manual board finished W{r['wins']}/L{r['losses']} coins {c0}->{await pg.evaluate('__sw.S.coins')}, xp {await pg.evaluate('JSON.stringify([__sw.S.life.lvl, __sw.S.life.xp])')}")
    # 2. gems: dig a gem tile directly
    await fresh(pg, "__sw.S.coins=5000")
    await deal_open(pg)
    gi=await pg.evaluate("(()=>{const b=__sw.slots[0];for(let i=0;i<b.n;i++) if(b.gem[i]&&!b.open[i]) return i; return -1})()")
    J0=await pg.evaluate("__sw.slots[0].J"); x=await pg.evaluate(f"__sw.slots[0].gem[{gi}]")
    await pg.click(f'#boards [data-slot="0"] .grid .c[data-i="{gi}"]'); await pg.wait_for_timeout(250)
    J1=await pg.evaluate("__sw.slots[0].J")
    cls=await pg.evaluate(f"document.querySelector('#boards [data-slot=\"0\"] .grid .c[data-i=\"{gi}\"]').className")
    ok(gi>=0 and abs(J1-J0*x)<1e-6 and 'gem' in cls, f'gem tile {gi} (×{x}) multiplies the pot: J {J0}->{J1}, class "{cls}"')
    await pg.screenshot(path=str(shots / 'a0_gem.png'))
    ok(await pg.evaluate("document.querySelector('#boards [data-slot=\"0\"] .gemct b').textContent")=='1/1', 'gem counter shows 1/1')
    if not await pg.evaluate("__sw.slots[0].over"):  # a big gem can finish the board on its own (limit reached)
        await pg.click('#boards [data-slot="0"] .cash')
    await pg.wait_for_timeout(1500)
    # 3. golden board via goldNext
    await fresh(pg, "__sw.S.coins=5000;__sw.S.goldNext=1")
    await pg.click('#dealAll'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("__sw.slots[0].golden && __sw.slots[0].J===2 && __sw.slots[0].lim===6 && document.querySelector('#boards [data-slot=\"0\"]').classList.contains('golden')"), 'golden board: ×2, limit doubled, gold frame')
    await pg.screenshot(path=str(shots / 'a1_golden.png'))
    # 4. chain: fuse -> shield -> boom, and near-miss subline
    await fresh(pg, "__sw.S.coins=5000;__sw.S.addons=[{id:'fuse',paid:280}];__sw.S.inv.shield=1;__sw.S.goldNext=0")
    await deal_open(pg)
    mines=await pg.evaluate("(()=>{const b=__sw.slots[0];const a=[];for(let i=0;i<b.n;i++) if(b.mine[i]&&!b.flag[i]) a.push(i);return a})()")
    await pg.click(f'#boards [data-slot="0"] .grid .c[data-i="{mines[0]}"]'); await pg.wait_for_timeout(150)
    ok(await pg.evaluate("!__sw.slots[0].over && __sw.slots[0].fuseUsed"), 'Spare Fuse absorbs first mine')
    await pg.click(f'#boards [data-slot="0"] .grid .c[data-i="{mines[1]}"]'); await pg.wait_for_timeout(150)
    ok(await pg.evaluate("!__sw.slots[0].over && __sw.S.inv.shield===0"), 'Shield absorbs second mine')
    await pg.click(f'#boards [data-slot="0"] .grid .c[data-i="{mines[2]}"]'); await pg.wait_for_timeout(250)
    st=await pg.evaluate("document.querySelector('#boards [data-slot=\"0\"] .stamp')?.textContent")
    ok(await pg.evaluate("__sw.slots[0].over"), f'third mine explodes; stamp says "{st}"')
    await pg.screenshot(path=str(shots / 'a2_boom.png')); await pg.wait_for_timeout(1800)
    # 5. payout decorators
    await fresh(pg, "__sw.S.coins=5000;__sw.S.addons=[{id:'egg',paid:60},{id:'flagfan',paid:60}];__sw.S.goldNext=0")
    await deal_open(pg)
    await pg.evaluate("(()=>{const b=__sw.slots[0];b.guesses=1;for(let i=0;i<b.n;i++) if(b.mine[i]){b.flag[i]=1;break}})()")
    pot=await pg.evaluate("__sw.slots[0].pot()"); stake=await pg.evaluate("__sw.slots[0].stake"); before=await pg.evaluate('__sw.S.coins')
    await pg.click('#boards [data-slot="0"] .cash'); await pg.wait_for_timeout(200)
    after=await pg.evaluate('__sw.S.coins'); egg=int(stake*.1); expect=pot+egg; expect+=int(expect*.02)
    lvl_reward=await pg.evaluate('0')
    ok(after-before>=expect, f'payout decorators: pot {pot} + egg {egg} + flags 2% = {expect}, got {after-before} (incl. any level-up bonus)')
    await pg.wait_for_timeout(1300)
    # 6. big win banner on a human board
    await fresh(pg, "__sw.S.coins=50000;__sw.S.unlocked=['penny','den'];__sw.S.sel='den';__sw.S.goldNext=0")
    await deal_open(pg)
    await pg.evaluate("(()=>{const b=__sw.slots[0];b.G=7;})()")
    await pg.click('#boards [data-slot="0"] .cash'); await pg.wait_for_timeout(500)
    ban=await pg.evaluate("(()=>{const e=document.querySelector('#banner');return e.hidden?null:e.textContent})()")
    await pg.screenshot(path=str(shots / 'a3_bigwin.png'))
    ok(bool(ban) and 'WIN' in ban, f'big win banner: "{ban}"')
    await pg.wait_for_timeout(1500)
    # 7. level up
    lv0=await pg.evaluate('__sw.S.life.lvl'); c0=await pg.evaluate('__sw.S.coins')
    await pg.evaluate("__sw.Rank.award(5000)"); await pg.wait_for_timeout(400)
    await pg.screenshot(path=str(shots / 'a4_levelup.png'))
    ok(await pg.evaluate('__sw.S.life.lvl')>lv0 and await pg.evaluate('__sw.S.coins')>c0, f"level up {lv0}->{await pg.evaluate('__sw.S.life.lvl')}, coins {c0}->{await pg.evaluate('__sw.S.coins')}")
    await pg.wait_for_timeout(1800)
    # 8. rack
    await fresh(pg, "__sw.S.addons=[];__sw.S.coins=1e6")
    await pg.click('[data-tab="rack"]'); await pg.wait_for_timeout(200)
    await pg.click('#rack [data-buy="0"]'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("__sw.S.addons.length===1"), 'bought an add-on')
    await pg.click('#addons .acard', force=True); await pg.wait_for_timeout(200); await pg.click('[data-a="sell"]'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("__sw.S.addons.length===0"), 'sold it')
    await pg.click('#reroll'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("__sw.S.rerolls===1"), 'rerolled')
    # 9. buy upgrades through the shop, bots run 4 boards
    await fresh(pg, "__sw.S.coins=5e8;__sw.S.unlocked=['penny','den','alley','roller'];__sw.S.sel='alley';__sw.S.stakes.alley=50000")
    await pg.click('[data-tab="shop"]'); await pg.wait_for_timeout(150)
    for name in ['Flag Goblin','Autominer','Extra Board','Extra Board','Extra Board','Overclock','Overclock','Coward Chip','Galaxy Brain','Degenerate Loop','Dodgy Goggles']:
        await pg.evaluate(f'''(()=>{{const it=[...document.querySelectorAll('#shop .item')].find(x=>x.querySelector('b').textContent.startsWith('{name}'));const b=it&&it.querySelector('button');if(b&&!b.disabled)b.click();}})()''')
        await pg.wait_for_timeout(60)
    u=await pg.evaluate('__sw.S.upg'); ok(u.get('boards')==3 and u.get('restake')==1 and u.get('overclock')==2, f'upgrades bought {u}')
    await pg.click('#dealAll'); await pg.wait_for_timeout(300)
    for s in range(4):
        await pg.evaluate(f"(()=>{{const b=__sw.slots[{s}]; if(b) __sw.invoke(new __sw.DigCommand(b, Math.floor(b.t.h/2)*b.t.w+Math.floor(b.t.w/2), 'bot'))}})()")
    r0=await pg.evaluate('__sw.S.run'); c0=await pg.evaluate('__sw.S.coins')
    await pg.wait_for_timeout(15000)
    r1=await pg.evaluate('__sw.S.run'); c1=await pg.evaluate('__sw.S.coins')
    ok(r1['boards']-r0['boards']>=5, f"bots cycle boards: +{r1['boards']-r0['boards']} boards, W{r1['wins']-r0['wins']} L{r1['losses']-r0['losses']}, coins {c0:.3g}->{c1:.3g}")
    await pg.screenshot(path=str(shots / 'a5_bots.png'))
    # 10. memento incl. gems/golden
    await pg.evaluate("(()=>{const b=__sw.slots.find(x=>x&&!x.over); if(b){b.golden=true;}})()")
    snap=await pg.evaluate("(()=>{const b=__sw.slots.find(x=>x&&!x.over); return b?{slot:b.slot,gems:[...b.gem].filter(Boolean).length,golden:b.golden}:null})()")
    await pg.evaluate("__sw.SaveGame.saveNow()"); await pg.reload(); await pg.wait_for_timeout(900)
    back=await pg.evaluate(f"(()=>{{const b=__sw.slots[{snap['slot'] if snap else 0}]; return b?{{gems:[...b.gem].filter(Boolean).length,golden:b.golden}}:null}})()")
    ok(snap is not None and back is not None and back['gems']==snap['gems'] and back['golden']==snap['golden'], f'reload restores board incl. gems and golden: {snap} -> {back}')
    # 11. spin wheel: decided at spin, timer blocks a second spin
    await fresh(pg, "__sw.S.spinAt=-1e9;__sw.S.coins=1000;__sw.S.upg={};__sw.S.unlocked=['penny'];__sw.S.sel='penny'")
    await pg.click('#btnSpin'); await pg.wait_for_timeout(300); await pg.click('#spinGo'); await pg.wait_for_timeout(300)
    saved=await pg.evaluate("JSON.parse(localStorage.getItem('sweepstakes.save.v3')).spinAt===__sw.S.run.time")
    await pg.wait_for_timeout(4400)
    txt=await pg.evaluate("document.querySelector('#wres').textContent")
    await pg.click('#spinGo'); await pg.wait_for_timeout(300)
    ok(saved and txt and await pg.evaluate("document.querySelector('#btnSpin').disabled"), f'spin prize saved at spin time ("{txt}"), button locked after')
    # 12. ascension + board 5 gate
    await fresh(pg, "__sw.S.coins=6e12;__sw.S.unlocked=__sw.TABLES.map(t=>t.id);Object.assign(__sw.S.upg,{boards:3})")
    await pg.click('[data-tab="shop"]')
    await pg.evaluate("[...document.querySelectorAll('#shop .item')].find(x=>x.textContent.includes('Ascend to')).querySelector('button').click()")
    await pg.wait_for_timeout(300); await hold(pg); await pg.wait_for_timeout(600)
    ok(await pg.evaluate("__sw.S.asc===1"), 'ascended to I')
    await pg.evaluate("[...document.querySelectorAll('#shop .item')].find(x=>x.querySelector('b').textContent.startsWith('Extra Board')).querySelector('button').click()")
    await pg.wait_for_timeout(200)
    ok(await pg.evaluate("__sw.S.upg.boards===4 && document.querySelectorAll('#boards > div').length===5"), 'bought board 5 after Ascension I')
    # 13. double or nothing: win the flip, then lose a pick -> bust, rank survives
    lv=await pg.evaluate('__sw.S.life.lvl')
    await fresh(pg, "__sw.S.coins=1000")
    await pg.click('#btnDon'); await pg.wait_for_timeout(300); await pg.click('[data-a="go"]'); await pg.wait_for_timeout(200)
    await pg.evaluate("Math._r=Math.random; Math.random=()=>0.001")
    await hold(pg); await pg.wait_for_timeout(3800)
    ok(await pg.evaluate("__sw.S.coins===2000"), 'won the ×2 flip')
    await pg.evaluate("Math.random=()=>0.999")
    await pg.click('[data-a="ride"]'); await pg.wait_for_timeout(200); await pg.click('[data-a="go"]'); await pg.wait_for_timeout(200)
    await hold(pg); await pg.wait_for_timeout(300); await pg.evaluate("Math.random=Math._r")
    await pg.click('.pick >> nth=2'); await pg.wait_for_timeout(3600)
    ok(await pg.evaluate("__sw.S.coins===1000 && document.querySelector('#modalBox h3').textContent==='Stuffed.' && __sw.S.life.lvl>="+str(lv)), 'lost: run wiped back to 1,000, rank kept')
    await pg.screenshot(path=str(shots / 'a6_bust.png'))
    await pg.click('[data-a="again"]'); await pg.wait_for_timeout(300)
    # 14. noises, quips, chat threads, menu sounds
    for k in await pg.evaluate("Object.keys(__sw.NOISES)"): await pg.evaluate(f"__sw.WeirdNoises.surprise('{k}')")
    n0=await pg.evaluate("document.querySelectorAll('#chat .msg').length")
    await pg.evaluate("__sw.Chat.thread()"); await pg.wait_for_timeout(9000)
    ok(await pg.evaluate("document.querySelectorAll('#chat .msg').length")>n0, 'ambient weird chat thread posts')
    await pg.evaluate("__sw.Quips.last=0; __sw.Quips.show(600,400)"); await pg.wait_for_timeout(250)
    ok(await pg.evaluate("!!document.querySelector('.quip')"), 'quip pops up')
    for tab in ['rack','stats','shop']:
        await pg.click(f'[data-tab="{tab}"]'); await pg.wait_for_timeout(120)
    await pg.click('[data-tab="stats"]'); await pg.wait_for_timeout(200)
    await pg.click('#btnTut'); await pg.wait_for_timeout(500)
    ok(await pg.evaluate("__sw.Coach.active && __sw.Coach.i===0"), 'tutorial replays from Stats')
    await pg.click('#coachBubble [data-c="skip"]'); await pg.wait_for_timeout(200)
    ok(await pg.evaluate("!__sw.Coach.active && __sw.S.life.tut"), 'tutorial can be skipped')
    ok(not errs, 'no console errors' + (': ' + '; '.join(errs[:3]) if errs else ''))
    await ctx.close()
    return R
