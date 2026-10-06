// The terminal: colours, input, number formatting, the group chat and drawing a board.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;

namespace Sweepstakes
{
    public sealed class QuitGame : Exception { }

    public static class Term
    {
        public static bool Color = true;
        static readonly Dictionary<string, int> Codes = new Dictionary<string, int> {
            { "red", 31 }, { "green", 32 }, { "gold", 33 }, { "blue", 34 }, { "purple", 35 }, { "cyan", 36 }, { "dim", 90 }, { "bold", 1 }, { "orange", 91 } };
        public static readonly Dictionary<string, string> FriendColor = new Dictionary<string, string> {
            { "dave", "blue" }, { "tash", "red" }, { "kev", "green" }, { "nan", "purple" }, { "priya", "gold" } };
        static readonly string[] NumColor = { "", "blue", "green", "red", "purple", "orange", "cyan", "gold", "bold" };
        static readonly CultureInfo UK = CultureInfo.GetCultureInfo("en-GB"), Inv = CultureInfo.InvariantCulture;

        public static string C(object text, string name)
        {
            return Color && name != null ? "\u001b[" + Codes[name] + "m" + text + "\u001b[0m" : Convert.ToString(text, Inv);
        }

        /// <summary>Reads a line; end of input quits the game cleanly.</summary>
        public static string Ask(string prompt = "> ")
        {
            Console.Write(prompt);
            string line = Console.ReadLine();
            if (line == null) throw new QuitGame();
            return line.Trim();
        }

        public static string Fmt(double v)
        {
            long n = (long)Math.Floor(v); double a = Math.Abs((double)n);
            if (a < 10000) return n.ToString("#,0", UK);
            var units = new[] { Tuple.Create(1e18, "Qi"), Tuple.Create(1e15, "Qa"), Tuple.Create(1e12, "T"), Tuple.Create(1e9, "B"), Tuple.Create(1e6, "M"), Tuple.Create(1e3, "K") };
            foreach (var u in units)
                if (a >= u.Item1) return (n / u.Item1).ToString(a / u.Item1 < 100 ? "0.00" : "0.0", Inv).TrimEnd('0').TrimEnd('.') + u.Item2;
            return n.ToString(Inv);
        }

        public static string FmtX(double x) { return x >= 100 ? Fmt(x) : x >= 10 ? x.ToString("0.0", Inv) : x.ToString("0.00", Inv); }
        public static string FmtLim(double x) { return x == Math.Floor(x) ? Fmt(x) : FmtX(x); }
        public static string Pct(double p) { return Math.Round(p * 100, MidpointRounding.AwayFromZero).ToString(Inv); }
        public static string F2(double x) { return x.ToString("0.00", Inv); }
        public static string GemX(double x) { return x.ToString("0.##", Inv); }

        public static double Nice(double v)
        {
            if (v < 100) return Math.Round(v, MidpointRounding.AwayFromZero);
            double p = Math.Pow(10, Math.Floor(Math.Log10(v)) - 1);
            return Math.Round(v / p, MidpointRounding.AwayFromZero) * p;
        }

        /// <summary>Someone in the group chat reacts.</summary>
        public static void Say(string ev, double chance = .6, Dictionary<string, string> vars = null)
        {
            string[][] pool;
            if (!Rules.LINES.TryGetValue(ev, out pool) || Rng.Luck.NextDouble() > chance) return;
            var pick = pool[Rng.Luck.Next(pool.Length)];
            string text = pick[1];
            if (vars != null) foreach (var kv in vars) text = text.Replace("{" + kv.Key + "}", kv.Value);
            string col; if (!FriendColor.TryGetValue(pick[0], out col)) col = "bold";
            Console.WriteLine("  " + C(Rules.FRIENDS[pick[0]], col) + ": " + text);
        }

        public static void Quip(double chance)
        {
            if (Rng.Luck.NextDouble() < chance) Console.WriteLine(C("  * " + Rules.QUIPS[Rng.Luck.Next(Rules.QUIPS.Length)] + " *", "purple"));
        }

        public static string Coord(int i, int w) { return ((char)('A' + i % w)).ToString() + (i / w + 1); }

        public static int ParseCoord(string raw, Board b)
        {
            string s = raw.Trim().ToUpperInvariant();
            if (s.Length < 2 || !char.IsLetter(s[0]) || !s.Substring(1).All(char.IsDigit)) return -1;
            int x = s[0] - 'A', y;
            if (!int.TryParse(s.Substring(1), out y)) return -1;
            y -= 1;
            return x >= 0 && x < b.W && y >= 0 && y < b.H ? y * b.W + x : -1;
        }

        public static void Draw(Board b, bool reveal = false, bool oddsOn = false)
        {
            float[] p = oddsOn && b.Started && !b.Over ? Solver.Solve(b).P : null;
            Console.WriteLine("     " + string.Join(" ", Enumerable.Range(0, b.W).Select(x => ((char)('A' + x)).ToString())));
            Console.WriteLine("   +" + new string('-', b.W * 2 + 1) + "+");
            for (int y = 0; y < b.H; y++)
            {
                var row = new List<string>();
                for (int x = 0; x < b.W; x++)
                {
                    int i = y * b.W + x;
                    if (b.Open[i] == 1) row.Add(b.Gem[i] != 0 && b.Num[i] == 0 ? C("$", "gold") : b.Num[i] > 0 ? C(b.Num[i], NumColor[b.Num[i]]) : C(".", "dim"));
                    else if (b.Flag[i] == 1) row.Add(C("F", "red"));
                    else if (reveal && b.Mine[i] == 1) row.Add(C("*", "red"));
                    else if (reveal && b.Gem[i] != 0) row.Add(C("$", "gold"));
                    else if (p != null) row.Add(C(Math.Min(9, (int)(p[i] * 10)), p[i] < .2 ? "green" : p[i] < .35 ? "gold" : "red"));
                    else row.Add("#");
                }
                Console.WriteLine((y + 1).ToString(Inv).PadLeft(2) + " | " + string.Join(" ", row) + " |");
            }
            Console.WriteLine("   +" + new string('-', b.W * 2 + 1) + "+");
        }

        /// <summary>UTF-8 output, and colour codes switched on in the classic Windows console.</summary>
        public static void Setup()
        {
            try { Console.OutputEncoding = new UTF8Encoding(false); } catch (Exception) { }
            if (Environment.OSVersion.Platform != PlatformID.Win32NT) return;
            try
            {
                IntPtr handle = GetStdHandle(-11); uint mode;
                if (GetConsoleMode(handle, out mode)) SetConsoleMode(handle, mode | 0x0004);
            }
            catch (Exception) { Color = false; }
        }

        [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int nStdHandle);
        [DllImport("kernel32.dll")] static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);
        [DllImport("kernel32.dll")] static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);
    }
}
