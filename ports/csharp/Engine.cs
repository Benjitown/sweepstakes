// The rules engine: seeded randomness, the board, the solver and the Daily Challenge.
// Same rules as the web game (src/board, src/game/daily.js), so the daily board and its scores match exactly.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

namespace Sweepstakes
{
    // ================================================================= seeded randomness (src/core/random.js)
    /// <summary>mulberry32: doubles in [0, 1), bit-for-bit the same sequence as the web game.</summary>
    public sealed class Seeded
    {
        uint a;
        public Seeded(uint seed) { a = seed; }
        public double Next()
        {
            unchecked
            {
                a += 0x6D2B79F5;
                uint t = a;
                t = (t ^ (t >> 15)) * (t | 1);
                t ^= t + (t ^ (t >> 7)) * (t | 61);
                return (t ^ (t >> 14)) / 4294967296.0;
            }
        }
    }

    public static class Rng
    {
        public static Random Luck = new Random();

        /// <summary>FNV-1a, 32-bit.</summary>
        public static uint HashString(string s)
        {
            unchecked { uint h = 0x811c9dc5; foreach (char ch in s) h = (h ^ ch) * 0x01000193; return h; }
        }

        public static GemTier RollGem(Func<double> rng)
        {
            double r = rng();
            foreach (var g in Rules.GEMS) { r -= g.W; if (r <= 0) return g; }
            return Rules.GEMS[0];
        }

        public static GemTier Tier(double x) { return Rules.GEMS.FirstOrDefault(g => Math.Abs(g.X - x) < 1e-6) ?? Rules.GEMS[0]; }

        /// <summary>JavaScript's Math.round(x * 100) / 100: halves round up.</summary>
        public static double Round2(double x) { return Math.Floor(x * 100 + 0.5) / 100; }
    }

    // ================================================================= the board (src/board/board.js)
    public sealed class Board
    {
        static readonly Dictionary<int, int[][]> NbCache = new Dictionary<int, int[][]>();

        public readonly Table T; public readonly long Stake; public readonly int M, W, H, N, Safe; public readonly double Lim;
        public readonly int[][] Nb; public readonly int[] Mine, Open, Flag, Num; public readonly double[] Gem;
        public bool Started, Over, Golden;
        public int Revealed, Base, Guesses, Combo, GemsTotal, GemsFound;
        public double G = 1, J = 1;
        public readonly List<string> Moves = new List<string>();
        public Solved Ded;
        readonly Func<double> rng;

        public Board(Table t, long stake, int mines, double limit, Func<double> random = null)
        {
            T = t; Stake = stake; M = mines; Lim = limit; W = t.W; H = t.H; N = W * H; Safe = N - mines;
            Nb = Neighbours(W, H);
            Mine = new int[N]; Open = new int[N]; Flag = new int[N]; Num = new int[N]; Gem = new double[N];
            GemsTotal = t.Gems;
            rng = random ?? (() => Rng.Luck.NextDouble());
        }

        public static int[][] Neighbours(int w, int h)
        {
            int key = w * 1000 + h; int[][] got;
            if (NbCache.TryGetValue(key, out got)) return got;
            var all = new int[w * h][];
            for (int i = 0; i < w * h; i++)
            {
                int x = i % w, y = i / w; var a = new List<int>();
                for (int dy = -1; dy <= 1; dy++) for (int dx = -1; dx <= 1; dx++)
                {
                    if (dx == 0 && dy == 0) continue;
                    int nx = x + dx, ny = y + dy;
                    if (nx >= 0 && ny >= 0 && nx < w && ny < h) a.Add(ny * w + nx);
                }
                all[i] = a.ToArray();
            }
            NbCache[key] = all;
            return all;
        }

        public void CalcNums() { for (int i = 0; i < N; i++) { int c = 0; foreach (int j in Nb[i]) c += Mine[j]; Num[i] = c; } }

        void Shuffle(List<int> pool)
        {
            for (int k = pool.Count - 1; k > 0; k--)
            {
                int j = (int)Math.Floor(rng() * (k + 1));
                int tmp = pool[k]; pool[k] = pool[j]; pool[j] = tmp;
            }
        }

        public void PlaceMines(int first)
        {
            var ban = new HashSet<int>(Nb[first]) { first };
            var pool = Enumerable.Range(0, N).Where(i => !ban.Contains(i)).ToList();
            if (pool.Count < M) pool = Enumerable.Range(0, N).Where(i => i != first).ToList();
            Shuffle(pool);
            for (int k = 0; k < M; k++) Mine[pool[k]] = 1;
            CalcNums();
        }

        public void PlaceGems(int count)
        {
            var pool = Enumerable.Range(0, N).Where(i => Open[i] == 0 && Mine[i] == 0).ToList();
            Shuffle(pool);
            GemsTotal = Math.Min(count, pool.Count);
            for (int k = 0; k < GemsTotal; k++) Gem[pool[k]] = Rng.RollGem(rng).X;
        }

