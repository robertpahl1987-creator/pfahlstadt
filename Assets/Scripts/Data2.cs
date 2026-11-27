using System;
using System.Collections.Generic;
using UnityEngine;

namespace Pfahlstadt
{
    // ===================== Krieger =====================
    public class UnitDef
    {
        public string Name, Short, Info;
        public int Att, Def, Carry;
        public float[] Cost;
        public float Time;
        public BType Building;
    }

    public static class Units
    {
        public const int N = 5;
        public static readonly UnitDef[] All =
        {
            new UnitDef { Name = "Harpunier", Short = "Harp", Att = 10, Def = 5, Carry = 30, Cost = new float[] { 25, 15, 0, 4 }, Time = 6, Building = BType.Harpunierhof, Info = "Fernkampf. Stark gegen Enterer, schwach gegen Schildwachen." },
            new UnitDef { Name = "Schildwache", Short = "Schild", Att = 3, Def = 12, Carry = 15, Cost = new float[] { 20, 10, 0, 6 }, Time = 5, Building = BType.Wachstube, Info = "Verteidiger. Stark gegen Harpuniere, schwach gegen Schleuderer." },
            new UnitDef { Name = "Enterer", Short = "Enter", Att = 14, Def = 6, Carry = 25, Cost = new float[] { 32, 20, 0, 8 }, Time = 8, Building = BType.Enterhalle, Info = "Nahkampf. Stark gegen Schleuderer und Wattläufer, schwach gegen Harpuniere." },
            new UnitDef { Name = "Schleuderer", Short = "Schleu", Att = 9, Def = 3, Carry = 15, Cost = new float[] { 36, 10, 0, 12 }, Time = 9, Building = BType.Schleuderplatz, Info = "Belagerung: halbiert Mauern und Türme, stark gegen Schildwachen. Schwach gegen Enterer, langsam." },
            new UnitDef { Name = "Wattläufer", Short = "Watt", Att = 6, Def = 5, Carry = 60, Cost = new float[] { 20, 20, 10, 0 }, Time = 5, Building = BType.Wattlaeuferhuette, Info = "Schnell (40 % kürzere Wege) und trägt doppelt Beute. Schwach gegen Enterer." },
        };
        static readonly int[][] Strong = { new[] { 2 }, new[] { 0 }, new[] { 3, 4 }, new[] { 1 }, new int[0] };
        static readonly int[][] Weak = { new[] { 1 }, new[] { 3 }, new[] { 0 }, new[] { 2 }, new[] { 2 } };
        // Ebbe (−1), Wechsel (0), Flut (+1)
        static readonly float[][] TideMul = { new[] { 1f, 1f, 0.85f, 1f, 1.35f }, new[] { 1f, 1f, 1f, 1f, 1f }, new[] { 1.1f, 1f, 1.3f, 1f, 0.75f } };
        public static readonly string[] TideName = { "Ebbe", "Wechsel", "Flut" };

        public static int[] Zero() => new int[N];
        public static int Sum(int[] u) { int s = 0; if (u == null) return 0; for (int i = 0; i < u.Length; i++) s += u[i]; return s; }
        public static int[] Copy(int[] u) { var r = new int[N]; if (u != null) for (int i = 0; i < N && i < u.Length; i++) r[i] = u[i]; return r; }
        public static int[] Scale(int[] u, float f) { var r = new int[N]; for (int i = 0; i < N; i++) r[i] = Mathf.FloorToInt(u[i] * f + 0.5f); return r; }
        public static int[] Sub(int[] a, int[] b) { var r = new int[N]; for (int i = 0; i < N; i++) r[i] = a[i] - (b != null ? b[i] : 0); return r; }
        public static int[] Add(int[] a, int[] b) { var r = new int[N]; for (int i = 0; i < N; i++) r[i] = a[i] + (b != null ? b[i] : 0); return r; }
        public static int[] Max0(int[] a) { var r = new int[N]; for (int i = 0; i < N; i++) r[i] = Mathf.Max(0, a[i]); return r; }

