// The game: menus, playing a board, the Daily Challenge, the shop, Double or Nothing and the coin flip.
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;

namespace Sweepstakes
{
    public sealed class Game
    {
        readonly Save s;
        bool oddsOn;
        DateTime nextChirp = DateTime.Now.AddSeconds(Rng.Luck.Next(150, 330));

        public Game(Save save) { s = save; }

        static string C(object t, string n) { return Term.C(t, n); }
        static string Fmt(double v) { return Term.Fmt(v); }
        static void Say(string ev, double chance = .6, Dictionary<string, string> vars = null) { Term.Say(ev, chance, vars); }
        static Dictionary<string, string> V(string k, string val) { return new Dictionary<string, string> { { k, val } }; }

        // ---- quick questions about the save
        string[] UnlockedIds() { return s.Str("unlocked").Split(','); }
        List<Table> Unlocked() { var ids = UnlockedIds(); return Rules.TABLES.Where(t => ids.Contains(t.Id)).ToList(); }
        Table TopTable() { return Unlocked().Last(); }
        double Luck() { return 1 + .08 * s.Long("charm"); }
        double StreakBonus() { return Math.Min(s.Long("streak"), 10L) * .1; }
        void AddCoins(double n)
        {
            s.Set("coins", Math.Max(0L, (long)(s.Long("coins") + n)));
            s.Set("best", Math.Max(s.Long("best"), s.Long("coins")));
        }

        void ResetRun()
        {
            foreach (string k in new[] { "coins", "unlocked", "streak", "shields", "goggles", "charm", "boards" }) s.Set(k, Save.Defaults.First(d => d.Key == k).Value);
            s.Write();
        }

        void Bust(string why)
        {
            Console.WriteLine(C("\n  STUFFED.", "red") + " " + why + " Back to " + Fmt(Rules.START) + ". Your daily streak and casinos survive.");
            Say(why.Contains("Double") ? "don_lose" : "bust", 1);
            s.Set("busts", s.Long("busts") + 1);
            ResetRun();
        }

        void OddNoises()
        {
            if (DateTime.Now < nextChirp) return;
            nextChirp = DateTime.Now.AddSeconds(Rng.Luck.Next(150, 330));
            Console.WriteLine(C("\n  *chirp*", "dim") + " (a carbon monoxide alarm somewhere wants a new battery)");
            Say("odd_co", .7);
        }