        public List<int> Flood(int i)
        {
            var stack = new Stack<int>(); stack.Push(i); var outp = new List<int>();
            while (stack.Count > 0)
            {
                int k = stack.Pop();
                if (Open[k] == 1 || Flag[k] == 1 || Mine[k] == 1) continue;
                Open[k] = 1; Revealed++; outp.Add(k);
                if (Num[k] == 0) foreach (int j in Nb[k]) if (Open[j] == 0 && Flag[j] == 0) stack.Push(j);
            }
            return outp;
        }

        public int HiddenGems() { int n = 0; for (int i = 0; i < N; i++) if (Gem[i] != 0 && Open[i] == 0) n++; return n; }
        public double Frac() { if (!Started) return 0; int d = Safe - Base; return d <= 0 ? 1 : (double)(Revealed - Base) / d; }
        public double RawMult() { return !Started ? J : (1 + T.Prog * Frac()) * G * J * (Revealed >= Safe ? Rules.CLEAR : 1); }
        public double Mult() { return Math.Min(Lim, RawMult()); }
    }

    // ================================================================= the solver (src/board/solver.js)
    public sealed class Solved
    {
        public readonly int[] KM, KS; public readonly float[] P; public readonly int V;
        public Solved(int[] km, int[] ks, float[] p, int v) { KM = km; KS = ks; P = p; V = v; }
    }

    public static class Solver
    {
        sealed class Info { public List<int> H; public int R; }

        public static void Deduce(Board b, bool subset, out int[] km, out int[] ks)
        {
            km = new int[b.N]; ks = new int[b.N];
            bool changed = true; int passes = 0;
            while (changed && passes < 80)
            {
                changed = false; var info = new List<Info>();
                for (int i = 0; i < b.N; i++)
                {
                    if (b.Open[i] == 0 || b.Num[i] == 0) continue;
                    var hid = new List<int>(); int f = 0;
                    foreach (int j in b.Nb[i]) { if (km[j] == 1) f++; else if (b.Open[j] == 0 && ks[j] == 0) hid.Add(j); }
                    if (hid.Count == 0) continue;
                    int r = b.Num[i] - f;
                    if (r == hid.Count) { foreach (int j in hid) km[j] = 1; changed = true; }
                    else if (r == 0) { foreach (int j in hid) ks[j] = 1; changed = true; }
                    else info.Add(new Info { H = hid, R = r });
                }
                if (!changed && subset)
                {
                    bool done = false;
                    foreach (var A in info)
                    {
                        foreach (var B in info)
                        {
                            if (ReferenceEquals(A, B) || A.H.Count >= B.H.Count || !A.H.All(x => B.H.Contains(x))) continue;
                            var diff = B.H.Where(x => !A.H.Contains(x)).ToList(); int dr = B.R - A.R;
                            if (dr == 0) { foreach (int j in diff) ks[j] = 1; changed = done = true; break; }
                            if (dr == diff.Count) { foreach (int j in diff) km[j] = 1; changed = done = true; break; }
                        }
                        if (done) break;
                    }
                }
                passes++;
            }
        }

        /// <summary>Mine odds as 32-bit floats, exactly like the web game's Float32Array.</summary>
        public static float[] Odds(Board b, int[] km, int[] ks)
        {
            var p = new float[b.N];
            for (int i = 0; i < b.N; i++) p[i] = float.NaN;
            int kmc = 0, unk = 0;
            for (int i = 0; i < b.N; i++) { if (b.Open[i] == 1) continue; if (km[i] == 1) kmc++; else if (ks[i] == 0) unk++; }
            double glob = unk > 0 ? Math.Max(0, Math.Min(1, (double)(b.M - kmc) / unk)) : 0;
            for (int i = 0; i < b.N; i++)
            {
                if (b.Open[i] == 0 || b.Num[i] == 0) continue;
                var hid = new List<int>(); int f = 0;
                foreach (int j in b.Nb[i]) { if (km[j] == 1) f++; else if (b.Open[j] == 0 && ks[j] == 0) hid.Add(j); }
                if (hid.Count == 0) continue;
                double q = Math.Max(0, Math.Min(1, (double)(b.Num[i] - f) / hid.Count));
                foreach (int j in hid) p[j] = float.IsNaN(p[j]) ? (float)q : (float)Math.Max((double)p[j], q);
            }
            for (int i = 0; i < b.N; i++)
            {
                if (b.Open[i] == 1 || ks[i] == 1) p[i] = 0; else if (km[i] == 1) p[i] = 1; else if (float.IsNaN(p[i])) p[i] = (float)glob;
            }
            return p;
        }

        public static Solved Solve(Board b)
        {
            if (b.Ded != null && b.Ded.V == b.Revealed) return b.Ded;
            int[] km, ks; Deduce(b, true, out km, out ks);
            b.Ded = new Solved(km, ks, Odds(b, km, ks), b.Revealed);
            return b.Ded;
        }