        /// Kampfkraft eines Heeres (att = Angriff, sonst Verteidigung) gegen ein anderes Heer (oder null)
        public static float Str(int[] u, int[] other, bool att, int tide)
        {
            var tm = TideMul[Mathf.Clamp(tide, -1, 1) + 1];
            float tot = Mathf.Max(1, Sum(other));
            float s = 0f;
            for (int i = 0; i < N; i++)
            {
                float strong = 0f, weak = 0f;
                if (other != null)
                {
                    foreach (int j in Strong[i]) strong += other[j];
                    foreach (int j in Weak[i]) weak += other[j];
                    strong /= tot; weak /= tot;
                }
                s += u[i] * (att ? All[i].Att : All[i].Def) * tm[i] * (1f + 0.5f * strong - 0.4f * weak);
            }
            return s;
        }
        /// Schleuderer bremsen, reine Wattläufer-Trupps sind schnell
        public static float SpeedFactor(int[] u) => u[3] > 0 ? 1.25f : (Sum(u) > 0 && u[4] == Sum(u) ? 0.6f : 1f);
        public static float CarryOf(int[] u) { float c = 0; for (int i = 0; i < N; i++) c += u[i] * All[i].Carry; return c; }
        public static string Text(int[] u)
        {
            if (Sum(u) <= 0) return "keine";
            var parts = new List<string>();
            for (int i = 0; i < N; i++) if (u[i] != 0) parts.Add($"{All[i].Short} {u[i]}");
            return string.Join(" · ", parts);
        }
        public static float[] CostOf(int u, int n) { var c = new float[4]; for (int i = 0; i < 4; i++) c[i] = All[u].Cost[i] * n; return c; }
        public static int TideState(float tideSin) => tideSin > 0.35f ? 1 : tideSin < -0.35f ? -1 : 0;

        // Aufstellung: f[i] = Reihe der Einheit i (0 vorne, 1 Mitte, 2 hinten)
        public static readonly string[] Rows = { "Vorne", "Mitte", "Hinten" };
        public static float FormMul(int[] f)
        {
            if (f == null || f.Length < N) return 0.98f;
            return 1f + (f[1] == 0 ? 0.06f : 0f) + (f[0] == 2 ? 0.04f : 0f) + (f[3] == 2 ? 0.04f : 0f) + (f[2] == 1 ? 0.03f : 0f)
                - (f[0] == 0 ? 0.04f : 0f) - (f[3] == 0 ? 0.04f : 0f);
        }
        public static readonly string[] FormNames = { "Igel", "Mauer", "Sturm" };
        public static readonly int[][] FormPresets = { new[] { 2, 0, 1, 2, 1 }, new[] { 1, 0, 0, 2, 0 }, new[] { 0, 0, 0, 0, 0 } };
    }

    // ===================== Gegenstände =====================
    public static class Items
    {
        // Beschleuniger: 1 Min, 5 Min, 15 Min, 1 Std, 3 Std
        public static readonly string[] Keys = { "sp1", "sp5", "sp15", "sp60", "sp180" };
        public static readonly string[] Names = { "1 Min.", "5 Min.", "15 Min.", "1 Std.", "3 Std." };
        public static readonly float[] Sec = { 60, 300, 900, 3600, 10800 };
        public static int Index(string key) => Array.IndexOf(Keys, key);
    }

    // ===================== Fortschritt =====================
    public class TechDef { public string Id, Name, Text; public float[] Cost; }
    public class CaptainDef { public string Id, Name, Text; public int Cost; }
    public class GearDef { public string Id, Name, Text; }

