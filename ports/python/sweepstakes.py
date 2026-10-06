#!/usr/bin/env python3
"""Sweepstakes, terminal edition (Python). Minesweeper, but you're gambling.

    python sweepstakes.py               play
    python sweepstakes.py --plain       no colours (for terminals that show [31m junk)
    python sweepstakes.py --selftest    check this version's Daily Challenge matches the web game exactly
    python sweepstakes.py --seed 7      repeatable luck, handy for testing
    python sweepstakes.py --save FILE   use another save file (default ~/.sweepstakes/save.txt)

The rules and jokes come from rules.json, generated from the web game by tools/export_rules.mjs.
The save file is shared with the Kotlin and C# versions: your coins follow you between languages.
"""
import array, datetime, json, math, os, random, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, 'rules.json'), encoding='utf-8') as f:
    R = json.load(f)
TABLES = R['tables']
TBY = {t['id']: t for t in TABLES}
GEMS = R['gems']
D = R['daily']
MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


# ===================================================================== seeded randomness (same as src/core/random.js)
def seeded(seed):
    """mulberry32: a function returning floats in [0, 1), bit-for-bit the same sequence as the web game."""
    state = [seed & 0xFFFFFFFF]

    def nxt():
        state[0] = (state[0] + 0x6D2B79F5) & 0xFFFFFFFF
        t = state[0]
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = (t ^ ((t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt


def hash_string(s):
    """FNV-1a, 32-bit."""
    h = 0x811c9dc5
    for ch in s:
        h = ((h ^ ord(ch)) * 0x01000193) & 0xFFFFFFFF
    return h


def roll_gem(rng):
    r = rng()
    for g in GEMS:
        r -= g['w']
        if r <= 0:
            return g
    return GEMS[0]


def gem_tier(x):
    return next((g for g in GEMS if abs(g['x'] - x) < 1e-6), GEMS[0])


def round2(x):  # JavaScript's Math.round(x * 100) / 100 (halves round up)
    return math.floor(x * 100 + 0.5) / 100


# ===================================================================== the board (same rules as src/board/board.js)
_NB = {}


def neighbours(w, h):
    if (w, h) not in _NB:
        out = []
        for i in range(w * h):
            x, y, a = i % w, i // w, []
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx or dy:
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            a.append(ny * w + nx)
            out.append(a)
        _NB[(w, h)] = out
    return _NB[(w, h)]


class Board:
    def __init__(self, table, stake, mines, limit, rng=None):
        self.t, self.stake, self.m, self.lim = table, stake, mines, limit
        self.w, self.h = table['w'], table['h']
        self.n = self.w * self.h
        self.nb = neighbours(self.w, self.h)
        self.mine, self.open, self.flag = [0] * self.n, [0] * self.n, [0] * self.n
        self.num, self.gem = [0] * self.n, [0.0] * self.n
        self.started, self.over = False, False
        self.revealed = self.base = 0
        self.safe = self.n - mines
        self.G = self.J = 1.0
        self.golden, self.guesses, self.combo = False, 0, 0
        self.gems_total, self.gems_found = table['gems'], 0
        self.rng = rng or random.random
        self.ded = None
        self.moves = []

    def calc_nums(self):
        for i in range(self.n):
            self.num[i] = sum(self.mine[j] for j in self.nb[i])

    def shuffle(self, pool):
        for k in range(len(pool) - 1, 0, -1):
            j = math.floor(self.rng() * (k + 1))
            pool[k], pool[j] = pool[j], pool[k]

    def place_mines(self, first):
        ban = {first, *self.nb[first]}
        pool = [i for i in range(self.n) if i not in ban]
        if len(pool) < self.m:
            pool = [i for i in range(self.n) if i != first]
        self.shuffle(pool)
        for k in range(self.m):
            self.mine[pool[k]] = 1
        self.calc_nums()

    def place_gems(self, count):
        pool = [i for i in range(self.n) if not self.open[i] and not self.mine[i]]
        self.shuffle(pool)
        self.gems_total = min(count, len(pool))
        for k in range(self.gems_total):
            self.gem[pool[k]] = roll_gem(self.rng)['x']

    def flood(self, i):
        stack, out = [i], []
        while stack:
            k = stack.pop()
            if self.open[k] or self.flag[k] or self.mine[k]:
                continue
            self.open[k] = 1
            self.revealed += 1
            out.append(k)
            if self.num[k] == 0:
                stack.extend(j for j in self.nb[k] if not self.open[j] and not self.flag[j])
        return out

    def hidden_gems(self):
        return sum(1 for i in range(self.n) if self.gem[i] and not self.open[i])

    def frac(self):
        if not self.started:
            return 0
        d = self.safe - self.base
        return 1 if d <= 0 else (self.revealed - self.base) / d

    def raw_mult(self):
        if not self.started:
            return self.J
        return (1 + self.t['prog'] * self.frac()) * self.G * self.J * (R['CLEAR'] if self.revealed >= self.safe else 1)

    def mult(self):
        return min(self.lim, self.raw_mult())


# ===================================================================== the solver (same as src/board/solver.js)
def deduce(b, subset=True):
    KM, KS = [0] * b.n, [0] * b.n
    changed, passes = True, 0
    while changed and passes < 80:
        changed, info = False, []
        for i in range(b.n):
            if not b.open[i] or not b.num[i]:
                continue
            H, F = [], 0
            for j in b.nb[i]:
                if KM[j]:
                    F += 1
                elif not b.open[j] and not KS[j]:
                    H.append(j)
            if not H:
                continue
            r = b.num[i] - F
            if r == len(H):
                for j in H:
                    KM[j] = 1
                changed = True
            elif r == 0:
                for j in H:
                    KS[j] = 1
                changed = True
            else:
                info.append((H, r))
        if not changed and subset:
            done = False
            for A in info:
                for B in info:
                    if A is B or len(A[0]) >= len(B[0]) or not all(x in B[0] for x in A[0]):
                        continue
                    diff = [x for x in B[0] if x not in A[0]]
                    dr = B[1] - A[1]
                    if dr == 0:
                        for j in diff:
                            KS[j] = 1
                        changed = done = True
                        break
                    if dr == len(diff):
                        for j in diff:
                            KM[j] = 1
                        changed = done = True
                        break
                if done:
                    break
        passes += 1
    return KM, KS


def odds(b, KM, KS):
    P = array.array('f', [math.nan] * b.n)  # 32-bit floats, exactly like the web game's Float32Array
    km = unk = 0
    for i in range(b.n):
        if b.open[i]:
            continue
        if KM[i]:
            km += 1
        elif not KS[i]:
            unk += 1
    glob = max(0, min(1, (b.m - km) / unk)) if unk else 0
    for i in range(b.n):
        if not b.open[i] or not b.num[i]:
            continue
        H, F = [], 0
        for j in b.nb[i]:
            if KM[j]:
                F += 1
            elif not b.open[j] and not KS[j]:
                H.append(j)
        if not H:
            continue
        q = max(0, min(1, (b.num[i] - F) / len(H)))
        for j in H:
            P[j] = q if math.isnan(P[j]) else max(P[j], q)
    for i in range(b.n):
        if b.open[i] or KS[i]:
            P[i] = 0
        elif KM[i]:
            P[i] = 1
        elif math.isnan(P[i]):
            P[i] = glob
    return P


def solve(b):
    if not b.ded or b.ded[3] != b.revealed:
        KM, KS = deduce(b, True)
        b.ded = (KM, KS, odds(b, KM, KS), b.revealed)
    return b.ded


def risk_of(b, i):
    KM, KS, P, _ = solve(b)
    return 0.0 if KS[i] else min(.95, P[i])


# ===================================================================== terminal
class Term:
    color = True
    C = {'red': 31, 'green': 32, 'gold': 33, 'blue': 34, 'purple': 35, 'cyan': 36, 'dim': 90, 'bold': 1, 'orange': 91}
    FRIEND = {'dave': 'blue', 'tash': 'red', 'kev': 'green', 'nan': 'purple', 'priya': 'gold'}
    NUM = {1: 'blue', 2: 'green', 3: 'red', 4: 'purple', 5: 'orange', 6: 'cyan', 7: 'gold', 8: 'bold'}

    @classmethod
    def c(cls, text, name):
        return f'\033[{cls.C[name]}m{text}\033[0m' if cls.color and name else str(text)

    @staticmethod
    def ask(prompt='> '):
        try:
            return input(prompt).strip()
        except EOFError:
            raise SystemExit(0)


def c(text, name):
    return Term.c(text, name)


def fmt(n):
    n = math.floor(n)
    a = abs(n)
    if a < 10000:
        return f'{n:,}'
    for v, s in ((1e18, 'Qi'), (1e15, 'Qa'), (1e12, 'T'), (1e9, 'B'), (1e6, 'M'), (1e3, 'K')):
        if a >= v:
            txt = f'{n / v:.{2 if a / v < 100 else 1}f}'.rstrip('0').rstrip('.')
            return txt + s
    return str(n)


def fmt_x(x):
    return fmt(x) if x >= 100 else f'{x:.1f}' if x >= 10 else f'{x:.2f}'


def fmt_lim(x):
    return fmt(x) if float(x).is_integer() else fmt_x(x)


def nice(v):
    if v < 100:
        return round(v)
    p = 10 ** (math.floor(math.log10(v)) - 1)
    return round(v / p) * p


def say(event, chance=.6, **vars_):
    """Someone in the group chat reacts."""
    pool = R['lines'].get(event)
    if not pool or random.random() > chance:
        return
    who, text = random.choice(pool)
    for k, v in vars_.items():
        text = text.replace('{' + k + '}', str(v))
    print(f"  {c(R['friends'][who], Term.FRIEND.get(who, 'bold'))}: {text}")


def quip(chance):
    if random.random() < chance:
        print(c(f"  * {random.choice(R['quips'])} *", 'purple'))


def coord(i, w):
    return f'{chr(65 + i % w)}{i // w + 1}'


def parse_coord(s, b):
    s = s.strip().upper()
    if len(s) < 2 or not s[0].isalpha() or not s[1:].isdigit():
        return None
    x, y = ord(s[0]) - 65, int(s[1:]) - 1
    return y * b.w + x if 0 <= x < b.w and 0 <= y < b.h else None


def draw(b, reveal=False, odds_on=False):
    P = solve(b)[2] if odds_on and b.started and not b.over else None
    print('     ' + ' '.join(chr(65 + x) for x in range(b.w)))
    print('   +' + '-' * (b.w * 2 + 1) + '+')
    for y in range(b.h):
        row = []
        for x in range(b.w):
            i = y * b.w + x
            if b.open[i]:
                if b.gem[i] and not b.num[i]:
                    row.append(c('$', 'gold'))
                elif b.num[i]:
                    row.append(c(b.num[i], Term.NUM[b.num[i]]))
                else:
                    row.append(c('.', 'dim'))
            elif b.flag[i]:
                row.append(c('F', 'red'))
            elif reveal and b.mine[i]:
                row.append(c('*', 'red'))
            elif reveal and b.gem[i]:
                row.append(c('$', 'gold'))
            elif P is not None:
                row.append(c(min(9, int(P[i] * 10)), 'green' if P[i] < .2 else 'gold' if P[i] < .35 else 'red'))
            else:
                row.append('#')
        print(f'{y + 1:>2} | ' + ' '.join(row) + ' |')
    print('   +' + '-' * (b.w * 2 + 1) + '+')


# ===================================================================== save (shared by the Python, Kotlin and C# versions)
class Save:
    path = os.path.join(os.path.expanduser('~'), '.sweepstakes', 'save.txt')
    FIELDS = {'coins': R['START'], 'unlocked': 'penny', 'busts': 0, 'streak': 0, 'shields': 0, 'goggles': 0, 'charm': 0,
              'casinos': 0, 'best': R['START'], 'boards': 0,
              'daily_key': '', 'daily_why': '', 'daily_mult': 0.0, 'daily_digs': 0, 'daily_gems': 0, 'daily_total': 0,
              'daily_moves': '', 'daily_prize': 0, 'daily_streak': 0, 'daily_last': '', 'daily_best': 0.0}

    def __init__(self):
        self.v = dict(self.FIELDS)
        try:
            with open(self.path, encoding='utf-8') as f:
                for line in f:
                    if '=' in line and not line.startswith('#'):
                        k, val = line.rstrip('\n').split('=', 1)
                        if k in self.FIELDS:
                            d = self.FIELDS[k]
                            self.v[k] = int(val) if isinstance(d, int) else float(val) if isinstance(d, float) else val
        except (OSError, ValueError):
            pass

    def __getitem__(self, k):
        return self.v[k]

    def __setitem__(self, k, val):
        self.v[k] = val

    def write(self):
        try:
            os.makedirs(os.path.dirname(self.path), exist_ok=True)
            with open(self.path, 'w', encoding='utf-8') as f:
                f.write('# Sweepstakes terminal save, shared by the Python, Kotlin and C# versions\n')
                for k in self.FIELDS:
                    val = self.v[k]
                    f.write(f'{k}={repr(float(val)) if isinstance(self.FIELDS[k], float) else val}\n')
        except OSError as e:
            print(c(f"  (couldn't save: {e})", 'dim'))


# ===================================================================== the Daily Challenge (same as src/game/daily.js)
class Daily:
    @staticmethod
    def key(d=None):
        return (d or datetime.date.today()).isoformat()

    @staticmethod
    def number(key):
        return (datetime.date.fromisoformat(key) - datetime.date(*D['epoch'])).days + 1

    @staticmethod
    def create(key):
        rng, t = seeded(hash_string(D['seed'] + key)), TBY[D['table']]
        b = Board(t, 0, t['m'], D['limit'], rng)
        start = (2 + math.floor(rng() * (t['h'] - 4))) * t['w'] + 2 + math.floor(rng() * (t['w'] - 4))
        b.place_mines(start)
        b.started = True
        b.flood(start)
        b.base = b.revealed
        b.place_gems(D['gems'])
        return b

    @staticmethod
    def dig(b, i):
        """Returns ('boom'|'clear'|'limit'|None, risk, gem tier or None)."""
        if b.over or b.open[i] or b.flag[i]:
            return None, 0, None
        p = risk_of(b, i)
        if b.mine[i]:
            b.moves.append('boom')
            b.over = True
            return 'boom', p, None
        opened = b.flood(i)
        gem = None
        if p > 0:
            b.G *= 1 + R['BOOST'] * p / (1 - p)
            b.guesses += 1
            b.combo += 1
        for j in opened:
            if b.gem[j]:
                b.J *= b.gem[j]
                b.gems_found += 1
                gem = gem_tier(b.gem[j])
        b.moves.append('gem' if gem else 'r3' if p >= .5 else 'r2' if p >= .25 else 'r1' if p > 0 else 'safe')
        if b.revealed >= b.safe:
            b.over = True
            return 'clear', p, gem
        if b.raw_mult() >= b.lim:
            b.over = True
            return 'limit', p, gem
        return None, p, gem

    @staticmethod
    def friends(key):
        rng = seeded(hash_string(D['chatSeed'] + key))
        out = []
        for s in D['styles']:
            blew = rng() < s['boom']
            r = rng()
            x = s['lo'] + (s['hi'] - s['lo']) * (r * r)
            out.append((s['who'], 0 if blew else round2(x)))
        return out

    EMOJI = {'safe': '🟩', 'r1': '🟨', 'r2': '🟧', 'r3': '🟥', 'gem': '💎', 'boom': '💥', 'cash': '💰', 'clear': '🏁', 'limit': '🚀'}

    @classmethod
    def share(cls, key, why, mult, gems, total, moves):
        d = datetime.date.fromisoformat(key)
        head = 'blew up 💥' if why == 'boom' else f'×{mult:.2f} {cls.EMOJI[why]}'
        trail = [cls.EMOJI[m] for m in moves] + ([] if why == 'boom' else [cls.EMOJI[why]])
        rows = [''.join(trail[k:k + 10]) for k in range(0, len(trail), 10)]
        digs = len(moves)
        return (f'Sweepstakes Daily #{cls.number(key)} · {d.day} {MONTHS[d.month - 1]}\n'
                f'{head} · 💎 {gems}/{total} · {digs} dig{"" if digs == 1 else "s"}\n' + '\n'.join(rows))


# ===================================================================== the game
class Game:
    def __init__(self, save):
        self.s = save
        self.odds_on = False
        self.next_chirp = time.time() + random.uniform(150, 330)

    # ---- quick questions about the save
    def unlocked(self):
        return [t for t in TABLES if t['id'] in self.s['unlocked'].split(',')]

    def top_table(self):
        return self.unlocked()[-1]

    def luck(self):
        return 1 + .08 * self.s['charm']

    def streak_bonus(self):
        return min(self.s['streak'], 10) * .1

    def add_coins(self, n):
        self.s['coins'] = max(0, int(self.s['coins'] + n))
        self.s['best'] = max(self.s['best'], self.s['coins'])

    def reset_run(self):
        for k in ('coins', 'unlocked', 'streak', 'shields', 'goggles', 'charm', 'boards'):
            self.s[k] = Save.FIELDS[k]
        self.s.write()

    def bust(self, why):
        print(c('\n  STUFFED.', 'red'), why, f"Back to {fmt(R['START'])}. Your daily streak and casinos survive.")
        say('don_lose' if 'Double' in why else 'bust', 1)
        self.s['busts'] += 1
        self.reset_run()

    def odd_noises(self):
        if time.time() >= self.next_chirp:
            self.next_chirp = time.time() + random.uniform(150, 330)
            print(c('\n  *chirp*', 'dim'), '(the smoke detector down the hall wants a new battery)')
            say('odd_smoke', .7)

    # ---- menus
    def run(self):
        print(c(r"""
   ____                            ___ _        _
  / ___|_      _____  ___ _ __   / __| |_ __ _| | _____  ___
  \___ \ \ /\ / / _ \/ _ \ '_ \  \__ \ __/ _` | |/ / _ \/ __|
   ___) \ V  V /  __/  __/ |_) |  __/ || (_| |   <  __/\__ \
  |____/ \_/\_/ \___|\___| .__/  |___/\__\__,_|_|\_\___||___/
                         |_|     terminal edition · Python""", 'gold'))
        say('hello', 1)
        while True:
            self.odd_noises()
            s, key = self.s, Daily.key()
            daily = (f"×{fmt_x(s['daily_mult'])} today" if s['daily_why'] != 'boom' else 'blew up today') if s['daily_key'] == key else 'not played yet'
            print(f"\n  Coins {c(fmt(s['coins']), 'gold')}   Streak {s['streak']}   Shields {s['shields']}   Busts {s['busts']}"
                  + (f"   House edge +{25 * s['casinos']}%" if s['casinos'] else ''))
            print(f"  [1] Play a board          [2] Daily Challenge #{Daily.number(key)} ({daily})")
            print('  [3] Shop                  [4] Double or nothing')
            print('  [5] Coin flip             [6] How to play          [q] Quit')
            choice = Term.ask('> ').lower()
            if choice == '1':
                self.play()
            elif choice == '2':
                self.daily()
            elif choice == '3':
                self.shop()
            elif choice == '4':
                self.double_or_nothing()
            elif choice == '5':
                self.coin_flip()
            elif choice == '6':
                self.how_to()
            elif choice in ('q', 'quit', 'exit'):
                s.write()
                print('  See you tomorrow for the daily. My mum plays this game.')
                return

    def how_to(self):
        print("""
  Dig tiles by typing a coordinate (C4). The numbers count the mines touching a tile.
  Your first dig on a board is always safe. Safe digs nudge the pot up a little.
  Risky digs, where the numbers can't prove a tile is safe, pay the odds: a 30% shot multiplies the pot by about 1.5.
  Gems ($) hide outside the opening and multiply the pot: x1.2, x1.5, x2 or a x5 jackpot.
  Cash out (c) whenever you like. Hit a mine and the stake is gone. Clearing the board adds x1.25.
  f C4 flags a tile. Win big boards in a row for a streak bonus (up to +100% profit).
  Double or nothing bets everything: x2, x5, x10, x25, x100. Lose and you're stuffed.
  The Daily Challenge is the same board for everyone, in every version of the game. One go a day.""")

    def pick_table(self):
        print()
        for k, t in enumerate(TABLES, 1):
            if t['id'] in self.s['unlocked'].split(','):
                print(f"  [{k}] {t['name']:<13} {t['w']}x{t['h']}, {t['m']} mines, stake {fmt(t['min'])}-{fmt(t['cap'])}, up to x{fmt_lim(t['lim'])}")
            else:
                print(c(f"  [{k}] {t['name']:<13} locked: unlock for {fmt(t['cost'])}", 'dim'))
        got = Term.ask('  Table (Enter for the best one you have): ')
        if not got:
            return self.top_table()
        if not got.isdigit() or not 1 <= int(got) <= len(TABLES):
            return None
        t = TABLES[int(got) - 1]
        if t['id'] in self.s['unlocked'].split(','):
            return t
        if self.s['coins'] < t['cost']:
            print(f"  You need {fmt(t['cost'])} to unlock {t['name']}.")
            return None
        if Term.ask(f"  Unlock {t['name']} for {fmt(t['cost'])}? (y/n) ").lower().startswith('y'):
            self.add_coins(-t['cost'])
            self.s['unlocked'] += ',' + t['id']
            print(c(f"  {t['name']} unlocked. {t['blurb']}", 'green'))
            say('unlock', 1)
            self.s.write()
            return t
        return None

    def play(self):
        t = self.pick_table()
        if not t:
            return
        lo, hi = int(t['min']), int(min(t['cap'], self.s['coins']))
        if hi < lo:
            print(f"  You need {fmt(lo)} coins to sit at {t['name']}.")
            return
        default = int(max(lo, min(hi, nice(max(lo, self.s['coins'] / 5)))))
        got = Term.ask(f'  Stake {fmt(lo)}-{fmt(hi)} (Enter for {fmt(default)}): ').replace(',', '')
        stake = default if not got else int(got) if got.isdigit() else -1
        if not lo <= stake <= hi:
            print('  That stake is off the table.')
            return
        golden = random.random() < R['GOLDEN']
        b = Board(t, stake, t['m'], t['lim'] * (2 if golden else 1))
        b.golden, b.J = golden, 2.0 if golden else 1.0
        self.add_coins(-stake)
        self.s['boards'] += 1
        if golden:
            print(c('  GOLDEN BOARD: x2 pot, double limit.', 'gold'))
            say('golden')
        elif stake >= max(500, (self.s['coins'] + stake) * .4):
            say('deal_big', stake=fmt(stake))
        self.board_loop(b)
        if self.s['coins'] < TABLES[0]['min']:
            self.bust('Out of coins.')
        self.s.write()

    def hud(self, b):
        pot = math.floor(b.stake + b.stake * (b.mult() - 1) * (1 + self.streak_bonus()))
        hot = 'red' if b.mult() >= 10 else 'orange' if b.mult() >= 3 else 'gold'
        print(f"  Mult {c('x' + fmt_x(b.mult()), hot)}   Pot {c(fmt(pot), 'gold')}   Gems {b.gems_found}/{b.gems_total}   "
              f"Mines {b.m}   Limit x{fmt_lim(b.lim)}   Shields {self.s['shields']}")
        return pot

    def board_loop(self, b):
        while True:
            self.odd_noises()
            print()
            draw(b, odds_on=self.odds_on)
            pot = self.hud(b)
            cmd = Term.ask('  dig C4 · f C4 flag · c cash out' + (' · o odds' if self.s['goggles'] else '') + ' · ? help > ')
            low = cmd.lower()
            if low in ('c', 'cash'):
                if not b.started:
                    print('  Dig a tile first.')
                    continue
                return self.cash_out(b, 'manual')
            if low == '?':
                self.how_to()
                continue
            if low == 'o' and self.s['goggles']:
                self.odds_on = not self.odds_on
                continue
            if low.startswith('f '):
                i = parse_coord(cmd[2:], b)
                if i is not None and not b.open[i]:
                    b.flag[i] ^= 1
                continue
            i = parse_coord(cmd[2:] if low.startswith('d ') else cmd, b)
            if i is None:
                print('  Type a tile like C4, f C4 to flag, or c to cash out.')
                continue
            if b.open[i] or b.flag[i]:
                continue
            result = self.dig(b, i)
            if result:
                return result

    def dig(self, b, i):
        if not b.started:
            b.place_mines(i)
            b.started = True
            b.flood(i)
            b.base = b.revealed
            b.place_gems(b.gems_total)
            return None
        p = risk_of(b, i)
        if b.mine[i]:
            b.combo = 0
            if self.s['shields'] > 0:
                self.s['shields'] -= 1
                b.flag[i] = 1
                print(c(f'  SHIELD! That was a mine at {coord(i, b.w)}. Shield used, mine flagged.', 'cyan'))
                say('shield')
                return None
            return self.boom(b, i)
        opened = b.flood(i)
        if p > 0:
            k = 1 + R['BOOST'] * p / (1 - p)
            b.G *= k
            b.guesses += 1
            b.combo += 1
            col = 'green' if p < .2 else 'gold' if p < .35 else 'red'
            print(c(f"  Risky dig ({round(p * 100)}% mine): pot x{k:.2f}" + (f'   COMBO {b.combo}' if b.combo > 1 else ''), col))
        for j in opened:
            if b.gem[j]:
                tier = gem_tier(b.gem[j])
                b.J *= b.gem[j]
                b.gems_found += 1
                print(c(f"  {tier['name'].upper()}! x{b.gem[j]:g}", 'red' if tier['k'] == 'jackpot' else 'gold'))
                say('jackpot' if tier['k'] == 'jackpot' else 'gem', 1 if tier['k'] == 'jackpot' else .35)
        quip(.04)
        if b.revealed >= b.safe:
            return self.cash_out(b, 'clear')
        if b.raw_mult() >= b.lim:
            return self.cash_out(b, 'limit')
        return None

    def boom(self, b, i):
        b.over = True
        print()
        draw(b, reveal=True)
        left, missed = b.safe - b.revealed, b.hidden_gems()
        near = f'{left} tile{"s" if left > 1 else ""} from a clean sweep' if 0 < left <= 5 else f'{missed} gem{"s" if missed > 1 else ""} still down there' if missed else ''
        print(c(f'  BOOM at {coord(i, b.w)}. -{fmt(b.stake)}', 'red') + (f'  ({near})' if near else ''))
        self.s['streak'] = 0
        say('boom', stake=fmt(b.stake))
        quip(.15)
        return 'boom'

    def cash_out(self, b, why):
        b.over = True
        mult = b.mult()
        amount = math.floor(b.stake + b.stake * (mult - 1) * (1 + self.streak_bonus()))
        profit = amount - b.stake
        if self.s['casinos'] and profit > 0:  # New Game+: +25% of the profit per casino you've owned
            amount += math.floor(profit * .25 * self.s['casinos'])
            profit = amount - b.stake
        self.add_coins(amount)
        if profit > 0 and (b.frac() >= .5 or mult >= 2):
            self.s['streak'] += 1
            if self.s['streak'] >= 3:
                say('streak', streak=self.s['streak'])
        print()
        draw(b, reveal=True)
        label = {'clear': 'CLEAN SWEEP', 'limit': 'TABLE LIMIT'}.get(why, 'Cashed out')
        print(c(f'  {label}: +{fmt(profit)} (x{fmt_x(mult)})', 'green'))
        tier = 3 if mult >= 50 else 2 if mult >= 15 else 1 if mult >= 5 else 0
        if tier:
            print(c(f"  *** {['', 'BIG WIN', 'HUGE WIN', 'MEGA WIN'][tier]} ***", ['', 'gold', 'orange', 'red'][tier]))
        say('clear' if why == 'clear' else 'cash_big' if profit >= max(300, b.stake) else 'cash_small', profit=fmt(profit))
        return 'cash'

    # ---- the Daily Challenge
    def daily(self):
        key, s = Daily.key(), self.s
        if s['daily_key'] == key:
            return self.daily_result(key)
        b = Daily.create(key)
        print(c(f'\n  DAILY #{Daily.number(key)}', 'gold'), '· the same board for everyone today, in every version. No shields, no stake. One go.')
        while not b.over:
            print()
            draw(b)
            print(f"  Mult {c('x' + fmt_x(b.mult()), 'gold')}   Prize {fmt(self.top_table()['cap'] * D['prize'] * b.mult())}   Gems {b.gems_found}/{b.gems_total}")
            cmd = Term.ask('  dig C4 · f C4 flag · c cash out > ')
            low = cmd.lower()
            if low in ('c', 'cash'):
                b.over = True
                why = 'cash'
                break
            if low.startswith('f '):
                i = parse_coord(cmd[2:], b)
                if i is not None and not b.open[i]:
                    b.flag[i] ^= 1
                continue
            i = parse_coord(cmd, b)
            if i is None:
                print('  Type a tile like C4, f C4 to flag, or c to cash out.')
                continue
            why, p, gem = Daily.dig(b, i)
            if p > 0 and why != 'boom':
                print(c(f'  Risky dig ({round(p * 100)}% mine): pot x{1 + R["BOOST"] * p / (1 - p):.2f}', 'gold'))
            if gem:
                print(c(f"  {gem['name'].upper()}! x{gem['x']:g}", 'gold'))
        mult = 0.0 if why == 'boom' else b.mult()
        prize = 0 if why == 'boom' else round(self.top_table()['cap'] * D['prize'] * mult)
        print()
        draw(b, reveal=True)
        y = (datetime.date.fromisoformat(key) - datetime.timedelta(days=1)).isoformat()
        s['daily_streak'] = s['daily_streak'] + 1 if s['daily_last'] == y else 1
        s.v.update(daily_key=key, daily_why=why, daily_mult=mult, daily_digs=len(b.moves), daily_gems=b.gems_found,
                   daily_total=b.gems_total, daily_moves=','.join(b.moves), daily_prize=prize, daily_last=key,
                   daily_best=max(s['daily_best'], mult))
        self.add_coins(prize)
        s.write()
        top = mult > 0 and all(mult > m for _, m in Daily.friends(key))
        say('daily_boom' if why == 'boom' else 'daily_top' if top else 'daily_ok', .9, x=fmt_x(mult))
        self.daily_result(key)

    def daily_result(self, key):
        s = self.s
        rows = sorted([('you', s['daily_mult'])] + Daily.friends(key), key=lambda r: -r[1])
        print(c(f'\n  DAILY #{Daily.number(key)} RESULTS', 'gold'))
        for k, (who, m) in enumerate(rows, 1):
            name = 'You' if who == 'you' else R['friends'][who]
            line = f"  {k}. {name:<14} {'x' + fmt_x(m) if m else 'blew up'}"
            print(c(line, 'gold') if who == 'you' else line)
        print(f"  Prize: +{fmt(s['daily_prize'])} coins. Streak: {s['daily_streak']} day{'s' if s['daily_streak'] != 1 else ''}.")
        print('\n  Share it (copy these lines):\n')
        moves = [m for m in s['daily_moves'].split(',') if m]
        print(Daily.share(key, s['daily_why'], s['daily_mult'], s['daily_gems'], s['daily_total'], moves))
        now = datetime.datetime.now()
        left = datetime.datetime.combine(now.date() + datetime.timedelta(days=1), datetime.time()) - now
        print(c(f'\n  Next board in {left.seconds // 3600}h {left.seconds % 3600 // 60}m.', 'dim'))

    # ---- shop, double or nothing, coin flip
    def shop(self):
        while True:
            s, cap = self.s, self.top_table()['cap']
            items = [('shield', 'Shield', 'Survive one mine.', math.ceil(cap * .3), True),
                     ('goggles', 'Dodgy Goggles', 'Show each tile’s mine odds (o on a board).', 1_000_000, not s['goggles']),
                     ('charm', f"Lucky Charm (Lv {s['charm']}/3)", '+8% odds on flips and Double or Nothing.', [2e6, 5e8, 1e11][min(2, s['charm'])], s['charm'] < 3),
                     ('casino', 'Buy the Casino', 'The whole building. New Game+: +25% profit forever.', R['CASINO'], True)]
            print(f"\n  SHOP · you have {c(fmt(s['coins']), 'gold')}")
            for k, (_, name, desc, cost, avail) in enumerate(items, 1):
                print(f'  [{k}] {name:<22} {fmt(cost):>8}  {desc}' if avail else c(f'  [{k}] {name:<22}     done  {desc}', 'dim'))
            got = Term.ask('  Buy (number, Enter to leave): ')
            if not got:
                return
            if not got.isdigit() or not 1 <= int(got) <= len(items):
                continue
            iid, name, _, cost, avail = items[int(got) - 1]
            if not avail:
                continue
            if s['coins'] < cost:
                print(f'  Not enough coins. You need {fmt(cost)}.')
                continue
            self.add_coins(-cost)
            if iid == 'shield':
                s['shields'] += 1
            elif iid == 'goggles':
                s['goggles'] = 1
            elif iid == 'charm':
                s['charm'] += 1
            else:
                s['casinos'] += 1
                print(c('\n  YOU OWN THE CASINO.', 'gold'), f"From {fmt(R['START'])} coins to the deeds.")
                print(f"  New Game+: every win now pays +{25 * s['casinos']}% profit. Starting a fresh run.")
                say('casino', 1)
                self.reset_run()
                return
            print(c(f'  {name} bought.', 'green'))
            say('buy')
            s.write()

    def double_or_nothing(self):
        if self.s['coins'] < 100:
            print('  You need at least 100 coins to gamble the lot.')
            return
        for step, m in enumerate(R['LADDER']):
            stake = self.s['coins']
            chance = min(.95, 1 / m * self.luck())
            print(c(f"\n  {'DOUBLE OR NOTHING' if step == 0 else f'LET IT RIDE: x{m}?'}", 'red'),
                  f'Stake {fmt(stake)} to win {fmt(stake * m)}. Chance {round(chance * 100)}%.')
            say('don_offer', .9 if step else .7)
            print(c(f"  {R['sure'][step]}", 'bold'), 'Type YES to go' + (', anything else to walk away.' if step else ', anything else to back out.'))
            if Term.ask('> ') != 'YES':
                if step:
                    print(c(f'  Walked away with {fmt(self.s["coins"])}. Smart. Boring, but smart.', 'green'))
                return
            for _ in range(3):
                print('  ...', flush=True)
                time.sleep(.25)
            if random.random() < chance:
                self.s['coins'] = math.floor(stake * m)
                self.s['best'] = max(self.s['best'], self.s['coins'])
                print(c(f'  WON! You have {fmt(self.s["coins"])}.', 'green'))
                say('don_win', 1)
                self.s.write()
            else:
                print(c('  Lost.', 'red'))
                self.bust('Double or nothing said nothing.')
                return
        print(c('  You climbed the whole ladder. Absolute legend.', 'gold'))

    def coin_flip(self):
        coins = self.s['coins']
        default = max(1, coins // 10)
        got = Term.ask(f'  Bet (Enter for {fmt(default)}): ').replace(',', '')
        bet = default if not got else int(got) if got.isdigit() else 0
        if not 0 < bet <= coins:
            print('  Bet something you actually have.')
            return
        side = Term.ask('  Heads or tails? (h/t) ').lower()[:1]
        if side not in ('h', 't'):
            return
        win = random.random() < min(.95, .5 * self.luck())
        landed = side if win else ('t' if side == 'h' else 'h')
        print(f"  It's... {'heads' if landed == 'h' else 'tails'}!")
        self.add_coins(bet if win else -bet)
        print(c(f'  +{fmt(bet)}. The coin likes you.', 'green') if win else c(f'  -{fmt(bet)}. The coin does not like you.', 'red'))
        say('flip_win' if win else 'flip_lose')
        if self.s['coins'] < TABLES[0]['min']:
            self.bust('Out of coins.')
        self.s.write()


# ===================================================================== self-test: the daily must match the web game exactly
def selftest():
    ok = True
    for g in R['golden']:
        b = Daily.create(g['key'])
        gems = [[i, b.gem[i]] for i in range(b.n) if b.gem[i]]
        fr = [[w, m] for w, m in Daily.friends(g['key'])]
        same = (''.join(map(str, b.mine)) == g['mines'] and ''.join(map(str, b.open)) == g['open'] and gems == g['gems']
                and fr == g['friends'] and Daily.number(g['key']) == g['number'])
        ok &= same
        print(('PASS' if same else 'FAIL'), f"daily board {g['key']} #{g['number']}")
    for r in R['runs']:
        b = Daily.create(r['key'])
        why = None
        for _ in range(12):
            if b.over:
                break
            KM, KS, P, _ = solve(b)
            pick = next((i for i in range(b.n) if not b.open[i] and not b.flag[i] and KS[i]), -1)
            if pick < 0:
                best = 2
                for i in range(b.n):
                    if b.open[i] or b.flag[i] or P[i] >= 1:
                        continue
                    if P[i] < best:
                        best, pick = P[i], i
            if pick < 0:
                break
            why = Daily.dig(b, pick)[0]
        why = why or 'cash'
        mult = 0 if why == 'boom' else b.mult()
        same = b.moves == r['moves'] and b.revealed == r['revealed'] and why == r['why'] and mult == r['mult']
        ok &= same
        print(('PASS' if same else 'FAIL'), f"golden run {r['key']}: {why} x{mult} after {len(b.moves)} digs" + ('' if same else f" (web: {r['why']} x{r['mult']})"))
    print('all good: this version plays the exact same daily as the web game' if ok else 'MISMATCH with the web game')
    return 0 if ok else 1


def main(argv):
    if '--plain' in argv or os.environ.get('NO_COLOR') or not sys.stdout.isatty():
        Term.color = False
    if '--seed' in argv:
        random.seed(int(argv[argv.index('--seed') + 1]))
    if '--save' in argv:
        Save.path = argv[argv.index('--save') + 1]
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if os.name == 'nt':
        os.system('')  # switches on colour codes in the Windows console
    if '--selftest' in argv:
        return selftest()
    try:
        Game(Save()).run()
    except KeyboardInterrupt:
        print('\n  Bye.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
