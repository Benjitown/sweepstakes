// The save file, shared by the Python, Kotlin and C# versions (key=value lines): your coins follow you between languages.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;

namespace Sweepstakes
{
    public sealed class Save
    {
        public static string Path = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".sweepstakes", "save.txt");
        static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

        // the order and types every version agrees on
        public static readonly List<KeyValuePair<string, object>> Defaults = new List<KeyValuePair<string, object>> {
            Kv("coins", Rules.START), Kv("unlocked", "penny"), Kv("busts", 0L), Kv("streak", 0L), Kv("shields", 0L), Kv("goggles", 0L), Kv("charm", 0L),
            Kv("casinos", 0L), Kv("best", Rules.START), Kv("boards", 0L),
            Kv("daily_key", ""), Kv("daily_why", ""), Kv("daily_mult", 0.0), Kv("daily_digs", 0L), Kv("daily_gems", 0L), Kv("daily_total", 0L),
            Kv("daily_moves", ""), Kv("daily_prize", 0L), Kv("daily_streak", 0L), Kv("daily_last", ""), Kv("daily_best", 0.0) };
        static KeyValuePair<string, object> Kv(string k, object v) { return new KeyValuePair<string, object>(k, v); }

        readonly Dictionary<string, object> v = new Dictionary<string, object>();

        public Save()
        {
            foreach (var kv in Defaults) v[kv.Key] = kv.Value;
            try
            {
                if (!File.Exists(Path)) return;
                foreach (string line in File.ReadAllLines(Path, Encoding.UTF8))
                {
                    int at = line.IndexOf('=');
                    if (at <= 0 || line.StartsWith("#")) continue;
                    string k = line.Substring(0, at), raw = line.Substring(at + 1);
                    if (!v.ContainsKey(k)) continue;
                    object def = Defaults.First(d => d.Key == k).Value;
                    long l; double d2;
                    if (def is long) { if (long.TryParse(raw, NumberStyles.Integer, Inv, out l)) v[k] = l; }
                    else if (def is double) { if (double.TryParse(raw, NumberStyles.Float, Inv, out d2)) v[k] = d2; }
                    else v[k] = raw;
                }
            }
            catch (Exception) { /* a broken save just means a fresh start */ }
        }

        public long Long(string k) { return (long)v[k]; }
        public double Dbl(string k) { return (double)v[k]; }
        public string Str(string k) { return (string)v[k]; }
        public void Set(string k, object value) { v[k] = value; }

        public void Write()
        {
            try
            {
                Directory.CreateDirectory(System.IO.Path.GetDirectoryName(Path));
                var sb = new StringBuilder("# Sweepstakes terminal save, shared by the Python, Kotlin and C# versions\n");
                foreach (var kv in Defaults)
                {
                    object val = v[kv.Key];
                    sb.Append(kv.Key).Append('=').Append(val is double ? ((double)val).ToString("R", Inv) : Convert.ToString(val, Inv)).Append('\n');
                }
                File.WriteAllText(Path, sb.ToString(), new UTF8Encoding(false));
            }
            catch (Exception e) { Console.WriteLine(Term.C("  (couldn't save: " + e.Message + ")", "dim")); }
        }
    }
}