    public static class Prog
    {
        public static readonly int[] VipPts = { 0, 100, 300, 700, 1500, 3000, 5000, 8000, 12000, 17000, 25000 };
        public static readonly string[] VipPerks =
        {
            "",
            "Tägliche VIP-Truhe · +2 % Produktion",
            "+5 % schneller bauen",
            "+1 Bautrupp (3 gleichzeitig)",
            "+10 % Sammler-Traglast · +5 % Produktion · eigenes Profilbild",
            "+1 Platz in der Bauwarteschlange · +10 % schneller ausbilden · +10 % schneller bauen",
            "+5 % Angriff und Verteidigung",
            "+1 Bautrupp (4 gleichzeitig) · +8 % Produktion",
            "Lazarett rettet +10 % mehr · +15 % schneller bauen",
            "+10 % schnellere Fahrten · +20 % schneller ausbilden",
            "+12 % Produktion · +10 % Angriff und Verteidigung · goldener VIP-Rahmen",
        };
        public static readonly TechDef[] Tech =
        {
            new TechDef { Id = "pile", Name = "Bessere Pfähle", Text = "+0,3 m Deckhöhe", Cost = new float[] { 300, 60, 0, 60 } },
            new TechDef { Id = "gath", Name = "Flinke Sammler", Text = "+10 % Traglast der Sammler", Cost = new float[] { 200, 120, 60, 20 } },
            new TechDef { Id = "atk", Name = "Schärfere Harpunen", Text = "+5 % Angriff", Cost = new float[] { 250, 80, 0, 100 } },
            new TechDef { Id = "def", Name = "Eichenschilde", Text = "+5 % Verteidigung", Cost = new float[] { 300, 60, 0, 80 } },
            new TechDef { Id = "prod", Name = "Wattküche", Text = "+5 % Produktion", Cost = new float[] { 200, 200, 100, 0 } },
            new TechDef { Id = "build", Name = "Zimmermannskunst", Text = "−6 % Bauzeit", Cost = new float[] { 400, 50, 0, 60 } },
            new TechDef { Id = "drill", Name = "Drill", Text = "−8 % Ausbildungszeit", Cost = new float[] { 150, 150, 50, 60 } },
            new TechDef { Id = "med", Name = "Wundkräuter", Text = "+5 % gerettete Verwundete", Cost = new float[] { 100, 200, 200, 0 } },
            new TechDef { Id = "store", Name = "Speicherkunst", Text = "+10 % Lagerplatz", Cost = new float[] { 350, 100, 100, 20 } },
            new TechDef { Id = "navi", Name = "Navigation", Text = "−6 % Fahrzeit", Cost = new float[] { 250, 100, 50, 80 } },
        };
        public const int TechMax = 5;
        public static int TechIdx(string id) { for (int i = 0; i < Tech.Length; i++) if (Tech[i].Id == id) return i; return -1; }

        public static readonly CaptainDef[] Captains =
        {
            new CaptainDef { Id = "hanne", Name = "Hanne Gezeitenkund", Text = "+20 % Kampfkraft bei Ebbe", Cost = 5 },
            new CaptainDef { Id = "okko", Name = "Okko Sturmkapitän", Text = "+20 % Kampfkraft bei Flut", Cost = 5 },
            new CaptainDef { Id = "gesa", Name = "Gesa Eisenfaust", Text = "+12 % Kampfkraft immer", Cost = 10 },
            new CaptainDef { Id = "fiete", Name = "Fiete Plünderer", Text = "+30 % Beute", Cost = 10 },
            new CaptainDef { Id = "wiebke", Name = "Wiebke Lotsin", Text = "−25 % Fahrzeit", Cost = 15 },
        };
        public static readonly GearDef[] Gear =
        {
            new GearDef { Id = "hut", Name = "Kapitänshut", Text = "+1,5 % Kampfkraft je Stufe" },
            new GearDef { Id = "saebel", Name = "Entersäbel", Text = "+1,5 % Kampfkraft je Stufe" },
            new GearDef { Id = "mantel", Name = "Ölzeugmantel", Text = "+2 % Beute je Stufe" },
            new GearDef { Id = "kompass", Name = "Messingkompass", Text = "−1 % Fahrzeit je Stufe" },
        };
        public const int GearMax = 10;
        public static readonly float[] BoatCost = { 220, 0, 0, 70 };
        public const float BoatTime = 60f;
        public const int BoatCap = 25;
    }

    /// Alle Boni an einer Stelle (VIP, Forschung, Wahrzeichen, Allianz)
    public class Mods
    {
        public float Prod = 1, Build = 1, Train = 1, Gather = 1, Atk = 1, Def = 1, Save, Travel = 1, Store = 1, Deck, Dam;
        public int Builds = 2, Queue = 3;
    }