        // ---- menus
        public void Run()
        {
            Console.WriteLine(C(@"
   ____                            ___ _        _
  / ___|_      _____  ___ _ __   / __| |_ __ _| | _____  ___
  \___ \ \ /\ / / _ \/ _ \ '_ \  \__ \ __/ _` | |/ / _ \/ __|
   ___) \ V  V /  __/  __/ |_) |  __/ || (_| |   <  __/\__ \
  |____/ \_/\_/ \___|\___| .__/  |___/\__\__,_|_|\_\___||___/
                         |_|     terminal edition · C#", "gold"));
            Say("hello", 1);
            while (true)
            {
                OddNoises();
                string key = Daily.Key();
                string daily = s.Str("daily_key") == key ? (s.Str("daily_why") != "boom" ? "×" + Term.FmtX(s.Dbl("daily_mult")) + " today" : "blew up today") : "not played yet";
                Console.WriteLine("\n  Coins " + C(Fmt(s.Long("coins")), "gold") + "   Streak " + s.Long("streak") + "   Shields " + s.Long("shields") + "   Busts " + s.Long("busts") +
                    (s.Long("casinos") > 0 ? "   House edge +" + 25 * s.Long("casinos") + "%" : ""));
                Console.WriteLine("  [1] Play a board          [2] Daily Challenge #" + Daily.Number(key) + " (" + daily + ")");
                Console.WriteLine("  [3] Shop                  [4] Double or nothing");
                Console.WriteLine("  [5] Coin flip             [6] How to play          [q] Quit");
                switch (Term.Ask("> ").ToLowerInvariant())
                {
                    case "1": Play(); break;
                    case "2": DailyChallenge(); break;
                    case "3": Shop(); break;
                    case "4": DoubleOrNothing(); break;
                    case "5": CoinFlip(); break;
                    case "6": HowTo(); break;
                    case "q": case "quit": case "exit":
                        s.Write(); Console.WriteLine("  See you tomorrow for the daily. My mum plays this game."); return;
                }
            }
        }

        static void HowTo()
        {
            Console.WriteLine(@"
  Dig tiles by typing a coordinate (C4). The numbers count the mines touching a tile.
  Your first dig on a board is always safe. Safe digs nudge the pot up a little.
  Risky digs, where the numbers can't prove a tile is safe, pay the odds: a 30% shot multiplies the pot by about 1.5.
  Gems ($) hide outside the opening and multiply the pot: x1.2, x1.5, x2 or a x5 jackpot.
  Cash out (c) whenever you like. Hit a mine and the stake is gone. Clearing the board adds x1.25.
  f C4 flags a tile. Win big boards in a row for a streak bonus (up to +100% profit).
  Double or nothing bets everything: x2, x5, x10, x25, x100. Lose and you're stuffed.
  The Daily Challenge is the same board for everyone, in every version of the game. One go a day.");
        }

        Table PickTable()
        {
            Console.WriteLine();
            for (int k = 0; k < Rules.TABLES.Length; k++)
            {
                var t = Rules.TABLES[k];
                if (UnlockedIds().Contains(t.Id))
                    Console.WriteLine("  [" + (k + 1) + "] " + t.Name.PadRight(13) + " " + t.W + "x" + t.H + ", " + t.M + " mines, stake " + Fmt(t.Min) + "-" + Fmt(t.Cap) + ", up to x" + Term.FmtLim(t.Lim));
                else Console.WriteLine(C("  [" + (k + 1) + "] " + t.Name.PadRight(13) + " locked: unlock for " + Fmt(t.Cost), "dim"));
            }
            string got = Term.Ask("  Table (Enter for the best one you have): ");
            if (got == "") return TopTable();
            int n;
            if (!int.TryParse(got, out n) || n < 1 || n > Rules.TABLES.Length) return null;
            var tbl = Rules.TABLES[n - 1];
            if (UnlockedIds().Contains(tbl.Id)) return tbl;
            if (s.Long("coins") < tbl.Cost) { Console.WriteLine("  You need " + Fmt(tbl.Cost) + " to unlock " + tbl.Name + "."); return null; }
            if (Term.Ask("  Unlock " + tbl.Name + " for " + Fmt(tbl.Cost) + "? (y/n) ").ToLowerInvariant().StartsWith("y"))
            {
                AddCoins(-tbl.Cost);
                s.Set("unlocked", s.Str("unlocked") + "," + tbl.Id);
                Console.WriteLine(C("  " + tbl.Name + " unlocked. " + tbl.Blurb, "green"));
                Say("unlock", 1);
                s.Write();
                return tbl;
            }
            return null;
        }

        void Play()
        {
            var t = PickTable();
            if (t == null) return;
            long lo = (long)t.Min, hi = (long)Math.Min(t.Cap, s.Long("coins"));
            if (hi < lo) { Console.WriteLine("  You need " + Fmt(lo) + " coins to sit at " + t.Name + "."); return; }
            long def = (long)Math.Max(lo, Math.Min(hi, Term.Nice(Math.Max(lo, s.Long("coins") / 5.0))));
            string got = Term.Ask("  Stake " + Fmt(lo) + "-" + Fmt(hi) + " (Enter for " + Fmt(def) + "): ").Replace(",", "");
            long stake;
            if (got == "") stake = def; else if (!long.TryParse(got, out stake)) stake = -1;
            if (stake < lo || stake > hi) { Console.WriteLine("  That stake is off the table."); return; }
            bool golden = Rng.Luck.NextDouble() < Rules.GOLDEN;
            var b = new Board(t, stake, t.M, t.Lim * (golden ? 2 : 1));
            b.Golden = golden; b.J = golden ? 2 : 1;
            AddCoins(-stake);
            s.Set("boards", s.Long("boards") + 1);
            if (golden) { Console.WriteLine(C("  GOLDEN BOARD: x2 pot, double limit.", "gold")); Say("golden"); }
            else if (stake >= Math.Max(500, (s.Long("coins") + stake) * .4)) Say("deal_big", .6, V("stake", Fmt(stake)));
            BoardLoop(b);
            if (s.Long("coins") < Rules.TABLES[0].Min) Bust("Out of coins.");
            s.Write();
        }

        double Pot(Board b) { return Math.Floor(b.Stake + b.Stake * (b.Mult() - 1) * (1 + StreakBonus())); }

        void Hud(Board b)
        {
            string hot = b.Mult() >= 10 ? "red" : b.Mult() >= 3 ? "orange" : "gold";
            Console.WriteLine("  Mult " + C("x" + Term.FmtX(b.Mult()), hot) + "   Pot " + C(Fmt(Pot(b)), "gold") + "   Gems " + b.GemsFound + "/" + b.GemsTotal +
                "   Mines " + b.M + "   Limit x" + Term.FmtLim(b.Lim) + "   Shields " + s.Long("shields"));
        }

        string BoardLoop(Board b)
        {
            while (true)
            {
                OddNoises();
                Console.WriteLine(); Term.Draw(b, false, oddsOn); Hud(b);
                string cmd = Term.Ask("  dig C4 · f C4 flag · c cash out" + (s.Long("goggles") > 0 ? " · o odds" : "") + " · ? help > ");
                string low = cmd.ToLowerInvariant();
                if (low == "c" || low == "cash") { if (!b.Started) { Console.WriteLine("  Dig a tile first."); continue; } return CashOut(b, "manual"); }
                if (low == "?") { HowTo(); continue; }
                if (low == "o" && s.Long("goggles") > 0) { oddsOn = !oddsOn; continue; }
                if (low.StartsWith("f ")) { int fi = Term.ParseCoord(cmd.Substring(2), b); if (fi >= 0 && b.Open[fi] == 0) b.Flag[fi] ^= 1; continue; }
                int i = Term.ParseCoord(low.StartsWith("d ") ? cmd.Substring(2) : cmd, b);
                if (i < 0) { Console.WriteLine("  Type a tile like C4, f C4 to flag, or c to cash out."); continue; }
                if (b.Open[i] == 1 || b.Flag[i] == 1) continue;
                string result = Dig(b, i);
                if (result != null) return result;
            }
        }

        string Dig(Board b, int i)
        {
            if (!b.Started)
            {
                b.PlaceMines(i); b.Started = true; b.Flood(i); b.Base = b.Revealed; b.PlaceGems(b.GemsTotal);
                return null;
            }
            double p = Solver.RiskOf(b, i);
            if (b.Mine[i] == 1)
            {
                b.Combo = 0;
                if (s.Long("shields") > 0)
                {
                    s.Set("shields", s.Long("shields") - 1); b.Flag[i] = 1;
                    Console.WriteLine(C("  SHIELD! That was a mine at " + Term.Coord(i, b.W) + ". Shield used, mine flagged.", "cyan"));
                    Say("shield");
                    return null;
                }
                return Boom(b, i);
            }
            var opened = b.Flood(i);
            if (p > 0)
            {
                double k = 1 + Rules.BOOST * p / (1 - p);
                b.G *= k; b.Guesses++; b.Combo++;
                string col = p < .2 ? "green" : p < .35 ? "gold" : "red";
                Console.WriteLine(C("  Risky dig (" + Term.Pct(p) + "% mine): pot x" + Term.F2(k) + (b.Combo > 1 ? "   COMBO " + b.Combo : ""), col));
            }
            foreach (int j in opened)
            {
                if (b.Gem[j] == 0) continue;
                var tier = Rng.Tier(b.Gem[j]);
                b.J *= b.Gem[j]; b.GemsFound++;
                Console.WriteLine(C("  " + tier.Name.ToUpperInvariant() + "! x" + Term.GemX(b.Gem[j]), tier.K == "jackpot" ? "red" : "gold"));
                Say(tier.K == "jackpot" ? "jackpot" : "gem", tier.K == "jackpot" ? 1 : .35);
            }
            Term.Quip(.04);
            if (b.Revealed >= b.Safe) return CashOut(b, "clear");
            if (b.RawMult() >= b.Lim) return CashOut(b, "limit");
            return null;
        }

        string Boom(Board b, int i)
        {
            b.Over = true;
            Console.WriteLine(); Term.Draw(b, true);
            int left = b.Safe - b.Revealed, missed = b.HiddenGems();
            string near = left > 0 && left <= 5 ? left + " tile" + (left > 1 ? "s" : "") + " from a clean sweep" : missed > 0 ? missed + " gem" + (missed > 1 ? "s" : "") + " still down there" : "";
            Console.WriteLine(C("  BOOM at " + Term.Coord(i, b.W) + ". -" + Fmt(b.Stake), "red") + (near != "" ? "  (" + near + ")" : ""));
            s.Set("streak", 0L);
            Say("boom", .6, V("stake", Fmt(b.Stake)));
            Term.Quip(.15);
            return "boom";
        }

        string CashOut(Board b, string why)
        {
            b.Over = true;
            double mult = b.Mult(), amount = Pot(b), profit = amount - b.Stake;
            if (s.Long("casinos") > 0 && profit > 0) { amount += Math.Floor(profit * .25 * s.Long("casinos")); profit = amount - b.Stake; } // New Game+
            AddCoins(amount);
            if (profit > 0 && (b.Frac() >= .5 || mult >= 2))
            {
                s.Set("streak", s.Long("streak") + 1);
                if (s.Long("streak") >= 3) Say("streak", .6, V("streak", s.Long("streak").ToString()));
            }
            Console.WriteLine(); Term.Draw(b, true);
            string label = why == "clear" ? "CLEAN SWEEP" : why == "limit" ? "TABLE LIMIT" : "Cashed out";
            Console.WriteLine(C("  " + label + ": +" + Fmt(profit) + " (x" + Term.FmtX(mult) + ")", "green"));
            int tier = mult >= 50 ? 3 : mult >= 15 ? 2 : mult >= 5 ? 1 : 0;
            if (tier > 0) Console.WriteLine(C("  *** " + new[] { "", "BIG WIN", "HUGE WIN", "MEGA WIN" }[tier] + " ***", new[] { "", "gold", "orange", "red" }[tier]));
            Say(why == "clear" ? "clear" : profit >= Math.Max(300, b.Stake) ? "cash_big" : "cash_small", .6, V("profit", Fmt(profit)));
            return "cash";
        }

        // ---- the Daily Challenge
        void DailyChallenge()
        {
            string key = Daily.Key();
            if (s.Str("daily_key") == key) { DailyResult(key); return; }
            var b = Daily.Create(key);
            Console.WriteLine(C("\n  DAILY #" + Daily.Number(key), "gold") + " · the same board for everyone today, in every version. No shields, no stake. One go.");
            string why = null;
            while (!b.Over)
            {
                Console.WriteLine(); Term.Draw(b);
                Console.WriteLine("  Mult " + C("x" + Term.FmtX(b.Mult()), "gold") + "   Prize " + Fmt(TopTable().Cap * Rules.DAILY_PRIZE * b.Mult()) + "   Gems " + b.GemsFound + "/" + b.GemsTotal);
                string cmd = Term.Ask("  dig C4 · f C4 flag · c cash out > "), low = cmd.ToLowerInvariant();
                if (low == "c" || low == "cash") { b.Over = true; why = "cash"; break; }
                if (low.StartsWith("f ")) { int fi = Term.ParseCoord(cmd.Substring(2), b); if (fi >= 0 && b.Open[fi] == 0) b.Flag[fi] ^= 1; continue; }
                int i = Term.ParseCoord(cmd, b);
                if (i < 0) { Console.WriteLine("  Type a tile like C4, f C4 to flag, or c to cash out."); continue; }
                var r = Daily.Dig(b, i);
                why = r.Why;
                if (r.P > 0 && r.Why != "boom") Console.WriteLine(C("  Risky dig (" + Term.Pct(r.P) + "% mine): pot x" + Term.F2(1 + Rules.BOOST * r.P / (1 - r.P)), "gold"));
                if (r.Gem != null) Console.WriteLine(C("  " + r.Gem.Name.ToUpperInvariant() + "! x" + Term.GemX(r.Gem.X), "gold"));
            }
            string end = why ?? "cash";
            double mult = end == "boom" ? 0 : b.Mult();
            long prize = end == "boom" ? 0 : (long)Math.Round(TopTable().Cap * Rules.DAILY_PRIZE * mult, MidpointRounding.AwayFromZero);
            Console.WriteLine(); Term.Draw(b, true);
            string yesterday = Daily.Key(Daily.Parse(key).AddDays(-1));
            s.Set("daily_streak", s.Str("daily_last") == yesterday ? s.Long("daily_streak") + 1 : 1L);
            s.Set("daily_key", key); s.Set("daily_why", end); s.Set("daily_mult", mult); s.Set("daily_digs", (long)b.Moves.Count);
            s.Set("daily_gems", (long)b.GemsFound); s.Set("daily_total", (long)b.GemsTotal); s.Set("daily_moves", string.Join(",", b.Moves));
            s.Set("daily_prize", prize); s.Set("daily_last", key); s.Set("daily_best", Math.Max(s.Dbl("daily_best"), mult));
            AddCoins(prize);
            s.Write();
            bool top = mult > 0 && Daily.Friends(key).All(f => mult > f.Value);
            Say(end == "boom" ? "daily_boom" : top ? "daily_top" : "daily_ok", .9, V("x", Term.FmtX(mult)));
            DailyResult(key);
        }

        void DailyResult(string key)
        {
            var rows = new List<KeyValuePair<string, double>> { new KeyValuePair<string, double>("you", s.Dbl("daily_mult")) };
            rows.AddRange(Daily.Friends(key));
            rows = rows.OrderByDescending(r => r.Value).ToList();
            Console.WriteLine(C("\n  DAILY #" + Daily.Number(key) + " RESULTS", "gold"));
            for (int k = 0; k < rows.Count; k++)
            {
                string name = rows[k].Key == "you" ? "You" : Rules.FRIENDS[rows[k].Key];
                string line = "  " + (k + 1) + ". " + name.PadRight(14) + " " + (rows[k].Value > 0 ? "x" + Term.FmtX(rows[k].Value) : "blew up");
                Console.WriteLine(rows[k].Key == "you" ? C(line, "gold") : line);
            }
            long streak = s.Long("daily_streak");
            Console.WriteLine("  Prize: +" + Fmt(s.Long("daily_prize")) + " coins. Streak: " + streak + " day" + (streak != 1 ? "s" : "") + ".");
            Console.WriteLine("\n  Share it (copy these lines):\n");
            var moves = s.Str("daily_moves").Split(',').Where(m => m != "").ToList();
            Console.WriteLine(Daily.Share(key, s.Str("daily_why"), s.Dbl("daily_mult"), (int)s.Long("daily_gems"), (int)s.Long("daily_total"), moves));
            var left = DateTime.Today.AddDays(1) - DateTime.Now;
            Console.WriteLine(C("\n  Next board in " + (int)left.TotalHours + "h " + left.Minutes + "m.", "dim"));
        }

        // ---- shop, double or nothing, coin flip
        sealed class Item { public string Id, Name, Desc; public double Cost; public bool Available; }

        void Shop()
        {
            while (true)
            {
                double cap = TopTable().Cap; int charm = (int)s.Long("charm");
                var items = new[] {
                    new Item { Id = "shield", Name = "Shield", Desc = "Survive one mine.", Cost = Math.Ceiling(cap * .3), Available = true },
                    new Item { Id = "goggles", Name = "Dodgy Goggles", Desc = "Show each tile’s mine odds (o on a board).", Cost = 1000000, Available = s.Long("goggles") == 0 },
                    new Item { Id = "charm", Name = "Lucky Charm (Lv " + charm + "/3)", Desc = "+8% odds on flips and Double or Nothing.", Cost = new[] { 2e6, 5e8, 1e11 }[Math.Min(2, charm)], Available = charm < 3 },
                    new Item { Id = "casino", Name = "Buy the Casino", Desc = "The whole building. New Game+: +25% profit forever.", Cost = Rules.CASINO, Available = true } };
                Console.WriteLine("\n  SHOP · you have " + C(Fmt(s.Long("coins")), "gold"));
                for (int k = 0; k < items.Length; k++)
                {
                    var it = items[k];
                    Console.WriteLine(it.Available ? "  [" + (k + 1) + "] " + it.Name.PadRight(22) + " " + Fmt(it.Cost).PadLeft(8) + "  " + it.Desc
                        : C("  [" + (k + 1) + "] " + it.Name.PadRight(22) + "     done  " + it.Desc, "dim"));
                }
                string got = Term.Ask("  Buy (number, Enter to leave): ");
                if (got == "") return;
                int n;
                if (!int.TryParse(got, out n) || n < 1 || n > items.Length) continue;
                var item = items[n - 1];
                if (!item.Available) continue;
                if (s.Long("coins") < item.Cost) { Console.WriteLine("  Not enough coins. You need " + Fmt(item.Cost) + "."); continue; }
                AddCoins(-item.Cost);
                if (item.Id == "shield") s.Set("shields", s.Long("shields") + 1);
                else if (item.Id == "goggles") s.Set("goggles", 1L);
                else if (item.Id == "charm") s.Set("charm", s.Long("charm") + 1);
                else
                {
                    s.Set("casinos", s.Long("casinos") + 1);
                    Console.WriteLine(C("\n  YOU OWN THE CASINO.", "gold") + " From " + Fmt(Rules.START) + " coins to the deeds.");
                    Console.WriteLine("  New Game+: every win now pays +" + 25 * s.Long("casinos") + "% profit. Starting a fresh run.");
                    Say("casino", 1);
                    ResetRun();
                    return;
                }
                Console.WriteLine(C("  " + item.Name + " bought.", "green"));
                Say("buy");
                s.Write();
            }
        }

        void DoubleOrNothing()
        {
            if (s.Long("coins") < 100) { Console.WriteLine("  You need at least 100 coins to gamble the lot."); return; }
            for (int step = 0; step < Rules.LADDER.Length; step++)
            {
                int m = Rules.LADDER[step]; long stake = s.Long("coins");
                double chance = Math.Min(.95, 1.0 / m * Luck());
                Console.WriteLine(C("\n  " + (step == 0 ? "DOUBLE OR NOTHING" : "LET IT RIDE: x" + m + "?"), "red") +
                    " Stake " + Fmt(stake) + " to win " + Fmt((double)stake * m) + ". Chance " + Term.Pct(chance) + "%.");
                Say("don_offer", step > 0 ? .9 : .7);
                Console.WriteLine(C("  " + Rules.SURE[step], "bold") + " Type YES to go" + (step > 0 ? ", anything else to walk away." : ", anything else to back out."));
                if (Term.Ask("> ") != "YES")
                {
                    if (step > 0) Console.WriteLine(C("  Walked away with " + Fmt(s.Long("coins")) + ". Smart. Boring, but smart.", "green"));
                    return;
                }
                for (int k = 0; k < 3; k++) { Console.WriteLine("  ..."); Thread.Sleep(250); }
                if (Rng.Luck.NextDouble() < chance)
                {
                    s.Set("coins", (long)Math.Floor((double)stake * m));
                    s.Set("best", Math.Max(s.Long("best"), s.Long("coins")));
                    Console.WriteLine(C("  WON! You have " + Fmt(s.Long("coins")) + ".", "green"));
                    Say("don_win", 1);
                    s.Write();
                }
                else
                {
                    Console.WriteLine(C("  Lost.", "red"));
                    Bust("Double or nothing said nothing.");
                    return;
                }
            }
            Console.WriteLine(C("  You climbed the whole ladder. Absolute legend.", "gold"));
        }

        void CoinFlip()
        {
            long coins = s.Long("coins"), def = Math.Max(1L, coins / 10);
            string got = Term.Ask("  Bet (Enter for " + Fmt(def) + "): ").Replace(",", "");
            long bet;
            if (got == "") bet = def; else if (!long.TryParse(got, out bet)) bet = 0;
            if (bet <= 0 || bet > coins) { Console.WriteLine("  Bet something you actually have."); return; }
            string side = Term.Ask("  Heads or tails? (h/t) ").ToLowerInvariant();
            side = side.Length > 0 ? side.Substring(0, 1) : "";
            if (side != "h" && side != "t") return;
            bool win = Rng.Luck.NextDouble() < Math.Min(.95, .5 * Luck());
            string landed = win ? side : side == "h" ? "t" : "h";
            Console.WriteLine("  It's... " + (landed == "h" ? "heads" : "tails") + "!");
            AddCoins(win ? bet : -bet);
            Console.WriteLine(win ? C("  +" + Fmt(bet) + ". The coin likes you.", "green") : C("  -" + Fmt(bet) + ". The coin does not like you.", "red"));
            Say(win ? "flip_win" : "flip_lose");
            if (s.Long("coins") < Rules.TABLES[0].Min) Bust("Out of coins.");
            s.Write();
        }
    }
}
