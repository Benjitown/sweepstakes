// Sweepstakes, terminal edition (C#). Minesweeper, but you're gambling.
//
//   dotnet run                          build and play (.NET 6 or newer)
//   dotnet run -- --plain               no colours
//   dotnet run -- --selftest            check the Daily Challenge matches the web game exactly
//   dotnet run -- --seed 7 --save FILE  repeatable luck / another save file
//   (Mono: mcs -codepage:utf8 -out:sweepstakes.exe *.cs && mono sweepstakes.exe)
//
// The rules and jokes are in Rules.cs, generated from the web game by tools/export_rules.mjs.
using System;
using System.Linq;

namespace Sweepstakes
{
    public static class Program
    {
        static int Selftest()
        {
            bool ok = true;
            foreach (var g in Rules.GOLDEN_BOARDS)
            {
                var b = Daily.Create(g.Key);
                var gemAt = Enumerable.Range(0, b.N).Where(i => b.Gem[i] != 0).ToArray();
                var friends = Daily.Friends(g.Key);
                bool same = string.Concat(b.Mine) == g.Mines && string.Concat(b.Open) == g.Open
                    && gemAt.SequenceEqual(g.GemAt) && gemAt.Select(i => b.Gem[i]).SequenceEqual(g.GemX)
                    && friends.Select(f => f.Key).SequenceEqual(g.FriendWho) && friends.Select(f => f.Value).SequenceEqual(g.FriendMult)
                    && Daily.Number(g.Key) == g.Number;
                ok &= same;
                Console.WriteLine((same ? "PASS" : "FAIL") + " daily board " + g.Key + " #" + g.Number);
            }
            foreach (var r in Rules.GOLDEN_RUNS)
            {
                var b = Daily.Create(r.Key);
                string why = null;
                for (int step = 0; step < 12 && !b.Over; step++)
                {
                    var d = Solver.Solve(b);
                    int pick = -1;
                    for (int i = 0; i < b.N; i++) if (b.Open[i] == 0 && b.Flag[i] == 0 && d.KS[i] == 1) { pick = i; break; }
                    if (pick < 0)
                    {
                        double best = 2;
                        for (int i = 0; i < b.N; i++)
                        {
                            if (b.Open[i] == 1 || b.Flag[i] == 1 || d.P[i] >= 1) continue;
                            if (d.P[i] < best) { best = d.P[i]; pick = i; }
                        }
                    }
                    if (pick < 0) break;
                    why = Daily.Dig(b, pick).Why;
                }
                string end = why ?? "cash";
                double mult = end == "boom" ? 0 : b.Mult();
                bool same = b.Moves.SequenceEqual(r.Moves) && b.Revealed == r.Revealed && end == r.Why && mult == r.Mult;
                ok &= same;
                Console.WriteLine((same ? "PASS" : "FAIL") + " golden run " + r.Key + ": " + end + " x" + mult.ToString("R", System.Globalization.CultureInfo.InvariantCulture)
                    + " after " + b.Moves.Count + " digs" + (same ? "" : " (web: " + r.Why + " x" + r.Mult + ")"));
            }
            Console.WriteLine(ok ? "all good: this version plays the exact same daily as the web game" : "MISMATCH with the web game");
            return ok ? 0 : 1;
        }

        public static int Main(string[] args)
        {
            Term.Setup();
            if (args.Contains("--plain") || Environment.GetEnvironmentVariable("NO_COLOR") != null || Console.IsOutputRedirected) Term.Color = false;
            int at = Array.IndexOf(args, "--seed");
            if (at >= 0 && at + 1 < args.Length) Rng.Luck = new Random(int.Parse(args[at + 1]));
            at = Array.IndexOf(args, "--save");
            if (at >= 0 && at + 1 < args.Length) Save.Path = args[at + 1];
            if (args.Contains("--selftest")) return Selftest();
            try { new Game(new Save()).Run(); }
            catch (QuitGame) { /* end of input: the game saves as it goes */ }
            return 0;
        }
    }
}