    // ===================== Spielstand-Teile =====================
    [Serializable] public class TrainJob { public int u; public int n; public float per; public float left; }
    [Serializable] public class ReportEntry { public string text; public int win; public int day; public float time; public bool hasRp; public Replay rp = new Replay(); }
    [Serializable]
    public class Replay
    {
        public string an = "", dn = "";
        public int[] au = new int[5], al = new int[5], du = new int[5], dl = new int[5], df = new int[5];
        public int def, tide;
        public bool win, arena, raid;
    }
    [Serializable] public class Terr { public int id; public string name = "", kind = ""; public int ring; public float x, y; public int res, pct, owner, seed; public float bas, pirates; public int[] gu = new int[5]; }
    [Serializable] public class March { public int target; public int[] u = new int[5]; public float left, total; public string phase = "out", kind = "attack"; public int cap = -1; }
    [Serializable] public class Quest { public string id = ""; public int n, have; public bool done; }
    [Serializable] public class Offer { public int give, gn, get, rn, unit = -1; public bool used; }
    [Serializable] public class Bot { public int id, level; public string name = ""; public float dx, dy; public int[] u = new int[5]; }
    [Serializable] public class BotMarch { public Bot bot = new Bot(); public int[] u = new int[5]; public float left, total, loot = 1; public string phase = "out"; public int cap = -1; }
    [Serializable] public class Spot { public int id, kind; public float x, z, rot; }
    [Serializable] public class QueueItem { public int plot, type = -1; }
    [Serializable] public class ResNode { public int id, type; public float x, z, h, amount, max; }
    [Serializable] public class Gatherer { public int node, res = -1; public string phase = "out"; public float d, t, load; public bool stop; }

    /// Zweiter Teil des Spielstands (wird zusammen mit SaveData gespeichert)
    [Serializable]
    public class SaveData2
    {
        public int[] troops = new int[5], wounded = new int[5], formation = new int[5];
        public List<TrainJob> train = new List<TrainJob>();
        public List<ReportEntry> reports = new List<ReportEntry>();
        public float raidTimer = 480f, counterTimer = 420f, healT;
        public List<Terr> terr = new List<Terr>();
        public List<March> marches = new List<March>();
        // Gegenstände und Fortschritt
        public int[] items = new int[5];
        public int medals, ore, vipPts;
        public string vipDay = "";
        public int[] tech = new int[10];
        public int researchIdx = -1; public float researchLeft, researchTotal;
        public int[] capLvl = new int[5];
        public long[] capBusy = new long[5];
        public int[] gear = new int[20];
        public int boats; public float boatLeft, boatTotal;
        // Belohnungen
        public string dailyLast = ""; public int dailyStreak;
        public string questDay = ""; public List<Quest> quests = new List<Quest>();
        public List<string> ach = new List<string>();
        public string passMonth = ""; public float passXp; public List<int> passGot = new List<int>();
        public int[] stats = new int[10];
        public int tut;
        // Händler, Warteschlange
        public float traderNext = 90f, traderLeft; public List<Offer> offers = new List<Offer>();
        public List<QueueItem> bq = new List<QueueItem>();
        public float summerT = 200f;
        // Piratenschiffe
        public int botLevel = 1, botSeed = 7, stamN = 10; public long stamT;
        public List<Bot> bots = new List<Bot>();
        public List<BotMarch> botMarches = new List<BotMarch>();
        // Watt: Schätze, Hindernisse, Sammelstellen
        public List<Spot> treasures = new List<Spot>(); public float treasureT = 8f; public int treasureSeq;
        public List<Spot> obst = new List<Spot>(); public float obstT = 45f; public int obstSeq, obstCleared;
        public int clearId = -1; public float clearLeft, clearTotal;
        public List<ResNode> nodes = new List<ResNode>(); public List<Gatherer> gath = new List<Gatherer>();
        public float nodeTimer = 2f; public int nodeSeq = 1;
        public string playerName = "";
    }

    // Zähler für Aufgaben, Erfolge und Pass
    public enum Stat { Build = 0, Gather = 1, Train = 2, Win = 3, Exp = 4, Trade = 5, Heal = 6, Bot = 7, Treasure = 8, Daily = 9 }
}