        public static double RiskOf(Board b, int i) { var d = Solve(b); return d.KS[i] == 1 ? 0 : Math.Min(0.95, (double)d.P[i]); }
    }

    // ================================================================= the Daily Challenge (src/game/daily.js)
    public sealed class DigResult { public string Why; public double P; public GemTier Gem; }

    public static class Daily
    {
        static readonly DateTime Epoch = new DateTime(Rules.DAILY_EPOCH[0], Rules.DAILY_EPOCH[1], Rules.DAILY_EPOCH[2]);
        static readonly string[] Months = { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
        public static readonly Dictionary<string, string> Emoji = new Dictionary<string, string> {
            { "safe", "🟩" }, { "r1", "🟨" }, { "r2", "🟧" }, { "r3", "🟥" }, { "gem", "💎" }, { "boom", "💥" }, { "cash", "💰" }, { "clear", "🏁" }, { "limit", "🚀" } };

        public static string Key() { return Key(DateTime.Now); }
        public static string Key(DateTime d) { return d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture); }
        public static DateTime Parse(string key) { return DateTime.ParseExact(key, "yyyy-MM-dd", CultureInfo.InvariantCulture); }
        public static int Number(string key) { return (int)Math.Round((Parse(key) - Epoch).TotalDays) + 1; }

        public static Board Create(string key)
        {
            var seeded = new Seeded(Rng.HashString(Rules.DAILY_SEED + key));
            Func<double> rng = seeded.Next;
            var t = Rules.TABLES.First(x => x.Id == Rules.DAILY_TABLE);
            var b = new Board(t, 0, t.M, Rules.DAILY_LIMIT, rng);
            int row = 2 + (int)Math.Floor(rng() * (t.H - 4));
            int col = 2 + (int)Math.Floor(rng() * (t.W - 4));
            int start = row * t.W + col;
            b.PlaceMines(start); b.Started = true; b.Flood(start); b.Base = b.Revealed;
            b.PlaceGems(Rules.DAILY_GEMS);
            return b;
        }

        public static DigResult Dig(Board b, int i)
        {
            if (b.Over || b.Open[i] == 1 || b.Flag[i] == 1) return new DigResult();
            double p = Solver.RiskOf(b, i);
            if (b.Mine[i] == 1) { b.Moves.Add("boom"); b.Over = true; return new DigResult { Why = "boom", P = p }; }
            var opened = b.Flood(i);
            GemTier gem = null;
            if (p > 0) { b.G *= 1 + Rules.BOOST * p / (1 - p); b.Guesses++; b.Combo++; }
            foreach (int j in opened) if (b.Gem[j] != 0) { b.J *= b.Gem[j]; b.GemsFound++; gem = Rng.Tier(b.Gem[j]); }
            b.Moves.Add(gem != null ? "gem" : p >= .5 ? "r3" : p >= .25 ? "r2" : p > 0 ? "r1" : "safe");
            if (b.Revealed >= b.Safe) { b.Over = true; return new DigResult { Why = "clear", P = p, Gem = gem }; }
            if (b.RawMult() >= b.Lim) { b.Over = true; return new DigResult { Why = "limit", P = p, Gem = gem }; }
            return new DigResult { P = p, Gem = gem };
        }

        /// <summary>The group chat plays the same daily; their scores come from the date too.</summary>
        public static List<KeyValuePair<string, double>> Friends(string key)
        {
            var rng = new Seeded(Rng.HashString(Rules.DAILY_CHAT_SEED + key));
            var outp = new List<KeyValuePair<string, double>>();
            foreach (var s in Rules.DAILY_STYLES)
            {
                bool blew = rng.Next() < s.Boom;
                double r = rng.Next();
                double x = s.Lo + (s.Hi - s.Lo) * (r * r);
                outp.Add(new KeyValuePair<string, double>(s.Who, blew ? 0 : Rng.Round2(x)));
            }
            return outp;
        }

        public static string Share(string key, string why, double mult, int gems, int total, List<string> moves)
        {
            var d = Parse(key);
            string head = why == "boom" ? "blew up 💥" : "×" + mult.ToString("0.00", CultureInfo.InvariantCulture) + " " + Emoji[why];
            var trail = moves.Select(m => Emoji[m]).ToList();
            if (why != "boom") trail.Add(Emoji[why]);
            var rows = new List<string>();
            for (int k = 0; k < trail.Count; k += 10) rows.Add(string.Concat(trail.Skip(k).Take(10)));
            int digs = moves.Count;
            return "Sweepstakes Daily #" + Number(key) + " · " + d.Day + " " + Months[d.Month - 1] + "\n" +
                head + " · 💎 " + gems + "/" + total + " · " + digs + " dig" + (digs == 1 ? "" : "s") + "\n" + string.Join("\n", rows);
        }
    }
}
