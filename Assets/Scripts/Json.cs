using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace Pfahlstadt
{
    /// Kleiner JSON-Leser und -Schreiber (Dictionary&lt;string, object&gt;, List&lt;object&gt;, double, string, bool, null)
    public static class Json
    {
        public static object Parse(string s)
        {
            if (string.IsNullOrEmpty(s)) return null;
            int i = 0;
            var v = Value(s, ref i);
            return v;
        }

        static void Ws(string s, ref int i) { while (i < s.Length && char.IsWhiteSpace(s[i])) i++; }

        static object Value(string s, ref int i)
        {
            Ws(s, ref i);
            if (i >= s.Length) return null;
            char ch = s[i];
            if (ch == '{')
            {
                var d = new Dictionary<string, object>();
                i++; Ws(s, ref i);
                if (i < s.Length && s[i] == '}') { i++; return d; }
                while (i < s.Length)
                {
                    Ws(s, ref i);
                    string k = Str(s, ref i);
                    Ws(s, ref i); if (i < s.Length && s[i] == ':') i++;
                    d[k] = Value(s, ref i);
                    Ws(s, ref i);
                    if (i < s.Length && s[i] == ',') { i++; continue; }
                    if (i < s.Length && s[i] == '}') { i++; break; }
                    break;
                }
                return d;
            }
            if (ch == '[')
            {
                var l = new List<object>();
                i++; Ws(s, ref i);
                if (i < s.Length && s[i] == ']') { i++; return l; }
                while (i < s.Length)
                {
                    l.Add(Value(s, ref i));
                    Ws(s, ref i);
                    if (i < s.Length && s[i] == ',') { i++; continue; }
                    if (i < s.Length && s[i] == ']') { i++; break; }
                    break;
                }
                return l;
            }
            if (ch == '"') return Str(s, ref i);
            if (s.Length - i >= 4 && string.CompareOrdinal(s, i, "true", 0, 4) == 0) { i += 4; return true; }
            if (s.Length - i >= 5 && string.CompareOrdinal(s, i, "false", 0, 5) == 0) { i += 5; return false; }
            if (s.Length - i >= 4 && string.CompareOrdinal(s, i, "null", 0, 4) == 0) { i += 4; return null; }
            int st = i;
            while (i < s.Length && "+-0123456789.eE".IndexOf(s[i]) >= 0) i++;
            double num;
            double.TryParse(s.Substring(st, i - st), NumberStyles.Float, CultureInfo.InvariantCulture, out num);
            if (i == st) i++;
            return num;
        }

        static string Str(string s, ref int i)
        {
            if (i >= s.Length || s[i] != '"') return "";
            i++;
            var sb = new StringBuilder();
            while (i < s.Length)
            {
                char ch = s[i++];
                if (ch == '"') break;
                if (ch == '\\' && i < s.Length)
                {
                    char e = s[i++];
                    switch (e)
                    {
                        case 'n': sb.Append('\n'); break;
                        case 't': sb.Append('\t'); break;
                        case 'r': sb.Append('\r'); break;
                        case 'b': sb.Append('\b'); break;
                        case 'f': sb.Append('\f'); break;
                        case 'u':
                            if (i + 4 <= s.Length) { sb.Append((char)Convert.ToInt32(s.Substring(i, 4), 16)); i += 4; }
                            break;
                        default: sb.Append(e); break;
                    }
                }
                else sb.Append(ch);
            }
            return sb.ToString();
        }

        public static string Write(object o)
        {
            var sb = new StringBuilder();
            W(sb, o);
            return sb.ToString();
        }

        static void W(StringBuilder sb, object o)
        {
            if (o == null) { sb.Append("null"); return; }
            if (o is string s) { Q(sb, s); return; }
            if (o is bool b) { sb.Append(b ? "true" : "false"); return; }
            if (o is int || o is long || o is short) { sb.Append(Convert.ToInt64(o).ToString(CultureInfo.InvariantCulture)); return; }
            if (o is float || o is double) { double d = Convert.ToDouble(o); sb.Append(double.IsNaN(d) || double.IsInfinity(d) ? "0" : d.ToString("R", CultureInfo.InvariantCulture)); return; }
            if (o is IDictionary<string, object> dict)
            {
                sb.Append('{'); bool first = true;
                foreach (var kv in dict) { if (!first) sb.Append(','); first = false; Q(sb, kv.Key); sb.Append(':'); W(sb, kv.Value); }
                sb.Append('}'); return;
            }
            if (o is System.Collections.IEnumerable en)
            {
                sb.Append('['); bool first = true;
                foreach (var x in en) { if (!first) sb.Append(','); first = false; W(sb, x); }
                sb.Append(']'); return;
            }
            Q(sb, o.ToString());
        }

        static void Q(StringBuilder sb, string s)
        {
            sb.Append('"');
            foreach (char ch in s)
            {
                switch (ch)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (ch < 32) sb.Append("\\u" + ((int)ch).ToString("x4")); else sb.Append(ch);
                        break;
                }
            }
            sb.Append('"');
        }
    }

    /// Bequeme Zugriffe auf geparste JSON-Daten
    public static class J
    {
        public static Dictionary<string, object> D(object o) => o as Dictionary<string, object>;
        public static Dictionary<string, object> D(object o, string k) { var d = D(o); return d != null && d.TryGetValue(k, out var v) ? v as Dictionary<string, object> : null; }
        public static List<object> L(object o, string k) { var d = D(o); return d != null && d.TryGetValue(k, out var v) && v is List<object> l ? l : new List<object>(); }
        public static object V(object o, string k) { var d = D(o); return d != null && d.TryGetValue(k, out var v) ? v : null; }
        public static bool Has(object o, string k) => V(o, k) != null;
        public static string S(object o, string k) { var v = V(o, k); return v == null ? "" : v is string s ? s : Convert.ToString(v, CultureInfo.InvariantCulture); }
        public static double N(object o, string k) { var v = V(o, k); if (v is double d) return d; if (v is string s && double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var x)) return x; if (v is bool b) return b ? 1 : 0; return 0; }
        public static float F(object o, string k) => (float)N(o, k);
        public static int I(object o, string k) => (int)Math.Round(N(o, k));
        public static bool B(object o, string k) { var v = V(o, k); return v is bool b ? b : v is double d && d != 0; }
        public static int[] U(object o, string k)
        {
            var r = new int[5]; var l = V(o, k) as List<object>;
            if (l != null) for (int i = 0; i < 5 && i < l.Count; i++) r[i] = l[i] is double d ? (int)Math.Round(d) : 0;
            return r;
        }
        public static float[] R4(object o, string k)
        {
            var r = new float[4]; var l = V(o, k) as List<object>;
            if (l != null) for (int i = 0; i < 4 && i < l.Count; i++) r[i] = l[i] is double d ? (float)d : 0;
            return r;
        }
        /// Zeitstempel (ISO) in Millisekunden seit 1970
        public static double Ms(object o, string k)
        {
            string s = S(o, k);
            if (string.IsNullOrEmpty(s)) return 0;
            if (DateTimeOffset.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var t)) return t.ToUnixTimeMilliseconds();
            return 0;
        }

        /// Server-Texte enthalten Emojis, die die Spielschrift nicht kennt – die werden entfernt
        public static string Clean(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            var sb = new StringBuilder(s.Length);
            for (int i = 0; i < s.Length; i++)
            {
                char ch = s[i];
                if (char.IsSurrogate(ch)) continue;
                if (ch == '️' || ch == '‍') continue;
                if (ch >= '☀' && ch <= '➿') continue;
                if (ch >= '⬀' && ch <= '⯿') continue;
                sb.Append(ch);
            }
            return sb.ToString().Trim();
        }
    }
}
